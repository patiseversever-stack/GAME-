// Yapı yakın çekimleri (gerçek oyun, kahraman LOD dahil): node yapi.cjs <önek> [tür,tür,...]
// Varsayılan bakış (yaw 0: güneyden kuzeye), orta yakınlık. Başkent kalesi: "kale" (Ankara, kırmızı oyuncu).
const { chromium } = require('playwright');
const pre = process.argv[2] || 'once';
const kinds0 = (process.argv[3] || 'ahlat,pamukkale,aspendos,anitkabir,celsus,kale').split(',');
const DZ = +(process.env.DZ || 6.5);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('JS ' + e));
  p.on('console', (m) => /Shader|error/i.test(m.text()) && !/parallel_shader/.test(m.text()) && errs.push('KONSOL ' + m.text().slice(0, 200)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 60000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.3 });
    app.ui.$.hud.classList.add('off');
    app.stop(); // oyunun kendi döngüsü durur: kareleri biz çizeriz (yazılımsal GPU'da çok daha hızlı)
    document.querySelectorAll('.fl-ui > *').forEach((e) => (e.style.visibility = 'hidden'));
  });
  const kinds = kinds0[0] === 'hepsi' ? await p.evaluate(() => window.__fl.app.props.landmarks.sites.map((s) => s.kind).concat(['kale'])) : kinds0;
  for (const kind of kinds) {
    const info = await p.evaluate(async ([kind, DZ]) => {
      const app = window.__fl.app;
      const lm = app.props.landmarks;
      let s;
      if (kind === 'kale') {
        const b = app.board;
        const P = b.byId.get(6);
        b.setOwner(P.index, 0, 0xe8342a);
        const k = app.castles[0];
        k.group.visible = true;
        const v = b.topAt(P.index, new (k.group.position.constructor)());
        k.place(v);
        s = { x: v.x, y: v.y, z: v.z, s: 2.2, kind: 'kale' };
      } else s = lm.sites.find((x) => x.kind === kind);
      if (!s) return null;
      app.cam.shot(s.x, s.z, { y: s.y, dist: (s.s || 2) * DZ, pitch: 0.82, yaw: 0, dur: 0.01, arc: 0 });
      // kahraman dilimli kurulur: 90 kare (her biri 1/30 sn) yeter; sadece son kare çizilir
      for (let f = 0; f < 90; f++) {
        app.frame(1 / 30, false);
        if (f % 3 === 2) await new Promise((r) => setTimeout(r, 12));
      }
      app.render();
      const url = app.renderer.domElement.toDataURL('image/jpeg', 0.92);
      const lod = lm.lod;
      return { kind, y: s.y, url, slots: lod.slots.map((x) => (x.site ? x.site.kind + ':' + x.fade.toFixed(2) : '-')).join(' ') };
    }, [kind, DZ]);
    if (!info) { console.log(kind, 'yok'); continue; }
    require('fs').writeFileSync(`/home/user/work/${pre}_${kind}.jpg`, Buffer.from(info.url.split(',')[1], 'base64'));
    console.log(kind, info.y.toFixed(3), info.slots);
  }
  console.log(errs.slice(0, 6).join('\n') || 'hata yok');
  await b.close();
})();
