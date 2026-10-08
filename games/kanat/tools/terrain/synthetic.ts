// --synthetic fallback height source (fBm + ridged noise), same grid API as the terrarium sampler.
// Development only (brief §4.G.1 item 6): the shipped worlds must use real data.

import { fbm, ridged } from './grid.ts';
import type { WorldDef } from './worldDefs.ts';

interface SynthProfile {
  base: number;
  amp: number;
  ridge: number;
  canyon: number;
  scale: number;
  seaSlope: number;
}

const PROFILES: Record<string, SynthProfile> = {
  kapadokya: { base: 1150, amp: 160, ridge: 90, canyon: 110, scale: 2600, seaSlope: 0 },
  likya: { base: 250, amp: 420, ridge: 380, canyon: 120, scale: 2200, seaSlope: 1 },
  karadeniz: { base: 1700, amp: 700, ridge: 900, canyon: 300, scale: 3000, seaSlope: 0 },
  erciyes: { base: 2200, amp: 500, ridge: 500, canyon: 120, scale: 3500, seaSlope: 0 },
  pamukkale: { base: 420, amp: 180, ridge: 220, canyon: 40, scale: 3000, seaSlope: 0 },
};

export function syntheticHeight(def: WorldDef, x: number, z: number): number {
  const p = PROFILES[def.id];
  const s = p.scale;
  let h = p.base + p.amp * fbm(x / s, z / s, 101, 6);
  h += p.ridge * (ridged(x / (s * 0.8), z / (s * 0.8), 202, 6) - 0.35);
  // canyons: carve along low |noise| lines
  const c = Math.abs(fbm(x / (s * 0.7), z / (s * 0.7), 303, 4));
  h -= p.canyon * Math.max(0, 1 - c * 9) ** 2;
  if (def.id === 'erciyes') {
    const r = Math.sqrt(x * x + z * z);
    h += 1700 * Math.exp(-((r / 3200) ** 1.6));
  }
  if (p.seaSlope) h += (-z - 1500) * 0.12; // coastline south of center
  return h;
}

export function sampleSyntheticGrid(def: WorldDef, res: number, spacing: number, originX: number, originZ: number): Float32Array {
  const out = new Float32Array(res * res);
  for (let r = 0; r < res; r++) {
    const z = originZ + r * spacing;
    for (let c = 0; c < res; c++) out[r * res + c] = syntheticHeight(def, originX + c * spacing, z);
  }
  return out;
}
