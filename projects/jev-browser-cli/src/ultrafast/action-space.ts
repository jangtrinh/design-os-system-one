import type { ActionSpace, IndexedElement, JevUltrafastAction } from "./types.js";

/**
 * Builds dynamic indexed action space.
 * One index per observed element; each operation has its own valid target choices.
 * Direct parity with browser-use/jev-ultrafast/jev_ultrafast/model.py
 */
export function actionSpace(actions: JevUltrafastAction[]): ActionSpace {
  const elements: IndexedElement[] = [];
  const indices: Map<number, string> = new Map();
  const targets: Record<string, Record<string, JevUltrafastAction>> = {};
  const controls: Record<string, JevUltrafastAction> = {};

  const operationsMap: Record<string, string> = {
    click: "CLICK",
    fill: "TYPE_TEXT",
    select: "SELECT",
  };

  for (const action of actions) {
    const kind = action.kind;
    if (!operationsMap[kind]) {
      controls[action.id.toUpperCase()] = action;
      continue;
    }

    const node = action.node;
    if (node === undefined) continue;

    if (!indices.has(node)) {
      const index = String(elements.length + 1);
      indices.set(node, index);

      const element: IndexedElement = {
        index,
        label: action.label.split(" → ")[0],
        operations: [],
      };

      if (action.role !== undefined) element.role = action.role;
      if (action.value !== undefined) element.value = action.value;
      if (action.checked !== undefined) element.checked = action.checked;
      if (action.selected !== undefined) element.selected = action.selected;
      if (action.expanded !== undefined) element.expanded = action.expanded;

      if (kind === "select") {
        element.value = action.current_value || "";
        element.options = [];
      }

      elements.push(element);
    }

    const index = indices.get(node)!;
    const operation = operationsMap[kind];
    if (!targets[operation]) {
      targets[operation] = {};
    }

    const element = elements[parseInt(index, 10) - 1];
    if (!element.operations.includes(operation)) {
      element.operations.push(operation);
    }

    let target = index;
    if (kind === "select") {
      if (!element.options) element.options = [];
      target = `${index}:${element.options.length + 1}`;
      element.options.push({
        index: target,
        label: action.label,
        value: action.value || "",
      });
    }

    targets[operation][target] = action;
  }

  return { elements, targets, controls };
}
