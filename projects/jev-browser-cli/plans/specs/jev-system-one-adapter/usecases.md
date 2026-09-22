# Use Cases & Acceptance Criteria: JEV Shared Decision Adapter & Commit Engine

## Use Case 1: Fresh Decision Execution Under Stable DOM
- **Given**: A browser page with a stable DOM and valid target elements.
- **When**: The agent observes the state, JEV selects an action, and no concurrent mutation occurs.
- **Then**: 
  - The state transitions: `OBSERVED` → `EVALUATED` → `PREPARED` → `DISPATCHING` → `CONFIRMED`.
  - The action is executed exactly once with lease authority.
  - Postcondition verification confirms the expected UI or URL change.

## Use Case 2: Invalidation on DOM Mutation / Epoch Drift (Stale Decision)
- **Given**: A decision was evaluated at `intentEpoch: 1`.
- **When**: Between `EVALUATED` and `DISPATCHING`, the page navigates, or the DOM hash changes (epoch advances to 2).
- **Then**:
  - The commit engine aborts the transaction before any click or keystroke (`ABORTED`).
  - The lease is released.
  - The agent re-observes the fresh state without corrupting the page.

## Use Case 3: Uncertain Dispatch Recovery (Network Timeout)
- **Given**: An action (`click` or `submit`) is dispatched to CDP/page.
- **When**: CDP or network times out without receiving a confirmation receipt.
- **Then**:
  - The transaction transitions to `UNCERTAIN` (not `FAILED`).
  - The engine does NOT auto-retry the action.
  - It triggers a reconciliation probe to determine if the side-effect took place before proceeding.

## Use Case 4: Closed-Set Protection & Escalation
- **Given**: The action space contains irrelevant or broken targets.
- **When**: JEV determines no valid candidate can advance the goal.
- **Then**:
  - JEV selects `none` or `need_plan`.
  - The engine marks status as `abstain` with reason `uncertain` or `escalate_to_planner`.
  - The agent requests a fresh plan rather than forcing a wrong click.

## Use Case 5: Universal Shared Contract Export
- **Given**: External modules (VSF-PCP, TheCurator) import `contract.ts`.
- **When**: They wrap input in `Input<T>` with `Binding`.
- **Then**:
  - Validates probability distribution sums, confidence bounds, and exact candidate membership.
  - Rejects malformed or expired payloads before any execution.
