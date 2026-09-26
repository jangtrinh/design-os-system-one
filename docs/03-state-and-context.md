# 03. State & Context Engineering

In the `design-os-system-one` architecture, **`State`** is the single source of contextual truth ingested by the model to evaluate questions. Unlike conventional LLMs that require verbose meta-prompts ("You are an intelligent AI assistant... Please return strict JSON..."), System 1 ingests `state` as pure, unadorned data.

---

## 1. Supported State Formats

The System 1 engine supports heterogeneous data representations:

### A. Plain Text Strings
Optimal for emails, customer support tickets, chat logs, code excerpts, and legal clauses.
```json
{
  "state": "Hello, I have been unable to log into my account since enabling SMS 2FA this morning. The verification codes never arrive.",
  "questions": { ... }
}
```

### B. Structured Objects (JSON Dictionaries)
Optimal when aggregating database entities, account metadata, and session telemetry.
```json
{
  "state": {
    "user_tier": "Enterprise",
    "account_age_days": 450,
    "last_payment_status": "succeeded",
    "open_tickets_count": 3,
    "message": "Webhook delivery is currently delayed by over 15 minutes. We are dropping critical customer transactions."
  },
  "questions": { ... }
}
```
*The model parses JSON keys and values to capture correlations between user tier, historical reliability, and incident severity.*

### C. Arrays of Candidate Items
Optimal for re-ranking, candidate filtering, or extraction:
```json
{
  "state": {
    "query": "lightweight laptop for software engineering",
    "candidates": [
      {"id": "p1", "name": "ThinkPad X1 Carbon Gen 11", "weight": "1.12kg", "cpu": "i7-1365U"},
      {"id": "p2", "name": "ASUS ROG Strix G16", "weight": "2.5kg", "cpu": "i9-13980HX"},
      {"id": "p3", "name": "MacBook Air 15 M2", "weight": "1.51kg", "cpu": "Apple M2"}
    ]
  },
  "questions": { ... }
}
```

---

## 2. Golden Rules for State Hygiene

### 1. Pure Facts, Zero Meta-Instructions
❌ **Anti-pattern**: Embedding prompts and reasoning instructions inside the State:
```json
{
  "state": "Below is a user message. Carefully analyze if they are angry: 'I want to cancel my subscription'."
}
```
✅ **Correct**: Cleanly isolate evidence into `state` and intent into `instructions`:
```json
{
  "state": "I want to cancel my subscription.",
  "questions": {
    "is_cancellation": {
      "type": "noul",
      "instructions": "The customer requests subscription termination"
    }
  }
}
```

### 2. Context Pruning
Feeding raw HTML boilerplate, CSS class tokens, tracking scripts, and irrelevant database UUIDs degrades calibration and inflates processing latency.
- Strip HTML markup and provide clean Markdown or structured JSON.
- Prune extraneous fields; transmit only data relevant to the decision gate.

### 3. Semantic Key Labeling
When passing JSON objects, use self-documenting keys (`customer_history`, `order_status`, `error_trace`). System 1 leverages key semantics to locate evidence relevant to the question.

---

## 3. Context Budgeting & Long Documents

- **Optimal Operating Range**: System 1 decisions achieve highest precision and lowest latency when `state` is sized between 50 and 4,000 tokens (1–10 pages of clean text).
- **Processing Extended Documents (Contracts, System Logs)**:
  - For massive corpora (> 8,000 tokens), employ BM25 pre-filtering or semantic chunking first.
  - Employ System 1 as the high-speed re-ranking or verification layer across chunks (refer to the Cookbooks section).
