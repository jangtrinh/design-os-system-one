# Feature: JEV System One Shared Decision Adapter & Speculative Commit Engine

## Architecture
- **Contract Layer** (`src/ultrafast/contract.ts`): Universal typed interfaces (`Binding`, `Input<T>`, `Result<T>`, `Choice<K>`, `Score`, `Noul`) with runtime probability & epoch validation.
- **Commit Engine** (`src/ultrafast/commit-engine.ts`): 5-stage state machine (`OBSERVED` → `EVALUATED` → `PREPARED` → `DISPATCHING` → `CONFIRMED` / `UNCERTAIN` → `RECONCILING`) with lease locking and stale-epoch aborts.
- **Agent Integration** (`src/ultrafast/agent.ts`): `JevUltrafastAgent` enforces intent epochs, preventing execution if DOM mutates during model inference.

## Key Files
- `src/ultrafast/contract.ts`: TypeSafe AI decision contracts and validators.
- `src/ultrafast/commit-engine.ts`: Speculative commit engine & lease manager.
- `src/ultrafast/agent.ts`: Browser automation agent loop wired to commit engine.
- `test/commit-engine.test.ts`: Seam test suite for contract & commit protocol.

## Decisions & Invariants
1. Speculate on calculations and judgments only; serialize real effects on the DOM/browser.
2. Network timeout after action dispatch transitions to `UNCERTAIN`, not `FAILED` (no blind retries).
3. Every decision is tied to an `intentEpoch` and `stateHash`.
