// Photo mode camera (§2.5 Foto Modu): free orbit around the pilot (radius ≤ 30 m), FOV 20–90°, roll ±15°,
// exposure ±2 EV, 6 filters as grade presets (looks.ts PHOTO_FILTERS), terrain-protected. The grade is restored
// on exit(). Ultra: optional DOF focus distance for the post pipeline.
import * as THREE from 'three';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { PHOTO_FILTERS, type GradeParams } from '../looks.ts';
import { atmosphereState, setGrade } from '../shaders/atmosphere.ts';

const DEG = Math.PI / 180;

export class PhotoCamera {
  readonly camera: THREE.PerspectiveCamera;
  sampler: TerrainSampler | null;
  yaw = 0;
  pitch = -10 * DEG;
  radius = 8;
  fov = 50;
  roll = 0;
  ev = 0;
  filter = 'natural';
  readonly target = new THREE.Vector3();
  private baseGrade: GradeParams | null = null;
  private readonly tmp = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3(0, 0, -1);

  constructor(camera: THREE.PerspectiveCamera, sampler: TerrainSampler | null = null) {
    this.camera = camera;
    this.sampler = sampler;
  }

  enter(tx: number, ty: number, tz: number, headingRad = 0): void {
    this.target.set(tx, ty, tz);
    this.yaw = headingRad + Math.PI * 0.8;
    this.baseGrade = { ...atmosphereState.grade };
    this.applyGrade();
  }

  exit(): void {
    if (this.baseGrade) setGrade(this.baseGrade);
    this.baseGrade = null;
  }

  orbit(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(-80 * DEG, Math.min(80 * DEG, this.pitch + dPitch));
  }

  setRadius(r: number): void {
    this.radius = Math.max(2, Math.min(30, r));
  }

  setFov(f: number): void {
    this.fov = Math.max(20, Math.min(90, f));
  }

  setRoll(deg: number): void {
    this.roll = Math.max(-15, Math.min(15, deg)) * DEG;
  }

  setExposure(ev: number): void {
    this.ev = Math.max(-2, Math.min(2, ev));
    this.applyGrade();
  }

  setFilter(id: string): void {
    this.filter = PHOTO_FILTERS[id] ? id : 'natural';
    this.applyGrade();
  }

  private applyGrade(): void {
    const base = this.baseGrade ?? atmosphereState.grade;
    const f = PHOTO_FILTERS[this.filter] ?? {};
    setGrade({ ...base, ...f, exposure: base.exposure * Math.pow(2, this.ev) });
  }

  /** Focus distance for the Ultra DOF pass. */
  get focusDistance(): number {
    return this.radius;
  }

  update(): void {
    const cam = this.camera;
    const cp = Math.cos(this.pitch);
    this.tmp.set(
      this.target.x - Math.sin(this.yaw) * cp * this.radius,
      this.target.y - Math.sin(this.pitch) * this.radius,
      this.target.z + Math.cos(this.yaw) * cp * this.radius,
    );
    if (this.sampler) {
      const g = this.sampler.height(this.tmp.x, this.tmp.z) + 1.2;
      if (this.tmp.y < g) this.tmp.y = g;
    }
    cam.position.copy(this.tmp);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.target);
    this.q.setFromAxisAngle(this.axis, this.roll);
    cam.quaternion.multiply(this.q);
    cam.fov = this.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
