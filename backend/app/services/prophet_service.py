import warnings

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from app.core.exceptions import AppError
from app.services import market_data

MIN_ROWS = 60


def generate_forecast(
    ticker: str,
    horizon: int = 30,
    interval_width: float = 0.8,
    period: str = "2y",
) -> dict:
    ticker = ticker.upper()
    df = market_data.get_ohlcv(ticker, period=period, interval="1d")

    if len(df) < MIN_ROWS:
        raise AppError(
            f"Not enough history to forecast (need {MIN_ROWS} rows, got {len(df)}).",
            status_code=400,
        )

    close = df["Close"].values.astype(float)
    timestamps = pd.to_datetime(df["timestamp"])

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ExponentialSmoothing(
            close,
            trend="add",
            seasonal="add",
            seasonal_periods=5,
            initialization_method="estimated",
        ).fit(optimized=True)

    fitted = np.asarray(model.fittedvalues)
    residuals = close - fitted
    resid_std = float(np.std(residuals))
    z = float(scipy_stats.norm.ppf(0.5 + interval_width / 2))

    # --- Historical fit (in-sample) ---
    historical = []
    for i, ts in enumerate(timestamps):
        pred = float(fitted[i])
        half_width = z * resid_std
        historical.append({
            "date": ts,
            "predicted_price": round(pred, 2),
            "lower_bound": round(pred - half_width, 2),
            "upper_bound": round(pred + half_width, 2),
        })

    # --- Future forecast ---
    forecast_values = np.asarray(model.forecast(steps=horizon))
    last_date = timestamps.iloc[-1]

    future = []
    for step in range(1, horizon + 1):
        pred = float(forecast_values[step - 1])
        half_width = z * resid_std * np.sqrt(step)
        future.append({
            "date": last_date + pd.Timedelta(days=step),
            "predicted_price": round(pred, 2),
            "lower_bound": round(pred - half_width, 2),
            "upper_bound": round(pred + half_width, 2),
        })

    return {
        "ticker": ticker,
        "horizon": horizon,
        "historical_fit": historical,
        "forecast": future,
    }