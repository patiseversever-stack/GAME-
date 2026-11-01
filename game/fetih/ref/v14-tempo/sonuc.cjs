// Sonuç anları: fetih / savunma / kule / elenme yazısı (film saati elle; sayfa görüntüsü).
const { chromium } = require('playwright');
const kinds = (process.argv[2] || 'conquer,defend,tower').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  for (const kind of kinds) {
    await p.evaluate(async (kind) => {
      const app = window.__fl.app;
      await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
      app.stop();
      const m = app.match;
      const at = m.players[1];
      const siege = kind === 'tower';
      const opts = m.attackable(at).filter((i) => m.players[m.owner(i)] && (m.players[m.owner(i)].capital === i) === siege);
      const t = opts[0];
      const d = m.players[m.owner(t)];
      const cin = app.cinema;
      cin.tempo = 60;
      const film = cin.attack(at, d, t, siege);
      for (let i = 0; i < 30; i++) app.frame(1 / 30, false);
      cin._skip?.(); // ilan
      await new Promise((r) => setTimeout(r, 50)); // film devamı (mikro görev) kurulsun
      for (let i = 0; i < 40; i++) app.frame(1 / 30, false);
      cin._skip?.(); // film
      await film;
      for (let i = 0; i < 20; i++) app.frame(1 / 30, false);
      if (kind === 'conquer') { m.setOwner(t, at.i, 400, true); window.__r = cin.conquer(at, t); }
      else if (kind === 'defend') window.__r = cin.defend(d, t);
      else { const left = app.castles[d.i].hit(); window.__r = cin.towerDown(at, d, t, left); }
      await new Promise((r) => setTimeout(r, 50));
      for (let i = 0; i < 45; i++) app.frame(1 / 30, false);
      app.ui.update();
      app.render();
    }, kind);
    await p.screenshot({ path: `/home/user/work/sonuc_${kind}.png` });
    const cap = await p.evaluate(() => document.querySelector('.fl-prompt.on')?.innerText?.replace(/\s+/g, ' '));
    console.log(kind, '→', cap);
    await p.evaluate(() => { window.__fl.app.cinema._skip?.(); window.__fl.app.cinema.tempo = 1; });
  }
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
