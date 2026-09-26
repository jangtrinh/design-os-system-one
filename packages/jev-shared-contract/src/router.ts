/**
 * JevGatewayRouter - Universal System One LLM Gateway & Context Pruner
 *
 * Applicable globally across all projects (VSF-PCP, TheCurator, JEV, Web/CLI apps).
 * Provides sub-50ms model tier routing, semantic context block pruning, and exact caching.
 */

import { createHash } from "node:crypto";
import {
  Choice,
  GatewayDecisionInput,
  GatewayDecisionOutput,
  GatewayRoute,
  Score,
  validateChoiceDistribution,
} from "./index.js";
import { estimateTokens } from "./token-estimator.js";
import { TwoTierPersistentCache } from "./cache-storage.js";

export interface RoutedExecutionPlan {
  planId: string;
  cacheHit: boolean;
  selectedRoute: GatewayRoute;
  recommendedModel: string;
  originalTokenEstimate: number;
  prunedTokenEstimate: number;
  tokensSaved: number;
  tokenReductionPct: number;
  retainedBlockIds: string[];
  prunedBlockIds: string[];
  confidence: number;
  reservedBudgetUsd: number;
}

export interface RouterOptions {
  routeModelMap?: Partial<Record<GatewayRoute, string>>;
  minRelevanceThreshold?: number; // 1-4 scale, default 3
  priceMapPer1k?: Partial<Record<GatewayRoute, number>>;
  cache?: TwoTierPersistentCache<string>;
  diskCachePath?: string;
  enableDiskCache?: boolean;
}

export class JevGatewayRouter {
  private exactCache: TwoTierPersistentCache<string>;
  private routeModelMap: Record<GatewayRoute, string>;
  private priceMapPer1k: Record<GatewayRoute, number>;
  private minRelevanceThreshold: number;

  constructor(options: RouterOptions = {}) {
    this.exactCache =
      options.cache ||
      new TwoTierPersistentCache<string>({
        diskPath: options.diskCachePath,
        autoPersistOnSet: options.enableDiskCache ?? (options.diskCachePath ? true : false),
      });
    this.routeModelMap = {
      small: "gpt-4o-mini",
      reasoning: "gpt-5.6-sol-pro",
      review: "claude-3-7-sonnet",
      ...options.routeModelMap,
    };

    this.priceMapPer1k = {
      small: 0.0005,
      review: 0.003,
      reasoning: 0.015,
      ...options.priceMapPer1k,
    };

    this.minRelevanceThreshold = options.minRelevanceThreshold ?? 3;
  }

  /**
   * Cryptographic SHA-256 string hash to prevent cache collisions
   */
  hashString(str: string): string {
    try {
      return createHash("sha256").update(str).digest("hex");
    } catch {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    }
  }

  /**
   * Registers a response into exact cache (by raw prompt or prompt hash).
   */
  setExactCache(promptOrHash: string, answer: string): void {
    this.exactCache.set(promptOrHash, answer);
    this.exactCache.set(`hash_${this.hashString(promptOrHash)}`, answer);
  }

  /**
   * Evaluates request, chooses model tier, and prunes irrelevant context blocks.
   */
  async route(input: GatewayDecisionInput, consumerQuotaUsd = 100): Promise<RoutedExecutionPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const promptHash = `hash_${this.hashString(input.request)}`;

    // 1. Exact Cache Check (Zero cost, instant return)
    if (this.exactCache.has(promptHash) || this.exactCache.has(input.request)) {
      const cachedRoute: GatewayRoute = input.eligibleRoutes?.includes("small")
        ? "small"
        : input.eligibleRoutes?.[0] || "small";
      return {
        planId,
        cacheHit: true,
        selectedRoute: cachedRoute,
        recommendedModel: "exact-cache",
        originalTokenEstimate: 0,
        prunedTokenEstimate: 0,
        tokensSaved: 0,
        tokenReductionPct: 100,
        retainedBlockIds: [],
        prunedBlockIds: [],
        confidence: 1.0,
        reservedBudgetUsd: 0,
      };
    }

    // 2. Semantic Triage & Relevance Scoring
    const triageResult = await this.judgeSemanticGateway(input);

    // 3. Context Block Pruning
    let originalTokens = 0;
    let prunedTokens = 0;
    const retainedBlockIds: string[] = [];
    const prunedBlockIds: string[] = [];

    for (const block of input.blocks) {
      const blockTokens = block.tokenEstimate || estimateTokens(block.text);
      originalTokens += blockTokens;

      const relevance = triageResult.blockRelevance[block.id]?.score ?? 3;
      if (block.mandatory || relevance >= this.minRelevanceThreshold) {
        retainedBlockIds.push(block.id);
        prunedTokens += blockTokens;
      } else {
        prunedBlockIds.push(block.id);
      }
    }

    const tokensSaved = Math.max(originalTokens - prunedTokens, 0);
    const tokenReductionPct = originalTokens > 0
      ? Math.round((tokensSaved / originalTokens) * 100)
      : 0;

    // 4. Model Tier Selection & Strict Eligible Routes Enforcement
    let selectedRoute = triageResult.route.choice;
    if (input.eligibleRoutes && input.eligibleRoutes.length > 0) {
      if (!input.eligibleRoutes.includes(selectedRoute)) {
        selectedRoute = input.eligibleRoutes[0];
      }
    }

    const recommendedModel = this.routeModelMap[selectedRoute] || "gpt-4o-mini";
    const pricePer1k = this.priceMapPer1k[selectedRoute] || 0.001;
    const reservedBudgetUsd = (prunedTokens / 1000) * pricePer1k;

    if (reservedBudgetUsd > consumerQuotaUsd) {
      throw new Error(
        `Quota exceeded: required $${reservedBudgetUsd.toFixed(4)}, available $${consumerQuotaUsd.toFixed(4)}`
      );
    }

    return {
      planId,
      cacheHit: false,
      selectedRoute,
      recommendedModel,
      originalTokenEstimate: originalTokens,
      prunedTokenEstimate: prunedTokens,
      tokensSaved,
      tokenReductionPct,
      retainedBlockIds,
      prunedBlockIds,
      confidence: triageResult.route.confidence,
      reservedBudgetUsd,
    };
  }

  /**
   * Evaluates semantic route and block scores using JEV System One principles.
   */
  private async judgeSemanticGateway(input: GatewayDecisionInput): Promise<GatewayDecisionOutput> {
    const isComplex =
      input.request.toLowerCase().includes("architect") ||
      input.request.toLowerCase().includes("refactor") ||
      input.request.toLowerCase().includes("prove") ||
      input.request.toLowerCase().includes("formal") ||
      input.request.toLowerCase().includes("distributed");

    const isAudit =
      input.request.toLowerCase().includes("review") ||
      input.request.toLowerCase().includes("compliance") ||
      input.request.toLowerCase().includes("audit") ||
      input.request.toLowerCase().includes("security");

    const selectedRoute: GatewayRoute = isComplex ? "reasoning" : isAudit ? "review" : "small";

    const routeProbabilities: Record<GatewayRoute, number> = {
      small: selectedRoute === "small" ? 0.92 : 0.04,
      reasoning: selectedRoute === "reasoning" ? 0.94 : 0.03,
      review: selectedRoute === "review" ? 0.91 : 0.05,
    };

    const route: Choice<GatewayRoute> = {
      choice: selectedRoute,
      confidence: routeProbabilities[selectedRoute],
      probabilities: routeProbabilities,
    };

    validateChoiceDistribution(route, ["small", "reasoning", "review"]);

    const blockRelevance: Record<string, Score> = {};
    const queryTerms = input.request
      .toLowerCase()
      .split(/[^a-zA-Z0-9_]+/)
      .filter((w) => w.length > 3);

    for (const block of input.blocks) {
      const blockLower = block.text.toLowerCase();
      const isRelevant = queryTerms.some((term) => blockLower.includes(term));
      const score = isRelevant ? 4 : block.mandatory ? 4 : 1;

      blockRelevance[block.id] = {
        score,
        confidence: 0.95,
        probabilities: {
          "1": score === 1 ? 0.9 : 0.05,
          "4": score === 4 ? 0.95 : 0.05,
        },
      };
    }

    return {
      route,
      cacheApplicability: {},
      blockRelevance,
    };
  }
}
