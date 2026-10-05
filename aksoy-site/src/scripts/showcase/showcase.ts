// Kaydırmaya bağlı 3D vitrin — "yönetmen" yaklaşımı.
// Kaydırma bölüm sınırını geçince o bölümün sinematik sekansı oynar (aksiyon), bölüm içinde
// kaydırma modeli yavaşça hareket ettirir; kaydırma bırakılınca sayfa en yakın bölüme oturur.
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildDrill, type Drill } from './model';
import { GLB, applyGlb } from './glb';
import { Coolant } from './fx-coolant';
import { Machining } from './fx-machining';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

type Pose = { rx: number; ry: number; rz: number; px: number; py: number; scale: number; focus: number; spin: number };

const N = 6;
const CHAPTERS = ['Giriş', 'Gövde', 'Uçlar', 'Soğutma', 'Kaplama', 'Teklif'];
const CENTER = -32; // matkabın eksen ortası (mm)
const TAU = Math.PI * 2;

const DESKTOP: Pose[] = [
  { rx: 0.3, ry: -0.9, rz: 0.45, px: 0.36, py: 0.14, scale: 1.15, focus: CENTER, spin: -0.5 },
  { rx: 0.2, ry: 0.5, rz: 0.06, px: 0.3, py: -0.04, scale: 0.92, focus: 22, spin: -0.75 },
  { rx: 0.3, ry: -0.35, rz: 0.1, px: -0.15, py: 0.02, scale: 3.6, focus: 50, spin: 0.1 },
  { rx: 0.22, ry: -0.6, rz: 0.12, px: 0.34, py: 0.02, scale: 1.5, focus: 30, spin: -0.35 },
  { rx: 0.4, ry: -0.5, rz: 0.2, px: -0.2, py: 0.04, scale: 3.3, focus: 50, spin: 0.25 },
  { rx: 0.3, ry: -0.9, rz: 0.45, px: 0.02, py: 0.32, scale: 0.95, focus: CENTER, spin: -0.5 },
];
const DESKTOP_DIM: Partial<Pose> = { rx: 0.15, ry: -0.18, rz: 0.04, px: 0.36, py: 0.02, scale: 1.05, focus: CENTER };

const MOBILE: Pose[] = [
  { rx: 0.3, ry: -0.9, rz: 0.9, px: 0.0, py: 0.3, scale: 1.95, focus: CENTER, spin: -0.5 },
  { rx: 0.2, ry: 0.5, rz: 0.5, px: 0.0, py: 0.3, scale: 1.45, focus: 22, spin: -0.75 },
  { rx: 0.3, ry: -0.35, rz: 0.3, px: 0.04, py: 0.3, scale: 4.6, focus: 50, spin: 0.1 },
  { rx: 0.22, ry: -0.6, rz: 0.42, px: -0.04, py: 0.3, scale: 2.5, focus: 30, spin: -0.35 },
  { rx: 0.4, ry: -0.5, rz: 0.36, px: 0.04, py: 0.32, scale: 4.4, focus: 50, spin: 0.25 },
  { rx: 0.3, ry: -0.9, rz: 0.9, px: 0.0, py: 0.4, scale: 1.7, focus: CENTER, spin: -0.5 },
];
const MOBILE_DIM: Partial<Pose> = { rx: 0.15, ry: -0.18, rz: 0.55, px: 0.0, py: 0.34, scale: 1.75, focus: CENTER };

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
  add(12, 2.6, [0, 1.6, -7], 1.0, 0xfff0dc); // arka ışık
  add(6, 2.2, [2.5, -0.5, 6], 1.4); // ön dolgu
  add(30, 30, [0, -7, 0], 0.22); // zemin
  return s;
}

export interface ShowcaseApi { intro(): void }

export async function startShowcase(
  root: HTMLElement,
  opts: { onProgress?: (p: number) => void; poster?: boolean; reduce?: boolean } = {},
): Promise<ShowcaseApi> {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-showcase-canvas]')!;
  const sticky = root.querySelector<HTMLElement>('.showcase__sticky')!;
  const mqMobile = matchMedia('(max-width: 860px)');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const isMobile = () => mqMobile.matches;
  const calm = !!opts.reduce; // "hareketi azalt": sarsıntı ve otomatik dönüş yok

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
  envScene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  opts.onProgress?.(0.5);

  /* ---------- Model ---------- */
  const drill: Drill = buildDrill();
  const pivot = new THREE.Group();
  pivot.rotation.order = 'ZXY';
  const focus = new THREE.Group();
  scene.add(pivot);
  pivot.add(focus);
  focus.add(drill.root);
  const scaler = drill.frame.children[0] as THREE.Group;
  if (GLB) {
    try { await applyGlb(drill, GLB, (p) => opts.onProgress?.(0.5 + p * 0.2)); }
    catch (err) { console.warn('GLB yüklenemedi, geçici model kullanılıyor.', err); }
  }
  const bakedInserts = !!GLB?.bakedInserts;
  opts.onProgress?.(0.72);

  /* ---------- Efektler ---------- */
  const coolant = new Coolant(drill.coolant, isMobile());
  scaler.add(coolant.group);
  const mach = new Machining(isMobile(), drill.dims.tip);
  focus.add(mach.work);
  scene.add(mach.fx);
  opts.onProgress?.(0.85);

  /* ---------- Durum ---------- */
  const poses = () => (isMobile() ? MOBILE : DESKTOP);
  const dimPose = () => (isMobile() ? MOBILE_DIM : DESKTOP_DIM);
  const S = {
    ...poses()[0],
    turns: 0, plunge: 0, block: 0, cut: 0, heat: 0, hole: 0, shake: 0, camZ: 0, envRot: 0,
    coolant: 0, jet: 0, wear: 0, flash: 0,
    lift0: 0, lift1: 0, screw0: 0, screw1: 0, idx0: 0, idx1: 0,
    cDim: 0, cIns: 0, cCool: 0,
  };
  const intro = { k: opts.poster || calm ? 0 : 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let L = 0, Ltarget = 0, coat = 0, velOff = 0, edge = 1;
  let chapter = 0;

  /* ---------- Ölçü çizgileri ve etiketler ---------- */
  const layer = root.querySelector<HTMLElement>('[data-callouts]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-callout-svg]')!;
  const NS = 'http://www.w3.org/2000/svg';
  type Key = keyof typeof S;
  type Dim = { a: string; b: string; ea?: string; eb?: string; label: string; group: Key; off: number; line: SVGPathElement; ext: SVGPathElement; el: HTMLElement };
  type Pin = { anchor: string; label: string; sub: string; group: Key; side: 'left' | 'right'; el: HTMLElement; small: HTMLElement };
  const dims: Dim[] = [
    { a: 'dia-a', b: 'dia-b', label: 'Ø 25 mm', group: 'cDim' as Key, off: 18 },
    { a: 'len-a', b: 'len-b', ea: 'len-a0', eb: 'len-b0', label: '4 × D · 100 mm', group: 'cDim' as Key, off: 16 },
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
    return { ...d, line, ext, el };
  });
  const pins: Pin[] = [
    { anchor: 'shank', label: 'Weldon sap', sub: 'Ø 32 · sıkma yüzeyi', group: 'cDim' as Key, side: 'left' as const },
    { anchor: 'insert-cevre', label: 'Çevre uç', sub: 'Kenar 1 / 4', group: 'cIns' as Key, side: 'right' as const },
    { anchor: 'insert-merkez', label: 'Merkez uç', sub: 'Kenar 1 / 4', group: 'cIns' as Key, side: 'left' as const },
    { anchor: 'screw-cevre', label: 'Torx vida', sub: 'sök · çevir · sık', group: 'cIns' as Key, side: 'right' as const },
    { anchor: 'cool', label: 'İçten soğutma', sub: 'basınçlı sıvı doğrudan uca', group: 'cCool' as Key, side: 'right' as const },
  ].map((p) => {
    const el = document.createElement('div');
    el.className = `pin${p.side === 'left' ? ' pin--left' : ''}`;
    el.innerHTML = `<span>${p.label}<small>${p.sub}</small></span>`;
    layer.append(el);
    return { ...p, el, small: el.querySelector('small')! };
  });
  const setEdge = (n: number) => {
    edge = n;
    const txt = `Kenar ${((n - 1) % 4) + 1} / 4`;
    pins[1].small.textContent = txt;
    pins[2].small.textContent = txt;
  };

  /* ---------- Boyutlandırma ---------- */
  let W = 1, H = 1, visW = 1, visH = 1, base = 1;
  function resize() {
    const r = sticky.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const pr = Math.min(devicePixelRatio || 1, isMobile() ? 1.6 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    visH = 2 * 5 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visW = visH * camera.aspect;
    base = Math.min(1.08, (visW * 0.46) / 1.76, (visH * 0.8) / 1.76);
    coolant.setPixelRatio(pr);
    mach.setViewport(W, H, pr);
  }
  new ResizeObserver(resize).observe(sticky);
  resize();

  /* ---------- Bölüm metinleri ---------- */
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
  const hudN = root.querySelector<HTMLElement>('[data-hud-n]');
  const hudName = root.querySelector<HTMLElement>('[data-hud-name]');
  const hudBar = root.querySelector<HTMLElement>('[data-hud-bar]');
  const bigNum = root.querySelector<HTMLElement>('[data-bignum]');
  const hint = root.querySelector<HTMLElement>('[data-scroll-hint]');
  const coatChips = Array.from(root.querySelectorAll<HTMLElement>('[data-coat-chips] li'));
  panels.forEach((el, i) => (el.dataset.on = i === 0 ? '1' : '0'));

  function showPanel(k: number, dir: number) {
    panels.forEach((el, i) => {
      if (i !== k && el.dataset.on === '1') {
        el.dataset.on = '0';
        gsap.to(el, { autoAlpha: 0, y: -dir * 34, duration: 0.38, ease: 'power2.in', overwrite: true });
      }
    });
    const el = panels[k];
    if (!el) return;
    el.dataset.on = '1';
    gsap.killTweensOf(el);
    gsap.set(el, { autoAlpha: 1, y: 0 });
    const lines = el.querySelectorAll('.ln > span');
    const rest = el.querySelectorAll(':scope > .eyebrow, :scope > p, .chapter__specs li, .coat-chips li, .chapter__actions > *');
    gsap.fromTo(lines, { yPercent: 118, rotate: 1.5 }, { yPercent: 0, rotate: 0, duration: 1.05, ease: 'expo.out', stagger: 0.08, delay: 0.28, overwrite: true });
    gsap.fromTo(rest, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.05, delay: 0.42, overwrite: true });
    if (hudN) hudN.textContent = String(k + 1).padStart(2, '0');
    if (hudName) hudName.textContent = CHAPTERS[k];
    if (bigNum) {
      bigNum.textContent = String(k + 1).padStart(2, '0');
      gsap.fromTo(bigNum, { yPercent: dir * 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', overwrite: true });
    }
  }

  /* ---------- Bölüm sekansları ---------- */
  let seq: gsap.core.Timeline | null = null;
  function enter(k: number, dir: number) {
    seq?.kill();
    const P = poses()[k];
    const tl = gsap.timeline();
    seq = tl;
    // Önceki bölümden kalan efektleri toparla
    tl.to(S, { cut: 0, shake: 0, coolant: 0, jet: 0, cDim: 0, cIns: 0, cCool: 0, wear: 0, flash: 0, duration: 0.3, ease: 'power2.out' }, 0);
    tl.to(S, { heat: 0, duration: 0.8 }, 0);
    tl.to(S, { turns: Math.round(S.turns), duration: 0.7, ease: 'power3.out' }, 0);
    if (k !== 1) tl.to(S, { block: 0, plunge: 0, hole: 0, duration: 0.55, ease: 'power2.in' }, 0);
    if (k !== 2 && k !== 4) tl.to(S, { lift0: 0, lift1: 0, screw0: 0, screw1: 0, duration: 0.5, ease: 'power3.inOut' }, 0);
    // Kamera hareketi: hızlı, kararlı, hafif "nefes"
    tl.to(S, { ...P, duration: 1.3, ease: 'expo.inOut' }, 0);
    if (!calm) tl.to(S, { camZ: -0.32, duration: 0.6, ease: 'power2.in' }, 0).to(S, { camZ: 0, duration: 0.9, ease: 'power3.out' }, 0.6);
    tl.to(S, { envRot: `+=${dir * 0.9}`, duration: 1.8, ease: 'power2.inOut' }, 0);

    if (k === 1) {
      // Delme: iş parçası gelir, matkap hızlanır, dalar; talaş, kıvılcım, duman
      tl.set(S, { hole: 0, plunge: 0 }, 0);
      tl.to(S, { block: 1, duration: 0.9, ease: 'expo.out' }, 0.65);
      tl.to(S, { turns: `+=9`, duration: 3.4, ease: 'power1.inOut' }, 0.8);
      tl.to(S, { plunge: 1, duration: 1.8, ease: 'power1.inOut' }, 1.25);
      tl.to(S, { cut: 1, duration: 0.18 }, 1.42).to(S, { cut: 0, duration: 0.35 }, 3.0);
      tl.to(S, { shake: 1, duration: 0.15 }, 1.42).to(S, { shake: 0, duration: 0.4 }, 3.0);
      tl.to(S, { heat: 1, duration: 1.0 }, 1.5).to(S, { heat: 0, duration: 2.4 }, 3.1);
      tl.to(S, { hole: 1, duration: 0.1 }, 1.5);
      tl.to(S, { plunge: 0, duration: 0.8, ease: 'power3.inOut' }, 3.15);
      tl.to(S, { block: 0, duration: 0.9, ease: 'expo.in' }, 4.15);
      tl.to(S, { ...dimPose(), duration: 1.2, ease: 'expo.inOut' }, 4.6);
      tl.to(S, { cDim: 1, duration: 0.7, ease: 'power2.out' }, 5.4);
    }
    if (k === 2) {
      // Uç çevirme: körelmiş kenar → vidalar sökülür → uçlar fırlar → 90° döner → yerine oturur → sıkılır
      tl.to(S, { wear: 1, duration: 0.45 }, 1.0);
      tl.to(S, { cIns: 1, duration: 0.4 }, 1.1);
      tl.to(S, { screw0: 1, duration: 0.95, ease: 'power2.inOut' }, 1.35).to(S, { screw1: 1, duration: 0.95, ease: 'power2.inOut' }, 1.5);
      tl.to(S, { lift0: 1, duration: 0.65, ease: 'back.out(1.8)' }, 2.2).to(S, { lift1: 1, duration: 0.65, ease: 'back.out(1.8)' }, 2.3);
      tl.to(S, { idx0: `+=0.25`, idx1: `+=0.25`, duration: 0.85, ease: 'power3.inOut' }, 2.8);
      tl.to(S, { wear: 0, duration: 0.3 }, 3.1);
      tl.call(() => setEdge(edge + 1), [], 3.2);
      tl.to(S, { lift0: 0, lift1: 0, duration: 0.42, ease: 'power4.in' }, 3.75);
      tl.to(S, { flash: 1, duration: 0.06 }, 4.17).to(S, { flash: 0, duration: 0.6 }, 4.23);
      tl.to(S, { shake: 0.45, duration: 0.05 }, 4.17).to(S, { shake: 0, duration: 0.3 }, 4.22);
      tl.to(S, { screw0: 0, screw1: 0, duration: 0.85, ease: 'power2.inOut' }, 4.25);
    }
    if (k === 3) {
      tl.to(S, { coolant: 1, duration: 0.35 }, 0.95);
      tl.fromTo(S, { jet: 0 }, { jet: 1, duration: 0.75, ease: 'power3.out', immediateRender: false }, 0.95);
      tl.to(S, { cCool: 1, duration: 0.5 }, 1.45);
    }
    if (k === 4) {
      tl.to(S, { lift0: 0.7, duration: 0.7, ease: 'back.out(1.6)' }, 0.9).to(S, { lift1: 0.7, duration: 0.7, ease: 'back.out(1.6)' }, 1.0);
    }
    showPanel(k, dir);
  }

  /* ---------- Kaydırma ---------- */
  let progress = 0;
  const st = ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      progress = self.progress;
      const raw = progress * N;
      const k = Math.min(N - 1, Math.floor(raw));
      Ltarget = THREE.MathUtils.clamp(raw - k, 0, 1);
      if (k !== chapter) {
        const dir = k > chapter ? 1 : -1;
        chapter = k;
        enter(k, dir);
      }
      const vv = self.getVelocity();
      velOff = THREE.MathUtils.clamp(vv / 2600, -1, 1);
      if (hudBar) hudBar.style.transform = `scaleX(${progress})`;
      if (hint) hint.style.opacity = progress > 0.01 ? '0' : '';
    },
  });
  mqMobile.addEventListener('change', () => { resize(); Object.assign(S, poses()[chapter]); });

  // Oturtma: kaydırma bitince en yakın bölüme yumuşakça otur (yöne duyarlı)
  const lenis = (window as any).__lenis as { scrollTo: (y: number, o: object) => void } | null;
  let snapTimer = 0, touching = false, lastY = scrollY, dirY = 1, snapping = false;
  const restRaw = (k: number) => (k === 0 ? 0 : k + 0.42);
  function scrollToY(y: number) {
    snapping = true;
    if (lenis) lenis.scrollTo(y, { duration: 1.0, easing: (t: number) => 1 - Math.pow(1 - t, 4), onComplete: () => (snapping = false) });
    else {
      window.scrollTo({ top: y, behavior: 'smooth' });
      setTimeout(() => (snapping = false), 700);
    }
  }
  function doSnap() {
    if (touching || snapping || opts.poster) return;
    const p = st.progress;
    if (p <= 0.0005 || p >= 0.9995) return;
    const raw = p * N;
    const k = Math.min(N - 1, Math.floor(raw));
    const r = restRaw(k);
    let target = r;
    if (dirY > 0 && raw > r + 0.06) {
      if (k === N - 1) return; // son bölümden sonra sayfa serbest akar
      target = restRaw(k + 1);
    }
    const y = st.start + (st.end - st.start) * (target / N);
    if (Math.abs(scrollY - y) > 6) scrollToY(y);
  }
  addEventListener('scroll', () => {
    const y = scrollY;
    if (Math.abs(y - lastY) > 1) dirY = y > lastY ? 1 : -1;
    lastY = y;
    clearTimeout(snapTimer);
    snapTimer = window.setTimeout(doSnap, isMobile() ? 140 : 180);
  }, { passive: true });
  addEventListener('touchstart', () => { touching = true; clearTimeout(snapTimer); }, { passive: true });
  addEventListener('touchend', () => { touching = false; clearTimeout(snapTimer); snapTimer = window.setTimeout(doSnap, 160); }, { passive: true });

  /* ---------- Sahneye uygula ---------- */
  const v = new THREE.Vector3();
  const coatTmp = new THREE.Color();
  const goldEm = new THREE.Color(0xffd27a);
  const heatEm = new THREE.Color(0xff5a10);
  let t0 = performance.now();
  let elapsed = 0;

  function project(name: string) {
    drill.anchors[name].getWorldPosition(v);
    const z = v.clone().applyMatrix4(camera.matrixWorldInverse).z;
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: z > 0 };
  }

  function apply(dt: number) {
    const k = intro.k;
    L += (Ltarget - L) * Math.min(1, dt * 5);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    velOff *= Math.pow(0.04, dt);

    // Bölüm içi kaydırma hareketi
    let dRy = 0, dRx = 0, dSpin = 0;
    const c = chapter;
    if (c === 0) { dRy = L * 0.35; dSpin = L * 0.9; }
    else if (c === 1) { dRy = (L - 0.5) * 0.18; }
    else if (c === 2) { dRy = (L - 0.5) * 0.35; dRx = (L - 0.5) * 0.1; }
    else if (c === 3) { dRy = (L - 0.5) * 0.4; }
    else if (c === 4) { dRy = (L - 0.5) * 0.3; }
    else if (c === 5) { dRy = L * 0.3; dSpin = L * 0.6; }
    const idle = (c === 0 || c === 5) && !opts.poster && !calm ? 1 : 0;
    const wob = Math.sin(elapsed * 0.45) * 0.22 * idle;

    pivot.rotation.set(S.rx + dRx + pointer.y * 0.08 + k * 0.4, S.ry + dRy + pointer.x * 0.12 + k * 1.1, S.rz - k * 0.25);
    pivot.position.set((S.px * visW) / 2, (S.py * visH) / 2 - k * 0.35 + (idle ? Math.sin(elapsed * 0.9) * 0.012 : 0), 0);
    pivot.scale.setScalar(S.scale * base * (1 - k * 0.45));
    focus.position.x = -S.focus * 0.01;
    drill.root.rotation.x = S.spin + S.turns * TAU + dSpin + wob + velOff * 0.45 - k * 3.4;
    drill.root.position.x = S.plunge * 0.32;

    // Kamera: yakınlaşma nefesi + titreşim
    const sh = calm ? 0 : S.shake;
    camera.position.set(
      sh ? (Math.sin(elapsed * 61) + Math.sin(elapsed * 37)) * 0.006 * sh : 0,
      sh ? (Math.cos(elapsed * 53) + Math.sin(elapsed * 29)) * 0.006 * sh : 0,
      5 + S.camZ,
    );
    camera.rotation.z = sh ? Math.sin(elapsed * 47) * 0.0025 * sh : 0;
    (scene as any).environmentRotation?.set(0, S.envRot + elapsed * 0.025, 0);

    // Vidalar, uçlar, kenar izi
    const lifts = [S.lift0, S.lift1], screws = [S.screw0, S.screw1], idx = [S.idx0, S.idx1];
    drill.inserts.forEach((ip, i) => {
      const lift = lifts[i];
      ip.insert.position.set(0, lift * 5.5 * ip.liftForward, lift * 10);
      ip.insert.rotation.set(lift * 0.38, lift * (i ? -0.25 : 0.25), idx[i] * TAU);
      ip.screw.position.set(0, lift * 5.5 * ip.liftForward, 1.9 + screws[i] * 12 + lift * 10);
      ip.screw.rotation.z = -screws[i] * TAU * 4;
      (ip.wear.material as THREE.MeshBasicMaterial).opacity = S.wear * (0.75 + 0.25 * Math.sin(elapsed * 22 + i));
      if (bakedInserts) {
        const show = lift > 0.02 || screws[i] > 0.02;
        ip.insert.visible = show;
        ip.screw.visible = show;
      }
    });

    // Kaplama: 5. bölümde kaydırma ile değişir
    const coatTarget = c === 4 ? THREE.MathUtils.clamp(((L - 0.12) / 0.72) * 2, 0, 2) : 0;
    coat += (coatTarget - coat) * Math.min(1, dt * 6);
    const cc = THREE.MathUtils.clamp(coat, 0, 2);
    const i0 = Math.floor(cc), i1 = Math.min(2, i0 + 1), f = cc - i0;
    const m = drill.materials.insert as THREE.MeshPhysicalMaterial;
    coatTmp.lerpColors(COATS[i0].color, COATS[i1].color, f);
    m.color.copy(coatTmp);
    m.roughness = THREE.MathUtils.lerp(COATS[i0].rough, COATS[i1].rough, f);
    m.metalness = THREE.MathUtils.lerp(COATS[i0].metal, COATS[i1].metal, f);
    const fl = S.flash * 0.9, ht = S.heat * 0.35;
    m.emissive.setRGB(goldEm.r * fl + heatEm.r * ht, goldEm.g * fl + heatEm.g * ht, goldEm.b * fl + heatEm.b * ht);
    const ci = Math.round(cc);
    coatChips.forEach((li, i) => li.classList.toggle('is-on', i === ci));

    scene.updateMatrixWorld();
    coolant.update(dt, S.coolant, S.jet);
    mach.update(dt, S, focus, drill.root.rotation.x);

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
      const sgn = Math.sign(ny || 1);
      d.el.style.transform = `translate(${(A.x + B.x) / 2 + nx * d.off * sgn}px, ${(A.y + B.y) / 2 + ny * d.off * sgn}px) translate(-50%, -50%)`;
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
      p.el.style.transform = `translate(${P.x}px, ${P.y}px) ${side === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)'}`;
      p.el.style.opacity = P.behind ? '0' : String(o);
    }
  }

  /* ---------- Döngü: yalnızca görünürken ---------- */
  let visible = true;
  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    elapsed += dt;
    apply(dt);
    renderer.render(scene, camera);
  }
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was) { t0 = performance.now(); gsap.ticker.add(frame); }
    if (!visible && was) gsap.ticker.remove(frame);
  }).observe(root);
  gsap.ticker.add(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) t0 = performance.now(); });

  if (finePointer && !opts.poster && !calm) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('is-live'); gsap.ticker.remove(frame); });

  // Sayfa ortasından açıldıysa doğru bölümle başla
  chapter = Math.min(N - 1, Math.floor(st.progress * N));
  if (chapter > 0) { Object.assign(S, poses()[chapter]); showPanel(chapter, 1); }

  if (new URLSearchParams(location.search).has('debug')) {
    Object.assign(window as any, { __S: S, __intro: intro, __mats: drill.materials, __renderer: renderer, __frame: frame, __enter: enter, __mach: mach, __camera: camera });
  }
  frame();
  opts.onProgress?.(1);
  if (opts.poster) { intro.k = 0; frame(); (window as any).__posterReady = true; }

  return {
    intro() {
      root.classList.add('is-live');
      if (intro.k > 0) gsap.to(intro, { k: 0, duration: 2.4, ease: 'expo.out' });
    },
  };
}
