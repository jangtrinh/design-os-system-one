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

  console.log("Navigating cleanly to https://www.threads.com/@jangtrinhsg");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  // Capture top of profile (Part 1 + Part 2)
  const shot1 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "profile-thread-part1-and-2.png"), Buffer.from(shot1.data, "base64"));
  console.log("Saved profile-thread-part1-and-2.png");

  // Scroll down to Part 3
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 700, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shot2 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "profile-thread-part3.png"), Buffer.from(shot2.data, "base64"));
  console.log("Saved profile-thread-part3.png");

  // Scroll down to Part 4
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 750, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shot3 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "profile-thread-part4.png"), Buffer.from(shot3.data, "base64"));
  console.log("Saved profile-thread-part4.png");

  // Now open the thread modal on Part 1
  console.log("Clicking post Ddm5DzBk_Hm link to see connected thread modal...");
  await pool.evaluate(wsUrl, `(() => {
    const link = document.querySelector('a[href*="/post/Ddm5DzBk_Hm"]');
    if (link) link.click();
  })()`, 15000);
  await human.sleep(4000, 5000);

  // Capture modal top
  const shotModal1 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "thread-modal-top-final.png"), Buffer.from(shotModal1.data, "base64"));
  console.log("Saved thread-modal-top-final.png");

  // Scroll down modal
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shotModal2 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "thread-modal-mid-final.png"), Buffer.from(shotModal2.data, "base64"));
  console.log("Saved thread-modal-mid-final.png");

  // Scroll down modal more
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const shotModal3 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "thread-modal-bottom-final.png"), Buffer.from(shotModal3.data, "base64"));
  console.log("Saved thread-modal-bottom-final.png");

  // Inspect all posts in this thread view
  const threadAudit: any = await pool.evaluate(wsUrl, `(() => {
    const posts = Array.from(document.querySelectorAll("article, div[data-pressable-container='true']")).map((el, i) => {
      const text = (el.innerText || '').trim();
      const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
      return {
        idx: i,
        snippet: text.slice(0, 150).replace(/\\n/g, ' '),
        links
      };
    });
    return {
      total: posts.length,
      hasClaude: document.body.innerText.includes("Claude Design"),
      hasCodex: document.body.innerText.includes("OpenAI Codex"),
      hasV0: document.body.innerText.includes("Vercel v0"),
      hasClock: document.body.innerText.includes("Virtual Clock"),
      hasGithub: document.body.innerText.includes("github.com/jangtrinh/design-os-svg-animation"),
      posts
    };
  })()`, 15000);

  console.log("Thread Audit Summary:", JSON.stringify(threadAudit, null, 2));
  process.exit(0);
}

main().catch(console.error);
