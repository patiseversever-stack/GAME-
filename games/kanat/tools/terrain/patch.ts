// Pamukkale travertine terrace patch (brief §4.G.1): 1 m height grid over the terrace area.
// h' = h + terrace(h): soft staircase with 1.2–3 m steps, noisy curved lips, flat floors that hold pools.
// Outside the terrace rect the patch equals the core bilinear surface exactly (seamless edge).

import { clamp01, fbm, type Grid, makeGrid, sampleBicubic, sampleBilinear, smoothstep, vnoise } from './grid.ts';

export interface PatchResult {
  patch: Grid;
  /** Pool water surface heights (2 m grid). Where water <= terrain there is no water. */
  water: Grid;
  terraceRect: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/** Soft rounded-rect weight (1 inside, 0 outside, `soft` m falloff). */
function rectW(x: number, z: number, cx: number, cz: number, hx: number, hz: number, soft: number): number {
  const dx = Math.abs(x - cx) - (hx - soft);
  const dz = Math.abs(z - cz) - (hz - soft);
  const d = Math.max(dx, dz);
  return clamp01(1 - d / soft);
}

export function bakePatch(core: Grid, cx: number, cz: number, res: number, widthM: number, depthM: number): PatchResult {
  // Square patch grid (HeightGrid contract is square): res samples @ 1 m centred on (cx, cz).
  const spacing = 1;
  const ox = Math.round(cx - ((res - 1) * spacing) / 2);
  const oz = Math.round(cz - ((res - 1) * spacing) / 2);
  const patch = makeGrid(res, spacing, ox, oz);
  const water = makeGrid(res / 2, spacing * 2, ox, oz);
  // Terrace rect: depthM along x (E-W, down the west-facing slope) × widthM along z (N-S along the escarpment).
  const hx = depthM / 2;
  const hz = widthM / 2 - 8;
  const rect = { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
  const lipH = 0.45;
  const poolLevel = lipH * 0.75;
  const wl = new Float32Array(res * res).fill(-1e9);
  const ref = Math.floor(sampleBilinear(core, cx, cz));
  for (let r = 0; r < res; r++) {
    const z = oz + r * spacing;
    for (let c = 0; c < res; c++) {
      const x = ox + c * spacing;
      const base = sampleBilinear(core, x, z);
      const smooth = sampleBicubic(core, x, z);
      // zone weight: rect with noisy, organic outline
      const edgeN = 40 * fbm(x / 160, z / 160, 401, 3);
      let w = rectW(x + edgeN * 0.6, z + edgeN, cx, cz, hx, hz, 70);
      w *= smoothstep(0.0, 0.25, 0.55 + 0.6 * fbm(x / 260, z / 260, 402, 3));
      let h = smooth;
      if (w > 0) {
        // Constant step height keeps every floor exactly flat; noise only moves where the risers/lips sit.
        const stepH = 1.8;
        const lipN = 1.1 * vnoise(x / 9, z / 9, 404) + 0.5 * vnoise(x / 3.5, z / 3.5, 405) + 0.8 * vnoise(x / 60, z / 60, 403);
        const u = (smooth - ref) / stepH + lipN * 0.45;
        const k = Math.floor(u);
        const fr = u - k;
        // riser occupies the top 16% of each band; raised lip on the floor's downhill edge
        const riser = smoothstep(0.84, 1.0, fr);
        const lip = lipH * (1 - smoothstep(0.0, 0.08, fr));
        const terraced = ref + stepH * (k + riser) + lip + 0.03 * vnoise(x / 1.7, z / 1.7, 406);
        h = smooth + (terraced - smooth) * w;
        // pools: only on part of the floors (outer half near the lip) and in noise-selected basins
        const basin = vnoise(x / 70, z / 70, 407) + 0.35 * vnoise(x / 23, z / 23, 408);
        if (w > 0.6 && fr > 0.09 && fr < 0.5 && basin > -0.1) wl[r * res + c] = ref + stepH * k + poolLevel;
      }
      // exact bilinear core at the patch border, smooth + terraces inside
      const edge = Math.min(c, r, res - 1 - c, res - 1 - r) * spacing;
      const be = smoothstep(4, 40, edge);
      patch.data[r * res + c] = base + (h - base) * be;
    }
  }
  // water grid (2 m): min of the 2x2 pool levels; no-pool → 1 m below terrain
  const wr = water.res;
  for (let r = 0; r < wr; r++) {
    for (let c = 0; c < wr; c++) {
      const i = 2 * r * res + 2 * c;
      const lv = Math.max(wl[i], wl[i + 1], wl[i + res], wl[i + res + 1]);
      const t = patch.data[i];
      water.data[r * wr + c] = lv > t ? lv : t - 1;
    }
  }
  return { patch, water, terraceRect: rect };
}
