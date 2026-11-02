// İzleme özeti: iki botun düellosu. node bot.cjs <dist> <etiket> <ffa4|team>
const { chromium } = require('playwright');
const [dist, tag, mode] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(async (mode) => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode, region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.start?.();
    const m = app.match, ui = app.ui;
    m.phase = 'fetih'; m.round = 2; m.rounds = 6;
    ui.$.hud.classList.remove('off'); ui.hud(m);
    // iki botun düellosu: eşlide insanın takım arkadaşı (2. koltuk) saldırır
    const att = mode === 'team' ? m.players.find((x) => !x.human && x.team === m.players[0].team) : m.players[1];
    const t = m.attackable(att).find((i) => !m.players[m.owner(i)].human && m.owner(i) >= 0);
    window.__att = att.i;
    if (m.duelAt) { m.botTurnUI(att, true); m.duelAt(att, t, { cat: null }, app.cinema); }
    else { m.botChoose = (pl, options) => options.find((i) => !m.players[m.owner(i)]?.human) ?? options[0]; m.attackTurn(att); }
  }, mode);
  if (tag === 'once') {
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 150000 });
    await p.waitForTimeout(8000);
    await p.screenshot({ path: `${tag}_${mode}_bot.png` });
  } else {
    await p.waitForFunction(() => document.querySelector('.fl-bd.on'), null, { timeout: 150000, polling: 30 });
    await p.evaluate(() => { const app = window.__fl.app; app.pause(); app.ui.$.pause.classList.add('off'); app.ui.el.classList.remove('paused'); });
    await p.waitForFunction(() => getComputedStyle(document.querySelector('.fl-bd')).opacity === '1', null, { timeout: 30000 });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${tag}_${mode}_bot.png` });
    await p.evaluate(() => window.__fl.app.resume());
    if (mode === 'ffa4') {
      await p.evaluate(() => { const app = window.__fl.app, m = app.match; app.ui.elimChoice(m, m.players[2]); });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${tag}_elim.png` });
    }
  }
  console.log(tag, mode, errs.join(' | ') || 'hata yok');
  await b.close();
})();
