// Türkiye geneli yeryüzü taraması: sahipsiz harita (sahip boyası yok, arazinin kendi dokusu), gündüz, yakın çekim.
// node tara.cjs <dist> <etiket> [kimlikler]
const { chromium } = require('playwright');
const [dist, tag, idsArg] = process.argv.slice(2);
const IDS = (idsArg || '34,22,17,35,9,48,7,1,31,27,63,21,65,4,25,61,55,57,37,6,42,70,68,50,38,58,24,44,15,32,33,26').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 600 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const m = app.match;
    for (const i of m.map) m.setOwner(i, -1, 0);
    for (const k of app.castles) k.group.visible = false;
    app.board.showLabels?.(null);
    for (let i = 0; i < 60; i++) app.frame(1 / 30, false);
  });
  for (const id of IDS) {
    const ok = await p.evaluate(async (id) => {
      const app = window.__fl.app;
      const P = app.board.byId.get(id);
      if (!P) return false;
      app.cam.shot(P.x, P.z, { dist: 10, pitch: 0.92, yaw: 0.2, dur: 0.01, arc: 0 });
      for (let i = 0; i < 24; i++) { app.frame(1 / 30, false); if (i % 8 === 0) await new Promise((r) => setTimeout(r, 5)); }
      app.render();
      return true;
    }, id);
    if (ok) await p.screenshot({ path: `/home/user/work/perf3/tara/${tag}_${id}.png` });
  }
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
