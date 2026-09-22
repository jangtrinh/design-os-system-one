import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  console.log("Navigating to search for '3D printing'...");
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", {
    url: "https://www.threads.com/search?q=3D%20printing&serp_type=default"
  });

  await new Promise(r => setTimeout(r, 3500));

  const data: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const postLinks = Array.from(document.querySelectorAll('a[href*="/post/"]'));
    const results = [];
    const seenHrefs = new Set();

    for (const link of postLinks) {
      const href = link.getAttribute('href');
      if (seenHrefs.has(href)) continue;
      seenHrefs.add(href);

      let container = link.closest('div[data-pressable-container="true"]') || link.parentElement;
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

  console.log(`Found ${data.length} search results:`);
  data.forEach((p: any, i: number) => {
    console.log(`[${i + 1}] Link: https://www.threads.com${p.href}`);
    console.log(`    Snippet: ${p.textSnippet}\n`);
  });

  process.exit(0);
}

main().catch(console.error);
