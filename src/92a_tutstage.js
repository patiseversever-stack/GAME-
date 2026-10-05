/* =====================================================================
   NASIL OYNANIR: gerçek 3B canlı gösteri sahnesi
   Oyunun kendi parçalarıyla kurulur: gerçek bir Ege adası (IslandView),
   gerçek Zifir, pirinç güneş yayı ve güneş küresi, gerçek gölgeler (ışık
   testi oyundaki çarpıştırıcılarla), gece damlaları, Gece Kapısı, kapıdan
   yayılan gece, Gölge Kuşları ve kubbe gölgesi. Her sayfa küçük bir
   senaryo oynatır; güneşin nerede gölge verdiği açılışta hesaplanır.
   ===================================================================== */
const tutScene = new THREE.Scene();
const tutCam = new THREE.PerspectiveCamera(38, 1, 0.1, 900);
const TUT_G = 1;
const TUT_CTX = { near: () => false, dim: () => 0 };
const _tv = new THREE.Vector3(), _tv2 = new THREE.Vector3(), _tv3 = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tm = new THREE.Matrix4(), _ts = new THREE.Vector3(), _te = new THREE.Euler(), _tc = new THREE.Color();
const TutStage = {
  inited: false, on: false, page: 0, t: 0, u: 0.4, ecl: 0, night: 0, nightR: 0, chip: -1, meter: 1, birdsN: 0,
  init() {
    if (this.inited) return; this.inited = true;
    const sk = new THREE.Mesh(sky.geometry, skyMat); sk.renderOrder = -10; sk.frustumCulled = false; tutScene.add(sk); this.sky = sk;
    const se = new THREE.Mesh(sea.geometry, sea.material); se.rotation.x = -PI / 2; se.position.y = -20; se.renderOrder = -5; tutScene.add(se);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.8); tutScene.add(this.hemi);
    this.probe = new THREE.LightProbe(); tutScene.add(this.probe);
    this.sun = new THREE.DirectionalLight(0xffffff, 3.6); this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 160 }); this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.04; this.sun.shadow.mapSize.set(Perf.level >= 2 ? 2048 : 1024, Perf.level >= 2 ? 2048 : 1024);
    tutScene.add(this.sun, this.sun.target);
    // gerçek ada (oyundaki 2. ada), oyundaki görünümüyle
    const lv = (this.lv = buildLevel(Object.assign({}, levelSpec(TUT_G), { visualOnly: true })));
    for (const br of lv.bridges) br.active = true;
    const Q = Object.assign({}, Perf.Q, { texScale: Math.min(0.75, Perf.Q.texScale), grass: Math.round(Perf.Q.grass * 0.6) });
    this.holder = new THREE.Group(); tutScene.add(this.holder);
    this.view = new IslandView(lv, { parent: this.holder, Q, quiet: true });
    for (let i = 0; i < 120 && !this.view.introDone; i++) this.view.intro(0.1);
    // güneş yayı ve güneş küresi
    this.orb = makeOrb('#ffd48a'); tutScene.add(this.orb.g);
    this.arc = new Arc(brassMat); scene.remove(this.arc.g); tutScene.add(this.arc.g); this.arc.build(lv.sun.tilt, lv.sun.thMin);
    // gerçek Zifir
    this.z = new Zifir(); scene.remove(this.z.g); tutScene.add(this.z.g); this.z.preview = true;
    // duman, kor, parıltı
    this.fx = new Particles(260, false); scene.remove(this.fx.pts); tutScene.add(this.fx.pts);
    this.fxA = new Particles(200, true); scene.remove(this.fxA.pts); tutScene.add(this.fxA.pts);
    // Gölge Kuşları (oyundakiyle aynı biçim ve gölgelendirici)
    const bg = ShadowBirds.mesh.geometry.clone(); this.flap = bg.attributes.aFlap;
    this.birds = new THREE.InstancedMesh(bg, ShadowBirds.mesh.material, 6); this.birds.frustumCulled = false; this.birds.count = 0; this.birds.renderOrder = 5; tutScene.add(this.birds);
    this.bd = Array.from({ length: 6 }, (_, i) => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), ph: i * 1.7, ph0: i * 1.7, a: 0, r: 1, h: 1.5, w: 1, t: 0, yaw: 0, roll: 0, amp: 0, st: 0 }));
    this.shK = 0;
    this.shade = ShadowBirds.shade.clone(); this.shade.material = ShadowBirds.shade.material.clone(); this.shade.visible = false; tutScene.add(this.shade);
    this.L1 = new THREE.Vector3(); this.L2 = new THREE.Vector3(); this.sc = SC();
    // kadraj engelleri: adanın sabit gövdeleri (çimen/çiçek örnekleri hariç)
    this.buildOcc(); this.ray = new THREE.Raycaster();
    this.plan(); this.planShow(); this.cache = {};
    // gece damlaları (oyundaki görünüm)
    this.dv = new DropViews(); this.dv.build(this.dropsD); for (const it of this.dv.items) { scene.remove(it.g); tutScene.add(it.g); }
    this.cam = { p: new THREE.Vector3(), t: new THREE.Vector3(), ok: false };
  },
  // gösteri noktaları: güneşin nerede gölge verdiği oyunun çarpıştırıcılarıyla hesaplanır
  plan() {
    const lv = this.lv, L = lv.length, P = {}, cols = lv.cols;
    const lit = (x, z, u) => { sunDirs(u, lv.sun, this.L1, this.L2); return !occluded(cols, x, ZIFIR_Y, z, this.L1, -1); };
    const NU = 30, us = [...Array(NU + 1)].map((_, i) => 0.08 + (0.84 * i) / NU);
    let best = null; const cand = [];
    for (let s = L * 0.1; s < L * 0.8; s += 0.2) {
      pathAt(lv.path, s, P); const row = us.map((u) => lit(P.x, P.z, u));
      // en uzun gölge aralığı ve ona yakın aydınlık bir konum
      let run = 0, bestRun = 0, end = -1; row.forEach((l, i) => { run = l ? 0 : run + 1; if (run > bestRun) { bestRun = run; end = i; } });
      if (bestRun < 4 || row.filter(Boolean).length < 6) continue;
      const i0 = end - bestRun + 1, mid = Math.round((i0 + end) / 2);
      let li = -1; for (let d = 2; d < NU; d++) { if (row[end + d]) { li = end + d; break; } if (row[i0 - d]) { li = i0 - d; break; } }
      if (li < 0) continue;
      const score = Math.min(bestRun, 9) - Math.abs(s / L - 0.4) * 6 - Math.abs((us[mid] + us[li]) / 2 - 0.5) * 6; // güneş yayın ortasında: dikey ekrana sığar
      cand.push({ score, s, x: P.x, z: P.z, yaw: Math.atan2(P.tx, P.tz), uS: us[mid], uL: us[li] });
    }
    // önü ferah olanı seç: en iyi adaylarda kameraya giden ışınlar adaya çarpmasın
    cand.sort((a, b) => b.score - a.score);
    // ve güneşle birlikte daha yakın bir çekime sığanı (Zifir büyük görünsün)
    for (const c of cand.slice(0, 10)) { let m = 9; for (const yaw of [-0.6, -0.3, 0, 0.3, 0.6]) m = Math.min(m, this.blocked(c.x, c.z, yaw, deg(24), 12, true)); c.score -= m * 2.5 + this.shotFor('0', c, true).D * 0.15; if (!best || c.score > best.score) best = c; }
    if (!best) { pathAt(lv.path, L * 0.4, P); best = { s: L * 0.4, x: P.x, z: P.z, yaw: Math.atan2(P.tx, P.tz), uS: 0.3, uL: 0.75 }; }
    this.spot = best;
    // yürüyüş: kapıya giden son bölüm; her adımda ışığı en aza, güneşi en yumuşağa indiren u dizisi (küçük dinamik programlama)
    const s0 = Math.max(0.4, L - 8), s1 = L - 0.15, N = 32, M = 23, ug = [...Array(M)].map((_, j) => 0.08 + (0.84 * j) / (M - 1));
    const C = [], D = [], B = [];
    for (let i = 0; i <= N; i++) { pathAt(lv.path, s0 + ((s1 - s0) * i) / N, P); C.push(ug.map((u) => (lit(P.x, P.z, u) ? 1 : 0))); }
    for (let i = 0; i <= N; i++) {
      D.push([]); B.push([]);
      for (let j = 0; j < M; j++) {
        if (!i) { D[i][j] = C[0][j] * 10 + Math.abs(ug[j] - best.uS) * 2; B[i][j] = j; continue; }
        let m = 1e9, mk = j; for (let k = Math.max(0, j - 2); k <= Math.min(M - 1, j + 2); k++) { const v = D[i - 1][k] + Math.abs(j - k) * 0.35; if (v < m) { m = v; mk = k; } }
        D[i][j] = m + C[i][j] * 10; B[i][j] = mk;
      }
    }
    let j = 0; for (let k = 1; k < M; k++) if (D[N][k] < D[N][j]) j = k;
    const wu = []; for (let i = N; i >= 0; i--) { wu[i] = ug[j]; j = B[i][j]; }
    this.walk = { s0, s1, u: wu, N };
    // damlalar: yürüyüşte gölgede kalan iki nokta
    const pick = (f) => { let i = Math.round(N * f); for (let d = 0; d < 6; d++) for (const q of [i + d, i - d]) if (q > 1 && q < N - 2 && !C[q][ug.indexOf(wu[q])]) return q; return i; };
    this.dropsD = [0.32, 0.66].map((f) => { const i = pick(f), s = s0 + ((s1 - s0) * i) / N; pathAt(lv.path, s, P); return { s, x: P.x, z: P.z, hp: 1, state: 0, awake: true, lit: false }; });
    this.litAt = lit;
  },
  // ışın testleri için adanın gövdeleri 2.5 birimlik hücrelere bölünür (her ışın yalnızca geçtiği hücreleri dener)
  buildOcc() {
    this.holder.updateMatrixWorld(true);
    const cells = new Map(), C = 2.5, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    this.holder.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.material || o.material.isShaderMaterial || o.material.opacity < 0.2) return;
      const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count, at = (i) => (idx ? idx.getX(i) : i);
      for (let i = 0; i + 2 < n; i += 3) {
        a.fromBufferAttribute(pos, at(i)).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, at(i + 1)).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, at(i + 2)).applyMatrix4(o.matrixWorld);
        const key = Math.floor((a.x + b.x + c.x) / (3 * C)) * 1000 + Math.floor((a.z + b.z + c.z) / (3 * C));
        let arr = cells.get(key); if (!arr) cells.set(key, (arr = []));
        arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      }
    });
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.occ = [...cells.values()].map((arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeBoundingSphere(); g.computeBoundingBox(); const m = new THREE.Mesh(g, mat); m.updateMatrixWorld(); return m; });
  },
  // kostüm gösterisi için önü açık, çevresi ferah bir yol noktası
  planShow() {
    const lv = this.lv, L = lv.length, P = {}; let best = null;
    for (let f = 0.12; f < 0.9; f += 0.085) {
      pathAt(lv.path, L * f, P); let near = 9; for (const c of lv.cols) near = Math.min(near, Math.hypot(c.x - P.x, c.z - P.z) - (c.r || Math.max(c.hx || 0, c.hz || 0)));
      for (let k = -3; k <= 3; k++) { const yaw = k * 0.2, c = (this.blocked(P.x, P.z, yaw, deg(10), 6, true) + this.blocked(P.x, P.z, yaw, deg(40), 6) + this.blocked(P.x, P.z, yaw - 0.15, deg(10), 6, true) + this.blocked(P.x, P.z, yaw + 0.15, deg(10), 6, true)) * 10 + Math.max(0, 1.6 - near) * 4 + Math.abs(f - 0.5) + Math.abs(k) * 0.1; if (!best || c < best.c) best = { c, x: P.x, z: P.z, yaw }; }
    }
    this.show = best;
  },
  // Zifir'den kameraya giden ışın adanın gövdelerine çarpıyor mu (iki yükseklikte)
  blocked(x, z, yaw, pitch, far, wide = false) {
    // ışınlar Zifir'in gövdesindeki noktalardan kameranın duracağı noktaya gider (gördüğümüz gibi)
    const cp = Math.cos(pitch), cx = x + Math.sin(yaw) * cp * far, cy = 0.75 + Math.sin(pitch) * far, cz = z + Math.cos(yaw) * cp * far, ox = Math.cos(yaw), oz = -Math.sin(yaw); let n = 0;
    const probe = (lx, hy) => { _tv3.set(x + ox * lx, hy, z + oz * lx); _tv2.set(cx, cy, cz).sub(_tv3); const L = _tv2.length(); this.ray.set(_tv3, _tv2.multiplyScalar(1 / L)); this.ray.near = 0.35; this.ray.far = L * 0.97; if (this.ray.intersectObjects(this.occ, false).length) n++; };
    probe(0, 0.12); probe(0, 0.6); probe(0, 1.05); if (wide) for (const lx of [-0.38, -0.19, 0.19, 0.38]) probe(lx, 0.75);
    return n;
  },
  open() {
    this.resize(innerWidth, innerHeight); this.init(); this.on = true; this.cam.ok = false;
    // ana sahnenin her karede kendisi kurmadığı son işlem ayarlarını sakla
    const pu = post.u; this.saved = { vig: pu.uVignette.value, tilt: pu.uTilt.value, tiltC: pu.uTiltC.value, tiltW: pu.uTiltW.value, grain: pu.uGrain.value, mix: pu.uBloomMix.value, nA: U.uNightAmt.value, nR: U.uNightR.value, nRim: U.uNightRim.value, nC: U.uNightC.value.clone(), fogN: U.uFogNear.value, fogF: U.uFogFar.value };
    this.setPage(0);
    // diğer sayfaların kadrajlarını boşta, birer birer hazırla (sayfa geçişinde takılma olmasın)
    const tok = (this.preTok = (this.preTok || 0) + 1);
    [1, 2, 3, 4].forEach((p, i) => setTimeout(() => { if (this.on && tok === this.preTok) this.shotsFor(p); }, 700 + i * 260));
  },
  close() {
    if (!this.on) return; this.on = false;
    const s = this.saved, pu = post.u; if (!s) return;
    pu.uVignette.value = s.vig; pu.uTilt.value = s.tilt; pu.uTiltC.value = s.tiltC; pu.uTiltW.value = s.tiltW; pu.uGrain.value = s.grain; pu.uBloomMix.value = s.mix;
    U.uNightAmt.value = s.nA; U.uNightR.value = s.nR; U.uNightRim.value = s.nRim; U.uNightC.value.copy(s.nC); U.uFogNear.value = s.fogN; U.uFogFar.value = s.fogF;
    renderer.shadowMap.needsUpdate = true;
  },
  setPage(p, keep = false) {
    this.page = p; this.t = 0; this.meter = 1; this.ecl = 0; this.night = 0; this.nightR = 0; this.chip = -1; this.birdsN = 0; this.stars = 0; this.cosI = -1; this.userT = 0; this.dragging = false;
    this.z.setCostume(p === 4 ? '' : Save.data.costume || ''); this.z.setSkin(Save.data.skin || 0); this.z.g.visible = true; this.z.g.scale.setScalar(1);
    for (const d of this.dropsD) { d.state = 0; d.hp = 1; } for (const it of this.dv.items) { it.g.visible = p === 1; it.g.scale.setScalar(1); }
    for (const b of this.bd) b.st = 0; this.birds.count = 0; this.shade.visible = false; this.shK = 0;
    if (!keep) this.shots = this.shotsFor(p);
  },
  userDrag(du) { if (this.page !== 0) return; if (this.userT <= 0) this.uUser = this.u; this.uUser = clamp(this.uUser + du, 0.02, 0.98); this.userT = 3.5; this.dragging = true; },
  userUp() { this.dragging = false; },
  // ---- sayfa senaryoları ----
  update(dt) {
    if (!this.on) return;
    this.t += dt; const T = this.t, lv = this.lv, S = this.spot, P = {};
    let x = S.x, z = S.z, yaw = this.shots[0].yaw + 0.45, moving = false, dive = 0, hold = false, mood = 0, shield = false, y = 0, chip = -1, uT = S.uS;
    const ease = (a, b, t0, d) => lerp(a, b, Ease.inOutSine(clamp01((T - t0) / d)));
    if (this.page === 0 && this.userT > 0) {
      // oyuncu kendisi deniyor: güneş parmağı izler; bırakınca birkaç saniye sonra gösteri baştan sürer
      if (!this.dragging) { this.userT -= dt; if (this.userT <= 0) this.t = 0; }
      uT = this.uUser; this.hand = -1; chip = 0;
    } else if (this.page === 0) {
      // güneşi çevir: gölgeden aydınlığa ve geri; parmak ekranda kayar
      const L = 10; const t = T % L; this.loopT = t;
      uT = t < 1.2 ? S.uS : t < 2.8 ? lerp(S.uS, S.uL, Ease.inOutSine((t - 1.2) / 1.6)) : t < 5.2 ? S.uL : t < 6.8 ? lerp(S.uL, S.uS, Ease.inOutSine((t - 5.2) / 1.6)) : S.uS;
      this.hand = t > 1.0 && t < 7.0 ? (t < 2.8 ? (t - 1.2) / 1.6 : t < 5.2 ? 1 : 1 - (t - 5.2) / 1.6) : -1; chip = this.hand >= 0 ? 0 : -1;
      if (Math.abs(T % L) < dt) this.meter = 1;
    } else if (this.page === 1) {
      // kapıya yürü: damlaları topla, kapıya gir, gece kapıdan yayılır, üç yıldız
      const W = this.walk, Lw = (W.s1 - W.s0) / (lv.speed || 1.1), cyc = Lw + 5.5, t = T % cyc;
      if (t < dt && T > dt) this.setPage(1, true);
      const k = clamp01(t / Lw), s = lerp(W.s0, W.s1, k), fi = k * W.N, i0 = Math.floor(fi), i1 = Math.min(W.N, i0 + 1);
      uT = lerp(W.u[i0], W.u[i1], fi - i0); pathAt(lv.path, s, P); x = P.x; z = P.z; yaw = Math.atan2(P.tx, P.tz); moving = k < 1;
      for (const d of this.dropsD) if (!d.state && Math.hypot(d.x - x, d.z - z) < 0.45) { d.state = 1; audio.drop ? audio.drop() : audio.chime(); for (let q = 0; q < 14; q++) { const a = Math.random() * TAU; this.fxA.spawn(d.x, 0.35, d.z, Math.cos(a) * 1.4, 0.6 + Math.random() * 1.4, Math.sin(a) * 1.4, { c: [0.8, 0.6, 2.4], a: 1, s: 0.1, s1: 0.02, life: 0.6, drag: 2 }); } }
      if (k >= 1) {
        const g = t - Lw; mood = 1;
        this.z.g.scale.setScalar(Math.max(0.001, 1 - Ease.inCubic(clamp01(g / 0.5)))); // kapıya girer
        this.night = Ease.inOutSine(clamp01((g - 0.3) / 2.2)); this.nightR = Ease.inOutCubic(clamp01((g - 0.3) / 2.4)) * 30;
        this.stars = g > 3.2 ? 3 : g > 2.6 ? 2 : g > 2.0 ? 1 : 0; chip = this.stars - 1;
      } else this.z.g.scale.setScalar(1);
    } else if (this.page === 2) {
      // yetenekler: Dal (mürekkebe gömül), Bekle (dur, ayağını vur), Tutulma (güneşi karart)
      const t = T % 12, ph = Math.floor(t / 4), u4 = t - ph * 4; chip = ph;
      uT = u4 < 0.6 ? lerp(S.uS, S.uL, u4 / 0.6) : u4 < 3.3 ? S.uL : lerp(S.uL, S.uS, Math.min(1, (u4 - 3.3) / 0.6));
      if (u4 < 0.05) this.meter = 1;
      if (ph === 0) { dive = clamp01((u4 - 0.55) / 0.15) * (1 - clamp01((u4 - 3.1) / 0.2)); if (u4 > 0.55 && u4 < 0.62) for (let q = 0; q < 10; q++) { const a = Math.random() * TAU; this.fx.spawn(x + Math.cos(a) * 0.4, 0.06, z + Math.sin(a) * 0.4, Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8, { c: [0.05, 0.03, 0.1], a: 0.7, s: 0.25, s1: 0.5, life: 0.7, drag: 2 }); } }
      else if (ph === 1) { uT = S.uS; hold = true; mood = 0; }
      else { this.ecl = clamp01((u4 - 0.5) / 0.4) * (1 - clamp01((u4 - 3.1) / 0.5)); }
    } else if (this.page === 3) {
      // Gölge Kuşları: gölgede kuşlar katılır, dört olunca Sürü: kanatlarıyla kubbe olurlar
      const t = T % 11; if (t < dt) { for (const b of this.bd) b.st = 0; this.meter = 1; }
      uT = t < 6.2 ? S.uS : t < 7 ? lerp(S.uS, S.uL, (t - 6.2) / 0.8) : t < 9.8 ? S.uL : lerp(S.uL, S.uS, Math.min(1, (t - 9.8) / 0.8));
      this.birdsN = 0;
      this.bd.forEach((b, i) => {
        if (i > 3) return;
        const tj = 0.6 + i * 0.95;
        if (t > tj && t < 10 && b.st === 0) {
          // oyundaki gibi: uzaktan süzülüp gelir, Zifir'in çevresinde döner
          const ys = this.shots[0].yaw, a0 = Math.atan2(Math.cos(ys), Math.sin(ys)) + PI + [-1.1, 0.9, -0.5, 1.4][i];
          b.st = 1; b.t = 0; b.p.set(x + Math.cos(a0) * 9, 5 + i * 0.6, z + Math.sin(a0) * 9); b.v.set(-Math.cos(a0) * 4, -1, -Math.sin(a0) * 4);
          b.a = a0 + PI; b.r = 0.85 + (i % 2) * 0.45; b.h = 1.35 + i * 0.18; b.w = (i % 2 ? -1 : 1) * (1.0 + i * 0.15);
          audio.shadowBird && audio.shadowBird(i + 1);
        }
        if (b.st && b.st !== 3 && b.t > 1.1) this.birdsN++;
      });
      shield = t > 5.4 && t < 10; chip = t > 4.6 && t < 10 ? 1 : this.birdsN > 0 ? 0 : -1;
      if (t > 5.4 && t - dt <= 5.4) { audio.flockOn && audio.flockOn(4); this.z.kick(-1.6); }
      if (t > 10 && t - dt <= 10) { for (const b of this.bd) if (b.st) { b.st = 3; b.t = 0; const a = Math.atan2(b.p.z - z, b.p.x - x); b.v.set(Math.cos(a) * 3.5, 2.2, Math.sin(a) * 3.5); } audio.shadowFlee && audio.shadowFlee(); }
    } else {
      // dahası: Zifir kostümlerini sırayla giyip dans eder
      const t = T % 14, ci = Math.floor(t / 1.75) % 8; x = this.show.x; z = this.show.z;
      if (ci !== this.cosI) { this.cosI = ci; const keys = ['', ...COSTUMES.map((c) => c.key)], key = keys[ci % keys.length]; this.z.setCostume(key); this.z.kick(-3); if (T > 0.2) for (let q = 0; q < 12; q++) { const a = Math.random() * TAU; this.fxA.spawn(x, 0.7, z, Math.cos(a) * 1.6, 1 + Math.random() * 1.6, Math.sin(a) * 1.6, { c: [2.2, 1.7, 1.0], a: 1, s: 0.09, s1: 0.02, life: 0.7, drag: 1.8, g: -2 }); } }
      const k = (t % 1.75) / 1.75; y = Math.sin(clamp01(k / 0.4) * PI) * 0.28; yaw = this.shots[0].yaw + 0.25 + TAU * Ease.inOutCubic(clamp01(k / 0.5)); mood = 1;
      uT = S.uS; chip = Math.floor(t / 3.5) % 4;
    }
    this.u = damp(this.u, uT, this.dragging ? 22 : 9, dt); this.chip = chip;
    // ışık: oyundaki gibi (gölge düşüren cisimlerle), tutulmada ve kubbede güvende
    const litNow = this.page !== 4 && this.page !== 1 ? this.litAt(x, z, this.u) : this.page === 1 ? this.litAt(x, z, this.u) : false;
    const burn = litNow && !shield && this.ecl < 0.5 ? (dive > 0.5 ? 0.25 : 1) : 0;
    this.meter = clamp(this.meter + (burn ? -(dive > 0.5 ? 0.05 : 0.3) : 0.45) * dt, 0.18, 1);
    if (burn && Math.random() < dt * (dive > 0.5 ? 5 : 26)) { const a = Math.random() * TAU; this.fx.spawn(x + Math.cos(a) * 0.15, 0.6, z + Math.sin(a) * 0.15, (Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.7, (Math.random() - 0.5) * 0.4, { c: [0.05, 0.04, 0.07], a: 0.5, s: 0.2, s1: 0.6, life: 1.2, drag: 1.2 }); if (Math.random() < 0.4) this.fxA.spawn(x, 0.55, z, (Math.random() - 0.5) * 1.4, 1.2 + Math.random() * 1.4, (Math.random() - 0.5) * 1.4, { c: [3, 1.1, 0.25], a: 1, s: 0.08, s1: 0.03, life: 0.6, drag: 1.4, g: -1.2 }); }
    this.z.update(dt, { x, z, y, yaw, moving, speed: lv.speed || 1.1, burn, meter: this.meter, look: tutCam.position, mood, dive, hold });
    this.updateBirds(dt, x, z, shield);
    this.dv.update(dt, U.uTime.value); this.view.update(dt, T, TUT_CTX); this.fx.update(dt); this.fxA.update(dt);
    this.updateCam(dt);
  },
  // Gölge Kuşları: oyundaki uçuş (hız yönlendirmesi, yatış, kanat çırpma) ve kubbe
  updateBirds(dt, x, z, shield) {
    const t = U.uTime.value; let n = 0;
    for (const b of this.bd) {
      if (!b.st) continue;
      b.t += dt;
      if (b.st === 3) { b.v.y += 2.5 * dt; b.v.multiplyScalar(1 + dt * 0.6); b.amp = 1.1; if (b.t > 2.4) { b.st = 0; continue; } }
      else if (shield) {
        b.a += 4.4 * dt;
        const rr = 0.8 + 0.12 * Math.sin(b.ph0 * 3.1), tx = x + Math.cos(b.a) * rr, ty = 1.3 + Math.sin(t * 7 + b.ph0) * 0.09, tz = z + Math.sin(b.a) * rr, k = 1 - Math.exp(-14 * dt);
        b.v.x += (clamp((tx - b.p.x) * 14, -22, 22) - b.v.x) * k; b.v.y += (clamp((ty - b.p.y) * 14, -22, 22) - b.v.y) * k; b.v.z += (clamp((tz - b.p.z) * 14, -22, 22) - b.v.z) * k; b.amp = 1.25;
      } else {
        b.a += b.w * dt;
        const tx = x + Math.cos(b.a) * b.r, ty = b.h + Math.sin(t * 1.3 + b.ph0) * 0.12, tz = z + Math.sin(b.a) * b.r * 0.8;
        const dx = tx - b.p.x, dy = ty - b.p.y, dz = tz - b.p.z, d = Math.hypot(dx, dy, dz) || 1e-4, sp = Math.min(b.t < 1.5 ? 7.5 : 5, d * 3.2), k = 1 - Math.exp(-(b.t < 1.5 ? 3.2 : 5) * dt);
        b.v.x += ((dx / d) * sp - b.v.x) * k; b.v.y += ((dy / d) * sp - b.v.y) * k; b.v.z += ((dz / d) * sp - b.v.z) * k;
        b.amp = damp(b.amp, b.t < 1.5 || b.v.y > 0.6 ? 1.0 : 0.38 + 0.25 * Math.max(0, Math.sin(t * 0.7 + b.ph0)), 4, dt);
      }
      b.p.addScaledVector(b.v, dt);
      const hs = Math.hypot(b.v.x, b.v.z);
      if (hs > 0.05) { let dy = Math.atan2(b.v.x, b.v.z) - b.yaw; while (dy > PI) dy -= TAU; while (dy < -PI) dy += TAU; b.yaw += dy * (1 - Math.exp(-8 * dt)); b.roll = damp(b.roll, clamp(-dy * 2.5, -0.7, 0.7), 6, dt); }
      b.ph += dt * (7 + b.amp * 7);
      _te.set(clamp(-b.v.y * 0.12, -0.5, 0.5), b.yaw, b.roll, 'YXZ'); _tq.setFromEuler(_te);
      _tm.compose(b.p, _tq, _ts.setScalar((shield ? 1.4 : 1) * Math.min(1, b.t * 2) * 1.5)); this.birds.setMatrixAt(n, _tm);
      this.flap.setXY(n, b.ph, b.amp); n++;
    }
    this.birds.count = n; this.birds.instanceMatrix.needsUpdate = true; this.flap.needsUpdate = true;
    this.shK = damp(this.shK, shield ? 1 : 0, shield ? 10 : 5, dt);
    ShadowBirds.mesh.material.uniforms.uGlow.value = this.shK;
    const sh = this.shade; sh.visible = this.shK > 0.01;
    if (sh.visible) { sh.position.set(x, 0.04, z); sh.scale.setScalar(3.2 * (0.94 + 0.06 * Math.sin(t * 9))); sh.material.opacity = 0.78 * this.shK; }
  },
  // ---- kadraj: konu (ve gerekiyorsa güneş) yazı kartının üstündeki pencereye sığar; önüne engel girmeyen açı seçilir ----
  shotsFor(p) { return p === 2 ? [this.shotFor('2n'), this.shotFor('2w')] : [this.shotFor(String(p))]; },
  sway(key) { return key === '4' ? 0.12 : 0.06; },
  shotFor(key, S = this.spot, quick = false) {
    this.W = this.win(); const ck = key + ':' + (innerWidth / innerHeight).toFixed(2) + ':' + Math.round(this.W.y0 * 20) + ':' + Math.round(this.W.x1 * 20); if (!quick && this.cache[ck]) return this.cache[ck];
    const lv = this.lv, P = {}, pts = [];
    const V = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));
    const box = (x, z, r, h) => { for (const dx of [-r, r]) for (const dz of [-r, r]) { V(x + dx, 0, z + dz); V(x + dx, h, z + dz); } };
    const orbAt = (u, r) => { orbPosInto(u, lv.sun.tilt, lv.sun.thMin, _tv); V(_tv.x, _tv.y + r, _tv.z); V(_tv.x, _tv.y - r, _tv.z); V(_tv.x - r, _tv.y, _tv.z); V(_tv.x + r, _tv.y, _tv.z); };
    let pitch, probes = [[S.x, S.z]], range = 7, step = 0.12;
    if (key === '0') { pitch = deg(16); box(S.x, S.z, 0.8, 1.2); orbAt(S.uS, 0.9); orbAt(S.uL, 0.9); }
    else if (key === '1') { pitch = deg(44); probes = []; const W = this.walk; for (let s = W.s0; s <= W.s1 + 0.01; s += 1.6) { pathAt(lv.path, s, P); probes.push([P.x, P.z]); } for (let s = W.s0; s <= W.s1 + 0.01; s += 0.8) { pathAt(lv.path, s, P); box(P.x, P.z, 0.7, 1.2); } box(lv.gate.x, lv.gate.z, 1.3, 2.8); }
    else if (key === '2n') { pitch = deg(26); box(S.x, S.z, 1.4, 1.6); range = 15; step = 0.21; }
    else if (key === '2w') { pitch = deg(14); box(S.x, S.z, 0.9, 1.3); orbAt(S.uL, 1.6); }
    else if (key === '3') { pitch = deg(26); box(S.x, S.z, 1.7, 2.2); range = 15; step = 0.21; }
    else { const W = this.show; probes = [[W.x, W.z]]; pitch = deg(10); box(W.x, W.z, 0.75, 1.6); range = 6; step = 0.1; }
    const bb = new THREE.Box3().setFromPoints(pts), tgt = bb.getCenter(new THREE.Vector3());
    // önü açık açı: ışın adanın gövdelerine çarpmasın; sonra en yakın ve oyundaki yöne en yakın olanı (kabadan inceye)
    const one = probes.length === 1, sw = this.sway(key);
    const evalYaw = (yaw, full) => {
      const D = this.fit(pts, yaw, pitch, tgt); let c = Math.abs(yaw) * 1.6 + D * 0.04;
      // kompozisyon: Zifir kenara kaçmasın (fit kamerayı bu açıya koydu)
      if (one) { _tv.set(probes[0][0], 0.6, probes[0][1]).project(tutCam); const W = this.W, cx = (W.x0 + W.x1) / 2, hw = (W.x1 - W.x0) / 2; c += Math.max(0, Math.abs(_tv.x - cx) - hw * 0.4) * 6; }
      for (const [px, pz] of probes) c += (this.blocked(px, pz, yaw, pitch, D * 0.92, one) + (full && one ? this.blocked(px, pz, yaw - sw, pitch, D * 0.92, true) + this.blocked(px, pz, yaw + sw, pitch, D * 0.92, true) : 0)) * 6;
      return { c, yaw, D };
    };
    const coarse = []; for (let k = -range; k <= range; k += quick ? 3 : 2) coarse.push(evalYaw(k * step, false));
    coarse.sort((p, q) => p.c - q.c);
    let best = coarse[0];
    if (!quick) { best = null; for (const c0 of coarse.slice(0, 3)) for (const dy of [-step, 0, step]) { const r = evalYaw(c0.yaw + dy, true); if (!best || r.c < best.c) best = r; } }
    const r = { pitch, yaw: best.yaw, tgt, D: best.D, c: best.c }; if (!quick) this.cache[ck] = r; return r;
  },
  // görünür pencere (NDC): yazı kartının ve üst çubuğun dışında kalan bölge, kartın gerçek yerinden ölçülür
  win() {
    const w = innerWidth, h = innerHeight, port = w / h < 1.05, el = document.querySelector('#tCard .tc'), r = el && el.getBoundingClientRect(), top = 1 - (2 * 70) / h;
    if (port) return { x0: -0.86, x1: 0.86, y0: clamp(1 - (2 * ((r && r.height ? r.top : h * 0.66) - 16)) / h, -0.5, 0.3), y1: top };
    return { x0: -0.9, x1: clamp((2 * ((r && r.width ? r.left : w * 0.56) - 24)) / w - 1, -0.3, 0.3), y0: -0.82, y1: top };
  },
  fit(pts, yaw, pitch, tgt) {
    const { x0, x1, y0, y1 } = this.W;
    let lo = 1.5, hi = 140; const cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let it = 0; it < 20; it++) {
      const D = (lo + hi) / 2; tutCam.position.set(tgt.x + Math.sin(yaw) * cp * D, tgt.y + sp * D, tgt.z + Math.cos(yaw) * cp * D); tutCam.lookAt(tgt); tutCam.updateMatrixWorld();
      let ok = true; for (const p of pts) { _tv.copy(p).project(tutCam); if (_tv.z > 1 || _tv.x < x0 || _tv.x > x1 || _tv.y < y0 || _tv.y > y1) { ok = false; break; } }
      if (ok) hi = D; else lo = D;
    }
    return hi;
  },
  // kamera: kadraja yumuşakça kayar, hafifçe nefes alır
  updateCam(dt) {
    const pg = this.page, sh = pg === 2 && this.chip === 2 ? this.shots[1] : this.shots[0], t = U.uTime.value;
    const yaw = sh.yaw + Math.sin(t * 0.13) * this.sway(String(pg)), D = sh.D * (1 + Math.sin(t * 0.09) * 0.02), cp = Math.cos(sh.pitch);
    _tv.set(sh.tgt.x + Math.sin(yaw) * cp * D, sh.tgt.y + Math.sin(sh.pitch) * D, sh.tgt.z + Math.cos(yaw) * cp * D);
    if (!this.cam.ok) { this.cam.p.copy(_tv); this.cam.t.copy(sh.tgt); this.cam.ok = true; }
    const k = 1 - Math.exp(-2.4 * dt); this.cam.p.lerp(_tv, k); this.cam.t.lerp(sh.tgt, k);
    tutCam.position.copy(this.cam.p); tutCam.lookAt(this.cam.t);
  },
  resize(w, h) {
    const a = w / h, port = a < 1.05; tutCam.aspect = a; tutCam.fov = port ? 44 : 34;
    // konu: dikeyde ekranın üst yarısında, yatayda sol tarafta (yazı kartı altta/sağda)
    if (port) tutCam.setViewOffset(w, h, 0, h * 0.15, w, h); else tutCam.setViewOffset(w, h, w * 0.2, 0, w, h);
    tutCam.updateProjectionMatrix();
    if (this.inited && this.shots) this.shots = this.shotsFor(this.page);
  },
  // ---- ışık, gök ve son işlem (oyundaki applyLighting'in aynısı, bu sahne için) ----
  apply(dt) {
    const lv = this.lv, L1 = this.L1; sunDirs(this.u, lv.sun, L1, this.L2);
    const e = Math.asin(clamp(L1.y, 0, 1)), eMax = PI / 2 - lv.sun.tilt, k = smoothstep(0.08, 0.92, Math.sin(e) / Math.sin(eMax)), sc = skyColors(lv.chap.pal, k, this.sc);
    const tod = todOf(lv); sc.zen.r *= tod.zen[0]; sc.zen.g *= tod.zen[1]; sc.zen.b *= tod.zen[2]; sc.hor.r *= tod.hor[0]; sc.hor.g *= tod.hor[1]; sc.hor.b *= tod.hor[2]; sc.sun.r *= tod.sun[0]; sc.sun.g *= tod.sun[1]; sc.sun.b *= tod.sun[2];
    const night = this.night, ecl = this.ecl;
    skyU.uZen.value.copy(sc.zen).lerp(NIGHT.zen, Math.max(night, ecl * 0.75)); skyU.uHor.value.copy(sc.hor).lerp(NIGHT.hor, Math.max(night, ecl * 0.85)); skyU.uBelow.value.copy(sc.below).lerp(NIGHT.below, Math.max(night * 0.9, ecl * 0.85));
    skyU.uSunDir.value.copy(L1); skyU.uSunCol.value.copy(sc.sun); skyU.uTwin.value = 0; skyU.uStars.value = Math.max(night, ecl * 0.85); skyU.uEclipse.value = ecl; skyU.uNight.value = night; skyU.uAurora.value = 0;
    const nE = Math.max(night, ecl * 0.8);
    seaU.uIslK.value = 1; seaU.uLit.value.copy(sc.below).multiplyScalar(1.12).lerp(NIGHT.sea, nE * 0.6); seaU.uDeep.value.copy(sc.deep).lerp(NIGHT.sea, nE);
    U.uFogCol.value.copy(skyU.uHor.value); U.uBelowCol.value.copy(skyU.uBelow.value); U.uFogNear.value = 70; U.uFogFar.value = 340;
    // gece kapıdan yayılır
    U.uNightAmt.value = night > 0 ? 1 : ecl * 0.72; U.uNightR.value = night > 0 ? this.nightR + 0.01 : 999; U.uNightC.value.set(lv.gate.x, lv.gate.z); U.uNightRim.value = night > 0 ? Math.sin(clamp01(this.nightR / 30) * PI) : 0;
    const LK = lv.chap.light || { sun: 1, hemi: 1 };
    this.sun.position.copy(L1).multiplyScalar(60); this.sun.target.position.set(0, 0, 0); this.sun.color.copy(sc.sun);
    this.sun.intensity = 3.9 * LK.sun * lerp(0.7, 1, smoothstep(0.05, 0.5, Math.sin(e))) * (1 - ecl * 0.94) * (1 - night * 0.85);
    this.sun.castShadow = Perf.level >= 1;
    this.hemi.color.copy(sc.hemiS).lerp(_tc.set('#3a4a9a'), Math.max(ecl, night) * 0.7); this.hemi.groundColor.copy(sc.hemiG).lerp(_tc.set('#1a1830'), Math.max(ecl, night) * 0.7);
    this.hemi.intensity = lerp(0.62, 0.85, k) * LK.hemi * (1 - Math.max(ecl * 0.55, night * 0.5)) * IBLK.hemi;
    this.probe.sh.copy(envProbe.sh); this.probe.intensity = 1 - night * 0.6;
    // güneş küresi ve yay
    const o = this.orb; orbPosInto(this.u, lv.sun.tilt, lv.sun.thMin, o.g.position);
    o.u.uCol.value.copy(sc.sun).lerp(_tc.set('#fff4dc'), 0.4); o.halo.material.color.copy(sc.sun).multiplyScalar((1 - ecl * 0.9) * (1 - night));
    o.rays.material.color.copy(sc.sun).multiplyScalar(0.75 * (1 - ecl) * (1 - night)); o.rays.material.rotation += dt * 0.05;
    o.u.uEclipse.value = Math.max(ecl * 0.97, night); o.moon.visible = ecl > 0.01; o.moon.position.set((1 - ecl) * 1.3, (1 - ecl) * 0.4, 0.2); o.moon.quaternion.copy(tutCam.quaternion);
    o.corona.material.opacity = ecl * 0.95; o.crown.quaternion.copy(tutCam.quaternion); o.crownU.uCol.value.copy(sc.sun).multiplyScalar(1.5); o.crownU.uK.value = (1 - ecl) * (1 - night) * (this.chip === 0 && this.page === 0 ? 1.35 : 1);
    o.g.scale.setScalar(lerp(1, 0.6, night));
    this.arc.glowU.uSun.value = this.u; this.arc.glowU.uNight.value = night; this.arc.glowU.uOn.value = damp(this.arc.glowU.uOn.value, this.page === 0 && (this.hand >= 0 || this.dragging) ? 1 : 0, 6, dt);
    this.z.u.uSunDir.value.copy(L1); this.z.u.uSunCol.value.copy(sc.sun);
    // son işlem
    const pu = post.u; _tv.copy(o.g.position).project(tutCam);
    pu.uSunUV.value.set(_tv.x * 0.5 + 0.5, _tv.y * 0.5 + 0.5); pu.uSunVis.value = (_tv.z < 1 ? 1 : 0) * (1 - ecl) * (1 - night) * smoothstep(1.25, 0.9, Math.max(Math.abs(_tv.x), Math.abs(_tv.y)));
    pu.uFlareCol.value.copy(sc.sun).multiplyScalar(0.8); post.rays.uniforms.uSun.value.copy(pu.uSunUV.value); post.rays.uniforms.uSun2On.value = 0;
    const g = lv.chap.pal.grade; pu.uLift.value.set(g.lift[0] + tod.lift[0], g.lift[1] + tod.lift[1], g.lift[2] + tod.lift[2]); pu.uGamma.value.set(...g.gamma); pu.uGain.value.set(g.gain[0] * tod.gain[0], g.gain[1] * tod.gain[1], g.gain[2] * tod.gain[2]); pu.uSat.value = g.sat; pu.uContrast.value = g.contrast;
    pu.uExposure.value = 1.0 - ecl * 0.06 + night * 0.15; pu.uNight.value = night; pu.uBloomAdd.value = 0.35 + night * 0.4 + ecl * 0.3; pu.uBloomMix.value = 0.045;
    pu.uRays.value = 0.5 * (1 - night) * (1 - ecl); pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0; pu.uFlash.value = 0;
    pu.uVignette.value = 0.6; pu.uTilt.value = 0.55; pu.uTiltC.value = 0.62; pu.uTiltW.value = 0.24; pu.uGrain.value = 0.03;
    U.uCamPos.value.copy(tutCam.position);
    const px = renderer.domElement.height / (2 * Math.tan(deg(tutCam.fov / 2))); this.fx.u.uPx.value = this.fxA.u.uPx.value = px;
    renderer.shadowMap.needsUpdate = true;
  },
};
