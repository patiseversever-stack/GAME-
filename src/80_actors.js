
/* =====================================================================
   AKTÖRLER — parçacıklar, ayak izleri, Zifir, gece damlaları
   ===================================================================== */
const PART_VERT = `attribute vec3 aColor; attribute float aAlpha; attribute float aSize; attribute float aType; uniform float uPx;
varying vec3 vC; varying float vA; varying float vT;
void main(){ vC = aColor; vA = aAlpha; vT = aType; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(aSize * uPx / -mv.z, 1.0, 256.0); gl_Position = projectionMatrix * mv; }`;
const PART_FRAG = `varying vec3 vC; varying float vA; varying float vT;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a;
  if (vT < 0.5) a = (1.0 - smoothstep(0.0, 0.5, d));
  else if (vT < 1.5) { a = (1.0 - smoothstep(0.12, 0.5, d)); a *= 0.75 + 0.25 * sin(atan(c.y, c.x) * 5.0 + vA * 9.0); }
  else { float s = max(exp(-abs(c.x) * 26.0) * exp(-abs(c.y) * 3.5), exp(-abs(c.y) * 26.0) * exp(-abs(c.x) * 3.5)); a = s + (1.0 - smoothstep(0.0, 0.22, d)); }
  if (a * vA < 0.003) discard;
  gl_FragColor = vec4(vC, a * vA);
}`;
class Particles {
  constructor(max, additive) {
    this.max = max; this.n = 0; this.cap = max;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.c = new Float32Array(max * 3);
    this.a = new Float32Array(max); this.s = new Float32Array(max); this.ty = new Float32Array(max);
    this.life = new Float32Array(max); this.ml = new Float32Array(max); this.a0 = new Float32Array(max); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.gp = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage); g.setAttribute('position', this.gp);
    this.gc = new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage); g.setAttribute('aColor', this.gc);
    this.ga = new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage); g.setAttribute('aAlpha', this.ga);
    this.gs = new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage); g.setAttribute('aSize', this.gs);
    this.gt = new THREE.BufferAttribute(this.ty, 1).setUsage(THREE.DynamicDrawUsage); g.setAttribute('aType', this.gt);
    this.u = { uPx: { value: 400 } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: PART_VERT, fragmentShader: PART_FRAG, uniforms: this.u, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 8 : 7;
    g.setDrawRange(0, 0);
    scene.add(this.pts);
  }
  spawn(x, y, z, vx, vy, vz, o) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    const c = o.c || [1, 1, 1]; this.c[i * 3] = c[0]; this.c[i * 3 + 1] = c[1]; this.c[i * 3 + 2] = c[2];
    this.ml[i] = this.life[i] = o.life || 1; this.a0[i] = o.a ?? 1; this.s0[i] = o.s ?? 0.2; this.s1[i] = o.s1 ?? this.s0[i];
    this.drag[i] = o.drag ?? 1.5; this.grav[i] = o.g ?? 0; this.ty[i] = o.t ?? 0; this.a[i] = 0; this.s[i] = this.s0[i];
  }
  update(dt) {
    const p = this.p, v = this.v;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); i--; continue; }
      const k = Math.exp(-this.drag[i] * dt);
      v[i * 3] *= k; v[i * 3 + 1] = v[i * 3 + 1] * k + this.grav[i] * dt; v[i * 3 + 2] *= k;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const f = 1 - this.life[i] / this.ml[i];
      this.a[i] = this.a0[i] * Math.min(1, f * 8) * (1 - f * f);
      this.s[i] = lerp(this.s0[i], this.s1[i], f);
    }
    const g = this.pts.geometry; g.setDrawRange(0, this.n);
    if (this.n) { this.gp.needsUpdate = this.gc.needsUpdate = this.ga.needsUpdate = this.gs.needsUpdate = this.gt.needsUpdate = true; }
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    for (const arr of [this.p, this.v, this.c]) { arr[i * 3] = arr[j * 3]; arr[i * 3 + 1] = arr[j * 3 + 1]; arr[i * 3 + 2] = arr[j * 3 + 2]; }
    for (const arr of [this.a, this.s, this.ty, this.life, this.ml, this.a0, this.s0, this.s1, this.drag, this.grav]) arr[i] = arr[j];
  }
  clear() { this.n = 0; }
}
const fxAdd = new Particles(1000, true), fxMix = new Particles(1000, false);
function setParticleCap(n) { fxAdd.cap = Math.min(fxAdd.max, n); fxMix.cap = Math.min(fxMix.max, n); }
const FX = {
  burst(x, y, z, n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = (Math.random() - 0.3) * PI * 0.5, sp = (o.sp || 3) * (0.4 + Math.random() * 0.8); (o.add ? fxAdd : fxMix).spawn(x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + (o.up || 0), Math.sin(a) * Math.cos(e) * sp, o); } },
  smoke(x, y, z, k = 1) { fxMix.spawn(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, { c: [0.05, 0.04, 0.07], a: 0.55 * k, s: 0.35, s1: 1.1, life: 1.1 + Math.random() * 0.5, drag: 1.2, t: 1 }); },
  ember(x, y, z) { fxAdd.spawn(x, y, z, (Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 1.5, { c: [3, 1.1, 0.25], a: 1, s: 0.09, s1: 0.03, life: 0.6 + Math.random() * 0.5, drag: 1.4, g: -1.2 }); },
  mote(x, y, z, c, s = 0.07) { fxAdd.spawn(x, y, z, (Math.random() - 0.5) * 0.2, 0.05 + Math.random() * 0.12, (Math.random() - 0.5) * 0.2, { c, a: 0.9, s, s1: s, life: 4 + Math.random() * 3, drag: 0.1 }); },
  sparkle(x, y, z, c, s = 0.5) { fxAdd.spawn(x, y, z, 0, 0.3, 0, { c, a: 1, s, s1: s * 0.2, life: 0.6, drag: 2, t: 2 }); },
};

/* ---------- hava parçacıkları (C3) ----------
   Dünyaya özgü süzülen zerreler: Buz'da kar, Ayna'da yaprak, İkiz'de yükselen sporlar, Tuz'da pırıltı, Saat'te pirinç tozu,
   Ege/Rüzgâr/Peri'de polen ve toz. Tek bir Points nesnesi; tüm hareket GPU'da (CPU'da parçacık başına iş yok).
   Sayı kaliteye bağlı (Q.amb); Düşük'te tamamen kapalı ve hiç derlenmez. */
const AMB_VERT = `attribute vec4 aR; uniform vec3 uOff, uBoxMin, uBoxSize, uC1, uC2; uniform float uT, uSway, uTw, uSize, uPx, uAlpha;
varying vec3 vC; varying float vA;
void main(){
  float sp = 0.6 + aR.y * 0.8;
  vec3 p = position + uOff * vec3(sp, sp, sp);
  p = mod(p - uBoxMin, uBoxSize) + uBoxMin;
  vec3 q = (p - uBoxMin) / uBoxSize;
  float edge = smoothstep(0.0, 0.1, q.y) * smoothstep(1.0, 0.85, q.y) * smoothstep(0.0, 0.08, q.x) * smoothstep(1.0, 0.92, q.x) * smoothstep(0.0, 0.08, q.z) * smoothstep(1.0, 0.92, q.z);
  p.x += sin(uT * (0.55 + aR.y) + aR.x * 6.283) * uSway;
  p.z += cos(uT * (0.45 + aR.y * 0.7) + aR.x * 4.1) * uSway * 0.7;
  p.y += sin(uT * (0.8 + aR.z) + aR.x * 3.0) * uSway * 0.25;
  float tw = uTw > 0.0 ? pow(0.5 + 0.5 * sin(uT * (1.4 + aR.y * 2.6) + aR.x * 6.283), uTw) : 1.0;
  vA = uAlpha * tw * edge; vC = mix(uC1, uC2, aR.w);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(uSize * (0.6 + aR.z * 0.8) * uPx / -mv.z, 1.0, 48.0);
  if (vA < 0.004) gl_PointSize = 0.0;
  gl_Position = projectionMatrix * mv;
}`;
const AMB_FRAG = `uniform float uStar; varying vec3 vC; varying float vA;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = 1.0 - smoothstep(0.12, 0.5, d);
  if (uStar > 0.5) a = max(exp(-abs(c.x) * 22.0) * exp(-abs(c.y) * 4.0), exp(-abs(c.y) * 22.0) * exp(-abs(c.x) * 4.0)) + (1.0 - smoothstep(0.0, 0.2, d));
  if (a * vA < 0.004) discard;
  gl_FragColor = vec4(vC, min(1.0, a * vA));
}`;
// fall: dikey hız (− düşer, + yükselir) · drift: rüzgâr yönünde kayma · sway: salınım · tw: pırıltı keskinliği · y: kutu yüksekliği
const AMB_KINDS = {
  ege: { fall: 0.04, drift: 0.32, sway: 0.35, tw: 0, size: 0.05, alpha: 0.5, c1: [1.5, 1.4, 1.1], c2: [1.6, 1.35, 0.55], y: 5 },
  ruzgar: { fall: 0.02, drift: 0.85, sway: 0.28, tw: 0, size: 0.05, alpha: 0.5, c1: [1.6, 1.55, 1.4], c2: [1.5, 1.4, 0.8], y: 5.5 },
  peri: { fall: -0.03, drift: 0.14, sway: 0.2, tw: 2, size: 0.045, alpha: 0.5, c1: [1.7, 1.25, 0.85], c2: [1.4, 0.95, 0.65], y: 6 },
  tuz: { fall: 0, drift: 0.05, sway: 0.12, tw: 9, size: 0.1, alpha: 0.9, c1: [2.4, 2.25, 2.6], c2: [2.0, 2.4, 2.6], y: 2.6, star: 1 },
  ikiz: { fall: 0.17, drift: 0.05, sway: 0.3, tw: 3, size: 0.06, alpha: 0.75, c1: [0.6, 2.2, 2.0], c2: [2.2, 0.7, 1.8], y: 6 },
  buz: { fall: -0.55, drift: 0.22, sway: 0.4, tw: 0, size: 0.065, alpha: 0.85, c1: [1.7, 1.8, 2.0], c2: [1.35, 1.55, 1.95], y: 9 },
  ayna: { fall: -0.26, drift: 0.3, sway: 0.6, tw: 0, size: 0.075, alpha: 0.8, c1: [1.9, 0.85, 1.05], c2: [1.8, 1.6, 1.55], y: 7 },
  saat: { fall: -0.04, drift: 0.08, sway: 0.2, tw: 6, size: 0.07, alpha: 0.75, c1: [2.3, 1.65, 0.7], c2: [1.6, 2.1, 1.9], y: 5, star: 1 },
};
const Ambient = {
  max: 260, n: 0, k: null, off: new THREE.Vector3(), t: 0,
  init() {
    const N = this.max, pos = new Float32Array(N * 3), r = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * 20 - 10; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = Math.random() * 26 - 14;
      for (let k = 0; k < 4; k++) r[i * 4 + k] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(r, 4));
    this.u = { uOff: { value: this.off }, uBoxMin: { value: new THREE.Vector3(-10, 0, -14) }, uBoxSize: { value: new THREE.Vector3(20, 6, 26) },
      uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uT: { value: 0 }, uSway: { value: 0 }, uTw: { value: 0 }, uSize: { value: 0.05 },
      uPx: { value: 400 }, uAlpha: { value: 0 }, uStar: { value: 0 } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: AMB_VERT, fragmentShader: AMB_FRAG, uniforms: this.u, transparent: true, depthWrite: false });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 6; this.pts.visible = false;
    g.setDrawRange(0, 0); scene.add(this.pts);
  },
  setCount(n) { this.n = Math.min(this.max, n | 0); this.pts.geometry.setDrawRange(0, this.n); this.pts.visible = this.n > 0 && !!this.k; },
  setWorld(key) {
    const k = AMB_KINDS[key] || null; this.k = k; this.pts.visible = this.n > 0 && !!k; if (!k) return;
    const u = this.u; u.uC1.value.setRGB(...k.c1); u.uC2.value.setRGB(...k.c2); u.uSway.value = k.sway; u.uTw.value = k.tw; u.uSize.value = k.size; u.uStar.value = k.star || 0;
    u.uBoxSize.value.y = k.y; u.uAlpha.value = 0; this.fade = 0;
  },
  update(dt, night) {
    if (!this.pts.visible) return;
    const k = this.k, w = U.uWind.value; this.t += dt; this.u.uT.value = this.t;
    this.off.x += k.drift * w * dt; this.off.z += k.drift * 0.35 * w * dt; this.off.y += k.fall * dt;
    if (Math.abs(this.off.x) > 8000 || Math.abs(this.off.y) > 8000) this.off.set(0, 0, 0); // hassasiyet kaybını önle
    this.fade = Math.min(1, (this.fade || 0) + dt * 0.6);
    this.u.uAlpha.value = k.alpha * this.fade * (1 - 0.45 * night);
  },
};
Ambient.init();

/* ---------- havai fişek ----------
   Her kıvılcımın yolu kapalı formülle GPU'da hesaplanır (sürtünme + yerçekimi); işlemci yalnızca patlama anında
   birkaç yüz değer yazar. Kıvılcım başına 3 nokta: baş + iki kuyruk izi. Işıltıyı mevcut bloom verir. */
const FW_VERT = `attribute vec3 aO, aV; attribute vec4 aP, aC; attribute vec3 aF; uniform float uT, uPx; varying vec3 vC; varying float vA;
void main(){
  float t = uT - aP.x - aF.x * 0.035 * aF.z, life = aP.y;
  if (t < 0.0 || t > life){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
  float k = aP.z, g = aP.w, e = (1.0 - exp(-k * t)) / k;
  vec3 p = aO + aV * e - vec3(0.0, g, 0.0) * (t - e) / k;
  float f = t / life;
  float a = (1.0 - f * f) * (aF.x < 0.5 ? 1.0 : aF.x < 1.5 ? 0.42 : 0.18) * (1.0 + 1.6 * exp(-t * 14.0));
  if (aF.y > 0.5 && f > 0.35) a *= step(0.45, fract(sin(floor(uT * 26.0) + aO.x * 13.1 + aV.y * 71.7 + aV.x * 37.3) * 43758.5453)) * 1.6;
  vA = a; vC = aC.rgb * mix(vec3(1.0), vec3(1.25, 0.82, 0.55), f * f);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(aC.a * (1.0 - 0.45 * f) * (1.0 - aF.x * 0.22) * uPx / -mv.z, 1.0, 36.0);
  gl_Position = projectionMatrix * mv;
}`;
const FW_FRAG = `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.08, 0.5, d)) * vA; if (a < 0.004) discard; gl_FragColor = vec4(vC * a, a); }`;
const FW_PAL = [[3.2, 1.2, 0.5], [3.4, 2.4, 0.8], [1.0, 2.6, 3.4], [3.0, 0.9, 2.4], [1.2, 3.2, 1.4], [2.4, 1.4, 3.4], [3.4, 3.2, 2.8]];
const Fireworks = {
  max: 0, head: 0, t: 0, until: 0, queue: [], k: 1,
  init(max = 4200) {
    this.max = max; const n = max * 3, g = new THREE.BufferGeometry();
    const mk = (name, sz) => { const a = new THREE.BufferAttribute(new Float32Array(n * sz), sz).setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; };
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.aO = mk('aO', 3); this.aV = mk('aV', 3); this.aP = mk('aP', 4); this.aC = mk('aC', 4); this.aF = mk('aF', 3);
    for (let i = 0; i < n; i++) { this.aP.array[i * 4] = -1e4; this.aP.array[i * 4 + 1] = 0.01; this.aP.array[i * 4 + 2] = 1; this.aF.array[i * 3] = i % 3; this.aF.array[i * 3 + 2] = 1; }
    this.u = { uT: { value: 0 }, uPx: { value: 400 } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: FW_VERT, fragmentShader: FW_FRAG, uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 9; this.pts.visible = false;
    scene.add(this.pts);
  },
  // kıvılcım yaz: konum, hız, ömür, sürtünme, yerçekimi, renk, boy, çıtırtı, iz uzunluğu
  spark(o, vx, vy, vz, life, drag, grav, c, size, crackle = 0, trail = 1, delay = 0) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    for (let k = 0; k < 3; k++) {
      const j = i * 3 + k;
      this.aO.array.set([o.x, o.y, o.z], j * 3); this.aV.array.set([vx, vy, vz], j * 3);
      this.aP.array.set([this.t + delay, life, Math.max(0.05, drag), grav], j * 4); this.aC.array.set([c[0], c[1], c[2], size], j * 4);
      this.aF.array[j * 3 + 1] = crackle; this.aF.array[j * 3 + 2] = trail;
    }
    this.dirty0 = Math.min(this.dirty0 ?? i, i); this.dirty1 = Math.max(this.dirty1 ?? i, i);
    this.until = Math.max(this.until, this.t + delay + life + 0.2);
  },
  flush() {
    if (this.dirty0 == null) return;
    const a = this.dirty0, b = this.dirty1;
    for (const [at, sz] of [[this.aO, 3], [this.aV, 3], [this.aP, 4], [this.aC, 4], [this.aF, 3]]) { at.clearUpdateRanges(); at.addUpdateRange(a * 3 * sz, (b - a + 1) * 3 * sz); at.needsUpdate = true; }
    this.dirty0 = this.dirty1 = null;
  },
  // ekranda (NDC) bir nokta ve kameradan uzaklık → dünya konumu
  at(nx, ny, d, out = new THREE.Vector3()) { out.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(d).add(camera.position); return out; },
  // roket: aşağıdan yükselir, tepede patlar
  rocket(target, kind, col, delay = 0) {
    const rise = 1.0 + Math.random() * 0.35, from = target.clone(); from.y -= 9 + Math.random() * 4; from.x += (Math.random() - 0.5) * 3;
    const vy = (target.y - from.y) / rise + 4.9 * rise * 0.5, vx = (target.x - from.x) / rise, vz = (target.z - from.z) / rise;
    this.spark(from, vx, vy, vz, rise, 0.05, 4.9, [3.2, 2.2, 1.2], 0.16, 0, 3.2, delay);
    for (let i = 0; i < 5; i++) this.spark(from, vx * 0.9 + (Math.random() - 0.5) * 0.6, vy * 0.85, vz * 0.9, rise * (0.5 + i * 0.1), 1.2, 4.9, [2.6, 1.6, 0.7], 0.07, 1, 1.4, delay + i * 0.05);
    this.queue.push({ t: this.t + delay + rise, fn: () => this.burst(target, kind, col) });
    this.queue.push({ t: this.t + delay, fn: () => audio.fwLaunch && audio.fwLaunch() });
    this.pts.visible = true;
  },
  burst(o, kind, col) {
    const K = this.k, c2 = FW_PAL[(FW_PAL.indexOf(col) + 3) % FW_PAL.length] || [3.4, 3.2, 2.8];
    const sph = (n, sp, life, drag, grav, size, cr, tr, cc, alt) => { for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.399963 + Math.random() * 0.2, s = sp * (0.88 + Math.random() * 0.24); this.spark(o, Math.cos(a) * r * s, y * s, Math.sin(a) * r * s, life * (0.85 + Math.random() * 0.3), drag, grav, alt && i % 2 ? alt : cc, size, cr, tr); } };
    if (kind === 'ring') {
      const n = Math.round(70 * K), ax = new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize(), u = new THREE.Vector3(1, 0, 0).cross(ax).normalize(), v = ax.clone().cross(u);
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU, s = 13; this.spark(o, (u.x * Math.cos(a) + v.x * Math.sin(a)) * s, (u.y * Math.cos(a) + v.y * Math.sin(a)) * s, (u.z * Math.cos(a) + v.z * Math.sin(a)) * s, 1.6, 1.7, 2.2, col, 0.26, 0, 1.2); }
      sph(Math.round(30 * K), 4, 1.3, 1.8, 2.2, 0.16, 0, 1, c2);
    } else if (kind === 'willow') sph(Math.round(120 * K), 10, 3.2, 1.25, 3.6, 0.2, 0, 2.2, [3.4, 2.3, 0.9]);
    else if (kind === 'crackle') { sph(Math.round(100 * K), 12, 1.9, 1.6, 2.6, 0.22, 1, 1, [3.4, 3.2, 2.8]); sph(Math.round(36 * K), 6, 1.4, 1.6, 2.4, 0.26, 0, 1, col); }
    else if (kind === 'palm') { for (let j = 0; j < 9; j++) { const a = (j / 9) * TAU, el = 0.35 + Math.random() * 0.3; for (let i = 0; i < Math.round(9 * K); i++) { const s = 12 * (0.55 + i * 0.06); this.spark(o, Math.cos(a) * Math.cos(el) * s, Math.sin(el) * s, Math.sin(a) * Math.cos(el) * s, 2.2, 1.3, 3.2, i % 3 ? [3.3, 2.2, 0.8] : col, 0.26, 0, 1.6); } } }
    else sph(Math.round(130 * K), 13, 1.9, 1.75, 2.4, 0.26, 0, 1.3, col, Math.random() < 0.5 ? c2 : null); // şakayık
    // patlama anı: kısa parlak çekirdek
    for (let i = 0; i < 6; i++) this.spark(o, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.25, 3, 0, [4, 3.6, 3], 0.9, 0, 0.2);
    const d = o.distanceTo(camera.position);
    this.queue.push({ t: this.t + Math.min(0.35, d / 340), fn: () => audio.fwBoom && audio.fwBoom(kind === 'crackle') });
  },
  // gösteri: n roket, ekranın üst yarısına dağılır
  show(n, grand = false) {
    if (!this.max) return;
    const kinds = ['peony', 'peony', 'ring', 'willow', 'crackle', 'palm'];
    let t = 0;
    for (let i = 0; i < n; i++) {
      const nx = (Math.random() * 2 - 1) * 0.7, ny = 0.05 + Math.random() * 0.6, d = 34 + Math.random() * 18;
      const tg = this.at(nx, ny, d), kind = grand && i === n - 1 ? 'willow' : kinds[Math.floor(Math.random() * kinds.length)];
      this.rocket(tg, kind, FW_PAL[Math.floor(Math.random() * FW_PAL.length)], t);
      t += grand ? 0.25 + Math.random() * 0.45 : 0.45 + Math.random() * 0.6;
      if (grand && i % 4 === 3) t += 0.6;
    }
  },
  // eski kıvılcımların süresi zaten dolmuş olur (zaman ilerlemeye devam eder): tampona yazmaya gerek yok
  stop() { this.queue.length = 0; this.until = 0; this.pts.visible = false; },
  update(dt) {
    if (!this.pts.visible || dt <= 0) return;
    this.t += dt; this.u.uT.value = this.t;
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].t <= this.t) { const q = this.queue[i]; this.queue.splice(i, 1); q.fn(); }
    this.flush();
    if (this.t > this.until && !this.queue.length) this.pts.visible = false;
  },
};
Fireworks.init();
// kayan yıldız: gece birkaç saniyede bir, ekranın görünen bölgesinde çapraz bir iz (gökyüzü ve bulut denizi paylaşır)
const Shoot = {
  next: 2, p: -1, dur: 0.7, S: new THREE.Vector3(), E: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(),
  dir(nx, ny, out) { return out.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize(); },
  update(dt, k) {
    if (k < 0.5 || dt <= 0) { if (k < 0.5) { uShA.value.w = 0; this.p = -1; } return; }
    if (this.p < 0) {
      if ((this.next -= dt) > 0) { uShA.value.w = 0; return; }
      const x0 = (Math.random() * 2 - 1) * 0.8, y0 = 0.15 + Math.random() * 0.75, L = 0.3 + Math.random() * 0.3, sx = x0 > 0 ? -1 : 1;
      this.dir(x0, y0, this.S); this.dir(x0 + sx * L, y0 - L * (0.35 + Math.random() * 0.5), this.E); this.p = 0; this.dur = 0.55 + Math.random() * 0.4;
    }
    this.p += dt / this.dur;
    if (this.p >= 1) { this.p = -1; this.next = 2.5 + Math.random() * 5; uShA.value.w = 0; return; }
    const head = Math.min(1, this.p * 1.25), tail = Math.max(0, head - 0.38);
    this.a.copy(this.S).lerp(this.E, tail).normalize(); this.b.copy(this.S).lerp(this.E, head).normalize();
    uShA.value.set(this.a.x, this.a.y, this.a.z, Math.sin(this.p * PI) * k); uShB.value.set(this.b.x, this.b.y, this.b.z, 0);
  },
};

/* ---------- ayak izleri ---------- */
const PRINTS = { n: 48, i: 0, mesh: null, alpha: null };
(function buildPrints() {
  const g = new THREE.PlaneGeometry(0.2, 0.26); g.rotateX(-PI / 2);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(PRINTS.n), 1);
  g.setAttribute('aA', alpha);
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: TEX.ink } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float aA; varying float vA; varying vec2 vUv; void main(){ vA = aA; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; varying float vA; varying vec2 vUv; void main(){ float a = texture2D(map, vUv).a * vA; gl_FragColor = vec4(0.02, 0.01, 0.05, a); }`,
  });
  const mesh = new THREE.InstancedMesh(g, m, PRINTS.n); mesh.frustumCulled = false; mesh.renderOrder = 2;
  const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < PRINTS.n; i++) mesh.setMatrixAt(i, z);
  PRINTS.mesh = mesh; PRINTS.alpha = alpha; scene.add(mesh);
})();
function addPrint(x, z, yaw) {
  const i = PRINTS.i++ % PRINTS.n;
  _m4.compose(new THREE.Vector3(x, 0.012, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  PRINTS.mesh.setMatrixAt(i, _m4); PRINTS.mesh.instanceMatrix.needsUpdate = true; PRINTS.alpha.array[i] = 0.55; PRINTS.alpha.needsUpdate = true;
}
function updatePrints(dt) { const a = PRINTS.alpha.array; let ch = false; for (let i = 0; i < PRINTS.n; i++) if (a[i] > 0) { a[i] = Math.max(0, a[i] - dt * 0.09); ch = true; } if (ch) PRINTS.alpha.needsUpdate = true; }
function clearPrints() { PRINTS.alpha.array.fill(0); PRINTS.alpha.needsUpdate = true; }

/* ---------- Zifir ---------- */
const ZIF_VERT = `uniform float uTime, uWob, uBurn; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
void main(){
  vec3 p = position;
  float n = sin(p.x * 11.0 + uTime * 5.3) * sin(p.y * 9.0 + uTime * 4.1) * sin(p.z * 10.0 + uTime * 6.2);
  p += normal * n * 0.035 * (uWob + uBurn * 1.8);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vP = w.xyz; vL = position;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const ZIF_FRAG = `uniform vec3 uRim, uSunDir, uSunCol; uniform float uBurn, uTime, uLit, uFade; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.4);
  vec3 col = vec3(0.012, 0.009, 0.022);
  col += uRim * fr * 1.6;
  col += uRim * 0.25 * pow(max(N.y, 0.0), 3.0);
  vec3 H = normalize(uSunDir + V); float sp = pow(max(dot(N, H), 0.0), 70.0);
  col += uSunCol * sp * (0.6 + uLit * 2.5);
  float cr = n3(vL * 9.0 + vec3(0.0, uTime * 0.8, 0.0)) * 0.65 + n3(vL * 21.0 - uTime) * 0.35;
  float crack = smoothstep(0.55, 0.62, cr) * (1.0 - smoothstep(0.62, 0.75, cr));
  col += vec3(4.0, 1.3, 0.25) * crack * uBurn * 2.2 + vec3(1.5, 0.45, 0.08) * uBurn * fr * 2.0;
  gl_FragColor = vec4(col * uFade, 1.0);
}`;
const RING_FRAG = `uniform float uV, uA, uTime; varying vec2 vUv;
void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
  float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
  float fill = step(a, uV);
  vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
  float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
  gl_FragColor = vec4(c * pulse, band * (fill * 0.95 + 0.12) * uA);
}`;
const ZIF_SCALE = 1.55;
const SIL_VERT = `varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vY = wp.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const SIL_FRAG = `uniform vec3 uRim; uniform float uFade; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){
  if (vY < 0.07) discard; // zemine değen alt kenar: çizgi yalnızca gerçekten örtülünce görünsün
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
  vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse;
  gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`;
class Zifir {
  constructor() {
    this.g = new THREE.Group(); this.k = new THREE.Group(); this.k.scale.setScalar(ZIF_SCALE); this.g.add(this.k); this.body = new THREE.Group(); this.k.add(this.body);
    this.u = { uTime: U.uTime, uWob: { value: 0.5 }, uBurn: { value: 0 }, uRim: { value: new THREE.Color(SKINS[Save.data.skin]?.c || SKINS[0].c) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) }, uLit: { value: 0 }, uFade: { value: 1 } };
    this.blob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: ZIF_FRAG, uniforms: this.u }));
    this.blob.position.y = 0.3; this.body.add(this.blob);
    // bir şeyin arkasında kalınca (kemer çatısı, kule, bulut) ince parlak dış çizgisi görünür; dünya nesneleri opak kalır
    this.sil = new THREE.Mesh(this.blob.geometry, new THREE.ShaderMaterial({ vertexShader: SIL_VERT, fragmentShader: SIL_FRAG, uniforms: { uRim: this.u.uRim, uFade: this.u.uFade, uTime: U.uTime }, transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth }));
    this.sil.position.y = 0.3; this.sil.scale.setScalar(1.035); this.sil.renderOrder = 30; this.body.add(this.sil);
    // gözler
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.15, 2.0) });
    const pupM = new THREE.MeshBasicMaterial({ color: 0x050308 });
    this.eyes = []; this.pupils = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), eyeM); e.scale.set(0.95, 1.25, 0.55); e.position.set(sx * 0.105, 0.38, 0.25);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), pupM); p.position.set(0, -0.005, 0.06); e.add(p);
      this.body.add(e); this.eyes.push(e); this.pupils.push(p);
    }
    // ayaklar
    const footM = new THREE.MeshBasicMaterial({ color: 0x050308 });
    this.feet = [-1, 1].map((sx) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), footM); f.scale.set(1, 0.6, 1.35); f.position.set(sx * 0.12, 0.04, 0.02); this.k.add(f); return f; });
    // mürekkep halesi ve metre halkası
    this.aura = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: TEX.ink, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.aura.rotation.x = -PI / 2; this.aura.position.y = 0.012; this.aura.renderOrder = 3; this.k.add(this.aura);
    this.ringU = { uV: { value: 1 }, uA: { value: 0 }, uTime: U.uTime };
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: RING_FRAG, uniforms: this.ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.rotation.x = -PI / 2; this.ring.position.y = 0.025; this.ring.renderOrder = 4; this.k.add(this.ring);
    scene.add(this.g);
    this.reset();
  }
  setSkin(i) { this.u.uRim.value.set(SKINS[i].c); }
  // ---- kostümler: gövdeye bağlı (ezilip zıplarken birlikte esner); mürekkep gölgelendiricisi + küçük renkli ayrıntılar
  setCostume(key) {
    if (this.cos) { this.body.remove(this.cos.g); this.cos.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.cos = null; }
    if (!key) return;
    try { this.cos = buildCostume(key, this.inkMat || (this.inkMat = new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: ZIF_FRAG, uniforms: this.u }))); this.body.add(this.cos.g); } catch (e) { console.warn('kostüm', e); this.cos = null; }
  }
  reset() {
    this.phase = 0; this.hop = 0; this.land = 0; this.yaw = 0; this.blinkT = 2; this.blink = 0; this.squash = 0; this.sqV = 0; this.shiver = 0;
    this.lookX = 0; this.lookY = 0; this.scaleK = 1; this.visible = true; this.mood = 0; this.wispT = 0; this.stepSide = 0;
    this.idleT = 0; this.idleYaw = 0; this.idleTo = 0; this.idleNext = 0; this.hopT = 0; this.tapT = 0;
    this.g.visible = true; this.g.scale.setScalar(1); this.u.uFade.value = 1;
  }
  // squash impulse
  kick(v) { this.sqV += v; }
  // kurtulunca sevinç zıplaması (canlılık açıksa)
  relief() { if (Perf.Q.life) this.hopT = 0.55; }
  update(dt, st) {
    // st: {x, z, yaw, moving, speed, burn, meter, look:{x,y,z}|null, mood}
    const g = this.g;
    g.position.set(st.x, st.y || 0, st.z);
    let dy = st.yaw - this.yaw; while (dy > PI) dy -= TAU; while (dy < -PI) dy += TAU;
    this.yaw += dy * (1 - Math.exp(-10 * dt));
    // canlılık (Orta ve üstü): durunca etrafa bakınır, beklerken ayağını vurur, kurtulunca zıplar
    const life = Perf.Q.life && !st.dive;
    this.idleT = st.moving || !life ? 0 : this.idleT + dt;
    if (this.idleT > 3) { if ((this.idleNext -= dt) <= 0) { this.idleTo = this.idleTo ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.35); this.idleNext = this.idleTo ? 1.1 + Math.random() * 0.8 : 1.6 + Math.random() * 1.6; } }
    else { this.idleTo = 0; this.idleNext = 0.4; }
    this.idleYaw = damp(this.idleYaw, this.idleTo, 5, dt);
    g.rotation.y = this.yaw + this.idleYaw;
    // yay-sönüm squash
    this.sqV += (-this.squash * 220 - this.sqV * 16) * dt; this.squash += this.sqV * dt;
    let bodyY = 0, sx = 1, sy = 1;
    if (st.moving) {
      const prev = this.phase;
      this.phase += dt * st.speed * 4.4;
      const ph = this.phase % 1;
      bodyY = Math.sin(ph * PI) * 0.12;
      if (Math.floor(this.phase) !== Math.floor(prev)) {
        this.kick(-2.2); audio.step();
        this.stepSide ^= 1; const f = this.feet[this.stepSide];
        const wx = st.x + Math.cos(this.yaw) * (this.stepSide ? 0.12 : -0.12), wz = st.z - Math.sin(this.yaw) * (this.stepSide ? 0.12 : -0.12);
        addPrint(wx, wz, this.yaw);
        if (st.burn > 0.05) FX.smoke(st.x, 0.1, st.z, 0.6);
      }
      sy = 1 + Math.sin(ph * PI) * 0.06;
      for (let i = 0; i < 2; i++) { const fp = (this.phase + i * 0.5) % 1; this.feet[i].position.z = 0.02 + Math.sin(fp * TAU) * 0.09; this.feet[i].position.y = 0.04 + Math.max(0, Math.sin(fp * TAU)) * 0.05; }
    } else {
      const br = Math.sin(U.uTime.value * 2.2) * 0.025; sy = 1 + br; sx = 1 - br * 0.6;
      for (let i = 0; i < 2; i++) { this.feet[i].position.z = damp(this.feet[i].position.z, 0.02, 8, dt); this.feet[i].position.y = 0.04; }
      if (life && st.hold) { this.tapT += dt; const tp = Math.max(0, Math.sin(this.tapT * 11)); this.feet[1].position.y = 0.04 + tp * 0.045; this.feet[1].position.z = 0.05; sy *= 1 - tp * 0.015; }
      else this.tapT = 0;
    }
    if (this.hopT > 0) { this.hopT = Math.max(0, this.hopT - dt); const hk = Math.sin((1 - this.hopT / 0.55) * PI); bodyY += hk * 0.22; sy *= 1 + hk * 0.08; if (this.hopT === 0) this.kick(-2.4); }
    sy *= 1 + this.squash; sx *= 1 - this.squash * 0.55;
    const dv = st.dive || 0; sy *= 1 - dv * 0.72; sx *= 1 + dv * 0.45; bodyY -= dv * 0.06;
    this.aura.scale.setScalar(1 + dv * 0.9); this.aura.material.opacity = 0.85 + dv * 0.15;
    const shrink = lerp(0.62, 1, st.meter);
    this.scaleK = damp(this.scaleK, shrink, 6, dt);
    this.shiver = st.burn > 0 ? 0.018 * st.burn : 0;
    this.body.position.set((Math.random() - 0.5) * this.shiver, bodyY, (Math.random() - 0.5) * this.shiver);
    this.body.scale.set(sx * this.scaleK, sy * this.scaleK, sx * this.scaleK);
    // göz kırpma & bakış
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 0.14; this.blinkT = 1.8 + Math.random() * 3.5; }
    this.blink = Math.max(0, this.blink - dt);
    const squint = (st.dive || 0) > 0.5 ? 0.25 : st.burn > 0.05 ? 0.45 : st.mood > 0 ? 0.35 : 1;
    const ey = this.blink > 0 ? 0.12 : squint;
    for (const e of this.eyes) e.scale.y = damp(e.scale.y, 1.25 * ey, 30, dt);
    if (st.look) {
      const lx = st.look.x - st.x, lz = st.look.z - st.z; const ly = st.look.y - 0.4;
      const cs = Math.cos(-this.yaw), sn = Math.sin(-this.yaw);
      const ax = cs * lx + sn * lz; const len = Math.hypot(lx, ly, lz) || 1;
      this.lookX = damp(this.lookX, clamp(ax / len, -1, 1) * 0.03, 8, dt); this.lookY = damp(this.lookY, clamp(ly / len, -1, 1) * 0.025, 8, dt);
    }
    for (const p of this.pupils) { p.position.x = this.lookX - this.idleYaw * 0.03; p.position.y = -0.005 + this.lookY; p.scale.setScalar(st.burn > 0.05 ? 0.7 : 1); }
    // shader
    this.u.uBurn.value = damp(this.u.uBurn.value, st.burn, 14, dt);
    this.u.uLit.value = this.u.uBurn.value;
    this.u.uWob.value = st.moving ? 0.7 : 0.4;
    if (this.cos) this.cos.update(dt, U.uTime.value, st.moving, this.hopT > 0);
    // metre halkası
    this.ringU.uV.value = st.meter;
    this.ringU.uA.value = damp(this.ringU.uA.value, st.meter < 0.995 || st.burn > 0 ? 1 : 0, 6, dt);
    // tütsü gibi yükselen gölge tülü
    this.wispT -= dt;
    if (this.wispT < 0) { this.wispT = st.burn > 0.05 ? 0.03 : 0.22; const wy = (0.62 * this.scaleK + bodyY) * ZIF_SCALE; if (st.burn > 0.05) { FX.smoke(st.x, wy, st.z, 1); if (Math.random() < 0.5) FX.ember(st.x, wy - 0.1, st.z); } else fxMix.spawn(st.x + (Math.random() - 0.5) * 0.1, wy, st.z + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0.35, (Math.random() - 0.5) * 0.1, { c: [0.06, 0.04, 0.1], a: 0.4, s: 0.12, s1: 0.35, life: 1.2, drag: 0.8, t: 1 }); }
  }
}

/* ---------- Zifir kostüm modelleri (gövde uzayı: merkez y 0.3, yarıçap 0.3, ön +z) ---------- */
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cv = new THREE.Vector3(), _cs = new THREE.Vector3();
// incelen tüp: eğri boyunca yarıçap r(s)
function taperTube(pts, rf, segs = 18, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, c); const r = rf(i / segs); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r); } }
  g.computeVertexNormals(); return g;
}
function cMesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); return m; }
const C_MATS = {};
const cAcc = (hex, k = 1) => C_MATS[hex + k] || (C_MATS[hex + k] = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(k), emissive: new THREE.Color(hex).multiplyScalar(0.18 * k) }));
function buildCostume(key, ink) {
  const g = new THREE.Group(), anim = [];
  const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };
  const ear = (s, w, h, tilt, inner, y = 0.55, back = 0) => { // dört yüzlü kulak (+ iç renk)
    const p = pivot(s * 0.14, y, back); p.rotation.set(-0.08, 0, -s * tilt);
    p.add(cMesh(new THREE.ConeGeometry(w, h, 4), ink, [0, h / 2 - 0.02, 0], [0, PI / 4, 0], [1, 1, 0.5]));
    if (inner) p.add(cMesh(new THREE.ConeGeometry(w * 0.55, h * 0.68, 4), cAcc(inner, 0.9), [0, h * 0.4 - 0.02, w * 0.2], [0, PI / 4, 0], [1, 1, 0.3]));
    anim.push({ o: p, kind: 'twitch', s, base: -s * tilt, ph: Math.random() * 9 }); return p;
  };
  const tail = (pts, rf, tip, sway = 0.3) => { // gövdenin arkasına bağlı kuyruk
    const p = pivot(0, 0.18, -0.24); const t = new THREE.Mesh(taperTube(pts, rf, 22, 9), ink); p.add(t);
    if (tip) { const e = pts[pts.length - 1]; p.add(cMesh(new THREE.SphereGeometry(rf(1) * 1.25 + 0.012, 12, 8), cAcc(tip, 1.1), e)); }
    anim.push({ o: p, kind: 'sway', amp: sway, ph: Math.random() * 9 }); return p;
  };
  if (key === 'kedi') {
    ear(1, 0.11, 0.25, 0.32, '#ff9ccb'); ear(-1, 0.11, 0.25, 0.32, '#ff9ccb');
    tail([[0, 0, 0], [0, -0.04, -0.16], [0.02, 0.12, -0.3], [0.06, 0.32, -0.3], [0.1, 0.4, -0.22]], (s) => 0.034 - s * 0.012, null, 0.35);
  } else if (key === 'tavsan') {
    for (const s of [1, -1]) {
      const p = pivot(s * 0.09, 0.56, -0.02); p.rotation.z = -s * 0.18;
      p.add(new THREE.Mesh(taperTube([[0, 0, 0], [s * 0.02, 0.14, -0.02], [s * 0.05, 0.3, -0.05], [s * 0.06, 0.4, -0.06]], (u) => 0.05 * (0.75 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.1))), 16, 8), ink));
      p.add(new THREE.Mesh(taperTube([[0, 0.04, 0.03], [s * 0.02, 0.16, 0.02], [s * 0.045, 0.31, -0.01]], (u) => 0.022 * (1 - u * 0.4), 12, 6), cAcc('#ffb3d4', 0.85)));
      anim.push({ o: p, kind: 'flop', s, base: -s * 0.18, ph: Math.random() * 9 });
    }
    g.add(cMesh(new THREE.SphereGeometry(0.075, 14, 10), cAcc('#f4efff', 1.05), [0, 0.16, -0.3]));
  } else if (key === 'tilki') {
    ear(1, 0.12, 0.3, 0.24, '#f6efe4'); ear(-1, 0.12, 0.3, 0.24, '#f6efe4');
    tail([[0, 0, 0], [0, -0.08, -0.2], [0.06, 0, -0.42], [0.1, 0.22, -0.5], [0.08, 0.38, -0.44]], (s) => 0.05 + 0.075 * Math.sin(Math.PI * Math.min(1, s * 1.05)), '#f6efe4', 0.32);
  } else if (key === 'geyik') {
    for (const s of [1, -1]) {
      const p = pivot(s * 0.1, 0.55, -0.02);
      p.add(new THREE.Mesh(taperTube([[0, 0, 0], [s * 0.08, 0.14, -0.03], [s * 0.18, 0.3, -0.08], [s * 0.24, 0.46, -0.12]], (u) => 0.03 - u * 0.016, 14, 7), ink));
      p.add(new THREE.Mesh(taperTube([[s * 0.1, 0.17, -0.04], [s * 0.08, 0.28, 0.04], [s * 0.07, 0.36, 0.08]], (u) => 0.02 - u * 0.012, 8, 6), ink));
      p.add(new THREE.Mesh(taperTube([[s * 0.19, 0.33, -0.09], [s * 0.15, 0.44, -0.02], [s * 0.14, 0.5, 0.02]], (u) => 0.017 - u * 0.01, 8, 6), ink));
      p.add(new THREE.Mesh(taperTube([[s * 0.15, 0.25, -0.06], [s * 0.26, 0.3, -0.02], [s * 0.32, 0.31, 0.02]], (u) => 0.017 - u * 0.01, 8, 6), ink));
    }
  } else if (key === 'baykus') {
    for (const s of [1, -1]) { const p = pivot(s * 0.13, 0.55, 0.02); p.rotation.z = -s * 0.55; p.add(cMesh(new THREE.ConeGeometry(0.07, 0.2, 6), ink, [0, 0.08, 0], [0, 0, 0], [1, 1, 0.4])); anim.push({ o: p, kind: 'twitch', s, base: -s * 0.55, ph: Math.random() * 9 }); }
    for (const s of [1, -1]) g.add(cMesh(new THREE.TorusGeometry(0.083, 0.013, 6, 20), cAcc('#e8d9b4', 1.1), [s * 0.105, 0.38, 0.262], [0, s * 0.35, 0], [0.95, 1.25, 1]));
    g.add(cMesh(new THREE.ConeGeometry(0.032, 0.085, 8), cAcc('#ffb347', 1.1), [0, 0.31, 0.3], [PI / 2 + 0.45, 0, 0]));
  } else if (key === 'kurt') {
    ear(1, 0.11, 0.32, 0.16, '#c9c3d6'); ear(-1, 0.11, 0.32, 0.16, '#c9c3d6');
    tail([[0, 0, 0], [0, -0.06, -0.22], [0.03, -0.04, -0.46], [0.05, 0.06, -0.6]], (s) => 0.045 + 0.05 * Math.sin(Math.PI * Math.min(1, s * 1.1)), '#d6d2e6', 0.22);
  } else if (key === 'ejderha') {
    for (const s of [1, -1]) g.add(new THREE.Mesh(taperTube([[s * 0.1, 0.55, -0.04], [s * 0.15, 0.68, -0.14], [s * 0.17, 0.74, -0.28], [s * 0.15, 0.72, -0.38]], (u) => 0.04 * (1 - u) + 0.004, 14, 7), cAcc('#efe2c8', 1.0)));
    // yarasa kanadı: üç parmaklı, tırtıklı zar
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.42, 0.26); sh.quadraticCurveTo(0.36, 0.12, 0.42, 0.02); sh.quadraticCurveTo(0.33, 0.0, 0.34, -0.1); sh.quadraticCurveTo(0.24, -0.06, 0.22, -0.16); sh.quadraticCurveTo(0.12, -0.06, 0, -0.06); sh.lineTo(0, 0);
    const wg = new THREE.ShapeGeometry(sh, 6), mem = new THREE.MeshLambertMaterial({ color: 0x3a1d5c, emissive: 0x2a0f48, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    for (const s of [1, -1]) {
      const p = pivot(s * 0.14, 0.4, -0.2); p.rotation.set(0, s > 0 ? -0.5 : PI + 0.5, 0.25 * s);
      const w = new THREE.Mesh(wg, mem); w.scale.set(1.15, 1.15, 1); p.add(w);
      for (const [x, y] of [[0.42, 0.26], [0.42, 0.02], [0.34, -0.1]]) p.add(new THREE.Mesh(taperTube([[0, 0, 0], [x * 0.5, y * 0.5 + 0.03, 0], [x * 1.15, y * 1.15, 0]], (u) => 0.016 - u * 0.011, 6, 5), ink));
      anim.push({ o: p, kind: 'wing', s, base: 0.25 * s, ph: 0 });
    }
    const tp = tail([[0, 0, 0], [0, -0.1, -0.22], [0.05, -0.06, -0.48], [0.12, 0.06, -0.66]], (s) => 0.06 * (1 - s) + 0.01, null, 0.2);
    for (let k = 0; k < 4; k++) { const u = 0.15 + k * 0.2, y = -0.04 - 0.06 * Math.sin(u * 3), z = -u * 0.6; tp.add(cMesh(new THREE.ConeGeometry(0.025 - k * 0.003, 0.07 - k * 0.008, 4), cAcc('#efe2c8', 0.95), [0.02 * k, y + 0.06, z])); }
  } else if (key === 'karagoz') {
    // Karagöz'ün işliği: sarı bant, geriye kıvrılan uzun kızıl başlık, uçta püskül
    const kp = pivot(0, 0.5, -0.04); kp.rotation.x = -0.32;
    kp.add(cMesh(new THREE.CylinderGeometry(0.2, 0.215, 0.07, 28), cAcc('#e8a72e', 1.05), [0, 0.03, 0]));
    kp.add(new THREE.Mesh(taperTube([[0, 0.05, 0], [0, 0.22, 0.01], [0, 0.36, -0.03], [0, 0.42, -0.13], [0, 0.36, -0.24], [0, 0.26, -0.27]], (u) => (0.165 * (1 - u * 0.72)) + 0.012, 24, 16), cAcc('#b81d2b', 1.0)));
    for (let k = 0; k < 3; k++) kp.add(cMesh(new THREE.TorusGeometry(0.152 - k * 0.028, 0.009, 5, 24), cAcc('#e8a72e', 0.95), [0, 0.12 + k * 0.085, 0.004 - k * 0.012], [PI / 2 + 0.05 + k * 0.12, 0, 0]));
    anim.push({ o: kp, kind: 'twitch', s: 0, base: 0, ph: 0 });
  } else if (key === 'ahtapot') {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.45, dx = Math.cos(a), dz = Math.sin(a), p = pivot(dx * 0.24, 0.12, dz * 0.24);
      p.add(new THREE.Mesh(taperTube([[0, 0, 0], [dx * 0.1, -0.08, dz * 0.1], [dx * 0.22, -0.07, dz * 0.22], [dx * 0.28, 0.02, dz * 0.28], [dx * 0.24, 0.1, dz * 0.24]], (u) => 0.048 * (1 - u) + 0.008, 16, 7), ink));
      anim.push({ o: p, kind: 'wave', ax: dz, az: -dx, ph: k * 0.9 });
    }
  } else if (key === 'gul') {
    const r = new THREE.Group(); r.position.set(0.18, 0.5, 0.08); r.rotation.set(0.3, 0, -0.5); g.add(r);
    const red = cAcc('#d81f3d', 1.05), dark = cAcc('#9e1028', 1.0);
    r.add(cMesh(new THREE.SphereGeometry(0.035, 10, 8), dark, [0, 0.02, 0]));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; r.add(cMesh(new THREE.SphereGeometry(0.04, 10, 8), k % 2 ? red : dark, [Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04], [0, -a, 0.6], [1, 0.55, 0.8])); }
    for (const s of [1, -1]) r.add(cMesh(new THREE.ConeGeometry(0.03, 0.12, 4), cAcc('#2f8a3e', 0.95), [s * 0.07, -0.04, -0.02], [0, 0, s * 1.7], [1, 1, 0.3]));
  }
  const update = (dt, t, moving, hop) => {
    for (const A of anim) {
      if (A.kind === 'sway') { A.o.rotation.y = Math.sin(t * (moving ? 5.5 : 2.2) + A.ph) * A.amp; A.o.rotation.x = Math.sin(t * 1.7 + A.ph) * 0.08 - (hop ? 0.3 : 0); }
      else if (A.kind === 'twitch') { const k = Math.max(0, Math.sin(t * 0.9 + A.ph) - 0.93) * 14; A.o.rotation.z = A.base - A.s * k * 0.25 + Math.sin(t * 2 + A.ph) * 0.03; }
      else if (A.kind === 'flop') { A.o.rotation.z = A.base - A.s * (0.08 + 0.08 * Math.sin(t * 1.8 + A.ph)); A.o.rotation.x = -0.1 - (moving ? 0.25 : 0.05) - (hop ? 0.35 : 0); }
      else if (A.kind === 'wing') { const f = Math.sin(t * (moving ? 7 : 2.4)) * (moving ? 0.35 : 0.15) + (hop ? 0.5 : 0); A.o.rotation.z = A.base + A.s * f; }
      else if (A.kind === 'wave') { const w = Math.sin(t * 2.6 + A.ph) * 0.22; A.o.rotation.x = A.ax * w; A.o.rotation.z = A.az * w; }
    }
  };
  return { g, update };
}

/* ---------- gece damlaları ---------- */
const DROP_FRAG = `uniform float uTime; uniform vec3 uRim; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
void main(){ vec3 N = normalize(vN), V = normalize(vV); float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 c = vec3(0.01, 0.008, 0.02) + uRim * fr * 2.2 + vec3(1.0) * pow(max(dot(reflect(-V, N), normalize(vec3(0.3, 1.0, 0.2))), 0.0), 40.0) * 1.5;
  gl_FragColor = vec4(c, 1.0); }`;
class DropViews {
  constructor() { this.items = []; this.geo = new THREE.SphereGeometry(0.16, 20, 14); const p = this.geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) { const k = 1 - (y / 0.16) * 0.55; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.7); } } this.geo.computeVertexNormals(); }
  build(drops) {
    this.clear();
    for (const d of drops) {
      const u = { uTime: U.uTime, uRim: { value: new THREE.Color(0.55, 0.45, 1.0) }, uWob: { value: 0.4 }, uBurn: { value: 0 } };
      const m = new THREE.Mesh(this.geo, new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: DROP_FRAG, uniforms: u }));
      const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), envMat(new THREE.MeshStandardMaterial({ color: 0x3a2f5a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.55, emissive: 0x2a1e5a, emissiveIntensity: 0.5 })));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.6, 0.45, 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 }));
      halo.scale.setScalar(0.9);
      const g = new THREE.Group(); g.add(m, shell, halo); g.position.set(d.x, 0.32, d.z); scene.add(g);
      this.items.push({ d, g, m, u, shell, halo, wake: 0 });
    }
  }
  clear() { for (const it of this.items) { scene.remove(it.g); it.m.material.dispose(); it.shell.geometry.dispose(); it.shell.material.dispose(); it.halo.material.dispose(); } this.items = []; }
  update(dt, t) {
    for (const it of this.items) {
      const d = it.d;
      if (d.state === 2) continue;
      it.wake = damp(it.wake, d.awake ? 1 : 0, 5, dt);
      it.g.position.y = 0.32 + Math.sin(t * 2.4 + d.s) * 0.05;
      it.g.rotation.y += dt * 0.8;
      const s = d.state === 1 ? Math.max(0.001, it.g.scale.x - dt * 5) : lerp(0.55, 1, d.hp) * (1 + Math.sin(t * 5 + d.s) * 0.03);
      it.g.scale.setScalar(s);
      it.shell.scale.setScalar(1 - it.wake * 0.9); it.shell.material.opacity = 0.55 * (1 - it.wake);
      it.halo.material.opacity = 0.2 + it.wake * 0.3;
      it.u.uBurn.value = d.lit ? 1 : 0;
      if (d.state === 1 && s <= 0.01) { d.state = 2; it.g.visible = false; }
    }
  }
}
