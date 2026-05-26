"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, AudioWaveform, Shield, FlaskConical,
  Layers, Cpu, BookOpen, Settings, ChevronLeft, ChevronRight, Zap, HardDrive
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/generator", icon: Cpu, label: "Synthetic Generator" },
  { href: "/import", icon: HardDrive, label: "Import Dataset" },
  { href: "/trace-studio", icon: AudioWaveform, label: "Trace Studio" },
  { href: "/cpa-studio", icon: Shield, label: "CPA Studio" },
  { href: "/leakage-lab", icon: FlaskConical, label: "Leakage Lab" },
  { href: "/masking-studio", icon: Layers, label: "Masking Studio" },
  { href: "/experiments", icon: BookOpen, label: "Experiments" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 60 : 220,
        minHeight: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width 250ms cubic-bezier(0.4,0,0.2,1)",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? "20px 0" : "20px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, var(--violet), var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Zap size={16} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              CipherScope
            </div>
            <div style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 600, letterSpacing: "0.08em" }}>XAI</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                borderRadius: "var(--radius-md)",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "var(--violet-muted)" : "transparent",
                border: `1px solid ${active ? "rgba(124,58,237,0.3)" : "transparent"}`,
                color: active ? "var(--violet-bright)" : "var(--text-secondary)",
                transition: "all var(--transition-fast)",
                textDecoration: "none",
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          margin: "8px",
          padding: "8px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--transition-fast)",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
