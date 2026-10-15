// Deste — "Büyük Dalga": Hokusai'nin "Kanagawa Açıklarında Büyük Dalga" (1831, kamu malı) baskısından esinlenen
// koleksiyon destesi. Ağaç baskı (ukiyo-e) dili: koyu kontur çizgileri, düz renk katmanları, "bokashi" geçişleri,
// Prusya mavisi, krem köpük pençeleri, kâğıt lifi dokusu ve zincifre (vermilyon) mühür kırmızısı.
// Hiçbir görsel indirilmez: sahneler prepare() içinde vektörle BİR KEZ çizilip saklanır; kart çizimi yalnız kopyalar.
import type {Skin, Suit} from './contract';

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

const FONT = '"Playfair Display", "Times New Roman", Georgia, serif';
const PW = 440, PH = Math.round(PW / 0.7);

// ───────────────────────── palet (baskı mürekkepleri) ─────────────────────────
const PRU = '#1f4f84', PRU_D = '#11305a', PRU_DD = '#0b2140', PRU_L = '#5e8fbd', PRU_P = '#a9c5da'; // Prusya mavisi
const FOAM = '#f5efdc'; // köpük kremi
const KEY = '#142339'; // kontur (keyline) mürekkebi
const VER = '#cf3f25'; // zincifre
const RED = '#cc3a22'; // köşe değerleri: kırmızı takımlar
const INK = '#112c4e'; // köşe değerleri: Prusya mürekkebi

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
/** Catmull-Rom: kontrol noktalarından yumuşak eğri noktaları. */
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
/** İki eşit uzunluklu nokta dizisi arasında ara eğri. */
function lerpPts(a: number[], b: number[], s: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * s);
}
function slicePts(p: number[], t0: number, t1: number): number[] {
  const n = p.length / 2;
  return p.slice(Math.floor(t0 * (n - 1)) * 2, (Math.floor(t1 * (n - 1)) + 1) * 2);
}
function reversePts(p: number[]): number[] {
  const out: number[] = [];
  for (let i = p.length / 2 - 1; i >= 0; i--) out.push(p[i * 2], p[i * 2 + 1]);
  return out;
}
function keyFill(g: Ctx, p: Path2D, fill: string | CanvasGradient, lw: number): void {
  g.fillStyle = fill;
  g.fill(p);
  g.strokeStyle = KEY;
  g.lineWidth = lw;
  g.stroke(p);
}

// ───────────────────────── kâğıt ─────────────────────────
/** Washi kâğıdı: sıcak krem zemin, lifler, benekler, hafif lekelenme. */
function paintPaper(w: number, h: number, seed: number, top = '#f3e9d0', bottom = '#e9dcbc'): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, h);
  const rnd = mulberry(seed);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 20; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 60;
    const b = g.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, rnd() < 0.5 ? 'rgba(170,140,90,0.035)' : 'rgba(255,255,245,0.08)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = b;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  paperGrain(g, w, h, rnd, 1);
  return c;
}
/** Lif ve benek dokusu (her renk katmanının üstüne de hafifçe basılır). */
function paperGrain(g: Ctx, w: number, h: number, rnd: Rnd, k: number): void {
  g.lineWidth = 0.6;
  for (let i = 0; i < 220 * k * ((w * h) / (440 * 629)); i++) {
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 4 + rnd() * 12;
    g.strokeStyle = rnd() < 0.55 ? 'rgba(120,96,60,0.09)' : 'rgba(255,255,250,0.22)';
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 3, y + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 1600 * k * ((w * h) / (440 * 629)); i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(90,70,40,0.08)' : 'rgba(255,255,250,0.14)';
    g.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
}
/** Ahşap kalıp dokusu: renk alanlarında ince yatay damarlar (çarpma ile). */
function woodGrain(g: Ctx, w: number, h: number, rnd: Rnd, a: number): void {
  g.save();
  g.globalCompositeOperation = 'multiply';
  for (let y = 0; y < h; y += 2.2) {
    if (rnd() < 0.55) continue;
    g.strokeStyle = `rgba(60,70,90,${a * (0.4 + rnd() * 0.6)})`;
    g.lineWidth = 0.7 + rnd() * 0.8;
    g.beginPath();
    const x0 = rnd() * w * 0.4;
    g.moveTo(x0, y);
    for (let x = x0; x < x0 + w * (0.3 + rnd() * 0.7); x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 1.2);
    g.stroke();
  }
  g.restore();
}

// ───────────────────────── dalga ve köpük ─────────────────────────
/** Köpük pençesi: kıvrılarak incelen krem parmak; dış yanına daha küçük parmaklar açılır (fraktal pençe). */
function claw(g: Ctx, x: number, y: number, ang: number, len: number, w: number, curl: number, depth: number, rnd: Rnd): void {
  const N = 14;
  const pts = [x, y];
  let a = ang, px = x, py = y;
  const heads: number[] = [ang];
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    a += (curl * (0.2 + 2.2 * u * u)) / N; // uca doğru sertleşen kıvrım
    px += (Math.cos(a) * len) / N;
    py += (Math.sin(a) * len) / N;
    pts.push(px, py);
    heads.push(a);
  }
  const p = ribbon(pts, t => {
    const ww = (w * Math.pow(1 - t, 0.9)) / 2 + 0.3;
    return [ww, ww];
  });
  g.fillStyle = FOAM;
  g.fill(p);
  g.strokeStyle = KEY;
  g.lineWidth = Math.max(0.6, Math.min(1.1, w * 0.14));
  g.stroke(p);
  if (depth > 0) {
    const ts = depth > 1 ? [0.28, 0.5, 0.7] : [0.4, 0.68];
    for (const t of ts) {
      const k = Math.round(t * N);
      const sub = len * (0.46 - t * 0.28) * (0.85 + rnd() * 0.3);
      claw(g, pts[k * 2], pts[k * 2 + 1], heads[k] - Math.sign(curl) * (0.55 + rnd() * 0.25), sub, w * (1 - t) * 0.7, curl * 1.15, depth - 1, rnd);
    }
  }
}

interface WaveSpec {
  outer: number[]; // dış kenar kontrol noktaları (tabandan dudak ucuna)
  inner: number[]; // iç yüz kontrol noktaları (aynı sayıda)
  foamFrom: number; // köpüğün başladığı yer (0..1)
  clawFrom: number; // pençelerin başladığı yer
  clawN: number;
  clawLen: number;
  seed: number;
  stripes?: number;
}
/** Büyük dalga gövdesi: koyu-orta-açık mavi katmanlar, akış çizgileri, krem köpük şeridi ve pençeler. */
function paintWave(g: Ctx, sp: WaveSpec): void {
  const rnd = mulberry(sp.seed);
  const O = spline(sp.outer, 16), I = spline(sp.inner, 16);
  const body = polyPath([...O, ...reversePts(I)], true);
  g.fillStyle = PRU_D;
  g.fill(body);
  // renk katmanları: dış koyu → iç açık (ayrı kalıplar gibi düz alanlar)
  const layers: [number, string][] = [
    [0.3, PRU],
    [0.62, '#3c6fa3'],
    [0.84, PRU_L],
  ];
  for (const [s, col] of layers) {
    const M = lerpPts(O, I, s);
    g.fillStyle = col;
    g.fill(polyPath([...M, ...reversePts(I)], true));
  }
  // akış çizgileri (dalganın yüzündeki açık damarlar)
  g.save();
  g.clip(body);
  const ns = sp.stripes ?? 14;
  for (let i = 0; i < ns; i++) {
    const s = 0.08 + (i / ns) * 0.88;
    const M = lerpPts(O, I, s + (rnd() - 0.5) * 0.03);
    const t0 = rnd() * 0.25, t1 = 0.55 + rnd() * 0.45;
    g.strokeStyle = s < 0.5 ? 'rgba(120,160,205,0.75)' : 'rgba(225,236,240,0.8)';
    g.lineWidth = 1 + rnd() * 1.1;
    g.stroke(polyPath(slicePts(M, t0, t1)));
  }
  g.restore();
  g.strokeStyle = KEY;
  g.lineWidth = 1.6;
  g.stroke(body);
  // köpük şeridi: dış kenarda, tepeye doğru kalınlaşan krem bant, kabarcıklı kenar
  const n = O.length / 2;
  const i0 = Math.floor(sp.foamFrom * (n - 1));
  const fo = O.slice(i0 * 2);
  const fi = lerpPts(O, I, 0.2).slice(i0 * 2);
  const fm = fi.map((v, i) => {
    const t = Math.floor(i / 2) / (fi.length / 2 - 1);
    return fo[i] + (v - fo[i]) * Math.min(1, t * 1.6);
  });
  const foam = polyPath([...fo, ...reversePts(fm)], true);
  keyFill(g, foam, FOAM, 1.2);
  // köpüğün iç kenarında mavi parmak izleri
  for (let i = 4; i < fm.length / 2 - 2; i += 2 + Math.floor(rnd() * 3)) {
    const x = fm[i * 2], y = fm[i * 2 + 1];
    g.fillStyle = FOAM;
    g.beginPath();
    g.arc(x, y, 1.2 + rnd() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  // köpük içinde mavi "parmak izi" çizgileri
  g.save();
  g.clip(foam);
  g.strokeStyle = 'rgba(31,79,132,0.55)';
  g.lineWidth = 0.9;
  for (let i = 2; i < fo.length / 2 - 2; i += 3) {
    const t = i / (fo.length / 2);
    g.beginPath();
    g.moveTo(fo[i * 2], fo[i * 2 + 1]);
    g.lineTo(fm[i * 2] * 0.5 + fo[i * 2] * 0.5 + (rnd() - 0.5) * 3, fm[i * 2 + 1] * 0.5 + fo[i * 2 + 1] * 0.5);
    g.stroke();
    void t;
  }
  g.restore();
  // pençeler: köpüğün dış kenarından, dalganın gidiş yönünde ileri-dışa uzanıp içe kıvrılan, üst üste binen parmaklar
  const clawAt = (t: number, scale: number, row: number): void => {
    const i = Math.min(n - 2, Math.floor(t * (n - 1)));
    const x = O[i * 2], y = O[i * 2 + 1];
    const ta = Math.atan2(O[i * 2 + 3] - y, O[i * 2 + 2] - x);
    const u = Math.min(1, (t - sp.clawFrom) / (1 - sp.clawFrom));
    const grow = (0.4 + 0.8 * Math.pow(u, 0.9)) * scale;
    const back = row ? 0.18 : 0; // ikinci sıra biraz içeriden başlar
    const ox = x + Math.cos(ta + Math.PI / 2) * sp.clawLen * back, oy = y + Math.sin(ta + Math.PI / 2) * sp.clawLen * back;
    claw(g, ox, oy, ta - 1.1 + (rnd() - 0.5) * 0.4, sp.clawLen * grow * (0.8 + rnd() * 0.4), sp.clawLen * 0.3 * grow, 1.7 + rnd() * 0.5, 2, rnd);
  };
  for (let k = 0; k < sp.clawN; k++) clawAt(sp.clawFrom + ((1 - sp.clawFrom) * (k + 0.2 + rnd() * 0.6)) / sp.clawN, 0.75, 1);
  for (let k = 0; k < sp.clawN; k++) clawAt(sp.clawFrom + ((1 - sp.clawFrom) * (k + 0.5 + (rnd() - 0.5) * 0.4)) / sp.clawN, 1, 0);
  // dudak ucunda büyük sarkık pençeler
  const lx = O[(n - 1) * 2], ly = O[(n - 1) * 2 + 1];
  const la = Math.atan2(ly - O[(n - 3) * 2 + 1], lx - O[(n - 3) * 2]);
  for (let k = 0; k < 3; k++) claw(g, lx, ly, la - 0.5 + k * 0.4, sp.clawLen * (1.15 - k * 0.2), sp.clawLen * 0.3, 1.8, 2, rnd);
}

/** Köpük serpintisi: kar tanesi gibi krem noktalar. */
function spray(g: Ctx, rnd: Rnd, n: number, x: number, y: number, w: number, h: number, r: number): void {
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = FOAM;
    g.beginPath();
    g.arc(px, py, r * (0.5 + rnd() * 0.8), 0, Math.PI * 2);
    g.fill();
  }
}

/** Fuji: içbükey yamaçlar, düz krater, tırtıklı kar örtüsü ve aşağı inen kar dilleri. */
function fuji(g: Ctx, cx: number, by: number, hw: number, h: number, body: string, snowTo = 0.45): void {
  const top = by - h, cw = hw * 0.16;
  const p = new Path2D();
  p.moveTo(cx - hw, by);
  p.bezierCurveTo(cx - hw * 0.55, by - h * 0.18, cx - cw * 1.6, top + h * 0.3, cx - cw, top);
  p.quadraticCurveTo(cx - cw * 0.4, top - h * 0.03, cx, top + h * 0.01);
  p.quadraticCurveTo(cx + cw * 0.4, top - h * 0.03, cx + cw, top);
  p.bezierCurveTo(cx + cw * 1.6, top + h * 0.3, cx + hw * 0.55, by - h * 0.18, cx + hw, by);
  p.closePath();
  const gr = g.createLinearGradient(0, top, 0, by);
  gr.addColorStop(0, body);
  gr.addColorStop(1, PRU_P);
  keyFill(g, p, gr, 1.2);
  // kar örtüsü: tepeden aşağı dilli kenar
  g.save();
  g.clip(p);
  const s = new Path2D();
  s.moveTo(cx - hw, top - 5);
  s.lineTo(cx + hw, top - 5);
  const yb = top + h * snowTo;
  const teeth = 9;
  for (let i = teeth; i >= 0; i--) {
    const x = cx - hw + (2 * hw * i) / teeth;
    const deep = i % 2 ? h * (0.14 + 0.08 * Math.sin(i * 1.7)) : 0;
    s.lineTo(x, yb - h * 0.12 + deep);
  }
  s.closePath();
  g.fillStyle = FOAM;
  g.fill(s);
  g.strokeStyle = KEY;
  g.lineWidth = 0.9;
  g.stroke(s);
  // yamaç çizgileri
  g.strokeStyle = 'rgba(20,35,57,0.35)';
  g.lineWidth = 0.8;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(cx + i * cw * 0.35, top + 2);
    g.quadraticCurveTo(cx + i * hw * 0.2, top + h * 0.5, cx + i * hw * 0.32, by);
    g.stroke();
  }
  g.restore();
}

/** Bokashi gök: üstte koyulaşan gri-mavi, ufka doğru açılan krem. */
function sky(g: Ctx, x: number, y: number, w: number, h: number, topCol: string, midCol: string, lowCol: string): void {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, topCol);
  gr.addColorStop(0.3, midCol);
  gr.addColorStop(1, lowCol);
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
}

/** Uzun kürekli tekne (oshiokuri-bune): hilal gövde, iki sıra eğilmiş kürekçi. */
function boat(g: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, rows: number): void {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const q = (t: number, a: number, b: number, c: number): number => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  // kürekçiler (gövdenin arkasında kalan kısmı)
  for (let i = 0; i < rows; i++) {
    const t = 0.16 + (i / (rows - 1)) * 0.66;
    const bx = q(t, x0, mx, x1), byy = q(t, y0, my, y1);
    g.fillStyle = '#2b3d55';
    g.beginPath();
    g.ellipse(bx - 1, byy - len * 0.018, len * 0.012, len * 0.02, -0.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b2638';
    g.beginPath();
    g.arc(bx - len * 0.012, byy - len * 0.038, len * 0.009, 0, Math.PI * 2);
    g.fill();
  }
  const hull = new Path2D();
  hull.moveTo(x0, y0 - len * 0.01);
  hull.quadraticCurveTo(mx, my, x1, y1 - len * 0.02);
  hull.quadraticCurveTo(mx + len * 0.05, my + len * 0.05, x0 + len * 0.06, y0 + len * 0.012);
  hull.closePath();
  keyFill(g, hull, '#e6cf92', 1.1);
  g.strokeStyle = 'rgba(20,35,57,0.5)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x0 + len * 0.04, y0 + len * 0.002);
  g.quadraticCurveTo(mx, my + len * 0.022, x1 - len * 0.04, y1 - len * 0.012);
  g.stroke();
}

// ───────────────────────── seigaiha (dalga pulu) deseni ─────────────────────────
function seigaiha(g: Ctx, x0: number, y0: number, w: number, h: number, r: number, base: string, line: string, alt?: string): void {
  const dy = r * 0.5;
  for (let j = 0, y = y0 - r; y < y0 + h + r; j++, y += dy) {
    const off = j % 2 ? r : 0;
    for (let x = x0 - 2 * r + off; x < x0 + w + 2 * r; x += 2 * r) {
      g.fillStyle = alt && (j + Math.round(x / (2 * r))) % 5 === 0 ? alt : base;
      g.beginPath();
      g.arc(x, y, r, Math.PI, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = line;
      g.lineWidth = r * 0.1;
      for (let k = 1; k <= 3; k++) {
        g.beginPath();
        g.arc(x, y, r * (1 - k * 0.22), Math.PI, 0);
        g.stroke();
      }
      g.strokeStyle = KEY;
      g.lineWidth = r * 0.07;
      g.beginPath();
      g.arc(x, y, r, Math.PI, 0);
      g.stroke();
    }
  }
}

/** Zincifre mühür (hanko): kare kırmızı alan, içinde beyaz dalga + Fuji imi. */
function seal(g: Ctx, x: number, y: number, s: number, rot = 0): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const p = new Path2D();
  roundRect(p, -s / 2, -s / 2, s, s, s * 0.1);
  g.fillStyle = VER;
  g.fill(p);
  g.strokeStyle = 'rgba(250,240,225,0.95)';
  g.lineWidth = s * 0.07;
  const q = new Path2D();
  roundRect(q, -s * 0.36, -s * 0.36, s * 0.72, s * 0.72, s * 0.05);
  g.stroke(q);
  // Fuji + dalga imi
  g.beginPath();
  g.moveTo(-s * 0.26, s * 0.02);
  g.lineTo(-s * 0.06, -s * 0.22);
  g.lineTo(s * 0.06, -s * 0.22);
  g.lineTo(s * 0.26, s * 0.02);
  g.moveTo(-s * 0.26, s * 0.2);
  g.quadraticCurveTo(-s * 0.13, s * 0.06, 0, s * 0.18);
  g.quadraticCurveTo(s * 0.13, s * 0.06, s * 0.26, s * 0.2);
  g.stroke();
  g.restore();
}

// ───────────────────────── arka yüz: Büyük Dalga ─────────────────────────
function paintBack(): HTMLCanvasElement {
  const W = PW, H = PH;
  const [c, g] = makeCanvas(W, H);
  const rnd = mulberry(1831);
  const m = W * 0.065; // baskı kenarı
  g.drawImage(paintPaper(W, H, 5), 0, 0);
  g.save();
  g.beginPath();
  g.rect(m, m, W - 2 * m, H - 2 * m);
  g.clip();
  // gök: üstte gri-mavi bokashi, aşağıda krem
  sky(g, m, m, W - 2 * m, H - 2 * m, '#7d8b98', '#d9cfae', '#efe4c4');
  // yumuşak bulut: krem bant
  for (let i = 0; i < 3; i++) {
    const cy = H * (0.08 + i * 0.06), cx = W * (0.55 + i * 0.12);
    const gr = g.createRadialGradient(cx, cy, 4, cx, cy, W * 0.3);
    gr.addColorStop(0, 'rgba(245,238,215,0.5)');
    gr.addColorStop(1, 'rgba(245,238,215,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  // uzakta Fuji
  fuji(g, W * 0.6, H * 0.74, W * 0.17, H * 0.1, '#3e5f86', 0.42);
  // çukurdaki deniz
  const sea = new Path2D();
  sea.moveTo(0, H * 0.73);
  for (let x = 0; x <= W; x += 6) sea.lineTo(x, H * 0.73 + Math.sin(x * 0.05) * 3 - (x / W) * H * 0.02);
  sea.lineTo(W, H);
  sea.lineTo(0, H);
  sea.closePath();
  keyFill(g, sea, PRU, 1.2);
  g.save();
  g.clip(sea);
  g.strokeStyle = 'rgba(170,200,225,0.7)';
  g.lineWidth = 1.2;
  for (let y = H * 0.75; y < H; y += 7) {
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const yy = y + Math.sin(x * 0.04 + y) * 2.5;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  g.restore();
  // tekne: iki dalganın arasındaki çukurda
  boat(g, W * 0.4, H * 0.805, W * 0.96, H * 0.775, H * 0.03, 7);
  // ön planda Fuji'yi yankılayan küçük dalga
  paintWave(g, {
    outer: [W * 0.3, H * 0.98, W * 0.4, H * 0.86, W * 0.5, H * 0.79, W * 0.6, H * 0.8, W * 0.68, H * 0.86],
    inner: [W * 0.66, H * 1.02, W * 0.62, H * 0.96, W * 0.6, H * 0.9, W * 0.64, H * 0.87, W * 0.68, H * 0.86],
    foamFrom: 0.35,
    clawFrom: 0.5,
    clawN: 6,
    clawLen: W * 0.05,
    seed: 7,
    stripes: 8,
  });
  // büyük dalga: soldan yükselip sağa kıvrılır
  paintWave(g, {
    outer: [-W * 0.12, H * 1.02, -W * 0.02, H * 0.64, W * 0.09, H * 0.43, W * 0.24, H * 0.27, W * 0.41, H * 0.17, W * 0.58, H * 0.135, W * 0.73, H * 0.165, W * 0.85, H * 0.245, W * 0.9, H * 0.35, W * 0.86, H * 0.44, W * 0.76, H * 0.47],
    inner: [W * 0.26, H * 1.02, W * 0.22, H * 0.82, W * 0.23, H * 0.64, W * 0.29, H * 0.5, W * 0.39, H * 0.39, W * 0.51, H * 0.32, W * 0.62, H * 0.315, W * 0.7, H * 0.35, W * 0.74, H * 0.41, W * 0.755, H * 0.455, W * 0.76, H * 0.47],
    foamFrom: 0.4,
    clawFrom: 0.5,
    clawN: 16,
    clawLen: W * 0.115,
    seed: 11,
  });
  spray(g, rnd, 60, W * 0.45, H * 0.08, W * 0.5, H * 0.38, 2);
  woodGrain(g, W, H, rnd, 0.06);
  g.restore();
  // baskı çerçevesi: ince kontur + başlık kartuşu + mühür
  g.strokeStyle = KEY;
  g.lineWidth = 1.6;
  g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  const cxr = m + W * 0.04, cyr = m + W * 0.035, cw = W * 0.11, ch = H * 0.16;
  g.fillStyle = '#efe3c4';
  g.fillRect(cxr, cyr, cw, ch);
  g.strokeStyle = KEY;
  g.lineWidth = 1.2;
  g.strokeRect(cxr, cyr, cw, ch);
  g.strokeRect(cxr + 3, cyr + 3, cw - 6, ch - 6);
  // kartuşta okunamayan fırça izleri (iki sütun)
  g.strokeStyle = 'rgba(20,35,57,0.75)';
  g.lineWidth = 1.6;
  for (const col of [0.32, 0.68]) {
    let y = cyr + 10;
    while (y < cyr + ch - 14) {
      const l = 3 + rnd() * 7;
      g.beginPath();
      g.moveTo(cxr + cw * col - 3 + rnd() * 2, y);
      g.quadraticCurveTo(cxr + cw * col + (rnd() - 0.5) * 6, y + l / 2, cxr + cw * col + 2 - rnd() * 3, y + l);
      g.stroke();
      y += l + 3 + rnd() * 3;
    }
  }
  seal(g, cxr + cw + W * 0.05, cyr + W * 0.035, W * 0.055);
  return c;
}

// ───────────────────────── ön yüz çerçevesi ve paneli ─────────────────────────
const F = 0.085;
function paintFrame(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  g.fillStyle = PRU;
  g.fillRect(0, 0, PW, PH);
  seigaiha(g, 0, 0, PW, PH, PW * 0.034, PRU, 'rgba(210,226,236,0.85)', PRU_D);
  woodGrain(g, PW, PH, mulberry(3), 0.08);
  const rnd = mulberry(8);
  paperGrain(g, PW, PH, rnd, 0.6);
  return c;
}

function paintPanel(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  g.drawImage(paintPaper(PW, PH, 21, '#f6eed9', '#efe4c8'), 0, 0);
  // üstte ve altta soluk mavi bokashi (baskı göğü gibi)
  for (const [y0, y1] of [
    [0, PH * 0.3],
    [PH, PH * 0.7],
  ]) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, 'rgba(94,143,189,0.2)');
    gr.addColorStop(1, 'rgba(94,143,189,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, PW, PH);
  }
  // çok soluk dalga çizgileri (filigran)
  g.strokeStyle = 'rgba(31,79,132,0.1)';
  g.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) {
    const y = PH * (0.3 + i * 0.05);
    g.beginPath();
    for (let x = 0; x <= PW; x += 5) {
      const yy = y + Math.sin(x * 0.03 + i * 1.3) * 6 + Math.sin(x * 0.011 + i) * 8;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  // boş köşelerde zincifre mühür
  const f = F * PW;
  seal(g, PW - f - PW * 0.07, f + PW * 0.07, PW * 0.075, 0.04);
  seal(g, f + PW * 0.07, PH - f - PW * 0.07, PW * 0.075, Math.PI + 0.04);
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
/** Sinek: tek dış kontur (kontur/iç çizgi efektleri ara kesişim göstermesin). */
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

/** Büyük takım işareti: ağaç baskı — düz renk + üstten bokashi, içte ince dalga pulları, koyu kontur. */
const SPR = 240;
function paintSuit(path: Path2D, red: boolean, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(SPR, SPR);
  const rnd = mulberry(seed);
  const k = SPR * 0.84, C = SPR / 2;
  g.setTransform(k, 0, 0, k, C, C);
  const gr = g.createLinearGradient(0, -0.6, 0, 0.6);
  if (red) {
    gr.addColorStop(0, '#a82a17');
    gr.addColorStop(0.45, VER);
    gr.addColorStop(1, '#de5a36');
  } else {
    gr.addColorStop(0, PRU_DD);
    gr.addColorStop(0.5, PRU_D);
    gr.addColorStop(1, '#25578c');
  }
  g.fillStyle = gr;
  g.fill(path);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // içte seigaiha (düşük kontrast) — alt yarıda, değerin altında kalır
  g.globalAlpha = red ? 0.22 : 0.3;
  seigaiha(g, 0, C + SPR * 0.12, SPR, SPR, SPR * 0.06, red ? '#e0603c' : '#2a5c94', red ? 'rgba(255,230,200,0.9)' : 'rgba(170,200,225,0.9)');
  g.globalAlpha = 1;
  g.restore();
  g.save();
  g.setTransform(k, 0, 0, k, C, C);
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  paperGrain(g, SPR, SPR, rnd, 2.2);
  woodGrain(g, SPR, SPR, rnd, 0.08);
  g.restore();
  g.setTransform(k, 0, 0, k, C, C);
  g.lineWidth = 3 / k;
  g.strokeStyle = KEY;
  g.stroke(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// ───────────────────────── As: dalga armas ı (nami-tomoe) ─────────────────────────
const ACE_S = 360;
function paintAce(): HTMLCanvasElement {
  const S = ACE_S, C = S / 2, R = S * 0.47;
  const [c, g] = makeCanvas(S, S);
  const rnd = mulberry(41);
  // dış halka: Prusya mavisi disk
  const disk = new Path2D();
  disk.arc(C, C, R, 0, Math.PI * 2);
  keyFill(g, disk, PRU_D, 2);
  g.save();
  g.clip(disk);
  seigaiha(g, 0, 0, S, S, S * 0.05, PRU_D, 'rgba(140,175,210,0.55)', PRU);
  g.restore();
  // daire boyunca kıvrılan dalga (iç kenarda krem köpük, dışa pençeler)
  const outer: number[] = [], inner: number[] = [];
  const a0 = Math.PI * 0.75, span = Math.PI * 1.55;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = a0 + span * t;
    const ro = R * (0.66 + 0.24 * Math.sin(Math.PI * t * 0.9));
    const ri = R * 0.5;
    outer.push(C + Math.cos(a) * ro, C + Math.sin(a) * ro);
    inner.push(C + Math.cos(a + 0.05) * ri, C + Math.sin(a + 0.05) * ri);
  }
  paintWave(g, {outer, inner, foamFrom: 0.3, clawFrom: 0.42, clawN: 9, clawLen: R * 0.2, seed: 5, stripes: 8});
  spray(g, rnd, 26, C - R * 0.9, C - R * 0.9, R * 1.8, R * 1.8, 1.8);
  // göbek: krem kâğıt disk (takım işareti buraya)
  const cd = new Path2D();
  cd.arc(C, C, R * 0.5, 0, Math.PI * 2);
  g.save();
  g.clip(cd);
  g.drawImage(paintPaper(S, S, 9, '#f8f0dc', '#ece0c2'), 0, 0);
  g.restore();
  g.strokeStyle = KEY;
  g.lineWidth = 2;
  g.stroke(cd);
  g.strokeStyle = VER;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(C, C, R * 0.46, 0, Math.PI * 2);
  g.stroke();
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
// Papaz = doğan kırmızı güneşle Fuji, Kız = turna, Vale = büyük dalganın pençesi (Pişti'nin gücü, altın çerçeve).
const CW = 240, CH = 350, RW = 13; // tuval + çerçeve kalınlığı
/** Kapsül (iki ucu yarım daire) — asma rulo (kakemono) oranında. */
function capsule(cx: number, cy: number, hw: number, hh: number): Path2D {
  const p = new Path2D();
  p.moveTo(cx - hw, cy - hh + hw);
  p.arc(cx, cy - hh + hw, hw, Math.PI, 0);
  p.lineTo(cx + hw, cy + hh - hw);
  p.arc(cx, cy + hh - hw, hw, 0, Math.PI);
  p.closePath();
  return p;
}

function paintFuji(g: Ctx, rnd: Rnd): void {
  sky(g, 0, 0, CW, CH, '#4f6f93', '#d9c9a2', '#f0e3c0');
  // doğan güneş
  const sun = new Path2D();
  sun.arc(CW * 0.5, CH * 0.36, 58, 0, Math.PI * 2);
  const sg = g.createRadialGradient(CW * 0.5, CH * 0.34, 10, CW * 0.5, CH * 0.36, 58);
  sg.addColorStop(0, '#e8573a');
  sg.addColorStop(1, '#c2341f');
  keyFill(g, sun, sg, 1.4);
  // bulut bantları (krem, konturlu)
  const cloud = (x: number, y: number, w: number): void => {
    const p = new Path2D();
    p.moveTo(x - w / 2, y);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x0 = x - w / 2 + (w * i) / n, x1 = x0 + w / n;
      p.bezierCurveTo(x0, y - 10, x1, y - 10, x1, y);
    }
    p.bezierCurveTo(x + w / 2 + 6, y + 6, x - w / 2 - 6, y + 6, x - w / 2, y);
    p.closePath();
    keyFill(g, p, '#f3ead2', 1);
  };
  // Fuji
  fuji(g, CW * 0.5, CH * 0.8, CW * 0.62, CH * 0.36, '#2c4f7c', 0.38);
  cloud(CW * 0.3, CH * 0.28, 74);
  cloud(CW * 0.76, CH * 0.5, 64);
  cloud(CW * 0.22, CH * 0.62, 56);
  // eteklerde dalgalar
  const sea = new Path2D();
  sea.moveTo(0, CH * 0.78);
  for (let x = 0; x <= CW; x += 4) sea.lineTo(x, CH * 0.78 + Math.sin(x * 0.09) * 3);
  sea.lineTo(CW, CH);
  sea.lineTo(0, CH);
  sea.closePath();
  keyFill(g, sea, PRU, 1.2);
  g.save();
  g.clip(sea);
  seigaiha(g, 0, CH * 0.8, CW, CH * 0.3, 11, PRU, 'rgba(200,220,235,0.85)', PRU_D);
  g.restore();
  g.strokeStyle = KEY;
  g.lineWidth = 1.2;
  g.stroke(sea);
  spray(g, rnd, 12, 0, CH * 0.74, CW, 20, 1.6);
  // kuşlar
  g.strokeStyle = KEY;
  g.lineWidth = 1.2;
  for (const [x, y, s] of [
    [60, 88, 7],
    [76, 80, 5],
    [178, 112, 6],
  ]) {
    g.beginPath();
    g.moveTo(x - s, y);
    g.quadraticCurveTo(x - s / 2, y - s * 0.6, x, y);
    g.quadraticCurveTo(x + s / 2, y - s * 0.6, x + s, y);
    g.stroke();
  }
}

/** Turna (tanchō): uçarken, kanatlar yukarıda; beyaz gövde, siyah boyun ve uç tüyleri, kırmızı tepe. */
function paintCrane(g: Ctx, rnd: Rnd): void {
  sky(g, 0, 0, CW, CH, '#9fb3c4', '#e7dcbc', '#f1e6c8');
  // dolunay
  const moon = new Path2D();
  moon.arc(CW * 0.6, CH * 0.36, 70, 0, Math.PI * 2);
  g.fillStyle = 'rgba(250,244,226,0.95)';
  g.fill(moon);
  g.strokeStyle = 'rgba(20,35,57,0.4)';
  g.lineWidth = 1;
  g.stroke(moon);
  // çam dalı (alt sol)
  g.strokeStyle = KEY;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(-10, CH * 0.86);
  g.quadraticCurveTo(CW * 0.3, CH * 0.8, CW * 0.55, CH * 0.88);
  g.stroke();
  g.strokeStyle = '#4b3a2a';
  g.lineWidth = 4;
  g.stroke();
  for (const [x, y] of [
    [CW * 0.12, CH * 0.82],
    [CW * 0.32, CH * 0.8],
    [CW * 0.5, CH * 0.85],
  ]) {
    for (let k = 0; k < 14; k++) {
      const a = -Math.PI * 0.95 + (k / 13) * Math.PI * 0.9;
      g.strokeStyle = k % 2 ? '#2f5a3c' : '#24482f';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18);
      g.stroke();
    }
  }
  // turna — gövde merkezi
  const bx = CW * 0.5, by = CH * 0.56;
  // kanatlar: iki büyük, yukarı kalkık, uçları siyah tüylü
  const wing = (side: number, lift: number): void => {
    const root = [bx + side * 6, by - 8];
    const tip = [bx + side * 96, by - 150 - lift];
    const p = new Path2D();
    p.moveTo(root[0], root[1]);
    p.bezierCurveTo(bx + side * 30, by - 70, bx + side * 60, by - 128 - lift, tip[0], tip[1]);
    // arka kenar: tüy dilimleri
    const n = 8;
    const trail: number[] = [tip[0], tip[1]];
    let px = tip[0], py = tip[1];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const ex = tip[0] + (bx + side * 18 - tip[0]) * t + side * 10 * Math.sin(Math.PI * t);
      const ey = tip[1] + (by + 4 - tip[1]) * t + 28 * Math.sin(Math.PI * t);
      p.quadraticCurveTo((px + ex) / 2 + side * 9, (py + ey) / 2 + 9, ex, ey);
      trail.push(ex, ey);
      px = ex;
      py = ey;
    }
    p.closePath();
    keyFill(g, p, '#fbf7ec', 1.3);
    g.save();
    g.clip(p);
    // arka kenarda siyah ikincil tüyler (tanchō'nun imzası), uca doğru incelir
    g.strokeStyle = '#1c2330';
    g.lineJoin = 'round';
    for (let i = 0; i < trail.length / 2 - 1; i++) {
      const t = i / (trail.length / 2 - 1);
      g.lineWidth = 16 + 30 * t;
      g.beginPath();
      g.moveTo(trail[i * 2], trail[i * 2 + 1]);
      g.lineTo(trail[i * 2 + 2], trail[i * 2 + 3]);
      g.stroke();
    }
    // tüy çizgileri (kökten arka kenara)
    g.strokeStyle = 'rgba(20,35,57,0.45)';
    g.lineWidth = 0.9;
    for (let i = 0; i < trail.length / 2; i++) {
      const t = i / (trail.length / 2);
      g.beginPath();
      g.moveTo(root[0] + (tip[0] - root[0]) * (0.25 + t * 0.5), root[1] + (tip[1] - root[1]) * (0.25 + t * 0.5) * (1 - t * 0.6));
      g.lineTo(trail[i * 2], trail[i * 2 + 1]);
      g.stroke();
    }
    // örtü tüyleri: kök yakınında birkaç pul
    g.strokeStyle = 'rgba(20,35,57,0.35)';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(bx + side * (16 + i * 9), by - 30 - i * 16, 7, side > 0 ? 0.2 : Math.PI - 1.2, side > 0 ? 1.2 : Math.PI - 0.2);
      g.stroke();
    }
    g.restore();
  };
  wing(-1, 0);
  wing(1, 18);
  // gövde
  const body = new Path2D();
  body.ellipse(bx, by, 30, 16, -0.35, 0, Math.PI * 2);
  keyFill(g, body, '#fbf7ec', 1.3);
  // kuyruk (siyah ikincil tüyler, aşağı sarkar)
  const tail = new Path2D();
  tail.moveTo(bx + 18, by + 4);
  tail.quadraticCurveTo(bx + 40, by + 14, bx + 46, by + 30);
  tail.quadraticCurveTo(bx + 30, by + 26, bx + 14, by + 14);
  tail.closePath();
  keyFill(g, tail, '#1c2330', 1);
  // bacaklar
  g.strokeStyle = '#2b2f36';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(bx + 20, by + 8);
  g.lineTo(bx + 76, by + 40);
  g.moveTo(bx + 18, by + 12);
  g.lineTo(bx + 72, by + 48);
  g.stroke();
  // boyun (siyah) ve baş
  const neck = spline([bx - 22, by - 6, bx - 46, by - 4, bx - 66, by + 4, bx - 84, by + 6], 10);
  const np = ribbon(neck, t => [4.6 - t * 1.4, 4.6 - t * 1.4]);
  keyFill(g, np, '#1c2330', 1);
  // yanak beyazı
  g.fillStyle = '#fbf7ec';
  g.beginPath();
  g.ellipse(bx - 52, by - 1, 6, 2.4, 0.1, 0, Math.PI * 2);
  g.fill();
  const head = new Path2D();
  head.ellipse(bx - 88, by + 6, 6.5, 5, 0.2, 0, Math.PI * 2);
  keyFill(g, head, '#1c2330', 1);
  g.fillStyle = '#d23a22';
  g.beginPath();
  g.arc(bx - 89, by + 2, 3, 0, Math.PI * 2);
  g.fill();
  // gaga
  g.fillStyle = '#7a7460';
  g.beginPath();
  g.moveTo(bx - 93, by + 5);
  g.lineTo(bx - 112, by + 12);
  g.lineTo(bx - 93, by + 9);
  g.closePath();
  g.fill();
  g.strokeStyle = KEY;
  g.lineWidth = 0.8;
  g.stroke();
  void rnd;
}

/** Vale: büyük dalganın kıvrılan dudağı ve pençeleri; arkada küçük Fuji. */
function paintClaw(g: Ctx, rnd: Rnd): void {
  sky(g, 0, 0, CW, CH, '#7d8b98', '#d9cfae', '#efe4c4');
  fuji(g, CW * 0.62, CH * 0.86, CW * 0.2, CH * 0.08, '#3e5f86', 0.42);
  paintWave(g, {
    outer: [-CW * 0.25, CH * 1.05, -CW * 0.1, CH * 0.6, CW * 0.06, CH * 0.36, CW * 0.26, CH * 0.2, CW * 0.48, CH * 0.13, CW * 0.68, CH * 0.15, CW * 0.84, CH * 0.24, CW * 0.9, CH * 0.37, CW * 0.84, CH * 0.47, CW * 0.72, CH * 0.5],
    inner: [CW * 0.22, CH * 1.05, CW * 0.17, CH * 0.82, CW * 0.2, CH * 0.62, CW * 0.29, CH * 0.47, CW * 0.42, CH * 0.37, CW * 0.55, CH * 0.33, CW * 0.65, CH * 0.36, CW * 0.7, CH * 0.42, CW * 0.715, CH * 0.47, CW * 0.72, CH * 0.5],
    foamFrom: 0.36,
    clawFrom: 0.46,
    clawN: 14,
    clawLen: CW * 0.15,
    seed: 23,
  });
  spray(g, rnd, 40, CW * 0.3, CH * 0.02, CW * 0.7, CH * 0.6, 1.8);
  const sea = new Path2D();
  sea.moveTo(0, CH * 0.88);
  for (let x = 0; x <= CW; x += 4) sea.lineTo(x, CH * 0.88 + Math.sin(x * 0.07) * 3);
  sea.lineTo(CW, CH);
  sea.lineTo(0, CH);
  sea.closePath();
  keyFill(g, sea, PRU, 1.2);
}

function goldGrad(g: Ctx, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff2bf');
  gr.addColorStop(0.3, '#f0c64c');
  gr.addColorStop(0.62, '#c48a20');
  gr.addColorStop(1, '#8a5a12');
  return gr;
}

function paintCourt(kind: 'K' | 'Q' | 'J'): HTMLCanvasElement {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(kind === 'K' ? 13 : kind === 'Q' ? 12 : 11);
  const cx = CW / 2, cy = CH / 2, hw = CW / 2 - 4, hh = CH / 2 - 4;
  const outer = capsule(cx, cy, hw, hh);
  const inner = capsule(cx, cy, hw - RW, hh - RW);
  const gold = kind === 'J';
  // çerçeve: Prusya mavisi (Vale'de altın) şerit, içinde ince krem fileto
  g.fillStyle = gold ? goldGrad(g, 0, CH) : PRU_D;
  g.fill(outer);
  if (!gold) {
    g.save();
    g.clip(outer);
    seigaiha(g, 0, 0, CW, CH, 7, PRU_D, 'rgba(160,190,215,0.6)', PRU);
    g.restore();
  } else {
    g.save();
    g.clip(outer);
    g.strokeStyle = 'rgba(120,70,10,0.35)';
    g.lineWidth = 1;
    for (let y = -CW; y < CH; y += 5) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(CW, y + CW);
      g.stroke();
    }
    g.restore();
  }
  g.strokeStyle = KEY;
  g.lineWidth = 2;
  g.stroke(outer);
  const [mc, mg] = makeCanvas(CW, CH);
  if (kind === 'K') paintFuji(mg, rnd);
  else if (kind === 'Q') paintCrane(mg, rnd);
  else paintClaw(mg, rnd);
  paperGrain(mg, CW, CH, rnd, 1.2);
  woodGrain(mg, CW, CH, rnd, 0.05);
  g.save();
  g.clip(inner);
  g.drawImage(mc, 0, 0);
  g.restore();
  g.strokeStyle = gold ? '#7a1a10' : FOAM;
  g.lineWidth = 2.4;
  g.stroke(inner);
  g.strokeStyle = KEY;
  g.lineWidth = 1;
  g.stroke(inner);
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
  SH = {heart: heartPath(), spade: spadePath(), diamond: diamondPath(), club: clubPath()};
  backArt = paintBack();
  frameArt = paintFrame();
  panelArt = paintPanel();
  aceArt = paintAce();
  (['S', 'H', 'D', 'C'] as Suit[]).forEach((s, i) => (suitArt[s] = paintSuit(suitPath(s), isRed(s), 300 + i)));
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
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.03 * w);
  roundRect(p, BX * w, BX * w, BW * w, BH * w, 0.05 * w);
  roundRect(p, w - (BX + BW) * w, h - (BX + BH) * w, BW * w, BH * w, 0.05 * w);
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
  g.lineWidth = 0.04 * w;
  g.strokeStyle = KEY;
  g.stroke(panel);
  g.lineWidth = 0.024 * w;
  g.strokeStyle = FOAM;
  g.stroke(panel);
  g.lineWidth = 0.01 * w;
  g.strokeStyle = KEY;
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(panelArt!, 0, 0, w, h);
  g.restore();

  const cx = w / 2, cy = h / 2;
  if (rank === 1) {
    const d = 0.76 * w;
    g.drawImage(aceArt!, cx - d / 2, cy - d / 2, d, d);
    const sz = 0.27 * w, sd = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - sd / 2, cy - sd / 2, sd, sd);
  } else if (rank >= 11) {
    const art = courtArt[rank];
    const dw = 0.49 * w, dh = (dw * CH) / CW;
    g.drawImage(art, cx - dw / 2, cy - dh / 2, dw, dh);
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 - 0.01 * w);
      g.beginPath();
      g.arc(cx, ey, 0.058 * w, 0, Math.PI * 2);
      g.fillStyle = FOAM;
      g.fill();
      g.lineWidth = 0.012 * w;
      g.strokeStyle = rank === 11 ? '#c9952c' : KEY;
      g.stroke();
      drawPip(g, suit, cx, ey + 0.003 * w, 0.066 * w, isRed(suit) ? RED : INK);
    }
  } else {
    const sz = 0.46 * w, d = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - d / 2, cy - d / 2, d, d);
    const capH = 0.15 * w;
    drawRank(g, LABEL(rank), cx, cy + SUIT_TY[suit] * sz - capH / 2, capH, (suit === 'D' ? 0.2 : 0.24) * w, '#fbf5e4');
  }
  corners(g, w, h, suit, rank);
  g.restore();
  g.save();
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(10,22,40,0.8)';
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
  // Prusya mavisi dış bant + krem fileto
  const bw = 0.035 * w;
  g.lineWidth = bw * 2;
  g.strokeStyle = PRU_D;
  g.stroke(card);
  const inner = new Path2D();
  roundRect(inner, bw * 1.3, bw * 1.3, w - 2.6 * bw, h - 2.6 * bw, 0.08 * w - bw);
  g.lineWidth = Math.max(0.6, 0.008 * w);
  g.strokeStyle = 'rgba(245,239,220,0.85)';
  g.stroke(inner);
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(10,22,40,0.85)';
  const edge = new Path2D();
  roundRect(edge, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, 0.08 * w - g.lineWidth / 2);
  g.stroke(edge);
  g.restore();
}

export const skin: Skin = {
  id: 'dalga',
  name: 'Büyük Dalga',
  desc: "Hokusai'nin köpüklü dalgası, gravür çizgileriyle.",
  prepare(): Promise<void> {
    if (!ready) ready = doPrepare();
    return ready;
  },
  drawFace,
  drawBack,
};
