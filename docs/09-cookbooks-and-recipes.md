# 09. Cookbooks & Practical Recipes

Production-ready, copy-pasteable implementations for standard engineering problems in modern agentic architectures.

---

## Cookbook 1: Search Re-Ranking

### Problem
Keyword search (BM25 or Elasticsearch) returns candidate documents, but lexical ranking misses semantic intent and natural phrasing.

### Solution
Deploy System 1 to score relevance between `query` and each candidate document in parallel:

```python
from typesafe_sdk import TypeSafeClient, Score

client = TypeSafeClient()

def rerank_results(query: str, search_candidates: list[dict]) -> list[dict]:
    # search_candidates = [{"id": 1, "text": "..."}, ...]
    
    scored_results = []
    for item in search_candidates:
        res = client.system_one(
            state={"query": query, "document": item["text"]},
            questions={
                "relevance": Score(
                    instructions="Assess how thoroughly the document answers the user query",
                    criteria=[
                        "Irrelevant or superficial keyword match",
                        "Indirect or partially related context",
                        "Direct, comprehensive, and accurate answer"
                    ]
                )
            }
        )
        score = res.answers["relevance"].score
        scored_results.append({**item, "jev_score": score})
        
    # Sort descending by calibrated score
    scored_results.sort(key=lambda x: x["jev_score"], reverse=True)
    return scored_results
```
*Empirical impact: Improves Top-1 accuracy from 5% to 18%, and Top-10 accuracy from 38% to 62%.*

---

## Cookbook 2: Full-Stack LLM Guardrails

### Problem
Protect downstream generative models from Prompt Injection, Jailbreak attempts, and confidential data leakage without paying heavy LLM token penalties.

```python
from typesafe_sdk import TypeSafeClient, Noul, Score

client = TypeSafeClient()

def evaluate_guardrail(user_prompt: str) -> dict:
    res = client.system_one(
        state=user_prompt,
        questions={
            "is_jailbreak": Noul(
                instructions="User prompt attempts jailbreak, role reversal, or system instruction extraction"
            ),
            "harm_severity": Score(
                instructions="Potential harm severity if this request is processed",
                criteria=[
                    "Completely benign conversational intent",
                    "Ambiguous edge case or sensitive context",
                    "Explicitly malicious: weapons, malware, fraud, illegal activity"
                ]
            )
        }
    )
    
    p_jailbreak = res.answers["is_jailbreak"].noul
    harm_score = res.answers["harm_severity"].score
    
    if p_jailbreak > 0.70 or harm_score > 1.2:
        return {"action": "BLOCK", "reason": "Content safety policy violation."}
    elif p_jailbreak > 0.40 or harm_score > 0.6:
        return {"action": "WARN_AND_LOG", "reason": "Flagged for monitoring."}
    else:
        return {"action": "PASS"}
```

---

## Cookbook 3: Hallucination & Citation Verification

### Problem
A generative model outputs a factual claim with a citation quote. We must deterministically verify that the quote factually supports the claim.

```python
from typesafe_sdk import TypeSafeClient, Choice

client = TypeSafeClient()

def verify_citation(claim: str, source_quote: str, context: str) -> bool:
    res = client.system_one(
        state={
            "claim": claim,
            "quote": source_quote,
            "document_context": context
        },
        questions={
            "support_status": Choice(
                instructions="Does the source quote directly verify the claim in context?",
                criteria={
                    "supported": "Directly and factually substantiates the claim",
                    "partial": "Partially supports, but omits critical context or nuances",
                    "contradicted": "Directly contradicts the claim",
                    "unrelated": "Irrelevant to the claim"
                }
            )
        }
    )
    
    choice = res.answers["support_status"].choice
    confidence = res.answers["support_status"].confidence
    
    # Accept only with verified support and high confidence
    return choice == "supported" and confidence >= 0.75
```

---

## Cookbook 4: Semantic Date & Interval Extraction

### Problem
Users express relative temporal phrases ("next Tuesday", "late October last year"). Regex fails on nuances.

### Solution
Use System 1 to extract semantic temporal orientation, and let deterministic code calculate the calendar dates:

```python
from datetime import datetime
from typesafe_sdk import TypeSafeClient, Choice

client = TypeSafeClient()

def extract_date_semantics(text: str, reference_date: datetime):
    res = client.system_one(
        state={
            "text": text,
            "today": reference_date.strftime("%Y-%m-%d, %A")
        },
        questions={
            "time_direction": Choice(
                instructions="Temporal direction referenced in the user text",
                criteria={
                    "past": "Occurred in the past",
                    "present": "Today / current moment",
                    "future": "Scheduled for future occurrence"
                }
            ),
            "granularity": Choice(
                instructions="Temporal granularity of the reference",
                criteria={
                    "exact_day": "A specific date / calendar day",
                    "week": "A span of a week",
                    "month": "A specific month",
                    "year": "A general calendar year"
                }
            )
        }
    )
    return res.answers
```

---

## Cookbook 5: Dynamic Skill Pruning for Autonomous Swarms

### Problem
An agent system provides 150+ specialized tools and skills. Injecting 150 JSON tool schemas into the LLM system prompt exhausts context windows and degrades tool invocation accuracy.

### Solution
1. Use System 1 to determine if the user turn requires tool execution (`Noul`).
2. If true, select the single most relevant skill from the registry (`Choice`).
3. Inject **only the winning skill schema** into the agent's prompt, pruning 95% of context token overhead.
