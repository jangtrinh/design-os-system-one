"""演示 1：中文客服工单分诊 —— 一条工单同时问 4 个问题，一次前向出结果"""
import sys, time, json, io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")   # 中文必须用多语言版

ticket = "我上个月买的东西到现在还没发货，客服问了三次都说在处理，再这样我就去投诉了，我要退款！"

questions = {
    "类型": {"type": "choice", "instructions": "这条工单属于哪一类？",
             "criteria": {"物流": "发货、快递、配送、收货相关",
                          "退款": "要求退款、退货、退钱",
                          "质量": "商品破损、功能故障、与描述不符",
                          "其他": "以上都不是"}},
    "紧急度": {"type": "score", "instructions": "这条工单有多紧急？",
               "criteria": ["不急", "有点急", "很急，有明确时间压力", "已经威胁投诉或流失"]},
    "情绪强度": {"type": "score", "instructions": "客户的情绪有多强烈？",
                 "criteria": ["平静陈述", "不满但克制", "明显愤怒，用词激烈"]},
    "要退款": {"type": "noul", "instructions": "客户是否明确要求退款或退钱？"},
    "要投诉": {"type": "noul", "instructions": "客户是否提到投诉、曝光、维权或举报？"},
}

for trial in range(3):
    t0 = time.perf_counter()
    r = agent.predict(ticket, questions)
    ms = (time.perf_counter() - t0) * 1000
    if trial == 0:
        first = ms
    else:
        last = ms

print("=" * 62)
print("演示 1：中文客服工单分诊")
print("=" * 62)
print(f"工单：{ticket}")
print()
for k, v in r["answers"].items():
    if v["type"] == "choice":
        prob = "  ".join(f"{o}:{p:.3f}" for o, p in sorted(v["probabilities"].items(), key=lambda x: -x[1]))
        print(f"  {k:6s} → {v['choice']:4s}  (置信度 {v['confidence']:.3f})")
        print(f"          分布 {prob}")
    elif v["type"] == "score":
        dist = "  ".join(f"{lv}:{p:.3f}" for lv, p in sorted(v["probabilities"].items(), key=lambda x: int(x[0])))
        print(f"  {k:6s} → {v['score']:.2f}  (置信度 {v['confidence']:.3f})")
        print(f"          分布 {dist}")
    else:
        print(f"  {k:6s} → {v['noul']:.3f}  (P(是))")
print()
print(f"5 个问题一次前向：{first:.1f} ms（重复测：{first:.1f} / {last:.1f} ms）")
print(f"平均每问：{first/5:.1f} ms")
