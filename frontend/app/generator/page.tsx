"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, type TraceGenerateRequest, type DatasetMeta } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Cpu, Zap, CheckCircle, AlertCircle, Loader2, Info, Shuffle, KeyRound } from "lucide-react";

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

function generateRandomHexKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidHex(s: string): boolean {
  return /^[0-9a-fA-F]{0,32}$/.test(s);
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

function asciiToHex(s: string): string {
  const padded = (s + "\0".repeat(16)).slice(0, 16);
  return Array.from(padded).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

interface ConfigState {
  num_traces: number;
  trace_length: number;
  noise_level: number;
  leakage_intensity: number;
  masked: boolean;
  masking_strength: number;
  timing_jitter: number;
  key_hex: string;
  key_mode: "hex" | "text";
  key_string: string;
}

const DEFAULTS: ConfigState = {
  num_traces: 1000,
  trace_length: 200,
  noise_level: 1.0,
  leakage_intensity: 0.8,
  masked: false,
  masking_strength: 0.5,
  timing_jitter: 2,
  key_hex: "70726f746563746564000000000000000",
  key_mode: "hex",
  key_string: "protected",
};

// Initialize with a proper default hex
const INITIAL_HEX = asciiToHex("protected");

export default function GeneratorPage() {
  const [cfg, setCfg] = useState<ConfigState>({ ...DEFAULTS, key_hex: INITIAL_HEX });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DatasetMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addDataset, setActiveDataset } = useAppStore();

  const set = <K extends keyof ConfigState>(k: K, v: ConfigState[K]) =>
    setCfg((prev) => ({ ...prev, [k]: v }));

  const activeHex = cfg.key_mode === "hex" ? cfg.key_hex : asciiToHex(cfg.key_string);
  const hexValid = /^[0-9a-fA-F]{32}$/.test(activeHex);
  const keyBytes = hexValid ? hexToBytes(activeHex) : [];

  async function handleGenerate() {
    if (!hexValid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: TraceGenerateRequest = {
        num_traces: cfg.num_traces,
        trace_length: cfg.trace_length,
        noise_level: cfg.noise_level,
        leakage_intensity: cfg.leakage_intensity,
        masked: cfg.masked,
        masking_strength: cfg.masking_strength,
        timing_jitter: cfg.timing_jitter,
        key_hex: activeHex,
      };
      const res = await tracesAPI.generate(body);
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

                {/* Secret Key — Enhanced */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <KeyRound size={14} color="var(--cyan)" />
                      <div className="section-title" style={{ margin: 0 }}>AES-128 Secret Key</div>
                    </div>
                    {/* Mode toggle */}
                    <div style={{ display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 6, padding: 2 }}>
                      {(["hex", "text"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            set("key_mode", mode);
                            if (mode === "hex" && cfg.key_mode === "text") {
                              set("key_hex", asciiToHex(cfg.key_string));
                            }
                          }}
                          style={{
                            padding: "4px 10px", fontSize: 11, fontWeight: 500,
                            borderRadius: 4, border: "none", cursor: "pointer",
                            background: cfg.key_mode === mode ? "var(--violet)" : "transparent",
                            color: cfg.key_mode === mode ? "white" : "var(--text-muted)",
                            transition: "all 150ms",
                          }}
                        >
                          {mode === "hex" ? "HEX" : "TEXT"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {cfg.key_mode === "hex" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className="input"
                          style={{
                            flex: 1, fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
                            borderColor: cfg.key_hex.length === 32 && hexValid ? "var(--emerald)" :
                              cfg.key_hex.length > 0 && !isValidHex(cfg.key_hex) ? "var(--rose)" : undefined,
                          }}
                          value={cfg.key_hex}
                          maxLength={32}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9a-fA-F]/g, "");
                            set("key_hex", val);
                          }}
                          placeholder="2b7e151628aed2a6abf7158809cf4f3c"
                        />
                        <button
                          className="btn-cyan"
                          style={{ padding: "6px 10px", whiteSpace: "nowrap" }}
                          onClick={() => set("key_hex", generateRandomHexKey())}
                          title="Generate random key"
                        >
                          <Shuffle size={13} />
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {cfg.key_hex.length}/32 hex characters ({cfg.key_hex.length / 2}/16 bytes)
                        </div>
                        {cfg.key_hex.length === 32 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--emerald)" }}>
                            <CheckCircle size={11} /> Valid key
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        className="input"
                        style={{ fontFamily: "var(--font-mono)" }}
                        value={cfg.key_string}
                        maxLength={16}
                        onChange={(e) => set("key_string", e.target.value)}
                        placeholder="protected"
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <Info size={11} /> Padded to 16 bytes with null bytes → hex: {asciiToHex(cfg.key_string)}
                      </div>
                    </div>
                  )}

                  {/* Key byte preview */}
                  {hexValid && (
                    <div style={{ marginTop: 12, display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {keyBytes.map((b, i) => (
                        <div key={i} style={{
                          width: 38, height: 34, borderRadius: 6,
                          background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: 1,
                        }}>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>b{i}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                            {b.toString(16).padStart(2, "0").toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{k}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{v}</span>
                  </div>
                ))}
                {/* Key hex row */}
                <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Key (hex)</div>
                  <div style={{
                    fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--cyan)",
                    wordBreak: "break-all", lineHeight: 1.5,
                  }}>
                    {hexValid ? activeHex : "—"}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}
                onClick={handleGenerate}
                disabled={loading || !hexValid}
              >
                {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={15} />}
                {loading ? "Generating…" : "Generate Dataset"}
              </button>

              {/* Key invalid warning */}
              {!hexValid && cfg.key_hex.length > 0 && cfg.key_mode === "hex" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--amber)", padding: "8px 12px", background: "var(--amber-muted)", borderRadius: "var(--radius-md)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <AlertCircle size={13} /> Key must be exactly 32 hex characters
                </div>
              )}

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
