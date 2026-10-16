// Performans ölçümü: ekran başına BOŞTA kare üretimi, boyama/düzen sayısı, çalışan animasyonlar ve GPU katman yükü.
// Kullanım: node scripts/perf.mjs <url> [cpuYavaşlatma=4] [ekranlar=hepsi]   (ör. http://127.0.0.1:4190/ 4 home,quests)
// İdeal (boşta): DrawFrame/sn ≈ 0, Paint/sn ≈ 0, Layout/sn ≈ 0. Sürekli animasyon varsa DrawFrame ≈ 60.
import {chromium, devices} from 'playwright-core';

const [,, url = 'http://127.0.0.1:4190/', slow = '4', only = ''] = process.argv;
const want = only ? new Set(only.split(',')) : null;
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: 412, height: 839}});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => localStorage.getItem('kh.profile3') || localStorage.setItem('kh.profile3', JSON.stringify({v: 3, onboarded: false})));
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: +slow});
await cdp.send('DOM.enable');

async function trace(ms) {
  const events = [];
  cdp.on('Tracing.dataCollected', e => events.push(...e.value));
  await cdp.send('Tracing.start', {transferMode: 'ReportEvents', traceConfig: {recordMode: 'recordContinuously', includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'viz', 'benchmark']}});
  await p.waitForTimeout(ms);
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  cdp.removeAllListeners('Tracing.dataCollected');
  const n = {};
  const dur = {};
  // en çok yeniden boyanan öğeler ve GPU'ya alınamayan animasyonlar
  const paints = new Map();
  const failed = {};
  for (const e of events) {
    if (e.name === 'Paint' && e.args?.data?.nodeId) {
      const k = e.args.data.nodeId;
      paints.set(k, (paints.get(k) || 0) + 1);
    }
    if (e.name === 'Animation' && e.args?.data?.compositeFailed) {
      const k = e.args.data.compositeFailed;
      failed[k] = (failed[k] || 0) + 1;
    }
  }
  const topPaint = [];
  for (const [id, c] of [...paints.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    try {
      const d = (await cdp.send('DOM.describeNode', {backendNodeId: id})).node;
      const cls = (d.attributes || []).find((x, i, arr) => arr[i - 1] === 'class') || '';
      topPaint.push(`${d.nodeName.toLowerCase()}.${cls.split(' ').slice(0, 2).join('.')}×${c}`);
    } catch { topPaint.push('#' + id + '×' + c); }
  }
  for (const e of events) {
    if (e.ph !== 'X' && e.ph !== 'I' && e.ph !== 'B') continue;
    n[e.name] = (n[e.name] || 0) + 1;
    if (e.dur) dur[e.name] = (dur[e.name] || 0) + e.dur / 1000;
  }
  return {n, dur, topPaint, failed};
}

async function inventory() {
  return p.evaluate(() => {
    const anims = document.getAnimations().filter(a => a.playState === 'running');
    const inf = {};
    let finite = 0;
    for (const a of anims) {
      const el = a.effect?.target;
      if (a.effect.getTiming().iterations === Infinity) {
        const c = (el?.className?.baseVal ?? el?.className ?? el?.tagName ?? '').toString().split(' ').slice(0, 2).join('.').slice(0, 30);
        const props = new Set();
        try { for (const k of a.effect.getKeyframes()) for (const q of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(q)) props.add(q); } catch { /* */ }
        const r = el.getBoundingClientRect();
        inf[c + ' {' + [...props].join(',') + '} ' + Math.round(r.width) + 'x' + Math.round(r.height)] = 1;
      } else finite++;
    }
    // CSS animation'lar da getAnimations'ta görünür; yine de sonsuz CSS döngülerini ayrıca say
    const dpr = devicePixelRatio, layers = [];
    const anim = new Set(document.getAnimations().map(a => a.effect?.target));
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const hit = cs.willChange !== 'auto' || anim.has(el) || cs.filter !== 'none' || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') || cs.backdropFilter !== 'none';
      if (!hit) continue;
      const r = el.getBoundingClientRect();
      const mpx = (r.width * dpr) * (r.height * dpr) / 1e6;
      if (mpx < 0.3) continue;
      layers.push([+mpx.toFixed(1), (el.className?.baseVal ?? el.className ?? el.tagName).toString().split(' ').slice(0, 2).join('.').slice(0, 28), (cs.filter !== 'none' ? 'filter ' : '') + (cs.webkitMaskImage && cs.webkitMaskImage !== 'none' ? 'mask ' : '') + (anim.has(el) ? 'anim' : '')]);
    }
    layers.sort((a, c) => c[0] - a[0]);
    return {infinite: Object.keys(inf), finite, layerMpx: +layers.reduce((s, x) => s + x[0], 0).toFixed(0), topLayers: layers.slice(0, 6)};
  });
}

async function report(name, ms = 3000) {
  if (want && !want.has(name)) return;
  const inv = await inventory();
  const t = await trace(ms);
  const s = ms / 1000;
  const draw = (t.n.DrawFrame || 0) / s, paint = (t.n.Paint || 0) / s, layout = (t.n.Layout || 0) / s, recalc = (t.n.UpdateLayoutTree || 0) / s;
  const raster = (t.dur.RasterTask || 0) / s, script = ((t.dur.FunctionCall || 0) + (t.dur.EvaluateScript || 0)) / s;
  const flag = draw > 8 ? '⚠' : '✓';
  console.log(`${flag} ${name.padEnd(14)} kare/sn ${draw.toFixed(0).padStart(3)} | boyama/sn ${paint.toFixed(0).padStart(3)} | düzen/sn ${layout.toFixed(0).padStart(3)} | stil/sn ${recalc.toFixed(0).padStart(3)} | raster ms/sn ${raster.toFixed(0).padStart(4)} | js ms/sn ${script.toFixed(0).padStart(4)} | sonsuz anim ${inv.infinite.length} | katman ≈ ${inv.layerMpx} Mpx`);
  if (t.topPaint.length) console.log('     boyananlar:', t.topPaint.join(' · '));
  if (Object.keys(t.failed).length) console.log('     GPU\'ya alınamayan animasyon (bitmask×adet):', JSON.stringify(t.failed));
  if (inv.infinite.length) console.log('     sonsuz:', inv.infinite.join(' · '));
  if (inv.topLayers.length && process.env.LAYERS) console.log('     katmanlar:', JSON.stringify(inv.topLayers));
}

const click = async (sel, wait = 1500) => { try { await p.click(sel, {timeout: 8000, force: true}); } catch { console.log('  (tıklanamadı: ' + sel + ')'); } await p.waitForTimeout(wait); };

await p.goto(url);
await p.waitForSelector('.kh-ob, .kh-hp, .kh-splash', {timeout: 60000});
await p.waitForTimeout(6000);
await report('onb-hikaye');
await click('[data-act=skip]', 3500);
await report('onb-galeri');
await click('[data-act=take]', 4500);
await report('onb-secildi');
await click('.kh-gal__next', 3000);
await report('onb-ad');
await click('[data-act=ok]', 3500);
await click('[data-act=go]', 4500);
await report('home');
for (const tab of ['shop', 'profile', 'quests']) {
  await click(`.kh-nav [data-tab=${tab}]`, 2500);
  await report(tab);
}
await click('.kh-nav [data-tab=home]', 2000);
await click('[data-act=play]', 9000);
await report('oyun-bosta', 3000);
// el oynat
for (let i = 0; i < 6; i++) {
  const box = await p.evaluate(() => { const els = [...document.querySelectorAll('.c2.is-hand')]; if (!els.length) return null; const r = els[0].getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  if (box) { await p.mouse.click(box.x, box.y); if (i === 3) await report('oyun-atis', 2500); else await p.waitForTimeout(2200); }
  else await p.waitForTimeout(1500);
}
console.log(errs.length ? 'HATA: ' + errs.slice(0, 3).join(' | ') : 'konsol temiz');
await b.close();
