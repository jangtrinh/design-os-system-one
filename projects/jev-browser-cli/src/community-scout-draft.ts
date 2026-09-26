import path from "path";
import fs from "fs";
import { CdpSessionPool } from "./cdp-session-pool.js";
import { HumanInteractionEngine } from "./human-interaction-engine.js";

export interface CandidatePost {
  draftId: string;
  author: string;
  postLink: string;
  postSnippet: string;
  matchedTags: string[];
  relevanceScore: number;
  draftedReply: string;
  createdAt: string;
  status: "pending_review" | "approved" | "rejected" | "posted";
}

const PENDING_QUEUE_FILE = path.resolve("./pending-review-queue.json");

// 🔴 STRICT NEGATIVE BLACKLIST
const NEGATIVE_KEYWORDS = [
  // Food & Dining
  "yogurt", "cereal", "food", "eat", "eating", "dish", "cook", "cooking", "snack", "dinner", "lunch", 
  "breakfast", "coffee", "tea", "cake", "sweet", "delicious", "tasty", "nấu", "ăn", "ngon", "好食", "bữa", "món", "quán",
  // Relationships & Personal Diary
  "dating", "boyfriend", "girlfriend", "crush", "lover", "ny", "người yêu", "tình yêu", "khoe khoang", 
  "chồng", "vợ", "được ni", "mua cho", "tặng cho", "snoopy",
  // Non-tech / Entertainment
  "kpop", "drama", "movie", "anime", "crypto", "casino", "giveaway", "ootd", "fashion", "makeup"
];

// 🟢 STRICT TECHNICAL WHITELIST (Must match at least 2)
const TECHNICAL_WHITELIST = [
  "keyboard", "switch", "keycap", "gasket", "mount", "pcb", "case", "plate", 
  "blender", "cad", "python", "3d print", "3d printing", "3dprinted", "filament", 
  "tolerance", "clearance", "mechanical", "screw", "insert", "mesh", "render", 
  "nozzle", "bed", "layer", "extruder", "petg", "pla", "abs", "asa", "robot", "robotics"
];

const TARGET_TAGS = [
  "customkeyboard",
  "mechanicalkeyboards",
  "3dprinting",
  "blender3d",
  "cad"
];

export class CommunityScoutDraftEngine {
  private pool: CdpSessionPool;
  private human: HumanInteractionEngine;

  constructor() {
    this.pool = CdpSessionPool.getInstance();
    this.human = new HumanInteractionEngine();
  }

  private loadQueue(): CandidatePost[] {
    try {
      if (fs.existsSync(PENDING_QUEUE_FILE)) {
        return JSON.parse(fs.readFileSync(PENDING_QUEUE_FILE, "utf-8"));
      }
    } catch {}
    return [];
  }

  private saveQueue(queue: CandidatePost[]) {
    fs.writeFileSync(PENDING_QUEUE_FILE, JSON.stringify(queue, null, 2));
  }

  /**
   * Evaluates text against semantic safety gates
   */
  evaluateRelevance(text: string): { pass: boolean; score: number; reasons: string[] } {
    const lower = text.toLowerCase();
    const reasons: string[] = [];

    // 1. Negative Keyword Gate (Instant Kill)
    for (const badWord of NEGATIVE_KEYWORDS) {
      if (lower.includes(badWord)) {
        reasons.push(`Contains blacklisted term: "${badWord}"`);
        return { pass: false, score: 0, reasons };
      }
    }

    // 2. Language Density Gate (English technical community focus)
    const englishWords = (lower.match(/[a-z]{3,}/g) || []).length;
    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    if (englishWords < 5 || (nonAsciiCount / Math.max(1, text.length)) > 0.15) {
      reasons.push("Failed English language technical density gate");
      return { pass: false, score: 10, reasons };
    }

    // 3. Technical Whitelist Gate (Must match >= 2 keywords)
    const matchedTerms = TECHNICAL_WHITELIST.filter(term => lower.includes(term));
    if (matchedTerms.length < 2) {
      reasons.push(`Insufficient technical keywords (${matchedTerms.length}/2 matched: ${matchedTerms.join(", ")})`);
      return { pass: false, score: matchedTerms.length * 20, reasons };
    }

    const score = Math.min(100, 50 + matchedTerms.length * 15);
    return { pass: true, score, reasons: [`Matched technical terms: ${matchedTerms.join(", ")}`] };
  }

  /**
   * Crafts a highly contextual technical reply draft based on matched topic.
   * STRICT RULE: Zero cross-marketing / promotional links. Pure high-value engineering input only.
   */
  draftTechnicalReply(postText: string): string {
    const lower = postText.toLowerCase();

    if (lower.includes("keyboard") || lower.includes("keycap") || lower.includes("gasket") || lower.includes("switch")) {
      return `Really clean design! If you're tuning the acoustic profile and switch flex, adding a small 0.2mm bottom clearance relief around the leaf-spring tabs prevents switch stem binding on off-center hits while keeping that deep, clean bottom-out sound.`;
    }

    if (lower.includes("3d print") || lower.includes("filament") || lower.includes("petg") || lower.includes("nozzle") || lower.includes("layer") || lower.includes("shoji") || lower.includes("lamp")) {
      return `Solid execution and clean layer lines! For functional mechanical parts and lamps with heat-set brass inserts, keeping radial boss wall thickness at least 1.5x the insert diameter and adding a slight 45-degree chamfer lead-in prevents layer cleavage and hoop stress cracks under torque.`;
    }

    return `Great engineering insights! Managing clearances with procedural CAD checks early on saves so many prototype iterations before committing to physical prints or CNC tooling.`;
  }

  /**
   * Scout active tag feeds and generate drafts for user review
   */
  async scoutAndDraft(): Promise<CandidatePost[]> {
    console.log("🔍 [SCOUT & DRAFT] Scanning high-signal engineering tags on Threads...");
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await res.json() as any[];
    const t = tabs.find(x => x.url && x.url.includes("threads.com"));
    if (!t) throw new Error("No active Threads tab found on port 9222");

    const wsUrl = t.webSocketDebuggerUrl;
    const tag = TARGET_TAGS[Math.floor(Math.random() * TARGET_TAGS.length)];
    const tagUrl = `https://www.threads.com/search?q=%23${tag}&serp_type=tags`;

    console.log(`📌 Navigating to strict Tag Feed: #${tag}...`);
    await this.human.navigateSafely(wsUrl, tagUrl);
    await this.human.sleep(4000, 6000);
    await this.human.scrollNatural(wsUrl, 2);

    const rawCandidates: any[] = await this.pool.evaluate(wsUrl, `(() => {
      const articles = Array.from(document.querySelectorAll('article, div[data-pressable-container="true"]'));
      return articles.slice(0, 10).map((a, idx) => {
        const text = (a.innerText || '').trim();
        const links = Array.from(a.querySelectorAll('a')).map(l => l.href);
        const postLink = links.find(h => h.includes('/post/'));
        const author = links.find(h => h.includes('/@'))?.split('/@')[1]?.split('/')[0] || "creator";
        return { idx, text: text.slice(0, 400).split(String.fromCharCode(10)).join(' '), postLink, author };
      }).filter(p => p.postLink && !p.author.includes("jangtrinhsg"));
    })()`);

    const queue = this.loadQueue();
    const existingLinks = new Set(queue.map(q => q.postLink));
    const newDrafts: CandidatePost[] = [];

    for (const cand of rawCandidates || []) {
      if (existingLinks.has(cand.postLink)) continue;

      const evalResult = this.evaluateRelevance(cand.text);
      if (!evalResult.pass) {
        console.log(`   ⏭️ [SKIPPED] @${cand.author}: ${evalResult.reasons.join(", ")}`);
        continue;
      }

      const draft: CandidatePost = {
        draftId: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        author: cand.author,
        postLink: cand.postLink,
        postSnippet: cand.text.slice(0, 140),
        matchedTags: [tag],
        relevanceScore: evalResult.score,
        draftedReply: this.draftTechnicalReply(cand.text),
        createdAt: new Date().toISOString(),
        status: "pending_review"
      };

      queue.push(draft);
      newDrafts.push(draft);
      existingLinks.add(cand.postLink);
      console.log(`   ✨ [DRAFT CREATED] @${cand.author} (Score: ${evalResult.score}): "${draft.postSnippet}..."`);
    }

    this.saveQueue(queue);
    console.log(`\n📋 Finished scouting #${tag}. Generated ${newDrafts.length} new verified drafts in pending queue.`);
    return newDrafts;
  }
}
