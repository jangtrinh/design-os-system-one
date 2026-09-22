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
