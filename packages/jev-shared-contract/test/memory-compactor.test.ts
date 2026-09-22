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

test("Milestone 5: Handles empty turns and single turn safely without crashing", async () => {
  const compactor = new JevMemoryCompactor();
  const emptyRes = await compactor.compact([]);
  assert.equal(emptyRes.compactionTriggered, false);
  assert.equal(emptyRes.compactedTurns.length, 0);

  const singleRes = await compactor.compact([
    { id: "s1", role: "user", content: "hello", tokenEstimate: 10 },
  ]);
  assert.equal(singleRes.compactionTriggered, false);
  assert.equal(singleRes.compactedTurns.length, 1);
});

test("Milestone 5: Long 20-turn session compaction retains multiple decisions and prunes chatter", async () => {
  const compactor = new JevMemoryCompactor();

  const turns: ChatMessageTurn[] = [
    { id: "t0", role: "system", content: "You are an AI assistant in /Users/jang/Products", mandatory: true, tokenEstimate: 100 },
    // Chatter
    { id: "t1", role: "user", content: "Chào bạn", tokenEstimate: 50 },
    { id: "t2", role: "assistant", content: "Chào bạn, tôi có thể giúp gì?", tokenEstimate: 50 },
    // Decision 1
    { id: "t3", role: "user", content: "Quyết định: Sử dụng PostgreSQL và Prisma ORM cho backend", tokenEstimate: 300 },
    { id: "t4", role: "assistant", content: "Đã chốt: Kiến trúc cơ sở dữ liệu dùng PostgreSQL", tokenEstimate: 200 },
    // Chatter
    { id: "t5", role: "user", content: "Ok tuyệt vời", tokenEstimate: 30 },
    { id: "t6", role: "assistant", content: "Đang tải... checking...", tokenEstimate: 200 },
    // Decision 2
    { id: "t7", role: "user", content: "Yêu cầu kỹ thuật: Invariant epoch check trong commit engine", tokenEstimate: 350 },
    { id: "t8", role: "assistant", content: "Đã xác nhận rule epoch check trong contract", tokenEstimate: 250 },
    // Chatter
    { id: "t9", role: "user", content: "Thanks!", tokenEstimate: 30 },
    { id: "t10", role: "assistant", content: "done, log: status ok", tokenEstimate: 150 },
    // Decision 3
    { id: "t11", role: "user", content: "Quy định bảo mật: Không commit file .env vào git", tokenEstimate: 250 },
    { id: "t12", role: "assistant", content: "Đã thêm rule .gitignore chặn .env", tokenEstimate: 200 },
    // Recent buffer (last 4 turns)
    { id: "t13", role: "user", content: "Mở file package.json", tokenEstimate: 80 },
    { id: "t14", role: "assistant", content: "File package.json đã mở", tokenEstimate: 80 },
    { id: "t15", role: "user", content: "Thêm script build", tokenEstimate: 80 },
    { id: "t16", role: "assistant", content: "Đã thêm script build vào dòng 10", tokenEstimate: 100 },
  ];

  // Total tokens = ~2500 tokens. Budget = 1500 -> triggers compaction
  const result = await compactor.compact(turns, {
    targetTokenBudget: 1500,
    warningThresholdPct: 70,
    alwaysRetainLastNTurns: 4,
  });

  assert.equal(result.compactionTriggered, true);

  // System pinned
  assert.ok(result.retainedTurnIds.includes("t0"));

  // All 3 major decisions preserved
  assert.ok(result.retainedTurnIds.includes("t3"), "Decision 1 must be kept");
  assert.ok(result.retainedTurnIds.includes("t4"), "Decision 1 ack must be kept");
  assert.ok(result.retainedTurnIds.includes("t7"), "Decision 2 must be kept");
  assert.ok(result.retainedTurnIds.includes("t8"), "Decision 2 ack must be kept");
  assert.ok(result.retainedTurnIds.includes("t11"), "Decision 3 must be kept");
  assert.ok(result.retainedTurnIds.includes("t12"), "Decision 3 ack must be kept");

  // All noise evicted
  assert.ok(result.evictedTurnIds.includes("t1"));
  assert.ok(result.evictedTurnIds.includes("t2"));
  assert.ok(result.evictedTurnIds.includes("t5"));
  assert.ok(result.evictedTurnIds.includes("t6"));
  assert.ok(result.evictedTurnIds.includes("t9"));
  assert.ok(result.evictedTurnIds.includes("t10"));

  // Latest 4 turns preserved
  assert.ok(result.retainedTurnIds.includes("t13"));
  assert.ok(result.retainedTurnIds.includes("t14"));
  assert.ok(result.retainedTurnIds.includes("t15"));
  assert.ok(result.retainedTurnIds.includes("t16"));

  assert.ok(result.tokenReductionPct >= 20, `Expected >= 20%, got ${result.tokenReductionPct}%`);
  assert.ok(result.retainedDecisionsSummary.length >= 3);
});

test("Milestone 5: Pure noise conversation is aggressively pruned (>70%)", async () => {
  const compactor = new JevMemoryCompactor();

  const turns: ChatMessageTurn[] = [
    { id: "n0", role: "system", content: "Bot system", mandatory: true, tokenEstimate: 50 },
    { id: "n1", role: "user", content: "Hello", tokenEstimate: 100 },
    { id: "n2", role: "assistant", content: "Hi there", tokenEstimate: 100 },
    { id: "n3", role: "user", content: "How are you?", tokenEstimate: 100 },
    { id: "n4", role: "assistant", content: "I am fine", tokenEstimate: 100 },
    { id: "n5", role: "user", content: "Good to know", tokenEstimate: 100 },
    { id: "n6", role: "assistant", content: "Anything else?", tokenEstimate: 100 },
    { id: "n7", role: "user", content: "No thanks", tokenEstimate: 100 },
    { id: "n8", role: "assistant", content: "Have a nice day!", tokenEstimate: 100 },
    // Buffer (last 2)
    { id: "n9", role: "user", content: "Bye", tokenEstimate: 50 },
    { id: "n10", role: "assistant", content: "Goodbye!", tokenEstimate: 50 },
  ];

  const result = await compactor.compact(turns, {
    targetTokenBudget: 400,
    warningThresholdPct: 80,
    alwaysRetainLastNTurns: 2,
  });

  assert.equal(result.compactionTriggered, true);
  assert.ok(result.tokenReductionPct >= 70, `Expected >= 70%, got ${result.tokenReductionPct}%`);
  assert.equal(result.compactedTurns.length, 3); // n0 + n9 + n10
});

test("Milestone 5: Pure architectural decisions conversation pins all critical constraints", async () => {
  const compactor = new JevMemoryCompactor();

  const turns: ChatMessageTurn[] = [
    { id: "d0", role: "system", content: "Architecture engine", mandatory: true, tokenEstimate: 50 },
    { id: "d1", role: "user", content: "Quyết định: Sử dụng Microservices architecture", tokenEstimate: 200 },
    { id: "d2", role: "assistant", content: "Đã chốt: Microservices với gRPC communication", tokenEstimate: 200 },
    { id: "d3", role: "user", content: "Requirement: Quota rate limiting 1000 req/sec", tokenEstimate: 200 },
    { id: "d4", role: "assistant", content: "Đã áp dụng rule rate limiting trong Redis", tokenEstimate: 200 },
    // Buffer
    { id: "d5", role: "user", content: "Tiến hành deploy", tokenEstimate: 50 },
    { id: "d6", role: "assistant", content: "Đang bắt đầu deploy", tokenEstimate: 50 },
  ];

  const result = await compactor.compact(turns, {
    targetTokenBudget: 600,
    warningThresholdPct: 70,
    alwaysRetainLastNTurns: 2,
  });

  assert.equal(result.compactionTriggered, true);
  // All 4 decision turns must be retained despite budget pressure
  assert.ok(result.retainedTurnIds.includes("d1"));
  assert.ok(result.retainedTurnIds.includes("d2"));
  assert.ok(result.retainedTurnIds.includes("d3"));
  assert.ok(result.retainedTurnIds.includes("d4"));
  assert.equal(result.evictedTurnIds.length, 0);
});
