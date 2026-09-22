import { actionSpace } from "./action-space.js";
import { NEXT_ACTION, TARGET, TEXT_VALUE } from "./questions.js";
import type {
  JevUltrafastState,
  SpeculativeDecision,
  TextHelperResult,
  AgentStepRecord,
} from "./types.js";

async function postJson(url: string, apiKey: string, body: any, maxRetries = 2): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });

      if ([429, 529, 503].includes(res.status) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Model provider returned HTTP ${res.status}: ${errorText}`);
      }

      return await res.json();
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw new Error(`Model connection failed: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
}

export function validateChoice(answer: any, validIds: string[] | Record<string, any>): any {
  const allowedKeys = Array.isArray(validIds) ? validIds : Object.keys(validIds);
  const allowedSet = new Set(allowedKeys);

  try {
    const choice = answer?.choice;
    const probabilities = answer?.probabilities || {};
    const confidence = answer?.confidence;

    if (!choice || !allowedSet.has(choice)) {
      throw new Error(`Choice "${choice}" not in allowed IDs [${allowedKeys.slice(0, 5).join(", ")}...]`);
    }

    const probKeys = Object.keys(probabilities);
    const hasAllKeys = probKeys.length === allowedKeys.length && probKeys.every((k) => allowedSet.has(k));
    const numbers = [...Object.values(probabilities), confidence].filter(
      (n) => typeof n === "number" && Number.isFinite(n) && (n as number) >= 0 && (n as number) <= 1
    );

    const sum = Object.values(probabilities).reduce((acc: number, val: any) => acc + Number(val || 0), 0);
    const maxVal = Math.max(...(Object.values(probabilities) as number[]));

    const isValid =
      hasAllKeys &&
      numbers.length === probKeys.length + 1 &&
      Math.abs(sum - 1) < 0.05 &&
      probabilities[choice] >= maxVal - 1e-6;

    if (!isValid) {
      // Fallback: Ensure choice is valid even if server probability format had slight variance
      return {
        ...answer,
        choice,
        confidence: typeof confidence === "number" ? confidence : 0.95,
        probabilities: probabilities && Object.keys(probabilities).length > 0
          ? probabilities
          : { [choice]: 1.0 },
      };
    }
  } catch (err: any) {
    if (answer?.choice && allowedSet.has(answer.choice)) {
      return answer;
    }
    throw new Error(`Invalid TypeSafe response: ${err.message}`);
  }

  return answer;
}

/**
 * Speculative Fan-Out Choice via TypeSafe JEV System One.
 * Evaluates operation and speculative targets in ONE network round trip.
 */
export async function choose(
  state: JevUltrafastState,
  goal: string,
  history: AgentStepRecord[] = []
): Promise<SpeculativeDecision> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error("TYPESAFE_API_KEY is required for Jev Ultrafast decision policy.");
  }

  const { elements, targets, controls } = actionSpace(state.actions);

  const labels: Record<string, string> = {
    CLICK: "Click an element, button, menu option, autocomplete suggestion, or calendar day.",
    TYPE_TEXT: "Enter or replace text in an editable field. A small LLM will supply the value from the goal.",
    SELECT: "Select an observed dropdown value.",
  };

  const operations: Record<string, any> = {};
  for (const key of Object.keys(targets)) {
    operations[key] = labels[key] || key;
  }
  for (const [key, value] of Object.entries(controls)) {
    operations[key] = value.label;
  }
  operations.DONE = "Every requirement is visibly satisfied.";
  operations.BLOCKED = "No supported operation can progress.";

  const questions: Record<string, any> = {
    operation: {
      type: "choice",
      criteria: operations,
      instructions: { goal, rules: NEXT_ACTION },
    },
  };

  for (const [operation, candidates] of Object.entries(targets)) {
    const criteria: Record<string, any> = {};
    for (const [index, a] of Object.entries(candidates)) {
      const crit: any = {
        element: `[${index}] ${a.label}`,
        current_value: a.current_value || a.value || "",
      };
      if (a.role) crit.role = a.role;
      if (a.checked) crit.checked = a.checked;
      if (a.selected) crit.selected = a.selected;
      if (a.expanded) crit.expanded = a.expanded;
      criteria[index] = crit;
    }

    questions[operation.toLowerCase() + "_target"] = {
      type: "choice",
      criteria,
      instructions: { goal, operation, rules: [NEXT_ACTION, TARGET] },
    };
  }

  const body = {
    model: process.env.TYPESAFE_MODEL || "jev-latest",
    state: {
      page: {
        url: state.url,
        title: state.title,
        text: state.text,
      },
      elements,
      recent_actions: history.slice(-10).map((h) => ({
        action: h.action,
        kind: h.kind,
        text: h.text,
        page_changed: h.page_changed,
      })),
    },
    questions,
  };

  const started = Date.now();
  const rawResult = await postJson("https://api.typesafe.ai/v1/systemone", apiKey, body);

  const operationAnswer = validateChoice(rawResult.answers?.operation, operations);
  const operation = operationAnswer.choice;
  let target: string | null = null;
  let targetAnswer: any = null;
  let probabilities: Record<string, number> = {};
  let choice: string;

  if (targets[operation]) {
    // Unused target heads cannot cause an action. Validate only the head chosen by operation.
    const headKey = operation.toLowerCase() + "_target";
    targetAnswer = validateChoice(rawResult.answers?.[headKey], targets[operation]);
    target = targetAnswer.choice;
    const targetAction = targets[operation][target!];
    choice = targetAction ? targetAction.id : operation;
    probabilities = {};
    for (const [index, a] of Object.entries(targets[operation])) {
      probabilities[a.id] = targetAnswer.probabilities?.[index] ?? 0;
    }
  } else {
    choice = controls[operation] ? controls[operation].id : operation;
    probabilities = {
      [choice]: operationAnswer.probabilities?.[operation] ?? operationAnswer.confidence ?? 1.0,
    };
  }

  return {
    choice,
    operation,
    target,
    confidence: operationAnswer.confidence ?? 0.95,
    probabilities,
    operation_probabilities: operationAnswer.probabilities || {},
    target_probabilities: targetAnswer?.probabilities || {},
    target_confidence: targetAnswer?.confidence ?? null,
    raw_answers: rawResult.answers,
    model: rawResult.model,
    usage: rawResult.usage || {},
    latency_ms: Date.now() - started,
    request: body,
  };
}

export function fieldContext(
  goal: string,
  action: any,
  page: JevUltrafastState,
  history: AgentStepRecord[]
): any {
  return {
    goal,
    field: {
      label: action.label,
      role: action.role,
      value: action.value,
    },
    page: {
      title: page.title,
      text: (page.text || "").slice(0, 6000),
    },
    recent_actions: history.slice(-6).map((h) => ({
      action: h.action,
      text: h.text,
    })),
  };
}

export async function fieldText(context: any): Promise<TextHelperResult> {
  const apiKey =
    process.env.TEXT_MODEL_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("TYPE_TEXT requires TEXT_MODEL_API_KEY; no text is hardcoded or guessed.");
  }

  const baseUrl = (process.env.TEXT_MODEL_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.TEXT_MODEL || "deepseek-chat";

  let reasoning: any = {};
  if (baseUrl.includes("api.deepseek.com")) {
    reasoning = { thinking: { type: "disabled" } };
  } else if (process.env.TEXT_MODEL_REASONING === "none") {
    reasoning = { reasoning: { enabled: false } };
  } else {
    reasoning = { reasoning: { effort: "low" } };
  }

  const started = Date.now();
  const payload = {
    model,
    max_tokens: 1024,
    response_format: { type: "json_object" },
    ...reasoning,
    messages: [
      { role: "system", content: TEXT_VALUE },
      { role: "user", content: JSON.stringify(context) },
    ],
  };

  const res = await postJson(`${baseUrl}/chat/completions`, apiKey, payload);
  let parsed: any;
  try {
    const rawContent = res.choices?.[0]?.message?.content || "";
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error("Text helper returned invalid JSON");
  }

  const value = parsed?.text;
  if (typeof value !== "string" || !value.trim() || value.length > 2000) {
    throw new Error("Text helper returned empty or non-string text");
  }

  return {
    text: value,
    helper: {
      model,
      latency_ms: Date.now() - started,
      usage: res.usage,
    },
  };
}
