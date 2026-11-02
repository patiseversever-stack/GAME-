// Takılma profili: CDP Profiler ile savaş filmi başı (ya da kaydırma) ve uzun karelerin içeriği.
// node prof.cjs <dist> <kademe> <yavaşlatma> <sahne: film|pan>
const { chromium } = require('playwright');
const [dist, tier, rate, scene] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
  await p.goto(`file://${dist}/FetihLigi.html?q=${tier}&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 600000 });
  await p.evaluate(async () => { const app = window.__fl.app; await app.debugScene({ show: 'none', cfg: { mode: 'ffa4', region: 'icanadolu', seed: 7, bot: 'er' }, seconds: 0.2 }); app.start?.(); });
  if (process.env.WAITH) { const ms = await p.evaluate(async () => { const h = window.__fl.app.hayat; if (h) await h.start(); return h ? h.placeMs : -1; }); console.log('hayat yerleşimi', ms, 'ms'); }
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const app = window.__fl.app; const fr = app.frame.bind(app); window.__long = []; app.frame = (dt) => { const s = performance.now(); const r = fr(dt); const d = performance.now() - s; if (d > 40) window.__long.push(Math.round(d)); return r; }; });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  if (scene === 'film') await p.evaluate(() => { const app = window.__fl.app, m = app.match; const a = m.players[1]; const t = m.attackable(a)[0]; const d = m.players[m.owner(t)]; app.cinema.attack(a, d, t, false); });
  else await p.evaluate(() => { const app = window.__fl.app; const c = app.cam; let k = 0; window.__pan = setInterval(() => { c.yaw += 0.02; c.yawTo = c.yaw; c.dist = c.distTo = 18 + Math.sin(k++ * 0.05) * 8; app._moved = true; }, 16); });
  await p.waitForTimeout(scene === 'film' ? 5000 : 9000);
  const { profile } = await cdp.send('Profiler.stop');
  const long = await p.evaluate(() => window.__long);
  // öz süre (self time) fonksiyon başına
  const dt = {};
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]);
    const k = `${n.callFrame.functionName || '(anon)'} @${(n.callFrame.url || '').split('/').pop()}:${n.callFrame.lineNumber}`;
    dt[k] = (dt[k] || 0) + (profile.timeDeltas[i] || 0);
  }
  const top = Object.entries(dt).sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`);
  console.log(`kademe ${tier} ×${rate} ${scene}: uzun kareler (>40ms) ${JSON.stringify(long.slice(0, 20))}`);
  console.log(top.join('\n'));
  const par = new Map(); for (const n of profile.nodes) for (const c of n.children || []) par.set(c, n.id);
  const cnt = {}; for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); if (n.callFrame.functionName !== (process.env.WHO || 'getBoundingClientRect')) continue; let chain = []; let id = par.get(n.id); for (let k = 0; k < 5 && id; k++) { const q = byId.get(id); chain.push(`${q.callFrame.functionName||'anon'}:${q.callFrame.lineNumber}`); id = par.get(id); } const key = chain.join(' < '); cnt[key] = (cnt[key] || 0) + (profile.timeDeltas[i] || 0); }
  console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${(v/1000).toFixed(0)}ms ${k}`).join('\n'));
  await b.close();
})();
