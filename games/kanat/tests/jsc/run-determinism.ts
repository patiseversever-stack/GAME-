// Cross-engine determinism probe (brief §4.G.8, §9.G-13). Runs the same deterministic flights and prints
//   HASHES <json>
// Run under V8:  node tests/jsc/run-determinism.ts
// Run under JSC: npx bun tests/jsc/run-determinism.ts   (Bun = JavaScriptCore, the iOS engine)
// tests/jsc/compare.ts runs both and asserts identical output. When this script itself runs under Bun (the
// `npm run test:jsc` entry), it also spawns Node and compares, exiting 1 on any mismatch.
//
// What is hashed: tick hashes every 60 ticks (FlightSim.hash, quantized), the RAW float bits of the final
// state (bit-identical proof), detMath outputs (raw bits), prop/balloon placement for all 5 worlds over the
// analytic sampler, and — when public/worlds/kapadokya exists — a flight over the real baked terrain.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlightSim } from '../../src/sim/FlightSim.ts';
import * as dm from '../../src/sim/math/detMath.ts';
import { Fnv1a } from '../../src/sim/math/hash.ts';
import { Rng } from '../../src/sim/math/rng.ts';
import { AnalyticTerrain } from '../../src/sim/testing/analyticTerrain.ts';
import { Autopilot, makeCanyonRoute, noiseAxis } from '../../src/sim/testing/testRoute.ts';
import type { TerrainSampler } from '../../src/sim/terrain/types.ts';
import { type Command, type PropInstance, type RouteDef, WORLD_IDS } from '../../src/sim/types.ts';
import { SIM_VERSION } from '../../src/sim/version.ts';
import { balloonsFor, buildProps } from '../../src/sim/world/props.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

/** Hash of the exact IEEE-754 bit pattern of a double. */
function bits(h: Fnv1a, v: number): Fnv1a {
  f64[0] = v;
  return h.u32(u32[0]).u32(u32[1]);
}

function detMathHash(): number {
  const h = new Fnv1a();
  const r = new Rng(2024, 9);
  for (let i = 0; i < 20000; i++) {
    const x = r.range(-500, 500);
    const y = r.range(-500, 500);
    bits(h, dm.sin(x));
    bits(h, dm.cos(x));
    bits(h, dm.tan(x * 0.001));
    bits(h, dm.atan(x));
    bits(h, dm.atan2(y, x));
    bits(h, dm.exp(x * 0.1));
    bits(h, dm.log(Math.abs(x) + 1e-3));
    bits(h, dm.pow(Math.abs(x) * 0.01 + 0.5, y * 0.01));
    bits(h, dm.asin(x / 500));
  }
  return h.value();
}

function nativeMathHash(): number {
  const h = new Fnv1a();
  const r = new Rng(2024, 9);
  for (let i = 0; i < 20000; i++) {
    const x = r.range(-500, 500);
    const y = r.range(-500, 500);
    bits(h, Math.sin(x));
    bits(h, Math.exp(x * 0.1));
    bits(h, Math.pow(Math.abs(x) * 0.01 + 0.5, y * 0.01));
  }
  return h.value();
}

function propsHash(props: readonly PropInstance[]): number {
  const h = new Fnv1a();
  for (const p of props) {
    h.u32(p.id).str(p.type).u32(p.variant);
    bits(h, p.pos[0]);
    bits(h, p.pos[1]);
    bits(h, p.pos[2]);
    bits(h, p.yaw);
    for (const k of Object.keys(p.params)) bits(h.str(k), p.params[k]);
    for (const pr of p.prims) {
      h.str(pr.kind);
      for (const v of Object.values(pr)) {
        if (typeof v === 'number') bits(h, v);
        else if (Array.isArray(v)) for (const c of v) bits(h, c);
      }
    }
  }
  return h.value();
}

interface FlightResult {
  name: string;
  ticks: number;
  phase: string;
  score: number;
  hashes: number[];
  finalBits: number;
}

function fly(name: string, sampler: TerrainSampler, route: RouteDef, props: readonly PropInstance[], seed: number, mode: 'auto' | 'noise', opts: { slowMode?: boolean; guideWind?: boolean; assist?: 'full' | 'low' | 'off' }, ticks: number): FlightResult {
  const balloons = balloonsFor(route.world, sampler, 7, { anchors: route.line });
  const sim = new FlightSim({ world: route.world, sampler, props, balloons, route, seed, skipIntro: true, ...opts });
  const ap = new Autopilot();
  const ax = [0, 0];
  const noise: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
  const chute: Command = { tick: 0, actorId: 0, cmd: 'parachute', args: [] };
  const flare: Command = { tick: 0, actorId: 0, cmd: 'flare', args: [31] };
  const hashes: number[] = [];
  let i = 0;
  for (; i < ticks; i++) {
    const st = sim.state;
    let cmds: Command[];
    if (mode === 'auto') {
      const g = route.gates[st.gateIndex];
      ap.target = g ? [g.pos[0], g.pos[1], g.pos[2]] : [route.landing.center[0], route.landing.center[1] + 30, route.landing.center[2]];
      cmds = ap.commands(st);
    } else {
      cmds = [];
      if ((st.tick & 1) === 0) {
        noiseAxis(seed, st.tick, ax);
        noise.tick = st.tick;
        noise.args[0] = ax[0] >> 1;
        noise.args[1] = ax[1] >> 1;
        cmds.push(noise);
      }
    }
    if (st.inLandingZone && st.phase === 'flying' && st.heightAGL < 90) {
      chute.tick = st.tick;
      cmds = cmds.concat([chute]);
    }
    if (st.canopyOpen && st.heightAGL < 3) {
      flare.tick = st.tick;
      cmds = cmds.concat([flare]);
    }
    sim.step(cmds);
    sim.drainEvents();
    if (sim.state.tick % 60 === 0) hashes.push(sim.hash());
    const ph = sim.state.phase;
    if (ph === 'landed' || ph === 'crashed' || (ph === 'halfFlight' && !sim.state.canopyOpen)) break;
  }
  hashes.push(sim.hash());
  const s = sim.state;
  const h = new Fnv1a();
  for (const v of [s.pos[0], s.pos[1], s.pos[2], s.vel[0], s.vel[1], s.vel[2], s.speed, s.gamma, s.psi, s.phi, s.cl, s.score, s.energy, s.prox.d]) bits(h, v);
  return { name, ticks: sim.state.tick, phase: s.phase, score: Math.round(s.score * 1000) / 1000, hashes, finalBits: h.value() };
}

function run(): Record<string, unknown> {
  const terrain = new AnalyticTerrain();
  const route = makeCanyonRoute(terrain);
  const props = buildProps('kapadokya', terrain, {});
  const flights: FlightResult[] = [];
  for (let seed = 1; seed <= 4; seed++) flights.push(fly(`canyon-auto-${seed}`, terrain, route, props, seed, 'auto', { assist: seed % 2 === 0 ? 'full' : 'off' }, 4800));
  for (let seed = 11; seed <= 14; seed++) flights.push(fly(`canyon-noise-${seed}`, terrain, route, props, seed, 'noise', { assist: 'full' }, 2400));
  flights.push(fly('canyon-slow', terrain, route, props, 21, 'auto', { slowMode: true }, 3000));
  flights.push(fly('canyon-guide', terrain, route, props, 22, 'noise', { guideWind: true }, 2400));
  const placement: Record<string, number> = {};
  for (const w of WORLD_IDS) placement[w] = propsHash(buildProps(w, terrain, {}));
  const bh = new Fnv1a();
  for (const b of balloonsFor('kapadokya', terrain, 7)) for (const v of [...b.p0, ...b.drift, ...b.amp, b.omega, b.phase, b.rise, b.envelopeH, b.envelopeR]) bits(bh, v);
  const out: Record<string, unknown> = {
    simVersion: SIM_VERSION,
    detMath: detMathHash(),
    placement,
    balloons: bh.value(),
    flights,
  };
  // Real baked world (optional).
  const kap = join(ROOT, 'public', 'worlds', 'kapadokya', 'world.json');
  const loader = join(ROOT, 'tools', 'terrain', 'loadNode.ts');
  out.real = existsSync(kap) && existsSync(loader) ? 'pending' : 'absent';
  return out;
}

async function runReal(out: Record<string, unknown>): Promise<void> {
  if (out.real !== 'pending') return;
  const mod = (await import('../../tools/terrain/loadNode.ts')) as unknown as { loadWorldNode: (id: 'kapadokya') => { config: Record<string, unknown>; sampler: TerrainSampler } };
  const W = mod.loadWorldNode('kapadokya');
  const s = W.sampler;
  const props = buildProps('kapadokya', s, W.config as Parameters<typeof buildProps>[2]);
  const h0 = s.height(0, 0);
  const lx = 2000;
  const route: RouteDef = {
    id: 'kap-jsc',
    world: 'kapadokya',
    index: 1,
    difficulty: 1,
    name: { tr: 'JSC', en: 'JSC' },
    start: { type: 'balon', pos: [0, h0 + 500, 0], headingDeg: 90, speedKmh: 150 },
    line: [[0, h0 + 500, 0], [lx, s.height(lx, 0) + 60, 0]],
    gates: [],
    thermals: [{ pos: [400, 0], radius: 50, w0: 6, top: h0 + 700 }],
    landing: { center: [lx, s.height(lx, 0), 0], radius: 25, zoneRadius: 250 },
    wind: { dirDeg: 250, speed: 4 },
    stars: [0, 3000, 6000],
    expertScore: 7000,
    ustaGorevleri: [],
    postcards: [],
  };
  out.real = {
    placement: propsHash(props),
    flights: [fly('kapadokya-auto', s, route, props, 31, 'auto', {}, 4800), fly('kapadokya-noise', s, route, props, 32, 'noise', {}, 2400)],
  };
}

const engine = (process.versions as Record<string, string | undefined>).bun ? `bun ${(process.versions as Record<string, string>).bun} (JavaScriptCore)` : `node ${process.versions.node} (V8)`;
const result = run();
await runReal(result);
const line = `HASHES ${JSON.stringify(result)}`;
console.log(`ENGINE ${engine}`);
console.log(`INFO native Math.sin/exp/pow bit hash (not compared, engines may differ): ${nativeMathHash()}`);
console.log(line);

const isBun = Boolean((process.versions as Record<string, string | undefined>).bun);
if (isBun && !process.argv.includes('--child')) {
  // `npm run test:jsc` entry: compare against V8 right here.
  const node = spawnSync('node', [fileURLToPath(import.meta.url), '--child'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const other = (node.stdout || '').split('\n').find((l) => l.startsWith('HASHES '));
  if (node.status !== 0 || !other) {
    console.error('V8 run failed:', node.stderr);
    process.exit(1);
  }
  if (other === line) {
    console.log('DETERMINISM OK: JavaScriptCore (Bun) == V8 (Node), bit-identical');
  } else {
    console.error('DETERMINISM MISMATCH between JavaScriptCore (Bun) and V8 (Node)');
    process.exit(1);
  }
}
