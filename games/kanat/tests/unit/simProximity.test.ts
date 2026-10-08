// 9.G-5 (fast proximity query vs brute-force reference) and 9.G-7 (multiplier boundaries, flat clamp).
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/sim/data/tuning.ts';
import { multForDistance, multiplier, Proximity, ProxResult } from '../../src/sim/flight/proximity.ts';
import { Rng, STREAM } from '../../src/sim/math/rng.ts';
import { AnalyticTerrain, ANALYTIC, canyonCenter } from '../../src/sim/testing/analyticTerrain.ts';
import { exactBalloon, exactProps, exactTerrain } from '../../src/sim/testing/exactRef.ts';
import { makeCanyonRoute } from '../../src/sim/testing/testRoute.ts';
import { balloonsFor, buildProps } from '../../src/sim/world/props.ts';
import { PropIndex } from '../../src/sim/world/propIndex.ts';

const terrain = new AnalyticTerrain();
const props = buildProps('kapadokya', terrain, {});
const route = makeCanyonRoute(terrain);
const balloons = balloonsFor('kapadokya', terrain, 7, { anchors: route.line });
const index = new PropIndex(props);

describe('9.G-7 multiplier tiers', () => {
  it('boundaries d = 29.9 → ×1, 14.9 → ×2, 6.9 → ×3, 2.9 → ×5', () => {
    expect(multForDistance(30)).toBe(0);
    expect(multForDistance(Infinity)).toBe(0);
    expect(multForDistance(29.9)).toBe(1);
    expect(multForDistance(15)).toBe(1);
    expect(multForDistance(14.9)).toBe(2);
    expect(multForDistance(7)).toBe(2);
    expect(multForDistance(6.9)).toBe(3);
    expect(multForDistance(3)).toBe(3);
    expect(multForDistance(2.9)).toBe(5);
    expect(multForDistance(0)).toBe(5);
  });
  it('flatSurfaceMaxMult = 3 on water and ground slope < 8°', () => {
    expect(TUNING.prox.flatSurfaceMaxMult).toBe(3);
    expect(multiplier(2.9, true)).toBe(3);
    expect(multiplier(2.9, false)).toBe(5);
    expect(multiplier(6.9, true)).toBe(3);
    const prox = new Proximity(terrain, null, [], [{ y: 0 }]);
    const r = new ProxResult();
    // over the sea (x > 2500): water, flat
    prox.query(3200, 2.5, 0, r);
    expect(r.cls).toBe('water');
    expect(r.flat).toBe(true);
    expect(multiplier(r.dc - TUNING.body.radius, r.flat)).toBe(3);
    // over the flat plain: ground, flat
    prox.query(ANALYTIC.plainX, ANALYTIC.plainH + 2.5, ANALYTIC.plainZ, r);
    expect(r.cls).toBe('ground');
    expect(r.slopeDeg).toBeLessThan(8);
    expect(r.flat).toBe(true);
    expect(multiplier(r.dc - TUNING.body.radius, r.flat)).toBe(3);
    // next to a steep canyon wall: rock, ×5
    const z = 500;
    const cx = canyonCenter(z);
    let wx = cx + ANALYTIC.canyonFloorHalf + ANALYTIC.canyonWall * 0.5;
    const wy = terrain.height(wx, z) + 0.5;
    wx -= 2.2; // step away from the wall horizontally
    prox.query(wx, wy, z, r);
    expect(r.cls).toBe('rock');
    expect(r.flat).toBe(false);
    expect(multiplier(r.dc - TUNING.body.radius, r.flat)).toBe(5);
  });
});

describe('9.G-5 fast query vs brute force', () => {
  it('10,000 random points: d<7 err ≤ 0.5 m, d<30 err ≤ 1.5 m, never "safe" when exact d < 0.6 m', () => {
    const prox = new Proximity(terrain, index, balloons, [{ y: 0 }]);
    const t = 12.5;
    prox.setTime(t);
    const out = new ProxResult();
    const rng = new Rng(99, STREAM.test);
    const N = 10000;
    let n7 = 0;
    let n30 = 0;
    let max7 = 0;
    let max30 = 0;
    let falseSafe = 0;
    let missing = 0;
    let near06 = 0;
    for (let k = 0; k < N; k++) {
      let x: number;
      let y: number;
      let z: number;
      const mode = k % 20;
      if (mode < 8) {
        z = rng.range(-3200, 3200);
        x = canyonCenter(z) + rng.range(-110, 110);
        y = terrain.height(x, z) + (mode < 3 ? rng.range(-0.3, 3) : rng.range(0, 36));
      } else if (mode < 14) {
        const p = props[rng.int(props.length)];
        const pr = p.prims[rng.int(p.prims.length)];
        const c = pr.kind === 'capsule' ? pr.b : pr.kind === 'cone' ? pr.base : pr.c;
        const rr = mode < 10 ? rng.range(0, 3) : rng.range(0, 25);
        x = c[0] + rng.range(-1, 1) * (rr + 4);
        y = c[1] + rng.range(-1, 1) * (rr + 6);
        z = c[2] + rng.range(-1, 1) * (rr + 4);
        const g = terrain.height(x, z);
        if (y < g) y = g + rng.range(0, 3);
      } else if (mode < 17) {
        const b = rng.int(balloons.length);
        const bc = prox.balloonCenters;
        const rr = rng.range(0, 20);
        x = bc[b * 3] + rng.range(-1, 1) * (rr + 9);
        y = bc[b * 3 + 1] + rng.range(-1, 1) * (rr + 14);
        z = bc[b * 3 + 2] + rng.range(-1, 1) * (rr + 9);
      } else {
        x = rng.range(-3500, 3500);
        z = rng.range(-3500, 3500);
        y = Math.max(0, terrain.height(x, z)) + rng.range(0, 60);
      }
      // reference
      const dv = Math.abs(y - terrain.height(x, z));
      let ex = exactTerrain(terrain, x, y, z, Math.min(dv + 1, 46));
      ex = Math.min(ex, exactProps(index, x, y, z), y);
      for (let b = 0; b < balloons.length; b++) {
        const bc = prox.balloonCenters;
        ex = Math.min(ex, exactBalloon(balloons[b], bc[b * 3], bc[b * 3 + 1], bc[b * 3 + 2], x, y, z));
      }
      prox.query(x, y, z, out);
      const q = out.dc;
      if (ex < 0.6) {
        near06++;
        if (!(q < 0.6)) falseSafe++;
      }
      if (ex < 30) {
        n30++;
        if (!Number.isFinite(q)) {
          missing++;
          continue;
        }
        const e = Math.abs(q - ex);
        if (e > max30) max30 = e;
        if (ex < 7) {
          n7++;
          if (e > max7) max7 = e;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`9.G-5: n<7=${n7} max|err|=${max7.toFixed(3)} · n<30=${n30} max|err|=${max30.toFixed(3)} · exact<0.6: ${near06}, false safe=${falseSafe}`);
    expect(n7).toBeGreaterThan(2000);
    expect(near06).toBeGreaterThan(100);
    expect(missing).toBe(0);
    expect(max7).toBeLessThanOrEqual(0.5);
    expect(max30).toBeLessThanOrEqual(1.5);
    expect(falseSafe).toBe(0);
  });

  it('prop index nearest == brute force over all primitives (same SDFs)', () => {
    const rng = new Rng(5, STREAM.test);
    const hit = { d: 0, prim: -1, propId: -1, cls: 'none' as const, nx: 0, ny: 1, nz: 0 };
    for (let k = 0; k < 3000; k++) {
      const p = props[rng.int(props.length)];
      const x = p.pos[0] + rng.range(-30, 30);
      const y = p.pos[1] + rng.range(-5, 40);
      const z = p.pos[2] + rng.range(-30, 30);
      const b = index.nearestBrute(x, y, z);
      index.nearest(x, y, z, 45, hit as unknown as Parameters<typeof index.nearest>[4], false);
      if (b.d < 45) expect(hit.d).toBeCloseTo(b.d, 9);
      else expect(hit.d).toBe(Infinity);
    }
  });
});
