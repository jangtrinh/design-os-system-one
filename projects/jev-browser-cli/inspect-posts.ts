import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  const urls = [
    "https://www.threads.com/@xunodesign/post/DTVYyFLktwK",
    "https://www.threads.com/@3dworkbench/post/C09n1g5rYoo"
  ];

  for (const url of urls) {
    console.log(`\n========================================`);
    console.log(`Navigating to: ${url}`);
    await human.navigateSafely(wsUrl, url);
    await human.sleep(4000, 5000);

    const postInfo: any = await pool.evaluate(wsUrl, `(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const mainArticle = articles[0] || document.querySelector('div[data-pressable-container="true"]');
      const text = mainArticle ? mainArticle.innerText : '';
      return {
        text: text.slice(0, 600),
        detectedLang: document.documentElement.lang
      };
    })()`);

    console.log(`Language attribute: ${postInfo?.detectedLang}`);
    console.log(`Post text:\n${postInfo?.text}`);
  }
}

main().catch(console.error);
