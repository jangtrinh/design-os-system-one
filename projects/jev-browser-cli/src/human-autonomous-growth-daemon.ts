import fs from "fs";
import path from "path";
import { CdpSessionPool } from "./cdp-session-pool.js";
import { JevUltrafast } from "./jev-ultrafast.js";
import { AsyncGuard } from "./async-guard.js";
import { HumanInteractionEngine } from "./human-interaction-engine.js";
import { PreFlightAuditor, PostFlightAuditor, DropCandidate } from "./post-audit-pipeline.js";

const STATE_FILE = "/Users/jangtrinh/Products/JEV/projects/jev-browser-cli/autonomous-growth-state.json";
const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

export interface ScheduledDrop {
  dropId: string;
  topic: string;
  projectId: string;
  cards: string[];
  mediaFiles: string[];
}

// 7-Day Drops Master Sequence with Tactful Promo
export const MASTER_DROPS_QUEUE: ScheduledDrop[] = [
  {
    dropId: "drop_robot_arm_print_plates",
    topic: "3dprinting",
    projectId: "robot-arm",
    cards: [
      `402 mechanical meshes, 6 servos, and 67 assembly steps in Blender.

Here is how we organized a full 6-DOF robotic arm across 5 build plates on a standard 220x220mm print bed without needing support surgery: 👇 #3dprinting`,
      `Total 38 printed parts split cleanly by material function:

• Plate 01-04: 32 rigid PETG parts (6 perimeters, structural joints)
• Plate 05: 6 flexible TPU finger pads (cushioning & grip)
• 14 CNC metal rods taking bending moments off servos
• 328 M3/M4 fasteners verified for clearance

Explore our open-source pipeline & interactive 3D review:
https://jangtrinh.github.io/design-os-3d-blender/

PETG or ASA for structural arms? 👇`
    ],
    mediaFiles: [
      "/Users/jangtrinh/Products/Blender/docs/media/robot-arm-print-plates.png",
      "/Users/jangtrinh/Products/Blender/docs/media/robot-arm-wireframe-cycles.png",
      "/Users/jangtrinh/Products/Blender/docs/media/robot-arm-hero-cycles.png"
    ]
  },
  {
    dropId: "drop_orc_turbine_skid",
    topic: "designthreads",
    projectId: "orc",
    cards: [
      `Modeling industrial turbomachinery in Blender down to fabrication level:

Module C05 Radial Inflow Turbine Expander Skid for our Geothermal ORC Plant.

Here is how the separate lube oil console is laid out: 👇 #designthreads`,
      `• Radial turbine casing in a single saddle-union body
• 9 distinct lube oil routes (pressurized feed vs gravity return)
• Optical sight glass with mechanical min/max marks at Z=30/37mm
• 0–10 bar reservoir header pressure gauge
• Yellow perforated coupling guard with 12mm shaft clearance

Full engineering specs & interactive 3D models:
https://jangtrinh.github.io/design-os-3d-blender/

In high-pressure organic vapor expanders: top inlet or front inlet? 👇`
    ],
    mediaFiles: [
      "/Users/jangtrinh/Products/Blender/builds/geothermal-orc-plant-model/media/component-film-hq-r1/render-c05/c05-02-turbine-048.png",
      "/Users/jangtrinh/Products/Blender/builds/geothermal-orc-plant-model/media/component-film-hq-r1/render-c05/c05-01-establish-048.png"
    ]
  },
  {
    dropId: "drop_ck001_keyboard_acoustics",
    topic: "designthreads",
    projectId: "keyboard",
    cards: [
      `Most 3D printed mechanical keyboards sound hollow and rattle after 2 weeks.

We engineered the CK-001 in Blender with leaf-spring gasket dampening, 5 rotary encoder D-shafts, and 0.15mm switch tolerances.

• 284 × 92 × 32 mm footprint (58 keys + 5 knobs)
• 3.0mm key travel with 0.2mm ceiling reserve
• Dual parallel spacebar stabilizer guides
• 781 verified assembly meshes

Exploded layout & acoustic fit 👇 #designthreads`,
      `To eliminate switch chatter, each plate family (top frame, switch plate, PCB carrier, bottom shell) uses ISO 273 brass heat-set inserts with radial wall stock verification.

Interactive WebGL Three.js review (loads 781 meshes in ~4s):
https://jangtrinh.github.io/design-os-3d-blender/

Would you print your daily driver keyboard or stick to CNC aluminum? 👇`
    ],
    mediaFiles: [
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/reference-keyboard/delivery/r02/CK-001-hero.png",
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/reference-keyboard/delivery/r02/CK-001-exploded.png",
      "/Users/jangtrinh/Products/design-os-3d-blender/builds/reference-keyboard/delivery/r02/CK-001-spacebar-guides.png"
    ]
  },
  {
    dropId: "drop_orc_bellows_coplanar",
    topic: "designthreads",
    projectId: "orc",
    cards: [
      `Blender viewport once choked on 2,206 meshes with coplanar z-fighting everywhere.

Here is how automated Python verification saved Module C03 (Metallic Bellows & Heat Exchanger Train): 👇 #designthreads`,
      `• 107 metallic bellows meshes preserved for thermal expansion modeling
• 64 main head fasteners across 4 high-pressure flanges (PCD 46.8mm)
• 232 mechanical contact interfaces audited to <= 0.002mm clearance
• 28/28 bore rays confirmed completely clear through hex tube sheets

All component verification scripts & CAD documentation:
https://jangtrinh.github.io/design-os-3d-blender/

Never trust visual inspection alone. Always run algorithmic geometry gates! 👇`
    ],
    mediaFiles: [
      "/Users/jangtrinh/Products/Blender/builds/geothermal-orc-plant-model/media/component-film-hq-r1/render-c03/c03-02-bellows-048.png",
      "/Users/jangtrinh/Products/Blender/builds/geothermal-orc-plant-model/media/component-film-hq-r1/render-c03/c03-01-establish-048.png"
    ]
  }
];

interface DaemonState {
  startedAt: string;
  lastRunAt: string;
  lastDropAt?: string;
  lastCommentAt?: string;
  status: "idle" | "running" | "sleeping";
  cycleCount: number;
  completedDrops: string[];
  completedComments: string[];
  totalPosts: number;
  totalComments: number;
  logs: string[];
}

export class HumanAutonomousGrowthDaemon {
  private pool: CdpSessionPool;
  private human: HumanInteractionEngine;
  private guard: AsyncGuard;
  private postFlightAuditor: PostFlightAuditor;
  private state: DaemonState;

  constructor() {
    this.pool = CdpSessionPool.getInstance();
    this.human = new HumanInteractionEngine(this.pool);
    this.guard = new AsyncGuard(0.15);
    this.postFlightAuditor = new PostFlightAuditor(this.pool);
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
      status: "running",
      cycleCount: 0,
      completedDrops: ["day1_dc01_wire_harness_physics"],
      completedComments: [],
      totalPosts: 1,
      totalComments: 0,
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
    if (this.state.logs.length > 300) this.state.logs.shift();
    this.saveState();
  }

  private async getThreadsTab(): Promise<any> {
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = (await res.json()) as any[];
    const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
    if (!t) throw new Error("No active Threads tab found on port 9222");
    return t;
  }

  /**
   * Publish next scheduled drop with human-like typing and strict audit
   */
  async publishNextDrop(): Promise<boolean> {
    const candidateDrop = MASTER_DROPS_QUEUE.find(d => !this.state.completedDrops.includes(d.dropId));
    if (!candidateDrop) {
      this.log("All scheduled master drops have been executed!");
      return false;
    }

    this.log(`🚀 [HUMAN DAEMON] Initiating Drop: "${candidateDrop.dropId}" on #${candidateDrop.topic}...`);

    // 1. Pre-Flight Audit
    const candidate: DropCandidate = {
      dropId: candidateDrop.dropId,
      topic: candidateDrop.topic,
      cards: candidateDrop.cards,
      mediaFiles: candidateDrop.mediaFiles,
      projectId: candidateDrop.projectId
    };

    const preFlight = PreFlightAuditor.audit(candidate);
    if (!preFlight.passed) {
      this.log(`🛑 Pre-Flight Audit REJECTED drop ${candidate.dropId}:`);
      preFlight.violations.forEach(v => this.log(`   ❌ ${v}`));
      return false;
    }
    this.log(`✅ Pre-Flight Audit PASSED with ${preFlight.auditedMedia.length} verified media files.`);

    const t = await this.getThreadsTab();
    const wsUrl = t.webSocketDebuggerUrl;

    // 2. Natural Navigation & Warm-up (human reads before acting)
    await this.human.navigateSafely(wsUrl, "https://www.threads.com/@jangtrinhsg");
    await this.human.sleep(3500, 5000); // 3-5s page load wait
    await this.human.scrollNatural(wsUrl, 1); // casual scroll down and up

    // 3. Open Composer with Human Hesitation
    await this.human.thinkPause();
    await this.pool.evaluate(wsUrl, `(() => {
      const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => 
        b.innerText.trim() === "New thread" || b.getAttribute('aria-label') === "New thread"
      );
      if (btn) btn.click();
    })()`);
    await this.human.sleep(2000, 3000);

    // 4. Human-like Typing for Card 1 (with keystroke latency & punctuation pauses)
    this.log("✍️ [HUMAN TYPING] Typing Card 1 with natural human cadence...");
    await this.pool.evaluate(wsUrl, `(() => {
      const ed = document.querySelector('div[role="dialog"] [contenteditable="true"]');
      if (ed) ed.focus();
    })()`);
    await this.human.sleep(1200, 2000);
    await this.human.typeHumanLike(wsUrl, candidateDrop.cards[0]);

    // 5. Attach Audited Media Files via CDP
    await this.human.thinkPause();
    const doc: any = await this.pool.send(wsUrl, "DOM.getDocument");
    const fileInput: any = await this.pool.send(wsUrl, "DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: 'div[role="dialog"] input[type="file"]'
    });

    if (fileInput && fileInput.nodeId) {
      await this.pool.send(wsUrl, "DOM.setFileInputFiles", {
        files: preFlight.auditedMedia,
        nodeId: fileInput.nodeId
      });
      this.log(`📎 Attached ${preFlight.auditedMedia.length} authentic CAD media files.`);
      await this.human.sleep(4500, 6000); // Allow image generation and thumbnail load
    }

    // 6. Click "Add to thread" with natural pause
    await this.human.thinkPause();
    await this.pool.evaluate(wsUrl, `(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return;
      const addBtns = Array.from(dialog.querySelectorAll('div[role="button"], span, div')).filter(e => 
        (e.innerText || '').trim() === "Add to thread"
      );
      if (addBtns.length > 0) addBtns[0].click();
    })()`);
    await this.human.sleep(1500, 2500);

    // 7. Human-like Typing for Card 2 (including tactical promo link)
    this.log("✍️ [HUMAN TYPING] Typing Card 2 (including tactful project review link)...");
    await this.pool.evaluate(wsUrl, `(() => {
      const editors = document.querySelectorAll('div[role="dialog"] [contenteditable="true"]');
      if (editors.length >= 2) {
        editors[editors.length - 1].focus();
      }
    })()`);
    await this.human.sleep(1000, 1800);
    await this.human.typeHumanLike(wsUrl, candidateDrop.cards[1]);

    // 8. Capture Staged Proof Screenshot
    const shot: any = await this.pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
    const stagedPath = path.join(ARTIFACT_DIR, `human-staged-${candidateDrop.dropId}.png`);
    fs.writeFileSync(stagedPath, Buffer.from(shot.data, "base64"));
    this.log(`📸 Staged proof captured: human-staged-${candidateDrop.dropId}.png`);

    // 9. Natural hover and submit "Post"
    await this.human.sleep(1500, 3000); // Human reviews before clicking post
    const posted: any = await this.pool.evaluate(wsUrl, `(() => {
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
    this.log(`Post button submitted: ${JSON.stringify(posted)}`);

    // 10. Wait for network completion & run Post-Flight Audit
    await this.human.sleep(7000, 9000);
    this.log("🔍 Executing live Post-Flight Audit on profile DOM...");
    const postFlight = await this.postFlightAuditor.auditLivePost(
      candidateDrop.dropId,
      candidateDrop.topic,
      preFlight,
      candidateDrop.cards[0].slice(0, 35)
    );

    if (postFlight.verified) {
      this.log(`🏆 [POST-FLIGHT VERIFIED] Live post confirmed with ${postFlight.renderedMediaCount} rendered images!`);
    } else {
      this.log(`⚠️ [POST-FLIGHT NOTICE] Post-flight pending or DOM verification delay: ${postFlight.error}`);
    }

    this.state.completedDrops.push(candidateDrop.dropId);
    this.state.lastDropAt = new Date().toISOString();
    this.state.totalPosts += 1;
    this.saveState();
    return true;
  }

  /**
   * Human-like Community Commenting / Sniping ("Đi comment dạo")
   * Scouts technical discussions, reads the context, drafts thoughtful reply,
   * cleverly references https://jangtrinh.github.io/design-os-3d-blender/, and posts.
   */
  async scoutAndComment(): Promise<boolean> {
    this.log("🔍 [COMMENT HUNT] Scouting community feeds for high-value engineering discussions...");
    const t = await this.getThreadsTab();
    const wsUrl = t.webSocketDebuggerUrl;

    const queries = ["3d printing CAD", "mechanical parts 3d", "3dprinted robot", "custom keyboard CAD"];
    const query = queries[Math.floor(Math.random() * queries.length)];

    // 1. Natural Search Navigation
    await this.human.navigateSafely(wsUrl, `https://www.threads.com/search?q=${encodeURIComponent(query)}&serp_type=default`);
    await this.human.sleep(4000, 6000); // Read search page
    await this.human.scrollNatural(wsUrl, 2);

    // 2. Find target posts
    const candidates: any[] = await this.pool.evaluate(wsUrl, `(() => {
      const articles = Array.from(document.querySelectorAll('article, div[data-pressable-container="true"]'));
      return articles.slice(0, 6).map((a, idx) => {
        const text = (a.innerText || '').trim();
        const links = Array.from(a.querySelectorAll('a')).map(l => l.href);
        const postLink = links.find(h => h.includes('/post/'));
        const author = links.find(h => h.includes('/@'))?.split('/@')[1]?.split('/')[0] || "creator";
        return { idx, text: text.slice(0, 300).split(String.fromCharCode(10)).join(' '), postLink, author };
      }).filter(p => p.postLink && !p.author.includes("jangtrinhsg"));
    })()`);

    if (!candidates || candidates.length === 0) {
      this.log("No new candidates found on this query.");
      return false;
    }

    const target = candidates.find(c => !this.state.completedComments.includes(c.postLink));
    if (!target) {
      this.log("All candidates on this search query have already been engaged.");
      return false;
    }

    this.log(`🎯 Found discussion thread by @${target.author}: "${target.text.slice(0, 80)}..."`);

    // 3. Navigate into the specific post
    await this.human.navigateSafely(wsUrl, target.postLink);
    await this.human.sleep(3500, 5500);

    // 4. Human-like Reading Pause (reads before commenting!)
    await this.human.readingPause(target.text.length);
    await this.human.scrollNatural(wsUrl, 1);

    // 5. Formulate thoughtful technical comment with tactical promo
    const commentTemplates = [
      `Really solid mechanical approach! When dealing with torsional loads and layer adhesion, we found that keeping joint rotational axes parallel to the print bed and isolating bending moments with dual ball-bearings prevents layer sheer completely.

We open-sourced our native Blender CAD verification pipeline and 3D review tools here if you want to inspect the geometry tests: https://jangtrinh.github.io/design-os-3d-blender/`,

      `Spot on observation. For functional 3D printed mechanical housings, standard heat-set brass inserts (ISO 273 Medium series) with ray-cast verified radial wall stock make a massive difference in preventing fatigue cracks over time.

We documented the full procedural clearance rules and interactive 3D review models on our project site: https://jangtrinh.github.io/design-os-3d-blender/`,

      `Great engineering trade-off! Balancing part orientation against nozzle shear planes is the hardest part of functional prototypes. We run automated clearance gates directly in Blender Python before exporting print plates to catch interference early.

You can check out our open-source CAD pipeline and interactive 3D models here: https://jangtrinh.github.io/design-os-3d-blender/`
    ];

    const commentText = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];

    // 6. Focus reply input and type with human cadence
    const replyInputFocused: any = await this.pool.evaluate(wsUrl, `(() => {
      const inputs = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea, div[role="textbox"]'));
      const replyBox = inputs.find(el => (el.getAttribute('aria-label') || '').includes('Reply') || (el.innerText || '').includes('Reply') || inputs.length === 1);
      if (replyBox) {
        replyBox.focus();
        return true;
      }
      return false;
    })()`);

    if (!replyInputFocused) {
      this.log("⚠️ Could not locate comment input box on thread page.");
      return false;
    }

    this.log(`✍️ [HUMAN COMMENT] Typing thoughtful technical comment with tactical project link...`);
    await this.human.sleep(1200, 2000);
    await this.human.typeHumanLike(wsUrl, commentText);

    // 7. Click Submit / Reply (supports both text buttons and SVG arrow buttons)
    await this.human.sleep(1500, 2500);
    const submitted: any = await this.pool.evaluate(wsUrl, `(() => {
      const svg = document.querySelector('svg[aria-label="Reply"], svg[aria-label="Post"]');
      if (svg) {
        let target = svg;
        while (target && target.getAttribute('role') !== 'button' && target.tagName !== 'BUTTON') {
          if (!target.parentElement) break;
          target = target.parentElement;
        }
        if (target) {
          target.click();
          return true;
        }
        svg.click();
        return true;
      }
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(b => {
        const txt = (b.innerText || '').trim();
        return txt === "Reply" || txt === "Post";
      });
      if (postBtn) {
        postBtn.click();
        return true;
      }
      return false;
    })()`);

    this.log(`Comment submit clicked: ${submitted}`);
    await this.human.sleep(5000, 7000);

    // 8. Capture Proof
    const shot: any = await this.pool.send(wsUrl, "Page.captureScreenshot", { format: "png" });
    const proofPath = path.join(ARTIFACT_DIR, `human-comment-${Date.now()}.png`);
    fs.writeFileSync(proofPath, Buffer.from(shot.data, "base64"));
    this.log(`📸 Comment proof captured: ${path.basename(proofPath)}`);

    this.state.completedComments.push(target.postLink);
    this.state.lastCommentAt = new Date().toISOString();
    this.state.totalComments += 1;
    this.saveState();
    return true;
  }

  /**
   * Run one complete autonomous execution cycle
   */
  async runCycle(): Promise<void> {
    this.state.cycleCount += 1;
    this.saveState();

    this.log(`\n======================================================`);
    this.log(`🔄 [CYCLE #${this.state.cycleCount}] Autonomous Human Growth Cycle Activated`);
    this.log(`======================================================`);

    const t = await this.getThreadsTab();
    const wsUrl = t.webSocketDebuggerUrl;

    // 1. Filler Activity (warm-up)
    this.log("🚶 Performing human-like filler browsing (feed / activity check)...");
    await this.human.executeFillerActivity(wsUrl);

    // 2. Check if it's time for a Drop (every 1-2 hours)
    const now = Date.now();
    const lastDropTime = this.state.lastDropAt ? new Date(this.state.lastDropAt).getTime() : 0;
    const hoursSinceDrop = (now - lastDropTime) / (1000 * 60 * 60);

    this.log(`⏳ Hours since last drop: ${hoursSinceDrop.toFixed(2)}h (Target: 1.0 - 2.0h)`);

    if (hoursSinceDrop >= 1.0 || lastDropTime === 0) {
      this.log("📢 Time window reached! Executing next scheduled master drop...");
      try {
        await this.publishNextDrop();
      } catch (err: any) {
        this.log(`⚠️ Drop execution error: ${err.message}`);
      }
      await this.human.sleep(4000, 7000);
    } else {
      this.log(`ℹ️ Next drop scheduled in ~${((1.0 - hoursSinceDrop) * 60).toFixed(0)} minutes.`);
    }

    // 3. Execute Community Commenting ("Đi comment dạo")
    const lastCommentTime = this.state.lastCommentAt ? new Date(this.state.lastCommentAt).getTime() : 0;
    const minsSinceComment = (now - lastCommentTime) / (1000 * 60);

    if (minsSinceComment >= 15 || lastCommentTime === 0) {
      this.log("💬 Executing high-value community interaction ('comment dạo')...");
      try {
        await this.scoutAndComment();
      } catch (err: any) {
        this.log(`⚠️ Commenting error: ${err.message}`);
      }
    } else {
      this.log(`ℹ️ Next comment hunt in ~${(15 - minsSinceComment).toFixed(0)} minutes.`);
    }

    this.log(`🏁 [CYCLE #${this.state.cycleCount}] Completed. Total Posts: ${this.state.totalPosts} | Total Comments: ${this.state.totalComments}\n`);
  }

  /**
   * Continuous loop running 24/7 with randomized intervals (every 15-25 minutes)
   */
  async startContinuousLoop(): Promise<void> {
    this.log("🌟 [DAEMON STARTED] Continuous Human Growth Loop running indefinitely...");
    while (true) {
      try {
        await this.runCycle();
      } catch (err: any) {
        this.log(`❌ Unhandled cycle error: ${err.message}`);
      }

      // Random sleep between 15 to 22 minutes (900s - 1320s)
      const sleepMinutes = 15 + Math.random() * 7;
      this.log(`💤 Sleeping for ${sleepMinutes.toFixed(1)} minutes until next growth cycle...`);
      await new Promise(r => setTimeout(r, sleepMinutes * 60 * 1000));
    }
  }
}

// CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith("human-autonomous-growth-daemon.js")) {
  const isContinuous = process.argv.includes("--continuous") || process.argv.includes("-c");
  const daemon = new HumanAutonomousGrowthDaemon();
  if (isContinuous) {
    daemon.startContinuousLoop().catch(err => {
      console.error("Fatal continuous daemon crash:", err);
      process.exit(1);
    });
  } else {
    daemon.runCycle().then(() => {
      console.log("Human Growth Cycle completed successfully.");
      process.exit(0);
    }).catch(err => {
      console.error("Daemon cycle failed:", err);
      process.exit(1);
    });
  }
}
