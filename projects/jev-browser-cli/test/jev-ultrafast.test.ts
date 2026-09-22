import assert from "node:assert";
import { test } from "node:test";
import {
  actionSpace,
  validateChoice,
  fieldContext,
  computeFingerprint,
  NEXT_ACTION,
  TARGET,
  TEXT_VALUE,
  type JevUltrafastAction,
  type JevUltrafastState,
} from "../src/ultrafast/index.js";

test("actionSpace groups and indexes controls correctly", () => {
  const mockActions: JevUltrafastAction[] = [
    {
      id: "e1",
      node: 101,
      role: "button",
      label: "Round trip",
      kind: "click",
    },
    {
      id: "e2",
      node: 102,
      role: "textbox",
      label: "Where from?",
      kind: "fill",
      value: "San Francisco",
    },
    {
      id: "e3",
      node: 102,
      role: "textbox",
      label: "Open Where from?",
      kind: "click",
    },
    {
      id: "e4",
      node: 103,
      role: "combobox",
      label: "Class → Economy",
      kind: "select",
      value: "economy",
      current_value: "Business",
    },
    {
      id: "e5",
      node: 103,
      role: "combobox",
      label: "Class → First",
      kind: "select",
      value: "first",
      current_value: "Business",
    },
    {
      id: "scroll_down",
      label: "Scroll down",
      kind: "scroll",
      delta: 560,
    },
    {
      id: "wait",
      label: "Wait for the page to update",
      kind: "wait",
    },
  ];

  const { elements, targets, controls } = actionSpace(mockActions);

  // 1. Elements indexed properly
  assert.strictEqual(elements.length, 3);
  assert.strictEqual(elements[0].index, "1");
  assert.strictEqual(elements[0].label, "Round trip");
  assert.deepStrictEqual(elements[0].operations, ["CLICK"]);

  // Element 2 has both TYPE_TEXT and CLICK
  assert.strictEqual(elements[1].index, "2");
  assert.strictEqual(elements[1].label, "Where from?");
  assert.deepStrictEqual(elements[1].operations, ["TYPE_TEXT", "CLICK"]);

  // Element 3 is SELECT with 2 options
  assert.strictEqual(elements[2].index, "3");
  assert.strictEqual(elements[2].label, "Class");
  assert.strictEqual(elements[2].options?.length, 2);
  assert.strictEqual(elements[2].options?.[0].index, "3:1");
  assert.strictEqual(elements[2].options?.[1].index, "3:2");

  // 2. Targets mapped to operations
  assert.ok(targets.CLICK["1"]);
  assert.ok(targets.CLICK["2"]);
  assert.ok(targets.TYPE_TEXT["2"]);
  assert.ok(targets.SELECT["3:1"]);
  assert.ok(targets.SELECT["3:2"]);

  // 3. Controls preserved
  assert.ok(controls.SCROLL_DOWN);
  assert.ok(controls.WAIT);
});

test("validateChoice verifies probability distribution and picks valid option", () => {
  const validHead = {
    choice: "CLICK",
    confidence: 0.95,
    probabilities: {
      CLICK: 0.85,
      TYPE_TEXT: 0.10,
      DONE: 0.05,
    },
  };

  const validated = validateChoice(validHead, ["CLICK", "TYPE_TEXT", "DONE"]);
  assert.strictEqual(validated.choice, "CLICK");
  assert.strictEqual(validated.confidence, 0.95);

  // Invalid choice throws
  assert.throws(() => {
    validateChoice({ choice: "INVALID", confidence: 0.9, probabilities: { INVALID: 1 } }, ["CLICK", "DONE"]);
  });
});

test("computeFingerprint generates deterministic hashes", () => {
  const stateA: JevUltrafastState = {
    url: "https://example.com",
    title: "Example",
    w: 1120,
    h: 780,
    text: "Welcome to example",
    scroll: { y: 0, height: 1000 },
    actions: [],
    marker: null,
    page_key: null,
    guards: {},
    omitted_actions: 0,
  };

  const stateB: JevUltrafastState = {
    ...stateA,
  };

  const hashA = computeFingerprint(stateA);
  const hashB = computeFingerprint(stateB);
  assert.strictEqual(hashA, hashB);

  const stateC = { ...stateA, text: "Different text" };
  const hashC = computeFingerprint(stateC);
  assert.notStrictEqual(hashA, hashC);
});

test("fieldContext formats payload correctly for text helper", () => {
  const context = fieldContext(
    "Book flights to London",
    { label: "Destination", role: "textbox", value: "" },
    {
      url: "https://flights.google.com",
      title: "Google Flights",
      w: 1120,
      h: 780,
      text: "Departure · Destination",
      scroll: { y: 0, height: 1000 },
      actions: [],
      marker: null,
      page_key: null,
      guards: {},
      omitted_actions: 0,
    },
    []
  );

  assert.strictEqual(context.goal, "Book flights to London");
  assert.strictEqual(context.field.label, "Destination");
  assert.strictEqual(context.page.title, "Google Flights");
});

test("questions contains non-empty upstream prompt instructions", () => {
  assert.ok(NEXT_ACTION.includes("Advance the user's entire goal"));
  assert.ok(TARGET.includes("Choose the best observed target"));
  assert.ok(TEXT_VALUE.includes("Return a JSON object with exactly one key, text"));
});
