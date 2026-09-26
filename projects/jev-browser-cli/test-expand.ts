import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";

async function testExpand() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Clicking Expand composer button...");
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('[aria-label="Expand composer"]');
    if (btn) btn.click();
  })()`);
  await human.sleep(1500, 2000);

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/composer-expanded.png", Buffer.from(shot.data, "base64"));
  console.log("Saved composer-expanded.png");

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });
  console.log("File input after expand:", fileInput?.nodeId);
}

testExpand().catch(console.error);
