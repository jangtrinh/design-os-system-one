"""最后一组：noul 问法对准确率的影响（显式 vs 隐式）"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

# 明确提到发货的文本 + 明确没提的文本
with_ship = ["我要退款，东西还没发货。", "没发货，退钱。", "东西没收到，要求退款处理。",
             "下单三天了还没发。", "查一下物流。", "我的快递到哪了？", "东西什么时候发货？"]
no_ship = ["我要退款。", "请把钱退给我。", "发票开错了。", "登录页面进不去。", "你们有企业版吗？"]

phrasings = {
    "P1 是否询问/催促发货": "这条消息是否在询问或催促发货、物流？",
    "P2 是否提到发货相关":   "这条消息是否提到了发货、物流、快递或收货相关的内容？",
    "P3 消息里有发货问题吗":  "这条消息里有没有发货、物流、快递或收货的问题？",
    "P4 是否包含物流诉求":   "这条消息是否包含物流或发货方面的诉求？",
}

print("=" * 96)
print("noul 问法对比：7 条「提到发货」 vs 5 条「没提到发货」")
print("=" * 96)
for label, instr in phrasings.items():
    vals_with, vals_without = [], []
    for t in with_ship:
        r = agent.predict(t, {"q": {"type": "noul", "instructions": instr}})
        vals_with.append(r["answers"]["q"]["noul"])
    for t in no_ship:
        r = agent.predict(t, {"q": {"type": "noul", "instructions": instr}})
        vals_without.append(r["answers"]["q"]["noul"])
    mw = sum(vals_with)/len(vals_with); mo = sum(vals_without)/len(vals_without)
    correct = sum(1 for v in vals_with if v > 0.5) + sum(1 for v in vals_without if v <= 0.5)
    sep = mw - mo
    print(f"\n{label}")
    print(f"  「提到发货」均值 {mw:.3f}  {[round(v,2) for v in vals_with]}")
    print(f"  「没提到」  均值 {mo:.3f}  {[round(v,2) for v in vals_without]}")
    print(f"  判定正确 {correct}/12  (0.5阈值)   区分度 {sep:+.3f}")
