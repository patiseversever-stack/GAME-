const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/FetihLigi.html?q=0&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 120000 });
  console.log(await p.evaluate(() => {
    const rel = window.__fl.app.board.relief;
    const run = () => { let best = 1e9; for (let r = 0; r < 7; r++) { const t = performance.now(); let a = 0; for (let i = 0; i < 200000; i++) a += rel.height((i % 997) * 0.05 - 20, ((i / 997) | 0) * 0.05 - 5); best = Math.min(best, performance.now() - t); } return best.toFixed(1); };
    const pads = rel.pads;
    const withP = run();
    if (rel.setPads) rel.setPads(null);
    const noP = run();
    if (rel.setPads) rel.setPads(pads);
    return `teraslı ${withP} ms · terassız ${noP} ms (200 bin okuma, en iyi 7 tur)`;
  }));
  await b.close();
})();
