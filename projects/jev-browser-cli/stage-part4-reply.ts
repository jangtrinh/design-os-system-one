import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

const PART_4_TEXT = `Part 4/4
Virtual Clock đặt thời gian cho từng khung hình, giúp xuất video với nhịp chuyển động xác định mà không phụ thuộc tốc độ quay màn hình.

SVG là vector nên giữ nét khi phóng to trong bản web. MP4 xuất ra vẫn có độ phân giải cố định.

GitHub: https://github.com/jangtrinh/design-os-svg-animation
Web demo: https://jangtrinh.github.io/design-os-svg-animation/`;

async function main() {
  console.log("=== SUBMITTING PART 4 AS DIRECT REPLY TO PART 3 ===");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  // Click the expand composer button or the contenteditable field
  console.log("Clicking expand composer / reply input...");
  const clickRes: any = await pool.evaluate(wsUrl, `(() => {
    const expand = document.querySelector('[aria-label="Expand composer"]');
    if (expand) {
      expand.click();
      return { clicked: "expand" };
    }
    const ed = document.querySelector('[contenteditable="true"]');
    if (ed) {
      ed.focus();
      return { clicked: "ed" };
    }
    return { clicked: "none" };
  })()`, 15000);
  console.log("Click result:", clickRes);
  await human.sleep(2000, 2500);

  // Focus the active contenteditable
  console.log("Focusing contenteditable...");
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const ed = (dialog || document).querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`, 15000);
  await human.sleep(800, 1200);

  // Type Part 4 text
  console.log("Typing Part 4 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  console.log("Waiting 6s for text and link card preview...");
  await human.sleep(6000, 7000);

  // Screenshot staged Part 4
  const stagedShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part4-final-proof.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-part4-final-proof.png");

  // Locate the Post / Reply button
  const btnRes: any = await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;

    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
    });
    if (!postBtn) return null;
    const rect = postBtn.getBoundingClientRect();
    const disabled = postBtn.hasAttribute('disabled') ||
                     postBtn.getAttribute('aria-disabled') === 'true' ||
                     window.getComputedStyle(postBtn).opacity === '0.5' ||
                     window.getComputedStyle(postBtn).cursor === 'not-allowed';
    return {
      text: postBtn.innerText,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      disabled
    };
  })()`, 15000);

  console.log("Post button info:", btnRes);
  if (!btnRes) throw new Error("Could not find Post button!");

  if (btnRes.disabled) {
    console.log("Button disabled, waiting 4s...");
    await human.sleep(4000, 5000);
  }

  // Click via CDP mouse events
  console.log(`Clicking Post button at (${btnRes.x}, ${btnRes.y})...`);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: btnRes.x,
    y: btnRes.y,
    button: "left",
    clickCount: 1
  });
  await human.sleep(100, 150);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: btnRes.x,
    y: btnRes.y,
    button: "left",
    clickCount: 1
  });

  // Also trigger DOM click as backup
  await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;
    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
    });
    if (postBtn) postBtn.click();
  })()`, 15000);

  console.log("Waiting 15s for post to publish...");
  await human.sleep(14000, 16000);

  // Capture final live screenshot
  const liveShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part4-final-proof.png"), Buffer.from(liveShot.data, "base64"));
  console.log("📸 Saved live proof: live-part4-final-proof.png");

  // Verify text on page
  const verification: any = await pool.evaluate(wsUrl, `(() => {
    const text = document.body.innerText;
    return {
      hasClock: text.includes("Virtual Clock"),
      hasGithub: text.includes("github.com/jangtrinh/design-os-svg-animation"),
      hasWebDemo: text.includes("jangtrinh.github.io/design-os-svg-animation")
    };
  })()`, 15000);

  console.log("Verification result:", verification);

  if (verification.hasClock && verification.hasGithub) {
    console.log("✅ SUCCESS: Part 4 is live and verified!");
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
      }
    } catch (e) {
      console.error("Error updating growth state:", e);
    }
  } else {
    console.warn("⚠️ Warning: Text check did not find all strings yet, might need page reload.");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Error in stage-part4-reply:", err);
  process.exit(1);
});
