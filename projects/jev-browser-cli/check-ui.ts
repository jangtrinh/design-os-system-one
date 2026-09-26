import { CdpSessionPool } from "./src/cdp-session-pool.js";
import * as fs from "node:fs";

async function checkUI() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  const shot: any = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/debug-screen.png", Buffer.from(shot.data, "base64"));
  console.log("Saved debug-screen.png");

  const triggers: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('div[role="button"], button, svg, span')).map(e => ({
      tag: e.tagName,
      role: e.getAttribute('role'),
      aria: e.getAttribute('aria-label'),
      text: (e.innerText || '').trim().slice(0, 50)
    })).filter(x => x.aria || (x.text && x.text.length > 0 && x.text.length < 30));
  })()`);
  console.log("Triggers:", JSON.stringify(triggers.slice(0, 30), null, 2));
}

checkUI().catch(console.error);
