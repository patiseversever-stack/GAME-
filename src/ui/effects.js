// Efektler: kontrollü kamera tepkisi, sofistike konfeti, hafif ortam tozu.
// Her şey seçici: düşük kalitede ve "hareketi azalt" modunda kapalı/sadeleşir.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ───────────────────────── Kamera (yalnızca yüzey; taşlar/HUD etkilenmez) ─────────────────────────
export class Camera {
  constructor(el, getMotion) {
    this.el = el;
    this.getMotion = getMotion;
  }
  // kind: 'push' (yavaş yakınlaş), 'punch' (kısa vuruş), 'shake' (ceza: çok hafif), 'settle'
  play(kind) {
    if (this.getMotion() === 'reduced' || !this.el.animate) return;
    const e = 'cubic-bezier(.2,.8,.2,1)';
    if (kind === 'push') this.el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03) translateY(-6px)' }, { transform: 'scale(1)' }], { duration: 1500, easing: e });
    else if (kind === 'punch') this.el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.022) translateY(3px)', offset: 0.18 }, { transform: 'scale(1)' }], { duration: 520, easing: e });
    else if (kind === 'shake')
      this.el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)', offset: 0.15 }, { transform: 'translateX(3px)', offset: 0.35 }, { transform: 'translateX(-2px)', offset: 0.55 }, { transform: 'translateX(1px)', offset: 0.75 }, { transform: 'translateX(0)' }],
        { duration: 360, easing: 'ease-out' }
      );
    else if (kind === 'intro') this.el.animate([{ transform: 'scale(1.07) translateY(-16px)', opacity: 0.4 }, { transform: 'scale(1) translateY(0)', opacity: 1 }], { duration: 1400, easing: e });
  }
}

// ───────────────────────── Konfeti (ince kâğıt şeritler + küçük metalik pullar) ─────────────────────────
export class Confetti {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ps = [];
    this.raf = 0;
    this.last = 0;
    this.colors = ['#e9c77b', '#f4e6bd', '#c9a45c', '#9fd0c4', '#e7a09a', '#f2efe6'];
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
        life: 0,
        max: 1.8 + Math.random() * 1.4,
        metal: Math.random() < 0.3,
      });
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
