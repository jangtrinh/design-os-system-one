import { JevUltrafast } from "./jev-ultrafast.js";
import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  console.log("🔍 [JEV ULTRAFAST SCOUT] Scouting #3dprinting community...");
  const pool = CdpSessionPool.getInstance();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const ultrafast = new JevUltrafast();
  await ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);

  // Navigate to #3dprinting tag page
  console.log("🌐 Navigating to #3dprinting topic page...");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", {
    url: "https://www.threads.com/search?q=3dprinting&serp_type=tags&tag_id=18321651793107434"
  });

  // Wait 3s for hydration
  await new Promise(r => setTimeout(r, 3000));

  const state = await ultrafast.observe(t.webSocketDebuggerUrl);
  console.log(`⚡ Page captured in fast snapshot! Title: "${state.title}", Total actions: ${state.actions.length}`);

  // Extract posts from page
  const posts: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const articles = document.querySelectorAll('article, [data-pressable-container="true"]');
    const items = [];
    for (const art of articles) {
      const text = art.innerText.trim();
      if (!text || text.length < 20) continue;
      const links = Array.from(art.querySelectorAll('a[href*="/post/"]')).map(a => a.getAttribute('href'));
      const authors = Array.from(art.querySelectorAll('a[href^="/@"]')).map(a => a.innerText.trim()).filter(Boolean);
      items.push({
        author: authors[0] || "unknown",
        postLink: links[0] || null,
        preview: text.slice(0, 250).replace(/\\n+/g, ' ')
      });
    }
    return items.slice(0, 10);
  })()`);

  console.log("\n🔥 Top Trending Posts Found:");
  posts.forEach((p: any, i: number) => {
    console.log(`[${i + 1}] @${p.author}: "${p.preview}"`);
    if (p.postLink) console.log(`    Link: https://www.threads.com${p.postLink}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Scout error:", err);
  process.exit(1);
});
