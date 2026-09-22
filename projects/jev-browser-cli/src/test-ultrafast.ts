import { JevUltrafast } from "./jev-ultrafast.js";

async function main() {
  console.log("⚡ [JEV ULTRAFAST] Testing snapshot speed and control resolution...");
  const tStart = Date.now();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);

  const state = await ultrafast.observe(t.webSocketDebuggerUrl);
  const elapsed = Date.now() - tStart;

  console.log(`🚀 [JEV ULTRAFAST] Page snapshot finished in ${elapsed}ms!`);
  console.log(`   URL: ${state.url}`);
  console.log(`   Title: ${state.title}`);
  console.log(`   Total interactive controls resolved: ${state.actions.length}`);
  console.log(`   Page text words sampled: ${state.text.split("\n").length}`);
  
  console.log("\n📋 Sample top 10 actions:");
  state.actions.slice(0, 10).forEach(a => {
    console.log(`   [${a.id}] ${a.kind.toUpperCase()} "${a.label}" (role: ${a.role || "N/A"})`);
  });
}

main().catch(console.error);
