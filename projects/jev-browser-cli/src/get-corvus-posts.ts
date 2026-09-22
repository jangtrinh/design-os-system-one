import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const posts: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const postLinks = Array.from(document.querySelectorAll('a[href*="/post/"]'));
    const results = [];
    const seen = new Set();
    for (const link of postLinks) {
      const href = link.getAttribute('href');
      if (seen.has(href)) continue;
      seen.add(href);
      const parent = link.closest('div[data-pressable-container="true"]') || link.parentElement?.parentElement?.parentElement;
      results.push({
        href,
        text: (parent?.innerText || '').slice(0, 200).replace(/\\n+/g, ' ')
      });
    }
    return results;
  })()`);

  console.log("Recent posts by @lwh_corvus:", posts);
  process.exit(0);
}

main().catch(console.error);
