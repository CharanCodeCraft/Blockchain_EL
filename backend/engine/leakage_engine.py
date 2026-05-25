"""
Leakage analysis engine: TVLA (Welch's t-test) and SNR analysis.
"""

import numpy as np
from scipy import stats


def run_tvla(traces: np.ndarray, plaintexts: np.ndarray, byte_idx: int = 0) -> dict:
    """
    Fixed-vs-Random TVLA using Welch's t-test.

    Strategy: split traces into 'fixed' (where pt[byte_idx] == 0x00)
    and 'random' (all others). Compute t-statistic per time sample.
    """
    fixed_mask = plaintexts[:, byte_idx] == 0x00
    random_mask = ~fixed_mask

    fixed_traces = traces[fixed_mask]
    random_traces = traces[random_mask]

    if len(fixed_traces) < 10:
        # Not enough fixed — use random split instead
        split = len(traces) // 2
        fixed_traces = traces[:split]
        random_traces = traces[split:]

    T = traces.shape[1]
    t_scores = np.zeros(T, dtype=np.float32)
    p_values = np.zeros(T, dtype=np.float32)

    for t in range(T):
        t_stat, p_val = stats.ttest_ind(
            fixed_traces[:, t],
            random_traces[:, t],
            equal_var=False,
        )
        t_scores[t] = float(t_stat)
        p_values[t] = float(p_val)

    threshold = 4.5
    leakage_points = np.where(np.abs(t_scores) > threshold)[0].tolist()

    return {
        "t_scores": t_scores.tolist(),
        "p_values": p_values.tolist(),
        "threshold": threshold,
        "leakage_points": leakage_points,
        "num_fixed": int(len(fixed_traces)),
        "num_random": int(len(random_traces)),
        "max_t": float(np.max(np.abs(t_scores))),
    }


def run_snr(traces: np.ndarray, plaintexts: np.ndarray, byte_idx: int = 0) -> dict:
    """
    Signal-to-Noise Ratio analysis.
    SNR(t) = Var(signal at t) / Var(noise at t).
    Signal = class-conditional mean variation; noise = within-class variance.
    """
    T = traces.shape[1]
    # Group by Hamming Weight of pt[byte_idx] (0..8)
    hw_vals = np.array([bin(int(b)).count("1") for b in plaintexts[:, byte_idx]])

    unique_hws = np.unique(hw_vals)
    class_means = np.zeros((len(unique_hws), T), dtype=np.float32)
    class_vars = np.zeros((len(unique_hws), T), dtype=np.float32)

    for i, hw in enumerate(unique_hws):
        subset = traces[hw_vals == hw]
        class_means[i] = subset.mean(axis=0)
        class_vars[i] = subset.var(axis=0)

    signal_var = class_means.var(axis=0)         # variance of class means
    noise_var = class_vars.mean(axis=0) + 1e-12  # mean within-class variance
    snr = (signal_var / noise_var).astype(np.float32)

    hotspot_threshold = float(np.percentile(snr, 90))
    hotspots = np.where(snr >= hotspot_threshold)[0].tolist()

    return {
        "snr": snr.tolist(),
        "hotspots": hotspots,
        "hotspot_threshold": round(hotspot_threshold, 6),
        "max_snr": round(float(snr.max()), 6),
        "mean_snr": round(float(snr.mean()), 6),
    }
