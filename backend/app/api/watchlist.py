from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.models.db_models import WatchlistItem, WatchlistItemCreate, WatchlistItemUpdate
from app.services import watchlist_service

router = APIRouter()


@router.post("", response_model=WatchlistItem, status_code=201)
@limiter.limit("20/minute")
async def add_item(request: Request, item: WatchlistItemCreate):
    return await watchlist_service.add_watchlist_item(item)


@router.get("", response_model=list[WatchlistItem])
@limiter.limit("60/minute")
async def get_watchlist(request: Request):
    return await watchlist_service.list_watchlist()


@router.put("/{item_id}", response_model=WatchlistItem)
@limiter.limit("20/minute")
async def update_item(request: Request, item_id: str, update: WatchlistItemUpdate):
    return await watchlist_service.update_watchlist_item(item_id, update)


@router.delete("/{item_id}", status_code=204)
@limiter.limit("20/minute")
async def delete_item(request: Request, item_id: str):
    await watchlist_service.delete_watchlist_item(item_id)
