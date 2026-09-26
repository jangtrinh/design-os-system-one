"""深挖：高置信度错误 —— 这是置信度门控的盲区"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

criteria = {"billing": "账单、退款、付款、发票", "logistics": "物流、发货、快递、收货",
            "tech": "技术故障、报错、登录问题", "sales": "售前咨询、购买意向、要演示"}

# 同一件事的多种说法，看模型是否一致
groups = {
    "退款诉求（期望 billing）": [
        "我要退款，东西还没发货。",
        "东西还没发货，我要退款。",
        "我要退款。",
        "请把钱退给我。",
        "没发货，退钱。",
        "退款。",
        "东西没收到，要求退款处理。",
        "货没发，我要退。",
    ],
    "发货查询（期望 logistics）": [
        "东西什么时候发货？",
        "我的快递到哪了？",
        "下单三天了还没发。",
        "查一下物流。",
        "发货了吗？",
    ],
}

print("=" * 82)
print("深挖：同一诉求的不同说法，模型是否一致？")
print("=" * 82)
for gname, texts in groups.items():
    print(f"\n【{gname}】")
    for t in texts:
        r = agent.predict(t, {"q": {"type": "choice",
            "instructions": "这条客服消息属于哪个类别？", "criteria": criteria}})
        a = r["answers"]["q"]
        flag = "⚠️高置信度" if a["confidence"] >= 0.85 else ""
        print(f"  {a['choice']:>9s} conf={a['confidence']:.3f}  {t}  {flag}")
