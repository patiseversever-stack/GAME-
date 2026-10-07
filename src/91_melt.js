/* =====================================================================
   ZİFİR'İN ERİYİŞİ: yanınca sinematik ölüm sahnesi
   Kamera önüne hiçbir şeyin geçmediği alçak bir açı seçer (yapılar,
   ağaçlar, bulutlar, balonlar, güneş küresi için görüş hattı sınanır;
   sahne sürerken araya giren bulut/balon saydamlaşır) ve yavaşça süzülür.
   Zifir korkuyla gözlerini açar, çöker, jel gibi yayılır; gövdesinden
   damla damla kopan jel taneleri uçar, yere yapışıp jöle gibi titrer ve
   buharlaşır. En sonda tek bir ışık yükselir. Damlalar tek bir çizim
   çağrısıdır (InstancedMesh); dokununca sahne atlanır.
   ===================================================================== */
const MELT_VERT = `attribute float aHeat; varying vec3 vN; varying vec3 vV; varying float vHeat;
void main(){ mat4 m = modelMatrix * instanceMatrix; vec4 w = m * vec4(position, 1.0); vN = normalize(transpose(inverse(mat3(m))) * normal); vV = normalize(cameraPosition - w.xyz); vHeat = aHeat; gl_Position = projectionMatrix * viewMatrix * w; }`;
const MELT_FRAG = `uniform vec3 uRim, uSunDir, uSunCol; varying vec3 vN; varying vec3 vV; varying float vHeat;
void main(){
  vec3 N = normalize(vN), V = normalize(vV); float fr = pow(1.0 - max(dot(N, V), 0.0), 2.2);
  vec3 col = vec3(0.012, 0.009, 0.022) + uRim * fr * 0.85 + uRim * 0.06 * (1.0 - fr);
  vec3 H = normalize(uSunDir + V); col += uSunCol * pow(max(dot(N, H), 0.0), 90.0) * 2.6;
  vec3 H2 = normalize(V + vec3(0.25, 0.9, 0.15)); col += vec3(0.95, 0.92, 1.0) * pow(max(dot(N, H2), 0.0), 140.0) * 1.7;
  col += vec3(3.0, 0.95, 0.22) * vHeat * vHeat * (0.12 + fr * 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;
const _mq = new THREE.Quaternion(), _ms = new THREE.Vector3(), _mm = new THREE.Matrix4(), _mv = new THREE.Vector3(), _mUp = new THREE.Vector3(0, 1, 0);
const Melt = {
  active: false, t: 0, n: 0, streak: 0, key: '',
  init() {
    const lv = Perf.level | 0; this.max = [16, 24, 32, 40][lv] || 24;
    const geo = new THREE.IcosahedronGeometry(1, lv >= 2 ? 3 : 2);
    this.heat = new THREE.InstancedBufferAttribute(new Float32Array(this.max), 1); this.heat.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aHeat', this.heat);
    this.mat = new THREE.ShaderMaterial({ vertexShader: MELT_VERT, fragmentShader: MELT_FRAG, uniforms: { uRim: zifir.u.uRim, uSunDir: zifir.u.uSunDir, uSunCol: zifir.u.uSunCol } });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, this.max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; scene.add(this.mesh);
    this.drops = Array.from({ length: this.max }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0, st: 0, t: 0, w: 0, wv: 0, hz: 1, life: 1, b: 0 }));
    this.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(1.6, 1.1, 3.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    this.spark.visible = false; this.spark.renderOrder = 9; scene.add(this.spark);
  },
  start() {
    if (!this.mesh) this.init();
    const lv = G.lv, sp = lv.spec, key = `${sp.kind}:${sp.g ?? ''}:${sp.seed ?? ''}`;
    // aynı adada art arda ölünce sahne biraz hızlanır (oyunun ritmi bozulmasın)
    this.streak = this.key === key ? this.streak + 1 : 1; this.key = key; this.ts = this.streak > 3 ? 0.72 : 1;
    this.active = true; this.t = 0; this.n = 0; this.emitted = 0; this.sparkT = -1; this.cardT = 2.3 * this.ts; this.skipped = false;
    this.x = zifir.g.position.x; this.z = zifir.g.position.z; this.yaw = zifir.yaw;
    zifir.M = { sag: 0, diss: 0, puff: 0, eyes: 1, boil: 0.5, shiver: 0.02, pool: 0 };
    this.mesh.count = 0; for (const d of this.drops) d.st = 0;
    const shot = this.chooseShot(lv);
    Cam.cine = null; Cam.death = { t: 0, from: { target: Cam.cur.target.clone(), dist: Cam.cur.dist, pitch: Cam.cur.pitch, yaw: Cam.cur.yaw, fov: Cam.cur.fov }, to: shot, inT: 1.05 * this.ts, ty: 0.42 };
    $('#cbTitle').textContent = ''; $('#cbSub').textContent = ''; $('#cineBars').classList.add('on'); document.body.classList.add('cine');
    // kostüm başından düşer, yere konar
    this.cos = null;
    if (zifir.cos) { const g = zifir.cos.g; scene.attach(g); const a = Math.random() * TAU; this.cos = { g, v: new THREE.Vector3(Math.cos(a) * 0.9, 2.6, Math.sin(a) * 0.9), w: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6), rest: false }; }
    this.fades = G.view && G.view.moverViews ? G.view.moverViews.map((mv) => ({ mv, f: 1, r: this.moverRadius(mv) })) : [];
    audio.meltStart();
  },
  moverRadius(mv) { let r = 1.5; mv.v.traverse((o) => { if (o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); r = Math.max(r, o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y)); } }); return r * 1.1; },
  // görüş hattı açık mı: hedef noktadan kameraya (ve biraz arkasına) kadar hiçbir gölge düşüren cisim kesmesin
  clear(cols, ax, ay, az, bx, by, bz) {
    let dx = bx - ax, dy = by - ay, dz = bz - az; const D = Math.hypot(dx, dy, dz) || 1; dx /= D; dy /= D; dz /= D;
    for (let i = 0; i < cols.length; i++) { const c = cols[i], tc = (c.bx - ax) * dx + (c.by - ay) * dy + (c.bz - az) * dz; if (tc - c.br > D + 0.6) continue; if (rayHit(c, ax, ay, az, dx, dy, dz)) return false; }
    for (const o of [orb, orb2]) { if (!o.g.visible) continue; const p = o.g.position, tc = (p.x - ax) * dx + (p.y - ay) * dy + (p.z - az) * dz; if (tc < 0 || tc > D + 0.6) continue; const qx = ax + dx * tc - p.x, qy = ay + dy * tc - p.y, qz = az + dz * tc - p.z; if (qx * qx + qy * qy + qz * qz < 0.8 * 0.8) return false; }
    return true;
  },
  // sahnedeki nesnelerin kaba vekilleri: dikey silindirler (ağaç, ev, kule…), kemerlerin direkleri ve çatısı
  proxies(lv) {
    const cyl = [], boxes = [];
    for (const pr of lv.props || []) {
      if (pr.p && pr.p.w && pr.p.roof !== undefined && pr.arch) {
        const P = pr.p, cs = Math.cos(pr.yaw), sn = Math.sin(pr.yaw);
        for (const [lx, lz] of [[-P.w / 2, -P.l / 2], [P.w / 2, -P.l / 2], [-P.w / 2, P.l / 2], [P.w / 2, P.l / 2]]) cyl.push([pr.x + cs * lx + sn * lz, pr.z - sn * lx + cs * lz, (P.post || 0.1) + 0.12, P.h + 0.1]);
        boxes.push({ x: pr.x, z: pr.z, cs, sn, hx: P.w / 2 + 0.15, hz: P.l / 2 + 0.1, y0: P.h - (P.roof || 0.3) - 0.15, y1: P.h + 0.25 });
      } else if ((pr.h || 0) > 0.25) cyl.push([pr.x, pr.z, (pr.fr || 0.6) * 0.8, (pr.h || 1) + 0.15]);
    }
    return { cyl, boxes };
  },
  // a→b doğru parçası (a: Zifir'in yanı, b: kamera) bir vekili kesiyor mu
  segHit(X, ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, A = dx * dx + dz * dz;
    for (const [cx, cz, r, h] of X.cyl) {
      const fx = ax - cx, fz = az - cz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - r * r;
      if (A < 1e-9) continue; const disc = B * B - 4 * A * C; if (disc < 0) continue;
      const q = Math.sqrt(disc); let t0 = (-B - q) / (2 * A), t1 = (-B + q) / (2 * A); t0 = Math.max(t0, 0.06); t1 = Math.min(t1, 1.04); if (t0 > t1) continue;
      const y0 = ay + dy * t0, y1 = ay + dy * t1; if (Math.min(y0, y1) < h && Math.max(y0, y1) > 0) return true;
    }
    for (const bx_ of X.boxes) for (let k = 2; k <= 20; k++) {
      const t = k / 20, px = ax + dx * t - bx_.x, py = ay + dy * t, pz = az + dz * t - bx_.z, lx = bx_.cs * px - bx_.sn * pz, lz = bx_.sn * px + bx_.cs * pz;
      if (Math.abs(lx) < bx_.hx && Math.abs(lz) < bx_.hz && py > bx_.y0 && py < bx_.y1) return true;
    }
    return false;
  },
  // kadrajın tamamı temiz olsun: Zifir'in çevresini kaplayan ışın ızgarası, kamerayla aradaki hiçbir nesneye çarpmasın
  chooseShot(lv) {
    const a = innerWidth / innerHeight, fov = a < 1 ? 44 : 30, th = Math.tan(deg(fov / 2));
    const dist = clamp(Math.max(1.2 / (th * a), 0.95 / (0.84 * th)), 3.6, 8.5), zx = this.x, zz = this.z, cols = lv.cols || [], X = this.proxies(lv);
    const halfW = Math.min(1.5, dist * th * a * 0.9), lat = [-1, -0.5, 0, 0.5, 1].map((k) => k * halfW), hs = [0.05, 0.5, 1.15];
    const sun = new THREE.Vector3(); sunDirs(G.u, lv.sun, sun, _mv);
    // önce en güzel açılar (yarım profil, ~34°, güneş arkada), ilk tamamen temiz kadrajda dur
    const cands = [];
    for (const pd of [28, 34, 42, 52, 64]) for (let i = 0; i < 24; i++) {
      const off = -PI + (i / 24) * TAU, yaw = this.yaw + off, front = Math.min(Math.abs(off - 0.5), Math.abs(off + 0.5)), back = -(Math.sin(yaw) * sun.x + Math.cos(yaw) * sun.z) * 0.3;
      cands.push({ yaw, pitch: deg(pd), pref: -front * 1.4 - Math.abs(pd - 34) * 0.05 + back });
    }
    cands.sort((p, q) => q.pref - p.pref);
    let best = null;
    for (const C of cands) {
      const cp = Math.cos(C.pitch), cx = zx + Math.sin(C.yaw) * cp * dist, cy = 0.42 + Math.sin(C.pitch) * dist, cz = zz + Math.cos(C.yaw) * cp * dist;
      const px = Math.cos(C.yaw), pz = -Math.sin(C.yaw); // görüşe dik yatay eksen
      let vis = 0, tot = 0;
      for (const l of lat) for (const h of hs) {
        const w = l === 0 ? 3 : 1, ox = zx + px * l, oz = zz + pz * l; tot += w;
        if (!this.segHit(X, ox, h, oz, cx, cy, cz) && (Math.abs(l) > 0.6 || this.clear(cols, ox, h + 0.02, oz, cx, cy, cz))) vis += w;
      }
      C.vis = vis / tot; C.score = C.vis * 20 + C.pref;
      if (!best || C.score > best.score) best = C;
      if (C.vis >= 1) break;
    }
    // süzülme yönü: açık kalan tarafa doğru
    let orbit = 0.18;
    const ok = (yy) => { const cp = Math.cos(best.pitch), d2 = dist * 0.85, cx = zx + Math.sin(yy) * cp * d2, cy = 0.42 + Math.sin(best.pitch) * d2, cz = zz + Math.cos(yy) * cp * d2; return !this.segHit(X, zx, 0.4, zz, cx, cy, cz) && this.clear(cols, zx, 0.42, zz, cx, cy, cz); };
    if (!ok(best.yaw + orbit)) orbit = ok(best.yaw - orbit) ? -orbit : 0;
    return { target: new THREE.Vector3(zx, 0.42, zz), dist, pitch: best.pitch, yaw: best.yaw, fov, orbit, vis: +best.vis.toFixed(2) };
  },
  emit() {
    const d = this.drops[this.n++]; this.emitted++;
    const M = zifir.M, a = Math.random() * TAU, R = 0.3 * ZIF_SCALE * (0.75 + M.sag * 1.1), h = 0.6 * ZIF_SCALE * (1 - M.sag * 0.7) * (0.35 + Math.random() * 0.55);
    d.p.set(this.x + Math.cos(a) * R * 0.75, h, this.z + Math.sin(a) * R * 0.75);
    const sp = 0.7 + Math.random() * 1.6, up = 1.5 + Math.random() * 2.3;
    d.v.set(Math.cos(a) * sp, up, Math.sin(a) * sp);
    d.r = 0.035 + Math.random() * Math.random() * 0.075; d.st = 1; d.t = 0; d.w = 0.5; d.wv = 0; d.hz = 1; d.b = 0; d.life = 0.45 + Math.random() * 0.8;
    if (Math.random() < 0.7) audio.meltPlop(d.r);
  },
  skip() { if (!this.active || this.skipped || this.t < 0.25) return; this.skipped = true; this.cardT = Math.min(this.cardT, this.t); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; const T = this.t / this.ts, M = zifir.M; if (!M) return;
    // 1) korku: gözler açılır, gövde kabarır  2) çöküş ve jel gibi yayılma  3) buharlaşma
    M.puff = 0.09 * Math.sin(clamp01(T / 0.32) * PI);
    M.eyes = T < 0.3 ? 1.45 : 0.13;
    M.boil = 0.5 + 1.3 * smoothstep(0.05, 0.5, T) * (1 - M.diss);
    M.sag = Ease.inOutSine(clamp01((T - 0.28) / 1.15));
    M.diss = Math.pow(clamp01((T - 1.42) / 0.8), 1.4);
    M.pool = clamp01((T - 1.9) / 1.4);
    M.shiver = 0.025 * (1 - M.sag * 0.6) * (1 - M.diss);
    // damla damla kopan jel taneleri
    while (this.emitted < this.max && T > 0.4 + 1.1 * Math.pow(this.emitted / this.max, 0.85)) this.emit();
    // buhar ve kor
    const x = this.x, z = this.z, rr = 0.3 * ZIF_SCALE * (1 + M.sag * 1.3);
    if (T > 0.2 && T < 2.4 && Math.random() < dt * (M.diss > 0 ? 34 : 12)) { const a = Math.random() * TAU, q = Math.random() * rr; FX.smoke(x + Math.cos(a) * q, 0.12 + 0.5 * (1 - M.sag), z + Math.sin(a) * q, 0.75); }
    if (M.diss > 0 && M.diss < 1 && Math.random() < dt * 30) { const a = Math.random() * TAU, q = Math.random() * rr; FX.ember(x + Math.cos(a) * q, 0.15, z + Math.sin(a) * q); }
    if (M.diss > 0.05 && !this.hissed) { this.hissed = true; audio.meltHiss(); }
    this.stepDrops(dt);
    this.stepCostume(dt);
    // son kıvılcım: mürekkep gölünden tek bir ışık yükselir, kamera onu izler
    if (T > 1.95 && this.sparkT < 0) { this.sparkT = 0; this.spark.visible = true; this.spark.material.color.copy(zifir.u.uRim.value).multiplyScalar(3.6); audio.meltSpark(); }
    let rise = 0;
    if (this.sparkT >= 0) {
      this.sparkT += dt; const k = clamp01(this.sparkT / 2.6), e = Ease.inOutSine(k);
      rise = e; this.spark.position.set(x + Math.sin(this.sparkT * 2.3) * 0.08, 0.2 + e * 1.9, z + Math.cos(this.sparkT * 1.7) * 0.08);
      const pulse = 0.85 + 0.15 * Math.sin(this.sparkT * 9); this.spark.scale.setScalar(0.75 * pulse * (1 - k * 0.35)); this.spark.material.opacity = Math.min(1, this.sparkT * 3) * (1 - smoothstep(0.75, 1, k));
      if (Math.random() < dt * 14) FX.mote(this.spark.position.x, this.spark.position.y - 0.05, this.spark.position.z, [this.spark.material.color.r * 0.5, this.spark.material.color.g * 0.5, this.spark.material.color.b * 0.5], 0.05);
      if (k >= 1) this.spark.visible = false;
    }
    if (Cam.death) Cam.death.ty = 0.42 - 0.16 * M.sag + 0.45 * rise;
    this.fadeMovers(dt);
  },
  stepDrops(dt) {
    const mesh = this.mesh;
    for (let i = 0; i < this.n; i++) {
      const d = this.drops[i];
      if (d.st === 1) {
        // uçuş: yerçekimi, jöle titreşimi, hız yönünde uzama
        d.t += dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
        d.wv += (-d.w * 260 - d.wv * 8) * dt; d.w += d.wv * dt; d.hz = Math.max(0, d.hz - dt * 1.2);
        if (d.p.y <= d.r * 0.5) {
          d.p.y = d.r * 0.5;
          if (d.b < 1 && d.v.y < -2.4) { d.v.y *= -0.26; d.v.x *= 0.45; d.v.z *= 0.45; d.wv -= 10; d.b++; audio.meltPlop(d.r * 0.7); }
          else { d.st = 2; d.t = 0; d.wv -= 14; d.v.set(0, 0, 0); }
        }
        const sp = d.v.length(), s = Math.min(0.55, sp * 0.07);
        if (sp > 1e-3) _mq.setFromUnitVectors(_mUp, _mv.copy(d.v).multiplyScalar(1 / sp)); else _mq.identity();
        _ms.set(d.r * (1 - s * 0.35 + d.w * 0.22), d.r * (1 + s - d.w * 0.3), d.r * (1 - s * 0.35 + d.w * 0.22));
      } else if (d.st === 2) {
        // yere yapıştı: jöle gibi sallanır, sonra buhar olup küçülür
        d.t += dt; d.wv += (-d.w * 200 - d.wv * 6) * dt; d.w += d.wv * dt; d.hz = Math.max(0, d.hz - dt * 1.2);
        const ev = clamp01((d.t - d.life) / 0.7), k = Math.max(0.001, 1 - ev * ev);
        if (ev > 0 && Math.random() < dt * 9) FX.smoke(d.p.x, 0.04, d.p.z, 0.3);
        _mq.identity(); _ms.set(d.r * (1.75 + d.w * 0.45) * k, d.r * Math.max(0.12, 0.42 - d.w * 0.22) * k, d.r * (1.75 + d.w * 0.45) * k);
        _mv.set(d.p.x, d.r * 0.16 * k, d.p.z);
        if (ev >= 1) d.st = 0;
        _mm.compose(_mv, _mq, _ms); mesh.setMatrixAt(i, _mm); this.heat.array[i] = d.hz; continue;
      } else { _ms.set(0.0001, 0.0001, 0.0001); _mq.identity(); }
      _mm.compose(d.p, _mq, _ms); mesh.setMatrixAt(i, _mm); this.heat.array[i] = d.hz;
    }
    mesh.count = this.n; mesh.instanceMatrix.needsUpdate = true; this.heat.needsUpdate = true;
  },
  stepCostume(dt) {
    const C = this.cos; if (!C || C.rest) return;
    C.v.y -= 9.8 * dt; C.g.position.addScaledVector(C.v, dt); C.g.rotation.x += C.w.x * dt; C.g.rotation.y += C.w.y * dt; C.g.rotation.z += C.w.z * dt;
    if (C.g.position.y < 0.06) { C.g.position.y = 0.06; if (C.v.y < -2) { C.v.y *= -0.3; C.v.x *= 0.5; C.v.z *= 0.5; C.w.multiplyScalar(0.4); audio.meltPlop(0.02); } else C.rest = true; }
  },
  // sahne sürerken kamerayla Zifir arasına giren bulut/balon saydamlaşır
  fadeMovers(dt) {
    if (!this.fades.length) return;
    const c = camera.position, ax = this.x, ay = 0.4, az = this.z, dx = c.x - ax, dy = c.y - ay, dz = c.z - az, L2 = dx * dx + dy * dy + dz * dz || 1;
    for (const F of this.fades) {
      const p = F.mv.v.position, t = clamp01(((p.x - ax) * dx + (p.y - ay) * dy + (p.z - az) * dz) / L2), qx = ax + dx * t - p.x, qy = ay + dy * t - p.y, qz = az + dz * t - p.z;
      const block = qx * qx + qy * qy + qz * qz < F.r * F.r && t > 0.02;
      const f = damp(F.f, block ? 0 : 1, 7, dt); if (Math.abs(f - F.f) < 1e-4 && f === F.f) continue; F.f = f; this.applyFade(F);
    }
  },
  applyFade(F) {
    const v = F.mv.v;
    v.traverse((o) => {
      const m = o.material; if (!m) return;
      if (m.colorWrite === false) { o.visible = F.f > 0.97; return; } // bulutun derinlik ön geçişi
      if (m.userData.op0 === undefined) m.userData.op0 = m.opacity;
      m.opacity = m.userData.op0 * F.f; m.transparent = true;
    });
  },
  end() {
    if (!this.active) return; this.active = false;
    zifir.endMelt(); this.mesh.count = 0; this.spark.visible = false; this.hissed = false;
    for (const F of this.fades) { F.f = 1; this.applyFade(F); } this.fades = [];
    if (this.cos) { scene.remove(this.cos.g); this.cos = null; zifir.setCostume(Save.data.costume || ''); }
    Cam.death = null; this.bars(false);
  },
  bars(on) { $('#cineBars').classList.toggle('on', on); document.body.classList.toggle('cine', on); },
};
