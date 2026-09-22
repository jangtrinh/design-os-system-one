import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const info: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const el = document.elementFromPoint(460, 470);
    return {
      tagName: el ? el.tagName : null,
      text: el ? el.innerText : null,
      className: el ? el.className : null,
      parentText: el && el.parentElement ? el.parentElement.innerText : null
    };
  })()`);

  console.log("Element at (460, 470):", info);
}

main().catch(console.error);
