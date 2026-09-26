import { test } from 'node:test';
import assert from 'node:assert';
import { CommitEngine } from '../src/ultrafast/commit-engine.js';

test('Security Guard: Transaction expired before dispatch must be ABORTED', async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation('click_btn', 'external');
  // Simulate expired binding
  tx.binding.expiresAtMs = Date.now() - 5000;

  const result = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: 'ok',
      modelVersion: 'test-v1',
      binding: tx.binding,
      value: { action: 'click_btn' }
    }),
    dispatchFn: async () => {
      throw new Error('Should never dispatch expired transaction');
    },
    verifyPostconditionFn: async () => true,
  });

  assert.strictEqual(result.state, 'ABORTED');
  assert.match(result.reason || '', /expired/i);
});

test('Security Guard: Judgment epoch/state mismatch must be ABORTED', async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation('click_btn', 'external');

  const result = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: 'ok',
      modelVersion: 'test-v1',
      binding: {
        ...tx.binding,
        intentEpoch: tx.binding.intentEpoch + 999, // Mismatched epoch
      },
      value: { action: 'click_btn' }
    }),
    dispatchFn: async () => {
      throw new Error('Should never dispatch on mismatched judgment epoch');
    },
    verifyPostconditionFn: async () => true,
  });

  assert.strictEqual(result.state, 'ABORTED');
  assert.match(result.reason || '', /epoch mismatch/i);
});

test('Security Guard: High-risk action missing postcondition verifier must be BLOCKED before dispatch', async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation('submit_order', 'external');

  let dispatched = false;
  const result = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: 'ok',
      modelVersion: 'test-v1',
      binding: tx.binding,
      value: { action: 'submit_order' }
    }),
    dispatchFn: async () => {
      dispatched = true;
      return true;
    },
    // verifyPostconditionFn is omitted!
  });

  assert.strictEqual(dispatched, false, 'High risk action must NOT dispatch without verifier');
  assert.strictEqual(result.state, 'BLOCKED');
  assert.match(result.reason || '', /postcondition verifier/i);
});

test('Security Guard: Low-risk action missing verifier dispatches but marks UNVERIFIED', async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation('scroll_down', 'local');

  let dispatched = false;
  const result = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: 'ok',
      modelVersion: 'test-v1',
      binding: tx.binding,
      value: { action: 'scroll_down' }
    }),
    dispatchFn: async () => {
      dispatched = true;
      return { scrolled: true };
    },
    // verifyPostconditionFn is omitted for low-risk
  });

  assert.strictEqual(dispatched, true);
  assert.strictEqual(result.state, 'UNVERIFIED', 'Cannot claim CONFIRMED without observed evidence');
});

test('Security Guard: Postcondition failure transitions to UNKNOWN, not silent confirmation', async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation('click_btn', 'external');

  const result = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: 'ok',
      modelVersion: 'test-v1',
      binding: tx.binding,
      value: { action: 'click_btn' }
    }),
    dispatchFn: async () => ({ clicked: true }),
    verifyPostconditionFn: async () => false, // Target did not change!
  });

  assert.strictEqual(result.state, 'UNCERTAIN');
  assert.match(result.reason || '', /postcondition/i);
});
