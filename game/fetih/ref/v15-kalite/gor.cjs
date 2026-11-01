// Sade / ayrıntılı / uzak sürüm (aynı tasarım) yan yana: oyun uzaklığında ve orta uzaklıkta.
const { chromium } = require('playwright');
const fs = require('fs');
const KINDS = (process.env.KINDS || 'ayasofya,sultanahmet,mardin,nemrut,bergama,galata').split(',');
const OPT = (process.env.OPT || '0.35,0.12').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 700 } });
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=2&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    for (const k of app.castles) k.group.visible = false;
    app.board.showLabels?.(null);
  });
  const meta = [];
  for (const kind of KINDS) {
    for (const dist of [30, 12]) {
      for (const v of ['sade', 'tam', 'uzak']) {
        const r = await p.evaluate(async ([kind, dist, v, OPT]) => {
          const app = window.__fl.app;
          const L = app.props.landmarks;
          const H = L.heroes;
          const lod = L.lod;
          const s = L.sites.find((x) => x.kind === kind);
          // önbelleği bu sürümle kur
          for (const sl of lod.slots) if (sl.site) { sl.h.hide(); sl.site = null; sl.want = 0; sl.fade = 0; }
          const old = H.cache.get(kind);
          if (old) { H.cache.delete(kind); old.dispose(); }
          let tris = 0;
          if (v !== 'sade') {
            H.lodOpt = v === 'uzak' ? { seg: OPT[0], minPart: OPT[1] } : null;
            await new Promise((res) => H.request(s, () => res(), true, false, true));
            tris = H.stats.tris;
            H.lodOpt = null;
          }
          lod.enabled = v !== 'sade';
          lod.enter = 1e-4;
          app.cam.shot(s.x, s.z, { y: s.y, dist, pitch: 0.9, yaw: 0.3, dur: 0.01, arc: 0 });
          for (let i = 0; i < 70; i++) app.frame(1 / 30, false);
          app.render();
          const q = new app.V3(s.x, s.y, s.z).project(app.camera);
          return { url: app.renderer.domElement.toDataURL('image/png'), sx: (q.x * 0.5 + 0.5) * 412, sy: (-q.y * 0.5 + 0.5) * 700, tris, shown: lod.slots.filter((x) => x.site).map((x) => x.site.kind + ':' + x.fade.toFixed(2)).join(',') };
        }, [kind, dist, v, OPT]);
        const f = `/home/user/work/lod/g_${kind}_${dist}_${v}.png`;
        fs.writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64'));
        meta.push({ kind, dist, v, sx: r.sx, sy: r.sy, tris: r.tris, shown: r.shown });
      }
    }
  }
  fs.writeFileSync('/home/user/work/lod/meta.json', JSON.stringify(meta));
  console.log(meta.map((m) => `${m.kind} ${m.dist} ${m.v} tris=${m.tris} ${m.shown}`).join('\n'));
  await b.close();
})();
