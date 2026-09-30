// SpriteSystem (AnimationController) — 106 taşın kalıcı, fizik tabanlı hareketi.
//
// Her taş kalıcı bir DOM öğesidir (kimlik = taş numarası). Durum değişince yalnızca HEDEF verilir;
// sprite hedefe iki yoldan gider:
//   • spring  : yay (kritik-altı sönümlü) — ıstaka düzenleme, sıralama, sürükleme takibi
//   • flight  : zamanlı yörünge + yükseklik (kavis) + iniş sonrası mikro zıplama — çekme/atma/per açma
// Yükseklik (h) sanal z eksenidir: ölçek ve temas gölgesini sürer, "kaldırılma" hissini verir.
// Hareket yokken rAF çalışmaz (aktif küme boşalınca döngü durur).

import { setFlip } from './tile-dom.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const smooth = (a, b, u) => {
  const t = clamp((u - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Yay sabitleri (m = 1): ζ = c / (2√k)
export const SPRING = {
  settle: { k: 520, c: 34 }, // ζ≈0.75 — ≈%3 aşma
  soft: { k: 360, c: 29 }, // sıralama / yeniden düzen
  snappy: { k: 780, c: 42 },
  drag: { k: 1700, c: 80 },
};
const GRAVITY = 2600; // px/s² (sanal z)
const LIFT_SPRING = { k: 700, c: 34 };

export class Sprite {
  constructor(id, el) {
    this.id = id;
    this.el = el;
    this.x = 0;
    this.y = 0;
    this.rot = 0;
    this.sc = 1;
    this.h = 0;
    this.flip = 0;
    this.vx = this.vy = this.vrot = this.vsc = this.vh = this.vflip = 0;
    this.tx = 0;
    this.ty = 0;
    this.trot = 0;
    this.tsc = 1;
    this.th = 0;
    this.tflip = 0;
    this.k = SPRING.settle.k;
    this.c = SPRING.settle.c;
    this.mode = 'idle'; // idle | spring | flight | drag
    this.fl = null;
    this.startAt = 0;
    this.z = 10;
    this.moving = false;
    this._lastH = -1;
    this._lastFlip = -1;
    this._lastZ = -1;
    this.onLand = null;
    this.placed = false;
  }
}

export class SpriteSystem {
  constructor(layer) {
    this.layer = layer;
    this.sprites = new Map();
    this.active = new Set();
    this.tw = 40;
    this.th = 54;
    this.raf = 0;
    this.last = 0;
    this.reduced = false;
    this.speed = 1; // animasyon hızı çarpanı (1 = normal)
    this.frameTimes = [];
    this.onSlow = null;
    this.paused = false;
    this._tick = this._tick.bind(this);
  }

  setSize(tw, th) {
    this.tw = tw;
    this.th = th;
    for (const s of this.sprites.values()) this._render(s, true);
  }

  add(id, el) {
    let s = this.sprites.get(id);
    if (s) return s;
    s = new Sprite(id, el);
    this.sprites.set(id, s);
    this.layer.appendChild(el);
    return s;
  }

  get(id) {
    return this.sprites.get(id);
  }

  remove(id) {
    const s = this.sprites.get(id);
    if (!s) return;
    this.active.delete(s);
    s.el.remove();
    this.sprites.delete(id);
  }

  clear() {
    for (const s of this.sprites.values()) s.el.remove();
    this.sprites.clear();
    this.active.clear();
  }

  _wake(s) {
    if (!s.moving) {
      s.moving = true;
      s.el.classList.add('is-moving');
    }
    this.active.add(s);
    if (!this.raf && !this.paused) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this._tick);
    }
  }

  // Anında yerleştir (animasyonsuz)
  snap(id, t) {
    const s = this.sprites.get(id);
    if (!s) return null;
    this._setTarget(s, t);
    s.x = s.tx;
    s.y = s.ty;
    s.rot = s.trot;
    s.sc = s.tsc;
    s.h = s.th;
    s.flip = s.tflip;
    s.vx = s.vy = s.vrot = s.vsc = s.vh = s.vflip = 0;
    s.mode = 'idle';
    s.fl = null;
    s.placed = true;
    this.active.delete(s);
    this._sleep(s);
    this._render(s, true);
    return s;
  }

  _setTarget(s, t) {
    if (t.x !== undefined) s.tx = t.x;
    if (t.y !== undefined) s.ty = t.y;
    if (t.rot !== undefined) s.trot = t.rot;
    if (t.sc !== undefined) s.tsc = t.sc;
    if (t.h !== undefined) s.th = t.h;
    if (t.flip !== undefined) s.tflip = t.flip;
    if (t.z !== undefined) s.z = t.z;
  }

  // Yayla hedefe git (mevcut hızı korur → kesintiye uğrayabilir, doğal)
  to(id, t, { spring = SPRING.settle, delay = 0 } = {}) {
    const s = this.sprites.get(id);
    if (!s) return null;
    this._setTarget(s, t);
    if (!s.placed) return this.snap(id, t);
    if (this.reduced) return this._quick(s, delay);
    s.k = spring.k * this.speed * this.speed;
    s.c = spring.c * this.speed;
    if (s.mode !== 'drag') s.mode = 'spring';
    s.fl = null;
    s.startAt = performance.now() + delay;
    this._wake(s);
    return s;
  }

  // Zamanlı uçuş: kavisli yörünge, dönüş, yüz çevirme; inişte mikro zıplama
  fly(id, t, o = {}) {
    const s = this.sprites.get(id);
    if (!s) return null;
    this._setTarget(s, t);
    if (!s.placed) return this.snap(id, t);
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const dist = Math.hypot(dx, dy);
    if (this.reduced) return this._quick(s, o.delay || 0, o.onLand);
    const dur = (o.dur ?? clamp(200 + dist * 0.42, 240, 560)) / this.speed;
    const arc = o.arc ?? clamp(dist * 0.13, 8, 48);
    s.fl = {
      t0: performance.now() + (o.delay || 0),
      dur,
      x0: s.x,
      y0: s.y,
      x1: s.tx,
      y1: s.ty,
      rot0: s.rot,
      rot1: s.trot,
      sc0: s.sc,
      sc1: s.tsc,
      flip0: s.flip,
      flip1: s.tflip,
      arc,
      spin: o.spin ?? clamp(dx * 0.05, -14, 14),
      bounce: o.bounce ?? clamp(dist * 0.02, 2, 6),
      ease: o.ease || 'out',
      h1: s.th,
    };
    s.onLand = o.onLand || null;
    s.mode = 'flight';
    s.startAt = s.fl.t0;
    s.vx = s.vy = s.vrot = s.vsc = 0;
    this._wake(s);
    return s;
  }

  _quick(s, delay = 0, onLand = null) {
    // reduced-motion: kısa, kavissiz, dönüşsüz geçiş
    s.fl = {
      t0: performance.now() + delay,
      dur: 150,
      x0: s.x,
      y0: s.y,
      x1: s.tx,
      y1: s.ty,
      rot0: s.rot,
      rot1: s.trot,
      sc0: s.sc,
      sc1: s.tsc,
      flip0: s.flip,
      flip1: s.tflip,
      arc: 0,
      spin: 0,
      bounce: 0,
      ease: 'inout',
      h1: s.th,
    };
    s.onLand = onLand;
    s.mode = 'flight';
    s.startAt = s.fl.t0;
    this._wake(s);
    return s;
  }

  // Sürükleme: sprite işaretçiyi yüksek sertlikte yayla izler, hıza göre yatar
  beginDrag(id, x, y) {
    const s = this.sprites.get(id);
    if (!s) return;
    s.mode = 'drag';
    s.fl = null;
    s.k = SPRING.drag.k;
    s.c = SPRING.drag.c;
    s.tx = x;
    s.ty = y;
    s.th = 16;
    s.tsc = 1.12;
    s.trot = 0;
    s.z = 400;
    s.startAt = 0;
    this._wake(s);
  }

  dragTo(id, x, y) {
    const s = this.sprites.get(id);
    if (!s || s.mode !== 'drag') return;
    s.tx = x;
    s.ty = y;
    this._wake(s);
  }

  endDrag(id) {
    const s = this.sprites.get(id);
    if (!s) return;
    if (s.mode === 'drag') s.mode = 'spring';
    s.k = SPRING.settle.k;
    s.c = SPRING.settle.c;
    s.th = 0;
    s.tsc = 1;
    this._wake(s);
  }

  // Tüm hareketleri atla (intro geç / reduced-motion): hedeflere anında git
  snapAll() {
    for (const s of this.sprites.values()) {
      s.x = s.tx;
      s.y = s.ty;
      s.rot = s.trot;
      s.sc = s.tsc;
      s.h = s.th;
      s.flip = s.tflip;
      s.vx = s.vy = s.vrot = s.vsc = s.vh = s.vflip = 0;
      const cb = s.fl ? s.onLand : null;
      s.fl = null;
      s.mode = 'idle';
      s.placed = true;
      this._sleep(s);
      this._render(s, true);
      if (cb) {
        s.onLand = null;
        cb();
      }
    }
    this.active.clear();
  }

  pause(v) {
    this.paused = v;
    if (v && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else if (!v && this.active.size && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this._tick);
    }
  }

  isBusy() {
    return this.active.size > 0;
  }

  _sleep(s) {
    if (s.moving) {
      s.moving = false;
      s.el.classList.remove('is-moving');
    }
  }

  _tick(now) {
    this.raf = 0;
    const dtMs = now - this.last;
    this.last = now;
    const dt = Math.min(0.05, Math.max(0.001, dtMs / 1000));
    // kare süresi izleme (uyarlanabilir kalite)
    if (this.active.size > 6) {
      this.frameTimes.push(dtMs);
      if (this.frameTimes.length >= 45) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.frameTimes.length = 0;
        if (avg > 26 && this.onSlow) this.onSlow(avg);
      }
    }
    for (const s of this.active) {
      if (now < s.startAt) continue;
      if (s.mode === 'flight') this._stepFlight(s, now);
      else this._stepSpring(s, dt);
      this._render(s);
      if (s.mode === 'idle') {
        this.active.delete(s);
        this._sleep(s);
      }
    }
    if (this.active.size && !this.paused) this.raf = requestAnimationFrame(this._tick);
    else this.frameTimes.length = 0;
  }

  _integrate(s, dt) {
    const n = Math.max(1, Math.ceil(dt / 0.005));
    const h = dt / n;
    const k = s.k;
    const c = s.c;
    // yatma: sürüklemede hıza göre; yayın kendi ζ'sı
    for (let i = 0; i < n; i++) {
      s.vx += (k * (s.tx - s.x) - c * s.vx) * h;
      s.vy += (k * (s.ty - s.y) - c * s.vy) * h;
      s.x += s.vx * h;
      s.y += s.vy * h;
      const rk = 420;
      const rc = 30;
      s.vrot += (rk * (s.trot - s.rot) - rc * s.vrot) * h;
      s.rot += s.vrot * h;
      s.vsc += (900 * (s.tsc - s.sc) - 46 * s.vsc) * h;
      s.sc += s.vsc * h;
      s.vflip += (520 * (s.tflip - s.flip) - 38 * s.vflip) * h;
      s.flip += s.vflip * h;
    }
  }

  _stepSpring(s, dt) {
    if (s.mode === 'drag') {
      // hıza bağlı yatış
      s.trot = clamp(s.vx * 0.012, -14, 14);
    }
    this._integrate(s, dt);
    this._stepLift(s, dt);
    if (s.mode === 'drag') return;
    const near =
      Math.abs(s.tx - s.x) < 0.06 &&
      Math.abs(s.ty - s.y) < 0.06 &&
      Math.abs(s.vx) < 0.4 &&
      Math.abs(s.vy) < 0.4 &&
      Math.abs(s.trot - s.rot) < 0.04 &&
      Math.abs(s.vrot) < 0.4 &&
      Math.abs(s.tsc - s.sc) < 0.0008 &&
      Math.abs(s.vsc) < 0.01 &&
      Math.abs(s.tflip - s.flip) < 0.2 &&
      Math.abs(s.vflip) < 2 &&
      Math.abs(s.th - s.h) < 0.05 &&
      Math.abs(s.vh) < 1;
    if (near) {
      s.x = s.tx;
      s.y = s.ty;
      s.rot = s.trot;
      s.sc = s.tsc;
      s.flip = s.tflip;
      s.h = s.th;
      s.vx = s.vy = s.vrot = s.vsc = s.vflip = s.vh = 0;
      s.mode = 'idle';
    }
  }

  // Yükseklik: hedef > 0 iken yay; hedef 0 iken yerçekimi + sönümlü zıplama
  _stepLift(s, dt) {
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      if (s.th > 0.01 || s.mode === 'drag') {
        s.vh += (LIFT_SPRING.k * (s.th - s.h) - LIFT_SPRING.c * s.vh) * h;
        s.h += s.vh * h;
        if (s.h < 0) {
          s.h = 0;
          s.vh = Math.max(0, s.vh);
        }
      } else if (s.h > 0 || s.vh > 0) {
        s.vh -= GRAVITY * h;
        s.h += s.vh * h;
        if (s.h <= 0) {
          s.h = 0;
          s.vh = Math.abs(s.vh) > 26 ? -s.vh * 0.3 : 0;
        }
      }
    }
  }

  _stepFlight(s, now) {
    const f = s.fl;
    const u = clamp((now - f.t0) / f.dur, 0, 1);
    const e = f.ease === 'inout' ? easeInOut(u) : easeOutCubic(u);
    s.x = lerp(f.x0, f.x1, e);
    s.y = lerp(f.y0, f.y1, e);
    s.rot = lerp(f.rot0, f.rot1, e) + f.spin * Math.sin(Math.PI * u);
    s.sc = lerp(f.sc0, f.sc1, e) * (1 + 0.06 * Math.sin(Math.PI * u));
    s.flip = lerp(f.flip0, f.flip1, smooth(0.12, 0.88, u));
    s.h = 4 * f.arc * u * (1 - u) + f.h1 * u;
    if (u >= 1) {
      s.x = f.x1;
      s.y = f.y1;
      s.rot = f.rot1;
      s.sc = f.sc1;
      s.flip = f.flip1;
      s.h = f.h1;
      // iniş: dikey hızdan mikro zıplama
      const vImpact = f.arc > 0 ? (4 * f.arc) / (f.dur / 1000) : 0;
      s.vh = f.bounce > 0 && f.h1 === 0 ? Math.min(vImpact * 0.28, Math.sqrt(2 * GRAVITY * f.bounce)) : 0;
      s.vx = s.vy = s.vrot = s.vsc = s.vflip = 0;
      s.tx = f.x1;
      s.ty = f.y1;
      s.trot = f.rot1;
      s.tsc = f.sc1;
      s.tflip = f.flip1;
      s.th = f.h1;
      s.fl = null;
      s.mode = s.vh > 0 ? 'spring' : 'idle';
      const cb = s.onLand;
      s.onLand = null;
      if (cb) cb(s);
    }
  }

  _render(s, force = false) {
    const el = s.el;
    const sc = s.sc * (1 + s.h * 0.0042);
    el.style.transform = `translate3d(${(s.x - this.tw / 2).toFixed(2)}px,${(s.y - this.th / 2 - s.h).toFixed(2)}px,0) rotate(${s.rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    if (force || Math.abs(s.h - s._lastH) > 0.25) {
      s._lastH = s.h;
      const sh = el._shadow;
      if (sh) {
        sh.style.transform = `translate(${(s.h * 0.2).toFixed(1)}px,${(s.h * 0.55).toFixed(1)}px) scale(${(1 + s.h * 0.014).toFixed(3)})`;
        sh.style.opacity = String(clamp(1 - s.h / 70, 0.3, 1).toFixed(2));
      }
    }
    if (force || Math.abs(s.flip - s._lastFlip) > 0.4) {
      s._lastFlip = s.flip;
      setFlip(el, s.flip);
    }
    if (s.z !== s._lastZ) {
      s._lastZ = s.z;
      el.style.zIndex = String(s.z);
    }
  }
}
