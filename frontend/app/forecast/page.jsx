"use client";
import { useState } from "react";
import useSWR from "swr";
import useStore from "@/store";
import { getOHLCV, getForecast } from "@/lib/api";
import { formatPrice, formatChange, changeColor } from "@/lib/utils";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const HORIZONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: 60, label: "60d" },
  { value: 90, label: "90d" },
];

const CONFIDENCE = [
  { value: 0.7, label: "70%" },
  { value: 0.8, label: "80%" },
  { value: 0.9, label: "90%" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0F172A",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
        color: "#FFFFFF",
      }}
    >
      <div style={{ color: "#64748B", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => {
        if (!p.value && p.value !== 0) return null;
        const labels = {
          actual: "Close",
          predicted: "Forecast",
          upper: "Upper",
          lower: "Lower",
        };
        return (
          <div
            key={i}
            style={{ color: p.color === "#FFFFFF" ? "#94A3B8" : p.color }}
          >
            {labels[p.dataKey] || p.dataKey}: $
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </div>
        );
      })}
    </div>
  );
};

export default function ForecastPage() {
  const { ticker } = useStore();
  const [horizon, setHorizon] = useState(30);
  const [confidence, setConfidence] = useState(0.8);

  const { data: ohlcv } = useSWR(`ohlcv-${ticker}-3mo-1d`, () =>
    getOHLCV(ticker, "3mo", "1d"),
  );

  const {
    data: forecast,
    isLoading,
    error,
  } = useSWR(
    `forecast-${ticker}-${horizon}-${confidence}`,
    () => getForecast(ticker, horizon, confidence),
    { revalidateOnFocus: false },
  );

  // Build combined chart data: last 60 actual bars + forecast
  const chartData = [];

  if (ohlcv?.data) {
    ohlcv.data.slice(-60).forEach((d) => {
      chartData.push({
        date: d.timestamp.split("T")[0],
        actual: parseFloat(d.close.toFixed(2)),
      });
    });
  }

  if (forecast?.forecast) {
    forecast.forecast.forEach((d) => {
      chartData.push({
        date: d.date.split("T")[0],
        predicted: parseFloat(d.predicted_price.toFixed(2)),
        upper: parseFloat(d.upper_bound.toFixed(2)),
        lower: parseFloat(d.lower_bound.toFixed(2)),
      });
    });
  }

  const lastActual = ohlcv?.data?.at(-1)?.close;
  const lastForecast = forecast?.forecast?.at(-1)?.predicted_price;
  const delta = lastActual && lastForecast ? lastForecast - lastActual : null;
  const deltaPct = delta && lastActual ? (delta / lastActual) * 100 : null;

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
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
          {ticker} · Holt-Winters Forecast
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 36,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {lastActual ? `$${formatPrice(lastActual)}` : "—"}
          </span>
          {delta !== null && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                color: changeColor(delta),
              }}
            >
              {horizon}d forecast: {delta >= 0 ? "+" : ""}$
              {formatPrice(Math.abs(delta))}&nbsp;
              <span style={{ fontSize: 13 }}>
                ({formatChange(deltaPct, true)})
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Horizon
          </span>
          <div className="pill-group">
            {HORIZONS.map(({ value, label }) => (
              <button
                key={value}
                className={`pill ${horizon === value ? "active" : ""}`}
                onClick={() => setHorizon(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Confidence
          </span>
          <div className="pill-group">
            {CONFIDENCE.map(({ value, label }) => (
              <button
                key={value}
                className={`pill ${confidence === value ? "active" : ""}`}
                onClick={() => setConfidence(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast chart */}
      <div
        className="card"
        style={{ padding: "20px 8px 16px 0", marginBottom: 14 }}
      >
        {isLoading ? (
          <div className="state-box" style={{ height: 400 }}>
            Computing forecast...
          </div>
        ) : error ? (
          <div className="state-box" style={{ height: 400 }}>
            <span style={{ color: "var(--negative)" }}>
              Failed to generate forecast. Make sure the backend is running.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 24, left: 10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="#F1F5F9"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 7))}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "#94A3B8",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                domain={["auto", "auto"]}
                width={64}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Confidence band — upper fills with indigo tint */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="rgba(99,102,241,0.25)"
                strokeWidth={1}
                strokeDasharray="3 4"
                fill="rgba(99,102,241,0.08)"
                connectNulls={false}
              />
              {/* Lower bound knocks out the area below */}
              <Area
                type="monotone"
                dataKey="lower"
                stroke="rgba(99,102,241,0.25)"
                strokeWidth={1}
                strokeDasharray="3 4"
                fill="#FFFFFF"
                connectNulls={false}
              />
              {/* Historical close */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#475569"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
              {/* Forecast */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div
        style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}
      >
        {[
          { color: "#475569", label: "Historical close", dashed: false },
          { color: "#6366F1", label: "Forecast", dashed: true },
          {
            label: `${(confidence * 100).toFixed(0)}% confidence band`,
            isArea: true,
          },
        ].map(({ color, label, dashed, isArea }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            {isArea ? (
              <div
                style={{
                  width: 18,
                  height: 10,
                  background: "rgba(99,102,241,0.1)",
                  border: "1px dashed rgba(99,102,241,0.4)",
                  borderRadius: 2,
                }}
              />
            ) : (
              <div
                style={{
                  width: 18,
                  height: 2,
                  borderRadius: 1,
                  background: dashed ? "transparent" : color,
                  backgroundImage: dashed
                    ? `repeating-linear-gradient(to right, ${color} 0, ${color} 5px, transparent 5px, transparent 9px)`
                    : "none",
                }}
              />
            )}
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Forecast table */}
      {forecast?.forecast?.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {horizon}-day price table
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Forecast", "Lower", "Upper", "Δ from now"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 18px",
                          textAlign: "left",
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {forecast.forecast.map((row, i) => {
                  const d = lastActual
                    ? row.predicted_price - lastActual
                    : null;
                  const pct = d && lastActual ? (d / lastActual) * 100 : null;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: i % 2 ? "var(--bg)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "9px 18px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {row.date.split("T")[0]}
                      </td>
                      <td
                        style={{
                          padding: "9px 18px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ${formatPrice(row.predicted_price)}
                      </td>
                      <td
                        style={{
                          padding: "9px 18px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        ${formatPrice(row.lower_bound)}
                      </td>
                      <td
                        style={{
                          padding: "9px 18px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        ${formatPrice(row.upper_bound)}
                      </td>
                      <td
                        style={{
                          padding: "9px 18px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color:
                            d !== null ? changeColor(d) : "var(--text-muted)",
                        }}
                      >
                        {d !== null
                          ? `${d >= 0 ? "+" : ""}$${formatPrice(Math.abs(d))} (${formatChange(pct, true)})`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: "10px 18px",
              fontSize: 11,
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border)",
              fontStyle: "italic",
            }}
          >
            {forecast.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
