// Gerçek maç akışı: yayılma sorusu (herkes) + izlenen düello, her kipte sonuç ekranı. node kip.cjs <dist> <etiket> <kip> [tip]
const { chromium } = require('playwright');
const [dist, tag, mode, typ = 'choice'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
  await p.evaluate(async ({ mode }) => { await window.__fl.app.debugScene({ show: 'none', cfg: { mode, region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); window.__fl.app.start?.(); }, { mode });
  await p.waitForTimeout(1500);
  const log = [];
  const t0 = Date.now();
  const stamp = (s) => log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`);
  const run = (phase) => p.evaluate(async ({ phase, typ }) => {
    const app = window.__fl.app, m = app.match, ui = app.ui;
    ui.$.hud.classList.remove('off'); ui.hud(m);
    window.__done = false;
    const alive = m.players.filter((x) => x.alive);
    const q = m.pick({ cat: 'tarih', types: [typ], who: alive });
    if (phase === 'yayilma') {
      const res = await m.ask(q, alive, { title: 'Herkes cevaplıyor', phase: 'yayilma' });
      const order = m.rank(res, Number.isFinite(res[0]?.err) ? 'closest' : 'exact');
      await ui.ranking(m, order, [2, 1, 1, 0].slice(0, order.length));
    } else {
      const bots = m.players.filter((x) => !x.human);
      const a = bots[0], d = bots.find((x) => !m.ally(x.i, a.i)) || bots[1];
      await m.ask(q, [a, d], { title: 'DÜELLO', attacker: a, defender: d, target: m.owned(d.i)[0], phase: 'duel', cat: q.cat });
    }
    window.__done = true;
  }, { phase, typ }).catch((e) => errs.push('run: ' + String(e).slice(0, 200)));
  for (const phase of ['yayilma']) {
    await p.evaluate(() => { const ui = window.__fl.app.ui; window.__t = []; for (const k of ['reveal', 'ranking', '_hold']) { const f = ui[k].bind(ui); ui[k] = async (...a) => { const s = performance.now(); const r = await f(...a); window.__t.push(k + ' ' + Math.round(performance.now() - s) + (k === '_hold' ? '(' + a[0] + ')' : '')); return r; }; } }); const pr = run(phase);
    let got = new Set();
    for (let k = 0; k < 400; k++) {
      const st = await p.evaluate(() => ({ q: !!document.querySelector('.fl-q.on'), opt: !!document.querySelector('.fl-q.on .fl-opt:not(.picked)'), res: !!document.querySelector('.fl-res.on .rs-r'), rank: !!document.querySelector('.fl-rank.on'), done: window.__done }));
      if (st.opt && !got.has('opt') && phase === 'yayilma') { got.add('opt'); stamp(phase + ' soru'); await p.locator('.fl-q.on .fl-opt').nth(1).click().catch(() => {}); }
      if (st.res && !got.has('res')) { got.add('res'); stamp('kart açık mı: ' + st.q); await p.waitForTimeout(700); stamp(phase + ' sonuç ekranı'); await p.screenshot({ path: `/home/user/work/kip/${tag}_${mode}_${phase}_sonuc.png` }); }
      if (st.rank && !got.has('rank')) { got.add('rank'); await p.waitForTimeout(500); stamp(phase + ' SEÇİM SIRASI ekranı'); await p.screenshot({ path: `/home/user/work/kip/${tag}_${mode}_${phase}_sira.png` }); }
      if (st.done) { stamp(phase + ' bitti'); break; }
      await p.waitForTimeout(250);
    }
    await pr;
  }
  console.log(await p.evaluate(() => window.__t.join(' · '))); console.log(tag, mode, '\n  ' + log.join('\n  '), '\n  ', errs.join(' | ') || 'hata yok');
  await b.close();
})();
