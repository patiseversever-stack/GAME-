// Blöf performans ölçümü (dev/blof.html; sunucu: npx vite --config dev/vite-game.config.ts --port 5261 --host 127.0.0.1).
// Kullanım: node scripts/blof-perf.mjs [taban=http://127.0.0.1:5261] [mod=1v1]
//  1) boşta: masa sahnesi, sakin moda geçince 3 sn iz → DrawFrame/Paint/Layout sayısı (ideal ≈ 0/sn)
//  2) uzun görevler (1× CPU): gerçek oyun (otomatik) ~45 sn boyunca >50 ms görevler
//  3) takılma (4× CPU): blöf anı (çağrı → açılış → damga → yığın uçar) ve oyun sırasında atışlar — kare aralığı p95
import {chromium, devices} from 'playwright-core';

const [, , base = 'http://127.0.0.1:5261', mode = '1v1'] = process.argv;
const b = await chromium.launch({executablePath: process.env.CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const errs = [];

async function page(slow = 1) {
  const ctx = await b.newContext({...devices['Pixel 7'], viewport: {width: 412, height: 839}});
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__jk = {run: false, t: [], last: 0, long: []};
    const loop = t => {
      const j = window.__jk;
      if (j.run) {
        if (j.last) j.t.push(t - j.last);
        j.last = t;
        requestAnimationFrame(loop);
      } else j.last = 0;
    };
    window.__jkStart = () => {
      window.__jk.t = [];
      window.__jk.run = true;
      requestAnimationFrame(loop);
    };
    try {
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) window.__jk.long.push(e.duration);
      }).observe({type: 'longtask', buffered: false});
    } catch {
      /* desteklenmiyor */
    }
  });
  const cdp = await ctx.newCDPSession(p);
  if (slow > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: slow});
  return {ctx, p, cdp};
}

async function trace(cdp, p, ms) {
  const events = [];
  cdp.on('Tracing.dataCollected', e => events.push(...e.value));
  await cdp.send('Tracing.start', {transferMode: 'ReportEvents', traceConfig: {recordMode: 'recordContinuously', includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'viz']}});
  await p.waitForTimeout(ms);
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  const n = {};
  for (const e of events) if (e.ph === 'X' || e.ph === 'I' || e.ph === 'B') n[e.name] = (n[e.name] || 0) + 1;
  return n;
}

const stats = (name, t) => {
  if (!t.length) return console.log(name.padEnd(30), '(ölçüm yok)');
  const s = [...t].sort((a, c) => a - c), n = s.length, sum = t.reduce((x, y) => x + y, 0);
  const pct = k => s[Math.min(n - 1, Math.floor(n * k))];
  const bad = t.filter(x => x > 50).length;
  console.log(`${pct(0.95) > 33 ? '⚠' : '✓'} ${name.padEnd(30)} ${String(n).padStart(4)} kare / ${(sum / 1000).toFixed(1)} sn | ort ${(sum / n).toFixed(1)} ms | p95 ${pct(0.95).toFixed(0)} ms | en kötü ${s[n - 1].toFixed(0)} ms | >50 ms: ${bad}`);
};

// 1) boşta
{
  const {ctx, p, cdp} = await page(1);
  await p.goto(`${base}/dev/blof.html?scene=table&mode=${mode}&pile=9&out=6&rank=7&idle=800`);
  await p.waitForFunction('window.__b?.ready', null, {timeout: 60000});
  await p.waitForTimeout(3500);
  const n = await trace(cdp, p, 3000);
  const inf = await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).map(a => String(a.effect?.target?.className?.baseVal ?? a.effect?.target?.className).slice(0, 40)));
  console.log(`boşta (masa, sıra bende) : DrawFrame ${((n.DrawFrame || 0) / 3).toFixed(1)}/sn · Paint ${((n.Paint || 0) / 3).toFixed(1)}/sn · Layout ${((n.Layout || 0) / 3).toFixed(1)}/sn · sonsuz animasyon: ${inf.join(', ') || 'yok'}`);
  await ctx.close();
}
// 1b) boşta, sıra kimsede değil (tur ışığı yok)
{
  const {ctx, p, cdp} = await page(1);
  await p.goto(`${base}/dev/blof.html?scene=table&mode=${mode}&pile=9&out=6&rank=7&idle=800`);
  await p.waitForFunction('window.__b?.ready', null, {timeout: 60000});
  await p.evaluate(() => window.__b.hud.setTurn(-1));
  await p.waitForTimeout(3500);
  const n = await trace(cdp, p, 3000);
  console.log(`boşta (masa, bekleme)    : DrawFrame ${((n.DrawFrame || 0) / 3).toFixed(1)}/sn · Paint ${((n.Paint || 0) / 3).toFixed(1)}/sn · Layout ${((n.Layout || 0) / 3).toFixed(1)}/sn`);
  await ctx.close();
}
// 2) uzun görevler, 1× (gerçek oyun, otomatik)
{
  const {ctx, p} = await page(1);
  await p.goto(`${base}/dev/blof.html?auto=1&mode=${mode}&seed=7`);
  await p.waitForFunction('window.__b?.ready', null, {timeout: 60000});
  await p.evaluate(() => (window.__jk.long = []));
  await p.waitForTimeout(45000);
  const long = await p.evaluate(() => window.__jk.long);
  console.log(`uzun görev (1×, 45 sn oyun): ${long.length} adet${long.length ? ' · en uzun ' + Math.max(...long).toFixed(0) + ' ms · ' + long.map(x => x.toFixed(0)).join(',') : ''}`);
  await ctx.close();
}
// 3) takılma, 4× CPU: blöf anı (sahne) ve gerçek oyun atışları
for (const [lie, label] of [['1', 'blöf anı (yalan)'], ['0', 'blöf anı (doğru)']]) {
  const {ctx, p} = await page(4);
  await p.goto(`${base}/dev/blof.html?scene=reveal&mode=${mode}&pile=9&rank=7&lie=${lie}`);
  await p.waitForFunction("window.__b?.step === 'call'", null, {timeout: 120000, polling: 20});
  await p.evaluate(() => window.__jkStart());
  await p.waitForFunction("window.__b?.step === 'done'", null, {timeout: 60000, polling: 50});
  const t = await p.evaluate(() => ((window.__jk.run = false), window.__jk.t));
  stats(label + ' 4×', t);
  await ctx.close();
}
{
  const {ctx, p} = await page(4);
  await p.goto(`${base}/dev/blof.html?auto=1&mode=${mode}&seed=7`);
  await p.waitForFunction('window.__b?.ready', null, {timeout: 120000});
  await p.waitForTimeout(9000); // karıştırma + dağıtım
  await p.evaluate(() => window.__jkStart());
  await p.waitForTimeout(30000);
  const t = await p.evaluate(() => ((window.__jk.run = false), window.__jk.t));
  stats('oyun (atış/pas/pencere) 4×', t);
  await ctx.close();
}
{
  const {ctx, p} = await page(4);
  await p.goto(`${base}/dev/blof.html?auto=1&mode=${mode}&seed=7`);
  await p.waitForFunction('window.__b?.ready', null, {timeout: 120000});
  await p.evaluate(() => window.__jkStart());
  await p.waitForTimeout(9000);
  const t = await p.evaluate(() => ((window.__jk.run = false), window.__jk.t));
  stats('karıştırma + dağıtım 4×', t);
  await ctx.close();
}
console.log(errs.length ? 'HATA: ' + errs.slice(0, 3).join(' | ') : 'konsol temiz');
await b.close();
