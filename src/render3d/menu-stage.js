// Ana menü sahnesi (Three.js): loş bir odada lamba altında ceviz kenarlı okey masası. Patisever ıstakası kahraman;
// çuhada işlemeli altın amblem, lamba konisinde süzülen altın toz zerreleri. Taşlar ekranın her yerine yukarıdan
// düşer: havada takla atar, sekip kayar ve fiziğin getirdiği yüzle (açık ya da kapalı) yatar. Oyuna girerken kamera masaya dalar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadRackModel, sharpenModel } from './rack-model.js';
import { faceTexture, faceBump } from './tile-face.js';
import { woodCanvas } from '../ui/wood.js';

const DEG = Math.PI / 180;
// gerçek okey taşı oranları (ince): 28 × 40 mm, 9 mm kalınlık
const TW = 0.028;
const TH = 0.04;
const TD = 0.0092;
const COLORS = ['red', 'blue', 'black', 'yellow'];
const HALF = new THREE.Vector3(TW / 2, TH / 2, TD / 2);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
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

function feltTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#2f6b5a';
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  let seed = 4242;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const n = new Float32Array(S * S);
  for (let i = 0; i < n.length; i++) n[i] = rnd();
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (let k = -2; k <= 2; k++) v += n[y * S + ((x + k + S) % S)];
      v = v / 5 - 0.5;
      const f = 1 + v * 0.22 + (n[((y + 3) % S) * S + x] - 0.5) * 0.05;
      const i = (y * S + x) * 4;
      d[i] *= f;
      d[i + 1] *= f;
      d[i + 2] *= f;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

// çuhaya işlenmiş altın amblem: çift halka, süsleme, kavisli PATISEVER yazısı, ortada yıldız
function emblemTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const C = S / 2;
  g.translate(C, C);
  const gold = g.createLinearGradient(-C, -C, C, C);
  gold.addColorStop(0, '#f7dc95');
  gold.addColorStop(0.5, '#c99a43');
  gold.addColorStop(1, '#f1d082');
  g.strokeStyle = gold;
  g.fillStyle = gold;
  g.globalAlpha = 0.92;
  g.lineWidth = 9;
  g.beginPath();
  g.arc(0, 0, C * 0.92, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, C * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, C * 0.56, 0, Math.PI * 2);
  g.stroke();
  // halka içi noktalı süsleme
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.2) continue;
    g.beginPath();
    g.arc(Math.cos(a) * C * 0.6, Math.sin(a) * C * 0.6, 4, 0, Math.PI * 2);
    g.fill();
  }
  // kavisli yazı: üstte saat yönünde, altta harfler dik kalacak biçimde soldan sağa
  const arcText = (txt, r, top, size) => {
    g.save();
    g.font = `700 ${size}px "Playfair Display", Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const sp = size * 0.22;
    const ws = [...txt].map((ch) => g.measureText(ch).width + sp);
    const total = ws.reduce((x, y) => x + y, 0) - sp;
    let cum = 0;
    [...txt].forEach((ch, i) => {
      const phi = (cum + (ws[i] - sp) / 2 - total / 2) / r;
      g.save();
      if (top) {
        g.rotate(phi);
        g.fillText(ch, 0, -r);
      } else {
        g.rotate(-phi);
        g.fillText(ch, 0, r);
      }
      g.restore();
      cum += ws[i];
    });
    g.restore();
  };
  arcText('PATISEVER', C * 0.72, true, 92);
  arcText('OKEY · 101', C * 0.72, false, 70);
  // merkez yıldız
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 ? C * 0.17 : C * 0.4;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.globalAlpha = 0.85;
  g.lineWidth = 5;
  g.stroke();
  g.globalAlpha = 0.28;
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,200,1)');
  gr.addColorStop(0.35, 'rgba(255,214,140,0.45)');
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class MenuStage {
  constructor(host, { quality = 'high' } = {}) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'menu-gl';
    host.appendChild(this.canvas);
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.low = quality === 'low';
    this.adapt = quality === 'auto';
    r.shadowMap.enabled = !this.low;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050807);
    scene.fog = new THREE.Fog(0x050807, 1.9, 3.6);
    this.scene = scene;
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;
    this.camera = new THREE.PerspectiveCamera(26, 2, 0.05, 20);
    // ışık: sıcak lamba + soğuk arka kontur + zayıf ortam
    this.lamp = new THREE.SpotLight(0xffdfb0, 19, 0, 0.66, 0.8, 1.15);
    this.lamp.position.set(0.12, 1.2, 0.25);
    this.lamp.target.position.set(0.12, 0, -0.02);
    this.lamp.castShadow = !this.low;
    this.lamp.shadow.mapSize.set(2048, 2048);
    this.lamp.shadow.bias = -0.00015;
    this.lamp.shadow.normalBias = 0.0015;
    this.lamp.shadow.radius = 4;
    scene.add(this.lamp, this.lamp.target);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 0.55);
    rim.position.set(-0.6, 0.5, -1.2);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x08140f, 0.3));
    this._buildTable();
    // taş geometrisi ve malzemeleri (ince, yuvarlatılmış, cilalı)
    const bs = TW * 0.06;
    const bt = TD * 0.22;
    const shape = roundedShape(TW - 2 * bs, TH - 2 * bs, TW * 0.14);
    this.tileGeo = new THREE.ExtrudeGeometry(shape, { depth: TD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 5, curveSegments: 10 });
    this.tileGeo.translate(0, 0, -(TD - 2 * bt) / 2);
    this.faceGeo = new THREE.PlaneGeometry(TW - bs * 0.4, TH - bs * 0.4);
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf4ecd9, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0xfff2d8) });
    this.backMat = new THREE.MeshPhysicalMaterial({ map: faceTexture({ kind: 'back' }), roughness: 0.45, clearcoat: 0.3, transparent: true, alphaTest: 0.5, color: 0xffffff });
    this.world = new THREE.Group();
    scene.add(this.world);
    this.tiles = [];
    this.fallers = [];
    this.t0 = performance.now();
    this.px = 0;
    this.py = 0;
    this.diving = false;
    this.fallTimer = 0.4;
    this._frame = this._frame.bind(this);
    this._onMove = (e) => {
      this.px = (e.clientX / innerWidth - 0.5) * 2;
      this.py = (e.clientY / innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', this._onMove);
    if (window.DeviceOrientationEvent) {
      this._onTilt = (e) => {
        if (e.gamma == null) return;
        this.px = Math.max(-1, Math.min(1, e.gamma / 25));
        this.py = Math.max(-1, Math.min(1, (e.beta - 40) / 25));
      };
      window.addEventListener('deviceorientation', this._onTilt);
    }
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this._buildDust();
    this.resize();
    this.running = true;
    this.raf = requestAnimationFrame(this._frame);
    this.ready = (async () => {
      const m = await loadRackModel();
      if (m && this.running) this._buildRack(m);
    })();
  }

  _wood(rx, ry, color = 0x8a5a32, rough = 0.42) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    const wc = woodCanvas();
    if (wc) {
      const t = new THREE.CanvasTexture(wc);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = 16;
      m.map = t;
    }
    return m;
  }

  _buildTable() {
    const scene = this.scene;
    // zemin (karanlık oda)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    scene.add(floor);
    // çuha
    const felt = feltTexture();
    felt.repeat.set(7, 5);
    const FW = 1.9;
    const FD = 1.3;
    this.feltBox = { x0: -FW / 2 + 0.03, x1: FW / 2 - 0.03, z0: -0.62, z1: FD - 0.62 - 0.03 };
    const table = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshStandardMaterial({ map: felt, bumpMap: felt, bumpScale: 0.5, roughness: 0.97, color: 0x74ab9c }));
    table.rotation.x = -Math.PI / 2;
    table.position.set(0, 0, -0.62 + FD / 2);
    table.receiveShadow = true;
    scene.add(table);
    // ceviz pervaz (masa kenarı)
    const railMat = this._wood(4, 1, 0x7a4a26, 0.32);
    const RW = 0.07;
    const RH = 0.035;
    const mk = (w, d, x, z) => {
      const geo = new THREE.BoxGeometry(w, RH, d, 1, 1, 1);
      const m = new THREE.Mesh(geo, railMat);
      m.position.set(x, RH / 2 - 0.004, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    };
    const zc = -0.62 + FD / 2;
    mk(FW + RW * 2, RW, 0, -0.62 - RW / 2);
    mk(RW, FD, -FW / 2 - RW / 2, zc);
    mk(RW, FD, FW / 2 + RW / 2, zc);
    // pirinç şerit (pervazın iç kenarı)
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.9, roughness: 0.3 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(FW, 0.004, 0.004), brass);
    strip.position.set(0, 0.002, -0.62 + 0.002);
    scene.add(strip);
    // işlemeli amblem
    const em = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshStandardMaterial({ map: emblemTexture(), transparent: true, roughness: 0.45, metalness: 0.55, color: 0xffffff, depthWrite: false }),
    );
    em.rotation.x = -Math.PI / 2;
    em.position.set(0.1, 0.0007, -0.31);
    em.receiveShadow = true;
    scene.add(em);
    this.emblem = em;
  }

  _buildDust() {
    const N = this.low ? 60 : 140;
    const pos = new Float32Array(N * 3);
    this.dust = [];
    for (let i = 0; i < N; i++) {
      const d = { x: (Math.random() - 0.5) * 0.9 + 0.1, y: 0.04 + Math.random() * 0.75, z: (Math.random() - 0.5) * 0.7, s: 0.2 + Math.random() * 0.8, ph: Math.random() * 6.28 };
      this.dust.push(d);
      pos.set([d.x, d.y, d.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustPts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTexture(), size: 0.012, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }));
    this.scene.add(this.dustPts);
  }

  _mkTile(desc) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.tileGeo, this.bodyMat);
    body.castShadow = !this.low;
    body.receiveShadow = true;
    const fz = TD / 2 + 0.00008;
    const face = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTexture(desc), bumpMap: faceBump(desc), bumpScale: 1.2, roughness: 0.42, clearcoat: 0.35, transparent: true, alphaTest: 0.5 }));
    face.position.z = fz;
    const back = new THREE.Mesh(this.faceGeo, this.backMat);
    back.position.z = -fz;
    back.rotation.y = Math.PI;
    g.add(body, face, back);
    return g;
  }

  _randDesc() {
    if (Math.random() < 0.07) return { kind: 'okey' };
    return { kind: 'num', color: COLORS[(Math.random() * 4) | 0], value: 1 + ((Math.random() * 13) | 0) };
  }

  _buildRack(model) {
    const rack = new THREE.Group();
    const m = model.clone(true);
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = !this.low;
        o.receiveShadow = true;
        o.material.envMapIntensity = 1;
      }
    });
    sharpenModel(m, this.renderer);
    rack.add(m);
    // dizili taşlar: iki kademe, arkaya yaslı (modelin kademe noktaları: (y,z) = (0.016,0) ve (-0.02,0.032))
    const lean = -21 * DEG;
    const rows = [
      { y: 0.016, z: -0.0035, n: 13 },
      { y: -0.02, z: 0.0285, n: 8 },
    ];
    this.rackTiles = [];
    for (const row of rows) {
      for (let i = 0; i < row.n; i++) {
        const t = this._mkTile(this._randDesc());
        const x = (i - (rows[0].n - 1) / 2) * (TW + 0.0024);
        t.position.set(x, row.y + (TH / 2) * Math.cos(lean) + 0.0004, row.z + TD * 0.4);
        t.rotation.x = lean;
        rack.add(t);
        this.rackTiles.push({ g: t, y0: t.position.y, ph: Math.random() * 6 });
      }
    }
    rack.position.set(0.065, 0.0528 * 0.86, 0.07);
    rack.rotation.y = -6 * DEG;
    this.rackScale = 0.86;
    rack.scale.setScalar(0.001);
    this.rack = rack;
    this.rackBorn = performance.now();
    this.world.add(rack);
    // ıstaka bölgesine taş düşmesin
    this.rackBox = new THREE.Box3(new THREE.Vector3(-0.17, -1, -0.02), new THREE.Vector3(0.3, 1, 0.13));
  }

  // ekranın görünen bir noktasının masa üzerindeki karşılığı (taşın düşeceği yer)
  _groundAt(u, v) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), this.camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null;
  }

  _pickLanding() {
    let best = null;
    const fb = this.feltBox;
    for (let k = 0; k < 10; k++) {
      // çoğunlukla arayüzün boş bıraktığı orta şeride ve alta; arada ekranın her yanına
      const mid = Math.random() < 0.6;
      const p = this._groundAt(mid ? 0.3 + Math.random() * 0.36 : 0.04 + Math.random() * 0.92, mid ? 0.42 + Math.random() * 0.52 : 0.2 + Math.random() * 0.76);
      if (!p || p.x < fb.x0 || p.x > fb.x1 || p.z < fb.z0 || p.z > fb.z1) continue;
      if (this.rackBox && this.rackBox.containsPoint(_v.set(p.x, 0, p.z))) continue;
      let dmin = 1;
      for (const f of this.fallers) dmin = Math.min(dmin, Math.hypot(f.pos.x - p.x, f.pos.z - p.z));
      if (!best || dmin > best.d) best = { p, d: dmin };
      if (dmin > 0.09) break;
    }
    return best?.p || null;
  }

  _spawnFaller() {
    const land = this._pickLanding();
    if (!land) return;
    const g = this._mkTile(this._randDesc());
    const h = 0.55 + Math.random() * 0.35;
    const vx = (Math.random() - 0.5) * 0.12;
    const vz = (Math.random() - 0.5) * 0.12;
    // düşüş süresi kadar önce, yatay hız düşülerek bırakılır → hedefe yakın iner
    const tFall = Math.sqrt((2 * h) / 3.4);
    const pos = new THREE.Vector3(land.x - vx * tFall, h, land.z - vz * tFall);
    g.position.copy(pos);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28));
    g.quaternion.copy(q);
    this.world.add(g);
    this.fallers.push({
      g,
      pos,
      vel: new THREE.Vector3(vx, -0.1, vz),
      q,
      w: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 16),
      phase: 'fall',
      bounces: 0,
      age: 0,
      settleT: 0,
    });
    while (this.fallers.filter((f) => f.phase !== 'gone').length > 20) {
      const old = this.fallers.find((f) => f.phase === 'rest');
      if (!old) break;
      old.phase = 'gone';
      old.goneT = 0;
      break;
    }
  }

  // taşın en alt noktasının yüksekliği (yönelime göre yarı boyutların dünya y izdüşümü)
  _lowest(f) {
    _m.makeRotationFromQuaternion(f.q);
    const e = _m.elements;
    return f.pos.y - (Math.abs(e[1]) * HALF.x + Math.abs(e[5]) * HALF.y + Math.abs(e[9]) * HALF.z);
  }

  _stepFaller(f, dt) {
    f.age += dt;
    if (f.phase === 'fall') {
      f.vel.y -= 3.4 * dt;
      f.pos.addScaledVector(f.vel, dt);
      const wl = f.w.length();
      if (wl > 1e-4) {
        _q.setFromAxisAngle(_v.copy(f.w).divideScalar(wl), wl * dt);
        f.q.premultiply(_q).normalize();
      }
      const low = this._lowest(f);
      if (low <= 0 && f.vel.y < 0) {
        f.pos.y -= low;
        f.bounces++;
        const imp = -f.vel.y;
        f.vel.y = imp * (f.bounces === 1 ? 0.34 : 0.22);
        f.vel.x *= 0.55;
        f.vel.z *= 0.55;
        // çarpma takla verir
        f.w.multiplyScalar(0.45).add(_v.set((Math.random() - 0.5) * imp * 14, (Math.random() - 0.5) * imp * 6, (Math.random() - 0.5) * imp * 14));
        if (f.bounces === 1 && imp > 0.4) this.onClack?.(Math.min(1, imp / 2));
        if (f.bounces >= 3 || imp < 0.25) this._beginSettle(f);
      }
    } else if (f.phase === 'settle') {
      f.settleT = Math.min(1, f.settleT + dt / 0.32);
      const k = 1 - Math.pow(1 - f.settleT, 3);
      f.q.copy(f.q0).slerp(f.qT, k);
      f.vel.multiplyScalar(Math.pow(0.02, dt));
      f.pos.x += f.vel.x * dt;
      f.pos.z += f.vel.z * dt;
      f.pos.y = f.y0 + (TD / 2 + 0.0002 - f.y0) * k + Math.sin(k * Math.PI) * 0.004;
      if (f.settleT >= 1) f.phase = 'rest';
    } else if (f.phase === 'gone') {
      f.goneT += dt / 0.45;
      f.g.scale.setScalar(Math.max(0.001, 1 - f.goneT * f.goneT));
      if (f.goneT >= 1) {
        this.world.remove(f.g);
        f.g.children[1].material.dispose();
        f.dead = true;
      }
    }
    f.g.position.copy(f.pos);
    f.g.quaternion.copy(f.q);
  }

  // fiziğin bıraktığı yüze göre yat: yüz normali yukarı bakıyorsa açık, aşağı bakıyorsa kapalı
  _beginSettle(f) {
    _m.makeRotationFromQuaternion(f.q);
    const zx = new THREE.Vector3().setFromMatrixColumn(_m, 2);
    const yx = new THREE.Vector3().setFromMatrixColumn(_m, 1);
    const up = zx.y >= 0;
    const yaw = Math.atan2(yx.x, yx.z);
    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(up ? -Math.PI / 2 : Math.PI / 2, 0, 0));
    target.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + (up ? Math.PI : 0)));
    f.q0 = f.q.clone();
    f.qT = target;
    f.y0 = f.pos.y;
    f.settleT = 0;
    f.phase = 'settle';
  }

  resize() {
    const w = this.host.clientWidth || innerWidth;
    const h = this.host.clientHeight || innerHeight;
    this.W = w;
    this.H = h;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.low ? 2 : 3));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 1.2 ? 38 : 25;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  // oyuna dalış: kamera masaya iner, ışık yükselir
  dive() {
    this.diving = true;
    this.diveT0 = performance.now();
  }

  _frame(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._frame);
    const t = (now - this.t0) / 1000;
    const ts = this.timeScale || 1;
    const dt = Math.min(0.033, (now - (this._last || now)) / 1000) * ts;
    this._last = now;
    // uyarlanabilir kalite: yalnız gölgeler kapanır, çözünürlük korunur
    this._ft = (this._ft || (dt / ts) * 1000) * 0.95 + (dt / ts) * 1000 * 0.05;
    if (this.adapt && !this.low && t > 3 && this._ft > 34) {
      this.low = true;
      this.renderer.shadowMap.enabled = false;
      this.lamp.castShadow = false;
      this.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
    }
    // kamera: yavaş salınım + paralaks; dalışta aşağı/ileri
    const portrait = this.W / this.H < 1.2;
    const dv = this.diving ? Math.min(1, (now - this.diveT0) / 650) : 0;
    const e = dv * dv * (3 - 2 * dv);
    const intro = Math.min(1, t / 2.2);
    const ie = 1 - Math.pow(1 - intro, 3);
    const cx = (portrait ? 0.05 : 0.1) + Math.sin(t * 0.19) * 0.022 + this.px * 0.045;
    const cy = (portrait ? 1.22 : 0.98) + (1 - ie) * 0.28 - e * 0.42 + Math.sin(t * 0.15) * 0.01 - this.py * 0.025;
    const cz = (portrait ? 0.98 : 1.12) + (1 - ie) * 0.35 - e * 0.62;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt((portrait ? 0.05 : 0.1) + this.px * 0.018, 0.0, portrait ? 0.02 : -0.02 + e * 0.1);
    this.lamp.position.x = 0.12 + Math.sin(t * 0.45) * 0.018;
    this.lamp.intensity = 19 * (0.35 + 0.65 * ie) * (1 + e * 0.6);
    // ıstaka sahneye yumuşakça yükselir, taşlar hafif nefes alır
    if (this.rack) {
      const k = Math.min(1, (now - this.rackBorn) / 900);
      const s = 1 - Math.pow(1 - k, 4);
      this.rack.scale.setScalar(Math.max(0.001, s * this.rackScale));
      this.rack.position.y = 0.0528 * this.rackScale + (1 - s) * 0.06;
      for (const rt of this.rackTiles) rt.g.position.y = rt.y0 + Math.sin(t * 1.3 + rt.ph) * 0.0003;
    }
    // altın toz
    if (this.dustPts) {
      const a = this.dustPts.geometry.attributes.position;
      for (let i = 0; i < this.dust.length; i++) {
        const d = this.dust[i];
        d.y += dt * 0.012 * d.s;
        if (d.y > 0.82) d.y = 0.03;
        a.setXYZ(i, d.x + Math.sin(t * 0.3 * d.s + d.ph) * 0.03, d.y, d.z + Math.cos(t * 0.25 * d.s + d.ph) * 0.03);
      }
      a.needsUpdate = true;
      this.dustPts.material.opacity = 0.5 * ie;
    }
    // düşen taşlar
    this.fallTimer -= dt;
    if (this.fallTimer <= 0 && !this.diving && t > 0.8) {
      this._spawnFaller();
      this.fallTimer = 0.4 + Math.random() * 0.75;
    }
    for (const f of this.fallers) this._stepFaller(f, dt);
    this.fallers = this.fallers.filter((f) => !f.dead);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('deviceorientation', this._onTilt);
    window.removeEventListener('resize', this._resize);
    this.renderer.dispose();
    // menü GPU belleğini hemen bırak (oyun masası kendi bağlamını açacak)
    this.renderer.forceContextLoss?.();
    this.canvas.remove();
  }
}
