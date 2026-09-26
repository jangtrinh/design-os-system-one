"""稳健性检查：0.60 这个阈值是不是碰巧？"""
import json
laya = json.load(open("bench-laya.json")); jev = json.load(open("bench-jev.json"))
JEV_MS, LAYA_MS = 588.0, 7.6; N=len(laya)

print("Laya 置信度 → 正确率 与 升级收益（40 条）")
print(f"{'区间':>10s} {'样本':>4s} {'Laya对':>7s} {'Laya准确':>8s} {'Jev对':>6s} {'升级净收益':>10s}")
print("-"*68)
for lo,hi in [(0,0.3),(0.3,0.5),(0.5,0.6),(0.6,0.7),(0.7,0.8),(0.8,0.9),(0.9,1.01)]:
    idx=[i for i,r in enumerate(laya) if lo<=r["conf"]<hi]
    if not idx: print(f"{lo:.2f}-{hi:.2f} {0:>4d}      -        -      -          -"); continue
    lok=sum(1 for i in idx if laya[i]["ok"]); jok=sum(1 for i in idx if jev[i]["ok"])
    net=jok-lok
    print(f"{lo:.2f}-{hi:.2f} {len(idx):>4d} {lok:>7d} {lok/len(idx)*100:7.0f}% {jok:>6d} {net:>+10d}")

print()
print("检查各难度的最优阈值是否一致：")
for d in ["清晰","模糊","边界"]:
    idxs=[i for i,r in enumerate(laya) if r["diff"]==d]
    best=None
    for th in [0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.01]:
        cor=esc=0
        for i in idxs:
            if laya[i]["conf"]<th:
                esc+=1
                if jev[i]["ok"]: cor+=1
            else:
                if laya[i]["ok"]: cor+=1
        acc=cor/len(idxs); er=esc/len(idxs)
        if best is None or acc>best[1] or (acc==best[1] and er<best[2]): best=(th,acc,er)
    jo=sum(1 for i in idxs if jev[i]["ok"])/len(idxs)
    print(f"  {d}: 最优阈值 {best[0]:.2f} → 准确率 {best[1]*100:.0f}% (纯Jev {jo*100:.0f}%)，升级率 {best[2]*100:.0f}%")
