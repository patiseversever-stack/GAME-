// Yağlı boya işleyici (masalar + desteler). Kullanıcının sevdiği "Yıldızlı Gece" diliyle aynı aile:
//   1) Referans sahne: küçük bir tuvale yumuşak vektör çizilir (gök degradesi, siluetler, ışıklar) — "eskiz".
//   2) Akış alanı: tasarlanmış yön (gökte girdap/yatay, suda yatay dalga, kayada dikey) + referansın kenarlarına
//      teğet yön (darbeler biçimlerin çevresini dolaşır, ressam gibi).
//   3) Katmanlar: astar (iri, geniş darbe) → gövde (orta) → ayrıntı (ince, yalnız ilgi bölgelerinde) → ışık (kalın,
//      açık impasto). Her darbe rengini referanstan alır (+ renk titremesi, ara sıra "kırık renk" vurgusu).
//   4) Darbe: uçları sivrilen gövde + ışık sırtı (sol üst) + gölge oluğu (sağ alt) + kıl izleri (iri darbelerde);
//      aynı renkteki binlerce darbe tek yola toplanıp tek dolguyla çizilir (hızlı). Sonda tuval dokusu.
//   5) Sakin harita: kartların durduğu yerlerde (yığın, eller, desteler, yan koltuklar) referansın değer ve doygunluk
//      farkı sıkıştırılır, darbe titremesi azalır, ayrıntı katmanı atlanır → krem kartlar ve kart arkaları öne çıkar.
// Bütün iş dilimli (Job): ~7 ms'lik parçalar; ana iş parçacığı bölünmez.
import {due, runJobSync, type Job} from '../skins/kit';
import {clamp, makeCanvas, mix, mulberry, smooth, spotOf, type Ctx, type RGB, type Rnd} from './paint';

// ───────────────────────── referans ─────────────────────────
/** Okunacak (getImageData) küçük tuval: CPU'da tutulur, GPU'dan geri okuma beklemesi olmaz. */
function readCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d', {willReadFrequently: true})!];
}
export interface Ref {
  w: number;
  h: number;
  /** referans pikseli / tasarım birimi */
  k: number;
  d: Uint8ClampedArray;
}
export type Calm = (x: number, y: number) => number;

/** Referans sahneyi çiz: `draw` tasarım biriminde çalışır. `calm` + `tone` verilirse sakin bölgeler bastırılır (dilimli). */
export function* makeRefJ(W: number, H: number, k: number, draw: (g: Ctx) => void, calm?: Calm, tone: RGB = [10, 14, 40], amount = 0.62): Job<Ref> {
  const [c, g] = readCanvas(Math.ceil(W * k), Math.ceil(H * k));
  g.save();
  g.scale(k, k);
  draw(g);
  g.restore();
  const cw = c.width, ch = c.height;
  const d = g.getImageData(0, 0, cw, ch).data;
  c.width = c.height = 0;
  if (calm) {
    if (due()) yield;
    for (let y = 0; y < ch; y++) {
      if ((y & 15) === 15 && due()) yield;
      let q = 0;
      for (let x = 0; x < cw; x++) {
        if ((x & 1) === 0) q = calm((x + 1) / k, (y + 0.5) / k); // 2 pikselde bir (yumuşak harita)
        if (q <= 0.01) continue;
        const i = (y * cw + x) * 4;
        const L = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
        const s = 0.72 + 0.5 * L; // değer farkı sıkışır ama tamamen kaybolmaz
        const t = amount * q;
        d[i] = d[i] + (tone[0] * s - d[i]) * t;
        d[i + 1] = d[i + 1] + (tone[1] * s - d[i + 1]) * t;
        d[i + 2] = d[i + 2] + (tone[2] * s - d[i + 2]) * t;
      }
    }
  }
  return {w: cw, h: ch, k, d};
}
export const makeRef = (W: number, H: number, k: number, draw: (g: Ctx) => void, calm?: Calm, tone?: RGB, amount?: number): Ref =>
  runJobSync(makeRefJ(W, H, k, draw, calm, tone, amount));

/** Nesne kimlik haritası: `draw` her nesneyi kendi kimlik rengiyle (R kanalı = kimlik) doldurur; yumuşatma kapalı. */
export function makeIdMap(W: number, H: number, k: number, draw: (g: Ctx, id: (n: number) => string) => void): Ref {
  const [c, g] = readCanvas(Math.ceil(W * k), Math.ceil(H * k));
  g.imageSmoothingEnabled = false;
  g.save();
  g.scale(k, k);
  draw(g, n => `rgb(${n},0,0)`);
  g.restore();
  const d = g.getImageData(0, 0, c.width, c.height).data;
  c.width = c.height = 0;
  return {w: Math.ceil(W * k), h: Math.ceil(H * k), k, d};
}
/** En yakın piksel kimliği */
export function idAt(m: Ref, x: number, y: number): number {
  const i = clamp(Math.floor(x * m.k), 0, m.w - 1), j = clamp(Math.floor(y * m.k), 0, m.h - 1);
  return m.d[(j * m.w + i) * 4];
}

/** Çift doğrusal örnek (tasarım biriminde) */
export function refAt(r: Ref, x: number, y: number): RGB {
  const fx = clamp(x * r.k - 0.5, 0, r.w - 1.001), fy = clamp(y * r.k - 0.5, 0, r.h - 1.001);
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
  const a = (j * r.w + i) * 4, b = a + r.w * 4, d = r.d;
  const f = (o: number): number => (d[a + o] * (1 - tx) + d[a + 4 + o] * tx) * (1 - ty) + (d[b + o] * (1 - tx) + d[b + 4 + o] * tx) * ty;
  return [f(0), f(1), f(2)];
}
const LUM = new WeakMap<Ref, Float32Array>();
/** Referansın parlaklık dizisi (bir kez hesaplanır) */
function lumOf(r: Ref): Float32Array {
  let L = LUM.get(r);
  if (!L) {
    L = new Float32Array(r.w * r.h);
    for (let i = 0; i < L.length; i++) L[i] = r.d[i * 4] * 0.3 + r.d[i * 4 + 1] * 0.59 + r.d[i * 4 + 2] * 0.11;
    LUM.set(r, L);
  }
  return L;
}

// ───────────────────────── yağlı boya darbeleri ─────────────────────────
interface Bin {
  c: RGB;
  p: Path2D;
}
/** Darbe toplayıcı: gövde + ışık sırtı + gölge oluğu + kıl izleri; renk kutularına toplanır, tek dolguyla çizilir. */
export class Oil {
  private bins = new Map<number, Bin>();
  n = 0;
  private bin(c: RGB): Path2D {
    const key = ((clamp(c[0], 0, 255) >> 3) << 10) | ((clamp(c[1], 0, 255) >> 3) << 5) | (clamp(c[2], 0, 255) >> 3);
    let b = this.bins.get(key);
    if (!b) {
      b = {c, p: new Path2D()};
      this.bins.set(key, b);
    }
    return b.p;
  }
  /** pts: akım çizgisi, lw: genişlik, relief: ışık sırtı gücü (0 yok), bristle: kıl izi (0..1) */
  add(pts: number[], lw: number, c: RGB, relief = 0.18, bristle = 0, rnd?: Rnd): void {
    const n = pts.length >> 1;
    if (n < 2) return;
    this.n++;
    poly(this.bin(c), pts, n, lw * 0.5, 0, 0, 1);
    if (relief > 0) {
      // ışık sırtı ve gölge oluğu ince: seyreltilmiş noktalar yeter (yol çağrısı yarıya iner)
      const p2 = n > 3 ? thin(pts, n) : pts, n2 = p2.length >> 1;
      const q = Math.max(0.35, lw * 0.15);
      poly(this.bin(mix(c, [255, 248, 230], relief)), p2, n2, lw * 0.13, -q, -q, 0.8);
      if (lw >= 3) poly(this.bin(mix(c, [0, 0, 10], relief * 0.9)), p2, n2, lw * 0.1, q * 0.9, q * 0.9, 0.7);
    }
    if (bristle > 0 && lw > 3.2 && rnd && rnd() < bristle) {
      // kıl izleri: gövdenin içinde iki ince, biraz açık/koyu çizgi
      const off = lw * 0.22;
      poly(this.bin(mix(c, [255, 250, 235], 0.1)), pts, n, Math.max(0.3, lw * 0.05), -off * 0.6, off * 0.3, 0.9);
      poly(this.bin(mix(c, [0, 0, 0], 0.12)), pts, n, Math.max(0.3, lw * 0.05), off * 0.5, -off * 0.4, 0.9);
    }
  }
  flush(g: Ctx): void {
    for (const b of this.bins.values()) {
      g.fillStyle = `rgb(${b.c[0] | 0},${b.c[1] | 0},${b.c[2] | 0})`;
      g.fill(b.p);
    }
    this.bins.clear();
    this.n = 0;
  }
}
/** Noktaları seyrelt (ilk ve son korunur) */
function thin(pts: number[], n: number): number[] {
  const o: number[] = [];
  for (let i = 0; i < n - 1; i += 2) o.push(pts[i * 2], pts[i * 2 + 1]);
  o.push(pts[n * 2 - 2], pts[n * 2 - 1]);
  return o;
}
/** Akım çizgisini sivri uçlu fırça çokgeni olarak yola ekler (ortası dolgun). Ara dizi ayırmaz (iki geçiş). */
function poly(p: Path2D, pts: number[], n: number, hw: number, ox: number, oy: number, taper: number): void {
  const x0 = pts[0] + ox, y0 = pts[1] + oy, x1 = pts[n * 2 - 2] + ox, y1 = pts[n * 2 - 1] + oy;
  let ex = pts[2] - pts[0], ey = pts[3] - pts[1];
  let e = Math.sqrt(ex * ex + ey * ey) || 1;
  p.moveTo(x0 - (ex / e) * hw * 0.6, y0 - (ey / e) * hw * 0.6);
  const k0 = 1 - taper * 0.45, k1 = taper * 0.45, inv = n === 1 ? 0 : 1 / (n - 1);
  for (let side = 1; side >= -1; side -= 2) {
    if (side < 0) {
      ex = pts[n * 2 - 2] - pts[n * 2 - 4];
      ey = pts[n * 2 - 1] - pts[n * 2 - 3];
      e = Math.sqrt(ex * ex + ey * ey) || 1;
      p.lineTo(x1 + (ex / e) * hw * 0.75, y1 + (ey / e) * hw * 0.75);
    }
    for (let q = 0; q < n; q++) {
      const i = side > 0 ? q : n - 1 - q;
      const a = i > 0 ? i - 1 : 0, z = i < n - 1 ? i + 1 : n - 1;
      let dx = pts[z * 2] - pts[a * 2], dy = pts[z * 2 + 1] - pts[a * 2 + 1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= d;
      dy /= d;
      const w = hw * (k0 + k1 * Math.sin(Math.PI * (n === 1 ? 0.5 : i * inv))) * side;
      p.lineTo(pts[i * 2] + ox - dy * w, pts[i * 2 + 1] + oy + dx * w);
    }
  }
  p.closePath();
}

// ───────────────────────── katman boyama ─────────────────────────
export interface Layer {
  /** ızgara aralığı (darbe başlangıçları) */
  cell: number;
  len: [number, number];
  width: [number, number];
  /** iz adımı */
  step?: number;
  /** tasarlanmış akış yönü (radyan) */
  field: (x: number, y: number) => number;
  /** referans kenarlarına teğet olma (0..1) */
  edge?: number;
  /** renk titremesi (0..255) */
  jitter: number;
  /** ışık sırtı */
  relief?: number;
  /** kıl izi olasılığı */
  bristle?: number;
  /** bu noktaya darbe koyma olasılığı (0..1); yoksa her yere */
  where?: (x: number, y: number) => number;
  /** renk düzeltme (ör. kırık renk vurgusu) */
  tint?: (c: RGB, x: number, y: number, rnd: Rnd) => RGB;
  /** sakin harita: titremeyi ve genişlik oynamasını azaltır */
  calm?: Calm;
  /** darbe boyu/genişliği çarpanı (küçük nesnelerde kısa darbe) */
  sizeK?: (x: number, y: number) => number;
  /** sınır (tasarım birimi) */
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

export function* paintLayer(g: Ctx, ref: Ref, rnd: Rnd, W: number, H: number, o: Layer): Job<void> {
  const step = o.step ?? Math.max(1.5, o.width[0] * 0.7);
  const edgeK = o.edge ?? 0;
  const x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, x1 = o.x1 ?? W, y1 = o.y1 ?? H;
  // başlangıç noktaları: karıştırılmış ızgara
  const pts: number[] = [];
  for (let y = y0 - o.cell; y < y1 + o.cell; y += o.cell)
    for (let x = x0 - o.cell; x < x1 + o.cell; x += o.cell) pts.push(x + rnd() * o.cell, y + rnd() * o.cell);
  for (let i = pts.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const ax = pts[i * 2], ay = pts[i * 2 + 1];
    pts[i * 2] = pts[j * 2];
    pts[i * 2 + 1] = pts[j * 2 + 1];
    pts[j * 2] = ax;
    pts[j * 2 + 1] = ay;
  }
  const L = lumOf(ref), rw = ref.w, rh = ref.h, rk = ref.k;
  const dirAt = (x: number, y: number): number => {
    const a = o.field(x, y);
    if (edgeK <= 0) return a;
    // parlaklık eğimi (önbellekli parlaklık dizisinde merkezi fark)
    const i = x * rk < 1 ? 1 : x * rk > rw - 2 ? rw - 2 : (x * rk) | 0, j = y * rk < 1 ? 1 : y * rk > rh - 2 ? rh - 2 : (y * rk) | 0;
    const c = j * rw + i;
    const gx = (L[c + 1] - L[c - 1]) * 1.2, gy = (L[c + rw] - L[c - rw]) * 1.2;
    const m = Math.sqrt(gx * gx + gy * gy);
    if (m < 6) return a;
    // kenara teğet (iki yön: tasarlanan yöne yakın olanı seç)
    let t = Math.atan2(gy, gx) + Math.PI / 2;
    if (Math.cos(t - a) < 0) t += Math.PI;
    const w = edgeK * smooth(6, 40, m);
    return Math.atan2((1 - w) * Math.sin(a) + w * Math.sin(t), (1 - w) * Math.cos(a) + w * Math.cos(t));
  };
  const oil = new Oil();
  let nS = 0, batch = 400;
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i], py = pts[i + 1];
    if (o.where && rnd() > o.where(px, py)) continue;
    const q = o.calm ? o.calm(px, py) : 0;
    const sk = o.sizeK ? o.sizeK(px, py) : 1;
    const len = (o.len[0] + rnd() * (o.len[1] - o.len[0])) * sk;
    const lw = (o.width[0] + rnd() * (o.width[1] - o.width[0]) * (1 - q * 0.5)) * (0.55 + 0.45 * sk);
    const tr: number[] = [px, py];
    let x = px, y = py;
    const ns = Math.max(2, Math.round(len / (step * (0.6 + 0.4 * sk))));
    for (let s = 0; s < ns; s++) {
      const a = dirAt(x, y);
      x += Math.cos(a) * step * (0.6 + 0.4 * sk);
      y += Math.sin(a) * step * (0.6 + 0.4 * sk);
      tr.push(x, y);
    }
    const mid = tr.length >> 2 << 1;
    let c = mix(refAt(ref, px, py), refAt(ref, tr[mid], tr[mid + 1]), 0.5);
    const jt = o.jitter * (1 - q * 0.65);
    const k = (rnd() - 0.5) * 2 * jt;
    c = [clamp(c[0] + k + (rnd() - 0.5) * jt * 0.5, 0, 255), clamp(c[1] + k + (rnd() - 0.5) * jt * 0.5, 0, 255), clamp(c[2] + k + (rnd() - 0.5) * jt * 0.5, 0, 255)];
    if (o.tint) c = o.tint(c, px, py, rnd);
    oil.add(tr, lw, c, (o.relief ?? 0.16) * (1 - q * 0.5), o.bristle ?? 0, rnd);
    // ara ara nefes; yollar birikir ve toplu dolgulanır. Toplu dolgunun süresi ölçülür: uzun sürerse parti küçülür
    // (iri masa darbeleri), kısa sürerse büyür (küçük kart darbeleri) — tek görev hep kısa kalır.
    if (++nS % 64 === 0 && due()) yield;
    if (oil.n >= batch) {
      const t = performance.now();
      oil.flush(g);
      const dt = performance.now() - t;
      batch = dt > 6 ? Math.max(200, batch >> 1) : dt < 2.5 ? Math.min(1600, batch + 200) : batch;
      if (due()) yield;
    }
  }
  oil.flush(g);
}

/** Tuval dokusu: düzensiz bez greni (açık/koyu benekler, hafif çapraz lif) — boyanın altından görünen bez. */
export function canvasWeave(g: Ctx, W: number, H: number, rnd: Rnd, a = 0.06): void {
  const T = 96;
  const [c, cg] = makeCanvas(T, T);
  const img = cg.createImageData(T, T);
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const i = (y * T + x) * 4;
      // çapraz lif: çok hafif, düzensiz
      const fib = Math.sin((x + y) * 1.7 + Math.sin(y * 0.9) * 2) * 0.25 + Math.sin((x - y) * 1.3) * 0.15;
      const v = fib + (rnd() - 0.5) * 1.1;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0 ? 255 : 0;
      img.data[i + 3] = (Math.min(1, Math.abs(v)) * a * 255) | 0;
    }
  cg.putImageData(img, 0, 0);
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = g.createPattern(c, 'repeat')!;
  g.fillRect(0, 0, W, H);
  g.restore();
}

/**
 * Işık dokunuşları: referansta parlak ve sıcak/renkli pikseller (pencereler, köprü ışıkları) kısa, kalın, açık
 * darbelere dönüşür (impasto). Bölge [x0,y0,x1,y1] tasarım biriminde; `minL` parlaklık eşiği (0..255).
 */
export function lightDabs(oil: Oil, ref: Ref, rnd: Rnd, x0: number, y0: number, x1: number, y1: number, minL: number, size: number, calm?: Calm, maxN = 500): void {
  const sx = Math.max(0, Math.floor(x0 * ref.k)), ex = Math.min(ref.w - 1, Math.ceil(x1 * ref.k));
  const sy = Math.max(0, Math.floor(y0 * ref.k)), ey = Math.min(ref.h - 1, Math.ceil(y1 * ref.k));
  // aday sayısına göre seyrelt: geniş parlak alanlarda (şafak ufku) dokunuş sayısı sınırlı kalsın (tek görev kısa)
  const L = lumOf(ref);
  let cand = 0;
  for (let y = sy; y <= ey; y++) for (let x = sx; x <= ex; x++) if (L[y * ref.w + x] >= minL) cand++;
  const keep = Math.min(0.65, maxN / Math.max(1, cand));
  for (let y = sy; y <= ey; y++)
    for (let x = sx; x <= ex; x++) {
      const i = (y * ref.w + x) * 4;
      if (L[y * ref.w + x] < minL || rnd() > keep) continue;
      const px = (x + rnd()) / ref.k, py = (y + rnd()) / ref.k;
      const q = calm ? calm(px, py) : 0;
      if (q > 0.6) continue;
      const c: RGB = mix([ref.d[i], ref.d[i + 1], ref.d[i + 2]], [255, 250, 230], 0.25);
      const len = size * (0.5 + rnd() * 0.8), a = (rnd() - 0.5) * 0.6;
      oil.add([px - Math.cos(a) * len * 0.5, py - Math.sin(a) * len * 0.5, px + Math.cos(a) * len * 0.5, py + Math.sin(a) * len * 0.5], size * (0.55 + rnd() * 0.35), c, 0.3);
    }
}

// ───────────────────────── masa düzeni: kartların durduğu yerler ─────────────────────────
/**
 * Sakin harita (0..1): Table2D.layout() ile aynı oranlar. 2 kişi + 4 kişi düzenlerinin birleşimi:
 * yığın, rakip eli / üst koltuk, oyuncunun eli (alt bant), deste ve toplanan kart yığınları, yan koltuklar.
 */
export function tableCalm(W: number, H: number): Calm {
  const S = spotOf(W, H);
  const cw = S.cw, ch = cw / 0.7;
  const sx = Math.max(cw * 0.6, W * 0.15);
  const blobs: [number, number, number, number, number][] = [
    [S.px, S.py, S.ringR * 2.1, S.ringR * 2.1, 1], // yığın
    [W / 2, H * 0.215, Math.max(W * 0.22, cw * 1.7), H * 0.068, 0.78], // rakip eli (2 kişi) / üst koltuk (4 kişi)
    [Math.min(W - cw * 0.9, W / 2 + cw * 1.45), H * 0.2, cw * 0.75, ch * 0.62, 0.7], // üst koltuğun toplananları (4 kişi)
    [Math.max(cw * 0.62, W * 0.155), S.py, cw * 1.05, ch * 0.9, 0.85], // deste (2 kişi)
    [W - sx, H * 0.27, cw * 0.95, ch * 0.8, 0.75], // toplanan (rakip)
    [W - sx, H * 0.655, cw * 0.95, ch * 0.8, 0.8], // toplanan (oyuncu)
    [Math.max(cw * 0.7, W * 0.29), H * 0.665, cw * 0.95, ch * 0.75, 0.8], // deste (4 kişi)
    [Math.min(W - cw * 0.6, W * 0.72), H * 0.665, cw * 0.95, ch * 0.75, 0.8], // toplanan (4 kişi)
    [W * 0.07, H * 0.5, W * 0.13, H * 0.18, 0.8], // sol koltuk (4 kişi)
    [W * 0.93, H * 0.5, W * 0.13, H * 0.18, 0.8], // sağ koltuk (4 kişi)
  ];
  return (x, y) => {
    let q = 0.95 * smooth(H * 0.7, H * 0.79, y); // oyuncunun eli
    for (const [bx, by, rx, ry, s] of blobs) {
      const dx = (x - bx) / rx, dy = (y - by) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1.3) q = Math.max(q, s * (1 - smooth(0.7, 1.3, d)));
    }
    return q;
  };
}

// ───────────────────────── küçük resimler (deste kartları) ─────────────────────────
/** Şekil maskesi: `draw` doldurduğu yer 1, gerisi 0 (tasarım biriminde, en yakın piksel). */
export function maskOf(W: number, H: number, draw: (g: Ctx) => void, k = 0.5): (x: number, y: number) => number {
  const [c, g] = readCanvas(Math.ceil(W * k), Math.ceil(H * k));
  g.scale(k, k);
  g.fillStyle = '#fff';
  draw(g);
  const w = c.width, h = c.height, d = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  return (x, y) => {
    const i = Math.floor(x * k), j = Math.floor(y * k);
    return i < 0 || j < 0 || i >= w || j >= h ? 0 : a[j * w + i];
  };
}

export interface ArtOpts {
  W: number;
  H: number;
  seed: number;
  sketch: (g: Ctx) => void;
  field: (x: number, y: number) => number;
  /** fırça ölçeği (360 px genişlikli kart tuvali = 1) */
  s?: number;
  /** referans çözünürlüğü */
  k?: number;
  sizeK?: (x: number, y: number) => number;
  /** boyanacak bölge (0..1); dışına darbe başlamaz */
  mask?: (x: number, y: number) => number;
  /** ince ayrıntı katmanı nerede (0..1); yoksa yok */
  detail?: (x: number, y: number) => number;
  tint?: Layer['tint'];
  /** iri astar katmanı (varsayılan var) */
  under?: boolean;
  jitter?: number;
}
/**
 * Küçük bir yağlı boya tablo: eskiz → taban (eskizin kendisi, boşluklarda tutarlı renk) → astar → gövde → ayrıntı.
 * Tuval + referans döner; çağıran ışık dokunuşlarını, çerçeveyi vb. kendisi ekler.
 */
export function* oilArt(o: ArtOpts): Job<{cv: HTMLCanvasElement; g: Ctx; ref: Ref; rnd: Rnd}> {
  const s = o.s ?? 1, W = o.W, H = o.H;
  const rnd = mulberry(o.seed);
  const ref = makeRef(W, H, o.k ?? 0.5, o.sketch);
  if (due()) yield;
  const [cv, g] = makeCanvas(W, H);
  const [bc, bg] = makeCanvas(ref.w, ref.h);
  bg.putImageData(new ImageData(new Uint8ClampedArray(ref.d), ref.w, ref.h), 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(bc, 0, 0, W, H);
  bc.width = bc.height = 0;
  const m = o.mask;
  const j = o.jitter ?? 1;
  if (o.under !== false) {
    yield* paintLayer(g, ref, rnd, W, H, {cell: 8 * s, len: [14 * s, 24 * s], width: [6 * s, 8.5 * s], field: o.field, edge: 0.3, jitter: 10 * j, relief: 0.07, where: m, sizeK: o.sizeK});
  }
  yield* paintLayer(g, ref, rnd, W, H, {cell: 5 * s, len: [10 * s, 18 * s], width: [3.4 * s, 5 * s], field: o.field, edge: 0.6, jitter: 18 * j, relief: 0.18, bristle: 0.4, where: m, sizeK: o.sizeK, tint: o.tint});
  if (o.detail) {
    const d = o.detail;
    yield* paintLayer(g, ref, rnd, W, H, {cell: 3.1 * s, len: [5 * s, 10 * s], width: [1.8 * s, 2.6 * s], field: o.field, edge: 0.85, jitter: 12 * j, relief: 0.2, where: m ? (x, y) => m(x, y) * d(x, y) : d, sizeK: o.sizeK});
  }
  return {cv, g, ref, rnd};
}
/** Elips boyunca kısa teğet darbelerden bir halka (hale, boyalı çerçeve). */
export function ringStrokes(oil: Oil, cx: number, cy: number, rx: number, ry: number, lw: number, cols: readonly RGB[], rnd: Rnd, seg = 12, relief = 0.22): void {
  const per = Math.PI * 2 * Math.sqrt((rx * rx + ry * ry) / 2);
  const n = Math.ceil(per / (seg * 0.7));
  const off = rnd() * 6;
  for (let i = 0; i < n; i++) {
    const a0 = off + ((i + rnd() * 0.5) / n) * Math.PI * 2;
    const r = (rnd() - 0.5) * lw * 0.5;
    const da = (seg * (0.8 + rnd() * 0.5)) / Math.max(rx, ry);
    const pts: number[] = [];
    for (let q = 0; q <= 4; q++) pts.push(cx + Math.cos(a0 + (da * q) / 4) * (rx + r), cy + Math.sin(a0 + (da * q) / 4) * (ry + r));
    oil.add(pts, lw * (0.85 + rnd() * 0.4), cols[Math.floor(rnd() * cols.length)], relief);
  }
}

/** Kapalı çoklu çizgi boyunca kısa teğet darbeler (kemer/şekil çerçevesi). pts: [x0,y0,x1,y1,...] */
export function pathStrokes(oil: Oil, pts: number[], lw: number, cols: readonly RGB[], rnd: Rnd, seg = 12, off = 0, relief = 0.22): void {
  const n = pts.length >> 1;
  const cum: number[] = [0];
  for (let i = 1; i <= n; i++) {
    const a = (i - 1) * 2, b = (i % n) * 2;
    cum.push(cum[i - 1] + Math.hypot(pts[b] - pts[a], pts[b + 1] - pts[a + 1]));
  }
  const L = cum[n];
  const at = (d: number): [number, number, number, number] => {
    d = ((d % L) + L) % L;
    let i = 1;
    while (cum[i] < d) i++;
    const a = (i - 1) * 2, b = (i % n) * 2, t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const dx = pts[b] - pts[a], dy = pts[b + 1] - pts[a + 1], e = Math.hypot(dx, dy) || 1;
    return [pts[a] + dx * t, pts[a + 1] + dy * t, -dy / e, dx / e];
  };
  const cnt = Math.ceil(L / (seg * 0.62));
  for (let i = 0; i < cnt; i++) {
    const d0 = ((i + rnd() * 0.5) / cnt) * L, len = seg * (0.8 + rnd() * 0.5), o = off + (rnd() - 0.5) * lw * 0.5;
    const tr: number[] = [];
    for (let q = 0; q <= 4; q++) {
      const [x, y, nx, ny] = at(d0 + (len * q) / 4);
      tr.push(x + nx * o, y + ny * o);
    }
    oil.add(tr, lw * (0.85 + rnd() * 0.4), cols[Math.floor(rnd() * cols.length)], relief);
  }
}

/** Hale: [r0, r1] bandına rastgele dağılmış kısa teğet darbeler (düzenli halka değil, elle sürülmüş ışık). */
export function haloStrokes(oil: Oil, cx: number, cy: number, r0: number, r1: number, n: number, cols: readonly RGB[], lw: number, rnd: Rnd, seg = 10, relief = 0.22): void {
  for (let i = 0; i < n; i++) {
    const rr = r0 + (r1 - r0) * Math.sqrt(rnd()), a0 = rnd() * Math.PI * 2, da = (seg * (0.7 + rnd() * 0.6)) / Math.max(1, rr);
    const sp = (rnd() - 0.4) * lw * 0.8; // dışa doğru hafif sarmal
    const pts: number[] = [];
    for (let q = 0; q <= 4; q++) pts.push(cx + Math.cos(a0 + (da * q) / 4) * (rr + (sp * q) / 4), cy + Math.sin(a0 + (da * q) / 4) * (rr + (sp * q) / 4));
    oil.add(pts, lw * (0.8 + rnd() * 0.5), cols[Math.floor(rnd() * cols.length)], relief);
  }
}
