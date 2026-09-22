import { chromium, type Browser, type Page } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import type { InteractiveElement } from "./types.js";
import { DomExtractor } from "./dom-extractor.js";
import { CdpSessionPool } from "./cdp-session-pool.js";

export interface BrowserAppInfo {
  name: string;
  path: string;
}

const BROWSER_PATHS: Record<string, string> = {
  arc: "/Applications/Arc.app/Contents/MacOS/Arc",
  chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  dia: "/Applications/Dia.app/Contents/MacOS/Dia",
  edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  brave: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
};

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class BrowserManager {
  private port: number;

  constructor(port = 9222) {
    this.port = port;
  }

  static getAvailableBrowsers(): BrowserAppInfo[] {
    const available: BrowserAppInfo[] = [];
    for (const [name, binPath] of Object.entries(BROWSER_PATHS)) {
      if (fs.existsSync(binPath)) {
        available.push({ name, path: binPath });
      }
    }
    return available;
  }

  async isCDPOpen(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${this.port}/json/version`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(800, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  // ==========================================
  // Direct Page-Level CDP WebSocket (Ultra-Fast 4ms)
  // ==========================================
  async getCDPTargets(): Promise<Array<{ id: string; title: string; url: string; type: string; webSocketDebuggerUrl?: string }>> {
    try {
      const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
      if (!res.ok) return [];
      const list = (await res.json()) as any[];
      return list.filter((t) => t.type === "page");
    } catch {
      return [];
    }
  }

  async findTarget(query?: string | number): Promise<{ id: string; title: string; url: string; webSocketDebuggerUrl: string } | null> {
    const targets = await this.getCDPTargets();
    if (targets.length === 0) return null;

    if (query === undefined || query === "") {
      const last = targets[targets.length - 1];
      return last.webSocketDebuggerUrl ? (last as any) : null;
    }

    const parsedIndex = typeof query === "number" ? query : parseInt(String(query), 10);
    if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < targets.length) {
      const t = targets[parsedIndex];
      return t.webSocketDebuggerUrl ? (t as any) : null;
    }

    const q = String(query).toLowerCase();
    const matched = targets.find((t) => t.url.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
    if (matched && matched.webSocketDebuggerUrl) {
      return matched as any;
    }

    const fallback = targets[targets.length - 1];
    return fallback.webSocketDebuggerUrl ? (fallback as any) : null;
  }

  async evaluateDirectCDP<T = any>(wsUrl: string, expression: string, timeoutMs = 8000): Promise<T> {
    return CdpSessionPool.getInstance().evaluate<T>(wsUrl, expression, timeoutMs);
  }

  async navigateDirectCDP(wsUrl: string, url: string, timeoutMs = 10000): Promise<void> {
    await CdpSessionPool.getInstance().send(wsUrl, "Page.navigate", { url }, timeoutMs);
  }

  // ==========================================
  // AppleScript Native Bridge for Existing Dia
  // ==========================================
  async isDiaRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`osascript -e 'application "Dia" is running'`);
      return stdout.trim() === "true";
    } catch {
      return false;
    }
  }

  async diaGetActiveTab(): Promise<{ url: string; title: string }> {
    const script = `tell application "Dia" to get {URL, title} of active tab of window 1`;
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const parts = stdout.trim().split(", ");
    return {
      url: parts[0] || "",
      title: parts.slice(1).join(", ") || "",
    };
  }

  async diaNavigate(url: string): Promise<string> {
    const script = `tell application "Dia" to set URL of active tab of window 1 to "${url}"`;
    await execAsync(`osascript -e '${script}'`);
    return `Đã điều hướng tab đang hoạt động của Dia tới: ${url}`;
  }

  async diaNewTab(url: string): Promise<string> {
    const script = `tell application "Dia" to make new tab at window 1 with properties {URL:"${url}"}`;
    await execAsync(`osascript -e '${script}'`);
    return `Đã mở tab mới ${url} trên Dia`;
  }

  async diaType(text: string): Promise<string> {
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `
      tell application "Dia" to activate
      delay 0.1
      tell application "System Events" to keystroke "${escaped}"
    `;
    await execAsync(`osascript -e '${script}'`);
    return `Đã gõ văn bản vào Dia: "${text}"`;
  }

  async diaCloseTab(): Promise<string> {
    const script = `tell application "Dia" to close active tab of window 1`;
    await execAsync(`osascript -e '${script}'`);
    return `Đã đóng tab hiện tại của Dia`;
  }

  async launchBrowser(browserName?: string, customUserDataDir?: string): Promise<{ success: boolean; message: string }> {
    const available = BrowserManager.getAvailableBrowsers();
    if (available.length === 0) {
      throw new Error("Không tìm thấy trình duyệt nào (Arc, Chrome, Dia, Edge) trong thư mục /Applications!");
    }

    let targetBrowser: BrowserAppInfo;
    if (browserName) {
      const found = available.find((b) => b.name.toLowerCase() === browserName.toLowerCase());
      if (!found) {
        throw new Error(`Trình duyệt "${browserName}" không có sẵn. Khả dụng: ${available.map((b) => b.name).join(", ")}`);
      }
      targetBrowser = found;
    } else {
      // Ưu tiên Arc nếu có, sau đó đến Chrome, Dia, Edge
      targetBrowser = available.find((b) => b.name === "arc") || available[0];
    }

    // Kiểm tra xem đã có instance CDP nào đang chạy sẵn chưa
    if (await this.isCDPOpen()) {
      return { success: true, message: `CDP đã sẵn sàng tại port ${this.port}.` };
    }

    const profileDir = customUserDataDir || path.join(os.homedir(), ".jev-browser", `profile-${targetBrowser.name}`);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const args = [
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
    ];

    const child = spawn(targetBrowser.path, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Chờ CDP mở port (tối đa 8 giây)
    const startTime = Date.now();
    while (Date.now() - startTime < 8000) {
      if (await this.isCDPOpen()) {
        return {
          success: true,
          message: `Đã khởi động ${targetBrowser.name} (CDP: 127.0.0.1:${this.port}, Profile: ${profileDir})`,
        };
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    throw new Error(`Đã khởi động ${targetBrowser.name} nhưng cổng CDP ${this.port} không phản hồi sau 8s.`);
  }

  async connect(tabQuery?: string | number): Promise<{ browser: Browser; page: Page }> {
    const isOpen = await this.isCDPOpen();
    if (!isOpen) {
      // Tự động khởi chạy trình duyệt nếu chưa bật
      await this.launchBrowser();
    }

    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${this.port}`);
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error("Không tìm thấy browser context nào từ CDP.");
    }

    const context = contexts[0];
    const pages = context.pages();
    let page: Page;

    if (tabQuery !== undefined && tabQuery !== "") {
      const parsedIndex = typeof tabQuery === "number" ? tabQuery : parseInt(tabQuery, 10);
      if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < pages.length) {
        page = pages[parsedIndex];
      } else {
        const queryStr = String(tabQuery).toLowerCase();
        let matched: Page | undefined;
        // Check URL first
        for (const p of pages) {
          if (p.url().toLowerCase().includes(queryStr)) {
            matched = p;
            break;
          }
        }
        // Then check Title
        if (!matched) {
          for (const p of pages) {
            try {
              const t = (await p.title()).toLowerCase();
              if (t.includes(queryStr)) {
                matched = p;
                break;
              }
            } catch {}
          }
        }
        page = matched || pages[pages.length - 1];
      }
    } else {
      if (pages.length > 0) {
        page = pages[pages.length - 1];
      } else {
        page = await context.newPage();
      }
    }

    await page.bringToFront().catch(() => {});
    return { browser, page };
  }

  async getTabs(): Promise<Array<{ index: number; title: string; url: string; active: boolean }>> {
    const { browser, page: activePage } = await this.connect();
    try {
      const context = browser.contexts()[0];
      const pages = context.pages();
      const tabs = [];
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        let title = "";
        try {
          title = await p.title();
        } catch {}
        tabs.push({
          index: i,
          title,
          url: p.url(),
          active: p === activePage,
        });
      }
      return tabs;
    } finally {
      await browser.close();
    }
  }

  async switchTab(query: string | number): Promise<{ index: number; title: string; url: string }> {
    const { browser, page } = await this.connect(query);
    try {
      await page.bringToFront();
      const title = await page.title().catch(() => "");
      const url = page.url();
      const context = browser.contexts()[0];
      const index = context.pages().indexOf(page);
      return { index, title, url };
    } finally {
      await browser.close();
    }
  }

  async getStatus(tabQuery?: string | number): Promise<{
    connected: boolean;
    port: number;
    url: string;
    title: string;
    elementCount: number;
    tabCount: number;
  }> {
    const isOpen = await this.isCDPOpen();
    if (!isOpen) {
      return {
        connected: false,
        port: this.port,
        url: "",
        title: "",
        elementCount: 0,
        tabCount: 0,
      };
    }

    const { browser, page } = await this.connect(tabQuery);
    try {
      const url = page.url();
      const title = await page.title();
      const elements = await DomExtractor.extractInteractiveElements(page);
      const tabCount = browser.contexts()[0]?.pages().length || 1;

      return {
        connected: true,
        port: this.port,
        url,
        title,
        elementCount: elements.length,
        tabCount,
      };
    } finally {
      await browser.close();
    }
  }

  async pressKey(page: Page, key: string): Promise<string> {
    await page.keyboard.press(key);
    return `Đã nhấn phím "${key}"`;
  }

  async clickElement(page: Page, target: string, elements?: InteractiveElement[]): Promise<string> {
    const cleanTarget = target.trim();

    // 1. Target dạng số ID synthetic: "#1" hoặc "1"
    const idMatch = cleanTarget.match(/^#?(\d+)$/);
    if (idMatch) {
      const targetId = idMatch[1];
      if (elements && elements.length > 0) {
        const match = elements.find((el) => el.id === targetId);
        if (match) {
          // Thử click theo selector hoặc text
          try {
            if (match.text) {
              await page.getByText(match.text, { exact: false }).first().click({ timeout: 3000 });
              return `Clicked element #${targetId}: "${match.text}"`;
            }
          } catch {}

          try {
            await page.locator(match.selector).first().click({ timeout: 3000 });
            return `Clicked selector: ${match.selector}`;
          } catch {}
        } else {
          throw new Error(`Không tìm thấy phần tử synthetic #${targetId} trong snapshot hiện tại (tổng số: ${elements.length}).`);
        }
      } else {
        throw new Error(`Phần tử synthetic #${targetId} cần danh sách elements từ snapshot.`);
      }
    }

    // 2. Click theo Text
    try {
      const loc = page.getByRole("button", { name: cleanTarget }).or(page.getByRole("link", { name: cleanTarget }));
      if (await loc.count() > 0) {
        await loc.first().click({ timeout: 3000 });
        return `Clicked role button/link: "${cleanTarget}"`;
      }
    } catch {}

    try {
      const textLoc = page.getByText(cleanTarget, { exact: false });
      if (await textLoc.count() > 0) {
        await textLoc.first().click({ timeout: 3000 });
        return `Clicked text: "${cleanTarget}"`;
      }
    } catch {}

    // 3. Fallback CSS selector
    try {
      await page.locator(cleanTarget).first().click({ timeout: 3000 });
      return `Clicked CSS selector: "${cleanTarget}"`;
    } catch (e: any) {
      throw new Error(`Không thể click vào mục tiêu "${cleanTarget}": ${e.message}`);
    }
  }

  async typeIntoElement(
    page: Page,
    text: string,
    target?: string,
    elements?: InteractiveElement[],
    pressEnter: boolean = false
  ): Promise<string> {
    let resultMsg = "";

    if (target) {
      const cleanTarget = target.trim();
      const idMatch = cleanTarget.match(/^#?(\d+)$/);
      if (idMatch && elements) {
        const targetId = idMatch[1];
        const match = elements.find((el) => el.id === targetId);
        if (match) {
          const loc = page.locator(match.selector).first();
          await loc.click({ timeout: 3000 }).catch(() => {});
          await page.keyboard.type(text);
          resultMsg = `Typed "${text}" into element #${targetId}`;
        }
      }

      if (!resultMsg) {
        const loc = page.locator(cleanTarget).first();
        try {
          const isEditable = await loc
            .evaluate(
              (el) =>
                el.getAttribute("contenteditable") === "true" ||
                el.tagName === "INPUT" ||
                el.tagName === "TEXTAREA"
            )
            .catch(() => false);

          if (isEditable) {
            await loc.click({ timeout: 3000 });
            await page.keyboard.type(text);
            resultMsg = `Typed "${text}" into selector: "${cleanTarget}"`;
          } else {
            await loc.fill(text);
            resultMsg = `Filled "${text}" into selector: "${cleanTarget}"`;
          }
        } catch {
          await loc.click({ timeout: 3000 }).catch(() => {});
          await page.keyboard.type(text);
          resultMsg = `Typed "${text}" into selector: "${cleanTarget}"`;
        }
      }
    } else {
      // Nếu không có target, tìm input đang focus hoặc input/contenteditable đầu tiên
      const inputs = page.locator("input:not([type='hidden']), textarea, [contenteditable='true']");
      if ((await inputs.count()) > 0) {
        const first = inputs.first();
        await first.click({ timeout: 3000 }).catch(() => {});
        await page.keyboard.type(text);
        resultMsg = `Typed "${text}" into active input/editable`;
      } else {
        await page.keyboard.type(text);
        resultMsg = `Typed "${text}" via keyboard`;
      }
    }

    if (pressEnter) {
      await page.waitForTimeout(200);
      await page.keyboard.press("Enter");
      resultMsg += " & pressed Enter";
    }

    return resultMsg;
  }
}
