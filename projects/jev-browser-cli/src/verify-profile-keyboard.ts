import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  const pool = CdpSessionPool.getInstance();

  console.log("Navigating to profile: https://www.threads.com/@jangtrinhsg");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await new Promise(r => setTimeout(r, 3500));

  const ss = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 85 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-profile-keyboard-live.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Profile screenshot saved to:", outPath);
}

main().catch(console.error);
