// Demo data for the render-props dev page. Uses the SAME params/prims formats as src/sim/world/props.ts
// (see its header) on a flat studio ground, so the dev page exercises the real render path.
import type { BalloonDef, FlightState, PropInstance, PropPrimitive, PropType } from '../src/sim/types.ts';
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

let nextId = 0;
const out: PropInstance[] = [];
function add(type: PropType, variant: number, x: number, y: number, z: number, yaw: number, prims: PropPrimitive[], params: Record<string, number>): void {
  out.push({ id: nextId++, type, variant, pos: [x, y, z], yaw, scale: 1, prims, params });
}
/** three.js rotation.y convention: local (lx, lz) → world offset. */
function rot(lx: number, lz: number, yaw: number): [number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [c * lx + s * lz, -s * lx + c * lz];
}
function boxPrim(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw: number, round: number): PropPrimitive {
  return { kind: 'box', c: [cx, cy, cz], h: [hx, hy, hz], yaw, round };
}

function chimney(x: number, z: number, y0: number, variant: number, r: () => number): void {
  const H = (10 + r() * 16) * (variant === 1 || variant === 5 ? 1.25 : 1);
  let r0 = 3 + r() * 2.5, h0 = H * 0.55, r1 = r0 * 0.55, r2 = r0 * 0.35;
  let capR = r2 + 0.8 + r() * 0.8, capH = 0.9 + r() * 0.7;
  switch (variant) {
    case 1: r0 *= 0.8; r1 = r0 * 0.42; r2 = r0 * 0.2; capR = r2 + 0.5; capH = 0.8; break;
    case 2: h0 = H * 0.5; r1 = r0 * 0.5; r2 = r0 * 0.28; capR = r0 * (0.75 + r() * 0.2); capH = 1.4 + r() * 0.8; break;
    case 3: r1 = r0 * 0.68; r2 = r0 * 0.42; capR = 0; capH = 0; break;
    case 4: h0 = H * 0.4; r1 = r0 * 0.72; r2 = r0 * 0.45; break;
    case 5: r0 *= 0.85; r1 = r0 * 0.78; r2 = r0 * 0.62; capR = r2 + 0.6; capH = 1.0; break;
    default: break;
  }
  const h1 = H - h0, sink = 1.5, y = y0 - sink, H0 = h0 + sink, capY = H + sink + capH * 0.55;
  const prims: PropPrimitive[] = [{ kind: 'cone', base: [x, y, z], h: H0, r0, r1 }, { kind: 'cone', base: [x, y + H0, z], h: h1, r0: r1, r1: r2 }];
  if (capR > 0) prims.push({ kind: 'ellipsoid', c: [x, y + capY, z], r: [capR, capH, capR] });
  add('chimney', variant, x, y, z, r() * 6.283, prims, { h0: H0, h1, r0, r1, r2, capR, capH, capY, sink, seed: Math.floor(r() * 65535) });
}

const SPECIES_SIZE = [
  (r: () => number) => ({ ht: 14 + r() * 8, trunkR: 0.22 + r() * 0.1, crownBase: 2 + r() * 1.2, crownR0: 1.4 + r() * 0.6, crownR1: 0.35 }),
  (r: () => number) => { const ht = 10 + r() * 6; return { ht, trunkR: 0.22 + r() * 0.1, crownBase: ht * (0.42 + r() * 0.08), crownR0: 2.4 + r(), crownR1: 1 + r() * 0.5 }; },
  (r: () => number) => ({ ht: 15 + r() * 13, trunkR: 0.28 + r() * 0.12, crownBase: 1.2 + r(), crownR0: 2.2 + r(), crownR1: 0.2 }),
  (r: () => number) => ({ ht: 3 + r() * 3, trunkR: 0.15 + r() * 0.07, crownBase: 0.4 + r() * 0.4, crownR0: 1.4 + r(), crownR1: 0.5 + r() * 0.3 }),
];

function tree(species: number, x: number, z: number, y0: number, r: () => number): void {
  const s = SPECIES_SIZE[species](r);
  const crownH = s.ht - s.crownBase;
  const pr = { trunkH: s.crownBase + 0.35 * crownH, trunkR: s.trunkR, crownBase: s.crownBase, crownH, crownR0: s.crownR0, crownR1: s.crownR1, seed: Math.floor(r() * 65535) };
  const y = y0 - 0.1;
  add('tree', species, x, y, z, r() * 6.283, [
    { kind: 'capsule', a: [x, y - 0.5, z], b: [x, y + pr.trunkH, z], r: pr.trunkR },
    { kind: 'cone', base: [x, y + pr.crownBase, z], h: crownH, r0: pr.crownR0, r1: pr.crownR1 },
  ], pr);
}

function house(x: number, z: number, y: number, yaw: number, v: number, r: () => number): void {
  const bw = 6 + r() * 3, bd = 7 + r() * 3, bh = 4.2 + r() * 2.2, rh = 2 + r() * 1.2;
  const ew = bw * 0.5 + 0.4, ed = bd * 0.5 + 0.4;
  const prims: PropPrimitive[] = [boxPrim(x, y + bh * 0.5 - 0.5, z, bw * 0.5, bh * 0.5 + 0.5, bd * 0.5, yaw, 0.15)];
  for (let k = 0; k < 3; k++) prims.push(boxPrim(x, y + bh + (rh * (2 * k + 1)) / 6, z, (ew * (5 - 2 * k)) / 6, rh / 6, ed, yaw, 0.05));
  add('house', v, x, y, z, yaw, prims, { bw, bd, bh, rh });
}

function gulet(x: number, z: number, yaw: number, v: number, r: () => number): void {
  const len = 22 + r() * 8, beam = len * 0.22, free = 1.6 + r() * 0.6, mastH = 16 + r() * 6, masts = r() < 0.6 ? 2 : 1;
  const prims: PropPrimitive[] = [boxPrim(x, free * 0.5 - 0.5, z, beam * 0.5, free * 0.5 + 0.5, len * 0.5, yaw, 0.8)];
  for (let m = 0; m < masts; m++) {
    const lz = masts === 1 ? 0.05 * len : (m === 0 ? 0.18 : -0.18) * len;
    const [ox, oz] = rot(0, lz, yaw);
    prims.push({ kind: 'capsule', a: [x + ox, free, z + oz], b: [x + ox, free + mastH, z + oz], r: 0.25 });
  }
  add('gulet', v, x, 0, z, yaw, prims, { len, beam, free, mastH, masts });
}

export function demoProps(item: string, sampler: TerrainSampler): PropInstance[] {
  nextId = 0;
  out.length = 0;
  const r = rnd(item.length * 7 + 3);
  const g = (x: number, z: number): number => sampler.height(x, z);
  if (item === 'chimney' || item === 'balloon' || item === 'all' || item === 'pilot' || item === 'vfx') {
    const n = item === 'chimney' ? 30 : item === 'all' ? 400 : 14;
    const spread = item === 'all' ? 900 : item === 'chimney' ? 130 : 220;
    if (item === 'chimney') chimney(0, 0, g(0, 0), 0, r);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = (item === 'chimney' ? 16 : 70) + Math.sqrt(r()) * spread;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      chimney(x, z, g(x, z), Math.floor(r() * 6), r);
    }
    const nt = item === 'all' ? 600 : item === 'chimney' ? 30 : 0;
    for (let i = 0; i < nt; i++) { const a = r() * 6.283, d = 30 + Math.sqrt(r()) * spread; const x = Math.cos(a) * d, z = Math.sin(a) * d; tree(0, x, z, g(x, z), r); }
  }
  if (item === 'tree') {
    for (let s = 0; s < 4; s++) for (let k = 0; k < 3; k++) tree(s, (s - 1.5) * 13, -k * 16 + (k % 2) * 3, 0, r);
    for (let i = 0; i < 400; i++) { const a = r() * 6.283, d = 70 + Math.sqrt(r()) * 600; const x = Math.cos(a) * d, z = Math.sin(a) * d - 200; tree(i % 4, x, z, 0, r); }
  }
  if (item === 'house') {
    for (let k = 0; k < 4; k++) house((k % 2) * 16 - 8, -Math.floor(k / 2) * 18, 0, k * 0.4 + 0.3, k, r);
    for (let i = 0; i < 300; i++) { const a = r() * 6.283, d = 30 + Math.sqrt(r()) * 500; const x = Math.cos(a) * d, z = Math.sin(a) * d - 100; tree(2, x, z, 0, r); }
    add('waterfall', 0, 60, 70, -120, 0.3, [], { width: 11, height: 70 });
  }
  if (item === 'gulet') {
    gulet(0, 0, 0.9, 0, r);
    gulet(-40, -35, 2.2, 1, r);
    gulet(36, -60, -0.4, 2, r);
    // tomb facade on a rock wall, lighthouse, arch
    add('tomb', 0, -30, 0, -95, 0.0, [boxPrim(-30, 3.75, -95.5, 4.2, 3.75, 1.5, 0, 0.2)], { w: 8.4, h: 7.5, d: 3 });
    { const h = 18, r0 = 2.6, r1 = 1.9, lanternH = 3; add('lighthouse', 0, 70, -0.5, -110, 0, [{ kind: 'cone', base: [70, -0.5, -110], h, r0, r1 }, boxPrim(70, -0.5 + h + lanternH / 2, -110, r1 + 0.3, lanternH / 2, r1 + 0.3, 0, 0.3)], { h, r0, r1, lanternH }); }
    {
      const x = -10, z = -190, span = 36, rise = 24, thick = 3.6, segs = 8, yaw = 0.3, legBase = 0;
      const prims: PropPrimitive[] = [];
      let px = 0, py = 0, pz = 0;
      for (let i = 0; i <= segs; i++) {
        const th = (Math.PI * i) / segs;
        const [ox, oz] = rot((span / 2) * Math.cos(th), 0, yaw);
        const qx = x + ox, qy = legBase + rise * Math.sin(th), qz = z + oz;
        if (i > 0) prims.push({ kind: 'capsule', a: [px, py, pz], b: [qx, qy, qz], r: thick });
        px = qx; py = qy; pz = qz;
      }
      add('arch', 0, x, legBase, z, yaw, prims, { span, rise, thick, segs });
    }
    for (let i = 0; i < 200; i++) { const a = r() * 6.283, d = 140 + Math.sqrt(r()) * 500; tree(1, Math.cos(a) * d, Math.sin(a) * d - 150, 0, r); }
  }
  if (item === 'ruins') {
    for (let i = 0; i < 10; i++) { const x = -20 + (i % 5) * 7, z = -Math.floor(i / 5) * 12; const h = 4 + r() * 4, rr = 0.4 + r() * 0.2; add('column', i % 4, x, 0, z, r() * 6.28, [{ kind: 'cone', base: [x, 0, z], h, r0: rr * 1.08, r1: rr * 0.92 }], { h, r: rr, broken: r() < 0.4 ? 1 : 0 }); }
    for (let i = 0; i < 4; i++) { const x = 20 + i * 9, z = -10 - i * 6, len = 6 + r() * 6, h = 2 + r() * 2, thick = 0.9, yaw = 0.4 * i; add('wall', i, x, 0, z, yaw, [boxPrim(x, h / 2 - 0.4, z, len / 2, h / 2 + 0.4, thick / 2, yaw, 0.15)], { len, h, thick }); }
    {
      const x = 0, z = -80, yaw = 0, radius = 22, tiers = 6, tierH = 1.6, tierD = 3, arcDeg = 180, segs = 9;
      const prims: PropPrimitive[] = [];
      for (let k = 0; k < tiers; k++) {
        const rc = radius + (k + 0.5) * tierD, top = (k + 1) * tierH;
        for (let j = 0; j < segs; j++) {
          const a = ((j + 0.5) / segs - 0.5) * arcDeg * Math.PI / 180;
          const [ox, oz] = rot(rc * Math.sin(a), -rc * Math.cos(a), yaw);
          const half = rc * Math.sin((arcDeg * Math.PI / 180) / segs / 2) + 0.3;
          prims.push(boxPrim(x + ox, top * 0.5 - 1, z + oz, half, top * 0.5 + 1, tierD * 0.5, yaw - a, 0.1));
        }
      }
      add('theater', 0, x, 0, z, yaw, prims, { radius, tiers, tierH, tierD, arcDeg, segs });
    }
    for (let i = 0; i < 160; i++) { const a = r() * 6.283, d = 40 + Math.sqrt(r()) * 400; tree(3, Math.cos(a) * d, Math.sin(a) * d - 60, 0, r); }
  }
  if (item === 'erciyes') {
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 40, z = -30 - (i % 2) * 30, yaw = 0.2 * i, len = 18 + r() * 20, wid = 6 + r() * 4, thick = 2 + r() * 1.2, top = 6;
      const [ox, oz] = rot(0, wid * 0.35, yaw);
      add('cornice', 0, x, top, z, yaw, [boxPrim(x + ox, top + thick * 0.2, z + oz, len / 2, thick / 2, wid / 2, yaw, Math.min(1.2, thick * 0.45))], { len, wid, thick, round: Math.min(1.2, thick * 0.45) });
    }
    for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 300, z = -r() * 300, rx = 1.5 + r() * 4, ry = 1 + r() * 3, rz = 1.5 + r() * 4; add('rock', i % 4, x, 0, z, 0, [{ kind: 'ellipsoid', c: [x, ry * 0.45, z], r: [rx, ry, rz] }], { rx, ry, rz, seed: i }); }
  }
  return out.slice();
}

export function demoBalloons(n: number, seed = 11): BalloonDef[] {
  const r = rnd(seed);
  const res: BalloonDef[] = [];
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number;
    if (n <= 12) {
      const row = Math.floor(i / 3), col = i % 3;
      x = (col - 1) * 30 + (r() - 0.5) * 6 + row * 6;
      z = -row * 34 + (r() - 0.5) * 6;
      y = 26 + r() * 20 + row * 8;
    } else {
      const a = r() * Math.PI * 2, d = 40 + Math.sqrt(r()) * 700;
      x = Math.cos(a) * d; z = Math.sin(a) * d; y = 60 + r() * 260;
    }
    const envelopeH = 18 + r() * 4;
    res.push({
      id: i, p0: [x, y, z], drift: [0.6 + r() * 0.5, 0, 0.2 * (r() - 0.5)], amp: [2, 1.2, 2], omega: 0.08 + r() * 0.05,
      phase: r() * 6.28, rise: 0.15 * r(), pattern: i % 12, envelopeH, envelopeR: envelopeH * (0.38 + r() * 0.04),
    });
  }
  return res;
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
