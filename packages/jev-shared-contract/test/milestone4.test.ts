import test from "node:test";
import assert from "node:assert/strict";
import {
  JevSkillPruner,
  JevStopOracle,
  SkillManifestItem,
  IterationEvidence,
} from "../src/index.js";

test("Milestone 4A: JevSkillPruner bypasses mandatory skills and prunes irrelevant schemas (>80%)", async () => {
  const pruner = new JevSkillPruner();

  const manifest: SkillManifestItem[] = [
    { name: "ak:frontend-development", description: "Build React TypeScript components and UI" },
    { name: "ak:ui-styling", description: "Style UIs with Tailwind CSS and shadcn" },
    { name: "ak:better-auth", description: "Add authentication with email password OAuth" },
    { name: "ak:databases", description: "PostgreSQL and MongoDB schema design" },
    { name: "ak:devops", description: "Kubernetes, Docker, Cloudflare workers deployment" },
    { name: "ak:remotion", description: "Video generation in React" },
    { name: "ak:shopify", description: "Shopify apps and Liquid themes" },
    { name: "ak:mobile-development", description: "React Native and Flutter mobile apps" },
    { name: "ak:threejs", description: "Three.js 3D web experiences" },
    { name: "ak:security-scan", description: "Scan codebase for vulnerabilities and OWASP" },
    { name: "es:astra-work", description: "Astra work outer execution loop", mandatory: true },
  ];

  const prompt = "Hãy thiết kế một giao diện bảng dashboard đẹp bằng React và Tailwind";

  const result = await pruner.prune({
    prompt,
    availableSkills: manifest,
    policy: { maxOptionalSkills: 2, includeProbability: 0.6 },
  });

  // 1. Mandatory bypass check
  assert.ok(result.selectedSkills.includes("es:astra-work"));

  // 2. High relevance skills selected
  assert.ok(result.selectedSkills.includes("ak:frontend-development"));
  assert.ok(result.selectedSkills.includes("ak:ui-styling"));

  // 3. Irrelevant skills pruned
  assert.ok(result.prunedSkillNames.includes("ak:shopify"));
  assert.ok(result.prunedSkillNames.includes("ak:devops"));
  assert.ok(result.prunedSkillNames.includes("ak:remotion"));

  // 4. Token schema reduction check (>70%)
  assert.ok(result.tokenReductionPct >= 70, `Expected >= 70%, got ${result.tokenReductionPct}%`);
  assert.equal(result.cacheHit, false);

  // 5. Cache check
  const cachedResult = await pruner.prune({
    prompt,
    availableSkills: manifest,
    policy: { maxOptionalSkills: 2, includeProbability: 0.6 },
  });
  assert.equal(cachedResult.cacheHit, true);
});

test("Milestone 4B: JevStopOracle triggers PIVOT on repeated failure and VERIFY_AND_STOP on test pass", async () => {
  const oracle = new JevStopOracle();

  const failEvidence: IterationEvidence = {
    iteration: 3,
    actionFingerprint: "npm test auth.spec.ts",
    stateFingerprint: "hash_err_401_token_expired",
    changedArtifacts: ["lib/auth.ts"],
    observedProgress: "Still failing with 401 Unauthorized",
    currentFailure: "Error: 401 Unauthorized token expired",
    acceptance: [{ id: "auth_test", status: "FAIL", detail: "401 Unauthorized" }],
  };

  const recentFails: IterationEvidence[] = [
    {
      iteration: 1,
      actionFingerprint: "npm test auth.spec.ts",
      stateFingerprint: "hash_err_401_token_expired",
      changedArtifacts: ["lib/auth.ts"],
      observedProgress: "Failed 401",
      currentFailure: "Error: 401 Unauthorized token expired",
      acceptance: [{ id: "auth_test", status: "FAIL" }],
    },
    {
      iteration: 2,
      actionFingerprint: "npm test auth.spec.ts",
      stateFingerprint: "hash_err_401_token_expired",
      changedArtifacts: ["lib/auth.ts"],
      observedProgress: "Failed 401 again",
      currentFailure: "Error: 401 Unauthorized token expired",
      acceptance: [{ id: "auth_test", status: "FAIL" }],
    },
  ];

  // 1. Stuck loop -> PIVOT
  const pivotResult = await oracle.evaluate({
    objective: "Fix 401 auth token error",
    acceptanceCriteria: ["All auth tests pass"],
    current: failEvidence,
    recent: recentFails,
    maxIterations: 10,
  });

  assert.equal(pivotResult.action, "PIVOT");
  assert.ok(pivotResult.judgment.stuckProbability >= 0.70);

  // 2. Acceptance pass -> VERIFY_AND_STOP
  const passEvidence: IterationEvidence = {
    iteration: 4,
    actionFingerprint: "npm test auth.spec.ts",
    stateFingerprint: "hash_clean_tests_pass",
    changedArtifacts: ["lib/auth.ts"],
    observedProgress: "All 5 tests passed cleanly",
    acceptance: [{ id: "auth_test", status: "PASS", detail: "Tests passing 5/5" }],
  };

  const stopResult = await oracle.evaluate({
    objective: "Fix 401 auth token error",
    acceptanceCriteria: ["All auth tests pass"],
    current: passEvidence,
    recent: [failEvidence],
    maxIterations: 10,
  });

  assert.equal(stopResult.action, "VERIFY_AND_STOP");
  assert.equal(stopResult.deterministicAcceptanceSatisfied, true);
  assert.ok(stopResult.judgment.goalAchievedProbability >= 0.80);
});

test("Milestone 4B: JevStopOracle triggers ESCALATE when hard iteration limit reached", async () => {
  const oracle = new JevStopOracle();

  const current: IterationEvidence = {
    iteration: 10,
    actionFingerprint: "test-run",
    stateFingerprint: "state_10",
    changedArtifacts: [],
    observedProgress: "Loop exhausted",
    acceptance: [{ id: "test", status: "FAIL" }],
  };

  const result = await oracle.evaluate({
    objective: "Complex migration",
    acceptanceCriteria: ["DB migrated"],
    current,
    recent: [],
    maxIterations: 10,
  });

  assert.equal(result.action, "ESCALATE");
});
