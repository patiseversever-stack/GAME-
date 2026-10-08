// Demo data for the render-props dev page (stand-in for src/sim/world/props.ts output on a flat studio ground).
import type { BalloonDef, FlightState, PropInstance, PropPrimitive } from '../src/sim/types.ts';
import type { TerrainSampler } from '../src/sim/terrain/types.ts';

export function flatSampler(h0: number): TerrainSampler {
  const hgt = (x: number, z: number): number => h0 + 0.0 * (x + z);
  return {
    height: hgt,
    baseHeight: hgt,
    normal: (_x: number, _z: number, out: Float64Array | number[]) => { out[0] = 0; out[1] = 1; out[2] = 0; },
    slopeDeg: () => 0,
    bounds: { minX: -4000, maxX: 4000, minZ: -4000, maxZ: 4000 },
  };
}

function rnd(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 6 chimney profile templates as (fraction of H, radius) control points + optional cap (rx, ry). */
const CHIMNEY_PROFILES: { pts: [number, number][]; cap: [number, number] | null; h: [number, number] }[] = [
  { pts: [[0, 4.6], [0.75, 1.7], [1, 1.15]], cap: [2.7, 1.4], h: [14, 22] },
  { pts: [[0, 3.2], [0.85, 1.2], [1, 0.9]], cap: [1.9, 1.1], h: [16, 26] },
  { pts: [[0, 5.2], [0.55, 3.8], [1, 1.9]], cap: [3.6, 1.8], h: [10, 16] },
  { pts: [[0, 7.5], [0.35, 4.6], [0.4, 3.4], [1, 1.3]], cap: null, h: [18, 30] },
  { pts: [[0, 5.0], [1, 0.7]], cap: null, h: [12, 20] },
  { pts: [[0, 10.5], [0.5, 6.0], [1, 2.6]], cap: null, h: [24, 38] },
];

let nextId = 1;

function chimney(x: number, z: number, y0: number, profile: number, scale: number, r: () => number): PropInstance[] {
  const P = CHIMNEY_PROFILES[profile];
  const H = (P.h[0] + (P.h[1] - P.h[0]) * r()) * scale;
  const prims: PropPrimitive[] = [];
  for (let i = 0; i < P.pts.length - 1; i++) {
    const [t0, r0] = P.pts[i];
    const [t1, r1] = P.pts[i + 1];
    prims.push({ kind: 'cone', base: [x, y0 + t0 * H, z], h: (t1 - t0) * H, r0: r0 * scale, r1: r1 * scale });
  }
  const id = nextId++;
  const out: PropInstance[] = [{ id, type: 'chimney', variant: profile, pos: [x, y0, z], yaw: r() * 6.28, scale, prims, params: { profile } }];
  if (P.cap) {
    const rx = P.cap[0] * scale, ry = P.cap[1] * scale;
    out.push({ id: nextId++, type: 'chimneyCap', variant: r() > 0.5 ? 1 : 0, pos: [x, y0 + H, z], yaw: 0, scale, prims: [{ kind: 'ellipsoid', c: [x, y0 + H + ry * 0.35, z], r: [rx, ry, rx * (0.85 + 0.3 * r())] }], params: { parent: id } });
  }
  return out;
}

export function demoChimneys(n: number, spread: number, sampler: TerrainSampler, seed = 7): PropInstance[] {
  const r = rnd(seed);
  const out: PropInstance[] = [];
  // hero chimney at the origin for close-ups
  out.push(...chimney(0, 0, sampler.height(0, 0), 0, 1.0, r));
  for (let i = 1; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = 14 + Math.sqrt(r()) * spread;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    out.push(...chimney(x, z, sampler.height(x, z), Math.floor(r() * 6), 0.7 + r() * 0.6, r));
  }
  return out;
}

export function demoBalloons(n: number, seed = 11): BalloonDef[] {
  const r = rnd(seed);
  const out: BalloonDef[] = [];
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number;
    if (n <= 12) {
      const row = Math.floor(i / 3), col = i % 3;
      x = (col - 1) * 34 + (r() - 0.5) * 8 + row * 6;
      z = -row * 38 + (r() - 0.5) * 8;
      y = 16 + r() * 22 + row * 6;
    } else {
      const a = r() * Math.PI * 2, d = 40 + Math.sqrt(r()) * 700;
      x = Math.cos(a) * d; z = Math.sin(a) * d; y = 40 + r() * 260;
    }
    out.push({
      id: i, p0: [x, y, z], drift: [0.6 + r() * 0.5, 0, 0.2 * (r() - 0.5)], amp: [2, 1.2, 2], omega: 0.05 + r() * 0.05,
      phase: r() * 6.28, rise: 0.15 * r(), pattern: i % 12, envelopeH: 18 + r() * 4, envelopeR: 7.4 + r() * 1.2,
    });
  }
  return out;
}

export function demoProps(item: string, sampler: TerrainSampler): PropInstance[] {
  nextId = 1;
  if (item === 'chimney') return demoChimneys(26, 120, sampler);
  if (item === 'balloon') return demoChimneys(10, 160, sampler, 3).filter((p) => Math.hypot(p.pos[0], p.pos[2]) > 60);
  if (item === 'all') return demoChimneys(300, 900, sampler, 5);
  return [];
}

export function demoFlightState(state: string, t: number): FlightState {
  const phase = state === 'jump' ? 'jump' : state === 'canopy' ? 'canopy' : state === 'landed' ? 'landed' : state === 'crash' ? 'crashed' : 'flying';
  const speed = phase === 'flying' ? 50 : phase === 'jump' ? 25 : phase === 'canopy' ? 10 : 0;
  const y = phase === 'landed' || phase === 'crashed' ? 0 : 12;
  return {
    tick: Math.round(t * 60), phase, pos: [0, y, 0], prevPos: [0, y, speed / 60], vel: [0, -speed * 0.3, -speed],
    speed, gamma: phase === 'flying' ? -0.3 : 0, psi: 0, phi: phase === 'flying' ? 0.35 : 0, cl: 0.7, heightAGL: y,
    prox: { d: 8, cls: 'rock', nearest: [3, y, 0], normal: [-1, 0, 0], mult: 2, propId: -1 },
    score: 0, combo: 1, comboTime: 0, timeSec: t, gateIndex: 0, gatesPassed: 0, gatesMissed: 0, inThermal: -1,
    inLandingZone: false, canopyOpen: phase === 'canopy', assist: 'full', energy: 0,
  };
}
