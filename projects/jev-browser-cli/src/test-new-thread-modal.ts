import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const pool = CdpSessionPool.getInstance();

  // Click "+ New thread" on sidebar
  const clicked: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const btns = Array.from(document.querySelectorAll("div[role=button], a, div"));
    const newThread = btns.find(b => (b.innerText || "").trim() === "New thread");
    if (!newThread) return null;
    const r = newThread.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);

  console.log("Clicked info:", clicked);
  if (clicked) {
    await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mousePressed", x: clicked.x, y: clicked.y, button: "left", clickCount: 1 });
    await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mouseReleased", x: clicked.x, y: clicked.y, button: "left", clickCount: 1 });
    await new Promise(r => setTimeout(r, 1500));
  }

  const ss: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 80 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-new-thread-modal.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Saved to:", outPath);
}

main().catch(console.error);
