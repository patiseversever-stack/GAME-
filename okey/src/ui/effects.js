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
    for (let i = 0; i < Math.round(46 * n); i++) {
      const a = Math.random() * Math.PI * 2,
        v = (200 + Math.random() * 380) * k;
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
  // altın varak: tırtıklı ince yapraklar, döndükçe ışığı yakalar (yüz açısına göre koyu altından beyaz altına)
  _varak(n, later) {
    const { W, H, k } = this;
    const flake = () => {
      const pts = [];
      const m = 7 + ((Math.random() * 4) | 0);
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2;
        const r = 0.32 + Math.random() * 0.22;
        pts.push([Math.cos(a) * r, Math.sin(a) * r * (0.6 + Math.random() * 0.5)]);
      }
      return pts;
    };
    // önce merkezden hafif bir püskürme, ardından yukarıdan süzülme
    for (let i = 0; i < Math.round(36 * n); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4,
        v = (160 + Math.random() * 300) * k;
      this.ps.push({ kind: 'leaf', pts: flake(), x: W / 2, y: H * 0.62, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.2, s: (10 + Math.random() * 12) * k, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 3, flip: Math.random() * 6.3, vf: 2 + Math.random() * 3, sway: 0.8 + Math.random(), ph: Math.random() * 6.3, life: 0, max: 5.5, g: 70 });
    }
    this._rain(Math.round(60 * n), 2800, () => ({ kind: 'leaf', pts: flake(), x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, s: (8 + Math.random() * 12) * k, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 2, flip: Math.random() * 6.3, vf: 1.5 + Math.random() * 2.5, sway: 1 + Math.random() * 1.5, ph: Math.random() * 6.3, life: 0, max: 7, g: 0 }), later);
  }
  // dilek fenerleri: aşağıdan süzülerek yükselir, sıcak ışık saçar; uzaktakiler küçük ve soluk (derinlik)
  _fener(n, later) {
    const { W, H, k } = this;
    this._rain(Math.round(16 * Math.max(0.6, n)), 2600, () => {
      const z = 0.45 + Math.random() * 0.55;
      return { kind: 'lantern', z, x: W * (0.08 + Math.random() * 0.84), y: H + 30, vx: (Math.random() - 0.5) * 10, vy: -(26 + 34 * z) * k, s: (16 + 16 * z) * k, rot: 0, vr: 0, sway: 0.6 + Math.random() * 0.6, ph: Math.random() * 6.3, life: 0, max: 7.5, g: 0, fl: Math.random() * 6.3 };
    }, later);
    this._rain(Math.round(30 * n), 3200, () => ({ kind: 'ember2', x: W * Math.random(), y: H + 4, vx: (Math.random() - 0.5) * 16, vy: -(30 + Math.random() * 50), s: (1 + Math.random() * 1.6) * k, rot: 0, vr: 0, sway: 1.5, ph: Math.random() * 6.3, life: 0, max: 4 + Math.random() * 2, g: 0 }), later);
  }
  // yıldız kayması: uzun ışık kuyruklu göktaşları ve göz kırpan yıldızlar
  _yildiz(n, later) {
    const { W, H, k } = this;
    for (let i = 0; i < Math.round(36 * n); i++) later(Math.random() * 2400, () => this.ps.push({ kind: 'twinkle', x: Math.random() * W, y: Math.random() * H * 0.85, s: (1.5 + Math.random() * 3) * k, rot: 0, vr: 0, vx: 0, vy: 0, g: 0, life: 0, max: 2 + Math.random() * 2 }));
    const shots = Math.round(9 * Math.max(0.5, n));
    for (let i = 0; i < shots; i++)
      later(150 + i * 300 + Math.random() * 120, () => {
        const a = Math.PI * (0.18 + Math.random() * 0.14) * (Math.random() < 0.5 ? 1 : -1) + (Math.random() < 0.5 ? 0 : Math.PI);
        const sp = (620 + Math.random() * 420) * k;
        const dir = Math.cos(a) >= 0 ? 1 : -1;
        this.ps.push({ kind: 'meteor', x: dir > 0 ? -40 + Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5 + 40, y: -20 + Math.random() * H * 0.35, vx: Math.abs(Math.cos(a)) * sp * dir, vy: Math.abs(Math.sin(a)) * sp, s: (2 + Math.random() * 1.4) * k, len: (90 + Math.random() * 90) * k, rot: 0, vr: 0, g: 0, life: 0, max: 1.1 + Math.random() * 0.4 });
      });
  }
  // ebru damlaları: ekranda açılan iç içe mürekkep halkaları, hafifçe dalgalanır ve tarakla çekilir
  _ebru(n, later) {
    const { W, H, k } = this;
    const PALS = [
      ['#22366c', '#efe3c9', '#b55f66', '#efe3c9', '#cf9d45'],
      ['#b55f66', '#f3dcd2', '#22366c', '#efe3c9', '#7d987a'],
      ['#cf9d45', '#efe3c9', '#22366c', '#f6efe0', '#b55f66'],
      ['#1f6f6a', '#efe3c9', '#cf9d45', '#efe3c9', '#22366c'],
    ];
    const count = Math.round(11 * Math.max(0.6, n));
    for (let i = 0; i < count; i++)
      later(i * 230, () => this.ps.push({ kind: 'ink', x: W * (0.1 + Math.random() * 0.8), y: H * (0.12 + Math.random() * 0.72), pal: PALS[i % PALS.length], R: (30 + Math.random() * 32) * k, seed: Math.random() * 100, comb: Math.random() < 0.5 ? (Math.random() - 0.5) * 2 : 0, s: 1, rot: 0, vr: 0, vx: 0, vy: 0, g: 0, life: 0, max: 3.4 }));
  }
  // kelebekler: dalgalı yollarla yükselir, kanat çırpar; morfo mavisi, monark turuncusu, beyaz, firuze
  _kelebek(n, later) {
    const { W, H, k } = this;
    const C = [
      ['#3fa8ff', '#0b3a8f', '#ffffff'],
      ['#ff9a2e', '#7a2c00', '#1b1208'],
      ['#f6f2e8', '#b9b09a', '#3a3328'],
      ['#2fd1c1', '#0b5c57', '#ffffff'],
      ['#ff6aa2', '#7a0f3f', '#ffffff'],
    ];
    this._rain(Math.round(20 * Math.max(0.6, n)), 2600, () => ({ kind: 'fly', x: W * (0.1 + Math.random() * 0.8), y: H + 20, vx: (Math.random() - 0.5) * 60, vy: -(60 + Math.random() * 60) * k, s: (13 + Math.random() * 9) * k, col: C[(Math.random() * C.length) | 0], fr: 10 + Math.random() * 6, ph: Math.random() * 6.3, wob: 1.2 + Math.random(), rot: 0, vr: 0, g: 0, life: 0, max: 6 }), later);
  }
  // çini mozaik: karolar kenarlardan gelip merkez çevresinde halka olur, döner, sonra dağılır
  _mozaik(n, later) {
    const { W, H, k } = this;
    const N = Math.round(20 * Math.max(0.6, n));
    const R0 = Math.min(W, H) * 0.34;
    const cx = W / 2,
      cy = H / 2;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const fromA = Math.random() * Math.PI * 2,
        fr = Math.max(W, H) * 0.75;
      const p = { kind: 'tile', x: cx + Math.cos(fromA) * fr, y: cy + Math.sin(fromA) * fr, sx: 0, sy: 0, a, i, s: (20 + (i % 3) * 3) * k, rot: Math.random() * 6, vr: 0, flip: 0, vx: 0, vy: 0, g: 0, life: 0, max: 3.6, motif: i % 3 };
      p.sx = p.x;
      p.sy = p.y;
      p.upd = (q, dt) => {
        const t = q.life;
        const spin = Math.max(0, t - 0.9) * 1.4;
        const tx = cx + Math.cos(q.a + spin) * R0,
          ty = cy + Math.sin(q.a + spin) * R0 * 0.82;
        if (t < 0.9) {
          const e = 1 - Math.pow(1 - t / 0.9, 3);
          q.x = q.sx + (tx - q.sx) * e;
          q.y = q.sy + (ty - q.sy) * e;
          q.rot += (q.a + Math.PI / 2 - q.rot) * Math.min(1, dt * 6);
          q.flip = (1 - e) * Math.PI * 2;
        } else if (t < 2.1) {
          q.x = tx;
          q.y = ty;
          q.rot = q.a + spin + Math.PI / 2;
          q.flip = Math.sin((t - 0.9) * 3 + q.i) * 0.25;
          if (!q.vx) {
            const ox = Math.cos(q.a + spin),
              oy = Math.sin(q.a + spin);
            q.bx = ox;
            q.by = oy;
          }
        } else {
          if (!q.burst) {
            q.burst = true;
            const ox = q.x - cx,
              oy = q.y - cy,
              d = Math.hypot(ox, oy) || 1;
            q.vx = (ox / d) * 420 * k;
            q.vy = (oy / d) * 420 * k - 120 * k;
            q.vr = (Math.random() - 0.5) * 8;
          }
          q.vy += 600 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.rot += q.vr * dt;
          q.flip += dt * 6;
        }
        return true;
      };
      later(i * 25, () => this.ps.push(p));
    }
    later(900, () => this.burstAt?.(cx, cy, { rain: false, calm: true }));
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
      if (p.upd) {
        p.upd(p, dt);
      } else if (p.kind === 'rocket') {
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
      case 'leaf': {
        x.rotate(p.rot);
        const f = Math.cos(p.flip);
        x.scale(s * (0.2 + 0.8 * Math.abs(f)), s);
        const lit = Math.abs(Math.sin(p.flip * 0.5 + p.rot));
        const g = x.createLinearGradient(-0.5, -0.5, 0.5, 0.5);
        g.addColorStop(0, `rgb(${200 + 55 * lit | 0},${150 + 90 * lit | 0},${60 + 110 * lit | 0})`);
        g.addColorStop(0.5, `rgb(${170 + 70 * lit | 0},${118 + 80 * lit | 0},${38 + 60 * lit | 0})`);
        g.addColorStop(1, `rgb(${120 + 60 * lit | 0},${80 + 50 * lit | 0},${20 + 30 * lit | 0})`);
        x.fillStyle = g;
        x.beginPath();
        p.pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
        x.closePath();
        x.fill();
        if (lit > 0.8) {
          x.globalAlpha *= (lit - 0.8) * 4;
          x.fillStyle = '#fffbe8';
          x.fill();
        }
        break;
      }
      case 'lantern': {
        const t = p.life,
          z = p.z;
        x.translate(Math.sin(t * p.sway + p.ph) * 6 * z, 0);
        x.rotate(Math.sin(t * p.sway * 0.8 + p.ph) * 0.06);
        const fl = 0.85 + 0.15 * Math.sin(t * 13 + p.fl) * Math.sin(t * 7.3 + p.fl * 2);
        x.globalCompositeOperation = 'lighter';
        const halo = x.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
        halo.addColorStop(0, `rgba(255,170,70,${0.35 * fl * z})`);
        halo.addColorStop(1, 'rgba(255,140,40,0)');
        x.fillStyle = halo;
        x.beginPath();
        x.arc(0, 0, s * 2.4, 0, Math.PI * 2);
        x.fill();
        x.globalCompositeOperation = 'source-over';
        const w = s * 0.62,
          h = s;
        const body = x.createLinearGradient(0, -h / 2, 0, h / 2);
        body.addColorStop(0, `rgba(255,${200 + 40 * fl | 0},140,${0.92 * (0.6 + 0.4 * z)})`);
        body.addColorStop(0.6, `rgba(255,150,60,${0.95 * (0.6 + 0.4 * z)})`);
        body.addColorStop(1, `rgba(214,92,30,${0.95 * (0.6 + 0.4 * z)})`);
        x.fillStyle = body;
        x.beginPath();
        x.moveTo(-w * 0.78, -h / 2);
        x.quadraticCurveTo(0, -h * 0.62, w * 0.78, -h / 2);
        x.lineTo(w * 0.52, h / 2);
        x.quadraticCurveTo(0, h * 0.56, -w * 0.52, h / 2);
        x.closePath();
        x.fill();
        x.strokeStyle = `rgba(160,60,20,${0.35 * z})`;
        x.lineWidth = Math.max(0.6, s * 0.03);
        for (const q of [-0.3, 0.3]) {
          x.beginPath();
          x.moveTo(w * q * 1.6, -h * 0.52);
          x.lineTo(w * q, h * 0.5);
          x.stroke();
        }
        const core = x.createRadialGradient(0, h * 0.34, 0, 0, h * 0.34, w * 0.5);
        core.addColorStop(0, `rgba(255,255,220,${fl})`);
        core.addColorStop(1, 'rgba(255,200,120,0)');
        x.fillStyle = core;
        x.beginPath();
        x.arc(0, h * 0.34, w * 0.5, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'ember2': {
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = `rgba(255,${170 + Math.random() * 60 | 0},90,0.9)`;
        x.beginPath();
        x.arc(0, 0, s, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'twinkle': {
        const t = p.life / p.max;
        const r = s * Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(p.life * 18));
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(230,240,255,0.95)';
        x.beginPath();
        x.moveTo(0, -r * 2.2);
        x.quadraticCurveTo(0, 0, r * 2.2, 0);
        x.quadraticCurveTo(0, 0, 0, r * 2.2);
        x.quadraticCurveTo(0, 0, -r * 2.2, 0);
        x.quadraticCurveTo(0, 0, 0, -r * 2.2);
        x.fill();
        break;
      }
      case 'meteor': {
        x.globalCompositeOperation = 'lighter';
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const tx = (-p.vx / sp) * p.len,
          ty = (-p.vy / sp) * p.len;
        const g = x.createLinearGradient(0, 0, tx, ty);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.2, 'rgba(190,220,255,0.6)');
        g.addColorStop(1, 'rgba(120,160,255,0)');
        x.strokeStyle = g;
        x.lineCap = 'round';
        x.lineWidth = s;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(tx, ty);
        x.stroke();
        const h = x.createRadialGradient(0, 0, 0, 0, 0, s * 5);
        h.addColorStop(0, 'rgba(255,255,255,0.9)');
        h.addColorStop(1, 'rgba(160,200,255,0)');
        x.fillStyle = h;
        x.beginPath();
        x.arc(0, 0, s * 5, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'ink': {
        const t = p.life;
        const grow = 1 - Math.pow(1 - Math.min(1, t / 1.1), 3);
        const R = p.R * grow;
        const fade = t > 2.3 ? Math.max(0, 1 - (t - 2.3) / 1.1) : 1;
        x.globalAlpha *= 0.78 * fade;
        if (p.comb) x.transform(1, 0, p.comb * 0.35 * grow, 1, 0, 0);
        const rings = p.pal.length;
        for (let i = 0; i < rings; i++) {
          const rr = R * (1 - i / rings);
          if (rr <= 0.5) continue;
          x.fillStyle = p.pal[i];
          x.beginPath();
          const m = 40;
          for (let j = 0; j <= m; j++) {
            const a = (j / m) * Math.PI * 2;
            const w = 1 + 0.06 * Math.sin(a * 3 + p.seed + i) + 0.04 * Math.sin(a * 7 + p.seed * 2 + t);
            const px = Math.cos(a) * rr * w,
              py = Math.sin(a) * rr * w;
            j ? x.lineTo(px, py) : x.moveTo(px, py);
          }
          x.closePath();
          x.fill();
        }
        break;
      }
      case 'fly': {
        const t = p.life;
        x.translate(Math.sin(t * p.wob + p.ph) * 22 * this.k, 0);
        x.rotate(Math.sin(t * p.wob * 1.3 + p.ph) * 0.35);
        const flap = 0.18 + 0.82 * Math.abs(Math.sin(t * p.fr + p.ph));
        const [c0, c1, dot] = p.col;
        for (const sd of [-1, 1]) {
          x.save();
          x.scale(sd * flap, 1);
          const g = x.createLinearGradient(0, 0, s, 0);
          g.addColorStop(0, c1);
          g.addColorStop(0.35, c0);
          g.addColorStop(1, c1);
          x.fillStyle = g;
          x.beginPath();
          x.moveTo(0, -s * 0.05);
          x.bezierCurveTo(s * 0.35, -s * 0.95, s * 1.15, -s * 0.85, s * 0.95, -s * 0.2);
          x.bezierCurveTo(s * 0.85, s * 0.05, s * 0.4, s * 0.05, 0, 0);
          x.fill();
          x.beginPath();
          x.moveTo(0, s * 0.02);
          x.bezierCurveTo(s * 0.5, s * 0.1, s * 0.85, s * 0.45, s * 0.55, s * 0.72);
          x.bezierCurveTo(s * 0.3, s * 0.85, s * 0.1, s * 0.45, 0, s * 0.1);
          x.fill();
          x.fillStyle = dot;
          x.globalAlpha *= 0.85;
          x.beginPath();
          x.arc(s * 0.72, -s * 0.45, s * 0.08, 0, Math.PI * 2);
          x.arc(s * 0.45, s * 0.42, s * 0.06, 0, Math.PI * 2);
          x.fill();
          x.restore();
        }
        x.fillStyle = '#1b130c';
        x.beginPath();
        x.ellipse(0, s * 0.1, s * 0.06, s * 0.42, 0, 0, Math.PI * 2);
        x.fill();
        break;
      }
      case 'tile': {
        x.rotate(p.rot);
        x.scale(Math.max(0.08, Math.abs(Math.cos(p.flip))), 1);
        const h = s / 2;
        x.shadowColor = 'rgba(0,0,0,0.45)';
        x.shadowBlur = 8;
        x.shadowOffsetY = 4;
        x.fillStyle = '#f3eee2';
        x.beginPath();
        x.roundRect(-h, -h, s, s, s * 0.14);
        x.fill();
        x.shadowColor = 'rgba(0,0,0,0)';
        const g = x.createLinearGradient(-h, -h, h, h);
        g.addColorStop(0, p.motif === 1 ? '#2fa39c' : '#2c58b8');
        g.addColorStop(1, p.motif === 1 ? '#13625c' : '#132e78');
        x.fillStyle = g;
        x.beginPath();
        x.roundRect(-h * 0.84, -h * 0.84, s * 0.84, s * 0.84, s * 0.1);
        x.fill();
        x.save();
        x.scale(s * 0.62, s * 0.62);
        x.fillStyle = '#f4f0e6';
        if (p.motif === 2) x.fill(this.shapes.tulip);
        else x.fill(this.shapes.star);
        x.restore();
        x.fillStyle = '#c23a2c';
        x.beginPath();
        x.arc(0, p.motif === 2 ? s * 0.05 : 0, s * 0.08, 0, Math.PI * 2);
        x.fill();
        const sh = x.createLinearGradient(-h, -h, h, h);
        sh.addColorStop(0, 'rgba(255,255,255,0.35)');
        sh.addColorStop(0.4, 'rgba(255,255,255,0)');
        x.fillStyle = sh;
        x.beginPath();
        x.roundRect(-h, -h, s, s, s * 0.14);
        x.fill();
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
