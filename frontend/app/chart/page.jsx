"use client";
import { useState } from "react";
import useSWR from "swr";
import useStore from "@/store";
import {
  getOHLCV,
  getIndicators,
  getQuote,
  getLSTMPrediction,
  triggerRetrain,
  getRetrainStatus,
} from "@/lib/api";
import { formatPrice, formatChange, changeColor } from "@/lib/utils";
import CandlestickChart from "@/components/charts/CandlestickChart";
import RsiChart from "@/components/charts/RsiChart";
import MacdChart from "@/components/charts/MacdChart";

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
];

const INTERVALS = [
  { value: "1d", label: "1D" },
  { value: "1h", label: "1H" },
];

const INDICATORS = [
  { key: "sma", label: "SMA" },
  { key: "ema", label: "EMA" },
  { key: "bollinger", label: "BB" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
];

export default function ChartPage() {
  const {
    ticker,
    period,
    interval,
    setPeriod,
    setInterval: setChartInterval,
  } = useStore();
  const [activeIndicators, setActiveIndicators] = useState(["sma", "rsi"]);
  const [showPrediction, setShowPrediction] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState(null);

  const { data: quote } = useSWR(`quote-${ticker}`, () => getQuote(ticker), {
    refreshInterval: 30_000,
  });

  const { data: ohlcv, isLoading } = useSWR(
    `ohlcv-${ticker}-${period}-${interval}`,
    () => getOHLCV(ticker, period, interval),
  );

  const overlayKeys = activeIndicators.filter((k) =>
    ["sma", "ema", "bollinger"].includes(k),
  );
  const hasRsi = activeIndicators.includes("rsi");
  const hasMacd = activeIndicators.includes("macd");
  const includeParam = activeIndicators.join(",");

  const { data: indicators } = useSWR(
    activeIndicators.length
      ? `ind-${ticker}-${period}-${interval}-${includeParam}`
      : null,
    () => getIndicators(ticker, { period, interval, include: includeParam }),
  );

  const { data: prediction } = useSWR(
    showPrediction ? `lstm-${ticker}-7` : null,
    () => getLSTMPrediction(ticker, 7),
    { onError: () => {} },
  );

  function toggleIndicator(key) {
    setActiveIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleRetrain() {
    if (retraining) return;
    setRetraining(true);
    setRetrainStatus({
      status: "training",
      progress: 0,
      message: "Starting...",
    });
    try {
      await triggerRetrain(ticker);
      const poll = setInterval(async () => {
        try {
          const s = await getRetrainStatus(ticker);
          setRetrainStatus(s);
          if (s.status === "done" || s.status === "error") {
            clearInterval(poll);
            setRetraining(false);
          }
        } catch (_) {}
      }, 2000);
    } catch (e) {
      setRetrainStatus({ status: "error", progress: 0, message: e.message });
      setRetraining(false);
    }
  }

  const priceChange =
    quote?.price && quote?.previous_close
      ? quote.price - quote.previous_close
      : null;
  const pricePct =
    priceChange && quote?.previous_close
      ? (priceChange / quote.previous_close) * 100
      : null;

  return (
    <div className="page">
      {/* Quote hero */}
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
            {ticker} · Chart
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 36,
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
          <div style={{ paddingBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                fontWeight: 500,
                color: changeColor(priceChange),
              }}
            >
              {formatChange(priceChange)}&nbsp;
              <span style={{ fontSize: 13, opacity: 0.85 }}>
                ({formatChange(pricePct, true)})
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
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

        <div className="pill-group">
          {INTERVALS.map(({ value, label }) => (
            <button
              key={value}
              className={`pill ${interval === value ? "active" : ""}`}
              onClick={() => setChartInterval(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
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

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <button
          className={`indicator-pill ${showPrediction ? "active" : ""}`}
          onClick={() => setShowPrediction((p) => !p)}
        >
          ⚡ LSTM
        </button>
      </div>

      {/* Main chart */}
      <div className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
        {isLoading ? (
          <div className="state-box" style={{ height: 460 }}>
            Loading {ticker}...
          </div>
        ) : !ohlcv?.data?.length ? (
          <div className="state-box" style={{ height: 460 }}>
            No data for {ticker}.
          </div>
        ) : (
          <CandlestickChart
            ohlcvData={ohlcv.data}
            indicators={indicators}
            activeIndicators={overlayKeys}
            predictionData={showPrediction ? prediction : null}
            height={460}
          />
        )}
      </div>

      {/* RSI panel */}
      {hasRsi && indicators?.rsi && (
        <div className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 16px 0",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              RSI (14)
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              ▲ 70 overbought · ▼ 30 oversold
            </span>
          </div>
          <RsiChart
            timestamps={indicators.timestamps}
            rsiValues={indicators.rsi}
          />
        </div>
      )}

      {/* MACD panel */}
      {hasMacd && indicators?.macd_line && (
        <div className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 16px 0",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              MACD (12, 26, 9)
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { color: "#6366F1", label: "MACD" },
                { color: "#F43F5E", label: "Signal", dashed: true },
              ].map(({ color, label, dashed }) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 2,
                      background: color,
                      borderRadius: 1,
                      opacity: dashed ? 0.7 : 1,
                    }}
                  />
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <MacdChart
            timestamps={indicators.timestamps}
            macdLine={indicators.macd_line}
            signalLine={indicators.macd_signal}
            histogram={indicators.macd_histogram}
          />
        </div>
      )}

      {/* Retrain */}
      <div className="card" style={{ marginTop: 16, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Retrain LSTM for {ticker}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Trains on 2 years of daily OHLCV data. Early stopping kicks in
              automatically. Toggle ⚡ LSTM above to see the prediction on the
              chart once training is done.
            </div>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: retraining ? "var(--border)" : "var(--accent)",
              color: retraining ? "var(--text-muted)" : "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: retraining ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {retraining ? "Training..." : "Start training"}
          </button>
        </div>

        {retrainStatus && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                height: 4,
                background: "var(--border)",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${retrainStatus.progress}%`,
                  background:
                    retrainStatus.status === "error"
                      ? "var(--negative)"
                      : "var(--accent)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
                color:
                  retrainStatus.status === "error"
                    ? "var(--negative)"
                    : "var(--text-muted)",
              }}
            >
              {retrainStatus.status === "done"
                ? "✓ Training complete — toggle ⚡ LSTM to see updated predictions."
                : retrainStatus.status === "error"
                  ? `✗ ${retrainStatus.message}`
                  : retrainStatus.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
