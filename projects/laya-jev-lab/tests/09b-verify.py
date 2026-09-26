"""验证：语义类别那题，模型固执选 logistics，是它错了还是我的期望错了？"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

state = "客户说：我要退款，东西还没发货。"

variants = {
    "V1 原题（4选项）": ("这条消息属于哪一类？",
        {"billing": "账单、退款、付款", "logistics": "物流、发货",
         "tech": "技术故障", "other": "其他"}),
    "V2 只测退款意图": ("客户是否明确要求退款？", None),   # noul
    "V3 换措辞描述": ("这条消息属于哪一类？",
        {"billing": "客户要求退钱、退款、退货", "logistics": "客户催促发货、查询快递",
         "tech": "客户报告功能故障", "other": "以上都不是"}),
    "V4 加'优先'提示": ("这条消息最主要的诉求属于哪一类？",
        {"billing": "要求退款或退钱", "logistics": "催促或查询发货",
         "tech": "报告故障", "other": "其他"}),
}

print("=" * 76)
print("诊断：客户说「我要退款，东西还没发货」到底该归哪类？")
print("=" * 76)
for name, (instr, crit) in variants.items():
    if crit is None:
        r = agent.predict(state, {"q": {"type": "noul", "instructions": instr}})
        print(f"  {name}: P(是) = {r['answers']['q']['noul']:.3f}   [{instr}]")
    else:
        r = agent.predict(state, {"q": {"type": "choice", "instructions": instr, "criteria": crit}})
        a = r["answers"]["q"]
        probs = "  ".join(f"{k}:{p:.2f}" for k, p in sorted(a["probabilities"].items(), key=lambda x: -x[1]))
        print(f"  {name}: → {a['choice']} (conf={a['confidence']:.3f})")
        print(f"      {probs}")

print()
print("判断依据：客户第一句是「我要退款」——退款诉求在前，发货问题在後。")
