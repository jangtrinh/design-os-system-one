import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

const PART_4_TEXT = `Part 4/4
Virtual Clock đặt thời gian cho từng khung hình, giúp xuất video với nhịp chuyển động xác định mà không phụ thuộc tốc độ quay màn hình.

SVG là vector nên giữ nét khi phóng to trong bản web. MP4 xuất ra vẫn có độ phân giải cố định.

GitHub: https://github.com/jangtrinh/design-os-svg-animation
Web demo: https://jangtrinh.github.io/design-os-svg-animation/`;

async function main() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to profile...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  console.log("Clicking root thread link...");
  await pool.evaluate(wsUrl, `(() => {
    const link = document.querySelector('a[href*="/post/Ddm5DzBk_Hm"]');
    if (link) link.click();
  })()`);
  await human.sleep(4000, 5000);

  // Scroll down to find Part 3
  console.log("Scrolling down to Part 3...");
  await pool.evaluate(wsUrl, `window.scrollBy({ top: 800, behavior: 'instant' })`);
  await human.sleep(2000, 2500);

  // Locate Part 3 container and click its Reply (speech bubble) icon
  const clickReplyRes: any = await pool.evaluate(wsUrl, `(() => {
    // Find post containing "Part 3/4"
    const articles = Array.from(document.querySelectorAll("article, div[data-pressable-container='true']"));
    const part3 = articles.find(a => (a.innerText || '').includes('Part 3/4'));
    if (!part3) return { foundPart3: false };

    // Find speech bubble icon inside part3
    // The speech bubble svg usually has aria-label="Reply" or path with speech bubble shape
    const buttons = Array.from(part3.querySelectorAll('div[role="button"], button, svg'));
    const replyBtn = buttons.find(b => {
      const aria = b.getAttribute('aria-label') || '';
      return aria.toLowerCase() === 'reply';
    }) || buttons.find(b => {
      // In Threads, the second action button after like is reply
      return b.closest('div[role="button"]') && b.tagName === 'svg';
    });

    if (replyBtn) {
      const clickable = replyBtn.closest('div[role="button"]') || replyBtn;
      clickable.click();
      return { foundPart3: true, clickedReply: true };
    }
    return { foundPart3: true, clickedReply: false, buttons: buttons.length };
  })()`);

  console.log("Click reply on Part 3 result:", clickReplyRes);
  await human.sleep(2500, 3000);

  // Check if dialog is open
  const shot1 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step-part3-reply-dialog.png"), Buffer.from(shot1.data, "base64"));
  console.log("Saved step-part3-reply-dialog.png");

  // Focus contenteditable and type Part 4
  console.log("Typing Part 4 into composer...");
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const ed = (dialog || document).querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(500, 1000);

  await pool.send(wsUrl, "Input.insertText", { text: PART_4_TEXT });
  console.log("Waiting 6s for link previews or button state to settle...");
  await human.sleep(5000, 6000);

  const shot2 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step-part4-typed-proof.png"), Buffer.from(shot2.data, "base64"));
  console.log("Saved step-part4-typed-proof.png");

  // Locate Post button inside dialog
  const postBtnRes: any = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { foundDialog: false };
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      return t === 'Post' || t === 'Reply';
    });
    if (!postBtn) return { foundDialog: true, foundBtn: false, btns: btns.map(b => b.innerText) };
    const rect = postBtn.getBoundingClientRect();
    const disabled = postBtn.hasAttribute('disabled') || 
                     postBtn.getAttribute('aria-disabled') === 'true' ||
                     window.getComputedStyle(postBtn).opacity === '0.5';
    return {
      foundDialog: true,
      foundBtn: true,
      text: postBtn.innerText,
      disabled,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  })()`);

  console.log("Post button status:", postBtnRes);

  if (postBtnRes?.foundBtn && !postBtnRes.disabled) {
    console.log(`Clicking Post button at (${postBtnRes.x}, ${postBtnRes.y})...`);
    await pool.send(wsUrl, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: postBtnRes.x,
      y: postBtnRes.y,
      button: "left",
      clickCount: 1
    });
    await human.sleep(100, 150);
    await pool.send(wsUrl, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: postBtnRes.x,
      y: postBtnRes.y,
      button: "left",
      clickCount: 1
    });

    console.log("Waiting 15s for post to publish...");
    await human.sleep(14000, 16000);

    const shot3 = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part4-final-result.png"), Buffer.from(shot3.data, "base64"));
    console.log("Saved live-part4-final-result.png");
  }

  process.exit(0);
}

main().catch(console.error);
