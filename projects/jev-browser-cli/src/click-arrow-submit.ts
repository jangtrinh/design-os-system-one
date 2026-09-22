import fs from "fs";
import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  console.log("Finding and clicking the round submit button...");
  const clickRes: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    // Look for SVG path of upward arrow or circle container near the editor
    const editor = document.querySelector('[contenteditable="true"]');
    if (!editor) return { error: "No editor" };

    // Find the enclosing composer card
    let parent = editor.parentElement;
    while (parent && parent !== document.body) {
      const svgs = parent.querySelectorAll('svg');
      // Look for the submit arrow (usually last or has specific shape)
      for (const svg of svgs) {
        const btn = svg.closest('div[role="button"], button');
        if (btn) {
          const r = btn.getBoundingClientRect();
          // The arrow button is at the bottom right of the composer
          if (r.x > 600 && r.y > 400 && r.y < 600 && r.width >= 24 && r.width <= 48) {
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.click();
            return { success: true, rect: r, ariaLabel: btn.getAttribute('aria-label') };
          }
        }
      }
      parent = parent.parentElement;
    }
    return { error: "Submit button not found" };
  })()`);

  console.log("Submit button click result:", clickRes);

  await new Promise(r => setTimeout(r, 4000));

  const shot: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const p = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-corvus-reply-live.png";
  fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
  console.log("Live screenshot saved to:", p);

  process.exit(0);
}

main().catch(console.error);
