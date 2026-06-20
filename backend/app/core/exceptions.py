import logging
import uuid

from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger("stock_predictor")


class AppError(Exception):

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class TickerNotFoundError(AppError):
    def __init__(self, ticker: str):
        super().__init__(f"Ticker '{ticker}' not found or has no data.", status.HTTP_404_NOT_FOUND)


class UpstreamDataError(AppError):

    def __init__(self, detail: str = "Upstream market data source is unavailable."):
        super().__init__(detail, status.HTTP_503_SERVICE_UNAVAILABLE)


class ModelNotTrainedError(AppError):
    def __init__(self, ticker: str):
        super().__init__(
            f"No trained LSTM model found for '{ticker}'. Train one first via "
            f"POST /api/predictions/retrain/{ticker}.",
            status.HTTP_404_NOT_FOUND,
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:

    messages = [err["msg"] for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "; ".join(messages)},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_id = str(uuid.uuid4())
    # Full detail goes to server logs only - never to the client.
    logger.exception("Unhandled exception [%s] on %s", error_id, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "An unexpected error occurred. Please try again later.",
            "error_id": error_id,
        },
    )