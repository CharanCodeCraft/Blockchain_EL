"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface TVLAChartProps {
  tScores: number[];
  threshold?: number;
  leakagePoints?: number[];
  height?: number;
}

export default function TVLAChart({ tScores, threshold = 4.5, leakagePoints = [], height = 280 }: TVLAChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !tScores.length) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    }
    const chart = chartRef.current;

    chart.setOption({
      backgroundColor: "transparent",
      grid: { top: 20, right: 20, bottom: 32, left: 52 },
      xAxis: {
        type: "category",
        data: tScores.map((_, i) => i),
        axisLabel: { color: "#475569", fontSize: 10 },
        axisLine: { lineStyle: { color: "rgba(99,179,237,0.1)" } },
        name: "Sample",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#475569", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(99,179,237,0.05)" } },
        name: "t-Score",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,30,0.9)",
        borderColor: "rgba(0,245,255,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
        formatter: (params: { dataIndex: number; data: number }[]) => {
          const p = params[0];
          const t = tScores[p.dataIndex];
          const leaked = Math.abs(t) > threshold;
          return `Sample: ${p.dataIndex}<br/>t-score: ${t.toFixed(3)}<br/>${leaked ? "⚠️ LEAKAGE" : "OK"}`;
        },
      },
      series: [
        {
          type: "line",
          data: tScores,
          smooth: false,
          symbol: "none",
          lineStyle: { width: 1.5, color: "#00f5ff" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(0,245,255,0.15)" },
              { offset: 1, color: "rgba(0,245,255,0)" },
            ]),
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              { yAxis: threshold, lineStyle: { color: "#f43f5e", type: "dashed", width: 1.5 }, label: { formatter: `+${threshold}`, color: "#f43f5e", fontSize: 10 } },
              { yAxis: -threshold, lineStyle: { color: "#f43f5e", type: "dashed", width: 1.5 }, label: { formatter: `-${threshold}`, color: "#f43f5e", fontSize: 10 } },
            ],
          },
          markPoint: leakagePoints.length ? {
            data: leakagePoints.slice(0, 20).map((p) => ({
              coord: [p, tScores[p]],
              symbolSize: 8,
              itemStyle: { color: "#f43f5e", shadowBlur: 6, shadowColor: "#f43f5e" },
            })),
          } : undefined,
        },
      ],
    }, true);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [tScores, threshold, leakagePoints]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
