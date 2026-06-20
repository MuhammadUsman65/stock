from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.models.schemas import TickerQuery, TickerSentimentResponse
from app.services import news_service, sentiment_service

router = APIRouter()


@router.get("/{ticker}", response_model=TickerSentimentResponse)
@limiter.limit("20/minute")
async def get_sentiment(request: Request, ticker: str):
    validated = TickerQuery(ticker=ticker)

    articles = news_service.fetch_news(validated.ticker)
    if not articles:
        return TickerSentimentResponse(
            ticker=validated.ticker,
            overall=sentiment_service.aggregate_sentiment([]),
            articles=[],
        )

    titles = [a["title"] for a in articles]
    sentiments = await sentiment_service.analyze_sentiment(titles)

    enriched = []
    for article, sentiment in zip(articles, sentiments):
        enriched.append({**article, **sentiment})

    overall = sentiment_service.aggregate_sentiment(sentiments)

    return TickerSentimentResponse(
        ticker=validated.ticker,
        overall=overall,
        articles=enriched,
    )


@router.get("/{ticker}/news")
@limiter.limit("30/minute")
async def get_news(request: Request, ticker: str):
    validated = TickerQuery(ticker=ticker)
    articles = news_service.fetch_news(validated.ticker)
    return {"ticker": validated.ticker, "articles": articles}