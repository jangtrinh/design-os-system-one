import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function scrollCapture() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Current page scroll check...");

  // Scroll down 700px via keyboard PageDown or scrollBy
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 700, behavior: 'instant' })`);
  await human.sleep(1500, 2000);

  const s1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-scroll-1.png"), Buffer.from(s1.data, "base64"));
  console.log("Captured live-thread-scroll-1.png");

  // Scroll down another 700px
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`);
  await human.sleep(1500, 2000);

  const s2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-scroll-2.png"), Buffer.from(s2.data, "base64"));
  console.log("Captured live-thread-scroll-2.png");

  // Scroll down another 800px
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 900, behavior: 'instant' })`);
  await human.sleep(1500, 2000);

  const s3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-scroll-3.png"), Buffer.from(s3.data, "base64"));
  console.log("Captured live-thread-scroll-3.png");

  // Also extract all text snippets currently in document body
  const allTexts: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('div[dir="auto"], span'))
      .map(e => (e.innerText || '').trim())
      .filter(t => t.length > 15);
  })()`);
  console.log("All text snippets visible:", allTexts.filter((t: string) => t.includes("Part") || t.includes("Ví dụ") || t.includes("Virtual") || t.includes("github")));
}

scrollCapture().catch(console.error);
