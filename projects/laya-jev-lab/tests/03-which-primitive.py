"""演示 3：同一个判断，用 noul / choice / score 三种原语分别问，看谁靠谱"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

cases = [
    ("正常", "今天的天气真不错，适合出去走走。"),
    ("正常", "楼主分享的这个方法我试了，确实有效，谢谢！"),
    ("违规", "你这个傻逼懂个屁，滚回去重学小学语文吧。"),
    ("违规", "去死吧你这种垃圾就该被清理掉。"),
    ("正常", "我不同意你的观点，但我觉得你的论证有几个漏洞。"),
]

print("=" * 80)
print("演示 3：同一个判断，三种原语，谁更靠谱？")
print("=" * 80)

print("\n【A】用 noul 问「是否礼貌合适」——期望：正常高、违规低")
for label, t in cases:
    r = agent.predict(t, {"q": {"type": "noul", "instructions": "这条评论的语气是否礼貌、是否适合公开发布？"}})
    print(f"  {label}  P={r['answers']['q']['noul']:.3f}  {t[:28]}")

print("\n【B】用 choice 让它二选一——期望：正常→合适、违规→不合适")
for label, t in cases:
    r = agent.predict(t, {"q": {"type": "choice", "instructions": "这条评论的语气如何？",
                                "criteria": {"合适": "礼貌、可以公开发布", "不合适": "辱骂、攻击、不适合发布"}}})
    a = r["answers"]["q"]
    print(f"  {label}  → {a['choice']:4s} P={a['probabilities'][a['choice']]:.3f} conf={a['confidence']:.3f}  {t[:26]}")

print("\n【C】用 score 打分——期望：正常低分、违规高分")
for label, t in cases:
    r = agent.predict(t, {"q": {"type": "score", "instructions": "这条评论的攻击性有多强？",
                                "criteria": ["没有攻击性", "轻微不友善", "明显辱骂", "极端恶劣"]}})
    a = r["answers"]["q"]
    print(f"  {label}  score={a['score']:.2f} conf={a['confidence']:.3f}  {t[:28]}")
