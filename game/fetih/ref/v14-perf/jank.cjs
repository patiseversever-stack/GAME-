// Takılma ölçümü: ana iş parçacığında 50 ms'yi aşan işler (longtask) ve kare aralıkları; defterde düello akışı
// (saldırı filmi + soru) iki kez. Sonuç: uzun işlerin sayısı, toplamı, en büyüğü; kimden geldiği (yığın örneği).
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask', buffered: true });
  });
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/SoruGalerisi.html?q=${process.env.Q || 1}#choice`);
  await p.waitForFunction(() => window.__fl?.app?.match, null, { timeout: 120000 });
  // JS süresi: oyunun kendi işleri (çizim hariç) — her alt sisteme saat
  const r = await p.evaluate(async () => {
    const app = window.__fl.app;
    const H = app.props.landmarks.heroes;
    const lod = app.props.landmarks.lod;
    let builds = 0;
    let buildMs = 0;
    const slots = [H, ...(lod ? lod.slots.map((s) => s.h) : []), lod?.warmer].filter(Boolean);
    for (const h of slots) {
      const j = h._job.bind(h);
      h._job = function* (site) {
        builds++;
        const it = j(site);
        for (;;) {
          const t = performance.now();
          const x = it.next();
          buildMs += performance.now() - t;
          if (x.done) return x.value;
          yield;
        }
      };
    }
    const t0 = performance.now();
    window.__lt.length = 0;
    // iki düello akışı: film + soru açılışı (dokunmadan)
    for (let k = 0; k < 2; k++) {
      await new Promise((res) => {
        const chk = () => (document.querySelector('.fl-q.on') ? res() : setTimeout(chk, 100));
        chk();
      });
      await new Promise((r) => setTimeout(r, 1500));
      if (k === 0) document.getElementById('g-next')?.click();
    }
    const dur = performance.now() - t0;
    const lt = window.__lt.filter(([s]) => s > t0);
    return { sureMs: Math.round(dur), longtasks: lt.length, longMs: lt.reduce((a, [, d]) => a + d, 0), enBuyuk: Math.max(0, ...lt.map(([, d]) => d)), heroBuilds: builds, heroBuildMs: Math.round(buildMs) };
  });
  fs.writeFileSync(`/home/user/work/jank_${tag}.json`, JSON.stringify(r));
  console.log(JSON.stringify(r));
  await b.close();
})();
