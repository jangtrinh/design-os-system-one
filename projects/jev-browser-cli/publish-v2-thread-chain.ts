import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const VIDEO_CLAUDE = "/Users/jangtrinh/Products/design-os-svg-animation/promo/claude-design-promo.mp4";

const POSTS = [
  // Card 1
  `AI generates UI scenes quickly. Precise click hotspots, cut timing, and audio response take more control.

Introducing design-os-svg-animation v0.2.0, HyperFrames Edition.

AI defines structure and storyboard. A deterministic engine executes motion. Automated audits check geometric error against explicit bounds.`,

  // Card 2
  `Start by measuring the reference.

npm run analyze:ref uses FFmpeg scene scoring with select='gt(scene,0.18)' to identify cuts and generate two-column contact sheets.

Audio is extracted as 16-bit PCM at 4000 Hz, then aggregated into a 50 Hz peak envelope.

The resulting .wave.json drives CSS --audio-energy, tying visual response to measured audio amplitude.`,

  // Card 3
  `HyperFrames provides 20 declarative primitives in src/runtime/hyperframes-engine.mjs.

Text, input, chat, window, phone, chart, grid, and more.

Compose them into staged drafts in minutes. AI specifies the scene structure and sequence. The runtime handles motion execution.`,

  // Card 4
  `A click animation needs a measurable spatial contract.

Gate 6, the Hotspot Concentricity Audit, checks the distance between the pointer tip and click ripple centroid.

The allowed error is at most 1.0 px. Bounding box containment checks verify that the click lands inside its target.

Run npm run audit:hotspots.`,

  // Card 5
  `Timing needs a shared inspection surface.

The Studio Runner UI, styled by studio-runner.css, brings timecode, a scrubber, scene jump pills, and playback speed toggles into one interface.

Scrub to a transition, jump between scenes, or slow playback to inspect a click. Review motion against a common timeline.`,

  // Card 6
  `MP4 export runs in the browser through WebCodecs.

VideoEncoder is configured for H.264 using avc1.640033, a 24 Mbps target bitrate, and 60 fps. mp4-muxer packages the encoded video into MP4.

The encoding configuration is explicit and inspectable.`,

  // Card 7
  `v0.2.0 connects reference analysis, declarative scene composition, deterministic motion, geometric audits, timeline inspection, and browser export.

AI defines intent. The engine executes it. Audits measure whether the result meets the specified bounds.

https://github.com/jangtrinh/design-os-svg-animation

Which constraint is hardest to enforce in your motion pipeline: spatial accuracy, timing, or audio synchronization?`
];

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV LAUNCH] Staging Complete 7-Post Thread in Single Composer...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // 0. Ensure clean state
  const isDialogOpen = await pool.evaluate(wsUrl, `!!document.querySelector('div[role="dialog"]')`);
  if (isDialogOpen) {
    console.log("Existing dialog found, canceling...");
    await pool.evaluate(wsUrl, `(() => {
      const cancel = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => (b.innerText || '').trim() === "Cancel");
      if (cancel) cancel.click();
    })()`);
    await human.sleep(1000, 1500);
  }

  // 1. Click "What's new?" on current profile page to open dialog
  console.log("Clicking 'What's new?' to open composer...");
  await pool.evaluate(wsUrl, `(() => {
    const whatsNew = Array.from(document.querySelectorAll('div[role="button"], div')).find(d => 
      (d.innerText || '').trim() === "What's new?" || (d.getAttribute('aria-label') || '').includes("compose a new post")
    );
    if (whatsNew) whatsNew.click();
  })()`);
  await human.sleep(2000, 3000);

  // 2. Type Card 1
  console.log("Typing Card 1...");
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const eds = (dialog || document).querySelectorAll('[contenteditable="true"]');
    if (eds.length > 0 && eds[0]) eds[0].focus();
  })()`);
  await human.sleep(500, 800);
  await pool.send(wsUrl, "Input.insertText", { text: POSTS[0] });
  await human.sleep(1000, 1500);

  // 3. Attach Video to Card 1
  console.log("Attaching Claude video to Card 1...");
  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (fileInput?.nodeId) {
    await pool.send(wsUrl, "DOM.setFileInputFiles", {
      files: [VIDEO_CLAUDE],
      nodeId: fileInput.nodeId
    });
    console.log("Video attached. Beginning card additions while video processes in background...");
  } else {
    throw new Error("Could not find file input element");
  }

  // 4. Add Cards 2 to 7 via "Add to thread"
  for (let i = 1; i < POSTS.length; i++) {
    console.log(`Adding Card ${i + 1}/${POSTS.length}...`);
    await pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return;
      const addBtns = Array.from(dialog.querySelectorAll('div[role="button"], span, div')).filter(e => 
        (e.innerText || '').trim() === "Add to thread"
      );
      if (addBtns.length > 0 && addBtns[0]) addBtns[0].click();
    })()`);
    await human.sleep(1500, 2000);

    // Focus the newest contenteditable
    await pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      const eds = (dialog || document).querySelectorAll('[contenteditable="true"]');
      if (eds.length > 0 && eds[eds.length - 1]) {
        eds[eds.length - 1].focus();
      }
    })()`);
    await human.sleep(500, 800);

    console.log(`Typing text for Card ${i + 1}...`);
    await pool.send(wsUrl, "Input.insertText", { text: POSTS[i] });
    await human.sleep(1500, 2000);
  }

  console.log("All 7 cards typed! Waiting for video upload to settle and OpenGraph preview...");
  await human.sleep(15000, 20000);

  // Capture staged screenshot of all 7 cards
  const stagedShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-v2-all-7-cards.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-v2-all-7-cards.png");

  // Inspect Post button status
  const btnStatus: any = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]') || document;
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => (b.innerText || '').trim() === "Post");
    if (!postBtn) return { found: false };
    const rect = postBtn.getBoundingClientRect();
    const disabled = postBtn.hasAttribute('disabled') ||
                     postBtn.getAttribute('aria-disabled') === 'true' ||
                     window.getComputedStyle(postBtn).opacity === '0.5' ||
                     window.getComputedStyle(postBtn).cursor === 'not-allowed';
    return {
      found: true,
      disabled,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      text: postBtn.innerText
    };
  })()`);

  console.log("Post button status:", JSON.stringify(btnStatus, null, 2));

  // If disabled, wait up to 45s for video upload processing
  if (btnStatus?.disabled) {
    console.log("Post button disabled (video still uploading), polling until enabled...");
    for (let attempt = 0; attempt < 15; attempt++) {
      await human.sleep(3000, 4000);
      const check: any = await pool.evaluate(wsUrl, `(() => {
        const dialog = document.querySelector('div[role="dialog"]') || document;
        const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
        const postBtn = btns.find(b => (b.innerText || '').trim() === "Post");
        if (!postBtn) return { disabled: true };
        const disabled = postBtn.hasAttribute('disabled') ||
                         postBtn.getAttribute('aria-disabled') === 'true' ||
                         window.getComputedStyle(postBtn).opacity === '0.5' ||
                         window.getComputedStyle(postBtn).cursor === 'not-allowed';
        const rect = postBtn.getBoundingClientRect();
        return { disabled, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`);
      console.log(`Poll ${attempt + 1}: disabled = ${check?.disabled}`);
      if (!check?.disabled) {
        btnStatus.disabled = false;
        btnStatus.x = check.x;
        btnStatus.y = check.y;
        break;
      }
    }
  }

  // Click Post
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

  console.log("Submitting 7-post thread... Waiting 25s for publication...");
  await human.sleep(25000, 30000);

  // Take screenshot of result
  const postShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-submission-result.png"), Buffer.from(postShot.data, "base64"));
  console.log("📸 Saved submission result: live-v2-submission-result.png");

  process.exit(0);
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
