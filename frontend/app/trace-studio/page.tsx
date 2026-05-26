"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, type WaveformData, type DatasetMeta } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { AudioWaveform, RefreshCw, Loader2, Layers, ChevronDown } from "lucide-react";

const WaveformChart = dynamic(() => import("@/components/charts/WaveformChart"), { ssr: false });

export default function TraceStudioPage() {
  const { datasets, activeDatasetId, setActiveDataset } = useAppStore();
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxTraces, setMaxTraces] = useState(20);
  const [downsample, setDownsample] = useState(1);
  const [allDatasets, setAllDatasets] = useState<DatasetMeta[]>([]);

  useEffect(() => {
    tracesAPI.list().then((r) => setAllDatasets(r.datasets)).catch(() => {});
  }, []);

  async function load(id: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await tracesAPI.waveform(id, maxTraces, downsample);
      setWaveform(data);
    } catch {
      setError("Failed to load waveform. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeDatasetId) load(activeDatasetId);
  }, [activeDatasetId, maxTraces, downsample]);

  const activeMeta = allDatasets.find((d) => d.id === activeDatasetId);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Trace Studio" />

      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        {/* Controls bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

          <AudioWaveform size={16} color="var(--cyan)" />

          {/* Dataset selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dataset</label>
            <div style={{ position: "relative" }}>
              <select
                className="input"
                style={{ width: 180, appearance: "none", paddingRight: 28 }}
                value={activeDatasetId ?? ""}
                onChange={(e) => { setActiveDataset(e.target.value || null); }}
              >
                <option value="">— select —</option>
                {allDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} ({d.shape.num_traces}×{d.shape.trace_length}){d.config?.masked ? " [masked]" : " [unmasked]"}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Trace count */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Traces</label>
            <select className="input" style={{ width: 80 }} value={maxTraces} onChange={(e) => setMaxTraces(Number(e.target.value))}>
              {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Downsample */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Downsample</label>
            <select className="input" style={{ width: 70 }} value={downsample} onChange={(e) => setDownsample(Number(e.target.value))}>
              {[1, 2, 4, 8].map((n) => <option key={n} value={n}>×{n}</option>)}
            </select>
          </div>

          <button className="btn-ghost" style={{ marginLeft: "auto" }}
            onClick={() => activeDatasetId && load(activeDatasetId)} disabled={loading}>
            {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
            Reload
          </button>
        </motion.div>

        {/* Waveform */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
            <Layers size={14} color="var(--violet-bright)" /> Waveform Viewer
            {waveform && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>
                — {waveform.num_traces} traces × {waveform.trace_length} samples
              </span>
            )}
          </div>
          <div className="accent-line" style={{ marginBottom: 16 }} />

          {!activeDatasetId && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
              Select a dataset to visualize traces.
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 10, color: "var(--text-muted)" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Loading traces…
            </div>
          )}
          {error && (
            <div style={{ color: "var(--rose)", fontSize: 13, padding: "20px 0" }}>{error}</div>
          )}
          {waveform && !loading && (
            <WaveformChart traces={waveform.traces} xAxis={waveform.x_axis} height={340} />
          )}
        </motion.div>

        {/* Meta panel */}
        {activeMeta && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass" style={{ padding: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Dataset Metadata</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {[
                ["ID", activeMeta.id],
                ["Traces", activeMeta.shape.num_traces],
                ["Length", activeMeta.shape.trace_length],
                ["Masked", activeMeta.config.masked ? "Yes" : "No"],
                ["Noise", activeMeta.config.noise_level],
                ["Leakage", activeMeta.config.leakage_intensity],
                ["Key", `"${activeMeta.config.key_string}"`],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
