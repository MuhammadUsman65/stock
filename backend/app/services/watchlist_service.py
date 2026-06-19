"""
Watchlist business logic: add/list/update/remove tickers, evaluate whether
a price alert threshold has been crossed.
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.core.database import get_db, serialize_doc
from app.core.exceptions import AppError
from app.models.db_models import WatchlistItem, WatchlistItemCreate, WatchlistItemUpdate
from app.services import market_data

COLLECTION = "watchlist"


async def add_watchlist_item(item: WatchlistItemCreate) -> WatchlistItem:
    db = get_db()
    doc = item.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db[COLLECTION].insert_one(doc)
    saved = await db[COLLECTION].find_one({"_id": result.inserted_id})
    return WatchlistItem(**serialize_doc(saved))


async def list_watchlist() -> list[WatchlistItem]:
    db = get_db()
    items = []
    async for doc in db[COLLECTION].find():
        item = WatchlistItem(**serialize_doc(doc))
        _check_alert(item)
        items.append(item)
    return items


async def update_watchlist_item(item_id: str, update: WatchlistItemUpdate) -> WatchlistItem:
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except InvalidId:
        raise AppError("Invalid watchlist item id.", status_code=400)

    changes = {k: v for k, v in update.model_dump().items() if v is not None}
    if not changes:
        raise AppError("No fields to update.", status_code=400)

    result = await db[COLLECTION].find_one_and_update(
        {"_id": oid}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    if result is None:
        raise AppError("Watchlist item not found.", status_code=404)
    return WatchlistItem(**serialize_doc(result))


async def delete_watchlist_item(item_id: str) -> None:
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except InvalidId:
        raise AppError("Invalid watchlist item id.", status_code=400)

    result = await db[COLLECTION].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise AppError("Watchlist item not found.", status_code=404)


def _check_alert(item: WatchlistItem) -> None:
    """Mutates `item` in place: fills current_price, flips alert_triggered if crossed."""
    try:
        quote = market_data.get_quote(item.ticker)
    except Exception:
        return

    price = quote.get("price")
    if price is None:
        return

    item.current_price = price
    if item.alert_threshold is None:
        return

    if item.alert_direction == "above" and price >= item.alert_threshold:
        item.alert_triggered = True
    elif item.alert_direction == "below" and price <= item.alert_threshold:
        item.alert_triggered = True
