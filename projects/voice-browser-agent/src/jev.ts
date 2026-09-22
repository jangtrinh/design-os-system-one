import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";
import type { BrowserIntent, InteractiveElement, JevDecision } from "./types.js";

export class JevSemanticEngine {
  private client: TypeSafeClient | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.updateApiKey(process.env.TYPESAFE_API_KEY || null);
  }

  public updateApiKey(key: string | null) {
    this.apiKey = key;
    if (key && key.trim().length > 0) {
      try {
        this.client = new TypeSafeClient({
          apiKey: key.trim(),
          baseURL: process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai",
          timeout: 10000,
        });
        console.log("🔑 Đã kết nối TypeSafe Client với API Key hợp lệ.");
      } catch (err) {
        console.error("Lỗi khởi tạo TypeSafeClient:", err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public hasRealApiKey(): boolean {
    return !!this.client;
  }

  /**
   * Phân tích câu lệnh giọng nói và trạng thái trang hiện tại bằng Jev API (System One)
   */
  public async interpret(
    voiceText: string,
    currentUrl: string,
    currentTitle: string,
    elements: InteractiveElement[]
  ): Promise<JevDecision> {
    const startTime = Date.now();

    // 1. Nếu có API key thật -> Sử dụng TypeSafe Jev API
    if (this.client) {
      try {
        return await this.evaluateWithRealJev(voiceText, currentUrl, currentTitle, elements);
      } catch (err: any) {
        console.warn("⚠️ Lỗi gọi Jev API (sẽ fallback sang smart heuristic engine):", err?.message || err);
      }
    }

    // 2. Chế độ Smart Fallback (mô phỏng chuẩn xác System One)
    return this.evaluateWithSmartFallback(voiceText, currentUrl, currentTitle, elements);
  }

  private async evaluateWithRealJev(
    voiceText: string,
    currentUrl: string,
    currentTitle: string,
    elements: InteractiveElement[]
  ): Promise<JevDecision> {
    if (!this.client) throw new Error("Client chưa khởi tạo");

    // Bước 1: Phân loại Intent qua Choice primitive
    const intentRes = await this.client.systemOne({
      model: "jev-latest",
      state: {
        voice_command: voiceText,
        current_page_url: currentUrl,
        current_page_title: currentTitle,
      },
      questions: {
        intent: choice("Phân loại ý định điều khiển trình duyệt của người dùng", {
          navigate: "Mở một địa chỉ URL mới, mở website, hoặc tìm kiếm trang web mới",
          click: "Click hoặc bấm vào một đường link, bài viết, nút bấm, hoặc mục trên trang",
          type: "Nhập nội dung, gõ chữ, điền form hoặc gõ vào thanh tìm kiếm",
          scroll_down: "Cuộn trang xuống dưới",
          scroll_up: "Cuộn trang lên trên",
          go_back: "Quay lại trang trước đó",
          refresh: "Tải lại hoặc refresh trang",
          unsupported: "Nội dung không liên quan tới điều khiển trình duyệt web"
        }),
        is_destructive: noul("Hành động này có tiềm ẩn nguy cơ xóa dữ liệu, thanh toán tiền, hoặc submit form nhạy cảm không?")
      }
    });

    const intentAnswer = intentRes.answers.intent;
    const intent = intentAnswer.choice as BrowserIntent;
    const confidence = intentAnswer.confidence;
    const isDestructive = intentRes.answers.is_destructive.noul > 0.65;

    let targetElementId: string | undefined;
    let targetElementText: string | undefined;
    let targetUrl: string | undefined;
    let inputText: string | undefined;

    // Bước 2: Nếu là Navigate -> Trích xuất URL
    if (intent === "navigate") {
      targetUrl = this.extractUrlFromVoice(voiceText);
    }

    // Bước 3: Nếu là Click hoặc Type -> Sử dụng Jev để Pick Element từ danh sách DOM
    if ((intent === "click" || intent === "type") && elements.length > 0) {
      const candidateSubset = elements.slice(0, 30); // Giới hạn 30 phần tử liên quan nhất
      const criteriaMap: Record<string, string> = {};
      for (const el of candidateSubset) {
        criteriaMap[el.id] = `[${el.tag.toUpperCase()}] ${el.text || el.placeholder || el.role || "không có text"}`;
      }
      criteriaMap["none"] = "Không có phần tử nào trong danh sách khớp với yêu cầu";

      const elementRes = await this.client.systemOne({
        model: "jev-latest",
        state: {
          voice_command: voiceText,
          action_type: intent,
          current_url: currentUrl,
        },
        questions: {
          picked_element: choice("Chọn phần tử trên trang phù hợp nhất với yêu cầu của người dùng", criteriaMap)
        }
      });

      const pickedId = elementRes.answers.picked_element.choice;
      if (pickedId && pickedId !== "none") {
        targetElementId = pickedId;
        const found = candidateSubset.find(e => e.id === pickedId);
        targetElementText = found ? found.text || found.placeholder : undefined;
      } else {
        // Fallback nhẹ nếu Jev chọn none
        const fallbackMatched = this.matchBestElement(voiceText, elements);
        if (fallbackMatched) {
          targetElementId = fallbackMatched.id;
          targetElementText = fallbackMatched.text || fallbackMatched.placeholder;
        }
      }

      if (intent === "type") {
        inputText = this.extractTextToType(voiceText);
      }
    }

    return {
      intent,
      confidence,
      probabilities: intentAnswer.probabilities,
      targetUrl,
      targetElementId,
      targetElementText,
      inputText,
      isDestructive,
      reasoningNote: "Được xử lý trực tiếp bởi TypeSafe Jev API (System One Model: jev-latest)"
    };
  }

  /**
   * Bộ Heuristic mô phỏng chuẩn format xác suất của Jev khi chưa có API Key
   */
  private evaluateWithSmartFallback(
    voiceText: string,
    currentUrl: string,
    currentTitle: string,
    elements: InteractiveElement[]
  ): JevDecision {
    const textLower = voiceText.toLowerCase().trim();
    let intent: BrowserIntent = "unsupported";
    let confidence = 0.88;
    let targetUrl: string | undefined;
    let targetElementId: string | undefined;
    let targetElementText: string | undefined;
    let inputText: string | undefined;

    if (
      textLower.startsWith("mở") ||
      textLower.startsWith("vào") ||
      textLower.startsWith("truy cập") ||
      textLower.startsWith("đi tới") ||
      textLower.startsWith("open") ||
      textLower.startsWith("go to") ||
      textLower.includes(".com") ||
      textLower.includes(".vn") ||
      textLower.includes(".net") ||
      textLower.includes(".org")
    ) {
      intent = "navigate";
      targetUrl = this.extractUrlFromVoice(voiceText);
      confidence = 0.95;
    } else if (
      textLower.includes("cuộn xuống") ||
      textLower.includes("kéo xuống") ||
      textLower.includes("scroll down") ||
      textLower.includes("xuống dưới")
    ) {
      intent = "scroll_down";
      confidence = 0.98;
    } else if (
      textLower.includes("cuộn lên") ||
      textLower.includes("kéo lên") ||
      textLower.includes("scroll up") ||
      textLower.includes("lên trên")
    ) {
      intent = "scroll_up";
      confidence = 0.98;
    } else if (
      textLower.includes("quay lại") ||
      textLower.includes("trở lại") ||
      textLower.includes("go back") ||
      textLower.includes("back")
    ) {
      intent = "go_back";
      confidence = 0.98;
    } else if (
      textLower.includes("tải lại") ||
      textLower.includes("refresh") ||
      textLower.includes("reload")
    ) {
      intent = "refresh";
      confidence = 0.98;
    } else if (
      textLower.startsWith("nhập") ||
      textLower.startsWith("gõ") ||
      textLower.startsWith("tìm") ||
      textLower.startsWith("search") ||
      textLower.startsWith("type")
    ) {
      intent = "type";
      inputText = this.extractTextToType(voiceText);
      const inputElem = elements.find(e => e.isInput || e.tag === "input" || e.placeholder);
      if (inputElem) {
        targetElementId = inputElem.id;
        targetElementText = inputElem.placeholder || "Khung nhập liệu";
      }
      confidence = 0.90;
    } else if (
      textLower.startsWith("bấm") ||
      textLower.startsWith("click") ||
      textLower.startsWith("chọn") ||
      textLower.startsWith("vào bài") ||
      textLower.includes("click")
    ) {
      intent = "click";
      const cleanKeyword = textLower
        .replace(/^(bấm|click|chọn|vào link|vào nút|vào bài|nhấn)\s+/i, "")
        .replace(/(đi|nào|hộ|nhé|cho tôi)$/i, "")
        .trim();

      const matched = this.matchBestElement(cleanKeyword, elements);
      if (matched) {
        targetElementId = matched.id;
        targetElementText = matched.text || matched.placeholder;
        confidence = 0.92;
      } else if (elements.length > 0) {
        targetElementId = elements[0].id;
        targetElementText = elements[0].text;
        confidence = 0.65;
      }
    } else {
      const matched = this.matchBestElement(textLower, elements);
      if (matched) {
        intent = "click";
        targetElementId = matched.id;
        targetElementText = matched.text;
        confidence = 0.85;
      }
    }

    const probabilities: Record<string, number> = {
      [intent]: confidence,
      unsupported: 1 - confidence,
    };

    return {
      intent,
      confidence,
      probabilities,
      targetUrl,
      targetElementId,
      targetElementText,
      inputText,
      isDestructive: false,
      reasoningNote: "Smart Heuristic Engine (Hoạt động độc lập hoặc khi chưa có API Key)"
    };
  }

  public extractUrlFromVoice(text: string): string {
    let clean = text
      .toLowerCase()
      .replace(/^(mở trang web|mở trang|mở web|mở|vào trang web|vào trang|vào web|vào|truy cập|đi tới|open|go to|browse to)\s+/i, "")
      .replace(/\s+/g, "")
      .replace(/chấm/g, ".")
      .replace(/dot/g, ".");

    // Tra cứu danh sách các trang phổ biến
    const knownSites: Record<string, string> = {
      "vnexpress": "https://vnexpress.net",
      "google": "https://www.google.com",
      "youtube": "https://www.youtube.com",
      "github": "https://github.com",
      "facebook": "https://www.facebook.com",
      "fb": "https://www.facebook.com",
      "twitter": "https://x.com",
      "x": "https://x.com",
      "reddit": "https://www.reddit.com",
      "hackernews": "https://news.ycombinator.com",
      "hn": "https://news.ycombinator.com",
      "dantri": "https://dantri.com.vn",
      "tuoitre": "https://tuoitre.vn",
      "thanhnien": "https://thanhnien.vn",
      "shopee": "https://shopee.vn",
      "lazada": "https://lazada.vn",
      "tiki": "https://tiki.vn",
    };

    if (knownSites[clean]) {
      return knownSites[clean];
    }

    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      if (clean.includes(".")) {
        clean = "https://" + clean;
      } else {
        clean = `https://www.google.com/search?q=${encodeURIComponent(text.replace(/^(mở|vào|tìm)\s+/i, ""))}`;
      }
    }
    return clean;
  }

  private extractTextToType(text: string): string {
    return text
      .replace(/^(nhập|gõ|tìm kiếm|search|type)\s+/i, "")
      .replace(/^(vào ô tìm kiếm|vào thanh tìm kiếm|từ khóa)\s+/i, "")
      .trim();
  }

  private matchBestElement(keyword: string, elements: InteractiveElement[]): InteractiveElement | null {
    if (!keyword || elements.length === 0) return null;
    const kw = keyword.toLowerCase().trim();

    // 1. Khớp chính xác
    for (const el of elements) {
      if (el.text && el.text.toLowerCase() === kw) return el;
    }

    // 2. Chứa từ khóa
    for (const el of elements) {
      if (el.text && el.text.toLowerCase().includes(kw)) return el;
      if (el.placeholder && el.placeholder.toLowerCase().includes(kw)) return el;
    }

    // 3. Khớp số thứ tự
    if (kw.includes("đầu tiên") || kw.includes("thứ nhất") || kw.includes("first") || kw.includes("1")) {
      return elements[0] || null;
    }
    if (kw.includes("thứ hai") || kw.includes("second") || kw.includes("2")) {
      return elements[1] || null;
    }
    if (kw.includes("thứ ba") || kw.includes("third") || kw.includes("3")) {
      return elements[2] || null;
    }
    if (kw.includes("thứ tư") || kw.includes("fourth") || kw.includes("4")) {
      return elements[3] || null;
    }
    if (kw.includes("thứ năm") || kw.includes("fifth") || kw.includes("5")) {
      return elements[4] || null;
    }

    return null;
  }
}
