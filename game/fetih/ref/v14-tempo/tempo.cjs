// Saldırı filmi temposu: film zamanına göre kareler (sayfa görüntüsü: altyazı, etiketler, oklar dahil).
// Film saati kare başına sabit adımla ilerletilir (yazılımsal GPU yavaş); beat'ler tempo ile uzatılıp elle geçilir.
// node tempo.cjs <etiket> [dist klasörü]
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
const dist = process.argv[3] || '/home/user/GAME-/game/fetih/dist';
const AT = (process.env.AT || '0.4,1.4,2.6,4.2,6.4').split(',').map(Number); // film saniyeleri
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const m = app.match;
    const at = m.players[1];
    const opts = m.attackable(at).filter((i) => m.players[m.owner(i)] && m.players[m.owner(i)].capital !== i);
    window.__att = { p: at.i, t: opts[0], d: m.owner(opts[0]) };
    app.cam.fit(app.boundsOf(m.map), { pitch: 0.98, dur: 0.01 });
    for (let i = 0; i < 20; i++) app.frame(1 / 30, false);
    app.cinema.tempo = 60; // beat'ler uzar; geçişi biz yaparız
    const P = m.players;
    window.__done = false;
    app.cinema.attack(P[at.i], P[window.__att.d], window.__att.t, false).then(() => (window.__done = true));
  });
  let t = 0;
  let declSkipped = false;
  const out = [];
  for (const T of AT) {
    while (t < T - 1e-6) {
      await p.evaluate(() => window.__fl.app.frame(1 / 30, false));
      t += 1 / 30;
      // yeni sürümde ilan anı 1,5 sn: süresi dolunca elle geç (eski sürümde ilan yok; ilk beat filmin kendisi)
      if (!declSkipped && t >= 1.8 && tag.startsWith('yeni')) {
        declSkipped = true;
        await p.evaluate(() => window.__fl.app.cinema._skip?.());
      }
    }
    await p.evaluate(() => { const a = window.__fl.app; a.ui.update(); a.render(); });
    const f = `/home/user/work/tempo_${tag}_${T.toFixed(1)}.png`;
    await p.screenshot({ path: f });
    const info = await p.evaluate(() => ({ cap: document.querySelector('.fl-prompt.on')?.innerText?.replace(/\s+/g, ' ') || '', tags: document.querySelectorAll('.fl-tag, .fl-tg, .fl-label.tag').length, dist: +window.__fl.app.cam.dist.toFixed(1) }));
    out.push({ T, ...info });
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
