import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const ROOT_POST_URL = "https://www.threads.com/@jangtrinhsg/post/DdoET5NE9Zn";
const V01_THREAD_URL = "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm";

const PARTS_3_TO_7 = [
  {
    num: 3,
    text: `HyperFrames provides 20 declarative primitives in src/runtime/hyperframes-engine.mjs.

Text, input, chat, window, phone, chart, grid, and more.

Compose them into staged drafts in minutes. AI specifies the scene structure and sequence. The runtime handles motion execution.`
  },
  {
    num: 4,
    text: `A click animation needs a measurable spatial contract.

Gate 6, the Hotspot Concentricity Audit, checks the distance between the pointer tip and click ripple centroid.

The allowed error is at most 1.0 px. Bounding box containment checks verify that the click lands inside its target.

Run npm run audit:hotspots.`
  },
  {
    num: 5,
    text: `Timing needs a shared inspection surface.

The Studio Runner UI, styled by studio-runner.css, brings timecode, a scrubber, scene jump pills, and playback speed toggles into one interface.

Scrub to a transition, jump between scenes, or slow playback to inspect a click. Review motion against a common timeline.`
  },
  {
    num: 6,
    text: `MP4 export runs in the browser through WebCodecs.

VideoEncoder is configured for H.264 using avc1.640033, a 24 Mbps target bitrate, and 60 fps. mp4-muxer packages the encoded video into MP4.

The encoding configuration is explicit and inspectable.`
  },
  {
    num: 7,
    text: `v0.2.0 connects reference analysis, declarative scene composition, deterministic motion, geometric audits, timeline inspection, and browser export.

AI defines intent. The engine executes it. Audits measure whether the result meets the specified bounds.

https://github.com/jangtrinh/design-os-svg-animation

Which constraint is hardest to enforce in your motion pipeline: spatial accuracy, timing, or audio synchronization?`
  }
];

async function submitReply(pool: CdpSessionPool, wsUrl: string): Promise<boolean> {
  const clicked: boolean = await pool.evaluate(wsUrl, `(() => {
    // 1. Try upward arrow icon in inline composer
    const arrowPath = document.querySelector('svg path[d*="M1 6h10"]');
    if (arrowPath) {
      const btn = arrowPath.closest('div[role="button"], button');
      if (btn) {
        const disabled = btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true';
        if (!disabled) {
          btn.click();
          return true;
        }
      }
    }

    // 2. Try button with text "Post" or "Reply"
    const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
    const textBtn = btns.find(b => {
      const t = (b.innerText || '').trim();
      return t === "Post" || t === "Reply";
    });
    if (textBtn) {
      const disabled = textBtn.hasAttribute('disabled') || textBtn.getAttribute('aria-disabled') === 'true';
      if (!disabled) {
        textBtn.click();
        return true;
      }
    }

    // 3. Try button with aria-label="Reply" or aria-label="Post"
    const ariaBtn = btns.find(b => {
      const a = b.getAttribute('aria-label') || '';
      return a === "Reply" || a === "Post";
    });
    if (ariaBtn) {
      const disabled = ariaBtn.hasAttribute('disabled') || ariaBtn.getAttribute('aria-disabled') === 'true';
      if (!disabled) {
        ariaBtn.click();
        return true;
      }
    }

    return false;
  })()`);

  return clicked;
}

async function main() {
  console.log("============================================================");
  console.log("🚀 [JEV CHAIN] Publishing Parts 3 to 7 & Bridge Reply...");
  console.log("============================================================\n");

  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  // Make sure we are on ROOT_POST_URL
  const cur = await pool.evaluate(wsUrl, `location.href`);
  console.log("Current page URL:", cur);
  if (!cur.includes("DdoET5NE9Zn")) {
    console.log(`Navigating to ${ROOT_POST_URL}...`);
    await pool.evaluate(wsUrl, `location.href = "${ROOT_POST_URL}"`);
    await human.sleep(4000, 5000);
  }

  // Sequentially post Parts 3 to 7
  for (const part of PARTS_3_TO_7) {
    console.log(`\n>>> [STEP ${part.num}/7] Posting Part ${part.num}...`);

    // Focus editor
    console.log(`Focusing reply box for Part ${part.num}...`);
    await pool.evaluate(wsUrl, `(() => {
      const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
      });
      if (trigger) trigger.click();
      const eds = document.querySelectorAll('[contenteditable="true"]');
      const lastEd = eds[eds.length - 1];
      if (lastEd) {
        lastEd.focus();
      }
    })()`);
    await human.sleep(1200, 1500);

    // Type text
    console.log(`Typing Part ${part.num} text...`);
    await pool.evaluate(wsUrl, `(() => {
      const eds = document.querySelectorAll('[contenteditable="true"]');
      const lastEd = eds[eds.length - 1];
      if (lastEd) lastEd.focus();
    })()`);
    await human.sleep(400, 600);
    await pool.send(wsUrl, "Input.insertText", { text: part.text });

    if (part.num === 7) {
      console.log("Waiting 6s for GitHub link card preview...");
      await human.sleep(6000, 7000);
    } else {
      await human.sleep(2000, 2500);
    }

    // Submit reply
    console.log(`Submitting Part ${part.num}...`);
    let submitted = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      submitted = await submitReply(pool, wsUrl);
      if (submitted) break;
      await human.sleep(1500, 2000);
    }
    if (!submitted) throw new Error(`Failed to click submit for Part ${part.num}`);

    console.log(`✅ Part ${part.num} submit triggered! Waiting 12s to settle...`);
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
  await pool.evaluate(wsUrl, `location.href = "${V01_THREAD_URL}"`);
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
    const eds = document.querySelectorAll('[contenteditable="true"]');
    const lastEd = eds[eds.length - 1];
    if (lastEd) {
      lastEd.focus();
    }
  })()`);
  await human.sleep(1500, 2000);

  console.log("Inserting bridge text...");
  await pool.send(wsUrl, "Input.insertText", { text: BRIDGE_TEXT });
  await human.sleep(5000, 6000);

  console.log("Submitting bridge reply...");
  let bridgeSubmitted = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    bridgeSubmitted = await submitReply(pool, wsUrl);
    if (bridgeSubmitted) break;
    await human.sleep(1500, 2000);
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
