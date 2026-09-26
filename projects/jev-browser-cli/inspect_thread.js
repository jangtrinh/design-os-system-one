import { CdpSessionPool } from "./dist/cdp-session-pool.js";
import fs from "fs";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const wsUrl = "ws://127.0.0.1:9222/devtools/page/A97557FB7FA22D71C49FD5C106C49D76";
  const url = process.argv[2] || "https://www.threads.com/@_ngthlnh/post/DbsSbcUGSmI";
  
  console.log("Navigating to:", url);
  await pool.evaluate(wsUrl, `window.location.href = ${JSON.stringify(url)}`);
  await new Promise(r => setTimeout(r, 4500));
  
  const data = await pool.evaluate(wsUrl, `(() => {
    const articles = Array.from(document.querySelectorAll('article, div[data-pressable-container="true"]'));
    return articles.map((a, i) => ({
      index: i,
      author: Array.from(a.querySelectorAll('a')).map(l => l.href).find(h => h.includes('/@'))?.split('/@')[1]?.split('/')[0] || 'unknown',
      text: (a.innerText || '').slice(0, 200).split(String.fromCharCode(10)).join(' ')
    }));
  })()`);
  
  console.log("Articles:", JSON.stringify(data, null, 2));
  
  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/thread-inspect.png", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to thread-inspect.png");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
