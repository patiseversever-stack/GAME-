// Masa boyamaları için ortak yardımcılar: tohumlu rastgele, tuval, renk, masa düzeni (yığının yeri), yumuşak gürültü.
// Boyamalar bir kez çalışır; sonuç tuval CSS ile tam ekrana gerilir (yumuşak içerik düşük çözünürlükte çizilebilir).

export type RGB = readonly [number, number, number];
export type Ctx = CanvasRenderingContext2D;
export type Rnd = () => number;

/** Tohumlu rastgele (aynı tohum → aynı tablo; her açılışta aynı masa). */
export function mulberry(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
/** Renk titremesi: parlaklık + kanal başına küçük sapma (elle karıştırılmış boya hissi). */
export function jit(c: RGB, amt: number, rnd: Rnd): RGB {
  const k = (rnd() - 0.5) * 2 * amt;
  const q = amt * 0.45;
  return [clamp(c[0] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[1] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[2] + k + (rnd() - 0.5) * q, 0, 255)];
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return [c, g];
}

/**
 * Boyama çözünürlüğü: CSS pikseli başına kaç tuval pikseli. `max` yumuşak (boyalı) içerik için düşük tutulur,
 * toplam piksel `cap` ile sınırlanır (bellek + süre). Tuval CSS'te %100'e gerilir.
 */
export function resScale(w: number, h: number, dpr: number, max: number, cap = 2_600_000): number {
  let k = Math.min(Math.max(dpr, 1), max);
  if (w * h * k * k > cap) k = Math.sqrt(cap / (w * h));
  return k;
}

/** Masa düzeni — Table2D.layout() ile aynı oranlar (yığın merkezi ve kart boyu). */
export interface Spot {
  W: number;
  H: number;
  /** yığın merkezi */
  px: number;
  py: number;
  /** kart genişliği (CSS px) */
  cw: number;
  /** yığın halkası yarıçapı */
  ringR: number;
}
export function spotOf(W: number, H: number): Spot {
  const cw = Math.round(Math.min(W * 0.215, H * 0.112));
  return {W, H, px: W / 2, py: H * 0.455, cw, ringR: cw * 1.125};
}

/**
 * Yumuşak değer gürültüsü: küçük rastgele tuvali büyütüp yumuşatarak çizer (çok ucuz "bulut").
 * `cell` = bir gürültü hücresinin CSS boyu. Renkler a..b arasında, `alpha` ile bindirilir.
 */
export function cloud(g: Ctx, W: number, H: number, cell: number, rnd: Rnd, a: RGB, b: RGB, alpha: number, op: GlobalCompositeOperation = 'source-over'): void {
  const nx = Math.max(2, Math.ceil(W / cell) + 2), ny = Math.max(2, Math.ceil(H / cell) + 2);
  const [c, cg] = makeCanvas(nx, ny);
  const img = cg.createImageData(nx, ny);
  for (let i = 0; i < nx * ny; i++) {
    const t = rnd();
    const col = mix(a, b, t);
    img.data[i * 4] = col[0];
    img.data[i * 4 + 1] = col[1];
    img.data[i * 4 + 2] = col[2];
    img.data[i * 4 + 3] = 255;
  }
  cg.putImageData(img, 0, 0);
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = op;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  // yarım hücre kaydır: kenarlarda yumuşatma boşluğu kalmasın
  g.drawImage(c, 0.5, 0.5, nx - 1, ny - 1, -cell, -cell, (nx - 1) * cell, (ny - 1) * cell);
  g.restore();
}

/** İnce kumaş/sır greni: küçük gürültü karosu desen olarak tekrarlanır. */
export function grain(g: Ctx, W: number, H: number, rnd: Rnd, amt: number, size = 96): void {
  const [c, cg] = makeCanvas(size, size);
  const img = cg.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = (rnd() * amt * 255) | 0;
  }
  cg.putImageData(img, 0, 0);
  g.save();
  g.fillStyle = g.createPattern(c, 'repeat')!;
  g.fillRect(0, 0, W, H);
  g.restore();
}

/** Yığının çevresine (veya herhangi bir noktaya) yumuşak radyal boya: merkez rengi → saydam. */
export function radial(g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][], sx = 1, sy = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  const gr = g.createRadialGradient(0, 0, r0, 0, 0, r1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  g.fillStyle = gr;
  g.fillRect(-r1 - 2, -r1 - 2, r1 * 2 + 4, r1 * 2 + 4);
  g.restore();
}

/**
 * Toplu fırça darbeleri: her darbe uçları sivrilen bir çokgen (ortası dolgun, uçları ince — gerçek fırça izi);
 * aynı (nicemlenmiş) renkteki binlerce darbe TEK yola eklenir ve tek `fill` ile boyanır.
 * Tek tek `stroke` çağrısına göre ~10× daha az çizim komutu; kabartma ışığı (impasto sırtı) ayrı bir açık kutuda.
 */
export class Strokes {
  private bins = new Map<number, {c: RGB; p: Path2D; hl: Path2D | null; hc: RGB}>();
  /** `relief` > 0: darbenin sol üst kenarında ince açık sırt (lighten oranı) */
  add(pts: number[], lw: number, c: RGB, relief = 0.2): void {
    const n = pts.length >> 1;
    if (n < 2) return;
    const key = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3) | (relief > 0 ? 1 << 15 : 0);
    let b = this.bins.get(key);
    if (!b) {
      const hc = mix(c, [255, 250, 232], relief);
      b = {c, p: new Path2D(), hl: relief > 0 ? new Path2D() : null, hc};
      this.bins.set(key, b);
    }
    poly(b.p, pts, n, lw * 0.5, 0, 0);
    if (b.hl) {
      const q = Math.max(0.35, lw * 0.16);
      poly(b.hl, pts, n, lw * 0.15, -q, -q);
    }
  }
  /** Kutuları ekleme sırasıyla boyar (darbeler karıştırılmış eklendiği için katman sırası doğal görünür). */
  flush(g: Ctx): void {
    for (const b of this.bins.values()) {
      g.fillStyle = css(b.c);
      g.fill(b.p);
      if (b.hl) {
        g.fillStyle = css(b.hc);
        g.fill(b.hl);
      }
    }
    this.bins.clear();
  }
}
/** Bir akım çizgisini sivri uçlu fırça çokgeni olarak yola ekler. */
function poly(p: Path2D, pts: number[], n: number, hw: number, ox: number, oy: number): void {
  const L: number[] = [], R: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), z = Math.min(n - 1, i + 1);
    let dx = pts[z * 2] - pts[a * 2], dy = pts[z * 2 + 1] - pts[a * 2 + 1];
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= d;
    dy /= d;
    const t = n === 1 ? 0.5 : i / (n - 1);
    const w = hw * (0.55 + 0.45 * Math.sin(Math.PI * t)); // ortası dolgun
    const x = pts[i * 2] + ox, y = pts[i * 2 + 1] + oy;
    L.push(x - dy * w, y + dx * w);
    R.push(x + dy * w, y - dx * w);
  }
  // uçlar: yarım genişlik kadar dışarı taşan sivri (yuvarlağımsı) uç
  const x0 = pts[0] + ox, y0 = pts[1] + oy, x1 = pts[n * 2 - 2] + ox, y1 = pts[n * 2 - 1] + oy;
  let ex = pts[2] - pts[0], ey = pts[3] - pts[1];
  let e = Math.sqrt(ex * ex + ey * ey) || 1;
  const s0x = x0 - (ex / e) * hw * 0.7, s0y = y0 - (ey / e) * hw * 0.7;
  ex = pts[n * 2 - 2] - pts[n * 2 - 4];
  ey = pts[n * 2 - 1] - pts[n * 2 - 3];
  e = Math.sqrt(ex * ex + ey * ey) || 1;
  const s1x = x1 + (ex / e) * hw * 0.8, s1y = y1 + (ey / e) * hw * 0.8;
  p.moveTo(s0x, s0y);
  for (let i = 0; i < L.length; i += 2) p.lineTo(L[i], L[i + 1]);
  p.lineTo(s1x, s1y);
  for (let i = R.length - 2; i >= 0; i -= 2) p.lineTo(R[i], R[i + 1]);
  p.closePath();
}

/**
 * Akış alanını kaba bir ızgarada bir kez hesaplar ve çift doğrusal ara değerle sunar (darbe izleme ~3× hızlanır).
 * `f` açı (radyan) döndürür; ızgara aralığı `gs` CSS px.
 */
export function gridField(f: (x: number, y: number) => number, W: number, H: number, gs: number, pad = 40): (x: number, y: number) => number {
  const x0 = -pad, y0 = -pad;
  const nx = Math.ceil((W + pad * 2) / gs) + 1, ny = Math.ceil((H + pad * 2) / gs) + 1;
  const cx = new Float32Array(nx * ny), cy = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = f(x0 + i * gs, y0 + j * gs);
      cx[j * nx + i] = Math.cos(a);
      cy[j * nx + i] = Math.sin(a);
    }
  }
  return (x, y) => {
    const fx = clamp((x - x0) / gs, 0, nx - 1.001), fy = clamp((y - y0) / gs, 0, ny - 1.001);
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    const a = j * nx + i, b = a + nx;
    const vx = (cx[a] * (1 - tx) + cx[a + 1] * tx) * (1 - ty) + (cx[b] * (1 - tx) + cx[b + 1] * tx) * ty;
    const vy = (cy[a] * (1 - tx) + cy[a + 1] * tx) * (1 - ty) + (cy[b] * (1 - tx) + cy[b + 1] * tx) * ty;
    return Math.atan2(vy, vx);
  };
}
