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


def compare_masking_full_key(
    plaintexts: np.ndarray,
    key_bytes: np.ndarray,
    trace_length: int = 200,
    noise_level: float = 1.0,
    leakage_intensity: float = 0.8,
    masking_strength: float = 0.9,
    seed: int = 42,
) -> dict:
    """
    Full-key masking comparison: run complete CPA on both masked and unmasked
    traces across all 16 bytes. Returns per-byte and aggregate statistics.
    """
    # Generate paired datasets
    unmasked, masked = generate_masked_pair(
        plaintexts=plaintexts,
        key_bytes=key_bytes,
        trace_length=trace_length,
        noise_level=noise_level,
        leakage_intensity=leakage_intensity,
        masking_strength=masking_strength,
        seed=seed,
    )

    # Run CPA on both
    results_unmasked = run_cpa(unmasked, plaintexts)
    results_masked = run_cpa(masked, plaintexts)

    # Build per-byte comparison
    per_byte = []
    unmasked_correct = 0
    masked_correct = 0
    total_reduction = 0.0

    for byte_idx in range(16):
        actual_key = int(key_bytes[byte_idx])
        u = results_unmasked[byte_idx]
        m = results_masked[byte_idx]

        u_correct = u["best_key"] == actual_key
        m_correct = m["best_key"] == actual_key
        if u_correct:
            unmasked_correct += 1
        if m_correct:
            masked_correct += 1

        u_peak = u["confidence"]
        m_peak = m["confidence"]
        reduction = (1.0 - m_peak / (u_peak + 1e-12)) * 100.0
        total_reduction += reduction

        per_byte.append({
            "byte_idx": byte_idx,
            "actual_key": actual_key,
            "actual_key_hex": hex(actual_key),
            "unmasked_recovered": u["best_key"],
            "unmasked_recovered_hex": u["best_key_hex"],
            "unmasked_correct": u_correct,
            "unmasked_peak_corr": round(u_peak, 4),
            "masked_recovered": m["best_key"],
            "masked_recovered_hex": m["best_key_hex"],
            "masked_correct": m_correct,
            "masked_peak_corr": round(m_peak, 4),
            "correlation_reduction_pct": round(reduction, 2),
        })

    avg_u_corr = np.mean([b["unmasked_peak_corr"] for b in per_byte])
    avg_m_corr = np.mean([b["masked_peak_corr"] for b in per_byte])
    avg_reduction = total_reduction / 16.0

    # Attack complexity rating
    if masked_correct <= 2:
        complexity_rating = "Very High — masking is highly effective"
    elif masked_correct <= 6:
        complexity_rating = "High — masking significantly reduces recovery"
    elif masked_correct <= 12:
        complexity_rating = "Moderate — partial masking effect"
    else:
        complexity_rating = "Low — masking ineffective at this strength"

    return {
        "per_byte": per_byte,
        "summary": {
            "unmasked_recovery_rate": f"{unmasked_correct}/16",
            "unmasked_recovered_count": unmasked_correct,
            "masked_recovery_rate": f"{masked_correct}/16",
            "masked_recovered_count": masked_correct,
            "avg_correlation_unmasked": round(float(avg_u_corr), 4),
            "avg_correlation_masked": round(float(avg_m_corr), 4),
            "avg_leakage_reduction_pct": round(avg_reduction, 2),
            "complexity_rating": complexity_rating,
            "masking_strength": masking_strength,
            "noise_level": noise_level,
            "leakage_intensity": leakage_intensity,
        },
        "original_key": key_bytes.tolist(),
        "original_key_hex": "".join(f"{b:02x}" for b in key_bytes),
        "unmasked_recovered_key": [b["unmasked_recovered"] for b in per_byte],
        "masked_recovered_key": [b["masked_recovered"] for b in per_byte],
    }

