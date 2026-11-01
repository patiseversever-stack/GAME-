// İlan anından vince geçiş: kamera uzaklığı ve hedef noktası kare kare (1/30 sn). Atlama = tek karede büyük sıçrama.
const { chromium } = require('playwright');
const dist = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const r = await p.evaluate(async () => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: 'ffa3', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 });
    app.stop();
    const m = app.match;
    const at = m.players[1];
    const t = m.attackable(at).filter((i) => m.players[m.owner(i)].capital !== i)[0];
    app.cam.fit(app.boundsOf(m.map), { pitch: 0.98, dur: 0.01 });
    for (let i = 0; i < 10; i++) app.frame(1 / 30, false);
    const cin = app.cinema;
    cin.tempo = 60;
    cin.attack(at, m.players[m.owner(t)], t, false);
    const rows = [];
    let prev = null;
    let skipped = false;
    for (let f = 0; f < 150; f++) {
      app.frame(1 / 30, false);
      const c = app.cam;
      const s = { t: +(f / 30).toFixed(2), d: +c.dist.toFixed(1), x: +c.target.x.toFixed(1), z: +c.target.z.toFixed(1) };
      if (prev) s.sic = +(Math.abs(s.d - prev.d) + Math.hypot(s.x - prev.x, s.z - prev.z)).toFixed(1);
      rows.push(s);
      prev = s;
      if (!skipped && f >= 54 && cin._skip) {
        // ilan anı (yeni sürüm 1,8 sn) bitti: film başlasın
        skipped = true;
        cin._skip();
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    return rows;
  });
  const big = r.filter((x) => x.sic > 6);
  console.log('en büyük tek kare sıçraması:', Math.max(...r.map((x) => x.sic || 0)), '· sıçrama (>6 birim) sayısı:', big.length, big.map((x) => `${x.t}sn:${x.sic}`).join(' '));
  require('fs').writeFileSync(process.argv[3] || '/dev/null', JSON.stringify(r));
  console.log('uzaklık (her 0,2 sn):', r.filter((x, i) => i % 6 === 0).map((x) => x.d).join(' → '));
  await b.close();
})();
