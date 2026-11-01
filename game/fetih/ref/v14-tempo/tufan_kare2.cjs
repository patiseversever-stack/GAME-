// Tufan filmi kareleri: film zamanı T'de oyun saati duraklatılır (app.pause: zamanlayıcılar ve clock.now donar),
// duraklatma perdesi gizlenir, bir kare çizilir, görüntü alınır, devam edilir. Film zamanı = gerçek zaman − duraklamalar.
// node tufan_kare2.cjs <etiket> [dist]
const { chromium } = require('playwright');
const tag = process.argv[2] || 'x';
const dist = process.argv[3] || '/home/user/GAME-/game/fetih/dist';
const AT = (process.env.AT || '0.6,1.6,3.0,4.4,6.0,7.6,9.2,10.6').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`file://${dist}/SoruGalerisi.html?q=1#tufan`);
  await p.addStyleTag({ content: '.fl-pause{display:none!important}' });
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-opt'), null, { timeout: 180000 });
  let paused = 0;
  const shot = async (f) => {
    const t = Date.now();
    await p.evaluate(() => {
      const a = window.__fl.app;
      a.pause();
      a.ui.update();
      a.render();
    });
    await p.screenshot({ path: f, timeout: 120000 });
    await p.evaluate(() => window.__fl.app.resume());
    paused += Date.now() - t;
  };
  await p.waitForTimeout(2500);
  await shot(`/home/user/work/tk_${tag}_soru.png`);
  await p.evaluate(() => document.querySelector('.fl-q.on .fl-opt')?.click());
  await p.waitForFunction(() => document.querySelector('.fl-q.dn-tf-rv'), null, { timeout: 60000, polling: 30 });
  const t0 = Date.now();
  paused = 0;
  const out = [];
  for (const T of AT) {
    while ((Date.now() - t0 - paused) / 1000 < T) await p.waitForTimeout(30);
    const real = (Date.now() - t0 - paused) / 1000;
    await shot(`/home/user/work/tk_${tag}_${T}.png`);
    out.push(`${T} (${real.toFixed(2)}): ` + (await p.evaluate(() => [document.querySelector('.dn-tf-cap')?.innerText?.replace(/\s+/g, ' ') || '', window.__fl.app.cam.dist.toFixed(1), document.querySelector('.fl-q')?.classList.contains('on') ? 'kart' : 'kartsız'].join(' | '))));
  }
  console.log(out.join('\n'));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
