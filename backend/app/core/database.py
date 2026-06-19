"""
MongoDB connection management.

Uses Motor, the official async MongoDB driver, since the rest of this app
is async end-to-end (FastAPI handlers, etc). One client is created at
startup and reused for the app's lifetime - creating a new client per
request is a common and expensive mistake with MongoDB drivers.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

settings = get_settings()

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Called once on app startup (see the lifespan in main.py)."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client[settings.mongodb_db_name]
    # Ping immediately so a bad connection string fails loudly at startup,
    # not silently on someone's first real request.
    await _client.admin.command("ping")


async def close_mongo_connection() -> None:
    """Called once on app shutdown."""
    global _client
    if _client is not None:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    """Services call this to get a collection, e.g. get_db()['holdings']."""
    if _db is None:
        raise RuntimeError("Database not initialized - did the startup lifespan run?")
    return _db


def serialize_doc(doc: dict | None) -> dict | None:
    """
    MongoDB documents use an ObjectId for `_id`. Pydantic/JSON don't know
    what to do with that type, so every document gets converted to a plain
    string field called `id` before it's handed to a Pydantic model.
    """
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
