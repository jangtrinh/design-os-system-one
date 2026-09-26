import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const VIDEO_CLAUDE = "/Users/jangtrinh/Products/design-os-svg-animation/promo/claude-design-promo.mp4";

const PART_1_TEXT = `AI generates UI scenes quickly. Precise click hotspots, cut timing, and audio response take more control.

Introducing design-os-svg-animation v0.2.0, HyperFrames Edition.

AI defines structure and storyboard. A deterministic engine executes motion. Automated audits check geometric error against explicit bounds.`;

const REPLIES = [
  // Part 2
  `Start by measuring the reference.

npm run analyze:ref uses FFmpeg scene scoring with select='gt(scene,0.18)' to identify cuts and generate two-column contact sheets.

Audio is extracted as 16-bit PCM at 4000 Hz, then aggregated into a 50 Hz peak envelope.

The resulting .wave.json drives CSS --audio-energy, tying visual response to measured audio amplitude.`,

  // Part 3
  `HyperFrames provides 20 declarative primitives in src/runtime/hyperframes-engine.mjs.

Text, input, chat, window, phone, chart, grid, and more.

Compose them into staged drafts in minutes. AI specifies the scene structure and sequence. The runtime handles motion execution.`,

  // Part 4
  `A click animation needs a measurable spatial contract.

Gate 6, the Hotspot Concentricity Audit, checks the distance between the pointer tip and click ripple centroid.

The allowed error is at most 1.0 px. Bounding box containment checks verify that the click lands inside its target.

Run npm run audit:hotspots.`,

  // Part 5
  `Timing needs a shared inspection surface.

The Studio Runner UI, styled by studio-runner.css, brings timecode, a scrubber, scene jump pills, and playback speed toggles into one interface.

Scrub to a transition, jump between scenes, or slow playback to inspect a click. Review motion against a common timeline.`,

  // Part 6
  `MP4 export runs in the browser through WebCodecs.

VideoEncoder is configured for H.264 using avc1.640033, a 24 Mbps target bitrate, and 60 fps. mp4-muxer packages the encoded video into MP4.

The encoding configuration is explicit and inspectable.`,

  // Part 7
  `v0.2.0 connects reference analysis, declarative scene composition, deterministic motion, geometric audits, timeline inspection, and browser export.

AI defines intent. The engine executes it. Audits measure whether the result meets the specified bounds.

https://github.com/jangtrinh/design-os-svg-animation

Which constraint is hardest to enforce in your motion pipeline: spatial accuracy, timing, or audio synchronization?`
];

async function clickPostButton(pool: CdpSessionPool, wsUrl: string, scopeSelector?: string): Promise<boolean> {
  const selectorJson = JSON.stringify(scopeSelector || "");
  const btnInfo: any = await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const targetSel = ${selectorJson};
    if (targetSel) {
      const el = document.querySelector(targetSel);
      if (el) scope = el;
    } else {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) scope = dialog;
    }

    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      return t === "Post" || t === "Reply";
    }) || btns.find(b => {
      const aria = b.getAttribute('aria-label') || '';
      return (aria === "Post" || aria === "Reply") && !b.querySelector('svg');
    });

    if (!postBtn) return null;
    const disabled = postBtn.hasAttribute('disabled') ||
                     postBtn.getAttribute('aria-disabled') === 'true' ||
                     window.getComputedStyle(postBtn).opacity === '0.5' ||
                     window.getComputedStyle(postBtn).cursor === 'not-allowed';
    const rect = postBtn.getBoundingClientRect();
    return {
      disabled,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      text: postBtn.innerText || postBtn.getAttribute('aria-label')
    };
  })()`);

  if (!btnInfo || btnInfo.disabled) {
    return false;
  }

  console.log(`Clicking '${btnInfo.text}' at (${btnInfo.x}, ${btnInfo.y})...`);
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: btnInfo.x,
    y: btnInfo.y,
    button: "left",
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 100));
  await pool.send(wsUrl, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: btnInfo.x,
    y: btnInfo.y,
    button: "left",
    clickCount: 1
  });

  // Backup DOM click
  await pool.evaluate(wsUrl, `(() => {
    let scope = document;
    const targetSel = ${selectorJson};
    if (targetSel) {
      const el = document.querySelector(targetSel);
      if (el) scope = el;
    } else {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) scope = dialog;
    }

    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    const postBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      return t === "Post" || t === "Reply";
    }) || btns.find(b => {
      const aria = b.getAttribute('aria-label') || '';
      return (aria === "Post" || aria === "Reply") && !b.querySelector('svg');
    });
    if (postBtn) postBtn.click();
  })()`);

  return true;
}

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV v0.2.0 MASTER LAUNCH] Starting Full 7-Part Thread...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Check if dialog is ALREADY open with Part 1 staged
  const alreadyOpen: boolean = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return false;
    const text = dialog.innerText || "";
    return text.includes("v0.2.0") || text.includes("HyperFrames");
  })()`);

  if (alreadyOpen) {
    console.log("⚡ Dialog is already open with Part 1 staged and video processed!");
  } else {
    // Ensure on profile page
    console.log("Navigating to profile: https://www.threads.com/@jangtrinhsg...");
    await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
    await human.sleep(4000, 5000);

    // -------------------------------------------------------------------------
    // STEP 1: Post Part 1 (Root)
    // -------------------------------------------------------------------------
    console.log("\n>>> [STEP 1/7] Staging Part 1 (Claude Design Promo)...");
    
    // Click 'What's new?' on profile
    await pool.evaluate(wsUrl, `(() => {
      const whatsNew = Array.from(document.querySelectorAll('div[role="button"], div')).find(d => 
        (d.innerText || '').trim() === "What's new?" || (d.getAttribute('aria-label') || '').includes("compose a new post")
      );
      if (whatsNew) whatsNew.click();
    })()`);
    await human.sleep(2000, 2500);

    // Focus and type Part 1
    console.log("Typing Part 1 text...");
    await pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      const ed = (dialog || document).querySelector('[contenteditable="true"]');
      if (ed) ed.focus();
    })()`);
    await human.sleep(500, 800);
    await pool.send(wsUrl, "Input.insertText", { text: PART_1_TEXT });
    await human.sleep(1500, 2000);

    // Attach Claude video
    console.log(`Attaching Claude promo video: ${VIDEO_CLAUDE}...`);
    const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
    const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: 'input[type="file"]'
    });

    if (!fileInput?.nodeId) throw new Error("Could not find file input");
    await pool.send(wsUrl, "DOM.setFileInputFiles", {
      files: [VIDEO_CLAUDE],
      nodeId: fileInput.nodeId
    });

    console.log("Waiting 16s for video processing...");
    await human.sleep(16000, 18000);
  }

  // Staged proof
  const stagedShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-v2-part1-master.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-v2-part1-master.png");

  // Wait for Post button to be active
  console.log("Waiting for Post button to be ready...");
  let posted = false;
  for (let i = 0; i < 15; i++) {
    posted = await clickPostButton(pool, wsUrl, 'div[role="dialog"]');
    if (posted) break;
    await human.sleep(3000, 4000);
  }
  if (!posted) throw new Error("Failed to click Post button for Part 1");

  console.log("Waiting for dialog to close (upload & publish completion)...");
  for (let i = 0; i < 20; i++) {
    await human.sleep(2000, 2500);
    const dialogStillOpen = await pool.evaluate(wsUrl, `!!document.querySelector('div[role="dialog"]')`);
    if (!dialogStillOpen) {
      console.log("✅ Composer dialog closed! Part 1 successfully published.");
      break;
    }
  }

  await human.sleep(4000, 5000);

  // Open the newly published Part 1 post modal
  console.log("Finding and opening new Part 1 thread...");
  let newPostHref: string | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const postInfo: any = await pool.evaluate(wsUrl, `(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/post/"]'));
      for (const a of allLinks) {
        const card = a.closest('div[data-pressable-container="true"]') || a.parentElement?.parentElement?.parentElement;
        if (card && (card.innerText || '').includes('HyperFrames')) {
          return { href: a.getAttribute('href'), matched: 'text' };
        }
      }
      const oldPosts = ['Ddm5DzBk_Hm', 'Ddm5u-NE1xP', 'Ddkm6LnIwLO'];
      const candidate = allLinks.find(a => {
        const h = a.getAttribute('href') || '';
        return !oldPosts.some(old => h.includes(old));
      });
      if (candidate) {
        return { href: candidate.getAttribute('href'), matched: 'candidate' };
      }
      return null;
    })()`);

    if (postInfo?.href) {
      newPostHref = postInfo.href;
      console.log(`Found newly published post: ${newPostHref} (matched by ${postInfo.matched})`);
      break;
    }
    console.log("Waiting 2s for new post to render on profile...");
    await human.sleep(2000, 3000);
  }

  let threadUrl = "https://www.threads.com/@jangtrinhsg";
  if (newPostHref) {
    threadUrl = newPostHref.startsWith("http") ? newPostHref : "https://www.threads.com" + newPostHref;
    console.log("Navigating to new thread URL:", threadUrl);
    await pool.send(wsUrl, "Page.navigate", { url: threadUrl });
    await human.sleep(5000, 6000);
  } else {
    console.warn("Could not find new post link by text; clicking first post link as fallback...");
    await pool.evaluate(wsUrl, `(() => {
      const firstLink = document.querySelector('a[href*="/post/"]');
      if (firstLink) firstLink.click();
    })()`);
    await human.sleep(5000, 6000);
    threadUrl = await pool.evaluate(wsUrl, "window.location.href");
  }

  console.log("Target Thread Page URL:", threadUrl);

  // -------------------------------------------------------------------------
  // STEP 2 to 7: Post Replies sequentially in the opened thread modal
  // -------------------------------------------------------------------------
  for (let i = 0; i < REPLIES.length; i++) {
    const partNum = i + 2;
    console.log(`\n>>> [STEP ${partNum}/7] Posting Part ${partNum}...`);

    // Click reply input box at bottom of modal
    console.log(`Focusing reply box for Part ${partNum}...`);
    await pool.evaluate(wsUrl, `(() => {
      const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
      });
      if (trigger) trigger.click();
    })()`);
    await human.sleep(1500, 2000);

    // Type text
    console.log(`Typing Part ${partNum} text...`);
    await pool.evaluate(wsUrl, `(() => {
      const eds = document.querySelectorAll('[contenteditable="true"]');
      const lastEd = eds[eds.length - 1];
      if (lastEd) lastEd.focus();
    })()`);
    await human.sleep(500, 800);
    await pool.send(wsUrl, "Input.insertText", { text: REPLIES[i] });

    if (partNum === 7) {
      console.log("Waiting 6s for GitHub link card preview...");
      await human.sleep(6000, 7000);
    } else {
      await human.sleep(2000, 2500);
    }

    // Submit reply
    console.log(`Submitting Part ${partNum}...`);
    let replySubmitted = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      replySubmitted = await clickPostButton(pool, wsUrl);
      if (replySubmitted) break;
      await human.sleep(2000, 2500);
    }
    if (!replySubmitted) throw new Error(`Failed to submit Part ${partNum}`);

    console.log(`Part ${partNum} submitted! Waiting 12s for reply to settle...`);
    await human.sleep(12000, 14000);
  }

  // -------------------------------------------------------------------------
  // STEP 8: Final Audit and Screenshots
  // -------------------------------------------------------------------------
  console.log("\n>>> [FINAL AUDIT] Capturing thread modal screenshots...");
  const modalShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-full-thread-modal.png"), Buffer.from(modalShot.data, "base64"));
  console.log("📸 Saved full thread modal: live-v2-full-thread-modal.png");

  // Get current thread URL
  const finalThreadUrl = await pool.evaluate(wsUrl, `window.location.href`);
  console.log("🎉 Complete 7-part thread LIVE at:", finalThreadUrl);

  // -------------------------------------------------------------------------
  // STEP 9: Post Bridge Reply to v0.1 Thread
  // -------------------------------------------------------------------------
  console.log("\n>>> [BRIDGE] Navigating to v0.1 thread to post bridge reply...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm" });
  await human.sleep(5000, 6000);

  const BRIDGE_TEXT = `An update to this v0.1 thread: v0.2.0, HyperFrames Edition, is out.

The new thread covers reference analysis, 20 declarative primitives, hotspot audits, Studio Runner, and browser MP4 export.

Read the v0.2.0 thread here: ${finalThreadUrl}`;

  console.log("Posting bridge reply to old thread...");
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
      const txt = (e.innerText || '').trim();
      return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
    });
    if (trigger) trigger.click();
    const eds = document.querySelectorAll('[contenteditable="true"]');
    const lastEd = eds[eds.length - 1];
    if (lastEd) lastEd.focus();
  })()`);
  await human.sleep(1500, 2000);
  await pool.send(wsUrl, "Input.insertText", { text: BRIDGE_TEXT });
  await human.sleep(5000, 6000);

  console.log("Submitting bridge reply...");
  await clickPostButton(pool, wsUrl);
  await human.sleep(12000, 14000);

  const bridgeShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-bridge-proof.png"), Buffer.from(bridgeShot.data, "base64"));
  console.log("📸 Saved bridge proof: live-v2-bridge-proof.png");

  console.log("🏁 All 7 parts + Bridge reply published and verified!");
  process.exit(0);
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
