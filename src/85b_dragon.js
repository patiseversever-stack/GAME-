/* =====================================================================
   GÜNEŞ EJDERHASI — her dünyanın son adasında kovalamaca
   Işıktan bir ejderha güneşten süzülüp adanın etrafında kıvrılır ve
   Zifir'in peşine düşer. Nefesi yolu arkadan yakar: Zifir yürüdükçe
   mesafe korunur; durursa (Bekle, köprü) ejderha yetişir ve nefesi
   gölge tanımadan yakar. Tutulma onu sersemletir, Kuş Kalkanı nefesi
   keser. Çözülmüş güneş planı hiç beklemediği için ada çözülebilir
   kalır. Güneş patlamalarını ejderha tetikler: güneşe ateş püskürtür.
   Zifir kapıya girince ejderha ışık kıvılcımlarına dağılır.
   ===================================================================== */
const DR_GAP0 = 4.6, DR_CRUISE = 2.1, DR_GAPMAX = 4.8, DR_LEN = 12.5;
// dünyaya göre renk: çekirdek (akkor), gövde, kenar ışıltısı
const DRAGON_PAL = {
  ege: { c1: [2.6, 1.7, 0.55], c2: [1.05, 0.22, 0.05], c3: [2.2, 0.85, 0.22] },
  ruzgar: { c1: [2.6, 2.0, 0.85], c2: [1.0, 0.36, 0.08], c3: [2.2, 1.2, 0.4] },
  peri: { c1: [2.7, 1.4, 0.5], c2: [1.1, 0.14, 0.05], c3: [2.4, 0.6, 0.2] },
  tuz: { c1: [2.6, 1.7, 1.6], c2: [1.05, 0.22, 0.32], c3: [2.4, 0.9, 1.05] },
  ikiz: { c1: [1.9, 2.2, 2.8], c2: [0.7, 0.18, 0.9], c3: [0.6, 1.7, 2.2] },
  buz: { c1: [2.0, 2.5, 3.0], c2: [0.22, 0.5, 1.15], c3: [1.0, 1.7, 2.6] },
  ayna: { c1: [2.7, 1.8, 1.9], c2: [1.0, 0.26, 0.4], c3: [2.4, 1.3, 1.4] },
  saat: { c1: [2.7, 1.9, 0.7], c2: [0.95, 0.4, 0.06], c3: [2.3, 1.45, 0.4] },
};
const DR_NOISE = /* glsl */`
float drH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float drN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(drH(i), drH(i + vec2(1.0, 0.0)), f.x), mix(drH(i + vec2(0.0, 1.0)), drH(i + vec2(1.0, 1.0)), f.x), f.y); }`;
const DRAGON_VERT = /* glsl */`attribute float aT; attribute float aA; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vT; varying float vA;
void main(){ vT = aT; vA = aA; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
// yontulmuş (düşük poligon) yüzey: koyu pullar arasında akan lav damarları, açık karın plakaları, altın kenar ışıltısı;
// uFade ile ışık kıvılcımlarına dağılır
const DRAGON_FRAG = /* glsl */`uniform float uTime, uFade, uHot, uHead; uniform vec3 uC1, uC2, uC3; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vT; varying float vA;
${DR_NOISE}
void main(){
  vec3 V = normalize(vV), N = normalize(cross(dFdx(vW), dFdy(vW))); if (dot(N, V) < 0.0) N = -N;
  float mu = max(dot(N, V), 0.0), rim = pow(1.0 - mu, 2.2);
  float lit = 0.62 + 0.38 * max(dot(N, normalize(vec3(0.3, 1.0, 0.4))), 0.0);
  vec2 q = vec2(vT * 30.0 - uTime * 1.9, vA * 1.5);
  float n1 = drN(q), n2 = drN(q * 2.13 + 3.7 + vec2(uTime * 0.7, 0.0));
  float vein = pow(1.0 - abs(n1 * 2.0 - 1.0), 8.0) + pow(1.0 - abs(n2 * 2.0 - 1.0), 11.0) * 0.6;
  float row = vT * 64.0, col = vA * 2.2 + floor(row) * 0.5;
  vec2 sp = vec2(fract(row) - 0.5, fract(col) - 0.5);
  float sc = smoothstep(0.55, 0.15, length(sp * vec2(1.0, 1.4)));
  float belly = smoothstep(0.35, 0.9, -sin(vA)) * (1.0 - uHead), plate = 0.72 + 0.28 * step(0.14, fract(vT * 52.0));
  sc = mix(sc, 0.8, uHead); vein *= 1.0 - uHead * 0.7;
  vec3 base = mix(uC2 * 0.4, uC2, sc);
  base = mix(base, uC1 * 0.5 * plate, belly * 0.75);
  vec3 c = base * lit * (0.8 + 0.35 * mu);
  c += uC1 * vein * (1.5 + uHot * 1.6) * (1.0 - belly * 0.6);
  c += uC3 * rim * 1.35;
  float d = drN(vec2(vT * 26.0, vA * 3.0) + 3.3);
  if (d < 1.0 - uFade) discard;
  c += uC1 * 3.0 * (1.0 - smoothstep(0.0, 0.07, d - (1.0 - uFade))) * step(uFade, 0.999);
  gl_FragColor = vec4(c, 1.0);
}`;
const HORN_FRAG = /* glsl */`uniform float uFade; uniform vec3 uC1; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vT; varying float vA;
${DR_NOISE}
void main(){ vec3 V = normalize(vV), N = normalize(cross(dFdx(vW), dFdy(vW))); if (dot(N, V) < 0.0) N = -N; float mu = max(dot(N, V), 0.0); if (drN(vec2(vT * 40.0, vA * 5.0)) < 1.0 - uFade) discard;
  gl_FragColor = vec4(uC1 * (0.55 + 0.35 * mu) + vec3(0.6, 0.5, 0.35) * pow(1.0 - mu, 2.0), 1.0); }`;
// başın parçalarına gövde gölgelendiricisinin istediği öznitelikleri ekler (aT sabit, aA yüzey açısı)
function drTag(geo, t) {
  const p = geo.attributes.position, n = p.count, at = new Float32Array(n), aa = new Float32Array(n);
  for (let i = 0; i < n; i++) { at[i] = t + (1.4 - p.getZ(i)) * 0.026; aa[i] = Math.atan2(p.getY(i), p.getX(i)); }
  geo.setAttribute('aT', new THREE.BufferAttribute(at, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(aa, 1));
  return geo;
}
// boynuz: eğri boyunca incelen tüp
function drHorn(pts, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg = 18, rad = 7, geo = new THREE.TubeGeometry(curve, seg, r0, rad, false);
  const p = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { curve.getPointAt(i / seg, c); const k = lerp(1, r1 / r0, i / seg); for (let j = 0; j <= rad; j++) { const ix = i * (rad + 1) + j; v.fromBufferAttribute(p, ix).sub(c).multiplyScalar(k).add(c); p.setXYZ(ix, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); return drTag(geo, 0.01);
}
// aynı malzemeli parçaları tek geometride toplar (ortak öznitelikler korunur)
function drMerge(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g)), keys = Object.keys(parts[0].attributes).filter((k) => k !== 'uv' && parts.every((g) => g.attributes[k]));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const k of keys) {
    const sz = parts[0].attributes[k].itemSize, a = new Float32Array(n * sz); let o = 0;
    for (const g of parts) { a.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(a, sz));
  }
  for (const g of geos) g.dispose(); for (const g of parts) g.dispose();
  out.computeBoundingSphere(); return out;
}
const _dv = new THREE.Vector3(), _dv2 = new THREE.Vector3(), _dv3 = new THREE.Vector3(), _dq = new THREE.Quaternion(), _dm = new THREE.Matrix4(), _dup = new THREE.Vector3(0, 1, 0), _dPA = {};

const Dragon = {
  built: false, on: false, mode: 'off', t: 0, T: 0, gap: DR_GAP0, hot: 0, jaw: 0.1, fade: 1, S: 1, lunge: 0, nextLunge: 8, stun: 0, warned: false, flarePh: 0,
  build() {
    if (this.built) return; this.built = true;
    const lowQ = Perf.level <= 0;
    this.N = lowQ ? 70 : 110; this.R = lowQ ? 9 : 13;
    const N = this.N, R = this.R, V = N * (R + 1);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(V * 3); this.nrm = new Float32Array(V * 3);
    const at = new Float32Array(V), aa = new Float32Array(V), idx = [];
    for (let i = 0; i < N; i++) for (let j = 0; j <= R; j++) { const k = i * (R + 1) + j; at[k] = i / (N - 1); aa[k] = (j / R) * TAU; }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(at, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aa, 1)); g.setIndex(idx);
    this.u = { uTime: U.uTime, uFade: { value: 1 }, uHot: { value: 0 }, uHead: { value: 0 }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: DRAGON_VERT, fragmentShader: DRAGON_FRAG, uniforms: this.u, side: THREE.DoubleSide });
    this.headMat = new THREE.ShaderMaterial({ vertexShader: DRAGON_VERT, fragmentShader: DRAGON_FRAG, uniforms: Object.assign({}, this.u, { uHead: { value: 1 } }) });
    this.body = new THREE.Mesh(g, this.mat); this.body.frustumCulled = false; this.body.renderOrder = 2; scene.add(this.body);
    // sırt yüzgeçleri ve pençeler
    this.hornMat = new THREE.ShaderMaterial({ vertexShader: DRAGON_VERT, fragmentShader: HORN_FRAG, uniforms: { uFade: this.u.uFade, uC1: { value: new THREE.Color() } } });
    const fin = drTag(new THREE.ConeGeometry(0.1, 0.42, 5), 0.5); fin.translate(0, 0.18, 0);
    this.fins = new THREE.InstancedMesh(fin, this.hornMat, 30); this.fins.frustumCulled = false; scene.add(this.fins);
    const claw = drTag(new THREE.ConeGeometry(0.05, 0.22, 5), 0.5); claw.rotateX(PI); claw.translate(0, -0.11, 0);
    this.claws = new THREE.InstancedMesh(claw, this.hornMat, 12); this.claws.frustumCulled = false; scene.add(this.claws);
    const leg = drTag(new THREE.CylinderGeometry(0.07, 0.05, 0.42, 7), 0.4); leg.translate(0, -0.21, 0);
    this.legs = new THREE.InstancedMesh(leg, this.mat, 4); this.legs.frustumCulled = false; scene.add(this.legs);
    // baş: parçalar malzemeye göre tek ağa birleştirilir (çizim çağrısı az, düşük cihazda akıcı)
    const h = (this.head = new THREE.Group()); scene.add(h);
    const _o = new THREE.Object3D(), put = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { _o.position.set(x, y, z); _o.scale.set(sx, sy, sz); _o.rotation.set(rx, ry, rz); _o.updateMatrix(); return geo.applyMatrix4(_o.matrix); };
    const tint = (geo, c) => { const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
    const skull = [put(drTag(new THREE.SphereGeometry(0.5, 11, 8), 0.002), 0, 0.05, -0.05, 0.95, 0.75, 1.15), put(drTag(new THREE.SphereGeometry(0.38, 10, 7), 0.002), 0, -0.07, 0.55, 0.8, 0.55, 1.5), put(drTag(new THREE.SphereGeometry(0.15, 8, 6), 0.002), 0, 0.02, 1.08, 1.15, 0.8, 0.9)];
    const horns = [], glowH = [], EYE = [4.2, 3.4, 1.7], PUP = [0.07, 0.016, 0.016], TOOTH = [2.6, 2.4, 2.0];
    for (const sx of [-1, 1]) {
      skull.push(put(drTag(new THREE.SphereGeometry(0.16, 8, 6), 0.002), sx * 0.22, 0.27, 0.3, 1.4, 0.5, 1.15));
      // gözler: akkor, dikey yarık bebek
      glowH.push(tint(put(new THREE.SphereGeometry(0.085, 14, 10), sx * 0.27, 0.17, 0.43, 1, 0.72, 0.8), EYE), tint(put(new THREE.BoxGeometry(0.02, 0.11, 0.02), sx * 0.295, 0.17, 0.495), PUP));
      // yanak dikenleri ve boynuzlar
      for (let k = 0; k < 3; k++) horns.push(put(drTag(new THREE.ConeGeometry(0.05, 0.36 - k * 0.07, 5), 0.01), sx * (0.36 + k * 0.03), -0.06 - k * 0.07, -0.08 - k * 0.05, 1, 1, 1, -1.8 + k * 0.25, 0, sx * (0.9 + k * 0.15)));
      horns.push(drHorn([[sx * 0.2, 0.33, -0.22], [sx * 0.34, 0.55, -0.62], [sx * 0.4, 0.6, -1.05], [sx * 0.33, 0.74, -1.45]], 0.085, 0.012));
    }
    // çene (açılır) ve dişler; ağız içi akkor
    this.jawG = new THREE.Group(); this.jawG.position.set(0, -0.17, 0.05); h.add(this.jawG);
    const lowT = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { lowT.push(put(new THREE.ConeGeometry(0.025, 0.09, 4), sx * (0.17 - k * 0.02), 0.0, 0.32 + k * 0.17)); glowH.push(tint(put(new THREE.ConeGeometry(0.025, 0.09, 4), sx * (0.19 - k * 0.02), -0.17, 0.4 + k * 0.17, 1, 1, 1, PI), TOOTH)); }
    h.add(new THREE.Mesh(drMerge(skull), this.headMat), new THREE.Mesh(drMerge(horns), this.hornMat));
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true }); this.eyes = new THREE.Mesh(drMerge(glowH), this.glowMat); h.add(this.eyes);
    this.jawG.add(new THREE.Mesh(drMerge([put(drTag(new THREE.SphereGeometry(0.3, 10, 7), 0.002), 0, -0.1, 0.45, 0.85, 0.38, 1.6)]), this.headMat));
    this.teeth = new THREE.Mesh(drMerge(lowT), new THREE.MeshBasicMaterial({ color: new THREE.Color(...TOOTH) })); this.jawG.add(this.teeth);
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.3) })); this.mouth.position.set(0, -0.2, 0.55); this.mouth.scale.set(1, 0.6, 1.8); h.add(this.mouth);
    // bıyıklar: başa bağlı, dalgalanan iki şerit (tek ağ)
    const WS = 16, wg = new THREE.BufferGeometry(), wp = new Float32Array((WS + 1) * 2 * 3 * 2), wi = [];
    for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < WS; i++) { const a = s2 * (WS + 1) * 2 + i * 2; wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3).setUsage(THREE.DynamicDrawUsage)); wg.setIndex(wi);
    this.whiskM = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: new THREE.Color(), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.whiskM.frustumCulled = false; h.add(this.whiskM); this.whiskP = wp; this.whiskN = WS;
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
    this.halo.scale.setScalar(4.2); h.add(this.halo);
    // yerde ışık: başın altında ve nefesin düştüğü yerde
    const decal = (s, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); m.rotation.x = -PI / 2; m.scale.setScalar(s); m.renderOrder = 3; scene.add(m); return m; };
    this.glowUnder = decal(6, 0.5); this.breathSpot = decal(2.4, 0.95);
    this.hist = []; this.C = new Float32Array(N * 3); this.Fn = new Float32Array(N * 3); this.Fb = new Float32Array(N * 3); this.Tg = new Float32Array(N * 3);
    this.anchor = new THREE.Vector3(); this.headP = new THREE.Vector3(); this.look = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.setVisible(false);
  },
  setVisible(v) { this.vis = v; for (const o of [this.body, this.fins, this.claws, this.legs, this.head, this.glowUnder, this.breathSpot]) o.visible = v; },
  // ada açılırken: final adasıysa ejderhayı kurar ve güneşten süzülüşünü başlatır
  setup(lv) {
    this.on = !!(lv.spec && lv.spec.boss);
    if (!this.on) { if (this.built) this.setVisible(false); this.mode = 'off'; audio.setDragon && audio.setDragon(0, 0); return; }
    this.build(); this.lv = lv;
    const pal = DRAGON_PAL[lv.chap.key] || DRAGON_PAL.ege;
    this.u.uC1.value.setRGB(...pal.c1); this.u.uC2.value.setRGB(...pal.c2); this.u.uC3.value.setRGB(...pal.c3);
    this.hornMat.uniforms.uC1.value.setRGB(...pal.c1).multiplyScalar(0.72);
    this.whiskM.material.color.setRGB(...pal.c1).multiplyScalar(0.55);
    this.halo.material.color.setRGB(...pal.c3).multiplyScalar(0.32);
    this.glowUnder.material.color.setRGB(...pal.c3).multiplyScalar(0.22); this.breathSpot.material.color.setRGB(...pal.c1).multiplyScalar(0.5);
    this.S = lv.spec.g === STORY_LEVELS - 1 ? 1.5 : 1.25;
    this.u.uFade.value = this.fade = 1; this.hot = 0; this.jaw = 0.1; this.gap = DR_GAP0; this.lunge = 0; this.stun = 0;
    // giriş yolu: güneşin tepesinden adanın çevresinde alçalan sarmal, yolun başının arkasında biter
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of lv.chunks) for (const [x, z] of c.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.max(x1 - x0, z1 - z0) / 2 + 3.2;
    this.cx = cx; this.cz = cz; this.Rr = R;
    const sun = new THREE.Vector3(); orbPosInto(0.5, lv.sun.tilt, lv.sun.thMin, sun);
    const hp = this.hoverPoint(new THREE.Vector3()), a1 = Math.atan2(hp.z - cz, hp.x - cx), pts = [sun.clone(), sun.clone().lerp(new THREE.Vector3(cx, 9, cz), 0.55)];
    const a0 = a1 - 1.75 * PI; for (let k = 0; k <= 6; k++) { const e = k / 6, a = a0 + (a1 - 0.35 - a0) * e; pts.push(new THREE.Vector3(cx + Math.cos(a) * R * (1 - 0.15 * e), lerp(7.5, 2.6, e), cz + Math.sin(a) * R * (1 - 0.15 * e))); }
    pts.push(hp.clone());
    this.introC = new THREE.CatmullRomCurve3(pts); this.introL = this.introC.getLength();
    // gövde güneşin içinden gelir: geçmiş, giriş yolunun gerisine uzatılır
    this.hist.length = 0; const back = sun.clone().sub(pts[1]).normalize();
    for (let d = DR_LEN + 2; d > 0; d -= 0.15) this.hist.push(sun.clone().addScaledVector(back, d));
    this.anchor.copy(sun); this.headP.copy(sun); this.vel.set(0, -1, 0);
    this.mode = 'intro'; this.t = 0; this.T = 0; this.setVisible(true); this.roared = false;
    this.update(0, 0);
  },
  hoverPoint(out) { const lv = this.lv; pathAt(lv.path, 0, _dPA); return out.set(_dPA.x - _dPA.tx * 3.1, 1.75, _dPA.z - _dPA.tz * 3.1); },
  reset() { if (!this.on) return; this.mode = 'hover'; this.t = 0; this.gap = DR_GAP0; this.u.uFade.value = this.fade = 1; this.lunge = 0; this.stun = 0; this.setVisible(true); audio.setDragon && audio.setDragon(0, 0); },
  start() { if (!this.on) return; this.mode = 'chase'; this.t = 0; this.gap = DR_GAP0; this.nextLunge = 9 + Math.random() * 3; this.roar(1); if (!Save.seen('t-dragon')) setTimeout(() => G.state === 'play' && tip('t-dragon', '<em>Güneş Ejderhası</em> peşinde! Zifir yürüdükçe yetişemez, <em>durursa</em> nefesi gölge tanımaz. <em>Tutulma</em> onu sersemletir.', 5.2), 900); },
  roar(k = 1) { this.jawKick = 1; this.roarT = 0.9; audio.dragonRoar && audio.dragonRoar(k); G.trauma = Math.max(G.trauma, 0.22 * k); haptic([20, 40, 30]); },
  danger() { return this.on && this.mode === 'chase' ? clamp01((1.5 - this.gap) / 1.5) : 0; },
  // oyun adımı: mesafeyi günceller, nefes Zifir'e değiyorsa ek pozlama döner (0..1)
  step(dt, moving, ecl, shield) {
    if (!this.on || this.mode !== 'chase') return 0;
    const v = G.lv.speed;
    this.stun = damp(this.stun, ecl > 0.5 ? 1 : 0, ecl > 0.5 ? 8 : 2, dt);
    let vd = this.gap > DR_CRUISE ? v * 1.25 : moving ? v * 0.86 : v * 0.62;
    vd *= 1 - this.stun * 0.75;
    this.gap = Math.min(DR_GAPMAX, Math.max(0, this.gap + ((moving ? v : 0) - vd) * dt));
    this.lunge = Math.max(0, this.lunge - dt); // hamle: baş ileri atılır (yalnızca görsel, mesafe değişmez)
    this.nextLunge -= dt;
    if (this.nextLunge <= 0 && moving && this.gap > 1.4 && this.stun < 0.2) { this.nextLunge = 10 + Math.random() * 5; this.lunge = 1.1; this.roar(0.7); }
    if (this.gap <= 0.02 && !shield && this.stun < 0.5) {
      if (!this.warned) { this.warned = true; popText(zifir.g.position.x, 1.1, zifir.g.position.z, 'ejderha yetişti!'); }
      return 1;
    }
    if (this.gap > 0.6) this.warned = false;
    return 0;
  },
  defeat() { if (!this.on || this.mode === 'off') return; this.mode = 'defeat'; this.t = 0; this.roar(1.2); audio.dragonDie && audio.dragonDie(); audio.setDragon && audio.setDragon(0, 0); },
  onFail() { if (!this.on || this.mode === 'off') return; this.mode = 'leave'; this.t = 0; this.roar(0.9); audio.setDragon && audio.setDragon(0, 0); },
  // görseller (her kare)
  update(dt, dtR) {
    if (!this.on || !this.built) return;
    const st = G.state, lv = this.lv;
    if (st === 'title' || st === 'map' || st === 'theater' || st === 'film' || G.lv !== lv) { if (this.vis) this.setVisible(false); return; }
    if (st === 'rewind' || (st === 'ready' && this.mode !== 'intro' && this.mode !== 'hover')) this.reset();
    if (this.mode === 'gone') { if (this.vis) this.setVisible(false); return; }
    if (!this.vis) this.setVisible(true);
    this.t += dt; this.T += dtR; const t = U.uTime.value, S = this.S;
    // çapa hedefi
    const tgt = _dv, lookAt = _dv3;
    let k = 3.2, rec = true;
    pathAt(lv.path, G.s, _dPA); const zx = _dPA.x, zz = _dPA.z;
    if (this.mode === 'intro') {
      const dur = Math.max(1.8, (G.introDur || 3.4) - 0.5), e = clamp01(this.T / dur), u = Ease.inOutSine(e);
      this.introC.getPointAt(u, tgt); k = 60;
      if (!this.roared && this.T > dur * 0.35) { this.roared = true; this.roar(1); }
      if (e >= 1) { this.mode = 'hover'; this.t = 0; }
      lookAt.copy(tgt).add(this.vel);
    } else if (this.mode === 'hover') {
      this.hoverPoint(tgt); k = 2.2; lookAt.set(zx, 0.5, zz);
    } else if (this.mode === 'chase') {
      const lk = this.lunge > 0 ? Math.sin(clamp01(1 - this.lunge / 1.1) * PI) : 0, se = G.s - this.gap - (1.0 - lk * 0.75) * S;
      if (se >= 0) { pathAt(lv.path, se, _dPA); tgt.set(_dPA.x, 1.45 * S, _dPA.z); }
      else { pathAt(lv.path, 0, _dPA); tgt.set(_dPA.x + _dPA.tx * se, 1.45 * S, _dPA.z + _dPA.tz * se); }
      const sw = Math.sin(t * 1.15) * 0.5 * (1 - this.danger() * 0.6); tgt.x += _dPA.nx * sw; tgt.z += _dPA.nz * sw; tgt.y += Math.sin(t * 2.3) * 0.18 + this.stun * 0.9;
      k = 5.5; lookAt.set(zx, 0.35, zz);
      if (flare.phase === 1) { lookAt.copy(orb.g.position); tgt.y += 0.9; }
    } else if (this.mode === 'leave') {
      const a = Math.atan2(this.anchor.z - this.cz, this.anchor.x - this.cx) + dt * 0.9, R = this.Rr + this.t * 2.5;
      tgt.set(this.cx + Math.cos(a) * R, 2 + this.t * 3.2, this.cz + Math.sin(a) * R); k = 3; lookAt.copy(tgt).add(this.vel);
      if (this.t > 4.5) { this.mode = 'gone'; this.setVisible(false); return; }
    } else if (this.mode === 'defeat') {
      tgt.set(lv.gate.x, 3.2 + this.t * 0.8, lv.gate.z).addScaledVector(_dv2.set(this.anchor.x - lv.gate.x, 0, this.anchor.z - lv.gate.z).normalize(), 2.6); k = 2.4; lookAt.set(lv.gate.x, 6, lv.gate.z);
      this.fade = Math.max(0, 1 - Math.max(0, this.t - 0.55) / 1.5); this.u.uFade.value = this.fade;
      if (this.t > 0.55 && !this.burst) { this.burst = true; const p = this.headP; FX.burst(p.x, p.y, p.z, 60, { add: true, c: [...DRAGON_PAL[lv.chap.key].c1], a: 1, s: 0.22, s1: 0.02, life: 1.4, sp: 6, up: 2, drag: 1.4, t: 2 }); if (Fireworks.show) Fireworks.show(4, true); }
      if (this.fade <= 0) { this.mode = 'gone'; this.burst = false; this.setVisible(false); return; }
    }
    if (this.mode !== 'defeat') this.burst = false;
    // çapayı yumuşakça taşı; geçmişe kaydet (gövde bu izi takip eder)
    const pa = _dv2.copy(this.anchor);
    if (k >= 60) this.anchor.copy(tgt); else { const f = 1 - Math.exp(-k * dt); this.anchor.lerp(tgt, f); }
    if (dt > 0) this.vel.lerp(_dv2.subVectors(this.anchor, pa).divideScalar(Math.max(dt, 1e-3)), 0.2);
    const H = this.hist, last = H[H.length - 1];
    if (rec && (!last || last.distanceToSquared(this.anchor) > 0.0036)) { H.push(this.anchor.clone()); this.trimHist(); }
    // baş: çapa + soluk alıp verme; çene ve sıcaklık
    const bob = this.mode === 'hover' || this.mode === 'chase' ? Math.sin(t * 2.1) * 0.12 : 0;
    this.headP.copy(this.anchor); this.headP.y += bob;
    this.jawKick = Math.max(0, (this.jawKick || 0) - dt * 1.4); this.roarT = Math.max(0, (this.roarT || 0) - dt);
    const breathing = this.mode === 'chase' && G.state === 'play';
    this.jaw = damp(this.jaw, this.jawKick > 0.2 ? 0.75 : breathing ? 0.28 + Math.sin(t * 5) * 0.06 + this.danger() * 0.25 : 0.1, 8, dtR);
    this.hot = damp(this.hot, breathing ? 0.35 + this.danger() * 0.65 : this.roarT > 0 ? 0.8 : 0.15, 4, dtR); this.u.uHot.value = this.hot * (1 - this.stun * 0.7);
    this.head.position.copy(this.headP); this.head.scale.setScalar(S);
    _dm.lookAt(lookAt, this.headP, _dup); this.head.quaternion.setFromRotationMatrix(_dm); // +z hedefe
    this.jawG.rotation.x = this.jaw * 0.85; this.mouth.visible = this.jaw > 0.18 && this.fade > 0.6;
    this.halo.material.opacity = (0.25 + this.hot * 0.3) * this.fade; this.whiskM.material.opacity = 0.9 * this.fade; this.teeth.visible = this.fade > 0.5;
    // dağılırken gözler en son söner: kısa bir parıltıyla
    const eyesOn = this.fade > 0.28; if (this.eyes.visible && !eyesOn) { _dv2.set(0, 0.17 * S, 0.45 * S).applyQuaternion(this.head.quaternion).add(this.headP); FX.burst(_dv2.x, _dv2.y, _dv2.z, 18, { add: true, c: [4.2, 3.4, 1.7], a: 1, s: 0.16, s1: 0.01, life: 0.8, sp: 2.5, up: 0.8, drag: 2 }); }
    this.eyes.visible = eyesOn;
    this.updateBody(t);
    this.updateWhiskers(t);
    this.updateFx(dtR, t, breathing);
  },
  trimHist() {
    const H = this.hist; let L = 0;
    for (let i = H.length - 1; i > 0; i--) { L += H[i].distanceTo(H[i - 1]); if (L > (DR_LEN + 1.5) * this.S) { H.splice(0, i - 1); break; } }
  },
  updateBody(t) {
    const N = this.N, R = this.R, H = this.hist, C = this.C, S = this.S, step = (DR_LEN * S) / (N - 1);
    // boyun başın arkasından; gövde geçmiş izinde
    const hq = this.head.quaternion; _dv.set(0, 0, -0.55 * S).applyQuaternion(hq).add(this.headP);
    C[0] = _dv.x; C[1] = _dv.y; C[2] = _dv.z;
    const off = _dv3.subVectors(_dv, this.anchor);
    let hi = H.length - 1, px = this.anchor.x, py = this.anchor.y, pz = this.anchor.z, acc = 0, need = step;
    for (let i = 1; i < N; i++) {
      need = i * step;
      let x = px, y = py, z = pz;
      while (hi >= 0) {
        const q = H[hi], dx = q.x - px, dy = q.y - py, dz = q.z - pz, dl = Math.hypot(dx, dy, dz);
        if (acc + dl >= need) { const f = (need - acc) / Math.max(dl, 1e-6); x = px + dx * f; y = py + dy * f; z = pz + dz * f; break; }
        acc += dl; px = q.x; py = q.y; pz = q.z; hi--; x = px; y = py; z = pz;
      }
      const tt = i / (N - 1), w = 1 - smoothstep(0, 0.16, tt);
      C[i * 3] = x + off.x * w; C[i * 3 + 1] = y + off.y * w; C[i * 3 + 2] = z + off.z * w;
    }
    // çerçeveler + yüzme dalgası
    const Fn = this.Fn, Fb = this.Fb, Tg = this.Tg;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      let tx = C[a * 3] - C[b * 3], ty = C[a * 3 + 1] - C[b * 3 + 1], tz = C[a * 3 + 2] - C[b * 3 + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let nx = -tz, ny = 0, nz = tx; let nl = Math.hypot(nx, nz);
      if (nl < 0.15 && i > 0) { nx = Fn[(i - 1) * 3]; ny = Fn[(i - 1) * 3 + 1]; nz = Fn[(i - 1) * 3 + 2]; nl = 1; } else { nx /= nl || 1; nz /= nl || 1; }
      const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
      Tg[i * 3] = tx; Tg[i * 3 + 1] = ty; Tg[i * 3 + 2] = tz; Fn[i * 3] = nx; Fn[i * 3 + 1] = ny; Fn[i * 3 + 2] = nz; Fb[i * 3] = bx; Fb[i * 3 + 1] = by; Fb[i * 3 + 2] = bz;
    }
    const sp = this.mode === 'chase' ? 3.6 : 2.6;
    for (let i = 1; i < N; i++) {
      const tt = i / (N - 1), A = 0.34 * S * smoothstep(0.04, 0.26, tt) * (1 - 0.35 * tt), A2 = 0.22 * S * smoothstep(0.1, 0.4, tt);
      const s1 = Math.sin(tt * 2.3 * TAU - t * sp), s2 = Math.sin(tt * 1.4 * TAU - t * 2.1 + 1.3);
      C[i * 3] += Fb[i * 3] * A * s1 + Fn[i * 3] * A2 * s2; C[i * 3 + 1] += Fb[i * 3 + 1] * A * s1; C[i * 3 + 2] += Fb[i * 3 + 2] * A * s1 + Fn[i * 3 + 2] * A2 * s2;
      const r = this.radius(tt); if (C[i * 3 + 1] < r + 0.35) C[i * 3 + 1] = r + 0.35;
    }
    // halkalar
    const P = this.pos, Nm = this.nrm;
    for (let i = 0; i < N; i++) {
      const tt = i / (N - 1), r = this.radius(tt);
      for (let j = 0; j <= R; j++) {
        const an = (j / R) * TAU, ca = Math.cos(an), sa = Math.sin(an), k = (i * (R + 1) + j) * 3;
        const ox = Fn[i * 3] * ca + Fb[i * 3] * sa, oy = Fn[i * 3 + 1] * ca + Fb[i * 3 + 1] * sa, oz = Fn[i * 3 + 2] * ca + Fb[i * 3 + 2] * sa;
        P[k] = C[i * 3] + ox * r; P[k + 1] = C[i * 3 + 1] + oy * r; P[k + 2] = C[i * 3 + 2] + oz * r; Nm[k] = ox; Nm[k + 1] = oy; Nm[k + 2] = oz;
      }
    }
    const g = this.body.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    // sırt yüzgeçleri: boyundan kuyruğa, sırta dik, geriye yatık
    const nf = this.fins.count;
    for (let f = 0; f < nf; f++) {
      const tt = 0.06 + (f / (nf - 1)) * 0.88, i = Math.round(tt * (N - 1)), r = this.radius(tt), s = S * (0.55 + 0.75 * Math.sin(Math.min(1, tt * 1.6) * PI * 0.9)) * (1 - tt * 0.5);
      _dv.set(C[i * 3] + Fb[i * 3] * r * 0.85, C[i * 3 + 1] + Fb[i * 3 + 1] * r * 0.85, C[i * 3 + 2] + Fb[i * 3 + 2] * r * 0.85);
      _dv2.set(Fb[i * 3] + Tg[i * 3] * -0.75, Fb[i * 3 + 1] + Tg[i * 3 + 1] * -0.75, Fb[i * 3 + 2] + Tg[i * 3 + 2] * -0.75).normalize();
      _dq.setFromUnitVectors(_dup, _dv2); _dm.compose(_dv, _dq, _dv3.setScalar(s)); this.fins.setMatrixAt(f, _dm);
    }
    this.fins.instanceMatrix.needsUpdate = true;
    // dört bacak ve pençeler (adım adım kürek çeker gibi)
    let ci = 0;
    [[0.2, -1], [0.2, 1], [0.52, -1], [0.52, 1]].forEach(([tt, sx], li) => {
      const i = Math.round(tt * (N - 1)), r = this.radius(tt), sw = Math.sin(t * 3.2 + li * 1.7) * 0.5;
      _dv.set(C[i * 3] + Fn[i * 3] * r * sx * 0.8 - Fb[i * 3] * r * 0.4, C[i * 3 + 1] + Fn[i * 3 + 1] * r * sx * 0.8 - Fb[i * 3 + 1] * r * 0.4, C[i * 3 + 2] + Fn[i * 3 + 2] * r * sx * 0.8 - Fb[i * 3 + 2] * r * 0.4);
      _dv2.set(-Fb[i * 3] + Fn[i * 3] * sx * 0.5 - Tg[i * 3] * (0.4 + sw), -Fb[i * 3 + 1] + Fn[i * 3 + 1] * sx * 0.5 - Tg[i * 3 + 1] * (0.4 + sw), -Fb[i * 3 + 2] + Fn[i * 3 + 2] * sx * 0.5 - Tg[i * 3 + 2] * (0.4 + sw)).normalize();
      _dq.setFromUnitVectors(_dup.set(0, -1, 0), _dv2); _dup.set(0, 1, 0);
      _dm.compose(_dv, _dq, _dv3.setScalar(S)); this.legs.setMatrixAt(li, _dm);
      const fx = _dv.x + _dv2.x * 0.42 * S, fy = _dv.y + _dv2.y * 0.42 * S, fz = _dv.z + _dv2.z * 0.42 * S;
      for (let c = 0; c < 3; c++) { _dv3.set(_dv2.x - Tg[i * 3] * 0.5 + Fn[i * 3] * (c - 1) * 0.5, _dv2.y - Tg[i * 3 + 1] * 0.5, _dv2.z - Tg[i * 3 + 2] * 0.5 + Fn[i * 3 + 2] * (c - 1) * 0.5).normalize(); _dq.setFromUnitVectors(_dup.set(0, -1, 0), _dv3); _dup.set(0, 1, 0); _dm.compose(_dv.set(fx, fy, fz), _dq, _dv3.setScalar(S)); this.claws.setMatrixAt(ci++, _dm); }
    });
    this.legs.instanceMatrix.needsUpdate = true; this.claws.instanceMatrix.needsUpdate = true;
  },
  radius(tt) { return (0.42 * smoothstep(-0.12, 0.12, tt) * (1 - 0.9 * Math.pow(tt, 1.15)) + 0.03) * this.S; },
  updateWhiskers(t) {
    const P = this.whiskP, n = this.whiskN;
    for (let s2 = 0; s2 < 2; s2++) {
      const sx = s2 ? 1 : -1, o = s2 * (n + 1) * 6;
      for (let i = 0; i <= n; i++) {
        const e = i / n, wv = Math.sin(t * 4.2 - e * 5 + s2) * 0.12 * e, wd = 0.045 * (1 - e) + 0.006;
        const x = sx * (0.2 + e * 0.55) + wv * 0.5, y = -0.05 - e * 0.35 + Math.sin(t * 3.1 - e * 4 + s2 * 0.7) * 0.08 * e, z = 1.0 - e * 1.75, k = o + i * 6;
        P[k] = x; P[k + 1] = y + wd; P[k + 2] = z; P[k + 3] = x; P[k + 4] = y - wd; P[k + 5] = z;
      }
    }
    this.whiskM.geometry.attributes.position.needsUpdate = true;
  },
  updateFx(dtR, t, breathing) {
    const lv = this.lv, hp = this.headP, pal = DRAGON_PAL[lv.chap.key] || DRAGON_PAL.ege, life = Perf.Q.life ? 1 : 0.5;
    // yele: boyun ve sırt boyunca yükselen alevler; kuyrukta alev
    if (this.fade > 0.2 && dtR > 0) {
      const n = Math.random() < dtR * 40 * life ? 1 : 0;
      for (let q = 0; q < n; q++) {
        const tt = Math.random() * 0.55, i = Math.round(tt * (this.N - 1)), r = this.radius(tt), C = this.C, Fb = this.Fb;
        fxAdd.spawn(C[i * 3] + Fb[i * 3] * r, C[i * 3 + 1] + Fb[i * 3 + 1] * r, C[i * 3 + 2] + Fb[i * 3 + 2] * r, (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, { c: [pal.c3[0] * 0.9, pal.c3[1] * 0.8, pal.c3[2] * 0.7], a: 0.9, s: 0.16, s1: 0.03, life: 0.55, drag: 1.6, g: 0.5 });
      }
      if (Math.random() < dtR * 18 * life) { const i = this.N - 1, C = this.C; fxAdd.spawn(C[i * 3], C[i * 3 + 1], C[i * 3 + 2], (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, { c: pal.c1, a: 0.9, s: 0.2, s1: 0.02, life: 0.5, drag: 1.8 }); }
    }
    // nefes: ağızdan yolun üstündeki nefes noktasına akan akkor; patlama uyarısında güneşe
    const mouth = _dv.set(0, -0.15, 1.15 * this.S).applyQuaternion(this.head.quaternion).add(hp);
    this.glowUnder.position.set(hp.x, 0.04, hp.z); this.glowUnder.material.opacity = 0.45 * this.fade;
    const bs = this.breathSpot;
    if (breathing) {
      const se = Math.max(0, G.s - this.gap - 0.3); pathAt(lv.path, se, _dPA);
      const tx = flare.phase === 1 ? orb.g.position.x : _dPA.x, ty = flare.phase === 1 ? orb.g.position.y : 0.15, tz = flare.phase === 1 ? orb.g.position.z : _dPA.z;
      const d = Math.hypot(tx - mouth.x, ty - mouth.y, tz - mouth.z) || 1, sp = flare.phase === 1 ? 22 : 5.5, n = Math.random() < dtR * (34 + this.danger() * 40) * life ? 2 : 0;
      for (let q = 0; q < n; q++) { const j = 0.35; fxAdd.spawn(mouth.x, mouth.y, mouth.z, ((tx - mouth.x) / d) * sp + (Math.random() - 0.5) * j * sp * 0.3, ((ty - mouth.y) / d) * sp + (Math.random() - 0.5) * j, ((tz - mouth.z) / d) * sp + (Math.random() - 0.5) * j * sp * 0.3, { c: [pal.c1[0], pal.c1[1] * 0.85, pal.c1[2] * 0.6], a: 1, s: 0.1, s1: 0.32, life: Math.min(0.9, d / sp), drag: 0.6 }); }
      bs.visible = true; bs.position.set(_dPA.x, 0.05, _dPA.z); const pul = 1 + Math.sin(t * 9) * 0.08; bs.scale.setScalar((1.7 + this.danger() * 1.1) * pul * this.S); bs.material.opacity = 0.75 + this.danger() * 0.25;
      if (Math.random() < dtR * 10 * life) FX.ember(_dPA.x + (Math.random() - 0.5) * 0.6, 0.12, _dPA.z + (Math.random() - 0.5) * 0.6);
      audio.setDragon && audio.setDragon(0.35 + this.danger() * 0.65, this.gap <= 0.02 ? 1 : 0);
    } else { bs.visible = false; }
  },
};
