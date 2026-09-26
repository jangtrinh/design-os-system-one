"""演示 6：网页广告识别 —— 用 score 而不是 noul/choice（承接演示 3 的教训）"""
import json
import pathlib, io, contextlib, time, re
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

els = json.load(open(pathlib.Path(__file__).with_name("sample-page-elements.json")))
# 去重（同一段文本父子节点重复）
seen, items = set(), []
for e in els:
    key = e["text"][:60]
    if key in seen: continue
    seen.add(key)
    items.append(e)

print("=" * 88)
print("演示 6：网页广告识别（真实页面：smashingmagazine.com，40 个可见块）")
print("=" * 88)
print(f"{'判定':>4s} {'广告分':>6s} {'置信':>6s}  {'内容':52s}")
print("-" * 88)

results = []
t0 = time.perf_counter()
for e in items:
    r = agent.predict(e["text"], {
        "ad": {"type": "score",
               "instructions": "这个网页元素是广告、推广或商业导流的程度有多高？",
               "criteria": ["正常内容", "编辑推荐或相关文章", "明显的商业推广/订阅引导", "纯商业广告"]},
    })
    a = r["answers"]["ad"]
    score = round(a["score"], 2)
    results.append((score, a["confidence"], e))
ms = (time.perf_counter() - t0) * 1000

results.sort(key=lambda x: -x[0])
for score, conf, e in results[:6]:
    label = "广告" if score >= 2.0 else ("推广" if score >= 1.2 else "内容")
    print(f"{label:>4s} {score:6.2f} {conf:6.3f}  {e['text'][:52]}")
print(f"{'...':>4s} {'':6s} {'':6s}")
for score, conf, e in results[-3:]:
    print(f"{'内容':>4s} {score:6.2f} {conf:6.3f}  {e['text'][:52]}")

hi = [r for r in results if r[0] >= 2.0]
mid = [r for r in results if 1.2 <= r[0] < 2.0]
lo = [r for r in results if r[0] < 1.2]
print("-" * 88)
print(f"总计 {len(results)} 个元素，{ms:.0f} ms（平均 {ms/len(results):.1f} ms/元素）")
print(f"判定分布：广告 {len(hi)} 个 · 推广 {len(mid)} 个 · 内容 {len(lo)} 个")
