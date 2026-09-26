import { CdpSessionPool } from "./src/cdp-session-pool.js";

async function run() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Navigating to https://www.threads.com/@jangtrinhsg/post/Ddm6s5pk6ZN");
  await pool.send(wsUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg/post/Ddm6s5pk6ZN" });
  await new Promise(r => setTimeout(r, 4000));

  const info: any = await pool.evaluate(wsUrl, `(() => {
    const posts = Array.from(document.querySelectorAll("div[data-pressable-container='true'], article")).map((el, i) => {
      const text = (el.innerText || "").trim();
      const links = Array.from(el.querySelectorAll("a")).map(a => ({ href: a.href, text: a.innerText }));
      return { idx: i, text: text.slice(0, 300), links };
    });
    return {
      currentUrl: window.location.href,
      count: posts.length,
      hasClock: document.body.innerText.includes("Virtual Clock"),
      hasGithub: document.body.innerText.includes("github.com/jangtrinh/design-os-svg-animation"),
      posts
    };
  })()`);

  console.log("Part 3 info:", JSON.stringify(info, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
