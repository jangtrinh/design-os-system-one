# 10. Operational Specs & Jagged Edge Catalog

To build resilient, deterministic systems, engineers must understand the exact operational boundaries, latency ceilings, and documented "jagged edges" of the underlying models.

---

## 1. Model Roster

| Model Tag | Identifier | Intended Use | Deployment Recommendation |
| :--- | :--- | :--- | :--- |
| **`laya-mlx`** | Local Edge (Apple Silicon) | On-device sub-10ms System 1 inference (MPS / MLX Metal Graph) | Primary local engine for macOS workstations ($0 cost) |
| **`jev-latest`** | Cloud API (Rolling) | Evaluates latest patches and taxonomy updates | Recommended for Dev / Staging environments |
| **`jev-1.13`** | Cloud API (Pinned) | Guarantees immutable probability distributions and behavior | Required for production compliance and regulated pipelines |

---

## 2. Operational Specifications

- **Latency Profile (P50)**: 
  - Local Edge (Laya-MLX): **6.53 ms**
  - Cloud API (TypeSafe JEV): **796.8 ms**
  - Cascade Router ($\tau = 0.30$): **243.2 ms** (3.41x speedup over pure cloud)
- **Context Token Budgets**:
  - Maximum context: ~8,192 tokens.
  - Recommended context: 50 – 4,000 tokens for optimal calibration.
- **Batching Capacity**: Scales cleanly across dozens of questions per request ($\le 30$ recommended per single forward pass).

---

## 3. Documented Jagged Edges & Remediation

### A. Double Negatives in Question Phrasing
- ⚠️ **Symptom**: Using double negatives in `Noul` or `Choice` criteria (e.g., *"This text does not contain content that is not in English"*) degrades probability calibration.
- ✅ **Remediation**: Always formulate questions affirmatively: *"This text is written entirely in English"*.

### B. Over-Granular `Score` Criteria
- ⚠️ **Symptom**: Supplying 10 to 20 granular levels in a `Score` prompt dilutes the probability mass across adjacent buckets, inflating entropy.
- ✅ **Remediation**: Maintain **3 to 5 well-defined milestone levels** (e.g., `Low`, `Medium`, `High`, or `0: None`, `1: Moderate`, `2: Critical`). The engine computes continuous expectation (e.g., $1.42$) with mathematical precision.

### C. Unlabeled Tabular Data
- ⚠️ **Symptom**: Ingesting raw CSV rows without header rows forces the model to guess column relationships.
- ✅ **Remediation**: Serialize tables as arrays of structured JSON objects or valid Markdown tables with explicit column headers.

### D. Overlapping Semantic Boundaries in `Choice`
- ⚠️ **Symptom**: Options with ambiguous overlap (e.g., Option A: "Billing defect", Option B: "Banking issue").
- ✅ **Remediation**: Formulate mutually exclusive boundaries: Option A: "Card processor / Stripe gateway error", Option B: "Direct wire transfer or ACH routing issue".
