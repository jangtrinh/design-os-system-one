/**
 * HighCardinalityShortlist - Two-Phase Candidate Pruner for High-Volume Options
 *
 * Inspired by Laya v0.3.21 `laya_shortlist` and `predict_shortlist`.
 * Solves the model option-budget overflow limit (head_max_len) when an agent or UI
 * has 50 to 500+ candidate actions/options.
 * Rapidly filters candidates down to the top-K most relevant items before forwarding
 * to the System One decision model.
 */

export interface CandidateItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ShortlistResult {
  shortlist: CandidateItem[];
  originalCount: number;
  retainedCount: number;
  reductionPct: number;
  latencyMs: number;
}

export interface ShortlistOptions {
  topK?: number; // default 20
  cacheSize?: number;
}

export class HighCardinalityShortlist {
  private topK: number;
  private tokenCache: Map<string, Set<string>>;

  constructor(options: ShortlistOptions = {}) {
    this.topK = options.topK ?? 20;
    this.tokenCache = new Map();
  }

  private tokenize(text: string): Set<string> {
    if (this.tokenCache.has(text)) {
      return this.tokenCache.get(text)!;
    }
    const tokens = new Set(
      text
        .toLowerCase()
        .split(/[^a-zA-Z0-9_\-]+/)
        .filter((w) => w.length > 2)
    );
    if (this.tokenCache.size > 2000) {
      this.tokenCache.clear();
    }
    this.tokenCache.set(text, tokens);
    return tokens;
  }

  /**
   * Ranks candidates against query and returns top-K items.
   */
  filter(query: string, candidates: CandidateItem[]): ShortlistResult {
    const startTime = Date.now();
    const queryTokens = this.tokenize(query);

    if (candidates.length <= this.topK) {
      return {
        shortlist: candidates,
        originalCount: candidates.length,
        retainedCount: candidates.length,
        reductionPct: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    const scored = candidates.map((item) => {
      let score = 0;
      const itemText = `${item.label} ${item.description || ""} ${item.category || ""}`;
      const itemTokens = this.tokenize(itemText);

      for (const token of queryTokens) {
        if (itemTokens.has(token)) {
          score += 3.0;
        }
      }

      // Exact substring match bonus
      if (itemText.toLowerCase().includes(query.toLowerCase())) {
        score += 10.0;
      }

      return { item, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const shortlist = scored.slice(0, this.topK).map((s) => s.item);
    const latencyMs = Date.now() - startTime;
    const reductionPct = Math.round(
      ((candidates.length - shortlist.length) / candidates.length) * 100
    );

    return {
      shortlist,
      originalCount: candidates.length,
      retainedCount: shortlist.length,
      reductionPct,
      latencyMs,
    };
  }
}
