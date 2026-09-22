# Acceptance Criteria: JEV Shared Decision Adapter & Speculative Commit Engine

## Acceptance IDs:
- **ACC-01 (Type Validation)**: `validateResult` strictly asserts that probability distributions sum to ~1.0, confidence is within [0, 1], and the chosen choice belongs to the candidate list.
- **ACC-02 (Fresh Commit)**: A transaction observing `epoch N` executes to `CONFIRMED` if DOM epoch remains `N`.
- **ACC-03 (Epoch Abort)**: A transaction observing `epoch N` transitions to `ABORTED` if DOM epoch advanced to `N+1` before lease acquisition, preventing any DOM effect.
- **ACC-04 (Timeout To Uncertain)**: A network/CDP timeout after dispatch transitions to `UNCERTAIN` and invokes `reconcile()`, never auto-retrying destructive mutations.
- **ACC-05 (Closed-Set Fallback)**: Action space includes `none` and `need_plan` options so JEV never hallucinates or is forced into irrelevant actions.
- **ACC-06 (Full Test Pass)**: All unit tests pass (`npm test`) with zero TypeScript errors (`npx tsc --noEmit`).
