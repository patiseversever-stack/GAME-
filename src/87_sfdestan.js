
/* =====================================================================
   DESTAN — Ergenekon'dan Cumhuriyet'e (XVI–XXV. perdeler)
   Yeni görsel dil: tasvir ışığı (Karagöz deri tasvirleri gibi renkli,
   ışık geçiren gölgeler), derinlik (uzak katmanlar soluk ve küçük),
   gökyüzü ışığı (gece, şafak), sinema şeritleri ve alt yazılar.
   Katman/çokgen "tc": perdeden geçen ışığın rengi (siyah = tam gölge).
   ===================================================================== */
// derinlik tonları: uzaklaştıkça açılan, hafif soğuyan gölge
const SD_FAR = [0.5, 0.5, 0.56], SD_MID = [0.26, 0.24, 0.26];
const sdTc = (c, a) => [lerp(c[0], 1, a), lerp(c[1], 1, a), lerp(c[2], 1, a)]; // a: 0 → c, 1 → tam saydam
const sdTag = (p, tc) => { if (tc) p.tc = tc; return p; };
const sdBump = (x, c, w) => { const u = (x - c) / w; return Math.abs(u) < 1 ? 0.5 + 0.5 * Math.cos(u * PI) : 0; };
const sdPt = (P, i) => [P[i * 2], P[i * 2 + 1]];
// çokgen dönüşümü (ölçek, konum, yansıma)
function sdX(p, tx, ty, s, flip = 1, rot = 0) { const c = Math.cos(rot), sn = Math.sin(rot), o = new Array(p.length); for (let i = 0; i < p.length; i += 2) { const x = p[i] * s * flip, y = p[i + 1] * s; o[i] = tx + x * c - y * sn; o[i + 1] = ty + x * sn + y * c; } if (p.hole) o.hole = 1; if (p.tc) o.tc = p.tc; return o; }
// başka bir figürün katmanlarını (kemikleriyle) yeni sahneye yerleştir
function sdImport(def, ids, { tx = 0, ty = 0, sc = 1, pre = '', ko = null } = {}) {
  const X = (x) => tx + x * sc, Y = (y) => ty + y * sc, P = (p) => { const q = new Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = X(p[i]); q[i + 1] = Y(p[i + 1]); } if (p.hole) q.hole = 1; if (p.tc) q.tc = p.tc; return q; };
  const bones = {};
  for (const [n, b] of Object.entries(def.bones)) bones[pre + n] = [b[0] ? pre + b[0] : null, X(b[1]), Y(b[2]), X(b[3] ?? b[1]), Y(b[4] ?? b[2])];
  const layers = def.layers.filter((L) => ids.includes(L.id)).map((L) => {
    const o = { id: pre + L.id, soft: (L.soft || 16) * sc };
    for (const k of ['prop', 'show', 'glow', 'back', 'hole', 'holeSub', 'tc']) if (L[k] != null) o[k] = L[k];
    if (L.bind) o.bind = L.bind.map((n) => pre + n); if (L.bone) o.bone = pre + L.bone;
    if (L.gen) { const g = L.gen; o.gen = (k, S) => (g(ko ? Object.assign({}, k, k[ko] || {}) : k, S) || []).map(P); }
    else if (L.d) { let ps = sfFlat(sfParse(L.d)).polys; if (L.xf) ps = ps.map((q) => sfXf(q, ...L.xf)); o.pts = ps.map(P); }
    else o.pts = (Array.isArray(L.pts[0]) ? L.pts : [L.pts]).map(P);
    return o;
  });
  return { bones, layers };
}

/* ---------- ortak çizimler ---------- */
// sıradağ: tepe noktaları arasında kırıklı sırt; mf(x) sırtı aşağı çeker (erime)
function sdRidge(peaks, yb, seed = 1, mf = null, jag = 7, floor = yb) {
  const o = [peaks[0][0], yb];
  for (let i = 0; i < peaks.length - 1; i++) {
    const [ax, ay] = peaks[i], [bx, by] = peaks[i + 1], n = Math.max(2, Math.round(Math.abs(bx - ax) / 9));
    for (let j = 0; j < n; j++) {
      const u = j / n, x = lerp(ax, bx, u), e = u * u * (3 - 2 * u); let y = lerp(ay, by, e) + (j ? (hash1(seed + i * 31 + j) - 0.5) * jag * 2 : 0);
      if (mf) y = lerp(y, floor, mf(x)); o.push(x, y);
    }
  }
  const [lx, ly] = peaks[peaks.length - 1]; o.push(lx, mf ? lerp(ly, floor, mf(lx)) : ly, lx, yb);
  return o;
}
// at ve süvari (yan görünüş, sağa bakar): ph adım fazı, g: dörtnal miktarı
function sdHorse(x, y, s, ph, o = {}) {
  const f = o.flip ? -1 : 1, out = [], g = o.gal ?? 1, rr = o.rear || 0, w = TAU * ph;
  const bob = -Math.abs(Math.sin(w)) * 5 * g, rot = Math.sin(w) * 0.05 * g - rr * 0.6;
  const L = (pts, a, b, cap = 1) => sfStroke(pts, a, b, cap, cap);
  const leg = (hx, hy, a, k, wd) => { const kx = hx + Math.sin(a) * 22, ky = hy + Math.cos(a) * 22, fx = kx + Math.sin(a + k) * 22, fy = ky + Math.cos(a + k) * 22; return [L([hx, hy, kx, ky], wd, wd * 0.6), L([kx, ky, fx, fy], wd * 0.6, wd * 0.45), sfEllipse(fx + 1.5, fy + 1, 4, 2.6)]; };
  const local = [];
  // bacaklar: arka çift ve ön çift, dörtnal ritmi
  const A = (off) => Math.sin(w + off) * 0.55 * g, K = (off) => Math.max(0, Math.sin(w + off + 1.2)) * 0.9 * g;
  local.push(...leg(-26, -40, A(0.6), K(0.6), 9), ...leg(-20, -40, A(0), K(0), 9));
  local.push(...leg(22, -40, A(PI + 0.5) - rr * 1.3, K(PI + 0.5) + rr * 1.4, 8.5), ...leg(28, -40, A(PI) - rr * 1.1, K(PI) + rr * 1.2, 8.5));
  // gövde, boyun, baş
  local.push(sfStroke(sfCurve(-38, -52, -14, -60, 14, -60, 36, -52, 10), 1, 1, 1, 1, (u) => 26 + Math.sin(u * PI) * 6));
  local.push(L(sfCurve(28, -58, 36, -70, 40, -80, 46, -88, 8), 18, 11));
  local.push(L(sfCurve(44, -92, 52, -88, 58, -80, 62, -74, 6), 12, 7));
  local.push([42, -92, 44, -104, 48, -92]); // kulak
  // yele ve kuyruk (rüzgârda)
  const fl = o.flow ?? g;
  local.push(L(sfCurve(-38, -56, -50 - fl * 6, -58 + fl * 2, -56 - fl * 10, -46 + fl * 4, -58 - fl * 12, -30 + fl * 10, 8), 9, 3));
  for (let i = 0; i < 4; i++) { const u = i / 3, bx = lerp(28, 44, u), by = lerp(-62, -88, u); local.push(L([bx, by, bx - 7 - fl * 6, by - 2 + Math.sin(w * 2 + i) * 2], 5, 1.5)); }
  if (o.rider !== false) {
    // süvari: börk, kaftan eteği, dizgin
    const lean = o.lean ?? 0.1 * g, cx = -4, cy = -66;
    const T = (px, py) => [cx + (px - cx) * Math.cos(lean) - (py - cy) * Math.sin(lean), cy + (px - cx) * Math.sin(lean) + (py - cy) * Math.cos(lean)];
    const tor = [...T(-6, -64), ...T(-2, -78), ...T(2, -92)];
    local.push(L(tor, 15, 11), sfEllipse(...T(3, -99), 6, 6.5, 0, 12), sfEllipse(...T(2, -105), 5.5, 7, -0.15, 12));
    local.push(L([...T(-6, -64), ...T(8, -56), ...T(6, -42)], 9, 6), L([...T(-10, -66), ...T(-14, -56)], 10, 6));
    const arm = o.arm ?? 0; // 0 dizgin, 1 kılıç yukarı, 2 yay gerer
    if (arm === 1) local.push(L([...T(1, -88), ...T(10, -100), ...T(14, -114)], 6, 4.5), L([...T(14, -112), ...T(20, -140)], 3.2, 1.6, 0));
    else if (arm === 2) {
      const a = o.bowA ?? 0, [sx0, sy0] = T(1, -88), bx = sx0 + Math.cos(a) * 18, by = sy0 + Math.sin(a) * 18, nx = -Math.sin(a), ny = Math.cos(a), dr = o.draw ?? 0.6;
      local.push(L([sx0, sy0, bx, by], 6, 4.5));
      local.push(sfStroke(sfCurve(bx - nx * 22, by - ny * 22, bx + Math.cos(a) * 9 - nx * 10, by + Math.sin(a) * 9 - ny * 10, bx + Math.cos(a) * 9 + nx * 10, by + Math.sin(a) * 9 + ny * 10, bx + nx * 22, by + ny * 22, 8), 2.6, 2.6, 1, 1));
      const px = bx - Math.cos(a) * 16 * dr, py = by - Math.sin(a) * 16 * dr; local.push(L([bx - nx * 22, by - ny * 22, px, py, bx + nx * 22, by + ny * 22], 1.1, 1.1, 0), L([sx0 - 2, sy0 + 2, px, py], 5, 4));
      if (o.arrow) local.push(L([px, py, bx + Math.cos(a) * 14, by + Math.sin(a) * 14], 1.6, 1.6, 0));
    }
    else local.push(L([...T(1, -88), ...T(12, -78), 30, -74], 6, 3));
    if (o.tug) { const [px, py] = T(-8, -70); local.push(L([px, py, px - 4, py - 70], 2.6, 2.2, 0), L(sfCurve(px - 4, py - 70, px - 12 - fl * 6, py - 64, px - 16 - fl * 10, py - 54, px - 18 - fl * 14, py - 40 + Math.sin(w) * 3, 8), 7, 2), sfEllipse(px - 4, py - 72, 3.5, 3.5, 0, 8)); }
    if (o.flag) { const [px, py] = T(-8, -70), fw = o.flag; local.push(L([px, py, px - 2, py - 80], 2.4, 2, 0)); const fp = []; for (let j = 0; j <= 8; j++) { const u = j / 8; fp.push(px - 2 - u * fw, py - 80 + Math.sin(u * 4 - w * 2) * 3 * u); } for (let j = 8; j >= 0; j--) { const u = j / 8; fp.push(px - 2 - u * fw, py - 80 + fw * 0.62 + Math.sin(u * 4 - w * 2) * 3 * u); } local.push(sdTag(fp, o.flagTc)); }
  }
  for (const p of local) { const q = sdX(p, 0, 0, 1, 1, rot); out.push(sdX(q, x, y + bob * s, s, f)); }
  if (o.tc) out.forEach((p) => { if (!p.tc) p.tc = o.tc; });
  return out;
}
// yürüyen insan (yan görünüş, sağa): ph adım, o: yük, sancak, meşale, kadın (başörtü + uzun etek)
function sdWalker(x, y, s, ph, o = {}) {
  const f = o.flip ? -1 : 1, w = TAU * ph, st = o.stride ?? 1, L = (pts, a, b) => sfStroke(pts, a, b, 1, 1), loc = [];
  const bob = -Math.abs(Math.cos(w)) * 2.4 * st, lean = o.lean ?? 0.06;
  const leg = (a) => { const hx = 0, hy = -46 + bob, kx = hx + Math.sin(a) * 23, ky = hy + Math.cos(a) * 23, b = Math.max(0, -Math.sin(a)) * 0.9, fx = kx + Math.sin(a - b) * 23, fy = ky + Math.cos(a - b) * 23; return [L([hx, hy, kx, ky], 10, 7.5), L([kx, ky, fx, fy], 7.5, 5.5), sfEllipse(fx + 3.5, fy + 1, 6, 2.6)]; };
  if (o.robe) loc.push([-10, -50 + bob, 10, -50 + bob, 14 + Math.sin(w) * 2, -2, -14 + Math.sin(w) * 2, -2]);
  else loc.push(...leg(Math.sin(w) * 0.42 * st), ...leg(-Math.sin(w) * 0.42 * st));
  const sh = [Math.sin(lean) * 44, -88 + bob];
  loc.push(L([0, -48 + bob, sh[0] * 0.5, -70 + bob, sh[0], sh[1]], 15, 13));
  loc.push(sfEllipse(sh[0] + 2, sh[1] - 11, 7, 8, 0, 14));
  if (o.scarf) loc.push([sh[0] - 9, sh[1] - 12, sh[0] - 4, sh[1] - 21, sh[0] + 5, sh[1] - 20, sh[0] + 9, sh[1] - 12, sh[0] + 3, sh[1] + 6, sh[0] - 13, sh[1] + 10 + (o.wind || 0) * 8]);
  else if (o.hat === 'kalpak') loc.push([sh[0] - 7, sh[1] - 15, sh[0] - 6, sh[1] - 27, sh[0] + 8, sh[1] - 27, sh[0] + 9, sh[1] - 15]);
  else if (o.hat !== false) loc.push(sfEllipse(sh[0] + 1, sh[1] - 18, 7, 6, 0, 10));
  const sw = Math.sin(w) * 0.5 * st;
  if (o.torch || o.flag || o.pole) {
    const hx = sh[0] + 10, hy = sh[1] - 8; loc.push(L([sh[0], sh[1] + 2, sh[0] + 8, sh[1] + 10, hx, hy], 6, 5));
    loc.push(L([hx, hy + 30, hx + 2, hy - (o.flag ? 60 : 26)], 2.4, 2.2));
    if (o.flag) { const fw = 34, fp = [], t = o.t || 0; for (let j = 0; j <= 8; j++) { const u = j / 8; fp.push(hx + 2 - u * fw, hy - 60 + Math.sin(u * 4 - t * 6) * 3 * u); } for (let j = 8; j >= 0; j--) { const u = j / 8; fp.push(hx + 2 - u * fw, hy - 60 + 22 + Math.sin(u * 4 - t * 6) * 3 * u); } loc.push(sdTag(fp, o.flagTc)); }
  } else loc.push(L([sh[0], sh[1] + 2, sh[0] + Math.sin(sw) * 16, sh[1] + 20, sh[0] + Math.sin(sw) * 20 + 4, sh[1] + 36], 6.5, 5));
  if (o.pack) loc.push(sfEllipse(sh[0] - 12, sh[1] + 12, 11, 15, 0.2, 14));
  return loc.map((p) => { const q = sdX(sdX(p, 0, 0, 1, 1, 0), x, y, s, f); if (o.tc && !q.tc) q.tc = o.tc; return q; });
}
// kıvılcım ve kor yağmuru (ön ışık)
function sdSparks(u, n, seed, x, y, o = {}) {
  if (u < 0 || u > (o.life || 0.8)) return [];
  const out = [], up = o.up ?? 160, sp = o.sp ?? 120, g = o.g ?? 320, r = o.r ?? 3.4;
  for (let i = 0; i < n; i++) { const a = -PI / 2 + (hash1(seed + i) - 0.5) * (o.cone ?? 2.2), v = 0.5 + hash1(seed + i + 50); const px = x + Math.cos(a) * sp * v * u, py = y + Math.sin(a) * up * v * u + g * u * u, k = 1 - u / (o.life || 0.8); out.push(sfStroke([px, py, px - Math.cos(a) * 9 * k, py - Math.sin(a) * 9 * k + 4], r * k + 0.6, 0.6, 1, 1)); }
  return out;
}
// duman: yükselip genişleyen yarı saydam topaklar
function sdSmoke(t0, t, x, y, n, seed, o = {}) {
  const u = t - t0; if (u < 0) return []; const out = [], life = o.life || 3, tc = o.tc || [0.55, 0.52, 0.5];
  for (let i = 0; i < n; i++) { const v = u - i * (o.gap ?? 0.18); if (v < 0 || v > life) continue; const k = v / life, r = (o.r0 ?? 10) + k * (o.r1 ?? 46), px = x + (hash1(seed + i) - 0.5) * 30 + (o.drift ?? 30) * k * 2 + Math.sin(v * 2 + i) * 6, py = y - (o.rise ?? 140) * Math.pow(k, 0.8); out.push(sdTag(sfEllipse(px, py, r, r * 0.86, i, 16), sdTc(tc, smoothstep(0.55, 1, k)))); }
  return out;
}

/* =====================================================================
   XVI. Ergenekon — demir dağ erir, Bozkurt yolu gösterir
   ===================================================================== */
const SD_ERG_PEAKS = [[-390, 40], [-330, -56], [-276, -122], [-250, -156], [-200, -160], [-146, -157], [-118, -132], [-70, -150], [-20, -116], [22, -138], [66, -110], [118, -160], [176, -124], [236, -168], [292, -110], [390, -26]];
const SD_ERG_C = 22, SD_ERG_GY = 198, SD_ERG_HZ = 126;
const sdErgMelt = (x, m) => Math.min(1, m * 1.12 * Math.pow(sdBump(x, SD_ERG_C, 92 + 46 * m), 0.72));
const sdErgRidgeY = (x) => { const P = SD_ERG_PEAKS; for (let i = 0; i < P.length - 1; i++) if (x >= P[i][0] && x <= P[i + 1][0]) { const u = (x - P[i][0]) / (P[i + 1][0] - P[i][0]); return lerp(P[i][1], P[i + 1][1], u * u * (3 - 2 * u)); } return 0; };
function sdErgVeins(k) {
  // erimiş damarlar: sırttan geçide akan kor (ön ışık), eriyen kenarlar, damlalar
  const o = [], h = k.heat || 0, m = k.melt || 0, C = SD_ERG_C; if (h <= 0.01) return o;
  const V = [[C - 34, -104, C - 10, 30, C + 2, 160], [C + 40, -98, C + 22, 20, C + 10, 166], [C - 76, -46, C - 34, 50, C - 12, 176], [C + 86, -54, C + 44, 64, C + 18, 178], [C - 120, 0, C - 70, 80, C - 30, 186]];
  V.forEach((v, i) => { const L = clamp01(h * 1.7 - i * 0.16) * (1 - m * 0.85); if (L <= 0.02) return; const c = sfCurve(v[0], v[1], v[2], v[3], v[2] + 6, v[3] + 44, v[4], v[5], 20), n = Math.max(2, Math.round((c.length / 2) * Math.min(1, L * 1.2))); o.push(sfStroke(c.slice(0, n * 2), 2.5 + h * 4, 1.4, 1, 1)); });
  if (m > 0.04) for (const sd of [-1, 1]) { const line = []; for (let j = 0; j <= 20; j++) { const x = C + sd * (4 + j * 7.5 * (0.35 + m)); line.push(x, lerp(sdErgRidgeY(x), SD_ERG_GY, sdErgMelt(x, m)) - 1); } o.push(sfStroke(line, 10 * (1 - m * 0.55) + 2, 2.5, 1, 1)); }
  for (let i = 0; i < 10 && m > 0.08 && m < 0.98; i++) { const u = ((k.t || 0) * 0.8 + hash1(i)) % 1, x = C + (hash1(i + 9) - 0.5) * 150 * m, y0 = lerp(sdErgRidgeY(x), SD_ERG_GY, sdErgMelt(x, m)), y = y0 + u * 40; o.push(sfEllipse(x, y, 3, 5 + u * 5, 0, 10)); }
  return o;
}
function sdErgSmith(k) {
  // demirci: örs başında çekiç sallar; körük ocağı canlandırır
  const o = [], h = k.ham || 0, x = 172, y = SD_ERG_GY, L = (p, a, b) => sfStroke(p, a, b, 1, 1);
  o.push([x - 46, y - 46, x - 8, y - 46, x - 14, y - 38, x - 20, y - 16, x - 8, y - 16, x - 8, y, x - 50, y, x - 50, y - 16, x - 36, y - 16, x - 40, y - 38]); // örs
  o.push(L([x + 18, y, x + 22, y - 30, x + 22, y - 54], 13, 15), L([x + 38, y, x + 34, y - 30, x + 28, y - 54], 13, 15));
  o.push([x + 6, y - 50, x + 42, y - 50, x + 44, y - 98, x + 36, y - 114, x + 14, y - 116, x + 6, y - 98]);
  o.push(sfEllipse(x + 25, y - 128, 11, 12, 0, 16), [x + 14, y - 132, x + 18, y - 146, x + 33, y - 146, x + 37, y - 132]);
  o.push([x + 34, y - 126, x + 44, y - 118, x + 34, y - 114]); // sakal
  const a = lerp(-0.35, -2.5, h), sx = x + 16, sy = y - 106, ex = sx + Math.cos(a) * 30, ey = sy + Math.sin(a) * 30, a2 = a - 0.5 * (1 - h), hx = ex + Math.cos(a2) * 26, hy = ey + Math.sin(a2) * 26, ha = a2 - 1.5;
  o.push(L([sx, sy, ex, ey, hx, hy], 11, 8), L([hx, hy, hx + Math.cos(ha) * 36, hy + Math.sin(ha) * 36], 4.5, 4.5));
  o.push(sfXf([-8, -12, 8, -12, 8, 12, -8, 12], hx + Math.cos(ha) * 36, hy + Math.sin(ha) * 36, ha + PI / 2));
  o.push(L([x + 30, y - 102, x + 8, y - 78, x - 20, y - 54], 10, 6), L([x - 20, y - 54, x - 40, y - 48], 3, 3));
  // körük
  const b = k.bel || 0, bx = 92;
  o.push([bx - 30, y - 4, bx + 10, y - 16 - b * 12, bx + 30, y - 10, bx + 30, y, bx - 30, y], L([bx + 30, y - 8, bx + 42, y - 22], 4, 4), L([bx - 30, y - 6, bx - 48, y - 8], 5, 4));
  return o;
}
function sdErgValley(k) {
  // geçitten ufka uzanan vadi tabanı: uzak ve aydınlık (derinlik)
  const m = k.melt || 0; if (m < 0.35) return [];
  const a = smoothstep(0.35, 0.8, m), C = SD_ERG_C, w0 = 120 * m, w1 = 10;
  const o = [sdTag([C - w0, SD_ERG_GY + 2, C - w1, SD_ERG_HZ, C + w1 + 6, SD_ERG_HZ, C + w0, SD_ERG_GY + 2], sdTc([0.42, 0.34, 0.3], 1 - a))];
  // ufukta uzak tepeler
  o.push(sdTag(sdRidge([[C - 60, SD_ERG_HZ + 4], [C - 30, SD_ERG_HZ - 10], [C, SD_ERG_HZ - 4], [C + 34, SD_ERG_HZ - 14], [C + 70, SD_ERG_HZ + 4]], SD_ERG_HZ + 8, 9, null, 3), sdTc(SD_FAR, 1 - a)));
  return o;
}
function sdErgMigration(k) {
  // göç: atlılar, yayalar, kağnı — soldan gelir, vadiye girip ışığa karışır
  const o = [], u0 = k.mig, C = SD_ERG_C; if (u0 < 0) return o;
  const mem = [['r', 0, { tug: 1 }], ['w', 0.5, { pole: 1 }], ['r', 0.95, {}], ['c', 1.45], ['w', 2.1, { scarf: 1 }], ['w', 2.45, { pack: 1 }], ['r', 2.9, { tug: 1 }]];
  for (const [ty, dl, op] of mem) {
    const u = u0 - dl; if (u < 0) continue;
    const sx = -780 + u * 215, gate = C - 46; let x = sx, y = SD_ERG_GY, s = 0.92, d = 0;
    if (sx > gate) { d = clamp01((sx - gate) / 290); const e = Ease.inOutCubic(d); x = lerp(gate, C + 4, e); y = lerp(SD_ERG_GY, SD_ERG_HZ + 2, e); s = lerp(0.92, 0.26, e); }
    if (d >= 1) continue;
    const tc = sdTc([0.05, 0.04, 0.04], smoothstep(0.25, 1, d) * 0.92);
    if (ty === 'r') o.push(...sdHorse(x, y, s, u * 1.15, Object.assign({ gal: 0.42, tc, flow: 0.4 }, op)));
    else if (ty === 'w') o.push(...sdWalker(x, y, s * 0.95, u * 0.95, Object.assign({ tc, t: u, wind: 0.5 }, op)));
    else {
      // kağnı: öküz + iki tekerlekli araba + keçe çadır yükü
      const ph = u * 1.0, P = (p) => sdTag(sdX(p, x, y, s), tc);
      o.push(P(sfStroke(sfCurve(-30, -48, -10, -54, 14, -54, 30, -46, 8), 1, 1, 1, 1, (v) => 24 + Math.sin(v * PI) * 4)));
      for (const [lx, of] of [[-24, 0], [-16, PI], [18, PI], [26, 0]]) o.push(P(sfStroke([lx, -40, lx + Math.sin(ph * TAU + of) * 6, -2], 6.5, 4, 1, 1)));
      o.push(P(sfStroke([30, -48, 44, -42, 50, -30], 13, 8, 1, 1)), P([26, -56, 22, -68, 34, -58]), P([34, -56, 42, -66, 40, -54]));
      o.push(P(sfStroke([-30, -42, -64, -40], 3.4, 3.4, 1, 1)));
      const cx = -92, wr = 25; o.push(P([cx - 36, -40, cx + 30, -40, cx + 27, -68, cx + 14, -86, cx - 12, -90, cx - 30, -72]));
      const wh = sfEllipse(cx, -wr, wr, wr, 0, 22), hub = sfEllipse(cx, -wr, wr * 0.62, wr * 0.62, 0, 16); hub.hole = 1; o.push(P(wh), P(hub));
      for (let j = 0; j < 3; j++) { const a = ph * 2.2 + (j * PI) / 3; o.push(P(sfStroke([cx + Math.cos(a) * wr * 0.7, -wr + Math.sin(a) * wr * 0.7, cx - Math.cos(a) * wr * 0.7, -wr - Math.sin(a) * wr * 0.7], 4, 4, 0, 0))); }
    }
  }
  return o;
}
function SD_ERG_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  // ışık: gece → demir ateşi → şafak
  const dawn = smoothstep(4.6, 7.6, t);
  k.sky = 0.94; k.skyT = [lerp(0.13, 0.42, dawn), lerp(0.16, 0.52, dawn), lerp(0.42, 0.9, dawn)]; k.skyB = [lerp(0.3, 1.3, dawn), lerp(0.24, 0.8, dawn), lerp(0.44, 0.42, dawn)]; k.skyY = lerp(0.36, 0.5, dawn); k.skyS = lerp(0.3, 0.22, dawn);
  k.lamp = lerp(0.6, 1.14, dawn);
  // gölge dağ, tasvire döner: demir rengi, yarı saydam
  S.tc.mountain = sdTc([0.26, 0.2, 0.19], 0) .map((v) => lerp(0, v, smoothstep(0.1, 1.2, t)));
  // demirci: beş vuruş; ısı birikir, dağ erir
  const hits = [0.9, 1.55, 2.2, 2.85, 3.5]; let ham = 0;
  for (const c of hits) { const u = (t - (c - 0.42)) / 0.52; if (u > 0 && u < 1) ham = u < 0.72 ? Ease.outCubic(u / 0.72) : 1 - Ease.inCubic((u - 0.72) / 0.28); }
  k.ham = ham; k.bel = Math.max(0, Math.sin(t * 5.2)) * (t < 4.4 ? 1 : 0.2);
  k.heat = smoothstep(0.7, 3.8, t); k.melt = Ease.inOutCubic(clamp01((t - 3.4) / 2.6));
  k.hits = hits.map((c) => t - c);
  k.gI = 0.4 + k.heat * 0.9 * (1 - k.melt * 0.5) + hits.reduce((a, c) => a + (t > c ? Math.exp(-(t - c) * 6) * 0.9 : 0), 0); k.gc = [1.0, 0.42, 0.1];
  k.gIB = smoothstep(4.2, 6.4, t) * 0.95; k.gcB = [1.0, 0.84, 0.55];
  k.sunY = lerp(SD_ERG_HZ + 60, SD_ERG_HZ - 34, Ease.outCubic(clamp01((t - 4.4) / 4.0)));
  // Bozkurt: kulak kabartır, şafağa uluyup geçide atlar, önden yürüyüp ışığa karışır
  const howl = kf(t, [[5.5, 0], [5.9, 1, 'out'], [6.7, 1], [7.0, 0]]);
  B.bkneck.r = -0.55 * howl + kf(t, [[0.5, 0], [0.9, 0.1], [3.0, 0.1], [3.4, -0.08], [5.0, -0.08], [5.5, 0]]); B.bkhead.r = -0.38 * howl;
  B.bkjaw.r = 0.42 * howl * (1 + Math.sin(t * 28) * 0.05);
  B.bkear.r = ring(t, 1.0, -0.35, 3, 5) + ring(t, 3.55, -0.3, 3, 5); B.bkearF.r = B.bkear.r * 0.9; B.bktail.r = Math.sin(t * 1.4) * 0.05 - 0.1 * howl; B.bkbody.sy = 1 + Math.sin(t * 2.2) * 0.012;
  if (t > 7.1) {
    const u = clamp01((t - 7.1) / 0.72);
    B.bkwolf.x = lerp(0, 150, u); B.bkwolf.y = lerp(0, 352, u * u) - Math.sin(u * PI) * 70; B.bkwolf.r = 0.35 * Math.sin(u * PI);
    const st = Math.sin(Math.min(1, u * 1.3) * PI * 0.5); B.bklnf.r = -0.9 * st; B.bklff.r = -0.8 * st; B.bklnh.r = 0.8 * st; B.bklfh.r = 0.7 * st; B.bktail.r = -0.3 * st;
    if (t > 7.82) {
      const w = t - 7.82, d = clamp01(w / 3.6), e = Ease.inOutCubic(d), ph = w * 1.5;
      B.bkwolf.x = 150 + e * 66; B.bkwolf.y = 352 - e * (SD_ERG_GY - SD_ERG_HZ) - ring(w, 0, 6, 2, 6); B.bkwolf.sx = B.bkwolf.sy = lerp(1, 0.3, e); B.bkwolf.r = 0;
      B.bklnf.r = B.bklff.r = B.bklnh.r = B.bklfh.r = 0;
      sfGait(B, [['bklnh', 'bkknh', 0, 1], ['bklfh', 'bkkfh', 0.5, 1], ['bklnf', 'bkknf', 0.5, 0], ['bklff', 'bkkff', 0, 0]], ph, 1, { swing: 0.34, knee: 0.7, lift: 6 });
      B.bkneck.r = w < 0.8 ? -0.2 * Math.sin((w / 0.8) * PI) : 0.04; B.bktail.r = -0.15;
      const fade = smoothstep(0.35, 1, d) * 0.9; for (const id of ['bkearF', 'bklff', 'bklfh', 'bktail', 'bkbody', 'bkjaw', 'bkear', 'bklnf', 'bklnh']) S.tc[id] = sdTc([0, 0, 0], fade);
    }
  }
  k.mig = t - 6.3;
  k.zoom = Ease.inOutCubic(clamp01((t - 5.0) / 5.0)) * 0.5; k.zx = SD_ERG_C; k.zy = 110;
}
const SD_ERGENEKON = (() => {
  const W = sdImport(SF_WOLF, ['earF', 'lff', 'lfh', 'tail', 'body', 'jaw', 'ear', 'lnf', 'lnh'], { tx: -185, ty: -193, sc: 0.62, pre: 'bk' });
  const C = SD_ERG_C;
  return {
    key: 'ergenekon', name: 'Ergenekon', line: 'Demirci körüğü bastı, demir dağ eridi; Bozkurt yolu gösterdi — Türkler Ergenekon’dan çıktı.', dur: 12.4, fitW: 4.7, fitH: 3.6, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.42, 0.1], glowColB: [1.0, 0.84, 0.55],
    caps: [[0.6, 3.3, '<small>Ergenekon</small>Dört yüz yıl… demirden dağların ardında.'], [3.7, 6.9, 'Demirci körüğü bastı, demir dağ eridi.'], [7.2, 9.8, 'Bozkurt öne düştü, yolu gösterdi…'], [10.0, 12.4, '…ve Türkler Ergenekon’dan çıktı.']],
    groups: [['bkearF', 'bklff', 'bklfh', 'bktail', 'bkbody', 'bkjaw', 'bkear', 'bklnf', 'bklnh'], ['mountain']],
    bones: Object.assign({}, W.bones, { world: [null, 0, 200, 100, 200] }),
    k0: { t: 0, melt: 0, heat: 0, ham: 0, bel: 0, gI: 0.4, gIB: 0, sunY: 220, mig: -1, sky: 0.94, skyT: [0.13, 0.16, 0.42], skyB: [0.3, 0.24, 0.44], skyY: 0.36, lamp: 0.6, hits: [] },
    layers: [
      { id: 'sun', glow: 1, back: 1, show: 1, gen: (k) => { const o = [sfEllipse(C + 6, k.sunY, 44, 44, 0, 32)]; if ((k.gIB || 0) > 0.05) for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * 0.13 + Math.sin((k.t || 0) * 0.5 + i * 1.7) * 0.025, r0 = 50, r1 = 300 + hash1(i) * 220, cx = C + 6, cy = k.sunY, w = 0.012 + hash1(i + 3) * 0.012; o.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1, cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1]); } return o; } },
      { id: 'farRange', prop: 1, show: 1, gen: () => [sdTag(sdRidge([[-700, 80], [-560, -30], [-470, 10], [-400, -20], [-380, 60]], 230, 3, null, 5), SD_FAR), sdTag(sdRidge([[380, 40], [470, -60], [570, -4], [700, 40]], 230, 5, null, 5), SD_FAR)] },
      { id: 'valley', prop: 1, show: 1, gen: (k) => sdErgValley(k) },
      { id: 'mountain', bone: 'world', gen: (k) => [sdRidge(SD_ERG_PEAKS, 214, 7, (k.melt || 0) > 0 ? (x) => sdErgMelt(x, k.melt) : null, 6, SD_ERG_GY)] },
      { id: 'ground', prop: 1, show: 1, gen: () => { const o = [[-900, SD_ERG_GY + 2, 900, SD_ERG_GY + 2, 900, 900, -900, 900]]; for (let i = 0; i < 26; i++) { const x = -720 + i * 58 + hash1(i) * 30; o.push(sfEllipse(x, SD_ERG_GY + 2, 8 + hash1(i + 4) * 14, 5 + hash1(i + 7) * 6, 0, 10)); } return o; } },
      { id: 'veins', glow: 1, show: 1, gen: (k) => sdErgVeins(k) },
      { id: 'smith', prop: 1, show: 1, gen: (k) => sdErgSmith(k) },
      { id: 'forge', glow: 1, show: 1, gen: (k) => { const o = []; if ((k.t || 0) <= 0.05) return o; const f = 0.55 + (k.bel || 0) * 0.45 + (k.heat || 0) * 0.5; o.push(sfEllipse(C + 4, SD_ERG_GY - 18 * f, 18 * f, 26 * f, 0, 16)); for (const c of k.hits || []) o.push(...sdSparks(c, 14, 7, 132, SD_ERG_GY - 48, { up: 180, sp: 140, life: 0.7 })); return o; } },
      ...W.layers,
      { id: 'migration', prop: 1, show: 1, gen: (k) => sdErgMigration(k) },
    ],
    perform: SD_ERG_PERFORM,
    events: [[0.4, 'night'], [0.9, 'hammer', { shake: 0.07 }], [1.55, 'hammer', { shake: 0.07 }], [2.2, 'hammer', { shake: 0.09 }], [2.85, 'hammer', { shake: 0.11 }], [3.5, 'hammer', { shake: 0.18, flash: [1, 0.5, 0.15, 0.22] }], [3.7, 'melt'], [4.8, 'dawn'], [5.55, 'howl'], [7.1, 'leap'], [6.6, 'march']],
  };
})();
SF_DEFS.push(SD_ERGENEKON);

/* =====================================================================
   XVII. Orhun Yazıtları — kaplumbağa kaideli taş, harfler ışıkla yanar
   ===================================================================== */
// runik işaretler (10×14 hücre): taşın göğsüne yukarıdan aşağı sütunlarla, sağdan sola
const SD_RUNES = [[[5, 14, 5, 0], [1, 4, 5, 0], [9, 4, 5, 0]], [[5, 14, 5, 6], [5, 6, 1, 0], [5, 6, 9, 0]], [[5, 0, 5, 14], [1, 3, 9, 11]], [[2, 0, 8, 7], [8, 7, 2, 14]], [[3, 0, 3, 14], [3, 4, 8, 0], [3, 9, 8, 5]], [[3, 0, 3, 14], [3, 0, 8, 5]],
  [[5, 0, 9, 7], [9, 7, 5, 14], [5, 14, 1, 7], [1, 7, 5, 0]], [[2, 0, 2, 14], [8, 0, 8, 14], [2, 5, 8, 9]], [[5, 0, 5, 14], [1, 5, 5, 1], [9, 5, 5, 1]], [[2, 0, 8, 14], [8, 0, 5, 7]], [[1, 0, 9, 0], [5, 0, 5, 14], [1, 14, 9, 14]], [[2, 0, 2, 14], [8, 0, 8, 14], [2, 0, 8, 7]], [[8, 0, 2, 7], [2, 7, 8, 14], [5, 3, 5, 11]], [[1, 2, 6, 12], [4, 2, 9, 12]]];
const SD_ORH_COLS = 4, SD_ORH_ROWS = 9;
function sdOrhRunes(n, asHole, w = 4.2) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const col = Math.floor(i / SD_ORH_ROWS), row = i % SD_ORH_ROWS, gx = 82 - col * 28, gy = -136 + row * 21, g = SD_RUNES[Math.floor(hash1(i * 7 + 3) * SD_RUNES.length)];
    for (const [a, b, c, d] of g) { const p = sfStroke([gx + a * 1.25, gy + b * 1.25, gx + c * 1.25, gy + d * 1.25], w, w, 1, 1); if (asHole) p.hole = 1; o.push(p); }
  }
  return o;
}
const SD_ORH_STELE = 'M -32 76 L -32 -150 C -32 -194 -4 -228 40 -236 C 84 -228 112 -194 112 -150 L 112 76 Z M -38 -150 C -44 -170 -40 -186 -28 -196 C -22 -184 -22 -168 -26 -152 Z M 118 -150 C 124 -170 120 -186 108 -196 C 102 -184 102 -168 106 -152 Z M 22 -232 C 26 -250 34 -258 40 -262 C 46 -258 54 -250 58 -232 Z';
const SD_ORH_TURTLE = 'M -98 132 C -96 96 -50 70 40 68 C 130 70 176 96 178 132 Z M 170 116 C 182 104 196 98 206 100 C 214 102 216 112 210 118 C 202 124 186 126 172 128 Z M 132 128 L 146 146 L 166 146 L 152 126 Z M -60 128 L -76 146 L -56 146 L -42 126 Z M -96 124 L -116 132 L -94 134 Z';
function SD_ORH_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  const dawn = smoothstep(7.2, 10.2, t);
  k.sky = 0.95; k.skyT = [lerp(0.1, 0.32, dawn), lerp(0.13, 0.55, dawn), lerp(0.36, 1.05, dawn)]; k.skyB = [lerp(0.22, 1.2, dawn), lerp(0.2, 0.86, dawn), lerp(0.38, 0.62, dawn)]; k.skyY = lerp(0.3, 0.38, dawn);
  k.lamp = lerp(0.66, 1.1, dawn);
  // harfler: sütun sütun belirir
  k.runes = Math.floor(clamp01((t - 0.8) / 4.6) * SD_ORH_COLS * SD_ORH_ROWS);
  k.gI = 0.35 + smoothstep(0.8, 2.0, t) * 0.75 + (k.runes < SD_ORH_COLS * SD_ORH_ROWS && t > 0.8 ? 0.15 * Math.sin(t * 9) : 0); k.gc = [1.0, 0.78, 0.36];
  k.gIB = (1 - dawn) * 0.85; k.gcB = [0.85, 0.9, 1.0];
  // süvari: bozkırı geçer, yayını göğe gerer, ok Demir Kazık olur
  k.rx = -640 + (t - 4.6) * 380; k.rph = (t - 4.6) * 2.1; k.ra = kf(t, [[5.4, 0], [5.9, -1.05, 'out'], [6.45, -1.05], [6.7, -0.3]]); k.rdraw = kf(t, [[5.5, 0], [6.1, 1, 'io'], [6.4, 1], [6.42, 0]]);
  k.arrow = t - 6.42; k.star = smoothstep(7.5, 8.0, t);
  B.thead.r = kf(t, [[6.2, 0], [6.8, -0.25, 'out'], [8.4, -0.25], [9.0, 0]]);
  k.zoom = kf(t, [[0, 0], [2.5, 0.4, 'io'], [4.5, 0.4], [6.0, 0.12, 'io'], [9, 0.12], [10.8, 0.28, 'io']]); k.zx = 40; k.zy = -60;
}
const SD_ORHUN = {
  key: 'orhun', name: 'Orhun Yazıtları', line: 'Bilge Kağan sözünü taşa kazıttı; harfler gecenin içinde yandı — bozkırdan bugüne.', dur: 10.8, fitW: 4.4, fitH: 3.8, tasvir: 1, cine: 1, ext: 1,
  glowCol: [1.0, 0.78, 0.36], glowColB: [0.85, 0.9, 1.0],
  caps: [[0.6, 3.5, '<small>Orhun Yazıtları · 732</small>Bilge Kağan, kardeşi Kül Tigin için taş diktirdi.'], [3.7, 7.0, '“Üstte gök çökmedikçe, altta yer delinmedikçe…”'], [7.2, 10.8, '“…Türk milleti, ilini ve töreni kim bozabilir?”']],
  bones: { world: [null, 0, 200, 100, 200], thead: [null, 172, 118, 210, 108] },
  k0: { t: 0, runes: 0, gI: 0.35, gIB: 0.85, rx: -900, rph: 0, ra: 0, rdraw: 0, arrow: -1, star: 0, sky: 0.95, skyT: [0.1, 0.13, 0.36], skyB: [0.22, 0.2, 0.38], skyY: 0.3, lamp: 0.66 },
  layers: [
    { id: 'stars', glow: 1, back: 1, show: 1, gen: (k) => { const o = []; for (let i = 0; i < 26; i++) { const x = -520 + hash1(i) * 1040, y = -480 + hash1(i + 30) * 300, r = 2 + hash1(i + 60) * 3 * (0.7 + 0.3 * Math.sin((k.t || 0) * 3 + i)); o.push(sfEllipse(x, y, r, r, 0, 8)); } return o; } },
    { id: 'farHills', prop: 1, show: 1, gen: () => [sdTag(sdRidge([[-700, 132], [-560, 70], [-420, 96], [-300, 60], [-170, 98], [-60, 84], [80, 102], [220, 64], [380, 96], [520, 70], [700, 120]], 160, 11, null, 4), SD_FAR), sdTag(sdRidge([[-700, 140], [-480, 110], [-260, 128], [0, 116], [300, 130], [700, 112]], 160, 13, null, 3), SD_MID)] },
    { id: 'turtle', bind: ['world'], d: SD_ORH_TURTLE, holeSub: [] },
    { id: 'thead', bind: ['thead'], soft: 8, d: 'M 168 120 C 180 106 196 98 207 100 C 216 102 218 113 211 119 C 203 125 186 127 170 129 Z' },
    { id: 'stele', bone: 'world', gen: (k) => { const o = sfFlat(sfParse(SD_ORH_STELE)).polys; const tm = sfStroke(sfCurve(40, -176, 30, -196, 24, -204, 16, -206, 6), 4, 3, 1, 1), tm2 = sfStroke(sfCurve(40, -176, 50, -196, 56, -204, 64, -206, 6), 4, 3, 1, 1), tm3 = sfStroke([40, -176, 40, -160], 4, 4, 1, 1); for (const h of [tm, tm2, tm3]) { h.hole = 1; o.push(h); } return o.concat(sdOrhRunes(k.runes || 0, true)); } },
    { id: 'runeGlow', glow: 1, show: 1, gen: (k) => sdOrhRunes(k.runes || 0, false, 3).concat(k.runes > 0 && k.runes < SD_ORH_COLS * SD_ORH_ROWS ? [sfEllipse(82 - Math.floor(k.runes / SD_ORH_ROWS) * 28 + 6, -136 + (k.runes % SD_ORH_ROWS) * 21 + 9, 10, 10, 0, 12)] : []) },
    { id: 'ground', prop: 1, show: 1, gen: (k) => { const o = [[-900, 146, 900, 146, 900, 900, -900, 900]], t = k.t || 0; for (let i = 0; i < 60; i++) { const x = -640 + i * 22 + hash1(i) * 12, h = 10 + hash1(i + 9) * 18, w = Math.sin(t * 2.6 + i * 0.4) * 5 + 4; o.push([x - 3, 148, x + w, 146 - h, x + 3, 148]); } return o; } },
    { id: 'rider', prop: 1, show: 1, gen: (k) => (k.rx > -800 && k.rx < 800 ? sdHorse(k.rx, 150, 1.15, k.rph, { arm: 2, bowA: k.ra, draw: k.rdraw, arrow: k.rdraw > 0.1, flow: 1, tug: 0 }) : []) },
    { id: 'arrow', glow: 1, show: 1, gen: (k) => { const o = [], u = k.arrow; const sx = -430, sy = -330; if (u > 0 && u < 1.15) { const P = (v) => { const e = Ease.outCubic(v / 1.15); return [lerp(k.rx0 ?? -120, sx, e), lerp(40, sy, e) - Math.sin(e * PI) * 70]; }, [X, Y] = P(u), tr = []; for (let j = 0; j <= 8; j++) tr.push(...P(Math.max(0, u - j * 0.035))); o.push(sfStroke(tr, 6, 0.8, 1, 1), sfEllipse(X, Y, 6, 6, 0, 10)); } if (k.star > 0) { const r = 6 + 4 * k.star + Math.sin((k.t || 0) * 4) * 1.2, sp = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = (i % 4 === 0 ? 4.2 : i % 2 ? 1 : 1.5) * r; sp.push(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } o.push(sp); } return o; } },
  ],
  perform: (t, S) => { SD_ORH_PERFORM(t, S); S.k.rx0 = -640 + (6.42 - 4.6) * 380 + 18; },
  events: [[0.5, 'wind'], [0.9, 'carve'], [2.6, 'carve'], [4.4, 'carve'], [4.6, 'gallop'], [5.6, 'bowDraw'], [6.42, 'arrow'], [7.5, 'star'], [8.4, 'dawn']],
};
SF_DEFS.push(SD_ORHUN);

/* =====================================================================
   XVIII. Malazgirt — beyazlar giyen sultan, ok yağmuru, açılan kapı
   ===================================================================== */
const SD_MZ_GY = 150, SD_MZ_HZ = 108;
function sdMzArmy(k) {
  // ufuktaki ordu: tuğlar yükselir, sonra hücuma kalkar (uzak, soluk)
  const o = [], up = k.armyUp || 0, ch = k.charge || 0; if (up <= 0) return o;
  for (let i = 0; i < 16; i++) {
    const x0 = -380 + i * 34 + hash1(i) * 18, x = x0 + ch * (520 + hash1(i + 3) * 160), y = SD_MZ_HZ + 4 + (1 - up) * 26 + (i % 2) * 6;
    if (x > 460) continue;
    o.push(...sdHorse(x, y, 0.3 + (i % 2) * 0.04, (k.t || 0) * (ch > 0 ? 2.2 : 0.4) + hash1(i), { gal: ch > 0 ? 0.9 : 0.12, tug: i % 3 === 0, tc: SD_MID, flow: 0.6 }));
  }
  return o;
}
function sdMzArrows(k) {
  const o = [], u0 = k.volley; if (u0 < 0 || u0 > 2.6) return o;
  for (let i = 0; i < 46; i++) {
    const u = (u0 - (i % 12) * 0.07 - Math.floor(i / 12) * 0.32) / 1.25; if (u < 0 || u > 1) continue;
    const x0 = -360 + hash1(i) * 160, x1 = 120 + hash1(i + 7) * 300, h = 330 + hash1(i + 11) * 90, x = lerp(x0, x1, u), y = SD_MZ_HZ - 10 - 4 * h * u * (1 - u), vx = x1 - x0, vy = -4 * h * (1 - 2 * u), l = Math.hypot(vx, vy), ax = vx / l, ay = vy / l;
    o.push(sfStroke([x - ax * 13, y - ay * 13, x + ax * 13, y + ay * 13], 2.2, 1.6, 0, 1), [x - ax * 13 - ay * 3, y - ay * 13 + ax * 3, x - ax * 9, y - ay * 9, x - ax * 13 + ay * 3, y - ay * 13 - ax * 3]);
  }
  return o;
}
function sdMzSweep(k) {
  // önden geçen akıncılar ve toz
  const o = [], u0 = k.sweep; if (u0 < 0) return o;
  for (let i = 0; i < 7; i++) {
    const u = u0 - i * 0.28, x = -560 + u * (620 + hash1(i) * 120); if (u < 0 || x > 620) continue;
    const s = 0.8 + hash1(i + 4) * 0.35, y = SD_MZ_GY + 8 + (i % 2) * 14;
    o.push(...sdHorse(x, y, s, u * 2.3 + hash1(i), { gal: 1, arm: i % 3 === 1 ? 1 : 0, tug: i % 3 === 0, flow: 1 }));
    for (let j = 0; j < 4; j++) { const d = j * 0.12, px = x - 60 * s - j * 26, r = 14 + j * 9; if (u > d) o.push(sdTag(sfEllipse(px, y - r * 0.6, r, r * 0.7, 0, 14), sdTc([0.5, 0.42, 0.34], 0.3 + j * 0.16))); }
  }
  return o;
}
function sdMzGate(k) {
  // Selçuklu taçkapısı: uzakta, ışığa açılan kanatlar
  const g = k.gate || 0; if (g <= 0) return [];
  const cx = 30, by = SD_MZ_HZ + 6, W = 74, H = 112, tc = sdTc([0.3, 0.26, 0.24], 1 - g), op = k.gateOpen || 0;
  const frame = [cx - W, by, cx - W, by - H, cx + W, by - H, cx + W, by];
  const arch = []; for (let j = 0; j <= 20; j++) { const u = j / 20, a = lerp(PI, 0, u), r = 34; arch.push(cx + Math.cos(a) * r * 1.0, by - 66 - Math.sin(a) * r * (1 + 0.5 * Math.sin(u * PI)) - (Math.abs(u - 0.5) < 0.05 ? 4 : 0)); }
  const door = [cx - 34, by, ...arch, cx + 34, by]; door.hole = 1;
  const o = [sdTag(frame, tc), sdTag(door, tc)];
  // mukarnas dişleri ve kenar bordürü
  for (let i = 0; i < 9; i++) { const x = cx - 56 + i * 14; o.push(sdTag([x - 5, by - H + 8, x + 5, by - H + 8, x, by - H + 18], tc)); }
  // kanatlar: açıldıkça daralır
  const lw = 34 * (1 - op); if (lw > 1) { o.push(sdTag([cx - 34, by, cx - 34, by - 66, cx - 34 + lw, by - 72, cx - 34 + lw, by], [0.08, 0.06, 0.05]), sdTag([cx + 34, by, cx + 34, by - 66, cx + 34 - lw, by - 72, cx + 34 - lw, by], [0.08, 0.06, 0.05])); }
  return o;
}
function SD_MZ_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {}; k.flow = 0.15;
  const day = smoothstep(0.2, 3.0, t);
  k.sky = 0.9; k.skyT = [lerp(0.4, 0.42, day), lerp(0.45, 0.6, day), lerp(0.75, 0.98, day)]; k.skyB = [lerp(1.2, 1.12, day), lerp(0.74, 0.92, day), lerp(0.5, 0.74, day)]; k.skyY = 0.44;
  k.lamp = 1.0;
  // sultan beyazlar içinde: kaftan ve pelerin ışık geçirir
  const wh = smoothstep(0.3, 1.6, t), white = sdTc([0, 0, 0], 0).map((v, i) => lerp(v, [0.95, 0.93, 0.84][i], wh));
  for (const id of ['skaftan', 'scape']) S.tc[id] = white;
  B.hbody.sy = 1 + Math.sin(t * 2.4) * 0.01; B.hear.r = ring(t, 0.5, -0.4, 4, 6); B.hearF.r = B.hear.r * 0.8;
  B.hneck.r = kf(t, [[0.6, 0], [0.75, -0.2, 'out'], [0.95, 0.1], [1.15, 0]]); B.hhead.r = kf(t, [[0.6, 0], [0.75, 0.12, 'out'], [1.0, -0.06], [1.2, 0]]);
  // gürz: önce iner, "ileri" der gibi kalkar
  B.sarm.r = kf(t, [[0, 0], [1.8, 0.5, 'io'], [2.6, 0.5], [3.0, -0.25, 'back'], [4.6, -0.25], [5.0, 0.15]]);
  k.armyUp = Ease.outCubic(clamp01((t - 1.4) / 1.4)); k.volley = t - 3.2;
  // şaha kalkış ve hücum
  const rear = kf(t, [[4.5, 0], [5.0, 1, 'out'], [5.6, 1], [5.95, 0, 'in']]);
  B.hhorse.r = -0.62 * rear; B.hneck.r += -0.3 * rear; B.hhead.r += 0.3 * rear;
  const fla = Math.sin(t * 9) * rear; B.hlnf.r = (-1.1 + fla * 0.4) * rear; B.hknf.r = 1.5 * rear; B.hlff.r = (-0.9 - fla * 0.4) * rear; B.hkff.r = 1.4 * rear;
  B.hlnh.r = 0.12 * rear; B.hlfh.r = 0.18 * rear; B.sultan.r = 0.25 * rear; k.flow = Math.max(k.flow, rear * 0.5);
  if (t > 6.0) {
    const u = t - 6.0, e = smoothstep(0, 0.5, u), ph = u * 2.4;
    B.hhorse.x = (u * 320 + u * u * 120) * e; B.hhorse.y = -Math.abs(Math.sin(ph * PI)) * 20 * e; B.hbody.r = Math.sin(ph * TAU) * 0.06 * e;
    B.hlnh.r = B.hlfh.r = B.hknh.r = B.hkfh.r = 0;
    sfGait(B, [['hlnh', 'hknh', 0, 1], ['hlfh', 'hkfh', 0.1, 1], ['hlnf', 'hknf', 0.55, 0], ['hlff', 'hkff', 0.65, 0]], ph, e, { swing: 0.62, knee: 1.1, lift: 10 });
    B.hneck.r += -0.12 * e; B.sultan.r = -0.1 * e; k.flow = Math.max(k.flow, e);
  }
  k.charge = Ease.inCubic(clamp01((t - 5.9) / 2.0)); k.sweep = t - 6.4;
  k.gate = smoothstep(8.3, 9.2, t); k.gateOpen = Ease.inOutCubic(clamp01((t - 9.3) / 1.1));
  k.gIB = k.gateOpen * 1.2; k.gcB = [1.0, 0.86, 0.58]; k.gI = 0;
  k.zoom = kf(t, [[0, 0.1], [2.0, 0.22, 'io'], [5.5, 0.22], [7.0, 0.0, 'io'], [9.0, 0.0], [11.5, 0.42, 'io']]); k.zx = t < 8 ? 20 : 30; k.zy = t < 8 ? -40 : 40;
}
const SD_MALAZGIRT = (() => {
  const H = sdImport(SF_HORSE, ['earF', 'lff', 'lfh', 'tail', 'body', 'ear', 'mane', 'lnf', 'lnh'], { tx: 0, ty: 0, sc: 1, pre: 'h' });
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1);
  const rider = [
    { id: 'scape', bone: 'sultan', gen: (k) => { const t = k.t || 0, fl = k.flow || 0, line = []; for (let j = 0; j <= 14; j++) { const u = j / 14, a = lerp(2.2, 2.75 - fl * 0.45, u) + Math.sin(t * 5 + u * 5) * 0.06 * (0.3 + fl) * u; line.push(j ? line[line.length - 2] + Math.cos(a) * 9 : -34, j ? line[line.length - 1] + Math.sin(a) * 9 : -148); } return [sfStroke(line, 16, 30 + fl * 6, 1, 1)]; } },
    { id: 'skaftan', bind: ['sultan'], pts: [[-34, -152, -4, -154, 6, -116, 12, -90, 20, -64, 14, -36, -28, -28, -58, -42, -48, -96, -40, -138]] },
    { id: 'sleg', bind: ['sultan'], pts: [L([4, -70, 18, -60, 12, -24], 15, 11), [8, -26, 26, -26, 28, -16, 6, -16]] },
    { id: 'shead', bind: ['sultan'], pts: [sfEllipse(-14, -170, 11, 12.5, 0, 18), [-4, -164, 4, -150, -8, -154], [-30, -178, -27, -196, -14, -202, 0, -196, 2, -178], sfStroke(sfCurve(-12, -198, -16, -214, -24, -226, -34, -232, 8), 5, 1.5, 1, 1)] },
    { id: 'sreins', bind: ['sultan'], pts: [L([-20, -142, 4, -118, 40, -108], 9, 7)] },
    { id: 'sarm', bind: ['sarm'], pts: [L([-8, -146, 12, -162, 20, -190], 10, 8), L([20, -186, 32, -244], 4.5, 4), sfEllipse(33, -250, 9, 12, -0.2, 14), [24, -248, 18, -254, 26, -258], [42, -252, 48, -256, 40, -260]] },
  ];
  return {
    key: 'malazgirt', name: 'Malazgirt', line: 'Beyazlar giydi, “Bu elbise kefenim olsun” dedi — akıncılar ovaya indi, Anadolu’nun kapısı açıldı.', dur: 11.6, fitW: 4.3, fitH: 3.7, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.8, 0.45], glowColB: [1.0, 0.86, 0.58],
    caps: [[0.6, 3.1, '<small>Malazgirt · 26 Ağustos 1071</small>Sultan Alparslan o sabah beyazlar giydi.'], [3.3, 5.8, '“Bu beyaz elbise kefenim olsun.”'], [6.1, 8.6, 'Akıncılar ok gibi ovaya indi…'], [8.9, 11.6, '…ve Anadolu’nun kapıları açıldı.']],
    bones: Object.assign({}, H.bones, { sultan: ['hbody', -20, -80, -14, -160], sarm: ['sultan', -8, -146, 20, -190], world: [null, 0, 200, 100, 200] }),
    k0: { t: 0, flow: 0.15, armyUp: 0, volley: -1, charge: 0, sweep: -1, gate: 0, gateOpen: 0, gI: 0, gIB: 0, sky: 0.9, skyT: [0.4, 0.45, 0.75], skyB: [1.2, 0.74, 0.5], skyY: 0.44, lamp: 1 },
    layers: [
      { id: 'gateLight', glow: 1, back: 1, show: 1, gen: (k) => { const o = []; if ((k.gateOpen || 0) <= 0.02) return o; const cx = 30, by = SD_MZ_HZ + 6; o.push(sfEllipse(cx, by - 40, 34, 46, 0, 20)); for (let i = 0; i < 5; i++) { const a = -PI / 2 + (i - 2) * 0.22, r1 = 130 + hash1(i) * 110; o.push([cx, by - 50, cx + Math.cos(a - 0.02) * r1, by - 50 + Math.sin(a - 0.02) * r1, cx + Math.cos(a + 0.02) * r1, by - 50 + Math.sin(a + 0.02) * r1]); } return o; } },
      { id: 'far', prop: 1, show: 1, gen: () => [sdTag(sdRidge([[-700, SD_MZ_HZ], [-520, 60], [-380, 84], [-240, 40], [-90, 80], [60, 50], [230, 86], [400, 30], [560, 76], [700, SD_MZ_HZ]], SD_MZ_HZ + 30, 21, null, 4), SD_FAR)] },
      { id: 'gate', prop: 1, show: 1, gen: (k) => sdMzGate(k) },
      { id: 'army', prop: 1, show: 1, gen: (k) => sdMzArmy(k) },
      { id: 'plain', prop: 1, show: 1, gen: () => [sdTag([-900, SD_MZ_HZ + 10, 900, SD_MZ_HZ + 10, 900, SD_MZ_GY, -900, SD_MZ_GY], [0.42, 0.36, 0.3])] },
      { id: 'ground', prop: 1, show: 1, gen: () => { const o = [[-900, SD_MZ_GY - 2, 900, SD_MZ_GY - 2, 900, 900, -900, 900]]; for (let i = 0; i < 40; i++) o.push(sfEllipse(-700 + i * 36 + hash1(i) * 20, SD_MZ_GY - 2, 6 + hash1(i + 1) * 10, 4 + hash1(i + 2) * 5, 0, 8)); return o; } },
      ...H.layers.slice(0, 3), H.layers[3], rider[0], H.layers[4], rider[1], rider[2], H.layers[5], H.layers[6], rider[3], rider[4], ...H.layers.slice(7), rider[5],
      { id: 'arrows', prop: 1, show: 1, gen: (k) => sdMzArrows(k) },
      { id: 'sweep', prop: 1, show: 1, gen: (k) => sdMzSweep(k) },
    ],
    perform: SD_MZ_PERFORM,
    events: [[0.5, 'snort'], [1.4, 'drums'], [2.9, 'cry'], [3.2, 'volley'], [4.6, 'neigh'], [6.0, 'charge', { shake: 0.12 }], [6.5, 'thunder', { shake: 0.2 }], [9.3, 'gate']],
  };
})();
SF_DEFS.push(SD_MALAZGIRT);

/* =====================================================================
   XIX. 1453 — gemiler karadan yürür, sancak surlara dikilir
   ===================================================================== */
const SD_FT_WY = 92;
// hilal + yıldız (Türk bayrağı kanunu oranları): G = bayrak eni, merkez dış ay merkezi
function sdCrescentStar(cx, cy, G, rot = 0, flip = 1) {
  const R = 0.25 * G, r = 0.2 * G, d = 0.0625 * G, ta = Math.atan2(0.13385, 0.21125), ti = Math.atan2(0.13385, 0.21125 - 0.0625), cr = [];
  for (let j = 0; j <= 40; j++) { const a = lerp(ta, TAU - ta, j / 40); cr.push(Math.cos(a) * R, Math.sin(a) * R); }
  for (let j = 0; j <= 34; j++) { const a = lerp(TAU - ti, ti, j / 34); cr.push(d + Math.cos(a) * r, Math.sin(a) * r); }
  const st = [], sx = 0.7208 * G, Rs = 0.125 * G, ri = Rs * 0.382;
  for (let i = 0; i < 10; i++) { const a = PI + (i * PI) / 5, rr = i % 2 ? ri : Rs; st.push(sx + Math.cos(a) * rr, Math.sin(a) * rr); }
  return [sdX(cr, cx, cy, 1, flip, rot), sdX(st, cx, cy, 1, flip, rot)];
}
// dalgalanan sancak: direk ucundan; ay-yıldız delik (ışık geçer)
function sdBanner(px, py, w, h, t, o = {}) {
  const n = 12, top = [], bot = [], amp = o.amp ?? 0.08, f = o.flip ? -1 : 1, wv = (u) => Math.sin(u * 5.2 - t * (o.sp || 6)) * h * amp * u + (o.droop || 0) * u * u * h;
  for (let j = 0; j <= n; j++) { const u = j / n; top.push(px + f * u * w, py + wv(u)); bot.push(px + f * u * w * (1 - 0.02 * u), py + h + wv(u) * 1.1); }
  const poly = top.slice(); for (let j = n; j >= 0; j--) poly.push(bot[j * 2], bot[j * 2 + 1]);
  const out = [sdTag(poly, o.tc || [0.92, 0.06, 0.05])];
  if (o.emblem !== false) {
    const G = h, cu = 0.5 * G / w, su = (0.5 + 0.7208) * G / w, [ex, ey] = [px + f * cu * w, py + wv(cu) + h / 2], tilt = Math.atan2(wv(su) - wv(cu), (su - cu) * w) * f;
    for (const p of sdCrescentStar(ex, ey, G, tilt, f)) { p.hole = 1; p.tc = poly.tc; out.push(p); }
  }
  return out;
}
function sdGalley(x, y, s, rot, t, o = {}) {
  // kadırga: uzun gövde, mahmuz, kıç köşkü, kürekler, latin yelken
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1), loc = [];
  loc.push([-150, -14, -120, -10, 120, -8, 158, -16, 196, -10, 160, -2, 130, 14, 100, 22, -110, 22, -140, 10]); // gövde + mahmuz
  loc.push([-158, -40, -120, -40, -112, -14, -150, -14], sfStroke([-120, -40, -112, -50], 3, 3, 1, 1), [-120, -60, -108, -60, -110, -48, -118, -48]); // kıç köşkü + fener
  for (let i = 0; i < 12; i++) { const ox = -96 + i * 18, sw = Math.sin(t * 2 + i * 0.3) * 4 * (o.row || 0); loc.push(L([ox, 8, ox - 12 + sw, 42], 3, 2)); }
  loc.push(L([8, -8, 6, -150], 6, 4)); // direk
  const yd = [-90, -40, 110, -176]; loc.push(L(yd, 4, 3)); // seren
  if (o.sail !== false) loc.push([-82, -46, 104, -170, 70, -60, 30, -24, -10, -18]);
  else loc.push(L([-80, -44, 100, -168], 9, 6));
  loc.push(L([110, -176, 118, -190], 2, 2), [118, -190, 132, -186, 118, -182]); // flama
  return loc.map((p) => sdX(sdX(p, 0, 0, 1, 1, rot), x, y, s, o.flip ? -1 : 1));
}
const sdFtHill = (x) => lerp(66, -52, clamp01((x + 10) / 370));
function sdCity(k, breach) {
  // surlar tepeye tırmanır, kuleler, kubbe (Haliç'in karşı yakası)
  const o = [], b = breach || 0, top = [];
  for (let x = 6; x <= 344; x += 12) { const hy = sdFtHill(x), hole = b * Math.max(0, 1 - Math.abs(x - 118) / 40) * 38; top.push(x, hy - 44 + (Math.floor(x / 12) % 2 ? 0 : -7) + hole); }
  const wall = top.slice(); for (let x = 344; x >= 6; x -= 24) wall.push(x, sdFtHill(x) + 8); o.push(wall);
  for (const tx of [36, 118, 200, 282]) { const hy = sdFtHill(tx), dmg = tx === 118 ? b * 52 : 0, h = 92 - dmg, w = 20; const tp = [tx - w, hy + 4, tx - w, hy - h]; for (let j = 0; j <= 4; j++) tp.push(tx - w + j * 10, hy - h - (j % 2 ? 0 : 9)); tp.push(tx + w, hy - h, tx + w, hy + 4); o.push(tp); }
  // Ayasofya
  const dx = 232, dy = sdFtHill(232) - 96, dome = [dx - 64, dy]; for (let j = 0; j <= 24; j++) { const a = lerp(PI, 0, j / 24); dome.push(dx + Math.cos(a) * 64, dy - Math.sin(a) * 46); } dome.push(dx + 64, dy); o.push(dome, [dx - 76, dy, dx + 76, dy, dx + 76, dy + 26, dx - 76, dy + 26]);
  for (const sd of [-1, 1]) { const hx = dx + sd * 92, h = []; for (let j = 0; j <= 12; j++) { const a = lerp(PI, 0, j / 12); h.push(hx + Math.cos(a) * 34, dy + 24 - Math.sin(a) * 26); } o.push([hx - 34, dy + 36, ...h, hx + 34, dy + 36], [hx - 46, dy + 26, hx + 46, dy + 26, hx + 46, dy + 70, hx - 46, dy + 70]); }
  o.push([dx - 5, dy - 46, dx + 5, dy - 46, dx, dy - 58], [dx - 90, dy + 26, dx + 90, dy + 26, dx + 96, dy + 76, dx - 96, dy + 76]);
  for (let i = 0; i < 7; i++) { const hx = 30 + i * 46 + hash1(i) * 14, hy = sdFtHill(hx) - 30, hh = 14 + hash1(i + 5) * 14; if (Math.abs(hx - dx) < 70) continue; o.push([hx - 16, hy, hx - 16, hy - hh, hx, hy - 10 - hh, hx + 16, hy - hh, hx + 16, hy]); }
  return o;
}
function sdMinarets(k) {
  const o = [], g = k.minaret || 0; if (g <= 0) return o; const dx = 232, dy = sdFtHill(232) - 96;
  [[-128, 0], [-112, 0.15], [112, 0.3], [128, 0.45]].forEach(([ox, dl]) => { const u = Ease.outCubic(clamp01((g - dl) / 0.55)); if (u <= 0) return; const x = dx + ox, h = 170 * u, by = dy + 60; o.push([x - 5, by, x - 5, by - h, x + 5, by - h, x + 5, by]); if (u > 0.6) { const sh = by - h * 0.74; o.push([x - 10, sh, x + 10, sh, x + 8, sh - 6, x - 8, sh - 6]); } if (u > 0.95) o.push([x - 6, by - h, x, by - h - 30, x + 6, by - h], sfStroke([x, by - h - 30, x, by - h - 40], 2, 2, 1, 1)); });
  return o;
}
function SD_FT_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  const dawn = smoothstep(4.6, 7.6, t);
  k.sky = 0.9; k.skyT = [lerp(0.16, 0.42, dawn), lerp(0.2, 0.56, dawn), lerp(0.46, 0.95, dawn)]; k.skyB = [lerp(0.4, 1.3, dawn), lerp(0.36, 0.78, dawn), lerp(0.56, 0.5, dawn)]; k.skyY = 0.42;
  k.lamp = lerp(0.8, 1.12, dawn);
  // kadırga kızaklarla iner, Haliç'e süzülür
  const sl = Ease.inOutCubic(clamp01((t - 0.8) / 2.8));
  B.galley.x = lerp(0, 66, sl); B.galley.y = lerp(0, 84, sl) + (sl >= 1 ? Math.sin(t * 2) * 2.5 : 0); B.galley.r = lerp(0, -0.3, smoothstep(0.75, 1, sl)) + Math.sin(sl * PI) * 0.05 + (sl >= 1 ? Math.sin(t * 1.7) * 0.015 : 0);
  k.slide = sl; k.splash = t - 3.55;
  k.breach = smoothstep(5.35, 5.9, t); k.fire = t - 5.0; k.hasan = t - 6.0; k.minaret = smoothstep(8.6, 10.2, t) * 1.45;
  k.gI = 0.7 + (t > 5 && t < 5.5 ? (1 - (t - 5) / 0.5) * 2 : 0); k.gc = [1.0, 0.6, 0.25];
  k.gIB = (1 - dawn) * 0.9 + smoothstep(8.6, 10.4, t) * 0.5; k.gcB = t < 7 ? [0.9, 0.92, 1.0] : [1.0, 0.86, 0.6];
  k.zoom = kf(t, [[0, 0.1], [3.6, 0.2, 'io'], [4.6, 0.0, 'io'], [6.4, 0.34, 'io'], [8.4, 0.34], [10.6, 0.18, 'io']]); k.zx = t < 4.6 ? -100 : 150; k.zy = t < 4.6 ? 0 : -40;
}
const SD_FETIH = (() => {
  const GX = -176, GY = -26, GR = 0.3;
  return {
    key: 'fetih', name: 'İstanbul’un Fethi', line: 'Gemiler karadan yürüdü, sancak surlara dikildi — bir çağ kapandı, yeni bir çağ açıldı.', dur: 11.4, fitW: 4.7, fitH: 3.4, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.6, 0.25], glowColB: [0.9, 0.92, 1.0],
    caps: [[0.6, 3.4, '<small>İstanbul · 22 Nisan 1453</small>Gemiler, yağlanmış kızaklarla karadan yürüdü.'], [3.7, 5.8, 'Haliç’in zinciri boşa gerilmişti.'], [6.1, 8.6, '<small>29 Mayıs 1453</small>Ulubatlı Hasan sancağı surlara dikti.'], [8.9, 11.4, 'Bir çağ kapandı, yeni bir çağ açıldı.']],
    groups: [['galley'], ['city']],
    bones: { galley: [null, GX, GY, GX + 80, GY], world: [null, 0, 200, 100, 200] },
    k0: { t: 0, slide: 0, splash: -1, breach: 0, fire: -1, hasan: -1, minaret: 0, gI: 0.7, gIB: 0.9, sky: 0.9, skyT: [0.16, 0.2, 0.46], skyB: [0.4, 0.36, 0.56], skyY: 0.42, lamp: 0.8 },
    layers: [
      { id: 'moon', glow: 1, back: 1, show: 1, gen: (k) => ((k.t || 0) < 7.5 ? [sdCrescentStar(-60, -250, 130, -0.5)[0]] : []) },
      { id: 'cityHill', prop: 1, show: 1, gen: () => [sdTag([-20, SD_FT_WY + 2, ...[...Array(19)].flatMap((_, i) => { const x = i * 24; return [x, sdFtHill(x) + 6]; }), 760, -60, 760, SD_FT_WY + 2], [0.3, 0.26, 0.26])] },
      { id: 'hill', prop: 1, show: 1, gen: () => [sdTag([-760, -150, -600, -142, -460, -110, -330, -58, -200, 12, -110, SD_FT_WY - 4, -60, SD_FT_WY + 4, -760, SD_FT_WY + 30], [0.28, 0.23, 0.2])] },
      { id: 'logs', prop: 1, show: 1, gen: () => { const o = []; for (let i = 0; i < 10; i++) { const u = i / 9, x = lerp(-470, -110, u), y = lerp(-96, 52, u) - 6; o.push(sfEllipse(x, y, 7, 7, 0, 10)); } return o; } },
      { id: 'torches', glow: 1, show: 1, gen: (k) => { const o = []; if ((k.t || 0) > 6) return o; for (let i = 0; i < 6; i++) { const u = i / 5, x = lerp(-560, -150, u), y = lerp(-140, 6, u) - 50, f = 1 + Math.sin((k.t || 0) * 13 + i * 2) * 0.15; o.push(sfEllipse(x, y, 6 * f, 9 * f, 0, 10), sfEllipse(x, SD_FT_WY + 14 + i * 2, 3, 12 * f, 0, 8)); } return o; } },
      { id: 'haulers', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0, sl = k.slide || 0; if (t > 6) return o; for (let i = 0; i < 5; i++) { const u = clamp01(0.1 + i * 0.14 + sl * 0.4), x = lerp(-600, -130, u), y = lerp(-142, 14, u) + 2; o.push(...sdWalker(x, y, 0.62, t * 0.9 + i * 0.3, { lean: 0.32, torch: i % 2 === 0, hat: i % 2 ? 'kalpak' : true })); } return o; } },
      { id: 'water', prop: 1, show: 1, gen: (k) => { const t = k.t || 0, w = [-900, SD_FT_WY]; for (let x = -900; x <= 900; x += 30) w.push(x, SD_FT_WY + Math.sin(x * 0.03 + t * 1.6) * 2.5); w.push(900, 900, -900, 900); const o = [sdTag(w, [0.46, 0.52, 0.62])]; for (let i = 0; i < 14; i++) { const x = -640 + i * 96 + Math.sin(t + i) * 10, y = SD_FT_WY + 22 + (i % 3) * 22; o.push(sdTag(sfStroke([x - 20, y, x + 20, y], 3, 3, 1, 1), [0.3, 0.35, 0.44])); } return o; } },
      { id: 'city', bone: 'world', gen: (k) => sdCity(k, k.breach) },
      { id: 'minarets', prop: 1, show: 1, gen: (k) => sdMinarets(k) },
      { id: 'galley', bone: 'galley', gen: (k) => sdGalley(GX, GY, 0.74, GR, k.t || 0, { row: k.slide >= 1 ? 1 : 0 }) },
      { id: 'galleys2', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0; for (let i = 0; i < 2; i++) { if (t < 2.4 + i * 1.6) continue; const u = Ease.inOutCubic(clamp01((t - 2.6 - i * 1.6) / 2.8)), x = lerp(-520, -300, u) - i * 40, y = lerp(-150, -50, u) - i * 14; o.push(...sdGalley(x, y, 0.42 - i * 0.07, 0.32, t, {}).map((p) => sdTag(p, i ? SD_FAR : SD_MID))); } return o; } },
      { id: 'splash', prop: 1, show: 1, gen: (k) => sfSplash(k.splash, 16, 900, -60, SD_FT_WY, { up: 150, sp: 150, r: 7, g: 260, life: 1.0 }).map((p) => sdTag(p, [0.36, 0.42, 0.52])) },
      { id: 'cannon', prop: 1, show: 1, gen: (k) => { const o = [], f = k.fire ?? -1, rc = f > 0 && f < 0.6 ? Math.sin((f / 0.6) * PI) * 16 : 0, x = -330 - rc, y = 196; o.push(sfStroke([x - 120, y - 30, x + 60, y - 70], 44, 30, 1, 0), [x - 170, y, x + 30, y, x + 20, y - 26, x - 160, y - 20], sfEllipse(x - 116, y - 2, 22, 22, 0, 16), sfEllipse(x - 10, y - 2, 22, 22, 0, 16), [-900, y + 14, 900, y + 14, 900, 900, -900, 900]); return o; } },
      { id: 'smoke', prop: 1, show: 1, gen: (k) => sdSmoke(5.0, k.t || 0, -264, 120, 7, 31, { life: 3, r0: 18, r1: 70, rise: 120, drift: 60 }).concat(sdSmoke(5.4, k.t || 0, 118, 0, 6, 41, { life: 3, r0: 14, r1: 54, rise: 110, drift: 30, tc: [0.62, 0.56, 0.5] })) },
      { id: 'shot', glow: 1, show: 1, gen: (k) => { const f = k.fire ?? -1, o = []; if (f > 0 && f < 0.25) o.push(sfEllipse(-262, 122, 46 * (1 - f * 2), 30 * (1 - f * 2), -0.2, 16)); if (f > 0.05 && f < 0.4) { const u = (f - 0.05) / 0.35, x = lerp(-250, 118, u), y = lerp(116, 0, u) - Math.sin(u * PI) * 70; o.push(sfEllipse(x, y, 7, 7, 0, 10)); } if (f > 0.38 && f < 0.8) { const u = (f - 0.38) / 0.42; o.push(sfEllipse(118, 0, 28 + u * 30, 24 + u * 26, 0, 16)); } return o; } },
      { id: 'hasan', prop: 1, show: 1, gen: (k) => { const u = k.hasan ?? -1; if (u < 0) return []; const c = Ease.inOutCubic(clamp01(u / 2.0)), x = lerp(70, 118, c), y = lerp(SD_FT_WY - 8, sdFtHill(118) - 40, c), o = []; if (u < 2.2) o.push(...sdWalker(x, y, 0.6, u * 1.4, { lean: 0.35, pole: 1, hat: 'kalpak' })); else { const pl = Ease.outBack(clamp01((u - 2.2) / 0.6)), yy = sdFtHill(118) - 40; o.push(...sdWalker(118, yy, 0.6, 0, { stride: 0, hat: 'kalpak' })); o.push(sfStroke([130, yy, 130, yy - 110 * pl], 3.2, 2.8, 1, 1)); if (pl > 0.6) o.push(...sdBanner(130, yy - 110 * pl, 72, 48, k.t || 0, { amp: 0.1 })); } return o; } },
    ],
    perform: SD_FT_PERFORM,
    events: [[0.5, 'night'], [0.9, 'haul'], [3.55, 'splash'], [5.0, 'cannon', { shake: 0.32, flash: [1, 0.7, 0.4, 0.3] }], [5.4, 'impact', { shake: 0.16 }], [6.0, 'climb'], [8.3, 'flag'], [8.7, 'dawn']],
  };
})();
SF_DEFS.push(SD_FETIH);

/* =====================================================================
   XX. Çanakkale — Seyit Onbaşı mermiyi sırtlar, top ateşlenir
   ===================================================================== */
const SD_CK_GY = 150;
function sdBattleship(x, y, s, o = {}) {
  // zırhlı: alçak gövde, taretler, iki baca, direkler
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1), loc = [[-120, -6, 130, -6, 116, 14, -110, 14], [-90, -6, -90, -24, 60, -24, 60, -6], [-70, -24, -70, -40, 30, -40, 30, -24], [-30, -40, -24, -78, -12, -78, -8, -40], [6, -40, 10, -72, 22, -72, 24, -40]];
  loc.push(L([-56, -40, -58, -110], 3, 2), L([44, -24, 46, -92], 3, 2), [-112, -6, -112, -18, -84, -18, -84, -6], L([-100, -14, -136, -20], 4, 4), [84, -6, 84, -18, 112, -18, 112, -6], L([100, -14, 136, -20], 4, 4));
  return loc.map((p) => sdX(sdX(p, 0, 0, 1, 1, o.rot || 0), x, y, s));
}
function SD_CK_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  k.sky = 0.85; k.skyT = [0.52, 0.56, 0.66]; k.skyB = [1.0, 0.86, 0.66]; k.skyY = 0.5; k.lamp = 1.0;
  // ağır adımlar: dizler titrer, her adımda gövde iner
  const wk = clamp01((t - 0.5) / 3.0), steps = wk * 3, ph = steps % 1, shake = Math.sin(t * 38) * 0.012 * (t < 3.6 ? 1 : 0);
  B.sy.x = Ease.inOutCubic(wk) * 92 + (t > 3.6 ? 0 : 0); B.sy.y = -Math.sin(ph * PI) * 4 * (wk < 1 ? 1 : 0);
  const sw = Math.sin(ph * TAU) * (wk < 1 ? 1 : 0); B.syl1.r = -sw * 0.22 + shake; B.syk1.r = Math.max(0, sw) * 0.35; B.syl2.r = sw * 0.2 - shake; B.syk2.r = Math.max(0, -sw) * 0.3;
  B.syarm2.r = kf(t, [[3.6, 0], [4.3, 0.9, 'io']]); B.syarm.r = kf(t, [[3.6, 0], [4.3, -0.6, 'io'], [8.8, -0.6]]);
  B.sytor.r = shake * 2 + kf(t, [[3.5, 0], [4.1, -0.5, 'io'], [4.6, -0.5], [5.4, -0.1], [9.0, -0.1], [9.6, -0.62, 'io']]);
  // mermi: sırttan kundağa
  k.load = clamp01((t - 3.6) / 0.9); k.breech = smoothstep(4.5, 4.75, t);
  S.hide.syshell = k.load > 0 ? 1 : 0;
  k.fire = t - 5.1; const rc = k.fire > 0 && k.fire < 0.9 ? Math.sin(Math.min(1, k.fire / 0.15) * PI * 0.5) * (1 - smoothstep(0.15, 0.9, k.fire)) : 0;
  B.barrel.x = -rc * 40 * Math.cos(-0.42); B.barrel.y = rc * 40 * Math.sin(0.42);
  // selam: elini kalpağına götürür
  if (t > 8.8) B.syarm.r = kf(t, [[8.8, -0.6], [9.5, 1.9, 'io'], [11.6, 1.9]]);
  k.hit = t - 5.75; k.sink = smoothstep(6.4, 10.5, t);
  k.gI = (k.fire > 0 && k.fire < 0.3 ? 2.6 * (1 - k.fire / 0.3) : 0) + (k.hit > 0 && k.hit < 3 ? 1.4 * Math.exp(-k.hit * 0.6) : 0) + 0.25; k.gc = [1.0, 0.55, 0.18];
  k.gIB = 0.5 + Math.max(0, Math.sin(t * 3.1)) * 0.3; k.gcB = [1.0, 0.7, 0.4];
  k.zoom = kf(t, [[0, 0.3], [3.4, 0.36, 'io'], [5.0, 0.12, 'io'], [6.0, 0.08], [7.2, 0.3, 'io'], [8.6, 0.3], [10.2, 0.45, 'io']]); k.zx = t < 5 ? -180 : t < 8.6 ? 380 : -150; k.zy = t < 5 ? -20 : t < 8.6 ? 60 : -40;
}
const SD_CANAKKALE = (() => {
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1);
  return {
    key: 'canakkale', name: 'Seyit Onbaşı', line: 'Vinç kırıldı, Seyit Onbaşı mermiyi sırtladı — Çanakkale geçilmez oldu.', dur: 11.6, fitW: 4.7, fitH: 3.6, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.55, 0.18], glowColB: [1.0, 0.7, 0.4],
    caps: [[0.6, 3.4, '<small>Çanakkale · 18 Mart 1915</small>Topun vinci kırıldı.'], [3.6, 5.3, 'Seyit Onbaşı mermiyi sırtına aldı…'], [5.5, 8.6, '…ve tek başına namluya sürdü.'], [8.9, 11.6, 'Çanakkale geçilmez!']],
    groups: [['syleg1', 'syleg2', 'sybody', 'syshell', 'syarm', 'syarm2'], ['gun', 'barrel']],
    bones: { sy: [null, -252, SD_CK_GY, -252, 0], sytor: ['sy', -252, -30, -196, -112], syl1: ['sy', -252, -30, -224, 62], syk1: ['syl1', -224, 62, -214, 140], syl2: ['sy', -254, -30, -280, 62], syk2: ['syl2', -280, 62, -298, 140], syarm: ['sytor', -214, -112, -262, -104], syarm2: ['sytor', -198, -110, -168, -146], barrel: [null, -40, -30, 300, -180], world: [null, 0, 200, 100, 200] },
    k0: { t: 0, load: 0, breech: 0, fire: -1, hit: -1, sink: 0, gI: 0.25, gIB: 0.5, sky: 0.85, skyT: [0.52, 0.56, 0.66], skyB: [1.0, 0.86, 0.66], skyY: 0.5, lamp: 1 },
    layers: [
      { id: 'sea', prop: 1, show: 1, gen: (k) => { const t = k.t || 0, w = [-900, 96]; for (let x = -900; x <= 900; x += 30) w.push(x, 96 + Math.sin(x * 0.04 + t * 1.4) * 2); w.push(900, 900, -900, 900); const o = [sdTag(w, [0.5, 0.55, 0.62])]; for (let i = 0; i < 12; i++) { const x = 200 + i * 60 + Math.sin(t * 0.8 + i) * 12, y = 120 + (i % 4) * 26; o.push(sdTag(sfStroke([x - 18, y, x + 18, y], 3, 3, 1, 1), [0.4, 0.45, 0.52])); } return o; } },
      { id: 'farShore', prop: 1, show: 1, gen: () => [sdTag(sdRidge([[120, 96], [260, 64], [420, 80], [560, 52], [760, 76]], 100, 4, null, 3), SD_FAR)] },
      { id: 'fleet', prop: 1, show: 1, gen: (k) => { const o = [], sk = k.sink || 0; o.push(...sdBattleship(420, 92 + sk * 40, 0.62, { rot: sk * 0.32 }).map((p) => sdTag(p, sdTc([0.34, 0.33, 0.36], 0)))); o.push(...sdBattleship(600, 88, 0.44).map((p) => sdTag(p, SD_FAR))); o.push(...sdBattleship(220, 90, 0.36).map((p) => sdTag(p, SD_FAR))); return o.map((p) => { if (p[1] > 96) { /* su altı: kes */ } return p; }); } },
      { id: 'waterFront', prop: 1, show: 1, gen: (k) => { const t = k.t || 0, w = [300, 98]; for (let x = 300; x <= 560; x += 20) w.push(x, 96 + Math.sin(x * 0.05 + t * 1.6) * 2); w.push(560, 150, 300, 150); return (k.sink || 0) > 0.05 ? [sdTag(w, [0.5, 0.55, 0.62])] : []; } },
      { id: 'shipFire', glow: 1, show: 1, gen: (k) => { const o = [], h = k.hit ?? -1, sk = k.sink || 0; if (h > 0) { const r = h < 0.4 ? 20 + h * 120 : 34 + Math.sin(h * 12) * 4; o.push(sfEllipse(420, 66 + sk * 40, r, r * 0.8, 0, 16)); for (let i = 0; i < 6; i++) { const u = ((k.t || 0) * 1.2 + i / 6) % 1; o.push(sfEllipse(400 + i * 8, 60 + sk * 40 - u * 50, 6 * (1 - u), 9 * (1 - u), 0, 8)); } } for (let i = 0; i < 3; i++) { const c = ((k.t || 0) + i * 1.3) % 3.9; if (c < 0.2) o.push(sfEllipse(600 - 40 + i * 30, 70, 10, 8, 0, 8)); } return o; } },
      { id: 'shipSmoke', prop: 1, show: 1, gen: (k) => sdSmoke(5.9, k.t || 0, 420, 50 + (k.sink || 0) * 40, 9, 61, { life: 4, r0: 12, r1: 60, rise: 220, drift: 40, gap: 0.3, tc: [0.4, 0.38, 0.38] }) },
      { id: 'bastion', prop: 1, show: 1, gen: () => { const o = [[-900, SD_CK_GY, 140, SD_CK_GY, 156, 168, 170, 182, 174, 900, -900, 900]]; for (let i = 0; i < 5; i++) o.push(sfEllipse(176 + i * 14, 190 + i * 30, 16, 10, 0, 10)); for (let i = 0; i < 10; i++) o.push([-470 + i * 44, SD_CK_GY, -470 + i * 44, SD_CK_GY - 26, -444 + i * 44, SD_CK_GY - 26, -444 + i * 44, SD_CK_GY]); return o; } },
      { id: 'crane', prop: 1, show: 1, gen: (k) => { const t = k.t || 0, sw = Math.sin(t * 2.4) * 0.3 * Math.exp(-t * 0.25), o = [L([-430, SD_CK_GY - 26, -430, -190], 10, 8), L([-430, -184, -300, -200], 8, 6)]; const cx = -300, cy = -196; let px = cx, py = cy; for (let i = 0; i < 6; i++) { const nx = px + Math.sin(sw) * 12, ny = py + 12; o.push(sfEllipse((px + nx) / 2, (py + ny) / 2, 3, 6, sw, 8)); px = nx; py = ny; } o.push([px - 6, py, px + 6, py, px + 2, py + 10, px - 2, py + 10]); return o; } },
      { id: 'gun', bone: 'world', pts: [[-130, SD_CK_GY - 26, 70, SD_CK_GY - 26, 50, -20, 20, -44, -60, -44, -110, -20], sfEllipse(-60, SD_CK_GY - 40, 30, 30, 0, 18), sfEllipse(30, SD_CK_GY - 40, 30, 30, 0, 18), [-30, -40, 10, -40, 0, -70, -20, -70]] },
      { id: 'barrel', bind: ['barrel'], pts: [L([-70, -18, 300, -176], 42, 24), [-96, -6, -60, -40, -46, -26, -82, 8], sfEllipse(296, -174, 16, 16, -0.42, 12)] },
      { id: 'breechShell', prop: 1, show: 1, gen: (k) => { const u = k.load || 0; if (u <= 0 || u >= 1) return []; const e = Ease.inOutCubic(u), x = lerp(-190, -78, e), y = lerp(-96, -10, e) - Math.sin(e * PI) * 40, r = lerp(-0.5, -0.42, e); return [sfXf([-52, -12, 30, -12, 46, 0, 30, 12, -52, 12], x, y, r)]; } },
      { id: 'syleg2', bind: ['syl2', 'syk2'], soft: 12, pts: sfLeg([-254, -34, -280, 62, -298, 138], [30, 20, 15], [-310, 136, -284, 136, -278, 150, -312, 150]) },
      { id: 'syshell', bind: ['sytor'], pts: [sfXf([-62, -15, 38, -15, 58, 0, 38, 15, -62, 15], -226, -124, -0.5), sfXf([-66, -17, -54, -17, -54, 17, -66, 17], -226, -124, -0.5)] },
      { id: 'syarm2', bind: ['syarm2'], soft: 10, pts: [L([-198, -108, -184, -126, -170, -146], 12, 10), sfEllipse(-168, -148, 7, 7, 0, 10)] },
      { id: 'sybody', bind: ['sytor', 'sy'], soft: 34, pts: [[-276, -38, -230, -34, -212, -58, -190, -94, -184, -112, -212, -130, -244, -108, -266, -72], [-280, -40, -226, -36, -222, -4, -282, -8], sfEllipse(-174, -116, 13, 14, 0.2, 18), [-194, -124, -190, -140, -170, -146, -156, -138, -158, -126, -176, -124], [-168, -110, -158, -108, -166, -104]] },
      { id: 'syleg1', bind: ['syl1', 'syk1'], soft: 12, pts: sfLeg([-250, -34, -224, 62, -214, 138], [30, 20, 15], [-226, 136, -196, 136, -190, 150, -228, 150]) },
      { id: 'syarm', bind: ['syarm'], soft: 10, pts: [L([-212, -112, -238, -90, -262, -104], 12, 10), sfEllipse(-264, -106, 7, 7, 0, 10)] },
      { id: 'gunFx', glow: 1, show: 1, gen: (k) => { const f = k.fire ?? -1, o = []; if (f > 0 && f < 0.35) { const s2 = 1 - f / 0.35; o.push(sfEllipse(330, -194, 70 * s2 + 20, 44 * s2 + 14, -0.42, 18), sfEllipse(380, -214, 40 * s2, 26 * s2, -0.42, 14)); } if (f > 0.05 && f < 0.7) { const u = (f - 0.05) / 0.65, x = lerp(330, 420, u), y = lerp(-196, 60, u) - Math.sin(u * PI) * 60; o.push(sfEllipse(x, y, 6, 6, 0, 10)); } return o; } },
      { id: 'gunSmoke', prop: 1, show: 1, gen: (k) => sdSmoke(5.1, k.t || 0, 330, -196, 8, 71, { life: 3.4, r0: 20, r1: 90, rise: 90, drift: 80, gap: 0.08, tc: [0.6, 0.57, 0.54] }) },
    ],
    perform: SD_CK_PERFORM,
    events: [[0.3, 'chain'], [0.7, 'step'], [1.7, 'step'], [2.7, 'step'], [3.6, 'heave'], [4.55, 'breech'], [5.1, 'fire', { shake: 0.45, flash: [1, 0.75, 0.45, 0.35] }], [5.75, 'hit', { shake: 0.12 }], [6.6, 'sink'], [9.0, 'salute']],
  };
})();
SF_DEFS.push(SD_CANAKKALE);

/* =====================================================================
   XXIII. Kocatepe — 26 Ağustos 1922, şafak (silüet: Kocatepe fotoğrafı)
   ===================================================================== */
// fotoğraftan çıkarılan kontur (490×626 piksel, y aşağı); bacak arası boşluk delik
const SD_AK_SIL = [337, 25, 343, 28, 350, 26, 354, 28, 356, 33, 360, 37, 368, 38, 376, 47, 382, 48, 383, 51, 388, 55, 388, 60, 380, 75, 369, 104, 362, 106, 357, 110, 355, 128, 345, 128, 344, 132, 340, 132, 337, 136, 337, 144, 329, 154, 330, 156, 351, 154, 357, 155, 357, 158, 352, 159, 347, 163, 345, 177, 328, 188, 334, 205, 334, 210, 332, 214, 335, 216, 327, 226, 332, 230, 332, 234, 320, 251, 317, 251, 310, 247, 308, 248, 309, 259, 311, 263, 319, 271, 318, 276, 302, 298, 300, 304, 305, 325, 307, 345, 312, 361, 311, 373, 312, 376, 316, 380, 323, 383, 325, 387, 325, 415, 328, 423, 337, 433, 340, 444, 338, 457, 329, 468, 325, 477, 321, 498, 331, 502, 336, 510, 340, 514, 341, 513, 341, 496, 345, 483, 345, 463, 349, 450, 408, 450, 418, 457, 428, 468, 433, 475, 435, 482, 437, 483, 450, 465, 467, 449, 472, 446, 489, 447, 489, 624, 387, 625, 2, 625, 2, 621, 8, 606, 21, 589, 42, 574, 56, 567, 66, 564, 84, 565, 109, 575, 118, 566, 127, 553, 164, 485, 194, 455, 189, 444, 193, 424, 187, 413, 185, 405, 184, 381, 181, 373, 175, 364, 175, 356, 169, 336, 169, 331, 162, 325, 167, 303, 181, 269, 181, 266, 187, 256, 192, 242, 194, 231, 193, 217, 196, 197, 196, 174, 199, 157, 208, 139, 224, 120, 242, 109, 260, 101, 273, 90, 285, 92, 292, 83, 294, 71, 300, 66, 298, 61, 336, 26];
const SD_AK_HOLE = [257, 425, 269, 442, 276, 449, 285, 451, 290, 456, 290, 460, 278, 480, 270, 500, 269, 501, 267, 499, 263, 499, 254, 504, 236, 522, 236, 529, 231, 531, 228, 535, 212, 536, 196, 553, 196, 556, 194, 558, 184, 559, 176, 563, 161, 574, 154, 575, 147, 579, 146, 578, 148, 574, 208, 494, 245, 460, 248, 449, 252, 447, 257, 441, 257, 426];
const sdAk = (p) => { const o = new Array(p.length); for (let i = 0; i < p.length; i += 2) { o[i] = (p[i] - 245) * 0.9; o[i + 1] = (p[i + 1] - 626) * 0.9 + 200; } return o; };
const sdAkP = (x, y) => [(x - 245) * 0.9, (y - 626) * 0.9 + 200];
function sdAkPlain(k) {
  // uzak ova: tepeler, ilerleyen birlikler, sancaklar, ufukta top ateşi
  const o = [], t = k.t || 0, adv = k.adv || 0;
  o.push(sdTag(sdRidge([[-700, 70], [-560, 30], [-420, 52], [-300, 16], [-160, 44], [-40, 26], [120, 50], [260, 10], [420, 40], [560, 18], [700, 50]], 96, 51, null, 3), SD_FAR));
  o.push(sdTag([-900, 84, 900, 84, 900, 240, -900, 240], [0.38, 0.33, 0.3]));
  if (adv > 0) for (let i = 0; i < 22; i++) {
    const row = i % 3, x0 = -720 + (i * 61) % 900 + hash1(i) * 30, x = x0 + adv * (260 + row * 40), y = 98 + row * 16, s = 0.2 + row * 0.05; if (x > 700) continue;
    if (i % 7 === 0) o.push(...sdHorse(x, y, s * 1.1, t * 1.6 + i, { gal: 0.6, tc: SD_MID, flag: 34, flagTc: [0.92, 0.1, 0.08] }));
    else o.push(...sdWalker(x, y, s, t * 1.4 + hash1(i), { tc: SD_MID, hat: 'kalpak', pole: i % 3 === 1 }));
  }
  return o;
}
function SD_AK_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  const dawn = smoothstep(1.5, 7.5, t);
  k.sky = 0.95; k.skyT = [lerp(0.1, 0.36, dawn), lerp(0.12, 0.48, dawn), lerp(0.32, 0.86, dawn)]; k.skyB = [lerp(0.28, 1.35, dawn), lerp(0.24, 0.78, dawn), lerp(0.42, 0.42, dawn)]; k.skyY = lerp(0.42, 0.5, dawn); k.skyS = 0.26;
  k.lamp = lerp(0.6, 1.15, dawn);
  // nefes, rüzgârda kaput; toplar gürleyince başını ufka kaldırır
  B.akbody.sy = 1 + Math.sin(t * 1.9) * 0.005; B.akcoat.r = Math.sin(t * 2.3) * 0.025 + Math.sin(t * 5.1) * 0.008;
  B.akhead.r = kf(t, [[2.6, 0], [3.8, -0.075, 'io'], [11.8, -0.075]]);
  k.sunY = lerp(150, 6, Ease.outCubic(clamp01((t - 2.6) / 6.0)));
  k.adv = clamp01((t - 5.2) / 6.6);
  k.flashes = [3.4, 3.75, 4.1, 4.6, 5.0, 5.5, 6.1, 6.6, 7.4].map((c) => t - c);
  k.gI = 0.15 + k.flashes.reduce((a, f) => a + (f > 0 && f < 0.5 ? (1 - f / 0.5) * 0.9 : 0), 0); k.gc = [1.0, 0.62, 0.25];
  k.gIB = smoothstep(2.6, 6.0, t) * 0.8; k.gcB = [1.0, 0.82, 0.52];
  k.zoom = Ease.inOutCubic(clamp01((t - 0.3) / 11.0)) * 0.62; const [hx, hy] = sdAkP(300, 230); k.zx = hx; k.zy = hy;
}
const SD_KOCATEPE = (() => {
  const P = sdAkP;
  return {
    key: 'kocatepe', name: 'Kocatepe', line: 'Şafakla toplar gürledi; Başkomutan’ın gözü ufuktaydı — ordular Akdeniz’e yürüdü.', dur: 12.0, fitW: 4.4, fitH: 4.5, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.62, 0.25], glowColB: [1.0, 0.82, 0.52],
    caps: [[0.6, 3.4, '<small>Kocatepe · 26 Ağustos 1922 · Şafak</small>Başkomutan ufku bekliyor.'], [3.7, 6.7, 'Toplar gürledi; Büyük Taarruz başladı.'], [7.0, 12.0, '“Ordular! İlk hedefiniz Akdeniz’dir. İleri!”<small style="margin:6px 0 0">Başkomutan Mustafa Kemal Paşa · 1 Eylül 1922</small>']],
    bones: { ak: [null, ...P(250, 626), ...P(250, 500)], akrock: ['ak', ...P(20, 610), ...P(490, 560)], akbody: ['ak', ...P(255, 520), ...P(262, 250)], akcoat: ['akbody', ...P(205, 300), ...P(170, 430)], akhead: ['akbody', ...P(302, 132), ...P(345, 40)] },
    k0: { t: 0, sunY: 150, adv: 0, flashes: [], gI: 0.15, gIB: 0, sky: 0.95, skyT: [0.1, 0.12, 0.32], skyB: [0.28, 0.24, 0.42], skyY: 0.42, lamp: 0.6 },
    layers: [
      { id: 'sun', glow: 1, back: 1, show: 1, gen: (k) => { const sx = 330, sy = k.sunY, o = [sfEllipse(sx, sy, 40, 40, 0, 28)]; if ((k.gIB || 0) > 0.1) for (let i = 0; i < 5; i++) { const a = -PI + 0.7 + i * 0.42 + Math.sin((k.t || 0) * 0.4 + i) * 0.02, r1 = 180 + hash1(i) * 140; o.push([sx + Math.cos(a) * 46, sy + Math.sin(a) * 46, sx + Math.cos(a - 0.012) * r1, sy + Math.sin(a - 0.012) * r1, sx + Math.cos(a + 0.012) * r1, sy + Math.sin(a + 0.012) * r1]); } return o; } },
      { id: 'plain', prop: 1, show: 1, gen: (k) => sdAkPlain(k) },
      { id: 'horizonFire', glow: 1, show: 1, gen: (k) => { const o = []; (k.flashes || []).forEach((f, i) => { if (f > 0 && f < 0.5) { const x = -520 + hash1(i + 3) * 1000, r = 10 + (1 - f / 0.5) * 18; o.push(sfEllipse(x, 84, r, r * 0.6, 0, 12)); } }); return o; } },
      { id: 'smokeFar', prop: 1, show: 1, gen: (k) => { const o = []; (k.flashes || []).forEach((f, i) => { const x = -520 + hash1(i + 3) * 1000; o.push(...sdSmoke(0, f, x, 80, 3, 80 + i, { life: 4, r0: 8, r1: 34, rise: 50, drift: 20, gap: 0.3, tc: [0.62, 0.6, 0.6] })); }); return o; } },
      { id: 'rocksL', prop: 1, show: 1, gen: (k) => { const o = [[-900, 200, -200, 200, -230, 150, -300, 120, -380, 136, -460, 104, -560, 126, -640, 96, -900, 120], [-900, 196, 900, 196, 900, 900, -900, 900]]; const t = k.t || 0; for (let i = 0; i < 9; i++) { const x = -560 + i * 50, w = Math.sin(t * 2.2 + i) * 4; o.push([x - 3, 150 - (i % 3) * 14, x + w + 2, 112 - (i % 3) * 14, x + 3, 150 - (i % 3) * 14]); } return o; } },
      { id: 'ataturk', bind: ['akrock', 'akbody', 'akcoat', 'akhead'], soft: 24, pts: [sdAk(SD_AK_SIL), sdAk(SD_AK_HOLE)], holeSub: [1] },
    ],
    perform: SD_AK_PERFORM,
    events: [[0.4, 'wind'], [3.4, 'cannonFar'], [3.75, 'cannonFar'], [4.1, 'cannonFar', { shake: 0.05 }], [4.6, 'cannonFar'], [5.0, 'cannonFar', { shake: 0.05 }], [5.2, 'march'], [5.5, 'cannonFar'], [6.1, 'cannonFar'], [7.0, 'order']],
  };
})();

/* =====================================================================
   XXI. Samsun — Bandırma Vapuru fırtınayı yarar, şafakla kıyıya varır
   ===================================================================== */
const SD_SM_WY = 20;
const sdSeaH = (x, t, A) => SD_SM_WY + A * (Math.sin(x * 0.011 + t * 1.25) * 0.6 + Math.sin(x * 0.026 - t * 2.0 + 1) * 0.3 + Math.sin(x * 0.058 + t * 3.1) * 0.12);
function sdWaves(k, front) {
  const t = k.t || 0, A = k.storm * 30 + 5, o = [], y0 = front ? 14 : 0, line = [];
  for (let x = -900; x <= 900; x += 18) line.push(x, sdSeaH(x * (front ? 1.3 : 1) + (front ? 300 : 0), t, A * (front ? 1.1 : 0.85)) + y0);
  const poly = line.slice(); poly.push(900, 900, -900, 900);
  o.push(sdTag(poly, front ? [0.16, 0.2, 0.27] : [0.34, 0.4, 0.5]));
  // köpük tepeleri: fırtınada savrulan
  if (front && k.storm > 0.2) for (let i = 0; i < 14; i++) { const x = -640 + i * 96 + ((t * 60) % 96), y = sdSeaH(x * 1.3 + 300, t, A * 1.1) + y0; o.push(sdTag(sfEllipse(x - 8, y - 4, 10 * k.storm, 4, -0.3, 8), [0.7, 0.74, 0.8])); }
  return o;
}
function sdSteamer(k) {
  // Bandırma: alçak gövde, tek uzun baca, iki direk, köprü üstü; lombozlardan ışık sızar
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1), o = [];
  o.push([-224, -26, 210, -30, 236, -46, 226, -20, 200, 12, -196, 14, -214, -2]);
  for (let i = 0; i < 9; i++) { const h = sfEllipse(-150 + i * 36, -8, 4, 4, 0, 8); h.hole = 1; o.push(h); }
  o.push([-120, -26, -120, -58, 84, -58, 84, -26], [30, -58, 30, -80, 88, -80, 92, -58], [-150, -26, -150, -44, -118, -44, -118, -26]);
  o.push([-28, -58, -18, -170, 16, -170, 12, -58]); // baca
  o.push(L([150, -30, 152, -214], 5, 3), L([-176, -26, -178, -192], 5, 3), L([152, -170, 120, -140], 3, 3), L([-178, -150, -150, -126], 3, 3));
  o.push(L([152, -214, 236, -46], 1.2, 1.2), L([152, -214, -178, -192], 1.2, 1.2), L([-178, -192, -224, -26], 1.2, 1.2));
  for (let i = 0; i < 3; i++) o.push(sfEllipse(-96 + i * 50, -64, 15, 6, 0, 10));
  // pruvada bir yolcu: kalpaklı, kaputlu
  o.push(...sdWalker(184, -34, 0.58, 0, { stride: 0, hat: 'kalpak', lean: -0.02 }));
  return o;
}
function sdSamsunCoast(k) {
  const c = k.coast || 0; if (c <= 0) return []; const tc = sdTc([0.32, 0.28, 0.27], 1 - c * 0.9), ox = (1 - Ease.outCubic(c)) * 260 - 120;
  return sdSamsunCoast0(tc).map((p) => sdX(p, ox, 0, 1));
}
function sdSamsunCoast0(tc) {
  const o = [];
  o.push(sdTag(sdRidge([[220, SD_SM_WY + 4], [300, -10], [380, -36], [460, -20], [560, -60], [700, -30], [760, SD_SM_WY + 4]], SD_SM_WY + 8, 61, null, 3), tc));
  for (let i = 0; i < 7; i++) { const hx = 300 + i * 40, hy = -4 - Math.sin(i) * 8, hh = 14 + hash1(i) * 10; o.push(sdTag([hx - 13, SD_SM_WY, hx - 13, hy - hh, hx, hy - hh - 10, hx + 13, hy - hh, hx + 13, SD_SM_WY], tc)); }
  o.push(sdTag([430, SD_SM_WY, 430, -96, 436, -110, 442, -96, 442, SD_SM_WY], tc), sdTag([424, -66, 448, -66, 446, -60, 426, -60], tc));
  o.push(sdTag([250, SD_SM_WY + 2, 250, SD_SM_WY - 8, 330, SD_SM_WY - 8, 330, SD_SM_WY + 2], tc));
  return o.map((p) => sdTag(p, tc));
}
function SD_SM_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  const calm = smoothstep(4.6, 7.0, t), dawn = smoothstep(5.0, 8.4, t);
  k.storm = 1 - calm;
  k.sky = 0.95; k.skyT = [lerp(0.12, 0.38, dawn), lerp(0.14, 0.52, dawn), lerp(0.26, 0.92, dawn)]; k.skyB = [lerp(0.28, 1.35, dawn), lerp(0.3, 0.8, dawn), lerp(0.36, 0.5, dawn)]; k.skyY = 0.46;
  k.lamp = lerp(0.68, 1.12, dawn);
  // vapur: fırtınada yalpalar, sonra sakin seyir; kıyıya yaklaşır
  const A = k.storm;
  B.ship.y = Math.sin(t * 1.6) * 16 * A + Math.sin(t * 0.9) * 3; B.ship.r = Math.sin(t * 1.25 + 0.6) * 0.11 * A + Math.sin(t * 0.8) * 0.012; B.ship.x = smoothstep(6.0, 11.5, t) * 40;
  k.coast = clamp01((t - 6.0) / 5.5);
  k.lightning = [1.1, 2.7, 3.9].map((c) => t - c);
  k.gI = 0.5 + k.lightning.reduce((a, f) => a + (f > 0 && f < 0.25 ? 2.4 * (1 - f / 0.25) : 0), 0); k.gc = [0.85, 0.9, 1.0];
  k.gIB = smoothstep(5.4, 7.6, t) * 0.9; k.gcB = [1.0, 0.82, 0.55]; k.sunY = lerp(60, -70, Ease.outCubic(clamp01((t - 5.2) / 5.0)));
  k.whistle = t - 9.4;
  k.zoom = kf(t, [[0, 0.1], [4.0, 0.2, 'io'], [6.0, 0.05, 'io'], [9.0, 0.08], [11.8, 0.42, 'io']]); k.zx = t < 9 ? 40 : 160; k.zy = t < 9 ? -40 : -60;
}
const SD_SAMSUN = {
  key: 'samsun', name: 'Samsun’a Çıkış', line: 'Fırtınayı yardı, şafakla Samsun’a vardı — Milli Mücadele başladı.', dur: 12.0, fitW: 4.6, fitH: 3.4, tasvir: 1, cine: 1, ext: 1,
  glowCol: [0.85, 0.9, 1.0], glowColB: [1.0, 0.82, 0.55],
  caps: [[0.6, 3.4, '<small>Karadeniz · Mayıs 1919</small>Yaşlı bir vapur, fırtınaya daldı.'], [3.6, 6.4, 'Dalgalar güverteyi dövdü; vapur yolundan dönmedi.'], [6.7, 9.2, '<small>19 Mayıs 1919</small>Şafakla Samsun göründü.'], [9.4, 12.0, 'Bir milletin uyanışı başladı.']],
  bones: { ship: [null, 0, 10, 100, 10] },
  k0: { t: 0, storm: 1, coast: 0, lightning: [], whistle: -1, gI: 0.5, gIB: 0, sunY: 110, sky: 0.95, skyT: [0.12, 0.14, 0.26], skyB: [0.28, 0.3, 0.36], skyY: 0.46, lamp: 0.68 },
  layers: [
    { id: 'sun', glow: 1, back: 1, show: 1, gen: (k) => [sfEllipse(240, k.sunY, 40, 40, 0, 28)] },
    { id: 'clouds', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0, st = k.storm; for (let i = 0; i < 6; i++) { const x = -600 + ((i * 230 + t * 40) % 1300), y = -300 + (i % 3) * 40; for (let j = 0; j < 5; j++) o.push(sdTag(sfEllipse(x + j * 46 - 90, y + Math.sin(j * 1.3 + i) * 12, 60, 26 + (j % 2) * 10, 0, 14), sdTc([0.32, 0.33, 0.38], 1 - st * 0.85))); } return o; } },
    { id: 'rain', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0, st = k.storm; if (st < 0.05) return o; for (let i = 0; i < 70; i++) { const x = -640 + hash1(i) * 1280 + ((t * 300 + i * 37) % 120), y = -420 + ((t * 900 + hash1(i + 5) * 900) % 560); o.push(sdTag(sfStroke([x, y, x - 14, y + 44], 2, 2, 0, 0), sdTc([0.4, 0.42, 0.5], 1 - st * 0.8))); } return o; } },
    { id: 'bolt', glow: 1, show: 1, gen: (k) => { const o = []; (k.lightning || []).forEach((f, i) => { if (f > 0 && f < 0.22) { const x0 = -360 + i * 260, line = [x0, -420]; for (let j = 1; j <= 8; j++) line.push(x0 + (hash1(i * 9 + j) - 0.5) * 60, -420 + j * 56); o.push(sfStroke(line, 6, 2, 1, 1)); } }); return o; } },
    { id: 'coast', prop: 1, show: 1, gen: (k) => sdSamsunCoast(k) },
    { id: 'wavesBack', prop: 1, show: 1, gen: (k) => sdWaves(k, false) },
    { id: 'smokeS', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0; for (let i = 0; i < 9; i++) { const u = ((t * 0.5 + i / 9) % 1), x = -2 - u * 260 * (1 + k.storm * 0.4), y = -176 - u * 70 + Math.sin(u * 6 + i) * 8, r = 10 + u * 34; o.push(sdTag(sfEllipse(x, y, r, r * 0.8, 0, 12), sdTc([0.42, 0.4, 0.4], smoothstep(0.5, 1, u)))); } return o.map((p) => sdX(p, 0, 0, 1)); } },
    { id: 'steamer', bind: ['ship'], pts: sdSteamer({}) },
    { id: 'portGlow', glow: 1, show: 1, gen: () => [] },
    { id: 'whistle', prop: 1, show: 1, gen: (k) => { const u = k.whistle ?? -1; if (u < 0 || u > 2.4) return []; const o = []; for (let i = 0; i < 5; i++) { const v = u - i * 0.12; if (v < 0) continue; const r = 8 + v * 26; o.push(sdTag(sfEllipse(20 + v * 30, -184 - v * 50, r, r * 0.8, 0, 12), sdTc([0.9, 0.9, 0.92], smoothstep(1.2, 2.4, v)))); } return o; } },
    { id: 'gulls', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0; if (t < 7) return o; for (let i = 0; i < 4; i++) { const x = 300 - (t - 7) * 50 * (1 + i * 0.2) + i * 60, y = -160 - i * 30 + Math.sin(t * 2 + i) * 10, f = Math.sin(t * 7 + i * 2) * 10; o.push(sfStroke([x - 22, y - f, x - 8, y - 3, x, y + 2, x + 8, y - 3, x + 22, y - f], 4, 4, 1, 1)); } return o; } },
    { id: 'wavesFront', prop: 1, show: 1, gen: (k) => sdWaves(k, true) },
  ],
  perform: SD_SM_PERFORM,
  events: [[0.4, 'storm'], [1.1, 'thunder', { flash: [0.8, 0.85, 1.0, 0.45], shake: 0.1 }], [2.0, 'waveCrash', { shake: 0.08 }], [2.7, 'thunder', { flash: [0.8, 0.85, 1.0, 0.5], shake: 0.12 }], [3.9, 'thunder', { flash: [0.8, 0.85, 1.0, 0.35] }], [5.0, 'calm'], [7.0, 'gulls'], [9.4, 'whistle']],
};
// lomboz ışığı: gövdeyle birlikte hareket eder
SD_SAMSUN.layers.find((l) => l.id === 'portGlow').gen = (k, S) => { const o = []; for (let i = 0; i < 9; i++) o.push(sfEllipse(-150 + i * 36, -8, 5, 5, 0, 8)); const b = S.b.ship; return o.map((p) => sdX(p, b.x, b.y, 1, 1, 0)).map((p) => { const c = Math.cos(b.r), s = Math.sin(b.r), q = p.slice(); for (let j = 0; j < q.length; j += 2) { const x = q[j] - b.x, y = q[j + 1] - b.y - 10; q[j] = b.x + x * c - y * s; q[j + 1] = b.y + 10 + x * s + y * c; } return q; }); };

/* =====================================================================
   XXII. İnebolu yolu — kağnı, kar ve Şerife Bacı
   ===================================================================== */
const SD_IN_GY = 120;
function sdOxCart(k, ph) {
  // öküz: ağır gövde, alçak baş, boynuz; kağnı: iki dolu tekerlek, yan parmaklık, cephane sandıkları
  const L = (p, a, b) => sfStroke(p, a, b, 1, 1), o = [], G = SD_IN_GY, w = TAU * ph;
  o.push(L(sfCurve(-10, G - 62, 30, G - 74, 90, G - 74, 128, G - 62, 10), 1, 1, 1, 1));
  o.push(sfStroke(sfCurve(-12, G - 64, 30, G - 76, 92, G - 78, 130, G - 64, 10), 1, 1, 1, 1, (u) => 52 - Math.sin(u * PI) * 4 + (u < 0.2 ? (0.2 - u) * 40 : 0) + Math.exp(-Math.pow((u - 0.82) / 0.1, 2)) * 14));
  o.push([92, G - 46, 112, G - 30, 126, G - 44]); // gerdan
  o.push(L([128, G - 72, 148, G - 64, 158, G - 46], 30, 18), [150, G - 52, 172, G - 48, 176, G - 38, 156, G - 34], [140, G - 76, 132, G - 96, 146, G - 84], [150, G - 74, 162, G - 92, 158, G - 76]);
  for (const [lx, of] of [[0, 0], [16, PI], [100, PI], [116, 0]]) { const a = Math.sin(w + of) * 0.22; o.push(L([lx, G - 50, lx + Math.sin(a) * 24, G - 26, lx + Math.sin(a) * 30, G - 4], 16, 10), [lx + Math.sin(a) * 30 - 7, G - 6, lx + Math.sin(a) * 30 + 7, G - 6, lx + Math.sin(a) * 30 + 6, G, lx + Math.sin(a) * 30 - 6, G]); }
  o.push(L([-10, G - 60, -26, G - 40, -24, G - 20], 6, 3));
  o.push(L([140, G - 80, 120, G - 82, -60, G - 56], 5, 5)); // boyunduruk ve ok
  const cx = -120, wr = 46; o.push([cx - 120, G - 58, cx + 74, G - 58, cx + 70, G - 72, cx - 116, G - 72]);
  for (let i = 0; i < 9; i++) o.push(L([cx - 112 + i * 22, G - 70, cx - 108 + i * 22, G - 108], 3, 3));
  o.push(L([cx - 116, G - 108, cx + 72, G - 106], 4, 4));
  const wh = sfEllipse(cx - 20, G - wr, wr, wr, 0, 26); o.push(wh); for (let j = 0; j < 2; j++) { const a = -w * 0.5 + j * PI, h = sfEllipse(cx - 20 + Math.cos(a) * wr * 0.55, G - wr + Math.sin(a) * wr * 0.55, 7, 7, 0, 10); h.hole = 1; o.push(h); }
  return o;
}
function sdCrates(k) {
  const G = SD_IN_GY, cx = -120, o = [];
  for (const [x, y, w, h] of [[-104, -72, 54, 32], [-48, -72, 54, 32], [6, -72, 50, 32], [-80, -104, 54, 30], [-24, -104, 54, 30]]) o.push([cx + x, G + y, cx + x + w, G + y, cx + x + w, G + y - h, cx + x, G + y - h]);
  return o;
}
function sdShawl(k) {
  // örtü: kadının omzundan cephane sandıklarına geçer
  const u = k.shawl || 0, G = SD_IN_GY, t = k.t || 0, wv = Math.sin(t * 6) * 4;
  if (u <= 0) return [];
  const A = [214, -16, 236, -12, 240, 22, 232, 64 + wv, 192, 70 + wv, 196, 16];
  const Bp = [-228, -20, -60, -22, -54, 10 + wv * 0.3, -54, 52, -226, 54, -230, 12];
  if (u >= 1) return [Bp];
  const e = Ease.inOutCubic(u), mid = Math.sin(e * PI) * 46, o = [];
  for (let i = 0; i < A.length; i += 2) o.push(lerp(A[i], Bp[i], e) + Math.sin(e * PI * 3 + i) * 8 * Math.sin(e * PI), lerp(A[i + 1], Bp[i + 1], e) - mid + Math.sin(t * 9 + i) * 6 * Math.sin(e * PI));
  return [o];
}
function SD_IN_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  const dim = smoothstep(6.0, 10.0, t);
  k.sky = 0.95; k.skyT = [lerp(0.2, 0.08, dim), lerp(0.24, 0.1, dim), lerp(0.42, 0.24, dim)]; k.skyB = [lerp(0.62, 0.36, dim), lerp(0.64, 0.4, dim), lerp(0.74, 0.56, dim)]; k.skyY = 0.5;
  k.lamp = lerp(0.95, 0.72, dim) + smoothstep(10.2, 12, t) * 0.2;
  // yürüyüş: kağnı ağır ağır ilerler, kadın rüzgâra eğilir
  const walk = (t < 3.4 ? t : 3.4 + Math.max(0, t - 6.0)), ph = walk * 0.55;
  B.cart.x = walk * 12; B.woman.x = walk * 12 + (t > 3.4 && t < 6.0 ? -Math.sin(((t - 3.4) / 2.6) * PI) * 120 : 0);
  k.ph = ph; k.wph = t < 3.4 || t > 6.0 ? walk * 0.6 : 0;
  k.shawl = clamp01((t - 4.1) / 1.4);
  k.wind = 0.5 + Math.sin(t * 1.3) * 0.3; k.snow = 0.7 + dim * 0.5;
  k.glowW = smoothstep(9.0, 11.0, t);
  S.tc.woman = sdTc([0.06, 0.07, 0.1], k.glowW * 0.55);
  k.gI = 0.7 + k.glowW * 0.15; k.gc = [0.85, 0.9, 1.0]; k.gIB = smoothstep(9.5, 11.5, t) * 0.8; k.gcB = [1.0, 0.86, 0.6];
  k.zoom = kf(t, [[0, 0.18], [3.4, 0.22, 'io'], [4.0, 0.38, 'io'], [6.2, 0.38], [8.0, 0.12, 'io'], [10.0, 0.12], [12.0, 0.4, 'io']]); k.zx = t < 3.6 ? 0 : t < 8 ? -120 : 220; k.zy = t < 8 ? -40 : -60;
}
const SD_INEBOLU = {
  key: 'kagni', name: 'Şerife Bacı', line: 'Örtüsünü cephaneye örttü, kendisi karda kaldı — İstiklal’in kahramanı Şerife Bacı.', dur: 12.4, fitW: 4.7, fitH: 3.3, tasvir: 1, cine: 1, ext: 1,
  glowCol: [0.85, 0.9, 1.0], glowColB: [1.0, 0.86, 0.6],
  caps: [[0.6, 3.3, '<small>İnebolu–Kastamonu yolu · Kış 1921</small>Cephane cepheye yetişmeliydi.'], [3.6, 6.4, 'Şerife Bacı örtüsünü cephanenin üstüne örttü…'], [6.7, 9.3, '…kendisi karda, ayazda yürüdü.'], [9.6, 12.4, 'Cephane cepheye kuru ulaştı. Adı, İstiklal’in kalbine yazıldı.']],
  bones: { cart: [null, -120, SD_IN_GY, 100, SD_IN_GY], woman: [null, 214, SD_IN_GY, 214, 0] },
  k0: { t: 0, ph: 0, wph: 0, shawl: 0, wind: 0.5, snow: 0.7, glowW: 0, gI: 0.7, gIB: 0, sky: 0.95, skyT: [0.2, 0.24, 0.42], skyB: [0.62, 0.64, 0.74], skyY: 0.5, lamp: 0.95 },
  layers: [
    { id: 'star', glow: 1, back: 1, show: 1, gen: (k) => { const r = 4 + (k.gIB || 0) * 5, sp = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = (i % 4 === 0 ? 4 : i % 2 ? 1 : 1.5) * r; sp.push(380 + Math.cos(a) * rr, -260 + Math.sin(a) * rr); } return [sp]; } },
    { id: 'farHills', prop: 1, show: 1, gen: () => [sdTag(sdRidge([[-700, 40], [-540, -10], [-380, 20], [-200, -24], [0, 10], [200, -30], [380, 4], [560, -20], [700, 30]], 70, 71, null, 4), [0.56, 0.58, 0.66]), sdTag(sdPineRow(-700, 700, 64, 82), [0.42, 0.44, 0.52])] },
    { id: 'snowGround', prop: 1, show: 1, gen: (k) => { const o = [sdTag([-900, SD_IN_GY - 4, 900, SD_IN_GY - 4, 900, 900, -900, 900], [0.82, 0.86, 0.95])]; for (let i = 0; i < 30; i++) o.push(sdTag(sfEllipse(-700 + i * 50, SD_IN_GY - 2, 30, 6, 0, 10), [0.74, 0.78, 0.88])); return o; } },
    { id: 'tracks', prop: 1, show: 1, gen: (k) => { const o = [], x1 = -120 + (k.ph || 0) / 0.55 * 12 - 40; for (let i = 0; i < 16; i++) { const x = x1 - i * 40; if (x < -700) break; o.push(sdTag(sfStroke([x - 16, SD_IN_GY + 4, x + 16, SD_IN_GY + 4], 4, 4, 1, 1), [0.62, 0.66, 0.78])); } return o; } },
    { id: 'oxcart', bind: ['cart'], pts: sdOxCart({}, 0) },
    { id: 'oxcartAnim', prop: 1, gen: () => [] },
    { id: 'crates', bind: ['cart'], pts: sdCrates({}) },
    { id: 'shawlL', prop: 1, show: 1, gen: (k, S) => sdShawl(k).map((p) => (k.shawl >= 1 ? sdX(p, S.b.cart.x, 0, 1) : sdX(p, lerp(S.b.woman.x, S.b.cart.x, Ease.inOutCubic(k.shawl)), 0, 1))) },
    { id: 'woman', bone: 'woman', gen: (k) => { const o = sdWalker(214, SD_IN_GY, 1.5, k.wph || 0, { robe: 1, scarf: 1, wind: k.wind, lean: 0.16, stride: 0.6 }); if ((k.shawl || 0) <= 0) o.push([214, -16, 236, -12, 240, 22, 232, 64 + Math.sin((k.t || 0) * 6) * 4, 192, 70 + Math.sin((k.t || 0) * 6) * 4, 196, 16]); o.push(sfStroke([240, SD_IN_GY - 112, 200, SD_IN_GY - 96, 168, SD_IN_GY - 84], 2, 2, 1, 1)); return o; } },
    { id: 'snow', glow: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0, n = Math.round(60 * (k.snow || 0.7)); for (let i = 0; i < n; i++) { const sp = 60 + hash1(i) * 80, x = -640 + ((hash1(i + 3) * 1280 + t * sp * (1 + k.wind) * 2.2) % 1280), y = -420 + ((hash1(i + 7) * 560 + t * sp) % 560), r = 2 + hash1(i + 11) * 2.5; o.push(sfEllipse(x, y, r, r, 0, 6)); } return o; } },
  ],
  perform: SD_IN_PERFORM,
  events: [[0.4, 'blizzard'], [0.8, 'creak'], [2.4, 'creak'], [3.6, 'stop'], [4.2, 'shawl'], [6.2, 'creak'], [8.0, 'creak'], [9.4, 'soul']],
};
// kağnı ve öküz animasyonu: duruk kaplamayı (heykel) gizleyip yürüyen çizimi göster
SD_INEBOLU.layers.find((l) => l.id === 'oxcartAnim').gen = (k, S) => sdOxCart(k, k.ph || 0).map((p) => sdX(p, S.b.cart.x, 0, 1));
function sdPineRow(x0, x1, y, h) { const o = [x0, y + 10]; for (let x = x0; x <= x1; x += 26) { const hh = h * (0.6 + hash1(x) * 0.5); o.push(x, y, x + 13, y - hh, x + 26, y); } o.push(x1, y + 10); return o; }

/* =====================================================================
   XXIV. Al Sancak — gökte hilal ile yıldız, yerde kızıllık; perde bayrak olur
   Ölçüler: Türk Bayrağı Kanunu (G en, A=G/2, B=G/2, C=G/16, D=0.4G, E=G/3, F=G/4, L=1.5G, M=G/30)
   ===================================================================== */
const SD_SC_G = 300, SD_SC_CX = -75, SD_SC_CY = -60, SD_SC_GY = 196;
const SD_SC_XH = SD_SC_CX - SD_SC_G / 2 - SD_SC_G / 30; // gönder (uçkurluk) kenarı
const SD_SC_EMB = sdCrescentStar(SD_SC_CX, SD_SC_CY, SD_SC_G); // [hilal, yıldız]
// yarım düzlem kırpma (y > yt): kızıllık yükselirken amblem deliği yalnız dolu kısımda açılır
// yarım düzlem kırpma: ax=0 → x, ax=1 → y; sgn=+1 → değer ≥ c olan kısım kalır
function sdClipHP(p, ax, c, sgn) {
  if (!p) return null; const o = [], n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = p[i * 2 + ax], b = p[j * 2 + ax], ina = (a - c) * sgn >= 0, inb = (b - c) * sgn >= 0;
    if (ina) o.push(p[i * 2], p[i * 2 + 1]);
    if (ina !== inb) { const u = (c - a) / (b - a), x = p[i * 2] + (p[j * 2] - p[i * 2]) * u, y = p[i * 2 + 1] + (p[j * 2 + 1] - p[i * 2 + 1]) * u; o.push(x, y); }
  }
  return o.length >= 6 ? o : null;
}
const sdClipBelow = (p, yt) => sdClipHP(p, 1, yt, 1);
// dalgalanma: gönderde sıfır, uca doğru artan kumaş dalgası
function sdFlagWarp(x, y, t, w) { const u = clamp01((x - SD_SC_XH) / (1.5 * SD_SC_G)); return [x - Math.abs(Math.sin(u * 4.2 - t * 2.6)) * 7 * u * w, y + Math.sin(u * 4.6 - t * 2.9) * 16 * u * w + Math.sin(u * 9 - t * 4.4) * 4 * u * w]; }
const sdWarpP = (p, t, w) => { const o = new Array(p.length); for (let i = 0; i < p.length; i += 2) [o[i], o[i + 1]] = sdFlagWarp(p[i], p[i + 1], t, w); return o; };
const SD_SC_FT = () => SD_SC_CY - SD_SC_G / 2, SD_SC_FB = () => SD_SC_CY + SD_SC_G / 2;
function sdScFlag(k) {
  // kumaş: dikey şeritler, her biri dalganın eğimine göre aydınlanır; amblem her şeritte delik
  const o = [], t = k.t || 0, f = k.fill || 0, w = k.wave || 0; if (f <= 0) return o;
  const x0 = SD_SC_XH + SD_SC_G / 30, x1 = SD_SC_XH + 1.5 * SD_SC_G, yT = SD_SC_FT(), yB = SD_SC_FB(), top = lerp(yB, yT, f), N = 16;
  for (let s2 = 0; s2 < N; s2++) {
    const xa = lerp(x0, x1, s2 / N), xb = lerp(x0, x1, (s2 + 1) / N) + 0.6, um = ((xa + xb) / 2 - SD_SC_XH) / (1.5 * SD_SC_G);
    const slope = Math.cos(um * 4.6 - t * 2.9) * um * w, sh = Math.round(clamp(1 - slope * 0.5 - Math.abs(slope) * 0.15, 0.62, 1.12) * 10) / 10;
    const RED = [Math.min(1, 0.9 * sh), 0.05 * sh, 0.06 * sh], poly = [];
    const m = 4; for (let j2 = 0; j2 <= m; j2++) { const x = lerp(xa, xb, j2 / m), wy = f < 1 ? Math.sin(x * 0.03 - t * 7) * 6 * (1 - f) : 0; poly.push(x, Math.max(yT, top + wy)); }
    for (let j2 = 1; j2 <= 8; j2++) poly.push(xb, lerp(top, yB, j2 / 8));
    for (let j2 = m - 1; j2 >= 0; j2--) poly.push(lerp(xa, xb, j2 / m), yB);
    for (let j2 = 7; j2 >= 1; j2--) poly.push(xa, lerp(top, yB, j2 / 8));
    o.push(sdTag(sdWarpP(poly, t, w), RED));
    for (const e of SD_SC_EMB) { let c = sdClipHP(sdClipHP(e, 0, xa + 0.3, 1), 0, xb - 0.3, -1); if (c && f < 1) c = sdClipBelow(c, top + 8); if (!c) continue; const h = sdWarpP(c, t, w); h.hole = 1; h.tc = RED; o.push(h); }
  }
  return o;
}
function SD_SC_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  // gölge ışığa döner: hilal ile yıldız gece göğünde delik olur
  const inv = smoothstep(0.4, 1.8, t), dawn = smoothstep(7.2, 10.5, t);
  k.night = smoothstep(0.1, 1.2, t) * (1 - smoothstep(7.4, 9.6, t));
  for (const id of ['hilal', 'yildiz']) S.tc[id] = sdTc([0, 0, 0], inv);
  k.sky = 0.9; k.skyT = [lerp(0.36, 0.5, dawn), lerp(0.4, 0.62, dawn), lerp(0.7, 0.98, dawn)]; k.skyB = [lerp(0.6, 1.3, dawn), lerp(0.5, 0.86, dawn), lerp(0.6, 0.6, dawn)]; k.skyY = 0.36;
  k.lamp = lerp(1.0, 1.14, dawn);
  // kızıl göl büyür, yansımalar titrer; kızıllık göğe yükselir, perde bayrak olur
  k.pool = Ease.outCubic(clamp01((t - 2.0) / 2.2)) * (1 - smoothstep(9.0, 10.5, t) * 0.4);
  k.column = smoothstep(4.4, 5.0, t) * (1 - smoothstep(6.6, 7.6, t));
  k.fill = Ease.inOutCubic(clamp01((t - 5.0) / 2.2)); k.wave = smoothstep(6.8, 8.6, t);
  k.pole = Ease.outCubic(clamp01((t - 6.2) / 1.0));
  k.gI = inv * (0.75 + Math.sin(t * 2.2) * 0.08) * (1 - smoothstep(7.0, 8.4, t) * 0.55) + k.wave * 0.25; k.gc = [1.0, 0.97, 0.92];
  k.gIB = 0; k.zoom = kf(t, [[0, 0.12], [3.0, 0.3, 'io'], [4.6, 0.3], [6.4, 0.0, 'io'], [9.0, 0.0], [12.2, 0.32, 'io']]); k.zx = t < 4.8 ? 0 : -20; k.zy = t < 4.8 ? 120 : -60;
}
const SD_SANCAK = (() => {
  const [HIL, YIL] = SD_SC_EMB;
  return {
    key: 'sancak', name: 'Al Sancak', line: 'Kanla yoğrulan topraktan doğdu: gökte hilal ile yıldız, yerde kızıllık — al bayrağımız.', dur: 12.4, fitW: 3.4, fitH: 3.0, tasvir: 1, cine: 1, ext: 1,
    glowCol: [1.0, 0.97, 0.92], glowColB: [1.0, 0.86, 0.6],
    caps: [[0.5, 3.0, '<small>Kurtuluş Savaşı · Bir gece</small>Savaş bitti, ova sustu.'], [3.2, 6.0, 'Rivayet odur ki: gökte ay ile yıldız yan yana geldi, yerdeki kızıllığa yansıdı…'], [6.3, 9.0, '…kızıllık göğe yükseldi; hilal ile yıldız ona yerleşti.'], [9.3, 12.4, '“Korkma, sönmez bu şafaklarda yüzen al sancak…”<small style="margin:6px 0 0">İstiklal Marşı · Mehmet Akif Ersoy</small>']],
    groups: [['hilal'], ['yildiz']], sym: [0, 5],
    bones: { world: [null, 0, 200, 100, 200] },
    k0: { t: 0, night: 0, pool: 0, column: 0, fill: 0, wave: 0, pole: 0, gI: 0, gIB: 0, sky: 0.9, skyT: [0.36, 0.4, 0.7], skyB: [0.6, 0.5, 0.6], skyY: 0.36, lamp: 1 },
    layers: [
      { id: 'nightSky', prop: 1, show: 1, gen: (k) => { if ((k.night || 0) < 0.01) return []; const tc = sdTc([0.06, 0.08, 0.2], 1 - k.night), o = [sdTag([-900, -900, 900, -900, 900, SD_SC_GY, -900, SD_SC_GY], tc)], f = k.fill || 0, t = k.t || 0, w = k.wave || 0;
        const yT = SD_SC_FT(), yB = SD_SC_FB(), top = lerp(yB, yT, f), x0 = SD_SC_XH + SD_SC_G / 30, x1 = SD_SC_XH + 1.5 * SD_SC_G;
        if (f > 0.002) { const fh = sdWarpP([x0, Math.max(yT, top - 6), x1, Math.max(yT, top - 6), x1, yB, x0, yB], t, w); fh.hole = 1; fh.tc = tc; o.push(fh); }
        for (const e of SD_SC_EMB) { const c = f > 0.002 ? sdClipHP(e, 1, top - 6, -1) : e.slice(); if (!c) continue; c.hole = 1; c.tc = tc; o.push(c); }
        if ((k.column || 0) > 0.01) { const cw = (26 + k.column * 20) * 1.2, col = []; for (let j = 0; j <= 12; j++) { const u = j / 12; col.push(SD_SC_CX + 70 + Math.sin(u * 7 - t * 6) * 8 * (1 - u), lerp(SD_SC_GY - 1, yB + 2, u)); } const ch = sfStroke(col, cw, cw * 0.66, 0, 0); ch.hole = 1; ch.tc = tc; o.push(ch); } for (let i = 0; i < 30; i++) { const x = -560 + hash1(i) * 1120, y = -440 + hash1(i + 9) * 520, r = 1.6 + hash1(i + 17) * 2.2; if (Math.hypot(x - SD_SC_CX - 70, y - SD_SC_CY) < 200) continue; const h = sfEllipse(x, y, r, r, 0, 6); h.hole = 1; h.tc = tc; o.push(h); } return o; } },
      { id: 'flag', prop: 1, show: 1, gen: (k) => sdScFlag(k) },
      { id: 'column', prop: 1, show: 1, gen: (k) => { const c = k.column || 0; if (c <= 0) return []; const t = k.t || 0, w = 26 + c * 20, yB = SD_SC_CY + SD_SC_G / 2, o = [], line = []; for (let j = 0; j <= 12; j++) { const u = j / 12; line.push(SD_SC_CX + 70 + Math.sin(u * 7 - t * 6) * 8 * (1 - u), lerp(SD_SC_GY - 1, yB + 2, u)); } return [sdTag(sfStroke(line, w * 1.2, w * 0.8, 0, 0), [0.9, 0.06, 0.06])]; } },
      { id: 'hilal', bone: 'world', pts: [HIL] },
      { id: 'yildiz', bone: 'world', pts: [YIL] },
      { id: 'emblemGlow', glow: 1, show: 1, gen: (k) => (k.fill >= 1 ? SD_SC_EMB.map((e) => sdWarpP(e, k.t || 0, k.wave || 0)) : SD_SC_EMB.map((e) => e.slice())) },
      { id: 'pole', prop: 1, show: 1, gen: (k) => { const p = k.pole || 0; if (p <= 0) return []; const x = SD_SC_XH - 4, top = lerp(SD_SC_GY, SD_SC_CY - SD_SC_G / 2 - 30, p); return [sfStroke([x, SD_SC_GY + 10, x, top], 9, 7, 0, 1), sfEllipse(x, top - 6, 9, 9, 0, 12)]; } },
      { id: 'ground', prop: 1, show: 1, gen: (k) => { const tc = [0.1, 0.08, 0.07], o = [sdTag([-900, SD_SC_GY, 900, SD_SC_GY, 900, 900, -900, 900], tc)]; const pr = k.pool || 0; if (pr > 0.01) { const h = sfEllipse(SD_SC_CX + 70, SD_SC_GY + 18, 150 * pr, 16 * pr, 0, 30); h.hole = 1; h.tc = tc; o.push(h); } return o; } },
      { id: 'pool', prop: 1, show: 1, gen: (k) => { const pr = k.pool || 0; if (pr <= 0.01) return []; const RED = [0.86, 0.04, 0.05], t = k.t || 0, o = [sdTag(sfEllipse(SD_SC_CX + 70, SD_SC_GY + 18, 150 * pr, 16 * pr, 0, 30), RED)]; const rs = smoothstep(0.5, 1, pr); if (rs > 0.05) for (const e of sdCrescentStar(SD_SC_CX + 70 - 54, SD_SC_GY + 18, 22 * rs)) { const q = []; for (let i = 0; i < e.length; i += 2) q.push(e[i] + Math.sin(e[i + 1] * 0.6 + t * 5) * 2, SD_SC_GY + 18 + (SD_SC_GY + 18 - e[i + 1]) * 0.55); q.hole = 1; q.tc = RED; o.push(q); } return o; } },
      { id: 'field', prop: 1, show: 1, gen: (k) => { const o = [], t = k.t || 0, L = (p, a, b) => sfStroke(p, a, b, 1, 1); for (const [x, a] of [[-360, -0.12], [-300, 0.08], [250, -0.06], [330, 0.1]]) { const tx = x + Math.sin(a) * 110, ty = SD_SC_GY - Math.cos(a) * 110; o.push(L([x, SD_SC_GY + 6, tx, ty], 6, 4), L([tx, ty, tx + Math.sin(a) * 26, ty - Math.cos(a) * 26], 3, 0.8), [tx - 13, ty + 10, tx - 12, ty - 8, tx + 12, ty - 8, tx + 13, ty + 10]); } const wx = -470, wy = SD_SC_GY - 20, wr = 40; const wh = sfEllipse(wx, wy, wr, wr, 0, 24); o.push(wh); const hb = sfEllipse(wx, wy, wr * 0.78, wr * 0.78, 0, 20); hb.hole = 1; o.push(hb); for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU + 0.3; o.push(L([wx, wy, wx + Math.cos(an) * wr * 0.8, wy + Math.sin(an) * wr * 0.8], 4, 4)); } for (let i = 0; i < 22; i++) { const x = -640 + i * 60 + hash1(i) * 20, w = Math.sin(t * 2 + i) * 3; o.push([x - 3, SD_SC_GY + 2, x + w, SD_SC_GY - 16 - hash1(i + 3) * 14, x + 3, SD_SC_GY + 2]); } return o; } },
      { id: 'smokeF', prop: 1, show: 1, gen: (k) => sdSmoke(0, (k.t || 0) % 6, 420, SD_SC_GY - 10, 5, 91, { life: 6, r0: 10, r1: 60, rise: 200, drift: -30, gap: 0.9, tc: [0.55, 0.52, 0.55] }) },
    ],
    perform: SD_SC_PERFORM,
    events: [[0.3, 'silence'], [0.8, 'emblem'], [2.0, 'pool'], [4.4, 'rise'], [5.0, 'swell'], [7.0, 'unfurl'], [8.6, 'wind'], [9.3, 'anthemLine']],
  };
})();

/* =====================================================================
   XXV. Cumhuriyet — 29 Ekim 1923, Ankara; final ve perde selamı
   ===================================================================== */
const SD_CM_GY = 130;
// perde selamı: önceki perdelerin heykel silüetleri (önbellek; oynarken kare başına bir tane derlenir)
const SD_PARADE = [];
function sdParadeWarm() {
  for (let i = 0; i < 24; i++) {
    if (SD_PARADE[i]) continue;
    try {
      const F = typeof stFig === 'function' ? stFig(i) : sfCompile(SF_DEFS[i]), rest = sfToWall(F, sfPose(F, sfNewPose(F))).filter((r) => !r.prop && !r.glow);
      let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; for (const r of rest) for (let j = 0; j < r.p.length; j += 2) { x0 = Math.min(x0, r.p[j]); x1 = Math.max(x1, r.p[j]); y0 = Math.min(y0, r.p[j + 1]); y1 = Math.max(y1, r.p[j + 1]); }
      const h = y1 - y0, cx = (x0 + x1) / 2;
      SD_PARADE[i] = rest.map((r) => { const q = new Array(r.p.length); for (let j = 0; j < r.p.length; j += 2) { q[j] = (r.p[j] - cx) / h; q[j + 1] = -(r.p[j + 1] - y0) / h; } if (r.hole) q.hole = 1; return q; });
      SD_PARADE[i].w = (x1 - x0) / h;
    } catch (e) { SD_PARADE[i] = []; SD_PARADE[i].w = 1; }
    return false;
  }
  return true;
}
function sdParade(k) {
  const u = k.parade ?? -1; if (u < 0) return [];
  const o = [], lanes = [{ from: 0, to: 15, y: 196, h: 58, dir: -1, sp: 300, gap: 34, tc: SD_MID }, { from: 15, to: 24, y: 290, h: 92, dir: 1, sp: 250, gap: 46, tc: null }];
  for (const L of lanes) {
    let off = 0;
    for (let i = L.from; i < L.to; i++) {
      const sh = SD_PARADE[i]; if (!sh) { off += L.h + L.gap; continue; }
      const w = sh.w * L.h, pos = -820 + u * L.sp - off - w / 2, x = L.dir > 0 ? pos : -pos; off += w + L.gap;
      if (Math.abs(x) > 820) continue;
      const bob = -Math.abs(Math.sin(u * 5 + i)) * 5, bow = Math.exp(-Math.pow(x / 60, 2)) * 0.12 * L.dir;
      for (const p of sh) { const q = new Array(p.length), c = Math.cos(bow), s = Math.sin(bow); for (let j = 0; j < p.length; j += 2) { const px = p[j] * L.h, py = p[j + 1] * L.h; q[j] = x + px * c - py * s; q[j + 1] = L.y + bob + px * s + py * c; } if (p.hole) q.hole = 1; if (L.tc) q.tc = L.tc; o.push(q); }
    }
  }
  return o;
}
function sdTbmm() {
  // I. Meclis binası: iki katlı taş bina, öne çıkan orta bölüm, alınlık, pencereler, gönder
  const o = [], G = SD_CM_GY;
  o.push([-10, G, 290, G, 290, 30, 268, 8, 12, 8, -10, 30]);
  o.push([100, G, 180, G, 180, 16, 140, -16, 100, 16]);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { const x = 6 + c * 32 + (c > 3 ? 22 : 0); if (x > 92 && x < 176) continue; const y = 46 + r * 44, h = sfEllipse(x + 8, y, 6, 12, 0, 10); h.hole = 1; o.push(h); }
  const door = [128, G, 128, 92, 140, 82, 152, 92, 152, G]; door.hole = 1; o.push(door);
  for (const x of [112, 168]) { const h = sfEllipse(x, 52, 6, 12, 0, 10); h.hole = 1; o.push(h); }
  o.push(sfStroke([140, -14, 140, -160], 5, 4, 0, 1), sfEllipse(140, -164, 6, 6, 0, 10), [142, -156, 176, -150, 158, -136, 172, -122, 142, -128]);
  return o;
}
function sdKale() {
  // Ankara Kalesi: kayalık tepe, burçlar
  const o = [], G = SD_CM_GY;
  o.push(sdRidge([[-450, G], [-410, 70], [-380, 40], [-350, -6], [-330, -30], [-306, -76], [-290, -86], [-200, -94], [-140, -84], [-118, -60], [-96, -40], [-84, 6], [-60, 40], [-40, G]], G, 141, null, 7));
  const wall = [-300, -84]; for (let x = -300; x <= -130; x += 12) wall.push(x, -120 + (Math.floor((x + 300) / 12) % 2 ? 0 : -8)); wall.push(-130, -84); o.push(wall);
  for (const tx of [-292, -214, -138]) o.push([tx - 18, -84, tx - 18, -150, tx - 10, -150, tx - 10, -158, tx - 2, -158, tx - 2, -150, tx + 6, -150, tx + 6, -158, tx + 14, -158, tx + 14, -150, tx + 18, -150, tx + 18, -84]);
  return o;
}
function SD_CM_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; S.tc = S.tc || {};
  k.sky = 0.92; k.skyT = [0.1, 0.12, 0.3]; k.skyB = [0.62, 0.42, 0.42]; k.skyY = 0.5; k.skyS = 0.4;
  k.lamp = 0.85 + smoothstep(16.6, 18.6, t) * 0.25;
  // yüz bir pare top: kale burçlarından
  const shots = []; for (let i = 0; i < 14; i++) shots.push(t - (1.0 + i * 0.22));
  k.shots = shots; k.hoist = Ease.inOutCubic(clamp01((t - 1.6) / 2.2));
  // havai fişek: kırmızı ve beyaz, sırayla
  const fw = []; for (let i = 0; i < 16; i++) fw.push([3.2 + i * 0.62 + (i > 10 ? (i - 10) * 0.3 : 0), -340 + hash1(i * 3) * 680, -360 + hash1(i * 5) * 160, i]);
  for (let i = 0; i < 10; i++) fw.push([16.4 + i * 0.22, -400 + hash1(i * 7 + 2) * 800, -380 + hash1(i * 11) * 200, i + 20]);
  k.fw = fw.map(([c, x, y, i]) => [t - c, x, y, i]);
  let lastI = -1; for (const [u, , , i] of k.fw) if (u > 0 && u < 1.6) lastI = i;
  k.gc = lastI % 2 ? [1.0, 0.92, 0.75] : [1.0, 0.28, 0.2];
  k.gI = 0.85 + shots.reduce((a, f) => a + (f > 0 && f < 0.25 ? 0.8 : 0), 0);
  k.crowd = t - 4.0; k.parade = t >= 9.6 ? t - 9.6 : -1;
  if (t > 8.5 && !SD_PARADE[23]) { let g = 0; while (!sdParadeWarm() && g++ < 30); }
  k.gIB = 0.6; k.gcB = [1.0, 0.7, 0.4];
  k.zoom = kf(t, [[0, 0.1], [3.0, 0.2, 'io'], [8.8, 0.2], [10.2, 0.0, 'io'], [16.4, 0.0], [19.4, 0.25, 'io']]); k.zx = t < 9 ? 0 : 0; k.zy = t < 9 ? -40 : 60;
}
const SD_CUMHURIYET = {
  key: 'cumhuriyet', name: 'Cumhuriyet', line: 'Cumhuriyet ilan edildi; perde, bir milletin sabahına açıldı.', dur: 19.6, fitW: 4.7, fitH: 3.0, tasvir: 1, cine: 1, ext: 1, parade: 1,
  glowCol: [1.0, 0.92, 0.75], glowColB: [1.0, 0.7, 0.4],
  caps: [[0.6, 3.4, '<small>Ankara · 29 Ekim 1923</small>Cumhuriyet ilan edildi.'], [3.6, 6.8, 'Yüz bir pare top atıldı; gökte havai fişekler açtı.'], [7.0, 9.5, 'Fenerler yandı, sancaklar dalgalandı…'], [9.8, 16.4, '<small>Perde selamı</small>Bu perdede can bulan bütün gölgeler sizi selamlıyor.'], [16.7, 19.6, '“Ne mutlu Türk’üm diyene!”<small style="margin:6px 0 0">Mustafa Kemal Atatürk · 1933</small>']],
  groups: [['tbmm'], ['kale']],
  bones: { world: [null, 0, 200, 100, 200] },
  k0: { t: 0, shots: [], hoist: 0, fw: [], crowd: -1, parade: -1, gI: 0.85, gIB: 0.6, sky: 0.92, skyT: [0.1, 0.12, 0.3], skyB: [0.62, 0.42, 0.42], skyY: 0.5, lamp: 0.85 },
  layers: [
    { id: 'windows', glow: 1, back: 1, show: 1, gen: () => { const o = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { const x = 6 + c * 32 + (c > 3 ? 22 : 0); if (x > 92 && x < 176) continue; o.push(sfEllipse(x + 8, 46 + r * 44, 6, 12, 0, 10)); } return o; } },
    { id: 'kale', bone: 'world', pts: sdKale() },
    { id: 'tbmm', bone: 'world', pts: sdTbmm() },
    { id: 'groundLine', prop: 1, show: 1, gen: () => [[-900, SD_CM_GY - 2, 900, SD_CM_GY - 2, 900, SD_CM_GY + 10, -900, SD_CM_GY + 10]] },
    { id: 'tbmmFlag', prop: 1, show: 1, gen: (k) => { const h = k.hoist || 0; if (h <= 0) return []; return sdBanner(146, lerp(-30, -160, h), 90, 60, k.t || 0, { amp: 0.12 }); } },
    { id: 'shotFx', glow: 1, show: 1, gen: (k) => { const o = []; (k.shots || []).forEach((f, i) => { if (f > 0 && f < 0.25) { const x = [-292, -214, -138][i % 3] + 22; o.push(sfEllipse(x, -136, 24 * (1 - f * 3), 14 * (1 - f * 3), 0, 12)); } }); return o; } },
    { id: 'shotSmoke', prop: 1, show: 1, gen: (k) => { const o = []; (k.shots || []).forEach((f, i) => { if (f > 0 && f < 3.4) o.push(...sdSmoke(0, f, [-292, -214, -138][i % 3] + 34, -140, 1, 120 + i, { life: 3.2, r0: 8, r1: 36, rise: 70, drift: 40, tc: [0.5, 0.48, 0.52] })); }); return o; } },
    { id: 'fireworks', glow: 1, show: 1, gen: (k) => { const o = []; for (const [u, x, y, i] of k.fw || []) { if (u < -0.7 || u > 1.6) continue; if (u < 0) { const v = u + 0.7, ry = lerp(SD_CM_GY, y, Ease.outCubic(v / 0.7)); o.push(sfStroke([x, ry, x + Math.sin(i) * 6, ry + 34], 3, 0.6, 1, 1)); continue; } const n = 16, R = 30 + Ease.outCubic(Math.min(1, u / 0.9)) * 90, fade = 1 - smoothstep(0.6, 1.6, u); for (let j = 0; j < n; j++) { const a = (j / n) * TAU + i, r0 = R * 0.55, dr = 18 * fade + 2, g = u * u * 30; o.push(sfStroke([x + Math.cos(a) * r0, y + Math.sin(a) * r0 + g, x + Math.cos(a) * (r0 + dr), y + Math.sin(a) * (r0 + dr) + g], 4 * fade + 1, 0.8, 1, 1)); } } return o; } },
    { id: 'crowd', prop: 1, show: 1, gen: (k) => { const u = k.crowd ?? -1, o = []; if (u < 0 || u > 6.4) return o; for (let i = 0; i < 12; i++) { const x = -760 + u * 210 - i * 70 + (i % 3) * 14; if (x < -820 || x > 820) continue; const fade = smoothstep(5.0, 6.4, u); o.push(...sdWalker(x, 236 + (i % 2) * 22, 0.9, u * 1.1 + i * 0.37, { torch: i % 3 !== 1, flag: i % 3 === 1, flagTc: [0.9, 0.08, 0.06], t: k.t, hat: i % 4 === 0 ? 'kalpak' : i % 4 === 2 ? false : true, scarf: i % 4 === 2, tc: fade > 0 ? sdTc([0, 0, 0], fade) : null })); } return o; } },
    { id: 'lanterns', glow: 1, show: 1, gen: (k) => { const u = k.crowd ?? -1, o = []; if (u < 0 || u > 5.2) return o; for (let i = 0; i < 12; i++) { if (i % 3 === 1) continue; const x = -760 + u * 210 - i * 70 + (i % 3) * 14; if (x < -820 || x > 820) continue; const f = 1 + Math.sin((k.t || 0) * 12 + i) * 0.12; o.push(sfEllipse(x + 22, 236 + (i % 2) * 22 - 112, 7 * f, 10 * f, 0, 10)); } return o; } },
    { id: 'parade', prop: 1, show: 1, gen: (k) => sdParade(k) },
  ],
  perform: SD_CM_PERFORM,
  events: [[0.4, 'night'], [1.0, 'salvo', { shake: 0.08 }], [1.6, 'hoist'], [3.2, 'fireworks'], [4.0, 'march'], [9.6, 'parade'], [16.4, 'finale', { flash: [1, 0.8, 0.6, 0.2] }]],
};
SF_DEFS.push(SD_SAMSUN, SD_INEBOLU, SD_KOCATEPE, SD_SANCAK, SD_CUMHURIYET);

/* ---------- Destan sesleri ---------- */
const sdBoom = (A, t, g = 0.3, far = 0) => { A.osc('sine', lerp(64, 48, far), t, 1.4 + far, g, null, { f1: 28 }); A.noiseHit(t, 0.5 + far * 0.8, g * (far ? 0.25 : 0.55), { type: 'lowpass', f: lerp(1400, 380, far), f1: 140, a: 0.005 + far * 0.05, verb: 0.6 + far * 0.6 }); A.noiseHit(t + 0.1, 2.2, g * 0.12, { type: 'lowpass', f: 220, a: 0.4, verb: 0.9 }); };
const sdPop = (A, t, g = 0.06) => { A.noiseHit(t, 0.08, g * 1.6, { type: 'lowpass', f: 1200, verb: 0.8 }); A.osc('sine', 90, t, 0.4, g * 1.2, null, { f1: 40, verb: 0.6 }); for (let i = 0; i < 14; i++) A.noiseHit(t + 0.15 + Math.random() * 0.9, 0.02, g * 0.4, { type: 'highpass', f: 3000 + Math.random() * 4000, q: 2, verb: 0.5 }); };
const sdRocket = (A, t) => { const o = A.osc('sine', 900, t, 0.7, 0.012, null, { f1: 2600, verb: 0.5, a: 0.05 }); A.noiseHit(t, 0.6, 0.02, { type: 'bandpass', f: 1500, f1: 4000, q: 2, a: 0.05 }); return o; };
const sdCreak = (A, t, g = 0.02) => { const o = A.osc('sawtooth', 170 + Math.random() * 40, t, 0.55, g, null, { f1: 240, a: 0.08, verb: 0.3 }); A.noiseHit(t, 0.5, g * 0.6, { type: 'bandpass', f: 900, q: 4, a: 0.1 }); return o; };
const sdClang = (A, t, g = 0.06) => { A.bell(1180, t, 1.6, g, { ratio: 2.76, index: 2.4, verb: 0.6 }); A.bell(1610, t, 1.2, g * 0.5, { ratio: 3.1, index: 2, verb: 0.5 }); A.noiseHit(t, 0.06, g * 1.4, { type: 'highpass', f: 2600 }); };
const sdThunder = (A, t, g = 0.22) => { A.noiseHit(t, 0.25, g, { type: 'highpass', f: 1600, verb: 0.5 }); A.noiseHit(t + 0.05, 3.2, g * 0.9, { type: 'lowpass', f: 600, f1: 90, a: 0.04, verb: 1.0 }); A.osc('sine', 44, t + 0.1, 2.2, g * 0.6, null, { f1: 30, a: 0.2 }); };
const sdCheer = (A, t, d = 2.4, g = 0.03) => { for (let i = 0; i < 70; i++) { const u = Math.random(); A.noiseHit(t + u * d, 0.18 + Math.random() * 0.3, g * Math.sin(Math.min(1, u * 1.4) * PI), { type: 'bandpass', f: 500 + Math.random() * 1600, q: 3, a: 0.04, verb: 0.6 }); } };
const SD_SFX = {
  ergenekon: {
    night(A, t) { A.noiseHit(t, 2.5, 0.03, { type: 'bandpass', f: 400, f1: 900, q: 0.8, a: 1, verb: 0.8 }); },
    hammer(A, t) { sdClang(A, t, 0.07); A.osc('sine', 110, t, 0.2, 0.1, null, { f1: 60 }); },
    melt(A, t) { A.noiseHit(t, 3.2, 0.1, { type: 'lowpass', f: 300, f1: 900, a: 1.2, verb: 0.8 }); A.osc('sine', 40, t, 3.0, 0.2, null, { f1: 32, a: 1.0 }); for (let i = 0; i < 30; i++) A.noiseHit(t + Math.random() * 3, 0.04, 0.03, { type: 'highpass', f: 2500 + Math.random() * 3000 }); },
    dawn(A, t) { [55, 62, 67, 71, 74].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.3, 3.6, 0.018, null, { a: 1.2, verb: 1.3 })); },
    howl(A, t) { stHowl(A, t, 360, 1.8, 0.1, 1.2); stHowl(A, t + 1.9, 300, 1.4, 0.03, 1.6); },
    leap(A, t) { A.noiseHit(t, 0.5, 0.07, { type: 'bandpass', f: 300, f1: 2000, q: 1, a: 0.2 }); A.osc('sine', 80, t + 0.7, 0.3, 0.12, null, { f1: 40 }); },
    march(A, t) { stHooves(A, t, 22, 0.32, 0.05); stPaws(A, t + 0.2, 20, 0.36, 400, 0.025); for (let i = 0; i < 6; i++) sdCreak(A, t + 1.5 + i * 0.9, 0.012); },
  },
  orhun: {
    wind(A, t) { A.noiseHit(t, 4, 0.04, { type: 'bandpass', f: 500, f1: 1200, q: 1.5, a: 1.5, verb: 0.6 }); },
    carve(A, t) { for (let i = 0; i < 9; i++) { const tt = t + i * 0.19; A.noiseHit(tt, 0.05, 0.035, { type: 'highpass', f: 2800, q: 2 }); A.bell(2400 + Math.random() * 300, tt, 0.3, 0.008, { ratio: 2.3, index: 1, verb: 0.6 }); } },
    gallop(A, t) { stHooves(A, t, 16, 0.14, 0.1); },
    bowDraw(A, t) { const o = A.osc('sawtooth', 140, t, 0.6, 0.012, null, { f1: 210, a: 0.3 }); A.noiseHit(t, 0.5, 0.02, { type: 'bandpass', f: 1800, q: 6, a: 0.3 }); return o; },
    arrow(A, t) { A.osc('sine', 260, t, 0.1, 0.06, null, { f1: 120 }); A.noiseHit(t + 0.02, 1.1, 0.05, { type: 'bandpass', f: 2200, f1: 600, q: 3, a: 0.02, verb: 0.6 }); },
    star(A, t) { [88, 95, 100].forEach((n, i) => A.bell(mtof(n), t + i * 0.14, 2.4, 0.03, { ratio: 2, index: 0.8, verb: 1.2 })); },
    dawn(A, t) { [57, 64, 69, 76].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.35, 3.4, 0.018, null, { a: 1.0, verb: 1.3 })); },
  },
  malazgirt: {
    snort(A, t) { A.noiseHit(t, 0.35, 0.09, { type: 'bandpass', f: 600, q: 0.8, a: 0.02 }); },
    drums(A, t) { for (let i = 0; i < 8; i++) { A.osc('sine', 58, t + i * 0.42, 0.9, 0.14, null, { f1: 36, verb: 0.9 }); A.noiseHit(t + i * 0.42, 0.12, 0.05, { type: 'lowpass', f: 260, verb: 0.8 }); } },
    cry(A, t) { sdCheer(A, t, 1.6, 0.04); },
    volley(A, t) { for (let i = 0; i < 40; i++) A.noiseHit(t + Math.random() * 1.6, 0.4, 0.02, { type: 'bandpass', f: 1800 + Math.random() * 1500, f1: 700, q: 4, a: 0.05, verb: 0.4 }); },
    neigh(A, t) { A.voice(t, { dur: 1.35, f: [[0, 620], [0.1, 1180], [0.45, 1080], [0.8, 820], [1.1, 640], [1.35, 420]], F: [[0, [650, 1750, 2700]], [0.5, [720, 1650, 2600]], [1.35, [550, 1250, 2400]]], q: [5, 7, 9], vib: [10.5, 95], rough: [42, 0.25], breath: 0.1, g: 0.24, a: 0.03, r: 0.3, verb: 0.6 }); },
    charge(A, t) { stHooves(A, t, 18, 0.13, 0.12); },
    thunder(A, t) { for (let i = 0; i < 4; i++) stHooves(A, t + i * 0.1, 14, 0.15, 0.06); sdCheer(A, t, 2.4, 0.05); A.noiseHit(t, 3, 0.06, { type: 'lowpass', f: 300, a: 0.5, verb: 0.8 }); },
    gate(A, t) { A.osc('sawtooth', 70, t, 1.6, 0.04, null, { f1: 50, a: 0.1, verb: 0.6 }); A.noiseHit(t, 1.5, 0.05, { type: 'bandpass', f: 300, q: 2, a: 0.2 }); [60, 67, 72, 79].forEach((n, i) => A.osc('triangle', mtof(n), t + 0.6 + i * 0.2, 3.0, 0.02, null, { a: 0.8, verb: 1.3 })); },
  },
  fetih: {
    night(A, t) { A.noiseHit(t, 3, 0.03, { type: 'lowpass', f: 500, a: 1, verb: 0.6 }); },
    haul(A, t) { for (let i = 0; i < 7; i++) { sdCreak(A, t + i * 0.42, 0.016); A.osc('sine', 70, t + i * 0.42 + 0.2, 0.25, 0.04, null, { f1: 45 }); } sdCheer(A, t + 0.4, 1.2, 0.02); },
    splash(A, t) { A.noiseHit(t, 1.4, 0.14, { type: 'lowpass', f: 2200, f1: 300, a: 0.02, verb: 0.8 }); A.osc('sine', 70, t, 0.8, 0.14, null, { f1: 38 }); },
    cannon(A, t) { sdBoom(A, t, 0.4); },
    impact(A, t) { sdBoom(A, t, 0.14, 0.6); for (let i = 0; i < 18; i++) A.noiseHit(t + 0.1 + Math.random() * 1.2, 0.08, 0.04, { type: 'lowpass', f: 900 + Math.random() * 800 }); },
    climb(A, t) { sdCheer(A, t, 2.0, 0.035); },
    flag(A, t) { A.noiseHit(t, 1.6, 0.04, { type: 'bandpass', f: 700, f1: 1400, q: 1.2, a: 0.2 }); sdCheer(A, t + 0.2, 2.6, 0.05); },
    dawn(A, t) { [60, 64, 67, 72, 76].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.25, 3.4, 0.02, null, { a: 0.9, verb: 1.3 })); },
  },
  canakkale: {
    chain(A, t) { for (let i = 0; i < 8; i++) A.bell(2200 + Math.random() * 600, t + i * 0.09, 0.3, 0.012, { ratio: 2.7, index: 1.4 }); A.noiseHit(t, 0.2, 0.04, { type: 'highpass', f: 2000 }); },
    step(A, t) { A.osc('sine', 72, t, 0.3, 0.16, null, { f1: 40 }); A.noiseHit(t, 0.15, 0.05, { type: 'lowpass', f: 500 }); A.voice(t + 0.05, { dur: 0.4, f: [[0, 130], [0.4, 110]], F: [[0, [500, 1200, 2400]]], q: [3, 4, 5], breath: 0.6, g: 0.05, a: 0.05, r: 0.2 }); },
    heave(A, t) { A.voice(t, { dur: 0.9, f: [[0, 140], [0.4, 170], [0.9, 120]], F: [[0, [600, 1100, 2400]]], q: [3, 4, 5], breath: 0.5, rough: [30, 0.3], g: 0.07, a: 0.1, r: 0.3 }); sdClang(A, t + 0.8, 0.04); },
    breech(A, t) { sdClang(A, t, 0.05); A.noiseHit(t + 0.1, 0.15, 0.06, { type: 'bandpass', f: 800, q: 2 }); },
    fire(A, t) { sdBoom(A, t, 0.55); },
    hit(A, t) { sdBoom(A, t, 0.2, 0.7); },
    sink(A, t) { A.noiseHit(t, 3, 0.05, { type: 'lowpass', f: 400, f1: 150, a: 0.5, verb: 0.9 }); A.osc('sawtooth', 60, t, 2.4, 0.02, null, { f1: 40, a: 0.4, verb: 0.8 }); },
    salute(A, t) { [62, 66, 69, 74].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.32, 2.8, 0.02, null, { a: 0.6, verb: 1.2 })); },
  },
  samsun: {
    storm(A, t) { A.noiseHit(t, 4, 0.08, { type: 'bandpass', f: 600, f1: 1200, q: 0.8, a: 1, verb: 0.8 }); },
    thunder(A, t) { sdThunder(A, t, 0.24); },
    waveCrash(A, t) { A.noiseHit(t, 1.6, 0.16, { type: 'lowpass', f: 2400, f1: 300, a: 0.05, verb: 0.8 }); },
    calm(A, t) { [55, 62, 67, 71].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.4, 3.6, 0.018, null, { a: 1.2, verb: 1.3 })); },
    gulls(A, t) { for (let i = 0; i < 3; i++) A.voice(t + i * 0.42, { dur: 0.32 + (i === 2) * 0.2, f: [[0, 1650], [0.08, 2200], [0.32, 1500]], F: [[0, [1700, 2600, 3600]], [0.2, [1500, 2300, 3300]]], q: [6, 8, 10], rough: [70, 0.3], breath: 0.15, g: 0.08, a: 0.02, r: 0.12, verb: 0.9 }); },
    whistle(A, t) { for (const f of [392, 494, 587]) A.osc('sawtooth', f, t, 2.2, 0.02, null, { f1: f * 0.99, a: 0.1, verb: 1.0 }); A.noiseHit(t, 2.2, 0.05, { type: 'bandpass', f: 1500, q: 1.5, a: 0.1, verb: 0.8 }); },
  },
  kagni: {
    blizzard(A, t) { A.noiseHit(t, 5, 0.06, { type: 'bandpass', f: 1300, f1: 800, q: 5, a: 1.5, verb: 0.7 }); },
    creak(A, t) { for (let i = 0; i < 3; i++) sdCreak(A, t + i * 0.6, 0.022); },
    stop(A, t) { A.voice(t, { dur: 0.7, f: [[0, 220], [0.7, 180]], F: [[0, [700, 1200, 2600]]], q: [3, 4, 5], breath: 0.7, g: 0.04, a: 0.1, r: 0.3 }); },
    shawl(A, t) { A.noiseHit(t, 1.2, 0.05, { type: 'bandpass', f: 700, f1: 1500, q: 1.2, a: 0.3 }); },
    soul(A, t) { [69, 76, 81, 88].forEach((n, i) => A.bell(mtof(n), t + i * 0.5, 3.2, 0.022, { ratio: 2, index: 0.6, verb: 1.4 })); },
  },
  kocatepe: {
    wind(A, t) { A.noiseHit(t, 4, 0.04, { type: 'bandpass', f: 600, f1: 1100, q: 1.4, a: 1.5, verb: 0.6 }); },
    cannonFar(A, t) { sdBoom(A, t, 0.16, 1); },
    march(A, t) { for (let i = 0; i < 16; i++) A.osc('sine', 70, t + i * 0.42, 0.2, 0.04, null, { f1: 45, verb: 0.6 }); },
    order(A, t) { [55, 62, 67, 74, 79].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.22, 4.2, 0.022, null, { a: 0.5, verb: 1.3 })); },
  },
  sancak: {
    silence(A, t) { A.noiseHit(t, 3, 0.02, { type: 'lowpass', f: 400, a: 1.4, verb: 0.6 }); },
    emblem(A, t) { [76, 83, 88, 95].forEach((n, i) => A.bell(mtof(n), t + i * 0.22, 3.0, 0.026, { ratio: 2, index: 0.7, verb: 1.4 })); },
    pool(A, t) { A.osc('sine', 98, t, 3.2, 0.04, null, { f1: 92, a: 1.2, verb: 1.0 }); for (let i = 0; i < 4; i++) A.osc('sine', 700 + i * 120, t + 0.6 + i * 0.5, 0.2, 0.01, null, { f1: 900, verb: 0.9 }); },
    rise(A, t) { [43, 50, 55, 62].forEach((n, i) => A.osc('sawtooth', mtof(n), t, 3.0, 0.012, null, { a: 2.4, verb: 1.0 })); A.noiseHit(t, 3, 0.04, { type: 'lowpass', f: 200, f1: 1600, a: 2.6, verb: 0.8 }); },
    swell(A, t) { [55, 62, 67, 71, 74].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.18, 5.0, 0.024, null, { a: 1.6, verb: 1.3 })); },
    unfurl(A, t) { A.noiseHit(t, 0.8, 0.12, { type: 'bandpass', f: 400, f1: 1600, q: 1, a: 0.05, verb: 0.5 }); A.osc('sine', 60, t, 0.5, 0.16, null, { f1: 40 }); },
    wind(A, t) { A.noiseHit(t, 4, 0.05, { type: 'bandpass', f: 700, f1: 1400, q: 1.2, a: 1, verb: 0.6 }); for (let i = 0; i < 6; i++) A.noiseHit(t + 0.4 + i * 0.6, 0.3, 0.04, { type: 'bandpass', f: 500, q: 1.5, a: 0.05 }); },
    anthemLine(A, t) { [60, 67, 72, 76, 79, 84].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.12, 4.2, 0.02, null, { a: 0.8, verb: 1.4 })); },
  },
  cumhuriyet: {
    night(A, t) { sdCheer(A, t, 1.6, 0.012); },
    salvo(A, t) { for (let i = 0; i < 14; i++) sdBoom(A, t + i * 0.22, 0.14, 0.4); },
    hoist(A, t) { A.noiseHit(t, 2.0, 0.03, { type: 'bandpass', f: 900, q: 1.2, a: 0.3 }); sdCheer(A, t + 0.5, 2.0, 0.045); },
    fireworks(A, t) { for (let i = 0; i < 16; i++) { const c = 3.2 + i * 0.62 + (i > 10 ? (i - 10) * 0.3 : 0), d = c - 3.2; sdRocket(A, t + d - 0.7); sdPop(A, t + d, 0.05 + (i % 3) * 0.01); } },
    march(A, t) { sdCheer(A, t, 5, 0.03); for (let i = 0; i < 24; i++) stPaws(A, t + i * 0.25, 1, 0.1, 500, 0.02); },
    parade(A, t) { sdCheer(A, t, 2.4, 0.04); },
    finale(A, t) { for (let i = 0; i < 10; i++) { sdRocket(A, t + i * 0.22 - 0.7); sdPop(A, t + i * 0.22, 0.06); } sdCheer(A, t, 3.2, 0.06); },
  },
};
