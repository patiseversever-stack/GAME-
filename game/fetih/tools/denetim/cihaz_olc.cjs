// Cihaz yükü ölçümü: kademe × işlemci yavaşlatma. node olc.cjs <dist> <kademe 0|1|2> <yavaşlatma 1|4|6>
const { chromium } = require('playwright');
const [dist, tier, rate] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
  const t0 = Date.now();
  await p.goto(`file://${dist}/FetihLigi.html?q=${tier}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 600000 });
  const tReady = Date.now() - t0;
  await p.evaluate(async () => { const app = window.__fl.app; await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); });
  const tScene = Date.now() - t0;
  // kare JS süresi: app.frame sarmalanır
  await p.evaluate(() => { const app = window.__fl.app; const fr = app.frame.bind(app); window.__ft = []; app.frame = (dt) => { const s = performance.now(); const r = fr(dt); window.__ft.push(performance.now() - s); return r; }; });
  const sample = async (ms) => { await p.evaluate(() => (window.__ft = [])); await p.waitForTimeout(ms); return p.evaluate(() => { const a = window.__ft.slice().sort((x, y) => x - y); const q = (f) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * f))] : 0; return { n: a.length, med: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1) }; }); };
  // 1) harita: kamera kaydırma (oyuncu haritayı geziyor)
  await p.evaluate(() => { const app = window.__fl.app; const c = app.cam; window.__pan = setInterval(() => { c.yaw += 0.01; c.yawTo = c.yaw; app._moved = true; }, 16); });
  const pan = await sample(8000);
  await p.evaluate(() => clearInterval(window.__pan));
  // 2) savaş filmi: iki botun saldırısı
  await p.evaluate(() => { const app = window.__fl.app, m = app.match; const a = m.players[1]; const t = m.attackable(a)[0]; const d = m.players[m.owner(t)]; app.cinema.attack(a, d, t, false); });
  const film = await sample(8000);
  const info = await p.evaluate(() => {
    const app = window.__fl.app, r = app.renderer, gl = r.getContext(), i = r.info;
    return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs?.length ?? 0, geos: i.memory.geometries, tex: i.memory.textures, buf: gl.drawingBufferWidth + 'x' + gl.drawingBufferHeight, px: gl.drawingBufferWidth * gl.drawingBufferHeight, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1, tier: app.tier.id, shadow: app.tier.shadowSize };
  });
  console.log(JSON.stringify({ tier: +tier, rate: +rate, readyS: +(tReady / 1000).toFixed(1), sceneS: +(tScene / 1000).toFixed(1), pan, film, ...info }));
  await b.close();
})();
