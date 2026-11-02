// Uzun karenin içi: yalnız o karenin örneklerinden öz süre dağılımı. node profk.cjs <dist> <kademe> <yavaşlatma>
const { chromium } = require('playwright');
const [dist, tier, rate] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
  await p.goto(`file://${dist}/FetihLigi.html?q=${tier}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 600000 });
  await p.evaluate(async () => { const app = window.__fl.app; await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const app = window.__fl.app; const fr = app.frame.bind(app); window.__long = []; app.frame = (dt) => { const s = performance.now(); const r = fr(dt); const d = performance.now() - s; if (d > 40) window.__long.push([s, d]); return r; }; });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  const t0 = await p.evaluate(() => performance.now());
  await cdp.send('Profiler.start');
  await p.evaluate(() => { const app = window.__fl.app, m = app.match; const a = m.players[1]; const t = m.attackable(a)[0]; const d = m.players[m.owner(t)]; window.__atk = performance.now(); app.cinema.attack(a, d, t, false); });
  await p.waitForTimeout(5000);
  const { profile } = await cdp.send('Profiler.stop');
  const long = await p.evaluate(() => window.__long);
  const atk = await p.evaluate(() => window.__atk);
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const par = new Map(); for (const n of profile.nodes) for (const c of n.children || []) par.set(c, n.id);
  for (const [s, d] of long) {
    const a = (s - t0) * 1000, e = a + d * 1000; let t = 0; const dt = {}; const ch = {};
    for (let i = 0; i < profile.samples.length; i++) { t += profile.timeDeltas[i]; if (t < a || t > e) continue; const n = byId.get(profile.samples[i]); const k = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber}`; dt[k] = (dt[k] || 0) + profile.timeDeltas[i];
      let id = n.id, chain = []; for (let q = 0; q < 7 && id; q++) { const x = byId.get(id); chain.unshift(x.callFrame.functionName || 'anon'); id = par.get(id); } const ck = chain.slice(0, 7).join('>'); ch[ck] = (ch[ck] || 0) + profile.timeDeltas[i]; }
    console.log(`\nkare ${d.toFixed(0)}ms, saldırıdan ${(s - atk).toFixed(0)}ms sonra`);
    console.log(Object.entries(dt).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k, v]) => `  ${(v / 1000).toFixed(1)}ms ${k}`).join('\n'));
    console.log(Object.entries(ch).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `  ${(v / 1000).toFixed(1)}ms ${k}`).join('\n'));
  }
  await b.close();
})();
