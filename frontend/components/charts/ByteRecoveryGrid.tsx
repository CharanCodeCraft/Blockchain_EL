"use client";

interface ByteRecoveryGridProps {
  recoveredBytes: (number | null)[];  // 16 bytes, null = not yet recovered
  confidences?: number[];             // 0..1 per byte
  highlightByte?: number;
}

function hexByte(v: number | null) {
  if (v === null) return "??";
  return v.toString(16).padStart(2, "0").toUpperCase();
}

export default function ByteRecoveryGrid({ recoveredBytes, confidences = [], highlightByte }: ByteRecoveryGridProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Key display */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Array.from({ length: 16 }, (_, i) => {
          const val = recoveredBytes[i] ?? null;
          const conf = confidences[i] ?? 0;
          const isReady = val !== null;
          const isCurrent = highlightByte === i;

          return (
            <div
              key={i}
              style={{
                width: 44, height: 52,
                borderRadius: 8,
                background: isCurrent
                  ? "rgba(0,245,255,0.12)"
                  : isReady
                  ? "rgba(124,58,237,0.15)"
                  : "var(--bg-elevated)",
                border: `1px solid ${isCurrent ? "var(--cyan)" : isReady ? "rgba(124,58,237,0.4)" : "var(--border-subtle)"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                transition: "all 250ms",
                boxShadow: isCurrent ? "0 0 12px rgba(0,245,255,0.3)" : isReady ? "0 0 8px rgba(124,58,237,0.2)" : "none",
              }}
            >
              <div style={{
                fontSize: 10, color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}>b{i}</div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: isCurrent ? "var(--cyan)" : isReady ? "var(--violet-bright)" : "var(--text-muted)",
              }}>
                {hexByte(val)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence bars */}
      {confidences.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="section-title">Correlation Confidence</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 40 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const conf = confidences[i] ?? 0;
              return (
                <div
                  key={i}
                  title={`Byte ${i}: ${(conf * 100).toFixed(1)}%`}
                  style={{
                    flex: 1,
                    height: `${Math.max(conf * 100, 4)}%`,
                    minHeight: 3,
                    borderRadius: "3px 3px 0 0",
                    background: conf > 0.5
                      ? "linear-gradient(to top, var(--violet), var(--violet-bright))"
                      : "var(--border-default)",
                    transition: "height 400ms ease",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Hex string */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text-secondary)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "8px 12px",
        letterSpacing: "0.05em",
      }}>
        {Array.from({ length: 16 }, (_, i) => hexByte(recoveredBytes[i] ?? null)).join(" ")}
      </div>
    </div>
  );
}
