import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const VIDEO_CLAUDE = "/Users/jangtrinh/Products/design-os-svg-animation/promo/claude-design-promo.mp4";

const POST_1_TEXT = `AI generates UI scenes quickly. Precise click hotspots, cut timing, and audio response take more control.

Introducing design-os-svg-animation v0.2.0, HyperFrames Edition.

AI defines structure and storyboard. A deterministic engine executes motion. Automated audits check geometric error against explicit bounds.`;

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV LAUNCH v0.2.0] Staging and Publishing Post 1 (Root)...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No active Threads tab found on port 9222");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("📌 Navigating to https://www.threads.com/...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/" });
  await human.sleep(3000, 4000);

  // Check if dialog is already open, if not click "What's new?" or "New thread"
  console.log("Opening new thread composer...");
  await pool.evaluate(wsUrl, `(() => {
    // Look for 'What's new?' text field or compose button
    const whatsNew = Array.from(document.querySelectorAll('div[role="button"], div')).find(d => 
      (d.innerText || '').trim() === "What's new?" || (d.getAttribute('aria-label') || '').includes("compose a new post")
    );
    if (whatsNew) {
      whatsNew.click();
      return;
    }
    const newThreadBtn = Array.from(document.querySelectorAll('a, button, div[role="button"]')).find(b => 
      (b.getAttribute('aria-label') || '').includes("New thread") || (b.innerText || '').trim() === "New thread"
    );
    if (newThreadBtn) newThreadBtn.click();
  })()`);

  await human.sleep(2000, 3000);

  // Focus contenteditable
  console.log("Focusing contenteditable field...");
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const ed = (dialog || document).querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(800, 1200);

  // Type Post 1 text
  console.log("Typing Post 1 text...");
  await pool.send(wsUrl, "Input.insertText", { text: POST_1_TEXT });
  await human.sleep(2000, 3000);

  // Attach Claude video
  console.log(`Attaching Claude promo video: ${VIDEO_CLAUDE}...`);
  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) {
    throw new Error("Could not find file input in composer dialog");
  }

  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_CLAUDE],
    nodeId: fileInput.nodeId
  });

  console.log("Waiting 16s for video processing and encoding preview...");
  await human.sleep(16000, 18000);

  // Capture staged screenshot
  const stagedShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-v2-post1-claude.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-v2-post1-claude.png");

  // Locate the Post button
  const btnRes: any = await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;

    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || aria === "Post";
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
  })()`);

  console.log("Post button info:", btnRes);
  if (!btnRes) throw new Error("Could not find Post button!");

  if (btnRes.disabled) {
    console.log("Post button still disabled (processing video), waiting another 10s...");
    await human.sleep(10000, 12000);
  }

  // Click Post via CDP mouse events
  console.log(`Submitting Post 1 at (${btnRes.x}, ${btnRes.y})...`);
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

  // Backup DOM click
  await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) scope = dialog;
    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      const aria = b.getAttribute('aria-label') || '';
      return t === "Post" || aria === "Post";
    });
    if (postBtn) postBtn.click();
  })()`);

  console.log("Waiting 20s for post upload and publication...");
  await human.sleep(20000, 22000);

  // Navigate to profile to inspect new post
  console.log("Navigating to profile to verify Post 1 live...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(5000, 6000);

  const liveShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-post1-proof.png"), Buffer.from(liveShot.data, "base64"));
  console.log("📸 Saved live proof: live-v2-post1-proof.png");

  // Get newest post link
  const postInfo: any = await pool.evaluate(wsUrl, `(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a => (a.getAttribute('href') || '').includes('/post/'));
    return links.map(a => ({
      href: a.getAttribute('href'),
      text: (a.innerText || '').trim()
    })).slice(0, 5);
  })()`);

  console.log("Newest post links on profile:", JSON.stringify(postInfo, null, 2));
}

main().catch(console.error);
