// Joker ödülü bildirimi ve çevrimiçi izleyici tahmini kartı. node od.cjs <dist>
const { chromium } = require('playwright');
const [dist] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.start?.();
    const m = app.match, ui = app.ui;
    m.phase = 'fetih'; m.round = 2; m.rounds = 6;
    ui.$.hud.classList.remove('off'); ui.hud(m);
    m.reward(m.players[0], 'kalkan');
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: 'odul.png' });
  await p.evaluate(() => {
    const app = window.__fl.app, m = app.match;
    const [, a, d, r] = m.players;
    // 3. koltuk çevrimiçi (uzak) sayılır: insan iki botun düellosunu izler ve tahmin eder
    r.ctl = { remote: true, closed: true, kind: 'remote', request: () => Promise.resolve(null), answer: () => Promise.resolve(null), event() {}, pick: async () => null, category: async () => null };
    const q = m.pick({ types: ['choice'], who: [a, d] });
    const t = m.owned(d.i)[0];
    m.ask(q, [a, d], { title: 'DÜELLO', attacker: a, defender: d, target: t, cat: q.cat, phase: 'duel' });
  });
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 120000 });
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'tahmin.png' });
  console.log(errs.join(' | ') || 'hata yok');
  await b.close();
})();
