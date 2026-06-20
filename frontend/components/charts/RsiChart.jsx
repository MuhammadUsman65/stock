"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function RsiChart({ timestamps = [], rsiValues = [] }) {
  const data = timestamps
    .map((t, i) => ({
      time: t.split("T")[0],
      rsi: rsiValues[i] != null ? parseFloat(rsiValues[i].toFixed(2)) : null,
    }))
    .filter((d) => d.rsi != null)
    .slice(-120);

  if (!data.length) return null;

  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.time);

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart
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
            domain={[0, 100]}
            ticks={[0, 30, 50, 70, 100]}
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fill: "#94A3B8",
              fontFamily: "JetBrains Mono, monospace",
            }}
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
            formatter={(v) => [v?.toFixed(2), "RSI"]}
            labelStyle={{ color: "#64748B", marginBottom: 2 }}
          />
          <ReferenceLine
            y={70}
            stroke="#F43F5E"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
          <ReferenceLine
            y={30}
            stroke="#10B981"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
          <ReferenceLine y={50} stroke="#E2E8F0" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="rsi"
            stroke="#6366F1"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#6366F1" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
