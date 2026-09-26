"""演示 7：剪贴板智能粘贴 —— 根据当前应用和上下文，从历史里挑该粘的那条"""
import io, contextlib, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 剪贴板历史（真实场景里会有几十条，这里用 6 条代表）
history = {
    "c1": "https://github.com/mizorewww/laya-mlx",
    "c2": "感谢你的回复，我这边确认一下，明天上午给你答复。",
    "c3": "npm install laya-mlx",
    "c4": "订单号 20260919-4471，金额 ¥1,286.00",
    "c5": "13800138000",
    "c6": "会议纪要：Q3 目标调整为华东区优先，负责人待定。",
}

# 场景：当前在什么应用 / 什么输入框 / 刚发生什么
scenes = [
    ("你正在飞书对话里回复同事，消息提到「部署命令」",
     "把刚才复制的安装命令发给他", "c3"),
    ("你正在填一张电商售后表单，要求填订单号",
     "填订单号", "c4"),
    ("你正在 GitHub issue 里贴复现步骤，提到项目名",
     "贴上项目地址", "c1"),
    ("你正在回客户邮件，需要给出确认与时间",
     "回一句确认话术", "c2"),
]

print("=" * 92)
print("演示 7：剪贴板智能粘贴（从 6 条历史里挑出该粘的那条）")
print("=" * 92)

t0 = time.perf_counter()
n = 0
for scene, need, expect in scenes:
    # 一次调用：既选条目（choice），又判断该不该自动粘（noul）
    r = agent.predict(
        f"当前场景：{scene}\n用户意图：{need}",
        {
            "pick": {"type": "choice",
                     "instructions": "应该粘贴哪一条剪贴板内容？",
                     "criteria": {k: v[:60] for k, v in history.items()}},
            "safe": {"type": "noul",
                     "instructions": "这条内容是否适合不经确认直接粘贴（不含隐私、密码、误发风险）？"},
        },
    )
    a = r["answers"]["pick"]
    n += 2
    mark = "✓" if a["choice"] == expect else "✗"
    print(f"\n场景：{scene}")
    print(f"  意图：{need}")
    print(f"  → 选中 {a['choice']}（P={a['probabilities'][a['choice']]:.3f} conf={a['confidence']:.3f}）{mark}")
    print(f"     内容：{history[a['choice']]}")
    print(f"     分布：" + "  ".join(f"{k}:{p:.2f}" for k, p in sorted(a["probabilities"].items(), key=lambda x: -x[1])[:3]))
ms = (time.perf_counter() - t0) * 1000
print()
print("=" * 92)
print(f"4 个场景 × 2 个问题 = {n} 次决策，共 {ms:.0f} ms（平均 {ms/n:.1f} ms/决策）")
