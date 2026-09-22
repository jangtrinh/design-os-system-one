import { CdpSessionPool } from "./cdp-session-pool.js";
import { AsyncGuard } from "./async-guard.js";
import { JevUltrafast } from "./jev-ultrafast.js";
import fs from "fs";

const CARD_1_TEXT = `Most 3D printed mechanical keyboards sound hollow and rattle after 2 weeks.

We engineered the CK-001 in Blender with leaf-spring gasket dampening, 5 rotary encoder D-shafts, and 0.15mm switch tolerances.

• 284 × 92 × 32 mm footprint (58 keys + 5 knobs)
• 3.0mm key travel with 0.2mm ceiling reserve
• Dual parallel spacebar stabilizer guides
• 781 verified assembly meshes

Exploded layout & acoustic fit 👇 #3dprinting`;

const CARD_2_TEXT = `To eliminate switch chatter, each plate family (top frame, switch plate, PCB carrier, bottom shell) uses ISO 273 brass heat-set inserts with radial wall stock verification.

Full CAD sources, STL print kit, and BOM:
https://github.com/jangtrinh/design-os-3d-blender

Would you print your daily driver keyboard or stick to CNC aluminum? 👇`;

const IMG_1 = "/Users/jangtrinh/Products/design-os-3d-blender/builds/reference-keyboard/delivery/r02/CK-001-exploded.png";
const IMG_2 = "/Users/jangtrinh/Products/design-os-3d-blender/builds/reference-keyboard/delivery/r02/CK-001-knob-detail.png";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 [JEV ULTRAFAST] Initiating CK-001 Mechanical Keyboard Viral Drop...");

  // 1. Safety validation through AsyncGuard
  const guard = new AsyncGuard(0.15);
  const v1 = await guard.evaluateSafety({ action: "type", value: CARD_1_TEXT, selector: "#card-1", confidence: 1, rationale: "Card 1", latencyMs: 1 }, "https://www.threads.com", { allowPublicPost: true });
  const v2 = await guard.evaluateSafety({ action: "type", value: CARD_2_TEXT, selector: "#card-2", confidence: 1, rationale: "Card 2", latencyMs: 1 }, "https://www.threads.com", { allowPublicPost: true });

  if (!v1.allowed || !v2.allowed) {
    console.error("❌ [ASYNC GUARD] Content blocked by security policy!");
    process.exit(1);
  }
  console.log("🛡️ [ASYNC GUARD] Content verified safe (< 500 chars, 0 leaks).");

  // 2. Locate Threads tab & enable focus emulation
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const threadsTab = tabs.find((t: any) => t.url && t.url.includes("threads.com"));
  if (!threadsTab || !threadsTab.webSocketDebuggerUrl) {
    console.error("❌ Threads tab not found in DIA browser!");
    process.exit(1);
  }

  const wsUrl = threadsTab.webSocketDebuggerUrl;
  const pool = CdpSessionPool.getInstance();
  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(wsUrl);

  const send = (method: string, params: any = {}) => pool.send(wsUrl, method, params, 15000);
  const evaluate = async (expression: string) => {
    const r: any = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };

  // 3. Check if modal is open, if not open it via JevUltrafast
  let isModalOpen = await evaluate(`!!document.querySelector("[role=dialog]")`);
  if (!isModalOpen) {
    console.log("Opening New Thread modal via JEV Ultrafast...");
    const state = await ultrafast.observe(wsUrl);
    const newThreadAction = ultrafast.findAction(state, /New thread/i);
    if (newThreadAction && newThreadAction.node) {
      await ultrafast.clickNode(wsUrl, newThreadAction.node);
    } else {
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll("div[role=button], a, div")).find(b => (b.innerText || "").trim() === "New thread");
        if (btn) btn.click();
      })()`);
    }
    await sleep(1500);
  }

  // 4. Input Card 1 text
  console.log("✍️ [STEP 1] Typing Card 1...");
  await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    const editable = dialog.querySelector("[contenteditable=true]");
    if (editable) editable.focus();
  })()`);
  await sleep(300);
  await send("Input.insertText", { text: CARD_1_TEXT });
  await sleep(500);

  // 5. Attach Image 1 to Card 1
  console.log("📎 [STEP 2] Attaching exploded render (CK-001-exploded.png)...");
  await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    const input = dialog.querySelector("input[type=file]");
    if (input) input.setAttribute("data-target", "card-1-file");
  })()`);

  const doc1: any = await send("DOM.getDocument");
  const query1: any = await send("DOM.querySelector", {
    nodeId: doc1.root.nodeId,
    selector: 'input[data-target="card-1-file"]'
  });

  if (query1 && query1.nodeId) {
    await send("DOM.setFileInputFiles", {
      nodeId: query1.nodeId,
      files: [IMG_1]
    });
    console.log("   Image 1 uploaded to DOM.");
  }
  await sleep(2500);

  // 6. Click "Add to thread" for Card 2
  console.log("🧵 [STEP 3] Adding Card 2 to thread...");
  const addBtnCoords: any = await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    const btn = Array.from(dialog.querySelectorAll("[role=button]")).find(b => b.innerText && b.innerText.includes("Add to thread"));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);

  if (addBtnCoords) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: addBtnCoords.x, y: addBtnCoords.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: addBtnCoords.x, y: addBtnCoords.y, button: "left", clickCount: 1 });
    await sleep(1000);
  }

  // 7. Focus newest contenteditable & type Card 2 text
  console.log("✍️ [STEP 4] Typing Card 2...");
  await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    const editables = dialog.querySelectorAll("[contenteditable=true]");
    const newest = editables[editables.length - 1];
    if (newest) newest.focus();
  })()`);
  await sleep(300);
  await send("Input.insertText", { text: CARD_2_TEXT });
  await sleep(500);

  // 8. Attach Image 2 to Card 2
  console.log("📎 [STEP 5] Attaching rotary knob render (CK-001-knob-detail.png)...");
  await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    const inputs = dialog.querySelectorAll("input[type=file]");
    const newest = inputs[inputs.length - 1];
    if (newest) newest.setAttribute("data-target", "card-2-file");
  })()`);

  const doc2: any = await send("DOM.getDocument");
  const query2: any = await send("DOM.querySelector", {
    nodeId: doc2.root.nodeId,
    selector: 'input[data-target="card-2-file"]'
  });

  if (query2 && query2.nodeId) {
    await send("DOM.setFileInputFiles", {
      nodeId: query2.nodeId,
      files: [IMG_2]
    });
    console.log("   Image 2 uploaded to DOM.");
  }
  await sleep(3000);

  // 9. Capture pre-flight screenshot proof
  console.log("📸 [STEP 6] Capturing pre-flight staging proof...");
  const preShot: any = await send("Page.captureScreenshot", { format: "png", quality: 85 });
  const prePath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-keyboard-staged.png";
  fs.writeFileSync(prePath, Buffer.from(preShot.data, "base64"));
  console.log("   Pre-flight proof saved to:", prePath);

  // 10. Click "Post" button!
  console.log("📤 [STEP 7] Clicking Post button...");
  const postBtnInfo: any = await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return null;
    const buttons = Array.from(dialog.querySelectorAll("[role=button]"));
    const postBtn = buttons.find(b => b.innerText && b.innerText.trim() === "Post");
    if (!postBtn) return null;
    const disabled = postBtn.getAttribute("aria-disabled") === "true" || postBtn.disabled;
    const r = postBtn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled };
  })()`);

  console.log("Post button info:", postBtnInfo);
  if (!postBtnInfo || postBtnInfo.disabled) {
    console.error("❌ Post button not clickable or disabled!");
    process.exit(1);
  }

  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: postBtnInfo.x, y: postBtnInfo.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: postBtnInfo.x, y: postBtnInfo.y, button: "left", clickCount: 1 });

  // 11. Monitor publishing until dialog closes
  console.log("⏳ [STEP 8] Monitoring submission...");
  let closed = false;
  for (let i = 0; i < 35; i++) {
    await sleep(1000);
    const isOpen = await evaluate(`!!document.querySelector("[role=dialog]")`);
    if (!isOpen) {
      console.log("🎉 [SUCCESS] Dialog closed! CK-001 Keyboard post is live on Threads!");
      closed = true;
      break;
    }
    console.log(`   Uploading media... (${i + 1}/35s)`);
  }

  await sleep(3000);

  // 12. Capture post-publication screenshot
  const postShot: any = await send("Page.captureScreenshot", { format: "png", quality: 85 });
  const postPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-keyboard-published.png";
  fs.writeFileSync(postPath, Buffer.from(postShot.data, "base64"));
  console.log("✅ Post-publication proof saved to:", postPath);

  pool.closeAll();
  process.exit(0);
}

main().catch(console.error);
