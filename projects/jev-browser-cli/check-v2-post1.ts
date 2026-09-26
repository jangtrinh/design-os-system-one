import { CdpSessionPool } from "./src/cdp-session-pool.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function check() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  // Navigate using window.location.href
  console.log("Setting location to profile...");
  await pool.evaluate(wsUrl, `window.location.href = "https://www.threads.com/@jangtrinhsg"`);
  await new Promise(r => setTimeout(r, 5000));

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "live-profile-current.png"), Buffer.from(shot.data, "base64"));
  console.log("📸 Saved profile screenshot: live-profile-current.png");

  const info: any = await pool.evaluate(wsUrl, `(() => {
    const postLinks = Array.from(document.querySelectorAll('a'))
      .filter(a => (a.getAttribute('href') || '').includes('/post/'))
      .map(a => ({
        href: a.getAttribute('href'),
        text: (a.innerText || '').trim(),
        hasV2: (document.body.innerText || '').includes('HyperFrames') || (document.body.innerText || '').includes('v0.2.0')
      }));
    return {
      postLinks: postLinks.slice(0, 8),
      bodyHasV2: (document.body.innerText || '').includes('HyperFrames') || (document.body.innerText || '').includes('v0.2.0'),
      bodySnippet: document.body.innerText.slice(0, 500)
    };
  })()`);

  console.log("Profile verification result:", JSON.stringify(info, null, 2));
}

check().catch(console.error);
