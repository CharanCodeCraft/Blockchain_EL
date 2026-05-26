# CipherScope XAI

CipherScope XAI is a full-stack platform for side-channel analysis research. It combines a FastAPI backend for trace generation and analysis with a Next.js frontend for interactive dashboards and experiments.

## Overview

The project focuses on:
- Synthetic AES trace generation
- Correlation Power Analysis (CPA)
- Leakage metrics (SNR, TVLA)
- Masking and countermeasure experiments
- Dataset management and visualization

## Features

- FastAPI API for trace datasets, CPA, leakage analysis, and experiments
- Next.js UI for trace studio, CPA studio, leakage lab, and masking studio
- Preprocessing and dataset scripts under src/
- Stored example datasets under data/

## Folder Structure

```
Blockchain_EL/
  backend/              # FastAPI service
    engine/             # Analysis engines and utilities
    routers/            # API routes
  frontend/             # Next.js app (UI)
    app/                # App Router pages
    components/         # Reusable UI components
    lib/                # API client and state
  data/                 # Raw and processed datasets
  src/                  # Python scripts for analysis and dataset generation
  requirements.txt      # Root Python dependencies (scripts)
```

## Tech Stack

- Backend: Python, FastAPI, Uvicorn, NumPy, SciPy
- Frontend: Next.js, React, TypeScript, Tailwind CSS, Zustand, ECharts

## Installation

### 1) Environment Setup

- Python 3.10+ recommended
- Node.js 18+ recommended

### 2) Create and Activate a Virtual Environment (venv)

```bash
python -m venv venv
source venv/bin/activate
```

### 3) Install Dependencies

Backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Optional (scripts in src/):

```bash
pip install -r requirements.txt
```

Frontend dependencies:

```bash
cd frontend
npm install
```

## Running Locally

### Start the Backend (FastAPI)

From the repository root:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

Swagger UI:

```bash
http://localhost:8000/docs
```

### Start the Frontend (Next.js)

In a separate terminal:

```bash
cd frontend
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Configuration

- Backend CORS allows `http://localhost:3000` and `http://127.0.0.1:3000` by default.
- Backend default port: 8000
- Frontend default port: 3000

If you add environment variables, create a `.env` file at the appropriate level (root, backend, or frontend) and update the code accordingly.

## Usage Examples

- Generate synthetic traces in the UI at `/generator`
- Run CPA analysis at `/cpa-studio`
- Evaluate leakage metrics at `/leakage-lab`
- Run masking experiments at `/masking-studio`

## Troubleshooting

- If the frontend cannot reach the API, ensure the backend is running on port 8000.
- Check CORS settings in `backend/main.py` if you change the frontend port.
- If `ModuleNotFoundError` appears, confirm the virtual environment is active.
- If npm install fails, delete `frontend/node_modules` and retry.

## Dependencies

Backend (core):
- fastapi
- uvicorn
- numpy
- scipy
- python-multipart
- websockets

Frontend (core):
- next
- react
- tailwindcss
- zustand
- echarts
