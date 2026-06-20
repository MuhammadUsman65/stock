import json
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow import keras

from app.core.config import get_settings
from app.core.exceptions import AppError, ModelNotTrainedError
from app.ml.features import FEATURE_COLUMNS, build_feature_dataframe
from app.ml.lstm_model import build_lstm_model, create_sequences, train_test_split_chronological
from app.services import market_data

settings = get_settings()
WINDOW_SIZE = 60

_training_status: dict[str, dict] = {}


def _artifact_paths(ticker: str) -> dict[str, Path]:
    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    ticker = ticker.upper()
    return {
        "model": model_dir / f"{ticker}_lstm.keras",
        "scaler": model_dir / f"{ticker}_scaler.joblib",
        "meta": model_dir / f"{ticker}_meta.json",
    }


def get_training_status(ticker: str) -> dict:
    return _training_status.get(ticker.upper(), {"status": "idle", "progress": 0, "message": None})


class _ProgressCallback(keras.callbacks.Callback):
    def __init__(self, ticker: str, total_epochs: int):
        super().__init__()
        self.ticker = ticker
        self.total_epochs = total_epochs

    def on_epoch_end(self, epoch, logs=None):
        # Reserve 0-10% for setup and 90-100% for evaluation/saving;
        # training fills the 10-90% range.
        logs = logs or {}
        pct = 10 + int(((epoch + 1) / self.total_epochs) * 80)
        _training_status[self.ticker] = {
            "status": "training",
            "progress": pct,
            "message": f"Epoch {epoch + 1}/{self.total_epochs} - loss {logs.get('loss', 0):.5f}",
        }


def train_and_save_model(ticker: str, epochs: int = 100, period: str = "2y") -> dict:
    ticker = ticker.upper()
    _training_status[ticker] = {"status": "training", "progress": 0, "message": "Fetching data"}

    try:
        df = market_data.get_ohlcv(ticker, period=period, interval="1d")
        features_df = build_feature_dataframe(df)

        min_required = WINDOW_SIZE + 30
        if len(features_df) < min_required:
            raise AppError(
                f"Not enough history to train: need at least {min_required} trading days "
                f"after indicator warm-up, got {len(features_df)}.",
                status_code=400,
            )

        feature_matrix = features_df[FEATURE_COLUMNS].values
        target = features_df["close_return"].values

        scaler = MinMaxScaler()
        scaled_features = scaler.fit_transform(feature_matrix)

        X, y = create_sequences(scaled_features, target, WINDOW_SIZE)
        X_train, X_test, y_train, y_test = train_test_split_chronological(X, y, test_fraction=0.15)

        _training_status[ticker] = {"status": "training", "progress": 10, "message": "Training model"}
        model = build_lstm_model(window_size=WINDOW_SIZE, num_features=len(FEATURE_COLUMNS))

        early_stopping = keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=8,
            restore_best_weights=True,
        )

        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=epochs,
            batch_size=32,
            verbose=0,
            callbacks=[_ProgressCallback(ticker, epochs), early_stopping],
        )
        epochs_actually_run = len(history.history["loss"])

        _training_status[ticker] = {"status": "training", "progress": 90, "message": "Evaluating"}
        val_predictions = model.predict(X_test, verbose=0).flatten()
        residual_std = float(np.std(y_test - val_predictions))

        paths = _artifact_paths(ticker)
        model.save(paths["model"])
        joblib.dump(scaler, paths["scaler"])
        meta = {
            "feature_columns": FEATURE_COLUMNS,
            "window_size": WINDOW_SIZE,
            "residual_std": residual_std,
            "trained_at": datetime.utcnow().isoformat(),
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "max_epochs": epochs,
            "epochs_actually_run": epochs_actually_run,
        }
        paths["meta"].write_text(json.dumps(meta, indent=2))

        _training_status[ticker] = {"status": "done", "progress": 100, "message": "Training complete"}
        return meta

    except AppError as exc:
        _training_status[ticker] = {"status": "error", "progress": 0, "message": exc.message}
        raise
    except Exception as exc:
        _training_status[ticker] = {"status": "error", "progress": 0, "message": str(exc)}
        raise


def load_model_and_meta(ticker: str):
    ticker = ticker.upper()
    paths = _artifact_paths(ticker)
    if not paths["model"].exists():
        raise ModelNotTrainedError(ticker)

    model = keras.models.load_model(paths["model"])
    scaler = joblib.load(paths["scaler"])
    meta = json.loads(paths["meta"].read_text())
    return model, scaler, meta


def predict(ticker: str, horizon: int = 7, confidence_z: float = 1.28) -> list[dict]:
    ticker = ticker.upper()
    model, scaler, meta = load_model_and_meta(ticker)
    window_size = meta["window_size"]
    feature_columns = meta["feature_columns"]
    residual_std = meta["residual_std"]

    df = market_data.get_ohlcv(ticker, period="1y", interval="1d")
    features_df = build_feature_dataframe(df)

    if len(features_df) < window_size:
        raise AppError(
            f"Not enough recent history to generate a prediction (need {window_size} rows).",
            status_code=400,
        )

    feature_matrix = features_df[feature_columns].values
    scaled = scaler.transform(feature_matrix)

    window = scaled[-window_size:].copy()
    last_close = float(features_df["Close"].iloc[-1])
    last_date = features_df["timestamp"].iloc[-1]
    return_col_idx = feature_columns.index("close_return")

    results = []
    for step in range(1, horizon + 1):
        pred = model.predict(window.reshape(1, window_size, len(feature_columns)), verbose=0)
        predicted_return = float(pred[0, 0])
        predicted_close = last_close * (1 + predicted_return)

        # Uncertainty compounds with each recursive step - a standard
        # heuristic, not a tight statistical guarantee.
        step_std = residual_std * np.sqrt(step)
        lower_close = last_close * (1 + predicted_return - confidence_z * step_std)
        upper_close = last_close * (1 + predicted_return + confidence_z * step_std)

        results.append({
            "date": last_date + timedelta(days=step),
            "predicted_price": round(predicted_close, 2),
            "lower_bound": round(lower_close, 2),
            "upper_bound": round(upper_close, 2),
        })

        next_row = window[-1].copy()
        next_row[return_col_idx] = predicted_return
        window = np.vstack([window[1:], next_row])
        last_close = predicted_close

    return results