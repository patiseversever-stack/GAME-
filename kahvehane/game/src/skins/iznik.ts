// Deste — "İznik Çinisi": 16. yüzyıl Osmanlı İznik çinisinden esinlenen koleksiyon destesi.
// Beyaz sırlı zemin, kobalt mavisi, turkuaz, zümrüt yeşili ve meşhur kabarık mercan (bolus) kırmızısı;
// saz yaprağı, lale, karanfil, sümbül, hatayi göbekleri, rumi kıvrımları. Hiçbir görsel indirilmez:
// tüm motifler prepare() içinde vektörle BİR KEZ çizilip tuvallere saklanır; kart çizimi yalnız kopyalar + yazı.
import type {Skin, Suit} from './contract';

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

const FONT = '"Playfair Display", "Times New Roman", Georgia, serif';
const PW = 440, PH = Math.round(PW / 0.7); // çerçeve/panel/arka tuvallerinin çözünürlüğü (kart oranında)

// ───────────────────────── palet (sır altı boyaları) ─────────────────────────
const COB = '#1e3d92'; // kobalt
const TUR = '#2b9ea4', TUR_L = '#7fcac6'; // turkuaz
const GRN = '#2d8653'; // zümrüt
const BOLE = '#c7331f'; // kabarık mercan kırmızısı
const WHITE = '#fbf8ef'; // sır beyazı
const LINE = '#1a2130'; // kontur (koyu, yeşilimsi siyah)
const RED = '#c42f1c'; // köşe değerleri: kırmızı takımlar
const INK = '#0e1a46'; // köşe değerleri: kobalt-siyah

// ───────────────────────── küçük yardımcılar ─────────────────────────
function mulberry(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return [c, g];
}
function roundRect(p: Path2D | Ctx, x: number, y: number, w: number, h: number, r: number): void {
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
}
const polar = (x: number, y: number, r: number, a: number): [number, number] => [x + Math.cos(a) * r, y + Math.sin(a) * r];

/** Catmull-Rom: kontrol noktalarından (x0,y0,x1,y1,…) yumuşak eğri noktaları. */
function spline(c: number[], seg = 12): number[] {
  const n = c.length / 2;
  const out: number[] = [];
  const P = (i: number, k: number): number => c[Math.max(0, Math.min(n - 1, i)) * 2 + k];
  for (let i = 0; i < n - 1; i++)
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      for (let k = 0; k < 2; k++) {
        const p0 = P(i - 1, k), p1 = P(i, k), p2 = P(i + 1, k), p3 = P(i + 2, k);
        out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
    }
  out.push(c[(n - 1) * 2], c[(n - 1) * 2 + 1]);
  return out;
}
function polyPath(pts: number[], close = false): Path2D {
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  if (close) p.closePath();
  return p;
}
/** Orta çizgi boyunca değişken genişlikli şerit: wf(t) → [sol, sağ] yarı genişlik (yaprak gövdesi, hat darbesi). */
function ribbon(pts: number[], wf: (t: number) => [number, number]): Path2D {
  const n = pts.length / 2;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]));
  const tot = L[n - 1] || 1;
  const left: number[] = [], right: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const [wl, wr] = wf(L[i] / tot);
    left.push(pts[i * 2] + ty * wl, pts[i * 2 + 1] - tx * wl);
    right.push(pts[i * 2] - ty * wr, pts[i * 2 + 1] + tx * wr);
  }
  const p = new Path2D();
  p.moveTo(left[0], left[1]);
  for (let i = 1; i < n; i++) p.lineTo(left[i * 2], left[i * 2 + 1]);
  for (let i = n - 1; i >= 0; i--) p.lineTo(right[i * 2], right[i * 2 + 1]);
  p.closePath();
  return p;
}
/** Sırın kenarda koyulaşması: şeklin içinde, kenar boyunca yarı saydam koyu bir hale. */
function pool(g: Ctx, p: Path2D, col: string, lw: number): void {
  g.save();
  g.clip(p);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke(p);
  g.restore();
}
/** Şeklin içinde, verilen derinlikte ince bir iç kontur (çinideki beyaz "ayırma" çizgisi). */
function insetLine(g: Ctx, p: Path2D, base: string, col: string, depth: number, lw: number): void {
  g.save();
  g.clip(p);
  g.strokeStyle = col;
  g.lineWidth = 2 * (depth + lw);
  g.stroke(p);
  g.strokeStyle = base;
  g.lineWidth = 2 * depth;
  g.stroke(p);
  g.restore();
}
function fillLine(g: Ctx, p: Path2D, fill: string | CanvasGradient, lw: number, line = LINE): void {
  g.fillStyle = fill;
  g.fill(p);
  g.strokeStyle = line;
  g.lineWidth = lw;
  g.stroke(p);
}

// ───────────────────────── motif şekilleri (birim; taban 0,0, yukarı = -y) ─────────────────────────
interface Shapes {
  tulip: Path2D;
  carnHead: Path2D;
  carnCalyx: Path2D;
  carnEdge: Path2D;
  carnRays: Path2D;
  heart: Path2D;
  spade: Path2D;
  diamond: Path2D;
  club: Path2D;
}
let SH: Shapes | null = null;

/** Hançer lale: üç sivri taç yaprağı, uçları dışa kıvrık. Yükseklik ≈ 1.12. */
function tulipPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0);
  p.bezierCurveTo(-0.2, -0.03, -0.31, -0.28, -0.27, -0.56);
  p.bezierCurveTo(-0.25, -0.74, -0.2, -0.86, -0.26, -1.0);
  p.bezierCurveTo(-0.15, -0.92, -0.09, -0.8, -0.075, -0.64);
  p.bezierCurveTo(-0.055, -0.82, -0.03, -0.96, 0, -1.12);
  p.bezierCurveTo(0.03, -0.96, 0.055, -0.82, 0.075, -0.64);
  p.bezierCurveTo(0.09, -0.8, 0.15, -0.92, 0.26, -1.0);
  p.bezierCurveTo(0.2, -0.86, 0.25, -0.74, 0.27, -0.56);
  p.bezierCurveTo(0.31, -0.28, 0.2, -0.03, 0, 0);
  p.closePath();
  return p;
}
/** Karanfil (yandan): yelpaze baş + dişli kenar + çanak. */
function carnation(): {head: Path2D; calyx: Path2D; edge: Path2D; rays: Path2D} {
  const cy = -0.36, a0 = Math.PI + 0.42, a1 = Math.PI * 2 - 0.42, teeth = 7;
  const head = new Path2D(), edge = new Path2D(), rays = new Path2D();
  head.moveTo(-0.1, cy + 0.02);
  head.bezierCurveTo(-0.24, cy - 0.02, -0.38, cy - 0.1, ...polar(0, cy, 0.5, a0));
  const pts: [number, number][] = [];
  for (let i = 0; i <= teeth * 2; i++) {
    const a = a0 + ((a1 - a0) * i) / (teeth * 2);
    pts.push(polar(0, cy, i % 2 ? 0.66 : 0.52, a));
  }
  for (const [x, y] of pts) head.lineTo(x, y);
  head.bezierCurveTo(0.38, cy - 0.1, 0.24, cy - 0.02, 0.1, cy + 0.02);
  head.closePath();
  edge.moveTo(...pts[0]);
  for (const [x, y] of pts) edge.lineTo(x, y);
  for (let i = 2; i < teeth * 2; i += 2) {
    rays.moveTo(0, cy - 0.02);
    rays.lineTo(pts[i][0] * 0.9, cy + (pts[i][1] - cy) * 0.9);
  }
  const calyx = new Path2D();
  calyx.moveTo(-0.07, 0);
  calyx.bezierCurveTo(-0.1, -0.12, -0.14, -0.26, -0.13, -0.36);
  calyx.lineTo(0.13, -0.36);
  calyx.bezierCurveTo(0.14, -0.26, 0.1, -0.12, 0.07, 0);
  calyx.closePath();
  return {head, calyx, edge, rays};
}
function heartPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.47);
  p.bezierCurveTo(-0.15, 0.33, -0.5, 0.13, -0.5, -0.15);
  p.bezierCurveTo(-0.5, -0.36, -0.355, -0.47, -0.235, -0.47);
  p.bezierCurveTo(-0.115, -0.47, -0.03, -0.395, 0, -0.29);
  p.bezierCurveTo(0.03, -0.395, 0.115, -0.47, 0.235, -0.47);
  p.bezierCurveTo(0.355, -0.47, 0.5, -0.36, 0.5, -0.15);
  p.bezierCurveTo(0.5, 0.13, 0.15, 0.33, 0, 0.47);
  p.closePath();
  return p;
}
function spadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.55);
  p.bezierCurveTo(0.13, -0.38, 0.5, -0.2, 0.5, 0.07);
  p.bezierCurveTo(0.5, 0.27, 0.37, 0.37, 0.235, 0.37);
  p.bezierCurveTo(0.15, 0.37, 0.085, 0.335, 0.05, 0.28);
  p.bezierCurveTo(0.06, 0.4, 0.12, 0.48, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.12, 0.48, -0.06, 0.4, -0.05, 0.28);
  p.bezierCurveTo(-0.085, 0.335, -0.15, 0.37, -0.235, 0.37);
  p.bezierCurveTo(-0.37, 0.37, -0.5, 0.27, -0.5, 0.07);
  p.bezierCurveTo(-0.5, -0.2, -0.13, -0.38, 0, -0.55);
  p.closePath();
  return p;
}
function diamondPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.58);
  p.quadraticCurveTo(0.24, -0.3, 0.45, 0);
  p.quadraticCurveTo(0.24, 0.3, 0, 0.58);
  p.quadraticCurveTo(-0.24, 0.3, -0.45, 0);
  p.quadraticCurveTo(-0.24, -0.3, 0, -0.58);
  p.closePath();
  return p;
}
/** Sinek: üç yaprak + sap, TEK dış kontur (iç çizgi/kontur efektleri ara kesişimleri göstermesin diye). */
function clubPath(): Path2D {
  const r = 0.245;
  const T: [number, number] = [0, -0.255], L: [number, number] = [-0.255, 0.075], R: [number, number] = [0.255, 0.075];
  // iki çemberin dış (merkezden uzak) kesişimi
  const outerX = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), h = Math.sqrt(r * r - (d * d) / 4);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const p1: [number, number] = [mx - (dy / d) * h, my + (dx / d) * h], p2: [number, number] = [mx + (dy / d) * h, my - (dx / d) * h];
    return Math.hypot(...p1) > Math.hypot(...p2) ? p1 : p2;
  };
  const ang = (p: [number, number], c: [number, number]): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const tl = outerX(T, L), tr = outerX(T, R);
  const xs = 0.064, ys = R[1] + Math.sqrt(r * r - (xs - R[0]) ** 2); // sapın yaprakla birleştiği yer
  const p = new Path2D();
  p.moveTo(...tl);
  p.arc(T[0], T[1], r, ang(tl, T), ang(tr, T), false);
  p.arc(R[0], R[1], r, ang(tr, R), ang([xs, ys], R), false);
  p.bezierCurveTo(0.07, 0.38, 0.12, 0.48, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.12, 0.48, -0.07, 0.38, -xs, ys);
  p.arc(L[0], L[1], r, ang([-xs, ys], L), ang(tl, L), false);
  p.closePath();
  return p;
}
const isRed = (s: Suit): boolean => s === 'H' || s === 'D';
const suitPath = (s: Suit): Path2D => (s === 'H' ? SH!.heart : s === 'D' ? SH!.diamond : s === 'S' ? SH!.spade : SH!.club);
/** Büyük takım işaretinin içindeki değerin dikey yeri (birim şekil koordinatı). */
const SUIT_TY: Record<Suit, number> = {H: -0.07, C: -0.04, S: 0.02, D: 0};

// ───────────────────────── motif çizicileri (mutlak koordinat) ─────────────────────────
/** Lale. (x,y) taban, ang 0 = yukarı, s = boy ölçeği. halo: koyu zeminde beyaz ayırma konturu. */
function tulip(g: Ctx, x: number, y: number, ang: number, s: number, body: string, stripe: string, halo = false): void {
  const p = SH!.tulip;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(s, s);
  // çanak yaprakları
  const cal = new Path2D();
  cal.moveTo(0, 0.04);
  cal.bezierCurveTo(-0.14, 0.02, -0.26, -0.06, -0.3, -0.2);
  cal.bezierCurveTo(-0.18, -0.16, -0.08, -0.1, 0, -0.04);
  cal.bezierCurveTo(0.08, -0.1, 0.18, -0.16, 0.3, -0.2);
  cal.bezierCurveTo(0.26, -0.06, 0.14, 0.02, 0, 0.04);
  if (halo) {
    g.strokeStyle = WHITE;
    g.lineWidth = 4.2 / s;
    g.stroke(p);
    g.stroke(cal);
  }
  fillLine(g, cal, GRN, 1 / s);
  g.fillStyle = body;
  g.fill(p);
  pool(g, p, 'rgba(60,6,0,0.28)', 0.12);
  // taç yaprakları arasındaki çizgiler + orta yaprağın açık damarı
  g.strokeStyle = stripe;
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(-0.03, -0.06);
  g.bezierCurveTo(-0.13, -0.26, -0.11, -0.48, -0.075, -0.64);
  g.moveTo(0.03, -0.06);
  g.bezierCurveTo(0.13, -0.26, 0.11, -0.48, 0.075, -0.64);
  g.stroke();
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(0, -0.2);
  g.lineTo(0, -0.86);
  g.moveTo(-0.17, -0.3);
  g.quadraticCurveTo(-0.2, -0.6, -0.2, -0.86);
  g.moveTo(0.17, -0.3);
  g.quadraticCurveTo(0.2, -0.6, 0.2, -0.86);
  g.globalAlpha = 0.55;
  g.stroke();
  g.globalAlpha = 1;
  g.strokeStyle = LINE;
  g.lineWidth = 1.15 / s;
  g.stroke(p);
  g.restore();
}

/** Karanfil. (x,y) taban, ang 0 = yukarı. */
function carn(g: Ctx, x: number, y: number, ang: number, s: number, body: string, edgeCol: string, calyx = GRN, halo = false): void {
  const C = SH!;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(s, s);
  if (halo) {
    g.strokeStyle = WHITE;
    g.lineWidth = 4.2 / s;
    g.stroke(C.carnHead);
    g.stroke(C.carnCalyx);
  }
  g.fillStyle = body;
  g.fill(C.carnHead);
  pool(g, C.carnHead, 'rgba(40,0,0,0.25)', 0.1);
  g.save();
  g.clip(C.carnHead);
  g.strokeStyle = edgeCol;
  g.lineWidth = 0.13;
  g.stroke(C.carnEdge);
  g.restore();
  g.strokeStyle = 'rgba(30,10,10,0.55)';
  g.lineWidth = 0.025;
  g.stroke(C.carnRays);
  g.strokeStyle = LINE;
  g.lineWidth = 1.1 / s;
  g.stroke(C.carnHead);
  fillLine(g, C.carnCalyx, calyx, 1.1 / s);
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 0.025;
  g.beginPath();
  g.moveTo(0, -0.04);
  g.lineTo(0, -0.32);
  g.moveTo(-0.06, -0.06);
  g.lineTo(-0.08, -0.32);
  g.moveTo(0.06, -0.06);
  g.lineTo(0.08, -0.32);
  g.stroke();
  g.restore();
}

/** Saz yaprağı: kıvrık, uzun, tek kenarı dişli. ctrl orta çizgi kontrol noktaları; side = dişlerin yönü (±1). */
function saz(g: Ctx, ctrl: number[], wMax: number, fill: string, vein: string, side = 1, teeth = 9, halo = false): void {
  const pts = spline(ctrl, 32);
  const prof = (t: number): number => wMax * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.7)), 0.9);
  const path = ribbon(pts, t => {
    const w = prof(t);
    const fr = (t * teeth) % 1;
    const tooth = t > 0.06 && t < 0.92 ? w * 0.5 * Math.pow(fr, 1.6) : 0;
    return side > 0 ? [w + tooth, w * 0.72] : [w * 0.72, w + tooth];
  });
  if (halo) {
    g.strokeStyle = WHITE;
    g.lineWidth = 4.2;
    g.stroke(path);
  }
  g.fillStyle = fill;
  g.fill(path);
  pool(g, path, 'rgba(0,20,10,0.28)', wMax * 0.45);
  // orta damar (açık) — yaprağın 4/5'i boyunca
  const n = pts.length / 2;
  g.strokeStyle = vein;
  g.lineWidth = Math.max(0.8, wMax * 0.13);
  g.stroke(polyPath(pts.slice(Math.floor(n * 0.04) * 2, Math.floor(n * 0.84) * 2)));
  g.strokeStyle = LINE;
  g.lineWidth = 1.1;
  g.stroke(path);
}

/** Sümbül: sap boyunca iki yana sarkan küçük çan çiçekler. (x,y) taban, ang yön, len boy. */
function hyacinth(g: Ctx, x: number, y: number, ang: number, len: number, col: string, halo = false): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.strokeStyle = LINE;
  g.lineWidth = 2.8;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -len * 0.96);
  g.stroke();
  g.strokeStyle = GRN;
  g.lineWidth = 1.6;
  g.stroke();
  const n = 5;
  for (let i = n - 1; i >= 0; i--) {
    const t = 0.36 + (i / n) * 0.56;
    const fs = len * (0.3 - t * 0.12);
    for (const sd of [-1, 1]) tulip(g, sd * 1.2, -len * t, sd * (Math.PI * 0.66 - t * 0.35), fs, col, 'rgba(255,255,255,0.85)', halo);
  }
  tulip(g, 0, -len * 0.94, 0, len * 0.15, col, 'rgba(255,255,255,0.85)', halo);
  g.restore();
}

/** Hatayi göbeği (üstten): sivri dış yapraklar, yuvarlak iç yapraklar, turkuaz göbek, kırmızı merkez. */
function rosette(g: Ctx, x: number, y: number, r: number, outer = COB, mid = BOLE, inner = TUR, n = 8): void {
  const petal = (rr: number, r0: number, a: number, h: number, pointed: boolean): Path2D => {
    const p = new Path2D();
    p.moveTo(...polar(x, y, r0, a - h));
    if (pointed) {
      p.bezierCurveTo(...polar(x, y, rr * 0.92, a - h * 1.15), ...polar(x, y, rr * 0.9, a - h * 0.2), ...polar(x, y, rr, a));
      p.bezierCurveTo(...polar(x, y, rr * 0.9, a + h * 0.2), ...polar(x, y, rr * 0.92, a + h * 1.15), ...polar(x, y, r0, a + h));
    } else {
      p.bezierCurveTo(...polar(x, y, rr * 1.02, a - h * 1.2), ...polar(x, y, rr * 1.08, a + h * 1.2), ...polar(x, y, r0, a + h));
    }
    p.closePath();
    return p;
  };
  const lw = Math.max(0.8, r * 0.035);
  for (let i = 0; i < n; i++) {
    const p = petal(r, r * 0.3, (i / n) * Math.PI * 2 - Math.PI / 2, Math.PI / n, true);
    fillLine(g, p, outer, lw);
    pool(g, p, 'rgba(0,0,30,0.25)', r * 0.1);
  }
  for (let i = 0; i < n; i++) {
    const p = petal(r * 0.66, r * 0.2, ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2, Math.PI / n, false);
    fillLine(g, p, mid, lw);
    pool(g, p, 'rgba(60,0,0,0.25)', r * 0.08);
  }
  const d = new Path2D();
  d.arc(x, y, r * 0.36, 0, Math.PI * 2);
  fillLine(g, d, inner, lw);
  g.fillStyle = WHITE;
  for (let i = 0; i < 10; i++) {
    const [px, py] = polar(x, y, r * 0.26, (i / 10) * Math.PI * 2);
    g.beginPath();
    g.arc(px, py, r * 0.045, 0, Math.PI * 2);
    g.fill();
  }
  const c = new Path2D();
  c.arc(x, y, r * 0.14, 0, Math.PI * 2);
  fillLine(g, c, mid, lw);
}

/** Rumi kıvrımı: dıştan içe sarılan ince sarmal dal + uçta minik yaprak. */
function tendril(g: Ctx, x: number, y: number, r: number, a0: number, dir: number, lw: number, col: string): void {
  const pts: number[] = [];
  const turns = 1.35, N = 34;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const th = a0 + dir * u * turns * Math.PI * 2;
    const rr = r * (1 - 0.8 * u);
    pts.push(x + Math.cos(th) * rr, y + Math.sin(th) * rr);
  }
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke(polyPath(pts));
  // dış uçta küçük yaprak
  const [lx, ly] = [pts[0], pts[1]];
  const ta = a0 + dir * Math.PI * 0.5;
  g.save();
  g.translate(lx, ly);
  g.rotate(ta - Math.PI / 2);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(r * 0.28, -r * 0.3, 0, -r * 0.62);
  g.quadraticCurveTo(-r * 0.28, -r * 0.3, 0, 0);
  g.fill();
  g.restore();
  g.beginPath();
  g.arc(pts[N * 2], pts[N * 2 + 1], lw * 1.2, 0, Math.PI * 2);
  g.fillStyle = col;
  g.fill();
}

/** Kobalt zemine serpilmiş beyaz rumi kıvrımları ve turkuaz noktalar. */
function scrollGround(g: Ctx, x0: number, y0: number, w: number, h: number, rnd: Rnd, scale: number, col = 'rgba(250,248,240,0.82)'): void {
  const cell = 34 * scale;
  for (let y = y0 + cell * 0.5; y < y0 + h; y += cell)
    for (let x = x0 + cell * 0.5 + ((Math.round((y - y0) / cell) % 2) * cell) / 2; x < x0 + w; x += cell) {
      tendril(g, x + (rnd() - 0.5) * 4 * scale, y + (rnd() - 0.5) * 4 * scale, 10 * scale, rnd() * 6.28, rnd() < 0.5 ? 1 : -1, 1.1 * scale, col);
      g.fillStyle = TUR_L;
      g.beginPath();
      g.arc(x + cell * 0.48, y + cell * 0.1, 1.5 * scale, 0, Math.PI * 2);
      g.fill();
    }
}

/** Gövde/sap: koyu konturlu yeşil eğri. */
function stem(g: Ctx, ctrl: number[], lw: number, col = GRN): void {
  const p = polyPath(spline(ctrl, 10));
  g.strokeStyle = LINE;
  g.lineWidth = lw + 2;
  g.stroke(p);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke(p);
}

// ───────────────────────── madalyon (şemse) geometrisi ─────────────────────────
/** Bademî madalyon sınırı: elips ile sivri badem (vesica) karışımı; (cx,cy) merkez, a yarı genişlik, b yarı yükseklik. */
function almondPts(cx: number, cy: number, a: number, b: number, pointy = 0.5, n = 90): number[] {
  const R = (a + (b * b) / a) / 2, d = R - a; // vesica
  const right: number[] = [];
  for (let i = 0; i <= n; i++) {
    const y = -b + (2 * b * i) / n;
    const he = a * Math.sqrt(Math.max(0, 1 - (y * y) / (b * b)));
    const hv = Math.max(0, Math.sqrt(Math.max(0, R * R - y * y)) - d);
    right.push(he * (1 - pointy) + hv * pointy, y);
  }
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(cx + right[i * 2], cy + right[i * 2 + 1]);
  for (let i = n - 1; i >= 1; i--) out.push(cx - right[i * 2], cy + right[i * 2 + 1]);
  return out;
}
/** Kapalı çokgenin kenarına dışa doğru yuvarlak dilimler (tepelik) ekler. */
function lobed(pts: number[], lobes: number, depth: number, cx: number, cy: number): Path2D {
  const n = pts.length / 2;
  const L = [0];
  for (let i = 1; i <= n; i++) {
    const j = i % n;
    L.push(L[i - 1] + Math.hypot(pts[j * 2] - pts[(i - 1) * 2], pts[j * 2 + 1] - pts[(i - 1) * 2 + 1]));
  }
  const tot = L[n];
  const p = new Path2D();
  const M = lobes * 10;
  let k = 0;
  for (let m = 0; m <= M; m++) {
    const s = (m / M) * tot;
    while (k < n - 1 && L[k + 1] < s) k++;
    const j = (k + 1) % n;
    const f = (s - L[k]) / Math.max(1e-6, L[k + 1] - L[k]);
    const x = pts[k * 2] + (pts[j * 2] - pts[k * 2]) * f, y = pts[k * 2 + 1] + (pts[j * 2 + 1] - pts[k * 2 + 1]) * f;
    const dx = x - cx, dy = y - cy, dl = Math.hypot(dx, dy) || 1;
    const bump = depth * Math.pow(Math.abs(Math.sin((Math.PI * s * lobes) / tot)), 0.55);
    const px = x + (dx / dl) * bump, py = y + (dy / dl) * bump;
    if (m === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  return p;
}

// ───────────────────────── sır (glaze) zemin ─────────────────────────
function paintGlaze(w: number, h: number, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, h);
  const rnd = mulberry(seed);
  const r = g.createRadialGradient(w * 0.42, h * 0.4, w * 0.1, w / 2, h / 2, h * 0.7);
  r.addColorStop(0, '#fefcf6');
  r.addColorStop(0.7, '#f6f1e3');
  r.addColorStop(1, '#ebe3cd');
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);
  // sır altı hamurun dalgalanması: çok soluk mavimsi/sarımsı lekeler
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = rnd() * h, rr = 20 + rnd() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const col = rnd() < 0.5 ? '200,214,226' : '236,222,190';
    gr.addColorStop(0, `rgba(${col},0.22)`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // çatlaklar (sır kılcalları): çok ince, çok soluk kırık çizgiler
  g.strokeStyle = 'rgba(120,110,90,0.075)';
  g.lineWidth = 0.6;
  for (let i = 0; i < 46; i++) {
    let x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    const n = 4 + Math.floor(rnd() * 6);
    for (let k = 0; k < n; k++) {
      a += (rnd() - 0.5) * 1.3;
      x += Math.cos(a) * (6 + rnd() * 14);
      y += Math.sin(a) * (6 + rnd() * 14);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // iğne delikleri ve benekler
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h;
    g.fillStyle = rnd() < 0.6 ? 'rgba(110,100,80,0.09)' : 'rgba(255,255,255,0.5)';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

/** Sırın parlaklığı: köşegen yumuşak ışık bandı (en son, ekranla karışarak). */
function sheen(g: Ctx, w: number, h: number, a: number): void {
  g.save();
  g.globalCompositeOperation = 'screen';
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.28, `rgba(255,255,255,${a})`);
  gr.addColorStop(0.4, 'rgba(255,255,255,0)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0)');
  gr.addColorStop(0.8, `rgba(255,255,255,${a * 0.6})`);
  gr.addColorStop(0.9, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.restore();
}

// ───────────────────────── bordür ─────────────────────────
/** Düz bordür koşusu: kobalt zemin üzerinde dalgalı beyaz asma; koylarda dönüşümlü kırmızı lale ve beyaz hatayi. */
function bandRun(g: Ctx, x0: number, y0: number, x1: number, y1: number, bw: number, flip: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  g.save();
  g.translate(x0, y0);
  g.rotate(Math.atan2(y1 - y0, x1 - x0));
  g.scale(1, flip);
  const nW = Math.max(1, Math.round(len / (bw * 1.7)));
  const L = len / nW, A = bw * 0.2;
  const vy = (x: number): number => A * Math.sin((2 * Math.PI * x) / L);
  // asma
  const pts: number[] = [];
  for (let x = 0; x <= len + 0.5; x += 2) pts.push(x, vy(x));
  const vine = polyPath(pts);
  g.strokeStyle = WHITE;
  g.lineWidth = bw * 0.085;
  g.stroke(vine);
  // koylar: tepe noktalarının karşısında motif
  for (let k = 0; k < nW * 2; k++) {
    const x = ((k + 0.5) * L) / 2;
    const s = k % 2 ? -1 : 1; // asma bu noktada s·A'da
    if (k % 2 === 0) {
      // lale: asmadan karşı kenara doğru
      tulip(g, x, s * A * 0.7, s > 0 ? Math.PI : 0, bw * 0.4, BOLE, 'rgba(255,240,230,0.9)');
    } else {
      const ry = -s * bw * 0.17;
      g.strokeStyle = WHITE;
      g.lineWidth = bw * 0.06;
      g.beginPath();
      g.moveTo(x, s * A);
      g.lineTo(x, ry);
      g.stroke();
      rosette(g, x, ry, bw * 0.2, WHITE, BOLE, TUR, 6);
    }
    // sıfır geçişlerinde turkuaz yapraklar
    const xz = (k * L) / 2;
    if (xz > 1) {
      const sl = Math.atan2(((2 * Math.PI) / L) * A * Math.cos((2 * Math.PI * xz) / L), 1);
      g.save();
      g.translate(xz, 0);
      g.rotate(sl);
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(bw * 0.09 * sd, -bw * 0.1, bw * 0.2 * sd, -bw * 0.16 * sd);
        g.quadraticCurveTo(bw * 0.06 * sd, -bw * 0.02, 0, 0);
        g.fillStyle = TUR_L;
        g.fill();
      }
      g.restore();
    }
  }
  g.restore();
}

/** Dikdörtgen bordür halkası: dört koşu + köşelerde hatayi göbekleri. (x,y,w,h) şeridin dış sınırı. */
function borderRing(g: Ctx, x: number, y: number, w: number, h: number, bw: number, cornerR: number, corners: boolean[]): void {
  const m = bw / 2;
  bandRun(g, x + m, y + m, x + w - m, y + m, bw, 1);
  bandRun(g, x + w - m, y + m, x + w - m, y + h - m, bw, 1);
  bandRun(g, x + w - m, y + h - m, x + m, y + h - m, bw, 1);
  bandRun(g, x + m, y + h - m, x + m, y + m, bw, 1);
  const cs: [number, number][] = [
    [x + m, y + m],
    [x + w - m, y + m],
    [x + w - m, y + h - m],
    [x + m, y + h - m],
  ];
  cs.forEach(([cx, cy], i) => {
    if (!corners[i]) return;
    const d = new Path2D();
    d.arc(cx, cy, cornerR * 1.12, 0, Math.PI * 2);
    g.fillStyle = COB;
    g.fill(d);
    rosette(g, cx, cy, cornerR, BOLE, WHITE, TUR, 8);
  });
}

// ───────────────────────── ön yüz çerçevesi ve paneli ─────────────────────────
const F = 0.085; // çerçeve kalınlığı (kart genişliği oranı)
function paintFrame(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const bw = F * PW;
  g.fillStyle = COB;
  g.fillRect(0, 0, PW, PH);
  // kobalt zeminde hafif fırça/sır dalgalanması
  const rnd = mulberry(4);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * PW, y = rnd() * PH, rr = 10 + rnd() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, rnd() < 0.5 ? 'rgba(10,26,80,0.35)' : 'rgba(70,110,200,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  borderRing(g, 0, 0, PW, PH, bw, bw * 0.42, [false, true, false, true]);
  // dış kenara ince turkuaz fileto
  g.strokeStyle = TUR;
  g.lineWidth = 2.2;
  const e = new Path2D();
  roundRect(e, 4.5, 4.5, PW - 9, PH - 9, 0.08 * PW - 4);
  g.stroke(e);
  sheen(g, PW, PH, 0.14);
  return c;
}

/** Köşebent: panelin boş köşesinde çeyrek madalyon (kobalt zemin, turkuaz kenar, kırmızı göbek). */
function cornerPiece(g: Ctx, cx: number, cy: number, r: number, rot: number): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  // çeyrek: +x, +y yönüne açılır
  const pts: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * (Math.PI / 2);
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  const outer = lobed([0, 0, ...pts], 7, r * 0.07, 0, 0);
  g.fillStyle = TUR;
  g.fill(outer);
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  g.stroke(outer);
  const inner = new Path2D();
  inner.moveTo(0, 0);
  inner.arc(0, 0, r * 0.84, 0, Math.PI / 2);
  inner.closePath();
  fillLine(g, inner, COB, 1);
  g.save();
  g.clip(inner);
  const rnd = mulberry(9);
  for (let i = 0; i < 4; i++) tendril(g, r * (0.3 + rnd() * 0.4), r * (0.3 + rnd() * 0.4), r * 0.14, rnd() * 6, i % 2 ? 1 : -1, 1, 'rgba(250,248,240,0.85)');
  tulip(g, r * 0.06, r * 0.06, Math.PI * 0.75, r * 0.62, BOLE, 'rgba(255,240,230,0.85)', true);
  g.restore();
  rosette(g, 0, 0, r * 0.3, BOLE, WHITE, TUR, 8);
  g.restore();
}

function paintPanel(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  g.drawImage(paintGlaze(PW, PH, 21), 0, 0);
  // çok soluk ogival kafes filigranı (sırın altındaki desen izi; değerlerin okunurluğunu bozmaz)
  const D = PW / 3.2, P = D * 1.3, A = D / 2;
  g.save();
  g.translate(PW / 2, PH / 2);
  g.strokeStyle = 'rgba(43,158,164,0.13)';
  g.lineWidth = 1.6;
  for (let k = -3; k <= 3; k++)
    for (const fam of [-1, 1]) {
      g.beginPath();
      for (let y = -PH / 2 - 10; y <= PH / 2 + 10; y += 4) {
        const x = k * D + fam * A * Math.sin((Math.PI * y) / P);
        if (y === -PH / 2 - 10) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  g.fillStyle = 'rgba(199,51,31,0.13)';
  for (let k = -3; k <= 3; k++)
    for (let n = -3; n <= 3; n++)
      for (const [x, y] of [
        [k * D, n * P],
        [k * D + A, n * P + P / 2],
      ]) {
        for (let q = 0; q < 4; q++) {
          const a = (q * Math.PI) / 2;
          g.beginPath();
          g.ellipse(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 4, 2.2, a, 0, Math.PI * 2);
          g.fill();
        }
      }
  g.restore();
  const f = F * PW;
  const r = 0.16 * PW;
  cornerPiece(g, PW - f, f, r, Math.PI / 2);
  cornerPiece(g, f, PH - f, r, -Math.PI / 2);
  sheen(g, PW, PH, 0.35);
  return c;
}

// ───────────────────────── büyük takım işaretleri (çini dolgulu) ─────────────────────────
const SPR = 240;
function paintSuit(path: Path2D, red: boolean): HTMLCanvasElement {
  const [c, g] = makeCanvas(SPR, SPR);
  const k = SPR * 0.84, Cc = SPR / 2;
  g.setTransform(k, 0, 0, k, Cc, Cc);
  // hafif kabarıklık: sol üstten aydınlık, sağ alttan koyu
  const gr = g.createLinearGradient(-0.5, -0.55, 0.5, 0.55);
  if (red) {
    gr.addColorStop(0, '#de4a30');
    gr.addColorStop(0.55, BOLE);
    gr.addColorStop(1, '#a82614');
  } else {
    gr.addColorStop(0, '#24398a');
    gr.addColorStop(0.55, '#162a62');
    gr.addColorStop(1, '#0c1942');
  }
  g.fillStyle = gr;
  g.fill(path);
  g.save();
  g.clip(path);
  // ince ogival kafes (çini deseni), düşük kontrast: ortadaki değer net okunur
  g.strokeStyle = red ? 'rgba(120,16,6,0.42)' : 'rgba(90,130,210,0.38)';
  g.lineWidth = 0.022;
  const P = 0.24, Aw = 0.12;
  for (let col = -4; col <= 4; col++) {
    for (const sg of [-1, 1]) {
      g.beginPath();
      for (let y = -0.7; y <= 0.7; y += 0.02) {
        const x = col * Aw * 2 + sg * Aw * Math.sin((Math.PI * y) / P);
        if (y === -0.7) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  // kafes düğümlerinde minik dört yapraklı çiçekler
  g.fillStyle = red ? 'rgba(255,214,190,0.5)' : 'rgba(140,210,210,0.55)';
  for (let col = -4; col <= 4; col++)
    for (let row = -4; row <= 4; row++) {
      const x = col * Aw * 2, y = row * P;
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * 0.02, y + Math.sin(a) * 0.02, 0.018, 0.009, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  g.restore();
  // sır havuzlanması + iç beyaz/turkuaz ayırma çizgisi
  pool(g, path, red ? 'rgba(80,6,0,0.35)' : 'rgba(0,0,20,0.5)', 0.07);
  insetLine(g, path, 'rgba(0,0,0,0)', red ? 'rgba(255,248,236,0.95)' : TUR_L, 0.045, 0.018);
  // kabarık kırmızının parıltısı
  g.save();
  g.clip(path);
  const hl = g.createRadialGradient(-0.2, -0.28, 0, -0.2, -0.28, 0.42);
  hl.addColorStop(0, 'rgba(255,255,255,0.28)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  g.lineWidth = 2.2 / k;
  g.strokeStyle = LINE;
  g.stroke(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// ───────────────────────── As: büyük hatayi madalyonu ─────────────────────────
const ACE_S = 360;
/** As: üstten görülen büyük hatayi — sekiz kobalt sivri yaprak, aralarında dışa bakan laleler, turkuaz dilimli halka, beyaz göbek. */
function paintAce(): HTMLCanvasElement {
  const S = ACE_S, Cx = S / 2, R = S * 0.48;
  const [c, g] = makeCanvas(S, S);
  const TS = 'rgba(255,240,230,0.9)';
  // dış kobalt sivri yapraklar
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, h = Math.PI / 8;
    const p = new Path2D();
    p.moveTo(...polar(Cx, Cx, R * 0.4, a - h));
    p.bezierCurveTo(...polar(Cx, Cx, R * 0.86, a - h * 1.05), ...polar(Cx, Cx, R * 0.86, a - h * 0.25), ...polar(Cx, Cx, R * 0.99, a));
    p.bezierCurveTo(...polar(Cx, Cx, R * 0.86, a + h * 0.25), ...polar(Cx, Cx, R * 0.86, a + h * 1.05), ...polar(Cx, Cx, R * 0.4, a + h));
    p.closePath();
    fillLine(g, p, COB, 1.4);
    pool(g, p, 'rgba(0,0,30,0.35)', R * 0.05);
    insetLine(g, p, 'rgba(0,0,0,0)', 'rgba(127,202,198,0.9)', R * 0.035, 1.3);
    // yaprağın ortasında beyaz damar + kırmızı damla
    const [x0, y0] = polar(Cx, Cx, R * 0.6, a), [x1, y1] = polar(Cx, Cx, R * 0.88, a);
    g.strokeStyle = WHITE;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    const [dx, dy] = polar(Cx, Cx, R * 0.74, a);
    g.fillStyle = BOLE;
    g.beginPath();
    g.ellipse(dx, dy, R * 0.035, R * 0.06, a + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = LINE;
    g.lineWidth = 1;
    g.stroke();
  }
  // aralarda dışa bakan laleler
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2 - Math.PI / 2;
    const [lx, ly] = polar(Cx, Cx, R * 0.56, a);
    tulip(g, lx, ly, a + Math.PI / 2, R * 0.38, BOLE, TS);
  }
  // turkuaz dilimli halka
  const ring: number[] = [];
  for (let i = 0; i < 120; i++) ring.push(...polar(Cx, Cx, R * 0.56, (i / 120) * Math.PI * 2));
  const disk = lobed(ring, 16, R * 0.04, Cx, Cx);
  fillLine(g, disk, TUR, 1.4);
  pool(g, disk, 'rgba(0,40,40,0.3)', R * 0.04);
  g.fillStyle = WHITE;
  for (let i = 0; i < 32; i++) {
    const [x, y] = polar(Cx, Cx, R * 0.53, (i / 32) * Math.PI * 2);
    g.beginPath();
    g.arc(x, y, R * 0.014, 0, Math.PI * 2);
    g.fill();
  }
  // beyaz sırlı göbek (takım işareti buraya)
  const wd = new Path2D();
  wd.arc(Cx, Cx, R * 0.49, 0, Math.PI * 2);
  const wg = g.createRadialGradient(Cx - R * 0.1, Cx - R * 0.12, R * 0.05, Cx, Cx, R * 0.49);
  wg.addColorStop(0, '#fffdf7');
  wg.addColorStop(1, '#efe7d2');
  fillLine(g, wd, wg, 1.4);
  g.strokeStyle = BOLE;
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(Cx, Cx, R * 0.455, 0, Math.PI * 2);
  g.stroke();
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
// Papaz = altın tuğra (lalelerle), Kız = vazodan yükselen lale demeti, Vale = mihrapta karanfil mızrağı (altın çerçeve).
const CW = 240, CH = 350, CA = 100, CB = 152; // tuval + madalyon yarıçapları
const RINGW = 13;

function goldGrad(g: Ctx, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff2bf');
  gr.addColorStop(0.3, '#f0c64c');
  gr.addColorStop(0.62, '#c48a20');
  gr.addColorStop(1, '#8a5a12');
  return gr;
}
/** Hat darbesi: kalınlığı değişen altın şerit (koyu kontur + altın + ortada ince ışık). */
function calli(g: Ctx, ctrl: number[], w0: number, w1: number, gold: CanvasGradient, bulge = 0): void {
  const pts = spline(ctrl, 14);
  const p = ribbon(pts, t => {
    const w = (w0 + (w1 - w0) * t + bulge * Math.sin(Math.PI * t)) / 2;
    return [w, w];
  });
  g.strokeStyle = '#2e1a03';
  g.lineWidth = 2.6;
  g.stroke(p);
  g.fillStyle = gold;
  g.fill(p);
  g.strokeStyle = 'rgba(255,246,200,0.75)';
  g.lineWidth = Math.max(0.6, Math.min(w0, w1) * 0.3);
  const n = pts.length / 2;
  g.stroke(polyPath(pts.slice(Math.floor(n * 0.12) * 2, Math.floor(n * 0.85) * 2)));
}
/** Altın varak serpintisi: minik altın noktalar ve üçlü benekler (tezhip). */
function goldDust(g: Ctx, rnd: Rnd, n: number, x0: number, y0: number, w: number, h: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * w, y = y0 + rnd() * h;
    g.fillStyle = rnd() < 0.5 ? '#f3d27a' : '#d9a83c';
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      g.beginPath();
      g.arc(x + Math.cos(a) * 1.7, y + Math.sin(a) * 1.7, 0.95, 0, Math.PI * 2);
      g.fill();
    }
  }
}
function ellPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return out;
}

/** Papaz: kobalt zeminde altın tuğra (beyze ilmekleri, üç tuğ, zülfeler, kol hançerleri, sere) + dipte lale demeti. */
function paintTugra(g: Ctx, rnd: Rnd): void {
  const bg = g.createRadialGradient(118, 170, 20, 120, 175, 210);
  bg.addColorStop(0, '#2c4fae');
  bg.addColorStop(1, '#132a70');
  g.fillStyle = bg;
  g.fillRect(0, 0, CW, CH);
  scrollGround(g, 0, 0, CW, CH, rnd, 0.9, 'rgba(250,248,240,0.36)');
  goldDust(g, rnd, 26, 20, 20, 200, 300);
  const gold = goldGrad(g, 30, 290);
  // sol üstte lale + karanfil (tuğranın boş kalan köşesi)
  stem(g, [70, 176, 62, 140, 58, 112], 1.8);
  stem(g, [74, 176, 86, 150, 90, 128], 1.8);
  saz(g, [72, 178, 50, 160, 44, 128, 52, 100], 6, TUR, WHITE, -1, 6, true);
  tulip(g, 58, 112, -0.22, 34, BOLE, 'rgba(255,240,230,0.9)', true);
  carn(g, 90, 128, 0.18, 26, BOLE, WHITE, TUR, true);
  // beyze: dış ve iç ilmek
  rosette(g, 90, 226, 15, BOLE, WHITE, TUR, 8);
  calli(g, ellPts(88, 222, 50, 44, 0.42, 0.42 - Math.PI * 1.9, 30), 2.4, 3, gold, 10);
  calli(g, ellPts(94, 226, 29, 26, 0.5, 0.5 - Math.PI * 1.86, 24), 2, 2.5, gold, 7);
  // üç tuğ (elif): alttan yukarı incelir, tepede sola kıvrılır
  calli(g, [118, 240, 119, 170, 120, 112, 118, 76, 112, 62, 104, 60], 10, 2.4, gold);
  calli(g, [138, 240, 139, 160, 140, 98, 138, 60, 132, 46, 124, 44], 10, 2.4, gold);
  calli(g, [158, 240, 159, 176, 160, 122, 158, 88, 152, 76, 144, 74], 10, 2.4, gold);
  // zülfeler: tuğları kesen dalgalı bayraklar
  calli(g, [120, 136, 144, 124, 170, 134, 190, 152, 202, 172], 7, 1.6, gold, 2);
  calli(g, [140, 114, 162, 104, 184, 114, 198, 132], 6, 1.6, gold, 2);
  // kol: sağa uzanan iki hançer
  calli(g, [64, 270, 112, 270, 160, 258, 190, 238, 206, 210], 9, 1.4, gold, 3);
  calli(g, [92, 256, 130, 255, 166, 242, 188, 222, 198, 202], 6, 1.4, gold, 2);
  // sere
  calli(g, [120, 252, 134, 246, 148, 252, 158, 264], 5, 2, gold, 1);
  calli(g, [162, 236, 172, 244, 168, 256], 5, 2, gold);
  for (const [x, y] of [
    [104, 60],
    [124, 44],
    [144, 74],
  ]) {
    g.fillStyle = '#fff4c8';
    g.beginPath();
    g.arc(x - 2, y, 3.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2e1a03';
    g.lineWidth = 1;
    g.stroke();
  }
  // dipte lale demeti
  const bx = CW / 2, by = 318;
  saz(g, [bx, by, bx - 24, by - 12, bx - 48, by - 10], 5.5, TUR, WHITE, -1, 5, true);
  saz(g, [bx, by, bx + 24, by - 12, bx + 48, by - 10], 5.5, TUR, WHITE, 1, 5, true);
  tulip(g, bx - 5, by - 2, -0.7, 19, BOLE, 'rgba(255,240,230,0.9)', true);
  tulip(g, bx + 5, by - 2, 0.7, 19, BOLE, 'rgba(255,240,230,0.9)', true);
  tulip(g, bx, by - 4, 0, 23, BOLE, 'rgba(255,240,230,0.9)', true);
  // varak parıltısı
  g.save();
  g.globalCompositeOperation = 'screen';
  const gl = g.createRadialGradient(130, 150, 10, 130, 150, 120);
  gl.addColorStop(0, 'rgba(255,220,140,0.16)');
  gl.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gl;
  g.fillRect(0, 0, CW, CH);
  g.restore();
}

function vase(g: Ctx, cx: number, by: number, w: number, h: number): void {
  const p = new Path2D();
  p.moveTo(cx - w * 0.22, by);
  p.bezierCurveTo(cx - w * 0.2, by - h * 0.1, cx - w * 0.55, by - h * 0.3, cx - w * 0.5, by - h * 0.56);
  p.bezierCurveTo(cx - w * 0.45, by - h * 0.78, cx - w * 0.16, by - h * 0.78, cx - w * 0.16, by - h * 0.9);
  p.lineTo(cx - w * 0.26, by - h);
  p.lineTo(cx + w * 0.26, by - h);
  p.lineTo(cx + w * 0.16, by - h * 0.9);
  p.bezierCurveTo(cx + w * 0.16, by - h * 0.78, cx + w * 0.45, by - h * 0.78, cx + w * 0.5, by - h * 0.56);
  p.bezierCurveTo(cx + w * 0.55, by - h * 0.3, cx + w * 0.2, by - h * 0.1, cx + w * 0.22, by);
  p.closePath();
  fillLine(g, p, COB, 1.4);
  pool(g, p, 'rgba(0,0,30,0.35)', 6);
  g.save();
  g.clip(p);
  g.strokeStyle = WHITE;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx - w, by - h * 0.82);
  g.lineTo(cx + w, by - h * 0.82);
  g.moveTo(cx - w, by - h * 0.22);
  g.lineTo(cx + w, by - h * 0.22);
  g.stroke();
  g.fillStyle = TUR_L;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.arc(cx + i * w * 0.12, by - h * 0.12, 1.4, 0, Math.PI * 2);
    g.fill();
  }
  rosette(g, cx, by - h * 0.52, h * 0.22, TUR, BOLE, WHITE, 8);
  const hl = g.createLinearGradient(cx - w * 0.5, 0, cx + w * 0.5, 0);
  hl.addColorStop(0.15, 'rgba(255,255,255,0)');
  hl.addColorStop(0.28, 'rgba(255,255,255,0.3)');
  hl.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.fillRect(cx - w, by - h, w * 2, h);
  g.restore();
}

/** Kız: beyaz sır üzerinde kobalt vazodan yükselen lale demeti (laleler, karanfiller, sümbüller, saz yaprakları). */
function paintBouquet(g: Ctx): void {
  g.drawImage(paintGlaze(CW, CH, 66), 0, 0);
  const cx = CW / 2, vb = 302, vh = 58, top = vb - vh + 4;
  const TS = 'rgba(255,240,230,0.9)';
  // büyük saz yaprakları: vazo ağzından dışa ve aşağı kıvrılır
  saz(g, [cx - 6, top, cx - 34, top - 40, cx - 66, top - 56, cx - 84, top - 30, cx - 80, top + 10], 10, GRN, '#e9f1e4', -1, 7);
  saz(g, [cx + 6, top, cx + 34, top - 40, cx + 66, top - 56, cx + 84, top - 30, cx + 80, top + 10], 10, GRN, '#e9f1e4', 1, 7);
  const tips: [number, number, number, number, 'T' | 'C' | 'H'][] = [
    [cx - 30, 180, -0.16, 78, 'H'],
    [cx + 30, 180, 0.16, 78, 'H'],
    [cx - 58, 208, -0.92, 36, 'C'],
    [cx + 58, 208, 0.92, 36, 'C'],
    [cx - 44, 146, -0.42, 52, 'T'],
    [cx + 44, 146, 0.42, 52, 'T'],
    [cx, 112, 0, 62, 'T'],
  ];
  for (const [x, y, , , k] of tips) {
    const mx = (cx + x) / 2 + (x - cx) * 0.12;
    stem(g, [cx + (x - cx) * 0.06, top, mx, (top + y) / 2 + 6, x, y], k === 'H' ? 1.6 : 2.2);
  }
  // saplarda küçük yapraklar
  for (const sd of [-1, 1]) {
    saz(g, [cx + sd * 8, top - 30, cx + sd * 24, top - 52, cx + sd * 26, top - 78], 5, TUR, WHITE, sd, 5);
    saz(g, [cx + sd * 4, top - 60, cx + sd * 12, top - 90, cx + sd * 8, top - 116], 4.5, GRN, '#e9f1e4', -sd, 5);
  }
  for (const [x, y, a, sz, k] of tips) {
    if (k === 'T') tulip(g, x, y, a, sz, BOLE, TS);
    else if (k === 'C') carn(g, x, y, a, sz, BOLE, WHITE, TUR);
    else hyacinth(g, x, y, a, sz, COB);
  }
  rosette(g, cx - 56, vb - 22, 10, COB, BOLE, TUR, 8);
  rosette(g, cx + 56, vb - 22, 10, COB, BOLE, TUR, 8);
  vase(g, cx, vb, 72, vh);
}

/** Mihrap kemeri: sivri kemer; cx eksen, top tepe, spring kemer başlangıcı, hw yarı genişlik, bottom taban. */
function archPath(cx: number, top: number, spring: number, hw: number, bottom: number): Path2D {
  const p = new Path2D();
  p.moveTo(cx - hw, bottom);
  p.lineTo(cx - hw, spring);
  p.bezierCurveTo(cx - hw, spring - (spring - top) * 0.55, cx - hw * 0.35, top + (spring - top) * 0.25, cx, top);
  p.bezierCurveTo(cx + hw * 0.35, top + (spring - top) * 0.25, cx + hw, spring - (spring - top) * 0.55, cx + hw, spring);
  p.lineTo(cx + hw, bottom);
  p.closePath();
  return p;
}

/** Vale (Pişti'nin gücü): altın varak (tezhip) zeminde kobalt mihrap; içinde mızrak gibi yükselen karanfil. */
function paintMihrab(g: Ctx, rnd: Rnd): void {
  const cx = CW / 2;
  // altın varak zemin + zımba noktaları + soluk altın kıvrımlar
  g.fillStyle = goldGrad(g, 0, CH);
  g.fillRect(0, 0, CW, CH);
  g.fillStyle = 'rgba(120,70,10,0.28)';
  for (let y = 4; y < CH; y += 6)
    for (let x = ((y / 6) % 2) * 3 + 2; x < CW; x += 6) {
      g.beginPath();
      g.arc(x, y, 0.8, 0, Math.PI * 2);
      g.fill();
    }
  for (let i = 0; i < 14; i++) tendril(g, rnd() * CW, rnd() * CH, 12, rnd() * 6, rnd() < 0.5 ? 1 : -1, 1.3, 'rgba(140,84,14,0.55)');
  const outer = archPath(cx, 40, 128, 66, CH + 10);
  const niche = archPath(cx, 50, 132, 57, CH + 10);
  g.lineWidth = 3;
  g.strokeStyle = '#2e1a03';
  g.stroke(outer);
  g.fillStyle = BOLE;
  g.fill(outer);
  g.save();
  g.clip(niche);
  const nb = g.createLinearGradient(0, 40, 0, CH);
  nb.addColorStop(0, '#132a70');
  nb.addColorStop(1, '#2547a2');
  g.fillStyle = nb;
  g.fillRect(0, 0, CW, CH);
  scrollGround(g, cx - 60, 40, 120, CH, rnd, 0.8, 'rgba(250,248,240,0.45)');
  g.restore();
  g.lineWidth = 1.6;
  g.strokeStyle = WHITE;
  g.stroke(niche);
  // kırmızı kemer şeridinde beyaz inciler
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    let x: number, y: number;
    if (t < 0.25) {
      x = cx - 61.5;
      y = CH - (CH - 130) * (t / 0.25);
    } else if (t > 0.75) {
      x = cx + 61.5;
      y = 130 + (CH - 130) * ((t - 0.75) / 0.25);
    } else {
      const u = (t - 0.25) / 0.5; // kemer
      const a = Math.PI * (1 - u);
      x = cx + Math.cos(a) * 61.5;
      y = 130 - Math.sin(a) * 84 * Math.pow(Math.sin(a), 0.2);
    }
    g.fillStyle = i % 2 ? WHITE : TUR_L;
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  // karanfil mızrağı
  const base = CH - 28;
  saz(g, [cx - 2, base, cx - 30, base - 50, cx - 42, base - 120, cx - 30, base - 172], 9, TUR, WHITE, -1, 7, true);
  saz(g, [cx + 2, base, cx + 30, base - 50, cx + 42, base - 120, cx + 30, base - 172], 9, TUR, WHITE, 1, 7, true);
  const sp = polyPath(spline([cx, base, cx, base - 120, cx, base - 214], 8));
  g.strokeStyle = WHITE;
  g.lineWidth = 7;
  g.stroke(sp);
  stem(g, [cx, base, cx, base - 120, cx, base - 214], 3);
  const buds: [number, number, number, number][] = [
    [base - 56, -1, 1.0, 24],
    [base - 92, 1, 1.0, 24],
    [base - 128, -1, 0.9, 21],
    [base - 160, 1, 0.9, 21],
  ];
  for (const [y, sd, a, sz] of buds) {
    stem(g, [cx, y + 10, cx + sd * 10, y, cx + sd * 18, y - 6], 1.6);
    tulip(g, cx + sd * 18, y - 6, sd * a, sz, BOLE, 'rgba(255,240,230,0.9)', true);
  }
  carn(g, cx, base - 212, 0, 70, BOLE, WHITE, TUR, true);
  // köşeliklerde (spandrel) kırmızı göbekler
  rosette(g, cx - 84, 64, 15, BOLE, WHITE, TUR);
  rosette(g, cx + 84, 64, 15, BOLE, WHITE, TUR);
}

/** Saray kartı tuvali: bademî madalyon içinde motif + dilimli halka çerçeve. */
function paintCourt(kind: 'K' | 'Q' | 'J'): HTMLCanvasElement {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(kind === 'K' ? 13 : kind === 'Q' ? 12 : 11);
  const cx = CW / 2, cy = CH / 2;
  const a = CA - RINGW, b = CB - RINGW;
  const innerPts = almondPts(cx, cy, a, b, 0.45);
  const inner = polyPath(innerPts, true);
  const [mc, mg] = makeCanvas(CW, CH);
  if (kind === 'K') paintTugra(mg, rnd);
  else if (kind === 'Q') paintBouquet(mg);
  else paintMihrab(mg, rnd);
  sheen(mg, CW, CH, 0.12);
  // halka
  const gold = kind === 'J';
  const outerPts = almondPts(cx, cy, CA, CB, 0.45);
  const outer = lobed(outerPts, 30, 3.2, cx, cy);
  g.fillStyle = gold ? goldGrad(g, 0, CH) : TUR;
  g.fill(outer);
  g.strokeStyle = gold ? '#3a2204' : LINE;
  g.lineWidth = 1.4;
  g.stroke(outer);
  const midPts = almondPts(cx, cy, CA - 4.5, CB - 4.5, 0.45);
  const mid = polyPath(midPts, true);
  g.fillStyle = gold ? '#7a1a10' : COB;
  g.fill(mid);
  g.strokeStyle = gold ? '#3a2204' : LINE;
  g.lineWidth = 1;
  g.stroke(mid);
  // halkada inci/taş dizisi
  const ring = almondPts(cx, cy, CA - 8.5, CB - 8.5, 0.45, 70);
  for (let i = 0; i < ring.length / 2; i += 2) {
    g.fillStyle = gold ? (i % 4 ? '#f6d777' : TUR_L) : i % 4 ? WHITE : BOLE;
    g.beginPath();
    g.arc(ring[i * 2], ring[i * 2 + 1], gold ? 2.1 : 1.8, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  g.clip(inner);
  g.drawImage(mc, 0, 0);
  g.restore();
  g.strokeStyle = gold ? '#f3d27a' : BOLE;
  g.lineWidth = 2;
  g.stroke(inner);
  g.strokeStyle = LINE;
  g.lineWidth = 0.8;
  g.stroke(inner);
  return c;
}

// ───────────────────────── arka yüz: simetrik çini panosu ─────────────────────────
// Orta bademî madalyon (şemse), dört köşebent, iki yanda yarım madalyon; aralarda lale-karanfil-sümbül demetleri.
function paintBack(): HTMLCanvasElement {
  const W = PW, H = PH;
  const [c, g] = makeCanvas(W, H);
  const bw = W * 0.092;
  g.fillStyle = COB;
  g.fillRect(0, 0, W, H);
  borderRing(g, 0, 0, W, H, bw, bw * 0.44, [true, true, true, true]);
  const fx = bw + 7, fy = bw + 7, fw = W - 2 * fx, fh = H - 2 * fy;
  // filetolar: kırmızı - beyaz - turkuaz
  g.fillStyle = BOLE;
  g.fillRect(bw, bw, W - 2 * bw, H - 2 * bw);
  g.fillStyle = WHITE;
  g.fillRect(bw + 2.5, bw + 2.5, W - 2 * bw - 5, H - 2 * bw - 5);
  g.fillStyle = TUR;
  g.fillRect(bw + 4.5, bw + 4.5, W - 2 * bw - 9, H - 2 * bw - 9);
  g.drawImage(paintGlaze(fw, fh, 1557), fx, fy);
  g.strokeStyle = LINE;
  g.lineWidth = 0.8;
  g.strokeRect(fx, fy, fw, fh);
  const cx = W / 2, cy = H / 2, hx = fw / 2, hy = fh / 2;
  const ma = hx * 0.64, mb = hy * 0.58;
  g.save();
  g.beginPath();
  g.rect(fx, fy, fw, fh);
  g.clip();
  g.translate(cx, cy);
  const TS = 'rgba(255,240,230,0.9)';
  // 1) ogival kafes: saz yapraklarından örülü; düğümlerde kırmızı hatayi, gözlerde lale ve karanfil
  const D = hx / 1.5, P = D * 1.3, A = D / 2;
  for (let k = -3; k <= 3; k++)
    for (let n = -3; n < 3; n++)
      for (const fam of [-1, 1])
        for (let q = 0; q < 2; q++) {
          // çeyrek dalga: y = n·P + q·P/2 → +P/2
          const y0 = n * P + (q * P) / 2;
          const ctrl: number[] = [];
          for (let i = 0; i <= 4; i++) {
            const y = y0 + (P / 2) * (i / 4);
            ctrl.push(k * D + fam * A * Math.sin((Math.PI * y) / P), y);
          }
          const mx = ctrl[4], my = ctrl[5];
          if (Math.abs(mx) > hx + 30 || Math.abs(my) > hy + 30) continue;
          const odd = (k + n + q) % 2 === 0;
          saz(g, odd ? ctrl : ctrl.reverse(), 7.5, fam > 0 ? GRN : TUR, '#eef6ee', fam * (odd ? 1 : -1), 6);
        }
  // gözler: lale (düşey eksen hizasında) ve karanfil (ara gözler)
  for (let k = -2; k <= 2; k++)
    for (let n = -3; n <= 3; n++) {
      const x1 = k * D, y1 = n * P + P / 2;
      const nearTip = Math.abs(x1) < ma * 0.5 && Math.abs(y1) < mb + 60; // madalyonun tepe/dip lalesiyle çakışmasın
      if (!nearTip && Math.abs(x1) < hx + 10 && Math.abs(y1) < hy + 10) tulip(g, x1, y1 + P * 0.2, 0, P * 0.36, BOLE, TS);
      const x2 = k * D + D / 2, y2 = n * P;
      if (Math.abs(x2) < hx + 10 && Math.abs(y2) < hy + 10) carn(g, x2, y2 + P * 0.2, 0, P * 0.28, COB, WHITE, GRN);
    }
  // düğümler
  for (let k = -3; k <= 3; k++)
    for (let n = -4; n <= 4; n++) {
      const nodes: [number, number][] = [
        [k * D, n * P],
        [k * D + A, n * P + P / 2],
      ];
      for (const [x, y] of nodes) if (Math.abs(x) < hx + 12 && Math.abs(y) < hy + 12) rosette(g, x, y, 11, BOLE, WHITE, TUR, 8);
    }
  // köşebentler
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      g.save();
      g.scale(sx, sy);
      cornerPiece(g, -hx, -hy, hx * 0.46, 0);
      g.restore();
    }
  // 2) orta madalyon
  const mp = almondPts(0, 0, ma, mb, 0.55, 120);
  const med = lobed(mp, 26, 6, 0, 0);
  g.strokeStyle = WHITE;
  g.lineWidth = 7;
  g.stroke(med);
  fillLine(g, med, COB, 1.4);
  pool(g, med, 'rgba(0,0,30,0.4)', 12);
  for (const sy of [-1, 1]) {
    g.save();
    g.scale(1, sy);
    tulip(g, 0, -mb - 2, 0, hx * 0.22, BOLE, TS, true);
    g.restore();
  }
  g.save();
  g.clip(med);
  const rnd = mulberry(15);
  scrollGround(g, -ma, -mb, ma * 2, mb * 2, rnd, 0.85, 'rgba(250,248,240,0.45)');
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      g.save();
      g.scale(sx, sy);
      saz(g, [-ma * 0.1, -mb * 0.2, -ma * 0.5, -mb * 0.26, -ma * 0.74, -mb * 0.52, -ma * 0.56, -mb * 0.8], 9, TUR, WHITE, 1, 7, true);
      tulip(g, 0, -mb * 0.3, 0, mb * 0.42, BOLE, TS, true);
      carn(g, -ma * 0.34, -mb * 0.05, -Math.PI / 2 + 0.1, ma * 0.3, BOLE, WHITE, TUR, true);
      g.restore();
    }
  g.restore();
  rosette(g, 0, 0, ma * 0.36, BOLE, WHITE, TUR, 8);
  const ip = polyPath(almondPts(0, 0, ma - 7, mb - 9, 0.55, 120), true);
  g.strokeStyle = 'rgba(250,248,240,0.85)';
  g.lineWidth = 1.4;
  g.stroke(ip);
  g.restore();
  sheen(g, W, H, 0.2);
  return c;
}

// ───────────────────────── önbellek ─────────────────────────
let backArt: HTMLCanvasElement | null = null;
let frameArt: HTMLCanvasElement | null = null;
let panelArt: HTMLCanvasElement | null = null;
let aceArt: HTMLCanvasElement | null = null;
const suitArt: Partial<Record<Suit, HTMLCanvasElement>> = {};
const courtArt: Record<number, HTMLCanvasElement> = {};
const glyph: Record<string, {l: number; r: number}> = {};
let capRef = 71;
let ready: Promise<void> | null = null;

const LABEL = (r: number): string => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

async function doPrepare(): Promise<void> {
  try {
    await import('@fontsource/playfair-display/900.css');
    await document.fonts.load(`900 100px ${FONT}`, 'AJQK0123456789');
  } catch {
    /* yazı tipi yoksa yedek serif */
  }
  const cn = carnation();
  SH = {tulip: tulipPath(), carnHead: cn.head, carnCalyx: cn.calyx, carnEdge: cn.edge, carnRays: cn.rays, heart: heartPath(), spade: spadePath(), diamond: diamondPath(), club: clubPath()};
  backArt = paintBack();
  frameArt = paintFrame();
  panelArt = paintPanel();
  aceArt = paintAce();
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) suitArt[s] = paintSuit(suitPath(s), isRed(s));
  courtArt[13] = paintCourt('K');
  courtArt[12] = paintCourt('Q');
  courtArt[11] = paintCourt('J');
  const [, mg] = makeCanvas(4, 4);
  mg.font = `900 100px ${FONT}`;
  capRef = mg.measureText('H').actualBoundingBoxAscent || 71;
  for (let r = 1; r <= 13; r++) {
    const t = LABEL(r);
    const m = mg.measureText(t);
    glyph[t] = {l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight};
  }
}

// ───────────────────────── kart çizimi ─────────────────────────
const BX = 0.035, BW = 0.33, BH = 0.6; // köşe rozeti
const RCX = BX + BW / 2;
const RTOP = 0.075;
const CAP = 0.18 / 0.7;
const PIPW = 0.17;

function drawRank(g: Ctx, t: string, cx: number, top: number, capH: number, maxW: number, color: string): void {
  const fs = (capH * 100) / capRef;
  const m = glyph[t] ?? {l: 30, r: 30};
  const k = fs / 100;
  const inkW = (m.l + m.r) * k;
  const sx = Math.min(1, maxW / inkW);
  g.save();
  g.translate(cx, top + capH);
  g.scale(sx, 1);
  g.font = `900 ${fs}px ${FONT}`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = color;
  g.fillText(t, ((m.l - m.r) / 2) * k, 0);
  g.restore();
}
function drawPip(g: Ctx, suit: Suit, cx: number, cy: number, size: number, color: string): void {
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  g.fillStyle = color;
  g.fill(suitPath(suit));
  g.restore();
}
function corners(g: Ctx, w: number, h: number, suit: Suit, rank: number): void {
  const col = isRed(suit) ? RED : INK;
  const t = LABEL(rank);
  for (let flip = 0; flip < 2; flip++) {
    g.save();
    if (flip) {
      g.translate(w, h);
      g.rotate(Math.PI);
    }
    drawRank(g, t, RCX * w, RTOP * w, CAP * w, (t.length > 1 ? 0.3 : 0.27) * w, col);
    drawPip(g, suit, RCX * w, (RTOP + CAP + 0.045 + PIPW * 0.55) * w, PIPW * w, col);
    g.restore();
  }
}
function panelPath(w: number, h: number): Path2D {
  const p = new Path2D();
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.04 * w);
  roundRect(p, BX * w, BX * w, BW * w, BH * w, 0.06 * w);
  roundRect(p, w - (BX + BW) * w, h - (BX + BH) * w, BW * w, BH * w, 0.06 * w);
  return p;
}

function drawFace(g: Ctx, w: number, h: number, suit: Suit, rank: number): void {
  if (!frameArt || !SH) return;
  g.save();
  const card = new Path2D();
  roundRect(card, 0, 0, w, h, 0.08 * w);
  g.clip(card);
  g.drawImage(frameArt, 0, 0, w, h);
  const panel = panelPath(w, h);
  g.lineJoin = 'round';
  g.lineWidth = 0.042 * w;
  g.strokeStyle = LINE;
  g.stroke(panel);
  g.lineWidth = 0.03 * w;
  g.strokeStyle = BOLE;
  g.stroke(panel);
  g.lineWidth = 0.014 * w;
  g.strokeStyle = WHITE;
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(panelArt!, 0, 0, w, h);
  g.restore();

  const cx = w / 2, cy = h / 2;
  if (rank === 1) {
    const d = 0.78 * w;
    g.drawImage(aceArt!, cx - d / 2, cy - d / 2, d, d);
    const sz = 0.27 * w, sd = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - sd / 2, cy - sd / 2, sd, sd);
  } else if (rank >= 11) {
    const art = courtArt[rank];
    const dw = 0.6 * w, dh = (dw * CH) / CW;
    g.drawImage(art, cx - dw / 2, cy - dh / 2, dw, dh);
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 - 0.004 * w);
      g.beginPath();
      g.arc(cx, ey, 0.058 * w, 0, Math.PI * 2);
      g.fillStyle = WHITE;
      g.fill();
      g.lineWidth = 0.012 * w;
      g.strokeStyle = rank === 11 ? '#c9952c' : TUR;
      g.stroke();
      drawPip(g, suit, cx, ey + 0.003 * w, 0.066 * w, isRed(suit) ? RED : INK);
    }
  } else {
    const sz = 0.46 * w, d = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - d / 2, cy - d / 2, d, d);
    const capH = 0.15 * w;
    drawRank(g, LABEL(rank), cx, cy + SUIT_TY[suit] * sz - capH / 2, capH, (suit === 'D' ? 0.2 : 0.24) * w, '#fdfaf2');
  }
  corners(g, w, h, suit, rank);
  g.restore();
  g.save();
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(8,16,48,0.75)';
  const edge = new Path2D();
  roundRect(edge, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, 0.08 * w - g.lineWidth / 2);
  g.stroke(edge);
  g.restore();
}

function drawBack(g: Ctx, w: number, h: number): void {
  if (!backArt) return;
  g.save();
  const card = new Path2D();
  roundRect(card, 0, 0, w, h, 0.08 * w);
  g.clip(card);
  g.drawImage(backArt, 0, 0, w, h);
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(8,16,48,0.8)';
  const edge = new Path2D();
  roundRect(edge, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, 0.08 * w - g.lineWidth / 2);
  g.stroke(edge);
  g.restore();
}

export const skin: Skin = {
  id: 'iznik',
  name: 'İznik Çinisi',
  desc: 'Lale, karanfil ve mercan kırmızısı; saray çinisi zarafeti.',
  prepare(): Promise<void> {
    if (!ready) ready = doPrepare();
    return ready;
  },
  drawFace,
  drawBack,
};
