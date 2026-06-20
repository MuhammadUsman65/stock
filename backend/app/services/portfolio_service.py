from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_db, serialize_doc
from app.core.exceptions import AppError
from app.models.db_models import Holding, HoldingCreate
from app.services import market_data

COLLECTION = "holdings"


async def add_holding(holding: HoldingCreate) -> Holding:
    db = get_db()
    doc = holding.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    if doc.get("purchase_date") is None:
        doc["purchase_date"] = doc["created_at"]

    result = await db[COLLECTION].insert_one(doc)
    saved = await db[COLLECTION].find_one({"_id": result.inserted_id})
    return Holding(**serialize_doc(saved))


async def list_holdings() -> list[Holding]:
    db = get_db()
    holdings = []
    async for doc in db[COLLECTION].find():
        holding = Holding(**serialize_doc(doc))
        _enrich_with_live_price(holding)
        holdings.append(holding)
    return holdings


async def delete_holding(holding_id: str) -> None:
    db = get_db()
    try:
        oid = ObjectId(holding_id)
    except InvalidId:
        raise AppError("Invalid holding id.", status_code=400)

    result = await db[COLLECTION].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise AppError("Holding not found.", status_code=404)


async def get_portfolio_summary() -> dict:
    holdings = await list_holdings()
    total_cost = sum(h.quantity * h.purchase_price for h in holdings)
    total_value = sum(h.market_value or 0 for h in holdings)
    total_pl = total_value - total_cost

    allocation = [
        {
            "ticker": h.ticker,
            "value": h.market_value or 0,
            "percent": round((h.market_value or 0) / total_value * 100, 2) if total_value else 0,
        }
        for h in holdings
    ]

    return {
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "total_pl": round(total_pl, 2),
        "total_pl_percent": round((total_pl / total_cost) * 100, 2) if total_cost else 0,
        "allocation": allocation,
    }


def _enrich_with_live_price(holding: Holding) -> None:
    try:
        quote = market_data.get_quote(holding.ticker)
    except Exception:
        # One bad/delisted ticker shouldn't break the whole portfolio view -
        # just leave its price fields as None.
        return

    price = quote.get("price")
    if price is None:
        return

    holding.current_price = price
    holding.market_value = round(price * holding.quantity, 2)
    cost_basis = holding.purchase_price * holding.quantity
    holding.unrealized_pl = round(holding.market_value - cost_basis, 2)
    holding.unrealized_pl_percent = (
        round((holding.unrealized_pl / cost_basis) * 100, 2) if cost_basis else 0
    )
