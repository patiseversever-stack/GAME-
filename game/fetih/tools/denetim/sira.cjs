// Defterde SEÇİM SIRASI: sahne seçilir, soru cevaplanır, ekran iki anda çekilir. node sira.cjs <dist> <etiket> <tıklama sayısı>
const { chromium } = require('playwright');
const [dist, tag, clicks] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/SoruGalerisi.html?q=1#choice`);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 150000 });
  for (let k = 0; k < +clicks; k++) { await p.evaluate(() => document.getElementById('g-scene')?.click()); await p.waitForTimeout(1500); }
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-opt'), null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const sc = await p.evaluate(() => document.querySelector('#g-scene em')?.textContent);
  await p.locator('.fl-q.on .fl-opt').nth(0).click();
  await p.waitForFunction(() => document.querySelector('.fl-res.on.sira'), null, { timeout: 120000 });
  await p.waitForTimeout(300); await p.screenshot({ path: `${tag}_a.png`, clip: { x: 0, y: 130, width: 412, height: 470 }, timeout: 120000 });
  await p.waitForTimeout(1200); await p.screenshot({ path: `${tag}_b.png`, clip: { x: 0, y: 130, width: 412, height: 470 }, timeout: 120000 });
  console.log(tag, sc, errs.join(' | ') || 'hata yok');
  await b.close();
})();
