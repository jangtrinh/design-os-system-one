import test from "node:test";
import assert from "node:assert/strict";
import {
  createBinding,
  validateChoiceDistribution,
  validateResult,
  Choice,
  Result,
  GatewayDecisionInput,
  GatewayDecisionOutput,
} from "../src/index.js";

test("Shared Contract: validates gateway routing payload", () => {
  const binding = createBinding({
    intentEpoch: 1,
    stateHash: "hash_gateway_prompt",
    scopeHash: "tenant_vinfast_auto",
  });

  const gatewayOutput: GatewayDecisionOutput = {
    route: {
      choice: "small",
      confidence: 0.94,
      probabilities: {
        small: 0.94,
        reasoning: 0.04,
        review: 0.02,
      },
    },
    cacheApplicability: {
      "cache_1": { noul: 0.88 },
    },
    blockRelevance: {
      "block_rag_1": {
        score: 4,
        confidence: 0.91,
        probabilities: { "1": 0.01, "2": 0.04, "3": 0.15, "4": 0.80 },
      },
    },
  };

  const choiceCheck = validateChoiceDistribution(gatewayOutput.route, ["small", "reasoning", "review"]);
  assert.equal(choiceCheck.valid, true);

  const result: Result<GatewayDecisionOutput> = {
    status: "ok",
    modelVersion: "jev-1.13.0",
    binding,
    value: gatewayOutput,
  };

  const resCheck = validateResult(result, 1);
  assert.equal(resCheck.valid, true);
});

test("JevGatewayRouter: prunes context and routes model tier globally", async () => {
  const { JevGatewayRouter } = await import("../src/index.js");
  const router = new JevGatewayRouter();

  const plan = await router.route({
    request: "How to configure PostgreSQL connection pool?",
    eligibleRoutes: ["small", "reasoning", "review"],
    cacheCandidates: [],
    blocks: [
      { id: "b1", text: "Database connection pool settings for PostgreSQL", mandatory: false, tokenEstimate: 100 },
      { id: "b2", text: "Unrelated recipes for cooking Italian pasta", mandatory: false, tokenEstimate: 400 },
    ],
  });

  assert.equal(plan.selectedRoute, "small");
  assert.equal(plan.recommendedModel, "gpt-4o-mini");
  assert.ok(plan.retainedBlockIds.includes("b1"));
  assert.ok(plan.prunedBlockIds.includes("b2"));
  assert.equal(plan.tokensSaved, 400);
  assert.equal(plan.tokenReductionPct, 80);
});
