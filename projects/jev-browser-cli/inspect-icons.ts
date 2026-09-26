import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function inspectIcons() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  const data: any = await pool.evaluate(wsUrl, `(() => {
    // Look around the bottom reply bar
    const elements = Array.from(document.querySelectorAll('div, button, svg')).map((e, idx) => {
      const rect = e.getBoundingClientRect();
      return {
        idx,
        tag: e.tagName,
        aria: e.getAttribute('aria-label'),
        role: e.getAttribute('role'),
        y: Math.round(rect.y),
        x: Math.round(rect.x),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        text: (e.innerText || '').slice(0, 30)
      };
    }).filter(e => e.y > 600 && e.w > 0 && e.h > 0 && (e.aria || e.text || e.tag === 'svg'));

    return elements;
  })()`);

  console.log("Bottom reply bar elements:", JSON.stringify(data, null, 2));
}

inspectIcons().catch(console.error);
