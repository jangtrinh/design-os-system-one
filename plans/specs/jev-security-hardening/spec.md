# Specification: TypeSafe JEV Security Hardening & Execution Boundaries

## 1. Context & Objectives
Following the comprehensive architecture audit by Codex Astra (`gpt-6-astra`) and the Adversarial Red Team Debate, this specification defines the hard execution boundaries, state machines, and invariants required to bring the TypeSafe JEV ecosystem to production-grade resilience.

## 2. Invariants & Rules
1. **Rule of Intent vs Execution:** System One (JEV / Laya-MLX) proposes intents and ranks candidates. Only deterministic code and policy authorize and execute mutations.
2. **Rule of Postcondition Evidence:** `CONFIRMED` requires verified postcondition evidence observed after the mutation. A successful transport dispatch is merely `DISPATCHED`.
3. **Rule of No Autonomous Completion:** Models cannot declare a task `DONE`. Completion is strictly governed by deterministic acceptance verification.
4. **Rule of Strict Isolation:** When `localOnly: true` is asserted, no egress to Cloud is permitted under any circumstance.
5. **Rule of 100% Acceptance Coverage:** Stop Condition Oracle cannot stop early on partial evidence. Every acceptance criterion must have explicit passing proof.
6. **Rule of Collision-Free Caching:** All cache keys must use cryptographic SHA-256 over canonicalized inputs, including policy, context, and mandatory flags.

## 3. Architecture & State Machines

### 3.1 Browser Commit Engine State Machine
```text
PREPARED ──► DISPATCHED ──► VERIFYING ──► CONFIRMED
    │                               │
    ├──► BLOCKED (missing verifier) └──► UNKNOWN ──► Read-only Reconciliation
    │
    └──► UNVERIFIED (low risk)
```

- **Precondition Binding:** Before dispatch, bind `epoch`, `stateHash`, `actionType`, `targetSelector`, and `transactionId`.
- **Expiry Guard:** If transaction expired (`isExpired()`), reject dispatch immediately.
- **Verifier Classification:**
  - High-risk (click, submit, navigate, keypress, delete): Requires `postconditionVerifier`. If absent, state becomes `BLOCKED`.
  - Low-risk (hover, scroll, focus): Allowed to dispatch without verifier, but state marks `UNVERIFIED`.
- **Timeout / Missing Evidence:** Transition to `UNKNOWN`, release lock with fencing token, trigger read-only reconciliation. Never blind retry.

### 3.2 Exact Cache & Gateway Router
- Cache key: `sha256(canonicalJson({ prompt, context, eligibleRoutes, policyVersion }))`.
- Eligible routes enforcement: Chosen route must strictly exist in `eligibleRoutes`.

### 3.3 Fast GenUI Local-First Hardening
- `localOnly` option hard-locks Cloud path.
- 50ms latency budget with `AbortController` cancelling local inference on timeout.
- Non-destructive state preservation: Form inputs and draft state preserved during layout morphing.

### 3.4 Skill Pruner & Stop Oracle
- Cache key includes full hash of prompt, skill descriptions, and `mandatory` flags.
- Mandatory skills unconditionally preserved.
- Stop Oracle checks `evidence.coverage === 1.0` (all acceptance criteria satisfied).
