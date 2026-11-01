const { chromium } = require('playwright');
(async () => {
  const out = [];
  for (const t of ['anagram', 'cross', 'hang', 'choice', 'tufan']) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 412, height: 892 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    p.on('console', (m) => m.type() === 'error' && errs.push('konsol: ' + m.text().slice(0, 160)));
    await p.goto(`file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=1#${t}`);
    try {
      await p.waitForFunction(() => document.querySelector('.fl-q.on'), null, { timeout: 150000 });
      await p.waitForTimeout(3000);
    } catch (e) {
      errs.push('kart açılmadı');
    }
    out.push(`${t}: ${errs.length ? errs.join(' | ') : 'hata yok'}`);
    await b.close();
  }
  console.log(out.join('\n'));
})();
