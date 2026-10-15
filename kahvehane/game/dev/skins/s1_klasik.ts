// "Klasik Altın" — fildişi kâğıt, geleneksel kırmızı/siyah, altın varak çerçeve.
// Papaz/Kız/Vale kartlarında oyunun karakterleri (Rıza, Defne, Cem) madalyon içinde.
// Modülün üst düzeyi yan etkisizdir: yazı tipi ve görseller prepare() içinde yüklenir.
import rizaUrl from '../../assets/riza_avatar.jpg?url';
import defneUrl from '../../assets/art/defne_avatar.jpg?url';
import cemUrl from '../../assets/art/cem_avatar.jpg?url';
import type {Skin, Suit} from './contract';

const KIRMIZI = '#c4122f';
const SIYAH = '#15171c';
const FONT = '"Playfair Display", "Times New Roman", Georgia, serif';

// ---- hazırlık durumu (prepare doldurur) ----
let kagit: HTMLCanvasElement | null = null; // kâğıt dokusu
const portre: Partial<Record<number, HTMLImageElement>> = {};
let capOran = 0.71; // büyük harf yüksekliği / font boyutu (ölçülür)

/** Yüz kırpma: kaynak görselde (256²) yüzün merkezi ve kare kırpma boyu */
const KIRP: Record<number, {x: number; y: number; s: number}> = {
  13: {x: 138, y: 130, s: 240}, // Rıza
  12: {x: 136, y: 150, s: 236}, // Defne
  11: {x: 142, y: 146, s: 226}, // Cem
};
const UNVAN: Record<number, string> = {11: 'VALE', 12: 'KIZ', 13: 'PAPAZ'};

function yukle(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, hata) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => hata(new Error('görsel yüklenemedi: ' + url));
    im.src = url;
  });
}

// basit tohumlu rastgele (doku her seferinde aynı olsun)
function rastgele(tohum: number): () => number {
  let s = tohum >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function kagitDokusu(): HTMLCanvasElement {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d')!;
  const r = rastgele(1923);
  const id = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = r();
    id.data[i * 4] = 120;
    id.data[i * 4 + 1] = 92;
    id.data[i * 4 + 2] = 50;
    id.data[i * 4 + 3] = Math.floor(v * v * 34);
  }
  x.putImageData(id, 0, 0);
  // ince lifler
  x.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const px = r() * N, py = r() * N, a = r() * Math.PI, l = 6 + r() * 18;
    x.strokeStyle = `rgba(${r() < 0.5 ? '150,120,70' : '255,255,245'},${0.10 + r() * 0.12})`;
    x.lineWidth = 0.6 + r() * 0.6;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + r() * 3, py + Math.sin(a) * l * 0.5 + r() * 3, px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  return c;
}

// ---- takım şekilleri (100×100 kutuda, merkez 50,50) ----
let SEKIL: Record<Suit, Path2D> | null = null;
function sekiller(): Record<Suit, Path2D> {
  if (SEKIL) return SEKIL;
  const H = new Path2D('M50,96 C46,86 35,75 23,63 C11,51 3,41 3,28 C3,13 14,4 27,4 C38,4 46,11 50,21 C54,11 62,4 73,4 C86,4 97,13 97,28 C97,41 89,51 77,63 C65,75 54,86 50,96 Z');
  const D = new Path2D('M50,2 C59,17 72,34 88,50 C72,66 59,83 50,98 C41,83 28,66 12,50 C28,34 41,17 50,2 Z');
  const S = new Path2D(
    'M50,3 C55,15 67,27 80,38 C92,48 98,57 98,67 C98,80 88,88 76,88 C67,88 60,84 55,77 C56,87 61,93 70,98 L30,98 C39,93 44,87 45,77 C40,84 33,88 24,88 C12,88 2,80 2,67 C2,57 8,48 20,38 C33,27 45,15 50,3 Z',
  );
  const C = new Path2D();
  const daire = (cx: number, cy: number, r: number) => {
    C.moveTo(cx + r, cy);
    C.arc(cx, cy, r, 0, Math.PI * 2);
  };
  daire(50, 27, 21.5);
  daire(26.5, 59, 21.5);
  daire(73.5, 59, 21.5);
  daire(50, 54, 12);
  // sap (saat yönünde, dairelerle aynı dönüş → birleşim)
  C.moveTo(50, 56);
  C.bezierCurveTo(51, 74, 57, 89, 69, 98);
  C.lineTo(31, 98);
  C.bezierCurveTo(43, 89, 49, 74, 50, 56);
  C.closePath();
  SEKIL = {S, H, D, C};
  return SEKIL;
}

const kirmiziMi = (s: Suit) => s === 'H' || s === 'D';
const renk = (s: Suit) => (kirmiziMi(s) ? KIRMIZI : SIYAH);

/** Takım işaretini (cx,cy) merkezli, boy yüksekliğinde çizer. ters=180° döndür. */
function takim(g: CanvasRenderingContext2D, s: Suit, cx: number, cy: number, boy: number, ters = false, dolgu?: string | CanvasGradient): void {
  const k = boy / 100;
  g.save();
  g.translate(cx, cy);
  if (ters) g.rotate(Math.PI);
  g.scale(k, k);
  g.translate(-50, -50);
  if (dolgu) g.fillStyle = dolgu;
  else {
    const gr = g.createLinearGradient(0, 0, 0, 100);
    if (kirmiziMi(s)) {
      gr.addColorStop(0, '#dc2a46');
      gr.addColorStop(0.55, KIRMIZI);
      gr.addColorStop(1, '#9c0b24');
    } else {
      gr.addColorStop(0, '#3a3d46');
      gr.addColorStop(0.5, SIYAH);
      gr.addColorStop(1, '#08090b');
    }
    g.fillStyle = gr;
  }
  g.fill(sekiller()[s]);
  g.restore();
}

// ---- altın ----
function altin(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, koyu = false): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  if (koyu) {
    // fildişi üstünde okunması için daha doygun altın
    gr.addColorStop(0, '#a87a22');
    gr.addColorStop(0.18, '#e2bd55');
    gr.addColorStop(0.34, '#b8862a');
    gr.addColorStop(0.5, '#f0d27a');
    gr.addColorStop(0.62, '#a97a20');
    gr.addColorStop(0.8, '#d9b24c');
    gr.addColorStop(1, '#9a6d1c');
  } else {
    gr.addColorStop(0, '#c99a2e');
    gr.addColorStop(0.2, '#f7e08a');
    gr.addColorStop(0.38, '#c99a2e');
    gr.addColorStop(0.52, '#fff1b0');
    gr.addColorStop(0.68, '#c99a2e');
    gr.addColorStop(0.85, '#f7e08a');
    gr.addColorStop(1, '#b8862a');
  }
  return gr;
}

function yuvarlak(g: CanvasRenderingContext2D | Path2D, x: number, y: number, w: number, h: number, r: number): void {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function kartYolu(w: number, h: number): Path2D {
  const p = new Path2D();
  yuvarlak(p, 0, 0, w, h, w * 0.08);
  return p;
}

// ---- yüz zemini: fildişi + doku + sıcak iç gölge ----
function zemin(g: CanvasRenderingContext2D, w: number, h: number): void {
  const yol = kartYolu(w, h);
  g.save();
  g.clip(yol);
  const rg = g.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.5, h * 0.5, h * 0.75);
  rg.addColorStop(0, '#fffbf1');
  rg.addColorStop(0.55, '#faf2e0');
  rg.addColorStop(1, '#ecdcb8');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
  if (kagit) {
    const pt = g.createPattern(kagit, 'repeat');
    if (pt) {
      pt.setTransform(new DOMMatrix().scale(0.5));
      g.globalAlpha = 0.55;
      g.fillStyle = pt;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
    }
  }
  // kenarlarda sıcak iç gölge
  g.lineWidth = w * 0.05;
  g.strokeStyle = 'rgba(150,105,40,0.10)';
  g.stroke(yol);
  g.lineWidth = w * 0.018;
  g.strokeStyle = 'rgba(150,105,40,0.12)';
  g.stroke(yol);
  g.restore();
  // ince kenar çizgisi (mavi zeminde net dursun)
  g.save();
  g.lineWidth = Math.max(0.6, w * 0.006);
  g.strokeStyle = 'rgba(120,90,45,0.55)';
  const ic = new Path2D();
  const t = g.lineWidth / 2;
  yuvarlak(ic, t, t, w - 2 * t, h - 2 * t, w * 0.08 - t);
  g.stroke(ic);
  g.restore();
}

// ---- altın çerçeve + köşe süsleri ----
// Çerçeve indeks köşelerinde (sol üst, sağ alt) açık kalır; uçlarda altın boncuk.
const CENTIK_X = 0.3, CENTIK_Y = 0.365; // açıklığın bittiği yer (w ve h oranı)

function acikCerceve(p: Path2D, w: number, h: number, ins: number, r: number): void {
  const xN = w * CENTIK_X, yN = h * CENTIK_Y;
  // üst kenar → sağ üst köşe → sağ kenar (sağ alt açıklığa kadar)
  p.moveTo(xN, ins);
  p.arcTo(w - ins, ins, w - ins, h - ins, r);
  p.lineTo(w - ins, h - yN);
  // sol kenar → sol alt köşe → alt kenar
  p.moveTo(ins, yN);
  p.arcTo(ins, h - ins, w - ins, h - ins, r);
  p.lineTo(w - xN, h - ins);
}

function cerceve(g: CanvasRenderingContext2D, w: number, h: number): void {
  const a = w * 0.034, b = w * 0.052;
  const altinG = altin(g, 0, 0, w, h, true);
  g.save();
  g.lineCap = 'round';
  const p1 = new Path2D();
  acikCerceve(p1, w, h, a, w * 0.05);
  // alttan koyu gölge = kabartma
  g.lineWidth = w * 0.011;
  g.strokeStyle = 'rgba(90,60,15,0.32)';
  g.translate(0, w * 0.003);
  g.stroke(p1);
  g.translate(0, -w * 0.003);
  g.strokeStyle = altinG;
  g.stroke(p1);
  const p2 = new Path2D();
  acikCerceve(p2, w, h, b, w * 0.034);
  g.lineWidth = Math.max(0.5, w * 0.0045);
  g.stroke(p2);
  // açıklık uçlarında boncuk
  g.fillStyle = altinG;
  const xN = w * CENTIK_X, yN = h * CENTIK_Y, m = (a + b) / 2;
  for (const [x, y] of [[xN, m], [m, yN], [w - xN, h - m], [w - m, h - yN]]) {
    g.beginPath();
    g.arc(x, y, w * 0.0125, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // köşe süsleri: sağ üst ve sol alt
  kose(g, w - b, b, w, -1, 1);
  kose(g, b, h - b, w, 1, -1);
}

/** (x,y) iç çerçeve köşesi; sx,sy içeri doğru yön */
function kose(g: CanvasRenderingContext2D, x: number, y: number, w: number, sx: number, sy: number): void {
  const s = w * 0.2;
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  const ag = altin(g, 0, 0, s, s, true);
  g.strokeStyle = ag;
  g.fillStyle = ag;
  g.lineCap = 'round';
  g.lineWidth = w * 0.0075;
  // köşe kavisi
  g.beginPath();
  g.moveTo(s * 0.1, s * 0.62);
  g.bezierCurveTo(s * 0.1, s * 0.3, s * 0.3, s * 0.1, s * 0.62, s * 0.1);
  g.stroke();
  // kıvrımlar
  g.lineWidth = w * 0.0055;
  for (const yon of [0, 1]) {
    g.save();
    if (yon) {
      g.transform(0, 1, 1, 0, 0, 0); // köşegene göre ayna
    }
    g.beginPath();
    g.moveTo(s * 0.62, s * 0.1);
    g.bezierCurveTo(s * 0.78, s * 0.1, s * 0.86, s * 0.2, s * 0.8, s * 0.27);
    g.bezierCurveTo(s * 0.75, s * 0.32, s * 0.68, s * 0.27, s * 0.71, s * 0.22);
    g.stroke();
    g.beginPath();
    g.arc(s * 0.98, s * 0.1, w * 0.008, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // ortadaki baklava
  g.beginPath();
  const m = s * 0.3, d = s * 0.1;
  g.moveTo(m, m - d);
  g.lineTo(m + d * 0.8, m);
  g.lineTo(m, m + d);
  g.lineTo(m - d * 0.8, m);
  g.closePath();
  g.save();
  g.translate(m, m);
  g.rotate(-Math.PI / 4);
  g.translate(-m, -m);
  g.fill();
  g.restore();
  g.restore();
}

// ---- köşe indeksi ----
function etiket(r: number): string {
  return r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);
}

function indeks(g: CanvasRenderingContext2D, w: number, h: number, s: Suit, r: number): void {
  const cx = w * 0.15;
  const ust = h * 0.046;
  const capH = h * 0.158;
  const on = r === 10;
  const fs = (capH / capOran) * (on ? 0.94 : 1);
  const maxW = w * (on ? 0.215 : 0.23);
  g.save();
  g.fillStyle = renk(s);
  g.font = `900 ${fs}px ${FONT}`;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const yazi = etiket(r);
  const taban = ust + capH;
  const tabanY = on ? ust + capH * 0.94 : taban;
  if (yazi === '10') {
    // iki rakam sıkıştırılmış
    const m1 = g.measureText('1'), m0 = g.measureText('0');
    const w1 = m1.actualBoundingBoxRight + m1.actualBoundingBoxLeft;
    const w0 = m0.actualBoundingBoxRight + m0.actualBoundingBoxLeft;
    const bosluk = -fs * 0.02;
    const top = w1 + w0 + bosluk;
    const k = Math.min(1, maxW / top);
    g.save();
    g.translate(cx, tabanY);
    g.scale(k, 1);
    let x = -top / 2;
    g.fillText('1', x + m1.actualBoundingBoxLeft, 0);
    x += w1 + bosluk;
    g.fillText('0', x + m0.actualBoundingBoxLeft, 0);
    g.restore();
  } else {
    const m = g.measureText(yazi);
    const gen = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
    const k = Math.min(1, maxW / gen);
    g.save();
    g.translate(cx, taban);
    g.scale(k, 1);
    g.fillText(yazi, -gen / 2 + m.actualBoundingBoxLeft, 0);
    g.restore();
  }
  g.restore();
  // altında takım işareti
  const tb = w * 0.15;
  takim(g, s, cx, taban + h * (yazi === 'Q' ? 0.036 : 0.022) + tb / 2, tb);
}

function indeksler(g: CanvasRenderingContext2D, w: number, h: number, s: Suit, r: number): void {
  indeks(g, w, h, s, r);
  g.save();
  g.translate(w, h);
  g.rotate(Math.PI);
  indeks(g, w, h, s, r);
  g.restore();
}

// ---- sayı kartları: geleneksel dizilim ----
// [x sütunu (-1,0,1), y (0=üst .. 1=alt)]
const DIZILIM: Record<number, [number, number][]> = {
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

function sayilar(g: CanvasRenderingContext2D, w: number, h: number, s: Suit, r: number): void {
  const xs = w * 0.165, y0 = h * 0.25, y1 = h * 0.75;
  const boy = w * (r >= 9 ? 0.15 : r >= 7 ? 0.165 : 0.18);
  for (const [cx, cy] of DIZILIM[r]) {
    const x = w * 0.5 + cx * xs;
    const y = y0 + (y1 - y0) * cy;
    takim(g, s, x, y, boy, cy > 0.5 + 1e-6);
  }
}

// ---- As ----
function lale(g: CanvasRenderingContext2D, t: number): void {
  // (0,0) tabanda, yukarı (−y) bakan altın lale
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(t * 0.34, -t * 0.32, t * 0.24, -t * 0.78, 0, -t);
  g.bezierCurveTo(-t * 0.24, -t * 0.78, -t * 0.34, -t * 0.32, 0, 0);
  for (const sg of [1, -1]) {
    g.moveTo(0, -t * 0.05);
    g.bezierCurveTo(sg * t * 0.2, -t * 0.08, sg * t * 0.56, -t * 0.28, sg * t * 0.52, -t * 0.7);
    g.bezierCurveTo(sg * t * 0.38, -t * 0.46, sg * t * 0.18, -t * 0.36, 0, -t * 0.16);
  }
  g.fill();
}

function as(g: CanvasRenderingContext2D, w: number, h: number, s: Suit): void {
  const cx = w * 0.5, cy = h * 0.5;
  const maca = s === 'S';
  const R = w * 0.33;
  // sıcak hale
  const hl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
  hl.addColorStop(0, 'rgba(255,236,170,0.6)');
  hl.addColorStop(0.7, 'rgba(240,200,110,0.18)');
  hl.addColorStop(1, 'rgba(240,200,110,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
  g.fill();

  const ag = altin(g, cx - R, cy - R, cx + R, cy + R, true);
  g.save();
  g.strokeStyle = ag;
  g.fillStyle = ag;
  if (maca) {
    // güneş ışınları
    g.lineWidth = w * 0.0028;
    g.globalAlpha = 0.5;
    for (let i = 0; i < 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const r0 = R * 0.55, r1 = R - w * 0.032;
      g.beginPath();
      g.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0);
      g.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // çift halka
  g.lineWidth = w * (maca ? 0.012 : 0.009);
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = w * 0.004;
  g.beginPath();
  g.arc(cx, cy, R - w * 0.022, 0, Math.PI * 2);
  g.stroke();
  // telkari: halka dışında yaprak + boncuk
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    if (maca && i % 6 === 0) continue; // ana yönlerde lale var
    g.save();
    g.translate(cx + Math.cos(t) * (R + w * 0.018), cy + Math.sin(t) * (R + w * 0.018));
    g.rotate(t);
    if (i % 2 === 0) {
      g.beginPath();
      g.moveTo(-w * 0.012, 0);
      g.quadraticCurveTo(0, -w * 0.011, w * 0.022, 0);
      g.quadraticCurveTo(0, w * 0.011, -w * 0.012, 0);
      g.fill();
    } else {
      g.beginPath();
      g.arc(0, 0, w * 0.0065, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // iç boncuklar
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.arc(cx + Math.cos(t) * (R - w * 0.011), cy + Math.sin(t) * (R - w * 0.011), w * 0.0035, 0, Math.PI * 2);
    g.fill();
  }
  if (maca) {
    // dört ana yönde altın lale
    for (let i = 0; i < 4; i++) {
      const t = (i / 4) * Math.PI * 2 - Math.PI / 2;
      g.save();
      g.translate(cx + Math.cos(t) * (R + w * 0.004), cy + Math.sin(t) * (R + w * 0.004));
      g.rotate(t + Math.PI / 2);
      lale(g, w * 0.07);
      g.restore();
    }
  }
  g.restore();

  // büyük takım
  const boy = w * (maca ? 0.48 : 0.42);
  takim(g, s, cx, cy, boy);
  if (maca) {
    // maçanın içinde altın iç kontur + rozet
    g.save();
    g.translate(cx, cy);
    const k = (boy * 0.8) / 100;
    g.scale(k, k);
    g.translate(-50, -46);
    g.strokeStyle = altin(g, 0, 0, 100, 100);
    g.lineWidth = 1.7;
    g.stroke(sekiller().S);
    g.restore();
    g.save();
    g.translate(cx, cy + boy * 0.04);
    g.fillStyle = altin(g, -boy * 0.12, -boy * 0.12, boy * 0.12, boy * 0.12);
    for (let i = 0; i < 4; i++) {
      g.save();
      g.rotate((i / 4) * Math.PI * 2);
      lale(g, boy * 0.15);
      g.restore();
    }
    g.fillStyle = SIYAH;
    g.beginPath();
    g.arc(0, 0, boy * 0.02, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // marka satırı
    g.save();
    g.font = `900 ${w * 0.048}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#8a5f17';
    try {
      g.letterSpacing = `${w * 0.012}px`;
    } catch {
      /* eski tarayıcı */
    }
    g.fillText('KAHVEHANE', cx, h * 0.8);
    g.restore();
  }
}

// ---- Papaz / Kız / Vale ----
function kurdele(g: CanvasRenderingContext2D, cx: number, cy: number, gen: number, yuk: number, yazi: string, w: number): void {
  const hw = gen / 2;
  const kuy = yuk * 0.6; // kuyruk uzunluğu
  const ins = yuk * 0.35; // kuyruk aşağı kayması
  g.save();
  // kuyruklar (koyu altın, V kesik)
  const koyu = altin(g, cx - hw - kuy, cy, cx + hw + kuy, cy + yuk, true);
  for (const sg of [-1, 1]) {
    const x0 = cx + sg * (hw - yuk * 0.25);
    const x1 = cx + sg * (hw + kuy);
    g.beginPath();
    g.moveTo(x0, cy - yuk / 2 + ins);
    g.lineTo(x1, cy - yuk / 2 + ins);
    g.lineTo(x1 - sg * yuk * 0.35, cy + ins);
    g.lineTo(x1, cy + yuk / 2 + ins);
    g.lineTo(x0, cy + yuk / 2 + ins);
    g.closePath();
    g.fillStyle = koyu;
    g.fill();
    g.fillStyle = 'rgba(70,40,5,0.35)';
    g.fill();
    // kıvrım üçgeni
    g.beginPath();
    g.moveTo(cx + sg * hw, cy + yuk / 2);
    g.lineTo(cx + sg * (hw - yuk * 0.25), cy + yuk / 2 + ins);
    g.lineTo(cx + sg * (hw - yuk * 0.25), cy + yuk / 2);
    g.closePath();
    g.fillStyle = '#6e4a10';
    g.fill();
  }
  // ana bant
  g.beginPath();
  g.rect(cx - hw, cy - yuk / 2, gen, yuk);
  g.fillStyle = altin(g, cx - hw, cy - yuk, cx + hw, cy + yuk);
  g.fill();
  g.lineWidth = w * 0.004;
  g.strokeStyle = '#8a5f17';
  g.stroke();
  // yazı
  const fs = yuk * 0.66;
  g.font = `900 ${fs}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#4a2a06';
  const ls = fs * 0.1;
  const harf = [...yazi];
  const gw = harf.map(c => g.measureText(c).width);
  const top = gw.reduce((a, b) => a + b, 0) + ls * (harf.length - 1);
  let x = cx - top / 2;
  for (let i = 0; i < harf.length; i++) {
    g.fillText(harf[i], x + gw[i] / 2, cy + yuk * 0.04);
    x += gw[i] + ls;
  }
  g.restore();
}

function saray(g: CanvasRenderingContext2D, w: number, h: number, s: Suit, r: number): void {
  const cx = w * 0.5, cy = h * 0.435;
  const a = w * 0.28, b = h * 0.2;
  // madalyonun arkası
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
  g.clip();
  const im = portre[r];
  if (im) {
    const k = KIRP[r];
    // elips kutusunun oranına göre kaynak kırpma
    const oran = a / b;
    let sw = k.s, sh = k.s;
    if (oran < 1) sw = sh * oran;
    else sh = sw / oran;
    const sx = Math.max(0, Math.min(256 - sw, k.x - sw / 2));
    const sy = Math.max(0, Math.min(256 - sh, k.y - sh / 2));
    g.drawImage(im, sx, sy, sw, sh, cx - a, cy - b, a * 2, b * 2);
    // sıcak ton + kenar karartma
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = 'rgba(255,200,120,0.35)';
    g.fillRect(cx - a, cy - b, a * 2, b * 2);
    g.globalCompositeOperation = 'source-over';
    const vg = g.createRadialGradient(cx, cy - b * 0.1, Math.min(a, b) * 0.55, cx, cy, Math.max(a, b) * 1.02);
    vg.addColorStop(0, 'rgba(40,20,5,0)');
    vg.addColorStop(1, 'rgba(40,20,5,0.55)');
    g.fillStyle = vg;
    g.fillRect(cx - a, cy - b, a * 2, b * 2);
  } else {
    // yedek: süslü harf
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, b);
    bg.addColorStop(0, '#fff8e6');
    bg.addColorStop(1, '#ead6a8');
    g.fillStyle = bg;
    g.fillRect(cx - a, cy - b, a * 2, b * 2);
    g.font = `900 ${b * 1.25}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = renk(s);
    g.fillText(etiket(r), cx, cy + b * 0.05);
  }
  g.restore();
  // altın çerçeve halkası
  g.save();
  const ag = altin(g, cx - a, cy - b, cx + a, cy + b);
  g.lineWidth = w * 0.026;
  g.strokeStyle = 'rgba(80,50,10,0.45)';
  g.beginPath();
  g.ellipse(cx, cy + w * 0.003, a + w * 0.011, b + w * 0.011, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = ag;
  g.beginPath();
  g.ellipse(cx, cy, a + w * 0.011, b + w * 0.011, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = w * 0.004;
  g.strokeStyle = '#7a5214';
  g.beginPath();
  g.ellipse(cx, cy, a + w * 0.002, b + w * 0.002, 0, 0, Math.PI * 2);
  g.stroke();
  // takım rengi iç ince halka
  g.lineWidth = w * 0.005;
  g.strokeStyle = renk(s);
  g.beginPath();
  g.ellipse(cx, cy, a - w * 0.003, b - w * 0.003, 0, 0, Math.PI * 2);
  g.stroke();
  // boncuklar
  g.fillStyle = altin(g, cx - a, cy - b, cx + a, cy + b, true);
  const n = 36;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    g.beginPath();
    g.arc(cx + Math.cos(t) * (a + w * 0.031), cy + Math.sin(t) * (b + w * 0.031), w * 0.0055, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // üstte ve altta takım işareti
  takim(g, s, cx, h * 0.125, w * 0.13);
  takim(g, s, cx, h * 0.83, w * 0.13);
  // kurdele
  kurdele(g, cx, cy + b * 0.93, w * 0.36, h * 0.074, UNVAN[r], w);
}

// ---- arka yüz ----
function arka(g: CanvasRenderingContext2D, w: number, h: number): void {
  const yol = kartYolu(w, h);
  g.save();
  g.clip(yol);
  const bg = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, h * 0.7);
  bg.addColorStop(0, '#7d1529');
  bg.addColorStop(0.6, '#560b1b');
  bg.addColorStop(1, '#350611');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const a = w * 0.045, b = w * 0.075;
  const ag = altin(g, 0, 0, w, h);
  // kafes: iç alan
  g.save();
  const icY = new Path2D();
  yuvarlak(icY, b, b, w - 2 * b, h - 2 * b, w * 0.035);
  g.clip(icY);
  const s = w * 0.2, P = s * 0.72; // hücre genişliği, yarım boy
  g.strokeStyle = ag;
  g.lineWidth = w * 0.0065;
  g.globalAlpha = 0.6;
  const ox = w * 0.5, oy = h * 0.5;
  const nx = Math.ceil(w / s / 2) + 1;
  const ny = Math.ceil(h / P / 2) + 1;
  for (let k = -nx; k <= nx; k++) {
    for (const sg of [1, -1]) {
      g.beginPath();
      for (let i = -ny * 16; i <= ny * 16; i++) {
        const yy = (i / 16) * P;
        const xx = ox + k * s + sg * (s / 2) * Math.sin((Math.PI * yy) / P);
        if (i === -ny * 16) g.moveTo(xx, oy + yy);
        else g.lineTo(xx, oy + yy);
      }
      g.stroke();
    }
  }
  // mercek merkezlerinde lale benzeri küçük rozet, değme noktalarında nokta
  g.fillStyle = ag;
  for (let k = -nx; k <= nx; k++) {
    for (let j = -ny; j <= ny; j++) {
      const x = ox + k * s, y = oy + (j + 0.5) * P;
      g.beginPath();
      g.moveTo(x, y - P * 0.2);
      g.lineTo(x + s * 0.09, y);
      g.lineTo(x, y + P * 0.2);
      g.lineTo(x - s * 0.09, y);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(x + s / 2, oy + j * P, w * 0.009, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  // merkeze doğru hafif koyulaştırma (madalyon öne çıksın)
  const vg = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.42);
  vg.addColorStop(0, 'rgba(60,5,15,0.85)');
  vg.addColorStop(1, 'rgba(60,5,15,0)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.restore();

  // çerçeveler
  g.strokeStyle = ag;
  const p1 = new Path2D();
  yuvarlak(p1, a, a, w - 2 * a, h - 2 * a, w * 0.05);
  g.lineWidth = w * 0.014;
  g.stroke(p1);
  g.lineWidth = Math.max(0.5, w * 0.005);
  g.stroke(icY);

  // madalyon
  const cx = w * 0.5, cy = h * 0.5, R = w * 0.22;
  const md = g.createRadialGradient(cx, cy - R * 0.3, 0, cx, cy, R);
  md.addColorStop(0, '#8e1a30');
  md.addColorStop(1, '#4a0915');
  g.fillStyle = md;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = w * 0.014;
  g.strokeStyle = ag;
  g.stroke();
  g.lineWidth = w * 0.004;
  g.beginPath();
  g.arc(cx, cy, R - w * 0.025, 0, Math.PI * 2);
  g.stroke();
  // sekiz köşeli yıldız (iki kare)
  const yr = R * 0.78;
  g.lineWidth = w * 0.007;
  for (const dn of [0, Math.PI / 4]) {
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const t = dn + (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = cx + Math.cos(t) * yr, y = cy + Math.sin(t) * yr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  }
  // dört takım, altın
  const tb = R * 0.36, tr = R * 0.3;
  const dolgu = altin(g, cx - R, cy - R, cx + R, cy + R);
  takim(g, 'S', cx, cy - tr, tb, false, dolgu);
  takim(g, 'H', cx + tr, cy, tb, false, dolgu);
  takim(g, 'C', cx, cy + tr, tb, false, dolgu);
  takim(g, 'D', cx - tr, cy, tb, false, dolgu);
  // dış halka boncukları
  g.fillStyle = ag;
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    g.beginPath();
    g.arc(cx + Math.cos(t) * (R + w * 0.03), cy + Math.sin(t) * (R + w * 0.03), w * 0.0075, 0, Math.PI * 2);
    g.fill();
  }
  // hafif parıltı
  const sh = g.createLinearGradient(0, 0, w, h);
  sh.addColorStop(0, 'rgba(255,255,255,0.10)');
  sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  g.restore();
}

export const skin: Skin = {
  id: 's1',
  name: 'Klasik Altın',
  desc: 'Fildişi kâğıt, altın varak çerçeve ve madalyonda kahvehanenin yüzleri.',
  async prepare() {
    await import('@fontsource/playfair-display/900.css');
    try {
      await document.fonts.load(`900 64px "Playfair Display"`, 'AJQK10PAZ');
    } catch {
      /* yazı tipi yoksa yedek serif */
    }
    // büyük harf oranını ölç
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = `900 100px ${FONT}`;
    const m = c.measureText('K');
    if (m.actualBoundingBoxAscent > 0) capOran = m.actualBoundingBoxAscent / 100;
    kagit = kagitDokusu();
    const dosya: [number, string][] = [
      [13, rizaUrl],
      [12, defneUrl],
      [11, cemUrl],
    ];
    await Promise.all(
      dosya.map(async ([r, u]) => {
        try {
          portre[r] = await yukle(u);
        } catch {
          /* yedek: süslü harf */
        }
      }),
    );
  },
  drawFace(g, w, h, suit, rank) {
    zemin(g, w, h);
    cerceve(g, w, h);
    if (rank === 1) as(g, w, h, suit);
    else if (rank >= 11) saray(g, w, h, suit, rank);
    else sayilar(g, w, h, suit, rank);
    indeksler(g, w, h, suit, rank);
  },
  drawBack(g, w, h) {
    arka(g, w, h);
  },
};
