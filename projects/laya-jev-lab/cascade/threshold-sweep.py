"""级联 v2：基于 40 条基准的阈值优化"""
import json

laya = json.load(open("bench-laya.json"))
jev  = json.load(open("bench-jev.json"))
JEV_MS, LAYA_MS = 588.0, 7.6
N = len(laya)

print("=" * 92)
print(f"级联方案（{N} 条中文客服分类基准）")
print("=" * 92)
print(f"{'策略':>10s} {'升级率':>7s} {'准确率':>7s} {'平均延迟':>9s} {'vs纯Jev':>8s}  说明")
print("-" * 92)

def evalth(th, label, note=""):
    correct = esc = 0; ms = 0.0
    for l, j in zip(laya, jev):
        if l["conf"] < th:
            esc += 1; ms += JEV_MS
            if j["ok"]: correct += 1
        else:
            ms += LAYA_MS
            if l["ok"]: correct += 1
    acc = correct/N; avg = ms/N; sp = (JEV_MS*N)/ms
    print(f"{label:>10s} {esc/N*100:6.0f}% {acc*100:6.0f}% {avg:8.0f}ms {sp:7.1f}×  {note}")
    return th, esc/N, acc, avg, sp

lonly = evalth(0.0, "纯Laya")
results = []
for th in [0.30,0.40,0.50,0.60,0.70,0.80,0.90,0.95]:
    results.append(evalth(th, f"{th:.2f}"))
jonly = evalth(1.01, "纯Jev")

print("-" * 92)
la = sum(1 for r in laya if r["ok"]); ja = sum(1 for r in jev if r["ok"])
print(f"实际：Laya {la}/{N}={la/N*100:.0f}%  |  Jev {ja}/{N}={ja/N*100:.0f}%")
print()
print("按难度（两家各自）：")
for d in ["清晰","模糊","边界"]:
    ls=[r for r in laya if r["diff"]==d]; js=[r for r in jev if r["diff"]==d]
    lo=sum(1 for r in ls if r["ok"]); jo=sum(1 for r in js if r["ok"])
    print(f"  {d}({len(ls)}条): Laya {lo/len(ls)*100:3.0f}%  Jev {jo/len(js)*100:3.0f}%")

# 最优点：准确率 ≥ 纯Jev - 1%，延迟最小
best=None; target=ja/N-0.01
for r in results:
    if r[2]>=target and (best is None or r[3]<best[3]): best=r
print()
if best:
    print(f"★ 推荐阈值 {best[0]:.2f}：准确率 {best[2]*100:.0f}%，升级率 {best[1]*100:.0f}%，平均 {best[3]:.0f}ms（比纯 Jev 快 {best[4]:.1f}×）")

# 级联上限
lw=[i for i,l in enumerate(laya) if not l["ok"]]; lr=[i for i,l in enumerate(laya) if l["ok"]]
fixed=[i for i in lw if jev[i]["ok"]]; broke=[i for i in lr if not jev[i]["ok"]]
print(f"上限（完美分流）：{(len(lr)+len(fixed))}/{N} = {(len(lr)+len(fixed))/N*100:.0f}%")
print(f"  可救回 {len(fixed)} 条，但 Jev 会带偏 {len(broke)} 条")
