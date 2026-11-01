// Uzak sürüm davranışları: harita sorusunda gömülme (fade), Kuşbakışı kahramanı (uHide), kale altında gömülme;
// düşük kademede sade model ve geçiş kapalı.
const { chromium } = require('playwright');
const fs = require('fs');
const [dist] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = {};
  for (const q of [2, 0]) {
    const p = await b.newPage({ viewport: { width: 412, height: 700 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
    await p.goto(`file://${dist}/FetihLigi.html?q=${q}&debug`);
    await p.waitForFunction(() => window.__fl?.app?.props?.landmarks, null, { timeout: 120000 });
    const r = await p.evaluate(async () => {
      const app = window.__fl.app;
      const L = app.props.landmarks;
      const ready = L.farReady ? await L.farReady : 'yok';
      await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
      app.stop();
      for (const k of app.castles) k.group.visible = false;
      app.board.showLabels?.(null);
      const s = L.sites.find((x) => x.kind === 'ayasofya');
      const snap = () => { app.render(); return app.renderer.domElement.toDataURL('image/png'); };
      const go = async (n = 50) => { for (let i = 0; i < n; i++) { app.frame(1 / 30, false); if (i % 15 === 0) await new Promise((r) => setTimeout(r, 100)); } };
      app.cam.shot(s.x, s.z, { y: s.y, dist: 26, pitch: 0.95, yaw: 0.3, dur: 0.01, arc: 0 });
      await go(70);
      const shots = { normal: snap() };
      L.fade(false);
      await go(40);
      shots.gomulu = snap();
      L.fade(true);
      await go(40);
      shots.geri = snap();
      // Kuşbakışı: Ayasofya'nın kahramanı, haritadaki kopyası gizli
      L.hero('ayasofya', null, true);
      L.heroes.finishAO();
      await go(20);
      shots.kusbakisi = snap();
      L.heroOff();
      await go(20);
      return { ready, tier: app.tier.id, lod: L.lod.enabled, far: !!L.far, leanShown: L.lean?.some((m) => m.visible) ?? null, shots };
    });
    for (const [k, u] of Object.entries(r.shots)) fs.writeFileSync(`/home/user/work/lod/is_q${q}_${k}.png`, Buffer.from(u.split(',')[1], 'base64'));
    delete r.shots;
    out[q] = { ...r, errs };
    await p.close();
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
