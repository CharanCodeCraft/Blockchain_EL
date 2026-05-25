# src/cpa/cpa_attack.py

import numpy as np
import os
from tqdm import tqdm
from scipy.stats import pearsonr
import matplotlib.pyplot as plt
import sys

sys.path.append("../dataset")
from aes_utils import sbox_lookup, hamming_weight

DATA_PATH = "../../data/processed/"


# =========================
# Load Data
# =========================
def load():
    traces = np.load(os.path.join(DATA_PATH, "traces_processed.npy"))
    pts = np.load(os.path.join(DATA_PATH, "plaintexts.npy"))
    return traces, pts


# =========================
# Predicted Power
# =========================
def compute_predicted(pts, key_guess, byte_idx):
    pred = []
    for pt in pts:
        val = sbox_lookup(pt[byte_idx] ^ key_guess)
        pred.append(hamming_weight(val))
    return np.array(pred)


# =========================
# Visualization Functions
# =========================
def plot_key_correlation(scores, byte_idx):
    plt.figure()
    plt.plot(scores)
    plt.title(f"Correlation vs Key Guess (Byte {byte_idx})")
    plt.xlabel("Key Guess (0-255)")
    plt.ylabel("Max Correlation")
    plt.grid()
    plt.show()


def plot_heatmap(corr_matrix, byte_idx):
    plt.figure()
    plt.imshow(corr_matrix, aspect='auto', cmap='hot')
    plt.colorbar(label="Correlation")
    plt.title(f"Correlation Heatmap (Byte {byte_idx})")
    plt.xlabel("Time Samples")
    plt.ylabel("Key Guess")
    plt.show()


# =========================
# CPA for ONE BYTE
# =========================
def cpa_byte(traces, pts, byte_idx, visualize=True):
    num_traces, T = traces.shape

    scores = np.zeros(256)
    corr_matrix = np.zeros((256, T))

    for k in tqdm(range(256), desc=f"Byte {byte_idx}"):

        pred = compute_predicted(pts, k, byte_idx)

        if np.std(pred) < 1e-6:
            continue

        for t in range(T):
            corr, _ = pearsonr(pred, traces[:, t])
            corr = abs(corr)
            corr_matrix[k, t] = corr

        scores[k] = np.max(corr_matrix[k])

    best_key = np.argmax(scores)

    # 📊 Visualization
    if visualize:
        plot_key_correlation(scores, byte_idx)
        plot_heatmap(corr_matrix, byte_idx)

    return best_key


# =========================
# Full Key Recovery
# =========================
def recover(traces, pts):
    key = []

    for i in range(16):
        print(f"\n🔍 Attacking byte {i}...")

        k = cpa_byte(traces, pts, i, visualize=(i < 3))  # only first 3 bytes for plots

        print(f"Byte {i}: {hex(k)} ({chr(k)})")
        key.append(k)

    return key


# =========================
# MAIN
# =========================
def main():
    traces, pts = load()

    key = recover(traces, pts)

    key_str = ''.join(chr(k) for k in key if k != 0)

    print("\n======================")
    print("Recovered Key:", key_str)
    print("======================\n")


if __name__ == "__main__":
    main()