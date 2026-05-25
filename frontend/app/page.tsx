"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { tracesAPI, experimentsAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  Cpu, Shield, FlaskConical, Layers, Database,
  TrendingUp, Zap, ChevronRight, Activity
} from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  delay?: number;
}

function StatCard({ icon, label, value, sub, accent = "var(--cyan)", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="stat-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${accent}18`,
          border: `1px solid ${accent}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </motion.div>
  );
}

const quickLinks = [
  { href: "/generator", icon: <Cpu size={15} />, label: "Generate Traces", desc: "Create synthetic AES datasets", color: "var(--cyan)" },
  { href: "/cpa-studio", icon: <Shield size={15} />, label: "CPA Attack", desc: "Run key recovery analysis", color: "var(--violet-bright)" },
  { href: "/leakage-lab", icon: <FlaskConical size={15} />, label: "Leakage Lab", desc: "TVLA & SNR analysis", color: "var(--emerald)" },
  { href: "/masking-studio", icon: <Layers size={15} />, label: "Masking Studio", desc: "Simulate countermeasures", color: "var(--amber)" },
];

export default function DashboardPage() {
  const { datasets, setDatasets, experiments, setExperiments, activeDatasetId } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tracesAPI.list(), experimentsAPI.list()])
      .then(([td, ed]) => {
        setDatasets(td.datasets);
        setExperiments(ed.experiments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTraces = datasets.reduce((s, d) => s + d.shape.num_traces, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Dashboard" />

      <div style={{ flex: 1, padding: "28px 28px", overflowY: "auto" }} className="bg-grid">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)",
              animation: "pulse-glow 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, color: "var(--cyan)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Research Platform Active
            </span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            CipherScope <span style={{ color: "var(--cyan)", textShadow: "0 0 12px rgba(0,245,255,0.5)" }}>XAI</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 540 }}>
            Modern side-channel analysis and leakage mitigation platform.
            Generate synthetic traces, run CPA attacks, and evaluate masking effectiveness.
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard icon={<Database size={16} />} label="Datasets" value={datasets.length} sub="Synthetic traces" accent="var(--cyan)" delay={0.05} />
          <StatCard icon={<Activity size={16} />} label="Total Traces" value={loading ? "—" : totalTraces.toLocaleString()} sub="Power samples" accent="var(--violet-bright)" delay={0.1} />
          <StatCard icon={<Shield size={16} />} label="Experiments" value={experiments.length} sub="Saved sessions" accent="var(--emerald)" delay={0.15} />
          <StatCard icon={<TrendingUp size={16} />} label="Active Dataset" value={activeDatasetId ?? "None"} sub="Selected for analysis" accent="var(--amber)" delay={0.2} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass"
            style={{ padding: 20 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} color="var(--cyan)" /> Quick Actions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickLinks.map(({ href, icon, label, desc, color }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                    textDecoration: "none", transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = color;
                    (e.currentTarget as HTMLElement).style.background = `${color}10`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ color, opacity: 0.9 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} color="var(--text-muted)" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Datasets */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="glass"
            style={{ padding: 20 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={14} color="var(--violet-bright)" /> Recent Datasets
            </div>
            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
            ) : datasets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Database size={28} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No datasets yet.</div>
                <Link href="/generator">
                  <button className="btn-cyan" style={{ marginTop: 12, fontSize: 12 }}>Generate First Dataset</button>
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {datasets.slice(-5).reverse().map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: "var(--radius-md)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)" }}>{d.id}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {d.shape.num_traces} × {d.shape.trace_length}
                      {d.config.masked && <span className="badge badge-violet" style={{ marginLeft: 6 }}>masked</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
