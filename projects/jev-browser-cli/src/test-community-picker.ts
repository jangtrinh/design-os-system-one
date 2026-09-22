import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const pool = CdpSessionPool.getInstance();

  const clickInfo: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return null;
    const els = Array.from(dialog.querySelectorAll("*"));
    const target = els.find(e => (e.innerText || "").includes("Community or topic"));
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: target.innerText };
  })()`);

  console.log("Community selector click info:", clickInfo);
  if (clickInfo) {
    await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mousePressed", x: clickInfo.x, y: clickInfo.y, button: "left", clickCount: 1 });
    await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mouseReleased", x: clickInfo.x, y: clickInfo.y, button: "left", clickCount: 1 });
    await new Promise(r => setTimeout(r, 1500));
  }

  const ss: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 80 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-community-picker.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Saved to:", outPath);
}

main().catch(console.error);
