// Kart yüzleri ve arka yüz: Canvas 2D ile prosedürel çizilen doku atlası.
// 8 × 7 hücre; hücre indeksi = kart id (0..51), 52 = arka yüz, 53..55 boş (saydam).
// Bütün çizim "tasarım birimi" uzayında yapılır: kart genişliği 100, yüksekliği 100 / 0.7.
//
// İsteğe bağlı görseller (assets/cards/*.png; varsa kullanılır, yoksa prosedürel yedek çizilir):
//   jacks.png / queens.png / kings.png  2×2 ızgara: sol üst maça, sağ üst kupa, sol alt karo, sağ alt sinek
//                                       (krem zemin otomatik kırpılır)
//   back.png       kart arkası (2:3), hücreyi kenardan kenara doldurur
//   ace_spade.png  saydam zeminli süslü maça (maça ası ortası)
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

/** Görsel URL'leri. Normalde assets/cards klasöründen otomatik bulunur; geliştirme sayfası test için verebilir. */
export interface CardArtUrls {
  jacks?: string;
  queens?: string;
  kings?: string;
  back?: string;
  aceSpade?: string;
}

const ART_FILES = import.meta.glob('../../assets/cards/*.png', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

function discoverArt(): CardArtUrls {
  const out: CardArtUrls = {};
  for (const [path, url] of Object.entries(ART_FILES)) {
    const name = (path.split('/').pop() ?? '').replace(/\.png$/i, '').toLowerCase();
    if (name === 'jacks') out.jacks = url;
    else if (name === 'queens') out.queens = url;
    else if (name === 'kings') out.kings = url;
    else if (name === 'back') out.back = url;
    else if (name === 'ace_spade') out.aceSpade = url;
  }
  return out;
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

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';

// Köşe indeksi (sol üst; sağ altta 180° döndürülmüş kopyası)
const IDX = {
  cx: 17, // indeks sütununun ekseni
  left: 4.8, // geniş etiketin ("10") sol kenarı
  top: 6.2, // rakam/harf mürekkebinin üstü
  capH: 24.5, // rakam yüksekliği (≈ %24.5 kart genişliği)
  maxW: 25, // tek karakter için azami mürekkep genişliği
  maxW10: 27, // "10" için azami genişlik
  gap: 3.6, // rakam ile takım işareti arası
  pipW: 13, // indeks takım işareti genişliği
};
const IDX_BOTTOM = IDX.top + IDX.capH + IDX.gap + IDX.pipW; // indeks bloğunun alt sınırı (≈ 47)

// Sayı kartlarındaki takım işaretleri alanı
const FIELD = {
  dx: 15.8, // yan sütunların merkezden uzaklığı
  top: 43, // en üst sıranın merkezi
  pipW: 14.8,
};

// Saray kartı resim çerçevesi: indeks köşelerinde (sol üst, sağ alt) çentikli dikdörtgen
const FRAME = {inset: 8.6, notchX: 31.5, notchY: IDX_BOTTOM + 2.6, r: 2.6};

const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ───────────────────────── yardımcılar ─────────────────────────

function insetPath(inset: number, r?: number): Path2D {
  const p = new Path2D();
  rrect(p, inset, inset, UW - inset * 2, UH - inset * 2, r ?? Math.max(0.5, CR - inset));
  return p;
}

/** Köşeleri yuvarlatılmış çokgen (iç bükey köşeler dahil). */
function roundedPoly(pts: [number, number][], r: number): Path2D {
  const p = new Path2D();
  const n = pts.length;
  const [ax, ay] = pts[n - 1], [bx, by] = pts[0];
  p.moveTo((ax + bx) / 2, (ay + by) / 2);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    p.arcTo(x1, y1, x2, y2, r);
  }
  p.closePath();
  return p;
}

/** Saray kartı resim çerçevesi; d > 0 içe doğru küçültür. */
function framePath(d: number): Path2D {
  const L = FRAME.inset + d, T = FRAME.inset + d, R = UW - FRAME.inset - d, B = UH - FRAME.inset - d;
  const nx = FRAME.notchX + d, ny = FRAME.notchY + d;
  return roundedPoly(
    [[nx, T], [R, T], [R, UH - ny], [UW - nx, UH - ny], [UW - nx, B], [L, B], [L, ny], [nx, ny]],
    Math.max(0.6, FRAME.r - d * 0.5),
  );
}

function frameBox(): {x: number; y: number; w: number; h: number} {
  return {x: FRAME.inset, y: FRAME.inset, w: UW - FRAME.inset * 2, h: UH - FRAME.inset * 2};
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0) ─────────────────────────
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

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

interface Shapes {
  suit: Record<Suit, Path2D>;
  flip: Record<Suit, Path2D>; // 180° döndürülmüş kopyalar (ışık hep yukarıdan gelsin diye)
  tulip: Path2D;
}

function rotated180(p: Path2D): Path2D {
  const q = new Path2D();
  q.addPath(p, new DOMMatrix([-1, 0, 0, -1, 0, 0]));
  return q;
}

function makeShapes(): Shapes {
  const suit: Record<Suit, Path2D> = {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()};
  return {
    suit,
    flip: {S: rotated180(suit.S), H: rotated180(suit.H), D: rotated180(suit.D), C: rotated180(suit.C)},
    tulip: tulipPath(),
  };
}

// ───────────────────────── yazı ölçümü ─────────────────────────
// Playfair Display'in varsayılan rakamları "eski üslup"tur (3, 4, 5, 7, 9 aşağı sarkar; 0, 1, 2 küçük).
// İndekslerde her rakam kendi mürekkep kutusuna göre ölçeklenip büyük harf yüksekliğine oturtulur.
interface Glyph {
  ch: string;
  font: string;
  x: number;
  base: number; // etiketin üstünden baseline'a uzaklık
}
interface Label {
  glyphs: Glyph[];
  scaleX: number;
  width: number; // ölçeklenmiş mürekkep genişliği
}

/** inkFit: her karakter kendi mürekkep kutusuyla capH'a oturur (indeksler: J/Q kuyrukları takım işaretine taşmaz).
 *  Aksi hâlde yalnız rakamlar mürekkebe, harfler büyük harf yüksekliğine göre ölçeklenir. */
function layoutLabel(ctx: Ctx, text: string, family: string, weight: number, capH: number, maxW: number, track: number, inkFit: boolean): Label {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} 100px ${family}`;
  const capRef = ctx.measureText('H').actualBoundingBoxAscent || 70;
  const parts = [...text].map((ch) => {
    ctx.font = `${weight} 100px ${family}`;
    const m0 = ctx.measureText(ch);
    const fit = inkFit || (ch >= '0' && ch <= '9');
    const ink = m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent;
    const size = fit && ink > 1 ? (capH / ink) * 100 : (capH / capRef) * 100;
    const font = `${weight} ${size.toFixed(3)}px ${family}`;
    ctx.font = font;
    const m = ctx.measureText(ch);
    return {ch, font, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, base: fit ? m.actualBoundingBoxAscent : capH};
  });
  const gap = track * capH;
  const total = parts.reduce((s, q) => s + q.l + q.r, 0) + gap * (parts.length - 1);
  const scaleX = Math.min(1, maxW / total);
  let x = -total / 2;
  const glyphs = parts.map((q) => {
    const g = {ch: q.ch, font: q.font, x: x + q.l, base: q.base};
    x += q.l + q.r + gap;
    return g;
  });
  return {glyphs, scaleX, width: total * scaleX};
}

/** Etiketi, mürekkebinin üstü `top` olacak şekilde `cx` etrafında ortalar. */
function drawLabel(ctx: Ctx, L: Label, cx: number, top: number, fill: Fill): void {
  ctx.save();
  ctx.translate(cx, top);
  ctx.scale(L.scaleX, 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill;
  for (const g of L.glyphs) {
    ctx.font = g.font;
    ctx.fillText(g.ch, g.x, g.base);
  }
  ctx.restore();
}

// ───────────────────────── çizim bağlamı ─────────────────────────
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Art {
  courts: Partial<Record<number, {img: HTMLImageElement; rects: Record<Suit, Rect>}>>; // rank (11..13) → sayfa
  back: HTMLImageElement | null;
  aceSpade: HTMLImageElement | null;
}

interface Kit {
  ctx: Ctx;
  shapes: Shapes;
  labels: Label[]; // rank → indeks etiketi
  courtLetters: Record<string, Label>;
  gloss: Record<'red' | 'black', CanvasGradient>; // birim uzayda dikey parlak mürekkep
  sheen: CanvasGradient; // birim uzayda üstten beyaz parıltı
  goldEdge: CanvasGradient; // tasarım uzayında metalik altın
  paths: {edge: Path2D; frame: Path2D; frameInner: Path2D; frameOuter: Path2D; lattice: Path2D};
  art: Art;
}

function isRed(s: Suit): boolean {
  return s === 'H' || s === 'D';
}

/** Düz mürekkep takım işareti (indeksler). */
function pip(k: Kit, suit: Suit, x: number, y: number, w: number, fill: Fill): void {
  const {ctx} = k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.fillStyle = fill;
  ctx.fill(k.shapes.suit[suit]);
  ctx.restore();
}

/** Parlak baskı takım işareti: dikey gradyan + üstte yumuşak parıltı. */
function glossPip(k: Kit, suit: Suit, x: number, y: number, w: number, flip = false): void {
  const {ctx} = k;
  const path = (flip ? k.shapes.flip : k.shapes.suit)[suit];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.fillStyle = k.gloss[isRed(suit) ? 'red' : 'black'];
  ctx.fill(path);
  ctx.translate(0, -0.045);
  ctx.scale(0.8, 0.8);
  ctx.fillStyle = k.sheen;
  ctx.fill(path);
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


/** Kâğıt: sıcak fildişi gradyan + doku + kenarlarda yumuşak iç gölge (kalın kart hissi).
 *  Bir hücre boyutunda (2 px taşmalı) bir kez çizilir, her yüze tam piksel konumda kopyalanır. */
function makePaperTile(cw: number, ch: number, grain: HTMLCanvasElement): HTMLCanvasElement {
  const w = Math.ceil(cw) + 2, h = Math.ceil(ch) + 2;
  const s = cw / UW;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  const lg = g.createLinearGradient(0, 0, cw * 0.45, ch);
  lg.addColorStop(0, '#fcf7ea');
  lg.addColorStop(0.55, '#f5ecd8');
  lg.addColorStop(1, '#eadcbd');
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  const v = g.createRadialGradient(cw * 0.38, ch * 0.3, cw * 0.05, cw * 0.45, ch * 0.4, ch * 0.8);
  v.addColorStop(0, 'rgba(255,253,244,0.55)');
  v.addColorStop(0.55, 'rgba(255,250,236,0)');
  v.addColorStop(1, 'rgba(130,90,40,0.10)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.6;
  g.fillStyle = g.createPattern(grain, 'repeat')!;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  // iç gölge: kart şeklinin dışını doldur, gölgesi içeri düşsün
  const card = new Path2D();
  rrect(card, 0, 0, cw, ch, CR * s);
  const ring = new Path2D();
  ring.rect(-40 * s, -40 * s, cw + 80 * s, ch + 80 * s);
  ring.addPath(card);
  g.save();
  g.clip(card);
  g.shadowColor = 'rgba(92,60,22,0.5)';
  g.shadowBlur = 4.5 * s;
  g.fillStyle = '#000';
  g.fill(ring, 'evenodd');
  g.restore();
  return c;
}

// ───────────────────────── indeksler ─────────────────────────
function indexCorner(k: Kit, rank: number, suit: Suit): void {
  const {ctx} = k;
  const color = isRed(suit) ? INK_RED : INK_BLACK;
  const L = k.labels[rank];
  const pipY = IDX.top + IDX.capH + IDX.gap + IDX.pipW * 0.5;
  // dar etiketler sabit eksende; "10" sol kenara hizalanır
  const cx = L.width > IDX.maxW + 0.01 ? IDX.left + L.width / 2 : IDX.cx;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    if (i === 1) {
      ctx.translate(UW, UH);
      ctx.rotate(Math.PI);
    }
    drawLabel(ctx, L, cx, IDX.top, color);
    pip(k, suit, Math.min(cx, IDX.cx + 0.6), pipY, IDX.pipW, color);
    ctx.restore();
  }
}

function drawGoldEdge(k: Kit, jack: boolean): void {
  const {ctx} = k;
  ctx.save();
  ctx.strokeStyle = k.goldEdge;
  ctx.lineWidth = jack ? 1.05 : 0.8;
  ctx.stroke(k.paths.edge);
  ctx.restore();
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

function numberCard(k: Kit, rank: number, suit: Suit): void {
  const top = FIELD.top, bot = UH - FIELD.top;
  for (const [c, r] of PIP_LAYOUT[rank]) {
    glossPip(k, suit, CX + c * FIELD.dx, top + (bot - top) * r, FIELD.pipW, r > 0.5 + 1e-6);
  }
}

// ───────────────────────── aslar ─────────────────────────
function aceCard(k: Kit, suit: Suit): void {
  if (suit === 'S') {
    if (k.art.aceSpade) return drawContain(k.ctx, k.art.aceSpade, CX, CY, 70, 82);
    return aceOfSpades(k);
  }
  glossPip(k, suit, CX, CY + (suit === 'C' ? 0.6 : 0), suit === 'D' ? 50 : 46);
}

function curl(ctx: Ctx, cx: number, cy: number, r: number, a0: number, turns: number, dir: 1 | -1): void {
  // içe doğru sarmal; (cx, cy) merkez, r başlangıç yarıçapı
  const n = Math.max(8, Math.round(turns * 28));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const rr = r * (1 - 0.78 * t);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function aceOfSpades(k: Kit): void {
  const {ctx} = k;
  const sw = 58, sy = CY - 2;
  glossPip(k, 'S', CX, sy, sw);
  // altın iç çizgi ve kakma süsler (maça birim uzayında)
  ctx.save();
  ctx.translate(CX, sy);
  ctx.scale(sw, sw);
  ctx.save();
  ctx.translate(0, 0.005);
  ctx.scale(0.88, 0.88);
  ctx.strokeStyle = goldGradient(ctx, -0.5, 0.5);
  ctx.lineWidth = 0.75 / (sw * 0.88);
  ctx.stroke(k.shapes.suit.S);
  ctx.restore();
  const gold = goldGradient(ctx, -0.45, 0.4);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 0.75 / sw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const m of [-1, 1] as const) {
    ctx.save();
    ctx.scale(m, 1);
    ctx.beginPath();
    ctx.moveTo(0.02, 0.24);
    ctx.bezierCurveTo(0.12, 0.25, 0.3, 0.2, 0.33, 0.06);
    ctx.bezierCurveTo(0.35, -0.04, 0.27, -0.1, 0.2, -0.06);
    curl(ctx, 0.235, 0.0, 0.065, -2.2, 1.15, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.03, -0.02);
    ctx.bezierCurveTo(0.1, -0.06, 0.16, -0.14, 0.12, -0.22);
    curl(ctx, 0.085, -0.19, 0.04, -0.3, 1.1, -1);
    ctx.stroke();
    // yapraklar
    for (const [x, y, a] of [[0.17, 0.215, -0.5], [0.3, 0.13, -1.2], [0.07, -0.08, -2.4]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0.04, -0.025, 0.08, 0);
      ctx.quadraticCurveTo(0.04, 0.025, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // orta lale ve sap
  ctx.save();
  ctx.translate(0, -0.2);
  ctx.scale(0.2, 0.2);
  ctx.fill(k.shapes.tulip);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -0.1);
  ctx.lineTo(0, 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0.29, 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawContain(ctx: Ctx, img: HTMLImageElement, cx: number, cy: number, w: number, h: number): void {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/** Kaynak dikdörtgeni hedefe "cover" sığdırır (taşan kısım kesilir; dikeyde üst tarafa ağırlık). */
function drawCover(ctx: Ctx, img: CanvasImageSource, src: Rect, dst: Rect, focusY = 0.35): void {
  const ta = dst.w / dst.h, sa = src.w / src.h;
  let {x, y, w, h} = src;
  if (sa > ta) {
    const nw = h * ta;
    x += (w - nw) / 2;
    w = nw;
  } else {
    const nh = w / ta;
    y += (h - nh) * focusY;
    h = nh;
  }
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h, dst.x, dst.y, dst.w, dst.h);
  ctx.restore();
}

// ───────────────────────── papaz / kız / vale ─────────────────────────
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


interface CourtStyle {
  top: string;
  bot: string;
  pattern: string;
  letter: 'gold' | 'dark';
}

const COURT_STYLES: Record<number, CourtStyle> = {
  13: {top: '#8e1f35', bot: '#3a0812', pattern: 'rgba(240,200,110,0.13)', letter: 'gold'},
  12: {top: '#2d4789', bot: '#0c1634', pattern: 'rgba(240,200,110,0.13)', letter: 'gold'},
  11: {top: '#ecca72', bot: '#94682a', pattern: 'rgba(90,50,10,0.13)', letter: 'dark'},
};

function latticePath(): Path2D {
  // resim alanı için ince elmas ızgara + düğüm noktaları
  const p = new Path2D();
  const sp = 7.5;
  for (let j = 0; j * sp * 0.9 < UH + sp; j++) {
    for (let i = -1; i * sp < UW + sp; i++) {
      const x = i * sp + (j % 2 ? sp / 2 : 0), y = j * sp * 0.9;
      p.moveTo(x, y - 1.6);
      p.lineTo(x + 1.1, y);
      p.lineTo(x, y + 1.6);
      p.lineTo(x - 1.1, y);
      p.closePath();
    }
  }
  return p;
}

function courtCard(k: Kit, rank: number, suit: Suit): void {
  const {ctx} = k;
  const jack = rank === 11;
  const sheet = k.art.courts[rank];
  const box = frameBox();

  // kartın üzerine hafif oturan gölge
  ctx.save();
  ctx.translate(0, 0.6);
  ctx.strokeStyle = 'rgba(80,45,15,0.10)';
  ctx.lineWidth = 2.6;
  ctx.stroke(k.paths.frame);
  ctx.restore();

  ctx.save();
  ctx.clip(k.paths.frame);
  if (sheet) {
    drawCover(ctx, sheet.img, sheet.rects[suit], box);
  } else {
    courtFallback(k, rank, suit);
  }
  ctx.restore();

  // altın çerçeve (vale: kalın + dış ince hat)
  ctx.save();
  ctx.strokeStyle = k.goldEdge;
  ctx.lineWidth = jack ? 1.5 : 1.1;
  ctx.stroke(k.paths.frame);
  ctx.lineWidth = 0.35;
  ctx.globalAlpha = 0.8;
  ctx.stroke(k.paths.frameInner);
  if (jack) {
    ctx.lineWidth = 0.4;
    ctx.stroke(k.paths.frameOuter);
  }
  ctx.restore();
  if (jack) sparkle(ctx, IDX.cx + 12, IDX.top + 2, 3.4);
}

function courtFallback(k: Kit, rank: number, suit: Suit): void {
  // Görsel yokken: zengin zemin + amblem + büyük harf + takım madalyonu (köşegen kompozisyon)
  const {ctx} = k;
  const st = COURT_STYLES[rank];
  const g = ctx.createLinearGradient(0, FRAME.inset, UW * 0.3, UH - FRAME.inset);
  g.addColorStop(0, st.top);
  g.addColorStop(1, st.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, UW, UH);
  ctx.fillStyle = st.pattern;
  ctx.fill(k.paths.lattice);
  const lg = ctx.createRadialGradient(60, 34, 2, 55, 50, 70);
  lg.addColorStop(0, rank === 11 ? 'rgba(255,250,220,0.55)' : 'rgba(255,220,160,0.28)');
  lg.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, UW, UH);

  const gold = goldGradient(ctx, 16, 44);
  if (rank === 13) crown(ctx, 61, 32, 1.1, gold);
  else if (rank === 12) tulipCrown(k, 61, 33, 1.08, gold);
  else turbanCap(ctx, 61, 34, 1.12, gold);

  const L = k.courtLetters[RANK_LABEL[rank]];
  const top = 56;
  drawLabel(ctx, L, CX + 0.3, top + 0.9, st.letter === 'gold' ? 'rgba(10,2,4,0.45)' : 'rgba(90,60,10,0.4)');
  if (st.letter === 'gold') {
    drawLabel(ctx, L, CX, top, goldGradient(ctx, top, top + 32));
  } else {
    const dg = ctx.createLinearGradient(0, top, 0, top + 32);
    dg.addColorStop(0, '#4a0f1c');
    dg.addColorStop(1, '#22060c');
    drawLabel(ctx, L, CX, top, dg);
  }

  const mx = 38, my = 112;
  ctx.save();
  ctx.fillStyle = '#f7efdc';
  ctx.strokeStyle = rank === 11 ? '#6d4a12' : GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mx, my, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  glossPip(k, suit, mx, my + (suit === 'C' ? 0.2 : 0.3), suit === 'D' ? 11.5 : 10.6);
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
  // Krem kenar (kâğıt zemin önceden çizildi) → altın hat → zümrüt yeşili alan, altın bordür ve madalyon
  const {ctx} = k;
  const panel = insetPath(4.4, 3.4);
  const g = ctx.createRadialGradient(CX, CY - 8, 6, CX, CY, 88);
  g.addColorStop(0, '#1f7150');
  g.addColorStop(0.55, '#0f4a32');
  g.addColorStop(1, '#06291b');
  ctx.fillStyle = g;
  ctx.fill(panel);

  // ince altın elmas ızgara (bordür içinde)
  const inner = insetPath(10.2, 1.6);
  ctx.save();
  ctx.clip(inner);
  ctx.fillStyle = 'rgba(214,176,90,0.16)';
  ctx.fill(k.paths.lattice);
  ctx.restore();

  // bordür: dış hat, nokta/elmas dizisi, iç hat
  ctx.save();
  ctx.strokeStyle = k.goldEdge;
  ctx.lineWidth = 0.95;
  ctx.stroke(panel);
  ctx.lineWidth = 0.4;
  ctx.stroke(insetPath(6.6, 2.4));
  ctx.lineWidth = 0.7;
  ctx.stroke(inner);
  ctx.fillStyle = 'rgba(222,186,98,0.9)';
  const band = 8.4;
  const dot = (x: number, y: number, big: boolean) => {
    ctx.beginPath();
    if (big) {
      ctx.moveTo(x, y - 1.05);
      ctx.lineTo(x + 0.75, y);
      ctx.lineTo(x, y + 1.05);
      ctx.lineTo(x - 0.75, y);
      ctx.closePath();
    } else ctx.arc(x, y, 0.38, 0, Math.PI * 2);
    ctx.fill();
  };
  const nxs = 12, nys = 18;
  for (let i = 0; i <= nxs; i++) {
    const x = band + ((UW - band * 2) * i) / nxs;
    dot(x, band, i % 2 === 0);
    dot(x, UH - band, i % 2 === 0);
  }
  for (let i = 1; i < nys; i++) {
    const y = band + ((UH - band * 2) * i) / nys;
    dot(band, y, i % 2 === 0);
    dot(UW - band, y, i % 2 === 0);
  }
  ctx.restore();

  const gold = goldGradient(ctx, CY - 40, CY + 40);
  // köşe yelpazeleri
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 0.6;
  for (const [x, y, a] of [[10.2, 10.2, 0], [UW - 10.2, 10.2, Math.PI / 2], [UW - 10.2, UH - 10.2, Math.PI], [10.2, UH - 10.2, -Math.PI / 2]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7.8, 0, Math.PI / 2);
    ctx.stroke();
    ctx.translate(3.6, 3.6);
    ctx.rotate(-Math.PI * 0.75);
    ctx.scale(6, 6);
    ctx.fill(k.shapes.tulip);
    ctx.restore();
  }
  ctx.restore();

  // madalyon üstü/altı lale demetleri
  ctx.save();
  ctx.fillStyle = gold;
  ctx.strokeStyle = gold;
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, CY + d * 33);
    if (d > 0) ctx.rotate(Math.PI);
    ctx.save();
    ctx.scale(12, 12);
    ctx.fill(k.shapes.tulip);
    ctx.restore();
    ctx.lineWidth = 0.8;
    for (const m of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.bezierCurveTo(m * 6, 9, m * 12, 6, m * 13, 0);
      curl(ctx, m * 10.6, -0.4, 2.4, m > 0 ? 0 : Math.PI, 0.9, m > 0 ? -1 : 1);
      ctx.stroke();
      ctx.save();
      ctx.translate(m * 6.5, 9.2);
      ctx.rotate(m * 0.35);
      ctx.beginPath();
      ctx.moveTo(-m * 3.4, 0);
      ctx.quadraticCurveTo(0, -1.6, m * 3.4, 0);
      ctx.quadraticCurveTo(0, 1.6, -m * 3.4, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();

  // merkez madalyon: halka + 12 yapraklı rozet
  ctx.save();
  const mg = ctx.createRadialGradient(CX, CY - 4, 2, CX, CY, 19);
  mg.addColorStop(0, '#16603f');
  mg.addColorStop(1, '#073020');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(CX, CY, 18.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(CX, CY, 16.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = gold;
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate((i * Math.PI) / 6);
    ctx.beginPath();
    ctx.moveTo(0, -3.4);
    ctx.bezierCurveTo(2.6, -6.5, 2.2, -11.5, 0, -14);
    ctx.bezierCurveTo(-2.2, -11.5, -2.6, -6.5, 0, -3.4);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#0a3a27';
  ctx.beginPath();
  ctx.arc(CX, CY, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(CX, CY, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ───────────────────────── görseller ─────────────────────────
function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(ok && img.naturalWidth > 0 ? img : null);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.decoding = 'async';
    img.src = url;
  });
}

/** 2×2 sayfayı dörde böler ve her çeyrekte krem zemini kırpar (küçültülmüş kopya üzerinde analiz). */
function sliceSheet(img: HTMLImageElement): Record<Suit, Rect> {
  const W = img.naturalWidth, H = img.naturalHeight;
  const aw = 200, ah = Math.max(8, Math.round((aw * H) / W));
  const c = document.createElement('canvas');
  c.width = aw;
  c.height = ah;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  g.drawImage(img, 0, 0, aw, ah);
  const d = g.getImageData(0, 0, aw, ah).data;
  c.width = c.height = 0;
  const out = {} as Record<Suit, Rect>;
  const order: Suit[] = ['S', 'H', 'D', 'C']; // sol üst, sağ üst, sol alt, sağ alt
  order.forEach((suit, q) => {
    const ins = 0.02;
    const qx = (q % 2) * (aw / 2), qy = Math.floor(q / 2) * (ah / 2), qw = aw / 2, qh = ah / 2;
    const x0 = Math.round(qx + qw * ins), x1 = Math.round(qx + qw * (1 - ins));
    const y0 = Math.round(qy + qh * ins), y1 = Math.round(qy + qh * (1 - ins));
    // zemin rengi: çeyrek kenar halkasının medyanı
    const rs: number[] = [], gs: number[] = [], bs: number[] = [];
    const sample = (x: number, y: number) => {
      const o = (y * aw + x) * 4;
      rs.push(d[o]);
      gs.push(d[o + 1]);
      bs.push(d[o + 2]);
    };
    for (let x = x0; x < x1; x += 2) {
      sample(x, y0);
      sample(x, y1 - 1);
    }
    for (let y = y0; y < y1; y += 2) {
      sample(x0, y);
      sample(x1 - 1, y);
    }
    const med = (a: number[]) => a.sort((m, n) => m - n)[a.length >> 1];
    const br = med(rs), bgc = med(gs), bb = med(bs);
    const cols = new Array<number>(x1 - x0).fill(0), rows = new Array<number>(y1 - y0).fill(0);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = (y * aw + x) * 4;
        const diff = Math.max(Math.abs(d[o] - br), Math.abs(d[o + 1] - bgc), Math.abs(d[o + 2] - bb));
        if (d[o + 3] > 128 && diff > 38) {
          cols[x - x0]++;
          rows[y - y0]++;
        }
      }
    }
    const span = (arr: number[], min: number): [number, number] => {
      let a = 0, b = arr.length - 1;
      while (a < b && arr[a] < min) a++;
      while (b > a && arr[b] < min) b--;
      return [a, b + 1];
    };
    const [cx0, cx1] = span(cols, Math.max(2, (y1 - y0) * 0.04));
    const [ry0, ry1] = span(rows, Math.max(2, (x1 - x0) * 0.04));
    let r: Rect = {x: x0, y: y0, w: x1 - x0, h: y1 - y0};
    if (cx1 - cx0 > (x1 - x0) * 0.3 && ry1 - ry0 > (y1 - y0) * 0.3) {
      r = {x: x0 + cx0, y: y0 + ry0, w: cx1 - cx0, h: ry1 - ry0};
    }
    // kalan krem kenar için küçük içe pay
    const px = r.w * 0.015, py = r.h * 0.015;
    out[suit] = {x: ((r.x + px) * W) / aw, y: ((r.y + py) * H) / ah, w: ((r.w - 2 * px) * W) / aw, h: ((r.h - 2 * py) * H) / ah};
  });
  return out;
}

async function loadArt(urls: CardArtUrls): Promise<Art> {
  const T = 6000;
  const [j, q, kk, back, ace] = await Promise.all([
    urls.jacks ? loadImage(urls.jacks, T) : null,
    urls.queens ? loadImage(urls.queens, T) : null,
    urls.kings ? loadImage(urls.kings, T) : null,
    urls.back ? loadImage(urls.back, T) : null,
    urls.aceSpade ? loadImage(urls.aceSpade, T) : null,
  ]);
  const courts: Art['courts'] = {};
  for (const [rank, img] of [[11, j], [12, q], [13, kk]] as const) {
    if (img) courts[rank] = {img, rects: sliceSheet(img)};
  }
  return {courts, back, aceSpade: ace};
}

// ───────────────────────── fontlar ─────────────────────────
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = document.fonts.load(`900 64px "Playfair Display"`, 'AKQJ0123456789').catch(() => undefined);
  await Promise.race([loads, new Promise((r) => setTimeout(r, 3000))]);
}

// ───────────────────────── atlas ─────────────────────────
export async function buildCardAtlas(width: number, artOverride?: CardArtUrls): Promise<CardAtlas> {
  const [, art] = await Promise.all([ensureFonts(), loadArt({...discoverArt(), ...artOverride})]);
  const W = Math.max(8, Math.round(width));
  const H = Math.round(W * 1.25);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // CPU destekli tuval: tek seferlik çizimde GPU gölgelendirici derleme beklemeleri olmaz,
  // GPU bağlamı kaybında içerik silinmez; WebGL'e normal piksel yüklemesiyle gider.
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const cellW = W / ATLAS_COLS;
  const cellH = H / ATLAS_ROWS;
  const sx = cellW / UW, sy = cellH / UH;

  const grainTile = makeGrainTile();
  const shapes = makeShapes();
  const labels: Label[] = [];
  for (let r = 1; r <= 13; r++) {
    const t = RANK_LABEL[r];
    labels[r] = layoutLabel(ctx, t, SERIF, 900, IDX.capH, t.length > 1 ? IDX.maxW10 : IDX.maxW, t.length > 1 ? -0.02 : 0, true);
  }
  const courtLetters: Record<string, Label> = {};
  for (const t of ['J', 'Q', 'K']) courtLetters[t] = layoutLabel(ctx, t, SERIF, 900, 31, 40, 0, false);

  // birim uzayda (pip ölçeğinde) parlak mürekkep
  const red = ctx.createLinearGradient(0, -0.55, 0, 0.55);
  red.addColorStop(0, '#d92a48');
  red.addColorStop(0.5, '#b3132e');
  red.addColorStop(1, '#7e0a1d');
  const black = ctx.createLinearGradient(0, -0.55, 0, 0.55);
  black.addColorStop(0, '#433a34');
  black.addColorStop(0.5, '#1a1513');
  black.addColorStop(1, '#050403');
  const sheen = ctx.createLinearGradient(0, -0.6, 0, 0.05);
  sheen.addColorStop(0, 'rgba(255,255,255,0.36)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  // tasarım uzayında metalik altın (çapraz)
  const goldEdge = ctx.createLinearGradient(0, 0, UW, UH);
  goldEdge.addColorStop(0, '#e9cf7f');
  goldEdge.addColorStop(0.3, '#b98b36');
  goldEdge.addColorStop(0.55, '#e6c873');
  goldEdge.addColorStop(0.8, '#a67b2c');
  goldEdge.addColorStop(1, '#d9b860');

  const kit: Kit = {
    ctx, shapes, labels, courtLetters, art,
    gloss: {red, black},
    sheen,
    goldEdge,
    paths: {
      edge: insetPath(2.9),
      frame: framePath(0),
      frameInner: framePath(1.7),
      frameOuter: framePath(-1.4),
      lattice: latticePath(),
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
    if (id === BACK_INDEX && art.back) {
      ctx.setTransform(sx, 0, 0, sy, x0, y0);
      const b = art.back;
      drawCover(ctx, b, {x: 0, y: 0, w: b.naturalWidth, h: b.naturalHeight}, {x: -0.5, y: -0.5, w: UW + 1, h: UH + 1}, 0.5);
    } else {
      ctx.drawImage(paperTile, Math.floor(x0), Math.floor(y0));
      ctx.setTransform(sx, 0, 0, sy, x0, y0);
      if (id === BACK_INDEX) {
        cardBack(kit);
      } else {
        const suit = SUITS[Math.floor(id / 13)];
        const rank = (id % 13) + 1;
        drawGoldEdge(kit, rank === 11);
        if (rank === 1) aceCard(kit, suit);
        else if (rank <= 10) numberCard(kit, rank, suit);
        else courtCard(kit, rank, suit);
        indexCorner(kit, rank, suit);
      }
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  grainTile.width = grainTile.height = 0;
  paperTile.width = paperTile.height = 0;
  return {canvas, width: W, height: H, cellW, cellH};
}
