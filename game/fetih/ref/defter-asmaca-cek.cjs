// Adam asmaca A/B: defterde gerçek dokunuşlarla oynatılır, her an DOM anlık kaydedilip 2x çekilir.
const { chromium } = require('playwright');
const fs = require('fs');
const MAP = 'data:image/png;base64,' + fs.readFileSync('/home/user/work/harita.png').toString('base64');
const type = process.argv[2];
const pre = process.argv[3];
(async () => {
  const { BANK } = await import('/home/user/GAME-/game/fetih/src/data/bank.js');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1, hasTouch: false });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const shots = [];
  const snap = async (n) => {
    const h = await p.evaluate((MAP) => {
      const d = document.documentElement.cloneNode(true);
      d.querySelectorAll('script,canvas,.gal,.gal-pn').forEach((x) => x.remove());
      d.querySelector('head').insertAdjacentHTML('afterbegin', '<meta charset="utf-8">');
      d.querySelector('head').insertAdjacentHTML('beforeend', `<style>body{background:#0b1020 url(${MAP}) center top/100% auto no-repeat!important}*{animation-delay:-10s!important;animation-play-state:paused!important}</style>`);
      // canlı stiller (css değişkenleri) inline kalır; pointer capture vb. yok
      return '<!DOCTYPE html>' + d.outerHTML;
    }, MAP);
    fs.writeFileSync(`/home/user/work/${n}.html`, h);
    shots.push(n);
  };
  await p.goto(`file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=0#${type}`);
  await p.waitForSelector('.fl-q.on:not(.rv) .fl-qbody > div', { timeout: 30000 });
  await p.evaluate(() => document.getElementById('g-time').click()); // sınırsız süre (yavaş başsız tarayıcıda süre dolmasın)
  await p.waitForTimeout(600);
  await p.waitForSelector('.fl-q.on:not(.rv) .fl-qbody > div', { timeout: 30000 });
  await p.waitForTimeout(2500);
  const hint = await p.evaluate(() => document.querySelector('.fl-qtext').textContent);
  const q = BANK.find((x) => x.type === 'hang' && x.q === hint);
  const word = q.w.toLocaleUpperCase('tr-TR');
  console.log('kelime', word);
  await snap(pre + '1');
  {
    const tray = await p.evaluate(() => [...document.querySelectorAll('.gl-ball')].map((b) => b.textContent));
    const W = [...word];
    const good = tray.map((c, i) => [c, i]).filter(([c]) => W.includes(c)).map(([, i]) => i);
    const bad = tray.map((c, i) => [c, i]).filter(([c]) => !W.includes(c)).map(([, i]) => i);
    const tap = async (i) => { const r = await (await p.$$('.gl-ball'))[i].boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 20, { steps: 3 }); await p.mouse.up(); };
    await tap(good[0]); await p.waitForTimeout(900);
    await tap(bad[0]); await p.waitForTimeout(250);
    await snap(pre + '2a');
    await p.waitForTimeout(900);
    await tap(good[1]); await p.waitForTimeout(150);
    await snap(pre + '2');
    await p.waitForTimeout(900);
    for (const i of good.slice(2)) { await tap(i); await p.waitForTimeout(500); }
    await p.waitForTimeout(900);
    await snap(pre + '3');
  }
  await p.waitForSelector('.fl-q.rv', { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(1200);
  await snap(pre + '4');
  console.log(errs.join('\n') || 'hata yok');
  await b.close();
  const b2 = await chromium.launch();
  const q2 = await b2.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  for (const n of shots) { await q2.goto(`file:///home/user/work/${n}.html`); await q2.waitForTimeout(1200); await q2.screenshot({ path: `/home/user/work/${n}.jpg`, quality: 90 }); }
  await b2.close();
})();
