"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, type DatasetMeta, type CPAStreamEvent } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { createCPAStream } from "@/lib/ws";
import { Shield, Play, Loader2, ChevronDown, AlertCircle } from "lucide-react";

const HeatmapChart = dynamic(() => import("@/components/charts/HeatmapChart"), { ssr: false });
const ByteRecoveryGrid = dynamic(() => import("@/components/charts/ByteRecoveryGrid"), { ssr: false });
const KeyVerificationPanel = dynamic(() => import("@/components/charts/KeyVerificationPanel"), { ssr: false });

export default function CPAStudioPage() {
  const { activeDatasetId, setActiveDataset, setCpaStreaming, setCpaProgress, setCpaResult } = useAppStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recovered, setRecovered] = useState<(number | null)[]>(Array(16).fill(null));
  const [confidences, setConfidences] = useState<number[]>(Array(16).fill(0));
  const [currentByte, setCurrentByte] = useState<number | undefined>(undefined);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Key verification state
  const [originalKey, setOriginalKey] = useState<number[]>([]);
  const [byteMatch, setByteMatch] = useState<boolean[]>(Array(16).fill(false));
  const [fullMatch, setFullMatch] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [originalKeyText, setOriginalKeyText] = useState("");
  const [recoveredKeyText, setRecoveredKeyText] = useState("");

  useEffect(() => {
    tracesAPI.list().then((r) => setDatasets(r.datasets)).catch(() => {});
  }, []);

  const handleEvent = useCallback((ev: any) => {
    if (!ev) return;
    if (ev.error) {
      setError(ev.error);
      setStreaming(false);
      setCpaStreaming(false);
      return;
    }
    if (ev.byte_idx === undefined) return;

    setCurrentByte(ev.byte_idx);
    setProgress(ev.byte_idx + 1);
    setCpaProgress(ev.byte_idx + 1);
    if (ev.scores) {
      setScores(ev.scores);
    }

    setRecovered((prev) => {
      const next = [...prev];
      next[ev.byte_idx] = ev.best_key !== undefined ? ev.best_key : null;
      return next;
    });
    setConfidences((prev) => {
      const next = [...prev];
      next[ev.byte_idx] = ev.confidence !== undefined ? ev.confidence : 0;
      return next;
    });

    // Live key match updates
    if (ev.correct_key !== undefined && ev.is_match !== undefined) {
      setByteMatch((prev) => {
        const next = [...prev];
        next[ev.byte_idx] = ev.is_match!;
        return next;
      });
      setMatchCount(ev.match_count_so_far ?? 0);
    }

    // Build heatmap from best correlation row
    if (ev.corr_heatmap_best && ev.corr_heatmap_best.length) {
      setHeatmapData((prev) => {
        const next = [...prev];
        while (next.length <= ev.byte_idx) next.push([]);
        next[ev.byte_idx] = ev.corr_heatmap_best;
        return next;
      });
    }

    if (ev.done) {
      setStreaming(false);
      setCpaStreaming(false);
      setDone(true);
      setCurrentByte(undefined);

      // Final verification data
      if (ev.original_key) {
        setOriginalKey(ev.original_key);
        setFullMatch(ev.full_match ?? false);
        setMatchCount(ev.match_count ?? 0);
        setByteMatch(ev.byte_match ?? Array(16).fill(false));
        setOriginalKeyText(ev.original_key_text ?? "");
        setRecoveredKeyText(ev.recovered_key_text ?? "");
      }
    }
  }, [setCpaProgress, setCpaStreaming]);

  function runCPA() {
    if (!activeDatasetId) return;
    setError(null);
    setDone(false);
    setRecovered(Array(16).fill(null));
    setConfidences(Array(16).fill(0));
    setHeatmapData([]);
    setProgress(0);
    setStreaming(true);
    setCpaStreaming(true);
    setOriginalKey([]);
    setByteMatch(Array(16).fill(false));
    setFullMatch(false);
    setMatchCount(0);
    setOriginalKeyText("");
    setRecoveredKeyText("");

    const cleanup = createCPAStream(
      activeDatasetId,
      handleEvent,
      () => {
        setError("WebSocket error — is the backend running?");
        setStreaming(false);
        setCpaStreaming(false);
      },
      () => {
        setStreaming(false);
        setCpaStreaming(false);
      }
    );
    return cleanup;
  }

  // Scores bar chart data (last attacked byte)
  const scoresForChart = scores && scores.length
    ? scores.map((v, i) => ({ key: i, score: v }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="CPA Studio" />

      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Shield size={16} color="var(--violet-bright)" />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dataset</label>
            <div style={{ position: "relative" }}>
              <select className="input" style={{ width: 200, appearance: "none", paddingRight: 28 }}
                value={activeDatasetId ?? ""} onChange={(e) => setActiveDataset(e.target.value || null)}>
                <option value="">— select dataset —</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} ({d.shape.num_traces}×{d.shape.trace_length}){d.config?.masked ? " [masked]" : " [unmasked]"}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          <button className="btn-primary" onClick={runCPA} disabled={streaming || !activeDatasetId}
            style={{ marginLeft: "auto" }}>
            {streaming ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
            {streaming ? `Attacking byte ${progress}/16…` : "Run CPA Attack"}
          </button>
        </motion.div>

        {/* Progress */}
        {(streaming || done) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ marginBottom: 16, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)" }}>
              <span>{done ? "CPA Complete ✓" : `Attacking byte ${progress} of 16…`}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>{Math.round(progress / 16 * 100)}%</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-base)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div animate={{ width: `${progress / 16 * 100}%` }} transition={{ duration: 0.3 }}
                style={{ height: "100%", background: "linear-gradient(90deg, var(--violet), var(--cyan))", borderRadius: 2 }} />
            </div>
          </motion.div>
        )}

        {error && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, color: "var(--rose)", fontSize: 13, padding: "12px 16px", background: "var(--rose-muted)", borderRadius: "var(--radius-md)", border: "1px solid rgba(244,63,94,0.3)" }}>
            <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* Key Verification Panel — shown when CPA is done and we have verification data */}
        {done && originalKey.length === 16 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
              🔑 Key Verification
            </div>
            <KeyVerificationPanel
              originalKey={originalKey}
              recoveredKey={recovered}
              byteMatch={byteMatch}
              fullMatch={fullMatch}
              matchCount={matchCount}
              originalKeyText={originalKeyText}
              recoveredKeyText={recoveredKeyText}
            />
          </motion.div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Key Recovery Grid */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
              Key Recovery — Byte-by-Byte
            </div>
            <ByteRecoveryGrid
              recoveredBytes={recovered}
              confidences={confidences}
              highlightByte={currentByte}
            />
          </motion.div>

          {/* Correlation scores */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
              Correlation Scores — Byte {currentByte ?? "—"}
            </div>
            {scores && scores.length > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 120, overflow: "hidden" }}>
                {scores.map((s, i) => {
                  const isBest = s === Math.max(...scores);
                  return (
                    <div key={i} title={`Key 0x${i.toString(16)}: ${s.toFixed(4)}`}
                      style={{
                        flex: 1, minWidth: 1,
                        height: `${s * 100}%`,
                        background: isBest
                          ? "linear-gradient(to top, var(--cyan), rgba(0,245,255,0.4))"
                          : "rgba(124,58,237,0.4)",
                        borderRadius: "2px 2px 0 0",
                        transition: "height 300ms ease",
                      }} />
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
                Run CPA to see correlation scores
              </div>
            )}
            {scores && scores.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                Best key: <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>
                  0x{(recovered[currentByte ?? 0] ?? 0).toString(16).padStart(2, "0")}
                </span>
                {" — "}confidence: <span style={{ color: "var(--violet-bright)" }}>
                  {((confidences[currentByte ?? 0] ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Heatmap */}
        {heatmapData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Correlation Heatmap — Best Key Row per Byte
            </div>
            <div className="accent-line" style={{ marginBottom: 16 }} />
            <HeatmapChart
              data={heatmapData}
              height={300}
              bestKeyRow={currentByte !== undefined ? recovered[currentByte] ?? undefined : undefined}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
