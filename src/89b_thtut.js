
/* =====================================================================
   GÖLGE TİYATROSU — anlatıcı, öğretici, fısıltılar
   Hayalî Usta oyunu sahnenin içinden anlatır: ışık halkası neye
   bakılacağını gösterir, hayalet el hamleyi yapar ve heykel elin
   altında gerçekten döner. Yeni bir hamle (eğme, yatırma, iki heykel)
   ilk kez geldiğinde kısa bir gösteri; oynarken sıcak-soğuk fısıltılar.
   ===================================================================== */
const TH_TUT = {
  base: [
    { spot: 'sculpt', t: 'Kandilin önünde süzülen şu kırıklar bir <em>heykel</em>. Her parça ışığın yolunda duruyor.' },
    { spot: 'wall', cam: 1, t: 'Işık heykelden geçip perdeye <em>gölge</em> düşürüyor. Şimdilik anlamsız bir leke…' },
    { spot: 'wall', cam: 1, hint: 1, t: 'Bu soluk altın çizgi, gölgenin <em>olması gereken</em> şekli. İçinde bir canlı uyuyor.' },
    { spot: 'sculpt', demo: 'h', t: 'Heykeli parmağınla <em>sağa sola sürükle</em>: döner, gölgesi de değişir.' },
    { play: 1, ghost: 'h', t: 'Şimdi sen dene. Gölgeyi altın çizginin içine oturtmaya çalış.', until: 'drag' },
    { play: 1, spot: 'meter', t: 'Alttaki <em>eşleşme</em> yükseliyorsa doğru yoldasın; düşüyorsa öbür yöne çevir.', until: 'rise', auto: 10 },
    { play: 1, t: 'Yaklaştıkça heykel ağırlaşır: <em>yavaşla</em>, sonra parmağını kaldır. Tam oturunca gölge canlanır!', auto: 6 },
  ],
  two: [
    { spot: 'g0', links: 1, t: 'Bu perdede <em>iki heykel</em> var. <span class="g0">Altın heykelin</span> gölgesi altın çizgiye oturur…' },
    { spot: 'g1', links: 1, t: '…<span class="g1">turkuaz heykelin</span> gölgesi de turkuaz çizgiye.' },
    { spot: 'chips', links: 1, t: 'Hangisine dokunursan o döner; <em>rozetlerine</em> dokunarak da seçebilirsin. Biri oturunca sıra ötekine geçer.' },
  ],
  tilt: [
    { spot: 'sculpt', demo: 'v', t: 'Bu heykel öne arkaya da eğilir: <em>yukarı aşağı</em> sürükle.' },
    { play: 1, ghost: 'v', t: 'Önce sağa sola çevir, sonra yukarı aşağı eğ. Yüzdeyi izle.', until: 'vdrag', auto: 12 },
  ],
  roll: [
    { spot: 'ring', demo: 'r', t: 'Yeni hamle: parmağını <em>halkanın dışında</em> daire çizer gibi gezdir, heykel yan yatar.' },
    { play: 1, ghost: 'r', t: 'İki parmakla çevirmek de olur. Ortadan sürüklemek yine <em>çevirir</em>.', until: 'roll', auto: 12 },
  ],
};
// metni kelime kelime belirt (etiketler korunur)
function thWords(el, html) {
  el.innerHTML = html; let n = 0;
  const walk = (node) => {
    for (const c of [...node.childNodes]) {
      if (c.nodeType !== 3) { walk(c); continue; }
      const f = document.createDocumentFragment();
      for (const p of c.textContent.split(/(\s+)/)) {
        if (!p) continue;
        if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(p)); continue; }
        const s = document.createElement('span'); s.className = 'w'; s.style.animationDelay = `${n++ * 34}ms`; s.textContent = p; f.appendChild(s);
      }
      c.replaceWith(f);
    }
  };
  walk(el); return n;
}
// ekranda bir heykelin merkezi ve yarıçapı (px)
function thSculptPx(T, G) {
  const [cx, cy] = T.gScreen(G), v = G.C.clone().add(new THREE.Vector3(0, G.rad, 0)).project(stCam);
  return [cx, cy, Math.max(64, Math.abs(((1 - v.y) / 2) * innerHeight - cy) * 1.3)];
}
const thProj = (p) => { const v = p.clone().project(stCam); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; };

const ThTut = {
  on: false, steps: [], i: -1, st: null, t: 0, keys: [],
  dom() {
    if (this.el) return;
    const r = this.el = $('#thTut');
    this.spotEl = r.querySelector('.spot'); this.handEl = r.querySelector('.hand'); this.bub = r.querySelector('.bub'); this.tx = r.querySelector('.tx'); this.nx = r.querySelector('.nx'); this.pg = r.querySelector('.pg');
    r.querySelector('.tcatch').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.tap(); });
    r.querySelector('.skip').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.ui(); this.stop(false); });
    this.sp = { x: innerWidth / 2, y: innerHeight / 2, w: 0, h: 0, r: 0 }; this.hp = { x: innerWidth / 2, y: innerHeight * 0.7, a: 0 };
  },
  start(keys) {
    this.dom(); const T = Theater, a = T.act;
    this.steps = [{ t: `${a.story} <b>“${a.riddle}…”</b>`, story: 1 }];
    for (const k of keys) for (const s of TH_TUT[k]) this.steps.push(Object.assign({ key: k }, s));
    this.keys = keys; this.on = true; this.i = -1; this.st = null;
    this.el.classList.add('on'); $('#thMsg').classList.remove('on'); ThWhisper.hide();
    const T0 = Theater.grp[Theater.sel] || Theater.grp[0]; if (T0) { const [x, y, r] = thSculptPx(T, T0); Object.assign(this.sp, { x, y, w: r * 4, h: r * 4, r: r * 2 }); }
    this.next();
  },
  frozen() { return this.on && !!this.st && !this.st.play; },
  cam() { return this.on && this.st && this.st.cam ? 1 : 0; },
  hideMeter() { return this.frozen() && this.st.spot !== 'meter'; },
  links() { return this.on && this.st && this.st.links; },
  next() {
    this.restore();
    if (this.st && this.st.key && !this.steps.slice(this.i + 1).some((s) => s.key === this.st.key)) this.mark(this.st.key);
    this.i++; if (this.i >= this.steps.length) { this.stop(false); return; }
    const s = this.st = this.steps[this.i], T = Theater; this.t = 0;
    const gi = s.spot === 'g1' ? 1 : s.spot === 'g0' ? 0 : -1;
    if (gi >= 0 && T.grp[gi]) { T.sel = gi; T.linkT = T.t; }
    this.G = T.grp[T.sel] && !T.grp[T.sel].lock ? T.grp[T.sel] : T.grp.find((g) => !g.lock) || T.grp[0];
    this.base = this.G ? { q: this.G.q.clone(), yaw: this.G.yaw, pitch: this.G.pitch } : null;
    this.pc0 = T.pcT || 0; this.d0 = T.dragSum; this.v0 = T.vdragSum; this.r0 = T.rollSum;
    thWords(this.tx, s.t);
    this.bub.classList.remove('in'); void this.bub.offsetWidth; this.bub.classList.add('in');
    this.el.classList.toggle('catch', !s.play); this.el.classList.toggle('play', !!s.play); this.el.classList.toggle('story', !!s.story); this.el.classList.toggle('nospot', !s.spot);
    this.nx.classList.remove('on'); this.pg.textContent = `${this.i + 1}/${this.steps.length}`;
    if (this.i > 0 && audio.ok) { const t0 = audio.t; audio.noiseHit(t0, 0.35, 0.025, { type: 'bandpass', f: 1800, f1: 900, q: 0.8, a: 0.08, verb: 0.3 }); }
  },
  tap() { if (!this.frozen() || this.t < 0.45) return; this.next(); },
  restore() { if (this.st && this.st.demo && this.G && this.base) { this.G.q.copy(this.base.q); this.G.yaw = this.base.yaw; this.G.pitch = this.base.pitch; } },
  mark(k) { const s = Save.data.thTut || (Save.data.thTut = {}); if (!s[k]) { s[k] = 1; Save.save(); } },
  // silent: perde değişti (görülmüş sayılmaz)
  stop(silent) {
    if (!this.on) return; this.restore();
    if (!silent) for (const k of this.keys) this.mark(k);
    this.on = false; this.st = null; if (this.el) this.el.classList.remove('on', 'catch', 'play', 'story', 'nospot');
    if (!silent && Theater.state === 'play') ThWhisper.say('go', true);
  },
  hand(x, y, a, press) {
    const h = this.hp; h.x = x; h.y = y; h.a = damp(h.a, a, 10, 1 / 60);
    this.handEl.style.transform = `translate(${(x - 18).toFixed(1)}px, ${(y - 6).toFixed(1)}px)`; this.handEl.style.opacity = h.a.toFixed(3); this.handEl.classList.toggle('press', !!press);
  },
  setRot(G, ax, v) {
    const b = this.base, T = Theater;
    if (ax === 'r') { G.q.copy(b.q).premultiply(new THREE.Quaternion().setFromAxisAngle(T.axis, v)); return; }
    if (T.act.axes < 3) { G.yaw = b.yaw + (ax === 'y' ? v : 0); G.pitch = b.pitch + (ax === 'x' ? v : 0); G.q.setFromEuler(new THREE.Euler(G.pitch, G.yaw, 0, 'YXZ')); }
    else G.q.copy(b.q).premultiply(new THREE.Quaternion().setFromAxisAngle(ax === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), v));
  },
  // hareketin el yolu: h yatay, v dikey, r halka üstünde yay
  gesture(kind, ph, drive) {
    const T = Theater, G = this.G; if (!G) return null; const [cx, cy, r] = thSculptPx(T, G), sn = Math.sin(ph);
    if (kind === 'h') { if (drive) this.setRot(G, 'y', sn * 0.55); return [cx + sn * Math.min(95, r * 0.9), cy + r * 0.35]; }
    if (kind === 'v') { if (drive) this.setRot(G, 'x', sn * 0.4); return [cx + r * 0.3, cy + sn * Math.min(80, r * 0.8)]; }
    const R = T.ringR() + 10, a = -PI / 2 + sn * 0.9; if (drive) this.setRot(G, 'r', sn * 0.5); return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  },
  update(dt) {
    if (!this.el) return;
    const s = this.st, T = Theater;
    if (!this.on || !s || T.state !== 'play') { if (this.on && T.state !== 'play' && T.state !== 'intro') this.stop(true); return; }
    this.t += dt;
    if (s.hint) T.hintT = Math.max(T.hintT, 1.4);
    // ışık halkası
    let x = innerWidth / 2, y = innerHeight / 2, w = 0, h = 0, rr = 0;
    const G = this.G;
    if ((s.spot === 'sculpt' || s.spot === 'g0' || s.spot === 'g1') && G) { const [cx, cy, r] = thSculptPx(T, G); x = cx; y = cy; w = h = r * 2; rr = r; }
    else if (s.spot === 'ring' && G) { const [cx, cy] = T.gScreen(G), r = T.ringR() + 26; x = cx; y = cy; w = h = r * 2; rr = r; }
    else if (s.spot === 'wall') { const b = T.wallBB, [ax, ay] = thProj(new THREE.Vector3(T.WC.x + b[0], T.WC.y + b[1], ST_WZ)), [bx, by] = thProj(new THREE.Vector3(T.WC.x + b[2], T.WC.y + b[3], ST_WZ)); x = (ax + bx) / 2; y = (ay + by) / 2; w = Math.abs(bx - ax) + 44; h = Math.abs(by - ay) + 44; rr = Math.min(w, h) * 0.42; }
    else if (s.spot === 'meter' || s.spot === 'chips') {
      const els = s.spot === 'meter' ? [$('#thMeter')] : [...document.querySelectorAll('#thChips b')].filter((e) => e.classList.contains('on'));
      if (els.length) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const e of els) { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); } x = (x0 + x1) / 2; y = (y0 + y1) / 2; w = x1 - x0 + 22; h = y1 - y0 + 22; rr = Math.min(w, h) / 2; }
    }
    const sp = this.sp, k = 1 - Math.exp(-dt * 7);
    if (w > 0) { sp.x += (x - sp.x) * k; sp.y += (y - sp.y) * k; sp.w += (w - sp.w) * k; sp.h += (h - sp.h) * k; sp.r += (rr - sp.r) * k; }
    const se = this.spotEl.style; se.width = `${sp.w.toFixed(1)}px`; se.height = `${sp.h.toFixed(1)}px`; se.borderRadius = `${sp.r.toFixed(1)}px`; se.transform = `translate(${(sp.x - sp.w / 2).toFixed(1)}px, ${(sp.y - sp.h / 2).toFixed(1)}px)`;
    if (!s.play && this.t > 1.4) this.nx.classList.add('on');
    // hayalet el: gösteride heykeli gerçekten döndürür; denemede yalnızca yol gösterir
    const t0 = 0.55, ph = Math.max(0, this.t - t0) * TAU / 2.6;
    if (s.demo) { const p = this.gesture(s.demo, ph, true); if (p) this.hand(p[0], p[1], 1, this.t > t0); }
    else if (s.ghost && !T.drag && !T.twist && this.t > 0.6) { const p = this.gesture(s.ghost, ph, false); if (p) this.hand(p[0], p[1], 0.5, true); }
    else this.hand(this.hp.x, this.hp.y, 0, false);
    // etkileşimli adım: koşul sağlanınca ilerle
    if (s.play) {
      let done = false;
      if (s.until === 'drag') done = T.dragSum - this.d0 > 170;
      else if (s.until === 'rise') done = (T.pcT || 0) - this.pc0 > 0.12 || (T.pcT || 0) > 0.8;
      else if (s.until === 'vdrag') done = T.vdragSum - this.v0 > 90;
      else if (s.until === 'roll') done = T.rollSum - this.r0 > 0.6;
      if (s.auto && this.t > s.auto) done = true;
      if (done && this.t > 1.2) this.next();
    }
  },
};

/* ---------- fısıltılar: oynarken kısa, değişken, sıcak-soğuk ---------- */
const TH_WH = {
  go: ['Perde senin. Gölgeyi uyandır.', 'Hadi bakalım, ışık seni bekliyor.'],
  start: ['Heykele dokun ve sürükle…', 'Parmağını heykelin üstünde gezdir…'],
  warm: ['Isınıyor…', 'Gölge kıpırdandı…', 'Bir şey belirmeye başladı…'],
  hot: ['Gölge seni tanıdı, yavaşla.', 'Çok yakın… ince ayar.', 'Şekil beliriyor, acele etme.'],
  release: ['Bırak… kendi otursun.', 'Şimdi parmağını kaldır.'],
  cold: ['Soğuyor… geri dön.', 'Uzaklaştın, öbür yöne dön.', 'Hayır, o yöne değil…'],
  stuck: ['Takıldın mı? Okun gösterdiği yöne dene.', 'Bir de öbür eksene bak…'],
  hint: ['Usta heykeli yarı yola getirdi.'],
  par: ['Üç yıldız için son on saniye!'],
  lockTo1: ['Biri yerine oturdu! Sıra <span class="g1">turkuaz</span> heykelde.'],
  lockTo0: ['Biri yerine oturdu! Sıra <span class="g0">altın</span> heykelde.'],
};
const ThWhisper = {
  last: -99, best: 0, said: {},
  el() { return this.e || (this.e = $('#thWhisper')); },
  reset() { this.best = 0; this.said = {}; this.hide(); },
  say(k, force) {
    if (ThTut.on && !force) return; const now = performance.now() / 1000;
    if (!force && now - this.last < 3.2) return;
    const L = TH_WH[k], e = this.el(); if (!L || !e) return;
    e.innerHTML = L[(Math.random() * L.length) | 0]; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); this.last = now;
    clearTimeout(this.tm); this.tm = setTimeout(() => e.classList.remove('on'), 2900);
    $('#thMsg').classList.remove('on');
  },
  hide() { const e = this.el(); if (e) e.classList.remove('on'); clearTimeout(this.tm); },
  watch(pc, mag) {
    const T = Theater, S = this.said; if (ThTut.on) return;
    this.best = Math.max(this.best, pc);
    if (!T.touched && T.playT > 7 && !S.start) { S.start = 1; this.say('start'); return; }
    if (pc >= 0.8 && !S.hot) { S.hot = 1; S.warm = 1; this.say('hot'); return; }
    if (pc >= 0.5 && !S.warm) { S.warm = 1; this.say('warm'); return; }
    if (pc < this.best - 0.18) { this.best = pc; if (pc < 0.42) S.warm = 0; if (pc < 0.72) S.hot = 0; this.say('cold'); return; }
    const held = T.drag && T.grp[T.drag.g];
    if (held && !held.lock && T.angle(held) < mag * 1.35 && !S.rel) { S.rel = 1; this.say('release', true); }
  },
};

/* ---------- iki heykel: rozetler ve ışık iplikleri ---------- */
function thOverlay(T, dt) {
  ThTut.update(dt);
  const chips = T.chipEls || (T.chipEls = [...document.querySelectorAll('#thChips b')]), multi = T.grp.length > 1;
  const showC = multi && (T.state === 'play' || T.state === 'intro') && T.assembleT > 0.9;
  const pos = [];
  chips.forEach((c, k) => {
    const G = T.grp[k], on = showC && !!G && T.assembleT > 0.9 + k * 0.7;
    c.classList.toggle('on', on); if (!G || !on) return;
    const [cx, cy, r] = thSculptPx(T, G), x = clamp(cx - r * 0.72, 26, innerWidth - 26), y = clamp(cy - r * 0.6, 112, innerHeight - 120);
    c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; pos[k] = [x, y];
    c.classList.toggle('sel', T.state === 'play' && T.sel === k && !G.lock); c.classList.toggle('ok', G.lock);
    const tx = G.lock ? '✓' : k ? 'II' : 'I'; if (c.textContent !== tx) c.textContent = tx;
  });
  // ışık iplikleri: her rozetten kendi gölge çizgisine
  const svg = T.linkSvg || (T.linkSvg = $('#thLinks')); if (!svg) return;
  const want = multi && (ThTut.links() || (T.state === 'play' && !ThTut.on && (T.playT < 4 || T.t - (T.linkT ?? -99) < 1.8)));
  T.linkA = damp(T.linkA || 0, want ? 1 : 0, want ? 4 : 2.5, dt);
  svg.style.opacity = T.linkA.toFixed(3); if (T.linkA < 0.01) return;
  const paths = T.linkPaths || (T.linkPaths = [...svg.querySelectorAll('path')]), ends = T.linkEnds || (T.linkEnds = [...svg.querySelectorAll('circle')]);
  paths.forEach((p, k) => {
    const G = T.grp[k]; if (!G || !pos[k]) { p.setAttribute('d', ''); ends[k].setAttribute('r', 0); return; }
    const [x0, y0] = pos[k], [x1, y1] = thProj(G.wallC), mx = (x0 + x1) / 2 + (k ? 1 : -1) * Math.min(90, innerWidth * 0.18), my = (y0 + y1) / 2;
    p.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    const sel = ThTut.on ? (ThTut.st && (ThTut.st.spot === 'g' + k || ThTut.st.spot === 'chips')) : T.sel === k;
    p.style.opacity = G.lock ? 0.15 : sel ? 1 : 0.4; ends[k].setAttribute('cx', x1.toFixed(1)); ends[k].setAttribute('cy', y1.toFixed(1)); ends[k].setAttribute('r', sel && !G.lock ? 7 : 4); ends[k].style.opacity = p.style.opacity;
  });
}
