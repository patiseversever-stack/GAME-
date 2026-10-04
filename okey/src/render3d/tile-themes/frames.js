// Avatar çerçeveleri: taş takımlarıyla aynı boya motoru (sır, metal varak, ebru mermerleme) ile prosedürel boyanır.
// Seriler: İznik çini (kobalt/turkuaz/mercan sır), Ebru + telkari (mermerli kâğıt, bükülmüş gümüş/altın tel, granül),
// Nişan (çelenk, sorguç). 480 px kare tuval; avatar dairesi yarıçapı 150 px (kutunun %62.5'i). Sonuç blob URL olarak
// bellekte ve IndexedDB'de saklanır.
import { TAU, rng, canvas, idle, buildTextures, TEX, pathShape, paintGlaze, metalPaint, poly, bez, star8Path, rosettePath, leafPath, crackle, drop, tine, wave, marble } from './paint.js';
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

/* ───────────── tasarımlar ───────────── */
const DESIGNS = {
  // Pirinç halka: dövme izleri, iki ince kazıma
  async sade(x) {
    metalRing(x, 162, 30, 'brass', { leaf: 0.2 });
    x.save();
    clipRing(x, 147, 177);
    const R = rng(31);
    for (let k = 0; k < 140; k++) {
      const [px, py] = P(148 + R() * 28, R() * TAU);
      const r = 2.5 + R() * 4;
      const g = x.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,248,220,0.38)');
      g.addColorStop(0.6, 'rgba(255,248,220,0)');
      g.addColorStop(1, 'rgba(60,35,5,0.22)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(px, py, r, 0, TAU);
      x.fill();
    }
    for (const r of [153, 171]) {
      x.strokeStyle = 'rgba(60,36,8,0.7)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.arc(CX, CY, r, 0, TAU);
      x.stroke();
      x.strokeStyle = 'rgba(255,240,200,0.6)';
      x.beginPath();
      x.arc(CX, CY, r + 1.2, 0, TAU);
      x.stroke();
    }
    x.restore();
    gloss(x, 147, 177, 0.6);
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
      ciniTulip(x, bx, by, 37, th + Math.PI / 2, C1.white);
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

  // Gelgit ebru: battal zemin, dalga akışı, gümüş tel kenarlar
  async gelgit(x) {
    const R = rng(404),
      ops = [];
    battalDrops(R, ops, [130, 215], 170, [EB.indigo, EB.indigo, EB.rose, EB.ochre, EB.cream, EB.cream, EB.slate], 8, 20);
    ops.push(wave(0.4, 7, 48), wave(2.1, 5, 36));
    for (let k = 0; k < 14; k++) ops.push(tine(...P(172, (k * TAU) / 14), (k * TAU) / 14 + Math.PI / 2, 10, 5));
    await ebruBand(x, ops, EB.cream, 150, 196);
    gloss(x, 150, 196, 0.45);
    wire(x, [circleLine(148)], 5.5, 'silver', true);
    wire(x, [circleLine(198)], 5.5, 'silver', true);
    return 145;
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

  // Şal ebru: taraklı desen, gümüş telkari taç
  async sal(x) {
    const ops = [];
    const pal = [EB.indigo, EB.cream, EB.rose, EB.cream, EB.ochre, EB.cream, EB.slate, EB.cream];
    let k = 0;
    // yalnız bandın çevresindeki damlalar (tarak en çok 22 px taşır)
    for (let y = CY - 230; y < CY + 230; y += 15)
      for (let xx = 10; xx < 470; xx += 15) {
        const px = xx + ((y / 15) % 2) * 7,
          d = Math.hypot(px - CX, y - CY);
        k++;
        if (d > 115 && d < 232) ops.push(drop(px, y, 8.5, pal[k % pal.length]));
      }
    for (let xg = 20, i = 0; xg < 460; xg += 11, i++) ops.push(tine(xg, 0, i % 2 ? -Math.PI / 2 : Math.PI / 2, 22, 3));
    for (let yg = CY - 220, i = 0; yg < CY + 220; yg += 22, i++) ops.push(tine(0, yg, i % 2 ? Math.PI : 0, 12, 4));
    ops.push(wave(Math.PI / 2, 4, 40));
    await ebruBand(x, ops, EB.cream, 150, 196, false);
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

  // Gece çinisi: lacivert sır, altın sekiz köşe yıldızlar
  async gece(x) {
    glazeBand(x, 146, 202, '#14275f', { seed: 52, crackColor: 'rgba(255,255,255,0.06)' });
    const N = 10;
    metalPaint(
      x,
      (g) => {
        for (let k = 0; k < N; k++) {
          star8Path(g, ...P(174, (k * TAU) / N - Math.PI / 2), 14, (k * TAU) / N);
          g.fill();
        }
      },
      'gold',
      { leaf: 0.2, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 3, shadowY: 1.5 },
    );
    x.save();
    for (let k = 0; k < N; k++) {
      const [sx, sy] = P(174, (k * TAU) / N - Math.PI / 2);
      x.fillStyle = '#14275f';
      star8Path(x, sx, sy, 7.5, (k * TAU) / N);
      x.fill();
      x.fillStyle = C1.turq;
      x.beginPath();
      x.arc(sx, sy, 3, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(240,210,120,0.9)';
      for (const d of [-7, 0, 7]) {
        x.beginPath();
        x.arc(...P(174 + d, ((k + 0.5) * TAU) / N - Math.PI / 2), d ? 1.6 : 2.6, 0, TAU);
        x.fill();
      }
    }
    x.restore();
    gloss(x, 146, 202);
    metalRing(x, 146, 7, 'gold');
    metalRing(x, 203, 8, 'gold');
    return 143;
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

  // Firuze telkari: firuze mine, gümüş filigran, mercan granül
  async firuze(x) {
    glazeBand(x, 146, 200, '#2aa3a0', { seed: 61, mottle: 0.22, crackle: false });
    const lines = [];
    const N = 12;
    for (let k = 0; k < N; k++) lines.push(...lyre(161, (k * TAU) / N, 9.5));
    wire(x, lines, 2.6, 'silver');
    gloss(x, 146, 200, 0.85);
    wire(x, [circleLine(146)], 6, 'silver', true);
    wire(x, [circleLine(200)], 6, 'silver', true);
    const cor = [];
    for (let k = 0; k < N; k++) cor.push(P(186, ((k + 0.5) * TAU) / N));
    x.save();
    for (const [px, py] of cor) {
      const g = x.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 5);
      g.addColorStop(0, '#ffb3a6');
      g.addColorStop(0.5, '#d2402f');
      g.addColorStop(1, '#6e130a');
      x.fillStyle = g;
      x.beginPath();
      x.arc(px, py, 5, 0, TAU);
      x.fill();
    }
    x.restore();
    granules(x, Array.from({ length: 36 }, (_, k) => P(209, (k * TAU) / 36)), 3, 'silver');
    return 143;
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
const VER = 'fr1';
const urls = new Map();
const jobs = new Map();
let queue = Promise.resolve();

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

// Çerçeve görselinin URL'si (önce bellek, sonra IndexedDB, yoksa boyanır). Boyamalar sırayla yapılır, ana iş parçacığı nefes alır.
export function frameURL(id) {
  if (!DESIGNS[id]) return Promise.resolve(null);
  if (urls.has(id)) return Promise.resolve(urls.get(id));
  if (jobs.has(id)) return jobs.get(id);
  const job = (async () => {
    const hit = await DB.get(`${VER}|${id}`);
    if (hit) {
      const u = URL.createObjectURL(hit);
      urls.set(id, u);
      return u;
    }
    const run = queue.then(async () => {
      await idle();
      const c = await paint(id);
      const b = await toBlob(c);
      const u = b ? URL.createObjectURL(b) : c.toDataURL('image/png');
      if (b) DB.put(`${VER}|${id}`, b);
      urls.set(id, u);
      return u;
    });
    queue = run.catch(() => {});
    return run;
  })().catch((e) => {
    console.warn('[çerçeve] ' + id, e && e.message);
    jobs.delete(id);
    return null;
  });
  jobs.set(id, job);
  return job;
}
