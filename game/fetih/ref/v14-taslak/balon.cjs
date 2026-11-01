// Kapadokya balonları yakından: harita maketi (uzak) ve kahraman model (yakın) — sepet görünüyor mu.
const { chromium } = require('playwright');
(async () => {
  const [dist, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${dist}/FetihLigi.html?q=2&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  for (const [tag, d, pitch] of [['yakin', 4.2, 0.32], ['orta', 9, 0.55]]) {
    await p.evaluate(async ([d, pitch]) => {
      const app = window.__fl.app;
      if (!app.match) await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
      app.stop();
      const s = app.props.landmarks.sites.find((x) => x.kind === 'peri');
      app.cam.shot(s.x + 0.2, s.z, { y: s.y + 1.4 * s.s, dist: d, pitch, yaw: 0.6, dur: 0.01, arc: 0 });
      for (let i = 0; i < 90; i++) {
        app.frame(1 / 30, false);
        if (i % 10 === 0) await new Promise((r) => setTimeout(r, 60)); // kahraman işçisi kurulsun
      }
      app.render();
    }, [d, pitch]);
    await p.screenshot({ path: `/home/user/work/balon_${out}_${tag}.png`, timeout: 120000 });
  }
  await b.close();
})();
