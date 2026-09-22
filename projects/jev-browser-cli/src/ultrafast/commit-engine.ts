/**
 * 5-Stage Speculative Commit Engine for Browser & Agent Side-Effects
 *
 * Implements the protocol recommended by Codex Web PRO:
 * OBSERVED → EVALUATED → PREPARED → DISPATCHING → CONFIRMED
 *                           ↘ ABORTED          ↘ UNCERTAIN
 *                                                ↓
 *                                           RECONCILING
 */

import { Binding, Result } from './contract.js';

export type CommitState =
  | 'OBSERVED'
  | 'EVALUATED'
  | 'PREPARED'
  | 'DISPATCHING'
  | 'CONFIRMED'
  | 'ABORTED'
  | 'UNCERTAIN'
  | 'RECONCILING';

export interface CommitTransaction<T> {
  txId: string;
  binding: Binding;
  state: CommitState;
  actionId: string;
  effectType: 'read' | 'local' | 'external';
  fencingToken?: number;
  reason?: string;
  result?: T;
  dispatchedAtMs?: number;
  completedAtMs?: number;
}

export interface CommitEngineOptions {
  dispatchTimeoutMs?: number;
}

export class CommitEngine {
  private currentEpoch = 1;
  private currentDomHash = '';
  private activeLease: { holderTxId: string; fencingToken: number } | null = null;
  private fencingSeq = 0;
  private dispatchTimeoutMs: number;

  constructor(options: CommitEngineOptions = {}) {
    this.dispatchTimeoutMs = options.dispatchTimeoutMs || 5000;
  }

  getEpoch(): number {
    return this.currentEpoch;
  }

  getDomHash(): string {
    return this.currentDomHash;
  }

  /**
   * Updates page state on navigation or fresh DOM observation.
   * Increments intentEpoch to invalidate all pending or stale decisions.
   */
  updateState(domHash: string): number {
    this.currentDomHash = domHash;
    this.currentEpoch++;
    return this.currentEpoch;
  }

  /**
   * Acquires an exclusive execution lease to prevent worker collisions.
   */
  acquireLease(txId: string): number | null {
    if (this.activeLease) {
      return null;
    }
    this.fencingSeq++;
    this.activeLease = { holderTxId: txId, fencingToken: this.fencingSeq };
    return this.fencingSeq;
  }

  /**
   * Releases the active execution lease.
   */
  releaseLease(fencingToken: number): boolean {
    if (this.activeLease?.fencingToken === fencingToken) {
      this.activeLease = null;
      return true;
    }
    return false;
  }

  /**
   * Begins a new transaction in the OBSERVED state.
   */
  beginObservation(actionId: string, effectType: 'read' | 'local' | 'external'): CommitTransaction<any> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const binding: Binding = {
      scopeHash: 'browser_main',
      intentEpoch: this.currentEpoch,
      stateHash: this.currentDomHash,
      candidateSetHash: 'action_candidates',
      policyVersion: 'v1',
      expiresAtMs: Date.now() + 10000
    };

    return {
      txId,
      binding,
      state: 'OBSERVED',
      actionId,
      effectType
    };
  }

  /**
   * Executes an action through the formal 5-stage pipeline.
   */
  async execute<T>(params: {
    tx: CommitTransaction<T>;
    judgeFn: () => Promise<Result<any>>;
    dispatchFn: (fencingToken: number) => Promise<T>;
    verifyPostconditionFn?: (result: T) => Promise<boolean>;
    reconcileFn?: () => Promise<boolean>;
  }): Promise<CommitTransaction<T>> {
    const { tx, judgeFn, dispatchFn, verifyPostconditionFn, reconcileFn } = params;

    // Stage 1: OBSERVED -> Stage 2: EVALUATED
    try {
      const judgment = await judgeFn();
      if (judgment.status === 'abstain') {
        tx.state = 'ABORTED';
        tx.reason = `Judge abstained: ${judgment.reason}`;
        return tx;
      }
      tx.state = 'EVALUATED';
    } catch (err: any) {
      tx.state = 'ABORTED';
      tx.reason = `Evaluation error: ${err.message}`;
      return tx;
    }

    // Stage 3: PREPARED - Validate preconditions, check epoch, acquire lease
    const lease = this.acquireLease(tx.txId);
    if (!lease) {
      tx.state = 'ABORTED';
      tx.reason = 'Lease conflict: another operation holds execution authority';
      return tx;
    }
    tx.fencingToken = lease;

    // Strict Epoch & State Check
    if (tx.binding.intentEpoch !== this.currentEpoch) {
      this.releaseLease(lease);
      tx.state = 'ABORTED';
      tx.reason = `Stale epoch: observed=${tx.binding.intentEpoch}, current=${this.currentEpoch}`;
      return tx;
    }

    if (tx.binding.stateHash && tx.binding.stateHash !== this.currentDomHash) {
      this.releaseLease(lease);
      tx.state = 'ABORTED';
      tx.reason = `DOM mutation detected prior to commit: hash changed`;
      return tx;
    }

    tx.state = 'PREPARED';

    // Stage 4: DISPATCHING - Execute side effect
    tx.state = 'DISPATCHING';
    tx.dispatchedAtMs = Date.now();

    let dispatchResult: T;
    try {
      // Execute with timeout race
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DISPATCH_TIMEOUT')), this.dispatchTimeoutMs)
      );

      dispatchResult = await Promise.race([dispatchFn(lease), timeoutPromise]);
      tx.result = dispatchResult;
    } catch (err: any) {
      this.releaseLease(lease);

      if (err.message === 'DISPATCH_TIMEOUT') {
        // Crucial Architectural Rule: Timeout after dispatch is UNCERTAIN, NOT failed!
        tx.state = 'UNCERTAIN';
        tx.reason = 'Transport timeout after dispatch: effect may have taken place on page/server';

        if (reconcileFn) {
          tx.state = 'RECONCILING';
          try {
            const confirmed = await reconcileFn();
            if (confirmed) {
              tx.state = 'CONFIRMED';
              tx.completedAtMs = Date.now();
              return tx;
            }
          } catch (reconcileErr: any) {
            tx.reason += ` (Reconciliation error: ${reconcileErr.message})`;
          }
        }
        return tx;
      }

      tx.state = 'ABORTED';
      tx.reason = `Dispatch error: ${err.message}`;
      return tx;
    }

    // Stage 5: CONFIRMED - Verify postconditions
    try {
      if (verifyPostconditionFn) {
        const verified = await verifyPostconditionFn(dispatchResult);
        if (!verified) {
          this.releaseLease(lease);
          tx.state = 'UNCERTAIN';
          tx.reason = 'Postcondition verification failed: unexpected DOM state after action';
          return tx;
        }
      }

      this.releaseLease(lease);
      tx.state = 'CONFIRMED';
      tx.completedAtMs = Date.now();
      return tx;
    } catch (err: any) {
      this.releaseLease(lease);
      tx.state = 'UNCERTAIN';
      tx.reason = `Postcondition check threw error: ${err.message}`;
      return tx;
    }
  }
}
