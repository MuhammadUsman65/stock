import pandas as pd

def sma(close: pd.Series, window: int = 20) -> pd.Series:
    """Simple Moving Average."""
    return close.rolling(window=window).mean()


def ema(close: pd.Series, window: int = 20) -> pd.Series:
    """Exponential Moving Average."""
    return close.ewm(span=window, adjust=False).mean()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:

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
    ema_fast = ema(close, fast)
    ema_slow = ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return {"macd_line": macd_line, "signal_line": signal_line, "histogram": histogram}


def bollinger_bands(close: pd.Series, window: int = 20, num_std: float = 2.0) -> dict[str, pd.Series]:
    middle = sma(close, window)
    std = close.rolling(window=window).std()
    upper = middle + num_std * std
    lower = middle - num_std * std
    return {"upper": upper, "middle": middle, "lower": lower}


def _to_list(series: pd.Series) -> list[float | None]:
    return [float(v) if pd.notna(v) else None for v in series]


def compute_indicators(df: pd.DataFrame, requested: set[str], **params) -> dict:
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