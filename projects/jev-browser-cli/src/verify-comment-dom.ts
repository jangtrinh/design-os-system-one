import { CdpSessionPool } from "./cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");

  const check = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const text = document.body.innerText;
    return {
      hasComment: text.includes("forced Astra to write native Blender Python"),
      hasJang: text.includes("jangtrinhsg"),
      replyCount: (text.match(/\\b\\d+\\s+replies?\\b/i) || [])[0]
    };
  })()`);

  console.log("Check result:", check);
  process.exit(0);
}

main().catch(console.error);
