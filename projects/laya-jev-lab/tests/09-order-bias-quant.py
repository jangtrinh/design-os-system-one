"""实验：量化 choice 的顺序偏置 —— 对所有排列求答案分布

设计：一个固定问题 + N 个候选，枚举所有排列，看选中结果是否随顺序变化。
如果"内容决定的"，所有排列应指向同一个候选；如果"顺序决定的"，选中会跟着位置跑。
"""
import io, contextlib, itertools, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 三个测试场景，每个 4 个候选（4!=24 种排列）
scenarios = [
    ("语义类别（有先验）",
     "客户说：我要退款，东西还没发货。",
     "这条消息属于哪一类？",
     [("billing", "账单、退款、付款"), ("logistics", "物流、发货"),
      ("tech", "技术故障"), ("other", "其他")],
     "billing"),
    ("任意内容（无先验）",
     "场景：你在填售后表单，要求填订单号。\n\n剪贴板：\nc1=https://github.com/x/y\nc2=感谢回复，明天答复\nc3=npm install foo\nc4=订单号 20260919-4471",
     "哪一条内容最适合这个场景？",
     [("c1", "网址链接"), ("c2", "回复话术"), ("c3", "安装命令"), ("c4", "订单信息")],
     "c4"),
    ("情感分类（有先验）",
     "文本：你这个傻逼懂个屁，滚回去重学小学语文吧。",
     "这段文本的情绪是什么？",
     [("calm", "平静"), ("annoyed", "不满"), ("angry", "愤怒"), ("sad", "悲伤")],
     "angry"),
]

print("=" * 84)
print("实验：choice 的顺序偏置量化（每个场景枚举全部 24 种排列）")
print("=" * 84)

for name, state, instr, cands, expect in scenarios:
    picks = {}
    confs = []
    t0 = time.perf_counter()
    for perm in itertools.permutations(cands):
        crit = {k: v for k, v in perm}
        r = agent.predict(state, {"q": {"type": "choice", "instructions": instr, "criteria": crit}})
        a = r["answers"]["q"]
        picks[a["choice"]] = picks.get(a["choice"], 0) + 1
        confs.append(a["confidence"])
    ms = (time.perf_counter() - t0) * 1000

    total = 24
    correct = picks.get(expect, 0)
    top = sorted(picks.items(), key=lambda x: -x[1])
    print(f"\n【{name}】期望={expect}")
    print(f"  24 种排列里，选对的: {correct}/24 = {correct/24*100:.0f}%")
    print(f"  选中分布: " + "  ".join(f"{k}:{v}" for k, v in top))
    print(f"  平均置信度 {sum(confs)/len(confs):.3f}  耗时 {ms:.0f} ms（{ms/24:.1f} ms/次）")
