import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  const els: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll("*")).map(e => {
      const r = e.getBoundingClientRect();
      const txt = (e.innerText || "").trim();
      return {
        tag: e.tagName,
        role: e.getAttribute("role"),
        aria: e.getAttribute("aria-label"),
        text: txt.length < 50 ? txt : txt.slice(0, 30),
        r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      };
    }).filter(e => e.r.w > 0 && e.r.h > 0 && (e.text || e.role || e.aria));
  })()`);

  console.log("Interactive dialog elements count:", els.length);
  const interesting = els.filter((e: any) => 
    e.text.includes("Community") || 
    e.text.includes("topic") || 
    e.text.includes("jangtrinhsg") || 
    e.text.includes("Post") || 
    e.role === "button"
  );
  console.log("Interesting elements:", JSON.stringify(interesting, null, 2));
}

main().catch(console.error);
