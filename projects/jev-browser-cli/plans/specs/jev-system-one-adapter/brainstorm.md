# Brainstorm: JEV System One Shared Decision Adapter & Speculative Commit Engine

## 1. Problem Statement
The current `jev-browser-cli` ultrafast loop executes actions immediately after `choose()` returns. While fast, this has critical architectural limitations identified by Codex Web PRO:
- **No epoch binding**: If the browser navigates or user interacts during a call, a stale decision executes against a changed DOM.
- **Side-effect risk**: Speculative execution may fire destructive actions (clicks, submits, navigations) without a fencing lease or commit authority.
- **Uncertain state mishandling**: Network timeouts after action dispatch are treated as failures and blindly retried, risking duplicate submissions.
- **No shared contract**: VSF-PCP and TheCurator lack a common typed interface (`Binding`, `Input<T>`, `Result<T>`) to leverage JEV System One judgments.

## 2. Appetite & Scope
- **Appetite**: 1 developer day (Small batch, vertical slice).
- **In scope**:
  1. Universal TypeSafe contract (`Binding`, `Input<T>`, `Result<T>`, `Choice`, `Score`, `Noul`) in `src/ultrafast/contract.ts`.
  2. 5-stage Speculative Commit Engine (`OBSERVED` → `EVALUATED` → `PREPARED` → `DISPATCHING` → `CONFIRMED` / `UNCERTAIN` → `RECONCILING`) in `src/ultrafast/commit-engine.ts`.
  3. Integration into `JevUltrafastAgent` with lease locking, stale-page epoch invalidation, and postcondition verification.
  4. Full test suite at the public seam (`test/commit-engine.test.ts`).
- **Out of scope (deferred to M2/M3)**:
  - Modifying VSF-PCP codebase directly (we export the reusable contract package first).
  - Multi-tab parallel browser cluster.

## 3. Alternative Approaches Evaluated
| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Ad-hoc try/catch around `choose()`** | Minimal code | Does not solve race conditions or duplicate dispatch | Rejected |
| **B. DOM Snapshot rollback engine** | Sounds safe | Impossible: DOM snapshot cannot rollback remote server/DB writes; gives false illusion of safety | Rejected |
| **C. 5-Stage Leased Commit Protocol** (Codex Web PRO recommendation) | Isolates judgments from effects; handles timeouts gracefully as `UNCERTAIN`; strictly verifies preconditions & epochs | Requires formal state machine | **Chosen (Recommended)** |

## 4. Architectural Invariants
1. *Speculate on judgments, serialize real effects.*
2. *Every decision must carry `intentEpoch` and `stateHash`.*
3. *A network timeout after dispatch is `UNCERTAIN`, never blindly retried.*
4. *Closed-set protection: Always provide `none` and `need_plan` options.*
