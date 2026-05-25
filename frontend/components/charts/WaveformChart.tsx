"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface WaveformChartProps {
  traces: number[][];
  xAxis?: number[];
  height?: number;
  highlightPoints?: number[];
  title?: string;
}

export default function WaveformChart({
  traces,
  xAxis,
  height = 300,
  highlightPoints = [],
  title,
}: WaveformChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    }
    const chart = chartRef.current;

    const xData = xAxis ?? (traces[0] ? Array.from({ length: traces[0].length }, (_, i) => i) : []);

    const colors = [
      "rgba(0,245,255,0.7)", "rgba(124,58,237,0.6)", "rgba(16,185,129,0.5)",
      "rgba(245,158,11,0.5)", "rgba(244,63,94,0.5)",
    ];

    const series: echarts.SeriesOption[] = traces.slice(0, 20).map((t, i) => ({
      type: "line",
      data: t,
      smooth: true,
      symbol: "none",
      lineStyle: { width: i === 0 ? 1.5 : 0.8, color: colors[i % colors.length] },
      emphasis: { disabled: true },
    }));

    // Leakage highlight markers
    if (highlightPoints.length > 0) {
      series.push({
        type: "scatter",
        data: highlightPoints.map((p) => [p, 0]),
        symbolSize: 8,
        itemStyle: { color: "#f43f5e", shadowBlur: 8, shadowColor: "#f43f5e" },
        z: 10,
      });
    }

    chart.setOption({
      backgroundColor: "transparent",
      title: title ? { text: title, textStyle: { color: "#94a3b8", fontSize: 12 }, left: 0, top: 0 } : undefined,
      grid: { top: title ? 32 : 12, right: 16, bottom: 32, left: 48, containLabel: false },
      xAxis: {
        type: "category",
        data: xData,
        axisLine: { lineStyle: { color: "rgba(99,179,237,0.1)" } },
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(99,179,237,0.05)" } },
        axisLabel: { color: "#475569", fontSize: 10 },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        { type: "inside", yAxisIndex: 0, filterMode: "none" },
      ],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,30,0.9)",
        borderColor: "rgba(0,245,255,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
        axisPointer: { lineStyle: { color: "rgba(0,245,255,0.4)" } },
      },
      series,
    }, true);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [traces, xAxis, highlightPoints, title]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
