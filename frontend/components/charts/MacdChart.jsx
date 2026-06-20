"use client";
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MacdChart({
  timestamps = [],
  macdLine = [],
  signalLine = [],
  histogram = [],
}) {
  const data = timestamps
    .map((t, i) => ({
      time: t.split("T")[0],
      macd: macdLine[i] != null ? parseFloat(macdLine[i].toFixed(4)) : null,
      signal:
        signalLine[i] != null ? parseFloat(signalLine[i].toFixed(4)) : null,
      hist: histogram[i] != null ? parseFloat(histogram[i].toFixed(4)) : null,
    }))
    .filter((d) => d.macd != null)
    .slice(-120);

  if (!data.length) return null;

  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.time);

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="#F1F5F9"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fill: "#94A3B8",
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fill: "#94A3B8",
              fontFamily: "JetBrains Mono, monospace",
            }}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              background: "#0F172A",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              color: "#FFFFFF",
            }}
            labelStyle={{ color: "#64748B", marginBottom: 4 }}
            formatter={(v, name) => [
              v?.toFixed(4),
              name === "macd"
                ? "MACD"
                : name === "signal"
                  ? "Signal"
                  : "Histogram",
            ]}
          />
          <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1} />
          <Bar dataKey="hist" isAnimationActive={false} radius={[1, 1, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.hist >= 0
                    ? "rgba(16,185,129,0.5)"
                    : "rgba(244,63,94,0.5)"
                }
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="macd"
            stroke="#6366F1"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="signal"
            stroke="#F43F5E"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
