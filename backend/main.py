"""CipherScope XAI — FastAPI Backend Entry Point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import traces, cpa, leakage, masking, experiments
from routers import import_router

app = FastAPI(
    title="CipherScope XAI API",
    description="Side-Channel Analysis, Synthetic Trace Generation & Leakage Mitigation Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(traces.router)
app.include_router(cpa.router)
app.include_router(leakage.router)
app.include_router(masking.router)
app.include_router(experiments.router)
app.include_router(import_router.router)


@app.get("/")
def root():
    return {
        "name": "CipherScope XAI",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
