import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  await pool.evaluate(wsUrl, `window.scrollBy({ top: 600, behavior: 'instant' })`, 15000);
  await new Promise(r => setTimeout(r, 2000));

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step-thread-scrolled-down.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved step-thread-scrolled-down.png");

  const pageInfo: any = await pool.evaluate(wsUrl, `(() => {
    const inputs = Array.from(document.querySelectorAll('[contenteditable="true"], textarea, input')).map(el => ({
      tag: el.tagName,
      placeholder: el.getAttribute('placeholder') || el.getAttribute('aria-label'),
      rect: el.getBoundingClientRect()
    }));
    return {
      url: window.location.href,
      inputs
    };
  })()`, 15000);

  console.log("Page info:", JSON.stringify(pageInfo, null, 2));
  process.exit(0);
}

main().catch(console.error);
