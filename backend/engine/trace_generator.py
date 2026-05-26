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
    key_hex: Optional[str] = None   # 32-char hex string, e.g. "2b7e151628aed2a6abf7158809cf4f3c"
    seed: Optional[int] = None


def _pad_key(key_string: str) -> np.ndarray:
    key_bytes = [ord(c) for c in key_string]
    return np.array((key_bytes + [0] * 16)[:16], dtype=np.uint8)


def _parse_key_hex(hex_str: str) -> np.ndarray:
    """Parse a 32-character hex string into a 16-byte numpy array."""
    hex_str = hex_str.strip().lower()
    if len(hex_str) != 32:
        raise ValueError(f"key_hex must be exactly 32 hex characters, got {len(hex_str)}")
    try:
        key_bytes = bytes.fromhex(hex_str)
    except ValueError:
        raise ValueError("key_hex contains invalid hex characters")
    return np.array(list(key_bytes), dtype=np.uint8)


def generate_traces(config: TraceConfig) -> dict:
    """Generate a synthetic dataset and save to disk. Returns metadata dict."""
    if config.seed is not None:
        rng = np.random.default_rng(config.seed)
    else:
        rng = np.random.default_rng()

    # Use key_hex if provided, otherwise fall back to key_string
    if config.key_hex:
        key_bytes = _parse_key_hex(config.key_hex)
    else:
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

    # Build the key_hex for metadata (always store hex representation)
    stored_key_hex = config.key_hex if config.key_hex else "".join(f"{b:02x}" for b in key_bytes)

    meta = {
        "id": dataset_id,
        "config": {**asdict(config), "key_hex": stored_key_hex},
        "key_hex": stored_key_hex,
        "shape": {"num_traces": N, "trace_length": T},
        "source": "synthetic",
    }
    with open(os.path.join(dataset_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return meta


def load_dataset(dataset_id: str) -> tuple:
    """Load traces, plaintexts, and key_bytes for a given dataset id.
    Searches both synthetic and imported dataset directories.
    """
    imported_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "imported_traces")

    # Search in both directories
    for base_dir in [DATA_DIR, imported_dir]:
        dataset_dir = os.path.join(base_dir, dataset_id)
        if os.path.exists(dataset_dir):
            traces = np.load(os.path.join(dataset_dir, "traces.npy"))
            plaintexts = np.load(os.path.join(dataset_dir, "plaintexts.npy"))
            key_path = os.path.join(dataset_dir, "key_bytes.npy")
            if os.path.exists(key_path):
                key_bytes = np.load(key_path)
            else:
                # Imported datasets may not have a known key
                key_bytes = np.zeros(16, dtype=np.uint8)
            return traces, plaintexts, key_bytes

    raise FileNotFoundError(f"Dataset {dataset_id} not found")


def list_datasets() -> list:
    """Return metadata for all saved datasets (synthetic + imported)."""
    imported_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "imported_traces")
    result = []

    for base_dir in [DATA_DIR, imported_dir]:
        if not os.path.exists(base_dir):
            continue
        for name in os.listdir(base_dir):
            meta_path = os.path.join(base_dir, name, "meta.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    data = json.load(f)
                    # Ensure source field exists
                    if "source" not in data:
                        data["source"] = "synthetic"
                    result.append(data)

    return sorted(result, key=lambda x: x["id"])

