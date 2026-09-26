import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function testProfileLinks() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to https://www.threads.com/@jangtrinhsg...");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
  await human.sleep(4000, 5000);

  const result = await pool.evaluate(wsUrl, `(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/post/"]')).map(a => a.getAttribute('href'));
    return {
      count: links.length,
      first3: links.slice(0, 3)
    };
  })()`);
  console.log("Profile post links:", JSON.stringify(result, null, 2));
}

testProfileLinks().catch(console.error);
