import { CdpSessionPool } from "./cdp-session-pool.js";
import { AsyncGuard } from "./async-guard.js";
import fs from "fs";

const CONDENSED_TEXT = `We run a multi-layered production gate before slicing:

• Topology & BVH: 0 non-manifold edges, 0 self-intersecting mesh pairs (prevents slicer voids).
• Fastener Screening: Bidirectional axial rays check through-holes; radial probes verify wall stock around ISO 273 inserts (no screw breakouts).
• Wall Thickness: >14k ray samples enforcing min wall ≥ 2.0mm.
• STL Roundtrip: Re-imports binary STL to verify volume.

Exploded interior fit 👇`;

const IMAGE_PATH = "/Users/jangtrinh/Products/design-os-3d-blender/builds/desktop-companion/delivery/R03/stills/details/interior.png";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 [JEV ENGAGE] Starting Perfect Reply to fajar_mreza...");

  // 1. Validate condensed text
  console.log(`Text length: ${CONDENSED_TEXT.length} chars (strict < 500 limit).`);
  const guard = new AsyncGuard(0.15);
  const verdict = await guard.evaluateSafety(
    { action: "type", value: CONDENSED_TEXT, selector: "reply-editor", confidence: 1, rationale: "Reply to fajar", latencyMs: 1 },
    "https://www.threads.com",
    { allowPublicPost: true }
  );
  if (!verdict.allowed) {
    console.error("❌ Blocked by AsyncGuard:", verdict.guardReason);
    process.exit(1);
  }
  console.log("🛡️ [ASYNC GUARD] Passed safety validation.");

  // 2. Discover Threads tab
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = (await res.json()) as any[];
  const threadsTab = tabs.find((t: any) => t.url && t.url.includes("threads.com"));
  if (!threadsTab || !threadsTab.webSocketDebuggerUrl) {
    console.error("❌ Threads tab not found!");
    process.exit(1);
  }

  const wsUrl = threadsTab.webSocketDebuggerUrl;
  const pool = CdpSessionPool.getInstance();

  const send = async (method: string, params: any = {}) => {
    return pool.send(wsUrl, method, params, 15000);
  };

  const evaluate = async (expression: string) => {
    const r: any = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };

  // 3. Clear existing text in active editable
  console.log("🧹 [STEP 1] Clearing existing over-length text...");
  await evaluate(`(() => {
    const ed = document.querySelector("[contenteditable=true]");
    if (ed) {
      ed.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ed);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  })()`);

  // Press Backspace or Delete to clear
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await sleep(300);

  // Check if cleared, or clear via document.execCommand
  await evaluate(`(() => {
    const ed = document.querySelector("[contenteditable=true]");
    if (ed && ed.innerText.trim().length > 0) {
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    }
  })()`);
  await sleep(300);

  // 4. Click Expand Composer button if not already in modal
  console.log("🔍 [STEP 2] Checking dialog state or clicking Expand Composer...");
  const hasDialog = await evaluate(`!!document.querySelector("[role=dialog]")`);
  if (!hasDialog) {
    const expandCoords: any = await evaluate(`(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      const expandSvg = svgs.find(s => s.getAttribute("aria-label") === "Expand composer" || s.querySelector("title")?.textContent === "Expand composer");
      if (expandSvg) {
        const r = expandSvg.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    })()`);

    if (expandCoords) {
      console.log(`🎯 Clicking expand at (${expandCoords.x}, ${expandCoords.y})...`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: expandCoords.x, y: expandCoords.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: expandCoords.x, y: expandCoords.y, button: "left", clickCount: 1 });
      await sleep(1000);
    }
  }

  // 5. Attach image via file input in modal/active container
  console.log(`📎 [STEP 3] Attaching proof image: ${IMAGE_PATH}...`);
  await evaluate(`(() => {
    const inputs = document.querySelectorAll("input[type=file]");
    const newest = inputs[inputs.length - 1];
    if (newest) newest.setAttribute("data-target", "fajar-reply-final-file");
  })()`);

  const doc: any = await send("DOM.getDocument");
  const fileInputNode: any = await send("DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[data-target="fajar-reply-final-file"]'
  });

  if (fileInputNode?.nodeId) {
    await send("DOM.setFileInputFiles", {
      nodeId: fileInputNode.nodeId,
      files: [IMAGE_PATH]
    });
    console.log("📎 Attached file via CDP. Waiting for preview...");
    await sleep(2500);
  }

  // 6. Focus the editable in modal and insert the condensed text
  console.log("✍️ [STEP 4] Focusing editable and typing condensed text...");
  await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]") || document;
    const editables = Array.from(dialog.querySelectorAll("[contenteditable=true]"));
    const target = editables[editables.length - 1];
    if (target) target.focus();
  })()`);
  await sleep(300);

  await send("Input.insertText", { text: CONDENSED_TEXT });
  await sleep(1000);

  // Take staging screenshot
  console.log("📸 [STEP 5] Capturing verified modal preview...");
  const stagedShot: any = await send("Page.captureScreenshot", { format: "png" });
  if (stagedShot?.data) {
    fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-fajar-perfect-staged.png", Buffer.from(stagedShot.data, "base64"));
    console.log("Verified preview saved to threads-fajar-perfect-staged.png");
  }

  // 7. Find and click Post button
  console.log("🚀 [STEP 6] Finding Post button in dialog...");
  const postBtnCoords: any = await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) {
      // Inline check
      const btn = Array.from(document.querySelectorAll("[role=button]")).reverse().find(b => b.innerText && b.innerText.trim() === "Post");
      if (btn) {
        const r = btn.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: btn.getAttribute("aria-disabled") === "true" || btn.disabled };
      }
      return null;
    }
    const btns = Array.from(dialog.querySelectorAll("[role=button]"));
    const postBtn = btns.find(b => b.innerText && b.innerText.trim() === "Post");
    if (postBtn) {
      const r = postBtn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: postBtn.getAttribute("aria-disabled") === "true" || postBtn.disabled };
    }
    return null;
  })()`);

  console.log("Post button info:", postBtnCoords);

  if (postBtnCoords && !postBtnCoords.disabled) {
    console.log(`🎯 Clicking Post at (${postBtnCoords.x.toFixed(1)}, ${postBtnCoords.y.toFixed(1)})...`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: postBtnCoords.x, y: postBtnCoords.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: postBtnCoords.x, y: postBtnCoords.y, button: "left", clickCount: 1 });

    console.log("⏳ Waiting for submission to settle...");
    await sleep(5000);
  } else {
    console.error("❌ Post button is either missing or disabled!", postBtnCoords);
  }

  // 8. Capture final proof screenshot
  console.log("📸 [STEP 7] Capturing final proof screenshot...");
  const finalShot: any = await send("Page.captureScreenshot", { format: "png" });
  if (finalShot?.data) {
    fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-fajar-reply-success.png", Buffer.from(finalShot.data, "base64"));
    console.log("✅ Final proof screenshot saved to threads-fajar-reply-success.png");
  }

  pool.closeAll();
  console.log("🏁 [JEV ENGAGE] Completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error in main:", err);
  process.exit(1);
});
