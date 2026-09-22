export type OperationKind = "CLICK" | "TYPE_TEXT" | "SELECT" | "SCROLL_DOWN" | "SCROLL_UP" | "WAIT" | "DONE" | "BLOCKED";

export interface JevUltrafastAction {
  id: string;
  node?: number;
  role?: string;
  label: string;
  kind: "click" | "fill" | "select" | "scroll" | "wait";
  value?: string;
  current_value?: string;
  rect?: { x: number; y: number; w: number; h: number };
  checked?: string;
  selected?: string;
  expanded?: string;
  delta?: number;
}

export interface JevUltrafastState {
  url: string;
  title: string;
  w: number;
  h: number;
  text: string;
  scroll: { y: number; height: number };
  actions: JevUltrafastAction[];
  marker: any;
  page_key: any;
  guards: Record<string, any>;
  omitted_actions: number;
  fingerprint?: string;
  screenshot?: string;
}

export interface IndexedElementOption {
  index: string;
  label: string;
  value: string;
}

export interface IndexedElement {
  index: string;
  label: string;
  role?: string;
  value?: string;
  checked?: string;
  selected?: string;
  expanded?: string;
  operations: string[];
  options?: IndexedElementOption[];
}

export interface ActionSpace {
  elements: IndexedElement[];
  targets: Record<string, Record<string, JevUltrafastAction>>;
  controls: Record<string, JevUltrafastAction>;
}

export interface SpeculativeDecision {
  choice: string;
  operation: string;
  target?: string | null;
  confidence: number;
  probabilities: Record<string, number>;
  operation_probabilities: Record<string, number>;
  target_probabilities: Record<string, number>;
  target_confidence?: number | null;
  raw_answers?: any;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  latency_ms: number;
  request?: any;
}

export interface TextHelperResult {
  text: string;
  helper: {
    model: string;
    latency_ms: number;
    usage?: any;
  };
}

export interface AgentStepRecord {
  step: number;
  action: string;
  kind: string;
  choice: string;
  probability: number;
  confidence: number;
  latency_ms: number;
  text?: string | null;
  text_helper?: string | null;
  text_latency_ms?: number;
  operation: string;
  target?: string | null;
  page_changed?: boolean | null;
  url: string;
  usage?: any;
  executed_ms?: number;
  elapsed_ms: number;
}

export interface AgentState {
  goal: string;
  page: JevUltrafastState;
  decision: SpeculativeDecision | null;
  history: AgentStepRecord[];
  status: "ready" | "predicted" | "done" | "blocked";
  plan: string[];
  plan_index: number;
  decisions: any[];
  text_calls: any[];
  elapsed_ms: number;
  started_at: number | null;
  record: boolean;
}
