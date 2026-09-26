# design-os-system-one: Knowledge Map & Documentation Index

Welcome to the comprehensive knowledge base for **design-os-system-one** and the **System 1 Dual-Brain Architecture**. This documentation synthesizes on-device System 1 intelligence (Laya-MLX) with cloud-scale triage (TypeSafe JEV) to build deterministic, sub-10ms autonomous agent pipelines.

---

## 🧭 Learning & Exploration Roadmap

| Order | Document | Focus Areas | Target Audience |
| :--- | :--- | :--- | :--- |
| **01** | [**01. System One Philosophy**](01-system-one-concept.md) | System 1 vs System 2, Calibrated Probabilities, and the "Code in Control" paradigm. | Architects, New Developers |
| **02** | [**02. Core Primitives**](02-core-primitives.md) | The 3 core questions: `Choice`, `Score`, `Noul`, and multi-question atomic batching. | Backend Developers, AI Engineers |
| **03** | [**03. State & Context Management**](03-state-and-context.md) | Structured State (JSON, Text, Tables, Code) and context window optimization. | Prompt Engineers, Backend Devs |
| **04** | [**04. Confidence & Gated Routing**](04-confidence-and-routing.md) | Distinguishing `probability` vs `confidence`, confidence-gated routing, self-consistency. | Reliability Engineers, Tech Leads |
| **05** | [**05. REST API Reference**](05-rest-api-reference.md) | HTTP `POST /v1/systemone`, Auth headers, JSON schemas, status codes, and error envelopes. | Systems Integrators, Any Language |
| **06** | [**06. Python SDK Reference**](06-python-sdk.md) | `typesafe-sdk`, Sync & Async Clients, Type Hints, Retry Policy, exception handling. | Python Developers, ML Engineers |
| **07** | [**07. TypeScript / JS SDK Reference**](07-javascript-sdk.md) | `@typesafe-ai/sdk`, helper functions (`choice`, `score`, `noul`), Type inference, Promises. | Frontend / Fullstack Devs, Node.js |
| **08** | [**08. Architectural Patterns**](08-architectural-patterns.md) | 5 Golden Patterns: Speculative Fan-out, Confidence Routing, Composite Scoring, Intent Routing, SDE Cascade. | Software Architects, Leads |
| **09** | [**09. Production Cookbooks & Recipes**](09-cookbooks-and-recipes.md) | 10+ end-to-end recipes: Re-ranking, Semantic find, LLM Guardrails, Entity extraction, Tool routing. | Full Development Team |
| **10** | [**10. Model Specs & Jagged Edges**](10-models-and-limits.md) | Model specs, latency ceilings, token budgets, and the jagged edge catalog to avoid. | Operations & DevOps Engineers |
| **Case Study** | [**Empirical Benchmark & Battle Journal**](case-study.md) | 290-line empirical benchmark report, battle journal, and speculative commit engine architecture. | All Engineers & Decision Makers |

---

## ⚡ 30-Second Overview

- **What is System One?** Unlike autoregressive LLMs designed for generative prose, System One is purpose-built for software: it takes an arbitrary `state` + typed `questions` and returns strongly typed data with calibrated `probabilities` and `confidence` scores.
- **How does it differ from generative LLMs (GPT-4, Claude, Gemini)?**
  - Generative LLMs represent **System Two**: deliberate, streaming text generation, high latency (3–8s), high cost, and fragile JSON schema parsing.
  - System One represents **Fast Intuition**: non-autoregressive, sub-10ms on-device execution (6.53ms with Laya-MLX), 95% cheaper, and zero hallucinations about structure.
- **Code in Control:** The model serves as programmable semantic common sense embedded within conditional branches (`if/else`), while your application code retains deterministic control over state transitions, database mutations, and API calls.
