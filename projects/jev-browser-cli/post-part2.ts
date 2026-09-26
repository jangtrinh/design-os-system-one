import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const VIDEO_CODEX = "/Users/jangtrinh/Products/design-os-svg-animation/promo/codex-app-promo.mp4";

const PART_2_TEXT = `Part 2/4
Ví dụ thứ hai: bản dựng lại OpenAI Codex App Promo.

Cửa sổ macOS, nhiều agent chạy song song, phần xem thay đổi code và bản xem trước photobooth được đưa vào cùng một mạch kể.

Với demo công cụ lập trình, mình chọn kể theo luồng thao tác để người xem hiểu công việc diễn ra thế nào.`;

async function postPart2() {
  console.log("🚀 [JEV] Posting Part 2 (OpenAI Codex App Promo)...");
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("1. Focusing reply editor...");
  await pool.evaluate(wsUrl, `(() => {
    let ed = document.querySelector('[contenteditable="true"]');
    if (!ed) {
      const trigger = Array.from(document.querySelectorAll('div, span')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt === "Reply to jangtrinhsg..." || txt.startsWith("Reply to");
      });
      if (trigger) trigger.click();
    }
    ed = document.querySelector('[contenteditable="true"]');
    if (ed) ed.focus();
  })()`);
  await human.sleep(1000, 1500);

  console.log("2. Inserting Part 2 text...");
  await pool.send(wsUrl, "Input.insertText", { text: PART_2_TEXT });
  await human.sleep(1500, 2000);

  console.log("3. Clicking [Attach media] button...");
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('div[role="button"][aria-label="Attach media"], [aria-label="Attach media"]');
    if (btn) btn.click();
  })()`);
  await human.sleep(1500, 2000);

  console.log("4. Finding file input in DOM...");
  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInput: any = await pool.send(wsUrl, "DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!fileInput?.nodeId) throw new Error("Could not find file input after clicking Attach media");

  console.log(`5. Setting file input to ${VIDEO_CODEX} (nodeId: ${fileInput.nodeId})...`);
  await pool.send(wsUrl, "DOM.setFileInputFiles", {
    files: [VIDEO_CODEX],
    nodeId: fileInput.nodeId
  });

  console.log("6. Waiting 16s for Codex App video processing & thumbnail...");
  await human.sleep(15000, 18000);

  // Capture staged screenshot
  const stagedShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "staged-part2-codex.png"), Buffer.from(stagedShot.data, "base64"));
  console.log("📸 Saved staged proof: staged-part2-codex.png");

  // Click Reply button
  console.log("7. Waiting for Post/Reply button to become enabled...");
  let clicked = false;
  for (let i = 0; i < 30; i++) {
    const state: any = await pool.evaluate(wsUrl, `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const target = btns.find(b => {
        const t = (b.innerText || '').trim();
        const aria = b.getAttribute('aria-label') || '';
        return t === "Post" || t === "Reply" || aria === "Reply" || aria === "Post";
      });
      if (!target) return { found: false };
      const disabled = target.hasAttribute('disabled') ||
                       target.getAttribute('aria-disabled') === 'true' ||
                       window.getComputedStyle(target).opacity === '0.5';
      if (disabled) return { found: true, disabled: true };
      target.click();
      return { found: true, disabled: false, text: target.innerText };
    })()`);

    if (state?.found && !state?.disabled) {
      console.log("✅ Clicked Reply button successfully!", state.text);
      clicked = true;
      break;
    }
    await human.sleep(2000, 2500);
  }

  if (!clicked) throw new Error("Failed to click Reply button within timeout");

  console.log("8. Waiting 15s for Part 2 reply to settle...");
  await human.sleep(14000, 16000);

  // Capture live screenshot
  const liveShot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-part2-codex.png"), Buffer.from(liveShot.data, "base64"));
  console.log("📸 Saved live proof: live-part2-codex.png");
  console.log("🎉 Part 2 posted successfully!");
}

postPart2().catch(err => {
  console.error("❌ Error in postPart2:", err);
  process.exit(1);
});
