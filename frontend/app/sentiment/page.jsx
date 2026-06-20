"use client";
import useSWR from "swr";
import useStore from "@/store";
import { getSentiment } from "@/lib/api";
import { sentimentColor } from "@/lib/utils";
import { ExternalLink, Newspaper } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function SentimentBadge({ label, score }) {
  const colors = {
    positive: { bg: "var(--positive-bg)", color: "var(--positive)" },
    negative: { bg: "var(--negative-bg)", color: "var(--negative)" },
    neutral: { bg: "var(--bg)", color: "var(--text-muted)" },
  };
  const { bg, color } = colors[label] || colors.neutral;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "capitalize",
        border: label === "neutral" ? "1px solid var(--border)" : "none",
      }}
    >
      {label}
    </span>
  );
}

export default function SentimentPage() {
  const { ticker } = useStore();

  const { data, isLoading, error } = useSWR(
    `sentiment-${ticker}`,
    () => getSentiment(ticker),
    { revalidateOnFocus: false },
  );

  const overall = data?.overall;
  const articles = data?.articles ?? [];

  const barData = overall
    ? [
        {
          label: "Positive",
          value: overall.positive_count,
          fill: "var(--positive)",
        },
        { label: "Neutral", value: overall.neutral_count, fill: "#94A3B8" },
        {
          label: "Negative",
          value: overall.negative_count,
          fill: "var(--negative)",
        },
      ]
    : [];

  const sentimentScore = overall?.score ?? null;
  const sentimentPct =
    sentimentScore != null ? Math.round(sentimentScore * 100) : null;

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
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
          {ticker} · News Sentiment
        </div>
        {overall ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 40,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: sentimentColor(overall.label),
              }}
            >
              {sentimentPct}%
            </span>
            <div>
              <div style={{ marginBottom: 6 }}>
                <SentimentBadge label={overall.label} score={overall.score} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Based on {overall.article_count} article
                {overall.article_count !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            {isLoading
              ? "Analysing headlines..."
              : error
                ? "Could not load sentiment."
                : "—"}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 280px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Articles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Newspaper size={15} color="var(--text-muted)" />
              Latest headlines
            </div>

            {isLoading ? (
              <div className="state-box" style={{ height: 300 }}>
                Fetching headlines...
              </div>
            ) : error ? (
              <div
                className="state-box"
                style={{ height: 300, flexDirection: "column", gap: 8 }}
              >
                <span style={{ color: "var(--negative)" }}>
                  Failed to load sentiment data.
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Make sure the backend is running and HF_API_TOKEN is set.
                </span>
              </div>
            ) : !articles.length ? (
              <div
                className="state-box"
                style={{ height: 200, flexDirection: "column", gap: 8 }}
              >
                <Newspaper
                  size={28}
                  color="var(--text-muted)"
                  strokeWidth={1.5}
                />
                <span style={{ color: "var(--text-muted)" }}>
                  No news found for {ticker}.
                </span>
              </div>
            ) : (
              articles.map((article, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 18px",
                    borderBottom:
                      i < articles.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    background: i % 2 ? "var(--bg)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          lineHeight: 1.4,
                          display: "block",
                          marginBottom: 7,
                        }}
                      >
                        {article.title}
                        <ExternalLink
                          size={11}
                          style={{
                            marginLeft: 5,
                            opacity: 0.4,
                            verticalAlign: "middle",
                            flexShrink: 0,
                          }}
                        />
                      </a>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <SentimentBadge label={article.label} />
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          confidence {(article.score * 100).toFixed(0)}%
                        </span>
                        {article.source && (
                          <span
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            {article.source}
                          </span>
                        )}
                        {article.published_at && (
                          <span
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            {new Date(article.published_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        alignItems: "flex-end",
                        flexShrink: 0,
                      }}
                    >
                      {[
                        { k: "positive", color: "var(--positive)" },
                        { k: "neutral", color: "#94A3B8" },
                        { k: "negative", color: "var(--negative)" },
                      ].map(({ k, color }) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9.5,
                              color: "var(--text-muted)",
                              width: 38,
                              textAlign: "right",
                              textTransform: "capitalize",
                            }}
                          >
                            {k}
                          </span>
                          <div
                            style={{
                              width: 60,
                              height: 4,
                              background: "var(--border)",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${((article.scores?.[k] ?? 0) * 100).toFixed(0)}%`,
                                height: "100%",
                                background: color,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-muted)",
                              width: 28,
                            }}
                          >
                            {((article.scores?.[k] ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: breakdown */}
        {overall && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Count breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Sentiment breakdown
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={barData}
                  margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 11,
                      fill: "#94A3B8",
                      fontFamily: "var(--font-body)",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
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
                    formatter={(v, n, p) => [v, p.payload.label]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Score cards */}
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                Score summary
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  { label: "Overall", value: overall.label, isLabel: true },
                  {
                    label: "Confidence",
                    value: `${sentimentPct}%`,
                    mono: true,
                  },
                  {
                    label: "Articles",
                    value: overall.article_count,
                    mono: true,
                  },
                  {
                    label: "Positive",
                    value: overall.positive_count,
                    mono: true,
                    color: "var(--positive)",
                  },
                  {
                    label: "Negative",
                    value: overall.negative_count,
                    mono: true,
                    color: "var(--negative)",
                  },
                  {
                    label: "Neutral",
                    value: overall.neutral_count,
                    mono: true,
                  },
                ].map(({ label, value, isLabel, mono, color }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {label}
                    </span>
                    {isLabel ? (
                      <SentimentBadge label={value} />
                    ) : (
                      <span
                        style={{
                          fontFamily: mono
                            ? "var(--font-mono)"
                            : "var(--font-body)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: color || "var(--text-primary)",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* VADER note */}
            <div
              style={{
                padding: "12px 16px",
                background: "var(--accent-light)",
                borderRadius: 8,
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--accent)",
                  lineHeight: 1.6,
                }}
              >
                <strong>Model note:</strong> Sentiment is powered by VADER, a
                general-purpose lexicon tuned for short texts. Scores reflect
                the language in headlines, not financial recommendation.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
