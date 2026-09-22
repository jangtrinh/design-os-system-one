import { CdpSessionPool } from "./cdp-session-pool.js";
import fs from "fs";

async function main() {
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab found");

  const pool = CdpSessionPool.getInstance();
  const url = "https://www.threads.com/search?q=3dprinting&serp_type=tags&tag_id=18321651793107434";
  console.log("Navigating to 3D Printing topic:", url);
  await pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url });
  await new Promise(r => setTimeout(r, 4000));

  // Capture screenshot
  const ss: any = await pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 80 });
  const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-3dprinting-tag.png";
  fs.writeFileSync(outPath, Buffer.from(ss.data, "base64"));
  console.log("Screenshot saved to:", outPath);

  // Extract post candidates
  const posts: any = await pool.evaluate(t.webSocketDebuggerUrl, `(() => {
    const articles = Array.from(document.querySelectorAll("article, div[data-pressable-container=true], div[role=article]"));
    return articles.slice(0, 5).map(a => {
      const text = (a.innerText || "").trim();
      const authorMatch = text.split("\\n")[0];
      return {
        preview: text.slice(0, 150),
        fullLength: text.length
      };
    });
  })()`);
  console.log("Found posts:", JSON.stringify(posts, null, 2));
}

main().catch(console.error);
