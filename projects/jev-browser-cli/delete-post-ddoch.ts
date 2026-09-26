import { CdpSessionPool } from "./src/cdp-session-pool.js";

async function main() {
  const pool = CdpSessionPool.getInstance();
  const res = await fetch("http://127.0.0.1:9222/json/list");
  const tabs = await res.json() as any[];
  const t = tabs.find(x => x.url && x.url.includes("threads.com"));
  const wsUrl = t.webSocketDebuggerUrl;

  console.log("Looking for post DdoCHn9E_zl three dots menu...");
  const menuInfo: any = await pool.evaluate(wsUrl, `(() => {
    // Look for three dots in the current view or post
    const svgs = Array.from(document.querySelectorAll('svg'));
    const moreSvg = svgs.find(s => s.querySelectorAll('circle').length === 3 || (s.getAttribute('aria-label') || '').includes('More'));
    if (moreSvg) {
      const btn = moreSvg.closest('div[role="button"], button') || moreSvg;
      btn.click();
      return { clicked: true };
    }
    return { clicked: false };
  })()`);

  console.log("Menu click:", menuInfo);
  await new Promise(r => setTimeout(r, 1500));

  console.log("Clicking 'Delete' in menu...");
  const deleteClick: any = await pool.evaluate(wsUrl, `(() => {
    const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="dialog"] div, span, button'));
    const deleteBtn = items.find(el => (el.innerText || '').trim() === "Delete");
    if (deleteBtn) {
      deleteBtn.click();
      return { clicked: true };
    }
    return { clicked: false, items: items.map(x => (x.innerText || '').trim()).slice(0, 10) };
  })()`);
  console.log("Delete button clicked:", deleteClick);
  await new Promise(r => setTimeout(r, 1500));

  console.log("Confirming delete dialog...");
  const confirmClick: any = await pool.evaluate(wsUrl, `(() => {
    const dialogBtns = Array.from(document.querySelectorAll('div[role="dialog"] div[role="button"], div[role="dialog"] button'));
    const confirm = dialogBtns.find(b => (b.innerText || '').trim() === "Delete");
    if (confirm) {
      confirm.click();
      return { confirmed: true };
    }
    return { confirmed: false, btns: dialogBtns.map(b => (b.innerText || '').trim()) };
  })()`);
  console.log("Delete confirmed:", confirmClick);

  await new Promise(r => setTimeout(r, 3000));
  console.log("Post deleted cleanly!");
  process.exit(0);
}

main().catch(console.error);
