"""验证解法：多诉求场景下，多个独立 noul 是否优于单个 choice"""
import io, contextlib, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 多诉求消息（含两类信号）
cases = [
    ("我要退款，东西还没发货。", {"退款": True, "发货": True}),
    ("没发货，退钱。", {"退款": True, "发货": True}),
    ("东西没收到，要求退款处理。", {"退款": True, "发货": True}),
    ("发票开错了，而且东西也没到。", {"退款": False, "发货": True}),
    ("东西坏了，能退吗？", {"退款": True, "发货": False}),
    # 单诉求对照
    ("我要退款。", {"退款": True, "发货": False}),
    ("东西什么时候发货？", {"退款": False, "发货": True}),
    ("查一下物流。", {"退款": False, "发货": True}),
    ("请把钱退给我。", {"退款": True, "发货": False}),
]

criteria = {"billing": "账单、退款、付款、发票", "logistics": "物流、发货、快递、收货",
            "tech": "技术故障、报错、登录问题", "sales": "售前咨询、购买意向、要演示"}

print("=" * 92)
print("验证：多诉求消息 —— 单个 choice vs 多个独立 noul")
print("=" * 92)
print(f"{'文本':26s} {'choice':>10s} {'P退款':>7s} {'P发货':>7s}  期望")
print("-" * 92)

t0 = time.perf_counter(); n = 0
choice_ok = 0; noul_ok = 0; total_signals = 0
for text, expect in cases:
    # A. 单个 choice（二选一）
    ra = agent.predict(text, {"q": {"type": "choice",
        "instructions": "这条客服消息属于哪个类别？", "criteria": criteria}})
    ca = ra["answers"]["q"]; n += 1
    # 期望的 choice 结果：如果两个诉求都有，billing 优先（退款更紧急）
    exp_choice = "billing" if expect["退款"] else "logistics"
    ok_c = ca["choice"] == exp_choice
    if ok_c: choice_ok += 1

    # B. 两个独立 noul（各问各的，不互相排斥）
    rb = agent.predict(text, {
        "退款": {"type": "noul", "instructions": "这条消息是否在要求退款或退钱？"},
        "发货": {"type": "noul", "instructions": "这条消息是否在询问或催促发货/物流？"},
    })
    p_ref = rb["answers"]["退款"]["noul"]; p_ship = rb["answers"]["发货"]["noul"]; n += 2
    # noul 判定：>0.5 视为是
    ok_ref = (p_ref > 0.5) == expect["退款"]
    ok_ship = (p_ship > 0.5) == expect["发货"]
    total_signals += 2
    if ok_ref: noul_ok += 1
    if ok_ship: noul_ok += 1

    print(f"{text[:26]:26s} {ca['choice']:>9s}{'✓' if ok_c else '✗'} {p_ref:7.3f}{'✓' if ok_ref else '✗'} {p_ship:7.3f}{'✓' if ok_ship else '✗'}  退款={expect['退款']} 发货={expect['发货']}")
ms = (time.perf_counter()-t0)*1000

print("-" * 92)
print(f"choice 单标签准确率：{choice_ok}/{len(cases)} = {choice_ok/len(cases)*100:.0f}%")
print(f"noul 双信号准确率：{noul_ok}/{total_signals} = {noul_ok/total_signals*100:.0f}%")
print(f"耗时 {ms:.0f} ms（{ms/n:.1f} ms/决策）")
