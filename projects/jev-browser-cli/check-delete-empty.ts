import { CdpSessionPool } from "./src/cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Looking for post Ddm51byk26J menu...");
  const menuInfo: any = await pool.evaluate(wsUrl, `(() => {
    const postEl = document.querySelector('a[href*="/post/Ddm51byk26J"]')?.closest("article, div[data-pressable-container='true']");
    if (!postEl) return { found: false };

    // find all buttons in postEl
    const svgs = Array.from(postEl.querySelectorAll('svg'));
    // 3 dots icon typically has 3 circles or a path with dots
    const moreSvg = svgs.find(s => s.querySelectorAll('circle').length === 3 || s.innerHTML.includes('circle'));
    if (moreSvg) {
      const btn = moreSvg.closest('div[role="button"], button') || moreSvg;
      btn.click();
      return { found: true, clicked: true, tag: btn.tagName };
    }
    return { found: true, clicked: false, svgs: svgs.length };
  })()`);

  console.log("Menu info:", menuInfo);
  await new Promise(r => setTimeout(r, 1500));

  const dialogOptions: any = await pool.evaluate(wsUrl, `(() => {
    return Array.from(document.querySelectorAll('div[role="dialog"] button, div[role="menu"] div, div[role="menuitem"]')).map(el => (el.innerText || '').trim());
  })()`);

  console.log("Menu dialog options:", dialogOptions);
  process.exit(0);
}

main().catch(console.error);
