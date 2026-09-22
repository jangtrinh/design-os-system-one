/**
 * @jev/shared-contract
 *
 * Universal TypeSafe AI JEV System One Decision Contract
 * Shared across VSF-PCP, JEV Browser CLI, and TheCurator.
 */

export type Choice<K extends string = string> = {
  choice: K;
  probabilities: Record<K, number>;
  confidence: number;
};

export type Noul = {
  noul: number;
};

export type Score = {
  score: number;
  probabilities: Record<string, number>;
  legend?: Record<string, string>;
  confidence: number;
};

export interface Binding {
  scopeHash: string;          // Tenant, principal, resource scope
  intentEpoch: number;        // Epoch counter for stale-decision prevention
  stateHash: string;          // Hash of observed DOM, context, or feed state
  candidateSetHash: string;   // Hash of the enumerated options
  policyVersion: string;      // Current security / prompt policy version
  expiresAtMs: number;        // Absolute deadline timestamp
}

export interface Input<T> {
  binding: Binding;
  state: T;
}

export type Result<T> = {
  binding: Binding;
} & (
  | {
      status: "ok";
      modelVersion: string;
      value: T;
    }
  | {
      status: "abstain";
      reason:
        | "uncertain"
        | "stale"
        | "timeout"
        | "cancelled"
        | "invalid"
        | "provider_error"
        | "need_plan";
      detail?: string;
    }
);

// -------------------------------------------------------------
// Domain Contract 1: VSF-PCP LLM Gateway
// -------------------------------------------------------------
export type GatewayRoute = "small" | "reasoning" | "review";

export interface ContextBlock {
  id: string;
  text: string;
  mandatory: boolean;
  tokenEstimate?: number;
}

export interface CacheCandidate {
  id: string;
  request: string;
  answer: string;
  createdAtMs: number;
}

export interface GatewayDecisionInput {
  request: string;
  eligibleRoutes: GatewayRoute[];
  cacheCandidates: CacheCandidate[];
  blocks: ContextBlock[];
}

export interface GatewayDecisionOutput {
  route: Choice<GatewayRoute>;
  cacheApplicability: Record<string, Noul>;
  blockRelevance: Record<string, Score>;
}

// -------------------------------------------------------------
// Domain Contract 2: Browser CLI Grounded Actions
// -------------------------------------------------------------
export type ActionEffect = "read" | "local" | "external";

export interface ActionCandidate {
  id: string;
  description: string;
  targetRef?: string;
  argsHash?: string;
  effect: ActionEffect;
}

export interface BrowserDecisionInput {
  goal: string;
  domText: string;
  candidates: Record<string, ActionCandidate>;
}

export interface BrowserDecisionOutput {
  next: Choice<string>;
  goalSatisfied?: Noul;
}

// -------------------------------------------------------------
// Domain Contract 3: TheCurator Social Viral Swarm
// -------------------------------------------------------------
export interface CuratorFeedItem {
  id: string;
  text: string;
  author: string;
  sourceExcerpts: string[];
  archiveMatches: string[];
}

export interface ContentDecisionInput {
  audienceRules: string;
  items: Record<string, CuratorFeedItem>;
}

export interface ContentDecisionOutput {
  items: Record<
    string,
    {
      relevance: Score;
      novelty: Score;
      sourceSupport: Noul;
    }
  >;
}

// -------------------------------------------------------------
// Core Runtime Validators
// -------------------------------------------------------------

export function createBinding(params: {
  scopeHash?: string;
  intentEpoch: number;
  stateHash: string;
  candidateSetHash?: string;
  policyVersion?: string;
  ttlMs?: number;
}): Binding {
  return {
    scopeHash: params.scopeHash || "global_scope",
    intentEpoch: params.intentEpoch,
    stateHash: params.stateHash,
    candidateSetHash: params.candidateSetHash || "default_candidates",
    policyVersion: params.policyVersion || "v1.0.0",
    expiresAtMs: Date.now() + (params.ttlMs || 10000),
  };
}

export function validateChoiceDistribution<K extends string>(
  choice: Choice<K>,
  allowedCandidates: K[]
): { valid: boolean; error?: string } {
  if (!choice || typeof choice !== "object") {
    return { valid: false, error: "Choice object is missing or null" };
  }

  if (!allowedCandidates.includes(choice.choice)) {
    return {
      valid: false,
      error: `Selected choice '${choice.choice}' is not in allowed candidates: [${allowedCandidates.join(", ")}]`,
    };
  }

  if (typeof choice.confidence !== "number" || isNaN(choice.confidence) || choice.confidence < 0 || choice.confidence > 1) {
    return { valid: false, error: `Confidence ${choice.confidence} out of range [0, 1]` };
  }

  if (choice.probabilities && typeof choice.probabilities === "object") {
    let sum = 0;
    for (const [key, prob] of Object.entries(choice.probabilities)) {
      if (typeof prob !== "number" || isNaN(prob) || (prob as number) < 0 || (prob as number) > 1.01) {
        return { valid: false, error: `Probability for key ${key} is invalid: ${prob}` };
      }
      sum += prob as number;
    }
    if (sum < 0.90 || sum > 1.10) {
      return { valid: false, error: `Probabilities do not sum to ~1.0 (sum = ${sum.toFixed(3)})` };
    }
  }

  return { valid: true };
}

export function validateResult<T>(
  result: Result<T>,
  expectedEpoch: number
): { valid: boolean; error?: string } {
  if (!result || !result.binding) {
    return { valid: false, error: "Missing decision result or binding envelope" };
  }

  if (Date.now() > result.binding.expiresAtMs) {
    return { valid: false, error: `Decision expired at ${result.binding.expiresAtMs}` };
  }

  if (result.binding.intentEpoch !== expectedEpoch) {
    return {
      valid: false,
      error: `Epoch mismatch: expected ${expectedEpoch}, got ${result.binding.intentEpoch}`,
    };
  }

  return { valid: true };
}
