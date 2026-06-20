"use client";
import { useEffect, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";

export default function CandlestickChart({
  ohlcvData = [],
  indicators = null,
  activeIndicators = [],
  predictionData = null,
  height = 460,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "#FFFFFF" },
        textColor: "#94A3B8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#F1F5F9", style: LineStyle.Dotted },
        horzLines: { color: "#F1F5F9", style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: {
          color: "#6366F1",
          labelBackgroundColor: "#6366F1",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: { color: "#6366F1", labelBackgroundColor: "#6366F1" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    seriesRef.current.candle = chart.addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#F43F5E",
      borderUpColor: "#10B981",
      borderDownColor: "#F43F5E",
      wickUpColor: "#10B981",
      wickDownColor: "#F43F5E",
    });

    seriesRef.current.volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      borderVisible: false,
    });

    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [height]);

  // Update OHLCV + volume
  useEffect(() => {
    if (!chartRef.current || !ohlcvData.length) return;

    const sorted = [...ohlcvData].sort((a, b) =>
      a.timestamp > b.timestamp ? 1 : -1,
    );

    const seen = new Map();
    sorted.forEach((d) => {
      const day = d.timestamp.split("T")[0];
      seen.set(day, d); // later entry overwrites earlier one for the same day
    });
    const deduped = Array.from(seen.values());

    seriesRef.current.candle?.setData(
      deduped.map((d) => ({
        time: d.timestamp.split("T")[0],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    );
    seriesRef.current.volume?.setData(
      deduped.map((d) => ({
        time: d.timestamp.split("T")[0],
        value: d.volume,
        color:
          d.close >= d.open ? "rgba(16,185,129,0.20)" : "rgba(244,63,94,0.20)",
      })),
    );
    chartRef.current.timeScale().fitContent();
  }, [ohlcvData]);

  // Update indicator overlays (SMA, EMA, Bollinger)
  useEffect(() => {
    if (!chartRef.current || !indicators || !ohlcvData.length) return;

    const timestamps = (indicators.timestamps || []).map(
      (t) => t.split("T")[0],
    );

    function toSeries(values) {
      if (!values) return [];
      const seen = new Map();
      timestamps.forEach((t, i) => {
        if (values[i] != null) seen.set(t, { time: t, value: values[i] });
      });
      return Array.from(seen.values());
    }

    function addLine(key, values, color, width = 1.5, style = LineStyle.Solid) {
      if (!chartRef.current) return;
      if (!seriesRef.current[key]) {
        seriesRef.current[key] = chartRef.current.addLineSeries({
          color,
          lineWidth: width,
          lineStyle: style,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      seriesRef.current[key].setData(toSeries(values));
    }

    function removeLine(key) {
      if (seriesRef.current[key] && chartRef.current) {
        try {
          chartRef.current.removeSeries(seriesRef.current[key]);
        } catch (_) {}
        delete seriesRef.current[key];
      }
    }

    if (activeIndicators.includes("sma") && indicators.sma) {
      addLine("sma", indicators.sma, "#6366F1", 1.5);
    } else removeLine("sma");

    if (activeIndicators.includes("ema") && indicators.ema) {
      addLine("ema", indicators.ema, "#F59E0B", 1.5);
    } else removeLine("ema");

    if (activeIndicators.includes("bollinger")) {
      if (indicators.bollinger_upper)
        addLine(
          "bb_upper",
          indicators.bollinger_upper,
          "#94A3B8",
          1,
          LineStyle.Dashed,
        );
      if (indicators.bollinger_middle)
        addLine(
          "bb_mid",
          indicators.bollinger_middle,
          "#CBD5E1",
          1,
          LineStyle.Dashed,
        );
      if (indicators.bollinger_lower)
        addLine(
          "bb_lower",
          indicators.bollinger_lower,
          "#94A3B8",
          1,
          LineStyle.Dashed,
        );
    } else {
      removeLine("bb_upper");
      removeLine("bb_mid");
      removeLine("bb_lower");
    }
  }, [indicators, activeIndicators, ohlcvData]);

  // Update LSTM prediction overlay
  useEffect(() => {
    if (!chartRef.current) return;

    function removePrediction() {
      ["prediction", "pred_upper", "pred_lower"].forEach((key) => {
        if (seriesRef.current[key]) {
          try {
            chartRef.current.removeSeries(seriesRef.current[key]);
          } catch (_) {}
          delete seriesRef.current[key];
        }
      });
    }

    if (!predictionData?.predictions?.length) {
      removePrediction();
      return;
    }

    const preds = predictionData.predictions;
    const toTime = (d) => d.split("T")[0];

    if (!seriesRef.current.prediction) {
      seriesRef.current.prediction = chartRef.current.addLineSeries({
        color: "#6366F1",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "LSTM",
      });
    }
    if (!seriesRef.current.pred_upper) {
      seriesRef.current.pred_upper = chartRef.current.addLineSeries({
        color: "rgba(99,102,241,0.3)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    if (!seriesRef.current.pred_lower) {
      seriesRef.current.pred_lower = chartRef.current.addLineSeries({
        color: "rgba(99,102,241,0.3)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    seriesRef.current.prediction.setData(
      preds.map((p) => ({ time: toTime(p.date), value: p.predicted_price })),
    );
    seriesRef.current.pred_upper.setData(
      preds.map((p) => ({ time: toTime(p.date), value: p.upper_bound })),
    );
    seriesRef.current.pred_lower.setData(
      preds.map((p) => ({ time: toTime(p.date), value: p.lower_bound })),
    );
    chartRef.current.timeScale().fitContent();
  }, [predictionData]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
