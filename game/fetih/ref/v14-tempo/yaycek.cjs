// Yayılma: "YAYILMA · Tur 3 / 7" afişi ve seçim sırası (+il) ekranı, Türkiye haritası 1'e 1 (yeni plan) — sayfa görüntüsü.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'all', length: 'long', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    app.cam.fit(app.boundsOf(app.match.map), { pitch: 0.98, dur: 0.01 });
    for (let i = 0; i < 10; i++) app.frame(1 / 30, false);
    app.ui.update();
    app.render();
    app.ui.banner('YAYILMA', 'Tur 3 / 7', { tone: 'gold' });
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/home/user/work/yay_afis.png' });
  await p.evaluate(() => {
    const app = window.__fl.app;
    const m = app.match;
    const order = m.players.map((q) => ({ p: q, name: q.name, color: q.css }));
    app.ui.ranking(m, order, [8, 4]);
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: '/home/user/work/yay_sira.png' });
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
