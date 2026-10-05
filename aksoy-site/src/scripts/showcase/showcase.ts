// Kaydırmaya bağlı 3D vitrin: three.js sahnesi + GSAP ScrollTrigger zaman çizelgesi.
// Kaydırma bir "oynatma kafası" gibi çalışır: her bölümde matkap yeni bir poza geçer,
// vidalar çıkar, uçlar havalanır, soğutma sıvısı akar, kaplama rengi değişir.
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildDrill, type Drill } from './model';
import { GLB, applyGlb } from './glb';

gsap.registerPlugin(ScrollTrigger);

type Pose = { rx: number; ry: number; rz: number; px: number; py: number; scale: number; focus: number; spin: number };

const CHAPTERS = ['Giriş', 'Gövde', 'Uçlar', 'Soğutma', 'Kaplama', 'Teklif'];
const CENTER = -32; // matkabın eksen ortası (mm)

// Masaüstü pozları. px/py: görünür yarı genişlik/yükseklik oranı; scale: temel ölçeğe çarpan.
const DESKTOP: Pose[] = [
  { rx: 0.3, ry: -0.9, rz: 0.45, px: 0.36, py: 0.14, scale: 1.15, focus: CENTER, spin: -0.5 },
  { rx: 0.15, ry: -0.18, rz: 0.04, px: 0.36, py: 0.02, scale: 1.05, focus: CENTER, spin: -0.75 },
  { rx: 0.28, ry: -1.0, rz: 0.12, px: -0.36, py: 0.02, scale: 2.5, focus: 46, spin: -0.15 },
  { rx: 0.2, ry: -1.32, rz: 0.06, px: 0.4, py: 0.02, scale: 2.2, focus: 50, spin: -0.35 },
  { rx: 0.4, ry: -0.75, rz: 0.22, px: -0.38, py: 0.04, scale: 2.5, focus: 50, spin: -0.2 },
  { rx: 0.3, ry: -0.9, rz: 0.45, px: 0.02, py: 0.32, scale: 0.95, focus: CENTER, spin: -0.5 },
];
// Mobil: model ekranın üst yarısında, metin kartı altta.
const MOBILE: Pose[] = [
  { rx: 0.3, ry: -0.9, rz: 0.9, px: 0.0, py: 0.3, scale: 1.95, focus: CENTER, spin: -0.5 },
  { rx: 0.15, ry: -0.18, rz: 0.55, px: 0.0, py: 0.34, scale: 1.75, focus: CENTER, spin: -0.75 },
  { rx: 0.28, ry: -1.0, rz: 0.32, px: 0.06, py: 0.32, scale: 3.6, focus: 46, spin: -0.15 },
  { rx: 0.2, ry: -1.32, rz: 0.24, px: -0.05, py: 0.32, scale: 3.2, focus: 50, spin: -0.35 },
  { rx: 0.4, ry: -0.75, rz: 0.36, px: 0.05, py: 0.34, scale: 3.6, focus: 50, spin: -0.2 },
  { rx: 0.3, ry: -0.85, rz: 0.9, px: 0.0, py: 0.4, scale: 1.7, focus: CENTER, spin: -0.5 },
];

const COATS = [
  { color: new THREE.Color(0xd8a64a), rough: 0.27, metal: 1 }, // TiN
  { color: new THREE.Color(0x3b3e45), rough: 0.33, metal: 0.92 }, // TiAlN
  { color: new THREE.Color(0x80708e), rough: 0.3, metal: 1 }, // TiCN
];

function buildEnvScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x15171b);
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (w: number, h: number, pos: [number, number, number], intensity: number, color = 0xffffff) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  add(10, 4.5, [0, 6, 1], 4.2); // üst softbox
  add(1.6, 12, [-6, 1, 2], 7.0); // sol şerit ışık
  add(1.0, 12, [-5, 0, -3.5], 3.0); // sol arka şerit
  add(1.2, 12, [6, 0.5, -0.5], 3.6, 0xfff1dc); // sağ sıcak şerit
  add(12, 2.6, [0, 1.6, -7], 1.0, 0xfff0dc); // arka ışık (hafif sıcak)
  add(6, 2.2, [2.5, -0.5, 6], 1.4); // ön dolgu
  add(30, 30, [0, -7, 0], 0.22); // zemin (yumuşak alt yansıma)
  return s;
}

function particleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 26 }, uPR: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x9fdcff) } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      uniform float uSize; uniform float uPR;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (1.0 - aLife * 0.35) / -mv.z;
        vA = 1.0 - aLife;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.05, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor * (0.7 + 0.6 * vA), a);
      }`,
  });
}

export interface ShowcaseApi {
  intro(): void;
}

export async function startShowcase(root: HTMLElement, opts: { onProgress?: (p: number) => void; poster?: boolean } = {}): Promise<ShowcaseApi> {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-showcase-canvas]')!;
  const sticky = root.querySelector<HTMLElement>('.showcase__sticky')!;
  const mqMobile = matchMedia('(max-width: 860px)');
  const finePointer = matchMedia('(pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.poster });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
  camera.position.set(0, 0, 5);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildEnvScene();
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;
  envScene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).geometry.dispose(); ((o as THREE.Mesh).material as THREE.Material).dispose(); } });
  opts.onProgress?.(0.55);

  const drill: Drill = buildDrill();
  const pivot = new THREE.Group();
  pivot.rotation.order = 'ZXY';
  const focus = new THREE.Group();
  scene.add(pivot);
  pivot.add(focus);
  focus.add(drill.root);
  const scaler = drill.frame.children[0] as THREE.Group;
  // Kullanıcının GLB modeli tanımlıysa gövdeyi onunla değiştir; hata olursa kodla üretilen model kalır.
  if (GLB) {
    try {
      await applyGlb(drill, GLB, (p) => opts.onProgress?.(0.55 + p * 0.2));
    } catch (err) {
      console.warn('GLB yüklenemedi, geçici model kullanılıyor.', err);
    }
  }
  const bakedInserts = !!GLB?.bakedInserts;
  opts.onProgress?.(0.75);

  /* ---------- Soğutma sıvısı parçacıkları ---------- */
  const N = mqMobile.matches ? 220 : 420;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3);
  const pLife = new Float32Array(N);
  const pVel = new Float32Array(N * 3);
  const pAge = new Float32Array(N);
  const pMax = new Float32Array(N);
  const pSrc = new Uint8Array(N);
  const tmp = new THREE.Vector3();
  function respawn(i: number, stagger = false) {
    const src = drill.coolant[i % drill.coolant.length];
    pSrc[i] = i % drill.coolant.length;
    pAge[i] = stagger ? Math.random() * 0.8 : 0;
    pMax[i] = 0.55 + Math.random() * 0.5;
    const cone = 0.22;
    tmp.set((Math.random() - 0.5) * cone, 1, (Math.random() - 0.5) * cone).normalize();
    tmp.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(-src.dir.x, src.dir.y));
    const speed = 95 + Math.random() * 75;
    pVel[i * 3] = tmp.x * speed;
    pVel[i * 3 + 1] = tmp.y * speed;
    pVel[i * 3 + 2] = tmp.z * speed;
    pPos[i * 3] = src.pos.x;
    pPos[i * 3 + 1] = src.pos.y;
    pPos[i * 3 + 2] = src.pos.z;
  }
  for (let i = 0; i < N; i++) respawn(i, true);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aLife', new THREE.BufferAttribute(pLife, 1));
  const pMat = particleMaterial();
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.visible = false;
  scaler.add(points);

  /* ---------- Durum: zaman çizelgesi bu nesneyi canlandırır ---------- */
  const poses = () => (mqMobile.matches ? MOBILE : DESKTOP);
  const S = { ...poses()[0], screws: 0, lift: 0, insertSpin: 0, coolant: 0, coat: 0, cDim: 0, cIns: 0, cCool: 0 };
  const intro = { k: opts.poster ? 0 : 1 }; // 1 → giriş ofseti tam, 0 → yok
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------- Ölçü çizgileri ve etiketler ---------- */
  const layer = root.querySelector<HTMLElement>('[data-callouts]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-callout-svg]')!;
  const NS = 'http://www.w3.org/2000/svg';
  type Dim = { a: string; b: string; ea?: string; eb?: string; label: string; group: keyof typeof S; off: number; line: SVGPathElement; ext: SVGPathElement; el: HTMLElement };
  type Pin = { anchor: string; label: string; sub: string; group: keyof typeof S; side: 'left' | 'right'; el: HTMLElement };
  const dims: Dim[] = [
    { a: 'dia-a', b: 'dia-b', label: 'Ø 25 mm', group: 'cDim', off: 18 },
    { a: 'len-a', b: 'len-b', ea: 'len-a0', eb: 'len-b0', label: '4 × D · 100 mm', group: 'cDim', off: 16 },
  ].map((d) => {
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'dimline');
    const ext = document.createElementNS(NS, 'path');
    ext.setAttribute('class', 'dimline-tick');
    ext.setAttribute('stroke-dasharray', '3 3');
    svg.append(line, ext);
    const el = document.createElement('div');
    el.className = 'dimlabel';
    el.textContent = d.label;
    layer.append(el);
    return { ...d, group: d.group as keyof typeof S, line, ext, el };
  });
  const pins: Pin[] = [
    { anchor: 'shank', label: 'Weldon sap', sub: 'Ø 32 · sıkma yüzeyi', group: 'cDim', side: 'left' },
    { anchor: 'insert-cevre', label: 'Çevre uç', sub: '4 kesme kenarı', group: 'cIns', side: 'right' },
    { anchor: 'insert-merkez', label: 'Merkez uç', sub: '4 kesme kenarı', group: 'cIns', side: 'left' },
    { anchor: 'screw-cevre', label: 'Torx vida', sub: 'uç bağlama', group: 'cIns', side: 'right' },
    { anchor: 'cool', label: 'İçten soğutma', sub: 'sıvı doğrudan uca', group: 'cCool', side: 'right' },
  ].map((p) => {
    const el = document.createElement('div');
    el.className = `pin${p.side === 'left' ? ' pin--left' : ''}`;
    el.innerHTML = `<span>${p.label}<small>${p.sub}</small></span>`;
    layer.append(el);
    return { ...p, group: p.group as keyof typeof S, side: p.side as 'left' | 'right', el };
  });

  /* ---------- Boyutlandırma ---------- */
  let W = 1, H = 1, visW = 1, visH = 1, base = 1;
  function resize() {
    const r = sticky.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mqMobile.matches ? 1.75 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visW = visH * camera.aspect;
    // Model (1,76 birim) masaüstünde görünür genişliğin ~%44'ü; dar ekranda oranla küçülür.
    base = Math.min(1.08, (visW * 0.46) / 1.76, (visH * 0.8) / 1.76);
    pMat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  new ResizeObserver(resize).observe(sticky);
  resize();

  /* ---------- Uygulama: durum → sahne ---------- */
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const coatTmp = new THREE.Color();
  let t0 = performance.now();
  let elapsed = 0;

  function project(name: string) {
    drill.anchors[name].getWorldPosition(v);
    const z = v.clone().applyMatrix4(camera.matrixWorldInverse).z;
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: z > 0 };
  }

  function apply(dt: number) {
    const idleW = THREE.MathUtils.clamp(1 - Math.min(Math.abs(progress - 0) * 9, 1), 0, 1) + THREE.MathUtils.clamp((progress - 0.88) * 8, 0, 1);
    const wob = opts.poster ? 0 : Math.sin(elapsed * 0.45) * 0.28 * idleW;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    const k = intro.k;
    pivot.rotation.set(S.rx + pointer.y * 0.08 + k * 0.4, S.ry + pointer.x * 0.12 + k * 1.1, S.rz - k * 0.25);
    pivot.position.set((S.px * visW) / 2, (S.py * visH) / 2 - k * 0.35 + (opts.poster ? 0 : Math.sin(elapsed * 0.9) * 0.012), 0);
    pivot.scale.setScalar(S.scale * base * (1 - k * 0.45));
    focus.position.x = -S.focus * 0.01;
    drill.root.rotation.x = S.spin + wob - k * 3.4;

    // Vidalar ve uçlar
    drill.inserts.forEach((ip, i) => {
      const lift = S.lift;
      ip.insert.position.set(0, lift * 5.5 * ip.liftForward, lift * 9);
      ip.insert.rotation.set(lift * 0.45, lift * (i ? -0.3 : 0.3), S.insertSpin * (i ? -1 : 1));
      ip.screw.position.z = 1.9 + S.screws * 10 + lift * 9;
      ip.screw.position.y = lift * 5.5 * ip.liftForward;
      ip.screw.rotation.z = -S.screws * Math.PI * 5;
      if (bakedInserts) {
        const show = lift > 0.02 || S.screws > 0.02;
        ip.insert.visible = show;
        ip.screw.visible = show;
      }
    });

    // Kaplama rengi
    const c = THREE.MathUtils.clamp(S.coat, 0, 2);
    const i0 = Math.floor(c), i1 = Math.min(2, i0 + 1), f = c - i0;
    const m = drill.materials.insert as THREE.MeshPhysicalMaterial;
    coatTmp.lerpColors(COATS[i0].color, COATS[i1].color, f);
    m.color.copy(coatTmp);
    m.roughness = THREE.MathUtils.lerp(COATS[i0].rough, COATS[i1].rough, f);
    m.metalness = THREE.MathUtils.lerp(COATS[i0].metal, COATS[i1].metal, f);

    // Parçacıklar
    pMat.uniforms.uOpacity.value = S.coolant;
    points.visible = S.coolant > 0.01;
    if (points.visible) {
      for (let i = 0; i < N; i++) {
        pAge[i] += dt;
        if (pAge[i] > pMax[i]) respawn(i);
        const a = pAge[i];
        const src = drill.coolant[pSrc[i]];
        pPos[i * 3] = src.pos.x + pVel[i * 3] * a;
        pPos[i * 3 + 1] = src.pos.y + pVel[i * 3 + 1] * a;
        pPos[i * 3 + 2] = src.pos.z + pVel[i * 3 + 2] * a - 40 * a * a;
        pLife[i] = a / pMax[i];
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aLife.needsUpdate = true;
    }

    scene.updateMatrixWorld();

    // Etiketler
    for (const d of dims) {
      const o = S[d.group] as number;
      if (o < 0.01) { d.el.style.opacity = '0'; d.line.style.opacity = '0'; d.ext.style.opacity = '0'; continue; }
      const A = project(d.a), B = project(d.b);
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const t = 6;
      const drawn = len * Math.min(1, o * 1.4);
      const Bx = A.x + (dx / len) * drawn, By = A.y + (dy / len) * drawn;
      d.line.setAttribute('d', `M${A.x},${A.y} L${Bx},${By} M${A.x - nx * t},${A.y - ny * t} L${A.x + nx * t},${A.y + ny * t} M${B.x - nx * t},${B.y - ny * t} L${B.x + nx * t},${B.y + ny * t}`);
      d.line.style.opacity = String(o);
      if (d.ea && d.eb) {
        const EA = project(d.ea), EB = project(d.eb);
        d.ext.setAttribute('d', `M${EA.x},${EA.y} L${A.x},${A.y} M${EB.x},${EB.y} L${B.x},${B.y}`);
        d.ext.style.opacity = String(o * 0.8);
      } else d.ext.style.opacity = '0';
      const mx = (A.x + B.x) / 2 + nx * d.off * Math.sign(ny || 1), my = (A.y + B.y) / 2 + ny * d.off * Math.sign(ny || 1);
      d.el.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      d.el.style.opacity = String(Math.max(0, o * 1.6 - 0.6));
    }
    for (const p of pins) {
      const o = S[p.group] as number;
      if (o < 0.01) { p.el.style.opacity = '0'; continue; }
      const P = project(p.anchor);
      const w = (p.el as any)._w || ((p.el as any)._w = p.el.offsetWidth || 140);
      let side = p.side;
      if (side === 'left' && P.x - w < 8) side = 'right';
      else if (side === 'right' && P.x + w > W - 8) side = 'left';
      p.el.classList.toggle('pin--left', side === 'left');
      const shift = side === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
      p.el.style.transform = `translate(${P.x}px, ${P.y}px) ${shift}`;
      p.el.style.opacity = P.behind ? '0' : String(o);
    }
  }

  /* ---------- Zaman çizelgesi ---------- */
  const chapters = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
  const hudN = root.querySelector<HTMLElement>('[data-hud-n]');
  const hudName = root.querySelector<HTMLElement>('[data-hud-name]');
  const hudBar = root.querySelector<HTMLElement>('[data-hud-bar]');
  const hint = root.querySelector<HTMLElement>('[data-scroll-hint]');
  const coatChips = Array.from(root.querySelectorAll<HTMLElement>('[data-coat-chips] li'));
  let progress = 0;
  let tl: gsap.core.Timeline | null = null;
  let st: ScrollTrigger | null = null;

  function build() {
    const keep = st ? st.progress : 0;
    st?.kill();
    tl?.kill();
    const P = poses();
    Object.assign(S, P[0], { screws: 0, lift: 0, insertSpin: 0, coolant: 0, coat: 0, cDim: 0, cIns: 0, cCool: 0 });
    tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    const ease = 'power3.inOut';
    for (let k = 1; k < P.length; k++) tl.to(S, { ...P[k], duration: 0.6, ease }, k - 0.2);

    // Metin geçişleri
    chapters.forEach((el, k) => {
      const yIn = mqMobile.matches ? 24 : 40;
      if (k > 0) tl!.fromTo(el, { autoAlpha: 0, y: yIn }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out', immediateRender: false }, k + 0.08);
      if (k < chapters.length - 1) tl!.to(el, { autoAlpha: 0, y: -yIn * 0.6, duration: 0.22, ease: 'power2.in' }, k + 0.68);
    });

    // Bölüm efektleri
    tl.to(S, { cDim: 1, duration: 0.3, ease: 'power2.out' }, 1.25).to(S, { cDim: 0, duration: 0.15 }, 1.72);
    tl.to(S, { screws: 1, duration: 0.3 }, 2.0).to(S, { lift: 1, duration: 0.32, ease: 'power3.out' }, 2.18);
    tl.to(S, { insertSpin: Math.PI, duration: 0.6, ease: 'none' }, 2.25);
    tl.to(S, { cIns: 1, duration: 0.2 }, 2.42).to(S, { cIns: 0, duration: 0.14 }, 2.74);
    tl.to(S, { lift: 0, insertSpin: Math.PI * 2, duration: 0.3, ease: 'power3.inOut' }, 2.84).to(S, { screws: 0, duration: 0.24 }, 3.02);
    tl.to(S, { coolant: 1, duration: 0.2 }, 3.24).to(S, { cCool: 1, duration: 0.2 }, 3.32).to(S, { cCool: 0, coolant: 0, duration: 0.18 }, 3.78);
    tl.to(S, { lift: 0.55, insertSpin: Math.PI * 2.25, duration: 0.3 }, 3.96);
    tl.to(S, { coat: 1, duration: 0.18 }, 4.3).to(S, { coat: 2, duration: 0.18 }, 4.52).to(S, { coat: 0, duration: 0.18 }, 4.74);
    tl.to(S, { lift: 0, insertSpin: Math.PI * 2, duration: 0.25 }, 4.88);
    tl.to({}, { duration: 0.01 }, 6);

    st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      scrub: mqMobile.matches ? 0.6 : 1.1,
      animation: tl,
      onUpdate: (self) => {
        progress = self.progress;
        const n = Math.min(CHAPTERS.length - 1, Math.floor(self.progress * CHAPTERS.length * 0.999 + 0.12));
        if (hudN) hudN.textContent = String(n + 1).padStart(2, '0');
        if (hudName) hudName.textContent = CHAPTERS[n];
        if (hudBar) hudBar.style.transform = `scaleX(${self.progress})`;
        if (hint) hint.style.opacity = self.progress > 0.015 ? '0' : '';
        const ci = Math.round(THREE.MathUtils.clamp(S.coat, 0, 2));
        coatChips.forEach((li, i) => li.classList.toggle('is-on', i === ci));
      },
    });
    if (keep) st.scroll(st.start + (st.end - st.start) * keep);
    tl.progress(keep);
  }
  build();
  mqMobile.addEventListener('change', () => { build(); resize(); });

  /* ---------- İşleme döngüsü: yalnızca görünürken ---------- */
  let visible = true;
  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    elapsed += dt;
    apply(dt);
    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was) { t0 = performance.now(); gsap.ticker.add(frame); }
    if (!visible && was) gsap.ticker.remove(frame);
  });
  io.observe(root);
  gsap.ticker.add(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) t0 = performance.now(); });

  if (finePointer && !opts.poster) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('is-live'); gsap.ticker.remove(frame); });

  // İlk kare
  frame();
  opts.onProgress?.(1);

  if (new URLSearchParams(location.search).has('debug')) {
    (window as any).__S = S;
    (window as any).__intro = intro;
    (window as any).__mats = drill.materials;
    (window as any).__renderer = renderer;
    (window as any).__frame = frame;
  }

  if (opts.poster) {
    intro.k = 0;
    frame();
    (window as any).__posterReady = true;
  }

  return {
    intro() {
      root.classList.add('is-live');
      gsap.to(intro, { k: 0, duration: 2.4, ease: 'expo.out' });
    },
  };
}
