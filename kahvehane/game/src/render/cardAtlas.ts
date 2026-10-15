// Kart yüzleri ve arka yüz: Canvas 2D ile prosedürel çizilen doku atlası.
// 8 × 7 hücre; hücre indeksi = kart id (0..51), 52 = arka yüz, 53..55 boş (saydam).
// Bütün çizim "tasarım birimi" uzayında yapılır: kart genişliği 100, yüksekliği 100 / 0.7.
//
// Tasarım (v2, önce telefon okunurluğu):
//   · dev köşe indeksi (Lilita One): rakam ≈ kart yüksekliğinin %29'u, altında takım işareti; sağ altta küçük ters kopya
//   · sayı kartları: tek büyük parlak takım işareti (klasik pip ızgarası yok)
//   · aslar: altın halkalı madalyon; maça ası ayrıca altın işlemeli
//   · saray kartları: karakter portreleri (Papaz = Rıza Amca, Kız = Defne, Vale = Cem), altın çift çerçeve,
//     takım renginde kurdele ve sağ üstte taç / lale taç / sorguçlu kalpak
//   · arka yüz: bordo zemin, altın ogee kafes, Osmanlı cilt kapağı gibi şemse + salbek + köşebent
//
// İsteğe bağlı görseller (assets/cards/*.png; varsa kullanılır, yoksa prosedürel çizim):
//   jacks.png / queens.png / kings.png  2×2 ızgara: sol üst maça, sağ üst kupa, sol alt karo, sağ alt sinek
//                                       (krem zemin otomatik kırpılır; portre penceresine yerleşir)
//   back.png       kart arkası (2:3), hücreyi kenardan kenara doldurur
//   ace_spade.png  saydam zeminli süslü maça (maça ası ortası)
import '@fontsource/lilita-one/400.css';
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
// Saray kartı portreleri (oyunun karakterleri). Dosya yoksa derleme bozulmaz; yerine harf + taç çizilir.
const PORTRAIT_FILES = import.meta.glob(['../../assets/riza_avatar.jpg', '../../assets/art/defne_avatar.jpg', '../../assets/art/cem_avatar.jpg'], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

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

function portraitUrl(file: string): string | undefined {
  for (const [path, url] of Object.entries(PORTRAIT_FILES)) if (path.endsWith(`/${file}`)) return url;
  return undefined;
}

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | CanvasPattern;
type Court = 11 | 12 | 13;

// ───────────────────────── tasarım sabitleri ─────────────────────────
const UW = 100;
const UH = UW / CARD_ASPECT; // 142.857
const CX = UW / 2;
const CY = UH / 2;
const CR = CORNER_RADIUS * UW; // 7.5

const FONT = '"Lilita One", "Arial Black", "Segoe UI Black", Impact, sans-serif';

const BORDER = 3.7; // yüzlerdeki ince altın iç çizginin kenardan uzaklığı

// Köşe indeksi (sol üst). Sağ altta MINI ölçekli, 180° döndürülmüş kopya.
const IDX = {
  top: 6.2, // rakam mürekkebinin üstü
  capH: 41, // rakam yüksekliği (kart yüksekliğinin ≈ %29'u)
  cx: 22.6, // dar etiketlerin ve takım işaretinin ekseni
  left: 5.4, // geniş etiketin ("10") sol kenarı
  maxW: 35, // tek karakter için azami genişlik
  maxW10: 41.5, // "10" için azami genişlik (sıkıştırılır)
  gap: 3.6, // rakam ile takım işareti arası
  pipW: 18, // takım işareti genişliği (kart genişliğinin %18'i)
};
const PIP_CY = IDX.top + IDX.capH + IDX.gap + IDX.pipW * 0.53; // indeks takım işaretinin merkezi (≈ 60.3)
const MINI = {s: 0.46, x: 6.2, y: 6.6}; // sağ alt kopya: ölçek ve köşeden uzaklık

// Sayı kartlarındaki büyük takım işareti
const BIG = {cx: 55, cy: 95, w: 52};
// As madalyonu
const ACE = {cx: 54, cy: 94, r: 27};
// Saray kartı portre penceresi, kurdele ve taç
const WIN = {x: 8.4, y: 47.5, w: 83.2, h: 70.5, r: 6.5};
const RIB = {cx: CX, cy: 122.4, w: 70, h: 14.5};
const CROWN = {cx: 67.5, cy: 31};

const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COURT_TITLE: Record<Court, string> = {13: 'PAPAZ', 12: 'KIZ', 11: 'VALE'};

/** Portre kırpma: kaynak görselin oranları (0..1). cx, cy: pencere merkezine gelecek nokta; w: görünen genişlik. */
interface PortraitSpec {
  file: string;
  cx: number;
  cy: number;
  w: number;
}
const PORTRAITS: Record<Court, PortraitSpec> = {
  13: {file: 'riza_avatar.jpg', cx: 0.53, cy: 0.55, w: 0.95}, // Papaz: Rıza Amca
  12: {file: 'defne_avatar.jpg', cx: 0.56, cy: 0.62, w: 0.9}, // Kız: Defne
  11: {file: 'cem_avatar.jpg', cx: 0.58, cy: 0.62, w: 0.86}, // Vale: Cem
};

/** Takım vurgu renkleri (saray kartı çerçeve şeridi, kurdele, taç taşı). */
interface Accent {
  light: string;
  base: string;
  dark: string;
}
const ACCENT: Record<Suit, Accent> = {
  S: {light: '#4b64b4', base: '#24387a', dark: '#0f1a40'}, // maça: lacivert
  H: {light: '#f0485f', base: '#c2152f', dark: '#690716'}, // kupa: al
  D: {light: '#f5874a', base: '#d2501a', dark: '#7a2606'}, // karo: kızıl turuncu
  C: {light: '#3fae76', base: '#16764a', dark: '#073a22'}, // sinek: zümrüt
};

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

function rrectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  rrect(p, x, y, w, h, r);
  return p;
}

function insetPath(inset: number, r?: number): Path2D {
  return rrectPath(inset, inset, UW - inset * 2, UH - inset * 2, r ?? Math.max(0.5, CR - inset));
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

function isRed(s: Suit): boolean {
  return s === 'H' || s === 'D';
}

function ellipse(ctx: Ctx | Path2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0, genişlik ≈ 1) ─────────────────────────
function heartPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.48);
  p.bezierCurveTo(-0.13, 0.33, -0.5, 0.12, -0.5, -0.17);
  p.bezierCurveTo(-0.5, -0.37, -0.36, -0.47, -0.235, -0.47);
  p.bezierCurveTo(-0.11, -0.47, -0.03, -0.39, 0, -0.29);
  p.bezierCurveTo(0.03, -0.39, 0.11, -0.47, 0.235, -0.47);
  p.bezierCurveTo(0.36, -0.47, 0.5, -0.37, 0.5, -0.17);
  p.bezierCurveTo(0.5, 0.12, 0.13, 0.33, 0, 0.48);
  p.closePath();
  return p;
}

function spadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.54);
  p.bezierCurveTo(0.12, -0.38, 0.5, -0.18, 0.5, 0.08);
  p.bezierCurveTo(0.5, 0.27, 0.37, 0.37, 0.235, 0.37);
  p.bezierCurveTo(0.14, 0.37, 0.075, 0.33, 0.04, 0.27);
  p.bezierCurveTo(0.05, 0.4, 0.11, 0.48, 0.22, 0.54);
  p.lineTo(-0.22, 0.54);
  p.bezierCurveTo(-0.11, 0.48, -0.05, 0.4, -0.04, 0.27);
  p.bezierCurveTo(-0.075, 0.33, -0.14, 0.37, -0.235, 0.37);
  p.bezierCurveTo(-0.37, 0.37, -0.5, 0.27, -0.5, 0.08);
  p.bezierCurveTo(-0.5, -0.18, -0.12, -0.38, 0, -0.54);
  p.closePath();
  return p;
}

function diamondPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.56);
  p.quadraticCurveTo(0.2, -0.24, 0.42, 0);
  p.quadraticCurveTo(0.2, 0.24, 0, 0.56);
  p.quadraticCurveTo(-0.2, 0.24, -0.42, 0);
  p.quadraticCurveTo(-0.2, -0.24, 0, -0.56);
  p.closePath();
  return p;
}

function clubPath(): Path2D {
  const p = new Path2D();
  const r = 0.228;
  const circle = (x: number, y: number, rad: number) => {
    p.moveTo(x + rad, y);
    p.arc(x, y, rad, 0, Math.PI * 2);
    p.closePath();
  };
  circle(0, -0.27, r);
  circle(-0.265, 0.07, r);
  circle(0.265, 0.07, r);
  circle(0, 0.0, 0.17);
  // sap: dairelerle aynı yönde (saat yönü) çizilir ki nonzero dolguda delik kalmasın
  p.moveTo(0.055, 0.0);
  p.bezierCurveTo(0.05, 0.3, 0.1, 0.46, 0.22, 0.54);
  p.lineTo(-0.22, 0.54);
  p.bezierCurveTo(-0.1, 0.46, -0.05, 0.3, -0.055, 0.0);
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

/** Dilimli (şemse) elips: kenarı n dilimli, dışa doğru taşan oval madalyon. */
function lobedEllipse(rx: number, ry: number, n: number, depth: number, a0 = 0, a1 = Math.PI * 2): Path2D {
  const p = new Path2D();
  const steps = Math.max(24, Math.round(n * 10 * ((a1 - a0) / (Math.PI * 2))));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const k = 1 - depth + depth * Math.abs(Math.sin((a * n) / 2));
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

interface Shapes {
  suit: Record<Suit, Path2D>;
  tulip: Path2D;
  shemse: Path2D; // arka yüz orta madalyonu (birim: yarıçaplar 1 × 1.4)
  shemseIn: Path2D;
  corner: Path2D; // köşebent (çeyrek şemse)
  cornerIn: Path2D;
}

function makeShapes(): Shapes {
  return {
    suit: {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()},
    tulip: tulipPath(),
    shemse: lobedEllipse(1, 1.4, 18, 0.1),
    shemseIn: lobedEllipse(0.78, 1.14, 18, 0.07),
    corner: (() => {
      const q = lobedEllipse(1, 1, 10, 0.12, 0, Math.PI / 2);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.addPath(q);
      return p;
    })(),
    cornerIn: lobedEllipse(0.68, 0.68, 10, 0.1, 0, Math.PI / 2),
  };
}

// ───────────────────────── yazı ölçümü ─────────────────────────
interface Glyph {
  ch: string;
  font: string;
  x: number; // etiketin sol mürekkep kenarından (ölçeklenmemiş) çizim noktası
  base: number; // etiketin üstünden baseline'a uzaklık
}
interface Label {
  glyphs: Glyph[];
  scaleX: number;
  width: number; // ölçeklenmiş mürekkep genişliği
}

/** Her karakter kendi mürekkep yüksekliğiyle capH'a oturur (rakam/harf boyları birebir eşit olur). */
function layoutLabel(ctx: Ctx, text: string, capH: number, maxW: number, track: number): Label {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const parts = [...text].map((ch) => {
    ctx.font = `400 100px ${FONT}`;
    const asc = ctx.measureText(ch).actualBoundingBoxAscent || 72;
    const size = (capH / asc) * 100;
    const font = `400 ${size.toFixed(3)}px ${FONT}`;
    ctx.font = font;
    const m = ctx.measureText(ch);
    return {ch, font, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, base: m.actualBoundingBoxAscent};
  });
  const gap = track * capH;
  const total = parts.reduce((s, q) => s + q.l + q.r, 0) + gap * (parts.length - 1);
  const scaleX = Math.min(1, maxW / total);
  let x = 0;
  const glyphs = parts.map((q) => {
    const g = {ch: q.ch, font: q.font, x: x + q.l, base: q.base};
    x += q.l + q.r + gap;
    return g;
  });
  return {glyphs, scaleX, width: total * scaleX};
}

/** Etiketi, mürekkebinin sol üstü (left, top) olacak şekilde çizer. */
function drawLabel(ctx: Ctx, L: Label, left: number, top: number, fill: Fill): void {
  ctx.save();
  ctx.translate(left, top);
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
  portraits: Partial<Record<Court, HTMLImageElement>>;
  back: HTMLImageElement | null;
  aceSpade: HTMLImageElement | null;
}

interface Ink {
  grad: CanvasGradient; // birim uzayda (takım şekli) dikey gradyan
  text: CanvasGradient; // indeks rakamı için (tasarım uzayında, IDX.top..+capH)
  flat: string;
  rim: string; // koyu iç kenar
}

interface Kit {
  ctx: Ctx;
  shapes: Shapes;
  labels: Label[]; // rank → indeks etiketi
  titles: Record<Court, Label>; // kurdele yazıları
  bigLetters: Record<Court, Label>; // portre yoksa yedek büyük harf
  ink: Record<'red' | 'black', Ink>;
  shade: Record<Suit, HTMLCanvasElement>; // takım şekli yumuşak gölge sprite'ı (birim kutu ±SPR)
  winShade: HTMLCanvasElement; // portre penceresi gölgesi
  gold: CanvasGradient; // tasarım uzayında çapraz metalik altın
  art: Art;
}

const SPR = 0.8; // gölge sprite'ının birim kutu yarı genişliği

function goldGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fff1b8');
  g.addColorStop(0.28, '#f0c95a');
  g.addColorStop(0.55, '#c8901f');
  g.addColorStop(0.8, '#e9bd4e');
  g.addColorStop(1, '#9a6512');
  return g;
}

const GOLD_DARK = '#5a3606';

// ───────────────────────── sprite'lar (bir kez çizilir, drawImage ile kopyalanır) ─────────────────────────
/** Şeklin bulanık gölgesini (yalnız gölge, şeklin kendisi değil) ayrı bir tuvale çizer. */
function blurSprite(path: Path2D, boxW: number, boxH: number, pxPerUnit: number, blurUnits: number, color: string, ox = 0, oy = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(boxW * pxPerUnit));
  c.height = Math.max(2, Math.ceil(boxH * pxPerUnit));
  const g = c.getContext('2d')!;
  const far = 10000;
  g.shadowColor = color;
  g.shadowBlur = blurUnits * pxPerUnit;
  g.shadowOffsetX = far;
  g.translate(c.width / 2 - far, c.height / 2);
  g.scale(pxPerUnit, pxPerUnit);
  g.translate(ox, oy);
  g.fillStyle = '#000';
  g.fill(path);
  return c;
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
      d[o] = 110; d[o + 1] = 80; d[o + 2] = 40;
      d[o + 3] = Math.round((0.5 - v) * 30);
    } else {
      d[o] = 255; d[o + 1] = 253; d[o + 2] = 245;
      d[o + 3] = Math.round((v - 0.5) * 34);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Fildişi kâğıt: çok hafif sıcak gradyan + doku + kenarlarda yumuşak iç gölge + ince altın iç çizgi.
 *  Bir hücre boyutunda (2 px taşmalı) bir kez çizilir, her yüze tam piksel konumda kopyalanır. */
function makePaperTile(cw: number, ch: number, grain: HTMLCanvasElement): HTMLCanvasElement {
  const w = Math.ceil(cw) + 2, h = Math.ceil(ch) + 2;
  const s = cw / UW;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true})!;
  const lg = g.createLinearGradient(0, 0, cw * 0.55, ch);
  lg.addColorStop(0, '#fffdf7');
  lg.addColorStop(0.5, '#fbf5e8');
  lg.addColorStop(1, '#f1e6cf');
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  // üstten yumuşak ışık
  const v = g.createRadialGradient(cw * 0.35, ch * 0.22, cw * 0.05, cw * 0.45, ch * 0.4, ch * 0.85);
  v.addColorStop(0, 'rgba(255,255,255,0.65)');
  v.addColorStop(0.5, 'rgba(255,253,246,0)');
  v.addColorStop(1, 'rgba(150,105,45,0.10)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.45;
  g.fillStyle = g.createPattern(grain, 'repeat')!;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  // iç gölge: kart şeklinin dışını doldur, gölgesi içeri düşsün (kalın karton hissi)
  const card = new Path2D();
  rrect(card, 0, 0, cw, ch, CR * s);
  const ring = new Path2D();
  ring.rect(-40 * s, -40 * s, cw + 80 * s, ch + 80 * s);
  ring.addPath(card);
  g.save();
  g.clip(card);
  g.shadowColor = 'rgba(110,72,26,0.42)';
  g.shadowBlur = 3.6 * s;
  g.fillStyle = '#000';
  g.fill(ring, 'evenodd');
  g.restore();
  // ince altın iç çizgi (+ altında çok ince koyu gölge çizgisi: kabartma hissi)
  g.save();
  g.scale(s, (ch / UH));
  const border = insetPath(BORDER, CR - BORDER + 0.6);
  g.translate(0, 0.35);
  g.strokeStyle = 'rgba(120,80,20,0.22)';
  g.lineWidth = 0.9;
  g.stroke(border);
  g.translate(0, -0.35);
  g.strokeStyle = goldGradient(g, 0, 0, UW, UH);
  g.lineWidth = 0.95;
  g.stroke(border);
  g.restore();
  return c;
}

// ───────────────────────── parlak takım işareti ─────────────────────────
// Speküler parıltının yeri (birim uzay): her şeklin sol üst omzu
const SPEC: Record<Suit, [number, number, number]> = {
  H: [-0.27, -0.3, -0.6],
  S: [-0.2, -0.06, -0.9],
  D: [-0.12, -0.24, -1.0],
  C: [-0.07, -0.36, -0.5],
};

/** Parlak, tok takım işareti: yumuşak gölge + dikey gradyan + koyu iç kenar + üst parlama + küçük speküler nokta. */
function glossSuit(k: Kit, suit: Suit, x: number, y: number, w: number, shadow = true): void {
  const {ctx} = k;
  const path = k.shapes.suit[suit];
  const ink = k.ink[isRed(suit) ? 'red' : 'black'];
  if (shadow) {
    const sw = SPR * 2 * w;
    ctx.drawImage(k.shade[suit], x - sw / 2, y - sw / 2 + w * 0.035, sw, sw);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.fillStyle = ink.grad;
  ctx.fill(path);
  ctx.clip(path);
  // koyu iç kenar (yalnız şeklin içinde kalan yarısı görünür)
  ctx.strokeStyle = ink.rim;
  ctx.lineWidth = 0.075;
  ctx.stroke(path);
  // üst yarıda yumuşak parlama
  ctx.translate(0, -0.035);
  ctx.scale(0.86, 0.8);
  const gl = ctx.createLinearGradient(0, -0.62, 0, 0.1);
  gl.addColorStop(0, isRed(suit) ? 'rgba(255,215,215,0.55)' : 'rgba(200,210,235,0.38)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fill(path);
  ctx.restore();
  // speküler nokta
  const [sx, sy, rot] = SPEC[suit];
  ctx.save();
  ctx.translate(x + sx * w, y + sy * w);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ellipse(ctx, 0, 0, w * 0.075, w * 0.034);
  ctx.fill();
  ctx.restore();
}

/** Düz (gradyanlı) küçük takım işareti — indeksler için; ince ayrıntı yok, küçük boyda keskin kalır. */
function flatSuit(k: Kit, suit: Suit, x: number, y: number, w: number): void {
  const {ctx} = k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.fillStyle = k.ink[isRed(suit) ? 'red' : 'black'].grad;
  ctx.fill(k.shapes.suit[suit]);
  ctx.restore();
}

// ───────────────────────── indeksler ─────────────────────────
function indexBlock(k: Kit, rank: number, suit: Suit, withPip: boolean): void {
  const {ctx} = k;
  const ink = k.ink[isRed(suit) ? 'red' : 'black'];
  const L = k.labels[rank];
  const wide = L.width > IDX.maxW + 0.01;
  const left = wide ? IDX.left : IDX.cx - L.width / 2;
  // tok baskı: altta koyu "kalınlık" kopyası, üstte gradyan
  ctx.save();
  ctx.translate(0, 0.9);
  drawLabel(ctx, L, left, IDX.top, ink.rim);
  ctx.restore();
  drawLabel(ctx, L, left, IDX.top, ink.text);
  if (withPip) flatSuit(k, suit, IDX.cx, PIP_CY, IDX.pipW);
}

function indexCorners(k: Kit, rank: number, suit: Suit, mini: boolean): void {
  const {ctx} = k;
  indexBlock(k, rank, suit, rank < 11);
  if (!mini) return;
  ctx.save();
  ctx.translate(UW, UH);
  ctx.rotate(Math.PI);
  ctx.translate(MINI.x - IDX.left * MINI.s, MINI.y - IDX.top * MINI.s);
  ctx.scale(MINI.s, MINI.s);
  indexBlock(k, rank, suit, true);
  ctx.restore();
}

// ───────────────────────── sayı kartları ─────────────────────────
function numberCard(k: Kit, suit: Suit): void {
  const w = suit === 'D' ? BIG.w * 1.04 : BIG.w;
  glossSuit(k, suit, BIG.cx, BIG.cy + (suit === 'C' ? -0.6 : 0), w);
}

// ───────────────────────── aslar ─────────────────────────
function aceCard(k: Kit, suit: Suit): void {
  const {ctx} = k;
  const {cx, cy, r} = ACE;
  // sıcak altın ışıltı
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.55);
  glow.addColorStop(0, 'rgba(244,196,90,0.38)');
  glow.addColorStop(1, 'rgba(244,196,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
  ctx.fill();
  // güneş ışınları (16 kalın üçgen)
  ctx.save();
  ctx.translate(cx, cy);
  const ray = goldGradient(ctx, -r, -r * 1.4, r, r * 1.4);
  ctx.fillStyle = ray;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 8 + Math.PI / 16);
    const long = i % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(-2.3, -r + 1);
    ctx.lineTo(0, -r - (long ? 9.5 : 6));
    ctx.lineTo(2.3, -r + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // madalyon: koyu dış çizgi → altın halka → krem iç disk → ince altın iç halka
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy + 0.7, r + 0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90,55,10,0.28)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, cx - r, cy - r, cx + r * 0.6, cy + r);
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  const disk = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.35, 1, cx, cy, r);
  disk.addColorStop(0, '#fffdf5');
  disk.addColorStop(0.7, '#f7eedb');
  disk.addColorStop(1, '#e6d3ad');
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3.4, 0, Math.PI * 2);
  ctx.fillStyle = disk;
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5.2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,150,50,0.85)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // halka üzerinde inciler
  ctx.fillStyle = '#fff6dc';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (r - 1.7), cy + Math.sin(a) * (r - 1.7), 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (suit === 'S') {
    if (k.art.aceSpade) return drawContain(ctx, k.art.aceSpade, cx, cy, r * 2.2, r * 2.4);
    return aceOfSpades(k);
  }
  const w = suit === 'D' ? 37 : suit === 'C' ? 35.5 : 36;
  glossSuit(k, suit, cx, cy + (suit === 'H' ? 0.6 : 0), w);
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

/** Maça ası: halkadan taşan büyük maça + altın iç çizgi ve rumi kıvrımlar. */
function aceOfSpades(k: Kit): void {
  const {ctx} = k;
  const sw = 46, sx = ACE.cx, sy = ACE.cy - 1;
  glossSuit(k, 'S', sx, sy, sw);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(sw, sw);
  // altın iç kontur
  ctx.save();
  ctx.translate(0, 0.01);
  ctx.scale(0.86, 0.86);
  ctx.strokeStyle = goldGradient(ctx, -0.5, -0.5, 0.3, 0.5);
  ctx.lineWidth = 0.9 / (sw * 0.86);
  ctx.stroke(k.shapes.suit.S);
  ctx.restore();
  const gold = goldGradient(ctx, -0.4, -0.45, 0.3, 0.4);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 0.95 / sw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const m of [-1, 1] as const) {
    ctx.save();
    ctx.scale(m, 1);
    ctx.beginPath();
    ctx.moveTo(0.02, 0.22);
    ctx.bezierCurveTo(0.12, 0.23, 0.3, 0.18, 0.32, 0.05);
    ctx.bezierCurveTo(0.34, -0.04, 0.27, -0.1, 0.2, -0.06);
    curl(ctx, 0.235, 0.0, 0.065, -2.2, 1.15, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.03, -0.02);
    ctx.bezierCurveTo(0.1, -0.06, 0.16, -0.14, 0.12, -0.22);
    curl(ctx, 0.085, -0.19, 0.04, -0.3, 1.1, -1);
    ctx.stroke();
    for (const [x, y, a] of [[0.17, 0.2, -0.5], [0.29, 0.12, -1.2], [0.07, -0.08, -2.4]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0.045, -0.03, 0.09, 0);
      ctx.quadraticCurveTo(0.045, 0.03, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // orta lale ve sap
  ctx.save();
  ctx.translate(0, -0.2);
  ctx.scale(0.21, 0.21);
  ctx.fill(k.shapes.tulip);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -0.1);
  ctx.lineTo(0, 0.24);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0.28, 0.025, 0, Math.PI * 2);
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

/** Kare portreyi pencereye kırpar: spec.cx/cy pencere merkezine, spec.w görünen genişliğe; kenarlardan taşmaz. */
function drawPortrait(ctx: Ctx, img: HTMLImageElement, spec: PortraitSpec, dst: Rect): void {
  const W = img.naturalWidth, H = img.naturalHeight;
  let w = Math.min(W, spec.w * W);
  let h = (w * dst.h) / dst.w;
  if (h > H) {
    h = H;
    w = (h * dst.w) / dst.h;
  }
  const x = Math.max(0, Math.min(W - w, spec.cx * W - w / 2));
  const y = Math.max(0, Math.min(H - h, spec.cy * H - h / 2));
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h, dst.x, dst.y, dst.w, dst.h);
  ctx.restore();
}

// ───────────────────────── saray kartı amblemleri (sağ üst) ─────────────────────────
function outlineFill(ctx: Ctx, p: Path2D, fill: Fill, lw: number): void {
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
}

function gem(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: Accent): void {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0.1, x, y, Math.max(rx, ry));
  g.addColorStop(0, a.light);
  g.addColorStop(0.6, a.base);
  g.addColorStop(1, a.dark);
  ctx.beginPath();
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.55;
  ctx.stroke();
  ctx.beginPath();
  ellipse(ctx, x - rx * 0.32, y - ry * 0.35, rx * 0.3, ry * 0.22);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

function pearl(ctx: Ctx, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.05, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e3d2b0');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/** Papaz tacı: beş uçlu, inci uçlu, taşlı bant. (0,0) = bandın alt ortası. */
function kingCrown(ctx: Ctx, a: Accent): void {
  const gold = goldGradient(ctx, -14, -24, 10, 2);
  const body = new Path2D();
  body.moveTo(-15, -6);
  body.lineTo(-18, -21);
  body.quadraticCurveTo(-12.5, -14.5, -8.5, -13.5);
  body.lineTo(0, -25);
  body.lineTo(8.5, -13.5);
  body.quadraticCurveTo(12.5, -14.5, 18, -21);
  body.lineTo(15, -6);
  body.closePath();
  const band = rrectPath(-16.5, -8.2, 33, 8.2, 2);
  ctx.save();
  outlineFill(ctx, body, gold, 2.2);
  outlineFill(ctx, band, gold, 2.2);
  ctx.fillStyle = gold;
  ctx.fill(body);
  // bant üst parıltısı
  ctx.fillStyle = 'rgba(255,250,220,0.55)';
  ctx.fillRect(-15, -7.2, 30, 1.3);
  // taç gövdesi iç gölgesi (derinlik)
  ctx.fillStyle = 'rgba(120,70,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(-14.6, -8.2);
  ctx.lineTo(-16.2, -17);
  ctx.quadraticCurveTo(-12, -11.5, -8.5, -11);
  ctx.lineTo(0, -21);
  ctx.lineTo(0, -8.2);
  ctx.closePath();
  ctx.fill();
  pearl(ctx, -18, -22, 2.1);
  pearl(ctx, 18, -22, 2.1);
  pearl(ctx, 0, -26.5, 2.3);
  gem(ctx, 0, -4.1, 3.4, 2.5, a);
  gem(ctx, -9.5, -4.1, 1.8, 1.8, a);
  gem(ctx, 9.5, -4.1, 1.8, 1.8, a);
  ctx.restore();
}

/** Kız: lale taç (ortada büyük lale, yanlarda yapraklar, incili bant). (0,0) = bandın alt ortası. */
function queenTiara(k: Kit, a: Accent): void {
  const {ctx} = k;
  const gold = goldGradient(ctx, -14, -26, 10, 2);
  ctx.save();
  // yan yapraklar
  for (const m of [-1, 1]) {
    const leaf = new Path2D();
    leaf.moveTo(m * 2, -5);
    leaf.bezierCurveTo(m * 9, -6, m * 15, -10, m * 17.5, -19);
    leaf.bezierCurveTo(m * 12, -14.5, m * 7, -12, m * 1.5, -11);
    leaf.closePath();
    outlineFill(ctx, leaf, gold, 2);
  }
  // orta lale
  const tul = new Path2D();
  tul.addPath(k.shapes.tulip, new DOMMatrix([16, 0, 0, 16, 0, -16]));
  outlineFill(ctx, tul, gold, 2.2);
  ctx.fillStyle = gold;
  ctx.fill(tul);
  // lale içi taç yaprağı (takım rengi)
  const inner = new Path2D();
  inner.moveTo(0, -11.5);
  inner.bezierCurveTo(-2.6, -15, -2.2, -21, 0, -24.5);
  inner.bezierCurveTo(2.2, -21, 2.6, -15, 0, -11.5);
  ctx.fillStyle = a.base;
  ctx.fill(inner);
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.5;
  ctx.stroke(inner);
  // bant
  const band = new Path2D();
  band.moveTo(-15, -2);
  band.quadraticCurveTo(0, -11, 15, -2);
  band.lineTo(15, 2.5);
  band.quadraticCurveTo(0, -6.5, -15, 2.5);
  band.closePath();
  outlineFill(ctx, band, gold, 2);
  ctx.fillStyle = gold;
  ctx.fill(band);
  for (const t of [-0.8, -0.4, 0.4, 0.8]) {
    const x = t * 15;
    const y = -2 + 0.25 + (1 - t * t) * -4.5 + 2.2;
    pearl(ctx, x, y, 1.35);
  }
  gem(ctx, 0, -4.2, 2.6, 2.6, a);
  ctx.restore();
}

/** Vale: sorguçlu kalpak (kubbe + kıvrık siper + takım renginde tüy). (0,0) = siperin alt ortası. */
function jackCap(ctx: Ctx, a: Accent): void {
  const gold = goldGradient(ctx, -14, -24, 10, 2);
  ctx.save();
  // tüy (arkada)
  const plume = new Path2D();
  plume.moveTo(3, -15);
  plume.bezierCurveTo(4, -22, 10, -28, 19, -29);
  plume.bezierCurveTo(15, -25, 14.5, -21, 15.5, -17);
  plume.bezierCurveTo(12, -15, 8, -13.5, 5, -12);
  plume.closePath();
  const pg = ctx.createLinearGradient(4, -29, 14, -12);
  pg.addColorStop(0, a.light);
  pg.addColorStop(0.55, a.base);
  pg.addColorStop(1, a.dark);
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke(plume);
  ctx.fillStyle = pg;
  ctx.fill(plume);
  ctx.strokeStyle = 'rgba(255,240,200,0.7)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(5.5, -13.5);
  ctx.bezierCurveTo(7, -20, 11, -25, 17, -27.5);
  ctx.stroke();
  // kubbe
  const dome = new Path2D();
  dome.moveTo(-12, -6);
  dome.bezierCurveTo(-13, -16, -6, -21.5, 0, -21.5);
  dome.bezierCurveTo(6, -21.5, 13, -16, 12, -6);
  dome.closePath();
  const dg = ctx.createLinearGradient(0, -22, 0, -6);
  dg.addColorStop(0, a.light);
  dg.addColorStop(0.5, a.base);
  dg.addColorStop(1, a.dark);
  outlineFill(ctx, dome, dg, 2.2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ellipse(ctx, -4.5, -15.5, 4, 2.4, -0.5);
  ctx.fill();
  // siper (altın, kıvrık)
  const brim = new Path2D();
  brim.moveTo(-17, -6.5);
  brim.quadraticCurveTo(0, -11, 17, -6.5);
  brim.quadraticCurveTo(18.5, -2, 15, 0);
  brim.quadraticCurveTo(0, -4, -15, 0);
  brim.quadraticCurveTo(-18.5, -2, -17, -6.5);
  brim.closePath();
  outlineFill(ctx, brim, gold, 2.2);
  ctx.fillStyle = gold;
  ctx.fill(brim);
  // broş
  gem(ctx, 3.5, -10.5, 2.6, 3, {light: '#fff4c8', base: '#e3b13c', dark: '#8a5a0c'});
  ctx.restore();
}

// ───────────────────────── saray kartları ─────────────────────────
function ribbon(k: Kit, a: Accent, title: Label): void {
  const {ctx} = k;
  const {cx, cy, w, h} = RIB;
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const tail = 9, drop = 3.6, notch = 3.4;
  ctx.save();
  ctx.lineJoin = 'round';
  // kuyruklar (arkada, koyu)
  for (const m of [-1, 1]) {
    const xe = m < 0 ? x0 : x1;
    const t = new Path2D();
    t.moveTo(xe + m * -4, y0 + drop);
    t.lineTo(xe + m * tail, y0 + drop);
    t.lineTo(xe + m * (tail - notch), (y0 + y1) / 2 + drop);
    t.lineTo(xe + m * tail, y1 + drop);
    t.lineTo(xe + m * -4, y1 + drop);
    t.closePath();
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = 1.4;
    ctx.stroke(t);
    ctx.fillStyle = a.dark;
    ctx.fill(t);
    // kıvrım üçgeni
    ctx.beginPath();
    ctx.moveTo(xe, y1);
    ctx.lineTo(xe + m * -4, y1 + drop);
    ctx.lineTo(xe, y1 + drop);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
  }
  // ana bant (hafif kemerli)
  const bow = 1.6;
  const band = new Path2D();
  band.moveTo(x0, y0);
  band.quadraticCurveTo(cx, y0 - bow, x1, y0);
  band.lineTo(x1, y1);
  band.quadraticCurveTo(cx, y1 - bow, x0, y1);
  band.closePath();
  const bg = ctx.createLinearGradient(0, y0, 0, y1);
  bg.addColorStop(0, a.light);
  bg.addColorStop(0.45, a.base);
  bg.addColorStop(1, a.dark);
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 1.6;
  ctx.stroke(band);
  ctx.fillStyle = bg;
  ctx.fill(band);
  // altın kenar çizgileri
  ctx.strokeStyle = k.gold;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(x0 + 1, y0 + 1.5);
  ctx.quadraticCurveTo(cx, y0 - bow + 1.5, x1 - 1, y0 + 1.5);
  ctx.moveTo(x0 + 1, y1 - 1.5);
  ctx.quadraticCurveTo(cx, y1 - bow - 1.5, x1 - 1, y1 - 1.5);
  ctx.stroke();
  // yazı
  const ty = cy - bow * 0.5 - 4.1;
  ctx.save();
  ctx.translate(0, 0.8);
  drawLabel(ctx, title, cx - title.width / 2, ty, 'rgba(20,6,2,0.55)');
  ctx.restore();
  const tg = ctx.createLinearGradient(0, ty, 0, ty + 8.2);
  tg.addColorStop(0, '#fffbea');
  tg.addColorStop(1, '#f4d98c');
  drawLabel(ctx, title, cx - title.width / 2, ty, tg);
  ctx.restore();
}

function courtCard(k: Kit, rank: Court, suit: Suit): void {
  const {ctx} = k;
  const a = ACCENT[suit];
  const sheet = k.art.courts[rank];
  const img = k.art.portraits[rank];
  const win: Rect = {x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h};
  const winPath = rrectPath(WIN.x, WIN.y, WIN.w, WIN.h, WIN.r);

  // pencere gölgesi
  ctx.drawImage(k.winShade, WIN.x - 6, WIN.y - 6 + 1.4, WIN.w + 12, WIN.h + 12);

  // portre
  ctx.save();
  ctx.clip(winPath);
  const bg = ctx.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
  bg.addColorStop(0, a.base);
  bg.addColorStop(1, a.dark);
  ctx.fillStyle = bg;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  if (sheet) drawCover(ctx, sheet.img, sheet.rects[suit], win);
  else if (img) drawPortrait(ctx, img, PORTRAITS[rank], win);
  else courtFallback(k, rank, a);
  // takım renginde kenar vinyeti + üstte cam parıltısı
  const vg = ctx.createRadialGradient(WIN.x + WIN.w * 0.58, WIN.y + WIN.h * 0.45, WIN.h * 0.3, WIN.x + WIN.w * 0.5, WIN.y + WIN.h * 0.5, WIN.w * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, a.dark);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = vg;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.globalAlpha = 1;
  const sh = ctx.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w * 0.5, WIN.y + WIN.h * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,0.22)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sh.addColorStop(0.51, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.restore();

  // altın çift çerçeve: koyu dış hat, kalın altın, takım renginde şerit, ince altın iç hat
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 4.4;
  ctx.stroke(winPath);
  ctx.strokeStyle = k.gold;
  ctx.lineWidth = 3;
  ctx.stroke(winPath);
  ctx.strokeStyle = 'rgba(255,248,214,0.55)';
  ctx.lineWidth = 0.5;
  ctx.stroke(rrectPath(WIN.x - 0.8, WIN.y - 0.8, WIN.w + 1.6, WIN.h + 1.6, WIN.r + 0.8));
  const inner = rrectPath(WIN.x + 2.4, WIN.y + 2.4, WIN.w - 4.8, WIN.h - 4.8, WIN.r - 2);
  ctx.strokeStyle = a.base;
  ctx.lineWidth = 1.4;
  ctx.stroke(inner);
  ctx.strokeStyle = k.gold;
  ctx.lineWidth = 0.55;
  ctx.stroke(rrectPath(WIN.x + 3.4, WIN.y + 3.4, WIN.w - 6.8, WIN.h - 6.8, WIN.r - 3));
  ctx.restore();

  // taç / lale taç / kalpak: pencerenin üst kenarına oturur
  ctx.save();
  ctx.translate(CROWN.cx, CROWN.cy);
  if (rank === 13) kingCrown(ctx, a);
  else if (rank === 12) queenTiara(k, a);
  else jackCap(ctx, a);
  ctx.restore();

  ribbon(k, a, k.titles[rank]);

  // indeksin takım işareti: pencere köşesine taşan rozet
  const bx = IDX.cx, by = PIP_CY + 0.6, br = 11.2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by + 0.9, br + 1.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40,20,4,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, br + 1.2, 0, Math.PI * 2);
  ctx.fillStyle = GOLD_DARK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, bx - br, by - br, bx + br * 0.5, by + br);
  ctx.fill();
  const d = ctx.createRadialGradient(bx - 3, by - 4, 0.5, bx, by, br);
  d.addColorStop(0, '#ffffff');
  d.addColorStop(1, '#f1e4c6');
  ctx.beginPath();
  ctx.arc(bx, by, br - 2.1, 0, Math.PI * 2);
  ctx.fillStyle = d;
  ctx.fill();
  ctx.restore();
  glossSuit(k, suit, bx, by + (suit === 'H' ? 0.4 : 0), suit === 'D' ? 13.6 : 12.6, false);
}

function courtFallback(k: Kit, rank: Court, a: Accent): void {
  // Portre yüklenemezse: takım renginde zemin + ışık + büyük altın harf
  const {ctx} = k;
  const lg = ctx.createRadialGradient(WIN.x + WIN.w * 0.55, WIN.y + WIN.h * 0.35, 2, WIN.x + WIN.w * 0.5, WIN.y + WIN.h * 0.5, WIN.w * 0.7);
  lg.addColorStop(0, a.light);
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = lg;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.globalAlpha = 1;
  const L = k.bigLetters[rank];
  const top = WIN.y + 14;
  const left = WIN.x + WIN.w * 0.56 - L.width / 2;
  ctx.save();
  ctx.translate(0.8, 1.6);
  drawLabel(ctx, L, left, top, 'rgba(0,0,0,0.45)');
  ctx.restore();
  drawLabel(ctx, L, left, top, goldGradient(ctx, 0, top, 0, top + 44));
}

// ───────────────────────── kart arkası ─────────────────────────
/** Ogee (soğan kubbe) kafes: her sütunda karşılıklı iki sinüs eğrisi; komşu sütunlar teğet buluşur. */
function ogeeLattice(S: number, P: number): Path2D {
  const p = new Path2D();
  const A = S / 2;
  const n = 16; // yarım periyot başına parça
  const y0 = CY - P * Math.ceil(CY / P + 1), y1 = CY + P * Math.ceil(CY / P + 1);
  for (let c = CX - S * Math.ceil(CX / S + 1); c <= UW + S; c += S) {
    for (const sg of [1, -1]) {
      for (let y = y0, i = 0; y <= y1 + 1e-6; y += P / (2 * n), i++) {
        const x = c + sg * A * Math.sin((2 * Math.PI * (y - CY)) / P);
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
    }
  }
  return p;
}

function cardBack(k: Kit, lattice: Path2D): void {
  // Fildişi ince kenar (kâğıt zemin) → altın hat → bordo alan, altın ogee kafes, şemse, salbek ve köşebentler
  const {ctx, shapes} = k;
  const OUT = 3.2, IN = 9.6;
  const panel = insetPath(OUT, CR - OUT + 0.6);
  const g = ctx.createRadialGradient(CX, CY - 12, 6, CX, CY, 92);
  g.addColorStop(0, '#7a1630');
  g.addColorStop(0.45, '#5a0f1f');
  g.addColorStop(1, '#350711');
  ctx.fillStyle = g;
  ctx.fill(panel);

  const field = insetPath(IN, 2.4);
  const gold = goldGradient(ctx, 0, 0, UW, UH);
  // kafes (alan içinde)
  ctx.save();
  ctx.clip(field);
  ctx.strokeStyle = 'rgba(232,190,96,0.36)';
  ctx.lineWidth = 0.75;
  ctx.stroke(lattice);
  // düğüm noktaları (eğrilerin kesiştiği yerler)
  ctx.fillStyle = 'rgba(240,200,110,0.6)';
  const S = 16, P = 23;
  for (let j = -6; j <= 6; j++) {
    for (let i = -4; i <= 4; i++) {
      const x = CX + i * S, y = CY + (j * P) / 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 1.5);
      ctx.lineTo(x + 1.05, y);
      ctx.lineTo(x, y + 1.5);
      ctx.lineTo(x - 1.05, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // kenar karartma (madalyon öne çıksın)
  const vg = ctx.createRadialGradient(CX, CY, 18, CX, CY, 80);
  vg.addColorStop(0, 'rgba(60,4,14,0)');
  vg.addColorStop(1, 'rgba(30,2,8,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, UW, UH);
  ctx.restore();

  // bordür bandı: dış kalın altın, ince altın, iç altın
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.stroke(panel);
  ctx.lineWidth = 0.45;
  ctx.stroke(insetPath(OUT + 2.6, 4));
  ctx.lineWidth = 1.1;
  ctx.stroke(field);
  ctx.restore();

  // köşebentler (çeyrek şemse)
  for (const [x, y, rot] of [[IN, IN, 0], [UW - IN, IN, Math.PI / 2], [UW - IN, UH - IN, Math.PI], [IN, UH - IN, -Math.PI / 2]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(17, 17);
    ctx.fillStyle = gold;
    ctx.fill(shapes.corner);
    ctx.fillStyle = '#4a0a18';
    ctx.fill(shapes.cornerIn);
    ctx.translate(0.24, 0.24);
    ctx.rotate(-Math.PI * 0.75);
    ctx.scale(0.36, 0.36);
    ctx.fillStyle = gold;
    ctx.fill(shapes.tulip);
    ctx.restore();
  }

  // salbekler (şemsenin üstünde ve altında lale damlalar)
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, CY + d * 40.5);
    if (d > 0) ctx.rotate(Math.PI);
    ctx.scale(11, 11);
    ctx.lineWidth = 0.16;
    ctx.strokeStyle = GOLD_DARK;
    ctx.stroke(shapes.tulip);
    ctx.fillStyle = gold;
    ctx.fill(shapes.tulip);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(CX, CY + d * 33.6, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
  }

  // şemse (orta madalyon): gölge, altın dilimli oval, bordo iç, altın lale ve ince halka
  ctx.save();
  ctx.translate(CX, CY);
  ctx.save();
  ctx.translate(0, 1);
  ctx.scale(21, 21);
  ctx.fillStyle = 'rgba(20,0,4,0.5)';
  ctx.fill(shapes.shemse);
  ctx.restore();
  ctx.save();
  ctx.scale(21, 21);
  ctx.fillStyle = goldGradient(ctx, -1, -1.4, 0.8, 1.4);
  ctx.fill(shapes.shemse);
  const ig = ctx.createRadialGradient(0, -0.3, 0.05, 0, 0, 1.2);
  ig.addColorStop(0, '#8a1a36');
  ig.addColorStop(1, '#43091a');
  ctx.fillStyle = ig;
  ctx.fill(shapes.shemseIn);
  ctx.restore();
  ctx.strokeStyle = 'rgba(240,200,110,0.85)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ellipse(ctx, 0, 0, 13.2, 19.6);
  ctx.stroke();
  // orta lale + yan yapraklar
  ctx.fillStyle = gold;
  ctx.save();
  ctx.translate(0, -1.5);
  ctx.scale(15, 15);
  ctx.fill(shapes.tulip);
  ctx.restore();
  for (const m of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(m * 4, 8, m * 8.5, 5, m * 9, -1);
    ctx.bezierCurveTo(m * 6.5, 3, m * 3.5, 5, 0, 5.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-1, 6);
  ctx.lineTo(1, 6);
  ctx.lineTo(0.5, 13);
  ctx.lineTo(-0.5, 13);
  ctx.closePath();
  ctx.fill();
  // lale içi
  ctx.fillStyle = '#5a0f1f';
  ctx.beginPath();
  ctx.moveTo(0, 4.5);
  ctx.bezierCurveTo(-1.6, 1, -1.4, -4, 0, -7.5);
  ctx.bezierCurveTo(1.4, -4, 1.6, 1, 0, 4.5);
  ctx.fill();
  ctx.restore();

  // lake parlaklığı
  ctx.save();
  ctx.clip(panel);
  const sh = ctx.createLinearGradient(0, 0, UW * 0.7, UH * 0.55);
  sh.addColorStop(0, 'rgba(255,235,220,0.13)');
  sh.addColorStop(0.5, 'rgba(255,235,220,0.03)');
  sh.addColorStop(0.5001, 'rgba(255,235,220,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, UW, UH);
  ctx.restore();
}

// ───────────────────────── görseller ─────────────────────────
async function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.decoding = 'async';
  const loaded = new Promise<boolean>((res) => {
    img.onload = () => res(true);
    img.onerror = () => res(false);
  });
  let timer = 0;
  const timeout = new Promise<boolean>((res) => {
    timer = window.setTimeout(() => res(false), timeoutMs);
  });
  img.src = url;
  let ok: boolean;
  try {
    // decode(): görsel çizimden önce çözülmüş olur (ilk drawImage'da takılma yok)
    ok = await Promise.race([img.decode().then(() => true), timeout]);
  } catch {
    ok = await Promise.race([loaded, timeout]);
  }
  clearTimeout(timer);
  return ok && img.naturalWidth > 0 ? img : null;
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
  const load = (u: string | undefined) => (u ? loadImage(u, T) : Promise.resolve(null));
  const [j, q, kk, back, ace, p11, p12, p13] = await Promise.all([
    load(urls.jacks),
    load(urls.queens),
    load(urls.kings),
    load(urls.back),
    load(urls.aceSpade),
    load(portraitUrl(PORTRAITS[11].file)),
    load(portraitUrl(PORTRAITS[12].file)),
    load(portraitUrl(PORTRAITS[13].file)),
  ]);
  const courts: Art['courts'] = {};
  for (const [rank, img] of [[11, j], [12, q], [13, kk]] as const) {
    if (img) courts[rank] = {img, rects: sliceSheet(img)};
  }
  const portraits: Art['portraits'] = {};
  if (p11) portraits[11] = p11;
  if (p12) portraits[12] = p12;
  if (p13) portraits[13] = p13;
  return {courts, portraits, back, aceSpade: ace};
}

// ───────────────────────── fontlar ─────────────────────────
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = document.fonts.load(`400 64px "Lilita One"`, 'AKQJ0123456789PAZVLEI').catch(() => undefined);
  await Promise.race([loads, new Promise((r) => setTimeout(r, 3000))]);
}

// ───────────────────────── atlas ─────────────────────────
function makeInk(ctx: Ctx, top: string, mid: string, bot: string, rim: string): Ink {
  const grad = ctx.createLinearGradient(0, -0.55, 0, 0.55);
  grad.addColorStop(0, top);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, bot);
  const text = ctx.createLinearGradient(0, IDX.top, 0, IDX.top + IDX.capH);
  text.addColorStop(0, top);
  text.addColorStop(0.55, mid);
  text.addColorStop(1, bot);
  return {grad, text, flat: mid, rim};
}

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

  const shapes = makeShapes();
  const labels: Label[] = [];
  for (let r = 1; r <= 13; r++) {
    const t = RANK_LABEL[r];
    labels[r] = layoutLabel(ctx, t, IDX.capH, t.length > 1 ? IDX.maxW10 : IDX.maxW, t.length > 1 ? -0.04 : 0);
  }
  const titles = {} as Record<Court, Label>;
  const bigLetters = {} as Record<Court, Label>;
  for (const r of [11, 12, 13] as const) {
    titles[r] = layoutLabel(ctx, COURT_TITLE[r], 8.2, 52, 0.08);
    bigLetters[r] = layoutLabel(ctx, RANK_LABEL[r], 44, 60, 0);
  }

  const shade = {} as Record<Suit, HTMLCanvasElement>;
  const sprPx = BIG.w * 1.1 * sx; // en büyük kullanımın piksel ölçeği
  for (const s of SUITS) shade[s] = blurSprite(shapes.suit[s], SPR * 2, SPR * 2, sprPx, 0.05, 'rgba(90,50,15,0.42)');
  const winShade = blurSprite(rrectPath(-WIN.w / 2, -WIN.h / 2, WIN.w, WIN.h, WIN.r), WIN.w + 12, WIN.h + 12, sx, 2.2, 'rgba(70,40,10,0.5)');

  const kit: Kit = {
    ctx, shapes, labels, titles, bigLetters, art, shade, winShade,
    ink: {
      red: makeInk(ctx, '#f0304c', '#d0142f', '#a00a22', 'rgba(100,4,18,0.85)'),
      black: makeInk(ctx, '#41444f', '#16171c', '#09090c', 'rgba(0,0,0,0.9)'),
    },
    gold: goldGradient(ctx, 0, 0, UW, UH),
  };
  const lattice = ogeeLattice(16, 23);
  const grainTile = makeGrainTile();
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
        cardBack(kit, lattice);
      } else {
        const suit = SUITS[Math.floor(id / 13)];
        const rank = (id % 13) + 1;
        if (rank === 1) aceCard(kit, suit);
        else if (rank <= 10) numberCard(kit, suit);
        else courtCard(kit, rank as Court, suit);
        indexCorners(kit, rank, suit, rank <= 10);
      }
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  grainTile.width = grainTile.height = 0;
  paperTile.width = paperTile.height = 0;
  return {canvas, width: W, height: H, cellW, cellH};
}
