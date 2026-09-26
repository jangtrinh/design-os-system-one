import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";
const POST2_URL = "https://www.threads.com/@jangtrinhsg/post/Ddm5u-NE1xP";

async function inspectStep3() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log(`Navigating to Post 2: ${POST2_URL}`);
  await pool.send(wsUrl, "Page.navigate", { url: POST2_URL });
  await human.sleep(5000, 6000);

  const info: any = await pool.evaluate(wsUrl, `(() => {
    const expandBtn = document.querySelector('[aria-label="Expand composer"]');
    const editable = document.querySelector('[contenteditable="true"]');
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(i => i.outerHTML);
    return {
      hasExpandBtn: !!expandBtn,
      hasEditable: !!editable,
      fileInputs
    };
  })()`);
  console.log("Inspection info:", JSON.stringify(info, null, 2));

  const shot = await pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "step3-inspect.png"), Buffer.from(shot.data, "base64"));
  console.log("Saved step3-inspect.png");
}

inspectStep3().catch(console.error);
