import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const data: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    // Threads uses specific containers for post items
    // Let's find all elements with links to /post/
    const postLinks = Array.from(document.querySelectorAll('a[href*="/post/"]'));
    const results = [];
    const seenHrefs = new Set();

    for (const link of postLinks) {
      const href = link.getAttribute('href');
      if (seenHrefs.has(href)) continue;
      seenHrefs.add(href);

      // Find the card container (go up 5-10 levels)
      let container = link.closest('div[style*="min-height"]') || link.parentElement;
      for (let i = 0; i < 8; i++) {
        if (!container || !container.parentElement) break;
        if (container.innerText && container.innerText.includes('\\n') && container.querySelectorAll('svg').length >= 3) {
          break;
        }
        container = container.parentElement;
      }

      const text = container ? container.innerText : "";
      results.push({
        href,
        textSnippet: text.slice(0, 300).replace(/\\n+/g, ' --- ')
      });
    }

    return results;
  })()`);

  console.log("Found post links and snippets:", JSON.stringify(data, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
