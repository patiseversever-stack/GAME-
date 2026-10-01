
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
class Zifir {
  constructor() {
    this.g = new THREE.Group(); this.k = new THREE.Group(); this.k.scale.setScalar(ZIF_SCALE); this.g.add(this.k); this.body = new THREE.Group(); this.k.add(this.body);
    this.u = { uTime: U.uTime, uWob: { value: 0.5 }, uBurn: { value: 0 }, uRim: { value: new THREE.Color(SKINS[Save.data.skin]?.c || SKINS[0].c) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) }, uLit: { value: 0 }, uFade: { value: 1 } };
    this.blob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: ZIF_FRAG, uniforms: this.u }));
    this.blob.position.y = 0.3; this.body.add(this.blob);
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
  reset() {
    this.phase = 0; this.hop = 0; this.land = 0; this.yaw = 0; this.blinkT = 2; this.blink = 0; this.squash = 0; this.sqV = 0; this.shiver = 0;
    this.lookX = 0; this.lookY = 0; this.scaleK = 1; this.visible = true; this.mood = 0; this.wispT = 0; this.stepSide = 0;
    this.g.visible = true; this.g.scale.setScalar(1); this.u.uFade.value = 1;
  }
  // squash impulse
  kick(v) { this.sqV += v; }
  update(dt, st) {
    // st: {x, z, yaw, moving, speed, burn, meter, look:{x,y,z}|null, mood}
    const g = this.g;
    g.position.set(st.x, st.y || 0, st.z);
    let dy = st.yaw - this.yaw; while (dy > PI) dy -= TAU; while (dy < -PI) dy += TAU;
    this.yaw += dy * (1 - Math.exp(-10 * dt)); g.rotation.y = this.yaw;
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
    }
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
    for (const p of this.pupils) { p.position.x = this.lookX; p.position.y = -0.005 + this.lookY; p.scale.setScalar(st.burn > 0.05 ? 0.7 : 1); }
    // shader
    this.u.uBurn.value = damp(this.u.uBurn.value, st.burn, 14, dt);
    this.u.uLit.value = this.u.uBurn.value;
    this.u.uWob.value = st.moving ? 0.7 : 0.4;
    // metre halkası
    this.ringU.uV.value = st.meter;
    this.ringU.uA.value = damp(this.ringU.uA.value, st.meter < 0.995 || st.burn > 0 ? 1 : 0, 6, dt);
    // tütsü gibi yükselen gölge tülü
    this.wispT -= dt;
    if (this.wispT < 0) { this.wispT = st.burn > 0.05 ? 0.03 : 0.22; const wy = (0.62 * this.scaleK + bodyY) * ZIF_SCALE; if (st.burn > 0.05) { FX.smoke(st.x, wy, st.z, 1); if (Math.random() < 0.5) FX.ember(st.x, wy - 0.1, st.z); } else fxMix.spawn(st.x + (Math.random() - 0.5) * 0.1, wy, st.z + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0.35, (Math.random() - 0.5) * 0.1, { c: [0.06, 0.04, 0.1], a: 0.4, s: 0.12, s1: 0.35, life: 1.2, drag: 0.8, t: 1 }); }
  }
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
      const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0x3a2f5a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.55, emissive: 0x2a1e5a, emissiveIntensity: 0.5 }));
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
