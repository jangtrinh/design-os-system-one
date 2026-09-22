import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  estimateTokens,
  analyzeTokens,
  createIntentIdentity,
  parseIntentIdentity,
  isIntentFresh,
  TwoTierPersistentCache,
  limitConcurrency,
  Semaphore,
  createBinding,
  JevGatewayRouter,
  JevSkillPruner,
  JevMemoryCompactor,
} from "../src/index.js";

test("Hardening 1: Adaptive Multilingual Token Estimator", () => {
  // Empty & short text
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("hi"), 1);

  // English text
  const englishText = "The quick brown fox jumps over the lazy dog";
  const englishTokens = estimateTokens(englishText);
  assert.ok(englishTokens >= 9 && englishTokens <= 14, `Expected ~11 tokens, got ${englishTokens}`);

  // Vietnamese text with tone marks / diacritics
  const vietnameseText = "Hệ thống tự động nén bộ nhớ và định tuyến mô hình AI theo tiêu chuẩn bảo mật";
  const vnTokens = estimateTokens(vietnameseText);
  const naiveEstimate = Math.ceil(vietnameseText.length / 4);
  assert.ok(
    vnTokens > naiveEstimate,
    `BPE Vietnamese estimation (${vnTokens}) should exceed naive length/4 (${naiveEstimate})`
  );

  const detail = analyzeTokens(vietnameseText);
  assert.equal(detail.hasMultilingual, true);
  assert.ok(detail.vietnameseWordCount > 10);

  // CJK text
  const cjkText = "人工智能模型上下文压缩";
  const cjkTokens = estimateTokens(cjkText);
  assert.ok(cjkTokens >= 15, `CJK text should yield ~17 tokens, got ${cjkTokens}`);

  // Code snippets with lots of brackets & punctuation
  const codeSnippet = 'const x = { a: [1, 2, 3], b: () => { return "done"; } };';
  const codeTokens = estimateTokens(codeSnippet);
  assert.ok(codeTokens >= 15, `Code snippet should yield ~20 tokens, got ${codeTokens}`);
});

test("Hardening 2: Distributed Intent Identity & Collision Resistance", () => {
  const id1 = createIntentIdentity({ bindingHash: "scope_A", epoch: 100 });
  const id2 = createIntentIdentity({ bindingHash: "scope_A", epoch: 100 });

  // Monotonic sequence within same process
  assert.ok(id2.sequence > id1.sequence, "Sequence must be monotonically increasing");
  assert.notEqual(id1.key, id2.key, "Keys within same process must be distinct");

  // Simulated cross-machine differentiation (MacBook vs Mac Studio)
  const macbookId = createIntentIdentity({ machineId: "macbook-m2", epoch: 200, bindingHash: "same_scope" });
  const macStudioId = createIntentIdentity({ machineId: "mac-studio-m2-ultra", epoch: 200, bindingHash: "same_scope" });

  assert.notEqual(macbookId.key, macStudioId.key, "Cross-machine keys must never collide");
  assert.ok(macbookId.key.startsWith("macbook-m2:"));
  assert.ok(macStudioId.key.startsWith("mac-studio-m2-ultra:"));

  // Key serialization & parsing round-trip
  const parsed = parseIntentIdentity(macStudioId.key);
  assert.ok(parsed !== null);
  assert.equal(parsed.machineId, "mac-studio-m2-ultra");
  assert.equal(parsed.epoch, 200);

  // Freshness check
  const fresh = isIntentFresh(macStudioId, 200);
  assert.equal(fresh.valid, true);

  const stale = isIntentFresh(macStudioId, 250);
  assert.equal(stale.valid, false);
  assert.ok(stale.reason?.includes("older than current epoch"));

  // Binding envelope integration
  const binding = createBinding({ intentEpoch: 42, stateHash: "dom_123" });
  assert.ok(binding.identity !== undefined);
  assert.equal(binding.identity?.epoch, 42);
});

test("Hardening 3: Two-Tier Persistent Cache (L1 RAM + L2 Disk File)", () => {
  const tmpDir = path.join(os.tmpdir(), `jev_cache_test_${Date.now()}`);
  const diskPath = path.join(tmpDir, "cache.json");

  try {
    const cache1 = new TwoTierPersistentCache<string>({
      diskPath,
      autoPersistOnSet: true,
      maxEntries: 3,
    });

    cache1.set("prompt_1", "response_alpha");
    cache1.set("prompt_2", "response_beta");

    // L1 hit
    assert.equal(cache1.get("prompt_1"), "response_alpha");
    assert.equal(cache1.has("prompt_2"), true);

    // Verify disk file exists and contains entries
    assert.ok(fs.existsSync(diskPath));

    // Rehydration into new cache instance (simulating CLI restart)
    const cache2 = new TwoTierPersistentCache<string>({
      diskPath,
      autoPersistOnSet: true,
      maxEntries: 3,
    });

    assert.equal(cache2.get("prompt_1"), "response_alpha");
    assert.equal(cache2.get("prompt_2"), "response_beta");
    assert.equal(cache2.get("missing_key"), undefined);

    // LRU eviction test (maxEntries = 3)
    cache2.set("prompt_3", "response_gamma");
    cache2.set("prompt_4", "response_delta"); // Should evict oldest

    const stats = cache2.stats();
    assert.ok(stats.l1Size <= 3, `Expected at most 3 entries, got ${stats.l1Size}`);

    // Cleanup
    cache2.clear();
    assert.equal(fs.existsSync(diskPath), false);
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test("Hardening 4: Concurrency Limiter & Backpressure", async () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  let activeInFlight = 0;
  let maxObservedInFlight = 0;

  const results = await limitConcurrency(
    items,
    async (item) => {
      activeInFlight++;
      maxObservedInFlight = Math.max(maxObservedInFlight, activeInFlight);

      // Simulate micro-delay
      await new Promise((r) => setTimeout(r, 5));

      activeInFlight--;
      return item * 2;
    },
    4 // Max concurrency bound
  );

  assert.ok(
    maxObservedInFlight <= 4,
    `Observed in-flight ${maxObservedInFlight} exceeded max concurrency limit of 4`
  );
  assert.equal(results.length, 25);
  assert.equal(results[0], 0);
  assert.equal(results[24], 48); // Preserves exact input order
});

test("Hardening 5: Pre-Dispatch Intent Journaling & Reconciliation", async () => {
  const { CommitEngine } = await import(
    "../../../projects/jev-browser-cli/src/ultrafast/commit-engine.js"
  );

  const tmpJournal = path.join(os.tmpdir(), `jev_journal_${Date.now()}.json`);

  try {
    const engine = new CommitEngine({
      dispatchTimeoutMs: 100,
      enableJournaling: true,
      journalPath: tmpJournal,
    });

    const tx = engine.beginObservation("click_submit_btn", "external");

    // Execute with intentional timeout to trigger UNCERTAIN state
    const executedTx = await engine.execute({
      tx,
      judgeFn: async () => ({
        status: "ok",
        modelVersion: "jev-one",
        value: true,
        binding: tx.binding,
      }),
      dispatchFn: async () => {
        // Hang longer than dispatchTimeoutMs (100ms)
        await new Promise((r) => setTimeout(r, 200));
        return { clicked: true };
      },
    });

    assert.equal(executedTx.state, "UNCERTAIN");

    // Journal must exist and recover pending in-flight intent
    const pending = engine.recoverPendingIntents();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].txId, tx.txId);
    assert.equal(pending[0].state, "UNCERTAIN");

    engine.clearJournal();
    assert.equal(engine.recoverPendingIntents().length, 0);
  } finally {
    if (fs.existsSync(tmpJournal)) {
      fs.unlinkSync(tmpJournal);
    }
  }
});

test("Hardening Integration: Router and Pruner with TwoTierCache and TokenEstimator", async () => {
  const tmpDir = path.join(os.tmpdir(), `jev_router_cache_${Date.now()}`);
  const diskPath = path.join(tmpDir, "router-cache.json");

  try {
    const router = new JevGatewayRouter({
      diskCachePath: diskPath,
      enableDiskCache: true,
    });

    router.setExactCache("cách tối ưu hóa cấu trúc cơ sở dữ liệu postgresql", "dùng index brint");

    const plan = await router.route({
      request: "cách tối ưu hóa cấu trúc cơ sở dữ liệu postgresql",
      eligibleRoutes: ["small", "reasoning"],
      cacheCandidates: [],
      blocks: [],
    });

    assert.equal(plan.cacheHit, true);
    assert.equal(plan.recommendedModel, "exact-cache");

    // Verify pruner with concurrency and Vietnamese prompt
    const pruner = new JevSkillPruner();
    const pruneResult = await pruner.prune({
      prompt: "Tôi cần thiết kế giao diện frontend với react và tailwind ui styling",
      availableSkills: [
        { name: "ak:frontend-development", description: "Build React TypeScript interfaces" },
        { name: "ak:ui-styling", description: "Style UI with Tailwind CSS and shadcn" },
        { name: "ak:payment-integration", description: "Payment gateways with Stripe and SePay" },
        { name: "ak:shopify", description: "Shopify theme and apps" },
      ],
      policy: { concurrency: 2 },
    });

    assert.ok(pruneResult.selectedSkills.includes("ak:frontend-development"));
    assert.ok(pruneResult.selectedSkills.includes("ak:ui-styling"));
    assert.ok(!pruneResult.selectedSkills.includes("ak:shopify"));
    assert.ok(pruneResult.tokenReductionPct >= 50);
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});
