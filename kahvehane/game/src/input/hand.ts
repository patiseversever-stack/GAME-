// Oyuncunun eli: kamera önünde yelpaze, parmakla çekip fırlatma ve iki dokunuşla atma.
import * as THREE from 'three';
import type {CardSystem, Slot} from '../render/cards';
import type {Stage} from '../render/stage';
import {CARD, TABLE} from '../game/layout';
import {clamp, smoothstep} from '../fx/anim';

export interface ThrowInfo {
  slot: Slot;
  /** Dünya uzayında bırakma hızı (m/s) */
  vel: THREE.Vector3;
  /** 0..1 fırlatma şiddeti */
  power: number;
  /** Bırakma noktasının yığına göre yatay sapması (m) */
  aimX: number;
}

const HAND_DIST = 0.4; // kameradan uzaklık (m)
const HAND_SCALE = 0.8; // eldeki kart boyutu (masadakine göre)

export class HandInput {
  slots: Slot[] = [];
  enabled = false;
  selected: Slot | null = null;
  onThrow: (t: ThrowInfo) => void = () => {};
  onPick: () => void = () => {};
  onSelect: () => void = () => {};
  private drag: {slot: Slot; id: number; sx: number; sy: number; t0: number; moved: boolean; hist: {x: number; y: number; z: number; t: number}[]} | null = null;
  private quads = [0, 1, 2, 3].map(() => ({x: 0, y: 0}));
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TABLE.y + 0.07));
  private hit = new THREE.Vector3();
  private handQuat = new THREE.Quaternion();

  constructor(private stage: Stage, private cards: CardSystem, private pileAt: () => THREE.Vector3) {
    const el = stage.renderer.domElement;
    el.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move, {passive: true});
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    stage.onUpdate(() => this.follow());
  }

  /** i. kartın eldeki duruşu (kamera önünde yelpaze). */
  restPose(i: number, n: number, lift = 0): {pos: THREE.Vector3; quat: THREE.Quaternion; scale: number} {
    const cam = this.stage.camera;
    cam.updateMatrixWorld();
    const vh = 2 * HAND_DIST * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const vw = vh * cam.aspect;
    const spread = Math.min(CARD.w * 0.84 * HAND_SCALE, (vw * 0.55) / Math.max(1, n));
    const mid = (n - 1) / 2, k = i - mid;
    const local = new THREE.Vector3(k * spread + vw * 0.04, -vh / 2 + CARD.h * HAND_SCALE * 0.2 + lift - Math.abs(k) * 0.005, -HAND_DIST + i * 0.002);
    // kart yerelinde +y ön yüz: önce x etrafında kameraya çevir (biraz geriye yatık), sonra görüş ekseninde yelpaze aç
    const tilt = new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2 - 0.42);
    const fan = new THREE.Quaternion().setFromAxisAngle(Z, -k * 0.075);
    const pos = local.applyMatrix4(cam.matrixWorld);
    const quat = cam.quaternion.clone().multiply(fan).multiply(tilt);
    return {pos, quat, scale: HAND_SCALE};
  }

  layout(animate = true): void {
    const n = this.slots.length;
    this.slots.forEach((s, i) => {
      const p = this.restPose(i, n, s === this.selected ? 0.03 : 0);
      if (this.drag?.slot === s) return;
      if (animate) this.cards.fly(s, p, {dur: 0.22, arc: 0});
      else this.cards.setPose(s, p.pos, p.quat, p.scale);
    });
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    for (const s of this.slots) this.cards.setGlow(s, 0);
    if (!on) this.select(null);
  }

  select(s: Slot | null): void {
    if (this.selected === s) return;
    if (this.selected) this.cards.setGlow(this.selected, 0);
    this.selected = s;
    if (s) {
      this.cards.setGlow(s, 1);
      this.onSelect();
    }
    this.layout(true);
  }

  /** Seçili kartı otomatik fırlat (iki dokunuş / yığına dokunma). */
  throwSelected(): void {
    const s = this.selected;
    if (!s || !this.enabled) return;
    this.release(s, new THREE.Vector3(0, 0.6, -2.4), 0.55, 0);
  }

  private pick(x: number, y: number): Slot | null {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const s = this.slots[i];
      this.cards.screenQuad(s, this.quads);
      if (inQuad(x, y, this.quads)) return s;
    }
    return null;
  }

  private down = (e: PointerEvent) => {
    if (!this.enabled || this.drag) return;
    const s = this.pick(e.clientX, e.clientY);
    if (!s) {
      // yığına dokunulduysa seçili kartı at
      if (this.selected && e.clientY < this.stage.height * 0.72) this.throwSelected();
      return;
    }
    this.drag = {slot: s, id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false, hist: []};
    this.stage.hold(true);
    this.onPick();
  };

  private lastX = 0;
  private lastY = 0;
  private move = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10) {
      d.moved = true;
      if (this.selected && this.selected !== d.slot) this.select(null);
    }
  };

  /** Sürüklenen kartı parmağa bağla: ekranın altında el düzleminde, yukarıda masa üstünde süzülür. */
  private follow(): void {
    const d = this.drag;
    if (!d || !d.moved) return;
    const cam = this.stage.camera;
    const x = this.lastX, y = this.lastY;
    this.ndc.set((x / this.stage.width) * 2 - 1, -(y / this.stage.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, cam);
    const fy = y / this.stage.height;
    const m = smoothstep(0.82, 0.58, fy); // 0: elde, 1: masa üstünde
    const handP = this.ray.ray.at(HAND_DIST * 1.02, tmpA);
    let tableP = handP;
    if (this.ray.ray.intersectPlane(this.plane, this.hit)) tableP = this.hit;
    const pos = tmpB.copy(handP).lerp(tableP, m);
    const rest = this.restPose(this.slots.indexOf(d.slot), this.slots.length);
    this.handQuat.copy(rest.quat);
    const flat = tmpQ.setFromAxisAngle(Y, 0);
    const q = tmpQ2.copy(this.handQuat).slerp(flat, m);
    this.cards.setPose(d.slot, pos, q, HAND_SCALE + m * (1 - HAND_SCALE));
    const now = performance.now();
    d.hist.push({x: pos.x, y: pos.y, z: pos.z, t: now});
    while (d.hist.length > 2 && now - d.hist[0].t > 90) d.hist.shift();
  }

  private up = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this.stage.hold(false);
    if (!d.moved) {
      // dokunma: seç / ikinci dokunuşta at
      if (this.selected === d.slot) this.throwSelected();
      else this.select(d.slot);
      return;
    }
    const h = d.hist, a = h[0], b = h[h.length - 1];
    const dt = Math.max(0.016, (b.t - a.t) / 1000);
    const vel = new THREE.Vector3((b.x - a.x) / dt, (b.y - a.y) / dt, (b.z - a.z) / dt);
    const fy = this.lastY / this.stage.height;
    const towardTable = -vel.z;
    if (towardTable > 0.9 || fy < 0.6) {
      const power = clamp((towardTable - 0.6) / 3.5, 0.15, 1);
      this.release(d.slot, vel, power, clamp((b.x - this.pileAt().x) * 0.25, -0.03, 0.03));
    } else {
      this.layout(true);
    }
  };

  private release(s: Slot, vel: THREE.Vector3, power: number, aimX: number): void {
    this.select(null);
    this.enabled = false;
    this.slots = this.slots.filter(x => x !== s);
    this.layout(true);
    this.onThrow({slot: s, vel, power, aimX});
  }
}

const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();

function inQuad(x: number, y: number, q: {x: number; y: number}[]): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c !== 0) {
      if (sign === 0) sign = Math.sign(c);
      else if (Math.sign(c) !== sign) return false;
    }
  }
  return true;
}
