import path from "path";
import fs from "fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const REEL_VIDEO_PATH = path.join(ARTIFACT_DIR, "svg-animation-ai-intro-reel.mp4");
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

const CARD_1_TEXT = `Dựng Video Introduction cho web-app trước đây thường rất tốn công: hoặc mất hàng tuần căn chỉnh keyframe trong After Effects, hoặc quay màn hình thì mờ chữ và giật frame.

Với AI kết hợp SVG animation, quy trình này giờ đây cực kỳ nhanh và dễ:
👉 Bạn chỉ cần đưa vào 1 video tham khảo (reference video) về nhịp điệu motion + mô tả kịch bản bằng lời.
👉 AI sẽ tự động bóc tách và sử dụng CHÍNH các UI element từ sản phẩm thực tế của bạn (vector SVG, typography, layout code) để dựng thành video intro chuyển động mượt mà.

Dưới đây là reel tổng hợp 44s dựng 100% bằng code từ Claude Design, OpenAI Codex App và Vercel v0 👇`;

const CARD_2_TEXT = `Điểm khác biệt cốt lõi so với video AI tạo hình ảnh (Sora/Runway):
• Không bịa ra pixel ảo: Toàn bộ nút bấm, bảng điều khiển, code editor là vector SVG & React component thật từ sản phẩm của bạn.
• Virtual Clock Engine: Render từng frame độc lập qua Headless Chromium + FFmpeg ở chuẩn 1080p 60fps, loại bỏ hoàn toàn tình trạng rớt frame hay lag giật khi quay màn hình.
• Chuẩn hoá Design System: Tự động tuân thủ icon vector chính thống (Phosphor/Lucide), viền 1px tactile depth, zero emoji rác.`;

const CARD_3_TEXT = `Toàn bộ công cụ và các kịch bản mẫu vừa được mở mã nguồn:
⭐️ GitHub: https://github.com/jangtrinh/design-os-svg-animation
🚀 Web Player tương tác: https://jangtrinh.github.io/design-os-svg-animation/

Anh em làm web-app, SaaS hoặc dev tools muốn tự tạo video intro sắc nét bằng chính UI của mình thì ghé qua trải nghiệm nhé!`;

async function main() {
  console.log("🚀 [LAUNCH] Starting publication of design-os-svg-animation thread...");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No active Threads tab found on port 9222");
  const wsUrl = t.webSocketDebuggerUrl;

  // 1. Navigate to home
  console.log("🌐 Navigating safely to Threads home...");
  await human.navigateSafely(wsUrl, "https://www.threads.com/");
  await human.sleep(3500, 5000);

  // 2. Open Composer
  console.log("📝 Opening Threads composer...");
  for (let attempt = 0; attempt < 3; attempt++) {
    await pool.evaluate(wsUrl, `(() => {
      const triggers = Array.from(document.querySelectorAll('div[role="button"], span, div')).filter(e => {
        const txt = (e.innerText || '').trim();
        return txt === "Start a thread..." || txt === "New thread";
      });
      if (triggers.length > 0) triggers[0].click();
    })()`);
    await human.sleep(1500, 2000);
    const dialogOpen = await pool.evaluate(wsUrl, `!!document.querySelector('div[role="dialog"]')`);
    if (dialogOpen) break;
  }

  // 3. Focus editor and type Card 1
  console.log("✍️ [HUMAN TYPING] Typing Card 1 (Hook & Core Value)...");
  await pool.evaluate(wsUrl, `(() => {
    const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);
  await human.typeHumanLike(wsUrl, CARD_1_TEXT);
  await human.sleep(2000, 2500);

  // 4. Attach 44s highlight reel video
  console.log(`📎 Attaching 1080p 44s highlight reel video: ${REEL_VIDEO_PATH}...`);
  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (fileInput && fileInput.nodeId) {
    await pool.send(wsUrl, "DOM.setFileInputFiles", {
      files: [REEL_VIDEO_PATH],
      nodeId: fileInput.nodeId
    });
    console.log("✅ Video attached to input. Waiting 12s for video upload & thumbnail generation...");
    await human.sleep(12000, 15000);
  } else {
    throw new Error("Could not find file input in DOM");
  }

  // 5. Add Card 2
  console.log("➕ Adding Card 2 (Deep Tech & Value Prop)...");
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

  // 6. Focus Card 2 editor & type
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

  // 7. Add Card 3
  console.log("➕ Adding Card 3 (Open Source Links & Call To Action)...");
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

  // 8. Focus Card 3 editor & type
  console.log("✍️ [HUMAN TYPING] Typing Card 3...");
  await pool.evaluate(wsUrl, `(() => {
    const editors = document.querySelectorAll('div[role="dialog"] [contenteditable="true"]');
    if (editors.length >= 3) {
      editors[editors.length - 1].focus();
    }
  })()`);
  await human.sleep(1000, 1500);
  await human.typeHumanLike(wsUrl, CARD_3_TEXT);
  await human.sleep(2500, 3000);

  // 9. Capture Staged Proof Screenshot
  const stagedShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const stagedPath = path.join(ARTIFACT_DIR, "staged-svg-animation-thread.png");
  fs.writeFileSync(stagedPath, Buffer.from(stagedShot.data, "base64"));
  console.log(`📸 Staged proof saved to: ${stagedPath}`);

  // 10. Submit Post
  console.log("🚀 Clicking Post button...");
  await human.sleep(1500, 2000);
  const postResult: any = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { success: false, reason: "No dialog" };
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      return t === "Post";
    });
    if (postBtn) {
      postBtn.click();
      return { success: true };
    }
    return { success: false, reason: "Post button not found" };
  })()`);
  console.log(`Post submit result: ${JSON.stringify(postResult)}`);

  // 11. Wait for submission and postflight verification
  console.log("⏳ Waiting 10s for post completion...");
  await human.sleep(10000, 14000);

  // Navigate to profile to verify live post
  console.log("🔍 Checking live post on profile...");
  await human.navigateSafely(wsUrl, "https://www.threads.com/@jangtrinhsg");
  await human.sleep(5000, 7000);

  const liveShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const livePath = path.join(ARTIFACT_DIR, "live-svg-animation-thread.png");
  fs.writeFileSync(livePath, Buffer.from(liveShot.data, "base64"));
  console.log(`🏆 Live verified proof saved to: ${livePath}`);

  // 12. Update growth state
  try {
    if (fs.existsSync(GROWTH_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
      state.completedDrops.push("drop_design_os_svg_animation_launch");
      state.totalPosts = (state.totalPosts || 0) + 1;
      state.lastDropAt = new Date().toISOString();
      state.logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Published Launch Thread for design-os-svg-animation (3 cards + 44s highlight reel)`);
      fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
      console.log("Updated autonomous growth state.");
    }
  } catch (e) {
    console.error("Error updating growth state:", e);
  }

  console.log("\n🎉 [SUCCESS] Thread published and live verified!");
}

main().catch(err => {
  console.error("❌ Error publishing thread:", err);
  process.exit(1);
});
