from fastapi import APIRouter, BackgroundTasks, Query, Request

from app.core.limiter import limiter
from app.models.schemas import (
    LSTMPredictionResponse,
    ProphetForecastResponse,
    RetrainStatusResponse,
)
from app.models.schemas import TickerQuery
from app.services import lstm_service, prophet_service

router = APIRouter()


@router.get("/lstm/{ticker}", response_model=LSTMPredictionResponse)
@limiter.limit("20/minute")
async def get_lstm_prediction(
    request: Request,
    ticker: str,
    horizon: int = Query(7, ge=1, le=30),
):
    validated = TickerQuery(ticker=ticker)
    predictions = lstm_service.predict(validated.ticker, horizon=horizon)
    return LSTMPredictionResponse(ticker=validated.ticker, horizon=horizon, predictions=predictions)


@router.get("/prophet/{ticker}", response_model=ProphetForecastResponse)
@limiter.limit("10/minute")
async def get_prophet_forecast(
    request: Request,
    ticker: str,
    horizon: int = Query(30, ge=1, le=180),
    interval_width: float = Query(0.8, ge=0.5, le=0.99),
):
    validated = TickerQuery(ticker=ticker)
    result = prophet_service.generate_forecast(
        validated.ticker, horizon=horizon, interval_width=interval_width
    )
    return ProphetForecastResponse(**result)


@router.post("/retrain/{ticker}", status_code=202)
@limiter.limit("5/hour")
async def trigger_retrain(
    request: Request,
    ticker: str,
    background_tasks: BackgroundTasks,
    epochs: int = Query(100, ge=10, le=200, description="Maximum epochs - early stopping usually halts training sooner"),
):
    """
    Returns immediately with 202 Accepted; training runs in the
    background. Poll GET /retrain/{ticker}/status for progress.
    """
    validated = TickerQuery(ticker=ticker)
    background_tasks.add_task(lstm_service.train_and_save_model, validated.ticker, epochs)
    return {"message": f"Training started for {validated.ticker}.", "ticker": validated.ticker}


@router.get("/retrain/{ticker}/status", response_model=RetrainStatusResponse)
@limiter.limit("60/minute")
async def get_retrain_status(request: Request, ticker: str):
    validated = TickerQuery(ticker=ticker)
    status = lstm_service.get_training_status(validated.ticker)
    return RetrainStatusResponse(ticker=validated.ticker, **status)