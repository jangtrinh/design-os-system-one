const url = process.argv[2] || 'https://news.ycombinator.com/';
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const pages = list.filter(p=>p.type==='page');
const page = pages.find(p=>/x\.com/.test(p.url||'')) || pages[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=()=>j(new Error('ws'))});
let id=0; const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
const send=(m,p={},t=45000)=>new Promise((res,rej)=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);rej(new Error('timeout '+m))}},t)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});return r.result?.result?.value};
await send('Page.bringToFront');
await send('Page.navigate',{url}); await sleep(10000);
const els = await ev(`JSON.stringify((() => {
  const out = [];
  const all = document.querySelectorAll('div,section,aside,li,article,p');
  const seen = new Set();
  for (const el of all) {
    const t = (el.innerText || '').trim();
    if (t.length < 20 || t.length > 500) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 20) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    const a = el.querySelector('a[href]');
    out.push({ text: t.slice(0,300), href: a ? a.getAttribute('href').slice(0,120) : '',
               linktext: a ? (a.innerText||'').trim().slice(0,80) : '',
               w: Math.round(r.width), h: Math.round(r.height) });
    if (out.length >= 40) break;
  }
  return out;
})())`);
console.log(els);
