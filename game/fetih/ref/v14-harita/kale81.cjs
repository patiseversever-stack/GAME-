// 81 ilin her birine başkent kalesi konur (oyundaki gibi: il merkezi), orta yakınlıktan çekilir; 9×9 temas sayfası.
// node kale81.cjs <önek>
const { chromium } = require('playwright');
const fs = require('fs');
const pre = process.argv[2] || 'k';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('JS ' + e));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug');
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 60000 });
  await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.3 });
    app.stop();
    document.querySelectorAll('.fl-ui > *').forEach((e) => (e.style.visibility = 'hidden'));
    for (const k of app.castles) k.group.visible = false;
  });
  const n = await p.evaluate(() => window.__fl.app.board.provinces.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async (i) => {
      const app = window.__fl.app;
      const b = app.board;
      b.setOwner(i, 0, 0xe8342a);
      const k = app.castles[0];
      k.group.visible = true;
      const v = (b.castleAt || b.topAt).call(b, i, new k.group.position.constructor());
      k.place(v);
      app.cam.shot(v.x, v.z, { y: k.group.position.y + 0.6, dist: 16, pitch: 0.78, yaw: 0, dur: 0.01, arc: 0 });
      for (let f = 0; f < 4; f++) app.frame(1 / 30, false);
      app.render();
      const c = app.renderer.domElement; const t = document.createElement('canvas'); t.width = 300; t.height = 300; t.getContext('2d').drawImage(c, 0, (c.height - c.width) / 2, c.width, c.width, 0, 0, 300, 300); const url = t.toDataURL('image/jpeg', 0.85);
      b.setOwner(i, -1, 0);
      const pr = b.provinces[i];
      return { url, name: pr.name, dy: +(k._dy || 0).toFixed(3), s: +k.group.scale.x.toFixed(2) };
    }, i);
    fs.writeFileSync(`/home/user/work/${pre}81_${String(i).padStart(2, '0')}.jpg`, Buffer.from(r.url.split(',')[1], 'base64'));
    out.push([i, r.name, r.dy, r.s]);
  }
  fs.writeFileSync(`/home/user/work/${pre}81.json`, JSON.stringify(out));
  console.log(out.filter((x) => x[2] > 0.05).map((x) => x.join(':')).join(' ') || '-', '\n', errs.slice(0, 3).join('\n') || 'hata yok');
  await b.close();
})();
