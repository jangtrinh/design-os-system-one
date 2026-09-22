/**
 * JEV Stop-Condition Oracle (Milestone 4B)
 *
 * Decomposed System One judge preventing runaway loops and burning tokens in autonomous agents.
 * Evaluates goalAchieved (Noul), stuck (Noul), and progress (Score) to return
 * CONTINUE, VERIFY_AND_STOP, PIVOT, or ESCALATE.
 */

export type LoopAction = "CONTINUE" | "VERIFY_AND_STOP" | "PIVOT" | "ESCALATE";

export interface AcceptanceEvidence {
  id: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  fingerprint?: string;
  detail?: string;
}

export interface IterationEvidence {
  iteration: number;
  actionFingerprint: string;
  stateFingerprint: string;
  changedArtifacts: readonly string[];
  observedProgress: string;
  currentFailure?: string;
  acceptance: readonly AcceptanceEvidence[];
}

export interface StopOracleInput {
  objective: string;
  acceptanceCriteria: readonly string[];
  current: IterationEvidence;
  recent: readonly IterationEvidence[];
  maxIterations: number;
  intentEpoch?: number;
}

export interface StopOracleJudgment {
  goalAchievedProbability: number;
  stuckProbability: number;
  progressScore: number; // 0 to 4
  reasonCodes: string[];
}

export interface StopOracleResult {
  action: LoopAction;
  judgment: StopOracleJudgment;
  deterministicAcceptanceSatisfied: boolean;
  iteration: number;
  recommendation: string;
}

export interface StopPolicy {
  goalThreshold: number;       // default 0.80
  stuckThreshold: number;      // default 0.70
  lowProgressMaximum: number;  // default 1
}

export class JevStopOracle {
  private defaultPolicy: StopPolicy = {
    goalThreshold: 0.80,
    stuckThreshold: 0.70,
    lowProgressMaximum: 1,
  };

  /**
   * Evaluates the iteration evidence and decides loop lifecycle action.
   */
  async evaluate(
    input: StopOracleInput,
    customPolicy?: Partial<StopPolicy>
  ): Promise<StopOracleResult> {
    const policy = { ...this.defaultPolicy, ...customPolicy };

    // 1. Deterministic Max Iteration Limit Check
    if (input.current.iteration >= input.maxIterations) {
      return {
        action: "ESCALATE",
        judgment: {
          goalAchievedProbability: 0.1,
          stuckProbability: 0.9,
          progressScore: 0,
          reasonCodes: ["MAX_ITERATIONS_REACHED"],
        },
        deterministicAcceptanceSatisfied: false,
        iteration: input.current.iteration,
        recommendation: `Hard limit of ${input.maxIterations} iterations reached. Escalate to engineer.`,
      };
    }

    // 2. Deterministic Acceptance Evidence Evaluation
    const acceptanceChecks = input.current.acceptance;
    const deterministicAcceptanceSatisfied =
      acceptanceChecks.length > 0 &&
      acceptanceChecks.every((item) => item.status === "PASS");

    // 3. Stagnation / Stuck Detection across recent iterations
    const reasonCodes: string[] = [];
    let isIdenticalFailure = false;
    if (input.recent.length >= 2) {
      const lastTwo = input.recent.slice(-2);
      const sameAction = lastTwo.every(
        (r) => r.actionFingerprint === input.current.actionFingerprint
      );
      const sameFailure = lastTwo.every(
        (r) => r.currentFailure && r.currentFailure === input.current.currentFailure
      );
      if (sameAction && sameFailure) {
        isIdenticalFailure = true;
        reasonCodes.push("REPEATED_IDENTICAL_FAILURE");
      }
    }

    // 4. JEV System One Decomposed Judgment
    let goalAchievedProbability = 0.1;
    let stuckProbability = isIdenticalFailure ? 0.88 : 0.05;
    let progressScore = 1;

    if (deterministicAcceptanceSatisfied) {
      goalAchievedProbability = 0.95;
      stuckProbability = 0.02;
      progressScore = 4;
      reasonCodes.push("ACCEPTANCE_CRITERIA_VERIFIED");
    } else if (input.current.changedArtifacts.length > 0 && !isIdenticalFailure) {
      goalAchievedProbability = 0.45;
      progressScore = 2;
      reasonCodes.push("ARTIFACTS_MODIFIED_WITH_FORWARD_MOMENTUM");
    }

    const judgment: StopOracleJudgment = {
      goalAchievedProbability,
      stuckProbability,
      progressScore,
      reasonCodes,
    };

    // 5. Code-Owned Policy Routing
    if (
      deterministicAcceptanceSatisfied &&
      goalAchievedProbability >= policy.goalThreshold
    ) {
      return {
        action: "VERIFY_AND_STOP",
        judgment,
        deterministicAcceptanceSatisfied: true,
        iteration: input.current.iteration,
        recommendation: "Evidence strongly indicates goal achieved. Run final verification and close.",
      };
    }

    if (
      stuckProbability >= policy.stuckThreshold &&
      progressScore <= policy.lowProgressMaximum
    ) {
      return {
        action: "PIVOT",
        judgment,
        deterministicAcceptanceSatisfied: false,
        iteration: input.current.iteration,
        recommendation: "Agent is oscillating or repeating identical failure. Pivot approach or ask clarifying input.",
      };
    }

    return {
      action: "CONTINUE",
      judgment,
      deterministicAcceptanceSatisfied: false,
      iteration: input.current.iteration,
      recommendation: "Progress is active and within bounds. Continue next iteration.",
    };
  }
}
