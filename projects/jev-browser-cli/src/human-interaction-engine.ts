import { CdpSessionPool } from "./cdp-session-pool.js";

/**
 * 🧑‍💻 HUMAN-LIKE INTERACTION ENGINE
 * Implements the official timing, pacing, scrolling, and typing guidelines
 * from the Claude Human-Like Behavior Specification (human-like-behavior.md).
 */
export class HumanInteractionEngine {
  private pool: CdpSessionPool;

  constructor(pool?: CdpSessionPool) {
    this.pool = pool || CdpSessionPool.getInstance();
  }

  /**
   * Randomized sleep between min and max ms with natural jitter
   */
  async sleep(minMs: number, maxMs?: number): Promise<void> {
    const min = minMs;
    const max = maxMs !== undefined ? maxMs : minMs * 1.5;
    const duration = Math.floor(min + Math.random() * (max - min));
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Natural hesitation before an action (thinking pause)
   */
  async thinkPause(): Promise<void> {
    await this.sleep(1200, 2800);
  }

  /**
   * Reading pause proportional to text length
   */
  async readingPause(textLength: number): Promise<void> {
    if (textLength < 60) {
      await this.sleep(2000, 3500);
    } else if (textLength < 250) {
      await this.sleep(3500, 6000);
    } else {
      await this.sleep(6000, 10000);
    }
  }

  /**
   * Human-like natural typing into an active element or selector
   * Types in natural chunks/phrases with variable delay per character (45ms-95ms)
   * and micro-pauses at punctuation (. , ! ? \n)
   */
  async typeHumanLike(wsUrl: string, text: string, targetSelector?: string): Promise<void> {
    if (targetSelector) {
      // Focus target element
      await this.pool.evaluate(wsUrl, `((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
        }
      })(${JSON.stringify(targetSelector)})`);
      await this.sleep(800, 1500); // 1-2s wait after clicking/focusing input
    }

    // Split text into lines/paragraphs
    const paragraphs = text.split("\n");

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx];

      // Type words in natural small bursts
      const words = paragraph.split(" ");
      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];

        // Type character by character with keystroke jitter
        for (let cIdx = 0; cIdx < word.length; cIdx++) {
          const char = word[cIdx];
          await this.pool.send(wsUrl, "Input.insertText", { text: char });
          
          // Keystroke latency: 40ms - 85ms
          await this.sleep(40, 85);

          // Micro-pause on punctuation
          if ([".", ",", "!", "?", ":", ";"].includes(char)) {
            await this.sleep(300, 700);
          }
        }

        // Space between words with slight variation
        if (wIdx < words.length - 1) {
          await this.pool.send(wsUrl, "Input.insertText", { text: " " });
          await this.sleep(70, 150);
        }

        // Occasional mid-sentence thought hesitation (1 in 8 words)
        if (Math.random() < 0.12 && wIdx < words.length - 1) {
          await this.sleep(400, 900);
        }
      }

      // If not the last paragraph, add newlines with thinking pause
      if (pIdx < paragraphs.length - 1) {
        await this.sleep(1000, 2200); // Thinking before new paragraph
        await this.pool.evaluate(wsUrl, `(() => {
          document.execCommand('insertLineBreak');
        })()`);
        await this.sleep(400, 800);
      }
    }

    // Post-typing satisfaction pause
    await this.sleep(800, 1800);
  }

  /**
   * Natural burst scrolling (Scroll-Read-Scroll pattern)
   * Humans scroll in bursts, pause to read, occasionally scroll back up slightly
   */
  async scrollNatural(wsUrl: string, totalBursts: number = 3): Promise<void> {
    for (let i = 0; i < totalBursts; i++) {
      // 1. Scroll down 300-600px
      const distance = Math.floor(350 + Math.random() * 300);
      await this.pool.evaluate(wsUrl, `window.scrollBy({ top: ${distance}, behavior: 'smooth' })`);
      
      // 2. Reading pause (2.5s - 5s)
      await this.sleep(2500, 5000);

      // 3. Occasional scroll-back-up slightly (re-reading, ~30% probability)
      if (Math.random() < 0.35) {
        const backUp = Math.floor(100 + Math.random() * 150);
        await this.pool.evaluate(wsUrl, `window.scrollBy({ top: -${backUp}, behavior: 'smooth' })`);
        await this.sleep(1800, 3200); // Re-reading pause
      }
    }
  }

  /**
   * Safe SPA-friendly navigation that avoids CDP Page.navigate timeouts on heavy SPAs
   */
  async navigateSafely(wsUrl: string, targetUrl: string): Promise<void> {
    try {
      const cur = await this.pool.evaluate(wsUrl, "window.location.href", 3000);
      if (cur === targetUrl) {
        await this.pool.evaluate(wsUrl, "window.scrollTo({ top: 0, behavior: 'smooth' })", 2000);
        return;
      }
      await this.pool.evaluate(wsUrl, `window.location.href = ${JSON.stringify(targetUrl)}`, 4000);
    } catch {
      try {
        await this.pool.send(wsUrl, "Page.navigate", { url: targetUrl }, 25000);
      } catch (err) {
        console.warn("Navigation warning:", err);
      }
    }
  }

  /**
   * Natural filler activity: browse home feed or activity feed to break the robotic action chain
   */
  async executeFillerActivity(wsUrl: string): Promise<void> {
    const activities = ["browse_feed", "check_activity", "inspect_topics"];
    const choice = activities[Math.floor(Math.random() * activities.length)];

    if (choice === "check_activity") {
      await this.navigateSafely(wsUrl, "https://www.threads.com/activity");
      await this.sleep(3500, 5000);
      await this.scrollNatural(wsUrl, 2);
    } else if (choice === "inspect_topics") {
      const topics = ["3dprinting", "designthreads", "aithreads"];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      await this.navigateSafely(wsUrl, `https://www.threads.com/search?q=${topic}&serp_type=tags`);
      await this.sleep(3500, 5000);
      await this.scrollNatural(wsUrl, 2);
    } else {
      await this.navigateSafely(wsUrl, "https://www.threads.com/");
      await this.sleep(3500, 5000);
      await this.scrollNatural(wsUrl, 3);
    }

    await this.sleep(2000, 4000);
  }
}
