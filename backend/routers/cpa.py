"""CPA router — REST endpoint + WebSocket streaming."""

import json
import asyncio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional

from ..engine.trace_generator import load_dataset
from ..engine.cpa_engine import run_cpa, run_cpa_streaming

router = APIRouter(prefix="/api/cpa", tags=["cpa"])


class CPARequest(BaseModel):
    dataset_id: str
    byte_indices: Optional[list[int]] = None  # None = all 16 bytes


@router.post("/run")
def run(req: CPARequest):
    try:
        traces, plaintexts, key_bytes = load_dataset(req.dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")

    results = run_cpa(traces, plaintexts, req.byte_indices)

    recovered_key = []
    for i in range(16):
        if i in results:
            recovered_key.append(results[i]["best_key"])
        else:
            recovered_key.append(None)

    return {
        "dataset_id": req.dataset_id,
        "recovered_key": recovered_key,
        "recovered_key_hex": [hex(k) if k is not None else None for k in recovered_key],
        "results": results,
    }


@router.websocket("/ws/{dataset_id}")
async def cpa_stream(websocket: WebSocket, dataset_id: str):
    """Stream CPA byte-by-byte results over WebSocket."""
    await websocket.accept()
    try:
        traces, plaintexts, key_bytes = load_dataset(dataset_id)
    except FileNotFoundError:
        await websocket.send_json({"error": "Dataset not found"})
        await websocket.close()
        return

    try:
        for result in run_cpa_streaming(traces, plaintexts):
            await websocket.send_json(result)
            await asyncio.sleep(0)  # yield to event loop
        await websocket.close()
    except WebSocketDisconnect:
        pass
