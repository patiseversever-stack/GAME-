// Ana menü sahnesi (Three.js): loş bir odada lamba altında ceviz kenarlı okey masası. Patisever ıstakası kahraman;
// çuhada işlemeli altın amblem, lamba konisinde süzülen altın toz zerreleri. Taşlar ekranın her yerine yukarıdan
// düşer: havada takla atar, sekip kayar ve fiziğin getirdiği yüzle (açık ya da kapalı) yatar. Oyuna girerken kamera masaya dalar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadRackModel, sharpenModel } from './rack-model.js';
import { ivoryTexture } from './tile-face.js';
import { menuTexture, menuBodyColor } from './tile-themes/index.js';
import { woodCanvas } from '../ui/wood.js';
import { emblemTexture } from './emblem.js';
import { feltTextures, feltMaterial } from './felt.js';

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
  constructor(host, { quality = 'high', gyro = true } = {}) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'menu-gl';
    host.appendChild(this.canvas);
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.84; // derin çuha: orijinal sis tonu korunur
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
    // menü taşları her açılışta sıradaki taş takımıyla gelir (ayardan bağımsız)
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: menuBodyColor(0xf4ecd9), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0xfff2d8) });
    this.backMat = new THREE.MeshPhysicalMaterial({ map: menuTexture({ kind: 'back' }, ivoryTexture), roughness: 0.45, clearcoat: 0.3, transparent: true, alphaTest: 0.5, color: 0xffffff });
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
    // fare/jiroskop yalnız hedef belirler; _fx kamerayı hedefe yumuşakça taşır. Dokunmatik sürükleme kamerayı oynatmaz.
    this._onMove = (e) => {
      if (e.pointerType === 'touch') return;
      this.tx = (e.clientX / innerWidth - 0.5) * 2;
      this.ty = (e.clientY / innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', this._onMove);
    if (gyro && window.DeviceOrientationEvent) {
      this._onTilt = (e) => {
        if (e.gamma == null || e.beta == null) return;
        const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
        let gx = e.gamma;
        let gy = e.beta;
        if (ang === 90) [gx, gy] = [e.beta, -e.gamma];
        else if (ang === -90 || ang === 270) [gx, gy] = [-e.beta, e.gamma];
        if (this._bx === undefined) {
          this._bx = gx;
          this._by = gy;
        }
        this._bx += (gx - this._bx) * 0.0022;
        this._by += (gy - this._by) * 0.0022;
        if (this.gyroOff) return;
        this.gyroSeen = true;
        this.tx = Math.max(-1, Math.min(1, (gx - this._bx) / 13));
        this.ty = Math.max(-1, Math.min(1, (gy - this._by) / 13));
      };
      window.addEventListener('deviceorientation', this._onTilt);
    }
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this._buildDust();
    this._buildFx();
    this.resize();
    this.running = true;
    this.raf = requestAnimationFrame(this._frame);
    this.ready = (async () => {
      const m = await loadRackModel();
      if (m && this.running) this._buildRack(m);
    })();
  }

  // Sinematik katman: çarpma kıvılcımları, lamba ışığında süzülen bokeh, köşe ıstakaya ayrı anahtar ışık,
  // jiroskop "masaya açılan pencere" (azaltılmış harekette ya da zayıf donanımda kapalı).
  _buildFx() {
    this.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const N = this.low ? 60 : 120;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const dot = dotTexture();
    this.spk = [];
    for (let i = 0; i < N; i++) {
      this.spk.push({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, l: 0, m: 1, r: 1, g: 0.8, b: 0.5 });
      pos[i * 3 + 1] = -9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.spkPts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dot, size: 0.016, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true }));
    this.spkPts.frustumCulled = false;
    this.scene.add(this.spkPts);
    this.spkI = 0;
    if (!this.calm) {
      const B = this.low ? 8 : 16;
      const bp = new Float32Array(B * 3);
      this.bok = [];
      for (let i = 0; i < B; i++) {
        const o = { x: -0.55 + Math.random() * 1.3, y: 0.25 + Math.random() * 0.55, z: 0.15 + Math.random() * 0.5, s: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 };
        this.bok.push(o);
        bp.set([o.x, o.y, o.z], i * 3);
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
      this.bokPts = new THREE.Points(bg, new THREE.PointsMaterial({ map: dot, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd3a0 }));
      this.bokPts.frustumCulled = false;
      this.scene.add(this.bokPts);
    }
    this.burst = this.calm ? 3 : 8;
    this.shake = 0;
    this.maxT = this.calm ? 10 : 22;
    this.rackX = 0.065;
    this.rackZ = 0.07;
    this.rackYaw = -6 * DEG;
    // köşedeki ıstakanın taşları net okunsun (ana lamba masanın ortasında)
    this.rackLamp = new THREE.SpotLight(0xffe0ae, this.low ? 5 : 7.5, 0, 0.48, 0.85, 1.2);
    this.rackLamp.castShadow = false;
    this.scene.add(this.rackLamp, this.rackLamp.target);
    const nv = navigator;
    this.weak = !!((nv.deviceMemory && nv.deviceMemory <= 2) || (nv.hardwareConcurrency && nv.hardwareConcurrency <= 2));
    this.gyroOff = this.calm || this.weak;
    this.tx = this.ty = 0;
  }

  // Her açılışta ıstaka sıradaki sözü yazar; her kelime sıradaki okey rengini alır, boşluklar kelimeleri ayırır.
  _rackWords() {
    const P = [
      ['DEDEM DE', 'BÖYLE OYNARDI'],
      ['SAKİN OL', 'OKEY BENDE'],
      ['BUGÜN ŞANS', 'SENDEN YANA'],
      ['ELİN BOL', 'OKEYLİ OLSUN'],
    ];
    let q = 0;
    try {
      const v = localStorage.getItem('okey.rackPhrase');
      q = v === null ? 0 : (+v + 1) % P.length;
      localStorage.setItem('okey.rackPhrase', String(q));
    } catch {
      q = (Math.random() * P.length) | 0;
    }
    let w = 0;
    return P[q].map((line) => {
      const out = [];
      line.split(' ').forEach((word, i, all) => {
        const color = COLORS[w % 4];
        const chars = Array.from(word);
        chars.forEach((ch, j) => out.push({ kind: 'num', color, value: ch, w, last: j === chars.length - 1 }));
        w++;
        if (i < all.length - 1) out.push(null);
      });
      return out;
    });
  }

  // Istakayı sağ köşeye kameraya dönük yerleştirir, amblemi ortalar ve DOM logosunu (.h4-brand) ıstakanın
  // üstüne bağlar (--rk-x/--rk-y/--rk-a); logo üst çubuğun altına asla girmez.
  _anchor() {
    const c = this.camera;
    const W = this.W;
    const H = this.H;
    const portrait = W / H < 1.2;
    const P = c.position.clone();
    const Q = c.quaternion.clone();
    const cx = portrait ? 0.05 : 0.1;
    const cz = portrait ? 0.98 : 1.12;
    c.position.set(cx, portrait ? 1.22 : 0.98, cz);
    c.lookAt(cx, 0, portrait ? 0.02 : -0.02);
    c.updateMatrixWorld();
    const g = this._groundAt(portrait ? 0.5 : 0.74, portrait ? 0.66 : 0.7);
    if (g) {
      this.rackX = g.x;
      this.rackZ = g.z;
    }
    const eg = this._groundAt(portrait ? 0.5 : 0.465, portrait ? 0.46 : 0.445);
    if (eg && this.emblem) {
      this.emblem.position.x = eg.x;
      this.emblem.position.z = eg.z;
    }
    this.rackYaw = Math.atan2(cx - this.rackX, cz - this.rackZ) * 0.6;
    const s = new THREE.Vector3(this.rackX, 0.17, this.rackZ - 0.03).project(c);
    const x = (s.x * 0.5 + 0.5) * W;
    const y = (-s.y * 0.5 + 0.5) * H;
    const ry = Math.cos(this.rackYaw) * 0.2;
    const rz = Math.sin(this.rackYaw) * 0.2;
    const p1 = new THREE.Vector3(this.rackX - ry, 0.17, this.rackZ + rz).project(c);
    const p2 = new THREE.Vector3(this.rackX + ry, 0.17, this.rackZ - rz).project(c);
    this.host.style.setProperty('--rk-a', ((Math.atan2((p1.y - p2.y) * 0.5 * H, (p2.x - p1.x) * 0.5 * W) * 180) / Math.PI).toFixed(2) + 'deg');
    if (this.rackLamp) {
      this.rackLamp.position.set(this.rackX - 0.04, 0.78, this.rackZ + 0.32);
      this.rackLamp.target.position.set(this.rackX, 0.04, this.rackZ);
      this.rackLamp.target.updateMatrixWorld();
    }
    c.position.copy(P);
    c.quaternion.copy(Q);
    c.updateMatrixWorld();
    if (this.rack) {
      this.rack.position.x = this.rackX;
      this.rack.position.z = this.rackZ;
      this.rack.rotation.y = this.rackYaw;
    }
    this.rackBox?.set(new THREE.Vector3(this.rackX - 0.26, -1, this.rackZ - 0.1), new THREE.Vector3(this.rackX + 0.26, 1, this.rackZ + 0.065));
    const h = this.host;
    const brand = h.querySelector('.h4-brand');
    const bar = h.querySelector('.h4-top');
    const top = (bar ? bar.offsetTop + bar.offsetHeight : 56) + (brand ? brand.offsetHeight : 0) + 10;
    this.rkAx = x;
    this.rkAy = y;
    h.style.setProperty('--rk-x', x.toFixed(1) + 'px');
    h.style.setProperty('--rk-y', Math.max(y, top).toFixed(1) + 'px');
    h.classList.add('has-rk');
  }

  // solarak kaybolacak taş: gövde ve sırt malzemesi kopyalanır (paylaşılan malzemeler etkilenmez)
  _fadePrep(f) {
    const [body, face, back] = f.g.children;
    body.castShadow = false;
    body.material = body.material.clone();
    back.material = back.material.clone();
    f.fm = [body.material, face.material, back.material];
    for (const m of f.fm) {
      m.transparent = true;
      m.alphaTest = 0;
      m.depthWrite = false;
      m.needsUpdate = true;
    }
  }

  _impact(p, imp) {
    if (this.calm) return;
    const n = Math.min(1, imp / 2.5);
    const count = 3 + ((n * 6) | 0);
    for (let i = 0; i < count; i++) {
      const s = this.spk[this.spkI++ % this.spk.length];
      const an = Math.random() * 6.283;
      const sp = 0.04 + Math.random() * 0.18 * (0.4 + n);
      s.x = p.x;
      s.y = Math.max(0.004, p.y);
      s.z = p.z;
      s.vx = Math.cos(an) * sp;
      s.vz = Math.sin(an) * sp;
      s.vy = 0.1 + Math.random() * 0.32 * n;
      s.l = 1;
      s.m = 0.5 + Math.random() * 0.5;
      s.r = 1;
      s.g = 0.78 + Math.random() * 0.15;
      s.b = 0.45;
    }
    this.shake = Math.max(this.shake, n * 0.0035);
  }

  _fx(dt, t) {
    const c = this.camera;
    const gk = 1 - Math.exp(-dt * 5);
    this.px += (this.tx - this.px) * gk;
    this.py += (this.ty - this.py) * gk;
    // kareler düşerse jiroskop kendini kapatır
    if (!this.gyroOff && this.gyroSeen && t > 4 && this._ft > 30) {
      this.gyroOff = true;
      this.tx = this.ty = 0;
    }
    if (this.rkAx !== undefined) {
      if (this.brandEl === undefined) {
        this.brandEl = this.host.querySelector('.h4-brand');
        this.modesEl = this.host.querySelector('.h4-modes');
      }
      // logo ıstakanın canlı kaymasını izler, mod kartları ters yönde hafif paralaks yapar
      c.updateMatrixWorld();
      const v = this._rkv || (this._rkv = new THREE.Vector3());
      v.set(this.rackX, 0.17, this.rackZ - 0.03).project(c);
      const dx = (v.x * 0.5 + 0.5) * this.W - this.rkAx;
      const dy = (-v.y * 0.5 + 0.5) * this.H - this.rkAy;
      const mx = -this.px * 8;
      const my = -this.py * 5;
      if (this.brandEl && (Math.abs(dx - (this._bdx || 0)) > 0.25 || Math.abs(dy - (this._bdy || 0)) > 0.25)) {
        this._bdx = dx;
        this._bdy = dy;
        this.brandEl.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      }
      if (this.modesEl && (Math.abs(mx - (this._mdx || 0)) > 0.2 || Math.abs(my - (this._mdy || 0)) > 0.2)) {
        this._mdx = mx;
        this._mdy = my;
        this.modesEl.style.translate = mx.toFixed(1) + 'px ' + my.toFixed(1) + 'px';
      }
    }
    if (this.shake > 1e-5) {
      c.position.x += (Math.random() - 0.5) * this.shake;
      c.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.002, dt);
    }
    const P = this.spkPts.geometry.attributes.position;
    const C = this.spkPts.geometry.attributes.color;
    for (let i = 0; i < this.spk.length; i++) {
      const s = this.spk[i];
      if (s.l > 0) {
        s.l -= (dt * 1.4) / s.m;
        s.vy -= 1.4 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        if (s.y < 0.003) {
          s.y = 0.003;
          s.vy *= -0.3;
        }
      }
      const L = s.l > 0 ? s.l * s.l : 0;
      P.setXYZ(i, s.x, s.l > 0 ? s.y : -9, s.z);
      C.setXYZ(i, s.r * L, s.g * L, s.b * L);
    }
    P.needsUpdate = C.needsUpdate = true;
    if (this.bokPts) {
      const B = this.bokPts.geometry.attributes.position;
      for (let i = 0; i < this.bok.length; i++) {
        const o = this.bok[i];
        B.setXYZ(i, o.x + Math.sin(t * 0.12 * o.s + o.ph) * 0.08, o.y + Math.sin(t * 0.09 * o.s + o.ph * 2) * 0.05, o.z);
      }
      B.needsUpdate = true;
      this.bokPts.material.opacity = 0.08 * Math.min(1, t / 3);
    }
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
    const ft = feltTextures();
    for (const t of [ft.map, ft.normal]) t.repeat.set(9, 6);
    const FW = 1.9;
    const FD = 1.3;
    this.feltBox = { x0: -FW / 2 + 0.03, x1: FW / 2 - 0.03, z0: -0.62, z1: FD - 0.62 - 0.03 };
    const table = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), feltMaterial(!this.low));
    table.material.normalScale.multiplyScalar(1.2); // menü çuhası biraz daha kabartmalı (oyun masası kendi malzemesini korur)
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
    // işlemeli amblem (2048 px yaldız mühür, hafif parıltı); konumunu _anchor belirler
    const em = new THREE.Mesh(
      new THREE.PlaneGeometry(0.37, 0.37),
      new THREE.MeshStandardMaterial({ map: emblemTexture(), emissiveMap: emblemTexture(), emissive: 0xffd480, emissiveIntensity: 0.22, transparent: true, roughness: 0.36, metalness: 0.6, color: 0xffffff, depthWrite: false }),
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
    const face = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: menuTexture(desc, ivoryTexture), bumpScale: 1.2, roughness: 0.42, clearcoat: 0.35, transparent: true, alphaTest: 0.5 }));
    face.position.z = fz;
    const back = new THREE.Mesh(this.faceGeo, this.backMat);
    back.position.z = -fz;
    back.rotation.y = Math.PI;
    g.add(body, face, back);
    return g;
  }

  _randDesc() {
    // okey taşı da kendi sayısını taşır (yüz boyacısı değer/renk ister)
    if (Math.random() < 0.07) return { kind: 'okey', color: COLORS[(Math.random() * 4) | 0], value: 1 + ((Math.random() * 13) | 0) };
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
    // ıstaka bir söz yazar (okey renklerinde harf taşları), iki kademe, arkaya yaslı; taşlar önce kapalı bekler,
    // sonra kelime kelime açılır (_frame). Modelin kademe noktaları: (y,z) = (0.016,0) ve (-0.02,0.032)
    const lean = -21 * DEG;
    const rows = [
      { y: 0.016, z: -0.0035 },
      { y: -0.02, z: 0.0285 },
    ];
    this.rackTiles = [];
    this._rackWords().forEach((line, row) => {
      const r = rows[row];
      const s0 = Math.floor((13 - line.length) / 2);
      line.forEach((d, i) => {
        if (!d) return;
        const t = this._mkTile(d);
        const x = (s0 + i - 6) * (TW + 0.0024);
        t.position.set(x, r.y + (TH / 2) * Math.cos(lean) + 0.0004, r.z + TD * 0.4);
        t.rotation.x = lean;
        t.rotation.y = Math.PI;
        t.scale.setScalar(1.05);
        rack.add(t);
        // yüz kendi ışığını hafifçe taşır; açılınca kısa bir altın parıltı
        const fm = t.children[1].material;
        if (fm.emissive) {
          fm.emissive.set(0xffffff);
          fm.emissiveMap = fm.map;
          fm.emissiveIntensity = 0.2;
          fm.needsUpdate = true;
        }
        this.rackTiles.push({ g: t, y0: t.position.y, z0: t.position.z, ph: Math.random() * 6, k: this.rackTiles.length, d: row * 900 + (s0 + i) * 72 + d.w * 200, last: d.last, m: fm });
      });
    });
    rack.position.set(this.rackX, 0.0528 * 0.86, this.rackZ);
    rack.rotation.y = this.rackYaw;
    this.rackScale = 1.14;
    rack.scale.setScalar(0.001);
    this.rack = rack;
    this.rackBorn = performance.now();
    this.world.add(rack);
    // ıstaka bölgesine taş düşmesin
    this.rackBox = new THREE.Box3(new THREE.Vector3(this.rackX - 0.235, -1, this.rackZ - 0.09), new THREE.Vector3(this.rackX + 0.235, 1, this.rackZ + 0.06));
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
    const tFall = Math.sqrt((2 * h) / 3.9);
    const sc = this.calm ? 1 : 1.5; // kahraman taşlar daha büyük
    const pos = new THREE.Vector3(land.x - vx * tFall, h, land.z - vz * tFall);
    g.position.copy(pos);
    g.scale.setScalar(sc);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28));
    g.quaternion.copy(q);
    this.world.add(g);
    this.fallers.push({
      sc,
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
    // taşlar asla kaymaz: sınır aşılınca en eski yerinde solarak kaybolur
    while (this.fallers.filter((f) => f.phase !== 'gone').length > (this.maxT || 22)) {
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
    return f.pos.y - (f.sc || 1) * (Math.abs(e[1]) * HALF.x + Math.abs(e[5]) * HALF.y + Math.abs(e[9]) * HALF.z);
  }

  _stepFaller(f, dt) {
    f.age += dt;
    if (f.phase === 'fall') {
      f.vel.y -= 3.9 * dt;
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
        if (f.bounces === 1 && imp > 0.4) {
          this.onClack?.(Math.min(1, imp / 2));
          this._impact(f.pos, imp); // kıvılcım + hafif kamera sarsıntısı
        }
        if (f.bounces >= 3 || imp < 0.25) this._beginSettle(f);
      }
    } else if (f.phase === 'settle') {
      f.settleT = Math.min(1, f.settleT + dt / 0.32);
      const k = 1 - Math.pow(1 - f.settleT, 3);
      f.q.copy(f.q0).slerp(f.qT, k);
      f.vel.multiplyScalar(Math.pow(0.02, dt));
      f.pos.x += f.vel.x * dt;
      f.pos.z += f.vel.z * dt;
      f.pos.y = f.y0 + ((TD / 2) * (f.sc || 1) + 0.0002 - f.y0) * k + Math.sin(k * Math.PI) * 0.004;
      if (f.settleT >= 1) f.phase = 'rest';
    } else if (f.phase === 'gone') {
      if (f.goneT === 0) this._fadePrep(f);
      f.goneT += dt / 1.4;
      for (const m of f.fm) m.opacity = Math.max(0, 1 - f.goneT);
      if (f.goneT >= 1) {
        this.world.remove(f.g);
        for (const m of f.fm) m.dispose();
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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.low ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 1.2 ? 38 : 25;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this._anchor();
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
    // uyarlanabilir kalite: gölgeler kapanır, çözünürlük ve jiroskop paralaksı da düşer
    this._ft = (this._ft || (dt / ts) * 1000) * 0.95 + (dt / ts) * 1000 * 0.05;
    if (this.adapt && !this.low && t > 3 && this._ft > 34) {
      this.low = true;
      this.gyroOff = true;
      this.tx = this.ty = 0;
      this.resize();
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
    // gerçek bir "pencere" yörüngesi: kamera masanın etrafında salınır (birkaç milimetre değil)
    const cx = (portrait ? 0.05 : 0.1) + Math.sin(t * 0.19) * 0.022 + this.px * 0.15;
    const cy = (portrait ? 1.22 : 0.98) + (1 - ie) * 0.28 - e * 0.42 + Math.sin(t * 0.15) * 0.01 - this.py * 0.08;
    const cz = (portrait ? 0.98 : 1.12) + (1 - ie) * 0.35 - e * 0.62;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt((portrait ? 0.05 : 0.1) + this.px * 0.012, 0.0, portrait ? 0.02 : -0.02 + e * 0.1);
    // canlı lamba: hafif salınır ve paralaksı izler
    this.lamp.position.x = 0.12 + Math.sin(t * 0.45) * 0.05 + this.px * 0.1;
    this.lamp.position.z = 0.25 + Math.sin(t * 0.31) * 0.04 + this.py * 0.08;
    this._fx(dt, t);
    this.lamp.intensity = 15.5 * (0.35 + 0.65 * ie) * (1 + e * 0.6);
    // ıstaka sahneye yumuşakça yükselir, taşlar hafif nefes alır
    if (this.rack) {
      const k = Math.min(1, (now - this.rackBorn) / 900);
      const s = 1 - Math.pow(1 - k, 4);
      this.rack.scale.setScalar(Math.max(0.001, s * this.rackScale));
      this.rack.position.y = 0.0528 * this.rackScale + (1 - s) * 0.06;
      // söz kapalı bekler, sonra kelime kelime açılır: taş yuvasından kalkar, hafif aşarak döner,
      // yumuşak bir tıkla oturur ve kısa bir altın parıltı verir
      for (const rt of this.rackTiles) {
        const fp = Math.min(1, Math.max(0, (now - this.rackBorn - 1350 - rt.d) / 560));
        const u = fp - 1;
        const eb = 1 + 2.4 * u * u * u + 1.4 * u * u;
        const lift = Math.sin(Math.min(1, fp * 1.12) * Math.PI);
        rt.g.rotation.y = Math.PI * (1 - eb);
        rt.g.position.y = rt.y0 + Math.sin(t * 1.3 + rt.ph) * 0.0003 + lift * 0.016;
        rt.g.position.z = rt.z0 + lift * 0.007;
        if (fp < 1) rt.done = 0;
        else if (!rt.done) {
          rt.done = 1;
          rt.gl = now;
          if (rt.last) this.onClack?.(0.16);
        }
        if (rt.m) {
          const gk = rt.gl ? Math.max(0, 1 - (now - rt.gl) / 650) : 0;
          rt.m.emissiveIntensity = 0.2 + gk * gk * 0.5;
          if (!gk) rt.gl = 0;
        }
      }
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
    // açılışta acelesiz bir yağmur (burst), sonra seyrek; masa dolunca yenisi gelmez
    if (this.fallTimer <= 0 && !this.diving && t > 0.7) {
      this._spawnFaller();
      this.fallTimer = this.burst-- > 0 ? 0.3 + Math.random() * 0.25 : 1.1 + Math.random() * 1.1;
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
