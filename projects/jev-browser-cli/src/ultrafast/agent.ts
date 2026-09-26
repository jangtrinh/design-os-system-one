import { JevUltrafast, StalePageError } from "../jev-ultrafast.js";
import { actionSpace } from "./action-space.js";
import { CommitEngine } from "./commit-engine.js";
import { choose, fieldContext, fieldText } from "./model.js";
import { MAX_STEPS } from "./questions.js";
import type {
  AgentState,
  AgentStepRecord,
  JevUltrafastAction,
  JevUltrafastState,
  SpeculativeDecision,
} from "./types.js";

export interface AgentOptions {
  maxSteps?: number;
  dryRun?: boolean;
  screenshots?: boolean;
}

export class JevUltrafastAgent {
  private driver: JevUltrafast;
  private tabWsUrl: string;
  private maxSteps: number;
  private dryRun: boolean;
  private screenshots: boolean;
  private pendingText: { context: any; text: string; helper: any } | null = null;

  public state: AgentState;
  public commitEngine: CommitEngine;

  constructor(tabWsUrl: string, goal: string, options: AgentOptions = {}) {
    this.driver = new JevUltrafast();
    this.tabWsUrl = tabWsUrl;
    this.maxSteps = options.maxSteps || MAX_STEPS;
    this.dryRun = !!options.dryRun;
    this.screenshots = !!options.screenshots;

    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      throw new Error("Goal must not be empty");
    }

    this.state = {
      goal: trimmedGoal,
      page: null as any,
      decision: null,
      history: [],
      status: "ready",
      plan: [trimmedGoal],
      plan_index: 0,
      decisions: [],
      text_calls: [],
      elapsed_ms: 0,
      started_at: null,
      record: false,
    };

    this.commitEngine = new CommitEngine();
  }

  async init(): Promise<void> {
    await this.driver.enableFocusEmulation(this.tabWsUrl);
    this.state.page = await this.driver.observe(this.tabWsUrl, { screenshot: this.screenshots });
    this.commitEngine.updateState(this.state.page?.fingerprint || "");
  }

  snapshot(): any {
    const { elements } = actionSpace(this.state.page.actions);
    return {
      ...this.state,
      elements,
    };
  }

  async predict(): Promise<SpeculativeDecision> {
    const state = this.state;
    if (state.started_at === null) {
      state.started_at = Date.now();
    }

    if (state.status === "done" || state.status === "blocked") {
      throw new Error(`Agent run has stopped with status: ${state.status}`);
    }

    if (state.decisions.length >= this.maxSteps * 2) {
      throw new Error("Reached model decision budget");
    }

    const isFresh = await this.driver.fresh(this.tabWsUrl, state.page);
    if (!isFresh) {
      state.page = await this.driver.observe(this.tabWsUrl, { screenshot: this.screenshots });
      this.commitEngine.updateState(state.page?.fingerprint || "");
    }

    state.decision = null;
    const decision = await choose(state.page, state.goal, state.history);
    state.decision = decision;

    state.decisions.push({
      ...decision,
      fingerprint: state.page.fingerprint,
      elapsed_ms: Date.now() - state.started_at,
    });

    state.status = "predicted";
    return decision;
  }

  async act(bodyFingerprint?: string): Promise<any> {
    const state = this.state;
    const decision = state.decision;
    const page = state.page;

    if (!decision || (bodyFingerprint && bodyFingerprint !== page.fingerprint)) {
      throw new Error("Observe and predict before acting");
    }

    // Consume once before execution
    state.decision = null;
    const selected = decision.choice;

    if (selected === "DONE" || selected === "BLOCKED") {
      const isFresh = await this.driver.fresh(this.tabWsUrl, page);
      if (!isFresh) {
        state.status = "ready";
        throw new StalePageError("Page changed since decision. Predict again.");
      }

      if (selected === "DONE") {
        // Red Team Golden Synthesis: Model proposes intent, controller validates acceptance
        const hasMutations = state.history.some((h) => h.kind === "click" || h.kind === "fill");
        if (!hasMutations && state.history.length === 0) {
          state.status = "blocked";
          throw new Error(`Model proposed DONE without executing any actions towards goal: "${state.goal}". Controller rejection.`);
        }
      }

      state.status = selected === "DONE" ? "done" : "blocked";
      state.plan_index = selected === "DONE" ? 1 : 0;
      state.elapsed_ms = Date.now() - (state.started_at || Date.now());
      return this.snapshot();
    }

    const action = page.actions.find((a) => a.id === selected);
    if (!action) {
      throw new Error(`Action "${selected}" not found in page action list`);
    }

    if (state.history.length >= this.maxSteps) {
      state.status = "blocked";
      throw new Error(`Reached maximum step budget (${this.maxSteps})`);
    }

    let text: string | null = null;
    let helper: any = null;

    if (action.kind === "fill") {
      const isFresh = await this.driver.fresh(this.tabWsUrl, page);
      if (!isFresh) {
        throw new StalePageError("Page changed before text generation. Predict again.");
      }

      const context = fieldContext(state.goal, action, page, state.history);
      if (this.pendingText && JSON.stringify(this.pendingText.context) === JSON.stringify(context)) {
        text = this.pendingText.text;
        helper = this.pendingText.helper;
      } else {
        const textResult = await fieldText(context);
        text = textResult.text;
        helper = textResult.helper;
        this.pendingText = { context, text, helper };
        state.text_calls.push({ ...helper, field: action.label, value: text });
      }
    }

    const executionStarted = Date.now();
    const isExternal = action.kind === "click" || action.kind === "fill";
    const effectType: "read" | "local" | "external" = isExternal ? "external" : "local";
    const tx = this.commitEngine.beginObservation(selected, effectType);

    const commitRes = await this.commitEngine.execute({
      tx,
      judgeFn: async () => ({
        status: "ok",
        modelVersion: "jev-1.13.0",
        binding: tx.binding,
        value: { selected }
      }),
      dispatchFn: async () => {
        if (!this.dryRun) {
          await this.driver.act(this.tabWsUrl, action, page, text);
        }
        return true;
      },
      verifyPostconditionFn: async () => {
        if (this.dryRun) return true;
        const fresh = await this.driver.observe(this.tabWsUrl, { screenshot: false });
        return fresh.fingerprint !== page.fingerprint || action.kind === "wait" || action.kind === "scroll";
      },
      reconcileFn: async () => {
        if (this.dryRun) return true;
        const fresh = await this.driver.observe(this.tabWsUrl, { screenshot: false });
        return fresh.fingerprint !== page.fingerprint;
      }
    });

    if (commitRes.state === "ABORTED" || commitRes.state === "BLOCKED") {
      throw new StalePageError(`Commit rejected [${commitRes.state}]: ${commitRes.reason}`);
    }

    if (commitRes.state === "UNKNOWN" || commitRes.state === "UNCERTAIN") {
      state.status = "blocked";
      throw new Error(`Commit state uncertain: ${commitRes.reason}. Requires read-only reconciliation before subsequent mutations.`);
    }

    this.pendingText = null;

    const stepElapsed = Date.now() - (state.started_at || Date.now());
    state.elapsed_ms = stepElapsed;

    const stepRecord: AgentStepRecord = {
      step: state.history.length + 1,
      action: action.label,
      kind: action.kind,
      choice: selected,
      probability: decision.probabilities[selected] ?? decision.confidence,
      confidence: decision.confidence,
      latency_ms: decision.latency_ms,
      text,
      text_helper: helper?.model || null,
      text_latency_ms: helper?.latency_ms || 0,
      operation: decision.operation,
      target: decision.target || null,
      page_changed: null,
      url: page.url,
      usage: decision.usage,
      executed_ms: Date.now() - executionStarted,
      elapsed_ms: stepElapsed,
    };

    state.history.push(stepRecord);

    // Observe page state after action
    state.page = await this.driver.observe(this.tabWsUrl, { screenshot: this.screenshots });
    this.commitEngine.updateState(state.page?.fingerprint || "");
    state.elapsed_ms = Date.now() - (state.started_at || Date.now());

    stepRecord.page_changed = state.page.fingerprint !== page.fingerprint;
    stepRecord.url = state.page.url;
    stepRecord.elapsed_ms = state.elapsed_ms;

    // Stagnation detection: 3 consecutive actions without page change or wait
    const recent = state.history.slice(-3);
    if (recent.length === 3 && recent.every((h) => h.page_changed === false && h.kind !== "wait")) {
      state.status = "blocked";
    } else {
      state.status = "ready";
    }

    return this.snapshot();
  }

  async tick(): Promise<any> {
    try {
      await this.predict();
      return await this.act(this.state.page.fingerprint);
    } catch (err) {
      if (err instanceof StalePageError) {
        this.state.decision = null;
        this.state.status = "ready";
        this.state.page = await this.driver.observe(this.tabWsUrl, { screenshot: this.screenshots });
        if (this.state.started_at) {
          this.state.elapsed_ms = Date.now() - this.state.started_at;
        }
        return this.snapshot();
      }
      throw err;
    }
  }

  async *run(): AsyncGenerator<any> {
    if (!this.state.page) {
      await this.init();
    }
    while (this.state.status !== "done" && this.state.status !== "blocked") {
      const snap = await this.tick();
      yield snap;
    }
  }
}
