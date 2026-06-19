from fastapi import APIRouter, Query, Request

from app.core.limiter import limiter
from app.models.schemas import OHLCVResponse, QuoteResponse, TickerQuery
from app.services import market_data

router = APIRouter()


@router.get("/ohlcv/{ticker}", response_model=OHLCVResponse)
@limiter.limit("30/minute")
async def get_ohlcv(
    request: Request,
    ticker: str,
    period: str = Query("6mo", pattern="^(1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query("1d", pattern="^(1d|1h|5m|15m)$"),
):
    validated = TickerQuery(ticker=ticker)
    df = market_data.get_ohlcv(validated.ticker, period=period, interval=interval)

    return OHLCVResponse(
        ticker=validated.ticker,
        period=period,
        interval=interval,
        data=[
            {
                "timestamp": row.timestamp,
                "open": row.Open,
                "high": row.High,
                "low": row.Low,
                "close": row.Close,
                "volume": int(row.Volume),
            }
            for row in df.itertuples()
        ],
    )


@router.get("/quote/{ticker}", response_model=QuoteResponse)
@limiter.limit("60/minute")
async def get_quote(request: Request, ticker: str):
    validated = TickerQuery(ticker=ticker)
    quote = market_data.get_quote(validated.ticker)
    return QuoteResponse(**quote)
