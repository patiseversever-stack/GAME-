// Talaş kaldırma sahnesi (gerçekçi):
// - Frezelenmiş çelik plaka: alın yüzünde freze tarama izleri, yanlarda taşlama izleri, pahlı kenarlar
// - Gerçek delik: içi görünen silindir, ağzında pah, etrafında ısı menevişi (saman → mor → mavi)
// - Talaş: yassı, ucu incelen kıvrık şeritler; ince film (iridescence) ile menevişli çelik rengi
// - Kıvılcım: hıza göre uzayan parlak şeritler; duman: delikten yükselen ince sis; toz: ışıkta asılı zerreler
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const FACE = 154; // alın yüzünün düz kısmı (mm)
const DEPTH = 60;
const HOLE_R = 12.6;

/* ======================= Doku üreticiler ======================= */
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** Yükseklik kanvasından normal haritası üretir */
function normalFrom(src: HTMLCanvasElement, strength = 2.2) {
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

/** Alın frezesi tarama izleri: iki geçişten oluşan iç içe yaylar */
function swirlTextures() {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = 'rgb(118,118,118)';
  g.fillRect(0, 0, S, S);
  const pass = (cx: number, cy: number, r0: number, r1: number) => {
    for (let r = r0; r < r1; r += rnd(2.2, 3.6)) {
      const v = rnd(0, 1);
      g.strokeStyle = v > 0.5 ? `rgba(255,255,255,${rnd(0.02, 0.07)})` : `rgba(0,0,0,${rnd(0.02, 0.08)})`;
      g.lineWidth = rnd(0.8, 2.2);
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }
  };
  pass(-S * 0.55, S * 0.35, S * 0.6, S * 1.9);
  g.save();
  g.globalAlpha = 0.55;
  pass(-S * 0.55, S * 1.05, S * 0.7, S * 1.9);
  g.restore();
  // İnce gürültü
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rnd(-9, 9);
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const rough = new THREE.CanvasTexture(c);
  rough.colorSpace = THREE.NoColorSpace;
  rough.anisotropy = 8;
  const normal = normalFrom(c, 0.9);
  normal.anisotropy = 8;
  return { rough, normal };
}

/** Yan yüzler: düz taşlama çizgileri */
function grindTextures() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = 'rgb(110,110,110)';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const y = rnd(0, 512);
    g.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${rnd(0.02, 0.07)})` : `rgba(0,0,0,${rnd(0.02, 0.08)})`;
    g.lineWidth = rnd(0.5, 1.6);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y + rnd(-2, 2));
    g.stroke();
  }
  const rough = new THREE.CanvasTexture(c);
  rough.colorSpace = THREE.NoColorSpace;
  rough.anisotropy = 8;
  const normal = normalFrom(c, 1.2);
  return { rough, normal };
}

/** Delik içi: tornalama halkaları */
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

function smokeTexture() {
  const [c, g] = canvas(128, 128);
  for (let i = 0; i < 26; i++) {
    const x = 64 + rnd(-24, 24), y = 64 + rnd(-24, 24), r = rnd(16, 44);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${rnd(0.14, 0.3)})`);
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

/* ======================= Malzemeler (shader) ======================= */
/** Kıvılcım başı: parlak, yumuşak nokta (toplamalı) */
function headMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aAlpha;
      uniform float uPR;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR;
        vA = aAlpha;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float core = smoothstep(0.22, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.45;
        vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.55), core);
        gl_FragColor = vec4(col * 1.5, (core + halo) * vA);
      }`,
  });
}

function smokeMaterial(tex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: tex }, uPR: { value: 1 }, uOpacity: { value: 0.8 }, uColor: { value: new THREE.Color(0xb9bec6) } },
    vertexShader: /* glsl */ `
      attribute float aLife; attribute float aSize; attribute float aRot;
      uniform float uPR;
      varying float vA; varying float vRot;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (0.35 + aLife * 1.5) / -mv.z;
        vA = smoothstep(0.0, 0.18, aLife) * (1.0 - aLife);
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

function dustMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: 1 }, uOpacity: { value: 0.3 }, uColor: { value: new THREE.Color(0xffe2b0) }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed;
      uniform float uPR; uniform float uTime;
      varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR / -mv.z;
        vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * uOpacity * vTw);
      }`,
  });
}

/** Delik çevresi: ısı menevişi (normal karışım) */
function temperMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTemper: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTemper; varying vec2 vP;
      void main() {
        float r = length(vP);
        float t = clamp((r - 12.6) / 20.0, 0.0, 1.0);
        // İçten dışa: koyu mavi → mor → bronz → saman sarısı → çelik
        vec3 c1 = vec3(0.16, 0.22, 0.45), c2 = vec3(0.42, 0.25, 0.48), c3 = vec3(0.62, 0.42, 0.24), c4 = vec3(0.86, 0.72, 0.45);
        vec3 col = t < 0.25 ? mix(c1, c2, t / 0.25) : t < 0.5 ? mix(c2, c3, (t - 0.25) / 0.25) : mix(c3, c4, (t - 0.5) / 0.5);
        float a = (1.0 - smoothstep(0.55, 1.0, t)) * 0.62 * uTemper;
        gl_FragColor = vec4(col, a);
      }`,
  });
}

/** Kesme sırasında delik ağzındaki kızıllık (toplamalı) */
function glowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; varying vec2 vP;
      void main() {
        float r = length(vP);
        float g = 1.0 - smoothstep(12.6, 17.5, r);
        float flick = 0.82 + 0.18 * sin(uTime * 41.0 + atan(vP.y, vP.x) * 5.0);
        vec3 col = mix(vec3(1.0, 0.25, 0.03), vec3(1.0, 0.72, 0.38), 1.0 - smoothstep(12.6, 14.2, r));
        gl_FragColor = vec4(col, g * g * uHeat * flick);
      }`,
  });
}

/* ======================= Talaş geometrisi ======================= */
/** Yassı, ucu incelen kıvrık şerit (helis boyunca) */
function chipRibbon(turns: number, radius: number, pitch: number, width: number, taper: number, segs = 56) {
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
  private temper: THREE.ShaderMaterial;
  private glow: THREE.ShaderMaterial;
  private temperK = 0;
  private entryAnchor = new THREE.Object3D();

  private chipSets: ChipSet[] = [];
  private chipAcc = 0;
  private sparkN: number;
  private sP: Float32Array; private sV: Float32Array;
  private sAge: Float32Array; private sMax: Float32Array;
  private lineGeo: THREE.BufferGeometry; private lineMat: THREE.LineBasicMaterial;
  private headGeo: THREE.BufferGeometry; private headMat: THREE.ShaderMaterial;
  private sparkAcc = 0;
  private smoke: THREE.Points; private smokeMat: THREE.ShaderMaterial; private smokeN: number;
  private mP: Float32Array; private mV: Float32Array; private mAge: Float32Array; private mMax: Float32Array; private mLife: Float32Array; private mSize: Float32Array; private mRot: Float32Array;
  private smokeAcc = 0;
  private dust: THREE.Points; private dustMat: THREE.ShaderMaterial; private dP: Float32Array; private dV: Float32Array;

  private t = 0;
  private dummy = new THREE.Object3D();
  private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3();
  private color = new THREE.Color();

  constructor(mobile: boolean, tipMM: number) {
    /* ---------- İş parçası ---------- */
    const sw = swirlTextures();
    const gr = grindTextures();
    const faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xc3c9d0, metalness: 1, roughness: 0.44, roughnessMap: sw.rough, normalMap: sw.normal,
      normalScale: new THREE.Vector2(0.14, 0.14), transparent: true, envMapIntensity: 1.45,
    });
    const sideMat = new THREE.MeshPhysicalMaterial({
      color: 0xb3b9c1, metalness: 1, roughness: 0.75, roughnessMap: gr.rough, normalMap: gr.normal,
      normalScale: new THREE.Vector2(0.12, 0.12), transparent: true,
    });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    this.mats.push(faceMat, sideMat);

    const inner = new THREE.Group();
    // Gövde: alın yüzü (-X) gizli, yerine delikli plaka gelir
    const body = new THREE.Mesh(new RoundedBoxGeometry(DEPTH, FACE + 6, FACE + 6, 4, 3), [sideMat, hidden, sideMat, sideMat, sideMat, sideMat]);
    body.position.x = DEPTH / 2;
    inner.add(body);

    // Alın plakası (delikli)
    const shape = new THREE.Shape();
    const h = FACE / 2;
    shape.moveTo(-h, -h); shape.lineTo(h, -h); shape.lineTo(h, h); shape.lineTo(-h, h); shape.closePath();
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    const faceGeo = new THREE.ShapeGeometry(shape, 64);
    const uv = faceGeo.attributes.uv;
    const fp = faceGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (fp.getX(i) + h) / FACE, (fp.getY(i) + h) / FACE);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.y = -Math.PI / 2;
    inner.add(face);

    // Delik delinmeden önce kapalı görünsün diye tıpa
    const plugGeo = new THREE.CircleGeometry(HOLE_R + 0.05, 48);
    const pu = plugGeo.attributes.uv, pp = plugGeo.attributes.position;
    for (let i = 0; i < pu.count; i++) pu.setXY(i, (pp.getX(i) + h) / FACE, (pp.getY(i) + h) / FACE);
    this.plug = new THREE.Mesh(plugGeo, faceMat);
    this.plug.rotation.y = -Math.PI / 2;
    this.plug.position.x = 0.02;
    inner.add(this.plug);

    // Delik içi
    const bore = boreTexture();
    bore.repeat.set(1, 2);
    const boreMat = new THREE.MeshPhysicalMaterial({ color: 0xa4aab3, metalness: 1, roughness: 0.32, map: bore, side: THREE.BackSide });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R, DEPTH - 6, 56, 1, true), boreMat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.x = (DEPTH - 6) / 2;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(HOLE_R, 48), new THREE.MeshBasicMaterial({ color: 0x050506 }));
    bottom.rotation.y = -Math.PI / 2;
    bottom.position.x = DEPTH - 6;
    // Ağızdaki pah: parlak konik bant
    const chamfer = new THREE.Mesh(
      new THREE.CylinderGeometry(HOLE_R, HOLE_R + 1.4, 1.4, 56, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe3e7ec, metalness: 1, roughness: 0.14, side: THREE.DoubleSide }),
    );
    chamfer.rotation.z = Math.PI / 2;
    chamfer.position.x = 0.6;
    this.holeGroup.add(cyl, bottom, chamfer);
    inner.add(this.holeGroup);

    // Isı menevişi ve kızıllık
    this.temper = temperMaterial();
    const tRing = new THREE.Mesh(new THREE.RingGeometry(HOLE_R + 1.3, 36, 72, 1), this.temper);
    tRing.rotation.y = -Math.PI / 2;
    tRing.position.x = -0.06;
    this.glow = glowMaterial();
    const gRing = new THREE.Mesh(new THREE.RingGeometry(HOLE_R - 0.2, 20, 72, 1), this.glow);
    gRing.rotation.y = -Math.PI / 2;
    gRing.position.x = -0.1;
    inner.add(tRing, gRing, this.entryAnchor);
    this.entryAnchor.position.set(-1, 0, 0);

    inner.scale.setScalar(0.01);
    this.work.add(inner);
    this.work.userData.gap = tipMM + 1.2;
    this.work.visible = false;

    /* ---------- Talaşlar: üç farklı form ---------- */
    const chipMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 1, roughness: 0.26, side: THREE.DoubleSide,
      iridescence: 0.22, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 420],
    });
    const forms = [
      chipRibbon(0.85, 3.0, 1.6, 2.4, 0.5), // C talaş
      chipRibbon(2.1, 2.1, 2.6, 1.7, 0.35), // yay talaş
      chipRibbon(0.5, 3.8, 0.8, 2.8, 0.7), // virgül talaş
    ];
    const per = mobile ? 22 : 42;
    const tints = [0xd4d8de, 0xc6cbd2, 0xb9bec6, 0xd9c08a, 0xc9a46a, 0xb08458, 0x8c90a8, 0x6d84b6, 0xd4d8de, 0xa9aeb5];
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

    /* ---------- Kıvılcımlar: hız izi çizgisi + parlak baş ---------- */
    this.sparkN = mobile ? 120 : 240;
    this.sP = new Float32Array(this.sparkN * 3);
    this.sV = new Float32Array(this.sparkN * 3);
    this.sAge = new Float32Array(this.sparkN).fill(99);
    this.sMax = new Float32Array(this.sparkN).fill(1);
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sparkN * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.sparkN * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const lines = new THREE.LineSegments(this.lineGeo, this.lineMat);
    lines.frustumCulled = false;
    lines.renderOrder = 6;
    this.headGeo = new THREE.BufferGeometry();
    this.headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sparkN * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.headGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(this.sparkN), 1).setUsage(THREE.DynamicDrawUsage));
    this.headGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(this.sparkN), 1).setUsage(THREE.DynamicDrawUsage));
    this.headMat = headMaterial();
    const heads = new THREE.Points(this.headGeo, this.headMat);
    heads.frustumCulled = false;
    heads.renderOrder = 7;
    this.fx.add(lines, heads);

    /* ---------- Duman ---------- */
    this.smokeN = mobile ? 46 : 90;
    this.mP = new Float32Array(this.smokeN * 3); this.mV = new Float32Array(this.smokeN * 3);
    this.mAge = new Float32Array(this.smokeN).fill(99); this.mMax = new Float32Array(this.smokeN).fill(1);
    this.mLife = new Float32Array(this.smokeN).fill(1); this.mSize = new Float32Array(this.smokeN); this.mRot = new Float32Array(this.smokeN);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.mP, 3));
    sg.setAttribute('aLife', new THREE.BufferAttribute(this.mLife, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(this.mSize, 1));
    sg.setAttribute('aRot', new THREE.BufferAttribute(this.mRot, 1));
    this.smokeMat = smokeMaterial(smokeTexture());
    this.smoke = new THREE.Points(sg, this.smokeMat);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 4;
    this.fx.add(this.smoke);

    /* ---------- Toz ---------- */
    const dn = mobile ? 90 : 220;
    this.dP = new Float32Array(dn * 3); this.dV = new Float32Array(dn * 3);
    const dSize = new Float32Array(dn), dSeed = new Float32Array(dn);
    for (let i = 0; i < dn; i++) {
      this.dP[i * 3] = rnd(-3.2, 3.2); this.dP[i * 3 + 1] = rnd(-1.8, 1.8); this.dP[i * 3 + 2] = rnd(-1.6, 1.8);
      this.dV[i * 3] = rnd(-0.03, 0.03); this.dV[i * 3 + 1] = rnd(-0.015, 0.03); this.dV[i * 3 + 2] = rnd(-0.02, 0.02);
      dSize[i] = rnd(2.2, 7.5); dSeed[i] = Math.random();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(this.dP, 3));
    dg.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
    this.dustMat = dustMaterial();
    this.dust = new THREE.Points(dg, this.dustMat);
    this.dust.frustumCulled = false;
    this.fx.add(this.dust);
  }

  setViewport(w: number, h: number, pr: number) {
    this.headMat.uniforms.uPR.value = pr;
    this.smokeMat.uniforms.uPR.value = pr;
    this.dustMat.uniforms.uPR.value = pr;
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
    this.temperK = Math.max(this.temperK * (S.hole > 0 ? 1 : 0), S.heat);
    if (S.hole <= 0) this.temperK = 0;
    this.temper.uniforms.uTemper.value = this.temperK * op;
    this.glow.uniforms.uHeat.value = S.heat * S.cut * 1.3 + S.heat * 0.25;
    this.glow.uniforms.uTime.value = this.t;

    // Delik ağzı ve eksen (dünya)
    this.work.updateWorldMatrix(true, true);
    const entry = this.entryAnchor.getWorldPosition(this.v1.set(0, 0, 0)).clone();
    const ax = new THREE.Vector3(1, 0, 0).transformDirection(focus.matrixWorld);
    const U = new THREE.Vector3(1, 0, 0).applyMatrix4(this.work.matrixWorld).sub(new THREE.Vector3().applyMatrix4(this.work.matrixWorld)).length() * 0.01;
    const p1 = new THREE.Vector3(0, 1, 0).cross(ax);
    if (p1.lengthSq() < 1e-4) p1.set(0, 0, 1);
    p1.normalize();
    const p2 = new THREE.Vector3().copy(ax).cross(p1).normalize();
    const dirAt = (ang: number, out: THREE.Vector3) => out.copy(p1).multiplyScalar(Math.cos(ang)).addScaledVector(p2, Math.sin(ang));

    /* --- Talaş üret: oluk çıkışlarından, dönüş yönünde fırlar --- */
    if (S.cut > 0.05) {
      this.chipAcc += dt * S.cut * 62;
      while (this.chipAcc > 1) {
        this.chipAcc--;
        const set = this.chipSets[Math.floor(Math.random() * this.chipSets.length)];
        let i = -1;
        for (let k = 0; k < set.n; k++) if (set.age[k] >= set.max[k]) { i = k; break; }
        if (i < 0) continue;
        const ang = spinAngle + (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.5, 0.5);
        const rad = dirAt(ang, this.v2);
        const tan = new THREE.Vector3().copy(ax).cross(rad).normalize();
        const rr = rnd(7, 12);
        const back = rnd(2, 6);
        set.P[i * 3] = entry.x + (rad.x * rr - ax.x * back) * U;
        set.P[i * 3 + 1] = entry.y + (rad.y * rr - ax.y * back) * U;
        set.P[i * 3 + 2] = entry.z + (rad.z * rr - ax.z * back) * U;
        const vt = rnd(260, 520), vr = rnd(70, 190), vb = rnd(110, 260), vu = rnd(40, 140);
        set.V[i * 3] = (tan.x * vt + rad.x * vr - ax.x * vb) * U;
        set.V[i * 3 + 1] = (tan.y * vt + rad.y * vr - ax.y * vb + vu) * U;
        set.V[i * 3 + 2] = (tan.z * vt + rad.z * vr - ax.z * vb) * U;
        for (let k = 0; k < 3; k++) { set.R[i * 3 + k] = Math.random() * 6.28; set.W[i * 3 + k] = rnd(-16, 16); }
        set.age[i] = 0;
        set.max[i] = rnd(1.3, 2.1);
        set.s[i] = rnd(1.8, 2.8);
      }
    }
    for (const set of this.chipSets) {
      for (let i = 0; i < set.n; i++) {
        const alive = set.age[i] < set.max[i];
        if (alive) {
          set.age[i] += dt;
          set.V[i * 3 + 1] -= 1150 * U * dt;
          for (let k = 0; k < 3; k++) {
            set.V[i * 3 + k] *= 1 - dt * 0.35;
            set.P[i * 3 + k] += set.V[i * 3 + k] * dt;
            set.R[i * 3 + k] += set.W[i * 3 + k] * dt;
          }
        }
        const life = set.age[i] / set.max[i];
        const s = alive ? set.s[i] * U * (life < 0.06 ? life / 0.06 : life > 0.85 ? (1 - life) / 0.15 : 1) : 0;
        this.dummy.position.set(set.P[i * 3], set.P[i * 3 + 1], set.P[i * 3 + 2]);
        this.dummy.rotation.set(set.R[i * 3], set.R[i * 3 + 1], set.R[i * 3 + 2]);
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        set.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
    }

    /* --- Kıvılcımlar: kesme kenarından teğet fırlar --- */
    const sp = this.sP, sv = this.sV;
    if (S.cut > 0.05) {
      this.sparkAcc += dt * S.cut * 150;
      while (this.sparkAcc > 1) {
        this.sparkAcc--;
        let i = -1;
        for (let k = 0; k < this.sparkN; k++) if (this.sAge[k] >= this.sMax[k]) { i = k; break; }
        if (i < 0) break;
        const ang = Math.random() * Math.PI * 2;
        const rad = dirAt(ang, this.v2);
        const tan = new THREE.Vector3().copy(ax).cross(rad).normalize();
        sp[i * 3] = entry.x + (rad.x * 12.8 - ax.x * 1) * U;
        sp[i * 3 + 1] = entry.y + (rad.y * 12.8 - ax.y * 1) * U;
        sp[i * 3 + 2] = entry.z + (rad.z * 12.8 - ax.z * 1) * U;
        const vt = rnd(500, 1100), vr = rnd(150, 500), vb = rnd(60, 260);
        sv[i * 3] = (tan.x * vt + rad.x * vr - ax.x * vb) * U;
        sv[i * 3 + 1] = (tan.y * vt + rad.y * vr - ax.y * vb + rnd(0, 200)) * U;
        sv[i * 3 + 2] = (tan.z * vt + rad.z * vr - ax.z * vb) * U;
        this.sAge[i] = 0;
        this.sMax[i] = rnd(0.12, 0.42);
      }
    }
    const lp = this.lineGeo.attributes.position.array as Float32Array;
    const lc = this.lineGeo.attributes.color.array as Float32Array;
    const hp = this.headGeo.attributes.position.array as Float32Array;
    const hs = this.headGeo.attributes.aSize.array as Float32Array;
    const ha = this.headGeo.attributes.aAlpha.array as Float32Array;
    const TRAIL = 0.022; // s: iz uzunluğu
    for (let i = 0; i < this.sparkN; i++) {
      const o = i * 6;
      if (this.sAge[i] < this.sMax[i]) {
        this.sAge[i] += dt;
        sv[i * 3 + 1] -= 1600 * U * dt;
        sp[i * 3] += sv[i * 3] * dt;
        sp[i * 3 + 1] += sv[i * 3 + 1] * dt;
        sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
        const life = Math.min(1, this.sAge[i] / this.sMax[i]);
        const f = 1 - life;
        lp[o] = sp[i * 3]; lp[o + 1] = sp[i * 3 + 1]; lp[o + 2] = sp[i * 3 + 2];
        lp[o + 3] = sp[i * 3] - sv[i * 3] * TRAIL; lp[o + 4] = sp[i * 3 + 1] - sv[i * 3 + 1] * TRAIL; lp[o + 5] = sp[i * 3 + 2] - sv[i * 3 + 2] * TRAIL;
        lc[o] = 1.3 * f; lc[o + 1] = 0.82 * f; lc[o + 2] = 0.32 * f;
        lc[o + 3] = 0.55 * f; lc[o + 4] = 0.1 * f; lc[o + 5] = 0;
        hp[i * 3] = sp[i * 3]; hp[i * 3 + 1] = sp[i * 3 + 1]; hp[i * 3 + 2] = sp[i * 3 + 2];
        hs[i] = 4 + 6 * f;
        ha[i] = f;
      } else {
        lc[o] = lc[o + 1] = lc[o + 2] = lc[o + 3] = lc[o + 4] = lc[o + 5] = 0;
        ha[i] = 0;
      }
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.lineGeo.attributes.color.needsUpdate = true;
    this.headGeo.attributes.position.needsUpdate = true;
    this.headGeo.attributes.aSize.needsUpdate = true;
    this.headGeo.attributes.aAlpha.needsUpdate = true;

    /* --- Duman: delik ağzından yükselir --- */
    this.smokeAcc += dt * (S.heat * 24 + S.cut * 16) * (vis ? 1 : 0);
    while (this.smokeAcc > 1) {
      this.smokeAcc--;
      let i = -1;
      for (let k = 0; k < this.smokeN; k++) if (this.mAge[k] >= this.mMax[k]) { i = k; break; }
      if (i < 0) break;
      const rad = dirAt(Math.random() * Math.PI * 2, this.v2);
      const r = rnd(6, 16);
      this.mP[i * 3] = entry.x + (rad.x * r - ax.x * 3) * U;
      this.mP[i * 3 + 1] = entry.y + (rad.y * r - ax.y * 3) * U;
      this.mP[i * 3 + 2] = entry.z + (rad.z * r - ax.z * 3) * U;
      this.mV[i * 3] = (rnd(-10, 10) - ax.x * 22) * U;
      this.mV[i * 3 + 1] = rnd(30, 70) * U;
      this.mV[i * 3 + 2] = (rnd(-10, 10) - ax.z * 22) * U;
      this.mAge[i] = 0;
      this.mMax[i] = rnd(2.0, 3.6);
      this.mSize[i] = rnd(55, 95) * U * 100;
      this.mRot[i] = Math.random() * 6.28;
    }
    for (let i = 0; i < this.smokeN; i++) {
      if (this.mAge[i] < this.mMax[i]) {
        this.mAge[i] += dt;
        this.mV[i * 3 + 1] += 14 * U * dt;
        this.mP[i * 3] += this.mV[i * 3] * dt + Math.sin(this.t * 1.1 + i) * 5 * U * dt;
        this.mP[i * 3 + 1] += this.mV[i * 3 + 1] * dt;
        this.mP[i * 3 + 2] += this.mV[i * 3 + 2] * dt;
        this.mRot[i] += dt * 0.35 * (i % 2 ? 1 : -1);
        this.mLife[i] = this.mAge[i] / this.mMax[i];
      } else this.mLife[i] = 1;
    }
    const sg = this.smoke.geometry;
    sg.attributes.position.needsUpdate = true;
    sg.attributes.aLife.needsUpdate = true;
    sg.attributes.aSize.needsUpdate = true;
    sg.attributes.aRot.needsUpdate = true;

    /* --- Toz --- */
    const dp = this.dP, dv = this.dV;
    for (let i = 0; i < dp.length / 3; i++) {
      dp[i * 3] += dv[i * 3] * dt; dp[i * 3 + 1] += dv[i * 3 + 1] * dt; dp[i * 3 + 2] += dv[i * 3 + 2] * dt;
      if (dp[i * 3] > 3.3) dp[i * 3] = -3.3; else if (dp[i * 3] < -3.3) dp[i * 3] = 3.3;
      if (dp[i * 3 + 1] > 1.9) dp[i * 3 + 1] = -1.9; else if (dp[i * 3 + 1] < -1.9) dp[i * 3 + 1] = 1.9;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dustMat.uniforms.uTime.value = this.t;
  }
}
