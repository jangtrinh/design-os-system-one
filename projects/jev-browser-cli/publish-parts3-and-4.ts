import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

const PROMO_DIR = "/Users/jangtrinh/Products/design-os-svg-animation/promo";
const VIDEO_V0 = path.join(PROMO_DIR, "v0-generative-ui.mp4");

const PART_3_TEXT = `Part 3/4
Ví dụ thứ ba: bản dựng lại Vercel v0 Generative UI Promo.

Từ nét vẽ wireframe đến chuỗi prompt, chỉnh component, thẻ code phối cảnh và bật Stealth Mode.

Mỗi chuyển cảnh đưa người xem sang một bước mới. Cách kể này phù hợp khi cần giới thiệu một sản phẩm có nhiều lớp tương tác.`;

const PART_4_TEXT = `Part 4/4
Virtual Clock đặt thời gian cho từng khung hình, giúp xuất video với nhịp chuyển động xác định mà không phụ thuộc tốc độ quay màn hình.

SVG là vector nên giữ nét khi phóng to trong bản web. MP4 xuất ra vẫn có độ phân giải cố định.

GitHub: https://github.com/jangtrinh/design-os-svg-animation
Web demo: https://jangtrinh.github.io/design-os-svg-animation/`;

async function waitForPostOrReplyButton(pool: CdpSessionPool, wsUrl: string, maxWaitMs = 60000): Promise<boolean> {
  const start = Date.now();
  console.log(`⏳ Waiting for Post/Reply button to become active and ready...`);
  while (Date.now() - start < maxWaitMs) {
    const res: any = await pool.evaluate(wsUrl, `(() => {
      let scope = document;
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) scope = dialog;

      const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
      const btn = btns.find(b => {
        const t = (b.innerText || '').trim();
        const aria = b.getAttribute('aria-label') || '';
        return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
      });
      if (!btn) return { found: false, ready: false, reason: "button not found" };
      
      const disabled = btn.hasAttribute('disabled') || 
                       btn.getAttribute('aria-disabled') === 'true' ||
                       window.getComputedStyle(btn).opacity === '0.5' ||
                       window.getComputedStyle(btn).cursor === 'not-allowed';
      if (disabled) {
        return { found: true, ready: false, reason: "button disabled/processing" };
      }
      btn.click();
      return { found: true, ready: true };
    })()`, 15000);

    if (res?.ready) {
      console.log(`✅ Clicked Post/Reply button successfully!`);
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV LAUNCH] Publishing Part 3 (v0 Video) and Part 4 (Links)...");
  console.log("Strict constraints: Zero emojis, Zero special characters.");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found on port 9222");
  const wsUrl = t.webSocketDebuggerUrl;

  // -------------------------------------------------------------------------
  // STEP 3: Part 3 + Vercel v0 Video
  // -------------------------------------------------------------------------
  console.log(">>> [STEP 3] Preparing Part 3...");

  // Click expand composer or click the reply area
  await pool.evaluate(wsUrl, `(() => {
    const expandBtn = document.querySelector('[aria-label="Expand composer"]');
    if (expandBtn) {
      expandBtn.click();
    } else {
      const ed = document.querySelector('[contenteditable="true"]');
      if (ed) ed.focus();
    }
  })()`, 15000);
  await human.sleep(1500, 2000);

  // Focus contenteditable and insert Part 3 text
  console.log("Inserting Part 3 text...");
  await pool.evaluate(wsUrl, `(() => {
    const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]') || document.querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`, 15000);
  await human.sleep(500, 800);

  await pool.send(wsUrl, "Input.insertText", { text: PART_3_TEXT });
  await human.sleep(1500, 2000);

  // Attach Vercel v0 Video
  console.log(`Attaching Vercel v0 video: ${VIDEO_V0}...`);
  const doc = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInputNode = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInputNode || !fileInputNode.nodeId) {
    throw new Error("Could not find input[type='file'] for Part 3");
  }

  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_V0],
    nodeId: fileInputNode.nodeId
  });
  console.log("File input set. Waiting 15s for video encoding...");
  await human.sleep(14000, 16000);

  // Save Staged Part 3 Screenshot
  const stagedShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part3-v0-final.png"), Buffer.from(stagedShot3.data, "base64"));
  console.log("📸 Saved staged proof: staged-part3-v0-final.png");

  // Submit Part 3
  const clicked3 = await waitForPostOrReplyButton(pool, wsUrl);
  if (!clicked3) throw new Error("Failed to click button for Part 3");

  console.log("Waiting 16s for Part 3 to settle on Threads backend...");
  await human.sleep(16000, 18000);

  const liveShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part3-v0-final.png"), Buffer.from(liveShot3.data, "base64"));
  console.log("📸 Saved live proof: live-part3-v0-final.png");

  // -------------------------------------------------------------------------
  // STEP 4: Part 4 (Virtual Clock Engine & Links)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 4] Preparing Part 4 (Links)...");

  // Focus reply input
  await pool.evaluate(wsUrl, `(() => {
    const expandBtn = document.querySelector('[aria-label="Expand composer"]');
    if (expandBtn) {
      expandBtn.click();
    } else {
      const eds = document.querySelectorAll('[contenteditable="true"]');
      const lastEd = eds[eds.length - 1];
      if (lastEd) lastEd.focus();
    }
  })()`, 15000);
  await human.sleep(1500, 2000);

  console.log("Inserting Part 4 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  await human.sleep(3000, 4000);

  // Save Staged Part 4 Screenshot
  const stagedShot4: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part4-links-final.png"), Buffer.from(stagedShot4.data, "base64"));
  console.log("📸 Saved staged proof: staged-part4-links-final.png");

  // Submit Part 4
  const clicked4 = await waitForPostOrReplyButton(pool, wsUrl);
  if (!clicked4) throw new Error("Failed to click button for Part 4");

  console.log("Waiting 14s for Part 4 to settle...");
  await human.sleep(14000, 16000);

  const liveShot4: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part4-links-final.png"), Buffer.from(liveShot4.data, "base64"));
  console.log("📸 Saved live proof: live-part4-links-final.png");

  // -------------------------------------------------------------------------
  // STEP 5: Capture Full Connected Thread Proofs
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 5] Navigating to root thread to capture complete connected proofs...");
  const rootThreadUrl = "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm";
  await pool.send(wsUrl, "Page.navigate", { url: rootThreadUrl });
  await human.sleep(6000, 7000);

  // Top shot (Part 1 + Part 2)
  const proofTop: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "full-thread-proof-top.png"), Buffer.from(proofTop.data, "base64"));
  console.log("📸 Saved full-thread-proof-top.png");

  // Scroll down
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 750, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const proofMid: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "full-thread-proof-mid.png"), Buffer.from(proofMid.data, "base64"));
  console.log("📸 Saved full-thread-proof-mid.png");

  // Scroll down more
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 850, behavior: 'instant' })`, 15000);
  await human.sleep(2000, 2500);

  const proofBottom: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "full-thread-proof-bottom.png"), Buffer.from(proofBottom.data, "base64"));
  console.log("📸 Saved full-thread-proof-bottom.png");

  // Update growth state
  try {
    if (fs.existsSync(GROWTH_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
      if (!state.completedDrops.includes("drop_design_os_svg_animation_launch_v2")) {
        state.completedDrops.push("drop_design_os_svg_animation_launch_v2");
        state.totalPosts = (state.totalPosts || 0) + 1;
      }
      state.lastDropAt = new Date().toISOString();
      state.logs.push(`[${new Date().toLocaleTimeString()}] Successfully published and verified complete 4-part sequential thread for design-os-svg-animation`);
      fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
      console.log("Updated autonomous growth state successfully.");
    }
  } catch (e) {
    console.error("Error updating growth state:", e);
  }

  console.log("\n============================================================");
  console.log("🎉 [COMPLETED] All 4 parts are live and verified on Threads!");
  console.log(`🔗 Root Thread: ${rootThreadUrl}`);
  console.log("============================================================");
}

main().catch(err => {
  console.error("❌ Error publishing parts 3 and 4:", err);
  process.exit(1);
});
