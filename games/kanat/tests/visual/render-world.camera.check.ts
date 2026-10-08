// Camera rule checks (brief §2.3 / §2.4) — headless, no GPU. Run: node tests/visual/render-world.camera.check.ts
// Exits non-zero on failure. (vitest only collects tests/unit/**, which render-world does not own.)
import * as THREE from 'three';
import { FollowCamera } from '../../src/render/camera/FollowCamera.ts';
import { IntroCamera } from '../../src/render/camera/IntroCamera.ts';
import { ReplayDirector, type ReplayFrame } from '../../src/render/camera/ReplayDirector.ts';
import type { FlightState, ProximityInfo, RouteDef, SimEvent } from '../../src/sim/types.ts';
import type { TerrainSampler } from '../../src/sim/terrain/types.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}

// Rugged synthetic terrain: ridges + canyon walls.
const H = (x: number, z: number) => 120 * Math.sin(x * 0.004) * Math.cos(z * 0.0037) + 60 * Math.sin(x * 0.013 + z * 0.011) + 40 * Math.abs(Math.sin(z * 0.02));
const sampler: TerrainSampler = {
  height: H,
  baseHeight: H,
  normal: (x, z, out) => {
    const e = 1;
    const hx = (H(x + e, z) - H(x - e, z)) / (2 * e);
    const hz = (H(x, z + e) - H(x, z - e)) / (2 * e);
    const l = Math.hypot(hx, 1, hz);
    out[0] = -hx / l;
    out[1] = 1 / l;
    out[2] = -hz / l;
  },
  slopeDeg: () => 0,
  bounds: { minX: -4000, maxX: 4000, minZ: -4000, maxZ: 4000 },
};

const prox: ProximityInfo = { d: Infinity, cls: 'none', nearest: [0, 0, 0], normal: [0, 1, 0], mult: 0, propId: -1 };
function state(t: number, speed: number, agl: number): FlightState {
  const psi = Math.sin(t * 0.3) * 0.8;
  const x = Math.sin(psi) * speed * t;
  const z = -Math.cos(psi) * speed * t - t * 10;
  const y = H(x, z) + agl;
  const vx = Math.sin(psi) * speed;
  const vz = -Math.cos(psi) * speed;
  return {
    tick: Math.round(t * 60), phase: 'flying', pos: [x, y, z], prevPos: [x - vx / 60, y, z - vz / 60], vel: [vx, -3, vz], speed,
    gamma: 0, psi, phi: Math.sin(t * 0.7) * 1.2, cl: 0.5, heightAGL: agl, prox: { ...prox, d: agl }, score: 0, combo: 1, comboTime: 0,
    timeSec: t, gateIndex: 0, gatesPassed: 0, gatesMissed: 0, inThermal: -1, inLandingZone: false, canopyOpen: false, assist: 'full', energy: 0,
  };
}

// ---- FollowCamera ----
{
  const cam = new THREE.PerspectiveCamera(74, 390 / 844, 0.5, 30000);
  const fc = new FollowCamera(cam, sampler);
  let minClear = Infinity;
  let maxFovRate = 0;
  let maxRoll = 0;
  let prevFov = -1;
  let maxShake = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 30; i++) {
    const t = i * dt;
    const speed = 31 + 33 * (0.5 + 0.5 * Math.sin(t * 0.25)); // 110..230 km/h
    const st = state(t, speed, 3 + 10 * (0.5 + 0.5 * Math.sin(t * 0.9)));
    fc.update(st, dt, st.prox, 1);
    minClear = Math.min(minClear, cam.position.y - H(cam.position.x, cam.position.z));
    if (prevFov >= 0) maxFovRate = Math.max(maxFovRate, Math.abs(cam.fov - prevFov) / dt);
    prevFov = cam.fov;
    const e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
    maxRoll = Math.max(maxRoll, Math.abs(e.z) * (180 / Math.PI));
    maxShake = Math.max(maxShake, Math.hypot(fc.shake.offset[0], fc.shake.offset[1]));
  }
  check('follow: terrain clearance ≥ 1.5 m', minClear >= 1.5 - 1e-6, `min ${minClear.toFixed(3)} m`);
  check('follow: FOV rate ≤ 12°/s', maxFovRate <= 12.0001, `max ${maxFovRate.toFixed(2)}°/s`);
  check('follow: roll ≤ 35° (+0.6° shake)', maxRoll <= 35.7, `max ${maxRoll.toFixed(2)}°`);
  check('follow: shake offset ≤ 0.08 m', maxShake <= 0.08 + 1e-9, `max ${maxShake.toFixed(4)} m`);
  check('follow: portrait FOV within 74..86', cam.fov >= 74 - 1e-6 && cam.fov <= 86 + 1e-6, `${cam.fov.toFixed(1)}°`);

  // Comfort + reduceMotion: no shake, FOV cap 75, roll ×0.25.
  fc.opts = { distance: 'normal', helmet: false, comfort: true, reduceMotion: true, reducedFovKick: false };
  fc.reset();
  let comfortShake = 0;
  let comfortFov = 0;
  for (let i = 0; i < 600; i++) {
    const st = state(i / 60, 64, 3);
    fc.update(st, 1 / 60, st.prox, 1);
    comfortShake = Math.max(comfortShake, Math.hypot(fc.shake.offset[0], fc.shake.offset[1]));
    comfortFov = Math.max(comfortFov, cam.fov);
  }
  check('comfort: zero shake', comfortShake === 0, `${comfortShake}`);
  check('comfort: FOV ≤ 75°', comfortFov <= 75 + 1e-6, `${comfortFov.toFixed(2)}`);
}

// ---- IntroCamera ----
{
  const cam = new THREE.PerspectiveCamera(50, 390 / 844, 0.5, 30000);
  const ic = new IntroCamera(cam, sampler);
  const line: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) line.push([i * 40, H(i * 40, -i * 60) + 30, -i * 60]);
  const route = { start: { type: 'balon', pos: [0, H(0, 0) + 300, 0], headingDeg: 180, speedKmh: 150 }, line, gates: [] } as unknown as RouteDef;
  ic.setRoute(route);
  let done = false;
  let minClear = Infinity;
  let t = 0;
  for (; t < 7 && !done; t += 1 / 60) {
    done = ic.update(t);
    if (!done) minClear = Math.min(minClear, cam.position.y - H(cam.position.x, cam.position.z));
  }
  check('intro: finishes at 6 s', done && Math.abs(t - 6) < 0.05, `t=${t.toFixed(2)}`);
  check('intro: camera above terrain', minClear >= 1.5, `min ${minClear.toFixed(1)} m`);
}

// ---- ReplayDirector ----
{
  const cam = new THREE.PerspectiveCamera(22, 390 / 844, 0.5, 30000);
  const rd = new ReplayDirector(cam, sampler);
  const frames: ReplayFrame[] = [];
  for (let i = 0; i <= 60 * 20; i += 2) {
    const st = state(i / 60, 50, 6);
    frames.push({ t: i / 60, pos: st.pos, vel: st.vel, phi: st.phi, d: 6 + Math.abs(Math.sin(i * 0.01)) * 20 });
  }
  const events: SimEvent[] = [
    { type: 'graze', tick: 240, points: 250, strength: 0.6, pos: frames[120].pos, cls: 'rock', side: 1 },
    { type: 'gate', tick: 600, index: 0, points: 100, chain: 1 },
    { type: 'crash', tick: 1100, pos: frames[550].pos, cls: 'rock' },
  ];
  const shots = rd.plan(frames, events, 60);
  check('replay: shots planned', shots.length >= 3, `${shots.length} shots: ${shots.map((s) => s.kind).join(',')}`);
  check('replay: graze → fixed ground/rock edge', shots.some((s) => s.kind === 'fixedGround' || s.kind === 'rockEdge'));
  check('replay: crash → orbit', shots.some((s) => s.kind === 'orbit'));
  let maxAng = 0;
  let minScale = 1;
  const prev = new THREE.Vector3();
  const cur = new THREE.Vector3();
  let prevShot = -1;
  for (let t = 0; t < 19.5; t += 1 / 60) {
    const sc = rd.update(t, 1 / 60);
    minScale = Math.min(minScale, sc);
    cam.getWorldDirection(cur);
    const shotIdx = rd.shots.findIndex((s) => t >= s.t0 && t <= s.t1);
    if (prevShot === shotIdx && t > 0) maxAng = Math.max(maxAng, (prev.angleTo(cur) * 180) / Math.PI / (1 / 60));
    prev.copy(cur);
    prevShot = shotIdx;
  }
  check('replay: angular speed ≤ 90°/s inside shots', maxAng <= 90.5, `max ${maxAng.toFixed(1)}°/s`);
  check('replay: slow-mo within 0.25–0.5×', minScale >= 0.25 && minScale <= 0.5, `min ${minScale.toFixed(2)}`);
  const hl = ReplayDirector.highlight(frames, events, 60);
  check('replay: highlight ≤ 8 s', hl.t1 - hl.t0 <= 8 + 1e-9 && hl.t1 > hl.t0, `${hl.t0.toFixed(2)}..${hl.t1.toFixed(2)}`);
}

console.log(failures === 0 ? '\nALL CAMERA CHECKS PASSED' : `\n${failures} CAMERA CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
