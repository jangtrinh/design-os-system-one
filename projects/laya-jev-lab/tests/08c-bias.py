"""验证偏置：同一个问题，只打乱 criteria 顺序，答案会变吗？"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

state = "当前场景：你在填电商售后表单，要求填订单号\n\n剪贴板历史：\nc1 = https://github.com/mizorewww/laya-mlx\nc2 = 感谢你的回复，我这边确认一下，明天上午给你答复。\nc3 = npm install laya-mlx\nc4 = 订单号 20260919-4471，金额 ¥1,286.00"

orders = [
    ("原序",  [("c1","网址链接"),("c2","回复话术"),("c3","安装命令"),("c4","订单信息")]),
    ("倒序",  [("c4","订单信息"),("c3","安装命令"),("c2","回复话术"),("c1","网址链接")]),
    ("c4打头",[("c4","订单信息"),("c1","网址链接"),("c2","回复话术"),("c3","安装命令")]),
    ("只留两条",[("c4","订单信息"),("c3","安装命令")]),
]

print("=" * 78)
print("偏置测试：同一个问题（该填订单号），只改选项顺序")
print("=" * 78)
for name, pairs in orders:
    crit = {k: v for k, v in pairs}
    r = agent.predict(state, {"pick": {"type": "choice",
        "instructions": "哪一条内容最适合这个场景？", "criteria": crit}})
    a = r["answers"]["pick"]
    top = "  ".join(f"{k}:{p:.2f}" for k, p in sorted(a["probabilities"].items(), key=lambda x: -x[1]))
    correct = "✓" if a["choice"] == "c4" else "✗"
    print(f"  {name:10s} → {a['choice']} {correct}  ({top})")
print()
print("期望：无论顺序如何，都该选 c4（订单信息）")
