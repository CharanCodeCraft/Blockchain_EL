// API client for CipherScope XAI backend

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

// ── Traces ───────────────────────────────────────────────────
export const tracesAPI = {
  generate: (body: TraceGenerateRequest) =>
    request<{ success: boolean; dataset: DatasetMeta }>("/api/traces/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  list: () =>
    request<{ datasets: DatasetMeta[] }>("/api/traces/list"),

  meta: (id: string) =>
    request<DatasetMeta>(`/api/traces/${id}/meta`),

  waveform: (id: string, maxTraces = 50, downsample = 1) =>
    request<WaveformData>(`/api/traces/${id}/waveform?max_traces=${maxTraces}&downsample=${downsample}`),
};

// ── CPA ──────────────────────────────────────────────────────
export const cpaAPI = {
  run: (body: { dataset_id: string; byte_indices?: number[] }) =>
    request<CPAFullResult>("/api/cpa/run", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Leakage ──────────────────────────────────────────────────
export const leakageAPI = {
  tvla: (body: { dataset_id: string; byte_idx: number }) =>
    request<TVLAResult>("/api/leakage/tvla", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  snr: (body: { dataset_id: string; byte_idx: number }) =>
    request<SNRResult>("/api/leakage/snr", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Masking ──────────────────────────────────────────────────
export const maskingAPI = {
  compare: (body: MaskingRequest) =>
    request<MaskingCompareResult>("/api/masking/compare", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  waveformPair: (body: MaskingRequest, maxTraces = 20) =>
    request<MaskingWaveformPair>(`/api/masking/waveform-pair?max_traces=${maxTraces}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Experiments ──────────────────────────────────────────────
export const experimentsAPI = {
  save: (body: ExperimentSaveRequest) =>
    request<{ success: boolean; experiment_id: string; experiment: Experiment }>("/api/experiments/save", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  list: () =>
    request<{ experiments: ExperimentSummary[] }>("/api/experiments/list"),

  get: (id: string) =>
    request<Experiment>(`/api/experiments/${id}`),

  delete: (id: string) =>
    request<{ success: boolean; deleted_id: string }>(`/api/experiments/${id}`, { method: "DELETE" }),
};

// ── Types ─────────────────────────────────────────────────────
export interface TraceGenerateRequest {
  num_traces?: number;
  trace_length?: number;
  noise_level?: number;
  leakage_intensity?: number;
  masked?: boolean;
  masking_strength?: number;
  timing_jitter?: number;
  key_string?: string;
  seed?: number | null;
}

export interface DatasetMeta {
  id: string;
  config: TraceGenerateRequest;
  shape: { num_traces: number; trace_length: number };
}

export interface WaveformData {
  dataset_id: string;
  num_traces: number;
  trace_length: number;
  traces: number[][];
  x_axis: number[];
}

export interface CPAByteResult {
  best_key: number;
  best_key_hex: string;
  confidence: number;
  scores: number[];
  corr_matrix: number[][];
}

export interface CPAFullResult {
  dataset_id: string;
  recovered_key: number[];
  recovered_key_hex: string[];
  results: Record<string, CPAByteResult>;
}

export interface CPAStreamEvent {
  byte_idx: number;
  best_key: number;
  best_key_hex: string;
  confidence: number;
  scores: number[];
  corr_heatmap_best: number[];
  recovered_so_far: number[];
  done: boolean;
}

export interface TVLAResult {
  t_scores: number[];
  p_values: number[];
  threshold: number;
  leakage_points: number[];
  num_fixed: number;
  num_random: number;
  max_t: number;
}

export interface SNRResult {
  snr: number[];
  hotspots: number[];
  hotspot_threshold: number;
  max_snr: number;
  mean_snr: number;
}

export interface MaskingRequest {
  dataset_id: string;
  masking_strength?: number;
  noise_level?: number;
  leakage_intensity?: number;
  byte_idx?: number;
  seed?: number;
}

export interface MaskingByteData {
  best_key: number;
  peak_correlation: number;
  scores: number[];
  corr_best_row: number[];
}

export interface MaskingCompareResult {
  dataset_id: string;
  byte_idx: number;
  unmasked: MaskingByteData;
  masked: MaskingByteData;
  leakage_reduction_pct: number;
  attack_success_unmasked: number;
  attack_success_masked: number;
}

export interface MaskingWaveformPair {
  unmasked: number[][];
  masked: number[][];
  num_traces: number;
  trace_length: number;
}

export interface ExperimentSaveRequest {
  name: string;
  description?: string;
  dataset_id?: string;
  cpa_results?: unknown;
  tvla_results?: unknown;
  snr_results?: unknown;
  masking_results?: unknown;
  config?: unknown;
}

export interface ExperimentSummary {
  id: string;
  name: string;
  description: string;
  dataset_id?: string;
  created_at: string;
}

export interface Experiment extends ExperimentSummary {
  cpa_results?: unknown;
  tvla_results?: unknown;
  snr_results?: unknown;
  masking_results?: unknown;
  config?: unknown;
}
