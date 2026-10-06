
/* =====================================================================
   ÇEVRE — ortak uniformlar, malzeme enjeksiyonu, gökyüzü, bulut denizi,
   güneş küresi ve pirinç yay, ışıklar, uzak adalar, kuşlar
   ===================================================================== */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);
const U = {
  uTime: { value: 0 }, uNightC: { value: new THREE.Vector2() }, uNightR: { value: 0 }, uNightAmt: { value: 0 }, uNightRim: { value: 0 },
  uCamPos: { value: new THREE.Vector3() }, uFogCol: { value: new THREE.Color() }, uFogNear: { value: 70 }, uFogFar: { value: 340 },
  uBelowCol: { value: new THREE.Color() }, uZifir: { value: new THREE.Vector3(0, -100, 0) }, uWind: { value: 1 }, uGlowCol: { value: new THREE.Color(4.0, 2.1, 0.8) },
  uSoftSh: { value: 0 },
  // dünya ayrıntısı: güneş yönü/rengi, gök rengi, ayrıntı gücü (kaliteye göre)
  uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color(1, 1, 1) }, uSkyC: { value: new THREE.Color(0.6, 0.7, 1) }, uDetail: { value: 1 },
};
/* Yumuşak gölge kenarları (Yüksek/Ultra): engelden uzaklaştıkça yumuşayan, temas noktasında keskin kalan gölge (PCSS).
   Shader'a bir kez eklenir; kalite değişince yalnızca uSoftSh anahtarı değişir (yeniden derleme yok). Dünya malzemeleri
   dışındaki nesnelerde uniform hiç verilmez (0) ve olağan gölge yolu kullanılır. */
{
  const PCSS = `
  uniform float uSoftSh;
  const vec2 PCSS_D[8] = vec2[](vec2(0.250,0.000), vec2(-0.319,0.292), vec2(0.049,-0.557), vec2(0.402,0.525), vec2(-0.739,-0.131), vec2(0.700,-0.445), vec2(-0.234,0.870), vec2(-0.446,-0.859));
  float pcssShadow(sampler2D sm, vec2 smSize, vec4 sc) {
    // piksel başına döndürülen 8 noktalı Vogel diski (ucuz gürültü), önce engel araması
    float a = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float ca = cos(a), sa = sin(a); mat2 R = mat2(ca, -sa, sa, ca);
    vec2 tx = 1.0 / smSize;
    float bs = 0.0, bn = 0.0;
    for (int i = 0; i < 8; i++) { float d = unpackRGBAToDepth(texture2D(sm, sc.xy + R * PCSS_D[i] * tx * 7.0)); if (d < sc.z) { bs += d; bn += 1.0; } }
    if (bn < 0.5) return 1.0;   // tam aydınlık: süzme yok
    if (bn > 7.5) return 0.0;   // tam gölge: süzme yok
    // yarıgölge: engel-yüzey uzaklığıyla büyür (gölge kamerası 129 m derin, 29 m geniş)
    float r = clamp(1.0 + (sc.z - bs / bn) * 129.0 * 0.02 * smSize.x / 29.0, 1.0, 5.0); // ince: oynanışta gölge sınırı net kalmalı
    float s = 0.0;
    for (int i = 0; i < 8; i++) s += texture2DCompare(sm, sc.xy + R * PCSS_D[i] * tx * r, sc.z);
    return s * 0.125;
  }
`;
  let ch = THREE.ShaderChunk.shadowmap_pars_fragment;
  const gi = ch.indexOf('float getShadow('), fi = ch.indexOf('if ( frustumTest ) {', gi);
  if (gi > 0 && fi > gi && ch.indexOf('#ifdef USE_SHADOWMAP') >= 0) {
    ch = ch.slice(0, fi) + 'if ( frustumTest && uSoftSh > 0.5 ) { shadow = pcssShadow( shadowMap, shadowMapSize, shadowCoord ); } else if ( frustumTest ) {' + ch.slice(fi + 'if ( frustumTest ) {'.length);
    ch = ch.slice(0, gi) + PCSS + ch.slice(gi); // texture2DCompare tanımından sonra, getShadow'dan önce
    THREE.ShaderChunk.shadowmap_pars_fragment = ch;
  }
}
const WORLD_VERT_HEAD = `varying vec3 vNW;\nuniform float uTime; uniform vec3 uZifir; uniform float uWind, uDetail;\n`;
const WORLD_FRAG_HEAD = `varying vec3 vNW;
uniform vec2 uNightC; uniform float uNightR, uNightAmt, uNightRim, uFogNear, uFogFar, uDetail; uniform vec3 uCamPos, uFogCol, uBelowCol, uGlowCol, uSunW, uSunC, uSkyC;
// dünya ayrıntısı: dünya uzayında değer gürültüsü (dokusuz yüzeylere doğal benek ve lekeler)
float wdH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wdN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(wdH(i), wdH(i + vec2(1.0, 0.0)), f.x), mix(wdH(i + vec2(0.0, 1.0)), wdH(i + vec2(1.0, 1.0)), f.x), f.y); }
float nightInside(){ float nd = length(vNW.xz - uNightC); return max(1.0 - smoothstep(uNightR - 2.5, uNightR, nd), smoothstep(18.0, 34.0, uNightR) * smoothstep(38.0, 50.0, length(vNW.xz))) * uNightAmt; }
`;
function injectWorld(sh, flags) {
  for (const k in U) sh.uniforms[k] = U[k];
  sh.vertexShader = WORLD_VERT_HEAD + sh.vertexShader;
  if (flags.grass) {
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wpos = modelMatrix * mvPosition;
      float hf = clamp(position.y / 0.42, 0.0, 1.6);
      float sw = sin(uTime * 1.7 + wpos.x * 0.7 + wpos.z * 0.45) * 0.6 + sin(uTime * 3.3 + wpos.x * 1.9 - wpos.z * 0.8) * 0.25;
      wpos.x += sw * 0.075 * hf * hf * uWind; wpos.z += sw * 0.03 * hf * hf * uWind;
      vec2 dz = wpos.xz - uZifir.xz; float dl = length(dz);
      float push = (1.0 - smoothstep(0.12, 0.8, dl)) * hf;
      wpos.xz += (dz / max(dl, 1e-3)) * push * 0.22; wpos.y -= push * 0.09;
      vNW = wpos.xyz;
      mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`);
  } else {
    if (flags.sway !== false) sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_COLOR
      { float leafy = clamp((color.g - max(color.r, color.b)) * 7.0, 0.0, 1.0);
        if (leafy > 0.0 && uWind > 0.0 && uDetail > 0.0) {
          vec4 sw0 = modelMatrix * vec4(transformed, 1.0); float hh = max(0.0, sw0.y - 0.3);
          float ph = uTime * 1.5 + sw0.x * 0.55 + sw0.z * 0.4;
          transformed.x += (sin(ph) * 0.7 + sin(ph * 2.3 + 1.3) * 0.3) * 0.022 * hh * leafy * uWind;
          transformed.z += cos(ph * 0.9 + 0.5) * 0.014 * hh * leafy * uWind; } }
      #endif`);
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 nw4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        nw4 = instanceMatrix * nw4;
      #endif
      vNW = (modelMatrix * nw4).xyz;`);
  }
  sh.fragmentShader = WORLD_FRAG_HEAD + sh.fragmentShader;
  if (flags.detail !== false) {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if (uDetail > 0.0) {
        float wm = wdN(vNW.xz * 0.3 + 7.0), wf = wdN(vNW.xz * 5.2 + vNW.y * 2.3) * 0.6 + wdN(vNW.zx * 12.5 - vNW.y * 4.1) * 0.4;
        diffuseColor.rgb *= mix(1.0, (0.86 + 0.28 * wm) * (0.88 + 0.24 * wf), uDetail);
      }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uDetail > 0.0) {
        vec3 Nw = inverseTransformDirection(normal, viewMatrix), Vw = normalize(uCamPos - vNW);
        float fr = pow(1.0 - clamp(dot(Nw, Vw), 0.0, 1.0), 3.0), day = 1.0 - uNightAmt;
        // gök kenar ışığı + güneş tarafında altın kenar: modeller arka plandan ayrılır
        totalEmissiveRadiance += (uSkyC * 0.08 + uSunC * max(dot(Nw, uSunW), 0.0) * 0.6) * fr * diffuseColor.rgb * 2.4 * day * uDetail;
        #ifdef USE_COLOR
        // yapraklar: güneş arkadayken ışığı geçirir (ince yaprak parıltısı)
        float leafy = clamp((vColor.g - max(vColor.r, vColor.b)) * 7.0, 0.0, 1.0);
        if (leafy > 0.0) { float back = max(dot(-Nw, uSunW), 0.0), bl = pow(max(dot(-Vw, uSunW), 0.0), 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * uSunC * (back * 0.42 + bl * 0.9) * leafy * day * uDetail; }
        #endif
      }`);
  }
  if (flags.glow) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uGlowCol * nightInside();');
  sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `{
      // gece hesabı yalnızca gece/tutulma varken (gündüz tüm dünya piksellerinde atlanır)
      if (uNightAmt > 0.0) {
        float ins = nightInside();
        vec3 nc = gl_FragColor.rgb * vec3(0.15, 0.19, 0.4) + vec3(0.002, 0.003, 0.011);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, nc, ins * 0.92);
        if (uNightRim > 0.0) { float rd = (length(vNW.xz - uNightC) - uNightR) * 1.1; gl_FragColor.rgb += vec3(0.65, 0.42, 1.0) * exp(-rd * rd) * uNightRim * 1.6; }
      }
      ${flags.noFog ? '' : 'float fd = length(vNW - uCamPos); gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogCol, smoothstep(uFogNear, uFogFar, fd));'}
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uBelowCol, (1.0 - smoothstep(-11.5, -3.0, vNW.y)) * 0.94);
    }
    #include <dithering_fragment>`);
}
function worldMat(opts, flags = {}) {
  const m = new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = (sh) => injectWorld(sh, flags);
  const key = 'W' + (flags.grass ? 'g' : '') + (flags.glow ? 'l' : '') + (flags.noFog ? 'n' : '') + (flags.detail === false ? 'd' : '') + (flags.sway === false ? 's' : '');
  m.customProgramCacheKey = () => key;
  return m;
}

/* ---------- ışıklar ---------- */
const sunLight = new THREE.DirectionalLight(0xffffff, 3);
const sunLight2 = new THREE.DirectionalLight(0x9fd8ff, 0);
const hemi = new THREE.HemisphereLight(0xa0b8ff, 0xd8b48c, 1.0);
for (const L of [sunLight, sunLight2]) {
  L.castShadow = true;
  const c = L.shadow.camera; c.left = -14.5; c.right = 14.5; c.top = 14.5; c.bottom = -14.5; c.near = 1; c.far = 130;
  L.shadow.bias = -0.0006; L.shadow.normalBias = 0.03;
  scene.add(L, L.target);
}
sunLight2.castShadow = false; sunLight2.visible = false;
scene.add(hemi);
function setShadowSize(n) {
  if (sunLight.shadow.mapSize.x === n) return;
  for (const L of [sunLight, sunLight2]) { L.shadow.mapSize.set(n, n); if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null; } }
  renderer.shadowMap.needsUpdate = true;
}

/* ---------- pişmiş gökyüzü dokuları ----------
   Galaksi (Samanyolu) ve bulut denizi dokusu açılışta GPU'da BİR KEZ çizilir; sonra her kare yalnızca birkaç doku
   okuması yapılır. Böylece eski anlık gürültü hesabından hem daha ayrıntılı hem daha ucuz bir dış dünya elde edilir. */
const BAKE_NOISE = `
float hh(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fb3(vec3 p, int o){ float s = 0.0, a = 0.5, n = 0.0; for (int i = 0; i < 6; i++){ if (i >= o) break; s += a * vn3(p); n += a; p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; } return s / n; }
`;
// Samanyolu: eşit dikdörtgen izdüşüm (u = boylam, v = enlem); bant, bitiş kamerasının baktığı ufkun altından geçer
const GAL_FRAG = BAKE_NOISE + `
uniform vec3 uN, uC; varying vec2 vUv;
void main(){
  float ph = (vUv.x - 0.5) * 6.2831853, th = (vUv.y - 0.5) * 3.14159265;
  vec3 d = vec3(cos(th) * cos(ph), sin(th), cos(th) * sin(ph));
  float b = dot(d, uN); vec3 inP = normalize(d - uN * b + 1e-5);
  float ang = acos(clamp(dot(inP, uC), -1.0, 1.0)), core = exp(-ang * ang * 2.6);
  vec3 q = d * 3.0;
  float warp = fb3(q * 1.3, 4), n = fb3(q * 2.2 + warp * 1.4, 5);
  float w = (0.065 + 0.055 * core) * (0.7 + 0.65 * n);
  float band = exp(-(b * b) / (w * w));
  float glow = pow(band, 1.4) * (0.2 + 0.8 * n * n) * (0.25 + 1.1 * core);
  float dn = fb3(q * 4.5 + 7.0 + warp, 5);
  float dust = smoothstep(0.48, 0.72, dn) * exp(-(b * b) / (w * w * 0.16)) * (0.55 + 0.45 * core);
  glow *= 1.0 - dust * 0.88;
  glow *= 0.62 + 0.75 * fb3(q * 15.0, 3);
  vec3 arm = vec3(0.5, 0.58, 1.0), cor = vec3(1.0, 0.76, 0.5), pink = vec3(1.0, 0.38, 0.7);
  vec3 col = mix(arm, cor, clamp(core * 1.3 + (n - 0.5) * 0.6, 0.0, 1.0)) * glow;
  col += pink * smoothstep(0.7, 0.84, fb3(q * 7.0 + 3.0, 4)) * band * 0.55;
  float neb = fb3(q * 1.1 + 11.0, 4);
  col += mix(vec3(0.3, 0.08, 0.4), vec3(0.04, 0.22, 0.32), fb3(q * 0.7 + 5.0, 3)) * smoothstep(0.52, 0.8, neb) * 0.12;
  gl_FragColor = vec4(min(col * 0.6, vec3(1.0)), 1.0);
}`;
// bulut denizi: kendini döşeyen (dikişsiz) gradyan gürültüsü; R = kabarık kümülüs, G = büyük ölçek, B = ince ayrıntı, A = alt katman
const CLOUD_FRAG = `
varying vec2 vUv;
float hs(vec2 i, float s){ vec3 h = fract(vec3(i.xyx + s) * vec3(0.1031, 0.1030, 0.0973)); h += dot(h, h.yzx + 33.33); return fract((h.x + h.y) * h.z); }
vec2 gp(vec2 i, float P, float s){ float a = hs(mod(i, P), s) * 6.2831853; return vec2(cos(a), sin(a)); }
float gn(vec2 p, float P, float s){ vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gp(i, P, s), f), b = dot(gp(i + vec2(1, 0), P, s), f - vec2(1, 0)), c = dot(gp(i + vec2(0, 1), P, s), f - vec2(0, 1)), d = dot(gp(i + vec2(1, 1), P, s), f - vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4; }
// düz fbm [0,1] ve kabarık (billow) fbm: yuvarlak tümsekler, aralarında ince kıvrımlar
float fbm(vec2 uv, float P, float s, int o){ float t = 0.0, a = 0.5, n = 0.0; vec2 p = uv * P; for (int i = 0; i < 6; i++){ if (i >= o) break; t += a * (gn(p, P, s + float(i) * 7.3) * 0.5 + 0.5); n += a; p *= 2.0; P *= 2.0; a *= 0.5; } return t / n; }
float bil(vec2 uv, float P, float s){ float t = 0.0; vec2 p = uv * P; float A[3] = float[](0.55, 0.3, 0.15);
  for (int i = 0; i < 3; i++){ t += A[i] * min(1.0, abs(gn(p, P, s + float(i) * 5.1)) * 1.5); p *= 2.0; P *= 2.0; } return t; }
void main(){
  vec2 uv = vUv, w = vec2(fbm(uv, 3.0, 1.0, 3), fbm(uv, 3.0, 5.0, 3)) - 0.5;
  float base = fbm(uv + w * 0.06, 4.0, 2.0, 4);
  float puff = bil(uv + w * 0.04, 6.0, 7.0);
  float r = clamp((base - 0.5) * 1.6 + (puff - 0.45) * 1.0 + 0.5, 0.0, 1.0);
  float g = fbm(uv + w * 0.08, 2.0, 21.0, 3);
  float b = fbm(uv, 16.0, 33.0, 2);
  float a = fbm(uv + w * 0.05, 5.0, 41.0, 3);
  gl_FragColor = vec4(r, g, b, a);
}`;
function bakeTex(w, h, frag, uniforms, o = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, stencilBuffer: false, generateMipmaps: !!o.mip, minFilter: o.mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: o.wrapT || THREE.ClampToEdgeWrapping });
  if (o.aniso) rt.texture.anisotropy = o.aniso;
  const m = mkPass(frag, uniforms), prev = renderer.getRenderTarget();
  try { fsMesh.material = m; renderer.setRenderTarget(rt); renderer.render(fsScene, fsCam); } finally { renderer.setRenderTarget(prev); m.dispose(); }
  rt.texture.userData.rt = rt;
  return rt.texture;
}
const SKYTEX = (() => {
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;
  const grey = new THREE.DataTexture(new Uint8Array([128, 128, 128, 128]), 1, 1); grey.wrapS = grey.wrapT = THREE.RepeatWrapping; grey.needsUpdate = true;
  let gal = black, cloud = grey;
  try {
    // galaksi düzlemi: bitiş ekranında kameranın aşağı-ileri baktığı yönden çapraz geçer; çekirdek görüş alanının ortasında
    const A = new THREE.Vector3(-0.62, -0.18, -0.76).normalize(), B = new THREE.Vector3(0.66, -0.62, -0.42).normalize();
    const N = new THREE.Vector3().crossVectors(A, B).normalize(), C = A.clone().add(B).normalize();
    const hi = Perf.level >= 2;
    gal = bakeTex(hi ? 2048 : 1024, hi ? 1024 : 512, GAL_FRAG, { uN: { value: N }, uC: { value: C } });
    cloud = bakeTex(512, 512, CLOUD_FRAG, {}, { mip: true, wrapT: THREE.RepeatWrapping });
  } catch (e) { console.warn('gök dokusu', e); }
  return { gal: { value: gal }, cloud: { value: cloud } };
})();
// gece gökyüzü: iki katmanlı yıldızlar (renkli, parlayan), pişmiş galaksi ve kayan yıldız — gökyüzü ve bulut denizinde ortak
const NIGHT_GLSL = `
uniform sampler2D tGal; uniform vec4 uShA, uShB;
float sh13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 starField(vec3 d, float t){
  vec3 c = vec3(0.0);
  vec3 sp = d * 250.0, cl = floor(sp); float r = sh13(cl);
  if (r > 0.9){ float l = length(fract(sp) - 0.5); c += mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.86, 0.66), fract(r * 37.0)) * smoothstep(0.24, 0.0, l) * (r - 0.9) * 13.0 * (0.72 + 0.28 * sin(t * (2.0 + r * 6.0) + r * 91.0)); }
  sp = d * 64.0; cl = floor(sp); r = sh13(cl + 17.3);
  if (r > 0.982){ vec3 f = fract(sp) - 0.5; float l = length(f);
    float s = smoothstep(0.1, 0.0, l) * 2.2 + smoothstep(0.42, 0.0, l) * 0.22 + (smoothstep(0.03, 0.0, abs(f.x)) + smoothstep(0.03, 0.0, abs(f.y))) * smoothstep(0.4, 0.0, l) * 0.35;
    c += mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.82, 0.6), fract(r * 53.0)) * s * (0.75 + 0.25 * sin(t * (1.3 + r * 3.0) + r * 40.0)); }
  return c;
}
vec3 galaxyAt(vec3 d){ return texture2D(tGal, vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5)).rgb * 1.2; }
vec3 shootAt(vec3 d){
  if (uShA.w <= 0.001) return vec3(0.0);
  vec3 ab = uShB.xyz - uShA.xyz; float k = clamp(dot(d - uShA.xyz, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float dd = length(d - (uShA.xyz + ab * k));
  return vec3(0.85, 0.92, 1.0) * (smoothstep(0.0028, 0.0, dd) * k * k * 2.6 + smoothstep(0.012, 0.0, dd) * k * k * k * 0.5) * uShA.w;
}
`;
const uShA = { value: new THREE.Vector4() }, uShB = { value: new THREE.Vector4() };

/* ---------- gökyüzü ---------- */
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `
uniform vec3 uZen, uHor, uBelow, uSunDir, uSunCol, uSun2Dir, uSun2Col; uniform float uTwin, uStars, uTime, uEclipse, uNight, uAurora; varying vec3 vDir;
${NIGHT_GLSL}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHor, uZen, pow(smoothstep(-0.03, 0.9, h), 0.55));
  col = mix(col, uBelow, (1.0 - smoothstep(-0.3, 0.03, h)));
  float sd = max(dot(d, uSunDir), 0.0);
  float ecl = 1.0 - uEclipse * 0.92;
  col += uSunCol * (pow(sd, 5.0) * 0.32 + pow(sd, 48.0) * 0.6) * ecl * (1.0 - uNight * 0.85);
  vec2 hd = normalize(d.xz + 1e-4), hs = normalize(uSunDir.xz + 1e-4);
  col += uSunCol * 0.22 * exp(-abs(h - 0.02) * 9.0) * pow(max(dot(hd, hs), 0.0), 2.0) * ecl * (1.0 - uNight * 0.8);
  if (uTwin > 0.5){ float s2 = max(dot(d, uSun2Dir), 0.0); col += uSun2Col * (pow(s2, 6.0) * 0.28 + pow(s2, 60.0) * 0.5) * ecl; }
  // yıldızlar
  float st = uStars;
  if (st > 0.001){
    float up = smoothstep(-0.12, 0.2, h);
    col += (galaxyAt(d) * 0.8 + starField(d, uTime) + shootAt(d)) * st * up;
  }
  // kutup ışıkları: dikey ışınlı, dalgalanan perdeler
  if (uAurora > 0.001 && h > 0.0){
    float az = atan(d.z, d.x), band = 0.0;
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float hc = 0.1 + fi * 0.075 + sin(az * (2.0 + fi) + uTime * (0.05 + fi * 0.02) + fi * 1.7) * 0.05 + sin(az * (7.0 + fi * 3.0) - uTime * 0.09) * 0.018;
      float rays = 0.55 + 0.45 * sin(az * (120.0 + fi * 37.0) + sin(az * 11.0 + uTime * 0.35 + fi) * 4.0);
      float up = smoothstep(hc - 0.012, hc + 0.004, h) * exp(-max(h - hc, 0.0) * (9.0 - fi * 2.0));
      band += up * rays * (0.55 + 0.45 * sin(az * 1.6 + fi * 2.1 + uTime * 0.03));
    }
    vec3 ac = mix(vec3(0.15, 1.0, 0.6), vec3(0.75, 0.35, 1.0), smoothstep(0.12, 0.4, h));
    col += ac * band * uAurora * 0.32;
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const skyU = {
  uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBelow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
  uSun2Dir: { value: new THREE.Vector3(0, 1, 0) }, uSun2Col: { value: new THREE.Color(SUN2_COLOR) }, uTwin: { value: 0 }, uStars: { value: 0 }, uTime: U.uTime, uEclipse: { value: 0 }, uNight: { value: 0 }, uAurora: { value: 0 },
  tGal: SKYTEX.gal, uShA, uShB,
};
const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: true });
// gökyüzü opak nesnelerden SONRA çizilir: ada ve bulut denizinin kapattığı piksellerde gök hesabı hiç yapılmaz (erken derinlik reddi)
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat); sky.renderOrder = 1; sky.frustumCulled = false;
scene.add(sky);
// ortam haritası için küçük kopya
// Ortam yansıması (IBL) yalnızca parlak yüzeylere: mat yüzeylerde görsel katkısı ~0, sahne maliyetinin üçte biri.
// Önceden tüm mat yüzeyler sahne ortamını 0.4 güçle alıyordu; aynı görünüm yarım küre ışığıyla telafi edilir.
// Mat yüzeylerin aldığı dağınık gök ışığı: gökyüzü işlevinden küresel harmoniklerle (9 katsayı) hesaplanır.
const ENV_MATS = new Set();
const IBLK = { hemi: 1, probe: 0.4 };
const envProbe = new THREE.LightProbe(); envProbe.intensity = IBLK.probe;
const SH_DIRS = (() => { const n = 384, a = []; for (let i = 0; i < n; i++) { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), ph = i * 2.399963; a.push(new THREE.Vector3(Math.cos(ph) * r, y, Math.sin(ph) * r)); } return a; })();
const _shB = new Array(9).fill(0), _shC = new THREE.Color();
const _sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// SKY_FRAG ile aynı (yıldız ve kutup ışıkları hariç)
function skyColorAt(d, o) {
  const S = skyU, h = d.y, k = Math.pow(_sm(-0.03, 0.9, h), 0.55);
  o.copy(S.uHor.value).lerp(S.uZen.value, k); o.lerp(S.uBelow.value, 1 - _sm(-0.3, 0.03, h));
  const ecl = 1 - S.uEclipse.value * 0.92, sd = Math.max(0, d.dot(S.uSunDir.value));
  const g1 = (Math.pow(sd, 5) * 0.32 + Math.pow(sd, 48) * 0.6) * ecl * (1 - S.uNight.value * 0.85);
  const hx = d.x, hz = d.z, hl = Math.hypot(hx, hz) || 1, sx = S.uSunDir.value.x, sz = S.uSunDir.value.z, sl = Math.hypot(sx, sz) || 1;
  const g2 = 0.22 * Math.exp(-Math.abs(h - 0.02) * 9) * Math.pow(Math.max(0, (hx * sx + hz * sz) / (hl * sl)), 2) * ecl * (1 - S.uNight.value * 0.8);
  o.r += S.uSunCol.value.r * (g1 + g2); o.g += S.uSunCol.value.g * (g1 + g2); o.b += S.uSunCol.value.b * (g1 + g2);
  if (S.uTwin.value > 0.5) { const s2 = Math.max(0, d.dot(S.uSun2Dir.value)), g3 = (Math.pow(s2, 6) * 0.28 + Math.pow(s2, 60) * 0.5) * ecl; o.r += S.uSun2Col.value.r * g3; o.g += S.uSun2Col.value.g * g3; o.b += S.uSun2Col.value.b * g3; }
  return o;
}
function updateEnvProbe() {
  const c = envProbe.sh.coefficients; for (const v of c) v.set(0, 0, 0);
  for (const d of SH_DIRS) { skyColorAt(d, _shC); THREE.SphericalHarmonics3.getBasisAt(d, _shB); for (let k = 0; k < 9; k++) { c[k].x += _shC.r * _shB[k]; c[k].y += _shC.g * _shB[k]; c[k].z += _shC.b * _shB[k]; } }
  const w = (4 * PI) / SH_DIRS.length; for (const v of c) v.multiplyScalar(w);
}
function envMat(m, k = 0.4) { m.envMapIntensity = k; ENV_MATS.add(m); m.addEventListener('dispose', () => ENV_MATS.delete(m)); if (envRT) { m.envMap = envRT.texture; m.needsUpdate = true; } return m; }
scene.add(envProbe);
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), skyMat));
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function refreshEnv() {
  const prev = envRT;
  sky.position.set(0, 0, 0);
  envRT = pmrem.fromScene(envScene, 0.02, 0.1, 100);
  scene.environment = null; updateEnvProbe(); envProbe.intensity = IBLK.probe;
  for (const m of ENV_MATS) { const first = !m.envMap; m.envMap = envRT.texture; if (first) m.needsUpdate = true; }
  brassMat.envMap = silverMat.envMap = envRT.texture; brassMat.needsUpdate = silverMat.needsUpdate = true;
  if (prev) prev.dispose();
}

/* ---------- bulut denizi ---------- */
const SEA_FRAG = `
uniform float uTime, uNight, uEclipse, uStars, uIslK; uniform vec3 uSunDir, uSunCol, uLit, uDeep, uFog, uCam; uniform vec4 uIsl; uniform sampler2D tCloud; varying vec3 vW;
${NIGHT_GLSL}
void main(){
  vec3 V = normalize(vW - uCam);
  float dist = length(vW.xz - uCam.xz);
  vec2 q = vW.xz / 190.0 + vec2(uTime * 0.0009, uTime * 0.0004);
  vec2 sd = normalize(uSunDir.xz + 1e-4);
  // doku okumaları: kümülüs (R), güneş yönünde komşu (R), büyük ölçek (G), ince ayrıntı (B)
  float A = texture2D(tCloud, q).r, As = texture2D(tCloud, q + sd * 0.006).r;
#if LQ
  float h = A;
#else
  float h = A * 0.64 + texture2D(tCloud, q * 0.37 + vec2(0.31, 0.77)).g * 0.36 + (texture2D(tCloud, q * 3.3 + vec2(0.13, 0.41)).b - 0.5) * 0.18;
#endif
  float cov = 0.39 + uStars * 0.15;                       // gece bulutlar incelir, aralarından gök görünür
  float dens = smoothstep(cov - 0.03, cov + 0.26, h);
  float slope = (A - As) * 17.0;                           // güneşe bakan yamaçlar aydınlık, arkası gölgeli
  float lit = clamp(0.74 + slope * 0.75, 0.5, 1.3), ao = mix(0.76, 1.0, smoothstep(cov, cov + 0.45, h));
#if LQ
  float low = 0.5;
#else
  // aralıklardan görünen alt bulut katmanı (derinlik / paralaks)
  float low = texture2D(tCloud, (vW.xz + V.xz / max(-V.y, 0.15) * 16.0) / 260.0 - vec2(uTime * 0.0007, 0.0)).a;
#endif
  vec3 deep = uDeep * (0.7 + 0.55 * smoothstep(0.32, 0.72, low));
  float edge = smoothstep(cov, cov + 0.06, h) * (1.0 - smoothstep(cov + 0.06, cov + 0.2, h));
  float day = (1.0 - uEclipse) * (1.0 - uNight);
  vec3 top = uLit * lit * ao + uSunCol * edge * max(slope, 0.0) * 0.4 * day;
  vec3 col = mix(deep, top, dens);
  col += uSunCol * pow(dens, 3.0) * clamp(slope + 0.3, 0.0, 1.0) * 0.16 * day;
  // güneşe doğru bakınca ince kenarlar parlar (ileri saçılma)
  float fw = pow(max(dot(normalize(V.xz + 1e-4), sd), 0.0), 5.0) * smoothstep(90.0, 520.0, dist);
  col += uSunCol * fw * (0.12 + edge * 0.7) * 0.3 * day;
  // adanın bulutlara düşen gölgesi
  vec2 sp = vW.xz + uSunDir.xz * ((0.0 - vW.y) / max(uSunDir.y, 0.18));
  float isl = length((sp - uIsl.xy) / uIsl.zw);
  col *= 1.0 - smoothstep(1.3, 0.7, isl) * 0.38 * day * uIslK;
  col = mix(col, uFog, smoothstep(60.0, 620.0, dist));
  col = mix(col, col * vec3(0.16, 0.2, 0.42), uNight * 0.9);
  col += vec3(0.05, 0.07, 0.15) * edge * uNight;           // ay ışığında bulut kenarları
  if (uStars > 0.001){
    // bulut aralarından, adanın altındaki sonsuz gece: Samanyolu, yıldızlar, kayan yıldız
    vec3 sky = vec3(0.004, 0.006, 0.018) + galaxyAt(V) + starField(V, uTime) + shootAt(V);
    col = mix(col, sky, (1.0 - dens) * uStars);
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const seaU = { uTime: U.uTime, uSunDir: skyU.uSunDir, uSunCol: skyU.uSunCol, uLit: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uFog: skyU.uBelow, uCam: U.uCamPos, uNight: skyU.uNight, uEclipse: skyU.uEclipse,
  uStars: skyU.uStars, uIsl: { value: new THREE.Vector4(0, 0, 7, 11) }, uIslK: { value: 1 }, tCloud: SKYTEX.cloud, tGal: SKYTEX.gal, uShA, uShB };
let seaMat = null;
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), null);
sea.rotation.x = -PI / 2; sea.position.y = -16; sea.renderOrder = 0; // adayla birlikte önden arkaya sıralanır: adanın arkası hesaplanmaz
scene.add(sea);
function buildSeaMat(oct) {
  const lq = oct <= 2 ? 1 : 0; // Düşük: tek doku okuması, alt katman yok
  if (seaMat && seaMat.defines.LQ === lq) return;
  if (seaMat) seaMat.dispose();
  seaMat = new THREE.ShaderMaterial({ vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`, fragmentShader: SEA_FRAG, uniforms: seaU, defines: { LQ: lq }, depthWrite: true });
  sea.material = seaMat;
}

/* ---------- kanvas dokuları ---------- */
function radialTex(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rayTex(size = 256, n = 14) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.translate(size / 2, size / 2); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    x.rotate((TAU / n) * (0.7 + Math.random() * 0.6));
    const len = size * (0.32 + Math.random() * 0.18), w = 2 + Math.random() * 5;
    const g = x.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,240,210,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -w); x.lineTo(len, 0); x.lineTo(0, w); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {
  glow: radialTex([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,240,215,0.75)'], [0.45, 'rgba(255,190,120,0.22)'], [1, 'rgba(255,150,80,0)']]),
  soft: radialTex([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']], 64),
  ink: radialTex([[0, 'rgba(0,0,0,0.75)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']], 64),
  rays: rayTex(),
};

/* ---------- güneş küresi + pirinç yay ---------- */
const ARC_C = new THREE.Vector3(0, -0.4, -4.6);
const _sd = { x: 0, y: 0, z: 0 };
function orbPosInto(u, tilt, thMin, out) {
  sunDirInto(u, tilt, thMin, _sd);
  const th = lerp(PI - thMin, thMin, u), d = 13.8 * (0.52 + 0.48 * Math.sin(th));
  return out.set(ARC_C.x + _sd.x * d, ARC_C.y + _sd.y * d, ARC_C.z + _sd.z * d);
}
const ORB_FRAG = `uniform float uTime, uHeat, uEclipse, uMoon; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vP;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float mu = max(dot(normalize(vN), normalize(vV)), 0.0);
  // granülasyon (kaynayan yüzey) + kenar kararması: merkez beyaz-sıcak, kenar turuncu
  float gr = n3(vP * 7.0 + uTime * 0.5) * 0.55 + n3(vP * 15.0 - uTime * 0.8) * 0.3 + n3(vP * 31.0 + uTime * 1.3) * 0.15;
  float limb = 0.42 + 0.58 * pow(mu, 0.55);
  vec3 hot = vec3(1.0, 0.97, 0.88);
  vec3 c = mix(uCol * vec3(1.15, 0.78, 0.5), hot, pow(mu, 1.6)) * (4.2 + gr * 2.6 + uHeat * 4.0) * limb;
  c += hot * pow(mu, 6.0) * 3.0;
  // Gece Perdesi: ay yüzeyi (gümüş, koyu denizler ve krater lekeleri, yumuşak kenar)
  if (uMoon > 0.5) {
    float mar = n3(vP * 2.4 + 7.0) * 0.6 + n3(vP * 5.2 + 3.0) * 0.4, cr = smoothstep(0.58, 0.66, n3(vP * 11.0 + 1.0)) + smoothstep(0.6, 0.7, n3(vP * 19.0 + 5.0)) * 0.6;
    vec3 m = uCol * (1.0 - smoothstep(0.42, 0.66, mar) * 0.38 - cr * 0.16);
    c = m * (1.5 + 1.3 * pow(mu, 0.8)) * (0.5 + 0.5 * pow(mu, 0.35));
  }
  c *= 1.0 - uEclipse * 0.97;
  gl_FragColor = vec4(c, 1.0);
}`;
// korona: kameraya dönük, yavaşça dönen ışık şeritleri ve ince renk küresi halkası (tek düzlem)
const CROWN_FRAG = `uniform float uTime, uK; uniform vec3 uCol; varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0; float d = length(p), a = atan(p.y, p.x);
  float st = 0.5 + 0.25 * sin(a * 7.0 + 1.8 * sin(a * 3.0 + uTime * 0.21) + uTime * 0.09) + 0.25 * sin(a * 13.0 - uTime * 0.16 + 1.2 * sin(a * 5.0 - uTime * 0.1));
  float streak = pow(st, 4.0) * exp(-d * 2.8) * smoothstep(0.12, 0.24, d) * 1.8;
  float glow = exp(-d * 5.5) * 0.45 + exp(-d * 14.0) * 0.5;
  float ring = exp(-pow((d - 0.15) * 30.0, 2.0)) * 0.9;
  float i = (glow + streak + ring) * uK * smoothstep(1.0, 0.7, d);
  gl_FragColor = vec4(uCol * i, i);
}`;
const ORB_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; vP = position; gl_Position = projectionMatrix * viewMatrix * w; }`;
function makeOrb(color, scale = 1) {
  const g = new THREE.Group();
  const u = { uTime: U.uTime, uHeat: { value: 0 }, uEclipse: { value: 0 }, uMoon: { value: 0 }, uCol: { value: new THREE.Color(color) } };
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 40, 24), new THREE.ShaderMaterial({ vertexShader: ORB_VERT, fragmentShader: ORB_FRAG, uniforms: u }));
  const haloM = new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(color).multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const halo = new THREE.Sprite(haloM); halo.scale.setScalar(3.0 * scale);
  const crownU = { uTime: U.uTime, uK: { value: 1 }, uCol: { value: new THREE.Color(color).multiplyScalar(1.6) } };
  const crown = new THREE.Mesh(new THREE.PlaneGeometry(7 * scale, 7 * scale), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: CROWN_FRAG, uniforms: crownU,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  crown.renderOrder = 5;
  const raysM = new THREE.SpriteMaterial({ map: TEX.rays, color: new THREE.Color(color).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
  const rays = new THREE.Sprite(raysM); rays.scale.setScalar(7.5 * scale);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.56 * scale, 32, 20), new THREE.MeshBasicMaterial({ color: 0x07050c }));
  moon.visible = false;
  const coronaM = new THREE.SpriteMaterial({ map: TEX.rays, color: new THREE.Color(1.6, 1.5, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const corona = new THREE.Sprite(coronaM); corona.scale.setScalar(6 * scale);
  halo.renderOrder = rays.renderOrder = corona.renderOrder = 5;
  g.add(rays, halo, crown, core, moon, corona);
  return { g, core, halo, rays, moon, corona, crown, crownU, u, scale };
}
const orb = makeOrb('#ffd48a');
const orb2 = makeOrb(SUN2_COLOR, 0.8); orb2.g.visible = false;
scene.add(orb.g, orb2.g);
const brassMat = new THREE.MeshStandardMaterial({ color: 0xd09a4c, metalness: 0.95, roughness: 0.26, envMapIntensity: 1.7 });
const silverMat = new THREE.MeshStandardMaterial({ color: 0xb4cce4, metalness: 0.95, roughness: 0.24, envMapIntensity: 1.7 });
// Güneş yayı: iki pirinç raylı gök usturlabı; raylar arasında gün doğumundan (gül) öğleye (altın) ve gün batımına (mor)
// renk değiştiren ışıklı şerit, güneşin bulunduğu yerde parlar; tutunca canlanır. Çentikler mücevher.
const ARC_GLOW_FRAG = `uniform float uSun, uTime, uNight, uOn; uniform vec3 uA, uB, uC; varying vec2 vUv;
void main(){
  float u = vUv.x, d = u - uSun;
  vec3 c = u < 0.5 ? mix(uA, uB, u * 2.0) : mix(uB, uC, u * 2.0 - 1.0);
  float near = exp(-d * d / 0.0022), halo = exp(-d * d / 0.03);
  float beads = pow(0.5 + 0.5 * sin(u * 150.0 - uTime * 2.4), 10.0);
  float a = (0.3 + 0.25 * uNight + beads * (0.05 + 0.2 * uOn) + halo * (0.25 + 0.5 * uOn) + near * (1.3 + 1.6 * uOn)) * smoothstep(0.0, 0.025, u) * smoothstep(1.0, 0.975, u);
  gl_FragColor = vec4(c * a, a);
}`;
class Arc {
  constructor(mat) {
    this.g = new THREE.Group(); this.mat = mat; this.ticks = null; this.mesh = null; this.flash = new Float32Array(13); this.on = 0; scene.add(this.g);
    const silver = mat === silverMat;
    this.glowU = { uSun: { value: 0 }, uTime: U.uTime, uNight: { value: 0 }, uOn: { value: 0 },
      uA: { value: silver ? new THREE.Color(0.5, 0.8, 1.6) : new THREE.Color(2.2, 0.75, 0.6) }, uB: { value: silver ? new THREE.Color(1.2, 1.5, 2.2) : new THREE.Color(2.4, 1.85, 1.0) }, uC: { value: silver ? new THREE.Color(0.9, 0.6, 2.0) : new THREE.Color(1.4, 0.75, 2.2) } };
    this.glowMat = new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: ARC_GLOW_FRAG, uniforms: this.glowU,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
    this.gemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.capMats = [new THREE.MeshBasicMaterial({ color: new THREE.Color(silver ? 0.6 : 2.0, silver ? 0.9 : 0.7, silver ? 1.8 : 0.6) }), new THREE.MeshBasicMaterial({ color: new THREE.Color(silver ? 1.0 : 1.3, silver ? 0.7 : 0.7, 2.0) })];
  }
  build(tilt, thMin, mirror = false) {
    this.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.g.clear();
    const pts = [], inner = [], mid = [], v = new THREE.Vector3();
    for (let i = 0; i <= 64; i++) { orbPosInto(i / 64, tilt, thMin, v); pts.push(v.clone()); inner.push(v.clone().sub(ARC_C).multiplyScalar(0.955).add(ARC_C)); mid.push(v.clone().sub(ARC_C).multiplyScalar(0.977).add(ARC_C)); }
    const curve = new THREE.CatmullRomCurve3(pts), cIn = new THREE.CatmullRomCurve3(inner), cMid = new THREE.CatmullRomCurve3(mid);
    this.mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.075, 8, false), this.mat);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(cIn, 110, 0.04, 6, false), this.mat);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(cMid, 120, 0.05, 6, false), this.glowMat); glow.renderOrder = 6;
    this.g.add(this.mesh, rail, glow);
    // uç amblemleri: şafak ve akşam taşları (halka + parlayan çekirdek)
    [0, 1].forEach((u, k) => {
      orbPosInto(u, tilt, thMin, v);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), this.mat); ring.position.copy(v); ring.lookAt(v.clone().add(new THREE.Vector3(0, 0, 1)));
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), this.capMats[k]); gem.position.copy(v); gem.scale.set(0.8, 1.25, 0.8);
      this.g.add(ring, gem);
    });
    // mücevher çentikler: 13 adet, her üçüncüsü büyük; iki rayı birleştiren ince payandalar
    const tg = new THREE.OctahedronGeometry(0.15);
    this.ticks = new THREE.InstancedMesh(tg, this.gemMat, 13);
    const struts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 5), this.mat, 13);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), t2 = new THREE.Vector3();
    for (let i = 0; i < 13; i++) {
      const u = i / 12; orbPosInto(u, tilt, thMin, v);
      const nrm = new THREE.Vector3().copy(v).sub(ARC_C).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
      const big = i % 3 === 0; sc.set(big ? 1.25 : 0.85, big ? 1.9 : 1.25, big ? 1.25 : 0.85);
      t2.copy(v).addScaledVector(nrm, 0.13);
      m.compose(t2, q, sc); this.ticks.setMatrixAt(i, m);
      this.ticks.setColorAt(i, new THREE.Color(1.6, 1.1, 0.5));
      const inV = v.clone().sub(ARC_C).multiplyScalar(0.955).add(ARC_C), len = v.distanceTo(inV);
      m.compose(v.clone().add(inV).multiplyScalar(0.5), q, sc.set(1, len, 1)); struts.setMatrixAt(i, m);
    }
    this.g.add(this.ticks);
    this.g.add(struts);
    this.mirror = mirror;
  }
  hit(i) { this.flash[i] = 1; }
  update(dt) {
    if (!this.ticks) return;
    const c = new THREE.Color();
    for (let i = 0; i < 13; i++) {
      if (this.flash[i] <= 0) continue;
      this.flash[i] = Math.max(0, this.flash[i] - dt * 2.5);
      const f = this.flash[i];
      c.setRGB(1.6 + f * 5, 1.1 + f * 3.6, 0.5 + f * 1.6); this.ticks.setColorAt(i, c);
    }
    this.ticks.instanceColor.needsUpdate = true;
    if (typeof G !== 'undefined' && G.lv) {
      this.on = damp(this.on, G.drag ? 1 : 0, 6, dt);
      this.glowU.uSun.value = this.mirror ? 1 - G.u : G.u; this.glowU.uNight.value = G.night; this.glowU.uOn.value = this.on;
    }
  }
}
const arc1 = new Arc(brassMat), arc2 = new Arc(silverMat);
arc2.g.visible = false;

/* ---------- uzak adalar & kuşlar ---------- */
const farGroup = new THREE.Group(); scene.add(farGroup);
function buildFarIslands(chap) {
  farGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  farGroup.clear();
  const pal = chap.pal, rng = new RNG(1234 + chap.roman.length * 77);
  const mat = worldMat({ vertexColors: true, roughness: 0.95, flatShading: true });
  // bulut denizinin üstünde, ufka doğru dağılmış uzak adalar (alçakta: yukarıdan bakınca da dengeli görünür)
  const spots = [[-46, -3, -66, 2.0], [44, -5, -80, 2.6], [-84, -4, -32, 2.8], [80, -2, -42, 2.2], [-16, -7, -150, 3.4], [26, -6, -54, 1.3], [-60, -6, 6, 1.7], [64, -5, 4, 1.8]];
  spots.forEach(([x, y, z, s], i) => {
    const P = [];
    isletParts(P, rng, pal, chap.key, 2.2, 0, 0, 0, true, 0.1);
    const m = new THREE.Mesh(mergeParts(P, false), mat);
    m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = rng.range(0, TAU);
    m.userData = { y, ph: rng.range(0, TAU) };
    // her iki adadan birinde buluta dökülen şelale
    if (i % 2 === 0 && chap.key !== 'buz') {
      const L = 9 + rng.range(0, 5), w = 0.55, f = new THREE.Mesh(new THREE.PlaneGeometry(w, L), FALL_MAT);
      const a = Math.atan2(-z, -x) + rng.range(-0.5, 0.5); // kameraya dönük yan
      f.position.set(Math.cos(a) * 2.1, -L / 2 + 0.1, Math.sin(a) * 2.1); f.rotation.y = -a + PI / 2; f.renderOrder = 4;
      const fg = new THREE.Group(); fg.add(f); fg.rotation.y = -m.rotation.y; m.add(fg);
    }
    farGroup.add(m);
  });
}
function updateFar(t) { for (const m of farGroup.children) m.position.y = m.userData.y + Math.sin(t * 0.25 + m.userData.ph) * 0.6; }
const birds = { mesh: null, n: 9, t: 0, active: false, dir: 1, y: 0, z: 0, x0: 0 };
function buildBirds() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.12, -0.55, 0.0, -0.1, 0, 0, -0.1, 0, 0, 0.12, 0, 0, -0.1, 0.55, 0.0, -0.1]), 3));
  g.setAttribute('wing', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 0, 1]), 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uCol: { value: new THREE.Color(0x2a2235) } },
    vertexShader: `attribute float wing; uniform float uTime; varying float vW; void main(){ vec3 p = position; float ph = float(gl_InstanceID) * 1.7; p.y += wing * sin(uTime * 9.0 + ph) * 0.35; vW = wing; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying float vW; void main(){ gl_FragColor = vec4(uCol, 1.0); }`,
    side: THREE.DoubleSide,
  });
  birds.mesh = new THREE.InstancedMesh(g, m, birds.n); birds.mesh.frustumCulled = false; birds.mesh.visible = false;
  scene.add(birds.mesh);
}
buildBirds();
function updateBirds(dt) {
  birds.t += dt;
  if (!birds.active) { if (Math.random() < dt * 0.04) { birds.active = true; birds.t = 0; birds.dir = Math.random() < 0.5 ? -1 : 1; birds.y = 5 + Math.random() * 8; birds.z = -18 - Math.random() * 20; } birds.mesh.visible = false; return; }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, birds.dir > 0 ? -PI / 2 : PI / 2, 0));
  const x = birds.dir * (-60 + birds.t * 5.5);
  if (Math.abs(x) > 62) { birds.active = false; return; }
  birds.mesh.visible = true;
  for (let i = 0; i < birds.n; i++) {
    const row = Math.ceil(i / 2), sd = i % 2 ? 1 : -1;
    m.compose(new THREE.Vector3(x - birds.dir * row * 0.9, birds.y + Math.sin(birds.t * 0.8 + i) * 0.3 - row * 0.1, birds.z + sd * row * 0.8), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.9));
    birds.mesh.setMatrixAt(i, m);
  }
  birds.mesh.instanceMatrix.needsUpdate = true;
}
