import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const info: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const dialog = document.querySelector("[role=dialog]") || document.body;
    const elements = Array.from(dialog.querySelectorAll("div, span, button, a"));
    const matching = elements.filter(e => {
      const txt = (e.innerText || "").toLowerCase();
      return txt.includes("community") || txt.includes("topic") || txt.includes("3d printing");
    });
    return matching.slice(0, 10).map(m => ({
      tagName: m.tagName,
      text: m.innerText.slice(0, 50),
      className: m.className,
      rect: m.getBoundingClientRect()
    }));
  })()`);

  console.log("Matching elements:", JSON.stringify(info, null, 2));
}

main().catch(console.error);
