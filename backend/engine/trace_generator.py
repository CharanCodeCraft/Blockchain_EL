"""
Synthetic AES-128 side-channel trace generator.
Produces realistic power traces with configurable noise, leakage, and masking.
"""

import numpy as np
import uuid
import json
import os
from dataclasses import dataclass, asdict
from typing import Optional

from .aes_utils import sbox_lookup_batch, hamming_weight_batch

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_traces")


@dataclass
class TraceConfig:
    num_traces: int = 1000
    trace_length: int = 200
    noise_level: float = 1.0
    leakage_intensity: float = 0.8
    masked: bool = False
    masking_strength: float = 0.5
    timing_jitter: int = 2
    key_string: str = "protected"
    seed: Optional[int] = None


def _pad_key(key_string: str) -> np.ndarray:
    key_bytes = [ord(c) for c in key_string]
    return np.array((key_bytes + [0] * 16)[:16], dtype=np.uint8)


def generate_traces(config: TraceConfig) -> dict:
    """Generate a synthetic dataset and save to disk. Returns metadata dict."""
    if config.seed is not None:
        rng = np.random.default_rng(config.seed)
    else:
        rng = np.random.default_rng()

    key_bytes = _pad_key(config.key_string)
    N = config.num_traces
    T = config.trace_length

    # --- Plaintexts ---
    plaintexts = rng.integers(0, 256, size=(N, 16), dtype=np.uint8)

    # --- Base noise ---
    traces = rng.normal(0.0, config.noise_level, size=(N, T)).astype(np.float32)

    # --- Leakage injection ---
    for byte_idx in range(16):
        t_leak = 10 + byte_idx * 8  # leakage position per byte
        if t_leak >= T:
            break

        xored = plaintexts[:, byte_idx] ^ key_bytes[byte_idx]
        sbox_out = sbox_lookup_batch(xored)

        if config.masked:
            masks = rng.integers(0, 256, size=N, dtype=np.uint8)
            masked_out = sbox_out ^ masks
            hw_signal = hamming_weight_batch(masked_out).astype(np.float32)
            # Reduced leakage — masking suppresses correlation
            effective_leakage = config.leakage_intensity * (1.0 - config.masking_strength)
        else:
            hw_signal = hamming_weight_batch(sbox_out).astype(np.float32)
            effective_leakage = config.leakage_intensity

        # Inject at primary time point
        traces[:, t_leak] += hw_signal * effective_leakage

        # Timing jitter: spread leakage slightly
        for jitter in range(1, config.timing_jitter + 1):
            if t_leak + jitter < T:
                traces[:, t_leak + jitter] += hw_signal * effective_leakage * (0.3 / jitter)
            if t_leak - jitter >= 0:
                traces[:, t_leak - jitter] += hw_signal * effective_leakage * (0.2 / jitter)

    # --- Save dataset ---
    os.makedirs(DATA_DIR, exist_ok=True)
    dataset_id = str(uuid.uuid4())[:8]
    dataset_dir = os.path.join(DATA_DIR, dataset_id)
    os.makedirs(dataset_dir, exist_ok=True)

    np.save(os.path.join(dataset_dir, "traces.npy"), traces)
    np.save(os.path.join(dataset_dir, "plaintexts.npy"), plaintexts)
    np.save(os.path.join(dataset_dir, "key_bytes.npy"), key_bytes)

    meta = {
        "id": dataset_id,
        "config": asdict(config),
        "shape": {"num_traces": N, "trace_length": T},
    }
    with open(os.path.join(dataset_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return meta


def load_dataset(dataset_id: str) -> tuple:
    """Load traces, plaintexts, and key_bytes for a given dataset id."""
    dataset_dir = os.path.join(DATA_DIR, dataset_id)
    traces = np.load(os.path.join(dataset_dir, "traces.npy"))
    plaintexts = np.load(os.path.join(dataset_dir, "plaintexts.npy"))
    key_bytes = np.load(os.path.join(dataset_dir, "key_bytes.npy"))
    return traces, plaintexts, key_bytes


def list_datasets() -> list:
    """Return metadata for all saved synthetic datasets."""
    if not os.path.exists(DATA_DIR):
        return []
    result = []
    for name in os.listdir(DATA_DIR):
        meta_path = os.path.join(DATA_DIR, name, "meta.json")
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                result.append(json.load(f))
    return sorted(result, key=lambda x: x["id"])
