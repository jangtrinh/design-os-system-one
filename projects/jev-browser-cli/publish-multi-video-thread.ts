import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

const PROMO_DIR = "/Users/jangtrinh/Products/design-os-svg-animation/promo";
const VIDEO_CLAUDE = path.join(PROMO_DIR, "claude-design-promo.mp4");
const VIDEO_CODEX = path.join(PROMO_DIR, "codex-app-promo.mp4");
const VIDEO_V0 = path.join(PROMO_DIR, "v0-generative-ui.mp4");

const PART_1_TEXT = `Part 1/4
Làm video giới thiệu sản phẩm bằng code giúp chủ động sửa giao diện và nhịp chuyển cảnh. Mình xây Design OS SVG Animation để dựng chuyển động trên web rồi xuất MP4.

Ví dụ đầu tiên là bản dựng lại Claude Design: quả địa cầu, bảng tinh chỉnh và montage 16 dự án. Một cách biến demo giao diện thành câu chuyện sản phẩm.`;

const PART_2_TEXT = `Part 2/4
Ví dụ thứ hai: bản dựng lại OpenAI Codex App Promo.

Cửa sổ macOS, nhiều agent chạy song song, phần xem thay đổi code và bản xem trước photobooth được đưa vào cùng một mạch kể.

Với demo công cụ lập trình, mình chọn kể theo luồng thao tác để người xem hiểu công việc diễn ra thế nào.`;

const PART_3_TEXT = `Part 3/4
Ví dụ thứ ba: bản dựng lại Vercel v0 Generative UI Promo.

Từ nét vẽ wireframe đến chuỗi prompt, chỉnh component, thẻ code phối cảnh và bật Stealth Mode.

Mỗi chuyển cảnh đưa người xem sang một bước mới. Cách kể này phù hợp khi cần giới thiệu một sản phẩm có nhiều lớp tương tác.`;

const PART_4_TEXT = `Part 4/4
Virtual Clock đặt thời gian cho từng khung hình, giúp xuất video với nhịp chuyển động xác định mà không phụ thuộc tốc độ quay màn hình.

SVG là vector nên giữ nét khi phóng to trong bản web. MP4 xuất ra vẫn có độ phân giải cố định.

GitHub: https://github.com/jangtrinh/design-os-svg-animation
Web demo: https://jangtrinh.github.io/design-os-svg-animation/`;

async function waitForPostOrReplyButton(pool: CdpSessionPool, wsUrl: string, isReply: boolean, maxWaitMs = 60000): Promise<boolean> {
  const start = Date.now();
  console.log(`⏳ Waiting for ${isReply ? "Reply" : "Post"} button to be active and ready...`);
  while (Date.now() - start < maxWaitMs) {
    const res: any = await pool.evaluate(wsUrl, `(() => {
      let scope = document;
      if (!${isReply}) {
        const dialog = document.querySelector('div[role="dialog"]');
        if (dialog) scope = dialog;
      }
      const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
      const btn = btns.find(b => {
        const t = (b.innerText || '').trim();
        const aria = b.getAttribute('aria-label') || '';
        if (${isReply}) {
          return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
        } else {
          return t === "Post";
        }
      });
      if (!btn) return { found: false, ready: false, reason: "button not found" };
      const disabled = btn.hasAttribute('disabled') || 
                       btn.getAttribute('aria-disabled') === 'true' ||
                       window.getComputedStyle(btn).opacity === '0.5' ||
                       window.getComputedStyle(btn).cursor === 'not-allowed';
      if (disabled) {
        return { found: true, ready: false, reason: "button disabled/uploading" };
      }
      btn.click();
      return { found: true, ready: true };
    })()`);

    if (res?.ready) {
      console.log(`✅ Successfully clicked ${isReply ? "Reply" : "Post"} button!`);
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV LAUNCH] Starting 4-Part Multi-Video Sequential Thread...");
  console.log("Strict constraints: Zero emojis, Zero special characters, 1 video per example.");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No active Threads tab found on port 9222");
  const wsUrl = t.webSocketDebuggerUrl;

  // -------------------------------------------------------------------------
  // STEP 1: Post Part 1 (Claude Design Promo)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 1/4] Publishing Root Post: Part 1 + Claude Design Video...");
  
  // Check if dialog is already open, if not navigate to home and open it
  let dialogOpen: boolean = await pool.evaluate(wsUrl, `!!document.querySelector('div[role="dialog"]')`);
  if (!dialogOpen) {
    console.log("Navigating to https://www.threads.com/...");
    await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/" });
    await human.sleep(3500, 4500);

    console.log("Opening Threads composer...");
    await pool.evaluate(wsUrl, `(() => {
      const elements = Array.from(document.querySelectorAll('a, div[role="button"], button, span'));
      const createBtn = elements.find(e => {
        const txt = (e.innerText || '').trim();
        const aria = e.getAttribute('aria-label') || '';
        return txt === "New thread" || txt === "Start a thread..." || aria === "Create" || aria === "New thread";
      });
      if (createBtn) createBtn.click();
    })()`);
    await human.sleep(2000, 2500);
  }

  // Focus editor and insert text
  console.log("Focusing editor & inserting Part 1 text...");
  await pool.evaluate(wsUrl, `(() => {
    const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(800, 1200);
  await pool.send(wsUrl, "Input.insertText", { text: PART_1_TEXT });
  await human.sleep(1500, 2000);

  // Attach Video 1
  console.log(`Attaching Claude Design video: ${VIDEO_CLAUDE}...`);
  let doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  let fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input for Part 1");

  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_CLAUDE],
    nodeId: fileInput.nodeId
  });
  console.log("Uploaded Video 1. Waiting for processing...");
  await human.sleep(15000, 18000);

  // Save Staged Part 1 Screenshot
  const stagedShot1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const stagedPath1 = path.join(ARTIFACT_DIR, "staged-part1-claude.png");
  fs.writeFileSync(stagedPath1, Buffer.from(stagedShot1.data, "base64"));
  console.log(`📸 Saved staged proof: staged-part1-claude.png`);

  // Submit Part 1
  const clicked1 = await waitForPostOrReplyButton(pool, wsUrl, false);
  if (!clicked1) throw new Error("Failed to click Post button for Part 1");

  console.log("Waiting 16s for Part 1 publication to settle...");
  await human.sleep(15000, 18000);

  // Navigate to profile to retrieve published thread URL
  console.log("Navigating to profile to retrieve published thread URL...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(5000, 7000);

  const threadUrl: string | null = await pool.evaluate(wsUrl, `(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/post/"]')).map(a => a.getAttribute('href') || '');
    const valid = links.find(h => h.includes('/post/'));
    if (!valid) return null;
    return valid.startsWith('http') ? valid : 'https://www.threads.com' + valid;
  })()`);

  if (!threadUrl) {
    throw new Error("Failed to find published thread URL on profile");
  }
  console.log(`🔗 Root thread published at: ${threadUrl}`);

  // Screenshot live Part 1
  const liveShot1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part1-claude.png"), Buffer.from(liveShot1.data, "base64"));
  console.log(`📸 Saved live proof: live-part1-claude.png`);

  // -------------------------------------------------------------------------
  // STEP 2: Reply with Part 2 (OpenAI Codex App Promo)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 2/4] Replying with Part 2 + Codex App Video...");
  await pool.send(wsUrl, "Page.navigate", { url: threadUrl });
  await human.sleep(4000, 5000);
  await human.scrollNatural(wsUrl, 1);

  // Focus reply composer
  console.log("Focusing reply composer...");
  await pool.evaluate(wsUrl, `(() => {
    let ed = document.querySelector('[contenteditable="true"]');
    if (!ed) {
      const trigger = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt.startsWith("Reply to") || txt === "Reply";
      });
      if (trigger) trigger.click();
    }
    ed = document.querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);

  console.log("Inserting Part 2 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_2_TEXT });
  await human.sleep(1500, 2000);

  // Attach Video 2
  console.log(`Attaching Codex App video: ${VIDEO_CODEX}...`);
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('[aria-label="Attach media"]');
    if (btn) btn.click();
  })()`);
  await human.sleep(1200, 1800);

  doc = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  fileInput = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input for Part 2");

  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_CODEX],
    nodeId: fileInput.nodeId
  });
  console.log("Uploaded Video 2. Waiting for processing...");
  await human.sleep(15000, 18000);

  // Save Staged Part 2 Screenshot
  const stagedShot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part2-codex.png"), Buffer.from(stagedShot2.data, "base64"));
  console.log(`📸 Saved staged proof: staged-part2-codex.png`);

  // Submit Part 2
  const clicked2 = await waitForPostOrReplyButton(pool, wsUrl, true);
  if (!clicked2) throw new Error("Failed to click Reply button for Part 2");

  console.log("Waiting 16s for Part 2 reply to publish...");
  await human.sleep(15000, 18000);

  const liveShot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part2-codex.png"), Buffer.from(liveShot2.data, "base64"));
  console.log(`📸 Saved live proof: live-part2-codex.png`);

  // -------------------------------------------------------------------------
  // STEP 3: Reply with Part 3 (Vercel v0 Generative UI Promo)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 3/4] Replying with Part 3 + Vercel v0 Video...");
  await pool.send(wsUrl, "Page.navigate", { url: threadUrl });
  await human.sleep(4000, 5000);
  await human.scrollNatural(wsUrl, 2);

  console.log("Focusing reply composer for Part 3...");
  await pool.evaluate(wsUrl, `(() => {
    let ed = document.querySelector('[contenteditable="true"]');
    if (!ed) {
      const trigger = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt.startsWith("Reply to") || txt === "Reply";
      });
      if (trigger) trigger.click();
    }
    ed = document.querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);

  console.log("Inserting Part 3 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_3_TEXT });
  await human.sleep(1500, 2000);

  // Attach Video 3
  console.log(`Attaching Vercel v0 video: ${VIDEO_V0}...`);
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('[aria-label="Attach media"]');
    if (btn) btn.click();
  })()`);
  await human.sleep(1200, 1800);

  doc = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  fileInput = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input for Part 3");

  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_V0],
    nodeId: fileInput.nodeId
  });
  console.log("Uploaded Video 3. Waiting for processing...");
  await human.sleep(15000, 18000);

  // Save Staged Part 3 Screenshot
  const stagedShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part3-v0.png"), Buffer.from(stagedShot3.data, "base64"));
  console.log(`📸 Saved staged proof: staged-part3-v0.png`);

  // Submit Part 3
  const clicked3 = await waitForPostOrReplyButton(pool, wsUrl, true);
  if (!clicked3) throw new Error("Failed to click Reply button for Part 3");

  console.log("Waiting 16s for Part 3 reply to publish...");
  await human.sleep(15000, 18000);

  const liveShot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part3-v0.png"), Buffer.from(liveShot3.data, "base64"));
  console.log(`📸 Saved live proof: live-part3-v0.png`);

  // -------------------------------------------------------------------------
  // STEP 4: Reply with Part 4 (Virtual Clock Engine & Links)
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 4/4] Replying with Part 4: Technical Architecture & Open Source Links...");
  await pool.send(wsUrl, "Page.navigate", { url: threadUrl });
  await human.sleep(4000, 5000);
  await human.scrollNatural(wsUrl, 3);

  console.log("Focusing reply composer for Part 4...");
  await pool.evaluate(wsUrl, `(() => {
    let ed = document.querySelector('[contenteditable="true"]');
    if (!ed) {
      const trigger = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt.startsWith("Reply to") || txt === "Reply";
      });
      if (trigger) trigger.click();
    }
    ed = document.querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);

  console.log("Inserting Part 4 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  await human.sleep(2500, 3500);

  // Save Staged Part 4 Screenshot
  const stagedShot4: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part4-links.png"), Buffer.from(stagedShot4.data, "base64"));
  console.log(`📸 Saved staged proof: staged-part4-links.png`);

  // Submit Part 4
  const clicked4 = await waitForPostOrReplyButton(pool, wsUrl, true);
  if (!clicked4) throw new Error("Failed to click Reply button for Part 4");

  console.log("Waiting 12s for Part 4 to settle...");
  await human.sleep(12000, 14000);

  // -------------------------------------------------------------------------
  // STEP 5: Final Full-Thread Live Verification
  // -------------------------------------------------------------------------
  console.log("\n>>> [STEP 5] Final Verification: Full Thread Overview...");
  await pool.send(wsUrl, "Page.navigate", { url: threadUrl });
  await human.sleep(5000, 6000);
  await human.scrollNatural(wsUrl, 2);

  const finalLiveShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  const finalPath = path.join(ARTIFACT_DIR, "live-svg-animation-complete-thread.png");
  fs.writeFileSync(finalPath, Buffer.from(finalLiveShot.data, "base64"));
  console.log(`🏆 Final complete thread verified: ${finalPath}`);

  // Update growth state
  try {
    if (fs.existsSync(GROWTH_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
      state.completedDrops.push("drop_design_os_svg_animation_launch_v2");
      state.totalPosts = (state.totalPosts || 0) + 1;
      state.lastDropAt = new Date().toISOString();
      state.logs.push(`[${new Date().toLocaleTimeString()}] Published 4-part sequential thread for design-os-svg-animation (3 separate videos + links, zero emojis)`);
      fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
      console.log("Updated autonomous growth state.");
    }
  } catch (e) {
    console.error("Error updating growth state:", e);
  }

  console.log("\n============================================================");
  console.log("🎉 [SUCCESS] Entire 4-part multi-video thread is live!");
  console.log(`🔗 Thread URL: ${threadUrl}`);
  console.log("============================================================");
}

main().catch(err => {
  console.error("❌ Error in multi-video thread publication:", err);
  process.exit(1);
});
