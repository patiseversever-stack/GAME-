// Açılış: sayfa açılışından oyunun hazır olmasına kadar süre ve uzun işler (3 deneme ortancası).
const { chromium } = require('playwright');
(async () => {
  const dist = process.argv[2];
  const res = [];
  for (let k = 0; k < 3; k++) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 412, height: 892 } });
    await p.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
    });
    await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
    await p.waitForFunction(() => window.__fl?.app?.ui, null, { timeout: 180000, polling: 20 });
    await p.waitForTimeout(9000);
    const r = await p.evaluate(() => ({ hazir: Math.round(performance.now()), uzun: window.__lt.length, uzunMs: Math.round(window.__lt.reduce((a, b) => a + b, 0)), enUzun: Math.round(Math.max(0, ...window.__lt)) }));
    res.push(r);
    await b.close();
  }
  res.sort((a, b) => a.hazir - b.hazir);
  console.log(JSON.stringify(res[1]));
})();
