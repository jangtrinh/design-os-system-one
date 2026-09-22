import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const elInfo: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const el = document.elementFromPoint(420, 167);
    return {
      tagName: el ? el.tagName : null,
      text: el ? el.innerText : null,
      parentTag: el && el.parentElement ? el.parentElement.tagName : null,
      rect: el ? el.getBoundingClientRect() : null
    };
  })()`);

  console.log("Element at (420, 167):", elInfo);
}

main().catch(console.error);
