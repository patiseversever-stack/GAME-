const { chromium } = require('playwright');
(async () => {
  const out = [];
  for (const [tag, dist] of [['önce', '/home/user/work/akis/once_dist'], ['sonra', '/home/user/GAME-/game/fetih/dist']]) for (const t of ['order', 'match']) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 412, height: 892 } });
    await p.goto(`file://${dist}/SoruGalerisi.html?q=1#${t}`);
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody'), null, { timeout: 150000 });
    await p.evaluate(() => document.getElementById('g-time')?.click());
    await p.waitForTimeout(2500);
    await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-send'), null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    out.push(tag + ' ' + t + ' ' + JSON.stringify(await p.evaluate(() => {
      const q = document.querySelector('.fl-q.on'); const r = q.getBoundingClientRect(); const s = q.querySelector('.fl-send').getBoundingClientRect();
      const body = q.querySelector('.fl-ord-list, .fl-mat').getBoundingClientRect();
      return { kartUst: Math.round(r.top), haritaGorunen: Math.round(r.top), tahta: Math.round(body.height), onayla: Math.round(s.height) };
    })));
    await b.close();
  }
  console.log(out.join('\n'));
})();
