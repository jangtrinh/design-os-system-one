import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function expandAndVerify() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to profile: https://www.threads.com/@jangtrinhsg");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  // Click on the post link
  console.log("Clicking on post link Ddm5DzBk_Hm...");
  const clickRes: any = await pool.evaluate(wsUrl, `(() => {
    const link = document.querySelector('a[href*="/post/Ddm5DzBk_Hm"]');
    if (link) {
      link.click();
      return { found: true };
    }
    return { found: false };
  })()`, 15000);
  console.log("Click post link result:", clickRes);

  await human.sleep(5000, 6000);

  // Extract all texts in this thread
  const threadDetail: any = await pool.evaluate(wsUrl, `(() => {
    const items = Array.from(document.querySelectorAll('div[data-pressable-container="true"], article, div[data-testid="post"]')).map(el => {
      const text = (el.innerText || '').slice(0, 400);
      const videos = el.querySelectorAll('video').length;
      return { text, videos };
    });

    const bodyText = document.body.innerText;
    return {
      totalItems: items.length,
      hasClaude: bodyText.includes("Claude Design"),
      hasCodex: bodyText.includes("OpenAI Codex"),
      hasV0: bodyText.includes("Vercel v0"),
      hasClock: bodyText.includes("Virtual Clock"),
      hasGithub: bodyText.includes("github.com/jangtrinh/design-os-svg-animation"),
      snippets: items.map(i => i.text.split('\\n')[0] + ' | ' + (i.text.split('\\n')[2] || ''))
    };
  })()`, 15000);

  console.log("Thread detail evaluation:", JSON.stringify(threadDetail, null, 2));

  // Take top screenshot
  const shot1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-final-thread-view-1.png"), Buffer.from(shot1.data, "base64"));
  console.log("Saved live-final-thread-view-1.png");

  // Scroll down
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-final-thread-view-2.png"), Buffer.from(shot2.data, "base64"));
  console.log("Saved live-final-thread-view-2.png");

  // Scroll down more
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-final-thread-view-3.png"), Buffer.from(shot3.data, "base64"));
  console.log("Saved live-final-thread-view-3.png");

  // Scroll down more
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shot4: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-final-thread-view-4.png"), Buffer.from(shot4.data, "base64"));
  console.log("Saved live-final-thread-view-4.png");
}

expandAndVerify().catch(console.error);
