import { create } from "zustand";
import type { DatasetMeta, CPAFullResult, TVLAResult, SNRResult, MaskingCompareResult, ExperimentSummary } from "./api";

interface AppState {
  // Active dataset
  activeDatasetId: string | null;
  datasets: DatasetMeta[];
  setActiveDataset: (id: string | null) => void;
  setDatasets: (d: DatasetMeta[]) => void;
  addDataset: (d: DatasetMeta) => void;

  // CPA
  cpaResult: CPAFullResult | null;
  cpaStreaming: boolean;
  cpaProgress: number; // 0..16
  setCpaResult: (r: CPAFullResult | null) => void;
  setCpaStreaming: (v: boolean) => void;
  setCpaProgress: (n: number) => void;

  // Leakage
  tvlaResult: TVLAResult | null;
  snrResult: SNRResult | null;
  setTvlaResult: (r: TVLAResult | null) => void;
  setSnrResult: (r: SNRResult | null) => void;

  // Masking
  maskingResult: MaskingCompareResult | null;
  setMaskingResult: (r: MaskingCompareResult | null) => void;

  // Experiments
  experiments: ExperimentSummary[];
  setExperiments: (e: ExperimentSummary[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDatasetId: null,
  datasets: [],
  setActiveDataset: (id) => set({ activeDatasetId: id }),
  setDatasets: (datasets) => set({ datasets }),
  addDataset: (d) => set((s) => ({ datasets: [...s.datasets, d] })),

  cpaResult: null,
  cpaStreaming: false,
  cpaProgress: 0,
  setCpaResult: (cpaResult) => set({ cpaResult }),
  setCpaStreaming: (cpaStreaming) => set({ cpaStreaming }),
  setCpaProgress: (cpaProgress) => set({ cpaProgress }),

  tvlaResult: null,
  snrResult: null,
  setTvlaResult: (tvlaResult) => set({ tvlaResult }),
  setSnrResult: (snrResult) => set({ snrResult }),

  maskingResult: null,
  setMaskingResult: (maskingResult) => set({ maskingResult }),

  experiments: [],
  setExperiments: (experiments) => set({ experiments }),
}));
