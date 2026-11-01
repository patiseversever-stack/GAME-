// Eşleştir akışı: boş → bir bağ → üç bağ → cevap → sonuç → sonra. node esles.cjs <dist> <etiket>
const { chromium } = require('playwright');
const [dist, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/SoruGalerisi.html?q=1#match`);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 150000 });
  await p.evaluate(() => document.getElementById('g-time')?.click());
  await p.waitForTimeout(2500);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-mat-it'), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const shot = async (n) => p.screenshot({ path: `/home/user/work/akis/${tag}_match_${n}.png` });
  await shot('1soru');
  const L = p.locator('.fl-q.on .l .fl-mat-it'), R = p.locator('.fl-q.on .r .fl-mat-it');
  await L.nth(0).click(); await p.waitForTimeout(3500); await shot('1secili');
  await R.nth(1).click(); await p.waitForTimeout(4500); await shot('1b');
  await L.nth(1).click(); await R.nth(0).click(); await p.waitForTimeout(6000); await shot('1c');
  await p.locator('.fl-q.on .fl-send').click({ timeout: 5000 }).catch(() => {});
  const t0 = Date.now();
  const at = async (ms, n) => { const w = ms - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await shot(n); };
  await at(1500, '2a');
  await at(3600, '2cevap');
  try { await p.waitForFunction(() => document.querySelector('.fl-res.on .rs-r'), null, { timeout: 15000 }); await p.waitForTimeout(400); await shot('3sonuc'); } catch (e) { await at(4300, '3sonuc'); }
  await at(8000, '4sonra');
  console.log(tag, errs.join(' | ') || 'hata yok');
  await b.close();
})();
