# Stock Predictor — Backend (Phase 1 + Phase 2: scaffolding + persistence)

## What's here
- `app/main.py` — FastAPI app, CORS locked to your frontend origin, slowapi rate limiting, global exception handlers, MongoDB connects/disconnects automatically on startup/shutdown.
- `app/core/config.py` — settings loaded from `.env` via pydantic-settings.
- `app/core/exceptions.py` — `AppError` and subclasses for clean, intentional error responses.
- `app/core/database.py` — MongoDB connection (Motor, the async driver).
- `app/services/market_data.py` — yfinance wrapper with a 60s TTL cache.
- `app/services/portfolio_service.py` / `watchlist_service.py` — business logic for holdings and watched tickers, including live P&L and alert-threshold checks.
- `app/api/market.py` — `/api/market/quote/{ticker}`, `/api/market/ohlcv/{ticker}`.
- `app/api/portfolio.py` — `/api/portfolio/holdings` (POST/GET), `/api/portfolio/holdings/{id}` (DELETE), `/api/portfolio/summary` (GET).
- `app/api/watchlist.py` — `/api/watchlist` (POST/GET), `/api/watchlist/{id}` (PUT/DELETE).
- `app/api/indicators.py`, `app/api/sentiment.py` — stubs, filled in during Phases 3 and 5.

## Running it
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt   # tensorflow-cpu + prophet make this a slow install, that's expected
cp .env.example .env
```
You need a MongoDB instance. Two options:
- **Local**: install MongoDB Community Edition and run `mongod`, then leave `MONGODB_URI=mongodb://localhost:27017` in `.env` as-is.
- **MongoDB Atlas (free, no local install)**: create a free M0 cluster at cloud.mongodb.com, create a database user, allow your IP, copy the `mongodb+srv://...` connection string into `MONGODB_URI` in `.env`.

Then:
```bash
uvicorn app.main:app --reload --port 8000
```
Swagger docs: http://localhost:8000/docs — try adding a holding via `/api/portfolio/holdings`, then check `/api/portfolio/summary`.

## Important: what I could and couldn't verify here
I built and smoke-tested this in a sandboxed container whose network egress is restricted to package registries (PyPI, npm, GitHub) — it cannot reach `finance.yahoo.com` or a real MongoDB server (local or Atlas).
- Confirmed: every endpoint, the full add/list/update/delete flow for holdings and watchlist items, ticker validation, invalid-id handling, and P&L/summary calculations — all tested using `mongomock-motor`, an in-memory drop-in replacement for the real MongoDB driver, run through real HTTP requests against the actual FastAPI app.
- Not yet confirmed from this environment: a connection to a real MongoDB instance, and a real yfinance price lookup (so `current_price`, `market_value`, etc. will be `None` until you run this somewhere with real network access).

## Next: Phase 3
Technical indicators — RSI, MACD, Bollinger Bands, EMA/SMA, computed from the OHLCV data we're already fetching.

