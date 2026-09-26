import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function testAttachMedia() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Clicking Attach media button...");
  await pool.evaluate(wsUrl, `(() => {
    const btn = document.querySelector('[aria-label="Attach media"]');
    if (btn) {
      console.log("Found attach media button, clicking...");
      btn.click();
    }
  })()`);

  await human.sleep(1000, 1500);

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInputs: any = await pool.send(wsUrl, "DOM.querySelectorAll", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });
  console.log("File inputs found after click:", fileInputs?.nodeIds?.length || 0, fileInputs?.nodeIds);
}

testAttachMedia().catch(console.error);
