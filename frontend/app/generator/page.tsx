"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, type TraceGenerateRequest, type DatasetMeta } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Cpu, Zap, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}

function SliderField({ label, value, min, max, step, onChange, format, hint }: SliderFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>}
    </div>
  );
}

const DEFAULTS: Required<Omit<TraceGenerateRequest, "seed">> = {
  num_traces: 1000,
  trace_length: 200,
  noise_level: 1.0,
  leakage_intensity: 0.8,
  masked: false,
  masking_strength: 0.5,
  timing_jitter: 2,
  key_string: "protected",
};

export default function GeneratorPage() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DatasetMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addDataset, setActiveDataset } = useAppStore();

  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) =>
    setCfg((prev) => ({ ...prev, [k]: v }));

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await tracesAPI.generate(cfg);
      setResult(res.dataset);
      addDataset(res.dataset);
      setActiveDataset(res.dataset.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  const estimatedSamples = cfg.num_traces * cfg.trace_length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Synthetic Generator" />

      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Cpu size={18} color="var(--cyan)" />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Trace Generation Studio</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Configure and generate synthetic AES-128 side-channel traces with realistic leakage models.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            {/* Controls */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Dataset */}
                <div>
                  <div className="section-title" style={{ marginBottom: 14 }}>Dataset Parameters</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <SliderField label="Number of Traces" value={cfg.num_traces} min={50} max={5000} step={50}
                      onChange={(v) => set("num_traces", v)} hint="More traces → higher CPA confidence" />
                    <SliderField label="Trace Length (samples)" value={cfg.trace_length} min={50} max={500} step={10}
                      onChange={(v) => set("trace_length", v)} />
                  </div>
                </div>

                <div className="accent-line" />

                {/* Noise */}
                <div>
                  <div className="section-title" style={{ marginBottom: 14 }}>Noise & Leakage</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <SliderField label="Noise Level" value={cfg.noise_level} min={0} max={5} step={0.1}
                      onChange={(v) => set("noise_level", v)} hint="Gaussian noise σ added to traces" />
                    <SliderField label="Leakage Intensity" value={cfg.leakage_intensity} min={0} max={3} step={0.05}
                      onChange={(v) => set("leakage_intensity", v)} hint="Strength of HW leakage signal" />
                    <SliderField label="Timing Jitter" value={cfg.timing_jitter} min={0} max={8} step={1}
                      onChange={(v) => set("timing_jitter", v)} hint="Sample-level trigger offset variation" />
                  </div>
                </div>

                <div className="accent-line" />

                {/* Masking */}
                <div>
                  <div className="section-title" style={{ marginBottom: 14 }}>Masking Countermeasure</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <div
                        onClick={() => set("masked", !cfg.masked)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: cfg.masked ? "var(--violet)" : "var(--bg-elevated)",
                          border: `1px solid ${cfg.masked ? "var(--violet)" : "var(--border-default)"}`,
                          position: "relative", cursor: "pointer", transition: "all 250ms",
                        }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%",
                          background: "white",
                          position: "absolute", top: 2,
                          left: cfg.masked ? 18 : 2,
                          transition: "left 250ms",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }} />
                      </div>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        Enable Masking
                      </span>
                      {cfg.masked && <span className="badge badge-violet">Active</span>}
                    </label>
                  </div>
                  {cfg.masked && (
                    <SliderField label="Masking Strength" value={cfg.masking_strength} min={0} max={1} step={0.05}
                      onChange={(v) => set("masking_strength", v)}
                      format={(v) => `${Math.round(v * 100)}%`}
                      hint="Higher = more correlation suppression" />
                  )}
                </div>

                <div className="accent-line" />

                {/* Key */}
                <div>
                  <div className="section-title" style={{ marginBottom: 10 }}>Secret Key</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Info size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Padded to 16 bytes with null bytes</span>
                  </div>
                  <input
                    className="input"
                    style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}
                    value={cfg.key_string}
                    maxLength={16}
                    onChange={(e) => set("key_string", e.target.value)}
                    placeholder="protected"
                  />
                </div>
              </div>
            </motion.div>

            {/* Summary + Generate */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Preview card */}
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>Dataset Preview</div>
                {[
                  ["Traces", cfg.num_traces.toLocaleString()],
                  ["Samples", cfg.trace_length],
                  ["Total Samples", estimatedSamples.toLocaleString()],
                  ["Mode", cfg.masked ? "Masked AES" : "Unmasked AES"],
                  ["Noise σ", cfg.noise_level.toFixed(1)],
                  ["Leakage", cfg.leakage_intensity.toFixed(2)],
                  ["Key", `"${cfg.key_string}"`],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{k}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <button
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={15} />}
                {loading ? "Generating…" : "Generate Dataset"}
              </button>

              {/* Success */}
              {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ background: "var(--emerald-muted)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-md)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <CheckCircle size={14} color="var(--emerald)" />
                    <span style={{ fontSize: 13, color: "var(--emerald)", fontWeight: 600 }}>Dataset Created</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    ID: <span style={{ color: "var(--cyan)" }}>{result.id}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {result.shape.num_traces} traces × {result.shape.trace_length} samples
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    ✓ Set as active dataset
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: "var(--rose-muted)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", gap: 8 }}>
                  <AlertCircle size={14} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: "var(--rose)" }}>{error} — is the backend running?</div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
