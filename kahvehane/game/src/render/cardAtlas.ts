// Kart yüzleri ve arka yüz: Canvas 2D ile prosedürel çizilen doku atlası.
// 8 × 7 hücre; hücre indeksi = kart id (0..51), 52 = arka yüz, 53..55 boş.
// Bütün çizim "tasarım birimi" uzayında yapılır: kart genişliği 100, yüksekliği 100 / 0.7.
import '@fontsource/inter/latin-800.css';
import '@fontsource/playfair-display/latin-900.css';
import {SUITS, type Suit} from '../core/types';

export const ATLAS_COLS = 8, ATLAS_ROWS = 7; // 56 hücre
export const CARD_ASPECT = 0.7; // genişlik / yükseklik (hücre ve 3B geometri)
export const BACK_INDEX = 52; // 52 = kart arkası; 53..55 kullanılmıyor (saydam)
export const CORNER_RADIUS = 0.075; // kart GENİŞLİĞİNİN oranı (3B geometrinin köşe yarıçapı)

export interface CardAtlas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
}

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | CanvasPattern;

// ───────────────────────── tasarım sabitleri ─────────────────────────
const UW = 100;
const UH = UW / CARD_ASPECT; // 142.857
const CX = UW / 2;
const CY = UH / 2;
const CR = CORNER_RADIUS * UW; // 7.5

const INK_RED = '#b0122c';
const INK_BLACK = '#171311';
const GOLD = '#c9a24a';
const GOLD_DARK = '#8a6420';
const BURGUNDY = '#5e1220';

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

// Köşe indeksi (sol üst; sağ altta 180° döndürülmüş kopyası)
const IDX = {
  family: SANS,
  weight: 800,
  cx: 15.8, // indeks sütununun ekseni
  left: 4.6, // geniş etiketin ("10") sol kenarı
  top: 6.2, // rakam/harf mürekkebinin üstü
  capH: 27.5, // rakam yüksekliği (≈ %27.5 kart genişliği)
  maxW: 23, // tek karakter için azami mürekkep genişliği
  maxW10: 26.6, // "10" için azami genişlik
  gap: 3.3, // rakam ile takım işareti arası
  pipW: 14.6, // indeks takım işareti genişliği
};

// Sayı kartlarındaki takım işaretleri alanı
const FIELD = {
  dx: 13, // yan sütunların merkezden uzaklığı
  top: 46, // en üst sıranın merkezi
  pipW: 12.9,
};

const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ───────────────────────── yardımcılar ─────────────────────────
function rrect(p: Path2D | Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.arcTo(x + w, y, x + w, y + rr, rr);
  p.lineTo(x + w, y + h - rr);
  p.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  p.lineTo(x + rr, y + h);
  p.arcTo(x, y + h, x, y + h - rr, rr);
  p.lineTo(x, y + rr);
  p.arcTo(x, y, x + rr, y, rr);
  p.closePath();
}

function insetPath(inset: number, r?: number): Path2D {
  const p = new Path2D();
  rrect(p, inset, inset, UW - inset * 2, UH - inset * 2, r ?? Math.max(0.5, CR - inset));
  return p;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0) ─────────────────────────
function heartPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.5);
  p.bezierCurveTo(-0.1, 0.37, -0.5, 0.13, -0.5, -0.16);
  p.bezierCurveTo(-0.5, -0.36, -0.37, -0.47, -0.245, -0.47);
  p.bezierCurveTo(-0.12, -0.47, -0.035, -0.4, 0, -0.29);
  p.bezierCurveTo(0.035, -0.4, 0.12, -0.47, 0.245, -0.47);
  p.bezierCurveTo(0.37, -0.47, 0.5, -0.36, 0.5, -0.16);
  p.bezierCurveTo(0.5, 0.13, 0.1, 0.37, 0, 0.5);
  p.closePath();
  return p;
}

function spadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.53);
  p.bezierCurveTo(0.1, -0.38, 0.5, -0.17, 0.5, 0.1);
  p.bezierCurveTo(0.5, 0.29, 0.37, 0.39, 0.235, 0.39);
  p.bezierCurveTo(0.13, 0.39, 0.06, 0.34, 0.03, 0.27);
  p.bezierCurveTo(0.045, 0.39, 0.1, 0.47, 0.21, 0.53);
  p.lineTo(-0.21, 0.53);
  p.bezierCurveTo(-0.1, 0.47, -0.045, 0.39, -0.03, 0.27);
  p.bezierCurveTo(-0.06, 0.34, -0.13, 0.39, -0.235, 0.39);
  p.bezierCurveTo(-0.37, 0.39, -0.5, 0.29, -0.5, 0.1);
  p.bezierCurveTo(-0.5, -0.17, -0.1, -0.38, 0, -0.53);
  p.closePath();
  return p;
}

function diamondPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.56);
  p.quadraticCurveTo(0.19, -0.25, 0.43, 0);
  p.quadraticCurveTo(0.19, 0.25, 0, 0.56);
  p.quadraticCurveTo(-0.19, 0.25, -0.43, 0);
  p.quadraticCurveTo(-0.19, -0.25, 0, -0.56);
  p.closePath();
  return p;
}

function clubPath(): Path2D {
  const p = new Path2D();
  const r = 0.232;
  const circle = (x: number, y: number, rad: number) => {
    p.moveTo(x + rad, y);
    p.arc(x, y, rad, 0, Math.PI * 2);
    p.closePath();
  };
  circle(0, -0.255, r);
  circle(-0.262, 0.07, r);
  circle(0.262, 0.07, r);
  circle(0, 0.03, 0.16);
  // sap: dairelerle aynı yönde (saat yönü) çizilir ki nonzero dolguda delik kalmasın
  p.moveTo(0.062, 0.02);
  p.bezierCurveTo(0.058, 0.3, 0.1, 0.45, 0.22, 0.53);
  p.lineTo(-0.22, 0.53);
  p.bezierCurveTo(-0.1, 0.45, -0.058, 0.3, -0.062, 0.02);
  p.closePath();
  return p;
}

/** Osmanlı lalesi (birim: yükseklik ≈ 1.2, merkez çanağın ortası). */
function tulipPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.5);
  p.bezierCurveTo(-0.26, 0.46, -0.4, 0.22, -0.34, -0.04);
  p.bezierCurveTo(-0.31, -0.24, -0.36, -0.42, -0.47, -0.58);
  p.bezierCurveTo(-0.3, -0.5, -0.18, -0.38, -0.13, -0.2);
  p.bezierCurveTo(-0.11, -0.42, -0.06, -0.58, 0, -0.7);
  p.bezierCurveTo(0.06, -0.58, 0.11, -0.42, 0.13, -0.2);
  p.bezierCurveTo(0.18, -0.38, 0.3, -0.5, 0.47, -0.58);
  p.bezierCurveTo(0.36, -0.42, 0.31, -0.24, 0.34, -0.04);
  p.bezierCurveTo(0.4, 0.22, 0.26, 0.46, 0, 0.5);
  p.closePath();
  return p;
}

/** Sekiz köşeli yıldız (iki kare), dış yarıçap 1. */
function star8Path(p: Path2D, cx: number, cy: number, R: number, rot = 0): void {
  const rin = R * (Math.SQRT1_2 / Math.cos(Math.PI / 8));
  for (let k = 0; k < 16; k++) {
    const a = rot + (k * Math.PI) / 8 - Math.PI / 2;
    const rad = k % 2 === 0 ? R : rin;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (k === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
}

interface Shapes {
  suit: Record<Suit, Path2D>;
  tulip: Path2D;
}

function makeShapes(): Shapes {
  return {
    suit: {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()},
    tulip: tulipPath(),
  };
}

// ───────────────────────── yazı ölçümü ─────────────────────────
interface Label {
  font: string;
  glyphs: {ch: string; x: number}[];
  scaleX: number;
  width: number; // ölçeklenmiş mürekkep genişliği
}

function layoutLabel(ctx: Ctx, text: string, family: string, weight: number, capH: number, maxW: number, track: number): Label {
  ctx.font = `${weight} 100px ${family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // yükseklik: karakterlerin baseline üstündeki mürekkebi (Q'nun kuyruğu hariç)
  let asc = 0;
  for (const ch of text) asc = Math.max(asc, ctx.measureText(ch).actualBoundingBoxAscent);
  if (!(asc > 1)) asc = 72;
  const size = (capH / asc) * 100;
  const font = `${weight} ${size.toFixed(3)}px ${family}`;
  ctx.font = font;
  const parts = [...text].map((ch) => {
    const m = ctx.measureText(ch);
    return {ch, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight};
  });
  const gap = track * capH;
  const total = parts.reduce((s, q) => s + q.l + q.r, 0) + gap * (parts.length - 1);
  const scaleX = Math.min(1, maxW / total);
  let x = -total / 2;
  const glyphs = parts.map((q) => {
    const g = {ch: q.ch, x: x + q.l};
    x += q.l + q.r + gap;
    return g;
  });
  return {font, glyphs, scaleX, width: total * scaleX};
}

function drawLabel(ctx: Ctx, L: Label, cx: number, baseline: number, fill: Fill): void {
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.scale(L.scaleX, 1);
  ctx.font = L.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill;
  for (const g of L.glyphs) ctx.fillText(g.ch, g.x, 0);
  ctx.restore();
}

// ───────────────────────── çizim bağlamı ─────────────────────────
interface Kit {
  ctx: Ctx;
  shapes: Shapes;
  paths: {
    border3_1: Path2D;
    border3_3: Path2D;
    border4_5: Path2D;
    archOuter: Path2D;
    archInner: Path2D;
    archHair: Path2D;
    rosettes: Path2D;
  };
  labels: Label[]; // rank → indeks etiketi
  courtLetters: Record<string, Label>;
  wordmark: Label;
  ink: Record<'red' | 'black', CanvasGradient>;
}

function isRed(s: Suit): boolean {
  return s === 'H' || s === 'D';
}

function pip(k: Kit, suit: Suit, x: number, y: number, w: number, flip = false, fill?: Fill): void {
  const {ctx} = k;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.rotate(Math.PI);
  ctx.scale(w, w);
  ctx.fillStyle = fill ?? k.ink[isRed(suit) ? 'red' : 'black'];
  ctx.fill(k.shapes.suit[suit]);
  ctx.restore();
}

function goldGradient(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fbe9a8');
  g.addColorStop(0.35, '#e2bd5e');
  g.addColorStop(0.7, '#b98a32');
  g.addColorStop(1, '#8a6420');
  return g;
}

// ───────────────────────── kâğıt zemin ─────────────────────────
function makeGrainTile(): HTMLCanvasElement {
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  const img = g.createImageData(n, n);
  const d = img.data;
  const rnd = mulberry32(0x5eed1e);
  for (let i = 0; i < n * n; i++) {
    const v = rnd();
    const o = i * 4;
    if (v < 0.5) {
      d[o] = 96; d[o + 1] = 66; d[o + 2] = 30;
      d[o + 3] = Math.round((0.5 - v) * 44);
    } else {
      d[o] = 255; d[o + 1] = 252; d[o + 2] = 240;
      d[o + 3] = Math.round((v - 0.5) * 40);
    }
  }
  g.putImageData(img, 0, 0);
  // seyrek lifler
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = rnd() * n, y = rnd() * n, a = rnd() * Math.PI, l = 3 + rnd() * 7;
    g.strokeStyle = `rgba(120,86,40,${(0.05 + rnd() * 0.06).toFixed(3)})`;
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

/** Kâğıt dokusu: bir hücre boyutunda (2 px taşmalı) bir kez çizilir, her yüze tam piksel konumda kopyalanır. */
function makePaperTile(cw: number, ch: number, grain: HTMLCanvasElement): HTMLCanvasElement {
  const w = Math.ceil(cw) + 2, h = Math.ceil(ch) + 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  const lg = g.createLinearGradient(0, 0, cw * 0.35, ch);
  lg.addColorStop(0, '#f8f1e0');
  lg.addColorStop(1, '#efe3c9');
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  const v = g.createRadialGradient(cw * 0.45, ch * 0.4, cw * 0.2, cw * 0.5, ch * 0.5, ch * 0.75);
  v.addColorStop(0, 'rgba(255,250,236,0.35)');
  v.addColorStop(0.6, 'rgba(255,250,236,0)');
  v.addColorStop(1, 'rgba(120,80,30,0.10)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.7;
  g.fillStyle = g.createPattern(grain, 'repeat')!;
  g.fillRect(0, 0, w, h);
  return c;
}

function innerBorder(k: Kit, jack: boolean): void {
  const {ctx} = k;
  if (jack) {
    ctx.strokeStyle = 'rgba(176,132,46,0.95)';
    ctx.lineWidth = 0.9;
    ctx.stroke(k.paths.border3_1);
    ctx.strokeStyle = 'rgba(176,132,46,0.7)';
    ctx.lineWidth = 0.35;
    ctx.stroke(k.paths.border4_5);
  } else {
    ctx.strokeStyle = 'rgba(150,118,62,0.55)';
    ctx.lineWidth = 0.5;
    ctx.stroke(k.paths.border3_3);
  }
}

// ───────────────────────── sayı kartları ─────────────────────────
// [sütun (-1, 0, 1), satır (0 = üst … 1 = alt)]
const PIP_LAYOUT: Record<number, [number, number][]> = {
  2: [[0, 0], [0, 1]],
  3: [[0, 0], [0, 0.5], [0, 1]],
  4: [[-1, 0], [1, 0], [-1, 1], [1, 1]],
  5: [[-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  6: [[-1, 0], [1, 0], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  7: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  8: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [0, 0.75], [-1, 1], [1, 1]],
  9: [[-1, 0], [1, 0], [-1, 1 / 3], [1, 1 / 3], [0, 0.5], [-1, 2 / 3], [1, 2 / 3], [-1, 1], [1, 1]],
  10: [[-1, 0], [1, 0], [0, 1 / 6], [-1, 1 / 3], [1, 1 / 3], [-1, 2 / 3], [1, 2 / 3], [0, 5 / 6], [-1, 1], [1, 1]],
};

function archWindow(k: Kit): void {
  // sayı kartlarında, saray kartlarındaki kemerin ince altın çizgi hâli
  const {ctx} = k;
  ctx.save();
  ctx.fillStyle = 'rgba(201,162,74,0.07)';
  ctx.fill(k.paths.archOuter);
  ctx.strokeStyle = 'rgba(170,128,48,0.7)';
  ctx.lineWidth = 0.55;
  ctx.stroke(k.paths.archOuter);
  ctx.strokeStyle = 'rgba(170,128,48,0.42)';
  ctx.lineWidth = 0.28;
  ctx.stroke(k.paths.archHair);
  ctx.fillStyle = 'rgba(170,128,48,0.8)';
  for (const y of [9.6, UH - 9.6]) {
    ctx.beginPath();
    ctx.arc(CX, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function numberCard(k: Kit, rank: number, suit: Suit): void {
  archWindow(k);
  const top = FIELD.top, bot = UH - FIELD.top;
  for (const [c, r] of PIP_LAYOUT[rank]) {
    const x = CX + c * FIELD.dx;
    const y = top + (bot - top) * r;
    pip(k, suit, x, y, FIELD.pipW, r > 0.5 + 1e-6);
  }
}

// ───────────────────────── aslar ─────────────────────────
function aceCard(k: Kit, suit: Suit): void {
  const {ctx} = k;
  if (suit === 'S') return aceOfSpades(k);
  // arkada ince altın sekiz köşeli yıldız (arka yüzle aynı dil)
  ctx.save();
  const st = new Path2D();
  star8Path(st, CX, CY, 32);
  ctx.fillStyle = 'rgba(201,162,74,0.08)';
  ctx.fill(st);
  ctx.strokeStyle = 'rgba(176,138,60,0.6)';
  ctx.lineWidth = 0.5;
  ctx.stroke(st);
  const st2 = new Path2D();
  star8Path(st2, CX, CY, 28.6);
  ctx.lineWidth = 0.28;
  ctx.stroke(st2);
  ctx.fillStyle = 'rgba(176,138,60,0.75)';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * 35, CY + Math.sin(a) * 35, 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  pip(k, suit, CX, CY + (suit === 'C' ? 0.5 : 0), suit === 'D' ? 41 : 38);
}

function scroll(ctx: Ctx, mirror: boolean): void {
  // Sol taraftaki bir C-kıvrımı; mirror = sağ taraf
  ctx.save();
  if (mirror) {
    ctx.translate(UW, 0);
    ctx.scale(-1, 1);
  }
  ctx.beginPath();
  ctx.moveTo(40, 34);
  ctx.bezierCurveTo(26, 34, 18, 46, 19, 60);
  ctx.bezierCurveTo(20, 74, 28, 84, 37, 90);
  ctx.bezierCurveTo(31, 92, 26, 97, 27.5, 102);
  ctx.bezierCurveTo(29, 106, 34.5, 105.5, 34.5, 101.5);
  ctx.bezierCurveTo(34.5, 98.8, 31.3, 98.6, 30.8, 100.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, 34);
  ctx.bezierCurveTo(42.5, 30.5, 39.5, 26.2, 36.4, 27.6);
  ctx.bezierCurveTo(34.2, 28.8, 35.2, 32, 37.6, 31.2);
  ctx.stroke();
  // küçük yapraklar
  const leaf = (x: number, y: number, a: number, l: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0);
    ctx.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  leaf(19.6, 52, -2.5, 6.5);
  leaf(19.3, 66, 2.7, 6.5);
  leaf(23, 78, 2.3, 5.5);
  ctx.restore();
}

function aceOfSpades(k: Kit): void {
  const {ctx} = k;
  // süslü grup biraz küçültülüp yukarı alınır; altta yazıya yer kalır
  ctx.save();
  ctx.translate(CX, 64.5);
  ctx.scale(0.9, 0.9);
  ctx.translate(-CX, -(CY - 4));
  // arkada soluk altın 8 köşeli yıldız rozeti
  ctx.save();
  const st = new Path2D();
  star8Path(st, CX, CY - 3, 33);
  ctx.fillStyle = 'rgba(201,162,74,0.13)';
  ctx.fill(st);
  ctx.strokeStyle = 'rgba(170,128,48,0.6)';
  ctx.lineWidth = 0.55;
  ctx.stroke(st);
  const st2 = new Path2D();
  star8Path(st2, CX, CY - 3, 29.5);
  ctx.lineWidth = 0.3;
  ctx.stroke(st2);
  ctx.restore();

  // kıvrımlar
  ctx.save();
  ctx.strokeStyle = INK_BLACK;
  ctx.fillStyle = GOLD_DARK;
  ctx.lineWidth = 1.05;
  ctx.lineCap = 'round';
  scroll(ctx, false);
  scroll(ctx, true);
  ctx.restore();

  // büyük maça
  const sw = 44, sy = CY - 4;
  pip(k, 'S', CX, sy, sw);
  // fildişi iç çizgi
  ctx.save();
  ctx.translate(CX, sy - 0.6);
  ctx.scale(sw * 0.86, sw * 0.86);
  ctx.strokeStyle = 'rgba(242,217,140,0.9)';
  ctx.lineWidth = 0.55 / (sw * 0.86);
  ctx.stroke(k.shapes.suit.S);
  ctx.restore();
  // içte altın lale
  ctx.save();
  ctx.translate(CX, sy - 2.5);
  ctx.scale(13, 13);
  ctx.fillStyle = goldGradient(ctx, -0.7, 0.5);
  ctx.fill(k.shapes.tulip);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(CX, sy + 4);
  ctx.bezierCurveTo(CX - 0.5, sy + 7, CX + 0.5, sy + 9, CX, sy + 11);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // yazı: KAHVEHANE
  const by = 112;
  const hw = k.wordmark.width / 2 + 2.2;
  ctx.save();
  ctx.strokeStyle = 'rgba(150,112,40,0.85)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(CX - hw, by - 6.2);
  ctx.lineTo(CX + hw, by - 6.2);
  ctx.moveTo(CX - hw, by + 2.4);
  ctx.lineTo(CX + hw, by + 2.4);
  ctx.stroke();
  ctx.fillStyle = GOLD_DARK;
  for (const x of [CX - hw - 2, CX + hw + 2]) {
    ctx.beginPath();
    ctx.moveTo(x, by - 3.9);
    ctx.lineTo(x + 1.2, by - 1.9);
    ctx.lineTo(x, by + 0.1);
    ctx.lineTo(x - 1.2, by - 1.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  drawLabel(ctx, k.wordmark, CX, by, INK_BLACK);
}

// ───────────────────────── papaz / kız / vale ─────────────────────────
interface CourtStyle {
  top: string;
  mid: string;
  bot: string;
  pattern: string;
  frame: Fill;
  letter: 'gold' | 'dark';
}

function archPath(inset: number): Path2D {
  const hw = 24.4 - inset;
  const sh = 15.5;
  const ap = 12.4 + inset * 1.25;
  const p = new Path2D();
  const k1 = 24, k2 = 5.8, k3 = 11.5;
  p.moveTo(CX - hw, CY + sh);
  p.lineTo(CX - hw, CY - sh);
  p.bezierCurveTo(CX - hw, CY - sh - k1, CX - k2, ap + k3, CX, ap);
  p.bezierCurveTo(CX + k2, ap + k3, CX + hw, CY - sh - k1, CX + hw, CY - sh);
  p.lineTo(CX + hw, CY + sh);
  p.bezierCurveTo(CX + hw, CY + sh + k1, CX + k2, UH - ap - k3, CX, UH - ap);
  p.bezierCurveTo(CX - k2, UH - ap - k3, CX - hw, CY + sh + k1, CX - hw, CY + sh);
  p.closePath();
  return p;
}

function crown(ctx: Ctx, cx: number, cy: number, s: number, gold: Fill): void {
  // Papaz tacı: beş uçlu, mücevherli
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  const p = new Path2D();
  p.moveTo(-11, 4);
  p.lineTo(-13.2, -6.5);
  p.quadraticCurveTo(-9.5, -2.5, -7.2, -1.6);
  p.lineTo(-6.6, -9.2);
  p.quadraticCurveTo(-3.6, -3.8, -1.9, -3.2);
  p.lineTo(0, -12.5);
  p.lineTo(1.9, -3.2);
  p.quadraticCurveTo(3.6, -3.8, 6.6, -9.2);
  p.lineTo(7.2, -1.6);
  p.quadraticCurveTo(9.5, -2.5, 13.2, -6.5);
  p.lineTo(11, 4);
  p.closePath();
  ctx.fillStyle = gold;
  ctx.fill(p);
  ctx.strokeStyle = 'rgba(40,20,6,0.85)';
  ctx.lineWidth = 0.55;
  ctx.stroke(p);
  const band = new Path2D();
  rrect(band, -12.2, 3, 24.4, 5.2, 1.4);
  ctx.fill(band);
  ctx.stroke(band);
  // inci uçlar
  ctx.fillStyle = '#fbf3dc';
  ctx.strokeStyle = 'rgba(40,20,6,0.7)';
  ctx.lineWidth = 0.35;
  for (const [x, y, r] of [[-13.2, -7.2, 1.25], [-6.6, -9.9, 1.15], [6.6, -9.9, 1.15], [13.2, -7.2, 1.25]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // tepe mücevheri
  ctx.fillStyle = '#c0182f';
  ctx.beginPath();
  ctx.moveTo(0, -15.6);
  ctx.lineTo(1.5, -13.3);
  ctx.lineTo(0, -11.2);
  ctx.lineTo(-1.5, -13.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // bant mücevherleri
  ctx.fillStyle = '#c0182f';
  ctx.beginPath();
  ctx.ellipse(0, 5.6, 2.1, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1f6f78';
  for (const x of [-7, 7]) {
    ctx.beginPath();
    ctx.arc(x, 5.6, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function tulipCrown(k: Kit, cx: number, cy: number, s: number, gold: Fill): void {
  // Kız: lale taç
  const {ctx} = k;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(40,20,6,0.85)';
  ctx.lineWidth = 0.5;
  const tul = (x: number, y: number, sc: number, rot: number, inner: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.fillStyle = gold;
    ctx.fill(k.shapes.tulip);
    ctx.lineWidth = 0.5 / sc;
    ctx.stroke(k.shapes.tulip);
    // iç taç yaprağı
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.moveTo(0, 0.32);
    ctx.bezierCurveTo(-0.1, 0.1, -0.08, -0.3, 0, -0.5);
    ctx.bezierCurveTo(0.08, -0.3, 0.1, 0.1, 0, 0.32);
    ctx.fill();
    ctx.restore();
  };
  // yan yapraklar (saz)
  ctx.fillStyle = gold;
  for (const m of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(m * 2, 3);
    ctx.bezierCurveTo(m * 8, 1, m * 13, -3, m * 15, -9);
    ctx.bezierCurveTo(m * 11, -5, m * 7, -2.5, m * 2, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  tul(-7.6, -3.6, 8.2, -0.32, '#c0182f');
  tul(7.6, -3.6, 8.2, 0.32, '#c0182f');
  tul(0, -6.8, 11.5, 0, '#c0182f');
  const band = new Path2D();
  rrect(band, -11, 2.4, 22, 5, 2.5);
  ctx.fillStyle = gold;
  ctx.fill(band);
  ctx.stroke(band);
  ctx.fillStyle = '#fbf3dc';
  ctx.lineWidth = 0.3;
  for (const x of [-7.2, -3.6, 0, 3.6, 7.2]) {
    ctx.beginPath();
    ctx.arc(x, 4.9, 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function turbanCap(ctx: Ctx, cx: number, cy: number, s: number, gold: Fill): void {
  // Vale: sorguçlu sarık (kırmızı külahın çevresine sarılmış beyaz sarık)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  const edge = 'rgba(40,20,6,0.85)';
  ctx.strokeStyle = edge;
  ctx.lineWidth = 0.55;
  // kırmızı külah (tepe)
  const cap = new Path2D();
  cap.moveTo(-6.2, -5);
  cap.bezierCurveTo(-6.4, -11.5, 6.4, -11.5, 6.2, -5);
  cap.closePath();
  const cg = ctx.createLinearGradient(0, -11, 0, -5);
  cg.addColorStop(0, '#d0233f');
  cg.addColorStop(1, '#7c0d20');
  ctx.fillStyle = cg;
  ctx.fill(cap);
  ctx.stroke(cap);
  // sarık gövdesi
  const body = new Path2D();
  body.moveTo(-13.4, 3.2);
  body.bezierCurveTo(-15.2, -3.5, -10.5, -8.2, 0, -7.6);
  body.bezierCurveTo(10.5, -8.2, 15.2, -3.5, 13.4, 3.2);
  body.bezierCurveTo(9, 7.4, -9, 7.4, -13.4, 3.2);
  body.closePath();
  const tg = ctx.createLinearGradient(-8, -8, 6, 7);
  tg.addColorStop(0, '#fffbf1');
  tg.addColorStop(0.6, '#efe3c8');
  tg.addColorStop(1, '#cdb88f');
  ctx.fillStyle = tg;
  ctx.fill(body);
  // çapraz sarım kıvrımları
  ctx.save();
  ctx.clip(body);
  ctx.strokeStyle = 'rgba(140,104,48,0.75)';
  ctx.lineWidth = 0.55;
  for (let i = -4; i <= 4; i++) {
    const x = i * 3.6;
    ctx.beginPath();
    ctx.moveTo(x - 7, 8);
    ctx.bezierCurveTo(x - 3.5, 2, x + 1, -3, x + 6, -9);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.35;
  for (let i = -4; i <= 4; i++) {
    const x = i * 3.6 + 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 7, 8);
    ctx.bezierCurveTo(x - 3.5, 2, x + 1, -3, x + 6, -9);
    ctx.stroke();
  }
  ctx.restore();
  ctx.stroke(body);
  // sorguç: broştan yükselen tüy
  const plume = new Path2D();
  plume.moveTo(0.4, -6);
  plume.bezierCurveTo(-2.2, -11, -1.4, -17, 3.6, -22.5);
  plume.bezierCurveTo(3.4, -18.5, 5.8, -16.5, 6.4, -13.2);
  plume.bezierCurveTo(5.4, -10.4, 2.8, -8.6, 1.8, -6);
  plume.closePath();
  const pg = ctx.createLinearGradient(0, -22, 0, -6);
  pg.addColorStop(0, '#2f4a8a');
  pg.addColorStop(1, '#101c3c');
  ctx.fillStyle = pg;
  ctx.fill(plume);
  ctx.stroke(plume);
  ctx.strokeStyle = 'rgba(242,217,140,0.9)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(1.1, -6.5);
  ctx.bezierCurveTo(-0.6, -11, 0.2, -16.5, 3.6, -22);
  ctx.stroke();
  // broş
  ctx.strokeStyle = edge;
  ctx.lineWidth = 0.45;
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(0.8, -3.6, 2.9, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1f6f78';
  ctx.beginPath();
  ctx.ellipse(0.8, -3.6, 1.45, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(0.3, -4.3, 0.45, 0, Math.PI * 2);
  ctx.fill();
  // inci dizisi
  ctx.fillStyle = '#fbf3dc';
  ctx.strokeStyle = 'rgba(40,20,6,0.6)';
  ctx.lineWidth = 0.25;
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const x = i * 3.2 + 0.8;
    const y = -3.6 + Math.abs(i) * 0.9 + i * i * 0.05;
    ctx.beginPath();
    ctx.arc(x, y + 0.4, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function rosetteLattice(): Path2D {
  // panel deseni: çapraz ızgarada dört yapraklı küçük çiçekler (tek path)
  const p = new Path2D();
  const sp = 7;
  for (let j = 0; j < UH / (sp * 0.9) + 1; j++) {
    for (let i = 0; i < UW / sp + 1; i++) {
      const x = CX + (i - Math.round(UW / sp / 2)) * sp + (j % 2 ? sp / 2 : 0);
      const y = CY + (j - Math.round(UH / (sp * 0.9) / 2)) * sp * 0.9;
      if (Math.abs(x - CX) > 26 || y < 10 || y > UH - 10) continue;
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2, r = 1.9;
        p.moveTo(x, y);
        p.quadraticCurveTo(x + Math.cos(a - 0.6) * r, y + Math.sin(a - 0.6) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
        p.quadraticCurveTo(x + Math.cos(a + 0.6) * r, y + Math.sin(a + 0.6) * r, x, y);
      }
    }
  }
  return p;
}

const COURT_STYLES: Record<number, CourtStyle> = {
  13: {top: '#8a1d33', mid: '#6a1326', bot: '#3c0913', pattern: 'rgba(230,190,100,0.16)', frame: GOLD, letter: 'gold'},
  12: {top: '#2b4384', mid: '#1c2f62', bot: '#0d1838', pattern: 'rgba(230,190,100,0.16)', frame: GOLD, letter: 'gold'},
  11: {top: '#e9c66e', mid: '#c99a3e', bot: '#8f6522', pattern: 'rgba(80,40,6,0.16)', frame: '#7a5418', letter: 'dark'},
};

function courtCard(k: Kit, rank: number, suit: Suit): void {
  const {ctx} = k;
  const st = COURT_STYLES[rank];
  const jack = rank === 11;
  const outer = k.paths.archOuter;
  const inner = k.paths.archInner;

  // yumuşak gölge (shadowBlur yerine ucuz katmanlı çizgiler)
  ctx.save();
  ctx.translate(0, 0.7);
  ctx.strokeStyle = 'rgba(80,45,15,0.07)';
  ctx.lineWidth = 3.6;
  ctx.stroke(outer);
  ctx.lineWidth = 2.2;
  ctx.stroke(outer);
  ctx.restore();

  // zemin
  ctx.save();
  ctx.clip(outer);
  const g = ctx.createLinearGradient(0, 12, 0, UH - 12);
  g.addColorStop(0, st.top);
  g.addColorStop(0.45, st.mid);
  g.addColorStop(1, st.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, UW, UH);
  // desen: çapraz ızgarada dört yapraklı çiçekler
  ctx.fillStyle = st.pattern;
  ctx.fill(k.paths.rosettes);
  // lamba ışığı
  const lg = ctx.createRadialGradient(CX - 6, CY - 26, 2, CX, CY - 10, 60);
  lg.addColorStop(0, jack ? 'rgba(255,248,215,0.45)' : 'rgba(255,225,170,0.22)');
  lg.addColorStop(1, 'rgba(255,225,170,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, UW, UH);
  ctx.restore();

  // çerçeve
  ctx.save();
  ctx.strokeStyle = st.frame;
  ctx.lineWidth = jack ? 1.5 : 1.25;
  ctx.stroke(outer);
  ctx.lineWidth = 0.45;
  ctx.strokeStyle = jack ? 'rgba(90,56,12,0.85)' : 'rgba(201,162,74,0.85)';
  ctx.stroke(inner);
  ctx.restore();

  const gold = goldGradient(ctx, 24, 50);
  // amblem
  if (rank === 13) crown(ctx, CX, 40.5, 0.98, gold);
  else if (rank === 12) tulipCrown(k, CX, 41.5, 0.96, gold);
  else turbanCap(ctx, CX, 42, 1.0, gold);

  // büyük harf
  const L = k.courtLetters[RANK_LABEL[rank]];
  const base = CY + 15.5;
  ctx.save();
  // harf gölgesi: kaydırılmış koyu kopya
  drawLabel(ctx, L, CX + 0.25, base + 0.8, st.letter === 'gold' ? 'rgba(10,2,4,0.45)' : 'rgba(90,60,10,0.4)');
  if (st.letter === 'gold') {
    drawLabel(ctx, L, CX, base, goldGradient(ctx, base - 30, base));
  } else {
    const dg = ctx.createLinearGradient(0, base - 30, 0, base);
    dg.addColorStop(0, '#4a0f1c');
    dg.addColorStop(1, '#22060c');
    drawLabel(ctx, L, CX, base, dg);
  }
  ctx.restore();

  // takım madalyonu
  const my = 105.5;
  ctx.save();
  ctx.fillStyle = '#f6eedb';
  ctx.strokeStyle = jack ? '#6d4a12' : GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, my, 8.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  pip(k, suit, CX, my + (suit === 'C' ? 0.2 : 0.3), suit === 'D' ? 11 : 10.2);

  // kemer uçlarında alem (lale goncası)
  ctx.save();
  ctx.fillStyle = jack ? '#8a6420' : GOLD;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    if (i === 1) {
      ctx.translate(UW, UH);
      ctx.rotate(Math.PI);
    }
    ctx.beginPath();
    ctx.arc(CX, 10.6, 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(CX, 4.6);
    ctx.bezierCurveTo(CX + 1.6, 6.4, CX + 1.6, 8.2, CX, 9.3);
    ctx.bezierCurveTo(CX - 1.6, 8.2, CX - 1.6, 6.4, CX, 4.6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX, 17.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // vale parıltısı
  if (jack) sparkle(ctx, IDX.cx + 11.5, IDX.top + 1.5, 3.6);
}

function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = '#c99a3a';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.62, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.62, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

// ───────────────────────── kart arkası ─────────────────────────
function cardBack(k: Kit): void {
  const {ctx} = k;
  // zemin
  const g = ctx.createRadialGradient(CX, CY, 6, CX, CY, 92);
  g.addColorStop(0, '#7a1a2c');
  g.addColorStop(0.55, BURGUNDY);
  g.addColorStop(1, '#3a0912');
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, UW + 2, UH + 2);

  const inner = insetPath(8.2, 2.5);
  // desen: sekiz köşeli yıldız kafesi
  ctx.save();
  ctx.clip(inner);
  const sp = 12.5;
  const R = sp * 0.4;
  const stars = new Path2D();
  const links = new Path2D();
  const small = new Path2D();
  const nx = Math.ceil(UW / sp / 2) + 1, ny = Math.ceil(UH / sp / 2) + 1;
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const x = CX + i * sp, y = CY + j * sp;
      star8Path(stars, x, y, R);
      // komşu yıldızlara bağlar
      links.moveTo(x + R, y);
      links.lineTo(x + sp - R, y);
      links.moveTo(x, y + R);
      links.lineTo(x, y + sp - R);
      // hücre merkezinde küçük dörtlü yıldız
      const mx = x + sp / 2, my = y + sp / 2;
      const d = R * Math.SQRT1_2;
      const q = sp * 0.16;
      small.moveTo(mx, my - q);
      small.lineTo(mx + q * 0.4, my - q * 0.4);
      small.lineTo(mx + q, my);
      small.lineTo(mx + q * 0.4, my + q * 0.4);
      small.lineTo(mx, my + q);
      small.lineTo(mx - q * 0.4, my + q * 0.4);
      small.lineTo(mx - q, my);
      small.lineTo(mx - q * 0.4, my - q * 0.4);
      small.closePath();
      links.moveTo(x + d, y + d);
      links.lineTo(mx - q * 0.4, my - q * 0.4);
      links.moveTo(x + sp - d, y + d);
      links.lineTo(mx + q * 0.4, my - q * 0.4);
      links.moveTo(x + d, y + sp - d);
      links.lineTo(mx - q * 0.4, my + q * 0.4);
      links.moveTo(x + sp - d, y + sp - d);
      links.lineTo(mx + q * 0.4, my + q * 0.4);
    }
  }
  ctx.fillStyle = 'rgba(232,180,110,0.07)';
  ctx.fill(stars);
  ctx.strokeStyle = 'rgba(214,174,86,0.55)';
  ctx.lineWidth = 0.55;
  ctx.stroke(stars);
  ctx.strokeStyle = 'rgba(214,174,86,0.42)';
  ctx.lineWidth = 0.45;
  ctx.stroke(links);
  ctx.fillStyle = 'rgba(214,174,86,0.5)';
  ctx.fill(small);
  // kenarlara doğru koyulaşma (göz merkezde kalsın)
  const vg = ctx.createRadialGradient(CX, CY, 20, CX, CY, 85);
  vg.addColorStop(0, 'rgba(40,4,10,0)');
  vg.addColorStop(1, 'rgba(40,4,10,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, UW, UH);
  ctx.restore();

  // çerçeve
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.3;
  ctx.stroke(insetPath(5.4, 3.4));
  ctx.lineWidth = 0.5;
  ctx.stroke(inner);
  ctx.strokeStyle = 'rgba(201,162,74,0.5)';
  ctx.lineWidth = 0.35;
  ctx.stroke(insetPath(3.6, 4.2));
  ctx.restore();

  // köşebentler
  ctx.save();
  for (const [x, y, a] of [[8.2, 8.2, 0], [UW - 8.2, 8.2, Math.PI / 2], [UW - 8.2, UH - 8.2, Math.PI], [8.2, UH - 8.2, -Math.PI / 2]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const kp = new Path2D();
    kp.moveTo(0, 0);
    kp.lineTo(13, 0);
    kp.bezierCurveTo(12, 6, 6, 12, 0, 13);
    kp.closePath();
    ctx.fillStyle = '#4a0d18';
    ctx.fill(kp);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.6;
    ctx.stroke(kp);
    ctx.fillStyle = GOLD;
    ctx.save();
    ctx.translate(4.4, 4.4);
    ctx.rotate(-Math.PI / 4);
    ctx.scale(6.2, 6.2);
    ctx.fill(k.shapes.tulip);
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();

  // salbekler (madalyon üstü/altı damla)
  ctx.save();
  for (const d of [-1, 1]) {
    const p = new Path2D();
    const y0 = CY + d * 22;
    p.moveTo(CX - 7, y0);
    p.bezierCurveTo(CX - 6, y0 + d * 6, CX - 2, y0 + d * 9, CX, y0 + d * 14);
    p.bezierCurveTo(CX + 2, y0 + d * 9, CX + 6, y0 + d * 6, CX + 7, y0);
    p.closePath();
    ctx.fillStyle = '#4a0d18';
    ctx.fill(p);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.7;
    ctx.stroke(p);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(CX, y0 + d * 7.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // merkez madalyon: 16 dilimli rozet
  ctx.save();
  const med = new Path2D();
  const n = 16, r0 = 21.5, r1 = 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const am = a + Math.PI / n;
    const x = CX + Math.cos(a) * r0, y = CY + Math.sin(a) * r0;
    if (i === 0) med.moveTo(x, y);
    else med.lineTo(x, y);
    if (i < n) {
      med.quadraticCurveTo(CX + Math.cos(am) * r1 * 1.08, CY + Math.sin(am) * r1 * 1.08, CX + Math.cos(a + (2 * Math.PI) / n) * r0, CY + Math.sin(a + (2 * Math.PI) / n) * r0);
    }
  }
  med.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3 * ctx.getTransform().a;
  const mg = ctx.createRadialGradient(CX, CY - 6, 2, CX, CY, 25);
  mg.addColorStop(0, '#7e1b2f');
  mg.addColorStop(1, '#3d0a14');
  ctx.fillStyle = mg;
  ctx.fill(med);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.1;
  ctx.stroke(med);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.arc(CX, CY, 18.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // lale amblemi
  ctx.save();
  const tg = goldGradient(ctx, CY - 15, CY + 14);
  ctx.fillStyle = tg;
  ctx.strokeStyle = tg;
  // sap ve yapraklar
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX, CY - 1);
  ctx.bezierCurveTo(CX - 0.6, CY + 5, CX + 0.6, CY + 9, CX, CY + 13);
  ctx.stroke();
  for (const m of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX, CY + 12);
    ctx.bezierCurveTo(CX + m * 3, CY + 8, CX + m * 7, CY + 6, CX + m * 10, CY + 1);
    ctx.bezierCurveTo(CX + m * 8, CY + 7, CX + m * 4, CY + 10, CX, CY + 13.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.translate(CX, CY - 6.5);
  ctx.scale(14, 14);
  ctx.fill(k.shapes.tulip);
  ctx.fillStyle = '#7e1b2f';
  ctx.beginPath();
  ctx.moveTo(0, 0.3);
  ctx.bezierCurveTo(-0.09, 0.1, -0.07, -0.3, 0, -0.5);
  ctx.bezierCurveTo(0.07, -0.3, 0.09, 0.1, 0, 0.3);
  ctx.fill();
  ctx.restore();
}

// ───────────────────────── fontlar ─────────────────────────
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = Promise.all([
    document.fonts.load(`900 64px "Playfair Display"`, 'AKQJ0123456789'),
    document.fonts.load(`800 64px Inter`, 'AKQJ0123456789'),
  ]).catch(() => undefined);
  await Promise.race([loads, new Promise((r) => setTimeout(r, 3000))]);
}

// ───────────────────────── atlas ─────────────────────────
export async function buildCardAtlas(width: number): Promise<CardAtlas> {
  await ensureFonts();
  const W = Math.max(8, Math.round(width));
  const H = Math.round(W * 1.25);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // CPU destekli tuval: tek seferlik çizimde GPU gölgelendirici derleme beklemeleri olmaz,
  // GPU bağlamı kaybında içerik silinmez; WebGL'e normal piksel yüklemesiyle gider.
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.imageSmoothingEnabled = true;
  const cellW = W / ATLAS_COLS;
  const cellH = H / ATLAS_ROWS;
  const sx = cellW / UW, sy = cellH / UH;

  const grainTile = makeGrainTile();
  const shapes = makeShapes();
  const labels: Label[] = [];
  for (let r = 1; r <= 13; r++) {
    const t = RANK_LABEL[r];
    labels[r] = layoutLabel(ctx, t, IDX.family, IDX.weight, IDX.capH, t.length > 1 ? IDX.maxW10 : IDX.maxW, -0.04);
  }
  const courtLetters: Record<string, Label> = {};
  for (const t of ['J', 'Q', 'K']) courtLetters[t] = layoutLabel(ctx, t, SERIF, 900, 30.5, 40, 0);
  const wordmark = layoutLabel(ctx, 'KAHVEHANE', SERIF, 900, 4.4, 32, 0.34);

  const red = ctx.createLinearGradient(0, -0.6, 0, 0.6);
  red.addColorStop(0, '#c3183a');
  red.addColorStop(1, '#9c0f26');
  const black = ctx.createLinearGradient(0, -0.6, 0, 0.6);
  black.addColorStop(0, '#2a231f');
  black.addColorStop(1, '#100c0a');
  // pip() bu gradyanları birim uzayda kullanır (ölçekli dönüşümle); indeks yazıları düz mürekkep rengindedir
  const kit: Kit = {
    ctx, shapes, labels, courtLetters, wordmark,
    ink: {red, black},
    paths: {
      border3_1: insetPath(3.1),
      border3_3: insetPath(3.3),
      border4_5: insetPath(4.5),
      archOuter: archPath(0),
      archInner: archPath(2.3),
      archHair: archPath(1.2),
      rosettes: rosetteLattice(),
    },
  };
  const paperTile = makePaperTile(cellW, cellH, grainTile);

  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % ATLAS_COLS, row = Math.floor(id / ATLAS_COLS);
    const x0 = col * cellW, y0 = row * cellH;
    // Hücre sınırı tam piksele yuvarlanır: komşu hücreler arasında yarı saydam dikiş kalmaz.
    const px0 = Math.round(x0), py0 = Math.round(y0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px0, py0, Math.round(x0 + cellW) - px0, Math.round(y0 + cellH) - py0);
    ctx.clip();
    if (id === BACK_INDEX) {
      ctx.setTransform(sx, 0, 0, sy, x0, y0);
      cardBack(kit);
    } else {
      const suit = SUITS[Math.floor(id / 13)];
      const rank = (id % 13) + 1;
      ctx.drawImage(paperTile, Math.floor(x0), Math.floor(y0));
      ctx.setTransform(sx, 0, 0, sy, x0, y0);
      innerBorder(kit, rank === 11);
      cornerFlourish(kit, rank === 11);
      if (rank === 1) aceCard(kit, suit);
      else if (rank <= 10) numberCard(kit, rank, suit);
      else courtCard(kit, rank, suit);
      indexCorner(kit, rank, suit, isRed(suit) ? INK_RED : INK_BLACK);
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  grainTile.width = grainTile.height = 0;
  paperTile.width = paperTile.height = 0;
  return {canvas, width: W, height: H, cellW, cellH};
}

// ───────────────────────── indeksler ─────────────────────────
function indexCorner(k: Kit, rank: number, suit: Suit, color: string): void {
  const {ctx} = k;
  const L = k.labels[rank];
  const base = IDX.top + IDX.capH;
  const pipY = base + IDX.gap + IDX.pipW * 0.5;
  // dar etiketler sabit eksende; "10" sol kenara hizalanır ve takım işareti onun altında ortalanır
  const cx = L.width > IDX.maxW + 0.01 ? IDX.left + L.width / 2 : IDX.cx;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    if (i === 1) {
      ctx.translate(UW, UH);
      ctx.rotate(Math.PI);
    }
    drawLabel(ctx, L, cx, base, color);
    pip(k, suit, Math.min(cx, IDX.cx + 0.6), pipY, IDX.pipW, false, color);
    ctx.restore();
  }
}

/** Boş köşelerde (sağ üst, sol alt) ince altın köşebent. */
function cornerFlourish(k: Kit, jack: boolean): void {
  const {ctx} = k;
  ctx.save();
  const col = jack ? 'rgba(176,132,46,0.85)' : 'rgba(170,128,48,0.62)';
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    if (i === 1) {
      ctx.translate(UW, UH);
      ctx.rotate(Math.PI);
    }
    const x = UW - 3.3, y = 3.3;
    ctx.beginPath();
    ctx.arc(x, y, 12.5, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.arc(x, y, 10.6, Math.PI / 2, Math.PI);
    ctx.stroke();
    // köşeye bakan küçük lale
    ctx.save();
    ctx.translate(x - 5.6, y + 5.6);
    ctx.rotate(-Math.PI * 0.75);
    ctx.scale(5.4, 5.4);
    ctx.fill(k.shapes.tulip);
    ctx.restore();
    for (const a of [0.62, 0.88]) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(Math.PI / 2 + a * Math.PI / 2) * 14.2, y + Math.sin(Math.PI / 2 + a * Math.PI / 2) * 14.2, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
