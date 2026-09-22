import test from "node:test";
import assert from "node:assert/strict";
import {
  createBinding,
  validateChoiceDistribution,
  validateResult,
  Choice,
  Result,
} from "../src/ultrafast/contract.js";
import { CommitEngine } from "../src/ultrafast/commit-engine.js";

test("Contract: validateChoiceDistribution accepts valid distributions", () => {
  const validChoice: Choice<"CLICK_A" | "CLICK_B"> = {
    choice: "CLICK_A",
    confidence: 0.95,
    probabilities: {
      CLICK_A: 0.95,
      CLICK_B: 0.05,
    },
  };

  const res = validateChoiceDistribution(validChoice, ["CLICK_A", "CLICK_B"]);
  assert.equal(res.valid, true);
  assert.equal(res.error, undefined);
});

test("Contract: validateChoiceDistribution rejects unknown candidate or invalid probabilities", () => {
  const badCandidate: Choice<string> = {
    choice: "CLICK_C",
    confidence: 0.8,
    probabilities: { CLICK_C: 0.8 },
  };
  const res1 = validateChoiceDistribution(badCandidate, ["CLICK_A", "CLICK_B"]);
  assert.equal(res1.valid, false);
  assert.match(res1.error!, /not in allowed candidates/);

  const badProbSum: Choice<"CLICK_A" | "CLICK_B"> = {
    choice: "CLICK_A",
    confidence: 0.5,
    probabilities: { CLICK_A: 0.2, CLICK_B: 0.2 }, // Sum 0.4 != ~1.0
  };
  const res2 = validateChoiceDistribution(badProbSum, ["CLICK_A", "CLICK_B"]);
  assert.equal(res2.valid, false);
  assert.match(res2.error!, /Probabilities do not sum/);
});

test("Contract: validateResult checks epoch and expiration", () => {
  const binding = createBinding({
    intentEpoch: 5,
    stateHash: "hash_123",
    ttlMs: 5000,
  });

  const validResult: Result<{ action: string }> = {
    status: "ok",
    modelVersion: "jev-1.13.0",
    binding,
    value: { action: "submit" },
  };

  const check1 = validateResult(validResult, 5);
  assert.equal(check1.valid, true);

  const checkEpochMismatch = validateResult(validResult, 6);
  assert.equal(checkEpochMismatch.valid, false);
  assert.match(checkEpochMismatch.error!, /Epoch mismatch/);

  const expiredBinding = { ...binding, expiresAtMs: Date.now() - 100 };
  const checkExpired = validateResult({ ...validResult, binding: expiredBinding }, 5);
  assert.equal(checkExpired.valid, false);
  assert.match(checkExpired.error!, /Decision expired/);
});

test("CommitEngine: executes happy path to CONFIRMED and releases lease", async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation("btn_submit", "external");

  let dispatched = false;
  const res = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: "ok",
      modelVersion: "jev-1.13.0",
      binding: tx.binding,
      value: { choice: "btn_submit" },
    }),
    dispatchFn: async (token) => {
      assert.ok(token > 0);
      dispatched = true;
      return { success: true };
    },
    verifyPostconditionFn: async (r) => r.success === true,
  });

  assert.equal(dispatched, true);
  assert.equal(res.state, "CONFIRMED");
  assert.ok(res.completedAtMs);
  // Verify lease was released (can acquire next lease)
  const nextLease = engine.acquireLease("tx_next");
  assert.ok(nextLease !== null);
  engine.releaseLease(nextLease!);
});

test("CommitEngine: aborts transaction without dispatch if DOM epoch mutates during evaluation", async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation("btn_submit", "external");

  let dispatched = false;
  const res = await engine.execute({
    tx,
    judgeFn: async () => {
      // DOM mutates concurrently while judge was running
      engine.updateState("dom_hash_v2");
      return {
        status: "ok",
        modelVersion: "jev-1.13.0",
        binding: tx.binding,
        value: { choice: "btn_submit" },
      };
    },
    dispatchFn: async () => {
      dispatched = true;
      return { success: true };
    },
  });

  assert.equal(dispatched, false, "Must NOT dispatch action on stale epoch");
  assert.equal(res.state, "ABORTED");
  assert.match(res.reason!, /Stale epoch/);
});

test("CommitEngine: handles dispatch timeout as UNCERTAIN and invokes reconciliation", async () => {
  const engine = new CommitEngine({ dispatchTimeoutMs: 50 });
  const tx = engine.beginObservation("pay_order", "external");

  let reconciled = false;
  const res = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: "ok",
      modelVersion: "jev-1.13.0",
      binding: tx.binding,
      value: { choice: "pay_order" },
    }),
    dispatchFn: async () => {
      // Hang longer than dispatchTimeoutMs
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { paymentSent: true };
    },
    reconcileFn: async () => {
      reconciled = true;
      return true; // Reconciled confirmed
    },
  });

  assert.equal(reconciled, true);
  assert.equal(res.state, "CONFIRMED");
});

test("CommitEngine: transitions to UNCERTAIN if postcondition check fails", async () => {
  const engine = new CommitEngine();
  const tx = engine.beginObservation("click_tab", "local");

  const res = await engine.execute({
    tx,
    judgeFn: async () => ({
      status: "ok",
      modelVersion: "jev-1.13.0",
      binding: tx.binding,
      value: { choice: "click_tab" },
    }),
    dispatchFn: async () => ({ clicked: true }),
    verifyPostconditionFn: async () => false, // Postcondition failed
  });

  assert.equal(res.state, "UNCERTAIN");
  assert.match(res.reason!, /Postcondition verification failed/);
});

