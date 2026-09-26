"""演示 2 诊断：为什么「正常讨论」概率这么低？换措辞试试"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

texts = [("天气", "今天的天气真不错，适合出去走走。"),
         ("讨论", "我不同意你的观点，但我觉得你的论证有几个漏洞。"),
         ("感谢", "楼主分享的这个方法我试了，确实有效，谢谢！")]

variants = {
    "V1 原措辞 (是否属于正常讨论)": "这条评论是否属于正常的内容讨论或观点交流？",
    "V2 反向问 (是否违规)":        "这条评论是否包含违规内容？",
    "V3 直接判断 (是否合适公开)":   "这条评论是否适合直接公开发布？",
    "V4 简单问 (是否礼貌)":        "这条评论的语气是否礼貌？",
}

print("=" * 76)
print("诊断：同一个意思，四种问法，概率差多少？")
print("=" * 76)
print(f"{'问法':32s} " + "".join(f"{n:>10s}" for n, _ in texts))
print("-" * 76)
for label, instr in variants.items():
    row = []
    for _, t in texts:
        r = agent.predict(t, {"q": {"type": "noul", "instructions": instr}})
        row.append(r["answers"]["q"]["noul"])
    print(f"{label:32s} " + "".join(f"{v:10.3f}" for v in row))
print("-" * 76)
print("参考：期望「正常/无违规/合适」≈ 高概率，「违规/不礼貌」≈ 低概率")
