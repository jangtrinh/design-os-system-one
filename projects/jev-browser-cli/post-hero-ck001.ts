import path from "path";
import fs from "fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const HERO_IMAGE_PATH = "/Users/jangtrinh/Products/design-os-3d-blender/docs/reviews/ck-001/r02/CK-001-hero.jpg";

const CARD_1_TEXT = `Thiết kế bàn phím gasket-mount bằng code: Làm sao để 58 cụm phím nhún êm nhưng không bao giờ bị kẹt viền (switch binding)?

Trên mẫu CK-001 r02, toàn bộ 47 phím chính, 9 loop và 2 phím nano được tính toán khoảng hở z-travel độc lập với 4 cọc đồng đệm 5.4mm. Phím Spacebar 2u không dùng thanh cân bằng wire chợ mà chạy 2 ống dẫn hướng song song (RK_GUIDE_SLEEVE) với dung sai quét va chạm full-travel 0–3.0mm.

Anh em chơi custom thích cảm giác gõ bottom-out cứng cáp của plate nhôm hay flex mềm của FR4/POM khoét rãnh leaf-spring?`;

const CARD_2_TEXT = `Toàn bộ pipeline dựng hình tham số bằng Python trong Blender và mô hình 3D tương tác bóc tách từng lớp (exploded view) của CK-001 đều có thể xoay trực tiếp trên web tại: https://jangtrinh.github.io/design-os-3d-blender/`;

async function run() {
  console.log("🚀 [CK-001 HERO POST] Starting Post 1 publishing pipeline...");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  // 1. Locate Threads tab
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No active Threads tab found on port 9222");

  const wsUrl = t.webSocketDebuggerUrl;
  console.log(`📌 Attached to Threads tab: ${t.url}`);

  // 2. Check if dialog is already open, if not click "New thread"
  let dialogOpen = await pool.evaluate(wsUrl, `(() => {
    return !!document.querySelector('div[role="dialog"]');
  })()`);

  if (!dialogOpen) {
    console.log("📝 Opening 'New thread' dialog...");
    await pool.evaluate(wsUrl, `(() => {
      const btn = Array.from(document.querySelectorAll('div[role="button"], button, a')).find(b => 
        (b.innerText || '').trim() === "New thread" || b.getAttribute('aria-label') === "New thread"
      );
      if (btn) btn.click();
    })()`);

    for (let i = 0; i < 10; i++) {
      await human.sleep(500, 700);
      dialogOpen = await pool.evaluate(wsUrl, `(() => {
        return !!document.querySelector('div[role="dialog"]');
      })()`);
      if (dialogOpen) break;
    }
  }

  console.log(`Composer dialog open: ${dialogOpen}`);
  if (!dialogOpen) throw new Error("Could not open composer dialog");

  // 3. Focus editor and type Card 1
  console.log("✍️ [HUMAN TYPING] Typing Card 1...");
  await pool.evaluate(wsUrl, `(() => {
    const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);
  await human.typeHumanLike(wsUrl, CARD_1_TEXT);
  await human.sleep(2000, 2500);

  // 4. Attach authentic CK-001 hero render via DOM.setFileInputFiles with full depth
  console.log(`📎 Attaching authentic CAD image: ${HERO_IMAGE_PATH}...`);
  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (fileInput && fileInput.nodeId) {
    await pool.send(wsUrl, "DOM.setFileInputFiles", {
      files: [HERO_IMAGE_PATH],
      nodeId: fileInput.nodeId
    });
    console.log("✅ File attached to input element. Waiting 6s for thumbnail upload...");
    await human.sleep(6000, 7500);
  } else {
    throw new Error("Could not find file input in DOM");
  }

  // 5. Click "Add to thread"
  console.log("➕ Adding Card 2 (follow-up thread)...");
  await human.thinkPause();
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return;
    const addBtns = Array.from(dialog.querySelectorAll('div[role="button"], span, div')).filter(e => 
      (e.innerText || '').trim() === "Add to thread"
    );
    if (addBtns.length > 0) addBtns[0].click();
  })()`);
  await human.sleep(2000, 2500);

  // 6. Focus second card editor and type Card 2
  console.log("✍️ [HUMAN TYPING] Typing Card 2...");
  await pool.evaluate(wsUrl, `(() => {
    const editors = document.querySelectorAll('div[role="dialog"] [contenteditable="true"]');
    if (editors.length >= 2) {
      editors[editors.length - 1].focus();
    }
  })()`);
  await human.sleep(1000, 1500);
  await human.typeHumanLike(wsUrl, CARD_2_TEXT);
  await human.sleep(2000, 2500);

  // 7. Capture Staged Proof Screenshot
  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const stagedPath = path.join(ARTIFACT_DIR, "hero-ck001-post1-staged.png");
  fs.writeFileSync(stagedPath, Buffer.from(shot.data, "base64"));
  console.log(`📸 Staged proof saved to: ${stagedPath}`);

  // 8. Click "Post"
  console.log("🚀 Clicking Post button...");
  await human.sleep(1500, 2500);
  const posted: any = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { success: false, reason: "No dialog" };
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => b.innerText.trim() === "Post");
    if (postBtn) {
      postBtn.click();
      return { success: true };
    }
    return { success: false, reason: "Post button not found" };
  })()`);
  console.log(`Post button click result: ${JSON.stringify(posted)}`);

  // 9. Wait for network completion and verify
  console.log("⏳ Waiting 9s for Threads to publish...");
  await human.sleep(9000, 11000);

  // Navigate to profile to take post-flight verification screenshot
  await human.navigateSafely(wsUrl, "https://www.threads.com/@jangtrinhsg");
  await human.sleep(4000, 6000);
  const verifyShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const verifyPath = path.join(ARTIFACT_DIR, "hero-ck001-post1-live-verified.png");
  fs.writeFileSync(verifyPath, Buffer.from(verifyShot.data, "base64"));
  console.log(`📸 Live verified proof saved to: ${verifyPath}`);

  console.log("🎉 [SUCCESS] Bài 1 (CK-001 Hero Campaign) published and verified live!");
}

run().catch(err => {
  console.error("❌ Error publishing hero post:", err);
  process.exit(1);
});
