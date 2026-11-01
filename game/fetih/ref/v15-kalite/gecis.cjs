// Yavaş kaydırma (gerçekçi hız ~3 birim/sn, 30 kare/sn): kahraman model geçişleri ve gölge yeniden ortalaması anları;
// bir geçişin öncesi/sonrası kırpıntısı.
const { chromium } = require('playwright');
const fs = require('fs');
const [dist, tag, q = '1'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${dist}/FetihLigi.html?q=${q}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', length: 'long', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const B = app.board.byId;
    const path = [34, 16, 17, 10, 35].map((id) => B.get(id));
    const lod = app.props.landmarks.lod;
    const ev = [];
    let prevKinds = '';
    let rec = 0;
    const place = app.shadow.place.bind(app.shadow);
    app.shadow.place = (...a) => {
      const m = place(...a);
      if (m) rec++;
      return m;
    };
    const N = 600;
    const shots = {};
    for (let i = 0; i < N; i++) {
      const u = (i / N) * (path.length - 1);
      const a = path[Math.floor(u)];
      const c = path[Math.min(path.length - 1, Math.floor(u) + 1)];
      const f = u - Math.floor(u);
      app.cam.shot(a.x + (c.x - a.x) * f, a.z + (c.z - a.z) * f, { dist: 13, pitch: 0.85, yaw: 0.3, dur: 0.01, arc: 0 });
      app.frame(1 / 30, false);
      const kinds = lod.slots.map((s) => (s.site ? s.site.kind + ':' + s.want : '-')).join(',');
      if (kinds !== prevKinds) {
        ev.push({ i, kinds });
        prevKinds = kinds;
      }
      if (i % 40 === 0) await new Promise((r) => setTimeout(r, 30));
    }
    return { ev, rec, N, built: lod.stats };
  });
  console.log('kahraman geçiş olayı:', r.ev.length, '· gölge yeniden ortalama:', r.rec, '/', r.N, 'kare');
  console.log(r.ev.slice(0, 30).map((e) => `${e.i}: ${e.kinds}`).join('\n'));
  await b.close();
})();
