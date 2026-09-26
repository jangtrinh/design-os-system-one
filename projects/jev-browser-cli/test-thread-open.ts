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

  console.log("Navigating to profile: https://www.threads.com/@jangtrinhsg");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  console.log("Clicking post Ddm5DzBk_Hm link...");
  const clickRes: any = await pool.evaluate(wsUrl, `(() => {
    const link = document.querySelector('a[href*="/post/Ddm5DzBk_Hm"]');
    if (link) {
      link.click();
      return { found: true };
    }
    return { found: false };
  })()`);
  console.log("Click post link result:", clickRes);
  await human.sleep(4000, 5000);

  // Look for reply triggers
  const replyTriggers: any = await pool.evaluate(wsUrl, `(() => {
    const expand = document.querySelector('[aria-label="Expand composer"]');
    const ed = document.querySelector('[contenteditable="true"]');
    const replyButtons = Array.from(document.querySelectorAll('[aria-label="Reply"]')).map((el, i) => {
      const rect = el.getBoundingClientRect();
      return { idx: i, x: rect.x, y: rect.y };
    });
    const dialogs = document.querySelectorAll('div[role="dialog"]').length;
    return {
      hasExpand: !!expand,
      hasEd: !!ed,
      replyButtonsCount: replyButtons.length,
      replyButtons,
      dialogs
    };
  })()`);

  console.log("Reply triggers status:", replyTriggers);

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step-check-thread-open.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved step-check-thread-open.png");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
