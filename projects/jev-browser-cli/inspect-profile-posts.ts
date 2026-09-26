import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function inspectProfile() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  const result: any = await pool.evaluate(wsUrl, `(() => {
    const postCards = Array.from(document.querySelectorAll('div[data-pressable-container="true"], article, div[data-testid="post"]')).map(el => {
      const text = (el.innerText || '').slice(0, 300);
      const link = el.querySelector('a[href*="/post/"]')?.getAttribute('href');
      const time = el.querySelector('time')?.getAttribute('datetime') || el.querySelector('time')?.innerText;
      return { link, time, text };
    }).filter(p => p.text.length > 10);
    return postCards;
  })()`);

  console.log("Profile cards found:", JSON.stringify(result, null, 2));
}

inspectProfile().catch(console.error);
