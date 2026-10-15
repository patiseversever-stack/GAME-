// Kahvehane ortamı: ahşap masa + yeşil çuha, zemin, arka plan resmi, sarkan lamba, çay bardakları.
// Dokular kodla üretilir; toplam ~10 çizim çağrısı.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Stage} from './stage';
import {TABLE} from '../game/layout';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Basit tekrarlanabilir rastgele sayı (dokuların her açılışta aynı görünmesi için). */
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

function feltTexture(size: number): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const r = prng(7);
  g.fillStyle = '#1d5a3b';
  g.fillRect(0, 0, size, size);
  // lif dokusu
  for (let i = 0; i < size * 14; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, l = 2 + r() * 6 * (size / 512);
    g.strokeStyle = r() < 0.5 ? `rgba(120,190,140,${0.05 + r() * 0.06})` : `rgba(5,30,15,${0.06 + r() * 0.08})`;
    g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // ortada hafif aşınma, kenarlarda koyulaşma
  const rg = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.72);
  rg.addColorStop(0, 'rgba(160,200,150,0.10)');
  rg.addColorStop(0.55, 'rgba(0,0,0,0)');
  rg.addColorStop(1, 'rgba(0,10,4,0.45)');
  g.fillStyle = rg;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function woodTexture(w: number, h: number, base: string, seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(w, h);
  const r = prng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // damarlar: dalgalı ince çizgiler
  for (let i = 0; i < h * 0.9; i++) {
    const y0 = r() * h, amp = 1 + r() * 5, freq = 0.004 + r() * 0.01, ph = r() * 6.28;
    const dark = r() < 0.65;
    g.strokeStyle = dark ? `rgba(25,10,4,${0.05 + r() * 0.12})` : `rgba(230,170,110,${0.03 + r() * 0.06})`;
    g.lineWidth = 0.5 + r() * 1.6;
    g.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.3;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // budaklar
  for (let k = 0; k < 3; k++) {
    const x = r() * w, y = r() * h, rr = 6 + r() * 10;
    const rg = g.createRadialGradient(x, y, 1, x, y, rr);
    rg.addColorStop(0, 'rgba(30,12,4,0.55)');
    rg.addColorStop(1, 'rgba(30,12,4,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, rr * 2.2, rr, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export async function buildEnvironment(stage: Stage, bgUrl: string): Promise<void> {
  const {scene, renderer} = stage;
  const hi = stage.q.tier !== 'low';

  // Hafif ortam yansıması (çay bardağı, ileride karakterler)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  // Çuha
  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE.feltW, TABLE.feltW),
    new THREE.MeshLambertMaterial({map: feltTexture(hi ? 1024 : 512)}),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = TABLE.y;
  scene.add(felt);

  // Ahşap kenar
  const outer = roundedRect(TABLE.outerW, TABLE.outerW, 0.06);
  outer.holes.push(roundedRect(TABLE.feltW, TABLE.feltW, 0.03));
  const rimGeo = new THREE.ExtrudeGeometry(outer, {depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 12});
  const wood = woodTexture(1024, 256, '#5b321b', 3);
  wood.repeat.set(3.2, 3.2);
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({map: wood}));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = TABLE.y - 0.03;
  scene.add(rim);

  // Zemin
  const floorTex = woodTexture(512, 512, '#2b170c', 11);
  floorTex.repeat.set(5, 5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshLambertMaterial({map: floorTex, color: 0x9a8a7a}));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Arka plan: kameraya dönük bulanık kahvehane resmi
  const bgTex = await new THREE.TextureLoader().loadAsync(bgUrl);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  // masanın arkasında görünen bant (yaklaşık y 0.1–1.2) resmin orta-üst kısmına denk gelir
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.02), new THREE.MeshBasicMaterial({map: bgTex, color: 0xb8a690, fog: false, depthWrite: false}));
  bg.position.set(0, -1.53 + 2.01, -2.0);
  bg.renderOrder = -1;
  scene.add(bg);

  // Sarkan lamba (genelde kadraj dışında ama kamera yukarı bakınca görünür)
  const lamp = new THREE.Group();
  const shadePts = [new THREE.Vector2(0.012, 0.11), new THREE.Vector2(0.03, 0.105), new THREE.Vector2(0.085, 0.03), new THREE.Vector2(0.15, -0.02), new THREE.Vector2(0.152, -0.028)];
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadePts, 32), new THREE.MeshStandardMaterial({color: 0x23422f, roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide}));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({color: 0xfff1d0}));
  bulb.position.y = 0.0;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 6), new THREE.MeshBasicMaterial({color: 0x111111}));
  cord.position.y = 0.7;
  lamp.add(shade, bulb, cord);
  lamp.position.copy(stage.lamp.position).add(new THREE.Vector3(0, 0.03, 0));
  scene.add(lamp);

  // Çay bardakları (ince belli) — tek seferde örneklenmiş çizim
  const prof = (s: number) => [
    [0.0, 0.0], [0.024, 0.0], [0.025, 0.004], [0.021, 0.012], [0.017, 0.03], [0.0165, 0.04], [0.019, 0.056], [0.025, 0.075], [0.028, 0.092], [0.029, 0.098],
  ].map(([r, y]) => new THREE.Vector2(r * s, y * s));
  const S = 1.35;
  const glassGeo = new THREE.LatheGeometry(prof(S), 40);
  const teaGeo = new THREE.LatheGeometry(prof(S * 0.94).slice(0, 8).concat([new THREE.Vector2(0, 0.077 * S * 0.94)]), 40);
  const saucerGeo = new THREE.LatheGeometry(
    [[0, 0.0], [0.05, 0.0], [0.062, 0.006], [0.066, 0.011], [0.064, 0.012], [0.05, 0.006], [0.0, 0.006]].map(([r, y]) => new THREE.Vector2(r * S, y * S)),
    48,
  );
  // Cam: kenarlarda görünür (fresnel), ortası saydam
  const glassMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 2.2});
  glassMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
      diffuseColor.a = clamp(diffuseColor.a + fres * 0.75, 0.0, 0.9);
      #include <opaque_fragment>`);
  };
  const teaMat = new THREE.MeshStandardMaterial({color: 0x5a1604, roughness: 0.08, metalness: 0, emissive: 0x2a0700, transparent: true, opacity: 0.96});
  const saucerMat = new THREE.MeshStandardMaterial({color: 0xf2ece2, roughness: 0.3, metalness: 0.05});
  const spots = TABLE.teaGlasses;
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, dy: number, order = 0) => {
    const m = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p[0], TABLE.y + 0.002 + dy, p[1])));
    m.renderOrder = order;
    scene.add(m);
  };
  inst(saucerGeo, saucerMat, 0);
  inst(teaGeo, teaMat, 0.012 * S + 0.004, 1);
  inst(glassGeo, glassMat, 0.012 * S, 2);
}
