// Tufan açılışındaki uzun işlerin kaynağı: profil sayfa açılır açılmaz başlar; soru açılışı çevresindeki pencerede
// (−1,5 … +3,5 sn) işlev başına öz süre ve uzun işlerin içindeki en büyük işlevler.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]);
    }).observe({ type: 'longtask', buffered: true });
    const iv = setInterval(() => {
      if (document.querySelector('.fl-q.on')) {
        window.__qOpen = performance.now();
        clearInterval(iv);
      }
    }, 10);
  });
  await p.goto(`file://${process.env.DIST || '/home/user/GAME-/game/fetih/dist'}/SoruGalerisi.html?q=1#tufan`);
  const c = await p.context().newCDPSession(p);
  await c.send('Profiler.enable');
  await c.send('Profiler.setSamplingInterval', { interval: 250 });
  await c.send('Profiler.start');
  const pn0 = await p.evaluate(() => performance.now());
  await p.waitForFunction(() => window.__qOpen, null, { timeout: 180000, polling: 50 });
  await p.waitForTimeout(4000);
  const { profile } = await c.send('Profiler.stop');
  const { qOpen, lt } = await p.evaluate(() => ({ qOpen: window.__qOpen, lt: window.__lt }));
  // profil zamanı (µs) → performance.now (ms): ilk örnek ≈ Profiler.start anı ≈ pn0
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const ch of n.children || []) parent.set(ch, n.id);
  let t = 0;
  const win = [];
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i];
    const ms = pn0 + (t - 0) / 1000;
    win.push([ms, profile.samples[i], profile.timeDeltas[i + 1] || 0]);
  }
  const L = lt.filter(([s]) => s > qOpen - 1500 && s < qOpen + 4000);
  console.log('uzun işler (soru açılışına göre):', L.map(([s, d]) => `${Math.round(s - qOpen)}ms:${Math.round(d)}ms`).join('  '));
  for (const [s, d] of L) {
    const self = new Map();
    const incl = new Map();
    for (const [ms, id, dt] of win) {
      if (ms < s || ms > s + d) continue;
      const n = byId.get(id);
      const k = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber}`;
      self.set(k, (self.get(k) || 0) + dt / 1000);
      // kapsayıcı: yığındaki her işlev
      const seen = new Set();
      for (let q = id; q != null; q = parent.get(q)) {
        const m = byId.get(q);
        const kk = `${m.callFrame.functionName || '(anon)'}:${m.callFrame.lineNumber}`;
        if (seen.has(kk)) continue;
        seen.add(kk);
        incl.set(kk, (incl.get(kk) || 0) + dt / 1000);
      }
    }
    const top = (M) => [...M.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join(' | ');
    console.log(`\n== ${Math.round(s - qOpen)}ms, ${Math.round(d)}ms\n öz: ${top(self)}\n kapsayan: ${top(incl)}`);
  }
  await b.close();
})();
