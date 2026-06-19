from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.models.schemas import IndicatorsResponse, TickerQuery
from app.services import indicators_service, market_data

router = APIRouter()

VALID_INDICATORS = {"sma", "ema", "rsi", "macd", "bollinger"}


@router.get("/{ticker}", response_model=IndicatorsResponse)
@limiter.limit("30/minute")
async def get_indicators(
    request: Request,
    ticker: str,
    period: str = Query("6mo", pattern="^(1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query("1d", pattern="^(1d|1h|5m|15m)$"),
    include: str = Query(
        "sma,ema,rsi,macd,bollinger",
        description="Comma-separated subset of: sma, ema, rsi, macd, bollinger",
    ),
    sma_window: int = Query(20, ge=2, le=200),
    ema_window: int = Query(20, ge=2, le=200),
    rsi_window: int = Query(14, ge=2, le=100),
    macd_fast: int = Query(12, ge=2, le=100),
    macd_slow: int = Query(26, ge=2, le=200),
    macd_signal: int = Query(9, ge=2, le=100),
    bollinger_window: int = Query(20, ge=2, le=200),
    bollinger_std: float = Query(2.0, ge=0.5, le=5.0),
):
    validated = TickerQuery(ticker=ticker)

    requested = {i.strip().lower() for i in include.split(",") if i.strip()}
    unknown = requested - VALID_INDICATORS
    if unknown:
        from app.core.exceptions import AppError
        raise AppError(f"Unknown indicator(s): {', '.join(sorted(unknown))}", status_code=400)

    df = market_data.get_ohlcv(validated.ticker, period=period, interval=interval)

    computed = indicators_service.compute_indicators(
        df,
        requested,
        sma_window=sma_window,
        ema_window=ema_window,
        rsi_window=rsi_window,
        macd_fast=macd_fast,
        macd_slow=macd_slow,
        macd_signal=macd_signal,
        bollinger_window=bollinger_window,
        bollinger_std=bollinger_std,
    )

    return IndicatorsResponse(
        ticker=validated.ticker,
        period=period,
        interval=interval,
        timestamps=df["timestamp"].tolist(),
        **computed,
    )