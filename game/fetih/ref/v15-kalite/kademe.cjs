// Kademe yükseltmesi uçtan uca: kayıtta adj=+1 varken açılış kademesi, GPU zaman ölçümü, özet satırı, hata yok.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  const url = 'file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?debug';
  await p.goto(url);
  await p.waitForFunction(() => window.__fl?.app?.gov, null, { timeout: 120000 });
  const a = await p.evaluate(() => {
    const app = window.__fl.app;
    const g = app.gov;
    return { tier: app.tier.id, base: g.base, hi: +g.hi.toFixed(2), timer: !!app.gpuTimer.ext, keys: Object.keys(localStorage), sum: g.summary() };
  });
  console.log('ilk açılış', JSON.stringify(a));
  // kayda yükseltme yaz, yeniden aç
  await p.evaluate(() => {
    const app = window.__fl.app;
    app.gov.adj = 1;
    app.gov.save();
  });
  await p.waitForTimeout(300);
  await p.reload();
  await p.waitForFunction(() => window.__fl?.app?.gov, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  const c = await p.evaluate(() => {
    const app = window.__fl.app;
    const g = app.gov;
    return { tier: app.tier.id, base: g.base, gpuMs: +g.gpuMs.toFixed(2), cpuMs: +g.cpuMs.toFixed(2), sum: g.summary(), perf: app.store.get('perf') };
  });
  console.log('yükseltilmiş', JSON.stringify(c));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
