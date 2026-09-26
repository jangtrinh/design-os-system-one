import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
const KEY = JSON.parse(readFileSync(`${homedir()}/.pi/agent/pi-jev-browser.config.json`, "utf8")).typesafe.apiKey;
const { criteria, cases } = JSON.parse(readFileSync(new URL("bench-cases.json", import.meta.url), "utf8"));
const out = [];
let totalMs = 0;
for (const [text, expect, diff] of cases) {
  const t0 = Date.now();
  let r, err = null;
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ state: text, model: "jev-latest",
        questions: { q: { type: "choice", instructions: "这条客服消息属于哪个类别？", criteria } } }),
    });
    const j = await res.json();
    if (res.status !== 200) { err = `HTTP ${res.status}: ${JSON.stringify(j).slice(0,100)}`; }
    else { r = j.answers.q; }
  } catch (e) { err = String(e).slice(0,120); }
  const ms = Date.now() - t0; totalMs += ms;
  out.push({ text, expect, diff, choice: r?.choice ?? null, conf: r?.confidence ?? null,
             probs: r?.probabilities ?? null, ok: r ? r.choice === expect : null, ms, err });
  process.stdout.write(r ? "." : "x");
}
console.log(`\n完成 ${cases.length} 条，总耗时 ${(totalMs/1000).toFixed(1)}s，平均 ${(totalMs/cases.length).toFixed(0)}ms/条`);
writeFileSync(new URL("bench-jev.json", import.meta.url), JSON.stringify(out, null, 2));
