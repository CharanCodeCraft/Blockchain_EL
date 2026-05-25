"use client";

import { useAppStore } from "@/lib/store";
import { Activity, Database, Wifi } from "lucide-react";

export default function Topbar({ title }: { title: string }) {
  const { activeDatasetId } = useAppStore();

  return (
    <header style={{
      height: 56,
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(5,8,17,0.9)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 30,
    }}>
      <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Dataset indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
          <Database size={13} />
          {activeDatasetId
            ? <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>{activeDatasetId}</span>
            : <span>No dataset</span>
          }
        </div>

        {/* Backend status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--emerald)",
            boxShadow: "0 0 6px var(--emerald)",
            animation: "pulse-glow 2s ease-in-out infinite"
          }} />
          <span style={{ color: "var(--text-secondary)" }}>Backend</span>
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--cyan)" }}>
          <Activity size={13} />
          <span>Live</span>
        </div>
      </div>
    </header>
  );
}
