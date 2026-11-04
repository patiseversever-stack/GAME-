// Karşılaştırma (hilo) yerleşim taraması: bankadaki bütün sorular × iki yerleşim × 360/390/412 px; isim taşması, VS ve eğik kenar çakışması, rozet ve fark çipi. Giriş: karsilastirma_tarama_giris.js (esbuild ile paketlenir).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[360, 640], [390, 844], [412, 892]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file:///tmp/claude-0/-home-user/fe79b1eb-0adb-5b11-8d68-d1363e2a6c54/scratchpad/hl/s2.html');
    await p.addStyleTag({ content: `body{width:${w}px!important;--vw:${w / 100}px}` });
    await p.waitForTimeout(800);
    const pre = await p.evaluate(() => audit());
    await p.evaluate(() => reveal());
    await p.waitForTimeout(2200);
    const post = await p.evaluate(() => audit());
    console.log(`== ${w}x${h}: soru ekranı ${pre.length} sorun, cevap ekranı ${post.length} sorun ${errs.length ? 'HATA ' + errs.join('|') : ''}`);
    for (const x of [...pre.map((s) => 'S ' + s), ...post.map((s) => 'C ' + s)].slice(0, 40)) console.log('  ' + x);
    if (w === 360) await p.screenshot({ path: '/home/user/work/gorsel/hl_tum360.png', fullPage: true });
  }
  await b.close();
})();
