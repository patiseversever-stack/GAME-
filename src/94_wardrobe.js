/* =====================================================================
   ZİFİR'İN GARDIROBU: 3B giyinme odası
   Gardırop açıkken ana çizici bu küçük sahneyi çizer: ışıklı bir kaide,
   arkada yumuşak bir hâle ve yıldızlar, havada süzülen ışık zerreleri ve
   gerçek Zifir (oyundakiyle aynı gölgelendirici ve kostümler). Kilitli
   kostümler de denenebilir. Zifir boşta nefes alır, etrafına bakar, ara
   sıra dans eder; parmakla çevrilir, dokununca kıkırdar.
   ===================================================================== */
const wardScene = new THREE.Scene();
const wardCam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const WARD_BG = `uniform float uTime; uniform vec3 uCol; varying vec3 vD;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5); }
void main(){
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = mix(vec3(0.11, 0.065, 0.2), vec3(0.025, 0.018, 0.07), smoothstep(0.0, 0.75, y));
  c = mix(c, vec3(0.04, 0.025, 0.07), smoothstep(0.0, -0.35, y));
  float g = pow(max(dot(d, normalize(vec3(0.0, 0.1, -1.0))), 0.0), 14.0);
  c += uCol * 0.2 * g + vec3(1.0, 0.72, 0.45) * 0.05 * g;
  vec2 uv = vec2(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))) * 70.0, cell = floor(uv); float r = h(cell);
  if (r > 0.982) { vec2 f = fract(uv) - 0.5; c += vec3(0.9, 0.86, 1.0) * smoothstep(0.13, 0.0, length(f)) * (0.45 + 0.55 * sin(uTime * (0.8 + r * 3.0) + r * 60.0)) * smoothstep(-0.05, 0.35, y); }
  gl_FragColor = vec4(c, 1.0);
}`;
const Ward3D = {
  inited: false, on: false, t: 0, yaw: 0, yawV: 0, idleT: 0, drag: null, dance: null, nextDance: 3.5,
  init() {
    if (this.inited) return; this.inited = true;
    this.bgU = { uTime: U.uTime, uCol: { value: new THREE.Color('#7a6cff') } };
    const bg = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: this.bgU,
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: WARD_BG }));
    bg.renderOrder = -10; bg.frustumCulled = false; wardScene.add(bg);
    // kaide: koyu cilalı taş, ince ışık halkası, yerde hâle
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.3, 72), new THREE.MeshStandardMaterial({ color: 0x1b1331, roughness: 0.34, metalness: 0.4 })); ped.position.y = -0.15; wardScene.add(ped);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.0, 72).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0x251a42, roughness: 0.18, metalness: 0.55 })); top.position.y = 0.002; wardScene.add(top);
    this.ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.25, 3.0) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.016, 8, 120).rotateX(PI / 2), this.ringM); ring.position.y = 0.004; wardScene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.01, 6, 120).rotateX(PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.7, 0.4) })); ring2.position.y = -0.3; wardScene.add(ring2);
    this.glowM = new THREE.MeshBasicMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.45, 0.35, 1.0), opacity: 0.55 });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-PI / 2), this.glowM); glow.position.y = 0.01; wardScene.add(glow);
    // ışıklar: sıcak ana ışık, mor kenar ışığı, gök/yer dolgu
    wardScene.add(new THREE.HemisphereLight(0x9c8cff, 0x1a1028, 1.1));
    const key = new THREE.DirectionalLight(0xffdcb0, 2.4); key.position.set(2.5, 4, 3.5); wardScene.add(key);
    const rim = new THREE.DirectionalLight(0x8a72ff, 2.2); rim.position.set(-3, 2.5, -4); wardScene.add(rim);
    // havada süzülen ışık zerreleri
    const pos = [], col = [], tt = [], sz = [];
    for (let i = 0; i < 46; i++) { const a = Math.random() * TAU, r = 1.3 + Math.random() * 1.8; pos.push(Math.cos(a) * r, 0.2 + Math.random() * 2.6, Math.sin(a) * r - 0.4); const w = Math.random(); col.push(lerp(1.5, 0.8, w), lerp(1.2, 0.75, w), lerp(0.6, 1.8, w)); tt.push(Math.random()); sz.push(0.05 + Math.random() * 0.06); }
    this.motes = glintPoints(pos, col, tt, sz, 0, 0.35); wardScene.add(this.motes);
    // denemede parıltı patlaması
    this.sparks = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; wardScene.add(s); return { s, v: new THREE.Vector3(), t: 9 }; });
    // önizleme Zifir'i: oyundakiyle aynı
    this.z = new Zifir(); scene.remove(this.z.g); wardScene.add(this.z.g); this.z.preview = true;
    this.z.u.uSunDir.value.set(2.5, 4, 3.5).normalize(); this.z.u.uSunCol.value.setRGB(1.0, 0.88, 0.72); this.z.u.uLit.value = 0.25;
    this.look = new THREE.Vector3();
  },
  open(cos, skin) {
    this.init(); this.on = true; this.t = 0; this.yaw = 0; this.yawV = 0; this.dance = null; this.nextDance = 2.2;
    this.tryCostume(cos, true); this.trySkin(skin, true); this.resize(innerWidth, innerHeight);
  },
  close() { this.on = false; this.drag = null; },
  tryCostume(key, quiet) { this.z.setCostume(key || ''); if (!quiet) this.show(); },
  trySkin(i, quiet) { const c = (SKINS[i] || SKINS[0]).c; this.z.setSkin(i); this.bgU.uCol.value.set(c); this.ringM.color.set(c).multiplyScalar(2.6); this.glowM.color.set(c).multiplyScalar(0.7); if (!quiet) this.show(); },
  // yeni bir şey denenince: dönerek zıplar, parıltı saçar
  show() { this.dance = { k: 'show', t: 0, dur: 0.95 }; this.burst(); audio.pop(5); haptic(8); },
  burst() { for (const p of this.sparks) { const a = Math.random() * TAU, e = Math.random() * 0.9; p.t = 0; p.s.visible = true; p.s.position.set(0, 0.65, 0); p.v.set(Math.cos(a) * Math.cos(e) * 2.2, 1 + Math.sin(e) * 2.4, Math.sin(a) * Math.cos(e) * 2.2); p.s.material.color.copy(this.bgU.uCol.value).multiplyScalar(2.2).lerp(new THREE.Color(2.4, 2.0, 1.4), Math.random() * 0.6); } },
  startDance() {
    const ks = ['hop', 'sway', 'twirl', 'bow'], k = ks[Math.floor(Math.random() * ks.length)];
    this.dance = { k, t: 0, dur: { hop: 1.45, sway: 2.6, twirl: 1.9, bow: 1.7 }[k] }; this.idleT = 0;
  },
  // dokunma: sürükleyerek çevir, dokununca kıkırdasın
  down(e) { this.drag = { id: e.pointerId, x: e.clientX, x0: e.clientX, t0: performance.now(), t: performance.now(), v: 0 }; this.yawV = 0; },
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return; const now = performance.now(), dx = e.clientX - d.x; d.x = e.clientX;
    const dy = (dx / Math.max(260, innerWidth)) * 5.5; this.yaw += dy; d.v = lerp(d.v, dy / Math.max(1, now - d.t) * 1000, 0.5); d.t = now; this.idleT = 0;
  },
  up(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return; this.drag = null;
    if (Math.abs(e.clientX - d.x0) < 8 && performance.now() - d.t0 < 350) { this.dance = { k: 'giggle', t: 0, dur: 0.7 }; this.z.kick(-3.2); audio.pop(3); haptic(6); return; }
    this.yawV = performance.now() - d.t < 90 ? clamp(d.v, -9, 9) : 0;
  },
  update(dt) {
    if (!this.on) return;
    this.t += dt; const z = this.z, t = this.t;
    if (!this.drag) { this.yaw += this.yawV * dt; this.yawV *= Math.exp(-dt * 2.6); if (Math.abs(this.yawV) < 0.25 && (this.idleT += dt) > 2.4) this.yaw = damp(this.yaw, Math.round(this.yaw / TAU) * TAU, 2.2, dt); }
    let y = 0, spin = 0, sway = 0, bow = 0, happy = 0;
    if (!this.dance && !this.drag && (this.nextDance -= dt) <= 0) this.startDance();
    if (this.dance) {
      const D = this.dance; D.t += dt; const u = D.t, hopAt = (s, l = 0.42, h = 0.24) => { const k = (u - s) / l; return k > 0 && k < 1 ? Math.sin(k * PI) * h : 0; };
      happy = 1;
      if (D.k === 'show') { spin = TAU * Ease.inOutCubic(clamp01(u / 0.75)); y = hopAt(0, 0.62, 0.32); }
      else if (D.k === 'hop') { y = hopAt(0) + hopAt(0.5) + hopAt(1.0, 0.45, 0.3); spin = TAU * Ease.inOutCubic(clamp01((u - 1.0) / 0.42)); }
      else if (D.k === 'sway') { const b = Math.sin(u * TAU * 1.15); sway = b * 0.17 * Math.min(1, u * 2) * Math.min(1, (D.dur - u) * 2); y = Math.abs(b) * 0.06; spin = Math.sin(u * PI * 1.15) * 0.4; }
      else if (D.k === 'twirl') { spin = TAU * Ease.inOutCubic(clamp01(u / 1.4)); y = Math.sin(clamp01(u / 1.4) * PI) * 0.1 + hopAt(1.45, 0.4, 0.22); }
      else if (D.k === 'bow') { bow = Math.sin(clamp01(u / 1.1) * PI) * 0.38; y = hopAt(1.2, 0.42, 0.2); }
      else if (D.k === 'giggle') { y = hopAt(0, 0.36, 0.14) + hopAt(0.34, 0.3, 0.08); sway = Math.sin(u * 30) * 0.06 * (1 - u / D.dur); }
      // iniş anlarında yaylanma
      if (D.lastY > 0.02 && y <= 0.02) z.kick(-2.4); D.lastY = y;
      if (u >= D.dur) { this.dance = null; this.nextDance = 5 + Math.random() * 4; }
    }
    // gözleri kameraya, arada bir yana
    this.look.copy(wardCam.position); this.look.x += Math.sin(t * 0.37) * 1.4; this.look.y += Math.sin(t * 0.23) * 0.4;
    z.update(dt, { x: 0, z: 0, y, yaw: this.yaw + spin, moving: false, speed: 1, burn: 0, meter: 1, look: this.look, mood: happy, dive: 0, hold: false });
    z.g.rotation.z = sway; z.g.rotation.x = bow;
    for (const p of this.sparks) {
      if (!p.s.visible) continue; p.t += dt; const k = p.t / 0.9;
      if (k >= 1) { p.s.visible = false; continue; }
      p.v.y -= 3.2 * dt; p.s.position.addScaledVector(p.v, dt); p.s.scale.setScalar(0.22 * (1 - k * 0.6)); p.s.material.opacity = 1 - k * k;
    }
  },
  resize(w, h) {
    const a = w / h, port = a < 1.05;
    wardCam.fov = port ? 30 : 26; wardCam.aspect = a;
    // görünür yükseklik: Zifir ve kostümü ≈ 2.4 birim; dikeyde ekranın üst %42'si, yatayda sol yarı
    const th = Math.tan(deg(wardCam.fov / 2)), frac = port ? 0.42 : 0.8;
    const dist = Math.max(2.4 / frac / 2 / th, port ? 2.7 / a / 2 / th : 2.6 / (a * 0.5) / 2 / th);
    wardCam.position.set(0, 0.9 + dist * 0.14, dist); wardCam.lookAt(0, 0.7, 0);
    if (port) wardCam.setViewOffset(w, h, 0, h * 0.25, w, h); else wardCam.setViewOffset(w, h, w * 0.24, 0, w, h);
    wardCam.updateProjectionMatrix();
  },
  apply() {
    const pu = post.u;
    pu.uExposure.value = 1.05; pu.uBloomAdd.value = 0.5; pu.uBloomMix.value = 0.05; pu.uRays.value = 0; pu.uSunVis.value = 0; pu.uNight.value = 0;
    pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0; pu.uVignette.value = 0.85; pu.uFlash.value = 0;
    pu.uLift.value.set(0.015, 0.008, 0.03); pu.uGamma.value.set(1, 1, 1); pu.uGain.value.set(1.03, 1.0, 1.02); pu.uSat.value = 1.08; pu.uContrast.value = 1.06;
    pu.uTilt.value = 0; pu.uGrain.value = 0.025;
    mapPx.value = renderer.domElement.height / (2 * Math.tan(deg(wardCam.fov / 2)));
  },
};
