const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  // 204 No Content has no body
  if (res.status === 204) return null;
  return res.json();
}

// ─── Market data ───
export const getQuote = (ticker) => request(`/api/market/quote/${ticker}`);

export const getOHLCV = (ticker, period = "6mo", interval = "1d") =>
  request(`/api/market/ohlcv/${ticker}?period=${period}&interval=${interval}`);

// ─── Indicators ───
export const getIndicators = (ticker, params = {}) => {
  const defaults = {
    period: "6mo",
    interval: "1d",
    include: "sma,ema,rsi,macd,bollinger",
  };
  const q = new URLSearchParams({ ...defaults, ...params }).toString();
  return request(`/api/indicators/${ticker}?${q}`);
};

// ─── Predictions ───
export const getLSTMPrediction = (ticker, horizon = 7) =>
  request(`/api/predictions/lstm/${ticker}?horizon=${horizon}`);

export const getForecast = (ticker, horizon = 30, interval_width = 0.8) =>
  request(
    `/api/predictions/prophet/${ticker}?horizon=${horizon}&interval_width=${interval_width}`,
  );

export const triggerRetrain = (ticker, epochs = 100) =>
  request(`/api/predictions/retrain/${ticker}?epochs=${epochs}`, {
    method: "POST",
  });

export const getRetrainStatus = (ticker) =>
  request(`/api/predictions/retrain/${ticker}/status`);

// ─── Sentiment ───
export const getSentiment = (ticker) => request(`/api/sentiment/${ticker}`);

export const getNews = (ticker) => request(`/api/sentiment/${ticker}/news`);

// ─── Portfolio ───
export const getHoldings = () => request("/api/portfolio/holdings");

export const addHolding = (holding) =>
  request("/api/portfolio/holdings", {
    method: "POST",
    body: JSON.stringify(holding),
  });

export const deleteHolding = (id) =>
  request(`/api/portfolio/holdings/${id}`, { method: "DELETE" });

export const getPortfolioSummary = () => request("/api/portfolio/summary");

// ─── Watchlist ───
export const getWatchlist = () => request("/api/watchlist");

export const addWatchlistItem = (item) =>
  request("/api/watchlist", { method: "POST", body: JSON.stringify(item) });

export const updateWatchlistItem = (id, update) =>
  request(`/api/watchlist/${id}`, {
    method: "PUT",
    body: JSON.stringify(update),
  });

export const deleteWatchlistItem = (id) =>
  request(`/api/watchlist/${id}`, { method: "DELETE" });
