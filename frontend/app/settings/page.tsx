"use client";

import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { Settings, Server, Monitor, Cpu, Info } from "lucide-react";

interface SettingItem {
  label: string;
  value: string | number;
  hint?: string;
}

interface SettingSection {
  section: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

const settings: SettingSection[] = [
  {
    section: "API Configuration",
    icon: <Server size={14} color="var(--cyan)" />,
    items: [
      { label: "Backend URL", value: "http://localhost:8000", hint: "Set NEXT_PUBLIC_API_URL env var to override" },
      { label: "WebSocket URL", value: "ws://localhost:8000", hint: "Set NEXT_PUBLIC_WS_URL env var to override" },
    ],
  },
  {
    section: "Platform",
    icon: <Cpu size={14} color="var(--violet-bright)" />,
    items: [
      { label: "Version", value: "1.0.0 MVP" },
      { label: "Mode", value: "Synthetic Data — Research Platform" },
      { label: "Hardware Integration", value: "Optional (disabled)" },
    ],
  },
  {
    section: "Interface",
    icon: <Monitor size={14} color="var(--emerald)" />,
    items: [
      { label: "Theme", value: "Dark (Neon)" },
      { label: "Visualization", value: "Apache ECharts" },
      { label: "Animation", value: "Framer Motion" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Settings" />
      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
          <Settings size={18} color="var(--cyan)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>System Configuration</h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
          {settings.map(({ section, icon, items }, si) => (
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }} className="glass" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                {icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{section}</span>
              </div>
              <div className="accent-line" style={{ marginBottom: 16 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map(({ label, value, hint }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</div>
                      {hint && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Info size={10} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* About */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,245,255,0.05))",
              border: "1px solid rgba(124,58,237,0.3)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>About CipherScope XAI</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              A modern interactive side-channel analysis and leakage mitigation platform centered around
              synthetic AES-128 trace generation, CPA visualization, TVLA/SNR leakage evaluation,
              and masking-based countermeasure simulation. Built with Next.js 15, FastAPI, and Apache ECharts.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
