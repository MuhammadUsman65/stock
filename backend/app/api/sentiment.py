"""
News sentiment router - implemented in Phase 5.
Will call the HuggingFace Inference API for FinBERT rather than loading
the model locally, to keep the service's memory footprint small.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def sentiment_health():
    return {"status": "stub - implemented in Phase 5"}
