"""
Technical indicator calculations.

Every function here takes a plain pandas Series/DataFrame and returns
plain pandas output - no FastAPI, no Pydantic, no knowledge of HTTP.
That matters because Phase 4 (LSTM) will want these same indicators as
model input features, not just as chart overlays - so this file stays
reusable rather than being tangled into the route layer.
"""
import pandas as pd


def sma(close: pd.Series, window: int = 20) -> pd.Series:
    """Simple Moving Average."""
    return close.rolling(window=window).mean()


def ema(close: pd.Series, window: int = 20) -> pd.Series:
    """Exponential Moving Average."""
    return close.ewm(span=window, adjust=False).mean()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    """
    Relative Strength Index (Wilder's smoothing), 0-100.
    Conventionally >70 is called "overbought" and <30 "oversold" - those
    thresholds are trading folklore, not a guarantee of anything, so treat
    them as one input among many rather than a signal on their own.
    """
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()

    rs = avg_gain / avg_loss
    result = 100 - (100 / (1 + rs))
    # If there were zero losses in the window, RSI is defined as 100, not NaN/inf.
    result = result.where(avg_loss != 0, 100)
    return result


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict[str, pd.Series]:
    """Moving Average Convergence Divergence. Returns the three standard lines."""
    ema_fast = ema(close, fast)
    ema_slow = ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return {"macd_line": macd_line, "signal_line": signal_line, "histogram": histogram}


def bollinger_bands(close: pd.Series, window: int = 20, num_std: float = 2.0) -> dict[str, pd.Series]:
    """Returns upper/middle/lower bands. Middle band is just the SMA."""
    middle = sma(close, window)
    std = close.rolling(window=window).std()
    upper = middle + num_std * std
    lower = middle - num_std * std
    return {"upper": upper, "middle": middle, "lower": lower}


def _to_list(series: pd.Series) -> list[float | None]:
    """JSON has no NaN - convert to None so charting libraries skip the point instead of erroring."""
    return [float(v) if pd.notna(v) else None for v in series]


def compute_indicators(df: pd.DataFrame, requested: set[str], **params) -> dict:
    """
    df must have a 'Close' (or 'close') column - matches whatever
    market_data.get_ohlcv() returns.

    requested: any subset of {"sma", "ema", "rsi", "macd", "bollinger"}.

    Returns a flat dict whose keys match IndicatorsResponse's fields
    exactly, so the route can do `IndicatorsResponse(..., **result)`.
    """
    close_col = "close" if "close" in df.columns else "Close"
    close = df[close_col]
    out: dict = {}

    if "sma" in requested:
        out["sma"] = _to_list(sma(close, params.get("sma_window", 20)))

    if "ema" in requested:
        out["ema"] = _to_list(ema(close, params.get("ema_window", 20)))

    if "rsi" in requested:
        out["rsi"] = _to_list(rsi(close, params.get("rsi_window", 14)))

    if "macd" in requested:
        m = macd(
            close,
            fast=params.get("macd_fast", 12),
            slow=params.get("macd_slow", 26),
            signal=params.get("macd_signal", 9),
        )
        out["macd_line"] = _to_list(m["macd_line"])
        out["macd_signal"] = _to_list(m["signal_line"])
        out["macd_histogram"] = _to_list(m["histogram"])

    if "bollinger" in requested:
        b = bollinger_bands(
            close,
            window=params.get("bollinger_window", 20),
            num_std=params.get("bollinger_std", 2.0),
        )
        out["bollinger_upper"] = _to_list(b["upper"])
        out["bollinger_middle"] = _to_list(b["middle"])
        out["bollinger_lower"] = _to_list(b["lower"])

    return out