import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";

async function main() {
  console.log("🔔 [CHECK NOTIFICATIONS] Checking activity on Threads...");
  const pool = CdpSessionPool.getInstance();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);

  // Navigate to activity tab
  console.log("Navigating to https://www.threads.com/activity...");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", {
    url: "https://www.threads.com/activity"
  });

  await new Promise(r => setTimeout(r, 3000));

  const state = await ultrafast.observe(t.webSocketDebuggerUrl);
  console.log(`Snapshot URL: ${state.url}, Title: ${state.title}`);

  // Extract recent activities
  const activities: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const text = document.body.innerText;
    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
    return lines.slice(0, 40);
  })()`);

  console.log("Activity items sampled:", activities);

  // Take screenshot for proof
  const shot: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
  const fs = await import("fs");
  const p = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-activity-check.png";
  fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
  console.log("Screenshot saved to:", p);

  process.exit(0);
}

main().catch(console.error);
