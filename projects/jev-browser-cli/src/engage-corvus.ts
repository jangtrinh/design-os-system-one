import fs from "fs";
import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";
import { AsyncGuard } from "./async-guard.js";

const COMMENT_TEXT = `100% this. Wrapping Tripo3D or MeshAI APIs produces non-manifold junk that you can’t even boolean or 3D print without manual retopology.

That’s why we forced Astra to write native Blender Python directly—generating exact Bmesh coordinates, ISO fastener fits, and parametric clearances. Real CAD needs math and constraints, not hallucinated point clouds.`;

async function main() {
  console.log("🚀 [JEV ENGAGE] Starting high-IQ reply to @lwh_corvus...");

  // 1. Safety verification
  const guard = new AsyncGuard(0.15);
  const verdict = await guard.evaluateSafety(
    { action: "type", value: COMMENT_TEXT, selector: "reply-editor", confidence: 1, rationale: "Reply to corvus", latencyMs: 1 },
    "https://www.threads.com",
    { allowPublicPost: true }
  );
  if (!verdict.allowed) {
    console.error("❌ Blocked by AsyncGuard:", verdict.guardReason);
    process.exit(1);
  }
  console.log(`🛡️ [ASYNC GUARD] Comment passed safety checks (${COMMENT_TEXT.length} chars).`);

  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);

  // Ensure on corvus post
  console.log("Navigating to target post...");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", {
    url: "https://www.threads.com/@lwh_corvus/post/DdWjordk3-s"
  });
  await new Promise(r => setTimeout(r, 3000));

  // Snapshot
  let state = await ultrafast.observe(t.webSocketDebuggerUrl);
  console.log(`⚡ Page captured in fast snapshot! Total actions: ${state.actions.length}`);

  // Find Reply 10 button
  const replyBtn = state.actions.find(a => a.label.startsWith("Reply 10") || a.label === "Reply 10");
  if (!replyBtn || replyBtn.node === undefined) {
    console.error("Could not find Reply 10 button");
    process.exit(1);
  }

  console.log(`Found reply button node ${replyBtn.node}, clicking...`);
  const clickRes = await ultrafast.clickNode(t.webSocketDebuggerUrl, replyBtn.node);
  console.log("Click result:", clickRes);

  await new Promise(r => setTimeout(r, 1500));

  // Snapshot again to find reply textbox
  state = await ultrafast.observe(t.webSocketDebuggerUrl);
  console.log("Actions after clicking reply:", state.actions.length);

  const textbox = state.actions.find(a => a.role === "textbox" || a.label.includes("Reply") || a.label.includes("Say more") || a.kind === "click" && a.label.includes("post"));
  console.log("Target textbox candidate:", textbox);

  // Inject text via CDP into active contenteditable
  await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const editor = document.querySelector('div[role="dialog"] div[role="textbox"], div[role="dialog"] [contenteditable="true"], div[role="textbox"]');
    if (editor) {
      editor.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(COMMENT_TEXT)});
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  })()`);

  await new Promise(r => setTimeout(r, 1500));

  // Take staged screenshot
  const shot1: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const p1 = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-corvus-reply-staged.png";
  fs.writeFileSync(p1, Buffer.from(shot1.data, "base64"));
  console.log("📸 Staged screenshot saved to:", p1);

  // Now find Post button in dialog
  const postClicked: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const dialog = document.querySelector('div[role="dialog"]') || document.body;
    const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
    for (const b of btns) {
      if (b.innerText.trim() === "Post" || b.getAttribute('aria-label') === "Post") {
        b.scrollIntoView({ behavior: 'instant', block: 'center' });
        b.click();
        return { clicked: true, text: b.innerText };
      }
    }
    return { clicked: false };
  })()`);

  console.log("Post button click result:", postClicked);

  await new Promise(r => setTimeout(r, 4000));

  // Verification screenshot
  const shot2: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const p2 = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-corvus-reply-published.png";
  fs.writeFileSync(p2, Buffer.from(shot2.data, "base64"));
  console.log("📸 Verification screenshot saved to:", p2);

  process.exit(0);
}

main().catch(console.error);
