# 06. Python SDK Reference (`typesafe-sdk`)

Official client SDK for integrating TypeSafe System One into Python applications (Python >= 3.10).

---

## 1. Installation

```bash
# Using pip
pip install typesafe-sdk

# Or using uv (recommended)
uv add typesafe-sdk
```

---

## 2. API Key Configuration

The SDK automatically resolves `TYPESAFE_API_KEY` from environment variables:

```bash
export TYPESAFE_API_KEY="ts_live_your_api_key_here"
```

Or pass it explicitly during client initialization:

```python
from typesafe_sdk import TypeSafeClient

client = TypeSafeClient(api_key="ts_live_your_api_key_here")
```

---

## 3. Synchronous Client

```python
import os
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

client = TypeSafeClient()

customer_feedback = """
The app is extremely sluggish when browsing large product catalogs, and occasionally crashes to the home screen. 
I am testing on an iPhone 14 Pro, iOS 17.5.
"""

response = client.system_one(
    state=customer_feedback,
    model="jev-latest", # Optional, defaults to jev-latest
    questions={
        "category": Choice(
            instructions="Classify reported technical issue",
            criteria={
                "perf_issue": "Performance degradation, slow latency, stutter",
                "crash_bug": "Application termination, fatal crash",
                "ui_ux": "Layout glitch, visual defect, usability issue"
            }
        ),
        "severity": Score(
            instructions="Impact severity on user workflow",
            criteria=[
                "Minor annoyance, core workflow unimpeded",
                "Substantial friction, partial feature disruption",
                "Catastrophic blocker, core functionality completely inaccessible"
            ]
        ),
        "has_device_info": Noul(
            instructions="Does the report specify hardware model and OS version?"
        )
    }
)

# Extract structured results
category = response.answers["category"]
print(f"Primary Selection: {category.choice}")
print(f"Probabilities: {category.probabilities}")
print(f"Epistemic Confidence: {category.confidence}")

severity = response.answers["severity"]
print(f"Continuous Score (0-2 scale): {severity.score:.2f}")

device_info = response.answers["has_device_info"]
print(f"Hardware Provided: {device_info.noul >= 0.8} (P = {device_info.noul})")
```

---

## 4. Asynchronous Client (`AsyncTypeSafeClient`)

Essential for FastAPI, aiohttp, Celery, or high-throughput parallel evaluation loops:

```python
import asyncio
from typesafe_sdk import AsyncTypeSafeClient, Noul

async def check_single_passage(client: AsyncTypeSafeClient, query: str, passage: str):
    response = await client.system_one(
        state={"query": query, "passage": passage},
        questions={
            "is_relevant": Noul(
                instructions="Does this passage directly or indirectly answer the query?"
            )
        }
    )
    return response.answers["is_relevant"].noul

async def main():
    async with AsyncTypeSafeClient() as client:
        passages = [
            "Passage 1 content...",
            "Passage 2 content...",
            "Passage 3 content..."
        ]
        tasks = [
            check_single_passage(client, "How to delete account", p)
            for p in passages
        ]
        results = await asyncio.gather(*tasks)
        print("Relevance probabilities:", results)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 5. Retry Policy & Timeout Configuration

In production microservices, configure explicit timeouts and jittered retry policies:

```python
from typesafe_sdk import TypeSafeClient, RetryPolicy

client = TypeSafeClient(
    timeout=15.0,  # 15s timeout ceiling
    retry_policy=RetryPolicy(
        max_retries=3,          # Up to 3 attempts
        backoff_factor=1.5,     # Exponential backoff factor
        retry_statuses=[429, 500, 502, 503, 504] # Transient error codes to retry
    )
)
```

---

## 6. Exception Hierarchy

```python
from typesafe_sdk.exceptions import (
    TypeSafeError,
    APIConnectionError,
    RateLimitError,
    BadRequestError,
    AuthenticationError
)

try:
    response = client.system_one(state=..., questions=...)
except AuthenticationError:
    print("Invalid API Key. Verify TYPESAFE_API_KEY environment variable.")
except RateLimitError as e:
    print(f"Rate limit exceeded: {e}. Back off request velocity.")
except APIConnectionError:
    print("Network disruption connecting to https://api.typesafe.ai")
except TypeSafeError as e:
    print(f"TypeSafe SDK generic exception: {e}")
```
