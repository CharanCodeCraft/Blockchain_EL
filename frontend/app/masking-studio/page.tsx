"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, maskingAPI, type DatasetMeta, type MaskingCompareResult } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Layers, Play, Loader2, ChevronDown, AlertCircle } from "lucide-react";

export default function MaskingStudioPage() {
  const { activeDatasetId, setActiveDataset, setMaskingResult } = useAppStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [maskingStrength, setMaskingStrength] = useState(0.9);
  const [byteIdx, setByteIdx] = useState(0);
  const [result, setResult] = useState<MaskingCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { tracesAPI.list().then((r) => setDatasets(r.datasets)).catch(() => {}); }, []);

  async function run() {
    if (!activeDatasetId) return;
    setLoading(true); setError(null);
    try {
      const r = await maskingAPI.compare({ dataset_id: activeDatasetId, masking_strength: maskingStrength, byte_idx: byteIdx });
      setResult(r); setMaskingResult(r);
    } catch { setError("Comparison failed — is the backend running?"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Masking Studio" />
      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Layers size={16} color="var(--amber)" />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dataset</label>
            <div style={{ position: "relative" }}>
              <select className="input" style={{ width: 200, appearance: "none", paddingRight: 28 }}
                value={activeDatasetId ?? ""} onChange={(e) => setActiveDataset(e.target.value || null)}>
                <option value="">— select dataset —</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Byte</label>
            <select className="input" style={{ width: 60 }} value={byteIdx} onChange={(e) => setByteIdx(Number(e.target.value))}>
              {Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 280 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Masking Strength</label>
            <input type="range" min={0} max={1} step={0.05} value={maskingStrength}
              onChange={(e) => setMaskingStrength(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", whiteSpace: "nowrap" }}>
              {Math.round(maskingStrength * 100)}%
            </span>
          </div>
          <button className="btn-primary" onClick={run} disabled={loading || !activeDatasetId} style={{ marginLeft: "auto" }}>
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
            {loading ? "Comparing…" : "Run Comparison"}
          </button>
        </motion.div>

        {error && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, color: "var(--rose)", fontSize: 13, padding: "12px 16px", background: "var(--rose-muted)", borderRadius: "var(--radius-md)", border: "1px solid rgba(244,63,94,0.3)" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Reduction metric */}
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
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Select a dataset and run the comparison to see masking effectiveness.</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
