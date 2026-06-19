"""
Feature engineering for the LSTM model.

A model trained on raw closing price alone tends to learn "tomorrow looks
like today" - a lag predictor that produces a great-looking chart but
isn't actually forecasting anything. Feeding it engineered features
(returns, indicator values, volume changes) instead of - or alongside -
raw price gives it something more to actually learn from.

This reuses app/services/indicators_service.py rather than recomputing
indicator math here, so there's exactly one implementation of RSI/MACD/etc
in the whole codebase.
"""
import numpy as np
import pandas as pd

from app.services import indicators_service as ind

FEATURE_COLUMNS = [
    "close_return",     # day-over-day % change - this is what actually has signal, not raw price level
    "volume_change",
    "sma_20",
    "ema_20",
    "rsi_14",
    "macd_line",
    "macd_histogram",
    "bb_percent_b",      # where price sits within the Bollinger Bands, 0-1
]


def build_feature_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    df: OHLCV dataframe as returned by market_data.get_ohlcv() (columns
    timestamp, Open, High, Low, Close, Volume).

    Returns a new dataframe with `timestamp`, `Close` (kept for inverse-
    transforming predictions back to actual price later), and the
    FEATURE_COLUMNS above. Rows with NaN (the first ~26 rows, before
    indicators have enough history) are dropped.
    """
    out = pd.DataFrame()
    out["timestamp"] = df["timestamp"]
    out["Close"] = df["Close"]

    out["close_return"] = df["Close"].pct_change()
    out["volume_change"] = df["Volume"].pct_change().replace([np.inf, -np.inf], 0)

    out["sma_20"] = ind.sma(df["Close"], 20)
    out["ema_20"] = ind.ema(df["Close"], 20)
    out["rsi_14"] = ind.rsi(df["Close"], 14)

    macd = ind.macd(df["Close"])
    out["macd_line"] = macd["macd_line"]
    out["macd_histogram"] = macd["histogram"]

    bb = ind.bollinger_bands(df["Close"])
    band_width = bb["upper"] - bb["lower"]
    # %B: 0 = price at lower band, 1 = price at upper band, 0.5 = at the middle.
    # Guard against division by zero on a totally flat price stretch.
    out["bb_percent_b"] = ((df["Close"] - bb["lower"]) / band_width.replace(0, np.nan)).fillna(0.5)

    out = out.dropna().reset_index(drop=True)
    return out