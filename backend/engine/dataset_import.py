"""
Dataset import engine — validate and register externally captured datasets.
Supports importing real hardware side-channel trace datasets.
"""

import numpy as np
import uuid
import json
import os
from typing import Optional
from datetime import datetime

IMPORTED_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "imported_traces")


def validate_traces(traces: np.ndarray) -> dict:
    """Validate trace array shape and dtype."""
    if traces.ndim != 2:
        raise ValueError(f"Traces must be 2D (N×T), got {traces.ndim}D")
    if traces.shape[0] < 10:
        raise ValueError(f"Need at least 10 traces, got {traces.shape[0]}")
    return {"num_traces": int(traces.shape[0]), "trace_length": int(traces.shape[1])}


def validate_plaintexts(plaintexts: np.ndarray, num_traces: int) -> None:
    """Validate plaintext array shape."""
    if plaintexts.ndim != 2:
        raise ValueError(f"Plaintexts must be 2D (N×16), got {plaintexts.ndim}D")
    if plaintexts.shape[0] != num_traces:
        raise ValueError(
            f"Plaintext count ({plaintexts.shape[0]}) doesn't match trace count ({num_traces})"
        )
    if plaintexts.shape[1] != 16:
        raise ValueError(f"Plaintexts must have 16 columns (AES-128), got {plaintexts.shape[1]}")


def validate_key(key_bytes: np.ndarray) -> None:
    """Validate key array shape."""
    if key_bytes.ndim != 1 or key_bytes.shape[0] != 16:
        raise ValueError(f"Key must be 1D with 16 bytes, got shape {key_bytes.shape}")


def register_imported_dataset(
    traces: np.ndarray,
    plaintexts: np.ndarray,
    key_bytes: Optional[np.ndarray] = None,
    name: str = "Imported Dataset",
    description: str = "",
    hardware_info: str = "",
) -> dict:
    """Save imported dataset to disk and return metadata dict."""
    os.makedirs(IMPORTED_DIR, exist_ok=True)
    dataset_id = "imp-" + str(uuid.uuid4())[:8]
    dataset_dir = os.path.join(IMPORTED_DIR, dataset_id)
    os.makedirs(dataset_dir, exist_ok=True)

    # Ensure correct dtypes
    traces = traces.astype(np.float32)
    plaintexts = plaintexts.astype(np.uint8)

    np.save(os.path.join(dataset_dir, "traces.npy"), traces)
    np.save(os.path.join(dataset_dir, "plaintexts.npy"), plaintexts)

    key_hex = None
    if key_bytes is not None:
        key_bytes = key_bytes.astype(np.uint8)
        np.save(os.path.join(dataset_dir, "key_bytes.npy"), key_bytes)
        key_hex = "".join(f"{b:02x}" for b in key_bytes)

    meta = {
        "id": dataset_id,
        "name": name,
        "description": description,
        "hardware_info": hardware_info,
        "source": "imported",
        "key_hex": key_hex,
        "shape": {
            "num_traces": int(traces.shape[0]),
            "trace_length": int(traces.shape[1]),
        },
        "config": {
            "num_traces": int(traces.shape[0]),
            "trace_length": int(traces.shape[1]),
            "masked": False,
            "key_hex": key_hex,
        },
        "imported_at": datetime.utcnow().isoformat(),
    }

    with open(os.path.join(dataset_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return meta
