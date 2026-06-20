import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.exceptions import (
    AppError,
    app_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.core.limiter import limiter
from app.api import market, indicators, sentiment, portfolio, watchlist, predictions


logging.basicConfig(level=logging.INFO)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts.
    await connect_to_mongo()
    yield
    # Runs once when the server shuts down.
    await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    description="LSTM + Prophet stock forecasting API with technical indicators and news sentiment.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS: only the deployed Next.js frontend may call this API ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# --- Rate limiting ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Centralized error handling (no stack traces to clients) ---
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(ValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# --- Routers ---
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["indicators"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["watchlist"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])


@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "environment": settings.environment}