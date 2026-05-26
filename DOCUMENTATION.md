# CipherScope XAI — Project Documentation

## Side-Channel Analysis & Leakage Mitigation Platform

---

## 1. Executive Summary

**CipherScope XAI** is a research-grade, interactive web platform for studying **AES-128 side-channel attacks** and **countermeasure evaluation**. It enables users to:

- Generate synthetic power analysis traces with configurable noise, leakage, and masking parameters
- Import real hardware-captured datasets (e.g., ChipWhisperer, ASCAD)
- Run **Correlation Power Analysis (CPA)** attacks with real-time streaming and end-to-end key verification
- Perform **leakage detection** using TVLA (Welch's t-test) and Signal-to-Noise Ratio analysis
- Evaluate **Boolean masking countermeasures** with full-key attack comparison dashboards

The platform serves as both an educational tool for understanding side-channel vulnerabilities and a research environment for evaluating countermeasure effectiveness.

---

## 2. Key Cryptographic & SCA Concepts

To fully understand the working of CipherScope XAI, it is essential to be familiar with several fundamental cryptographic, physical, and statistical concepts:

### 2.1 Advanced Encryption Standard (AES-128)
AES (Advanced Encryption Standard) is a symmetric block cipher standardized by NIST.
- **Block Size**: 128 bits (16 bytes), represented as a $4 \times 4$ column-major matrix of bytes (the State).
- **Key Size**: 128 bits (16 bytes) for AES-128, which undergoes a key expansion to produce 11 round keys (16 bytes each).
- **Rounds**: AES-128 executes exactly 10 rounds. Each round (except the last) consists of four algebraic layers:
  1. **SubBytes**: Non-linear byte substitution using a lookup table (S-Box) designed to resist linear and differential cryptanalysis.
  2. **ShiftRows**: Cyclic transposition of state bytes to mix data columns.
  3. **MixColumns**: Matrix multiplication of columns in the Galois Field $GF(2^8)$ to provide mathematical diffusion.
  4. **AddRoundKey**: Bitwise XOR ($\oplus$) of the round key with the state.
- **Target of Side-Channel Attacks**: First-round operations are highly vulnerable because the input is public plaintext and the key is the secret key. Specifically, the output of the first round S-Box for byte index $j$:
  $$Z_j = S(P_j \oplus K_j)$$
  where $P_j$ is the $j$-th byte of the plaintext, $K_j$ is the $j$-th byte of the secret key, and $S$ is the AES S-Box.

### 2.2 Side-Channel Analysis (SCA) Fundamentals
Standard cryptanalysis treats cryptographic algorithms as black boxes (input-to-output mapping). In contrast, SCA treats the physical implementation as a **gray box**:
- During physical execution, electronic circuits leak physical parameters like power consumption, electromagnetic (EM) radiation, heat, and execution time.
- By collecting measurements of power consumption (referred to as **traces**) during cryptographic operations on varied plaintexts, attackers can correlate physical activity with predicted mathematical states to reconstruct the secret keys.

### 2.3 Power Leakage Models
Electronic chips are fabricated using CMOS technology. In CMOS circuits, power is consumed when transistors switch states or current leaks through gates:
- **Hamming Weight (HW)**: The number of active high bits ('1's) in a byte. E.g., $HW(0x0F) = 4$, $HW(0xFF) = 8$. High signals draw more static leakage current. The HW model assumes power consumption is linearly related to the number of high bits on the data bus at a given clock cycle.
- **Hamming Distance (HD)**: The number of bits transitioning from one cycle to another. E.g., transitioning a register from state $V_{old}$ to $V_{new}$ consumes dynamic power proportional to:
  $$HD(V_{old}, V_{new}) = HW(V_{old} \oplus V_{new})$$
  CipherScope XAI's synthetic generator implements a Hamming Weight leakage model targeting the non-linear intermediate state of the first round SubBytes output.

### 2.4 Correlation Power Analysis (CPA)
CPA is a statistical side-channel attack targeting correlation.
- **Key Guessing**: Because the key byte space is small ($2^8 = 256$ candidates per byte), the attacker makes a guess for each byte of the secret key: $k \in [0, 255]$.
- **Hypothesis Matrix ($H$)**: For each trace $i$ and key guess $k$, compute the expected intermediate Hamming Weight leakage:
  $$H_{i, k} = HW(S(P_{i, j} \oplus k))$$
- **Correlation calculation**: The hypothesis columns $H_k$ are correlated against the actual trace samples at every time point $t$ using the **Pearson Correlation Coefficient**:
  $$r(k, t) = \frac{\sum (H_{i,k} - \bar{H_k})(T_{i,t} - \bar{T_t})}{\sqrt{\sum (H_{i,k} - \bar{H_k})^2 \sum (T_{i,t} - \bar{T_t})^2}}$$
- **Key Recovery**: The correct key guess $k = K_j$ will show a distinct correlation peak ($|r| \to 1.0$) at the exact clock cycle when the S-Box operation occurred. The 255 incorrect guesses will exhibit random correlation noise close to $0.0$ because the non-linear S-Box decorrelates wrong inputs from the actual leakage.

### 2.5 Leakage Assessment Metrics
Before running attacks, security evaluators use leakage assessment metrics to prove the presence of security-relevant side-channel signals:
- **TVLA (Test Vector Leakage Assessment)**: Implements Welch's t-test to determine if there is a statistically significant difference between two sets of traces (typically fixed-plaintext traces where the input is constant, vs. random-plaintext traces).
  - The t-statistic measures the difference in means normalized by variance:
    $$t = \frac{\mu_{fixed} - \mu_{random}}{\sqrt{\frac{\sigma^2_{fixed}}{N_{fixed}} + \frac{\sigma^2_{random}}{N_{random}}}}$$
  - If $|t| > 4.5$ at any time point, it indicates with $>99.999\%$ statistical confidence that the device is leaking key-dependent information, indicating that it is vulnerable to side-channel attacks.
- **SNR (Signal-to-Noise Ratio)**: Measures the exploitable leakage strength relative to physical and environmental noise. It is computed as:
  $$SNR(t) = \frac{Var_{class}(\mu_{class}(t))}{E_{class}(\sigma^2_{class}(t))}$$
  where classes are typically grouped by the Hamming Weight values (0 to 8) of the target byte. High SNR points represent side-channel leakage hotspots.

### 2.6 Side-Channel Mitigation: Boolean Masking
To prevent CPA and other first-order side-channel attacks, developers use Boolean masking to decouple the intermediate values from the physical power:
- **Secret Sharing**: A sensitive variable $X$ is split into multiple random shares. In first-order Boolean masking, $X$ is split into two shares:
  $$X' = X \oplus M \quad \text{and} \quad M$$
  where $M$ is a cryptographically secure random mask generated on-the-fly for every execution.
- **Countermeasure Mechanism**: The microcontroller computes S-Box operations using the masked share $X'$ and the mask share $M$ separately. Because the power consumption of each share is independent of the secret $X$, the Pearson correlation coefficient between the power traces and first-order predictions drops to $0.0$.
- **Attack Complexity**: Defeating masked implementations requires higher-order attacks (such as second-order CPA), which correlate multiple time points corresponding to different shares or use higher-order statistical moments. This increases the trace count requirement exponentially.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.13, FastAPI | REST API + WebSocket server |
| **Computation** | NumPy, SciPy | Vectorized CPA, TVLA, SNR computations |
| **Frontend** | Next.js 16, React 19 | Server-side rendered UI framework |
| **Charts** | ECharts (echarts-for-react) | Interactive trace/correlation visualizations |
| **Animations** | Framer Motion | Page transitions, micro-animations |
| **State** | Zustand | Lightweight global state management |
| **Styling** | Vanilla CSS + Tailwind (hybrid) | Custom dark-mode design system |
| **Icons** | Lucide React | Consistent iconography |
| **UI Primitives** | Radix UI | Accessible dialog, slider, tabs, tooltips |
| **Fonts** | Inter + JetBrains Mono | Sans-serif UI + monospace data display |

---

## 4. Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Dashboard │ │Generator │ │CPA Studio│ │Masking     │  │
│  │          │ │+ Import  │ │          │ │Studio      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │            │            │              │         │
│  ┌────┴────────────┴────────────┴──────────────┴──────┐  │
│  │              lib/api.ts  +  lib/ws.ts              │  │
│  │              (REST Client + WebSocket)              │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │ HTTP :8000 / WS :8000
┌───────────────────────────┼──────────────────────────────┐
│                    Backend (FastAPI)                      │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │                    Routers                          │  │
│  │  traces │ cpa │ leakage │ masking │ import │ expts  │  │
│  └────────────────────────┬───────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │                  Engine Layer                       │  │
│  │  trace_generator │ cpa_engine │ leakage_engine     │  │
│  │  masking_engine  │ dataset_import │ aes_utils       │  │
│  └────────────────────────┬───────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │           Data Layer (data/ directory)              │  │
│  │  synthetic_traces/ │ imported_traces/ │ experiments/ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
Blockchain_EL/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt           # Python dependencies
│   ├── generate_sample_dataset.py # Script to create sample ChipWhisperer data
│   ├── engine/                    # Core computation modules
│   │   ├── aes_utils.py           # AES S-Box + Hamming Weight utilities
│   │   ├── trace_generator.py     # Synthetic trace generation + dataset I/O
│   │   ├── cpa_engine.py          # Correlation Power Analysis (vectorized)
│   │   ├── leakage_engine.py      # TVLA + SNR analysis
│   │   ├── masking_engine.py      # Masking simulation + full-key comparison
│   │   └── dataset_import.py      # Real dataset import & validation
│   └── routers/                   # API endpoints
│       ├── traces.py              # /api/traces/* — generate, list, waveform
│       ├── cpa.py                 # /api/cpa/* — run, WebSocket streaming
│       ├── leakage.py             # /api/leakage/* — TVLA, SNR
│       ├── masking.py             # /api/masking/* — compare, full-comparison
│       ├── import_router.py       # /api/datasets/import — file upload
│       └── experiments.py         # /api/experiments/* — save/load sessions
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with sidebar
│   │   ├── globals.css            # Design system (tokens, components)
│   │   ├── page.tsx               # Dashboard home
│   │   ├── generator/page.tsx     # Synthetic trace generator
│   │   ├── import/page.tsx        # Real dataset import
│   │   ├── trace-studio/page.tsx  # Waveform viewer
│   │   ├── cpa-studio/page.tsx    # CPA attack + key verification
│   │   ├── leakage-lab/page.tsx   # TVLA + SNR analysis
│   │   ├── masking-studio/page.tsx# Masking comparison dashboard
│   │   ├── experiments/page.tsx   # Saved sessions manager
│   │   └── settings/page.tsx      # Platform settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Collapsible navigation sidebar
│   │   │   └── Topbar.tsx         # Page header with backend status
│   │   └── charts/
│   │       ├── WaveformChart.tsx   # Multi-trace overlay chart
│   │       ├── HeatmapChart.tsx    # Correlation heatmap (256 × T)
│   │       ├── ByteRecoveryGrid.tsx# 16-byte key recovery display
│   │       ├── KeyVerificationPanel.tsx # Original vs recovered key comparison
│   │       ├── TVLAChart.tsx       # t-score time series with threshold
│   │       └── SNRChart.tsx        # SNR time series with hotspots
│   └── lib/
│       ├── api.ts                 # REST API client + TypeScript types
│       ├── ws.ts                  # WebSocket client for CPA streaming
│       └── store.ts               # Zustand global state
└── data/
    ├── synthetic_traces/          # Generated datasets
    ├── imported_traces/           # Uploaded real datasets
    └── experiments/               # Saved analysis sessions
```

---

## 5. Feature Documentation

### 5.1 Synthetic Trace Generator (`/generator`)

**Purpose**: Generate configurable AES-128 side-channel power traces for controlled experiments.

**How It Works**:
1. For each trace, a random 16-byte plaintext is generated
2. The AES S-Box substitution is computed: `S[plaintext[i] ⊕ key[i]]`
3. The Hamming Weight of the S-Box output is used as the leakage model
4. Leakage is injected at specific time points (one per key byte) with configurable intensity
5. Gaussian noise and timing jitter are added for realism

**Configurable Parameters**:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `num_traces` | 50–5,000 | 1,000 | Number of power traces to generate |
| `trace_length` | 50–500 | 200 | Samples per trace |
| `noise_level` | 0–5 | 1.0 | Gaussian noise standard deviation (σ) |
| `leakage_intensity` | 0–3 | 0.8 | Hamming Weight leakage multiplier |
| `timing_jitter` | 0–8 | 2 | Random sample offset per trace |
| `masked` | on/off | off | Enable Boolean masking countermeasure |
| `masking_strength` | 0–100% | 50% | Correlation suppression factor |
| `key_hex` | 32-char hex | `"protected"` padded | AES-128 secret key in hexadecimal |

**Key Input Modes**:
- **HEX mode** (recommended): Direct 32-character hex string (e.g., `2b7e151628aed2a6abf7158809cf4f3c`)
- **TEXT mode**: ASCII string auto-padded to 16 bytes with nulls
- **Random generation**: Cryptographic random key via browser `crypto.getRandomValues()`

**Output**: Dataset stored as `traces.npy` (float32, N×T), `plaintexts.npy` (uint8, N×16), `key_bytes.npy` (uint8, 16), and `meta.json`.

---

### 5.2 Real Dataset Import (`/import`)

**Purpose**: Upload externally captured hardware datasets from platforms like ChipWhisperer or ASCAD.

**Supported Format**: NumPy `.npy` files (max 100 MB per file)

| File | Shape | Required | Description |
|------|-------|----------|-------------|
| `traces.npy` | (N, T) float | ✅ Yes | Power consumption measurements |
| `plaintexts.npy` | (N, 16) uint8 | ✅ Yes | Input plaintexts for each trace |
| `key.npy` | (16,) uint8 | ❌ Optional | Known secret key (for verification) |

**Features**:
- Drag-and-drop file zone with automatic file-type detection based on filename
- Shape and dtype validation before upload
- Metadata fields: name, description, hardware info
- Imported datasets integrate seamlessly with all analysis workflows (CPA, TVLA, SNR, Masking)

**Bundled Sample**: A simulated ChipWhisperer dataset (2,000 traces × 300 samples) with realistic power line interference is pre-loaded for demonstration.

---

### 5.3 Trace Studio (`/trace-studio`)

**Purpose**: Visualize raw power traces as waveform overlays.

**Features**:
- Multi-trace overlay chart (up to 100 traces simultaneously)
- Configurable downsampling (×1, ×2, ×4, ×8) for large datasets
- Interactive zoom and pan via ECharts
- Dataset metadata panel showing configuration parameters

---

### 5.4 CPA Studio (`/cpa-studio`)

**Purpose**: Execute Correlation Power Analysis attacks to recover the AES-128 secret key.

**CPA Algorithm** (implemented in `cpa_engine.py`):

```
For each key byte b (0–15):
    For each key guess k (0–255):
        1. Compute hypothesis: H[k] = HW(SBox(plaintext[b] ⊕ k))
        2. Correlate H[k] with each time sample using Pearson correlation
        3. Score[k] = max|correlation| across all time samples
    recovered_key[b] = argmax(Score)
```

**Implementation Details**:
- **Vectorized Pearson correlation**: Custom `_pearson_matrix()` computes the full (256 × T) correlation matrix in a single matrix operation — no per-sample loops
- **WebSocket streaming**: CPA runs byte-by-byte, streaming results to the frontend in real-time via `/api/cpa/ws/{dataset_id}`
- **Live verification**: Each streamed event includes match status against the original key

**Key Verification Panel** (shown after CPA completes):
- Side-by-side display: Original Key vs Recovered Key (16 hex byte cells)
- Color-coded per-byte match: ✅ green = correct, ❌ red = mismatch
- Attack result banner: "✓ Full Key Recovered" or "✗ Partial Recovery (N/16)"
- Full hex string + text representation of both keys

**Visualization Components**:
- `ByteRecoveryGrid`: 16-cell grid showing recovered bytes with confidence bars
- `HeatmapChart`: Correlation heatmap (best key row per byte vs time samples)
- Correlation score bar chart (256 key guesses for current byte)

---

### 5.5 Leakage Lab (`/leakage-lab`)

**Purpose**: Detect information leakage in power traces using statistical tests.

#### TVLA (Test Vector Leakage Assessment)

Uses **Welch's t-test** to detect statistically significant differences between fixed and random trace groups:
- Traces are split by plaintext value at the target byte (`pt[byte] == 0x00` → fixed group)
- Per-sample t-statistic computed across all time points
- Leakage detected where `|t| > 4.5` (99.999% confidence)

**Output**: t-score time series with threshold lines and highlighted leakage points.

#### SNR (Signal-to-Noise Ratio)

Measures exploitable leakage strength:
- Traces grouped by Hamming Weight of `plaintext[byte]` (9 classes: HW 0–8)
- `SNR(t) = Var(class means at t) / Mean(within-class variance at t)`
- Hotspots identified at the 90th percentile

**Output**: SNR time series with hotspot markers.

---

### 5.6 Masking Studio (`/masking-studio`)

**Purpose**: Evaluate the effectiveness of Boolean masking as a side-channel countermeasure.

**Two Analysis Modes**:

#### Tab 1: Full Key Comparison (Research-Grade)

Runs complete CPA on both masked and unmasked trace pairs across **all 16 key bytes**:

1. Generates paired datasets using the same plaintexts/key but with and without masking
2. Runs full CPA on both → determines recovery rate for each
3. Produces per-byte and aggregate statistics

**Dashboard Components**:
- **Recovery rate cards**: Side-by-side (e.g., "16/16 unmasked → 0/16 masked")
- **Leakage reduction arrow**: Average correlation reduction percentage
- **Attack complexity rating**: Qualitative assessment (Very High / High / Moderate / Low)
- **Byte-by-byte table**: Per-byte key, recovered values (✓/✗), mini correlation bars, reduction %
- **Correlation comparison chart**: Paired bar chart (red=unmasked, green=masked) per byte
- **Educational panel**: Mathematical explanation of why Boolean masking works

#### Tab 2: Single Byte Analysis

Focused analysis on one key byte — shows detailed correlation score distributions for both masked and unmasked attacks.

**Masking Model**: Boolean masking applies random mask `m`: the S-Box output is split into `S[p⊕k]⊕m` and `m`. The effective leakage becomes `leakage_intensity × (1 - masking_strength)`, decorrelating the power consumption from the secret key.

---

### 5.7 Experiments (`/experiments`)

**Purpose**: Save and load named analysis sessions for reproducibility.

Stored data includes CPA results, TVLA/SNR data, masking results, and dataset configuration. Sessions can be viewed, compared, and deleted.

---

### 5.8 Dashboard (`/`)

**Purpose**: Platform overview with real-time statistics.

**Displays**:
- Total datasets, total traces, experiment count, active dataset
- Quick-action links to all analysis modules
- Recent datasets list with configuration badges

---

## 6. API Reference

### 6.1 Trace Generation & Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/traces/generate` | Generate synthetic dataset |
| `GET` | `/api/traces/list` | List all datasets (synthetic + imported) |
| `GET` | `/api/traces/waveform/{id}` | Get trace waveform data |

### 6.2 CPA Attack

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cpa/run` | Run full CPA with key verification |
| `WS` | `/api/cpa/ws/{dataset_id}` | Stream CPA byte-by-byte via WebSocket |

### 6.3 Leakage Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/leakage/tvla` | Run TVLA (Welch's t-test) |
| `POST` | `/api/leakage/snr` | Run SNR analysis |

### 6.4 Masking Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/masking/compare` | Single-byte masked vs unmasked |
| `POST` | `/api/masking/full-comparison` | Full 16-byte comparison |
| `POST` | `/api/masking/waveform-pair` | Get masked/unmasked trace overlays |

### 6.5 Dataset Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/datasets/import` | Upload .npy files (multipart) |

### 6.6 Experiments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/experiments/save` | Save analysis session |
| `GET` | `/api/experiments/list` | List saved experiments |
| `GET` | `/api/experiments/{id}` | Get full experiment data |
| `DELETE` | `/api/experiments/{id}` | Delete experiment |

---

## 7. How to Run

### 7.1 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 7.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

### 7.3 Generate Sample Dataset

```bash
cd backend
python generate_sample_dataset.py
```

**Access**: Frontend at `http://localhost:3000`, API docs at `http://localhost:8000/docs`

---

## 8. Design System

The UI uses a custom **dark-mode cybersecurity aesthetic** defined in `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#050811` | Page background |
| `--cyan` | `#00f5ff` | Primary accent, data highlights |
| `--violet` | `#7c3aed` | Secondary accent, active states |
| `--emerald` | `#10b981` | Success, match indicators |
| `--rose` | `#f43f5e` | Error, mismatch indicators |
| `--amber` | `#f59e0b` | Warnings, masking theme |
| `--font-mono` | JetBrains Mono | Hex values, keys, data |

**UI Components**: `.glass` (glassmorphism cards), `.btn-primary`/`.btn-cyan`/`.btn-ghost` (button variants), `.badge` (status pills), `.input` (form controls), `.accent-line` (decorative dividers).

---

## 9. Key Algorithms

### 9.1 Hamming Weight Leakage Model

The power consumption of a CMOS device is approximately proportional to the number of bits transitioning (Hamming Weight). For AES SubBytes:

```
Leakage(trace, t) ≈ HW(SBox[plaintext[i] ⊕ key[i]]) × intensity + noise
```

### 9.2 Pearson Correlation (Vectorized)

```python
# X: hypothesis matrix (256 × N), Y: trace matrix (N × T)
X_c = X - mean(X, axis=1)
Y_c = Y - mean(Y, axis=0)
corr = (X_c @ Y_c) / (||X_c|| × ||Y_c||)    # Result: (256, T)
```

### 9.3 Boolean Masking

```
Original:  leakage ∝ HW(SBox[p ⊕ k])
Masked:    leakage ∝ HW(SBox[p ⊕ k] ⊕ m) × (1 - strength)
           where m is a fresh random mask per execution
```

---

## 10. Verified Test Results

| Test | Result |
|------|--------|
| Generate with hex key `2b7e151628aed2a6abf7158809cf4f3c` | ✅ Dataset created with key stored |
| CPA key recovery (500 traces, default leakage) | ✅ 16/16 bytes recovered correctly |
| Key verification text display | ✅ Original: `"+~..(.........O<"` matches recovered |
| Dataset import (ChipWhisperer sample) | ✅ `imp-9ca0e9d7` registered and accessible |
| Unified dataset listing | ✅ Both synthetic and imported datasets shown |
| Full masking comparison (90% strength) | ✅ 16/16 → 0/16, 74.3% correlation reduction |
| TVLA leakage detection | ✅ Leakage points identified at injection sites |
| SNR hotspot detection | ✅ Hotspots align with leakage injection |

---

## 11. Future Improvements

### 11.1 High Priority

| Improvement | Description | Complexity |
|-------------|-------------|------------|
| **Higher-Order Masking** | Implement 2nd and 3rd-order Boolean masking with multi-share analysis | High |
| **ASCAD/DPA Contest Datasets** | Bundle real-world benchmark datasets with known keys | Medium |
| **Differential Power Analysis (DPA)** | Add classic DPA alongside CPA for comparison | Medium |
| **Export Results** | PDF/CSV export of CPA results, masking comparisons, and leakage reports | Low |
| **Template Attacks** | Implement profiling-based template attacks as a more powerful alternative to CPA | High |

### 11.2 Medium Priority

| Improvement | Description | Complexity |
|-------------|-------------|------------|
| **Multi-Dataset CPA** | Run CPA across different trace counts to show convergence curves | Medium |
| **Trace Preprocessing** | Add filtering (bandpass, alignment), trace trimming, and normalization tools | Medium |
| **AES-256 Support** | Extend key handling and CPA to support 256-bit keys (14 rounds) | Medium |
| **User Authentication** | Multi-user support with dataset isolation and session persistence | High |
| **Database Backend** | Replace JSON file storage with PostgreSQL for scalability | Medium |

### 11.3 Research Extensions

| Extension | Description |
|-----------|-------------|
| **Mutual Information Analysis (MIA)** | Information-theoretic leakage metric as alternative to CPA |
| **Leakage-Resilience Bounds** | Compute theoretical bounds on number of traces needed for key recovery |
| **Shuffling Countermeasure** | Simulate operation-order shuffling alongside masking |
| **Glitching / Fault Injection** | Simulate differential fault analysis on AES rounds |
| **Machine Learning SCA** | Neural network-based side-channel attacks using CNNs on raw traces |
| **Threshold Implementation** | Implement TI (Threshold Implementation) as an alternative to Boolean masking |

### 11.4 Platform & UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Comparison Mode** | Side-by-side comparison of two datasets or two CPA runs |
| **Batch Processing** | Queue multiple analysis jobs and run them sequentially |
| **Keyboard Shortcuts** | Power-user shortcuts for common actions |
| **Dark/Light Theme Toggle** | Optional light theme for presentations |
| **Mobile Responsive** | Optimize layout for tablet viewing |
| **Interactive Tutorials** | Guided walkthroughs explaining each attack step-by-step |
| **Collaborative Mode** | Share datasets and results between users via links |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **AES-128** | Advanced Encryption Standard with 128-bit key (16 bytes) |
| **SCA** | Side-Channel Analysis — exploiting physical leakage during cryptographic operations |
| **CPA** | Correlation Power Analysis — statistical attack using Pearson correlation |
| **TVLA** | Test Vector Leakage Assessment — pass/fail leakage detection test |
| **SNR** | Signal-to-Noise Ratio — measures exploitable leakage strength |
| **HW** | Hamming Weight — number of bits set to 1 in a binary value |
| **S-Box** | Substitution Box — the non-linear component of AES (SubBytes) |
| **Boolean Masking** | Countermeasure that splits sensitive values into random shares |
| **DPA** | Differential Power Analysis — classic statistical side-channel attack |

---

*Documentation generated for CipherScope XAI v1.0.0*
*Last updated: May 2026*
