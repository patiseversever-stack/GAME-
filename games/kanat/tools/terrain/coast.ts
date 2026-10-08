// Sea handling for coastal worlds (Likya). Terrain Tiles store the sea as ~0 m with ±few m SRTM noise around the
// shoreline (no usable near-shore bathymetry here), which renders as a checkerboard coast. We rebuild it:
//  1. sea = connected low cells (h < 0.8 m) of a large component, small inland pits stay land;
//  2. smoothed signed distance to the shoreline (clean coastline);
//  3. plausible steep Lycian shelf: depth grows quickly off the cliffs, with fBm variation; deeper source data wins.

import { blur, fbm, type Grid } from './grid.ts';
import { distanceToBoundary } from './derive.ts';

export function rebuildSea(g: Grid, minArea: number): { seaCells: number } {
  const { res, spacing, data } = g;
  const n = res * res;
  const low = new Uint8Array(n);
  for (let i = 0; i < n; i++) low[i] = data[i] < 0.8 ? 1 : 0;
  // connected components (4-neighbour) of low cells; keep big ones as sea
  const comp = new Int32Array(n).fill(-1);
  const sea = new Uint8Array(n);
  const stack: number[] = [];
  let seaCells = 0;
  for (let s = 0; s < n; s++) {
    if (!low[s] || comp[s] >= 0) continue;
    const members: number[] = [];
    stack.push(s);
    comp[s] = s;
    while (stack.length) {
      const i = stack.pop() as number;
      members.push(i);
      const r = (i / res) | 0;
      const c = i - r * res;
      const nb = [c > 0 ? i - 1 : -1, c < res - 1 ? i + 1 : -1, r > 0 ? i - res : -1, r < res - 1 ? i + res : -1];
      for (const j of nb) {
        if (j >= 0 && low[j] && comp[j] < 0) {
          comp[j] = s;
          stack.push(j);
        }
      }
    }
    if (members.length >= minArea) {
      for (const i of members) sea[i] = 1;
      seaCells += members.length;
    }
  }
  // signed distance (+ land, - sea), smoothed to remove pixel stairs
  const d = distanceToBoundary(res, spacing, (i) => sea[i] === 0);
  const sd = new Float32Array(n);
  for (let i = 0; i < n; i++) sd[i] = sea[i] ? -d[i] : d[i];
  const sds = blur(sd, res, Math.max(1, Math.round(16 / spacing)), 2);
  for (let r = 0; r < res; r++) {
    const z = g.originZ + r * spacing;
    for (let c = 0; c < res; c++) {
      const x = g.originX + c * spacing;
      const i = r * res + c;
      const s = sds[i];
      if (s < 0) {
        const off = -s;
        const v = 1 + 0.35 * fbm(x / 700, z / 700, 611, 4);
        let depth = (55 * (1 - Math.exp(-off / 260)) + off * 0.035) * v + 0.4;
        depth = Math.min(depth, 380);
        const src = -data[i];
        data[i] = -Math.max(depth, src > 30 ? src : 0);
      } else if (data[i] < 0.5 + s * 0.04) {
        data[i] = 0.5 + Math.min(s * 0.04, 3);
      }
    }
  }
  return { seaCells };
}
