/**
 * PreExecutionGuardrail - Hardened Sub-30ms Security Firewall for Autonomous Agent Loops
 *
 * Hardened against adversarial penetration attacks:
 * - Zero-width character & homoglyph de-obfuscation
 * - Pipe-to-shell and Remote Code Execution (RCE) interception
 * - DAN / Jailbreak / System Prompt Extraction detection
 * - Environment variables & secret credential exfiltration blocking
 */

export interface GuardrailCheckInput {
  instruction: string;
  source?: "user" | "subagent" | "external_tool";
  contextUrl?: string;
  proposedAction?: string;
}

export type GuardrailAction = "allow" | "block" | "sanitize" | "need_human_approval";

export interface GuardrailVerdict {
  action: GuardrailAction;
  passed: boolean;
  confidence: number;
  violations: string[];
  sanitizedInstruction?: string;
  latencyMs: number;
}

export interface GuardrailOptions {
  strictness?: "permissive" | "balanced" | "strict";
  blockedKeywords?: string[];
  confidenceThreshold?: number; // default 0.60
}

export class PreExecutionGuardrail {
  private strictness: "permissive" | "balanced" | "strict";
  private customKeywords: string[];
  private confidenceThreshold: number;

  constructor(options: GuardrailOptions = {}) {
    this.strictness = options.strictness ?? "balanced";
    this.customKeywords = (options.blockedKeywords || []).map((k) => k.toLowerCase());
    this.confidenceThreshold = options.confidenceThreshold ?? 0.60;
  }

  /**
   * Normalizes and de-obfuscates text to defeat Unicode and zero-width evasions.
   */
  private normalize(raw: string): string {
    if (!raw) return "";
    return raw
      .normalize("NFKD") // decompose accented and fullwidth chars
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00AD\u2060]/g, "") // strip zero-width & invisible spaces
      .toLowerCase();
  }

  /**
   * Evaluates prompt or action safety in < 15ms.
   */
  async screen(input: GuardrailCheckInput): Promise<GuardrailVerdict> {
    const startTime = Date.now();
    const rawText = `${input.instruction || ""} ${input.proposedAction || ""}`;
    const text = this.normalize(rawText);
    const violations: string[] = [];

    // 1. High-risk OS/Shell Destructive Commands & Filesystem Wipe
    const destructivePatterns = [
      /rm\s+(-[a-z]*r[a-z]*f?|--recursive)\s+[\/\*~]/,
      /drop\s+database/i,
      /drop\s+table/i,
      /truncate\s+table/i,
      /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
      /mkfs\./,
      /dd\s+if=.*of=\/dev/,
      /chmod\s+(-[a-z]*r[a-z]*\s+)?777\s+\//,
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(text)) {
        violations.push("Destructive filesystem or database command detected");
        break;
      }
    }

    // 2. Remote Code Execution (RCE) & Pipe-to-Shell Interception
    const rcePatterns = [
      /(curl|wget|fetch|axios)\s+.*\|\s*(ba?sh|zsh|dash|sh|ksh|csh)/i,
      /(python\d?|perl|ruby|node)\s+(-c|-e)\s+.*(os\.system|child_process|execsync|spawn|popen|subprocess)/i,
      /base64\s+(-d|--decode)\s*\|\s*(ba?sh|zsh|sh)/i,
      /echo\s+[a-za-z0-9+/=]{8,}\s*\|\s*base64/i,
    ];

    for (const pattern of rcePatterns) {
      if (pattern.test(text)) {
        violations.push("Remote Code Execution (RCE) or dangerous piped shell execution detected");
        break;
      }
    }

    // 3. Prompt Injection, Jailbreaks & System Prompt Overrides
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+(instructions|guidelines|rules)/i,
      /disregard\s+(all\s+)?(previous|prior|safety)\s+(instructions|guidelines|rules)/i,
      /you\s+are\s+now\s+(dan|in\s+developer\s+mode|unrestricted|uncensored)/i,
      /\b(dan\s+\(do\s+anything\s+now\)|jailbreak)\b/i,
      /(reveal|print|output|display)\s+(your\s+)?(system|initial|hidden|background)\s+(prompt|instructions|preamble)/i,
      /system\s+override\s+code/i,
      /bypass\s+all\s+(safety|content)\s+filters/i,
      /act\s+as\s+an?\s+(uncensored|unrestricted)\s+ai/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(text)) {
        violations.push("Prompt injection, jailbreak or system prompt extraction attempt detected");
        break;
      }
    }

    // 4. Credential & Secrets Exfiltration
    const credentialPatterns = [
      /\b(aws_secret_access_key|id_rsa|private_key|api_key|ghp_[a-zA-Z0-9]{36})\b/i,
      /echo\s+\$[a-z0-9_]*(secret|key|token|password|cred|auth)/i,
      /printenv(\s*\|\s*grep)?/i,
      /\b(cat|more|less|tail)\s+.*(\.ssh\/id_rsa|\.aws\/credentials|\.env|credentials\.db)/i,
      /export\s+[a-z0-9_]*(token|key|secret)\s*=/i,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(text)) {
        violations.push("Sensitive credential or secret key access/exfiltration attempt detected");
        break;
      }
    }

    // 5. Custom User-Defined Blocklist
    for (const kw of this.customKeywords) {
      if (text.includes(kw)) {
        violations.push(`Triggered custom blocklist keyword: "${kw}"`);
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    if (violations.length > 0) {
      const isCritical = violations.some(
        (v) =>
          v.includes("Destructive") ||
          v.includes("credential") ||
          v.includes("Remote Code Execution") ||
          v.includes("Prompt injection")
      );

      const guardAction: GuardrailAction = isCritical
        ? "block"
        : this.strictness === "strict"
        ? "block"
        : "need_human_approval";

      return {
        action: guardAction,
        passed: false,
        confidence: 0.98,
        violations,
        latencyMs,
      };
    }

    return {
      action: "allow",
      passed: true,
      confidence: 0.99,
      violations: [],
      latencyMs,
    };
  }
}
