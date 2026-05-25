"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { experimentsAPI, type ExperimentSummary } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { BookOpen, Trash2, Eye, RefreshCw, Loader2 } from "lucide-react";

export default function ExperimentsPage() {
  const { setExperiments } = useAppStore();
  const [experiments, setLocal] = useState<ExperimentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await experimentsAPI.list();
      setLocal(r.experiments);
      setExperiments(r.experiments);
    } catch { setLocal([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    setDeleting(id);
    try { await experimentsAPI.delete(id); await load(); }
    catch { alert("Delete failed"); }
    finally { setDeleting(null); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Experiments" />
      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <BookOpen size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Saved Sessions</h2>
          <button className="btn-ghost" style={{ marginLeft: "auto" }} onClick={load} disabled={loading}>
            {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </motion.div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : experiments.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass"
            style={{ padding: 60, textAlign: "center" }}>
            <BookOpen size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>No experiments saved yet.</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Run a CPA/TVLA/masking analysis and save the session from each studio page.
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["ID", "Name", "Description", "Dataset", "Created", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
                      color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp, i) => (
                  <motion.tr key={exp.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>{exp.id}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{exp.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{exp.description || "—"}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{exp.dataset_id || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                      {exp.created_at ? new Date(exp.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                          <Eye size={12} /> View
                        </button>
                        <button className="btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 12, color: "var(--rose)", borderColor: "rgba(244,63,94,0.2)" }}
                          onClick={() => del(exp.id)}
                          disabled={deleting === exp.id}>
                          {deleting === exp.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
