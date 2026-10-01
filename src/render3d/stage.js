// Perspektif 3B sahne (Three.js) — masaya oturmuş oyuncunun gözünden.
//
// İlke: "ekrana bağlı 3B". Yerleşim çözücü ve etkileşim ekran pikselinde çalışır (layout.js, input.js, SpriteSystem).
// Bu sınıf her nesneyi, ekrandaki noktasından atılan ışının ilgili yüzeye (masa düzlemi ya da ıstaka düzlemi)
// değdiği yere, o noktadaki "piksel başına dünya birimi" ölçeğiyle yerleştirir. Böylece:
//   • taşlar tam yerleşimdeki konumlarında görünür → dokunma/sürükleme hesabı değişmez,
//   • masa gerçek perspektifte, ışıkta ve gölgede durur; ıstaka öne eğik, taşlar üzerinde dik durur,
//   • ıstaka ↔ masa geçişlerinde (çekme/atma) yüzey ve yönelim yumuşakça karışır (ışınlanma yok).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { faceTexture, descFromEl } from './tile-face.js';
import { woodCanvas } from '../ui/wood.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
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

// Patisever ıstakası (GLB): bir kez yüklenir. Derlenmiş dosyada base64 gömülüdür (window.__RACK_GLB), geliştirmede dosyadan.
let rackPromise = null;
function loadRackModel() {
  if (rackPromise) return rackPromise;
  rackPromise = (async () => {
    try {
      let buf;
      if (typeof window !== 'undefined' && window.__RACK_GLB) {
        const bin = atob(window.__RACK_GLB);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        buf = u.buffer;
      } else buf = await (await fetch('./assets/models/rack.opt.glb')).arrayBuffer();
      return await new Promise((res, rej) => new GLTFLoader().parse(buf, '', (g) => res(g.scene), rej));
    } catch (e) {
      console.warn('Istaka modeli yüklenemedi, yedek ıstaka çiziliyor', e);
      return null;
    }
  })();
  return rackPromise;
}

// Modelin (metre) kesit ölçüleri: iki kademenin basamak noktaları (y,z) ve kademe düzleminin yönü
const MODEL = { w: 0.48, p1: [0.016, 0.0], p2: [-0.02, 0.032] };
const _dy = MODEL.p2[0] - MODEL.p1[0];
const _dz = MODEL.p2[1] - MODEL.p1[1];
const _len = Math.hypot(_dy, _dz); // basamaklar arası uzaklık (≈47.5 mm)
const SL_C = -_dy / _len; // yukarı-eğim yönünün y bileşeni
const SL_S = _dz / _len; // z bileşeni (negatif yönde)

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// çuha dokusu: lifli gürültü, tekrar eden
function feltTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#2d6154';
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  let seed = 99991;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const n = new Float32Array(S * S);
  for (let i = 0; i < n.length; i++) n[i] = rnd();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (let k = -2; k <= 2; k++) v += n[y * S + ((x + k + S) % S)];
      v = v / 5 - 0.5;
      const i = (y * S + x) * 4;
      const f = 1 + v * 0.22 + (n[((y + 3) % S) * S + x] - 0.5) * 0.06;
      d[i] *= f;
      d[i + 1] *= f;
      d[i + 2] *= f;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export class Stage3D {
  constructor(host, { quality = 'high' } = {}) {
    this.host = host;
    this.quality = quality;
    const canvas = document.createElement('canvas');
    canvas.className = 'gl-stage';
    host.insertBefore(canvas, host.firstChild.nextSibling);
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100d);
    this.scene = scene;
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.16;
    this.camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
    // ışık: masanın üstünde sarkan sıcak lamba (spot) + çok zayıf ortam dolgusu
    this.lamp = new THREE.SpotLight(0xffe4bd, 6.4, 0, 0.62, 1, 0);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(2048, 2048);
    this.lamp.shadow.bias = -0.00025;
    this.lamp.shadow.normalBias = 0.8;
    this.lamp.shadow.radius = 6;
    scene.add(this.lamp, this.lamp.target);
    this.fill = new THREE.HemisphereLight(0xfff1dc, 0x0d1f1a, 0.2);
    scene.add(this.fill);
    this.rim = new THREE.DirectionalLight(0xbfd8ff, 0.35);
    scene.add(this.rim);
    // masa (çuha) ve ahşap kenar
    this.felt = feltTexture();
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: this.felt, roughness: 0.96, metalness: 0, color: 0x5a8a80 }));
    this.table.rotation.x = -Math.PI / 2;
    this.table.receiveShadow = true;
    scene.add(this.table);
    this.rackGroup = new THREE.Group();
    scene.add(this.rackGroup);
    this.meshes = new Map();
    this.decos = new Map();
    this.opp = new Map();
    this.dirty = true;
    this._raf = 0;
    this._loop = this._loop.bind(this);
    this.ray = new THREE.Raycaster();
    this.planeT = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.planeR = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf3ead6, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.25, sheenColor: new THREE.Color(0xfff4dc) });
    this.backMatBody = new THREE.MeshPhysicalMaterial({ color: 0x2f5a4e, roughness: 0.38, clearcoat: 0.6 });
    this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
  }

  // ─── ekran → dünya ───
  _hit(sx, sy, plane, out) {
    const ndc = new THREE.Vector2((sx / this.W) * 2 - 1, -(sy / this.H) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    return this.ray.ray.intersectPlane(plane, out) || out.set(0, 0, 0);
  }
  // yüzeyde piksel başına dünya birimi
  _k(sx, sy, plane) {
    const a = this._hit(sx - 4, sy, plane, this._v[2]);
    const b = this._hit(sx + 4, sy, plane, this._v[3]);
    return a.distanceTo(b) / 8;
  }

  // ─── ölçek / yerleşim ───
  resize(L, dpr) {
    this.L = L;
    const W = (this.W = L.w);
    const H = (this.H = L.h);
    const q = this.quality === 'low' ? 1 : Math.min(dpr || 1, 2);
    this.renderer.setPixelRatio(q);
    this.renderer.setSize(W, H, false);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    const cam = this.camera;
    cam.aspect = W / H;
    // ekran ortasında 1 birim ≈ 1 piksel olacak uzaklık; masaya ~52° eğik bakış
    const pitch = (L.profile === 'landscape' ? 50 : 56) * DEG;
    const dist = H / 2 / Math.tan((cam.fov * DEG) / 2);
    cam.position.set(0, dist * Math.sin(pitch), dist * Math.cos(pitch));
    cam.lookAt(0, 0, 0);
    cam.near = dist * 0.1;
    cam.far = dist * 8;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.dist = dist;
    // masa düzlemi y=0; ekranın her yerini kaplayacak kadar büyük
    const span = dist * 6;
    this.table.scale.set(span, span, 1);
    this.felt.repeat.set(span / 420, span / 420);
    // ıstaka düzlemi: ıstaka merkezine giden ışın üzerinde, kameraya daha yakın, kameraya bakan ve hafif geriye yatık
    const rr = L.rack.rect;
    const rc = this._hit(rr.x + rr.w / 2, rr.y + rr.h / 2, this.planeT, new THREE.Vector3());
    const toCam = new THREE.Vector3().subVectors(cam.position, rc).normalize();
    const anchor = rc.clone().addScaledVector(toCam, dist * 0.14);
    // kameranın bakış eksenine dik → düzlem üzerinde ölçek her yerde eşit (model ıstaka yerleşimle birebir örtüşür)
    const n = new THREE.Vector3().subVectors(cam.position, new THREE.Vector3(0, 0, 0)).normalize();
    this.planeR.setFromNormalAndCoplanarPoint(n, anchor);
    this.rackN = n;
    // ıstaka yüzeyinin "yukarı" yönü (dünya yukarısının düzleme izdüşümü)
    const up = new THREE.Vector3(0, 1, 0);
    this.rackUp = up.sub(n.clone().multiplyScalar(up.dot(n))).normalize();
    this.rackRight = new THREE.Vector3().crossVectors(this.rackUp, n).normalize();
    this.qRack = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.rackRight, this.rackUp, n));
    // masadaki taşlar: yatık ama yüzü kameraya ~22° dönük (gerçek masada eğilip bakmak gibi) → okunur
    this.qTable = new THREE.Quaternion()
      .setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 30 * DEG));
    // lamba: oyun alanının üstünde, biraz karşı tarafta
    const center = this._hit(W / 2, L.table.y + L.table.h * 0.55, this.planeT, new THREE.Vector3());
    this.lamp.position.set(center.x - dist * 0.25, dist * 1.35, center.z - dist * 0.35);
    this.lamp.target.position.copy(center);
    this.lamp.distance = 0;
    this.lamp.angle = 0.6;
    this.lamp.shadow.camera.near = dist * 0.3;
    this.lamp.shadow.camera.far = dist * 4;
    this.rim.position.set(dist, dist * 0.6, -dist);
    this.buildRails(L);
    this.setTileSize(L.rack.tw, L.rack.th);
    this.buildRack(L);
    for (const o of this.opp.values()) this.scene.remove(o.group);
    this.opp.clear();
    this.invalidate();
  }

  setTileSize(tw, th) {
    if (this.tileGeo && tw === this.tw && th === this.th) return;
    this.tw = tw;
    this.th = th;
    const bs = tw * 0.05;
    const bt = tw * 0.06;
    const D = tw * 0.3;
    this.D = D + 2 * bt;
    const shape = roundedShape(tw - 2 * bs, th - 2 * bs, tw * 0.13);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 4, curveSegments: 8 });
    geo.translate(0, 0, -D / 2);
    this.tileGeo?.dispose();
    this.tileGeo = geo;
    this.faceGeo?.dispose();
    this.faceGeo = new THREE.PlaneGeometry(tw - bs * 0.5, th - bs * 0.5);
    this.faceZ = D / 2 + bt + 0.12;
    for (const m of this.meshes.values()) this._applyGeo(m);
    for (const m of this.decos.values()) this._applyGeo(m);
  }

  // masanın kenarları: uzak kenarda ve yanlarda cilalı ceviz pervaz; ötesi loş oda (perspektif derinlik)
  buildRails(L) {
    this.railGroup && this.scene.remove(this.railGroup);
    const g = new THREE.Group();
    this.railGroup = g;
    const topY = Math.max(2, L.hud.y + L.hud.h * 0.35);
    const far = this._hit(this.W / 2, topY, this.planeT, new THREE.Vector3()).z;
    const bl = this._hit(0, this.H, this.planeT, new THREE.Vector3());
    const tl = this._hit(0, topY, this.planeT, new THREE.Vector3());
    const d = this.dist;
    const railW = d * 0.09;
    const railH = d * 0.05;
    const wood = this._wood(0x7a4a26, 0.35, 1 / 900, 1 / 220);
    wood.metalness = 0.05;
    const near = bl.z + d * 0.5;
    const halfW = Math.max(Math.abs(tl.x), Math.abs(bl.x)) - railW * 0.1;
    // uzak kenar
    const back = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + railW * 2, railH, railW), wood);
    back.position.set(0, railH / 2, far - railW / 2);
    back.castShadow = back.receiveShadow = true;
    g.add(back);
    // yanlar (ekran kenarlarında, perspektifte birleşir)
    for (const sx of [-1, 1]) {
      const len = near - far;
      const side = new THREE.Mesh(new THREE.BoxGeometry(railW, railH, len), wood);
      side.position.set(sx * (halfW + railW / 2), railH / 2, far + len / 2);
      side.castShadow = side.receiveShadow = true;
      g.add(side);
    }
    // çuha yalnız pervazın içinde; dışı koyu zemin
    this.table.scale.set(halfW * 2 + 2, near - far + 2, 1);
    this.table.position.set(0, 0, (far + near) / 2);
    this.felt.repeat.set((halfW * 2) / 420, (near - far) / 420);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(d * 20, d * 20), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -railH * 2;
    g.add(floor);
    this.scene.add(g);
  }

  _wood(color, rough, rx, ry) {
    if (!this.woodTex) {
      const wc = woodCanvas();
      if (wc) {
        this.woodTex = new THREE.CanvasTexture(wc);
        this.woodTex.colorSpace = THREE.SRGBColorSpace;
        this.woodTex.wrapS = this.woodTex.wrapT = THREE.MirroredRepeatWrapping;
        this.woodTex.anisotropy = 8;
      }
    }
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    if (this.woodTex) {
      m.map = this.woodTex.clone();
      m.map.needsUpdate = true;
      m.map.repeat.set(rx, ry);
    }
    return m;
  }

  // ─── oyuncunun ıstakası (ıstaka düzleminde, piksel biriminde kurulur, ölçekle dünyaya taşınır) ───
  buildRack(L) {
    if (L.rack.rows === 2 && this.rackModel) {
      try {
        this._buildGlbRack(L);
        return;
      } catch (e) {
        console.warn('GLB ıstaka kurulamadı', e);
      }
    }
    this._buildProceduralRack(L);
    if (!this.rackModel && !this._modelTried) {
      this._modelTried = true;
      loadRackModel().then((m) => {
        if (!m || !this.L) return;
        this.rackModel = m;
        this.buildRack(this.L);
        this.onRackChanged?.();
        this.invalidate();
      });
    }
  }

  _buildGlbRack(L) {
    const g = this.rackGroup;
    for (const c of [...g.children]) g.remove(c);
    const R = L.rack;
    const rr = R.rect;
    const cx = rr.x + rr.w / 2;
    const b0 = R.slotRect(0).y + R.th;
    const b1 = R.slotRect(R.cols).y + R.th;
    const cyMid = (b0 + b1) / 2;
    const mPx = R.pitch / _len; // metre → piksel (iki kademe arası = ıstaka satır aralığı)
    const fx = rr.w / (MODEL.w * mPx);
    const y0 = (MODEL.p1[0] + MODEL.p2[0]) / 2;
    const z0 = (MODEL.p1[1] + MODEL.p2[1]) / 2;
    const model = this.rackModel.clone(true);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material.envMapIntensity = 0.9;
        const an = this.renderer.capabilities.getMaxAnisotropy();
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (o.material[k]) o.material[k].anisotropy = an;
      }
    });
    model.matrixAutoUpdate = false;
    model.matrix.set(
      mPx * fx, 0, 0, 0,
      0, mPx * SL_C, -mPx * SL_S, -mPx * (SL_C * y0 - SL_S * z0),
      0, mPx * SL_S, mPx * SL_C, -mPx * (SL_S * y0 + SL_C * z0),
      0, 0, 0, 1,
    );
    model.matrixWorldNeedsUpdate = true;
    const root = new THREE.Group();
    root.add(model);
    g.add(root);
    const p0 = this._hit(cx, cyMid, this.planeR, new THREE.Vector3());
    const k0 = this._k(cx, cyMid, this.planeR);
    const cam = this.camera.position;
    root.quaternion.copy(this.qRack);
    // ıstakayı görüntüyü değiştirmeden (kamera ışını boyunca kaydırıp ölçekleyerek) tabanı masaya oturana dek yerleştir
    const place = (f) => {
      root.position.copy(cam).addScaledVector(new THREE.Vector3().subVectors(p0, cam), f);
      root.scale.setScalar(k0 * f);
      root.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(model, true).min.y;
    };
    let lo = 0.6;
    let hi = 3;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (place(mid) > 0) lo = mid;
      else hi = mid;
    }
    place((lo + hi) / 2);
    // kademe düzlemi artık modelin gerçek düzlemi: taşlar buna oturur
    this.planeR.setFromNormalAndCoplanarPoint(this.rackN, root.position);
    this.rackK = root.scale.x;
    this.invalidate();
  }

  _buildProceduralRack(L) {
    const g = this.rackGroup;
    for (const c of [...g.children]) {
      g.remove(c);
      c.traverse?.((o) => o.geometry?.dispose());
    }
    const R = L.rack;
    const rr = R.rect;
    const tw = R.tw;
    const cx = rr.x + rr.w / 2;
    const cy = rr.y + rr.h / 2;
    const k = this._k(cx, cy, this.planeR);
    const origin = this._hit(cx, cy, this.planeR, new THREE.Vector3());
    const root = new THREE.Group();
    root.position.copy(origin);
    root.quaternion.copy(this.qRack);
    root.scale.setScalar(k);
    g.add(root);
    this.rackK = k;
    // yerel koordinat: x sağ, y yukarı (ekran y'nin tersi), z kameraya doğru; birim = piksel
    const loc = (sx, sy) => [sx - cx, -(sy - cy)];
    const bodyD = tw * 0.55;
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(rr.w, rr.h, Math.min(16, tw * 0.3)), { depth: bodyD, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 4 }),
      this._wood(0xb07a4a, 0.55, 1 / 640, 1 / 160),
    );
    body.position.z = -bodyD - 4;
    body.castShadow = body.receiveShadow = true;
    root.add(body);
    for (let r = 0; r < R.rows; r++) {
      const s = R.slotRect(r * R.cols);
      const gw = rr.w - 16;
      const gh = R.th + tw * 0.14;
      const [, gy] = loc(0, s.y + R.th / 2 - tw * 0.06);
      const groove = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), this._wood(0x6a3c1c, 0.85, gw / 640, gh / 160));
      groove.position.set(0, gy, 0.4);
      groove.receiveShadow = true;
      root.add(groove);
      const lipH = Math.max(8, tw * 0.3);
      const lipTop = s.y + R.th - tw * 0.05;
      const [, ly] = loc(0, lipTop + lipH / 2);
      const lipD = this.D + 6;
      const lip = new THREE.Mesh(
        new THREE.ExtrudeGeometry(roundedShape(rr.w - 6, lipH, lipH * 0.45), { depth: lipD, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.5, bevelSegments: 5 }),
        this._wood(0xc58e5a, 0.42, 1 / 640, 1 / 160),
      );
      lip.position.set(0, ly, 0);
      lip.castShadow = lip.receiveShadow = true;
      root.add(lip);
    }
    this.invalidate();
  }

  // ─── rakip ıstakaları: masada duran ahşap ıstaka, taşların sırtı oyuncuya dönük ───
  setOpponent(seat, rect, count, vertical) {
    if (!this.L) return;
    const key = `${rect.x},${rect.y},${rect.w},${rect.h},${count},${vertical},${this.W}`;
    const old = this.opp.get(seat);
    if (old && old.key === key) return;
    if (old) this.scene.remove(old.group);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const k = this._k(cx, cy, this.planeT);
    const p = this._hit(cx, cy, this.planeT, new THREE.Vector3());
    const group = new THREE.Group();
    group.position.copy(p);
    group.scale.setScalar(k);
    // yerel: x boyunca uzun kenar; ıstaka masada dik durur (y yukarı)
    const long = vertical ? rect.h : rect.w;
    const thick = Math.min(vertical ? rect.w : rect.h, 14);
    const H = thick * 1.6;
    const wood = this._wood(0xa06b3e, 0.6, 1 / 640, 1 / 160);
    const base = new THREE.Mesh(new THREE.BoxGeometry(long, H * 0.55, thick), wood);
    base.position.y = H * 0.275;
    base.castShadow = base.receiveShadow = true;
    group.add(base);
    const n = Math.max(0, count);
    if (n) {
      const pitch = (long - 6) / n;
      const tw = Math.min(pitch * 0.94, H * 0.95);
      const geo = new THREE.BoxGeometry(tw, tw * 1.36, thick * 0.55);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, this.backMatBody);
        m.position.set(-long / 2 + 3 + pitch * (i + 0.5), H * 0.55 + tw * 0.55, -thick * 0.1);
        m.rotation.x = -10 * DEG;
        m.castShadow = true;
        group.add(m);
      }
    }
    // yönelim: üstteki rakip bize dönük (sırtlar görünür), yanlar masanın ortasına dönük
    if (vertical) group.rotation.y = seat === 3 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(group);
    this.opp.set(seat, { key, group });
    this.invalidate();
  }

  // ─── taşlar ───
  _applyGeo(m) {
    m.body.geometry = this.tileGeo;
    m.face.geometry = this.faceGeo;
    m.back.geometry = this.faceGeo;
    m.face.position.z = this.faceZ;
    m.back.position.z = -this.faceZ;
  }

  _make(el) {
    const group = new THREE.Group();
    const inner = new THREE.Group();
    group.add(inner);
    const body = new THREE.Mesh(this.tileGeo, this.bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    const face = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, alphaTest: 0.5 }));
    const back = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTexture({ kind: 'back' }), transparent: true, roughness: 0.36, clearcoat: 0.6, alphaTest: 0.5 }));
    back.rotation.y = Math.PI;
    face.receiveShadow = true;
    inner.add(body, face, back);
    this.scene.add(group);
    const m = { group, inner, body, face, back, el, key: '' };
    this._applyGeo(m);
    return m;
  }

  _syncFace(m) {
    const d = descFromEl(m.el);
    const key = `${d.kind}|${d.color}|${d.value}|${d.rep}`;
    if (key !== m.key) {
      m.key = key;
      m.face.material.map = faceTexture(d);
      m.face.material.needsUpdate = true;
    }
    const cl = m.el.classList;
    const em = m.face.material.emissive;
    if (cl.contains('is-invalid')) em.setRGB(0.5, 0.06, 0.03);
    else if (cl.contains('is-hint')) em.setRGB(0.22, 0.16, 0.02);
    else if (cl.contains('is-new')) em.setRGB(0.14, 0.1, 0.03);
    else em.setRGB(0, 0, 0);
    m.face.material.color.setScalar(cl.contains('is-dim') ? 0.6 : 1);
  }

  // Ekrandaki (x, y) → dünya konumu/yönelimi/ölçeği. rackT: 0 masa, 1 ıstaka.
  _place(group, x, y, h, rot, sc, flip, z, rackT) {
    const pT = this._hit(x, y, this.planeT, this._v[0]);
    const kT = this._k(x, y, this.planeT);
    let p = pT;
    let k = kT;
    const q = this._q;
    if (rackT > 0) {
      const pR = this._hit(x, y, this.planeR, this._v[1]);
      const kR = this._k(x, y, this.planeR);
      p = rackT >= 1 ? pR : pT.clone().lerp(pR, rackT);
      k = kT + (kR - kT) * rackT;
      q.copy(this.qTable).slerp(this.qRack, smooth(rackT));
    } else q.copy(this.qTable);
    // normal yönünde kalınlık + kaldırma
    const n = this._v[2].set(0, 0, 1).applyQuaternion(q);
    group.position.copy(p).addScaledVector(n, (this.D / 2 + 1.5 + (z || 0) * 0.03 + h * 1.25) * k);
    this._q2.setFromAxisAngle(this._v[3].set(0, 0, 1), -rot * DEG);
    group.quaternion.copy(q).multiply(this._q2);
    group.scale.setScalar(k * sc * (1 + h * 0.003));
    return flip;
  }

  _rackT(x, y) {
    const r = this.L.rack.rect;
    const band = this.L.rack.th * 0.9;
    const dy = y - r.y; // ıstakanın üst kenarından aşağı
    const t = clamp((dy + band * 0.5) / band, 0, 1);
    const inX = x > r.x - this.L.rack.tw && x < r.x + r.w + this.L.rack.tw ? 1 : clamp(1 - (Math.min(Math.abs(x - r.x), Math.abs(x - r.x - r.w)) - this.L.rack.tw) / 60, 0, 1);
    return t * inX;
  }

  update(s) {
    if (!s.el.isConnected) {
      if (this.meshes.has(s.id)) this.remove(s.id);
      return;
    }
    let m = this.meshes.get(s.id);
    if (!m) {
      m = this._make(s.el);
      this.meshes.set(s.id, m);
    }
    m.el = s.el;
    const flip = this._place(m.group, s.x, s.y, s.h, s.rot, s.sc, s.flip, s.z, this._rackT(s.x, s.y));
    m.inner.rotation.set(0.05 * this._rackT(s.x, s.y), flip * DEG, 0);
    this.invalidate();
  }

  remove(id) {
    const m = this.meshes.get(id);
    if (!m) return;
    this.scene.remove(m.group);
    m.face.material.dispose();
    m.back.material.dispose();
    this.meshes.delete(id);
    this.invalidate();
  }

  clearSprites() {
    for (const id of [...this.meshes.keys()]) this.remove(id);
  }

  deco(el, { x, y, sc = 1, flip = 0, rot = 0, z = 0 }) {
    let m = this.decos.get(el);
    if (!m) {
      m = this._make(el);
      this.decos.set(el, m);
    }
    this._syncFace(m);
    this._place(m.group, x, y, z > 100 ? 10 : 0, rot, sc, flip, z % 100, this._rackT(x, y));
    m.inner.rotation.set(0, flip * DEG, 0);
    this.invalidate();
  }

  syncDecos() {
    for (const [el, m] of this.decos) {
      if (!el.isConnected) {
        this.scene.remove(m.group);
        m.face.material.dispose();
        m.back.material.dispose();
        this.decos.delete(el);
        continue;
      }
      m.group.visible = el.style.display !== 'none' && el.style.opacity !== '0';
    }
    this.invalidate();
  }

  observe(...roots) {
    this._mo = new MutationObserver(() => this.invalidate());
    for (const r of roots) this._mo.observe(r, { subtree: true, attributes: true, attributeFilter: ['class', 'data-t', 'data-rep', 'style'] });
  }

  invalidate() {
    this.dirty = true;
    if (!this._raf) this._raf = requestAnimationFrame(this._loop);
  }

  _loop() {
    this._raf = 0;
    if (!this.dirty) return;
    this.dirty = false;
    for (const m of this.meshes.values()) {
      this._syncFace(m);
      m.group.visible = m.el.style.display !== 'none';
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._mo?.disconnect();
    this.clearSprites();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
