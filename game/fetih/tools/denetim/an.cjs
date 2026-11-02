// v2 kural anları: zincir devamı, kalkan (sorusuz), kule onarımı. node an.cjs <dist> <etiket> <sahne: zincir|kalkan|onar>
const { chromium } = require('playwright');
const [dist, tag, scene] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug#${scene}`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.start?.(); if (!/kalkan/.test(location.hash)) { const fr = app.frame.bind(app); let last = performance.now(); app.frame = (dt) => { const now = performance.now(); const real = Math.min(0.5, (now - last) / 1000); last = now; return fr(real); }; }
    const m = app.match, ui = app.ui;
    m.phase = 'fetih'; m.round = 1; m.rounds = 6;
    ui.$.hud.classList.remove('off'); ui.hud(m);
    window.__freeze = () => { app.pause(); ui.$.pause.classList.add('off'); ui.el.classList.remove('paused'); };
    const [me, foe] = m.players;
    const pp = ui.pickProvince.bind(ui); ui.pickProvince = (...a) => { window.__pickShown = true; return pp(...a); };
    ui.wheel = async () => 'tarih'; const bn = ui.banner.bind(ui); ui.banner = (t, ...r) => { window.__bn = t; return bn(t, ...r); };
  });
  await p.waitForTimeout(2500);
  await p.evaluate((o) => (window.__OLD = o), tag === 'once');
  const shot = (n) => p.screenshot({ path: `${tag}_${scene}_${n}.png` });
  const freezeShot = async (cond, n, extra = 0) => {
    const dbg = setInterval(async () => { try { console.log('dbg', await p.evaluate(() => (document.querySelector('.fl-cap, .fl-caption')?.innerText || '').replace(/\s+/g, ' ').slice(0, 60) + ' | ' + window.__fl.app.match.duel?.target + ' | ' + (window.__fl.app.cinema.battle?.on))); } catch {} }, 8000);
    await p.waitForFunction(cond, null, { timeout: 60000, polling: 30 }).finally(() => clearInterval(dbg));
    if (extra) await p.waitForTimeout(extra);
    const q = await p.evaluate(() => !!document.querySelector('.fl-q.on .fl-qbody'));
    console.log('kart', await p.evaluate(() => { const e = document.querySelector('.fl-q'); if (!e) return 'yok'; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return e.className + ' ' + Math.round(r.top) + '/' + Math.round(r.height) + ' op ' + cs.opacity + ' vis ' + cs.visibility + ' ' + (document.querySelector('.fl-q .fl-qtext')?.textContent || '').slice(0, 40) + ' bn ' + window.__bn; }));
    if (!q) await p.evaluate(() => window.__freeze());
    await p.waitForTimeout(300);
    await shot(n);
    if (!q) await p.evaluate(() => window.__fl.app.resume());
  };
  if (scene === 'zincir') {
    await p.evaluate(() => {
      const app = window.__fl.app, m = app.match, ui = app.ui, [me] = m.players;
      m.chain = { player: 0, cap: 3, wins: 1 };
      ui.toast?.('Devam! 2 saldırı hakkın kaldı', { p: me, tone: 'gold', ms: 60000 });
      m.choose(me, 'attack', [2, 3]);
    });
    await freezeShot(() => window.__pickShown, 'secim', 1200);
  } else if (scene === 'kalkan') {
    await p.evaluate(() => {
      const app = window.__fl.app, m = app.match, [me, foe] = m.players;
      foe.shield = true;
      const t = m.attackable(me)[0];
      me.ctl.pick = async () => t;
      if (m.duelAt) m.duelAt(me, t, { cat: null }, app.cinema);
      else m.attackTurn(me);
    });
    await freezeShot(() => window.__bn === 'KALKAN!' || !!document.querySelector('.fl-q.on .fl-qbody'), 'an', tag === 'once' ? 9000 : 700);
  } else if (scene === 'onar') {
    await p.evaluate(() => {
      const app = window.__fl.app, m = app.match, [me] = m.players;
      const k = app.castles[me.i];
      k.hit(); k.hit();
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const m = window.__fl.app.match; m.choose(m.players[0], 'attack', [1, 3]); });
    await freezeShot(() => window.__pickShown, 'secim', 1200);
    await p.evaluate(() => { const app = window.__fl.app, m = app.match, me = m.players[0]; app.ui.botPick = async () => {}; m.botChoose = () => me.capital; app.ui.reset(); const k = app.castles[me.i]; const hp = k.heal(); app.cinema.towerUp(me, me.capital, hp); });
    await freezeShot(() => /ONARILDI/.test(document.body.innerText), 'kule', 1300);
    console.log(await p.evaluate(() => { const app = window.__fl.app, k = app.castles[0], c = k.group.position, t = app.cam.target; return 'kale ' + c.x.toFixed(2) + ',' + c.z.toFixed(2) + ' hedef ' + t.x.toFixed(2) + ',' + t.z.toFixed(2) + ' uzak ' + app.cam.dist.toFixed(1) + ' kule ' + k.towers.map((x) => x.alive + ':' + x.fall.toFixed(2)).join(' '); }));
  }
  console.log(tag, scene, errs.join(' | ') || 'hata yok');
  await b.close();
})();
