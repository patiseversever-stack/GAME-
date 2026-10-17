// Görsel bozulma yoklaması (gerçek oyun, kendiliğinden oynama): ekran görüntüsü akışı (her kare, zaman damgalı), sayfa olayları
// (efekt animasyonları, kahraman/damga, rozet konumları), isteğe bağlı LayerTree özeti ve iz (trace). Çıktıyı tiles.py okur.
// Kullanım: node scripts/perf/probe.mjs <url> <çıktıKlasörü> [saniye=120] [W=412] [H=915] [iz=0|1] [gpuTarama=0|1] [kareler=1] [durSeçici]
//   ortam: THROTTLE (CPU yavaşlatma, varsayılan 4), DPR (2.625), NOLT=1 (LayerTree kapalı), REALDSF=1 (gerçek cihaz ölçeği:
//   karolar 2,6× taranır — GPU belleği ölçümü için; CDP öykünmesi yalnız devicePixelRatio bildirir, 1× tarar), CHROME_ARGS
//   (ör. "--force-gpu-mem-available-mb=28": küçük karo bütçesi → eksik karo ve geç çizim hemen görünür).
// Örnek (kısıtlı bütçe, eksik karo yoklaması):
//   NOLT=1 THROTTLE=1 CHROME_ARGS="--force-gpu-mem-available-mb=28" node scripts/perf/probe.mjs \
//     "http://127.0.0.1:4190/?auto=1&game=pisti&mode=1v1&len=tek&seed=3&q=high" /tmp/kh-probe 80 412 915 0 1 1 && python3 scripts/perf/tiles.py /tmp/kh-probe
import {chromium} from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [,, url, outDir, secs = '120', W = '412', H = '915', doTrace = '0', gpuRaster = '0', doFrames = '1', stopSel = ''] = process.argv;
fs.mkdirSync(path.join(outDir, 'frames'), {recursive: true});
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist'];
if (gpuRaster === '1') { args.length = 0; args.push('--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'); }
if (process.env.CHROME_ARGS) args.push(...process.env.CHROME_ARGS.split(' ').filter(Boolean));
console.log('args', args.join(' '));
// REALDSF=1: real device scale factor (raster at 2.625×). CDP DSF emulation (deviceScaleFactor) only reports devicePixelRatio,
// the compositor still rasters at 1× — useless for GPU memory measurements.
const REAL = process.env.REALDSF === '1';
if (REAL) args.push('--force-device-scale-factor=' + (process.env.DPR || 2.625), `--window-size=${W},${H}`);
const b = await chromium.launch({args});
const ctx = REAL ? await b.newContext({viewport: null, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'})
  : await b.newContext({viewport: {width: +W, height: +H}, deviceScaleFactor: +(process.env.DPR || 2.625), isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.addInitScript(() => {
  try {
    localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: true, char: 'dursun', owned: {char: ['dursun', 'cem'], deck: ['yildizli'], table: ['arena'], fx: ['klasik'], frame: ['standart']}, coins: 20000}));
  } catch { /* */ }
  const ev = (window.__ev = []);
  const now = () => performance.timeOrigin + performance.now();
  const cls = el => (el && (el.className?.baseVal ?? el.className) || '').toString();
  const KEY = /\b(ar__ring|ar__rays|ar__tint|ar__glow|ar__burst|ar__bloom|ar__zoom|ar__shake|ar__sweep|kh-hero__band|kh-hero__fig|kh-stamp__in|kh-badge__pop|kh-flash|kh-qflash|kh-night|bl-[a-z_-]+|kh-wipe[a-z_-]*|kh-banner__in|kh-shout__in|c2__gold)\b/;
  const nat = Element.prototype.animate;
  Element.prototype.animate = function (kf, o) {
    const c = cls(this);
    const m = c.match(KEY);
    if (m) ev.push([now(), 'anim', m[1], typeof o === 'number' ? o : o?.duration ?? 0]);
    return nat.call(this, kf, o);
  };
  // trace clock sync
  setInterval(() => {
    const figs = [...document.querySelectorAll('.kh-badge__fig')].map(f => { const b = f.closest('.kh-badge'); const r = (b || f).getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height * 0.42), Math.round(r.width * 0.32)]; }).filter(x => x[2] > 4);
    if (figs.length) ev.push([now(), 'badges', JSON.stringify(figs)]);
  }, 2000);
  setInterval(() => { ev.push([now(), 'sync', String(ev.length)]); try { performance.mark('khsync:' + (ev.length - 1)); console.timeStamp('khsync:' + (ev.length - 1)); } catch {} }, 1000);
  // frame times
  const ft = (window.__ft = []);
  let last = 0;
  const loop = t => { if (last) ft.push([performance.timeOrigin + t, t - last]); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // class watcher for hero/stamp/screens
  const mo = new MutationObserver(list => {
    for (const r of list) {
      const el = r.target;
      const c = cls(el);
      if (/\bkh-hero\b/.test(c)) ev.push([now(), 'hero', c.includes('is-on') ? 'on' : 'off']);
      else if (/\bkh-stamp\b/.test(c) && !/__/.test(c)) ev.push([now(), 'stamp', c.includes('is-on') ? 'on' : 'off']);
      else if (/\bkh-pop\b/.test(c)) ev.push([now(), 'pop', el.textContent]);
    }
  });
  const start = () => mo.observe(document.documentElement, {subtree: true, attributes: true, attributeFilter: ['class']});
  if (document.documentElement) start(); else addEventListener('DOMContentLoaded', start);
});
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: +(process.env.THROTTLE || 4)});

const nodeDesc = new Map();
const describe = async id => {
  if (!id || nodeDesc.has(id)) return;
  nodeDesc.set(id, '…');
  try {
    const d = (await cdp.send('DOM.describeNode', {backendNodeId: id})).node;
    const at = d.attributes || [];
    const c = at[at.indexOf('class') + 1] || '';
    nodeDesc.set(id, `${d.nodeName.toLowerCase()}${c ? '.' + c.split(' ').slice(0, 3).join('.') : ''}`);
  } catch { nodeDesc.set(id, '?'); }
};
const reasons = new Map();
await cdp.send('DOM.enable');
// LayerTree
const layerSnaps = [];
if (!process.env.NOLT) await cdp.send('LayerTree.enable');
let lastLayers = null;
cdp.on('LayerTree.layerTreeDidChange', e => {
  if (!e.layers) return;
  const t = Date.now();
  let area = 0, n = 0, drawn = 0;
  const big = [];
  for (const l of e.layers) {
    n++;
    if (!l.drawsContent) continue;
    drawn++;
    const a = l.width * l.height;
    area += a;
    if (a > 100000) big.push([l.layerId, Math.round(l.width), Math.round(l.height), l.backendNodeId ?? 0, l.invisible ? 1 : 0]);
  }
  big.sort((x, y) => y[1] * y[2] - x[1] * x[2]);
  const all = e.layers.filter(l => l.drawsContent).map(l => [l.layerId, Math.round(l.width), Math.round(l.height), l.backendNodeId ?? 0, l.parentLayerId ?? '', Math.round(l.offsetX), Math.round(l.offsetY), l.paintCount ?? 0, l.transform ? l.transform.map(v => +v.toFixed(3)).join(',') : '']);
  layerSnaps.push({t, n, drawn, area: Math.round(area), big: big.slice(0, 12), all});
  for (const l of all) if (l[1] * l[2] > 20000) { void describe(l[3]); if (!reasons.has(l[0])) { reasons.set(l[0], '…'); cdp.send('LayerTree.compositingReasons', {layerId: l[0]}).then(r => reasons.set(l[0], (r.compositingReasonIds || r.compositingReasons || []).join(',')), () => reasons.set(l[0], '?')); } }
  lastLayers = e.layers;
  for (const l of big.slice(0, 12)) {
    void describe(l[3]);
    if (!reasons.has(l[0])) { reasons.set(l[0], '…'); cdp.send('LayerTree.compositingReasons', {layerId: l[0]}).then(r => reasons.set(l[0], (r.compositingReasonIds || r.compositingReasons || []).join(',')), () => reasons.set(l[0], '?')); }
  }
});

// screencast
let frames = 0;
const frameIdx = [];
if (doFrames === '1') {
  cdp.on('Page.screencastFrame', async f => {
    const name = String(frames++).padStart(5, '0') + '.jpg';
    fs.writeFileSync(path.join(outDir, 'frames', name), Buffer.from(f.data, 'base64'));
    frameIdx.push([f.metadata.timestamp * 1000, name]);
    try { await cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}); } catch { /* */ }
  });
}

// trace
const trace = [];
if (doTrace === '1') {
  cdp.on('Tracing.dataCollected', e => { for (const x of e.value) trace.push(x); });
  await cdp.send('Tracing.start', {transferMode: 'ReportEvents', traceConfig: {recordMode: 'recordAsMuchAsPossible', includedCategories: process.env.TRACECAT ? process.env.TRACECAT.split(',') : [
    'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'gpu', 'blink.image_decode', 'blink.console', 'blink.user_timing'], excludedCategories: ['disabled-by-default-cc.debug', 'viz']}});
}

const t0 = Date.now();
await p.goto(url);
if (doFrames === '1') await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 55, maxWidth: +W, maxHeight: +H, everyNthFrame: 1});
const deadline = t0 + +secs * 1000;
while (Date.now() < deadline) {
  await p.waitForTimeout(500);
  if (stopSel && await p.$(stopSel)) { await p.waitForTimeout(1500); break; }
}
if (doFrames === '1') await cdp.send('Page.stopScreencast');
const cal = await p.evaluate(() => performance.timeOrigin + performance.now()); const calNode = Date.now();
const ev = await p.evaluate(() => window.__ev);
const ft = await p.evaluate(() => window.__ft);
if (doTrace === '1') {
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  fs.writeFileSync(path.join(outDir, 'trace.json'), JSON.stringify({traceEvents: trace}));
}
for (const s of layerSnaps) for (const l of s.big) { l.push(nodeDesc.get(l[3]) || ''); l.push(reasons.get(l[0]) || ''); }
const desc = Object.fromEntries(nodeDesc); const rs = Object.fromEntries(reasons);
fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify({url, W: +W, H: +H, t0, cal, calNode, ev, ft, layerSnaps, frameIdx, errs, desc, rs}));
console.log('frames', frames, 'layerSnaps', layerSnaps.length, 'events', ev.length, 'errs', errs.slice(0, 5));
await b.close();
