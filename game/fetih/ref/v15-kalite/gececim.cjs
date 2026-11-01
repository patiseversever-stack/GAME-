// Kullanıcının anı: soru kartı açık, gece, İstanbul yakın; haritadaki ayrıntılı modeller gecede gündüz gibi mi.
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  await p.goto(`file://${dist}/FetihLigi.html?q=2&debug`);
  await p.waitForFunction(() => window.__fl?.app?.props?.landmarks, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    const L = app.props.landmarks;
    if (L.farReady) await L.farReady;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    for (const k of app.castles) k.group.visible = false;
    const s = L.sites.find((x) => x.kind === 'ayasofya');
    app.cam.shot(s.x + 0.6, s.z + 0.8, { y: s.y, dist: 13, pitch: 0.75, yaw: 0.15, dur: 0.01, arc: 0 });
    L.lod.enter = 0.02;
    for (let i = 0; i < 90; i++) { app.frame(1 / 30, false); if (i % 15 === 0) await new Promise((r) => setTimeout(r, 150)); }
    for (const sl of L.lod.slots) sl.h.finishAO?.();
    app.G.uNight.value.x = 1;
    for (let i = 0; i < 20; i++) { app.frame(1 / 30, false); app.G.uNight.value.x = 1; }
    app.ui.update();
    app.render();
    window.__shown = L.lod.slots.filter((x) => x.site).map((x) => x.site.kind + ':' + x.fade.toFixed(1)).join(',');
  });
  await p.screenshot({ path: `/home/user/work/lod/gc_${tag}.png` });
  console.log(tag, await p.evaluate(() => window.__shown), errs.join(' | ') || 'hata yok');
  await b.close();
})();
