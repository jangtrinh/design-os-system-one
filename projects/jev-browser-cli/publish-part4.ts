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
  console.log("=== PUBLISHING PART 4 TO COMPLETE SVG ANIMATION THREAD ===");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Navigate to Part 3 directly to reply directly to Part 3
  console.log("Navigating to Part 3: https://www.threads.com/@jangtrinhsg/post/Ddm6s5pk6ZN");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/post/Ddm6s5pk6ZN" });
  await human.sleep(5000, 6000);

  // Find the reply box
  console.log("Clicking reply box...");
  const replyBoxFound: any = await pool.evaluate(wsUrl, `(() => {
    const expand = document.querySelector('[aria-label="Expand composer"]');
    if (expand) {
      expand.click();
      return { type: "expand" };
    }
    const ed = document.querySelector('[contenteditable="true"]');
    if (ed) {
      ed.focus();
      return { type: "contenteditable" };
    }
    const replyPlaceholder = Array.from(document.querySelectorAll('*')).find(el => (el.innerText || '').includes('Reply to jangtrinhsg...'));
    if (replyPlaceholder) {
      replyPlaceholder.click();
      return { type: "placeholder" };
    }
    return { type: "none" };
  })()`);
  console.log("Reply box search result:", replyBoxFound);
  await human.sleep(2000, 2500);

  // Focus the active composer
  await pool.evaluate(wsUrl, `(() => {
    const eds = document.querySelectorAll('[contenteditable="true"]');
    const lastEd = eds[eds.length - 1];
    if (lastEd) {
      lastEd.focus();
    }
  })()`);
  await human.sleep(500, 1000);

  // Insert text
  console.log("Typing Part 4 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  await human.sleep(4000, 5000);

  // Screenshot staged Part 4
  const stagedShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part4-attempt2.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("Saved staged-part4-attempt2.png");

  // Get button coordinates and click
  const btnInfo: any = await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;

    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const btn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
    });
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return {
      text: btn.innerText,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      width: rect.width,
      height: rect.height,
      disabled: btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true'
    };
  })()`);

  console.log("Submit button info:", btnInfo);
  if (!btnInfo) {
    throw new Error("Could not find submit button");
  }

  if (btnInfo.disabled) {
    console.log("Button is disabled, waiting 3s...");
    await human.sleep(3000, 4000);
  }

  // Click via CDP mouse events
  console.log(`Clicking button at (${btnInfo.x}, ${btnInfo.y})...`);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: btnInfo.x,
    y: btnInfo.y,
    button: "left",
    clickCount: 1
  });
  await human.sleep(100, 200);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: btnInfo.x,
    y: btnInfo.y,
    button: "left",
    clickCount: 1
  });

  // Also trigger DOM click as backup
  await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;
    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const btn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
    });
    if (btn) btn.click();
  })()`);

  console.log("Waiting 15s for post to publish...");
  await human.sleep(14000, 16000);

  // Capture result screenshot
  const resultShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part4-attempt2.png"), Buffer.from(resultShot.data, "base64"));
  console.log("Saved live-part4-attempt2.png");

  // Check if text exists on page
  const verification: any = await pool.evaluate(wsUrl, `(() => {
    const text = document.body.innerText;
    return {
      hasClock: text.includes("Virtual Clock"),
      hasGithub: text.includes("github.com/jangtrinh/design-os-svg-animation"),
      hasWebDemo: text.includes("jangtrinh.github.io/design-os-svg-animation")
    };
  })()`);

  console.log("Verification result on Part 3 page:", verification);
  process.exit(0);
}

main().catch(err => {
  console.error("Error in publish-part4:", err);
  process.exit(1);
});
