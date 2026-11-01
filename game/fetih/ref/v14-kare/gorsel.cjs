// Aynı görünümler eski/yeni derlemede (gündüz, gece, kıyı, yakın yapı): kare görüntüleri (karşılaştırma için).
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const views = [['gunduz_kiyi', 7, 20, 0.9, 0.5, false], ['gece_kiyi', 61, 16, 0.8, -0.3, true], ['gunduz_ankara', 6, 18, 0.85, 0.2, false], ['gece_istanbul', 34, 22, 0.85, 0.3, true]];
  for (const [name, id, d, pitch, yaw, night] of views) {
    const url = await p.evaluate(async ([id, d, pitch, yaw, night]) => {
      const app = window.__fl.app;
      if (!app.match) await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', length: 'long', seed: 7, bot: 'er' }, seconds: 0.2 });
      app.stop();
      app.time = 100; // aynı canlandırma anı
      const P = app.board.byId.get(id);
      app.board.night?.(night, night ? [P.index] : null, { hold: 0 });
      app.cam.shot(P.x, P.z, { dist: d, pitch, yaw, dur: 0.01, arc: 0 });
      for (let i = 0; i < 60; i++) app.frame(1 / 30, false);
      app.time = 100;
      app.G.uTime.value = 100;
      app.render();
      return app.renderer.domElement.toDataURL('image/png');
    }, [id, d, pitch, yaw, night]);
    require('fs').writeFileSync(`/home/user/work/perf2/g_${tag}_${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
})();
