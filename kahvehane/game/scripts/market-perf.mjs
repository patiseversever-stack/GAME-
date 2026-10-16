// Market ölçümü (gerçek uygulama, üretim derlemesi): ilk açılış uzun görevleri, BOŞTA (≥5 sn dokunuşsuz) kare/boyama,
// ürün penceresi açılış kare süreleri, 20 sekme geçişinde DOM / JS yığını / blob adresi büyümesi.
// Kullanım: node scripts/market-perf.mjs <url> [cpuYavaşlatma=4]   (ör. http://127.0.0.1:4201/?q=high)
import {chromium, devices} from 'playwright-core';

const [,, url = 'http://127.0.0.1:4201/?q=high', slow = '4'] = process.argv;
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc']});
const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: 412, height: 839}});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.addInitScript(() => {
  localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: true, char: 'dursun', owned: {char: ['dursun', 'cem'], deck: ['yildizli'], table: ['arena'], fx: ['klasik'], frame: ['standart']}, coins: 20000}));
  // uzun görevler + kare aralıkları + canlı blob adresleri
  window.__lt = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({type: 'longtask', buffered: true}); } catch { /* */ }
  window.__blobs = 0;
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = o => { window.__blobs++; return c(o); };
  URL.revokeObjectURL = u => { window.__blobs--; return r(u); };
  window.__jk = {run: false, t: [], last: 0};
  const loop = t => { const j = window.__jk; if (j.run) { if (j.last) j.t.push(t - j.last); j.last = t; } else j.last = 0; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: +slow});
await cdp.send('Performance.enable');

const click = async (sel, wait = 800) => { try { await p.click(sel, {timeout: 6000, force: true}); } catch { console.log('  (tıklanamadı ' + sel + ')'); } await p.waitForTimeout(wait); };
async function frames(ms) {
  const ev = [];
  const on = e => ev.push(...e.value);
  cdp.on('Tracing.dataCollected', on);
  await cdp.send('Tracing.start', {transferMode: 'ReportEvents', traceConfig: {recordMode: 'recordContinuously', includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'viz']}});
  await p.waitForTimeout(ms);
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  cdp.off('Tracing.dataCollected', on);
  const n = k => ev.filter(e => e.name === k && (e.ph === 'X' || e.ph === 'I' || e.ph === 'B')).length / (ms / 1000);
  return {draw: n('DrawFrame'), paint: n('Paint'), style: n('UpdateLayoutTree'), layout: n('Layout')};
}
async function metrics() {
  await cdp.send('HeapProfiler.collectGarbage');
  await p.waitForTimeout(300);
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const blobs = await p.evaluate(() => window.__blobs);
  return {nodes: m.Nodes, heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), listeners: m.JSEventListeners, blobs};
}
const jank = async (name, fn) => {
  await p.evaluate(() => { window.__jk.t = []; window.__jk.run = true; });
  await fn();
  const t = await p.evaluate(() => { window.__jk.run = false; return window.__jk.t; });
  const s = [...t].sort((a, c) => a - c), n = s.length;
  const pct = k => s[Math.min(n - 1, Math.floor(n * k))];
  console.log(`${pct(0.95) > 33 ? '⚠' : '✓'} ${name.padEnd(24)} ${n} kare | p95 ${pct(0.95).toFixed(0)} ms | en kötü ${s[n - 1].toFixed(0)} ms | >50 ms: ${t.filter(x => x > 50).length}`);
};
const longtasks = async (since) => (await p.evaluate(s => window.__lt.filter(x => x[0] >= s), since)).map(x => x[1]);

await p.goto(url + (url.includes('?') ? '&' : '?') + 'skipintro=1');
await p.waitForSelector('.kh-nav', {timeout: 60000});
await p.waitForTimeout(4000);

// 1) ilk market açılışı: uzun görevler
const t0 = await p.evaluate(() => performance.now());
await click('.kh-nav [data-tab=shop]', 3000);
const lt = await longtasks(t0);
console.log(`ilk market açılışı: uzun görev ${lt.length} adet | en uzun ${Math.max(0, ...lt)} ms | toplam ${lt.reduce((a, c) => a + c, 0)} ms`);

// 2) boşta: her alt sekmede 6.5 sn dokunuşsuz bekle, sonra 3 sn ölç
//    (ilk ziyaret: sekme açılışındaki uzun görevler de yazılır — eski sürümde deste önizlemesi burada saniyelerce donduruyordu)
for (const t of ['featured', 'set', 'deck', 'table', 'fx', 'frame', 'char']) {
  const s0 = await p.evaluate(() => performance.now());
  await click(`.kh-stab[data-t=${t}]`, 6500);
  const l = await longtasks(s0);
  const f = await frames(3000);
  console.log(`${f.draw > 3 ? '⚠' : '✓'} boşta ${t.padEnd(9)} kare/sn ${f.draw.toFixed(1).padStart(5)} | boyama/sn ${f.paint.toFixed(1).padStart(5)} | stil/sn ${f.style.toFixed(1).padStart(5)} | düzen/sn ${f.layout.toFixed(1)} | açılış uzun görev: ${l.length ? `${l.length} adet, en uzun ${Math.max(...l)} ms, toplam ${l.reduce((a, c) => a + c, 0)} ms` : 'yok'}`);
}
// görünürken (ilk 5 sn): kare/sn — parıltı tek seferlik olduğundan düşük kalmalı
await click('.kh-stab[data-t=deck]', 600);
const vis = await frames(3500);
console.log(`  görünürken (deste, ilk 4 sn): kare/sn ${vis.draw.toFixed(1)} | boyama/sn ${vis.paint.toFixed(1)}`);

// 3) ürün penceresi açılışı (her tür)
for (const k of ['deck', 'table', 'frame', 'fx']) {
  await click(`.kh-stab[data-t=${k}]`, 900);
  await jank(`ürün-aç ${k}`, async () => { await click('.kh-shop__body .kh-item:not([hidden] .kh-item)', 1400); await click('.kh-sheet__x', 700); });
}
await jank('dene-aç (deste)', async () => {
  await click('.kh-stab[data-t=deck]', 600);
  await click('.kh-shop__body .kh-item:not([hidden] .kh-item)', 1200);
  await click('[data-act=try]', 1600);
  await click('.kh-try__x', 600);
  await click('.kh-sheet__x', 600);
});

// 4) sızıntı: 20 sekme geçişi
const m0 = await metrics();
const subs = ['featured', 'set', 'deck', 'table', 'fx', 'frame', 'char'];
for (let i = 0; i < 20; i++) {
  await click(`.kh-stab[data-t=${subs[i % subs.length]}]`, 250);
  if (i % 5 === 4) { await click('.kh-nav [data-tab=profile]', 350); await click('.kh-nav [data-tab=shop]', 350); }
}
await p.waitForTimeout(1500);
const m1 = await metrics();
console.log(`20 geçiş: DOM ${m0.nodes} → ${m1.nodes} | JS yığını ${m0.heapMB} → ${m1.heapMB} MB | dinleyici ${m0.listeners} → ${m1.listeners} | blob ${m0.blobs} → ${m1.blobs}`);
console.log(errs.length ? 'HATA: ' + errs.slice(0, 3).join(' | ') : 'konsol temiz');
await b.close();
