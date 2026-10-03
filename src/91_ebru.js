
/* =====================================================================
   EBRU ATÖLYESİ — su üstünde nakış (Lale dersi + serbest atölye)
   Desen motoru: ebrunun matematiksel modeli (damla, biz, tarak); her hamle
   desen dokusuna geri-izleme ile işlenir. Damla alanı korur: boya iter,
   biz sürükler; keskinlik için Catmull–Rom örnekleme, hareketsiz yerde birebir.
   ===================================================================== */
const EB_W = 1.0, EB_H = 1.4, EB_MAXOPS = 160;
// geleneksel ebru boyaları (sRGB)
const EB_PAL = ['#ece3cf', '#26386e', '#86a6c9', '#b3262a', '#e8a3ad', '#e3b23c', '#3d7b4a', '#2e8f9c', '#6e4f99', '#241e1b', '#a9642f', '#f6f0e1'];
const EB_NAMES = ['', 'lacivert', 'gök mavisi', 'al', 'gül', 'safran', 'yeşil', 'firuze', 'mor', 'is karası', 'toprak', 'ak'];
const EB_FREE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const ebHex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/* ---------- desen işleme: yeni hamleler eski desene geri-izlenir ---------- */
const EB_BAKE_F = /* glsl */`
uniform sampler2D tOld, tOps; uniform int uN; uniform vec2 uSize, uTex; uniform vec3 uPal[12]; uniform vec3 uSeam;
varying vec2 vUv;
float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
// Catmull–Rom (5 okumalı): köşe ağırlıkları atılır, kenarlar yumuşamadan örneklenir
vec3 cr(vec2 uv) {
  vec2 sp = uv * uTex, t1 = floor(sp - 0.5) + 0.5, f = sp - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2, t12 = (t1 + w2 / w12) / uTex, t0 = (t1 - 1.0) / uTex, t3 = (t1 + 2.0) / uTex;
  float a = w12.x * w0.y, b = w0.x * w12.y, c = w12.x * w12.y, d = w3.x * w12.y, e = w12.x * w3.y;
  vec3 r = texture2D(tOld, vec2(t12.x, t0.y)).rgb * a + texture2D(tOld, vec2(t0.x, t12.y)).rgb * b + texture2D(tOld, t12).rgb * c + texture2D(tOld, vec2(t3.x, t12.y)).rgb * d + texture2D(tOld, vec2(t12.x, t3.y)).rgb * e;
  return r / (a + b + c + d + e);
}
float sd(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0); return length(pa - ba * h); }
void main() {
  vec2 p = vUv * uSize, p0 = p; float seam = 0.0; vec3 col = vec3(0.0); bool hit = false;
  for (int i = 0; i < MAXOPS; i++) {
    if (i >= uN) break;
    int j = uN - 1 - i; vec4 a = texelFetch(tOps, ivec2(j * 2, 0), 0), b = texelFetch(tOps, ivec2(j * 2 + 1, 0), 0);
    if (a.x < 1.5) {
      // damla: merkez a.yz, alan artışı a.w; renk b.x, şimdiki yarıçap b.y, tohum b.z
      vec2 d = p - a.yz; float dd = dot(d, d);
      if (dd < a.w) {
        vec3 c = uPal[int(b.x + 0.5)]; vec2 q = (p - a.yz) * 160.0 + b.z;
        float g = vn(q) * 0.55 + vn(q * 3.1) * 0.3 + vn(q * 9.3) * 0.15;
        c *= 0.93 + 0.13 * g;
        c *= 1.0 - 0.16 * smoothstep(0.78, 1.0, sqrt(dd) / max(b.y, 1e-5));
        col = c; hit = true; break;
      }
      p = a.yz + d * sqrt(max(0.0, 1.0 - a.w / dd));
    } else if (a.x < 2.5) {
      // biz: A=a.yz → B=(a.w, b.x), genişlik b.y; ters dönüşüm iki adımlı sabit nokta
      vec2 A = a.yz, B = vec2(a.w, b.x), v = B - A; float l2 = b.y * b.y;
      float d1 = sd(p, A, B); vec2 p1 = p - v * exp(-d1 * d1 / l2);
      float d2 = sd(p1, A, B); p = p - v * exp(-d2 * d2 / l2);
    } else {
      // öd sınırı: damlanın dışında ince açık çizgi (merkez a.yz, yarıçap a.w, genişlik b.x, güç b.y)
      float dr = length(p - a.yz) - a.w;
      seam = max(seam, b.y * (1.0 - smoothstep(0.0, b.x, abs(dr - b.x * 0.5))) * step(-0.0005, dr));
    }
  }
  if (!hit) {
    vec2 uv = p / uSize, dp = (p - p0) / uSize * uTex;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) col = uPal[0];
    else if (dot(dp, dp) < 2e-4) col = texelFetch(tOld, ivec2(vUv * uTex), 0).rgb; // kıpırdamayan yer bulanıklaşmasın
    else col = clamp(cr(uv), 0.0, 1.0);
  }
  gl_FragColor = vec4(mix(col, uSeam, seam), 1.0);
}`;
// kopya / küçültme
const EB_COPY_F = /* glsl */`uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }`;
const EB_FILL_F = /* glsl */`uniform vec3 uCol; varying vec2 vUv; void main(){ gl_FragColor = vec4(uCol, 1.0); }`;
// kâğıda baskı: boya kâğıt liflerine işler, kenarda tırtıklı kâğıt payı kalır
const EB_PRINT_F = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTex; varying vec2 vUv;
float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec2 px = 1.0 / uTex; vec3 c = texture2D(tSrc, vUv).rgb * 0.6;
  c += (texture2D(tSrc, vUv + vec2(px.x, 0.0)).rgb + texture2D(tSrc, vUv - vec2(px.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, px.y)).rgb + texture2D(tSrc, vUv - vec2(0.0, px.y)).rgb) * 0.1;
  vec3 paper = vec3(0.95, 0.92, 0.85);
  float fib = vn(vUv * vec2(900.0, 120.0)) * 0.5 + vn(vUv * vec2(140.0, 1100.0)) * 0.3 + vn(vUv * 600.0) * 0.2;
  c = mix(c, paper, 0.05) * (0.965 + 0.06 * fib);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y) / 1.4), rag = 0.012 + 0.008 * vn(vUv * 70.0);
  c = mix(paper * (0.97 + 0.04 * fib), c, smoothstep(rag, rag + 0.01, e));
  gl_FragColor = vec4(c, 1.0);
}`;
/* ---------- su yüzeyi: desen, dalga, kırılma, pencere yansıması, menisküs, rehberler ---------- */
const EB_WATER_V = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const EB_WATER_F = /* glsl */`
uniform sampler2D tField; uniform vec2 uSize; uniform float uTime, uClear; uniform vec3 uBase, uLamp; uniform vec4 uRip[12];
uniform vec4 uRing[3]; uniform vec4 uArr[3]; uniform vec3 uArrA; uniform float uGlow;
varying vec2 vUv;
vec3 lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
float sd(vec2 p, vec2 a, vec2 b, out float h) { vec2 pa = p - a, ba = b - a; h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); return length(pa - ba * h); }
void main() {
  vec2 p = vUv * uSize, g = vec2(0.0);
  for (int i = 0; i < 12; i++) { vec4 R = uRip[i]; float age = uTime - R.z; if (age < 0.0 || age > 3.2 || R.w <= 0.0) continue; vec2 d = p - R.xy; float r = length(d) + 1e-5, x = r - age * 0.23; g += d / r * R.w * exp(-age * 1.4) * exp(-x * x * 700.0) * cos(x * 150.0); }
  g += 0.0016 * vec2(sin(p.y * 31.0 + uTime * 0.9) + sin((p.x + p.y) * 23.0 - uTime * 0.7), cos(p.x * 27.0 - uTime * 0.8) + sin((p.x - p.y) * 19.0 + uTime * 0.6));
  vec2 uv = clamp(vUv + g * vec2(0.006, 0.0045), 0.0, 1.0);
  vec3 col = mix(lin(texture2D(tField, uv).rgb), lin(uBase), uClear);
  col *= (1.0 - 0.2 * smoothstep(0.25, 1.35, length((p - uLamp.xy) / vec2(1.0, 1.15)))) * vec3(1.0, 0.975, 0.93);
  float e = min(min(p.x, uSize.x - p.x), min(p.y, uSize.y - p.y));
  col *= 0.7 + 0.3 * smoothstep(0.0, 0.032, e);
  col += vec3(1.0, 0.93, 0.82) * 0.07 * exp(-pow((e - 0.0055) * 480.0, 2.0));
  vec2 rq = (p + g * 5.0 - vec2(0.25, 1.17)) / vec2(0.3, 0.095); float win = exp(-pow(max(abs(rq.x), abs(rq.y)), 5.0));
  col += vec3(1.0, 0.95, 0.88) * (win * 0.1 + 0.03 * smoothstep(0.35, 1.4, p.y));
  // rehberler: kesik çizgili halka ve ok (suyun üstünde yüzer)
  vec3 gc = vec3(1.0, 0.94, 0.8); float ga = 0.0;
  for (int i = 0; i < 3; i++) { vec4 R = uRing[i]; if (R.w <= 0.0) continue; vec2 d = p - R.xy; float dist = abs(length(d) - R.z), an = atan(d.y, d.x); float dash = step(0.45, fract(an * 7.0 / 3.14159 + uTime * 0.25)); ga = max(ga, R.w * dash * (1.0 - smoothstep(0.0012, 0.0032, dist))); }
  for (int i = 0; i < 3; i++) { float A = i == 0 ? uArrA.x : i == 1 ? uArrA.y : uArrA.z; if (A <= 0.0) continue; vec2 a = uArr[i].xy, b = uArr[i].zw; float h; float dist = sd(p, a, b, h); float L = length(b - a); float dash = step(0.42, fract(h * L / 0.03 - uTime * 1.3));
    vec2 t = normalize(b - a), n = vec2(-t.y, t.x), q = p - b; float u = dot(q, t), w = dot(q, n); float head = (1.0 - smoothstep(0.0, 0.003, max(-u - 0.045, max(u, abs(w) - (-u) * 0.5)))); ga = max(ga, A * max(dash * (1.0 - smoothstep(0.0014, 0.0034, dist)) * step(h * L, L - 0.03), head * 0.9)); }
  col = mix(col, gc * (1.1 + 0.4 * uGlow), clamp(ga, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;
/* ---------- kâğıt: yatırılır (temas çizgisi soldan sağa), sol kenardan kıvrılarak kalkar ---------- */
const EB_PAPER_V = /* glsl */`
uniform float uLay, uLift, uR, uHover; varying vec2 vUv; varying vec3 vN; varying float vSoak;
void main() {
  vec3 p = position, n = vec3(0.0, 0.0, 1.0);
  p.z = uHover + max(0.0, p.x - uLay) * 0.5;
  float s = uLift - p.x;
  if (s > 0.0) { float th = s / uR; if (th < 3.14159) { p.x = uLift - uR * sin(th); p.z = uHover + uR * (1.0 - cos(th)); n = vec3(sin(th), 0.0, cos(th)); } else { p.x = uLift + (s - 3.14159 * uR); p.z = uHover + 2.0 * uR; n = vec3(0.0, 0.0, -1.0); } }
  vUv = uv; vN = normalize(normalMatrix * n); vSoak = clamp((uLay - position.x) / 0.28, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const EB_PAPER_F = /* glsl */`
uniform sampler2D tPrint; uniform float uSoak; uniform vec3 uLight; varying vec2 vUv; varying vec3 vN; varying float vSoak;
float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  float fib = vn(vUv * vec2(700.0, 90.0)) * 0.5 + vn(vUv * vec2(110.0, 900.0)) * 0.3 + vn(vUv * 400.0) * 0.2;
  vec3 paper = vec3(0.86, 0.82, 0.73) * (0.95 + 0.07 * fib), ink = pow(texture2D(tPrint, vUv).rgb, vec3(2.2));
  vec3 n = normalize(gl_FrontFacing ? vN : -vN); float lam = 0.62 + 0.42 * max(0.0, dot(n, normalize(uLight)));
  vec3 col = gl_FrontFacing ? mix(paper, ink * 0.85 + paper * 0.12, 0.42 * vSoak * uSoak) : pow(texture2D(tPrint, vec2(1.0 - vUv.x, vUv.y)).rgb, vec3(2.2));
  gl_FragColor = vec4(col * lam, 1.0);
}`;

// çerçevedeki eser: baskı + cam parıltısı
const EB_ART_F = /* glsl */`uniform sampler2D tPrint; uniform float uSweep; varying vec2 vUv; void main(){ vec3 c = pow(texture2D(tPrint, vUv).rgb, vec3(2.2)); float k = vUv.x * 0.8 + vUv.y * 0.55, sh = smoothstep(0.35, 0.0, abs(k - 0.62)) * 0.05 + smoothstep(0.12, 0.0, abs(k - uSweep)) * 0.22; gl_FragColor = vec4(c * 0.96 + sh * vec3(1.0, 0.92, 0.78), 1.0); }`;

/* ---------- Lale dersi: adımlar (alan birimi, y yukarı) ---------- */
const EB_TC = [0.5, 0.88];
const EB_LALE = [
  { k: 'serp', cols: [1, 2], say: 'Hoş geldin evladım. Ebru acele sevmez. Önce zemini serpelim: parmağını suyun üstünde gezdir, fırça silkelensin.', tip: 'Zemini serp' },
  { k: 'damla', c: EB_TC, r: 0.15, col: 3, say: 'Şimdi lalenin kalbi. Halkanın ortasına basılı tut; damla büyüsün, halkayı doldurunca bırak.', tip: 'Basılı tut · halkada bırak' },
  { k: 'damla', c: EB_TC, r: 0.098, col: 4, say: 'İçine gül rengi… Yine ortasına basılı tut.', tip: 'Gül rengi damla' },
  { k: 'damla', c: EB_TC, r: 0.048, col: 5, say: 'Bir damla da güneşten. Küçük olsun, kalbi ısıtsın.', tip: 'Safran damla' },
  { k: 'cek', paths: [[[0.5, 0.64], [0.5, 1.16]]], lam: 0.024, say: 'Şimdi biz ile… Lalenin altından başla, okun üstünden tek nefeste yukarı çek. Ucu sivrilsin.', tip: 'Bizle yukarı çek' },
  { k: 'cek', paths: [[[0.5, 0.9], [0.5, 0.6]]], lam: 0.06, say: 'Lale ince belli olur. Bu kez ortasından aşağı çek; dibi daralsın.', tip: 'Bizle aşağı çek' },
  { k: 'sap', path: [[0.5, 0.6], [0.49, 0.43], [0.505, 0.24]], col: 6, say: 'Sapını çiz: lalenin ucundan aşağıya, okun üstünden sürükle.', tip: 'Sapı çiz' },
  { k: 'damla', multi: [[0.39, 0.36, 0.05], [0.61, 0.42, 0.05]], col: 6, say: 'Yapraklar… İki halkaya da yeşil damla bırak.', tip: 'İki yaprak damlası' },
  { k: 'cek', paths: [[[0.4, 0.33], [0.265, 0.56]], [[0.6, 0.39], [0.735, 0.62]]], lam: 0.016, say: 'Yaprakların ucunu yukarı çek; oklar yolu gösterir.', tip: 'Yaprakları çek' },
  { k: 'kagit', say: 'Ve en güzel an… Kâğıdı yatıralım; sonra sol kenarından tutup yavaşça kaldır.', tip: 'Kâğıdı yatır' },
];
const EB_SAYS = { perfect: ['Tam kıvamında!', 'Maşallah, tam yerinde.', 'Elin su gibi.'], big: ['Biraz taştı…', 'Bir tık büyük oldu.'], small: ['Biraz daha bekleyebilirdin.', 'Biraz küçük kaldı.'], far: ['Halkanın içine bas evladım.'] };

const ebScene = new THREE.Scene(), ebCam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
const Ebru = {
  active: false, inited: false, t: 0, mode: 'menu', ops: [], rip: [], ripI: 0,
  init() {
    if (this.inited) return; this.inited = true;
    ebScene.background = new THREE.Color(0x0d0805);
    // alanlar ve işleme geçişleri
    const W = window.__ebW || [768, 1024, 1408, 1600][Perf.level] || 1024, H = Math.round(W * EB_H / EB_W);
    const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
    this.tex = new THREE.Vector2(W, H); this.fa = new THREE.WebGLRenderTarget(W, H, o); this.fb = new THREE.WebGLRenderTarget(W, H, o); this.undo = new THREE.WebGLRenderTarget(W, H, o);
    this.printRT = new THREE.WebGLRenderTarget(W, H, o); this.hold = new THREE.WebGLRenderTarget(W, H, o);
    const sW = 112, sH = Math.round(sW * EB_H); this.sa = new THREE.WebGLRenderTarget(sW, sH, o); this.sb = new THREE.WebGLRenderTarget(sW, sH, o); this.sTex = new THREE.Vector2(sW, sH);
    this.opData = new Float32Array(EB_MAXOPS * 8); this.opTex = new THREE.DataTexture(this.opData, EB_MAXOPS * 2, 1, THREE.RGBAFormat, THREE.FloatType); this.opTex.minFilter = this.opTex.magFilter = THREE.NearestFilter; this.opTex.needsUpdate = true;
    const pal = EB_PAL.map((h) => new THREE.Vector3(...ebHex(h)));
    this.bake = mkPass(EB_BAKE_F, { tOld: { value: null }, tOps: { value: this.opTex }, uN: { value: 0 }, uSize: { value: new THREE.Vector2(EB_W, EB_H) }, uTex: { value: this.tex.clone() }, uPal: { value: pal }, uSeam: { value: new THREE.Vector3(...ebHex('#f4ecda')) } }, { MAXOPS: EB_MAXOPS });
    this.copy = mkPass(EB_COPY_F, { tSrc: { value: null } }); this.fill = mkPass(EB_FILL_F, { uCol: { value: new THREE.Vector3(...ebHex(EB_PAL[0])) } });
    this.printM = mkPass(EB_PRINT_F, { tSrc: { value: null }, uTex: { value: this.tex.clone() } });
    this.clearField();
    // ışıklar ve ortam yansıması
    ebScene.add(new THREE.HemisphereLight(0xfff0dc, 0x2a1a10, 0.9));
    const key = new THREE.DirectionalLight(0xffe2bc, 2.4); key.position.set(-0.8, 1.6, -0.6); ebScene.add(key);
    const fillL = new THREE.DirectionalLight(0x9db4d8, 0.35); fillL.position.set(1, 0.8, 1); ebScene.add(fillL);
    try {
      const env = new THREE.Scene(); env.background = new THREE.Color(0x120a06);
      const add = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
      add(new THREE.PlaneGeometry(4, 2.5), new THREE.Color(2.6, 2.1, 1.5), -2, 3, -2); add(new THREE.PlaneGeometry(6, 6), new THREE.Color(0.2, 0.12, 0.07), 0, -3, 0); add(new THREE.PlaneGeometry(3, 2), new THREE.Color(0.5, 0.6, 0.8), 3, 1.5, 2);
      const pm = new THREE.PMREMGenerator(renderer); this.envRT = pm.fromScene(env, 0.03); ebScene.environment = this.envRT.texture; pm.dispose();
    } catch (e) { console.warn('ebru env', e); }
    // masa, tekne, kavanozlar
    const walnut = stWalnutTex(); walnut.repeat.set(2.5, 2.5);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshStandardMaterial({ map: walnut, color: 0x6a4a36, roughness: 0.72 })); table.rotation.x = -PI / 2; table.position.y = -0.045; ebScene.add(table);
    const wood = new THREE.MeshStandardMaterial({ map: stWalnutTex(), color: 0xb08a6c, roughness: 0.42, metalness: 0 }), rim = 0.07, hgt = 0.075;
    const box = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), wood); m.position.set(x, hgt / 2 - 0.045, z); ebScene.add(m); };
    box(EB_W + rim * 2, rim, 0, -EB_H / 2 - rim / 2); box(EB_W + rim * 2, rim, 0, EB_H / 2 + rim / 2); box(rim, EB_H, -EB_W / 2 - rim / 2, 0); box(rim, EB_H, EB_W / 2 + rim / 2, 0);
    const brass = new THREE.MeshStandardMaterial({ color: 0xa8783e, metalness: 0.85, roughness: 0.45 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.05), brass); m.position.set(x * (EB_W / 2 + rim / 2), 0.033, z * (EB_H / 2 + rim / 2)); ebScene.add(m); }
    // su
    this.wU = { tField: { value: this.fa.texture }, uSize: { value: new THREE.Vector2(EB_W, EB_H) }, uTime: { value: 0 }, uClear: { value: 0 }, uBase: { value: new THREE.Vector3(...ebHex(EB_PAL[0])) }, uLamp: { value: new THREE.Vector3(0.15, 1.3, 1) },
      uRip: { value: [...Array(12)].map(() => new THREE.Vector4(0, 0, -99, 0)) }, uRing: { value: [...Array(3)].map(() => new THREE.Vector4()) }, uArr: { value: [...Array(3)].map(() => new THREE.Vector4()) }, uArrA: { value: new THREE.Vector3() }, uGlow: { value: 0 } };
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(EB_W, EB_H), new THREE.ShaderMaterial({ vertexShader: EB_WATER_V, fragmentShader: EB_WATER_F, uniforms: this.wU })); this.water.rotation.x = -PI / 2; ebScene.add(this.water);
    // boya kavanozları (üst kenar) ve kâğıt destesi
    const cer = new THREE.MeshStandardMaterial({ color: 0xe9dfca, roughness: 0.35 }), band = new THREE.MeshStandardMaterial({ color: 0x2a5aa0, roughness: 0.4 });
    this.jars = [];
    [1, 3, 5, 6, 4, 2].forEach((ci, k) => {
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.08, 28, 1, true), cer); body.position.y = 0.04; g.add(body);
      const bnd = new THREE.Mesh(new THREE.CylinderGeometry(0.0605, 0.0605, 0.012, 28, 1, true), band); bnd.position.y = 0.055; g.add(bnd);
      const paint = new THREE.Mesh(new THREE.CircleGeometry(0.056, 28), new THREE.MeshStandardMaterial({ color: new THREE.Color(EB_PAL[ci]).convertSRGBToLinear(), emissive: new THREE.Color(EB_PAL[ci]).convertSRGBToLinear(), emissiveIntensity: 0.35, roughness: 0.12 })); paint.rotation.x = -PI / 2; paint.position.y = 0.068; g.add(paint);
      g.position.set(-EB_W / 2 - rim - 0.16 - (k % 2) * 0.05, -0.045, -0.5 + k * 0.2); ebScene.add(g); this.jars.push(g);
    });
    const ppr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.66), new THREE.MeshStandardMaterial({ color: 0xeee3cc, roughness: 0.9 })); ppr.position.set(EB_W / 2 + rim + 0.36, -0.035, 0.1); ppr.rotation.y = -0.1; ebScene.add(ppr);
    // aletler: gül dalı fırça, biz, tarak
    this.tools = this.buildTools(); ebScene.add(this.tools.brush, this.tools.awl, this.tools.comb, this.tools.shadow, this.tools.drip);
    // kâğıt
    this.pU = { tPrint: { value: this.printRT.texture }, uLay: { value: -0.7 }, uLift: { value: -1 }, uR: { value: 0.07 }, uHover: { value: 0.35 }, uSoak: { value: 0 }, uLight: { value: new THREE.Vector3(-0.4, 0.6, 0.8) } };
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(EB_W, EB_H, 64, 64), new THREE.ShaderMaterial({ vertexShader: EB_PAPER_V, fragmentShader: EB_PAPER_F, uniforms: this.pU, side: THREE.DoubleSide })); this.paper.rotation.x = -PI / 2; this.paper.visible = false; this.paper.frustumCulled = false; ebScene.add(this.paper);
    // çerçeveli eser: krem paspartu, altın varaklı çerçeve
    this.frame = new THREE.Group(); const mg = 0.075, MW = EB_W + mg * 2, MH = EB_H + mg * 2, fw = 0.075;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(EB_W, EB_H), new THREE.ShaderMaterial({ uniforms: this.artU = { tPrint: { value: this.printRT.texture }, uSweep: { value: -1 } }, vertexShader: EB_WATER_V, fragmentShader: EB_ART_F })); art.position.z = 0.004; this.frame.add(art);
    const matB = new THREE.MeshStandardMaterial({ color: 0xefe5cf, roughness: 0.92, transparent: true }), mat = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), matB); this.frame.add(mat);
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b260, metalness: 0.75, roughness: 0.3, emissive: 0x4a2c08, emissiveIntensity: 0.55, transparent: true });
    const goldD = new THREE.MeshStandardMaterial({ color: 0x8a5a22, metalness: 0.6, roughness: 0.45, emissive: 0x2a1604, emissiveIntensity: 0.4, transparent: true });
    for (const [w, h, x, y] of [[MW + fw * 2, fw, 0, MH / 2 + fw / 2], [MW + fw * 2, fw, 0, -MH / 2 - fw / 2], [fw, MH, -MW / 2 - fw / 2, 0], [fw, MH, MW / 2 + fw / 2, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), gold); m.position.set(x, y, 0.018); this.frame.add(m); }
    // iç pervaz ve eserin etrafında ince altın çizgi
    for (const [w, h, x, y] of [[MW + 0.02, 0.012, 0, MH / 2 + 0.006], [MW + 0.02, 0.012, 0, -MH / 2 - 0.006], [0.012, MH, -MW / 2 - 0.006, 0], [0.012, MH, MW / 2 + 0.006, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), goldD); m.position.set(x, y, 0.012); this.frame.add(m); }
    for (const [w, h, x, y] of [[EB_W + 0.016, 0.005, 0, EB_H / 2 + 0.0105], [EB_W + 0.016, 0.005, 0, -EB_H / 2 - 0.0105], [0.005, EB_H + 0.026, -EB_W / 2 - 0.0105, 0], [0.005, EB_H + 0.026, EB_W / 2 + 0.0105, 0]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gold); m.position.set(x, y, 0.003); this.frame.add(m); }
    this.frameMats = [gold, goldD, matB];
    this.frame.visible = false; ebScene.add(this.frame);
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.bindDom();
  },
  buildTools() {
    const st = (c, r = 0.5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    // fırça: gül dalı sap, at kılı uç
    const brush = new THREE.Group(), stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0058, 0.24, 10), st(0x5b3a22, 0.65)); stem.position.y = 0.16; brush.add(stem);
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 8, 6), st(0x4a2c18, 0.7)); k.position.set(0.002, 0.08 + i * 0.05, 0); brush.add(k); }
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.012, 12), st(0x8a2c20, 0.6)); tie.position.y = 0.042; brush.add(tie);
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.0115, 0.045, 14), st(0xd9c6a0, 0.9)); hair.rotation.x = PI; hair.position.y = 0.0145; brush.add(hair);
    this.brushTip = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), st(0x888888, 0.2)); this.brushTip.position.y = -0.006; brush.add(this.brushTip);
    // biz: ceviz sap, pirinç bilezik, ince iğne
    const awl = new THREE.Group(), h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0075, 0.12, 14), st(0x3a2416, 0.45)); h1.position.y = 0.155; awl.add(h1);
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0062, 0.016, 14), st(0xd9a95c, 0.3, 1)); fr.position.y = 0.087; awl.add(fr);
    const ndl = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0005, 0.08, 8), st(0xcfd2d6, 0.25, 1)); ndl.position.y = 0.04; awl.add(ndl);
    // tarak: ceviz çıta, yedi iğne
    const comb = new THREE.Group(), bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.016), st(0x4a2c1a, 0.5)); bar.position.y = 0.07; comb.add(bar);
    for (let i = 0; i < 7; i++) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0006, 0.065, 6), st(0xcfd2d6, 0.25, 1)); n.position.set(-0.09 + i * 0.03, 0.033, 0); comb.add(n); }
    // gölge ve düşen damla
    const sc = stCanvas(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshBasicMaterial({ map: stTex(sc), transparent: true, depthWrite: false, opacity: 0 })); shadow.rotation.x = -PI / 2; shadow.position.y = 0.002;
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 10), st(0xffffff, 0.15)); drip.visible = false;
    for (const g of [brush, awl, comb]) { g.visible = false; g.userData.vis = 0; }
    return { brush, awl, comb, shadow, drip };
  },
  /* ----- alan işlemleri ----- */
  clearField() { this.fill.uniforms.uCol.value.set(...ebHex(EB_PAL[0])); post.pass(this.fill, this.fa); post.pass(this.fill, this.fb); this.cur = this.fa; this.alt = this.fb; if (this.wU) this.wU.tField.value = this.cur.texture; },
  copyRT(src, dst) { this.copy.uniforms.tSrc.value = src.texture; post.pass(this.copy, dst); },
  // op: [tür, a1, a2, a3, b0, b1, b2, b3]
  opDrop(x, y, area, col, rNow, seed) { this.ops.push([1, x, y, area, col, rNow, seed, 0]); },
  opAwl(ax, ay, bx, by, lam) { this.ops.push([2, ax, ay, bx, by, lam, 0, 0]); },
  opSeam(x, y, r, w = 0.0026, s = 0.62) { this.ops.push([3, x, y, r, w, s, 0, 0]); },
  // bizi uzun hamlelerde katlanma olmasın diye kısa parçalara böl
  awlPath(ax, ay, bx, by, lam) { const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / (lam * 0.45))); for (let i = 0; i < n; i++) this.opAwl(lerp(ax, bx, i / n), lerp(ay, by, i / n), lerp(ax, bx, (i + 1) / n), lerp(ay, by, (i + 1) / n), lam); },
  flush(target) {
    const ops = this.ops; if (!ops.length) return; this.ops = [];
    for (let s = 0; s < ops.length; s += EB_MAXOPS) {
      const n = Math.min(EB_MAXOPS, ops.length - s), d = this.opData; for (let i = 0; i < n; i++) d.set(ops[s + i], i * 8);
      this.opTex.needsUpdate = true; const B = this.bake.uniforms; B.uN.value = n;
      if (target) { B.tOld.value = target.a.texture; B.uTex.value.copy(target.tex); post.pass(this.bake, target.b); const t = target.a; target.a = target.b; target.b = t; }
      else { B.tOld.value = this.cur.texture; B.uTex.value.copy(this.tex); post.pass(this.bake, this.alt); const t = this.cur; this.cur = this.alt; this.alt = t; }
    }
    if (!target) this.wU.tField.value = this.cur.texture;
  },
  // tutulan damla: basıldığı andaki desenden tek hamlede yeniden işlenir
  growDrop(g) {
    this.opData.set([1, g.c[0], g.c[1], g.area, g.col, Math.sqrt(g.area), g.seed, 0], 0); this.opTex.needsUpdate = true;
    const B = this.bake.uniforms; B.uN.value = 1; B.tOld.value = this.hold.texture; B.uTex.value.copy(this.tex); post.pass(this.bake, this.cur); this.wU.tField.value = this.cur.texture;
  },
  // bekleyen her şeyi işle (otomatik biz dahil)
  settle() { const A = this.autoAwl; if (A) { for (; A.i < A.path.length - 1; A.i++) this.awlPath(A.path[A.i][0], A.path[A.i][1], A.path[A.i + 1][0], A.path[A.i + 1][1], A.lam); this.autoAwl = null; } this.flush(); },
  // su temizlenir: desen yavaşça çekilir, sonra boş tekne
  wipeTo(cb) { this.wipe = { t: 0, c0: this.wU.uClear.value, cb }; this.demo = null; this.frame.visible = false; this.paper.visible = false; this.autoAwl = null; this.ops = []; if (audio.ok) audio.noiseHit(audio.t, 0.7, 0.035, { type: 'lowpass', f: 500, f1: 1400, a: 0.25, verb: 0.3 }); },
  wipeUpdate(dt) {
    const w = this.wipe; if (!w) return; w.t += dt; const u = clamp01(w.t / 0.55); this.wU.uClear.value = lerp(w.c0, 1, Ease.inOutSine(u));
    if (u >= 1) { this.wipe = null; this.clearField(); this.wU.uClear.value = 0; this.frame.visible = false; this.paper.visible = false; if (w.cb) w.cb(); }
  },
  /* ----- vitrin: menüde su kendi kendine bir battal + gelgit + bülbül yuvası işler ----- */
  demoStart() {
    const ev = [], R = (a, b) => a + Math.random() * (b - a), cols = [2, 1, 7, 2, 11, 1, 2, 7];
    for (let i = 0; i < 66; i++) { const r = lerp(0.085, 0.024, i / 65) * R(0.8, 1.15), x = R(0.03, 0.97), y = R(0.03, 1.37), c = cols[i % cols.length]; ev.push([0.5 + i * 0.042, () => { this.opDrop(x, y, r * r, c, r, R(0, 99)); this.opSeam(x, y, r, 0.0018 + r * 0.025, 0.45); if (i % 2 === 0) this.ripple(x, y, 0.3); if (i % 3 === 0) this.plip(x, r, 0.35); }]); }
    const st = []; let tt = 3.4;
    for (let k = 0, y = 0.07; y < 1.36; y += 0.085, k++) { st.push({ t: tt, d: 0.17, lam: 0.011, pts: k % 2 ? [[0.99, y], [0.01, y]] : [[0.01, y], [0.99, y]] }); tt += 0.13; }
    const fl = [[0.3, 0.33, [3, 4, 5]], [0.71, 0.3, [8, 4, 11]], [0.5, 0.72, [3, 5, 11]], [0.27, 1.09, [7, 11, 5]], [0.72, 1.1, [3, 4, 5]]];
    fl.forEach(([x, y, cc], k) => [0.088, 0.06, 0.031].forEach((r, j) => ev.push([tt + 0.5 + k * 0.42 + j * 0.13, () => { this.opDrop(x, y, r * r, cc[j], r, R(0, 99)); this.opSeam(x, y, r, 0.002 + r * 0.02, 0.5); this.ripple(x, y, 0.4); this.plip(x, r, 0.45); }])));
    tt += 0.5 + fl.length * 0.42 + 0.6;
    fl.forEach(([x, y], k) => { const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU * 1.75 + k, r = 0.004 + i / 60 * 0.1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 1.05]); } st.push({ t: tt + k * 0.55, d: 0.9, lam: 0.0105, pts }); });
    ev.sort((a, b) => a[0] - b[0]); this.demo = { t: 0, ev, i: 0, st, act: [] };
  },
  demoUpdate(dt) {
    const D = this.demo; if (!D || this.mode !== 'menu') return; D.t += dt;
    while (D.i < D.ev.length && D.ev[D.i][0] <= D.t) D.ev[D.i++][1]();
    for (const S of D.st) {
      if (S.done || D.t < S.t) continue; const u = clamp01((D.t - S.t) / S.d), n = S.pts.length - 1, upto = u * n; S.k = S.k || 0; S.last = S.last || S.pts[0];
      let target; const i0 = Math.floor(upto), f = upto - i0; target = i0 >= n ? S.pts[n] : [lerp(S.pts[i0][0], S.pts[i0 + 1][0], f), lerp(S.pts[i0][1], S.pts[i0 + 1][1], f)];
      const way = []; while (S.k < i0 && S.k < n) { S.k++; way.push(S.pts[S.k]); } way.push(target);
      for (const q of way) { if (Math.hypot(q[0] - S.last[0], q[1] - S.last[1]) > 1e-4) this.awlPath(S.last[0], S.last[1], q[0], q[1], S.lam); S.last = q; }
      if (!S.snd) { S.snd = true; this.swishOnce(S.d); }
      if (u >= 1) S.done = true;
    }
  },
  swishOnce(d) { if (!audio.ok) return; audio.noiseHit(audio.t, Math.max(0.15, d), 0.012, { type: 'bandpass', f: 2600, f1: 1500, q: 0.9, a: d * 0.3 }); },
  ripple(x, y, a = 0.6) { const R = this.wU.uRip.value[this.ripI++ % 12]; R.set(x, y, this.t, a); },
  /* ----- açılış / kapanış ----- */
  open() {
    this.init(); this.active = true; this.t = 0; this.camIn = 0; this.mode = 'menu'; this.hideGuides(); this.paper.visible = false; this.frame.visible = false; this.wU.uClear.value = 0;
    G.state = 'ebru'; UI.hideAll(); UI.hud(false); UI.show('ebru'); audio.setTheater(true);
    this.layout(); this.wipe = null; this.clearField(); this.showMenu(true); this.music(true);
    audio.whoosh(true, 1.2, 0.05);
  },
  close() {
    this.active = false; this.endGesture(); this.music(false); audio.setTheater(false); UI.hide('ebru');
    G.state = 'title'; G.stateT = 99; G.userSun = true; UI.show('title');
  },
  // ekran düzeni: dikeyde araçlar altta, yatayda sağ sütunda
  rect() {
    const w = innerWidth, h = innerHeight, land = w >= h * 1.15 && w >= 640;
    return land ? { land, l: 16, r: Math.min(380, w * 0.36) + 32, t: 74, b: 18 } : { land, l: 8, r: 8, t: 92, b: Math.min(236, h * 0.28) };
  },
  layout() {
    const w = innerWidth, h = innerHeight; ebCam.aspect = w / h; ebCam.fov = 30; ebCam.updateProjectionMatrix();
    // tekneyi araç çubukları dışında kalan alana sığdır ve ortala
    const Rc = this.rect(), tilt = 0.24, wantY = (Rc.t + h - Rc.b) / 2, wantX = (Rc.l + w - Rc.r) / 2, v = new THREE.Vector3(), tn = Math.tan(deg(ebCam.fov / 2));
    const place = (D, sx, sz) => { ebCam.position.set(sx, Math.cos(tilt) * D, Math.sin(tilt) * D + sz); ebCam.lookAt(sx, 0, sz); ebCam.updateMatrixWorld(true); };
    const sy = (x, z) => { v.set(x, 0, z).project(ebCam); return [(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h]; };
    const fit = (D) => {
      let sx = 0, sz = 0;
      for (let k = 0; k < 4; k++) { place(D, sx, sz); const midY = (sy(0, -0.76)[1] + sy(0, 0.76)[1]) / 2, midX = (sy(-0.56, 0)[0] + sy(0.56, 0)[0]) / 2; sz += (midY - wantY) / h * 2 * tn * D / Math.cos(tilt); sx += (midX - wantX) / h * 2 * tn * D; }
      place(D, sx, sz); let ok = true; for (const [x, z] of [[-0.56, -0.76], [0.56, -0.76], [-0.56, 0.76], [0.56, 0.76]]) { const [px, py] = sy(x, z); if (px < Rc.l || px > w - Rc.r || py < Rc.t || py > h - Rc.b) ok = false; }
      return [ok, sx, sz];
    };
    let lo = 0.8, hi = 14; for (let k = 0; k < 28; k++) { const D = (lo + hi) / 2; if (fit(D)[0]) hi = D; else lo = D; }
    const f = fit(hi); this.camD = hi; this.camTilt = tilt; this.camShiftX = f[1]; this.camShift = f[2];
  },
  resize() { if (this.active) this.layout(); },
  apply() {
    const pu = post.u;
    pu.uExposure.value = 1.02; pu.uBloomAdd.value = 0.16; pu.uBloomMix.value = 0.03; pu.uRays.value = 0; pu.uSunVis.value = 0; pu.uNight.value = 0;
    pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0; pu.uVignette.value = 0.55;
    pu.uLift.value.set(0.008, 0.005, 0.0); pu.uGamma.value.set(1, 1, 1.02); pu.uGain.value.set(1.03, 1.0, 0.95); pu.uSat.value = 1.06; pu.uContrast.value = 1.06;
    pu.uTilt.value = 0; pu.uGrain.value = 0.02;
  },
  /* ----- müzik ve sesler ----- */
  music(on) {
    if (!audio.ok) return;
    if (!on) { try { stMus.end(); stAmb.end(); } catch (e) {} this.stopLoop('pour'); this.stopLoop('swish'); return; }
    try { stMus.begin(2); stMus.mode = 'ebru'; stAmb.begin(0); stAmb.env = { wind: 0.35, birds: 0.5, leaves: 0.3, waves: 0.1 }; stMus.drone.g.gain.setTargetAtTime(0.007, audio.t, 1.5); } catch (e) {}
    this.neyT = 3;
  },
  plip(x, r, g = 1) { if (!audio.ok) return; const t = audio.t, f = lerp(1500, 420, clamp01(r / 0.12)) * (0.92 + Math.random() * 0.16); audio.withPan(clamp((x - 0.5) * 1.6, -0.8, 0.8), () => { audio.osc('sine', f, t, 0.16, 0.05 * g, null, { f1: f * 0.55, verb: 0.5 }); audio.noiseHit(t, 0.03, 0.02 * g, { type: 'bandpass', f: f * 2, q: 3 }); }); },
  // sürekli sesler: dökülen boya (kabarcık) ve biz (hışırtı)
  loop(name, kind) {
    if (!audio.ok || (this.loops && this.loops[name])) return; this.loops = this.loops || {};
    const c = audio.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = audio.noise; s.loop = true;
    f.type = 'bandpass'; f.frequency.value = kind === 'pour' ? 700 : 2400; f.Q.value = kind === 'pour' ? 4 : 0.9; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(audio.sfx); s.start(t, Math.random());
    let o = null, og = null; if (kind === 'pour') { o = c.createOscillator(); og = c.createGain(); o.type = 'sine'; o.frequency.value = 160; og.gain.value = 0; o.connect(og); og.connect(audio.sfx); o.start(t); }
    this.loops[name] = { s, f, g, o, og, kind };
  },
  loopSet(name, amt, freq) { const L = this.loops && this.loops[name]; if (!L) return; const t = audio.t; L.g.gain.setTargetAtTime(amt * (L.kind === 'pour' ? 0.05 : 0.035), t, 0.05); if (freq) L.f.frequency.setTargetAtTime(freq, t, 0.08); if (L.o) { L.og.gain.setTargetAtTime(amt * 0.025, t, 0.06); L.o.frequency.setTargetAtTime((freq || 700) * 0.2, t, 0.1); } },
  stopLoop(name) { const L = this.loops && this.loops[name]; if (!L) return; const t = audio.t; L.g.gain.setTargetAtTime(0, t, 0.08); if (L.og) L.og.gain.setTargetAtTime(0, t, 0.08); try { L.s.stop(t + 0.5); if (L.o) L.o.stop(t + 0.5); } catch (e) {} this.loops[name] = null; },
  chime(n = 3) { if (!stMus.ok) return; const t = audio.t + 0.03; for (let k = 0; k < n; k++) stMus.pluck(t + k * 0.08, stMus.note([0, 2, 4, 7, 9][k % 5] + (k > 4 ? 7 : 0)), 'kanun', 0.06); },
  /* ----- arayüz ----- */
  bindDom() {
    const on = (id, f) => { const el = $(id); if (el) el.addEventListener('click', (e) => { e.stopPropagation(); audio.ui(); f(); }); };
    on('#ebBack', () => { if (this.mode !== 'menu') { this.showMenu(); return; } $('#fader').classList.add('on'); setTimeout(() => { this.close(); requestAnimationFrame(() => requestAnimationFrame(() => $('#fader').classList.remove('on'))); }, 260); });
    on('#ebLesson', () => this.startLesson()); on('#ebFreeBtn', () => this.startFree());
    on('#ebUndo', () => this.undoStep()); on('#ebNext', () => this.nextPressed());
    on('#ebAgain', () => (this.lastMode === 'free' ? this.startFree() : this.startLesson())); on('#ebToFree', () => this.startFree()); on('#ebExit', () => this.showMenu()); on('#ebSave', () => this.savePng());
    on('#ebClear', () => { if (this.mode === 'free') this.wipeTo(() => { this.coverage = 0; this.ripple(0.5, 0.7, 0.5); }); });
    on('#ebPrint', () => this.startPaper());
    const pal = $('#ebPal'); pal.innerHTML = ''; EB_FREE.forEach((ci) => { const b = document.createElement('button'); b.className = 'tap'; b.style.setProperty('--c', EB_PAL[ci]); b.title = EB_NAMES[ci]; b.addEventListener('click', (e) => { e.stopPropagation(); audio.ui(); this.freeCol = ci; this.syncFreeUI(); }); pal.appendChild(b); });
    for (const b of document.querySelectorAll('#ebTools [data-t]')) b.addEventListener('click', (e) => { e.stopPropagation(); audio.ui(); this.freeTool = b.dataset.t; this.syncFreeUI(); });
  },
  showMenu(fresh) {
    this.mode = 'menu'; this.endGesture(); this.hideGuides(); this.step = null; $('#ebStep').textContent = 'su üstünde nakış';
    if (fresh) this.demoStart(); else this.wipeTo(() => this.demoStart());
    const sv = (Save.data.ebru || {}).lale || 0; $('#ebLessonStars').textContent = sv ? '★'.repeat(sv) + '☆'.repeat(3 - sv) : '';
    this.ui('menu'); this.say('');
  },
  ui(m) { const el = $('#ebru'); el.dataset.m = m; },
  say(text, who = 'Nur Hanım') { const el = $('#ebSay'); if (!text) { el.classList.remove('on'); return; } el.querySelector('b').textContent = who; el.querySelector('p').textContent = text; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); },
  pop(x, y, text, good) {
    const el = document.createElement('div'); el.className = 'ebPop' + (good ? ' good' : ''); el.textContent = text; $('#ebru').appendChild(el);
    const v = new THREE.Vector3(x - 0.5, 0, 0.7 - y).project(ebCam); el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px'; el.style.top = ((0.5 - v.y * 0.5) * innerHeight) + 'px';
    setTimeout(() => el.remove(), 1700);
  },
  /* ----- ders ----- */
  startLesson() {
    this.lastMode = 'lesson'; this.mode = 'lesson'; this.stepLock = false; this.endGesture(); this.hideGuides(); this.step = null; this.coverage = 0; this.log = []; $('#ebNext').classList.remove('show'); $('#ebUndo').classList.remove('show');
    this.ui('lesson'); $('#ebStep').textContent = 'Lale ebrusu'; $('#ebTip').textContent = ''; this.say(''); haptic(8);
    this.wipeTo(() => { this.stepI = -1; this.nextStep(); });
  },
  nextStep() {
    this.endGesture(); this.stepLock = false; this.stepI++; const S = EB_LALE[this.stepI]; this.step = S; this.stepT = 0; this.done = {}; this.idleT = 0;
    this.copyRT(this.cur, this.undo); this.stepLog = [];
    $('#ebStep').textContent = `Lale ebrusu · ${this.stepI + 1}/${EB_LALE.length}`; $('#ebTip').textContent = S.tip;
    this.say(S.say); this.setGuides(); $('#ebNext').classList.toggle('show', S.k === 'kagit'); $('#ebNext').textContent = S.k === 'kagit' ? 'Kâğıdı yatır' : 'Devam';
    $('#ebUndo').classList.toggle('show', this.stepI > 0 && S.k !== 'kagit');
    if (this.stepI > 0) this.chime(3);
    this.handT = 0;
  },
  setGuides() {
    this.hideGuides(); const S = this.step; if (!S) return; const R = this.wU.uRing.value, A = this.wU.uArr.value, AA = this.wU.uArrA.value;
    if (S.k === 'damla') { const list = S.multi || [[S.c[0], S.c[1], S.r]]; list.forEach(([x, y, r], i) => { if (!(this.done[i])) R[i].set(x, y, r, 1); }); }
    if (S.k === 'cek') S.paths.forEach((p, i) => { if (!this.done[i]) { A[i].set(p[0][0], p[0][1], p[1][0], p[1][1]); AA.setComponent(i, 1); } });
    if (S.k === 'sap') { const p = S.path; A[0].set(p[0][0], p[0][1], p[2][0], p[2][1]); AA.x = 1; }
  },
  hideGuides() { if (!this.wU) return; for (const r of this.wU.uRing.value) r.w = 0; this.wU.uArrA.value.set(0, 0, 0); },
  undoStep() { if (this.mode !== 'lesson' || !this.step || this.step.k === 'kagit') return; this.endGesture(); this.copyRT(this.undo, this.cur); this.done = {}; this.setGuides(); if (this.step.k === 'serp') { this.coverage = 0; this.done = {}; $('#ebNext').classList.remove('show'); } this.say('Su sabırlıdır; bir daha dene.'); this.ripple(0.5, 0.7, 0.4); },
  nextPressed() { if (this.mode === 'lesson' && this.step) { if (this.step.k === 'serp') { this.nextStep(); return; } if (this.step.k === 'kagit') { this.startPaper(); return; } } },
  stepDone() { this.stepLock = true; this.chime(4); haptic([10, 30, 10]); setTimeout(() => { if (this.mode === 'lesson' && this.step && this.stepI < EB_LALE.length - 1) this.nextStep(); }, 650); },
  /* ----- serbest ----- */
  startFree() {
    this.lastMode = 'free'; this.mode = 'free'; this.endGesture(); this.hideGuides(); this.step = null; this.freeCol = this.freeCol || 2; this.freeTool = this.freeTool || 'serp'; this.coverage = 0;
    this.ui('free'); this.syncFreeUI(); $('#ebStep').textContent = 'Serbest atölye'; this.wipeTo(null);
    this.say(this.freeSeen ? '' : 'Burası senin teknen. Önce zemini serp, sonra damla bırak; biz ve tarakla dilediğince çek.'); this.freeSeen = true; clearTimeout(this.sayTo); this.sayTo = setTimeout(() => { if (this.mode === 'free') this.say(''); }, 6500);
  },
  syncFreeUI() { const pal = $('#ebPal').children; EB_FREE.forEach((ci, i) => pal[i].classList.toggle('on', ci === this.freeCol)); for (const b of document.querySelectorAll('#ebTools [data-t]')) b.classList.toggle('on', b.dataset.t === this.freeTool); },
  /* ----- dokunuş ----- */
  toField(e) {
    const v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); this.ray.setFromCamera(v, ebCam);
    const p = new THREE.Vector3(); if (!this.ray.ray.intersectPlane(this.plane, p)) return null; return [p.x + EB_W / 2, EB_H / 2 - p.z];
  },
  inTray(f) { return f && f[0] > 0.004 && f[0] < EB_W - 0.004 && f[1] > 0.004 && f[1] < EB_H - 0.004; },
  down(e) {
    if (this.g || this.camIn < 0.85 || this.wipe || (this.stepLock && this.mode === 'lesson')) return; const f = this.toField(e); this.idleT = 0;
    if (this.mode === 'paper') { if (this.paperState === 'lifting') this.g = { id: e.pointerId, kind: 'peel', x0: e.clientX, l0: this.pU.uLift.value }; return; }
    if (!this.inTray(f) || (this.mode !== 'lesson' && this.mode !== 'free')) return;
    const tool = this.mode === 'free' ? this.freeTool : { serp: 'serp', damla: 'damla', cek: 'biz', sap: 'sap' }[this.step && this.step.k];
    if (!tool) return;
    const g = { id: e.pointerId, kind: tool, f, last: f, t: 0, len: 0, path: [f] };
    if (tool === 'damla') {
      let c = f, rt = 0.07, col = this.freeCol || 3, idx = -1;
      if (this.mode === 'lesson') {
        const S = this.step, list = S.multi || [[S.c[0], S.c[1], S.r]];
        let best = -1, bd = 1e9; list.forEach(([x, y, r], i) => { if (this.done[i]) return; const d = Math.hypot(f[0] - x, f[1] - y) / r; if (d < bd) { bd = d; best = i; } });
        if (best < 0 || bd > 2.4) { this.pop(f[0], f[1], EB_SAYS.far[0]); return; }
        const [x, y, r] = list[best]; c = [lerp(f[0], x, 0.8), lerp(f[1], y, 0.8)]; rt = r; col = S.col; idx = best;
      }
      this.settle(); this.copyRT(this.cur, this.hold);
      Object.assign(g, { c, rt, col, idx, area: 0, seed: Math.random() * 100, drip: 0 }); this.loop('pour', 'pour'); this.dripAt(c);
    }
    if (tool === 'biz' || tool === 'tarak') { this.loop('swish', 'swish'); if (this.mode === 'lesson') { g.pi = -1; } }
    if (tool === 'serp') g.next = 0;
    if (tool === 'sap') { g.beadAcc = 0; g.lastBead = f; }
    this.g = g; this.toolShow(tool, f);
  },
  move(e) { const g = this.g; if (!g || e.pointerId !== g.id) return; if (g.kind === 'peel') { g.x = e.clientX; return; } const f = this.toField(e); if (f) g.cur = [clamp(f[0], 0.003, EB_W - 0.003), clamp(f[1], 0.003, EB_H - 0.003)]; },
  up(e) { const g = this.g; if (!g || (e && e.pointerId !== g.id)) return; this.finishGesture(g); this.g = null; },
  endGesture() { if (this.g) { this.finishGesture(this.g); this.g = null; } this.stopLoop('pour'); this.stopLoop('swish'); },
  finishGesture(g) {
    this.stopLoop('pour'); this.stopLoop('swish');
    if (g.kind === 'peel') { this.peelRelease = true; return; }
    if (g.kind === 'damla' && g.area > 0) {
      const r = Math.sqrt(g.area); this.opSeam(g.c[0], g.c[1], r, 0.0024 + r * 0.012, 0.6); this.ripple(g.c[0], g.c[1], 0.35); this.plip(g.c[0], r, 0.8);
      if (this.mode === 'lesson') {
        const q = r / g.rt, good = Math.abs(q - 1) < 0.1, key = good ? 'perfect' : q > 1 ? 'big' : 'small', L = EB_SAYS[key];
        this.pop(g.c[0], g.c[1] + g.rt + 0.03, L[(Math.random() * L.length) | 0], good); this.log.push(['drop', g.idx, q]);
        this.done[g.idx] = true; this.setGuides(); const S = this.step, n = (S.multi || [0]).length; if (Object.keys(this.done).length >= n) this.stepDone();
      }
    }
    if (g.kind === 'biz' && this.mode === 'lesson' && this.step.k === 'cek' && g.len > 0.18) {
      // hangi oka yakın çekildi
      const S = this.step; let best = -1, bd = 1e9; S.paths.forEach((p, i) => { if (this.done[i]) return; const d = Math.hypot(g.path[0][0] - p[0][0], g.path[0][1] - p[0][1]) + Math.hypot(g.last[0] - p[1][0], g.last[1] - p[1][1]); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { this.done[best] = true; this.log.push(['pull', best, bd]); this.setGuides(); this.pop(g.last[0], g.last[1], bd < 0.12 ? 'Çok zarif!' : 'Güzel…', bd < 0.12); if (Object.keys(this.done).length >= S.paths.length) this.stepDone(); }
    }
    if (g.kind === 'biz' && this.mode === 'lesson' && this.step.k === 'cek' && g.len > 0.02 && g.len <= 0.18) this.pop(g.last[0], g.last[1], 'Biraz daha uzun çek…');
    if (g.kind === 'sap' && g.len > 0.15) {
      // boncuklanan sapı bizle bağla: yolun üstünden ince bir çekiş (görünür biçimde)
      this.autoAwl = { path: g.path.slice(), i: 0, lam: 0.0075 }; this.log.push(['stem', g.len]);
      if (this.mode === 'lesson') { this.done[0] = true; this.hideGuides(); setTimeout(() => this.stepDone(), 700); }
    }
    if (g.kind === 'serp' && this.mode === 'lesson' && this.coverage > 0.85) this.stepDone();
  },
  dripAt(c) { const d = this.tools.drip; d.visible = true; d.userData.t = 0; d.userData.c = c; d.material.color.set(EB_PAL[this.g ? this.g.col : 3]).convertSRGBToLinear(); },
  toolShow(kind, f) {
    const T = this.tools, m = kind === 'damla' || kind === 'serp' || kind === 'sap' ? T.brush : kind === 'tarak' ? T.comb : T.awl;
    for (const k of ['brush', 'awl', 'comb']) T[k].userData.on = T[k] === m;
    m.userData.f = f; m.visible = true; if (kind !== 'biz' && kind !== 'tarak') { const col = this.g && this.g.col != null ? this.g.col : this.mode === 'free' ? this.freeCol : this.step && (this.step.col || (this.step.cols && this.step.cols[0])) || 3; this.brushTip.material.color.set(EB_PAL[col]).convertSRGBToLinear(); }
  },
  /* ----- her kare ----- */
  update(dt) {
    if (!this.active) return; this.t += dt; const t = this.t; this.wU.uTime.value = t;
    this.camIn = Math.min(1, this.camIn + dt / 2.2); const ce = Ease.inOutCubic(this.camIn), D = this.camD * lerp(1.7, 1, ce), tl = lerp(0.7, this.camTilt, ce), sh = this.camShift * ce;
    const sx = (this.camShiftX || 0) * ce; ebCam.position.set(Math.sin(t * 0.13) * 0.006 + lerp(-0.35, 0, ce) + sx, Math.cos(tl) * D, Math.sin(tl) * D + sh); ebCam.lookAt(sx, 0, sh);
    const g = this.g;
    if (g && g.kind !== 'peel') {
      g.t += dt; const f = g.cur || g.last;
      if (g.kind === 'damla') {
        // dökülen boya: alan sabit hızla büyür; çok uzun basarsan taşar
        const rate = (g.rt * g.rt) / 1.25, cap = this.mode === 'lesson' ? g.rt * g.rt * 1.9 : 0.06, da = Math.min(rate * dt, cap - g.area);
        if (da > 0) { g.area += da; g.grow = true; }
        const q = Math.sqrt(g.area) / g.rt; this.wU.uGlow.value = this.mode === 'lesson' ? Math.max(0, 1 - Math.abs(q - 1) * 8) : 0;
        if (this.mode === 'lesson' && !g.zone && q >= 0.93) { g.zone = true; haptic(14); if (stMus.ok) stMus.pluck(audio.t + 0.01, stMus.note(7), 'kanun', 0.06); }
        this.loopSet('pour', da > 0 ? 1 : 0.2, lerp(900, 420, clamp01(Math.sqrt(g.area) / 0.15)));
        if ((g.drip += dt) > 0.22) { g.drip = 0; this.ripple(g.c[0], g.c[1], 0.18); }
        if (this.mode === 'free' && g.cur && Math.hypot(g.cur[0] - g.c[0], g.cur[1] - g.c[1]) > 0.04) { this.finishGesture(g); this.g = null; }
      } else if (g.kind === 'serp') {
        // fırça silkelenir: parmağın çevresine küçük damlalar
        g.next -= dt; for (let nb = 0; g.next <= 0 && nb < 3; nb++) {
          g.next += 0.05; const S = this.step, cols = this.mode === 'lesson' ? S.cols : [this.freeCol], col = cols[(this.burst = (this.burst || 0) + 1) % cols.length], n = 4 + ((Math.random() * 5) | 0);
          for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 0.075, x = clamp(f[0] + Math.cos(a) * d, 0.01, EB_W - 0.01), y = clamp(f[1] + Math.sin(a) * d, 0.01, EB_H - 0.01), r = 0.011 + Math.random() * 0.02; this.opDrop(x, y, r * r, col, r, Math.random() * 100); this.opSeam(x, y, r, 0.002 + r * 0.03, 0.5); this.coverage = (this.coverage || 0) + (PI * r * r) / (EB_W * EB_H); }
          this.ripple(f[0], f[1], 0.25); this.plip(f[0], 0.02, 0.7);
          if (this.mode === 'lesson') { const c = this.coverage; $('#ebNext').classList.toggle('show', c > 0.45); if (c > 0.85 && !this.done.serp) { this.done.serp = true; this.say('Zemin hazır. Ne güzel serptin…'); } }
        }
      } else if (g.cur) {
        const d = Math.hypot(g.cur[0] - g.last[0], g.cur[1] - g.last[1]);
        if (d > 0.0015) {
          if (g.kind === 'biz') this.awlPath(g.last[0], g.last[1], g.cur[0], g.cur[1], this.mode === 'lesson' ? this.step.lam : 0.016);
          else if (g.kind === 'tarak') { const dx = g.cur[0] - g.last[0], dy = g.cur[1] - g.last[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; for (let k = -3; k <= 3; k++) this.awlPath(g.last[0] + nx * k * 0.045, g.last[1] + ny * k * 0.045, g.cur[0] + nx * k * 0.045, g.cur[1] + ny * k * 0.045, 0.011); g.dir = Math.atan2(dy, dx); }
          else if (g.kind === 'sap') { g.beadAcc += d; while (g.beadAcc > 0.014) { g.beadAcc -= 0.014; const u = 1 - g.beadAcc / Math.max(d, 1e-6), x = lerp(g.last[0], g.cur[0], u), y = lerp(g.last[1], g.cur[1], u), r = 0.0085; this.opDrop(x, y, r * r, 6, r, Math.random() * 100); } }
          g.len += d; g.path.push(g.cur); g.last = g.cur;
          if (g.kind !== 'sap') this.loopSet('swish', clamp01(d / dt / 0.9), 1600 + clamp01(d / dt) * 1800);
          if (Math.random() < 0.25) this.ripple(g.cur[0], g.cur[1], 0.12);
        } else if (g.kind !== 'sap') this.loopSet('swish', 0, 0);
      }
      this.tools[g.kind === 'biz' ? 'awl' : g.kind === 'tarak' ? 'comb' : 'brush'].userData.f = g.kind === 'damla' ? g.c : f;
    }
    // sap: boncukları bağlayan otomatik biz
    if (this.autoAwl) { const A = this.autoAwl, P = A.path; for (let k = 0; k < 3 && A.i < P.length - 1; k++, A.i++) this.awlPath(P[A.i][0], P[A.i][1], P[A.i + 1][0], P[A.i + 1][1], A.lam); if (A.i >= P.length - 1) this.autoAwl = null; }
    this.flush(); if (g && g.kind === 'damla' && g.grow) { g.grow = false; this.growDrop(g); }
    this.demoUpdate(dt); this.wipeUpdate(dt);
    this.updateTools(dt); this.updatePaper(dt); this.updateHand(dt);
    // ney: ara ara bir cümle
    if (stMus.ok && audio.ok && (this.neyT -= dt) <= 0) { this.neyT = 16 + Math.random() * 10; const gu = stMus.mk.g, ph = Math.random() < 0.5 ? [0, 1, 2, gu, gu - 1, 1, 0] : [gu, gu + 1, gu, gu - 1, 2, 1]; stMus.ney(audio.t + 0.1, ph.map((d, i) => [stMus.note(d) + 12, i === ph.length - 1 ? 1.8 : 0.42 + Math.random() * 0.25]), 0.028); }
    try { stAmb.update(dt, { state: 'atolye', card: true, lamp: 0.25 }); } catch (e) {}
    this.wU.uGlow.value = damp(this.wU.uGlow.value, g && g.kind === 'damla' ? this.wU.uGlow.value : 0, 6, dt);
    if (this.mode === 'lesson' && !g) { this.idleT += dt; }
  },
  updateTools(dt) {
    const T = this.tools, g = this.g;
    for (const k of ['brush', 'awl', 'comb']) {
      const m = T[k], want = m.userData.on && (g || (m.userData.vis > 0.01)) ? (g ? 1 : 0) : 0; m.userData.vis = damp(m.userData.vis || 0, want, 9, dt); m.visible = m.userData.vis > 0.02;
      if (!m.visible || !m.userData.f) continue; const [fx, fy] = m.userData.f, x = fx - EB_W / 2, z = EB_H / 2 - fy;
      if (k === 'brush') { const lift = lerp(0.12, 0.04, m.userData.vis) + Math.sin(this.t * 9) * 0.002; m.position.set(x + 0.01, lift, z + 0.012); m.rotation.set(0.32, 0, -0.18); }
      else if (k === 'awl') { m.position.set(x, lerp(0.05, -0.012, m.userData.vis), z); m.rotation.set(0.5, 0, -0.35); }
      else { m.position.set(x, lerp(0.05, -0.02, m.userData.vis), z); m.rotation.set(0.3, -(g && g.dir != null ? g.dir + PI / 2 : 0), 0); }
    }
    const act = ['brush', 'awl', 'comb'].find((k) => T[k].visible); T.shadow.material.opacity = act ? 0.45 * T[act].userData.vis : 0;
    if (act) { T.shadow.position.x = T[act].position.x + 0.02; T.shadow.position.z = T[act].position.z + 0.02; }
    // düşen damla: fırçanın ucundan suya
    const d = T.drip; if (d.visible) { const u = (d.userData.t += dt) / 0.16, [fx, fy] = d.userData.c; d.position.set(fx - EB_W / 2 + 0.01, lerp(0.04, 0.0, Math.min(1, u * u)), EB_H / 2 - fy + 0.012); d.scale.set(0.8, 1.3, 0.8); if (u >= 1) { d.visible = false; this.ripple(fx, fy, 0.5); this.plip(fx, 0.06, 0.9); } }
  },
  /* ----- ipucu eli ----- */
  updateHand(dt) {
    const el = $('#ebHand'); if (!el) return; const S = this.step, peel = this.mode === 'paper' && this.paperState === 'lifting' && !this.g && !this.peelRelease && this.pU.uLift.value < -0.3, show = peel || (this.mode === 'lesson' && S && !this.g && S.k !== 'kagit' && !this.wipe && (this.stepT < 3.2 || this.idleT > 6));
    this.stepT += dt; el.classList.toggle('on', !!show); if (!show) { this.handT = 0; return; }
    this.handT += dt; let x = 0.5, y = 0.7, press = 0; const u = (this.handT % 2.2) / 2.2;
    if (peel) { const e = Ease.inOutSine(clamp01((u - 0.15) / 0.65)); x = lerp(0.03, 0.6, e); y = 0.62; press = u > 0.12 && u < 0.85 ? 1 : 0; }
    else if (S.k === 'damla') { const list = S.multi || [[S.c[0], S.c[1], S.r]], i = list.findIndex((_, k) => !this.done[k]); if (i < 0) return; [x, y] = list[i]; press = u > 0.25 && u < 0.8 ? 1 : 0; }
    else if (S.k === 'cek' || S.k === 'sap') { const P = S.k === 'sap' ? [S.path[0], S.path[2]] : S.paths[S.paths.findIndex((_, k) => !this.done[k])] || S.paths[0]; const e = Ease.inOutSine(clamp01((u - 0.15) / 0.65)); x = lerp(P[0][0], P[1][0], e); y = lerp(P[0][1], P[1][1], e); press = u > 0.12 && u < 0.85 ? 1 : 0; }
    else if (S.k === 'serp') { x = 0.5 + Math.sin(this.handT * 1.7) * 0.25; y = 0.7 + Math.cos(this.handT * 1.1) * 0.35; press = 1; }
    const v = new THREE.Vector3(x - 0.5, 0, 0.7 - y).project(ebCam); el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(0.5 - v.y * 0.5) * innerHeight}px) scale(${press ? 0.86 : 1})`; el.classList.toggle('press', !!press);
  },
  /* ----- kâğıt: yatır, emdir, kaldır, çerçevele ----- */
  startPaper() {
    if (this.mode !== 'lesson' && this.mode !== 'free') return; this.endGesture(); this.paperFrom = this.mode; this.mode = 'paper'; this.hideGuides(); $('#ebNext').classList.remove('show'); $('#ebUndo').classList.remove('show');
    this.flush(); this.printM.uniforms.tSrc.value = this.cur.texture; post.pass(this.printM, this.printRT);
    this.paper.visible = true; this.paperState = 'lay'; this.pT = 0; this.pU.uLay.value = -0.62; this.pU.uLift.value = -1; this.pU.uHover.value = 0.3; this.pU.uSoak.value = 0; this.peelRelease = false;
    this.ui('paper'); this.say(this.paperFrom === 'lesson' ? 'Kâğıdı yavaşça yatırıyoruz… bir kenardan öbürüne, hava kalmasın.' : 'Kâğıdı yatırıyoruz…');
    if (audio.ok) audio.noiseHit(audio.t, 1.2, 0.05, { type: 'bandpass', f: 1800, f1: 600, q: 0.8, a: 0.3, verb: 0.3 });
  },
  updatePaper(dt) {
    if (this.mode !== 'paper') return; this.pT += dt; const P = this.pU, t = this.pT;
    if (this.paperState === 'lay') {
      P.uHover.value = lerp(0.3, 0.0015, Ease.outCubic(clamp01(t / 0.7))); P.uLay.value = lerp(-0.62, 0.62, Ease.inOutSine(clamp01((t - 0.45) / 1.5))); P.uSoak.value = clamp01((t - 0.6) / 1.6);
      if (t > 2.6) { this.paperState = 'lifting'; this.pT = 0; this.say('Şimdi… sol kenarından tutup sağa doğru yavaşça kaldır.'); $('#ebPeel').classList.add('on'); if (audio.ok) audio.noiseHit(audio.t, 0.5, 0.03, { type: 'lowpass', f: 900 }); }
    } else if (this.paperState === 'lifting') {
      const g = this.g; let L = P.uLift.value; if (L < -0.55) L = -0.55;
      if (g && g.kind === 'peel' && g.x != null) { const target = g.l0 + (g.x - g.x0) / (innerWidth * 0.75) * 1.4; const nL = clamp(Math.max(L, target), -0.55, 0.9); this.peelSound(nL - L, dt); L = nL; }
      else if (this.peelRelease || t > 9) { const nL = L + dt * 0.5; this.peelSound(nL - L, dt); L = nL; }
      P.uLift.value = L; $('#ebPeel').classList.toggle('on', !this.peelRelease && !g && L < -0.3);
      // kalkan yerden su boşalır (boya kâğıda geçti)
      this.wU.uClear.value = clamp01((L + 0.5) / 1.1) * 0.8;
      if (L > 0.5 + PI * P.uR.value + 0.02) { this.paperState = 'show'; this.pT = 0; this.stopLoop('swish'); this.reveal(); }
    } else if (this.paperState === 'show') {
      // kâğıt çerçeveye dönüşür: ters dönmüş baskının yerinden kalkıp kameraya süzülür
      const F = this.frame;
      if (!F.visible) {
        F.visible = true; this.paper.visible = false; const L = P.uLift.value, R = P.uR.value;
        this.fFrom = new THREE.Vector3(2 * L - PI * R, P.uHover.value + 2 * R + 0.003, 0); this.fQ0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2, 0, 0)); this.frameTarget();
      }
      const u = Ease.inOutCubic(clamp01(t / 1.5));
      F.position.lerpVectors(this.fFrom, this.fTo, u); F.position.y += Math.sin(u * PI) * 0.18;
      F.quaternion.slerpQuaternions(this.fQ0, this.fQ1, u); F.rotateY(Math.sin(u * PI) * -0.35 + Math.sin(this.t * 0.7) * 0.025 * u); F.rotateX(Math.sin(this.t * 0.55) * 0.015 * u);
      F.scale.setScalar(lerp(1, this.fS, u)); for (const m of this.frameMats) m.opacity = clamp01(t / 0.6); this.artU.uSweep.value = lerp(-0.4, 1.8, clamp01((t - 1.3) / 1.3));
      this.wU.uClear.value = lerp(0.8, 0.94, u);
    }
  },
  // çerçevenin duracağı yer: kartın üstünde kalan alanın ortası
  frameTarget() {
    const w = innerWidth, h = innerHeight, Rc = this.rect(), d = this.camD * 0.6, tn = Math.tan(deg(ebCam.fov / 2));
    const top = Rc.land ? Rc.t : 96, bot = Rc.land ? Rc.b + 8 : Math.min(320, h * 0.42) + 12, cy = (top + h - bot) / 2, cx = Rc.land ? (Rc.l + w - Rc.r) / 2 : w / 2, aW = Rc.land ? w - Rc.l - Rc.r : w * 0.86;
    const availH = Math.max(120, h - bot - top - 12), sH = (availH / h) * 2 * tn * d / (EB_H + 0.3), sW = (aW / h) * 2 * tn * d / (EB_W + 0.3);
    const ndc = new THREE.Vector3(2 * cx / w - 1, 1 - 2 * cy / h, 0.5).unproject(ebCam), dir = ndc.sub(ebCam.position).normalize();
    this.fTo = ebCam.position.clone().addScaledVector(dir, d); this.fS = Math.min(sH, sW) * 0.96; this.fQ1 = ebCam.quaternion.clone();
  },
  peelSound(dl, dt) { if (!audio.ok) return; if (!this.loops || !this.loops.swish) this.loop('swish', 'swish'); this.loopSet('swish', clamp01(Math.abs(dl) / dt / 0.6), 900 + clamp01(Math.abs(dl) / dt) * 900); if (Math.random() < dl * 40) audio.noiseHit(audio.t, 0.02, 0.02, { type: 'highpass', f: 3000 }); },
  reveal() {
    $('#ebPeel').classList.remove('on');
    let pct = null, stars = 0;
    if (this.paperFrom === 'lesson') { pct = this.score(); stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1; const sv = Save.data.ebru || (Save.data.ebru = {}); sv.lale = Math.max(sv.lale || 0, stars); Save.save(); }
    if (audio.ok) { const t = audio.t; stMus.ok && [0, 2, 4, 7, 9, 11].forEach((d, k) => stMus.pluck(t + 0.1 + k * 0.09, stMus.note(d), 'kanun', 0.07)); stMus.ok && stMus.zil(t + 0.6, 0.04); stMus.ok && stMus.ney(t + 0.9, [[stMus.note(stMus.mk.g) + 12, 0.6], [stMus.note(1) + 12, 0.35], [stMus.note(0) + 12, 1.8]], 0.04); }
    setTimeout(() => {
      if (this.mode !== 'paper') return; this.ui('card'); const st = $('#ebStars'); st.innerHTML = '';
      if (pct != null) { for (let k = 0; k < 3; k++) { const s = document.createElement('i'); s.textContent = '★'; if (k < stars) { s.className = 'on'; s.style.animationDelay = `${0.2 + k * 0.18}s`; setTimeout(() => audio.star(k, true), 250 + k * 180); } st.appendChild(s); } }
      $('#ebCardK').textContent = pct != null ? 'Lale ebrusu' : 'Serbest eser';
      $('#ebScore').textContent = pct != null ? `Ustanın lalesine benzerlik %${pct}` : '';
      $('#ebWord').textContent = pct == null ? 'Bir daha asla aynısı olmayacak bir eser… Eline sağlık.' : stars === 3 ? '“Su sana sırrını verdi evladım. Bu lale benim albümüme girer.”' : stars === 2 ? '“Güzel olmuş. Su bir dahakine daha çok konuşur seninle.”' : '“Her ustanın ilk lalesi böyledir. Bir daha deneyelim mi?”';
      $('#ebToFree').style.display = pct != null ? '' : 'none'; $('#ebAgain').textContent = pct != null ? 'Tekrarla' : 'Yeni sayfa';
      this.say('');
    }, 1150);
  },
  // benzerlik: aynı adımların ustaca hâli küçük bir alanda yeniden işlenir, renk sınıflarının örtüşmesi ölçülür
  score() {
    try {
      const mW = 256, mH = Math.round(mW * EB_H), sw = this.sTex.x, sh = this.sTex.y, o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
      if (!this.ia) { this.ia = new THREE.WebGLRenderTarget(mW, mH, o); this.ib = new THREE.WebGLRenderTarget(mW, mH, o); }
      const T = { a: this.ia, b: this.ib, tex: new THREE.Vector2(mW, mH) }; this.fill.uniforms.uCol.value.set(...ebHex(EB_PAL[0])); post.pass(this.fill, T.a);
      const save = this.ops; this.ops = [];
      for (const S of EB_LALE) {
        if (S.k === 'damla') for (const [x, y, r] of S.multi || [[S.c[0], S.c[1], S.r]]) this.opDrop(x, y, r * r, S.col, r, 1);
        if (S.k === 'cek') for (const p of S.paths) this.awlPath(p[0][0], p[0][1], p[1][0], p[1][1], S.lam);
        if (S.k === 'sap') { const P = S.path, pts = []; for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 16; k++) pts.push([lerp(P[i][0], P[i + 1][0], k / 16), lerp(P[i][1], P[i + 1][1], k / 16)]); pts.push(P.at(-1)); let acc = 0; for (let i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc > 0.014) { acc -= 0.014; this.opDrop(pts[i][0], pts[i][1], 0.0085 * 0.0085, 6, 0.0085, 1); } } for (let i = 0; i < pts.length - 1; i++) this.awlPath(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.0075); }
      }
      this.flush(T); this.ops = save;
      const ideal = new Uint8Array(sw * sh * 4), mine = new Uint8Array(sw * sh * 4);
      this.copyRT(T.a, this.sa); renderer.readRenderTargetPixels(this.sa, 0, 0, sw, sh, ideal);
      this.copyRT(this.cur, T.b); this.copyRT(T.b, this.sb); renderer.readRenderTargetPixels(this.sb, 0, 0, sw, sh, mine);
      // renk sınıfları: lale boyaları; zemin = açık/koyu mavi, ak ve aralarındaki karışımlar
      const cls = [3, 4, 5, 6].map((i) => ebHex(EB_PAL[i]).map((v) => v * 255)), b0 = [0, 1, 2, 11].map((i) => ebHex(EB_PAL[i]).map((v) => v * 255)), bg = b0.slice();
      for (let i = 0; i < b0.length; i++) for (let j = i + 1; j < b0.length; j++) bg.push(b0[i].map((v, k) => (v + b0[j][k]) / 2));
      const d2 = (d, o, c) => (d[o] - c[0]) ** 2 + (d[o + 1] - c[1]) ** 2 + (d[o + 2] - c[2]) ** 2;
      const near = (d, o) => { let b = -1, bd = 1e9; cls.forEach((c, k) => { const e = d2(d, o, c); if (e < bd) { bd = e; b = k; } }); for (const c of bg) if (d2(d, o, c) < bd) return -1; return b; };
      const N = sw * sh, ci = new Int8Array(N), cm = new Int8Array(N); for (let i = 0; i < N; i++) { ci[i] = near(ideal, i * 4); cm[i] = near(mine, i * 4); }
      // yalnız lalenin çevresi sayılır (zemindeki karışık tonlar boyaya benzemesin)
      const R = 5, mask = new Uint8Array(N); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { if (ci[y * sw + x] < 0) continue; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < sw && Y < sh && dx * dx + dy * dy <= R * R) mask[Y * sw + X] = 1; } }
      const I = [0, 0, 0, 0], U = [0, 0, 0, 0], A = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) { if (!mask[i]) continue; const a = ci[i], b = cm[i]; if (a >= 0) { A[a]++; U[a]++; if (a === b) I[a]++; } if (b >= 0 && b !== a) U[b]++; }
      this.scoreA = this.sa; this.scoreDbg = { I, U, A };
      let s = 0, ws = 0; for (let k = 0; k < 4; k++) { if (!A[k]) continue; const wgt = Math.sqrt(A[k]); s += wgt * (I[k] / Math.max(1, U[k])); ws += wgt; }
      const raw = ws ? s / ws : 0; this.scoreRaw = raw;
      return Math.round(clamp01((raw - 0.2) / 0.62) * 100);
    } catch (e) { console.warn('ebru skor', e); return 60; }
  },
  savePng() {
    try {
      const w = this.tex.x, h = this.tex.y, px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(this.printRT, 0, 0, w, h, px);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h);
      for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      x.putImageData(im, 0, 0); const name = (this.paperFrom === 'lesson' ? 'lale-ebrusu' : 'ebru') + '.png';
      const dl = () => { const a = document.createElement('a'); a.download = name; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast('Eserin kaydedildi.', 2); };
      // telefonda paylaşım menüsü (aileye gönder), yoksa indir
      c.toBlob((bl) => {
        try { const f = new File([bl], name, { type: 'image/png' }); if (bl && navigator.canShare && navigator.canShare({ files: [f] }) && matchMedia('(pointer:coarse)').matches) { navigator.share({ files: [f], title: 'Ebrum' }).catch(() => {}); return; } } catch (e) {}
        dl();
      }, 'image/png');
    } catch (e) { toast('Kaydedilemedi.', 2); }
  },
};
