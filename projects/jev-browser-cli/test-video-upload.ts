import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import fs from "fs";

async function test() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Opening composer...");
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll("div[role=button], span")).find(e => (e.innerText || "").trim() === "Start a thread..." || (e.innerText || "").trim() === "New thread");
    if (trigger) trigger.click();
  })()`);
  await human.sleep(1500, 2000);

  console.log("Focusing editor & typing test line...");
  await pool.evaluate(wsUrl, `(() => {
    const ed = document.querySelector("div[role=dialog] [contenteditable=true]");
    if (ed) ed.focus();
  })()`);
  await human.sleep(500, 800);
  await pool.send(wsUrl, "Input.insertText", { text: "Testing video upload for design-os-svg-animation" });
  await human.sleep(1000, 1500);

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: "input[type=\"file\"]"
  });

  const testVideo = "/Users/jangtrinh/Products/design-os-svg-animation/promo/v0-generative-ui.mp4";
  console.log("Attaching video:", testVideo, "fileInput nodeId:", fileInput?.nodeId);

  if (fileInput?.nodeId) {
    await pool.send(wsUrl, "DOM.setFileInputFiles", {
      nodeId: fileInput.nodeId,
      files: [testVideo]
    });
    console.log("Dispatched setFileInputFiles. Waiting 8s for video upload...");
    await human.sleep(8000, 10000);
  }

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/test-video-attached.png", Buffer.from(shot.data, "base64"));
  console.log("📸 Saved test-video-attached.png!");

  // Clean up
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await human.sleep(800, 1200);
  await pool.evaluate(wsUrl, `(() => {
    const discard = Array.from(document.querySelectorAll("div[role=button], button")).find(b => (b.innerText || "").trim() === "Discard");
    if (discard) discard.click();
  })()`);
  console.log("Cleaned up composer.");
}

test().catch(console.error);
