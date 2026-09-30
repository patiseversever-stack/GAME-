// 3B sahne (Three.js / WebGL) — taşların ve oyuncunun ıstakasının fiziksel çizimi.
// Oyun durumu ve hareket fiziği değişmez: SpriteSystem her sprite için (x, y, h, rot, sc, flip, z) üretir;
// bu sınıf onları ekran pikseline birebir hizalı ortografik kamerayla gerçek ışık/gölge alan 3B nesnelere dönüştürür.
// Dünya koordinatı: x = ekran x, y = -ekran y, z = masadan yükseklik (piksel). DOM katmanları (HUD, koltuklar,
// çöplük çerçeveleri) canvas'ın altında/üstünde kalır; isabet testi geometrik olduğundan etkilenmez.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { faceTexture, descFromEl } from './tile-face.js';
import { woodCanvas } from '../ui/wood.js';

const DEG = Math.PI / 180;

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

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export class Stage3D {
  constructor(host, { quality = 'high' } = {}) {
    this.host = host;
    this.quality = quality;
    const canvas = document.createElement('canvas');
    canvas.className = 'gl-stage';
    host.appendChild(canvas);
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;
    this.camera = new THREE.OrthographicCamera(0, 100, 0, -100, -3000, 3000);
    this.camera.position.set(0, 0, 1500);
    // ışık: sol üstten, önden gelen sıcak lamba + yumuşak dolgu
    this.key = new THREE.DirectionalLight(0xfff1d8, 2.1);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.6;
    this.key.shadow.radius = 5;
    this.scene.add(this.key, this.key.target);
    this.fill = new THREE.HemisphereLight(0xfff6e6, 0x1c3a32, 0.4);
    this.scene.add(this.fill);
    // gölge alan görünmez masa düzlemi
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.55 }));
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.rackGroup = new THREE.Group();
    this.scene.add(this.rackGroup);
    this.meshes = new Map(); // sprite id → { group, face, back, el }
    this.decos = new Map(); // DOM öğesi → mesh
    this.dirty = true;
    this.tw = 40;
    this.th = 54;
    this._raf = 0;
    this._loop = this._loop.bind(this);
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf1e8d2, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35, sheen: 0.2 });
    this.bodyBackMat = new THREE.MeshPhysicalMaterial({ color: 0x2c5248, roughness: 0.4, clearcoat: 0.5 });
  }

  // ─── ölçek / yerleşim ───
  resize(L, dpr) {
    const W = L.w;
    const H = L.h;
    this.L = L;
    const q = this.quality === 'low' ? 1 : Math.min(dpr || 1, 2);
    this.renderer.setPixelRatio(q);
    this.renderer.setSize(W, H, false);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    const c = this.camera;
    c.left = 0;
    c.right = W;
    c.top = 0;
    c.bottom = -H;
    c.updateProjectionMatrix();
    this.ground.scale.set(W * 2, H * 2, 1);
    this.ground.position.set(W / 2, -H / 2, 0);
    // ışık kamerası tüm masayı kapsar
    const k = this.key;
    k.position.set(W * 0.5 - H * 0.55, -H * 0.55 + H * 0.75, 900);
    k.target.position.set(W * 0.5, -H * 0.55, 0);
    const sc = k.shadow.camera;
    const ext = Math.max(W, H) * 0.9;
    sc.left = -ext;
    sc.right = ext;
    sc.top = ext;
    sc.bottom = -ext;
    sc.near = 100;
    sc.far = 4000;
    sc.updateProjectionMatrix();
    this.setTileSize(L.rack.tw, L.rack.th);
    this.buildRack(L);
    this.invalidate();
  }

  setTileSize(tw, th) {
    if (this.tileGeo && tw === this.tw && th === this.th) return;
    this.tw = tw;
    this.th = th;
    const bs = tw * 0.045; // kenar yuvarlama
    const bt = tw * 0.05;
    const D = tw * 0.26; // taş kalınlığı
    this.D = D + 2 * bt;
    const shape = roundedShape(tw - 2 * bs, th - 2 * bs, tw * 0.13);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 8 });
    geo.translate(0, 0, -D / 2);
    this.tileGeo?.dispose();
    this.tileGeo = geo;
    this.faceGeo?.dispose();
    this.faceGeo = new THREE.PlaneGeometry(tw - bs * 0.6, th - bs * 0.6);
    this.faceZ = D / 2 + bt + 0.15;
    for (const m of this.meshes.values()) this._applyGeo(m);
    for (const m of this.decos.values()) this._applyGeo(m);
  }

  // ─── oyuncunun ıstakası: ahşap gövde, oyuk basamaklar, taşların önünü örten çıtalar ───
  buildRack(L) {
    const g = this.rackGroup;
    for (const c of [...g.children]) {
      g.remove(c);
      c.geometry?.dispose();
    }
    const R = L.rack;
    const rr = R.rect;
    const tw = R.tw;
    if (!this.woodTex) {
      const wc = woodCanvas();
      if (wc) {
        this.woodTex = new THREE.CanvasTexture(wc);
        this.woodTex.colorSpace = THREE.SRGBColorSpace;
        this.woodTex.wrapS = this.woodTex.wrapT = THREE.MirroredRepeatWrapping;
      }
    }
    const wood = (color, rough = 0.55) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
      if (this.woodTex) {
        m.map = this.woodTex.clone();
        m.map.needsUpdate = true;
        m.map.repeat.set(1 / 640, 1 / 160);
      }
      return m;
    };
    this.rackZ = tw * 0.1; // ıstaka üst yüzü
    // gövde
    const bodyShape = roundedShape(rr.w, rr.h, Math.min(14, tw * 0.3));
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: this.rackZ, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 3 }), wood(0xa87447, 0.6));
    body.position.set(rr.x + rr.w / 2, -(rr.y + rr.h / 2), -3);
    body.receiveShadow = true;
    body.castShadow = true;
    g.add(body);
    // basamak oyukları (koyu, hafif çukur)
    for (let r = 0; r < R.rows; r++) {
      const s = R.slotRect(r * R.cols);
      const gw = rr.w - 14;
      const gh = R.th + tw * 0.1;
      const gm = wood(0x6b3f1f, 0.8);
      if (gm.map) gm.map.repeat.set(gw / 640, gh / 160);
      const groove = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), gm);
      groove.position.set(rr.x + rr.w / 2, -(s.y + R.th / 2 - tw * 0.05), this.rackZ + 0.5);
      groove.receiveShadow = true;
      g.add(groove);
      // ön çıta: yuvarlatılmış çubuk, taşların alt kenarının önünde
      const lipH = Math.max(7, tw * 0.28);
      const lipTop = s.y + R.th - tw * 0.05;
      const front = this.rackZ + this.D + 4;
      const lipShape = roundedShape(rr.w - 6, lipH, lipH * 0.45);
      const lip = new THREE.Mesh(new THREE.ExtrudeGeometry(lipShape, { depth: front - this.rackZ - 3, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 4 }), wood(0xc18b58, 0.45));
      lip.position.set(rr.x + rr.w / 2, -(lipTop + lipH / 2), this.rackZ);
      lip.castShadow = true;
      lip.receiveShadow = true;
      g.add(lip);
    }
  }

  // ─── rakip ıstakaları: ahşap çıta üzerinde ters duran taşlar (sayı = taş sayısı) ───
  setOpponent(seat, rect, count, vertical) {
    this.opp = this.opp || new Map();
    const key = `${rect.x},${rect.y},${rect.w},${rect.h},${count},${vertical}`;
    const old = this.opp.get(seat);
    if (old && old.key === key) return;
    if (old) this.scene.remove(old.group);
    const group = new THREE.Group();
    if (!this.oppWood) {
      this.oppWood = new THREE.MeshStandardMaterial({ color: 0xa87447, roughness: 0.6, map: this.woodTex || null });
      this.oppBack = new THREE.MeshPhysicalMaterial({ color: 0x2f5a4e, roughness: 0.38, clearcoat: 0.6 });
    }
    const long = vertical ? rect.h : rect.w;
    const short = vertical ? rect.w : rect.h;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(vertical ? short : long, vertical ? long : short, 6), this.oppWood);
    bar.position.set(rect.x + rect.w / 2, -(rect.y + rect.h / 2), 3);
    bar.castShadow = bar.receiveShadow = true;
    group.add(bar);
    const n = Math.max(0, count);
    if (n) {
      const pitch = (long - 6) / n;
      const tLong = Math.min(pitch * 0.92, short * 0.75);
      const tShort = short * 0.72;
      const geo = new THREE.BoxGeometry(vertical ? tShort : tLong, vertical ? tLong : tShort, 5);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, this.oppBack);
        const off = 3 + pitch * (i + 0.5);
        if (vertical) m.position.set(rect.x + rect.w / 2, -(rect.y + off), 9);
        else m.position.set(rect.x + off, -(rect.y + rect.h / 2), 9);
        m.castShadow = true;
        group.add(m);
      }
    }
    this.scene.add(group);
    this.opp.set(seat, { key, group });
    this.invalidate();
  }

  // ─── sprite eşlemesi ───
  _applyGeo(m) {
    m.body.geometry = this.tileGeo;
    m.face.geometry = this.faceGeo;
    m.back.geometry = this.faceGeo;
    m.face.position.z = this.faceZ;
    m.back.position.z = -this.faceZ;
  }

  _make(el) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.tileGeo, this.bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    const faceMat = new THREE.MeshPhysicalMaterial({ map: null, transparent: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3, alphaTest: 0.5 });
    const face = new THREE.Mesh(this.faceGeo, faceMat);
    const back = new THREE.Mesh(this.faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTexture({ kind: 'back' }), transparent: true, roughness: 0.4, clearcoat: 0.5, alphaTest: 0.5 }));
    back.rotation.y = Math.PI;
    face.receiveShadow = true;
    group.add(body, face, back);
    this.scene.add(group);
    const m = { group, body, face, back, el, key: '' };
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
    if (cl.contains('is-invalid')) em.setRGB(0.45, 0.06, 0.03);
    else if (cl.contains('is-hint')) em.setRGB(0.22, 0.16, 0.02);
    else if (cl.contains('is-new')) em.setRGB(0.16, 0.12, 0.04);
    else if (cl.contains('is-selected')) em.setRGB(0.08, 0.07, 0.03);
    else em.setRGB(0, 0, 0);
    const dim = cl.contains('is-dim');
    m.face.material.color.setScalar(dim ? 0.62 : 1);
  }

  // SpriteSystem'in her kare çağırdığı eşleme
  update(s, tw, th) {
    // sistemden çıkarılmış sprite (ör. uçuş sonunda silinen hayalet) yeniden yaratılmasın
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
    this._syncFace(m);
    const zBase = (this.rackZ || 4) + this.D / 2 + 1 + (s.z || 0) * 0.02;
    m.group.position.set(s.x, -s.y, zBase + s.h * 1.4);
    const sc = s.sc * (1 + s.h * 0.0035);
    m.group.scale.setScalar(sc);
    m.group.rotation.set(0.3 + s.h * 0.003, s.flip * DEG, -s.rot * DEG);
    m.group.visible = s.el.style.display !== 'none';
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

  // dekor taşlar (deste yığını, okey göstergesi, sürükleme hayaleti): DOM öğesi + parametre
  deco(el, { x, y, sc = 1, flip = 0, rot = 0, z = 0 }) {
    let m = this.decos.get(el);
    if (!m) {
      m = this._make(el);
      this.decos.set(el, m);
    }
    this._syncFace(m);
    m.group.position.set(x, -y, (this.rackZ || 4) + this.D / 2 + z * 0.3);
    m.group.scale.setScalar(sc);
    m.group.rotation.set(0.3, flip * DEG, -rot * DEG);
    this.invalidate();
  }

  // DOM'dan kaldırılmış dekorları temizle, görünürlükleri eşitle
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

  // DOM sınıf/veri değişikliklerini (seçili, ipucu, geçersiz, yüz) izle
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
