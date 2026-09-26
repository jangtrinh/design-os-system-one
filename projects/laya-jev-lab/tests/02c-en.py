"""对照：同样的问题，英文版和英文文本是什么表现？"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    en = laya.load("aac6fef/laya-mlx")                  # 英文版
    ml = laya.load("aac6fef/laya-multilingual-mlx")     # 多语言版

cases_en = [("天气", "The weather is really nice today, good for a walk."),
            ("讨论", "I disagree with your point, but I think there are gaps in your reasoning."),
            ("感谢", "I tried the method you shared and it actually works, thanks!")]
cases_zh = [("天气", "今天的天气真不错，适合出去走走。"),
            ("讨论", "我不同意你的观点，但我觉得你的论证有几个漏洞。"),
            ("感谢", "楼主分享的这个方法我试了，确实有效，谢谢！")]

instr_en = "Is this comment polite and appropriate for public posting?"
instr_zh = "这条评论的语气是否礼貌、是否适合公开发布？"

print("=" * 70)
print("对照：英文版 + 英文文本")
print("=" * 70)
for n, t in cases_en:
    r = en.predict(t, {"q": {"type": "noul", "instructions": instr_en}})
    print(f"  {n}: P(礼貌合适) = {r['answers']['q']['noul']:.3f}")

print()
print("=" * 70)
print("对照：多语言版 + 英文文本（同问题）")
print("=" * 70)
for n, t in cases_en:
    r = ml.predict(t, {"q": {"type": "noul", "instructions": instr_en}})
    print(f"  {n}: P(polite) = {r['answers']['q']['noul']:.3f}")

print()
print("=" * 70)
print("对照：多语言版 + 中文文本（同问题中文）")
print("=" * 70)
for n, t in cases_zh:
    r = ml.predict(t, {"q": {"type": "noul", "instructions": instr_zh}})
    print(f"  {n}: P(礼貌合适) = {r['answers']['q']['noul']:.3f}")
