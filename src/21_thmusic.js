/* =====================================================================
   GÖLGE TİYATROSU — etkileşimli makam müziği ve ortam sesi
   Topluluk: kanun ve ud (Karplus–Strong telleri), ney, dem (sabit ses),
   bendir, def ve zil. Bulmacada taksim: heykel döndükçe teller çalınır,
   hizalandıkça topluluk toparlanır; gölge canlanınca usulüyle peşrev.
   Ortam: salon uğultusu, kandil alevi, seyirci mırıltısı ve her perdenin
   kendi dünyası (kar rüzgârı, cırcır böcekleri, dalga, çöl, mağara...).
   ===================================================================== */
// makamlar: kök (MIDI) + perdeler (yarım ses; komalar ondalıkla), güçlü = perde sırası
const TH_MK = {
  hicaz: { r: 50, s: [0, 1.13, 3.86, 4.98, 7.02, 8.15, 9.96], g: 4 },
  ussak: { r: 50, s: [0, 1.5, 2.94, 4.98, 7.02, 8.15, 9.96], g: 3 },
  rast: { r: 55, s: [0, 2.04, 3.84, 4.98, 7.02, 9.06, 10.86], g: 4 },
  saba: { r: 50, s: [0, 1.5, 2.94, 3.9, 7.02, 8.15, 9.96], g: 2 },
  nihavend: { r: 55, s: [0, 2.04, 3.0, 4.98, 7.02, 8.0, 10.96], g: 4 },
  kurdi: { r: 57, s: [0, 1.0, 3.0, 4.98, 7.02, 8.0, 10.0], g: 3 },
};
// usuller (sekizlik ızgara): D düm, T tek, K hafif tek, S hafif düm
const TH_USUL = { sofyan: 'D...T.K.', duyek: 'DT.TD.T.', semai: 'D.T.T.', aksak: 'D.T.DST.T', curcuna: 'D..T.DT.T.', mehter: 'D.TKD.T.', agir: 'D.......T...K...' };
// perde başına müzik: makam, tempo, usul, ortam
const TH_ACT_MU = [
  { mk: 'rast', bpm: 84, us: 'sofyan', env: 'garden' }, { mk: 'nihavend', bpm: 76, us: 'duyek', env: 'night' },
  { mk: 'ussak', bpm: 96, us: 'sofyan', env: 'moonMeadow' }, { mk: 'rast', bpm: 60, us: 'sofyan', env: 'ocean', low: 1 },
  { mk: 'hicaz', bpm: 70, us: 'duyek', env: 'savanna' }, { mk: 'saba', bpm: 66, us: 'aksak', env: 'mystic' },
  { mk: 'ussak', bpm: 100, us: 'sofyan', env: 'snow' }, { mk: 'kurdi', bpm: 80, us: 'semai', env: 'forest' },
  { mk: 'saba', bpm: 64, us: 'sofyan', env: 'night' }, { mk: 'rast', bpm: 92, us: 'semai', env: 'lake' },
  { mk: 'hicaz', bpm: 126, us: 'aksak', env: 'meadow' }, { mk: 'nihavend', bpm: 70, us: 'duyek', env: 'under' },
  { mk: 'hicaz', bpm: 84, us: 'aksak', env: 'desert' }, { mk: 'kurdi', bpm: 58, us: 'sofyan', env: 'night' },
  { mk: 'hicaz', bpm: 96, us: 'curcuna', env: 'cave', low: 1 },
  // Destan
  { mk: 'hicaz', bpm: 72, us: 'duyek', env: 'forge' }, { mk: 'ussak', bpm: 66, us: 'semai', env: 'steppe' },
  { mk: 'rast', bpm: 104, us: 'mehter', env: 'battle', mehter: 1 }, { mk: 'rast', bpm: 96, us: 'mehter', env: 'harbor', mehter: 1 },
  { mk: 'hicaz', bpm: 58, us: 'agir', env: 'warSea' }, { mk: 'rast', bpm: 72, us: 'sofyan', env: 'storm' },
  { mk: 'saba', bpm: 50, us: 'agir', env: 'blizzard' }, { mk: 'nihavend', bpm: 64, us: 'duyek', env: 'dawnFront' },
  { mk: 'rast', bpm: 60, us: 'agir', env: 'nightField' }, { mk: 'rast', bpm: 112, us: 'mehter', env: 'festival', mehter: 1 },
];

const stMus = {
  ok: false, mode: 'off', near: 0, ks: new Map(),
  init() {
    const A = audio; if (!A.ok) return false; if (this.ok) return true;
    const c = A.ctx; this.c = c;
    // müzik veri yolu: hedefe yaklaştıkça açılan alçak geçiren süzgeç
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 1400; this.lp.Q.value = 0.4;
    this.bus = c.createGain(); this.bus.gain.value = 0; this.bus.connect(this.lp); this.lp.connect(A.mus);
    this.send = c.createGain(); this.send.gain.value = 0.55; this.lp.connect(this.send); this.send.connect(A.verbMus);
    const pan = (p) => { if (!c.createStereoPanner) return this.bus; const n = c.createStereoPanner(); n.pan.value = p; n.connect(this.bus); return n; };
    // çalgı gövdeleri: ud sıcak (sol), kanun parlak (sağ), ney ortada
    this.udB = c.createBiquadFilter(); this.udB.type = 'peaking'; this.udB.frequency.value = 260; this.udB.gain.value = 5; this.udB.Q.value = 0.9;
    const udL = c.createBiquadFilter(); udL.type = 'lowpass'; udL.frequency.value = 3200; this.udB.connect(udL); udL.connect(pan(-0.3));
    this.kaB = c.createBiquadFilter(); this.kaB.type = 'peaking'; this.kaB.frequency.value = 2900; this.kaB.gain.value = 3; this.kaB.Q.value = 1.2; this.kaB.connect(pan(0.32));
    this.neyB = c.createGain(); this.neyB.connect(pan(-0.08));
    this.drB = c.createGain(); this.drB.gain.value = 0; this.drB.connect(A.mus); const dv = c.createGain(); dv.gain.value = 0.35; this.drB.connect(dv); dv.connect(A.verbMus);
    // dem: kök ve beşli, çok alçak süzgeç
    const dm = { g: c.createGain(), f: c.createBiquadFilter(), o: [] }; dm.f.type = 'lowpass'; dm.f.frequency.value = 420; dm.g.gain.value = 0; dm.f.connect(dm.g); dm.g.connect(this.bus);
    for (const [ty, det, k] of [['sawtooth', -5, 0.5], ['sawtooth', 6, 0.5], ['sawtooth', 3, 0.32], ['sine', 0, 1.1]]) { const o = c.createOscillator(), og = c.createGain(); o.type = ty; o.detune.value = det; og.gain.value = k; o.connect(og); og.connect(dm.f); o.start(); dm.o.push(o); }
    this.drone = dm;
    this.ok = true; return true;
  },
  // perdeye hazırlan
  begin(i) {
    this.gen = (this.gen || 0) + 1; this.act = TH_ACT_MU[i] || TH_ACT_MU[0]; this.mk = TH_MK[this.act.mk]; this.mode = 'intro'; this.lit = false; this.walk = 7; this.acc = 0; this.nextT = 0; this.nextBeat = 0; this.step = 0; this.lastPl = 0; this.neyT = 0; this.cardDone = false; this.perfStart = -1; this.lockN = 0;
    if (!this.init()) return;
    const t = this.c.currentTime, r = this.mk.r - 12;
    [r, r, r + 7.02, r - 12].forEach((m, k) => this.drone.o[k].frequency.setTargetAtTime(mtof(m), t, 0.4));
    this.bus.gain.setTargetAtTime(1, t, 0.4); this.drB.gain.setTargetAtTime(1, t, 0.4);
    // telleri önceden hazırla (ilk dokunuşta takılma olmasın)
    for (let d = 0; d < 15; d++) { this.kbuf(this.note(d), 'kanun'); if (d < 9) this.kbuf(this.note(d) - 12, 'ud'); }
  },
  end() {
    if (!this.ok) return; const t = this.c.currentTime, g = (this.gen = (this.gen || 0) + 1); this.mode = 'off'; this.bus.gain.setTargetAtTime(0, t, 0.5); this.drone.g.gain.setTargetAtTime(0, t, 0.5); this.drB.gain.setTargetAtTime(0, t, 0.3);
    // sessizleşince osilatörleri durdur: oyunun geri kalanında boşuna işlemci harcamasın
    setTimeout(() => { if (this.gen !== g || this.mode !== 'off') return; try { this.drone.o.forEach((o) => o.stop()); } catch (e) {} this.ok = false; }, 2500);
  },
  // makam derecesi → MIDI (d: 0 = kök; eksi/artı oktav taşar)
  note(d) { const s = this.mk.s, n = s.length, o = Math.floor(d / n), k = ((d % n) + n) % n; return this.mk.r + o * 12 + s[k]; },
  // Karplus–Strong tel tamponu (perde ayarı oynatma hızıyla kesinleşir)
  kbuf(m, kind) {
    const key = kind + Math.round(m * 4); let e = this.ks.get(key); if (e) return e;
    const c = this.c, sr = c.sampleRate, f = mtof(m), N = Math.max(2, Math.floor(sr / f - 0.5)), fa = sr / (N + 0.5), ud = kind === 'ud';
    const T60 = ud ? lerp(2.4, 0.9, clamp01((f - 90) / 600)) : lerp(3.4, 1.1, clamp01((f - 150) / 1300)), g = Math.pow(10, -3 / (T60 * fa));
    const n = Math.floor(sr * Math.min(3.4, T60 * 0.85 + 0.25)), buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0), ring = new Float32Array(N), br = ud ? 0.42 : 0.9;
    let lp = 0, mean = 0; for (let i = 0; i < N; i++) { lp += (Math.random() * 2 - 1 - lp) * br; ring[i] = lp; mean += lp; }
    mean /= N; const tmp = ring.map((v) => v - mean), pp = Math.max(1, Math.round(N * (ud ? 0.19 : 0.1)));
    for (let i = 0; i < N; i++) ring[i] = tmp[i] - 0.85 * tmp[(i + pp) % N];
    let idx = 0, pk = 1e-6;
    for (let i = 0; i < n; i++) { const j = idx + 1 === N ? 0 : idx + 1, cur = ring[idx]; ring[idx] = g * 0.5 * (cur + ring[j]); d[i] = cur; idx = j; pk = Math.max(pk, Math.abs(cur)); }
    const fo = Math.floor(sr * 0.04); for (let i = 0; i < n; i++) { let v = d[i] / pk * 0.9; if (i < 24) v *= i / 24; if (i > n - fo) v *= (n - i) / fo; d[i] = v; }
    e = { buf, rate: f / fa }; this.ks.set(key, e); return e;
  },
  pluck(t, m, kind = 'kanun', g = 0.1) {
    if (!this.ok) return; const c = this.c, e = this.kbuf(m, kind), s = c.createBufferSource(), a = c.createGain();
    s.buffer = e.buf; s.playbackRate.value = e.rate; a.gain.value = g; s.connect(a); a.connect(kind === 'ud' ? this.udB : this.kaB); s.start(Math.max(t, c.currentTime));
  },
  trem(t, m, n = 8, g = 0.07) { for (let k = 0; k < n; k++) this.pluck(t + k * 0.058, m, 'kanun', g * (0.55 + 0.45 * Math.sin((k / (n - 1)) * PI))); },
  // ney: nefesli, kayarak bağlanan legato cümle — notes: [[midi, süre], ...]
  ney(t0, notes, g = 0.05) {
    if (!this.ok) return; const c = this.c, t = Math.max(t0, c.currentTime + 0.02);
    const o = c.createOscillator(), o2 = c.createOscillator(), env = c.createGain(), h2 = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sine'; o2.type = 'triangle'; h2.gain.value = 0.16; lp.type = 'lowpass'; lp.frequency.value = 2400;
    const ns = c.createBufferSource(), bp = c.createBiquadFilter(), bg = c.createGain(); ns.buffer = audio.noise; ns.loop = true; bp.type = 'bandpass'; bp.Q.value = 7; bg.gain.value = 0.55;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.1; lg.gain.value = 0; lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
    o.connect(lp); o2.connect(h2); h2.connect(lp); ns.connect(bp); bp.connect(bg); bg.connect(lp); lp.connect(env); env.connect(this.neyB);
    let tt = t, f0 = mtof(notes[0][0]);
    o.frequency.setValueAtTime(f0 * 0.965, t); o.frequency.setTargetAtTime(f0, t, 0.045); o2.frequency.setValueAtTime(f0 * 1.93, t); o2.frequency.setTargetAtTime(f0 * 2, t, 0.045); bp.frequency.setValueAtTime(f0, t);
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(g * 0.85, t + 0.16);
    for (const [m, d] of notes) {
      const f = mtof(m); o.frequency.setTargetAtTime(f, tt, 0.035); o2.frequency.setTargetAtTime(f * 2, tt, 0.035); bp.frequency.setTargetAtTime(f, tt, 0.035);
      env.gain.setTargetAtTime(g * (0.8 + Math.random() * 0.25), tt + 0.02, 0.12); lg.gain.setValueAtTime(0, tt); lg.gain.linearRampToValueAtTime(d > 0.45 ? 14 : 5, tt + Math.min(d, 0.6));
      tt += d;
    }
    env.gain.setTargetAtTime(0.0001, tt, 0.18);
    // üfleme başı: kısa nefes
    audio.noiseHit(t, 0.12, g * 0.5, { type: 'bandpass', f: f0 * 3, q: 1.2, dest: this.neyB });
    for (const x of [o, o2, ns, lfo]) { x.start(t); x.stop(tt + 1.0); }
  },
  // zurna: çift kamışlı, genizden, parlak — mehter ezgisi
  zurna(t0, notes, g = 0.03) {
    if (!this.ok) return; const c = this.c, t = Math.max(t0, c.currentTime + 0.02);
    const o = c.createOscillator(), o2 = c.createOscillator(), env = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), lp = c.createBiquadFilter(), mix = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 7; f1.type = 'peaking'; f1.frequency.value = 1300; f1.gain.value = 9; f1.Q.value = 2; f2.type = 'peaking'; f2.frequency.value = 2700; f2.gain.value = 7; f2.Q.value = 3; lp.type = 'lowpass'; lp.frequency.value = 5200; mix.gain.value = 0.5;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6.2; lg.gain.value = 12; lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
    o.connect(mix); o2.connect(mix); mix.connect(f1); f1.connect(f2); f2.connect(lp); lp.connect(env); env.connect(this.neyB);
    let tt = t; env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(g, t + 0.05);
    for (const [m, d] of notes) { const f = mtof(m); o.frequency.setTargetAtTime(f, tt, 0.018); o2.frequency.setTargetAtTime(f, tt, 0.018); env.gain.setTargetAtTime(g * (0.85 + Math.random() * 0.2), tt, 0.03); tt += d; }
    env.gain.setTargetAtTime(0.0001, tt, 0.08);
    for (const x of [o, o2, lfo]) { x.start(t); x.stop(tt + 0.6); }
  },
  // kös: büyük kazan davul; nakkare: küçük çift kudüm
  kos(t, v = 1) { if (!this.ok) return; const A = audio, d = this.drB; A.osc('sine', 62, t, 1.1, 0.32 * v, d, { f1: 36 }); A.osc('sine', 98, t, 0.4, 0.12 * v, d, { f1: 52 }); A.noiseHit(t, 0.18, 0.12 * v, { type: 'lowpass', f: 260, dest: d }); },
  nakkare(t, v = 1) { if (!this.ok) return; const A = audio, d = this.drB; A.osc('triangle', 330, t, 0.12, 0.07 * v, d, { f1: 240 }); A.noiseHit(t, 0.05, 0.05 * v, { type: 'bandpass', f: 1800, q: 1.5, dest: d }); },
  // vurmalılar
  drum(t, k, v = 1) {
    if (!this.ok) return; const A = audio, d = this.drB;
    if (k === 'D' || k === 'S') { const g = (k === 'D' ? 0.2 : 0.11) * v; A.osc('sine', 108, t, 0.5, g, d, { f1: 50 }); A.osc('sine', 62, t, 0.62, g * 0.6, d, { f1: 44, a: 0.01 }); A.noiseHit(t, 0.08, g * 0.35, { type: 'lowpass', f: 320, dest: d }); }
    else { const g = (k === 'T' ? 0.08 : 0.045) * v; A.noiseHit(t, 0.07, g, { type: 'bandpass', f: 2100, q: 1.4, dest: d }); A.osc('triangle', 430, t, 0.05, g * 0.5, d, { f1: 300 }); for (let j = 0; j < 3; j++) A.noiseHit(t + 0.004 + j * 0.011, 0.03, g * 0.22, { type: 'highpass', f: 7200, dest: d }); }
  },
  zil(t, g = 0.035) { if (!this.ok) return; audio.bell(mtof(this.mk.r + 48 + 2), t, 2.4, g, { ratio: 2.76, index: 2.6, dest: this.drB, verb: 0.6 }); audio.bell(mtof(this.mk.r + 48 + 2.4), t + 0.004, 2.0, g * 0.7, { ratio: 3.17, index: 2.2, dest: this.drB, verb: 0.5 }); },
  // heykeli döndürmek telleri çalar: yön = merdiven yönü, yakınlık = akora çekim
  turn(amt, dir, near) {
    if (!this.ok || this.mode !== 'play' || !(amt > 0)) return;
    this.acc += amt; const notch = 0.075; if (this.acc < notch) return; this.acc %= notch;
    const t = this.c.currentTime; if (t - this.lastPl < 0.05) return; this.lastPl = t;
    this.walk = clamp(this.walk + (dir >= 0 ? 1 : -1), 0, 15);
    let d = this.walk; if (near > 0.55) { const ch = [0, 2, 4, 7, 9, 11, 14], best = ch.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a)); if (Math.random() < near) d = best; }
    const m = this.note(d), sp = clamp01(amt / 0.05);
    this.pluck(t, d < 5 ? m - 12 : m, d < 5 ? 'ud' : 'kanun', 0.05 + sp * 0.06 + near * 0.03);
  },
  // grup kilitlendi: kısa ney cümlesi ve zil
  lock() { if (!this.ok) return; const t = this.c.currentTime + 0.05, gu = this.mk.g; this.lockN++; this.zil(t, 0.03); this.ney(t, [[this.note(gu + 1) + 12, 0.22], [this.note(gu) + 12, 0.7]], 0.045); },
  // çözüldü: kanun inişi, bendir, zil, ney tonikte uzun
  solve() {
    if (!this.ok) return; const t = this.c.currentTime + 0.04;
    for (let k = 0; k < 14; k++) this.pluck(t + k * 0.04, this.note(14 - k), 'kanun', 0.07 + k * 0.003);
    this.drum(t + 0.56, 'D', 1.1); this.drum(t + 0.7, 'S'); this.drum(t + 0.82, 'D', 1.2); this.zil(t + 0.82, 0.05);
    this.pluck(t + 0.82, this.note(0) - 12, 'ud', 0.14); this.pluck(t + 0.83, this.note(4) - 12, 'ud', 0.08);
    this.ney(t + 0.85, [[this.note(this.mk.g) + 12, 0.5], [this.note(1) + 12, 0.25], [this.note(0) + 12, 1.8]], 0.06);
    this.mode = 'reveal'; this.nextBeat = 0;
  },
  replay() { this.cardDone = false; if (this.mode === 'after' || this.mode === 'perf') this.mode = 'reveal'; },
  accent() { if (!this.ok || this.mode !== 'perf') return; const t = this.c.currentTime; if (t - (this.lastAcc || 0) < 0.5) return; this.lastAcc = t; this.zil(t, 0.022); },
  card() { if (!this.ok || this.cardDone) return; this.cardDone = true; const t = this.c.currentTime + 0.1; this.zil(t, 0.04); for (let k = 0; k < 5; k++) this.pluck(t + k * 0.09, this.note([0, 2, 4, 7, 9][k]), 'kanun', 0.07); this.pluck(t, this.note(0) - 12, 'ud', 0.12); this.mode = 'after'; },
  // taksim cümlesi: makamın seyrine göre gezinme
  phrase(t, near) {
    const n = Math.random() < 0.35 ? 1 : 2 + Math.floor(Math.random() * (2 + near * 3)), dir = Math.random() < 0.5 ? -1 : 1, center = near > 0.7 ? 7 : this.mk.g + (Math.random() < 0.5 ? 0 : 7);
    this.walk += Math.sign(center - this.walk) * (Math.random() < 0.6 ? 1 : 0);
    let d = this.walk;
    if (near > 0.6 && Math.random() < 0.3) { this.trem(t, this.note(this.mk.g + 7), 7, 0.05); return; }
    for (let k = 0; k < n; k++) { const m = this.note(d); this.pluck(t + k * (0.11 + Math.random() * 0.05), d < 5 ? m - 12 : m, d < 5 ? 'ud' : 'kanun', 0.05 + near * 0.035); d = clamp(d + dir, 0, 15); }
    this.walk = d;
  },
  // perde müziğinin kalbi: her kare çağrılır
  update(dt, S) {
    if (!this.init() || this.mode === 'off') return;
    const c = this.c, t = c.currentTime, near = S.near || 0, lamp = S.lamp || 0;
    this.near = damp(this.near, near, 3, dt);
    this.mode = S.state === 'play' ? 'play' : S.state === 'solved' && this.mode === 'play' ? 'play' : this.mode;
    if (S.state === 'intro' && this.mode !== 'intro') { this.mode = 'intro'; }
    // perde kapanırken müzik susmaz: kanun aşağı süzülür, dem sürer, yeni perdenin kökene kayar
    if (S.state === 'closing') { if (this.mode !== 'closing') { this.mode = 'closing'; this.drB.gain.setTargetAtTime(0.15, t, 0.2); for (let k = 0; k < 6; k++) this.pluck(t + 0.05 + k * 0.09, this.note(9 - k), 'kanun', 0.055 - k * 0.004); this.pluck(t + 0.6, this.note(0) - 12, 'ud', 0.09); } }
    if (S.perf && this.mode !== 'perf' && this.mode !== 'after') { this.mode = 'perf'; this.perfStart = t; this.nextBeat = t + 0.1; this.step = 0; this.mel = null; }
    this.bus.gain.setTargetAtTime(S.state === 'closing' ? 0.7 : 1, t, 0.3);
    // dem ve süzgeç
    const dG = (this.mode === 'perf' ? 0.018 : this.mode === 'after' ? 0.012 : 0.02 + this.near * 0.016) * (0.55 + 0.45 * lamp);
    this.drone.g.gain.setTargetAtTime(dG, t, 0.3);
    this.lp.frequency.setTargetAtTime(this.mode === 'play' ? 900 + this.near * this.near * 6500 : 7000, t, 0.25);
    // açılış: kandil yanınca kanun yükselişi
    if (this.mode === 'intro' && lamp > 0.35 && !this.lit) { this.lit = true; for (let k = 0; k < 8; k++) this.pluck(t + 0.05 + k * 0.06, this.note(k), k < 3 ? 'kanun' : 'kanun', 0.05 + k * 0.006); this.pluck(t + 0.6, this.note(0) - 12, 'ud', 0.1); }
    if (this.mode === 'play') {
      // taksim: yakınlaştıkça sıklaşır
      if (t > this.nextT) { this.phrase(t + 0.02, this.near); this.nextT = t + lerp(2.6, 0.9, this.near) * (0.7 + Math.random() * 0.6); }
      // bendir nabzı: yaklaşınca kalp atışı, iyice yaklaşınca usul başlar
      if (this.near > 0.45) {
        const bd = 60 / this.act.bpm;
        if (t > this.nextBeat - 0.05) { const tb = Math.max(t + 0.02, this.nextBeat); this.drum(tb, 'S', 0.5 + this.near * 0.5); if (this.near > 0.72) this.drum(tb + bd, 'K', 0.7); this.nextBeat = tb + bd * 2; }
      } else this.nextBeat = t;
      // çok yaklaşınca ney çağırır
      if (this.near > 0.68 && t > this.neyT) { this.neyT = t + 7 + Math.random() * 4; const gu = this.mk.g; this.ney(t + 0.05, [[this.note(gu) + 12, 0.9], [this.note(gu + 1) + 12, 0.35], [this.note(gu) + 12, 1.2]], 0.032 + this.near * 0.012); }
    }
    if (this.mode === 'perf') this.perf(t);
    if (this.mode === 'after' && t > this.nextT) { this.phrase(t + 0.02, 0.2); this.nextT = t + 3 + Math.random() * 2; }
  },
  // peşrev: usul, ud dem vuruşları, kanun cevabı ve ney ezgisi
  perf(t) {
    const us = TH_USUL[this.act.us], L = us.length, e8 = 30 / this.act.bpm, bars = (t - this.perfStart) / (e8 * L);
    // kare takıldıysa kaçan vuruşları üst üste çalma (hepsi aynı anda patlıyordu): usulde ileri sar
    while (this.nextBeat < t - 0.03) { this.nextBeat += e8; this.step++; }
    while (this.nextBeat < t + 0.2) {
      const tb = this.nextBeat, i = this.step % L, ch = us[i], bar = Math.floor(this.step / L);
      if (this.act.mehter) {
        // mehter: kös ve nakkare, ölçü başında zil, iki ölçüde bir zurna cümlesi
        if (ch === 'D' || ch === 'S') this.kos(tb, bar === 0 ? 0.7 : 1); else if (ch !== '.') this.nakkare(tb, ch === 'T' ? 1 : 0.6);
        if (i === 0) this.zil(tb, 0.04);
        if (i === 0 && bar % 2 === 0) { const gu = this.mk.g, path = [0, 1, 2, gu, gu + 1, gu, gu - 1, 2, 1, 0], notes = []; path.forEach((d, j) => notes.push([this.note(d) + 12, e8 * (j % 4 === 3 ? 2 : 1) * 0.98])); this.zurna(tb, notes, 0.028); }
        this.nextBeat += e8; this.step++; continue;
      }
      if (ch !== '.') this.drum(tb, ch, bar === 0 ? 0.7 : 1);
      if (ch === 'D') this.pluck(tb, this.note(0) - 12, 'ud', 0.1); else if (ch === 'S') this.pluck(tb, this.note(4) - 12, 'ud', 0.07);
      else if (ch === 'T' && bar > 0) this.pluck(tb, this.note([2, 4, 7][(bar + i) % 3]), 'kanun', 0.05);
      // ney ezgisi: iki ölçülük cümleler, kökten güçlüye çıkıp köke iner
      if (i === 0 && bar >= 1 && bar % 2 === 1) {
        const gu = this.mk.g, path = Math.random() < 0.5 ? [0, 1, 2, gu, gu + 1, gu, gu - 1, 1, 0] : [gu, gu + 1, gu + 2, gu + 1, gu, gu - 1, gu - 2, 1, 0], notes = [], tot = e8 * L * 2;
        let acc = 0; path.forEach((d, k) => { const du = k === path.length - 1 ? tot - acc - e8 : e8 * (k % 3 === 2 ? 2 : 1) * (tot / (e8 * 13)); acc += du; notes.push([this.note(d) + 12, Math.max(0.12, du)]); });
        this.ney(tb, notes, 0.036);
      }
      if (i === Math.floor(L / 2) && bar % 2 === 0 && bar > 0) this.trem(tb, this.note(this.mk.g + 7), 5, 0.04);
      this.nextBeat += e8; this.step++;
    }
  },
};

/* ---------- ortam: salon, kandil, seyirci ve perdenin dünyası ---------- */
const TH_ENV = {
  garden: { wind: 0.5, birds: 1, leaves: 0.6 }, night: { wind: 0.35, crickets: 1 }, meadow: { wind: 0.7, birds: 0.5, insects: 0.4, leaves: 0.4 },
  moonMeadow: { wind: 0.45, crickets: 0.8, leaves: 0.4 }, ocean: { waves: 1, wind: 0.4 }, savanna: { wind: 0.6, insects: 0.8 }, mystic: { rumble: 0.35, whistle: 0.25 }, snow: { whistle: 0.9, wind: 0.6 },
  forest: { wind: 0.55, birds: 0.35, leaves: 0.8 }, lake: { waves: 0.55, wind: 0.9 }, under: { rumble: 0.7, bubbles: 1 }, desert: { wind: 0.85, hiss: 0.7 },
  cave: { rumble: 1, crackle: 0.8, wind: 0.2 },
  forge: { crackle: 1, rumble: 0.5, wind: 0.35 }, steppe: { wind: 1, whistle: 0.35, leaves: 0.4 }, battle: { wind: 0.6, rumble: 0.5 }, harbor: { waves: 0.6, wind: 0.3, crickets: 0.4 },
  warSea: { waves: 0.7, wind: 0.5, rumble: 0.45 }, storm: { waves: 1, wind: 1, whistle: 0.6, rumble: 0.7 }, blizzard: { whistle: 1, wind: 1 }, dawnFront: { wind: 0.5, rumble: 0.35, birds: 0.2 },
  nightField: { wind: 0.4, crickets: 0.7 }, festival: { crickets: 0.25, wind: 0.2 },
};
const stAmb = {
  ok: false, env: null, lv: 0,
  init() {
    const A = audio; if (!A.ok) return false; if (this.ok) return true;
    const c = A.ctx; this.c = c;
    const n = c.sampleRate * 3, bb = c.createBuffer(1, n, c.sampleRate), d = bb.getChannelData(0); let b = 0;
    for (let i = 0; i < n; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
    this.brown = bb;
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(A.amb); const vs = c.createGain(); vs.gain.value = 0.3; this.out.connect(vs); vs.connect(A.verbSfx);
    const loop = (buf, type, f, q, g0 = 0) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; s.loop = true; s.loopStart = 0; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = g0; s.connect(fl); fl.connect(g); g.connect(this.out); s.start(0, Math.random() * 1.5); return { s, f: fl, g }; };
    this.room = loop(bb, 'lowpass', 260, 0.5); // salon uğultusu
    this.flame = loop(A.noise, 'bandpass', 170, 0.9); // kandil alevi
    this.beds = { wind: loop(A.noise, 'bandpass', 500, 0.7), hiss: loop(A.noise, 'highpass', 3200, 0.5), waves: loop(bb, 'lowpass', 520, 0.6), rumble: loop(bb, 'lowpass', 90, 0.8), whistle: loop(A.noise, 'bandpass', 1400, 9) };
    this.murm = [0, 1, 2, 3, 4].map(() => loop(A.noise, 'bandpass', 380 + Math.random() * 700, 3.5));
    this.ok = true; return true;
  },
  begin(i) { this.gen = (this.gen || 0) + 1; if (!this.init()) return; this.env = TH_ENV[(TH_ACT_MU[i] || TH_ACT_MU[0]).env] || {}; this.hush = 0; this.t = { birds: 0, crickets: 0, bubbles: 0, crackle: 0, leaves: 0, insects: 0, pop: 0 }; this.out.gain.setTargetAtTime(1, this.c.currentTime, 0.3); },
  end() {
    if (!this.ok) return; const t = this.c.currentTime, g = (this.gen = (this.gen || 0) + 1); this.out.gain.setTargetAtTime(0, t, 0.4); this.env = null;
    setTimeout(() => { if (this.gen !== g) return; try { [this.room, this.flame, ...Object.values(this.beds), ...this.murm].forEach((n) => n.s.stop()); } catch (e) {} this.ok = false; }, 2500);
  },
  update(dt, S) {
    if (!this.init() || !this.env) return;
    const A = audio, c = this.c, t = c.currentTime, lamp = S.lamp || 0, E = this.env;
    // seyirci: perde açılırken mırıldanır, kandil yanınca susar
    const mu = S.state === 'intro' ? 1 - smoothstep(0.1, 0.7, lamp) : 0;
    this.murm.forEach((m, k) => { if (Math.random() < dt * 3) m.g.gain.setTargetAtTime(mu * (0.004 + Math.random() * 0.012), t, 0.08); if (Math.random() < dt * 0.6) m.f.frequency.setTargetAtTime(350 + Math.random() * 800, t, 0.2); });
    this.room.g.gain.setTargetAtTime(0.012 + lamp * 0.004, t, 0.5);
    // alev: düzensiz titreşim + çıtırtı
    if (Math.random() < dt * 9) this.flame.g.gain.setTargetAtTime(lamp * (0.006 + Math.random() * 0.012), t, 0.05);
    if (lamp > 0.3 && Math.random() < dt * 1.4 * lamp) A.noiseHit(t + Math.random() * 0.05, 0.012 + Math.random() * 0.02, 0.01 + Math.random() * 0.016, { type: 'highpass', f: 2500 + Math.random() * 3000, q: 2, dest: this.out });
    // perdenin dünyası: bulmacada fısıltı, canlanınca tam
    // kandil sönükken de dünya duyulur (geçişte ses kopmasın)
    const lv = (S.perf ? 1 : S.state === 'play' ? 0.22 : S.state === 'solved' ? 0.5 : S.card ? 0.6 : S.state === 'closing' ? 0.3 : 0.22) * (0.4 + 0.6 * lamp); this.lv = damp(this.lv, lv, 2.0, dt);
    const B = this.beds, L = this.lv;
    B.wind.g.gain.setTargetAtTime((E.wind || 0) * L * 0.04, t, 0.6); if (Math.random() < dt * 0.5) B.wind.f.frequency.setTargetAtTime(280 + Math.random() * 700, t, 1.4);
    B.hiss.g.gain.setTargetAtTime((E.hiss || 0) * L * 0.014 * (0.6 + 0.4 * Math.sin(t * 0.4)), t, 0.4);
    B.waves.g.gain.setTargetAtTime((E.waves || 0) * L * 0.055 * (0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.75), 2)), t, 0.3);
    B.rumble.g.gain.setTargetAtTime((E.rumble || 0) * L * 0.05, t, 0.6);
    B.whistle.g.gain.setTargetAtTime((E.whistle || 0) * L * 0.02 * (0.5 + 0.5 * Math.sin(t * 0.3)), t, 0.5); if (Math.random() < dt * 0.4) B.whistle.f.frequency.setTargetAtTime(900 + Math.random() * 1400, t, 1.6);
    const due = (k, rate) => { if (!E[k] || L < 0.05) return false; if (t < this.t[k]) return false; this.t[k] = t + (0.6 + Math.random() * 1.2) / rate; return true; };
    const g = L * 0.7;
    if (due('birds', 0.35 * E.birds)) { const f = 2400 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 5); for (let i = 0; i < n; i++) A.osc('sine', f, t + i * 0.085, 0.07, 0.007 * g, this.out, { f1: f * (1.2 + Math.random() * 0.4) }); }
    if (due('crickets', 1.6 * E.crickets)) { const f = 4300 + Math.random() * 500; for (let i = 0; i < 3; i++) A.osc('sine', f, t + i * 0.045, 0.03, 0.006 * g, this.out, { f1: f * 0.97 }); }
    if (due('insects', 0.25 * E.insects)) { const o = A.osc('sawtooth', 190 + Math.random() * 60, t, 1.2, 0.0025 * g, this.out, { a: 0.4, f1: 210 }); }
    if (due('leaves', 0.5 * E.leaves)) A.noiseHit(t, 0.5 + Math.random() * 0.6, 0.008 * g, { type: 'highpass', f: 2600, a: 0.25, dest: this.out });
    if (due('bubbles', 1.1 * E.bubbles)) A.osc('sine', 500 + Math.random() * 600, t, 0.06, 0.008 * g, this.out, { f1: 1300 + Math.random() * 600 });
    if (due('crackle', 2.5 * E.crackle)) A.noiseHit(t, 0.015, 0.02 * g, { type: 'highpass', f: 2200 + Math.random() * 3000, q: 2, dest: this.out });
  },
};
