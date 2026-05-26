"""Import router — upload and register real hardware datasets."""

import io
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from engine.dataset_import import (
    validate_traces,
    validate_plaintexts,
    validate_key,
    register_imported_dataset,
)

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


async def _read_npy(upload: UploadFile) -> np.ndarray:
    """Read an uploaded .npy file into a numpy array."""
    data = await upload.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {len(data) / 1024 / 1024:.1f} MB (max {MAX_FILE_SIZE / 1024 / 1024:.0f} MB)",
        )
    try:
        return np.load(io.BytesIO(data), allow_pickle=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid .npy file: {str(e)}")


@router.post("/import")
async def import_dataset(
    traces: UploadFile = File(..., description="Traces array (N×T) as .npy"),
    plaintexts: UploadFile = File(..., description="Plaintexts array (N×16) as .npy"),
    key: Optional[UploadFile] = File(None, description="Key array (16,) as .npy (optional)"),
    name: str = Form(default="Imported Dataset"),
    description: str = Form(default=""),
    hardware_info: str = Form(default=""),
):
    """Import an external dataset from uploaded .npy files."""
    # Read files
    traces_arr = await _read_npy(traces)
    plaintexts_arr = await _read_npy(plaintexts)

    key_arr = None
    if key is not None and key.filename:
        key_arr = await _read_npy(key)

    # Validate
    try:
        info = validate_traces(traces_arr)
        validate_plaintexts(plaintexts_arr, info["num_traces"])
        if key_arr is not None:
            validate_key(key_arr)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Register
    meta = register_imported_dataset(
        traces=traces_arr,
        plaintexts=plaintexts_arr,
        key_bytes=key_arr,
        name=name,
        description=description,
        hardware_info=hardware_info,
    )

    return {"success": True, "dataset": meta}
