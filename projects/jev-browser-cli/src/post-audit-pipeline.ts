import fs from "fs";
import path from "path";
import { CdpSessionPool } from "./cdp-session-pool.js";

export interface DropCandidate {
  dropId: string;
  topic: string;
  cards: string[];
  mediaFiles: string[];
  projectId?: "orc" | "keyboard" | "robot-arm" | "desktop-companion" | "drone" | string;
}

export interface PreFlightVerdict {
  passed: boolean;
  dropId: string;
  violations: string[];
  warnings: string[];
  auditedMedia: string[];
  sanitizedCards: string[];
  metadata: {
    checkedAt: string;
    mediaFileCount: number;
    cardCount: number;
    projectId?: string;
  };
}

export interface PostFlightVerdict {
  verified: boolean;
  dropId: string;
  profileUrl: string;
  mediaRenderedInDOM: boolean;
  renderedMediaCount: number;
  renderedImageSrcs: string[];
  errorBadgesDetected: boolean;
  liveProofScreenshotPath: string;
  timestamp: string;
  error?: string;
}

export interface AuditLedgerEntry {
  id: string;
  timestamp: string;
  dropId: string;
  topic: string;
  preFlight: PreFlightVerdict;
  postFlight?: PostFlightVerdict;
  status: "APPROVED_AND_VERIFIED" | "PREFLIGHT_REJECTED" | "POSTFLIGHT_FAILED";
}

// 🛑 Blacklist keywords indicating profile, feed, or UI screenshots
export const SCREENSHOT_BLACKLIST_PATTERNS = [
  "profile",
  "activity",
  "feed",
  "proof",
  "staged",
  "screenshot",
  "screen",
  "dashboard",
  "threads",
  "capture",
  "preview"
];

// 🛑 Whitelisted asset source directories (authentic engineering assets only)
export const WHITELIST_SOURCE_DIRECTORIES = [
  "/Users/jangtrinh/Products/Blender/builds",
  "/Users/jangtrinh/Products/Blender/docs/media",
  "/Users/jangtrinh/Products/design-os-3d-blender"
];

export const ALLOWED_MEDIA_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".mp4"];
export const MIN_FILE_SIZE_BYTES = 20 * 1024; // 20 KB
export const MAX_CARD_CHARACTER_LIMIT = 480;

const DEFAULT_LEDGER_FILE = "/Users/jangtrinh/Products/JEV/projects/jev-browser-cli/growth-audit-ledger.json";
const ARTIFACT_DIR = "/Users/jangtrinh/.gemini/antigravity/brain/84b4523e-f1b1-475b-9474-a05378e70fdd";

/**
 * 🛫 TẦNG 1: PRE-FLIGHT AUDIT ENGINE
 * Evaluates candidate content against Hard Rules before any browser interaction.
 */
export class PreFlightAuditor {
  static audit(candidate: DropCandidate): PreFlightVerdict {
    const violations: string[] = [];
    const warnings: string[] = [];
    const auditedMedia: string[] = [];
    const sanitizedCards: string[] = [];

    const { dropId, topic, cards, mediaFiles, projectId } = candidate;

    // 🔴 RULE-01: MANDATORY_MEDIA (Must attach at least 1 and at most 10 media files)
    if (!mediaFiles || mediaFiles.length === 0) {
      violations.push("RULE_01_MANDATORY_MEDIA_VIOLATION: Post must attach at least 1 media file. Text-only posts are strictly forbidden.");
    } else if (mediaFiles.length > 10) {
      violations.push(`RULE_01_MEDIA_OVERFLOW_VIOLATION: Attached ${mediaFiles.length} media files; Threads maximum is 10.`);
    }

    // Evaluate each media file
    for (const rawFile of mediaFiles || []) {
      const normalizedPath = path.resolve(rawFile);
      const fileName = path.basename(normalizedPath).toLowerCase();
      const ext = path.extname(normalizedPath).toLowerCase();

      // 🔴 RULE-02: BAN_PROFILE_UI_SCREENSHOT
      const isBlacklisted = SCREENSHOT_BLACKLIST_PATTERNS.some(pattern => fileName.includes(pattern));
      if (isBlacklisted) {
        violations.push(
          `RULE_02_SCREENSHOT_BAN_VIOLATION: File "${fileName}" matches blacklisted screenshot patterns. Only CAD/Cycles renders allowed.`
        );
        continue;
      }

      // 🔴 RULE-03: VERIFIED_ASSET_ORIGIN
      const isInWhitelistedDir = WHITELIST_SOURCE_DIRECTORIES.some(allowedDir =>
        normalizedPath.startsWith(allowedDir)
      );
      if (!isInWhitelistedDir) {
        violations.push(
          `RULE_03_UNAUTHORIZED_DIRECTORY_VIOLATION: File "${normalizedPath}" is outside whitelisted CAD asset directories.`
        );
        continue;
      }

      // Check allowed extension
      if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
        violations.push(
          `RULE_03_INVALID_MEDIA_TYPE: Extension "${ext}" is not supported. Allowed: ${ALLOWED_MEDIA_EXTENSIONS.join(", ")}`
        );
        continue;
      }

      // Check file existence and minimum size
      try {
        if (!fs.existsSync(normalizedPath)) {
          violations.push(`RULE_03_FILE_NOT_FOUND: File does not exist: "${normalizedPath}"`);
          continue;
        }

        const stats = fs.statSync(normalizedPath);
        if (stats.size < MIN_FILE_SIZE_BYTES) {
          violations.push(
            `RULE_03_SUSPICIOUS_FILE_SIZE: File "${fileName}" is ${stats.size} bytes (minimum threshold is ${MIN_FILE_SIZE_BYTES} bytes).`
          );
          continue;
        }

        // 🔴 RULE-04: ORC_COMPONENTS_ONLY (Never allow whole-plant overview/sa bàn tổng)
        if (projectId === "orc" || normalizedPath.includes("geothermal-orc-plant")) {
          const lowerPath = normalizedPath.toLowerCase();
          if (
            lowerPath.includes("phase1-iso") ||
            lowerPath.includes("overview") ||
            lowerPath.includes("saban") ||
            lowerPath.includes("site-model")
          ) {
            violations.push(
              `RULE_04_ORC_OVERVIEW_BAN_VIOLATION: "${fileName}" is a whole-plant site overview. Only mechanical component renders (C05, C03, C01) are permitted.`
            );
            continue;
          }
        }
      } catch (err: any) {
        violations.push(`RULE_03_FILE_READ_ERROR: Unable to stat file "${rawFile}": ${err.message}`);
        continue;
      }

      auditedMedia.push(normalizedPath);
    }

    // 🔴 RULE-05: CHARACTER_LIMIT_SAFETY (Cards must be <= 480 characters)
    if (!cards || cards.length === 0) {
      violations.push("RULE_05_EMPTY_CONTENT_VIOLATION: Post must contain at least 1 card of text.");
    } else {
      cards.forEach((cardText, idx) => {
        const trimmed = (cardText || "").trim();
        if (trimmed.length === 0) {
          violations.push(`RULE_05_EMPTY_CARD_VIOLATION: Card #${idx + 1} is empty.`);
        } else if (trimmed.length > MAX_CARD_CHARACTER_LIMIT) {
          violations.push(
            `RULE_05_CHARACTER_OVERFLOW_VIOLATION: Card #${idx + 1} has ${trimmed.length} characters (exceeds safety threshold of ${MAX_CARD_CHARACTER_LIMIT} chars).`
          );
        }
        sanitizedCards.push(trimmed);
      });
    }

    const passed = violations.length === 0;

    return {
      passed,
      dropId,
      violations,
      warnings,
      auditedMedia,
      sanitizedCards,
      metadata: {
        checkedAt: new Date().toISOString(),
        mediaFileCount: auditedMedia.length,
        cardCount: sanitizedCards.length,
        projectId
      }
    };
  }
}

/**
 * 🛬 TẦNG 2: POST-FLIGHT AUDIT ENGINE
 * Inspects the live feed DOM after publishing to ensure media actually rendered and no error occurred.
 */
export class PostFlightAuditor {
  private pool: CdpSessionPool;
  private ledgerPath: string;

  constructor(pool?: CdpSessionPool, ledgerPath = DEFAULT_LEDGER_FILE) {
    this.pool = pool || CdpSessionPool.getInstance();
    this.ledgerPath = ledgerPath;
  }

  async auditLivePost(
    dropId: string,
    topic: string,
    preFlight: PreFlightVerdict,
    expectedSnippet: string
  ): Promise<PostFlightVerdict> {
    const timestamp = new Date().toISOString();
    const profileUrl = "https://www.threads.com/@jangtrinhsg";

    // 1. Get active tab
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const tabs = await res.json() as any[];
    const t = tabs.find((x: any) => x.url && x.url.includes("threads.com"));
    if (!t) {
      const failedVerdict: PostFlightVerdict = {
        verified: false,
        dropId,
        profileUrl,
        mediaRenderedInDOM: false,
        renderedMediaCount: 0,
        renderedImageSrcs: [],
        errorBadgesDetected: false,
        liveProofScreenshotPath: "",
        timestamp,
        error: "No active Threads tab found on CDP port 9222"
      };
      this.recordToLedger(dropId, topic, preFlight, failedVerdict, "POSTFLIGHT_FAILED");
      return failedVerdict;
    }

    // 2. Navigate to profile and wait for network stabilization safely
    try {
      const cur = await this.pool.evaluate(t.webSocketDebuggerUrl, "window.location.href", 3000);
      if (cur !== profileUrl) {
        await this.pool.evaluate(t.webSocketDebuggerUrl, `window.location.href = ${JSON.stringify(profileUrl)}`, 5000);
      }
    } catch {
      try {
        await this.pool.send(t.webSocketDebuggerUrl, "Page.navigate", { url: profileUrl }, 25000);
      } catch (navErr) {
        console.warn("Navigation warning:", navErr);
      }
    }
    await new Promise(r => setTimeout(r, 4500));

    // 3. Inspect top post in profile DOM
    const snippetClean = expectedSnippet.slice(0, 40).replace(/['"\\]/g, "");
    const domAudit: any = await this.pool.evaluate(t.webSocketDebuggerUrl, `(() => {
      const articles = Array.from(document.querySelectorAll('article, div[data-pressable-container="true"]'));
      const targetPost = articles.find(a => (a.innerText || '').includes(${JSON.stringify(snippetClean)}));
      
      const container = targetPost || articles[0];
      if (!container) return { foundPost: false };

      const allImgs = Array.from(container.querySelectorAll('img'));
      const nonAvatarImgs = allImgs.filter(img => {
        const src = img.src || '';
        return !src.includes('profile_pic') && !src.includes('s150x150');
      });

      const errorKeywords = ['could not be loaded', 'failed to upload', 'error', 'retry'];
      const containerText = (container.innerText || '').toLowerCase();
      const hasError = errorKeywords.some(kw => containerText.includes(kw));

      return {
        foundPost: true,
        textSnippet: (container.innerText || '').slice(0, 150),
        renderedMediaCount: nonAvatarImgs.length,
        renderedImageSrcs: nonAvatarImgs.map(img => img.src),
        errorBadgesDetected: hasError
      };
    })()`);

    // 4. Capture screenshot proof
    let liveProofScreenshotPath = "";
    try {
      const shot: any = await this.pool.send(t.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png" });
      liveProofScreenshotPath = path.join(ARTIFACT_DIR, `day24-${dropId}-postflight-verified.png`);
      fs.writeFileSync(liveProofScreenshotPath, Buffer.from(shot.data, "base64"));
    } catch (e: any) {
      console.warn("Screenshot capture warning:", e.message);
    }

    const verified =
      domAudit &&
      domAudit.foundPost &&
      domAudit.renderedMediaCount > 0 &&
      !domAudit.errorBadgesDetected;

    const postFlightVerdict: PostFlightVerdict = {
      verified: !!verified,
      dropId,
      profileUrl,
      mediaRenderedInDOM: domAudit ? domAudit.renderedMediaCount > 0 : false,
      renderedMediaCount: domAudit ? domAudit.renderedMediaCount : 0,
      renderedImageSrcs: domAudit ? domAudit.renderedImageSrcs : [],
      errorBadgesDetected: domAudit ? domAudit.errorBadgesDetected : true,
      liveProofScreenshotPath,
      timestamp,
      error: verified ? undefined : "Post was not found or media failed to render in DOM"
    };

    const status = verified ? "APPROVED_AND_VERIFIED" : "POSTFLIGHT_FAILED";
    this.recordToLedger(dropId, topic, preFlight, postFlightVerdict, status);

    return postFlightVerdict;
  }

  private recordToLedger(
    dropId: string,
    topic: string,
    preFlight: PreFlightVerdict,
    postFlight: PostFlightVerdict | undefined,
    status: AuditLedgerEntry["status"]
  ) {
    let ledger: AuditLedgerEntry[] = [];
    if (fs.existsSync(this.ledgerPath)) {
      try {
        ledger = JSON.parse(fs.readFileSync(this.ledgerPath, "utf-8"));
      } catch (e) {
        ledger = [];
      }
    }

    const entry: AuditLedgerEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      dropId,
      topic,
      preFlight,
      postFlight,
      status
    };

    ledger.push(entry);
    fs.writeFileSync(this.ledgerPath, JSON.stringify(ledger, null, 2));
  }
}
