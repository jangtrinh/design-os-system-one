import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const titles: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll("svg title")).map(t => t.textContent);
  })()`);

  console.log("SVG titles in dialog:", titles);
}

main().catch(console.error);
