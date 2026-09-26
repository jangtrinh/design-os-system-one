import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Scroll down to see Part 3 and the bottom
  console.log("Scrolling down in the thread...");
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 1200, behavior: 'instant' })`);
  await human.sleep(2000, 2500);

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step-scroll-to-bottom.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved step-scroll-to-bottom.png");

  // Inspect all reply elements and buttons on the page
  const pageState: any = await pool.evaluate(wsUrl, `(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], svg')).map(el => {
      const aria = el.getAttribute('aria-label') || '';
      const text = (el.innerText || '').trim();
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName, aria, text, x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    }).filter(b => b.aria.toLowerCase().includes('reply') || b.text.toLowerCase().includes('reply') || b.aria.includes('composer'));

    return {
      buttons,
      scrollHeight: document.body.scrollHeight,
      scrollY: window.scrollY
    };
  })()`);

  console.log("Page state:", JSON.stringify(pageState, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
