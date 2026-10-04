
/* =====================================================================
   RENDER — renderer, uyarlanabilir kalite, özel post-process zinciri
   ===================================================================== */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x140f24, 1);
const gl = renderer.getContext();

const QUALITY = [
  { name: 'Düşük', dpr: 1.0, maxPix: 0.95e6, shadow: 1024, msaa: 0, levels: 4, rays: false, tilt: false, grass: 900, particles: 260, cloudOct: 2, texScale: 0.5, flare: 0.6 },
  { name: 'Orta', dpr: 1.4, maxPix: 1.7e6, shadow: 1024, msaa: 0, levels: 5, rays: true, tilt: false, grass: 2200, particles: 460, cloudOct: 3, texScale: 0.75, flare: 1 },
  { name: 'Yüksek', dpr: 1.8, maxPix: 2.7e6, shadow: 2048, msaa: 4, levels: 5, rays: true, tilt: true, grass: 4200, particles: 720, cloudOct: 4, texScale: 1, flare: 1 },
  { name: 'Ultra', dpr: 2.0, maxPix: 4.2e6, shadow: 2048, msaa: 4, levels: 6, rays: true, tilt: true, grass: 6800, particles: 1000, cloudOct: 5, texScale: 1, flare: 1 },
];
function guessQuality() {
  let gpu = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)); } catch (e) {}
  const g = gpu.toLowerCase();
  const touch = matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  let q = touch ? 1 : 2;
  if (/swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [34]\d\d|powervr sgx|sgx/.test(g)) q = 0;
  else if (/apple/.test(g) && touch) q = 2;
  else if (/adreno \(tm\) (6[4-9]\d|7\d\d|8\d\d)|mali-g7[1-9]|mali-g[6-9]\d\d|xclipse|immortalis/.test(g)) q = 2;
  else if (!touch && /nvidia|geforce|radeon|rtx|gtx|arc|m1|m2|m3|m4/.test(g)) q = 3;
  if (mem <= 2 || cores <= 4) q = Math.min(q, 1);
  return { q, gpu };
}

/* ---------- uyarlanabilir kalite ----------
   Kare süresi izlenir: uzun süre yavaşsa önce çözünürlük, sonra kademe düşer.
   60 Hz ekranda kare süresi 16.7 ms'nin altına inemez; bu yüzden yükseltme "deneme" ile yapılır:
   kararlı 60 fps sürerse bir kademe denenir, kaldıramazsa geri dönülür ve tavan olarak hatırlanır.
   Öğrenilen ayar cihaz (GPU adı) için kaydedilir: sonraki açılış doğru kademeden başlar. */
const Perf = {
  auto: Save.data.settings.quality === 'auto', level: 1, cap: 3, scale: 1, ema: 16.7, jit: 0, slow: 0, fast: 0, stable: 0, lastChange: 0, ups: 0, gpu: '', probe: null, ceil: null, t0: 0, dirty: false,
  init() {
    const g = guessQuality(); this.gpu = g.gpu; this.probe = null; this.stable = 0; this.slow = 0; this.fast = 0;
    if (this.auto) {
      const sv = Save.data.perf;
      if (sv && sv.gpu === g.gpu && sv.level != null) { this.level = sv.level; this.scale = sv.scale || 1; this.ceil = sv.ceil || null; this.cap = Math.min(3, Math.max(sv.level, g.q) + 1); }
      else { this.level = g.q; this.scale = 1; this.ceil = null; this.cap = Math.min(3, g.q + 1); }
    } else { this.level = { low: 0, mid: 1, high: 2, ultra: 3 }[Save.data.settings.quality] ?? 1; this.scale = 1; }
  },
  get Q() { return QUALITY[this.level]; },
  key() { return this.level * 10 + Math.round(this.scale * 100) / 100; },
  remember() { if (!this.auto) return; Save.data.perf = { gpu: this.gpu, level: this.level, scale: this.scale, ceil: this.ceil }; Save.save(); this.dirty = false; },
  down() {
    if (this.scale > 0.76) { this.scale = Math.round((this.scale - 0.12) * 100) / 100; onResize(); }
    else if (this.level > 0) { this.level--; this.scale = 0.92; applyQuality(); }
    else return false;
    return true;
  },
  nextUp() { if (this.scale < 1) return { level: this.level, scale: Math.min(1, Math.round((this.scale + 0.08) * 100) / 100) }; if (this.level < this.cap) return { level: this.level + 1, scale: 1 }; return null; },
  up() {
    const n = this.nextUp(); if (!n) return false;
    if (this.ceil != null && n.level * 10 + n.scale >= this.ceil - 1e-6) return false; // bu kademe daha önce kaldırılamadı
    const lv = n.level !== this.level; this.level = n.level; this.scale = n.scale; if (lv) applyQuality(); else onResize();
    return true;
  },
  sample(ms, now) {
    if (ms > 120) return; // tekil takılmalar (derleme vb.) sayılmaz
    if (!this.t0) this.t0 = now;
    this.ema = lerp(this.ema, ms, 0.06); this.jit = lerp(this.jit, Math.abs(ms - this.ema), 0.06);
    if (!this.auto) return;
    const warm = now - this.t0 < 14, lock = warm ? 0.9 : 2.5; // açılışta (film sırasında) hızlı karar
    if (now - this.lastChange < lock) return;
    // deneme yükseltmesi kaldırılamadıysa geri dön, bu kademeyi tavan say
    if (this.probe) {
      if (this.ema > 18.4) { const p = this.probe; this.probe = null; this.ceil = this.ceil == null ? this.key() : Math.min(this.ceil, this.key()); this.level = p.level; this.scale = p.scale; this.lastChange = now; applyQuality(); this.remember(); return; }
      if (now - this.probe.t > 5) { this.probe = null; this.remember(); }
    }
    if (this.ema > 21.5) { this.slow += ms / 1000; this.fast = 0; this.stable = 0; } else this.slow = Math.max(0, this.slow - ms / 2000);
    if (this.ema < 13.8) this.fast += ms / 1000; else this.fast = 0;
    if (this.ema < 17.6 && this.jit < 2.2) this.stable += ms / 1000; else this.stable = Math.max(0, this.stable - ms / 500);
    if (this.slow > (warm ? 0.6 : 1.4)) {
      this.slow = 0; this.stable = 0; this.lastChange = now; this.probe = null;
      const failed = this.key(); if (this.down()) { this.ceil = this.ceil == null ? failed : Math.min(this.ceil, failed); this.dirty = true; }
    } else if ((this.fast > 6 && this.ups < 3) || (this.stable > 9 && !this.probe && this.ups < 4)) {
      const from = { level: this.level, scale: this.scale };
      this.fast = 0; this.stable = 0;
      if (this.up()) { this.ups++; this.lastChange = now; this.probe = { ...from, t: now }; }
    }
    if (this.dirty && now - this.lastChange > 12) this.remember();
  },
};
Perf.init();

/* ---------- tam ekran üçgen ve post shader'ları ---------- */
const FS_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const fsGeo = new THREE.BufferGeometry();
fsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false;
const fsScene = new THREE.Scene(); fsScene.add(fsMesh);
const mkPass = (frag, uniforms, defines = {}) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, defines, depthTest: false, depthWrite: false });

const DOWN_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst; varying vec2 vUv;
vec3 k(vec3 c){ float l = dot(c, vec3(0.2126,0.7152,0.0722)); return c * min(1.0, 48.0 / max(l, 1e-4)); }
void main(){
  vec2 h = uTexel;
  vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
  s += texture2D(tSrc, vUv - h).rgb; s += texture2D(tSrc, vUv + h).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb; s += texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb;
  s /= 8.0;
  if (uFirst > 0.5) { if (any(isnan(s)) || any(isinf(s))) s = vec3(0.0); s = k(max(s, 0.0)); }
  gl_FragColor = vec4(s, 1.0);
}`;
const UP_FRAG = /* glsl */`
uniform sampler2D tLow; uniform sampler2D tCur; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec2 h = uTexel;
  vec3 s = texture2D(tLow, vUv + vec2(-h.x*2.0, 0.0)).rgb;
  s += texture2D(tLow, vUv + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture2D(tLow, vUv + vec2(0.0, h.y*2.0)).rgb;
  s += texture2D(tLow, vUv + vec2(h.x, h.y)).rgb * 2.0;
  s += texture2D(tLow, vUv + vec2(h.x*2.0, 0.0)).rgb;
  s += texture2D(tLow, vUv + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture2D(tLow, vUv + vec2(0.0, -h.y*2.0)).rgb;
  s += texture2D(tLow, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  gl_FragColor = vec4(s / 12.0 + texture2D(tCur, vUv).rgb, 1.0);
}`;
const RAYS_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uSun; uniform vec2 uSun2; uniform float uSun2On; uniform float uAspect; uniform float uThresh; varying vec2 vUv;
vec3 march(vec2 sun){
  vec2 d = (sun - vUv) / 26.0; vec2 p = vUv; vec3 acc = vec3(0.0); float w = 1.0;
  for (int i = 0; i < 26; i++){ p += d; vec3 s = texture2D(tSrc, clamp(p, 0.001, 0.999)).rgb; float l = dot(s, vec3(0.2126,0.7152,0.0722)); acc += s * smoothstep(uThresh, uThresh*2.5, l) * w; w *= 0.955; }
  vec2 q = (vUv - sun) * vec2(uAspect, 1.0);
  return acc / 26.0 * exp(-length(q) * 1.6);
}
void main(){ vec3 c = march(uSun); if (uSun2On > 0.5) c += march(uSun2) * vec3(0.7, 0.9, 1.2); gl_FragColor = vec4(c, 1.0); }`;
const COMP_FRAG = /* glsl */`
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tBlurA; uniform sampler2D tBlurB; uniform sampler2D tRays;
uniform float uBloomMix, uBloomAdd, uRays, uExposure, uVignette, uGrain, uTime, uSat, uContrast, uCA, uDesat, uFlash, uDanger, uAspect, uTilt, uTiltC, uTiltW, uNight, uFlare, uLevels;
uniform vec3 uFlashCol, uLift, uGamma, uGain, uHeat, uFlareCol;
uniform vec2 uSunUV, uRes; uniform float uSunVis;
varying vec2 vUv;
vec3 aces(vec3 x){ x *= 0.6; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 uv = vUv;
  if (uHeat.z > 0.001){
    vec2 d = (uv - uHeat.xy) * vec2(uAspect, 1.0); float a = uHeat.z * exp(-dot(d,d) * 90.0);
    uv += vec2(sin(uv.y * 120.0 + uTime * 17.0), cos(uv.x * 110.0 + uTime * 13.0)) * 0.0035 * a;
  }
  vec3 col;
  if (uCA > 0.0001){ vec2 cd = (uv - 0.5) * uCA; col = vec3(texture2D(tScene, uv + cd).r, texture2D(tScene, uv).g, texture2D(tScene, uv - cd).b); }
  else col = texture2D(tScene, uv).rgb;
  if (any(isnan(col))) col = vec3(0.0);
  col = clamp(col, 0.0, 60.0);
#ifdef TILT
  float ty = abs(uv.y - uTiltC);
  float b = smoothstep(uTiltW, uTiltW + 0.34, ty) * uTilt;
  if (b > 0.001){ vec3 bA = texture2D(tBlurA, uv).rgb; vec3 bB = texture2D(tBlurB, uv).rgb; col = mix(col, mix(bA, bB, smoothstep(0.45, 1.0, b)), min(1.0, b * 1.5)); }
#endif
  vec3 bloom = texture2D(tBloom, uv).rgb / uLevels;
  col = mix(col, bloom, uBloomMix) + max(bloom - 0.85, 0.0) * uBloomAdd;
#ifdef RAYS
  col += texture2D(tRays, uv).rgb * uRays;
#endif
  // anamorfik parlama + hayalet diskler
  if (uSunVis > 0.001){
    vec2 sd = (uv - uSunUV) * vec2(uAspect, 1.0);
    float streak = exp(-abs(sd.y) * 190.0) * exp(-abs(sd.x) * 4.5);
    vec3 fl = uFlareCol * streak * 0.7;
    vec2 axis = vec2(0.5) - uSunUV;
    for (int i = 0; i < 4; i++){
      float k = float(i) * 0.38 + 0.45; vec2 gp = uSunUV + axis * k * 2.0;
      float r = 0.025 + float(i) * 0.018; float gd = length((uv - gp) * vec2(uAspect, 1.0));
      fl += mix(uFlareCol, vec3(0.5, 0.7, 1.0), float(i) / 3.0) * (1.0 - smoothstep(r * 0.55, r, gd)) * 0.10;
    }
    col += fl * uSunVis * uFlare;
  }
  col *= uExposure;
  col = aces(col);
  col = toSRGB(col);
  col = pow(max(col, 0.0), uGamma) * uGain + uLift * (1.0 - col);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat * (1.0 - uDesat));
  col = (col - 0.5) * uContrast + 0.5;
  // gece tonu (soğuk)
  col = mix(col, col * vec3(0.82, 0.9, 1.18), uNight * 0.35);
  vec2 vd = (vUv - 0.5) * vec2(uAspect * 0.8, 1.0);
  float vig = (1.0 - smoothstep(0.28, 0.95, length(vd)));
  col *= mix(1.0, vig, uVignette);
  col += vec3(1.0, 0.36, 0.08) * (1.0 - vig) * uDanger * 0.55;
  col += uFlashCol * uFlash;
  float n = h12(vUv * uRes + fract(uTime * 7.31) * 113.0);
  col += (n - 0.5) * uGrain + (n - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class Post {
  constructor() {
    this.down = mkPass(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 0 } });
    this.up = mkPass(UP_FRAG, { tLow: { value: null }, tCur: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.rays = mkPass(RAYS_FRAG, { tSrc: { value: null }, uSun: { value: new THREE.Vector2() }, uSun2: { value: new THREE.Vector2() }, uSun2On: { value: 0 }, uAspect: { value: 1 }, uThresh: { value: 3.0 } });
    this.u = {
      tScene: { value: null }, tBloom: { value: null }, tBlurA: { value: null }, tBlurB: { value: null }, tRays: { value: null },
      uBloomMix: { value: 0.045 }, uBloomAdd: { value: 0.35 }, uRays: { value: 0.55 }, uExposure: { value: 1.0 }, uVignette: { value: 0.55 }, uGrain: { value: 0.03 },
      uTime: { value: 0 }, uSat: { value: 1 }, uContrast: { value: 1 }, uCA: { value: 0 }, uDesat: { value: 0 }, uFlash: { value: 0 }, uDanger: { value: 0 },
      uAspect: { value: 1 }, uTilt: { value: 1 }, uTiltC: { value: 0.45 }, uTiltW: { value: 0.2 }, uNight: { value: 0 }, uFlare: { value: 1 }, uLevels: { value: 5 },
      uFlashCol: { value: new THREE.Color(1, 0.9, 0.7) }, uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
      uHeat: { value: new THREE.Vector3() }, uFlareCol: { value: new THREE.Color(1, 0.8, 0.55) }, uSunUV: { value: new THREE.Vector2(0.5, 0.8) }, uRes: { value: new THREE.Vector2(1, 1) }, uSunVis: { value: 0 },
    };
    this.comp = null; this.rts = []; this.ups = []; this.rtScene = null; this.rtRays = null; this.w = 0; this.h = 0;
  }
  build(w, h, Q) {
    this.dispose();
    this.w = w; this.h = h; this.Q = Q;
    const opt = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false, samples: Q.msaa, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const n = Q.levels;
    for (let i = 0; i < n; i++) { const d = Math.pow(2, i + 1); this.rts.push(new THREE.WebGLRenderTarget(Math.max(2, Math.round(w / d)), Math.max(2, Math.round(h / d)), opt)); }
    for (let i = 0; i < n - 1; i++) this.ups.push(new THREE.WebGLRenderTarget(this.rts[i].width, this.rts[i].height, opt));
    if (Q.rays) this.rtRays = new THREE.WebGLRenderTarget(this.rts[1].width, this.rts[1].height, opt);
    const defines = {}; if (Q.tilt) defines.TILT = 1; if (Q.rays) defines.RAYS = 1;
    // yalnızca efekt seti değişince yeni shader (boyut değişiminde yeniden derleme takılması olmasın)
    const dk = (Q.tilt ? 'T' : '') + (Q.rays ? 'R' : '');
    if (!this.comp || this.compKey !== dk) { if (this.comp) this.comp.dispose(); this.comp = mkPass(COMP_FRAG, this.u, defines); this.compKey = dk; }
    this.u.uLevels.value = n; this.u.uRes.value.set(w, h); this.u.uAspect.value = w / h; this.rays.uniforms.uAspect.value = w / h;
  }
  dispose() {
    if (this.rtScene) this.rtScene.dispose();
    for (const r of this.rts) r.dispose(); for (const r of this.ups) r.dispose();
    if (this.rtRays) this.rtRays.dispose();
    this.rts = []; this.ups = []; this.rtRays = null; this.rtScene = null;
  }
  pass(mat, target) { fsMesh.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
  render(scene, camera) {
    renderer.setRenderTarget(this.rtScene); renderer.render(scene, camera);
    const n = this.rts.length;
    let src = this.rtScene;
    for (let i = 0; i < n; i++) {
      this.down.uniforms.tSrc.value = src.texture; this.down.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
      this.pass(this.down, this.rts[i]); src = this.rts[i];
    }
    let low = this.rts[n - 1];
    for (let i = n - 2; i >= 0; i--) {
      this.up.uniforms.tLow.value = low.texture; this.up.uniforms.tCur.value = this.rts[i].texture; this.up.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
      this.pass(this.up, this.ups[i]); low = this.ups[i];
    }
    if (this.rtRays) { this.rays.uniforms.tSrc.value = this.rts[1].texture; this.pass(this.rays, this.rtRays); }
    const u = this.u;
    u.tScene.value = this.rtScene.texture; u.tBloom.value = this.ups[0].texture; u.tBlurA.value = this.rts[0].texture; u.tBlurB.value = this.rts[1].texture;
    u.tRays.value = this.rtRays ? this.rtRays.texture : this.rts[1].texture;
    this.pass(this.comp, null);
  }
}
const post = new Post();
