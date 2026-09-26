"""实验：置信度能不能预测正确率？（这是校准的核心问题）

方法：造 24 条有明确答案的分类题（含清晰题和模糊题），
记录 答案对错 + 置信度 + 概率分布，看三者关系。
"""
import io, contextlib, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# (文本, 期望类别, 标注难度) —— 类别固定四个
cases = [
    # 清晰题（单一诉求，信号明确）
    ("你们这个月扣了我两次钱，第二笔是重复的，我要退回来。", "billing", "清晰"),
    ("我想问一下发票怎么开，公司抬头。", "billing", "清晰"),
    ("登录页面一直转圈，进不去后台。", "tech", "清晰"),
    ("API 返回 500，日志里有一堆报错。", "tech", "清晰"),
    ("快递显示已签收但我没收到，帮我查一下。", "logistics", "清晰"),
    ("东西什么时候能发？下单三天了。", "logistics", "清晰"),
    ("你们有没有企业版？想了解一下报价。", "sales", "清晰"),
    ("能不能安排人给我们做个产品演示？", "sales", "清晰"),
    # 模糊题（多诉求 / 信号弱）
    ("我要退款，东西还没发货。", "billing", "模糊"),
    ("这个功能一直报错，顺便问下能不能退款。", "tech", "模糊"),
    ("发票开错了，而且东西也没到。", "billing", "模糊"),
    ("我想投诉，你们的服务太差了。", "sales", "模糊"),
    ("怎么升级套餐？另外登录有问题。", "sales", "模糊"),
    ("订单显示发货了，但我没收到，能退钱吗？", "logistics", "模糊"),
    ("我要买，但是要先解决技术问题。", "sales", "模糊"),
    ("东西坏了，能退吗？", "tech", "模糊"),
    # 无关/边界
    ("你好。", "sales", "边界"),
    ("在吗？", "sales", "边界"),
    ("转人工。", "sales", "边界"),
    ("谢谢。", "sales", "边界"),
    ("测试。", "sales", "边界"),
    ("。。。", "sales", "边界"),
    ("请问你们公司在哪里？", "sales", "边界"),
    ("这个文档的链接是多少？", "tech", "边界"),
]

criteria = {"billing": "账单、退款、付款、发票",
            "logistics": "物流、发货、快递、收货",
            "tech": "技术故障、报错、登录问题", 
            "sales": "售前咨询、购买意向、要演示"}

print("=" * 92)
print("实验：置信度能否预测正确率？")
print("=" * 92)
print(f"{'难度':4s} {'期望':>9s} {'预测':>9s} {'conf':>6s} {'最高概率':>7s}  文本")
print("-" * 92)

rows = []
t0 = time.perf_counter()
for text, expect, diff in cases:
    r = agent.predict(text, {"q": {"type": "choice",
        "instructions": "这条客服消息属于哪个类别？", "criteria": criteria}})
    a = r["answers"]["q"]
    top_p = max(a["probabilities"].values())
    ok = a["choice"] == expect
    rows.append((diff, ok, a["confidence"], top_p))
    print(f"{diff:4s} {expect:>9s} {a['choice']:>9s} {a['confidence']:6.3f} {top_p:7.3f}  {'✓' if ok else '✗'} {text[:32]}")
ms = (time.perf_counter() - t0) * 1000

print("-" * 92)
print(f"{len(cases)} 条，{ms:.0f} ms（{ms/len(cases):.1f} ms/条）")
print()
# 按置信度分档看正确率
print("按置信度分档：")
for lo, hi, name in [(0.0, 0.4, "<0.4   "), (0.4, 0.7, "0.4-0.7"), (0.7, 0.9, "0.7-0.9"), (0.9, 1.01, "≥0.9   ")]:
    sel = [r for r in rows if lo <= r[2] < hi]
    if not sel:
        print(f"  {name}: 无样本")
        continue
    acc = sum(1 for r in sel if r[1]) / len(sel)
    print(f"  {name}: {sum(1 for r in sel if r[1])}/{len(sel)} 正确 = {acc*100:.0f}%")

print()
print("按难度分组：")
for d in ["清晰", "模糊", "边界"]:
    sel = [r for r in rows if r[0] == d]
    acc = sum(1 for r in sel if r[1]) / len(sel)
    avg_c = sum(r[2] for r in sel) / len(sel)
    print(f"  {d}: {sum(1 for r in sel if r[1])}/{len(sel)} 正确 = {acc*100:.0f}%，平均置信度 {avg_c:.3f}")
