// Ana menü sahnesi (Three.js): lamba altında okey masası — Patisever ıstakası, dizili taşlar, çuhaya dağılmış taşlar,
// ara ara düşüp seken taş, fare/eğim ile yumuşak kamera paralaksı. Oyuna girerken kamera masaya dalar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { faceTexture } from './tile-face.js';

const DEG = Math.PI / 180;
const TW = 0.028;
const TH = 0.043;
const TD = 0.017;
const COLORS = ['red', 'blue', 'black', 'yellow'];

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
      const f = 1 + v * 0.24;
      const i = (y * S + x) * 4;
      d[i] *= f;
      d[i + 1] *= f;
      d[i + 2] *= f;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export class MenuStage {
  constructor(host, { quality = 'high', rackModel = null } = {}) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'menu-gl';
    host.appendChild(this.canvas);
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    this.low = quality === 'low';
    this.adapt = quality === 'auto';
    r.shadowMap.enabled = !this.low;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060d0b);
    scene.fog = new THREE.Fog(0x060d0b, 1.8, 3.4);
    this.scene = scene;
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.2;
    this.camera = new THREE.PerspectiveCamera(26, 2, 0.05, 20);
    this.lamp = new THREE.SpotLight(0xffe3b8, 17, 0, 0.62, 0.85, 1.2);
    this.lamp.position.set(0.1, 1.15, 0.3);
    this.lamp.target.position.set(0.17, 0, 0.0);
    this.lamp.castShadow = !this.low;
    this.lamp.shadow.mapSize.set(2048, 2048);
    this.lamp.shadow.bias = -0.0002;
    this.lamp.shadow.normalBias = 0.002;
    this.lamp.shadow.radius = 5;
    scene.add(this.lamp, this.lamp.target);
    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x0a1a15, 0.35));
    // masa
    const felt = feltTexture();
    felt.repeat.set(8, 8);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map: felt, bumpMap: felt, bumpScale: 0.6, roughness: 0.97, color: 0x6fa396 }));
    table.rotation.x = -Math.PI / 2;
    table.receiveShadow = true;
    scene.add(table);
    // geometri ve malzemeler
    const bs = TW * 0.05;
    const bt = TW * 0.06;
    const shape = roundedShape(TW - 2 * bs, TH - 2 * bs, TW * 0.13);
    this.tileGeo = new THREE.ExtrudeGeometry(shape, { depth: TD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 4, curveSegments: 8 });
    this.tileGeo.translate(0, 0, -(TD - 2 * bt) / 2);
    this.faceGeo = new THREE.PlaneGeometry(TW - bs * 0.5, TH - bs * 0.5);
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf3ead6, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.28 });
    this.tiles = [];
    this.world = new THREE.Group();
    scene.add(this.world);
    this.t0 = performance.now();
    this.px = 0;
    this.py = 0;
    this.diving = false;
    this._frame = this._frame.bind(this);
    this.fallTimer = 1.2;
    this.fallers = [];
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
    this.ready = (async () => {
      const m = rackModel || (await this._loadRack());
      if (m) this._buildRack(m);
      this._scatter();
      this.resize();
      this.running = true;
      this.raf = requestAnimationFrame(this._frame);
    })();
  }

  async _loadRack() {
    try {
      let buf;
      if (window.__RACK_GLB) {
        const bin = atob(window.__RACK_GLB);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        buf = u.buffer;
      } else buf = await (await fetch('./assets/models/rack.opt.glb')).arrayBuffer();
      return await new Promise((res, rej) => new GLTFLoader().parse(buf, '', (g) => res(g.scene), rej));
    } catch {
      return null;
    }
  }

  _mkTile(desc, { shadow = true } = {}) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    const body = new THREE.Mesh(this.tileGeo, this.bodyMat);
    body.castShadow = shadow;
    body.receiveShadow = true;
    const fz = TD / 2 + 0.00012;
    const face = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTexture(desc), roughness: 0.5, clearcoat: 0.25, transparent: true, alphaTest: 0.5 }));
    face.position.z = fz;
    const back = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTexture({ kind: 'back' }), roughness: 0.5, clearcoat: 0.15, transparent: true, alphaTest: 0.5, color: 0xb8c4bd }));
    back.position.z = -fz;
    back.rotation.y = Math.PI;
    inner.add(body, face, back);
    return { group: g, inner };
  }

  _randDesc() {
    if (Math.random() < 0.06) return { kind: 'okey' };
    return { kind: 'num', color: COLORS[(Math.random() * 4) | 0], value: 1 + ((Math.random() * 13) | 0) };
  }

  _buildRack(model) {
    const rack = new THREE.Group();
    const m = model.clone(true);
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material.envMapIntensity = 0.9;
        const an = this.renderer.capabilities.getMaxAnisotropy();
        for (const k of ['map', 'normalMap', 'roughnessMap']) if (o.material[k]) o.material[k].anisotropy = an;
      }
    });
    rack.add(m);
    // dizili taşlar: iki kademe, arkaya yaslı
    const lean = -21 * DEG;
    const rows = [
      { y: 0.016, z: -0.004, n: 11 },
      { y: -0.02, z: 0.027, n: 7 },
    ];
    for (const row of rows) {
      for (let i = 0; i < row.n; i++) {
        const t = this._mkTile(this._randDesc(), { shadow: true });
        const x = (i - (row.n - 1) / 2) * (TW + 0.0028);
        t.group.position.set(x, row.y + (TH / 2) * Math.cos(-lean) + 0.0004, row.z - (TH / 2) * Math.sin(-lean) * 0 + 0.0);
        t.group.rotation.x = lean;
        rack.add(t.group);
        this.tiles.push({ ...t, home: t.group.position.clone(), seat: true, phase: Math.random() * 6 });
      }
    }
    rack.position.set(0.06, 0.0528, 0.04);
    rack.rotation.y = -6 * DEG;
    this.rack = rack;
    this.world.add(rack);
  }

  _scatter() {
    // çuhaya saçılmış taşlar (yüzü yukarı/aşağı), birkaçı üst üste
    const spots = [
      [-0.16, 0.17], [-0.04, 0.2], [-0.3, 0.05], [-0.1, -0.12], [0.06, -0.17], [0.3, -0.12], [-0.24, -0.13], [0.32, 0.18], [-0.4, 0.15], [0.16, 0.21], [-0.45, -0.04]
    ];
    spots.forEach(([x, z], i) => {
      const faceUp = Math.random() < 0.7;
      const t = this._mkTile(this._randDesc());
      t.group.position.set(x, TD / 2 + 0.0003, z);
      t.group.rotation.set(-Math.PI / 2, 0, (Math.random() - 0.5) * Math.PI);
      t.inner.rotation.y = faceUp ? 0 : Math.PI;
      this.world.add(t.group);
      this.tiles.push({ ...t, loose: true, ox: x, oz: z });
      if (i % 4 === 1) {
        const t2 = this._mkTile(this._randDesc());
        t2.group.position.set(x + 0.004, TD * 1.5 + 0.0006, z - 0.003);
        t2.group.rotation.set(-Math.PI / 2, 0, t.group.rotation.z + 0.35);
        this.world.add(t2.group);
        this.tiles.push({ ...t2, loose: true });
      }
    });
  }

  _spawnFaller() {
    const t = this._mkTile(this._randDesc(), { shadow: true });
    const x = -0.3 + Math.random() * 0.5;
    const z = -0.12 + Math.random() * 0.3;
    t.group.position.set(x, 0.5, z);
    t.group.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.world.add(t.group);
    this.fallers.push({ ...t, vy: 0, y: 0.5, x, z, spin: [(Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9], bounces: 0, land: false, rest: (Math.random() - 0.5) * 2, born: performance.now() });
  }

  resize() {
    const w = this.host.clientWidth || innerWidth;
    const h = this.host.clientHeight || innerHeight;
    this.W = w;
    this.H = h;
    this.renderer.setPixelRatio(this.low ? 1 : Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // dar/dikey ekranda daha uzak kadraj
    this.baseFov = w / h < 1.2 ? 36 : 24;
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
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this._last = now;
    // uyarlanabilir kalite
    this._ft = (this._ft || dt * 1000) * 0.95 + dt * 1000 * 0.05;
    if (this.adapt && !this.low && t > 3 && this._ft > 34) {
      this.low = true;
      this.renderer.shadowMap.enabled = false;
      this.lamp.castShadow = false;
      this.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
      this.resize();
    }
    // kamera: yavaş salınım + paralaks; dalışta aşağı/ileri
    const portrait = this.W / this.H < 1.2;
    const dv = this.diving ? Math.min(1, (now - this.diveT0) / 650) : 0;
    const e = dv * dv * (3 - 2 * dv);
    const cx = (portrait ? 0.05 : 0.1) + Math.sin(t * 0.21) * 0.025 + this.px * 0.05;
    const cy = (portrait ? 1.2 : 0.98) - e * 0.4 + Math.sin(t * 0.17) * 0.012 - this.py * 0.03;
    const cz = (portrait ? 0.95 : 1.12) - e * 0.6;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt((portrait ? 0.05 : 0.1) + this.px * 0.02, 0.0, portrait ? 0.02 : -0.02 + e * 0.1);
    // lamba hafif sallanır
    this.lamp.position.x = 0.1 + Math.sin(t * 0.5) * 0.02;
    this.lamp.intensity = 17 * (1 + e * 0.5);
    // ıstakadaki taşlar: çok hafif nefes
    for (const tl of this.tiles) {
      if (tl.seat) tl.group.position.y = tl.home.y + Math.sin(t * 1.3 + tl.phase) * 0.00035;
    }
    // düşen taşlar
    this.fallTimer -= dt;
    if (this.fallTimer <= 0 && !this.diving) {
      this._spawnFaller();
      this.fallTimer = 2.4 + Math.random() * 1.6;
    }
    for (const f of this.fallers) {
      if (!f.land) {
        f.vy -= 3.2 * dt;
        f.y += f.vy * dt;
        f.group.rotation.x += f.spin[0] * dt;
        f.group.rotation.y += f.spin[1] * dt;
        f.group.rotation.z += f.spin[2] * dt;
        if (f.y <= TD / 2 + 0.001) {
          f.y = TD / 2 + 0.001;
          if (f.bounces < 2) {
            f.vy = -f.vy * 0.32;
            f.spin = f.spin.map((s) => s * 0.4);
            f.bounces++;
          } else {
            f.land = true;
            f.group.rotation.set(-Math.PI / 2, 0, f.group.rotation.z);
            f.inner.rotation.y = f.rest > 0 ? 0 : Math.PI;
          }
        }
        f.group.position.y = f.y;
      }
    }
    // eskiler solar → kaldırılır
    if (this.fallers.length > 5) {
      const old = this.fallers.shift();
      this.world.remove(old.group);
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('deviceorientation', this._onTilt);
    window.removeEventListener('resize', this._resize);
    this.renderer.dispose();
    this.canvas.remove();
  }
}
