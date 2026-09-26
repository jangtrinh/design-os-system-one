---
name: typesafe-ai
license: MIT
description: >
  Build AI-powered software with TypeSafe: small units of AI intelligence you
  can use like programming primitives. Its System One models, including Jev,
  turn natural language and application state into typed judgments and
  probabilities that code can combine. Use when a feature needs programmable
  common sense, when brainstorming what AI could make possible in an app, or
  when an LLM prompt-and-parse step could become a structured decision.
  Applications include routing, ranking, extraction, verification, and
  interactive experiences.
---

# Build with TypeSafe (Jev Model)

TypeSafe makes units of AI intelligence usable like programming primitives: small judgments you can compose into larger capabilities. Its **System One models** return fast, focused judgments that software can consume directly. **Jev** is TypeSafe's flagship and first System One model. It understands natural language and returns typed answers and probabilities rather than generating text or reasoning explanations. Code owns the workflow; the model supplies programmable common sense where ordinary code needs semantic understanding.

## Core Rules & Architecture

1. **Code is in Control**: The model never executes side-effects or business logic. Code owns branching, state, DB access, and API calls.
2. **Three Primitives**:
   - `Choice`: One-of-many selection. Returns `choice`, `probabilities` map, `confidence`.
   - `Score`: Ordered levels rating. Returns continuous `score`, `legend`, `confidence`.
   - `Noul`: Binary evaluation. Returns probability `noul` ($0.0 - 1.0$), `confidence`.
3. **Batch Questions**: Always combine related questions into a single request with the same `state` to reduce latency and token usage.
4. **Use Confidence as a Gate**: Probability tells you *what* to do; Confidence tells you *whether* to automate or escalate to human review.

## SDK Quick References

### Python (`typesafe-sdk`)
```python
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

client = TypeSafeClient()
response = client.system_one(
    state="Customer message or structured data",
    questions={
        "category": Choice(instructions="Category", criteria={"a": "desc A", "b": "desc B"}),
        "sentiment": Score(instructions="Sentiment", criteria=["Negative", "Neutral", "Positive"]),
        "is_urgent": Noul(instructions="Message conveys urgency")
    }
)
```

### TypeScript / JavaScript (`@typesafe-ai/sdk`)
```typescript
import { TypeSafeClient, choice, score, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
const response = await client.systemOne({
  state: { text: "Customer message" },
  questions: {
    category: choice("Select category", { a: "desc A", b: "desc B" }),
    sentiment: score("Sentiment", ["Negative", "Neutral", "Positive"]),
    is_urgent: noul("Message conveys urgency")
  }
});
```

### Direct HTTP REST API
```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <TYPESAFE_API_KEY>
Content-Type: application/json
```

## Local Knowledge Documentation

For deep technical details, check the local knowledge base in `docs/`:
- [00. Index & Overview](docs/00-index.md)
- [01. System One Concept](docs/01-system-one-concept.md)
- [02. Core Primitives](docs/02-core-primitives.md)
- [03. State & Context](docs/03-state-and-context.md)
- [04. Confidence & Routing](docs/04-confidence-and-routing.md)
- [05. REST API Reference](docs/05-rest-api-reference.md)
- [06. Python SDK](docs/06-python-sdk.md)
- [07. TypeScript SDK](docs/07-javascript-sdk.md)
- [08. Architectural Patterns](docs/08-architectural-patterns.md)
- [09. Cookbooks & Recipes](docs/09-cookbooks-and-recipes.md)
- [10. Models & Jaggedness](docs/10-models-and-limits.md)
- [Full Raw Documentation](docs/raw-full-docs.md)
