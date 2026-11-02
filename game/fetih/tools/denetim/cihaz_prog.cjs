// Geç derlenen programlar ve 60 ms üstü kareler (uzak yapı sürümü yükleme süresi dahil). node cihaz_prog.cjs <dist> <kademe> <yavaşlatma>
// Oyun sırasında geç derlenen gölgelendirici programları: hangi kare, hangi malzeme, ne kadar süren kare.
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
  await p.evaluate(() => {
    const app = window.__fl.app; const r = app.renderer; window.__log = []; let n = r.info.programs.length; const t0 = performance.now();
    const lm = app.props.landmarks; const mf = lm._mountFar.bind(lm); lm._mountFar = (l) => { const s = performance.now(); return mf(l).then(() => window.__log.push(`mountFar bitti ${(performance.now()-s).toFixed(0)}ms @${((s-t0)/1000).toFixed(1)}s`)); }; const rr = app.render.bind(app); app.render = (...a) => { const s = performance.now(); const o = rr(...a); const d = performance.now()-s; if (d > 60) window.__log.push(`  render ${d.toFixed(0)}ms`); return o; }; const fr = app.frame.bind(app);
    app.frame = (dt) => { const s = performance.now(); const out = fr(dt); const d = performance.now() - s; const P = r.info.programs; if (P.length > n) { for (const pr of P.slice(n)) window.__log.push(`${((s - t0) / 1000).toFixed(1)}s kare ${d.toFixed(0)}ms yeni program: ${pr.name} ${String(pr.cacheKey).slice(0, 60).replace(/\n/g, ' ')}`); n = P.length; } else if (d > 60) window.__log.push(`${((s - t0) / 1000).toFixed(1)}s uzun kare ${d.toFixed(0)}ms`); return out; };
  });
  await p.evaluate(async () => { const app = window.__fl.app; await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); });
  await p.waitForTimeout(6000);
  await p.evaluate(() => { const app = window.__fl.app, m = app.match; const a = m.players[1]; const t = m.attackable(a)[0]; const d = m.players[m.owner(t)]; app.cinema.attack(a, d, t, false).then(() => app.cinema.conquer(a, t)); });
  await p.waitForTimeout(45000);
  console.log((await p.evaluate(() => window.__log)).join('\n'));
  await b.close();
})();
