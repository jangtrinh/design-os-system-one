import { FastEvaluator } from "./fast-evaluator.js";
import { AsyncGuard, type GuardOptions } from "./async-guard.js";
import { BrowserManager } from "./browser-manager.js";
import { DeepDomPiercer } from "./deep-dom-piercer.js";
import type {
  EvaluatorAction,
  GuardVerdict,
  DualBrainStepResult,
  DualBrainAutoRunResult,
  InteractiveElement,
} from "./types.js";

export interface DualBrainRunOptions extends GuardOptions {
  maxSteps?: number;
  delayBetweenStepsMs?: number;
  dryRun?: boolean;
}

export class DualBrainCoordinator {
  private evaluator: FastEvaluator;
  private guard: AsyncGuard;
  private browser: BrowserManager;

  constructor(browser: BrowserManager, guardThreshold = 0.15) {
    this.browser = browser;
    this.evaluator = new FastEvaluator();
    this.guard = new AsyncGuard(guardThreshold);
  }

  /**
   * Evaluates next action using Brain 1 and verifies safety with Brain 2
   */
  async evaluateStep(
    targetQuery: string | number = 0,
    goal: string,
    options: GuardOptions = {}
  ): Promise<{ action: EvaluatorAction; guard: GuardVerdict; wsUrl: string }> {
    const target = await this.browser.findTarget(targetQuery);
    if (!target || !target.webSocketDebuggerUrl) {
      throw new Error(`Browser target not found for query: ${targetQuery}`);
    }

    const wsUrl = target.webSocketDebuggerUrl;

    // Deep DOM Extraction (<25ms via CDP, piercing Shadow DOM & same-origin iframes)
    const domData = await this.browser.evaluateDirectCDP<{
      url: string;
      title: string;
      elements: InteractiveElement[];
    }>(wsUrl, DeepDomPiercer.getExtractionScript(75));

    // Brain 1: Fast Action Evaluator (<200ms)
    const action = await this.evaluator.evaluateNextAction(goal, domData);

    // Brain 2: Asynchronous Safety Guard (<2ms)
    const guard = await this.guard.evaluateSafety(action, domData.url, options);

    return { action, guard, wsUrl };
  }

  /**
   * Executes a verified EvaluatorAction directly via CDP
   */
  async executeAction(wsUrl: string, action: EvaluatorAction): Promise<{ success: boolean; error?: string }> {
    try {
      if (action.action === "done") {
        return { success: true };
      }

      if (action.action === "scroll_down") {
        await this.browser.evaluateDirectCDP(
          wsUrl,
          `(() => {
            const scroller = document.querySelector('[data-list-id="chat-messages"]') || document.querySelector('[class*="scroller"]') || window;
            if (scroller.scrollBy) {
              scroller.scrollBy(0, 600);
            } else {
              window.scrollBy(0, 600);
            }
          })()`
        );
        return { success: true };
      }

      if (action.action === "scroll_up") {
        await this.browser.evaluateDirectCDP(
          wsUrl,
          `(() => {
            const scroller = document.querySelector('[data-list-id="chat-messages"]') || document.querySelector('[class*="scroller"]') || window;
            if (scroller.scrollBy) {
              scroller.scrollBy(0, -600);
            } else {
              window.scrollBy(0, -600);
            }
          })()`
        );
        return { success: true };
      }

      if (action.action === "click") {
        const selector = action.selector || "";
        const clicked = await this.browser.evaluateDirectCDP<boolean>(
          wsUrl,
          DeepDomPiercer.getClickScript(selector, action.targetElementText || "")
        );
        if (!clicked) {
          return { success: false, error: `Element not found for click: ${selector}` };
        }
        return { success: true };
      }

      if (action.action === "type") {
        const selector = action.selector || "";
        const textToType = action.value || "";
        const typed = await this.browser.evaluateDirectCDP<boolean>(
          wsUrl,
          `(() => {
            function findDeep(sel) {
              if (!sel.includes(" >>> ")) return document.querySelector(sel);
              const parts = sel.split(" >>> ");
              let curr = document;
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i].trim();
                if (i === 0) {
                  const host = curr.querySelector(part);
                  if (!host) return null;
                  curr = host.shadowRoot || host.contentDocument || host;
                } else {
                  const found = curr.querySelector(part);
                  if (!found) return null;
                  if (i < parts.length - 1) {
                    curr = found.shadowRoot || found.contentDocument || found;
                  } else {
                    return found;
                  }
                }
              }
              return null;
            }

            let el = findDeep(${JSON.stringify(selector)});
            if (!el) {
              el = document.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]');
            }
            if (el) {
              el.focus();
              if (el.isContentEditable) {
                el.innerText = ${JSON.stringify(textToType)};
              } else {
                el.value = ${JSON.stringify(textToType)};
              }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            return false;
          })()`
        );
        if (!typed) {
          return { success: false, error: `Input element not found for selector: ${selector}` };
        }
        return { success: true };
      }

      if (action.action === "navigate" && action.value) {
        await this.browser.navigateDirectCDP(wsUrl, action.value);
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Autonomous Auto-Step Loop powered by Dual-Brain
   */
  async autoRun(
    targetQuery: string | number = 0,
    goal: string,
    options: DualBrainRunOptions = {}
  ): Promise<DualBrainAutoRunResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps ?? 8;
    const delayMs = options.delayBetweenStepsMs ?? 800;
    const steps: DualBrainStepResult[] = [];

    let completed = false;
    let stoppedReason = "Max steps reached";

    for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
      const stepStartTime = Date.now();
      const { action, guard, wsUrl } = await this.evaluateStep(targetQuery, goal, options);

      // Check if Guard blocked
      if (!guard.allowed) {
        steps.push({
          step: stepIndex,
          action,
          guard,
          executed: false,
          executionError: guard.guardReason,
          durationMs: Date.now() - stepStartTime,
        });
        stoppedReason = `STOPPED by Asynchronous Guard: ${guard.guardReason}`;
        break;
      }

      // Check if Goal is already met
      if (action.action === "done") {
        steps.push({
          step: stepIndex,
          action,
          guard,
          executed: true,
          durationMs: Date.now() - stepStartTime,
        });
        completed = true;
        stoppedReason = `Goal achieved in ${stepIndex} step(s): ${action.rationale}`;
        break;
      }

      // Execute Action
      let executed = false;
      let executionError: string | undefined;

      if (options.dryRun) {
        executed = true; // Simulated execution
      } else {
        const execResult = await this.executeAction(wsUrl, action);
        executed = execResult.success;
        executionError = execResult.error;
      }

      steps.push({
        step: stepIndex,
        action,
        guard,
        executed,
        executionError,
        durationMs: Date.now() - stepStartTime,
      });

      if (!executed) {
        stoppedReason = `Failed executing action at step ${stepIndex}: ${executionError}`;
        break;
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    return {
      goal,
      completed,
      totalSteps: steps.length,
      totalDurationMs: Date.now() - startTime,
      steps,
      stoppedReason,
    };
  }
}
