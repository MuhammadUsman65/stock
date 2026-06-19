from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.models.db_models import Holding, HoldingCreate
from app.services import portfolio_service

router = APIRouter()


@router.post("/holdings", response_model=Holding, status_code=201)
@limiter.limit("20/minute")
async def add_holding(request: Request, holding: HoldingCreate):
    return await portfolio_service.add_holding(holding)


@router.get("/holdings", response_model=list[Holding])
@limiter.limit("60/minute")
async def get_holdings(request: Request):
    return await portfolio_service.list_holdings()


@router.delete("/holdings/{holding_id}", status_code=204)
@limiter.limit("20/minute")
async def delete_holding(request: Request, holding_id: str):
    await portfolio_service.delete_holding(holding_id)


@router.get("/summary")
@limiter.limit("60/minute")
async def get_summary(request: Request):
    return await portfolio_service.get_portfolio_summary()
