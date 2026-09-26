"""演示 5：售前对话意图追踪 —— 每轮问同样的 3 个问题，看信号怎么变"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 一段真实感的售前对话（客户逐步从观望走向购买意向）
turns = [
    ("客户", "你们这个产品怎么收费？"),
    ("销售", "我们有三个档位，基础版每月 99，专业版 299，企业版需要单独报价。"),
    ("客户", "专业版和企业版差在哪？"),
    ("销售", "企业版有 SSO、审计日志和专属客户成功经理。"),
    ("客户", "我们现在 50 个人，SSO 是刚需。"),
    ("销售", "那企业版比较合适，我可以安排一次演示。"),
    ("客户", "演示大概要多久？我们这周要定下来。"),
]

questions = {
    "意向": {"type": "score", "instructions": "客户当前的购买意向有多强？",
             "criteria": ["只是随便看看", "在评估中", "有明确需求", "已经准备决策"]},
    "顾虑": {"type": "noul", "instructions": "客户是否表达了对价格、功能或迁移成本的顾虑？"},
    "推进信号": {"type": "noul", "instructions": "客户是否主动询问了下一步动作或时间安排？"},
}

print("=" * 78)
print("演示 5：售前对话的意向追踪（每轮问同样 3 个问题）")
print("=" * 78)
print(f"{'轮':>3s} {'角色':4s} {'意向':>5s} {'置信':>6s} {'顾虑':>6s} {'推进':>6s}  内容")
print("-" * 78)

history = []
for i, (role, text) in enumerate(turns, 1):
    history.append(f"{role}：{text}")
    state = "\n".join(history)
    r = agent.predict(state, questions)
    intent = r["answers"]["意向"]
    concern = r["answers"]["顾虑"]["noul"]
    push = r["answers"]["推进信号"]["noul"]
    print(f"{i:3d} {role:4s} {intent['score']:5.2f} {intent['confidence']:6.3f} {concern:6.3f} {push:6.3f}  {text[:26]}")

print("-" * 78)
print()
print("看点：意向分应该随对话推进上升；「推进信号」在最后两轮应该抬头。")
print("      这些都是同一次调用里并行算出来的，不是三轮三次调用。")
