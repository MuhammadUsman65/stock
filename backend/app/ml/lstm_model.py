"""
LSTM model architecture and sequence windowing.

Kept deliberately small (2 LSTM layers, modest unit counts) - this is
training on CPU on free-tier hardware, and a portfolio project's point
is to demonstrate the pipeline works end-to-end, not to chase marginal
accuracy gains from a huge model.
"""
import numpy as np
from tensorflow import keras
from tensorflow.keras import layers


def build_lstm_model(window_size: int, num_features: int) -> keras.Model:
    model = keras.Sequential([
        layers.Input(shape=(window_size, num_features)),
        layers.LSTM(50, return_sequences=True),
        layers.Dropout(0.2),
        layers.LSTM(25, return_sequences=False),
        layers.Dropout(0.2),
        layers.Dense(1),  # predicts next-step scaled closing price
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model


def create_sequences(features: np.ndarray, target: np.ndarray, window_size: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Turns a (n_rows, n_features) array into sliding windows: each input is
    `window_size` consecutive rows, and the matching target is the value
    immediately after that window.

    features and target must already be scaled and aligned (same length,
    same row order = chronological).
    """
    X, y = [], []
    for i in range(window_size, len(features)):
        X.append(features[i - window_size:i])
        y.append(target[i])
    return np.array(X), np.array(y)


def train_test_split_chronological(X: np.ndarray, y: np.ndarray, test_fraction: float = 0.15):
    """
    Time series data must NOT be shuffled before splitting - the model
    would effectively get to see the future during training. The split
    point is just the last `test_fraction` of rows in time order.
    """
    split_idx = int(len(X) * (1 - test_fraction))
    return X[:split_idx], X[split_idx:], y[:split_idx], y[split_idx:]