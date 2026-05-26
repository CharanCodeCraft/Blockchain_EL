"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, maskingAPI, type DatasetMeta, type MaskingCompareResult, type MaskingFullComparisonResult } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Layers, Play, Loader2, ChevronDown, AlertCircle, CheckCircle, XCircle, ShieldCheck, ShieldX } from "lucide-react";

export default function MaskingStudioPage() {
  const { activeDatasetId, setActiveDataset, setMaskingResult } = useAppStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [maskingStrength, setMaskingStrength] = useState(0.9);
  const [byteIdx, setByteIdx] = useState(0);
  const [result, setResult] = useState<MaskingCompareResult | null>(null);
  const [fullResult, setFullResult] = useState<MaskingFullComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"single" | "full">("full");

  useEffect(() => { tracesAPI.list().then((r) => setDatasets(r.datasets)).catch(() => {}); }, []);

  async function runSingle() {
    if (!activeDatasetId) return;
    setLoading(true); setError(null);
    try {
      const r = await maskingAPI.compare({ dataset_id: activeDatasetId, masking_strength: maskingStrength, byte_idx: byteIdx });
      setResult(r); setMaskingResult(r);
    } catch { setError("Comparison failed — is the backend running?"); }
    finally { setLoading(false); }
  }

  async function runFull() {
    if (!activeDatasetId) return;
    setLoading(true); setError(null); setFullResult(null);
    try {
      const r = await maskingAPI.fullComparison({ dataset_id: activeDatasetId, masking_strength: maskingStrength });
      setFullResult(r);
    } catch { setError("Full comparison failed — is the backend running?"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Masking Studio" />
      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">

        {/* Controls bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Layers size={16} color="var(--amber)" />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dataset</label>
            <div style={{ position: "relative" }}>
              <select className="input" style={{ width: 200, appearance: "none", paddingRight: 28 }}
                value={activeDatasetId ?? ""} onChange={(e) => setActiveDataset(e.target.value || null)}>
                <option value="">— select dataset —</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} ({d.shape.num_traces}×{d.shape.trace_length}){d.config?.masked ? " [masked]" : " [unmasked]"}{d.source === "imported" ? " 📦" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          {activeTab === "single" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Byte</label>
              <select className="input" style={{ width: 60 }} value={byteIdx} onChange={(e) => setByteIdx(Number(e.target.value))}>
                {Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 280 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Masking</label>
            <input type="range" min={0} max={1} step={0.05} value={maskingStrength}
              onChange={(e) => setMaskingStrength(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", whiteSpace: "nowrap" }}>
              {Math.round(maskingStrength * 100)}%
            </span>
          </div>

          <button className="btn-primary" onClick={activeTab === "full" ? runFull : runSingle}
            disabled={loading || !activeDatasetId} style={{ marginLeft: "auto" }}>
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
            {loading ? "Analyzing…" : activeTab === "full" ? "Run Full Comparison" : "Run Single Byte"}
          </button>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--bg-elevated)", borderRadius: 8, padding: 3, width: "fit-content" }}>
          {([["full", "Full Key Comparison"], ["single", "Single Byte Analysis"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "8px 18px", fontSize: 12, fontWeight: 500,
                borderRadius: 6, border: "none", cursor: "pointer",
                background: activeTab === key ? "var(--violet)" : "transparent",
                color: activeTab === key ? "white" : "var(--text-muted)",
                transition: "all 150ms",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, color: "var(--rose)", fontSize: 13, padding: "12px 16px", background: "var(--rose-muted)", borderRadius: "var(--radius-md)", border: "1px solid rgba(244,63,94,0.3)" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        {/* ─── Full Key Comparison Tab ─── */}
        {activeTab === "full" && (
          fullResult ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
                {/* Unmasked */}
                <div className="glass" style={{ padding: 24, textAlign: "center" }}>
                  <ShieldX size={28} color="var(--rose)" style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Unmasked Attack</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "var(--rose)", fontFamily: "var(--font-mono)" }}>
                    {fullResult.summary.unmasked_recovered_count}/16
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>bytes recovered</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                    avg corr: {(fullResult.summary.avg_correlation_unmasked * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Reduction arrow */}
                <div style={{ textAlign: "center", padding: "0 10px" }}>
                  <div style={{ fontSize: 36, color: "var(--text-muted)", marginBottom: 4 }}>→</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                    -{fullResult.summary.avg_leakage_reduction_pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>avg leakage reduction</div>
                </div>

                {/* Masked */}
                <div className="glass" style={{ padding: 24, textAlign: "center" }}>
                  <ShieldCheck size={28} color="var(--emerald)" style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Masked Attack</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                    {fullResult.summary.masked_recovered_count}/16
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>bytes recovered</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                    avg corr: {(fullResult.summary.avg_correlation_masked * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Complexity rating */}
              <div className="glass" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  padding: "4px 12px", borderRadius: 100,
                  background: fullResult.summary.masked_recovered_count <= 2 ? "var(--emerald-muted)" : fullResult.summary.masked_recovered_count <= 6 ? "var(--amber-muted)" : "var(--rose-muted)",
                  color: fullResult.summary.masked_recovered_count <= 2 ? "var(--emerald)" : fullResult.summary.masked_recovered_count <= 6 ? "var(--amber)" : "var(--rose)",
                  fontSize: 12, fontWeight: 600,
                }}>
                  Attack Complexity
                </div>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{fullResult.summary.complexity_rating}</span>
              </div>

              {/* Per-byte comparison table */}
              <div className="glass" style={{ overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Byte-by-Byte Recovery Comparison
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                      {["Byte", "Actual Key", "Unmasked", "", "Masked", "", "Corr ↓"].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, fontWeight: 600,
                          color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fullResult.per_byte.map((b) => (
                      <tr key={b.byte_idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                          b{b.byte_idx}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>
                          {b.actual_key.toString(16).padStart(2, "0").toUpperCase()}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12,
                          color: b.unmasked_correct ? "var(--emerald)" : "var(--rose)" }}>
                          {b.unmasked_recovered.toString(16).padStart(2, "0").toUpperCase()}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "center" }}>
                          {b.unmasked_correct ? <CheckCircle size={12} color="var(--emerald)" /> : <XCircle size={12} color="var(--rose)" />}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12,
                          color: b.masked_correct ? "var(--emerald)" : "var(--rose)" }}>
                          {b.masked_recovered.toString(16).padStart(2, "0").toUpperCase()}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "center" }}>
                          {b.masked_correct ? <CheckCircle size={12} color="var(--emerald)" /> : <XCircle size={12} color="var(--rose)" />}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                            {/* Mini correlation comparison bar */}
                            <div style={{ width: 60, height: 12, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${b.unmasked_peak_corr * 100}%`, height: "100%", background: "rgba(244,63,94,0.6)" }} />
                            </div>
                            <div style={{ width: 60, height: 12, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${b.masked_peak_corr * 100}%`, height: "100%", background: "rgba(16,185,129,0.6)" }} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--emerald)", minWidth: 40, textAlign: "right" }}>
                              -{b.correlation_reduction_pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Correlation comparison chart */}
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                  Peak Correlation per Byte — Unmasked vs Masked
                </div>
                <div style={{ display: "flex", gap: 4, height: 140, alignItems: "flex-end" }}>
                  {fullResult.per_byte.map((b) => (
                    <div key={b.byte_idx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ display: "flex", gap: 1, width: "100%", height: "100%", alignItems: "flex-end" }}>
                        <div style={{
                          flex: 1, height: `${b.unmasked_peak_corr * 100}%`,
                          background: "linear-gradient(to top, rgba(244,63,94,0.7), rgba(244,63,94,0.3))",
                          borderRadius: "2px 2px 0 0", minHeight: 2,
                        }} title={`Unmasked: ${(b.unmasked_peak_corr * 100).toFixed(1)}%`} />
                        <div style={{
                          flex: 1, height: `${b.masked_peak_corr * 100}%`,
                          background: "linear-gradient(to top, rgba(16,185,129,0.7), rgba(16,185,129,0.3))",
                          borderRadius: "2px 2px 0 0", minHeight: 2,
                        }} title={`Masked: ${(b.masked_peak_corr * 100).toFixed(1)}%`} />
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>b{b.byte_idx}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(244,63,94,0.5)" }} /> Unmasked
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(16,185,129,0.5)" }} /> Masked
                  </div>
                </div>
              </div>

              {/* Educational explanation */}
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
                  💡 Why Masking Works
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Boolean masking applies a random mask <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>m</span> to
                  intermediate values, splitting <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>S[p⊕k]</span> into
                  two shares: <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>S[p⊕k]⊕m</span> and{" "}
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>m</span>.
                  Each share independently leaks information uncorrelated with the secret key.
                  At <strong style={{ color: "var(--amber)" }}>{Math.round(maskingStrength * 100)}% masking strength</strong>,
                  the effective leakage is reduced by <strong style={{ color: "var(--emerald)" }}>{fullResult.summary.avg_leakage_reduction_pct.toFixed(1)}%</strong>,
                  making key recovery require exponentially more traces — increasing attack complexity
                  from <strong style={{ color: "var(--rose)" }}>{fullResult.summary.unmasked_recovered_count}/16</strong> to{" "}
                  <strong style={{ color: "var(--emerald)" }}>{fullResult.summary.masked_recovered_count}/16</strong> recoverable bytes.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass"
              style={{ padding: 60, textAlign: "center" }}>
              <Layers size={36} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Select a dataset and run full key comparison to see masking effectiveness across all 16 bytes.</div>
            </motion.div>
          )
        )}

        {/* ─── Single Byte Tab ─── */}
        {activeTab === "single" && (
          result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass" style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>Leakage Reduction Analysis — Byte {result.byte_idx}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
                  {/* Unmasked */}
                  <div style={{ background: "var(--rose-muted)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Unmasked</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "var(--rose)", fontFamily: "var(--font-mono)" }}>
                      {(result.unmasked.peak_correlation * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Peak Correlation</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Key: <span style={{ fontFamily: "var(--font-mono)", color: "var(--rose)" }}>0x{result.unmasked.best_key.toString(16).padStart(2, "0")}</span>
                    </div>
                  </div>

                  {/* Arrow + reduction */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, color: "var(--text-muted)" }}>→</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                      -{result.leakage_reduction_pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>reduction</div>
                  </div>

                  {/* Masked */}
                  <div style={{ background: "var(--emerald-muted)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Masked</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                      {(result.masked.peak_correlation * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Peak Correlation</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Key: <span style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>0x{result.masked.best_key.toString(16).padStart(2, "0")}</span>
                    </div>
                  </div>
                </div>

                {/* Bar comparison */}
                <div style={{ marginTop: 24 }}>
                  <div className="section-title" style={{ marginBottom: 10 }}>Correlation Score Distribution</div>
                  <div style={{ display: "flex", gap: 8, height: 80, alignItems: "flex-end" }}>
                    {result.unmasked.scores.map((s, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                        <div style={{ width: "100%", height: `${s * 100}%`, background: "rgba(244,63,94,0.5)", borderRadius: "2px 2px 0 0", minHeight: 1 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Unmasked (red) vs Key Guess (0–255)</div>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass"
              style={{ padding: 60, textAlign: "center" }}>
              <Layers size={36} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Select a dataset and run single byte comparison.</div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
