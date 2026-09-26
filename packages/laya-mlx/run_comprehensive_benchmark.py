#!/usr/bin/env python3
"""
Comprehensive Benchmark: Laya MLX vs Laya PyTorch MPS vs TypeSafe JEV vs Cascade
Evaluates:
  1. Latency (P50, P95, Mean in ms)
  2. Accuracy across Clear, Ambiguous, and Boundary cases
  3. Escalation rate & cost reduction in Cascade mode
"""

import os
import sys
import time
import json
import urllib.request
from typing import Dict, Any, List

JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
JEV_API_KEY = os.environ.get("TYPESAFE_API_KEY")

CRITERIA = {
    "billing": "Hóa đơn, hoàn tiền, thanh toán, biểu phí",
    "technical": "Lỗi kỹ thuật, crash, không đăng nhập được, bug",
    "logistics": "Giao hàng, vận chuyển, tình trạng đơn hàng",
    "sales": "Tư vấn mua hàng, báo giá, tài khoản doanh nghiệp",
}
QUESTION = "Tin nhắn của khách hàng thuộc bộ phận nào?"

# 20 Test Cases in Vietnamese with ground truth and difficulty tiers
BENCHMARK_CASES = [
    # Clear (Đơn ý định rõ ràng)
    {"text": "Tôi bị trừ tiền 2 lần vào thẻ Visa, vui lòng hoàn lại tiền.", "expected": "billing", "tier": "clear"},
    {"text": "Làm thế nào để xuất hóa đơn VAT điện tử cho công ty?", "expected": "billing", "tier": "clear"},
    {"text": "Thanh toán báo lỗi giao dịch không thành công mã 05.", "expected": "billing", "tier": "clear"},
    {"text": "App cứ mở lên là bị văng ra màn hình chính, dùng iPhone 15.", "expected": "technical", "tier": "clear"},
    {"text": "API trả về status 500 Internal Server Error liên tục từ sáng nay.", "expected": "technical", "tier": "clear"},
    {"text": "Tôi quên mật khẩu và link reset không gửi về email.", "expected": "technical", "tier": "clear"},
    {"text": "Đơn hàng #8921 của tôi giao tới đâu rồi shop?", "expected": "logistics", "tier": "clear"},
    {"text": "Hệ thống báo đã giao nhưng tôi chưa nhận được kiện hàng nào.", "expected": "logistics", "tier": "clear"},
    {"text": "Tôi muốn đổi địa chỉ nhận hàng sang quận khác có được không?", "expected": "logistics", "tier": "clear"},
    {"text": "Bảng giá gói Enterprise cho team 50 người là bao nhiêu?", "expected": "sales", "tier": "clear"},
    {"text": "Bên em có hỗ trợ demo sản phẩm trực tiếp qua Zoom không?", "expected": "sales", "tier": "clear"},

    # Ambiguous (Đa ý định, ranh giới mập mờ)
    {"text": "Hệ thống lỗi không dùng được cả tuần nay, tôi muốn hủy dịch vụ và đòi lại tiền.", "expected": "billing", "tier": "ambiguous"},
    {"text": "Hàng giao tới nơi bị vỡ nát, tôi không nhận và yêu cầu hoàn tiền gấp.", "expected": "billing", "tier": "ambiguous"},
    {"text": "Đăng nhập không được mà đang tính mua thêm 5 license cho nhân viên.", "expected": "sales", "tier": "ambiguous"},
    {"text": "Hóa đơn gửi sai mã số thuế mà hàng cũng chưa thấy chuyển tới.", "expected": "billing", "tier": "ambiguous"},
    {"text": "Muốn mua bản quyền mà tính năng export pdf bị lỗi font tiếng Việt.", "expected": "sales", "tier": "ambiguous"},

    # Boundary (Nhiễu, chào hỏi, cộc lốc)
    {"text": "Alo", "expected": "sales", "tier": "boundary"},
    {"text": "Shop còn đó không", "expected": "sales", "tier": "boundary"},
    {"text": "???", "expected": "technical", "tier": "boundary"},
    {"text": "cần trợ giúp gấp", "expected": "technical", "tier": "boundary"},
]

def call_jev(text: str) -> Dict[str, Any]:
    if not JEV_API_KEY:
        return {"choice": "unknown", "confidence": 0.0, "latency_ms": 0.0, "source": "jev", "error": "No API key"}
    
    t0 = time.perf_counter()
    body = json.dumps({
        "state": text,
        "model": "jev-latest",
        "questions": {
            "dept": {
                "type": "choice",
                "instructions": QUESTION,
                "criteria": CRITERIA
            }
        }
    }).encode()

    req = urllib.request.Request(
        JEV_ENDPOINT,
        data=body,
        headers={
            "authorization": f"Bearer {JEV_API_KEY}",
            "content-type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    latency = (time.perf_counter() - t0) * 1000
    ans = data["answers"]["dept"]
    return {
        "choice": ans["choice"],
        "confidence": ans["confidence"],
        "probabilities": ans.get("probabilities", {}),
        "latency_ms": latency,
        "source": "jev"
    }

def main():
    print("=" * 60)
    print("SYSTEM 1 BENCHMARK: LAYA MLX vs JEV vs CASCADE ROUTER")
    print(f"Hardware: Apple Silicon | Total Cases: {len(BENCHMARK_CASES)}")
    print("=" * 60)

    # 1. Load Laya MLX
    print("\n[1/4] Loading Laya-MLX...")
    import laya_mlx as laya
    t_load = time.perf_counter()
    agent_mlx = laya.load("aac6fef/laya-multilingual-mlx")
    print(f"Laya-MLX ready in {time.perf_counter() - t_load:.2f}s")

    # Warmup MLX
    _ = agent_mlx.predict("Test warmup", {
        "dept": {"type": "choice", "instructions": QUESTION, "criteria": CRITERIA}
    })

    # Run Benchmark for MLX
    print("\n[2/4] Running Pure Laya-MLX Evaluation...")
    mlx_results = []
    for c in BENCHMARK_CASES:
        t0 = time.perf_counter()
        res = agent_mlx.predict(c["text"], {
            "dept": {"type": "choice", "instructions": QUESTION, "criteria": CRITERIA}
        })
        lat = (time.perf_counter() - t0) * 1000
        ans = res["answers"]["dept"]
        is_correct = (ans["choice"] == c["expected"])
        mlx_results.append({
            "text": c["text"],
            "expected": c["expected"],
            "choice": ans["choice"],
            "confidence": ans["confidence"],
            "probabilities": ans.get("probabilities", {}),
            "correct": is_correct,
            "tier": c["tier"],
            "latency_ms": lat
        })

    # Run Benchmark for JEV
    print("\n[3/4] Running Pure TypeSafe JEV Evaluation...")
    jev_results = []
    for c in BENCHMARK_CASES:
        res = call_jev(c["text"])
        is_correct = (res["choice"] == c["expected"])
        jev_results.append({
            "text": c["text"],
            "expected": c["expected"],
            "choice": res["choice"],
            "confidence": res["confidence"],
            "probabilities": res.get("probabilities", {}),
            "correct": is_correct,
            "tier": c["tier"],
            "latency_ms": res["latency_ms"]
        })

    # Run Cascade Evaluation (Threshold = 0.55)
    print("\n[4/4] Running Cascade Router (Laya MLX -> Jev fallback @ conf < 0.55)...")
    cascade_results = []
    CASCADE_THRESHOLD = 0.55
    escalated_count = 0

    for i, c in enumerate(BENCHMARK_CASES):
        mlx_res = mlx_results[i]
        if mlx_res["confidence"] >= CASCADE_THRESHOLD:
            # Solved locally
            cascade_results.append({
                "choice": mlx_res["choice"],
                "confidence": mlx_res["confidence"],
                "correct": mlx_res["correct"],
                "latency_ms": mlx_res["latency_ms"],
                "source": "laya_mlx",
                "tier": c["tier"]
            })
        else:
            # Escalated to JEV
            escalated_count += 1
            jev_res = jev_results[i]
            total_lat = mlx_res["latency_ms"] + jev_res["latency_ms"]
            cascade_results.append({
                "choice": jev_res["choice"],
                "confidence": jev_res["confidence"],
                "correct": jev_res["correct"],
                "latency_ms": total_lat,
                "source": "jev_escalated",
                "tier": c["tier"]
            })

    # Output Summary
    print("\n" + "=" * 60)
    print("FINAL BENCHMARK COMPARISON TABLE")
    print("=" * 60)

    def stats(res_list):
        acc = sum(1 for r in res_list if r["correct"]) / len(res_list) * 100
        lats = [r["latency_ms"] for r in res_list]
        lats.sort()
        p50 = lats[len(lats)//2]
        p95 = lats[int(len(lats)*0.95)]
        mean = sum(lats)/len(lats)
        return acc, mean, p50, p95

    acc_mlx, mean_mlx, p50_mlx, p95_mlx = stats(mlx_results)
    acc_jev, mean_jev, p50_jev, p95_jev = stats(jev_results)
    acc_cas, mean_cas, p50_cas, p95_cas = stats(cascade_results)

    print(f"{'Engine':<20} | {'Accuracy':<10} | {'P50 (ms)':<10} | {'Mean (ms)':<10} | {'Local Ratio':<12}")
    print("-" * 72)
    print(f"{'Laya MLX (Local)':<20} | {acc_mlx:>8.1f}% | {p50_mlx:>8.2f}ms | {mean_mlx:>8.2f}ms | {'100%':>10}")
    print(f"{'TypeSafe JEV (Cloud)':<20} | {acc_jev:>8.1f}% | {p50_jev:>8.2f}ms | {mean_jev:>8.2f}ms | {'0%':>10}")
    print(f"{'Cascade Router':<20} | {acc_cas:>8.1f}% | {p50_cas:>8.2f}ms | {mean_cas:>8.2f}ms | {f'{100 - escalated_count/len(BENCHMARK_CASES)*100:.0f}%':>10}")

    # Accuracy by tier
    print("\n--- Accuracy Breakdown by Tier ---")
    for tier in ["clear", "ambiguous", "boundary"]:
        t_mlx = [r for r in mlx_results if r["tier"] == tier]
        t_jev = [r for r in jev_results if r["tier"] == tier]
        t_cas = [r for r in cascade_results if r["tier"] == tier]
        acc_t_mlx = sum(1 for r in t_mlx if r["correct"]) / len(t_mlx) * 100 if t_mlx else 0
        acc_t_jev = sum(1 for r in t_jev if r["correct"]) / len(t_jev) * 100 if t_jev else 0
        acc_t_cas = sum(1 for r in t_cas if r["correct"]) / len(t_cas) * 100 if t_cas else 0
        print(f"Tier [{tier:<10}] (n={len(t_mlx)}): Laya-MLX: {acc_t_mlx:5.1f}% | JEV: {acc_t_jev:5.1f}% | Cascade: {acc_t_cas:5.1f}%")

    out_file = "/Users/jangtrinh/Products/laya-mlx/benchmark_cascade_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "mlx": mlx_results,
            "jev": jev_results,
            "cascade": cascade_results,
            "summary": {
                "acc_mlx": acc_mlx, "mean_mlx": mean_mlx,
                "acc_jev": acc_jev, "mean_jev": mean_jev,
                "acc_cas": acc_cas, "mean_cas": mean_cas,
                "escalated_count": escalated_count,
                "total": len(BENCHMARK_CASES)
            }
        }, f, indent=2, ensure_ascii=False)
    print(f"\nSaved raw results to: {out_file}")

if __name__ == "__main__":
    main()
