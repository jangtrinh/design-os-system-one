import test from "node:test";
import assert from "node:assert/strict";
import { JevMemoryCompactor, ChatMessageTurn } from "../src/index.js";

test("Milestone 5: JevMemoryCompactor does not trigger when under token budget", async () => {
  const compactor = new JevMemoryCompactor();

  const turns: ChatMessageTurn[] = [
    { id: "m1", role: "system", content: "You are an expert AI assistant" },
    { id: "m2", role: "user", content: "What is TypeScript?" },
    { id: "m3", role: "assistant", content: "TypeScript is typed JavaScript." },
  ];

  const result = await compactor.compact(turns, { targetTokenBudget: 5000, warningThresholdPct: 80 });

  assert.equal(result.compactionTriggered, false);
  assert.equal(result.tokensSaved, 0);
  assert.equal(result.compactedTurns.length, 3);
});

test("Milestone 5: JevMemoryCompactor retains decisions, evicts noise, and preserves latest buffer", async () => {
  const compactor = new JevMemoryCompactor();

  const turns: ChatMessageTurn[] = [
    // 1. Mandatory System Prompt
    { id: "t0", role: "system", content: "Global system invariant: Never disclose API credentials.", mandatory: true, tokenEstimate: 200 },

    // 2. Chitchat noise (should be evicted)
    { id: "t1", role: "user", content: "Hello! Good morning, how are you today?", tokenEstimate: 300 },
    { id: "t2", role: "assistant", content: "Hello! I am doing great, ready to assist you.", tokenEstimate: 300 },

    // 3. Core Architectural Decision (MUST be retained!)
    { id: "t3", role: "user", content: "Quyết định kiến trúc: Mọi LLM Gateway phải dùng JevGatewayRouter với quota $50.", tokenEstimate: 400 },
    { id: "t4", role: "assistant", content: "Đã chốt kiến trúc: Áp dụng rule JevGatewayRouter với invariant epoch check.", tokenEstimate: 400 },

    // 4. Temporary progress logs noise (should be evicted)
    { id: "t5", role: "assistant", content: "Đang tải... checking... done, log: build in progress...", tokenEstimate: 500 },

    // 5. Recent conversational buffer (last 3 turns MUST be retained)
    { id: "t6", role: "user", content: "Tiếp tục sửa file index.ts", tokenEstimate: 100 },
    { id: "t7", role: "assistant", content: "Đang mở file index.ts", tokenEstimate: 100 },
    { id: "t8", role: "user", content: "Thêm hàm mới vào dòng 40", tokenEstimate: 100 },
  ];

  // Total tokens: 200 + 300 + 300 + 400 + 400 + 500 + 100 + 100 + 100 = 2400 tokens
  // Target budget = 2000, 80% threshold = 1600 tokens -> Triggers compaction!
  const result = await compactor.compact(turns, {
    targetTokenBudget: 2000,
    warningThresholdPct: 80,
    alwaysRetainLastNTurns: 3,
  });

  assert.equal(result.compactionTriggered, true);

  // A. Pinned / System preserved
  assert.ok(result.retainedTurnIds.includes("t0"));

  // B. Core Decisions preserved
  assert.ok(result.retainedTurnIds.includes("t3"));
  assert.ok(result.retainedTurnIds.includes("t4"));

  // C. Noise evicted
  assert.ok(result.evictedTurnIds.includes("t1"));
  assert.ok(result.evictedTurnIds.includes("t2"));
  assert.ok(result.evictedTurnIds.includes("t5"));

  // D. Recent buffer preserved
  assert.ok(result.retainedTurnIds.includes("t6"));
  assert.ok(result.retainedTurnIds.includes("t7"));
  assert.ok(result.retainedTurnIds.includes("t8"));

  // E. Savings verified
  assert.ok(result.tokensSaved >= 1000);
  assert.ok(result.tokenReductionPct >= 40);
  assert.ok(result.retainedDecisionsSummary.length >= 1);
});
