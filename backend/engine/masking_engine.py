"""
Masking simulation engine.
Generates masked vs unmasked trace pairs and computes leakage reduction metrics.
"""

import numpy as np
from .aes_utils import sbox_lookup_batch, hamming_weight_batch
from .cpa_engine import run_cpa, compute_hypotheses, _pearson_matrix


def generate_masked_pair(
    plaintexts: np.ndarray,
    key_bytes: np.ndarray,
    trace_length: int = 200,
    noise_level: float = 1.0,
    leakage_intensity: float = 0.8,
    masking_strength: float = 0.9,
    seed: int = 42,
) -> tuple:
    """
    Generate (unmasked_traces, masked_traces) pair for the same plaintexts/key.
    Returns (unmasked, masked) numpy arrays of shape (N, T).
    """
    rng = np.random.default_rng(seed)
    N = len(plaintexts)
    T = trace_length

    unmasked = rng.normal(0.0, noise_level, (N, T)).astype(np.float32)
    masked = rng.normal(0.0, noise_level, (N, T)).astype(np.float32)

    for byte_idx in range(16):
        t_leak = 10 + byte_idx * 8
        if t_leak >= T:
            break

        xored = plaintexts[:, byte_idx] ^ key_bytes[byte_idx]
        sbox_out = sbox_lookup_batch(xored)
        hw = hamming_weight_batch(sbox_out).astype(np.float32)

        # Unmasked: direct leakage
        unmasked[:, t_leak] += hw * leakage_intensity

        # Masked: leakage through combined share — reduced correlation
        masks = rng.integers(0, 256, size=N, dtype=np.uint8)
        masked_out = sbox_out ^ masks
        hw_masked = hamming_weight_batch(masked_out).astype(np.float32)
        effective = leakage_intensity * (1.0 - masking_strength)
        masked[:, t_leak] += hw_masked * effective

    return unmasked, masked


def compare_masking(
    unmasked_traces: np.ndarray,
    masked_traces: np.ndarray,
    plaintexts: np.ndarray,
    byte_idx: int = 0,
) -> dict:
    """
    Run CPA on both trace sets for one byte and compare peak correlations.
    """
    H = compute_hypotheses(plaintexts, byte_idx)

    corr_unmasked = np.abs(_pearson_matrix(H, unmasked_traces))
    corr_masked = np.abs(_pearson_matrix(H, masked_traces))

    scores_unmasked = corr_unmasked.max(axis=1)
    scores_masked = corr_masked.max(axis=1)

    best_unmasked = int(np.argmax(scores_unmasked))
    best_masked = int(np.argmax(scores_masked))

    peak_unmasked = float(scores_unmasked[best_unmasked])
    peak_masked = float(scores_masked[best_masked])

    reduction_pct = (1.0 - peak_masked / (peak_unmasked + 1e-12)) * 100.0

    return {
        "byte_idx": byte_idx,
        "unmasked": {
            "best_key": best_unmasked,
            "peak_correlation": round(peak_unmasked, 4),
            "scores": scores_unmasked.tolist(),
            "corr_best_row": corr_unmasked[best_unmasked].tolist(),
        },
        "masked": {
            "best_key": best_masked,
            "peak_correlation": round(peak_masked, 4),
            "scores": scores_masked.tolist(),
            "corr_best_row": corr_masked[best_masked].tolist(),
        },
        "leakage_reduction_pct": round(reduction_pct, 2),
        "attack_success_unmasked": best_unmasked,
        "attack_success_masked": best_masked,
    }
