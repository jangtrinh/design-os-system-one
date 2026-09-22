import type { InteractiveElement } from "./types.js";

export interface DeepElement extends InteractiveElement {
  isShadow?: boolean;
  isIframe?: boolean;
  frameIndex?: number;
  depth?: number;
}

export class DeepDomPiercer {
  /**
   * Generates client-side JavaScript expression to extract interactive elements
   * recursively piercing through Light DOM, Open Shadow Roots, and same-origin iframes.
   */
  static getExtractionScript(maxElements = 80): string {
    return `
    (() => {
      const results = [];
      const visited = new Set();
      let counter = 1;

      const interactiveTags = new Set(["a", "button", "input", "textarea", "select", "summary"]);
      const interactiveRoles = new Set(["button", "link", "checkbox", "radio", "tab", "menuitem", "combobox", "textbox"]);

      function isVisible(el, style) {
        if (!style) style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function buildSelector(el, pathPrefix = "") {
        const tag = el.tagName.toLowerCase();
        let sel = tag;
        if (el.id) {
          sel = "#" + CSS.escape(el.id);
        } else if (el.getAttribute("aria-label")) {
          sel = tag + '[aria-label="' + CSS.escape(el.getAttribute("aria-label")) + '"]';
        } else if (el.getAttribute("name")) {
          sel = tag + '[name="' + CSS.escape(el.getAttribute("name")) + '"]';
        } else if (el.className && typeof el.className === "string") {
          const firstClass = el.className.trim().split(/\\s+/)[0];
          if (firstClass && !firstClass.includes(":")) {
            sel = tag + "." + CSS.escape(firstClass);
          }
        }
        return pathPrefix ? pathPrefix + " >>> " + sel : sel;
      }

      function crawlRoot(root, pathPrefix = "", depth = 0, isIframe = false) {
        if (!root || depth > 5 || results.length >= ${maxElements}) return;

        let allNodes = [];
        try {
          allNodes = Array.from(root.querySelectorAll("*"));
        } catch {
          return;
        }

        for (const el of allNodes) {
          if (results.length >= ${maxElements}) break;
          if (visited.has(el)) continue;

          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";

          // 1. Check for Shadow Root
          if (el.shadowRoot) {
            const hostSelector = buildSelector(el, pathPrefix);
            crawlRoot(el.shadowRoot, hostSelector, depth + 1, false);
          }

          // 2. Check for same-origin iframe
          if (tag === "iframe" || tag === "frame") {
            try {
              const frameDoc = el.contentDocument || el.contentWindow?.document;
              if (frameDoc) {
                const frameSelector = buildSelector(el, pathPrefix);
                crawlRoot(frameDoc, frameSelector, depth + 1, true);
              }
            } catch {
              // Cross-origin iframe, skipped due to CORS browser policy
            }
          }

          // 3. Process candidate element
          const isContentEditable = el.getAttribute("contenteditable") === "true" || role === "textbox";
          const isClickable = el.hasAttribute("onclick") || el.getAttribute("tabindex") === "0";
          const isInteractive = interactiveTags.has(tag) || interactiveRoles.has(role) || isContentEditable || isClickable;

          if (!isInteractive) continue;

          let style;
          try {
            style = window.getComputedStyle(el);
          } catch {
            continue;
          }

          if (!isVisible(el, style)) continue;

          visited.add(el);

          const ariaLabel = el.getAttribute("aria-label") || "";
          let text = (el.textContent || ariaLabel || el.getAttribute("placeholder") || el.getAttribute("title") || "")
            .replace(/\\s+/g, " ")
            .trim();

          const isInput = tag === "input" || tag === "textarea" || tag === "select" || isContentEditable;
          const placeholder = el.getAttribute("placeholder") || (isContentEditable ? ariaLabel : "");

          if (!text && !placeholder && !isInput && !el.getAttribute("href")) continue;

          const selector = buildSelector(el, pathPrefix);

          results.push({
            id: String(counter++),
            tag,
            text: text.slice(0, 100),
            role: role || undefined,
            placeholder: placeholder || undefined,
            selector,
            href: el.getAttribute("href") || undefined,
            isInput,
            isShadow: depth > 0 && !isIframe,
            isIframe: isIframe,
            depth
          });
        }
      }

      crawlRoot(document, "", 0, false);

      return {
        url: window.location.href,
        title: document.title,
        elements: results
      };
    })()
    `;
  }

  /**
   * Generates click expression that handles both standard elements and Shadow DOM piercing
   */
  static getClickScript(selector: string, fallbackText = ""): string {
    return `
    (() => {
      function findDeep(sel) {
        if (!sel.includes(" >>> ")) {
          return document.querySelector(sel);
        }
        const parts = sel.split(" >>> ");
        let curr = document;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (i === 0) {
            const host = curr.querySelector(part);
            if (!host) return null;
            curr = host.shadowRoot || host.contentDocument || host;
          } else {
            const found = curr.querySelector(part);
            if (!found) return null;
            if (i < parts.length - 1) {
              curr = found.shadowRoot || found.contentDocument || found;
            } else {
              return found;
            }
          }
        }
        return null;
      }

      let el = findDeep(${JSON.stringify(selector)});
      if (!el && ${JSON.stringify(fallbackText)}) {
        const text = ${JSON.stringify(fallbackText)};
        el = Array.from(document.querySelectorAll('a, button, [role="button"]')).find(e => (e.textContent || '').includes(text));
      }

      if (el) {
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }
      return false;
    })()
    `;
  }
}
