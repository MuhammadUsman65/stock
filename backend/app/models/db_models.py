"""
Schemas for MongoDB-backed resources.

Pattern used throughout: an "*Create" model is what the client sends in
(no id yet, since Mongo generates that). The full model adds the
Mongo-generated id plus any fields computed at read time, like current
price - those are never stored in the database, they're calculated fresh
on every request so they're never stale.
"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _validate_ticker(v: str) -> str:
    v = v.strip().upper()
    if not v.replace(".", "").replace("-", "").isalnum():
        raise ValueError("Ticker contains invalid characters.")
    return v


# ---------- Portfolio ----------

class HoldingCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    quantity: float = Field(gt=0)
    purchase_price: float = Field(gt=0)
    purchase_date: datetime | None = None

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return _validate_ticker(v)


class Holding(HoldingCreate):
    id: str
    created_at: datetime

    # Computed at read time by portfolio_service - not stored in Mongo.
    current_price: float | None = None
    market_value: float | None = None
    unrealized_pl: float | None = None
    unrealized_pl_percent: float | None = None


# ---------- Watchlist ----------

class WatchlistItemCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    alert_threshold: float | None = Field(default=None, gt=0)
    alert_direction: str = Field(default="above", pattern="^(above|below)$")

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return _validate_ticker(v)


class WatchlistItemUpdate(BaseModel):
    """Only the fields someone is allowed to change after creation."""
    alert_threshold: float | None = Field(default=None, gt=0)
    alert_direction: str | None = Field(default=None, pattern="^(above|below)$")


class WatchlistItem(WatchlistItemCreate):
    id: str
    created_at: datetime

    # Computed at read time - not stored in Mongo.
    current_price: float | None = None
    alert_triggered: bool = False
