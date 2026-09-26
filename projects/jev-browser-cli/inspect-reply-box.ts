import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";

async function inspectReplyBox() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  // Click on "Reply to jangtrinhsg..."
  console.log("Clicking reply trigger...");
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
      const txt = (e.innerText || '').trim();
      return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
    });
    if (trigger) trigger.click();
  })()`);
  await human.sleep(1500, 2000);

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/reply-box-clicked.png", Buffer.from(shot.data, "base64"));
  console.log("Saved reply-box-clicked.png");

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInputs: any = await pool.send(wsUrl, "DOM.querySelectorAll", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });
  console.log("File inputs after clicking reply:", fileInputs?.nodeIds);

  const interactive: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('[contenteditable="true"], [role="button"], button, svg')).map(e => ({
      tag: e.tagName,
      role: e.getAttribute('role'),
      aria: e.getAttribute('aria-label'),
      text: (e.innerText || '').slice(0, 30)
    })).filter(x => x.aria || (x.text && x.text.length > 0));
  })()`);
  console.log("Interactive elements:", JSON.stringify(interactive.slice(0, 30), null, 2));
}

inspectReplyBox().catch(console.error);
