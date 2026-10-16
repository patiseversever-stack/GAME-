// Ebru motoru: gerçek ebru teknesinin matematiği (A. Jaffer, "Mathematical Marbling").
// Boya damlası suyun üstünde yayılır ve önceki her şeyi dışa iter; tarak/biz (iğne) suyu sürükler; girdap döndürür.
// Her işlem tersine çevrilebilir: piksel başına işlemleri SONDAN BAŞA ters uygulayıp pikselin hangi damladan
// geldiğini buluruz (kesin, keskin ve yumuşak kenarlı; doku birikmesi yok). Kenar yumuşatma: damla sınırında örtü
// oranı + ters eşlemenin radyal sıkışması izlenir (halka damarları incelse de pürüzsüz kalır).
// Çizim dilimli (Job): her ~7 ms'de ana iş parçacığına nefes verir.
import {clamp, due, makeCanvas, type Job, type RGB} from './kit';

export type MOp =
  /** boya damlası: merkez, yarıçap, palet rengi */
  | {k: 'drop'; x: number; y: number; r: number; c: number}
  /**
   * tarak/biz: (x,y)'den geçen, (dx,dy) yönlü doğru boyunca sürükleme. a = kayma, l = keskinlik (küçük → ince sivri),
   * s > 0 ise s aralıklı paralel dişler (tarak); t0..t1 verilirse yalnız o aralıkta (iğne darbesi), `fall` yumuşak uç.
   */
  | {k: 'tine'; x: number; y: number; dx: number; dy: number; a: number; l: number; s?: number; t0?: number; t1?: number; fall?: number}
  /** dalgalı tarak: (dx,dy) yönünde A·sin(f·(p·n) + ph) kayma */
  | {k: 'wave'; dx: number; dy: number; A: number; f: number; ph: number}
  /** girdap: merkezde a radyan, r ölçeğinde sönen dönme */
  | {k: 'swirl'; x: number; y: number; a: number; r: number};

export interface MarbleOpts {
  w: number;
  h: number;
  ops: readonly MOp[];
  pal: readonly RGB[];
  base: RGB;
  /** piksel başına işlem birimi (varsayılan 1) */
  unit?: number;
  /** damla kenarındaki koyu mürekkep halkası (0..1) */
  rim?: number;
  /** zemin dokusu (0..1): taban renginde hafif bulut */
  mottle?: number;
  /** yalnız bu pikselleri hesapla (diğerleri saydam) — çerçeve şeridi gibi kısmi tuvaller için hız */
  keep?: (x: number, y: number) => boolean;
}

const FAR0 = 2.2, FAR1 = 3.4;
const enum K {
  Drop,
  Tine,
  Wave,
  Swirl,
}

/** Yol maskesi: keep() için (yol içindeki pikseller + `pad` px pay). Dönüşüm: birim yol → piksel. */
export function pathMask(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): (x: number, y: number) => boolean {
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = '#000';
  draw(g);
  const d = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  return (x, y) => m[y * w + x] === 1;
}

/** Ebru tuvali üretir (dilimli). */
export function* marble(o: MarbleOpts): Job<HTMLCanvasElement> {
  const {w, h, pal, base} = o;
  const U = o.unit ?? 1;
  const rim = o.rim ?? 0.22;
  const mot = o.mottle ?? 0;
  // işlemleri düz diziye çevir (hızlı iç döngü)
  const n = o.ops.length;
  const T = new Int8Array(n);
  const F = new Float64Array(n * 10);
  for (let i = 0; i < n; i++) {
    const op = o.ops[i], b = i * 10;
    if (op.k === 'drop') {
      T[i] = K.Drop;
      F[b] = op.x;
      F[b + 1] = op.y;
      F[b + 2] = op.r;
      F[b + 3] = op.c;
      F[b + 4] = op.r * op.r;
      F[b + 5] = FAR1 * FAR1 * op.r * op.r; // bu uzaklıktan ötede itme yok (yumuşak sönümle) — 3-4× hız
      F[b + 6] = FAR0 * FAR0 * op.r * op.r;
    } else if (op.k === 'tine') {
      T[i] = K.Tine;
      const L = Math.hypot(op.dx, op.dy) || 1;
      F[b] = op.x;
      F[b + 1] = op.y;
      F[b + 2] = op.dx / L;
      F[b + 3] = op.dy / L;
      F[b + 4] = op.a;
      F[b + 5] = op.l;
      F[b + 6] = op.s ?? 0;
      F[b + 7] = op.t0 ?? -1e9;
      F[b + 8] = op.t1 ?? 1e9;
      F[b + 9] = op.fall ?? 1;
    } else if (op.k === 'wave') {
      T[i] = K.Wave;
      const L = Math.hypot(op.dx, op.dy) || 1;
      F[b] = op.dx / L;
      F[b + 1] = op.dy / L;
      F[b + 2] = op.A;
      F[b + 3] = op.f;
      F[b + 4] = op.ph;
    } else {
      T[i] = K.Swirl;
      F[b] = op.x;
      F[b + 1] = op.y;
      F[b + 2] = op.a;
      F[b + 3] = op.r;
    }
  }
  const PR = new Float64Array(pal.length * 3);
  pal.forEach((c, i) => {
    PR[i * 3] = c[0];
    PR[i * 3 + 1] = c[1];
    PR[i * 3 + 2] = c[2];
  });
  // Uzun damla dizileri (battal) için ızgara: piksel yalnız yakınındaki damlaları dolaşır (5-10× hız).
  // Dizi boyunca nokta biraz kayar: hücre listesi `margin` payıyla kurulur.
  const runOf = new Int32Array(n).fill(-1); // dizinin SON elemanında: dizi numarası
  interface Grid {
    i0: number;
    x0: number;
    y0: number;
    G: number;
    nx: number;
    ny: number;
    start: Int32Array;
    list: Int32Array;
  }
  const grids: Grid[] = [];
  for (let i = 0; i < n; ) {
    if (T[i] !== K.Drop) {
      i++;
      continue;
    }
    let j = i;
    let rmax = 0;
    while (j < n && T[j] === K.Drop) rmax = Math.max(rmax, F[j++ * 10 + 2]);
    if (j - i >= 32) {
      const margin = rmax * 2.5;
      const pad = FAR1 * rmax + margin;
      const G = Math.max(12 * U, rmax * 1.5);
      const x0 = -pad, y0 = -pad;
      const nx = Math.ceil((w * U + 2 * pad) / G) + 1, ny = Math.ceil((h * U + 2 * pad) / G) + 1;
      const cnt = new Int32Array(nx * ny + 1);
      const each = (k: number, fn: (c: number) => void): void => {
        const b = k * 10, R = FAR1 * F[b + 2] + margin;
        const ax = Math.max(0, Math.floor((F[b] - R - x0) / G)), bx = Math.min(nx - 1, Math.floor((F[b] + R - x0) / G));
        const ay = Math.max(0, Math.floor((F[b + 1] - R - y0) / G)), by = Math.min(ny - 1, Math.floor((F[b + 1] + R - y0) / G));
        for (let cy = ay; cy <= by; cy++) for (let cx = ax; cx <= bx; cx++) fn(cy * nx + cx);
      };
      for (let k = i; k < j; k++) each(k, c => cnt[c + 1]++);
      for (let c = 0; c < nx * ny; c++) cnt[c + 1] += cnt[c];
      const fill = cnt.slice();
      const list = new Int32Array(cnt[nx * ny]);
      for (let k = i; k < j; k++) each(k, c => (list[fill[c]++] = k));
      runOf[j - 1] = grids.length;
      grids.push({i0: i, x0, y0, G, nx, ny, start: cnt, list});
    }
    i = j;
  }
  const [cv, g] = makeCanvas(w, h);
  const img = g.createImageData(w, h);
  const D = img.data;
  const aa = U * 0.85;
  const keep = o.keep;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (keep && !keep(x, y)) continue;
      let px = (x + 0.5) * U, py = (y + 0.5) * U;
      let wt = 1, ar = 0, ag = 0, ab = 0, sc = 1;
      let i = n - 1;
      let gl: Int32Array | null = null, li = 0, lend = 0, gi0 = 0;
      while (wt > 0.004) {
        let op: number;
        if (gl) {
          if (li < lend) {
            gl = null;
            i = gi0 - 1;
            continue;
          }
          op = gl[li--];
        } else {
          if (i < 0) break;
          const ri = runOf[i];
          if (ri >= 0) {
            const G = grids[ri];
            const cx = clamp(Math.floor((px - G.x0) / G.G), 0, G.nx - 1), cy = clamp(Math.floor((py - G.y0) / G.G), 0, G.ny - 1);
            const c = cy * G.nx + cx;
            gl = G.list;
            lend = G.start[c];
            li = G.start[c + 1] - 1;
            gi0 = G.i0;
            continue;
          }
          op = i--;
        }
        const b = op * 10;
        switch (T[op]) {
          case K.Drop: {
            const cx = F[b], cy = F[b + 1], r = F[b + 2], r2 = F[b + 4];
            const dx = px - cx, dy = py - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= F[b + 5]) break; // uzak damla: etkisi yok sayılır
            const lim = r + aa * sc;
            if (d2 < lim * lim) {
              const d = Math.sqrt(d2);
              const cov = clamp(0.5 + (r - d) / (aa * sc), 0, 1);
              if (cov > 0) {
                const ci = F[b + 3] * 3;
                // kenara yakın koyu mürekkep halkası
                const e = rim > 0 ? rim * clamp(1 - (r - d) / (r * 0.16 + aa * sc), 0, 1) : 0;
                const k = wt * cov * (1 - e * 0.55);
                ar += PR[ci] * k;
                ag += PR[ci + 1] * k;
                ab += PR[ci + 2] * k;
                wt *= 1 - cov;
                if (wt <= 0.004) break;
              }
            }
            if (d2 > r2) {
              let f = Math.sqrt(1 - r2 / d2);
              if (d2 > F[b + 6]) {
                // FAR0..FAR1 arası itme yumuşakça söner (dikiş olmasın)
                const t = (Math.sqrt(d2) / r - FAR0) / (FAR1 - FAR0);
                f = 1 - (1 - f) * (1 - t * t * (3 - 2 * t));
              }
              px = cx + dx * f;
              py = cy + dy * f;
              if (f < 0.98) sc = Math.min(sc / Math.max(f, 0.02), 60);
            } else {
              px = cx;
              py = cy;
            }
            break;
          }
          case K.Tine: {
            const mx = F[b + 2], my = F[b + 3];
            const vx = px - F[b], vy = py - F[b + 1];
            let ac = -vx * my + vy * mx; // dik uzaklık (işaretli)
            const s = F[b + 6];
            if (s > 0) {
              ac = ((ac % s) + s) % s;
              ac = Math.min(ac, s - ac);
            } else ac = Math.abs(ac);
            let along = vx * mx + vy * my;
            const t0 = F[b + 7], t1 = F[b + 8], fl = F[b + 9];
            const disp = (F[b + 4] * F[b + 5]) / (ac + F[b + 5]);
            // pencere: iğne darbesi yalnız t0..t1 arasında (ters eşleme için 2 adım sabit nokta)
            let win = 1;
            for (let it = 0; it < 2; it++) {
              const a2 = along - disp * win;
              win = t0 < -1e8 ? 1 : clamp((a2 - (t0 - fl)) / fl, 0, 1) * clamp((t1 + fl - a2) / fl, 0, 1);
              if (t0 < -1e8) break;
            }
            along -= disp * win;
            px -= mx * disp * win;
            py -= my * disp * win;
            break;
          }
          case K.Wave: {
            const mx = F[b], my = F[b + 1];
            const t = -px * my + py * mx;
            const dd = F[b + 2] * Math.sin(F[b + 3] * t + F[b + 4]);
            px -= mx * dd;
            py -= my * dd;
            break;
          }
          default: {
            const cx = F[b], cy = F[b + 1];
            const dx = px - cx, dy = py - cy;
            const q = (dx * dx + dy * dy) / (F[b + 3] * F[b + 3]);
            if (q > 9) break;
            const th = -F[b + 2] * Math.exp(-q);
            const c = Math.cos(th), sn = Math.sin(th);
            px = cx + dx * c - dy * sn;
            py = cy + dx * sn + dy * c;
          }
        }
      }
      if (wt > 0.004) {
        let k = 1;
        if (mot > 0) k = 1 + mot * (Math.sin(px * 0.031 + Math.sin(py * 0.017) * 2) * 0.5 + Math.sin(py * 0.043 - px * 0.012) * 0.5);
        ar += base[0] * k * wt;
        ag += base[1] * k * wt;
        ab += base[2] * k * wt;
      }
      const j = (y * w + x) * 4;
      D[j] = ar;
      D[j + 1] = ag;
      D[j + 2] = ab;
      D[j + 3] = 255;
    }
    if (due()) yield;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ───────────────────────── desen tarifleri ─────────────────────────
/** Battal zemin: rastgele damlalar (sonradan taranacak), alanı doldurana dek. */
export function battal(ops: MOp[], w: number, h: number, rnd: () => number, cols: number[], n: number, r0: number, r1: number): void {
  for (let i = 0; i < n; i++) {
    ops.push({k: 'drop', x: rnd() * w, y: rnd() * h, r: r0 + rnd() * (r1 - r0), c: cols[i % cols.length]});
  }
}
/** Gelgit: aralıklı tarak bir yöne, sonra arasından ters yöne (ileri-geri dalga). */
export function gelgit(ops: MOp[], horizontal: boolean, s: number, a: number, l: number, off = 0): void {
  if (horizontal) {
    ops.push({k: 'tine', x: 0, y: off, dx: 1, dy: 0, a, l, s: s * 2});
    ops.push({k: 'tine', x: 0, y: off + s, dx: -1, dy: 0, a, l, s: s * 2});
  } else {
    ops.push({k: 'tine', x: off, y: 0, dx: 0, dy: 1, a, l, s: s * 2});
    ops.push({k: 'tine', x: off + s, y: 0, dx: 0, dy: -1, a, l, s: s * 2});
  }
}
/** Hatip/çiçek: aynı merkeze iç içe damlalar (halkalar). */
export function rings(ops: MOp[], x: number, y: number, rs: readonly number[], cs: readonly number[]): void {
  rs.forEach((r, i) => ops.push({k: 'drop', x, y, r, c: cs[i % cs.length]}));
}
/** Lale: iç içe halkalar + ortadan (aşağıdan yukarı) biz darbesi + iki yandan ince çekiş → lale kadehi. */
export function lale(ops: MOp[], x: number, y: number, R: number, cs: readonly number[], up = -1): void {
  rings(ops, x, y, [R, R * 0.78, R * 0.56, R * 0.34], cs);
  // ortadan çekiş: kalp → kadeh (yaprak ucu sivrilir)
  ops.push({k: 'tine', x, y, dx: 0, dy: up, a: R * 1.05, l: R * 0.18, t0: -R * 1.6, t1: R * 0.9, fall: R * 0.5});
  // iki yan yaprak: merkezden biraz yanda, daha kısa
  for (const sd of [-1, 1]) ops.push({k: 'tine', x: x + sd * R * 0.55, y, dx: 0, dy: up, a: R * 0.42, l: R * 0.12, t0: -R * 0.9, t1: R * 0.5, fall: R * 0.4});
}
