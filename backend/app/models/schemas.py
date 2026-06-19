from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class OHLCVPoint(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class OHLCVResponse(BaseModel):
    ticker: str
    period: str
    interval: str
    data: list[OHLCVPoint]


class QuoteResponse(BaseModel):
    ticker: str
    price: float | None
    previous_close: float | None
    day_high: float | None
    day_low: float | None
    fetched_at: str


class TickerQuery(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        v = v.strip().upper()
        if not v.replace(".", "").replace("-", "").isalnum():
            raise ValueError("Ticker contains invalid characters.")
        return v


class IndicatorsResponse(BaseModel):
    ticker: str
    period: str
    interval: str
    timestamps: list[datetime]
    sma: list[float | None] | None = None
    ema: list[float | None] | None = None
    rsi: list[float | None] | None = None
    macd_line: list[float | None] | None = None
    macd_signal: list[float | None] | None = None
    macd_histogram: list[float | None] | None = None
    bollinger_upper: list[float | None] | None = None
    bollinger_middle: list[float | None] | None = None
    bollinger_lower: list[float | None] | None = None


class PredictionPoint(BaseModel):
    date: datetime
    predicted_price: float
    lower_bound: float
    upper_bound: float


class LSTMPredictionResponse(BaseModel):
    ticker: str
    horizon: int
    predictions: list[PredictionPoint]
    disclaimer: str = (
        "Experimental/educational model. Confidence bands are a heuristic "
        "based on historical prediction error, not a statistical guarantee. "
        "Not financial advice."
    )


class ProphetForecastResponse(BaseModel):
    ticker: str
    horizon: int
    historical_fit: list[PredictionPoint]
    forecast: list[PredictionPoint]
    disclaimer: str = (
        "Experimental/educational model based on historical seasonality "
        "and trend. Not financial advice."
    )


class RetrainStatusResponse(BaseModel):
    ticker: str
    status: str
    progress: int
    message: str | None = None


class SentimentScores(BaseModel):
    positive: float
    negative: float
    neutral: float


class ArticleSentiment(BaseModel):
    title: str
    url: str
    source: str
    published_at: str | None
    label: str
    score: float
    scores: SentimentScores


class TickerSentimentResponse(BaseModel):
    ticker: str
    overall: dict
    articles: list[ArticleSentiment]