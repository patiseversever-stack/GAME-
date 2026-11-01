// Harf çemberi: gerçek sürükleme (fare olayları = pointer olayları) ile yarım, yanlış ve doğru deneme; ekran görüntüleri.
const { chromium } = require('playwright');
const out = process.argv[2] || 'hc';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file:///home/user/GAME-/game/fetih/dist/FetihLigi.html?q=1&debug&hang=' + (process.env.HANG || 'cam'));
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  const qid = process.env.QID || 'h006';
  await p.evaluate(async (qid) => {
    const app = window.__fl.app;
    await app.debugScene({ show: 'none', cfg: { mode: '1v1', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.3 });
    app.ui.debug({ show: 'q', type: 'hang', qid });
  }, qid);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .hr-t'), null, { timeout: 60000 });
  await p.waitForTimeout(90);
  await p.evaluate(() => { const a = window.__fl.app; if (a.match?.cur) a.match.cur.clock.extra += 120; a.stop(); a.render(); });
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_0acilis.png` });
  await p.waitForTimeout(1500);
  // saat dursun (görüntüler arası süre dolmasın)
  await p.evaluate(() => {
    const a = window.__fl.app;
    if (a.match?.cur) a.match.cur.clock.extra += 60;
    a.stop(); // harita donsun (yazılımsal GPU yavaş): kart DOM, görüntü hızlı
    a.render();
  });
  const info = async () =>
    p.evaluate(() => {
      const word = window.__fl.app.match.cur.v.word;
      const coins = [...document.querySelectorAll('.hr-t:not(.gone)')].map((e) => {
        const r = e.getBoundingClientRect();
        return { c: e.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      return { word, coins };
    });
  const tap = async (seq) => {
    for (const x of seq) {
      await p.mouse.move(x.x, x.y);
      await p.mouse.down();
      await p.mouse.up();
    }
  };
  const drag = async (seq, release = true) => {
    if (process.env.HANG === 'serit' && release) return tap(seq);
    const pts = seq.map((x) => [x.x, x.y]);
    await p.mouse.move(pts[0][0], pts[0][1]);
    await p.mouse.down();
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1];
      const [bx, by] = pts[k];
      for (let s = 1; s <= 6; s++) await p.mouse.move(ax + ((bx - ax) * s) / 6, ay + ((by - ay) * s) / 6);
    }
    if (release) await p.mouse.up();
  };
  const order = (I, letters) => {
    const pool = I.coins.slice();
    return letters.map((c) => pool.splice(pool.findIndex((x) => x.c === c), 1)[0]);
  };
  let I = await info();
  console.log('kelime', I.word, 'sikke', I.coins.map((x) => x.c).join(''));
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_1bos.png` });
  // 1) yarım sürükleme (ilk 3 harf), parmak basılı: canlı ip ve kutular
  const letters = [...I.word].filter((c) => c !== ' ');
  if (process.env.HANG === 'serit') await tap(order(I, letters.slice(0, 3)));
  else await drag(order(I, letters.slice(0, 3)), false);
  await p.mouse.move(206, 700);
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_2surukle.png` });
  if (process.env.HANG !== 'serit') await p.mouse.up();
  else {
    // dokunma kipinde yarım diziliş: tablanın boş kenarına dokununca silinir
    const r = await p.evaluate(() => { const b = document.querySelector('.hr-plat').getBoundingClientRect(); return [b.left + 2, b.top + b.height / 2]; });
    await p.mouse.click(r[0], r[1]);
  }
  await p.waitForTimeout(300);
  // 2) yanlış deneme: ilk iki harf doğru, gerisi ters
  I = await info();
  const wrongSeq = [...letters.slice(0, 2), ...letters.slice(2).reverse()];
  await drag(order(I, wrongSeq));
  await p.waitForTimeout(150);
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_3yanlis.png` });
  await p.waitForTimeout(700);
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_4kilit.png` });
  // 3) doğru: kalan harfler (kilitlenmeyen konumlar) sırayla
  const state = await p.evaluate(() => [...document.querySelectorAll('.hr-s')].map((s) => (s.classList.contains('lk') ? 1 : 0)));
  const pos = [...I.word].map((c, i) => i).filter((i) => I.word[i] !== ' ');
  const rest = pos.filter((i, j) => !state[j]).map((i) => I.word[i]);
  I = await info();
  await drag(order(I, rest));
  await p.waitForTimeout(200);
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_5an.png` });
  await p.waitForTimeout(900);
  await p.screenshot({ timeout: 120000, path: `/home/user/work/${out}_6dogru.png` });
  const res = await p.evaluate(() => ({ hak: document.querySelectorAll('.hr-hp i.down').length, win: !!document.querySelector('.hr.win') }));
  console.log(JSON.stringify(res));
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
})();
