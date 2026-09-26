import * as path from "node:path";
import * as fs from "node:fs";
import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  const videoInfo: any = await pool.evaluate(wsUrl, `(() => {
    const articles = Array.from(document.querySelectorAll("article, div[data-pressable-container='true']"));
    const last = articles[articles.length - 1];
    const v = last ? last.querySelector("video") : null;
    return {
      src: v ? v.src : null,
      currentSrc: v ? v.currentSrc : null,
      poster: v ? v.poster : null,
      innerText: last ? last.innerText : null
    };
  })()`);

  console.log("Last post video info:", JSON.stringify(videoInfo, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
