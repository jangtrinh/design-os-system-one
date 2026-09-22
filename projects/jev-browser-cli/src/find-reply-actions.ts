import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  const state = await ultrafast.observe(t.webSocketDebuggerUrl);

  console.log("Current page URL:", state.url);
  console.log("Total actions:", state.actions.length);

  // Find reply or post actions
  const replyActions = state.actions.filter(a => 
    a.label.toLowerCase().includes("reply") || 
    a.label.toLowerCase().includes("post") ||
    a.label.toLowerCase().includes("say more") ||
    a.role === "textbox"
  );

  console.log("Relevant reply actions:", replyActions);
  process.exit(0);
}

main().catch(console.error);
