"""验证：给元素加上下文（链接域名、位置）能否改善区分度"""
import io, contextlib
import laya_mlx as laya

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent = laya.load("aac6fef/laya-multilingual-mlx")

crit = ["正常内容", "网站推荐位/相关文章", "订阅引导", "商业广告"]

# 同一批元素，三种输入粒度
cases = [
    ("正文",  "The Death Of The Button: Why The Best Interface Is No Interface",
     "smashingmagazine.com", "页面中部，主内容区"),
    ("正文",  "Despite broad browser support, container queries remain surprisingly underused.",
     "smashingmagazine.com", "页面中部，主内容区"),
    ("推荐",  "CSS Generators & Tools — Useful CSS tools for animation and design.",
     "smashingmagazine.com", "页面右侧边栏"),
    ("订阅",  "Email Newsletter — Useful front-end & UX tips, delivered once a week.",
     "smashingmagazine.com", "页面右侧边栏"),
    ("广告",  "Sponsored: Get 50% off our premium courses this week only. Limited time offer.",
     "partner-site.com", "页面顶部横幅"),
    ("广告",  "Advertisement — Buy this product now at a special discount.",
     "ads.example.com", "文章段落之间"),
]

def predict(text, extra=""):
    state = text + ("\n" + extra if extra else "")
    r = agent.predict(state, {"ad": {"type": "score",
        "instructions": "这个网页元素是不是广告或商业推广？", "criteria": crit}})
    return r["answers"]["ad"]["score"]

print("=" * 82)
print("验证：给元素加上下文，区分度会变好吗？")
print("=" * 82)
print(f"{'类型':>4s} {'纯文本':>7s} {'+域名':>7s} {'+位置':>7s} {'两者':>7s}   内容")
print("-" * 82)

good = {"纯文本": 0, "+域名": 0, "+位置": 0, "两者": 0}
for label, text, domain, pos in cases:
    s_plain = predict(text)
    s_dom   = predict(text, f"链接域名：{domain}")
    s_pos   = predict(text, f"位置：{pos}")
    s_both  = predict(text, f"链接域名：{domain}\n位置：{pos}")

    # 判定标准：广告/订阅应≥1.5，正文/推荐应<1.5
    expect_hi = label in ("广告", "订阅")
    for name, s in (("纯文本", s_plain), ("+域名", s_dom), ("+位置", s_pos), ("两者", s_both)):
        ok = (s >= 1.5) if expect_hi else (s < 1.5)
        if ok: good[name] += 1

    print(f"{label:>4s} {s_plain:7.2f} {s_dom:7.2f} {s_pos:7.2f} {s_both:7.2f}   {text[:32]}")

print("-" * 82)
print("判对数量（满分 6）：", "  ".join(f"{k}={v}" for k, v in good.items()))
