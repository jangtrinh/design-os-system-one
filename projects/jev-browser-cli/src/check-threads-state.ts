import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) {
    console.error("No threads tab found!");
    process.exit(1);
  }
  console.log("Found Threads tab:", t.url, t.title);
  const pool = CdpSessionPool.getInstance();
  const ss: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 80 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-current-view.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Screenshot saved to:", outPath);
}

main().catch(console.error);
