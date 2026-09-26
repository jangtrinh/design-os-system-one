import { test } from 'node:test';
import assert from 'node:assert';
import {
  JevGatewayRouter,
  validateChoiceDistribution,
  validateResult,
  JevSkillPruner,
  JevStopOracle,
} from '../src/index.js';

test('Security Guard: exactCache does NOT collide on prompts sharing first 12 bytes', async () => {
  const router = new JevGatewayRouter();
  const promptA = '123456789012 alpha prompt for testing';
  const promptB = '123456789012 beta prompt for testing';

  router.setExactCache(promptA, 'response_A');

  const planA = await router.route({
    request: promptA,
    eligibleRoutes: ['small'],
    cacheCandidates: [],
    blocks: [],
  });
  assert.strictEqual(planA.cacheHit, true, 'Prompt A should hit cache');

  const planB = await router.route({
    request: promptB,
    eligibleRoutes: ['small'],
    cacheCandidates: [],
    blocks: [],
  });
  assert.strictEqual(planB.cacheHit, false, 'Prompt B must NOT hit cache of prompt A');
});

test('Security Guard: Router strictly enforces eligibleRoutes constraint', async () => {
  const router = new JevGatewayRouter();
  // Prompt contains "architect" which normally routes to "reasoning"
  const plan = await router.route({
    request: 'Please architect a distributed event system',
    eligibleRoutes: ['review'], // Only review is allowed!
    cacheCandidates: [],
    blocks: [],
  });

  assert.strictEqual(plan.selectedRoute, 'review', 'Must stay within eligibleRoutes');
});

test('Security Guard: validateChoiceDistribution rejects distribution with foreign keys', () => {
  const result = validateChoiceDistribution(
    {
      choice: 'small',
      confidence: 0.9,
      probabilities: {
        small: 0.9,
        foreign_option: 0.1, // Not allowed!
      } as any,
    },
    ['small', 'reasoning']
  );

  assert.strictEqual(result.valid, false);
  assert.match(result.error || '', /foreign_option/i);
});

test('Security Guard: validateResult rejects invalid status', () => {
  const result = validateResult(
    {
      status: 'invalid_status_xyz' as any,
      binding: {
        scopeHash: 'test',
        intentEpoch: 1,
        stateHash: 'dom',
        candidateSetHash: 'cand',
        policyVersion: 'v1',
        expiresAtMs: Date.now() + 10000,
      },
    },
    1
  );

  assert.strictEqual(result.valid, false);
  assert.match(result.error || '', /status/i);
});

test('Security Guard: Skill Pruner cache invalidates when skill is marked mandatory', async () => {
  const pruner = new JevSkillPruner();
  const prompt = 'build a simple webpage';

  // 1. Initial prune with skill optional
  const res1 = await pruner.prune({
    prompt,
    availableSkills: [
      { name: 'deep_kernel_optimizer', description: 'C++ CUDA optimizer', mandatory: false },
    ],
  });
  assert.strictEqual(res1.selectedSkills.includes('deep_kernel_optimizer'), false);

  // 2. Toggle same skill to mandatory
  const res2 = await pruner.prune({
    prompt,
    availableSkills: [
      { name: 'deep_kernel_optimizer', description: 'C++ CUDA optimizer', mandatory: true },
    ],
  });
  assert.strictEqual(res2.selectedSkills.includes('deep_kernel_optimizer'), true, 'Mandatory skill must be retained and not served from stale non-mandatory cache');
});

test('Security Guard: Stop Oracle requires 100% acceptance criteria coverage before stopping', async () => {
  const oracle = new JevStopOracle();

  // 2 acceptance criteria, but only 1 evidence provided
  const res = await oracle.evaluate({
    objective: 'Deploy and test service',
    acceptanceCriteria: ['build_passes', 'e2e_tests_pass'],
    current: {
      iteration: 1,
      actionFingerprint: 'act_1',
      stateFingerprint: 'state_1',
      changedArtifacts: [],
      observedProgress: 'Build passed',
      acceptance: [
        { id: 'build_passes', status: 'PASS' },
        // e2e_tests_pass is missing!
      ],
    },
    recent: [],
    maxIterations: 5,
  });

  assert.strictEqual(res.deterministicAcceptanceSatisfied, false, 'Partial criteria satisfaction cannot be satisfied');
  assert.notStrictEqual(res.action, 'VERIFY_AND_STOP', 'Must not stop when acceptance coverage < 100%');
});
