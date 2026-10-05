// Delme sahnesi (gerçekçi): U-matkap tornada dönen yuvarlak çubuğu içten soğutmayla deler.
// - İş parçası: alnı tornalanmış Ø125 çelik çubuk; iç içe tornalama izleri anizotropik yansımayla
//   ışığı yıldız gibi kırar, kenarda parlak pah, dış yüzeyde çevresel tornalama izleri
// - Delik: içi görünen silindir, ağzında ince pah
// - Talaş: yassı, ucu incelen kıvrık şeritler (çelik grisi, ara sıra saman/bronz meneviş)
// - Soğutma: delik ağzından dışa açılan ince sprey çizgileri ve hafif sis (kıvılcım ve kızıllık yok:
//   içten soğutmalı delmede kesme bölgesi sıvı altındadır)
import * as THREE from 'three';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const RB = 62.5; // çubuk yarıçapı (mm)
const CH = 2.2; // alın pahı
const DEPTH = 78;
const HOLE_R = 12.6;

/* ======================= Doku üreticiler ======================= */
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** Yükseklik kanvasından normal haritası üretir */
export function normalFrom(src: HTMLCanvasElement, strength = 2.2) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [c, g] = canvas(w, h);
  const out = g.createImageData(w, h);
  const L = (x: number, y: number) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (L(x + 1, y) - L(x - 1, y)) * strength;
      const dy = (L(x, y + 1) - L(x, y - 1)) * strength;
      const nz = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * w + x) * 4;
      out.data[i] = (-dx * nz * 0.5 + 0.5) * 255;
      out.data[i + 1] = (-dy * nz * 0.5 + 0.5) * 255;
      out.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Tornalanmış alın: iç içe halkalar (pürüzlülük) + anizotropi yönü (her noktada halkaya teğet) */
function turnedFaceTextures() {
  const S = 1024, c0 = S / 2;
  const [c, g] = canvas(S, S);
  g.fillStyle = 'rgb(96,96,96)';
  g.fillRect(0, 0, S, S);
  // İlerleme izleri: ince, düzenli; arada hafif dalgalanma
  for (let r = 6; r < c0 * 1.45; r += rnd(1.6, 2.6)) {
    const v = Math.random();
    g.strokeStyle = v > 0.5 ? `rgba(255,255,255,${rnd(0.03, 0.09)})` : `rgba(0,0,0,${rnd(0.03, 0.1)})`;
    g.lineWidth = rnd(0.7, 1.6);
    g.beginPath();
    g.arc(c0, c0, r, 0, Math.PI * 2);
    g.stroke();
  }
  const rough = new THREE.CanvasTexture(c);
  rough.colorSpace = THREE.NoColorSpace;
  rough.anisotropy = 8;
  // Anizotropi yönü: UV uzayında halkaya teğet; kanvas y ekseni ters (flipY)
  const [a, ga] = canvas(256, 256);
  const img = ga.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = (x + 0.5) / 256 - 0.5, v = 1 - (y + 0.5) / 256 - 0.5;
    const l = Math.hypot(u, v) || 1;
    const i = (y * 256 + x) * 4;
    img.data[i] = (-v / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (u / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = 255;
    img.data[i + 3] = 255;
  }
  ga.putImageData(img, 0, 0);
  const aniso = new THREE.CanvasTexture(a);
  aniso.colorSpace = THREE.NoColorSpace;
  aniso.generateMipmaps = false;
  aniso.minFilter = THREE.LinearFilter;
  return { rough, aniso };
}

/** Dış çap: çevresel tornalama çizgileri (U yönünde) */
function turnedOdTexture() {
  const [c, g] = canvas(64, 1024);
  for (let y = 0; y < 1024; y++) {
    const v = 92 + Math.sin(y * 1.7) * 10 + rnd(-16, 16);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 64, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Delik içi: matkap izleri */
function boreTexture() {
  const [c, g] = canvas(64, 512);
  for (let y = 0; y < 512; y++) {
    const v = 70 + Math.sin(y * 0.9) * 18 + rnd(-14, 14);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 64, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function mistTexture() {
  const [c, g] = canvas(128, 128);
  for (let i = 0; i < 26; i++) {
    const x = 64 + rnd(-24, 24), y = 64 + rnd(-24, 24), r = rnd(16, 44);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${rnd(0.12, 0.26)})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mistMaterial(tex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: tex }, uPR: { value: 1 }, uOpacity: { value: 0.42 }, uColor: { value: new THREE.Color(0xdfe7ee) } },
    vertexShader: /* glsl */ `
      attribute float aLife; attribute float aSize; attribute float aRot;
      uniform float uPR;
      varying float vA; varying float vRot;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (0.4 + aLife * 1.6) / -mv.z;
        vA = smoothstep(0.0, 0.12, aLife) * (1.0 - aLife) * (1.0 - aLife);
        vRot = aRot;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uOpacity; uniform vec3 uColor;
      varying float vA; varying float vRot;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        c = mat2(co, -s, s, co) * c + 0.5;
        vec4 t = texture2D(uMap, c);
        gl_FragColor = vec4(uColor, t.a * vA * uOpacity);
      }`,
  });
}

/* ======================= Talaş geometrisi ======================= */
/** Yassı, ucu incelen kıvrık şerit (helis boyunca) */
export function chipRibbon(turns: number, radius: number, pitch: number, width: number, taper: number, segs = 56) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = t * turns * Math.PI * 2;
    const r = radius * (1 - taper * 0.45 * t);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = t * pitch * turns;
    // Şerit genişliği eksen yönünde, hafif bükülme ile
    const tw = Math.sin(t * Math.PI) * 0.35;
    const wx = Math.cos(a) * tw, wy = 1, wz = Math.sin(a) * tw;
    const wl = Math.hypot(wx, wy, wz);
    const hw = (width * (1 - taper * t) * (0.55 + 0.45 * Math.sin(Math.min(1, t * 6) * Math.PI / 2))) / 2;
    pos.push(cx - (wx / wl) * hw, cy - (wy / wl) * hw, cz - (wz / wl) * hw);
    pos.push(cx + (wx / wl) * hw, cy + (wy / wl) * hw, cz + (wz / wl) * hw);
    if (i < segs) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.center();
  return g;
}

export interface MachiningState { block: number; cut: number; heat: number; hole: number }

interface ChipSet { mesh: THREE.InstancedMesh; n: number; P: Float32Array; V: Float32Array; R: Float32Array; W: Float32Array; age: Float32Array; max: Float32Array; s: Float32Array }

export class Machining {
  /** İş parçası (focus grubuna eklenir: pozla birlikte döner, matkap dönüşünden etkilenmez) */
  work = new THREE.Group();
  /** Dünya uzayındaki parçacıklar (sahneye eklenir) */
  fx = new THREE.Group();
  private mats: THREE.Material[] = [];
  private plug: THREE.Mesh;
  private holeGroup = new THREE.Group();
  private entryAnchor = new THREE.Object3D();
  private spinner = new THREE.Group();

  private chipSets: ChipSet[] = [];
  private chipAcc = 0;
  // Soğutma spreyi: hız yönünde kısa, yarı saydam çizgiler
  private dropN: number;
  private dP: Float32Array; private dV: Float32Array; private dAge: Float32Array; private dMax: Float32Array;
  private dropGeo: THREE.BufferGeometry;
  private dropAcc = 0;
  // Sis
  private mist: THREE.Points; private mistMat: THREE.ShaderMaterial; private mistN: number;
  private mP: Float32Array; private mV: Float32Array; private mAge: Float32Array; private mMax: Float32Array; private mLife: Float32Array; private mSize: Float32Array; private mRot: Float32Array;
  private mistAcc = 0;

  private t = 0;
  private dummy = new THREE.Object3D();
  private v2 = new THREE.Vector3();
  private color = new THREE.Color();

  constructor(mobile: boolean, tipMM: number) {
    /* ---------- İş parçası: alnı tornalanmış yuvarlak çubuk ---------- */
    const ft = turnedFaceTextures();
    const faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xd3d8de, metalness: 1, roughness: 0.34, roughnessMap: ft.rough, anisotropy: 0.78, anisotropyMap: ft.aniso,
      transparent: true, envMapIntensity: 1.4,
    });
    const odTex = turnedOdTexture();
    const odMat = new THREE.MeshPhysicalMaterial({
      color: 0xc3c8cf, metalness: 1, roughness: 0.34, roughnessMap: odTex, anisotropy: 0.75, anisotropyRotation: Math.PI / 2,
      transparent: true, envMapIntensity: 1.35,
    });
    const chMat = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, metalness: 1, roughness: 0.14, transparent: true, envMapIntensity: 1.4 });
    const backMat = new THREE.MeshPhysicalMaterial({ color: 0x8d939b, metalness: 1, roughness: 0.5, transparent: true });
    this.mats.push(faceMat, odMat, chMat, backMat);

    const inner = new THREE.Group();
    // Alın (delikli halka) ve delinmeden önceki tıpa: aynı doku eşlemesi
    const faceGeo = new THREE.RingGeometry(HOLE_R, RB - CH, 180, 6);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.y = -Math.PI / 2;
    const plugGeo = new THREE.CircleGeometry(HOLE_R + 0.05, 64);
    const pu = plugGeo.attributes.uv, pp = plugGeo.attributes.position;
    for (let i = 0; i < pu.count; i++) pu.setXY(i, (pp.getX(i) / (RB - CH) + 1) / 2, (pp.getY(i) / (RB - CH) + 1) / 2);
    this.plug = new THREE.Mesh(plugGeo, faceMat);
    this.plug.rotation.y = -Math.PI / 2;
    this.plug.position.x = 0.02;
    // Dış pah ve tornalanmış dış çap
    const cham = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB - CH, CH, 200, 1, true), chMat);
    cham.rotation.z = -Math.PI / 2;
    cham.position.x = CH / 2;
    const od = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, DEPTH - CH, 200, 1, true), odMat);
    od.rotation.z = -Math.PI / 2;
    od.position.x = CH + (DEPTH - CH) / 2;
    const back = new THREE.Mesh(new THREE.CircleGeometry(RB, 96), backMat);
    back.rotation.y = Math.PI / 2;
    back.position.x = DEPTH;
    // Tornada iş parçası döner (matkap sabit): alın izleri dönerken yansıma titreşmez, çevre izleri akar
    this.spinner.add(face, this.plug, cham, od, back);
    inner.add(this.spinner);

    // Delik içi ve ağız pahı
    const bore = boreTexture();
    bore.repeat.set(1, 2);
    const boreMat = new THREE.MeshPhysicalMaterial({ color: 0xa4aab3, metalness: 1, roughness: 0.32, map: bore, side: THREE.BackSide });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R, DEPTH - 6, 64, 1, true), boreMat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.x = (DEPTH - 6) / 2;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(HOLE_R, 48), new THREE.MeshBasicMaterial({ color: 0x050506 }));
    bottom.rotation.y = -Math.PI / 2;
    bottom.position.x = DEPTH - 6;
    const lip = new THREE.Mesh(
      new THREE.CylinderGeometry(HOLE_R + 0.7, HOLE_R, 0.7, 64, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe8ecf0, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
    );
    lip.rotation.z = -Math.PI / 2;
    lip.position.x = 0.35;
    this.holeGroup.add(cyl, bottom, lip);
    inner.add(this.holeGroup, this.entryAnchor);
    this.entryAnchor.position.set(-1, 0, 0);

    inner.scale.setScalar(0.01);
    this.work.add(inner);
    this.work.userData.gap = tipMM + 1.2;
    this.work.visible = false;

    /* ---------- Talaşlar: üç form, çelik tonları ---------- */
    const chipMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 1, roughness: 0.24, side: THREE.DoubleSide,
      iridescence: 0.16, iridescenceIOR: 1.5, iridescenceThicknessRange: [260, 400], envMapIntensity: 1.3,
    });
    const forms = [
      chipRibbon(0.85, 2.6, 1.4, 2.0, 0.5), // C talaş
      chipRibbon(1.8, 1.9, 2.2, 1.5, 0.35), // yay talaş
      chipRibbon(0.55, 3.2, 0.7, 2.3, 0.7), // virgül talaş
    ];
    const per = mobile ? 26 : 48;
    const tints = [0xd8dce1, 0xccd0d6, 0xc1c6cc, 0xb6bbc2, 0xd9dde2, 0xcfc29c, 0xb79d72];
    forms.forEach((geo) => {
      const mesh = new THREE.InstancedMesh(geo, chipMat, per);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      for (let i = 0; i < per; i++) {
        mesh.setColorAt(i, this.color.setHex(tints[Math.floor(Math.random() * tints.length)]));
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.fx.add(mesh);
      this.chipSets.push({
        mesh, n: per,
        P: new Float32Array(per * 3), V: new Float32Array(per * 3), R: new Float32Array(per * 3), W: new Float32Array(per * 3),
        age: new Float32Array(per).fill(99), max: new Float32Array(per).fill(1), s: new Float32Array(per),
      });
    });

    /* ---------- Soğutma spreyi ---------- */
    this.dropN = mobile ? 160 : 320;
    this.dP = new Float32Array(this.dropN * 3);
    this.dV = new Float32Array(this.dropN * 3);
    this.dAge = new Float32Array(this.dropN).fill(99);
    this.dMax = new Float32Array(this.dropN).fill(1);
    this.dropGeo = new THREE.BufferGeometry();
    this.dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.dropN * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.dropGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.dropN * 8), 4).setUsage(THREE.DynamicDrawUsage));
    const dropMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
    const drops = new THREE.LineSegments(this.dropGeo, dropMat);
    drops.frustumCulled = false;
    drops.renderOrder = 6;
    this.fx.add(drops);

    /* ---------- Sis ---------- */
    this.mistN = mobile ? 40 : 80;
    this.mP = new Float32Array(this.mistN * 3); this.mV = new Float32Array(this.mistN * 3);
    this.mAge = new Float32Array(this.mistN).fill(99); this.mMax = new Float32Array(this.mistN).fill(1);
    this.mLife = new Float32Array(this.mistN).fill(1); this.mSize = new Float32Array(this.mistN); this.mRot = new Float32Array(this.mistN);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.mP, 3));
    sg.setAttribute('aLife', new THREE.BufferAttribute(this.mLife, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(this.mSize, 1));
    sg.setAttribute('aRot', new THREE.BufferAttribute(this.mRot, 1));
    this.mistMat = mistMaterial(mistTexture());
    this.mist = new THREE.Points(sg, this.mistMat);
    this.mist.frustumCulled = false;
    this.mist.renderOrder = 4;
    this.fx.add(this.mist);
  }

  setViewport(_w: number, _h: number, pr: number) {
    this.mistMat.uniforms.uPR.value = pr;
  }

  update(dt: number, S: MachiningState, focus: THREE.Object3D, spinAngle: number) {
    this.t += dt;
    const vis = S.block > 0.002;
    this.work.visible = vis;
    this.work.position.x = this.work.userData.gap * 0.01 + (1 - S.block) * 1.8;
    this.work.rotation.y = (1 - S.block) * -0.35;
    const op = Math.min(1, S.block * 1.4);
    for (const m of this.mats) (m as THREE.MeshPhysicalMaterial).opacity = op;
    this.plug.visible = S.hole < 0.5;
    this.holeGroup.visible = S.hole >= 0.5 && vis;
    // Çubuk döner (tornada delme): kesme sırasında hızlı, diğer anlarda yavaş
    this.spinner.rotation.x -= dt * (0.4 + S.cut * 9);

    // Delik ağzı ve eksen (dünya)
    this.work.updateWorldMatrix(true, true);
    const entry = this.entryAnchor.getWorldPosition(new THREE.Vector3());
    const ax = new THREE.Vector3(1, 0, 0).transformDirection(focus.matrixWorld);
    const U = new THREE.Vector3(1, 0, 0).applyMatrix4(this.work.matrixWorld).sub(new THREE.Vector3().applyMatrix4(this.work.matrixWorld)).length() * 0.01;
    const p1 = new THREE.Vector3(0, 1, 0).cross(ax);
    if (p1.lengthSq() < 1e-4) p1.set(0, 0, 1);
    p1.normalize();
    const p2 = new THREE.Vector3().copy(ax).cross(p1).normalize();
    const dirAt = (ang: number, out: THREE.Vector3) => out.copy(p1).multiplyScalar(Math.cos(ang)).addScaledVector(p2, Math.sin(ang));

    /* --- Talaş: oluk çıkışlarından, sıvıyla geriye ve dışa savrulur --- */
    if (S.cut > 0.05) {
      this.chipAcc += dt * S.cut * 46;
      while (this.chipAcc > 1) {
        this.chipAcc--;
        const set = this.chipSets[Math.floor(Math.random() * this.chipSets.length)];
        let i = -1;
        for (let k = 0; k < set.n; k++) if (set.age[k] >= set.max[k]) { i = k; break; }
        if (i < 0) continue;
        const ang = spinAngle + (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.4, 0.4);
        const rad = dirAt(ang, this.v2);
        const tan = new THREE.Vector3().copy(ax).cross(rad).normalize();
        const rr = rnd(6, 11);
        const back = rnd(1, 4);
        set.P[i * 3] = entry.x + (rad.x * rr - ax.x * back) * U;
        set.P[i * 3 + 1] = entry.y + (rad.y * rr - ax.y * back) * U;
        set.P[i * 3 + 2] = entry.z + (rad.z * rr - ax.z * back) * U;
        const vt = rnd(90, 220), vr = rnd(70, 170), vb = rnd(260, 470), vu = rnd(20, 90);
        set.V[i * 3] = (tan.x * vt + rad.x * vr - ax.x * vb) * U;
        set.V[i * 3 + 1] = (tan.y * vt + rad.y * vr - ax.y * vb + vu) * U;
        set.V[i * 3 + 2] = (tan.z * vt + rad.z * vr - ax.z * vb) * U;
        for (let k = 0; k < 3; k++) { set.R[i * 3 + k] = Math.random() * 6.28; set.W[i * 3 + k] = rnd(-12, 12); }
        set.age[i] = 0;
        set.max[i] = rnd(1.2, 1.9);
        set.s[i] = rnd(1.5, 2.4);
      }
    }
    for (const set of this.chipSets) {
      for (let i = 0; i < set.n; i++) {
        const alive = set.age[i] < set.max[i];
        if (alive) {
          set.age[i] += dt;
          set.V[i * 3 + 1] -= 1100 * U * dt;
          for (let k = 0; k < 3; k++) {
            set.V[i * 3 + k] *= 1 - dt * 0.6;
            set.P[i * 3 + k] += set.V[i * 3 + k] * dt;
            set.R[i * 3 + k] += set.W[i * 3 + k] * dt;
          }
        }
        const life = set.age[i] / set.max[i];
        const sc = alive ? set.s[i] * U * (life < 0.06 ? life / 0.06 : life > 0.85 ? (1 - life) / 0.15 : 1) : 0;
        this.dummy.position.set(set.P[i * 3], set.P[i * 3 + 1], set.P[i * 3 + 2]);
        this.dummy.rotation.set(set.R[i * 3], set.R[i * 3 + 1], set.R[i * 3 + 2]);
        this.dummy.scale.setScalar(sc);
        this.dummy.updateMatrix();
        set.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
    }

    /* --- Soğutma spreyi: delik ağzından yelpaze gibi açılır --- */
    const flow = S.cut;
    if (flow > 0.05 && vis) {
      this.dropAcc += dt * flow * 520;
      while (this.dropAcc > 1) {
        this.dropAcc--;
        let i = -1;
        for (let k = 0; k < this.dropN; k++) if (this.dAge[k] >= this.dMax[k]) { i = k; break; }
        if (i < 0) break;
        const ang = Math.random() * Math.PI * 2;
        const rad = dirAt(ang, this.v2);
        const tan = new THREE.Vector3().copy(ax).cross(rad).normalize();
        const r0 = HOLE_R * rnd(0.85, 1.02);
        this.dP[i * 3] = entry.x + (rad.x * r0 - ax.x * 0.5) * U;
        this.dP[i * 3 + 1] = entry.y + (rad.y * r0 - ax.y * 0.5) * U;
        this.dP[i * 3 + 2] = entry.z + (rad.z * r0 - ax.z * 0.5) * U;
        const vr = rnd(160, 420), vb = rnd(60, 240), vt = rnd(-90, 160);
        this.dV[i * 3] = (rad.x * vr - ax.x * vb + tan.x * vt) * U;
        this.dV[i * 3 + 1] = (rad.y * vr - ax.y * vb + tan.y * vt) * U;
        this.dV[i * 3 + 2] = (rad.z * vr - ax.z * vb + tan.z * vt) * U;
        this.dAge[i] = 0;
        this.dMax[i] = rnd(0.1, 0.26);
      }
    }
    const lp = this.dropGeo.attributes.position.array as Float32Array;
    const lc = this.dropGeo.attributes.color.array as Float32Array;
    const TRAIL = 0.022;
    for (let i = 0; i < this.dropN; i++) {
      const o = i * 6, c = i * 8;
      if (this.dAge[i] < this.dMax[i]) {
        this.dAge[i] += dt;
        this.dV[i * 3 + 1] -= 1500 * U * dt;
        for (let k = 0; k < 3; k++) this.dP[i * 3 + k] += this.dV[i * 3 + k] * dt;
        const f = 1 - Math.min(1, this.dAge[i] / this.dMax[i]);
        lp[o] = this.dP[i * 3]; lp[o + 1] = this.dP[i * 3 + 1]; lp[o + 2] = this.dP[i * 3 + 2];
        lp[o + 3] = this.dP[i * 3] - this.dV[i * 3] * TRAIL; lp[o + 4] = this.dP[i * 3 + 1] - this.dV[i * 3 + 1] * TRAIL; lp[o + 5] = this.dP[i * 3 + 2] - this.dV[i * 3 + 2] * TRAIL;
        lc[c] = 0.94; lc[c + 1] = 0.97; lc[c + 2] = 1.0; lc[c + 3] = 0.7 * f;
        lc[c + 4] = 0.8; lc[c + 5] = 0.86; lc[c + 6] = 0.92; lc[c + 7] = 0;
      } else {
        lc[c + 3] = 0; lc[c + 7] = 0;
      }
    }
    this.dropGeo.attributes.position.needsUpdate = true;
    this.dropGeo.attributes.color.needsUpdate = true;

    /* --- Sis: kesme bölgesinden yayılır, çabuk söner --- */
    this.mistAcc += dt * flow * 26 * (vis ? 1 : 0);
    while (this.mistAcc > 1) {
      this.mistAcc--;
      let i = -1;
      for (let k = 0; k < this.mistN; k++) if (this.mAge[k] >= this.mMax[k]) { i = k; break; }
      if (i < 0) break;
      const rad = dirAt(Math.random() * Math.PI * 2, this.v2);
      const r = rnd(10, 20);
      this.mP[i * 3] = entry.x + (rad.x * r - ax.x * 4) * U;
      this.mP[i * 3 + 1] = entry.y + (rad.y * r - ax.y * 4) * U;
      this.mP[i * 3 + 2] = entry.z + (rad.z * r - ax.z * 4) * U;
      this.mV[i * 3] = (rad.x * 60 - ax.x * 40) * U;
      this.mV[i * 3 + 1] = (rad.y * 60 + rnd(10, 40)) * U;
      this.mV[i * 3 + 2] = (rad.z * 60 - ax.z * 40) * U;
      this.mAge[i] = 0;
      this.mMax[i] = rnd(0.9, 1.8);
      this.mSize[i] = rnd(50, 90) * U * 100;
      this.mRot[i] = Math.random() * 6.28;
    }
    for (let i = 0; i < this.mistN; i++) {
      if (this.mAge[i] < this.mMax[i]) {
        this.mAge[i] += dt;
        for (let k = 0; k < 3; k++) { this.mV[i * 3 + k] *= 1 - dt * 1.4; this.mP[i * 3 + k] += this.mV[i * 3 + k] * dt; }
        this.mRot[i] += dt * 0.4 * (i % 2 ? 1 : -1);
        this.mLife[i] = this.mAge[i] / this.mMax[i];
      } else this.mLife[i] = 1;
    }
    const mg = this.mist.geometry;
    mg.attributes.position.needsUpdate = true;
    mg.attributes.aLife.needsUpdate = true;
    mg.attributes.aSize.needsUpdate = true;
    mg.attributes.aRot.needsUpdate = true;
  }
}
