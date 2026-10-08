// Procedural starling silhouette for instancing (§3.8: 24–40 triangles; tier table §5.G 12/24/40/60).
// Local frame: +z forward (beak), +x right wing, +y up. Units: metres at real starling scale
// (wingspan ≈ 0.4 m); the shader applies the readability scale. Attribute `wingWeight`: 0 body → 1 wing tip.

import * as THREE from 'three';

export type BirdDetail = 0 | 1 | 2 | 3;

export function buildStarling(detail: BirdDetail): THREE.BufferGeometry {
  const pos: number[] = [];
  const ww: number[] = [];
  const tri = (a: number[], b: number[], c: number[]): void => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    ww.push(a[3], b[3], c[3]);
  };
  // body
  const N = [0, 0, 0.125, 0];
  const Ht = [0, 0.022, 0.072, 0];
  const B = [0, 0.026, 0.0, 0];
  const U = [0, -0.022, 0.012, 0];
  const Sl = [-0.027, 0.002, 0.03, 0];
  const Sr = [0.027, 0.002, 0.03, 0];
  const T0 = [0, 0.006, -0.068, 0];
  const TL = [-0.036, 0.002, -0.118, 0];
  const TR = [0.036, 0.002, -0.118, 0];
  const TC = [0, 0.003, -0.102, 0];
  if (detail === 0) {
    tri(N, Sr, B);
    tri(N, B, Sl);
    tri(B, Sr, T0);
    tri(B, T0, Sl);
    tri(N, Sl, U);
    tri(N, U, Sr);
  } else {
    tri(N, Sr, Ht);
    tri(N, Ht, Sl);
    tri(Ht, Sr, B);
    tri(Ht, B, Sl);
    tri(B, Sr, T0);
    tri(B, T0, Sl);
    tri(N, Sl, U);
    tri(N, U, Sr);
    tri(U, Sl, T0);
    tri(U, T0, Sr);
  }
  // tail (short, slightly notched)
  tri(T0, TR, TC);
  tri(T0, TC, TL);
  // wings: pointed triangular starling wing, `seg` spanwise strips
  const seg = detail === 0 ? 1 : detail === 1 ? 3 : detail === 2 ? 5 : 8;
  for (const s of [-1, 1]) {
    // leading / trailing edge polylines from shoulder (u = 0) to tip (u = 1)
    const lead = (u: number): number[] => [s * (0.022 + 0.178 * u), 0.008 - 0.006 * u + 0.01 * Math.sin(Math.PI * u), 0.036 - 0.03 * u - 0.035 * u * u, u];
    const trail = (u: number): number[] => {
      // starling trailing edge: straight-ish with a slight notch near the primaries
      const z = -0.034 - 0.02 * u + 0.02 * u * u + (u > 0.55 ? 0.006 * Math.sin((u - 0.55) * 18) : 0);
      return [s * (0.022 + 0.168 * u), 0.008 - 0.005 * u + 0.006 * Math.sin(Math.PI * u), z, u];
    };
    for (let k = 0; k < seg; k++) {
      const u0 = k / seg;
      const u1 = (k + 1) / seg;
      const a = lead(u0);
      const b = lead(u1);
      const c = trail(u0);
      const d = k === seg - 1 ? b : trail(u1);
      if (s > 0) {
        tri(a, b, c);
        if (k !== seg - 1) tri(c, b, d);
      } else {
        tri(a, c, b);
        if (k !== seg - 1) tri(c, d, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('wingWeight', new THREE.Float32BufferAttribute(ww, 1));
  return g;
}

/** Long-winged falcon silhouette for the hawk (dark, unmistakable; no harm imagery). */
export function buildHawk(): THREE.BufferGeometry {
  const pos: number[] = [];
  const ww: number[] = [];
  const tri = (a: number[], b: number[], c: number[]): void => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    ww.push(a[3], b[3], c[3]);
  };
  const N = [0, 0.01, 0.42, 0];
  const B = [0, 0.05, 0.05, 0];
  const Sl = [-0.08, 0, 0.12, 0];
  const Sr = [0.08, 0, 0.12, 0];
  const T0 = [0, 0.02, -0.25, 0];
  const TL = [-0.12, 0, -0.55, 0];
  const TR = [0.12, 0, -0.55, 0];
  tri(N, Sr, B);
  tri(N, B, Sl);
  tri(B, Sr, T0);
  tri(B, T0, Sl);
  tri(T0, TR, TL);
  for (const s of [-1, 1]) {
    const sh0 = [s * 0.07, 0.03, 0.14, 0];
    const sh1 = [s * 0.07, 0.03, -0.12, 0];
    const el0 = [s * 0.48, 0.07, 0.12, 0.5];
    const el1 = [s * 0.46, 0.06, -0.14, 0.5];
    const tip = [s * 1.05, 0.02, -0.28, 1];
    if (s > 0) {
      tri(sh0, el0, sh1);
      tri(sh1, el0, el1);
      tri(el0, tip, el1);
    } else {
      tri(sh0, sh1, el0);
      tri(sh1, el1, el0);
      tri(el0, el1, tip);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('wingWeight', new THREE.Float32BufferAttribute(ww, 1));
  return g;
}

export function triangleCount(g: THREE.BufferGeometry): number {
  return g.getAttribute('position').count / 3;
}
