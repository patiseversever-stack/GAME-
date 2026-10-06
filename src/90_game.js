
/* =====================================================================
   OYUN — durum makinesi, kamera yönetmeni, giriş, arayüz, ana döngü
   ===================================================================== */
const G = {
  state: 'boot', mode: 'story', spec: null, lv: null, view: null, outView: null, chapIdx: 0, prevChap: 0, palT: 1,
  u: 0.0, uT: 0.0, uVel: 0, uSV: 0, drag: null, keyDir: 0, lastTick: -1,
  T: 0, s: 0, meter: 1, expTotal: 0, f: 0, burnEp: 0, epMin: 1, waiting: false,
  dropsGot: 0, combo: 0, ecl: { charge: 0, active: false, t: 0, amt: 0 },
  timeScale: 1, slowT: 0, slowK: 1, hitStop: 0, flash: 0, flashCol: new THREE.Color(1, 0.9, 0.7), trauma: 0, fovKick: 0, desat: 0, ca: 0,
  night: 0, nightR: 0, stateT: 0, introDur: 1.9, readyT: 0, hint: false, auto: false, nextHeart: 0, hapT: 0,
  endless: null, cache: new Map(), flown: new Set(), stars: [false, false, false], from: 'title', zifirScale: 1, beatT: 0, helpK: 1,
};
const PATIENCE_MAX = 3.0, PATIENCE_REGEN = 0.18, FLY_DUR = 5.6;
// güneşin merhameti: aynı adada 2. başarısızlıktan sonra her denemede ışık %10 daha az yakar (en fazla %50), gölgede can daha hızlı dolar
const helpFor = (lv) => { const n = lv.spec.night ? NightAct.data().fails[lv.spec.g] || 0 : lv.spec.kind === 'story' ? Save.data.fails[lv.spec.g] || 0 : 0; return n < 2 ? 1 : Math.max(0.5, 1 - 0.1 * (n - 1)); };
const zifir = new Zifir();
Rent.sweep(); zifir.setCostume(Save.data.costume || ''); zifir.setSkin(Save.data.skin || 0); zifir.setGlow(Save.data.glow || '');
const drops = new DropViews();
/* ---------- iz: yandığın yerde kül lekesi, en uzağa gittiğin yerde altın çizgi ----------
   Her kayıp bir ilerleme gibi hissettirsin: oyuncu nerede zorlandığını ve rekorunu yolda görür. */
const Marks = {
  g: new THREE.Group(), ash: [], line: null, bestS: -1, deaths: [], key: '', pulse: 0,
  init() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, r = Math.random() * 38, rr = 8 + Math.random() * 20; const gr = x.createRadialGradient(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 0, 64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rr); gr.addColorStop(0, 'rgba(14,9,24,0.85)'); gr.addColorStop(1, 'rgba(14,9,24,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},60,${0.5 + Math.random() * 0.4})`; x.beginPath(); x.arc(30 + Math.random() * 68, 30 + Math.random() * 68, 1 + Math.random() * 1.8, 0, TAU); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.x = -PI / 2; m.renderOrder = 2; m.visible = false; this.g.add(m); this.ash.push(m);
    }
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.6), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    this.line = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.07), lm); bar.rotation.x = -PI / 2; bar.position.y = 0.03; this.line.add(bar);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.4), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 0.26; this.line.add(beam); this.line.userData = { bar, beam };
    this.line.visible = false; this.g.add(this.line);
    scene.add(this.g);
  },
  // yeni adaya girince (ya da başka bir adaya geçince) izler sıfırlanır
  reset(lv) { const k = specKey(lv.spec); if (k !== this.key) { this.key = k; this.deaths = []; } this.refresh(lv); },
  bestFor(lv) { if (lv.spec.kind !== 'story' || Save.data.levels[lv.spec.g]) return -1; const b = (Save.data.best || {})[lv.spec.g]; return b ? b * lv.length : -1; },
  refresh(lv) {
    const P = {};
    this.ash.forEach((m, i) => { const d = this.deaths[this.deaths.length - 1 - i]; m.visible = d != null; if (d == null) return; pathAt(lv.path, d, P); m.position.set(P.x, 0.025 + i * 0.002, P.z); m.rotation.z = d * 3.1; m.scale.setScalar(0.95 - i * 0.12); m.material.opacity = 0.8 - i * 0.22; });
    this.bestS = this.bestFor(lv);
    const show = this.bestS > 1.2 && this.bestS < lv.length - 0.5;
    this.line.visible = show;
    if (show) { pathAt(lv.path, this.bestS, P); this.line.position.set(P.x, 0, P.z); this.line.rotation.y = Math.atan2(P.tx, P.tz); }
  },
  died(lv, s) { this.deaths.push(s); if (this.deaths.length > 3) this.deaths.shift(); },
  update(dtR) {
    if (!this.line.visible) return;
    this.pulse += dtR; const u = this.line.userData, k = 0.75 + Math.sin(this.pulse * 3) * 0.25;
    u.bar.material.opacity = 0.85 * k; u.beam.material.opacity = 0.2 * k;
    // bu denemede rekor geçildi: çizgi parlayıp söner
    if (G.state === 'play' && !G.passedBest && G.s > this.bestS) {
      G.passedBest = true; this.line.visible = false; audio.chime && audio.chime();
      popText(this.line.position.x, 1.0, this.line.position.z, 'rekor!');
      FX.burst(this.line.position.x, 0.2, this.line.position.z, 18, { add: true, c: [2.6, 1.8, 0.6], a: 1, s: 0.12, s1: 0.02, life: 0.8, sp: 2.2, up: 1.2, drag: 2, t: 2 });
    }
  },
};
Marks.init();
// kutlama: gökyüzünden altın yıldız yağmuru
function starRain(n = 70) {
  const c = G.lv ? Cam.base.target : new THREE.Vector3();
  for (let i = 0; i < n; i++) setTimeout(() => fxAdd.spawn(c.x + (Math.random() - 0.5) * 12, 7 + Math.random() * 3, c.z + (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 0.4, -1.5 - Math.random(), (Math.random() - 0.5) * 0.4, { c: Math.random() < 0.7 ? [2.6, 1.9, 0.7] : [1.6, 1.4, 2.6], a: 1, s: 0.34, s1: 0.12, life: 2.4 + Math.random(), drag: 0.25, g: -1.4, t: 2 }), i * 22);
}
const L1 = new THREE.Vector3(), L2 = new THREE.Vector3(), PA = {};
/* ---------- Gölge Kuşları (D5) ----------
   Zifir gölgede yürüdükçe mürekkepten kuşlar gelip ardında süzülür; ışığa çıkınca birer birer ürküp kaçarlar.
   Kapıya kaç kuşla vardığın bitiş ekranında sayılır (adaya özel rekor). Zorluğu değiştirmez; yalnızca gölgede
   kalmayı ödüllendiren bir sürü. Tek çizim çağrısı (12 örnekli InstancedMesh), kanat çırpma GPU'da. */
const BIRD_MAX = 12, BIRD_JOIN = 1.2, BIRD_FLEE = 0.3, FLOCK_MIN = 4;
// Kuş Kalkanı: biriken sürü bir dokunuşla salınır, Zifir'in üstünde dönen bir gölge kubbesi olur (kuş başına süre)
const flockAvail = (lv) => !!lv && (lv.spec.kind !== 'story' || lv.spec.g >= 9);
const ShadowBirds = {
  n: 0, shadeT: 0, lightT: 0, birds: [], last: 0, best: 0, rec: false, canT: 0, canDur: 0, canN: 0, shK: 0,
  init() {
    // gövde + kuyruk + iki kanat (kanat ucu |x|'e göre GPU'da çırpılır)
    const V = [0, 0, 0.15, -0.035, 0, -0.02, 0.035, 0, -0.02, -0.035, 0, -0.02, 0.035, 0, -0.02, 0, 0, -0.12, 0, 0, -0.07, -0.065, 0, -0.2, 0.065, 0, -0.2];
    for (const sx of [-1, 1]) V.push(sx * 0.03, 0, 0.055, sx * 0.03, 0, -0.05, sx * 0.13, 0, 0.045, sx * 0.13, 0, 0.045, sx * 0.03, 0, -0.05, sx * 0.23, 0, -0.035);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(V, 3));
    g.setAttribute('aWing', new THREE.Float32BufferAttribute(V.map((_, i) => (i % 3 === 0 ? (i >= 27 ? 1 : 0) : null)).filter((v) => v !== null), 1));
    this.flap = new THREE.InstancedBufferAttribute(new Float32Array(BIRD_MAX * 2), 2).setUsage(THREE.DynamicDrawUsage); g.setAttribute('aFlap', this.flap);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec2 aFlap; attribute float aWing; varying float vE;
        void main(){ vec3 p = position; float r = abs(p.x);
          if (aWing > 0.5) { float a = sin(aFlap.x) * aFlap.y + 0.12; float k = max(0.0, r - 0.03); p.x = sign(p.x) * (0.03 + k * cos(a)); p.y = k * sin(a); }
          vE = aWing * clamp(r / 0.23, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform vec3 uRim; uniform float uGlow; varying float vE; void main(){ gl_FragColor = vec4(mix(vec3(0.018, 0.012, 0.035), uRim * (0.35 + uGlow * 1.6), smoothstep(0.55 - uGlow * 0.3, 1.0, vE)), 1.0); }`,
      uniforms: { uRim: zifir.u.uRim, uGlow: { value: 0 } }, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(g, mat, BIRD_MAX); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < BIRD_MAX; i++) this.birds.push({ st: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), a: 0, r: 1, h: 1.5, w: 1, ph: Math.random() * 10, amp: 0, t: 0, yaw: 0, roll: 0 });
    // kubbenin yere düşen gölgesi (oyuncuya korunduğunu açıkça gösterir)
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d'), gr = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(10,6,22,0.9)'); gr.addColorStop(0.55, 'rgba(10,6,22,0.82)'); gr.addColorStop(0.8, 'rgba(10,6,22,0.35)'); gr.addColorStop(1, 'rgba(10,6,22,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    const stx = new THREE.CanvasTexture(sc);
    this.shade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: stx, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.shade.rotation.x = -PI / 2; this.shade.renderOrder = 3; this.shade.visible = false; scene.add(this.shade);
    this.hideAll(); scene.add(this.mesh);
  },
  hideAll() { for (const b of this.birds) b.st = 0; this.n = 0; this.shadeT = 0; this.lightT = 0; this.canT = 0; this.shK = 0; if (this.shade) this.shade.visible = false; this.sync(); this.hud(true); },
  // sürüyü sal: kuşlar Zifir'in tepesinde halka olur, süre boyunca güneş onu yakamaz; sonra dağılırlar (sayımdan düşer)
  release() {
    if (G.state !== 'play' || this.canT > 0 || !flockAvail(G.lv) || !Abil.shown('flock')) return false;
    const n = this.count(); if (n < FLOCK_MIN) return false;
    const z = zifir.g.position; this.canN = n; this.canT = this.canDur = 0.6 + Meta.val('flock') * n;
    let k = 0; const a0 = U.uTime.value * 4.4;
    for (const b of this.birds) if (b.st === 1 || b.st === 2) { b.st = 4; b.t = 0; b.a = a0 + (k++ / n) * TAU; }
    this.n = 0; this.shadeT = 0; G.flockUsed = (G.flockUsed || 0) + 1; Abil.used('flock'); Meta.ev('flock');
    audio.flockOn && audio.flockOn(n); haptic([10, 24, 10]); zifir.kick(-1.6); this.hud(true);
    return true;
  },
  endCanopy() { this.canT = 0; for (const b of this.birds) if (b.st === 4) this.flee(b); audio.shadowFlee && audio.shadowFlee(); this.hud(true); },
  hud(force = false) {
    const el = this._btn || (this._btn = $('#flockBtn')); if (!el) return;
    const show = flockAvail(G.lv) && Abil.shown('flock') && (G.state === 'play' || G.state === 'ready'), n = this.canT > 0 ? 0 : this.count(), key = `${show}|${n}|${this.canT > 0}`;
    if (!force && el.dataset.k === key) return; el.dataset.k = key;
    el.classList.toggle('show', show); el.classList.toggle('ready', n >= FLOCK_MIN); el.classList.toggle('active', this.canT > 0);
    el.style.setProperty('--p', (this.canT > 0 ? 1 : n / BIRD_MAX).toFixed(3)); el.querySelector('b').textContent = n;
  },
  count() { let n = 0; for (const b of this.birds) if (b.st === 1 || b.st === 2) n++; return n; },
  join() {
    const b = this.birds.find((q) => q.st === 0); if (!b) return;
    const z = zifir.g.position, a0 = Math.random() * TAU;
    b.st = 1; b.t = 0; b.p.set(z.x + Math.cos(a0) * 13, 6 + Math.random() * 2, z.z + Math.sin(a0) * 13); b.v.set(-Math.cos(a0) * 4, -1, -Math.sin(a0) * 4);
    b.a = Math.random() * TAU; b.r = 0.75 + Math.random() * 0.75; b.h = 1.25 + Math.random() * 0.8; b.w = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.7);
    this.n = this.count(); if (this.n > this.best) this.best = this.n;
    audio.shadowBird && audio.shadowBird(this.n);
  },
  fleeOne() {
    let b = null; for (const q of this.birds) if (q.st === 2 || q.st === 1) { b = q; break; }
    if (!b) return; this.flee(b); this.n = this.count();
    const now = performance.now(); if (now - this.last > 250) { this.last = now; audio.shadowFlee && audio.shadowFlee(); }
  },
  flee(b) { const z = zifir.g.position; b.st = 3; b.t = 0; const dx = b.p.x - z.x, dz = b.p.z - z.z, l = Math.hypot(dx, dz) || 1; b.v.set((dx / l) * 5, 3.5, (dz / l) * 5); },
  scatter() { for (const b of this.birds) if (b.st === 1 || b.st === 2) this.flee(b); this.n = 0; },
  update(dt) {
    if (!G.lv || dt <= 0) return;
    if (G.state !== 'play' && !this.birds.some((b) => b.st)) { if (this.dirty) { this.dirty = false; this.sync(); } this.hud(); return; } // sürü yokken iş yok (düğme hazırlıkta da görünür)
    this.dirty = true;
    if (this.canT > 0 && (this.canT -= dt) <= 0) this.endCanopy();
    if (G.state === 'play' && G.T > G.lv.walkDelay && !(this.canT > 0)) {
      if (G.f > 0.1 && G.breathT <= 0) { this.shadeT = 0; if ((this.lightT += dt) > BIRD_FLEE) { this.lightT = 0; this.fleeOne(); } }
      else { this.lightT = Math.max(0, this.lightT - dt * 0.5); if (G.f === 0 && !G.holding && !G.waiting && (this.shadeT += dt) > BIRD_JOIN) { this.shadeT = 0; this.join(); } }
    }
    const z = zifir.g.position; pathAt(G.lv.path, Math.min(G.s, G.lv.length), PB);
    const cx = z.x - PB.tx * 0.7, cz = z.z - PB.tz * 0.7, t = U.uTime.value;
    for (const b of this.birds) {
      if (!b.st) continue;
      b.t += dt;
      if (b.st === 3) { b.v.y += 2.5 * dt; b.v.multiplyScalar(1 + dt * 0.6); if (b.t > 2.4) { b.st = 0; continue; } b.amp = 1.1; }
      else if (b.st === 4) {
        // kubbe: Zifir'in tepesinde sıkı, hızlı dönen halka
        b.a += 4.4 * dt;
        const rr = 0.8 + 0.12 * Math.sin(b.ph * 3.1), tx = z.x + Math.cos(b.a) * rr, ty = 1.3 + Math.sin(t * 7 + b.ph) * 0.09, tz = z.z + Math.sin(b.a) * rr;
        const k = 1 - Math.exp(-14 * dt), gx = clamp((tx - b.p.x) * 14, -22, 22), gy = clamp((ty - b.p.y) * 14, -22, 22), gz = clamp((tz - b.p.z) * 14, -22, 22);
        b.v.x += (gx - b.v.x) * k; b.v.y += (gy - b.v.y) * k; b.v.z += (gz - b.v.z) * k;
        b.amp = 1.25;
      } else {
        b.a += b.w * dt;
        const tx = cx + Math.cos(b.a) * b.r, ty = b.h + Math.sin(t * 1.3 + b.ph) * 0.12, tz = cz + Math.sin(b.a) * b.r * 0.8;
        const dx = tx - b.p.x, dy = ty - b.p.y, dzz = tz - b.p.z, d = Math.hypot(dx, dy, dzz) || 1e-4;
        const vmax = b.st === 1 ? 7.5 : 5, sp = Math.min(vmax, d * 3.2);
        const k = 1 - Math.exp(-(b.st === 1 ? 3.2 : 5) * dt);
        b.v.x += ((dx / d) * sp - b.v.x) * k; b.v.y += ((dy / d) * sp - b.v.y) * k; b.v.z += ((dzz / d) * sp - b.v.z) * k;
        if (b.st === 1 && d < 0.5) b.st = 2;
        b.amp = damp(b.amp, b.st === 1 || b.v.y > 0.6 ? 1.0 : 0.38 + 0.25 * Math.max(0, Math.sin(t * 0.7 + b.ph)), 4, dt);
      }
      b.p.addScaledVector(b.v, dt);
      const hs = Math.hypot(b.v.x, b.v.z);
      if (hs > 0.05) { let dy = Math.atan2(b.v.x, b.v.z) - b.yaw; while (dy > PI) dy -= TAU; while (dy < -PI) dy += TAU; b.yaw += dy * (1 - Math.exp(-8 * dt)); b.roll = damp(b.roll, clamp(-dy * 2.5, -0.7, 0.7), 6, dt); }
      b.ph += dt * (7 + b.amp * 7); if (b.ph > 6283.185) b.ph -= 6283.185;
    }
    // kubbenin gölgesi: süre azaldıkça daralır (ne kadar kaldığı görülür)
    const life = this.canT > 0 ? this.canT / this.canDur : 0;
    this.shK = damp(this.shK, this.canT > 0 ? 1 : 0, this.canT > 0 ? 10 : 5, dt);
    this.mesh.material.uniforms.uGlow.value = this.shK;
    if (this.shK > 0.01) { const sh = this.shade; sh.visible = true; sh.position.set(z.x, 0.04, z.z); sh.scale.setScalar((2.4 + 1.3 * life) * (0.94 + 0.06 * Math.sin(t * 9))); sh.material.opacity = 0.78 * this.shK; }
    else if (this.shade.visible) this.shade.visible = false;
    this.hud();
    this.sync();
  },
  sync() {
    const m = _bm, q = _bq, e = _be, sc = _bs;
    this.birds.forEach((b, i) => {
      if (!b.st) { m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m); this.flap.setXY(i, 0, 0); return; }
      const pitch = clamp(-b.v.y * 0.12, -0.5, 0.5);
      e.set(pitch, b.yaw, b.roll, 'YXZ'); q.setFromEuler(e); sc.setScalar(b.st === 1 ? Math.min(1, b.t * 2) : b.st === 4 ? 1.4 : 1);
      m.compose(b.p, q, sc); this.mesh.setMatrixAt(i, m); this.flap.setXY(i, b.ph, b.amp);
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.flap.needsUpdate = true;
  },
  // kapıda sayım: adaya özel rekor (yalnız hikâye)
  finish() {
    const n = this.count(); this.rec = false;
    if (G.mode === 'story') { const d = Save.data, g = G.lv.spec.g; d.birds = d.birds || {}; const old = d.birds[g] || 0; if (n > old) { d.birds[g] = n; this.rec = old > 0; Save.save(); } this.prev = old; }
    return n;
  },
};
const PB = {}, _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bs = new THREE.Vector3();
ShadowBirds.init();
const ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.8, 0.9, 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
ghost.scale.setScalar(2.2); ghost.visible = false; scene.add(ghost);
/* ---------- ışık izi: zorlanınca (aynı adada 2 kayıptan sonra) kendiliğinden açılır ----------
   Çözücünün planındaki güneş, yayın üstünde parlayan bir hayalet ve önünde sönümlenen bir kuyruk olarak görünür;
   oyuncunun güneşi plandan uzaklaştıkça iz belirginleşir. */
const ghostTrail = [];
for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(1.1, 0.95, 1.7), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); s.scale.setScalar(1.15 - i * 0.12); s.visible = false; scene.add(s); ghostTrail.push(s); }
function updateHint(lv, on) {
  if (!on || !lv.solution) { if (ghost.visible) { ghost.visible = false; ghost.material.opacity = 0; for (const s of ghostTrail) s.visible = false; } return; }
  if (!ghost.visible) { ghost.visible = true; for (const s of ghostTrail) s.visible = true; }
  const sol = lv.solution, t = U.uTime.value, at = (a) => sol.traj[Math.min(sol.K - 1, Math.max(0, Math.round((G.T + a) / sol.dt)))];
  const u0 = at(0.45), far = Math.min(1, Math.abs(G.u - u0) * 6);
  orbPosInto(u0, lv.sun.tilt, lv.sun.thMin, ghost.position);
  ghost.material.opacity = (0.42 + Math.sin(t * 5) * 0.12) * (0.75 + far * 0.45); ghost.scale.setScalar(2.1 + far * 0.7 + Math.sin(t * 5) * 0.12);
  ghostTrail.forEach((s, i) => { orbPosInto(at(0.8 + i * 0.32), lv.sun.tilt, lv.sun.thMin, s.position); s.material.opacity = 0.34 * (1 - i / 6.5) * (0.7 + 0.3 * Math.sin(t * 4 - i * 0.9)); });
}
const failsOn = (lv) => (lv.spec.night ? NightAct.data().fails[lv.spec.g] || 0 : lv.spec.kind === 'story' ? Save.data.fails[lv.spec.g] || 0 : 0);

/* ---------- arayüz yardımcıları ---------- */
const UI = {
  screens: ['title', 'complete', 'fail', 'pause', 'settings', 'map', 'ending', 'theater', 'photo', 'hz'],
  show(id) { $('#' + id).classList.add('on'); },
  hide(id) { $('#' + id).classList.remove('on'); },
  hideAll() { for (const s of this.screens) this.hide(s); },
  hud(on) { $('#hud').classList.toggle('on', on); },
};
function haptic(p) { if (Save.data.settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
let toastTimer = 0;
function toast(html, dur = 3.2) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastTimer); if (dur > 0) toastTimer = setTimeout(() => t.classList.remove('on'), dur * 1000); }
function hideToast() { clearTimeout(toastTimer); $('#toast').classList.remove('on'); }
function tip(key, html, dur = 3.6) { if (Save.seen(key)) return false; Save.markSeen(key); toast(html, dur); return true; }
function banner(text, sub = '') { const b = $('#banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.classList.toggle('low', G.state === 'complete' && G.mode !== 'endless'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
const pops = [];
function popText(x, y, z, text) { const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; $('#pops').appendChild(el); pops.push({ el, p: new THREE.Vector3(x, y, z), t: 0 }); }
const _pv = new THREE.Vector3();
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt; p.p.y += dt * 0.9;
    _pv.copy(p.p).project(camera);
    const x = (_pv.x * 0.5 + 0.5) * innerWidth, y = (-_pv.y * 0.5 + 0.5) * innerHeight;
    const a = p.t < 0.15 ? p.t / 0.15 : 1 - Math.max(0, (p.t - 0.6) / 0.4);
    p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${1 + Math.max(0, 0.3 - p.t) * 1.5})`; p.el.style.opacity = a;
    if (p.t > 1) { p.el.remove(); pops.splice(i, 1); }
  }
}

/* ---------- kamera yönetmeni ---------- */
const Cam = {
  base: { target: new THREE.Vector3(0, 0, 0), dist: 34, pitch: deg(54), yaw: 0, fov: 46 },
  cur: { target: new THREE.Vector3(0, 0, 0), dist: 34, pitch: deg(54), yaw: 0, fov: 46 },
  cine: null, follow: new THREE.Vector3(), zoom: 1, flight: null,
  // ada önizleme uçuşu: kamera yolu baştan kapıya alçaktan izler, sonra yerine oturur (dokununca atlanır)
  fly(lv, dur) {
    this.flight = { t: 0, dur, lv, side: lv.spec.seed % 2 ? 1 : -1, wh: false }; this.cine = null;
    const sp = lv.spec; $('#cbTitle').textContent = sp.kind === 'daily' ? 'Günün Adası' : sp.kind === 'bonus' ? 'Gizli Ada' : `Ada ${sp.g + 1}`; $('#cbSub').textContent = lv.chap.name;
    $('#cineBars').classList.add('on'); document.body.classList.add('cine');
  },
  endFlight() { $('#cineBars').classList.remove('on'); document.body.classList.remove('cine'); },
  skipFlight() { if (!this.flight) return; this.flight = null; this.endFlight(); this.cinema(this.pose(), 0.7, Ease.outCubic); },
  set(o, pose) { o.target.copy(pose.target); o.dist = pose.dist; o.pitch = pose.pitch; o.yaw = pose.yaw; o.fov = pose.fov; },
  place(cam, pose) {
    const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
    cam.position.set(pose.target.x + Math.sin(pose.yaw) * cp * pose.dist, pose.target.y + sp * pose.dist, pose.target.z + Math.cos(pose.yaw) * cp * pose.dist);
    cam.fov = pose.fov; cam.updateProjectionMatrix(); cam.lookAt(pose.target);
  },
  solveFit(lv, o) {
    const aspect = innerWidth / innerHeight;
    const fov = aspect < 0.62 ? 50 : aspect < 1 ? 46 : 38;
    const pitch = deg(aspect < 1 ? 55 : 50);
    const pts = [];
    for (const ch of lv.chunks) for (let i = 0; i < ch.pts.length; i += 6) pts.push(new THREE.Vector3(ch.pts[i][0], 0, ch.pts[i][1]));
    pts.push(new THREE.Vector3(lv.gate.x, 2.4, lv.gate.z));
    const orbPts = [], v = new THREE.Vector3();
    for (const u of [0, 0.12, 0.3, 0.5, 0.7, 0.88, 1]) { orbPosInto(u, lv.sun.tilt, lv.sun.thMin, v); orbPts.push(v.clone().add(new THREE.Vector3(0, u === 0.5 ? 0.9 : 0.4, 0))); }
    if (lv.sun.twin) for (const u of [0, 0.5, 1]) { orbPosInto(u, lv.sun.tilt2, lv.sun.thMin2, v); orbPts.push(v.clone().add(new THREE.Vector3(0, 0.6, 0))); }
    const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500);
    const pose = { target: new THREE.Vector3(0, 0, 0.6), dist: 30, pitch, yaw: 0, fov };
    const bounds = (P) => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of P) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { x0, x1, y0, y1 }; };
    const up = new THREE.Vector3(0, Math.cos(pitch), -Math.sin(pitch));
    for (let it = 0; it < 48; it++) {
      this.place(cam, pose); cam.updateMatrixWorld();
      const b = bounds(pts), q = bounds(orbPts);
      const top = Math.max(b.y1, q.y1), bottom = b.y0;
      const wx0 = o.wx0 ?? -1, wx1 = o.wx1 ?? 1, ww = (wx1 - wx0) / 2;
      const rX = Math.max((b.x1 - b.x0) / (2 * o.xI * ww), (q.x1 - q.x0) / (2 * o.xO * ww));
      const rY = (top - bottom) / (o.yTop - o.yBot);
      pose.dist *= Math.pow(Math.max(rX, rY), 0.7);
      const hh = Math.tan(deg(fov / 2)) * pose.dist;
      pose.target.addScaledVector(up, ((top + bottom) / 2 - (o.yTop + o.yBot) / 2) * hh * 0.6);
      pose.target.x += ((b.x0 + b.x1) / 2 - (wx0 + wx1) / 2) * hh * aspect * 0.5;
    }
    return pose;
  },
  fit(lv) {
    const port = innerWidth < innerHeight;
    this.set(this.base, this.solveFit(lv, { yTop: port ? 0.8 : 0.84, yBot: -0.9, xI: 0.9, xO: 0.99 }));
    this.fitTitle(lv);
  },
  // karşılama kadrajı: ada (yay dahil) üstteki başlık ile alttaki düğme/reklam blokları arasındaki boşluğa sığar;
  // native yuvası açılıp kapanınca ya da ekran dönünce yeniden hesaplanır, kamera yeni kadraja yumuşakça kayar
  fitTitle(lv) {
    const W = innerWidth, H = innerHeight, port = W < H, wide = W / H > 1.25, nd = (y) => 1 - (2 * y) / H;
    const T = $('#title'), br = T && T.querySelector('.brand'), ac = T && T.querySelector('.actions'), tb = T && T.querySelector('.tbar'), nt = $('#natT');
    const tnat = document.body.classList.contains('tnat') && nt && nt.offsetHeight > 4;
    if (wide) {
      const top = tb ? tb.offsetTop + tb.offsetHeight + 8 : 0, bot = tnat ? nt.offsetTop - 10 : H;
      this.title = this.solveFit(lv, { yTop: Math.min(0.8, nd(top)), yBot: Math.max(-0.86, nd(bot)), xI: 0.92, xO: 0.98, wx0: -0.02, wx1: 0.96 });
    } else if (port && br && ac && ac.offsetHeight) {
      // kısa ekranda ada ipucu/ana düğmenin arkasına biraz taşabilir (cam düğmeler), uzun ekranda tamamen açıkta kalır
      // yay sloganın hemen altından başlar; ada ipucu şeridine çok az değebilir (yarı saydam)
      const top = br.offsetTop + br.offsetHeight + 10, bot = ac.offsetTop + (H < 700 ? 18 : 14);
      this.title = this.solveFit(lv, { yTop: Math.min(0.72, nd(top)), yBot: Math.max(-0.62, nd(bot)), xI: 0.86, xO: 0.97 });
    } else this.title = this.solveFit(lv, { yTop: port ? 0.5 : 0.56, yBot: port ? -0.62 : -0.72, xI: 0.86, xO: 0.97 });
  },
  cinema(to, dur, ease = Ease.inOutCubic) { this.cine = { from: { target: this.cur.target.clone(), dist: this.cur.dist, pitch: this.cur.pitch, yaw: this.cur.yaw, fov: this.cur.fov }, to, t: 0, dur, ease }; },
  pose(mod = {}) { const b = this.base; return { target: (mod.target || b.target).clone(), dist: mod.dist ?? b.dist, pitch: mod.pitch ?? b.pitch, yaw: mod.yaw ?? b.yaw, fov: mod.fov ?? b.fov }; },
  update(dt, dtR) {
    const c = this.cur;
    if (this.flight) {
      // üç plan: (1) ada bulutlardan yükselirken geniş yan açı, (2) yol boyunca alçak süzülüş, (3) oyun açısına yumuşak iniş
      const F = this.flight, lv = F.lv, b = this.base; F.t += dtR;
      const k = clamp01(F.t / F.dur);
      const wE = 1 - smoothstep(0.12, 0.32, k), wT = smoothstep(0.12, 0.32, k) * (1 - smoothstep(0.72, 0.94, k)), wB = 1 - wE - wT;
      const sk = Ease.inOutSine(clamp01((k - 0.14) / 0.68));
      const s0 = lerp(0.3, lv.length - 0.8, sk); pathAt(lv.path, s0, _fp); pathAt(lv.path, Math.min(lv.length, s0 + 2.8), _fq);
      const rise = Ease.outCubic(clamp01(F.t / 1.5));
      // kuruluş planı
      const ex = b.target.x, ey = lerp(-9, 0.6, rise), ez = b.target.z, eD = b.dist * lerp(1.55, 1.25, k / 0.32), eP = deg(lerp(18, 28, clamp01(k / 0.32))), eY = b.yaw + F.side * lerp(1.05, 0.7, clamp01(k / 0.32)), eF = b.fov + 5;
      // takip planı
      const tx = (_fp.x + _fq.x) / 2, tz = (_fp.z + _fq.z) / 2, tD = b.dist * (0.4 + 0.06 * Math.sin(sk * PI * 2)), tP = deg(31 + 6 * sk), tY = b.yaw + F.side * (0.42 * Math.cos(sk * PI)), tF = b.fov - 3;
      c.target.set(ex * wE + tx * wT + b.target.x * wB, ey * wE + 0.4 * wT + b.target.y * wB, ez * wE + tz * wT + b.target.z * wB);
      c.dist = eD * wE + tD * wT + b.dist * wB; c.pitch = eP * wE + tP * wT + b.pitch * wB; c.yaw = eY * wE + tY * wT + b.yaw * wB; c.fov = eF * wE + tF * wT + b.fov * wB;
      if (!F.wh && k > 0.15) { F.wh = true; audio.whoosh(false, 1.4, 0.05); }
      if (k > 0.86 && !F.out) { F.out = true; this.endFlight(); }
      if (F.t >= F.dur) { this.flight = null; this.endFlight(); }
    } else if (this.death && G.state === 'fail') {
      // ölüm sahnesi: oyun açısından seçilen yakın plana süzülür, sonra yavaşça yaklaşıp yana döner
      const D = this.death, P = D.to; D.t += dtR;
      const a = Ease.inOutSine(clamp01(D.t / D.inT)), dr = clamp01((D.t - D.inT * 0.5) / 3.2);
      let ty = P.yaw + P.orbit * dr; while (ty - D.from.yaw > PI) ty -= TAU; while (ty - D.from.yaw < -PI) ty += TAU;
      c.target.set(lerp(D.from.target.x, P.target.x, a), lerp(D.from.target.y, D.ty, a), lerp(D.from.target.z, P.target.z, a));
      c.dist = lerp(D.from.dist, P.dist * (1 - 0.08 * dr), a); c.pitch = lerp(D.from.pitch, P.pitch - 0.05 * dr, a); c.yaw = lerp(D.from.yaw, ty, a); c.fov = lerp(D.from.fov, P.fov, a);
      c.yaw += Math.sin(D.t * 1.3) * 0.005 * a; c.pitch += Math.sin(D.t * 1.7 + 1) * 0.004 * a; // hafif el kamerası
    } else if (G.state === 'photo' && G.photo) {
      // fotoğraf modu: serbest yörünge
      const b = this.base, P = G.photo;
      c.target.x = damp(c.target.x, P.tx, 6, dtR); c.target.z = damp(c.target.z, P.tz, 6, dtR); c.target.y = damp(c.target.y, 0.3, 6, dtR);
      c.yaw = damp(c.yaw, b.yaw + P.yaw, 10, dtR); c.pitch = damp(c.pitch, clamp(b.pitch + P.pitch, deg(12), deg(82)), 10, dtR); c.dist = damp(c.dist, b.dist * P.dist, 8, dtR); c.fov = b.fov;
    } else if (this.cine) {
      const k = this.cine; k.t += dtR; const e = k.ease(clamp01(k.t / k.dur)), to = typeof k.to === 'function' ? k.to() : k.to;
      c.target.lerpVectors(k.from.target, to.target, e); c.dist = lerp(k.from.dist, to.dist, e); c.pitch = lerp(k.from.pitch, to.pitch, e); c.yaw = lerp(k.from.yaw, to.yaw, e); c.fov = lerp(k.from.fov, to.fov, e);
      if (k.t >= k.dur && !k.hold) this.cine = null;
    } else if (G.state !== 'film') {
      const ttl = G.state === 'title' && this.title, b = ttl ? this.title : this.base; const fz = G.state === 'play' || G.state === 'ready';
      const tx = b.target.x + this.follow.x * (fz ? 0.26 : 0), tz = b.target.z + this.follow.z * (fz ? 0.22 : 0);
      // karşılama: gün döngüsüne bağlı sinematik kamera (yörünge, vinç, yaklaşma); oyunda sabit
      const K = ttl ? TitleSky.camPose() : null, kd = ttl ? 1.1 : 1;
      c.target.x = damp(c.target.x, tx, 3 * kd, dtR); c.target.y = damp(c.target.y, b.target.y + (K ? K.ty : 0), 3 * kd, dtR); c.target.z = damp(c.target.z, tz, 3 * kd, dtR);
      c.dist = damp(c.dist, b.dist * this.zoom * (K ? K.dist : 1), 2.5 * kd, dtR); c.pitch = damp(c.pitch, b.pitch + (K ? K.pitch : 0), 3 * kd, dtR); c.fov = damp(c.fov, b.fov, 3, dtR);
      c.yaw = damp(c.yaw, b.yaw + (K ? K.yaw : 0) + clamp(G.uSV * 0.012, -0.03, 0.03) + Math.sin(U.uTime.value * 0.11) * 0.012, 4 * kd, dtR);
    }
    const pose = { target: c.target.clone(), dist: c.dist, pitch: c.pitch, yaw: c.yaw, fov: c.fov + G.fovKick };
    // eğimsiz duruşun konumu: ön plan derinlik katmanı buna göre kayar (gözlüksüz 3B)
    { const A = this.anchor || (this.anchor = new THREE.Object3D()), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch); A.position.set(pose.target.x + Math.sin(pose.yaw) * cp * pose.dist, pose.target.y + sp * pose.dist, pose.target.z + Math.cos(pose.yaw) * cp * pose.dist); }
    // açılış filmi ve başlıkta eğim/fare paralaksı (gerçek 3B derinlik)
    // eğimle derinlik: başlıkta fare/eğim, oyunda telefonun eğimi (yavaşça yeni duruşa alışır, kaymaz)
    const big = G.state === 'film' || G.state === 'title', gy = !big && Tilt.gyro && Save.data.settings.gyro !== false && G.state !== 'photo' && G.state !== 'map' && G.state !== 'theater';
    Tilt.x = damp(Tilt.x, big ? Tilt.tx : gy ? Tilt.rx : 0, 2.5, dtR); Tilt.y = damp(Tilt.y, big ? Tilt.ty : gy ? Tilt.ry : 0, 2.5, dtR);
    pose.yaw += Tilt.x * (big ? 0.075 : 0.062); pose.pitch -= Tilt.y * (big ? 0.04 : 0.034);
    const tr = G.trauma * G.trauma, t = U.uTime.value;
    if (tr > 0.0001) { pose.target.x += Math.sin(t * 47.1) * tr * 0.3; pose.target.y += Math.sin(t * 39.3 + 1.7) * tr * 0.25; pose.target.z += Math.sin(t * 43.7 + 4.1) * tr * 0.3; }
    this.place(camera, pose);
    if (tr > 0.0001) camera.rotateZ(Math.sin(t * 31.0) * tr * 0.02);
  },
};

/* ---------- palet & güneş ---------- */
const _ca = new THREE.Color(), _cb = new THREE.Color(), _cc = new THREE.Color(), _fp = {}, _fq = {};
const NIGHT = { zen: new THREE.Color('#070618'), hor: new THREE.Color('#2a2152'), below: new THREE.Color('#151230'), sea: new THREE.Color('#0d0b22') };
function palColor(pal, a, b, k, out) { _ca.set(pal[a]); _cb.set(pal[b]); return out.copy(_ca).lerp(_cb, k); }
function skyColors(pal, k, out) {
  palColor(pal, 'skyLowZ', 'skyHighZ', k, out.zen); palColor(pal, 'skyLowH', 'skyHighH', k, out.hor); palColor(pal, 'belowLow', 'belowHigh', k, out.below);
  palColor(pal, 'sunLow', 'sunHigh', k, out.sun); out.deep.set(pal.seaDeep); out.hemiS.set(pal.hemiSky); out.hemiG.set(pal.hemiGround); return out;
}
const SC = () => ({ zen: new THREE.Color(), hor: new THREE.Color(), below: new THREE.Color(), sun: new THREE.Color(), deep: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color() });
const scA = SC(), scB = SC();
// Günün saati: dünyanın ilk adası şafak, ortası öğle, finali altın saat (dünya paletinin üstüne ince bir ton)
const TOD = [
  { t: 0.0, zen: [0.93, 0.9, 1.06], hor: [1.12, 0.97, 1.04], sun: [1.08, 0.9, 0.86], gain: [1.03, 0.98, 1.03], lift: [0.014, 0.004, 0.022] },
  { t: 0.45, zen: [1, 1, 1], hor: [1, 1, 1], sun: [1, 1, 1], gain: [1.02, 1.02, 1.02], lift: [0, 0, 0] },
  { t: 1.0, zen: [0.95, 0.9, 1.0], hor: [1.2, 1.0, 0.86], sun: [1.15, 0.92, 0.74], gain: [1.07, 0.99, 0.88], lift: [0.02, 0.008, 0.0] },
];
function todOf(lv) {
  if (lv._tod) return lv._tod;
  const sp = lv.spec, t = sp.kind === 'story' ? sp.i / 7 : ((sp.seed * 9301 + 49297) % 233280) / 233280;
  const a = t <= 0.45 ? TOD[0] : TOD[1], b = t <= 0.45 ? TOD[1] : TOD[2], k = (t - a.t) / (b.t - a.t), S = 0.75;
  const mix = (key) => a[key].map((v, i) => { const m = v + (b[key][i] - v) * k; return key === 'lift' ? m * S : 1 + (m - 1) * S; });
  return (lv._tod = { zen: mix('zen'), hor: mix('hor'), sun: mix('sun'), gain: mix('gain'), lift: mix('lift') });
}
function applyLighting(dt) {
  const lv = G.lv; if (!lv) return;
  sunDirs(G.u, lv.sun, L1, L2);
  const e = Math.asin(clamp(L1.y, 0, 1)), eMax = PI / 2 - lv.sun.tilt;
  const k = smoothstep(0.08, 0.92, Math.sin(e) / Math.sin(eMax));
  skyColors(lv.chap.pal, k, scA);
  if (G.palT < 1 && G.prevPal) { skyColors(G.prevPal, k, scB); for (const key in scA) scA[key].lerp(scB[key], 1 - Ease.inOutSine(G.palT)); }
  const tod = todOf(lv); scA.zen.r *= tod.zen[0]; scA.zen.g *= tod.zen[1]; scA.zen.b *= tod.zen[2]; scA.hor.r *= tod.hor[0]; scA.hor.g *= tod.hor[1]; scA.hor.b *= tod.hor[2]; scA.sun.r *= tod.sun[0]; scA.sun.g *= tod.sun[1]; scA.sun.b *= tod.sun[2];
  const night = G.night, ecl = G.ecl.amt;
  // gökyüzü
  skyU.uZen.value.copy(scA.zen).lerp(NIGHT.zen, Math.max(night, ecl * 0.75));
  skyU.uHor.value.copy(scA.hor).lerp(NIGHT.hor, Math.max(night, ecl * 0.85));
  skyU.uBelow.value.copy(scA.below).lerp(NIGHT.below, Math.max(night * 0.9, ecl * 0.85));
  skyU.uSunDir.value.copy(L1); skyU.uSunCol.value.copy(scA.sun);
  skyU.uTwin.value = lv.sun.twin ? 1 : 0; skyU.uSun2Dir.value.copy(L2);
  skyU.uStars.value = Math.max(night, ecl * 0.85); skyU.uEclipse.value = ecl; skyU.uNight.value = night;
  const aur = (lv.chap.key === 'buz' ? 0.45 + night * 0.55 : 0) + (G.state === 'ending' ? night * 0.9 : G.state === 'title' ? smoothstep(0.75, 1, night) * 0.85 : 0);
  skyU.uAurora.value = damp(skyU.uAurora.value, Math.max(aur, ecl * (lv.chap.key === 'buz' ? 1 : 0)), 2, dt);
  const nE = Math.max(night, ecl * 0.8);
  seaU.uIslK.value = 1; seaU.uLit.value.copy(scA.below).multiplyScalar(1.12).lerp(NIGHT.sea, nE * 0.6); seaU.uDeep.value.copy(scA.deep).lerp(NIGHT.sea, nE);
  U.uFogCol.value.copy(skyU.uHor.value); U.uBelowCol.value.copy(skyU.uBelow.value);
  // ışıklar
  sunLight.position.copy(L1).multiplyScalar(60); sunLight.target.position.set(0, 0, 0);
  sunLight.color.copy(scA.sun);
  const LK = lv.chap.light || { sun: 1, hemi: 1 };
  sunLight.intensity = 3.9 * LK.sun * lerp(0.7, 1, smoothstep(0.05, 0.5, Math.sin(e))) * (1 - ecl * 0.94);
  sunLight.intensity *= 1 + flare.k * 0.5;
  if (lv.sun.twin) { sunLight2.position.copy(L2).multiplyScalar(60); sunLight2.target.position.set(0, 0, 0); sunLight2.intensity = 2.0 * (1 - ecl * 0.94); sunLight.intensity *= 0.8; }
  hemi.color.copy(scA.hemiS).lerp(_cc.set('#3a4a9a'), ecl * 0.7); hemi.groundColor.copy(scA.hemiG).lerp(_cc.set('#1a1830'), ecl * 0.7);
  hemi.intensity = lerp(0.62, 0.85, k) * LK.hemi * (1 - ecl * 0.55) * IBLK.hemi;
  U.uSunW.value.copy(L1); U.uSunC.value.copy(scA.sun).multiplyScalar(clamp(sunLight.intensity / 3.9, 0, 1.4)); U.uSkyC.value.copy(hemi.color).multiplyScalar(hemi.intensity);
  // küreler
  orbPosInto(G.u, lv.sun.tilt, lv.sun.thMin, orb.g.position);
  orb.u.uCol.value.copy(scA.sun).lerp(_cc.set('#fff4dc'), 0.4);
  orb.halo.material.color.copy(scA.sun).multiplyScalar(1.0 * (1 - ecl * 0.9) * (1 - night));
  orb.rays.material.color.copy(scA.sun).multiplyScalar((0.75 + flare.k * 2.5 + flare.warnK * (0.8 + Math.sin(U.uTime.value * 18) * 0.8)) * (1 - ecl) * (1 - night)); orb.rays.material.rotation += dt * (0.05 + flare.k * 0.8);
  orb.u.uEclipse.value = Math.max(ecl * 0.97, night);
  orb.moon.visible = ecl > 0.01; orb.moon.position.set((1 - ecl) * 1.3, (1 - ecl) * 0.4, 0.2); orb.moon.quaternion.copy(camera.quaternion);
  orb.corona.material.opacity = ecl * 0.95; orb.corona.material.rotation -= dt * 0.1; orb.corona.scale.setScalar(6 + Math.sin(U.uTime.value * 3) * 0.3);
  orb.crown.quaternion.copy(camera.quaternion); orb.crownU.uCol.value.copy(scA.sun).multiplyScalar(1.5);
  orb.crownU.uK.value = (1 - ecl) * (1 - night) * (1 + (G.drag ? 0.35 : 0) + flare.k * 1.2);
  if (lv.sun.twin) { orb2.crown.quaternion.copy(camera.quaternion); orb2.crownU.uK.value = (1 - ecl) * (1 - night) * 0.85; }
  G.orbS = damp(G.orbS || 1, G.drag ? 1.14 : 1, 12, dt);
  orb.g.scale.setScalar(lerp(1, 0.6, night) * G.orbS * (1 - (G.orbPulse || 0) * 0.18));
  if (lv.sun.twin) {
    orbPosInto(1 - G.u, lv.sun.tilt2, lv.sun.thMin2, orb2.g.position);
    orb2.u.uEclipse.value = Math.max(ecl, night); orb2.halo.material.color.set(SUN2_COLOR).multiplyScalar(2 * (1 - ecl) * (1 - night)); orb2.rays.material.color.set(SUN2_COLOR).multiplyScalar(1.2 * (1 - ecl) * (1 - night));
  }
  // post
  const pu = post.u;
  _pv.copy(orb.g.position).project(camera);
  pu.uSunUV.value.set(_pv.x * 0.5 + 0.5, _pv.y * 0.5 + 0.5);
  pu.uSunVis.value = (_pv.z < 1 && orb.g.visible ? 1 : 0) * (1 - ecl) * (1 - night) * smoothstep(1.25, 0.9, Math.max(Math.abs(_pv.x), Math.abs(_pv.y)));
  pu.uFlareCol.value.copy(scA.sun).multiplyScalar(0.8);
  post.rays.uniforms.uSun.value.copy(pu.uSunUV.value);
  if (lv.sun.twin) { _pv.copy(orb2.g.position).project(camera); post.rays.uniforms.uSun2.value.set(_pv.x * 0.5 + 0.5, _pv.y * 0.5 + 0.5); }
  post.rays.uniforms.uSun2On.value = lv.sun.twin ? 1 : 0;
  zifir.u.uSunDir.value.copy(L1); zifir.u.uSunCol.value.copy(scA.sun);
  const g = lv.chap.pal.grade;
  pu.uLift.value.set(g.lift[0] + tod.lift[0], g.lift[1] + tod.lift[1], g.lift[2] + tod.lift[2]); pu.uGamma.value.set(...g.gamma); pu.uGain.value.set(g.gain[0] * tod.gain[0], g.gain[1] * tod.gain[1], g.gain[2] * tod.gain[2]);
  pu.uSat.value = g.sat; pu.uContrast.value = g.contrast;
}

/* ---------- seviye yönetimi ---------- */
function specKey(spec) { return spec.kind + ':' + spec.seed + ':' + spec.g + ':' + (spec.n ?? '') + (spec.night ? ':gece' : ''); }
function getLevel(spec) {
  const k = specKey(spec);
  if (G.cache.has(k)) { const lv = G.cache.get(k); G.cache.delete(k); return lv; }
  return buildLevel(spec);
}
function prebuild(spec) { const k = specKey(spec); if (!G.cache.has(k)) { const lv = buildLevel(spec); if (lv) G.cache.set(k, lv); } while (G.cache.size > 2) G.cache.delete(G.cache.keys().next().value); }
// arka planda (Worker) üret: hazır olunca önbelleğe girer; olmazsa geçişte eşzamanlı üretime düşülür
const _bg = new Set();
function prebuildBg(spec) {
  const k = specKey(spec); if (G.cache.has(k) || _bg.has(k)) return;
  if (!GenW.ok) return;
  _bg.add(k);
  GenW.build(spec).then((lv) => { _bg.delete(k); if (lv && !G.cache.has(k)) { G.cache.set(k, lv); while (G.cache.size > 3) G.cache.delete(G.cache.keys().next().value); } });
}
function nextSpecOf(spec) { if (!spec) return null; if (spec.kind === 'story') return spec.g < STORY_LEVELS - 1 ? (spec.night ? nightSpec(spec.g + 1) : levelSpec(spec.g + 1)) : null; if (spec.kind === 'endless' && G.endless) return endlessSpec(spec.n + 1, G.endless.seed); return null; }
function resetRun() {
  const lv = G.lv;
  G.shield = 0; $('#hud').classList.remove('shield');
  G.helpK = helpFor(lv); G.breathUsed = false; G.breathT = 0; G.passedBest = false;
  G.T = 0; G.s = 0; G.meter = 1; G.minMeter = 1; G.waitT = 0; G.patience = Meta.val('wait'); G.revived = false; G.reviveT = 0; G.holding = false; G.holdT = 0; G.expTotal = 0; G.f = 0; G.burnEp = 0; G.epMin = 1; G.waiting = false; G.dropsGot = 0; G.combo = 0;
  G.ecl.active = false; G.ecl.t = 0; G.ecl.amt = 0; G.ecl.charge = lv.spec.eclipse ? 1 : 0;
  Marks.reset(lv);
  Abil.reset();
  ShadowBirds.hideAll();
  Fireworks.stop();
  G.timeScale = 1; G.slowT = 0; G.hitStop = 0; G.trauma = 0; G.desat = 0; G.ca = 0; G.readyT = 0;
  for (const d of lv.drops) { d.hp = 1; d.state = 0; d.awake = false; d.lit = false; }
  for (const br of lv.bridges) { br.active = false; br.lock = false; br.onT = 0; br.offT = 0; }
  for (const c of lv.crystals) { c.lit = false; c.glow = 0; }
  updateMovers(lv, 0);
  drops.build(lv.drops);
  wisps.reset(lv); flare.reset(); act.reset();
  clearPrints(); fxAdd.clear(); fxMix.clear();
  zifir.reset();
  pathAt(lv.path, 0, PA); zifir.g.position.set(PA.x, 0, PA.z); zifir.yaw = Math.atan2(PA.tx, PA.tz);
  updateHud(true);
}
function setChapterLook(lv) {
  const ch = lv.chap;
  if (G.chapIdx !== lv.spec.ch || !arc1.mesh) { G.prevPal = G.lv ? G.lv.chap.pal : null; G.palT = G.prevPal ? 0 : 1; }
  G.chapIdx = lv.spec.ch;
  arc1.mat = lv.spec.night ? silverMat : brassMat; // Gece Perdesi: ayın gümüş yayı
  arc1.build(lv.sun.tilt, lv.sun.thMin);
  arc2.g.visible = orb2.g.visible = lv.sun.twin;
  if (lv.sun.twin) arc2.build(lv.sun.tilt2, lv.sun.thMin2, true);
  if (sunLight2.castShadow !== lv.sun.twin) { sunLight2.castShadow = lv.sun.twin; sunLight2.visible = lv.sun.twin; }
  audio.setChapter(lv.spec.ch);
  if (G.farChap !== lv.spec.ch) { G.farChap = lv.spec.ch; buildFarIslands(lv.chap); }
  birds.mesh.material.uniforms.uCol.value.set(lv.spec.ch === 4 ? '#2a1d4a' : '#2b2433');
}
function enterLevel(spec, opts = {}) {
  hideToast();
  if (Cam.flight) { Cam.flight = null; Cam.endFlight(); }
  const lv = getLevel(spec);
  if (!lv) { toast('Ada oluşturulamadı. Tekrar dene.'); return; }
  if (G.view) { if (G.outView) G.outView.dispose(); G.outView = G.view; G.outT = 0; }
  G.spec = spec; setChapterLook(lv); G.lv = lv;
  G.view = new IslandView(lv);
  Dragon.setup(lv);
  Life.setup(lv, opts);
  NightAct.setup(lv);
  Secret.setup(lv);
  Ambient.setWorld(lv.chap && lv.chap.key);
  { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of lv.chunks) for (const [x, z] of c.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    seaU.uIsl.value.set((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2); } // adanın bulutlara düşen gölgesi
  try { const pr = renderer.getRenderTarget(); renderer.setRenderTarget(post.rtScene); renderer.compile(scene, camera); renderer.setRenderTarget(pr); } catch (e) {}
  resetRun();
  zifir.g.visible = false;
  Cam.fit(lv);
  G.state = 'intro'; G.stateT = 0; G.userSun = false; G.zShown = false; G.zPop = 0;
  G.introDur = opts.title ? 3.2 : spec.finale ? 3.4 : spec.kind === 'story' && spec.i === 0 && !opts.quick ? 3.0 : 2.0;
  // ilk girişte önizleme uçuşu (yeniden denemelerde yok; final kendi süzülüşünü yapar)
  const fk = specKey(spec), doFly = !opts.title && !opts.keepCam && !spec.finale && (spec.kind === 'story' || spec.kind === 'daily' || spec.kind === 'bonus') && !G.flown.has(fk);
  if (doFly) { G.flown.add(fk); G.introDur = Math.max(G.introDur, FLY_DUR + 0.45); }
  G.u = G.uT = 0.0; G.uSV = 0;
  refreshEnvSoon = 0.3;
  renderer.shadowMap.needsUpdate = true;
  audio.rise();
  if (opts.title) {
    const tp = Cam.title;
    Cam.set(Cam.cur, { target: tp.target.clone().add(new THREE.Vector3(0, 10, -8)), dist: tp.dist * 2.4, pitch: deg(78), yaw: 0, fov: tp.fov });
    Cam.cinema({ target: tp.target.clone(), dist: tp.dist, pitch: tp.pitch, yaw: 0, fov: tp.fov }, 3.2, Ease.inOutCubic);
  } else if (!opts.keepCam && spec.finale) {
    // dünya finali: alçak, yandan bir açıdan adanın etrafında süzülerek yerine oturan kamera
    Cam.set(Cam.cur, Cam.pose({ yaw: 0.9, pitch: deg(24), dist: Cam.base.dist * 0.78 }));
    Cam.cinema(Cam.pose(), 3.0, Ease.inOutCubic);
    setTimeout(() => { if (G.lv === lv) banner(spec.boss ? 'Güneş Ejderhası' : 'Final', spec.boss ? `${lv.chap.constellation} · son ada` : `${lv.chap.constellation} takımyıldızının son yıldızı`); }, 700);
  } else if (doFly) {
    Cam.fly(lv, FLY_DUR);
  } else if (!opts.keepCam) {
    Cam.cinema(Cam.pose({ dist: Cam.base.dist * 1.25, pitch: Cam.base.pitch + deg(6) }), 0.6, Ease.outCubic);
    setTimeout(() => { if (G.lv === lv) Cam.cinema(Cam.pose(), 1.4, Ease.inOutCubic); }, 600);
  }
  if (spec.kind === 'story' && spec.i === 0 && !opts.title) showChapterCard(lv.chap);
  updateHud(true);
  { const ns = nextSpecOf(spec); if (ns) setTimeout(() => prebuildBg(ns), 1500); }
  if (window.__gdHook) window.__gdHook('enter', lv);
}
let refreshEnvSoon = -1;
function showChapterCard(ch) {
  $('#ccNum').textContent = ch.roman; $('#ccTitle').textContent = ch.name; $('#ccSub').textContent = ch.hint;
  const c = $('#chapterCard'); c.classList.add('on'); setTimeout(() => c.classList.remove('on'), 2700);
}
function startPlay() {
  if (G.state !== 'ready' || Abil.gate()) return;
  G.state = 'play'; G.stateT = 0; hideToast();
  zifir.kick(1.6); audio.whoosh(true, 0.35, 0.05);
  Dragon.start();
  const lv = G.lv, g = lv.spec.g;
  if (g === 0) setTimeout(() => { if (G.state === 'play') tip('t-keep', 'Zifir ışıkta <em>buharlaşır</em>.<br>Gölgeyi onun üstüne düşür.', 3.6); }, 900);
  if (lv.drops.length && g >= 1) setTimeout(() => { if (G.state === 'play') tip('t-drops', 'Gece damlaları Zifir yaklaşınca <em>uyanır</em> ve ışıkta erir.', 4); }, 2500);
  if (lv.props.some((p) => p.arch) && g >= 1) setTimeout(() => { if (G.state === 'play') tip('t-arch', 'Çardak altı güvenlidir ama <em>alçak güneş</em> yandan sızar.', 3.8); }, 4200);
  if (lv.spec.features.clouds) tip('t-clouds', '<em>Bulutların</em> gölgesini yakala. Rüzgârla kayarlar.', 4);
  if (lv.spec.features.windmills && lv.movers.some((m) => m.kind === 'sails')) setTimeout(() => { if (G.state === 'play') tip('t-mill', 'Değirmen kanatları gölgeyi <em>böler</em>.', 3.5); }, 5000);
  if (lv.spec.features.balloons) tip('t-balloon', 'Balonlar yüksekte: <em>alçak güneş</em> gölgelerini uzağa savurur.', 4.2);
  if (lv.bridges.length) tip('t-bridge', 'Köprü yalnızca <em>kristal ışıktayken</em> belirir. Zifir köprüyü bekler, sen de onu gölgede tut!', 4.6);
  if (lv.sprites && lv.sprites.length) setTimeout(() => { if (G.state === 'play') tip('t-wisp', '<em>Işık perileri</em> Zifir’e süzülür: gölgedeyken ya da <em>dalarken</em> yut, ışıkta yakar!', 4.6); }, Math.max(0, (lv.sprites[0].t - 1.2) * 1000));
  if (lv.flares) setTimeout(() => { if (G.state === 'play') tip('t-flare', '<em>Güneş patlaması</em>: uyarı çubuğu dolunca ışık iki kat yakar. Önceden gölgeye gir!', 4.4); }, Math.max(0, (lv.flares[0].w - 0.3) * 1000));
  if (lv.movers.some((m) => m.kind === 'melt')) tip('t-melt', '<em>Buz sütunları</em> güneşte erir, gölgeleri giderek kısalır.', 4.2);
  if (lv.mirrors && lv.mirrors.length) tip('t-mirror', '<em>Aynalar</em> güneşi yansıtır: yansıyan ışık gölge tanımaz. Huzmeyi Zifir’den uzak tut!', 4.8);
  if (lv.movers.some((m) => m.kind === 'orbit')) tip('t-gear', 'Dev <em>dişliler</em> döner: üstündeki kulelerin gölgesi saat gibi geri gelir.', 4.4);
  if (lv.movers.some((m) => m.kind === 'pendulum')) setTimeout(() => { if (G.state === 'play') tip('t-pend', '<em>Sarkaç</em> yol boyunca salınır. Gölgesiyle aynı ritimde yürü.', 4.2); }, 3000);
  if (lv.sun.twin) tip('t-twin', 'İki güneş: <em>renkli gölge</em> yarı korur. Gerçek karanlık ikisinin kesişimi.', 4.6);
}
function retry(fromComplete = false) {
  Melt.end();
  if (G.mode === 'endless' && !fromComplete) { startEndless(); return; }
  UI.hide('fail'); UI.hide('complete'); UI.hud(true);
  resetRun();
  const trail = !G.hint && failsOn(G.lv) >= 2; if (trail) G.hint = true;
  const soft = G.helpK < 1 ? `<span class="tsun"></span>Güneş yumuşadı: ışık artık <em>%${Math.round((1 - G.helpK) * 100)}</em> daha az yakıyor` : '';
  if (trail) toast((soft ? soft + '<br>' : '') + '<em>Işık izi</em> açıldı: yaydaki parlak güneşi takip et', 3.6);
  else if (soft) toast(soft, 2.8);
  updateHud(true);
  G.state = 'rewind'; G.stateT = 0; G.rewFrom = G.u;
  zifir.g.visible = true; zifir.g.scale.setScalar(0.001);
  Cam.cinema(Cam.pose(), 0.7, Ease.outCubic);
  audio.whoosh(false, 0.6, 0.08);
}
function failLevel() {
  if (G.state !== 'play') return;
  G.state = 'fail'; G.stateT = 0; G.fShown = false;
  G.hitStop = 0.12; G.slowT = 0.8; G.slowK = 0.3; G.trauma = 0.22; G.ca = 0.02; G.ecl.active = false;
  audio.setSizzle(0); audio.fail(); haptic([30, 40, 70]);
  const x = zifir.g.position.x, z = zifir.g.position.z;
  FX.burst(x, 0.35, z, 16, { c: [0.04, 0.03, 0.06], a: 0.6, s: 0.28, s1: 0.9, life: 1.2, sp: 1.6, up: 1, drag: 2.2, t: 1 });
  for (let i = 0; i < 10; i++) FX.ember(x, 0.35, z);
  Melt.start(); // sinematik eriyiş: kamera, jel damlalar, buhar
  Dragon.onFail();
  Marks.died(G.lv, G.s);
  ShadowBirds.scatter();
  G.lastPct = clamp01(G.s / G.lv.length); G.newBest = 0;
  if (G.mode === 'night') { const g = G.lv.spec.g, d = NightAct.data(); d.fails[g] = (d.fails[g] || 0) + 1; Save.save(); }
  if (G.mode === 'story') {
    const g = G.lv.spec.g, d = Save.data; d.fails[g] = (d.fails[g] || 0) + 1; d.flow = 0;
    if (!d.levels[g]) { d.best = d.best || {}; const old = d.best[g] || 0; if (G.lastPct > old + 0.005) { G.newBest = G.lastPct - old; G.prevBest = old; d.best[g] = +G.lastPct.toFixed(3); } }
    Save.save();
  }
}
function showFail() {
  Melt.bars(false);
  const lv = G.lv, pct = Math.round(clamp01(G.s / lv.length) * 100);
  const lines = ['Zifir buharlaştı', 'Güneş acımasızdı', 'Gölge yetmedi', 'Biraz daha karanlık…'];
  if (G.mode === 'endless') {
    const e = G.endless;
    $('#fTitle').textContent = 'Sonsuz Gün bitti';
    $('#fSub').textContent = `${e.n} ada · ${e.score} puan · En iyi ${Math.max(Save.data.endlessBest, e.score)}` + (e.dust ? ` · +${e.dust} ışık tozu` : '');
    if (e.score > Save.data.endlessBest) { Save.data.endlessBest = e.score; Save.data.endlessBestIslands = e.n; Save.save(); $('#fSub').textContent = `${e.n} ada · ${e.score} puan · Yeni rekor!`; }
    $('#fProg').style.width = '100%';
  } else {
    $('#fTitle').textContent = lines[(Save.data.fails[lv.spec.g] || 0) % lines.length];
    const best = G.mode === 'story' && !Save.data.levels[lv.spec.g] ? (Save.data.best || {})[lv.spec.g] || 0 : 0;
    $('#fSub').textContent = G.newBest > 0 && G.prevBest > 0 ? `Yol · %${pct} · yeni rekor (+%${Math.round(G.newBest * 100)})` : best > G.lastPct + 0.005 ? `Yol · %${pct} · en iyi %${Math.round(best * 100)}` : `Yol · %${pct}`;
    $('#fProg').style.width = '0%'; requestAnimationFrame(() => { $('#fProg').style.width = pct + '%'; });
  }
  showMercy(lv);
  $('#fail').classList.toggle('offerhint', G.mode === 'story' && (Save.data.fails[lv.spec.g] || 0) >= 3 && !G.hint);
  $('#fail').classList.toggle('canrevive', !G.revived && G.lastPct > 0.12 && AdBridge.ready('rewarded'));
  // gölge kalkanı: aynı adada 2. kayıptan sonra, 'bir şans daha' yoksa (iki video düğmesi yan yana çıkmaz)
  $('#fail').classList.toggle('canshield', !$('#fail').classList.contains('canrevive') && (G.mode === 'story' || G.mode === 'night') && failsOn(lv) >= 2 && AdBridge.left('shield') > 0);
  UI.hud(false); UI.show('fail');
}
// Güneşin merhameti kartı: yardım açıkça ve cesaret verici bir dille gösterilir; ipuçları da burada
function showMercy(lv) {
  const card = $('#fMercy'), hk = G.mode === 'story' || G.mode === 'night' ? helpFor(lv) : 1;
  card.classList.remove('on');
  if (hk >= 1) return;
  const pct = Math.round((1 - hk) * 100), lvl = Math.round(pct / 10), max = hk <= 0.5 + 1e-6, nf = Save.data.fails[lv.spec.g] || 0;
  $('#fMercyT').textContent = max ? 'Güneş en yumuşak hâlinde' : lvl === 1 ? 'Güneş seni fark etti' : 'Güneş yumuşuyor';
  $('#fMercyS').innerHTML = max ? `Işık artık <em>%${pct}</em> daha az yakıyor. Gölgede kal, bu sefer olacak!` : `Bir sonraki denemede ışık <em>%${pct}</em> daha az yakacak.`;
  $$('#fMercyLv i').forEach((el, i) => el.classList.toggle('on', i < lvl));
  let t = max ? 'Yıldızlar yine sayılır.' : 'Her denemede biraz daha yumuşar · yıldızlar yine sayılır.';
  if (lv.spec.dash && Abil.shown('dash') && act.dives === 0) t = 'İpucu: ışığa yakalanınca <em>Dal</em>’a bas, yanma %85 azalır.';
  else if (nf >= 5 && !Save.data.settings.assist) t = 'Daha da rahat istersen: <em>Ayarlar → Rahat mod</em>.';
  $('#fMercyTip').innerHTML = t;
  void card.offsetWidth; card.classList.add('on');
}
function reachGate() {
  G.state = 'complete'; G.stateT = 0; G.compStage = 0; G.cSquash = false;
  setupCompleteCine();
  audio.setSizzle(0); hideToast();
  Dragon.defeat();
  const lv = G.lv;
  G.stars = [true, G.dropsGot >= lv.drops.length, G.expTotal <= lv.flawless + 1e-6];
  G.birdsN = ShadowBirds.finish();
  // görevler ve albüm
  Meta.ev('clear'); Meta.ev('star', G.stars.filter(Boolean).length); Meta.ev('birds', G.birdsN || 0);
  if (G.stars[2]) { Meta.ev('flawless'); Meta.find('m:flawless'); }
  if ((G.birdsN || 0) >= BIRD_MAX) Meta.find('m:flock');
  if (act.eaten >= 3) Meta.find('m:wisp');
  if (G.mode === 'daily') Meta.ev('daily');
  if (G.mode === 'endless') { Meta.ev('endless'); G.endless.dust = (G.endless.dust || 0) + 6; Meta.addDust(6); }
  AdBridge.levelDone();
  if (G.mode === 'endless') {
    const e = G.endless, add = 100 + G.dropsGot * 25 + (G.stars[2] ? 60 : 0) + act.best * 15 + act.eaten * 20;
    e.score += add; e.n++; updateHud(true);
    setTimeout(() => banner('+' + add, G.stars[2] ? 'Lekesiz' : `Ada ${e.n}`), 700);
  }
}
function saveStory() {
  const lv = G.lv, g = lv.spec.g, d = Save.data;
  const firstClear = !d.levels[g];
  const prev = d.levels[g] || { stars: [false, false, false], bestExp: 99 };
  const ch = Math.floor(g / 8);
  const before = [0, 1, 2, 3, 4, 5, 6, 7].reduce((a, i) => a + Save.stars(ch * 8 + i), 0);
  d.levels[g] = { stars: prev.stars.map((s, i) => s || G.stars[i]), bestExp: Math.min(prev.bestExp, G.expTotal) };
  d.unlocked = Math.max(d.unlocked, Math.min(STORY_LEVELS - 1, g + 1));
  if (g === STORY_LEVELS - 1) d.finished = true;
  const after = [0, 1, 2, 3, 4, 5, 6, 7].reduce((a, i) => a + Save.stars(ch * 8 + i), 0);
  Save.save();
  d.flow = (d.flow || 0) + 1; if (d.best) delete d.best[g]; Save.save();
  return { chapterDone: g % 8 === 7, newSkin: before < 24 && after === 24 ? ch + 1 : 0, firstClear, fails: d.fails[g] || 0, flow: d.flow, newStars: G.stars.filter((s, i) => s && !prev.stars[i]).length };
}
function showComplete() {
  const lv = G.lv, sp = lv.spec;
  let res = { chapterDone: false, newSkin: 0 };
  if (G.mode === 'story') res = saveStory();
  if (G.mode === 'night') res = NightAct.save();
  if (G.mode === 'bonus') { const b = Meta.d().bonus, ch = G.bonusCh, old = b[ch] || 0; res = { firstClear: !old, newStars: Math.max(0, G.stars.filter(Boolean).length - old) }; b[ch] = Math.max(old, G.stars.filter(Boolean).length); Save.save(); }
  if (G.mode === 'daily') { res.firstToday = Save.data.daily.date !== dateNum(); }
  if (G.mode === 'daily') { const today = dateNum(); Save.data.daily = { date: today, stars: Math.max(Save.data.daily.date === today ? Save.data.daily.stars : 0, G.stars.filter(Boolean).length) }; Save.save(); }
  const lanAll = G.mode === 'night' && NightAct.lan.length > 1 && NightAct.lit === NightAct.lan.length;
  $('#cKicker').textContent = lanAll ? 'Fener alayı · bütün fenerler yandı' : G.mode === 'night' ? (res.chapterDone ? `${lv.chap.constellation} gecesi tamamlandı` : 'Ay battı') : res.chapterDone ? `${lv.chap.constellation} takımyıldızı tamamlandı` : 'Gece düştü';
  $('#cTitle').textContent = G.mode === 'bonus' ? 'Gizli Ada' : G.mode === 'daily' ? 'Günün Adası' : G.mode === 'night' ? `Gece · Ada ${sp.g + 1}` : `Ada ${sp.g + 1}`;
  $('#cSub').textContent = lv.chap.name;
  $('#st0').textContent = 'Kapıya ulaştı';
  $('#st1').textContent = lv.drops.length ? `Damlalar ${G.dropsGot}/${lv.drops.length}` : 'Damlalar';
  $('#st2').innerHTML = `Lekesiz<br>güneşte ${G.expTotal.toFixed(1)} / ${lv.flawless.toFixed(1)} sn`;
  const extra = []; if (G.mode === 'night' && NightAct.lan.length) extra.push(`fener ${NightAct.lit}/${NightAct.lan.length}`); if (act.best > 0) extra.push(`gölge serisi ×${act.best + 1}`); if (act.eaten > 0) extra.push(`${act.eaten} peri yutuldu`);
  $('#cSub').textContent = lv.chap.name + (extra.length ? ' · ' + extra.join(' · ') : '');
  $$('.star').forEach((el) => el.classList.remove('lit', 'shown'));
  // gölge kuşları sayımı
  const bn = G.birdsN || 0, bEl = $('#cBirds');
  bEl.style.display = bn > 0 ? '' : 'none';
  if (bn > 0) $('#cBirdsT').innerHTML = `<b>${bn}</b> gölge kuşu` + (ShadowBirds.rec ? ' · <span class="rec">rekor!</span>' : G.mode === 'story' && ShadowBirds.prev > bn ? ` · en çok ${ShadowBirds.prev}` : bn >= BIRD_MAX ? ' · <span class="rec">tam sürü!</span>' : '');
  const last = sp.g === STORY_LEVELS - 1;
  if (lanAll) Meta.find('m:lantern');
  // ışık tozu: tamamlama ekranında sayarak belirir; ödüllü reklamla ikiye katlanabilir
  { const n = Meta.levelReward(G.mode, res, lv); G.dustWon = n; G.dustDoubled = false; const cd = $('#cDust'); cd.classList.toggle('on', n > 0); cd.querySelector('b').textContent = '+' + n; if (n > 0) Meta.addDust(n);
    $('#complete').classList.toggle('candouble', n >= 10 && AdBridge.ready('rewarded')); }
  $('#btnNext').textContent = G.mode === 'daily' || G.mode === 'bonus' ? 'Gökyüzü' : last ? (G.mode === 'night' ? 'Şafak' : 'Final') : res.chapterDone ? 'Yeni takımyıldızı' : 'Sonraki Ada';
  $('#complete').classList.remove('ready');
  UI.hud(false); UI.show('complete');
  G.compRes = res;
  // kutlama anları: dünya bitişi > ısrarla gelen başarı > kesintisiz seri (tek afiş, yıldızlardan sonra)
  if (G.mode === 'story') {
    let cel = null;
    if (res.chapterDone && res.firstClear) cel = [`${lv.chap.constellation} parladı!`, 'bir takımyıldızı daha tamam'];
    else if (res.firstClear && res.fails >= 3) cel = ['Pes etmedin!', `${res.fails + 1}. denemede başardın`];
    else if ([3, 5, 8, 12, 16, 24, 32, 48, 64].includes(res.flow)) cel = [`${res.flow} ada üst üste!`, 'tek denemede, kesintisiz'];
    if (cel) setTimeout(() => { if (G.state === 'complete') { banner(cel[0], cel[1]); starRain(res.chapterDone ? 110 : 70); audio.chime && audio.chime(); } }, 1900);
  }
  if (G.mode === 'story' && !last && !GenW.ok) setTimeout(() => { if (G.state === 'complete') prebuild(levelSpec(sp.g + 1)); }, 3800);
}
function nextFromComplete(afterAd = false) {
  audio.ui();
  // doğal mola: sıklık kuralları uygunsa adalar arasında geçiş reklamı (oyun sırasında asla)
  if (!afterAd && G.mode !== 'daily' && G.mode !== 'bonus' && AdBridge.canInterstitial('level_complete')) { AdBridge.interstitial('level_complete').then(() => nextFromComplete(true)); return; }
  if (G.mode === 'daily' || G.mode === 'bonus') { openMap(); return; }
  if (G.mode === 'night') { const g = G.lv.spec.g; UI.hide('complete'); if (g >= STORY_LEVELS - 1) { showEnding(true); return; } UI.hud(true); enterLevel(nightSpec(g + 1)); return; }
  const g = G.lv.spec.g, ch = g >> 3;
  // takımyıldızı tamamlanınca ninninin yeni dizesi; finalde ninninin tamamı ve son
  if (G.mode === 'story' && g % 8 === 7 && !Save.seen('lore-c' + ch)) {
    const pages = ['c' + ch]; if (g === STORY_LEVELS - 1) pages.push('end'); else if (Lore.needWorld(ch + 1)) pages.push('w' + (ch + 1));
    UI.hide('complete'); Lore.play(pages, () => { if (g === STORY_LEVELS - 1) { showEnding(false); } else { UI.hud(true); enterLevel(levelSpec(g + 1)); } });
    return;
  }
  if (g === STORY_LEVELS - 1) { UI.hide('complete'); showEnding(false); return; }
  UI.hide('complete'); UI.hud(true);
  enterLevel(levelSpec(g + 1));
}

/* ---------- sonsuz gün & günün adası ---------- */
function dateNum() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function startEndless() {
  G.mode = 'endless'; G.endless = { n: 0, score: 0, seed: (Math.random() * 1e9) | 0 };
  UI.hideAll(); UI.hud(true); $('#hud').classList.add('endless');
  enterLevel(endlessSpec(0, G.endless.seed), { quick: true });
}
// son ekranı: hikâye finali Gece Perdesi'ni açar; gece finali fenerleri sayar
function showEnding(night) {
  if (night) {
    const [a, b] = NightAct.lanterns();
    $('#endH').textContent = 'Gece Perdesi'; $('#endP').textContent = 'Altmış dört gece, altmış dört ay. Fenerler yandı; Zifir artık hem gündüzü hem geceyi taşıyor.'; $('#endS').textContent = `fenerler ${a}/${b} · ★ ${NightAct.stars()}/${STORY_LEVELS * 3}`;
  } else { $('#endH').textContent = 'Gündönümü'; $('#endP').textContent = 'Sekiz takımyıldızı tamamlandı. Zifir artık geceyi taşıyor. Güneş ise ilk kez onu yakmadan batıyor.'; $('#endS').textContent = 'Gece Perdesi açıldı · Ay’ı sen çevir'; }
  UI.show('ending'); G.state = 'ending';
}
function startDaily() { G.mode = 'daily'; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless'); enterLevel(dailySpec(dateNum()), { quick: true }); }
function startStory(g) {
  // her dünyanın ilk adasından önce o dünyanın hikâyesi (ilk kez: önsözle birlikte)
  if (g % 8 === 0 && Lore.needWorld(g >> 3) && !window.__noLore) { UI.hideAll(); Lore.play(Lore.worldPages(g >> 3), () => startStory(g)); return; }
  const same = G.lv && G.lv.spec.kind === 'story' && !G.lv.spec.night && G.lv.spec.g === g;
  if (Save.data.lastG !== g) { Save.data.lastG = g; Save.save(); } // Gökyüzü bu adanın bölümünde açılır
  if (!same) G.hint = false;
  G.mode = 'story'; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless');
  if (same && G.state === 'title') { G.state = 'ready'; G.readyT = 0; G.readyHint = false; G.uT = G.lv.spec.sunStart; resetRun(); zifir.g.visible = !!G.zShown; updateHud(true); return; }
  if (same && (G.state === 'map' || G.state === 'ending')) { G.rewFrom = G.u; retry(true); return; }
  enterLevel(levelSpec(g));
}

/* ---------- HUD ---------- */
let hudCache = {};
function updateHud(force = false) {
  const lv = G.lv; if (!lv) return;
  const title = G.mode === 'endless' ? 'Sonsuz Gün' : G.mode === 'daily' ? 'Günün Adası' : G.mode === 'bonus' ? 'Gizli Ada' : G.mode === 'night' ? `Gece · Ada ${lv.spec.g + 1}` : `Ada ${lv.spec.g + 1}`;
  const sub = G.mode === 'endless' ? `${lv.chap.name} · ${G.endless.n + 1}. ada` : lv.chap.name;
  const dt = `${G.dropsGot}/${lv.drops.length}`;
  if (force || hudCache.title !== title) { $('#lvlTitle').textContent = title; hudCache.title = title; }
  if (force || hudCache.sub !== sub) { $('#lvlSub').textContent = sub; hudCache.sub = sub; }
  if (force || hudCache.drops !== dt) { $('#dropTxt').textContent = dt; hudCache.drops = dt; }
  if (G.endless && (force || hudCache.score !== G.endless.score)) { $('#scoreTxt').textContent = G.endless.score; hudCache.score = G.endless.score; }
  const hp = G.mode === 'story' && G.helpK < 1 ? Math.round((1 - G.helpK) * 100) : 0;
  if (force || hudCache.hp !== hp) { const el = $('#lvlHelp'); el.classList.toggle('on', hp > 0); el.querySelector('em').textContent = `Işık −%${hp}`; hudCache.hp = hp; }
  const wb = $('#waitBtn'), ws = !!lv.spec.wait && Abil.shown('wait') && G.state !== 'complete';
  if (force || hudCache.ws !== ws) { wb.classList.toggle('show', ws); hudCache.ws = ws; }
  const pm = Meta.val('wait'), wp = Math.round((G.patience ?? pm) / pm * 50) / 50;
  if (force || hudCache.wp !== wp) { wb.style.setProperty('--p', wp); wb.classList.toggle('empty', wp < 0.08); hudCache.wp = wp; }
  const eb = $('#eclipseBtn'), show = !!lv.spec.eclipse && Abil.shown('ecl');
  if (force || hudCache.ecl !== show) { eb.classList.toggle('show', show); hudCache.ecl = show; }
  const p = Math.round(G.ecl.charge * 100) / 100;
  if (force || hudCache.p !== p) { eb.style.setProperty('--p', p); hudCache.p = p; }
  const ready = G.ecl.charge >= 1 && !G.ecl.active;
  if (force || hudCache.ready !== ready) { eb.classList.toggle('ready', ready); hudCache.ready = ready; }
}

/* ---------- bir şans daha (ödüllü reklam) ----------
   Zifir kaldığı yerden döner; 2,2 sn boyunca güneş ona dokunamaz. Adada bir kez. */
function revive() {
  if (G.state !== 'fail' || G.revived) return;
  G.revived = true; G.reviveT = 2.2;
  UI.hide('fail'); UI.hud(true); Melt.end();
  G.state = 'play'; G.stateT = 0; G.meter = 0.6; G.breathUsed = false; G.breathT = 0; G.desat = 0; G.slowT = 0; G.hitStop = 0; G.drag = null;
  zifir.g.visible = true; zifir.g.scale.setScalar(1); zifir.kick(3);
  Dragon.revive && Dragon.revive();
  Cam.cinema(Cam.pose(), 0.8, Ease.outCubic);
  audio.closeCall(); haptic([20, 30, 20]);
  pathAt(G.lv.path, G.s, PA); for (let i = 0; i < 16; i++) FX.sparkle(PA.x + (Math.random() - 0.5) * 0.9, 0.3 + Math.random() * 0.6, PA.z + (Math.random() - 0.5) * 0.9, [1.4, 1.2, 2.6], 0.35);
  setTimeout(() => banner('Bir şans daha!', 'güneş bir an sana dokunamaz'), 200);
  updateHud(true);
}

/* ---------- tutulma ---------- */
function triggerEclipse() {
  if (G.state !== 'play' || G.ecl.active || G.ecl.charge < 1 || !G.lv.spec.eclipse || !Abil.shown('ecl')) return;
  Abil.used('ecl'); Meta.ev('eclipse');
  G.ecl.charge = 0; G.ecl.active = true; G.ecl.t = 0;
  audio.eclipse(); haptic(35); G.trauma = Math.max(G.trauma, 0.35); G.fovKick = -2.5;
  FX.burst(orb.g.position.x, orb.g.position.y, orb.g.position.z, 30, { add: true, c: [1.6, 1.5, 2.4], a: 1, s: 0.25, s1: 0.05, life: 1.2, sp: 4, drag: 1.5, t: 2 });
  updateHud();
}
