import { CdpSessionPool } from "./cdp-session-pool.js";
import { AsyncGuard } from "./async-guard.js";
import fs from "fs";

const FIRST_REPLY_TEXT = `🔗 Explore the live engineering package, offline review page, and download the 3MF print files here:
https://jangtrinh.github.io/design-os-3d-blender/reviews/dc-01/r03/

Star the repository if you want to see us print and power it up live! ⭐`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 [JEV SYSTEM ONE] Initiating Autonomous Publish & First Reply Workflow...");

  // 1. Validate First Reply through AsyncGuard
  const guard = new AsyncGuard(0.15);
  const verdict = await guard.evaluateSafety(
    { action: "type", value: FIRST_REPLY_TEXT, selector: "reply-editor", confidence: 1, rationale: "First reply", latencyMs: 1 },
    "https://www.threads.com",
    { allowPublicPost: true }
  );

  if (!verdict.allowed) {
    console.error(`❌ [ASYNC GUARD] First reply blocked: ${verdict.guardReason}`);
    process.exit(1);
  }
  console.log("🛡️ [ASYNC GUARD] First reply verified safe.");

  // 2. Discover Threads tab in Dia
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = (await res.json()) as any[];
  const threadsTab = tabs.find((t: any) => t.url && t.url.includes("threads.com"));
  if (!threadsTab || !threadsTab.webSocketDebuggerUrl) {
    console.error("❌ Threads tab not found in Dia!");
    process.exit(1);
  }

  const wsUrl = threadsTab.webSocketDebuggerUrl;
  const pool = CdpSessionPool.getInstance();

  const send = async (method: string, params: any = {}) => {
    return pool.send(wsUrl, method, params, 15000);
  };

  const evaluate = async (expression: string) => {
    const res: any = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  };

  // 3. Click "Post" on the 4-card thread modal
  console.log("📤 [STEP 1] Clicking 'Post' button on the 4-card modal...");
  const postBtnInfo: any = await evaluate(`(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return null;
    const buttons = Array.from(dialog.querySelectorAll("[role=button]"));
    const postBtn = buttons.find(b => b.innerText && b.innerText.trim() === "Post");
    if (!postBtn) return null;
    const r = postBtn.getBoundingClientRect();
    return {
      x: r.x + r.width / 2,
      y: r.y + r.height / 2
    };
  })()`);

  if (!postBtnInfo) {
    console.error("❌ Could not locate Post button in modal!");
    process.exit(1);
  }

  console.log(`🎯 Clicking Post at (${postBtnInfo.x.toFixed(1)}, ${postBtnInfo.y.toFixed(1)})...`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: postBtnInfo.x, y: postBtnInfo.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: postBtnInfo.x, y: postBtnInfo.y, button: "left", clickCount: 1 });

  // 4. Wait for the dialog to disappear or upload progress to finish
  console.log("⏳ [STEP 2] Monitoring post submission & media upload...");
  let dialogClosed = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const dialogState: any = await evaluate(`(() => {
      const dialog = document.querySelector("[role=dialog]");
      if (!dialog) return { open: false };
      const btn = Array.from(dialog.querySelectorAll("[role=button]")).find(b => b.innerText && b.innerText.trim() === "Post");
      const disabled = btn ? (btn.getAttribute("aria-disabled") === "true" || btn.disabled) : false;
      const text = dialog.innerText;
      return { open: true, disabled, textLength: text.length };
    })()`);

    if (!dialogState.open) {
      console.log("🎉 [STEP 2] Dialog closed successfully! Post published.");
      dialogClosed = true;
      break;
    } else {
      console.log(`   Waiting for upload/processing... (attempt ${i + 1}/40, disabled=${dialogState.disabled})`);
    }
  }

  if (!dialogClosed) {
    console.warn("⚠️ Dialog did not close within 40s. Checking current state...");
    const shot: any = await send("Page.captureScreenshot", { format: "png" });
    if (shot?.data) {
      fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-post-status.png", Buffer.from(shot.data, "base64"));
    }
  }

  // 5. Navigate to profile to view the published thread
  console.log("🧭 [STEP 3] Navigating to user profile (@jangtrinhsg)...");
  await sleep(3000);
  await evaluate(`window.location.href = "https://www.threads.com/@jangtrinhsg"`);

  // Wait for profile page to load
  await sleep(5000);

  // Take screenshot of profile
  const profileShot: any = await send("Page.captureScreenshot", { format: "png" });
  if (profileShot?.data) {
    fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-profile-after-post.png", Buffer.from(profileShot.data, "base64"));
    console.log("📸 Profile screenshot saved.");
  }

  // 6. Locate the newest thread and open it / reply to it
  console.log("🔍 [STEP 4] Locating the published thread on profile...");
  const threadInfo: any = await evaluate(`(() => {
    // Look for posts on the profile
    const articles = Array.from(document.querySelectorAll("article, [data-pressable-container=true]"));
    // Search for the post containing DC-01 or CAD or text
    for (const a of articles) {
      if (a.innerText && (a.innerText.includes("Most AI 3D") || a.innerText.includes("DC-01") || a.innerText.includes("Blender 5.2"))) {
        const replyBtn = a.querySelector("[aria-label*='Reply'], [aria-label*='Trả lời'], svg[aria-label='Reply']");
        const link = a.querySelector("a[href*='/post/']");
        return {
          found: true,
          snippet: a.innerText.slice(0, 100),
          postUrl: link ? link.href : null
        };
      }
    }
    return { found: false };
  })()`);

  console.log("Thread Info:", threadInfo);

  if (threadInfo?.postUrl) {
    console.log(`🔗 Navigating directly to post URL: ${threadInfo.postUrl}`);
    await evaluate(`window.location.href = "${threadInfo.postUrl}"`);
    await sleep(4000);
  } else {
    console.log("⚠️ Could not find direct post link, will click into top post...");
    await evaluate(`(() => {
      const articles = Array.from(document.querySelectorAll("article, [data-pressable-container=true]"));
      for (const a of articles) {
        if (a.innerText && (a.innerText.includes("Most AI 3D") || a.innerText.includes("DC-01"))) {
          a.click();
          break;
        }
      }
    })()`);
    await sleep(4000);
  }

  // 7. Find Reply input / button on the post page
  console.log("💬 [STEP 5] Opening reply composer on thread...");
  const replyClicked: any = await evaluate(`(() => {
    // Look for reply button or reply input box
    const replyInput = document.querySelector("[contenteditable=true]");
    if (replyInput) {
      replyInput.focus();
      return { method: "input-focused" };
    }

    // Try finding reply button with aria-label
    const replyBtns = Array.from(document.querySelectorAll("[aria-label='Reply'], [aria-label='Trả lời'], svg[aria-label='Reply'], svg[aria-label='Trả lời']"));
    if (replyBtns.length > 0) {
      const target = replyBtns[0].closest("[role=button]") || replyBtns[0];
      const r = target.getBoundingClientRect();
      return {
        method: "coords",
        x: r.x + r.width / 2,
        y: r.y + r.height / 2
      };
    }

    // Fallback: look for button containing "Reply" or "Trả lời"
    const textBtns = Array.from(document.querySelectorAll("[role=button]")).filter(b => b.innerText && (b.innerText.includes("Reply") || b.innerText.includes("Trả lời")));
    if (textBtns.length > 0) {
      const r = textBtns[0].getBoundingClientRect();
      return {
        method: "coords",
        x: r.x + r.width / 2,
        y: r.y + r.height / 2
      };
    }

    return { error: "No reply button found" };
  })()`);

  console.log("Reply Click Result:", replyClicked);

  if (replyClicked?.method === "coords") {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: replyClicked.x, y: replyClicked.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: replyClicked.x, y: replyClicked.y, button: "left", clickCount: 1 });
    await sleep(1000);
  }

  // 8. Focus reply editable and insert text
  console.log("✍️ [STEP 6] Typing First Reply...");
  const focusReply: any = await evaluate(`(() => {
    const editables = Array.from(document.querySelectorAll("[contenteditable=true]"));
    if (editables.length === 0) return false;
    const target = editables[editables.length - 1];
    target.focus();
    return true;
  })()`);

  if (!focusReply) {
    console.error("❌ Could not focus reply editable!");
    const debugShot: any = await send("Page.captureScreenshot", { format: "png" });
    if (debugShot?.data) {
      fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-reply-debug.png", Buffer.from(debugShot.data, "base64"));
    }
  } else {
    await send("Input.insertText", { text: FIRST_REPLY_TEXT });
    await sleep(800);

    // 9. Click "Post" on the reply
    console.log("🚀 [STEP 7] Submitting First Reply...");
    const replyPostCoords: any = await evaluate(`(() => {
      // Find Post button in reply modal or inline bar
      const buttons = Array.from(document.querySelectorAll("[role=button]"));
      const postBtn = buttons.reverse().find(b => b.innerText && b.innerText.trim() === "Post");
      if (!postBtn) return null;
      const r = postBtn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);

    if (replyPostCoords) {
      console.log(`🎯 Clicking Reply Post at (${replyPostCoords.x.toFixed(1)}, ${replyPostCoords.y.toFixed(1)})...`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: replyPostCoords.x, y: replyPostCoords.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: replyPostCoords.x, y: replyPostCoords.y, button: "left", clickCount: 1 });
      await sleep(4000);
      console.log("🎉 First reply posted successfully!");
    } else {
      console.warn("⚠️ Could not find Post button for reply!");
    }
  }

  // 10. Final Proof Screenshot
  console.log("📸 [STEP 8] Capturing final proof screenshot...");
  const finalShot: any = await send("Page.captureScreenshot", { format: "png" });
  if (finalShot?.data) {
    fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-final-live-thread.png", Buffer.from(finalShot.data, "base64"));
    console.log("✅ Final screenshot saved to threads-final-live-thread.png");
  }

  pool.closeAll();
  console.log("🏁 [JEV SYSTEM ONE] Workflow completed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error in publish-and-reply:", err);
  process.exit(1);
});
