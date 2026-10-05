/* =====================================================================
   SÜRPRİZ ANLAR — hava, ada canlıları, gök olayları
   Her ada tohumuna göre kendi havasını ve canlılarını seçer (yeniden
   denemede aynı kalır): sağanak (dinince gökkuşağı), fırtına (şimşek),
   sis (yürüdükçe dağılır). Kediler, martılar, Caretta kaplumbağaları,
   Tuz Gölü flamingoları, Buz Diyarı penguenleri adada dolaşır; Zifir
   yaklaşınca kaçar, saklanır ya da kayarak uzaklaşır.
   Canlıların gölgesi gerçek gölgedir: Zifir'i korur. Yağmur ve sis
   ışığı yumuşatır. Hepsi yalnızca kolaylaştırır: çözülmüş güneş planı
   her adada geçerli kalır. Ara sıra kuyruklu yıldız geçer (dilek:
   Zifir tazelenir); bazı zafer gecelerinde kutup ışıkları yanar.
   ===================================================================== */
const LIFE_WX = { ege: ['rain', 'storm', 'fog'], ruzgar: ['storm', 'rain'], peri: ['fog', 'rain'], tuz: ['fog', 'rain'], ikiz: ['storm', 'fog'], buz: ['fog'], ayna: ['rain', 'fog'], saat: ['storm', 'fog'] };
const LIFE_FAUNA = { ege: ['cat', 'turtle', 'gull'], ruzgar: ['gull', 'cat'], peri: ['cat', 'turtle'], tuz: ['flamingo', 'gull'], ikiz: ['cat', 'gull'], buz: ['penguin', 'gull'], ayna: ['cat', 'gull'], saat: ['cat', 'turtle'] };
const WX_INFO = { rain: ['Sağanak', 'yağmur ışığı yumuşatır'], storm: ['Fırtına', 'şimşekler çakıyor · ışık yumuşak'], fog: ['Sis', 'sis ışığı dağıtır · yürüdükçe açılır'] };
const WX_SOFT = { rain: 0.14, storm: 0.14, fog: 0.1 }; // ışık bu oranda daha az yakar
// tür sabitleri: yürüme/kaçma hızı, ürkme yarıçapı, gölge küresi (yükseklik, yarıçap), ölçek
const CRIT = {
  cat: { sp: 0.5, run: 2.1, fear: 1.3, idle: [2.5, 7], y: 0.24, r: 0.16, S: 1.45 },
  turtle: { sp: 0.12, run: 0.12, fear: 1.1, idle: [3, 8], y: 0.1, r: 0.19, S: 1.45 },
  flamingo: { sp: 0.3, run: 0.95, fear: 1.45, idle: [3, 7], y: 0.8, r: 0.19, S: 1.3 },
  penguin: { sp: 0.28, run: 1.7, fear: 1.25, idle: [2, 6], y: 0.3, r: 0.19, S: 1.35 },
  gull: { y: 0, r: 0.3, S: 1.5 },
};
const RAIN_VERT = /* glsl */`attribute vec4 aR; attribute float aE; uniform float uT, uK, uH; uniform vec2 uC, uW; uniform vec3 uBox; varying float vA;
void main(){
  float sp = 11.0 + aR.w * 5.0, top = uH * 0.62, y = top - mod(aR.z * uH + uT * sp, uH), fall = top - y;
  vec3 p = vec3(uC.x + (aR.x - 0.5) * uBox.x + uW.x * fall * 0.09, y, uC.y + (aR.y - 0.5) * uBox.z + uW.y * fall * 0.09);
  p -= normalize(vec3(uW.x * 0.09, -1.0, uW.y * 0.09)) * aE * (0.45 + aR.w * 0.4);
  float edge = smoothstep(0.5, 0.36, max(abs(aR.x - 0.5), abs(aR.y - 0.5)));
  vA = uK * (0.34 + 0.3 * aR.w) * (1.0 - aE * 0.9) * edge * smoothstep(0.0, 2.0, fall);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const RAIN_FRAG = /* glsl */`uniform vec3 uCol; varying float vA; void main(){ if (vA < 0.003) discard; gl_FragColor = vec4(uCol, vA); }`;
const W_VERT = /* glsl */`varying vec3 vW; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
// alçak sis tabakası: kayan gürültü, adanın dışında ve Zifir'in çevresinde açılır
const MIST_FRAG = /* glsl */`uniform float uT, uK, uR; uniform vec2 uC, uZ, uO; uniform vec3 uCol; varying vec3 vW; varying vec3 vL;
${DR_NOISE}
void main(){
  vec2 q = vW.xz * 0.17 + uO + vec2(uT * 0.045, uT * 0.018);
  float n = drN(q) * 0.55 + drN(q * 2.1 + 5.2) * 0.3 + drN(q * 4.3 - 2.0) * 0.15;
  float a = smoothstep(0.3, 0.78, n) * uK;
  a *= 1.0 - smoothstep(uR * 0.8, uR * 1.3, length(vW.xz - uC));
  a *= 0.2 + 0.8 * smoothstep(1.0, 2.6, length(vW.xz - uZ));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol, a);
}`;
// gökkuşağı: adanın altındaki bulut denizine düşen tam halka (uçaktan görülen dairesel gökkuşağı); birincil + soluk ikincil yay
const BOW_FRAG = /* glsl */`uniform float uK; varying vec3 vW; varying vec3 vL;
vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main(){
  float r = length(vL.xy), t = (r - 0.84) / 0.16, t2 = (r - 1.07) / 0.13; vec3 c = vec3(0.0);
  if (t > 0.0 && t < 1.0) c += hue((1.0 - t) * 0.78) * pow(sin(t * 3.14159), 0.7);
  if (t2 > 0.0 && t2 < 1.0) c += hue(t2 * 0.78) * pow(sin(t2 * 3.14159), 0.9) * 0.3;
  c += vec3(0.07) * (1.0 - smoothstep(0.62, 0.84, r));
  gl_FragColor = vec4(c * uK * 0.62, 1.0);
}`;
const TAIL_VERT = /* glsl */`attribute float aU, aS; varying float vU, vS; void main(){ vU = aU; vS = aS; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
const TAIL_FRAG = /* glsl */`uniform vec3 uC1, uC2; uniform float uK; varying float vU, vS; void main(){ float a = pow(1.0 - vU, 1.5) * (1.0 - vS * vS) * uK; gl_FragColor = vec4(mix(uC1, uC2, vU) * a, 1.0); }`;
const _lv = new THREE.Vector3(), _lv2 = new THREE.Vector3(), _lv3 = new THREE.Vector3(), _lc = new THREE.Color(), _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _ls = new THREE.Vector3(), _lpa = {}, _lup = new THREE.Vector3(0, 1, 0);
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dampA = (a, b, k, dt) => a + wrapA(b - a) * (1 - Math.exp(-k * dt));
// bulutlu gökyüzü: rengi parlaklığına doğru soldur, serinlet, karart
function overcast(col, k, dark) { const l = col.r * 0.3 + col.g * 0.55 + col.b * 0.15; _lc.setRGB(l * 0.9, l * 0.96, l * 1.1).multiplyScalar(dark); col.lerp(_lc, k); }

/* ---------- canlı modelleri (düşük poligon, köşe renkli; prop malzemesini paylaşır, yeni gölgelendirici derlenmez) ---------- */
function lifeMesh(parts) { const m = new THREE.Mesh(mergeParts(parts, false), matProp); m.receiveShadow = true; return m; }
function buildCritter(kind, rng) {
  const P = part, S = THREE, g = new THREE.Group(), o = { g };
  if (kind === 'cat') {
    const coat = rng.pick([
      { c: '#d9893a', l: '#f3dcb4', s: '#a95e26', e1: '#cfe04a', e2: '#cfe04a' }, // sarman
      { c: '#2a2630', l: '#3a3641', s: null, e1: '#f0d040', e2: '#f0d040' }, // kara kedi
      { c: '#f0ece6', l: '#ffffff', s: null, e1: '#6fb8f0', e2: '#f0b840', ear: '#e8a0a8' }, // Van kedisi: iki ayrı renk göz
      { c: '#8d8c93', l: '#dcdad6', s: '#5a5963', e1: '#9ad050', e2: '#9ad050' }, // tekir
    ]);
    const body = [P(new S.SphereGeometry(0.15, 8, 6), coat.c, { scale: [1, 0.82, 1.85], pos: [0, 0.24, -0.02] }), P(new S.SphereGeometry(0.115, 7, 5), coat.l, { scale: [1, 0.95, 0.9], pos: [0, 0.25, 0.16] })];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) body.push(P(new S.CylinderGeometry(0.034, 0.03, 0.2, 5), sz > 0 ? coat.l : coat.c, { pos: [sx * 0.075, 0.1, sz * 0.17] }));
    if (coat.s) for (const z of [-0.14, -0.04, 0.06]) body.push(P(new S.BoxGeometry(0.24, 0.025, 0.035), coat.s, { pos: [0, 0.355, z] }));
    o.body = lifeMesh(body); g.add(o.body);
    const head = [P(new S.SphereGeometry(0.112, 8, 6), coat.c, { scale: [1.12, 0.95, 1] }), P(new S.SphereGeometry(0.054, 6, 4), coat.l, { scale: [1.2, 0.8, 1], pos: [0, -0.035, 0.088] }),
      P(new S.SphereGeometry(0.019, 5, 4), coat.e1, { pos: [-0.045, 0.02, 0.098] }), P(new S.SphereGeometry(0.019, 5, 4), coat.e2, { pos: [0.045, 0.02, 0.098] }), P(new S.SphereGeometry(0.012, 4, 3), '#d07080', { pos: [0, -0.012, 0.13] })];
    for (const sx of [-1, 1]) head.push(P(new S.ConeGeometry(0.045, 0.1, 4), coat.ear || coat.c, { rot: [0, 0, -sx * 0.3], pos: [sx * 0.07, 0.105, -0.01] }));
    o.head = lifeMesh(head); o.head.position.set(0, 0.37, 0.27); g.add(o.head);
    const tail = P(new S.CylinderGeometry(0.017, 0.03, 0.36, 5), coat.c, { pos: [0, 0.18, 0] });
    o.tail = lifeMesh([tail]); o.tail.position.set(0, 0.28, -0.27); g.add(o.tail);
  } else if (kind === 'turtle') {
    const shell = rng.pick(['#5f7a3a', '#6d6a34', '#56703f']), skin = '#94a868';
    const body = [P(new S.SphereGeometry(0.2, 9, 5, 0, TAU, 0, PI / 2), shell, { scale: [1, 0.78, 1.25], pos: [0, 0.07, 0], jit: 0.01, top: '#a3a058', y0: 0.12, y1: 0.24 }), P(new S.CylinderGeometry(0.205, 0.215, 0.045, 10), '#c7ae74', { scale: [1, 1, 1.25], pos: [0, 0.068, 0] }),
      P(new S.ConeGeometry(0.03, 0.08, 4), skin, { rot: [-PI / 2, 0, 0], pos: [0, 0.05, -0.27] })];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) body.push(P(new S.SphereGeometry(0.06, 6, 4), skin, { scale: [1.5, 0.45, 0.9], rot: [0, sx * sz * 0.5, 0], pos: [sx * 0.18, 0.04, sz * 0.15] }));
    o.body = lifeMesh(body); g.add(o.body);
    o.head = lifeMesh([P(new S.SphereGeometry(0.064, 7, 5), skin, { scale: [0.95, 0.85, 1.35] }), P(new S.SphereGeometry(0.012, 4, 3), '#1a1a1a', { pos: [-0.038, 0.02, 0.05] }), P(new S.SphereGeometry(0.012, 4, 3), '#1a1a1a', { pos: [0.038, 0.02, 0.05] })]);
    o.head.position.set(0, 0.08, 0.27); g.add(o.head);
  } else if (kind === 'flamingo') {
    const c = '#f28aa2', d = '#d8607e', leg = '#e57d95';
    o.body = lifeMesh([P(new S.SphereGeometry(0.16, 8, 6), c, { scale: [0.85, 0.72, 1.45], pos: [0, 0.8, 0] }), P(new S.SphereGeometry(0.11, 7, 5), d, { scale: [0.75, 0.55, 1.15], pos: [0, 0.85, -0.14] }),
      P(new S.ConeGeometry(0.055, 0.14, 5), '#2a2028', { rot: [-PI / 2 - 0.3, 0, 0], pos: [0, 0.83, -0.31] }),
      P(new S.CylinderGeometry(0.014, 0.014, 0.72, 5), leg, { pos: [-0.035, 0.36, 0] }), P(new S.CylinderGeometry(0.014, 0.014, 0.3, 5), leg, { rot: [0.9, 0, 0], pos: [0.035, 0.6, 0.1] }),
      P(new S.SphereGeometry(0.022, 5, 4), leg, { pos: [0.035, 0.5, 0.2] }), P(new S.BoxGeometry(0.06, 0.012, 0.1), leg, { pos: [-0.035, 0.006, 0.03] })]);
    g.add(o.body);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.17, 0.07), new THREE.Vector3(0, 0.3, -0.02), new THREE.Vector3(0, 0.42, 0.04)]);
    o.neck = lifeMesh([P(new S.TubeGeometry(curve, 10, 0.022, 5, false), c, { flat: false }), P(new S.SphereGeometry(0.05, 7, 5), c, { pos: [0, 0.44, 0.06] }),
      P(new S.ConeGeometry(0.024, 0.11, 5), '#f2e6dc', { rot: [PI / 2 + 0.9, 0, 0], pos: [0, 0.41, 0.12] }), P(new S.ConeGeometry(0.014, 0.04, 5), '#1c1418', { rot: [PI / 2 + 0.9, 0, 0], pos: [0, 0.375, 0.155] })]);
    o.neck.position.set(0, 0.86, 0.17); g.add(o.neck);
  } else if (kind === 'penguin') {
    const k = '#23262e', w = '#f2f2ee', or = '#f0902a';
    o.body = lifeMesh([P(new S.SphereGeometry(0.16, 8, 6), k, { scale: [1, 1.4, 0.95], pos: [0, 0.25, 0] }), P(new S.SphereGeometry(0.13, 8, 6), w, { scale: [0.9, 1.25, 0.6], pos: [0, 0.23, 0.075] }),
      P(new S.SphereGeometry(0.11, 8, 6), k, { pos: [0, 0.5, 0.01] }), P(new S.SphereGeometry(0.04, 5, 4), w, { pos: [-0.05, 0.52, 0.075] }), P(new S.SphereGeometry(0.04, 5, 4), w, { pos: [0.05, 0.52, 0.075] }),
      P(new S.ConeGeometry(0.026, 0.09, 4), or, { rot: [PI / 2, 0, 0], pos: [0, 0.48, 0.14] }), P(new S.SphereGeometry(0.014, 4, 3), '#0c0c10', { pos: [-0.05, 0.535, 0.105] }), P(new S.SphereGeometry(0.014, 4, 3), '#0c0c10', { pos: [0.05, 0.535, 0.105] }),
      P(new S.BoxGeometry(0.03, 0.2, 0.08), k, { rot: [0, 0, 0.25], pos: [-0.165, 0.27, 0] }), P(new S.BoxGeometry(0.03, 0.2, 0.08), k, { rot: [0, 0, -0.25], pos: [0.165, 0.27, 0] }),
      P(new S.BoxGeometry(0.07, 0.02, 0.1), or, { pos: [-0.06, 0.01, 0.05] }), P(new S.BoxGeometry(0.07, 0.02, 0.1), or, { pos: [0.06, 0.01, 0.05] })]);
    g.add(o.body);
  } else if (kind === 'gull') {
    const w = '#f6f6f2';
    o.body = lifeMesh([P(new S.SphereGeometry(0.1, 8, 6), w, { scale: [0.9, 0.85, 2.1] }), P(new S.SphereGeometry(0.07, 7, 5), w, { pos: [0, 0.05, 0.2] }),
      P(new S.ConeGeometry(0.018, 0.08, 4), '#e8b820', { rot: [PI / 2, 0, 0], pos: [0, 0.04, 0.3] }), P(new S.ConeGeometry(0.07, 0.17, 4), '#c8ccd2', { scale: [1, 1, 0.3], rot: [-PI / 2, 0, 0], pos: [0, 0.01, -0.27] })]);
    g.add(o.body);
    const wing = () => lifeMesh([P(new S.BoxGeometry(0.36, 0.014, 0.17), '#b4bcc6', { pos: [0.18, 0, 0] }), P(new S.BoxGeometry(0.2, 0.012, 0.12), '#26262c', { pos: [0.45, 0, -0.025] })]);
    o.wl = wing(); o.wl.position.set(0.06, 0.03, 0.02); o.wr = wing(); o.wr.scale.x = -1; o.wr.position.set(-0.06, 0.03, 0.02); g.add(o.wl, o.wr);
    g.rotation.order = 'YXZ';
  }
  return o;
}

const Life = {
  built: false, lv: null, plan: null, crit: [], wk: 0, rb: 0, wet: 0, flashK: 0, boltT: 9, nextBolt: 3, cleared: false, cometDone: false, fogSet: false, windSet: false,
  build() {
    if (this.built) return; this.built = true;
    // yağmur: GPU'da düşen çizgiler (tek çizim)
    const N = 1600, pos = new Float32Array(N * 6), r = new Float32Array(N * 8), e = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const a = [Math.random(), Math.random(), Math.random(), Math.random()]; r.set(a, i * 8); r.set(a, i * 8 + 4); e[i * 2 + 1] = 1; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('aR', new THREE.BufferAttribute(r, 4)); rg.setAttribute('aE', new THREE.BufferAttribute(e, 1));
    this.rainU = { uT: { value: 0 }, uK: { value: 0 }, uH: { value: 26 }, uC: { value: new THREE.Vector2() }, uW: { value: new THREE.Vector2(0.6, 0.15) }, uBox: { value: new THREE.Vector3(30, 26, 34) }, uCol: { value: new THREE.Color() } };
    this.rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, uniforms: this.rainU, transparent: true, depthWrite: false }));
    this.rain.frustumCulled = false; this.rain.renderOrder = 7; this.rainN = N; scene.add(this.rain);
    // sis tabakaları
    this.mist = [0.28, 0.95].map((y, i) => {
      const u = { uT: U.uTime, uK: { value: 0 }, uR: { value: 10 }, uC: { value: new THREE.Vector2() }, uZ: { value: new THREE.Vector2() }, uO: { value: new THREE.Vector2(i * 7.3, i * 3.1) }, uCol: { value: new THREE.Color() } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.ShaderMaterial({ vertexShader: W_VERT, fragmentShader: MIST_FRAG, uniforms: u, transparent: true, depthWrite: false }));
      m.position.y = y; m.renderOrder = 5 + i; m.frustumCulled = false; scene.add(m); return { m, u };
    });
    // gökkuşağı
    this.bowU = { uK: { value: 0 } };
    this.bow = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.22, 128, 1), new THREE.ShaderMaterial({ vertexShader: W_VERT, fragmentShader: BOW_FRAG, uniforms: this.bowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.bow.rotation.x = -PI / 2; this.bow.frustumCulled = false; scene.add(this.bow);
    // şimşek: kameraya dönük şerit (gövde + bir dal) ve ışıma
    const BV = 44, bg = new THREE.BufferGeometry(), bi = [];
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BV * 3), 3).setUsage(THREE.DynamicDrawUsage));
    for (const [s0, n] of [[0, 15], [15, 7]]) for (let i = 0; i < n - 1; i++) { const a = (s0 + i) * 2; bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    bg.setIndex(bi);
    this.bolt = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.8, 3.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.bolt.frustumCulled = false; this.bolt.renderOrder = 8; scene.add(this.bolt);
    this.boltGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.7, 0.75, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    this.boltGlow.scale.setScalar(16); scene.add(this.boltGlow);
    // kuyruklu yıldız: baş (iki parıltı) + iyon ve toz kuyrukları
    // gökyüzünde, her şeyin ardında değil önünde çizilir (yolu ekranın üst bandında, adanın üstünden geçmez)
    this.comet = new THREE.Group(); scene.add(this.comet);
    this.cHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(3.0, 3.5, 4.4), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
    this.cCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(4, 4, 4.2), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
    this.cHead.renderOrder = this.cCore.renderOrder = 9;
    this.comet.add(this.cHead, this.cCore);
    const tail = (c1, c2) => {
      const M = 14, g = new THREE.BufferGeometry(), au = new Float32Array((M + 1) * 2), as = new Float32Array((M + 1) * 2), idx = [];
      for (let i = 0; i <= M; i++) { au[i * 2] = au[i * 2 + 1] = i / M; as[i * 2] = -1; as[i * 2 + 1] = 1; if (i < M) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((M + 1) * 6), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aU', new THREE.BufferAttribute(au, 1)); g.setAttribute('aS', new THREE.BufferAttribute(as, 1)); g.setIndex(idx);
      const u = { uC1: { value: new THREE.Color(...c1) }, uC2: { value: new THREE.Color(...c2) }, uK: { value: 0 } };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: TAIL_VERT, fragmentShader: TAIL_FRAG, uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.renderOrder = 8; this.comet.add(m); return { m, u, M };
    };
    this.ion = tail([2.0, 3.6, 5.2], [0.3, 1.2, 2.6]); this.dust = tail([3.4, 2.9, 2.0], [1.2, 0.7, 0.3]);
    this.comet.visible = false;
    // canlıların gölgeleri: tek örneklenmiş çizim
    const sh = radialTex([[0, 'rgba(22,18,44,0.6)'], [0.55, 'rgba(22,18,44,0.42)'], [1, 'rgba(22,18,44,0)']], 64);
    this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 24);
    this.shadows.frustumCulled = false; this.shadows.renderOrder = 2; this.shadows.count = 0; scene.add(this.shadows);
    this.hideAll();
  },
  // adanın kaderi: tohumdan, her denemede aynı
  planFor(lv, opts) {
    const sp = lv.spec, key = lv.chap.key, rng = new RNG(((sp.seed | 0) ^ 0x6c1fe55) >>> 0), story = sp.kind === 'story';
    const idx = story ? sp.g : sp.kind === 'endless' ? sp.n + 3 : 12, boss = !!sp.boss;
    const r = [0, 1, 2, 3, 4, 5].map(() => rng.next());
    const P = { wx: null, clearAt: 0.5 + r[5] * 0.18, rainbow: false, fauna: [], comet: null, aurora: false };
    const wxOk = !opts.title && !boss && idx >= 3 && !(story && sp.i === 0);
    if (wxOk && r[0] < 0.38) { const L = LIFE_WX[key] || LIFE_WX.ege; P.wx = L[Math.floor(r[1] * L.length) % L.length]; }
    // ilk karşılaşmalar rastlantıya bırakılmaz
    if (story && !opts.title) { if (sp.g === 4) P.wx = 'rain'; else if (sp.g === 11) P.wx = 'storm'; else if (sp.g === 18) P.wx = 'fog'; else if (sp.g === 6) P.wx = null; }
    P.rainbow = P.wx === 'rain' || P.wx === 'storm';
    if (!boss && idx >= 1 && (r[2] < 0.72 || (story && sp.g <= 2))) {
      const kinds = (LIFE_FAUNA[key] || LIFE_FAUNA.ege).slice(), k1 = kinds[Math.floor(r[3] * kinds.length) % kinds.length];
      const pickN = (k) => (k === 'gull' ? rng.int(2, 3) : k === 'flamingo' || k === 'penguin' ? rng.int(2, 3) : rng.int(1, 2));
      P.fauna.push([k1, pickN(k1)]);
      const rest = kinds.filter((k) => k !== k1);
      if (rest.length && rng.chance(0.55)) { const k2 = rng.pick(rest); P.fauna.push([k2, pickN(k2)]); }
      if (story && sp.g === 1) P.fauna = [['cat', 1]];
    }
    if (!opts.title && !boss && !P.wx && idx >= 5 && (r[4] < 0.13 || (story && sp.g === 6))) P.comet = { at: 0.25 + rng.next() * 0.25 };
    P.aurora = !boss && key !== 'buz' && rng.chance(0.3);
    return P;
  },
  setup(lv, opts = {}) {
    this.build();
    this.lv = lv; this.plan = this.planFor(lv, opts); this.title = !!opts.title;
    // yerdekiler eski adayla birlikte batar (adanın kökü geometrilerini atar); martılar sahneden kaldırılır
    for (const c of this.crit) if (c.kind === 'gull') { scene.remove(c.g); c.g.traverse((m) => m.geometry && m.geometry.dispose()); }
    this.crit.length = 0; this.shadows.count = 0;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of lv.chunks) for (const [x, z] of c.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    this.cx = (x0 + x1) / 2; this.cz = (z0 + z1) / 2; this.Rr = Math.max(x1 - x0, z1 - z0) / 2;
    // yerde engel: gövdesi yere değen çarpıştırıcılar (ağaç gövdesi, ev, kaya, kapı)
    this.obst = [{ x: lv.gate.x, z: lv.gate.z, r: 0.9 }];
    for (const c of lv.cols) {
      if (c.k === 0 && c.y0 < 0.6) this.obst.push({ x: c.x, z: c.z, r: Math.max(c.r0, c.r1) + 0.12 });
      else if (c.k === 1 && c.y - c.r * c.sy < 0.6) this.obst.push({ x: c.x, z: c.z, r: c.r + 0.12 });
      else if (c.k === 2 && c.y - c.hy < 0.6) this.obst.push({ x: c.x, z: c.z, r: Math.hypot(c.hx, c.hz) + 0.12 });
    }
    const rng = new RNG(((lv.spec.seed | 0) ^ 0x2f17a3b) >>> 0), cap = [2, 4, 6, 7][Perf.level] ?? 4;
    const noGround = lv.movers.some((m) => m.kind === 'orbit' || m.kind === 'pendulum');
    let n = 0;
    for (const [kind, cnt] of this.plan.fauna) {
      if (kind === 'gull') {
        const fl = { cx: this.cx + rng.range(-1.5, 1.5), cz: this.cz + rng.range(-2, 2), R: Math.max(3, this.Rr * rng.range(0.55, 0.85)), dir: rng.sign(), h: rng.range(3.8, 5.2), a: rng.range(0, TAU) };
        for (let i = 0; i < cnt && n < cap; i++, n++) this.addGull(fl, i, rng);
        continue;
      }
      if (noGround) continue;
      const home = rng.pick(lv.chunks);
      for (let i = 0; i < cnt && n < cap; i++) { if (this.addGround(kind, home, rng)) n++; }
    }
    this.wk = this.plan.wx ? 1 : 0; this.rb = 0; this.wet = this.plan.wx && this.plan.wx !== 'fog' ? 0.6 : 0; this.cleared = false; this.cometDone = false; this.cometT = -1; this.bannered = false; this.aurPlayed = false; this.rbPlayed = false;
    this.nextBolt = 1.6; this.boltT = 9; this.flashK = 0; this.tipT = 0;
    if (this.fogSet) { U.uFogNear.value = 70; U.uFogFar.value = 340; this.fogSet = false; }
    if (this.windSet) { U.uWind.value = 1; this.windSet = false; }
  },
  addGround(kind, home, rng) {
    const K = CRIT[kind];
    for (let k = 0; k < 40; k++) {
      const a = rng.range(0, TAU), rr = Math.sqrt(rng.next()), x = home.cx + Math.cos(a) * home.hx * rr, z = home.cz + Math.sin(a) * home.hz * rr;
      if (!this.spotOk(home, x, z, 1.05)) continue;
      if (this.crit.some((c) => Math.hypot(c.x - x, c.z - z) < 0.9)) continue;
      const o = buildCritter(kind, rng), c = Object.assign(o, { kind, K, x, z, yaw: rng.range(-PI, PI), home, mode: 'idle', t: rng.range(0.5, 3), tx: x, tz: z, pop: 0, delay: 0.2 + this.crit.length * 0.18, cool: 0, ph: rng.range(0, 9), seed: rng.range(0, 9), hide: 0, sit: 0, lie: 0, hop: 0, dip: 0, look: 0, sph: { x, y: K.y * K.S, z, r: K.r * K.S } });
      c.g.position.set(x, 0, z); c.g.scale.setScalar(0.001); c.g.rotation.y = c.yaw;
      G.view.root.add(c.g); this.crit.push(c); return true;
    }
    return false;
  },
  addGull(fl, i, rng) {
    const o = buildCritter('gull', rng), K = CRIT.gull;
    const c = Object.assign(o, { kind: 'gull', K, fl, lead: i === 0, off: i * 0.32 + rng.range(-0.05, 0.05), dh: rng.range(-0.4, 0.4) + i * 0.15, x: 0, y: 0, z: 0, pop: 0, delay: 0.5 + i * 0.25, flap: rng.next() < 0.5, ft: rng.range(0.5, 2), seed: rng.range(0, 9), callT: rng.range(3, 9) + i * 4, sph: { x: 0, y: 0, z: 0, r: K.r * K.S } });
    c.g.scale.setScalar(0.001); scene.add(c.g); this.crit.push(c);
  },
  // canlı burada durabilir mi: adanın içinde, yoldan ve yerdeki engellerden uzak
  spotOk(home, x, z, pathGap) {
    if (!insideChunk(home, x, z, 0.65)) return false;
    if (distToPath(this.lv.path, x, z) < pathGap) return false;
    for (const b of this.obst) if (Math.hypot(b.x - x, b.z - z) < b.r + 0.18) return false;
    return true;
  },
  // yeni hedef: yakında, yola ve engellere değmeyen düz bir yürüyüş; kaçarken Zifir'den uzaklaşan
  pickTarget(c, maxD, from = null) {
    for (let k = 0; k < 16; k++) {
      const a = from ? Math.atan2(c.z - from.z, c.x - from.x) + (Math.random() - 0.5) * 2.2 : Math.random() * TAU, d = 0.7 + Math.random() * (maxD - 0.7);
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (!this.spotOk(c.home, x, z, 1.0)) continue;
      if (from && Math.hypot(x - from.x, z - from.z) < Math.hypot(c.x - from.x, c.z - from.z) + 0.8) continue;
      let ok = true;
      for (let s = 1; s < 6 && ok; s++) { const f = s / 6, px = lerp(c.x, x, f), pz = lerp(c.z, z, f); if (!this.spotOk(c.home, px, pz, 0.78)) ok = false; }
      if (!ok) continue;
      c.tx = x; c.tz = z; return true;
    }
    return false;
  },
  startle(c, Z) {
    c.cool = 5 + Math.random() * 2;
    if (c.kind === 'turtle') { c.mode = 'hide'; c.t = 2.6 + Math.random() * 1.5; return; }
    const ok = this.pickTarget(c, 3.4, Z);
    if (c.kind === 'cat') { c.hop = 1; c.sit = 0; if (Math.random() < 0.6) audio.meow(0.9); }
    else if (c.kind === 'penguin') { audio.honk(0); if (ok) { c.mode = 'slide'; return; } }
    else if (c.kind === 'flamingo') audio.honk(1);
    c.mode = ok ? 'run' : 'idle'; c.t = 1;
  },
  hideAll() {
    if (!this.built) return;
    this.rain.visible = false; for (const m of this.mist) m.m.visible = false; this.bow.visible = false; this.bolt.visible = false; this.boltGlow.visible = false; this.comet.visible = false; this.shadows.visible = false;
    for (const c of this.crit) if (c.kind === 'gull') c.g.visible = false;
    if (this.fogSet) { U.uFogNear.value = 70; U.uFogFar.value = 340; this.fogSet = false; }
    if (this.windSet) { U.uWind.value = 1; this.windSet = false; }
    audio.setRain && audio.setRain(0, 0);
  },
  // Zifir'in güneşe bakan ışını bir canlının gövdesine çarpıyor mu
  occ(x, y, z, L) {
    if (!this.crit.length || G.lv !== this.lv) return false;
    for (const c of this.crit) {
      if (c.pop < 0.9) continue; const s = c.sph;
      const vx = s.x - x, vy = s.y - y, vz = s.z - z, tc = vx * L.x + vy * L.y + vz * L.z; if (tc <= 0) continue;
      if (vx * vx + vy * vy + vz * vz - tc * tc < s.r * s.r) return true;
    }
    return false;
  },
  burnK() { const P = this.plan; if (!P || !P.wx || G.lv !== this.lv) return 1; return 1 - WX_SOFT[P.wx] * this.wk; },
  fwd(out) { return out.set(Cam.base.target.x - camera.position.x, 0, Cam.base.target.z - camera.position.z).normalize(); },
  update(dt, dtR) {
    if (!this.lv || !this.built) return;
    const st = G.state, lv = this.lv, P = this.plan;
    if (st === 'map' || st === 'theater' || st === 'film' || st === 'ending' || G.lv !== lv) { this.hideAll(); return; }
    const t = U.uTime.value, prog = lv.length ? G.s / lv.length : 0, active = st === 'play' || st === 'fail';
    if (st === 'rewind' || st === 'ready' || st === 'intro' || st === 'title') { this.cleared = false; this.cometDone = false; }
    // --- hava ---
    let tk = 0;
    if (P.wx && st !== 'title') {
      if (P.wx === 'fog') tk = st === 'complete' ? 0.2 : 1 - 0.62 * smoothstep(0.3, 0.95, active ? prog : 0);
      else { if (active && prog > P.clearAt && !this.cleared) { this.cleared = true; this.rbT = 0; } tk = this.cleared || st === 'complete' ? 0 : 1; }
    }
    this.wk = damp(this.wk, tk, tk > this.wk ? 0.9 : 0.42, dtR); if (this.wk < 0.002 && tk === 0) this.wk = 0;
    const w = this.wk, rainy = P.wx === 'rain' || P.wx === 'storm', storm = P.wx === 'storm';
    if (P.wx && !this.bannered && (st === 'intro' || st === 'ready') && G.stateT > 1.1) { this.bannered = true; banner(WX_INFO[P.wx][0], WX_INFO[P.wx][1]); }
    // yağmur + sıçrayan damlalar + ıslak zemin
    const rk = rainy ? w * (storm ? 1.25 : 1) : 0;
    this.rain.visible = rk > 0.01;
    if (this.rain.visible) {
      const u = this.rainU; u.uT.value += dtR; u.uK.value = rk; u.uC.value.set(this.cx, this.cz);
      u.uW.value.set(storm ? 1.6 : 0.55, storm ? 0.5 : 0.15);
      u.uCol.value.copy(skyU.uHor.value).multiplyScalar(1.15).addScalar(0.12);
      this.rain.geometry.setDrawRange(0, Math.round(this.rainN * ([0.32, 0.55, 0.8, 1][Perf.level] ?? 0.6) * Math.min(1, rk * 1.4)) * 2);
      const life = Perf.Q.life ? 1 : 0.4;
      if (dtR > 0 && Math.random() < dtR * 40 * rk * life) for (let q = 0; q < 2; q++) {
        const ch = lv.chunks[(Math.random() * lv.chunks.length) | 0], x = ch.cx + (Math.random() - 0.5) * ch.hx * 1.9, z = ch.cz + (Math.random() - 0.5) * ch.hz * 1.9;
        if (insideChunk(ch, x, z, 0.1)) fxMix.spawn(x, 0.04, z, 0, 0.35, 0, { c: [0.85, 0.9, 1.0], a: 0.5, s: 0.03, s1: 0.14, life: 0.24, drag: 5, t: 1 });
      }
    }
    this.wet = damp(this.wet, rainy ? w : 0, rainy && w > this.wet ? 0.5 : 0.1, dtR);
    if (G.view && G.view.topMat) { G.view.topMat.roughness = lerp(0.95, 0.5, this.wet); G.view.topMat.color.setScalar(1 - 0.2 * this.wet); }
    audio.setRain && audio.setRain(rainy ? w : 0, storm ? 1 : 0);
    const wind = storm ? 1 + 1.6 * w : rainy ? 1 + 0.4 * w : 1;
    if (wind !== 1 || this.windSet) { U.uWind.value = wind; this.windSet = wind !== 1; }
    // sis tabakaları
    const fk = P.wx === 'fog' ? w : 0;
    for (const [i, m] of this.mist.entries()) {
      m.m.visible = fk > 0.01 && (i === 0 || Perf.level > 0); if (!m.m.visible) continue; // düşük kalitede tek katman
      m.u.uK.value = fk * (i ? 0.26 : 0.4); m.u.uR.value = this.Rr + 1; m.u.uC.value.set(this.cx, this.cz); m.u.uZ.value.set(zifir.g.position.x, zifir.g.position.z);
      m.u.uCol.value.copy(skyU.uHor.value).lerp(_lc.setRGB(1, 1, 1), 0.35); m.m.position.set(this.cx, m.m.position.y, this.cz); m.m.scale.set(this.Rr * 2 + 10, 1, this.Rr * 2 + 10);
    }
    // gökkuşağı: yağmur dinince bulut denizinde, güneşin karşısına kayık bir halka
    this.rb = damp(this.rb, P.rainbow && this.cleared && st !== 'title' ? 1 : 0, 0.55, dtR);
    if (this.cleared && P.rainbow && !this.rbPlayed && this.rb > 0.25) { this.rbPlayed = true; audio.rainbow && audio.rainbow(); }
    this.bow.visible = this.rb * (1 - G.night) > 0.01;
    if (this.bow.visible) {
      const lh = Math.hypot(L1.x, L1.z) || 1, off = 4 + 3 * (1 - Math.max(0, L1.y)); this.bow.position.set(this.cx - (L1.x / lh) * off, -15.4, this.cz - (L1.z / lh) * off);
      this.bow.scale.setScalar(this.Rr + 8); this.bowU.uK.value = this.rb * (1 - G.night) * (NightAct.on ? 0.45 : 1); // gecede soluk ay gökkuşağı
    }
    // şimşek
    if (storm && w > 0.5 && dt > 0) { this.nextBolt -= dt; if (this.nextBolt <= 0) { this.nextBolt = 4 + Math.random() * 5; this.strike(); } }
    if (this.boltT < 1) {
      this.boltT += dtR; const b = this.boltT, k = b < 0.07 ? 1 : b < 0.11 ? 0.15 : b < 0.2 ? 0.9 : Math.max(0, 1 - (b - 0.2) / 0.3);
      this.bolt.visible = this.boltGlow.visible = k > 0.01; this.bolt.material.opacity = k; this.boltGlow.material.opacity = k * 0.55; this.flashK = k * this.boltNear;
    } else { this.bolt.visible = this.boltGlow.visible = false; this.flashK = 0; }
    // kuyruklu yıldız
    if (P.comet && st === 'play' && !this.cometDone && prog >= P.comet.at) this.startComet();
    this.updateComet(dtR);
    // canlılar
    this.updateCritters(dt, dtR, t);
    if (!this.tipT && this.crit.length && st === 'play' && G.stateT > 7) { this.tipT = 1; tip('t-life', 'Adada <em>canlılar</em> dolaşıyor. Kuşların, kedilerin gölgesi de Zifir’i korur!', 4.2); }
  },
  strike() {
    const fw = this.fwd(_lv), a = Math.atan2(fw.z, fw.x) + (Math.random() - 0.5) * 1.7, d = this.Rr + 7 + Math.random() * 9;
    let x = this.cx + Math.cos(a) * d, z = this.cz + Math.sin(a) * d, y = 24;
    const main = [], br = [];
    for (let i = 0; i < 15; i++) { main.push([x, y, z]); y -= 2.25; x += (Math.random() - 0.5) * 1.7; z += (Math.random() - 0.5) * 1.7; }
    const bi = 4 + ((Math.random() * 4) | 0), sx = (Math.random() - 0.5) * 2.4, sz = (Math.random() - 0.5) * 2.4;
    [x, y, z] = main[bi]; for (let i = 0; i < 7; i++) { br.push([x, y, z]); y -= 1.6; x += sx * 0.5 + (Math.random() - 0.5) * 1.1; z += sz * 0.5 + (Math.random() - 0.5) * 1.1; }
    const P = this.bolt.geometry.attributes.position, cam = camera.position;
    let o = 0;
    const strip = (pts, w0, w1) => {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], pr = pts[Math.max(0, i - 1)], w = lerp(w0, w1, i / (pts.length - 1));
        _lv.set(q[0] - pr[0], q[1] - pr[1], q[2] - pr[2]).normalize(); _lv2.set(cam.x - p[0], cam.y - p[1], cam.z - p[2]).normalize(); _lv3.crossVectors(_lv, _lv2).normalize().multiplyScalar(w);
        P.setXYZ(o++, p[0] - _lv3.x, p[1] - _lv3.y, p[2] - _lv3.z); P.setXYZ(o++, p[0] + _lv3.x, p[1] + _lv3.y, p[2] + _lv3.z);
      }
    };
    strip(main, 0.34, 0.12); strip(br, 0.16, 0.04); P.needsUpdate = true;
    const mid = main[7]; this.boltGlow.position.set(mid[0], mid[1], mid[2]);
    this.boltT = 0; this.boltNear = 0.35 + Math.random() * 0.65;
    G.flash = Math.max(G.flash, 0.08 + this.boltNear * 0.06); G.flashCol.set(0.78, 0.84, 1.0);
    audio.thunder && audio.thunder(this.boltNear);
    if (this.boltNear > 0.75) haptic(18);
  },
  startComet() {
    this.cometDone = true; this.cometT = 0; this.cDir = Math.random() < 0.5 ? -1 : 1; this.cY = 0.6 + Math.random() * 0.06;
    G.meter = Math.min(1, G.meter + 0.3); const Z = zifir.g.position;
    for (let i = 0; i < 14; i++) FX.sparkle(Z.x + (Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.7, Z.z + (Math.random() - 0.5) * 0.8, [1.6, 2.0, 3.0], 0.35);
    zifir.kick(2); haptic([10, 30, 10]); audio.comet && audio.comet();
    banner('Kuyruklu yıldız!', 'dilek tuttun · Zifir tazelendi');
  },
  updateComet(dtR) {
    if (this.cometT < 0) { this.comet.visible = false; return; }
    this.cometT += dtR; const DUR = 9, e = this.cometT / DUR;
    if (e >= 1) { this.cometT = -1; this.comet.visible = false; return; }
    const fade = smoothstep(0, 0.12, e) * (1 - smoothstep(0.82, 1, e)) * (1 - G.night * 0.3);
    this.comet.visible = true;
    const nx = lerp(-1.05, 1.05, e) * this.cDir, ny = this.cY + Math.sin(e * PI) * 0.06;
    // bulut denizinin üstünde kalacak uzaklık (deniz y = −16)
    _lv.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize(); const D = _lv.y < -0.01 ? Math.min(70, ((camera.position.y + 11) / -_lv.y) * 0.95) : 70;
    const head = Fireworks.at(nx, ny, D, _lv);
    this.cHead.position.copy(head); this.cHead.scale.setScalar(10); this.cHead.material.opacity = fade * 0.8;
    this.cCore.position.copy(head); this.cCore.scale.setScalar(3.6); this.cCore.material.opacity = fade;
    // kuyruk: geldiği yöne doğru uzanır, biraz da güneşin tersine eğilir
    _lv2.copy(orb.g.position).project(camera); let sx = nx - _lv2.x, sy = ny - _lv2.y; const sl = Math.hypot(sx, sy) || 1;
    let tx = -this.cDir + (sx / sl) * 0.45, ty = 0.12 + (sy / sl) * 0.45; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    for (const [T, len, curve, w0, w1] of [[this.ion, 0.62, 0, 1.0, 3.6], [this.dust, 0.46, 0.12, 1.4, 5.5]]) {
      const P = T.m.geometry.attributes.position;
      for (let i = 0; i <= T.M; i++) {
        const u = i / T.M, px = nx + tx * len * u - ty * curve * u * u * this.cDir, py = ny + ty * len * u + tx * curve * u * u * this.cDir;
        Fireworks.at(px, py, D, _lv3); const qx = nx + tx * len * Math.min(1, u + 0.05), qy = ny + ty * len * Math.min(1, u + 0.05);
        Fireworks.at(qx, qy, D, _ls).sub(_lv3); if (_ls.lengthSq() < 1e-6) _ls.set(tx, ty, 0);
        _lv2.subVectors(camera.position, _lv3).normalize(); _ls.cross(_lv2).normalize().multiplyScalar(lerp(w0, w1, u) * 0.5);
        P.setXYZ(i * 2, _lv3.x - _ls.x, _lv3.y - _ls.y, _lv3.z - _ls.z); P.setXYZ(i * 2 + 1, _lv3.x + _ls.x, _lv3.y + _ls.y, _lv3.z + _ls.z);
      }
      P.needsUpdate = true; T.u.uK.value = fade * (T === this.ion ? 1.25 : 0.9);
    }
  },
  updateCritters(dt, dtR, t) {
    const lv = this.lv, st = G.state, Z = zifir.g.position, playing = st === 'play', view = G.view;
    const introK = view ? (view.introDone ? 9 : view.introT || 0) : 0;
    let si = 0; const sh = this.shadows, lights = lv.sun.twin ? [L1, L2] : [L1];
    const dim = (1 - G.ecl.amt) * (1 - G.night) * (1 - 0.25 * (this.plan.wx ? this.wk : 0));
    for (const c of this.crit) {
      const K = c.K;
      // belirme: ada yerine oturunca, sırayla
      if (c.pop < 1 && introK > 1.3 + c.delay) { c.pop = Math.min(1, c.pop + dtR / 0.45); }
      const ps = c.pop <= 0 ? 0.001 : Math.max(0.001, Ease.outBack(c.pop, 2));
      if (c.kind === 'gull') { this.stepGull(c, dt, t, ps); }
      else { this.stepGround(c, dt, t, ps, Z, playing); }
      // gölgeler (yalnızca ada üstünde, zaten gölgede olmayan yerde)
      if (c.pop > 0.3 && dim > 0.02) for (const L of lights) {
        if (L.y < 0.06 || si >= 24) continue; const s = c.sph, k = s.y / L.y, gx = s.x - L.x * k, gz = s.z - L.z * k;
        if (!insideIsland(lv, gx, gz, 0.05) || occluded(lv.cols, gx, 0.05, gz, L, -1)) continue;
        const len = Math.min(5, 1 / Math.max(L.y, 0.2)), sz = s.r * 2.15 * Math.min(1, c.pop);
        _lq.setFromAxisAngle(_lup, Math.atan2(L.x, L.z)); _lm.compose(_lv.set(gx, 0.03, gz), _lq, _ls.set(sz, 1, sz * len)); sh.setMatrixAt(si++, _lm);
      }
    }
    sh.count = si; sh.visible = si > 0; if (si) sh.instanceMatrix.needsUpdate = true;
    sh.material.opacity = dim;
  },
  stepGround(c, dt, t, ps, Z, playing) {
    const K = c.K, dz = Math.hypot(c.x - Z.x, c.z - Z.z);
    c.cool -= dt;
    if (playing && c.pop >= 1 && dz < K.fear && c.cool <= 0 && c.mode !== 'run' && c.mode !== 'slide' && c.mode !== 'hide') this.startle(c, Z);
    let moving = false;
    if (dt > 0) switch (c.mode) {
      case 'idle':
        c.t -= dt;
        if (c.t <= 0) { if (this.pickTarget(c, c.kind === 'turtle' ? 1.6 : 2.8)) { c.mode = 'walk'; c.sit = 0; } else c.t = 1 + Math.random(); }
        break;
      case 'walk': case 'run': case 'slide': {
        const sp = c.mode === 'slide' ? 1.9 : c.mode === 'run' ? K.run : K.sp, dx = c.tx - c.x, dzz = c.tz - c.z, d = Math.hypot(dx, dzz);
        const want = Math.atan2(dx, dzz); c.yaw = dampA(c.yaw, want, c.mode === 'walk' ? 5 : 12, dt);
        const ali = Math.max(0, Math.cos(wrapA(want - c.yaw))), stp = Math.min(d, sp * ali * dt);
        if (d > 1e-4) { c.x += (dx / d) * stp; c.z += (dzz / d) * stp; }
        c.ph += stp * (c.kind === 'turtle' ? 22 : c.kind === 'penguin' ? 16 : 13); moving = stp > 0;
        if (d < 0.03) { c.mode = 'idle'; c.t = K.idle[0] + Math.random() * (K.idle[1] - K.idle[0]); if (c.kind === 'cat' && Math.random() < 0.7) c.sit = 1; if (c.kind === 'flamingo') c.dipT = 1.2 + Math.random() * 2; }
        break;
      }
      case 'hide': c.t -= dt; if (c.t <= 0 && Math.hypot(c.x - Z.x, c.z - Z.z) > K.fear) { c.mode = 'idle'; c.t = 1.5; } break;
    }
    // poz ve canlılık
    const g = c.g; let y = 0;
    c.hop = Math.max(0, c.hop - dt * 2.6); if (c.hop > 0) y += Math.sin((1 - c.hop) * PI) * 0.22;
    if (moving && c.kind !== 'turtle' && c.mode !== 'slide') y += Math.abs(Math.sin(c.ph)) * (c.mode === 'run' ? 0.04 : 0.018);
    c.lie = damp(c.lie, c.mode === 'slide' ? 1 : 0, 8, dt);
    g.position.set(c.x, y - c.lie * 0.1, c.z); g.scale.setScalar(K.S * ps);
    g.rotation.set(c.lie * 1.35, c.yaw, c.kind === 'penguin' && moving && c.mode !== 'slide' ? Math.sin(c.ph * 0.5) * 0.2 : 0, 'YXZ');
    // başı Zifir'e çevir (yakındaysa)
    const near = dz < 3.2 && c.mode !== 'run' && c.mode !== 'slide';
    c.look = dampA(c.look, near ? clamp(wrapA(Math.atan2(Z.x - c.x, Z.z - c.z) - c.yaw), -0.9, 0.9) : 0, 4, dt);
    if (c.kind === 'cat') {
      c.sitK = damp(c.sitK || 0, c.sit && c.mode === 'idle' ? 1 : 0, 4, dt);
      c.body.rotation.x = -c.sitK * 0.38; c.body.position.set(0, c.sitK * 0.03, -c.sitK * 0.04);
      c.head.rotation.set(Math.sin(t * 0.7 + c.seed) * 0.08, c.look, 0); c.head.position.set(0, 0.37 + c.sitK * 0.1, 0.27 - c.sitK * 0.03);
      c.tail.rotation.set(-0.95 + c.sitK * 0.75 + (c.mode === 'run' ? 0.5 : 0), 0, Math.sin(t * (moving ? 5 : 1.8) + c.seed) * (c.sitK > 0.5 ? 0.6 : 0.35));
    } else if (c.kind === 'turtle') {
      c.hide = damp(c.hide, c.mode === 'hide' ? 1 : 0, 7, dt);
      c.head.position.set(0, 0.08 - c.hide * 0.02, 0.27 - c.hide * 0.12 + (moving ? Math.sin(c.ph * 0.5) * 0.01 : 0)); c.head.scale.setScalar(1 - c.hide * 0.55); c.head.rotation.y = c.look * (1 - c.hide);
    } else if (c.kind === 'flamingo') {
      if (c.mode === 'idle' && c.dipT !== undefined) { c.dipT -= dt; if (c.dipT < -2.2) c.dipT = 2 + Math.random() * 3; }
      c.dip = damp(c.dip, c.mode === 'idle' && c.dipT < 0 ? 1 : 0, 3, dt);
      c.neck.rotation.set(c.dip * 2.3 + Math.sin(t * 1.3 + c.seed) * 0.05, c.look * (1 - c.dip), 0);
    }
    c.sph.x = c.x; c.sph.z = c.z; c.sph.y = (K.y * (1 - c.lie * 0.6) + y) * K.S;
  },
  stepGull(c, dt, t, ps) {
    const f = c.fl, g = c.g;
    if (c.lead) f.a += f.dir * (2.3 / f.R) * dt; // sürünün ilk kuşu açıyı ilerletir
    const a = f.a - f.dir * c.off, x = f.cx + Math.cos(a) * f.R, z = f.cz + Math.sin(a) * f.R, y = f.h + c.dh + Math.sin(t * 0.7 + c.seed) * 0.25;
    c.x = x; c.y = y; c.z = z; g.visible = true;
    const tx = -Math.sin(a) * f.dir, tz = Math.cos(a) * f.dir;
    g.position.set(x, y, z); g.rotation.set(Math.sin(t * 1.1 + c.seed) * 0.05, Math.atan2(tx, tz), -f.dir * 0.32); g.scale.setScalar(c.K.S * ps);
    c.ft -= dt; if (c.ft <= 0) { c.flap = !c.flap; c.ft = c.flap ? 0.9 + Math.random() * 0.8 : 1.4 + Math.random() * 1.8; }
    const ang = c.flap ? Math.sin(t * 12 + c.seed) * 0.6 : 0.1 + Math.sin(t * 1.6 + c.seed) * 0.05;
    c.wl.rotation.z = ang; c.wr.rotation.z = -ang;
    c.sph.x = x; c.sph.y = y; c.sph.z = z;
    if (c.lead && (G.state === 'play' || G.state === 'ready')) { c.callT -= dt; if (c.callT <= 0) { c.callT = 9 + Math.random() * 12; audio.gull && audio.gull(); } }
  },
  // gökyüzü, ışık ve sis (applyLighting'ten hemen sonra)
  applyLook() {
    const P = this.plan; if (!P || G.lv !== this.lv || !this.built) return;
    const wx = P.wx, w = wx ? this.wk : 0;
    if (w > 0.002) {
      const oc = (wx === 'storm' ? 0.88 : wx === 'rain' ? 0.66 : 0.32) * w, fog = wx === 'fog' ? w : 0, dk = wx === 'storm' ? 0.6 : 0.84;
      overcast(skyU.uZen.value, oc, dk); overcast(skyU.uHor.value, oc * 0.85, dk + 0.08); overcast(skyU.uBelow.value, oc * 0.8, dk + 0.06);
      overcast(seaU.uLit.value, oc * 0.8, dk + 0.08); overcast(seaU.uDeep.value, oc * 0.6, dk + 0.1);
      if (fog) {
        const l = (c) => c.r * 0.3 + c.g * 0.55 + c.b * 0.15;
        for (const [col, k] of [[skyU.uHor.value, 0.6], [skyU.uZen.value, 0.35], [skyU.uBelow.value, 0.5], [seaU.uLit.value, 0.45]]) { const v = Math.min(1.1, l(col) * 1.12 + 0.12); col.lerp(_lc.setRGB(v, v * 1.01, v * 1.04), fog * k); }
      }
      U.uFogCol.value.copy(skyU.uHor.value); U.uBelowCol.value.copy(skyU.uBelow.value);
      sunLight.intensity *= 1 - (wx === 'storm' ? 0.28 : 0.18) * w; hemi.intensity *= 1 + 0.1 * w;
      orb.halo.material.color.multiplyScalar(1 - 0.45 * oc); post.u.uSunVis.value *= 1 - 0.6 * oc;
      const d = Cam.base.dist || 30;
      if (fog) { U.uFogNear.value = lerp(70, d * 0.95, w); U.uFogFar.value = lerp(340, d * 2.4, w); }
      else { U.uFogNear.value = lerp(70, d * 1.5, w * 0.8); U.uFogFar.value = lerp(340, d * 4.5, w * 0.8); }
      this.fogSet = true;
    } else if (this.fogSet) { U.uFogNear.value = 70; U.uFogFar.value = 340; this.fogSet = false; }
    if (this.flashK > 0.001) {
      skyU.uZen.value.lerp(_lc.setRGB(0.72, 0.78, 1.0), this.flashK * 0.45); skyU.uHor.value.lerp(_lc.setRGB(0.85, 0.88, 1.0), this.flashK * 0.35);
      hemi.intensity *= 1 + this.flashK * 1.3; U.uFogCol.value.copy(skyU.uHor.value);
    }
    // bazı zafer gecelerinde kutup ışıkları
    if (P.aurora && G.state === 'complete' && G.mode !== 'endless') {
      skyU.uAurora.value = Math.max(skyU.uAurora.value, G.night * 0.95);
      if (G.night > 0.6 && !this.aurPlayed) { this.aurPlayed = true; audio.aurora && audio.aurora(); }
    }
  },
  // son işlem ayarları (güneş huzmeleri, havadaki tozlar)
  post(pu) {
    const P = this.plan; if (!P || !P.wx || G.lv !== this.lv) return;
    const w = this.wk, oc = (P.wx === 'storm' ? 0.88 : P.wx === 'rain' ? 0.66 : 0.32) * w;
    pu.uRays.value *= 1 - oc * 0.8; pu.uExposure.value *= 1 - 0.07 * oc; if (P.wx !== 'fog') pu.uDesat.value = Math.max(pu.uDesat.value, (P.wx === 'storm' ? 0.2 : 0.12) * w);
    if (P.wx !== 'fog') Ambient.u.uAlpha.value *= 1 - 0.8 * w;
  },
};
