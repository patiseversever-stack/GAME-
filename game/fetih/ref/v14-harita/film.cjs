// Defterde düello örneği: saldırı filminden kareler (oyun kendi döngüsünde, gerçek hızda) — uzaktan yakına geçiş.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto('file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=0#choice');
  // film oyunun saatinde akar: yazılımsal GPU yavaş olduğundan saati kare başına sabit adımla ilerletiriz
  await p.waitForFunction(() => window.__fl?.app?.match, null, { timeout: 120000 });
  const shots = [];
  for (let k = 0; k < 120 && shots.length < 6; k++) {
    const r = await p.evaluate(() => {
      const app = window.__fl.app;
      app.render();
      const c = app.renderer.domElement;
      return { d: app.cam.dist, q: !!document.querySelector('.fl-q.on'), url: c.toDataURL('image/jpeg', 0.8) };
    });
    if (k % 2 === 0 || r.q) {
      const n = shots.length;
      fs.writeFileSync(`/home/user/work/film_${n}.jpg`, Buffer.from(r.url.split(',')[1], 'base64'));
      shots.push(+r.d.toFixed(1));
      if (r.q) break;
    }
    await p.waitForTimeout(60);
  }
  console.log('kamera uzaklığı:', shots.join(' → '));
  await b.close();
})();
