import fs from "fs";
import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const shot: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const p = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-corvus-reply-settled.png";
  fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
  console.log("Settled screenshot saved to:", p);
  process.exit(0);
}

main().catch(console.error);
