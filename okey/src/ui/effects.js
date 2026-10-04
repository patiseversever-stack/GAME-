// Efektler: kontrollü kamera tepkisi, sofistike konfeti, hafif ortam tozu.
// Her şey seçici: düşük kalitede ve "hareketi azalt" modunda kapalı/sadeleşir.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ───────────────────────── Kamera (yalnızca yüzey; taşlar/HUD etkilenmez) ─────────────────────────
export class Camera {
  constructor(el, getMotion) {
    this.el = el;
    this.extra = []; // 3B tuval gibi aynı kamerayı paylaşan öğeler
    this.getMotion = getMotion;
  }
  // kind: 'push' (yavaş yakınlaş), 'punch' (kısa vuruş), 'shake' (ceza), 'slam' (sert darbe), 'intro'
  play(kind) {
    if (this.getMotion() === 'reduced' || this.enabled?.() === false) return;
    const e = 'cubic-bezier(.2,.8,.2,1)';
    const K = {
      push: [[{ transform: 'scale(1)' }, { transform: 'scale(1.03) translateY(-6px)' }, { transform: 'scale(1)' }], { duration: 1500, easing: e }],
      punch: [[{ transform: 'scale(1)' }, { transform: 'scale(1.022) translateY(3px)', offset: 0.18 }, { transform: 'scale(1)' }], { duration: 520, easing: e }],
      shake: [
        [{ transform: 'scale(1.012) translate(0,0)' }, { transform: 'scale(1.012) translate(-7px,2px)', offset: 0.12 }, { transform: 'scale(1.012) translate(6px,-2px)', offset: 0.3 }, { transform: 'scale(1.012) translate(-4px,1px)', offset: 0.5 }, { transform: 'scale(1.012) translate(2px,0)', offset: 0.72 }, { transform: 'scale(1) translate(0,0)' }],
        { duration: 460, easing: 'ease-out' },
      ],
      slam: [[{ transform: 'scale(1)' }, { transform: 'scale(1.045) translateY(5px)', offset: 0.1 }, { transform: 'scale(0.992)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 640, easing: e }],
      intro: [[{ transform: 'scale(1.07) translateY(-16px)', opacity: 0.4 }, { transform: 'scale(1) translateY(0)', opacity: 1 }], { duration: 1400, easing: e }],
    }[kind];
    if (!K) return;
    for (const el of [this.el, ...this.extra]) el?.animate?.(K[0], K[1]);
  }
}

// ───────────────────────── Konfeti (ince kâğıt şeritler + küçük metalik pullar) ─────────────────────────
// Birim boyutlu (±0.5) çini motifleri
function starPath() {
  const p = new Path2D();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 ? 0.24 : 0.5;
    p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  p.closePath();
  return p;
}
function tulipPath() {
  const p = new Path2D();
  p.moveTo(0, 0.5);
  p.bezierCurveTo(-0.36, 0.34, -0.42, -0.1, -0.3, -0.46);
  p.lineTo(-0.14, -0.2);
  p.lineTo(0, -0.5);
  p.lineTo(0.14, -0.2);
  p.lineTo(0.3, -0.46);
  p.bezierCurveTo(0.42, -0.1, 0.36, 0.34, 0, 0.5);
  p.closePath();
  return p;
}

export class Confetti {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ps = [];
    this.raf = 0;
    this.last = 0;
    this.colors = ['#e9c77b', '#f4e6bd', '#c9a45c', '#9fd0c4', '#e7a09a', '#f2efe6'];
    // çini paleti (lale ve yıldız parçacıkları): altın, kobalt, turkuaz, mercan
    this.cini = ['#e8bf62', '#f1d48a', '#2a52aa', '#2f9c95', '#c23a2c'];
    this.shapes = { star: starPath(), tulip: tulipPath() };
  }
  burst(x, y, n = 60, dpr = Math.min(2, window.devicePixelRatio || 1)) {
    const c = this.c;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    this.dpr = dpr;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 260 + Math.random() * 520;
      this.ps.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        w: 4 + Math.random() * 6,
        h: 7 + Math.random() * 9,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 12,
        flip: Math.random() * 6.28,
        vf: 5 + Math.random() * 9,
        col: this.colors[(Math.random() * this.colors.length) | 0],
        shape: null,
        life: 0,
        max: 1.8 + Math.random() * 1.4,
        metal: Math.random() < 0.3,
      });
      // her dört parçadan biri altın lale ya da sekiz köşeli yıldız (biraz daha iri, daha yavaş döner)
      const last = this.ps[this.ps.length - 1];
      if (Math.random() < 0.26) {
        last.shape = Math.random() < 0.5 ? 'star' : 'tulip';
        last.col = this.cini[(Math.random() * this.cini.length) | 0];
        last.w = last.h = 9 + Math.random() * 6;
        last.vr *= 0.5;
        last.vf *= 0.45;
      }
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }
  tick(now) {
    const dt = Math.min(0.04, (now - this.last) / 1000);
    this.last = now;
    const ctx = this.ctx;
    const d = this.dpr || 1;
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    const alive = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life > p.max) continue;
      p.vy += 820 * dt; // yerçekimi
      p.vx *= 1 - 1.6 * dt; // hava direnci
      p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      const a = clamp(1 - (p.life - p.max * 0.6) / (p.max * 0.4), 0, 1);
      ctx.save();
      ctx.translate(p.x * d, p.y * d);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      if (p.shape) {
        ctx.scale(p.w * d, p.w * d);
        ctx.fill(this.shapes[p.shape]);
        ctx.restore();
        alive.push(p);
        continue;
      }
      ctx.fillRect((-p.w / 2) * d, (-p.h / 2) * d, p.w * d, p.h * d);
      if (p.metal) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect((-p.w / 2) * d, (-p.h / 2) * d, p.w * d * 0.4, p.h * d);
      }
      ctx.restore();
      alive.push(p);
    }
    this.ps = alive;
    if (alive.length) this.raf = requestAnimationFrame((t) => this.tick(t));
    else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.c.width, this.c.height);
    }
  }
  clear() {
    this.ps = [];
  }
}

// ───────────────────────── Ortam tozu (çok düşük yoğunluk) ─────────────────────────
export class Dust {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ps = [];
    this.raf = 0;
    this.on = false;
  }
  start(count = 22) {
    if (this.on) return;
    this.on = true;
    const c = this.c;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(c.clientWidth * dpr);
    c.height = Math.round(c.clientHeight * dpr);
    this.dpr = dpr;
    this.ps = Array.from({ length: count }, () => this.spawn(true));
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }
  spawn(init) {
    const w = this.c.clientWidth;
    const h = this.c.clientHeight;
    return {
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.6,
      vy: -(3 + Math.random() * 7),
      vx: (Math.random() - 0.5) * 4,
      a: 0.05 + Math.random() * 0.14,
      ph: Math.random() * 6.28,
    };
  }
  stop() {
    this.on = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
  }
  tick(now) {
    if (!this.on) return;
    // 30 fps ile sınırla
    if (now - this.last < 33) {
      this.raf = requestAnimationFrame((t) => this.tick(t));
      return;
    }
    const dt = Math.min(0.06, (now - this.last) / 1000);
    this.last = now;
    const d = this.dpr;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.ph += dt * 0.8;
      p.x += (p.vx + Math.sin(p.ph) * 3) * dt;
      p.y += p.vy * dt;
      if (p.y < -10) this.ps[i] = this.spawn(false);
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.ph * 1.7));
      ctx.fillStyle = '#fff4d8';
      ctx.beginPath();
      ctx.arc(p.x * d, p.y * d, p.r * d, 0, 6.283);
      ctx.fill();
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }
}

// ───────────────────────── Kutlamalar (kuşanılan efekt: lale, havai fişek, altın, nazar, gül) ─────────────────────────
function petalPath() {
  const p = new Path2D();
  p.moveTo(0, -0.5);
  p.bezierCurveTo(0.42, -0.36, 0.4, 0.26, 0, 0.5);
  p.bezierCurveTo(-0.4, 0.26, -0.42, -0.36, 0, -0.5);
  p.closePath();
  return p;
}
function fitCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth || c.parentElement?.clientWidth || 300;
  const h = c.clientHeight || c.parentElement?.clientHeight || 200;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  return { w, h, d: dpr };
}
const TULIP_COLS = [
  ['#e0503f', '#8e1e14'],
  ['#2f5fc0', '#14286a'],
  ['#37b0a8', '#13625c'],
  ['#f6efe0', '#b7aa92'],
  ['#f0c766', '#9a6a1c'],
];

export class Celebration {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ps = [];
    this.raf = 0;
    this.timers = [];
    this.shapes = { tulip: tulipPath(), star: starPath(), petal: petalPath() };
    this.confetti = null;
  }
  // id: konfeti | lale | havai | altin | nazar | gul. o.scale: küçük önizlemelerde parçacık boyu, o.calm: hareketi azalt
  play(id, o = {}) {
    this.stop();
    const { w, h, d } = fitCanvas(this.c);
    this.W = w;
    this.H = h;
    this.d = d;
    this.k = o.scale ?? Math.max(0.6, Math.min(1.25, Math.min(w, h) / 380));
    const n = o.calm ? 0.45 : 1;
    const later = (ms, fn) => this._later(ms, fn);
    if (id === 'konfeti' || !id) {
      this.confetti = this.confetti || new Confetti(this.c);
      [0, 260, 520].forEach((t, i) => later(t, () => this.confetti.burst(w * (0.25 + i * 0.25), h * 0.78, Math.round(46 * n * Math.min(1, this.k + 0.2)))));
      return;
    }
    const spawn = this['_' + id]?.bind(this);
    if (!spawn) return;
    spawn(n, later);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this._tick(t));
    }
  }
  _later(ms, fn) {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((v) => v !== t);
      fn();
    }, ms);
    this.timers.push(t);
  }
  stop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.ps = [];
    this.confetti?.clear();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
  }
  // Seviye atlama patlaması: merkezden lale ve sekiz köşe yıldızlar, ardından hafif lale/yıldız yağmuru
  burstAt(cx, cy, o = {}) {
    if (!this.W) {
      const { w, h, d } = fitCanvas(this.c);
      this.W = w;
      this.H = h;
      this.d = d;
      this.k = Math.max(0.6, Math.min(1.25, Math.min(w, h) / 380));
    }
    const n = o.calm ? 0.45 : 1;
    const k = this.k;
    for (let i = 0; i < Math.round(64 * n); i++) {
      const a = Math.random() * Math.PI * 2,
        v = (220 + Math.random() * 420) * k;
      const star = Math.random() < 0.5;
      this.ps.push({ kind: star ? 'star' : 'tulip', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * k, drag: 1.6, s: (star ? 9 + Math.random() * 9 : 13 + Math.random() * 10) * k, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 5, ph: Math.random() * 6.3, col: star ? ['#fff3c4', '#d9a33c'] : TULIP_COLS[(Math.random() * TULIP_COLS.length) | 0], life: 0, max: 2.4 + Math.random(), g: 260 });
    }
    if (o.rain !== false) {
      const W = this.W;
      for (let i = 0; i < Math.round(40 * n); i++)
        this._later(250 + i * 60, () => {
            const star = Math.random() < 0.45;
            this.ps.push({ kind: star ? 'star' : 'tulip', x: Math.random() * W, y: -24, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 70, s: (star ? 8 + Math.random() * 7 : 14 + Math.random() * 10) * k, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 1.5, sway: 1 + Math.random() * 1.5, ph: Math.random() * 6.3, col: star ? ['#fff3c4', '#d9a33c'] : TULIP_COLS[(Math.random() * TULIP_COLS.length) | 0], life: 0, max: 6, g: 0 });
          });
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this._tick(t));
    }
  }
  _rain(count, dur, make, later) {
    for (let i = 0; i < count; i++) later((i / count) * dur, () => this.ps.push(make()));
  }
  // süzülen İznik laleleri ve yaprakları
  _lale(n, later) {
    const { W, k } = this;
    this._rain(Math.round(70 * n), 2600, () => {
      const leaf = Math.random() < 0.22;
      const col = leaf ? ['#4fae86', '#1e5e45'] : TULIP_COLS[(Math.random() * TULIP_COLS.length) | 0];
      return { kind: leaf ? 'petal' : 'tulip', x: Math.random() * W, y: -30, vx: (Math.random() - 0.5) * 30, vy: 70 + Math.random() * 70, s: (leaf ? 10 : 16 + Math.random() * 12) * k, rot: (Math.random() - 0.5) * 0.8, vr: (Math.random() - 0.5) * 1.6, sway: 1 + Math.random() * 1.6, ph: Math.random() * 6.3, col, life: 0, max: 5 + Math.random() * 2, g: 0 };
    }, later);
  }
  // gül yaprakları: kadife kırmızı/pembe, çırpınarak düşer
  _gul(n, later) {
    const { W, k } = this;
    const C = [['#c8243c', '#6e0a1a'], ['#e0556c', '#8a1c30'], ['#f08aa0', '#a8455a'], ['#a3122a', '#4c0412']];
    this._rain(Math.round(90 * n), 2800, () => ({ kind: 'petal', flutter: true, x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 60, s: (11 + Math.random() * 9) * k, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 4, sway: 1.5 + Math.random() * 2, ph: Math.random() * 6.3, col: C[(Math.random() * C.length) | 0], life: 0, max: 5.5, g: 0 }), later);
  }
  // altın sikkeler: aşağıdan fışkırır, döne döne düşer; parıltılar
  _altin(n, later) {
    const { W, H, k } = this;
    const coin = (x, up) => ({ kind: 'coin', x, y: up ? H + 10 : -20, vx: (Math.random() - 0.5) * (up ? 260 : 30), vy: up ? -(420 + Math.random() * 360) * Math.min(1.2, H / 380) : 80 + Math.random() * 80, s: (11 + Math.random() * 6) * k, flip: Math.random() * 6.3, vf: 6 + Math.random() * 8, rot: (Math.random() - 0.5) * 0.6, vr: 0, life: 0, max: 4.2, g: up ? 720 : 140 });
    [0, 380, 760].forEach((t, i) => later(t, () => { for (let j = 0; j < Math.round(26 * n); j++) this.ps.push(coin(W * (0.22 + i * 0.28) + (Math.random() - 0.5) * 40, true)); }));
    this._rain(Math.round(40 * n), 2400, () => coin(Math.random() * W, false), later);
    this._rain(Math.round(30 * n), 3000, () => ({ kind: 'spark', x: Math.random() * W, y: Math.random() * H * 0.8, s: (6 + Math.random() * 8) * k, life: 0, max: 0.9 + Math.random() * 0.6, vx: 0, vy: 0, g: 0, rot: 0, vr: 0 }), later);
  }
  // nazar boncukları: cam parıltılı, sekerek düşer
  _nazar(n, later) {
    const { W, k } = this;
    this._rain(Math.round(46 * n), 2400, () => ({ kind: 'nazar', x: Math.random() * W, y: -24, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80, s: (19 + Math.random() * 12) * k, flip: Math.random() * 6.3, vf: 1.5 + Math.random() * 2.5, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 2, life: 0, max: 4.6, g: 360, bounce: 0 }), later);
  }
  // havai fişek: roketler yükselir, ışık kürelerine patlar
  _havai(n, later) {
    const { W, H, k } = this;
    const COLS = ['#ffd77a', '#fff4d6', '#ff7a5c', '#5ad1c8', '#7aa2ff', '#ffb3c8'];
    const shots = Math.round(6 * Math.max(0.6, n));
    for (let i = 0; i < shots; i++)
      later(i * 430, () => {
        const tx = W * (0.15 + Math.random() * 0.7),
          ty = H * (0.18 + Math.random() * 0.25);
        this.ps.push({ kind: 'rocket', x: tx + (Math.random() - 0.5) * 60, y: H + 8, tx, ty, vx: 0, vy: -Math.max(380, (H - ty) * 1.9), life: 0, max: 3, g: 0, rot: 0, vr: 0, col: COLS[(Math.random() * COLS.length) | 0], trail: [] });
      });
    this.boom = (p) => {
      const m = Math.round((60 + Math.random() * 40) * Math.max(0.5, n));
      const c2 = COLS[(Math.random() * COLS.length) | 0];
      const sp = (150 + Math.random() * 90) * k;
      for (let j = 0; j < m; j++) {
        const a = (j / m) * Math.PI * 2 + Math.random() * 0.1,
          v = sp * (0.55 + Math.random() * 0.5);
        this.ps.push({ kind: 'ember', x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.3 + Math.random() * 0.7, g: 90, rot: 0, vr: 0, col: j % 3 ? p.col : c2, s: 2.1 * k, tw: Math.random() < 0.35, trail: [] });
      }
      this.ps.push({ kind: 'flash', x: p.x, y: p.y, life: 0, max: 0.35, s: 60 * k, vx: 0, vy: 0, g: 0, rot: 0, vr: 0 });
    };
  }
  _tick(now) {
    const dt = Math.min(0.04, (now - this.last) / 1000);
    this.last = now;
    const { ctx, d, H } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    const alive = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life > p.max) continue;
      if (p.kind === 'rocket') {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 10) p.trail.shift();
        p.y += p.vy * dt;
        p.x += (p.tx - p.x) * 2 * dt;
        if (p.y <= p.ty) {
          this.boom?.(p);
          continue;
        }
      } else {
        p.vy += p.g * dt;
        if (p.drag) {
          p.vx *= 1 - p.drag * dt;
          p.vy *= 1 - p.drag * 0.6 * dt;
        }
        if (p.kind === 'ember') {
          p.vx *= 1 - 1.4 * dt;
          p.vy *= 1 - 1.4 * dt;
          p.trail.push([p.x, p.y]);
          if (p.trail.length > 5) p.trail.shift();
        }
        if (p.sway) p.x += Math.sin(p.life * p.sway + p.ph) * 26 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.flip !== undefined) p.flip += p.vf * dt;
        if (p.kind === 'nazar' && p.y > H - p.s && p.vy > 0 && p.bounce < 2) {
          p.vy *= -0.42;
          p.bounce++;
        }
        if (p.y > H + 40 && p.g >= 0 && p.vy > 0) continue;
      }
      alive.push(p);
      const fade = Math.min(1, (p.max - p.life) / Math.min(0.6, p.max * 0.3));
      ctx.save();
      ctx.setTransform(d, 0, 0, d, p.x * d, p.y * d);
      ctx.globalAlpha = Math.max(0, fade);
      this._draw(ctx, p);
      ctx.restore();
    }
    this.ps = alive;
    if (alive.length || this.timers.length) this.raf = requestAnimationFrame((t) => this._tick(t));
    else this.raf = 0;
  }
  _draw(x, p) {
    const s = p.s;
    switch (p.kind) {
      case 'tulip': {
        x.rotate(p.rot + Math.sin(p.life * 1.7 + p.ph) * 0.25);
        x.scale(s, s);
        const g = x.createLinearGradient(0, -0.5, 0, 0.5);
        g.addColorStop(0, p.col[0]);
        g.addColorStop(1, p.col[1]);
        x.fillStyle = g;
        x.fill(this.shapes.tulip);
        x.lineWidth = 0.07;
        x.strokeStyle = 'rgba(255,248,232,0.85)';
        x.stroke(this.shapes.tulip);
        x.strokeStyle = 'rgba(255,255,255,0.55)';
        x.lineWidth = 0.05;
        x.beginPath();
        x.moveTo(0, 0.3);
        x.lineTo(0, -0.3);
        x.stroke();
        break;
      }
      case 'star': {
        x.rotate(p.rot);
        x.scale(s, s);
        const g = x.createLinearGradient(-0.5, -0.5, 0.5, 0.5);
        g.addColorStop(0, p.col[0]);
        g.addColorStop(1, p.col[1]);
        x.fillStyle = g;
        x.fill(this.shapes.star);
        x.strokeStyle = 'rgba(120,70,10,0.6)';
        x.lineWidth = 0.05;
        x.stroke(this.shapes.star);
        break;
      }
      case 'petal': {
        x.rotate(p.rot);
        x.scale(s, s * (p.flutter ? 0.55 + 0.45 * Math.abs(Math.cos(p.life * 3 + p.ph)) : 1));
        const g = x.createRadialGradient(-0.12, -0.18, 0.02, 0, 0, 0.55);
        g.addColorStop(0, p.col[0]);
        g.addColorStop(1, p.col[1]);
        x.fillStyle = g;
        x.fill(this.shapes.petal);
        x.fillStyle = 'rgba(255,255,255,0.18)';
        x.beginPath();
        x.ellipse(-0.1, -0.15, 0.1, 0.22, 0.3, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'coin': {
        x.rotate(p.rot);
        const sx = Math.cos(p.flip);
        x.scale(s * (Math.abs(sx) < 0.12 ? 0.12 : Math.abs(sx)), s);
        const edge = sx < 0;
        const g = x.createLinearGradient(-0.5, -0.5, 0.5, 0.5);
        g.addColorStop(0, edge ? '#b07a22' : '#fff0b0');
        g.addColorStop(0.45, '#e2b14a');
        g.addColorStop(1, '#8a5a14');
        x.fillStyle = g;
        x.beginPath();
        x.arc(0, 0, 0.5, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = 'rgba(110,70,10,0.9)';
        x.lineWidth = 0.06;
        x.beginPath();
        x.arc(0, 0, 0.38, 0, Math.PI * 2);
        x.stroke();
        x.fillStyle = 'rgba(120,76,12,0.65)';
        x.scale(0.42, 0.42);
        x.fill(this.shapes.star);
        break;
      }
      case 'spark': {
        const t = p.life / p.max,
          r = s * Math.sin(Math.PI * t);
        x.fillStyle = 'rgba(255,246,210,0.95)';
        x.beginPath();
        x.moveTo(0, -r);
        x.quadraticCurveTo(0, 0, r, 0);
        x.quadraticCurveTo(0, 0, 0, r);
        x.quadraticCurveTo(0, 0, -r, 0);
        x.quadraticCurveTo(0, 0, 0, -r);
        x.fill();
        break;
      }
      case 'nazar': {
        x.rotate(p.rot);
        x.scale(s * (0.75 + 0.25 * Math.abs(Math.cos(p.flip))), s);
        for (const [r, c] of [
          [0.5, '#1846a8'],
          [0.36, '#f4f7fb'],
          [0.25, '#5fb3e6'],
          [0.12, '#0b0f1a'],
        ]) {
          x.fillStyle = c;
          x.beginPath();
          x.arc(0, 0, r, 0, Math.PI * 2);
          x.fill();
        }
        const g = x.createRadialGradient(-0.18, -0.2, 0.02, 0, 0, 0.5);
        g.addColorStop(0, 'rgba(255,255,255,0.75)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.08)');
        g.addColorStop(1, 'rgba(0,0,30,0.25)');
        x.fillStyle = g;
        x.beginPath();
        x.arc(0, 0, 0.5, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'rocket': {
        x.setTransform(this.d, 0, 0, this.d, 0, 0);
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = 'rgba(255,220,150,0.7)';
        x.lineWidth = 2;
        x.beginPath();
        p.trail.forEach(([tx, ty], i) => (i ? x.lineTo(tx, ty) : x.moveTo(tx, ty)));
        x.lineTo(p.x, p.y);
        x.stroke();
        x.fillStyle = '#fff6dc';
        x.beginPath();
        x.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'ember': {
        x.setTransform(this.d, 0, 0, this.d, 0, 0);
        x.globalCompositeOperation = 'lighter';
        if (p.tw && Math.random() < 0.3) x.globalAlpha *= 0.3;
        x.strokeStyle = p.col;
        x.lineWidth = s;
        x.lineCap = 'round';
        x.beginPath();
        p.trail.forEach(([tx, ty], i) => (i ? x.lineTo(tx, ty) : x.moveTo(tx, ty)));
        x.lineTo(p.x, p.y);
        x.stroke();
        x.fillStyle = '#fffaf0';
        x.beginPath();
        x.arc(p.x, p.y, s * 0.6, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'flash': {
        x.globalCompositeOperation = 'lighter';
        const g = x.createRadialGradient(0, 0, 0, 0, 0, s);
        g.addColorStop(0, 'rgba(255,240,200,0.55)');
        g.addColorStop(1, 'rgba(255,240,200,0)');
        x.fillStyle = g;
        x.beginPath();
        x.arc(0, 0, s, 0, Math.PI * 2);
        x.fill();
        break;
      }
    }
  }
}
