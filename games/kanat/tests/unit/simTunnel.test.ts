// 9.G-6 tunnelling: 10,000 random dives / tangent flights at maximum speed (64 m/s) into terrain, fairy chimneys,
// balloons and tree trunks. Every contact with the exact geometry must be caught (bounce/crash event); the
// trajectory may never pass through geometry.
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/sim/data/tuning.ts';
import { FlightSim } from '../../src/sim/FlightSim.ts';
import { Rng, STREAM } from '../../src/sim/math/rng.ts';
import { AnalyticTerrain, canyonCenter } from '../../src/sim/testing/analyticTerrain.ts';
import { exactBalloon, exactEllipsoid, exactTerrain } from '../../src/sim/testing/exactRef.ts';
import { makeCanyonRoute } from '../../src/sim/testing/testRoute.ts';
import type { PropInstance, PropPrimitive, RouteDef } from '../../src/sim/types.ts';
import { balloonPos, balloonsFor, buildProps } from '../../src/sim/world/props.ts';
import { PropIndex } from '../../src/sim/world/propIndex.ts';
import { sdBox, sdCapsule, sdCone } from '../../src/sim/world/sdf.ts';

const terrain = new AnalyticTerrain();
const props = buildProps('kapadokya', terrain, {});
const index = new PropIndex(props);
const baseRoute = makeCanyonRoute(terrain);
const route: RouteDef = { ...baseRoute, gates: [], thermals: [], wind: { dirDeg: 0, speed: 0 }, landing: { center: [9000, 0, 9000], radius: 25, zoneRadius: 250 } };
const balloons = balloonsFor('kapadokya', terrain, 7, { anchors: baseRoute.line });
const R = TUNING.body.radius;
const VMAX = 64;
const TOL = 0.05;

function primSdf(p: PropPrimitive, x: number, y: number, z: number): number {
  switch (p.kind) {
    case 'capsule':
      return sdCapsule(x, y, z, p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.r);
    case 'cone':
      return sdCone(x, y, z, p.base[0], p.base[1], p.base[2], p.h, p.r0, p.r1);
    case 'ellipsoid':
      return exactEllipsoid(x, y, z, p.c[0], p.c[1], p.c[2], p.r[0], p.r[1], p.r[2]);
    default:
      return sdBox(x, y, z, p.c[0], p.c[1], p.c[2], p.h[0], p.h[1], p.h[2], Math.cos(p.yaw), Math.sin(p.yaw), p.round);
  }
}

type Kind = 'terrain' | 'chimney' | 'balloon' | 'trunk';

interface Stats {
  flights: number;
  contacts: number;
  missed: number;
  passThrough: number;
}

function normalize(v: number[]): number[] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function runKind(kind: Kind, n: number, seed: number): Stats {
  const rng = new Rng(seed, STREAM.test);
  const sim = new FlightSim({ world: 'kapadokya', sampler: terrain, route, props, propIndex: index, balloons, assist: 'off', skipIntro: true });
  const snap0 = sim.snapshot();
  const st: Stats = { flights: 0, contacts: 0, missed: 0, passThrough: 0 };
  const tmp = new Float64Array(3);
  const trees = props.filter((p) => p.type === 'tree');
  const chimneys = props.filter((p) => p.type === 'chimney');
  let guard = 0;
  while (st.flights < n && guard++ < n * 20) {
    // ---- target point T, outward normal N ----
    let T: number[];
    let N: number[];
    let local: PropInstance[] = [];
    let bIdx = -1;
    if (kind === 'terrain') {
      const z = rng.range(-3000, 3000);
      const x = canyonCenter(z) + rng.range(-80, 80);
      T = [x, terrain.height(x, z), z];
      const nn = [0, 0, 0];
      terrain.normal(x, z, nn);
      N = nn;
    } else if (kind === 'chimney' || kind === 'trunk') {
      const p = kind === 'chimney' ? chimneys[rng.int(chimneys.length)] : trees[rng.int(trees.length)];
      const a = rng.range(0, Math.PI * 2);
      if (kind === 'chimney') {
        const c = p.prims[0] as Extract<PropPrimitive, { kind: 'cone' }>;
        const h = rng.range(0.25, 0.95) * c.h;
        const r = c.r0 + ((c.r1 - c.r0) * h) / c.h;
        T = [c.base[0] + r * Math.cos(a), c.base[1] + h, c.base[2] + r * Math.sin(a)];
      } else {
        const c = p.prims[0] as Extract<PropPrimitive, { kind: 'capsule' }>;
        const top = p.params.crownBase;
        const h = rng.range(0.4, 0.95) * top;
        T = [c.a[0] + c.r * Math.cos(a), p.pos[1] + h, c.a[2] + c.r * Math.sin(a)];
      }
      N = [Math.cos(a), 0, Math.sin(a)];
      local = props.filter((q) => Math.hypot(q.pos[0] - T[0], q.pos[2] - T[2]) < 70);
    } else {
      bIdx = rng.int(balloons.length);
      balloonPos(balloons[bIdx], 0, tmp);
      const b = balloons[bIdx];
      const u = normalize([rng.range(-1, 1), rng.range(-0.6, 0.6), rng.range(-1, 1)]);
      T = [tmp[0] + u[0] * b.envelopeR, tmp[1] + (u[1] * b.envelopeH) / 2, tmp[2] + u[2] * b.envelopeR];
      N = normalize([u[0] / b.envelopeR, u[1] / (b.envelopeH / 2), u[2] / b.envelopeR]);
    }
    // ---- direction: dive into the surface or tangent pass ----
    const tangent = rng.chance(0.5);
    let d: number[];
    let start: number[];
    if (tangent) {
      const helper = Math.abs(N[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const t1 = normalize(cross(N, helper));
      const t2 = cross(N, t1);
      const a = rng.range(0, Math.PI * 2);
      d = normalize([t1[0] * Math.cos(a) + t2[0] * Math.sin(a), t1[1] * Math.cos(a) + t2[1] * Math.sin(a), t1[2] * Math.cos(a) + t2[2] * Math.sin(a)]);
      const off = R + rng.range(-0.3, 1.2);
      start = [T[0] + N[0] * off - d[0] * 25, T[1] + N[1] * off - d[1] * 25, T[2] + N[2] * off - d[2] * 25];
    } else {
      const jit = normalize([-N[0] + rng.range(-0.6, 0.6), -N[1] + rng.range(-0.6, 0.6), -N[2] + rng.range(-0.6, 0.6)]);
      d = jit[0] * N[0] + jit[1] * N[1] + jit[2] * N[2] < -0.2 ? jit : [-N[0], -N[1], -N[2]];
      start = [T[0] - d[0] * 25, T[1] - d[1] * 25, T[2] - d[2] * 25];
    }
    const gamma = Math.asin(Math.max(-1, Math.min(1, d[1])));
    if (gamma < (-79 * Math.PI) / 180 || gamma > (69 * Math.PI) / 180) continue;
    if (start[1] < terrain.height(start[0], start[2]) + 3) continue;
    const psi = Math.atan2(d[0], -d[2]);
    sim.restore(snap0);
    sim.teleport(start[0], start[1], start[2], VMAX, gamma, psi);
    // the start must be clear of everything
    if (!(sim.state.prox.d > 1.5)) continue;
    st.flights++;
    // exact distance at a point (independent reference)
    const exact = (x: number, y: number, z: number, tSec: number): number => {
      let e = Infinity;
      const H = terrain.height(x, z);
      if (y < H) return -1;
      if (y - H < 2.6) e = Math.min(e, exactTerrain(terrain, x, y, z, Math.min(y - H + 0.1, 2.6), 0.25));
      for (const p of local) for (const pr of p.prims) e = Math.min(e, primSdf(pr, x, y, z));
      if (kind === 'balloon' || kind === 'terrain') {
        for (let b = 0; b < balloons.length; b++) {
          balloonPos(balloons[b], tSec, tmp);
          const dd = Math.hypot(tmp[0] - x, tmp[1] - y, tmp[2] - z);
          if (dd < 40) e = Math.min(e, exactBalloon(balloons[b], tmp[0], tmp[1], tmp[2], x, y, z));
        }
      }
      return e;
    };
    for (let tick = 0; tick < 50; tick++) {
      const t0 = sim.timeSec;
      sim.step([]);
      const ev = sim.drainEvents();
      const contact = ev.some((e) => e.type === 'bounce' || e.type === 'crash');
      const s = sim.state;
      const tEnd = sim.timeSec;
      const ax = s.prevPos[0];
      const ay = s.prevPos[1];
      const az = s.prevPos[2];
      const len = Math.hypot(s.pos[0] - ax, s.pos[1] - ay, s.pos[2] - az);
      const steps = Math.max(1, Math.ceil(len / 0.1));
      let minE = Infinity;
      for (let k = 0; k <= steps; k++) {
        const f = k / steps;
        const e = exact(ax + (s.pos[0] - ax) * f, ay + (s.pos[1] - ay) * f, az + (s.pos[2] - az) * f, tEnd);
        if (e < minE) minE = e;
      }
      void t0;
      if (minE < -0.01) {
        st.passThrough++;
        break;
      }
      if (contact) {
        st.contacts++;
        break;
      }
      if (minE < R - TOL) {
        st.missed++;
        break;
      }
      if (s.phase !== 'flying') break;
    }
  }
  return st;
}

describe('9.G-6 tunnelling at maximum speed', () => {
  const kinds: Kind[] = ['terrain', 'chimney', 'balloon', 'trunk'];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    it(`${kind}: 2,500 dives / tangent passes → every exact contact caught, 0 pass-through`, () => {
      const s = runKind(kind, 2500, 1000 + i);
      // eslint-disable-next-line no-console
      console.log(`9.G-6 ${kind}: flights=${s.flights} contacts=${s.contacts} missed=${s.missed} passThrough=${s.passThrough}`);
      expect(s.flights).toBe(2500);
      expect(s.contacts).toBeGreaterThan(1000);
      expect(s.passThrough).toBe(0);
      expect(s.missed).toBe(0);
    });
  }
});
