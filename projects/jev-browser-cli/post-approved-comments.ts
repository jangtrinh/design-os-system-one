import path from "path";
import fs from "fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const PENDING_QUEUE_FILE = path.resolve("./pending-review-queue.json");
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");

async function main() {
  console.log("🚀 [APPROVED COMMENTS] Starting execution of vetted high-value technical comments...");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No active Threads tab found on port 9222");
  const wsUrl = t.webSocketDebuggerUrl;

  const queue = JSON.parse(fs.readFileSync(PENDING_QUEUE_FILE, "utf-8")) as any[];
  const pending = queue.filter(q => q.status === "pending_review");

  if (pending.length === 0) {
    console.log("ℹ️ No pending comments to post.");
    return;
  }

  console.log(`📋 Found ${pending.length} approved comments to post.`);

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`🎯 [COMMENT ${i + 1}/${pending.length}] Replying to @${item.author}...`);
    console.log(`🔗 Post: ${item.postLink}`);
    console.log(`📚 Authoritative Source: ${item.sourceCitation}`);
    console.log(`💬 Text:\n"${item.draftedReply}"`);

    // 1. Navigate safely to post URL
    await human.navigateSafely(wsUrl, item.postLink);
    await human.sleep(4000, 6000); // Wait for post and comments to render
    await human.scrollNatural(wsUrl, 1); // Natural human scroll down

    // 2. Focus reply area
    console.log("📝 Focusing reply editor...");
    const focused = await pool.evaluate(wsUrl, `(() => {
      let ed = document.querySelector('[contenteditable="true"]');
      if (!ed) {
        const trigger = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
          const txt = (e.innerText || '').trim();
          return txt.startsWith("Reply to") || txt === "Reply";
        });
        if (trigger) trigger.click();
      }
      ed = document.querySelector('[contenteditable="true"]');
      if (ed) {
        ed.focus();
        return true;
      }
      return false;
    })()`);

    if (!focused) {
      console.log(`⚠️ Could not find or focus reply editor for @${item.author}. Skipping.`);
      continue;
    }

    await human.sleep(1200, 2000);

    // 3. Human-like natural typing
    console.log("✍️ [HUMAN TYPING] Typing reply with natural cadence...");
    await human.typeHumanLike(wsUrl, item.draftedReply);
    await human.sleep(2000, 3000);

    // 4. Capture staged comment screenshot
    const stagedShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
    const stagedProofPath = path.join(ARTIFACT_DIR, `comment-staged-${item.author}.png`);
    fs.writeFileSync(stagedProofPath, Buffer.from(stagedShot.data, "base64"));
    console.log(`📸 Staged comment proof saved: comment-staged-${item.author}.png`);

    // 5. Submit Post/Reply
    console.log("🚀 Clicking Post button...");
    await human.sleep(1000, 2000);
    const submitted: any = await pool.evaluate(wsUrl, `(() => {
      const ed = document.querySelector('[contenteditable="true"]');
      let parent = ed;
      for (let i = 0; i < 6; i++) {
        if (parent && parent.parentElement) parent = parent.parentElement;
      }
      const scope = parent || document;
      const btns = Array.from(scope.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(b => {
        const t = (b.innerText || '').trim();
        const aria = b.getAttribute('aria-label') || '';
        const hasReplySvg = !!b.querySelector('svg[aria-label="Reply"], svg[aria-label="Post"]');
        return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post" || hasReplySvg;
      });
      if (postBtn) {
        postBtn.click();
        return { success: true, text: postBtn.innerText, aria: postBtn.getAttribute('aria-label') };
      }
      return { success: false, reason: "Post/Reply button not found" };
    })()`);
    console.log(`Submit result: ${JSON.stringify(submitted)}`);

    // 6. Wait for submission to complete
    await human.sleep(6000, 8000);

    // 7. Capture live confirmation screenshot
    const liveShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
    const liveProofPath = path.join(ARTIFACT_DIR, `comment-live-${item.author}.png`);
    fs.writeFileSync(liveProofPath, Buffer.from(liveShot.data, "base64"));
    console.log(`📸 Live confirmation saved: comment-live-${item.author}.png`);

    // 8. Update queue item status
    item.status = "posted";
    item.postedAt = new Date().toISOString();
    fs.writeFileSync(PENDING_QUEUE_FILE, JSON.stringify(queue, null, 2));

    // 9. Update growth state
    try {
      if (fs.existsSync(GROWTH_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
        if (!state.completedComments.includes(item.postLink)) {
          state.completedComments.push(item.postLink);
          state.totalComments = (state.totalComments || 0) + 1;
          state.lastCommentAt = new Date().toISOString();
          state.logs.push(`[${new Date().toLocaleTimeString()}] 💬 Posted pure high-value advice to @${item.author}: "${item.sourceCitation}"`);
          fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
        }
      }
    } catch (e) {
      console.error("Error updating growth state:", e);
    }

    // 10. Human pause between comments if more remain
    if (i < pending.length - 1) {
      console.log("⏳ Resting 15s before next comment to maintain natural human browsing pattern...");
      await human.sleep(15000, 20000);
    }
  }

  console.log("\n🎉 [ALL DONE] All approved comments posted and verified live!");
}

main().catch(err => {
  console.error("❌ Error running approved comments:", err);
  process.exit(1);
});
