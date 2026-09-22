import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { BrowserStatus, InteractiveElement } from "./types.js";

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private headful: boolean = true;
  private isInitialized: boolean = false;
  private elementsCache: InteractiveElement[] = [];

  constructor(headful: boolean = true) {
    this.headful = headful;
  }

  public async init(): Promise<void> {
    try {
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch {}

    try {
      this.browser = await chromium.launch({
        headless: !this.headful,
        args: [
          "--window-size=1280,800",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
        ],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });

      this.page = await this.context.newPage();
      this.isInitialized = true;

      // Trang khởi động mặc định
      await this.page.goto("https://news.ycombinator.com", { waitUntil: "commit", timeout: 15000 }).catch(() => {});
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    } catch (err) {
      console.error("Lỗi khi khởi tạo Browser Playwright:", err);
      this.isInitialized = false;
      throw err;
    }
  }

  public async setHeadful(headful: boolean): Promise<void> {
    if (this.headful === headful && this.page && !this.page.isClosed()) return;
    this.headful = headful;
    const currentUrl = this.page && !this.page.isClosed() ? this.page.url() : "https://news.ycombinator.com";

    await this.close();
    await this.init();
    if (this.page && currentUrl && currentUrl !== "about:blank") {
      await this.page.goto(currentUrl, { waitUntil: "commit" }).catch(() => {});
    }
  }

  public async ensurePage(): Promise<Page> {
    if (!this.browser || !this.browser.isConnected() || !this.page || this.page.isClosed()) {
      console.log("🔄 Browser/Page chưa sẵn sàng, đang tự động kết nối lại...");
      this.isInitialized = false;
      await this.init();
    }
    return this.page!;
  }

  public async goto(url: string): Promise<void> {
    const page = await this.ensurePage();
    let target = url;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }

    try {
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch {
      try {
        await page.goto(target, { waitUntil: "commit", timeout: 10000 });
      } catch (err) {
        console.warn("Navigation cảnh báo:", err);
      }
    }
    await page.waitForTimeout(600);
  }

  public async clickElement(id: string, fallbackText?: string): Promise<boolean> {
    const page = await this.ensurePage();

    // 1. Thử tìm bằng data-jev-id
    const selector = `[data-jev-id="${id}"]`;
    let elem = page.locator(selector).first();

    if (await elem.count() > 0) {
      await elem.evaluate((node: HTMLElement) => {
        node.style.outline = "4px solid #10b981";
        node.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }).catch(() => {});

      await page.waitForTimeout(200);

      try {
        await elem.click({ timeout: 4000, force: true });
      } catch {
        await elem.evaluate((node: HTMLElement) => node.click()).catch(() => {});
      }

      await page.waitForTimeout(600);
      return true;
    }

    // 2. Fallback tìm theo text
    if (fallbackText && fallbackText.trim().length > 0) {
      const clean = fallbackText.trim();
      const textLocators = [
        page.getByRole("link", { name: clean }).first(),
        page.getByRole("button", { name: clean }).first(),
        page.locator(`text="${clean}"`).first(),
        page.getByText(clean, { exact: false }).first(),
      ];

      for (const loc of textLocators) {
        if (await loc.count() > 0) {
          try {
            await loc.click({ timeout: 4000, force: true });
            await page.waitForTimeout(600);
            return true;
          } catch {}
        }
      }
    }

    // 3. Nếu là id số đầu tiên và trang có link, click link đầu tiên
    if (id === "1" && this.elementsCache.length > 0) {
      const first = this.elementsCache[0];
      const loc = page.locator(first.selector).first();
      if (await loc.count() > 0) {
        await loc.click({ timeout: 4000, force: true }).catch(() => {});
        await page.waitForTimeout(600);
        return true;
      }
    }

    return false;
  }

  public async typeIntoElement(id: string, text: string): Promise<boolean> {
    const page = await this.ensurePage();
    const selector = `[data-jev-id="${id}"]`;
    const elem = page.locator(selector).first();

    if (await elem.count() > 0) {
      await elem.evaluate((node: HTMLElement) => {
        node.style.outline = "4px solid #3b82f6";
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }).catch(() => {});

      await elem.fill(text).catch(async () => {
        await elem.focus().catch(() => {});
        await page.keyboard.type(text);
      });
      await page.waitForTimeout(200);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);
      return true;
    } else {
      const fallbackInput = page.locator('input[type="text"], input[type="search"], input:not([type]), textarea').first();
      if (await fallbackInput.count() > 0) {
        await fallbackInput.fill(text);
        await page.waitForTimeout(200);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);
        return true;
      }
    }
    return false;
  }

  public async scroll(direction: "up" | "down"): Promise<void> {
    const page = await this.ensurePage();
    const delta = direction === "down" ? 700 : -700;
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(300);
  }

  public async goBack(): Promise<void> {
    const page = await this.ensurePage();
    await page.goBack({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  public async refresh(): Promise<void> {
    const page = await this.ensurePage();
    await page.reload({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  public async getInteractiveElements(): Promise<InteractiveElement[]> {
    const page = await this.ensurePage();

    let elements: InteractiveElement[] = [];
    try {
      elements = await page.evaluate(() => {
        const candidates = document.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [role="button"], [role="link"], [role="tab"], h1 a, h2 a, h3 a, article a'
        );

        const list: InteractiveElement[] = [];
        let counter = 1;

        candidates.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          ) {
            return;
          }

          if (rect.bottom < -300 || rect.top > window.innerHeight + 1200) {
            return;
          }

          const syntheticId = String(counter++);
          el.setAttribute("data-jev-id", syntheticId);

          let text = (el.innerText || el.textContent || "").trim();
          if (text.length > 120) text = text.substring(0, 117) + "...";

          const tag = el.tagName.toLowerCase();
          const href = (el as HTMLAnchorElement).href || undefined;
          const placeholder = (el as HTMLInputElement).placeholder || undefined;
          const role = el.getAttribute("role") || undefined;
          const isInput = tag === "input" || tag === "textarea" || tag === "select";

          if (text || placeholder || role || href) {
            list.push({
              id: syntheticId,
              tag,
              text,
              role,
              placeholder,
              selector: `[data-jev-id="${syntheticId}"]`,
              href,
              isInput,
            });
          }
        });

        return list.slice(0, 50);
      });
    } catch (e) {
      console.warn("Lỗi evaluate DOM elements:", e);
    }

    this.elementsCache = elements;
    return elements;
  }

  public async captureScreenshotBase64(): Promise<string> {
    try {
      const page = await this.ensurePage();
      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 65,
        fullPage: false,
      });
      return buffer.toString("base64");
    } catch {
      return "";
    }
  }

  public async getStatus(): Promise<BrowserStatus> {
    try {
      const page = await this.ensurePage();
      const url = page.url();
      const title = await page.title();
      const screenshotBase64 = await this.captureScreenshotBase64();

      return {
        url,
        title,
        canGoBack: true,
        elementCount: this.elementsCache.length,
        screenshotBase64,
      };
    } catch {
      return {
        url: "about:blank",
        title: "Đang kết nối...",
        canGoBack: false,
        elementCount: 0,
      };
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } finally {
      this.page = null;
      this.context = null;
      this.browser = null;
      this.isInitialized = false;
    }
  }
}
