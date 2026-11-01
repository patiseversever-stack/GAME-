// Kamera hareketinde kare maliyeti: harita üstünde sürekli kayan + yakınlaşan kamera (oyunun kendi döngüsü yerine
// sabit dt ile kare kare). Her kare: alt sistem CPU süresi, three.js gönderim süresi (GPU beklemeden), GPU dahil toplam
// (readPixels ile senkron), gölge geçişi, çağrı ve üçgen. Kip: ANA (oyun haritası) / SORU (sakin soru kartı açık).
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
    const T = {};
    const wrap = (obj, name, key) => {
      if (!obj || !obj[name]) return;
      const f = obj[name].bind(obj);
      obj[name] = (...a) => {
        const t = performance.now();
        const x = f(...a);
        T[key] = (T[key] || 0) + performance.now() - t;
        return x;
      };
    };
    wrap(app.board, 'update', 'board');
    wrap(app.fx, 'update', 'fx');
    wrap(app.nightLights, 'update', 'gece');
    wrap(app.cam, 'update', 'kamera');
    wrap(app.weather, 'update', 'hava');
    wrap(app.ui, 'update', 'arayuz');
    wrap(app.props.landmarks.lod, 'update', 'lod');
    wrap(app.shadow, 'render', 'golge');
    wrap(app.renderer, 'render', 'cizimGonder');
    let shadowN = 0;
    const sr = app.shadow.render;
    app.shadow.render = (...a) => (shadowN++, sr(...a));
    const gl = app.renderer.getContext();
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const P = app.board.byId;
    const path = [6, 42, 1, 27, 63, 21, 65, 25, 61, 34, 35, 6].map((id) => P.get(id));
    const N = 160;
    const cpu = [];
    const tot = [];
    const calls = [];
    const tris = [];
    for (const k in T) delete T[k];
    for (let i = 0; i < N; i++) {
      const u = (i / N) * (path.length - 1);
      const a = path[Math.floor(u)];
      const c = path[Math.min(path.length - 1, Math.floor(u) + 1)];
      const f = u - Math.floor(u);
      const d = 14 + 10 * Math.sin(i * 0.05);
      app.cam.shot(a.x + (c.x - a.x) * f, a.z + (c.z - a.z) * f, { dist: d, pitch: 0.85, yaw: Math.sin(i * 0.02) * 0.4, dur: 0.01, arc: 0 });
      const t0 = performance.now();
      app.frame(1 / 60, true);
      const t1 = performance.now();
      sync();
      const t2 = performance.now();
      cpu.push(t1 - t0);
      tot.push(t2 - t0);
      calls.push(app.renderer.info.render.calls);
      tris.push(app.renderer.info.render.triangles);
      if (i % 20 === 19) await new Promise((r) => setTimeout(r, 0));
    }
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
    const p95 = (a) => { const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(s.length * 0.95)].toFixed(2); };
    const out = { kareCPUms: med(cpu), kareCPUp95: p95(cpu), kareToplamMs: med(tot), golgeKareBasina: +(shadowN / N).toFixed(2), cagri: med(calls), ucgen: med(tris), piksel: app.G.uRes.value.x * app.G.uRes.value.y };
    for (const k in T) out['cpu_' + k] = +(T[k] / N).toFixed(2);
    return out;
  });
  fs.writeFileSync(`/home/user/work/perf2/kaydir_${tag}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
