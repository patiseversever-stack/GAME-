// SÜRÜ.io arena layouts: 3 hand-made bays + the seeded "Sürü Günü" layout (§2.6 "Arena").
// Coordinates: metres, +x east, −z north, arena centre (0, 0), arena radius 300 m. PURE data.
// Shore arcs are visual only (land outside the arena); angles use ψ (0 = −z, clockwise toward +x).

import type { SuruLayout } from './types.ts';
import { Rng } from './rng.ts';
import { detCos, detSin, DET_TAU } from './detMath.ts';

const D = 0.017453292519943295;

export const LAYOUT_SAZLIK: SuruLayout = {
  id: 'sazlik',
  name: { tr: 'Sazlık Körfezi', en: 'Reed Bay' },
  islets: [
    { x: -95, z: -120, r: 26 },
    { x: 130, z: -70, r: 30 },
    { x: 85, z: 140, r: 24 },
    { x: -140, z: 95, r: 28 },
  ],
  lighthouse: { x: -262, z: -72 },
  rocks: [
    { x: -250, z: -52, r: 9 },
    { x: -268, z: -96, r: 7 },
    { x: 20, z: 32, r: 5 },
    { x: 182, z: 96, r: 6 },
  ],
  shore: [
    { from: 20 * D, to: 200 * D, dist: 330 },
    { from: 300 * D, to: 345 * D, dist: 345 },
  ],
  spawnRadius: 175,
  seed: 0x5a2117,
};

export const LAYOUT_FENER: SuruLayout = {
  id: 'fener',
  name: { tr: 'Fener Burnu', en: 'Lighthouse Cape' },
  islets: [
    { x: -150, z: -40, r: 28 },
    { x: 150, z: -30, r: 26 },
    { x: -70, z: 160, r: 25 },
    { x: 95, z: 150, r: 27 },
  ],
  lighthouse: { x: 0, z: -175 },
  rocks: [
    { x: 0, z: -205, r: 12 },
    { x: 6, z: -238, r: 14 },
    { x: -8, z: -268, r: 16 },
    { x: 14, z: -158, r: 6 },
    { x: -16, z: -190, r: 7 },
  ],
  shore: [
    { from: 330 * D, to: 390 * D, dist: 320 },
    { from: 60 * D, to: 170 * D, dist: 335 },
  ],
  spawnRadius: 170,
  seed: 0xfe4e21,
};

export const LAYOUT_TASLI: SuruLayout = {
  id: 'tasli',
  name: { tr: 'Taşlı Koy', en: 'Stony Cove' },
  islets: [
    { x: -120, z: -135, r: 24 },
    { x: 165, z: -10, r: 26 },
    { x: -40, z: 175, r: 24 },
    { x: -175, z: 40, r: 22 },
  ],
  lighthouse: { x: 228, z: 168 },
  rocks: [
    { x: -30, z: -40, r: 8 },
    { x: 40, z: 25, r: 10 },
    { x: 70, z: -110, r: 7 },
    { x: -95, z: 60, r: 9 },
    { x: 120, z: 95, r: 8 },
    { x: -200, z: -60, r: 11 },
    { x: 15, z: 120, r: 6 },
    { x: -60, z: -210, r: 9 },
    { x: 205, z: -120, r: 10 },
    { x: 240, z: 145, r: 12 },
    { x: 212, z: 190, r: 9 },
  ],
  shore: [
    { from: 0 * D, to: 140 * D, dist: 325 },
    { from: 200 * D, to: 250 * D, dist: 340 },
  ],
  spawnRadius: 180,
  seed: 0x7a5711,
};

export const HAND_LAYOUTS: readonly SuruLayout[] = [LAYOUT_SAZLIK, LAYOUT_FENER, LAYOUT_TASLI];

export function layoutById(id: string): SuruLayout {
  for (const l of HAND_LAYOUTS) if (l.id === id) return l;
  return LAYOUT_SAZLIK;
}

/** Seeded "Sürü Günü" layout: everyone gets the same bay for the same day index. */
export function dailyLayout(dayIndex: number): SuruLayout {
  const seed = (Math.imul(dayIndex + 1, 0x9e3779b1) ^ 0x51ed27) >>> 0;
  const rng = new Rng(seed, 101);
  const islets: { x: number; z: number; r: number }[] = [];
  let guard = 0;
  while (islets.length < 4 && guard++ < 400) {
    const a = rng.next() * DET_TAU;
    const rr = rng.range(90, 215);
    const x = detSin(a) * rr;
    const z = -detCos(a) * rr;
    let ok = true;
    for (const o of islets) {
      const dx = o.x - x;
      const dz = o.z - z;
      if (dx * dx + dz * dz < 125 * 125) ok = false;
    }
    if (ok) islets.push({ x: Math.round(x), z: Math.round(z), r: Math.round(rng.range(22, 30)) });
  }
  const la = rng.next() * DET_TAU;
  const lr = rng.range(215, 262);
  const lighthouse = { x: Math.round(detSin(la) * lr), z: Math.round(-detCos(la) * lr) };
  const rocks: { x: number; z: number; r: number }[] = [
    { x: Math.round(lighthouse.x * 1.08), z: Math.round(lighthouse.z * 1.08), r: 11 },
  ];
  const nRocks = rng.int(4, 8);
  guard = 0;
  while (rocks.length < nRocks + 1 && guard++ < 400) {
    const a = rng.next() * DET_TAU;
    const rr = rng.range(30, 265);
    const x = detSin(a) * rr;
    const z = -detCos(a) * rr;
    let ok = true;
    for (const o of islets) {
      const dx = o.x - x;
      const dz = o.z - z;
      if (dx * dx + dz * dz < (o.r + 22) * (o.r + 22)) ok = false;
    }
    if (ok) rocks.push({ x: Math.round(x), z: Math.round(z), r: Math.round(rng.range(5, 12)) });
  }
  const s0 = rng.next() * DET_TAU;
  const shore = [
    { from: s0, to: s0 + rng.range(110, 170) * D, dist: 330 },
    { from: s0 + 200 * D, to: s0 + rng.range(230, 280) * D, dist: 340 },
  ];
  return {
    id: `daily-${dayIndex}`,
    name: { tr: 'Sürü Günü', en: 'Flock Day' },
    islets,
    lighthouse,
    rocks,
    shore,
    spawnRadius: Math.round(rng.range(165, 185)),
    seed,
  };
}
