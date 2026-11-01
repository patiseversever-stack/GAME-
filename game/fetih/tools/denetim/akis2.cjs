// Soru → cevap anı → sonuç ekranı → film: zaman çizelgesi ekran görüntüleri. node akis.cjs <dist> <etiket> <tip>
const { chromium } = require('playwright');
const [dist, tag, typ] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${dist}/SoruGalerisi.html?q=1#${typ}`);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 150000 });
  await p.evaluate(() => document.getElementById('g-time')?.click());
  await p.waitForTimeout(2500);
  await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const shot = async (n) => p.screenshot({ path: `/home/user/work/akis/${tag}_${typ}_${n}.png` });
  await shot('1soru');
  if (typ === 'order') { await p.locator('.fl-q.on .fl-ord-row').nth(0).click(); await p.locator('.fl-q.on .fl-ord-row').nth(1).click(); await p.waitForTimeout(500); await shot('1b'); await p.locator('.fl-q.on .fl-send').click({ timeout: 5000 }).catch(() => {}); }
  else await p.locator('.fl-q.on .fl-opt').nth(1).click();
  const t0 = Date.now();
  const at = async (ms, n) => { const w = ms - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await shot(n); };
  await at(1700, '2cevap');
  try { await p.waitForFunction(() => document.querySelector('.fl-res.on .rs-r'), null, { timeout: 15000 }); await p.waitForTimeout(250); await shot('3sonuc'); } catch (e) { await at(4300, '3sonuc'); }
  await at(7500, '4sonra');
  console.log(tag, typ, errs.join(' | ') || 'hata yok');
  await b.close();
})();
