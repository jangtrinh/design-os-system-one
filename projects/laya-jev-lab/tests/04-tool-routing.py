"""演示 4：Agent 工具路由 —— 该调哪个工具？用本地决策代替一次 LLM 调用"""
import io, contextlib, time
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 用户请求 → 该用哪个工具
cases = [
    ("帮我看看 /var/log/nginx/error.log 最后 50 行", "读文件"),
    ("把这个函数改成异步的", "改代码"),
    ("这个 API 的鉴权头怎么写？", "查文档"),
    ("跑一下测试看看有没有挂", "跑命令"),
    ("把这个 PR 的改动总结一下", "读文件"),
    ("帮我删掉这个目录", "跑命令"),
]

tools = {
    "读文件": "读取、查看、搜索文件内容",
    "改代码": "编辑、修改、重构代码",
    "查文档": "查询 API 文档、资料、说明",
    "跑命令": "执行 shell 命令、跑测试、构建",
}

questions = {
    "tool": {"type": "choice", "instructions": "这个请求需要哪个工具？", "criteria": tools},
    "risky": {"type": "noul", "instructions": "这个请求是否可能造成不可逆的破坏（如删除、覆盖、强制推送）？"},
}

print("=" * 76)
print("演示 4：Agent 工具路由 + 风险标记")
print("=" * 76)
print(f"{'请求':34s} {'路由':>6s} {'P':>6s} {'conf':>6s} {'风险':>6s}")
print("-" * 76)

t0 = time.perf_counter()
for text, expect in cases:
    r = agent.predict(text, {**questions,
                             "risky": {"type": "noul", "instructions": questions["risky"]["instructions"]}})
    a = r["answers"]["tool"]
    risky = r["answers"]["risky"]["noul"]
    mark = "✓" if a["choice"] == expect else "✗"
    print(f"{text[:32]:34s} {a['choice']:>6s} {a['probabilities'][a['choice']]:6.3f} {a['confidence']:6.3f} {risky:6.3f} {mark}")
ms = (time.perf_counter() - t0) * 1000

print("-" * 76)
print(f"6 条请求 × 2 个问题 = 12 次决策，共 {ms:.0f} ms（平均 {ms/12:.1f} ms/决策）")
print()
print("要点：这一层如果交给前沿模型，12 次调用要几秒、花掉真金白银。")
print("      决策模型把它压到毫秒级、零成本、可离线——这是它可以嵌进代码的前提。")
