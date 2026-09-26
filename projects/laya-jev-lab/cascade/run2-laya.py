import json, io, contextlib, time
import laya_mlx as laya
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")
d = json.load(open("bench-cases.json")); criteria, cases = d["criteria"], d["cases"]
out = []
for text, expect, diff in cases:
    t0 = time.perf_counter()
    r = agent.predict(text, {"q": {"type": "choice", "instructions": "这条客服消息属于哪个类别？", "criteria": criteria}})
    ms = (time.perf_counter()-t0)*1000
    a = r["answers"]["q"]
    out.append({"text": text, "expect": expect, "diff": diff, "choice": a["choice"],
                "conf": a["confidence"], "ok": a["choice"]==expect, "ms": round(ms,1)})
    print(".", end="", flush=True)
json.dump(out, open("bench-laya.json","w"), ensure_ascii=False, indent=2)
print(f"\nLaya {len(cases)} 条完成")
