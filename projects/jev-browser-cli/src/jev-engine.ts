import { TypeSafeClient } from "@typesafe-ai/sdk";
import type {
  InteractiveElement,
  JevDecision,
  BrowserIntent,
  PageArchitecture,
  ArchitecturalZone,
} from "./types.js";

const POPULAR_DOMAINS: Record<string, string> = {
  vnexpress: "https://vnexpress.net",
  youtube: "https://youtube.com",
  google: "https://google.com",
  github: "https://github.com",
  facebook: "https://facebook.com",
  reddit: "https://reddit.com",
  x: "https://x.com",
  twitter: "https://x.com",
  wikipedia: "https://wikipedia.org",
  chatgpt: "https://chatgpt.com",
};

export class JevEngine {
  private client: TypeSafeClient | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TYPESAFE_API_KEY || "";
    if (this.apiKey) {
      try {
        this.client = new TypeSafeClient({ apiKey: this.apiKey });
      } catch (err) {
        console.error("Lỗi khởi tạo TypeSafeClient:", err);
      }
    }
  }

  async interpret(
    userPrompt: string,
    currentUrl: string,
    currentTitle: string,
    elements: InteractiveElement[]
  ): Promise<JevDecision> {
    const rawLower = userPrompt.toLowerCase().trim();

    // 1. Thử gọi TypeSafe Jev API (System One)
    if (this.client) {
      try {
        const elementSummary = elements
          .slice(0, 40)
          .map((e) => `#${e.id} [${e.tag}] "${e.text}" ${e.placeholder ? `placeholder="${e.placeholder}"` : ""}`)
          .join("\n");

        const contextPrompt = `User command: "${userPrompt}"
Active Browser URL: "${currentUrl}"
Active Browser Title: "${currentTitle}"
Visible Interactive Elements:
${elementSummary}

Classify the user intent into one of:
- navigate: User wants to open a URL, search, or visit a website.
- click: User wants to tap or click a button, link, or item.
- type: User wants to input text or search keyword.
- scroll_down: User wants to scroll down the page.
- scroll_up: User wants to scroll up the page.
- go_back: User wants to return to the previous page.
- refresh: User wants to reload the page.
- unsupported: Not a browser control command.`;

        const response = await this.client.systemOne({
          state: `Current URL: ${currentUrl}\nCurrent Title: ${currentTitle}\nUser command: ${userPrompt}\nElements:\n${elementSummary}`,
          questions: {
            intent: {
              type: "choice",
              instructions: "What action should the browser perform for this user command?",
              criteria: {
                navigate: "User wants to open a URL, search, or visit a website.",
                click: "User wants to tap or click a button, link, or item.",
                type: "User wants to input text or search keyword.",
                scroll_down: "User wants to scroll down the page.",
                scroll_up: "User wants to scroll up the page.",
                go_back: "User wants to return to the previous page.",
                refresh: "User wants to reload the page.",
                unsupported: "Not a browser control command.",
              },
            },
          },
        });

        const intentAnswer = response.answers.intent;
        const intent = (intentAnswer.choice || "unsupported") as BrowserIntent;
        const confidence = typeof intentAnswer.confidence === "number" ? intentAnswer.confidence : 0.95;

        // Trích xuất parameters chi tiết
        const decision = this.resolveParameters(intent, userPrompt, elements);
        decision.confidence = confidence;
        decision.probabilities = intentAnswer.probabilities as any || { [intent]: confidence };
        decision.reasoningNote = `Jev System One API (Model: ${response.model})`;

        return decision;
      } catch (err: any) {
        // Fallback sang smart local heuristic
      }
    }

    // 2. Smart Local Fallback nếu không có API key hoặc network error
    return this.smartFallback(userPrompt, elements);
  }

  async scanArchitecture(
    url: string,
    title: string,
    elements: InteractiveElement[],
    landmarksSummary: string
  ): Promise<PageArchitecture> {
    const elementSample = elements
      .slice(0, 40)
      .map((e) => `#${e.id} [${e.tag}] "${e.text}" ${e.placeholder ? `placeholder="${e.placeholder}"` : ""}`)
      .join("\n");

    const statePayload = `Current URL: ${url}
Current Title: ${title}
Semantic Landmarks: ${landmarksSummary}
Interactive Elements Sample:
${elementSample}`;

    let category = "general_web";
    let interactionModel = "document_reader";
    let isAuthenticated = false;
    let authProb = 0.5;
    let hasOverlay = false;
    let complexity = 1;
    let primaryZone = "main_workspace";
    let confidence = 0.9;

    if (this.client) {
      try {
        const response = await this.client.systemOne({
          state: statePayload,
          questions: {
            category: {
              type: "choice",
              instructions: "What type or archetype of web application / website is this?",
              criteria: {
                chat_or_messaging: "Real-time chat, instant messaging, conversation feeds (Zalo, Messenger, Slack, Discord)",
                developer_or_code: "Code repository, git browser, issue tracker, pull requests (GitHub, GitLab)",
                docs_or_reading: "Technical documentation, wiki, blog, or news article",
                dashboard_or_saas: "Web application dashboard, analytics, metrics, configuration tables",
                ecommerce_or_shop: "E-commerce store, product catalog, cart or checkout",
                social_feed: "Social media timeline, newsfeed, comments and posts",
                auth_or_login: "Login page, sign up page, or authentication gate",
                general_web: "General website or informational page",
              },
            },
            interaction_model: {
              type: "choice",
              instructions: "What is the primary UI layout and interaction model of this page?",
              criteria: {
                sidebar_and_feed: "Sidebar for selecting channels/threads + main feed stream + bottom/inline input composer",
                search_and_results: "Prominent search bar + filterable list/grid of search results",
                form_submission: "Central form with multiple input fields and a submit button",
                document_reader: "Header + main article body + table of contents",
                data_dashboard: "Navigation bar + widget grid of statistics and tables",
              },
            },
            is_authenticated: {
              type: "noul",
              instructions: "Is the user currently logged in to an authenticated account or active user session?",
            },
            has_blocking_overlay: {
              type: "noul",
              instructions: "Are there blocking modals, popups, cookie consent overlays, or login prompts covering the page?",
            },
            complexity_score: {
              type: "score",
              instructions: "What is the technical and UI complexity level of this page?",
              criteria: [
                "Simple static page with basic links and text",
                "Standard dynamic web page with search and forms",
                "Complex real-time Single Page Application with dynamic socket feeds, rich editors, and heavy interaction",
              ],
            },
            primary_interaction_zone: {
              type: "choice",
              instructions: "Where should an AI agent locate primary interaction anchors on this page?",
              criteria: {
                navigation_sidebar: "Left sidebar containing chat list, channels, or navigation items",
                main_workspace: "Center area displaying the primary content, messages, or results",
                input_composer: "Bottom or inline input field for writing messages or composing content",
                search_header: "Top header containing the global search input",
              },
            },
          },
        });

        const answers = response.answers;
        category = answers.category?.choice || category;
        interactionModel = answers.interaction_model?.choice || interactionModel;
        isAuthenticated = (answers.is_authenticated?.noul || 0) > 0.5;
        authProb = answers.is_authenticated?.noul || 0.5;
        hasOverlay = (answers.has_blocking_overlay?.noul || 0) > 0.5;
        complexity = Math.round(answers.complexity_score?.score || 1);
        primaryZone = answers.primary_interaction_zone?.choice || primaryZone;
        confidence = answers.category?.confidence || 0.9;
      } catch (err) {
        // Fallback rule-based detection if API call fails
        if (url.includes("zalo.me") || url.includes("messenger.com") || url.includes("facebook.com/messages")) {
          category = "chat_or_messaging";
          interactionModel = "sidebar_and_feed";
          isAuthenticated = true;
          primaryZone = "input_composer";
          complexity = 2;
        }
      }
    } else {
      if (url.includes("zalo.me") || url.includes("messenger.com") || url.includes("facebook.com/messages")) {
        category = "chat_or_messaging";
        interactionModel = "sidebar_and_feed";
        isAuthenticated = true;
        primaryZone = "input_composer";
        complexity = 2;
      }
    }

    // Identify key anchors from interactive elements
    const primarySearch = elements.find((e) =>
      e.placeholder?.toLowerCase().includes("tìm kiếm") ||
      e.placeholder?.toLowerCase().includes("search") ||
      e.selector.includes("search") ||
      e.id === "contact-search-input" ||
      e.text.toLowerCase().includes("tìm kiếm")
    );

    const primaryInput = elements.find((e) =>
      e.isInput &&
      (e.selector.includes("richInput") ||
        e.placeholder?.toLowerCase().includes("nhập") ||
        e.placeholder?.toLowerCase().includes("tin nhắn") ||
        e.placeholder?.toLowerCase().includes("message") ||
        e.placeholder?.toLowerCase().includes("aa") ||
        e.tag === "textarea" ||
        e.selector.includes("contenteditable"))
    );

    const primaryAction = elements.find((e) =>
      e.role === "button" &&
      (e.text.toLowerCase().includes("gửi") || e.text.toLowerCase().includes("send") || e.text.toLowerCase().includes("submit"))
    );

    // Group elements into architectural zones
    const zones: ArchitecturalZone[] = [
      {
        name: "Navigation & Sidebar Zone",
        description: "Contains search, conversation list, channels, and tabs",
        elementCount: elements.filter((e) => parseInt(e.id, 10) <= 30 && (e.isInput || e.text.length < 30)).length,
        sampleElements: elements.slice(0, 5).map((e) => ({ id: e.id, tag: e.tag, text: e.text })),
      },
      {
        name: "Workspace & Main Feed Zone",
        description: "Displays conversation stream, messages, or active document",
        elementCount: elements.filter((e) => parseInt(e.id, 10) > 10 && parseInt(e.id, 10) < 45).length,
        sampleElements: elements.slice(5, 10).map((e) => ({ id: e.id, tag: e.tag, text: e.text })),
      },
      {
        name: "Action & Composer Zone",
        description: "Message input, attachment tools, send actions",
        elementCount: elements.filter((e) => e.isInput || e.selector.includes("richInput") || e.selector.includes("contenteditable")).length,
        sampleElements: primaryInput ? [{ id: primaryInput.id, tag: primaryInput.tag, text: primaryInput.placeholder || primaryInput.text }] : [],
      },
    ];

    // Build operational playbook for AI Agents
    const playbook: string[] = [];
    if (category === "chat_or_messaging") {
      playbook.push("1. Để nhắn tin: Tìm ô tìm kiếm danh bạ/tin nhắn để tìm người nhận.");
      playbook.push("2. Click vào kết quả người nhận khớp nhất để mở cuộc trò chuyện.");
      playbook.push("3. Nhập nội dung tin nhắn vào ô soạn thảo (input composer / richInput).");
      playbook.push("4. Nhấn phím Enter (--enter) để gửi tin nhắn ngay lập tức.");
    } else if (category === "developer_or_code") {
      playbook.push("1. Dùng thanh tìm kiếm hoặc tabs Issues / Pull Requests.");
      playbook.push("2. Click vào số hiệu issue/PR hoặc tiêu đề cần mở.");
    } else {
      playbook.push("1. Kiểm tra các nút bấm hoặc ô tìm kiếm chính trên trang.");
      playbook.push("2. Thực hiện hành động theo synthetic ID (#ID).");
    }

    return {
      url,
      title,
      category,
      interactionModel,
      isAuthenticated,
      authProbability: authProb,
      complexityScore: complexity,
      primaryInteractionZone: primaryZone,
      hasBlockingOverlay: hasOverlay,
      confidence,
      zones,
      anchors: {
        primarySearch: primarySearch ? { id: primarySearch.id, selector: primarySearch.selector, placeholder: primarySearch.placeholder } : undefined,
        primaryInput: primaryInput ? { id: primaryInput.id, selector: primaryInput.selector, placeholder: primaryInput.placeholder } : undefined,
        primaryAction: primaryAction ? { id: primaryAction.id, selector: primaryAction.selector, text: primaryAction.text } : undefined,
      },
      agentPlaybook: playbook,
    };
  }

  private resolveParameters(intent: BrowserIntent, text: string, elements: InteractiveElement[]): JevDecision {
    const textLower = text.toLowerCase();

    if (intent === "navigate") {
      return {
        intent,
        confidence: 0.95,
        probabilities: { navigate: 0.95 },
        targetUrl: this.extractUrl(text),
      };
    }

    if (intent === "click") {
      // Tìm element khớp nhất
      const matched = this.matchElement(text, elements);
      return {
        intent,
        confidence: 0.9,
        probabilities: { click: 0.9 },
        targetElementId: matched?.id,
        targetElementText: matched?.text || this.cleanClickTarget(text),
      };
    }

    if (intent === "type") {
      const inputVal = text.replace(/^(gõ|nhập|tìm kiếm|search|type)\s+/i, "").trim();
      return {
        intent,
        confidence: 0.9,
        probabilities: { type: 0.9 },
        inputText: inputVal || text,
      };
    }

    return {
      intent,
      confidence: 0.98,
      probabilities: { [intent]: 0.98 },
    };
  }

  private smartFallback(text: string, elements: InteractiveElement[]): JevDecision {
    const lower = text.toLowerCase().trim();

    // Navigate
    if (lower.startsWith("mở ") || lower.startsWith("open ") || lower.startsWith("go to ") || lower.startsWith("vào ")) {
      return {
        intent: "navigate",
        confidence: 0.92,
        probabilities: { navigate: 0.92 },
        targetUrl: this.extractUrl(text),
        reasoningNote: "Smart Fallback Heuristic",
      };
    }

    // Scroll
    if (lower.includes("cuộn xuống") || lower.includes("kéo xuống") || lower.includes("scroll down")) {
      return { intent: "scroll_down", confidence: 0.99, probabilities: { scroll_down: 0.99 } };
    }
    if (lower.includes("cuộn lên") || lower.includes("kéo lên") || lower.includes("scroll up")) {
      return { intent: "scroll_up", confidence: 0.99, probabilities: { scroll_up: 0.99 } };
    }

    // Back / Refresh
    if (lower.includes("quay lại") || lower.includes("trở lại") || lower.includes("go back") || lower.includes("back")) {
      return { intent: "go_back", confidence: 0.99, probabilities: { go_back: 0.99 } };
    }
    if (lower.includes("tải lại") || lower.includes("reload") || lower.includes("refresh")) {
      return { intent: "refresh", confidence: 0.99, probabilities: { refresh: 0.99 } };
    }

    // Click
    if (lower.startsWith("click") || lower.startsWith("bấm") || lower.startsWith("chọn") || lower.startsWith("nhấn")) {
      const matched = this.matchElement(text, elements);
      return {
        intent: "click",
        confidence: 0.88,
        probabilities: { click: 0.88 },
        targetElementId: matched?.id,
        targetElementText: matched?.text || this.cleanClickTarget(text),
        reasoningNote: "Smart Fallback Heuristic",
      };
    }

    // Type
    if (lower.startsWith("gõ") || lower.startsWith("nhập") || lower.startsWith("type") || lower.startsWith("tìm")) {
      const val = text.replace(/^(gõ|nhập|tìm kiếm|tìm|type)\s+/i, "").trim();
      return {
        intent: "type",
        confidence: 0.85,
        probabilities: { type: 0.85 },
        inputText: val,
        reasoningNote: "Smart Fallback Heuristic",
      };
    }

    return {
      intent: "unsupported",
      confidence: 0.5,
      probabilities: { unsupported: 0.5 },
      reasoningNote: "Không nhận diện được ý định điều khiển trình duyệt hợp lệ",
    };
  }

  private extractUrl(text: string): string {
    const directUrlMatch = text.match(/https?:\/\/[^\s]+/i);
    if (directUrlMatch) return directUrlMatch[0];

    const domainMatch = text.match(/\b([a-zA-Z0-9-]+\.(?:com|net|org|edu|gov|io|ai|vn|co|app))\b/i);
    if (domainMatch) return `https://${domainMatch[1]}`;

    const lower = text.toLowerCase();
    for (const [name, url] of Object.entries(POPULAR_DOMAINS)) {
      if (lower.includes(name)) return url;
    }

    const cleanQuery = text.replace(/^(mở|open|go to|vào|trang web|trang)\s+/i, "").trim();
    return `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
  }

  private matchElement(text: string, elements: InteractiveElement[]): InteractiveElement | undefined {
    const cleanTarget = this.cleanClickTarget(text).toLowerCase();

    // 1. Theo ID synthetic: "click vào #1", "bài số 47" hoặc "#47"
    const idMatch = text.match(/(?:số|id|#)\s*(\d+)/i) || text.match(/^(\d+)$/);
    if (idMatch) {
      const found = elements.find((e) => e.id === idMatch[1]);
      if (found) return found;
    }

    // 2. Tìm phần tử đầu tiên nếu nói "đầu tiên", "thứ nhất"
    if (cleanTarget.includes("đầu tiên") || cleanTarget.includes("thứ nhất") || cleanTarget.includes("first")) {
      return elements[0];
    }

    // 3. Khớp chính xác hoặc el.text chứa toàn bộ cleanTarget
    for (const el of elements) {
      if (el.text) {
        const elLower = el.text.toLowerCase().trim();
        if (elLower === cleanTarget || elLower.includes(cleanTarget)) {
          return el;
        }
      }
    }

    // 4. Keyword token matching (đặc biệt hữu ích khi tìm tên bài viết tiếng Anh trong câu lệnh tiếng Việt)
    const keywords = cleanTarget.split(/\s+/).filter((w) => w.length > 2);
    if (keywords.length > 0) {
      let bestMatch: InteractiveElement | undefined = undefined;
      let maxScore = 0;

      for (const el of elements) {
        const elText = (el.text + " " + (el.href || "")).toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (elText.includes(kw)) {
            score++;
          }
        }
        if (score > maxScore) {
          maxScore = score;
          bestMatch = el;
        }
      }

      if (bestMatch && maxScore >= Math.min(2, keywords.length)) {
        return bestMatch;
      }
    }

    return undefined;
  }

  private cleanClickTarget(text: string): string {
    return text
      .replace(/^(click|bấm|chọn|nhấn|mở)\s+/gi, "")
      .replace(/^(vào|tới|đến)\s+/gi, "")
      .replace(/^(bài viết|bài báo|bài|tin tức|tin|mục|nút|link|phần tử|thẻ|dòng)\s+/gi, "")
      .trim();
  }
}
