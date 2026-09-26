import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";

async function testOpenComposer() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating directly via Page.navigate to https://www.threads.com/...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/" });
  await human.sleep(4000, 5000);

  console.log("Checking current url:", await pool.evaluate(wsUrl, "window.location.href"));

  // Click create button
  const clicked = await pool.evaluate(wsUrl, `(() => {
    // Check for "New thread" or "Start a thread..." or "+" icon
    const elements = Array.from(document.querySelectorAll('a, div[role="button"], button, span'));
    const createBtn = elements.find(e => {
      const txt = (e.innerText || '').trim();
      const aria = e.getAttribute('aria-label') || '';
      return txt === "New thread" || txt === "Start a thread..." || aria === "Create" || aria === "New thread";
    });
    if (createBtn) {
      createBtn.click();
      return "clicked: " + (createBtn.innerText || createBtn.getAttribute('aria-label'));
    }
    return "not found";
  })()`);
  console.log("Create button click result:", clicked);
  await human.sleep(2000, 3000);

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/composer-opened.png", Buffer.from(shot.data, "base64"));
  console.log("Saved composer-opened.png");

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });
  console.log("File input nodeId:", fileInput?.nodeId);
}

testOpenComposer().catch(console.error);
