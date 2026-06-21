# Stock Predictor

A full-stack ML stock prediction platform built with FastAPI and Next.js 14. It uses an LSTM neural network and Holt-Winters exponential smoothing to forecast prices, displays technical indicators on live candlestick charts, tracks a portfolio with real-time P&L, and scores financial news headlines using VADER sentiment analysis.

This is an educational project. Nothing here is financial advice.

---

## What it does

- Live candlestick charts powered by TradingView Lightweight Charts
- Technical indicator overlays: RSI, MACD, Bollinger Bands, SMA, EMA
- LSTM price forecasting with a 60-day sliding window across 8 engineered features
- Holt-Winters seasonality forecasting with adjustable horizon and confidence bands
- News sentiment analysis on RSS-fetched headlines using VADER NLP
- Portfolio tracker with live unrealized P&L and allocation breakdown
- Watchlist with configurable price alert thresholds
- Model retraining endpoint with live progress polling (early stopping built in)

---

## Tech stack

**Frontend**

- Next.js 14 (App Router, JavaScript)
- Tailwind CSS
- TradingView Lightweight Charts v4
- Recharts
- Zustand (global state)
- SWR (data fetching)

**Backend**

- Python 3.11
- FastAPI
- TensorFlow CPU (LSTM model)
- statsmodels (Holt-Winters forecasting)
- scikit-learn (feature scaling)
- vaderSentiment (news sentiment)
- Motor + MongoDB Atlas (async database)
- yfinance (market data)
- feedparser (RSS news)
- slowapi (rate limiting)
- Pydantic (input validation)

---

## Project structure

```
stock-predictor/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (market, indicators, predictions, sentiment, portfolio, watchlist)
│   │   ├── core/           # Config, database connection, exceptions, rate limiter
│   │   ├── ml/             # LSTM architecture, feature engineering, model artifacts
│   │   ├── models/         # Pydantic schemas
│   │   └── services/       # Business logic (market data, indicators, LSTM, forecast, sentiment, portfolio, watchlist)
│   ├── scripts/
│   │   └── train_lstm.py   # CLI for training a model offline
│   └── requirements.txt
└── frontend/
    ├── app/                # Next.js App Router pages (dashboard, chart, forecast, portfolio, watchlist, sentiment)
    ├── components/         # Reusable UI components (charts, layout, market)
    ├── lib/                # API client and utility functions
    └── store/              # Zustand global state
```

---

## Getting started

### Requirements

- Python 3.11 (not 3.14, TensorFlow does not support it yet)
- Node.js 18 or higher
- MongoDB Atlas free tier or a local MongoDB instance

### Backend setup

```bash
cd backend
python3.11 -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and fill in your values:

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB_NAME=stock_predictor
HF_API_TOKEN=                  # optional, not used in current setup
ALLOWED_ORIGINS=http://localhost:3000
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs are auto-generated at `http://localhost:8000/docs`.

### Train a model before using the forecast features

The LSTM needs to be trained before the `/api/predictions/lstm/{ticker}` endpoint will work. Run this from inside the `backend` folder:

```bash
python scripts/train_lstm.py AAPL
```

This fetches 2 years of daily data, trains the model with early stopping, and saves the artifacts to `app/ml/artifacts/`. You can also trigger retraining from the Chart page in the UI.

You can train for other tickers the same way:

```bash
python scripts/train_lstm.py MSFT
python scripts/train_lstm.py NVDA --period 5y
```

### Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. It redirects to the dashboard automatically.

---

## API endpoints

| Method | Endpoint                                   | Description                                     |
| ------ | ------------------------------------------ | ----------------------------------------------- |
| GET    | `/api/market/quote/{ticker}`               | Current price and day stats                     |
| GET    | `/api/market/ohlcv/{ticker}`               | Historical OHLCV data                           |
| GET    | `/api/indicators/{ticker}`                 | RSI, MACD, Bollinger Bands, SMA, EMA            |
| GET    | `/api/predictions/lstm/{ticker}`           | LSTM price forecast with confidence bands       |
| GET    | `/api/predictions/prophet/{ticker}`        | Holt-Winters forecast with confidence bands     |
| POST   | `/api/predictions/retrain/{ticker}`        | Trigger LSTM retraining (background task)       |
| GET    | `/api/predictions/retrain/{ticker}/status` | Poll training progress                          |
| GET    | `/api/sentiment/{ticker}`                  | News headlines with VADER sentiment scores      |
| GET    | `/api/sentiment/{ticker}/news`             | Raw headlines without sentiment (no model call) |
| GET    | `/api/portfolio/holdings`                  | List all holdings                               |
| POST   | `/api/portfolio/holdings`                  | Add a holding                                   |
| DELETE | `/api/portfolio/holdings/{id}`             | Remove a holding                                |
| GET    | `/api/portfolio/summary`                   | Total value, P&L, allocation breakdown          |
| GET    | `/api/watchlist`                           | List watchlist items with alert status          |
| POST   | `/api/watchlist`                           | Add a ticker to the watchlist                   |
| PUT    | `/api/watchlist/{id}`                      | Update alert threshold                          |
| DELETE | `/api/watchlist/{id}`                      | Remove from watchlist                           |

---

## Security

- CORS locked to the frontend origin via `ALLOWED_ORIGINS` in `.env`
- Rate limiting on all endpoints with slowapi
- Input validation with Pydantic on every endpoint
- No stack traces exposed to clients in production
- All secrets loaded from environment variables, never hardcoded
- Model artifacts stored server-side only

---

## A note on the forecasting models

The LSTM confidence bands are not a rigorous statistical interval. The model measures its own prediction error on held-out validation data, then widens that estimate further out into the future using a standard heuristic. The Holt-Winters bands are more statistically grounded since the model has a real internal uncertainty representation, but they still assume the future will broadly follow the seasonal and trend patterns seen during training.

Both forecast endpoints include a `disclaimer` field in their response for exactly this reason. The UI surfaces it below the forecast table.

---

## Known limitations

- yfinance is an unofficial wrapper around Yahoo Finance and can be rate limited or blocked on some university or corporate networks. If you see empty chart errors, try a different network.
- The LSTM must be trained per ticker before predictions work. There is no pre-trained model included.
- Free MongoDB Atlas clusters have a 512MB storage cap, which is more than enough for this project but worth knowing.
- TensorFlow does not support Python 3.14 yet. Use Python 3.11 or 3.12.

---

## License

Built as a portfolio project by Muhammad Usman. 
