import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);

  console.log("Navigating to https://www.threads.com/@lwh_corvus/post/DdWjordk3-s...");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", {
    url: "https://www.threads.com/@lwh_corvus/post/DdWjordk3-s"
  });

  await new Promise(r => setTimeout(r, 2500));
  const state = await ultrafast.observe(t.webSocketDebuggerUrl);

  const data: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const text = document.body.innerText;
    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
    return lines.slice(0, 40);
  })()`);

  console.log("Thread lines:", data);
  process.exit(0);
}

main().catch(console.error);
