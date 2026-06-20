"use client";
import { useState } from "react";
import useSWR from "swr";
import useStore from "@/store";
import { getOHLCV, getIndicators, getQuote } from "@/lib/api";
import {
  formatPrice,
  formatChange,
  formatVolume,
  changeColor,
} from "@/lib/utils";
import CandlestickChart from "@/components/charts/CandlestickChart";

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
];

const INDICATORS = [
  { key: "sma", label: "SMA 20", color: "#6366F1" },
  { key: "ema", label: "EMA 20", color: "#F59E0B" },
  { key: "bollinger", label: "BB", color: "#94A3B8" },
  { key: "rsi", label: "RSI", color: "#10B981" },
  { key: "macd", label: "MACD", color: "#F43F5E" },
];

export default function Dashboard() {
  const { ticker, period, setPeriod } = useStore();
  const [activeIndicators, setActiveIndicators] = useState(["sma"]);

  const { data: quote } = useSWR(
    ticker ? `quote-${ticker}` : null,
    () => getQuote(ticker),
    { refreshInterval: 30_000 },
  );

  const { data: ohlcv, isLoading } = useSWR(
    ticker ? `ohlcv-${ticker}-${period}` : null,
    () => getOHLCV(ticker, period, "1d"),
  );

  const includeParam = activeIndicators.join(",");
  const { data: indicators } = useSWR(
    ticker && activeIndicators.length
      ? `ind-${ticker}-${period}-${includeParam}`
      : null,
    () =>
      getIndicators(ticker, { period, interval: "1d", include: includeParam }),
  );

  function toggleIndicator(key) {
    setActiveIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const priceChange =
    quote?.price && quote?.previous_close
      ? quote.price - quote.previous_close
      : null;
  const pricePct =
    priceChange && quote?.previous_close
      ? (priceChange / quote.previous_close) * 100
      : null;

  const lastBar = ohlcv?.data?.[ohlcv.data.length - 1];

  return (
    <div className="page">
      {/* ── Quote hero ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            {ticker}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {quote?.price ? `$${formatPrice(quote.price)}` : "—"}
          </div>
        </div>

        {priceChange !== null && (
          <div style={{ paddingBottom: 5 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                fontWeight: 500,
                color: changeColor(priceChange),
              }}
            >
              {formatChange(priceChange)} &nbsp;
              <span style={{ fontSize: 14, opacity: 0.85 }}>
                ({formatChange(pricePct, true)})
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Controls row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Period selector */}
        <div className="pill-group">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              className={`pill ${period === value ? "active" : ""}`}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        {/* Indicator toggles */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 500,
              marginRight: 2,
            }}
          >
            Overlays
          </span>
          {INDICATORS.map(({ key, label }) => (
            <button
              key={key}
              className={`indicator-pill ${activeIndicators.includes(key) ? "active" : ""}`}
              onClick={() => toggleIndicator(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main chart ── */}
      <div className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
        {isLoading ? (
          <div className="state-box" style={{ height: 460 }}>
            Loading {ticker}...
          </div>
        ) : !ohlcv?.data?.length ? (
          <div className="state-box" style={{ height: 460 }}>
            No data available for {ticker}.
          </div>
        ) : (
          <CandlestickChart
            ohlcvData={ohlcv.data}
            indicators={indicators}
            activeIndicators={activeIndicators}
            height={460}
          />
        )}
      </div>

      {/* ── Stats row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {[
          { label: "Volume", value: formatVolume(lastBar?.volume) },
          {
            label: "Day's High",
            value: quote?.day_high ? `$${formatPrice(quote.day_high)}` : "—",
          },
          {
            label: "Day's Low",
            value: quote?.day_low ? `$${formatPrice(quote.day_low)}` : "—",
          },
          {
            label: "Prev Close",
            value: quote?.previous_close
              ? `$${formatPrice(quote.previous_close)}`
              : "—",
          },
          {
            label: "Period Open",
            value: ohlcv?.data?.[0]?.open
              ? `$${formatPrice(ohlcv.data[0].open)}`
              : "—",
          },
          {
            label: "Period Return",
            value:
              ohlcv?.data?.length >= 2
                ? (() => {
                    const first = ohlcv.data[0].close;
                    const last = ohlcv.data[ohlcv.data.length - 1].close;
                    const pct = ((last - first) / first) * 100;
                    return (
                      <span style={{ color: changeColor(pct) }}>
                        {formatChange(pct, true)}
                      </span>
                    );
                  })()
                : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
