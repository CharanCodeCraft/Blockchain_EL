# src/dataset/generate_traces.py

import numpy as np
import os
from tqdm import tqdm
from aes_utils import sbox_lookup, hamming_weight

NUM_TRACES = 2000
TRACE_LENGTH = 120

KEY_STRING = "protected"

def string_to_bytes(s):
    return [ord(c) for c in s]

def pad_to_16(arr):
    return (arr + [0]*16)[:16]

def generate_trace(pt_bytes, key_bytes):
    trace = np.random.normal(0, 1, TRACE_LENGTH)

    # each byte leaks at different time
    for i in range(16):
        t = 10 + i * 5

        val = sbox_lookup(pt_bytes[i] ^ key_bytes[i])
        hw = hamming_weight(val)

        trace[t] += hw * 0.8

    return trace

def main():
    key_bytes = pad_to_16(string_to_bytes(KEY_STRING))

    traces = []
    plaintexts = []

    for _ in tqdm(range(NUM_TRACES)):
        pt = np.random.randint(0, 256, 16)   # IMPORTANT FIX
        trace = generate_trace(pt, key_bytes)

        plaintexts.append(pt)
        traces.append(trace)

    os.makedirs("../../data/raw", exist_ok=True)

    np.save("../../data/raw/traces.npy", np.array(traces))
    np.save("../../data/raw/plaintexts.npy", np.array(plaintexts))

    print("Dataset generated!")
    print("Key:", KEY_STRING)

if __name__ == "__main__":
    main()