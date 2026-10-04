
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
};
const WORLD_VERT_HEAD = `varying vec3 vNW;\nuniform float uTime; uniform vec3 uZifir; uniform float uWind;\n`;
const WORLD_FRAG_HEAD = `varying vec3 vNW;
uniform vec2 uNightC; uniform float uNightR, uNightAmt, uNightRim, uFogNear, uFogFar; uniform vec3 uCamPos, uFogCol, uBelowCol, uGlowCol;
float nightInside(){ float nd = length(vNW.xz - uNightC); return (1.0 - smoothstep(uNightR - 2.5, uNightR, nd)) * uNightAmt; }
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
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 nw4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        nw4 = instanceMatrix * nw4;
      #endif
      vNW = (modelMatrix * nw4).xyz;`);
  }
  sh.fragmentShader = WORLD_FRAG_HEAD + sh.fragmentShader;
  if (flags.glow) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uGlowCol * nightInside();');
  sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `{
      float ins = nightInside();
      vec3 nc = gl_FragColor.rgb * vec3(0.15, 0.19, 0.4) + vec3(0.002, 0.003, 0.011);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, nc, ins * 0.92);
      float nd = length(vNW.xz - uNightC);
      float rd = (nd - uNightR) * 1.1;
      gl_FragColor.rgb += vec3(0.65, 0.42, 1.0) * exp(-rd * rd) * uNightRim * 1.6;
      ${flags.noFog ? '' : 'float fd = length(vNW - uCamPos); gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogCol, smoothstep(uFogNear, uFogFar, fd));'}
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uBelowCol, (1.0 - smoothstep(-11.5, -3.0, vNW.y)) * 0.94);
    }
    #include <dithering_fragment>`);
}
function worldMat(opts, flags = {}) {
  const m = new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = (sh) => injectWorld(sh, flags);
  const key = 'W' + (flags.grass ? 'g' : '') + (flags.glow ? 'l' : '') + (flags.noFog ? 'n' : '');
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

/* ---------- gökyüzü ---------- */
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `
uniform vec3 uZen, uHor, uBelow, uSunDir, uSunCol, uSun2Dir, uSun2Col; uniform float uTwin, uStars, uTime, uEclipse, uNight, uAurora; varying vec3 vDir;
float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
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
    vec3 sp = d * 180.0; vec3 cell = floor(sp); float r = h13(cell);
    if (r > 0.972){ vec3 f = fract(sp) - 0.5; float s = (1.0 - smoothstep(0.0, 0.16, length(f))) * (0.55 + 0.45 * sin(uTime * (1.5 + r * 3.0) + r * 60.0)); col += vec3(0.9, 0.92, 1.0) * s * st * 1.6 * smoothstep(-0.1, 0.25, h); }
    float neb = sin(d.x * 3.0 + d.z * 2.0) * sin(d.y * 4.0 - d.x * 1.5); col += vec3(0.22, 0.12, 0.35) * max(neb, 0.0) * 0.18 * st;
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
};
const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: true });
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false;
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
uniform float uTime; uniform vec3 uSunDir, uSunCol, uLit, uDeep, uFog, uCam; uniform float uNight, uEclipse; varying vec3 vW;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCT; i++){ s += a * vn(p); p = p * 2.07 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  vec2 p = vW.xz * 0.022 + vec2(uTime * 0.008, uTime * 0.003);
  float n = fbm(p), n2 = fbm(p * 1.9 + 4.0 - uTime * 0.004);
  float dens = smoothstep(0.40, 0.66, n * 0.62 + n2 * 0.38);
  float nl = fbm(p + uSunDir.xz * 0.03);
  float shade = clamp((n - nl) * 7.0 + 0.55, 0.0, 1.25);
  vec3 col = mix(uDeep, uLit, dens);
  col *= mix(0.62, 1.0 + shade * 0.4, dens);
  col += uSunCol * pow(dens, 3.0) * shade * 0.25 * (1.0 - uEclipse);
  float dist = length(vW.xz - uCam.xz);
  col = mix(col, uFog, smoothstep(60.0, 620.0, dist));
  col = mix(col, col * vec3(0.16, 0.2, 0.42), uNight * 0.9);
  gl_FragColor = vec4(col, 1.0);
}`;
const seaU = { uTime: U.uTime, uSunDir: skyU.uSunDir, uSunCol: skyU.uSunCol, uLit: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uFog: skyU.uBelow, uCam: U.uCamPos, uNight: skyU.uNight, uEclipse: skyU.uEclipse };
let seaMat = null;
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), null);
sea.rotation.x = -PI / 2; sea.position.y = -16; sea.renderOrder = -5;
scene.add(sea);
function buildSeaMat(oct) {
  if (seaMat && seaMat.defines.OCT === oct) return;
  if (seaMat) seaMat.dispose();
  seaMat = new THREE.ShaderMaterial({ vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`, fragmentShader: SEA_FRAG, uniforms: seaU, defines: { OCT: oct }, depthWrite: true });
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
const ORB_FRAG = `uniform float uTime, uHeat, uEclipse; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vP;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float fr = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
  float gr = n3(vP * 5.0 + uTime * 0.6) * 0.6 + n3(vP * 11.0 - uTime * 0.9) * 0.4;
  vec3 c = uCol * (4.5 + gr * 3.0 + uHeat * 4.0) + vec3(1.0, 0.95, 0.8) * pow(1.0 - fr, 3.0) * 6.0;
  c *= 1.0 - uEclipse * 0.97;
  gl_FragColor = vec4(c, 1.0);
}`;
const ORB_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; vP = position; gl_Position = projectionMatrix * viewMatrix * w; }`;
function makeOrb(color, scale = 1) {
  const g = new THREE.Group();
  const u = { uTime: U.uTime, uHeat: { value: 0 }, uEclipse: { value: 0 }, uCol: { value: new THREE.Color(color) } };
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 40, 24), new THREE.ShaderMaterial({ vertexShader: ORB_VERT, fragmentShader: ORB_FRAG, uniforms: u }));
  const haloM = new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(color).multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const halo = new THREE.Sprite(haloM); halo.scale.setScalar(5.2 * scale);
  const raysM = new THREE.SpriteMaterial({ map: TEX.rays, color: new THREE.Color(color).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
  const rays = new THREE.Sprite(raysM); rays.scale.setScalar(7.5 * scale);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.56 * scale, 32, 20), new THREE.MeshBasicMaterial({ color: 0x07050c }));
  moon.visible = false;
  const coronaM = new THREE.SpriteMaterial({ map: TEX.rays, color: new THREE.Color(1.6, 1.5, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const corona = new THREE.Sprite(coronaM); corona.scale.setScalar(6 * scale);
  halo.renderOrder = rays.renderOrder = corona.renderOrder = 5;
  g.add(rays, halo, core, moon, corona);
  return { g, core, halo, rays, moon, corona, u, scale };
}
const orb = makeOrb('#ffd48a');
const orb2 = makeOrb(SUN2_COLOR, 0.8); orb2.g.visible = false;
scene.add(orb.g, orb2.g);
const brassMat = new THREE.MeshStandardMaterial({ color: 0xd09a4c, metalness: 0.95, roughness: 0.26, envMapIntensity: 1.7 });
const silverMat = new THREE.MeshStandardMaterial({ color: 0xb4cce4, metalness: 0.95, roughness: 0.24, envMapIntensity: 1.7 });
class Arc {
  constructor(mat) { this.g = new THREE.Group(); this.mat = mat; this.ticks = null; this.mesh = null; this.flash = new Float32Array(13); scene.add(this.g); }
  build(tilt, thMin, mirror = false) {
    this.g.clear();
    if (this.mesh) { this.mesh.geometry.dispose(); }
    const pts = []; const v = new THREE.Vector3();
    for (let i = 0; i <= 64; i++) { orbPosInto(i / 64, tilt, thMin, v); pts.push(v.clone()); }
    const curve = new THREE.CatmullRomCurve3(pts);
    this.mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.095, 10, false), this.mat);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.034, 6, false), this.mat);
    rail.position.set(0, -0.0, 0.32); rail.scale.setScalar(1);
    this.g.add(this.mesh, rail);
    // uç topuzları
    for (const u of [0, 1]) { orbPosInto(u, tilt, thMin, v); const k = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), this.mat); k.position.copy(v); this.g.add(k); }
    // saat çentikleri
    const tg = new THREE.BoxGeometry(0.06, 0.34, 0.06);
    this.ticks = new THREE.InstancedMesh(tg, new THREE.MeshBasicMaterial({ color: 0xffffff }), 13);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), t2 = new THREE.Vector3();
    for (let i = 0; i < 13; i++) {
      const u = i / 12; orbPosInto(u, tilt, thMin, v); orbPosInto(Math.min(1, u + 0.01), tilt, thMin, t2); if (u >= 1) { orbPosInto(0.99, tilt, thMin, t2); t2.sub(v).negate(); } else t2.sub(v);
      t2.normalize(); const nrm = new THREE.Vector3().copy(v).sub(ARC_C).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
      s.set(1, i % 3 === 0 ? 1.6 : 1, 1);
      m.compose(v, q, s); this.ticks.setMatrixAt(i, m);
      this.ticks.setColorAt(i, new THREE.Color(0.9, 0.62, 0.28));
    }
    this.g.add(this.ticks);
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
      c.setRGB(0.9 + f * 5, 0.62 + f * 3.6, 0.28 + f * 1.6); this.ticks.setColorAt(i, c);
    }
    this.ticks.instanceColor.needsUpdate = true;
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
  const spots = [[-46, 5, -66, 2.4], [42, 1, -78, 3.0], [-84, 2, -30, 3.4], [78, 6, -40, 2.6], [-20, 11, -118, 4.2], [26, -1, -52, 1.6], [-58, 0, 4, 2.0], [62, 1, 2, 2.2]];
  for (const [x, y, z, s] of spots) {
    const P = [];
    const n = rng.int(6, 9), r = rng.range(1.6, 2.4);
    P.push(part(new THREE.CylinderGeometry(r, r * 0.92, 0.35, n), pal.cliffTop, { pos: [0, 0, 0], jit: 0.08 }));
    P.push(part(new THREE.ConeGeometry(r * 0.92, r * rng.range(1.6, 2.4), n, 3), pal.bands[rng.int(0, pal.bands.length - 1)], { pos: [0, -r * 1.0 - 0.17, 0], rot: [PI, 0, 0], jit: 0.16, top: pal.rockDark, y0: 0, y1: -r * 2 }));
    const t = rng.int(1, 3);
    for (let k = 0; k < t; k++) {
      const a = rng.range(0, TAU), d = rng.range(0, r * 0.55), h = rng.range(0.9, 1.6);
      if (chap.key === 'peri' || chap.key === 'tuz') P.push(part(new THREE.ConeGeometry(0.35, h, 7), chap.key === 'tuz' ? '#f4eef4' : '#e2c19c', { pos: [Math.cos(a) * d, 0.17 + h / 2, Math.sin(a) * d] }));
      else P.push(part(new THREE.ConeGeometry(0.28, h, 6), chap.key === 'ikiz' ? '#7a5ad0' : '#3d6a34', { pos: [Math.cos(a) * d, 0.17 + h / 2, Math.sin(a) * d] }));
    }
    const m = new THREE.Mesh(mergeParts(P, false), mat);
    m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = rng.range(0, TAU);
    m.userData = { y, ph: rng.range(0, TAU) };
    farGroup.add(m);
  }
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
