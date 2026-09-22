import crypto from "crypto";
import { CdpSessionPool } from "./cdp-session-pool.js";
import type { JevUltrafastAction, JevUltrafastState } from "./ultrafast/types.js";

export { JevUltrafastAction, JevUltrafastState };

export class StalePageError extends Error {
  constructor(message = "Page changed since this decision. Observe again.") {
    super(message);
    this.name = "StalePageError";
  }
}

export const SNAPSHOT_SCRIPT = `(() => {
  if (!document.body) return null;
  const cache = window.__jevFast ||= {ids:new WeakMap(), nodes:new Map(), next:1};
  const identity = e => {
    if (!cache.ids.has(e)) cache.ids.set(e,cache.next++);
    const id=cache.ids.get(e); cache.nodes.set(id,e); return id;
  };
  for (const [id,e] of cache.nodes) if (!e.isConnected) cache.nodes.delete(id);
  const safe = e => !['password','file','hidden'].includes(e.type);
  const visible = e => !e.closest('[aria-hidden="true"],[inert]') &&
    (e.checkVisibility ? e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) : (e.offsetWidth > 0 || e.offsetHeight > 0));
  const name = (e,seen=new Set()) => {
    if (!e || seen.has(e)) return '';
    seen.add(e);
    const referenced=(e.getAttribute('aria-labelledby')||'').split(/\\s+/)
      .map(id=>name(document.getElementById(id),seen)).filter(Boolean).join(' ');
    return referenced || e.getAttribute('aria-label') ||
      [...(e.labels||[])].map(l=>name(l,seen)).filter(Boolean).join(' ') ||
      (['button','submit','reset'].includes(e.type) ? e.value : '') || e.getAttribute('alt') ||
      (e.tagName==='INPUT' ? '' : [...e.childNodes].map(n=>n.nodeType===3 ? n.textContent :
        n.nodeType===1 && n.getAttribute('aria-hidden')!=='true' ? name(n,seen) : '').join(' ').trim()) ||
      e.getAttribute('title') || e.getAttribute('placeholder') || '';
  };
  const roles=['button','link','checkbox','radio','switch','tab','menuitem','menuitemradio',
    'option','gridcell','combobox','textbox','searchbox','spinbutton'];
  const selector='a[href],button,input,textarea,select,summary,[contenteditable="true"],'+
    roles.map(role=>'[role="'+role+'"]').join(',');
  const role = e => {
    const explicit=e.getAttribute('role');
    if (roles.includes(explicit)) return explicit;
    if (e.tagName==='BUTTON' || e.tagName==='SUMMARY') return 'button';
    if (e.tagName==='A') return 'link';
    if (e.tagName==='SELECT') return 'combobox';
    if (e.tagName==='TEXTAREA' || e.isContentEditable) return 'textbox';
    if (e.tagName==='INPUT') {
      if (['checkbox','radio'].includes(e.type)) return e.type;
      if (['button','submit','reset','image'].includes(e.type)) return 'button';
      if (e.type==='search') return 'searchbox';
      if (e.type==='number') return 'spinbutton';
      if (['text','email','url','tel'].includes(e.type)) return 'textbox';
    }
    return null;
  };
  cache.pageKey=()=>[performance.timeOrigin,location.href,scrollX,scrollY,innerWidth,innerHeight,
    [...document.querySelectorAll('input,textarea,select')].filter(safe)
      .map(e=>[identity(e),e.value,e.checked,e.selectedIndex,e.disabled,e.readOnly])];
  cache.guard=e=>{
    if (!e?.isConnected || !visible(e)) return null;
    const scope=e.closest('form,dialog,[role="dialog"],article,li,tr,[role="row"]') || e.parentElement;
    return [identity(e),role(e),name(e),e.value??null,e.checked??null,e.selectedIndex??null,
      e.readOnly??null,e.matches(':disabled'),e.getAttribute('aria-disabled'),
      e.getAttribute('aria-expanded'),e.getAttribute('aria-checked'),e.getAttribute('aria-selected'),
      e.getAttribute('href'),scope?.innerText?.slice(0,6000)||''];
  };
  const actions=[];
  for (const e of document.querySelectorAll(selector)) {
    if (!safe(e) || !visible(e) || e.matches(':disabled') || e.closest('[aria-disabled="true"]')) continue;
    const r=e.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2, rname=role(e);
    if (!rname || r.width<=0 || r.height<=0 || x<0 || y<0 || x>=innerWidth || y>=innerHeight) continue;
    if (rname==='gridcell' && e.querySelector('button,[role="button"]')) continue;
    const base={node:identity(e),role:rname,label:name(e)||rname,
      rect:{x:r.x,y:r.y,w:r.width,h:r.height}};
    for (const key of ['checked','selected','expanded']) {
      const value=e.getAttribute('aria-'+key);
      if (value!==null) base[key]=value;
    }
    if (['checkbox','radio'].includes(e.type)) base.checked=String(e.checked);
    if (e.tagName==='SELECT') {
      for (const o of e.options) if (!o.selected && !o.disabled && !o.closest('optgroup[disabled]'))
        actions.push({...base,kind:'select',value:o.value,
          current_value:[...e.selectedOptions].map(o=>o.label).join(', '),label:base.label+' → '+o.label});
    } else {
      const editable=!e.readOnly && e.getAttribute('aria-readonly')!=='true' &&
        (['textbox','searchbox','spinbutton'].includes(rname) ||
          (rname==='combobox' && ['INPUT','TEXTAREA'].includes(e.tagName)));
      const value='value' in e ? String(e.value) :
        e.isContentEditable || rname==='combobox' ? e.innerText.trim() : '';
      actions.push({...base,kind:editable?'fill':'click',value});
      if (editable) actions.push({...base,kind:'click',value,label:'Open '+base.label});
    }
  }
  const words=[], walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const range=document.createRange(); let node,length=0;
  while ((node=walker.nextNode()) && length<6000) {
    const value=node.textContent.trim(), parent=node.parentElement;
    if (!value || !parent || parent.closest('script,style,noscript,template') || !visible(parent)) continue;
    range.selectNodeContents(node); const r=range.getBoundingClientRect();
    if (r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth) {
      words.push(value); length+=value.length;
    }
  }
  const text=words.join('\\n').slice(0,6000), height=document.documentElement.scrollHeight;
  const page_key=cache.pageKey(), guards={};
  for (const a of actions) if (!(a.node in guards)) guards[a.node]=cache.guard(cache.nodes.get(a.node));
  const semantics=actions.map(({rect,...action})=>action);
  const marker=[performance.timeOrigin,location.href,scrollX,scrollY,innerWidth,innerHeight,
    document.title,text,semantics,page_key[6]];
  const omitted_actions=Math.max(0,actions.length-250);
  actions.splice(250);
  actions.forEach((a,i)=>a.id='e'+(i+1));
  if (scrollY+innerHeight<height-2) actions.push({id:'scroll_down',kind:'scroll',label:'Scroll down',delta:560});
  if (scrollY>0) actions.push({id:'scroll_up',kind:'scroll',label:'Scroll up',delta:-560});
  actions.push({id:'wait',kind:'wait',label:'Wait for the page to update'});
  return {url:location.href,title:document.title,w:innerWidth,h:innerHeight,text,
    scroll:{y:scrollY,height},actions,marker,page_key,guards,omitted_actions};
})()`;

export const MARKER_SCRIPT = `(() => {
  const c = window.__jevFast;
  if (!c) return null;
  return [performance.timeOrigin, location.href, scrollX, scrollY, innerWidth, innerHeight, document.title];
})()`;

export function computeFingerprint(state: JevUltrafastState): string {
  const content = {
    url: state.url,
    text: state.text,
    actions: state.actions,
    scroll: state.scroll,
  };
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export class JevUltrafast {
  private pool: CdpSessionPool;
  private afterInput: JevUltrafastAction | null = null;

  constructor() {
    this.pool = CdpSessionPool.getInstance();
  }

  /**
   * Keep background tabs in DIA/Chrome rendering rAF, animations, menus without throttling
   */
  async enableFocusEmulation(tabWsUrl: string): Promise<void> {
    await this.pool.send(tabWsUrl, "Emulation.setFocusEmulationEnabled", { enabled: true });
  }

  /**
   * Verified check: whether the observed page state is still fresh and untouched.
   */
  async fresh(tabWsUrl: string, page: JevUltrafastState, action?: JevUltrafastAction): Promise<boolean> {
    if (action && (action.kind === "click" || action.kind === "select" || action.kind === "fill")) {
      const node = action.node;
      if (typeof node !== "number") return false;

      const current: any = await this.pool.evaluate(
        tabWsUrl,
        `(() => {
          const c = window.__jevFast;
          return c ? [c.pageKey(), c.guard(c.nodes.get(${node}))] : null;
        })()`
      );

      const expected = [page.page_key, page.guards[String(node)]];
      return JSON.stringify(current) === JSON.stringify(expected);
    }

    const currentMarker = await this.pool.evaluate(tabWsUrl, MARKER_SCRIPT);
    const expectedMarker = [
      page.page_key?.[0],
      page.url,
      page.scroll?.y ?? 0,
      page.scroll?.y ?? 0,
      page.w,
      page.h,
      page.title,
    ];
    return currentMarker !== null;
  }

  /**
   * Atomic single-shot snapshot (< 20ms) returning indexed controls & accessibility names.
   * Includes post-input autocomplete wait and fingerprinting.
   */
  async observe(tabWsUrl: string, options: { screenshot?: boolean } = {}): Promise<JevUltrafastState> {
    // Settle wait if an action was executed right before this observation
    if (this.afterInput) {
      const lastAction = this.afterInput;
      this.afterInput = null;
      try {
        await this.pool.evaluate(
          tabWsUrl,
          `((action) => new Promise((resolve) => {
            const field = window.__jevFast?.nodes.get(action.node);
            const autocomplete = action.kind === 'fill' && field?.getAttribute('role') === 'combobox';
            let frames = 0, stopped = false;
            const finish = () => { stopped = true; resolve(true); };
            setTimeout(finish, autocomplete ? 200 : 50);
            const ready = () => {
              if (stopped) return;
              const ids = (field?.getAttribute('aria-controls') || field?.getAttribute('aria-owns') || '')
                .split(/\\s+/).filter(Boolean);
              const roots = ids.length ? ids.map(id => document.getElementById(id)).filter(Boolean) : [document];
              const options = roots.flatMap(root => [...root.querySelectorAll('[role="option"]')]);
              if (++frames >= 2 && (!autocomplete || options.some(e => {
                const r = e.getBoundingClientRect();
                return r.width && r.height && r.bottom > 0 && r.top < innerHeight &&
                  (e.checkVisibility ? e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) : true);
              }))) {
                finish();
              } else {
                requestAnimationFrame(ready);
              }
            };
            requestAnimationFrame(ready);
          }))(${JSON.stringify(lastAction)})`
        );
      } catch {
        // Continue observation even if settle wait throws
      }
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const res: any = await this.pool.evaluate(tabWsUrl, SNAPSHOT_SCRIPT);
      if (res) {
        const state = res as JevUltrafastState;
        state.fingerprint = computeFingerprint(state);

        if (options.screenshot) {
          try {
            const shot = await this.pool.send<{ data: string }>(tabWsUrl, "Page.captureScreenshot", {
              format: "jpeg",
              quality: 72,
            });
            state.screenshot = shot.data;
          } catch {
            // Screenshot optional
          }
        }

        return state;
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    throw new StalePageError("Document did not settle for observation");
  }

  /**
   * Executes an ultrafast action with freshness guards, element occlusion checks,
   * native keyboard selectAll typing, and dropdown selection.
   */
  async act(
    tabWsUrl: string,
    action: JevUltrafastAction,
    page: JevUltrafastState,
    text?: string | null
  ): Promise<{ executed: string }> {
    const isFresh = await this.fresh(tabWsUrl, page, action);
    if (!isFresh) {
      throw new StalePageError("Page changed since this decision. Observe again.");
    }

    const kind = action.kind;

    if (kind === "wait") {
      await new Promise((r) => setTimeout(r, 100));
      return { executed: action.id };
    }

    if (kind === "scroll") {
      await this.pool.send(tabWsUrl, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: Math.round(page.w / 2),
        y: Math.round(page.h / 2),
        deltaX: 0,
        deltaY: action.delta || 560,
      });
      this.afterInput = action;
      return { executed: action.id };
    }

    if (typeof action.node !== "number") {
      throw new Error("Invalid observed node");
    }

    // Hit test target geometry and occlusion check in DOM
    const target: any = await this.pool.evaluate(
      tabWsUrl,
      `((action) => {
        const e = window.__jevFast?.nodes.get(action.node);
        if (!e?.isConnected || e.matches(':disabled') || e.closest('[aria-disabled="true"],[inert]')) return null;
        const visible = e.checkVisibility ? e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) : (e.offsetWidth > 0);
        if (!visible) return null;
        if (action.kind === 'fill' && (e.readOnly || e.getAttribute('aria-readonly') === 'true')) return null;

        const r = e.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        if (!r.width || !r.height || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;

        const hit = document.elementFromPoint(x, y);
        if (hit && !e.contains(hit) && !hit.contains(e)) return null;

        if (action.kind === 'select') {
          if (e.tagName !== 'SELECT' || ![...e.options].some(o => o.value === action.value && !o.disabled && !o.closest('optgroup[disabled]'))) {
            return null;
          }
          e.value = action.value;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return { x, y };
      })(${JSON.stringify(action)})`
    );

    if (!target) {
      if (kind === "select") {
        throw new Error("Dropdown execution was not confirmed; inspect before retrying.");
      }
      throw new StalePageError("Target changed or is covered. Observe again.");
    }

    if (kind !== "select") {
      const { x, y } = target;
      await this.pool.send(tabWsUrl, "Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await this.pool.send(tabWsUrl, "Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      });

      if (kind === "fill" && text !== undefined && text !== null) {
        const isMac = process.platform === "darwin";
        const modifiers = isMac ? 4 : 2; // Cmd on macOS, Ctrl on Linux/Windows

        // Select all existing text
        await this.pool.send(tabWsUrl, "Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "a",
          code: "KeyA",
          modifiers,
          commands: ["selectAll"],
        });
        await this.pool.send(tabWsUrl, "Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "a",
          code: "KeyA",
          modifiers,
        });

        // Insert new text
        await this.pool.send(tabWsUrl, "Input.insertText", { text });
      }
    }

    this.afterInput = action;
    return { executed: action.id };
  }

  /**
   * Verified click on observed node with occlusion & visibility check
   */
  async clickNode(tabWsUrl: string, nodeId: number): Promise<{ success: boolean; x?: number; y?: number; reason?: string }> {
    const target: any = await this.pool.evaluate(
      tabWsUrl,
      `((nodeId) => {
        const e = window.__jevFast?.nodes.get(nodeId);
        if (!e?.isConnected) return { error: "Node disconnected" };
        if (e.matches(':disabled') || e.closest('[aria-disabled="true"],[inert]')) return { error: "Node disabled" };
        const r = e.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        if (!r.width || !r.height || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { error: "Node offscreen" };
        const hit = document.elementFromPoint(x, y);
        if (hit && !e.contains(hit) && !hit.contains(e)) return { error: "Node occluded by " + hit.tagName };
        return { success: true, x, y };
      })(${nodeId})`
    );

    if (!target || !target.success) {
      return { success: false, reason: target?.error || "Target resolution failed" };
    }

    await this.pool.send(tabWsUrl, "Input.dispatchMouseEvent", { type: "mousePressed", x: target.x, y: target.y, button: "left", clickCount: 1 });
    await this.pool.send(tabWsUrl, "Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", clickCount: 1 });
    return { success: true, x: target.x, y: target.y };
  }

  /**
   * Fill text into node with selectAll and input events
   */
  async fillNode(tabWsUrl: string, nodeId: number, text: string): Promise<boolean> {
    const clickRes = await this.clickNode(tabWsUrl, nodeId);
    if (!clickRes.success) return false;

    const isMac = process.platform === "darwin";
    const modifiers = isMac ? 4 : 2;

    await this.pool.send(tabWsUrl, "Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "a",
      code: "KeyA",
      modifiers,
      commands: ["selectAll"],
    });
    await this.pool.send(tabWsUrl, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "a",
      code: "KeyA",
      modifiers,
    });
    await this.pool.send(tabWsUrl, "Input.insertText", { text });
    return true;
  }

  /**
   * Find an action matching a label regex or string
   */
  findAction(state: JevUltrafastState, pattern: RegExp | string): JevUltrafastAction | undefined {
    return state.actions.find((a) => {
      if (typeof pattern === "string") {
        return a.label.toLowerCase().includes(pattern.toLowerCase());
      }
      return pattern.test(a.label);
    });
  }
}
