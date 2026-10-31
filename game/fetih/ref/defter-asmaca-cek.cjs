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
  if (type === 'asmaca_kasa') {
    const dw = await p.$('.as-dw');
    const box = await dw.boundingBox();
    // sürükle: kadranı sola çevir
    await p.mouse.move(box.x + box.width * 0.7, box.y + 100);
    await p.mouse.down();
    for (let k = 1; k <= 8; k++) await p.mouse.move(box.x + box.width * 0.7 - k * 14, box.y + 100);
    await p.mouse.up();
    await p.waitForTimeout(900);
    // harfler: bir yanlış, sonra kelimenin harfleri (sonuncusu hariç)
    const uniq = [...new Set([...word].filter((c) => c !== ' '))];
    const seq = ['Ö', uniq[0], 'Ğ', ...uniq.slice(1, -1)];
    const tapLetter = async (c) => {
      // görünür değilse önce kadranı o harfe çevir: pencereye dokunmadan önce programla çevir
      await p.evaluate((c) => document.querySelector(`.as-kasa .fl-key[data-k="${c}"]`).click(), c);
      await p.waitForTimeout(650);
    };
    for (const c of seq) await tapLetter(c);
    await snap(pre + '2');
    // son harfi gerçek dokunuşla: önce kadrana sürükleyerek getirmek yerine görünürse dokun
    await tapLetter(uniq[uniq.length - 1]);
    await p.waitForTimeout(300);
    await snap(pre + '3');
  } else {
    const path = await p.evaluate(() => null);
    // doğru yolu bul: ızgara harfleri + kelime → DFS
    const grid = await p.evaluate(() => [...document.querySelectorAll('.as-c')].map((b) => b.textContent));
    const L = [...word].filter((c) => c !== ' ');
    const near = (a, b) => a !== b && Math.abs((a % 8) - (b % 8)) <= 1 && Math.abs(Math.floor(a / 8) - Math.floor(b / 8)) <= 1;
    let sol = null;
    const dfs = (pth) => {
      if (pth.length === L.length) return (sol = pth.slice()), true;
      for (let c = 0; c < 24; c++) if (grid[c] === L[pth.length] && !pth.includes(c) && (!pth.length || near(c, pth[pth.length - 1]))) { pth.push(c); if (dfs(pth)) return true; pth.pop(); }
      return false;
    };
    dfs([]);
    const centers = await p.evaluate(() => [...document.querySelectorAll('.as-c')].map((b) => { const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    const drawTo = async (cells, release) => {
      await p.mouse.move(...centers[cells[0]]);
      await p.mouse.down();
      for (let i = 1; i < cells.length; i++) await p.mouse.move(...centers[cells[i]], { steps: 4 });
      if (release) await p.mouse.up();
    };
    // yanlış deneme: doğru yolun ilk yarısı + komşu yanlış hücre(ler) tam uzunlukta
    const wrongPath = sol.slice(0, L.length - 1);
    const alt = [...Array(24).keys()].find((c) => near(c, wrongPath[wrongPath.length - 1]) && !wrongPath.includes(c) && c !== sol[L.length - 1]);
    if (alt != null) { await drawTo([...wrongPath, alt], true); await p.waitForTimeout(1600); }
    // çizerken: doğru yolun 2/3'ü, parmak basılı
    await drawTo(sol.slice(0, Math.ceil(L.length * 0.66)), false);
    await snap(pre + '2');
    await p.mouse.up();
    await p.waitForTimeout(500);
    await p.waitForTimeout(300);
    await drawTo(sol, true);
    await p.waitForTimeout(700);
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
