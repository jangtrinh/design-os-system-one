# Implementation Plan: TypeSafe JEV Security & Boundary Hardening

## Overview
Decompose the 8 audited vulnerabilities into 5 vertical slices with atomic verification.

## Seams Under Test
1. `commit-engine.ts`: `executeStepWithCommitEngine(step, dispatchFn, verifier)`
2. `agent.ts`: `runUltrafastLoop(...)`
3. `router.ts`: `JevGatewayRouter.prototype.judgeSemanticGateway(...)`
4. `composer.ts`: `FastGenUIComposer.prototype.compose(...)`
5. `skill-pruner.ts`: `pruneSkillsWithNoul(...)`
6. `stop-oracle.ts`: `StopConditionOracle.prototype.evaluate(...)`

## Slices & Phases

### Phase 1: Hardening Browser Commit Engine & Agent Safety (P0 & P1)
- Files:
  - `projects/jev-browser-cli/src/ultrafast/commit-engine.ts`
  - `projects/jev-browser-cli/src/ultrafast/agent.ts`
  - `projects/jev-browser-cli/test/commit-engine-security.test.ts`
- Changes:
  1. Add `isExpired` & pre-dispatch binding checks in `commit-engine.ts`.
  2. Implement state machine with `PREPARED`, `DISPATCHED`, `VERIFYING`, `CONFIRMED`, `BLOCKED`, `UNVERIFIED`, `UNKNOWN`.
  3. Require `postconditionVerifier` for high-risk actions.
  4. In `agent.ts`: Remove autonomous `DONE` resolution; trigger postcondition verification or transition to `UNKNOWN`. Handle `UNCERTAIN` by halting and requesting reconciliation.
- Acceptance Verification:
  - Test passes: Expired transaction rejected.
  - Test passes: Missing verifier on high-risk action yields `BLOCKED`.
  - Test passes: Unknown state triggers read-only reconciliation without duplicate dispatch.

### Phase 2: Router Cache Cryptographic Integrity & Route Filtering (P1)
- Files:
  - `packages/jev-shared-contract/src/router.ts`
  - `packages/jev-shared-contract/test/router-security.test.ts`
- Changes:
  1. Replace 16-char Base64 hash with SHA-256 hash across canonical inputs.
  2. Enforce strict `eligibleRoutes` filtering.
- Acceptance Verification:
  - Test passes: Prompts sharing first 12 bytes produce distinct cache keys (no collision).
  - Test passes: Selected route is strictly within `eligibleRoutes`.

### Phase 3: Fast GenUI Local-First Isolation & Latency Budget (P1)
- Files:
  - `/Users/jangtrinh/Products/design-os-generative-ui/src/engine/composer.ts`
  - `/Users/jangtrinh/Products/design-os-generative-ui/test/composer-security.test.ts`
- Changes:
  1. Enforce `localOnly` at constructor and method invocation level.
  2. Add `AbortController` cancellation on 50ms budget.
  3. Full validation of `UISpecSchema`.
- Acceptance Verification:
  - Test passes: `localOnly: true` never invokes Cloud endpoint under mock network.
  - Test passes: Timeout aborts fetch request immediately.

### Phase 4: Skill Pruner Mandatory Protection & Stop Oracle 100% Coverage (P1)
- Files:
  - `packages/jev-shared-contract/src/skill-pruner.ts`
  - `packages/jev-shared-contract/src/stop-oracle.ts`
  - `packages/jev-shared-contract/test/pruner-oracle-security.test.ts`
- Changes:
  1. Full SHA-256 cache key in `skill-pruner.ts` incorporating `mandatory` flags.
  2. Unconditional preservation of `mandatory: true` skills.
  3. Stop condition requires 100% coverage of acceptance criteria.
- Acceptance Verification:
  - Test passes: Toggling a skill to mandatory immediately invalidates stale cache and retains skill.
  - Test passes: 1 of 2 acceptance criteria PASS does not trigger `VERIFY_AND_STOP`.

### Phase 5: Conformance Test Suite & Verification (All packages)
- Run all test suites across `packages/jev-shared-contract`, `projects/jev-browser-cli`, and `design-os-generative-ui`.
- Curate to ByteRover (`brv curate`).
