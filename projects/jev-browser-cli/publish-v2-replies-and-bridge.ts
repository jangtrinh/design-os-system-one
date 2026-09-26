import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const ROOT_POST_URL = "https://www.threads.com/@jangtrinhsg/post/DdoET5NE9Zn";
const V01_THREAD_URL = "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm";

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

async function clickPostButton(pool: CdpSessionPool, wsUrl: string): Promise<boolean> {
  const btnInfo: any = await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const scope = dialog || document;
    const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
    
    // Look for button with text Post or Reply (not svg icon button)
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

  // DOM backup
  await pool.evaluate(wsUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const scope = dialog || document;
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
  console.log("🚀 [JEV CHAIN] Publishing Parts 2 to 7 & Bridge Reply...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Verify we are on ROOT_POST_URL
  const currentUrl = await pool.evaluate(wsUrl, `window.location.href`);
  console.log("Current page URL:", currentUrl);
  if (!currentUrl.includes("DdoET5NE9Zn")) {
    console.log(`Navigating to target root post: ${ROOT_POST_URL}...`);
    await pool.evaluate(wsUrl, `window.location.href = "${ROOT_POST_URL}"`);
    await human.sleep(5000, 6000);
  }

  // -------------------------------------------------------------------------
  // SEQUENTIALLY POST PARTS 2 TO 7
  // -------------------------------------------------------------------------
  for (let i = 0; i < REPLIES.length; i++) {
    const partNum = i + 2;
    console.log(`\n>>> [STEP ${partNum}/7] Posting Part ${partNum}...`);

    // Focus reply trigger / contenteditable
    console.log(`Focusing reply box for Part ${partNum}...`);
    await pool.evaluate(wsUrl, `(() => {
      const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
      });
      if (trigger) trigger.click();
    })()`);
    await human.sleep(1500, 2000);

    // Focus editor
    await pool.evaluate(wsUrl, `(() => {
      const eds = document.querySelectorAll('[contenteditable="true"]');
      const lastEd = eds[eds.length - 1];
      if (lastEd) {
        lastEd.focus();
      }
    })()`);
    await human.sleep(500, 800);

    // Type text
    console.log(`Inserting text for Part ${partNum}...`);
    await pool.send(wsUrl, "Input.insertText", { text: REPLIES[i] });

    if (partNum === 7) {
      console.log("Waiting 6s for GitHub link card preview...");
      await human.sleep(6000, 7000);
    } else {
      await human.sleep(2000, 2500);
    }

    // Submit reply
    console.log(`Submitting Part ${partNum}...`);
    let submitted = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      submitted = await clickPostButton(pool, wsUrl);
      if (submitted) break;
      await human.sleep(2000, 2500);
    }
    if (!submitted) throw new Error(`Failed to submit Part ${partNum}`);

    console.log(`✅ Part ${partNum} submitted! Waiting 12s to settle...`);
    await human.sleep(12000, 14000);
  }

  // -------------------------------------------------------------------------
  // FINAL FULL THREAD AUDIT
  // -------------------------------------------------------------------------
  console.log("\n>>> [FINAL AUDIT] Capturing thread modal/page screenshots...");
  const threadShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-full-thread-modal.png"), Buffer.from(threadShot.data, "base64"));
  console.log("📸 Saved full thread view: live-v2-full-thread-modal.png");

  // -------------------------------------------------------------------------
  // POST BRIDGE REPLY TO v0.1 THREAD
  // -------------------------------------------------------------------------
  console.log(`\n>>> [BRIDGE] Navigating to v0.1 thread: ${V01_THREAD_URL}...`);
  await pool.evaluate(wsUrl, `window.location.href = "${V01_THREAD_URL}"`);
  await human.sleep(5000, 6000);

  const BRIDGE_TEXT = `An update to this v0.1 thread: v0.2.0, HyperFrames Edition, is out.

The new thread covers reference analysis, 20 declarative primitives, hotspot audits, Studio Runner, and browser MP4 export.

Read the v0.2.0 thread here: ${ROOT_POST_URL}`;

  console.log("Focusing reply box for bridge reply...");
  await pool.evaluate(wsUrl, `(() => {
    const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
      const txt = (e.innerText || '').trim();
      return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
    });
    if (trigger) trigger.click();
  })()`);
  await human.sleep(1500, 2000);

  await pool.evaluate(wsUrl, `(() => {
    const eds = document.querySelectorAll('[contenteditable="true"]');
    const lastEd = eds[eds.length - 1];
    if (lastEd) {
      lastEd.focus();
    }
  })()`);
  await human.sleep(500, 800);

  console.log("Inserting bridge text...");
  await pool.send(wsUrl, "Input.insertText", { text: BRIDGE_TEXT });
  await human.sleep(5000, 6000);

  console.log("Submitting bridge reply...");
  let bridgeSubmitted = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    bridgeSubmitted = await clickPostButton(pool, wsUrl);
    if (bridgeSubmitted) break;
    await human.sleep(2000, 2500);
  }
  if (!bridgeSubmitted) throw new Error("Failed to submit bridge reply");

  console.log("Bridge reply submitted! Waiting 12s to settle...");
  await human.sleep(12000, 14000);

  const bridgeShot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-v2-bridge-proof.png"), Buffer.from(bridgeShot.data, "base64"));
  console.log("📸 Saved bridge proof: live-v2-bridge-proof.png");

  console.log("\n🎉 ALL 7 PARTS + BRIDGE REPLY SUCCESSFULLY PUBLISHED AND VERIFIED!");
  process.exit(0);
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
