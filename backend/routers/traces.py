"""Traces router — synthetic dataset generation and retrieval."""

import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ..engine.trace_generator import TraceConfig, generate_traces, list_datasets, load_dataset

router = APIRouter(prefix="/api/traces", tags=["traces"])


class GenerateRequest(BaseModel):
    num_traces: int = Field(default=1000, ge=50, le=10000)
    trace_length: int = Field(default=200, ge=50, le=1000)
    noise_level: float = Field(default=1.0, ge=0.0, le=10.0)
    leakage_intensity: float = Field(default=0.8, ge=0.0, le=5.0)
    masked: bool = False
    masking_strength: float = Field(default=0.5, ge=0.0, le=1.0)
    timing_jitter: int = Field(default=2, ge=0, le=10)
    key_string: str = Field(default="protected", max_length=16)
    seed: Optional[int] = None


@router.post("/generate")
def generate(req: GenerateRequest):
    config = TraceConfig(**req.model_dump())
    meta = generate_traces(config)
    return {"success": True, "dataset": meta}


@router.get("/list")
def list_all():
    datasets = list_datasets()
    return {"datasets": datasets}


@router.get("/{dataset_id}/meta")
def get_meta(dataset_id: str):
    datasets = list_datasets()
    for d in datasets:
        if d["id"] == dataset_id:
            return d
    raise HTTPException(status_code=404, detail="Dataset not found")


@router.get("/{dataset_id}/waveform")
def get_waveform(dataset_id: str, max_traces: int = 50, downsample: int = 1):
    """Return trace data for frontend waveform viewer."""
    try:
        traces, plaintexts, key_bytes = load_dataset(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")

    traces_subset = traces[:max_traces:1, ::downsample]
    return {
        "dataset_id": dataset_id,
        "num_traces": int(traces_subset.shape[0]),
        "trace_length": int(traces_subset.shape[1]),
        "traces": traces_subset.tolist(),
        "x_axis": list(range(0, traces.shape[1], downsample)),
    }
