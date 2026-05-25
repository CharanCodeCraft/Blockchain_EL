"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface SNRChartProps {
  snr: number[];
  hotspots?: number[];
  hotspotThreshold?: number;
  height?: number;
}

export default function SNRChart({ snr, hotspots = [], hotspotThreshold, height = 260 }: SNRChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !snr.length) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    }
    const chart = chartRef.current;

    chart.setOption({
      backgroundColor: "transparent",
      grid: { top: 20, right: 20, bottom: 32, left: 52 },
      xAxis: {
        type: "category",
        data: snr.map((_, i) => i),
        axisLabel: { color: "#475569", fontSize: 10 },
        axisLine: { lineStyle: { color: "rgba(99,179,237,0.1)" } },
        name: "Sample",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#475569", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(99,179,237,0.05)" } },
        name: "SNR",
        nameTextStyle: { color: "#475569", fontSize: 10 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,30,0.9)",
        borderColor: "rgba(0,245,255,0.2)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: snr.map((v, i) => ({
            value: v,
            itemStyle: {
              color: hotspots.includes(i)
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#a855f7" },
                    { offset: 1, color: "#7c3aed" },
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(0,245,255,0.6)" },
                    { offset: 1, color: "rgba(0,245,255,0.1)" },
                  ]),
            },
          })),
          ...(hotspotThreshold !== undefined ? {
            markLine: {
              silent: true,
              symbol: "none",
              data: [{ yAxis: hotspotThreshold, lineStyle: { color: "#a855f7", type: "dashed" }, label: { formatter: "Hotspot", color: "#a855f7", fontSize: 10 } }],
            }
          } : {}),
        },
      ],
    }, true);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [snr, hotspots, hotspotThreshold]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
