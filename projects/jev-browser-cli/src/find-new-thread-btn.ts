import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");

  const pool = CdpSessionPool.getInstance();
  const info: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const newThreadEl = all.find(el => (el.innerText || "").trim() === "New thread" || el.getAttribute("aria-label") === "New thread" || el.getAttribute("aria-label") === "Tạo thread");
    const rect = newThreadEl ? newThreadEl.getBoundingClientRect() : null;
    return {
      found: !!newThreadEl,
      tagName: newThreadEl ? newThreadEl.tagName : null,
      rect
    };
  })()`);
  console.log("New thread button info:", info);
}

main().catch(console.error);
