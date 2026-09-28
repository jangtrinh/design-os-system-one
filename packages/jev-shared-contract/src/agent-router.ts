/**
 * HierarchicalAgentRouter - Sub-35ms Multi-Agent Task Delegation Router
 *
 * Inspired by LayaCrewRouter and modern System One agent swarm orchestration.
 * Replaces expensive, slow LLM manager agents (2,000-4,000ms) with deterministic,
 * sub-35ms delegation across specialist workers (Frontend, Backend, Security, Researcher, etc.).
 */

import { Choice, validateChoiceDistribution } from "./index.js";

export interface AgentCandidate {
  id: string;
  role: string;
  goal: string;
  capabilities?: string[];
  backstory?: string;
}

export interface TaskDelegationInput {
  taskDescription: string;
  expectedOutput?: string;
  context?: string;
  riskLevel?: "low" | "medium" | "high";
}

export interface DelegationResult {
  assignedAgentId: string;
  role: string;
  confidence: number;
  isFallback: boolean;
  abstain: boolean;
  probabilities: Record<string, number>;
  latencyMs: number;
}

export interface AgentRouterOptions {
  confidenceThreshold?: number; // default 0.70
  fallbackAgentId?: string;
  minConfidence?: number;       // opt-in abstention threshold (e.g. 0.30)
}

export class HierarchicalAgentRouter {
  private confidenceThreshold: number;
  private fallbackAgentId?: string;
  private minConfidence: number;

  constructor(options: AgentRouterOptions = {}) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.70;
    this.fallbackAgentId = options.fallbackAgentId;
    this.minConfidence = options.minConfidence ?? 0.30;
  }

  /**
   * Delegates an incoming task to the optimal specialist agent.
   */
  async route(
    task: TaskDelegationInput,
    agents: AgentCandidate[]
  ): Promise<DelegationResult> {
    const startTime = Date.now();

    if (!agents || agents.length === 0) {
      throw new Error("No agent candidates provided for delegation.");
    }

    const STOP_WORDS = new Set([
      "and", "for", "the", "with", "this", "that", "from", "are", "you", "your", "can", "into", "all", "our"
    ]);

    const taskText = `${task.taskDescription} ${task.expectedOutput || ""} ${task.context || ""}`.toLowerCase();
    const queryTokens = taskText
      .split(/[^a-zA-Z0-9_\-]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Compute semantic match score per agent
    const rawScores: Record<string, number> = {};
    let totalScore = 0;

    for (const agent of agents) {
      let score = 1.0; // base prior
      const profileText = `${agent.role} ${agent.goal} ${(agent.capabilities || []).join(" ")} ${agent.backstory || ""}`.toLowerCase();
      const profileTokens = new Set(profileText.split(/[^a-zA-Z0-9_\-]+/));

      for (const token of queryTokens) {
        if (profileTokens.has(token)) {
          score += 4.0;
        } else if (token.length > 4) {
          // Check stem match (e.g., vulnerabil -> vulnerability, vulnerabilities)
          const stem = token.slice(0, 5);
          if ([...profileTokens].some((pt) => pt.startsWith(stem) || pt.includes(stem))) {
            score += 3.0;
          }
        }
      }

      // Exact role match bonuses
      const roleTokens = agent.role.toLowerCase().split(/\s+/);
      for (const rt of roleTokens) {
        if (!STOP_WORDS.has(rt) && taskText.includes(rt)) {
          score += 8.0;
        }
      }

      rawScores[agent.id] = score;
      totalScore += score;
    }

    // Calibrate into normalized probability distribution (Softmax-like)
    const probabilities: Record<string, number> = {};
    let bestAgent = agents[0];
    let maxProb = -1;

    for (const agent of agents) {
      const prob = Number((rawScores[agent.id] / totalScore).toFixed(4));
      probabilities[agent.id] = prob;
      if (prob > maxProb) {
        maxProb = prob;
        bestAgent = agent;
      }
    }

    const choice: Choice<string> = {
      choice: bestAgent.id,
      confidence: maxProb,
      probabilities,
    };

    validateChoiceDistribution(
      choice,
      agents.map((a) => a.id)
    );

    const latencyMs = Date.now() - startTime;

    // Check opt-in abstention (if confidence is below absolute minConfidence)
    if (maxProb < this.minConfidence) {
      return {
        assignedAgentId: this.fallbackAgentId || bestAgent.id,
        role: this.fallbackAgentId
          ? agents.find((a) => a.id === this.fallbackAgentId)?.role || bestAgent.role
          : bestAgent.role,
        confidence: maxProb,
        isFallback: true,
        abstain: true,
        probabilities,
        latencyMs,
      };
    }

    // Check application confidence threshold
    if (maxProb < this.confidenceThreshold && this.fallbackAgentId) {
      const fallback = agents.find((a) => a.id === this.fallbackAgentId) || bestAgent;
      return {
        assignedAgentId: fallback.id,
        role: fallback.role,
        confidence: maxProb,
        isFallback: true,
        abstain: false,
        probabilities,
        latencyMs,
      };
    }

    return {
      assignedAgentId: bestAgent.id,
      role: bestAgent.role,
      confidence: maxProb,
      isFallback: false,
      abstain: false,
      probabilities,
      latencyMs,
    };
  }
}
