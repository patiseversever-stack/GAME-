// Tarz 3 — "Siyah-Altın VIP": mat siyah yüz, metalik altın çerçeve, art-deco süslemeler.
// ♠♣ altın, ♥♦ ince altın kontürlü yakut kırmızısı. Saray kartlarında karakterlerimizin altın duotone portreleri.
import type {Skin, Suit} from '../../src/skins/contract';
import rizaUrl from '../../assets/riza_avatar.jpg?url';
import defneUrl from '../../assets/art/defne_avatar.jpg?url';
import cemUrl from '../../assets/art/cem_avatar.jpg?url';

const FONT = '"Playfair Display", Georgia, "Times New Roman", serif';
const isRed = (s: Suit): boolean => s === 'H' || s === 'D';

// ---------- renkler ----------
type Stops = [number, string][];
const GOLD: Stops = [[0, '#fff1b0'], [0.36, '#e2b54a'], [0.62, '#9a6b1c'], [0.84, '#d4a443'], [1, '#f6dc8e']];
/** Çerçeve için çok bantlı metalik altın (parlama şeritleri). */
const GOLD_BANDS: Stops = [[0, '#fff1b0'], [0.18, '#e2b54a'], [0.36, '#9a6b1c'], [0.52, '#f7e09a'], [0.7, '#b8892f'], [0.86, '#e9c766'], [1, '#fff1b0']];
const RUBY: Stops = [[0, '#ff7584'], [0.3, '#e8263f'], [0.68, '#b20f29'], [1, '#76041a']];

function grad(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

// ---------- takım şekilleri (100 birimlik kutu, merkez 0,0) ----------
const SUIT_D: Record<Suit, string> = {
  H: 'M0,46 C-8,34 -50,12 -50,-16 C-50,-36 -37,-46 -24,-46 C-12,-46 -3,-38 0,-27 C3,-38 12,-46 24,-46 C37,-46 50,-36 50,-16 C50,12 8,34 0,46 Z',
  S: 'M0,-48 C8,-34 50,-14 50,10 C50,28 38,38 24,38 C14,38 6,33 3,27 C4,37 9,45 18,50 L-18,50 C-9,45 -4,37 -3,27 C-6,33 -14,38 -24,38 C-38,38 -50,28 -50,10 C-50,-14 -8,-34 0,-48 Z',
  D: 'M0,-50 Q14,-22 36,0 Q14,22 0,50 Q-14,22 -36,0 Q-14,-22 0,-50 Z',
  C:
    'M22,-24 A22,22 0 1 1 -22,-24 A22,22 0 1 1 22,-24 Z ' +
    'M-2,10 A22,22 0 1 1 -46,10 A22,22 0 1 1 -2,10 Z ' +
    'M46,10 A22,22 0 1 1 2,10 A22,22 0 1 1 46,10 Z ' +
    'M12,4 A12,12 0 1 1 -12,4 A12,12 0 1 1 12,4 Z ' +
    'M4,8 C4,30 10,44 20,50 L-20,50 C-10,44 -4,30 -4,8 Z',
};
let paths: Record<Suit, Path2D> | null = null;
function suitPath(s: Suit): Path2D {
  if (!paths) paths = {H: new Path2D(SUIT_D.H), S: new Path2D(SUIT_D.S), D: new Path2D(SUIT_D.D), C: new Path2D(SUIT_D.C)};
  return paths[s];
}

/** Takım simgesi: siyah takımlar altın, kırmızılar altın kontürlü yakut. size = simge yüksekliği (px). */
function drawSuit(g: CanvasRenderingContext2D, s: Suit, cx: number, cy: number, size: number, flip = false, halo = 0): void {
  const k = size / 100;
  const p = suitPath(s);
  g.save();
  g.translate(cx, cy);
  if (flip) g.rotate(Math.PI);
  g.scale(k, k);
  g.lineJoin = 'round';
  if (halo > 0) {
    // arka plandan ayırmak için siyah hale
    g.lineWidth = (halo * 2) / k;
    g.strokeStyle = 'rgba(8,8,11,0.92)';
    g.stroke(p);
  }
  if (isRed(s)) {
    g.lineWidth = Math.max(1.6, size * 0.085) / k;
    g.strokeStyle = grad(g, -50, -50, 50, 50, GOLD);
    g.stroke(p);
    g.fillStyle = grad(g, -20, -50, 20, 50, RUBY);
    g.fill(p);
    // mücevher parıltısı
    g.save();
    g.clip(p);
    const sh = g.createRadialGradient(-18, -26, 0, -18, -26, 46);
    sh.addColorStop(0, 'rgba(255,220,225,0.55)');
    sh.addColorStop(1, 'rgba(255,220,225,0)');
    g.fillStyle = sh;
    g.fillRect(-50, -50, 100, 100);
    g.restore();
  } else {
    if (size > 26) {
      // büyük simgelerde açık renkli dış kontür (dolgu iç çizgileri örter)
      g.lineWidth = 2.2 / k;
      g.strokeStyle = 'rgba(255,240,190,0.6)';
      g.stroke(p);
    }
    g.fillStyle = grad(g, -30, -50, 30, 50, GOLD);
    g.fill(p);
  }
  g.restore();
}

// ---------- yardımcı çizimler ----------
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Köşeleri pahlı (art-deco) dikdörtgen. */
function chamfer(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number): void {
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x, y + c);
  g.closePath();
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mat siyah yüzey dokusu (ince gren) — ilk kullanımda bir kez üretilir.
let grain: HTMLCanvasElement | null = null;
function grainCanvas(): HTMLCanvasElement {
  if (grain) return grain;
  const N = 128;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d')!;
  const im = x.createImageData(N, N);
  const rnd = mulberry(1337);
  for (let i = 0; i < N * N; i++) {
    const v = rnd();
    const light = v > 0.5;
    im.data[i * 4] = im.data[i * 4 + 1] = light ? 255 : 0;
    im.data[i * 4 + 2] = light ? 235 : 0;
    im.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 16);
  }
  x.putImageData(im, 0, 0);
  grain = c;
  return c;
}

/** Kart zemini: mat siyah degrade + gren + hafif parlama. Çağıran kırpma yapmış olmalı. */
function base(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.fillStyle = grad(g, 0, 0, w * 0.3, h, [[0, '#18181f'], [0.55, '#111116'], [1, '#0b0b0e']]);
  g.fillRect(0, 0, w, h);
  const pat = g.createPattern(grainCanvas(), 'repeat');
  if (pat) {
    pat.setTransform(new DOMMatrix().scale(0.5));
    g.fillStyle = pat;
    g.fillRect(0, 0, w, h);
  }
  const sh = g.createRadialGradient(w * 0.25, h * 0.12, 0, w * 0.25, h * 0.12, w * 0.95);
  sh.addColorStop(0, 'rgba(255,236,190,0.06)');
  sh.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
}

/** Dış altın kenar + iç ince çizgi. */
function rim(g: CanvasRenderingContext2D, w: number, h: number): void {
  const R = 0.08 * w;
  const a = 0.034 * w;
  g.lineWidth = Math.max(1.4, 0.02 * w);
  g.strokeStyle = grad(g, 0, 0, w, h, GOLD_BANDS);
  rr(g, a, a, w - 2 * a, h - 2 * a, R - a * 0.7);
  g.stroke();
  const b = 0.062 * w;
  g.lineWidth = Math.max(0.6, 0.0055 * w);
  g.strokeStyle = grad(g, w, 0, 0, h, GOLD);
  g.globalAlpha = 0.8;
  rr(g, b, b, w - 2 * b, h - 2 * b, R * 0.45);
  g.stroke();
  g.globalAlpha = 1;
}

/** Sağ üst ve sol alt köşe için art-deco yelpaze süsü. (ox,oy) köşe noktası, sx/sy içeri yönü. */
function cornerFan(g: CanvasRenderingContext2D, ox: number, oy: number, sx: number, sy: number, u: number): void {
  g.save();
  g.translate(ox, oy);
  g.scale(sx, sy);
  g.strokeStyle = grad(g, 0, 0, u * 16, u * 16, GOLD);
  g.fillStyle = g.strokeStyle;
  g.lineWidth = Math.max(0.5, u * 0.45);
  // çeyrek yelpaze: iç içe yaylar + ışınlar
  for (const r of [5, 8, 11]) {
    g.beginPath();
    g.arc(0, 0, r * u, 0, Math.PI / 2);
    g.stroke();
  }
  g.beginPath();
  for (let i = 1; i < 6; i++) {
    const t = (i / 6) * (Math.PI / 2);
    g.moveTo(Math.cos(t) * 5 * u, Math.sin(t) * 5 * u);
    g.lineTo(Math.cos(t) * 11 * u, Math.sin(t) * 11 * u);
  }
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 2.6 * u, 0, Math.PI / 2);
  g.lineTo(0, 0);
  g.fill();
  // basamaklı çizgiler (kenar boyunca)
  g.lineWidth = Math.max(0.5, u * 0.4);
  g.beginPath();
  g.moveTo(14 * u, 0);
  g.lineTo(24 * u, 0);
  g.moveTo(14 * u, 2.2 * u);
  g.lineTo(19 * u, 2.2 * u);
  g.moveTo(0, 14 * u);
  g.lineTo(0, 24 * u);
  g.moveTo(2.2 * u, 14 * u);
  g.lineTo(2.2 * u, 19 * u);
  g.stroke();
  g.restore();
}

// ---------- köşe indeksi ----------
const RANK_TXT = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Ix {
  cx: number; // indeks sütun merkezi (rakam + simge)
  top: number; // rakamın üst kenarı
  capH: number;
  f: number; // yazı boyu
  ls: number; // harf aralığı
  sx: number; // yatay sıkıştırma
  sy: number;
  tw: number;
  left: number;
  asc: number;
  suitY: number;
  suitS: number;
}
/** Köşe indeksi ölçüleri: büyük rakam/harf ve altında takım simgesi. */
function indexGeom(g: CanvasRenderingContext2D, w: number, h: number, rank: number): Ix {
  const fs = 0.262 * h;
  g.letterSpacing = '0px';
  g.font = `900 ${fs}px ${FONT}`;
  const capH = g.measureText('K').actualBoundingBoxAscent;
  const txt = RANK_TXT[rank];
  const ten = txt.length > 1;
  const f = ten ? fs * 0.84 : fs;
  const ls = ten ? -0.1 * f : 0;
  g.font = `900 ${f}px ${FONT}`;
  g.letterSpacing = `${ls}px`;
  const m = g.measureText(txt);
  g.letterSpacing = '0px';
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const maxW = (rank >= 11 ? 0.235 : ten ? 0.222 : 0.215) * w;
  const sx = Math.min(1, maxW / tw);
  const sy = ten ? (0.93 * capH) / m.actualBoundingBoxAscent : 1; // 10 biraz daha kısa ve dar
  const top = 0.1 * w;
  const cx = Math.max(0.172 * w, 0.071 * w + (tw * sx) / 2);
  const desc = Math.max(0, m.actualBoundingBoxDescent) * sy;
  const suitS = 0.15 * w;
  const suitY = top + capH + Math.max(0.04 * w, desc + 0.022 * w) + suitS / 2;
  return {cx, top, capH, f, ls, sx, sy, tw, left: m.actualBoundingBoxLeft, asc: m.actualBoundingBoxAscent * sy, suitY, suitS};
}

function drawRankText(g: CanvasRenderingContext2D, txt: string, ix: Ix, red: boolean): void {
  g.save();
  g.font = `900 ${ix.f}px ${FONT}`;
  g.letterSpacing = `${ix.ls}px`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.translate(ix.cx, ix.top + ix.asc);
  g.scale(ix.sx, ix.sy);
  const x = -ix.tw / 2 + ix.left;
  const asc = ix.asc / ix.sy;
  g.lineJoin = 'round';
  if (red) {
    g.lineWidth = Math.max(1.5, ix.f * 0.045);
    g.strokeStyle = grad(g, 0, -asc, 0, 0, GOLD);
    g.strokeText(txt, x, 0);
    g.fillStyle = grad(g, 0, -asc, 0, asc * 0.15, RUBY);
    g.fillText(txt, x, 0);
  } else {
    g.fillStyle = grad(g, 0, -asc, 0, asc * 0.1, GOLD);
    g.fillText(txt, x, 0);
  }
  g.restore();
}

function drawIndex(g: CanvasRenderingContext2D, w: number, h: number, suit: Suit, rank: number, flip: boolean): void {
  g.save();
  if (flip) {
    g.translate(w, h);
    g.rotate(Math.PI);
  }
  const ix = indexGeom(g, w, h, rank);
  drawRankText(g, RANK_TXT[rank], ix, isRed(suit));
  drawSuit(g, suit, ix.cx, ix.suitY, ix.suitS);
  g.restore();
}

// ---------- sayı kartları: klasik pip dizilimi ----------
// [sütun (-1 sol, 0 orta, 1 sağ), satır 0..1]
const PIPS: Record<number, [number, number][]> = {
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

function drawPips(g: CanvasRenderingContext2D, w: number, h: number, suit: Suit, rank: number): void {
  const colX = 0.137 * w;
  const y0 = 0.235 * h;
  const y1 = 0.765 * h;
  const ps = (rank >= 9 ? 0.112 : 0.122) * w;
  for (const [c, r] of PIPS[rank]) {
    drawSuit(g, suit, w / 2 + c * colX, y0 + (y1 - y0) * r, ps, r > 0.5);
  }
}

// ---------- As: art-deco güneş patlaması ----------
function sunburst(g: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, n: number, alpha: number): void {
  const rg = g.createRadialGradient(cx, cy, r0, cx, cy, r1);
  rg.addColorStop(0, `rgba(240,200,100,${alpha})`);
  rg.addColorStop(0.6, `rgba(214,168,72,${alpha * 0.55})`);
  rg.addColorStop(1, 'rgba(214,168,72,0)');
  g.fillStyle = rg;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const da = (Math.PI / n) * (i % 2 ? 0.45 : 0.8);
    const rr1 = i % 2 ? r1 * 0.78 : r1;
    g.moveTo(cx + Math.cos(a - da) * r0, cy + Math.sin(a - da) * r0);
    g.lineTo(cx + Math.cos(a) * rr1, cy + Math.sin(a) * rr1);
    g.lineTo(cx + Math.cos(a + da) * r0, cy + Math.sin(a + da) * r0);
    g.closePath();
  }
  g.fill();
}

function ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, lw: number, alpha = 1): void {
  g.globalAlpha = alpha;
  g.lineWidth = lw;
  g.strokeStyle = grad(g, cx - r, cy - r, cx + r, cy + r, GOLD_BANDS);
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
}

function dots(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, d: number): void {
  g.fillStyle = grad(g, cx - r, cy - r, cx + r, cy + r, GOLD);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    g.moveTo(x, y - d);
    g.lineTo(x + d, y);
    g.lineTo(x, y + d);
    g.lineTo(x - d, y);
    g.closePath();
  }
  g.fill();
}

function drawAce(g: CanvasRenderingContext2D, w: number, h: number, suit: Suit): void {
  const cx = w / 2;
  const cy = h / 2;
  sunburst(g, cx, cy, w * 0.05, w * 0.45, 40, 0.62);
  ring(g, cx, cy, w * 0.29, Math.max(0.8, w * 0.008));
  ring(g, cx, cy, w * 0.315, Math.max(0.5, w * 0.003), 0.8);
  dots(g, cx, cy, w * 0.345, 24, w * 0.009);
  // madalyon içi koyu
  const mg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.285);
  mg.addColorStop(0, 'rgba(10,10,13,0.92)');
  mg.addColorStop(1, 'rgba(10,10,13,0.55)');
  g.fillStyle = mg;
  g.beginPath();
  g.arc(cx, cy, w * 0.285, 0, Math.PI * 2);
  g.fill();
  drawSuit(g, suit, cx, cy + w * 0.005, w * (suit === 'D' ? 0.46 : 0.4), false, w * 0.012);
}

// ---------- saray kartları: altın duotone portre ----------
const PORTRAIT: Record<number, {url: string; fx: number; fy: number; zoom: number}> = {
  13: {url: rizaUrl, fx: 0.58, fy: 0.52, zoom: 1.08},
  12: {url: defneUrl, fx: 0.68, fy: 0.5, zoom: 1},
  11: {url: cemUrl, fx: 0.58, fy: 0.62, zoom: 1.15},
};
const duo = new Map<number, HTMLCanvasElement>();

/** Parlaklığı siyah→altın rampasına eşler (otomatik seviye ile). */
function duotone(img: HTMLImageElement): HTMLCanvasElement {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d', {willReadFrequently: true})!;
  x.drawImage(img, 0, 0, N, N);
  const im = x.getImageData(0, 0, N, N);
  const d = im.data;
  const lum = new Float32Array(N * N);
  const hist = new Uint32Array(256);
  for (let i = 0; i < N * N; i++) {
    const l = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    lum[i] = l;
    hist[Math.min(255, l | 0)]++;
  }
  const pct = (p: number): number => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= p * N * N) return v;
    }
    return 255;
  };
  const lo = pct(0.03);
  const hi = Math.max(lo + 1, pct(0.995));
  // altın rampa
  const ramp: Stops = [[0, '#050406'], [0.22, '#24180a'], [0.45, '#6b4914'], [0.66, '#b5842d'], [0.84, '#e9c56a'], [1, '#fff5cf']];
  const lut = document.createElement('canvas');
  lut.width = 256;
  lut.height = 1;
  const lx = lut.getContext('2d', {willReadFrequently: true})!;
  lx.fillStyle = grad(lx, 0, 0, 256, 0, ramp);
  lx.fillRect(0, 0, 256, 1);
  const L = lx.getImageData(0, 0, 256, 1).data;
  for (let i = 0; i < N * N; i++) {
    let t = (lum[i] - lo) / (hi - lo);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = Math.pow(t, 0.95);
    const k = Math.round(t * 255) * 4;
    d[i * 4] = L[k];
    d[i * 4 + 1] = L[k + 1];
    d[i * 4 + 2] = L[k + 2];
    d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('görsel yüklenemedi: ' + url));
    im.src = url;
  });
}

const COURT_NAME: Record<number, string> = {11: 'VALE', 12: 'KIZ', 13: 'PAPAZ'};

function drawCourt(g: CanvasRenderingContext2D, w: number, h: number, suit: Suit, rank: number): void {
  const wx = 0.095 * w;
  const wy = 0.068 * w;
  const ww = w - 2 * wx;
  const wh = h - 2 * wy;
  const c = 0.07 * w;
  const pic = duo.get(rank);
  g.save();
  chamfer(g, wx, wy, ww, wh, c);
  g.clip();
  if (pic) {
    const P = PORTRAIT[rank];
    const s = Math.max(ww, wh) / pic.width * P.zoom;
    const dw = pic.width * s;
    const dh = pic.height * s;
    let dx = wx + ww / 2 - P.fx * dw;
    let dy = wy + wh / 2 - P.fy * dh;
    dx = Math.min(wx, Math.max(wx + ww - dw, dx));
    dy = Math.min(wy, Math.max(wy + wh - dh, dy));
    g.drawImage(pic, dx, dy, dw, dh);
  } else {
    // görsel yoksa: süslü altın harf
    sunburst(g, w / 2, h / 2, w * 0.05, w * 0.6, 36, 0.35);
    g.font = `900 ${0.5 * h}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = grad(g, 0, h * 0.3, 0, h * 0.7, GOLD);
    g.fillText(RANK_TXT[rank], w / 2, h / 2);
  }
  // kenar karartma
  const vg = g.createRadialGradient(w / 2, h * 0.45, w * 0.25, w / 2, h * 0.5, h * 0.62);
  vg.addColorStop(0, 'rgba(6,6,9,0)');
  vg.addColorStop(1, 'rgba(6,6,9,0.75)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.restore();

  // pencere çerçevesi
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = grad(g, 0, 0, w, h, GOLD_BANDS);
  chamfer(g, wx, wy, ww, wh, c);
  g.stroke();
  const ins = 0.022 * w;
  g.lineWidth = Math.max(0.5, 0.004 * w);
  g.globalAlpha = 0.7;
  chamfer(g, wx + ins, wy + ins, ww - 2 * ins, wh - 2 * ins, c * 0.7);
  g.stroke();
  g.globalAlpha = 1;

  // köşe indeks plakaları (sol üst + sağ alt)
  for (const flip of [false, true]) {
    g.save();
    if (flip) {
      g.translate(w, h);
      g.rotate(Math.PI);
    }
    const ix = indexGeom(g, w, h, rank);
    const px = 0.34 * w;
    const py = ix.suitY + ix.suitS / 2 + 0.05 * w;
    const pc = 0.07 * w;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(px, 0);
    g.lineTo(px, py - pc);
    g.lineTo(px - pc, py);
    g.lineTo(0, py);
    g.closePath();
    g.fillStyle = '#0d0d11';
    g.fill();
    g.lineWidth = Math.max(0.8, 0.009 * w);
    g.strokeStyle = grad(g, 0, 0, px, py, GOLD);
    g.beginPath();
    g.moveTo(px, wy);
    g.lineTo(px, py - pc);
    g.lineTo(px - pc, py);
    g.lineTo(wx, py);
    g.stroke();
    g.restore();
    drawIndex(g, w, h, suit, rank, flip);
  }

  // isim şeridi (alt orta-sol)
  g.save();
  const fs = 0.072 * w;
  g.font = `900 ${fs}px ${FONT}`;
  g.letterSpacing = `${fs * 0.18}px`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const name = COURT_NAME[rank];
  const nw = g.measureText(name).width + fs * 1.2;
  const ny = h - wy - fs * 1.1;
  const nx = w * 0.42;
  g.fillStyle = 'rgba(10,10,13,0.85)';
  chamfer(g, nx - nw / 2, ny - fs * 0.75, nw, fs * 1.5, fs * 0.4);
  g.fill();
  g.lineWidth = Math.max(0.5, 0.004 * w);
  g.strokeStyle = grad(g, nx - nw / 2, 0, nx + nw / 2, 0, GOLD_BANDS);
  g.stroke();
  g.fillStyle = grad(g, 0, ny - fs / 2, 0, ny + fs / 2, GOLD);
  g.fillText(name, nx + fs * 0.09, ny + fs * 0.04);
  g.restore();
}

// ---------- arka yüz ----------
function drawBackArt(g: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const m = 0.085 * w;
  const pw = w - 2 * m;
  const ph = h - 2 * m;
  const c = 0.06 * w;

  // panel içi: güneş ışınları + köşe yelpazeleri
  g.save();
  chamfer(g, m, m, pw, ph, c);
  g.clip();
  const pg = g.createRadialGradient(cx, cy, 0, cx, cy, h * 0.6);
  pg.addColorStop(0, '#1c1a16');
  pg.addColorStop(1, '#0b0b0e');
  g.fillStyle = pg;
  g.fillRect(0, 0, w, h);
  // ince ışın çizgileri
  g.strokeStyle = grad(g, 0, 0, w, h, GOLD);
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.globalAlpha = i % 2 ? 0.28 : 0.55;
    g.lineWidth = Math.max(0.4, w * (i % 2 ? 0.0035 : 0.006));
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * w * 0.33, cy + Math.sin(a) * w * 0.33);
    g.lineTo(cx + Math.cos(a) * h, cy + Math.sin(a) * h);
    g.stroke();
  }
  g.globalAlpha = 1;
  // panel kenarlarına doğru koyulaşma
  const vg = g.createRadialGradient(cx, cy, w * 0.3, cx, cy, h * 0.62);
  vg.addColorStop(0, 'rgba(11,11,14,0)');
  vg.addColorStop(1, 'rgba(11,11,14,0.7)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // basamaklı halkalar (art-deco)
  for (const [r, a] of [[0.4, 0.5], [0.47, 0.35], [0.56, 0.22]] as [number, number][]) {
    ring(g, cx, cy, w * r, Math.max(0.5, w * 0.004), a);
  }
  g.restore();

  // köşe yelpazeleri (4 köşe)
  const u = w / 150;
  const k = m + 0.012 * w;
  cornerFan(g, k, k, 1, 1, u * 1.25);
  cornerFan(g, w - k, k, -1, 1, u * 1.25);
  cornerFan(g, k, h - k, 1, -1, u * 1.25);
  cornerFan(g, w - k, h - k, -1, -1, u * 1.25);

  // panel çift çizgi
  g.strokeStyle = grad(g, 0, 0, w, h, GOLD_BANDS);
  g.lineWidth = Math.max(0.8, 0.01 * w);
  chamfer(g, m, m, pw, ph, c);
  g.stroke();
  g.lineWidth = Math.max(0.5, 0.004 * w);
  const m2 = m + 0.022 * w;
  chamfer(g, m2, m2, w - 2 * m2, h - 2 * m2, c * 0.8);
  g.stroke();

  // merkez madalyon: sekizgen + daire
  const R = 0.27 * w;
  g.save();
  g.translate(cx, cy);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = R * 1.16;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#0c0c0f';
  g.fill();
  g.lineWidth = Math.max(0.8, w * 0.008);
  g.strokeStyle = grad(g, -R, -R, R, R, GOLD_BANDS);
  g.stroke();
  g.restore();
  ring(g, cx, cy, R, Math.max(1.2, w * 0.016));
  ring(g, cx, cy, R * 0.86, Math.max(0.5, w * 0.004), 0.9);
  dots(g, cx, cy, R * 0.93, 32, w * 0.0065);
  // küçük takım simgeleri (madalyon üst/alt)
  const ss = 0.075 * w;
  drawSuit(g, 'S', cx, cy - R * 0.55, ss);
  drawSuit(g, 'H', cx, cy + R * 0.55, ss, true);
  // PİŞTİ monogramı
  g.save();
  const fs = 0.13 * w;
  g.font = `900 ${fs}px ${FONT}`;
  g.letterSpacing = `${fs * 0.04}px`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const mt = g.measureText('PİŞTİ');
  const sx = Math.min(1, (R * 1.6) / mt.width);
  g.translate(cx, cy);
  g.scale(sx, 1);
  const base = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2;
  g.fillStyle = grad(g, 0, -fs * 0.5, 0, fs * 0.5, GOLD);
  g.fillText('PİŞTİ', fs * 0.02, base);
  g.restore();
  // ince yatay ayraçlar
  g.strokeStyle = grad(g, cx - R, 0, cx + R, 0, GOLD);
  g.lineWidth = Math.max(0.5, w * 0.004);
  g.beginPath();
  g.moveTo(cx - R * 0.62, cy - R * 0.33);
  g.lineTo(cx + R * 0.62, cy - R * 0.33);
  g.moveTo(cx - R * 0.62, cy + R * 0.33);
  g.lineTo(cx + R * 0.62, cy + R * 0.33);
  g.stroke();
}

// ---------- tarz ----------
export const skin: Skin = {
  id: 's3',
  name: 'Siyah-Altın VIP',
  desc: 'Mat siyah üstüne metalik altın, art-deco çerçeve ve altın portreli saray kartları.',
  async prepare(): Promise<void> {
    await import('@fontsource/playfair-display/900.css');
    try {
      await Promise.all([document.fonts.load(`900 40px ${FONT}`, 'AKQJ0123456789'), document.fonts.load(`900 40px ${FONT}`, 'PİŞTİ VALE KIZ PAPAZ')]);
    } catch {
      /* yazı tipi yoksa yedek serif kullanılır */
    }
    await Promise.all(
      Object.entries(PORTRAIT).map(async ([r, p]) => {
        if (duo.has(+r)) return;
        try {
          duo.set(+r, duotone(await loadImg(p.url)));
        } catch (e) {
          console.warn(e);
        }
      }),
    );
  },
  drawFace(g, w, h, suit, rank): void {
    g.save();
    rr(g, 0, 0, w, h, 0.08 * w);
    g.clip();
    base(g, w, h);
    if (rank >= 11) {
      drawCourt(g, w, h, suit, rank);
    } else {
      cornerFan(g, w - 0.075 * w, 0.075 * w, -1, 1, w / 150);
      cornerFan(g, 0.075 * w, h - 0.075 * w, 1, -1, w / 150);
      if (rank === 1) drawAce(g, w, h, suit);
      else {
        // pip'lerin arkasında çok hafif art-deco ışıma
        sunburst(g, w / 2, h / 2, w * 0.012, h * 0.42, 32, 0.12);
        drawPips(g, w, h, suit, rank);
      }
      drawIndex(g, w, h, suit, rank, false);
      drawIndex(g, w, h, suit, rank, true);
    }
    rim(g, w, h);
    g.restore();
  },
  drawBack(g, w, h): void {
    g.save();
    rr(g, 0, 0, w, h, 0.08 * w);
    g.clip();
    base(g, w, h);
    drawBackArt(g, w, h);
    rim(g, w, h);
    g.restore();
  },
};
