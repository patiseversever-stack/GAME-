// 52 kartın tamamı tek bir InstancedMesh ile çizilir (1 çizim çağrısı) + yumuşak gölgeler (1 çizim çağrısı).
// Her "yuva" fiziksel bir karttır; yüzü (hangi kart olduğu) ancak açıldığında atanır → online'a hazır.
import * as THREE from 'three';
import {ATLAS_COLS, ATLAS_ROWS, BACK_INDEX, CORNER_RADIUS, type CardAtlas} from './cardAtlas';
import {CARD, TABLE} from '../game/layout';
import {clamp, ease, type Ease} from '../fx/anim';
import type {Stage} from './stage';

export interface Pose {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
}

interface Flight {
  p0: THREE.Vector3; q0: THREE.Quaternion; s0: number;
  pL: THREE.Vector3; p1: THREE.Vector3; q1: THREE.Quaternion; s1: number;
  t: number; dur: number; slide: number; arc: number; spin: number; bounce: number;
  ease: Ease; landed: boolean;
  onLand?: (impact: number) => void; resolve: () => void;
}

export interface Slot {
  i: number;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
  cell: number; // atlas hücresi (ön yüz); bilinmiyorsa BACK_INDEX
  glow: number;
  shadow: number; // dinlenirken temel gölge opaklığı (yığının üstündeki kart için > 0)
  flight: Flight | null;
  dirty: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

/** Masada yatan kart duruşu. yaw: y ekseni etrafında; faceUp: ön yüz yukarı. */
export function flatQuat(yaw: number, faceUp: boolean, out = new THREE.Quaternion()): THREE.Quaternion {
  out.setFromAxisAngle(UP, yaw);
  if (!faceUp) out.multiply(FLIP);
  return out;
}

function cardGeometry(): THREE.BufferGeometry {
  const w = CARD.w, h = CARD.h, t = CARD.t, r = CORNER_RADIUS * w, seg = 6;
  const outline: [number, number][] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= seg; k++) {
    const a = a0 + (k / seg) * (Math.PI / 2);
    outline.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], face: number[] = [], idx: number[] = [];
  const add = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, vv: number, f: number) => {
    pos.push(x, y, z); nrm.push(nx, ny, nz); uv.push(u, vv); face.push(f);
    return pos.length / 3 - 1;
  };
  // kart düzlemde: x = genişlik, -z = kartın "üstü"; ön yüz +y
  for (const [side, y, ny, f] of [[1, t / 2, 1, 0], [-1, -t / 2, -1, 1]] as const) {
    const c = add(0, y, 0, 0, ny, 0, 0.5, 0.5, f);
    const ids = outline.map(([x, yy]) => add(x, y, -yy, 0, ny, 0, side > 0 ? x / w + 0.5 : 0.5 - x / w, yy / h + 0.5, f));
    for (let k = 0; k < ids.length; k++) {
      const a = ids[k], b = ids[(k + 1) % ids.length];
      if (side > 0) idx.push(c, a, b);
      else idx.push(c, b, a);
    }
  }
  // kenar şeridi
  for (let k = 0; k < outline.length; k++) {
    const [x0, y0] = outline[k], [x1, y1] = outline[(k + 1) % outline.length];
    const nx = y1 - y0, nz = x1 - x0, l = Math.hypot(nx, nz) || 1;
    const a = add(x0, t / 2, -y0, nx / l, 0, nz / l, 0, 0, 2), b = add(x1, t / 2, -y1, nx / l, 0, nz / l, 0, 0, 2);
    const c = add(x0, -t / 2, -y0, nx / l, 0, nz / l, 0, 0, 2), d = add(x1, -t / 2, -y1, nx / l, 0, nz / l, 0, 0, 2);
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 1));
  g.setIndex(idx);
  return g;
}

function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 6, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3();
const spinQ = new THREE.Quaternion();

export class CardSystem {
  readonly slots: Slot[] = [];
  readonly mesh: THREE.InstancedMesh;
  private shadows: THREE.InstancedMesh;
  private cellAttr: THREE.InstancedBufferAttribute;
  private glowAttr: THREE.InstancedBufferAttribute;
  private alphaAttr: THREE.InstancedBufferAttribute;
  private flying = 0;

  constructor(private stage: Stage, atlas: CardAtlas) {
    const tex = new THREE.CanvasTexture(atlas.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(stage.q.anisotropy, stage.renderer.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const geo = cardGeometry();
    const N = 52;
    this.cellAttr = new THREE.InstancedBufferAttribute(new Float32Array(N).fill(BACK_INDEX), 1);
    this.glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    geo.setAttribute('iCell', this.cellAttr);
    geo.setAttribute('iGlow', this.glowAttr);
    const mat = new THREE.MeshLambertMaterial({map: tex});
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aFace; attribute float iCell; attribute float iGlow; varying float vFace; varying float vGlow;`)
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          float cell = aFace < 0.5 ? iCell : ${BACK_INDEX.toFixed(1)};
          float col = mod(cell, ${ATLAS_COLS.toFixed(1)}), row = floor(cell / ${ATLAS_COLS.toFixed(1)});
          vec2 iuv = clamp(uv, 0.004, 0.996); // komşu hücreden renk sızmasın
          vMapUv = vec2((col + iuv.x) / ${ATLAS_COLS.toFixed(1)}, 1.0 - (row + 1.0 - iuv.y) / ${ATLAS_ROWS.toFixed(1)});
          vFace = aFace; vGlow = iGlow;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying float vFace; varying float vGlow;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          if (vFace > 1.5) diffuseColor.rgb = vec3(0.78, 0.74, 0.66);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.72, 0.35) * vGlow * 0.32;`);
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;

    const sg = new THREE.PlaneGeometry(CARD.w * 1.35, CARD.h * 1.25);
    sg.rotateX(-Math.PI / 2);
    this.alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    sg.setAttribute('iAlpha', this.alphaAttr);
    const smat = new THREE.MeshBasicMaterial({map: shadowTexture(), color: 0x000000, transparent: true, depthWrite: false});
    smat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute float iAlpha; varying float vA;`).replace('#include <uv_vertex>', `#include <uv_vertex>
        vA = iAlpha;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying float vA;`).replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.a *= vA;`);
    };
    this.shadows = new THREE.InstancedMesh(sg, smat, N);
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 2;

    for (let i = 0; i < N; i++) {
      this.slots.push({i, pos: new THREE.Vector3(0, -5, 0), quat: new THREE.Quaternion(), scale: 1, cell: BACK_INDEX, glow: 0, shadow: 0, flight: null, dirty: true});
    }
    stage.scene.add(this.shadows, this.mesh);
    stage.onUpdate(() => this.flush());
    this.flush();
  }

  get busy(): boolean {
    return this.flying > 0;
  }

  setCell(s: Slot, cell: number): void {
    if (s.cell === cell) return;
    s.cell = cell;
    this.cellAttr.setX(s.i, cell);
    this.cellAttr.needsUpdate = true;
    this.stage.invalidate();
  }
  setGlow(s: Slot, g: number): void {
    if (s.glow === g) return;
    s.glow = g;
    this.glowAttr.setX(s.i, g);
    this.glowAttr.needsUpdate = true;
    this.stage.invalidate();
  }
  setPose(s: Slot, pos: THREE.Vector3, quat: THREE.Quaternion, scale = 1): void {
    s.pos.copy(pos);
    s.quat.copy(quat);
    s.scale = scale;
    s.dirty = true;
    this.stage.invalidate();
  }

  /**
   * Kartı hedef duruşa uçurur. arc: tepe yüksekliği (m); spin: uçuşta ek dönme (rad);
   * slide: inişten sonra kayma mesafesi (m); bounce: iniş sekmesi (m).
   */
  fly(s: Slot, to: Pose, o: {dur: number; arc?: number; spin?: number; slide?: number; bounce?: number; ease?: Ease; onLand?: (impact: number) => void}): Promise<void> {
    return new Promise(resolve => {
      if (s.flight) s.flight.resolve();
      else this.flying++;
      const slide = o.slide ?? 0;
      const p1 = to.pos.clone();
      const dir = tmpP.copy(p1).sub(s.pos).setY(0);
      const pL = p1.clone();
      if (slide > 0 && dir.lengthSq() > 1e-6) pL.addScaledVector(dir.normalize(), -slide);
      s.flight = {
        p0: s.pos.clone(), q0: s.quat.clone(), s0: s.scale, pL, p1, q1: to.quat.clone(), s1: to.scale,
        t: 0, dur: Math.max(0.01, o.dur), slide, arc: o.arc ?? 0, spin: o.spin ?? 0, bounce: o.bounce ?? 0,
        ease: o.ease ?? ease.outQuad, landed: false, onLand: o.onLand, resolve,
      };
      this.stage.time.addTicker(this.tick);
    });
  }

  /** Tüm uçuşları anında bitir (yeni el / iptal). */
  stopAll(): void {
    for (const s of this.slots) {
      if (!s.flight) continue;
      const f = s.flight;
      s.flight = null;
      this.flying--;
      f.resolve();
    }
  }

  /** Uçuşta kalan süre (oyun zamanı) — yavaş çekimi doğru anda başlatmak için. */
  remaining(s: Slot): number {
    const f = s.flight;
    return f ? Math.max(0, f.dur - f.t) : 0;
  }

  private tick = (dt: number): boolean => {
    if (this.flying > 0) {
      for (const s of this.slots) {
        const f = s.flight;
        if (!f) continue;
        f.t += dt;
        const slideDur = f.slide > 0 ? 0.16 : 0;
        if (f.t < f.dur) {
          const k = f.ease(clamp(f.t / f.dur, 0, 1));
          s.pos.lerpVectors(f.p0, f.pL, k);
          s.pos.y += f.arc * 4 * k * (1 - k);
          const kr = clamp(k / 0.92, 0, 1);
          s.quat.slerpQuaternions(f.q0, f.q1, kr);
          if (f.spin) s.quat.premultiply(spinQ.setFromAxisAngle(UP, f.spin * (1 - kr)));
          s.scale = f.s0 + (f.s1 - f.s0) * k;
        } else {
          if (!f.landed) {
            f.landed = true;
            s.quat.copy(f.q1);
            s.scale = f.s1;
            f.onLand?.(1);
          }
          const u = slideDur > 0 ? clamp((f.t - f.dur) / slideDur, 0, 1) : 1;
          s.pos.lerpVectors(f.pL, f.p1, ease.outCubic(u));
          if (f.bounce) s.pos.y += Math.sin(u * Math.PI) * f.bounce * (1 - u);
          if (u >= 1) {
            s.pos.copy(f.p1);
            s.flight = null;
            this.flying--;
            f.resolve();
          }
        }
        s.dirty = true;
      }
    }
    return this.flying > 0;
  };

  /** Değişen kartların matrislerini GPU'ya yaz. */
  private flush(): void {
    let any = false;
    for (const s of this.slots) {
      if (!s.dirty) continue;
      s.dirty = false;
      any = true;
      tmpS.setScalar(s.scale);
      tmpM.compose(s.pos, s.quat, tmpS);
      this.mesh.setMatrixAt(s.i, tmpM);
      // gölge: masanın üstündeki yüksekliğe göre büyür ve solar
      const hgt = s.pos.y - TABLE.y;
      const onTable = Math.abs(s.pos.x) < 0.45 && Math.abs(s.pos.z) < 0.75 && hgt > -0.01 && hgt < 1.2;
      let a = 0;
      if (onTable) a = s.flight ? clamp(0.42 - (s.pos.y - s.flight.p1.y) * 1.3, 0.05, 0.42) : s.shadow;
      const spread = 1 + clamp(hgt, 0, 0.5) * 1.6;
      tmpQ.setFromAxisAngle(UP, yawOf(s.quat));
      tmpP.set(s.pos.x + hgt * 0.12, TABLE.y + 0.0006, s.pos.z + hgt * 0.1);
      tmpS.set(s.scale * spread, 1, s.scale * spread);
      tmpM.compose(tmpP, tmpQ, tmpS);
      this.shadows.setMatrixAt(s.i, tmpM);
      this.alphaAttr.setX(s.i, a);
    }
    if (any) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.shadows.instanceMatrix.needsUpdate = true;
      this.alphaAttr.needsUpdate = true;
    }
  }

  /** Kartın ekran köşeleri (dokunma testi için). */
  screenQuad(s: Slot, out: {x: number; y: number}[]): void {
    const hw = (CARD.w / 2) * s.scale, hh = (CARD.h / 2) * s.scale;
    const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    for (let k = 0; k < 4; k++) {
      tmpP.set(pts[k][0], 0, -pts[k][1]).applyQuaternion(s.quat).add(s.pos);
      this.stage.project(tmpP, out[k]);
    }
  }
}

const fwd = new THREE.Vector3();
function yawOf(q: THREE.Quaternion): number {
  fwd.set(0, 0, -1).applyQuaternion(q);
  return Math.atan2(-fwd.x, -fwd.z);
}
