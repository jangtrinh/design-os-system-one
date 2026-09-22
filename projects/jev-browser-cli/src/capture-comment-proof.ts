import fs from "fs";
import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  // Scroll to Jang's comment
  await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => 
      e.children.length === 0 && e.innerText && e.innerText.includes("forced Astra to write native Blender Python")
    );
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  })()`);

  await new Promise(r => setTimeout(r, 1500));

  const shot: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const p = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-corvus-comment-proof.png";
  fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
  console.log("📸 Comment proof screenshot saved to:", p);
  process.exit(0);
}

main().catch(console.error);
