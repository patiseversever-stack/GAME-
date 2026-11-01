// İşçide kurulan kahraman = ana iş parçacığında kurulan kahraman mı? (köşe sayısı ve konum/renk/bilgi farkı)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  console.log(await p.evaluate(async () => {
    const app = window.__fl.app;
    app.stop();
    const lm = app.props.landmarks;
    const H = lm.heroes;
    const out = [];
    for (const kind of ['pamukkale', 'selimiye', 'anitkabir', 'aspendos', 'bergama', 'nemrut', 'ayasofya']) {
      const site = lm.sites.find((s) => s.kind === kind);
      H.cache.delete(kind);
      const t = performance.now();
      const gw = await H._workerBuild(site);
      const tw = performance.now() - t;
      H.cache.delete(kind);
      const t2 = performance.now();
      const it = H._job(site);
      let r;
      while (!(r = it.next()).done);
      const gm = r.value;
      // ana yol AO'yu dilimli üretir: bitir
      const job = gm.userData.ao;
      if (job) while (!job.next().done);
      const tm = performance.now() - t2;
      const A = (g, n) => g.getAttribute(n).array;
      let d = { pos: 0, col: 0, info: 0, nor: 0 };
      const n = A(gw, 'position').length === A(gm, 'position').length;
      if (n) for (const k of ['position', 'col', 'info', 'normal']) {
        const a = A(gw, k), c = A(gm, k);
        let m = 0;
        for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - c[i]));
        d[k] = +m.toFixed(5);
      }
      out.push(`${kind}: köşe ${A(gw, 'position').length / 3} / ${A(gm, 'position').length / 3} ${n ? 'eşit' : 'FARKLI'} · en büyük fark konum ${d.position} renk ${d.col} bilgi ${d.info} normal ${d.normal} · işçi ${tw.toFixed(0)} ms (ana iş parçacığı serbest) · ana yol ${tm.toFixed(0)} ms`);
    }
    return out.join('\n');
  }));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
