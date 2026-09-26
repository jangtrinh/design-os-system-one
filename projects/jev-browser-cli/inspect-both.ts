import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function inspectBoth() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to Post 1: https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm" });
  await human.sleep(5000, 6000);

  const post1Info: any = await pool.evaluate(wsUrl, `(() => {
    return {
      title: document.title,
      url: window.location.href,
      fullBodyText: document.body.innerText.slice(0, 1500)
    };
  })()`);
  console.log("Post 1 page details:\n", JSON.stringify(post1Info, null, 2));

  const s1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "inspect-post1.png"), Buffer.from(s1.data, "base64"));

  console.log("\nNavigating to Post 2: https://www.threads.com/@jangtrinhsg/post/Ddm5u-NE1xP");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/post/Ddm5u-NE1xP" });
  await human.sleep(5000, 6000);

  const post2Info: any = await pool.evaluate(wsUrl, `(() => {
    return {
      title: document.title,
      url: window.location.href,
      fullBodyText: document.body.innerText.slice(0, 1500)
    };
  })()`);
  console.log("Post 2 page details:\n", JSON.stringify(post2Info, null, 2));

  const s2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "inspect-post2.png"), Buffer.from(s2.data, "base64"));
}

inspectBoth().catch(console.error);
