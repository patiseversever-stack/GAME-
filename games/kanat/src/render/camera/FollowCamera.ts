// Gameplay follow camera exactly per brief §2.4 (+ shake rules §2.3). Reads FlightState (+ ProximityInfo) and the
// TerrainSampler; writes a THREE.PerspectiveCamera. Allocation-free per frame.
//
//  - behind direction = 80 % velocity + 20 % body heading; distance 4.2 m (110 km/h) → 6.0 m (230 km/h); +1.1 m
//  - look target = pilot + velocity × 0.35 s; critically damped springs ω = 7 (position), ω = 9 (rotation/target)
//  - roll = 0.5 × pilot bank, ≤ 35°; vertical FOV portrait 74→86°, landscape 48→58° with speed, ≤ 12°/s
//  - terrain protection ≥ 1.5 m (sphere cast pilot→camera against the sampler, smooth push)
//  - "close-up nuance": d < 7 m for > 1 s → 0.3 m lower, 0.5 m closer
//  - options: distance near/normal/far, helmet cam (first person, level horizon), comfort camera
//    (roll × 0.25, no shake, FOV cap 75°, soft vignette at high speed), reduceMotion → no shake
import * as THREE from 'three';
import type { FlightState, ProximityInfo } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { Shake, Spring1, Spring3, approach } from './springs.ts';

export type CameraDistanceOption = 'near' | 'normal' | 'far';

export interface FollowCameraOptions {
  distance: CameraDistanceOption;
  helmet: boolean;
  comfort: boolean;
  reduceMotion: boolean;
  /** Motion sensitivity setting halves the speed-FOV widening (§4.G.9). */
  reducedFovKick: boolean;
}

const DIST_MUL: Record<CameraDistanceOption, number> = { near: 0.82, normal: 1, far: 1.28 };
const DEG = Math.PI / 180;

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  sampler: TerrainSampler | null;
  opts: FollowCameraOptions = { distance: 'normal', helmet: false, comfort: false, reduceMotion: false, reducedFovKick: false };
  readonly shake = new Shake();
  /** Extra vignette requested by the comfort camera (0..0.25), the renderer adds it to the grade. */
  comfortVignette = 0;
  /** Portrait vs landscape is derived from the camera aspect. */
  private pos = new Spring3(7);
  private look = new Spring3(9);
  private roll = new Spring1(9);
  private fov = 74;
  private closeTimer = 0;
  private closeBlend = new Spring1(3);
  private pushUp = new Spring1(10);
  private readonly p = new Float64Array(3);
  private readonly v3 = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private initialized = false;

  constructor(camera: THREE.PerspectiveCamera, sampler: TerrainSampler | null = null) {
    this.camera = camera;
    this.sampler = sampler;
  }

  /** Snap (no smoothing) on the next update — after respawn / cuts. */
  reset(): void {
    this.initialized = false;
    this.pos.initialized = false;
    this.look.initialized = false;
    this.roll.initialized = false;
  }

  private groundAt(x: number, z: number): number {
    return this.sampler ? this.sampler.height(x, z) : -1e9;
  }

  /**
   * @param state flight state (pos = current tick, prevPos = previous tick)
   * @param dt    render delta (s)
   * @param prox  proximity info (defaults to state.prox)
   * @param alpha render interpolation factor between prevPos and pos
   */
  update(state: FlightState, dt: number, prox: ProximityInfo = state.prox, alpha = 1): void {
    const o = this.opts;
    const a = Math.min(1, Math.max(0, alpha));
    const px = state.prevPos[0] + (state.pos[0] - state.prevPos[0]) * a;
    const py = state.prevPos[1] + (state.pos[1] - state.prevPos[1]) * a;
    const pz = state.prevPos[2] + (state.pos[2] - state.prevPos[2]) * a;
    const vx = state.vel[0];
    const vy = state.vel[1];
    const vz = state.vel[2];
    const speed = Math.max(1e-3, Math.hypot(vx, vy, vz));
    const kmh = speed * 3.6;
    const sp01 = Math.min(1, Math.max(0, (kmh - 110) / (230 - 110)));
    const cam = this.camera;
    const portrait = cam.aspect < 1;

    // FOV: linear with speed, rate limited, comfort cap.
    let fovT = portrait ? 74 + 12 * sp01 : 48 + 10 * sp01;
    if (o.reducedFovKick) fovT = portrait ? 74 + 6 * sp01 : 48 + 5 * sp01;
    if (o.comfort) fovT = Math.min(fovT, 75);
    if (o.helmet) fovT = portrait ? 80 : 60;
    this.fov = this.initialized ? approach(this.fov, fovT, 12, dt) : fovT;

    if (o.helmet) {
      // First person: eye at the pilot, looking along velocity, horizon kept level (no roll).
      cam.position.set(px, py + 0.15, pz);
      this.v3.set(px + vx, py + vy, pz + vz);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.v3);
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
      this.initialized = true;
      return;
    }

    // Behind direction: 80 % velocity + 20 % body heading (psi: 0 = −z, clockwise → +x).
    const hx = Math.sin(state.psi);
    const hz = -Math.cos(state.psi);
    let bx = (vx / speed) * 0.8 + hx * 0.2;
    let by = (vy / speed) * 0.8;
    let bz = (vz / speed) * 0.8 + hz * 0.2;
    const bl = Math.hypot(bx, by, bz) || 1;
    bx /= bl;
    by /= bl;
    bz /= bl;

    // Close-up nuance.
    const d = prox && Number.isFinite(prox.d) ? prox.d : Infinity;
    if (d < 7) this.closeTimer += dt;
    else this.closeTimer = 0;
    const close = this.closeBlend.step(this.closeTimer > 1 ? 1 : 0, dt);

    const dist = (4.2 + 1.8 * sp01) * DIST_MUL[o.distance] - 0.5 * close;
    const height = 1.1 - 0.3 * close;
    let tx = px - bx * dist;
    let ty = py - by * dist + height;
    let tz = pz - bz * dist;

    // Terrain protection: sphere cast pilot → camera target (8 samples), keep ≥ 1.5 m clearance.
    let need = 0;
    for (let i = 1; i <= 8; i++) {
      const f = i / 8;
      const sx = px + (tx - px) * f;
      const sy = py + (ty - py) * f;
      const sz = pz + (tz - pz) * f;
      const g = this.groundAt(sx, sz) + 1.5;
      if (sy < g) need = Math.max(need, (g - sy) / Math.max(0.25, f));
    }
    const push = this.pushUp.step(need, dt);
    ty += push;

    if (!this.initialized) {
      this.pos.reset(tx, ty, tz);
      this.look.reset(px + vx * 0.35, py + vy * 0.35, pz + vz * 0.35);
    }
    this.pos.step(tx, ty, tz, dt);
    this.look.step(px + vx * 0.35, py + vy * 0.35, pz + vz * 0.35, dt);
    // Hard floor after smoothing: never inside the rock.
    const cpx = this.pos.pos[0];
    const cpz = this.pos.pos[2];
    const floor = this.groundAt(cpx, cpz) + 1.5;
    if (this.pos.pos[1] < floor) {
      this.pos.pos[1] = floor;
      if (this.pos.vel[1] < 0) this.pos.vel[1] = 0;
    }

    // Roll: 0.5 × bank, ≤ 35°, comfort × 0.25.
    let rollT = Math.max(-35 * DEG, Math.min(35 * DEG, 0.5 * state.phi));
    if (o.comfort) rollT *= 0.25;
    const roll = this.roll.step(rollT, dt);

    // Shake: only proximity (d < 7 m) and crash; none in comfort / reduceMotion.
    this.shake.enabled = !o.comfort && !o.reduceMotion;
    const proxLevel = d < 7 ? (1 - d / 7) * Math.min(1, Math.max(0, (kmh - 110) / 100)) : 0;
    this.shake.drive(proxLevel, dt);
    if (state.phase === 'crashed') this.shake.impulse(1);
    this.shake.update(dt);

    this.comfortVignette = o.comfort ? 0.15 * sp01 : 0;

    cam.position.set(this.pos.pos[0], this.pos.pos[1], this.pos.pos[2]);
    this.v3.set(this.look.pos[0], this.look.pos[1], this.look.pos[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.v3);
    // Roll around the view axis + shake (camera space).
    this.fwd.set(0, 0, -1);
    this.q.setFromAxisAngle(this.fwd, -roll + this.shake.rot[0]);
    cam.quaternion.multiply(this.q);
    this.up.set(1, 0, 0);
    this.q.setFromAxisAngle(this.up, this.shake.rot[1]);
    cam.quaternion.multiply(this.q);
    this.up.set(0, 1, 0);
    this.q.setFromAxisAngle(this.up, this.shake.rot[2]);
    cam.quaternion.multiply(this.q);
    this.v3.set(this.shake.offset[0], this.shake.offset[1], 0).applyQuaternion(cam.quaternion);
    cam.position.add(this.v3);
    // Clearance rule holds after shake too.
    const g2 = this.groundAt(cam.position.x, cam.position.z) + 1.5;
    if (cam.position.y < g2) cam.position.y = g2;
    cam.fov = this.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.p[0] = px;
    this.initialized = true;
  }
}
