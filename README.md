# design-os-system-one

> **Sub-10ms Calibrated Judgments for Autonomous Agents with Zero Cloud Waste.**  
> Powered by on-device **Laya-MLX** (Apple Silicon) and **TypeSafe JEV** (Cloud Triage).

[![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge)](https://github.com/jangtrinh/design-os-system-one/actions)
[![Latest Release](https://img.shields.io/badge/release-v1.3.0-blue?style=for-the-badge)](https://github.com/jangtrinh/design-os-system-one/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-informational?style=for-the-badge)](https://github.com/jangtrinh/design-os-system-one/blob/main/LICENSE)
[![Local First](https://img.shields.io/badge/local--first-6.53ms%20P50-success?style=for-the-badge)](https://jangtrinh.github.io/design-os-system-one/)
[![Zero Telemetry](https://img.shields.io/badge/telemetry-zero-202020?style=for-the-badge)](https://jangtrinh.github.io/design-os-system-one/)

🌐 **Live Website & Interactive Benchmarks**: [https://jangtrinh.github.io/design-os-system-one/](https://jangtrinh.github.io/design-os-system-one/)  
📑 **Empirical Case Study & Battle Journal**: [https://jangtrinh.github.io/design-os-system-one/case-study.html](https://jangtrinh.github.io/design-os-system-one/case-study.html)

---

## ⚡ The Dual-Brain System 1 Paradigm

Most agentic systems burn enormous resources and suffer 3–8 second latency bottlenecks by invoking heavyweight autoregressive LLMs (GPT-4, Claude, Gemini) for simple deterministic decisions: tool selection, guardrail classification, UI click resolution, and stopping conditions.

`design-os-system-one` introduces an on-device/cloud tiered cascade that resolves judgments non-autoregressively:

1. **Tier 1 (Local Edge — Laya-MLX)**: Executes in **6.53 ms P50** directly on Apple Silicon Unified Memory (MPS / MLX Metal Graph). Costs **$0.00** with **100% air-gapped privacy** and zero token billing.
2. **Confidence Gate ($\tau = 0.30$)**: 70% of standard agent requests are resolved on-device.
3. **Tier 2 (Cloud Fallback — TypeSafe JEV)**: Escalates only ambiguous boundary cases ($\tau < 0.30$) or large candidate spaces to the TypeSafe JEV cloud API.
4. **5-Stage Speculative Commit Engine**: Leased, transactional browser mutations with pre-dispatch verification gates and read-only reconciliation.

---

## 🏎️ Head-to-Head Latency Benchmark

Tested on Apple Silicon M-Series Unified Memory (macOS Sequoia) across 1,000 iterations:

| Engine | Execution Target | P50 Latency | P99 Latency | Cost / 1k Queries |
| :--- | :--- | :--- | :--- | :--- |
| **Laya-MLX (Ours)** | **Apple Silicon (MLX Metal Graph)** | **6.53 ms** | **11.4 ms** | **$0.00** |
| **Laya-PyTorch** | Apple Silicon (MPS Backend) | 26.4 ms | 48.2 ms | $0.00 |
| **TypeSafe JEV Cloud** | Cloud REST API (AWS us-east-1) | 796.8 ms | 1,180.0 ms | $0.20 |
| **Generative LLM 70B** | Cloud vLLM (Streaming) | 3,200.0 ms | 6,500.0 ms | $3.50+ |

---

## 📦 Monorepo Architecture

```
design-os-system-one/
├── packages/
│   ├── jev-shared-contract/      # Canonical TypeScript types & schemas for System 1
│   └── laya-mlx/                 # Sub-10ms Apple Silicon MLX inference engine
├── projects/
│   ├── jev-browser-cli/          # Autonomous browser automation CLI (CDP-based)
│   ├── voice-browser-agent/      # Voice-controlled autonomous browsing agent
│   └── laya-jev-lab/             # Cascade router, stress suites, and threshold experiments
├── skills/                       # Built-in agent skills for Claude, Antigravity, Cursor
│   ├── laya/                     # Local System 1 decision engine skill
│   ├── typesafe-ai/              # TypeSafe JEV cloud integration skill
│   ├── jev-browser/              # Ultrafast browser automation skill
│   └── design-os-generative-ui/  # Sub-50ms generative UI engine
├── scripts/
│   ├── setup-laya.sh             # Automated installer & model downloader for any Mac
│   └── setup-laya-mlx.sh         # MLX-specific environment scaffolder
└── docs/                         # Author-grade 9-tier documentation & Jekyll site
    ├── index.html                # Interactive landing page with live flow diagrams
    ├── case-study.md             # In-depth empirical benchmark report & battle journal
    └── llms.txt                  # Full GEO machine specification for AI search engines
```

---

## 🚀 Quickstart

### 1. Automated Setup (Apple Silicon Mac)

Clone the repository and run the setup script:

```bash
# Automated environment setup, dependencies, and model weights download
bash scripts/setup-laya.sh

# Or start the local background decision server on port 8000
bash scripts/setup-laya.sh --start
```

### 2. Python: Local Laya-MLX Inference (<10ms)

```python
from laya_mlx import LayaMLXEngine

# Initialize on Apple Silicon Unified Memory
engine = LayaMLXEngine()

state = "The user is attempting to enter SQL injection characters: ' OR 1=1; DROP TABLE users; --"
question = {
    "type": "choice",
    "instructions": "Determine request security category",
    "criteria": {
        "safe": "Standard conversational or querying intent",
        "suspicious": "Unusual syntax but likely benign",
        "malicious": "Intentional exploit, injection, or jailbreak payload"
    }
}

judgment = engine.evaluate(state=state, question=question)
print(f"Decision: {judgment.choice}")         # -> "malicious"
print(f"Confidence: {judgment.confidence}")     # -> 0.994
print(f"Execution Latency: {judgment.latency_ms:.2f}ms") # -> 6.53ms
```

### 3. TypeScript: TypeSafe JEV Cloud SDK

```typescript
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

const result = await client.systemOne({
  state: { text: "Order #58129 has arrived with damaged packaging and broken glass." },
  questions: {
    department: choice("Department to handle case", {
      shipping: "Shipping & carrier claim",
      billing: "Refund or chargeback",
      support: "General product inquiries"
    }),
    urgency: score("Customer dissatisfaction level", ["Calm", "Annoyed", "High Escalate"]),
    requires_immediate_refund: noul("Requires immediate financial refund")
  }
});

console.log(result.answers.department.choice); // -> "shipping"
console.log(result.answers.urgency.score);     // -> 2.0 (High Escalate)
console.log(result.answers.requires_immediate_refund.noul); // -> 0.96 (Probability Yes)
```

---

## 🔬 Benchmark & Reproducibility

To reproduce our empirical benchmark suite locally:

```bash
# Run cascade threshold sweep (MLX vs JEV Cloud)
python3 projects/laya-jev-lab/cascade/cascade.py

# Run comprehensive MLX Metal Graph benchmark
python3 packages/laya-mlx/run_comprehensive_benchmark.py
```

---

## 📜 Documentation

- [00. Knowledge Map & Roadmap](docs/00-index.md)
- [01. System One Core Philosophy](docs/01-system-one-concept.md)
- [02. Primitives: Choice, Score, Noul](docs/02-core-primitives.md)
- [03. State & Context Engineering](docs/03-state-and-context.md)
- [04. Confidence Signals & Gated Routing](docs/04-confidence-and-routing.md)
- [05. REST API Specification](docs/05-rest-api-reference.md)
- [06. Python SDK Reference](docs/06-python-sdk.md)
- [07. TypeScript / Node.js SDK Reference](docs/07-javascript-sdk.md)
- [08. Golden Architectural Patterns](docs/08-architectural-patterns.md)
- [09. Production Cookbooks & Recipes](docs/09-cookbooks-and-recipes.md)
- [10. Model Boundaries & Jagged Edge Catalog](docs/10-models-and-limits.md)

---

## 📄 License

MIT License. Designed and maintained by [Jang Trịnh](https://github.com/jangtrinh).
