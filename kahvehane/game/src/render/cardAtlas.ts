// Kart yüzleri ve arka yüz: Canvas 2D ile prosedürel çizilen doku atlası.
// 8 × 7 hücre; hücre indeksi = kart id (0..51), 52 = arka yüz, 53..55 boş (saydam).
// Bütün çizim "tasarım birimi" uzayında yapılır: kart genişliği 100, yüksekliği 100 / 0.7.
// Kart hücreyi kenardan kenara doldurur; yuvarlak köşelerin dışı SAYDAMDIR (2B çizici atlası CSS sprite olarak kullanır).
// Atlasa gölge pişirilmez; kart gölgesini çizici ekler.
//
// Tasarım (v3, "Pişti Arena" — docs/STIL_ARENA.md):
//   · dört renkli deste: kupa al, karo sarı, sinek yeşil, maça mavi. Kalın beyaz kenar, degrade iç panel,
//     sol üstte parlak cam yansıması, ince açık iç çizgi
//   · imza motif: ortada büyük beyaz takım silüeti (koyu kontur + kabartma), içinde takımın koyu renginde dev değer
//   · köşe indeksi: kalın koyu konturlu beyaz değer + beyaz takım işareti; sağ altta 180° döndürülmüş kopya
//     (elde yelpaze açıldığında kartın yalnız sol ≈ %40'ı görünür → indeks iri)
//   · aslar: ışın patlaması üstünde dev beyaz takım işareti; maça ası altın kenarlı, pırıltılı
//   · papaz / kız: silüetin başında altın taç / tiara, içinde K / Q
//   · vale (Pişti'nin güç kartı): gece laciverdi zemin, dört renk çark, dev beyaz "J", takım renginde "VALE" kurdelesi
//   · arka yüz: çivit zemin, silik takım deseni, dört renk halkalı rozet, eğik altın "PİŞTİ" yazısı
//
// Hız: gölge sprite'ları bir kez bulanıklaştırılır; geri kalan her şey vektör (degradeler tasarım uzayında bir kez kurulur).
//
// İsteğe bağlı görsel: assets/cards/back.png varsa arka yüz olarak kullanılır (kenardan kenara, köşeler kırpılır).
import '@fontsource/lilita-one/400.css';
import {SUITS, type Suit} from '../core/types';

export const ATLAS_COLS = 8, ATLAS_ROWS = 7; // 56 hücre
export const CARD_ASPECT = 0.7; // genişlik / yükseklik (hücre ve 3B geometri)
export const BACK_INDEX = 52; // 52 = kart arkası; 53..55 kullanılmıyor (saydam)
export const CORNER_RADIUS = 0.08; // kart GENİŞLİĞİNİN oranı (atlastaki saydam köşe ve 3B geometri)

export interface CardAtlas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
}

/** Görsel URL'leri. Normalde assets/cards klasöründen otomatik bulunur; geliştirme sayfası test için verebilir. */
export interface CardArtUrls {
  back?: string;
}

const ART_FILES = import.meta.glob('../../assets/cards/*.png', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

function discoverArt(): CardArtUrls {
  const out: CardArtUrls = {};
  for (const [path, url] of Object.entries(ART_FILES)) {
    const name = (path.split('/').pop() ?? '').replace(/\.png$/i, '').toLowerCase();
    if (name === 'back') out.back = url;
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
const CR = CORNER_RADIUS * UW; // 8

const FONT = '"Lilita One", "Arial Black", "Segoe UI Black", Impact, sans-serif';

const RIM = 5.5; // beyaz kenar kalınlığı (kart genişliğinin %5.5'i)
const PANEL_R = 5; // renkli iç panelin köşe yarıçapı

const NAVY = '#0a1033'; // lacivert kontur
const GOLD_HI = '#fff3a6';
const GOLD_TOP = '#ffd23f';
const GOLD_BOT = '#ff9f1a';

/** Takım renkleri: light/base/deep panel degradesi, dark kontur ve kabartma, ink silüet içindeki değer. */
interface Pal {
  light: string;
  base: string;
  deep: string;
  dark: string;
  ink: string;
  inkTop: string;
  rgb: string; // ışın / parıltı için "r,g,b"
}
const PAL: Record<Suit, Pal> = {
  H: {light: '#ff6a82', base: '#ff2e4d', deep: '#e8102f', dark: '#b3001f', ink: '#a3001c', inkTop: '#d8183a', rgb: '255,46,77'},
  D: {light: '#ffd23a', base: '#ffb400', deep: '#ff9800', dark: '#c46a00', ink: '#c05200', inkTop: '#f07d00', rgb: '255,180,0'},
  C: {light: '#4fe48c', base: '#16c45b', deep: '#0aa84a', dark: '#087a35', ink: '#066e2f', inkTop: '#0e9944', rgb: '22,196,91'},
  S: {light: '#5d9dff', base: '#1f7bff', deep: '#0f62f0', dark: '#0a3fb0', ink: '#0a3aa6', inkTop: '#1d5fe0', rgb: '31,123,255'},
};
const WHEEL_ORDER: Suit[] = ['S', 'H', 'D', 'C']; // çarkta saat yönünde: mavi, kırmızı, sarı, yeşil

// Köşe indeksi (sol üst; sağ altta 180° döndürülmüş kopya)
const IDX = {
  cx: 19.6, // değerin ve takım işaretinin ekseni
  top: 10, // değer mürekkebinin üstü
  capH: 21, // değer yüksekliği (kart yüksekliğinin ≈ %15'i)
  maxW: 21, // tek karakter için azami genişlik
  maxW10: 22.5, // "10" için azami genişlik (sıkıştırılır)
  gap: 3.6, // değer ile takım işareti arası
  pipW: 13, // takım işareti genişliği
  lw: 4.4, // kontur kalınlığı (yarısı dışarıda görünür)
  drop: 1.4, // alttaki koyu kabartma kayması
};
const PIP_CY = IDX.top + IDX.capH + IDX.gap + IDX.pipW * 0.5;

/** Ortadaki beyaz silüet: w genişlik (tasarım birimi), dy dikey kayma; t* silüet içindeki değerin yeri (birim kutu). */
interface Sil {
  w: number;
  dy: number;
  tcy: number; // değerin büyük harf merkezi (birim)
  cap: number; // değer yüksekliği (birim)
  maxW: number; // değerin azami genişliği (birim)
  head: number; // saray kartında tacın oturduğu üst nokta (birim)
}
const SIL: Record<Suit, Sil> = {
  H: {w: 64, dy: 0, tcy: -0.05, cap: 0.4, maxW: 0.6, head: -0.36},
  D: {w: 70, dy: 0, tcy: 0, cap: 0.36, maxW: 0.5, head: -0.47},
  C: {w: 70, dy: -1.5, tcy: 0.005, cap: 0.325, maxW: 0.58, head: -0.42},
  S: {w: 64, dy: -0.5, tcy: -0.03, cap: 0.39, maxW: 0.6, head: -0.44},
};
const ACE_W: Record<Suit, number> = {H: 70, D: 74, C: 70, S: 70};
const COURT = {scale: 0.9, dy: 8}; // saray kartında silüet biraz küçük ve aşağıda (taca yer)

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

function rrectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  rrect(p, x, y, w, h, r);
  return p;
}

function circle(p: Path2D | Ctx, x: number, y: number, r: number): void {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, Math.PI * 2);
  p.closePath();
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0, genişlik ≈ 1) ─────────────────────────
// Tok, dolgun hatlar: silüetin içine "10" sığacak kadar geniş gövde.
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

function clubPath(): Path2D {
  const p = new Path2D();
  const r = 0.245;
  circle(p, 0, -0.255, r);
  circle(p, -0.255, 0.075, r);
  circle(p, 0.255, 0.075, r);
  // göbek: üç daireyi birleştiren üçgen (saat yönünde, dairelerle aynı yön → nonzero dolguda delik yok)
  p.moveTo(0, -0.255);
  p.lineTo(0.255, 0.075);
  p.lineTo(0, 0.16);
  p.lineTo(-0.255, 0.075);
  p.closePath();
  // sap
  p.moveTo(0.06, 0.0);
  p.bezierCurveTo(0.055, 0.3, 0.11, 0.46, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.11, 0.46, -0.055, 0.3, -0.06, 0.0);
  p.closePath();
  return p;
}

/** 4 köşeli pırıltı yıldızı (birim: yarıçap 1). */
function sparklePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -1);
  p.quadraticCurveTo(0.12, -0.12, 1, 0);
  p.quadraticCurveTo(0.12, 0.12, 0, 1);
  p.quadraticCurveTo(-0.12, 0.12, -1, 0);
  p.quadraticCurveTo(-0.12, -0.12, 0, -1);
  p.closePath();
  return p;
}

/** Papaz tacı (birim: genişlik ≈ 1, bandın altı y = 0, yukarı doğru negatif). */
function kingCrownPath(): Path2D {
  const p = new Path2D();
  p.moveTo(-0.4, 0);
  p.lineTo(-0.44, -0.2);
  p.lineTo(-0.5, -0.6);
  p.lineTo(-0.24, -0.36);
  p.lineTo(0, -0.7);
  p.lineTo(0.24, -0.36);
  p.lineTo(0.5, -0.6);
  p.lineTo(0.44, -0.2);
  p.lineTo(0.4, 0);
  p.closePath();
  circle(p, -0.5, -0.64, 0.085);
  circle(p, 0, -0.75, 0.095);
  circle(p, 0.5, -0.64, 0.085);
  return p;
}

/** Kız tiarası: yay biçimli bant, ortada uzun tepe, yanlarda dilimli kemer. */
function tiaraPath(): Path2D {
  const p = new Path2D();
  p.moveTo(-0.5, -0.02);
  p.quadraticCurveTo(-0.5, -0.24, -0.36, -0.3);
  p.quadraticCurveTo(-0.3, -0.44, -0.18, -0.44);
  p.quadraticCurveTo(-0.1, -0.5, -0.06, -0.56);
  p.quadraticCurveTo(-0.03, -0.66, 0, -0.74);
  p.quadraticCurveTo(0.03, -0.66, 0.06, -0.56);
  p.quadraticCurveTo(0.1, -0.5, 0.18, -0.44);
  p.quadraticCurveTo(0.3, -0.44, 0.36, -0.3);
  p.quadraticCurveTo(0.5, -0.24, 0.5, -0.02);
  p.quadraticCurveTo(0, -0.2, -0.5, -0.02);
  p.closePath();
  return p;
}

interface Shapes {
  suit: Record<Suit, Path2D>;
  sparkle: Path2D;
  crown: Path2D;
  tiara: Path2D;
  panel: Path2D; // renkli iç panel
}

function makeShapes(): Shapes {
  return {
    suit: {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()},
    sparkle: sparklePath(),
    crown: kingCrownPath(),
    tiara: tiaraPath(),
    panel: rrectPath(RIM, RIM, UW - RIM * 2, UH - RIM * 2, PANEL_R),
  };
}

// ───────────────────────── yazı ─────────────────────────
/** Ölçülmüş yazı: büyük harf yüksekliği capH olacak boyda; mürekkebi x = 0'a ortalı. */
interface TextFit {
  text: string;
  font: string;
  sx: number; // yatay sıkıştırma (≤ 1)
  ox: number; // ortalama için çizim noktası kayması (ölçeklenmemiş)
  w: number; // ölçeklenmiş mürekkep genişliği
  capH: number;
}

function fitText(ctx: Ctx, text: string, capH: number, maxW: number, capRatio: number): TextFit {
  const font = `400 ${(capH / capRatio).toFixed(3)}px ${FONT}`;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const l = m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight;
  const w = l + r;
  const sx = Math.min(1, maxW / w);
  return {text, font, sx, ox: (l - r) / 2, w: w * sx, capH};
}

/** Çıkartma yazısı: büyük harf ortası (cx, cy). Önce koyu kabartma kopyası, sonra kalın kontur, en üstte dolgu. */
function stickerText(ctx: Ctx, t: TextFit, cx: number, cy: number, fill: Fill | ((c: Ctx) => Fill), outline: string, lw: number, drop: number, rot = 0): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.translate(0, t.capH / 2);
  ctx.scale(t.sx, 1);
  ctx.font = t.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = lw;
  ctx.strokeStyle = outline;
  if (drop) {
    ctx.fillStyle = outline;
    ctx.strokeText(t.text, t.ox, drop);
    ctx.fillText(t.text, t.ox, drop);
  }
  ctx.strokeText(t.text, t.ox, 0);
  ctx.fillStyle = typeof fill === 'function' ? fill(ctx) : fill;
  ctx.fillText(t.text, t.ox, 0);
  ctx.restore();
}

// ───────────────────────── çizim bağlamı ─────────────────────────
interface Kit {
  ctx: Ctx;
  sx: number; // tasarım birimi başına piksel (yatay / dikey)
  sy: number;
  x0: number; // geçerli hücrenin piksel kökeni
  y0: number;
  card: Path2D; // geçerli hücrenin kart şekli: hücrenin tam piksel sınırlarına oturur (kenarlarda yarı saydam satır kalmaz)
  scratch: HTMLCanvasElement; // ara katman (iç gölge gibi bileşimler için)
  sg: Ctx;
  shapes: Shapes;
  idx: TextFit[]; // rank → köşe indeksi
  mid: Record<Suit, TextFit[]>; // takım → rank → silüet içindeki değer
  midCourt: Record<Suit, TextFit[]>;
  jackJ: TextFit;
  vale: TextFit;
  pisti: TextFit;
  shade: Record<Suit, HTMLCanvasElement>; // silüet yumuşak gölgesi (birim kutu ±SPR)
  white: CanvasGradient; // kartın beyaz gövdesi (tasarım uzayı)
  silWhite: CanvasGradient; // silüetin beyazı (birim uzay)
  face: Record<Suit, CanvasGradient>; // panel degradesi
  jackFace: CanvasGradient;
  backFace: CanvasGradient;
  gold: CanvasGradient; // birim uzayda taç altını
  backArt: HTMLImageElement | null;
}

const SPR = 0.85; // gölge sprite'ının birim kutu yarı genişliği

/** Şeklin bulanık gölgesini (yalnız gölgeyi) ayrı bir tuvale çizer. */
function blurSprite(path: Path2D, box: number, pxPerUnit: number, blurUnits: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(box * pxPerUnit));
  const g = c.getContext('2d', {willReadFrequently: true})!;
  const far = 10000;
  g.shadowColor = color;
  g.shadowBlur = blurUnits * pxPerUnit;
  g.shadowOffsetX = far;
  g.translate(c.width / 2 - far, c.height / 2);
  g.scale(pxPerUnit, pxPerUnit);
  g.fillStyle = '#000';
  g.fill(path);
  return c;
}

/** Ara katman: atlasla aynı piksel ızgarasında (tasarım kutusu bx,by,bw,bh) çizer ve tam piksel konuma kopyalar.
 *  source-atop gibi bileşimler yalnız bu katmanı etkiler. */
function layer(k: Kit, bx: number, by: number, bw: number, bh: number, draw: (g: Ctx) => void): void {
  const px = Math.floor(k.x0 + bx * k.sx) - 1;
  const py = Math.floor(k.y0 + by * k.sy) - 1;
  const pw = Math.ceil(bw * k.sx) + 3;
  const ph = Math.ceil(bh * k.sy) + 3;
  const c = k.scratch, g = k.sg;
  if (c.width < pw || c.height < ph) {
    c.width = Math.max(c.width, pw);
    c.height = Math.max(c.height, ph);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, pw, ph);
  g.setTransform(k.sx, 0, 0, k.sy, k.x0 - px, k.y0 - py);
  g.save();
  draw(g);
  g.restore();
  g.globalCompositeOperation = 'source-over';
  const {ctx} = k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0, pw, ph, px, py, pw, ph);
  ctx.restore();
}

// ───────────────────────── çerçeve ─────────────────────────
/** Beyaz gövde + renkli iç panel. */
function frame(k: Kit, face: Fill): void {
  const {ctx, shapes} = k;
  ctx.fillStyle = k.white;
  ctx.fill(k.card);
  // kart kenarında çok ince koyu hat: üst üste binen kartlar birbirinden ayrılsın
  ctx.save();
  ctx.clip(k.card);
  ctx.strokeStyle = 'rgba(10,16,51,0.22)';
  ctx.lineWidth = 1.1;
  ctx.stroke(k.card);
  ctx.restore();
  // panelin dışında ince gölge hattı (panel beyaz kenarın içine gömülü görünsün)
  ctx.save();
  ctx.translate(0, 0.5);
  ctx.strokeStyle = 'rgba(10,16,51,0.16)';
  ctx.lineWidth = 1.2;
  ctx.stroke(shapes.panel);
  ctx.restore();
  ctx.fillStyle = face;
  ctx.fill(shapes.panel);
}

/** Sol üstte cam parlaması (keskin alt kenarlı yansıma) + açık iç çizgi. */
function gloss(k: Kit, alpha: number, edge: string): void {
  const {ctx, shapes} = k;
  ctx.save();
  ctx.clip(shapes.panel);
  const g = ctx.createLinearGradient(RIM, RIM, 46, 62);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, `rgba(255,255,255,${alpha * 0.12})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(10, 6, 66, 40, -0.62, 0, Math.PI * 2);
  ctx.fill();
  // alt kenarda hafif koyulaşma (panel kabarık dursun)
  const b = ctx.createLinearGradient(0, UH - RIM - 22, 0, UH - RIM);
  b.addColorStop(0, 'rgba(0,0,0,0)');
  b.addColorStop(1, 'rgba(0,0,30,0.12)');
  ctx.fillStyle = b;
  ctx.fillRect(0, UH - RIM - 22, UW, 22);
  ctx.restore();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  ctx.save();
  ctx.clip(shapes.panel);
  ctx.stroke(shapes.panel);
  ctx.restore();
}

// ───────────────────────── silüet ve değer ─────────────────────────
/** Büyük beyaz takım silüeti: yumuşak gölge + koyu kabartma + koyu kontur + beyaz degrade. */
function silhouette(k: Kit, suit: Suit, x: number, y: number, w: number, outline = PAL[suit].dark, fill: Fill = k.silWhite): void {
  const {ctx} = k;
  const p = k.shapes.suit[suit];
  const sw = SPR * 2 * w;
  ctx.drawImage(k.shade[suit], x - sw / 2, y - sw / 2 + w * 0.05, sw, sw);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  ctx.lineWidth = 0.055;
  // kabartma (aşağı kaymış koyu kopya)
  ctx.save();
  ctx.translate(0, 0.04);
  ctx.fill(p);
  ctx.stroke(p);
  ctx.restore();
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.restore();
}

/** Silüetin içindeki dev değer: takımın koyu renginde, üst kenarda hafif iç gölge (ara katmanda). */
function rankInside(k: Kit, suit: Suit, t: TextFit, cx: number, cy: number): void {
  const pal = PAL[suit];
  const cap = t.capH;
  layer(k, cx - t.w / 2 - 2, cy - cap / 2 - 2, t.w + 4, cap * 1.45 + 4, (g) => {
    g.translate(cx, cy + cap / 2);
    g.scale(t.sx, 1);
    g.font = t.font;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(20,0,10,0.92)';
    g.fillText(t.text, t.ox, 0);
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, -cap, 0, 0);
    gr.addColorStop(0, pal.inkTop);
    gr.addColorStop(1, pal.ink);
    g.fillStyle = gr;
    g.globalAlpha = 0.6;
    g.fillText(t.text, t.ox, cap * 0.035);
    g.globalAlpha = 1;
    g.fillText(t.text, t.ox, cap * 0.07);
  });
}

// ───────────────────────── köşe indeksi ─────────────────────────
interface IndexStyle {
  rank: Fill;
  outline: string;
  pip: Fill;
  pipOutline: string;
}

function suitSticker(ctx: Ctx, path: Path2D, x: number, y: number, w: number, fill: Fill, outline: string, lw: number, drop: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw / w;
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  if (drop) {
    ctx.save();
    ctx.translate(0, drop / w);
    ctx.fill(path);
    ctx.stroke(path);
    ctx.restore();
  }
  ctx.stroke(path);
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.restore();
}

function cornerIndex(k: Kit, rank: number, suit: Suit, st: IndexStyle): void {
  const {ctx} = k;
  const t = k.idx[rank];
  for (let flip = 0; flip < 2; flip++) {
    ctx.save();
    if (flip) {
      ctx.translate(UW, UH);
      ctx.rotate(Math.PI);
    }
    suitSticker(ctx, k.shapes.suit[suit], IDX.cx, PIP_CY, IDX.pipW, st.pip, st.pipOutline, IDX.lw * 0.8, IDX.drop * 0.8);
    stickerText(ctx, t, IDX.cx, IDX.top + IDX.capH / 2, st.rank, st.outline, IDX.lw, IDX.drop);
    ctx.restore();
  }
}

function suitIndex(k: Kit, rank: number, suit: Suit): void {
  const d = PAL[suit].dark;
  cornerIndex(k, rank, suit, {rank: '#fff', outline: d, pip: '#fff', pipOutline: d});
}

// ───────────────────────── sayı kartları ─────────────────────────
function numberCard(k: Kit, suit: Suit, rank: number): void {
  const s = SIL[suit];
  const y = CY + s.dy;
  // silüetin arkasında yumuşak ışık
  const {ctx} = k;
  ctx.save();
  ctx.clip(k.shapes.panel);
  const g = ctx.createRadialGradient(CX, y, 4, CX, y, 52);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(CX - 52, y - 52, 104, 104);
  ctx.restore();
  silhouette(k, suit, CX, y, s.w);
  rankInside(k, suit, k.mid[suit][rank], CX, y + s.tcy * s.w);
}

// ───────────────────────── aslar ─────────────────────────
function rays(k: Kit, x: number, y: number, n: number, rot: number, color: string, glow: string): void {
  const {ctx} = k;
  ctx.save();
  ctx.clip(k.shapes.panel);
  ctx.fillStyle = color;
  ctx.beginPath();
  const R = 140, half = Math.PI / n / 2;
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - half) * R, y + Math.sin(a - half) * R);
    ctx.lineTo(x + Math.cos(a + half) * R, y + Math.sin(a + half) * R);
    ctx.closePath();
  }
  ctx.fill();
  const g = ctx.createRadialGradient(x, y, 2, x, y, 58);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 58, y - 58, 116, 116);
  ctx.restore();
}

function sparkle(k: Kit, x: number, y: number, r: number, fill: Fill = '#fff'): void {
  const {ctx} = k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.fillStyle = fill;
  ctx.fill(k.shapes.sparkle);
  ctx.restore();
}

function aceCard(k: Kit, suit: Suit): void {
  const {ctx} = k;
  const w = ACE_W[suit];
  const y = CY + 2 + (suit === 'C' || suit === 'S' ? -1 : 0);
  rays(k, CX, y, 18, -Math.PI / 2, 'rgba(255,255,255,0.13)', 'rgba(255,255,255,0.5)');
  if (suit === 'S') {
    // maça ası: altın hale + altın kenarlı silüet
    ctx.save();
    ctx.clip(k.shapes.panel);
    const h = ctx.createRadialGradient(CX, y, 20, CX, y, 50);
    h.addColorStop(0, 'rgba(255,210,63,0.55)');
    h.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, UW, UH);
    ctx.restore();
    silhouette(k, suit, CX, y, w, NAVY);
    // altın iç kenar
    ctx.save();
    ctx.translate(CX, y);
    ctx.scale(w, w);
    ctx.clip(k.shapes.suit.S);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = k.gold;
    ctx.lineWidth = 0.09;
    ctx.stroke(k.shapes.suit.S);
    ctx.restore();
    // ortada küçük mavi maça
    silhouette(k, 'S', CX, y - 1.5, w * 0.36, NAVY, PAL.S.base);
    sparkle(k, 80, 34, 6.5);
    sparkle(k, 20, 106, 5);
    sparkle(k, 83, 108, 3.5, GOLD_TOP);
  } else {
    silhouette(k, suit, CX, y, w);
    jewel(k, suit, CX, y + JEWEL_DY[suit] * w, w * 0.34);
    sparkle(k, 80, 36, 5.5);
    sparkle(k, 21, 104, 4);
  }
}

const JEWEL_DY: Record<Suit, number> = {H: -0.04, D: 0, C: 0.0, S: -0.02};

/** Asın ortasındaki küçük renkli takım işareti: degrade gövde, koyu kontur, parlak nokta. */
function jewel(k: Kit, suit: Suit, x: number, y: number, w: number): void {
  const {ctx} = k;
  const pal = PAL[suit];
  const p = k.shapes.suit[suit];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, w);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.09;
  ctx.strokeStyle = pal.dark;
  ctx.stroke(p);
  const g = ctx.createLinearGradient(0, -0.55, 0, 0.55);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.5, pal.base);
  g.addColorStop(1, pal.deep);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.clip(p);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-0.2, -0.3, 0.3, 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ───────────────────────── papaz / kız ─────────────────────────
function courtCard(k: Kit, suit: Suit, rank: 12 | 13): void {
  const {ctx} = k;
  const s = SIL[suit];
  const w = s.w * COURT.scale;
  const y = CY + s.dy + COURT.dy;
  rays(k, CX, y - 6, 14, -Math.PI / 2, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.3)');
  silhouette(k, suit, CX, y, w);
  rankInside(k, suit, k.midCourt[suit][rank], CX, y + (s.tcy + 0.02) * w);
  // taç / tiara: silüetin başına oturur
  const cw = rank === 13 ? 36 : 40;
  const by = y + s.head * w + (rank === 13 ? 3 : 4);
  const path = rank === 13 ? k.shapes.crown : k.shapes.tiara;
  ctx.save();
  ctx.translate(CX + (rank === 13 ? 1.5 : 0), by); // papaz tacı hafif sağa: sol üst indeksten uzak dursun
  ctx.rotate(rank === 13 ? -0.08 : 0.06);
  ctx.scale(cw, cw);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = NAVY;
  ctx.fillStyle = NAVY;
  ctx.lineWidth = 3.6 / cw;
  ctx.save();
  ctx.translate(0, 1.6 / cw);
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
  ctx.stroke(path);
  ctx.fillStyle = k.gold;
  ctx.fill(path);
  // parlama: sol üst yarıda açık şerit
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-0.25, -0.5, 0.42, 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (rank === 13) {
    // bant ve taşlar
    ctx.fillStyle = 'rgba(160,70,0,0.35)';
    ctx.fillRect(-0.44, -0.19, 0.88, 0.035);
    const gems: [number, string][] = [[-0.25, '#fff'], [0, PAL[suit].base], [0.25, '#fff']];
    for (const [gx, c] of gems) {
      ctx.beginPath();
      ctx.ellipse(gx, -0.095, 0.065, 0.055, 0, 0, Math.PI * 2);
      ctx.fillStyle = NAVY;
      ctx.lineWidth = 1.6 / cw;
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.fill();
    }
  } else {
    // inciler ve orta taş
    ctx.lineWidth = 1.5 / cw;
    for (const [px, py] of [[-0.36, -0.3], [-0.18, -0.44], [0.18, -0.44], [0.36, -0.3]] as const) {
      ctx.beginPath();
      circle(ctx, px, py, 0.055);
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, -0.5);
    ctx.quadraticCurveTo(0.09, -0.34, 0, -0.2);
    ctx.quadraticCurveTo(-0.09, -0.34, 0, -0.5);
    ctx.closePath();
    ctx.lineWidth = 1.8 / cw;
    ctx.strokeStyle = NAVY;
    ctx.stroke();
    ctx.fillStyle = PAL[suit].base;
    ctx.fill();
  }
  ctx.restore();
}

// ───────────────────────── vale ─────────────────────────
const WHEEL = {cy: CY, r: 31.5};

/** Dört renk çark: eğik dilimli (dönüyormuş gibi) halka, beyaz dış çember ve ayraçlar, lacivert göbek, arkada mavi parıltı.
 *  Arka yüzdeki dört renk rozetle aynı dil; göbekte dev "J" durur. */
function wheel(k: Kit, x: number, y: number, R: number, rot: number): void {
  const {ctx} = k;
  const N = 8, r0 = R * 0.56, slant = 0.42;
  const glow = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 1.55);
  glow.addColorStop(0, 'rgba(90,120,255,0.55)');
  glow.addColorStop(1, 'rgba(90,120,255,0)');
  ctx.save();
  ctx.clip(k.shapes.panel);
  ctx.fillStyle = glow;
  ctx.fillRect(x - R * 1.55, y - R * 1.55, R * 3.1, R * 3.1);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  // gölge + beyaz taban (dış çember ve ayraçlar bundan görünür)
  ctx.beginPath();
  circle(ctx, 0, 1.8, R + 2);
  ctx.fillStyle = 'rgba(2,4,24,0.6)';
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0, R + 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  const gap = 0.045;
  for (let i = 0; i < N; i++) {
    const a0 = rot + (i * Math.PI * 2) / N, a1 = a0 + (Math.PI * 2) / N;
    const seg = new Path2D();
    seg.moveTo(Math.cos(a0 + gap) * r0, Math.sin(a0 + gap) * r0);
    seg.lineTo(Math.cos(a0 + slant + gap * 0.6) * R, Math.sin(a0 + slant + gap * 0.6) * R);
    seg.arc(0, 0, R, a0 + slant + gap * 0.6, a1 + slant - gap * 0.6);
    seg.lineTo(Math.cos(a1 - gap) * r0, Math.sin(a1 - gap) * r0);
    seg.arc(0, 0, r0, a1 - gap, a0 + gap, true);
    seg.closePath();
    const pal = PAL[WHEEL_ORDER[i % 4]];
    const am = (a0 + a1) / 2 + slant / 2;
    const g = ctx.createLinearGradient(Math.cos(am) * r0, Math.sin(am) * r0, Math.cos(am) * R, Math.sin(am) * R);
    g.addColorStop(0, pal.deep);
    g.addColorStop(0.45, pal.base);
    g.addColorStop(1, pal.light);
    ctx.fillStyle = g;
    ctx.fill(seg);
    // dilimin arka yarısı biraz koyu: dönüş hissi
    ctx.save();
    ctx.clip(seg);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const am2 = (a0 + a1) / 2;
    ctx.lineTo(Math.cos(am2) * r0 * 0.9, Math.sin(am2) * r0 * 0.9);
    ctx.lineTo(Math.cos(am2 + slant) * R * 1.2, Math.sin(am2 + slant) * R * 1.2);
    ctx.lineTo(Math.cos(a1 + slant) * R * 1.4, Math.sin(a1 + slant) * R * 1.4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,40,0.2)';
    ctx.fill();
    ctx.restore();
  }
  // göbek
  const hub = ctx.createRadialGradient(-r0 * 0.3, -r0 * 0.4, 1, 0, 0, r0);
  hub.addColorStop(0, '#3644c8');
  hub.addColorStop(0.6, '#161c6a');
  hub.addColorStop(1, '#0a0e3c');
  ctx.beginPath();
  circle(ctx, 0, 0, r0 - 1.3);
  ctx.fillStyle = hub;
  ctx.fill();
  // halkanın üst yarısında cam parlaması
  ctx.save();
  ctx.beginPath();
  circle(ctx, 0, 0, R);
  ctx.clip();
  const sh = ctx.createLinearGradient(0, -R, 0, R * 0.2);
  sh.addColorStop(0, 'rgba(255,255,255,0.42)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(-R * 0.12, -R * 0.42, R * 0.95, R * 0.6, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function ribbon(k: Kit, suit: Suit, cx: number, cy: number): void {
  const {ctx} = k;
  const pal = PAL[suit];
  const w = 31, h = 11, tail = 4.2, fold = 2.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  // kuyruklar (arkada, koyu)
  for (const sgn of [-1, 1]) {
    const t = new Path2D();
    const x0 = sgn * (w / 2 - 3);
    const x1 = sgn * (w / 2 + tail);
    t.moveTo(x0, -h / 2 + fold);
    t.lineTo(x1, -h / 2 + fold);
    t.lineTo(x1 - sgn * 2.6, fold / 2 + 0.6);
    t.lineTo(x1, h / 2 + fold);
    t.lineTo(x0, h / 2 + fold);
    t.closePath();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2.4;
    ctx.stroke(t);
    ctx.fillStyle = pal.dark;
    ctx.fill(t);
  }
  // ana bant
  const band = rrectPath(-w / 2, -h / 2, w, h, 2);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.6;
  ctx.stroke(band);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.5, pal.base);
  g.addColorStop(1, pal.deep);
  ctx.fillStyle = g;
  ctx.fill(band);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.2, w - 3, 2.2);
  ctx.restore();
  stickerText(ctx, k.vale, cx, cy + 0.2, '#fff', NAVY, 2.6, 0.9);
}

function jackCard(k: Kit, suit: Suit): void {
  const {ctx} = k;
  // dört renkli silik ışınlar
  ctx.save();
  ctx.clip(k.shapes.panel);
  const n = 16, R = 140, half = Math.PI / n / 2;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n + 0.2;
    ctx.beginPath();
    ctx.moveTo(CX, WHEEL.cy);
    ctx.lineTo(CX + Math.cos(a - half) * R, WHEEL.cy + Math.sin(a - half) * R);
    ctx.lineTo(CX + Math.cos(a + half) * R, WHEEL.cy + Math.sin(a + half) * R);
    ctx.closePath();
    ctx.fillStyle = `rgba(${PAL[WHEEL_ORDER[i % 4]].rgb},0.13)`;
    ctx.fill();
  }
  ctx.restore();
  wheel(k, CX, WHEEL.cy, WHEEL.r, -Math.PI * 0.56);
  stickerText(
    ctx,
    k.jackJ,
    CX + 1,
    WHEEL.cy - 3,
    (c) => {
      const g = c.createLinearGradient(0, -k.jackJ.capH, 0, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#dfe6ff');
      return g;
    },
    NAVY,
    8,
    3.2,
  );
  ribbon(k, suit, CX, WHEEL.cy + WHEEL.r - 1.5);
  sparkle(k, 81, 33, 5);
  sparkle(k, 19, 112, 4);
  const pal = PAL[suit];
  cornerIndex(k, 11, suit, {rank: '#fff', outline: NAVY, pip: pal.base, pipOutline: '#fff'});
}

// ───────────────────────── arka yüz ─────────────────────────
function cardBack(k: Kit): void {
  const {ctx, shapes} = k;
  frame(k, k.backFace);
  ctx.save();
  ctx.clip(shapes.panel);
  // silik takım deseni (çapraz ızgara)
  ctx.fillStyle = 'rgba(140,160,255,0.11)';
  const step = 12.5;
  for (let j = -1; j * step * 0.9 < UH + step; j++) {
    for (let i = -1; i * step < UW + step; i++) {
      const x = i * step + (j % 2 ? step / 2 : 0), y = j * step * 0.9 + 4;
      const s = SUITS[(i + j * 3 + 40) % 4];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.26);
      ctx.scale(5.2, 5.2);
      ctx.fill(shapes.suit[s]);
      ctx.restore();
    }
  }
  // merkez ışığı
  const g = ctx.createRadialGradient(CX, CY, 4, CX, CY, 70);
  g.addColorStop(0, 'rgba(61,91,255,0.75)');
  g.addColorStop(0.55, 'rgba(40,60,200,0.22)');
  g.addColorStop(1, 'rgba(20,30,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, UW, UH);
  ctx.restore();
  rays(k, CX, CY, 20, 0.1, 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0)');
  gloss(k, 0.16, 'rgba(160,175,255,0.5)');

  // rozet: dört renk halka
  const R = 35, T = 8.5;
  ctx.save();
  ctx.translate(CX, CY);
  // gölge
  ctx.beginPath();
  circle(ctx, 0, 2.2, R + 2.4);
  ctx.fillStyle = 'rgba(4,6,30,0.55)';
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0, 0, R + 2.4);
  ctx.fillStyle = '#fff';
  ctx.fill();
  const gap = 0.07;
  for (let i = 0; i < 4; i++) {
    const a0 = -Math.PI * 0.75 + (i * Math.PI) / 2 + gap / 2, a1 = a0 + Math.PI / 2 - gap;
    const pal = PAL[WHEEL_ORDER[i]];
    const seg = new Path2D();
    seg.arc(0, 0, R, a0, a1);
    seg.arc(0, 0, R - T, a1, a0, true);
    seg.closePath();
    const am = (a0 + a1) / 2;
    const sg = ctx.createLinearGradient(Math.cos(am) * (R - T), Math.sin(am) * (R - T), Math.cos(am) * R, Math.sin(am) * R);
    sg.addColorStop(0, pal.deep);
    sg.addColorStop(0.5, pal.base);
    sg.addColorStop(1, pal.light);
    ctx.fillStyle = sg;
    ctx.fill(seg);
    // halkada küçük beyaz takım işareti
    ctx.save();
    ctx.translate(Math.cos(am) * (R - T / 2), Math.sin(am) * (R - T / 2));
    ctx.rotate(am + Math.PI / 2);
    ctx.scale(5.2, 5.2);
    ctx.fillStyle = '#fff';
    ctx.fill(shapes.suit[WHEEL_ORDER[i]]);
    ctx.restore();
  }
  // iç disk
  const d = ctx.createRadialGradient(-6, -10, 2, 0, 0, R - T);
  d.addColorStop(0, '#3d4fe0');
  d.addColorStop(0.6, '#1d2590');
  d.addColorStop(1, '#10165c');
  ctx.beginPath();
  circle(ctx, 0, 0, R - T - 1.3);
  ctx.fillStyle = d;
  ctx.fill();
  ctx.restore();

  // "PİŞTİ": altın degrade, kalın lacivert kontur, eğik
  const t = k.pisti;
  stickerText(
    ctx,
    t,
    CX,
    CY + 1,
    (c) => {
      // şeker parlaklığı: üst yarı açık, ortada keskin geçiş
      const gg = c.createLinearGradient(0, -t.capH * 1.05, 0, 0);
      gg.addColorStop(0, GOLD_HI);
      gg.addColorStop(0.44, '#ffe05a');
      gg.addColorStop(0.5, GOLD_TOP);
      gg.addColorStop(1, GOLD_BOT);
      return gg;
    },
    NAVY,
    5.4,
    2.6,
    -0.14,
  );
  sparkle(k, 79, 47, 4.6);
  sparkle(k, 22, 96, 3.4);
}

/** Hazır arka yüz görseli: hücreyi kenardan kenara örter, köşeler saydam kalır. */
function backFromArt(k: Kit, img: HTMLImageElement): void {
  const {ctx} = k;
  ctx.save();
  ctx.clip(k.card);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(UW / iw, UH / ih);
  ctx.drawImage(img, CX - (iw * s) / 2, CY - (ih * s) / 2, iw * s, ih * s);
  ctx.restore();
}

// ───────────────────────── görsel ve font yükleme ─────────────────────────
async function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.decoding = 'async';
  let timer = 0;
  const timeout = new Promise<boolean>((res) => {
    timer = window.setTimeout(() => res(false), timeoutMs);
  });
  img.src = url;
  let ok: boolean;
  try {
    ok = await Promise.race([img.decode().then(() => true), timeout]);
  } catch {
    ok = false;
  }
  clearTimeout(timer);
  return ok && img.naturalWidth > 0 ? img : null;
}

async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  // Türkçe İ ve Ş latin-ext alt kümesindedir: metinde geçmeleri o dosyanın da yüklenmesini sağlar.
  const loads = document.fonts.load(`400 64px "Lilita One"`, 'AKQJ0123456789 PİŞTİ VALE').catch(() => undefined);
  await Promise.race([loads, new Promise((r) => setTimeout(r, 3000))]);
}

// ───────────────────────── atlas ─────────────────────────
function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export async function buildCardAtlas(width: number, artOverride?: CardArtUrls): Promise<CardAtlas> {
  const urls = {...discoverArt(), ...artOverride};
  const [, backArt] = await Promise.all([ensureFonts(), urls.back ? loadImage(urls.back, 6000) : Promise.resolve(null)]);
  const W = Math.max(8, Math.round(width));
  const H = Math.round(W * 1.25);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // CPU destekli tuval: tek seferlik çizimde GPU bekleme olmaz, bağlam kaybında içerik silinmez.
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const cellW = W / ATLAS_COLS;
  const cellH = H / ATLAS_ROWS;
  const sx = cellW / UW, sy = cellH / UH;

  const shapes = makeShapes();
  ctx.font = `400 100px ${FONT}`;
  const capRatio = (ctx.measureText('H').actualBoundingBoxAscent || 70) / 100;

  const idx: TextFit[] = [];
  const mid = {} as Record<Suit, TextFit[]>;
  const midCourt = {} as Record<Suit, TextFit[]>;
  for (let r = 1; r <= 13; r++) {
    const t = RANK_LABEL[r];
    idx[r] = fitText(ctx, t, IDX.capH, t.length > 1 ? IDX.maxW10 : IDX.maxW, capRatio);
  }
  for (const s of SUITS) {
    const sil = SIL[s];
    mid[s] = [];
    midCourt[s] = [];
    for (let r = 2; r <= 10; r++) mid[s][r] = fitText(ctx, RANK_LABEL[r], sil.cap * sil.w, sil.maxW * sil.w, capRatio);
    for (const r of [12, 13]) {
      const w = sil.w * COURT.scale;
      midCourt[s][r] = fitText(ctx, RANK_LABEL[r], sil.cap * w * 1.04, sil.maxW * w * 1.1, capRatio);
    }
  }

  const shade = {} as Record<Suit, HTMLCanvasElement>;
  const sprPx = 74 * sx; // en büyük kullanımın (as) piksel ölçeği
  for (const s of SUITS) shade[s] = blurSprite(shapes.suit[s], SPR * 2, sprPx, 0.06, `rgba(${s === 'D' ? '120,50,0' : '0,0,30'},0.45)`);

  const face = {} as Record<Suit, CanvasGradient>;
  for (const s of SUITS) {
    const p = PAL[s];
    face[s] = vgrad(ctx, RIM, UH - RIM, [[0, p.light], [0.42, p.base], [1, p.deep]]);
  }
  const gold = vgrad(ctx, -0.8, 0, [[0, GOLD_HI], [0.4, GOLD_TOP], [1, GOLD_BOT]]);

  const scratch = document.createElement('canvas');
  scratch.width = Math.ceil(cellW) + 4;
  scratch.height = Math.ceil(cellH * 0.6) + 4;
  const sg = scratch.getContext('2d', {willReadFrequently: true})!;

  const kit: Kit = {
    ctx, sx, sy, x0: 0, y0: 0, card: new Path2D(), scratch, sg, shapes, idx, mid, midCourt, shade, face, gold, backArt,
    jackJ: fitText(ctx, 'J', 40, 60, capRatio),
    vale: fitText(ctx, 'VALE', 7.2, 25, capRatio),
    pisti: fitText(ctx, 'PİŞTİ', 22, 82, capRatio),
    white: vgrad(ctx, 0, UH, [[0, '#ffffff'], [0.62, '#fbfcff'], [1, '#e3e8f6']]),
    silWhite: vgrad(ctx, -0.55, 0.55, [[0, '#ffffff'], [0.6, '#f7f9ff'], [1, '#e2e8f8']]),
    jackFace: vgrad(ctx, RIM, UH - RIM, [[0, '#1d2470'], [0.5, '#0b0f3a'], [1, '#060824']]),
    backFace: vgrad(ctx, RIM, UH - RIM, [[0, '#262d8c'], [0.45, '#1a1f6b'], [1, '#0b0f3a']]),
  };

  for (let id = 0; id <= BACK_INDEX; id++) {
    const col = id % ATLAS_COLS, row = Math.floor(id / ATLAS_COLS);
    const x0 = col * cellW, y0 = row * cellH;
    kit.x0 = x0;
    kit.y0 = y0;
    // Hücre sınırı tam piksele yuvarlanır: komşu hücreler arasında yarı saydam dikiş kalmaz.
    const px0 = Math.round(x0), py0 = Math.round(y0), px1 = Math.round(x0 + cellW), py1 = Math.round(y0 + cellH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px0, py0, px1 - px0, py1 - py0);
    ctx.clip();
    // Kart dış şekli bu tam piksel kutuya oturtulur (tasarım uzayında < 1 px oynar).
    const l = (px0 - x0) / sx, t = (py0 - y0) / sy;
    kit.card = rrectPath(l, t, (px1 - x0) / sx - l, (py1 - y0) / sy - t, CR);
    ctx.setTransform(sx, 0, 0, sy, x0, y0);
    if (id === BACK_INDEX) {
      if (backArt) backFromArt(kit, backArt);
      else cardBack(kit);
    } else {
      const suit = SUITS[Math.floor(id / 13)];
      const rank = (id % 13) + 1;
      if (rank === 11) {
        frame(kit, kit.jackFace);
        gloss(kit, 0.14, 'rgba(150,165,255,0.45)');
        jackCard(kit, suit);
      } else {
        frame(kit, face[suit]);
        gloss(kit, 0.24, 'rgba(255,255,255,0.4)');
        if (rank === 1) aceCard(kit, suit);
        else if (rank <= 10) numberCard(kit, suit, rank);
        else courtCard(kit, suit, rank as 12 | 13);
        suitIndex(kit, rank, suit);
      }
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  scratch.width = scratch.height = 0;
  for (const s of SUITS) shade[s].width = shade[s].height = 0;
  return {canvas, width: W, height: H, cellW, cellH};
}
