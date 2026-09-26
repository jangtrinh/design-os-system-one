#!/usr/bin/env python3
"""Laya → Jev cascade classifier.

Cheap local model first, paid API only when the local model is unsure:

    input → Laya local (7.6 ms)
              ├─ confidence >= threshold → accept the local answer
              └─ confidence <  threshold → escalate to Jev (588 ms)

Measured on the 40-case benchmark in this directory:
    pure Laya      57% accuracy,   7.6 ms
    pure Jev       78% accuracy, 588 ms
    cascade @0.60  78% accuracy, 327 ms   (matches Jev, 1.8x faster)

Known limitations — read before reusing:
  1. A single global threshold is a compromise. The optimum differs by
     difficulty (clear: don't escalate; ambiguous: 0.60; boundary: 0.30).
  2. Laya's confidence→accuracy curve is not monotonic; mid-range buckets
     are noisy at these sample sizes.
  3. Confident-but-wrong answers survive the cascade. Laya reports 0.92 on
     "我要退款，东西还没发货。" while answering wrong; 0.92 >= 0.60, so it
     is accepted without escalation.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

DEFAULT_THRESHOLD = 0.60
JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
JEV_MODEL = os.environ.get("TYPESAFE_MODEL", "jev-latest")
CONFIG_PATH = Path.home() / ".pi" / "agent" / "pi-jev-browser.config.json"


def jev_key() -> str:
    key = os.environ.get("TYPESAFE_API_KEY")
    if key:
        return key
    if not CONFIG_PATH.exists():
        raise SystemExit(
            "No Jev credentials. Set TYPESAFE_API_KEY, or create "
            f"{CONFIG_PATH} with {{'typesafe': {{'apiKey': '...'}}}}."
        )
    # Read-only: this file belongs to another tool, never write to it.
    return json.loads(CONFIG_PATH.read_text())["typesafe"]["apiKey"]


class JevBackend:
    """Direct HTTP — no SDK dependency."""

    def __init__(self) -> None:
        self.key = jev_key()
        self.calls = 0

    def ask(self, state: str, question: str, criteria: dict[str, str]) -> dict[str, Any]:
        import urllib.request

        body = json.dumps({
            "state": state,
            "model": JEV_MODEL,
            "questions": {"q": {"type": "choice",
                                "instructions": question, "criteria": criteria}},
        }).encode()
        req = urllib.request.Request(
            JEV_ENDPOINT,
            data=body,
            headers={
                "authorization": f"Bearer {self.key}",
                "content-type": "application/json",
            },
        )
        self.calls += 1
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read())
        a = payload["answers"]["q"]
        return {"choice": a["choice"], "confidence": a["confidence"],
                "probabilities": a.get("probabilities", {}), "source": "jev"}


class LayaBackend:
    """Local MLX inference. First call loads the model (tens of seconds)."""

    def __init__(self, checkpoint: str = "aac6fef/laya-multilingual-mlx") -> None:
        import contextlib
        import io

        import laya_mlx as laya

        # Model load prints debug lines to stdout; swallow them.
        with contextlib.redirect_stdout(io.StringIO()):
            self.agent = laya.load(checkpoint)
        self.calls = 0

    def ask(self, state: str, question: str, criteria: dict[str, str]) -> dict[str, Any]:
        self.calls += 1
        r = self.agent.predict(state, {
            "q": {"type": "choice", "instructions": question, "criteria": criteria}
        })
        a = r["answers"]["q"]
        return {"choice": a["choice"], "confidence": a["confidence"],
                "probabilities": a.get("probabilities", {}), "source": "laya"}


class Cascade:
    def __init__(self, threshold: float = DEFAULT_THRESHOLD, jev: bool = True) -> None:
        self.threshold = threshold
        self.laya = LayaBackend()
        self.jev = JevBackend() if jev else None

    def ask(self, state: str, question: str, criteria: dict[str, str]) -> dict[str, Any]:
        t0 = time.perf_counter()
        first = self.laya.ask(state, question, criteria)
        if first["confidence"] >= self.threshold or self.jev is None:
            first["escalated"] = False
            first["ms"] = (time.perf_counter() - t0) * 1000
            return first

        second = self.jev.ask(state, question, criteria)
        second["escalated"] = True
        second["laya_choice"] = first["choice"]
        second["laya_conf"] = first["confidence"]
        second["ms"] = (time.perf_counter() - t0) * 1000
        return second


DEFAULT_CRITERIA = {
    "billing": "账单、退款、付款、发票",
    "logistics": "物流、发货、快递、收货",
    "tech": "技术故障、报错、登录问题",
    "sales": "售前咨询、购买意向、要演示",
}
DEFAULT_QUESTION = "这条客服消息属于哪个类别？"


def main() -> None:
    import sys

    threshold = float(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_THRESHOLD
    text = sys.argv[2] if len(sys.argv) > 2 else "我要退款，东西还没发货。"

    cascade = Cascade(threshold=threshold)
    r = cascade.ask(text, DEFAULT_QUESTION, DEFAULT_CRITERIA)

    print(f"\ninput     : {text}")
    print(f"threshold : {threshold}")
    print(f"answer    : {r['choice']}  (confidence {r['confidence']:.2f}, from {r['source']})")
    if r.get("escalated"):
        print(f"            escalated — Laya had said {r['laya_choice']} "
              f"(confidence {r['laya_conf']:.2f})")
    else:
        print("            solved locally, no API call")
    print(f"latency   : {r['ms']:.0f} ms")
    print(f"calls     : laya={cascade.laya.calls} jev={cascade.jev.calls if cascade.jev else 0}")


if __name__ == "__main__":
    main()
