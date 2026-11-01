// GPU payları (yazılımsal GPU: göreli): oyun yakınlığında 3 görünüm. (1) tam kare, (2) gölge geçişi tek başına,
// (3) yarım çözünürlükte kare (piksel bağımlılığı), (4) nesne nesne kapatınca kazanç.
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
const dist = process.argv[3] || '/home/user/GAME-/game/fetih/dist';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', length: 'long', seed: 7, bot: 'er' }, seconds: 0.3 });
    app.stop();
    const gl = app.renderer.getContext();
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const med = (f, n = 9) => {
      const a = [];
      for (let i = 0; i < n; i++) {
        const t = performance.now();
        f();
        sync();
        a.push(performance.now() - t);
      }
      a.sort((x, y) => x - y);
      return +a[n >> 1].toFixed(1);
    };
    const names = new Map();
    const seen = new Set();
    const walk = (o, path, d) => {
      if (!o || typeof o !== 'object' || seen.has(o) || d > 3) return;
      seen.add(o);
      if (o.isObject3D && !names.has(o)) names.set(o, path);
      for (const k of Object.keys(o)) {
        if (k === 'parent' || k === 'children' || k === 'scene' || k === 'app' || k.startsWith('_')) continue;
        const v = o[k];
        if (v && typeof v === 'object') walk(v, path + '.' + k, d + 1);
      }
    };
    walk(app, 'app', 0);
    const list = [];
    app.scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine) || !o.visible) return;
      let name = names.get(o);
      let par = o.parent;
      while (!name && par) {
        if (names.has(par)) name = names.get(par) + '/' + par.children.indexOf(o);
        par = par.parent;
      }
      const g = o.geometry;
      const tri = g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
      list.push({ o, name: name || '?', tri: Math.round(tri * (o.isInstancedMesh ? o.count : 1)), mat: o.material?.type, transparent: !!o.material?.transparent });
    });
    const P = app.board.byId;
    const views = {
      ankara: [P.get(6), 18, 0.85, 0.2],
      karadeniz_kiyi: [P.get(61), 16, 0.8, -0.3],
      akdeniz_kiyi: [P.get(7), 20, 0.9, 0.5],
    };
    const out = {};
    for (const [k, [pv, d, pitch, yaw]] of Object.entries(views)) {
      app.cam.shot(pv.x, pv.z, { dist: d, pitch, yaw, dur: 0.01, arc: 0 });
      for (let i = 0; i < 40; i++) app.frame(1 / 30, false);
      app.render();
      const full = med(() => app.render());
      const shadow = med(() => app.shadow.render(app.renderer));
      const pr = app.renderer.getPixelRatio();
      app.renderer.setPixelRatio(pr * 0.5);
      const half = med(() => app.render());
      app.renderer.setPixelRatio(pr);
      app.render();
      const rows = [];
      for (const it of list) {
        if (!it.o.visible) continue;
        it.o.visible = false;
        const t = med(() => app.render(), 7);
        it.o.visible = true;
        rows.push({ ad: it.name.slice(0, 50), ucgen: it.tri, saydam: it.transparent, pay: +(full - t).toFixed(1) });
      }
      rows.sort((a, b) => b.pay - a.pay);
      out[k] = { tamKare: full, golgeGecisi: shadow, yarimCozunurluk: half, cagri: app.renderer.info.render.calls, nesneler: rows.slice(0, 12) };
    }
    return out;
  });
  fs.writeFileSync(`/home/user/work/perf2/gpu_${tag}.json`, JSON.stringify(r, null, 1));
  for (const [k, v] of Object.entries(r)) {
    console.log(`${k}: kare ${v.tamKare} ms · gölge geçişi ${v.golgeGecisi} ms · yarım çözünürlük ${v.yarimCozunurluk} ms · çağrı ${v.cagri}`);
    for (const n of v.nesneler) console.log(`   ${String(n.pay).padStart(7)} ms  ${String(n.ucgen).padStart(6)} üçgen ${n.saydam ? 'saydam ' : '       '} ${n.ad}`);
  }
  await b.close();
})();
