// Avatar çerçeveleri: taş takımlarıyla aynı boya motoru (sır, metal varak, ebru mermerleme) ile prosedürel boyanır.
// Seriler: İznik çini (kobalt/turkuaz/mercan sır), Ebru + telkari (mermerli kâğıt, bükülmüş gümüş/altın tel, granül),
// Zanaat (sedef kakma, kilim, bakır, tezhip, kehribar), Nişan (çelenk, sorguç). 480×560 tuval; avatar dairesi yarıçapı 150 px (kutunun %62.5'i). Sonuç blob URL olarak
// bellekte ve IndexedDB'de saklanır.
import { TAU, rng, canvas, idle, buildTextures, TEX, makeNoise, ramp, hsl, pathShape, paintGlaze, metalPaint, poly, bez, rosettePath, leafPath, crackle, drop, tine, wave, marble } from './paint.js';
import { C1, ciniTulip, ciniCarnation, sazPath } from './cini.js';
import { DB } from './store.js';

// Tuval 480×560: avatar merkezi (240, 320); üstteki 80 px taç ve sorguç payı
const S = 480,
  SH = 560,
  CX = 240,
  CY = 320;
const BOX = [0, 0, S, SH];

/* ───────────── geometri ───────────── */
const P = (r, a) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
const ringPath = (p, r0, r1) => {
  p.beginPath();
  p.arc(CX, CY, r1, 0, TAU);
  p.moveTo(CX + r0, CY);
  p.arc(CX, CY, r0, 0, TAU, true);
};
const ring = (r0, r1) => pathShape((p) => ringPath(p, r0, r1));
function clipRing(x, r0, r1) {
  ringPath(x, r0, r1);
  x.clip();
}
// yerel (u: teğet, v: dışa) koordinatı halkaya bük
const bend = (Rm, th) => (u, v) => P(Rm + v, th + u / Rm);

/* ───────────── malzemeler ───────────── */
// sırlı bant: renk, havuzlanan kenar, çatlak sır, parlak yansıma
function glazeBand(x, r0, r1, ink, o = {}) {
  paintGlaze(x, ring(r0, r1), ink, { bb: BOX, contourW: 0, pool: o.pool ?? 7, mottle: o.mottle ?? 0.26, bleed: 3 });
  if (o.crackle !== false) {
    x.save();
    clipRing(x, r0, r1);
    crackle(x, o.seed || 5, o.crackColor || 'rgba(30,30,40,0.16)', 26, 6);
    x.restore();
  }
}
function gloss(x, r0, r1, k = 1) {
  x.save();
  clipRing(x, r0, r1);
  const g = x.createRadialGradient(CX - 110, CY - 130, 6, CX - 50, CY - 70, 300);
  g.addColorStop(0, `rgba(255,255,255,${0.36 * k})`);
  g.addColorStop(0.4, `rgba(255,255,255,${0.06 * k})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, S, SH);
  const d = x.createLinearGradient(CX - 100, CY - 100, CX + 200, CY + 200);
  d.addColorStop(0, 'rgba(0,0,0,0)');
  d.addColorStop(1, `rgba(10,8,20,${0.22 * k})`);
  x.fillStyle = d;
  x.fillRect(0, 0, S, SH);
  x.lineCap = 'round';
  x.strokeStyle = `rgba(255,255,255,${0.55 * k})`;
  x.lineWidth = (r1 - r0) * 0.09;
  x.beginPath();
  x.arc(CX, CY, r1 - (r1 - r0) * 0.22, Math.PI * 1.06, Math.PI * 1.36);
  x.stroke();
  x.strokeStyle = `rgba(255,255,255,${0.22 * k})`;
  x.lineWidth = (r1 - r0) * 0.05;
  x.beginPath();
  x.arc(CX, CY, r1 - (r1 - r0) * 0.22, Math.PI * 1.42, Math.PI * 1.52);
  x.stroke();
  x.restore();
}
// metal bilezik: kabartma kenarlar ve ışık sırtı
function metalRing(x, r, w, kind = 'gold', o = {}) {
  metalPaint(
    x,
    (g) => {
      g.lineWidth = w;
      g.beginPath();
      g.arc(CX, CY, r, 0, TAU);
      g.stroke();
    },
    kind,
    { leaf: o.leaf ?? 0.16, shadow: 'rgba(20,10,0,0.55)', shadowBlur: 4, shadowY: 2 },
  );
  x.save();
  x.strokeStyle = 'rgba(40,24,6,0.55)';
  x.lineWidth = 1.1;
  for (const d of [-w / 2 + 0.5, w / 2 - 0.5]) {
    x.beginPath();
    x.arc(CX, CY, r + d, 0, TAU);
    x.stroke();
  }
  const g = x.createLinearGradient(CX - r, CY - r, CX + r * 0.4, CY + r * 0.4);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.strokeStyle = g;
  x.lineWidth = Math.max(1, w * 0.22);
  x.beginPath();
  x.arc(CX, CY, r - w * 0.12, 0, TAU);
  x.stroke();
  x.restore();
}
function beads(x, r, n, br, kind = 'gold', a0 = 0) {
  metalPaint(
    x,
    (g) => {
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const [px, py] = P(r, a0 + (k * TAU) / n);
        g.moveTo(px + br, py);
        g.arc(px, py, br, 0, TAU);
      }
      g.fill();
    },
    kind,
    { leaf: 0.1, shadow: 'rgba(20,10,0,0.6)', shadowBlur: 3, shadowY: 1.5 },
  );
  x.save();
  x.fillStyle = 'rgba(255,255,255,0.75)';
  for (let k = 0; k < n; k++) {
    const [px, py] = P(r, a0 + (k * TAU) / n);
    x.beginPath();
    x.arc(px - br * 0.32, py - br * 0.34, br * 0.32, 0, TAU);
    x.fill();
  }
  x.restore();
}
// telkari: bükülmüş tel (metal + çapraz burgu izleri)
function wire(x, lines, w, kind = 'silver', closed = false) {
  metalPaint(
    x,
    (g) => {
      g.lineWidth = w;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const L of lines) {
        poly(g, L, closed);
        g.stroke();
      }
    },
    kind,
    { leaf: 0.08, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 2.5, shadowY: 1.4 },
  );
  x.save();
  x.lineCap = 'round';
  const step = w * 0.95;
  for (const L of lines) {
    let acc = 0;
    for (let i = 1; i < L.length; i++) {
      const [ax, ay] = L[i - 1],
        [bx, by] = L[i];
      const dx = bx - ax,
        dy = by - ay,
        len = Math.hypot(dx, dy) || 1;
      const ux = dx / len,
        uy = dy / len;
      for (let s = step - acc; s < len; s += step) {
        const px = ax + ux * s,
          py = ay + uy * s;
        const hx = (ux - uy) * 0.5 * w,
          hy = (uy + ux) * 0.5 * w;
        x.strokeStyle = 'rgba(0,0,0,0.42)';
        x.lineWidth = Math.max(0.7, w * 0.2);
        x.beginPath();
        x.moveTo(px - hx * 0.6, py - hy * 0.6);
        x.lineTo(px + hx * 0.6, py + hy * 0.6);
        x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.55)';
        x.lineWidth = Math.max(0.5, w * 0.12);
        x.beginPath();
        x.moveTo(px - hx * 0.45 + uy * 0.6, py - hy * 0.45 - ux * 0.6);
        x.lineTo(px + hx * 0.2 + uy * 0.6, py + hy * 0.2 - ux * 0.6);
        x.stroke();
      }
      acc = (acc + len) % step;
    }
  }
  x.restore();
}
const circleLine = (r, n = 220) => Array.from({ length: n + 1 }, (_, i) => P(r, (i * TAU) / n));
function spiral(cx, cy, r, turns, a0, dir, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      rr = r * (1 - 0.86 * t),
      a = a0 + dir * turns * TAU * t;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}
// telkari motifi (lir): iki ayna kıvrım + üstte damla ilmik; yerel u/v koordinatında, halkaya bükülür
function lyre(Rm, th, s) {
  const B = bend(Rm, th);
  const map = (L) => L.map(([u, v]) => B(u, v));
  const left = spiral(-s * 0.95, 0, s * 0.9, 1.25, 0, -1).map(([u, v]) => [u, v]);
  const right = left.map(([u, v]) => [-u, v]);
  const loop = [];
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * TAU;
    loop.push([Math.sin(a) * s * 0.42, s * 0.95 + s * 0.62 * (1 - Math.cos(a)) * 0.95]);
  }
  return [map(left), map(right), map(loop)];
}
function granules(x, pts, r, kind = 'silver') {
  metalPaint(
    x,
    (g) => {
      g.beginPath();
      for (const [px, py] of pts) {
        g.moveTo(px + r, py);
        g.arc(px, py, r, 0, TAU);
      }
      g.fill();
    },
    kind,
    { leaf: 0.05, shadow: 'rgba(0,0,0,0.55)', shadowBlur: 2, shadowY: 1 },
  );
  x.save();
  x.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [px, py] of pts) {
    x.beginPath();
    x.arc(px - r * 0.3, py - r * 0.32, r * 0.34, 0, TAU);
    x.fill();
  }
  x.restore();
}
// telkari taç: dış kenarda lir motifleri ve granül
function filigreeCrown(x, Rm, n, s, kind, a0 = 0) {
  const lines = [];
  const gran = [];
  for (let k = 0; k < n; k++) {
    const th = a0 + (k * TAU) / n;
    lines.push(...lyre(Rm, th, s));
    gran.push(P(Rm + s * 2.55, th), P(Rm + s * 0.2, th + TAU / n / 2));
  }
  wire(x, lines, s * 0.2, kind);
  granules(x, gran, s * 0.24, kind);
}
// mücevher: altın yuva, fasetli taş, parıltı
function gem(x, cx, cy, r, col) {
  metalPaint(
    x,
    (g) => {
      g.beginPath();
      g.arc(cx, cy, r * 1.3, 0, TAU);
      g.fill();
      for (let k = 0; k < 8; k++) {
        const a = (k * TAU) / 8 + TAU / 16;
        g.moveTo(cx + Math.cos(a) * r * 1.5 + r * 0.2, cy + Math.sin(a) * r * 1.5);
        g.arc(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.5, r * 0.2, 0, TAU);
      }
      g.fill();
    },
    'gold',
    { leaf: 0.12, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 5, shadowY: 2.5 },
  );
  x.save();
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r);
  g.addColorStop(0, col[0]);
  g.addColorStop(0.45, col[1]);
  g.addColorStop(1, col[2]);
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, TAU);
  x.fill();
  // fasetler
  const oct = Array.from({ length: 8 }, (_, k) => [cx + Math.cos((k * TAU) / 8 + 0.2) * r * 0.55, cy + Math.sin((k * TAU) / 8 + 0.2) * r * 0.55]);
  x.lineWidth = Math.max(0.6, r * 0.05);
  x.strokeStyle = 'rgba(255,255,255,0.28)';
  poly(x, oct);
  x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.22)';
  oct.forEach(([px, py], k) => {
    const a = (k * TAU) / 8 + 0.2;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    x.stroke();
  });
  x.fillStyle = 'rgba(255,255,255,0.18)';
  x.beginPath();
  x.moveTo(oct[4][0], oct[4][1]);
  for (const k of [5, 6, 7]) x.lineTo(oct[k][0], oct[k][1]);
  x.closePath();
  x.fill();
  // parıltı
  x.fillStyle = 'rgba(255,255,255,0.92)';
  x.beginPath();
  x.ellipse(cx - r * 0.36, cy - r * 0.4, r * 0.24, r * 0.13, -0.6, 0, TAU);
  x.fill();
  sparkle(x, cx - r * 0.42, cy - r * 0.46, r * 0.9);
  x.restore();
}
function sparkle(x, cx, cy, r) {
  x.save();
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(cx, cy - r);
  x.quadraticCurveTo(cx, cy, cx + r, cy);
  x.quadraticCurveTo(cx, cy, cx, cy + r);
  x.quadraticCurveTo(cx, cy, cx - r, cy);
  x.quadraticCurveTo(cx, cy, cx, cy - r);
  x.fill();
  x.restore();
}
function pearl(x, cx, cy, r) {
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.5)';
  x.shadowBlur = 3;
  x.shadowOffsetY = 1.5;
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fffdf7');
  g.addColorStop(0.5, '#efe6da');
  g.addColorStop(0.85, '#c7b9ab');
  g.addColorStop(1, '#9d8f84');
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, TAU);
  x.fill();
  x.restore();
  x.save();
  x.fillStyle = 'rgba(255,214,226,0.22)';
  x.beginPath();
  x.arc(cx + r * 0.2, cy + r * 0.25, r * 0.55, 0, TAU);
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.95)';
  x.beginPath();
  x.arc(cx - r * 0.35, cy - r * 0.38, r * 0.22, 0, TAU);
  x.fill();
  x.restore();
}
// çini madalyon: beyaz sır disk, kobalt kenar, mercan lale
function medallion(x, cx, cy, r) {
  metalPaint(
    x,
    (g) => {
      g.beginPath();
      g.arc(cx, cy, r + 4, 0, TAU);
      g.fill();
    },
    'gold',
    { leaf: 0.12, shadow: 'rgba(0,0,0,0.55)', shadowBlur: 4, shadowY: 2 },
  );
  const disk = pathShape((p) => {
    p.beginPath();
    p.arc(cx, cy, r, 0, TAU);
  });
  paintGlaze(x, disk, C1.white, { bb: BOX, contourW: 0, pool: 3, mottle: 0.18 });
  const rim = pathShape((p) => {
    p.beginPath();
    p.arc(cx, cy, r, 0, TAU);
    p.moveTo(cx + r * 0.8, cy);
    p.arc(cx, cy, r * 0.8, 0, TAU, true);
  });
  paintGlaze(x, rim, C1.cobalt, { bb: BOX, contourW: 0, pool: 2, mottle: 0.2 });
  ciniTulip(x, cx, cy + r * 0.5, r * 1.02, 0, C1.coral);
  x.save();
  const g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.45, 1, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, TAU);
  x.fill();
  x.restore();
}
function goldLeaf(x, cx, cy, len, ang, wid = 0.34) {
  metalPaint(x, (g) => (leafPath(g, cx, cy, len, ang, wid), g.fill()), 'gold', { leaf: 0.14, shadow: 'rgba(0,0,0,0.55)', shadowBlur: 3, shadowY: 1.5 });
  x.save();
  x.strokeStyle = 'rgba(90,55,10,0.7)';
  x.lineWidth = 1;
  x.beginPath();
  const c = Math.cos(ang),
    s = Math.sin(ang);
  x.moveTo(cx - c * len * 0.85, cy - s * len * 0.85);
  x.lineTo(cx + c * len * 0.85, cy + s * len * 0.85);
  x.stroke();
  x.restore();
}
// ebru bandı: maske dışı boyanmaz, kâğıt dokusu ve hafif parlaklık
async function ebruBand(x, ops, base, r0, r1, aa = true) {
  const img = await marble(ops, base, aa, (i, j) => {
    const d = Math.hypot(i - CX, j - CY);
    return d > r0 - 3 && d < r1 + 3 && j < SH;
  });
  x.save();
  clipRing(x, r0, r1);
  x.drawImage(img, 0, 0);
  x.globalAlpha = 0.35;
  x.drawImage(TEX.grain, 0, 0);
  x.globalAlpha = 0.12;
  x.drawImage(TEX.dark, 0, 0);
  x.restore();
}
const EB = { indigo: '#22366c', rose: '#b55f66', ochre: '#cf9d45', cream: '#efe3c9', slate: '#5c6c7a', sage: '#7d987a', deep: '#17244d' };
function battalDrops(R, ops, rr, n, pal, rmin, rmax) {
  for (let k = 0; k < n; k++) {
    const a = R() * TAU,
      d = rr[0] + R() * (rr[1] - rr[0]);
    const [px, py] = P(d, a);
    ops.push(drop(px, py, rmin + R() * (rmax - rmin), pal[(R() * pal.length) | 0]));
  }
}

/* ───────────── kutupsal piksel boyacı: bant bir şerit gibi tasarlanır, halkaya sarılır ───────────── */
// fn(u, v, o, L): u yay uzunluğu (0..L, tepeden saat yönünde), v bant içi konum (0 iç → 1 dış), o = [r, g, b]
async function polarBand(x, r0, r1, fn) {
  const c = canvas(S, SH),
    g = c.getContext('2d'),
    img = g.createImageData(S, SH),
    d = img.data,
    Rm = (r0 + r1) / 2,
    L = TAU * Rm,
    o = [0, 0, 0];
  let t0 = performance.now();
  for (let j = Math.floor(CY - r1 - 2); j < Math.ceil(CY + r1 + 2); j++) {
    if (j < 0 || j >= SH) continue;
    for (let i = Math.floor(CX - r1 - 2); i < Math.ceil(CX + r1 + 2); i++) {
      if (i < 0 || i >= S) continue;
      const dx = i + 0.5 - CX,
        dy = j + 0.5 - CY,
        r = Math.hypot(dx, dy);
      if (r < r0 - 1 || r > r1 + 1) continue;
      const cov = Math.max(0, Math.min(1, r1 + 0.5 - r)) * Math.max(0, Math.min(1, r - r0 + 0.5));
      if (!cov) continue;
      const ang = (Math.atan2(dy, dx) + Math.PI / 2 + TAU) % TAU;
      fn(ang * Rm, Math.max(0, Math.min(1, (r - r0) / (r1 - r0))), o, L);
      const q = (j * S + i) * 4;
      d[q] = o[0];
      d[q + 1] = o[1];
      d[q + 2] = o[2];
      d[q + 3] = 255 * cov;
    }
    if (performance.now() - t0 > 30) {
      await idle();
      t0 = performance.now();
    }
  }
  g.putImageData(img, 0, 0);
  x.drawImage(c, 0, 0);
}
// halka üstünde (u, v) → tuval noktası; Rm orta yarıçap, v merkezden dışa sapma
const polarPt = (Rm) => (u, v) => P(Rm + v, -Math.PI / 2 + u / Rm);
const sstep = (a, b, t) => {
  const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
// tekrar sayısı tam olsun diye periyodu çevreye uydurur
const fitPeriod = (L, p) => L / Math.max(1, Math.round(L / p));

function star8(x, cx, cy, r) {
  x.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8,
      q = i % 2 ? r * 0.55 : r;
    i ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
  }
  x.closePath();
}
/* ───────────── tasarımlar ───────────── */
const DESIGNS = {
  // Pirinç halka: geniş dövme pirinç bilezik, kabartma rumi kıvrımları, iki boncuk dizisi, cilalı ışık
  async sade(x) {
    metalRing(x, 166, 34, 'brass', { leaf: 0.22 });
    // kabartma: koyu gölge + açık ışık ile çift çizim
    const lines = [];
    const N = 12;
    for (let k = 0; k < N; k++) lines.push(...lyre(160, (k * TAU) / N + TAU / 24, 7.6).slice(0, 2));
    for (const [dx, dy, col, w] of [
      [0.9, 1.1, 'rgba(70,40,8,0.55)', 2.2],
      [-0.6, -0.7, 'rgba(255,244,210,0.55)', 1.4],
      [0, 0, 'rgba(176,132,58,0.9)', 1.6],
    ]) {
      x.save();
      x.translate(dx, dy);
      x.strokeStyle = col;
      x.lineWidth = w;
      x.lineCap = 'round';
      for (const l of lines) {
        poly(x, l, false);
        x.stroke();
      }
      x.restore();
    }
    for (let k = 0; k < N; k++) {
      const [px, py] = P(176, (k * TAU) / N + TAU / 24);
      x.save();
      x.fillStyle = 'rgba(70,40,8,0.5)';
      star8(x, px + 0.8, py + 1, 3.6);
      x.fill();
      x.fillStyle = '#e8c97a';
      star8(x, px, py, 3.6);
      x.fill();
      x.restore();
    }
    beads(x, 151, 56, 2, 'brass');
    beads(x, 181.5, 64, 2, 'brass', TAU / 128);
    gloss(x, 149, 183, 0.7);
    x.save();
    x.strokeStyle = 'rgba(60,34,6,0.7)';
    x.lineWidth = 1.2;
    for (const r of [148.6, 183.4]) {
      x.beginPath();
      x.arc(CX, CY, r, 0, TAU);
      x.stroke();
    }
    x.restore();
    return 147;
  },

  // Lale bordür: kobalt sır, beyaz laleler, turkuaz rozetler
  async lale(x) {
    glazeBand(x, 146, 198, C1.cobalt, { seed: 12, crackColor: 'rgba(255,255,255,0.08)' });
    const N = 8;
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + (k * TAU) / N;
      const [bx, by] = P(155, th);
      for (const sd of [-1, 1]) {
        const leaf = pathShape((p) => leafPath(p, ...P(162, th + sd * 0.085), 12, th + sd * 0.9, 0.32));
        paintGlaze(x, leaf, C1.turq, { bb: BOX, contour: 'rgba(8,20,55,0.8)', contourW: 1.1, pool: 3 });
      }
      ciniTulip(x, bx, by, 42, th + Math.PI / 2, C1.white);
      const ta = th + TAU / N / 2;
      const [rx, ry] = P(172, ta);
      const ros = pathShape((p) => rosettePath(p, rx, ry, 10, 5, ta));
      x.save();
      x.strokeStyle = C1.white;
      x.lineWidth = 2.4;
      ros(x, 'stroke');
      x.restore();
      paintGlaze(x, ros, C1.turq, { bb: BOX, contour: 'rgba(8,20,55,0.85)', contourW: 1, pool: 3 });
      x.fillStyle = C1.coral;
      x.beginPath();
      x.arc(rx, ry, 2.6, 0, TAU);
      x.fill();
    }
    gloss(x, 146, 198);
    metalRing(x, 146, 7, 'brass');
    metalRing(x, 199, 8, 'brass');
    return 143;
  },

  // Rumi çini: turkuaz zemin, kobalt saz yaprakları, beyaz rozetler
  async rumi(x) {
    glazeBand(x, 146, 200, C1.turq, { seed: 18 });
    const N = 6;
    for (let k = 0; k < N; k++) {
      const a0 = (k * TAU) / N - 0.3,
        a1 = a0 + 0.86;
      const sp = Array.from({ length: 31 }, (_, i) => {
        const t = i / 30;
        return P(173 + Math.sin(t * Math.PI * 2) * 9, a0 + (a1 - a0) * t);
      });
      const leaf = pathShape((p) => sazPath(p, sp, 9.5, 1));
      x.save();
      x.strokeStyle = C1.white;
      x.lineWidth = 3;
      x.lineJoin = 'round';
      leaf(x, 'stroke');
      x.restore();
      paintGlaze(x, leaf, C1.cobalt, { bb: BOX, contour: 'rgba(8,16,45,0.9)', contourW: 1.2, pool: 4 });
      x.save();
      x.strokeStyle = 'rgba(240,244,255,0.75)';
      x.lineWidth = 1.2;
      poly(x, sp.slice(3, 27), false);
      x.stroke();
      x.restore();
      const ta = a1 + (TAU / N - 0.86) / 2;
      const [rx, ry] = P(173, ta);
      const ros = pathShape((p) => rosettePath(p, rx, ry, 11, 6, ta));
      paintGlaze(x, ros, C1.white, { bb: BOX, contour: 'rgba(8,20,55,0.85)', contourW: 1.1, pool: 3 });
      x.fillStyle = C1.coral;
      x.beginPath();
      x.arc(rx, ry, 3.4, 0, TAU);
      x.fill();
    }
    gloss(x, 146, 200);
    metalRing(x, 146, 7, 'brass');
    metalRing(x, 201, 8, 'brass');
    beads(x, 211, 40, 3, 'brass');
    return 143;
  },

  // Şal ebru: krem zeminde iri damla sıraları, tek yönlü uzun tarak → tüy gibi sivri şal motifleri; gümüş telkari taç
  async sal(x) {
    const ops = [];
    const pal = [EB.indigo, EB.rose, EB.ochre, EB.sage];
    let k = 0;
    for (let y = CY - 262; y < CY + 262; y += 16) {
      const c = pal[k++ % pal.length];
      for (let xx = 0; xx < 480; xx += 16) {
        const d = Math.hypot(xx - CX, y - CY);
        if (d > 108 && d < 246) ops.push(drop(xx + (k % 2) * 8, y, 6.2, c), drop(xx + (k % 2) * 8, y, 2.6, '#f2e8d4'));
      }
    }
    for (let xg = 4, i = 0; xg < 480; xg += 16, i++) ops.push(tine(xg, 0, Math.PI / 2, 22, 4));
    ops.push(wave(0, 3, 64));
    await ebruBand(x, ops, '#f2e8d4', 150, 196, false);
    gloss(x, 150, 196, 0.45);
    wire(x, [circleLine(148)], 5.5, 'silver', true);
    wire(x, [circleLine(198)], 5.5, 'silver', true);
    filigreeCrown(x, 205, 14, 7.5, 'silver');
    return 145;
  },

  // Mercan İznik: beyaz sır, mercan lale ve karanfil, kobalt bordür, altın sırt
  async mercan(x) {
    glazeBand(x, 144, 206, C1.white, { seed: 21, mottle: 0.16, pool: 5 });
    glazeBand(x, 144, 152, C1.cobalt, { crackle: false, pool: 2 });
    glazeBand(x, 198, 206, C1.cobalt, { crackle: false, pool: 2 });
    const N = 6;
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + (k * TAU) / N;
      for (const sd of [-1, 1]) {
        const leaf = pathShape((p) => leafPath(p, ...P(166, th + sd * 0.13), 13, th + sd * 1.1, 0.3));
        paintGlaze(x, leaf, C1.stem, { bb: BOX, contour: 'rgba(8,30,25,0.8)', contourW: 1.1, pool: 3 });
      }
      ciniTulip(x, ...P(155, th), 40, th + Math.PI / 2, C1.coral);
      const ta = th + TAU / N / 2;
      ciniCarnation(x, ...P(177, ta), 15, ta + Math.PI / 2);
      x.fillStyle = C1.cobalt;
      for (const d of [-0.2, 0.2]) {
        x.beginPath();
        x.arc(...P(187, ta + d), 2.4, 0, TAU);
        x.fill();
      }
    }
    gloss(x, 144, 206);
    metalRing(x, 142, 6, 'gold');
    metalRing(x, 209, 7, 'gold');
    beads(x, 219, 44, 3.3, 'gold');
    return 139;
  },

  // Hatip ebru: dokuz hatip motifi (damla halkaları dışa çekilmiş), altın telkari
  async hatip(x) {
    const R = rng(616),
      ops = [];
    battalDrops(R, ops, [135, 210], 120, [EB.deep, EB.indigo, EB.slate, EB.indigo], 6, 14);
    const N = 9;
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + (k * TAU) / N;
      const [cx, cy] = P(170, th);
      [
        [19, EB.rose],
        [15.5, EB.cream],
        [12, EB.ochre],
        [8.5, EB.cream],
        [5, EB.rose],
        [2.4, EB.indigo],
      ].forEach(([r, c]) => ops.push(drop(cx, cy, r, c)));
    }
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + (k * TAU) / N;
      ops.push(tine(...P(170, th), th, 17, 3.5));
    }
    await ebruBand(x, ops, EB.indigo, 150, 196);
    gloss(x, 150, 196, 0.5);
    wire(x, [circleLine(148)], 6, 'gold', true);
    wire(x, [circleLine(198)], 6, 'gold', true);
    filigreeCrown(x, 205, 18, 7, 'gold', TAU / 36);
    return 145;
  },

  // Ağa çelengi: zümrüt mine üstünde altın telkari, çini madalyonlar, zümrüt taç
  async aga(x) {
    glazeBand(x, 146, 200, '#0f4f3d', { seed: 33, mottle: 0.3, crackle: false });
    const lines = [];
    const N = 16;
    for (let k = 0; k < N; k++) lines.push(...lyre(165, (k * TAU) / N, 8.2).slice(0, 2));
    wire(x, lines, 2.4, 'gold');
    gloss(x, 146, 200, 0.8);
    wire(x, [circleLine(146)], 6.5, 'gold', true);
    wire(x, [circleLine(200)], 6.5, 'gold', true);
    beads(x, 210, 48, 3.2, 'gold');
    for (const a of [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) medallion(x, ...P(173, a), 17);
    for (const a of [0, Math.PI, Math.PI / 2]) gem(x, ...P(173, a), 8, ['#b9ffd8', '#1f9d63', '#06402a']);
    // çelenk: üstte defne kolları, inci uçlar, büyük zümrüt
    for (const sd of [-1, 1]) {
      const sp = bez(P(214, -Math.PI / 2 + sd * 0.95), P(236, -Math.PI / 2 + sd * 0.6), [CX + sd * 52, CY - 268], [CX + sd * 10, CY - 276], 24);
      wire(x, [sp], 3.2, 'gold');
      for (let i = 2; i < 24; i += 3) {
        const [px, py] = sp[i],
          [qx, qy] = sp[i + 1];
        const a = Math.atan2(qy - py, qx - px);
        goldLeaf(x, px + Math.cos(a - sd * 1.2) * 8, py + Math.sin(a - sd * 1.2) * 8, 9.5 - i * 0.15, a - sd * 0.75);
        goldLeaf(x, px + Math.cos(a + sd * 1.2) * 7, py + Math.sin(a + sd * 1.2) * 7, 8 - i * 0.12, a + sd * 0.7);
      }
    }
    for (const sd of [-1, 0, 1]) pearl(x, CX + sd * 20, CY - 262 - (sd ? 0 : 14), sd ? 4.5 : 5.5);
    gem(x, CX, CY - 214, 19, ['#c8ffe2', '#20a868', '#053d28']);
    return 143;
  },

  // Paşa sorgucu: İznik bant, altın telkari, inci dizisi, yakut yuvalı tüy sorguç
  async pasa(x) {
    glazeBand(x, 144, 204, C1.white, { seed: 44, mottle: 0.16, pool: 5 });
    glazeBand(x, 144, 151, C1.cobalt, { crackle: false, pool: 2 });
    glazeBand(x, 197, 204, C1.cobalt, { crackle: false, pool: 2 });
    const N = 7;
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + TAU / N / 2 + (k * TAU) / N;
      for (const sd of [-1, 1]) {
        const leaf = pathShape((p) => leafPath(p, ...P(165, th + sd * 0.12), 13, th + sd * 1.1, 0.3));
        paintGlaze(x, leaf, C1.stem, { bb: BOX, contour: 'rgba(8,30,25,0.8)', contourW: 1.1, pool: 3 });
      }
      ciniTulip(x, ...P(154, th), 39, th + Math.PI / 2, C1.coral);
      const ta = th + TAU / N / 2;
      if (k !== N - 1) {
        ciniCarnation(x, ...P(177, ta), 17, ta + Math.PI / 2);
        x.fillStyle = C1.cobalt;
        for (const d of [-0.17, 0.17]) {
          x.beginPath();
          x.arc(...P(190, ta + d), 2.3, 0, TAU);
          x.fill();
        }
      }
    }
    gloss(x, 144, 204);
    wire(x, [circleLine(142)], 6.5, 'gold', true);
    wire(x, [circleLine(206)], 6.5, 'gold', true);
    filigreeCrown(x, 212, 20, 6.4, 'gold', TAU / 40);
    for (let k = 0; k < 28; k++) {
      const a = (k * TAU) / 28 + TAU / 56;
      if (Math.abs(((a + Math.PI / 2 + TAU) % TAU) - 0) < 0.5 || Math.abs(((a + Math.PI / 2 + TAU) % TAU) - TAU) < 0.5) continue;
      pearl(x, ...P(232, a), 4.2);
    }
    // yan defne yaprakları
    for (const sd of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + sd * (0.26 + i * 0.13);
        goldLeaf(x, ...P(222 + (i % 2) * 7, a), 11 - i * 0.6, a + sd * (Math.PI / 2 + 0.45));
      }
    // sorguç tüyleri
    const bx = CX,
      by = CY - 212;
    [-3, 3, -2, 2, -1, 1, 0].forEach((f, i) => {
      const a = -Math.PI / 2 + f * 0.29,
        L = 108 - Math.abs(f) * 10;
      feather(x, bx + f * 2, by - 8, bx + Math.cos(a) * L, by - 8 + Math.sin(a) * L, f * 12, 15 - Math.abs(f) * 1.8, i);
    });
    // altın yuva: damla plaka, yaprak kolları, yakut
    metalPaint(
      x,
      (g) => {
        g.beginPath();
        g.moveTo(bx, by - 40);
        g.bezierCurveTo(bx + 26, by - 22, bx + 24, by + 14, bx, by + 22);
        g.bezierCurveTo(bx - 24, by + 14, bx - 26, by - 22, bx, by - 40);
        g.fill();
      },
      'gold',
      { leaf: 0.14, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 6, shadowY: 3 },
    );
    for (const sd of [-1, 1]) {
      goldLeaf(x, bx + sd * 26, by + 6, 13, sd * 0.5);
      goldLeaf(x, bx + sd * 22, by - 18, 11, -sd * 0.6 + (sd < 0 ? Math.PI : 0));
    }
    gem(x, bx, by - 2, 14, ['#ffd0d6', '#c8102e', '#4a0410']);
    pearl(x, bx, by - 30, 4.5);
    for (const sd of [-1, 1]) gem(x, ...P(206, -Math.PI / 2 + sd * 0.62), 7, ['#ffd0d6', '#c8102e', '#4a0410']);
    return 139;
  },

  // Gül ebru: lacivert zeminde gül ve yaprak damlaları, gümüş tel
  async gul(x) {
    const R = rng(818),
      ops = [];
    battalDrops(R, ops, [135, 210], 90, [EB.cream, EB.slate, EB.indigo], 3, 7);
    const N = 8;
    for (let k = 0; k < N; k++) {
      const th = (k * TAU) / N;
      for (const sd of [-1, 1]) ops.push(drop(...P(172, th + sd * 0.15), 6, EB.sage), drop(...P(172, th + sd * 0.15), 2.5, '#5d7a5c'));
      [
        [14, '#b04656'],
        [11, EB.cream],
        [8.5, '#c35f6c'],
        [6, '#f0d4d0'],
        [3.6, '#a63a4b'],
      ].forEach(([r, c]) => ops.push(drop(...P(172, th), r, c)));
    }
    for (let k = 0; k < N; k++) {
      const th = (k * TAU) / N;
      ops.push(tine(...P(172, th), th + Math.PI / 2, 5, 2.5));
      for (const sd of [-1, 1]) ops.push(tine(...P(172, th + sd * 0.15), th + Math.PI / 2 + sd * 0.4, 7, 2));
    }
    await ebruBand(x, ops, EB.indigo, 150, 196);
    gloss(x, 150, 196, 0.5);
    wire(x, [circleLine(148)], 5.5, 'silver', true);
    wire(x, [circleLine(198)], 5.5, 'silver', true);
    granules(x, Array.from({ length: 32 }, (_, k) => P(206, (k * TAU) / 32)), 2.6, 'silver');
    return 145;
  },

  // Gelgit ebru: renk kuşakları üstüne ileri-geri tarak (gel-git) — kıvrımlı şerit deseni, gümüş tel ve granül
  async gelgit(x) {
    const ops = [];
    const pal = [EB.indigo, EB.cream, EB.rose, EB.cream, EB.ochre, EB.cream, EB.sage, EB.cream, EB.slate, EB.cream];
    let k = 0;
    for (let y = CY - 262; y < CY + 262; y += 9) {
      const c = pal[k++ % pal.length];
      for (let xx = 0; xx < 480; xx += 11) {
        const d = Math.hypot(xx - CX, y - CY);
        if (d > 112 && d < 244) ops.push(drop(xx + (k % 2) * 5, y, 7.5, c));
      }
    }
    for (let xg = 0, i = 0; xg < 480; xg += 14, i++) ops.push(tine(xg, 0, i % 2 ? -Math.PI / 2 : Math.PI / 2, 26, 6));
    for (let yg = CY - 230, i = 0; yg < CY + 230; yg += 46, i++) ops.push(tine(0, yg, i % 2 ? Math.PI : 0, 10, 10));
    await ebruBand(x, ops, EB.cream, 150, 196, false);
    gloss(x, 150, 196, 0.42);
    wire(x, [circleLine(148)], 6, 'silver', true);
    wire(x, [circleLine(198)], 6, 'silver', true);
    granules(x, Array.from({ length: 40 }, (_, i) => P(207, (i * TAU) / 40)), 2.8, 'silver');
    return 145;
  },

  // Bakır dövme: çekiç izleri (ışığı yakalayan çukurlar), kenarlarda yeşil patina, iki kazıma çizgisi
  async bakir(x) {
    const n = makeNoise(77),
      H = 50;
    const base = ramp([
      [0, '#4a1d0b'],
      [0.35, '#8c3b17'],
      [0.6, '#c8693a'],
      [0.82, '#ee9d6a'],
      [1, '#ffd2b0'],
    ]);
    const pat = [79, 165, 143];
    const lx = -0.55,
      ly = -0.62;
    await polarBand(x, 147, 197, (u, v, o) => {
      const py = v * H;
      // dövme çukurları: titrek ızgarada en yakın merkez
      const cs = 12;
      const gx = Math.floor(u / cs),
        gy = Math.floor(py / cs);
      let best = 1e9,
        bx = 0,
        by = 0;
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++) {
          const cx = (gx + a) * cs + cs * (0.5 + 0.38 * n.n2((gx + a) * 3.1, (gy + b) * 1.7)),
            cy = (gy + b) * cs + cs * (0.5 + 0.38 * n.n2((gx + a) * 1.3, (gy + b) * 2.9));
          const dd = (u - cx) * (u - cx) + (py - cy) * (py - cy);
          if (dd < best) {
            best = dd;
            bx = cx;
            by = cy;
          }
        }
      const dist = Math.sqrt(best) / (cs * 0.75);
      const nx = (u - bx) / cs,
        ny = (py - by) / cs;
      const sh = Math.max(-1, Math.min(1, -(nx * lx + ny * ly) * 3)) * (1 - Math.min(1, dist) * 0.6);
      const bev = Math.sin(v * Math.PI);
      let t = 0.52 + sh * 0.36 + n.fbm(u * 0.03, py * 0.05, 3) * 0.1 + (bev - 0.75) * 0.3;
      base(t, o);
      if (sh > 0.55) {
        const sp = (sh - 0.55) * 1.6;
        o[0] = Math.min(255, o[0] + 90 * sp);
        o[1] = Math.min(255, o[1] + 70 * sp);
        o[2] = Math.min(255, o[2] + 55 * sp);
      }
      // kazıma çizgileri
      for (const ev of [0.17, 0.83]) {
        const e = Math.abs(v - ev) * H;
        if (e < 1.1) {
          o[0] *= 0.45;
          o[1] *= 0.42;
          o[2] *= 0.4;
        } else if (e < 2) {
          o[0] = Math.min(255, o[0] * 1.25);
          o[1] = Math.min(255, o[1] * 1.2);
          o[2] = Math.min(255, o[2] * 1.15);
        }
      }
      // patina: kenarlarda ve çukur diplerinde
      const edge = Math.max(sstep(0.22, 0.02, v), sstep(0.78, 0.98, v));
      const blot = sstep(0.15, 0.55, n.fbm(u * 0.025 + 9, py * 0.06, 4) + 0.1);
      const pk = Math.min(1, edge * 0.85 * (0.4 + blot) + blot * 0.35 * Math.min(1, dist * 1.4));
      o[0] += (pat[0] - o[0]) * pk;
      o[1] += (pat[1] - o[1]) * pk;
      o[2] += (pat[2] - o[2]) * pk;
    });
    gloss(x, 147, 197, 0.5);
    metalRing(x, 146, 5, 'copper');
    metalRing(x, 198, 6, 'copper');
    return 143;
  },

  // Kilim: yün dokuma; elibelinde ve göz motifleri, kurt ağzı bordür, dış kenarda püsküller
  async kilim(x) {
    const n = makeNoise(31);
    const C = { r: [158, 44, 38], i: [36, 56, 104], o: [214, 156, 58], c: [238, 226, 200], b: [58, 32, 22], g: [77, 122, 90] };
    const ELI = ['.....o.....', '....oio....', '.....o.....', '.iiiiiiiii.', 'i..icccci..i', 'ii..ici..ii', 'i..icccci..i', '.iiiiiiiii.', '.....o.....', '....oio....', '.....o.....'];
    const H = 54,
      cell = 3;
    let period = 0;
    await polarBand(x, 147, 201, (u, v, o, L) => {
      if (!period) period = fitPeriod(L, 66);
      const cu = Math.floor(u / cell),
        cv = Math.floor((v * H) / cell);
      const rows = Math.round(H / cell);
      const pc = Math.round(period / cell);
      const lu = ((cu % pc) + pc) % pc;
      let col = C.r;
      if (cv <= 1 || cv >= rows - 2) {
        // kurt ağzı: dişli üçgenler
        const k = lu % 6,
          up = cv <= 1 ? cv : rows - 1 - cv;
        col = (up === 0 ? k < 6 : k >= 1 && k <= 4) ? (Math.floor(lu / 6) % 2 ? C.i : C.b) : C.c;
      } else if (cv === 2 || cv === rows - 3) col = C.c;
      else {
        const fv = cv - 3 - Math.floor((rows - 6 - 11) / 2);
        const half = pc / 2;
        const isEli = Math.floor(cu / half) % 2 === 0;
        const fu = Math.floor((lu % half) - (half - 11) / 2);
        if (isEli && fv >= 0 && fv < 11 && fu >= 0 && fu < 11) {
          const ch = ELI[fv][fu];
          col = ch === 'i' ? C.i : ch === 'o' ? C.o : ch === 'c' ? C.c : C.r;
        } else if (!isEli) {
          const dx = Math.abs((lu % half) - half / 2 + 0.5),
            dy = Math.abs(cv - rows / 2 + 0.5);
          const m = dx + dy * 1.15;
          col = m < 1.5 ? C.o : m < 3 ? C.i : m < 4.2 ? C.c : m < 5.6 ? C.g : m < 6.8 ? C.b : C.r;
        }
      }
      // yün dokusu: atkı çizgileri, ilmek ve tüy
      const py = v * H;
      const weft = 0.86 + 0.14 * Math.sin((py / cell) * Math.PI * 2);
      const warp = 0.95 + 0.05 * Math.sin((u / cell) * Math.PI * 2 + (cv % 2) * Math.PI);
      const fuzz = 0.93 + n.n2(u * 0.9, py * 0.9) * 0.1 + n.fbm(u * 0.05, py * 0.1, 2) * 0.08;
      const lit = 1.06 - v * 0.12;
      const k = weft * warp * fuzz * lit;
      o[0] = Math.min(255, col[0] * k);
      o[1] = Math.min(255, col[1] * k);
      o[2] = Math.min(255, col[2] * k);
    });
    // püsküller
    x.save();
    x.lineCap = 'round';
    const R = rng(55);
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * TAU + R() * 0.01;
      const len = 8 + R() * 4;
      const [ax, ay] = P(200, a),
        [bx, by] = P(200 + len, a + (R() - 0.5) * 0.02);
      x.strokeStyle = 'rgba(30,14,6,0.35)';
      x.lineWidth = 3.6;
      x.beginPath();
      x.moveTo(ax + 1, ay + 1.5);
      x.lineTo(bx + 1, by + 1.5);
      x.stroke();
      x.strokeStyle = k % 6 < 1 ? '#b8452e' : '#eadfc4';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(ax, ay);
      x.lineTo(bx, by);
      x.stroke();
    }
    x.restore();
    x.save();
    x.strokeStyle = 'rgba(40,18,10,0.85)';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(CX, CY, 147, 0, TAU);
    x.stroke();
    x.restore();
    metalRing(x, 145, 5, 'brass');
    return 143;
  },

  // Gece çinisi: lacivert sır, altın varak geçmeli (girih) yıldız zinciri, turkuaz göbekler, altın inci dizisi
  async gece(x) {
    glazeBand(x, 145, 205, '#0f1f52', { seed: 52, crackColor: 'rgba(255,255,255,0.05)', mottle: 0.32 });
    const Rm = 175,
      N = 12,
      M = polarPt(Rm),
      L = TAU * Rm,
      per = L / N;
    const star = (cu, r) => Array.from({ length: 17 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 8,
        q = i % 2 ? r * 0.62 : r;
      return M(cu + Math.cos(a) * q, Math.sin(a) * q);
    });
    // geçme bant: yıldızların uçlarından komşuya uzanan iki zikzak
    const zig = (off) => {
      const pts = [];
      for (let k = 0; k <= N * 2; k++) pts.push(M((k * per) / 2, k % 2 ? off : -off));
      return pts;
    };
    // turkuaz göbek ve sekizgen dolgu
    for (let k = 0; k < N; k++) {
      const cu = k * per;
      const fill = pathShape((p) => poly(p, star(cu, 15)));
      paintGlaze(x, fill, '#1d8e8a', { bb: BOX, contourW: 0, pool: 2, mottle: 0.2 });
      x.save();
      x.fillStyle = '#f2ead6';
      x.beginPath();
      x.arc(...M(cu, 0), 3.2, 0, TAU);
      x.fill();
      x.restore();
      // ara: küçük beyaz dört köşe
      const [sx, sy] = M(cu + per / 2, 0);
      x.save();
      x.fillStyle = 'rgba(242,234,214,0.9)';
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          q = i % 2 ? 2 : 6;
        i ? x.lineTo(sx + Math.cos(a) * q, sy + Math.sin(a) * q) : x.moveTo(sx + Math.cos(a) * q, sy + Math.sin(a) * q);
      }
      x.fill();
      x.restore();
    }
    const lines = [zig(19), zig(-19)];
    for (let k = 0; k < N; k++) lines.push(star(k * per, 15));
    // koyu kontur + altın şerit
    x.save();
    x.strokeStyle = 'rgba(5,10,30,0.9)';
    x.lineWidth = 5.2;
    x.lineJoin = 'round';
    for (const l of lines) {
      poly(x, l, false);
      x.stroke();
    }
    x.restore();
    metalPaint(
      x,
      (g) => {
        g.lineWidth = 3;
        g.lineJoin = 'round';
        for (const l of lines) {
          poly(g, l, false);
          g.stroke();
        }
      },
      'gold',
      { leaf: 0.25 },
    );
    gloss(x, 145, 205);
    metalRing(x, 144, 6, 'gold');
    metalRing(x, 206, 6, 'gold');
    beads(x, 216, 48, 3.1, 'gold');
    return 141;
  },

  // Firuze telkari: firuze mine bant, oyma gümüş sarmaşık, dilimli gümüş dış kenar (içi mineli), mercan kabaşonlar
  async firuze(x) {
    glazeBand(x, 146, 202, '#169c9b', { seed: 61, mottle: 0.22, crackle: false, pool: 6 });
    // dilimli kenar: 16 yaprak, mineli iç, gümüş tel çevre
    const NL = 16;
    const lobe = (k) => {
      const th = (k * TAU) / NL;
      const B = bend(204, th);
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24,
          a = Math.PI * t;
        pts.push(B(-Math.cos(a) * 21, Math.sin(a) * 20 - 2));
      }
      return pts;
    };
    for (let k = 0; k < NL; k++) {
      const sh = pathShape((p) => poly(p, lobe(k)));
      paintGlaze(x, sh, '#1fb2ae', { bb: BOX, contourW: 0, pool: 3, mottle: 0.18 });
    }
    wire(x, Array.from({ length: NL }, (_, k) => lobe(k)), 3.2, 'silver');
    // oyma sarmaşık: dalga sap + her dalgada kıvrım
    const Rm = 174,
      M = polarPt(Rm),
      L = TAU * Rm,
      W = 24,
      per = L / W;
    const stem = [];
    for (let i = 0; i <= 600; i++) {
      const u = (i / 600) * L;
      stem.push(M(u, Math.sin((u / per) * TAU) * 9));
    }
    const curls = [];
    for (let k = 0; k < W; k++) {
      const u0 = k * per + per * 0.25,
        side = 1;
      const sp = spiral(0, 0, 8, 1.15, Math.PI / 2, side, 30).map(([a, b]) => M(u0 + a + 4, 9 + b - 8));
      const sp2 = spiral(0, 0, 8, 1.15, -Math.PI / 2, -side, 30).map(([a, b]) => M(u0 + per / 2 + a + 4, -9 + b + 8));
      curls.push(sp, sp2);
    }
    wire(x, [stem], 2.6, 'silver');
    wire(x, curls, 2, 'silver');
    granules(x, Array.from({ length: 64 }, (_, i) => P(150, (i * TAU) / 64)), 1.9, 'silver');
    granules(x, Array.from({ length: 64 }, (_, i) => P(198, (i * TAU) / 64 + TAU / 128)), 1.9, 'silver');
    gloss(x, 146, 202, 0.75);
    wire(x, [circleLine(145)], 6, 'silver', true);
    wire(x, [circleLine(203)], 6.5, 'silver', true);
    // mercan kabaşonlar: lob göbeklerinde ve bant üstünde
    const coral = (cx, cy, r) => {
      metalPaint(x, (g) => (g.beginPath(), g.arc(cx, cy, r + 2.6, 0, TAU), g.fill()), 'silver', { leaf: 0.08, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 3, shadowY: 1.5 });
      x.save();
      const gr = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#ffc2b2');
      gr.addColorStop(0.45, '#e04a35');
      gr.addColorStop(1, '#6a1408');
      x.fillStyle = gr;
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.beginPath();
      x.ellipse(cx - r * 0.35, cy - r * 0.38, r * 0.28, r * 0.16, -0.6, 0, TAU);
      x.fill();
      x.restore();
    };
    for (let k = 0; k < NL; k++) coral(...P(212, (k * TAU) / NL), 4.2);
    for (let k = 0; k < 8; k++) coral(...P(174, (k * TAU) / 8 + TAU / 16), 6);
    return 142;
  },

  // Sedef kakma: ceviz üstünde sedef sekiz köşe yıldızlar ve baklavalar, kemik fitiller, ince pirinç
  async sedef(x) {
    const n = makeNoise(91),
      H = 50;
    const wood = ramp([
      [0, '#1d0f07'],
      [0.4, '#3d2211'],
      [0.7, '#5c351a'],
      [1, '#7b4a25'],
    ]);
    let per = 0;
    const sq = (a, b, s) => Math.max(Math.abs(a), Math.abs(b)) - s;
    const rq = (a, b, s) => Math.max(Math.abs(a + b), Math.abs(a - b)) / Math.SQRT2 - s;
    const pearl = (u, py, o, k) => {
      const h = (n.n2(u * 0.07, py * 0.11) * 0.5 + 0.5) * 360 + u * 0.8;
      const hue = [0, 0, 0];
      hsl(h, 0.7, 0.74, hue);
      const sheen = 0.9 + 0.12 * Math.sin(u * 0.21 + py * 0.33 + n.n2(u * 0.2, py * 0.2) * 3);
      o[0] = Math.min(255, (246 + (hue[0] - 246) * 0.5) * sheen * k);
      o[1] = Math.min(255, (244 + (hue[1] - 244) * 0.5) * sheen * k);
      o[2] = Math.min(255, (238 + (hue[2] - 238) * 0.5) * sheen * k);
    };
    await polarBand(x, 147, 197, (u, v, o, L) => {
      if (!per) per = fitPeriod(L, 54);
      const py = v * H;
      // ceviz: teğet yönde lifler
      const g = n.fbm(u * 0.012, py * 0.22, 4);
      const fib = Math.abs(Math.sin(py * 0.9 + g * 6 + n.n2(u * 0.05, py * 0.05) * 2));
      wood(0.45 + g * 0.35 + fib * 0.12, o);
      const lu = (u % per) - per / 2,
        lv = py - H / 2;
      // kemik fitiller
      for (const ev of [5, H - 5]) {
        const e = Math.abs(py - ev);
        if (e < 1.6) {
          o[0] = 226;
          o[1] = 214;
          o[2] = 188;
          return;
        }
        if (e < 2.4) {
          o[0] *= 0.5;
          o[1] *= 0.5;
          o[2] *= 0.5;
        }
      }
      // yıldız: iki karenin birleşimi; içinde küçük ceviz sekizgen
      const d = Math.min(sq(lu, lv, 13), rq(lu, lv, 13));
      const dIn = Math.min(sq(lu, lv, 4), rq(lu, lv, 4));
      // köşelerde baklava
      const dd = rq(Math.abs(lu) - per / 2, lv, 7);
      const dsm = Math.min(rq(Math.abs(lu) - per / 2, lv - 15, 2.8), rq(Math.abs(lu) - per / 2, lv + 15, 2.8));
      const shp = Math.min(d, dd, dsm);
      if (shp < 0 && !(dIn < 0 && d < 0)) {
        if (shp > -1.1) {
          o[0] = 26;
          o[1] = 16;
          o[2] = 10;
        } else pearl(u, py, o, 1);
      } else if (shp < 1.2 && shp >= 0) {
        o[0] *= 0.35;
        o[1] *= 0.33;
        o[2] *= 0.3;
      }
      // cila
      const lit = 1.05 - v * 0.14;
      o[0] = Math.min(255, o[0] * lit);
      o[1] = Math.min(255, o[1] * lit);
      o[2] = Math.min(255, o[2] * lit);
    });
    gloss(x, 147, 197, 0.85);
    metalRing(x, 146, 4.5, 'brass');
    metalRing(x, 198, 5, 'brass');
    return 143;
  },

  // Tezhip: lacivert zeminde altın rumi sarmaşığı, kırmızı-beyaz hatayi çiçekler, dış kenarda mavi tığlar
  async tezhip(x) {
    glazeBand(x, 147, 201, '#16246a', { seed: 71, mottle: 0.18, crackle: false, pool: 4 });
    const Rm = 174,
      M = polarPt(Rm),
      L = TAU * Rm,
      W = 14,
      per = L / W;
    const stem = [];
    for (let i = 0; i <= 700; i++) {
      const u = (i / 700) * L;
      stem.push(M(u, Math.sin((u / per) * TAU) * 10));
    }
    // rumi: kıvrık, ucu çatallı yaprak (yerel koordinatta çizilip halkaya bükülür)
    const rumi = (u0, v0, dir, flip) => {
      const pts = [];
      const curve = (t) => [u0 + dir * (t * 21), v0 + flip * (Math.sin(t * Math.PI) * 8 + t * 4)];
      for (let i = 0; i <= 16; i++) {
        const [a, b] = curve(i / 16);
        pts.push(M(a, b + flip * (i / 16) * 2.5));
      }
      for (let i = 16; i >= 0; i--) {
        const [a, b] = curve(i / 16);
        pts.push(M(a, b - flip * Math.sin((i / 16) * Math.PI) * 6));
      }
      return pts;
    };
    const leaves = [];
    const tend = [];
    for (let k = 0; k < W; k++) {
      const u0 = k * per;
      leaves.push(rumi(u0 + per * 0.25, 10, 1, 1), rumi(u0 + per * 0.75, -10, -1, -1));
      tend.push(spiral(0, 0, 6, 1.3, 0, 1, 26).map(([a, b]) => M(u0 + per * 0.5 + a, b + 1)));
    }
    x.save();
    x.strokeStyle = 'rgba(4,8,30,0.85)';
    x.lineWidth = 5.4;
    poly(x, stem, false);
    x.stroke();
    x.restore();
    metalPaint(
      x,
      (g) => {
        g.lineWidth = 3.2;
        poly(g, stem, false);
        g.stroke();
        g.lineWidth = 1.6;
        for (const t of tend) {
          poly(g, t, false);
          g.stroke();
        }
        for (const l of leaves) {
          poly(g, l, true);
          g.fill();
        }
      },
      'gold',
      { leaf: 0.3, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 2, shadowY: 1 },
    );
    x.save();
    x.strokeStyle = 'rgba(40,20,0,0.75)';
    x.lineWidth = 0.8;
    for (const l of leaves) {
      poly(x, l, true);
      x.stroke();
    }
    x.restore();
    // hatayi çiçekler: sapın tepelerinde
    for (let k = 0; k < W; k++) {
      for (const [uu, vv, red] of [
        [k * per + per * 0.25, -11, true],
        [k * per + per * 0.75, 11, false],
      ]) {
        const [cx, cy] = M(uu, vv);
        x.save();
        for (let i = 0; i < 5; i++) {
          const a = (i * TAU) / 5 + k;
          x.fillStyle = red ? '#c8342a' : '#f3ecdc';
          x.beginPath();
          x.ellipse(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, 2.9, 1.9, a, 0, TAU);
          x.fill();
        }
        x.fillStyle = '#e8b648';
        x.beginPath();
        x.arc(cx, cy, 1.7, 0, TAU);
        x.fill();
        x.restore();
      }
    }
    gloss(x, 147, 201, 0.6);
    // altın cetveller ve tığlar
    for (const [r, w] of [
      [146, 4],
      [202, 4],
    ])
      metalRing(x, r, w, 'gold', { leaf: 0.3 });
    x.save();
    x.lineCap = 'round';
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * TAU,
        len = i % 3 ? 6 : 11;
      x.strokeStyle = i % 3 ? 'rgba(60,110,200,0.8)' : 'rgba(40,80,170,0.95)';
      x.lineWidth = 1.1;
      x.beginPath();
      x.moveTo(...P(206, a));
      x.lineTo(...P(206 + len, a));
      x.stroke();
    }
    x.restore();
    granules(x, Array.from({ length: 60 }, (_, i) => P(218, (i * TAU) / 60 + TAU / 360)), 1.7, 'gold');
    return 143;
  },

  // Kehribar: koyu kadife üstünde altın tele dizili bal rengi kehribar taneleri, aralarda altın pullar
  async kehribar(x) {
    glazeBand(x, 154, 196, '#2a160b', { seed: 81, mottle: 0.35, crackle: false, pool: 3 });
    metalRing(x, 150, 5, 'gold');
    metalRing(x, 200, 4, 'gold');
    wire(x, [circleLine(175)], 2, 'gold', true);
    const N = 22,
      R = rng(17);
    for (let k = 0; k < N; k++) {
      const a = (k * TAU) / N - Math.PI / 2;
      const [cx, cy] = P(175, a);
      const r = 16.5;
      x.save();
      x.shadowColor = 'rgba(0,0,0,0.6)';
      x.shadowBlur = 6;
      x.shadowOffsetY = 3;
      const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      const tint = R();
      g.addColorStop(0, tint > 0.5 ? '#ffe39a' : '#ffd07a');
      g.addColorStop(0.45, tint > 0.5 ? '#f0a23a' : '#e1801e');
      g.addColorStop(0.85, '#9a4508');
      g.addColorStop(1, '#5a2504');
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.fill();
      x.restore();
      x.save();
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.clip();
      // iç ışıma (ışığın karşı tarafı)
      const s = x.createRadialGradient(cx + r * 0.35, cy + r * 0.4, 1, cx + r * 0.35, cy + r * 0.4, r * 0.8);
      s.addColorStop(0, 'rgba(255,214,120,0.6)');
      s.addColorStop(1, 'rgba(255,214,120,0)');
      x.fillStyle = s;
      x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      // kalıntılar ve kabarcıklar
      for (let i = 0; i < 5; i++) {
        const px = cx + (R() - 0.5) * r * 1.2,
          py = cy + (R() - 0.5) * r * 1.2;
        x.fillStyle = R() < 0.5 ? 'rgba(70,30,5,0.45)' : 'rgba(255,240,200,0.55)';
        x.beginPath();
        x.arc(px, py, 0.6 + R() * 1.2, 0, TAU);
        x.fill();
      }
      x.restore();
      x.save();
      x.fillStyle = 'rgba(255,255,255,0.9)';
      x.beginPath();
      x.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.26, r * 0.14, -0.7, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.4)';
      x.beginPath();
      x.arc(cx + r * 0.42, cy + r * 0.3, r * 0.08, 0, TAU);
      x.fill();
      x.restore();
      // altın pul (aralarda)
      const [gx, gy] = P(175, a + TAU / N / 2);
      metalPaint(x, (gg) => (gg.beginPath(), gg.ellipse(gx, gy, 3, 6, a + TAU / N / 2, 0, TAU), gg.fill()), 'gold', { leaf: 0.1, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 2, shadowY: 1 });
    }
    return 147;
  },

};

// tüy: kavisli sap, geriye yatık ince lifler, altın uç
function feather(x, x0, y0, x1, y1, bendv, w, seed) {
  const sp = bez([x0, y0], [x0 + bendv * 0.2, y0 - (y0 - y1) * 0.35], [x1 - bendv, y1 + (y0 - y1) * 0.25], [x1, y1], 60);
  const R = rng(900 + seed);
  // kanat gövdesi: lif uçlarından yumuşak dolgu
  const vane = (sd) => {
    const pts = [];
    for (let i = 4; i < 60; i++) {
      const t = i / 60,
        [px, py] = sp[i],
        [qx, qy] = sp[i + 1];
      const L = Math.hypot(qx - px, qy - py) || 1,
        ux = (qx - px) / L,
        uy = (qy - py) / L;
      const len = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6) * 0.9;
      pts.push([px - uy * sd * len + ux * len * 0.7, py + ux * sd * len + uy * len * 0.7]);
    }
    return pts;
  };
  x.save();
  for (const sd of [-1, 1]) {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(255,252,244,0.25)');
    g.addColorStop(0.6, 'rgba(255,252,244,0.62)');
    g.addColorStop(1, 'rgba(240,214,150,0.7)');
    x.fillStyle = g;
    poly(x, [...sp.slice(4, 61), ...vane(sd).reverse()]);
    x.fill();
  }
  x.restore();
  x.save();
  x.lineCap = 'round';
  x.shadowColor = 'rgba(0,0,0,0.35)';
  x.shadowBlur = 3;
  x.shadowOffsetY = 1.5;
  for (let i = 4; i < 60; i++) {
    const t = i / 60;
    const [px, py] = sp[i],
      [qx, qy] = sp[i + 1];
    const dx = qx - px,
      dy = qy - py,
      L = Math.hypot(dx, dy) || 1;
    const ux = dx / L,
      uy = dy / L;
    const len = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6) * (0.85 + R() * 0.3);
    for (const sd of [-1, 1]) {
      const nx = -uy * sd,
        ny = ux * sd;
      const ex = px + nx * len + ux * len * 0.7,
        ey = py + ny * len + uy * len * 0.7;
      const k = t > 0.82 ? (t - 0.82) / 0.18 : 0;
      x.strokeStyle = k ? `rgba(${240 - 20 * k | 0},${222 - 40 * k | 0},${170 - 90 * k | 0},0.92)` : `rgba(252,248,238,${0.75 + R() * 0.2})`;
      x.lineWidth = 1.35;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + nx * len * 0.6, py + ny * len * 0.6, ex, ey);
      x.stroke();
    }
  }
  x.shadowColor = 'rgba(0,0,0,0)';
  x.strokeStyle = 'rgba(214,180,100,0.95)';
  x.lineWidth = 1.6;
  poly(x, sp, false);
  x.stroke();
  x.restore();
}

/* ───────────── çıktı ───────────── */
const VER = 'fr2';
const urls = new Map();
const jobs = new Map();

export const frameURLSync = (id) => urls.get(id) || null;
export const FRAME_IDS = Object.keys(DESIGNS);

async function paint(id) {
  await buildTextures();
  const art = canvas(S, SH),
    x = art.getContext('2d');
  const inner = await DESIGNS[id](x);
  const out = canvas(S, SH),
    o = out.getContext('2d');
  // gölge: çerçeve avatarın ve zeminin üstünde dursun
  o.save();
  o.shadowColor = 'rgba(8,4,0,0.55)';
  o.shadowBlur = 14;
  o.shadowOffsetY = 6;
  o.drawImage(art, 0, 0);
  o.restore();
  // avatar kenarına iç gölge (çerçeve avatarı sarıyor gibi)
  o.save();
  o.beginPath();
  o.arc(CX, CY, inner + 1, 0, TAU);
  o.clip();
  const g = o.createRadialGradient(CX, CY - 4, inner - 22, CX, CY - 4, inner + 2);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  o.fillStyle = g;
  o.fillRect(0, 0, S, SH);
  o.restore();
  return out;
}
const toBlob = (c) => new Promise((res) => (c.toBlob ? c.toBlob((b) => res(b), 'image/png') : res(null)));

// Çerçeve görselinin URL'si (önce bellek, sonra IndexedDB, yoksa boyanır). Boyamalar tek tek yapılır, ana iş parçacığı
// nefes alır. urgent: ekranda görünen çerçeve sıranın başına geçer; arka plan ısıtması (urgent=false) sona eklenir.
const waitQ = [];
let painting = false;
async function pumpPaint() {
  if (painting) return;
  painting = true;
  try {
    while (waitQ.length) {
      const job = waitQ.shift();
      await idle();
      try {
        const c = await paint(job.id);
        const b = await toBlob(c);
        const u = b ? URL.createObjectURL(b) : c.toDataURL('image/png');
        if (b) DB.put(`${VER}|${job.id}`, b);
        urls.set(job.id, u);
        job.resolve(u);
      } catch (e) {
        console.warn('[çerçeve] ' + job.id, e && e.message);
        jobs.delete(job.id);
        job.resolve(null);
      }
    }
  } finally {
    painting = false;
  }
}
export function frameURL(id, urgent = true) {
  if (!DESIGNS[id]) return Promise.resolve(null);
  if (urls.has(id)) return Promise.resolve(urls.get(id));
  if (jobs.has(id)) {
    // zaten sırada: acilse öne al
    const i = urgent ? waitQ.findIndex((j) => j.id === id) : -1;
    if (i > 0) waitQ.unshift(waitQ.splice(i, 1)[0]);
    return jobs.get(id);
  }
  const job = DB.get(`${VER}|${id}`).then(
    (hit) =>
      new Promise((resolve) => {
        if (hit) {
          const u = URL.createObjectURL(hit);
          urls.set(id, u);
          return resolve(u);
        }
        const j = { id, resolve };
        urgent ? waitQ.unshift(j) : waitQ.push(j);
        pumpPaint();
      }),
  );
  jobs.set(id, job);
  return job;
}
