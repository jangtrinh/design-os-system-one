import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function getPostUrl() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  const info: any = await pool.evaluate(wsUrl, `(() => {
    // Find all links on current profile page
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href'),
      text: (a.innerText || '').trim(),
      time: a.querySelector('time')?.getAttribute('datetime')
    })).filter(x => x.href && x.href.includes('/post/'));

    return links;
  })()`);

  console.log("Post links:", JSON.stringify(info, null, 2));

  // Click on the first post link
  if (info && info.length > 0) {
    const postHref = info[0].href;
    console.log("First post URL:", postHref);
    const targetUrl = postHref.startsWith("http") ? postHref : "https://www.threads.com" + postHref;
    console.log("Navigating to post thread:", targetUrl);
    await pool.send(wsUrl, "Page.navigate", { url: targetUrl });
    await human.sleep(4000, 5000);
    console.log("Current post page URL:", await pool.evaluate(wsUrl, "window.location.href"));
  }
}

getPostUrl().catch(console.error);
