import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const POST_URL = "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm";

async function verifyAll() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to published thread:", POST_URL);
  await pool.send(wsUrl, "Page.navigate", { url: POST_URL });
  await human.sleep(5000, 6000);

  // Capture top screenshot (Part 1 & Part 2)
  const shot1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${ARTIFACT_DIR}/live-thread-overview-top.png`, Buffer.from(shot1.data, "base64"));
  console.log("📸 Saved live-thread-overview-top.png");

  // Scroll down to view Part 3 & Part 4
  console.log("Scrolling down to reveal chained replies...");
  await human.scrollNatural(wsUrl, 2);
  await human.sleep(3000, 4000);

  const shot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${ARTIFACT_DIR}/live-thread-overview-bottom.png`, Buffer.from(shot2.data, "base64"));
  console.log("📸 Saved live-thread-overview-bottom.png");

  // Extract all text in the thread to confirm all 4 parts
  const threadTexts: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('article, div[data-pressable-container="true"]')).map(e => (e.innerText || '').slice(0, 300)).filter(t => t.length > 20);
  })()`);
  console.log("Thread contents summary:", JSON.stringify(threadTexts, null, 2));
}

verifyAll().catch(console.error);
