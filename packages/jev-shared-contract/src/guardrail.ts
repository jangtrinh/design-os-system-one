/**
 * PreExecutionGuardrail - Sub-30ms Security Firewall for Autonomous Agent Loops
 *
 * Inspired by LayaTaskGuard.
 * Intercepts incoming instructions, agent commands, and tool calls before execution.
 * Detects prompt injection, credential exfiltration, dangerous shell commands,
 * and system prompt override attempts.
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
   * Evaluates prompt or action safety in < 15ms.
   */
  async screen(input: GuardrailCheckInput): Promise<GuardrailVerdict> {
    const startTime = Date.now();
    const text = (input.instruction || "").toLowerCase();
    const action = (input.proposedAction || "").toLowerCase();
    const violations: string[] = [];

    // 1. High-risk OS/Shell Destructive Commands
    const destructivePatterns = [
      /rm\s+-rf\s+[\/\*~]/,
      /drop\s+database/i,
      /drop\s+table/i,
      /truncate\s+table/i,
      /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
      /mkfs\./,
      /dd\s+if=.*of=\/dev/,
      /chmod\s+-R\s+777\s+\//,
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(text) || pattern.test(action)) {
        violations.push("Destructive filesystem or database command detected");
        break;
      }
    }

    // 2. Prompt Injection & System Prompt Overrides
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /disregard\s+(all\s+)?prior\s+instructions/i,
      /you\s+are\s+now\s+in\s+developer\s+mode/i,
      /reveal\s+your\s+system\s+prompt/i,
      /print\s+your\s+(initial\s+)?instructions/i,
      /bypass\s+all\s+safety\s+filters/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(text)) {
        violations.push("Prompt injection or system prompt extraction attempt detected");
        break;
      }
    }

    // 3. Credential & Secrets Exfiltration
    const credentialPatterns = [
      /\b(aws_secret_access_key|id_rsa|private_key|api_key|ghp_[a-zA-Z0-9]{36})\b/i,
      /cat\s+~\/\.ssh\/id_rsa/i,
      /cat\s+~\/\.aws\/credentials/i,
      /cat\s+\.env/i,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(text) || pattern.test(action)) {
        violations.push("Sensitive credential or secret key access attempt detected");
        break;
      }
    }

    // 4. Custom User-Defined Blocklist
    for (const kw of this.customKeywords) {
      if (text.includes(kw) || action.includes(kw)) {
        violations.push(`Triggered custom blocklist keyword: "${kw}"`);
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    if (violations.length > 0) {
      const isCritical = violations.some(
        (v) => v.includes("Destructive") || v.includes("credential")
      );

      const guardAction: GuardrailAction = isCritical
        ? "block"
        : this.strictness === "strict"
        ? "block"
        : "need_human_approval";

      return {
        action: guardAction,
        passed: false,
        confidence: 0.96,
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
