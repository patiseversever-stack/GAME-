// Kare profili: alt sistem başına süre (ms/kare, medyan), gölge geçişi ve ana geçiş üçgen/çağrı, piksel sayısı.
// Senaryolar: soru kartı açık (düello), savaş filmi ortası. node prof.cjs <etiket> [q]
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
const q = process.argv[3] || '1';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.6, isMobile: !!process.env.MOB, hasTouch: !!process.env.MOB, userAgent: process.env.MOB ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' : undefined });
  const p = await ctx.newPage();
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/FetihLigi.html?q=${q}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const res = await p.evaluate(async () => {
    const app = window.__fl.app;
    app.stop();
    const T = {};
    const wrap = (obj, name, key) => {
      const f = obj[name].bind(obj);
      obj[name] = (...a) => {
        const t = performance.now();
        const r = f(...a);
        T[key] = (T[key] || 0) + performance.now() - t;
        return r;
      };
    };
    wrap(app.board, 'update', 'board');
    wrap(app.fx, 'update', 'fx');
    wrap(app.nightLights, 'update', 'nightLights');
    wrap(app.cam, 'update', 'cam');
    wrap(app.weather, 'update', 'weather');
    wrap(app.ui, 'update', 'ui');
    wrap(app.shadow, 'render', 'shadowPass');
    if (app.props.landmarks.lod) wrap(app.props.landmarks.lod, 'update', 'lod');
    const gl = app.renderer.getContext();
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const run = async (n, dt = 1 / 60) => {
      for (const k in T) delete T[k];
      const tot = [];
      let shadowRuns = 0;
      const sr = app.shadow.render.bind(app.shadow);
      app.shadow.render = (r) => { shadowRuns++; return sr(r); };
      for (let i = 0; i < n; i++) {
        const t = performance.now();
        app.frame(dt, true);
        sync();
        tot.push(performance.now() - t);
        if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
      }
      app.shadow.render = sr;
      tot.sort((a, b) => a - b);
      const out = { frameMs: +tot[n >> 1].toFixed(1), shadowPassesPerFrame: +(shadowRuns / n).toFixed(2) };
      for (const k in T) out[k] = +(T[k] / n).toFixed(2);
      const info = app.renderer.info;
      out.mainTris = info.render.triangles;
      out.mainCalls = info.render.calls;
      out.shadowTris = app.shadow.tris;
      out.pixels = app.G.uRes.value.x * app.G.uRes.value.y;
      out.post = !!(app.post && app.post.enabled && app.post.uniforms && app.post.uniforms.uTilt.value.w >= 0.5);
      app.gov.menu = !!app.lowFps || (!!app.calmQ && app.info.mobile && !app._touching);
      out.fpsTarget = app.gov.targetFps;
      out.mobile = app.info.mobile;
      return out;
    };
    const R = {};
    // 1) soru kartı açık (düello): kart açıldıktan sonra 60 kare
    await app.debugScene({ show: 'question', type: 'choice', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.5 });
    for (let i = 0; i < 40; i++) app.frame(1 / 30, false);
    R.soru = await run(60);
    // 2) harita boşta (başlık/menü): genel görünüm
    app.ui.$.q?.classList?.remove('on');
    app.cam.fit(app.boundsOf(app.board.provinces.map((p) => p.index)), { pitch: 0.98, dur: 0.01 });
    for (let i = 0; i < 30; i++) app.frame(1 / 30, false);
    R.harita = await run(60);
    return { R, tier: app.tier.id, mobile: app.info.mobile };
  });
  fs.writeFileSync(`/home/user/work/prof_${tag}.json`, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
  await b.close();
})();
