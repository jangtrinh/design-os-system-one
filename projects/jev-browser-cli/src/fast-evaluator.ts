import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { InteractiveElement, EvaluatorAction } from "./types.js";

export interface FastEvaluatorContext {
  url: string;
  title: string;
  elements: InteractiveElement[];
}

export class FastEvaluator {
  private client: TypeSafeClient | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TYPESAFE_API_KEY || "";
    if (this.apiKey) {
      try {
        this.client = new TypeSafeClient({ apiKey: this.apiKey });
      } catch {
        this.client = null;
      }
    }
  }

  /**
   * Fast Action Evaluator (Brain 1)
   * Scans DOM state and computes the optimal next action in < 200ms.
   */
  async evaluateNextAction(goal: string, context: FastEvaluatorContext): Promise<EvaluatorAction> {
    const startTime = Date.now();
    const { url, title, elements } = context;

    // 1. Goal completion check
    const isGoalAlreadyMet = this.checkGoalCompleted(goal, url, title, elements);
    if (isGoalAlreadyMet.done) {
      return {
        action: "done",
        confidence: 0.98,
        rationale: isGoalAlreadyMet.reason,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Select top actionable candidates (up to 25 items)
    const topCandidates = this.rankAndFilterElements(goal, elements);

    // 3. Try fast JEV System One decision if client is available with timeout
    if (this.client && topCandidates.length > 0) {
      try {
        const jevDecision = await Promise.race([
          this.evaluateWithJevSystemOne(goal, url, title, topCandidates),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("JEV timeout")), 180)),
        ]);

        if (jevDecision) {
          jevDecision.latencyMs = Date.now() - startTime;
          return jevDecision;
        }
      } catch {
        // Fallback directly to sub-millisecond calibrated engine
      }
    }

    // 4. Sub-millisecond Calibrated Deterministic Engine (< 5ms)
    const fastDecision = this.evaluateDeterministic(goal, url, title, topCandidates, elements);
    fastDecision.latencyMs = Date.now() - startTime;
    return fastDecision;
  }

  private rankAndFilterElements(goal: string, elements: InteractiveElement[]): InteractiveElement[] {
    const goalTokens = goal.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

    const scored = elements.map((el) => {
      let score = 0;
      const textLower = (el.text || "").toLowerCase();
      const placeholderLower = (el.placeholder || "").toLowerCase();
      const selectorLower = el.selector.toLowerCase();

      // Inputs are highly prioritized for search/type goals
      const isInputGoal = goalTokens.some((t) => ["tìm", "search", "nhập", "type", "viết", "write", "gõ"].includes(t));
      if (isInputGoal && el.isInput) {
        score += 50;
      }

      // Exact or partial token matches
      for (const token of goalTokens) {
        if (textLower.includes(token)) score += 30;
        if (placeholderLower.includes(token)) score += 35;
        if (selectorLower.includes(token)) score += 10;
      }

      // Buttons with affirmative action
      if (el.tag === "button" || el.role === "button") {
        if (["đăng", "post", "send", "gửi", "submit", "tiếp tục", "continue", "next"].some((k) => textLower.includes(k))) {
          score += 25;
        }
      }

      return { el, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 25).map((s) => s.el);
  }

  private async evaluateWithJevSystemOne(
    goal: string,
    url: string,
    title: string,
    candidates: InteractiveElement[]
  ): Promise<EvaluatorAction | null> {
    if (!this.client) return null;

    const candidateSummary = candidates
      .slice(0, 15)
      .map((c) => `#${c.id} [${c.tag}] "${c.text}" ${c.placeholder ? `placeholder="${c.placeholder}"` : ""}`)
      .join("\n");

    const criteria: Record<string, string> = {};
    for (const c of candidates.slice(0, 15)) {
      criteria[`item_${c.id}`] = `Interact with #${c.id} [${c.tag}] "${c.text}"`;
    }
    criteria["scroll_down"] = "Scroll down to find more content matching the goal.";
    criteria["done"] = "The goal has already been fully satisfied.";

    const response = await this.client.systemOne({
      state: `Goal: "${goal}"\nPage URL: "${url}"\nPage Title: "${title}"\nInteractive Candidates:\n${candidateSummary}`,
      questions: {
        action_decision: {
          type: "choice",
          instructions: "Select the single best next action to advance toward the goal.",
          criteria,
        },
      },
    });

    const answer = response.answers.action_decision;
    const choice = answer.choice || "";
    const confidence = typeof answer.confidence === "number" ? answer.confidence : 0.9;

    if (choice === "done") {
      return {
        action: "done",
        confidence,
        rationale: "Jev System One determined goal is satisfied",
        latencyMs: 0,
      };
    }

    if (choice === "scroll_down") {
      return {
        action: "scroll_down",
        confidence,
        rationale: "Jev System One decided to scroll down for target",
        latencyMs: 0,
      };
    }

    if (choice.startsWith("item_")) {
      const targetId = choice.replace("item_", "");
      const matchedEl = candidates.find((c) => c.id === targetId);
      if (matchedEl) {
        if (matchedEl.isInput) {
          const extractedText = this.extractValueToType(goal);
          return {
            action: "type",
            targetElementId: matchedEl.id,
            targetElementText: matchedEl.text || matchedEl.placeholder,
            selector: matchedEl.selector,
            value: extractedText,
            confidence,
            rationale: `Jev selected input element #${matchedEl.id}`,
            latencyMs: 0,
          };
        } else {
          return {
            action: "click",
            targetElementId: matchedEl.id,
            targetElementText: matchedEl.text,
            selector: matchedEl.selector,
            confidence,
            rationale: `Jev selected clickable element #${matchedEl.id}`,
            latencyMs: 0,
          };
        }
      }
    }

    return null;
  }

  private evaluateDeterministic(
    goal: string,
    _url: string,
    _title: string,
    candidates: InteractiveElement[],
    allElements: InteractiveElement[]
  ): EvaluatorAction {
    const goalLower = goal.toLowerCase();

    // Check if user wants to type or search
    const isTypeGoal = ["tìm", "search", "nhập", "type", "viết", "write", "gõ", "điền"].some((k) =>
      goalLower.includes(k)
    );

    if (isTypeGoal) {
      const inputEl =
        candidates.find((c) => c.isInput) || allElements.find((e) => e.isInput);

      if (inputEl) {
        const valueToType = this.extractValueToType(goal);
        return {
          action: "type",
          targetElementId: inputEl.id,
          targetElementText: inputEl.text || inputEl.placeholder,
          selector: inputEl.selector,
          value: valueToType,
          confidence: 0.95,
          rationale: `Detected input/search target [${inputEl.tag} #${inputEl.id}] matching goal`,
          latencyMs: 0,
        };
      }
    }

    // Check for click on button/link matching goal keywords
    const isClickGoal = ["click", "bấm", "chọn", "ấn", "tap", "vào", "open", "mở", "bình luận", "like", "share"].some(
      (k) => goalLower.includes(k)
    );

    if (candidates.length > 0) {
      const topMatch = candidates[0];
      return {
        action: topMatch.isInput ? "type" : "click",
        targetElementId: topMatch.id,
        targetElementText: topMatch.text || topMatch.placeholder,
        selector: topMatch.selector,
        value: topMatch.isInput ? this.extractValueToType(goal) : undefined,
        confidence: 0.88,
        rationale: `Top ranked interactive candidate [${topMatch.tag} #${topMatch.id}] for goal`,
        latencyMs: 0,
      };
    }

    // Fallback: Scroll down to reveal more items
    return {
      action: "scroll_down",
      confidence: 0.7,
      rationale: "No immediate element matched; scrolling down to reveal more content",
      latencyMs: 0,
    };
  }

  private checkGoalCompleted(
    goal: string,
    url: string,
    title: string,
    elements: InteractiveElement[]
  ): { done: boolean; reason: string } {
    const goalLower = goal.toLowerCase();

    if (goalLower.includes("ở trang") || goalLower.includes("vào trang") || goalLower.includes("mở trang")) {
      const domainMatch = goalLower.match(/([a-z0-9\-]+\.(com|net|org|io|vn|app|dev))/);
      if (domainMatch && url.includes(domainMatch[1])) {
        return { done: true, reason: `Target page ${domainMatch[1]} is already active.` };
      }
    }

    // Sent message or posted indicator
    if (goalLower.includes("gửi") || goalLower.includes("nhắn") || goalLower.includes("post") || goalLower.includes("đăng")) {
      const hasSentFeedback = elements.some((e) =>
        ["đã gửi", "sent", "posted", "thành công", "success"].some((k) => e.text.toLowerCase().includes(k))
      );
      if (hasSentFeedback) {
        return { done: true, reason: "Detected confirmation indicator on page." };
      }
    }

    return { done: false, reason: "" };
  }

  private extractValueToType(goal: string): string {
    const quoted = goal.match(/["'“](.*?)["'”]/);
    if (quoted && quoted[1]) {
      return quoted[1].trim();
    }

    const cleaned = goal
      .replace(/^(tìm|search|nhập|type|viết|gõ|điền)\s+(kiếm\s+)?(từ khóa\s+|nội dung\s+)?/i, "")
      .replace(/^(vào|vào ô|vào thanh tìm kiếm)\s+/i, "")
      .trim();

    return cleaned || "AI";
  }
}
