// Dikey premium masa (hedef: docs/_dikey_hedef.jpg): yeşil çuha + kalın yastıklı ray + cilalı ahşap çerçeve,
// etrafta karanlık kahvehane zemini, üstte sinematik sıcak lamba ışığı. Tamamı kodla üretilir; ~5 çizim çağrısı.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Stage} from './stage';
import {TABLE} from '../game/layout';

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRect<T extends THREE.Path>(w: number, h: number, r: number, path: T): T {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

/** Çuha dokusu: derin yeşil, ortada sıcak ışık, kenarlarda raydan gelen gölge, içte ince altın çizgi. */
function feltTexture(W: number): THREE.CanvasTexture {
  const H = Math.round((W * TABLE.feltD) / TABLE.feltW);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = prng(5);
  const cx = W / 2, cy = H * 0.5;
  const base = g.createRadialGradient(cx, cy, W * 0.05, cx, cy, H * 0.62);
  base.addColorStop(0, '#22804f');
  base.addColorStop(0.45, '#1a6a40');
  base.addColorStop(1, '#0e4428');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // lif dokusu
  g.lineCap = 'round';
  const n = Math.round((W * H) / 70);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 1.2 + r() * 3.2;
    g.strokeStyle = r() < 0.5 ? `rgba(170,240,190,${0.03 + r() * 0.04})` : `rgba(0,25,12,${0.05 + r() * 0.06})`;
    g.lineWidth = 0.6 + r() * 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // sıcak lamba ışığı
  const warm = g.createRadialGradient(cx, cy * 0.98, 0, cx, cy, H * 0.55);
  warm.addColorStop(0, 'rgba(255,200,110,0.34)');
  warm.addColorStop(0.55, 'rgba(255,190,90,0.1)');
  warm.addColorStop(1, 'rgba(255,190,90,0)');
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = warm;
  g.fillRect(0, 0, W, H);
  g.restore();
  // ray gölgesi (kenarlardan içe)
  const px = W / TABLE.feltW; // piksel / metre
  const shade = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,18,8,0.55)');
    gr.addColorStop(1, 'rgba(0,18,8,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  };
  const s = 0.06 * px;
  shade(0, 0, s, 0);
  shade(W, 0, W - s, 0);
  shade(0, 0, 0, s);
  shade(0, H, 0, H - s);
  // ince altın iç çizgi
  const inset = 0.035 * px, rr = (TABLE.feltR - 0.035) * px;
  const p = roundedRect(W - inset * 2, H - inset * 2, rr, new THREE.Path());
  const pts = p.getPoints(12);
  const trace = (dy: number) => {
    g.beginPath();
    pts.forEach((pt, i) => (i ? g.lineTo(W / 2 + pt.x, H / 2 + pt.y + dy) : g.moveTo(W / 2 + pt.x, H / 2 + pt.y + dy)));
    g.closePath();
  };
  trace(1.5);
  g.strokeStyle = 'rgba(0,20,8,0.45)';
  g.lineWidth = Math.max(2, W / 340);
  g.stroke();
  trace(0);
  g.strokeStyle = 'rgba(236,200,118,0.55)';
  g.lineWidth = Math.max(1.5, W / 480);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodTexture(): THREE.CanvasTexture {
  const W = 1024, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = prng(9);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#4a1f10');
  grd.addColorStop(0.5, '#5e2a15');
  grd.addColorStop(1, '#3f1a0c');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const y0 = r() * H, amp = 1 + r() * 4, f = 0.004 + r() * 0.008, ph = r() * 6.28;
    g.strokeStyle = r() < 0.6 ? `rgba(40,14,4,${0.06 + r() * 0.12})` : `rgba(255,190,130,${0.04 + r() * 0.06})`;
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = y0 + Math.sin(x * f + ph) * amp;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Yuvarlak dikdörtgen yol boyunca yastıklı ray (kesit: basık daire). */
function railGeometry(w: number, d: number, r: number, tube: number): THREE.BufferGeometry {
  const path = roundedRect(w, d, r, new THREE.Path());
  const pts = path.getSpacedPoints(220).map(p => new THREE.Vector3(p.x, 0, -p.y));
  pts.pop(); // kapalı eğride son nokta ilkini tekrar eder
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const g = new THREE.TubeGeometry(curve, 260, tube, 14, true);
  g.scale(1, 0.72, 1);
  return g;
}

export async function buildEnvironment(stage: Stage): Promise<void> {
  const {scene, renderer} = stage;
  const hi = stage.q.tier !== 'low';
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // Çuha
  const feltGeo = new THREE.ShapeGeometry(roundedRect(TABLE.feltW, TABLE.feltD, TABLE.feltR, new THREE.Shape()), 16);
  const uv = feltGeo.attributes.uv as THREE.BufferAttribute, pos = feltGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / TABLE.feltW + 0.5, pos.getY(i) / TABLE.feltD + 0.5);
  const feltTex = feltTexture(hi ? 1024 : 640);
  feltTex.anisotropy = Math.min(stage.q.anisotropy, renderer.capabilities.getMaxAnisotropy());
  const felt = new THREE.Mesh(feltGeo, new THREE.MeshLambertMaterial({map: feltTex}));
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = TABLE.y - 0.0004;
  scene.add(felt);

  // Yastıklı ray (koyu yeşil deri)
  const off = TABLE.railR * 0.55;
  const rail = new THREE.Mesh(
    railGeometry(TABLE.feltW + off * 2, TABLE.feltD + off * 2, TABLE.feltR + off, TABLE.railR),
    new THREE.MeshStandardMaterial({color: 0x1b5c37, roughness: 0.48, metalness: 0.0, envMapIntensity: 0.9}),
  );
  rail.position.y = TABLE.y + TABLE.railR * 0.28;
  scene.add(rail);

  // Cilalı ahşap çerçeve
  const inW = TABLE.feltW + off * 2 + TABLE.railR * 1.1, inD = TABLE.feltD + off * 2 + TABLE.railR * 1.1;
  const outW = inW + TABLE.woodW * 2, outD = inD + TABLE.woodW * 2;
  const frameShape = roundedRect(outW, outD, TABLE.feltR + TABLE.woodW + 0.04, new THREE.Shape());
  frameShape.holes.push(roundedRect(inW, inD, TABLE.feltR + off + 0.02, new THREE.Path()));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 4, curveSegments: 18});
  const wood = woodTexture();
  wood.repeat.set(2.2, 2.2);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({map: wood, roughness: 0.26, metalness: 0.0, envMapIntensity: 1.25}));
  frame.rotation.x = -Math.PI / 2;
  frame.position.y = TABLE.y - 0.04;
  scene.add(frame);

  // Zemin: karanlık kahvehane tahtası
  const floorTex = woodTexture();
  floorTex.repeat.set(4, 12);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({map: floorTex, color: 0x3a2a20}));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.background = new THREE.Color(0x0d0805);
}
