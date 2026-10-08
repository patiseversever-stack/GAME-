// Procedural textures generated at load (no external images, no licences needed).
// Detail maps are tileable RGBA8: R,G = tangent-space normal xy (0.5 bias), B = height, A = cavity/AO (1 = open).
import { DataTexture, RGBAFormat, UnsignedByteType, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter, NoColorSpace } from 'three';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { mulberry32 };

/** Periodic 2D value noise lattice. */
class PNoise {
  private readonly v: Float32Array;
  private readonly px: number;
  private readonly py: number;
  constructor(px: number, py: number, rnd: () => number) {
    this.px = px; this.py = py;
    this.v = new Float32Array(px * py);
    for (let i = 0; i < this.v.length; i++) this.v[i] = rnd();
  }
  /** u,v in [0,1) → value in [0,1]. */
  at(u: number, v: number): number {
    const x = u * this.px, y = v * this.py;
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % this.px) + this.px) % this.px, y0 = ((iy % this.py) + this.py) % this.py;
    const x1 = (x0 + 1) % this.px, y1 = (y0 + 1) % this.py;
    const a = this.v[y0 * this.px + x0], b = this.v[y0 * this.px + x1];
    const c = this.v[y1 * this.px + x0], d = this.v[y1 * this.px + x1];
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  }
}

export type DetailKind = 'tuff' | 'stone' | 'snow' | 'wood' | 'bark';

/**
 * Tileable detail map. `tuff`: vertical erosion rills + soft layers + pores. `stone`: blocky fractured limestone.
 * `snow`: wind-sculpted sastrugi. `wood`: plank grain (u along grain). `bark`: vertical furrows.
 */
export function makeDetailTexture(kind: DetailKind, size = 256, seed = 7): DataTexture {
  const rnd = mulberry32(seed * 7919 + kind.length * 31);
  const n4 = new PNoise(4, 4, rnd), n8 = new PNoise(8, 8, rnd), n16 = new PNoise(16, 16, rnd), n32 = new PNoise(32, 32, rnd), n64 = new PNoise(64, 64, rnd);
  const rill = new PNoise(24, 3, rnd), rill2 = new PNoise(48, 6, rnd);
  const layer = new PNoise(2, 12, rnd);
  const grainA = new PNoise(4, 64, rnd), grainB = new PNoise(8, 128, rnd);
  const cellN = new PNoise(6, 6, rnd);
  const h = new Float32Array(size * size);
  const lo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let val = 0;
      let low = 0;
      if (kind === 'tuff') {
        // soft powdery tuff: broad undulation, straight vertical rain rills, faint horizontal ledges, pores
        const base = 0.42 * n4.at(u, v) + 0.24 * n8.at(u, v) + 0.12 * n16.at(u, v) + 0.06 * n32.at(u, v);
        const r = 1 - Math.abs(rill.at(u + 0.02 * n8.at(u, v), v) * 2 - 1);
        const r2 = 1 - Math.abs(rill2.at(u + 0.015 * n16.at(u, v), v) * 2 - 1);
        const lv = v * 10 + 0.35 * n4.at(u, v);
        const ledge = Math.pow(lv - Math.floor(lv), 3.0);
        const pore = Math.max(0, n64.at(u, v) - 0.72) * 2.2;
        val = base - 0.24 * Math.pow(r, 2.5) - 0.1 * Math.pow(r2, 3) + 0.08 * ledge - 0.12 * pore + 0.04 * n64.at(u, v);
        low = 0.42 * n4.at(u, v) + 0.24 * n8.at(u, v);
      } else if (kind === 'stone') {
        const c = cellN.at(u, v);
        const crack = Math.abs(n16.at(u, v) - 0.5) < 0.03 ? -0.35 : 0;
        const blocky = Math.round(c * 4) / 4;
        val = 0.35 * blocky + 0.3 * n8.at(u, v) + 0.18 * n32.at(u, v) + 0.1 * n64.at(u, v) + crack;
        low = 0.35 * blocky + 0.3 * n8.at(u, v);
      } else if (kind === 'snow') {
        const s = Math.sin((u * 6 + 0.8 * n4.at(u, v) + 0.3 * n8.at(u, v)) * Math.PI * 2) * 0.5 + 0.5;
        val = 0.5 * Math.pow(s, 2.5) + 0.3 * n16.at(u, v) + 0.12 * n64.at(u, v);
        low = 0.5 * Math.pow(s, 2.5);
      } else if (kind === 'wood') {
        const g = grainA.at(u, v) * 0.6 + grainB.at(u, v) * 0.4;
        const plank = (Math.floor(u * 8) % 2) * 0.05;
        const seam = Math.abs(((u * 8) % 1) - 0.5) > 0.47 ? -0.5 : 0;
        val = 0.5 * g + plank + seam + 0.1 * n32.at(u, v);
        low = 0.5 * g;
      } else {
        const f = 1 - Math.abs(rill.at(u + 0.15 * n4.at(u, v), v) * 2 - 1);
        const f2 = 1 - Math.abs(rill2.at(u + 0.1 * n8.at(u, v), v) * 2 - 1);
        val = 0.6 - 0.45 * Math.pow(f, 3) - 0.2 * Math.pow(f2, 4) + 0.12 * n32.at(u, v);
        low = 0.6 - 0.2 * Math.pow(f, 2);
      }
      h[y * size + x] = val;
      lo[y * size + x] = low;
    }
  }
  // normalise height
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < h.length; i++) { mn = Math.min(mn, h[i]); mx = Math.max(mx, h[i]); }
  const sc = 1 / Math.max(1e-6, mx - mn);
  const out = new Uint8Array(size * size * 4);
  const strength = kind === 'snow' ? 2.0 : kind === 'wood' ? 2.5 : kind === 'tuff' ? 3.0 : 4.0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const hx0 = h[y * size + ((x - 1 + size) % size)], hx1 = h[y * size + ((x + 1) % size)];
      const hy0 = h[((y - 1 + size) % size) * size + x], hy1 = h[((y + 1) % size) * size + x];
      let nx = (hx0 - hx1) * sc * strength, ny = (hy0 - hy1) * sc * strength;
      const nz = 1;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= l; ny /= l;
      const hh = (h[i] - mn) * sc;
      // cavity: height relative to the low-pass version
      const cav = Math.max(0, Math.min(1, 0.75 + (h[i] - lo[i]) * sc * 1.6));
      out[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i * 4 + 2] = Math.round(hh * 255);
      out[i * 4 + 3] = Math.round(cav * 255);
    }
  }
  const tex = new DataTexture(out, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map<string, DataTexture>();
export function detailTexture(kind: DetailKind): DataTexture {
  let t = cache.get(kind);
  if (!t) { t = makeDetailTexture(kind); cache.set(kind, t); }
  return t;
}

export function disposeDetailTextures(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
