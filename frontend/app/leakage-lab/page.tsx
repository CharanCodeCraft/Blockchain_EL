"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, leakageAPI, type DatasetMeta, type TVLAResult, type SNRResult } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { FlaskConical, Loader2, ChevronDown, AlertCircle, TrendingUp, Activity } from "lucide-react";

const TVLAChart = dynamic(() => import("@/components/charts/TVLAChart"), { ssr: false });
const SNRChart = dynamic(() => import("@/components/charts/SNRChart"), { ssr: false });

export default function LeakageLabPage() {
  const { activeDatasetId, setActiveDataset, setTvlaResult, setSnrResult } = useAppStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [byteIdx, setByteIdx] = useState(0);
  const [tvla, setTvla] = useState<TVLAResult | null>(null);
  const [snr, setSnr] = useState<SNRResult | null>(null);
  const [loadingTvla, setLoadingTvla] = useState(false);
  const [loadingSnr, setLoadingSnr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tracesAPI.list().then((r) => setDatasets(r.datasets)).catch(() => {});
  }, []);

  async function runTVLA() {
    if (!activeDatasetId) return;
    setLoadingTvla(true); setError(null);
    try {
      const r = await leakageAPI.tvla({ dataset_id: activeDatasetId, byte_idx: byteIdx });
      setTvla(r); setTvlaResult(r);
    } catch { setError("TVLA failed — is the backend running?"); }
    finally { setLoadingTvla(false); }
  }

  async function runSNR() {
    if (!activeDatasetId) return;
    setLoadingSnr(true); setError(null);
    try {
      const r = await leakageAPI.snr({ dataset_id: activeDatasetId, byte_idx: byteIdx });
      setSnr(r); setSnrResult(r);
    } catch { setError("SNR failed — is the backend running?"); }
    finally { setLoadingSnr(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Leakage Lab" />
      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <FlaskConical size={16} color="var(--emerald)" />
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
          <button className="btn-cyan" onClick={runTVLA} disabled={loadingTvla || !activeDatasetId}>
            {loadingTvla ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Activity size={13} />}
            Run TVLA
          </button>
          <button className="btn-cyan" onClick={runSNR} disabled={loadingSnr || !activeDatasetId}>
            {loadingSnr ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <TrendingUp size={13} />}
            Run SNR
          </button>
        </motion.div>

        {error && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, color: "var(--rose)", fontSize: 13, padding: "12px 16px", background: "var(--rose-muted)", borderRadius: "var(--radius-md)", border: "1px solid rgba(244,63,94,0.3)" }}>
            <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Activity size={14} color="var(--emerald)" /> TVLA — Fixed vs Random t-Test
              {tvla && <span className={`badge ${tvla.leakage_points.length > 0 ? "badge-rose" : "badge-emerald"}`} style={{ marginLeft: 8 }}>
                {tvla.leakage_points.length} leakage pts | max |t| = {tvla.max_t.toFixed(2)}
              </span>}
            </div>
            <div className="accent-line" style={{ marginBottom: 16 }} />
            {tvla
              ? <TVLAChart tScores={tvla.t_scores} threshold={tvla.threshold} leakagePoints={tvla.leakage_points} />
              : <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Select a dataset and click "Run TVLA"</div>
            }
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TrendingUp size={14} color="var(--violet-bright)" /> Signal-to-Noise Ratio
              {snr && <span className="badge badge-violet" style={{ marginLeft: 8 }}>
                max SNR: {snr.max_snr.toFixed(4)} | {snr.hotspots.length} hotspots
              </span>}
            </div>
            <div className="accent-line" style={{ marginBottom: 16 }} />
            {snr
              ? <SNRChart snr={snr.snr} hotspots={snr.hotspots} hotspotThreshold={snr.hotspot_threshold} />
              : <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Select a dataset and click "Run SNR"</div>
            }
          </motion.div>
        </div>
      </div>
    </div>
  );
}
