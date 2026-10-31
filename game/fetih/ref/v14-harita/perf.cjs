// Performans ölçümü: her kalite kademesinde (q=0 düşük, 1 orta, 2 yüksek) açılış süresi, sahne başına üçgen ve
// çizim çağrısı, kare süresi (CPU: frame + render çağrısının döndüğü süre; yazılımsal GPU'da göreli karşılaştırma için).
// node perf.cjs <etiket>  → perf_<etiket>.json
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
(async () => {
  const res = {};
  for (const q of [0, 1, 2]) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 412, height: 892 } });
    const t0 = Date.now();
    await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/FetihLigi.html?q=${q}&debug`);
    await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
    const boot = Date.now() - t0;
    const r = await p.evaluate(async () => {
      const app = window.__fl.app;
      const tb = performance.now();
      await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
      const scene = performance.now() - tb;
      app.stop();
      const lm = app.props.landmarks;
      // arazi yüksekliği okuma maliyeti (teraslar dahil): 200 bin örnek
      const rel = app.board.relief;
      const th = performance.now();
      let acc = 0;
      for (let i = 0; i < 200000; i++) acc += rel.height((i % 997) * 0.05 - 20, ((i / 997) | 0) * 0.05 - 5);
      const heightMs = +(performance.now() - th).toFixed(1);
      const views = {
        harita: () => app.cam.fit(app.boundsOf(app.board.provinces.map((p) => p.index)), { pitch: 0.98, dur: 0.01 }),
        istanbul: () => { const s = lm.sites.find((x) => x.kind === 'ayasofya'); app.cam.shot(s.x, s.z, { y: s.y, dist: 22, pitch: 0.85, yaw: 0, dur: 0.01, arc: 0 }); },
        yakin: () => { const s = lm.sites.find((x) => x.kind === 'selimiye'); app.cam.shot(s.x, s.z, { y: s.y, dist: 10, pitch: 0.82, yaw: 0, dur: 0.01, arc: 0 }); },
      };
      const out = { scene: Math.round(scene), tier: app.tier.id, lodMax: lm.lod?.max, heightMs };
      for (const [k, f] of Object.entries(views)) {
        f();
        for (let i = 0; i < 70; i++) {
          app.frame(1 / 30, false);
          if (i % 3 === 2) await new Promise((r) => setTimeout(r, 10));
        }
        app.render();
        const info = app.renderer.info;
        const tris = info.render.triangles;
        const calls = info.render.calls;
        const ft = [];
        for (let i = 0; i < 20; i++) {
          const a = performance.now();
          app.frame(1 / 60, false);
          app.render();
          const gl = app.renderer.getContext();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // GPU işini bitirmeye zorla
          ft.push(performance.now() - a);
        }
        ft.sort((x, y) => x - y);
        out[k] = { tris, calls, ms: +ft[10].toFixed(1), heroes: lm.lod ? lm.lod.slots.filter((s) => s.site && s.fade > 0.5).length : 0 };
      }
      out.landmarkTris = Math.round(lm.triangles);
      out.board = app.board.geoStats;
      return out;
    });
    r.boot = boot;
    res['q' + q] = r;
    console.log('q' + q, JSON.stringify(r));
    await b.close();
  }
  fs.writeFileSync(`/home/user/work/perf_${tag}.json`, JSON.stringify(res, null, 1));
})();
