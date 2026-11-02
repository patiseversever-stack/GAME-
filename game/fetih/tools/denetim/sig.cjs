// SEÇİM SIRASI dikeyde sığıyor mu: 4 kişi, uzun adlar; üst çubuk (HUD) ile çakışma ve taşma ölçülür.
const { chromium } = require('playwright');
const SIZES = [[320, 568, 'iPhone SE 1'], [360, 640, 'küçük Android'], [375, 667, 'iPhone SE 2/3'], [360, 780, 'Android orta'], [390, 844, 'iPhone 14'], [412, 892, 'Android büyük'], [430, 932, 'iPhone Pro Max']];
const dist = process.argv[2], tag = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  for (const [w, h, name] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto(`file://${dist}/FetihLigi.html?q=0&debug`);
    await p.waitForFunction(() => window.__fl?.app, null, { timeout: 90000 });
    await p.evaluate(async () => {
      const app = window.__fl.app;
      await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); window.__fl.app.start?.();
      const m = app.match, ui = app.ui;
      ['ŞAHİNBEYOĞLU', 'MUSTAFAKEMAL', 'AYŞEGÜLÇİÇEK'].forEach((n, k) => (m.players[k + 1].name = n));
      ui.$.hud.classList.remove('off'); ui.hud(m);
      const res = m.players.map((p, k) => ({ p, i: p.i, name: p.name, color: p.css, value: 1, time: 5 + k * 2.3, correct: k !== 0, err: 0 }));
      const order = m.rank(res, 'exact');
      ui._pend = { results: res, closest: false, T: { kind: 'exact' }, v: {}, me: res[0], gen: ui._gen };
      ui._hold = () => new Promise(() => {});
      ui.ranking(m, order, [2, 1, 1, 0]);
    });
    await p.waitForTimeout(3500);
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s)?.getBoundingClientRect();
      const hud = q('.fl-hud'), h = q('.sr-h'), rows = [...document.querySelectorAll('.sr-r')].map((e) => e.getBoundingClientRect());
      const last = rows[rows.length - 1];
      const jk = q('.fl-jk, .fl-jokers');
      return { hudAlt: Math.round(hud?.bottom || 0), baslikUst: Math.round(h.top), sonAlt: Math.round(last.bottom), H: innerHeight, W: innerWidth, satirSag: Math.round(Math.max(...rows.map((x) => x.right))), satirSol: Math.round(Math.min(...rows.map((x) => x.left))),
        adKesik: [...document.querySelectorAll('.sr-who b')].filter((e) => e.scrollWidth > e.clientWidth + 1).length };
    });
    await p.screenshot({ path: `${tag}_${w}x${h}.png` });
    out.push({ name, w, h, ...r, ust: r.baslikUst - r.hudAlt, alt: r.H - r.sonAlt });
    await p.close();
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
