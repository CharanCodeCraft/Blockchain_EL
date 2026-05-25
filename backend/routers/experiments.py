"""Experiments router — save and load named analysis sessions."""

import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

EXPERIMENTS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "experiments"
)

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


class SaveRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    dataset_id: Optional[str] = None
    cpa_results: Optional[Any] = None
    tvla_results: Optional[Any] = None
    snr_results: Optional[Any] = None
    masking_results: Optional[Any] = None
    config: Optional[Any] = None


@router.post("/save")
def save(req: SaveRequest):
    os.makedirs(EXPERIMENTS_DIR, exist_ok=True)
    exp_id = str(uuid.uuid4())[:8]
    experiment = {
        "id": exp_id,
        "name": req.name,
        "description": req.description,
        "dataset_id": req.dataset_id,
        "created_at": datetime.utcnow().isoformat(),
        "cpa_results": req.cpa_results,
        "tvla_results": req.tvla_results,
        "snr_results": req.snr_results,
        "masking_results": req.masking_results,
        "config": req.config,
    }
    with open(os.path.join(EXPERIMENTS_DIR, f"{exp_id}.json"), "w") as f:
        json.dump(experiment, f, indent=2)
    return {"success": True, "experiment_id": exp_id, "experiment": experiment}


@router.get("/list")
def list_all():
    if not os.path.exists(EXPERIMENTS_DIR):
        return {"experiments": []}
    experiments = []
    for fname in sorted(os.listdir(EXPERIMENTS_DIR)):
        if fname.endswith(".json"):
            with open(os.path.join(EXPERIMENTS_DIR, fname)) as f:
                data = json.load(f)
                # Return summary without heavy result payloads
                experiments.append({
                    "id": data["id"],
                    "name": data["name"],
                    "description": data.get("description", ""),
                    "dataset_id": data.get("dataset_id"),
                    "created_at": data.get("created_at"),
                })
    return {"experiments": experiments}


@router.get("/{experiment_id}")
def get(experiment_id: str):
    path = os.path.join(EXPERIMENTS_DIR, f"{experiment_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Experiment not found")
    with open(path) as f:
        return json.load(f)


@router.delete("/{experiment_id}")
def delete(experiment_id: str):
    path = os.path.join(EXPERIMENTS_DIR, f"{experiment_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Experiment not found")
    os.remove(path)
    return {"success": True, "deleted_id": experiment_id}
