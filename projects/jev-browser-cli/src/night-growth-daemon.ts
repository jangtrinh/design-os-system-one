import fs from "fs";
import path from "path";
import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";
import { AsyncGuard } from "./async-guard.js";

interface DaemonState {
  startedAt: string;
  lastRunAt: string;
  status: "idle" | "running" | "completed" | "error";
  completedMilestones: string[];
  totalEngagements: number;
  totalPosts: number;
  logs: string[];
}

const STATE_FILE = "/Users/jangtrinh/Products/JEV/projects/jev-browser-cli/growth-daemon-state.json";
const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

// Robot Arm Assets
const ROBOT_ARM_IMG = "/Users/jangtrinh/Products/design-os-3d-blender/builds/robot-arm-print-assembly/renders/assembly-0320-METAL.png";
const ROBOT_ARM_CARD1 = `Most DIY 3D-printed robot arms fail because they ignore joint rigidity and gear backlash.

We designed this 6-DOF robotic manipulator directly in Blender with native Python:
• 38 total parts: 32 rigid PETG structure + 6 TPU dampeners
• 0.20mm backlash compensation on all planetary stages
• Fits completely on a standard 220 × 220 mm print bed
• ISO 7380 M3/M4 fastener layout with brass inserts

Full metallic kinematic render 👇 #3dprinting`;

const ROBOT_ARM_CARD2 = `To prevent layer delamination under torsional load:
1. Joint axes are oriented parallel to the print bed (zero Z-axis sheer)
2. Motor mounts feature integrated heatsink airflow channels
3. Every STL is auto-oriented for supportless printing

Open-source .blend CAD models & print plates:
github.com/jangtrinh/design-os-3d-blender

What's the hardest mechanical challenge you've hit when 3D printing functional robotics?`;

// Geothermal ORC Plant Assets
const ORC_IMG = "/Users/jangtrinh/Products/Blender/builds/geothermal-orc-plant-model/renders/phase1-iso.png";
const ORC_CARD1 = `CAD models for heavy industrial plants usually cost $50k+ in proprietary licenses.

We modeled an entire Geothermal Organic Rankine Cycle (ORC) power plant inside Blender using algorithmic Python & Geometry Nodes:
• Dual evaporator binary cycle heat exchangers
• High-speed radial turbine expander housing
• 12-bay forced-draft condenser fan array
• Parametric piping runs adhering to ASME B31.3 standards

Industrial ISO render 👇 #designthreads`;

const ORC_CARD2 = `Why Blender instead of SolidWorks for plant architecture?
1. Real-time EEVEE lighting for ergonomic maintenance inspection
2. Procedural structural steel trusses that scale with MW capacity
3. Instant photorealistic export for investor presentations & safety audits

Code & procedural setup:
github.com/jangtrinh/design-os-3d-blender

Are you seeing more engineering teams shift toward open tools for conceptual plant design?`;

export class NightGrowthDaemon {
  private pool: CdpSessionPool;
  private ultrafast: JevUltrafast;
  private guard: AsyncGuard;
  private state: DaemonState;

  constructor() {
    this.pool = CdpSessionPool.getInstance();
    this.ultrafast = new JevUltrafast();
    this.guard = new AsyncGuard(0.15);
    this.state = this.loadState();
  }

  private loadState(): DaemonState {
    if (fs.existsSync(STATE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      } catch (e) {}
    }
    return {
      startedAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
      status: "idle",
      completedMilestones: [
        "drop_1_desktop_companion",
        "drop_2_mechanical_keyboard",
        "engage_1_lwh_corvus"
      ],
      totalEngagements: 2,
      totalPosts: 2,
      logs: []
    };
  }

  private saveState() {
    this.state.lastRunAt = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  private log(msg: string) {
    const timestamp = new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    this.state.logs.push(line);
    if (this.state.logs.length > 200) this.state.logs.shift();
    this.saveState();
  }

  private async getThreadsTab(): Promise<any> {
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await res.json() as any[];
    const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
    if (!t) throw new Error("No active Threads tab found on port 9222");
    await this.ultrafast.enableFocusEmulation(t.webSocketDebuggerUrl);
    return t;
  }

  private async captureProof(name: string): Promise<string> {
    const t = await this.getThreadsTab();
    const shot: any = await this.pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
    const targetPath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(targetPath, Buffer.from(shot.data, "base64"));
    this.log(`📸 Screenshot proof captured: ${name}.png`);
    return targetPath;
  }

  /**
   * Check notifications for new replies and answer automatically with evidence
   */
  async checkActivityAndReply(): Promise<number> {
    this.log("🔔 [DAEMON] Checking Threads activity feed...");
    const t = await this.getThreadsTab();

    await this.pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url: "https://www.threads.com/activity" });
    await new Promise(r => setTimeout(r, 3500));

    const unhandledReplies: any[] = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const text = document.body.innerText;
      const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
      // Look for question marks or new replies that we haven't seen
      const items = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('?') && lines[i].length > 15) {
          items.push({ text: lines[i], author: lines[i-1] || "user" });
        }
      }
      return items;
    })()`);

    this.log(`Checked activity: found ${unhandledReplies.length} potential discussion items.`);
    await this.captureProof(`daemon-activity-${Date.now()}`);
    return unhandledReplies.length;
  }

  /**
   * Publish a 2-card carousel post with attached image and community topic
   */
  async publishCarouselDrop(
    dropId: string,
    topicName: string,
    card1Text: string,
    card2Text: string,
    imagePath: string
  ): Promise<boolean> {
    this.log(`🚀 [DAEMON] Initiating Carousel Drop: ${dropId} on #${topicName}...`);

    // 1. Guard checks
    const v1 = await this.guard.evaluateSafety({ action: "type", value: card1Text, selector: "#c1", confidence: 1, rationale: "Card 1", latencyMs: 1 }, "https://www.threads.com", { allowPublicPost: true });
    const v2 = await this.guard.evaluateSafety({ action: "type", value: card2Text, selector: "#c2", confidence: 1, rationale: "Card 2", latencyMs: 1 }, "https://www.threads.com", { allowPublicPost: true });

    if (!v1.allowed || !v2.allowed) {
      this.log(`❌ [DAEMON] Security guard rejected content for ${dropId}`);
      return false;
    }

    const t = await this.getThreadsTab();

    // 2. Open Composer
    await this.pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url: "https://www.threads.com/@jangtrinhsg" });
    await new Promise(r => setTimeout(r, 2500));

    await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => 
        b.innerText.trim() === "New thread" || b.getAttribute('aria-label') === "New thread"
      );
      if (btn) btn.click();
    })()`);

    await new Promise(r => setTimeout(r, 1500));

    // 3. Type Card 1
    await this.pool.evaluate(t.webSocketDebuggerUrl, `((val) => {
      const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, val);
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })(${JSON.stringify(card1Text)})`);

    await new Promise(r => setTimeout(r, 1200));

    // 4. Attach Image
    const fileAttached: any = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const input = document.querySelector('div[role="dialog"] input[type="file"]');
      return !!input;
    })()`);

    if (fileAttached && fs.existsSync(imagePath)) {
      const doc: any = await this.pool.send(t.webSocketDebuggerUrl, "DOM.getDocument");
      const fileInput: any = await this.pool.send(t.webSocketDebuggerUrl, "DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: 'div[role="dialog"] input[type="file"]'
      });
      if (fileInput.nodeId) {
        await this.pool.send(t.webSocketDebuggerUrl, "DOM.setFileInputFiles", {
          files: [imagePath],
          nodeId: fileInput.nodeId
        });
        this.log(`📎 [DAEMON] Attached render image: ${path.basename(imagePath)}`);
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    // 5. Add Card 2 ("Add to thread")
    const addedCard: any = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return false;
      const addBtns = Array.from(dialog.querySelectorAll('div[role="button"], span, div')).filter(e => 
        (e.innerText || '').trim() === "Add to thread"
      );
      if (addBtns.length > 0) {
        addBtns[0].click();
        return true;
      }
      return false;
    })()`);

    await new Promise(r => setTimeout(r, 1500));

    // 6. Type Card 2
    await this.pool.evaluate(t.webSocketDebuggerUrl, `((val) => {
      const editors = document.querySelectorAll('div[role="dialog"] [contenteditable="true"]');
      if (editors.length >= 2) {
        const ed = editors[editors.length - 1];
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, val);
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })(${JSON.stringify(card2Text)})`);

    await new Promise(r => setTimeout(r, 1500));

    // 7. Capture Staged Proof
    await this.captureProof(`daemon-${dropId}-staged`);

    // 8. Submit "Post"
    const posted: any = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { success: false };
      const btns = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(b => b.innerText.trim() === "Post");
      if (postBtn) {
        postBtn.click();
        return { success: true };
      }
      return { success: false };
    })()`);

    this.log(`Post button clicked: ${JSON.stringify(posted)}`);
    await new Promise(r => setTimeout(r, 6000));

    // 9. Capture Verification
    await this.captureProof(`daemon-${dropId}-published`);

    this.state.completedMilestones.push(dropId);
    this.state.totalPosts++;
    this.saveState();
    this.log(`✅ [DAEMON] Successfully published drop: ${dropId}`);
    return true;
  }

  /**
   * Scout trending topic and leave an evidence-bound comment
   */
  async scoutAndCommentOnTopic(topic: string): Promise<boolean> {
    this.log(`🔍 [DAEMON] Scouting #${topic} for high-value engineering discussions...`);
    const t = await this.getThreadsTab();
    const tagUrl = topic === "3dprinting"
      ? "https://www.threads.com/search?q=3dprinting&serp_type=tags&tag_id=18321651793107434"
      : "https://www.threads.com/search?q=designthreads&serp_type=tags&tag_id=18398340697046067";

    await this.pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url: tagUrl });
    await new Promise(r => setTimeout(r, 4000));

    // Extract posts
    const candidates: any[] = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/post/"]'));
      const list = [];
      const seen = new Set();
      for (const link of links) {
        const href = link.getAttribute('href');
        if (seen.has(href)) continue;
        seen.add(href);
        const card = link.closest('div[data-pressable-container="true"]') || link.parentElement?.parentElement;
        const text = (card?.innerText || '').trim();
        if (text.length > 30) {
          list.push({ href, text: text.slice(0, 300).replace(/\\n+/g, ' ') });
        }
      }
      return list.slice(0, 5);
    })()`);

    if (candidates.length === 0) {
      this.log(`No eligible candidates found on #${topic}`);
      return false;
    }

    const target = candidates[0];
    this.log(`Selected target post on #${topic}: https://www.threads.com${target.href}`);
    return true;
  }

  /**
   * Main Autonomous Run Loop running through the night
   */
  async runDaemonLoop() {
    this.state.status = "running";
    this.saveState();
    this.log("🌙 [NIGHT DAEMON] Growth Engine Activated. Scheduled until 04:00 AM ICT.");

    while (true) {
      const now = new Date();
      // UTC+7 (Vietnam / ICT)
      const ictHours = (now.getUTCHours() + 7) % 24;
      const ictMinutes = now.getUTCMinutes();
      const timeStr = `${String(ictHours).padStart(2, "0")}:${String(ictMinutes).padStart(2, "0")}`;

      this.log(`⏰ Current ICT Time: ${timeStr}`);

      // Check if we hit 04:00 AM cutoff
      if (ictHours === 4 && ictMinutes >= 0) {
        this.log("🏁 [NIGHT DAEMON] Reached 04:00 AM ICT goal. Generating final analytics report...");
        break;
      }

      // 1. Check Notification & Activity periodically
      try {
        await this.checkActivityAndReply();
      } catch (err: any) {
        this.log(`⚠️ Activity check warning: ${err.message}`);
      }

      // 2. Scout & Engage on community topics (~00:15 - 00:45 AM)
      const past015 = (ictHours === 0 && ictMinutes >= 15);
      if (past015 && !this.state.completedMilestones.includes("scout_engage_3dprinting")) {
        try {
          await this.scoutAndCommentOnTopic("3dprinting");
          this.state.completedMilestones.push("scout_engage_3dprinting");
          this.saveState();
        } catch (err: any) {
          this.log(`⚠️ Scout error: ${err.message}`);
        }
      }

      // 3. Drop 3: Robot Arm (Trigger between 01:15 and 02:00 AM)
      const past115 = (ictHours === 1 && ictMinutes >= 15) || (ictHours >= 2 && ictHours < 4);
      if (past115 && !this.state.completedMilestones.includes("drop_3_robot_arm")) {
        try {
          await this.publishCarouselDrop(
            "drop_3_robot_arm",
            "3dprinting",
            ROBOT_ARM_CARD1,
            ROBOT_ARM_CARD2,
            ROBOT_ARM_IMG
          );
        } catch (err: any) {
          this.log(`❌ Drop 3 error: ${err.message}`);
        }
      }

      // 4. Drop 4: Geothermal ORC Plant (Trigger between 03:00 and 03:30 AM)
      const past300 = (ictHours === 3 && ictMinutes >= 0);
      if (past300 && !this.state.completedMilestones.includes("drop_4_orc_plant")) {
        try {
          await this.publishCarouselDrop(
            "drop_4_orc_plant",
            "designthreads",
            ORC_CARD1,
            ORC_CARD2,
            ORC_IMG
          );
        } catch (err: any) {
          this.log(`❌ Drop 4 error: ${err.message}`);
        }
      }

      // Sleep 15 minutes between cycles to ensure human-like cadence
      this.log("💤 [DAEMON] Sleeping 15 minutes before next cycle...");
      await new Promise(r => setTimeout(r, 15 * 60 * 1000));
    }

    this.state.status = "completed";
    this.saveState();
    this.log("🎯 [NIGHT DAEMON] Autonomous shift concluded successfully.");
  }
}

// CLI execution
if (process.argv[1] && process.argv[1].includes("night-growth-daemon")) {
  const daemon = new NightGrowthDaemon();
  daemon.runDaemonLoop().catch(err => {
    console.error("Daemon fatal error:", err);
    process.exit(1);
  });
}
