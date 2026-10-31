// Süre satırının üç anı: gerçek oyun DOM'u (ch1.html) üzerinde rengi ve çubuğu ayarlayıp çeker.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  const S = [[19, 0.95, 'rgb(48,209,88)', false], [11, 0.55, 'rgb(255,176,4)', false], [3, 0.15, 'rgb(255,48,44)', true]];
  let k = 0;
  for (const [n, f, c, hot] of S) {
    await p.goto('file:///home/user/work/ch1.html');
    await p.evaluate(([n, f, c, hot]) => {
      document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{transition:none!important}</style>');
      const q = document.querySelector('.fl-q');
      q.style.setProperty('--tcol', c);
      q.classList.toggle('hot', hot);
      q.querySelector('.fl-clock b').textContent = n;
      const i = q.querySelector('.fl-tbar i');
      i.style.animation = 'none';
      i.style.transform = `scaleX(${f})`;
    }, [n, f, c, hot]);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const e = document.querySelector('.fl-qhead').getBoundingClientRect(); const t = document.querySelector('.fl-tbar').getBoundingClientRect(); return { y: e.top - 10, h: t.bottom - e.top + 22 }; });
    await p.screenshot({ path: `/home/user/work/sure${++k}.png`, clip: { x: 0, y: r.y, width: 412, height: r.h } });
  }
  await b.close();
})();
