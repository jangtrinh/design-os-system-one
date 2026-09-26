"""修正版：剪贴板内容完整放进 state，criteria 只留短标签"""
import io, contextlib, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

history = {
    "c1": "https://github.com/mizorewww/laya-mlx",
    "c2": "感谢你的回复，我这边确认一下，明天上午给你答复。",
    "c3": "npm install laya-mlx",
    "c4": "订单号 20260919-4471，金额 ¥1,286.00",
    "c5": "13800138000",
    "c6": "会议纪要：Q3 目标调整为华东区优先，负责人待定。",
}
labels = {"c1": "网址链接", "c2": "回复话术", "c3": "安装命令", "c4": "订单信息", "c5": "手机号码", "c6": "会议纪要"}

scenes = [
    ("你在飞书里回复同事，他说「把命令发我」", "把安装命令发他", "c3"),
    ("你在填电商售后表单，要求填订单号", "填订单号", "c4"),
    ("你在 GitHub issue 里贴复现步骤", "贴项目地址", "c1"),
    ("你在回客户邮件，需要确认并给时间", "回确认话术", "c2"),
]

t0 = time.perf_counter(); n = 0
print("=" * 88)
print("修正版：完整剪贴板内容放进 state，criteria 只做短标签")
print("=" * 88)
for scene, need, expect in scenes:
    state = f"当前场景：{scene}\n\n剪贴板历史：\n" + "\n".join(f"{k} = {v}" for k, v in history.items())
    r = agent.predict(state, {"pick": {"type": "choice",
        "instructions": "哪一条内容最适合这个场景？", "criteria": labels}})
    a = r["answers"]["pick"]; n += 1
    ok = "✓" if a["choice"] == expect else "✗"
    top3 = "  ".join(f"{labels[k]}:{p:.2f}" for k, p in sorted(a["probabilities"].items(), key=lambda x: -x[1])[:3])
    print(f"\n{scene}")
    print(f"  期望 {labels[expect]} → 选中 {labels[a['choice']]} {ok}  (conf={a['confidence']:.3f})")
    print(f"  {top3}")
ms = (time.perf_counter()-t0)*1000
print(f"\n{len(scenes)} 次决策，{ms:.0f} ms（平均 {ms/len(scenes):.1f} ms）")
