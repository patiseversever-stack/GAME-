// Kalan uzun işlerin ne olduğu: uzun işin başladığı anda hangi işlev yığında (örnekleyici profilden zaman eşlemesi)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 412, height: 892 } });
  await p.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); });
  await p.goto('file:///home/user/GAME-/game/fetih/dist/SoruGalerisi.html?q=1#choice');
  await p.waitForFunction(() => window.__fl?.app?.match, null, { timeout: 120000 });
  const c = await p.context().newCDPSession(p);
  await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start');
  const t0 = await p.evaluate(() => performance.now());
  await p.evaluate(async () => { window.__lt.length = 0; for (let k = 0; k < 2; k++) { await new Promise((res) => { const chk = () => (document.querySelector('.fl-q.on') ? res() : setTimeout(chk, 100)); chk(); }); await new Promise((r) => setTimeout(r, 2500)); if (k === 0) document.getElementById('g-next')?.click(); } });
  const { profile } = await c.send('Profiler.stop');
  const lts = await p.evaluate(() => window.__lt);
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map(); for (const n of profile.nodes) for (const ch of n.children || []) parent.set(ch, n.id);
  // örnek zamanları (profil başı = startTime µs)
  let t = profile.startTime;
  const samples = profile.samples.map((s, i) => { t += profile.timeDeltas[i]; return [t / 1000, s]; });
  // performance.now ile profil saati farklı: uzun işleri en yoğun (boşta olmayan) örnek kümesiyle eşle
  for (const [st, du] of lts) {
    const agg = new Map();
    // profil saati performance.timeOrigin tabanlı değil; yerine en uzun boşta-olmayan ardışık dilimleri bul
  }
  // en uzun boşta olmayan ardışık örnek dizileri
  const runs = []; let cur = null;
  for (const [tm, s] of samples) { const n = byId.get(s); const idle = n.callFrame.functionName === '(idle)'; if (!idle) { if (!cur) cur = { a: tm, b: tm, ids: [] }; cur.b = tm; cur.ids.push(s); } else if (cur) { runs.push(cur); cur = null; } }
  runs.sort((x, y) => (y.b - y.a) - (x.b - x.a));
  for (const r of runs.slice(0, 3)) {
    const cnt = new Map();
    for (const id of r.ids) { let k = id; const chain = []; while (k && chain.length < 8) { const f = byId.get(k).callFrame; if (f.functionName) chain.push(f.functionName); k = parent.get(k); } const key = chain.slice(0, 5).join(' < '); cnt.set(key, (cnt.get(key) || 0) + 1); }
    console.log(`--- ${(r.b - r.a).toFixed(0)} ms`); console.log([...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${v} ${k}`).join('\n'));
  }
  console.log('uzun işler', lts.map(([s, d]) => d.toFixed(0)).join(' '));
  await b.close();
})();
