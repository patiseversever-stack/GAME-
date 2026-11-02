// Zorunlu yerleşim okumaları: kim, kaç kez (savaş filmi + kaydırma sırasında).
const { chromium } = require('playwright');
const [dist] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 600000 });
  await p.evaluate(async () => { const app = window.__fl.app; await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); if (app.hayat) await app.hayat.start(); });
  await p.evaluate(() => {
    window.__lay = {}; window.__frames = 0;
    const app = window.__fl.app; const fr = app.frame.bind(app); app.frame = (dt) => { window.__frames++; return fr(dt); };
    const wrap = (proto, name, getter) => {
      const d = Object.getOwnPropertyDescriptor(proto, name);
      const orig = getter ? d.get : d.value;
      const f = function (...a) { const st = (new Error().stack || '').split('\n')[2] || ''; const k = name + ' ' + st.trim().replace(/\(.*FetihLigi.html[^:]*:/, '(:').slice(0, 90); window.__lay[k] = (window.__lay[k] || 0) + 1; return orig.apply(this, a); };
      Object.defineProperty(proto, name, getter ? { get: f, configurable: true } : { value: f, configurable: true, writable: true });
    };
    wrap(Element.prototype, 'clientWidth', true); wrap(Element.prototype, 'clientHeight', true);
    wrap(HTMLElement.prototype, 'offsetWidth', true); wrap(HTMLElement.prototype, 'offsetHeight', true);
    wrap(Element.prototype, 'getBoundingClientRect', false);
    const m = app.match; const a = m.players[1]; const t = m.attackable(a)[0]; const d = m.players[m.owner(t)]; app.cinema.attack(a, d, t, false);
  });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => ({ frames: window.__frames, lay: Object.entries(window.__lay).sort((x, y) => y[1] - x[1]).slice(0, 15) }));
  console.log('kare', r.frames); for (const [k, v] of r.lay) console.log(String(v).padStart(5), k);
  await b.close();
})();
