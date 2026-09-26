import { CdpSessionPool } from "./src/cdp-session-pool.js";
import { HumanInteractionEngine } from "./src/human-interaction-engine.js";

async function checkReplyUpload() {
  const pool = CdpSessionPool.getInstance();
  const human = new HumanInteractionEngine();

  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  if (!t) throw new Error("No threads tab");
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Current page:", t.url);
  // Focus or click reply
  const clicked = await pool.evaluate(wsUrl, `(() => {
    let ed = document.querySelector('[contenteditable="true"]');
    if (!ed) {
      const trigger = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
        const txt = (e.innerText || '').trim();
        return txt.startsWith("Reply to") || txt === "Reply";
      });
      if (trigger) {
        trigger.click();
        return "clicked trigger";
      }
    }
    return ed ? "found ed" : "none";
  })()`);
  console.log("Trigger result:", clicked);
  await human.sleep(1500, 2000);

  const doc: any = await pool.send(wsUrl, "DOM.getDocument", { depth: -1 });
  const fileInputs: any = await pool.send(wsUrl, "DOM.querySelectorAll", {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });
  console.log("File inputs found:", fileInputs?.nodeIds?.length || 0);

  const icons: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('svg, button, div[role="button"]')).map(e => ({
      tag: e.tagName,
      aria: e.getAttribute('aria-label'),
      text: (e.innerText || '').slice(0, 30)
    })).filter(x => x.aria && (x.aria.includes('Attach') || x.aria.includes('media') || x.aria.includes('image') || x.aria.includes('file') || x.aria.includes('video')));
  })()`);
  console.log("Attachment icons:", JSON.stringify(icons, null, 2));
}

checkReplyUpload().catch(console.error);
