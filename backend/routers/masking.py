"""Masking Studio router — masked vs unmasked comparison."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ..engine.trace_generator import load_dataset
from ..engine.masking_engine import generate_masked_pair, compare_masking

router = APIRouter(prefix="/api/masking", tags=["masking"])


class MaskingRequest(BaseModel):
    dataset_id: str
    masking_strength: float = Field(default=0.9, ge=0.0, le=1.0)
    noise_level: float = Field(default=1.0, ge=0.0, le=10.0)
    leakage_intensity: float = Field(default=0.8, ge=0.0, le=5.0)
    byte_idx: int = Field(default=0, ge=0, le=15)
    seed: Optional[int] = 42


@router.post("/compare")
def compare(req: MaskingRequest):
    try:
        _, plaintexts, key_bytes = load_dataset(req.dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")

    unmasked, masked = generate_masked_pair(
        plaintexts=plaintexts,
        key_bytes=key_bytes,
        noise_level=req.noise_level,
        leakage_intensity=req.leakage_intensity,
        masking_strength=req.masking_strength,
        seed=req.seed or 42,
    )

    result = compare_masking(unmasked, masked, plaintexts, req.byte_idx)
    return {"dataset_id": req.dataset_id, **result}


@router.post("/waveform-pair")
def waveform_pair(req: MaskingRequest, max_traces: int = 20):
    """Return sample waveform data for unmasked vs masked overlay."""
    try:
        _, plaintexts, key_bytes = load_dataset(req.dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")

    unmasked, masked = generate_masked_pair(
        plaintexts=plaintexts,
        key_bytes=key_bytes,
        noise_level=req.noise_level,
        leakage_intensity=req.leakage_intensity,
        masking_strength=req.masking_strength,
        seed=req.seed or 42,
    )

    n = min(max_traces, len(unmasked))
    return {
        "unmasked": unmasked[:n].tolist(),
        "masked": masked[:n].tolist(),
        "num_traces": n,
        "trace_length": unmasked.shape[1],
    }
