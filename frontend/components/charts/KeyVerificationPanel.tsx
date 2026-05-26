"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, Shield, ShieldCheck, ShieldX } from "lucide-react";

interface KeyVerificationPanelProps {
  originalKey: number[];
  recoveredKey: (number | null)[];
  byteMatch: boolean[];
  fullMatch: boolean;
  matchCount: number;
  originalKeyText?: string;
  recoveredKeyText?: string;
  streaming?: boolean;
}

function hexByte(v: number | null) {
  if (v === null) return "??";
  return v.toString(16).padStart(2, "0").toUpperCase();
}

export default function KeyVerificationPanel({
  originalKey,
  recoveredKey,
  byteMatch,
  fullMatch,
  matchCount,
  originalKeyText,
  recoveredKeyText,
  streaming = false,
}: KeyVerificationPanelProps) {
  const recoveredHex = recoveredKey.map((b) => (b !== null ? b.toString(16).padStart(2, "0") : "??")).join("");
  const originalHex = originalKey.map((b) => b.toString(16).padStart(2, "0")).join("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Attack Result Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          padding: "16px 20px",
          borderRadius: "var(--radius-lg)",
          background: fullMatch
            ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))"
            : "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.05))",
          border: `1px solid ${fullMatch ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {fullMatch ? (
          <ShieldCheck size={28} color="var(--emerald)" />
        ) : (
          <ShieldX size={28} color="var(--rose)" />
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: fullMatch ? "var(--emerald)" : "var(--rose)" }}>
            {streaming
              ? `Recovering key… ${matchCount}/${recoveredKey.filter((b) => b !== null).length} bytes match`
              : fullMatch
              ? "✓ Full Key Recovered — Attack Successful"
              : `✗ Partial Recovery — ${matchCount}/16 bytes match`}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {fullMatch
              ? "CPA successfully recovered all 16 bytes of the AES-128 secret key."
              : `CPA recovered ${matchCount} of 16 key bytes correctly.`}
          </div>
        </div>
      </motion.div>

      {/* Byte-by-byte comparison grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Original row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Original
          </div>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {originalKey.map((b, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 6,
                  background: "var(--bg-elevated)",
                  border: `1px solid ${byteMatch[i] ? "rgba(16,185,129,0.4)" : "var(--border-subtle)"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {hexByte(b)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match indicator row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 80 }} />
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {byteMatch.map((match, i) => (
              <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                {recoveredKey[i] !== null ? (
                  match ? (
                    <CheckCircle size={12} color="var(--emerald)" />
                  ) : (
                    <XCircle size={12} color="var(--rose)" />
                  )
                ) : (
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border-subtle)" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recovered row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Recovered
          </div>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {recoveredKey.map((b, i) => {
              const match = byteMatch[i];
              const ready = b !== null;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 6,
                    background: ready
                      ? match
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(244,63,94,0.12)"
                      : "var(--bg-elevated)",
                    border: `1px solid ${ready ? (match ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)") : "var(--border-subtle)"}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 250ms",
                    boxShadow: ready
                      ? match
                        ? "0 0 8px rgba(16,185,129,0.2)"
                        : "0 0 8px rgba(244,63,94,0.2)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: ready ? (match ? "var(--emerald)" : "var(--rose)") : "var(--text-muted)",
                    }}
                  >
                    {hexByte(b)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full hex and text key display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Hex */}
        <div style={{
          background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)", padding: "12px 14px",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Original Key (hex)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", wordBreak: "break-all" }}>
            {originalHex}
          </div>
          {originalKeyText && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              text: &quot;{originalKeyText}&quot;
            </div>
          )}
        </div>
        <div style={{
          background: "var(--bg-elevated)", border: `1px solid ${fullMatch ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          borderRadius: "var(--radius-md)", padding: "12px 14px",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Recovered Key (hex)
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all",
            color: fullMatch ? "var(--emerald)" : "var(--rose)",
          }}>
            {recoveredHex}
          </div>
          {recoveredKeyText && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              text: &quot;{recoveredKeyText}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
