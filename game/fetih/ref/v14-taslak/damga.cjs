const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${process.argv[2]}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.3 });
    app.ui.debug({ show: 'q', type: 'hang', qid: 'h006' });
  });
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody') && document.querySelector('.fl-q.on .fl-qbody').offsetHeight > 50, null, { timeout: 60000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const a = window.__fl.app; if (a.match?.cur) a.match.cur.clock.extra += 120; a.stop(); a.render(); a.ui.stamp('BİLDİN!'); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: process.argv[3], timeout: 120000 });
  await b.close();
})();
