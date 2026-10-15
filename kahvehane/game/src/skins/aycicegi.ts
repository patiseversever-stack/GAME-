// Deste — "Ayçiçekleri": Van Gogh'un "Ayçiçekleri" (1888, kamu malı) tablolarından esinlenen koleksiyon destesi.
// Kalın boya (impasto), krom sarısı, aşı boyası, zeytin yeşili ve turkuaz arka plan notaları; Van Gogh'un sevdiği
// sarı-lacivert zıtlığı. Hiçbir görsel indirilmez: prepare() içinde binlerce kısa, kabartmalı fırça darbesiyle kendi
// "tablolarımızı" BİR KEZ boyayıp saklarız; kart çizimi yalnızca bu tuvalleri kopyalar.
// (Fırça tekniği Yıldızlı Gece destesinden uyarlanmıştır; bağımlılık olmasın diye bu dosyada kendi kopyası vardır.)
import type {Skin, Suit} from './contract';

type RGB = readonly [number, number, number];
type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;
type Field = (x: number, y: number) => number;

const RED = '#c42519', INK = '#1d1812'; // köşe değerleri: zincifre kırmızı / sıcak siyah
const FONT = '"Playfair Display", "Times New Roman", Georgia, serif';
const PW = 360, PH = Math.round(PW / 0.7);

// ───────────────────────── palet ─────────────────────────
const CHROME: RGB = [242, 194, 36];
const CHROME_L: RGB = [252, 222, 92];
const LEMON: RGB = [250, 236, 150];
const OCHRE: RGB = [204, 140, 38];
const ORANGE: RGB = [226, 120, 30];
const BROWN: RGB = [116, 64, 24];
const DBROWN: RGB = [62, 38, 18];
const OLIVE: RGB = [120, 130, 46];
const OLIVE_D: RGB = [70, 84, 32];
const GREEN: RGB = [62, 112, 54];
const TURQ: RGB = [76, 156, 150];
const TURQ_L: RGB = [138, 194, 178];
const ULTRA: RGB = [40, 62, 148];

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
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lighten = (c: RGB, t: number): RGB => mix(c, [255, 250, 225], t);
const darken = (c: RGB, t: number): RGB => mix(c, [30, 20, 10], t);
function jit(c: RGB, amt: number, rnd: Rnd): RGB {
  const k = (rnd() - 0.5) * 2 * amt;
  const q = amt * 0.45;
  return [clamp(c[0] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[1] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[2] + k + (rnd() - 0.5) * q, 0, 255)];
}
function pick<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
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

// ───────────────────────── fırça (impasto) ─────────────────────────
/** Kabartmalı fırça darbesi: sağ-altta ince gölge, gövde, sol-üstte açık ışık sırtı. */
function brush(g: Ctx, pts: number[], lw: number, c: RGB, relief = 1): void {
  if (pts.length < 4) return;
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  const q = Math.max(0.45, lw * 0.16);
  if (relief > 0.9) {
    g.translate(q * 0.8, q * 0.8);
    g.strokeStyle = css(darken(c, 0.28));
    g.lineWidth = lw * 0.92;
    g.stroke(p);
    g.translate(-q * 0.8, -q * 0.8);
  }
  g.strokeStyle = css(c);
  g.lineWidth = lw;
  g.stroke(p);
  if (relief > 0) {
    g.translate(-q, -q);
    g.strokeStyle = css(lighten(c, 0.22 * relief));
    g.lineWidth = lw * 0.3;
    g.stroke(p);
    g.translate(q, q);
  }
}
function trace(f: Field, x: number, y: number, len: number, step: number): number[] {
  const pts = [x, y];
  const n = Math.max(2, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const a = f(x, y);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push(x, y);
  }
  return pts;
}
/** Yönü ve kıvrımı verilen kısa darbe noktaları. */
function stroke(x: number, y: number, a: number, len: number, bend: number, n = 4): number[] {
  const pts = [x, y];
  for (let i = 1; i <= n; i++) {
    a += bend / n;
    x += (Math.cos(a) * len) / n;
    y += (Math.sin(a) * len) / n;
    pts.push(x, y);
  }
  return pts;
}

/** Taç yaprak: dipte dar, ortada dolgun, ucu sivri mercek şekli; üstünde kabartmalı iki darbe (impasto). */
function petal(g: Ctx, x: number, y: number, a: number, len: number, wid: number, col: RGB, rnd: Rnd, curl = 0): void {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const bend = curl * len;
  const tx = x + ca * len + nx * bend, ty = y + sa * len + ny * bend;
  const mx = x + ca * len * 0.45 + nx * bend * 0.3, my = y + sa * len * 0.45 + ny * bend * 0.3;
  const p = new Path2D();
  p.moveTo(x + nx * wid * 0.18, y + ny * wid * 0.18);
  p.quadraticCurveTo(mx + nx * wid * 0.62, my + ny * wid * 0.62, tx, ty);
  p.quadraticCurveTo(mx - nx * wid * 0.62, my - ny * wid * 0.62, x - nx * wid * 0.18, y - ny * wid * 0.18);
  p.closePath();
  g.fillStyle = css(col);
  g.fill(p);
  g.strokeStyle = css(darken(col, 0.3), 0.8);
  g.lineWidth = Math.max(0.6, wid * 0.08);
  g.stroke(p);
  // impasto: ortada açık, bir yanda koyu darbe
  const side = rnd() < 0.5 ? -1 : 1;
  brush(g, [x + ca * len * 0.12, y + sa * len * 0.12, mx + nx * wid * 0.08, my + ny * wid * 0.08, x + ca * len * 0.78 + nx * bend * 0.7, y + sa * len * 0.78 + ny * bend * 0.7], wid * 0.32, jit(lighten(col, 0.25), 8, rnd), 0.5);
  brush(g, [x + ca * len * 0.15 + nx * wid * 0.22 * side, y + sa * len * 0.15 + ny * wid * 0.22 * side, mx + nx * wid * 0.3 * side, my + ny * wid * 0.3 * side], wid * 0.22, jit(darken(col, 0.12), 8, rnd), 0);
}

// ───────────────────────── ayçiçeği ─────────────────────────
type HeadKind = 'bloom' | 'seed' | 'wilt' | 'back';
interface Head {
  x: number;
  y: number;
  r: number;
  kind: HeadKind;
  squash?: number; // 3/4 görünüm basıklığı
  tilt?: number; // elipsin dönüşü
}
const PETAL_BACK: RGB[] = [ORANGE, OCHRE, [214, 150, 34], [236, 160, 40]];
const PETAL_FRONT: RGB[] = [CHROME, CHROME_L, [246, 206, 60], LEMON, [238, 182, 40]];

/** Ayçiçeği başı: taç yapraklar (iki kat) + çekirdek diski (Fibonacci sarmalı lekeler). */
function sunflower(g: Ctx, hd: Head, rnd: Rnd, s = 1): void {
  const {x, y, r, kind} = hd;
  const sq = hd.squash ?? 1, tilt = hd.tilt ?? 0;
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.scale(1, sq);
  const disc = kind === 'seed' ? r * 0.7 : kind === 'wilt' ? r * 0.4 : r * 0.44;
  if (kind === 'back') {
    // arkadan: yeşil çanak yaprakları + kenarda sarı yaprak uçları
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rnd() * 0.2;
      brush(g, stroke(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, a, r * (0.75 + rnd() * 0.25), (rnd() - 0.5) * 0.6), (5 + rnd() * 3) * s, jit(pick(PETAL_FRONT, rnd), 14, rnd), 0.9);
    }
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      brush(g, stroke(Math.cos(a) * r * 0.06, Math.sin(a) * r * 0.06, a, r * (0.5 + rnd() * 0.2), (rnd() - 0.5) * 0.5), (4.5 + rnd() * 2.5) * s, jit(pick([OLIVE, OLIVE_D, GREEN, [150, 150, 60]] as RGB[], rnd), 12, rnd), 0.9);
    }
    g.fillStyle = css(OLIVE_D);
    g.beginPath();
    g.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    g.fill();
    g.restore();
    return;
  }
  // taç yapraklar: arka kat (turuncu/aşı) + ön kat (krom/limon)
  if (kind !== 'seed') {
    const n = kind === 'wilt' ? 13 : 17;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < n; i++) {
        const a = ((i + layer * 0.5) / n) * Math.PI * 2 + (rnd() - 0.5) * 0.18;
        let dirA = a, curl = (rnd() - 0.5) * 0.3, len = r * (0.66 + rnd() * 0.28) * (layer ? 0.9 : 1);
        if (kind === 'wilt') {
          dirA = a + (Math.PI / 2 - a) * 0.45; // sarkık: aşağı doğru
          curl = (Math.cos(a) > 0 ? 1 : -1) * (0.25 + rnd() * 0.2);
          len *= 0.9;
        }
        const col = jit(pick(layer ? PETAL_FRONT : PETAL_BACK, rnd), 14, rnd);
        petal(g, Math.cos(a) * disc * 0.8, Math.sin(a) * disc * 0.8, dirA, len, r * (0.26 + rnd() * 0.06), col, rnd, curl);
      }
    }
  }
  // çekirdek diski
  g.fillStyle = css(DBROWN);
  g.beginPath();
  g.arc(0, 0, disc, 0, Math.PI * 2);
  g.fill();
  const N = Math.round(disc * disc * 0.16) + 30;
  const cst = disc / Math.sqrt(N);
  const PHI = 2.39996;
  for (let i = N; i > 0; i--) {
    const rr = cst * Math.sqrt(i), th = i * PHI;
    const u = rr / disc;
    let col: RGB;
    if (u > 0.82) col = pick([ORANGE, OCHRE, [190, 100, 30], BROWN] as RGB[], rnd);
    else if (u < 0.3) col = pick([OLIVE, [140, 120, 40], [100, 96, 36]] as RGB[], rnd);
    else col = i % 13 < 4 ? pick([[150, 86, 30], [176, 104, 34]] as RGB[], rnd) : pick([BROWN, DBROWN, [90, 52, 22]] as RGB[], rnd);
    const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
    brush(g, stroke(px, py, th + 1.9, cst * 1.2, 0.3, 2), cst * 1.25, jit(col, 10, rnd), 0.8);
  }
  if (kind === 'seed') {
    // tohum başı: kenarda kurumuş kısa yaprak artıkları
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + rnd() * 0.2;
      brush(g, stroke(Math.cos(a) * disc, Math.sin(a) * disc, a + (rnd() - 0.5) * 0.6, r * (0.18 + rnd() * 0.18), (rnd() - 0.5) * 1.2, 3), (3 + rnd() * 2) * s, jit(pick([OCHRE, ORANGE, [170, 120, 40], CHROME] as RGB[], rnd), 14, rnd), 0.8);
    }
  }
  g.restore();
}

/** Sap: koyu konturlu, zeytin yeşili kalın darbeler. */
function stemPaint(g: Ctx, pts: number[], lw: number, rnd: Rnd): void {
  brush(g, pts, lw + 2.2, darken(OLIVE_D, 0.35), 0);
  for (let k = 0; k < 3; k++) {
    const off = (k - 1) * lw * 0.22;
    const q = pts.map((v, i) => (i % 2 ? v : v + off));
    brush(g, q, lw * 0.5, jit(pick([OLIVE, OLIVE_D, [140, 150, 60]] as RGB[], rnd), 10, rnd), 0.7);
  }
}
/** Yaprak: geniş, kalp biçimli, ucu sivri; dolgu + damar yönünde kabartmalı darbeler. (x,y) sap, a yön, L boy. */
function leaf(g: Ctx, x: number, y: number, a: number, L: number, rnd: Rnd, s = 1): void {
  const W = L * 0.36;
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const P = (t: number, w: number): [number, number] => [x + ca * L * t + nx * w, y + sa * L * t + ny * w];
  const p = new Path2D();
  p.moveTo(...P(0, 0));
  p.bezierCurveTo(...P(0.02, W * 0.9), ...P(0.45, W * 1.15), ...P(1, W * 0.05));
  p.bezierCurveTo(...P(0.45, -W * 1.15), ...P(0.02, -W * 0.9), ...P(0, 0));
  p.closePath();
  g.fillStyle = css(OLIVE_D);
  g.fill(p);
  g.save();
  g.clip(p);
  const LEAF: RGB[] = [GREEN, OLIVE, [96, 130, 60], [140, 150, 60], [74, 104, 48]];
  for (let i = 0; i < 22; i++) {
    const t = 0.08 + rnd() * 0.8, sd = rnd() < 0.5 ? -1 : 1;
    const [px, py] = P(t, sd * W * 0.15);
    brush(g, stroke(px, py, a + sd * (0.75 - t * 0.35), W * (0.8 - t * 0.4), sd * 0.3, 3), (4.2 + rnd() * 2.4) * s, jit(pick(LEAF, rnd), 12, rnd), 0.8);
  }
  g.restore();
  g.strokeStyle = css(darken(OLIVE_D, 0.4));
  g.lineWidth = 1.2 * s;
  g.stroke(p);
  brush(g, [...P(0.02, 0), ...P(0.5, W * 0.04), ...P(0.9, 0)], 1.8 * s, [176, 186, 96], 0);
}

/** Vazo: yuvarlak gövde, üstte krom sarı, altta turuncu-aşı; arada lacivert bant. */
function vase(g: Ctx, cx: number, by: number, w: number, h: number, rnd: Rnd, s = 1): void {
  const p = new Path2D();
  const mw = w * 0.3;
  p.moveTo(cx - mw, by - h);
  p.bezierCurveTo(cx - mw * 0.9, by - h * 0.82, cx - w * 0.56, by - h * 0.62, cx - w * 0.5, by - h * 0.32);
  p.bezierCurveTo(cx - w * 0.46, by - h * 0.06, cx - w * 0.3, by, cx, by);
  p.bezierCurveTo(cx + w * 0.3, by, cx + w * 0.46, by - h * 0.06, cx + w * 0.5, by - h * 0.32);
  p.bezierCurveTo(cx + w * 0.56, by - h * 0.62, cx + mw * 0.9, by - h * 0.82, cx + mw, by - h);
  p.closePath();
  g.save();
  g.fillStyle = css(CHROME);
  g.fill(p);
  g.clip(p);
  const band = by - h * 0.42;
  // gövde boyunca kavisli darbeler
  for (let i = 0; i < 180 * s * s; i++) {
    const px = cx + (rnd() - 0.5) * w, py = by - rnd() * h;
    const u = (px - cx) / (w / 2);
    const upper = py < band;
    const col = upper ? pick([CHROME, CHROME_L, LEMON, [236, 186, 40]] as RGB[], rnd) : pick([ORANGE, OCHRE, [214, 110, 30], [190, 96, 28]] as RGB[], rnd);
    const shade = clamp(Math.abs(u) * 0.3 + (u > 0.2 ? 0.12 : 0), 0, 0.45);
    const v = (by - py) / h; // 0 dip, 1 ağız
    const slope = -u * (v < 0.5 ? 0.5 : -0.25); // gövdenin kavsine göre hafif eğim
    brush(g, stroke(px - 6 * s, py, slope + (rnd() - 0.5) * 0.15, 12 * s, u * 0.3, 3), (4 + rnd() * 3) * s, jit(lighten(darken(col, shade), u < -0.3 && u > -0.7 && v > 0.45 ? 0.25 : 0), 9, rnd), 0.8);
  }
  brush(g, [cx - w * 0.6, band, cx, band + h * 0.05, cx + w * 0.6, band], 3.2 * s, ULTRA, 0.4);
  g.restore();
  // lacivert kontur (Van Gogh'un mavi çizgisi)
  g.strokeStyle = css(ULTRA);
  g.lineWidth = 2.2 * s;
  g.stroke(p);
  // ağız
  brush(g, [cx - mw, by - h, cx, by - h - 3 * s, cx + mw, by - h], 4 * s, [200, 130, 30], 0.6);
}

// ───────────────────────── zemin dokuları ─────────────────────────
/** Van Gogh'un sepet örgüsü arka planı: küçük hücrelerde yönü değişen kısa paralel darbeler. */
function weave(g: Ctx, x0: number, y0: number, w: number, h: number, cols: RGB[], rnd: Rnd, cell: number, s = 1, alpha = 1): void {
  g.globalAlpha = alpha;
  for (let y = y0 - cell / 2; y < y0 + h + cell / 2; y += cell)
    for (let x = x0 - cell / 2; x < x0 + w + cell / 2; x += cell) {
      const a = (rnd() < 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.9;
      const col = jit(pick(cols, rnd), 12, rnd);
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * cell * 0.3;
        const px = x + Math.cos(a + Math.PI / 2) * off + (rnd() - 0.5) * 2, py = y + Math.sin(a + Math.PI / 2) * off + (rnd() - 0.5) * 2;
        brush(g, stroke(px - Math.cos(a) * cell * 0.45, py - Math.sin(a) * cell * 0.45, a, cell * 0.95, (rnd() - 0.5) * 0.4, 2), (3.4 + rnd() * 1.8) * s, k === 1 ? col : jit(col, 10, rnd), alpha < 1 ? 0 : 0.8);
      }
    }
  g.globalAlpha = 1;
}

function paintCream(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(77);
  const r = g.createRadialGradient(PW / 2, PH / 2, PW * 0.15, PW / 2, PH / 2, PH * 0.62);
  r.addColorStop(0, '#fbf3dc');
  r.addColorStop(1, '#efdfb4');
  g.fillStyle = r;
  g.fillRect(0, 0, PW, PH);
  g.globalAlpha = 0.05;
  g.fillStyle = '#6b5a3a';
  for (let y = 0; y < PH; y += 3) g.fillRect(0, y + rnd(), PW, 0.8);
  for (let x = 0; x < PW; x += 3) g.fillRect(x + rnd(), 0, 0.8, PH);
  g.globalAlpha = 1;
  // soluk sepet örgüsü (sarı-krem)
  weave(g, 0, 0, PW, PH, [[246, 226, 150], [240, 218, 140], [252, 244, 214], [232, 222, 160]], rnd, 16, 1, 0.13);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(120,96,60,0.07)' : 'rgba(255,255,255,0.12)';
    g.fillRect(rnd() * PW, rnd() * PH, 1, 1);
  }
  return c;
}

// ───────────────────────── ön yüz çerçevesi: taç yaprak halkası ─────────────────────────
const F = 0.085;
/** Panelin kenarından dışarı doğru ışınsal taç yapraklar — kartın kendisi bir ayçiçeği gibi. */
function paintFrame(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(1888);
  const bw = F * PW;
  // zemin: turkuaz-yeşil arka plan notası (yaprak aralarından görünür)
  g.fillStyle = css([64, 128, 120]);
  g.fillRect(0, 0, PW, PH);
  weave(g, 0, 0, PW, PH, [TURQ, TURQ_L, [60, 128, 128], [96, 170, 150]], rnd, 11, 0.9);
  // panel kenarı boyunca örnek noktalar ve dış normaller
  const x0 = bw, y0 = bw, x1 = PW - bw, y1 = PH - bw, rc = bw * 0.6;
  const samples: [number, number, number][] = [];
  const step = 5.2;
  const push = (x: number, y: number, a: number): void => {
    samples.push([x, y, a]);
  };
  for (let x = x0 + rc; x < x1 - rc; x += step) push(x, y0, -Math.PI / 2);
  for (let y = y0 + rc; y < y1 - rc; y += step) push(x1, y, 0);
  for (let x = x1 - rc; x > x0 + rc; x -= step) push(x, y1, Math.PI / 2);
  for (let y = y1 - rc; y > y0 + rc; y -= step) push(x0, y, Math.PI);
  const corner = (cx: number, cy: number, a0: number): void => {
    for (let a = a0; a < a0 + Math.PI / 2; a += step / (rc + bw * 0.6)) push(cx + Math.cos(a) * rc, cy + Math.sin(a) * rc, a);
  };
  corner(x1 - rc, y0 + rc, -Math.PI / 2);
  corner(x1 - rc, y1 - rc, 0);
  corner(x0 + rc, y1 - rc, Math.PI / 2);
  corner(x0 + rc, y0 + rc, Math.PI);
  // iki kat: arka turuncu/aşı, ön krom/limon
  for (let layer = 0; layer < 2; layer++) {
    const order = samples.slice().sort(() => rnd() - 0.5);
    for (let k = 0; k < order.length; k++) {
      if (layer === 1 && k % 3 === 0) continue;
      const [x, y, a] = order[k];
      const aa = a + (rnd() - 0.5) * 0.3;
      const len = bw * (layer ? 0.95 + rnd() * 0.3 : 1.15 + rnd() * 0.3);
      petal(g, x - Math.cos(aa) * 3, y - Math.sin(aa) * 3, aa, len, 8.5 + rnd() * 3, jit(pick(layer ? PETAL_FRONT : PETAL_BACK, rnd), 14, rnd), rnd, (rnd() - 0.5) * 0.25);
    }
  }
  // panel kenarında aşı-kahve halka (yaprakların dibi, çekirdek diski gibi)
  for (const [x, y, a] of samples) {
    if (rnd() < 0.5) continue;
    brush(g, stroke(x - Math.cos(a) * 2, y - Math.sin(a) * 2, a + Math.PI / 2 + (rnd() - 0.5) * 0.6, 7, 0.3, 2), 3.4, jit(pick([BROWN, [150, 86, 28], ORANGE] as RGB[], rnd), 10, rnd), 0.6);
  }
  // boş köşelerde küçük ayçiçekleri
  sunflower(g, {x: PW - bw * 0.62, y: bw * 0.62, r: bw * 0.85, kind: 'bloom'}, rnd, 0.8);
  sunflower(g, {x: bw * 0.62, y: PH - bw * 0.62, r: bw * 0.85, kind: 'bloom'}, rnd, 0.8);
  return c;
}

// ───────────────────────── takım şekilleri ─────────────────────────
interface Shapes {
  heart: Path2D;
  spade: Path2D;
  diamond: Path2D;
  club: Path2D;
}
let SH: Shapes | null = null;
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
/** Sinek: tek dış kontur. */
function clubPath(): Path2D {
  const r = 0.245;
  const T: [number, number] = [0, -0.255], L: [number, number] = [-0.255, 0.075], R: [number, number] = [0.255, 0.075];
  const outerX = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), h = Math.sqrt(r * r - (d * d) / 4);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const p1: [number, number] = [mx - (dy / d) * h, my + (dx / d) * h], p2: [number, number] = [mx + (dy / d) * h, my - (dx / d) * h];
    return Math.hypot(...p1) > Math.hypot(...p2) ? p1 : p2;
  };
  const ang = (p: [number, number], c: [number, number]): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const tl = outerX(T, L), tr = outerX(T, R);
  const xs = 0.064, ys = R[1] + Math.sqrt(r * r - (xs - R[0]) ** 2);
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
const SUIT_TY: Record<Suit, number> = {H: -0.07, C: -0.04, S: 0.02, D: 0};

/**
 * Büyük takım işareti: içi ayçiçeği çekirdeği gibi Fibonacci sarmalıyla dizilmiş kalın boya lekeleri.
 * ♠♣: sıcak siyah-kahve; ♥♦: zincifre kırmızısı, turuncu kıvılcımlar.
 */
const SPR = 220;
function paintSuit(path: Path2D, red: boolean, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(SPR, SPR);
  const rnd = mulberry(seed);
  const k = SPR * 0.84, C = SPR / 2;
  const base: RGB = red ? [196, 34, 26] : [30, 24, 18];
  g.setTransform(k, 0, 0, k, C, C);
  g.fillStyle = css(base);
  g.fill(path);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const N = 520, cst = (SPR * 0.6) / Math.sqrt(N), PHI = 2.39996;
  const MAIN: RGB[] = red ? [[196, 34, 26], [214, 52, 32], [178, 22, 28], [206, 40, 40]] : [[30, 24, 18], [44, 34, 22], [24, 20, 16], [38, 30, 24]];
  const ARM: RGB[] = red ? [[230, 86, 40], [222, 70, 36]] : [[62, 52, 30], [56, 60, 34]];
  const SPARK: RGB[] = red ? [[246, 150, 50], [250, 196, 80]] : [[120, 84, 32], [96, 100, 44]];
  for (let i = N; i > 0; i--) {
    const rr = cst * Math.sqrt(i), th = i * PHI;
    const px = C + Math.cos(th) * rr, py = C + Math.sin(th) * rr * 1.05;
    const col = i % 21 < 3 ? (rnd() < 0.12 ? pick(SPARK, rnd) : pick(ARM, rnd)) : pick(MAIN, rnd);
    brush(g, stroke(px, py, th + 1.75, cst * 1.5, 0.35, 3), cst * 1.15, jit(col, 8, rnd), 0.9);
  }
  g.restore();
  g.setTransform(k, 0, 0, k, C, C);
  g.lineWidth = 2.4 / k;
  g.strokeStyle = css(darken(base, red ? 0.45 : 0.2));
  g.stroke(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// ───────────────────────── As: tepeden büyük ayçiçeği ─────────────────────────
const ACE_S = 320;
function paintAce(): HTMLCanvasElement {
  const S = ACE_S, C = S / 2, R = S * 0.48;
  const [c, g] = makeCanvas(S, S);
  const rnd = mulberry(31);
  // üç kat taç yaprak
  for (let layer = 0; layer < 3; layer++) {
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = ((i + layer * 0.33) / n) * Math.PI * 2 + (rnd() - 0.5) * 0.1;
      const len = R * (0.56 + rnd() * 0.1) * (1 - layer * 0.1);
      const pal = layer === 0 ? PETAL_BACK : PETAL_FRONT;
      const r0 = R * 0.42;
      petal(g, C + Math.cos(a) * r0, C + Math.sin(a) * r0, a + (rnd() - 0.5) * 0.12, len, R * 0.2, jit(pick(pal, rnd), 14, rnd), rnd, (rnd() - 0.5) * 0.22);
    }
  }
  // çekirdek halkası
  const disc = R * 0.5;
  g.fillStyle = css(DBROWN);
  g.beginPath();
  g.arc(C, C, disc, 0, Math.PI * 2);
  g.fill();
  const N = 260, cst = disc / Math.sqrt(N), PHI = 2.39996;
  for (let i = N; i > 0; i--) {
    const rr = cst * Math.sqrt(i), th = i * PHI;
    const u = rr / disc;
    const col: RGB = u > 0.86 ? pick([ORANGE, OCHRE, [190, 100, 30]] as RGB[], rnd) : i % 13 < 4 ? pick([[150, 86, 30], [176, 104, 34]] as RGB[], rnd) : pick([BROWN, DBROWN, [90, 52, 22]] as RGB[], rnd);
    brush(g, stroke(C + Math.cos(th) * rr, C + Math.sin(th) * rr, th + 1.9, cst * 1.3, 0.3, 2), cst * 1.3, jit(col, 10, rnd), 0.8);
  }
  // krem göbek (takım işareti buraya)
  const cr = R * 0.36;
  const cg = g.createRadialGradient(C - cr * 0.2, C - cr * 0.25, cr * 0.1, C, C, cr);
  cg.addColorStop(0, '#fdf6e2');
  cg.addColorStop(1, '#efdfb6');
  g.fillStyle = cg;
  g.beginPath();
  g.arc(C, C, cr, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    brush(g, stroke(C + Math.cos(a) * cr, C + Math.sin(a) * cr, a + Math.PI / 2, 9, 0.2, 2), 3.4, jit(pick([ORANGE, OCHRE, CHROME] as RGB[], rnd), 10, rnd), 0.6);
  }
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
// Papaz = taçlı tam açmış ayçiçeği, Kız = ayçiçeği goncası, Vale = ayçiçekli vazo (Pişti'nin gücü: altın çerçeve).
const CW = 240, CH = 350, PAD = 19;
const ORX = CW / 2 - PAD, ORY = CH / 2 - PAD;

function goldFill(g: Ctx, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff4c2');
  gr.addColorStop(0.35, '#f2c94e');
  gr.addColorStop(0.7, '#c98f22');
  gr.addColorStop(1, '#8a5a12');
  return gr;
}
/** Boyalı altın taç: bant + beş diş, uçlarda inci, bantta lacivert ve kırmızı taşlar. */
function crown(g: Ctx, cx: number, by: number, w: number, rnd: Rnd): void {
  const h = w * 0.6, bandH = w * 0.18, top = by - bandH;
  const tipsY = [0.62, 0.76, 1, 0.76, 0.62];
  const tips = [-0.54, -0.27, 0, 0.27, 0.54].map((u, i) => [cx + u * w, top - h * tipsY[i]]);
  const vals = [-0.4, -0.13, 0.13, 0.4].map((u, i) => [cx + u * w, top - h * [0.2, 0.32, 0.32, 0.2][i]]);
  const p = new Path2D();
  p.moveTo(cx - w * 0.5, by);
  p.lineTo(cx - w * 0.5, top);
  for (let i = 0; i < 5; i++) {
    p.lineTo(tips[i][0], tips[i][1]);
    if (i < 4) p.lineTo(vals[i][0], vals[i][1]);
  }
  p.lineTo(cx + w * 0.5, top);
  p.lineTo(cx + w * 0.5, by);
  p.closePath();
  g.fillStyle = goldFill(g, top - h, by);
  g.fill(p);
  g.save();
  g.clip(p);
  for (let i = 0; i < 40; i++) {
    const x = cx + (rnd() - 0.5) * w, y = by - rnd() * (h + bandH);
    brush(g, [x, y, x + 3 + rnd() * 5, y - 5 - rnd() * 7], 2 + rnd() * 2, rnd() < 0.5 ? [255, 236, 150] : [200, 140, 36], 0.4);
  }
  g.restore();
  g.lineWidth = 2.2;
  g.strokeStyle = css(ULTRA);
  g.stroke(p);
  g.beginPath();
  g.moveTo(cx - w * 0.5, top);
  g.lineTo(cx + w * 0.5, top);
  g.stroke();
  const jewel = (x: number, y: number, r: number, col: string): void => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 1.3;
    g.strokeStyle = '#3a2a10';
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
    g.fill();
  };
  for (const [x, y] of tips) jewel(x, y, w * 0.055, '#fff4d0');
  jewel(cx, by - bandH / 2, w * 0.07, '#c42519');
  jewel(cx - w * 0.3, by - bandH / 2, w * 0.05, '#2c4fb0');
  jewel(cx + w * 0.3, by - bandH / 2, w * 0.05, '#2c4fb0');
}

function courtBg(g: Ctx, cols: RGB[], rnd: Rnd, cell = 10): void {
  g.fillStyle = css(cols[0]);
  g.fillRect(0, 0, CW, CH);
  weave(g, 0, 0, CW, CH, cols, rnd, cell, 0.9);
}

function paintKing(g: Ctx, rnd: Rnd): void {
  courtBg(g, [TURQ, TURQ_L, [64, 140, 140], [110, 180, 160], [90, 160, 150]], rnd);
  const cx = CW / 2;
  // sap ve yapraklar
  stemPaint(g, [cx + 4, CH, cx + 2, CH * 0.82, cx - 2, CH * 0.66, cx, CH * 0.52], 7, rnd);
  leaf(g, cx, CH * 0.8, -2.5, 66, rnd);
  leaf(g, cx + 2, CH * 0.72, -0.5, 60, rnd);
  // büyük, hafif yana dönük ayçiçeği
  sunflower(g, {x: cx, y: CH * 0.5, r: 80, kind: 'bloom', squash: 0.88, tilt: -0.12}, rnd, 1.1);
  crown(g, cx, CH * 0.5 - 80 * 0.88 - 2, 86, rnd);
}

function paintQueen(g: Ctx, rnd: Rnd): void {
  // Van Gogh'un Paris ayçiçeklerindeki lacivert zemin
  courtBg(g, [[44, 70, 150], [58, 90, 170], [36, 58, 130], [80, 110, 180], [50, 80, 160]], rnd);
  const cx = CW / 2;
  stemPaint(g, [cx - 6, CH, cx - 4, CH * 0.8, cx + 4, CH * 0.62, cx + 2, CH * 0.46], 8, rnd);
  leaf(g, cx - 4, CH * 0.82, -2.55, 86, rnd);
  leaf(g, cx + 2, CH * 0.72, -0.5, 80, rnd);
  leaf(g, cx + 3, CH * 0.6, -2.95, 54, rnd);
  // gonca (önden, hafif eğik): iki kat yeşil, uçları kıvrık brakteler; ortada sıkı kapalı sarı yapraklar
  const bx = cx + 2, by = CH * 0.37, R = 72;
  g.save();
  g.translate(bx, by);
  g.scale(1, 0.86);
  const GR: RGB[] = [GREEN, OLIVE, [86, 128, 58], [110, 140, 60], OLIVE_D];
  for (let layer = 0; layer < 2; layer++) {
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = ((i + layer * 0.5) / n) * Math.PI * 2 + (rnd() - 0.5) * 0.12;
      const len = R * (layer ? 0.62 : 0.86) * (0.9 + rnd() * 0.2);
      petal(g, Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18, a, len, R * (layer ? 0.24 : 0.2), jit(pick(GR, rnd), 12, rnd), rnd, (rnd() < 0.5 ? -1 : 1) * (0.25 + rnd() * 0.15));
    }
  }
  // sıkı kapalı sarı yapraklar: içe doğru eğilen kısa darbeler
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    petal(g, Math.cos(a) * R * 0.36, Math.sin(a) * R * 0.36, a + Math.PI + 0.5, R * 0.3, R * 0.16, jit(pick(PETAL_FRONT, rnd), 12, rnd), rnd, 0.2);
  }
  g.fillStyle = css([92, 120, 40]);
  g.beginPath();
  g.arc(0, 0, R * 0.12, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, rr = rnd() * R * 0.11;
    brush(g, stroke(Math.cos(a) * rr, Math.sin(a) * rr, a + 1.8, 4, 0.3, 2), 2.6, jit(pick([OLIVE, [140, 150, 50], [176, 160, 50]] as RGB[], rnd), 10, rnd), 0.6);
  }
  g.restore();
}

function paintJack(g: Ctx, rnd: Rnd): void {
  courtBg(g, [[242, 206, 84], [248, 222, 120], [236, 194, 64], [250, 232, 150]], rnd);
  // masa
  g.fillStyle = css(OCHRE);
  g.fillRect(0, CH * 0.78, CW, CH);
  weave(g, 0, CH * 0.78, CW, CH * 0.3, [OCHRE, ORANGE, [214, 150, 50], [196, 120, 36]], rnd, 9, 0.9);
  brush(g, [0, CH * 0.78, CW, CH * 0.775], 2.6, ULTRA, 0.3);
  const cx = CW / 2;
  const heads: Head[] = [
    {x: cx - 6, y: CH * 0.2, r: 40, kind: 'bloom', squash: 0.9, tilt: 0.1},
    {x: cx - 64, y: CH * 0.33, r: 34, kind: 'bloom', squash: 0.8, tilt: -0.5},
    {x: cx + 58, y: CH * 0.3, r: 34, kind: 'seed', squash: 0.85, tilt: 0.4},
    {x: cx + 70, y: CH * 0.5, r: 30, kind: 'wilt', squash: 0.8, tilt: 0.9},
    {x: cx - 72, y: CH * 0.54, r: 28, kind: 'back', squash: 0.85, tilt: -0.3},
    {x: cx + 8, y: CH * 0.42, r: 32, kind: 'bloom', squash: 0.85, tilt: -0.1},
  ];
  const mouthY = CH * 0.6;
  for (const h of heads) stemPaint(g, [cx + (h.x - cx) * 0.1, mouthY, (cx + h.x) / 2, (mouthY + h.y) / 2 + 8, h.x, h.y], 4, rnd);
  leaf(g, cx - 10, mouthY - 6, -2.6, 46, rnd);
  leaf(g, cx + 10, mouthY - 4, -0.45, 44, rnd);
  for (const h of heads) sunflower(g, h, rnd, 0.9);
  vase(g, cx, CH * 0.88, 100, CH * 0.3, rnd, 1);
}

/** Saray kartı: elips içinde motif + taç yaprak halkası (Vale'de yaldızlı halka). */
function paintCourt(kind: 'K' | 'Q' | 'J', seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(seed);
  const cx = CW / 2, cy = CH / 2;
  const [mc, mg] = makeCanvas(CW, CH);
  if (kind === 'K') paintKing(mg, rnd);
  else if (kind === 'Q') paintQueen(mg, rnd);
  else paintJack(mg, rnd);
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, ORX + 2, ORY + 2, 0, 0, Math.PI * 2);
  g.clip();
  g.drawImage(mc, 0, 0);
  g.restore();
  // halka: elipsin çevresinde taç yapraklar (Vale'de yaldız tonlarında)
  const pal = kind === 'J' ? ([[250, 222, 120], [236, 190, 70], [255, 240, 170], [226, 176, 60]] as RGB[]) : PETAL_FRONT;
  const back = kind === 'J' ? ([[176, 120, 30], [200, 140, 40], [150, 100, 26]] as RGB[]) : PETAL_BACK;
  for (let layer = 0; layer < 2; layer++) {
    const n = 46;
    for (let i = 0; i < n; i++) {
      const t = ((i + layer * 0.5) / n) * Math.PI * 2;
      const ex = cx + Math.cos(t) * ORX, ey = cy + Math.sin(t) * ORY;
      const a = Math.atan2(Math.sin(t) / ORY, Math.cos(t) / ORX); // elips normali
      petal(g, ex - Math.cos(a) * 3, ey - Math.sin(a) * 3, a + (rnd() - 0.5) * 0.2, PAD * (layer ? 0.85 : 1.05) * (0.9 + rnd() * 0.2), 11 + rnd() * 3, jit(pick(layer ? pal : back, rnd), 12, rnd), rnd, (rnd() - 0.5) * 0.2);
    }
  }
  g.lineWidth = 2.6;
  g.strokeStyle = css(kind === 'J' ? [120, 70, 14] : ULTRA);
  g.beginPath();
  g.ellipse(cx, cy, ORX + 0.5, ORY + 0.5, 0, 0, Math.PI * 2);
  g.stroke();
  if (kind === 'J') {
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = cx + Math.cos(t) * (ORX + PAD * 0.45), y = cy + Math.sin(t) * (ORY + PAD * 0.45);
      g.fillStyle = i % 2 ? '#2c4fb0' : '#c42519';
      g.beginPath();
      g.arc(x, y, 4.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4a2c06';
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.arc(x - 1.3, y - 1.3, 1.3, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

// ───────────────────────── arka yüz: sarı zeminde ayçiçekli vazo ─────────────────────────
function paintBack(): HTMLCanvasElement {
  const W = PW, H = PH;
  const [c, g] = makeCanvas(W, H);
  const rnd = mulberry(1888);
  const s = 1;
  // duvar: açık krom sarısı sepet örgüsü
  g.fillStyle = css([242, 214, 96]);
  g.fillRect(0, 0, W, H);
  weave(g, 0, 0, W, H * 0.78, [[244, 218, 104], [250, 230, 130], [236, 204, 84], [248, 226, 150], [226, 212, 110]], rnd, 12, s);
  // masa: aşı-turuncu yatay darbeler
  const tableY = H * 0.77;
  g.fillStyle = css(OCHRE);
  g.fillRect(0, tableY, W, H - tableY);
  for (let i = 0; i < 320; i++) {
    const x = rnd() * W * 1.1 - 10, y = tableY + rnd() * (H - tableY);
    brush(g, stroke(x, y, (rnd() - 0.5) * 0.15, 16 + rnd() * 14, (rnd() - 0.5) * 0.1, 3), 4 + rnd() * 2.6, jit(pick([OCHRE, ORANGE, [214, 150, 50], [196, 120, 36], [232, 170, 60]] as RGB[], rnd), 12, rnd), 0.9);
  }
  brush(g, [0, tableY, W * 0.5, tableY - 1.5, W, tableY + 1], 3.4, ULTRA, 0.4);
  const cx = W * 0.5;
  const heads: Head[] = [
    {x: cx + 4, y: H * 0.18, r: 50, kind: 'bloom', squash: 0.92, tilt: 0.05},
    {x: cx - 92, y: H * 0.24, r: 42, kind: 'bloom', squash: 0.78, tilt: -0.5},
    {x: cx + 96, y: H * 0.22, r: 42, kind: 'seed', squash: 0.86, tilt: 0.35},
    {x: cx - 120, y: H * 0.45, r: 36, kind: 'wilt', squash: 0.82, tilt: -0.9},
    {x: cx + 116, y: H * 0.42, r: 40, kind: 'bloom', squash: 0.8, tilt: 0.6},
    {x: cx - 34, y: H * 0.36, r: 40, kind: 'seed', squash: 0.84, tilt: -0.15},
    {x: cx + 44, y: H * 0.38, r: 42, kind: 'bloom', squash: 0.86, tilt: 0.2},
    {x: cx - 78, y: H * 0.56, r: 30, kind: 'back', squash: 0.86, tilt: -0.3},
    {x: cx + 96, y: H * 0.6, r: 32, kind: 'wilt', squash: 0.75, tilt: 1.1},
    {x: cx - 2, y: H * 0.52, r: 30, kind: 'bloom', squash: 0.8, tilt: 0.05},
  ];
  const mouthY = H * 0.6;
  // saplar (vazonun ağzından)
  for (const h of heads) stemPaint(g, [cx + (h.x - cx) * 0.12, mouthY + 6, (cx + h.x) / 2 + (rnd() - 0.5) * 10, (mouthY + h.y) / 2 + 10, h.x, h.y], 5, rnd);
  leaf(g, cx - 18, mouthY - 10, -2.7, 64, rnd);
  leaf(g, cx + 16, mouthY - 8, -0.35, 60, rnd);
  leaf(g, cx + 30, mouthY - 50, -0.9, 48, rnd);
  for (const h of heads) sunflower(g, h, rnd, 1);
  vase(g, cx, H * 0.92, 150, H * 0.32, rnd, 1.1);
  // ultramarin boyalı çerçeve bandı + turuncu fileto
  const bw = W * 0.07;
  const edge: Field = (x, y) => {
    const dl = x, dr = W - x, dt = y, db = H - y;
    const m = Math.min(dl, dr, dt, db);
    return m === dl ? -Math.PI / 2 : m === dr ? Math.PI / 2 : m === dt ? 0 : Math.PI;
  };
  g.fillStyle = css([34, 52, 128]);
  g.fillRect(0, 0, W, bw);
  g.fillRect(0, H - bw, W, bw);
  g.fillRect(0, 0, bw, H);
  g.fillRect(W - bw, 0, bw, H);
  for (let i = 0; i < 560; i++) {
    const side = Math.floor(rnd() * 4);
    let x = 0, y = 0;
    const d = rnd() * (bw - 5) + 2.5;
    if (side === 0) [x, y] = [rnd() * W, d];
    else if (side === 1) [x, y] = [rnd() * W, H - d];
    else if (side === 2) [x, y] = [d, rnd() * H];
    else [x, y] = [W - d, rnd() * H];
    brush(g, trace(edge, x, y, 12 + rnd() * 10, 3), 4 + rnd() * 3, jit(pick([ULTRA, [30, 48, 120], [56, 84, 170], [36, 56, 136]] as RGB[], rnd), 10, rnd), 0.8);
  }
  g.strokeStyle = css(ORANGE);
  g.lineWidth = 2.4;
  g.strokeRect(bw, bw, W - 2 * bw, H - 2 * bw);
  g.strokeStyle = css([22, 30, 70]);
  g.lineWidth = 1;
  g.strokeRect(bw - 1.6, bw - 1.6, W - 2 * bw + 3.2, H - 2 * bw + 3.2);
  return c;
}

// ───────────────────────── önbellek ─────────────────────────
let backArt: HTMLCanvasElement | null = null;
let frameArt: HTMLCanvasElement | null = null;
let creamArt: HTMLCanvasElement | null = null;
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
  SH = {heart: heartPath(), spade: spadePath(), diamond: diamondPath(), club: clubPath()};
  backArt = paintBack();
  frameArt = paintFrame();
  creamArt = paintCream();
  aceArt = paintAce();
  (['S', 'H', 'D', 'C'] as Suit[]).forEach((s, i) => (suitArt[s] = paintSuit(suitPath(s), isRed(s), 500 + i)));
  courtArt[13] = paintCourt('K', 713);
  courtArt[12] = paintCourt('Q', 712);
  courtArt[11] = paintCourt('J', 711);
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
const BX = 0.035, BW = 0.33, BH = 0.6;
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
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.05 * w);
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
  g.lineWidth = 0.036 * w;
  g.strokeStyle = css(ULTRA);
  g.stroke(panel);
  g.lineWidth = 0.016 * w;
  g.strokeStyle = css(ORANGE);
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(creamArt!, 0, 0, w, h);
  g.restore();

  const cx = w / 2, cy = h / 2;
  if (rank === 1) {
    const d = 0.68 * w;
    g.drawImage(aceArt!, cx - d / 2, cy - d / 2, d, d);
    const sz = 0.23 * w, sd = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - sd / 2, cy - sd / 2, sd, sd);
  } else if (rank >= 11) {
    const art = courtArt[rank];
    const dw = 0.53 * w, dh = (dw * CH) / CW;
    if (art) g.drawImage(art, cx - dw / 2, cy - dh / 2, dw, dh);
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 + 0.005 * w);
      g.beginPath();
      g.arc(cx, ey, 0.06 * w, 0, Math.PI * 2);
      g.fillStyle = '#fbf3dc';
      g.fill();
      g.lineWidth = 0.014 * w;
      g.strokeStyle = rank === 11 ? '#c9952c' : css(ULTRA);
      g.stroke();
      drawPip(g, suit, cx, ey + 0.003 * w, 0.07 * w, isRed(suit) ? RED : INK);
    }
  } else {
    const sz = 0.46 * w, d = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - d / 2, cy - d / 2, d, d);
    const capH = 0.15 * w;
    drawRank(g, LABEL(rank), cx, cy + SUIT_TY[suit] * sz - capH / 2, capH, (suit === 'D' ? 0.2 : 0.24) * w, '#fbf3dc');
  }
  corners(g, w, h, suit, rank);
  g.restore();
  g.save();
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(40,26,8,0.7)';
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
  g.strokeStyle = 'rgba(14,20,50,0.85)';
  const edge = new Path2D();
  roundRect(edge, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, 0.08 * w - g.lineWidth / 2);
  g.stroke(edge);
  g.restore();
}

export const skin: Skin = {
  id: 'aycicegi',
  name: 'Ayçiçekleri',
  desc: 'Güneş sarısı yapraklar, kalın boya dokusu.',
  prepare(): Promise<void> {
    if (!ready) ready = doPrepare();
    return ready;
  },
  drawFace,
  drawBack,
};
