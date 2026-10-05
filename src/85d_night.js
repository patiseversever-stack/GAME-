/* =====================================================================
   GECE PERDESİ — 64 adadan sonra aynı adaların gece hâli
   Güneşin yerinde Ay: aynı yay, aynı gölgeler, aynı çözüm (ada
   değişmez, çözülebilirlik korunur); ama ay ışığı gümüş, gökyüzü
   yıldızlı, evlerin pencereleri yanar, ateşböcekleri dolaşır.
   Fenerler iki koşulla tutuşur: fenerin başına ay ışığı düşmeli,
   Zifir ise yanından gölgede geçmeli (yalnızca böyle bir ay açısı
   bulunan yerlere fener dikilir). Güneş patlamalarının yerini havai
   fişek yağmuru alır: aynı zamanlama, aynı uyarı çubuğu.
   ===================================================================== */
const NIGHT_SKY = { zen: new THREE.Color('#05061c'), hor: new THREE.Color('#1d2256'), below: new THREE.Color('#11143a'), sea: new THREE.Color('#0b0d28'), moon: new THREE.Color(0.66, 0.77, 1.0) };
const MOON_ARC = [new THREE.Color(0.55, 0.75, 1.7), new THREE.Color(1.3, 1.6, 2.5), new THREE.Color(0.85, 0.6, 2.0)];
const _nc = new THREE.Color(), _nv = new THREE.Vector3(), _nL1 = new THREE.Vector3(), _nL2 = new THREE.Vector3(), _npa = {}, _npb = {}, _nm = new THREE.Matrix4(), _nq = new THREE.Quaternion(), _ns = new THREE.Vector3();
function nightSpec(g) { return Object.assign(levelSpec(g), { night: true }); }
const NightAct = {
  on: false, lv: null, lan: [], lit: 0, fwDone: new Set(),
  data() { const d = Save.data.night || (Save.data.night = { unlocked: 0, levels: {}, fails: {}, finished: false }); if (!d.fails) d.fails = {}; return d; },
  open() { return TEST_ALL || !!Save.data.finished; },
  nextG() { const d = this.data(); if (TEST_ALL) { for (let g = 0; g < STORY_LEVELS; g++) if (!d.levels[g]) return g; return 0; } return Math.min(d.unlocked, STORY_LEVELS - 1); },
  stars() { const d = this.data(); let n = 0; for (const k in d.levels) n += d.levels[k].stars.filter(Boolean).length; return n; },
  lanterns() { const d = this.data(); let a = 0, b = 0; for (const k in d.levels) { a += d.levels[k].lan || 0; b += d.levels[k].lanN || 0; } return [a, b]; },
  start(g) {
    G.mode = 'night'; G.hint = false; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless');
    enterLevel(nightSpec(g));
  },
  setup(lv) {
    const on = !!(lv.spec && lv.spec.night);
    this.on = on; this.lv = lv; this.lan.length = 0; this.lit = 0; this.fwDone.clear(); this.introFw = false; this.bannered = false; this.lanMesh = null;
    orb.u.uMoon.value = orb2.u.uMoon.value = on ? 1 : 0;
    if (!this.arcDay) this.arcDay = [arc1.glowU.uA.value.clone(), arc1.glowU.uB.value.clone(), arc1.glowU.uC.value.clone()];
    const cols = on ? MOON_ARC : this.arcDay; arc1.glowU.uA.value.copy(cols[0]); arc1.glowU.uB.value.copy(cols[1]); arc1.glowU.uC.value.copy(cols[2]);
    $('#hud').classList.toggle('night', on);
    $('#flareBar .fw').textContent = on ? 'Havai fişek geliyor' : 'Güneş patlaması geliyor';
    $('#flareBar .fb').textContent = on ? 'Havai fişek · ×2' : 'Güneş patlaması · yanma ×2';
    if (!on) return;
    // bulutlar gece kendi ışığıyla parlamasın: ay ışığını alsın
    for (const mv of G.view.moverViews || []) { const m = mv.v && mv.v.userData.mat; if (m && m.emissive) { m.emissive.setRGB(0.55, 0.65, 1.0); m.emissiveIntensity = 0.03; } }
    this.buildLanterns(lv);
    this.hud(true);
  },
  // fenerler: yolun kenarında, yerdeki engellerden uzak; yalnızca "başı ayda, Zifir gölgede" olabilen yerlere
  buildLanterns(lv) {
    const P = lv.path, rng = new RNG(((lv.spec.seed | 0) ^ 0x51ed27) >>> 0), obst = [{ x: lv.gate.x, z: lv.gate.z, r: 1.0 }];
    for (const c of lv.cols) {
      if (c.k === 0 && c.y0 < 0.9) obst.push({ x: c.x, z: c.z, r: Math.max(c.r0, c.r1) });
      else if (c.k === 1 && c.y - c.r * c.sy < 0.9) obst.push({ x: c.x, z: c.z, r: c.r });
      else if (c.k === 2 && c.y - c.hy < 0.9) obst.push({ x: c.x, z: c.z, r: Math.hypot(c.hx, c.hz) });
    }
    const out = [], cap = 9;
    for (let s = 2.4; s < lv.length - 1.6 && out.length < cap; s += 3.3 + rng.range(-0.4, 0.9)) {
      if (lv.bridges.some((b) => s > b.s0 - 0.8 && s < b.s1 + 0.8)) continue;
      pathAt(P, s, _npa);
      const sides = rng.chance(0.5) ? [1, -1] : [-1, 1];
      for (const sd of sides) {
        const x = _npa.x + _npa.nx * sd * 0.92, z = _npa.z + _npa.nz * sd * 0.92;
        if (!insideIsland(lv, x, z, 0.35) || distToPath(P, x, z) < 0.78) continue;
        if (obst.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 0.2)) continue;
        if (lv.drops.some((d) => Math.hypot(d.x - x, d.z - z) < 0.55) || (lv.crystals || []).some((c) => Math.hypot(c.x - x, c.z - z) < 0.8)) continue;
        let ok = false;
        for (let k = 1; k < 24 && !ok; k++) {
          sunDirs(k / 24, lv.sun, _nL1, _nL2); if (_nL1.y < 0.06 || occluded(lv.cols, x, 0.8, z, _nL1, -1)) continue;
          for (const ds of [-0.45, -0.15, 0.15, 0.45]) { pathAt(P, s + ds, _npb); if (exposureAt(lv.cols, _npb.x, _npb.z, _npb.nx, _npb.nz, _nL1, lv.sun.twin ? _nL2 : null) === 0) { ok = true; break; } }
        }
        if (!ok) continue;
        out.push({ x, z, s, lit: false, k: 0, glint: 0, ph: rng.range(0, 9) });
        break;
      }
    }
    this.lan = out; if (!out.length) return;
    // görseller: demir direkler (tek ağ), cam fenerler ve yerdeki ışık havuzları (örneklenmiş), parıltılar
    const parts = [];
    for (const l of out) {
      parts.push(part(new THREE.CylinderGeometry(0.11, 0.14, 0.08, 6), '#3a3440', { pos: [l.x, 0.04, l.z] }), part(new THREE.CylinderGeometry(0.028, 0.04, 0.74, 6), '#2a2632', { pos: [l.x, 0.41, l.z] }),
        part(new THREE.ConeGeometry(0.13, 0.11, 4), '#2a2632', { rot: [0, PI / 4, 0], pos: [l.x, 0.97, l.z] }), part(new THREE.SphereGeometry(0.025, 5, 4), '#c9a25a', { pos: [l.x, 1.04, l.z] }),
        part(new THREE.BoxGeometry(0.17, 0.025, 0.17), '#2a2632', { pos: [l.x, 0.71, l.z] }));
    }
    const posts = new THREE.Mesh(mergeParts(parts, false), matProp); posts.receiveShadow = true; // ince direkler gölge düşürmez: koruma sağlamayan bir gölge oyuncuyu yanıltmasın G.view.root.add(posts);
    const n = out.length;
    this.glass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.18, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(1.0, 0.62, 0.28), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), n);
    this.pool.renderOrder = 3; this.glass.frustumCulled = this.pool.frustumCulled = false;
    out.forEach((l, i) => { _nm.makeTranslation(l.x, 0.81, l.z); this.glass.setMatrixAt(i, _nm); this.glass.setColorAt(i, _nc.setRGB(0.1, 0.07, 0.05)); });
    this.halo = out.map((l) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(2.2, 1.35, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.position.set(l.x, 0.83, l.z); s.scale.setScalar(0.001); s.visible = false; G.view.root.add(s); return s; });
    G.view.root.add(this.glass, this.pool);
  },
  resetLan() { this.lit = 0; for (const [i, l] of this.lan.entries()) { l.lit = false; l.k = 0; if (this.halo) this.halo[i].visible = false; } this.hud(true); },
  ignite(l, i) {
    l.lit = true; l.k = 0; this.lit++;
    const N = this.lan.length;
    FX.burst(l.x, 0.85, l.z, 18, { add: true, c: [3.2, 1.9, 0.7], a: 1, s: 0.14, s1: 0.02, life: 0.8, sp: 2.2, up: 1.4, drag: 2.2 });
    audio.collect(Math.min(6, this.lit - 1)); haptic(12); popText(l.x, 1.25, l.z, `fener ${this.lit}/${N}`);
    this.halo[i].visible = true; this.hud();
    if (this.lit === N && N > 1) { setTimeout(() => { if (G.state === 'play' && G.lv === this.lv) { banner('Fener alayı!', 'bütün fenerler yandı'); Fireworks.show(3); } }, 500); }
  },
  hud(force) {
    const t = `${this.lit}/${this.lan.length}`, el = $('#lanTxt'); if (!el) return;
    if (force || el.textContent !== t) { el.textContent = t; if (!force) { const p = $('#lanPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } }
    $('#lanPill').classList.toggle('none', !this.lan.length);
  },
  update(dt, dtR) {
    if (!this.on || G.lv !== this.lv) return;
    const st = G.state, lv = this.lv, t = U.uTime.value;
    if (st === 'map' || st === 'theater' || st === 'film') return;
    if ((st === 'rewind' || st === 'ready') && (this.lit || this.fwDone.size)) { this.resetLan(); this.fwDone.clear(); }
    if ((st === 'intro' || st === 'ready') && !this.bannered && G.stateT > (lv.spec.i === 0 ? 3.0 : 1.0) && !lv.spec.boss && (lv.spec.g === 0 || !(Life.plan && Life.plan.wx))) { this.bannered = true; if (lv.spec.g === 0) banner('Gece Perdesi', 'Ay’ı sen çevir · fenerleri yak'); else banner('Gece', `${lv.chap.name} · ay ışığında`); }
    if (st === 'intro' && !this.introFw && G.stateT > 1.6) { this.introFw = true; Fireworks.show(lv.spec.i === 0 ? 4 : 2); }
    if (st === 'play' && G.stateT > 1.2 && !Save.seen('t-night')) tip('t-night', '<em>Gece Perdesi</em>: Ay’ı çevir, ay ışığı da yakar. <em>Fenerleri</em> yak: fenerin başına ay ışığı düşsün, Zifir yanından <em>gölgede</em> geçsin.', 6);
    // fenerler
    if (this.glass) {
      const moonOk = G.ecl.amt < 0.5;
      for (const [i, l] of this.lan.entries()) {
        const moonlit = moonOk && !occluded(lv.cols, l.x, 0.8, l.z, L1, -1);
        l.glint = damp(l.glint, moonlit && !l.lit ? 1 : 0, 6, dtR);
        if (!l.lit && st === 'play' && moonlit && G.f === 0 && G.T > lv.walkDelay && Math.abs(G.s - l.s) < 0.8) this.ignite(l, i);
        if (l.lit) {
          l.k = Math.min(1, l.k + dtR * 2.2); const fl = 1 + Math.sin(t * 9 + l.ph) * 0.05 + Math.sin(t * 23 + l.ph * 2) * 0.04, e = Ease.outBack(l.k, 2.4);
          this.glass.setColorAt(i, _nc.setRGB(3.6 * fl, 2.3 * fl, 0.95 * fl));
          const h = this.halo[i]; h.scale.setScalar(Math.max(0.001, 1.7 * e * fl)); h.material.opacity = 0.75 * Math.min(1, l.k * 2);
          _nq.identity(); _nm.compose(_nv.set(l.x, 0.03, l.z), _nq, _ns.setScalar(2.6 * e * fl)); this.pool.setMatrixAt(i, _nm);
        } else {
          const g = l.glint * (0.75 + Math.sin(t * 3 + l.ph) * 0.25);
          this.glass.setColorAt(i, _nc.setRGB(0.1 + g * 0.45, 0.07 + g * 0.6, 0.05 + g * 1.1));
          _nm.makeScale(0, 0, 0); this.pool.setMatrixAt(i, _nm);
        }
      }
      this.glass.instanceColor.needsUpdate = true; this.pool.instanceMatrix.needsUpdate = true;
    }
    // ateşböcekleri
    if (dtR > 0 && Math.random() < dtR * 7 && (Perf.Q.life || Math.random() < 0.5)) {
      const ch = lv.chunks[(Math.random() * lv.chunks.length) | 0], x = ch.cx + (Math.random() - 0.5) * ch.hx * 1.8, z = ch.cz + (Math.random() - 0.5) * ch.hz * 1.8;
      if (insideChunk(ch, x, z, 0.2)) FX.mote(x, 0.25 + Math.random() * 1.1, z, [2.0, 2.4, 0.7], 0.11);
    }
    // havai fişek: güneş patlamasının gece karşılığı, aynı zamanlamayla
    if (st === 'play' && lv.flares) {
      for (const [k, f] of lv.flares.entries()) {
        if (this.fwDone.has(k) || G.T < f.a - 1.3 || G.T > f.e) continue;
        this.fwDone.add(k);
        const L = Life.lv === lv ? Life : null, cx = L ? L.cx : 0, cz = L ? L.cz : 0, n = 3 + Math.floor((f.e - f.a) / 0.7);
        for (let q = 0; q < n; q++) {
          const tg = new THREE.Vector3(cx + (Math.random() - 0.5) * 9, 8.5 + Math.random() * 3.5, cz + (Math.random() - 0.5) * 11);
          const kind = q === 0 ? 'peony' : ['peony', 'ring', 'crackle', 'palm', 'willow'][(Math.random() * 5) | 0];
          Fireworks.rocket(tg, kind, FW_PAL[(Math.random() * FW_PAL.length) | 0], Math.max(0, f.a - 1.15 - G.T) + q * 0.42);
        }
      }
    }
  },
  // gece ışığı: applyLighting'ten hemen sonra
  applyLook() {
    if (!this.on || G.lv !== this.lv) return;
    const lv = this.lv, st = G.state, ecl = G.ecl.amt;
    _nc.copy(skyU.uZen.value); skyU.uZen.value.copy(NIGHT_SKY.zen).lerp(_nc, 0.08);
    _nc.copy(skyU.uHor.value); skyU.uHor.value.copy(NIGHT_SKY.hor).lerp(_nc, 0.14);
    _nc.copy(skyU.uBelow.value); skyU.uBelow.value.copy(NIGHT_SKY.below).lerp(_nc, 0.12);
    skyU.uStars.value = 1; skyU.uNight.value = Math.max(skyU.uNight.value, 0.9);
    seaU.uLit.value.copy(NIGHT_SKY.below).multiplyScalar(1.6).lerp(NIGHT_SKY.moon, 0.1); seaU.uDeep.value.copy(NIGHT_SKY.sea);
    U.uFogCol.value.copy(skyU.uHor.value); U.uBelowCol.value.copy(skyU.uBelow.value);
    skyU.uSunCol.value.copy(NIGHT_SKY.moon).multiplyScalar(0.6); // bulut denizi ve gök: ay ışığıyla aydınlanır
    sunLight.color.copy(NIGHT_SKY.moon); sunLight.intensity *= 0.82;
    if (lv.sun.twin) sunLight2.color.setRGB(0.5, 0.95, 0.88);
    hemi.color.setRGB(0.24, 0.29, 0.62); hemi.groundColor.setRGB(0.1, 0.09, 0.2); hemi.intensity *= 0.72;
    if (st !== 'complete') { U.uNightR.value = 999; U.uNightRim.value = 0; U.uNightAmt.value = Math.max(U.uNightAmt.value, 0.3); }
    orb.u.uCol.value.setRGB(0.86, 0.9, 1.0);
    orb.halo.material.color.setRGB(0.45, 0.55, 0.95).multiplyScalar(1 - ecl * 0.9);
    orb.rays.material.color.multiplyScalar(0.22);
    orb.crownU.uCol.value.setRGB(0.75, 0.9, 1.6); orb.crownU.uK.value *= 0.5;
    if (lv.sun.twin) orb2.u.uCol.value.setRGB(0.66, 1.0, 0.95);
    const pu = post.u; pu.uSunVis.value *= 0.3; pu.uFlareCol.value.setRGB(0.45, 0.55, 0.9);
    pu.uGain.value.multiply(_nv.set(0.95, 0.99, 1.08)); pu.uLift.value.add(_nv.set(0.004, 0.006, 0.02)); pu.uSat.value *= 0.94;
  },
  post(pu) {
    if (!this.on || G.lv !== this.lv) return;
    pu.uBloomAdd.value += 0.22; pu.uExposure.value += 0.06; pu.uRays.value *= 0.3;
    Ambient.u.uAlpha.value *= 0.45;
  },
  save() {
    const d = this.data(), g = this.lv.spec.g, firstClear = !d.levels[g], prev = d.levels[g] || { stars: [false, false, false], lan: 0 };
    d.levels[g] = { stars: prev.stars.map((s, i) => s || G.stars[i]), lan: Math.max(prev.lan || 0, this.lit), lanN: this.lan.length };
    d.unlocked = Math.max(d.unlocked, Math.min(STORY_LEVELS - 1, g + 1));
    if (g === STORY_LEVELS - 1) d.finished = true;
    Save.save();
    return { chapterDone: g % 8 === 7, newSkin: 0, firstClear, fails: d.fails[g] || 0, flow: 0 };
  },
};
