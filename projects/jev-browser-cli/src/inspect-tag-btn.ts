import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const info: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const el = document.elementFromPoint(761, 504);
    return {
      tagName: el ? el.tagName : null,
      aria: el ? el.getAttribute("aria-label") : null,
      parentAria: el && el.parentElement ? el.parentElement.getAttribute("aria-label") : null,
      innerHTML: el ? el.innerHTML : null
    };
  })()`);

  console.log("Element at 761 504:", info);
}

main().catch(console.error);
