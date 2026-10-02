
/* =====================================================================
   GÖLGE TİYATROSU — mini oyun
   Kandilin önünde süzülen pirinç, ceviz ve çini kırıklarından bir heykel.
   Parçalar kandilden perdeye uzanan ışınlar boyunca kesik koni
   prizmalardır: tek bir açıda gölgeleri birleşip bir canlıya dönüşür.
   Gölge, düzlemsel izdüşümle bir maske dokusuna çizilir, yarı-gölge
   için bulanıklaştırılır ve kumaş perde gölgelendiricisinde ışığı keser.
   Çözülünce aynı maskeye iskeletli 2B figür çizilir: gölge heykelden
   kopar, kendi hayatını yaşar.
   ===================================================================== */
const stScene = new THREE.Scene();
stScene.background = new THREE.Color('#040302');
const stCam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const ST_WZ = -5;
const ST_ACTS = [
  { axes: 1, par: 35, riddle: 'Gülün sevdalısı', mats: ['brass', 'walnut', 'cini'] },
  { axes: 2, par: 50, riddle: 'Kelebek avcısı', mats: ['copper', 'ivory', 'ebony'] },
  { axes: 2, par: 55, riddle: 'Uzun kulaklı, çevik', mats: ['silver', 'walnut', 'cini'] },
  { axes: 2, par: 60, riddle: 'Okyanusun şarkıcısı', mats: ['cini', 'brass', 'ebony'] },
  { axes: 3, par: 80, riddle: 'Hortumlu dev ve bir sürpriz', mats: ['walnut', 'copper', 'ivory'] },
  { axes: 3, par: 80, riddle: 'Perdenin asıl sahibi', mats: ['ebony', 'brass', 'cini'] },
  // Yaban Hayatı
  { axes: 3, par: 85, riddle: 'Karın altını dinleyen', mats: ['copper', 'ivory', 'walnut'] },
  { axes: 3, par: 90, riddle: 'Başında bir orman taşır', mats: ['walnut', 'brass', 'ivory'] },
  { axes: 3, par: 90, riddle: 'Gecenin iki kandili', mats: ['ebony', 'silver', 'cini'] },
  { axes: 2, par: 110, riddle: 'Gökten inen ok, sudan çıkan gümüş', mats: ['brass', 'silver', 'cini'] },
  { axes: 3, par: 100, riddle: 'Rüzgârın kardeşi', mats: ['copper', 'ebony', 'ivory'] },
  { axes: 3, par: 110, riddle: 'Sekiz kollu bilge', mats: ['cini', 'copper', 'silver'] },
  { axes: 2, par: 120, riddle: 'Çölün gemileri', mats: ['walnut', 'brass', 'copper'] },
  { axes: 3, par: 110, riddle: 'Aya türkü söyleyen', mats: ['silver', 'ebony', 'walnut'] },
  { axes: 3, par: 160, riddle: 'Perdenin son efsanesi', mats: ['ebony', 'copper', 'brass'] },
];
// figürler ilk açıldıklarında derlenir (açılışta 15 iskeleti birden kurmamak için)
const ST_FIGS = [];
const stFig = (i) => ST_FIGS[i] || (ST_FIGS[i] = sfCompile(SF_DEFS[i]));
const ST_MASK_RES = [1024, 1536, 1536, 2048];
const ST_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

/* ---------- 2B çokgen yardımcıları (perde koordinatı, y yukarı) ---------- */
function stWinding(x, y, polys) {
  let w = 0;
  for (const p of polys) {
    for (let i = 0, n = p.length; i < n; i += 2) {
      const j = (i + 2) % n, x0 = p[i], y0 = p[i + 1], x1 = p[j], y1 = p[j + 1];
      if (y0 <= y) { if (y1 > y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0) w++; }
      else if (y1 <= y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0) w--;
    }
  }
  return w;
}
// basit çokgeni a·x + b·y + c = 0 doğrusuyla böl
function stSplit(poly, a, b, c) {
  const n = poly.length / 2, d = [];
  for (let i = 0; i < n; i++) { let v = a * poly[i * 2] + b * poly[i * 2 + 1] + c; if (Math.abs(v) < 1e-7) v = 1e-7; d.push(v); }
  if (d.every((v) => v > 0) || d.every((v) => v < 0)) return [poly];
  const V = [], dx = -b, dy = a;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, xi = poly[i * 2], yi = poly[i * 2 + 1];
    V.push({ x: xi, y: yi, cut: false });
    if (d[i] * d[j] < 0) { const t = d[i] / (d[i] - d[j]), x = xi + (poly[j * 2] - xi) * t, y = yi + (poly[j * 2 + 1] - yi) * t; V.push({ x, y, cut: true, t: x * dx + y * dy }); }
  }
  V.forEach((v, i) => (v.i = i));
  const cuts = V.filter((v) => v.cut).sort((p, q) => p.t - q.t);
  if (cuts.length % 2) return [poly];
  for (let k = 0; k < cuts.length; k += 2) { cuts[k].pair = cuts[k + 1]; cuts[k + 1].pair = cuts[k]; }
  const used = new Set(), out = [];
  for (let st = 0; st < V.length; st++) {
    if (V[st].cut || used.has(st)) continue;
    const p = []; let i = st, guard = 0;
    do {
      const v = V[i]; p.push(v.x, v.y); used.add(i);
      if (v.cut) { const w = v.pair; p.push(w.x, w.y); i = (w.i + 1) % V.length; } else i = (i + 1) % V.length;
    } while (i !== st && guard++ < 20000);
    if (guard < 20000) out.push(p);
  }
  return out.filter((p) => p.length >= 6 && Math.abs(sfArea(p)) > 1e-4);
}
function stInset(p, b) {
  const n = p.length / 2, o = new Array(p.length), s = sfArea(p) > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const h = (i + n - 1) % n, j = (i + 1) % n;
    let e1x = p[i * 2] - p[h * 2], e1y = p[i * 2 + 1] - p[h * 2 + 1], e2x = p[j * 2] - p[i * 2], e2y = p[j * 2 + 1] - p[i * 2 + 1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1; e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    let nx = (-e1y - e2y) * s, ny = (e1x + e2x) * s; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const ch = Math.max(0.4, nx * -e1y * s + ny * e1x * s), m = Math.sign(b) * Math.min(Math.abs(b) / ch, Math.abs(b) * 2);
    o[i * 2] = p[i * 2] + nx * m; o[i * 2 + 1] = p[i * 2 + 1] + ny * m;
  }
  return o;
}
const stCentroid = (p) => { let x = 0, y = 0; const n = p.length / 2; for (let i = 0; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; } return [x / n, y / n]; };
function stBBox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return [x0, y0, x1, y1]; }

/* ---------- prosedürel dokular ---------- */
function stCanvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function stTex(c, srgb = true, rep = false) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function stClothTex() {
  return stTex(stCanvas(512, 512, (x, W, H) => {
    const rng = new RNG(31); x.fillStyle = '#d9cdb6'; x.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { for (let k = 0; k < W; k += 8) { const v = 200 + rng.range(-16, 14); x.fillStyle = `rgb(${v + 22},${v + 12},${v - 8})`; x.fillRect(k + ((y / 4) % 2) * 4, y, 4, 3); } }
    for (let k = 0; k < W; k += 4) { x.fillStyle = `rgba(90,70,45,${rng.range(0.05, 0.12)})`; x.fillRect(k + 3, 0, 1, H); }
    for (let y = 0; y < H; y += 4) { x.fillStyle = `rgba(70,50,30,${rng.range(0.04, 0.1)})`; x.fillRect(0, y + 3, W, 1); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${rng.chance(0.5) ? '255,248,230' : '80,60,40'},${rng.range(0.05, 0.16)})`; const yy = Math.floor(rng.range(0, H / 4)) * 4; x.fillRect(rng.range(0, W), yy, rng.range(10, 60), rng.range(1.5, 3)); }
  }), true, true);
}
function stMacroTex() {
  return stTex(stCanvas(512, 512, (x, W, H) => {
    const rng = new RNG(9), img = x.createImageData(W, H), d = img.data;
    const n2 = (u, v, s) => Math.sin(u * s + Math.sin(v * s * 0.7) * 1.7) * Math.cos(v * s * 0.9 + Math.cos(u * s * 0.6) * 1.3);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = i / W, v = j / H, ex = Math.min(u, 1 - u, v, 1 - v);
      const st = 0.55 + 0.18 * n2(u, v, 9) + 0.1 * n2(u + 3, v, 23) + 0.05 * n2(u, v + 7, 61) - 0.35 * Math.pow(1 - Math.min(1, ex * 6), 2);
      // gerilim kırışıkları: köşelerden merkeze çapraz, hafif sarkma
      const wr = Math.sin((u + v) * 38) * Math.exp(-Math.pow((u - v) * 6, 2)) * Math.pow(1 - Math.min(1, Math.min(u + v, 2 - u - v) * 1.4), 1.5) + Math.sin((u - v) * 34) * Math.exp(-Math.pow((u + v - 1) * 6, 2)) * Math.pow(1 - Math.min(1, Math.min(u - v + 1, v - u + 1) * 1.4), 1.5);
      const h = 0.5 + 0.22 * wr + 0.06 * n2(u, v, 14) + 0.08 * Math.sin(v * PI) * Math.sin(u * PI);
      const k = (j * W + i) * 4; d[k] = clamp(st, 0, 1) * 255; d[k + 1] = clamp(h, 0, 1) * 255; d[k + 2] = 128; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }), false, false);
}
function stWalnutTex() {
  return stTex(stCanvas(512, 512, (x, W, H) => {
    const rng = new RNG(4); x.fillStyle = '#4a2c1a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 140; i++) {
      const y0 = rng.range(-20, H + 20), a = rng.range(4, 18), f = rng.range(0.005, 0.02), ph = rng.range(0, 6), w = rng.range(0.6, 3.2), l = rng.range(18, 40);
      x.strokeStyle = rng.chance(0.55) ? `rgba(20,10,5,${rng.range(0.15, 0.45)})` : `rgba(140,90,55,${rng.range(0.1, 0.3)})`; x.lineWidth = w; x.beginPath();
      for (let k = 0; k <= W; k += 6) { const yy = y0 + Math.sin(k * f + ph) * a + Math.sin(k * f * 3.1 + ph) * a * 0.2; k ? x.lineTo(k, yy) : x.moveTo(k, yy); } x.stroke();
      if (rng.chance(0.08)) { const cx = rng.range(0, W), cy = y0; for (let r = 3; r < l; r += 3) { x.strokeStyle = `rgba(25,12,6,${0.25 - r / l * 0.2})`; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, r * 2.2, r * 0.8, 0, 0, TAU); x.stroke(); } }
    }
  }), true, true);
}
function stCiniTex() {
  return stTex(stCanvas(512, 512, (x, W, H) => {
    const rng = new RNG(12); x.fillStyle = '#f1ece0'; x.fillRect(0, 0, W, H);
    const blue = '#1f4fa0', tq = '#2a9a9a', red = '#c0392b', grn = '#2f7a4a';
    const tulip = (cx, cy, s, r, c) => { x.save(); x.translate(cx, cy); x.rotate(r); x.scale(s, s); x.fillStyle = c; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-14, -6, -14, -30, -7, -42); x.lineTo(-2, -28); x.lineTo(0, -46); x.lineTo(2, -28); x.lineTo(7, -42); x.bezierCurveTo(14, -30, 14, -6, 0, 0); x.fill(); x.strokeStyle = '#1b2f5a'; x.lineWidth = 1.6; x.stroke(); x.restore(); };
    const saz = (cx, cy, s, r) => { x.save(); x.translate(cx, cy); x.rotate(r); x.scale(s, s); x.fillStyle = grn; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(20, -10, 50, -14, 80, 0); x.bezierCurveTo(50, 6, 20, 8, 0, 0); x.fill(); x.strokeStyle = '#173d26'; x.lineWidth = 1.2; x.stroke(); x.restore(); };
    for (let i = 0; i < 9; i++) { x.strokeStyle = blue; x.lineWidth = 5; x.beginPath(); const y0 = rng.range(0, H); x.moveTo(-20, y0); x.bezierCurveTo(W * 0.3, y0 + rng.range(-120, 120), W * 0.6, y0 + rng.range(-120, 120), W + 20, y0 + rng.range(-60, 60)); x.stroke(); }
    for (let i = 0; i < 26; i++) saz(rng.range(0, W), rng.range(0, H), rng.range(0.6, 1.1), rng.range(0, TAU));
    for (let i = 0; i < 30; i++) tulip(rng.range(0, W), rng.range(0, H), rng.range(0.5, 0.9), rng.range(-0.6, 0.6) + (rng.chance(0.5) ? PI : 0), rng.pick([red, blue, tq, red]));
    for (let i = 0; i < 40; i++) { x.fillStyle = rng.pick([blue, tq]); x.beginPath(); x.arc(rng.range(0, W), rng.range(0, H), rng.range(2, 5), 0, TAU); x.fill(); }
  }), true, true);
}
function stNoiseTex() {
  const s = 128, data = new Uint8Array(s * s * 4), rng = new RNG(77), g = [];
  for (let i = 0; i < 16 * 16; i++) g.push(rng.next());
  const at = (i, j) => g[((j & 15) * 16 + (i & 15))];
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const u = (i / s) * 16, v = (j / s) * 16, i0 = Math.floor(u), j0 = Math.floor(v), fu = smooth(u - i0), fv = smooth(v - j0);
    const n = lerp(lerp(at(i0, j0), at(i0 + 1, j0), fu), lerp(at(i0, j0 + 1), at(i0 + 1, j0 + 1), fu), fv);
    const k = (j * s + i) * 4; data[k] = n * 255; data[k + 1] = rng.next() * 255; data[k + 2] = 0; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, s, s); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
function stPlanks() {
  return stTex(stCanvas(512, 256, (x) => {
    const rng = new RNG(5);
    for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(22, 38%, ${rng.range(12, 19)}%)`; x.fillRect(0, i * 32, 512, 32); x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, i * 32, 512, 2); for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(255,215,170,${rng.range(0.02, 0.06)})`; x.fillRect(rng.range(0, 512), i * 32 + rng.range(3, 30), rng.range(20, 120), 1); } }
  }), true, true);
}

/* ---------- gölge maskesi: izdüşüm + iskelet figür + yarı-gölge bulanıklığı ---------- */
const ST_BLUR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270270;
  s += (texture2D(tSrc, vUv + uDir * 1.3846153846).rgb + texture2D(tSrc, vUv - uDir * 1.3846153846).rgb) * 0.3162162162;
  s += (texture2D(tSrc, vUv + uDir * 3.2307692308).rgb + texture2D(tSrc, vUv - uDir * 3.2307692308).rgb) * 0.0702702703;
  gl_FragColor = vec4(s, 1.0);
}`;
const SM = {
  init() {
    this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4);
    this.proj = new THREE.ShaderMaterial({
      uniforms: { uVP: { value: new THREE.Matrix4() }, uOcc: { value: new THREE.Vector3(1, 1, 1) } },
      vertexShader: 'uniform mat4 uVP; void main(){ gl_Position = uVP * (modelMatrix * vec4(position, 1.0)); }',
      fragmentShader: 'uniform vec3 uOcc; void main(){ gl_FragColor = vec4(uOcc, 1.0); }',
      side: THREE.DoubleSide, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.projGlass = this.proj.clone(); this.projGlass.uniforms.uVP = this.proj.uniforms.uVP; this.projGlass.uniforms.uOcc = { value: new THREE.Vector3(0.38, 0.55, 0.78) };
    // iskelet figür: sıfır-olmayan sarım kuralı (ön yüz +1, arka yüz −1), sonra örtü
    this.cap = 9000; this.fanGeo = new THREE.BufferGeometry();
    this.fanPos = new Float32Array(this.cap * 9); this.fanGeo.setAttribute('position', new THREE.BufferAttribute(this.fanPos, 3).setUsage(THREE.DynamicDrawUsage));
    const st = (side, op) => new THREE.MeshBasicMaterial({ colorWrite: false, depthTest: false, depthWrite: false, side, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: op, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilWriteMask: 0xff });
    this.fanF = new THREE.Mesh(this.fanGeo, st(THREE.FrontSide, THREE.IncrementWrapStencilOp)); this.fanF.renderOrder = 1;
    this.fanB = new THREE.Mesh(this.fanGeo, st(THREE.BackSide, THREE.DecrementWrapStencilOp)); this.fanB.renderOrder = 2;
    this.cover = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ZeroStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    this.cover.renderOrder = 3;
    for (const m of [this.fanF, this.fanB, this.cover]) { m.frustumCulled = false; this.scene.add(m); }
    this.blurMat = mkPass(ST_BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.proxies = []; this.res = 0; this.figOn = false;
  },
  alloc(res) {
    if (this.res === res) return; this.res = res;
    for (const k of ['rt', 'a', 'b', 'tRt', 'tA', 'tB', 'gRt', 'gA', 'gB', 'gC', 'gD']) if (this[k]) this[k].dispose();
    const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.rt = new THREE.WebGLRenderTarget(res, res, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: true });
    this.a = new THREE.WebGLRenderTarget(res, res, o); this.b = new THREE.WebGLRenderTarget(res, res, o);
    const tr = Math.max(256, res >> 1);
    this.tRt = new THREE.WebGLRenderTarget(tr, tr, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: true });
    this.tA = new THREE.WebGLRenderTarget(tr, tr, o); this.tB = new THREE.WebGLRenderTarget(tr, tr, o);
    // ışık maskesi (göz, fener, ay, alev): R = önde (gölgenin üstünde), G = arkada (gölgenin ardında)
    const gr = Math.max(256, res >> 1), ho = Object.assign({ type: THREE.HalfFloatType }, o);
    this.gRt = new THREE.WebGLRenderTarget(gr, gr, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: true });
    for (const k of ['gA', 'gB', 'gC', 'gD']) this[k] = new THREE.WebGLRenderTarget(gr, gr, ho);
    this.glowOn = true;
  },
  // perde dikdörtgeni (dünya) ve kandil → izdüşüm matrisi
  setRect(cx, cy, size, lamp) {
    this.rect = new THREE.Vector4(cx - size / 2, cy - size / 2, size, size); this.size = size;
    const c = this.cam; c.left = -size / 2; c.right = size / 2; c.top = size / 2; c.bottom = -size / 2; c.position.set(cx, cy, ST_WZ + 1); c.lookAt(cx, cy, ST_WZ); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    const lx = lamp.x, ly = lamp.y, lz = lamp.z, dot = lz - ST_WZ, M = new THREE.Matrix4();
    M.set(dot, 0, -lx, lx * ST_WZ, 0, dot, -ly, ly * ST_WZ, 0, 0, dot - lz, lz * ST_WZ, 0, 0, -1, lz);
    this.proj.uniforms.uVP.value.copy(c.projectionMatrix).multiply(c.matrixWorldInverse).multiply(M);
  },
  setProxies(meshes) {
    for (const p of this.proxies) this.scene.remove(p); this.proxies = [];
    for (const m of meshes) { const p = new THREE.Mesh(m.geometry, m.userData.glass ? this.projGlass : this.proj); p.matrixAutoUpdate = false; p.matrixWorldAutoUpdate = false; p.frustumCulled = false; p.userData.src = m; this.scene.add(p); this.proxies.push(p); }
  },
  // çokgenleri (dünya xy) yelpaze üçgenlerine dök
  fill(polys) {
    let n = 0; const P = this.fanPos, z = ST_WZ, max = this.cap * 3;
    for (const p of polys) {
      const m = p.length / 2; if (m < 3) continue;
      const x0 = p[0], y0 = p[1];
      for (let i = 1; i < m - 1 && n < max - 3; i++) { P[n * 3] = x0; P[n * 3 + 1] = y0; P[n * 3 + 2] = z; P[n * 3 + 3] = p[i * 2]; P[n * 3 + 4] = p[i * 2 + 1]; P[n * 3 + 5] = z; P[n * 3 + 6] = p[i * 2 + 2]; P[n * 3 + 7] = p[i * 2 + 3]; P[n * 3 + 8] = z; n += 3; }
    }
    this.fanGeo.attributes.position.needsUpdate = true; this.fanGeo.setDrawRange(0, n); this.fanN = n;
    const r = this.rect; this.cover.position.set(r.x + r.z / 2, r.y + r.w / 2, z); this.cover.scale.set(r.z, r.w, 1);
  },
  render(showSculpt, polys, blurPx, glow) {
    const prevT = renderer.getRenderTarget(), prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.autoClear = false; renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.rt); renderer.clear(true, true, true);
    for (const p of this.proxies) { p.visible = showSculpt && p.userData.src.visible; if (p.visible) p.matrixWorld.copy(p.userData.src.matrixWorld); }
    const fig = !!polys; this.fanF.visible = this.fanB.visible = this.cover.visible = fig;
    if (fig) this.fill(polys);
    renderer.render(this.scene, this.cam);
    // yarı-gölge: ayrık Gauss, iki geçiş
    const k = blurPx / 3.2, m = this.blurMat;
    m.uniforms.tSrc.value = this.rt.texture; m.uniforms.uDir.value.set(k / this.res, 0); post.pass(m, this.a);
    m.uniforms.tSrc.value = this.a.texture; m.uniforms.uDir.value.set(0, k / this.res); post.pass(m, this.b);
    if (blurPx > 9) { m.uniforms.tSrc.value = this.b.texture; m.uniforms.uDir.value.set(k * 0.6 / this.res, 0); post.pass(m, this.a); m.uniforms.tSrc.value = this.a.texture; m.uniforms.uDir.value.set(0, k * 0.6 / this.res); post.pass(m, this.b); }
    // ışık maskesi: önce ön, sonra arka ışıklar (aynı sarım kuralı, farklı kanal); yumuşak çekirdek + geniş hale
    const gOn = !!glow && (glow.front.length > 0 || glow.back.length > 0);
    if (gOn || this.glowOn) {
      renderer.setRenderTarget(this.gRt); renderer.clear(true, true, true);
      if (gOn) {
        for (const p of this.proxies) p.visible = false;
        this.fanF.visible = this.fanB.visible = this.cover.visible = true;
        const col = this.cover.material.color;
        for (const [ps, c] of [[glow.front, 0xff0000], [glow.back, 0x00ff00]]) { if (!ps.length) continue; this.fill(ps); col.setHex(c); renderer.render(this.scene, this.cam); }
        col.setHex(0xffffff);
      }
      const gr = this.gRt.width;
      m.uniforms.tSrc.value = this.gRt.texture; m.uniforms.uDir.value.set(1.6 / gr, 0); post.pass(m, this.gA);
      m.uniforms.tSrc.value = this.gA.texture; m.uniforms.uDir.value.set(0, 1.6 / gr); post.pass(m, this.gB);
      m.uniforms.tSrc.value = this.gB.texture; m.uniforms.uDir.value.set(5.5 / gr, 0); post.pass(m, this.gC);
      m.uniforms.tSrc.value = this.gC.texture; m.uniforms.uDir.value.set(0, 5.5 / gr); post.pass(m, this.gD);
      m.uniforms.tSrc.value = this.gD.texture; m.uniforms.uDir.value.set(3.2 / gr, 0); post.pass(m, this.gC);
      m.uniforms.tSrc.value = this.gC.texture; m.uniforms.uDir.value.set(0, 3.2 / gr); post.pass(m, this.gD);
      this.glowOn = gOn;
    }
    renderer.setRenderTarget(prevT); renderer.setClearColor(prevC, prevA); renderer.autoClear = prevAuto;
  },
  // ipucu için hedef silüet (bir kez)
  renderTarget(polys) {
    const prevT = renderer.getRenderTarget(), prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.autoClear = false; renderer.setClearColor(0x000000, 1); renderer.setRenderTarget(this.tRt); renderer.clear(true, true, true);
    for (const p of this.proxies) p.visible = false;
    this.fanF.visible = this.fanB.visible = this.cover.visible = true; this.fill(polys); renderer.render(this.scene, this.cam);
    const m = this.blurMat, r = this.tRt.width, k = 2.2;
    m.uniforms.tSrc.value = this.tRt.texture; m.uniforms.uDir.value.set(k / r, 0); post.pass(m, this.tA);
    m.uniforms.tSrc.value = this.tA.texture; m.uniforms.uDir.value.set(0, k / r); post.pass(m, this.tB);
    renderer.setRenderTarget(prevT); renderer.setClearColor(prevC, prevA); renderer.autoClear = prevAuto;
  },
};

/* ---------- perde (kumaş) gölgelendiricisi ---------- */
const ST_WALL_V = /* glsl */`varying vec3 vW; varying vec2 vUv; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ST_WALL_F = /* glsl */`
uniform sampler2D tMask, tCloth, tMacro, tTgt, tGlowS, tGlowH; uniform vec4 uRect; uniform vec3 uLamp, uLampCol, uSpotDir, uAmb, uHintCol, uGlowC; uniform float uCosIn, uCosOut, uHint, uRep, uGlow, uOut, uTime, uSoft;
varying vec3 vW; varying vec2 vUv;
void main(){
  vec3 toL = uLamp - vW; float d2 = dot(toL, toL); vec3 l = toL * inversesqrt(d2);
  vec2 e = vec2(1.0 / 512.0, 0.0);
  float h0 = texture2D(tMacro, vUv).g, hx = texture2D(tMacro, vUv + e.xy).g, hy = texture2D(tMacro, vUv + e.yx).g;
  // kumaş havada hafifçe dalgalanır
  float wv = sin(vW.x * 0.9 + uTime * 0.7) * 0.6 + sin(vW.y * 0.7 - uTime * 0.53 + vW.x * 0.3) * 0.4;
  vec3 n = normalize(vec3((h0 - hx) * 7.0 + cos(vW.x * 0.9 + uTime * 0.7) * 0.018, (h0 - hy) * 7.0 + wv * 0.012, 1.0));
  float ndl = max(dot(n, l), 0.0), cd = dot(-l, uSpotDir);
  float sp0 = smoothstep(uCosOut, uCosIn, cd); float spot = sp0 * sp0 * (3.0 - 2.0 * sp0) * 0.9 + 0.1 * smoothstep(uCosOut - 0.08, uCosOut, cd);
  float ang = acos(clamp(cd, -1.0, 1.0));
  spot *= 1.0 + 0.018 * sin(ang * 90.0) * smoothstep(uCosOut, uCosIn, cd) + 0.1 * smoothstep(uCosIn, 1.0, cd);
  vec2 mu = (vW.xy - uRect.xy) / uRect.zw;
  float inR = step(0.0, mu.x) * step(mu.x, 1.0) * step(0.0, mu.y) * step(mu.y, 1.0);
  // maske hafifçe bulanık bir alan gibi okunur: 0.5 eşiğinden keskin ve kenar yumuşatmalı kontur
  vec3 mm = texture2D(tMask, clamp(mu, 0.001, 0.999)).rgb * max(inR, uOut);
  float mx = max(mm.r, max(mm.g, mm.b)), aa = fwidth(mx) * 0.85 + 0.003;
  float eg = smoothstep(0.5 - uSoft - aa, 0.5 + uSoft + aa, mx);
  vec3 occ = mx > 0.002 ? mm / mx * eg : vec3(0.0);
  vec3 weave = texture2D(tCloth, vUv * uRep).rgb;
  vec4 mac = texture2D(tMacro, vUv);
  vec3 alb = vec3(0.92, 0.84, 0.7) * weave * (0.74 + 0.26 * mac.r);
  vec3 E = uLampCol * (ndl * spot / d2) * (1.0 - occ);
  vec3 col = alb * (E + uAmb) * 0.3183;
  // gölgede ışık geçirgenliği: kumaşın içinden sızan sıcak ton
  col += alb * uLampCol * spot / d2 * 0.006 * occ.r * vec3(1.0, 0.5, 0.22);
  float tg = texture2D(tTgt, mu).r * inR;
  float edge = smoothstep(0.12, 0.5, tg) * (1.0 - smoothstep(0.5, 0.88, tg));
  col += uHintCol * (edge * uHint + tg * uHint * 0.06);
  col += vec3(1.0, 0.6, 0.25) * uGlow * spot * 0.06;
  // figür ışıkları: ön ışık gölgenin üstünde yanar, arka ışık (ay) gölgenin ardında kalır
  vec2 gu = clamp(mu, 0.001, 0.999);
  vec3 gs = texture2D(tGlowS, gu).rgb * inR, gh = texture2D(tGlowH, gu).rgb * inR;
  float gF = smoothstep(0.0, 0.6, gs.r) + gh.r * 0.85, gK = (smoothstep(0.35, 0.65, gs.g) * 0.9 + gh.g * 0.55) * (1.0 - occ.r);
  col += (alb * 1.25 + 0.1) * uGlowC * (gF + gK);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- hacimsel ışık huzmesi (toz + gölge şaftları) ---------- */
const ST_BEAM_V = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ST_BEAM_F = /* glsl */`
uniform vec3 uLamp, uAxis, uLampCol; uniform float uCosIn, uCosOut, uWZ, uTime, uDC, uAmt; uniform sampler2D tMask, tNoise; uniform vec4 uRect;
varying vec3 vW;
void main(){
  vec3 D = normalize(vW - cameraPosition);
  float tw = D.z < -0.01 ? (uWZ - vW.z) / D.z : 30.0; tw = min(tw, 34.0);
  float dt = tw / float(STEPS), acc = 0.0; vec3 P = vW + D * dt * 0.5;
  for (int i = 0; i < STEPS; i++) {
    vec3 L = P - uLamp; float dl = max(length(L), 0.05), ca = dot(L, uAxis) / dl;
    float cone = smoothstep(uCosOut, uCosIn, ca), dz = P.z - uLamp.z;
    if (cone > 0.001 && dz < -0.05) {
      float ax = dot(L, uAxis), s = (uWZ - uLamp.z) / dz;
      vec2 mu = clamp(((uLamp + L * s).xy - uRect.xy) / uRect.zw, 0.0, 1.0);
      float occ = clamp(texture2D(tMask, mu).r, 0.0, 1.0) * smoothstep(uDC - 0.5, uDC + 0.7, ax);
      float nz = texture2D(tNoise, P.xy * 0.11 + vec2(P.z * 0.07, uTime * 0.006)).r * 0.65 + texture2D(tNoise, P.yz * 0.27 - vec2(uTime * 0.011, 0.0)).r * 0.35;
      acc += cone * (1.0 - occ * 0.92) * (0.35 + nz * nz * 1.3) / (1.0 + dl * dl * 0.035);
    }
    P += D * dt;
  }
  float o = acc * dt * uAmt; if (!(o >= 0.0)) o = 0.0;
  gl_FragColor = vec4(uLampCol * min(o, 3.0), 1.0);
}`;
const ST_DUST_V = /* glsl */`
attribute float aSeed; uniform float uTime, uPx; uniform vec3 uLamp, uAxis; uniform float uCosIn, uCosOut, uWZ, uDC; uniform sampler2D tMask; uniform vec4 uRect;
varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.11 + aSeed * 21.0) * 0.45 + sin(uTime * 0.37 + aSeed * 7.0) * 0.08;
  p.y += mod(position.y + uTime * (0.03 + fract(aSeed * 13.0) * 0.05) + 6.0, 12.0) - 6.0 - position.y + sin(uTime * 0.23 + aSeed * 9.0) * 0.3;
  p.z += cos(uTime * 0.09 + aSeed * 17.0) * 0.45;
  vec3 L = p - uLamp; float dl = max(length(L), 0.05), ca = dot(L, uAxis) / dl, dz = min(p.z - uLamp.z, -0.05);
  float cone = smoothstep(uCosOut, uCosIn, ca), s = (uWZ - uLamp.z) / dz;
  vec2 mu = clamp(((uLamp + L * s).xy - uRect.xy) / uRect.zw, 0.0, 1.0);
  float occ = clamp(texture2D(tMask, mu).r, 0.0, 1.0) * smoothstep(uDC - 0.3, uDC + 0.6, dot(L, uAxis));
  float tw = 0.45 + 0.55 * pow(abs(sin(uTime * (0.7 + fract(aSeed * 31.0)) + aSeed * 40.0)), 3.0);
  vA = clamp(cone * (1.0 - occ) * tw * 60.0 / (dl * dl + 6.0), 0.0, 4.0); if (!(vA >= 0.0)) vA = 0.0;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (0.016 + fract(aSeed * 7.0) * 0.022) / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}`;
const ST_DUST_F = /* glsl */`varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * vA * (1.0 - r) * (1.0 - r), 1.0); }`;
const ST_EMB_V = /* glsl */`attribute float aS; attribute vec3 aC; uniform float uPx; varying vec3 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPx * aS / max(-mv.z, 0.1); gl_Position = projectionMatrix * mv; }`;
const ST_EMB_F = /* glsl */`varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC * (1.0 - r) * (1.0 - r), 1.0); }`;

/* ---------- heykel malzemeleri ---------- */
function stMats() {
  const walnut = stWalnutTex(), cini = stCiniTex();
  const rough = stTex(stCanvas(256, 256, (x) => { const rng = new RNG(2); x.fillStyle = '#b4b4b4'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${rng.chance(0.5) ? '255,255,255' : '0,0,0'},${rng.range(0.03, 0.09)})`; x.fillRect(rng.range(0, 256), rng.range(0, 256), rng.range(8, 60), 1); } for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); x.fillStyle = `rgba(255,255,255,${rng.range(0.05, 0.15)})`; x.beginPath(); x.arc(rng.range(0, 256), rng.range(0, 256), rng.range(3, 14), 0, TAU); x.fill(); } }), false, true);
  return {
    brass: new THREE.MeshPhysicalMaterial({ color: 0xd6a85c, metalness: 1, roughness: 0.36, roughnessMap: rough, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 1.25 }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xc87650, metalness: 1, roughness: 0.4, roughnessMap: rough, envMapIntensity: 1.2 }),
    silver: new THREE.MeshPhysicalMaterial({ color: 0xdedbd2, metalness: 1, roughness: 0.32, roughnessMap: rough, envMapIntensity: 1.3 }),
    walnut: new THREE.MeshPhysicalMaterial({ map: walnut, color: 0xffffff, roughness: 0.48, clearcoat: 0.8, clearcoatRoughness: 0.22, envMapIntensity: 0.9 }),
    ebony: new THREE.MeshPhysicalMaterial({ color: 0x2b1e17, roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }),
    ivory: new THREE.MeshPhysicalMaterial({ color: 0xeadfc6, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }),
    cini: new THREE.MeshPhysicalMaterial({ map: cini, color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffb060, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.34, envMapIntensity: 1.2, clearcoat: 0.6, clearcoatRoughness: 0.18, depthWrite: false }),
  };
}

/* ---------- kesik koni prizma: perde çokgeni, kandile doğru dilimlenir ---------- */
// p: dış kontur (perde koordinatı, WC'ye göre), holes: delikler, s0 < s1 ışın parametreleri, b: pah
function stFrustum(T, outer, holes, s0, s1, b) {
  const Lp = T.lamp, WC = T.WC, C = T.C;
  const P3 = (u, v, s) => [Lp.x + s * (WC.x + u - Lp.x) - C.x, Lp.y + s * (WC.y + v - Lp.y) - C.y, Lp.z + s * (ST_WZ - Lp.z) - C.z];
  const pos = [], nor = [], uv = [];
  const tri = (a, b2, c, na, nb, nc, ua, ub, uc, want) => {
    // sargıyı istenen normale göre düzelt
    const ux = b2[0] - a[0], uy = b2[1] - a[1], uz = b2[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * want[0] + cy * want[1] + cz * want[2] < 0) { [b2, c] = [c, b2]; [nb, nc] = [nc, nb]; [ub, uc] = [uc, ub]; }
    pos.push(...a, ...b2, ...c); nor.push(...na, ...nb, ...nc); uv.push(...ua, ...ub, ...uc);
  };
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const ccw = sfArea(outer) > 0 ? outer : sfRev(outer), hs = holes.map((h) => (sfArea(h) < 0 ? h : sfRev(h)));
  const db = b * 0.6 / Math.hypot(WC.x - Lp.x, WC.y - Lp.y, ST_WZ - Lp.z);
  const inO = stInset(ccw, b), inH = hs.map((h) => stInset(h, -b));
  // kapaklar
  const cap = (s, O, H, front) => {
    const cv = []; for (let i = 0; i < O.length; i += 2) cv.push(new THREE.Vector2(O[i], O[i + 1]));
    const hv = H.map((h) => { const a = []; for (let i = 0; i < h.length; i += 2) a.push(new THREE.Vector2(h[i], h[i + 1])); return a; });
    const tris = THREE.ShapeUtils.triangulateShape(cv, hv), all = cv.concat(...hv), n = front ? [0, 0, 1] : [0, 0, -1];
    for (const t of tris) { const A = all[t[0]], Bv = all[t[1]], Cv = all[t[2]]; tri(P3(A.x, A.y, s), P3(Bv.x, Bv.y, s), P3(Cv.x, Cv.y, s), n, n, n, [A.x * 0.45, A.y * 0.45], [Bv.x * 0.45, Bv.y * 0.45], [Cv.x * 0.45, Cv.y * 0.45], n); }
  };
  cap(s0, inO, inH, true); cap(s1, inO, inH, false);
  // halka: iki kontur arası (yan yüz ya da pah), köşelerde keskin normaller
  const ring = (A, sA, Bk, sB, isHole) => {
    const n = A.length / 2, fn = [], arc = [0];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a0 = P3(A[i * 2], A[i * 2 + 1], sA), a1 = P3(A[j * 2], A[j * 2 + 1], sA), b0 = P3(Bk[i * 2], Bk[i * 2 + 1], sB);
      const ux = a1[0] - a0[0], uy = a1[1] - a0[1], uz = a1[2] - a0[2], vx = b0[0] - a0[0], vy = b0[1] - a0[1], vz = b0[2] - a0[2];
      let c = norm([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]);
      const ex = A[j * 2] - A[i * 2], ey = A[j * 2 + 1] - A[i * 2 + 1], out = [ey, -ex]; // CCW dış: sağ normal
      if (c[0] * out[0] + c[1] * out[1] < 0) c = [-c[0], -c[1], -c[2]];
      fn.push(c); arc.push(arc[i] + Math.hypot(ex, ey));
    }
    const vn = (i, f) => { const p = fn[(i + n - 1) % n], q = fn[i % n], d = p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; return d > 0.72 ? norm([p[0] + q[0], p[1] + q[1], p[2] + q[2]]) : f; };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, f = fn[i];
      const a0 = P3(A[i * 2], A[i * 2 + 1], sA), a1 = P3(A[j * 2], A[j * 2 + 1], sA), b0 = P3(Bk[i * 2], Bk[i * 2 + 1], sB), b1 = P3(Bk[j * 2], Bk[j * 2 + 1], sB);
      const n0 = vn(i, f), n1 = vn(j, f), u0 = arc[i] * 0.45, u1 = arc[i + 1] * 0.45, v0 = sA * 6, v1 = sB * 6;
      tri(a0, a1, b1, n0, n1, n1, [u0, v0], [u1, v0], [u1, v1], f); tri(a0, b1, b0, n0, n1, n0, [u0, v0], [u1, v1], [u0, v1], f);
    }
  };
  ring(inO, s0, ccw, s0 + db); ring(ccw, s0 + db, ccw, s1 - db); ring(ccw, s1 - db, inO, s1);
  hs.forEach((h, k) => { ring(inH[k], s0, h, s0 + db, true); ring(h, s0 + db, h, s1 - db, true); ring(h, s1 - db, inH[k], s1, true); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

/* ---------- sesler (figür olayları) ---------- */
// Yaban Hayatı: figüre özel sesler (olay adı çakışsa bile anahtar ayırır)
const stPaws = (A, t, n, dt, f = 600, g = 0.04) => { for (let i = 0; i < n; i++) A.noiseHit(t + i * dt + Math.random() * 0.02, 0.07, g * (0.7 + Math.random() * 0.4), { type: 'lowpass', f: f + Math.random() * 200 }); };
const stHooves = (A, t, n, dt, g = 0.12) => { for (let i = 0; i < n; i++) { const tt = t + i * dt + (i % 3 === 2 ? 0.05 : 0); A.osc('sine', 120, tt, 0.12, g, null, { f1: 55 }); A.noiseHit(tt, 0.06, g * 0.4, { type: 'bandpass', f: 1200, q: 1.2 }); } };
// formantlı hayvan sesleri (ses yolu sentezi): kaynak perdesi + ağız/gırtlak rezonansları
const stHowl = (A, t, f0, d, g, verb) => A.voice(t, { dur: d, src: 'triangle', f: [[0, f0 * 0.92], [d * 0.28, f0 * 1.62], [d * 0.7, f0 * 1.5], [d, f0 * 0.95]], F: [[0, [360, 820, 2500]], [d * 0.3, [480, 980, 2700]], [d, [340, 720, 2400]]], q: [7, 9, 11], amp: [1, 0.5, 0.2], vib: [5.2, 16], breath: 0.08, g: g * 2.4, a: d * 0.22, r: d * 0.3, verb });
const stMeow = (A, t, k = 1, d = 0.75, g = 0.2) => A.voice(t, { dur: d, f: [[0, 520 * k], [d * 0.24, 780 * k], [d * 0.6, 690 * k], [d, 430 * k]], F: [[0, [380, 2300, 3300]], [d * 0.25, [950, 1550, 2900]], [d * 0.7, [760, 1200, 2700]], [d, [420, 850, 2500]]], q: [5, 7, 9], breath: 0.06, vib: [6, 14], jit: [9, 10], g, a: 0.05, r: 0.22, verb: 0.35 });
const stPurr = (A, t, d = 1.6, g = 0.2) => A.voice(t, { dur: d, f: [[0, 25], [d, 23]], F: [[0, [180, 420, 900]]], q: [1.5, 2, 2], amp: [1, 0.5, 0.2], rough: [2.3, 0.65], breath: 0.1, g, a: 0.2, r: 0.4 });
const stTrumpet = (A, t, f0, d, g) => { A.voice(t, { dur: d, f: [[0, f0], [d * 0.15, f0 * 1.55], [d * 0.5, f0 * 1.75], [d * 0.85, f0 * 1.45], [d, f0 * 1.2]], F: [[0, [650, 1350, 2600]], [d * 0.3, [800, 1600, 2900]], [d, [600, 1200, 2500]]], q: [7, 8, 9], amp: [1, 0.85, 0.6], rough: [55, 0.35], jit: [7, 20], breath: 0.12, g, a: 0.04, r: 0.25, verb: 0.8 }); A.noiseHit(t, d * 0.8, g * 0.1, { type: 'bandpass', f: f0 * 3.5, q: 2, verb: 0.6 }); };
const ST_SFX = {
  kedi: {
    swat(A, t) { A.noiseHit(t, 0.12, 0.08, { type: 'bandpass', f: 1600, f1: 400, q: 1 }); stMeow(A, t + 0.28, 1, 0.72, 0.2); },
    yawn(A, t) { A.voice(t + 0.1, { dur: 1.15, f: [[0, 430], [0.35, 560], [1.15, 260]], F: [[0, [650, 1250, 2700]], [0.6, [820, 1150, 2600]], [1.15, [420, 820, 2400]]], q: [4, 6, 8], breath: 0.35, vib: [5, 10], g: 0.15, a: 0.18, r: 0.4, verb: 0.3 }); },
    lick(A, t) { for (let i = 0; i < 3; i++) A.noiseHit(t + i * 0.16, 0.06, 0.03, { type: 'bandpass', f: 2500, q: 2 }); stPurr(A, t + 0.45, 1.8, 0.2); },
    tail(A, t) { stMeow(A, t + 0.1, 1.25, 0.32, 0.12); },
  },
  fil: {
    trumpet(A, t) { stTrumpet(A, t, 290, 1.35, 0.3); },
    babyCall(A, t) { stTrumpet(A, t, 520, 0.7, 0.2); },
  },
  tilki: {
    listen(A, t) { for (let i = 0; i < 3; i++) A.osc('sine', 3300 + i * 140, t + 0.3 + i * 0.16, 0.05, 0.012, null, { f1: 3800, verb: 0.3 }); A.noiseHit(t, 0.08, 0.02, { type: 'highpass', f: 3000 }); },
    pounce(A, t) { A.noiseHit(t, 0.6, 0.08, { type: 'bandpass', f: 300, f1: 2400, q: 1, a: 0.3, verb: 0.3 }); },
    snowHit(A, t) { A.noiseHit(t, 0.45, 0.12, { type: 'lowpass', f: 1600, f1: 250, verb: 0.3 }); for (let i = 0; i < 8; i++) A.noiseHit(t + Math.random() * 0.25, 0.03, 0.03, { type: 'highpass', f: 3500 + Math.random() * 2500 }); },
    pop(A, t) { A.noiseHit(t, 0.25, 0.06, { type: 'lowpass', f: 1200, f1: 400 }); A.osc('sine', 3000, t + 0.15, 0.08, 0.014, null, { f1: 3600 }); },
    trot(A, t) { stPaws(A, t, 10, 0.19, 500, 0.035); },
  },
  geyik: {
    graze(A, t) { for (let i = 0; i < 7; i++) A.noiseHit(t + 0.6 + i * 0.2, 0.06, 0.025, { type: 'bandpass', f: 1800, q: 2 }); },
    alert(A, t) { A.noiseHit(t - 0.1, 0.04, 0.09, { type: 'highpass', f: 2800, q: 2 }); A.osc('triangle', 700, t - 0.1, 0.05, 0.03, null, { f1: 300 }); },
    shake(A, t) { for (let i = 0; i < 10; i++) { const tt = t + i * 0.06; A.noiseHit(tt, 0.04, 0.04, { type: 'bandpass', f: 2200 + Math.random() * 800, q: 4 }); A.osc('triangle', 380 + Math.random() * 120, tt, 0.05, 0.02, null, { f1: 200 }); } },
    bellow(A, t) { A.voice(t, { dur: 1.4, f: [[0, 105], [0.3, 168], [0.9, 150], [1.4, 92]], F: [[0, [420, 880, 2450]], [0.35, [680, 1150, 2600]], [1.4, [380, 760, 2300]]], q: [4, 6, 8], rough: [27, 0.6], breath: 0.18, jit: [6, 25], g: 0.34, a: 0.08, r: 0.35, verb: 0.8 }); },
    bound(A, t) { for (let i = 0; i < 4; i++) { const tt = t + 0.6 + i * 0.62; A.osc('sine', 90, tt, 0.25, 0.12, null, { f1: 45 }); A.noiseHit(tt, 0.12, 0.05, { type: 'lowpass', f: 600 }); A.noiseHit(tt - 0.5, 0.35, 0.025, { type: 'bandpass', f: 400, f1: 1500, q: 1 }); } },
  },
  baykus: {
    hoot(A, t) { for (const [d, f, l] of [[0, 400, 0.32], [0.5, 380, 0.22], [0.78, 400, 0.62]]) { A.osc('sine', f, t + d, l, 0.08, null, { f1: f * 0.88, verb: 0.9, a: 0.05 }); A.osc('triangle', f * 2, t + d, l, 0.008, null, { f1: f * 1.76, verb: 0.6, a: 0.05 }); } },
    turn(A, t) { A.noiseHit(t, 0.7, 0.03, { type: 'bandpass', f: 900, q: 3, a: 0.25 }); A.noiseHit(t + 0.9, 0.6, 0.025, { type: 'bandpass', f: 1000, q: 3, a: 0.2 }); },
    tilt(A, t) { A.osc('sine', 900, t, 0.08, 0.02, null, { f1: 1300 }); A.osc('sine', 800, t + 0.65, 0.08, 0.02, null, { f1: 1200 }); },
    puff(A, t) { A.noiseHit(t, 0.45, 0.05, { type: 'highpass', f: 1800, a: 0.12 }); },
    owlFly(A, t) { for (let i = 0; i < 5; i++) A.noiseHit(t + i * 0.24, 0.2, 0.05 * (1 - i * 0.12), { type: 'lowpass', f: 450, q: 0.7 }); },
  },
  kartal: {
    soar(A, t) { for (let i = 0; i < 2; i++) { const tt = t + 0.3 + i * 0.9; A.osc('sawtooth', 2100, tt, 0.55, 0.012, null, { f1: 1500, verb: 0.9, a: 0.02 }); A.osc('sine', 2500, tt, 0.5, 0.025, null, { f1: 1700, verb: 0.9, a: 0.02 }); A.noiseHit(tt, 0.45, 0.02, { type: 'bandpass', f: 2600, q: 5, verb: 0.6 }); } },
    fishJump(A, t) { A.noiseHit(t, 0.35, 0.07, { type: 'lowpass', f: 2200, f1: 400, verb: 0.4 }); },
    stoop(A, t) { A.noiseHit(t, 0.65, 0.09, { type: 'bandpass', f: 700, f1: 3400, q: 1.6, a: 0.5, verb: 0.3 }); },
    catch(A, t) { A.noiseHit(t, 0.6, 0.1, { type: 'lowpass', f: 1600, f1: 300, verb: 0.6 }); for (let i = 0; i < 6; i++) A.noiseHit(t + 0.15 + i * 0.15, 0.1, 0.05 * (1 - i / 7), { type: 'lowpass', f: 800, q: 0.7 }); A.osc('sine', 2300, t + 0.4, 0.5, 0.02, null, { f1: 1600, verb: 0.9 }); },
  },
  at: {
    snort(A, t) { A.noiseHit(t, 0.35, 0.09, { type: 'bandpass', f: 600, q: 0.8, a: 0.02 }); A.noiseHit(t + 0.05, 0.3, 0.05, { type: 'lowpass', f: 300 }); },
    paw(A, t) { A.noiseHit(t + 0.32, 0.18, 0.06, { type: 'bandpass', f: 1600, q: 1 }); A.osc('sine', 110, t + 0.36, 0.12, 0.08, null, { f1: 60 }); },
    neigh(A, t) {
      A.voice(t, { dur: 1.35, f: [[0, 620], [0.1, 1180], [0.45, 1080], [0.8, 820], [1.1, 640], [1.35, 420]], F: [[0, [650, 1750, 2700]], [0.5, [720, 1650, 2600]], [1.35, [550, 1250, 2400]]], q: [5, 7, 9], vib: [10.5, 95], rough: [42, 0.25], breath: 0.1, g: 0.24, a: 0.03, r: 0.3, verb: 0.6 });
      A.noiseHit(t + 1.25, 0.3, 0.07, { type: 'bandpass', f: 600, q: 0.8 });
    },
    land(A, t) { A.osc('sine', 75, t, 0.45, 0.22, null, { f1: 35 }); A.noiseHit(t, 0.3, 0.1, { type: 'lowpass', f: 700 }); },
    gallop(A, t) { stHooves(A, t, 12, 0.145, 0.1); },
  },
  ahtapot: {
    bubble(A, t) { for (let i = 0; i < 9; i++) A.osc('sine', 450 + Math.random() * 450, t + i * 0.2 + Math.random() * 0.06, 0.08, 0.018, null, { f1: 1300 + Math.random() * 500, verb: 0.5 }); },
    armWave(A, t) { A.noiseHit(t, 1.2, 0.06, { type: 'lowpass', f: 300, f1: 900, a: 0.5, verb: 0.9 }); A.osc('sine', 110, t, 1.2, 0.04, null, { f1: 150, verb: 0.8, a: 0.4 }); },
    spread(A, t) { A.osc('sine', 80, t, 1.4, 0.12, null, { f1: 60, verb: 0.9, a: 0.4 }); A.noiseHit(t, 1.0, 0.05, { type: 'lowpass', f: 500, a: 0.5, verb: 0.7 }); },
    ink(A, t) { A.noiseHit(t, 1.3, 0.12, { type: 'lowpass', f: 380, f1: 110, a: 0.05, verb: 0.9 }); A.osc('sine', 60, t, 1.0, 0.15, null, { f1: 35 }); },
    jet(A, t) { A.noiseHit(t, 0.8, 0.11, { type: 'bandpass', f: 220, f1: 1800, q: 1, a: 0.15, verb: 0.6 }); for (let i = 0; i < 14; i++) A.osc('sine', 600 + Math.random() * 600, t + 0.1 + Math.random() * 0.8, 0.06, 0.012, null, { f1: 1600, verb: 0.4 }); },
  },
  kervan: {
    camelGroan(A, t) { A.voice(t, { dur: 1.25, f: [[0, 92], [0.4, 128], [0.9, 110], [1.25, 80]], F: [[0, [480, 980, 2400]], [0.5, [640, 1100, 2500]], [1.25, [420, 850, 2300]]], q: [4, 5, 7], rough: [17, 0.8], breath: 0.16, jit: [5, 30], g: 0.32, a: 0.1, r: 0.3, verb: 0.5 }); for (let i = 0; i < 6; i++) A.osc('sine', 180 + Math.random() * 200, t + 0.2 + i * 0.12, 0.06, 0.016, null, { f1: 120 }); },
    bells(A, t) { for (let i = 0; i < 9; i++) { const tt = t + 0.1 + i * 0.47 + Math.random() * 0.05; A.bell(i % 2 ? 1180 : 1390, tt, 0.9, 0.022, { ratio: 1.41, index: 2.2, verb: 0.7 }); if (i % 2) A.bell(880, tt + 0.23, 0.9, 0.018, { ratio: 1.41, index: 2.0, verb: 0.7 }); } stPaws(A, t + 0.3, 14, 0.32, 350, 0.03); },
    kneel(A, t) { A.osc('sine', 70, t + 0.5, 0.3, 0.14, null, { f1: 40 }); A.osc('sine', 65, t + 1.05, 0.35, 0.16, null, { f1: 35 }); A.noiseHit(t + 0.5, 0.6, 0.05, { type: 'lowpass', f: 500 }); const o = A.osc('sawtooth', 110, t + 0.1, 0.8, 0.03, null, { f1: 75, verb: 0.5 }); o.frequency.linearRampToValueAtTime(140, t + 0.3); },
    shootingStar(A, t) { A.noiseHit(t, 0.7, 0.04, { type: 'highpass', f: 5000, f1: 9000, a: 0.1, verb: 0.8 }); A.bell(2637, t + 0.3, 1.6, 0.04, { ratio: 3.01, index: 0.9, verb: 1 }); A.bell(3520, t + 0.42, 1.4, 0.025, { ratio: 2.0, index: 0.8, verb: 1 }); },
  },
  kurt: {
    moonRise(A, t) { [57, 64, 69, 72].forEach((n, i) => A.osc('triangle', mtof(n), t + i * 0.25, 3.2, 0.022, null, { a: 1.0, verb: 1.3 })); },
    howl(A, t) { stHowl(A, t, 380, 1.5, 0.08, 1.1); },
    howl2(A, t) { stHowl(A, t, 430, 0.85, 0.08, 1.1); },
    answer(A, t) { stHowl(A, t + 0.35, 330, 1.7, 0.025, 1.6); stHowl(A, t + 0.9, 360, 1.4, 0.018, 1.6); },
    leap(A, t) { A.noiseHit(t, 0.55, 0.08, { type: 'bandpass', f: 300, f1: 2200, q: 1, a: 0.25, verb: 0.3 }); A.osc('sine', 80, t + 0.6, 0.25, 0.12, null, { f1: 40 }); },
    run(A, t) { stPaws(A, t, 10, 0.18, 550, 0.05); },
  },
  ejderha: {
    eyeGlow(A, t) { A.osc('sine', 48, t, 2.2, 0.16, null, { f1: 42, a: 0.8, verb: 0.6 }); A.noiseHit(t, 2.0, 0.05, { type: 'lowpass', f: 160, a: 0.8 }); A.bell(mtof(45), t + 0.3, 2.5, 0.03, { ratio: 1.41, index: 3, verb: 1.2 }); },
    smoke(A, t) { A.noiseHit(t, 1.0, 0.04, { type: 'highpass', f: 1500, a: 0.3, verb: 0.4 }); A.noiseHit(t + 0.9, 0.8, 0.03, { type: 'highpass', f: 1700, a: 0.3, verb: 0.4 }); },
    unfurl(A, t) { A.noiseHit(t, 0.8, 0.14, { type: 'bandpass', f: 180, f1: 1400, q: 0.9, a: 0.3, verb: 0.5 }); A.noiseHit(t + 0.75, 0.08, 0.1, { type: 'highpass', f: 1200 }); A.osc('sine', 60, t + 0.75, 0.3, 0.14, null, { f1: 35 }); },
    inhale(A, t) { A.noiseHit(t, 0.8, 0.08, { type: 'bandpass', f: 500, f1: 2400, q: 1.4, a: 0.7, verb: 0.4 }); },
    fire(A, t) {
      A.noiseHit(t, 2.1, 0.22, { type: 'lowpass', f: 1100, f1: 500, a: 0.06, verb: 0.6 }); A.noiseHit(t, 2.0, 0.08, { type: 'bandpass', f: 400, q: 0.8, a: 0.1, verb: 0.5 });
      A.osc('sawtooth', 70, t, 2.0, 0.04, null, { f1: 55, a: 0.1, verb: 0.4 });
      for (let i = 0; i < 26; i++) A.noiseHit(t + Math.random() * 2.2, 0.03, 0.04, { type: 'highpass', f: 2500 + Math.random() * 4000, q: 2 });
    },
    roar(A, t) {
      A.voice(t, { dur: 1.7, f: [[0, 68], [0.25, 108], [0.9, 92], [1.7, 52]], F: [[0, [320, 820, 2000]], [0.3, [580, 1150, 2300]], [1.7, [340, 700, 1800]]], q: [3, 4, 5], amp: [1, 0.7, 0.4], rough: [33, 0.75], breath: 0.4, jit: [5, 40], g: 0.5, a: 0.07, r: 0.4, verb: 1.0 });
      A.osc('sine', 42, t, 1.6, 0.2, null, { f1: 30, a: 0.1 });
    },
    wingBeat(A, t) { A.noiseHit(t, 0.4, 0.14, { type: 'lowpass', f: 650, q: 0.8, a: 0.05, verb: 0.4 }); A.osc('sine', 55, t + 0.05, 0.3, 0.16, null, { f1: 32 }); },
    takeoff(A, t) { for (let i = 0; i < 6; i++) { const tt = t + i * 0.43; A.noiseHit(tt, 0.4, 0.13 * (1 - i * 0.12), { type: 'lowpass', f: 650, q: 0.8, a: 0.05, verb: 0.5 }); A.osc('sine', 55, tt + 0.05, 0.3, 0.13 * (1 - i * 0.12), null, { f1: 32 }); } A.noiseHit(t, 2.6, 0.06, { type: 'bandpass', f: 200, f1: 1200, q: 0.8, a: 1.2, verb: 0.7 }); },
  },
};
function stSfx(key, ev) {
  if (!audio.ok) return; const A = audio, t = A.t;
  const own = ST_SFX[key] && ST_SFX[key][ev]; if (own) { own(A, t); return; }
  const chirp = (t0, f0, f1, d, g = 0.035) => A.osc('sine', f0, t0, d, g, null, { f1, verb: 0.35 });
  if (ev === 'song') {
    let tt = t; for (let i = 0; i < 7; i++) { chirp(tt, 2400, 3100, 0.06); tt += 0.085; }
    for (let i = 0; i < 3; i++) { chirp(tt + 0.05, 1500 + i * 120, 2900, 0.22, 0.03); tt += 0.25; }
    tt += 0.12; for (let i = 0; i < 9; i++) { chirp(tt, 3300, 2500, 0.045, 0.028); tt += 0.06; }
    chirp(tt + 0.1, 1800, 1200, 0.5, 0.03);
  } else if (ev === 'takeoff' || ev === 'flap') { for (let i = 0; i < 9; i++) A.noiseHit(t + i * 0.14, 0.09, 0.05 * (1 - i / 10), { type: 'lowpass', f: 900, q: 0.7 }); }
  else if (ev === 'bfly') { for (let i = 0; i < 5; i++) A.noiseHit(t + i * 0.1, 0.05, 0.012, { type: 'highpass', f: 5000 }); }
  else if (ev === 'swat') { A.noiseHit(t, 0.12, 0.08, { type: 'bandpass', f: 1600, f1: 400, q: 1 }); const o = A.osc('sawtooth', 620, t + 0.25, 0.55, 0.035, null, { f1: 420, curve: 'lin', verb: 0.4 }); o.frequency.linearRampToValueAtTime(880, t + 0.45); }
  else if (ev === 'yawn') { const o = A.osc('triangle', 520, t + 0.1, 1.0, 0.03, null, { f1: 300, curve: 'lin', verb: 0.4 }); o.frequency.linearRampToValueAtTime(700, t + 0.35); }
  else if (ev === 'lick' || ev === 'tail') { for (let i = 0; i < 3; i++) A.noiseHit(t + i * 0.16, 0.06, 0.03, { type: 'bandpass', f: 2500, q: 2 }); }
  else if (ev === 'sniff') { for (let i = 0; i < 4; i++) A.noiseHit(t + i * 0.09, 0.05, 0.03, { type: 'highpass', f: 3000 }); }
  else if (ev === 'rear') A.osc('sine', 300, t, 0.25, 0.03, null, { f1: 520 });
  else if (ev === 'hop') { A.osc('sine', 95, t + 0.5, 0.18, 0.12, null, { f1: 50 }); A.noiseHit(t + 0.5, 0.1, 0.05, { type: 'lowpass', f: 400 }); A.osc('sine', 420, t, 0.12, 0.02, null, { f1: 760 }); }
  else if (ev === 'whale') { const o = A.osc('sine', 160, t, 3.2, 0.09, null, { f1: 110, curve: 'lin', verb: 1, a: 0.7 }); o.frequency.linearRampToValueAtTime(260, t + 1.2); o.frequency.linearRampToValueAtTime(140, t + 2.4); A.osc('sine', 330, t + 0.8, 1.8, 0.03, null, { f1: 210, verb: 1, a: 0.4 }); }
  else if (ev === 'spout') { A.noiseHit(t, 1.6, 0.14, { type: 'bandpass', f: 900, f1: 3500, q: 0.6, a: 0.05, verb: 0.5 }); A.noiseHit(t + 0.9, 1.4, 0.06, { type: 'highpass', f: 2500, a: 0.2, verb: 0.6 }); }
  else if (ev === 'splash') A.noiseHit(t, 0.6, 0.08, { type: 'lowpass', f: 1400, f1: 300, verb: 0.6 });
  else if (ev === 'dive') { A.noiseHit(t + 0.6, 1.4, 0.1, { type: 'lowpass', f: 900, f1: 120, verb: 0.8 }); A.osc('sine', 70, t + 0.6, 1.2, 0.14, null, { f1: 38 }); }
  else if (ev === 'bubbles') { for (let i = 0; i < 12; i++) A.osc('sine', 500 + Math.random() * 500, t + i * 0.13 + Math.random() * 0.05, 0.07, 0.02, null, { f1: 1400 + Math.random() * 600, verb: 0.4 }); }
  else if (ev === 'ear') { for (let i = 0; i < 4; i++) A.noiseHit(t + i * 0.22, 0.12, 0.03, { type: 'lowpass', f: 500 }); }
  else if (ev === 'trumpet' || ev === 'babyCall') {
    const b = ev === 'babyCall', f0 = b ? 520 : 290, d = b ? 0.7 : 1.3;
    for (const [ty, k, g] of [['sawtooth', 1, 0.06], ['square', 1.005, 0.025]]) { const o = A.osc(ty, f0 * k, t, d, g, null, { f1: f0 * 1.15 * k, curve: 'lin', verb: 0.8, a: 0.06 }); o.frequency.linearRampToValueAtTime(f0 * 1.75 * k, t + d * 0.3); o.frequency.linearRampToValueAtTime(f0 * 1.4 * k, t + d * 0.85); }
    A.noiseHit(t, d, 0.04, { type: 'bandpass', f: f0 * 3, q: 2, verb: 0.6 });
  } else if (ev === 'baby') { for (let i = 0; i < 6; i++) A.osc('sine', 70, t + i * 0.3, 0.15, 0.08, null, { f1: 42 }); }
  else if (ev === 'walk') { for (let i = 0; i < 10; i++) A.osc('sine', 58, t + i * 0.62, 0.3, 0.14, null, { f1: 36 }); }
  else if (ev === 'blink' || ev === 'wink') A.osc('sine', 1400, t, 0.05, 0.02, null, { f1: 2200 });
  else if (ev === 'dance') { for (let i = 0; i < 4; i++) A.bell(mtof([74, 77, 81, 79][i]), t + i * 0.2, 0.6, 0.03, { ratio: 2, index: 1, verb: 0.6 }); }
  else if (ev === 'leap') { A.noiseHit(t, 1.6, 0.16, { type: 'bandpass', f: 200, f1: 2600, q: 1, a: 1.2, verb: 0.6 }); A.osc('sine', 60, t + 1.3, 1.6, 0.25, null, { f1: 30, verb: 0.8 }); }
}
function stApplause(n = 1) {
  if (!audio.ok) return; const A = audio, t = A.t;
  const N = Math.round(70 + 60 * n);
  for (let i = 0; i < N; i++) { const u = Math.random(), tt = t + 0.1 + u * 3.4, env = Math.sin(Math.min(1, u * 1.3) * PI) * 0.9 + 0.1; A.noiseHit(tt, 0.035, 0.022 * env, { type: 'bandpass', f: 900 + Math.random() * 2400, q: 1.4, verb: 0.35 }); }
  if (n > 1) for (let i = 0; i < 3; i++) { const o = A.osc('sine', 1700, t + 0.6 + i * 0.7, 0.35, 0.02, null, { f1: 2400, verb: 0.5 }); }
}

/* ---------- Tiyatro ---------- */
const Theater = {
  inited: false, active: false, idx: 0, q: new THREE.Quaternion(), w: new THREE.Vector2(), drag: null, t: 0, near: 0, hintT: 0, from: 'title',
  state: 'idle', stT: 0, yaw: 0, pitch: 0, pieces: [], embers: null,
  init() {
    if (this.inited) return; this.inited = true;
    SM.init();
    this.M = stMats();
    this.hemi = new THREE.HemisphereLight(0xffdcb0, 0x1a0c05, 0.55); stScene.add(this.hemi);
    this.spot = new THREE.SpotLight(0xffc27a, 1, 0, 0.5, 0.6, 2); stScene.add(this.spot, this.spot.target);
    this.rim = new THREE.DirectionalLight(0xffa860, 0.6); stScene.add(this.rim, this.rim.target);
    // perde
    this.wallU = {
      tMask: { value: null }, tCloth: { value: stClothTex() }, tMacro: { value: stMacroTex() }, tTgt: { value: null }, uRect: { value: new THREE.Vector4() },
      uLamp: { value: new THREE.Vector3() }, uLampCol: { value: new THREE.Color() }, uSpotDir: { value: new THREE.Vector3() }, uAmb: { value: new THREE.Color(0.12, 0.075, 0.045) },
      uCosIn: { value: 0.9 }, uCosOut: { value: 0.8 }, uHint: { value: 0 }, uRep: { value: 9 }, uGlow: { value: 0 }, uOut: { value: 0 }, uTime: { value: 0 }, uSoft: { value: 0.3 }, uHintCol: { value: new THREE.Color(2.2, 1.0, 0.35) },
      tGlowS: { value: null }, tGlowH: { value: null }, uGlowC: { value: new THREE.Color(0, 0, 0) },
    };
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: ST_WALL_V, fragmentShader: ST_WALL_F, uniforms: this.wallU }));
    stScene.add(this.wall);
    // çerçeve, perdeler, sahne
    const wood = new THREE.MeshPhysicalMaterial({ map: stWalnutTex(), color: 0x8a6a55, roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a548, roughness: 0.28, metalness: 1 });
    this.frame = new THREE.Group(); stScene.add(this.frame);
    this.frameParts = { wood, gold };
    const vel = new THREE.MeshPhysicalMaterial({ color: 0x6e1020, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xff7a7a), sheenRoughness: 0.45, side: THREE.DoubleSide });
    const drape = (w, h, folds, amp) => { const g = new THREE.PlaneGeometry(w, h, Math.round(folds * 10), 12), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin((x / w) * folds * TAU) * amp + Math.sin((x / w) * folds * 2.3 * TAU + 1) * amp * 0.3 + (y / h) * 0.0); } g.computeVertexNormals(); return g; };
    this.velvet = vel; this.drape = drape;
    this.curL = new THREE.Mesh(drape(4, 18, 6, 0.16), vel); this.curR = new THREE.Mesh(drape(4, 18, 6, 0.16), vel); this.valance = new THREE.Mesh(drape(34, 2.2, 22, 0.12), vel);
    stScene.add(this.curL, this.curR, this.valance);
    // açılıp kapanan ön perdeler
    this.frontL = new THREE.Mesh(drape(9, 22, 9, 0.22), vel); this.frontR = new THREE.Mesh(drape(9, 22, 9, 0.22), vel); stScene.add(this.frontL, this.frontR);
    this.foot = new THREE.PointLight(0xff9a50, 0, 0, 2); stScene.add(this.foot);
    this.floor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 22), new THREE.MeshStandardMaterial({ map: stPlanks(), roughness: 0.62, metalness: 0 })); stScene.add(this.floor);
    this.floor.material.map.repeat.set(5, 3);
    // huzme, toz, kıvılcımlar
    this.noise = stNoiseTex();
    this.beamU = { uLamp: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3() }, uLampCol: { value: new THREE.Color(1, 0.72, 0.42) }, uCosIn: { value: 0.9 }, uCosOut: { value: 0.8 }, uWZ: { value: ST_WZ }, uTime: { value: 0 }, uDC: { value: 8 }, uAmt: { value: 0.05 }, tMask: { value: null }, tNoise: { value: this.noise }, uRect: { value: new THREE.Vector4() } };
    this.dustU = { uTime: this.beamU.uTime, uPx: { value: 600 }, uLamp: this.beamU.uLamp, uAxis: this.beamU.uAxis, uCosIn: this.beamU.uCosIn, uCosOut: this.beamU.uCosOut, uWZ: this.beamU.uWZ, uDC: this.beamU.uDC, tMask: this.beamU.tMask, uRect: this.beamU.uRect };
    this.root = new THREE.Group(); stScene.add(this.root);
    this.buildDom();
  },
  /* ----- yerleşim: kandil, perde, kamera ----- */
  layout() {
    const portrait = innerWidth / innerHeight < 0.9; this.portrait = portrait;
    this.Ldir = portrait ? new THREE.Vector3(0.0, 0.45, 0.89).normalize() : new THREE.Vector3(0.6, 0.16, 0.78).normalize();
    this.C = portrait ? new THREE.Vector3(0.0, 3.9, 0.3) : new THREE.Vector3(2.0, 2.4, 0.3);
    this.lamp = this.C.clone().addScaledVector(this.Ldir, 10.5);
    const s = (ST_WZ - this.lamp.z) / (this.C.z - this.lamp.z); this.WC = this.lamp.clone().lerp(this.C, s); this.WC.z = ST_WZ;
    this.camP = portrait ? new THREE.Vector3(0.0, 0.9, 14.8) : new THREE.Vector3(0.1, 1.3, 9.6);
    this.camT = portrait ? new THREE.Vector3(0.0, 2.2, -3.0) : new THREE.Vector3(-0.2, 1.5, -3.0);
    this.figS = portrait ? 0.95 : 0.92;
    // ışın parametresi: C'nin kandil→perde doğrultusundaki yeri
    this.rayLen = this.lamp.distanceTo(this.WC); this.sC = this.lamp.distanceTo(this.C) / this.rayLen;
    const cd = this.WC.clone().sub(this.lamp).normalize(); this.axis = cd;
    const cosOut = Math.cos(Math.atan((portrait ? 4.4 : 5.4) / this.rayLen)), cosIn = Math.cos(Math.atan((portrait ? 0.8 : 1.2) / this.rayLen));
    this.cosIn = cosIn; this.cosOut = cosOut;
    // ışıklar
    const sp = this.spot; sp.position.copy(this.lamp); sp.target.position.copy(this.WC); sp.angle = Math.acos(cosOut) * 1.05; sp.penumbra = 0.55; sp.decay = 2; sp.distance = 0;
    this.rim.position.copy(this.WC).add(new THREE.Vector3(0, 2, -1)); this.rim.target.position.copy(this.C);
    // perde ve çerçeve
    const cw = 22, ch = 14, cx = this.WC.x, cy = this.WC.y + 0.6;
    this.floorY = this.WC.y - (portrait ? 7.2 : 4.6);
    this.wall.position.set(cx, (this.floorY + cy + ch / 2) / 2, ST_WZ); this.wall.scale.set(cw, cy + ch / 2 - this.floorY, 1);
    this.wallU.uRep.value = 9;
    this.buildFrame(cx, this.floorY, cw, cy + ch / 2);
    this.floor.position.set(cx, this.floorY - 0.2, ST_WZ + 10.5);
    // maske
    SM.alloc(ST_MASK_RES[Perf.level] || 1536);
    SM.setRect(this.WC.x, this.WC.y + (portrait ? 0.4 : 0), portrait ? 9.6 : 12, this.lamp);
    this.pxu = SM.res / SM.size;
    const W = this.wallU; W.tMask.value = SM.b.texture; W.tTgt.value = SM.tB.texture; W.tGlowS.value = SM.gB.texture; W.tGlowH.value = SM.gD.texture; W.uRect.value.copy(SM.rect); W.uLamp.value.copy(this.lamp); W.uSpotDir.value.copy(cd); W.uCosIn.value = cosIn; W.uCosOut.value = cosOut;
    const B = this.beamU; B.uLamp.value.copy(this.lamp); B.uAxis.value.copy(cd); B.uCosIn.value = Math.cos(Math.atan(2.0 / this.rayLen)); B.uCosOut.value = Math.cos(Math.atan(4.6 / this.rayLen)); B.tMask.value = SM.b.texture; B.uRect.value.copy(SM.rect); B.uDC.value = this.lamp.distanceTo(this.C);
    this.buildBeam(); this.buildDust(); this.buildEnv();
  },
  buildFrame(cx, fy, cw, top) {
    const F = this.frame; while (F.children.length) { const o = F.children.pop(); o.geometry.dispose(); }
    const { wood, gold } = this.frameParts, z = ST_WZ + 0.25, x0 = cx - cw / 2, x1 = cx + cw / 2;
    const box = (x, y, w, h, d, m, zz = z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, zz); F.add(b); return b; };
    box(cx, top + 0.4, cw + 1.6, 0.8, 0.6, wood); box(cx, top - 0.02, cw + 0.2, 0.08, 0.66, gold);
    box(cx, fy + 0.15, cw + 1.6, 0.3, 0.7, wood);
    for (const x of [x0 - 0.4, x1 + 0.4]) { box(x, (top + fy) / 2, 0.8, top - fy + 1.2, 0.6, wood); box(x + (x < cx ? 0.42 : -0.42), (top + fy) / 2, 0.06, top - fy, 0.66, gold); }
    // kenar perdeleri ve saçak
    const vis = this.visibleHalfWidth(ST_WZ + 0.8);
    const dx = Math.min(cw / 2 - 1.2, vis + 1.45); this.curL.position.set(this.camP.x - dx, (top + fy) / 2 + 1, ST_WZ + 0.8); this.curR.position.set(this.camP.x + dx, (top + fy) / 2 + 1, ST_WZ + 0.8);
    this.valance.position.set(cx, top - 0.6, ST_WZ + 0.9);
  },
  visibleHalfWidth(z) { const d = Math.abs(this.camP.z - z), a = innerWidth / innerHeight; return Math.tan(deg(stCam.fov / 2)) * d * a; },
  buildBeam() {
    if (this.beam) { stScene.remove(this.beam); this.beam.geometry.dispose(); this.beam.material.dispose(); }
    const steps = [6, 10, 16, 22][Perf.level] || 12, len = this.rayLen * 1.12, r = Math.tan(Math.acos(this.beamU.uCosOut.value)) * len * 1.05;
    const g = new THREE.ConeGeometry(r, len, 40, 1, true); g.translate(0, -len / 2, 0);
    this.beam = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: ST_BEAM_V, fragmentShader: ST_BEAM_F, uniforms: this.beamU, defines: { STEPS: steps }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide }));
    this.beam.position.copy(this.lamp); this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), this.axis); this.beam.frustumCulled = false; this.beam.renderOrder = 5;
    stScene.add(this.beam);
  },
  buildDust() {
    if (this.dust) { stScene.remove(this.dust); this.dust.geometry.dispose(); this.dust.material.dispose(); }
    const n = [220, 380, 600, 800][Perf.level] || 400, pos = new Float32Array(n * 3), seed = new Float32Array(n), rng = new RNG(5);
    for (let i = 0; i < n; i++) { const u = rng.range(0.15, 1.02), p = this.lamp.clone().lerp(this.WC, u), sp = Math.tan(Math.acos(this.cosOut)) * this.rayLen * u * 1.1; pos[i * 3] = p.x + rng.range(-1, 1) * sp; pos[i * 3 + 1] = p.y + rng.range(-1, 1) * sp; pos[i * 3 + 2] = Math.max(ST_WZ + 0.1, p.z + rng.range(-1, 1) * 0.6); seed[i] = rng.next(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dust = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: ST_DUST_V, fragmentShader: ST_DUST_F, uniforms: this.dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.dust.frustumCulled = false; this.dust.renderOrder = 6; stScene.add(this.dust);
    if (!this.embers) {
      const m = 420, eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m * 3), 3).setUsage(THREE.DynamicDrawUsage)); eg.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(m), 1).setUsage(THREE.DynamicDrawUsage)); eg.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(m * 3), 3).setUsage(THREE.DynamicDrawUsage));
      this.embers = new THREE.Points(eg, new THREE.ShaderMaterial({ vertexShader: ST_EMB_V, fragmentShader: ST_EMB_F, uniforms: { uPx: this.dustU.uPx }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.embers.frustumCulled = false; this.embers.renderOrder = 7; stScene.add(this.embers); this.emb = []; this.embMax = m;
    }
  },
  buildEnv() {
    if (this.envKey === (this.portrait ? 'p' : 'l')) return; this.envKey = this.portrait ? 'p' : 'l';
    try {
      const env = new THREE.Scene(); env.background = new THREE.Color(0x050302);
      const add = (geo, col, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; env.add(m); return m; };
      add(new THREE.PlaneGeometry(14, 9), new THREE.Color(1.1, 0.7, 0.38), 0, -0.5, -6);
      add(new THREE.SphereGeometry(0.8, 16, 12), new THREE.Color(7, 4.6, 2.4), this.Ldir.x * 8, this.Ldir.y * 8, this.Ldir.z * 8);
      add(new THREE.PlaneGeometry(30, 30), new THREE.Color(0.12, 0.06, 0.03), 0, -6, 0).rotation.x = -PI / 2;
      add(new THREE.PlaneGeometry(6, 14), new THREE.Color(0.32, 0.03, 0.05), -9, 0, -2, PI / 2); add(new THREE.PlaneGeometry(6, 14), new THREE.Color(0.32, 0.03, 0.05), 9, 0, -2, -PI / 2);
      add(new THREE.PlaneGeometry(10, 4), new THREE.Color(0.5, 0.3, 0.16), 0, 7, 3).rotation.x = PI / 2;
      const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, 0.035);
      if (this.envRT) this.envRT.dispose(); this.envRT = rt; stScene.environment = rt.texture; pm.dispose();
      env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    } catch (e) { console.warn('tiyatro env', e); }
  },
  /* ----- bir perdeyi kur ----- */
  build(i, keepQ) {
    this.layout();
    const prev = keepQ && this.grp ? this.grp.map((g) => ({ q: g.q.clone(), yaw: g.yaw, pitch: g.pitch, lock: g.lock })) : null;
    this.clearPieces();
    const act = ST_ACTS[i], F = stFig(i), rng = new RNG(1000 + i * 97 + (keepQ ? 0 : (Math.random() * 1000) | 0)), S = this.figS;
    this.idx = i; this.F = F; this.act = act; this.near = 0; this.hintT = 0; this.cardShown = false; this.solvedT = -1; this.perfT = -1; this.hints = 0; this.playT = 0;
    this.pose = sfNewPose(F); this.evI = 0; this.glowPolys = null;
    // dinlenme silüeti (perde koordinatı, ölçekli)
    const rest = sfToWall(F, sfPose(F, this.pose)).filter((r) => !r.prop);
    const sc = (p) => { const o = new Array(p.length); for (let k = 0; k < p.length; k++) o[k] = p[k] * S; return o; };
    const all = rest.map((r) => sc(Array.from(r.p)));
    this.restPolys = all;
    // heykeller: tanım "groups" verirse her grup ayrı döner (katman kimliğine göre)
    const gdef = F.def.groups || null, gOf = (id) => { if (!gdef) return 0; const k = gdef.findIndex((g) => g.includes(id)); return k < 0 ? 0 : k; };
    const nG = gdef ? gdef.length : 1;
    this.root.position.set(0, 0, 0); this.root.quaternion.identity();
    this.grp = []; this.grpMats = [];
    const Lp = this.lamp, P3 = (C, u, v, s) => new THREE.Vector3(Lp.x + s * (this.WC.x + u - Lp.x) - C.x, Lp.y + s * (this.WC.y + v - Lp.y) - C.y, Lp.z + s * (ST_WZ - Lp.z) - C.z);
    let decoLeft = Math.min(9, 4 + i);
    for (let gi = 0; gi < nG; gi++) {
      const ks = rest.map((_, k) => k).filter((k) => gOf(rest[k].id) === gi);
      const outers = ks.filter((k) => !rest[k].hole).map((k) => all[k]), holes = ks.filter((k) => rest[k].hole).map((k) => all[k]);
      if (!outers.length) continue;
      const [bx0, by0, bx1, by1] = stBBox(outers.flat()), gx = (bx0 + bx1) / 2, gy = (by0 + by1) / 2;
      const Cg = new THREE.Vector3(Lp.x + this.sC * (this.WC.x + gx - Lp.x), Lp.y + this.sC * (this.WC.y + gy - Lp.y), Lp.z + this.sC * (ST_WZ - Lp.z));
      const gr = new THREE.Group(); gr.position.copy(Cg); this.root.add(gr);
      const mats = act.mats.map((m) => (nG > 1 ? this.M[m].clone() : this.M[m])); if (nG > 1) this.grpMats.push(...mats);
      const G = { gi, root: gr, C: Cg, lampL: Lp.clone().sub(Cg), q: new THREE.Quaternion(), yaw: 0, pitch: 0, w: new THREE.Vector2(), lock: false, lockT: -1, mats, polys: outers, hl: 0 };
      this.grp.push(G);
      // dış konturlar + içerdikleri delikler (başka katmanın deliği de olabilir: baykuşun yüz diski)
      const frags = [];
      for (const o of outers) {
        const hs = holes.filter((h) => stWinding(h[0], h[1], [o]) !== 0);
        const A = Math.abs(sfArea(o));
        if (A < 0.5) { frags.push({ o, hs }); continue; }
        let parts = [{ o, hs }]; const cuts = A > 2.5 ? 2 : 1;
        for (let c = 0; c < cuts; c++) {
          const big = parts.reduce((a, p) => (Math.abs(sfArea(p.o)) > Math.abs(sfArea(a.o)) ? p : a)), [cx, cy] = stCentroid(big.o);
          for (let tr = 0; tr < 12; tr++) {
            const an = rng.range(0, PI), a = Math.cos(an), b = Math.sin(an), cc = -(a * (cx + rng.range(-0.15, 0.15)) + b * (cy + rng.range(-0.15, 0.15)));
            // delik ikiye bölünmesin
            if (big.hs.some((h) => { let pos = 0, neg = 0; for (let k = 0; k < h.length; k += 2) (a * h[k] + b * h[k + 1] + cc > 0 ? pos++ : neg++); return pos && neg; })) continue;
            const sp = stSplit(big.o, a, b, cc); if (sp.length < 2) continue;
            parts = parts.filter((p) => p !== big).concat(sp.map((q) => ({ o: q, hs: big.hs.filter((h) => stWinding(h[0], h[1], [q]) !== 0) })));
            break;
          }
        }
        for (const p of parts) frags.push(p);
      }
      // derinlikler: ışın boyunca karışık; kalınlık parçaya göre
      const nF = frags.length, depths = frags.map((_, k) => lerp(-1.25, 1.25, (k + 0.5) / nF) + rng.range(-0.2, 0.2));
      for (let k = nF - 1; k > 0; k--) { const j = rng.int(0, k); [depths[k], depths[j]] = [depths[j], depths[k]]; }
      const T = { lamp: Lp, WC: this.WC, C: Cg };
      frags.forEach((f, k) => {
        const th = clamp(Math.sqrt(Math.abs(sfArea(f.o))) * rng.range(0.14, 0.32), 0.07, 0.42), d = depths[k];
        const s0 = this.sC + (d - th / 2) / this.rayLen, s1 = this.sC + (d + th / 2) / this.rayLen;
        const g = stFrustum(T, f.o, f.hs, s0, s1, 0.028), mat = mats[k % mats.length];
        const mesh = new THREE.Mesh(g, mat); const pg = new THREE.Group(); pg.add(mesh);
        gr.add(pg); this.meshes.push(mesh); mesh.userData.gi = this.grp.length - 1;
        this.pieces.push({ G, g: pg, mesh, ph: rng.range(0, TAU), amp: rng.range(0.012, 0.03), dir: new THREE.Vector3(rng.range(-1, 1), rng.range(-0.3, 1), rng.range(-0.6, 1)).normalize(), spin: new THREE.Vector3(rng.range(-3, 3), rng.range(-3, 3), rng.range(-3, 3)), d, glow: 0, dis: rng.range(0, 0.35) });
      });
      const inside = (x, y, r) => { for (let a = 0; a < 12; a++) if (stWinding(x + Math.cos((a / 12) * TAU) * r, y + Math.sin((a / 12) * TAU) * r, all) === 0) return false; return stWinding(x, y, outers) !== 0; };
      // pirinç pimler: üst üste binen kırıkları ışın boyunca bağlar (gölgesi nokta)
      const pins = [];
      for (let k = 0; k < frags.length && pins.length < (nG > 1 ? 3 : 5); k++) {
        for (let tries = 0; tries < 30; tries++) {
          const [x0, y0, x1, y1] = stBBox(frags[k].o), x = rng.range(x0, x1), y = rng.range(y0, y1);
          if (stWinding(x, y, [frags[k].o]) === 0 || !inside(x, y, 0.07)) continue;
          const j = frags.findIndex((f, jj) => jj !== k && Math.abs(depths[jj] - depths[k]) > 0.3 && Math.abs(depths[jj] - depths[k]) < 0.95 && stWinding(x, y, [f.o]) !== 0);
          if (j < 0) continue; pins.push([x, y, Math.min(depths[k], depths[j]), Math.max(depths[k], depths[j])]); break;
        }
      }
      // süs: cam boncuklar ve pirinç küreler (gölgeleri silüetin içinde kalır)
      const deco = [], nDeco = gi === nG - 1 ? decoLeft : Math.ceil(decoLeft / (nG - gi));
      for (let k = 0, tries = 0; k < nDeco && tries < 500; tries++) {
        const r = rng.range(0.06, 0.13), x = rng.range(bx0, bx1), y = rng.range(by0, by1), d = rng.range(-1.6, 1.6), s = this.sC + d / this.rayLen;
        if (!inside(x, y, (r / s) * 1.25)) continue; deco.push([x, y, d, r, rng.chance(0.45)]); k++;
      }
      decoLeft -= deco.length;
      for (const [x, y, d0, d1] of pins) {
        const a = P3(Cg, x, y, this.sC + d0 / this.rayLen), b = P3(Cg, x, y, this.sC + d1 / this.rayLen), len = a.distanceTo(b), pg = new THREE.Group();
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 8), this.M.brass); rod.position.copy(a).lerp(b, 0.5); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); pg.add(rod);
        for (const e of [a, b]) { const bead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), this.M.brass); bead.position.copy(e); pg.add(bead); }
        gr.add(pg); pg.children.forEach((m) => { m.userData.gi = this.grp.length - 1; this.meshes.push(m); });
        this.pieces.push({ G, g: pg, mesh: rod, ph: 0, amp: 0, dir: new THREE.Vector3(0, 1, 0), spin: new THREE.Vector3(1, 2, 0), d: (d0 + d1) / 2, glow: 0, dis: 0.1, pin: true });
      }
      for (const [x, y, d, r, glass] of deco) {
        const s = this.sC + d / this.rayLen, m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), glass ? this.M.glass : this.M.brass);
        m.position.copy(P3(Cg, x, y, s)); m.userData.glass = glass; m.userData.gi = this.grp.length - 1; const pg = new THREE.Group(); pg.add(m); gr.add(pg); this.meshes.push(m);
        this.pieces.push({ G, g: pg, mesh: m, ph: rng.range(0, TAU), amp: rng.range(0.01, 0.025), dir: new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize(), spin: new THREE.Vector3(rng.range(-3, 3), rng.range(-3, 3), rng.range(-3, 3)), d, glow: 0, dis: rng.range(0, 0.3) });
      }
      // başlangıç yönelimi (her heykel ayrı)
      const pv = prev && prev[this.grp.length - 1];
      if (pv) { G.q.copy(pv.q); G.yaw = pv.yaw; G.pitch = pv.pitch; G.lock = pv.lock; }
      else {
        const sgn = rng.sign();
        G.yaw = sgn * (act.axes === 1 ? rng.range(1.5, 2.8) : rng.range(0.9, 2.2)); G.pitch = act.axes >= 2 ? rng.sign() * rng.range(i < 3 ? 0.3 : 0.35, i < 3 ? 0.55 : 0.8) : 0;
        if (act.axes >= 3) G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, rng.sign() * rng.range(0.3, 0.7), 'YXZ'));
        else G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, 0, 'YXZ'));
      }
      gr.quaternion.copy(G.q);
    }
    this.sel = 0;
    SM.setProxies(this.meshes);
    // ipucu hedefi
    SM.renderTarget(this.toWorld(all));
    this.assembleT = 0; this.lastSec = -1; this.wallU.uOut.value = 0;
    $('#thHint').classList.remove('used');
    this.updateDom();
    stMus.begin(i); stAmb.begin(i); this.figPan = 0;
  },
  clearPieces() {
    for (const p of this.pieces) { this.root.remove(p.g); p.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.userData && m.userData.mat0) { m.material.dispose(); m.userData.mat0 = null; } }); }
    this.pieces = []; this.meshes = []; this.emb && (this.emb.length = 0);
    if (this.grp) for (const G of this.grp) this.root.remove(G.root);
    if (this.grpMats) { for (const m of this.grpMats) m.dispose(); this.grpMats = []; }
    this.grp = [];
  },
  toWorld(polys) { const S = 1, o = []; for (const p of polys) { const q = new Array(p.length); for (let k = 0; k < p.length; k += 2) { q[k] = this.WC.x + p[k] * S; q[k + 1] = this.WC.y + p[k + 1] * S; } o.push(q); } return o; },
  figWorld() {
    const F = this.F, S = this.figS, out = [], front = [], back = [], polys = sfPose(F, this.pose);
    for (const r of polys) { const p = r.p, q = new Array(p.length); for (let k = 0; k < p.length; k += 2) { q[k] = this.WC.x + (p[k] - F.cx) * F.sc * S; q[k + 1] = this.WC.y - (p[k + 1] - F.cy) * F.sc * S; } (r.glow ? (r.back ? back : front) : out).push(q); }
    this.glowPolys = { front, back };
    return out;
  },
  /* ----- arayüz ----- */
  buildDom() {
    const dots = $('#thDots'); dots.innerHTML = '';
    this.dots = ST_ACTS.map((_, k) => { const d = document.createElement('i'); d.addEventListener('click', (e) => { e.stopPropagation(); this.jump(k); }); dots.appendChild(d); return d; });
  },
  unlocked(k) { const sv = Save.data.theater || []; return k === 0 || sv.includes(k) || sv.includes(k - 1); },
  jump(k) { if (k === this.idx || !this.unlocked(k) || this.state === 'closing') return; audio.ui(); this.changeAct(k); },
  updateDom() {
    const sv = Save.data.theater || [], stars = Save.data.thStars || {};
    this.dots.forEach((d, k) => { d.classList.toggle('on', k === this.idx); d.classList.toggle('ok', sv.includes(k)); d.classList.toggle('lock', !this.unlocked(k)); d.title = stars[k] ? '★'.repeat(stars[k]) : ''; });
    $('#thAct').textContent = `${ST_ROMAN[this.idx]}. perde`;
    $('#theater').classList.remove('solved'); $('#thTime').textContent = '0:00';
    const two = this.grp.length > 1;
    const ax = two ? `<em>İki heykel</em> var: dokunduğun döner, ikisini de hizala.` : this.act.axes === 1 ? 'Heykeli parmağınla <em>sağa sola</em> çevir.' : this.act.axes === 2 ? 'Bu kez <em>yukarı aşağı</em> da dönüyor.' : 'Artık heykel <em>her yöne</em> döner.';
    $('#thMsg').innerHTML = `<b>${this.act.riddle}…</b><br>${ax}${this.idx === 0 && !(Save.data.theater || []).length ? '<span class="swipe"><i></i></span>' : ''}`; $('#thMsg').classList.add('on');
  },
  open(from) {
    this.init(); this.from = from || 'title'; this.active = true;
    const sv = Save.data.theater || []; let i = 0; while (sv.includes(i) && i < ST_ACTS.length - 1) i++;
    this.build(i); audio.setChapter(8); this.t = 0; this.camIn = 0; this.state = 'intro'; this.stT = 0; this.curtain = 1; this.lampOn = 0;
    try { this.apply(); this.update(0); const pt = renderer.getRenderTarget(); renderer.setRenderTarget(post.rtScene); renderer.compile(stScene, stCam); renderer.setRenderTarget(pt); } catch (e) { console.warn('tiyatro derleme', e); }
    G.state = 'theater'; UI.hideAll(); UI.hud(false); UI.show('theater'); audio.setTheater(true);
    audio.whoosh(true, 1.0, 0.06); audio.theaterOpen();
  },
  close() {
    this.active = false; this.state = 'idle';
    this.clearPieces(); SM.setProxies([]);
    stMus.end(); stAmb.end(); audio.setTheater(false); audio.setChapter(G.lv ? G.lv.spec.ch : 0); UI.hide('theater');
    if (this.from === 'map') openMap();
    else { G.state = 'title'; G.stateT = 99; G.userSun = true; UI.show('title'); }
  },
  changeAct(k) { this.nextIdx = k; this.state = 'closing'; this.stT = 0; $('#theater').classList.remove('solved'); $('#thMsg').classList.remove('on'); audio.whoosh(false, 0.9, 0.05); },
  next() { if (this.idx >= ST_ACTS.length - 1) { this.close(); return; } audio.ui(); this.changeAct(this.idx + 1); },
  replay() { if (this.perfT < 0) return; audio.ui(); stMus.replay(); this.perfT = 0; this.wallU.uOut.value = 0; this.evI = 0; this.cardShown = false; $('#theater').classList.remove('solved'); },
  hint() {
    if (this.state !== 'play') return; this.hintT = 3.2; this.hints++; audio.sprite(1); haptic(10);
    // yarı yola it: hedefe doğru döndür (kilitlenmemiş her heykel)
    for (const G of this.grp) { if (G.lock) continue; if (this.act.axes < 3) { G.yaw *= 0.55; G.pitch *= 0.55; G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, 0, 'YXZ')); } else G.q.slerp(new THREE.Quaternion(), 0.45); G.w.set(0, 0); }
    $('#thHint').classList.add('used');
  },
  /* ----- dokunma ----- */
  // birden çok heykelde: parmağın altındaki (ya da ekranda en yakın) kilitlenmemiş heykel seçilir
  pick(e) {
    const free = this.grp.filter((G) => !G.lock); if (free.length <= 1) return free.length ? free[0].gi : this.sel;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), rc = this.rc || (this.rc = new THREE.Raycaster());
    rc.setFromCamera(ndc, stCam);
    const hit = rc.intersectObjects(this.meshes.filter((m) => !this.grp[m.userData.gi].lock), false)[0];
    if (hit) return hit.object.userData.gi;
    let best = free[0].gi, bd = 1e9;
    for (const G of free) { const v = G.C.clone().project(stCam), d = Math.hypot(v.x - ndc.x, (v.y - ndc.y) * innerHeight / innerWidth); if (d < bd) { bd = d; best = G.gi; } }
    return best;
  },
  down(e) { if (this.state !== 'play') return; this.sel = this.pick(e); const G = this.grp[this.sel]; this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), g: this.sel }; if (G) G.w.set(0, 0); $('#thMsg').classList.remove('on'); if (this.grp.length > 1 && G) { G.hl = 1; haptic(5); } },
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    const now = performance.now(), dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(8, now - d.t) / 1000; d.x = e.clientX; d.y = e.clientY; d.t = now;
    const G = this.grp[d.g]; if (!G) return;
    // hedefe yaklaştıkça hassas ayar: aynı parmak hareketi daha az döndürür (radyo ayarı gibi)
    const k = 0.0078 * lerp(1, 0.38, smoothstep(deg(22), deg(3), this.angle(G))); this.rot(dx * k, dy * k, d.g);
    stMus.turn(Math.hypot(dx * k, dy * k), Math.sign(dx || dy), this.near);
    G.w.set(lerp(G.w.x, (dx * k) / dt, 0.4), lerp(G.w.y, (dy * k) / dt, 0.4));
    audio.theaterCreak(Math.min(1, Math.hypot(dx, dy) * 0.03));
  },
  up(e) { const d = this.drag; if (!d || e.pointerId !== d.id) return; this.drag = null; const G = this.grp[d.g]; if (G && performance.now() - d.t > 80) G.w.set(0, 0); },
  rot(a, b, gi = this.sel) {
    const G = this.grp[gi];
    if (this.state !== 'play' || !G || G.lock || (!a && !b)) return;
    const ax = this.act.axes;
    if (ax < 3) { G.yaw += a; if (ax === 2) G.pitch = clamp(G.pitch + b, -1.3, 1.3); G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, 0, 'YXZ')); return; }
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), b); G.q.premultiply(qy).premultiply(qx).normalize();
  },
  // klavye: Tab ile heykel değiştir
  cycle() { if (this.state !== 'play') return; const free = this.grp.filter((G) => !G.lock); if (free.length < 2) return; const k = free.findIndex((G) => G.gi === this.sel); this.sel = free[(k + 1) % free.length].gi; this.grp[this.sel].hl = 1; audio.ui(); },
  angle(G = this.grp[0]) { return G ? 2 * Math.acos(Math.min(1, Math.abs(G.q.w))) : 0; },
  align() { for (const G of this.grp) { G.yaw = 0; G.pitch = 0; G.q.identity(); G.w.set(0, 0); } },
  lockG(G) {
    G.lock = true; G.q.identity(); G.yaw = 0; G.pitch = 0; G.w.set(0, 0); G.lockT = this.t;
    if (this.grp.some((g) => !g.lock)) { stMus.lock(); haptic([10, 30, 10]); const nx = this.grp.find((g) => !g.lock); if (nx) this.sel = nx.gi; if (this.drag && this.drag.g === G.gi) this.drag = null; }
  },
  /* ----- kare ----- */
  update(dtR) {
    if (!this.active) return;
    this.t += dtR; this.stT += dtR; const t = this.t;
    this.beamU.uTime.value = t; this.wallU.uTime.value = t;
    // perde (ön perdeler) ve kandil
    if (this.state === 'intro') {
      this.curtain = 1 - Ease.inOutCubic(clamp01((this.stT - 0.15) / 1.3));
      this.lampOn = clamp01((this.stT - 0.5) / 0.9);
      if (this.stT > 0.25 && !this.introSfx) { this.introSfx = true; audio.whoosh(true, 1.4, 0.05); }
      if (this.stT > 0.5 && !this.lampSfx) { this.lampSfx = true; if (audio.ok) { const t0 = audio.t; audio.noiseHit(t0, 0.12, 0.07, { type: 'highpass', f: 2500 }); audio.noiseHit(t0 + 0.05, 0.9, 0.05, { type: 'bandpass', f: 600, f1: 1400, q: 0.7, a: 0.15, verb: 0.4 }); for (let k = 0; k < 6; k++) audio.noiseHit(t0 + 0.1 + Math.random() * 0.6, 0.02, 0.025, { type: 'highpass', f: 4000 }); } }
      if (this.stT > 1.5) { this.state = 'play'; this.stT = 0; this.introSfx = false; this.lampSfx = false; }
    } else if (this.state === 'closing') {
      this.curtain = Ease.inOutCubic(clamp01(this.stT / 0.9)); this.lampOn = Math.max(0, 1 - this.stT / 0.7);
      if (this.stT > 1.0) { this.build(this.nextIdx); this.state = 'intro'; this.stT = 0; }
    }
    if (this.state === 'play') {
      this.playT += dtR; const sec = Math.floor(this.playT); if (sec !== this.lastSec) { this.lastSec = sec; $('#thTime').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
      let nearSum = 0;
      for (const G of this.grp) {
        if (G.lock) { nearSum += 1; continue; }
        const held = this.drag && this.drag.g === G.gi;
        if (!held) { this.rot(G.w.x * dtR, G.w.y * dtR, G.gi); G.w.multiplyScalar(Math.exp(-dtR * 3.2)); }
        const ang = this.angle(G);
        const mag = deg(this.act.mag || (this.grp.length > 1 ? 7 : [0, 4.5, 6, 9][this.act.axes]));
        if (ang < mag && !held && G.w.length() < 0.7) { if (this.act.axes < 3) { const k = 1 - Math.exp(-dtR * 6); G.yaw = lerp(G.yaw, Math.round(G.yaw / TAU) * TAU, k); G.pitch = lerp(G.pitch, 0, k); G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, 0, 'YXZ')); } else G.q.slerp(new THREE.Quaternion(), 1 - Math.exp(-dtR * 6)); G.w.multiplyScalar(0.8); }
        if (this.angle(G) < deg(1.3)) this.lockG(G);
        nearSum += clamp01(1 - this.angle(G) / deg(75));
      }
      if (this.grp.every((G) => G.lock)) this.solve();
      const prevN = this.near; this.near = damp(this.near, nearSum / Math.max(1, this.grp.length), 5, dtR);
      if (Math.floor(this.near * 6) > Math.floor(prevN * 6) && this.near > 0.5) haptic(6);
    } else this.near = damp(this.near, 0, 3, dtR);
    // heykeller: seçili olan hafifçe kor gibi ısınır, kilitlenen bir an parlar
    const multi = this.grp.length > 1;
    for (const G of this.grp) {
      G.root.quaternion.copy(G.q);
      if (multi && this.solvedT < 0) {
        const held = this.drag && this.drag.g === G.gi, sel = this.state === 'play' && G.gi === this.sel && !G.lock;
        G.hl = damp(G.hl, held ? 1 : sel ? 0.45 : 0, 6, dtR);
        const fl = G.lockT >= 0 ? Math.exp(-(t - G.lockT) * 3.2) : 0, e = 0.05 * G.hl * (0.85 + 0.15 * Math.sin(t * 6)) + 0.28 * fl;
        for (const m of G.mats) m.emissive.setRGB(e * 1.0, e * 0.5, e * 0.18);
      }
    }
    // parçalar: kandil noktasına göre ölçeklenerek nefes alır — gölge değişmez
    const asm = 1 - Ease.outCubic(clamp01(this.assembleT / 1.5)); this.assembleT += dtR;
    const sv = this.solvedT >= 0 ? this.t - this.solvedT : -1;
    for (const p of this.pieces) {
      const k = 1 + Math.sin(t * 0.9 + p.ph) * p.amp, g = p.g;
      g.scale.setScalar(k); g.position.copy(p.G.lampL).multiplyScalar(1 - k);
      if (asm > 0.001) { g.position.addScaledVector(p.dir, asm * 7); g.rotation.set(p.spin.x * asm, p.spin.y * asm, p.spin.z * asm); } else g.rotation.set(0, 0, 0);
      if (sv >= 0) {
        // çözüldü: kenarlar kor gibi parlar, parça kıvılcıma dönüşüp dağılır
        const u = clamp01((sv - 0.15 - p.dis) / 0.75);
        g.visible = u < 1; const s = 1 - Ease.inCubic(u) * 0.9; g.scale.multiplyScalar(s);
        g.position.addScaledVector(p.dir, Ease.inCubic(u) * 0.6); g.rotation.set(p.spin.x * u * 0.15, p.spin.y * u * 0.15, p.spin.z * u * 0.15);
        const gl = clamp01(sv / 0.25) * (1 - u);
        g.traverse((m) => { if (m.isMesh) { if (!m.userData.mat0) { m.userData.mat0 = m.material; m.material = m.material.clone(); } m.material.emissive = m.material.emissive || new THREE.Color(); m.material.emissive.setRGB(1.1 * gl, 0.42 * gl, 0.1 * gl); } });
        if (u > 0 && u < 1 && Math.random() < dtR * 70) this.spawnEmber(p);
      }
    }
    this.updateEmbers(dtR);
    // gölge maskesi
    let polys = null, bigBlur = 0;
    // oynarken: heykel perdeden uzakta, ince bir yarı-gölge; çözülünce gölge perdeye yapışır ve keskinleşir
    const crisp = sv >= 0 ? smoothstep(0.0, 0.45, sv) : smoothstep(0.55, 1, this.near) * 0.35;
    if (sv >= 0) {
      if (sv > 1.1) {
        if (this.perfT < 0) this.perfT = 0; else this.perfT += dtR;
        sfResetPose(this.F, this.pose); this.F.def.perform(this.perfT, this.pose);
        const ev = this.F.def.events || []; while (this.evI < ev.length && this.perfT >= ev[this.evI][0]) { const e = ev[this.evI][1]; audio.withPan(this.figPan || 0, () => stSfx(this.F.def.key, e)); stMus.accent(); this.evI++; }
        if (this.perfT > this.F.def.dur && !this.cardShown) { this.cardShown = true; this.showCard(); }
        bigBlur = this.pose.k.blur || 0; this.wallU.uOut.value = smoothstep(0.3, 0.8, bigBlur);
      } else sfResetPose(this.F, this.pose);
      polys = this.figWorld();
      // ses konumu: gölgenin perdedeki yatay yeri
      let x0 = 1e9, x1 = -1e9; for (const p of polys) for (let k = 0; k < p.length; k += 8) { if (p[k] < x0) x0 = p[k]; if (p[k] > x1) x1 = p[k]; }
      if (x1 > x0) this.figPan = clamp(((x0 + x1) / 2 - this.WC.x) / 3.2, -1, 1) * 0.8;
    }
    const blurPx = lerp(Math.max(2.2, 0.026 * this.pxu), 1.7, crisp) + bigBlur * 0.09 * this.pxu;
    this.wallU.uSoft.value = lerp(0.22, 0.0, crisp) + bigBlur * 0.45;
    this.root.updateMatrixWorld(true);
    SM.render(sv < 0, polys, blurPx, sv >= 0 ? this.glowPolys : null);
    // figür ışıklarının rengi ve şiddeti (pose.k.gI)
    const gc = this.F.def.glowCol || [1.0, 0.66, 0.3], gI = sv >= 0 ? (this.pose.k.gI ?? 1) * 2.4 * this.lampOn : 0;
    this.wallU.uGlowC.value.setRGB(gc[0] * gI, gc[1] * gI, gc[2] * gI);
    // kandil titremesi ve ışık şiddeti
    const flick = 1 + Math.sin(t * 13.1) * 0.012 + Math.sin(t * 7.3 + 1) * 0.016 + Math.sin(t * 23.7) * 0.006;
    const flare = sv >= 0 ? Math.exp(-sv * 2.2) * 0.9 : 0, lampI = this.lampOn * flick * (1 + this.near * 0.18 + flare);
    const I = 820 * lampI;
    this.wallU.uLampCol.value.setRGB(1.0, 0.8, 0.58).multiplyScalar(I);
    this.spot.intensity = I * 0.62; this.hemi.intensity = 0.35 + this.lampOn * 0.25; this.rim.intensity = 0.5 * this.lampOn;
    this.beamU.uAmt.value = 0.06 * lampI; this.beamU.uLampCol.value.setRGB(1.0, 0.7, 0.4);
    this.wallU.uGlow.value = this.near * 0.6 + flare;
    // ipucu çizgisi
    this.hintT = Math.max(0, this.hintT - dtR);
    this.wallU.uHint.value = this.state === 'play' ? Math.max(Math.min(1, this.hintT) * 0.9, smoothstep(0.7, 0.95, this.near) * 0.25) : 0;
    // ön perdeler
    const vis = this.visibleHalfWidth(ST_WZ + 7.2) + 0.6, cc = this.curtain, cx = (this.WC.x + this.camP.x) / 2;
    this.frontL.position.set(cx - 4.4 - (1 - cc) * vis - (1 - cc) * 1.5, this.floorY + 10, ST_WZ + 7.2); this.frontR.position.set(cx + 4.4 + (1 - cc) * vis + (1 - cc) * 1.5, this.floorY + 10, ST_WZ + 7.2);
    this.frontL.visible = this.frontR.visible = cc > 0.002;
    this.foot.position.set(cx, this.floorY + 2.5, ST_WZ + 11); this.foot.intensity = 60 * Math.min(1, cc * 1.5);
    // kamera
    this.camIn = Math.min(1, (this.camIn || 0) + dtR / 2.4);
    const e = Ease.outCubic(this.camIn), P = this.camP.clone(), T = this.camT.clone();
    P.z += (1 - e) * 5; P.y += (1 - e) * 1.5; P.x += Math.sin(t * 0.17) * 0.18; P.y += Math.sin(t * 0.23) * 0.1;
    if (sv >= 0) { const k = Ease.inOutCubic(clamp01((sv - 0.3) / 2.6)) * (this.portrait ? 0.32 : 0.4); P.lerp(new THREE.Vector3(this.WC.x, this.WC.y + (this.portrait ? 0.4 : 0.3), this.camP.z - 1), k); T.lerp(this.WC, k * 1.4); }
    const sh = G.trauma * G.trauma; P.x += Math.sin(t * 41) * sh * 0.12; P.y += Math.sin(t * 37) * sh * 0.1;
    stCam.position.copy(P); stCam.lookAt(T);
    this.curL.position.z = ST_WZ + 0.8 + Math.sin(t * 0.5) * 0.03; this.curR.position.z = ST_WZ + 0.8 + Math.sin(t * 0.47 + 1) * 0.03;
    // müzik ve ortam: durum, hizaya yakınlık, kandil ve gösteri
    const MS = { state: this.state, near: this.near, lamp: this.lampOn, perf: sv > 1.1, card: this.cardShown };
    try { stMus.update(dtR, MS); stAmb.update(dtR, MS); } catch (e) { console.warn('tiyatro sesi', e); }
  },
  spawnEmber(p) {
    if (this.emb.length >= this.embMax) return;
    const v = p.mesh.geometry.attributes.position, i = (Math.random() * v.count) | 0, w = new THREE.Vector3(v.getX(i), v.getY(i), v.getZ(i)).applyMatrix4(p.mesh.matrixWorld);
    this.emb.push({ x: w.x, y: w.y, z: w.z, vx: (Math.random() - 0.5) * 0.5, vy: 0.4 + Math.random() * 0.9, vz: (Math.random() - 0.5) * 0.5, life: 1.2 + Math.random() * 1.4, age: 0, s: 0.03 + Math.random() * 0.05, h: Math.random() });
  },
  updateEmbers(dt) {
    const E = this.emb, g = this.embers.geometry, P = g.attributes.position.array, S = g.attributes.aS.array, Cc = g.attributes.aC.array;
    for (let i = E.length - 1; i >= 0; i--) { const e = E[i]; e.age += dt; if (e.age > e.life) { E.splice(i, 1); continue; } e.vx += Math.sin(e.age * 3 + e.h * 9) * dt * 0.6; e.vy += dt * 0.25; e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; }
    for (let i = 0; i < this.embMax; i++) {
      const e = E[i]; if (!e) { S[i] = 0; continue; }
      const k = 1 - e.age / e.life, fl = 0.6 + 0.4 * Math.sin(e.age * 30 + e.h * 50);
      P[i * 3] = e.x; P[i * 3 + 1] = e.y; P[i * 3 + 2] = e.z; S[i] = e.s * (0.5 + k);
      Cc[i * 3] = 2.6 * k * fl; Cc[i * 3 + 1] = (1.0 + e.h * 0.6) * k * k * fl; Cc[i * 3 + 2] = 0.25 * k * k * k * fl;
    }
    g.attributes.position.needsUpdate = true; g.attributes.aS.needsUpdate = true; g.attributes.aC.needsUpdate = true;
  },
  solve() {
    this.state = 'solved'; for (const G of this.grp) { G.lock = true; G.q.identity(); G.yaw = 0; G.pitch = 0; G.w.set(0, 0); G.root.quaternion.identity(); G.hl = 0; for (const m of G.mats) if (this.grp.length > 1) m.emissive.setRGB(0, 0, 0); } this.drag = null;
    this.solvedT = this.t; this.perfT = -1; this.evI = 0; $('#thMsg').classList.remove('on');
    audio.theaterSolve(); stMus.solve(); haptic([20, 40, 20]); G.flash = 0.3; G.flashCol.set(1.0, 0.78, 0.48); G.trauma = Math.max(G.trauma, 0.25);
    const par = this.act.par, tt = this.playT, stars = this.hints === 0 && tt <= par ? 3 : this.hints <= 1 && tt <= par * 2.2 ? 2 : 1;
    this.stars = stars;
    const sv = Save.data.theater || (Save.data.theater = []); if (!sv.includes(this.idx)) sv.push(this.idx);
    const ss = Save.data.thStars || (Save.data.thStars = {}); ss[this.idx] = Math.max(ss[this.idx] || 0, stars); Save.save();
  },
  showCard() {
    $('#thName').textContent = this.F.def.name; $('#thLine').textContent = this.F.def.line;
    const last = this.idx >= ST_ACTS.length - 1;
    $('#thNext').textContent = last ? 'Perdeyi kapat' : 'Sonraki perde';
    $('#thCard .k').textContent = last ? 'Son perde · gölge canlandı' : 'Gölge canlandı';
    const st = $('#thStars'); st.innerHTML = '';
    for (let k = 0; k < 3; k++) { const s = document.createElement('i'); s.textContent = '★'; if (k < this.stars) { s.className = 'on'; s.style.animationDelay = `${0.25 + k * 0.18}s`; } st.appendChild(s); }
    const sec = Math.floor(this.playT); $('#thStat').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} · ${this.hints ? this.hints + ' ipucu' : 'ipucusuz'}`;
    $('#theater').classList.add('solved'); stApplause(this.stars); stMus.card(); for (let k = 0; k < this.stars; k++) setTimeout(() => audio.star(k, true), 300 + k * 180);
    this.updateDots();
  },
  updateDots() { const sv = Save.data.theater || []; this.dots.forEach((d, k) => { d.classList.toggle('ok', sv.includes(k)); d.classList.toggle('lock', !this.unlocked(k)); }); },
  apply() {
    // kalite değişti: maske çözünürlüğü, huzme adımları, toz sayısı
    if (this.qLevel !== Perf.level) { const first = this.qLevel === undefined; this.qLevel = Perf.level; if (!first && this.inited && this.lamp) { SM.alloc(ST_MASK_RES[Perf.level] || 1536); this.pxu = SM.res / SM.size; this.wallU.tMask.value = SM.b.texture; this.wallU.tTgt.value = SM.tB.texture; this.wallU.tGlowS.value = SM.gB.texture; this.wallU.tGlowH.value = SM.gD.texture; this.beamU.tMask.value = SM.b.texture; this.buildBeam(); this.buildDust(); SM.renderTarget(this.toWorld(this.restPolys)); } }
    const pu = post.u;
    pu.uExposure.value = 1.05 + this.near * 0.06; pu.uBloomAdd.value = 0.32 + this.near * 0.12; pu.uBloomMix.value = 0.05; pu.uRays.value = 0; pu.uSunVis.value = 0; pu.uNight.value = 0;
    pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0; pu.uVignette.value = 0.9;
    pu.uLift.value.set(0.012, 0.006, 0.0); pu.uGamma.value.set(1, 1, 1.04); pu.uGain.value.set(1.06, 1.0, 0.9); pu.uSat.value = 1.05; pu.uContrast.value = 1.1;
    pu.uTilt.value = 0; pu.uGrain.value = 0.035;
    this.dustU.uPx.value = renderer.domElement.height / (2 * Math.tan(deg(stCam.fov / 2)));
  },
  resize(w, h) {
    stCam.aspect = w / h; stCam.updateProjectionMatrix(); if (!this.active) return;
    const was = this.portrait; this.layout(); if (was === this.portrait) return;
    const solved = this.solvedT >= 0, st = this.state; this.build(this.idx, true);
    if (solved) { this.solvedT = this.t - 1.2; this.perfT = 0; this.state = 'solved'; for (const p of this.pieces) p.g.visible = false; } else if (st === 'play') this.state = 'play';
  },
};
