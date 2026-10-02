/* =====================================================================
   GÖLGE FİGÜRLERİ — Bézier silüetler, 2B iskelet, deri ve koreografi
   Her figür: katmanlar (SVG yolları ya da kodla üretilen eğriler),
   kemikler ve perform(t, S): saf zaman fonksiyonu, tekrar izlenebilir.
   Tanımlar SVG uzayında yazılır (y aşağı, saat yönü pozitif dönüş);
   çıktı perde birimidir (y yukarı, figür merkezi orijinde).
   ===================================================================== */
const SF_STEP = 4.5;

/* ---------- SVG yolu → kübik segmentler ---------- */
function sfParse(d) {
  const tk = d.match(/[MmLlHhVvCcSsQqZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const subs = []; let cur = null, i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0, pcx = null, pcy = null;
  const n = () => +tk[i++];
  const close = () => { if (cur && cur.length) cur.push([x, y, x + (sx - x) / 3, y + (sy - y) / 3, x + (2 * (sx - x)) / 3, y + (2 * (sy - y)) / 3, sx, sy]); x = sx; y = sy; cur = null; };
  const cub = (x1, y1, x2, y2, x3, y3) => { cur.push([x, y, x1, y1, x2, y2, x3, y3]); x = x3; y = y3; };
  const line = (nx, ny) => cub(x + (nx - x) / 3, y + (ny - y) / 3, x + (2 * (nx - x)) / 3, y + (2 * (ny - y)) / 3, nx, ny);
  while (i < tk.length) {
    if (/^[A-Za-z]$/.test(tk[i])) cmd = tk[i++];
    const rel = cmd >= 'a', C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    let keepC = false;
    if (C === 'Z') { close(); continue; }
    if (C === 'M') { if (cur) close(); x = n() + ox; y = n() + oy; sx = x; sy = y; cur = []; subs.push(cur); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') line(n() + ox, n() + oy);
    else if (C === 'H') line(n() + ox, y);
    else if (C === 'V') line(x, n() + oy);
    else if (C === 'C') { const a = n() + ox, b = n() + oy, c = n() + ox, e = n() + oy, f = n() + ox, g = n() + oy; cub(a, b, c, e, f, g); pcx = c; pcy = e; keepC = true; }
    else if (C === 'S') { const rx = pcx != null ? 2 * x - pcx : x, ry = pcy != null ? 2 * y - pcy : y, c = n() + ox, e = n() + oy, f = n() + ox, g = n() + oy; cub(rx, ry, c, e, f, g); pcx = c; pcy = e; keepC = true; }
    else if (C === 'Q') { const qx = n() + ox, qy = n() + oy, f = n() + ox, g = n() + oy; cub(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), f + (2 / 3) * (qx - f), g + (2 / 3) * (qy - g), f, g); }
    else { i++; continue; }
    if (!keepC) pcx = pcy = null;
  }
  if (cur) close();
  return subs.filter((s) => s.length > 1);
}
// kübikleri düzleştir; counts verilirse aynı örnekleme (morf hedefleri için)
function sfFlat(subs, counts) {
  const polys = [], cnt = []; let k = 0;
  for (const s of subs) {
    const p = [s[0][0], s[0][1]];
    for (const g of s) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = g;
      const m = counts ? counts[k] : Math.max(1, Math.ceil((Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / SF_STEP));
      cnt.push(m); k++;
      for (let j = 1; j <= m; j++) { const t = j / m, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t; p.push(a * x0 + b * x1 + c * x2 + e * x3, a * y0 + b * y1 + c * y2 + e * y3); }
    }
    p.length -= 2; // kapanış noktası = ilk nokta
    polys.push(p);
  }
  return { polys, counts: cnt };
}
const sfArea = (p) => { let a = 0; for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return a / 2; };
const sfRev = (p) => { const o = new Array(p.length); for (let i = 0, n = p.length / 2; i < n; i++) { o[i * 2] = p[(n - 1 - i) * 2]; o[i * 2 + 1] = p[(n - 1 - i) * 2 + 1]; } return o; };

/* ---------- şekil üreticileri (SVG uzayı) ---------- */
// kalınlığı değişen şerit: merkez çizgisi boyunca w(s) genişlik, uçlar yuvarlak
function sfStroke(line, w0, w1, capA = 1, capB = 1, prof = null) {
  const n = line.length / 2, L = [], R = [], wd = (i) => { const s = i / (n - 1); return (w0 + (w1 - w0) * s) * (prof ? prof(s) : 1) / 2; };
  const tan = (i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = line[b * 2] - line[a * 2], dy = line[b * 2 + 1] - line[a * 2 + 1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  for (let i = 0; i < n; i++) { const [ux, uy] = tan(i), w = wd(i); L.push(line[i * 2] - uy * w, line[i * 2 + 1] + ux * w); R.push(line[i * 2] + uy * w, line[i * 2 + 1] - ux * w); }
  const out = L.slice();
  if (capB) { const [ux, uy] = tan(n - 1), w = wd(n - 1), cx = line[(n - 1) * 2], cy = line[(n - 1) * 2 + 1]; for (let k = 1; k < 6; k++) { const th = (k / 6) * PI, c = Math.cos(th), s = Math.sin(th); out.push(cx + (-uy * c + ux * s) * w, cy + (ux * c + uy * s) * w); } }
  for (let i = n - 1; i >= 0; i--) out.push(R[i * 2], R[i * 2 + 1]);
  if (capA) { const [ux, uy] = tan(0), w = wd(0), cx = line[0], cy = line[1]; for (let k = 1; k < 6; k++) { const th = (k / 6) * PI, c = Math.cos(th), s = Math.sin(th); out.push(cx + (uy * c - ux * s) * w, cy + (-ux * c - uy * s) * w); } }
  return out;
}
// kübik Bézier'i nokta dizisine çevir (merkez çizgileri için)
function sfCurve(x0, y0, x1, y1, x2, y2, x3, y3, n = 16) { const o = []; for (let j = 0; j <= n; j++) { const t = j / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t; o.push(a * x0 + b * x1 + c * x2 + e * x3, a * y0 + b * y1 + c * y2 + e * y3); } return o; }
function sfEllipse(cx, cy, rx, ry, rot = 0, n = 28) { const o = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push(cx + x * c - y * s, cy + x * s + y * c); } return o; }
// tırtıklı yaprak: tabandan uca, genişlik w, diş sayısı
function sfLeaf(x0, y0, x1, y1, w, teeth = 0, n = 26) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, o = [];
  for (let side = 1; side >= -1; side -= 2) for (let k = 0; k <= n; k++) {
    const s = side > 0 ? k / n : 1 - k / n, prof = Math.pow(Math.sin(PI * Math.pow(s, 0.85)), 0.9) * (1 - 0.15 * s);
    const tooth = teeth ? (1 + 0.09 * Math.max(0, Math.sin(s * teeth * PI * 2)) * (s > 0.1 && s < 0.95 ? 1 : 0)) : 1;
    const hw = (w / 2) * prof * tooth;
    if ((side < 0 && (k === 0 || k === n))) continue;
    o.push(x0 + ux * s * L + nx * hw * side, y0 + uy * s * L + ny * hw * side);
  }
  return o;
}

/* ---------- 2B afin matrisler [a,b,c,d,e,f]: x' = a x + c y + e ---------- */
const sfMul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const SF_I = [1, 0, 0, 1, 0, 0];
const sfXf = (p, tx, ty, rot = 0, sc = 1, sy = sc) => { const c = Math.cos(rot), s = Math.sin(rot), o = new Array(p.length); for (let i = 0; i < p.length; i += 2) { const x = p[i] * sc, y = p[i + 1] * sy; o[i] = tx + x * c - y * s; o[i + 1] = ty + x * s + y * c; } return o; };

/* ---------- figür derleyici ---------- */
// def: { key, name, line, dur, bones:{ad:[ebeveyn, px,py, tx,ty]}, layers:[{id, d|pts|gen, bind|bone, m:{morf:d}, hole, prop}], k0, perform, events }
function sfCompile(def) {
  const F = { def, bones: [], bi: {}, layers: [] };
  for (const [name, b] of Object.entries(def.bones)) {
    const o = { name, parent: b[0] ? F.bi[b[0]] : -1, px: b[1], py: b[2], tx: b[3] ?? b[1], ty: b[4] ?? b[2] };
    F.bi[name] = F.bones.length; F.bones.push(o);
  }
  const k0 = Object.assign({}, def.k0 || {});
  for (const L of def.layers) {
    const ly = { id: L.id, prop: !!L.prop, hole: !!L.hole, bone: L.bone != null ? F.bi[L.bone] : -1, gen: L.gen || null, polys: null, morphs: {}, w: null };
    if (!L.gen) {
      let polys, counts;
      const X = L.xf ? (pp) => pp.map((q) => sfXf(q, ...L.xf)) : (pp) => pp;
      if (L.d) { const f = sfFlat(sfParse(L.d)); polys = X(f.polys); counts = f.counts; }
      else polys = (Array.isArray(L.pts[0]) ? L.pts : [L.pts]).map((p) => p.slice());
      const hs = L.holeSub || [], rev = polys.map((p, i) => (sfArea(p) < 0) !== (ly.hole || hs.includes(i))); // SVG uzayında y aşağı: ekranda saat yönü = pozitif alan
      ly.polys = polys.map((p, i) => (rev[i] ? sfRev(p) : p));
      for (const [mn, md] of Object.entries(L.m || {})) {
        const mp = X(sfFlat(sfParse(md), counts).polys);
        if (mp.length !== polys.length || mp.some((p, i) => p.length !== polys[i].length)) { console.warn('morf uyumsuz', def.key, L.id, mn); continue; }
        ly.morphs[mn] = mp.map((p, i) => (rev[i] ? sfRev(p) : p));
      }
      // deri ağırlıkları: kemik parçalarına uzaklık, yumuşak geçiş
      const bind = (L.bind || [L.bone]).map((n) => F.bi[n]), sig = L.soft || 16;
      ly.w = ly.polys.map((p) => {
        const W = [];
        for (let i = 0; i < p.length; i += 2) {
          const x = p[i], y = p[i + 1], ds = bind.map((bi) => { const b = F.bones[bi], dx = b.tx - b.px, dy = b.ty - b.py, l2 = dx * dx + dy * dy, t = l2 > 0 ? clamp01(((x - b.px) * dx + (y - b.py) * dy) / l2) : 0; return Math.hypot(x - b.px - dx * t, y - b.py - dy * t); });
          const dm = Math.min(...ds); let ws = ds.map((d) => Math.exp(-Math.pow((d - dm) / sig, 2))); const s = ws.reduce((a, v) => a + v, 0); ws = ws.map((v) => v / s);
          const top = ws.map((v, k) => [v, bind[k]]).filter((e) => e[0] > 0.02).sort((a, b) => b[0] - a[0]).slice(0, 3), ts = top.reduce((a, e) => a + e[0], 0);
          W.push(top.map((e) => [e[1], e[0] / ts]));
        }
        return W;
      });
    }
    F.layers.push(ly);
  }
  // dinlenme pozu, merkez ve ölçek
  F.k0 = k0;
  const rest = sfPose(F, sfNewPose(F)), xs = [], ys = [];
  rest.forEach((r) => { if (r.prop || r.hole) return; for (let i = 0; i < r.p.length; i += 2) { xs.push(r.p[i]); ys.push(r.p[i + 1]); } });
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  F.cx = (x0 + x1) / 2; F.cy = (y0 + y1) / 2;
  F.sc = def.scale || Math.min((def.fitW || 4.4) / (x1 - x0), (def.fitH || 3.4) / (y1 - y0));
  F.w = (x1 - x0) * F.sc; F.h = (y1 - y0) * F.sc;
  return F;
}
function sfNewPose(F) {
  const S = { b: {}, m: {}, hide: {}, k: Object.assign({}, F.k0) };
  for (const b of F.bones) S.b[b.name] = { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
  for (const L of F.def.layers) if (L.prop && !L.show) S.hide[L.id] = 1;
  return S;
}
function sfResetPose(F, S) {
  for (const b of F.bones) { const o = S.b[b.name]; o.r = 0; o.x = 0; o.y = 0; o.sx = 1; o.sy = 1; }
  for (const k in S.m) S.m[k] = 0; for (const k in S.hide) delete S.hide[k];
  for (const L of F.def.layers) if (L.prop && !L.show) S.hide[L.id] = 1;
  Object.assign(S.k, F.k0);
}
// poz → SVG uzayında çokgenler [{id, prop, hole, p:[x,y,...]}]
function sfPose(F, S) {
  const M = F.bones.map(() => null);
  F.bones.forEach((b, i) => {
    const q = S.b[b.name], c = Math.cos(q.r), s = Math.sin(q.r), a = c * q.sx, bb = s * q.sx, cc = -s * q.sy, d = c * q.sy;
    const loc = [a, bb, cc, d, b.px + q.x - (a * b.px + cc * b.py), b.py + q.y - (bb * b.px + d * b.py)];
    M[i] = b.parent >= 0 ? sfMul(M[b.parent], loc) : loc;
  });
  const out = [];
  for (const ly of F.layers) {
    if (S.hide[ly.id]) continue;
    if (ly.gen) {
      const polys = ly.gen(S.k, S) || [], m = ly.bone >= 0 ? M[ly.bone] : SF_I;
      for (const p0 of polys) { const hl = ly.hole || !!p0.hole, p = hl === (sfArea(p0) > 0) ? sfRev(p0) : p0.slice(); for (let i = 0; i < p.length; i += 2) { const x = p[i], y = p[i + 1]; p[i] = m[0] * x + m[2] * y + m[4]; p[i + 1] = m[1] * x + m[3] * y + m[5]; } out.push({ id: ly.id, prop: ly.prop, hole: hl, p }); }
      continue;
    }
    const mw = Object.entries(ly.morphs).filter(([n]) => S.m[n] > 0.0001);
    ly.polys.forEach((p0, pi) => {
      const W = ly.w[pi], p = new Array(p0.length);
      for (let i = 0, v = 0; i < p0.length; i += 2, v++) {
        let x = p0[i], y = p0[i + 1];
        for (const [n, tg] of mw) { const w = S.m[n]; x += (tg[pi][i] - p0[i]) * w; y += (tg[pi][i + 1] - p0[i + 1]) * w; }
        let X = 0, Y = 0;
        for (const [bi, w] of W[v]) { const m = M[bi]; X += (m[0] * x + m[2] * y + m[4]) * w; Y += (m[1] * x + m[3] * y + m[5]) * w; }
        p[i] = X; p[i + 1] = Y;
      }
      out.push({ id: ly.id, prop: ly.prop, hole: ly.hole, p });
    });
  }
  return out;
}
// SVG uzayı → perde birimi (y yukarı, merkezlenmiş)
function sfToWall(F, polys) {
  return polys.map((r) => { const q = new Float32Array(r.p.length); for (let i = 0; i < r.p.length; i += 2) { q[i] = (r.p[i] - F.cx) * F.sc; q[i + 1] = -(r.p[i + 1] - F.cy) * F.sc; } return { id: r.id, prop: r.prop, hole: r.hole, p: q }; });
}

/* ---------- koreografi yardımcıları (saf zaman fonksiyonları) ---------- */
// anahtar kareler: [[t, v, ease?], ...] — ease bir sonraki kareye geçişte kullanılır
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b[0]) { const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), e = a[2] || 'io'; const k = e === 'lin' ? u : e === 'in' ? u * u * u : e === 'out' ? 1 - Math.pow(1 - u, 3) : e === 'back' ? Ease.outBack(u, 2.2) : e === 'snap' ? 1 - Math.pow(1 - u, 5) : e === 'hold' ? 0 : u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * k; }
  }
  return keys[keys.length - 1][1];
}
// sönümlü yay tepkisi: t0 anındaki darbeden sonra
const ring = (t, t0, amp, f = 3, dec = 4) => (t < t0 ? 0 : amp * Math.sin((t - t0) * f * TAU) * Math.exp(-(t - t0) * dec));
// zincir boyunca ilerleyen dalga (kuyruk, hortum)
const hash1 = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const wave = (t, i, f, amp, lag = 0.6) => Math.sin(t * f * TAU - i * lag) * amp;
// Catmull-Rom yol: keys [[t, x, y], ...] → [x, y]
function crPath(t, K) {
  if (t <= K[0][0]) return [K[0][1], K[0][2]]; const n = K.length; if (t >= K[n - 1][0]) return [K[n - 1][1], K[n - 1][2]];
  let i = 0; while (i < n - 2 && t > K[i + 1][0]) i++;
  const P0 = K[Math.max(0, i - 1)], P1 = K[i], P2 = K[i + 1], P3 = K[Math.min(n - 1, i + 2)], u = (t - P1[0]) / (P2[0] - P1[0]), u2 = u * u, u3 = u2 * u;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return [f(P0[1], P1[1], P2[1], P3[1]), f(P0[2], P1[2], P2[2], P3[2])];
}
const win = (t, a, b, fa = 0.15, fb = 0.15) => smoothstep(a - fa, a + fa, t) * (1 - smoothstep(b - fb, b + fb, t));
