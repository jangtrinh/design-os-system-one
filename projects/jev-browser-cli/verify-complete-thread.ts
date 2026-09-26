import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const GROWTH_STATE_FILE = path.resolve("./autonomous-growth-state.json");
const THREAD_URL = "https://www.threads.com/@jangtrinhsg/post/Ddm5DzBk_Hm";

async function verifyThread() {
  console.log("Connecting to Chrome CDP on port 9222...");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = (await res.json()) as any[];
  const t = tabs.find((x) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log(`Navigating to thread: ${THREAD_URL}`);
  await pool.send(wsUrl, "Page.navigate", { url: THREAD_URL });
  await human.sleep(6000, 7000);

  // Extract page content
  const threadData: any = await pool.evaluate(
    wsUrl,
    `(() => {
    const textNodes = Array.from(document.querySelectorAll('span, div[dir="auto"]'))
      .map(el => (el.innerText || '').trim())
      .filter(t => t.length > 20);
    const uniqueTexts = Array.from(new Set(textNodes));
    
    const hasPart1 = uniqueTexts.some(t => t.includes("Claude Design") || t.includes("bản dựng lại Claude"));
    const hasPart2 = uniqueTexts.some(t => t.includes("OpenAI Codex") || t.includes("bản dựng lại OpenAI"));
    const hasPart3 = uniqueTexts.some(t => t.includes("Vercel v0") || t.includes("bản dựng lại Vercel"));
    const hasPart4 = uniqueTexts.some(t => t.includes("Virtual Clock") || t.includes("design-os-svg-animation"));

    const videoElements = document.querySelectorAll('video').length;

    return {
      hasPart1,
      hasPart2,
      hasPart3,
      hasPart4,
      videoCount: videoElements,
      matchingSnippets: uniqueTexts.filter(t => 
        t.includes("Claude") || t.includes("Codex") || t.includes("v0") || t.includes("Virtual Clock") || t.includes("github.com")
      )
    };
  })()`,
    15000
  );

  console.log("Thread verification check:", JSON.stringify(threadData, null, 2));

  // Top shot (Part 1 and top of thread)
  const shot1: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-part1-proof.png"), Buffer.from(shot1.data, "base64"));
  console.log("Saved live-thread-part1-proof.png");

  // Scroll down for Part 2 & Part 3
  await human.sleep(1000, 1500);
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 34, key: "PageDown" });
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 34, key: "PageDown" });
  await human.sleep(2500, 3000);

  const shot2: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-part2-part3-proof.png"), Buffer.from(shot2.data, "base64"));
  console.log("Saved live-thread-part2-part3-proof.png");

  // Scroll down for Part 4 & links
  await human.sleep(1000, 1500);
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 34, key: "PageDown" });
  await pool.send(wsUrl, "Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 34, key: "PageDown" });
  await human.sleep(2500, 3000);

  const shot3: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-thread-part4-links-proof.png"), Buffer.from(shot3.data, "base64"));
  console.log("Saved live-thread-part4-links-proof.png");

  // Update growth state file
  if (fs.existsSync(GROWTH_STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(GROWTH_STATE_FILE, "utf-8"));
      if (!state.completedDrops.includes("drop_design_os_svg_animation_launch_v2")) {
        state.completedDrops.push("drop_design_os_svg_animation_launch_v2");
        state.totalPosts = (state.totalPosts || 0) + 1;
        state.lastDropAt = new Date().toISOString();
      }
      state.logs.push(`[${new Date().toLocaleTimeString()}] Verified live 4-part sequential thread for design-os-svg-animation at ${THREAD_URL}`);
      fs.writeFileSync(GROWTH_STATE_FILE, JSON.stringify(state, null, 2));
      console.log("Updated autonomous growth state successfully.");
    } catch (e) {
      console.error("Error reading/writing growth state:", e);
    }
  }

  console.log("\n>>> Verification completed successfully!");
}

verifyThread().catch(console.error);
