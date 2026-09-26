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

  console.log("Scrolling down to reveal full Part 4...");
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 400, behavior: 'instant' })`, 15000);
  await new Promise(r => setTimeout(r, 2000));

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part4-full-view.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved live-part4-full-view.png");

  // Get full text of Part 4 post
  const info: any = await pool.evaluate(wsUrl, `(() => {
    const articles = Array.from(document.querySelectorAll("article, div[data-pressable-container='true']"));
    const last = articles[articles.length - 1];
    return {
      text: last ? last.innerText : "",
      links: last ? Array.from(last.querySelectorAll('a')).map(a => a.href) : []
    };
  })()`, 15000);

  console.log("Part 4 full content:", JSON.stringify(info, null, 2));
  process.exit(0);
}

main().catch(console.error);
