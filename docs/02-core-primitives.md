# 02. Core Primitives (Choice, Score, Noul)

In `design-os-system-one`, every interaction with the System 1 engine centers around **3 primitive question types**. Each is engineered to solve a distinct class of deterministic software decisions.

---

## 1. `Choice` (Discrete Finite Classification)

### Purpose
Used when classifying state into **exactly one choice** from a predefined set of mutual options (`criteria`).

### Question Schema
```json
{
  "type": "choice",
  "instructions": "Selection criteria description",
  "criteria": {
    "key_1": "Detailed criteria for option 1",
    "key_2": "Detailed criteria for option 2",
    "key_3": "Detailed criteria for option 3"
  }
}
```

### Response Schema (`ChoiceResponse`)
```json
{
  "type": "choice",
  "choice": "key_1",
  "probabilities": {
    "key_1": 0.842,
    "key_2": 0.150,
    "key_3": 0.008
  },
  "confidence": 0.912
}
```
- `choice`: Key of the option with the highest calibrated probability.
- `probabilities`: Normalized probability distribution (sums to 1.0) across all provided options.
- `confidence`: Epistemic certainty metric regarding this evaluation ($0.0$ to $1.0$).

### Best Practices for `Choice`
1. **Always Include an Escape Hatch**: When classifying open-ended human text, include an option such as `other` or `none_of_the_above` to prevent forced misclassification.
2. **Explicit Criteria Descriptions**: Rather than brief keys (`billing`), provide crisp contextual descriptions (`"Invoices, subscription upgrades, charges, or refund disputes"`).
3. **Choice Set Cardinality**: Keep candidate spaces $\le 20$ when executing on-device with Laya-MLX. For candidate sets between 20 and 50, escalate to TypeSafe JEV Cloud or group candidates hierarchically.

---

## 2. `Score` (Ordinal Progression & Continuous Scale)

### Purpose
Used to evaluate an attribute along an **ordered scale of levels**, from lowest to highest (e.g., urgency intensity, code quality, risk severity, technical complexity).

### Question Schema
```json
{
  "type": "score",
  "instructions": "Evaluate customer dissatisfaction intensity",
  "criteria": [
    "Calm and purely factual description of events",
    "Annoyed or frustrated but remains polite",
    "Extremely hostile, abusive language, or threatening cancellation"
  ]
}
```
*Note: `criteria` is an array. Index `0`, `1`, `2` represents ordinal progression from lowest to highest.*

### Response Schema (`ScoreResponse`)
```json
{
  "type": "score",
  "score": 1.74,
  "legend": {
    "0": "Calm and purely factual description of events",
    "1": "Annoyed or frustrated but remains polite",
    "2": "Extremely hostile, abusive language, or threatening cancellation"
  },
  "confidence": 0.885
}
```
- `score`: Continuous float (e.g., $1.74$ sits between level 1 and level 2). Calculated as the mathematical expectation over the level probability distribution.
- `confidence`: Epistemic certainty regarding the calculated score.

### Superiority over Generative Prompting
Unlike prompting an LLM to "rate this from 1 to 10" (which produces severe clustering around 7–8 and poor calibration), `Score` anchors evaluation to explicit benchmark descriptions and computes mathematical expectation directly from logits.

---

## 3. `Noul` (Binary Probability / Proposition Evaluation)

### Purpose
`Noul` (derived from Boolean Null-One) tests whether **a specific condition or predicate is true**. It returns the calibrated probability $P(\text{Yes})$.

### Question Schema
```json
{
  "type": "noul",
  "instructions": "Does this text contain an urgent or time-sensitive request?"
}
```

### Response Schema (`NoulResponse`)
```json
{
  "type": "noul",
  "noul": 0.965,
  "confidence": 0.940
}
```
- `noul`: Calibrated probability from $0.0$ to $1.0$ that the statement is **YES** (satisfies the condition).
- `confidence`: Model certainty regarding the evidence sufficiency.

### When to Use `Noul` vs `Choice`
- Use `Noul` for independent, non-mutually exclusive propositions: "Contains PII?", "Requires admin authorization?", "Contains SQL injection characters?".
- If an entity possesses multiple orthogonal attributes, query multiple `Noul` primitives simultaneously rather than trying to construct an explosive permutation of `Choice` combinations.

---

## 4. Multi-Question Batching

A key architectural advantage of System 1 is that you can evaluate **dozens of heterogeneous questions** (mixing Choice, Score, and Noul) in a single invocation against the same `state`.

```json
{
  "state": "I purchased the Pro plan yesterday but my account still displays Free. Grant access immediately or issue a full refund within 1 hour!",
  "model": "jev-latest",
  "questions": {
    "intent": {
      "type": "choice",
      "instructions": "Classify the primary ticket intent",
      "criteria": {
        "upgrade_issue": "Subscription upgrade or license synchronization issue",
        "refund_request": "Explicit request for payment return",
        "feature_inquiry": "Product capability question"
      }
    },
    "customer_sentiment": {
      "type": "score",
      "instructions": "Customer emotional intensity",
      "criteria": [
        "Positive or normal factual tone",
        "Mild frustration or disappointment",
        "Extremely aggressive, hostile, or threatening"
      ]
    },
    "churn_risk": {
      "type": "noul",
      "instructions": "Is the user threatening cancellation or chargeback?"
    },
    "urgent_sla": {
      "type": "noul",
      "instructions": "Does the request impose an explicit tight deadline (< 2 hours)?"
    }
  }
}
```

### Advantages of Batching
1. **Single State Transmission**: Context is tokenized and embedded once, drastically reducing network overhead.
2. **Sub-15ms Local Parallel Evaluation**: Laya-MLX evaluates batch question heads in parallel across Unified Memory.
3. **90% Cost Reduction**: Eliminates multiple round-trip generative LLM queries.
