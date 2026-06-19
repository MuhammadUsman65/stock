"""
Market data service - thin wrapper around yfinance.

Why caching matters here specifically: yfinance is an unofficial scraper
around Yahoo Finance endpoints (no public API key, no SLA). It can rate-limit
or intermittently fail. A short TTL cache means a burst of requests for the
same ticker (e.g. multiple dashboard widgets loading at once) hits Yahoo once,
not five times - and gives you a fallback if the most recent call failed but
a slightly-stale cached copy exists.
"""
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from cachetools import TTLCache

from app.core.exceptions import TickerNotFoundError, UpstreamDataError

# 60s TTL: long enough to dedupe a page-load's worth of requests,
# short enough that "live" data still feels live.
_cache: TTLCache = TTLCache(maxsize=256, ttl=60)


def _cache_key(ticker: str, period: str, interval: str) -> str:
    return f"{ticker.upper()}:{period}:{interval}"


def get_ohlcv(ticker: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    """
    Fetch OHLCV history for a ticker.

    period: yfinance period string, e.g. '1mo', '6mo', '1y', '5y', 'max'
    interval: '1d', '1h', '5m', etc. (intraday intervals only work for short periods)
    """
    key = _cache_key(ticker, period, interval)
    if key in _cache:
        return _cache[key]

    try:
        df = yf.Ticker(ticker.upper()).history(period=period, interval=interval)
    except Exception as exc:  # yfinance raises a mix of exception types depending on failure mode
        raise UpstreamDataError(f"Failed to fetch data for {ticker}: {exc}") from exc

    if df is None or df.empty:
        raise TickerNotFoundError(ticker)

    df = df.reset_index()
    # yfinance names the date column differently depending on interval - normalize it.
    date_col = "Date" if "Date" in df.columns else "Datetime"
    df = df.rename(columns={date_col: "timestamp"})
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize(None)

    _cache[key] = df
    return df


def get_quote(ticker: str) -> dict:
    """Lightweight current-price snapshot, used for portfolio P&L and watchlists."""
    key = f"quote:{ticker.upper()}"
    if key in _cache:
        return _cache[key]

    try:
        info = yf.Ticker(ticker.upper()).fast_info
        quote = {
            "ticker": ticker.upper(),
            "price": float(info.get("lastPrice")) if info.get("lastPrice") else None,
            "previous_close": float(info.get("previousClose")) if info.get("previousClose") else None,
            "day_high": float(info.get("dayHigh")) if info.get("dayHigh") else None,
            "day_low": float(info.get("dayLow")) if info.get("dayLow") else None,
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        raise UpstreamDataError(f"Failed to fetch quote for {ticker}: {exc}") from exc

    if quote["price"] is None:
        raise TickerNotFoundError(ticker)

    _cache[key] = quote
    return quote
