import fs from "fs";
import path from "path";
import { BrowserManager } from "./browser-manager.js";
import { CdpSessionPool } from "./cdp-session-pool.js";
import { SocialViralCurator, type CuratorPlatform } from "./social-viral-curator.js";
import { AsyncGuard } from "./async-guard.js";
import type {
  SocialPostCandidate,
  SocialEngagementReport,
  EngagementTarget,
} from "./types.js";

export type EngagementPersona =
  | "principal_engineer"
  | "product_designer"
  | "hardware_specialist"
  | "general_tech";

export interface SocialEngageOptions {
  platform?: CuratorPlatform;
  query?: string;
  limit?: number;
  minViral?: number;
  maxSlop?: number;
  persona?: EngagementPersona;
  dryRun?: boolean;
  autoSubmit?: boolean;
  screenshotDir?: string;
  tabQuery?: string | number;
  maxEngagements?: number;
}

export class SocialEngagementWorkflow {
  private curator: SocialViralCurator;
  private guard: AsyncGuard;

  constructor(guardThreshold = 0.15) {
    this.curator = new SocialViralCurator();
    this.guard = new AsyncGuard(guardThreshold);
  }

  /**
   * Tạo nội dung bình luận chuyên sâu dựa trên ngữ cảnh bài viết và Persona kỹ thuật
   */
  generateComment(post: SocialPostCandidate, persona: EngagementPersona = "principal_engineer"): string {
    const text = post.text.toLowerCase();

    if (persona === "principal_engineer" || persona === "hardware_specialist") {
      if (text.includes("kicad") || text.includes("pcb") || text.includes("hardware") || text.includes("eda")) {
        return "Brilliant execution on bridging generative agents directly with EDA engines. The distinction you made regarding human-in-the-loop for physical constraints (creepage, thermals, and current density) is spot on — LLMs excel at symbolic netlist routing and boilerplate DRC checks, but multi-physics boundary conditions still require domain validation. Are you planning to incorporate automated thermal simulation feedback loops back into the agent prompt context for component placement optimization?";
      }

      if (text.includes("three.js") || text.includes("webgl") || text.includes("gsap") || text.includes("3d web")) {
        return "Great visual execution! In interactive 3D web applications, the hardest technical bottleneck is often balancing asset pipeline compression (DRACO/KTX2) against draw call limits to maintain 60fps on mobile Safari. How are you handling memory disposal between scene transitions to prevent WebGL context loss?";
      }

      if (text.includes("value of a designer") || text.includes("ai can do my work") || text.includes("ux") || text.includes("design thinking")) {
        return "Completely agree. Generative AI drastically compresses the cost of generating UI variants to near zero, which paradoxically makes curation, problem framing, and systems thinking the scarce, high-value skills. When anyone can generate 20 polished dashboards in 30 seconds, the real engineering & design challenge is knowing which trade-offs (cognitive load, information architecture, edge-case failure states) actually serve the product's core intent. The future belongs to designers who think like system architects.";
      }

      if (text.includes("render") || text.includes("prototyp") || text.includes("enclosure") || text.includes("cad")) {
        return "Love the rapid transition from system architectural spec to 3D industrial enclosure renders. In physical product engineering, shortening the concept-to-spatial-validation loop like this gives founders an unfair advantage when pitching or aligning cross-functional teams early. Looking forward to seeing the actual on-device thermal performance and edge-inference benchmarks of the unit!";
      }

      // Default high-level systems thinking comment
      return "Spot-on pragmatic reality check. There is a huge gulf between AI tech demos and mission-critical production pipelines where reliability, deterministic constraints, and day-to-day workflow ergonomics matter ten times more than novelty. Fixing latency, reducing friction in existing core tools, and automating repetitive grunt work delivers far more tangible ROI to engineering teams than chasing every new hype cycle.";
    }

    if (persona === "product_designer") {
      return "Strong points here. When AI automates the mechanical phase of layout generation, the human role elevates to defining the underlying mental model, accessibility hierarchies, and error recovery ergonomics. The differentiator won't be who prompts faster, but who understands cognitive friction better.";
    }

    return "Insightful breakdown. What stands out most is the focus on tangible implementation trade-offs rather than abstract theory. Curious how your team approaches regression validation as the AI workflow evolves!";
  }

  /**
   * Thực thi toàn bộ chu trình: Tìm kiếm -> Lọc Slop -> Chấm điểm Viral -> Tạo Comment -> Đăng & Nghiệm thu
   */
  async runWorkflow(
    browserMgr: BrowserManager,
    options: SocialEngageOptions = {}
  ): Promise<SocialEngagementReport> {
    const start = Date.now();
    const platform = options.platform || "linkedin";
    const limit = options.limit || 8;
    const persona = options.persona || "principal_engineer";
    const dryRun = options.dryRun ?? false;
    const autoSubmit = options.autoSubmit ?? false;
    const maxEngagements = options.maxEngagements || 1;
    const screenshotDir = options.screenshotDir || process.cwd();

    // 1. Kết nối hoặc chuyển hướng đến URL tìm kiếm nếu có query
    let tab = await browserMgr.findTarget(options.tabQuery);
    if (!tab) {
      throw new Error(`Không tìm thấy tab trình duyệt phù hợp trên port 9222`);
    }

    const pool = CdpSessionPool.getInstance();

    if (options.query && platform === "linkedin") {
      const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(options.query)}&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22`;
      await pool.send(tab.webSocketDebuggerUrl, "Page.navigate", { url: searchUrl });
      // Chờ page load
      await new Promise((r) => setTimeout(r, 3500));
      // Refresh tab metadata
      const updatedTab = await browserMgr.findTarget(options.tabQuery);
      if (updatedTab) tab = updatedTab;
    }

    // 2. Quét & Lọc nội dung với SocialViralCurator
    const curatorReport = await this.curator.curateFeed(browserMgr, {
      platform,
      limit,
      minViral: options.minViral,
      maxSlop: options.maxSlop ?? 40,
      tabQuery: options.tabQuery,
    });

    // Sắp xếp bài viết chất lượng cao nhất: verdict = HIGH_PRIORITY_ENGAGE hoặc viralScore cao nhất, slop = 0
    const sortedCandidates = curatorReport.posts
      .filter((p) => p.slopScore <= (options.maxSlop ?? 40))
      .sort((a, b) => b.viralScore - a.viralScore);

    const candidatesToEngage = sortedCandidates.slice(0, maxEngagements);
    const engagedTargets: EngagementTarget[] = [];

    for (const post of candidatesToEngage) {
      const comment = this.generateComment(post, persona);

      // 3. Kiểm duyệt an toàn qua AsyncGuard trước khi tương tác
      const guardCheck = await this.guard.evaluateSafety(
        {
          action: "type",
          selector: 'div[role="textbox"]',
          targetElementText: "Comment",
          value: comment,
          confidence: 1.0,
          rationale: `Automated social engagement for ${post.author}`,
          latencyMs: 0,
        },
        tab.url
      );

      if (!guardCheck.allowed) {
        engagedTargets.push({
          postId: post.id,
          author: post.author,
          postPreview: post.text.slice(0, 100),
          archetype: post.archetype,
          viralScore: post.viralScore,
          slopScore: post.slopScore,
          comment,
          status: "blocked_by_guard",
          error: `Blocked by AsyncGuard: ${guardCheck.guardReason}`,
        });
        continue;
      }

      // 4. Tương tác DOM trực tiếp qua CDP
      try {
        const authorKeywords = post.author.split(/[\s|•-]+/).filter((w) => w.length >= 3);
        const searchKeyword = authorKeywords[0] || post.author.slice(0, 10);

        // a. Mở hộp bình luận
        await pool.evaluate(
          tab.webSocketDebuggerUrl,
          `(() => {
            const containers = Array.from(document.querySelectorAll('div[data-view-name="search-entity-result-universal-template"], div[componentkey], div.feed-shared-update-v2, div[data-urn]'));
            for (const c of containers) {
              if ((c.innerText || '').includes(${JSON.stringify(searchKeyword)})) {
                let editor = c.querySelector('div[role="textbox"], div.tiptap.ProseMirror');
                if (!editor) {
                  const btn = c.querySelector('button[aria-label="Comment"], button[aria-label*="Bình luận"]');
                  if (btn) {
                    btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                    btn.click();
                    return { opened: true };
                  }
                } else {
                  return { alreadyOpen: true };
                }
              }
            }
            return { opened: false };
          })()`
        );

        await new Promise((r) => setTimeout(r, 1500));

        // b. Nhập nội dung vào rich-text editor (ProseMirror / Tiptap)
        const injectRes = await pool.evaluate(
          tab.webSocketDebuggerUrl,
          `(() => {
            const containers = Array.from(document.querySelectorAll('div[data-view-name="search-entity-result-universal-template"], div[componentkey], div.feed-shared-update-v2, div[data-urn]'));
            for (const c of containers) {
              if ((c.innerText || '').includes(${JSON.stringify(searchKeyword)})) {
                const editor = c.querySelector('div[role="textbox"][aria-label="Text editor for creating comment"], div.tiptap.ProseMirror, div[role="textbox"]');
                if (!editor) return { error: 'Editor not found' };

                editor.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, ${JSON.stringify(comment)});
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                return { success: true };
              }
            }
            return { error: 'Container not found' };
          })()`
        );

        await new Promise((r) => setTimeout(r, 1000));

        let verified = false;
        let screenshotPath: string | undefined;

        if (dryRun || !autoSubmit) {
          // Chỉ chụp ảnh bản nháp chưa gửi
          const ss = await pool.send(tab.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 90 });
          screenshotPath = path.join(screenshotDir, `draft_engage_${Date.now()}.png`);
          fs.writeFileSync(screenshotPath, Buffer.from(ss.data, "base64"));

          engagedTargets.push({
            postId: post.id,
            author: post.author,
            postPreview: post.text.slice(0, 100),
            archetype: post.archetype,
            viralScore: post.viralScore,
            slopScore: post.slopScore,
            comment,
            status: "draft_ready",
            screenshotPath,
            verified: false,
          });
        } else {
          // c. Nhấn nút gửi bình luận ("Comment")
          await pool.evaluate(
            tab.webSocketDebuggerUrl,
            `(() => {
              const containers = Array.from(document.querySelectorAll('div[data-view-name="search-entity-result-universal-template"], div[componentkey], div.feed-shared-update-v2, div[data-urn]'));
              for (const c of containers) {
                if ((c.innerText || '').includes(${JSON.stringify(searchKeyword)})) {
                  const allButtons = Array.from(c.querySelectorAll('button'));
                  const commentBtn = allButtons.find(b => (b.innerText || '').trim() === 'Comment' || (b.innerText || '').trim() === 'Bình luận');
                  if (commentBtn) {
                    commentBtn.click();
                    return { submitted: true };
                  }
                }
              }
              return { submitted: false };
            })()`
          );

          await new Promise((r) => setTimeout(r, 3500));

          // d. Xác minh xuất bản trên DOM
          const verifyRes = await pool.evaluate(
            tab.webSocketDebuggerUrl,
            `(() => {
              const bodyText = document.body.innerText || '';
              return {
                hasComment: bodyText.includes(${JSON.stringify(comment.slice(0, 40))})
              };
            })()`
          );
          verified = Boolean(verifyRes?.hasComment);

          // e. Chụp ảnh nghiệm thu
          const ss = await pool.send(tab.webSocketDebuggerUrl, "Page.captureScreenshot", { format: "png", quality: 90 });
          screenshotPath = path.join(screenshotDir, `verified_engage_${Date.now()}.png`);
          fs.writeFileSync(screenshotPath, Buffer.from(ss.data, "base64"));

          engagedTargets.push({
            postId: post.id,
            author: post.author,
            postPreview: post.text.slice(0, 100),
            archetype: post.archetype,
            viralScore: post.viralScore,
            slopScore: post.slopScore,
            comment,
            status: verified ? "submitted" : "failed",
            screenshotPath,
            verified,
          });
        }
      } catch (err: any) {
        engagedTargets.push({
          postId: post.id,
          author: post.author,
          postPreview: post.text.slice(0, 100),
          archetype: post.archetype,
          viralScore: post.viralScore,
          slopScore: post.slopScore,
          comment,
          status: "failed",
          error: err.message,
        });
      }
    }

    return {
      platform,
      query: options.query,
      totalScanned: curatorReport.totalScanned,
      selectedTargets: engagedTargets,
      dryRun,
      autoSubmit,
      durationMs: Date.now() - start,
    };
  }
}
