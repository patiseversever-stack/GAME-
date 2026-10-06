// Kategori kartlarında canlı 3D takım modelleri.
// Tek bir WebGL bağlamı her görünür kart için ayrı kadraj çizer ve sonucu kartın kendi 2D
// tuvaline kopyalar: kaydırırken modeller sayfayla birlikte, gecikmesiz hareket eder.
import * as THREE from 'three';
import { studioEnvironment } from '../three/studio';
import { toolMaterials, buildModel, type ModelKind } from '../three/tools3d';

const TAU = Math.PI * 2;

/** Model başına sunum: kadraj merkezi/yarıçapı (mm), duruş ve dönüş ekseni */
interface Present {
  center: [number, number, number];
  radius: number;
  /** Sunum duruşu (Euler, rad) */
  pose: [number, number, number];
  /** Kendi ekseninde dönüş: 'y' döner takımlar, 'z' elmas uçlar */
  spinAxis: 'y' | 'z';
  /** Saniyedeki dönüş (rad); fareyle hızlanır */
  spin: number;
  /** Kartta modelin oturacağı nokta (0–1) */
  at: [number, number];
  /** Stüdyo ışığını döndürme (rad): parlak şeridin yüzeye denk gelmesi için */
  env?: number;
  /** Dar (mobil) kartta yarıçap çarpanı: uzun modeller kart dışına taşmasın */
  narrowZoom?: number;
  /** Dar kartta modelin oturacağı nokta (başlık altta kaldığı için daha yukarıda) */
  atNarrow?: [number, number];
  /** Orta oranlı (tablet) kartta yarıçap çarpanı ve konum */
  midZoom?: number;
  atMid?: [number, number];
}
export const PRESENT: Record<ModelKind, Present> = {
  cnmg: { center: [0, 0, 2.4], radius: 10.5, pose: [-0.36, 0.22, 0.5], spinAxis: 'z', spin: 0.32, at: [0.7, 0.43] },
  thread: { center: [0, 0, 1.8], radius: 9.2, pose: [-0.4, 0.2, 0.3], spinAxis: 'z', spin: -0.36, at: [0.68, 0.43] },
  groove: { center: [-60, -6, 0], radius: 45, pose: [0.3, -0.5, -0.38], spinAxis: 'y', spin: 0, at: [0.68, 0.42], env: 0.8, narrowZoom: 1.05, atNarrow: [0.52, 0.34], midZoom: 1.18, atMid: [0.68, 0.34] },
  endmill: { center: [0, 14, 0], radius: 15.5, pose: [0, 0.2, -1.3], spinAxis: 'y', spin: -1.5, at: [0.6, 0.38] },
  drill: { center: [0, 15, 0], radius: 16.5, pose: [0, 0.38, -1.3], spinAxis: 'y', spin: -1.3, at: [0.6, 0.38] },
  tap: { center: [0, 14, 0], radius: 15.5, pose: [0, 0.38, -1.28], spinAxis: 'y', spin: -1.1, at: [0.6, 0.38] },
  bt40: { center: [0, 85, 0], radius: 70, pose: [0.3, 0, -0.95], spinAxis: 'y', spin: -0.45, at: [0.7, 0.5], narrowZoom: 1.3, atNarrow: [0.56, 0.33] },
};

interface Card {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  kind: ModelKind;
  p: Present;
  presenter: THREE.Group;
  spinner: THREE.Group;
  w: number; h: number;
  visible: boolean;
  shown: boolean;
  enter: number;
  hover: number; hoverT: number;
  tx: number; ty: number; mx: number; my: number;
  angle: number;
}

export function startCards(els: HTMLElement[]) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const DPR = Math.min(devicePixelRatio || 1, fine ? 2 : 1.75);

  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);
  renderer.setScissorTest(true);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(20, 1, 1, 4000);
  const mats = toolMaterials();

  const cards: Card[] = els.map((el) => {
    const kind = el.dataset.model as ModelKind;
    const p = PRESENT[kind];
    const canvas = document.createElement('canvas');
    canvas.className = 'cat__gl';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const presenter = new THREE.Group();
    const spinner = new THREE.Group();
    const model = buildModel(kind, mats);
    model.position.set(-p.center[0], -p.center[1], -p.center[2]);
    // Dönüş ekseni merkezden geçsin: döner takımlarda yalnız eksen boyunca kaydır
    if (p.spinAxis === 'y' && p.spin !== 0) { model.position.x = 0; model.position.z = 0; }
    spinner.add(model);
    presenter.add(spinner);
    presenter.visible = false;
    scene.add(presenter);
    return {
      el, canvas, ctx: canvas.getContext('2d')!, kind, p, presenter, spinner, w: 1, h: 1, visible: false, shown: false,
      enter: reduce ? 1 : 0, hover: 0, hoverT: 0, tx: 0, ty: 0, mx: 0, my: 0, angle: Math.random() * TAU,
    };
  });

  /* Boyutlar */
  let glW = 1, glH = 1;
  function measure() {
    for (const c of cards) {
      const r = c.el.getBoundingClientRect();
      c.w = Math.max(2, Math.round(r.width * DPR));
      c.h = Math.max(2, Math.round(r.height * DPR));
      if (c.canvas.width !== c.w || c.canvas.height !== c.h) { c.canvas.width = c.w; c.canvas.height = c.h; }
    }
    const nw = Math.max(...cards.map((c) => c.w)), nh = Math.max(...cards.map((c) => c.h));
    if (nw !== glW || nh !== glH) { glW = nw; glH = nh; renderer.setSize(glW, glH, false); }
  }
  measure();
  const ro = new ResizeObserver(() => measure());
  cards.forEach((c) => ro.observe(c.el));

  /* Görünürlük */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = cards.find((x) => x.el === e.target);
      if (c) c.visible = e.isIntersecting;
    }
    kick();
  }, { rootMargin: '80px 0px' });
  cards.forEach((c) => io.observe(c.el));

  /* Fare: modele eğim + hızlanma */
  if (fine) {
    for (const c of cards) {
      c.el.addEventListener('pointermove', (e) => {
        const r = c.el.getBoundingClientRect();
        c.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        c.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        c.el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        c.el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
      c.el.addEventListener('pointerenter', () => { c.hoverT = 1; });
      c.el.addEventListener('pointerleave', () => { c.hoverT = 0; c.tx = 0; c.ty = 0; });
    }
  }

  /* Döngü */
  let raf = 0, last = performance.now();
  const e = new THREE.Euler();
  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let any = false;
    const vh = innerHeight;
    for (const c of cards) {
      if (!c.visible || document.hidden) continue;
      any = true;
      const r = c.el.getBoundingClientRect();
      // Dokunmatikte eğimi kaydırma verir: kart ekranda yukarı çıktıkça model döner
      if (!fine) { c.ty = THREE.MathUtils.clamp(((r.top + r.height / 2) / vh) * 2 - 1, -1, 1) * 0.9; c.tx = -c.ty * 0.5; }
      const k = 1 - Math.exp(-dt * 5);
      c.mx += (c.tx - c.mx) * k;
      c.my += (c.ty - c.my) * k;
      c.hover += (c.hoverT - c.hover) * (1 - Math.exp(-dt * 4));
      if (c.enter < 1) c.enter = Math.min(1, c.enter + dt / 1.4);
      const ent = 1 - Math.pow(1 - c.enter, 4);
      if (!reduce) c.angle += dt * c.p.spin * (1 + c.hover * 2.4);
      draw(c, ent);
    }
    if (any) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  document.addEventListener('visibilitychange', kick);

  function draw(c: Card, ent: number) {
    const { p } = c;
    const w = c.w, h = c.h;
    // Duruş: temel poz + fare/kaydırma eğimi + giriş dönüşü
    e.set(p.pose[0] + c.my * 0.28, p.pose[1] + c.mx * 0.42 + (1 - ent) * 1.6, p.pose[2]);
    c.presenter.quaternion.setFromEuler(e);
    if (p.spin === 0) c.spinner.rotation.set(0, reduce ? 0 : Math.sin(performance.now() / 2600) * 0.22, 0); // kater: hafif salınım
    else if (p.spinAxis === 'y') c.spinner.rotation.set(0, c.angle, 0);
    else c.spinner.rotation.set(0, 0, c.angle);
    const s = 0.82 + 0.18 * ent;
    c.presenter.scale.setScalar(s);
    // Kamera: modeli kaplayan küre kadraja sığsın; kart dar ise yatay görüş belirleyici
    const aspect = w / h;
    const fill = w / h < 1.1 ? 0.7 : 0.84; // küre çapının kart yüksekliğine oranı
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const mid = aspect >= 1.25 && aspect < 1.9;
    const rad = p.radius * (aspect < 1.25 ? p.narrowZoom ?? 1 : mid ? p.midZoom ?? 1 : 1);
    const visH = (2 * rad) / fill;
    const visW = (2 * rad) / (fill * 0.95);
    const dist = Math.max(visH / (2 * Math.tan(vfov / 2)), visW / (2 * Math.tan(vfov / 2) * aspect));
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.near = dist * 0.2;
    camera.far = dist * 4;
    camera.lookAt(0, 0, 0);
    // Model merkezini kartta istenen noktaya taşı (dar kartta biraz daha ortaya)
    const narrow = aspect < 1.25;
    const fx = narrow ? (p.atNarrow?.[0] ?? p.at[0] - 0.06) : mid ? (p.atMid?.[0] ?? p.at[0]) : p.at[0];
    const fy = narrow ? (p.atNarrow?.[1] ?? p.at[1]) : mid ? (p.atMid?.[1] ?? p.at[1]) : p.at[1];
    camera.setViewOffset(w, h, w / 2 - fx * w, h / 2 - fy * h, w, h);
    camera.updateProjectionMatrix();
    (scene as any).environmentRotation?.set(0, (p.env ?? 0) + c.mx * 0.6 + c.hover * Math.sin(performance.now() / 900) * 0.4, 0);
    for (const o of cards) o.presenter.visible = o === c;
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.render(scene, camera);
    c.ctx.clearRect(0, 0, w, h);
    c.ctx.drawImage(glCanvas, 0, glH - h, w, h, 0, 0, w, h);
    if (!c.shown) { c.shown = true; c.el.classList.add('is-3d'); }
  }

  kick();
  (window as any).__cards = { cards, renderer };
}
