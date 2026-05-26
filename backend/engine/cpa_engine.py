"""
Vectorised CPA (Correlation Power Analysis) engine.
Uses NumPy broadcasting for fast correlation — no per-sample scipy loops.
"""

import numpy as np
from typing import Generator
from .aes_utils import sbox_lookup_batch, hamming_weight_batch


def _pearson_matrix(X: np.ndarray, Y: np.ndarray) -> np.ndarray:
    """
    Compute Pearson correlation between each row of X (shape K×N)
    and each column of Y (shape N×T).
    Returns corr matrix of shape (K, T).
    """
    N = X.shape[1]
    X_c = X - X.mean(axis=1, keepdims=True)
    Y_c = Y - Y.mean(axis=0, keepdims=True)

    num = X_c @ Y_c          # (K, T)
    X_std = np.sqrt((X_c ** 2).sum(axis=1, keepdims=True))  # (K, 1)
    Y_std = np.sqrt((Y_c ** 2).sum(axis=0, keepdims=True))  # (1, T)
    denom = X_std * Y_std + 1e-12

    return num / denom        # (K, T)


def compute_hypotheses(plaintexts: np.ndarray, byte_idx: int) -> np.ndarray:
    """
    For all 256 key guesses, compute Hamming Weight of SBox(pt[byte_idx] XOR k).
    Returns shape (256, N).
    """
    pt_col = plaintexts[:, byte_idx].astype(np.uint8)    # (N,)
    H = np.zeros((256, len(pt_col)), dtype=np.float32)
    for k in range(256):
        xored = pt_col ^ np.uint8(k)
        sbox_out = sbox_lookup_batch(xored)
        H[k] = hamming_weight_batch(sbox_out)
    return H


def run_cpa(
    traces: np.ndarray,
    plaintexts: np.ndarray,
    byte_indices: list = None,
) -> dict:
    """
    Run CPA for all (or selected) key bytes.
    Returns full results dict with corr_matrix, scores, and recovered key.
    """
    if byte_indices is None:
        byte_indices = list(range(16))

    results = {}
    for byte_idx in byte_indices:
        H = compute_hypotheses(plaintexts, byte_idx)   # (256, N)
        corr = _pearson_matrix(H, traces)              # (256, T)
        abs_corr = np.abs(corr)
        scores = abs_corr.max(axis=1)                  # (256,)
        best_key = int(np.argmax(scores))
        confidence = float(scores[best_key])

        results[byte_idx] = {
            "best_key": best_key,
            "best_key_hex": hex(best_key),
            "confidence": round(confidence, 4),
            "scores": scores.tolist(),
            "corr_matrix": abs_corr.tolist(),          # 256 × T — may be large
        }

    return results


def run_cpa_streaming(
    traces: np.ndarray,
    plaintexts: np.ndarray,
    key_bytes: np.ndarray = None,
) -> Generator[dict, None, None]:
    """
    Generator that yields per-byte CPA results one at a time.
    Used by the WebSocket router to stream progress.
    If key_bytes is provided, includes verification info.
    """
    recovered = []
    match_status = []
    for byte_idx in range(16):
        H = compute_hypotheses(plaintexts, byte_idx)
        corr = _pearson_matrix(H, traces)
        abs_corr = np.abs(corr)
        scores = abs_corr.max(axis=1)
        best_key = int(np.argmax(scores))
        confidence = float(scores[best_key])
        recovered.append(best_key)

        event = {
            "byte_idx": byte_idx,
            "best_key": best_key,
            "best_key_hex": hex(best_key),
            "confidence": round(confidence, 4),
            "scores": scores.tolist(),
            # Send compressed heatmap: only top-10 rows + best row
            "corr_heatmap_best": abs_corr[best_key].tolist(),
            "recovered_so_far": list(recovered),
            "done": byte_idx == 15,
        }

        # Add key verification if original key available
        if key_bytes is not None:
            correct_key = int(key_bytes[byte_idx])
            is_match = best_key == correct_key
            match_status.append(is_match)
            event["correct_key"] = correct_key
            event["correct_key_hex"] = hex(correct_key)
            event["is_match"] = is_match
            event["match_count_so_far"] = sum(match_status)

            if byte_idx == 15:
                # Final event — include full verification summary
                original_key = key_bytes.tolist()
                event["original_key"] = original_key
                event["original_key_hex"] = [hex(b) for b in original_key]
                event["byte_match"] = match_status
                event["full_match"] = all(match_status)
                event["match_count"] = sum(match_status)
                # Text representations
                event["recovered_key_text"] = "".join(
                    chr(b) if 32 <= b < 127 else "." for b in recovered
                )
                event["original_key_text"] = "".join(
                    chr(b) if 32 <= b < 127 else "." for b in original_key
                )

        yield event
