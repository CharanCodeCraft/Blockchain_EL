"""Leakage Lab router — TVLA and SNR analysis."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from engine.trace_generator import load_dataset
from engine.leakage_engine import run_tvla, run_snr

router = APIRouter(prefix="/api/leakage", tags=["leakage"])


class LeakageRequest(BaseModel):
    dataset_id: str
    byte_idx: int = Field(default=0, ge=0, le=15)


@router.post("/tvla")
def tvla(req: LeakageRequest):
    try:
        traces, plaintexts, _ = load_dataset(req.dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    result = run_tvla(traces, plaintexts, req.byte_idx)
    return {"dataset_id": req.dataset_id, "byte_idx": req.byte_idx, **result}


@router.post("/snr")
def snr(req: LeakageRequest):
    try:
        traces, plaintexts, _ = load_dataset(req.dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    result = run_snr(traces, plaintexts, req.byte_idx)
    return {"dataset_id": req.dataset_id, "byte_idx": req.byte_idx, **result}
