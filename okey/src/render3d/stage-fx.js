// Sahne efektleri: masaya düşen halkalar, ışık parlaması, dikdörtgen vurgu, sinematik ışık.
// Stage3D.prototype'a eklenir (stage.js). Hepsi masa düzleminde, ekran pikselleriyle konumlanır.
import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const toRgb = (c) => {
  if (c[0] !== '#') return c;
  const n = parseInt(c.length === 4 ? c.slice(1).replace(/./g, '$&$&') : c.slice(1), 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
};

export const fxMethods = {
  // (x,y) ekran noktası merkezli, yarım genişlik hw / yarım yükseklik hh olan, merkezden ölçülü masa dörtgeni
  _decalAt(x, y, hw, hh, lift) {
    const c = this._hit(x, y, this.planeT, new THREE.Vector3());
    const p = (sx, sy) => this._hit(sx, sy, this.planeT, new THREE.Vector3()).sub(c);
    const a = p(x - hw, y - hh);
    const b = p(x + hw, y - hh);
    const d = p(x + hw, y + hh);
    const e = p(x - hw, y + hh);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, 0, a.z, b.x, 0, b.z, d.x, 0, d.z, e.x, 0, e.z], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    return { geo: g, pos: new THREE.Vector3(c.x, lift, c.z) };
  },

  _ringTexture(color) {
    this._ringTex = this._ringTex || {};
    if (this._ringTex[color]) return this._ringTex[color];
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.62, color.replace(')', ',0.0)').replace('rgb', 'rgba'));
    gr.addColorStop(0.82, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.9, color.replace(')', ',0.55)').replace('rgb', 'rgba'));
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    // renk: beyaz halkayı renkle çarp
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.globalAlpha = 0.78;
    g.fillRect(0, 0, S, S);
    return (this._ringTex[color] = this._tex(c));
  },

  _rectRingTexture(w, h, color) {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = Math.max(48, Math.round(w * S));
    c.height = Math.max(48, Math.round(h * S));
    const g = c.getContext('2d');
    const r = Math.min(c.width, c.height) * 0.14;
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.16;
      g.strokeStyle = color;
      g.lineWidth = 4 + i * 5;
      g.beginPath();
      g.roundRect(14, 14, c.width - 28, c.height - 28, r);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = '#fff';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(14, 14, c.width - 28, c.height - 28, r);
    g.stroke();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.globalAlpha = 0.7;
    g.fillRect(0, 0, c.width, c.height);
    return this._tex(c);
  },

  _addPulse(mesh, o) {
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    (this.pulses = this.pulses || []).push({ mesh, t0: performance.now() + (o.delay || 0), dur: o.dur || 700, s0: o.s0 ?? 0.55, s1: o.s1 ?? 1.7, a: o.a ?? 0.95, own: o.own });
    this.invalidate();
  },

  // Halka: noktadan dışa yayılan ışık halkası (taş düşüşü, sıra bildirimi, okey)
  ping(x, y, { r = 56, color = 'rgb(255,214,130)', dur = 720, s0 = 0.5, s1 = 1.6, a = 0.95, delay = 0, glow = false } = {}) {
    if (!this.L || this.qLevel >= 3) return;
    const lift = 0.6 * this._k(x, y, this.planeT);
    const { geo, pos } = this._decalAt(x, y, r, r, lift);
    const map = glow ? this._glowTexture() : this._ringTexture(toRgb(color));
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this._addPulse(mesh, { dur, s0, s1, a, delay });
  },

  // Dikdörtgen vurgu: bölge/ıstaka çerçevesi parlayıp yayılarak söner
  flashRect(rect, { color = 'rgb(255,214,130)', dur = 800, grow = 0.07, a = 0.95, delay = 0 } = {}) {
    if (!this.L) return;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const lift = 0.6 * this._k(cx, cy, this.planeT);
    const { geo, pos } = this._decalAt(cx, cy, rect.w / 2, rect.h / 2, lift);
    const mat = new THREE.MeshBasicMaterial({ map: this._rectRingTexture(rect.w, rect.h, toRgb(color)), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this._addPulse(mesh, { dur, s0: 0.97, s1: 1 + grow, a, delay, own: true });
  },

  // Kadife vitrin tepsisi (el sonu): koyu zemin, pirinç kenar; yumuşakça belirir
  setTray(rect) {
    if (this.tray) {
      this.scene.remove(this.tray);
      this.tray.geometry.dispose();
      this.tray.material.map?.dispose();
      this.tray.material.dispose();
      this.tray = null;
    }
    if (!rect || !this.L) return this.invalidate();
    const S = 2;
    const c = document.createElement('canvas');
    c.width = Math.max(64, Math.round(rect.w * S));
    c.height = Math.max(64, Math.round(rect.h * S));
    const g = c.getContext('2d');
    const r = 18 * S;
    g.beginPath();
    g.roundRect(6, 6, c.width - 12, c.height - 12, r);
    const grd = g.createRadialGradient(c.width / 2, c.height * 0.3, 10, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.7);
    grd.addColorStop(0, 'rgba(34,10,14,0.92)');
    grd.addColorStop(1, 'rgba(12,4,6,0.94)');
    g.fillStyle = grd;
    g.fill();
    g.lineWidth = 3.5 * S;
    g.strokeStyle = 'rgba(214,170,90,0.9)';
    g.stroke();
    g.beginPath();
    g.roundRect(6 + 6 * S, 6 + 6 * S, c.width - 12 - 12 * S, c.height - 12 - 12 * S, r * 0.7);
    g.lineWidth = 1 * S;
    g.strokeStyle = 'rgba(255,220,150,0.35)';
    g.stroke();
    const tex = this._tex(c);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const lift = 0.45 * this._k(cx, cy, this.planeT);
    const { geo, pos } = this._decalAt(cx, cy, rect.w / 2, rect.h / 2, lift);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.position.copy(pos);
    m.renderOrder = 1;
    this.scene.add(m);
    this.tray = m;
    this._trayT0 = performance.now();
    this.invalidate();
  },

  // ─── Jiroskop kamera: telefon eğildikçe görüş kamerası masanın merkezi çevresinde hafifçe döner (gerçek paralaks:
  // ıstaka ve taşların hacmi, yan ıstakalar, gölgeler kayar) ve lamba eğime karşı süzülür (parıltılar yer değiştirir).
  // Yerleşim/isabet hesabı sabit "yerleşim kamerası"yla yapılır; yalnız çizim "görüş kamerası"yla → dokunma bozulmaz.
  setGyro(on) {
    if (!!this._gyroOn === !!on) return;
    this._gyroOn = !!on;
    if (on) {
      this.gyro = this.gyro || { x: 0, y: 0, tx: 0, ty: 0, bx: null, by: null };
      this._onOri = (e) => {
        if (e.gamma == null || e.beta == null) return;
        const g = this.gyro;
        // yatay tutuşta eksenler yer değiştirir
        const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
        let gx = e.gamma;
        let gy = e.beta;
        if (ang === 90) [gx, gy] = [e.beta, -e.gamma];
        else if (ang === -90 || ang === 270) [gx, gy] = [-e.beta, e.gamma];
        if (g.bx === null) {
          g.bx = gx;
          g.by = gy;
        }
        // taban yavaşça güncel duruşa kayar: kullanıcı telefonu nasıl tutarsa tutsun ortalanır
        g.bx += (gx - g.bx) * 0.004;
        g.by += (gy - g.by) * 0.004;
        g.tx = Math.max(-1, Math.min(1, (gx - g.bx) / 18));
        g.ty = Math.max(-1, Math.min(1, (gy - g.by) / 18));
        this.invalidate();
      };
      window.addEventListener('deviceorientation', this._onOri);
    } else {
      window.removeEventListener('deviceorientation', this._onOri);
      if (this.gyro) {
        this.gyro.tx = 0;
        this.gyro.ty = 0;
      }
      this.invalidate();
    }
  },

  // görüş kamerası: yerleşim kamerasının kopyası + jiroskop sapması. Değişim yoksa false döner.
  _gyroFrame() {
    const g = this.gyro;
    if (!g) return false;
    const hold = this.isHeld?.() ? 0 : 1; // taş sürüklenirken sahne sabitlenir
    const tx = g.tx * hold;
    const ty = g.ty * hold;
    const px = g.x;
    const py = g.y;
    g.x += (tx - g.x) * 0.09;
    g.y += (ty - g.y) * 0.09;
    if (Math.abs(g.x) < 0.0005 && Math.abs(g.y) < 0.0005 && tx === 0 && ty === 0) {
      g.x = g.y = 0;
      this._viewActive = false;
      if (this._lampBase) {
        this.lamp.position.copy(this._lampBase);
        this.shadowDirty = true;
      }
      return Math.abs(px) + Math.abs(py) > 0;
    }
    const vc = (this.viewCam = this.viewCam || this.camera.clone());
    vc.fov = this.camera.fov;
    vc.aspect = this.camera.aspect;
    vc.near = this.camera.near;
    vc.far = this.camera.far;
    vc.updateProjectionMatrix();
    const base = this.camera.position;
    const yaw = g.x * 2.2 * (Math.PI / 180);
    const pitch = -g.y * 1.6 * (Math.PI / 180);
    const r = base.length();
    const el = Math.asin(base.y / r) + pitch;
    const az = Math.atan2(base.x, base.z) + yaw;
    vc.position.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    vc.lookAt(0, 0, 0);
    vc.updateMatrixWorld();
    // lamba eğime karşı süzülür (gölgeler ve parıltılar kayar)
    if (this._lampBase === undefined && this.lamp) this._lampBase = this.lamp.position.clone();
    if (this._lampBase) {
      this.lamp.position.set(this._lampBase.x - g.x * this.dist * 0.18, this._lampBase.y, this._lampBase.z + g.y * this.dist * 0.14);
      this.shadowDirty = true;
    }
    this._viewActive = true;
    return Math.abs(g.x - px) + Math.abs(g.y - py) > 0.0004;
  },

  // Lamba konisinde süzülen ince toz zerreleri (yalnız yüksek kalitede; göz yormayan, çok yavaş)
  buildDust(L) {
    if (this.dustPts) {
      this.scene.remove(this.dustPts);
      this.dustPts.geometry.dispose();
      this.dustPts.material.dispose();
      this.dustPts = null;
    }
    if (this.qLevel > 0 || !L) return;
    const d = this.dist;
    const N = 70;
    const pos = new Float32Array(N * 3);
    this.dust = [];
    const c = this._hit(L.table.x + L.table.w / 2, L.table.y + L.table.h * 0.5, this.planeT, new THREE.Vector3());
    for (let i = 0; i < N; i++) {
      const p = { x: c.x + (Math.random() - 0.5) * d * 0.9, y: Math.random() * d * 0.5, z: c.z + (Math.random() - 0.5) * d * 0.6, s: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 };
      this.dust.push(p);
      pos.set([p.x, p.y, p.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,245,220,1)');
    gr.addColorStop(0.4, 'rgba(255,230,180,0.35)');
    gr.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    this.dustPts = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(cv), size: d * 0.0045, sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6b8 }));
    this.dustPts.renderOrder = 9;
    this.scene.add(this.dustPts);
  },

  _dustFrame(now) {
    if (!this.dustPts) return;
    const t = now / 1000;
    const a = this.dustPts.geometry.attributes.position;
    const d = this.dist;
    const dt = Math.min(0.05, (now - (this._dustT || now)) / 1000);
    this._dustT = now;
    for (let i = 0; i < this.dust.length; i++) {
      const p = this.dust[i];
      p.y += dt * d * 0.006 * p.s;
      if (p.y > d * 0.5) p.y = 0;
      a.setXYZ(i, p.x + Math.sin(t * 0.25 * p.s + p.ph) * d * 0.02, p.y, p.z + Math.cos(t * 0.2 * p.s + p.ph) * d * 0.02);
    }
    a.needsUpdate = true;
  },

  // Orta grup tepsisi (deste · gösterge · okey): çuhaya hafif gömülmüş koyu yuva, ince ışık kenarı
  setClusterTray(rect) {
    const key = rect ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)},${Math.round(rect.h)},${this.W},${this.H}` : '';
    if (key === this._clusterKey) return;
    this._clusterKey = key;
    if (this.clusterTray) {
      this.scene.remove(this.clusterTray);
      this.clusterTray.geometry.dispose();
      this.clusterTray.material.map?.dispose();
      this.clusterTray.material.dispose();
      this.clusterTray = null;
    }
    if (!rect || !this.L) return this.invalidate();
    const S = 3;
    const c = document.createElement('canvas');
    c.width = Math.max(64, Math.round(rect.w * S));
    c.height = Math.max(64, Math.round(rect.h * S));
    const g = c.getContext('2d');
    const r = Math.min(14 * S, c.height * 0.2);
    const path = (inset) => {
      g.beginPath();
      g.roundRect(inset, inset, c.width - inset * 2, c.height - inset * 2, Math.max(2, r - inset));
    };
    // çuhaya oyulmuş yuva: yarı saydam koyu zemin (çuha dokusu hafifçe seçilir), üstte derin iç gölge,
    // yanlarda kenar gölgesi, ortada sıcak lamba yansıması, altta etiket bandı ve altın kakma kenar
    path(2);
    const bg = g.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, 'rgba(3,16,11,0.64)');
    bg.addColorStop(0.55, 'rgba(5,22,16,0.52)');
    bg.addColorStop(1, 'rgba(8,30,22,0.48)');
    g.fillStyle = bg;
    g.fill();
    g.save();
    path(2);
    g.clip();
    const sh = g.createLinearGradient(0, 0, 0, 18 * S);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, c.width, 18 * S);
    for (const [x0, x1] of [
      [0, 10 * S],
      [c.width, c.width - 10 * S],
    ]) {
      const side = g.createLinearGradient(x0, 0, x1, 0);
      side.addColorStop(0, 'rgba(0,0,0,0.3)');
      side.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = side;
      g.fillRect(Math.min(x0, x1), 0, 10 * S, c.height);
    }
    const glow = g.createRadialGradient(c.width / 2, c.height * 0.45, 0, c.width / 2, c.height * 0.45, c.width * 0.6);
    glow.addColorStop(0, 'rgba(255,236,190,0.07)');
    glow.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, c.width, c.height);
    const band = g.createLinearGradient(0, c.height - 22 * S, 0, c.height);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = band;
    g.fillRect(0, c.height - 22 * S, c.width, 22 * S);
    // deste ile gösterge arasında altın ayraç (yanında ince gölge)
    if (rect.div) {
      const dx = Math.round(rect.div * S);
      const dg = g.createLinearGradient(0, c.height * 0.12, 0, c.height * 0.88);
      dg.addColorStop(0, 'rgba(216,180,106,0)');
      dg.addColorStop(0.5, 'rgba(216,180,106,0.5)');
      dg.addColorStop(1, 'rgba(216,180,106,0)');
      g.fillStyle = dg;
      g.fillRect(dx - S * 0.5, c.height * 0.12, S, c.height * 0.76);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(dx + S * 0.5, c.height * 0.12, S, c.height * 0.76);
    }
    // etiket bandının üst çizgisi
    g.lineWidth = 1 * S;
    g.strokeStyle = 'rgba(255,240,205,0.11)';
    g.beginPath();
    g.moveTo(r, c.height - 3 * S);
    g.lineTo(c.width - r, c.height - 3 * S);
    g.stroke();
    g.restore();
    // koyu dış kenar + içte altın kakma çizgisi
    g.lineWidth = 1.2 * S;
    path(1.6);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.stroke();
    g.lineWidth = 0.9 * S;
    path(5 * S);
    g.strokeStyle = 'rgba(216,180,106,0.55)';
    g.stroke();
    const tex = this._tex(c);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const lift = 0.15 * this._k(cx, cy, this.planeT);
    const quad = this._decalQuad(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h, lift);
    const m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.renderOrder = 1;
    this.scene.add(m);
    this.clusterTray = m;
    this.invalidate();
  },

  // Sinematik ışık: 0..1 (bitiş anında lamba güçlenir, ortam kararır)
  cine(v) {
    this._cineT = v;
    this.invalidate();
  },

  // Anlık parlama: lamba bir an güçlenir (okey açılışı, ceza, bitiş)
  lampFlash(kind = 'warm', amt = 0.7, dur = 520) {
    this._lampFx = { t0: performance.now(), dur, amt, kind };
    this.invalidate();
  },

  _fxFrame(now) {
    let busy = false;
    const ps = this.pulses;
    if (ps && ps.length) {
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        const u = (now - p.t0) / p.dur;
        if (u < 0) {
          p.mesh.visible = false;
          busy = true;
          continue;
        }
        if (u >= 1) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          if (p.own) p.mesh.material.map?.dispose();
          ps.splice(i, 1);
          continue;
        }
        p.mesh.visible = true;
        const e = easeOut(u);
        p.mesh.scale.setScalar(lerp(p.s0, p.s1, e));
        p.mesh.material.opacity = p.a * Math.pow(1 - u, 1.6) * Math.min(1, u * 10);
        busy = true;
      }
    }
    if (this.tray && this.tray.material.opacity < 1) {
      this.tray.material.opacity = Math.min(1, (now - this._trayT0) / 380);
      busy = true;
    }
    // sinematik / lamba
    const baseLamp = this._baseLamp ?? (this._baseLamp = this.lamp.intensity);
    const baseFill = this._baseFill ?? (this._baseFill = this.fill.intensity);
    const cur = this._cine || 0;
    const tgt = this._cineT || 0;
    this._cine = cur + (tgt - cur) * 0.08;
    if (Math.abs(tgt - this._cine) < 0.002) this._cine = tgt;
    let flash = 0;
    let tint = null;
    if (this._lampFx) {
      const u = (now - this._lampFx.t0) / this._lampFx.dur;
      if (u >= 1) this._lampFx = null;
      else {
        flash = this._lampFx.amt * Math.sin(Math.min(1, u * 1.1) * Math.PI) ** 0.8;
        tint = this._lampFx.kind;
      }
    }
    this.lamp.intensity = baseLamp * (1 + 0.45 * this._cine + flash);
    this.fill.intensity = baseFill * (1 - 0.5 * this._cine);
    this.lamp.color.setHex(tint === 'red' ? 0xff8a78 : tint === 'gold' ? 0xffd58a : 0xffe4bd);
    if (flash > 0 || this._cine !== tgt) busy = true;
    return busy;
  },
};
