// 6 s route intro (§2.4 "Rota tanıtımı"): (1) 0–2 s wide establishing aerial, FOV 50°, slow 2 m/s dolly;
// (2) 2–4.5 s preview along the route spline at 3× flight speed from above-behind while gates glow;
// (3) 4.5–6 s close-up of the jump point with a gentle push-in. Cuts between the three shots (cinematic grammar),
// eased motion inside each shot, terrain clearance ≥ 10 m. Allocation-free per frame.
import * as THREE from 'three';
import type { RouteDef } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';

const ease = (t: number) => t * t * (3 - 2 * t);

/** Centripetal-ish Catmull-Rom on the route line (uniform parameter, adequate for preview motion). */
export function routePoint(line: readonly [number, number, number][], u: number, out: THREE.Vector3): THREE.Vector3 {
  const n = line.length;
  if (n === 0) return out.set(0, 0, 0);
  if (n === 1) return out.set(line[0][0], line[0][1], line[0][2]);
  const f = Math.min(0.99999, Math.max(0, u)) * (n - 1);
  const i = Math.floor(f);
  const t = f - i;
  const p0 = line[Math.max(0, i - 1)];
  const p1 = line[i];
  const p2 = line[Math.min(n - 1, i + 1)];
  const p3 = line[Math.min(n - 1, i + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  const c = (a: number, b: number, cc: number, d: number) =>
    0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
  return out.set(c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2]));
}

export class IntroCamera {
  readonly camera: THREE.PerspectiveCamera;
  sampler: TerrainSampler | null;
  readonly duration = 6;
  /** 0..1 gate highlight for render-props / UI during the preview shot. */
  gateGlow = 0;
  shot: 'establish' | 'preview' | 'closeup' | 'done' = 'establish';
  private route: RouteDef | null = null;
  private lineLen = 1;
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, sampler: TerrainSampler | null = null) {
    this.camera = camera;
    this.sampler = sampler;
  }

  setRoute(route: RouteDef): void {
    this.route = route;
    let len = 0;
    for (let i = 1; i < route.line.length; i++) {
      const p = route.line[i - 1];
      const q = route.line[i];
      len += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    }
    this.lineLen = Math.max(1, len);
  }

  private clear(v: THREE.Vector3, m: number): void {
    if (!this.sampler) return;
    const g = this.sampler.height(v.x, v.z) + m;
    if (v.y < g) v.y = g;
  }

  /** t = seconds since the intro started. Returns true when finished. */
  update(t: number): boolean {
    const r = this.route;
    const cam = this.camera;
    if (!r) return true;
    const s = r.start;
    const hd = (s.headingDeg * Math.PI) / 180;
    const fx = Math.sin(hd);
    const fz = -Math.cos(hd);
    cam.up.set(0, 1, 0);
    if (t < 2) {
      // (1) Establishing: high, behind-left of the start, looking over the route; 2 m/s dolly forward.
      this.shot = 'establish';
      routePoint(r.line, 0.45, this.mid);
      const k = ease(t / 2);
      this.a.set(s.pos[0] - fx * 320 - fz * 120, s.pos[1] + 150, s.pos[2] - fz * 320 + fx * 120);
      this.a.x += fx * 2 * t;
      this.a.z += fz * 2 * t;
      this.a.y -= 4 * k;
      this.clear(this.a, 40);
      cam.position.copy(this.a);
      this.b.copy(this.mid).lerp(this.c.set(s.pos[0], s.pos[1], s.pos[2]), 0.35);
      cam.lookAt(this.b);
      cam.fov = 50;
      this.gateGlow = 0;
    } else if (t < 4.5) {
      // (2) Preview at 3× route speed along the spline, from 45 m above and 30 m behind.
      this.shot = 'preview';
      const tt = (t - 2) / 2.5;
      const speed = (s.speedKmh / 3.6) * 3;
      const u0 = Math.min(0.8, (speed * 2.5) / this.lineLen);
      const u = ease(tt) * u0;
      routePoint(r.line, u, this.a);
      routePoint(r.line, Math.min(1, u + 0.02), this.b);
      const dx = this.b.x - this.a.x;
      const dz = this.b.z - this.a.z;
      const dl = Math.hypot(dx, dz) || 1;
      this.c.set(this.a.x - (dx / dl) * 30, this.a.y + 45, this.a.z - (dz / dl) * 30);
      this.clear(this.c, 10);
      cam.position.copy(this.c);
      routePoint(r.line, Math.min(1, u + 0.06), this.b);
      cam.lookAt(this.b);
      cam.fov = 60;
      this.gateGlow = Math.min(1, tt * 4) * (1 - Math.max(0, tt - 0.85) / 0.15);
    } else if (t < this.duration) {
      // (3) Close-up of the jump point: side 7 m, 2.5 m up, slow push-in.
      this.shot = 'closeup';
      const tt = ease((t - 4.5) / 1.5);
      const side = 7 - 2 * tt;
      this.a.set(s.pos[0] - fz * side - fx * 3, s.pos[1] + 2.5, s.pos[2] + fx * side - fz * 3);
      this.clear(this.a, 1.5);
      cam.position.copy(this.a);
      this.b.set(s.pos[0] + fx * 6, s.pos[1] - 1, s.pos[2] + fz * 6);
      cam.lookAt(this.b);
      cam.fov = 45;
      this.gateGlow = 0;
    } else {
      this.shot = 'done';
      return true;
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return false;
  }
}
