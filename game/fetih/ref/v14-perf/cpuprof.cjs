// CPU profili (V8 örnekleyici): defterde düello akışı boyunca ana iş parçacığında en çok zaman yiyen işlevler.
const { chromium } = require('playwright');
const fs = require('fs');
const tag = process.argv[2] || 'x';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  const page = process.env.PAGE || 'SoruGalerisi.html';
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/${page}?q=${process.env.Q || 1}#choice`);
  await p.waitForFunction(() => window.__fl?.app?.match, null, { timeout: 120000 });
  const c = await p.context().newCDPSession(p);
  await c.send('Profiler.enable');
  await c.send('Profiler.setSamplingInterval', { interval: 200 });
  await c.send('Profiler.start');
  await p.evaluate(async () => {
    for (let k = 0; k < 2; k++) {
      await new Promise((res) => {
        const chk = () => (document.querySelector('.fl-q.on') ? res() : setTimeout(chk, 100));
        chk();
      });
      await new Promise((r) => setTimeout(r, 2500));
      if (k === 0) document.getElementById('g-next')?.click();
    }
  });
  const { profile } = await c.send('Profiler.stop');
  // öz süre (self time) işlev başına
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas;
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]);
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
    self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${v.toFixed(0).padStart(6)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
  fs.writeFileSync(`/home/user/work/cpuprof_${tag}.txt`, `toplam ${total.toFixed(0)} ms\n` + top.join('\n'));
  console.log(`toplam ${total.toFixed(0)} ms\n` + top.join('\n'));
  await b.close();
})();
