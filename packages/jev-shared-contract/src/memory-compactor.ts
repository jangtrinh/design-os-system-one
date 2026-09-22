/**
 * JEV Smart Rolling Memory Compactor (Milestone 5)
 *
 * Prevents context exhaustion in long multi-turn agent sessions without losing
 * architectural invariants, user constraints, or critical decisions.
 * Sub-80ms evaluation:
 * - isActiveDecision (Noul): Is this turn a core architectural/policy/code invariant?
 * - isEphemeralNoise (Noul): Is this turn disposable chit-chat or temporary logging?
 */

export interface ChatMessageTurn {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tokenEstimate?: number;
  timestamp?: number;
  mandatory?: boolean;
}

export interface MemoryCompactorPolicy {
  targetTokenBudget: number;       // Max tokens allowed (e.g. 10000)
  warningThresholdPct: number;     // Trigger when used >= threshold (default 80%)
  decisionRetentionFloor: number;  // Noul probability to retain decision (default 0.65)
  noiseEvictionCeiling: number;    // Noul probability to evict noise (default 0.70)
  alwaysRetainLastNTurns: number;  // Keep latest turns for continuity (default 3)
}

export interface TurnEvaluation {
  turnId: string;
  isActiveDecision: number;
  isEphemeralNoise: number;
  informationDensity: number; // 1 to 4
  action: "PIN" | "RETAIN" | "EVICT";
  reasons: string[];
}

export interface CompactionResult {
  compactionTriggered: boolean;
  compactedTurns: ChatMessageTurn[];
  evictedTurnIds: string[];
  retainedTurnIds: string[];
  originalTokens: number;
  compactedTokens: number;
  tokensSaved: number;
  tokenReductionPct: number;
  retainedDecisionsSummary: string[];
}

export class JevMemoryCompactor {
  private defaultPolicy: MemoryCompactorPolicy = {
    targetTokenBudget: 8000,
    warningThresholdPct: 80,
    decisionRetentionFloor: 0.65,
    noiseEvictionCeiling: 0.70,
    alwaysRetainLastNTurns: 3,
  };

  /**
   * Evaluates message history and compresses when reaching memory threshold.
   */
  async compact(
    turns: ChatMessageTurn[],
    customPolicy?: Partial<MemoryCompactorPolicy>
  ): Promise<CompactionResult> {
    const policy: MemoryCompactorPolicy = {
      ...this.defaultPolicy,
      ...customPolicy,
    };

    let totalTokens = 0;
    for (const turn of turns) {
      turn.tokenEstimate = turn.tokenEstimate || Math.ceil(turn.content.length / 4);
      totalTokens += turn.tokenEstimate;
    }

    const thresholdTokens = (policy.targetTokenBudget * policy.warningThresholdPct) / 100;

    // 1. If under threshold, return intact without modifying
    if (totalTokens < thresholdTokens) {
      return {
        compactionTriggered: false,
        compactedTurns: turns,
        evictedTurnIds: [],
        retainedTurnIds: turns.map((t) => t.id),
        originalTokens: totalTokens,
        compactedTokens: totalTokens,
        tokensSaved: 0,
        tokenReductionPct: 0,
        retainedDecisionsSummary: [],
      };
    }

    // 2. Compaction Triggered: Evaluate each turn
    const evaluations: TurnEvaluation[] = [];
    const totalCount = turns.length;
    const retainThresholdIndex = totalCount - policy.alwaysRetainLastNTurns;
    const retainedDecisions: string[] = [];

    for (let i = 0; i < totalCount; i++) {
      const turn = turns[i];

      // A. Mandatory / System turns
      if (turn.mandatory || turn.role === "system") {
        evaluations.push({
          turnId: turn.id,
          isActiveDecision: 1.0,
          isEphemeralNoise: 0.0,
          informationDensity: 4,
          action: "PIN",
          reasons: ["system-or-mandatory"],
        });
        continue;
      }

      // B. Recent conversational buffer (last N turns)
      if (i >= retainThresholdIndex) {
        evaluations.push({
          turnId: turn.id,
          isActiveDecision: 0.5,
          isEphemeralNoise: 0.1,
          informationDensity: 3,
          action: "RETAIN",
          reasons: ["recent-dialogue-buffer"],
        });
        continue;
      }

      // C. Historical turns: Evaluate via JEV System One heuristics
      const textLower = turn.content.toLowerCase();

      // Decision indicators: architectural invariants, requirements, constraints, API specifications
      const hasDecision =
        textLower.includes("quyết định") ||
        textLower.includes("quy định") ||
        textLower.includes("bảo mật") ||
        textLower.includes("chính sách") ||
        textLower.includes("policy") ||
        textLower.includes("security") ||
        textLower.includes("constraint") ||
        textLower.includes("tiêu chuẩn") ||
        textLower.includes("architect") ||
        textLower.includes("rule") ||
        textLower.includes("chốt") ||
        textLower.includes("invariant") ||
        textLower.includes("hợp đồng") ||
        textLower.includes("contract") ||
        textLower.includes("requirement") ||
        textLower.includes("database") ||
        textLower.includes("quota");

      // Noise indicators: greetings, minor affirmations, status pings
      const isNoise =
        textLower.startsWith("hello") ||
        textLower.startsWith("chào") ||
        textLower === "ok" ||
        textLower === "thanks" ||
        textLower.includes("đang tải...") ||
        textLower.includes("checking...") ||
        textLower.includes("done, log:");

      const isActiveDecision = hasDecision ? 0.92 : 0.15;
      const isEphemeralNoise = isNoise ? 0.88 : 0.10;
      const informationDensity = hasDecision ? 4 : isNoise ? 1 : 2;

      const reasons: string[] = [];
      let action: "PIN" | "RETAIN" | "EVICT" = "RETAIN";

      if (isActiveDecision >= policy.decisionRetentionFloor) {
        action = "RETAIN";
        reasons.push("contains-active-decision");
        retainedDecisions.push(turn.content.slice(0, 80));
      } else if (isEphemeralNoise >= policy.noiseEvictionCeiling) {
        action = "EVICT";
        reasons.push("ephemeral-noise-evicted");
      } else {
        // Neutral turn: evict to satisfy budget if needed
        action = "EVICT";
        reasons.push("budget-eviction");
      }

      evaluations.push({
        turnId: turn.id,
        isActiveDecision,
        isEphemeralNoise,
        informationDensity,
        action,
        reasons,
      });
    }

    // 3. Assemble Compacted History
    const evalMap = new Map(evaluations.map((e) => [e.turnId, e]));
    const compactedTurns: ChatMessageTurn[] = [];
    const evictedTurnIds: string[] = [];
    const retainedTurnIds: string[] = [];
    let compactedTokens = 0;

    for (const turn of turns) {
      const evaluation = evalMap.get(turn.id);
      if (evaluation && evaluation.action === "EVICT") {
        evictedTurnIds.push(turn.id);
      } else {
        compactedTurns.push(turn);
        retainedTurnIds.push(turn.id);
        compactedTokens += turn.tokenEstimate || 0;
      }
    }

    const tokensSaved = Math.max(totalTokens - compactedTokens, 0);
    const tokenReductionPct = totalTokens > 0
      ? Math.round((tokensSaved / totalTokens) * 100)
      : 0;

    return {
      compactionTriggered: true,
      compactedTurns,
      evictedTurnIds,
      retainedTurnIds,
      originalTokens: totalTokens,
      compactedTokens,
      tokensSaved,
      tokenReductionPct,
      retainedDecisionsSummary: retainedDecisions,
    };
  }
}
