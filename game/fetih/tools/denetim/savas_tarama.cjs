// node savas_tarama.cjs <dist>: 81 ilin bütün komşu çiftleri + kuşatmalar; yapıya değen ya da denizde/harita dışında duran asker
// Bütün komşu il çiftlerinde (sahra) ve başkent kuşatmalarında: asker yolu alçalmayan bir yapıya ya da başka kaleye değiyor mu
const { chromium } = require('playwright');
const [dist] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto(`file://${dist}/FetihLigi.html?q=1&debug`);
  await p.waitForFunction(() => window.__fl?.app, null, { timeout: 600000 });
  const r = await p.evaluate(() => {
    const app = window.__fl.app, bd = app.board, cin = app.cinema;
    const sites = app.props.landmarks.sites.filter((s) => !s.sea);
    const out = []; let n = 0;
    const sinks = (s, c) => { const abx = c[2] - c[0], abz = c[3] - c[1]; const t = Math.min(1, Math.max(0, ((s.x - c[0]) * abx + (s.z - c[1]) * abz) / Math.max(abx * abx + abz * abz, 1e-4))); return Math.hypot(s.x - c[0] - abx * t, s.z - c[1] - abz * t) - s.s * 0.45 < c[4] - 0.45; };
    const check = (src, tgt, cap) => {
      let pl; try { pl = cin.stagePlan(src, tgt, cap); } catch (e) { out.push(`${bd.provinces[src].name}>${bd.provinces[tgt].name} HATA ${e.message}`); return; }
      n++;
      const pts = []; const ph = [];
      const add = (side, x0, z0, ux, uz) => { const vx = -uz, vz = ux; for (const s of side.slots) { if (s.fix) continue; pts.push([x0 + vx * s.lat - ux * s.dep, z0 + vz * s.lat - uz * s.dep, side.__ph]); } };
      for (const t of [0, 0.5, 1]) (pl.att.__ph = 'yürüyüş' + t, add(pl.att, pl.att.sx + (pl.att.ex - pl.att.sx) * t, pl.att.sz + (pl.att.ez - pl.att.sz) * t, pl.att.ux, pl.att.uz));
      pl.att.__ph = 'hücum'; add(pl.att, pl.att.ex + pl.att.ux * pl.charge, pl.att.ez + pl.att.uz * pl.charge, pl.att.ux, pl.att.uz);
      for (const t of [0, 1]) { const ux = pl.def.ux, uz = pl.def.uz; const vx = uz, vz = -ux; for (const s of pl.def.slots) { if (s.fix) continue; const x0 = pl.def.sx + (pl.def.ex - pl.def.sx) * t, z0 = pl.def.sz + (pl.def.ez - pl.def.sz) * t; pts.push([x0 - vx * s.lat - ux * s.dep, z0 - vz * s.lat - uz * s.dep, 'savunan' + t]); } }
      for (const s of sites) { if (sinks(s, pl.clear)) continue; let hit = 0; for (const [x, z] of pts) if (Math.hypot(x - s.x, z - s.z) < s.r * 0.75) hit++; if (hit) out.push(`${bd.provinces[src].name}>${bd.provinces[tgt].name}${cap ? ' kale' : ''}: ${hit} asker ${s.kind} (alçalmıyor)`); }
      const by = {}; for (const [x, z, f] of pts) if (bd.pick(x, z) < 0) by[f] = (by[f] || 0) + 1; const tot = Object.values(by).reduce((a, b) => a + b, 0); if (tot > 2) out.push(`${bd.provinces[src].name}>${bd.provinces[tgt].name}${cap ? ' kale' : ''}: denizde ${JSON.stringify(by)} ${pl.amphib ? 'çıkarma' : ''}`);
    };
    for (const P of bd.provinces) for (const id of P.nb) { const q = bd.byId.get(id); check(P.index, q.index, false); }
    // kuşatma: her il kendi komşusundan (ilk komşu); kalesi görünür olmalı
    const k = app.castles[1]; 
    for (const P of bd.provinces) { const q = bd.byId.get(P.nb[0]); if (!q) continue; k.place(bd.castleAt(P.index, new app.V3())); k.group.visible = true; check(q.index, P.index, true); }
    k.group.visible = false;
    return { n, out };
  });
  console.log('plan', r.n); console.log(r.out.join('\n') || 'sorun yok');
  await b.close();
})();
