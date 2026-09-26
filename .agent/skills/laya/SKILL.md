---
name: laya
license: Apache-2.0
description: >
  Fast, non-autoregressive System 1 decision engine on local Apple Silicon (MPS) or edge CPU.
  Use for sub-35ms typed decisions (choice, score, noul), LangGraph conditional edge routing,
  prompt injection guardrails, RAG context scoring, PII redaction hooks, 8192-token document
  classification, and zero-cost on-device inference.
version: 1.0.0
priority: HIGH
---

# Laya: On-Device System 1 Decision Engine

Laya is an open-weights, non-autoregressive System 1 decision engine created by Convai Innovations. It evaluates typed questions (`choice`, `score`, `noul`) over any state (text, email, ticket, code, or JSON) in a **single forward pass** (6.5ms with MLX on Apple Silicon, 17ms–26ms on GPU/MPS, 100ms–150ms on CPU).

It eliminates free-form text generation, parsing overhead, and hallucinations, delivering calibrated probabilities and confidence metrics with zero API billing.

---

## 🤖 AI Agent Autonomous Setup & Download Guide (For MacBook or New Machine)

If you are an AI agent running on a MacBook or machine that does not yet have Laya installed or running:

### 1. Diagnostic Health Check
```bash
curl -s http://127.0.0.1:8000/health
```
- If this returns `{"status":"ok",...}`, Laya is active. You can immediately send requests to `POST http://127.0.0.1:8000/predict`.
- If connection is refused or fails, run the automated setup command below.

### 2. 1-Command Self-Setup & Weight Downloader
Run the automated installer:
```bash
bash /Users/jangtrinh/Products/jang-skills/scripts/setup-laya.sh --start
```
*(Or via skill path: `bash ~/.claude/skills/laya/scripts/setup.sh --start`)*

**This command autonomously:**
1. Clones `https://github.com/NandhaKishorM/laya.git` into `~/Products/laya`.
2. Creates Python virtual environment at `~/Products/laya/.venv`.
3. Installs `laya[serve]`, PyTorch, Transformers, Hugging Face Hub, FastAPI, Uvicorn, and MLX (on Apple Silicon).
4. Downloads and preloads model weights (`convaiinnovations/laya` and `multilingual`) into HuggingFace cache.
5. Verifies sub-30ms inference with a bilingual sanity check.
6. Launches background server daemon on `http://127.0.0.1:8000`.

### 3. Manual Fallback Steps (If script cannot be invoked)
```bash
mkdir -p ~/Products && cd ~/Products
git clone https://github.com/NandhaKishorM/laya.git laya
cd laya
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install "laya[serve]>=0.3.20" torch transformers huggingface_hub fastapi uvicorn python-multipart
# Preload weights:
.venv/bin/python preload_models.py
# Launch daemon:
nohup ./start_server.sh 127.0.0.1 8000 mps > /tmp/laya-server.log 2>&1 &
```

---

## 🏛️ Checkpoint Architecture & Auto-Routing

Laya provides three core checkpoints and an automatic language/script router:

| Checkpoint | Base Encoder | Params | Max Context | Primary Specialization |
| :--- | :--- | :---: | :---: | :--- |
| `laya` | ModernBERT-large | 421M | 512 | English text, high-accuracy classification |
| `laya-multilingual` | mmBERT-base | 322M | 1,024 (up to 8,192) | 100+ languages (Tiếng Việt, Japanese, German, etc.) |
| `laya-typed-decisions`| ModernBERT-large | 421M | 1,024 | Synthetic workflow benchmarks & fine-tuning |

The built-in `Router` auto-detects non-Latin scripts and non-English text in <0.5ms pure Python before dispatching to the optimal checkpoint.

---

## ⚡ 5 Execution Modes on this Machine

Laya is available via PyTorch MPS in `/Users/jangtrinh/Products/laya` and via **Native Apple Silicon MLX (`laya-mlx`)** in `/Users/jangtrinh/Products/laya-mlx`.

### 0. Native Apple Silicon MLX Runtime (6.5ms–10ms, P50 ~6.5ms) ⚡
For extreme sub-10ms performance on Apple Silicon Unified Memory without PyTorch overhead:
```python
import laya_mlx as laya

# Pre-converted Apple Silicon weights cached in Unified Memory (~680MB RAM)
agent = laya.load("aac6fef/laya-multilingual-mlx")

result = agent.predict(
    "Tôi bị trừ tiền 2 lần vào thẻ Visa, vui lòng hoàn lại tiền.",
    {
        "dept": {
            "type": "choice",
            "instructions": "Phòng ban phụ trách?",
            "criteria": {
                "billing": "Hóa đơn, hoàn tiền, thanh toán",
                "tech": "Lỗi kỹ thuật, crash app",
                "sales": "Tư vấn mua hàng, báo giá"
            }
        }
    }
)
print(result["answers"]["dept"]["choice"])      # -> "billing"
print(result["answers"]["dept"]["confidence"])  # -> 0.97 (Latency: ~6.5ms)
```

### 1. In-Process Python SDK (PyTorch MPS, ~26ms Latency)
```python
import sys
sys.path.insert(0, "/Users/jangtrinh/Products/laya")
from laya import Router

# Preload checkpoints into memory
router = Router(preload=True)

state = "Khách hàng khiếu nại giao sai sản phẩm và yêu cầu bồi thường gấp."
questions = {
    "department": {
        "type": "choice",
        "instructions": "Phòng ban phụ trách?",
        "criteria": {
            "shipping": "giao sai, vỡ hỏng, vận chuyển",
            "billing": "hoàn tiền, hóa đơn, thanh toán",
            "tech": "lỗi ứng dụng"
        }
    },
    "is_urgent": {
        "type": "noul",
        "instructions": "Khách có yêu cầu xử lý khẩn cấp không?"
    },
    "anger_score": {
        "type": "score",
        "instructions": "Mức độ bức xúc",
        "criteria": ["bình thường", "khó chịu", "rất tức giận"]
    }
}

result = router.predict(state, questions)
print(result["answers"]["department"]["choice"])       # -> "shipping"
print(result["answers"]["department"]["answer_confidence"]) # -> 0.99
print(result["routing"]["model"])                     # -> "multilingual"
```

### 2. Local HTTP Server & Web GUI (`laya[serve]`)
The local server runs at `http://127.0.0.1:8000`:
- **Web UI**: Open `http://127.0.0.1:8000` in any browser to test with visual probability bars.
- **REST API (`POST /predict`)**:
  ```bash
  curl -s http://127.0.0.1:8000/predict -H 'Content-Type: application/json' -d '{
    "state": "Security alert: unauthorized access from unknown IP",
    "questions": {
      "severity": {"type": "score", "instructions": "Threat level", "criteria": ["low", "medium", "critical"]},
      "block_ip": {"type": "noul", "instructions": "Should this IP be blocked immediately?"}
    }
  }'
  ```
- **Management scripts**:
  - Start server: `/Users/jangtrinh/Products/laya/start_server.sh`

### 3. CLI Quick Testing
```bash
cd /Users/jangtrinh/Products/laya
./cli.sh "Hệ thống gặp sự cố không thể đăng nhập" --preset triage
./cli.sh "Mein Konto wurde zweimal belastet"  # Instant sub-1ms language routing
```

### 4. Model Context Protocol (MCP Server)
Run `laya-mcp-server` over stdio. Provides 4 tools: `laya_predict`, `laya_route`, `laya_preset`, and `laya_status` directly to IDE agents.

---

## 🛠️ Advanced Agentic Patterns

### 1. LangGraph Conditional Edge Router
Eliminates 1–2 second LLM lag on DAG branch points:
```python
from laya.integrations.langchain import LayaRouter, LayaGuardrail

# Pre-graph guardrail check (< 35ms)
guard = LayaGuardrail(action="raise")

# Router node with confidence fallback
router = LayaRouter(
    criteria={
        "billing_node": "invoices, payment disputes, refunds",
        "tech_node": "crash, bugs, 500 errors",
        "sales_node": "pricing, enterprise contracts"
    },
    confidence_threshold=0.80,
    fallback="human_review_node"
)
```

### 2. Long Document Analysis (Up to 8,192 Tokens)
Pass `max_len=8192` to process long contracts, SLAs, or insurance policies without text generation:
```python
result = router.predict(contract_text, questions, model="multilingual", max_len=8192)
```

### 3. Pre-Inference PII Redaction & Audit Hooks
```python
def scrub_pii(ctx):
    # Runs at on_predict_start before tokenization
    ctx.states = [mask_sensitive_data(s) for s in ctx.states]

agent = laya.load("convaiinnovations/laya", on_predict_start=scrub_pii, hooks_raise=True)
```

### 4. Local-First Cascade Router (Sweet Spot: $\tau = 0.30$)
Based on empirical evaluation (`benchmark_cascade_results.json` on Apple Silicon):
- **70% of requests** are resolved locally by Laya in **<10ms** at **$0 cost**.
- When confidence $< 0.30$ (ambiguous or multi-intent inputs), automatically cascade to TypeSafe JEV Cloud API.
- Overall latency drops from **830ms to 243ms** (**3.41x speedup**) while maintaining **80.0% accuracy**.

```python
# Cascade logic
decision = laya_agent.predict(state, questions)["answers"]["action"]
if decision["confidence"] >= 0.30:
    return decision  # Solved locally in ~6.5ms
return call_typesafe_jev(state, questions)  # Escalate boundary/ambiguous case
```

---

## ⚠️ Architectural Guardrails & Limits

1. **Choice Option Ceiling**: Keep choices $\le 20$ options. Beyond 20 options, token budget sharing degrades resolution. For $\ge 30$ options or code syntax analysis, dispatch to TypeSafe JEV.
2. **Zero-Text Generation**: Never invoke Laya for open-ended QA, creative drafting, or code generation; it produces only typed tensors and calibrated probabilities.
3. **Sarcasm Limitation**: Laya indexes primarily on literal semantic tokens; for sarcastic complaints with positive words (*"Bravo, great outage!"*), use JEV or frontier LLMs.
