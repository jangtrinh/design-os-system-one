import type { Page } from "playwright";
import type { InteractiveElement } from "./types.js";

export class DomExtractor {
  static async extractInteractiveElements(page: Page): Promise<InteractiveElement[]> {
    try {
      const elements = await page.evaluate(() => {
        const interactiveTags = ["a", "button", "input", "textarea", "select", "summary"];
        const interactiveRoles = ["button", "link", "checkbox", "radio", "tab", "menuitem", "combobox"];

        const inputCandidates = Array.from(
          document.querySelectorAll(
            "input, textarea, select, [contenteditable='true'], [role='textbox'], #richInput, .rich-input"
          )
        );

        const otherCandidates = Array.from(
          document.querySelectorAll(
            "a, button, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [onclick], [tabindex]:not([tabindex='-1']), [data-id], .conv-item, .chat-item, .search-item, [class*='conv'], [class*='button'], [class*='btn']"
          )
        );

        // Inputs & composers prioritized first so they never get crowded out
        const allCandidates = Array.from(new Set([...inputCandidates, ...otherCandidates]));

        const results: any[] = [];
        let counter = 1;

        for (const el of allCandidates) {
          // Check visibility
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          if (
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          ) {
            continue;
          }

          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";

          // Skip pure layout containers
          if ((role === "grid" || role === "row" || role === "gridcell") && tag === "div" && !el.hasAttribute("onclick")) {
            continue;
          }

          const isContentEditable =
            el.getAttribute("contenteditable") === "true" ||
            role === "textbox" ||
            el.id === "richInput" ||
            el.classList.contains("rich-input");
          const isInteractive =
            interactiveTags.includes(tag) ||
            interactiveRoles.includes(role) ||
            isContentEditable ||
            el.hasAttribute("onclick") ||
            style.cursor === "pointer" ||
            el.classList.contains("conv-item") ||
            el.classList.contains("search-item");

          const ariaLabel = el.getAttribute("aria-label") || "";
          let text = (
            el.textContent ||
            ariaLabel ||
            el.getAttribute("title") ||
            el.getAttribute("alt") ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim();

          const placeholder =
            el.getAttribute("placeholder") ||
            el.getAttribute("data-placeholder") ||
            (isContentEditable ? ariaLabel : "");

          const isInput =
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            isContentEditable;

          if (!text && isInput) {
            text = placeholder || ariaLabel || el.getAttribute("name") || el.getAttribute("id") || "";
          }

          // Skip completely empty elements with no action value
          if (!text && !placeholder && !el.getAttribute("href") && !isInput) {
            continue;
          }

          // Generate stable CSS selector
          let selector = tag;
          if (el.id) {
            selector = `#${CSS.escape(el.id)}`;
          } else if (el.getAttribute("aria-label")) {
            selector = `${tag}[aria-label="${CSS.escape(el.getAttribute("aria-label")!)}"]`;
          } else if (el.getAttribute("name")) {
            selector = `${tag}[name="${CSS.escape(el.getAttribute("name")!)}"]`;
          } else if (el.className && typeof el.className === "string") {
            const firstClass = el.className.trim().split(/\s+/)[0];
            if (firstClass && !firstClass.includes(":")) {
              selector = `${tag}.${CSS.escape(firstClass)}`;
            }
          }

          results.push({
            id: String(counter++),
            tag,
            text: text.slice(0, 100),
            role: role || undefined,
            placeholder: placeholder || undefined,
            selector,
            href: el.getAttribute("href") || undefined,
            isInput,
          });

          if (counter > 100) break; // Cap at 100 elements
        }

        return results;
      });

      return elements;
    } catch {
      return [];
    }
  }

  static formatSnapshotForAI(elements: InteractiveElement[], url: string, title: string): string {
    const lines: string[] = [
      `URL: ${url}`,
      `Title: ${title}`,
      `Interactive Elements (${elements.length}):`,
    ];

    for (const el of elements) {
      let desc = `#${el.id} [${el.tag.toUpperCase()}`;
      if (el.role) desc += ` role=${el.role}`;
      desc += `]`;

      if (el.text) desc += ` "${el.text}"`;
      if (el.placeholder) desc += ` (placeholder: "${el.placeholder}")`;
      if (el.href) desc += ` -> ${el.href}`;

      lines.push(`  ${desc}`);
    }

    return lines.join("\n");
  }
}
