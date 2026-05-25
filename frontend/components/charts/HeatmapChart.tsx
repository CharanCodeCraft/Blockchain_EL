"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface HeatmapChartProps {
  data: number[][];   // shape: [keyGuesses=256][timeSamples]
  height?: number;
  title?: string;
  bestKeyRow?: number;
}

export default function HeatmapChart({ data, height = 320, title, bestKeyRow }: HeatmapChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    }
    const chart = chartRef.current;

    const rows = data.length;       // 256
    const cols = data[0]?.length ?? 0;

    // Build flat array for ECharts heatmap: [col, row, value]
    const flat: [number, number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        flat.push([c, r, data[r][c]]);
      }
    }

    chart.setOption({
      backgroundColor: "transparent",
      title: title ? { text: title, textStyle: { color: "#94a3b8", fontSize: 12 }, left: 0 } : undefined,
      grid: { top: title ? 36 : 12, right: 80, bottom: 32, left: 48 },
      xAxis: {
        type: "category",
        data: Array.from({ length: cols }, (_, i) => i),
        axisLabel: { color: "#475569", fontSize: 9, interval: Math.floor(cols / 6) },
        axisLine: { lineStyle: { color: "rgba(99,179,237,0.1)" } },
        splitLine: { show: false },
        name: "Time Sample",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: Array.from({ length: rows }, (_, i) => i),
        axisLabel: {
          color: "#475569", fontSize: 9,
          interval: Math.floor(rows / 8),
          formatter: (v: string) => `0x${parseInt(v).toString(16).padStart(2, "0")}`,
        },
        axisLine: { lineStyle: { color: "rgba(99,179,237,0.1)" } },
        splitLine: { show: false },
        name: "Key Guess",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: "vertical",
        right: 0,
        top: "center",
        textStyle: { color: "#94a3b8", fontSize: 10 },
        inRange: {
          color: ["#0a0f1e", "#1a0a2e", "#7c3aed", "#a855f7", "#00f5ff", "#ffffff"],
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(10,15,30,0.9)",
        borderColor: "rgba(0,245,255,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
        formatter: (p: { data: [number, number, number] }) =>
          `Key: 0x${p.data[1].toString(16).padStart(2, "0")}<br/>Sample: ${p.data[0]}<br/>Corr: ${p.data[2].toFixed(4)}`,
      },
      series: [
        {
          type: "heatmap",
          data: flat,
          emphasis: { itemStyle: { borderColor: "var(--cyan)", borderWidth: 1 } },
        },
        // Highlight best key row
        ...(bestKeyRow !== undefined ? [{
          type: "line" as const,
          data: [] as number[],
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ yAxis: bestKeyRow }],
            lineStyle: { color: "#00f5ff", width: 1.5, type: "solid" },
            label: { show: true, formatter: `Best: 0x${bestKeyRow.toString(16)}`, color: "#00f5ff", fontSize: 10 },
          },
        }] : []),
      ],
    }, true);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [data, title, bestKeyRow]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
