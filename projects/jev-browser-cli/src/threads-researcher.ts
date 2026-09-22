import type { BrowserManager } from "./browser-manager.js";
import { JevEngine } from "./jev-engine.js";

export type ViralArchetype =
  | "builder_demo"
  | "micro_carousel"
  | "curiosity_gap"
  | "community_crowdsource"
  | "builder_confession"
  | "general";

export interface ThreadsPost {
  author: string;
  timeAgo: string;
  text: string;
  carouselCards: number;
  likes: number;
  replies: number;
  reposts: number;
  shares: number;
  archetype: ViralArchetype;
  viralityScore: number;
  extractedHook: string;
}

export interface ViralDraftSuggestion {
  title: string;
  archetype: ViralArchetype;
  hook: string;
  body: string;
  cta: string;
  targetCommunity: string;
  whyViral: string;
}

export interface ViralStrategy {
  primaryRecommendedArchetype: ViralArchetype;
  hookFormula: string;
  formatAdvice: string;
  optimalLength: string;
  suggestedDrafts: ViralDraftSuggestion[];
}

export interface ThreadsResearchResult {
  communityName: string;
  memberCount?: string;
  url: string;
  postsAnalyzed: number;
  averageEngagement: {
    likes: number;
    replies: number;
    reposts: number;
    shares: number;
  };
  archetypeDistribution: Record<ViralArchetype, number>;
  topPosts: ThreadsPost[];
  strategy: ViralStrategy;
}

const KNOWN_COMMUNITIES: Record<string, { name: string; url: string }> = {
  aithreads: {
    name: "AI Threads",
    url: "https://www.threads.com/search?q=aithreads&serp_type=tags&tag_id=18406834975056806",
  },
  ai: {
    name: "AI Threads",
    url: "https://www.threads.com/search?q=aithreads&serp_type=tags&tag_id=18406834975056806",
  },
  designthreads: {
    name: "Design Threads",
    url: "https://www.threads.com/search?q=designthreads&serp_type=tags&tag_id=18398340697046067",
  },
  design: {
    name: "Design Threads",
    url: "https://www.threads.com/search?q=designthreads&serp_type=tags&tag_id=18398340697046067",
  },
  "3dprinting": {
    name: "3D Printing",
    url: "https://www.threads.com/search?q=3dprinting&serp_type=tags&tag_id=18321651793107434",
  },
  "3d": {
    name: "3D Printing",
    url: "https://www.threads.com/search?q=3dprinting&serp_type=tags&tag_id=18321651793107434",
  },
  figma: {
    name: "Figma",
    url: "https://www.threads.com/search?q=Figma&serp_type=tags&tag_id=18402707281012532",
  },
};

export class ThreadsResearcher {
  private jev: JevEngine;

  constructor(jev?: JevEngine) {
    this.jev = jev || new JevEngine();
  }

  resolveCommunity(tagOrQuery?: string): { name: string; url: string } {
    if (!tagOrQuery || tagOrQuery.trim() === "") {
      return KNOWN_COMMUNITIES["aithreads"];
    }

    const clean = tagOrQuery.toLowerCase().replace(/^#/, "").trim();
    if (KNOWN_COMMUNITIES[clean]) {
      return KNOWN_COMMUNITIES[clean];
    }

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return {
        name: "Custom URL",
        url: tagOrQuery.trim(),
      };
    }

    return {
      name: `#${tagOrQuery}`,
      url: `https://www.threads.com/search?q=${encodeURIComponent(clean)}&serp_type=default`,
    };
  }

  async researchCommunity(
    browserMgr: BrowserManager,
    communityInput?: string,
    limit = 10,
    generateDrafts = true
  ): Promise<ThreadsResearchResult> {
    const community = this.resolveCommunity(communityInput);

    // 1. Tìm target Threads tab
    const target = await browserMgr.findTarget("threads");
    if (!target) {
      throw new Error(
        "Không tìm thấy tab Threads nào đang mở trong trình duyệt DIA/Chrome (port 9222). Vui lòng mở Threads trên trình duyệt trước."
      );
    }

    // 2. Điều hướng tới community URL qua CDP Direct
    await browserMgr.navigateDirectCDP(target.webSocketDebuggerUrl, community.url);
    await new Promise((r) => setTimeout(r, 2500));

    // 3. Cuộn trang và trích xuất với cơ chế thử lại để bảo đảm nhận đủ bài viết
    let rawPosts: any[] = [];
    let communityMeta = { name: community.name, memberCount: "" };

    for (let attempt = 0; attempt < 3; attempt++) {
      await browserMgr.evaluateDirectCDP(
        target.webSocketDebuggerUrl,
        `window.scrollBy(0, ${attempt === 0 ? 400 : 700});`
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1200 : 1800));

      const meta = await browserMgr.evaluateDirectCDP<{ name: string; memberCount: string }>(
        target.webSocketDebuggerUrl,
        `(() => {
          const text = document.body.innerText;
          const memMatch = text.match(/([0-9.,]+[KMB]?\\s+members)/i);
          return {
            name: document.title.replace(" • Threads", "").trim(),
            memberCount: memMatch ? memMatch[1] : ""
          };
        })()`
      ).catch(() => null);

      if (meta && meta.name && meta.name !== "Search") {
        communityMeta = meta;
      }

      const extracted = await browserMgr.evaluateDirectCDP<any[]>(
        target.webSocketDebuggerUrl,
        `(() => {
          const bodyText = document.body.innerText;
          const lines = bodyText.split("\\n").map(l => l.trim()).filter(Boolean);
          const timeRegex = /^(?:\\d+[smhdwy]|yesterday|just now)$/i;
          const list = [];

          for (let i = 0; i < lines.length - 4; i++) {
            if (timeRegex.test(lines[i])) {
              const author = lines[i - 1];
              const timeAgo = lines[i];

              if (!author || (author.includes(" ") && !author.includes(".") && !author.includes("_"))) continue;

              let j = i + 1;
              const contentLines = [];
              let carouselCards = 1;

              while (j < lines.length && j < i + 25) {
                const line = lines[j];
                if (line === "Translate") {
                  j++;
                  continue;
                }
                if (line === "1" && lines[j + 1] === "/" && /^\\d+$/.test(lines[j + 2])) {
                  carouselCards = parseInt(lines[j + 2], 10);
                  j += 3;
                  break;
                }
                if (/^\\d+[KMB]?$/i.test(line) && lines[j + 1] && /^\\d+[KMB]?$/i.test(lines[j + 1])) {
                  break;
                }
                if (timeRegex.test(line)) {
                  break;
                }
                contentLines.push(line);
                j++;
              }

              const metrics = [];
              while (j < lines.length && metrics.length < 4 && /^\\d+[KMB]?$/i.test(lines[j])) {
                metrics.push(lines[j]);
                j++;
              }

              const text = contentLines.join("\\n").trim();
              if (text.length > 5 && author !== "For you" && author !== "Post") {
                const parseNum = (s) => {
                  if (!s) return 0;
                  const upper = s.toUpperCase();
                  if (upper.endsWith("K")) return Math.round(parseFloat(upper) * 1000);
                  if (upper.endsWith("M")) return Math.round(parseFloat(upper) * 1000000);
                  return parseInt(s, 10) || 0;
                };

                list.push({
                  author,
                  timeAgo,
                  text,
                  carouselCards,
                  likes: parseNum(metrics[0]),
                  replies: parseNum(metrics[1]),
                  reposts: parseNum(metrics[2]),
                  shares: parseNum(metrics[3]),
                });
              }
            }
          }
          return list;
        })()`
      ).catch(() => []);

      if (extracted && extracted.length > 0) {
        rawPosts = extracted;
        break;
      }
    }

    // 6. Phân loại bài viết theo 5 Viral Archetypes & Tính toán Virality Score
    const classifiedPosts: ThreadsPost[] = (rawPosts || []).map((p) => {
      const archetype = this.classifyPost(p.text, p.carouselCards);
      // Virality Score: Repost (4x) > Reply (3x) > Share (2x) > Like (1x)
      const viralityScore = p.likes * 1 + p.replies * 3 + p.reposts * 4 + p.shares * 2;
      const extractedHook = (p.text.split("\n")[0] || p.text).slice(0, 100);

      return {
        author: p.author,
        timeAgo: p.timeAgo,
        text: p.text,
        carouselCards: p.carouselCards,
        likes: p.likes,
        replies: p.replies,
        reposts: p.reposts,
        shares: p.shares,
        archetype,
        viralityScore,
        extractedHook,
      };
    });

    // Sắp xếp theo độ viral giảm dần
    classifiedPosts.sort((a, b) => b.viralityScore - a.viralityScore);
    const selectedPosts = classifiedPosts.slice(0, limit);

    // 7. Thống kê phân bổ Archetype & Tương tác trung bình
    const distribution: Record<ViralArchetype, number> = {
      builder_demo: 0,
      micro_carousel: 0,
      curiosity_gap: 0,
      community_crowdsource: 0,
      builder_confession: 0,
      general: 0,
    };

    let totalLikes = 0;
    let totalReplies = 0;
    let totalReposts = 0;
    let totalShares = 0;

    for (const post of selectedPosts) {
      distribution[post.archetype]++;
      totalLikes += post.likes;
      totalReplies += post.replies;
      totalReposts += post.reposts;
      totalShares += post.shares;
    }

    const n = Math.max(1, selectedPosts.length);
    const avgEngagement = {
      likes: Math.round(totalLikes / n),
      replies: Math.round(totalReplies / n),
      reposts: Math.round(totalReposts / n),
      shares: Math.round(totalShares / n),
    };

    // 8. Tổng hợp Chiến Lược Viral & Bản Thảo Mẫu
    const strategy = this.generateViralStrategy(
      community.name,
      distribution,
      selectedPosts,
      generateDrafts
    );

    return {
      communityName: communityMeta?.name || community.name,
      memberCount: communityMeta?.memberCount || undefined,
      url: community.url,
      postsAnalyzed: selectedPosts.length,
      averageEngagement: avgEngagement,
      archetypeDistribution: distribution,
      topPosts: selectedPosts,
      strategy,
    };
  }

  private classifyPost(text: string, carouselCards: number): ViralArchetype {
    const lower = text.toLowerCase();

    // 1. Micro Carousel (1/N hoặc nhiều hơn 1 card)
    if (carouselCards > 1 || /\b1\s*\/\s*[2-9]\b/.test(text) || lower.includes("chuỗi") || lower.includes("thread 👇")) {
      return "micro_carousel";
    }

    // 2. Curiosity Gap ("Prompt ↓", "Link ở comment", "Code in thread")
    if (
      lower.includes("prompt ↓") ||
      lower.includes("prompt 👇") ||
      lower.includes("link ↓") ||
      lower.includes("dưới comment") ||
      lower.includes("in thread") ||
      lower.includes("bên dưới")
    ) {
      return "curiosity_gap";
    }

    // 3. Community Crowdsource (Hỏi ý kiến, xin review, câu hỏi mở)
    if (
      (lower.includes("xin review") ||
        lower.includes("ai từng") ||
        lower.includes("mọi người nghĩ sao") ||
        lower.includes("có ai") ||
        lower.includes("cả nhà có")) &&
      text.includes("?")
    ) {
      return "community_crowdsource";
    }

    // 4. Builder Proof & Hard Demo (Số liệu cụ thể, thời gian, tech build)
    if (
      /\b\d+\s*(?:s|ms|fps|min|apps)\b/i.test(text) ||
      lower.includes("convert") ||
      lower.includes("blueprint") ||
      lower.includes("duration:") ||
      lower.includes("rigged") ||
      lower.includes("demo") ||
      lower.includes("just shipped") ||
      lower.includes("vừa làm xong")
    ) {
      return "builder_demo";
    }

    // 5. Authentic Builder Confession (Tâm sự, cảm xúc người làm sản phẩm)
    if (
      lower.includes("manifest") ||
      lower.includes("thú thật") ||
      lower.includes("người trong nghề") ||
      lower.includes("build after work") ||
      lower.includes("red flag")
    ) {
      return "builder_confession";
    }

    return "general";
  }

  private generateViralStrategy(
    communityName: string,
    distribution: Record<ViralArchetype, number>,
    topPosts: ThreadsPost[],
    generateDrafts: boolean
  ): ViralStrategy {
    // Xác định archetype áp đảo nhất
    const sortedArchetypes = (Object.keys(distribution) as ViralArchetype[])
      .filter((k) => k !== "general")
      .sort((a, b) => distribution[b] - distribution[a]);

    const primaryRecommendedArchetype = sortedArchetypes[0] || "micro_carousel";

    const hookFormula =
      primaryRecommendedArchetype === "micro_carousel"
        ? "[Nỗi đau thường gặp / Kết quả sốc] + [Biểu tượng cảm xúc 🤯] + [Hé lộ quy trình 1/N]"
        : primaryRecommendedArchetype === "builder_demo"
        ? "[Hành động biến đổi: Từ X thành Y trong Z giây] + [Số liệu kiểm chứng] + [Video/GIF minh họa]"
        : "[Khẳng định chuyên gia gây tò mò] + [Prompt / Link chi tiết ở thẻ tiếp theo ↓]";

    const formatAdvice =
      "Chia bài viết thành 3-4 thẻ liên hoàn. Thẻ 1 giữ vai trò Scroll-Stopper (dưới 150 ký tự). Không nhồi nhét link ngoài vào thẻ 1; đặt link ở thẻ cuối hoặc bio để tránh bị thuật toán Threads giảm phân phối.";

    const optimalLength = "Thẻ mở đầu: 80 - 160 ký tự. Các thẻ thân bài: 180 - 280 ký tự kèm bullet points rõ ràng.";

    const suggestedDrafts: ViralDraftSuggestion[] = [];

    if (generateDrafts) {
      // Draft 1: Builder Proof (Dành cho JEV Browser / Agent)
      suggestedDrafts.push({
        title: "Bản Thảo 1: Builder Proof & Real Metric (Tỷ lệ Repost cao nhất)",
        archetype: "builder_demo",
        hook: "Mất đúng 4ms để một AI Agent kết nối và điều khiển trực tiếp tab trình duyệt thật của bạn. ⚡️",
        body: "Không cần qua server trung gian, không khởi động Chromium test trống trơn.\n\nBọn mình vừa tích hợp Direct CDP Socket vào JEV Browser CLI:\n• Giữ nguyên toàn bộ cookies và phiên đăng nhập Zalo, Threads, Facebook\n• Trích xuất cây tương tác DOM nén thành synthetic IDs (#1, #2)\n• Đăng bài tự động với cơ chế khóa 'Chỉ mình tôi' 🔒 tuyệt đối an toàn\n\nToàn bộ mã nguồn mở 100% bằng TypeScript.",
        cta: "Link repo Github mình để ở thẻ tiếp theo cho anh em vọc ↓",
        targetCommunity: communityName,
        whyViral: "Đưa ra con số đo lường cụ thể (4ms), giải quyết đúng vấn đề nhức nhối của các dev làm Web Automation/Agent.",
      });

      // Draft 2: Micro-Carousel (Pain point & Quy trình 1/4)
      suggestedDrafts.push({
        title: "Bản Thảo 2: Micro-Carousel Storytelling (Thuật toán đề xuất mạnh nhất)",
        archetype: "micro_carousel",
        hook: "Ai từng làm AI Agent tự động hóa trình duyệt chắc chắn đều nếm trải nỗi sợ này... 🤯 1/4",
        body: "Mỗi lần test kịch bản post bài là run tay vì sợ bot lỡ đăng công khai lên New Feed của mình.\n\nGiải pháp của bọn mình trong bản cập nhật JEV mới:\n1. Tự động tìm và khóa đối tượng 'Chỉ mình tôi' trước khi gõ nội dung\n2. Bỏ chọn checkbox 'Đặt làm mặc định' để không phá hỏng thiết lập cá nhân\n3. Hỗ trợ Dry-run preview 100% trước khi bấm submit\n\nAn toàn là số 1 khi làm agent.",
        cta: "Anh em đang tự động hóa browser bằng tool nào? Thảo luận bên dưới nhé 👇",
        targetCommunity: communityName,
        whyViral: "Mở đầu bằng nỗi sợ thực tế của người trong nghề, định dạng carousel 1/4 buộc người đọc phải vuốt xem tiếp.",
      });

      // Draft 3: Curiosity Gap (Chia sẻ tài nguyên / Prompt)
      suggestedDrafts.push({
        title: "Bản Thảo 3: Curiosity Gap (Tỷ lệ Bình Luận & Save cao nhất)",
        archetype: "curiosity_gap",
        hook: "Cách nhanh nhất để biến bất kỳ câu lệnh tiếng Việt nào thành hành động click/type chuẩn xác trên web mà không cần viết XPath. Prompt & Architecture ↓ 1/2",
        body: "Thay vì dùng LLM khổng lồ tốn 10 giây suy nghĩ, bọn mình sử dụng TypeSafe JEV System One phân tích DOM trong 900ms:\n- Phân loại ý định (Navigate, Click, Type, Scroll)\n- Tự động map ID phần tử vào selector tối ưu\n- Chạy mượt mà trên Chrome, Arc, Dia, Edge",
        cta: "Chi tiết workflow và prompt hệ thống ở comment đầu tiên 👇",
        targetCommunity: communityName,
        whyViral: "Đánh trúng tâm lý tò mò về công nghệ mới, hướng tương tác người xem vào phần bình luận để đẩy rank bài viết.",
      });
    }

    return {
      primaryRecommendedArchetype,
      hookFormula,
      formatAdvice,
      optimalLength,
      suggestedDrafts,
    };
  }
}
