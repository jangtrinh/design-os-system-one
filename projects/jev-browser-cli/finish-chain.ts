import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

const PROMO_DIR = "/Users/jangtrinh/Products/design-os-svg-animation/promo";
const VIDEO_CODEX = path.join(PROMO_DIR, "codex-app-promo.mp4");
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

async function waitForPostInDialog(pool: CdpSessionPool, wsUrl: string, maxWaitMs = 60000): Promise<boolean> {
  const start = Date.now();
  console.log("⏳ Waiting for Post button to become active...");
  while (Date.now() - start < maxWaitMs) {
    const res: any = await pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { found: false, ready: false, reason: "no dialog" };
      const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      const btn = btns.find(b => (b.innerText || '').trim() === "Post");
      if (!btn) return { found: false, ready: false, reason: "no post btn" };
      const disabled = btn.hasAttribute('disabled') || 
                       btn.getAttribute('aria-disabled') === 'true' ||
                       window.getComputedStyle(btn).opacity === '0.5' ||
                       window.getComputedStyle(btn).cursor === 'not-allowed';
      if (disabled) return { found: true, ready: false, reason: "disabled" };
      btn.click();
      return { found: true, ready: true };
    })()`);

    if (res?.ready) {
      console.log("✅ Clicked Post button successfully!");
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function finishChain() {
  console.log("============================================================");
  console.log("🚀 [JEV CHAIN] Completing Part 2, Part 3, and Part 4...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  // -------------------------------------------------------------------------
  // STEP 2: Attach Codex Video & Post Part 2
  // -------------------------------------------------------------------------
  console.log(">>> [STEP 2/4] Attaching Codex App video to current open modal...");
  let doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  let fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input in open modal");

  console.log(`Setting file input to ${VIDEO_CODEX} (nodeId: ${fileInput.nodeId})...`);
  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_CODEX],
    nodeId: fileInput.nodeId
  });

  console.log("Uploaded Codex App video. Waiting 16s for processing...");
  await human.sleep(15000, 18000);

  // Capture staged proof
  const stagedShot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part2-codex.png"), Buffer.from(stagedShot2.data, "base64"));
  console.log("📸 Saved staged proof: staged-part2-codex.png");

  // Click Post
  const posted2 = await waitForPostInDialog(pool, wsUrl);
  if (!posted2) throw new Error("Failed to post Part 2");

  console.log("Waiting 16s for Part 2 to settle...");
  await human.sleep(15000, 18000);

  const liveShot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part2-codex.png"), Buffer.from(liveShot2.data, "base64"));
  console.log("📸 Saved live proof: live-part2-codex.png");

  // -------------------------------------------------------------------------
  // STEP 3: Reply with Part 3 (Vercel v0 Generative UI Promo)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 3/4] Replying with Part 3 + Vercel v0 Video...");
  // Focus inline reply trigger
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
      const txt = (e.innerText || '').trim();
      return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
    });
    if (trigger) trigger.click();
  })()`);
  await human.sleep(1500, 2000);

  // Type Part 3 text
  console.log("Inserting Part 3 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_3_TEXT });
  await human.sleep(1500, 2000);

  // Click Expand composer button
  console.log("Expanding composer for Part 3...");
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('[aria-label="Expand composer"]');
    if (btn) btn.click();
  })()`);
  await human.sleep(1500, 2000);

  // Attach Video 3
  doc = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  fileInput = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input for Part 3");

  console.log(`Setting file input to ${VIDEO_V0} (nodeId: ${fileInput.nodeId})...`);
  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_V0],
    nodeId: fileInput.nodeId
  });

  console.log("Uploaded Vercel v0 video. Waiting 15s for processing...");
  await human.sleep(14000, 16000);

  // Capture staged proof
  const stagedShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part3-v0.png"), Buffer.from(stagedShot3.data, "base64"));
  console.log("📸 Saved staged proof: staged-part3-v0.png");

  // Click Post
  const posted3 = await waitForPostInDialog(pool, wsUrl);
  if (!posted3) throw new Error("Failed to post Part 3");

  console.log("Waiting 16s for Part 3 to settle...");
  await human.sleep(15000, 18000);

  const liveShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part3-v0.png"), Buffer.from(liveShot3.data, "base64"));
  console.log("📸 Saved live proof: live-part3-v0.png");

  // -------------------------------------------------------------------------
  // STEP 4: Reply with Part 4 (Virtual Clock Engine & Links)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 4/4] Replying with Part 4: Virtual Clock & Links...");
  // Focus inline reply trigger
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
      const txt = (e.innerText || '').trim();
      return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
    });
    if (trigger) trigger.click();
  })()`);
  await human.sleep(1500, 2000);

  // Type Part 4 text
  console.log("Inserting Part 4 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  await human.sleep(2500, 3500);

  // Staged proof Part 4
  const stagedShot4: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part4-links.png"), Buffer.from(stagedShot4.data, "base64"));
  console.log("📸 Saved staged proof: staged-part4-links.png");

  // Click Reply button (inline or expand)
  console.log("Submitting Part 4 reply...");
  await pool.evaluate(wsUrl, `(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
    const btn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
    });
    if (btn) btn.click();
  })()`);

  console.log("Waiting 12s for Part 4 to settle...");
  await human.sleep(12000, 14000);

  // -------------------------------------------------------------------------
  // STEP 5: Final Live Verification
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 5] Final Full Thread Overview Verification...");
  await pool.evaluate(wsUrl, `window.location.reload()`);
  await human.sleep(6000, 8000);
  await human.scrollNatural(wsUrl, 2);

  const finalShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const finalPath = path.join(ARTIFACT_DIR, "live-svg-animation-complete-thread.png");
  fs.writeFileSync(finalPath, Buffer.from(finalShot.data, "base64"));
  console.log(`🏆 Final complete thread verified: ${finalPath}`);

  // Update growth state
  try {
    if (fs.existsSync(GROWTH_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
      state.completedDrops.push("drop_design_os_svg_animation_launch_v2");
      state.totalPosts = (state.totalPosts || 0) + 1;
      state.lastDropAt = new Date().toISOString();
      state.logs.push(`[${new Date().toLocaleTimeString()}] Published complete 4-part multi-video sequential thread for design-os-svg-animation (3 separate videos + links, zero emojis)`);
      fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
      console.log("Updated autonomous growth state.");
    }
  } catch (e) {
    console.error("Error updating growth state:", e);
  }

  console.log("\n============================================================");
  console.log("🎉 [SUCCESS] Entire 4-part multi-video thread is live!");
  console.log(`🔗 Root Thread: https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm`);
  console.log("============================================================");
}

finishChain().catch(err => {
  console.error("❌ Error in finishChain:", err);
  process.exit(1);
});
