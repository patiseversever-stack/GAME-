// Hayat yerleşimi önbelleği: ilk açılış ve önbellekli açılış süresi, nesne/kale sayısı. node cihaz_onb.cjs <dist> <yavaşlatma>
const { chromium } = require('playwright');
const [dist, rate] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  for (const run of [1, 2]) {
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(rate || 1) });
    await p.goto(`file://${dist}/FetihLigi.html?q=2&debug`);
    await p.waitForFunction(() => window.__fl?.app?.hayat, null, { timeout: 600000 });
    const r = await p.evaluate(async () => { const h = window.__fl.app.hayat; await h.start(); let s = 0; for (const o of h.list) s += o.x * 3 + o.z * 7 + o.y + o.k + o.s; return { ms: h.placeMs, cached: !!h.cached, n: h.list.length, sum: s.toFixed(2), castles: h.castles.length, stored: (localStorage.getItem('fetih.hayat') || '').length }; });
    console.log('açılış', run, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
