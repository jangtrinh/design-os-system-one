# laya-jev-lab

Measured comparisons of typed-decision models — **Jev** (TypeSafe, closed API) vs **Laya** (Convai, open weights) — plus a working **cascade** that matches Jev's accuracy at ~1.8× the speed.

Everything here was run on an Apple M4 Max (macOS 27, Python 3.14, MLX 0.32.2). Every number in this README comes from a script in this repo, and the raw output is in [`results/`](results/).

## Why this repo exists

Jev and Laya are the same idea from two directions: **don't generate text — answer a typed question and return a probability.** Jev is a closed API; Laya is open-weight and runs locally in milliseconds.

Almost all published comparisons are vendor-supplied. This repo is an independent attempt to answer three practical questions:

1. **Which primitives are actually reliable?** (`choice` / `score` / `noul`)
2. **Can confidence be trusted to gate automation?**
3. **Does a local-first cascade buy you anything over just calling the API?**

Short answers: only some primitives, only sometimes, and yes — if your traffic is mostly clear-cut.

## Headline results

### Jev vs Laya, 40 Chinese support-ticket classifications

| | accuracy | mean confidence | latency |
|---|---|---|---|
| Jev (API) | **31/40 = 78%** | 0.88 | 588 ms |
| Laya (local MLX) | 23/40 = 57% | 0.71 | **7.6 ms** |

By difficulty:

| tier | Jev | Laya |
|---|---|---|
| clear (single intent), n=20 | **100%** | 75% |
| ambiguous (multi-intent), n=10 | 70% | 60% |
| boundary ("你好", "???", "test"), n=10 | 40% | 20% |

Jev is perfect on clear inputs, frequently with confidence exactly 1.00. Both models struggle on boundary inputs — those messages genuinely have no correct label, which is a task-design problem, not a model problem.

### The cascade

```
input → Laya local (7.6 ms)
          ├─ confidence ≥ threshold → accept local result
          └─ confidence <  threshold → escalate to Jev (588 ms)
```

```python
first = laya.ask(state, question, criteria)
if first["confidence"] >= threshold:
    return first                              # solved locally
return jev.ask(state, question, criteria)     # escalate
```

Threshold sweep on the 40-case benchmark:

| threshold | escalation rate | accuracy | mean latency | vs. pure Jev |
|---|---|---|---|---|
| pure Laya | 0% | 57% | 8 ms | 77× faster |
| 0.30 | 32% | 68% | 196 ms | 3.0× |
| 0.40 | 42% | 75% | 254 ms | 2.3× |
| 0.50 | 50% | 75% | 298 ms | 2.0× |
| **0.60** | **55%** | **78%** | **327 ms** | **1.8×** |
| 0.70 | 57% | 75% | 341 ms | 1.7× |
| 0.80 | 62% | 75% | 370 ms | 1.6× |
| 0.90 | 72% | 75% | 428 ms | 1.4× |
| 0.95 | 75% | 75% | 443 ms | 1.3× |
| pure Jev | 100% | 78% | 588 ms | 1.0× |

**At 0.60 the cascade matches Jev's accuracy while solving 45% of traffic locally.** Past 0.70, raising the threshold costs latency and buys no accuracy — Laya's confidence-to-accuracy curve is not monotonic (see caveats).

## What we found about the primitives

### `noul` (P(true)): reliable for facts, useless for judgements

Same question, three language configurations, three clearly-appropriate texts:

| config | "weather is nice" | "I disagree but…" | "thanks!" |
|---|---|---|---|
| English model + English text | 0.246 | 0.223 | 0.277 |
| Multilingual model + English text | 0.003 | 0.041 | 0.066 |
| Multilingual model + Chinese text | 0.015 | 0.006 | 0.010 |

All far below where "polite and appropriate" should land. But the same primitive is excellent on **explicit facts**:

- "Does the customer request a refund?" → **0.996** on a message that clearly does.

**Rule: ask about facts ("does it mention X"), not judgements ("is it polite").**

### `choice`: destroyed by option ordering in one setting, fine in another

Enumerating all 24 permutations of a 4-option question:

| scenario | correct across 24 orderings |
|---|---|
| semantic categories (refund / logistics / tech / sales) | 0/24 — but *not* an ordering problem; it picked the same option every time |
| arbitrary clipboard items | **23/24** |
| sentiment (calm / annoyed / angry / sad) | 11/24 |

The 0/24 case was our own labelling error (the message contained two intents). An earlier conclusion of ours — "choice is order-biased" — was drawn from 4 samples and **is not supported at n=24**. See [`results/RESULTS-3.txt`](results/RESULTS-3.txt).

### The failure that matters: confident-and-wrong

Laya, same intent phrased eight ways:

| input | verdict | confidence |
|---|---|---|
| "退款。" (just "refund") | billing ✓ | **0.970** |
| "请把钱退给我。" | billing ✓ | **0.978** |
| "我要退款，东西还没发货。" | logistics ✗ | **0.923** |

**Less information produced more confidence, and more information produced a wrong answer with confidence barely lower.** Mentioning the second issue (undelivered goods) overrides the first (refund request) without the confidence reflecting the conflict.

Jev handles this specific case correctly (billing, 0.98).

## Layout

```
tests/                20 standalone experiments, each printing its own results
  01-05                support triage, moderation, primitive comparison, routing, dialogue
  06-08                web-ad classification, clipboard selection (+ diagnosis scripts)
  09-13                order-bias quantification, confidence calibration, confidence-vs-choice
cascade/
  cascade.py           the cascade (Laya → Jev), runnable CLI
  bench-cases.json     40-case Chinese support-ticket benchmark
  bench-laya.json      raw per-case results
  bench-jev.json       raw per-case results
  run2-laya.py         run the benchmark through Laya
  run2-jev.mjs         run the benchmark through Jev
  cascade2.py          threshold sweep
  cascade-check.py     robustness check
results/               raw stdout from every run
```

## Running it

**Laya (local):**

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install laya-mlx
python cascade/cascade.py 0.60 "我要退款，东西还没发货。"
```

First run downloads ~700 MB of weights. Model loading takes ~30-80 s; subsequent inference is ~8 ms.

**Jev (API)** needs a key:

```bash
export TYPESAFE_API_KEY="..."   # from https://console.typesafe.ai/keys
node cascade/run2-jev.mjs
```

`cascade.py` reads the key from `TYPESAFE_API_KEY`, or falls back to
`~/.pi/agent/pi-jev-browser.config.json` → `typesafe.apiKey` (read-only; never written).

**Individual experiments** each run standalone and print their own table:

```bash
python tests/10-confidence-signal.py     # confidence vs accuracy across 24 cases
python tests/13-noul-phrasing.py         # how wording changes noul accuracy
python tests/09-order-bias-quant.py      # all 24 option permutations
```

## Caveats — please read before citing this

- **Small samples.** The main benchmark is 40 cases; several sub-analyses are 10-24. Confidence buckets with 1-3 samples are noise. We flag this rather than hide it, but do not treat these as point estimates.
- **One task domain.** Everything here is Chinese support-ticket classification. Nothing was tested on long documents, non-Latin scripts, or English.
- **One machine, one model pair.** M4 Max, `laya-multilingual-mlx` vs `jev-latest` (reported as `jev-1.13.0`). Other checkpoints may behave differently.
- **Our labels, our criteria.** Ambiguous cases have arguable gold labels. Where a case is genuinely two-intent, that is noted in the per-case data.
- **A single global threshold is a compromise.** The optimal threshold differs by difficulty tier (clear: never escalate; ambiguous: 0.60; boundary: 0.30), so one number cannot be optimal for all traffic.
- **Cascade cost model is latency-only.** We did not measure Jev's billing. At ~393 input tokens/call, 40 calls is on the order of $0.0004 at published pricing — negligible, but unverified against an invoice.

## Two retracted conclusions

Recorded because they show how easy this is to get wrong, and because a later reader should not rediscover them:

1. **"`choice` is unreliable for arbitrary option sets."** Drawn from 4 samples. At n=24 permutations it is 23/24 correct.
2. **"Laya's confidence is trustworthy above 0.7."** Drawn from the original 24-case set where the 0.7-0.9 bucket had 3 samples at 100%. On the 40-case set that bucket is 50%.

Both were single-small-sample artifacts. The lesson is in the repo: run the larger measurement before writing the conclusion.

## Related

- [Laya](https://github.com/NandhaKishorM/laya) — the open-weight model (RLCD-trained)
- [laya-mlx](https://github.com/mizorewww/laya-mlx) — the MLX port used here
- [Jev docs](https://docs.typesafe.ai/) — TypeSafe's System One model
- [awesome-jev](https://github.com/yibie/awesome-jev) — index of projects built on Jev

## License

MIT for the code and data in this repo. Model weights are governed by their own licences (Laya: Apache-2.0; Jev is a commercial API).
