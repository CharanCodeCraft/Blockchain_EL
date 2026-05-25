# src/preprocessing/preprocess.py

import numpy as np
import os

DATA_PATH = "../../data/raw/"
OUT_PATH = "../../data/processed/"

def normalize(traces):
    mean = np.mean(traces, axis=1, keepdims=True)
    std = np.std(traces, axis=1, keepdims=True)
    return (traces - mean) / (std + 1e-9)

def main():
    traces = np.load(os.path.join(DATA_PATH, "traces.npy"))
    pts = np.load(os.path.join(DATA_PATH, "plaintexts.npy"))

    traces = normalize(traces)

    os.makedirs(OUT_PATH, exist_ok=True)
    np.save(os.path.join(OUT_PATH, "traces_processed.npy"), traces)
    np.save(os.path.join(OUT_PATH, "plaintexts.npy"), pts)

    print("Preprocessing done!")

if __name__ == "__main__":
    main()