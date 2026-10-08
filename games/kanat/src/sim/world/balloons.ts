// Hot-air balloons (brief §4.G.4, §2.5 Balon İlmeği). Deterministic placement + motion as a pure function
// of sim time, so the sim (collision, threading) and the renderer agree exactly.
//
// Motion (balloonPos), t = sim seconds since the jump (render may use negative t during the route intro):
//   x = p0x + drift.x·t + amp.x·sin(ω·t + φ)
//   y = p0y + (drift.y + rise)·t + amp.y·sin(0.73·ω·t + φ + 1.1)
//   z = p0z + drift.z·t + amp.z·sin(1.17·ω·t + φ + 2.3)
// (detMath.sin → bit-identical on every engine.) The returned point is the ENVELOPE CENTER.
// Collision: envelope ellipsoid radii (envelopeR, envelopeH/2, envelopeR) at the center + basket box
// (half extents TUNING.balloon.basketHalf) centered envelopeH/2 + basketBelow below the center.

import { TUNING } from '../data/tuning.ts';
import { cos, DEG, sin } from '../math/detMath.ts';
import { Rng, STREAM } from '../math/rng.ts';
import type { TerrainSampler } from '../terrain/types.ts';
import type { BalloonDef, WorldId } from '../types.ts';

export function balloonPos(def: BalloonDef, tSec: number, out: Float64Array | number[]): void {
  const w = def.omega * tSec + def.phase;
  out[0] = def.p0[0] + def.drift[0] * tSec + def.amp[0] * sin(w);
  out[1] = def.p0[1] + (def.drift[1] + def.rise) * tSec + def.amp[1] * sin(0.73 * def.omega * tSec + def.phase + 1.1);
  out[2] = def.p0[2] + def.drift[2] * tSec + def.amp[2] * sin(1.17 * def.omega * tSec + def.phase + 2.3);
}

/** Basket center for a given envelope center. */
export function basketCenter(def: BalloonDef, envCenter: ArrayLike<number>, out: Float64Array | number[]): void {
  out[0] = envCenter[0];
  out[1] = envCenter[1] - def.envelopeH * 0.5 - TUNING.balloon.basketBelow;
  out[2] = envCenter[2];
}

export interface BalloonOptions {
  /** Override the per-world default count (kapadokya 40, pamukkale 12, others 0). */
  count?: number;
  /** Route line / gate points; clusters are placed beside these when given (Kapadokya "near routes"). */
  anchors?: ReadonlyArray<readonly [number, number, number]>;
  /** No balloon closer than r (horizontal) to these points (e.g. the route's start basket, landing targets). */
  avoid?: ReadonlyArray<{ x: number; z: number; r: number }>;
  /** World wind (meteorological "from" direction). Balloons drift downwind. */
  wind?: { dirDeg: number; speed: number };
}

const DEFAULT_COUNT: Record<WorldId, number> = { kapadokya: 40, likya: 0, karadeniz: 0, erciyes: 0, pamukkale: 12 };
const DEFAULT_WIND: Record<WorldId, { dirDeg: number; speed: number }> = {
  kapadokya: { dirDeg: 250, speed: 4 },
  likya: { dirDeg: 290, speed: 6 },
  karadeniz: { dirDeg: 300, speed: 3 },
  erciyes: { dirDeg: 300, speed: 7 },
  pamukkale: { dirDeg: 260, speed: 3 },
};

/**
 * Deterministic balloon set for a world. Balloons come in clusters of 2–4 whose centers are 24–29 m apart
 * (so threadable pairs ≤ 35 m exist, §2.5) and share drift + oscillation phase (pairs stay threadable).
 */
export function balloonsFor(worldId: WorldId, sampler: TerrainSampler, seed: number, opts: BalloonOptions = {}): BalloonDef[] {
  const count = opts.count ?? DEFAULT_COUNT[worldId];
  const out: BalloonDef[] = [];
  if (count <= 0) return out;
  const rng = new Rng(seed, STREAM.balloons);
  const wind = opts.wind ?? DEFAULT_WIND[worldId];
  // Drift toward (from + 180°): heading convention 0 = north (−z), clockwise toward +x.
  const toRad = (wind.dirDeg + 180) * DEG;
  const b = sampler.bounds;
  const cx = 0.5 * (b.minX + b.maxX);
  const cz = 0.5 * (b.minZ + b.maxZ);
  const spread = Math.min(2600, 0.4 * Math.min(b.maxX - b.minX, b.maxZ - b.minZ));
  const anchors = opts.anchors ?? [];
  const avoid = opts.avoid ?? [];
  let id = 0;
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    // Cluster center
    let x: number;
    let z: number;
    let baseY: number;
    if (anchors.length > 0) {
      const a = anchors[rng.int(anchors.length)];
      const ang = rng.range(0, 6.283185307179586);
      const off = rng.range(25, 110);
      x = a[0] + off * cos(ang);
      z = a[2] + off * sin(ang);
      baseY = a[1] + rng.range(-35, 35);
    } else {
      const ang = rng.range(0, 6.283185307179586);
      const r = spread * Math.sqrt(rng.next());
      x = cx + r * cos(ang);
      z = cz + r * sin(ang);
      baseY = sampler.height(x, z) + rng.range(90, 320);
    }
    if (x < b.minX + 200 || x > b.maxX - 200 || z < b.minZ + 200 || z > b.maxZ - 200) continue;
    let blocked = false;
    for (let i = 0; i < avoid.length; i++) {
      const dx = x - avoid[i].x;
      const dz = z - avoid[i].z;
      if (dx * dx + dz * dz < (avoid[i].r + 40) * (avoid[i].r + 40)) blocked = true;
    }
    if (blocked) continue;
    const n = Math.min(count - out.length, 2 + rng.int(3));
    const driftSpeed = rng.range(0.5, 1.3);
    const dirJ = toRad + rng.range(-0.35, 0.35);
    const drift: [number, number, number] = [driftSpeed * sin(dirJ), 0, -driftSpeed * cos(dirJ)];
    const omega = rng.range(0.08, 0.15);
    const phase = rng.range(0, 6.283185307179586);
    const rise = rng.range(0, 0.25);
    const lineAng = rng.range(0, 6.283185307179586);
    const tri = n >= 3 && rng.chance(0.5);
    let lx = x;
    let lz = z;
    for (let k = 0; k < n; k++) {
      const spacing = rng.range(24, 29);
      let mx: number;
      let mz: number;
      if (tri && k > 0) {
        // members 1..3 on a ring around the first one, 60° / 180° apart → neighbours ≤ 29 m
        const a = lineAng + (k - 1) * 1.0471975511965976 + (k > 2 ? 2.0943951023931953 : 0);
        mx = x + spacing * cos(a);
        mz = z + spacing * sin(a);
      } else {
        mx = k === 0 ? x : lx + spacing * cos(lineAng);
        mz = k === 0 ? z : lz + spacing * sin(lineAng);
      }
      lx = mx;
      lz = mz;
      const ground = sampler.height(mx, mz);
      const minY = ground + 70;
      let y = baseY + rng.range(-4, 4);
      if (y < minY) y = minY + rng.range(0, 6);
      const envelopeH = rng.range(18, 22);
      out.push({
        id: id++,
        p0: [mx, y, mz],
        drift: [drift[0], drift[1], drift[2]],
        amp: [rng.range(1.2, 2.2), rng.range(0.8, 1.6), rng.range(1.2, 2.2)],
        omega,
        phase: phase + rng.range(-0.3, 0.3),
        rise,
        pattern: rng.int(12),
        envelopeH,
        envelopeR: envelopeH * rng.range(0.38, 0.42),
      });
      if (out.length >= count) break;
    }
  }
  return out;
}
