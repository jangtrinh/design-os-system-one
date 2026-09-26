import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const VIDEO_CLAUDE = "/Users/jangtrinh/Products/design-os-svg-animation/promo/claude-design-promo.mp4";

const PART_1_TEXT = `AI generates UI scenes quickly. Precise click hotspots, cut timing, and audio response take more control.

Introducing design-os-svg-animation v0.2.0, HyperFrames Edition.

AI defines structure and storyboard. A deterministic engine executes motion. Automated audits check geometric error against explicit bounds.`;

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV LAUNCH v0.2.0] Publishing Clean Root Post (Part 1)...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Make sure we are on profile page
  console.log("Ensuring we are on profile page...");
  await pool.evaluate(wsUrl, `window.location.href = "https://www.threads.com/@jangtrinhsg"`);
  await human.sleep(3000, 4000);

  // Click 'What's new?' on profile page
  console.log("Clicking 'What's new?' to open composer...");
  await pool.evaluate(wsUrl, `(() => {
    const whatsNew = Array.from(document.querySelectorAll('div[role="button"], div')).find(d => 
      (d.innerText || '').trim() === "What's new?" || (d.getAttribute('aria-label') || '').includes("compose a new post")
    );
    if (whatsNew) whatsNew.click();
  })()`);
  await human.sleep(2000, 2500);

  // Focus contenteditable
  console.log("Focusing contenteditable field...");
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const ed = (dialog || document).querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(500, 800);

  // Type Part 1 text
  console.log("Typing Part 1 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_1_TEXT });
  await human.sleep(1500, 2000);

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

  console.log("Waiting 16s for video processing and preview...");
  await human.sleep(16000, 18000);

  // Capture staged screenshot
  const stagedShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-v2-part1-clean.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-v2-part1-clean.png");

  // Wait until Post button is active and enabled
  console.log("Checking Post button...");
  let btnStatus: any = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    btnStatus = await pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(b => (b.innerText || '').trim() === "Post");
      if (!postBtn) return { found: false, disabled: true };
      const disabled = postBtn.hasAttribute('disabled') ||
                       postBtn.getAttribute('aria-disabled') === 'true' ||
                       window.getComputedStyle(postBtn).opacity === '0.5' ||
                       window.getComputedStyle(postBtn).cursor === 'not-allowed';
      const rect = postBtn.getBoundingClientRect();
      return {
        found: true,
        disabled,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        text: postBtn.innerText
      };
    })()`);

    console.log(`Attempt ${attempt + 1}: disabled = ${btnStatus?.disabled}`);
    if (btnStatus?.found && !btnStatus.disabled) break;
    await human.sleep(3000, 4000);
  }

  if (btnStatus?.disabled) {
    throw new Error("Post button remained disabled after polling");
  }

  // Click Post button via CDP mouse events
  console.log(`Clicking Post button at (${btnStatus.x}, ${btnStatus.y})...`);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: btnStatus.x,
    y: btnStatus.y,
    button: "left",
    clickCount: 1
  });
  await human.sleep(100, 150);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: btnStatus.x,
    y: btnStatus.y,
    button: "left",
    clickCount: 1
  });

  // Backup DOM click
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]') || document;
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => (b.innerText || '').trim() === "Post");
    if (postBtn) postBtn.click();
  })()`);

  console.log("Post submitted! Waiting 22s for publication...");
  await human.sleep(22000, 25000);

  // Check profile
  console.log("Reloading profile to inspect new post...");
  await pool.evaluate(wsUrl, `window.location.href = "https://www.threads.com/@jangtrinhsg"`);
  await human.sleep(4000, 5000);

  const liveShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-part1-clean.png"), Buffer.from(liveShot.data, "base64"));
  console.log("📸 Saved live proof: live-v2-part1-clean.png");

  const newPostInfo: any = await pool.evaluate(wsUrl, `(() => {
    const links = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/post/'));
    return {
      links: links.slice(0, 5),
      hasV2: (document.body.innerText || '').includes('v0.2.0')
    };
  })()`);

  console.log("Profile verification result:", JSON.stringify(newPostInfo, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
