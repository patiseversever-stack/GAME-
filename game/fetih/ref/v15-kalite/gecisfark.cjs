// Yakına gelince geçiş ne kadar görünür: aynı kare, haritadaki model (eski: sade / yeni: uzak sürüm) ile ayrıntılı
// model arasındaki piksel farkı (yapı çevresi kırpıntı). Gündüz ve gece. + harita sorusunda gömülme (fade).
const { chromium } = require('playwright');
const fs = require('fs');
const [dist, tag] = process.argv.slice(2);
const KINDS = ['ayasofya', 'sultanahmet', 'mardin', 'bergama', 'anitkabir', 'peri'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 700 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  await p.goto(`file://${dist}/FetihLigi.html?q=2&debug`);
  await p.waitForFunction(() => window.__fl?.app?.props?.landmarks, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const L = window.__fl.app.props.landmarks;
    if (L.farReady) await L.farReady;
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    for (const k of app.castles) k.group.visible = false;
    app.board.showLabels?.(null);
    for (let i = 0; i < 60; i++) app.frame(1 / 30, false);
  });
  const out = [];
  for (const night of [0, 1]) {
    for (const kind of KINDS) {
      const r = await p.evaluate(async ([kind, night]) => {
        const app = window.__fl.app;
        const L = app.props.landmarks;
        const s = L.sites.find((x) => x.kind === kind);
        app.G.uNight.value.x = night;
        const shots = [];
        for (const on of [false, true]) {
          L.lod.enabled = on;
          L.lod.enter = 1e-4;
          app.cam.shot(s.x, s.z, { y: s.y, dist: 15, pitch: 0.9, yaw: 0.3, dur: 0.01, arc: 0 });
          for (let i = 0; i < 70; i++) { app.frame(1 / 30, false); if (i % 15 === 0) await new Promise((r) => setTimeout(r, 150)); }
          for (const sl of L.lod.slots) sl.h.finishAO?.();
          for (let i = 0; i < 20; i++) app.frame(1 / 30, false);
          app.G.uNight.value.x = night;
          app.render();
          shots.push(app.renderer.domElement.toDataURL('image/png'));
        }
        const q = new app.V3(s.x, s.y, s.z).project(app.camera);
        return { shots, sx: (q.x * 0.5 + 0.5) * 412, sy: (-q.y * 0.5 + 0.5) * 700 };
      }, [kind, night]);
      r.shots.forEach((u, i) => fs.writeFileSync(`/home/user/work/lod/gf_${tag}_${kind}_${night}_${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
      out.push({ kind, night, sx: r.sx, sy: r.sy });
    }
  }
  fs.writeFileSync(`/home/user/work/lod/gf_${tag}.json`, JSON.stringify(out));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
