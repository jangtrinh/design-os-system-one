import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";

async function openPost() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to https://www.threads.com/@jangtrinhsg...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  // Click the first post card
  const clicked = await pool.evaluate(wsUrl, `(() => {
    const postLink = Array.from(document.querySelectorAll('a[href*="/post/Ddm5DzBk_Hm"]'))[0];
    if (postLink) {
      postLink.click();
      return "clicked post link";
    }
    const anyLink = Array.from(document.querySelectorAll('a[href*="/post/"]'))[0];
    if (anyLink) {
      anyLink.click();
      return "clicked any post link: " + anyLink.getAttribute('href');
    }
    return "no link found";
  })()`);
  console.log("Click result:", clicked);
  await human.sleep(3000, 4000);

  const curUrl = await pool.evaluate(wsUrl, "window.location.href");
  console.log("Current URL after click:", curUrl);

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/thread-view.png", Buffer.from(shot.data, "base64"));
  console.log("Saved thread-view.png");
}

openPost().catch(console.error);
