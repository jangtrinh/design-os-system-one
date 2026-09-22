/**
 * Universal TypeSafe AI JEV System One Contract & Runtime Validator
 *
 * Implements the shared decision envelope, calibrated confidence validation,
 * and typed contracts for browser automation, cost gateway, and content curation.
 */

export type Choice<K extends string> = {
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
  stateHash: string;          // Hash of observed DOM or context state
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
      status: 'ok';
      modelVersion: string;
      value: T;
    }
  | {
      status: 'abstain';
      reason:
        | 'uncertain'
        | 'stale'
        | 'timeout'
        | 'cancelled'
        | 'invalid'
        | 'provider_error'
        | 'need_plan';
      detail?: string;
    }
);

export type ActionEffect = 'read' | 'local' | 'external';

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

export interface GatewayDecisionInput {
  request: string;
  eligibleRoutes: string[];
  cacheCandidates: Array<{ id: string; request: string; answer: string }>;
  blocks: Array<{ id: string; text: string; mandatory: boolean }>;
}

export interface GatewayDecisionOutput {
  route: Choice<string>;
  cacheApplicability: Record<string, Noul>;
  blockRelevance: Record<string, Score>;
}

export interface ContentDecisionInput {
  audienceRules: string;
  items: Record<string, { text: string; sourceExcerpts: string[]; archiveMatches: string[] }>;
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

/**
 * Creates a valid cryptographic/session binding for JEV decisions.
 */
export function createBinding(params: {
  scopeHash?: string;
  intentEpoch: number;
  stateHash: string;
  candidateSetHash?: string;
  policyVersion?: string;
  ttlMs?: number;
}): Binding {
  return {
    scopeHash: params.scopeHash || 'global_scope',
    intentEpoch: params.intentEpoch,
    stateHash: params.stateHash,
    candidateSetHash: params.candidateSetHash || 'default_candidates',
    policyVersion: params.policyVersion || 'v1.0.0',
    expiresAtMs: Date.now() + (params.ttlMs || 10000)
  };
}

/**
 * Validates that a Choice response has valid probability distribution and valid member selection.
 */
export function validateChoiceDistribution<K extends string>(
  choice: Choice<K>,
  allowedCandidates: K[]
): { valid: boolean; error?: string } {
  if (!choice || typeof choice !== 'object') {
    return { valid: false, error: 'Choice object is missing or null' };
  }

  if (!allowedCandidates.includes(choice.choice)) {
    return {
      valid: false,
      error: `Selected choice '${choice.choice}' is not in allowed candidates: [${allowedCandidates.join(', ')}]`
    };
  }

  if (typeof choice.confidence !== 'number' || isNaN(choice.confidence) || choice.confidence < 0 || choice.confidence > 1) {
    return { valid: false, error: `Confidence ${choice.confidence} out of range [0, 1]` };
  }

  if (choice.probabilities && typeof choice.probabilities === 'object') {
    let sum = 0;
    for (const [key, prob] of Object.entries(choice.probabilities)) {
      if (typeof prob !== 'number' || isNaN(prob) || (prob as number) < 0 || (prob as number) > 1.01) {
        return { valid: false, error: `Probability for key ${key} is invalid: ${prob}` };
      }
      sum += prob as number;
    }
    // Allow slight float variance around 1.0
    if (sum < 0.90 || sum > 1.10) {
      return { valid: false, error: `Probabilities do not sum to ~1.0 (sum = ${sum.toFixed(3)})` };
    }
  }

  return { valid: true };
}

/**
 * Validates a complete Result<T> envelope before execution.
 */
export function validateResult<T>(
  result: Result<T>,
  expectedEpoch: number
): { valid: boolean; error?: string } {
  if (!result || !result.binding) {
    return { valid: false, error: 'Missing decision result or binding envelope' };
  }

  if (Date.now() > result.binding.expiresAtMs) {
    return { valid: false, error: `Decision expired at ${result.binding.expiresAtMs}` };
  }

  if (result.binding.intentEpoch !== expectedEpoch) {
    return {
      valid: false,
      error: `Epoch mismatch: expected ${expectedEpoch}, got ${result.binding.intentEpoch}`
    };
  }

  return { valid: true };
}
