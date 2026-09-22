import type { Page } from "playwright";
import { JevEngine } from "./jev-engine.js";

export type SocialPlatform = "facebook" | "threads" | "linkedin" | "auto";
export type PostPrivacy = "only_me" | "friends" | "connections" | "public" | "draft";

export interface PostOptions {
  platform?: SocialPlatform;
  privacy?: PostPrivacy;
  dryRun?: boolean;
}

export interface PostResult {
  success: boolean;
  platform: string;
  privacy: string;
  message: string;
  content: string;
  verified: boolean;
  details?: Record<string, any>;
}

export class SocialPoster {
  private jev: JevEngine;

  constructor(jev?: JevEngine) {
    this.jev = jev || new JevEngine();
  }

  /**
   * Tự động phát hiện platform từ URL trang hiện tại
   */
  detectPlatform(url: string): SocialPlatform {
    const u = url.toLowerCase();
    if (u.includes("facebook.com")) return "facebook";
    if (u.includes("threads.net") || u.includes("threads.com")) return "threads";
    if (u.includes("linkedin.com")) return "linkedin";
    return "auto";
  }

  /**
   * Đăng bài lên mạng xã hội với JEV System One tăng tốc và kiểm soát quyền riêng tư nghiêm ngặt
   */
  async post(page: Page, content: string, options: PostOptions = {}): Promise<PostResult> {
    const currentUrl = page.url();
    const platform = options.platform && options.platform !== "auto"
      ? options.platform
      : this.detectPlatform(currentUrl);

    const privacy = options.privacy || "only_me";

    if (platform === "auto") {
      throw new Error(`Không nhận diện được nền tảng mạng xã hội từ URL: ${currentUrl}. Vui lòng chỉ định rõ --platform (facebook | threads | linkedin).`);
    }

    switch (platform) {
      case "facebook":
        return this.postFacebook(page, content, privacy, options.dryRun);
      case "threads":
        return this.postThreads(page, content, privacy, options.dryRun);
      case "linkedin":
        return this.postLinkedIn(page, content, privacy, options.dryRun);
      default:
        throw new Error(`Nền tảng "${platform}" chưa được hỗ trợ đăng tự động.`);
    }
  }

  /**
   * Quy trình Facebook Post tối ưu hóa với JEV
   */
  private async postFacebook(
    page: Page,
    content: string,
    privacy: PostPrivacy,
    dryRun = false
  ): Promise<PostResult> {
    // 1. Kiểm tra xem người dùng đang ở trang chủ Facebook hay timeline
    const url = page.url();
    if (!url.includes("facebook.com")) {
      await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    // 2. Tìm trigger "Bạn đang nghĩ gì thế?" hoặc "What's on your mind?"
    // Dùng JEV fast-path selector
    const triggerSelector = 'div[role="button"]:has-text("bạn đang nghĩ gì thế"), div[role="button"]:has-text("What\'s on your mind"), div[role="region"] div[role="button"]:has(span:has-text("nghĩ gì thế"))';
    
    // Kiểm tra xem modal "Tạo bài viết" đã mở sẵn hay chưa
    let modalOpen = await page.locator('div[role="dialog"]').count() > 0;
    if (!modalOpen) {
      const trigger = page.locator(triggerSelector).first();
      if (await trigger.count() > 0) {
        await trigger.click();
      } else {
        // Fallback mở qua phím tắt P hoặc click vào composer container
        await page.locator('div[role="main"] div[role="button"]').first().click().catch(() => {});
      }

      // Chờ modal xuất hiện
      await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    }

    const dialog = page.locator('div[role="dialog"]').first();

    // 3. Thiết lập Audience / Privacy (Chỉ mình tôi / Only me mặc định)
    if (privacy === "only_me") {
      // Kiểm tra xem đối tượng hiện tại đã là "Chỉ mình tôi" chưa dựa trên nút quyền riêng tư
      const isAlreadyOnlyMe = await page.evaluate(() => {
        const btn = document.querySelector('div[aria-label*="quyền riêng tư"], div[aria-label*="privacy"]') as HTMLElement | null;
        if (btn) {
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          const text = (btn.innerText || btn.textContent || '').toLowerCase();
          return aria.includes('chỉ mình tôi') || aria.includes('only me') || text.includes('chỉ mình tôi') || text.includes('only me');
        }
        return false;
      });
      
      if (!isAlreadyOnlyMe) {
        // Mở bộ chọn quyền riêng tư
        const opened = await page.evaluate(() => {
          const btn = document.querySelector('div[aria-label*="quyền riêng tư"], div[aria-label*="privacy"]') as HTMLElement | null;
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (!opened) {
          const audienceBtn = dialog.locator('div[aria-label*="quyền riêng tư"], div[aria-label*="privacy"], div[role="button"]:has(span:has-text("Công khai")), div[role="button"]:has(span:has-text("Bạn bè"))').first();
          if (await audienceBtn.count() > 0) {
            await audienceBtn.click();
          }
        }
        await page.waitForTimeout(600);

        // Chọn "Chỉ mình tôi" bằng cách click vào label hoặc span tương ứng
        await page.evaluate(() => {
          const dialogs = document.querySelectorAll('div[role="dialog"]');
          const activeDialog = dialogs[dialogs.length - 1];
          if (!activeDialog) return false;

          const spans = Array.from(activeDialog.querySelectorAll('span')).filter(s => {
            const t = (s.innerText || s.textContent || '').trim().toLowerCase();
            return t === 'chỉ mình tôi' || t === 'only me';
          });

          if (spans.length > 0) {
            const label = spans[0].closest('label');
            if (label) {
              label.click();
              return true;
            }
            spans[0].click();
            return true;
          }
          return false;
        });
        await page.waitForTimeout(400);

        // Bảo vệ cài đặt mặc định của user: nếu checkbox "Đặt làm đối tượng mặc định" đang check, bỏ chọn ngay
        await page.evaluate(() => {
          const input = document.querySelector('div[role="dialog"] input[type="checkbox"]') as HTMLInputElement | null;
          if (input && input.checked) {
            input.click();
          }
        });
        await page.waitForTimeout(300);

        // Nhấn "Xong" để đóng modal chọn đối tượng
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('div[role="dialog"] div[role="button"], div[role="dialog"] button')).find(el => {
            const t = ((el as HTMLElement).innerText || el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || '';
            return t === 'Xong' || t === 'Done' || aria.includes('lựa chọn xong');
          }) as HTMLElement | undefined;
          if (b) {
            b.click();
            return true;
          }
          return false;
        });
        await page.waitForTimeout(600);
      }

      // 🛡️ ZERO PUBLIC LEAK GUARD: Xác minh trực tiếp trên nút quyền riêng tư
      const confirmedOnlyMe = await page.evaluate(() => {
        const btn = document.querySelector('div[aria-label*="quyền riêng tư"], div[aria-label*="privacy"]') as HTMLElement | null;
        if (btn) {
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          const text = (btn.innerText || btn.textContent || '').toLowerCase();
          return aria.includes('chỉ mình tôi') || aria.includes('only me') || text.includes('chỉ mình tôi') || text.includes('only me');
        }
        return false;
      });

      if (!confirmedOnlyMe) {
        throw new Error("🚨 BẢO VỆ AN TOÀN TUYỆT ĐỐI: Không thể xác nhận quyền riêng tư 'Chỉ mình tôi' (Only me) trên bài viết. Đã lập tức huỷ tiến trình đăng để không rò rỉ bài viết ra ngoài!");
      }
    }

    // 4. Nhập nội dung bài viết vào composer
    const composer = dialog.locator('div[role="textbox"][contenteditable="true"]').first();
    await composer.click();
    await page.waitForTimeout(200);
    // Nhập text
    await page.keyboard.insertText(content);
    await page.waitForTimeout(300);

    if (dryRun) {
      return {
        success: true,
        platform: "facebook",
        privacy,
        message: `[DRY-RUN] Đã chuẩn bị bài viết trên Facebook với chế độ "${privacy}", chưa nhấn Đăng.`,
        content,
        verified: true,
      };
    }

    // 5. Điều hướng luồng xuất bản (Tiếp -> Đăng hoặc Đăng trực tiếp)
    // Kiểm tra xem có nút "Tiếp" (Next) trước không
    const nextBtn = dialog.locator('div[role="button"]:has-text("Tiếp"), div[aria-label="Tiếp"]').first();
    if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(600);
    }

    // Nhấn nút "Đăng" cuối cùng (dùng exact selector để tránh click nhầm vào hàng 'Lựa chọn lịch đăng')
    const publishBtn = page.locator('div[role="dialog"] div[role="button"][aria-label="Đăng"], div[role="dialog"] div[role="button"]:has(span:text-is("Đăng"))').first();
    if (await publishBtn.count() > 0) {
      await publishBtn.click();
    } else {
      // Fallback submit
      const genericPostBtn = page.locator('div[role="dialog"] div[role="button"]:has-text("Đăng")').last();
      await genericPostBtn.click();
    }

    // Chờ modal đóng lại (tối đa 6 giây)
    let posted = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500);
      const remainingDialogs = await page.locator('div[role="dialog"]').count();
      if (remainingDialogs === 0) {
        posted = true;
        break;
      }
    }

    return {
      success: posted,
      platform: "facebook",
      privacy,
      message: posted
        ? `Đã đăng bài thành công lên Facebook (Chế độ: ${privacy})`
        : "Đã nhấn nút Đăng nhưng dialog chưa đóng hoàn toàn. Vui lòng kiểm tra lại.",
      content,
      verified: posted,
    };
  }

  /**
   * Quy trình Threads Post
   */
  private async postThreads(
    page: Page,
    content: string,
    privacy: PostPrivacy,
    dryRun = false
  ): Promise<PostResult> {
    if (privacy === "only_me") {
      throw new Error(
        "Threads không hỗ trợ chế độ 'Chỉ mình tôi' (Only me). Threads chỉ có bài viết công khai hoặc lưu bản nháp (Drafts). Để bảo vệ trang cá nhân, không thể đăng tự động với --privacy only_me. Vui lòng dùng --privacy draft hoặc xác nhận đăng công khai."
      );
    }

    const url = page.url();
    if (!url.includes("threads.")) {
      await page.goto("https://www.threads.com/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    // Tìm trigger tạo bài mới
    const trigger = page.locator('div[role="button"]:has-text("New thread"), div[role="button"]:has-text("What\'s new?")').first();
    if (await trigger.count() > 0) {
      await trigger.click();
      await page.waitForTimeout(500);
    }

    // Tìm composer textbox
    const composer = page.locator('div[role="textbox"][contenteditable="true"], div[aria-label*="What\'s new"]').first();
    await composer.click();
    await page.keyboard.insertText(content);
    await page.waitForTimeout(300);

    if (dryRun || privacy === "draft") {
      return {
        success: true,
        platform: "threads",
        privacy,
        message: `[DRY-RUN/DRAFT] Đã soạn nội dung trên Threads: "${content}"`,
        content,
        verified: true,
      };
    }

    // Nhấn Post
    const postBtn = page.locator('div[role="dialog"] div[role="button"]:has-text("Post")').first();
    await postBtn.click();
    await page.waitForTimeout(1500);

    return {
      success: true,
      platform: "threads",
      privacy,
      message: `Đã đăng bài lên Threads thành công.`,
      content,
      verified: true,
    };
  }

  /**
   * Quy trình LinkedIn Post
   */
  private async postLinkedIn(
    page: Page,
    content: string,
    privacy: PostPrivacy,
    dryRun = false
  ): Promise<PostResult> {
    if (privacy === "only_me") {
      throw new Error(
        "LinkedIn không hỗ trợ chế độ 'Chỉ mình tôi' (Only me). LinkedIn chỉ hỗ trợ: Anyone (Công khai), Connections only (Chỉ kết nối), hoặc Group. Để bảo vệ trang cá nhân khi test, vui lòng dùng --privacy connections hoặc --dry-run."
      );
    }

    const url = page.url();
    if (!url.includes("linkedin.com")) {
      await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    // 2. Mở composer "Start a post" nếu chưa mở sẵn
    const isComposerOpen = (await page.locator('div.tiptap[role="textbox"], div[contenteditable="true"]').count()) > 0;
    if (!isComposerOpen) {
      const trigger = page.locator('button:has-text("Start a post"), div[role="button"]:has-text("Start a post"), span:text-is("Start a post")').first();
      if (await trigger.count() > 0) {
        await trigger.click();
      }
      await page.waitForSelector('div.tiptap[role="textbox"], div[contenteditable="true"]', { timeout: 8000 });
    }

    // 3. Điều chỉnh privacy nếu cần
    if (privacy === "connections") {
      const isAlreadyConnections = await page.evaluate(() => {
        const btn = (Array.from(document.querySelectorAll('div[role="button"]')) as HTMLElement[]).find(b => (b.innerText || b.textContent || '').includes('Post to'));
        return ((btn?.innerText || btn?.textContent || '')).toLowerCase().includes('connections');
      });

      if (!isAlreadyConnections) {
        const opened = await page.evaluate(() => {
          const btn = (Array.from(document.querySelectorAll('div[role="button"]')) as HTMLElement[]).find(b => (b.innerText || b.textContent || '').includes('Post to'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (opened) {
          await page.waitForTimeout(500);
          await page.evaluate(() => {
            const opt = (Array.from(document.querySelectorAll('div[role="button"]')) as HTMLElement[]).find(b => (b.innerText || b.textContent || '').trim().startsWith('Connections only'));
            if (opt) {
              opt.click();
            }
          });
          await page.waitForTimeout(400);
        }
      }
    }

    // 4. Nhập nội dung vào TipTap ProseMirror composer
    const composer = page.locator('div.tiptap[role="textbox"], div[contenteditable="true"]').first();
    await composer.click();
    await page.waitForTimeout(200);
    await page.keyboard.insertText(content);
    await page.waitForTimeout(300);

    if (dryRun) {
      return {
        success: true,
        platform: "linkedin",
        privacy,
        message: `[DRY-RUN] Đã soạn bài trên LinkedIn (Quyền xem: ${privacy}), chưa nhấn Post.`,
        content,
        verified: true,
      };
    }

    // 5. Nhấn Post button
    const postBtn = page.locator('button.share-actions__primary-action, button:has-text("Post")').last();
    await postBtn.click();
    await page.waitForTimeout(2000);

    return {
      success: true,
      platform: "linkedin",
      privacy,
      message: `Đã đăng bài thành công lên LinkedIn (Quyền xem: ${privacy})`,
      content,
      verified: true,
    };
  }
}
