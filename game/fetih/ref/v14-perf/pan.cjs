// Kaydırma akıcılığı: oyun kendi döngüsünde çalışırken parmakla kaydırma benzetimi (orta yakınlık, yapıların üstünden
// geçen yol). Ana iş parçacığındaki uzun işler (>50 ms) ve oyunun kendi JS süresi (kare başına, çizim komutları hariç
// değil) ölçülür. Yazılımsal GPU olduğundan kare hızı değil, ANA İŞ PARÇACIĞI yükü karşılaştırılır.
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push(e.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/FetihLigi.html?q=${process.env.Q || 1}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const lm = app.props.landmarks;
    // yol: batıdan doğuya yapıların üstünden (İstanbul → Bursa → Ankara → Kapadokya → Konya → Pamukkale → İzmir)
    const path = ['ayasofya', 'bursaulu', 'anitkabir', 'peri', 'mevlana', 'pamukkale', 'celsus', 'bergama', 'selimiye'].map((k) => lm.sites.find((s) => s.kind === k));
    let js = 0;
    let frames = 0;
    let worst = 0;
    const t0 = performance.now();
    window.__lt.length = 0;
    // oyunun kendi döngüsü yerine: her rAF'ta bir kare (gerçek zaman); kamera yol boyunca süzülür
    await new Promise((res) => {
      let i = 0;
      let u = 0;
      const step = () => {
        const a = path[i];
        const c = path[i + 1];
        if (!c) return res();
        u += 0.02;
        if (u >= 1) {
          u = 0;
          i++;
        }
        const x = a.x + (c.x - a.x) * u;
        const z = a.z + (c.z - a.z) * u;
        const t = performance.now();
        app.cam.shot(x, z, { dist: 12, pitch: 0.85, yaw: 0, dur: 0.01, arc: 0 });
        app.frame(1 / 60, true);
        const d = performance.now() - t;
        js += d;
        worst = Math.max(worst, d);
        frames++;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    // bekleyen kurulumlar bitsin diye birkaç saniye daha (işçi ya da dilimler)
    const t1 = performance.now();
    await new Promise((r) => setTimeout(r, 3000));
    const lt = window.__lt.slice();
    return { kare: frames, kareBasinaJSms: +(js / frames).toFixed(1), enKotuKareJSms: +worst.toFixed(0), uzunIs: lt.length, uzunIsToplamMs: Math.round(lt.reduce((a, b) => a + b, 0)), enUzunIsMs: Math.round(Math.max(0, ...lt)), kurulan: lm.lod.stats.built };
  });
  fs.writeFileSync(`/home/user/work/pan_${tag}.json`, JSON.stringify(r));
  console.log(JSON.stringify(r));
  await b.close();
})();
