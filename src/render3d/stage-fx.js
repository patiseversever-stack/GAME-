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
