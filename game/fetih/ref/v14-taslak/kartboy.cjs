// Adam asmaca kartı: harita alanı (afiş altı → kart üstü) ve kart gövdesi yüksekliği (412×892).
const { chromium } = require('playwright');
(async () => {
  const out = {};
  for (const [tag, dist] of [['yeni', '/home/user/GAME-/game/fetih/dist']]) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 412, height: 892 } });
    await p.goto(`file://${dist}/FetihLigi.html?q=1&debug&hang=${process.env.HANG || 'cam'}`);
    await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
    await p.evaluate(async () => {
      const app = window.__fl.app;
      await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.3 });
      app.ui.debug({ show: 'q', type: 'hang', qid: 'h006' });
    });
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody') && document.querySelector('.fl-q.on .fl-qbody').offsetHeight > 50, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    out[tag] = await p.evaluate(() => {
      const q = document.querySelector('.fl-q');
      const who = q.querySelector('.fl-qwho').getBoundingClientRect();
      const qc = q.querySelector('.fl-qc').getBoundingClientRect();
      const body = q.querySelector('.fl-qbody').getBoundingClientRect();
      return { haritaAlani: Math.round(qc.top - who.bottom), kartBoyu: Math.round(qc.height), govde: Math.round(body.height) };
    });
    await b.close();
  }
  console.log(JSON.stringify(out));
})();
