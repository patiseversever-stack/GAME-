
/* =====================================================================
   GÜNCELLEME DÖNGÜSÜ
   ===================================================================== */
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
const viewCtx = {
  occludeFade(pos, r) {
    if (!zifir.g.visible) return 0;
    const zp = zifir.g.position, dObj = camera.position.distanceTo(pos), dZ = camera.position.distanceTo(zp);
    if (dObj > dZ - 0.5) return 0;
    _pa.copy(pos).project(camera); _pb.set(zp.x, 0.3, zp.z).project(camera);
    const d = Math.hypot((_pa.x - _pb.x) * camera.aspect, _pa.y - _pb.y);
    const rs = r / dObj / Math.tan(deg(camera.fov / 2));
    return 1 - smoothstep(rs * 0.6, rs * 1.25, d);
  },
  near(pos) { return camera.position.distanceTo(pos) < 48; },
  dim() { return Math.max(G.night, G.ecl.amt); },
};
function updateSunControl(dtR) {
  const st = G.state;
  const control = st === 'title' || st === 'intro' || st === 'ready' || st === 'play';
  if (!control) { G.uSV = 0; audio.setHum(0, G.u); return; }
  if (G.auto && G.lv && (st === 'play' || st === 'ready')) {
    const sol = G.lv.solution, f = (G.T + 0.1) / sol.dt, k0 = Math.min(sol.K - 1, Math.floor(f)), k1 = Math.min(sol.K - 1, k0 + 1);
    G.uT = lerp(sol.traj[k0], sol.traj[k1], f - Math.floor(f));
  }
  if (G.keyDir) { G.uT += G.keyDir * 0.85 * dtR; G.userSun = true; }
  if (!G.drag) { G.uT += G.uVel * dtR; G.uVel *= Math.exp(-dtR * 5.5); }
  let edge = 0;
  if (G.uT < 0) { edge = -1; G.uT = 0; G.uVel = 0; } else if (G.uT > 1) { edge = 1; G.uT = 1; G.uVel = 0; }
  if (edge && !G.atEdge && Math.abs(G.uSV) > 0.35) { audio.clunk(); haptic(12); G.orbPulse = 1; G.trauma = Math.max(G.trauma, 0.15); }
  G.atEdge = edge;
  const n = dtR > 0.02 ? 3 : 1, h = dtR / n, k = 240, c = 2 * Math.sqrt(k) * 0.8;
  for (let i = 0; i < n; i++) { G.uSV += ((G.uT - G.u) * k - G.uSV * c) * h; G.u = clamp(G.u + G.uSV * h, 0, 1); }
  const ti = Math.round(G.u * 12);
  if (ti !== G.lastTick) {
    if (G.lastTick >= 0 && Math.abs(G.u * 12 - ti) < 0.3) { arc1.hit(ti); if (G.lv && G.lv.sun.twin) arc2.hit(12 - ti); audio.tick(G.u); haptic(3); }
    G.lastTick = ti;
  }
  const sp = Math.abs(G.uSV);
  audio.setHum(Math.min(1, sp * 1.4), G.u);
  if (sp > 0.55 && Math.random() < sp * 0.5) { const p = orb.g.position; FX.sparkle(p.x + (Math.random() - 0.5) * 0.6, p.y + (Math.random() - 0.5) * 0.6, p.z, [2.6, 1.7, 0.8], 0.35); }
}
function exposureNow(lv, x, z, nx, nz) {
  let e = 0; const mir = lv.mirrors && lv.mirrors.length; G.mirHit = false;
  for (let q = -1; q <= 1; q++) {
    const px = x + nx * ZIFIR_HALF * q, pz = z + nz * ZIFIR_HALF * q;
    let l1 = occluded(lv.cols, px, ZIFIR_Y, pz, L1, -1) ? 0 : 1;
    if (!l1 && mir && mirrorsLit(lv.mirrors, px, ZIFIR_Y, pz, L1)) { l1 = 1; G.mirHit = true; }
    e += lv.sun.twin ? (l1 + (occluded(lv.cols, px, ZIFIR_Y, pz, L2, -1) ? 0 : 1)) * 0.5 : l1;
  }
  return e / 3;
}
function updateCrystals(dt) {
  const lv = G.lv;
  for (const c of lv.crystals) {
    const lit = G.ecl.amt < 0.5 && pointLit(lv.cols, c.x, c.y, c.z, L1, lv.sun.twin ? L2 : null, c.id);
    c.lit = lit;
    const br = c.bridge;
    if (lit) { br.onT += dt; br.offT = 0; } else { br.offT += dt; br.onT = 0; }
    const was = br.active;
    if (!br.active && br.onT > 0.06) br.active = true;
    if (br.active && !br.lock && br.offT > 0.22) br.active = false;
    if (br.active !== was) { audio.crystal(br.active); if (br.active) for (let i = 0; i < 6; i++) FX.sparkle(c.x + (Math.random() - 0.5) * 0.5, 1.6 + Math.random() * 0.6, c.z + (Math.random() - 0.5) * 0.5, [2.2, 1.8, 3.0], 0.4); }
  }
}
function collectDrop(d) {
  d.state = 1; G.dropsGot++; G.combo++;
  audio.collect(G.combo - 1); haptic(12);
  FX.burst(d.x, 0.35, d.z, 18, { add: true, c: [0.9, 0.65, 2.4], a: 1, s: 0.16, s1: 0.02, life: 0.7, sp: 2.6, up: 1, drag: 2.5, t: 2 });
  FX.burst(d.x, 0.3, d.z, 10, { c: [0.03, 0.02, 0.06], a: 0.85, s: 0.12, s1: 0.3, life: 0.6, sp: 1.6, up: 1.6, g: -5, drag: 1 });
  zifir.kick(1.4);
  if (G.lv.spec.eclipse) G.ecl.charge = Math.min(1, G.ecl.charge + 0.34);
  popText(d.x, 0.95, d.z, G.combo > 1 ? `✦ ×${G.combo}` : '✦');
  const pill = $('#dropPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  updateHud();
}
function onWisp(ev) {
  const w = ev.w;
  if (ev.kind === 'eat') {
    act.eaten++; G.meter = Math.min(1, G.meter + 0.15); G.combo++;
    audio.sprite(3); haptic(16); zifir.kick(1.8); G.flash = Math.max(G.flash, 0.12); G.flashCol.set(0.7, 0.55, 1.0);
    popText(w.x, 1.0, w.z, 'peri yutuldu ✦');
  } else if (ev.kind === 'hit') {
    G.meter -= 0.1; G.expTotal += 0.3; G.combo = 0;
    audio.flareBurst(); haptic([25, 20, 25]); G.trauma = Math.max(G.trauma, 0.4); G.ca = Math.max(G.ca, 0.015); zifir.kick(-3);
    popText(w.x, 1.0, w.z, 'yandı!');
  }
}
function endEpisode() {
  if (G.burnEp > 0.22) {
    audio.relief();
    const x = zifir.g.position.x, z = zifir.g.position.z;
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; fxMix.spawn(x + Math.cos(a) * 0.9, 0.3 + Math.random() * 0.4, z + Math.sin(a) * 0.9, -Math.cos(a) * 2.2, 0, -Math.sin(a) * 2.2, { c: [0.03, 0.02, 0.07], a: 0.6, s: 0.2, s1: 0.05, life: 0.42, drag: 0.5, t: 1 }); }
    if (G.epMin < 0.3) {
      banner('Kıl payı!', 'gölgeye döndü'); audio.closeCall(); haptic(25);
      G.slowT = 0.55; G.slowK = 0.4; G.fovKick = -3;
    }
    if (G.burnEp > 0.35) G.combo = 0;
  }
  G.burnEp = 0; G.epMin = 1;
}
function stepPlay(dt, dtR) {
  const lv = G.lv;
  G.T += dt;
  if (lv.hasMovers) updateMovers(lv, G.T);
  sunDirs(G.u, lv.sun, L1, L2);
  updateCrystals(dt);
  // ilerleme (köprüde bekleme)
  if (G.T > lv.walkDelay) {
    let ns = G.s + lv.speed * act.speedMul() * dt;
    const wasWaiting = G.waiting; G.waiting = false;
    for (const br of lv.bridges) {
      const entry = br.s0 - 0.3;
      if (!br.active && G.s <= entry + 1e-4 && ns > entry) { ns = entry; G.waiting = true; }
      br.lock = G.s >= entry - 0.05 && G.s <= br.s1 + 0.05;
    }
    if (G.waiting && !wasWaiting) tip('t-wait', 'Zifir köprüyü bekliyor: <em>kristali</em> aydınlat!', 3);
    G.s = Math.min(lv.length, ns);
  }
  pathAt(lv.path, G.s, PA);
  const onBridge = lv.bridges.some((b) => G.s > b.s0 + 0.05 && G.s < b.s1);
  let f = 0;
  if (G.T > lv.walkDelay && !onBridge && G.ecl.amt < 0.5) f = exposureNow(lv, PA.x, PA.z, PA.nx, PA.nz);
  G.f = f;
  const dashing = act.dashT > 0, fm = flareMul(lv, G.T) * act.burnMul();
  if (G.auto && G.autoDive && lv.spec.dash && act.canDash() && (f > 0 || wisps.items.some((w) => w.state === 1 && Math.hypot(w.x - PA.x, w.z - PA.z) < 1.4))) act.dash();
  if (f > 0) {
    if (G.burnEp === 0) { audio.whoosh(true, 0.2, 0.04); for (let i = 0; i < 5; i++) FX.ember(PA.x, 0.3, PA.z); }
    if (G.mirHit && Math.random() < dt * 20) FX.sparkle(PA.x + (Math.random() - 0.5) * 0.4, 0.4 + Math.random() * 0.3, PA.z + (Math.random() - 0.5) * 0.4, [2.6, 2.0, 1.2], 0.4);
    G.meter -= lv.burn * f * fm * dt; G.expTotal += f * act.burnMul() * dt; G.burnEp += dt; G.epMin = Math.min(G.epMin, G.meter);
    G.trauma = Math.max(G.trauma, 0.12 + f * 0.12);
    G.hapT -= dtR; if (G.hapT <= 0) { haptic(10); G.hapT = 0.28; }
  } else {
    G.meter = Math.min(1, G.meter + lv.regen * dt);
    if (G.burnEp > 0) endEpisode();
  }
  act.step(dt, f, G.T > lv.walkDelay && !G.waiting);
  if (lv.sprites && lv.sprites.length && !window.__noWisps) {
    const ev = wisps.step(dt, G.T, PA.x, PA.z, f === 0, act.dashT > 0 || G.ecl.amt > 0.5);
    if (ev) onWisp(ev);
  }
  if (G.meter < 0.35 && G.T > G.nextHeart) { audio.heartbeat(); G.nextHeart = G.T + 0.75; }
  audio.setSizzle(f);
  audio.intensity = damp(audio.intensity, f > 0 ? 1 : 0, 2, dtR);
  // damlalar
  for (const d of lv.drops) {
    if (d.state !== 0) continue;
    d.awake = d.s - G.s < DROP_WAKE;
    d.lit = false;
    if (d.awake && G.ecl.amt < 0.5) {
      let lit = occluded(lv.cols, d.x, 0.3, d.z, L1, -1) ? 0 : 1;
      if (!lit && lv.mirrors && lv.mirrors.length && mirrorsLit(lv.mirrors, d.x, 0.3, d.z, L1)) lit = 1;
      if (lv.sun.twin) lit = (lit + (occluded(lv.cols, d.x, 0.3, d.z, L2, -1) ? 0 : 1)) * 0.5;
      if (lit > 0) { d.lit = true; d.hp -= (lit * dt) / DROP_LIFE; if (Math.random() < dt * 16) FX.smoke(d.x, 0.35, d.z, 0.45); }
      if (d.hp <= 0) {
        d.state = 1; audio.evaporate(); G.combo = 0;
        FX.burst(d.x, 0.35, d.z, 14, { c: [0.8, 0.75, 0.9], a: 0.45, s: 0.2, s1: 0.7, life: 0.9, sp: 1.2, up: 1.4, drag: 2, t: 1 });
        popText(d.x, 0.9, d.z, 'buharlaştı');
      }
    }
    if (d.state === 0 && Math.abs(d.s - G.s) < 0.3) collectDrop(d);
  }
  // tutulma
  if (G.ecl.active) {
    G.ecl.t += dt; const t = G.ecl.t;
    G.ecl.amt = t < 0.22 ? t / 0.22 : t < 2.1 ? 1 : Math.max(0, 1 - (t - 2.1) / 0.5);
    if (t > 2.6) { G.ecl.active = false; G.ecl.amt = 0; }
    if (Math.random() < dtR * 20) { const p = orb.g.position; FX.sparkle(p.x + (Math.random() - 0.5) * 2, p.y + (Math.random() - 0.5) * 2, p.z, [1.4, 1.4, 2.4], 0.25); }
  }
  G.minMeter = Math.min(G.minMeter ?? 1, G.meter); if (G.waiting) G.waitT = (G.waitT || 0) + dt;
  if (G.meter <= 0) { G.meter = 0; failLevel(); return; }
  if (G.s >= lv.length - 1e-4) reachGate();
  updateHud();
}
function setupCompleteCine() {
  const lv = G.lv;
  G.cImpact = false; G.cNight = false; G.cNext = false; G.cU0 = G.u; G.ffwd = false;
  pathAt(lv.path, lv.length, PA); G.cFrom = { x: PA.x, z: PA.z };
  const gate = new THREE.Vector3(lv.gate.x, 1.0, lv.gate.z);
  Cam.cinema(Cam.pose({ target: gate, dist: Cam.base.dist * 0.6 }), 0.55, Ease.outCubic);
}
function updateComplete(dt, dtR) {
  const t = G.stateT, lv = G.lv, gate = lv.gate;
  if (t < 0.48) {
    const k = t < 0.14 ? 0 : (t - 0.14) / 0.34, e = Ease.inOutSine(clamp01(k));
    const x = lerp(G.cFrom.x, gate.x, e), z = lerp(G.cFrom.z, gate.z, e), y = Math.sin(e * PI) * 0.9 + e * 0.75;
    if (t < 0.14 && !G.cSquash) { G.cSquash = true; zifir.kick(-4); }
    zifir.update(dtR, { x, y, z, yaw: lv.gate.yaw, moving: false, speed: 0, burn: 0, meter: 1, look: camera.position, mood: 1 });
    zifir.g.scale.setScalar(Math.max(0.001, 1 - e * 0.75));
  } else if (!G.cImpact) {
    G.cImpact = true; G.hitStop = 0.09; G.flash = 0.55; G.flashCol.set(0.75, 0.55, 1.0);
    G.view.gate.userData.pu.uPulse.value = 1; audio.gate(); haptic([15, 30, 15]); G.trauma = 0.35; zifir.g.visible = false;
    FX.burst(gate.x, 1.15, gate.z, 44, { add: true, c: [1.2, 0.8, 2.6], a: 1, s: 0.22, s1: 0.02, life: 1.1, sp: 5, drag: 2, t: 2 });
    U.uNightC.value.set(gate.x, gate.z);
    setTimeout(() => { if (G.state === 'complete') Cam.cinema(Cam.pose({ pitch: deg(30), dist: Cam.base.dist * 1.08, target: Cam.base.target.clone().add(new THREE.Vector3(0, 3.5, -1.5)) }), 2.4, Ease.inOutCubic); }, 250);
  }
  const k = clamp01((t - 0.48) / 1.7);
  U.uNightAmt.value = 1; U.uNightR.value = Ease.inOutCubic(k) * 34 + 0.01; U.uNightRim.value = Math.sin(k * PI) * 1.0;
  G.night = Ease.inOutSine(k);
  if (t > 0.62 && !G.cNight) { G.cNight = true; audio.nightfall(); }
  G.u = G.uT = lerp(G.cU0, 1, Ease.inOutCubic(clamp01((t - 0.48) / 2.2)));
  if (G.mode === 'endless') { if (t > 1.7 && !G.cNext) { G.cNext = true; enterLevel(endlessSpec(G.endless.n, G.endless.seed), { quick: true }); } return; }
  if (G.ffwd && G.compStage < 5) { if (G.compStage === 0) showComplete(); for (let i = 0; i < 3; i++) { const el = $$('.star')[i]; el.classList.add('shown'); if (G.stars[i]) el.classList.add('lit'); } G.compStage = 5; $('#complete').classList.add('ready'); }
  if (t > 1.7 && G.compStage === 0) { G.compStage = 1; showComplete(); }
  for (let i = 0; i < 3; i++) if (t > 2.15 + i * 0.42 && G.compStage === 1 + i) {
    G.compStage++; const el = $$('.star')[i]; el.classList.add('shown'); if (G.stars[i]) el.classList.add('lit');
    audio.star(i, G.stars[i]); if (G.stars[i]) { haptic(10); G.flash = Math.max(G.flash, 0.12); G.flashCol.set(1, 0.85, 0.5); }
  }
  if (t > 3.45 && G.compStage === 4) { G.compStage = 5; $('#complete').classList.add('ready'); if (G.compRes && G.compRes.newSkin) banner('Yeni Zifir rengi', SKINS[G.compRes.newSkin].name); if (G.stars[2]) setTimeout(() => G.state === 'complete' && banner('Lekesiz', 'güneş dokunamadı'), 300); }
}
function ambient(dtR) {
  const lv = G.lv; if (!lv) return;
  const n = G.night;
  if (Math.random() < dtR * (n > 0.4 ? 9 : 3)) {
    const ch = lv.chunks[Math.floor(Math.random() * lv.chunks.length)];
    const x = ch.cx + (Math.random() - 0.5) * ch.hx * 1.8, z = ch.cz + (Math.random() - 0.5) * ch.hz * 1.8;
    if (n > 0.4) FX.mote(x, 0.2 + Math.random() * 1.2, z, [2.6, 2.4, 0.8], 0.13);
    else { const c = sunLight.color; FX.mote(x, 0.5 + Math.random() * 3, z, [c.r * 1.2, c.g * 1.1, c.b * 0.9]); }
  }
}
function updateZifirView(dtR) {
  const lv = G.lv; if (!lv || !zifir.g.visible || G.state === 'complete') return;
  pathAt(lv.path, G.s, PA);
  const looking = G.drag || Math.abs(G.uSV) > 0.25;
  zifir.update(dtR, {
    x: PA.x, z: PA.z, yaw: Math.atan2(PA.tx, PA.tz), moving: G.state === 'play' && G.T > lv.walkDelay && !G.waiting, speed: lv.speed * (G.slowT > 0 ? G.slowK : 1),
    burn: G.state === 'play' ? G.f * act.burnMul() : G.state === 'fail' ? 1 : 0, meter: G.state === 'fail' ? 0.4 : G.meter, look: looking ? orb.g.position : camera.position, mood: 0, dive: act.diveK,
  });
  U.uZifir.value.set(PA.x, 0, PA.z);
  Cam.follow.set(PA.x + PA.tx * 1.5 - Cam.base.target.x, 0, PA.z + PA.tz * 1.5 - Cam.base.target.z);
}
let envT = 0;
function update(dt, dtR) {
  const st0 = G.state;
  if (st0 !== 'paused') U.uTime.value += dtR;
  G.stateT += dtR;
  if (G.palT < 1) G.palT = Math.min(1, G.palT + dtR / 1.6);
  if (G.outView) { G.outT += dtR; G.outView.sink(dtR); if (G.outT > 1.2) { G.outView.dispose(); G.outView = null; } }
  if (SkyMap.active && G.state !== 'map') SkyMap.deactivate();
  if (Film.active && G.state !== 'film') Film.finish(true);
  updateSunControl(dtR);
  const lv = G.lv;
  // ada girişi (durumdan bağımsız sürer)
  if (G.view && G.view.introT < 3.5) {
    if (G.view.intro(dtR)) renderer.shadowMap.needsUpdate = true;
    const zt = (G.introDur || 2) - 0.8;
    if (G.view.introT > zt && !G.zShown && (G.state === 'title' || G.state === 'intro' || G.state === 'ready')) {
      G.zShown = true; zifir.g.visible = true; zifir.g.scale.setScalar(0.001); G.zPop = 0; audio.pop(3);
      pathAt(lv.path, 0, PA); FX.burst(PA.x, 0.2, PA.z, 12, { c: [0.03, 0.02, 0.06], a: 0.8, s: 0.15, s1: 0.4, life: 0.6, sp: 1.6, up: 1.4, g: -5, drag: 1 });
    }
  }
  if (G.zShown && G.zPop < 1 && (G.state === 'title' || G.state === 'intro' || G.state === 'ready')) { G.zPop = Math.min(1, G.zPop + dtR / 0.7); zifir.g.scale.setScalar(Math.max(0.001, Ease.outElastic(G.zPop))); }
  switch (G.state) {
    case 'title': case 'intro': {
      const t = G.stateT;
      if (!G.userSun) G.u = G.uT = lerp(0.02, G.state === 'title' ? 0.3 : lv.spec.sunStart, Ease.inOutCubic(clamp01((t - 0.15) / (G.introDur * 0.8))));
      G.night = damp(G.night, 0, 2.2, dtR); U.uNightAmt.value = G.night; U.uNightRim.value = 0;
      if (G.state === 'intro' && t > G.introDur) {
        G.state = 'ready'; G.readyT = 0; G.readyHint = false; G.uT = G.u;
        if (refreshEnvSoon > 0) { refreshEnv(); refreshEnvSoon = -1; }
        if (G.auto) startPlay();
      }
      if (lv.crystals.length) { sunDirs(G.u, lv.sun, L1, L2); updateCrystals(dtR); }
      break;
    }
    case 'ready': {
      G.readyT += dtR;
      if (!G.readyHint && G.mode === 'story' && lv.spec.g === 0) { G.readyHint = true; toast('<span class="hand"></span>Güneşi <em>sürükle</em> — gölgeler döner, Zifir yola çıkar.', 0); }
      else if (!G.readyHint && G.readyT > 4.5) { G.readyHint = true; toast('<span class="hand"></span>Hazır olunca güneşi sürükle', 0); }
      sunDirs(G.u, lv.sun, L1, L2); if (lv.crystals.length) updateCrystals(dtR);
      G.night = damp(G.night, 0, 3, dtR); U.uNightAmt.value = G.night;
      break;
    }
    case 'play': if (dt > 0) stepPlay(dt, dtR); break;
    case 'complete': updateComplete(dt, dtR); break;
    case 'fail': {
      const t = G.stateT;
      const k = clamp01(t / 0.35); zifir.g.scale.setScalar(Math.max(0.001, 1 - Ease.inCubic(k)));
      if (t > 0.35) zifir.g.visible = false;
      G.desat = damp(G.desat, 0.45, 4, dtR);
      if (t > 0.95 && !G.fShown) { G.fShown = true; showFail(); }
      break;
    }
    case 'rewind': {
      const t = G.stateT;
      G.u = G.uT = lerp(G.rewFrom, lv.spec.sunStart, Ease.inOutCubic(clamp01(t / 0.7)));
      G.night = damp(G.night, 0, 5, dtR); U.uNightAmt.value = G.night; U.uNightRim.value = 0;
      G.desat = damp(G.desat, 0, 6, dtR);
      if (t > 0.22) { if (!G.rwFx) { G.rwFx = true; pathAt(lv.path, 0, PA); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; fxMix.spawn(PA.x + Math.cos(a) * 1.2, 0.3 + Math.random() * 0.5, PA.z + Math.sin(a) * 1.2, -Math.cos(a) * 2.8, 0, -Math.sin(a) * 2.8, { c: [0.03, 0.02, 0.07], a: 0.7, s: 0.25, s1: 0.05, life: 0.42, drag: 0.3, t: 1 }); } }
        zifir.g.scale.setScalar(Math.max(0.001, Ease.outElastic(clamp01((t - 0.22) / 0.6)))); }
      if (t > 0.9) { G.state = 'ready'; G.readyT = 0; G.readyHint = true; zifir.g.scale.setScalar(1); G.uT = G.u; G.rwFx = false; if (G.auto) startPlay(); }
      break;
    }
    case 'film': Film.update(dtR); break;
    case 'map': SkyMap.update(dtR); G.night = damp(G.night, G.mapNight, 1.5, dtR); break;
    case 'theater': Theater.update(dtR); break;
    case 'ending': { G.night = damp(G.night, G.state === 'ending' ? 1 : G.mapNight, 1.5, dtR); U.uNightAmt.value = G.night; U.uNightR.value = 60; U.uNightRim.value = 0; break; }
  }
  if (G.state !== 'play' && G.state !== 'film') { G.ecl.amt = damp(G.ecl.amt, 0, 6, dtR); if (G.ecl.amt < 0.01) G.ecl.amt = 0; }
  if (G.state === 'play' || (G.ecl.amt > 0 && G.state === 'fail')) { U.uNightAmt.value = G.ecl.amt * 0.72; U.uNightR.value = 999; U.uNightRim.value = 0; }
  // görseller
  if (lv && G.state !== 'map' && G.state !== 'theater') {
    G.view.update(dtR, G.T, viewCtx);
    drops.update(dtR, U.uTime.value);
    wisps.update(dtR, U.uTime.value);
    flare.update(lv, G.T, dtR, G.state === 'play');
    updateZifirView(dtR);
    applyLighting(dtR);
    if (G.hint && (G.state === 'play' || G.state === 'ready')) {
      const sol = lv.solution, k = Math.min(sol.K - 1, Math.round((G.T + 0.45) / sol.dt));
      orbPosInto(sol.traj[k], lv.sun.tilt, lv.sun.thMin, ghost.position); ghost.material.opacity = 0.45 + Math.sin(U.uTime.value * 5) * 0.15;
    } else ghost.material.opacity = 0;
  }
  arc1.update(dtR); arc2.update(dtR);
  ambient(dtR); updateBirds(dtR); updateFar(U.uTime.value);
  fxAdd.update(dtR); fxMix.update(dtR); updatePrints(dtR); updatePops(dtR);
  // efekt sönümleri
  G.orbPulse = Math.max(0, (G.orbPulse || 0) - dtR * 4);
  G.trauma = Math.max(0, G.trauma - dtR * 1.4); G.flash = Math.max(0, G.flash - dtR * 2.6); G.fovKick = damp(G.fovKick, 0, 5, dtR); G.ca = damp(G.ca, 0, 3, dtR);
  if (G.state !== 'fail' && G.state !== 'rewind') G.desat = damp(G.desat, 0, 4, dtR);
  Cam.zoom = G.state === 'play' ? lerp(0.86, 1.0, G.ecl.amt) : G.state === 'ready' ? 0.93 : 1;
  Cam.update(dt, dtR);
  U.uCamPos.value.copy(camera.position);
  // gölge haritası: yalnızca gerektiğinde
  const moved = Math.abs(G.u - (G.shU ?? -1)) > 1e-5;
  if (moved || (lv && lv.hasMovers && G.state === 'play') || G.state === 'intro' || G.state === 'title' || G.state === 'film') { renderer.shadowMap.needsUpdate = true; G.shU = G.u; }
  envT += dtR; if (refreshEnvSoon > 0) { refreshEnvSoon -= dtR; if (refreshEnvSoon <= 0 && G.state !== 'play') { refreshEnv(); refreshEnvSoon = -1; } }
  // post
  const pu = post.u, ecl = G.ecl.amt;
  pu.uTime.value = U.uTime.value; pu.uFlash.value = G.flash; pu.uFlashCol.value.copy(G.flashCol);
  pu.uCA.value = G.ca + (G.state === 'play' ? G.f * 0.004 : 0);
  pu.uDesat.value = clamp01(G.desat + ecl * 0.08);
  pu.uExposure.value = 1.0 - ecl * 0.06 + G.night * 0.15 + flare.k * 0.1;
  pu.uNight.value = G.night;
  pu.uBloomAdd.value = 0.35 + G.night * 0.4 + ecl * 0.3 + flare.k * 0.45 + flare.warnK * 0.12;
  pu.uRays.value = 0.5 * (1 - G.night) * (1 - ecl) * (orb.g.visible ? 1 : 0);
  const danger = G.state === 'play' ? (G.f > 0 ? 0.35 + (1 - G.meter) * 0.8 : G.meter < 0.35 ? 0.2 + Math.sin(U.uTime.value * 8) * 0.08 : 0) : 0;
  pu.uDanger.value = damp(pu.uDanger.value, danger, 8, dtR);
  _pv.set(zifir.g.position.x, 0.35, zifir.g.position.z).project(camera);
  pu.uHeat.value.set(_pv.x * 0.5 + 0.5, _pv.y * 0.5 + 0.5, G.state === 'play' ? G.f * 0.9 : 0);
  const focusY = G.state === 'title' || G.state === 'map' || G.state === 'film' ? 0.42 : clamp(_pv.y * 0.5 + 0.5, 0.25, 0.65);
  pu.uTiltC.value = damp(pu.uTiltC.value, focusY, 2, dtR); pu.uTiltW.value = 0.3; pu.uTilt.value = 0.7;
}

/* =====================================================================
   GİRİŞ
   ===================================================================== */
const sens = () => 1 / (Math.min(innerWidth, 620) * 0.8);
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (G.state === 'film') { Film.skip(); return; }
  if (G.state === 'map') { SkyMap.down(e); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} return; }
  if (G.state === 'theater') { Theater.down(e); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} return; }
  if (G.state === 'complete') { if (G.compStage < 5 && G.mode !== 'endless') G.ffwd = true; return; }
  if (G.state === 'fail' && G.fShown) { retry(); return; }
  if (G.drag) return;
  G.drag = { id: e.pointerId, x: e.clientX, t: performance.now(), v: 0 };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  G.uVel = 0;
  if (G.state === 'title' || G.state === 'intro') G.userSun = true;
  if (G.state === 'ready') startPlay();
});
canvas.addEventListener('pointermove', (e) => {
  if (G.state === 'map') { SkyMap.move(e); return; }
  if (G.state === 'theater') { Theater.move(e); return; }
  const d = G.drag; if (!d || e.pointerId !== d.id) return;
  const now = performance.now(), dx = e.clientX - d.x, dtm = Math.max(1, now - d.t);
  d.x = e.clientX; d.t = now;
  const du = dx * sens();
  G.uT += du;
  d.v = lerp(d.v, (du / dtm) * 1000, 0.45);
});
const endDrag = (e) => { if (G.state === 'map' || SkyMap.drag) SkyMap.up(e); if (Theater.drag) Theater.up(e); const d = G.drag; if (!d || e.pointerId !== d.id) return; G.uVel = performance.now() - d.t < 70 ? clamp(d.v, -3.5, 3.5) : 0; G.drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (TUT.open) { TUT.key(e); return; }
  if (e.repeat && (e.code === 'Space')) return;
  if (G.state === 'film') { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') Film.skip(); return; }
  if (G.state === 'theater') { const k = 0.12; if (e.code === 'ArrowLeft' || e.code === 'KeyA') Theater.rot(-k, 0); else if (e.code === 'ArrowRight' || e.code === 'KeyD') Theater.rot(k, 0); else if (e.code === 'ArrowUp' || e.code === 'KeyW') Theater.rot(0, -k); else if (e.code === 'ArrowDown' || e.code === 'KeyS') Theater.rot(0, k); else if (e.code === 'Escape') Theater.close(); else if ((e.code === 'Enter' || e.code === 'Space') && Theater.cardShown) $('#thNext').click(); return; }
  if (G.state === 'map') { if (e.code === 'ArrowLeft' || e.code === 'KeyA') SkyMap.go(Math.round(SkyMap.tf) - 1); else if (e.code === 'ArrowRight' || e.code === 'KeyD') SkyMap.go(Math.round(SkyMap.tf) + 1); else if (e.code === 'Enter' || e.code === 'Space') $('#mpPlay').click(); else if (e.code === 'Escape') $('#btnMapBack').click(); return; }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { G.keyDir = -1; if (G.state === 'ready') startPlay(); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { G.keyDir = 1; if (G.state === 'ready') startPlay(); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (G.state === 'play') act.dash(); }
  else if (e.code === 'Space') { if (G.state === 'play') { if (G.lv.spec.eclipse && G.ecl.charge >= 1) triggerEclipse(); else act.dash(); } else if (G.state === 'ready') startPlay(); else if (G.state === 'complete' && G.compStage >= 5) nextFromComplete(); else if (G.state === 'fail' && G.fShown) retry(); else if (G.state === 'title') $('#btnPlay').click(); }
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (G.state === 'paused') resume(); else pause(); }
});
window.addEventListener('keyup', (e) => { if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) G.keyDir = 0; });
document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('#chapters')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'play' || G.state === 'ready') pause(); audio.suspend(); }
  else { audio.resume(); lastT = performance.now(); }
});

/* =====================================================================
   EKRANLAR & DÜĞMELER
   ===================================================================== */
function pause() {
  if (G.state !== 'play' && G.state !== 'ready') return;
  G.pausedFrom = G.state; G.state = 'paused'; G.drag = null; G.keyDir = 0;
  audio.setSizzle(0); audio.setHum(0, G.u); refreshToggles(); UI.show('pause');
}
function resume() { if (G.state !== 'paused') return; UI.hide('pause'); G.state = G.pausedFrom || 'play'; }
function openMap() {
  audio.ui(); hideToast();
  G.mapNight = G.night > 0.5 ? 1 : 0.55;
  const fresh = G.state !== 'map';
  if (fresh) { const f = $('#fader'); f.classList.add('on'); }
  const go = () => {
    G.state = 'map'; G.drag = null; UI.hideAll(); UI.hud(false); buildMap(); SkyMap.open(); UI.show('map');
    if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => $('#fader').classList.remove('on')));
  };
  if (fresh) setTimeout(go, 260); else go();
}
const CONST = [
  [[12, 104], [24, 88], [36, 76], [44, 60], [58, 52], [66, 36], [78, 26], [90, 12]],
  [[50, 108], [50, 84], [50, 60], [28, 40], [50, 60], [72, 40], [72, 82], [28, 82]],
  [[50, 12], [74, 24], [84, 48], [74, 72], [50, 82], [26, 72], [16, 48], [26, 24]],
  [[62, 10], [46, 18], [40, 34], [52, 46], [62, 60], [50, 74], [42, 92], [58, 108]],
  [[30, 14], [28, 40], [26, 66], [24, 96], [70, 14], [72, 40], [74, 66], [76, 96]],
  [[80, 12], [68, 28], [58, 44], [48, 60], [28, 64], [22, 90], [44, 100], [54, 80]],
  [[50, 110], [50, 88], [50, 66], [32, 52], [28, 26], [50, 40], [72, 26], [68, 52]],
  [[22, 14], [50, 14], [78, 14], [50, 40], [50, 64], [36, 80], [50, 96], [64, 80]],
];
const SEQ = [0, 1, 2, 3, 4, 5, 6].map((i) => [i, i + 1]);
const CONST_EDGES = { 2: [...SEQ, [7, 0]], 4: SEQ.filter((e) => e[0] !== 3), 5: [...SEQ, [7, 3]], 6: [...SEQ, [7, 2]],
  7: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 4]] };
function chapterStars(ci) { let s = 0; for (let i = 0; i < 8; i++) s += Save.stars(ci * 8 + i); return s; }
function buildMap() {
  const un = Save.data.unlocked;
  if (false) CHAPTERS.forEach((ch, ci) => {
    const locked = un < ci * 8;
    const card = document.createElement('div'); card.className = 'chap' + (locked ? ' locked' : '');
    const pts = CONST[ci];
    let svg = `<svg class="const" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet">`;
    for (const [i, j] of CONST_EDGES[ci] || SEQ) {
      const a = pts[i], b = pts[j], lit = Save.stars(ci * 8 + i) > 0 && Save.stars(ci * 8 + j) > 0;
      svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${lit ? 'rgba(255,214,140,.75)' : 'rgba(255,240,220,.16)'}" stroke-width="${lit ? 0.9 : 0.5}" ${lit ? '' : 'stroke-dasharray="1.5 1.5"'}/>`;
    }
    pts.forEach((p, i) => {
      const g = ci * 8 + i, st = Save.stars(g), open = g <= un, cur = g === un && !Save.data.levels[g];
      const r = st ? 4.6 : open ? 4 : 2.4;
      svg += `<g class="node${cur ? ' cur' : ''}" data-g="${g}" data-open="${open ? 1 : 0}">`;
      svg += `<circle class="halo" cx="${p[0]}" cy="${p[1]}" r="${r + 4}"/>`;
      svg += `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="transparent"/>`;
      svg += `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${st ? 'url(#nodeGrad)' : open ? 'rgba(255,244,226,.9)' : 'rgba(255,244,226,.25)'}" ${st ? 'style="filter:drop-shadow(0 0 2.5px rgba(255,200,120,.9))"' : ''}/>`;
      if (open) svg += `<text x="${p[0]}" y="${p[1] + 0.3}" style="font-size:${st ? 4.2 : 3.8}px">${g + 1}</text>`;
      for (let k = 0; k < 3; k++) svg += `<circle cx="${p[0] - 2.6 + k * 2.6}" cy="${p[1] + r + 2.6}" r="0.8" fill="${Save.data.levels[g] && Save.data.levels[g].stars[k] ? '#ffd27a' : 'rgba(255,255,255,.14)'}"/>`;
      svg += `</g>`;
    });
    svg += `</svg>`;
    card.innerHTML = `<div class="info"><div class="num">${ch.roman}</div><h6>${ch.name}</h6><div class="desc">${ch.sub}</div><div class="cstat">★ ${chapterStars(ci)}/24 · ${ch.constellation}</div></div>${svg}<div class="lock">Önceki takımyıldızını tamamla</div>`;
    box.appendChild(card);
  });
  $('#mapTotal').textContent = `★ ${Save.totalStars()}/${STORY_LEVELS * 3}`;
  const endOk = un >= 16, dayOk = un >= 4;
  $('#btnEndless').classList.toggle('lockd', !endOk); $('#btnDaily').classList.toggle('lockd', !dayOk);
  $('#endlessInfo').textContent = endOk ? (Save.data.endlessBest ? `En iyi ${Save.data.endlessBest}` : 'Yeni') : '16. adada açılır';
  $('#theaterInfo').textContent = `${(Save.data.theater || []).length}/${ST_FIGS.length}`;
  $('#dailyInfo').textContent = dayOk ? (Save.data.daily.date === dateNum() ? `★ ${Save.data.daily.stars}/3` : 'Bugün') : '4. adada açılır';
  const sk = $('#skins'); sk.innerHTML = '<span>Zifir</span>';
  SKINS.forEach((s, i) => {
    const ok = i === 0 || chapterStars(i - 1) === 24;
    const b = document.createElement('button'); b.className = 'skin tap' + (Save.data.skin === i ? ' sel' : '') + (ok ? '' : ' locked'); b.style.setProperty('--c', s.c); b.style.pointerEvents = 'auto'; b.title = ok ? s.name : `${CHAPTERS[i - 1].name}: 24 yıldız`;
    b.addEventListener('click', () => { if (!ok) { toast(`<em>${s.name}</em> — ${CHAPTERS[i - 1].name} takımyıldızındaki 24 yıldızı topla.`, 2.8); return; } audio.ui(); Save.data.skin = i; Save.save(); zifir.setSkin(i); buildMap(); if (SkyMap.inited) SkyMap.refresh(); });
    sk.appendChild(b);
  });
}
function refreshToggles() {
  const names = { auto: 'Otomatik', low: 'Düşük', mid: 'Orta', high: 'Yüksek', ultra: 'Ultra' };
  $$('[data-set]').forEach((el) => {
    const k = el.dataset.set, s = Save.data.settings;
    const v = k === 'quality' ? names[s.quality] + (s.quality === 'auto' ? ` · ${QUALITY[Perf.level].name}` : '') : s[k] ? 'Açık' : 'Kapalı';
    el.querySelector('b').textContent = v; el.classList.toggle('off', k !== 'quality' && !s[k]);
  });
}
$$('[data-set]').forEach((el) => el.addEventListener('click', () => {
  const k = el.dataset.set, s = Save.data.settings;
  if (k === 'quality') {
    const order = ['auto', 'low', 'mid', 'high', 'ultra']; s.quality = order[(order.indexOf(s.quality) + 1) % order.length];
    Perf.auto = s.quality === 'auto'; Perf.scale = 1; Perf.ups = 0;
    if (Perf.auto) Perf.init(); else Perf.level = { low: 0, mid: 1, high: 2, ultra: 3 }[s.quality];
    applyQuality();
  } else { s[k] = !s[k]; if (k === 'sfx') audio.setSfx(s[k]); if (k === 'music') audio.setMusic(s[k]); if (k === 'haptics' && s[k]) haptic(20); }
  Save.save(); audio.ui(); refreshToggles();
}));
const bind = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); audio.unlock(); fn(e); });
bind('#btnPlay', () => { audio.ui(); UI.hide('title'); const g = Math.min(Save.data.unlocked, STORY_LEVELS - 1); startStory(g); });
bind('#btnMapT', () => openMap());
bind('#btnSetT', () => { audio.ui(); refreshToggles(); UI.show('settings'); });
bind('#btnSetClose', () => { audio.ui(); UI.hide('settings'); });
let resetArm = 0;
bind('#btnReset', (e) => {
  if (performance.now() - resetArm > 3000) { resetArm = performance.now(); e.target.textContent = 'Emin misin? Tekrar dokun'; setTimeout(() => (e.target.textContent = 'İlerlemeyi sıfırla'), 3000); return; }
  const settings = Save.data.settings; Save.data = Save.defaults(); Save.data.settings = settings; Save.save(); zifir.setSkin(0);
  e.target.textContent = 'Sıfırlandı'; setTimeout(() => location.reload(), 500);
});
bind('#btnPause', () => { audio.ui(); pause(); });
bind('#btnResume', () => { audio.ui(); resume(); });
bind('#btnRestart', () => { audio.ui(); UI.hide('pause'); G.state = 'fail'; retry(); });
bind('#btnMapP', () => { UI.hide('pause'); openMap(); });
bind('#btnNext', () => nextFromComplete());
bind('#btnRetryC', () => { audio.ui(); retry(true); });
bind('#btnMapC', () => openMap());
bind('#btnRetry', () => { audio.ui(); retry(); });
bind('#btnHint', () => { audio.ui(); G.hint = true; retry(); toast('Soluk <em>hayalet güneşi</em> takip et.', 3); });
bind('#btnMapF', () => openMap());
bind('#btnMapBack', () => {
  audio.ui(); audio.whoosh(false, 0.6, 0.05); $('#fader').classList.add('on');
  setTimeout(() => {
    UI.hide('map');
    G.state = 'title'; G.stateT = 99; G.mode = 'story'; G.userSun = true; $('#hud').classList.remove('endless');
    $('#btnPlay').textContent = Save.data.unlocked > 0 ? 'Devam Et' : 'Başla'; UI.show('title');
    requestAnimationFrame(() => requestAnimationFrame(() => $('#fader').classList.remove('on')));
  }, 260);
});
bind('#filmSkip', () => { audio.unlock(); Film.skip(); });
bind('#mpPlay', () => { const ci = Math.round(SkyMap.tf); if (Save.data.unlocked < ci * 8) { audio.clunk(); toast('Önce bir önceki <em>takımyıldızını</em> tamamla.', 2.4); return; } SkyMap.pick(SkyMap.playG); });
const openTheater = (from) => { audio.ui(); hideToast(); $('#fader').classList.add('on'); setTimeout(() => { Theater.open(from); requestAnimationFrame(() => requestAnimationFrame(() => $('#fader').classList.remove('on'))); }, 260); };
bind('#btnTheater', () => openTheater('map'));
bind('#btnTheaterT', () => openTheater('title'));
bind('#thBack', () => { audio.ui(); $('#fader').classList.add('on'); setTimeout(() => { Theater.close(); requestAnimationFrame(() => requestAnimationFrame(() => $('#fader').classList.remove('on'))); }, 260); });
bind('#thExit', () => $('#thBack').click());
bind('#thReplay', () => Theater.replay());
bind('#thHint', () => Theater.hint());
bind('#thNext', () => { Theater.cardShown = false; Theater.next(); });
bind('#mapPrev', () => { audio.ui(); SkyMap.go(Math.round(SkyMap.tf) - 1); });
bind('#mapNext', () => { audio.ui(); SkyMap.go(Math.round(SkyMap.tf) + 1); });
let wheelT = 0;
canvas.addEventListener('wheel', (e) => { if (G.state !== 'map') return; const now = performance.now(); if (now - wheelT < 380) return; wheelT = now; SkyMap.go(Math.round(SkyMap.tf) + Math.sign(e.deltaY || e.deltaX)); }, { passive: true });
bind('#btnEndless', () => { if (Save.data.unlocked < 16) { toast('Sonsuz Gün <em>16. adayı</em> tamamlayınca açılır.', 2.6); return; } audio.ui(); startEndless(); });
bind('#btnDaily', () => { if (Save.data.unlocked < 4) { toast('Günün Adası <em>4. adayı</em> tamamlayınca açılır.', 2.6); return; } audio.ui(); startDaily(); });
bind('#btnEndOk', () => openMap());
bind('#btnHowT', () => { audio.ui(); TUT.show('title'); });
bind('#btnHowS', () => { audio.ui(); TUT.show('settings'); });
bind('#btnHowP', () => { audio.ui(); TUT.show('pause'); });
$('#eclipseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); triggerEclipse(); });
$('#dashBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); if (!act.dash() && G.state === 'play') { const b = $('#dashBtn'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } });

/* =====================================================================
   BOYUT, KALİTE, ANA DÖNGÜ, AÇILIŞ
   ===================================================================== */
function onResize() {
  const w = innerWidth, h = innerHeight, Q = Perf.Q;
  let dpr = Math.min(window.devicePixelRatio || 1, Q.dpr) * Perf.scale;
  if (w * h * dpr * dpr > Q.maxPix) dpr = Math.sqrt(Q.maxPix / (w * h));
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.build(v.x, v.y, Q);
  camera.aspect = w / h; camera.updateProjectionMatrix(); SkyMap.resize(w, h); Theater.resize(w, h);
  if (G.lv) Cam.fit(G.lv);
  fxAdd.u.uPx.value = fxMix.u.uPx.value = v.y / (2 * Math.tan(deg(camera.fov / 2)));
}
function applyQuality() {
  const Q = Perf.Q;
  setShadowSize(Q.shadow); buildSeaMat(Q.cloudOct); setParticleCap(Q.particles);
  post.u.uFlare.value = Q.flare;
  if (G.view && G.view.grass) G.view.grass.count = Math.min(G.view.grass.count, Q.grass);
  onResize();
}
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(onResize, 120); });
let lastT = performance.now(), frameNo = 0, renderedFrames = 0, errShown = false;
function reportError(e) {
  console.error(e);
  if (errShown) return; errShown = true;
  $('#fader').classList.remove('on', 'soon');
  try { toast('Küçük bir aksaklık oldu — oyun devam ediyor.', 2.6); } catch (err) {}
}
addEventListener('error', (e) => reportError(e.error || e.message));
addEventListener('unhandledrejection', (e) => reportError(e.reason));
// grafik belleği dolarsa (mobil): sessizce yeniden başlat — ilerleme kayıtlı
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  const f = $('#fader'); f.classList.add('on');
  toast('Grafik belleği tazeleniyor…', 3);
  setTimeout(() => location.reload(), 900);
}, false);
function frame(now) {
  requestAnimationFrame(frame);
  const ms = now - lastT; lastT = now;
  if (document.hidden) return;
  const dtR = Math.min(0.05, Math.max(0, ms / 1000));
  Perf.sample(ms, now / 1000);
  let dt = dtR;
  if (G.hitStop > 0) { G.hitStop -= dtR; dt = 0; }
  if (G.slowT > 0) { G.slowT -= dtR; dt *= lerp(1, G.slowK, smoothstep(0, 0.2, G.slowT)); }
  if (G.state === 'paused') dt = 0;
  try { update(dt, dtR); TUT.update(dtR); } catch (e) { reportError(e); }
  audio.update(dtR, G.state === 'play');
  const onMap = G.state === 'map' && SkyMap.active, onTh = G.state === 'theater' && Theater.active;
  if (onMap) SkyMap.apply(); else if (onTh) Theater.apply();
  if (!window.__noRender && (!TUT.open || (frameNo++ & 1) === 0)) { try { post.render(onMap ? mapScene : onTh ? stScene : scene, onMap ? mapCam : onTh ? stCam : camera); renderedFrames++; } catch (e) { reportError(e); } }
  // güvenlik: geçiş perdesi takılı kalmasın
  const fd = $('#fader'); if (fd.classList.contains('on')) { fd.__t = (fd.__t || 0) + dtR; if (fd.__t > 3.5) { fd.classList.remove('on', 'soon'); fd.__t = 0; } } else fd.__t = 0;
}

/* =====================================================================
   AÇILIŞ FİLMİ — oyunun kendi 3B sahnesiyle çekilen ~5.6 sn'lik sinematik
   gece göğü → ada bulut denizinden yükselir → şafak: güneş pirinç yayda
   doğar, gerçek gölgeler adayı süpürür → tam tutulma → ışık döner → başlık
   Kamera yolu Catmull-Rom; telefon eğimi/fare ile hafif 3B paralaks.
   ===================================================================== */
const Tilt = { x: 0, y: 0, tx: 0, ty: 0, gyro: false };
addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; Tilt.gyro = true; Tilt.tx = clamp(e.gamma / 24, -1, 1); Tilt.ty = clamp((e.beta - 45) / 24, -1, 1); }, { passive: true });
addEventListener('pointermove', (e) => { if (Tilt.gyro || G.drag || e.pointerType === 'touch') return; Tilt.tx = (e.clientX / innerWidth - 0.5) * 2; Tilt.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
function crScalar(keys, t, get, settle) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const h = k2.t - k1.t, u = clamp01((t - k1.t) / h), p0 = get(k0), p1 = get(k1), p2 = get(k2), p3 = get(k3);
  const m1 = ((p2 - p0) / Math.max(1e-4, k2.t - k0.t)) * h, m2 = settle && i + 2 >= keys.length ? 0 : ((p3 - p1) / Math.max(1e-4, k3.t - k1.t)) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
}
const Film = {
  active: false, started: false, t: 0, dur: 5.6, keys: null, clouds: [], flashed: false, popped: false, uiShown: false,
  // motor ayağa kalkarken: sahneyi gece başlangıcına kur (henüz zaman akmaz)
  prepare() {
    const tp = Cam.title, T = tp.target;
    // yukarıdan, dönerek inen kamera (ufuk görünmez; ada bulut denizinden yükselir)
    this.keys = [
      { t: 0.0, x: 0, y: -2, z: 0, d: 2.75, p: deg(83), w: -1.45, f: tp.fov + 4 },
      { t: 1.6, x: 0, y: -1, z: 0, d: 2.35, p: deg(75), w: -0.98, f: tp.fov + 3 },
      { t: 3.0, x: 0, y: 0, z: 0, d: 1.62, p: deg(64), w: -0.46, f: tp.fov + 1 },
      { t: 4.3, x: 0, y: 0, z: 0, d: 1.17, p: tp.pitch + deg(3), w: -0.12, f: tp.fov },
      { t: 5.6, x: 0, y: 0, z: 0, d: 1, p: tp.pitch, w: 0, f: tp.fov },
    ];
    this.T = T.clone(); this.D = tp.dist;
    this.active = true; this.started = false; this.t = 0; this.flashed = false; this.popped = false; this.uiShown = false;
    G.state = 'film'; G.stateT = 0; G.userSun = false; G.zShown = false; zifir.g.visible = false;
    G.u = G.uT = 0; G.night = 0.72; G.ecl.amt = 0;
    if (G.view) G.view.introT = -0.15; // ada bulut denizinden hemen yükselmeye başlar
    Cam.cine = null; this.pose(0);
    orb.g.visible = false; arc1.g.visible = false; arc2.g.visible = orb2.g.visible = false;
  },
  // yükleme kartı kalkınca zaman akmaya başlar
  begin() { this.started = true; this.t0 = performance.now(); setTimeout(() => { if (this.active) $('#filmSkip').classList.add('on'); }, 900); },
  buildClouds() {
    const rng = new RNG(424242), T = this.T, D = this.D;
    const spots = [[-0.62, 0.42, 0.95], [-0.2, 0.3, 1.1], [-0.82, 0.2, 0.55], [0.18, 0.46, 0.8], [-0.45, 0.12, 1.35], [0.4, 0.24, 1.2], [-1.0, 0.5, 1.25]];
    for (const [sx, sy, sz] of spots) {
      const m = { parts: [] }, R = rng.range(2.6, 4.2);
      const puffs = [[0, 0, 0, R, 0.6], [R * 0.9, -0.2, rng.range(-0.5, 0.5), R * 0.72, 0.58], [-R * 0.85, -0.15, rng.range(-0.5, 0.5), R * 0.76, 0.6], [rng.range(-0.6, 0.6), 0.3, R * 0.6, R * 0.6, 0.6]];
      for (const p of puffs) m.parts.push({ dx: p[0], dy: p[1], dz: p[2], c: { r: p[3], sy: p[4] } });
      const g = buildCloud(m, rng);
      g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      g.position.set(T.x + sx * D, T.y + sy * D, T.z + sz * D); g.userData.base = g.position.clone(); g.userData.ph = rng.range(0, TAU);
      scene.add(g); this.clouds.push(g);
    }
  },
  clearClouds() {
    for (const g of this.clouds) { scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.clouds = [];
  },
  pose(t) {
    const K = this.keys, c = Cam.cur, T = this.T, D = this.D;
    c.target.set(T.x + crScalar(K, t, (k) => k.x * D, true), T.y + crScalar(K, t, (k) => k.y, true), T.z + crScalar(K, t, (k) => k.z, true));
    c.dist = crScalar(K, t, (k) => k.d, true) * D; c.pitch = crScalar(K, t, (k) => k.p, true); c.yaw = crScalar(K, t, (k) => k.w, true); c.fov = crScalar(K, t, (k) => k.f, true);
  },
  update(dtR) {
    if (!this.active) return;
    // gerçek zaman saati: kare hızı düşük cihazlarda da film ~5.6 sn sürer
    if (this.started) this.t = Math.min(this.dur, (performance.now() - this.t0) / 1000);
    const t = this.t, lv = G.lv;
    this.pose(t);
    // ışık senaryosu (gece güneş görünmez)
    const sunUp = t > 0.95, twin = !!(lv && lv.sun.twin);
    orb.g.visible = sunUp; arc1.g.visible = sunUp; arc2.g.visible = orb2.g.visible = twin && sunUp;
    G.night = 0.72 * (1 - smoothstep(0.8, 2.6, t)); // mavi saat → şafak
    G.u = G.uT = lerp(0, 0.44, Ease.outCubic(clamp01((t - 1.0) / 2.6)));
    const e = smoothstep(3.55, 3.95, t) * (1 - smoothstep(4.55, 5.05, t));
    G.ecl.amt = e;
    U.uNightAmt.value = Math.max(G.night, e * 0.72); U.uNightR.value = 999; U.uNightRim.value = 0;
    // tutulmada Zifir karanlıkta belirir
    if (t > 3.9 && !this.popped) { this.popped = true; popZifir(); }
    if (G.zShown && G.zPop < 1) { G.zPop = Math.min(1, G.zPop + dtR / 0.7); zifir.g.scale.setScalar(Math.max(0.001, Ease.outElastic(G.zPop))); }
    if (G.zShown) { pathAt(lv.path, 0, PA); zifir.update(dtR, { x: PA.x, z: PA.z, yaw: Math.atan2(PA.tx, PA.tz), moving: false, speed: 0, burn: 0, meter: 1, look: camera.position, mood: e > 0.5 ? 1 : 0 }); }
    if (e > 0.6 && Math.random() < dtR * 18) { const p = orb.g.position; FX.sparkle(p.x + (Math.random() - 0.5) * 2.4, p.y + (Math.random() - 0.5) * 2.4, p.z, [1.5, 1.4, 2.6], 0.3); }
    // elmas yüzük: ışık geri döner
    if (t > 4.62 && !this.flashed) {
      this.flashed = true; G.flash = 0.55; G.flashCol.set(1.0, 0.86, 0.62); G.trauma = Math.max(G.trauma, 0.14);
      const p = orb.g.position; FX.burst(p.x, p.y, p.z, 36, { add: true, c: [2.6, 2.2, 1.6], a: 1, s: 0.24, s1: 0.03, life: 1.0, sp: 5, drag: 1.6, t: 2 });
    }
    // bulutlar: geceden şafağa renklenir, kamera içlerinden geçer, sonra dağılır
    const fade = 1 - smoothstep(2.9, 4.1, t);
    for (const g of this.clouds) {
      const u = g.userData; g.position.set(u.base.x + Math.sin(U.uTime.value * 0.25 + u.ph) * 0.6, u.base.y + Math.sin(U.uTime.value * 0.4 + u.ph) * 0.25, u.base.z);
      const m = g.userData.mat; if (m) m.opacity = 0.9 * fade * smoothstep(0, 0.35, t + 0.35);
      g.visible = fade > 0.01;
    }
    if (t > 4.85 && !this.uiShown) { this.uiShown = true; this.showUi(); }
    if (t >= this.dur) this.finish();
  },
  showUi() { $('#filmSkip').classList.remove('on'); if (!Save.seen('tutorial')) setTimeout(() => TUT.show('boot'), 500); else UI.show('title'); },
  skip() {
    if (!this.active || !this.started) return;
    audio.whoosh(true, 0.5, 0.05);
    this.t = this.dur; this.t0 = performance.now() - this.dur * 1000; this.flashed = true;
    if (!this.popped) { this.popped = true; popZifir(); G.zPop = 1; zifir.g.scale.setScalar(1); }
    this.update(0);
  },
  finish(external) {
    if (!this.active) return;
    this.active = false; this.clearClouds(); orb.g.visible = true; arc1.g.visible = true;
    const tw = !!(G.lv && G.lv.sun.twin); arc2.g.visible = orb2.g.visible = tw;
    $('#filmSkip').classList.remove('on');
    if (external) return; // oyuncu filmi beklemeden bir moda geçti: yalnızca görselleri geri ver
    if (!this.uiShown) { this.uiShown = true; this.showUi(); }
    G.state = 'title'; G.stateT = 99; G.userSun = true; G.uT = G.u; G.night = 0; G.ecl.amt = 0; U.uNightAmt.value = 0;
    if (G.view) G.view.introT = Math.max(G.view.introT, 3.5);
    Cam.set(Cam.cur, Cam.title); refreshEnvSoon = 0.2;
  },
};
function popZifir() {
  const lv = G.lv; if (!lv) return;
  G.zShown = true; zifir.g.visible = true; zifir.g.scale.setScalar(0.001); G.zPop = 0; audio.pop(3);
  pathAt(lv.path, 0, PA); zifir.g.position.set(PA.x, 0, PA.z);
  FX.burst(PA.x, 0.2, PA.z, 12, { c: [0.03, 0.02, 0.06], a: 0.8, s: 0.15, s1: 0.4, life: 0.6, sp: 1.6, up: 1.4, g: -5, drag: 1 });
}

function bootGame() {
  applyQuality();
  const word = 'Gündönümü';
  $('#titleWord').innerHTML = [...word].map((c, i) => `<span class="ch" style="transition-delay:${0.35 + i * 0.07}s">${c}</span>`).join('');
  $('#btnPlay').textContent = Save.data.unlocked > 0 ? 'Devam Et' : 'Başla';
  const g = Math.min(Save.data.unlocked, STORY_LEVELS - 1);
  enterLevel(levelSpec(g), { title: true });
  G.state = 'title'; G.stateT = 0; G.night = 0;
  applyLighting(0); refreshEnv(); refreshEnvSoon = -1; // ortam haritası gündüz göğünden
  Film.prepare(); applyLighting(0);
  Cam.update(0, 0);
  try { renderer.compile(scene, camera); } catch (e) {}
  try { post.render(scene, camera); } catch (e) {} // efekt shader'ları şimdi derlensin (sonradan takılma olmasın)
  requestAnimationFrame((t) => { lastT = t; frame(t); });
  // yükleme kartı: motor hazır ve en az birkaç kare çizildikten sonra kalkar, film başlar
  const ld = $('#loader');
  const lift = () => {
    if (renderedFrames < 3 || performance.now() < 1100) { requestAnimationFrame(lift); return; }
    Film.begin(); ld.classList.add('off');
    setTimeout(() => { ld.style.display = 'none'; }, 1000);
  };
  requestAnimationFrame(lift);
}
// test/hata ayıklama kancası (görünmez)
window.__gd = {
  G, Save, Perf, levelSpec, buildLevel, STORY_LEVELS, scene, camera, post, U, renderer, TUT, Theater, SkyMap, Film, audio, stSfx, stApplause, ST_FIGS, THREE, stScene, stCam,
  start: (g) => startStory(g), auto: (on = true, dive = false) => { G.auto = on; G.autoDive = dive; }, noWisps: (on) => { window.__noWisps = on; }, act: () => ({ eaten: act.eaten, dives: act.dives, best: act.best }), setU: (u) => { G.uT = u; },
  step: (sec, h = 1 / 30) => { for (let t = 0; t < sec; t += h) { let dt = h; if (G.hitStop > 0) { G.hitStop -= h; dt = 0; } if (G.slowT > 0) { G.slowT -= h; dt *= G.slowK; } if (G.state === 'paused') dt = 0; update(dt, h); } },
  stats: () => ({ minMeter: G.minMeter, exp: G.expTotal, flawless: G.lv && G.lv.flawless, dropsTotal: G.lv && G.lv.drops.length, waited: G.waitT }),
  info: () => ({ state: G.state, u: G.u, s: G.s, len: G.lv && G.lv.length, meter: G.meter, T: G.T, drops: G.dropsGot, quality: Perf.level, scale: Perf.scale, ema: Perf.ema }),
};
bootGame();
</script>
</body>
</html>
