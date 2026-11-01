const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=1#hang');
  await p.waitForFunction(() => document.querySelector('.fl-q.on .hr-t'), null, { timeout: 180000 });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    window.__fl.app.stop();
    const fab = document.querySelector('.gal-fab');
    fab?.click();
    return { list: [...document.querySelectorAll('#g-list button, .gal-pn button')].map((x) => x.textContent.trim()).filter(Boolean).join(' | ').slice(0, 600) };
  });
  await p.waitForTimeout(400);
  const ey = await p.evaluate(() => document.querySelector('.gal .ey')?.textContent);
  await p.screenshot({ path: '/home/user/work/galeri_hang.png', timeout: 120000 });
  console.log(ey);
  console.log('gülle var mı:', /Gülle/.test(r.list), '·', r.list.slice(0, 300));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
