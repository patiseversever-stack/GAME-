const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.goto(`file://${process.argv[2]}/SoruGalerisi.html?q=1#tufan`);
  await p.waitForFunction(() => document.querySelector('.fl-q.on'), null, { timeout: 180000 });
  const out = [];
  for (let k = 0; k < 6; k++) {
    await p.waitForTimeout(700);
    out.push(await p.evaluate(() => { const a = window.__fl.app; const s = a.nightLights.spot; const U = a.G.uSpot.value; return `spot.on=${s.on} k=${s.k.toFixed(2)} uSpot.w=${U.w.toFixed(2)} r=${U.z.toFixed(2)} gece=${a.G.uNight.value.x.toFixed(2)}`; }));
  }
  await p.screenshot({ path: '/home/user/work/spot_' + (process.argv[3] || 'x') + '.png' });
  console.log(out.join('\n'));
  await b.close();
})();
