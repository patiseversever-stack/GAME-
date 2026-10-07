/* =====================================================================
   GÜNEŞ EJDERHASI — her dünyanın son adasında kovalamaca
   Güneşten süzülen ejderha adanın etrafında kıvrılır ve Zifir'in peşine
   düşer. Zifir yürüdükçe mesafe korunur; durursa (Bekle, köprü)
   ejderha yetişir ve nefesi gölge tanımaz. Ara sıra şahlanıp alev
   püskürtür: alev Zifir'in hemen arkasındaki yolu yakar; Zifir
   durmuşsa (Bekle) alev ona ulaşır. Köprü beklerken, Kuş Kalkanı ya da
   tutulma varken alev zarar vermez. Çözülmüş güneş planı hiç beklemediği
   için ada çözülebilir kalır. Zifir kapıya girince ejderha ışığa dağılır.
   Görünüm: ateşten gövde (koyu kor arasında geriye akan alev şeritleri,
   akkor kenar, yırtık alev silueti), alev dillerinden yele, obsidyen
   boynuzlar, akkor gözler, alevden kuyruk ucu; dünyaya göre ateş rengi.
   Yol üstündeki ev, ağaç ve çardakların üstünden süzülür (içlerinden
   geçmez); alevi bir çatıya ya da duvara çarparsa orada durur.
   ===================================================================== */
const DR_GAP0 = 4.6, DR_CRUISE = 2.1, DR_GAPMAX = 4.8, DR_LEN = 6.4, DR_HEAD = 0.5, FIRE_LEAD = 1.2;
// dünyaya göre ateş: kor (koyu), derin, orta, akkor çekirdek; obsidyen boynuz; iç ışık (HDR); alev renkleri
const DRAGON_PAL = {
  ege: { e0: [0.09, 0.018, 0.008], e1: [0.62, 0.08, 0.02], e2: [1.9, 0.6, 0.08], e3: [3.2, 2.2, 0.9], ho: '#2a1712', gl: [2.4, 0.95, 0.22], f1: [4.2, 3.3, 1.7], f2: [3.4, 1.35, 0.3], f3: [1.4, 0.22, 0.04] },
  ruzgar: { e0: [0.08, 0.04, 0.01], e1: [0.62, 0.22, 0.03], e2: [2.0, 1.0, 0.15], e3: [3.2, 2.6, 1.2], ho: '#2e2010', gl: [2.6, 1.55, 0.4], f1: [4.2, 3.5, 1.9], f2: [3.4, 1.6, 0.35], f3: [1.4, 0.32, 0.05] },
  peri: { e0: [0.08, 0.015, 0.03], e1: [0.56, 0.06, 0.12], e2: [1.9, 0.45, 0.35], e3: [3.2, 2.0, 1.5], ho: '#2a1418', gl: [2.6, 0.85, 0.7], f1: [4.2, 3.0, 2.2], f2: [3.4, 1.05, 0.6], f3: [1.3, 0.16, 0.18] },
  tuz: { e0: [0.1, 0.03, 0.05], e1: [0.62, 0.14, 0.2], e2: [2.0, 0.75, 0.6], e3: [3.2, 2.4, 2.0], ho: '#3a2228', gl: [2.4, 1.15, 1.35], f1: [4.2, 3.3, 2.6], f2: [3.3, 1.25, 1.0], f3: [1.3, 0.25, 0.3] },
  ikiz: { e0: [0.02, 0.03, 0.08], e1: [0.12, 0.15, 0.62], e2: [0.35, 1.3, 2.0], e3: [2.0, 3.0, 3.4], ho: '#141830', gl: [0.55, 2.0, 2.4], f1: [2.8, 3.9, 4.2], f2: [0.6, 2.2, 3.2], f3: [0.12, 0.3, 1.2] },
  buz: { e0: [0.01, 0.03, 0.08], e1: [0.06, 0.2, 0.66], e2: [0.5, 1.2, 2.4], e3: [2.4, 3.0, 3.6], ho: '#121a2c', gl: [1.0, 1.8, 2.8], f1: [3.2, 3.8, 4.4], f2: [0.9, 1.8, 3.6], f3: [0.18, 0.3, 1.4] },
  ayna: { e0: [0.06, 0.01, 0.07], e1: [0.46, 0.05, 0.5], e2: [1.8, 0.45, 1.9], e3: [3.2, 2.2, 3.2], ho: '#22142a', gl: [2.2, 0.95, 2.6], f1: [4.2, 3.2, 4.0], f2: [3.0, 0.9, 2.6], f3: [1.1, 0.1, 0.8] },
  saat: { e0: [0.08, 0.035, 0.008], e1: [0.62, 0.18, 0.02], e2: [2.0, 0.85, 0.12], e3: [3.2, 2.5, 1.1], ho: '#2c1c0c', gl: [2.6, 1.65, 0.45], f1: [4.2, 3.5, 1.9], f2: [3.4, 1.6, 0.35], f3: [1.4, 0.32, 0.05] },
};
const DR_NOISE = /* glsl */`
float drH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float drN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(drH(i), drH(i + vec2(1.0, 0.0)), f.x), mix(drH(i + vec2(0.0, 1.0)), drH(i + vec2(1.0, 1.0)), f.x), f.y); }`;
// boynuz, pençe, diş kökleri: koyu obsidyen (dünyanın ışığıyla parlar), uçlara doğru kor
function hornMat(u) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.3 });
  m.onBeforeCompile = (sh) => {
    injectWorld(sh, {});
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute float aT; varying float vDT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vDT = aT;');
    let f = `varying float vDT; uniform float uTime, uFade, uHot; uniform vec3 uHo, uGl;\n${DR_NOISE}\n` + sh.fragmentShader;
    f = f.replace('void main() {', 'void main() {\n float drD = drN(vec2(vDT * 40.0, gl_FragCoord.x * 0.02) + 3.3); if (drD < 1.0 - uFade) discard;');
    f = f.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = uHo;');
    f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uGl * (0.05 + uHot * 0.1) + uGl * 2.5 * (1.0 - smoothstep(0.0, 0.07, drD - (1.0 - uFade))) * step(uFade, 0.999);');
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'DRGH';
  return envMat(m, 1.0);
}
// ateşten gövde: alan-bükülmüş gürültüyle kuyruğa doğru akan alev; koyu kor damarları, akkor çekirdek,
// sıcak kenar ve alev dili gibi yırtık siluet. uAura > 0: gövdeyi saran toplamalı alev zarfı.
const DR_FBM = /* glsl */`float drF(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * drN(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }`;
const FIREB_VERT = /* glsl */`attribute float aT; attribute float aA; uniform float uTime, uAura; varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
${DR_NOISE}
void main(){
  vec4 lp = vec4(position, 1.0); vec3 ln = normal;
#ifdef USE_INSTANCING
  lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
#endif
  vT = aT; vA = aA;
  vec4 w = modelMatrix * lp; vN = normalize(mat3(modelMatrix) * ln);
  if (uAura > 0.0) { float fl = drN(vec2(aT * 40.0 - uTime * 3.0, aA * 2.0)); w.xyz += vN * uAura * (0.55 + 0.9 * fl); w.y += uAura * fl * 0.8; }
  vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FIREB_FRAG = /* glsl */`uniform float uTime, uFade, uHot, uHead, uAura; uniform vec3 uE0, uE1, uE2, uE3; varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
${DR_NOISE}
${DR_FBM}
void main(){
  vec3 N = normalize(vN), V = normalize(vV); float mu = abs(dot(N, V)), rim = 1.0 - mu;
  float sc = mix(1.0, 2.2, uHead);
  vec2 q = vec2(vA * mix(2.6, 1.1, uHead), vT * mix(24.0, 300.0, uHead) - uTime * mix(2.2, 3.0, uHead)); // gövde boyunca uzayan, geriye akan alev şeritleri
  float w = drF(q * 0.7 + vec2(0.0, uTime * 0.35));
  float n = drF(q + vec2(w * 1.7, w * 1.3));
  float n2 = drF(q * 2.1 + vec2(-uTime * 0.6, w * 2.2));
  float up = sin(vA) * (1.0 - uHead);
  float heat = n * 0.95 + n2 * 0.4 + mu * 0.22 + uHot * 0.2 - 0.66 + up * 0.08 - uHead * 0.04;
  float d = drN(vec2(vT * 26.0, vA * 3.0) + 3.3); if (d < 1.0 - uFade) discard;
  if (uAura > 0.0) {
    float a = pow(rim, 1.6) * smoothstep(0.35, 0.75, n2 + rim * 0.3) * uAura * 9.0 * uFade;
    vec3 c = mix(uE2, uE3, smoothstep(0.55, 0.9, n));
    gl_FragColor = vec4(c * a, 1.0); return;
  }
  // yırtık alev silueti: kenarda gürültü düşükse delik (gövde içi koyu kor görünür)
  if (uHead < 0.5 && n2 + smoothstep(0.0, 0.32, mu) * 1.25 < 0.62) discard;
  vec3 c = mix(uE0, uE1, smoothstep(0.02, 0.32, heat));
  c = mix(c, uE2, smoothstep(0.3, 0.6, heat));
  c = mix(c, uE3, smoothstep(0.7, 1.05, heat));
  float vein = pow(1.0 - abs(n2 * 2.0 - 1.0), 9.0) * smoothstep(0.1, 0.4, n);
  c += uE2 * vein * (0.55 + uHot * 0.45);
  c += mix(uE1, uE2, 0.6) * pow(rim, 2.8) * 0.9;
  c *= 0.82 + 0.18 * max(N.y, 0.0);
  c += uE3 * 2.0 * (1.0 - smoothstep(0.0, 0.07, d - (1.0 - uFade))) * step(uFade, 0.999);
  gl_FragColor = vec4(c, 1.0);
}`;
function fireBodyMat(u, head, aura = 0) {
  const uu = Object.assign({}, u, { uHead: { value: head ? 1 : 0 }, uAura: { value: aura } });
  return new THREE.ShaderMaterial({ vertexShader: FIREB_VERT, fragmentShader: FIREB_FRAG, uniforms: uu, side: aura ? THREE.FrontSide : THREE.DoubleSide,
    transparent: !!aura, depthWrite: !aura, blending: aura ? THREE.CustomBlending : THREE.NormalBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
}
// alev dili (sırt yelesi): tabanı akkor, ucu kızıl, geriye savrulan, örneklenmiş
const TONGUE_VERT = /* glsl */`uniform float uTime; varying float vL; varying float vS; varying vec3 vN; varying vec3 vV;
void main(){ vec3 p = position; vL = p.y; vS = float(gl_InstanceID) * 1.37;
  p.z -= vL * vL * (0.35 + 0.15 * sin(uTime * 7.0 + vS)); p.x += sin(uTime * 9.0 + vS + vL * 4.0) * 0.12 * vL;
  vec4 lp = vec4(p, 1.0); vec3 ln = normal;
#ifdef USE_INSTANCING
  lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
#endif
  vec4 w = modelMatrix * lp; vN = normalize(mat3(modelMatrix) * ln); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const TONGUE_FRAG = /* glsl */`uniform float uTime, uFade; uniform vec3 uE1, uE2, uE3; varying float vL; varying float vS; varying vec3 vN; varying vec3 vV;
${DR_NOISE}
void main(){ float face = abs(dot(normalize(vN), normalize(vV)));
  float n = drN(vec2(vL * 6.0 - uTime * 8.0 + vS, face * 3.0 + vS));
  float heat = (1.0 - vL) * 0.75 + n * 0.45 + face * 0.2 - 0.38;
  vec3 c = mix(uE1, uE2, smoothstep(0.1, 0.5, heat)); c = mix(c, uE3, smoothstep(0.75, 1.1, heat));
  float a = smoothstep(0.05, 0.4, heat) * (1.0 - smoothstep(0.55 + n * 0.35, 1.0, vL)) * pow(face, 1.0) * smoothstep(0.0, 0.12, vL) * uFade;
  gl_FragColor = vec4(c * a * 1.05, 1.0); }`;
// alev: kameraya göre hacimli görünen, gürültüyle kıvrılan koni (toplamalı)
const FIRE_VERT = /* glsl */`uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vL; varying float vAng;
${DR_NOISE}
void main(){ vec3 p = position; vL = p.y; vAng = atan(p.z, p.x);
  float w = drN(vec2(p.y * 3.2 - uTime * 6.0, vAng * 0.9 + 2.0)) - 0.5;
  p.xz *= 1.0 + w * 0.7 * p.y; p.x += sin(p.y * 5.0 - uTime * 9.0) * 0.06 * p.y;
  vec4 wp = modelMatrix * vec4(p, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FIRE_FRAG = /* glsl */`uniform float uTime, uK, uCore; uniform vec3 uC1, uC2, uC3; varying vec3 vN; varying vec3 vV; varying float vL; varying float vAng;
${DR_NOISE}
void main(){
  float face = abs(dot(normalize(vN), normalize(vV)));
  float n = drN(vec2(vAng * 1.7 + vL * 2.0, vL * 7.0 - uTime * 11.0)) * 0.6 + drN(vec2(vAng * 3.3 - vL, vL * 15.0 - uTime * 17.0)) * 0.4;
  float heat = pow(face, 1.3) * (1.0 - vL * 0.62) * uCore + (n - 0.5) * 0.6;
  vec3 c = mix(uC3, uC2, smoothstep(0.08, 0.45, heat)); c = mix(c, uC1, smoothstep(0.5, 0.88, heat));
  float a = smoothstep(0.0, 0.28, heat) * smoothstep(0.0, 0.04, vL) * (1.0 - smoothstep(0.62 + n * 0.3, 1.0, vL)) * uK;
  gl_FragColor = vec4(c * a, 1.0);
}`;
function fireMat(core, k) {
  return new THREE.ShaderMaterial({ vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG, uniforms: { uTime: U.uTime, uK: { value: k }, uCore: { value: core }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
}
// parçalara gövde gölgelendiricisinin istediği öznitelikler (aT boy, aA yüzey açısı)
function drTag(geo, t, kz = 0.02) {
  const p = geo.attributes.position, n = p.count, at = new Float32Array(n), aa = new Float32Array(n);
  for (let i = 0; i < n; i++) { at[i] = t + (1.6 - p.getZ(i)) * kz; aa[i] = Math.atan2(p.getY(i), p.getX(i)); }
  geo.setAttribute('aT', new THREE.BufferAttribute(at, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(aa, 1));
  return geo;
}
// boynuz: eğri boyunca incelen tüp
function drHorn(pts, r0, r1, seg = 16, rad = 7) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), geo = new THREE.TubeGeometry(curve, seg, r0, rad, false);
  const p = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { curve.getPointAt(i / seg, c); const k = lerp(1, r1 / r0, Math.pow(i / seg, 0.8)); for (let j = 0; j <= rad; j++) { const ix = i * (rad + 1) + j; v.fromBufferAttribute(p, ix).sub(c).multiplyScalar(k).add(c); p.setXYZ(ix, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); return drTag(geo, 0.01);
}
// aynı malzemeli parçaları tek geometride toplar
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
// yontulmuş kafatası: küreden uzun burun, gözün üstüne taşan kaş, elmacık ve burun delikleri (birim uzay, +z ileri)
const DR_BUMPS = [[0.42, 0.36, 0.36, 0.03, 0.15], [-0.42, 0.36, 0.36, 0.03, 0.15], [0.17, 0.12, 1.2, 0.015, 0.07], [-0.17, 0.12, 1.2, 0.015, 0.07], [0.5, -0.12, -0.15, 0.05, 0.1], [-0.5, -0.12, -0.15, 0.05, 0.1], [0, 0.42, -0.35, 0.06, 0.08]];
function drSkullPt(x, y, z, out, bumps = true) {
  const f = smoothstep(-0.15, 1.0, z);
  z = z > 0 ? z * 1.38 : z * 0.86;
  x *= 0.74 * (1 - 0.48 * f);
  y = (y > 0 ? y * 0.74 * (1 - 0.18 * f) : y * 0.5) * (1 - 0.38 * f) - 0.08 * f;
  if (bumps) for (const [bx, by, bz, s2, h] of DR_BUMPS) { const d2 = (x - bx) ** 2 + (y - by) ** 2 + (z - bz) ** 2, k = h * Math.exp(-d2 / s2), n = Math.hypot(x, y, z) || 1; x += (x / n) * k; y += (y / n) * k; z += (z / n) * k; }
  return out.set(x, y, z);
}
// baş ve çene için desen koordinatları: boy (z) ve yan (x) — burun ucunda kutup sıkışması olmasın
function drHeadTag(geo, t) {
  const p = geo.attributes.position, n = p.count, at = new Float32Array(n), aa = new Float32Array(n);
  for (let i = 0; i < n; i++) { at[i] = t + (1.6 - p.getZ(i)) * 0.012; aa[i] = 1.5708 + p.getX(i) * 1.15 + p.getY(i) * 0.35 * Math.sign(p.getX(i)); }
  geo.setAttribute('aT', new THREE.BufferAttribute(at, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(aa, 1));
  return geo;
}
function drSkull() {
  const g = new THREE.SphereGeometry(1, 34, 24), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { drSkullPt(p.getX(i), p.getY(i), p.getZ(i), v); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return drHeadTag(g, 0.003);
}
function drJawGeo() {
  const g = new THREE.SphereGeometry(1, 26, 10, 0, TAU, PI / 2, PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = smoothstep(-0.2, 1.0, z);
    z = z > 0 ? z * 1.3 : z * 0.7; x *= 0.6 * (1 - 0.42 * f); y *= 0.3 * (1 - 0.3 * f);
    p.setXYZ(i, x, y, z + 0.08);
  }
  g.computeVertexNormals(); return drHeadTag(g, 0.004);
}
const _dv = new THREE.Vector3(), _dv2 = new THREE.Vector3(), _dv3 = new THREE.Vector3(), _dv4 = new THREE.Vector3(), _ds = new THREE.Vector3(), _dq = new THREE.Quaternion(), _dm = new THREE.Matrix4(), _dup = new THREE.Vector3(0, 1, 0), _dPA = {}, _dc = new THREE.Color();

const Dragon = {
  built: false, on: false, mode: 'off', t: 0, T: 0, gap: DR_GAP0, hot: 0, jaw: 0.1, fade: 1, S: 1, lunge: 0, stun: 0, warned: false, fireK: 0,
  F: { st: 'idle', t: 0, next: 3, safe: false, kind: 'path', hitShown: false, blocked: false }, obs: [],
  build() {
    if (this.built) return; this.built = true;
    const lowQ = Perf.level <= 0;
    this.N = lowQ ? 48 : 76; this.R = lowQ ? 10 : 16;
    const N = this.N, R = this.R, V = N * (R + 1);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(V * 3); this.nrm = new Float32Array(V * 3);
    const at = new Float32Array(V), aa = new Float32Array(V), idx = [];
    for (let i = 0; i < N; i++) for (let j = 0; j <= R; j++) { const k = i * (R + 1) + j; at[k] = 0.02 + (i / (N - 1)) * 0.98; aa[k] = (j / R) * TAU; }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(at, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aa, 1)); g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.u = { uTime: U.uTime, uFade: { value: 1 }, uHot: { value: 0 }, uE0: { value: new THREE.Color() }, uE1: { value: new THREE.Color() }, uE2: { value: new THREE.Color() }, uE3: { value: new THREE.Color() }, uHo: { value: new THREE.Color() }, uGl: { value: new THREE.Color() } };
    this.mat = fireBodyMat(this.u, false); this.headMat = fireBodyMat(this.u, true); this.hornMat = hornMat(this.u);
    this.body = new THREE.Mesh(g, this.mat); this.body.frustumCulled = false; scene.add(this.body);
    // sırt yelesi: alev dilleri; iki boğumlu bacaklar ve obsidyen pençeler (örneklenmiş)
    const tongue = new THREE.CylinderGeometry(0, 1, 1, 14, 8, true); tongue.translate(0, 0.5, 0);
    this.fins = new THREE.InstancedMesh(tongue, new THREE.ShaderMaterial({ vertexShader: TONGUE_VERT, fragmentShader: TONGUE_FRAG, uniforms: { uTime: U.uTime, uFade: this.u.uFade, uE1: this.u.uE1, uE2: this.u.uE2, uE3: this.u.uE3 }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }), 26);
    this.fins.frustumCulled = false; this.fins.renderOrder = 8; scene.add(this.fins);
    // bacak: boy boyunca küçük pullar (baş malzemesi, karınsız)
    const seg = (r0, r1) => { const c = new THREE.CylinderGeometry(r1, r0, 1, 10, 4); c.translate(0, 0.5, 0); const p = c.attributes.position, n = p.count, at = new Float32Array(n), aa = new Float32Array(n); for (let i = 0; i < n; i++) { at[i] = 0.3 + p.getY(i) * 0.012; aa[i] = Math.atan2(p.getZ(i), p.getX(i)) * 0.5 + 1.2; } c.setAttribute('aT', new THREE.BufferAttribute(at, 1)); c.setAttribute('aA', new THREE.BufferAttribute(aa, 1)); return c; };
    this.legA = new THREE.InstancedMesh(seg(0.095, 0.07), this.mat, 4); this.legB = new THREE.InstancedMesh(seg(0.066, 0.05), this.mat, 4);
    const claw = drTag(new THREE.ConeGeometry(0.03, 0.15, 5), 0.5); claw.translate(0, 0.075, 0);
    this.claws = new THREE.InstancedMesh(claw, this.hornMat, 12);
    for (const m of [this.legA, this.legB, this.claws]) { m.frustumCulled = false; scene.add(m); }
    // baş: yontulmuş kafatası, altın boynuzlar ve taç dikenleri, parlayan gözler, açılan çene, dişler, bıyıklar
    const h = (this.head = new THREE.Group()); scene.add(h);
    const _o = new THREE.Object3D(), put = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { _o.position.set(x, y, z); _o.scale.set(sx, sy, sz); _o.rotation.set(rx, ry, rz); _o.updateMatrix(); return geo.applyMatrix4(_o.matrix); };
    const tint = (geo, c) => { const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
    h.add(new THREE.Mesh(drSkull(), this.headMat));
    const horns = [];
    for (const sx of [-1, 1]) {
      horns.push(drHorn([[sx * 0.24, 0.36, -0.2], [sx * 0.38, 0.54, -0.58], [sx * 0.44, 0.58, -0.98], [sx * 0.36, 0.76, -1.38]], 0.12, 0.016, 18, 8));
      horns.push(drHorn([[sx * 0.42, 0.1, -0.32], [sx * 0.66, 0.16, -0.62], [sx * 0.82, 0.32, -0.9]], 0.05, 0.01, 10, 6));
      for (let k = 0; k < 3; k++) horns.push(put(drTag(new THREE.ConeGeometry(0.05 - k * 0.01, 0.34 - k * 0.07, 5), 0.01), sx * (0.48 + k * 0.05), -0.2 - k * 0.07, -0.25 - k * 0.12, 1, 1, 1, -1.85 + k * 0.2, 0, sx * (1.0 + k * 0.12)));
    }
    h.add(new THREE.Mesh(drMerge(horns), this.hornMat));
    // gözler kafatası yüzeyine oturur (kaşın altında), dikey yarık bebek dışa bakar; dişler üst çene kenarı boyunca
    const eyes = [], upT = [], sp = new THREE.Vector3(), nv = new THREE.Vector3(), q = new THREE.Quaternion(), M = new THREE.Matrix4();
    for (const sx of [-1, 1]) {
      drSkullPt(sx * 0.8, 0.4, 0.44, sp); nv.copy(sp).sub(drSkullPt(sx * 0.62, 0.32, 0.34, new THREE.Vector3())).normalize();
      const eg = new THREE.SphereGeometry(0.085, 16, 12); eg.scale(1, 0.72, 1.15); q.setFromUnitVectors(new THREE.Vector3(1, 0, 0).multiplyScalar(sx), nv); M.compose(sp.clone().addScaledVector(nv, -0.03), q, new THREE.Vector3(1, 1, 1)); eg.applyMatrix4(M); eyes.push(tint(eg, [1, 1, 1]));
      const pg = new THREE.BoxGeometry(0.012, 0.1, 0.03); M.compose(sp.clone().addScaledVector(nv, 0.05), q, new THREE.Vector3(1, 1, 1)); pg.applyMatrix4(M); eyes.push(tint(pg, [0.02, 0.01, 0.01]));
      for (let k = 0; k < 6; k++) { const z0 = 0.22 + k * 0.11, y0 = -0.16, x0 = sx * Math.sqrt(Math.max(0, 1 - z0 * z0 - y0 * y0)); drSkullPt(x0, y0, z0, sp); upT.push(tint(put(new THREE.ConeGeometry(0.026 - k * 0.002, 0.1 - k * 0.006, 4), sp.x * 0.9, sp.y - 0.035, sp.z, 1, 1, 1, PI, 0, 0), [2.3, 2.15, 1.85])); }
    }
    this.eyeMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color() });
    this.eyes = new THREE.Mesh(drMerge(eyes), this.eyeMat); h.add(this.eyes);
    this.teethU = new THREE.Mesh(drMerge(upT), new THREE.MeshBasicMaterial({ vertexColors: true })); h.add(this.teethU);
    this.jawG = new THREE.Group(); this.jawG.position.set(0, -0.12, -0.1); h.add(this.jawG);
    this.jawG.add(new THREE.Mesh(drJawGeo(), this.headMat));
    const loT = []; for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { const z0 = 0.2 + k * 0.13, f = smoothstep(-0.2, 1.0, z0), x = sx * 0.6 * Math.sqrt(1 - z0 * z0) * (1 - 0.42 * f) * 0.88; loT.push(put(new THREE.ConeGeometry(0.024, 0.085, 4), x, 0.035, z0 * 1.3 + 0.08)); }
    this.teeth = new THREE.Mesh(drMerge(loT), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.15, 1.85) })); this.jawG.add(this.teeth);
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color() })); this.mouth.position.set(0, -0.14, 0.62); this.mouth.scale.set(0.75, 0.42, 1.7); h.add(this.mouth);
    // bıyıklar: burun deliklerinden geriye savrulan iki ışık şeridi (tek ağ)
    const WS = 18, wg = new THREE.BufferGeometry(), wp = new Float32Array((WS + 1) * 2 * 3 * 2), wi = [];
    for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < WS; i++) { const a = s2 * (WS + 1) * 2 + i * 2; wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3).setUsage(THREE.DynamicDrawUsage)); wg.setIndex(wi);
    this.whiskM = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: new THREE.Color(), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.whiskM.frustumCulled = false; h.add(this.whiskM); this.whiskP = wp; this.whiskN = WS;
    // alev: iç (sıcak çekirdek) ve dış koni; kuyruk ucunda küçük alev
    const cone = new THREE.CylinderGeometry(1, 0.1, 1, 22, 16, true); cone.translate(0, 0.5, 0);
    this.jetIn = new THREE.Mesh(cone, fireMat(1.35, 1)); this.jetOut = new THREE.Mesh(cone, fireMat(0.85, 0.75));
    this.tailFire = new THREE.Mesh(cone, fireMat(1.1, 0.8));
    for (const m of [this.jetIn, this.jetOut, this.tailFire]) { m.frustumCulled = false; m.renderOrder = 8; m.visible = false; scene.add(m); }
    // yerde ışık: başın altında sıcak parıltı, alevin düştüğü yerde yanık
    const decal = (s, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); m.rotation.x = -PI / 2; m.scale.setScalar(s); m.renderOrder = 3; scene.add(m); return m; };
    this.glowUnder = decal(5, 0.4); this.breathSpot = decal(2.4, 0.9);
    this.glowTrail = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), 4);
    this.glowTrail.renderOrder = 3; this.glowTrail.frustumCulled = false; scene.add(this.glowTrail);
    this.hist = []; this.C = new Float32Array(N * 3); this.Fn = new Float32Array(N * 3); this.Fb = new Float32Array(N * 3); this.Tg = new Float32Array(N * 3);
    this.anchor = new THREE.Vector3(); this.headP = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.mouthP = new THREE.Vector3(); this.fireT = new THREE.Vector3(); this.spotP = new THREE.Vector3();
    this.setVisible(false);
  },
  setVisible(v) { this.vis = v; for (const o of [this.body, this.fins, this.legA, this.legB, this.claws, this.head, this.glowUnder, this.breathSpot, this.glowTrail]) o.visible = v; if (!v) this.jetIn.visible = this.jetOut.visible = this.tailFire.visible = false; },
  // ada açılırken: final adasıysa ejderhayı kurar ve güneşten süzülüşünü başlatır
  setup(lv) {
    this.on = !!(lv.spec && lv.spec.boss);
    if (!this.on) { if (this.built) this.setVisible(false); this.mode = 'off'; this.fireK = 0; audio.setDragon && audio.setDragon(0, 0); return; }
    this.build(); this.lv = lv;
    const P = (this.pal = DRAGON_PAL[lv.chap.key] || DRAGON_PAL.ege), u = this.u;
    u.uE0.value.setRGB(...P.e0); u.uE1.value.setRGB(...P.e1); u.uE2.value.setRGB(...P.e2); u.uE3.value.setRGB(...P.e3); u.uHo.value.set(P.ho); u.uGl.value.setRGB(...P.gl);
    this.eyeMat.color.setRGB(P.e3[0] * 1.1, P.e3[1] * 1.1, P.e3[2] * 1.1); // akkor gözler
    this.mouth.material.color.setRGB(...P.f2).multiplyScalar(1.1);
    this.whiskM.material.color.setRGB(...P.gl).multiplyScalar(0.5);
    for (const [m, a] of [[this.jetIn, [P.f1, P.f2, P.f3]], [this.jetOut, [P.f2, P.f3, P.f3.map((v) => v * 0.5)]], [this.tailFire, [P.f1, P.f2, P.f3]]]) { m.material.uniforms.uC1.value.setRGB(...a[0]); m.material.uniforms.uC2.value.setRGB(...a[1]); m.material.uniforms.uC3.value.setRGB(...a[2]); }
    this.glowUnder.material.color.setRGB(...P.gl).multiplyScalar(0.22); this.glowTrail.material.color.setRGB(...P.gl).multiplyScalar(0.16); this.breathSpot.material.color.setRGB(...P.f2).multiplyScalar(0.45);
    this.S = lv.spec.g === STORY_LEVELS - 1 ? 1.4 : 1.25;
    this.buildClear(lv);
    this.u.uFade.value = this.fade = 1; this.hot = 0; this.jaw = 0.1; this.gap = DR_GAP0; this.lunge = 0; this.stun = 0; this.fireK = 0; this.introFire = false; this.burn = 0;
    this.F = { st: 'idle', t: 0, next: 3.2, safe: false, kind: 'path', hitShown: false };
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
  // engel profili: yol boyunca ejderhanın geçeceği yükseklik — ev, ağaç, çardak ve kayaların üstünden süzülür (içlerinden geçmez)
  buildClear(lv) {
    const S = this.S, ds = 0.25, s0 = -7, n = Math.ceil((lv.length + 2 - s0) / ds) + 1, raw = new Float32Array(n), skip = new Set();
    for (const m of lv.movers) for (const c of moverCols(m)) skip.add(c.id);
    const obs = (this.obs = []);
    for (const c of lv.cols) {
      if (skip.has(c.id)) continue;
      let top, bot, r;
      if (c.k === 0) { top = c.y1; bot = c.y0; r = Math.max(c.r0, c.r1); } else if (c.k === 1) { top = c.y + c.r * c.sy; bot = c.y - c.r * c.sy; r = c.r; } else if (c.k === 2) { top = c.y + c.hy; bot = c.y - c.hy; r = Math.hypot(c.hx, c.hz); } else continue;
      if (bot > 3.4 * S) continue;
      obs.push({ x: c.k === 2 || c.k === 1 ? c.x : c.x, z: c.z, r, top, bot });
    }
    for (let i = 0; i < n; i++) {
      const sv = s0 + i * ds; pathAt(lv.path, Math.max(0, sv), _dPA); const x = _dPA.x + (sv < 0 ? _dPA.tx * sv : 0), z = _dPA.z + (sv < 0 ? _dPA.tz * sv : 0);
      let h = 0; for (const o of obs) if (Math.hypot(o.x - x, o.z - z) < o.r + 0.75 * S) h = Math.max(h, o.top + 0.8 * S);
      raw[i] = h;
    }
    const mx = new Float32Array(n), cl = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let k = -7; k <= 7; k++) { const j = i + k; if (j >= 0 && j < n) m = Math.max(m, raw[j]); } mx[i] = m; }
    for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let k = -5; k <= 5; k++) { const j = i + k; if (j >= 0 && j < n) { a += mx[j]; c++; } } cl[i] = Math.max(raw[i], a / c); }
    this.clr = { s0, ds, n, cl };
  },
  // yolun s noktasında uçuş yüksekliği (only: yalnızca engel payı)
  hAt(sv, only = false) {
    const C = this.clr; if (!C) return only ? 0 : 1.4 * this.S;
    const f = clamp((sv - C.s0) / C.ds, 0, C.n - 1.001), i = Math.floor(f), h = lerp(C.cl[i], C.cl[i + 1], f - i);
    return only ? h : Math.max(1.4 * this.S, h);
  },
  hoverPoint(out) { const lv = this.lv; pathAt(lv.path, 0, _dPA); return out.set(_dPA.x - _dPA.tx * 2.6, Math.max(1.75, this.hAt(-2.6)), _dPA.z - _dPA.tz * 2.6); },
  reset() { if (!this.on) return; this.mode = 'hover'; this.t = 0; this.gap = DR_GAP0; this.u.uFade.value = this.fade = 1; this.lunge = 0; this.stun = 0; this.F = { st: 'idle', t: 0, next: 3.2, safe: false, kind: 'path', hitShown: false }; this.setVisible(true); audio.setDragon && audio.setDragon(0, 0); },
  start() { if (!this.on) return; this.mode = 'chase'; this.t = 0; this.gap = DR_GAP0; this.F = { st: 'idle', t: 0, next: 3.2, safe: false, kind: 'path', hitShown: false }; this.roar(1); if (!Save.seen('t-dragon')) setTimeout(() => G.state === 'play' && tip('t-dragon', '<em>Güneş Ejderhası</em> peşinde! Zifir yürüdükçe yetişemez; <em>durursan</em> alevi sana ulaşır. <em>Tutulma</em> onu sersemletir.', 5.2), 900); },
  roar(k = 1) { this.jawKick = 1; this.roarT = 0.9; audio.dragonRoar && audio.dragonRoar(k); G.trauma = Math.max(G.trauma, 0.22 * k); haptic([20, 40, 30]); },
  danger() { if (!this.on || this.mode !== 'chase') return 0; const fk = this.F.st === 'blast' && !this.F.safe ? clamp01((2.0 - this.gap) / 0.6) * 0.5 : 0; return Math.max(clamp01((1.5 - this.gap) / 1.5), fk); },
  // alev ateşlenir: hedef türü (yol / güneş / gök)
  ignite(kind) { const F = this.F; F.st = 'charge'; F.t = 0; F.kind = kind; F.safe = kind !== 'path'; F.hitShown = false; audio.dragonCharge && audio.dragonCharge(); },
  // oyun adımı: mesafeyi ve alevi günceller; nefes ya da alev Zifir'e değiyorsa ek pozlama döner (0..1)
  step(dt, moving, ecl, shield) {
    if (!this.on || this.mode !== 'chase') return 0;
    const v = G.lv.speed, F = this.F;
    this.stun = damp(this.stun, ecl > 0.5 ? 1 : 0, ecl > 0.5 ? 8 : 2, dt);
    let vd = this.gap > DR_CRUISE ? v * 1.25 : moving ? v * 0.86 : v * 0.62;
    vd *= 1 - this.stun * 0.75;
    this.gap = Math.min(DR_GAPMAX, Math.max(0, this.gap + ((moving ? v : 0) - vd) * dt));
    this.lunge = Math.max(0, this.lunge - dt);
    // alev: ara sıra; Zifir durursa daha sık. Köprüde beklerken başlamaz, sürerken zararsızlaşır.
    F.t += dt;
    if (F.st === 'idle') {
      F.next -= dt * (G.holding ? 3 : 1);
      if (flare.phase === 1 && !this.sunFired) { this.sunFired = true; this.ignite('sun'); }
      else if (this.stun < 0.3 && !G.waiting && ((F.next <= 0 && (this.gap >= 1.8 || G.holding)) || (G.holding && this.gap < 1.9 && F.t > 1.2))) this.ignite('path'); // duran Zifir'e hemen alev
    } else if (F.st === 'charge' && F.t >= 0.75) { F.st = 'blast'; F.t = 0; audio.dragonFire && audio.dragonFire(); G.trauma = Math.max(G.trauma, 0.28); haptic([30, 20, 40]); }
    else if (F.st === 'blast') { if (G.waiting || shield || this.stun > 0.5) F.safe = true; if (F.t >= 1.35) { F.st = 'idle'; F.t = 0; F.next = 5.5 + Math.random() * 3; } }
    if (flare.phase === 0) this.sunFired = false;
    let f = 0;
    if (F.st === 'blast' && F.kind === 'path' && !F.safe && !F.blocked && F.t > 0.1 && F.t < 1.2 && this.gap - FIRE_LEAD < 0.34) {
      f = 1; if (!F.hitShown) { F.hitShown = true; popText(zifir.g.position.x, 1.1, zifir.g.position.z, 'alev!'); }
    }
    if (this.gap <= 0.02 && !shield && this.stun < 0.5) {
      if (!this.warned) { this.warned = true; popText(zifir.g.position.x, 1.1, zifir.g.position.z, 'ejderha yetişti!'); }
      return 1;
    }
    if (this.gap > 0.6) this.warned = false;
    return f;
  },
  revive() { if (!this.on) return; this.mode = 'chase'; this.t = 0; this.gap = DR_GAP0; this.F = { st: 'idle', t: 0, next: 3.5, safe: false, kind: 'path', hitShown: false }; },
  defeat() { if (!this.on || this.mode === 'off') return; if (this.lv && this.lv.chap && (G.mode === 'story' || G.mode === 'night')) Meta.find('d:' + this.lv.chap.key); this.mode = 'defeat'; this.t = 0; this.F.st = 'idle'; this.roar(1.2); audio.dragonDie && audio.dragonDie(); audio.setDragon && audio.setDragon(0, 0); },
  onFail() { if (!this.on || this.mode === 'off') return; this.mode = 'leave'; this.t = 0; this.F.st = 'idle'; this.roar(0.9); audio.setDragon && audio.setDragon(0, 0); },
  // görseller (her kare)
  update(dt, dtR) {
    if (!this.on || !this.built) return;
    const st = G.state, lv = this.lv;
    if (st === 'title' || st === 'map' || st === 'theater' || st === 'film' || G.lv !== lv) { if (this.vis) this.setVisible(false); this.fireK = 0; return; }
    if (st === 'rewind' || (st === 'ready' && this.mode !== 'intro' && this.mode !== 'hover')) this.reset();
    if (this.mode === 'gone') { if (this.vis) this.setVisible(false); this.fireK = 0; return; }
    if (!this.vis) this.setVisible(true);
    this.t += dt; this.T += dtR; const t = U.uTime.value, S = this.S, F = this.F;
    // oyun dışında (giriş, süzülüş) alev zamanlayıcısı burada ilerler
    if (this.mode !== 'chase') { if (F.st === 'charge') { F.t += dtR; if (F.t >= 0.75) { F.st = 'blast'; F.t = 0; audio.dragonFire && audio.dragonFire(); G.trauma = Math.max(G.trauma, 0.2); } } else if (F.st === 'blast') { F.t += dtR; if (F.t >= 1.2) { F.st = 'idle'; F.t = 0; } } }
    const tgt = _dv, lookAt = _dv3;
    let k = 3.2;
    pathAt(lv.path, G.s, _dPA); const zx = _dPA.x, zz = _dPA.z;
    if (this.mode === 'intro') {
      const dur = Math.max(1.8, (G.introDur || 3.4) - 0.5), e = clamp01(this.T / dur), u = Ease.inOutSine(e);
      this.introC.getPointAt(u, tgt); k = 60;
      if (!this.roared && this.T > dur * 0.35) { this.roared = true; this.roar(1); }
      if (e >= 1) { this.mode = 'hover'; this.t = 0; }
      lookAt.copy(tgt).add(this.vel);
    } else if (this.mode === 'hover') {
      this.hoverPoint(tgt); k = 2.2; lookAt.set(zx, 0.5, zz);
      if (!this.introFire && this.t > 0.25) { this.introFire = true; this.ignite('sky'); } // gelişini gökyüzüne alevle duyurur
    } else if (this.mode === 'chase') {
      const lk = this.lunge > 0 ? Math.sin(clamp01(1 - this.lunge / 1.1) * PI) : 0, se = G.s - this.gap - (0.85 - lk * 0.6) * S;
      const hy = this.hAt(se); this.seH = se;
      if (se >= 0) { pathAt(lv.path, se, _dPA); tgt.set(_dPA.x, hy, _dPA.z); }
      else { pathAt(lv.path, 0, _dPA); tgt.set(_dPA.x + _dPA.tx * se, hy, _dPA.z + _dPA.tz * se); }
      const sw = Math.sin(t * 1.15) * 0.45 * (1 - this.danger() * 0.6); tgt.x += _dPA.nx * sw; tgt.z += _dPA.nz * sw; tgt.y += Math.sin(t * 2.3) * 0.16 + this.stun * 0.9;
      k = 5.5; lookAt.set(zx, 0.35, zz);
    } else if (this.mode === 'leave') {
      const a = Math.atan2(this.anchor.z - this.cz, this.anchor.x - this.cx) + dt * 0.9, R = this.Rr + this.t * 2.5;
      tgt.set(this.cx + Math.cos(a) * R, 2 + this.t * 3.2, this.cz + Math.sin(a) * R); k = 3; lookAt.copy(tgt).add(this.vel);
      if (this.t > 4.5) { this.mode = 'gone'; this.setVisible(false); return; }
    } else if (this.mode === 'defeat') {
      tgt.set(lv.gate.x, 3.2 + this.t * 0.8, lv.gate.z).addScaledVector(_dv2.set(this.anchor.x - lv.gate.x, 0, this.anchor.z - lv.gate.z).normalize(), 2.6); k = 2.4; lookAt.set(lv.gate.x, 6, lv.gate.z);
      this.fade = Math.max(0, 1 - Math.max(0, this.t - 0.55) / 1.5); this.u.uFade.value = this.fade;
      if (this.t > 0.55 && !this.burst) { this.burst = true; const p = this.headP, P = this.pal; FX.burst(p.x, p.y, p.z, 60, { add: true, c: [...P.f1], a: 1, s: 0.22, s1: 0.02, life: 1.4, sp: 6, up: 2, drag: 1.4, t: 2 }); if (Fireworks.show) Fireworks.show(4, true); }
      if (this.fade <= 0) { this.mode = 'gone'; this.burst = false; this.setVisible(false); return; }
    }
    if (this.mode !== 'defeat') this.burst = false;
    // alev hedefi ve baş duruşu: şahlanırken başını kaldırır, püskürtürken hedefe eğilir
    const fireOn = F.st === 'blast' && (this.mode === 'chase' || this.mode === 'hover' || this.mode === 'intro');
    if (F.st !== 'idle') {
      if (F.kind === 'sun') this.fireT.copy(orb.g.position);
      else if (F.kind === 'sky') this.fireT.copy(this.headP).addScaledVector(_dv2.set(this.vel.x, 0, this.vel.z).normalize(), 3).add(_dv4.set(0, 2.2, 0));
      else { pathAt(lv.path, Math.max(0, G.s - this.gap + FIRE_LEAD), _dPA); this.fireT.set(_dPA.x, 0.08, _dPA.z); }
      if (F.st === 'charge') { lookAt.lerp(_dv2.copy(this.fireT).add(_dv4.set(0, 2.5, 0)), 0.85); tgt.y += 0.3 * Math.sin(clamp01(F.t / 0.75) * PI * 0.5); }
      else if (fireOn) { lookAt.copy(this.fireT); if (F.kind === 'path' && this.mode === 'chase') tgt.y = Math.max(tgt.y - 0.5 * S * smoothstep(0, 0.3, F.t), this.hAt(this.seH, true)); } // alçalarak yolu tarar (engelin altına inmez)
    }
    // çapayı yumuşakça taşı; geçmişe kaydet (gövde bu izi takip eder)
    const pa = _dv2.copy(this.anchor);
    if (k >= 60) this.anchor.copy(tgt); else { const f = 1 - Math.exp(-k * dt); this.anchor.lerp(tgt, f); }
    if (dt > 0) this.vel.lerp(_dv2.subVectors(this.anchor, pa).divideScalar(Math.max(dt, 1e-3)), 0.2);
    const H = this.hist, last = H[H.length - 1];
    if (!last || last.distanceToSquared(this.anchor) > 0.0036) { H.push(this.anchor.clone()); this.trimHist(); }
    // baş: çapa + soluk alıp verme; çene ve sıcaklık
    const bob = this.mode === 'hover' || this.mode === 'chase' ? Math.sin(t * 2.1) * 0.1 : 0;
    this.headP.copy(this.anchor); this.headP.y += bob;
    this.jawKick = Math.max(0, (this.jawKick || 0) - dt * 1.4); this.roarT = Math.max(0, (this.roarT || 0) - dt);
    const chasing = this.mode === 'chase' && G.state === 'play';
    const jawT = F.st === 'charge' ? 0.55 + 0.35 * clamp01(F.t / 0.75) : fireOn ? 0.95 : this.jawKick > 0.2 ? 0.8 : chasing ? 0.16 + Math.sin(t * 5) * 0.04 + this.danger() * 0.2 : 0.08;
    this.jaw = damp(this.jaw, jawT, 9, dtR);
    this.hot = damp(this.hot, fireOn ? 1 : F.st === 'charge' ? 0.8 : chasing ? 0.3 + this.danger() * 0.5 : this.roarT > 0 ? 0.6 : 0.15, 4, dtR); this.u.uHot.value = this.hot * (1 - this.stun * 0.7);
    const HS = S * DR_HEAD;
    this.head.position.copy(this.headP); this.head.scale.setScalar(HS);
    _dm.lookAt(lookAt, this.headP, _dup); _dq.setFromRotationMatrix(_dm);
    if (k >= 60 || dtR <= 0) this.head.quaternion.copy(_dq); else this.head.quaternion.slerp(_dq, 1 - Math.exp(-14 * dtR)); // +z hedefe
    this.jawG.rotation.x = this.jaw * 0.75; this.mouth.visible = this.jaw > 0.2 && this.fade > 0.6; this.mouth.scale.set(0.75, 0.42 + this.jaw * 0.5, 1.7);
    this.whiskM.material.opacity = 0.85 * this.fade; this.teeth.visible = this.teethU.visible = this.fade > 0.5;
    const eyesOn = this.fade > 0.28; if (this.eyes.visible && !eyesOn) { _dv2.set(0, 0.22 * HS, 0.4 * HS).applyQuaternion(this.head.quaternion).add(this.headP); FX.burst(_dv2.x, _dv2.y, _dv2.z, 18, { add: true, c: [...this.pal.f1], a: 1, s: 0.16, s1: 0.01, life: 0.8, sp: 2.5, up: 0.8, drag: 2 }); }
    this.eyes.visible = eyesOn;
    this.updateBody(t);
    this.updateWhiskers(t);
    this.updateFire(dtR, t, fireOn);
    this.updateFx(dtR, t, chasing);
  },
  trimHist() {
    const H = this.hist; let L = 0;
    for (let i = H.length - 1; i > 0; i--) { L += H[i].distanceTo(H[i - 1]); if (L > (DR_LEN + 1.5) * this.S) { H.splice(0, i - 1); break; } }
  },
  updateBody(t) {
    const N = this.N, R = this.R, H = this.hist, C = this.C, S = this.S, step = (DR_LEN * S) / (N - 1);
    // boyun kafatasının arkasından; gövde geçmiş izinde
    const hq = this.head.quaternion; _dv.set(0, -0.05, -0.62).multiplyScalar(S * DR_HEAD).applyQuaternion(hq).add(this.headP);
    C[0] = _dv.x; C[1] = _dv.y; C[2] = _dv.z;
    const off = _dv3.subVectors(_dv, this.anchor);
    let hi = H.length - 1, px = this.anchor.x, py = this.anchor.y, pz = this.anchor.z, acc = 0;
    for (let i = 1; i < N; i++) {
      const need = i * step;
      let x = px, y = py, z = pz;
      while (hi >= 0) {
        const q = H[hi], dx = q.x - px, dy = q.y - py, dz = q.z - pz, dl = Math.hypot(dx, dy, dz);
        if (acc + dl >= need) { const f = (need - acc) / Math.max(dl, 1e-6); x = px + dx * f; y = py + dy * f; z = pz + dz * f; break; }
        acc += dl; px = q.x; py = q.y; pz = q.z; hi--; x = px; y = py; z = pz;
      }
      const tt = i / (N - 1), w = 1 - smoothstep(0, 0.2, tt);
      C[i * 3] = x + off.x * w; C[i * 3 + 1] = y + off.y * w; C[i * 3 + 2] = z + off.z * w;
    }
    // çerçeveler + yüzme dalgası
    const Fn = this.Fn, Fb = this.Fb, Tg = this.Tg;
    const frames = () => {
      for (let i = 0; i < N; i++) {
        const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
        let tx = C[a * 3] - C[b * 3], ty = C[a * 3 + 1] - C[b * 3 + 1], tz = C[a * 3 + 2] - C[b * 3 + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        let nx = -tz, ny = 0, nz = tx; const nl = Math.hypot(nx, nz);
        if (nl < 0.15 && i > 0) { nx = Fn[(i - 1) * 3]; ny = Fn[(i - 1) * 3 + 1]; nz = Fn[(i - 1) * 3 + 2]; } else { nx /= nl || 1; nz /= nl || 1; }
        const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
        Tg[i * 3] = tx; Tg[i * 3 + 1] = ty; Tg[i * 3 + 2] = tz; Fn[i * 3] = nx; Fn[i * 3 + 1] = ny; Fn[i * 3 + 2] = nz; Fb[i * 3] = bx; Fb[i * 3 + 1] = by; Fb[i * 3 + 2] = bz;
      }
    };
    frames();
    const sp = this.mode === 'chase' ? 3.6 : 2.6;
    for (let i = 1; i < N; i++) {
      const tt = i / (N - 1), A = 0.24 * S * smoothstep(0.06, 0.3, tt) * (1 - 0.3 * tt), A2 = 0.14 * S * smoothstep(0.12, 0.45, tt);
      const s1 = Math.sin(tt * 1.7 * TAU - t * sp), s2 = Math.sin(tt * 1.2 * TAU - t * 2.1 + 1.3);
      C[i * 3] += Fb[i * 3] * A * s1 + Fn[i * 3] * A2 * s2; C[i * 3 + 1] += Fb[i * 3 + 1] * A * s1; C[i * 3 + 2] += Fb[i * 3 + 2] * A * s1 + Fn[i * 3 + 2] * A2 * s2;
      const r = this.radius(tt); if (C[i * 3 + 1] < r + 0.3) C[i * 3 + 1] = r + 0.3;
    }
    frames(); // dalgalı eğri için yeniden: halkalar eğriye dik kalsın
    // halkalar (gövde kesiti biraz basık: sırt yuvarlak, karın düz)
    const P = this.pos, Nm = this.nrm;
    for (let i = 0; i < N; i++) {
      const tt = i / (N - 1), r = this.radius(tt);
      for (let j = 0; j <= R; j++) {
        const an = (j / R) * TAU, ca = Math.cos(an), sa = Math.sin(an), k = (i * (R + 1) + j) * 3, sy = sa < 0 ? 0.82 : 1;
        const ox = Fn[i * 3] * ca + Fb[i * 3] * sa * sy, oy = Fn[i * 3 + 1] * ca + Fb[i * 3 + 1] * sa * sy, oz = Fn[i * 3 + 2] * ca + Fb[i * 3 + 2] * sa * sy;
        const nx = Fn[i * 3] * ca + Fb[i * 3] * sa / sy, ny = Fn[i * 3 + 1] * ca + Fb[i * 3 + 1] * sa / sy, nz = Fn[i * 3 + 2] * ca + Fb[i * 3 + 2] * sa / sy, nl = Math.hypot(nx, ny, nz) || 1;
        P[k] = C[i * 3] + ox * r; P[k + 1] = C[i * 3 + 1] + oy * r; P[k + 2] = C[i * 3 + 2] + oz * r; Nm[k] = nx / nl; Nm[k + 1] = ny / nl; Nm[k + 2] = nz / nl;
      }
    }
    const g = this.body.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    // alevden yele: boyundan kuyruğa sırt boyunca yükselen alev dilleri (ortada en uzun, kuyruğa doğru küçülür)
    const nf = this.fins.count;
    for (let f = 0; f < nf; f++) {
      const tt = 0.02 + (f / (nf - 1)) * 0.9, i = Math.round(tt * (N - 1)), r = this.radius(tt), L = S * (0.35 + 0.55 * Math.sin(Math.min(1, tt * 1.8) * PI * 0.9)) * (1 - tt * 0.6) * (0.85 + 0.3 * Math.sin(t * 6 + f * 1.7));
      _dv.set(C[i * 3] + Fb[i * 3] * r * 0.55, C[i * 3 + 1] + Fb[i * 3 + 1] * r * 0.55, C[i * 3 + 2] + Fb[i * 3 + 2] * r * 0.55);
      _dv2.set(Fb[i * 3] * 0.7 - Tg[i * 3] * 0.35, Fb[i * 3 + 1] * 0.7 - Tg[i * 3 + 1] * 0.35 + 0.5, Fb[i * 3 + 2] * 0.7 - Tg[i * 3 + 2] * 0.35).normalize();
      _dq.setFromUnitVectors(_dup, _dv2); const w = r * 0.3 + 0.02 * S; _dm.compose(_dv, _dq, _dv4.set(w, L, w)); this.fins.setMatrixAt(f, _dm);
    }
    this.fins.instanceMatrix.needsUpdate = true;
    // dört bacak: kalça → diz → ayak, havada kürek çeker gibi; ayakta üç altın pençe
    let ci = 0;
    [[0.17, -1], [0.17, 1], [0.5, -1], [0.5, 1]].forEach(([tt, sx], li) => {
      const i = Math.round(tt * (N - 1)), r = this.radius(tt), sw = Math.sin(t * 3.2 + li * 1.7);
      const ix = i * 3, fn = [Fn[ix], Fn[ix + 1], Fn[ix + 2]], fb = [Fb[ix], Fb[ix + 1], Fb[ix + 2]], tg = [Tg[ix], Tg[ix + 1], Tg[ix + 2]];
      const hip = _dv.set(C[ix] + fn[0] * r * sx * 0.78 - fb[0] * r * 0.25, C[ix + 1] + fn[1] * r * sx * 0.78 - fb[1] * r * 0.25, C[ix + 2] + fn[2] * r * sx * 0.78 - fb[2] * r * 0.25);
      const knee = _dv2.set(hip.x + (-fb[0] * 0.24 + fn[0] * sx * 0.16 + tg[0] * (0.1 + sw * 0.12)) * S, hip.y + (-fb[1] * 0.24 + fn[1] * sx * 0.16 + tg[1] * (0.1 + sw * 0.12)) * S, hip.z + (-fb[2] * 0.24 + fn[2] * sx * 0.16 + tg[2] * (0.1 + sw * 0.12)) * S);
      const foot = _dv3.set(knee.x + (-fb[0] * 0.24 - tg[0] * (0.12 - sw * 0.14)) * S, knee.y + (-fb[1] * 0.24 - tg[1] * (0.12 - sw * 0.14)) * S, knee.z + (-fb[2] * 0.24 - tg[2] * (0.12 - sw * 0.14)) * S);
      const seg = (mesh, a, b, rS) => { _dv4.subVectors(b, a); const L = _dv4.length() || 1e-3; _dq.setFromUnitVectors(_dup, _dv4.divideScalar(L)); _dm.compose(a, _dq, _ds.set(rS, L, rS)); mesh.setMatrixAt(li, _dm); };
      seg(this.legA, hip, knee, S); seg(this.legB, knee, foot, S);
      for (let c = 0; c < 3; c++) {
        _dv4.set(tg[0] * 0.9 - fb[0] * 0.5 + fn[0] * (c - 1) * 0.55, tg[1] * 0.9 - fb[1] * 0.5 + fn[1] * (c - 1) * 0.55, tg[2] * 0.9 - fb[2] * 0.5 + fn[2] * (c - 1) * 0.55).normalize();
        _dq.setFromUnitVectors(_dup, _dv4); _dm.compose(foot, _dq, _ds.setScalar(S)); this.claws.setMatrixAt(ci++, _dm);
      }
    });
    this.legA.instanceMatrix.needsUpdate = true; this.legB.instanceMatrix.needsUpdate = true; this.claws.instanceMatrix.needsUpdate = true;
  },
  // kalın göğüs, ince boyun, uzun incelen kuyruk
  radius(tt) { return (0.13 + 0.25 * smoothstep(-0.02, 0.2, tt) * (1 - Math.pow(tt, 1.2)) - 0.11 * tt) * this.S + 0.014 * this.S; },
  updateWhiskers(t) {
    const P = this.whiskP, n = this.whiskN;
    for (let s2 = 0; s2 < 2; s2++) {
      const sx = s2 ? 1 : -1, o = s2 * (n + 1) * 6;
      for (let i = 0; i <= n; i++) {
        const e = i / n, wv = Math.sin(t * 3.6 - e * 5.5 + s2) * 0.18 * e, wd = 0.035 * (1 - e) + 0.006;
        const x = sx * (0.2 + e * 0.75) + wv * 0.5, y = 0.05 - e * 0.55 + Math.sin(t * 2.7 - e * 4 + s2 * 0.7) * 0.12 * e, z = 1.25 - e * 2.3, k = o + i * 6;
        P[k] = x; P[k + 1] = y + wd; P[k + 2] = z; P[k + 3] = x; P[k + 4] = y - wd; P[k + 5] = z;
      }
    }
    this.whiskM.geometry.attributes.position.needsUpdate = true;
  },
  // alev püskürtme: ağızdan hedefe iki katmanlı koni + alev, kıvılcım ve duman; yere düştüğü yerde yanık
  updateFire(dtR, t, fireOn) {
    const F = this.F, P = this.pal, HS = this.S * DR_HEAD, life = Perf.Q.life ? 1 : 0.5;
    const mouth = this.mouthP.set(0, -0.12, 1.32).multiplyScalar(HS).applyQuaternion(this.head.quaternion).add(this.headP);
    const ext = fireOn ? smoothstep(0, 0.14, F.t) : 0, fadeK = fireOn ? 1 - smoothstep(F.kind === 'path' ? 1.05 : 0.9, F.kind === 'path' ? 1.35 : 1.2, F.t) : 0;
    this.fireK = damp(this.fireK, fireOn ? fadeK : 0, fireOn ? 14 : 4, dtR);
    const on = fireOn && this.fade > 0.5 && fadeK > 0.01;
    this.jetIn.visible = this.jetOut.visible = on;
    if (on) {
      _dv.subVectors(this.fireT, mouth); let len = _dv.length() || 1; const dir = _dv.divideScalar(len);
      // alev bir çatıya, duvara ya da ağaca çarparsa orada durur (ve yola ulaşmaz)
      F.blocked = false;
      for (let k = 1; k <= 12 && !F.blocked; k++) { const e = (k / 12) * len, x = mouth.x + dir.x * e, y = mouth.y + dir.y * e, z = mouth.z + dir.z * e;
        for (const o of this.obs) if (y < o.top && y > o.bot - 0.05 && Math.hypot(o.x - x, o.z - z) < o.r * 0.92) { F.blocked = true; len = Math.max(0.3, ((k - 1) / 12) * len); break; } }
      _dq.setFromUnitVectors(_dup, dir);
      const L = len * ext * (F.kind === 'path' ? 1.04 : 1), fl = 1 + Math.sin(t * 31) * 0.04 + Math.sin(t * 17) * 0.05;
      this.jetOut.position.copy(mouth); this.jetOut.quaternion.copy(_dq); this.jetOut.scale.set(0.9 * this.S * fl, L, 0.9 * this.S * fl);
      this.jetIn.position.copy(mouth); this.jetIn.quaternion.copy(_dq); this.jetIn.scale.set(0.48 * this.S * fl, L * 0.94, 0.48 * this.S * fl);
      this.jetIn.material.uniforms.uK.value = fadeK; this.jetOut.material.uniforms.uK.value = fadeK * 0.75;
      // alev topakları jet boyunca, kıvılcımlar
      if (dtR > 0) {
        const n = Math.round(dtR * 70 * life + Math.random());
        for (let q = 0; q < n; q++) {
          const e = Math.random() * ext, sp = 4 + Math.random() * 4, j = 0.35 + e;
          fxAdd.spawn(mouth.x + dir.x * len * e, mouth.y + dir.y * len * e, mouth.z + dir.z * len * e, dir.x * sp + (Math.random() - 0.5) * j, dir.y * sp + (Math.random() - 0.5) * j + 0.4, dir.z * sp + (Math.random() - 0.5) * j,
            { c: e < 0.4 ? P.f1 : P.f2, a: 0.95, s: 0.12 + e * 0.32, s1: 0.45 + e * 0.5, life: 0.2 + Math.random() * 0.18, drag: 2.2 });
        }
        if (Math.random() < dtR * 30 * life) fxAdd.spawn(mouth.x + dir.x * len * 0.6, mouth.y + dir.y * len * 0.6, mouth.z + dir.z * len * 0.6, dir.x * 3 + (Math.random() - 0.5) * 3, 2 + Math.random() * 2, dir.z * 3 + (Math.random() - 0.5) * 3, { c: P.f1, a: 1, s: 0.07, s1: 0.02, life: 0.7, drag: 1.2, g: 2.5, t: 2 });
      }
    }
    // yere düşen alev: yol üstünde yanık ve yükselen alev dilleri, söndükten sonra bir süre közlenir
    const bs = this.breathSpot;
    if (on && F.kind === 'path' && ext > 0.9 && !F.blocked) { this.burn = 1; this.spotP.copy(this.fireT); }
    else this.burn = Math.max(0, this.burn - dtR / 1.8);
    bs.visible = this.burn > 0.02 && this.fade > 0.3;
    if (on && F.kind === 'path' && ext > 0.9 && dtR > 0 && !F.blocked) { const n = Math.round(dtR * 40 * life + Math.random()); for (let q = 0; q < n; q++) { const a = Math.random() * TAU, sp = 2.2 + Math.random() * 2.2; fxAdd.spawn(this.fireT.x, 0.18, this.fireT.z, Math.cos(a) * sp, 0.5 + Math.random() * 0.8, Math.sin(a) * sp, { c: Math.random() < 0.5 ? P.f1 : P.f2, a: 0.95, s: 0.26, s1: 0.5, life: 0.28 + Math.random() * 0.15, drag: 3.2 }); } }
    if (bs.visible) {
      const k = this.burn, fl = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29) * 0.05;
      bs.position.set(this.spotP.x, 0.05, this.spotP.z); bs.scale.setScalar((1.6 + 1.6 * k) * fl * this.S); bs.material.opacity = 0.95 * Math.min(1, k * 1.4);
      if (dtR > 0 && Math.random() < dtR * (on ? 70 : 16 * k) * life) { const a = Math.random() * TAU, r = Math.random() * 0.75 * this.S; fxAdd.spawn(this.spotP.x + Math.cos(a) * r, 0.12, this.spotP.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, 1.4 + Math.random() * 1.6, (Math.random() - 0.5) * 0.6, { c: Math.random() < 0.4 ? P.f1 : P.f2, a: 0.9, s: 0.22, s1: 0.04, life: 0.45 + Math.random() * 0.3, drag: 1.4 }); }
      if (dtR > 0 && Math.random() < dtR * 8 * k * life) fxMix.spawn(this.spotP.x + (Math.random() - 0.5) * 0.6, 0.4, this.spotP.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3, { c: [0.07, 0.05, 0.06], a: 0.4, s: 0.3, s1: 1.1, life: 1.3, drag: 0.6, t: 1 });
    }
    // kuyruk ucunda sönmeyen küçük alev
    const tf = this.tailFire; tf.visible = this.fade > 0.4;
    if (tf.visible) {
      const N = this.N, i = N - 1, C = this.C, Tg = this.Tg;
      _dv.set(-Tg[i * 3], -Tg[i * 3 + 1] + 0.35, -Tg[i * 3 + 2]).normalize(); _dq.setFromUnitVectors(_dup, _dv);
      const fl = 1 + Math.sin(t * 19) * 0.08; tf.position.set(C[i * 3], C[i * 3 + 1], C[i * 3 + 2]); tf.quaternion.copy(_dq); tf.scale.set(0.16 * this.S * fl, 0.75 * this.S * fl, 0.16 * this.S * fl);
      tf.material.uniforms.uK.value = 0.85 * this.fade;
    }
  },
  updateFx(dtR, t, chasing) {
    const hp = this.headP, P = this.pal, life = Perf.Q.life ? 1 : 0.5, F = this.F, HS = this.S * DR_HEAD;
    // yele: boyun ve omuz boyunca yükselen ince alev dilleri; şahlanırken ağızda toplanan kıvılcımlar
    if (this.fade > 0.2 && dtR > 0) {
      for (let q = 0, nq = Math.round(dtR * 48 * life + Math.random()); q < nq; q++) {
        const tt = Math.random() * 0.92, i = Math.round(tt * (this.N - 1)), r = this.radius(tt), C = this.C, Fb = this.Fb;
        fxAdd.spawn(C[i * 3] + Fb[i * 3] * r * 1.05, C[i * 3 + 1] + Fb[i * 3 + 1] * r * 1.05, C[i * 3 + 2] + Fb[i * 3 + 2] * r * 1.05, (Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.3, { c: P.f2, a: 0.85, s: 0.14, s1: 0.02, life: 0.5, drag: 1.6, g: 0.4 });
      }
      if (F.st === 'charge' && Math.random() < dtR * 40 * life) {
        const m = this.mouthP, a = Math.random() * TAU, e = Math.random() * PI, r = 0.9 * this.S;
        const sx = m.x + Math.cos(a) * Math.sin(e) * r, sy = m.y + Math.cos(e) * r * 0.6, sz = m.z + Math.sin(a) * Math.sin(e) * r;
        fxAdd.spawn(sx, sy, sz, (m.x - sx) * 2.6, (m.y - sy) * 2.6, (m.z - sz) * 2.6, { c: P.f1, a: 1, s: 0.08, s1: 0.03, life: 0.38, drag: 0.2, t: 2 });
      }
      // burun deliklerinden duman ve kor
      if (F.st === 'idle' && Math.random() < dtR * 5 * life) { _dv.set((Math.random() < 0.5 ? -1 : 1) * 0.17, 0.12, 1.2).multiplyScalar(HS).applyQuaternion(this.head.quaternion).add(hp); fxMix.spawn(_dv.x, _dv.y, _dv.z, (Math.random() - 0.5) * 0.2, 0.35, (Math.random() - 0.5) * 0.2, { c: [0.14, 0.11, 0.12], a: 0.32, s: 0.06, s1: 0.32, life: 0.9, drag: 1.2, t: 1 }); }
    }
    this.glowUnder.position.set(hp.x, 0.04, hp.z); this.glowUnder.material.opacity = (0.32 + this.hot * 0.25) * this.fade;
    // gövdenin altında sıcak ışık izi: ışıktan ejderha adayı aydınlatır
    for (let q = 0; q < 4; q++) { const i = Math.round((0.14 + q * 0.17) * (this.N - 1)), C = this.C; _dq.identity(); _dm.compose(_dv.set(C[i * 3], 0.035, C[i * 3 + 2]), _dq, _ds.setScalar((3.2 - q * 0.55) * this.S)); this.glowTrail.setMatrixAt(q, _dm); }
    this.glowTrail.instanceMatrix.needsUpdate = true; this.glowTrail.material.opacity = (0.28 + this.hot * 0.15) * this.fade;
    audio.setDragon && audio.setDragon(chasing ? 0.3 + this.danger() * 0.6 : 0, this.F.st === 'blast' ? 1 : 0);
  },
  // alev adayı turuncuya boyar (applyLighting'ten sonra)
  applyLook() {
    if (!this.on || this.fireK < 0.01 || G.lv !== this.lv) return;
    const k = this.fireK, P = this.pal;
    hemi.color.lerp(_dc.setRGB(P.f2[0] / 3.4, P.f2[1] / 3.4, P.f2[2] / 3.4), k * 0.35); hemi.intensity *= 1 + k * 0.45;
  },
};
