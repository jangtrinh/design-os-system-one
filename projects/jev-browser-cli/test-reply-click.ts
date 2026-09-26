import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function testReplyClick() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Looking for reply buttons on current view...");

  const replyBtns: any = await pool.evaluate(wsUrl, `(() => {
    // Find all buttons that have an svg or aria-label for reply
    const all = Array.from(document.querySelectorAll('div[role="button"], button'));
    const matches = all.map((el, idx) => {
      const aria = el.getAttribute('aria-label') || '';
      const text = el.innerText || '';
      const hasSvg = !!el.querySelector('svg');
      return { idx, aria, text, hasSvg };
    }).filter(m => m.aria.toLowerCase().includes('reply') || m.text.toLowerCase().includes('reply'));
    
    return {
      matches,
      totalButtons: all.length
    };
  })()`);

  console.log("Reply buttons info:", JSON.stringify(replyBtns, null, 2));

  // Let's also check if clicking the post itself opens the thread detail page
  const clickPostRes: any = await pool.evaluate(wsUrl, `(() => {
    // Find link or container for Part 2
    const links = Array.from(document.querySelectorAll('a[href*="/post/Ddm5u-NE1xP"]'));
    if (links.length > 0) {
      links[0].click();
      return { clicked: true, count: links.length };
    }
    // Alternatively click on the text of Part 2
    const allDivs = Array.from(document.querySelectorAll('div, span'));
    const part2Div = allDivs.find(d => d.innerText && d.innerText.includes("OpenAI Codex App Promo"));
    if (part2Div) {
      part2Div.click();
      return { clicked: true, type: "div" };
    }
    return { clicked: false };
  })()`);

  console.log("Click post result:", clickPostRes);
  await human.sleep(3000, 4000);

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "after-click-post2.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved after-click-post2.png");
}

testReplyClick().catch(console.error);
