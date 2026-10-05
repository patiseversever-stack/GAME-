// Kesme simülasyonu: hesaplayıcıdaki değerlerle canlı 3D talaş kaldırma.
// Devir → dönüş hızı (ağır çekim), ilerleme → takımın yürüme hızı, fn/fz → talaş kalınlığı,
// ap/ae → kesilen kademe, Vc ve ISO malzeme → talaş rengi, ısı, kıvılcım.
// Torna: üç ayaklı aynada dönen mil, kater pasoyla ilerler (kaba tornalama döngüsü).
// Freze: blokta omuz frezeleme, kesilen kademe görünür. Delme ve kılavuz: yarıya kesilmiş blok
// (kesit görünüşü) içinde matkap/kılavuz, oluktan yükselen talaşlar ve oluşan diş profili.
import * as THREE from 'three';
import { studioEnvironment } from '../three/studio';
import { toolMaterials, buildTurningHolder, buildEndMill, buildDrill, buildTap, buildBT40 } from '../three/tools3d';
import { chipRibbon, canvas, normalFrom } from '../showcase/fx-machining';

export type Op = 'torna' | 'freze' | 'delme' | 'kilavuz';
export type Iso = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
export interface SimInput {
  op: Op; iso: Iso;
  d: number; n: number; vc: number; vf: number;
  fn?: number; fz?: number; z?: number; ap?: number; ae?: number; p?: number;
  /** Vc / önerilen aralığın ortası (1 = ideal) */
  vcRel: number;
  zone: 'below' | 'in' | 'above' | 'none';
}

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const ok = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/* ======================= Malzeme görünüşleri ======================= */
const WORK: Record<Iso, { raw: number; rawR: number; cut: number; cutR: number; metal: number }> = {
  P: { raw: 0x80858c, rawR: 0.5, cut: 0xb4bac1, cutR: 0.22, metal: 1 },
  M: { raw: 0x9ca1a8, rawR: 0.4, cut: 0xd3d7dc, cutR: 0.17, metal: 1 },
  K: { raw: 0x5d6065, rawR: 0.75, cut: 0x8e9196, cutR: 0.42, metal: 0.6 },
  N: { raw: 0xb2b6bc, rawR: 0.38, cut: 0xe2e5e9, cutR: 0.14, metal: 1 },
  S: { raw: 0x7d7f82, rawR: 0.46, cut: 0xb2b0ad, cutR: 0.24, metal: 1 },
  H: { raw: 0x5a5f65, rawR: 0.32, cut: 0x9aa0a6, cutR: 0.15, metal: 1 },
};
type ChipKind = 'curl' | 'long' | 'frag';
const CHIP: Record<Iso, { kind: ChipKind; spark: number; dust: number }> = {
  P: { kind: 'curl', spark: 0, dust: 0 },
  M: { kind: 'long', spark: 0, dust: 0 },
  K: { kind: 'frag', spark: 0, dust: 1 },
  N: { kind: 'long', spark: 0, dust: 0 },
  S: { kind: 'curl', spark: 0.35, dust: 0 },
  H: { kind: 'frag', spark: 1, dust: 0.3 },
};
/** Meneviş (tav) renkleri: gümüş → saman → bronz → mor → mavi */
const TEMPER = [0xc9cdd2, 0xd9b26a, 0xb0703c, 0x6c4c94, 0x3d5fae].map((c) => new THREE.Color(c));
function chipColor(iso: Iso, heat: number, out: THREE.Color) {
  if (iso === 'N') return out.setHex(0xdfe2e6).multiplyScalar(rnd(0.85, 1.05));
  if (iso === 'K') return out.setHex(0x55585c).multiplyScalar(rnd(0.8, 1.1));
  const t = clamp(heat * 3.2 + rnd(-0.45, 0.45), 0, 3.999);
  const i = Math.floor(t);
  return out.copy(TEMPER[i]).lerp(TEMPER[i + 1], t - i);
}

/* ======================= Dokular ======================= */
function rawTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = 'rgb(200,200,200)';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = rnd(0, 256), y = rnd(0, 256), r = rnd(6, 34);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.random() > 0.5 ? 255 : 90;
    grd.addColorStop(0, `rgba(${v},${v},${v},${rnd(0.05, 0.14)})`);
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** İnce, düzenli yiv izleri (tornalanmış yüzey / delik içi) */
function stripeNormal() {
  const [c, g] = canvas(64, 256);
  for (let y = 0; y < 256; y++) {
    const v = 128 + Math.sin((y / 256) * TAU * 16) * 60 + rnd(-10, 10);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 64, 1);
  }
  const t = normalFrom(c, 1.4);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Freze tabanı: iç içe yaylar */
function arcNormal() {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  for (let k = -2; k < 6; k++) {
    for (let r = 20; r < S * 0.9; r += 7) {
      g.strokeStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},0,0,${rnd(0.04, 0.12)})`;
      g.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${rnd(0.05, 0.14)})` : `rgba(0,0,0,${rnd(0.05, 0.14)})`;
      g.lineWidth = rnd(1, 2.4);
      g.beginPath();
      g.arc(k * 48, S / 2, r, -Math.PI / 2, Math.PI / 2);
      g.stroke();
    }
  }
  const t = normalFrom(c, 1.0);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function glowTexture() {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,240,200,1)');
  grd.addColorStop(0.25, 'rgba(255,150,50,0.55)');
  grd.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dotTexture() {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* ======================= Talaş havuzu ======================= */
class ChipPool {
  mesh: THREE.InstancedMesh;
  n: number;
  P: Float32Array; V: Float32Array; Q: Float32Array; W: Float32Array; S: Float32Array;
  age: Float32Array; life: Float32Array; on: Uint8Array;
  /** Oluk boyunca yükselme (delme/kılavuz): 1 iken konum helis üzerinde hesaplanır */
  guided: Uint8Array; gx: Float32Array; gz: Float32Array; gt: Float32Array; gr: Float32Array; gw: Float32Array; gu: Float32Array; gtop: Float32Array;
  private cursor = 0;
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private dq = new THREE.Quaternion();
  private p = new THREE.Vector3(); private s = new THREE.Vector3(); private ax = new THREE.Vector3();
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, n: number) {
    this.n = n;
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const f = (k: number) => new Float32Array(n * k);
    this.P = f(3); this.V = f(3); this.Q = f(4); this.W = f(3); this.S = f(1);
    this.age = f(1); this.life = f(1); this.on = new Uint8Array(n);
    this.guided = new Uint8Array(n); this.gx = f(1); this.gz = f(1); this.gt = f(1); this.gr = f(1); this.gw = f(1); this.gu = f(1); this.gtop = f(1);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { this.mesh.setMatrixAt(i, zero); this.mesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
  }
  spawn(p: THREE.Vector3, v: THREE.Vector3, scale: number, color: THREE.Color, life: number, spin = 8) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.on[i] = 1; this.guided[i] = 0; this.age[i] = 0; this.life[i] = life; this.S[i] = scale;
    this.P.set([p.x, p.y, p.z], i * 3);
    this.V.set([v.x, v.y, v.z], i * 3);
    this.q.setFromEuler(new THREE.Euler(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)));
    this.Q.set([this.q.x, this.q.y, this.q.z, this.q.w], i * 4);
    this.W.set([rnd(-spin, spin), rnd(-spin, spin), rnd(-spin, spin)], i * 3);
    this.mesh.setColorAt(i, color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return i;
  }
  /** Delikten oluk boyunca yükselen talaş */
  guide(i: number, cx: number, cz: number, theta: number, r: number, omega: number, up: number, top: number) {
    this.guided[i] = 1; this.gx[i] = cx; this.gz[i] = cz; this.gt[i] = theta; this.gr[i] = r; this.gw[i] = omega; this.gu[i] = up; this.gtop[i] = top;
  }
  update(dt: number, floorAt: (x: number, z: number) => number, shift = 0) {
    const { P, V, Q, W } = this;
    for (let i = 0; i < this.n; i++) {
      if (!this.on[i]) continue;
      this.age[i] += dt;
      const k3 = i * 3, k4 = i * 4;
      if (this.age[i] > this.life[i]) {
        this.on[i] = 0;
        this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        continue;
      }
      if (shift) P[k3] += shift;
      if (this.guided[i]) {
        this.gt[i] += this.gw[i] * dt;
        P[k3 + 1] += this.gu[i] * dt;
        this.gx[i] += shift;
        P[k3] = this.gx[i] + Math.cos(this.gt[i]) * this.gr[i];
        P[k3 + 2] = this.gz[i] + Math.sin(this.gt[i]) * this.gr[i];
        if (P[k3 + 1] >= this.gtop[i]) {
          this.guided[i] = 0;
          const tx = -Math.sin(this.gt[i]) * Math.sign(this.gw[i]), tz = Math.cos(this.gt[i]) * Math.sign(this.gw[i]);
          V[k3] = tx * rnd(1.2, 2.4) + Math.cos(this.gt[i]) * 0.8; V[k3 + 1] = rnd(1.5, 3); V[k3 + 2] = tz * rnd(1.2, 2.4) + Math.sin(this.gt[i]) * 0.8 + 0.6;
        }
      } else {
        V[k3 + 1] -= 7.5 * dt;
        const drag = 1 - 0.5 * dt;
        V[k3] *= drag; V[k3 + 1] *= drag; V[k3 + 2] *= drag;
        P[k3] += V[k3] * dt; P[k3 + 1] += V[k3 + 1] * dt; P[k3 + 2] += V[k3 + 2] * dt;
        const fy = floorAt(P[k3], P[k3 + 2]);
        if (P[k3 + 1] < fy) {
          P[k3 + 1] = fy;
          V[k3 + 1] = Math.abs(V[k3 + 1]) * 0.22;
          V[k3] *= 0.45; V[k3 + 2] *= 0.45;
          W[k3] *= 0.4; W[k3 + 1] *= 0.4; W[k3 + 2] *= 0.4;
        }
      }
      // Dönüş
      this.ax.set(W[k3], W[k3 + 1], W[k3 + 2]);
      const w = this.ax.length();
      this.q.set(Q[k4], Q[k4 + 1], Q[k4 + 2], Q[k4 + 3]);
      if (w > 1e-4) { this.dq.setFromAxisAngle(this.ax.multiplyScalar(1 / w), w * dt); this.q.premultiply(this.dq); }
      Q[k4] = this.q.x; Q[k4 + 1] = this.q.y; Q[k4 + 2] = this.q.z; Q[k4 + 3] = this.q.w;
      const fade = Math.min(1, (this.life[i] - this.age[i]) / 0.5, this.age[i] / 0.06);
      const s = this.S[i] * Math.max(0, fade);
      this.p.set(P[k3], P[k3 + 1], P[k3 + 2]);
      this.mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s.set(s, s, s)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.on.fill(0);
    const z = this.m.makeScale(0, 0, 0);
    for (let i = 0; i < this.n; i++) this.mesh.setMatrixAt(i, z);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ======================= Kıvılcım ======================= */
class Sparks {
  lines: THREE.LineSegments;
  n: number; P: Float32Array; V: Float32Array; age: Float32Array; life: Float32Array; cursor = 0;
  pos: THREE.BufferAttribute; col: THREE.BufferAttribute;
  constructor(n: number) {
    this.n = n;
    this.P = new Float32Array(n * 3); this.V = new Float32Array(n * 3); this.age = new Float32Array(n); this.life = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
    this.col = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pos);
    g.setAttribute('color', this.col);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.lines.frustumCulled = false;
  }
  spawn(p: THREE.Vector3, v: THREE.Vector3) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.P.set([p.x, p.y, p.z], i * 3);
    this.V.set([v.x, v.y, v.z], i * 3);
    this.age[i] = 0;
    this.life[i] = rnd(0.25, 0.7);
  }
  update(dt: number) {
    const a = this.pos.array as Float32Array, c = this.col.array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, k6 = i * 6;
      this.age[i] += dt;
      const t = this.age[i] / (this.life[i] || 1);
      if (t >= 1) { a.fill(0, k6, k6 + 6); c.fill(0, k6, k6 + 6); continue; }
      this.V[k + 1] -= 6 * dt;
      for (let j = 0; j < 3; j++) this.P[k + j] += this.V[k + j] * dt;
      for (let j = 0; j < 3; j++) { a[k6 + j] = this.P[k + j]; a[k6 + 3 + j] = this.P[k + j] - this.V[k + j] * 0.03; }
      const b = 1 - t;
      c[k6] = 2.2 * b; c[k6 + 1] = 1.5 * b * b; c[k6 + 2] = 0.6 * b * b * b;
      c[k6 + 3] = 0.8 * b; c[k6 + 4] = 0.3 * b * b; c[k6 + 5] = 0.05 * b;
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

/* ======================= Simülatör ======================= */
export interface SimApi { set(input: SimInput): void; pause(on: boolean): void }

export function startSim(stage: HTMLElement): SimApi {
  const canvasEl = stage.querySelector<HTMLCanvasElement>('[data-sim-canvas]')!;
  const fine = matchMedia('(pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, true);
  const camera = new THREE.PerspectiveCamera(30, 2, 0.05, 200);
  const mats = toolMaterials();

  /* ---------- Ortak malzemeler ---------- */
  const rawTex = rawTexture();
  const stripes = stripeNormal();
  const arcs = arcNormal();
  const rawMat = new THREE.MeshPhysicalMaterial({ map: rawTex, metalness: 1, roughness: 0.5 });
  const cutMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.22, normalMap: stripes, normalScale: new THREE.Vector2(0.35, 0.35) });
  const floorMillMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.24, normalMap: arcs, normalScale: new THREE.Vector2(0.5, 0.5) });
  const sectionMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  const boreStripes = stripes.clone();
  boreStripes.repeat.set(1, 6);
  const boreMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.32, side: THREE.BackSide, normalMap: boreStripes, normalScale: new THREE.Vector2(0.12, 0.12) });
  const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });
  const tableMat = new THREE.MeshPhysicalMaterial({ color: 0x1d2024, metalness: 0.7, roughness: 0.55 });
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.9 });
  function applyIso(iso: Iso) {
    const w = WORK[iso];
    rawMat.color.setHex(w.raw); rawMat.roughness = w.rawR; rawMat.metalness = w.metal;
    for (const m of [cutMat, floorMillMat, sectionMat]) { m.color.setHex(w.cut); m.roughness = w.cutR; m.metalness = w.metal; }
    sectionMat.roughness = w.cutR + 0.12;
    boreMat.color.setHex(w.cut).multiplyScalar(0.7); boreMat.roughness = w.cutR + 0.1; boreMat.metalness = w.metal;
  }

  /* ---------- Talaş, kıvılcım, toz, ısı ---------- */
  const chipMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, side: THREE.DoubleSide, iridescence: 0.4, iridescenceThicknessRange: [200, 520] });
  const pools: Record<ChipKind, ChipPool> = {
    curl: new ChipPool(chipRibbon(0.9, 1, 0.18, 0.55, 0.45, 36), chipMat, 220),
    long: new ChipPool(chipRibbon(3.2, 1, 0.55, 0.42, 0.25, 90), chipMat, 70),
    frag: new ChipPool(new THREE.TetrahedronGeometry(0.5, 0), chipMat, 260),
  };
  Object.values(pools).forEach((p) => scene.add(p.mesh));
  const sparks = new Sparks(220);
  scene.add(sparks.lines);
  const dustN = 160;
  const dustGeo = new THREE.BufferGeometry();
  const dustP = new Float32Array(dustN * 3), dustV = new Float32Array(dustN * 3), dustA = new Float32Array(dustN).fill(9);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dotTexture(), color: 0x8a8d92, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false }));
  dust.frustumCulled = false;
  scene.add(dust);
  let dustCursor = 0;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  scene.add(glow);
  const heatLight = new THREE.PointLight(0xff7a2a, 0, 4, 2);
  scene.add(heatLight);

  /* ---------- Canlı parametreler (yumuşatılır) ---------- */
  let input: SimInput = { op: 'torna', iso: 'P', d: 50, n: 1592, vc: 250, vf: 398, fn: 0.25, ap: 2, vcRel: 1, zone: 'in' };
  const live = { spin: 1.4, spinT: 1.4, feed: 0.5, feedT: 0.5, heat: 0.3, heatT: 0.3, chip: 1, chipT: 1, apv: 0.2, apvT: 0.2, aev: 0.3, aevT: 0.3, pv: 0.15, pvT: 0.15 };
  let angle = 0; // takım/iş mili açısı (tur cinsinden değil, radyan)
  let paused = reduce;
  const tmpV = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color();

  /* ======================= TORNA ======================= */
  const turn = new THREE.Group();
  scene.add(turn);
  const T = { L: 5.4, R: 1.35, Ro: 1.35, x: 5.5, z: 0, phase: 'in' as 'in' | 'cut' | 'out' | 'back', rawOuter: true };
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true).rotateZ(-Math.PI / 2).translate(0.5, 0, 0);
  const tSpin = new THREE.Group();
  turn.add(tSpin);
  const tUncut = new THREE.Mesh(unitCyl, rawMat);
  const tCut = new THREE.Mesh(unitCyl, cutMat);
  tSpin.add(tUncut, tCut);
  const tEnd = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateY(Math.PI / 2), cutMat);
  tSpin.add(tEnd);
  let tShoulder = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateY(Math.PI / 2), cutMat);
  tSpin.add(tShoulder);
  // Ayna: gövde + üç ayak
  const chuck = new THREE.Group();
  chuck.add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, -1.5), new THREE.Vector2(2.35, -1.5), new THREE.Vector2(2.5, -1.35), new THREE.Vector2(2.5, -0.22), new THREE.Vector2(2.3, -0.05), new THREE.Vector2(0.6, -0.05), new THREE.Vector2(0.6, 0)], 72).rotateZ(-Math.PI / 2), mats.polished));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const jaw = new THREE.Group();
    const j1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.55), mats.black);
    j1.position.set(0.25, T.R + 0.25, 0);
    const j2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.55), mats.black);
    j2.position.set(-0.2, T.R + 0.7, 0);
    jaw.add(j1, j2);
    jaw.rotation.x = a;
    chuck.add(jaw);
  }
  // Ayna ağzında sıkılan ham stok (pasolar buraya kadar gelmez)
  const tStub = new THREE.Mesh(unitCyl, rawMat);
  tStub.position.x = -0.1;
  tStub.scale.set(0.7, T.R, T.R);
  tSpin.add(chuck, tStub);
  const tTool = new THREE.Group();
  const turningHolder = buildTurningHolder(mats);
  turningHolder.scale.setScalar(0.032);
  turningHolder.rotation.y = Math.PI / 2;
  tTool.add(turningHolder);
  turn.add(tTool);
  const tFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 8).rotateX(-Math.PI / 2), tableMat);
  tFloor.position.set(2.5, -2.4, 0.5);
  turn.add(tFloor);
  let tChipAcc = 0;
  function turnLayout() {
    const Rc = Math.max(0.35, T.Ro - live.apv);
    const xc = clamp(T.phase === 'cut' || T.phase === 'out' ? T.x : T.L, 0, T.L);
    tUncut.position.x = 0; tUncut.scale.set(Math.max(0.001, xc), T.Ro, T.Ro);
    tUncut.material = T.rawOuter ? rawMat : cutMat;
    tCut.position.x = xc; tCut.scale.set(Math.max(0.001, T.L - xc), Rc, Rc);
    tCut.visible = xc < T.L - 0.001;
    tEnd.position.x = T.L; tEnd.scale.setScalar(tCut.visible ? Rc : T.Ro);
    tEnd.material = tCut.visible ? cutMat : T.rawOuter ? rawMat : cutMat;
    tShoulder.position.x = xc;
    tShoulder.visible = tCut.visible;
    const inner = Rc / T.Ro;
    if (Math.abs((tShoulder.userData.inner ?? 0) - inner) > 0.004) {
      tShoulder.geometry.dispose();
      tShoulder.geometry = new THREE.RingGeometry(inner, 1, 64).rotateY(Math.PI / 2);
      tShoulder.userData.inner = inner;
    }
    tShoulder.scale.setScalar(T.Ro);
    rawTex.repeat.set(2, 1);
    stripes.repeat.set(1, 30);
    tTool.position.set(T.x, 0, Rc + T.z);
    return Rc;
  }
  function turnUpdate(dt: number) {
    tSpin.rotation.x = angle;
    const Rc = Math.max(0.35, T.Ro - live.apv);
    let cutting = false;
    if (T.phase === 'in') {
      T.x = T.L + 0.12;
      T.z = damp(T.z, 0, 8, dt);
      if (T.z < 0.01) { T.z = 0; T.phase = 'cut'; }
    } else if (T.phase === 'cut') {
      T.x -= live.feed * dt;
      cutting = T.x < T.L;
      if (T.x <= 0.72) T.phase = 'out';
    } else if (T.phase === 'out') {
      T.z += 3 * dt;
      if (T.z > 0.6) {
        T.phase = 'back';
        // Paso tamamlandı: dış çap artık işlenmiş çap
        T.Ro = Rc; T.rawOuter = false;
        if (T.Ro - live.apv < 0.42) { T.Ro = T.R; T.rawOuter = true; } // yeni parça
      }
    } else if (T.phase === 'back') {
      T.x += 7 * dt;
      if (T.x >= T.L + 0.12) T.phase = 'in';
    }
    turnLayout();
    // Talaş: kesme köşesinden yukarı ve öne
    if (cutting) {
      const ck = CHIP[input.iso];
      const rate = (ck.kind === 'long' ? 2.2 : ck.kind === 'frag' ? 16 : 7) * live.spin;
      tChipAcc += rate * dt;
      tmpP.set(T.x + 0.04, 0.05, Rc + 0.06);
      while (tChipAcc > 1) {
        tChipAcc -= 1;
        const s = (ck.kind === 'long' ? 0.17 : ck.kind === 'frag' ? 0.05 : 0.12) * live.chip;
        tmpV.set(rnd(0.3, 1.1), rnd(1.6, 3.2), rnd(0.5, 1.8));
        if (ck.kind === 'long') tmpV.multiplyScalar(0.6);
        pools[ck.kind].spawn(tmpP, tmpV, s, chipColor(input.iso, live.heat, tmpC), ck.kind === 'long' ? 3.2 : 2.6, ck.kind === 'long' ? 3 : 9);
      }
      fxAt(tmpP, live.spin, cutting);
    } else fxAt(tmpP, live.spin, false);
  }
  const turnFloor = () => -2.4;

  /* ======================= FREZE ======================= */
  const mill = new THREE.Group();
  scene.add(mill);
  const M = { L: 7, W: 3, H: 1.4, x: 4.4, y: 0, phase: 'down' as 'down' | 'cut' | 'up' | 'back', xCut: 3.5, z: 4 };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  // Malzeme sırası: +x, -x, +y, -y, +z, -z
  const mA = new THREE.Mesh(unitBox, [rawMat, rawMat, floorMillMat, rawMat, rawMat, rawMat]);
  const mB = new THREE.Mesh(unitBox, [rawMat, rawMat, rawMat, rawMat, cutMat, rawMat]);
  const mC = new THREE.Mesh(unitBox, [cutMat, rawMat, rawMat, rawMat, rawMat, rawMat]);
  mill.add(mA, mB, mC);
  const mTable = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 6), tableMat);
  mTable.position.set(0, -M.H - 0.15, 0);
  mill.add(mTable);
  const mSpindle = new THREE.Group();
  const millHolder = buildBT40(mats, false);
  millHolder.scale.setScalar(0.1);
  mSpindle.add(millHolder);
  let endMill = buildEndMill(mats, { D: 10, z: 4, Lf: 22, L: 64 });
  endMill.scale.setScalar(0.1);
  const mToolSpin = new THREE.Group();
  mToolSpin.add(endMill);
  mSpindle.add(mToolSpin);
  mill.add(mSpindle);
  let millZBuilt = 4;
  let millRebuild = 0;
  let mChipAcc = 0;
  function millLayout() {
    const { L, W, H } = M;
    const apv = live.apv, aev = live.aev;
    mA.scale.set(L, H - apv, W); mA.position.set(0, -apv - (H - apv) / 2, 0);
    mB.scale.set(L, apv, W - aev); mB.position.set(0, -apv / 2, -aev / 2);
    const cl = clamp(M.xCut + L / 2, 0.0001, L);
    mC.scale.set(cl, apv, aev); mC.position.set(-L / 2 + cl / 2, -apv / 2, W / 2 - aev / 2);
    mC.visible = cl > 0.001;
    floorMillMat.normalMap!.repeat.set(L / 1.2, W / 1.2);
    const r = 0.5;
    mSpindle.position.set(M.x, M.y - apv, W / 2 - aev + r);
  }
  function millUpdate(dt: number) {
    const r = 0.5;
    mToolSpin.rotation.y = -angle;
    let cutting = false;
    if (M.phase === 'down') {
      M.x = M.L / 2 + r + 0.25;
      M.y = damp(M.y, 0, 7, dt);
      if (M.y < 0.01) { M.y = 0; M.phase = 'cut'; }
    } else if (M.phase === 'cut') {
      M.x -= live.feed * dt;
      M.xCut = Math.min(M.L / 2, M.x);
      cutting = M.x < M.L / 2 + r && M.x > -M.L / 2 - r;
      if (M.x < -M.L / 2 - r - 0.25) M.phase = 'up';
    } else if (M.phase === 'up') {
      M.y += 3 * dt;
      if (M.y > 1.3) { M.phase = 'back'; }
    } else {
      M.x += 9 * dt;
      if (M.x > M.L / 2 + r + 0.25) { M.xCut = M.L / 2; M.phase = 'down'; }
    }
    millLayout();
    const zTool = M.W / 2 - live.aev + r;
    tmpP.set(M.x - r * 0.35, -live.apv * 0.5, Math.min(M.W / 2, zTool + r * 0.8));
    if (cutting) {
      const ck = CHIP[input.iso];
      const rate = (ck.kind === 'frag' ? 2.5 : 1.0) * live.spin * (input.z ?? 4) * 2.4;
      mChipAcc += rate * dt;
      while (mChipAcc > 1) {
        mChipAcc -= 1;
        const kind = ck.kind === 'long' ? 'curl' : ck.kind;
        const s = (kind === 'frag' ? 0.045 : 0.075) * live.chip;
        const a = rnd(-0.4, 1.2);
        tmpV.set(-Math.sin(a) * rnd(1.4, 3.2), rnd(0.8, 2.6), Math.cos(a) * rnd(1.4, 3.2));
        tmpP.y = -live.apv * rnd(0.15, 0.9);
        pools[kind].spawn(tmpP, tmpV, s, chipColor(input.iso, live.heat, tmpC), 2.4, 12);
      }
    }
    fxAt(tmpP, live.spin, cutting);
  }
  const millFloor = (x: number, z: number) => {
    if (Math.abs(x) < M.L / 2 && Math.abs(z) < M.W / 2) {
      if (z > M.W / 2 - live.aev && x > M.xCut) return -live.apv;
      return 0;
    }
    return -M.H;
  };

  /* ======================= DELME + KILAVUZ (kesit blok) ======================= */
  const hole = new THREE.Group();
  scene.add(hole);
  const B = { L: 6.6, H: 2.9, W: 1.9, r: 0.5, spacing: 1.85, depthMax: 2.0 };
  type Hole = { x: number; depth: number; tapped: number };
  const H = {
    holes: [] as Hole[], y: 0.9, phase: 'approach' as 'approach' | 'feed' | 'dwell' | 'retract' | 'slide', t: 0, slide: 0,
  };
  const body = new THREE.Mesh(new THREE.BoxGeometry(B.L, B.H, B.W), [rawMat, rawMat, hiddenMat, rawMat, hiddenMat, rawMat]);
  body.position.set(0, -B.H / 2, -B.W / 2);
  hole.add(body);
  const hTable = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 5), tableMat);
  hTable.position.set(0, -B.H - 0.15, -0.6);
  hole.add(hTable);
  let topFace = new THREE.Mesh(new THREE.BufferGeometry(), rawMat);
  let secFace = new THREE.Mesh(new THREE.BufferGeometry(), sectionMat);
  const outline = new THREE.Line(new THREE.BufferGeometry(), outlineMat);
  hole.add(topFace, secFace, outline);
  const bores: THREE.Mesh[] = [];
  const boreUnit = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true, Math.PI / 2, Math.PI).translate(0, -0.5, 0);
  const coneUnit = new THREE.ConeGeometry(1, 1, 48, 1, true, Math.PI / 2, Math.PI).rotateZ(Math.PI).translate(0, -0.5, 0);
  const cones: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(boreUnit, boreMat); const c = new THREE.Mesh(coneUnit, boreMat);
    bores.push(b); cones.push(c); hole.add(b, c);
  }
  const hSpindle = new THREE.Group();
  const holeHolder = buildBT40(mats, false);
  holeHolder.scale.setScalar(0.1);
  hSpindle.add(holeHolder);
  const hToolSpin = new THREE.Group();
  hSpindle.add(hToolSpin);
  hole.add(hSpindle);
  const drill = buildDrill(mats, { D: 10, Lf: 46, L: 92 });
  drill.scale.setScalar(0.1);
  let tap = buildTap(mats, { D: 10, P: 1.5 });
  tap.scale.setScalar(0.1);
  let tapP = 1.5;
  let tapRebuild = 0;
  const TIP_H = B.r / Math.tan((70 * Math.PI) / 180); // 140° matkap ucu yüksekliği
  let hChipAcc = 0;
  let lastShape = '';

  function holeOp() { return input.op === 'kilavuz' ? 'tap' : 'drill'; }
  function resetHoles() {
    const tapMode = holeOp() === 'tap';
    H.holes = [-2, -1, 0].map((k) => ({ x: k * B.spacing, depth: tapMode || k < 0 ? B.depthMax : 0, tapped: tapMode && k < 0 ? B.depthMax * 0.8 : 0 }));
    H.phase = 'approach'; H.y = 0.9; H.slide = 0;
  }

  /** Kesit yüzü ve üst yüz şekilleri (delik çentikleri, diş profili) */
  function buildSection() {
    const r = B.r, L = B.L, Hh = B.H, W = B.W;
    const tapMode = holeOp() === 'tap';
    const P = live.pv; // görsel hatve
    const h = 0.6134 * P * 1.0;
    const rMin = tapMode ? r - h * 0.85 : r;
    const vis = H.holes.map((o) => ({ ...o, x: o.x + H.slide })).filter((o) => o.x > -L / 2 + r + 0.05 && o.x < L / 2 - r - 0.05).sort((a, b) => b.x - a.x);
    const key = vis.map((o) => `${o.x.toFixed(3)}:${o.depth.toFixed(3)}:${o.tapped.toFixed(3)}`).join('|') + `|${tapMode}|${P.toFixed(3)}`;
    if (key === lastShape) return vis;
    lastShape = key;
    // Kesit (z = 0 düzlemi, +Z'ye bakar)
    const pts: THREE.Vector2[] = [new THREE.Vector2(-L / 2, -Hh), new THREE.Vector2(L / 2, -Hh), new THREE.Vector2(L / 2, 0)];
    const wall = (x0: number, side: 1 | -1, o: (typeof vis)[number], down: boolean) => {
      // Duvar profili: tapped bölgesinde diş (r ↔ rMin), altında düz rMin (kılavuz) ya da r (matkap)
      const out: THREE.Vector2[] = [];
      const base = tapMode ? rMin : r;
      const phase = side > 0 ? 0 : P / 2;
      if (tapMode && o.tapped > 0) {
        for (let y = 0; y <= o.tapped + 1e-6; y += P / 4) {
          const u = ((y + phase) / P) % 1;
          const tri = 1 - Math.abs(u * 2 - 1);
          out.push(new THREE.Vector2(x0 + side * (rMin + (r - rMin) * tri), -y));
        }
      } else out.push(new THREE.Vector2(x0 + side * base, 0));
      out.push(new THREE.Vector2(x0 + side * base, -Math.max(o.tapped, 0.0001) - 0.0001));
      out.push(new THREE.Vector2(x0 + side * base, -o.depth));
      return down ? out : out.reverse();
    };
    for (const o of vis) {
      if (o.depth <= 0.001) continue;
      const base = tapMode ? rMin : r;
      pts.push(...wall(o.x, 1, o, true));
      pts.push(new THREE.Vector2(o.x, -o.depth - base / Math.tan((70 * Math.PI) / 180)));
      pts.push(...wall(o.x, -1, o, false));
    }
    pts.push(new THREE.Vector2(-L / 2, 0));
    const sg = new THREE.ShapeGeometry(new THREE.Shape(pts));
    secFace.geometry.dispose();
    secFace.geometry = sg;
    const lg = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]].map((p) => new THREE.Vector3(p.x, p.y, 0.002)));
    outline.geometry.dispose();
    outline.geometry = lg;
    // Üst yüz (y = 0): arka yarı, delik ağızlarında yarım daire çentik
    const top: THREE.Vector2[] = [new THREE.Vector2(-L / 2, W), new THREE.Vector2(L / 2, W), new THREE.Vector2(L / 2, 0)];
    for (const o of vis) {
      if (o.depth <= 0.001) continue;
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI;
        top.push(new THREE.Vector2(o.x + Math.cos(a) * r, Math.sin(a) * r));
      }
    }
    top.push(new THREE.Vector2(-L / 2, 0));
    const tg = new THREE.ShapeGeometry(new THREE.Shape(top)).rotateX(-Math.PI / 2);
    // rotateX(-90°): şekil y → -z. Arka yarı z ∈ [-W, 0] olsun
    topFace.geometry.dispose();
    topFace.geometry = tg;
    // Delik iç yüzleri
    bores.forEach((b, i) => {
      const o = vis[i];
      const c = cones[i];
      b.visible = c.visible = !!o && o.depth > 0.001;
      if (!o || o.depth <= 0.001) return;
      const rr = tapMode ? rMin : r;
      b.position.set(o.x, 0, 0); b.scale.set(rr, o.depth, rr);
      c.position.set(o.x, -o.depth, 0); c.scale.set(rr, rr / Math.tan((70 * Math.PI) / 180), rr);
    });
    return vis;
  }

  function holeUpdate(dt: number) {
    const tapMode = holeOp() === 'tap';
    const tool = tapMode ? tap : drill;
    if (hToolSpin.children[0] !== tool) { hToolSpin.clear(); hToolSpin.add(tool); }
    // Takım uzunluğu: tutucu somun yüzü takım ucundan 58 mm yukarıda
    holeHolder.position.y = tapMode ? 2.0 : 2.4;
    const cur = H.holes[H.holes.length - 1];
    let cutting = false;
    const tapSpin = Math.max(live.spin, 1.3);
    if (H.phase === 'approach') {
      H.y = damp(H.y, 0.02, 9, dt);
      if (H.y < 0.04) { H.y = 0.02; H.phase = 'feed'; }
    } else if (H.phase === 'feed') {
      const v = tapMode ? tapSpin * live.pv : live.feed;
      H.y -= v * dt;
      cutting = true;
      if (tapMode) cur.tapped = Math.max(cur.tapped, -H.y);
      else cur.depth = Math.max(cur.depth, -H.y);
      const maxD = tapMode ? B.depthMax * 0.8 : B.depthMax;
      if (-H.y >= maxD) { H.phase = 'dwell'; H.t = 0; }
    } else if (H.phase === 'dwell') {
      H.t += dt;
      if (H.t > 0.25) H.phase = 'retract';
    } else if (H.phase === 'retract') {
      if (tapMode) H.y += tapSpin * live.pv * dt; else H.y += 6 * dt;
      if (H.y > 0.9) { H.y = 0.9; H.phase = 'slide'; H.t = 0; }
    } else if (H.phase === 'slide') {
      H.t += dt;
      const k = Math.min(1, H.t / 0.8);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const prev = H.slide;
      H.slide = -B.spacing * e;
      // Bloğun üstünde duran talaşlar blokla birlikte kayar
      Object.values(pools).forEach((p) => p.update(0, holeFloor, H.slide - prev));
      if (k >= 1) {
        H.holes.forEach((o) => (o.x -= B.spacing));
        H.slide = 0;
        H.holes = H.holes.filter((o) => o.x > -B.L / 2 - 1);
        H.holes.push({ x: 0, depth: tapMode ? B.depthMax : 0, tapped: 0 });
        H.phase = 'approach';
      }
    }
    // Kılavuz senkron: girerken saat yönü, çıkarken ters
    const spinRate = tapMode ? tapSpin * (H.phase === 'retract' ? -1 : H.phase === 'feed' ? 1 : 0) : live.spin;
    holeAngle += spinRate * TAU * dt * (paused ? 0 : 1);
    hToolSpin.rotation.y = -holeAngle;
    hSpindle.position.set(0, H.y, 0);
    buildSection();
    // Talaş: oluk boyunca yukarı
    const depthNow = Math.max(0, -H.y);
    tmpP.set(0, -depthNow, 0);
    if (cutting && depthNow > 0.02) {
      const ck = CHIP[input.iso];
      const kind: ChipKind = ck.kind === 'frag' ? 'frag' : 'curl';
      const rate = tapMode ? 4 * tapSpin : (kind === 'frag' ? 12 : 6) * live.spin;
      hChipAcc += rate * dt;
      while (hChipAcc > 1) {
        hChipAcc -= 1;
        const s = (kind === 'frag' ? 0.045 : tapMode ? 0.05 : 0.085) * live.chip;
        tmpP.set(Math.cos(0) * 0.2, -depthNow + 0.1, 0);
        const i = pools[kind].spawn(tmpP, tmpV.set(0, 0, 0), s, chipColor(input.iso, live.heat, tmpC), 3.2, 6);
        const theta = rnd(0, TAU);
        pools[kind].guide(i, 0, 0, theta, B.r * rnd(0.5, 0.75), -live.spin * TAU * 0.35, rnd(2.2, 3.4) + live.feed, 0.05);
      }
    }
    fxAt(tmpP.set(0, -depthNow, 0.3), live.spin, cutting && !tapMode);
  }
  let holeAngle = 0;
  const holeFloor = (x: number, z: number) => (Math.abs(x) < B.L / 2 && z > -B.W && z < 0 ? 0 : -B.H);

  /* ---------- Ortak efektler: ısı ışığı, parıltı, kıvılcım, toz ---------- */
  let sparkAcc = 0, dustAcc = 0;
  function fxAt(p: THREE.Vector3, spin: number, cutting: boolean) {
    const ck = CHIP[input.iso];
    const heat = live.heat;
    const g = cutting ? clamp((heat - 0.55) * 1.6 + ck.spark * 0.35, 0, 1.2) : 0;
    glow.position.copy(p);
    const sm = glow.material as THREE.SpriteMaterial;
    sm.opacity = damp(sm.opacity, g * 0.9, 6, 1 / 60);
    glow.scale.setScalar(0.5 + g * 0.6);
    heatLight.position.copy(p).add(tmpV.set(0, 0.25, 0.35));
    heatLight.intensity = damp(heatLight.intensity, g * 6, 6, 1 / 60);
    if (!cutting) return;
    const sr = (Math.max(0, heat - 0.85) * 60 + ck.spark * 28) * (0.5 + spin * 0.4);
    sparkAcc += sr / 60;
    while (sparkAcc > 1) {
      sparkAcc -= 1;
      sparks.spawn(p, tmpV.set(rnd(-2, 3), rnd(1, 4.5), rnd(0.5, 3.5)));
    }
    if (ck.dust) {
      dustAcc += ck.dust * 30 * spin / 60;
      while (dustAcc > 1) {
        dustAcc -= 1;
        const i = dustCursor;
        dustCursor = (dustCursor + 1) % dustN;
        dustP.set([p.x + rnd(-0.1, 0.1), p.y + rnd(-0.05, 0.1), p.z + rnd(-0.1, 0.1)], i * 3);
        dustV.set([rnd(-0.4, 0.6), rnd(0.2, 0.9), rnd(-0.1, 0.6)], i * 3);
        dustA[i] = 0;
      }
    }
  }
  function dustUpdate(dt: number) {
    for (let i = 0; i < dustN; i++) {
      dustA[i] += dt;
      const k = i * 3;
      if (dustA[i] > 2.5) { dustP[k + 1] = -99; continue; }
      dustV[k + 1] -= 0.25 * dt;
      dustP[k] += dustV[k] * dt; dustP[k + 1] += dustV[k + 1] * dt; dustP[k + 2] += dustV[k + 2] * dt;
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  /* ======================= Kamera ======================= */
  const VIEW: Record<Op, { target: [number, number, number]; az: number; el: number; fit: number }> = {
    torna: { target: [2.0, -0.3, 0.9], az: 0.62, el: 0.3, fit: 5.8 },
    freze: { target: [0, -0.4, 0.5], az: 0.32, el: 0.52, fit: 5.6 },
    delme: { target: [0, -0.45, 0], az: 0.26, el: 0.16, fit: 4.2 },
    kilavuz: { target: [0, -0.45, 0], az: 0.26, el: 0.16, fit: 4.0 },
  };
  const cam = { tx: 2.4, ty: 0, tz: 0, az: 0.6, el: 0.4, dist: 10, px: 0, py: 0, ppx: 0, ppy: 0 };
  let W = 1, Hh = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    Hh = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, fine ? 2 : 1.5));
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  if (fine) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      cam.ppx = ((e.clientX - r.left) / r.width) * 2 - 1;
      cam.ppy = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    stage.addEventListener('pointerleave', () => { cam.ppx = 0; cam.ppy = 0; });
  }
  function cameraUpdate(dt: number, t: number) {
    const v = VIEW[input.op];
    cam.tx = damp(cam.tx, v.target[0], 3, dt); cam.ty = damp(cam.ty, v.target[1], 3, dt); cam.tz = damp(cam.tz, v.target[2], 3, dt);
    cam.px = damp(cam.px, cam.ppx, 3, dt); cam.py = damp(cam.py, cam.ppy, 3, dt);
    const az = damp(cam.az, v.az, 3, dt); cam.az = az;
    const el = damp(cam.el, v.el, 3, dt); cam.el = el;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = W / Hh;
    // Kadraja sığdır: yatay sığdırma dar ekranda belirleyici
    const distV = v.fit / Math.tan(vfov / 2);
    const distH = v.fit / (Math.tan(vfov / 2) * aspect);
    const want = Math.max(distV * 0.62, distH);
    cam.dist = damp(cam.dist, want, 3, dt);
    const a = az + cam.px * 0.12 + (reduce ? 0 : Math.sin(t * 0.13) * 0.05);
    const e = el - cam.py * 0.06;
    camera.position.set(cam.tx + Math.sin(a) * Math.cos(e) * cam.dist, cam.ty + Math.sin(e) * cam.dist, cam.tz + Math.cos(a) * Math.cos(e) * cam.dist);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }

  /* ======================= Giriş değerleri ======================= */
  function set(next: SimInput) {
    const opChanged = next.op !== input.op;
    const isoChanged = next.iso !== input.iso;
    input = next;
    const n = ok(next.n) ? next.n : 1000;
    live.spinT = clamp(0.33 * Math.log2(n / 60 + 1), 0.3, 3.2);
    const D = ok(next.d) ? next.d : 10;
    if (next.op === 'torna') {
      const fn = ok(next.fn) ? next.fn : 0.2;
      live.feedT = clamp(live.spinT * fn * 1.5, 0.08, 2.2);
      live.apvT = clamp(((ok(next.ap) ? next.ap : 1) / (D / 2)) * 1.35, 0.05, 0.6);
      live.chipT = clamp(0.55 + (fn / 0.25) * 0.3 + (live.apvT / 0.15) * 0.15, 0.5, 2.2);
    } else if (next.op === 'freze') {
      const fz = ok(next.fz) ? next.fz : 0.04, z = ok(next.z) ? next.z : 4;
      live.feedT = clamp(live.spinT * z * fz * 3.2, 0.12, 2.6);
      live.apvT = clamp(((ok(next.ap) ? next.ap : 5) / D), 0.06, 1.2);
      live.aevT = clamp(((ok(next.ae) ? next.ae : 3) / D), 0.05, 1.0);
      live.chipT = clamp(0.6 + (fz / 0.04) * 0.3, 0.5, 2.2);
      const zv = clamp(Math.round(z), 1, 8);
      if (zv !== millZBuilt) { millZBuilt = zv; millRebuild = 0.15; }
    } else if (next.op === 'delme') {
      const fn = ok(next.fn) ? next.fn : 0.15;
      live.feedT = clamp(live.spinT * fn * 3, 0.1, 1.6);
      live.chipT = clamp(0.65 + (fn / 0.15) * 0.3, 0.5, 2);
    } else {
      const P = ok(next.p) ? next.p : 1.5;
      live.pvT = clamp((P / D) * 1.0, 0.06, 0.32);
      live.chipT = 0.8;
      const pm = Math.round(clamp((10 * P) / D, 0.5, 3) * 20) / 20;
      if (Math.abs(pm - tapP) > 1e-6) { tapP = pm; tapRebuild = 0.2; }
    }
    // Isı: Vc'nin önerilen orta değere oranı ve malzeme
    const isoHeat: Record<Iso, number> = { P: 0, M: 0.08, K: -0.05, N: -0.35, S: 0.22, H: 0.35 };
    live.heatT = clamp(0.25 + (clamp(next.vcRel || 1, 0.2, 2.5) - 1) * 0.75 + isoHeat[next.iso], 0, 1.5);
    if (isoChanged) applyIso(next.iso);
    if (opChanged) enterOp();
    updateHud();
  }
  function enterOp() {
    turn.visible = input.op === 'torna';
    mill.visible = input.op === 'freze';
    hole.visible = input.op === 'delme' || input.op === 'kilavuz';
    Object.values(pools).forEach((p) => p.clear());
    if (hole.visible) { lastShape = ''; resetHoles(); }
    T.phase = 'in'; T.x = T.L + 0.12; T.z = 0.6; T.Ro = T.R; T.rawOuter = true;
    M.phase = 'down'; M.y = 1.3; M.xCut = M.L / 2;
    stage.classList.remove('is-cut');
    void stage.offsetWidth;
    stage.classList.add('is-cut');
  }

  /* ---------- HUD ---------- */
  const hud = {
    n: stage.querySelector<HTMLElement>('[data-sim-n]'),
    slow: stage.querySelector<HTMLElement>('[data-sim-slow]'),
  };
  function updateHud() {
    const real = (ok(input.n) ? input.n : 0) / 60;
    const vis = input.op === 'kilavuz' ? Math.max(live.spinT, 1.3) : live.spinT;
    if (hud.slow) hud.slow.textContent = real > 0 ? `Ağır çekim ×${Math.max(1, Math.round(real / vis))}` : '';
  }

  /* ======================= Döngü ======================= */
  let visible = true;
  let last = performance.now();
  let t = 0;
  function frame() {
    try { step(); } catch (err) { console.error('sim', err); }
    requestAnimationFrame(frame);
  }
  function step() {
    const now = performance.now();
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    if (visible && !document.hidden) {
      const sdt = paused ? 0 : dt;
      t += sdt;
      live.spin = damp(live.spin, live.spinT, 3, dt);
      live.feed = damp(live.feed, live.feedT, 3, dt);
      live.heat = damp(live.heat, live.heatT, 2, dt);
      live.chip = damp(live.chip, live.chipT, 3, dt);
      live.apv = damp(live.apv, live.apvT, 4, dt);
      live.aev = damp(live.aev, live.aevT, 4, dt);
      live.pv = damp(live.pv, live.pvT, 4, dt);
      if (millRebuild > 0 && (millRebuild -= dt) <= 0) {
        mToolSpin.remove(endMill);
        endMill.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        endMill = buildEndMill(mats, { D: 10, z: millZBuilt, Lf: 22, L: 64 });
        endMill.scale.setScalar(0.1);
        mToolSpin.add(endMill);
      }
      if (tapRebuild > 0 && (tapRebuild -= dt) <= 0) {
        const wasIn = hToolSpin.children[0] === tap;
        if (wasIn) hToolSpin.remove(tap);
        tap.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        tap = buildTap(mats, { D: 10, P: tapP });
        tap.scale.setScalar(0.1);
        if (wasIn) hToolSpin.add(tap);
      }
      angle += live.spin * TAU * sdt;
      if (sdt > 0) {
        if (input.op === 'torna') turnUpdate(sdt);
        else if (input.op === 'freze') millUpdate(sdt);
        else holeUpdate(sdt);
        const floor = input.op === 'torna' ? turnFloor : input.op === 'freze' ? millFloor : holeFloor;
        Object.values(pools).forEach((p) => p.update(sdt, floor));
        sparks.update(sdt);
        dustUpdate(sdt);
      }
      cameraUpdate(dt, t);
      renderer.render(scene, camera);
    }
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }, { rootMargin: '100px' }).observe(stage);

  applyIso(input.iso);
  enterOp();
  requestAnimationFrame(frame);
  /** Test için: sahneyi çizmeden ileri sar */
  function advance(sec: number) {
    const h = 1 / 30;
    for (let k = 0; k < sec / h; k++) {
      for (const key of ['spin', 'feed', 'heat', 'chip', 'apv', 'aev', 'pv'] as const) (live as any)[key] = (live as any)[key + 'T'];
      angle += live.spin * TAU * h;
      if (input.op === 'torna') turnUpdate(h);
      else if (input.op === 'freze') millUpdate(h);
      else holeUpdate(h);
      const floor = input.op === 'torna' ? turnFloor : input.op === 'freze' ? millFloor : holeFloor;
      Object.values(pools).forEach((p) => p.update(h, floor));
      sparks.update(h);
      dustUpdate(h);
    }
    for (let k = 0; k < 90; k++) cameraUpdate(1 / 30, t);
  }
  (window as any).__sim = { advance, live, input: () => input, T, M, H, renderer, camera, scene, cam, dims: () => [W, Hh] };
  return {
    set,
    pause(on: boolean) { paused = on; },
  };
}
