// SÜRÜ.io camera (§3.8): 3/4 top-down, pitch 55°, height 45 m + 2.2 × flock radius (45–160 m), leader at 40 %
// from the bottom in portrait, 0.8 s look-ahead, critically damped springs ω = 4. No cuts or slow motion in
// live play; KUŞATMA adds an 8 % zoom-out punch. 4 s opening shot rising from the water; end-of-round rise
// over the winner's "Sürü Gösterisi".

import * as THREE from 'three';

const DEG = Math.PI / 180;
const PITCH = 55 * DEG;
const OMEGA = 4;

export type CameraMode = 'opening' | 'play' | 'end';

class Spring {
  x = 0;
  v = 0;
  step(target: number, dt: number, omega = OMEGA): number {
    // critically damped (semi-implicit, stable for large dt)
    const k = omega * omega;
    const c = 2 * omega;
    this.v += (k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
  snap(x: number): void {
    this.x = x;
    this.v = 0;
  }
}

export class SuruCamera {
  readonly cam: THREE.PerspectiveCamera;
  mode: CameraMode = 'opening';
  /** screen-up direction on the water (camera yaw): north (−z) */
  readonly fwd = new THREE.Vector2(0, -1);
  private readonly tx = new Spring();
  private readonly tz = new Spring();
  private readonly th = new Spring();
  private readonly punch = new Spring();
  private punchTarget = 0;
  private openingT = 0;
  private endT = 0;
  private readonly endFrom = new THREE.Vector3();
  private readonly endLookFrom = new THREE.Vector3();
  private initialised = false;
  readonly look = new THREE.Vector3();
  heightNow = 60;

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(60, aspect, 1, 6000);
  }

  setAspect(aspect: number): void {
    this.cam.aspect = aspect;
    // portrait gets a tall frustum, landscape a calmer one
    this.cam.fov = aspect < 1 ? 60 : 44;
    this.cam.updateProjectionMatrix();
  }

  startOpening(): void {
    this.mode = 'opening';
    this.openingT = 0;
    this.initialised = false;
  }

  startEnd(): void {
    if (this.mode === 'end') return;
    this.mode = 'end';
    this.endT = 0;
    this.endFrom.copy(this.cam.position);
    this.endLookFrom.copy(this.look);
  }

  kusatmaPunch(): void {
    this.punchTarget = 0.08;
    this.punch.v += 0.9;
  }

  /** gameplay pose for a subject (leader position + velocity + flock radius) */
  private playPose(x: number, z: number, vx: number, vz: number, radius: number, outPos: THREE.Vector3, outLook: THREE.Vector3, snap: boolean, dt: number): void {
    const H = Math.min(160, Math.max(45, 45 + 2.2 * radius));
    const lx = x + vx * 0.8;
    const lz = z + vz * 0.8;
    const sx = snap ? (this.tx.snap(lx), lx) : this.tx.step(lx, dt);
    const sz = snap ? (this.tz.snap(lz), lz) : this.tz.step(lz, dt);
    const sh = snap ? (this.th.snap(H), H) : this.th.step(H, dt);
    this.punchTarget *= Math.exp(-dt * 2.5);
    const pk = this.punch.step(this.punchTarget, dt);
    const h = sh * (1 + pk);
    this.heightNow = h;
    // leader (flying ~14 m above the water) sits at 40 % from the bottom in portrait
    const alt = 14;
    const he = h - alt;
    const half = (this.cam.fov * DEG) / 2;
    const a = Math.atan(0.2 * Math.tan(half));
    const ahead = he / Math.tan(PITCH) - he / Math.tan(PITCH + a);
    const cx = sx + this.fwd.x * ahead;
    const cz = sz + this.fwd.y * ahead;
    outLook.set(cx, alt, cz);
    const back = he / Math.tan(PITCH);
    outPos.set(cx - this.fwd.x * back, h, cz - this.fwd.y * back);
  }

  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly pPos = new THREE.Vector3();
  private readonly pLook = new THREE.Vector3();

  update(dt: number, x: number, z: number, vx: number, vz: number, radius: number, endCenter?: { x: number; z: number; scale: number }): void {
    const snap = !this.initialised;
    this.initialised = true;
    this.playPose(x, z, vx, vz, radius, this.pPos, this.pLook, snap, Math.min(dt, 0.1));
    if (this.mode === 'opening') {
      this.openingT += dt;
      const k = Math.min(1, this.openingT / 4);
      const e = k * k * (3 - 2 * k);
      // from just above the water, looking toward the low sun across the bay, rising into the play pose
      const ox = x - this.fwd.x * 55;
      const oz = z - this.fwd.y * 55;
      this.tmpA.set(ox + 6, 3.5, oz);
      this.tmpB.set(x + this.fwd.x * 220, 18, z + this.fwd.y * 220);
      this.cam.position.lerpVectors(this.tmpA, this.pPos, e);
      this.look.lerpVectors(this.tmpB, this.pLook, e);
      if (k >= 1) this.mode = 'play';
    } else if (this.mode === 'end' && endCenter) {
      this.endT += dt;
      const k = Math.min(1, this.endT / 3);
      const e = k * k * (3 - 2 * k);
      const H = Math.max(90, endCenter.scale * 3.4);
      this.tmpA.set(endCenter.x - this.fwd.x * H * 0.32, H, endCenter.z - this.fwd.y * H * 0.32);
      this.tmpB.set(endCenter.x, 18, endCenter.z);
      this.cam.position.lerpVectors(this.endFrom, this.tmpA, e);
      this.look.lerpVectors(this.endLookFrom, this.tmpB, e);
    } else {
      this.cam.position.copy(this.pPos);
      this.look.copy(this.pLook);
    }
    this.cam.lookAt(this.look);
  }

  /** world direction for a screen-space stick (sx right, sy up) */
  screenToWorld(sx: number, sy: number, out: THREE.Vector2): THREE.Vector2 {
    // screen up = fwd, screen right = fwd rotated −90° (x = −fwd.z ... ) → right = (−fwd.y, fwd.x)
    const rx = -this.fwd.y;
    const rz = this.fwd.x;
    out.set(this.fwd.x * sy + rx * sx, this.fwd.y * sy + rz * sx);
    return out;
  }
}
