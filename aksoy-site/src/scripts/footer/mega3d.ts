// Alt bilgideki dev AKSOY: pahlı kenarları parlayan, fırçalanmış metal 3D harfler.
// Yalnızca görünürken ve sekme açıkken çizilir; dokunmatik cihazda 30 kare/sn ile sınırlı.
import * as THREE from 'three';
import { GLYPHS } from './glyphs';
import { studioEnvironment } from '../three/studio';

const WORD = 'AKSOY';
const TRACK = 14; // harf aralığı (font birimi): yan yüzler görünürken harfler birbirine girmesin
const DEPTH = 150;

function glyphShapes(ch: string) {
  const contours = GLYPHS[ch].c.map((flat) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new THREE.Vector2(flat[i], flat[i + 1]));
    return pts;
  });
  // TrueType: dış çizgi saat yönünde (alan < 0), delikler ters yönde
  const outers = contours.filter((c) => THREE.ShapeUtils.area(c) < 0);
  const holes = contours.filter((c) => THREE.ShapeUtils.area(c) >= 0);
  const inside = (p: THREE.Vector2, poly: THREE.Vector2[]) => {
    let r = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) r = !r;
    }
    return r;
  };
  return outers.map((o) => {
    const s = new THREE.Shape(o.slice().reverse());
    for (const h of holes) if (inside(h[0], o)) s.holes.push(new THREE.Path(h.slice().reverse()));
    return s;
  });
}

/** Fırça izi: yatay ince çizgiler (pürüzlülük haritası) */
function brushedTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 512;
    const v = 110 + Math.random() * 60;
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath();
    const x = Math.random() * 512;
    g.moveTo(x - 300, y); g.lineTo(x + 300, y + (Math.random() - 0.5) * 1.2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 700, 1 / 700);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function initMega(host: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'footer-mega__gl';
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(26, 1, 10, 20000);

  const rough = brushedTexture();
  // Yüz: koyu, fırçalanmış çelik. Pah ve yanlar: parlak, ışığı çizgi hâlinde yakalar.
  const face = new THREE.MeshPhysicalMaterial({ color: 0x3a3f47, metalness: 1, roughness: 0.42, roughnessMap: rough, anisotropy: 0.7, envMapIntensity: 0.9, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const side = new THREE.MeshPhysicalMaterial({ color: 0xd4d8de, metalness: 1, roughness: 0.17, envMapIntensity: 1.25 });

  const word = new THREE.Group();
  const letters: THREE.Mesh[] = [];
  let x = 0;
  for (const ch of WORD) {
    const geo = new THREE.ExtrudeGeometry(glyphShapes(ch), { depth: DEPTH, bevelEnabled: true, bevelThickness: 16, bevelSize: 12, bevelSegments: 4, curveSegments: 1 });
    geo.translate(0, 0, -DEPTH / 2);
    const m = new THREE.Mesh(geo, [face, side]);
    m.position.x = x;
    m.userData.x = x;
    letters.push(m);
    word.add(m);
    x += GLYPHS[ch].adv + TRACK;
  }
  const width = x - TRACK;
  for (const m of letters) m.position.x -= width / 2;
  const pivot = new THREE.Group();
  pivot.add(word);
  scene.add(pivot);

  // Kadraj: genişliği doldur, harflerin alt kısmı kesilsin (zeminden çıkıyor gibi)
  let w = 1, h = 1;
  const fit = () => {
    w = host.clientWidth; h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    // Görünür bant: y ≈ 90…780 (harf boyu ~700); dar ekranda genişlik belirleyici
    const visW = Math.max(width * 1.08, 700 * camera.aspect);
    const dist = visW / (2 * Math.tan(vfov / 2) * camera.aspect);
    camera.position.set(0, 600, dist);
    camera.lookAt(0, 440, 0);
    camera.updateProjectionMatrix();
  };
  fit();
  new ResizeObserver(fit).observe(host);

  // İmleç ile hafif eğim; ortam ışığı yavaşça kayar ve pahlarda parlak çizgi gezinir
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!coarse) {
    addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      if (e.clientY < r.top - 300) return;
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    }, { passive: true });
  }

  let visible = false, raf = 0, last = 0, t0 = -1, ready = false;
  const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 4);
  const draw = (now: number) => {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    pivot.rotation.y = px * 0.09;
    pivot.rotation.x = -py * 0.035;
    (scene as any).environmentRotation?.set(0, (reduce ? 0.6 : t * 0.16) + px * 0.5, 0);
    // Giriş: harfler sırayla zeminden yükselir
    letters.forEach((m, i) => {
      const k = reduce ? 1 : ease((t - i * 0.09) / 1.5);
      m.position.y = (1 - k) * -820;
      m.rotation.x = (1 - k) * 0.5;
    });
    renderer.render(scene, camera);
    if (!ready) { ready = true; host.classList.add('is-3d'); }
  };
  const loop = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const gap = coarse ? 1000 / 30 : 0;
    if (now - last >= gap) { last = now; draw(now); }
    if (!reduce) raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: '80px' }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
}
