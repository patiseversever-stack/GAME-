// Small CPU mesh kit used by the misc props generator (world-space merged geometry with per-vertex material data).
import { Vector3 } from 'three';

/** Material kinds understood by the misc shader (aMat.z). */
export const MK = { plain: 0, stone: 1, wood: 2, metal: 3, snow: 4, glass: 5, tuff: 6, water: 7 } as const;

export interface MatSpec { color: [number, number, number]; rough: number; metal: number; kind: number; ao?: number }

export class MeshAcc {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  mat: number[] = [];
  ctr: number[] = [];
  idx: number[] = [];
  /** Current prop centre + rocking amplitude (written per vertex). */
  cx = 0; cy = 0; cz = 0; rock = 0;

  get vertexCount(): number { return this.pos.length / 3; }

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, m: MatSpec, ao = 1): number {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.col.push(m.color[0], m.color[1], m.color[2]);
    this.mat.push(m.rough, m.metal, m.kind, (m.ao ?? 1) * ao);
    this.ctr.push(this.cx, this.cy, this.cz, this.rock);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number): void { this.idx.push(a, b, c); }
  quad(a: number, b: number, c: number, d: number): void { this.idx.push(a, b, c, a, c, d); }
}

/** Local frame: origin + yaw → world transform helper. */
export class Frame {
  ox: number; oy: number; oz: number; c: number; s: number;
  constructor(ox: number, oy: number, oz: number, yaw: number) {
    this.ox = ox; this.oy = oy; this.oz = oz; this.c = Math.cos(yaw); this.s = Math.sin(yaw);
  }
  /** Same convention as GLSL kRotY: x' = c·x + s·z, z' = −s·x + c·z. */
  px(x: number, z: number): number { return this.ox + this.c * x + this.s * z; }
  pz(x: number, z: number): number { return this.oz - this.s * x + this.c * z; }
  nx(x: number, z: number): number { return this.c * x + this.s * z; }
  nz(x: number, z: number): number { return -this.s * x + this.c * z; }
}

/** Axis-aligned (in frame) box from (x0,y0,z0) to (x1,y1,z1). `skip` bit mask: 1 −x, 2 +x, 4 −y, 8 +y, 16 −z, 32 +z. */
export function box(acc: MeshAcc, f: Frame, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: MatSpec, skip = 0, aoBottom = 1): void {
  const faces: [number, number[], number[][]][] = [
    [1, [-1, 0, 0], [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]]],
    [2, [1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]],
    [4, [0, -1, 0], [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]]],
    [8, [0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
    [16, [0, 0, -1], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]],
    [32, [0, 0, 1], [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]]],
  ];
  for (const [bit, n, vs] of faces) {
    if (skip & bit) continue;
    const ids = vs.map(([x, y, z]) => acc.vert(f.px(x, z), f.oy + y, f.pz(x, z), f.nx(n[0], n[2]), n[1], f.nz(n[0], n[2]), m, y <= y0 + 1e-6 ? aoBottom : 1));
    acc.quad(ids[0], ids[3], ids[2], ids[1]);
  }
}

/** Vertical lathe in frame: radius profile r(t) over y ∈ [y0, y1]. */
export function lathe(acc: MeshAcc, f: Frame, x: number, z: number, y0: number, y1: number, rings: number, segs: number, r: (t: number, a: number) => number, m: MatSpec, capTop = true): void {
  const base = acc.vertexCount;
  const eps = 1e-3;
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = y0 + (y1 - y0) * t;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rr = r(t, a);
      const dr = (r(Math.min(1, t + eps), a) - r(Math.max(0, t - eps), a)) / ((Math.min(1, t + eps) - Math.max(0, t - eps)) * (y1 - y0));
      const ca = Math.cos(a), sa = Math.sin(a);
      const nl = Math.hypot(1, dr);
      const lx = x + ca * rr, lz = z + sa * rr;
      acc.vert(f.px(lx, lz), f.oy + y, f.pz(lx, lz), f.nx(ca / nl, sa / nl), -dr / nl, f.nz(ca / nl, sa / nl), m, k === 0 ? 0.7 : 1);
    }
  }
  const row = segs + 1;
  for (let k = 0; k < rings; k++) for (let i = 0; i < segs; i++) {
    const a = base + k * row + i;
    acc.quad(a, a + row, a + row + 1, a + 1);
  }
  if (capTop) {
    const c = acc.vert(f.px(x, z), f.oy + y1, f.pz(x, z), 0, 1, 0, m);
    const top = base + rings * row;
    const ids: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rr = r(1, a);
      const lx = x + Math.cos(a) * rr, lz = z + Math.sin(a) * rr;
      ids.push(acc.vert(f.px(lx, lz), f.oy + y1, f.pz(lx, lz), 0, 1, 0, m));
    }
    for (let i = 0; i < segs; i++) acc.tri(c, ids[i + 1], ids[i]);
    void top;
  }
}

/** Generic oriented tube between two world points (ropes, masts, rails). */
export function tube(acc: MeshAcc, p0: Vector3, p1: Vector3, r0: number, r1: number, sides: number, m: MatSpec): void {
  const d = p1.clone().sub(p0);
  const len = d.length() || 1;
  d.divideScalar(len);
  const up = Math.abs(d.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const u = new Vector3().crossVectors(d, up).normalize();
  const v = new Vector3().crossVectors(u, d).normalize();
  const base = acc.vertexCount;
  for (let e = 0; e < 2; e++) {
    const p = e === 0 ? p0 : p1;
    const r = e === 0 ? r0 : r1;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const nx = u.x * Math.cos(a) + v.x * Math.sin(a), ny = u.y * Math.cos(a) + v.y * Math.sin(a), nz = u.z * Math.cos(a) + v.z * Math.sin(a);
      acc.vert(p.x + nx * r, p.y + ny * r, p.z + nz * r, nx, ny, nz, m);
    }
  }
  for (let i = 0; i < sides; i++) {
    const i1 = (i + 1) % sides;
    acc.quad(base + i, base + sides + i, base + sides + i1, base + i1);
  }
}

/** Value noise (deterministic, JS) for CPU displacement. */
function h3(x: number, y: number, z: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  return l(
    l(l(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), l(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx), fy),
    l(l(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), l(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx), fy),
    fz,
  );
}

/** Rock displacement (metres), |d| ≤ amp. */
export function rockDisp(x: number, y: number, z: number, amp: number, seed: number): number {
  const n = noise3(x * 0.22 + seed, y * 0.22, z * 0.22) * 0.6 + noise3(x * 0.6, y * 0.6 + seed, z * 0.6) * 0.3 + noise3(x * 1.7, y * 1.7, z * 1.7 + seed) * 0.1;
  return (n - 0.5) * 2 * amp;
}

/** Icosphere (unit) vertices + faces, subdivided `detail` times. */
export function icosphere(detail: number): { v: number[][]; f: number[][] } {
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map((p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; });
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let d = 0; d < detail; d++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number): number => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = cache.get(k);
      if (hit !== undefined) return hit;
      const p = [(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2];
      const l = Math.hypot(p[0], p[1], p[2]);
      v.push([p[0] / l, p[1] / l, p[2] / l]);
      cache.set(k, v.length - 1);
      return v.length - 1;
    };
    const nf: number[][] = [];
    for (const [a, b, c] of f) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    f = nf;
    v = v.slice();
  }
  return { v, f };
}
