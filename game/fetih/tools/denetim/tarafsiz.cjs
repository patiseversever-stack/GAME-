// Tüm Türkiye: tarafsız iller ve tarafsız ile saldırı. node tr.cjs <dist> <etiket>
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(async (tag) => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'all', length: 'long', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.start?.();
    { const fr = app.frame.bind(app); let last = performance.now(); app.frame = () => { const now = performance.now(); const real = Math.min(0.1, (now - last) / 1000); last = now; return fr(real); }; }
    const m = app.match, ui = app.ui;
    if (tag !== 'once') {
      // v2 haritası: yayılmanın dağıttığı yarı dışındaki iller tarafsız (ilk yarısı oyuncularda kalır)
      const caps = new Set(m.players.map((x) => x.capital));
      const own = m.map.filter((i) => !caps.has(i));
      let k = 0;
      for (const i of own) if (k++ % 2) m.setOwner(i, -1, 0);
      m.phase = 'fetih';
    }
    ui.$.hud.classList.remove('off'); ui.hud(m);
    app.cam.fit(app.boundsOf(m.map), { pitch: 0.98 });
  }, tag);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${tag}_harita.png` });
  if (tag !== 'once') {
    await p.evaluate(() => {
      const app = window.__fl.app, m = app.match, me = m.players[0];
      const t = m.attackable(me).find((i) => m.owner(i) < 0);
      window.__t = t;
      window.__na = m.neutralAt(me, t, { cat: null });
    });
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 120000 });
    await p.waitForTimeout(9000);
    await p.screenshot({ path: `${tag}_tarafsiz.png` });
    await p.evaluate(async () => { const app = window.__fl.app, m = app.match, me = m.players[0]; app.ui.reset(); await window.__na; await new Promise((r) => setTimeout(r, 2500)); app.ui.caption(null); m.choose(me, 'attack', [1, 3]); });
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${tag}_secim.png` });
  }
  console.log(tag, errs.join(' | ') || 'hata yok');
  await b.close();
})();
