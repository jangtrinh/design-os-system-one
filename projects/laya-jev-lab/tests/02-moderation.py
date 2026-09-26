"""演示 2：内容审核 + 置信度门控 —— 高置信度自动处理，低置信度转人工"""
import time, io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

posts = [
    ("A", "今天的天气真不错，适合出去走走。"),
    ("B", "你这个傻逼懂个屁，滚回去重学小学语文吧。"),
    ("C", "我不同意你的观点，但我觉得你的论证有几个漏洞，比如第二段的因果关系。"),
    ("D", "楼主分享的这个方法我试了，确实有效，谢谢！"),
    ("E", "有没有人知道怎么绕过实名认证？我想注册个小号。"),
]

questions = {
    "有害": {"type": "noul", "instructions": "这条评论是否包含人身攻击、辱骂或侮辱性表达？"},
    "正常讨论": {"type": "noul", "instructions": "这条评论是否属于正常的内容讨论或观点交流？"},
}

print("=" * 74)
print("演示 2：内容审核 —— 用 noul 的概率做分流，而不是二选一")
print("=" * 74)
print(f"{'':3s} {'有害P':>7s} {'讨论P':>7s}  动作         内容")
print("-" * 74)

stats = {"自动放行": 0, "自动拦截": 0, "转人工": 0}
for tag, text in posts:
    t0 = time.perf_counter()
    r = agent.predict(text, questions)
    ms = (time.perf_counter() - t0) * 1000
    p_harm = r["answers"]["有害"]["noul"]
    p_ok = r["answers"]["正常讨论"]["noul"]

    # 门控逻辑：两端自动，中间转人工
    if p_harm < 0.15 and p_ok > 0.5:
        action = "自动放行"
    elif p_harm > 0.85:
        action = "自动拦截"
    else:
        action = "转人工"
    stats[action] += 1
    print(f"{tag:3s} {p_harm:7.3f} {p_ok:7.3f}  {action:6s}  {text[:34]}")

print("-" * 74)
print("分流统计：", stats)
print()
print("要点：两端自动、中间转人工。这条门控线是你自己定的，")
print("      模型只负责给概率——它不需要知道阈值是多少。")
