
/* =====================================================================
   OYUN — durum makinesi, kamera yönetmeni, giriş, arayüz, ana döngü
   ===================================================================== */
const G = {
  state: 'boot', mode: 'story', spec: null, lv: null, view: null, outView: null, chapIdx: 0, prevChap: 0, palT: 1,
  u: 0.0, uT: 0.0, uVel: 0, uSV: 0, drag: null, keyDir: 0, lastTick: -1,
  T: 0, s: 0, meter: 1, expTotal: 0, f: 0, burnEp: 0, epMin: 1, waiting: false,
  dropsGot: 0, combo: 0, ecl: { charge: 0, active: false, t: 0, amt: 0 },
  timeScale: 1, slowT: 0, slowK: 1, hitStop: 0, flash: 0, flashCol: new THREE.Color(1, 0.9, 0.7), trauma: 0, fovKick: 0, desat: 0, ca: 0,
  night: 0, nightR: 0, stateT: 0, introDur: 1.9, readyT: 0, hint: false, auto: false, nextHeart: 0, hapT: 0,
  endless: null, cache: new Map(), stars: [false, false, false], from: 'title', zifirScale: 1, beatT: 0,
};
const zifir = new Zifir();
const drops = new DropViews();
const L1 = new THREE.Vector3(), L2 = new THREE.Vector3(), PA = {};
const ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.8, 0.9, 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
ghost.scale.setScalar(2.2); scene.add(ghost);

/* ---------- arayüz yardımcıları ---------- */
const UI = {
  screens: ['title', 'complete', 'fail', 'pause', 'settings', 'map', 'ending'],
  show(id) { $('#' + id).classList.add('on'); },
  hide(id) { $('#' + id).classList.remove('on'); },
  hideAll() { for (const s of this.screens) this.hide(s); },
  hud(on) { $('#hud').classList.toggle('on', on); },
};
function haptic(p) { if (Save.data.settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
let toastTimer = 0;
function toast(html, dur = 3.2) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastTimer); if (dur > 0) toastTimer = setTimeout(() => t.classList.remove('on'), dur * 1000); }
function hideToast() { clearTimeout(toastTimer); $('#toast').classList.remove('on'); }
function tip(key, html, dur = 3.6) { if (Save.seen(key)) return false; Save.markSeen(key); toast(html, dur); return true; }
function banner(text, sub = '') { const b = $('#banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.classList.toggle('low', G.state === 'complete' && G.mode !== 'endless'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
const pops = [];
function popText(x, y, z, text) { const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; $('#pops').appendChild(el); pops.push({ el, p: new THREE.Vector3(x, y, z), t: 0 }); }
const _pv = new THREE.Vector3();
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt; p.p.y += dt * 0.9;
    _pv.copy(p.p).project(camera);
    const x = (_pv.x * 0.5 + 0.5) * innerWidth, y = (-_pv.y * 0.5 + 0.5) * innerHeight;
    const a = p.t < 0.15 ? p.t / 0.15 : 1 - Math.max(0, (p.t - 0.6) / 0.4);
    p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${1 + Math.max(0, 0.3 - p.t) * 1.5})`; p.el.style.opacity = a;
    if (p.t > 1) { p.el.remove(); pops.splice(i, 1); }
  }
}

/* ---------- kamera yönetmeni ---------- */
const Cam = {
  base: { target: new THREE.Vector3(0, 0, 0), dist: 34, pitch: deg(54), yaw: 0, fov: 46 },
  cur: { target: new THREE.Vector3(0, 0, 0), dist: 34, pitch: deg(54), yaw: 0, fov: 46 },
  cine: null, follow: new THREE.Vector3(), zoom: 1,
  set(o, pose) { o.target.copy(pose.target); o.dist = pose.dist; o.pitch = pose.pitch; o.yaw = pose.yaw; o.fov = pose.fov; },
  place(cam, pose) {
    const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
    cam.position.set(pose.target.x + Math.sin(pose.yaw) * cp * pose.dist, pose.target.y + sp * pose.dist, pose.target.z + Math.cos(pose.yaw) * cp * pose.dist);
    cam.fov = pose.fov; cam.updateProjectionMatrix(); cam.lookAt(pose.target);
  },
  solveFit(lv, o) {
    const aspect = innerWidth / innerHeight;
    const fov = aspect < 0.62 ? 50 : aspect < 1 ? 46 : 38;
    const pitch = deg(aspect < 1 ? 55 : 50);
    const pts = [];
    for (const ch of lv.chunks) for (let i = 0; i < ch.pts.length; i += 6) pts.push(new THREE.Vector3(ch.pts[i][0], 0, ch.pts[i][1]));
    pts.push(new THREE.Vector3(lv.gate.x, 2.4, lv.gate.z));
    const orbPts = [], v = new THREE.Vector3();
    for (const u of [0, 0.12, 0.3, 0.5, 0.7, 0.88, 1]) { orbPosInto(u, lv.sun.tilt, lv.sun.thMin, v); orbPts.push(v.clone().add(new THREE.Vector3(0, u === 0.5 ? 0.9 : 0.4, 0))); }
    if (lv.sun.twin) for (const u of [0, 0.5, 1]) { orbPosInto(u, lv.sun.tilt2, lv.sun.thMin2, v); orbPts.push(v.clone().add(new THREE.Vector3(0, 0.6, 0))); }
    const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500);
    const pose = { target: new THREE.Vector3(0, 0, 0.6), dist: 30, pitch, yaw: 0, fov };
    const bounds = (P) => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of P) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { x0, x1, y0, y1 }; };
    const up = new THREE.Vector3(0, Math.cos(pitch), -Math.sin(pitch));
    for (let it = 0; it < 48; it++) {
      this.place(cam, pose); cam.updateMatrixWorld();
      const b = bounds(pts), q = bounds(orbPts);
      const top = Math.max(b.y1, q.y1), bottom = b.y0;
      const wx0 = o.wx0 ?? -1, wx1 = o.wx1 ?? 1, ww = (wx1 - wx0) / 2;
      const rX = Math.max((b.x1 - b.x0) / (2 * o.xI * ww), (q.x1 - q.x0) / (2 * o.xO * ww));
      const rY = (top - bottom) / (o.yTop - o.yBot);
      pose.dist *= Math.pow(Math.max(rX, rY), 0.7);
      const hh = Math.tan(deg(fov / 2)) * pose.dist;
      pose.target.addScaledVector(up, ((top + bottom) / 2 - (o.yTop + o.yBot) / 2) * hh * 0.6);
      pose.target.x += ((b.x0 + b.x1) / 2 - (wx0 + wx1) / 2) * hh * aspect * 0.5;
    }
    return pose;
  },
  fit(lv) {
    const port = innerWidth < innerHeight;
    this.set(this.base, this.solveFit(lv, { yTop: port ? 0.8 : 0.84, yBot: -0.9, xI: 0.9, xO: 0.99 }));
    const wide = innerWidth / innerHeight > 1.25;
    this.title = wide ? this.solveFit(lv, { yTop: 0.8, yBot: -0.86, xI: 0.92, xO: 0.98, wx0: -0.02, wx1: 0.96 }) : this.solveFit(lv, { yTop: port ? 0.5 : 0.56, yBot: port ? -0.62 : -0.72, xI: 0.86, xO: 0.97 });
  },
  cinema(to, dur, ease = Ease.inOutCubic) { this.cine = { from: { target: this.cur.target.clone(), dist: this.cur.dist, pitch: this.cur.pitch, yaw: this.cur.yaw, fov: this.cur.fov }, to, t: 0, dur, ease }; },
  pose(mod = {}) { const b = this.base; return { target: (mod.target || b.target).clone(), dist: mod.dist ?? b.dist, pitch: mod.pitch ?? b.pitch, yaw: mod.yaw ?? b.yaw, fov: mod.fov ?? b.fov }; },
  update(dt, dtR) {
    const c = this.cur;
    if (this.cine) {
      const k = this.cine; k.t += dtR; const e = k.ease(clamp01(k.t / k.dur)), to = typeof k.to === 'function' ? k.to() : k.to;
      c.target.lerpVectors(k.from.target, to.target, e); c.dist = lerp(k.from.dist, to.dist, e); c.pitch = lerp(k.from.pitch, to.pitch, e); c.yaw = lerp(k.from.yaw, to.yaw, e); c.fov = lerp(k.from.fov, to.fov, e);
      if (k.t >= k.dur && !k.hold) this.cine = null;
    } else {
      const ttl = G.state === 'title' && this.title, b = ttl ? this.title : this.base; const fz = G.state === 'play' || G.state === 'ready';
      const tx = b.target.x + this.follow.x * (fz ? 0.26 : 0), tz = b.target.z + this.follow.z * (fz ? 0.22 : 0);
      c.target.x = damp(c.target.x, tx, 3, dtR); c.target.y = damp(c.target.y, b.target.y, 3, dtR); c.target.z = damp(c.target.z, tz, 3, dtR);
      c.dist = damp(c.dist, b.dist * this.zoom, 2.5, dtR); c.pitch = damp(c.pitch, b.pitch, 3, dtR); c.fov = damp(c.fov, b.fov, 3, dtR);
      c.yaw = damp(c.yaw, b.yaw + clamp(G.uSV * 0.012, -0.03, 0.03) + Math.sin(U.uTime.value * 0.11) * 0.012, 4, dtR);
    }
    const pose = { target: c.target.clone(), dist: c.dist, pitch: c.pitch, yaw: c.yaw, fov: c.fov + G.fovKick };
    const tr = G.trauma * G.trauma, t = U.uTime.value;
    if (tr > 0.0001) { pose.target.x += Math.sin(t * 47.1) * tr * 0.3; pose.target.y += Math.sin(t * 39.3 + 1.7) * tr * 0.25; pose.target.z += Math.sin(t * 43.7 + 4.1) * tr * 0.3; }
    this.place(camera, pose);
    if (tr > 0.0001) camera.rotateZ(Math.sin(t * 31.0) * tr * 0.02);
  },
};

/* ---------- palet & güneş ---------- */
const _ca = new THREE.Color(), _cb = new THREE.Color(), _cc = new THREE.Color();
const NIGHT = { zen: new THREE.Color('#070618'), hor: new THREE.Color('#2a2152'), below: new THREE.Color('#151230'), sea: new THREE.Color('#0d0b22') };
function palColor(pal, a, b, k, out) { _ca.set(pal[a]); _cb.set(pal[b]); return out.copy(_ca).lerp(_cb, k); }
function skyColors(pal, k, out) {
  palColor(pal, 'skyLowZ', 'skyHighZ', k, out.zen); palColor(pal, 'skyLowH', 'skyHighH', k, out.hor); palColor(pal, 'belowLow', 'belowHigh', k, out.below);
  palColor(pal, 'sunLow', 'sunHigh', k, out.sun); out.deep.set(pal.seaDeep); out.hemiS.set(pal.hemiSky); out.hemiG.set(pal.hemiGround); return out;
}
const SC = () => ({ zen: new THREE.Color(), hor: new THREE.Color(), below: new THREE.Color(), sun: new THREE.Color(), deep: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color() });
const scA = SC(), scB = SC();
function applyLighting(dt) {
  const lv = G.lv; if (!lv) return;
  sunDirs(G.u, lv.sun, L1, L2);
  const e = Math.asin(clamp(L1.y, 0, 1)), eMax = PI / 2 - lv.sun.tilt;
  const k = smoothstep(0.08, 0.92, Math.sin(e) / Math.sin(eMax));
  skyColors(lv.chap.pal, k, scA);
  if (G.palT < 1 && G.prevPal) { skyColors(G.prevPal, k, scB); for (const key in scA) scA[key].lerp(scB[key], 1 - Ease.inOutSine(G.palT)); }
  const night = G.night, ecl = G.ecl.amt;
  // gökyüzü
  skyU.uZen.value.copy(scA.zen).lerp(NIGHT.zen, Math.max(night, ecl * 0.75));
  skyU.uHor.value.copy(scA.hor).lerp(NIGHT.hor, Math.max(night, ecl * 0.85));
  skyU.uBelow.value.copy(scA.below).lerp(NIGHT.below, Math.max(night * 0.9, ecl * 0.85));
  skyU.uSunDir.value.copy(L1); skyU.uSunCol.value.copy(scA.sun);
  skyU.uTwin.value = lv.sun.twin ? 1 : 0; skyU.uSun2Dir.value.copy(L2);
  skyU.uStars.value = Math.max(night, ecl * 0.85); skyU.uEclipse.value = ecl; skyU.uNight.value = night;
  const aur = (lv.chap.key === 'buz' ? 0.45 + night * 0.55 : 0) + (G.state === 'ending' ? night * 0.9 : 0);
  skyU.uAurora.value = damp(skyU.uAurora.value, Math.max(aur, ecl * (lv.chap.key === 'buz' ? 1 : 0)), 2, dt);
  const nE = Math.max(night, ecl * 0.8);
  seaU.uLit.value.copy(scA.below).multiplyScalar(1.12).lerp(NIGHT.sea, nE * 0.6); seaU.uDeep.value.copy(scA.deep).lerp(NIGHT.sea, nE);
  U.uFogCol.value.copy(skyU.uHor.value); U.uBelowCol.value.copy(skyU.uBelow.value);
  // ışıklar
  sunLight.position.copy(L1).multiplyScalar(60); sunLight.target.position.set(0, 0, 0);
  sunLight.color.copy(scA.sun);
  const LK = lv.chap.light || { sun: 1, hemi: 1 };
  sunLight.intensity = 3.9 * LK.sun * lerp(0.7, 1, smoothstep(0.05, 0.5, Math.sin(e))) * (1 - ecl * 0.94);
  sunLight.intensity *= 1 + flare.k * 0.5;
  if (lv.sun.twin) { sunLight2.position.copy(L2).multiplyScalar(60); sunLight2.target.position.set(0, 0, 0); sunLight2.intensity = 2.0 * (1 - ecl * 0.94); sunLight.intensity *= 0.8; }
  hemi.color.copy(scA.hemiS).lerp(_cc.set('#3a4a9a'), ecl * 0.7); hemi.groundColor.copy(scA.hemiG).lerp(_cc.set('#1a1830'), ecl * 0.7);
  hemi.intensity = lerp(0.62, 0.85, k) * LK.hemi * (1 - ecl * 0.55);
  // küreler
  orbPosInto(G.u, lv.sun.tilt, lv.sun.thMin, orb.g.position);
  orb.u.uCol.value.copy(scA.sun).lerp(_cc.set('#fff4dc'), 0.4);
  orb.halo.material.color.copy(scA.sun).multiplyScalar(2.2 * (1 - ecl * 0.9) * (1 - night));
  orb.rays.material.color.copy(scA.sun).multiplyScalar((1.5 + flare.k * 2.5 + flare.warnK * (0.8 + Math.sin(U.uTime.value * 18) * 0.8)) * (1 - ecl) * (1 - night)); orb.rays.material.rotation += dt * (0.05 + flare.k * 0.8);
  orb.u.uEclipse.value = Math.max(ecl * 0.97, night);
  orb.moon.visible = ecl > 0.01; orb.moon.position.set((1 - ecl) * 1.3, (1 - ecl) * 0.4, 0.2); orb.moon.quaternion.copy(camera.quaternion);
  orb.corona.material.opacity = ecl * 0.95; orb.corona.material.rotation -= dt * 0.1; orb.corona.scale.setScalar(6 + Math.sin(U.uTime.value * 3) * 0.3);
  G.orbS = damp(G.orbS || 1, G.drag ? 1.14 : 1, 12, dt);
  orb.g.scale.setScalar(lerp(1, 0.6, night) * G.orbS * (1 - (G.orbPulse || 0) * 0.18));
  if (lv.sun.twin) {
    orbPosInto(1 - G.u, lv.sun.tilt2, lv.sun.thMin2, orb2.g.position);
    orb2.u.uEclipse.value = Math.max(ecl, night); orb2.halo.material.color.set(SUN2_COLOR).multiplyScalar(2 * (1 - ecl) * (1 - night)); orb2.rays.material.color.set(SUN2_COLOR).multiplyScalar(1.2 * (1 - ecl) * (1 - night));
  }
  // post
  const pu = post.u;
  _pv.copy(orb.g.position).project(camera);
  pu.uSunUV.value.set(_pv.x * 0.5 + 0.5, _pv.y * 0.5 + 0.5);
  pu.uSunVis.value = (_pv.z < 1 ? 1 : 0) * (1 - ecl) * (1 - night) * smoothstep(1.25, 0.9, Math.max(Math.abs(_pv.x), Math.abs(_pv.y)));
  pu.uFlareCol.value.copy(scA.sun).multiplyScalar(0.8);
  post.rays.uniforms.uSun.value.copy(pu.uSunUV.value);
  if (lv.sun.twin) { _pv.copy(orb2.g.position).project(camera); post.rays.uniforms.uSun2.value.set(_pv.x * 0.5 + 0.5, _pv.y * 0.5 + 0.5); }
  post.rays.uniforms.uSun2On.value = lv.sun.twin ? 1 : 0;
  zifir.u.uSunDir.value.copy(L1); zifir.u.uSunCol.value.copy(scA.sun);
  const g = lv.chap.pal.grade;
  pu.uLift.value.set(...g.lift); pu.uGamma.value.set(...g.gamma); pu.uGain.value.set(...g.gain);
  pu.uSat.value = g.sat; pu.uContrast.value = g.contrast;
}

/* ---------- seviye yönetimi ---------- */
function specKey(spec) { return spec.kind + ':' + spec.seed + ':' + spec.g + ':' + (spec.n ?? ''); }
function getLevel(spec) {
  const k = specKey(spec);
  if (G.cache.has(k)) { const lv = G.cache.get(k); G.cache.delete(k); return lv; }
  return buildLevel(spec);
}
function prebuild(spec) { const k = specKey(spec); if (!G.cache.has(k)) { const lv = buildLevel(spec); if (lv) G.cache.set(k, lv); } while (G.cache.size > 2) G.cache.delete(G.cache.keys().next().value); }
function resetRun() {
  const lv = G.lv;
  G.T = 0; G.s = 0; G.meter = 1; G.minMeter = 1; G.waitT = 0; G.expTotal = 0; G.f = 0; G.burnEp = 0; G.epMin = 1; G.waiting = false; G.dropsGot = 0; G.combo = 0;
  G.ecl.active = false; G.ecl.t = 0; G.ecl.amt = 0; G.ecl.charge = lv.spec.eclipse ? 1 : 0;
  G.timeScale = 1; G.slowT = 0; G.hitStop = 0; G.trauma = 0; G.desat = 0; G.ca = 0; G.readyT = 0;
  for (const d of lv.drops) { d.hp = 1; d.state = 0; d.awake = false; d.lit = false; }
  for (const br of lv.bridges) { br.active = false; br.lock = false; br.onT = 0; br.offT = 0; }
  for (const c of lv.crystals) { c.lit = false; c.glow = 0; }
  updateMovers(lv, 0);
  drops.build(lv.drops);
  wisps.reset(lv); flare.reset(); act.reset();
  clearPrints(); fxAdd.clear(); fxMix.clear();
  zifir.reset();
  pathAt(lv.path, 0, PA); zifir.g.position.set(PA.x, 0, PA.z); zifir.yaw = Math.atan2(PA.tx, PA.tz);
  updateHud(true);
}
function setChapterLook(lv) {
  const ch = lv.chap;
  if (G.chapIdx !== lv.spec.ch || !arc1.mesh) { G.prevPal = G.lv ? G.lv.chap.pal : null; G.palT = G.prevPal ? 0 : 1; }
  G.chapIdx = lv.spec.ch;
  arc1.build(lv.sun.tilt, lv.sun.thMin);
  arc2.g.visible = orb2.g.visible = lv.sun.twin;
  if (lv.sun.twin) arc2.build(lv.sun.tilt2, lv.sun.thMin2, true);
  if (sunLight2.castShadow !== lv.sun.twin) { sunLight2.castShadow = lv.sun.twin; sunLight2.visible = lv.sun.twin; }
  audio.setChapter(lv.spec.ch);
  if (G.farChap !== lv.spec.ch) { G.farChap = lv.spec.ch; buildFarIslands(lv.chap); }
  birds.mesh.material.uniforms.uCol.value.set(lv.spec.ch === 4 ? '#2a1d4a' : '#2b2433');
}
function enterLevel(spec, opts = {}) {
  hideToast();
  const lv = getLevel(spec);
  if (!lv) { toast('Ada oluşturulamadı. Tekrar dene.'); return; }
  if (G.view) { if (G.outView) G.outView.dispose(); G.outView = G.view; G.outT = 0; }
  G.spec = spec; setChapterLook(lv); G.lv = lv;
  G.view = new IslandView(lv);
  try { renderer.compile(scene, camera); } catch (e) {}
  resetRun();
  zifir.g.visible = false;
  Cam.fit(lv);
  G.state = 'intro'; G.stateT = 0; G.userSun = false; G.zShown = false; G.zPop = 0;
  G.introDur = opts.title ? 3.2 : spec.kind === 'story' && spec.i === 0 && !opts.quick ? 3.0 : 2.0;
  G.u = G.uT = 0.0; G.uSV = 0;
  refreshEnvSoon = 0.3;
  renderer.shadowMap.needsUpdate = true;
  audio.rise();
  if (opts.title) {
    const tp = Cam.title;
    Cam.set(Cam.cur, { target: tp.target.clone().add(new THREE.Vector3(0, 10, -8)), dist: tp.dist * 2.4, pitch: deg(78), yaw: 0, fov: tp.fov });
    Cam.cinema({ target: tp.target.clone(), dist: tp.dist, pitch: tp.pitch, yaw: 0, fov: tp.fov }, 3.2, Ease.inOutCubic);
  } else if (!opts.keepCam) {
    Cam.cinema(Cam.pose({ dist: Cam.base.dist * 1.25, pitch: Cam.base.pitch + deg(6) }), 0.6, Ease.outCubic);
    setTimeout(() => { if (G.lv === lv) Cam.cinema(Cam.pose(), 1.4, Ease.inOutCubic); }, 600);
  }
  if (spec.kind === 'story' && spec.i === 0 && !opts.title) showChapterCard(lv.chap);
  updateHud(true);
  if (window.__gdHook) window.__gdHook('enter', lv);
}
let refreshEnvSoon = -1;
function showChapterCard(ch) {
  $('#ccNum').textContent = ch.roman; $('#ccTitle').textContent = ch.name; $('#ccSub').textContent = ch.hint;
  const c = $('#chapterCard'); c.classList.add('on'); setTimeout(() => c.classList.remove('on'), 2700);
}
function startPlay() {
  if (G.state !== 'ready') return;
  G.state = 'play'; G.stateT = 0; hideToast();
  zifir.kick(1.6); audio.whoosh(true, 0.35, 0.05);
  const lv = G.lv, g = lv.spec.g;
  if (g === 0) setTimeout(() => { if (G.state === 'play') tip('t-keep', 'Zifir ışıkta <em>buharlaşır</em>.<br>Gölgeyi onun üstüne düşür.', 3.6); }, 900);
  if (lv.drops.length && g >= 1) setTimeout(() => { if (G.state === 'play') tip('t-drops', 'Gece damlaları Zifir yaklaşınca <em>uyanır</em> — ışıkta erirler.', 4); }, 2500);
  if (lv.spec.eclipse && g >= 3) setTimeout(() => { if (G.state === 'play') tip('t-eclipse', '<em>Tutulma</em>: 2 saniyelik karanlık. Damlalar onu yeniden doldurur.', 4.2); }, 1200);
  if (lv.props.some((p) => p.arch) && g >= 1) setTimeout(() => { if (G.state === 'play') tip('t-arch', 'Çardak altı güvenli — ama <em>alçak güneş</em> yandan sızar.', 3.8); }, 4200);
  if (lv.spec.features.clouds) tip('t-clouds', '<em>Bulutların</em> gölgesini yakala — rüzgârla kayarlar.', 4);
  if (lv.spec.features.windmills && lv.movers.some((m) => m.kind === 'sails')) setTimeout(() => { if (G.state === 'play') tip('t-mill', 'Değirmen kanatları gölgeyi <em>böler</em>.', 3.5); }, 5000);
  if (lv.spec.features.balloons) tip('t-balloon', 'Balonlar yüksekte: <em>alçak güneş</em> gölgelerini uzağa savurur.', 4.2);
  if (lv.bridges.length) tip('t-bridge', 'Köprü yalnızca <em>kristal ışıktayken</em> belirir. Zifir bekler — ama gölgede tut!', 4.6);
  if (lv.spec.dash && g >= 2) setTimeout(() => { if (G.state === 'play') tip('t-dash', '<em>Dal</em>: Zifir bir an mürekkebe gömülür — ışık neredeyse işlemez. Sol alttaki düğme ya da ↑', 4.4); }, 1800);
  if (lv.sprites && lv.sprites.length) setTimeout(() => { if (G.state === 'play') tip('t-wisp', '<em>Işık perileri</em> Zifir’e süzülür: gölgedeyken ya da <em>dalarken</em> yut, ışıkta yakar!', 4.6); }, Math.max(0, (lv.sprites[0].t - 1.2) * 1000));
  if (lv.flares) setTimeout(() => { if (G.state === 'play') tip('t-flare', '<em>Güneş patlaması</em>: uyarı çubuğu dolunca ışık iki kat yakar. Önceden gölgeye gir!', 4.4); }, Math.max(0, (lv.flares[0].w - 0.3) * 1000));
  if (lv.movers.some((m) => m.kind === 'melt')) tip('t-melt', '<em>Buz sütunları</em> güneşte erir — gölgeleri giderek kısalır.', 4.2);
  if (lv.mirrors && lv.mirrors.length) tip('t-mirror', '<em>Aynalar</em> güneşi yansıtır: yansıyan ışık gölge tanımaz. Huzmeyi Zifir’den uzak tut!', 4.8);
  if (lv.movers.some((m) => m.kind === 'orbit')) tip('t-gear', 'Dev <em>dişliler</em> döner: üstündeki kulelerin gölgesi saat gibi geri gelir.', 4.4);
  if (lv.movers.some((m) => m.kind === 'pendulum')) setTimeout(() => { if (G.state === 'play') tip('t-pend', '<em>Sarkaç</em> yol boyunca salınır — gölgesiyle aynı ritimde yürü.', 4.2); }, 3000);
  if (lv.sun.twin) tip('t-twin', 'İki güneş: <em>renkli gölge</em> yarı korur. Gerçek karanlık ikisinin kesişimi.', 4.6);
}
function retry(fromComplete = false) {
  if (G.mode === 'endless' && !fromComplete) { startEndless(); return; }
  UI.hide('fail'); UI.hide('complete'); UI.hud(true);
  resetRun();
  G.state = 'rewind'; G.stateT = 0; G.rewFrom = G.u;
  zifir.g.visible = true; zifir.g.scale.setScalar(0.001);
  Cam.cinema(Cam.pose(), 0.7, Ease.outCubic);
  audio.whoosh(false, 0.6, 0.08);
}
function failLevel() {
  if (G.state !== 'play') return;
  G.state = 'fail'; G.stateT = 0; G.fShown = false;
  G.hitStop = 0.12; G.slowT = 0.8; G.slowK = 0.3; G.trauma = 0.6; G.ca = 0.02; G.ecl.active = false;
  audio.setSizzle(0); audio.fail(); haptic([30, 40, 70]);
  const x = zifir.g.position.x, z = zifir.g.position.z;
  FX.burst(x, 0.35, z, 36, { c: [0.04, 0.03, 0.06], a: 0.7, s: 0.32, s1: 1.0, life: 1.4, sp: 2.2, up: 1, drag: 2.2, t: 1 });
  for (let i = 0; i < 22; i++) FX.ember(x, 0.35, z);
  Cam.cinema(Cam.pose({ target: new THREE.Vector3(x, 0.4, z), dist: Cam.base.dist * 0.55 }), 0.9, Ease.outCubic);
  if (G.mode === 'story') { const g = G.lv.spec.g; Save.data.fails[g] = (Save.data.fails[g] || 0) + 1; Save.save(); }
}
function showFail() {
  const lv = G.lv, pct = Math.round(clamp01(G.s / lv.length) * 100);
  const lines = ['Zifir buharlaştı', 'Güneş acımasızdı', 'Gölge yetmedi', 'Biraz daha karanlık…'];
  if (G.mode === 'endless') {
    const e = G.endless;
    $('#fTitle').textContent = 'Sonsuz Gün bitti';
    $('#fSub').textContent = `${e.n} ada · ${e.score} puan · En iyi ${Math.max(Save.data.endlessBest, e.score)}`;
    if (e.score > Save.data.endlessBest) { Save.data.endlessBest = e.score; Save.data.endlessBestIslands = e.n; Save.save(); $('#fSub').textContent = `${e.n} ada · ${e.score} puan · Yeni rekor!`; }
    $('#fProg').style.width = '100%';
  } else {
    $('#fTitle').textContent = lines[(Save.data.fails[lv.spec.g] || 0) % lines.length];
    $('#fSub').textContent = `Yol · %${pct}`;
    $('#fProg').style.width = '0%'; requestAnimationFrame(() => { $('#fProg').style.width = pct + '%'; });
  }
  $('#fail').classList.toggle('offerhint', G.mode === 'story' && (Save.data.fails[lv.spec.g] || 0) >= 3 && !G.hint);
  UI.hud(false); UI.show('fail');
}
function reachGate() {
  G.state = 'complete'; G.stateT = 0; G.compStage = 0; G.cSquash = false;
  setupCompleteCine();
  audio.setSizzle(0); hideToast();
  const lv = G.lv;
  G.stars = [true, G.dropsGot >= lv.drops.length, G.expTotal <= lv.flawless + 1e-6];
  if (G.mode === 'endless') {
    const e = G.endless, add = 100 + G.dropsGot * 25 + (G.stars[2] ? 60 : 0) + act.best * 15 + act.eaten * 20;
    e.score += add; e.n++; updateHud(true);
    setTimeout(() => banner('+' + add, G.stars[2] ? 'Lekesiz' : `Ada ${e.n}`), 700);
  }
}
function saveStory() {
  const lv = G.lv, g = lv.spec.g, d = Save.data;
  const prev = d.levels[g] || { stars: [false, false, false], bestExp: 99 };
  const ch = Math.floor(g / 8);
  const before = [0, 1, 2, 3, 4, 5, 6, 7].reduce((a, i) => a + Save.stars(ch * 8 + i), 0);
  d.levels[g] = { stars: prev.stars.map((s, i) => s || G.stars[i]), bestExp: Math.min(prev.bestExp, G.expTotal) };
  d.unlocked = Math.max(d.unlocked, Math.min(STORY_LEVELS - 1, g + 1));
  if (g === STORY_LEVELS - 1) d.finished = true;
  const after = [0, 1, 2, 3, 4, 5, 6, 7].reduce((a, i) => a + Save.stars(ch * 8 + i), 0);
  Save.save();
  return { chapterDone: g % 8 === 7, newSkin: before < 24 && after === 24 ? ch + 1 : 0 };
}
function showComplete() {
  const lv = G.lv, sp = lv.spec;
  let res = { chapterDone: false, newSkin: 0 };
  if (G.mode === 'story') res = saveStory();
  if (G.mode === 'daily') { const today = dateNum(); Save.data.daily = { date: today, stars: Math.max(Save.data.daily.date === today ? Save.data.daily.stars : 0, G.stars.filter(Boolean).length) }; Save.save(); }
  $('#cKicker').textContent = res.chapterDone ? `${lv.chap.constellation} takımyıldızı tamamlandı` : 'Gece düştü';
  $('#cTitle').textContent = G.mode === 'daily' ? 'Günün Adası' : `Ada ${sp.g + 1}`;
  $('#cSub').textContent = lv.chap.name;
  $('#st0').textContent = 'Kapıya ulaştı';
  $('#st1').textContent = lv.drops.length ? `Damlalar ${G.dropsGot}/${lv.drops.length}` : 'Damlalar';
  $('#st2').innerHTML = `Lekesiz<br>güneşte ${G.expTotal.toFixed(1)} / ${lv.flawless.toFixed(1)} sn`;
  const extra = []; if (act.best > 0) extra.push(`gölge serisi ×${act.best + 1}`); if (act.eaten > 0) extra.push(`${act.eaten} peri yutuldu`);
  $('#cSub').textContent = lv.chap.name + (extra.length ? ' · ' + extra.join(' · ') : '');
  $$('.star').forEach((el) => el.classList.remove('lit', 'shown'));
  const last = sp.g === STORY_LEVELS - 1;
  $('#btnNext').textContent = G.mode === 'daily' ? 'Gökyüzü' : last ? 'Final' : res.chapterDone ? 'Yeni takımyıldızı' : 'Sonraki Ada';
  $('#complete').classList.remove('ready');
  UI.hud(false); UI.show('complete');
  G.compRes = res;
  if (G.mode === 'story' && !last) setTimeout(() => { if (G.state === 'complete') prebuild(levelSpec(sp.g + 1)); }, 3800);
}
function nextFromComplete() {
  audio.ui();
  if (G.mode === 'daily') { openMap(); return; }
  const g = G.lv.spec.g;
  if (g === STORY_LEVELS - 1) { UI.hide('complete'); UI.show('ending'); G.state = 'ending'; return; }
  UI.hide('complete'); UI.hud(true);
  enterLevel(levelSpec(g + 1));
}

/* ---------- sonsuz gün & günün adası ---------- */
function dateNum() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function startEndless() {
  G.mode = 'endless'; G.endless = { n: 0, score: 0, seed: (Math.random() * 1e9) | 0 };
  UI.hideAll(); UI.hud(true); $('#hud').classList.add('endless');
  enterLevel(endlessSpec(0, G.endless.seed), { quick: true });
}
function startDaily() { G.mode = 'daily'; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless'); enterLevel(dailySpec(dateNum()), { quick: true }); }
function startStory(g) {
  const same = G.lv && G.lv.spec.kind === 'story' && G.lv.spec.g === g;
  if (!same) G.hint = false;
  G.mode = 'story'; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless');
  if (same && G.state === 'title') { G.state = 'ready'; G.readyT = 0; G.readyHint = false; G.uT = G.u; resetRun(); zifir.g.visible = !!G.zShown; updateHud(true); return; }
  if (same && (G.state === 'map' || G.state === 'ending')) { G.rewFrom = G.u; retry(true); return; }
  enterLevel(levelSpec(g));
}

/* ---------- HUD ---------- */
let hudCache = {};
function updateHud(force = false) {
  const lv = G.lv; if (!lv) return;
  const title = G.mode === 'endless' ? 'Sonsuz Gün' : G.mode === 'daily' ? 'Günün Adası' : `Ada ${lv.spec.g + 1}`;
  const sub = G.mode === 'endless' ? `${lv.chap.name} · ${G.endless.n + 1}. ada` : lv.chap.name;
  const dt = `${G.dropsGot}/${lv.drops.length}`;
  if (force || hudCache.title !== title) { $('#lvlTitle').textContent = title; hudCache.title = title; }
  if (force || hudCache.sub !== sub) { $('#lvlSub').textContent = sub; hudCache.sub = sub; }
  if (force || hudCache.drops !== dt) { $('#dropTxt').textContent = dt; hudCache.drops = dt; }
  if (G.endless && (force || hudCache.score !== G.endless.score)) { $('#scoreTxt').textContent = G.endless.score; hudCache.score = G.endless.score; }
  const eb = $('#eclipseBtn'), show = lv.spec.eclipse;
  if (force || hudCache.ecl !== show) { eb.classList.toggle('show', show); hudCache.ecl = show; }
  const p = Math.round(G.ecl.charge * 100) / 100;
  if (force || hudCache.p !== p) { eb.style.setProperty('--p', p); hudCache.p = p; }
  const ready = G.ecl.charge >= 1 && !G.ecl.active;
  if (force || hudCache.ready !== ready) { eb.classList.toggle('ready', ready); hudCache.ready = ready; }
}

/* ---------- tutulma ---------- */
function triggerEclipse() {
  if (G.state !== 'play' || G.ecl.active || G.ecl.charge < 1 || !G.lv.spec.eclipse) return;
  G.ecl.charge = 0; G.ecl.active = true; G.ecl.t = 0;
  audio.eclipse(); haptic(35); G.trauma = Math.max(G.trauma, 0.35); G.fovKick = -2.5;
  FX.burst(orb.g.position.x, orb.g.position.y, orb.g.position.z, 30, { add: true, c: [1.6, 1.5, 2.4], a: 1, s: 0.25, s1: 0.05, life: 1.2, sp: 4, drag: 1.5, t: 2 });
  updateHud();
}
