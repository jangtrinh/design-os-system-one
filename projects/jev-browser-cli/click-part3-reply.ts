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
  const wsUrl = t.webSocketDebuggerUrl;

  // Let's find all speech bubbles on the current screen
  const icons: any = await pool.evaluate(wsUrl, `(() => {
    // In Threads, the action row has like, reply, repost, share
    const svgs = Array.from(document.querySelectorAll('svg')).map((s, i) => {
      const rect = s.getBoundingClientRect();
      const parentBtn = s.closest('div[role="button"], button');
      return {
        idx: i,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        w: rect.width,
        h: rect.height,
        parentAria: parentBtn ? parentBtn.getAttribute('aria-label') : null,
        ariaLabel: s.getAttribute('aria-label')
      };
    }).filter(item => item.w > 10 && item.w < 30 && item.y > 0 && item.y < window.innerHeight);

    return icons = svgs;
  })()`, 15000);

  console.log("Visible icons:", JSON.stringify(icons, null, 2));

  const targetX = 666.25;
  const targetY = 478.38;

  console.log(`Clicking speech bubble of Part 3 at (${targetX}, ${targetY})...`);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: targetX,
    y: targetY,
    button: "left",
    clickCount: 1
  });
  await human.sleep(100, 150);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: targetX,
    y: targetY,
    button: "left",
    clickCount: 1
  });

  await human.sleep(2500, 3000);
  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "after-click-part3-speech-bubble.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved after-click-part3-speech-bubble.png");

  process.exit(0);
}

main().catch(console.error);
