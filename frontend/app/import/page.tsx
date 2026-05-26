"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/layout/Topbar";
import { useAppStore } from "@/lib/store";
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2, Info, X, HardDrive } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FileState {
  file: File | null;
  name: string;
}

export default function ImportPage() {
  const { addDataset, setActiveDataset } = useAppStore();
  const [traces, setTraces] = useState<FileState>({ file: null, name: "" });
  const [plaintexts, setPlaintexts] = useState<FileState>({ file: null, name: "" });
  const [key, setKey] = useState<FileState>({ file: null, name: "" });
  const [datasetName, setDatasetName] = useState("Imported Dataset");
  const [description, setDescription] = useState("");
  const [hardwareInfo, setHardwareInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; num_traces: number; trace_length: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const tracesRef = useRef<HTMLInputElement>(null);
  const plaintextsRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!traces.file || !plaintexts.file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("traces", traces.file);
    formData.append("plaintexts", plaintexts.file);
    if (key.file) formData.append("key", key.file);
    formData.append("name", datasetName);
    formData.append("description", description);
    formData.append("hardware_info", hardwareInfo);

    try {
      const res = await fetch(`${BASE_URL}/api/datasets/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Import failed");
      }
      const data = await res.json();
      setResult({
        id: data.dataset.id,
        num_traces: data.dataset.shape.num_traces,
        trace_length: data.dataset.shape.trace_length,
      });
      addDataset(data.dataset);
      setActiveDataset(data.dataset.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".npy"));
    for (const f of files) {
      const name = f.name.toLowerCase();
      if (name.includes("trace")) setTraces({ file: f, name: f.name });
      else if (name.includes("plaintext") || name.includes("plain") || name.includes("pt")) setPlaintexts({ file: f, name: f.name });
      else if (name.includes("key")) setKey({ file: f, name: f.name });
    }
  }, []);

  const canUpload = traces.file && plaintexts.file && datasetName.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Topbar title="Import Dataset" />

      <div style={{ flex: 1, padding: "28px", overflowY: "auto" }} className="bg-grid">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <HardDrive size={18} color="var(--amber)" />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Import Real Dataset</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Upload real hardware side-channel traces from ChipWhisperer, ASCAD, or other capture platforms.
              Imported datasets integrate with all analysis workflows.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
            {/* Left — Upload area */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--cyan)" : "var(--border-default)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "32px 20px",
                    textAlign: "center",
                    background: dragOver ? "rgba(0,245,255,0.05)" : "var(--bg-elevated)",
                    transition: "all 200ms",
                  }}
                >
                  <Upload size={28} color={dragOver ? "var(--cyan)" : "var(--text-muted)"} style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Drag & drop <span style={{ color: "var(--cyan)" }}>.npy</span> files here
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Files are auto-assigned based on name (traces, plaintexts, key)
                  </div>
                </div>

                {/* File selectors */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="section-title">Required Files</div>

                  {/* Traces */}
                  <FileRow
                    label="Traces"
                    hint="N×T float array (.npy)"
                    file={traces}
                    required
                    inputRef={tracesRef}
                    onSelect={(f) => setTraces({ file: f, name: f.name })}
                    onClear={() => setTraces({ file: null, name: "" })}
                  />

                  {/* Plaintexts */}
                  <FileRow
                    label="Plaintexts"
                    hint="N×16 uint8 array (.npy)"
                    file={plaintexts}
                    required
                    inputRef={plaintextsRef}
                    onSelect={(f) => setPlaintexts({ file: f, name: f.name })}
                    onClear={() => setPlaintexts({ file: null, name: "" })}
                  />

                  <div className="section-title" style={{ marginTop: 4 }}>Optional</div>

                  {/* Key */}
                  <FileRow
                    label="Known Key"
                    hint="16-byte uint8 array (.npy)"
                    file={key}
                    inputRef={keyRef}
                    onSelect={(f) => setKey({ file: f, name: f.name })}
                    onClear={() => setKey({ file: null, name: "" })}
                  />
                </div>

                <div className="accent-line" />

                {/* Metadata */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="section-title">Dataset Metadata</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dataset Name *</label>
                    <input className="input" value={datasetName} onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="My ChipWhisperer Traces" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Description</label>
                    <input className="input" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="AES-128 traces captured from STM32 target" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Hardware Info</label>
                    <input className="input" value={hardwareInfo} onChange={(e) => setHardwareInfo(e.target.value)}
                      placeholder="ChipWhisperer CW308T-STM32F / 1MS/s" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — Summary + Upload button */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* File summary */}
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>Upload Summary</div>
                {[
                  ["Traces", traces.name || "—", !!traces.file],
                  ["Plaintexts", plaintexts.name || "—", !!plaintexts.file],
                  ["Key", key.name || "(optional)", !!key.file],
                  ["Name", datasetName, datasetName.trim().length > 0],
                ].map(([label, value, ok]) => (
                  <div key={String(label)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0", borderBottom: "1px solid var(--border-subtle)",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label as string}</span>
                    <span style={{
                      fontSize: 11, fontFamily: "var(--font-mono)",
                      color: ok ? "var(--emerald)" : "var(--text-muted)",
                      maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>

              {/* Info box */}
              <div style={{
                background: "var(--cyan-muted)", border: "1px solid rgba(0,245,255,0.2)",
                borderRadius: "var(--radius-md)", padding: 12, display: "flex", gap: 8,
              }}>
                <Info size={13} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Imported datasets are compatible with CPA, TVLA, SNR, and masking analysis.
                  Max file size: 100 MB per file.
                </div>
              </div>

              {/* Upload button */}
              <button
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}
                onClick={handleUpload}
                disabled={loading || !canUpload}
              >
                {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <FileUp size={15} />}
                {loading ? "Importing…" : "Import Dataset"}
              </button>

              {/* Success */}
              {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ background: "var(--emerald-muted)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-md)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <CheckCircle size={14} color="var(--emerald)" />
                    <span style={{ fontSize: 13, color: "var(--emerald)", fontWeight: 600 }}>Dataset Imported</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    ID: <span style={{ color: "var(--cyan)" }}>{result.id}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {result.num_traces} traces × {result.trace_length} samples
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    ✓ Set as active dataset — ready for analysis
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: "var(--rose-muted)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", gap: 8 }}>
                  <AlertCircle size={14} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: "var(--rose)" }}>{error}</div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── File row helper ──────────────────────────────────────── */
function FileRow({
  label, hint, file, required, inputRef, onSelect, onClear,
}: {
  label: string;
  hint: string;
  file: FileState;
  required?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: "var(--radius-md)",
      background: "var(--bg-elevated)", border: `1px solid ${file.file ? "rgba(16,185,129,0.3)" : "var(--border-subtle)"}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
          {label} {required && <span style={{ color: "var(--rose)" }}>*</span>}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{hint}</div>
        {file.name && (
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--emerald)", marginTop: 3 }}>
            {file.name}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".npy"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
      />
      {file.file ? (
        <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={onClear}>
          <X size={12} />
        </button>
      ) : (
        <button className="btn-cyan" style={{ padding: "6px 10px", fontSize: 11 }}
          onClick={() => inputRef.current?.click()}>
          Browse
        </button>
      )}
    </div>
  );
}
