
/* =====================================================================
   DERİNLİK — gözlüksüz 3B hissi
   Kameranın hemen önünde, ekran kenarlarında süzülen yumuşak ışık
   halkaları (bokeh). Kameraya neredeyse bağlıdırlar; telefon eğilince ya
   da başlıkta fare oynayınca kamera adanın çevresinde döner, bu yakın
   katman ise farklı hızda kayar: göz bunu gerçek derinlik olarak okur.
   Tek çizim çağrısı (22 nokta), ekranın ortası (oyun alanı) hep temiz.
   ===================================================================== */
const BOKEH_N = 22;
const BOKEH_VERT = /* glsl */`attribute vec4 aR; uniform float uTime, uScale, uK; varying float vA; varying float vHue;
void main(){
  vec3 p = position;
  p.x += sin(uTime * (0.07 + aR.w * 0.06) + aR.y * 6.28) * 0.35;
  p.y += cos(uTime * (0.05 + aR.w * 0.05) + aR.y * 4.1) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float edge = smoothstep(0.42, 0.95, length(ndc * vec2(1.0, 0.8)));
  vA = uK * edge * (0.55 + 0.45 * sin(uTime * (0.3 + aR.w * 0.4) + aR.y * 9.0)) * aR.z;
  vHue = aR.y;
  gl_PointSize = min(220.0, aR.x * uScale / max(0.5, -mv.z));
}`;
const BOKEH_FRAG = /* glsl */`uniform vec3 uCol, uCol2; varying float vA; varying float vHue;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0; float d = length(q);
  if (d > 1.0 || vA < 0.002) discard;
  // bokeh: yumuşak disk + parlak kenar halkası + kenarda hafif renk ayrışması
  float disk = smoothstep(1.0, 0.86, d), ring = smoothstep(0.62, 0.93, d) * disk;
  vec3 c = mix(uCol, uCol2, vHue) * (0.45 * disk + 0.55 * ring);
  c += vec3(0.05, 0.0, 0.09) * smoothstep(0.8, 1.0, d);
  gl_FragColor = vec4(c * vA, 1.0);
}`;
const Bokeh = {
  k: 0, init() {
    const P = new Float32Array(BOKEH_N * 3), R = new Float32Array(BOKEH_N * 4), rng = new RNG(4711);
    for (let i = 0; i < BOKEH_N; i++) {
      const z = rng.range(3.0, 8.5), a = rng.range(0, TAU), r = rng.range(0.55, 1.15); // kenarlara yakın: oyun alanı temiz
      P[i * 3] = Math.cos(a) * r * z * 0.55; P[i * 3 + 1] = Math.sin(a) * r * z * 0.75; P[i * 3 + 2] = -z;
      R[i * 4] = rng.range(0.28, 0.75); R[i * 4 + 1] = rng.next(); R[i * 4 + 2] = rng.range(0.35, 1); R[i * 4 + 3] = rng.next();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aR', new THREE.BufferAttribute(R, 4));
    this.u = { uTime: U.uTime, uScale: { value: 400 }, uK: { value: 0 }, uCol: { value: new THREE.Color(1, 0.8, 0.5) }, uCol2: { value: new THREE.Color(0.7, 0.6, 1.2) } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: BOKEH_VERT, fragmentShader: BOKEH_FRAG, uniforms: this.u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 30; scene.add(this.pts);
  },
  update(dtR) {
    const st = G.state;
    const k = st === 'title' ? 1 : st === 'play' || st === 'ready' || st === 'intro' || st === 'rewind' ? 0.55 : st === 'complete' ? 0.9 : st === 'fail' ? 0.4 : 0;
    this.k = damp(this.k, k * (U.uDetail.value > 0.6 ? 1 : 0.6), 2.5, dtR);
    this.pts.visible = this.k > 0.01 && G.state !== 'map' && G.state !== 'theater' && G.state !== 'film';
    if (!this.pts.visible) return;
    // kameraya %86 bağlı: eğimle dönen kamera yakın katmanı az kaydırır, uzak ada çok → derinlik
    const a = Cam.anchor; this.pts.position.copy(camera.position).lerp(a ? a.position : camera.position, 0.14); this.pts.quaternion.copy(camera.quaternion);
    this.u.uK.value = this.k * (0.2 + G.night * 0.1);
    this.u.uScale.value = (renderer.domElement.height * 0.5) / Math.tan(deg(camera.fov) / 2);
    const s = sunLight.color; this.u.uCol.value.setRGB(lerp(s.r * 1.1, 0.55, G.night), lerp(s.g * 0.92, 0.6, G.night), lerp(s.b * 0.75, 1.2, G.night));
  },
};
Bokeh.init();
