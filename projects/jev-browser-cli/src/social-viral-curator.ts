import type { BrowserManager } from "./browser-manager.js";
import { JevEngine } from "./jev-engine.js";
import type { SocialPostCandidate, SocialCuratorReport } from "./types.js";

export type CuratorPlatform = "threads" | "linkedin" | "x" | "auto";
export type ViralArchetype =
  | "builder_demo"
  | "micro_carousel"
  | "curiosity_gap"
  | "community_crowdsource"
  | "builder_confession"
  | "general";

export interface CuratorOptions {
  platform?: CuratorPlatform;
  limit?: number;
  minViral?: number;
  maxSlop?: number;
  draftReply?: boolean;
  mock?: boolean;
  tabQuery?: string | number;
}

export interface RawScrapedPost {
  id?: string;
  author: string;
  text: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  shares?: number;
  timestamp?: string;
  url?: string;
  carouselCards?: number;
}

// AI Fluff & Generic Thought Leadership Dictionary (PureLink / Your-Signal Inspired)
const SLOP_BUZZWORDS = [
  "in today's fast-paced world",
  "in today's digital landscape",
  "in the ever-evolving world of",
  "in today's rapidly changing",
  "delve into",
  "delving into",
  "dive deep into",
  "let's unpack this",
  "game-changer",
  "game changer",
  "revolutionary breakthrough",
  "testament to the power",
  "tapestry of",
  "beacon of",
  "pivotal role",
  "unlock the true power of",
  "supercharge your workflow",
  "10x your productivity",
  "unleash the potential",
  "humbled and honored",
  "thrilled to announce",
  "excited to share that i",
  "let that sink in",
  "agree?",
  "thoughts?",
  "what do you think?",
  "synergy",
  "paradigm shift",
  "hyper-growth",
  "hypergrowth",
  "thought leader",
  "seamlessly integrate",
  "holistic approach",
  "10 ai tools that will save you",
  "top 5 tools you can't miss",
  "cheat sheet for",
  "most people don't realize this:",
  "stop scrolling!",
];

export class SocialViralCurator {
  private jev: JevEngine;

  constructor(jev?: JevEngine) {
    this.jev = jev || new JevEngine();
  }

  detectPlatform(url: string): "threads" | "linkedin" | "x" | "unknown" {
    const u = url.toLowerCase();
    if (u.includes("threads.net") || u.includes("threads.com")) return "threads";
    if (u.includes("linkedin.com")) return "linkedin";
    if (u.includes("x.com") || u.includes("twitter.com")) return "x";
    return "unknown";
  }

  /**
   * Phân loại bài viết theo 5 Hình Mẫu Viral (5 Proven Archetypes)
   */
  classifyArchetype(text: string, carouselCards = 1): { archetype: ViralArchetype; score: number; signals: string[] } {
    const lower = text.toLowerCase();
    const signals: string[] = [];

    // 1. Curiosity Gap ("Prompt ↓", "Code in thread", "Link ở comment")
    if (
      lower.includes("prompt ↓") ||
      lower.includes("prompt 👇") ||
      lower.includes("link ↓") ||
      lower.includes("link ở comment") ||
      lower.includes("code in thread") ||
      lower.includes("bên dưới comment") ||
      lower.includes("recipe below")
    ) {
      signals.push("Curiosity Gap: Hé lộ kết quả ấn tượng và giữ công thức ở comment/thẻ sau");
      return { archetype: "curiosity_gap", score: 36, signals };
    }

    // 2. Multi-part Micro-Carousel (1/4, 1/5, Chuỗi thẻ)
    if (carouselCards > 1 || /\b1\s*\/\s*[2-9]\b/.test(text) || /\b\(1\/[2-9]\)/.test(text) || lower.includes("chuỗi") || lower.includes("thread 👇")) {
      signals.push("Micro-Carousel: Định dạng chuỗi thẻ liên hoàn (1/N) tối ưu thuật toán giữ chân");
      return { archetype: "micro_carousel", score: 36, signals };
    }

    // 3. Community Crowdsource (Câu hỏi chuyên gia, khảo sát ý kiến, xin review)
    const hasNumberedQuestion = /(?:^|\n)\s*(?:1[\.\)]|1\s*[-:])\s+.+(?:\n|\s+)(?:2[\.\)]|2\s*[-:])/m.test(text);
    const asksFeedback = (lower.includes("xin review") || lower.includes("ai từng") || lower.includes("mọi người nghĩ sao") || lower.includes("cả nhà có") || lower.includes("how do you") || lower.includes("any recommendations")) && text.includes("?");
    if (hasNumberedQuestion || asksFeedback) {
      signals.push("Community Crowdsource: Đặt câu hỏi cụ thể, kích thích thảo luận chuyên sâu");
      return { archetype: "community_crowdsource", score: 35, signals };
    }

    // 4. Builder Proof & Hard Demo (Số liệu cụ thể, benchmark, latency, open-source code)
    const hasMetrics = /\b\d+(\.\d+)?\s*(ms|s|fps|min|apps|k tokens|requests|runs|users)\b/i.test(text);
    const hasBuildArtifact = /\b(github\.com|repo|open source|shipped|built|demo|benchmark|architecture|cdp|socket)\b/i.test(text);
    if (hasMetrics && hasBuildArtifact) {
      signals.push("Builder Proof: Chứa số liệu kỹ thuật đo lường (ms/fps) + mã nguồn/demo");
      return { archetype: "builder_demo", score: 40, signals };
    }
    if (hasMetrics || (hasBuildArtifact && /\b(vừa làm xong|just shipped|mới tích hợp|built this)\b/i.test(text))) {
      signals.push("Builder Proof: Chia sẻ sản phẩm thực chiến và tiến độ build");
      return { archetype: "builder_demo", score: 35, signals };
    }

    // 5. Authentic Builder Confession (Tâm sự nghề nghiệp, mẩu chuyện thật, bài học)
    if (
      lower.includes("thú thật") ||
      lower.includes("người trong nghề") ||
      lower.includes("build after work") ||
      lower.includes("late night") ||
      lower.includes("bài học xương máu") ||
      lower.includes("red flag") ||
      lower.includes("vulnerability")
    ) {
      signals.push("Builder Confession: Câu chuyện làm sản phẩm chân thực, không màu mè");
      return { archetype: "builder_confession", score: 30, signals };
    }

    return { archetype: "general", score: 15, signals: ["Nội dung chung, không khớp 5 archetypes viral"] };
  }

  /**
   * Đánh giá Hook Strength (0 - 25 điểm)
   */
  evaluateHookStrength(text: string): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const hook = lines[0] || text.slice(0, 120);

    // 1. Độ dài tối ưu (dưới 150 ký tự)
    if (hook.length >= 40 && hook.length <= 150) {
      score += 10;
      reasons.push("Hook cô đọng (<150 ký tự), dễ dừng ngón tay lướt");
    } else if (hook.length > 220) {
      score += 2;
      reasons.push("Hook quá dài, dễ bị tràn dòng trước khi kích thích tò mò");
    } else {
      score += 5;
    }

    // 2. Không chèn link ngoài ở dòng mở đầu (tránh bóp tương tác)
    if (!/https?:\/\//i.test(hook)) {
      score += 5;
      reasons.push("Không chứa link ngoài ở dòng mở đầu (giữ phân phối thuật toán)");
    } else {
      reasons.push("Cảnh báo: Có link ngoài ở câu đầu (thuật toán có thể giảm hiển thị)");
    }

    // 3. Yếu tố kích thích cảm xúc / hình ảnh trực quan
    if (/[\⚡️\🤯\🚨\🔥\💡\❤️\💥]/.test(hook) || /[\?!:—–]/.test(hook)) {
      score += 5;
      reasons.push("Có điểm nhấn trực quan / biểu cảm kích thích thị giác");
    }

    // 4. Số liệu hoặc hành động rõ ràng
    if (/\b\d+\b/.test(hook) || /\b(tại sao|cách|how|why|zero|100%)\b/i.test(hook)) {
      score += 5;
      reasons.push("Chứa con số hoặc từ khóa hành động cụ thể");
    }

    return { score: Math.min(25, score), reasons };
  }

  /**
   * Tính toán Viral Score (0 - 100)
   */
  calculateViralScore(
    text: string,
    metrics?: { likes?: number; replies?: number; reposts?: number; shares?: number },
    carouselCards = 1
  ): { viralScore: number; archetype: ViralArchetype; reasons: string[] } {
    const archetypeResult = this.classifyArchetype(text, carouselCards);
    const hookResult = this.evaluateHookStrength(text);
    const reasons: string[] = [...archetypeResult.signals, ...hookResult.reasons];

    let score = archetypeResult.score + hookResult.score;

    // Engagement Signal Weighting: Repost (4x) > Reply (3x) > Share (2x) > Like (1x)
    if (metrics && (metrics.likes || metrics.replies || metrics.reposts || metrics.shares)) {
      const likes = metrics.likes || 0;
      const replies = metrics.replies || 0;
      const reposts = metrics.reposts || 0;
      const shares = metrics.shares || 0;

      const rawEngagement = likes * 1 + replies * 3 + reposts * 4 + shares * 2;
      const velocityBonus = Math.min(35, Math.round(Math.log10(rawEngagement + 1) * 8.5));
      score += velocityBonus;

      if (reposts > 5 || replies > 10) {
        reasons.push(`Tín hiệu tương tác cao: ${reposts} reposts, ${replies} replies, ${likes} likes (+${velocityBonus}đ)`);
      }
    } else {
      // Nếu là bài mới / chưa có chỉ số: chuẩn hóa dựa trên tiềm năng cấu trúc
      score = Math.round(score * 1.45);
    }

    const finalViral = Math.max(0, Math.min(100, score));
    return {
      viralScore: finalViral,
      archetype: archetypeResult.archetype,
      reasons,
    };
  }

  /**
   * Tính toán AI Slop Score (0 - 100)
   * Đánh giá mức độ sáo rỗng, ngôn ngữ máy móc kiểu ChatGPT, và thought-leadership rỗng tuếch
   */
  calculateSlopScore(text: string): { slopScore: number; reasons: string[] } {
    const lower = text.toLowerCase();
    const reasons: string[] = [];
    let score = 0;

    // 1. Kiểm tra danh từ sáo rỗng và cụm từ AI khuôn mẫu
    let buzzwordHits = 0;
    for (const phrase of SLOP_BUZZWORDS) {
      if (lower.includes(phrase)) {
        buzzwordHits++;
        score += 15;
        reasons.push(`Phát hiện cụm từ AI khuôn mẫu: "${phrase}"`);
      }
    }

    // 2. Mật độ Emoji đầu dòng thái quá (Bullet Emoji Spam)
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const emojiBulletLines = lines.filter((l) => /^[\p{Extended_Pictographic}\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]\s+/u.test(l));
    if (lines.length >= 4 && emojiBulletLines.length / lines.length > 0.6) {
      score += 25;
      reasons.push("Định dạng liệt kê emoji dày đặc (>60% số dòng bắt đầu bằng emoji)");
    }

    // 3. Kết thúc lười biếng kiểu "Agree?", "Thoughts?"
    const lastLine = (lines[lines.length - 1] || "").toLowerCase();
    if (/^(agree\??|thoughts\??|bạn nghĩ sao\??|đúng không\??)$/i.test(lastLine)) {
      score += 20;
      reasons.push("Kết bài sáo rỗng kiểu câu view lười biếng ('Agree?' / 'Thoughts?')");
    }

    // 4. Bài dài nhưng hoàn toàn thiếu thực chất (không số liệu, không mã nguồn, không tên công nghệ)
    const hasConcreteTech = /\b(git|github|typescript|python|rust|cdp|playwright|wasm|socket|api|database|sql|model|gpu|cpu|latency|benchmark)\b/i.test(text);
    const hasNumbers = /\b\d+(\.\d+)?\b/.test(text);
    if (text.length > 300 && !hasConcreteTech && !hasNumbers) {
      score += 25;
      reasons.push("Nội dung dài nhưng trừu tượng, thiếu dẫn chứng số liệu hoặc kỹ thuật cụ thể");
    }

    // 5. Điểm cộng giảm slop (High-Signal Mitigators)
    if (text.includes("github.com/") || text.includes("demo") || text.includes("shipped")) {
      score = Math.max(0, score - 20);
      reasons.push("Có liên kết mã nguồn / bằng chứng thực thi giảm điểm Slop (-20)");
    }
    if (/\b\d+\s*(?:ms|fps|s|%)\b/i.test(text)) {
      score = Math.max(0, score - 15);
      reasons.push("Có chỉ số hiệu năng kiểm chứng giảm điểm Slop (-15)");
    }

    const finalSlop = Math.max(0, Math.min(100, score));
    return { slopScore: finalSlop, reasons };
  }

  /**
   * Tính toán Verdict dựa trên ngưỡng chuẩn
   * - HIGH_PRIORITY_ENGAGE: viralScore >= 70 && slopScore <= 30
   * - AI_SLOP_SKIP: slopScore > 60
   * - NEUTRAL: trường hợp còn lại
   */
  determineVerdict(viralScore: number, slopScore: number): "HIGH_PRIORITY_ENGAGE" | "NEUTRAL" | "AI_SLOP_SKIP" {
    if (slopScore > 60) return "AI_SLOP_SKIP";
    if (viralScore >= 70 && slopScore <= 30) return "HIGH_PRIORITY_ENGAGE";
    return "NEUTRAL";
  }

  /**
   * Tự động tạo bản thảo bình luận sắc bén, giá trị cao (High-Value Contextual Comment)
   */
  generateSuggestedEngagement(post: {
    author: string;
    text: string;
    archetype?: string;
    viralScore: number;
    slopScore: number;
    platform: string;
  }): string {
    const { archetype, text, author } = post;
    const lower = text.toLowerCase();

    // 1. Builder Proof
    if (archetype === "builder_demo") {
      const msMatch = text.match(/(\d+\s*ms)/i);
      const metric = msMatch ? msMatch[1] : "con số đo lường";
      return `Chỉ số ${metric} rất ấn tượng. Anh em cho mình hỏi khi số lượng DOM mutations tăng đột biến trong các trang SPA lớn, bạn có phải tinh chỉnh throttling ở tầng CDP để tránh nghẽn socket không? Bọn mình cũng đang tối ưu luồng này trên JEV.`;
    }

    // 2. Micro-Carousel
    if (archetype === "micro_carousel") {
      return `Phân tích ở thẻ 2 và 3 rất sát thực tế. Với những team chuyển từ kiến trúc cũ sang mô hình này, rào cản lớn nhất thường là đồng bộ state giữa các service. Bên bạn giải quyết phần này theo hướng event-driven hay direct polling?`;
    }

    // 3. Curiosity Gap
    if (archetype === "curiosity_gap") {
      return `Kết quả demo mượt mà đấy bạn! Tò mò một chút về decision boundary khi gặp các trường hợp prompt bị ambiguous/nhiễu — bạn xử lý bằng fallback rubric riêng hay để model tự đưa ra escape hatch?`;
    }

    // 4. Community Crowdsource
    if (archetype === "community_crowdsource") {
      return `Chia sẻ nhanh góc nhìn từ kinh nghiệm thực chiến:\n1. Về độ ổn định: Chạy direct CDP socket qua port 9222 ổn định hơn nhiều so với qua server trung gian.\n2. Về tài nguyên: Giữ headless/lightweight session giúp giảm 80% RAM so với mở full GUI browser. Rất đáng để thử nghiệm!`;
    }

    // 5. Builder Confession
    if (archetype === "builder_confession") {
      return `Rất đồng cảm với chia sẻ của bạn. Khoảnh khắc chuyển từ 'làm cho chạy được' sang 'sản phẩm thật có người dùng' luôn nhiều trắc trở nhưng cũng đáng giá nhất. Chúc sản phẩm tiếp tục cất cánh! 🚀`;
    }

    // General fallback
    return `Góc nhìn rất thú vị từ ${author}. Điểm mình thấy tâm đắc nhất là cách bạn tiếp cận bài toán từ trải nghiệm thực tế thay vì lý thuyết suông. Hóng thêm các update tiếp theo của dự án!`;
  }

  /**
   * Đánh giá toàn diện 1 bài viết
   */
  async evaluatePost(raw: RawScrapedPost, platform: string): Promise<SocialPostCandidate> {
    const { viralScore, archetype, reasons: viralReasons } = this.calculateViralScore(
      raw.text,
      {
        likes: raw.likes,
        replies: raw.replies,
        reposts: raw.reposts,
        shares: raw.shares,
      },
      raw.carouselCards || 1
    );

    const { slopScore, reasons: slopReasons } = this.calculateSlopScore(raw.text);
    const verdict = this.determineVerdict(viralScore, slopScore);

    const suggestedEngagement =
      verdict === "HIGH_PRIORITY_ENGAGE" || verdict === "NEUTRAL"
        ? this.generateSuggestedEngagement({
            author: raw.author,
            text: raw.text,
            archetype,
            viralScore,
            slopScore,
            platform,
          })
        : undefined;

    return {
      id: raw.id || `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: raw.author,
      text: raw.text,
      likes: raw.likes,
      replies: raw.replies,
      reposts: raw.reposts,
      timestamp: raw.timestamp,
      url: raw.url,
      archetype,
      viralScore,
      slopScore,
      verdict,
      reasons: [...viralReasons, ...slopReasons],
      suggestedEngagement,
    };
  }

  /**
   * Trích xuất các bài viết từ DOM trình duyệt thông qua Direct CDP WebSocket
   */
  async scrapeFeedFromCDP(
    browserMgr: BrowserManager,
    platform: CuratorPlatform,
    limit = 10,
    tabQuery?: string | number
  ): Promise<{ posts: RawScrapedPost[]; detectedPlatform: string }> {
    // 1. Tìm target tương ứng với platform
    const platformKeyword = platform === "auto" ? "" : platform;
    const targets = await browserMgr.getCDPTargets();
    if (targets.length === 0) {
      throw new Error("Không có tab trình duyệt nào đang mở trên cổng CDP (port 9222).");
    }

    let target: { id: string; title: string; url: string; webSocketDebuggerUrl?: string } | null = null;

    if (tabQuery !== undefined && tabQuery !== "") {
      target = await browserMgr.findTarget(tabQuery);
    }

    if (!target) {
      target = targets.find((t) => {
        const u = t.url.toLowerCase();
        if (platformKeyword === "threads") return u.includes("threads.");
        if (platformKeyword === "linkedin") return u.includes("linkedin.");
        if (platformKeyword === "x") return u.includes("x.com") || u.includes("twitter.com");
        return u.includes("threads.") || u.includes("linkedin.") || u.includes("x.com") || u.includes("twitter.com");
      }) || null;
    }

    if (!target || !target.webSocketDebuggerUrl) {
      const platformName = platform === "auto" ? "Threads, LinkedIn hoặc X" : platform.toUpperCase();
      throw new Error(
        `Không tìm thấy tab ${platformName} nào đang mở trên trình duyệt (port 9222). Vui lòng mở trang mạng xã hội trên trình duyệt hoặc chạy với cờ --mock để kiểm thử.`
      );
    }

    const detected = this.detectPlatform(target.url);
    const actualPlatform = detected !== "unknown" ? detected : platform !== "auto" ? platform : "threads";

    // 2. Chạy JavaScript trích xuất tối ưu hóa cho từng platform
    const script = `(() => {
      const url = window.location.href.toLowerCase();
      const results = [];
      const parseNum = (s) => {
        if (!s) return 0;
        const clean = String(s).replace(/,/g, '').trim().toUpperCase();
        if (clean.endsWith('K')) return Math.round(parseFloat(clean) * 1000);
        if (clean.endsWith('M')) return Math.round(parseFloat(clean) * 1000000);
        return parseInt(clean, 10) || 0;
      };

      // THREADS SCRAPER
      if (url.includes('threads.')) {
        const articles = document.querySelectorAll('article, div[data-pressable-container="true"]');
        if (articles.length > 0) {
          articles.forEach((art, idx) => {
            const authorEl = art.querySelector('a[href^="/@"], span > a[role="link"]');
            const author = authorEl ? authorEl.innerText.trim().replace(/^@/, '') : 'threads_user';
            const textEl = art.querySelector('div[dir="auto"], span[dir="auto"]');
            const text = textEl ? textEl.innerText.trim() : (art.innerText || '').slice(0, 300);
            if (text.length > 10 && author !== 'For you') {
              results.push({
                id: 'threads-' + idx,
                author,
                text,
                likes: 0,
                replies: 0,
                reposts: 0
              });
            }
          });
        }
      }

      // LINKEDIN SCRAPER
      if (url.includes('linkedin.')) {
        const posts = document.querySelectorAll('div.feed-shared-update-v2, div[data-urn*="activity"]');
        posts.forEach((p, idx) => {
          const authorEl = p.querySelector('.update-components-actor__name, .feed-shared-actor__name, span[dir="ltr"]');
          const author = authorEl ? authorEl.innerText.trim() : 'linkedin_member';
          const descEl = p.querySelector('.feed-shared-update-v2__description, .update-components-text, span.break-words');
          const text = descEl ? descEl.innerText.trim() : '';
          const likeEl = p.querySelector('.social-details-social-counts__reactions-count, button[aria-label*="reaction"]');
          const commentEl = p.querySelector('.social-details-social-counts__comments');
          
          if (text.length > 15) {
            results.push({
              id: 'li-' + idx,
              author,
              text,
              likes: parseNum(likeEl ? likeEl.innerText : '0'),
              replies: parseNum(commentEl ? commentEl.innerText : '0'),
              reposts: 0
            });
          }
        });
      }

      // X / TWITTER SCRAPER
      if (url.includes('x.com') || url.includes('twitter.')) {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        tweets.forEach((t, idx) => {
          const userEl = t.querySelector('div[data-testid="User-Name"]');
          const author = userEl ? userEl.innerText.split('\\n')[0].trim() : 'x_user';
          const textEl = t.querySelector('div[data-testid="tweetText"]');
          const text = textEl ? textEl.innerText.trim() : '';
          const replyEl = t.querySelector('button[data-testid="reply"]');
          const retweetEl = t.querySelector('button[data-testid="retweet"]');
          const likeEl = t.querySelector('button[data-testid="like"]');

          if (text.length > 5) {
            results.push({
              id: 'x-' + idx,
              author,
              text,
              replies: parseNum(replyEl ? replyEl.innerText : '0'),
              reposts: parseNum(retweetEl ? retweetEl.innerText : '0'),
              likes: parseNum(likeEl ? likeEl.innerText : '0')
            });
          }
        });
      }

      // RESILIENT TEXT-BASED FALLBACK
      if (results.length === 0) {
        const lines = document.body.innerText.split('\\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length - 2; i++) {
          if (lines[i].length > 30 && lines[i].length < 400 && !lines[i].startsWith('http')) {
            results.push({
              id: 'text-node-' + i,
              author: lines[i - 1] && lines[i - 1].length < 30 ? lines[i - 1] : 'author',
              text: lines[i],
              likes: 0,
              replies: 0,
              reposts: 0
            });
            i += 2;
            if (results.length >= 10) break;
          }
        }
      }

      return results;
    })()`;

    // 3. Auto-Hydration Loop: If fewer than limit, micro-scroll to load dynamic feed
    const accumulated = new Map<string, RawScrapedPost>();
    const makeKey = (p: RawScrapedPost) => `${p.author}:::${(p.text || "").slice(0, 50).trim()}`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const batch = await browserMgr.evaluateDirectCDP<RawScrapedPost[]>(target.webSocketDebuggerUrl, script, 8000);
      if (batch && Array.isArray(batch)) {
        for (const p of batch) {
          const key = makeKey(p);
          if (!accumulated.has(key)) {
            accumulated.set(key, p);
          }
        }
      }

      if (accumulated.size >= limit) break;

      // Micro-scroll down to trigger infinite feed loader
      await browserMgr.evaluateDirectCDP(
        target.webSocketDebuggerUrl,
        `(() => {
          const scroller = document.querySelector('[data-list-id]') || document.querySelector('[class*="scroller"]') || window;
          if (scroller.scrollBy) scroller.scrollBy(0, 900);
          else window.scrollBy(0, 900);
        })()`,
        3000
      );
      await new Promise((r) => setTimeout(r, 800));
    }

    return {
      posts: Array.from(accumulated.values()).slice(0, limit),
      detectedPlatform: actualPlatform,
    };
  }

  /**
   * Tạo bộ dữ liệu mẫu thực tế chuẩn xác cho mục đích test & demo
   */
  getMockCandidates(platform: string): RawScrapedPost[] {
    return [
      {
        id: "mock-1-builder-proof",
        author: "Alex Rivera (@arivera_dev)",
        text: "Mất đúng 4ms để JEV Browser kết nối và thực thi trực tiếp qua CDP Socket trên Chrome thật. ⚡️\n\nKhông cần headless chromium cô lập, giữ nguyên 100% cookies & active login session.\nRepo mã nguồn mở: https://github.com/typesafeai/jev-browser\nBenchmark: 4ms kết nối, 60fps interaction rendering.",
        likes: 342,
        replies: 48,
        reposts: 89,
        shares: 24,
      },
      {
        id: "mock-2-ai-slop",
        author: "GrowthGuru_Official",
        text: "In today's fast-paced digital world, AI is a true game-changer that will revolutionize everything! 🚀\n\nHere is how to unlock the true power of AI in your daily life:\n💡 1. Embrace the technology\n✨ 2. Supercharge your workflow\n🔥 3. 10x your productivity\n\nConsistency is key. Agree? Thoughts? 👇 #AI #Tech #Leadership",
        likes: 12,
        replies: 2,
        reposts: 0,
        shares: 1,
      },
      {
        id: "mock-3-micro-carousel",
        author: "Sarah Chen (Design Systems)",
        text: "Ai từng làm AI Agent điều khiển trình duyệt chắc chắn đều nếm trải nỗi sợ này... 🤯 1/4\n\n• Thẻ 1: Lỡ tay click nhầm nút Public Post trên timeline cá nhân\n• Thẻ 2: Session bị logout giữa chừng vì cookie không persistent\n• Thẻ 3: Selector bị vỡ khi DOM update dynamic classnames\n\nGiải pháp là dùng Semantic Role + Synthetic IDs thay vì XPath giòn dễ gãy.",
        likes: 215,
        replies: 34,
        reposts: 42,
        shares: 18,
        carouselCards: 4,
      },
      {
        id: "mock-4-crowdsource",
        author: "Minh Triết (AI Engineer)",
        text: "Cả nhà có ai từng benchmark JEV System One với các LLM routing thông thường chưa ạ? Em xin review với:\n1. Tốc độ latency thực tế có giữ được dưới 900ms ở mạng VN không?\n2. Có hiện tượng hallucination khi số lượng choices vượt quá 20 options không?",
        likes: 89,
        replies: 28,
        reposts: 12,
        shares: 6,
      },
      {
        id: "mock-5-builder-confession",
        author: "Long Nguyen",
        text: "15+ apps live. Thú thật mình vẫn ngồi code ban đêm sau giờ làm ở công ty. ❤️\n\nCảm giác nhìn thấy một con AI Agent tự động click đúng ô input trên Dia mà không cần can thiệp tay... vẫn sướng như ngày đầu tiên viết chương trình 'Hello World'.\nKhông cần màu mè bóng bẩy, chỉ cần sản phẩm chạy mượt.",
        likes: 178,
        replies: 19,
        reposts: 14,
        shares: 8,
      },
    ];
  }

  /**
   * Luồng xử lý chính: Quét Feed -> Chấm điểm Virality & Slop -> Gợi ý Engage
   */
  async curateFeed(browserMgr: BrowserManager, options: CuratorOptions = {}): Promise<SocialCuratorReport> {
    const limit = options.limit || 10;
    const minViral = options.minViral !== undefined ? options.minViral : 0;
    const maxSlop = options.maxSlop !== undefined ? options.maxSlop : 100;
    let activePlatform = options.platform || "auto";

    let rawPosts: RawScrapedPost[] = [];

    if (options.mock) {
      rawPosts = this.getMockCandidates(activePlatform);
    } else {
      const scrapedResult = await this.scrapeFeedFromCDP(browserMgr, activePlatform, limit * 2, options.tabQuery);
      rawPosts = scrapedResult.posts;
      if (activePlatform === "auto") {
        activePlatform = scrapedResult.detectedPlatform as CuratorPlatform;
      }
    }

    if (rawPosts.length === 0) {
      return {
        platform: activePlatform,
        totalScanned: 0,
        highPriorityCount: 0,
        slopCount: 0,
        posts: [],
      };
    }

    // Đánh giá từng bài viết
    const evaluatedPosts: SocialPostCandidate[] = [];
    for (const raw of rawPosts) {
      const candidate = await this.evaluatePost(raw, activePlatform);

      // Lọc theo ngưỡng
      if (candidate.viralScore >= minViral && candidate.slopScore <= maxSlop) {
        evaluatedPosts.push(candidate);
      }
    }

    // Sắp xếp: Ưu tiên HIGH_PRIORITY_ENGAGE lên đầu, sau đó sắp xếp theo viralScore giảm dần
    evaluatedPosts.sort((a, b) => {
      if (a.verdict === "HIGH_PRIORITY_ENGAGE" && b.verdict !== "HIGH_PRIORITY_ENGAGE") return -1;
      if (b.verdict === "HIGH_PRIORITY_ENGAGE" && a.verdict !== "HIGH_PRIORITY_ENGAGE") return 1;
      return b.viralScore - a.viralScore;
    });

    const selected = evaluatedPosts.slice(0, limit);
    const highPriorityCount = selected.filter((p) => p.verdict === "HIGH_PRIORITY_ENGAGE").length;
    const slopCount = selected.filter((p) => p.verdict === "AI_SLOP_SKIP").length;

    return {
      platform: activePlatform,
      totalScanned: selected.length,
      highPriorityCount,
      slopCount,
      posts: selected,
    };
  }
}
