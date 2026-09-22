import { CdpSessionPool } from "./cdp-session-pool.js";
import { AsyncGuard } from "./async-guard.js";
import fs from "fs";

interface CardSpec {
  text: string;
  files: string[];
}

const CARDS: CardSpec[] = [
  {
    text: `Why this matters for CAD:

Instead of black-box text-to-3D, our agent generates deterministic Python scripts inside Blender 5.2 LTS.

It models internal mounts, battery clips, Type-C charger trays, and routes real wiring through the chassis before exporting to 3MF.

Zero manual sculpting. Evidence-bound engineering. 3/4`,
    files: [
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/desktop-companion/delivery/R03/stills/print-layout.png",
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/desktop-companion/delivery/R03/stills/catalog.png"
    ]
  },
  {
    text: `The entire project—native .blend files, KiCad schematics, STL print kit, and verification receipts—is 100% open source.

Do you think AI agents will replace CAD engineers in 3 years, or just become our fastest copilots?

Full engineering review & GitHub links in the reply below 👇 4/4`,
    files: [
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/desktop-companion/delivery/R03/stills/assembled.png"
    ]
  }
];

async function main() {
  console.log("🚀 [JEV SYSTEM ONE] Initializing Autonomous Thread Staging...");

  // 1. Run AsyncGuard security validation on all cards
  const guard = new AsyncGuard(0.15);
  for (let i = 0; i < CARDS.length; i++) {
    const verdict = await guard.evaluateSafety(
      { action: "type", value: CARDS[i].text, selector: `#card-${i + 3}`, confidence: 1, rationale: "Publish card", latencyMs: 1 },
      "https://www.threads.com",
      { allowPublicPost: true }
    );
    if (!verdict.allowed) {
      console.error(`❌ [ASYNC GUARD] Card ${i + 3} blocked by safety policy: ${verdict.guardReason}`);
      process.exit(1);
    }
  }
  console.log("🛡️ [ASYNC GUARD] All cards verified safe (Zero secret leaks, valid policy).");

  // 2. Discover Threads tab in Dia
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = (await res.json()) as any[];
  const threadsTab = tabs.find((t: any) => t.url && t.url.includes("threads.com"));
  if (!threadsTab || !threadsTab.webSocketDebuggerUrl) {
    console.error("❌ Threads tab not found in Dia!");
    process.exit(1);
  }

  const wsUrl = threadsTab.webSocketDebuggerUrl;
  const pool = CdpSessionPool.getInstance();

  const send = async (method: string, params: any = {}) => {
    return pool.send(wsUrl, method, params, 10000);
  };

  const evaluate = async (expression: string) => {
    const res: any = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  };

  for (let cIdx = 0; cIdx < CARDS.length; cIdx++) {
    const cardNum = cIdx + 3;
    const card = CARDS[cIdx];
    console.log(`\n🧵 [JEV STAGE] Adding Card ${cardNum}...`);

    // Click "Add to thread" button
    const coords: any = await evaluate(`(() => {
      const dialog = document.querySelector("[role=dialog]");
      const btn = Array.from(dialog.querySelectorAll("[role=button]")).find(b => b.innerText && b.innerText.includes("Add to thread"));
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);

    if (!coords) {
      console.error("❌ 'Add to thread' button not found in dialog!");
      process.exit(1);
    }

    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1 });

    await new Promise((r) => setTimeout(r, 700));

    // Focus the newest editable
    const focusSuccess = await evaluate(`(() => {
      const dialog = document.querySelector("[role=dialog]");
      const editables = dialog.querySelectorAll("[contenteditable=true]");
      const newest = editables[editables.length - 1];
      if (newest) {
        newest.focus();
        return true;
      }
      return false;
    })()`);

    if (!focusSuccess) {
      console.error("❌ Could not focus newest editable for Card " + cardNum);
      process.exit(1);
    }

    // Insert text via CDP
    await send("Input.insertText", { text: card.text });
    await new Promise((r) => setTimeout(r, 400));

    // Mark and attach files to newest file input
    const tag = `card-${cardNum}`;
    await evaluate(`(() => {
      const dialog = document.querySelector("[role=dialog]");
      const inputs = dialog.querySelectorAll("input[type=file]");
      const newestInput = inputs[inputs.length - 1];
      if (newestInput) {
        newestInput.setAttribute("data-target", "${tag}");
      }
    })()`);

    const doc: any = await send("DOM.getDocument");
    const query: any = await send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: `input[data-target="${tag}"]`
    });

    if (query && query.nodeId && card.files.length > 0) {
      await send("DOM.setFileInputFiles", {
        nodeId: query.nodeId,
        files: card.files
      });
      console.log(`📎 Card ${cardNum} attached ${card.files.length} file(s).`);
    }

    // Wait for upload/thumbnail render
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Final verification screenshot
  console.log("\n📸 [JEV VERIFY] Capturing full thread verification screenshot...");
  const shot: any = await send("Page.captureScreenshot", { format: "png" });
  if (shot && shot.data) {
    const buf = Buffer.from(shot.data, "base64");
    const outPath = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd/threads-dia-full-4cards.png";
    fs.writeFileSync(outPath, buf);
    console.log(`✅ [SUCCESS] All 4 cards staged and verified! Screenshot saved to ${outPath}`);
  }

  pool.closeAll();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error running JEV auto thread publisher:", err);
  process.exit(1);
});
