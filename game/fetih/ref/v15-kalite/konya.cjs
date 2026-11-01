// Başkent seçimi, Konya'ya yakın: il adı istem yazısına biniyor mu (önce/sonra).
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const info = await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'all', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const m = app.match;
    for (const i of m.map) m.setOwner(i, -1, 0);
    m.phase = 'baskent';
    const B = app.board.byId;
    const konya = B.get(42);
    const opts = [...m.map].filter((i) => app.board.provinces[i].area > 0).slice(0, 81);
    m.ui.pickProvince(m, opts, 'Başkentini seç');
    for (let i = 0; i < 20; i++) app.frame(1 / 30, false);
    for (const k of app.castles) k.group.visible = false;
    // kullanıcının görüntüsü: Konya'ya yakın çekim, il adı ekranın altına (istem yazısının üstüne) düşer
    const L = app.board.labelLayer;
    const ki = konya.index;
    const v = new app.V3(L.pos[ki * 3], L.pos[ki * 3 + 1], L.pos[ki * 3 + 2]);
    let dz = -2;
    for (let it = 0; it < 6; it++) {
      app.cam.shot(konya.x, konya.z + dz, { dist: 15, pitch: 0.95, yaw: 0, dur: 0.01, arc: 0 });
      for (let i = 0; i < 8; i++) app.frame(1 / 30, false);
      const s = app.project ? null : null;
      const q = v.clone().project(app.camera);
      const y = (-q.y * 0.5 + 0.5) * 892;
      dz += ((y - 742) / 892) * 6; // il adı istemin üst satırına gelsin
    }
    for (let i = 0; i < 40; i++) {
      app.frame(1 / 30, false);
      await new Promise((r) => setTimeout(r, 15));
    }
    await new Promise((r) => setTimeout(r, 600));
    for (let i = 0; i < 20; i++) app.frame(1 / 30, false);
    app.ui.update();
    app.render();
    const pr = document.querySelector('.fl-prompt.on .pt')?.getBoundingClientRect();
    return { prompt: pr && { top: Math.round(pr.top), bottom: Math.round(pr.bottom) }, text: document.querySelector('.fl-prompt.on')?.innerText.replace(/\s+/g, ' ') };
  });
  await p.screenshot({ path: `/home/user/work/perf3/konya_${tag}.png` });
  console.log(tag, JSON.stringify(info));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
