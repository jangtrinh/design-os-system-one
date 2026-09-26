import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function checkReplies() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to https://www.threads.com/@jangtrinhsg/replies...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/replies" });
  await human.sleep(5000, 6000);

  const replyData: any = await pool.evaluate(wsUrl, `(() => {
    const cards = Array.from(document.querySelectorAll('div[data-pressable-container="true"], article')).map(c => {
      const text = (c.innerText || '').slice(0, 300);
      const link = c.querySelector('a[href*="/post/"]')?.getAttribute('href');
      return { text, link };
    }).filter(c => c.text.length > 10);
    return cards;
  })()`);

  console.log("User replies found:\n", JSON.stringify(replyData, null, 2));

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-replies-tab.png"), Buffer.from(shot.data, "base64"));
}

checkReplies().catch(console.error);
