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
  // Sinematik kamera: A = bu sahnenin kaydırmaya bağlı kamera hareketi, B = önceki sahneden sönümlenen kalıntı
  type Cam = { rx: number; ry: number; rz: number; px: number; py: number; scale: number; focus: number; env: number };
  const zeroCam = (): Cam => ({ rx: 0, ry: 0, rz: 0, px: 0, py: 0, scale: 0, focus: 0, env: 0 });
  const A = zeroCam();
  const B = zeroCam();
  const intro = { k: opts.poster || calm ? 0 : 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let L = 0, Ltarget = 0, coat = 0, edge = 1, dimOn = false;
  let chapter = 0;

  /* ---------- Ölçü çizgileri ve etiketler ---------- */
  const layer = root.querySelector<HTMLElement>('[data-callouts]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-callout-svg]')!;
  const NS = 'http://www.w3.org/2000/svg';
  type Key = keyof typeof S;
  type Dim = { a: string; b: string; ea?: string; eb?: string; label: string; group: Key; off: number; line: SVGPathElement; ext: SVGPathElement; el: HTMLElement };
  type Pin = {
    anchor: string; label: string; sub: string; group: Key; side: 'left' | 'right'; down?: boolean;
    el: HTMLElement; small: HTMLElement; card: HTMLElement; path: SVGPathElement; st: { ci: number; x: number; y: number };
  };
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
    { anchor: 'insert-merkez', label: 'Merkez uç', sub: 'Kenar 1 / 4', group: 'cIns' as Key, side: 'left' as const, down: true },
    { anchor: 'screw-cevre', label: 'Torx vida', sub: 'sök · çevir · sık', group: 'cIns' as Key, side: 'right' as const, down: true },
    { anchor: 'cool', label: 'İçten soğutma', sub: 'basınçlı sıvı doğrudan uca', group: 'cCool' as Key, side: 'right' as const },
  ].map((p, i) => {
    const el = document.createElement('div');
    el.className = `pin${p.side === 'left' ? ' pin--left' : ''}`;
    el.innerHTML = `<i class="pin__dot"></i><svg class="pin__lead" aria-hidden="true"><path pathLength="1"/></svg><div class="pin__card"><span class="pin__num">${String(i + 1).padStart(2, '0')}</span><span class="pin__txt"><b>${p.label}</b><small>${p.sub}</small></span></div>`;
    layer.append(el);
    return { ...p, el, small: el.querySelector('small')!, card: el.querySelector<HTMLElement>('.pin__card')!, path: el.querySelector('path')!, st: { ci: -1, x: 0, y: 0 } };
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
        gsap.to(el, { autoAlpha: 0, y: -dir * 34, duration: 0.55, ease: 'power2.in', overwrite: true });
      }
    });
    const el = panels[k];
    if (!el) return;
    el.dataset.on = '1';
    gsap.killTweensOf(el);
    gsap.set(el, { autoAlpha: 1, y: 0 });
    const lines = el.querySelectorAll('.ln > span');
    const rest = el.querySelectorAll(':scope > .eyebrow, :scope > p, .chapter__specs li, .coat-chips li, .chapter__actions > *');
    gsap.fromTo(lines, { yPercent: 118, rotate: 1.5 }, { yPercent: 0, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.45, overwrite: true });
    gsap.fromTo(rest, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07, delay: 0.65, overwrite: true });
    if (hudN) hudN.textContent = String(k + 1).padStart(2, '0');
    if (hudName) hudName.textContent = CHAPTERS[k];
    if (bigNum) {
      bigNum.textContent = String(k + 1).padStart(2, '0');
      gsap.fromTo(bigNum, { yPercent: dir * 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', overwrite: true });
    }
  }

  /* ---------- Bölüm aksiyonları: kaydırma ile ileri-geri sarılır (film gibi) ---------- */
  let act: gsap.core.Timeline | null = null;
  function buildAct(k: number) {
    act?.kill();
    act = null;
    if (k < 1 || k > 4) return;
    // Kaydırmaya bağlı zaman çizelgesi: her tween açık başlangıç değerli (fromTo) → geri sarınca hep aynı kare
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none', immediateRender: false } });
    const ft = (from: object, to: object, at: number) => tl.fromTo(S, from, { ...to, immediateRender: false }, at);
    // Kamera anahtar kareleri: her kare bir öncekinden açıkça başlar → kaydırma ile ileri-geri hep aynı yol
    const cam = (keys: { at: number; dur: number; ease?: string; to: Partial<Cam> }[]) => {
      let prev: Cam = zeroCam();
      for (const kf of keys) {
        const next: Cam = { ...prev, ...kf.to };
        tl.fromTo(A, { ...prev }, { ...next, duration: kf.dur, ease: kf.ease ?? 'sine.inOut', immediateRender: false }, kf.at);
        prev = next;
      }
    };
    if (k === 1) {
      const t0 = Math.round(S.turns);
      ft({ block: 0 }, { block: 1, duration: 0.9, ease: 'power3.out' }, 0);
      ft({ turns: t0 }, { turns: t0 + 10, duration: 4.4, ease: 'power1.inOut' }, 0.3);
      ft({ plunge: 0 }, { plunge: 1, duration: 2.0, ease: 'power1.inOut' }, 0.9);
      ft({ cut: 0 }, { cut: 1, duration: 0.15 }, 1.05);
      ft({ cut: 1 }, { cut: 0, duration: 0.3 }, 2.9);
      ft({ shake: 0 }, { shake: 1, duration: 0.15 }, 1.05);
      ft({ shake: 1 }, { shake: 0, duration: 0.3 }, 2.9);
      ft({ heat: 0 }, { heat: 1, duration: 1.0 }, 1.1);
      ft({ heat: 1 }, { heat: 0.15, duration: 1.4 }, 3.0);
      ft({ hole: 0 }, { hole: 1, duration: 0.05 }, 1.1);
      ft({ plunge: 1 }, { plunge: 0, duration: 1.0, ease: 'power2.inOut' }, 2.95);
      ft({ block: 1 }, { block: 0, duration: 0.9, ease: 'power2.in' }, 4.1);
      ft({ cDim: 0 }, { cDim: 1, duration: 0.6 }, 5.0);
      tl.to({}, { duration: 0.6 }, 5.6);
      if (!calm) cam([
        { at: 0, dur: 0.9, to: { ry: -0.22, scale: -0.08, env: 0.3 } }, // blok gelirken yan açı
        { at: 0.9, dur: 2.0, to: { ry: 0.14, rx: 0.08, scale: 0.2, focus: 14, px: 0.11, env: 0.9 } }, // dalarken yaklaş, etrafında dön
        { at: 2.9, dur: 1.1, to: { ry: 0.05, rx: 0.02, scale: 0.05, focus: 4, px: 0.04, env: 1.2 } }, // çıkarken geri çekil
        { at: 4.0, dur: 1.0, to: { ry: 0, rx: 0, scale: 0, focus: 0, env: 1.4 } },
      ]);
    }
    if (k === 2) {
      const i0 = Math.round(S.idx0 * 4) / 4, i1 = Math.round(S.idx1 * 4) / 4;
      ft({ wear: 0, cIns: 0 }, { wear: 1, cIns: 1, duration: 0.4 }, 0);
      ft({ screw0: 0 }, { screw0: 1, duration: 1.0, ease: 'power1.inOut' }, 0.4);
      ft({ screw1: 0 }, { screw1: 1, duration: 1.0, ease: 'power1.inOut' }, 0.55);
      ft({ lift0: 0 }, { lift0: 1, duration: 0.7, ease: 'power2.out' }, 1.35);
      ft({ lift1: 0 }, { lift1: 1, duration: 0.7, ease: 'power2.out' }, 1.45);
      ft({ idx0: i0, idx1: i1 }, { idx0: i0 + 0.25, idx1: i1 + 0.25, duration: 1.0, ease: 'power2.inOut' }, 2.0);
      ft({ wear: 1 }, { wear: 0, duration: 0.3 }, 2.35);
      ft({ lift0: 1, lift1: 1 }, { lift0: 0, lift1: 0, duration: 0.5, ease: 'power3.in' }, 3.1);
      ft({ flash: 0 }, { flash: 1, duration: 0.05 }, 3.6);
      ft({ flash: 1 }, { flash: 0, duration: 0.5 }, 3.65);
      ft({ screw0: 1, screw1: 1 }, { screw0: 0, screw1: 0, duration: 0.9, ease: 'power1.inOut' }, 3.7);
      tl.to({}, { duration: 0.4 }, 4.6);
      ft({ shake: 0 }, { shake: 0.55, duration: 0.04 }, 3.6);
      ft({ shake: 0.55 }, { shake: 0, duration: 0.35 }, 3.64);
      if (!calm) cam([
        { at: 0, dur: 0.45, to: { scale: 0.35, ry: 0.08, env: 0.2 } }, // körelmiş kenara yaklaş
        { at: 0.45, dur: 1.0, to: { scale: 1.15, ry: 0.22, rx: 0.12, focus: 2, env: 0.5 } }, // vida sökülürken makro
        { at: 1.45, dur: 0.6, ease: 'power2.out', to: { scale: 0.55, ry: 0.55, rx: 0.1, rz: 0.04, env: 0.9 } }, // uç fırlar, kamera döner
        { at: 2.05, dur: 1.0, to: { scale: 0.7, ry: 0.85, rx: 0.32, rz: 0.06, env: 1.4 } }, // 90° çevirme: üstten bakış
        { at: 3.05, dur: 0.6, ease: 'power2.in', to: { scale: 1.0, ry: 0.4, rx: 0.12, rz: 0, env: 1.6 } }, // oturma anına dal
        { at: 3.7, dur: 0.9, to: { scale: 0.2, ry: 0.1, rx: 0.02, env: 1.9 } }, // sıkılırken geri çekil
      ]);
    }
    if (k === 3) {
      ft({ coolant: 0 }, { coolant: 1, duration: 0.5 }, 0.3);
      ft({ jet: 0 }, { jet: 1, duration: 1.2, ease: 'power2.out' }, 0.3);
      ft({ cCool: 0 }, { cCool: 1, duration: 0.6 }, 1.2);
      tl.to({}, { duration: 0.4 }, 4.4);
      if (!calm) cam([
        { at: 0, dur: 0.6, to: { ry: -0.3, scale: -0.04, px: 0.13 } }, // yan açıdan başla
        { at: 0.6, dur: 1.6, to: { ry: -0.5, rx: 0.14, scale: 0.36, focus: 18, px: 0.19, rz: -0.05, env: 0.8 } }, // jetler açılırken uca doğru yay
        { at: 2.2, dur: 1.2, to: { ry: -0.75, rx: 0.2, scale: 0.6, focus: 30, px: 0.2, rz: -0.08, env: 1.3 } }, // jete makro
        { at: 3.4, dur: 1.4, to: { ry: -0.42, rx: 0.08, scale: -0.06, focus: 10, px: 0.14, rz: 0, env: 1.6 } }, // geniş: spreyin tamamı
      ]);
    }
    if (k === 4) {
      ft({ lift0: 0 }, { lift0: 0.7, duration: 0.8, ease: 'power2.out' }, 0);
      ft({ lift1: 0 }, { lift1: 0.7, duration: 0.8, ease: 'power2.out' }, 0.1);
      tl.to({}, { duration: 1.5 }, 2.4);
      if (!calm) cam([
        { at: 0, dur: 1.2, to: { ry: -0.25, scale: 0.3, env: 0.6 } },
        { at: 1.2, dur: 1.3, to: { ry: 0.15, rx: 0.12, scale: 0.55, env: 1.4 } },
        { at: 2.5, dur: 1.4, to: { ry: 0.35, rx: 0.05, scale: 0.25, env: 2.0 } },
      ]);
    }
    act = tl;
  }

  /* ---------- Bölüm geçişleri ---------- */
  let seq: gsap.core.Timeline | null = null;
  function enter(k: number, dir: number) {
    seq?.kill();
    act?.kill();
    act = null;
    gsap.killTweensOf(B);
    (Object.keys(A) as (keyof Cam)[]).forEach((key) => { B[key] += A[key]; A[key] = 0; });
    gsap.to(B, { ...zeroCam(), duration: 1.6, ease: 'power2.inOut' });
    const P = poses()[k];
    const tl = gsap.timeline();
    seq = tl;
    // Önceki bölümden kalan efektleri toparla
    // Önceki bölümden kalan efektleri toparla (yeni bölümün aksiyonu kendi değerlerini fromTo ile verir)
    const own: Record<number, string[]> = {
      1: ['block', 'plunge', 'cut', 'shake', 'heat', 'hole', 'turns', 'cDim'],
      2: ['wear', 'cIns', 'screw0', 'screw1', 'lift0', 'lift1', 'idx0', 'idx1', 'flash'],
      3: ['coolant', 'jet', 'cCool'],
      4: ['lift0', 'lift1'],
    };
    const reset: Record<string, number> = { cut: 0, shake: 0, coolant: 0, jet: 0, cDim: 0, cIns: 0, cCool: 0, wear: 0, flash: 0, heat: 0, block: 0, plunge: 0, hole: 0, lift0: 0, lift1: 0, screw0: 0, screw1: 0 };
    for (const key of own[k] ?? []) delete reset[key];
    tl.to(S, { ...reset, duration: 0.45, ease: 'power2.out' }, 0);
    if (k !== 1) tl.to(S, { turns: Math.round(S.turns), duration: 0.8, ease: 'power3.out' }, 0);
    // Kamera hareketi: hızlı, kararlı, hafif "nefes"
    tl.to(S, { ...P, duration: 2.1, ease: 'power3.inOut' }, 0);
    if (!calm) tl.to(S, { camZ: -0.22, duration: 1.0, ease: 'sine.inOut' }, 0).to(S, { camZ: 0, duration: 1.3, ease: 'sine.inOut' }, 1.0);
    tl.to(S, { envRot: `+=${dir * 0.9}`, duration: 2.6, ease: 'sine.inOut' }, 0);

    buildAct(k);
    showPanel(k, dir);
  }

  /* ---------- Kaydırma ---------- */
  let progress = 0;
  let updateReelRef: (() => void) | null = null;
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
        L = Ltarget; // yeni bölüm kendi başından (ya da geri gelişte sonundan) başlar
        dimOn = false;
        enter(k, dir);
      }
      if (hudBar) hudBar.style.transform = `scaleX(${progress})`;
      updateReelRef?.();
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
  const SNAP = false; // film gibi akış: bölüm sıçraması kapalı
  function doSnap() {
    if (!SNAP || touching || snapping || opts.poster) return;
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

  /* ---------- Film kontrolü: zaman çizelgesi, oynat, sonraki ---------- */
  const reelEl = root.querySelector<HTMLElement>('[data-reel]');
  const segBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-reel-seg]'));
  const segFill = segBtns.map((b) => b.querySelector<HTMLElement>('b'));
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-reel-next]');
  const nextLabel = root.querySelector<HTMLElement>('[data-reel-next-label]');
  const playBtn = root.querySelector<HTMLButtonElement>('[data-reel-play]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-reel-prev]');
  // Her sahnenin film süresi (sn): aksiyon zaman çizelgesiyle uyumlu, gerçek zamanlı akış
  const FILM = [3.0, 7.4, 6.6, 6.0, 5.4, 3.4];
  const easeFilm = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
  const yAt = (raw: number) => st.start + (st.end - st.start) * (raw / N);
  let anim: { cancel(): void } | null = null;
  let autoplay = false;
  let programmatic = false;

  function cancelAnim() {
    anim?.cancel();
    anim = null;
    programmatic = false;
  }
  function animateScroll(y: number, dur: number, done?: () => void) {
    cancelAnim();
    programmatic = true;
    if (lenis) {
      (lenis as any).scrollTo(y, { duration: dur, easing: easeFilm, force: true, onComplete: () => { anim = null; programmatic = false; done?.(); } });
      anim = { cancel: () => { (lenis as any).scrollTo(scrollY, { immediate: true, force: true }); } };
    } else {
      const y0 = scrollY, t0 = performance.now();
      let id = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / (dur * 1000));
        window.scrollTo(0, y0 + (y - y0) * easeFilm(t));
        if (t < 1) id = requestAnimationFrame(step);
        else { anim = null; programmatic = false; done?.(); }
      };
      id = requestAnimationFrame(step);
      anim = { cancel: () => cancelAnimationFrame(id) };
    }
  }
  function setPlaying(on: boolean) {
    autoplay = on;
    reelEl?.classList.toggle('is-playing', on);
    playBtn?.setAttribute('aria-pressed', String(on));
    playBtn?.setAttribute('aria-label', on ? 'Filmi duraklat' : 'Filmi oynat');
    if (!on) cancelAnim();
  }
  function current() {
    const raw = st.progress * N;
    const k = Math.min(N - 1, Math.floor(raw));
    return { raw, k, l: raw - k };
  }
  /** Sahne k'yı baştan sona film gibi oynatır */
  function playScene(k: number, done?: () => void) {
    const { raw } = current();
    const end = Math.min(N - 0.0001, k + 0.94);
    const startRaw = k + 0.02;
    // Uzaktaysak önce sahnenin başına süzül, sonra sahneyi gerçek zamanlı oynat
    if (Math.abs(raw - startRaw) > 0.35 && raw < startRaw) {
      animateScroll(yAt(startRaw), Math.min(2.2, 0.9 + (startRaw - raw) * 0.6), () => animateScroll(yAt(end), FILM[k] * (end - startRaw) / 0.92, done));
    } else if (raw > end) {
      animateScroll(yAt(startRaw), 1.4, () => animateScroll(yAt(end), FILM[k], done));
    } else {
      const frac = Math.max(0.15, (end - raw) / 0.92);
      animateScroll(yAt(end), FILM[k] * frac, done);
    }
  }
  function next() {
    const { k, l } = current();
    if (k >= N - 1 && l > 0.6) {
      setPlaying(false);
      animateScroll(st.end + innerHeight * 0.85, 1.6);
      return;
    }
    const target = l < 0.12 && k > 0 ? k : Math.min(N - 1, k + 1);
    playScene(target);
  }
  function prev() {
    const { k, l } = current();
    const target = l > 0.3 ? k : Math.max(0, k - 1);
    animateScroll(yAt(target === 0 ? 0 : target + 0.02), 1.6);
  }
  function playAll() {
    const step = () => {
      if (!autoplay) return;
      const { k, l } = current();
      if (k >= N - 1 && l > 0.85) { setPlaying(false); return; }
      const target = l > 0.85 ? k + 1 : k === 0 && l < 0.02 ? 1 : l < 0.12 ? k : k + 1;
      playScene(Math.min(N - 1, target), () => setTimeout(step, 450));
    };
    const { raw } = current();
    if (raw > N - 0.2) animateScroll(yAt(0), 1.8, () => setTimeout(step, 300));
    else step();
  }
  nextBtn?.addEventListener('click', () => { setPlaying(false); next(); });
  prevBtn?.addEventListener('click', () => { setPlaying(false); prev(); });
  playBtn?.addEventListener('click', () => { if (autoplay) setPlaying(false); else { setPlaying(true); playAll(); } });
  segBtns.forEach((b, i) => b.addEventListener('click', () => { setPlaying(false); playScene(i); }));
  // Kullanıcı kendisi kaydırırsa otomatik oynatma durur
  const stopByUser = () => { if (anim || autoplay) setPlaying(false); };
  addEventListener('wheel', stopByUser, { passive: true });
  addEventListener('touchstart', (e) => { if (!(e.target as HTMLElement).closest('[data-reel]')) stopByUser(); }, { passive: true });
  addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) stopByUser(); });
  function updateReel() {
    const { raw, k } = current();
    segFill.forEach((f, i) => { if (f) f.style.transform = `scaleX(${THREE.MathUtils.clamp(raw - i, 0, 1)})`; });
    segBtns.forEach((b, i) => b.classList.toggle('is-on', i === k));
    if (nextLabel) nextLabel.textContent = k >= N - 1 ? 'Kataloğa geç' : `Sonraki: ${CHAPTERS[k + 1]}`;
  }
  updateReel();
  updateReelRef = updateReel;
  void programmatic;

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
    L += (Ltarget - L) * Math.min(1, dt * 4);
    if (act) act.progress(THREE.MathUtils.clamp((L - 0.04) / 0.86, 0, 1));
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    // Bölüm içi kaydırma hareketi
    let dRy = 0, dRx = 0, dSpin = 0;
    const c = chapter;
    const bump = Math.sin(Math.PI * THREE.MathUtils.clamp(L, 0, 1)); // 0 → 1 → 0: bölüm sınırında süreklilik
    if (c === 0) { dRy = bump * 0.28; dSpin = bump * 0.7; }
    else if (c === 1) { dRy = bump * 0.12; }
    else if (c === 2) { dRy = bump * 0.22; dRx = bump * 0.06; }
    else if (c === 3) { dRy = bump * 0.25; }
    else if (c === 4) { dRy = bump * 0.2; }
    else if (c === 5) { dRy = bump * 0.22; dSpin = bump * 0.5; }
    // 2. bölüm sonunda ölçü pozu: eşik geçilince zamanla yumuşak geçiş (kaydırma geri gelirse geri döner)
    if (c === 1 && !calm) {
      if (L > 0.72 && !dimOn) { dimOn = true; gsap.to(S, { ...dimPose(), duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' }); }
      else if (L < 0.66 && dimOn) { dimOn = false; gsap.to(S, { ...poses()[1], duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' }); }
    }
    const idle = (c === 0 || c === 5) && !opts.poster && !calm ? 1 : 0;
    const wob = Math.sin(elapsed * 0.45) * 0.22 * idle;

    pivot.rotation.set(S.rx + A.rx + B.rx + dRx + pointer.y * 0.08 + k * 0.4, S.ry + A.ry + B.ry + dRy + pointer.x * 0.12 + k * 1.1, S.rz + A.rz + B.rz - k * 0.25);
    pivot.position.set(((S.px + A.px + B.px) * visW) / 2, ((S.py + A.py + B.py) * visH) / 2 - k * 0.35 + (idle ? Math.sin(elapsed * 0.9) * 0.012 : 0), 0);
    pivot.scale.setScalar(Math.max(0.05, S.scale + A.scale + B.scale) * base * (1 - k * 0.45));
    focus.position.x = -(S.focus + A.focus + B.focus) * 0.01;
    drill.root.rotation.x = S.spin + S.turns * TAU + dSpin + wob - k * 3.4;
    drill.root.position.x = S.plunge * 0.32;

    // Kamera: yakınlaşma nefesi + titreşim
    const sh = calm ? 0 : S.shake;
    camera.position.set(
      sh ? (Math.sin(elapsed * 61) + Math.sin(elapsed * 37)) * 0.006 * sh : 0,
      sh ? (Math.cos(elapsed * 53) + Math.sin(elapsed * 29)) * 0.006 * sh : 0,
      5 + S.camZ,
    );
    camera.rotation.z = sh ? Math.sin(elapsed * 47) * 0.0025 * sh : 0;
    (scene as any).environmentRotation?.set(0, S.envRot + A.env + B.env + elapsed * 0.025, 0);

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
    const e = 1 + Math.round(S.idx0 * 4 + 0.001);
    if (e !== edge) setEdge(e);

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
    layoutPins(dt);
  }

  /* Etiket yerleşimi: her etiket için sağ/sol ve birkaç yükseklik denenir; diğer etiketlere,
     bölüm metnine, film çubuğuna ve ekran kenarına en az çarpan seçilir. Kalabalıkta kartlar
     üst üste dizilir, çizgi her karede yeniden çizilir. Titremesin diye mevcut yer ancak
     belirgin biçimde kötüleşince değişir; geçişler yumuşatılır. */
  type Rect = { l: number; t: number; r: number; b: number };
  let obstacles: Rect[] = [];
  let obstT = -1;
  const cardSize = new Map<HTMLElement, { w: number; h: number }>();
  addEventListener('resize', () => cardSize.clear());
  const GAP = 8;
  // GAP kadar yakınlık da çakışma sayılır
  const overlap = (a: Rect, b: Rect) =>
    Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l) + GAP) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t) + GAP);
  function layoutPins(dt: number) {
    if (elapsed - obstT > 0.25 || obstT < 0) {
      obstT = elapsed;
      const sr = sticky.getBoundingClientRect();
      obstacles = [panels[chapter], reelEl].filter(Boolean).map((el) => {
        const r = el!.getBoundingClientRect();
        return { l: r.left - sr.left - 6, t: r.top - sr.top - 6, r: r.right - sr.left + 6, b: r.bottom - sr.top + 6 };
      }).filter((r) => r.r > r.l && r.b > r.t);
    }
    const mob = W <= 860;
    const off = mob ? 54 : 80, dy = mob ? 26 : 30;
    const ease = 1 - Math.exp(-dt * 11);
    const placed: Rect[] = [];
    for (const p of pins) {
      const o = S[p.group] as number;
      const P = project(p.anchor);
      const on = o > 0.35 && !P.behind;
      p.el.classList.toggle('is-on', on);
      const st = p.st;
      if (o < 0.01) { st.ci = -1; continue; }
      let sz = cardSize.get(p.el);
      if (!sz) {
        sz = { w: p.card.offsetWidth || 150, h: p.card.offsetHeight || 44 };
        if (p.card.offsetWidth) cardSize.set(p.el, sz);
      }
      const { w, h } = sz;
      const L0 = p.side === 'left', v = p.down ? 1 : -1, step = h + GAP;
      const ys = [v * dy, -v * dy, v * (dy + step), -v * (dy + step), v * (dy + 2 * step), -v * (dy + 2 * step)];
      const cand = (i: number) => ({ left: Math.floor(i / 2) % 2 ? !L0 : L0, cy: ys[(i % 2) + 2 * Math.floor(i / 4)] });
      // Kart ekrandan taşacaksa yatayda içeri kaydırılır (çizgi kısalır)
      const xOf = (left: boolean) => {
        const x = left ? -off - w : off;
        return Math.min(Math.max(x, 8 - P.x), Math.max(8 - P.x, W - 8 - w - P.x));
      };
      const rectOf = (i: number): Rect => {
        const c = cand(i);
        const l = P.x + xOf(c.left), t = P.y + c.cy - h / 2;
        return { l, t, r: l + w, b: t + h };
      };
      const cost = (i: number) => {
        const r = rectOf(i), c0 = cand(i);
        let c = i * 80;
        for (const q of placed) c += overlap(r, q) * 5;
        for (const q of obstacles) c += overlap(r, q) * 3;
        c += (Math.max(0, 8 - r.t) + Math.max(0, r.b - (H - 8))) * h * 8;
        c += Math.abs(xOf(c0.left) - (c0.left ? -off - w : off)) * h * 2;
        if (P.x > r.l - 16 && P.x < r.r + 16 && P.y > r.t - 16 && P.y < r.b + 16) c += 40000; // kart kendi noktasını örtmesin
        return c;
      };
      let best = 0, bestC = Infinity;
      for (let i = 0; i < 12; i++) { const c = cost(i); if (c < bestC) { bestC = c; best = i; } }
      const fresh = st.ci < 0;
      if (fresh || (on && cost(st.ci) > bestC + 150)) st.ci = best;
      const { left, cy } = cand(st.ci);
      const tx = xOf(left), ty = cy - h / 2;
      if (fresh) { st.x = tx; st.y = ty; } else { st.x += (tx - st.x) * ease; st.y += (ty - st.y) * ease; }
      p.el.classList.toggle('pin--left', left);
      p.el.style.transform = `translate(${P.x}px, ${P.y}px)`;
      p.card.style.transform = `translate(${st.x}px, ${st.y}px)`;
      const ax = st.x < -w / 2 ? st.x + w : st.x, ay = st.y + h / 2;
      const ex = Math.sign(ax) * Math.min(Math.abs(ay), Math.max(0, Math.abs(ax) - 18));
      p.path.setAttribute('d', `M0 0 L${ex.toFixed(1)} ${ay.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)}`);
      if (on) placed.push(rectOf(st.ci));
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
    gsap.ticker.lagSmoothing(0);
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
