
/* =====================================================================
   AKSİYON — Sıçra (gölge atılımı), Işık Perileri, Güneş Patlaması,
   Gölge Serisi
   ===================================================================== */
const DASH_CD = 3.2, DASH_DUR = 0.34, DASH_MUL = 3.4, WISP_LIFE = 7.5;

/* ---------- ışık perileri: Zifir'e süzülen güneş kıvılcımları ----------
   Gölgedeyken ya da sıçrarken dokunursa Zifir onu yutar (enerji);
   ışıkta dokunursa patlar ve yakar. */
const WISP_CORE = new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(3.2, 2.4, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const WISP_HALO = new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(1.6, 0.9, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const wisps = {
  items: [],
  clear() { for (const w of this.items) scene.remove(w.g); this.items = []; },
  reset(lv) {
    this.clear();
    for (const sp of lv.sprites || []) {
      const g = new THREE.Group(), core = new THREE.Sprite(WISP_CORE.clone()), halo = new THREE.Sprite(WISP_HALO.clone());
      core.scale.setScalar(0.42); halo.scale.setScalar(1.5); g.add(halo, core); g.visible = false; scene.add(g);
      this.items.push({ sp, g, core, halo, state: 0, t: 0, x: sp.x, y: 1.4, z: sp.z, vx: 0, vz: 0, ph: Math.random() * TAU });
    }
  },
  remaining() { return this.items.filter((w) => w.state < 2).length; },
  // oyun adımı: dokunma sonucu döner
  step(dt, T, zx, zz, shaded, dashing) {
    let ev = null;
    for (const w of this.items) {
      if (w.state === 0 && T >= w.sp.t) {
        w.state = 1; w.t = 0; w.g.visible = true;
        FX.burst(w.x, 0.3, w.z, 16, { add: true, c: [2.6, 1.7, 0.6], a: 1, s: 0.14, s1: 0.02, life: 0.7, sp: 2.4, up: 1.6, drag: 2, t: 2 });
        audio.sprite(1); ev = ev || { kind: 'spawn', w };
      }
      if (w.state !== 1) continue;
      w.t += dt;
      const dx = zx - w.x, dz = zz - w.z, d = Math.hypot(dx, dz) || 1;
      const sp = 1.6 + Math.min(1, w.t * 0.6) * 1.5;
      const wob = Math.sin(w.t * 5 + w.ph) * 0.9;
      w.vx = damp(w.vx, (dx / d) * sp + (-dz / d) * wob, 3, dt); w.vz = damp(w.vz, (dz / d) * sp + (dx / d) * wob, 3, dt);
      w.x += w.vx * dt; w.z += w.vz * dt; w.y = damp(w.y, d < 2 ? 0.42 : 0.9 + Math.sin(w.t * 3.1 + w.ph) * 0.25, 3, dt);
      if (d < 0.5 && w.y < 0.75) {
        w.state = 2; w.g.visible = false;
        if (shaded || dashing) { ev = { kind: 'eat', w }; FX.burst(w.x, 0.35, w.z, 22, { add: true, c: [1.2, 0.7, 2.6], a: 1, s: 0.16, s1: 0.02, life: 0.8, sp: 3, up: 0.6, drag: 2.4, t: 2 }); }
        else { ev = { kind: 'hit', w }; FX.burst(w.x, 0.35, w.z, 30, { add: true, c: [3, 1.5, 0.4], a: 1, s: 0.2, s1: 0.02, life: 0.6, sp: 4, up: 1, drag: 2, t: 2 }); for (let i = 0; i < 10; i++) FX.ember(w.x, 0.35, w.z); }
      } else if (w.t > WISP_LIFE) {
        w.state = 2; w.g.visible = false; FX.burst(w.x, w.y, w.z, 10, { add: true, c: [1.4, 1.0, 0.5], a: 0.6, s: 0.1, s1: 0.02, life: 0.5, sp: 1.2, drag: 2, t: 2 });
      }
    }
    return ev;
  },
  // görsel: her karede (duraklatmada da)
  update(dtR, t) {
    for (const w of this.items) {
      if (w.state !== 1) continue;
      w.g.position.set(w.x, w.y, w.z);
      const p = 0.85 + Math.sin(t * 13 + w.ph) * 0.15;
      w.core.scale.setScalar(0.38 * p); w.halo.scale.setScalar(1.35 + Math.sin(t * 4 + w.ph) * 0.2);
      if (Math.random() < dtR * 26) fxAdd.spawn(w.x + (Math.random() - 0.5) * 0.2, w.y + (Math.random() - 0.5) * 0.2, w.z + (Math.random() - 0.5) * 0.2, -w.vx * 0.15, 0.2, -w.vz * 0.15, { c: [2.4, 1.5, 0.5], a: 0.9, s: 0.1, s1: 0.01, life: 0.5, drag: 1.5 });
    }
  },
};

/* ---------- güneş patlaması ---------- */
const flare = {
  phase: 0, k: 0, warnK: 0, nextIdx: 0,
  reset() { this.phase = 0; this.k = 0; this.warnK = 0; },
  update(lv, T, dtR, playing) {
    const ph = playing ? flarePhase(lv, T) : 0;
    if (ph !== this.phase) {
      if (ph === 1) { audio.flareWarn(); haptic(10); }
      if (ph === 2) {
        audio.flareBurst(); haptic([20, 30, 20]);
        G.flash = Math.max(G.flash, 0.4); G.flashCol.set(1.0, 0.75, 0.4); G.trauma = Math.max(G.trauma, 0.3); G.fovKick = 2.2;
        const p = orb.g.position; FX.burst(p.x, p.y, p.z, 40, { add: true, c: [3, 1.8, 0.6], a: 1, s: 0.3, s1: 0.04, life: 1.0, sp: 6, drag: 1.6, t: 2 });
      }
      this.phase = ph;
    }
    this.k = damp(this.k, ph === 2 ? 1 : 0, ph === 2 ? 10 : 3, dtR);
    this.warnK = damp(this.warnK, ph === 1 ? 1 : 0, 8, dtR);
    // gökten ateş kıvılcımları
    if (this.k > 0.1 && Math.random() < dtR * 40 * this.k) {
      const ch = lv.chunks[Math.floor(Math.random() * lv.chunks.length)];
      fxAdd.spawn(ch.cx + (Math.random() - 0.5) * ch.hx * 2, 5 + Math.random() * 3, ch.cz + (Math.random() - 0.5) * ch.hz * 2, L1.x * -1.5, -2.5, L1.z * -1.5, { c: [3, 1.4, 0.35], a: 0.9, s: 0.08, s1: 0.02, life: 1.6, drag: 0.4 });
    }
    // HUD
    const el = $('#flareBar');
    const cls = ph === 2 ? 'burn' : ph === 1 ? 'warn' : '';
    if (el.dataset.c !== cls) { el.dataset.c = cls; el.className = cls; }
    if (ph === 1) { const f = lv.flares.find((q) => T >= q.w && T < q.a); if (f) el.style.setProperty('--p', ((T - f.w) / (f.a - f.w)).toFixed(3)); }
    if (ph === 2) { const f = lv.flares.find((q) => T >= q.a && T <= q.e); if (f) el.style.setProperty('--p', (1 - (T - f.a) / (f.e - f.a)).toFixed(3)); }
  },
};

/* ---------- sıçra & seri ---------- */
const act = {
  dashCd: 0, dashT: 0, shadeT: 0, streak: 0, best: 0, eaten: 0, litT: 0,
  reset() { this.dashCd = 0; this.dashT = 0; this.shadeT = 0; this.streak = 0; this.best = 0; this.eaten = 0; this.litT = 0; this.hud(true); },
  canDash() { const lv = G.lv; return !!(lv && lv.spec.dash) && G.state === 'play' && G.T > lv.walkDelay && this.dashCd <= 0 && !G.waiting; },
  dash() {
    if (!this.canDash()) return false;
    this.dashT = DASH_DUR; this.dashCd = DASH_CD;
    audio.dash(); haptic(14); zifir.kick(-2.2); G.fovKick = 3; G.ca = Math.max(G.ca, 0.008);
    const x = zifir.g.position.x, z = zifir.g.position.z;
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; fxMix.spawn(x, 0.25 + Math.random() * 0.3, z, Math.cos(a) * 1.4, 0.4, Math.sin(a) * 1.4, { c: [0.05, 0.03, 0.09], a: 0.7, s: 0.22, s1: 0.04, life: 0.45, drag: 2, t: 1 }); }
    return true;
  },
  speedMul() { return this.dashT > 0 ? DASH_MUL : 1; },
  step(dt, f, walking) {
    if (this.dashT > 0) {
      this.dashT -= dt; pathAt(G.lv.path, G.s, PA);
      const x = PA.x, z = PA.z;
      fxMix.spawn(x + (Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.3, 0, 0.3, 0, { c: [0.06, 0.03, 0.12], a: 0.8, s: 0.3, s1: 0.05, life: 0.5, drag: 2, t: 1 });
      fxAdd.spawn(x, 0.3, z, (Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.5, { c: [0.8, 0.5, 2.2], a: 0.8, s: 0.12, s1: 0.01, life: 0.4, drag: 2, t: 2 });
    }
    this.dashCd = Math.max(0, this.dashCd - dt);
    if (!walking) return;
    if (f === 0) {
      this.shadeT += dt; this.litT = 0;
      const lvl = Math.min(9, Math.floor(this.shadeT / 4));
      if (lvl > this.streak) {
        this.streak = lvl; this.best = Math.max(this.best, lvl); audio.streak(lvl);
        const x = zifir.g.position.x, z = zifir.g.position.z;
        popText(x, 1.05, z, `gölge ×${lvl + 1}`);
        FX.burst(x, 0.4, z, 10 + lvl * 2, { add: true, c: [0.9, 0.6, 2.4], a: 0.9, s: 0.12, s1: 0.02, life: 0.7, sp: 2, up: 1, drag: 2.5, t: 2 });
      }
    } else {
      this.litT += dt;
      if (this.litT > 0.18 && this.shadeT > 0) { this.shadeT = 0; this.streak = 0; }
    }
    // seri aurası
    if (this.streak >= 2 && Math.random() < dt * this.streak * 4) { const x = zifir.g.position.x, z = zifir.g.position.z; fxAdd.spawn(x + (Math.random() - 0.5) * 0.4, 0.15, z + (Math.random() - 0.5) * 0.4, 0, 0.6 + Math.random() * 0.5, 0, { c: [0.6, 0.35, 1.8], a: 0.7, s: 0.08, s1: 0.01, life: 0.8, drag: 1 }); }
    this.hud();
  },
  hud(force = false) {
    const lv = G.lv; if (!lv) return;
    const b = $('#dashBtn'), show = !!lv.spec.dash;
    if (force || b.dataset.s !== String(show)) { b.dataset.s = String(show); b.classList.toggle('show', show); }
    const p = (1 - this.dashCd / DASH_CD).toFixed(2);
    if (force || b.dataset.p !== p) { b.dataset.p = p; b.style.setProperty('--p', p); b.classList.toggle('ready', this.dashCd <= 0); }
    const st = $('#streak'), n = this.streak;
    if (force || st.dataset.n !== String(n)) { st.dataset.n = String(n); st.classList.toggle('on', n > 0); $('#streakTxt').textContent = `×${n + 1}`; if (n > 0) { st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); } }
  },
};
