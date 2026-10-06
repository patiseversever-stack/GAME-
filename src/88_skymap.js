
/* =====================================================================
   GÖKYÜZÜ ATLASI — canlı 3B dünya haritası
   Sekiz bölümün gerçek adaları alacakaranlık göğünde ufka doğru dizilir.
   Kamera adalar arasında süzülür; takımyıldızları göğe çizilir, yıldız
   yolu adaları bağlar, Zifir sıradaki adada bekler.
   ===================================================================== */
const mapScene = new THREE.Scene();
const mapCam = new THREE.PerspectiveCamera(38, 1, 0.5, 3000);
const mapSky = new THREE.Mesh(sky.geometry, skyMat); mapSky.renderOrder = -10; mapSky.frustumCulled = false; mapScene.add(mapSky);
const mapSea = new THREE.Mesh(sea.geometry, sea.material); mapSea.rotation.x = -PI / 2; mapSea.position.y = -20; mapSea.renderOrder = -5; mapScene.add(mapSea);
const mapHemi = new THREE.HemisphereLight(0x9a8ae6, 0x4a3050, 1.05); mapScene.add(mapHemi);
const mapProbe = new THREE.LightProbe(); mapScene.add(mapProbe); // ana sahnenin gök ışığı (eskiden ortam haritası)
const mapSun = new THREE.DirectionalLight(0xffb486, 2.9);
mapSun.castShadow = true; Object.assign(mapSun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 200 }); mapSun.shadow.camera.updateProjectionMatrix();
mapSun.shadow.bias = -0.0005; mapSun.shadow.normalBias = 0.04; mapSun.shadow.mapSize.set(2048, 2048);
mapScene.add(mapSun, mapSun.target);
const MAP_SUN = new THREE.Vector3(-0.6, 0.27, -0.75).normalize();
const MAP_SUN_COL = new THREE.Color('#ffb486');
const MAP_POS = CHAPTERS.map((_, i) => new THREE.Vector3(Math.sin(i * 1.9) * 10, i * 1.4, -i * 50));
const MAP_CAM_OFF = new THREE.Vector3(0, 21, 42), MAP_TGT_OFF = new THREE.Vector3(0, -0.5, -3), MAP_CONST_OFF = new THREE.Vector3(0, 8.5, -26);
const mapCamCurve = new THREE.CatmullRomCurve3(MAP_POS.map((p) => p.clone().add(MAP_CAM_OFF)), false, 'centripetal');
const mapTgtCurve = new THREE.CatmullRomCurve3(MAP_POS.map((p) => p.clone().add(MAP_TGT_OFF)), false, 'centripetal');

/* ---------- parıltılı nokta malzemesi (yol, ateş böcekleri) ---------- */
const GLINT_VERT = `attribute vec3 aCol; attribute float aT; attribute float aS; uniform float uTime, uPx, uFlow, uDrift; varying vec3 vC;
void main(){
  vec3 p = position;
  p += vec3(sin(uTime * 0.31 + aT * 41.0), sin(uTime * 0.53 + aT * 23.0) * 0.6, cos(uTime * 0.27 + aT * 17.0)) * uDrift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (2.0 + fract(aT * 7.3) * 3.0) + aT * 60.0);
  float flow = uFlow * smoothstep(0.86, 1.0, fract(aT * 3.0 - uTime * 0.22));
  vC = aCol * (tw + flow * 3.0);
  gl_PointSize = clamp(aS * uPx / -mv.z, 1.0, 64.0);
  gl_Position = projectionMatrix * mv;
}`;
const GLINT_FRAG = `varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.0, 0.5, length(c)); gl_FragColor = vec4(vC * a * a, 1.0); }`;
function glintPoints(pos, col, t, size, flow, drift) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: GLINT_VERT, fragmentShader: GLINT_FRAG, uniforms: { uTime: U.uTime, uPx: mapPx, uFlow: { value: flow }, uDrift: { value: drift } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
const mapPx = { value: 600 };

const _mfv = new THREE.Vector3();
const SkyMap = {
  inited: false, active: false, isl: [], f: 0, tf: 0, fv: 0, t: 0, intro: 1, dive: null, drag: null, buildT: 0, shown: -1,
  init() {
    if (this.inited) return; this.inited = true;
    // adalar için tutucular, takımyıldızları
    CHAPTERS.forEach((ch, i) => {
      const holder = new THREE.Group(); holder.position.copy(MAP_POS[i]); mapScene.add(holder);
      this.isl.push({ i, ch, holder, view: null, lv: null, nodes: [], marks: [], cons: this.buildConst(i) });
    });
    this.buildRoad(); this.buildAmbient(); this.buildZifir(); this.buildBeacon(); this.buildDom();
    this.star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(2.4, 2.2, 3.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.star.frustumCulled = false; mapScene.add(this.star); this.starT = 3;
  },
  /* ----- takımyıldızı: göğe asılı yıldızlar ve çizgiler ----- */
  buildConst(i) {
    const g = new THREE.Group(); g.visible = false; mapScene.add(g);
    const pts = CONST[i].map(([x, y]) => new THREE.Vector3((x - 50) * 0.1, (60 - y) * 0.1, 0));
    const stars = pts.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(s); return s; });
    pts.forEach((p, k) => stars[k].position.copy(p));
    const edges = CONST_EDGES[i] || SEQ;
    const lines = edges.map(([a, b]) => {
      const A = pts[a], B = pts[b], len = A.distanceTo(B);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.scale.set(len, 0.07, 1); m.position.copy(A).add(B).multiplyScalar(0.5); m.rotation.z = Math.atan2(B.y - A.y, B.x - A.x); g.add(m);
      return { m, a, b };
    });
    return { g, stars, lines, pts };
  },
  /* ----- adaları bağlayan yıldız yolu ----- */
  buildRoad() {
    const pos = [], col = [], t = [], sz = []; this.roadSeg = [];
    for (let i = 0; i < CHAPTERS.length - 1; i++) {
      const a = MAP_POS[i].clone().add(new THREE.Vector3(0, 0.5, -12)), b = MAP_POS[i + 1].clone().add(new THREE.Vector3(0, 0.5, 13));
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(Math.sin(i * 2.3) * 6, 8, 0));
      const cv = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 2, 0)), mid, mid.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 2, 0)), b]);
      const n = 90, start = pos.length / 3;
      for (let k = 0; k < n; k++) {
        const p = cv.getPoint(k / (n - 1)); pos.push(p.x + (Math.random() - 0.5) * 0.35, p.y + (Math.random() - 0.5) * 0.35, p.z + (Math.random() - 0.5) * 0.35);
        col.push(1, 1, 1); t.push(i + k / n); sz.push(k % 6 === 0 ? 0.55 : 0.28);
      }
      this.roadSeg.push({ start, n });
    }
    this.road = glintPoints(pos, col, t, sz, 1, 0.08); mapScene.add(this.road);
  },
  /* ----- ateş böcekleri, pus katmanları ----- */
  buildAmbient() {
    const pos = [], col = [], t = [], sz = [];
    MAP_POS.forEach((c) => {
      for (let k = 0; k < 70; k++) {
        const a = Math.random() * TAU, r = 4 + Math.random() * 14;
        pos.push(c.x + Math.cos(a) * r, c.y + 0.5 + Math.random() * 9, c.z + Math.sin(a) * r * 1.2);
        const w = Math.random(); col.push(lerp(1.6, 0.9, w), lerp(1.3, 0.8, w), lerp(0.5, 1.8, w)); t.push(Math.random()); sz.push(0.12 + Math.random() * 0.14);
      }
    });
    this.motes = glintPoints(pos, col, t, sz, 0, 0.9); mapScene.add(this.motes);
    this.haze = [];
    const hm = new THREE.SpriteMaterial({ map: TEX.soft, color: new THREE.Color('#c7a2e0'), transparent: true, depthWrite: false, opacity: 0.13, fog: false });
    MAP_POS.forEach((c, i) => {
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Sprite(hm); const a = (k / 6) * TAU + i;
        s.position.set(c.x + Math.cos(a) * 16, c.y - 4 - Math.random() * 5, c.z + Math.sin(a) * 18); s.scale.setScalar(22 + Math.random() * 16); s.renderOrder = 1;
        mapScene.add(s); this.haze.push({ s, ph: Math.random() * TAU, y0: s.position.y });
      }
    });
  },
  /* ----- haritadaki Zifir ----- */
  buildZifir() {
    const g = new THREE.Group(), k = new THREE.Group(); g.add(k); k.scale.setScalar(ZIF_SCALE * 1.2);
    this.zU = { uTime: U.uTime, uWob: { value: 0.7 }, uBurn: { value: 0 }, uRim: { value: new THREE.Color(SKINS[Save.data.skin]?.c || SKINS[0].c) }, uSunDir: { value: MAP_SUN }, uSunCol: { value: MAP_SUN_COL }, uLit: { value: 0.25 }, uFade: { value: 1 } };
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: ZIF_FRAG, uniforms: this.zU })); body.position.y = 0.3; k.add(body);
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.15, 2.0) }), pupM = new THREE.MeshBasicMaterial({ color: 0x050308 });
    this.zEyes = [-1, 1].map((sx) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), eyeM); e.scale.set(0.95, 1.25, 0.55); e.position.set(sx * 0.105, 0.38, 0.25); const p = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), pupM); p.position.set(0, -0.005, 0.06); e.add(p); k.add(e); return e; });
    const ink = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: TEX.ink, transparent: true, depthWrite: false, opacity: 0.8 })); ink.rotation.x = -PI / 2; ink.position.y = 0.02; g.add(ink);
    this.zBody = k; this.zif = g; this.zBlink = 2; mapScene.add(g);
  },
  /* ----- sıradaki adanın ışık sütunu ----- */
  buildBeacon() {
    const bu = { uTime: U.uTime };
    const m = new THREE.ShaderMaterial({ uniforms: bu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float e = pow(sin(vUv.x * 3.14159), 2.0); float up = pow(1.0 - vUv.y, 1.6); float s = 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 4.0);
        gl_FragColor = vec4(vec3(0.75, 0.6, 1.6) * e * up * s * 0.9, 1.0); }` });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 16, 20, 1, true).translate(0, 8, 0), m); this.beacon.frustumCulled = false; mapScene.add(this.beacon);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.1, 2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); mapScene.add(this.ring);
  },
  /* ----- HTML katmanı: düğümler ve ada etiketleri ----- */
  buildDom() {
    const layer = $('#mapLayer'); layer.innerHTML = '';
    this.isl.forEach((I) => {
      const tag = document.createElement('div'); tag.className = 'mtag'; tag.innerHTML = `<small>${I.ch.roman}</small>${I.ch.name}`; layer.appendChild(tag); I.tag = tag;
      tag.addEventListener('click', () => { audio.ui(); this.go(I.i); });
      I.btns = [];
      for (let k = 0; k < 8; k++) {
        const g = I.i * 8 + k, b = document.createElement('button'); b.className = 'mnode tap'; b.innerHTML = `<b>${g + 1}</b><i><s></s><s></s><s></s></i>`;
        b.addEventListener('click', (e) => { e.stopPropagation(); this.pick(g); }); layer.appendChild(b); I.btns.push(b);
      }
    });
    const dots = $('#mapDots'); dots.innerHTML = '';
    this.dots = CHAPTERS.map((ch, i) => { const d = document.createElement('i'); d.className = 'tap'; d.addEventListener('click', () => { audio.ui(); this.go(i); }); dots.appendChild(d); return d; });
  },
  /* ----- ada kurulumu (gerçek bölüm adası, düşük doku) ----- */
  buildIsland(I) {
    const lv = buildLevel(Object.assign({}, levelSpec(I.i * 8 + 4), { visualOnly: true })); if (!lv) { I.failed = true; return; }
    for (const m of lv.movers) if (m.kind === 'melt') m.drop = 0;
    for (const br of lv.bridges) br.active = true;
    const Q = Object.assign({}, Perf.Q, { texScale: Math.min(0.5, Perf.Q.texScale), grass: Math.round(Perf.Q.grass * 0.35) });
    const v = new IslandView(lv, { parent: I.holder, Q, quiet: true });
    if (v.grass) { v.grass.computeBoundingSphere(); v.grass.frustumCulled = true; }
    v.introT = 0; I.view = v; I.lv = lv;
    // seviye düğümleri yol boyunca
    const pal = lv.chap.pal, stoneM = worldMat({ color: new THREE.Color(pal.pathStone), roughness: 0.7 });
    for (let k = 0; k < 8; k++) {
      const PA = pathAt(lv.path, lv.length * (0.07 + (0.86 * k) / 7), {});
      const n = new THREE.Group(); n.position.set(PA.x, 0, PA.z); v.root.add(n);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.2, 18), stoneM); ped.position.y = 0.1; ped.castShadow = ped.receiveShadow = true; n.add(ped);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); orb.position.y = 0.62; n.add(orb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.y = 0.62; halo.scale.setScalar(1.6); n.add(halo);
      I.marks.push({ n, orb, halo, ph: k * 0.7 });
      I.nodes.push(new THREE.Vector3());
    }
    this.refreshIsland(I);
  },
  freeIsland(I) {
    I.view.dispose(); I.view = null; I.lv = null; I.marks = []; I.nodes = [];
    for (const b of I.btns) b.style.display = 'none';
  },
  refreshIsland(I) {
    const un = Save.data.unlocked;
    I.marks.forEach((mk, k) => {
      const g = I.i * 8 + k, st = Save.stars(g), open = g <= un;
      const c = st ? [2.6, 1.8, 0.7] : open ? [1.7, 1.6, 2.4] : [0.22, 0.2, 0.3];
      mk.orb.material.color.setRGB(c[0], c[1], c[2]); mk.halo.material.color.setRGB(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8); mk.halo.visible = open; mk.lit = st > 0; mk.open = open;
    });
  },
  refresh() {
    const un = Save.data.unlocked;
    for (const I of this.isl) {
      if (I.view) this.refreshIsland(I);
      const locked = un < I.i * 8;
      I.tag.classList.toggle('lk', locked);
      I.tag.innerHTML = `<small>${I.ch.roman}</small>${I.ch.name}<em>${locked ? 'kilitli' : `★ ${chapterStars(I.i)}`}</em>`;
      I.btns.forEach((b, k) => {
        const g = I.i * 8 + k, d = Save.data.levels[g], open = g <= un;
        b.className = 'mnode tap' + (d ? ' done' : open ? ' open' : ' lk') + (g === un && !d ? ' cur' : '');
        b.querySelectorAll('s').forEach((s, q) => s.classList.toggle('on', !!(d && d.stars[q])));
      });
      // takımyıldızı
      const C = I.cons;
      C.stars.forEach((s, k) => { const g = I.i * 8 + k, st = Save.stars(g), open = g <= un; s.material.color.setRGB(...(st ? [2.4, 1.8, 0.9] : open ? [1.3, 1.25, 1.6] : [0.35, 0.33, 0.45])); s.userData.base = st ? 1.15 : open ? 0.8 : 0.55; });
      C.lines.forEach((L) => { const lit = L.lit = Save.stars(I.i * 8 + L.a) > 0 && Save.stars(I.i * 8 + L.b) > 0; L.m.material.color.setRGB(...(lit ? [2.2, 1.5, 0.6] : [0.3, 0.26, 0.45])); L.m.scale.y = lit ? 0.14 : 0.08; });
    }
    // yıldız yolu: açık bölümlere giden yollar altın
    const col = this.road.geometry.attributes.aCol;
    this.roadSeg.forEach((seg, i) => { const open = un >= (i + 1) * 8; for (let k = 0; k < seg.n; k++) col.setXYZ(seg.start + k, ...(open ? [1.8, 1.25, 0.55] : [0.4, 0.32, 0.7])); });
    col.needsUpdate = true;
    // Zifir: sıradaki seviyenin düğümünde
    this.curG = Math.min(un, STORY_LEVELS - 1);
    this.zU.uRim.value.set(SKINS[Save.data.skin]?.c || SKINS[0].c);
    // haritadaki Zifir de giydiği kostümle bekler
    const ck = Save.data.costume || '';
    if (this.zCosKey !== ck) {
      if (this.zCos) { this.zBody.remove(this.zCos.g); this.zCos.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.zCos = null; }
      this.zCosKey = ck;
      if (ck) try { this.zCos = buildCostume(ck, this.zInk || (this.zInk = new THREE.ShaderMaterial({ vertexShader: ZIF_VERT, fragmentShader: ZIF_FRAG, uniforms: this.zU }))); this.zBody.add(this.zCos.g); } catch (e) { this.zCos = null; }
    }
    this.shown = -1;
  },
  /* ----- açılış / kapanış ----- */
  open() {
    this.init();
    // en son oynanan adanın bölümünde açılır (hiç oynanmadıysa sıradaki adanınkinde)
    const un = Save.data.unlocked, lg = Save.data.lastG, base = lg != null && lg <= un ? lg : Math.min(un, STORY_LEVELS - 1), cur = Math.min(CHAPTERS.length - 1, Math.floor(base / 8));
    const first = !this.active;
    this.active = true; L1.copy(MAP_SUN);
    if (first) { this.f = this.tf = cur; this.fv = 0; this.intro = 0; this.dive = null; }
    const I = this.isl[cur]; if (!I.view && !I.failed) this.buildIsland(I);
    this.refresh(); this.updatePanel(true);
    U.uFogNear.value = 50; U.uFogFar.value = 290;
    if (first) { audio.whoosh(true, 1.4, 0.07); setTimeout(() => this.active && audio.sprite(2), 500); }
    $('#mapHint').classList.toggle('on', !Save.seen('mapSwipe'));
  },
  deactivate() {
    this.active = false; this.dive = null; this.drag = null; $('#map').classList.remove('diving');
    if (mapSun.shadow.map) { mapSun.shadow.map.dispose(); mapSun.shadow.map = null; }
    U.uFogNear.value = 70; U.uFogFar.value = 340;
    for (const I of this.isl) { if (I.tag) I.tag.style.opacity = 0; if (I.btns) for (const b of I.btns) b.style.display = 'none'; }
  },
  go(i) {
    i = clamp(Math.round(i), 0, CHAPTERS.length - 1);
    if (i !== Math.round(this.tf)) { audio.whoosh(i > this.tf, 0.7, 0.05); haptic(6); if (!Save.seen('mapSwipe')) { Save.markSeen('mapSwipe'); $('#mapHint').classList.remove('on'); } }
    this.tf = i;
  },
  pick(g) {
    if (this.dive) return;
    if (g > Save.data.unlocked) { audio.clunk(); haptic(10); toast('Bu ada henüz <em>uyanmadı</em>. Önce bir önceki adayı tamamla.', 2.2); return; }
    const I = this.isl[Math.floor(g / 8)], mk = I.marks[g % 8];
    audio.ui(); audio.whoosh(true, 0.8, 0.07); haptic(12);
    if (Math.round(this.f) !== I.i) { this.go(I.i); }
    const p = new THREE.Vector3(); if (mk) mk.n.getWorldPosition(p); else p.copy(MAP_POS[I.i]);
    $('#map').classList.add('diving');
    this.dive = { t: 0, g, p0: mapCam.position.clone(), t0: this.tgt.clone(), p1: p.clone().add(new THREE.Vector3(0, 5, 9)), t1: p.clone().add(new THREE.Vector3(0, 0.6, 0)) };
    $('#fader').classList.add('soon');
  },
  /* ----- dokunma ----- */
  // yatay sürükleme: parmağı izler, kenarlarda lastik gibi direnir; bırakınca hıza göre bir (hızlıysa iki) bölüm geçer
  down(e) { this.drag = { id: e.pointerId, x: e.clientX, x0: e.clientX, y0: e.clientY, f0: this.f, axis: 0, hist: [[e.timeStamp, this.f]] }; this.fv = 0; },
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.axis) { const ax = Math.abs(e.clientX - d.x0), ay = Math.abs(e.clientY - d.y0); if (ax < 7 && ay < 7) return; d.axis = ax >= ay * 0.75 ? 1 : 2; d.x = e.clientX; }
    if (d.axis !== 1) return;
    const now = e.timeStamp, n = CHAPTERS.length - 1; // olayın gerçek zamanı (kare gecikmesinden bağımsız)
    let df = -(e.clientX - d.x) / (Math.max(320, innerWidth) * 0.8); d.x = e.clientX;
    if ((this.f < 0 && df < 0) || (this.f > n && df > 0)) df *= 0.3;
    this.f = clamp(this.f + df, -0.45, n + 0.45); this.tf = this.f;
    d.hist.push([now, this.f]); while (d.hist.length > 2 && now - d.hist[0][0] > 110) d.hist.shift();
  },
  up(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return; this.drag = null;
    const base = Math.round(d.f0);
    if (d.axis !== 1) { this.go(Math.round(this.f)); return; }
    const now = e.timeStamp, h = d.hist, A = h[0], B = h[h.length - 1];
    const v = now - B[0] < 90 && B[0] > A[0] ? (B[1] - A[1]) / ((B[0] - A[0]) / 1000) : 0; // bölüm/sn
    let tgt = Math.abs(v) > 0.8 ? base + Math.sign(v) * (Math.abs(v) > 5 ? 2 : 1) : Math.round(this.f);
    if (Math.abs(v) <= 0.8 && Math.abs(this.f - d.f0) > 0.22 && tgt === base) tgt = base + Math.sign(this.f - d.f0);
    this.go(clamp(tgt, base - 2, base + 2));
  },
  // fare tekerleği / dokunmatik yüzey
  wheel(e) {
    const now = performance.now(), dl = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.wAcc = (now - (this.wT || 0) > 250 ? 0 : this.wAcc || 0) + dl; this.wT = now;
    if (Math.abs(this.wAcc) > 50 && now - (this.wGo || 0) > 420) { this.wGo = now; this.go(Math.round(this.tf) + Math.sign(this.wAcc)); this.wAcc = 0; }
  },
  /* ----- panel ----- */
  updatePanel(force) {
    const ci = clamp(Math.round(this.f), 0, CHAPTERS.length - 1);
    if (!force && ci === this.shown) return; this.shown = ci;
    const ch = CHAPTERS[ci], un = Save.data.unlocked, locked = un < ci * 8, stars = chapterStars(ci);
    const pn = $('#mapPanel'); pn.classList.remove('sw'); void pn.offsetWidth; pn.classList.add('sw');
    pn.classList.toggle('locked', locked);
    $('#mpNum').textContent = ch.roman; $('#mpCons').textContent = ch.constellation; $('#mpName').textContent = ch.name; $('#mpSub').textContent = ch.sub;
    $('#mpStars').textContent = stars; $('#mpFill').style.width = (stars / 24) * 100 + '%';
    let g = -1; for (let k = 0; k < 8; k++) { const q = ci * 8 + k; if (q <= un && !Save.data.levels[q]) { g = q; break; } }
    if (g < 0) for (let k = 0; k < 8; k++) { const q = ci * 8 + k; if (q <= un && Save.stars(q) < 3) { g = q; break; } }
    if (g < 0) g = ci * 8;
    this.playG = g;
    $('#mpPlay').innerHTML = locked ? 'Kilitli' : Save.data.levels[g] ? `Ada ${g + 1} <small>yıldız topla</small>` : `Ada ${g + 1} <small>${g === un ? 'sıradaki' : 'oyna'}</small>`;
    { const md = Meta.d(), sec = !!md.secrets[ci], el = $('#mpSecret'); el.classList.toggle('on', !locked); el.classList.toggle('got', sec);
      $('#mpSecT').textContent = sec ? (md.bonus[ci] ? `Gizli Ada · ${'★'.repeat(md.bonus[ci])}` : 'Gizli yıldız bulundu!') : 'Bu dünyada gölgede parlayan bir yıldız saklı'; }
    this.dots.forEach((d, i) => { d.classList.toggle('on', i === ci); d.classList.toggle('lk', un < i * 8); });
    $('#mapPrev').classList.toggle('dis', ci === 0); $('#mapNext').classList.toggle('dis', ci === CHAPTERS.length - 1);
  },
  /* ----- kare güncellemesi ----- */
  update(dtR) {
    if (!this.active) return;
    this.t += dtR; L1.copy(MAP_SUN);
    const t = this.t;
    // ilerleme: yaylı geçiş
    if (!this.drag) { const k = 26, c = 2 * Math.sqrt(k); this.fv += ((this.tf - this.f) * k - this.fv * c) * dtR; this.f += this.fv * dtR; }
    this.updatePanel(false);
    // adaları sırayla kur (kamera dururken)
    this.buildT -= dtR;
    if (this.buildT <= 0 && !this.drag && !this.dive && this.intro > 0.85) {
      const fc = Math.round(this.f), order = [fc, fc + 1, fc - 1, fc + 2];
      for (const i of order) { const I = this.isl[i]; if (I && !I.view && !I.failed) { this.buildIsland(I); this.refresh(); this.buildT = 0.3; break; } }
    }
    // bellek: odaktan uzak adaları serbest bırak
    for (const I of this.isl) if (I.view && (I.i - this.f > 2.7 || this.f - I.i > 1.7) && !this.drag) this.freeIsland(I);
    // kamera
    const fc = clamp(this.f, 0, CHAPTERS.length - 1), u = fc / (CHAPTERS.length - 1);
    const P = mapCamCurve.getPoint(u), T = mapTgtCurve.getPoint(u);
    const fr = this.f - Math.floor(this.f), swoop = Math.sin(fr * PI) * 6 * (Math.abs(this.tf - this.f) > 0.02 || this.drag ? 1 : 0);
    // boşluk daralırsa (kısa ekran, banner) kamera biraz geri çekilir: ada ve tüm rozetleri panelin üstüne sığar
    const band = this._lay ? (this._lay.bot - this._lay.top) / this._lay.h : 0.5, zf = clamp(Math.sqrt(0.5 / Math.max(0.18, band)), 1, 1.55);
    const asp = mapCam.aspect, dk = (asp < 0.62 ? 1.17 : asp < 1 ? 1.05 : 0.7) * (asp < 1 ? zf : clamp(Math.sqrt(0.8 / Math.max(0.3, band)), 1, 1.4));
    P.sub(T).multiplyScalar(dk).add(T); P.y += swoop;
    if (asp > 1.2) { const sh = P.distanceTo(T) * Math.tan(deg(mapCam.fov / 2)) * asp * 0.2; P.x -= sh; T.x -= sh; }
    // hafif el kamerası salınımı
    const sway = Math.sin(t * 0.21) * 2.2, bob = Math.sin(t * 0.33) * 0.5;
    P.x += sway; P.y += bob;
    // açılış sineması: yüksekten süzülerek iniş
    if (this.intro < 1) { this.intro = Math.min(1, this.intro + dtR / 2.8); const e = 1 - Ease.inOutCubic(this.intro); P.y += e * 34; P.z += e * 40; P.x -= e * 14; T.y += e * 6; }
    this.tgt = T.clone();
    if (this.dive) {
      const d = this.dive; d.t += dtR; const e = Ease.inOutCubic(clamp01(d.t / 0.75));
      P.lerpVectors(d.p0, d.p1, e); T.lerpVectors(d.t0, d.t1, e);
      if (d.t > 0.55) $('#fader').classList.add('on');
      if (d.t > 0.8 && !d.done) { d.done = true; const g = d.g; setTimeout(() => { startStory(g); setTimeout(() => $('#fader').classList.remove('on', 'soon'), 60); }, 30); }
    }
    mapCam.position.copy(P); mapCam.lookAt(T);
    this.frame(dtR);
    mapSky.position.copy(mapCam.position);
    // ışık ve gölge kamerası hedefi izler
    mapSun.target.position.copy(T); mapSun.position.copy(T).addScaledVector(MAP_SUN, 90);
    mapSun.castShadow = Perf.level >= 1;
    const ms = Perf.level >= 2 ? 2048 : 1024; if (mapSun.shadow.mapSize.x !== ms) { mapSun.shadow.mapSize.set(ms, ms); if (mapSun.shadow.map) { mapSun.shadow.map.dispose(); mapSun.shadow.map = null; } }
    // adalar
    for (const I of this.isl) {
      const di = I.i - this.f, vis = di > -1.6 && di < 4.2;
      I.holder.visible = vis && !!I.view;
      if (I.view && vis) {
        if (!I.view.introDone) I.view.intro(dtR);
        I.view.update(dtR, t, MAP_CTX);
        I.holder.position.y = MAP_POS[I.i].y + Math.sin(t * 0.4 + I.i) * 0.35;
        for (const mk of I.marks) { const s = 1 + Math.sin(t * 2.4 + mk.ph) * 0.12; mk.halo.scale.setScalar((mk.lit ? 1.9 : 1.4) * s); mk.orb.position.y = 0.62 + Math.sin(t * 1.6 + mk.ph) * 0.06; }
      }
      // takımyıldızı: kameraya bağlı gök katmanında, kaydırırken yana süzülür
      const C = I.cons, ca = clamp01(1 - Math.abs(di) * 1.5) * clamp01(this.intro * 1.6 - 0.3);
      C.g.visible = ca > 0.01;
      if (C.g.visible) {
        const D = 64, th = Math.tan(deg(mapCam.fov / 2)), sy = asp < 1 ? 0.235 : 0.27;
        C.g.position.copy(mapCam.position); C.g.quaternion.copy(mapCam.quaternion);
        const sx = asp < 1.2 ? 0.5 : 0.21, syL = asp < 1.2 ? sy : 0.32;
        C.g.translateZ(-D); C.g.translateY(th * D * (1 - 2 * syL)); C.g.translateX((sx - 0.5) * 2 * th * D * asp - di * th * D * asp * 1.6);
        const sc = (th * D * 2 * (asp < 1 ? 0.25 : 0.3)) / 12; C.g.scale.setScalar(sc);
        C.g.rotateY(Math.sin(t * 0.12 + I.i) * 0.12);
        C.stars.forEach((s, k) => { s.scale.setScalar((s.userData.base || 1) * (0.85 + 0.25 * Math.sin(t * (1.3 + k * 0.37) + k)) * 2.2); s.material.opacity = ca; });
        C.lines.forEach((L) => { L.m.material.opacity = ca * (L.lit ? 1 : 0.8); });
      }
    }
    // Zifir ve ışık sütunu sıradaki düğümde
    const CI = this.isl[Math.floor(this.curG / 8)], mk = CI && CI.marks[this.curG % 8];
    const zv = !!(mk && CI.view && CI.holder.visible && CI.view.introT > 1.2);
    this.zif.visible = this.beacon.visible = this.ring.visible = zv;
    if (zv) {
      const p = new THREE.Vector3(); mk.n.getWorldPosition(p);
      const hop = Math.max(0, Math.sin(t * 2.6)) ** 2 * 0.35;
      this.zif.position.set(p.x + 0.85, p.y, p.z + 0.25); this.zBody.position.y = hop;
      this.zBody.scale.set(1 + (hop < 0.02 ? 0.06 : -0.03), 1 - (hop < 0.02 ? 0.08 : -0.05), 1);
      this.zif.rotation.y = Math.atan2(mapCam.position.x - p.x, mapCam.position.z - p.z) * 0.8;
      this.zBlink -= dtR; const bl = this.zBlink < 0.12 ? 0.1 : 1; if (this.zBlink < 0) this.zBlink = 2 + Math.random() * 3;
      for (const e of this.zEyes) e.scale.y = 1.25 * bl;
      if (this.zCos) this.zCos.update(dtR, t, false, hop > 0.05);
      this.beacon.position.copy(p); this.ring.position.set(p.x, p.y + 0.22, p.z);
      const rk = (t * 0.8) % 1; this.ring.scale.setScalar(1 + rk * 2.2); this.ring.material.opacity = (1 - rk) * 0.9;
    }
    // pus katmanları
    for (const h of this.haze) h.s.position.y = h.y0 + Math.sin(t * 0.15 + h.ph) * 0.8;
    // kayan yıldız
    this.starT -= dtR;
    if (this.starT < 0) { this.starT = 5 + Math.random() * 7; this.shoot = { t: 0, a: new THREE.Vector3(-120 + Math.random() * 80, 120 + Math.random() * 60, -260), d: new THREE.Vector3(1, -0.35, 0).normalize() }; }
    if (this.shoot) {
      const s = this.shoot; s.t += dtR; const k = s.t / 0.9;
      if (k > 1) { this.shoot = null; this.star.material.opacity = 0; }
      else { this.star.position.copy(mapCam.position).add(s.a).addScaledVector(s.d, k * 160); this.star.scale.set(26, 0.7, 1); this.star.quaternion.copy(mapCam.quaternion); this.star.rotateZ(Math.atan2(s.d.y, s.d.x)); this.star.material.opacity = Math.sin(k * PI); }
    }
    this.place();
  },
  /* ----- HTML öğelerini ekrana yerleştir ----- */
  place() {
    const W = innerWidth, H = innerHeight, v = new THREE.Vector3();
    for (const I of this.isl) {
      const di = I.i - this.f, focus = Math.abs(di) < 0.5 && !this.dive && this.intro > 0.6;
      // düğüm rozetleri
      const nodeA = I.view && Math.abs(di) < 0.5 ? clamp01(1 - Math.abs(di) * 2.6) * clamp01((this.intro - 0.6) * 3) * (this.dive ? 0 : 1) : 0;
      const P = [];
      I.btns.forEach((b, k) => {
        if (nodeA <= 0.01 || !I.marks[k]) { if (b.style.display !== 'none') b.style.display = 'none'; return; }
        I.marks[k].n.getWorldPosition(v); v.y += 1.35; v.project(mapCam);
        if (v.z > 1) { b.style.display = 'none'; return; }
        P.push({ b, x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H });
      });
      // rozetler üst üste binmesin: birbirinden itilir (kendi kaidesinin yakınında kalır)
      const md = W < 420 ? 40 : 44;
      for (let it = 0; it < 6; it++) for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const A = P[i], B = P[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01;
        if (d < md) { const k = (md - d) / 2 / d; A.x -= dx * k; A.y -= dy * k; B.x += dx * k; B.y += dy * k; }
      }
      for (const p of P) { p.b.style.display = 'flex'; p.b.style.opacity = nodeA.toFixed(3); p.b.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`; }
      // ada etiketi: yalnızca ilerideki adalar
      const ta = I.view && !focus && !this.dive && di > 0.5 && di < 2.7 ? clamp01(di * 2 - 1) * clamp01(2.7 - di) * clamp01(this.intro * 2 - 0.4) : 0;
      I.tagA = 0;
      if (ta > 0.01) {
        v.copy(MAP_POS[I.i]); v.y += I.holder.position.y - MAP_POS[I.i].y + 7.5; v.project(mapCam);
        const ry = (-v.y * 0.5 + 0.5) * H, top = H < 560 ? 112 : 150;
        if (v.z < 1 && ry > top - 60) { I.tagA = ta; I.tagX = clamp((v.x * 0.5 + 0.5) * W, 100, W - 100); I.tagY = clamp(ry, top, H * 0.6); I.tagS = clamp(1.15 - (di - 1) * 0.2, 0.75, 1.1) * (H < 560 ? 0.85 : 1); }
      }
    }
    // çakışan etiketleri yukarı it
    const placed = [];
    for (const I of this.isl) {
      if (I.tagA <= 0) { if (I.tag.style.opacity !== '0') { I.tag.style.opacity = 0; I.tag.style.pointerEvents = 'none'; } continue; }
      let y = I.tagY; for (const p of placed) if (Math.abs(p.x - I.tagX) < 230 && Math.abs(p.y - y) < 44) y = p.y - 46;
      if (y < (H < 560 ? 100 : 130)) { I.tag.style.opacity = 0; I.tag.style.pointerEvents = 'none'; continue; }
      placed.push({ x: I.tagX, y });
      I.tag.style.opacity = I.tagA.toFixed(3); I.tag.style.pointerEvents = 'auto';
      I.tag.style.transform = `translate3d(${I.tagX.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${I.tagS.toFixed(3)})`;
    }
  },
  /* ----- gök, ışık ve son işlem ayarları (çizimden hemen önce) ----- */
  apply() {
    skyU.uZen.value.set('#140d3c'); skyU.uHor.value.set('#ff9a7a'); skyU.uBelow.value.set('#3a2a5e');
    skyU.uSunDir.value.copy(MAP_SUN); skyU.uSunCol.value.set('#ff8a50').multiplyScalar(1.5);
    skyU.uTwin.value = 0; skyU.uStars.value = 0.62; skyU.uEclipse.value = 0; skyU.uNight.value = 0.22; skyU.uAurora.value = 0.32;
    seaU.uLit.value.set('#d892a8'); seaU.uDeep.value.set('#2c2250'); seaU.uIslK.value = 0;
    U.uFogCol.value.set('#8c6aa6'); U.uBelowCol.value.set('#2e2350');
    U.uNightAmt.value = 0.16; U.uNightR.value = 99999; U.uNightRim.value = 0; U.uNightC.value.set(0, 0);
    U.uCamPos.value.copy(mapCam.position);
    mapSun.color.copy(MAP_SUN_COL); mapSun.intensity = 2.9; mapHemi.intensity = 1.05;
    if (mapSea.material !== sea.material) mapSea.material = sea.material;
    mapProbe.sh.copy(envProbe.sh); mapProbe.intensity = 1;
    if (mapSun.castShadow) renderer.shadowMap.needsUpdate = true;
    const pu = post.u, sp = new THREE.Vector3().copy(mapCam.position).addScaledVector(MAP_SUN, 800).project(mapCam);
    pu.uSunUV.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    pu.uSunVis.value = (sp.z < 1 ? 1 : 0) * smoothstep(1.3, 0.9, Math.max(Math.abs(sp.x), Math.abs(sp.y))) * 0.8;
    pu.uFlareCol.value.set('#ff9a60').multiplyScalar(0.8);
    post.rays.uniforms.uSun.value.copy(pu.uSunUV.value); post.rays.uniforms.uSun2On.value = 0;
    pu.uExposure.value = 1.04; pu.uBloomAdd.value = 0.6; pu.uRays.value = 0.42; pu.uNight.value = 0.12; pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0;
    pu.uLift.value.set(0.02, 0.008, 0.045); pu.uGamma.value.set(1, 1, 1); pu.uGain.value.set(1.04, 0.99, 1.02); pu.uSat.value = 1.12; pu.uContrast.value = 1.07;
    pu.uTilt.value = 0.85; pu.uTiltC.value = 0.56; pu.uTiltW.value = 0.22;
    mapPx.value = renderer.domElement.height / (2 * Math.tan(deg(mapCam.fov / 2)));
  },
  resize(w, h) { mapCam.aspect = w / h; mapCam.updateProjectionMatrix(); this._lay = null; },
  // kadraj: odaktaki ada, üst çubuk ile panelin arasındaki boşluğun ortasına gelir (objektif kaydırma; perspektif bozulmaz).
  // Panel uzayınca, banner açılınca ya da ekran kısa olunca ada panelin altında kalmaz.
  frame(dtR) {
    const W = innerWidth, H = innerHeight;
    if (!this._lay || this._lay.w !== W || this._lay.h !== H || (this._lay.t -= dtR) <= 0) {
      const pn = $('#mapPanel').getBoundingClientRect(), tp = $('#map .mtop').getBoundingClientRect(), land = W > H * 1.05;
      if (land) { // yatay: panel ve düğmeler solda; ada sağdaki boşluğun (oklar ve banner hariç) ortasına
        const adb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--adb')) || 0, nx = $('#mapNext').getBoundingClientRect();
        this._lay = { w: W, h: H, t: 0.4, land, top: tp.bottom + 6, bot: H - adb - 22, l: pn.right + 58, r: (nx.left > W * 0.6 ? nx.left : W) - 6 };
      } else this._lay = { w: W, h: H, t: 0.4, land, top: tp.bottom + 34, bot: pn.top > 0 ? pn.top - 6 : H - 40, l: 0, r: W };
    }
    const L = this._lay, I = this.isl[clamp(Math.round(this.f), 0, CHAPTERS.length - 1)];
    mapCam.updateProjectionMatrix();
    if (!I || !I.holder) return;
    I.holder.getWorldPosition(_mfv); _mfv.y += 1.2; _mfv.project(mapCam);
    const want = 1 - (2 * (L.top + (L.bot - L.top) * 0.56)) / H, s = clamp(want - _mfv.y, -0.7, 0.5);
    const sx = L.land ? clamp((L.l + L.r) / W - 1 - _mfv.x, -0.8, 0.8) : 0;
    this.lens = this.dive ? this.lens : this.lens == null ? s : damp(this.lens, s, 5, dtR);
    this.lensX = this.dive ? this.lensX || 0 : this.lensX == null ? sx : damp(this.lensX, sx, 5, dtR);
    const e = mapCam.projectionMatrix.elements; e[8] = -this.lensX; e[9] = -this.lens; mapCam.projectionMatrixInverse.copy(mapCam.projectionMatrix).invert();
  },
};
const MAP_CTX = { near: () => false, dim: () => 0.15 };
