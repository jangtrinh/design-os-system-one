"""诊断：换个档位设计，看区分度能不能拉开"""
import json
import pathlib, io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

els = json.load(open(pathlib.Path(__file__).with_name("sample-page-elements.json")))
seen, items = set(), []
for e in els:
    k = e["text"][:60]
    if k in seen: continue
    seen.add(k); items.append(e)

# 已知答案的探针（手工标注）
probes = [
    (0, "Despite broad browser support, container queries remain surprisingly underused."),
    (0, "The Death Of The Button: Why The Best Interface Is No Interface"),
    (2, "CSS Generators & Tools — Useful CSS tools for animation and design."),
    (2, "Email Newsletter — Useful front-end & UX tips, delivered once a week."),
    (3, "Sponsored: Get 50% off our premium courses this week only. Limited time offer."),
    (3, "Advertisement — Buy this product now at a special discount."),
]

variants = {
    "V1 四档(原)": ["正常内容", "编辑推荐或相关文章", "明显的商业推广/订阅引导", "纯商业广告"],
    "V2 三档":     ["这是正文内容", "这是推荐/导流", "这是广告或订阅推销"],
    "V3 更直白":   ["文章正文", "网站自己的推荐位", "商业广告", "付费推广"],
}

print("=" * 84)
print("诊断：档位怎么切，区分度最大？")
print("=" * 84)
for label, crit in variants.items():
    print(f"\n{label}：{crit}")
    print(f"  {'期望':>4s} {'得分':>6s}  内容")
    for answer, text in probes:
        r = agent.predict(text, {"ad": {"type": "score",
            "instructions": "这个网页元素是不是广告或商业推广？", "criteria": crit}})
        s = r["answers"]["ad"]["score"]
        mark = "✓" if (answer == 0 and s < 1.0) or (answer >= 2 and s >= 1.0) else "✗"
        print(f"  {answer:>4d} {s:6.2f}  {mark} {text[:50]}")
