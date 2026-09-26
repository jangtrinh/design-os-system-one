# 04. Confidence Signals & Gated Routing

A signature breakthrough of the System 1 architecture is the ability to emit two independent mathematical coordinates simultaneously: **Calibrated Probability** and **Epistemic Confidence**.

---

## 1. Probability vs Confidence

Many engineering teams conflate probability with confidence. The distinction is vital:

| Metric | Question It Answers | Physical Intuition |
| :--- | :--- | :--- |
| **Probability ($P$)** | *What is the likelihood of this event occurring?* | "This coin flip has a 50% probability of landing on Heads." |
| **Confidence ($C$)** | *Does the available evidence suffice to be certain of that evaluation?* | "I inspected the coin thoroughly under a microscope; I am 99% confident the true distribution is 50/50." |

### The 4-Quadrant Decision Matrix

```
                        High Confidence (Certainty)
                                     ▲
                                     │
           [QUADRANT 2: DEFINITIVELY NO] │   [QUADRANT 1: FULLY AUTONOMOUS]
          P(Spam) = 0.05, Conf = 0.95   │  P(Spam) = 0.98, Conf = 0.97
          => Whitelist / Allow through   │  => Block immediately without review
                                        │
     ───────────────────────────────────┼───────────────────────────────────► Probability
                                        │
           [QUADRANT 3: AMBIGUOUS DATA]  │   [QUADRANT 4: HIGH RISK / ESCALATE]
          P(Spam) = 0.20, Conf = 0.30   │  P(Spam) = 0.85, Conf = 0.38
          => Input too brief / Ask user │  => Human-in-the-Loop review queue
                                        │
                                        ▼
                        Low Confidence (Uncertainty)
```

### The Ambiguous Edge Case
- Suppose a user enters a single word: `"help"`.
- A `Noul` question queries: *"Does the customer request invoice cancellation?"*
- The model might output $P(\text{Yes}) = 0.30$, but `confidence` will be low ($0.20$), because a single word `"help"` lacks sufficient information to draw a firm conclusion.
- In a naive system, $0.30 < 0.50$ would silently treat the result as "No". In `design-os-system-one`, low confidence ($0.20 < 0.80$) triggers an escalation branch: *"Could you clarify your request?"*.

---

## 2. Confidence-Gated Routing Pattern

Under this paradigm: **The categorical judgment (`choice` / `score` / `noul`) tells you WHAT to do; `confidence` tells you WHETHER YOU ARE PERMITTED TO DO IT AUTONOMOUSLY.**

```python
# Production Confidence-Gated Routing implementation
response = client.system_one(
    state=customer_ticket,
    questions={
        "action": Choice(
            instructions="Select ticket remediation action",
            criteria={
                "auto_refund": "Automated refund for billing glitches under $50",
                "escalate_tier2": "Escalate to tier-2 network engineer",
                "send_faq": "Dispatch self-service documentation"
            }
        )
    }
)

answer = response.answers["action"]
selected_action = answer.choice
confidence = answer.confidence

CONFIDENCE_THRESHOLD = 0.80

if confidence >= CONFIDENCE_THRESHOLD:
    # High confidence: Execute mutation autonomously
    execute_action(selected_action)
else:
    # Low confidence: Route to human supervisor queue
    route_to_human_agent(
        ticket=customer_ticket,
        suggested_action=selected_action,
        model_confidence=confidence,
        probabilities=answer.probabilities
    )
```

---

## 3. Self-Consistency Verification

For mission-critical operations (financial audits, content moderation, access delegation), deploy self-consistency verification:
1. Issue the affirmative question: *"Does this content violate safety policy?"*
2. Issue the converse question: *"Is this content completely safe and compliant?"*
3. Compare distributions: If the affirmative returns $P = 0.90$ and the converse also returns $P = 0.80$ (a mathematically impossible combined distribution), the input exhibits contradictory sarcasm or adversarial phrasing $\rightarrow$ automatically raise an alert for frontier LLM arbitration or human audit.
