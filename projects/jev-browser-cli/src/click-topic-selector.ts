import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const pool = CdpSessionPool.getInstance();

  console.log("Clicking at (740, 468)...");
  await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mousePressed", x: 740, y: 468, button: "left", clickCount: 1 });
  await pool.send(t.webSocketDebuggerUrl, "Input.dispatchMouseEvent", { type: "mouseReleased", x: 740, y: 468, button: "left", clickCount: 1 });
  await new Promise(r => setTimeout(r, 1500));

  const ss: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 80 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-topic-picker-clicked.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to:", outPath);
}

main().catch(console.error);
