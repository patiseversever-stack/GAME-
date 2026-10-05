
/* =====================================================================
   SES — tamamen prosedürel (Web Audio API)
   ===================================================================== */
const MUSIC = [
  // Ege: D majör pentatonik, sakin
  { root: 50, scale: [0, 2, 4, 7, 9], chords: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]], tempo: 0.62, bright: 1.0 },
  // Rüzgâr: G miksolidyen
  { root: 55, scale: [0, 2, 4, 5, 7, 9, 10], chords: [[43, 50, 55, 59, 62], [41, 48, 53, 57, 60], [48, 55, 60, 64, 67], [43, 50, 55, 59, 65]], tempo: 0.55, bright: 1.1 },
  // Peri Bacaları: Hicaz makamı esintisi (D Eb F# G A Bb C)
  { root: 50, scale: [0, 1, 4, 5, 7, 8, 10], chords: [[38, 50, 57, 62], [43, 50, 55, 58], [36, 48, 55, 60, 63], [38, 45, 50, 54, 57]], tempo: 0.7, bright: 0.9 },
  // Tuz Gölü: F lidyen, havadar
  { root: 53, scale: [0, 2, 4, 6, 7, 9, 11], chords: [[41, 48, 53, 57, 64], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 55, 59, 64]], tempo: 0.5, bright: 1.25 },
  // İkiz Güneş: tam ton, gizemli
  { root: 48, scale: [0, 2, 4, 6, 8, 10], chords: [[36, 48, 52, 56, 62], [38, 50, 54, 58, 64], [40, 52, 56, 60, 66], [34, 46, 50, 54, 60]], tempo: 0.66, bright: 0.85 },
  // Buz Diyarı: E minör eklemeli, cam gibi
  { root: 52, scale: [0, 2, 3, 7, 9, 14], chords: [[40, 52, 59, 66, 71], [36, 48, 55, 62, 67], [43, 55, 62, 66, 71], [38, 50, 57, 64, 69]], tempo: 0.42, bright: 1.35, ice: true },
  // Ayna Sarayı: Hüseyni esintisi (A dorian)
  { root: 57, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[45, 52, 57, 60, 64], [43, 50, 55, 59, 62], [41, 48, 53, 57, 60], [40, 47, 52, 56, 59]], tempo: 0.6, bright: 1.05 },
  // Gök Saati: C lidyen, mekanik nabız
  { root: 48, scale: [0, 2, 4, 6, 7, 11], chords: [[36, 43, 52, 55, 59], [38, 45, 54, 57, 62], [33, 40, 48, 52, 55], [31, 38, 50, 54, 57]], tempo: 0.8, bright: 0.95, clock: true },
  // Gölge Tiyatrosu: Hicaz, kandil ışığında yavaş
  { root: 50, scale: [0, 1, 4, 5, 7, 8, 10], chords: [[38, 45, 50, 54, 57], [43, 50, 55, 58, 62], [41, 48, 53, 56, 60], [38, 45, 50, 51, 57]], tempo: 0.45, bright: 0.8 },
];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// her dünyanın kendi küçük ezgisi (dizi basamakları; -1 = alt oktav komşusu). Gölgede sakin anlarda çalar, çeşitlenerek döner.
const MOTIFS = [
  [0, 2, 4, 3, 2, 1, 0, -1, 0], [4, 3, 2, 3, 4, 6, 4, 2, 1], [0, 1, 2, 1, 4, 3, 2, 1, 0], [2, 4, 5, 4, 2, 1, 2, 0],
  [0, 2, 4, 5, 4, 2, 3, 1, 0], [4, 2, 0, 1, 2, 4, 5, 4], [0, 1, 2, 4, 3, 2, 1, 0, -1, 0], [0, 4, 2, 4, 1, 4, 0, 3, 2],
];

class AudioEngine {
  constructor() {
    this.ctx = null; this.ok = false; this.music = null; this.hum = null; this.sizzle = null;
    this.sfxOn = Save.data.settings.sfx; this.musicOn = Save.data.settings.music;
    this.lastStep = 0; this.lastTick = 0; this.chapter = 0; this.intensity = 0;
    this.nextChord = 0; this.nextArp = 0; this.chordIdx = 0; this.nextBird = 0; this.birdsOn = true; this.nextCrackle = 0;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    this.build();
    // iOS kilidi: sessiz tampon çal
    const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.ok = true;
  }
  build() {
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.22;
    // son kat: tepe sınırlayıcı — üst üste binen toplar/kös/kalabalık 0 dBFS'i aşıp çıtırdamasın
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    this.master.connect(comp); comp.connect(lim); lim.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxOn ? 1 : 0; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = this.musicOn ? 0.75 : 0; this.mus.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = this.sfxOn ? 1 : 0; this.amb.connect(this.master);
    // yankı
    this.verb = c.createConvolver(); this.verb.buffer = this.makeIR(2.8);
    const vlp = c.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 5200;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 1;
    this.verbIn.connect(this.verb); this.verb.connect(vlp); vlp.connect(this.master);
    this.verbSfx = c.createGain(); this.verbSfx.gain.value = this.sfxOn ? 1 : 0; this.verbSfx.connect(this.verbIn);
    this.verbMus = c.createGain(); this.verbMus.gain.value = this.musicOn ? 1 : 0; this.verbMus.connect(this.verbIn);
    // gecikme (müzik)
    this.dly = c.createDelay(1.5); this.dly.delayTime.value = 0.42;
    const fb = c.createGain(); fb.gain.value = 0.36; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    this.dly.connect(dlp); dlp.connect(fb); fb.connect(this.dly); dlp.connect(this.mus);
    this.dlyIn = c.createGain(); this.dlyIn.gain.value = 0.5; this.dlyIn.connect(this.dly);
    // gürültü tamponu
    const n = c.sampleRate * 2, nb = c.createBuffer(1, n, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    // rüzgâr ambiyansı
    const w = c.createBufferSource(); w.buffer = nb; w.loop = true;
    this.windF = c.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 500; this.windF.Q.value = 0.7;
    this.windG = c.createGain(); this.windG.gain.value = 0.0;
    w.connect(this.windF); this.windF.connect(this.windG); this.windG.connect(this.amb); w.start();
    this.windG.gain.setTargetAtTime(0.05, c.currentTime + 0.2, 2.0);
    // güneş uğultusu (sürüklerken)
    const h = { g: c.createGain(), o1: c.createOscillator(), o2: c.createOscillator(), o3: c.createOscillator(), f: c.createBiquadFilter() };
    h.o1.type = 'sine'; h.o2.type = 'triangle'; h.o3.type = 'sine'; h.f.type = 'lowpass'; h.f.frequency.value = 1800; h.g.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.35; const g3 = c.createGain(); g3.gain.value = 0.18;
    h.o1.connect(h.f); h.o2.connect(g2); g2.connect(h.f); h.o3.connect(g3); g3.connect(h.f); h.f.connect(h.g); h.g.connect(this.sfx);
    const hs = c.createGain(); hs.gain.value = 0.4; h.g.connect(hs); hs.connect(this.verbSfx);
    h.o1.start(); h.o2.start(); h.o3.start(); this.hum = h;
    // cızırtı (ışıkta)
    const sz = { src: c.createBufferSource(), hp: c.createBiquadFilter(), bp: c.createBiquadFilter(), g: c.createGain() };
    sz.src.buffer = nb; sz.src.loop = true; sz.hp.type = 'highpass'; sz.hp.frequency.value = 2400; sz.bp.type = 'peaking'; sz.bp.frequency.value = 5200; sz.bp.gain.value = 8; sz.g.gain.value = 0;
    sz.src.connect(sz.hp); sz.hp.connect(sz.bp); sz.bp.connect(sz.g); sz.g.connect(this.sfx); sz.src.start(); this.sizzle = sz;
    // konumlu efekt yolu (tiyatroda ses, gölgenin olduğu yerden gelir)
    this.panN = c.createStereoPanner ? c.createStereoPanner() : null; if (this.panN) this.panN.connect(this.sfx);
  }
  // fn içindeki tüm efektler p konumundan (−1 sol … 1 sağ) çalar; sonradan çalacaklar figürü izler
  withPan(p, fn) { if (!this.panN) { fn(); return; } this.panN.pan.setTargetAtTime(clamp(p, -0.9, 0.9), this.t, 0.06); this.sfxDest = this.panN; try { fn(); } finally { this.sfxDest = null; } }
  // ses yolu sentezi: kaynak (testere/üçgen) + nefes gürültüsü → pürüz (AM) → üç formant → zarf
  // o = { dur, f: [[dt, Hz]...], F: [[dt, [F1, F2, F3]]...], q, amp, src, breath, vib: [Hz, sent], rough: [Hz, derinlik], g, a, r, verb, dest }
  voice(t0, o) {
    const c = this.ctx, dur = o.dur, end = t0 + dur + 0.15, src = c.createOscillator(), am = c.createGain(), env = c.createGain();
    src.type = o.src || 'sawtooth';
    o.f.forEach(([dt, hz], k) => (k ? src.frequency.linearRampToValueAtTime(hz, t0 + dt) : src.frequency.setValueAtTime(hz, t0 + dt)));
    const lfo = (hz, depth, param) => { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = hz; lg.gain.value = depth; l.connect(lg); lg.connect(param); l.start(t0); l.stop(end); };
    if (o.vib) lfo(o.vib[0], o.vib[1], src.detune);
    if (o.jit) lfo(o.jit[0] * 0.73, o.jit[1], src.detune), lfo(o.jit[0] * 1.37, o.jit[1] * 0.6, src.detune);
    am.gain.value = 1; if (o.rough) { am.gain.value = 1 - o.rough[1]; lfo(o.rough[0], o.rough[1], am.gain); }
    const vg = c.createGain(); vg.gain.value = 1; src.connect(vg); vg.connect(am);
    let ns = null; if (o.breath) { ns = c.createBufferSource(); ns.buffer = this.noise; ns.loop = true; const ng = c.createGain(); ng.gain.value = o.breath * 1.6; ns.connect(ng); ng.connect(am); }
    const q = o.q || [6, 8, 10], amp = o.amp || [1, 0.55, 0.28];
    const bps = [0, 1, 2].map((i) => { const bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = q[i]; g.gain.value = amp[i]; am.connect(bp); bp.connect(g); g.connect(env); return bp; });
    o.F.forEach(([dt, fs], k) => bps.forEach((bp, i) => (k ? bp.frequency.linearRampToValueAtTime(fs[i], t0 + dt) : bp.frequency.setValueAtTime(fs[i], t0 + dt))));
    const a = o.a ?? 0.04, r = o.r ?? 0.15, g = o.g ?? 0.2;
    env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(g, t0 + a);
    if (o.env) o.env.forEach(([dt, v]) => env.gain.linearRampToValueAtTime(g * v, t0 + dt));
    env.gain.setValueAtTime(o.env ? g * o.env[o.env.length - 1][1] : g, t0 + Math.max(a, dur - r)); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(o.dest || this.sfxDest || this.sfx);
    if (o.verb) { const v = c.createGain(); v.gain.value = o.verb; env.connect(v); v.connect(this.verbSfx); }
    src.start(t0); src.stop(end); if (ns) { ns.start(t0, Math.random()); ns.stop(end); }
  }
  // çok sesli patlamalar (alkış, kalabalık, kıvılcım yağmuru): yüzlerce kısa ses bir kez çevrimdışı üretilir, sonra tek tampon çalar.
  // Gerçek zamanlı ses iş parçacığı yüzlerce düğümü aynı anda işlemeye çalışınca cızırdıyordu; ses aynı, yük tek düğüm.
  // fn(E, t, g): E sahte motor (kanal 0 kuru, kanal 1 yankı gönderimi)
  bake(key, dur, fn) {
    const B = this.baked || (this.baked = new Map()); if (B.has(key)) return B.get(key);
    B.set(key, null); if (!this.ctx || typeof OfflineAudioContext === 'undefined') return null;
    try {
      const sr = this.ctx.sampleRate, oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), E = Object.create(AudioEngine.prototype), mg = oc.createChannelMerger(2);
      mg.connect(oc.destination); E.ctx = oc; E.noise = this.noise; E.sfxDest = null;
      E.sfx = oc.createGain(); E.verbSfx = oc.createGain(); E.sfx.connect(mg, 0, 0); E.verbSfx.connect(mg, 0, 1); E.mus = E.sfx; E.verbMus = E.verbSfx; E.dlyIn = E.verbSfx;
      fn(E, 0.02, 1);
      oc.startRendering().then((b) => B.set(key, b), () => B.delete(key));
    } catch (e) { B.delete(key); }
    return null;
  }
  playBaked(key, t, g = 1) {
    const b = this.baked && this.baked.get(key); if (!b) return false;
    const c = this.ctx, s = c.createBufferSource(), sp = c.createChannelSplitter(2), d = c.createGain(), w = c.createGain();
    s.buffer = b; d.gain.value = g; w.gain.value = g; s.connect(sp); sp.connect(d, 0); sp.connect(w, 1); d.connect(this.sfxDest || this.sfx); w.connect(this.verbSfx);
    s.start(Math.max(t - 0.02, c.currentTime)); return true;
  }
  // hazırsa pişmiş tampon, değilse (yalnız ilk kez) canlı üretim; her iki yol da aynı fn
  burst(key, dur, t, g, fn) { if (!this.ok) return; if (this.playBaked(key, t, g)) return; this.bake(key, dur, fn); fn(this, t, g); }
  // önceden pişir: liste kare kare işlenir, açılışta tek bir takılma olmasın
  prebake(list) { let k = 0; const step = () => { if (k >= list.length) return; const [key, dur, fn] = list[k++]; this.bake(key, dur, fn); setTimeout(step, 60); }; step(); }
  makeIR(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 2400 ? 0.4 : 1); }
      for (let k = 0; k < 7; k++) { const p = Math.floor(c.sampleRate * (0.012 + k * 0.017 + ch * 0.003)); if (p < len) d[p] += (k % 2 ? -0.6 : 0.7) * (1 - k / 8); }
    }
    return b;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }
  setSfx(on) { this.sfxOn = on; if (!this.ctx) return; const t = this.t; this.sfx.gain.setTargetAtTime(on ? 1 : 0, t, 0.05); this.amb.gain.setTargetAtTime(on ? 1 : 0, t, 0.05); this.verbSfx.gain.setTargetAtTime(on ? 1 : 0, t, 0.05); }
  setMusic(on) { this.musicOn = on; if (!this.ctx) return; const t = this.t; this.mus.gain.setTargetAtTime(on ? 0.75 : 0, t, 0.1); this.verbMus.gain.setTargetAtTime(on ? 1 : 0, t, 0.1); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  /* --- yapı taşları --- */
  osc(type, f, t0, dur, gain, dest, { a = 0.004, f1 = null, curve = 'exp', verb = 0, detune = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); t0 = Math.max(t0, c.currentTime); // geçmişe kurulan zarf anında tam sesle başlar (tık)
    o.type = type; o.frequency.setValueAtTime(f, t0); if (detune) o.detune.value = detune;
    if (f1 !== null) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); else o.frequency.linearRampToValueAtTime(f1, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxDest || this.sfx);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(dest === this.mus ? this.verbMus : this.verbSfx); }
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  noiseHit(t0, dur, gain, { type = 'bandpass', f = 1000, f1 = null, q = 1, a = 0.003, verb = 0, dest = null } = {}) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); t0 = Math.max(t0, c.currentTime);
    s.buffer = this.noise; fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f1 !== null) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfxDest || this.sfx);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbSfx); }
    s.start(t0, Math.random() * Math.max(0, 1.9 - dur)); s.stop(t0 + dur + 0.05);
  }
  bell(f, t0, dur, gain, { ratio = 2.0, index = 2.5, dest = null, verb = 0.5, dly = 0 } = {}) {
    const c = this.ctx, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(); t0 = Math.max(t0, c.currentTime);
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t0); mg.gain.exponentialRampToValueAtTime(f * 0.05, t0 + dur * 0.7);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    car.connect(g); g.connect(dest || this.sfxDest || this.sfx);
    const isMus = dest === this.mus;
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(isMus ? this.verbMus : this.verbSfx); }
    if (dly) { const v = c.createGain(); v.gain.value = dly; g.connect(v); v.connect(this.dlyIn); }
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  }

  /* --- oyun sesleri --- */
  tick(u) {
    if (!this.ok) return; const t = this.t; if (t - this.lastTick < 0.035) return; this.lastTick = t;
    this.noiseHit(t, 0.03, 0.09, { f: 3400, q: 7 });
    this.osc('sine', 1700 + u * 900, t, 0.06, 0.05, null, { f1: 1500 + u * 800 });
  }
  clunk() { if (!this.ok) return; const t = this.t; this.osc('sine', 120, t, 0.18, 0.22, null, { f1: 60 }); this.noiseHit(t, 0.08, 0.1, { type: 'lowpass', f: 900 }); }
  setHum(speed, u, lit) {
    if (!this.ok) return; const t = this.t, h = this.hum;
    const f = 150 + u * 140;
    h.o1.frequency.setTargetAtTime(f, t, 0.05); h.o2.frequency.setTargetAtTime(f * 2.0, t, 0.05); h.o3.frequency.setTargetAtTime(f * 3.01, t, 0.05);
    h.g.gain.setTargetAtTime(Math.min(0.065, speed * 0.05), t, 0.06);
    h.f.frequency.setTargetAtTime(900 + Math.min(1, speed) * 2400, t, 0.08);
  }
  setSizzle(level) {
    if (!this.ok) return; const t = this.t;
    this.sizzle.g.gain.setTargetAtTime(level * 0.16, t, level > 0 ? 0.02 : 0.08);
    if (level > 0.05 && t > this.nextCrackle) {
      this.nextCrackle = t + 0.03 + Math.random() * 0.09 / (0.3 + level);
      this.noiseHit(t, 0.012 + Math.random() * 0.02, 0.05 + level * 0.12, { f: 1800 + Math.random() * 4000, q: 4 });
    }
  }
  step() {
    if (!this.ok) return; const t = this.t; if (t - this.lastStep < 0.08) return; this.lastStep = t;
    const f = 420 + Math.random() * 160; this.osc('sine', f, t, 0.07, 0.035, null, { f1: f * 0.55 });
  }
  relief() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.45, 0.08, { type: 'lowpass', f: 300, f1: 1400, a: 0.12 }); this.osc('sine', 330, t, 0.5, 0.05, null, { f1: 220, a: 0.05, verb: 0.4 }); }
  collect(n) {
    if (!this.ok) return; const t = this.t; const sc = MUSIC[this.chapter].scale, root = MUSIC[this.chapter].root + 24;
    const m = root + sc[n % sc.length] + 12 * Math.floor(n / sc.length);
    this.bell(mtof(m), t, 1.2, 0.11, { ratio: 3.0, index: 1.6, verb: 0.6 });
    this.osc('sine', 260, t, 0.12, 0.08, null, { f1: 900 });
  }
  evaporate() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.5, 0.09, { type: 'highpass', f: 3000, f1: 7000, a: 0.02 }); this.osc('sine', 720, t, 0.45, 0.05, null, { f1: 260 }); }
  eclipse() {
    if (!this.ok) return; const t = this.t;
    this.osc('sine', 72, t, 1.6, 0.42, null, { f1: 32 });
    this.noiseHit(t, 0.9, 0.12, { type: 'lowpass', f: 200, f1: 3500, a: 0.7, verb: 0.6 });
    const ch = [57, 60, 64, 67, 71];
    for (let i = 0; i < ch.length; i++) for (const det of [-9, 9]) this.osc('sawtooth', mtof(ch[i]), t + 0.15, 2.6, 0.012, null, { a: 0.7, detune: det, verb: 1.2 });
  }
  gate() {
    if (!this.ok) return; const t = this.t;
    this.osc('sine', 300, t, 0.7, 0.12, null, { f1: 1400, verb: 0.8 });
    this.osc('sine', 90, t + 0.05, 1.1, 0.35, null, { f1: 40 });
    this.noiseHit(t, 1.4, 0.1, { type: 'bandpass', f: 600, f1: 6000, q: 0.8, a: 0.05, verb: 1.0 });
  }
  nightfall() {
    if (!this.ok) return; const t = this.t, m = MUSIC[this.chapter];
    const ch = m.chords[0];
    ch.forEach((n, i) => { this.osc('triangle', mtof(n + 12), t + i * 0.06, 3.2, 0.035, null, { a: 0.4, verb: 1.4 }); });
    [0, 2, 4, 7].forEach((k, i) => this.bell(mtof(m.root + 24 + m.scale[k % m.scale.length] + (k >= m.scale.length ? 12 : 0)), t + 0.25 + i * 0.11, 1.8, 0.05, { ratio: 2, index: 1.2, verb: 0.9 }));
  }
  star(i, lit) {
    if (!this.ok) return; const t = this.t, m = MUSIC[this.chapter];
    if (lit) { const n = m.root + 24 + [0, 4, 7][i] + (i === 2 ? 5 : 0); this.bell(mtof(n), t, 1.8, 0.14, { ratio: 2.0, index: 2.2, verb: 0.9 }); this.bell(mtof(n + 12), t + 0.02, 1.2, 0.05, { ratio: 3.5, index: 1.0, verb: 0.6 }); this.noiseHit(t, 0.25, 0.05, { type: 'highpass', f: 6000 }); }
    else this.osc('sine', 300, t, 0.2, 0.05, null, { f1: 240 });
  }
  fail() {
    if (!this.ok) return; const t = this.t;
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(70, t + 1.0);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(200, t + 1.0);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 1.2);
    this.noiseHit(t, 0.8, 0.16, { type: 'lowpass', f: 1800, f1: 120, verb: 0.6 });
    this.osc('sine', 110, t, 0.5, 0.3, null, { f1: 45 });
  }
  ui() { if (!this.ok) return; const t = this.t; this.osc('sine', 880, t, 0.05, 0.05, null, { f1: 1200 }); this.noiseHit(t, 0.02, 0.03, { f: 5000, q: 3 }); }
  whoosh(up = true, dur = 0.7, gain = 0.1) { if (!this.ok) return; const t = this.t; this.noiseHit(t, dur, gain, { type: 'bandpass', f: up ? 250 : 2400, f1: up ? 2600 : 200, q: 1.2, a: dur * 0.45, verb: 0.3 }); }
  rise() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.6, 0.12, { type: 'lowpass', f: 120, f1: 480, a: 0.5 }); this.osc('sine', 55, t, 1.6, 0.18, null, { f1: 110, a: 0.4 }); }
  pop(k = 0) { if (!this.ok) return; const t = this.t; const f = 500 + (k % 7) * 70 + Math.random() * 40; this.osc('sine', f, t, 0.09, 0.03, null, { f1: f * 1.6 }); }
  heartbeat() { if (!this.ok) return; const t = this.t; this.osc('sine', 62, t, 0.16, 0.3, null, { f1: 40 }); this.osc('sine', 58, t + 0.2, 0.16, 0.22, null, { f1: 38 }); }
  burner() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.7, 0.05, { type: 'bandpass', f: 700, q: 0.8, a: 0.08 }); }
  crystal(on) {
    if (!this.ok) return; const t = this.t;
    if (on) { this.bell(1320, t, 0.9, 0.06, { ratio: 1.5, index: 0.8, verb: 0.7 }); this.bell(1980, t + 0.05, 0.8, 0.04, { ratio: 2.5, index: 0.6, verb: 0.6 }); }
    else this.osc('sine', 600, t, 0.25, 0.04, null, { f1: 300 });
  }
  // rekor / kutlama: yükselen beşli ezgi (pentatonik), yumuşak çan
  chime() { if (!this.ok) return; const t = this.t; [72, 76, 79, 84].forEach((m, i) => this.bell(mtof(m), t + i * 0.09, 1.1, 0.05, { ratio: 2.0, index: 1.2, verb: 0.8 })); }
  // gölge kuşu: kanat hışırtısı + kısa iki notalı ötüş (sürü büyüdükçe incelir) · ürküp kaçış
  shadowBird(n = 0) { if (!this.ok) return; const t = this.t, f = 1050 + (n % 7) * 85; this.noiseHit(t, 0.16, 0.03, { type: 'bandpass', f: 900, f1: 2600, q: 1.4, a: 0.02 }); this.osc('sine', f, t + 0.04, 0.07, 0.02, null, { f1: f * 1.3, verb: 0.4 }); this.osc('sine', f * 1.19, t + 0.13, 0.08, 0.016, null, { f1: f * 1.5, verb: 0.4 }); }
  // Kuş Kalkanı: kanat girdabı + iki notalı yumuşak ötüş
  flockOn(n = 8) { if (!this.ok) return; const t = this.t; for (let i = 0; i < Math.min(12, n + 3); i++) this.noiseHit(t + i * 0.03, 0.14, 0.028, { type: 'bandpass', f: 900 + Math.random() * 1900, f1: 600, q: 1.6, a: 0.01 }); this.noiseHit(t, 0.7, 0.05, { type: 'lowpass', f: 500, f1: 1800, a: 0.2, verb: 0.4 }); this.osc('sine', 392, t + 0.05, 0.7, 0.035, null, { f1: 523, a: 0.08, verb: 0.7 }); this.osc('sine', 494, t + 0.14, 0.7, 0.028, null, { f1: 659, a: 0.08, verb: 0.7 }); }
  // Zifir'in eriyişi: cızırtı ve iç çekiş, jel damla şıpırtıları, buhar, son ışığın çanı
  meltStart() {
    if (!this.ok) return; const t = this.t;
    this.noiseHit(t, 1.8, 0.045, { type: 'bandpass', f: 900, f1: 5200, q: 0.8, a: 0.45, verb: 0.3 });
    this.osc('sine', 240, t + 0.05, 1.7, 0.045, null, { f1: 95, a: 0.18, verb: 0.6 }); this.osc('triangle', 352, t + 0.12, 1.3, 0.02, null, { f1: 150, a: 0.25, verb: 0.6 });
  }
  meltPlop(r = 0.05) {
    if (!this.ok) return; const now = performance.now(); if (now - (this.lastPlop || 0) < 45) return; this.lastPlop = now;
    const t = this.t, f = Math.max(160, 560 - r * 3400 + Math.random() * 140);
    this.osc('sine', f, t, 0.13, 0.045, null, { f1: f * 0.38, a: 0.003 }); this.noiseHit(t, 0.03, 0.018, { type: 'bandpass', f: 2600, q: 2 });
  }
  meltHiss() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.1, 0.035, { type: 'highpass', f: 2800, a: 0.25, verb: 0.25 }); this.noiseHit(t + 0.2, 0.9, 0.02, { type: 'bandpass', f: 6000, f1: 9000, q: 1, a: 0.2 }); }
  meltSpark() { if (!this.ok) return; const t = this.t; this.bell(mtof(88), t, 2.6, 0.032, { ratio: 2.0, index: 0.9, verb: 0.9 }); this.bell(mtof(95), t + 0.22, 2.4, 0.018, { ratio: 3.0, index: 0.7, verb: 0.9 }); }
  // Karagöz perdesi: nareke (kamış düdük), def, konuşma tıkırtısı, kafa atma
  khNareke() {
    if (!this.ok) return; const t = this.t + 0.05;
    [[76, 0.13], [79, 0.1], [77, 0.1], [76, 0.13], [74, 0.1], [76, 0.34]].reduce((at, [m, d]) => {
      const f = mtof(m); this.osc('square', f, at, d + 0.06, 0.016, null, { f1: f * 1.03, a: 0.012, verb: 0.35, detune: 6 }); this.osc('sine', f * 2, at, d + 0.04, 0.012, null, { f1: f * 2.06, a: 0.01, verb: 0.3 });
      return at + d;
    }, t);
    this.khDef(t); this.khDef(t + 0.44, 0.7);
  }
  khDef(at = null, k = 1) {
    if (!this.ok) return; const t = at === null ? this.t : at;
    this.osc('sine', 120, t, 0.16, 0.07 * k, null, { f1: 70 });
    this.noiseHit(t, 0.05, 0.03 * k, { type: 'lowpass', f: 700 });
    for (let i = 0; i < 3; i++) this.noiseHit(t + 0.01 + i * 0.025, 0.12, 0.022 * k, { type: 'bandpass', f: 6200 + i * 900, q: 2.5, verb: 0.2 });
  }
  khBlip(who) {
    if (!this.ok) return; const t = this.t, f = (who === 'K' ? 150 : 225) * (0.92 + Math.random() * 0.2);
    this.osc('triangle', f, t, 0.055, 0.02, null, { f1: f * (0.9 + Math.random() * 0.25), a: 0.004 });
  }
  khBonk() {
    if (!this.ok) return; const t = this.t;
    this.osc('sine', 540, t, 0.2, 0.11, null, { f1: 190 }); this.osc('triangle', 820, t, 0.08, 0.04, null, { f1: 400 });
    this.noiseHit(t, 0.07, 0.07, { type: 'bandpass', f: 1600, q: 1.4 });
    this.osc('sine', 1500, t + 0.12, 0.6, 0.026, null, { f1: 420, curve: 'lin', a: 0.02, verb: 0.3 });
  }
  shadowFlee() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.28, 0.035, { type: 'bandpass', f: 2200, f1: 700, q: 1.2, a: 0.01 }); }
  // havai fişek: yükselen ıslık, patlama gümbürtüsü (uzaktan, yankılı), çıtırtı
  fwLaunch() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.0, 0.02, { type: 'bandpass', f: 800, f1: 3000, q: 7, a: 0.3, verb: 0.35 }); this.osc('sine', 650, t, 0.95, 0.01, null, { f1: 1800, a: 0.35, verb: 0.35 }); }
  fwBoom(cr) { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.1, 0.12, { type: 'lowpass', f: 1100, f1: 110, a: 0.004, verb: 0.75 }); this.osc('sine', 72, t, 0.7, 0.14, null, { f1: 36 }); if (cr) for (let i = 0; i < 16; i++) this.noiseHit(t + 0.55 + Math.random() * 1.0, 0.025, 0.02, { type: 'highpass', f: 3000 + Math.random() * 4500, q: 2, verb: 0.45 }); }
  closeCall() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.35, 0.08, { type: 'highpass', f: 1200, f1: 9000, a: 0.3 }); this.bell(1760, t + 0.3, 1.2, 0.07, { ratio: 2.0, index: 1.4, verb: 0.9 }); }
  iceCrack() { if (!this.ok) return; const t = this.t; for (let i = 0; i < 4; i++) this.noiseHit(t + i * 0.035 + Math.random() * 0.02, 0.05, 0.05, { type: 'highpass', f: 2500 + Math.random() * 3000, q: 2 }); this.osc('sine', 90, t, 0.3, 0.08, null, { f1: 50 }); this.bell(2637, t + 0.05, 1.4, 0.025, { ratio: 3.01, index: 0.9, verb: 0.9 }); }
  tock(hi) { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.05, 0.06, { f: hi ? 2200 : 1600, q: 9 }); this.osc('sine', hi ? 1040 : 780, t, 0.08, 0.04, null, { f1: hi ? 980 : 720 }); this.osc('sine', 140, t, 0.12, 0.05, null, { f1: 80 }); }
  flareWarn() { if (!this.ok) return; const t = this.t; this.osc('sawtooth', 110, t, 1.25, 0.035, null, { f1: 440, a: 0.9, verb: 0.4 }); this.noiseHit(t, 1.25, 0.06, { type: 'bandpass', f: 300, f1: 3000, q: 1.5, a: 1.0, verb: 0.4 }); }
  flareBurst() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.6, 0.18, { type: 'lowpass', f: 3500, f1: 400, a: 0.02, verb: 0.6 }); this.osc('sine', 70, t, 1.2, 0.22, null, { f1: 40 }); this.bell(880, t, 1.8, 0.05, { ratio: 1.41, index: 3, verb: 0.8 }); }
  sprite(n = 0) { if (!this.ok) return; const t = this.t, sc = MUSIC[this.chapter].scale, r = MUSIC[this.chapter].root + 24; for (let i = 0; i < 4; i++) this.bell(mtof(r + sc[(i * 2 + n) % sc.length] + 12 * Math.floor((i * 2 + n) / sc.length)), t + i * 0.07, 1.1, 0.05, { ratio: 2, index: 1.2, verb: 0.8, dly: 0.4 }); this.noiseHit(t, 0.6, 0.05, { type: 'highpass', f: 4000, f1: 9000, a: 0.2, verb: 0.6 }); }
  dash() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.4, 0.14, { type: 'bandpass', f: 300, f1: 3200, q: 1.4, a: 0.05, verb: 0.3 }); this.osc('sine', 220, t, 0.3, 0.08, null, { f1: 660 }); }
  streak(n) { if (!this.ok) return; const t = this.t, sc = MUSIC[this.chapter].scale, r = MUSIC[this.chapter].root + 12; for (let i = 0; i <= Math.min(n, 5); i++) this.bell(mtof(r + sc[i % sc.length] + 12 * Math.floor(i / sc.length) + 12), t + i * 0.06, 0.9, 0.045, { ratio: 2, index: 1.0, verb: 0.6 }); }
  /* --- gölge tiyatrosu --- */
  theaterOpen() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 1.8, 0.07, { type: 'bandpass', f: 400, f1: 1600, q: 0.8, a: 0.6, verb: 0.6 }); this.bell(mtof(62), t + 0.2, 2.5, 0.05, { ratio: 1.5, index: 1.2, verb: 0.9 }); this.bell(mtof(69), t + 0.45, 2.5, 0.04, { ratio: 1.5, index: 1.2, verb: 0.9 }); }
  theaterTone(k) {
    if (!this.ok) return; const c = this.ctx, t = this.t;
    if (!this.thT) { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'triangle'; o2.type = 'sine'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); const v = c.createGain(); v.gain.value = 0.5; g.connect(v); v.connect(this.verbSfx); o.start(); o2.start(); this.thT = { o, o2, g, f }; }
    const h = this.thT, fr = 110 * Math.pow(2, k * 1.58);
    h.o.frequency.setTargetAtTime(fr, t, 0.08); h.o2.frequency.setTargetAtTime(fr * 1.5 + Math.sin(t * 6) * k * 3, t, 0.08);
    h.f.frequency.setTargetAtTime(500 + k * k * 2600, t, 0.1); h.g.gain.setTargetAtTime(k > 0.02 ? 0.006 + k * k * 0.045 : 0, t, 0.12);
  }
  theaterCreak(v) { if (!this.ok || v < 0.05) return; const t = this.t; if (t - (this.lastCreak || 0) < 0.11) return; this.lastCreak = t; this.noiseHit(t, 0.06, 0.006 + v * 0.014, { type: 'bandpass', f: 700 + Math.random() * 700, q: 6 }); }
  theaterSolve() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.05, 0.12, { f: 3000, q: 4 }); this.osc('sine', 90, t, 1.6, 0.25, null, { f1: 45, verb: 0.6 }); this.noiseHit(t + 0.02, 1.4, 0.05, { type: 'bandpass', f: 300, f1: 2400, q: 0.8, a: 0.4, verb: 0.8 }); }
  theaterAlive(key) {
    if (!this.ok) return; const t = this.t + 0.5;
    if (key === 'kus') { for (let i = 0; i < 6; i++) this.noiseHit(t + i * 0.19, 0.16, 0.06, { type: 'bandpass', f: 600, f1: 1800, q: 1.2 }); for (let i = 0; i < 3; i++) this.osc('sine', 2600, t + 0.4 + i * 0.12, 0.09, 0.03, null, { f1: 3400 }); }
    else if (key === 'kedi') { const o = this.osc('sawtooth', 520, t + 0.2, 0.7, 0.05, null, { f1: 380, curve: 'lin', verb: 0.4 }); o.frequency.linearRampToValueAtTime(820, t + 0.45); o.frequency.linearRampToValueAtTime(420, t + 0.9); }
    else if (key === 'balina') { const o = this.osc('sine', 140, t, 2.6, 0.12, null, { f1: 95, curve: 'lin', verb: 1, a: 0.6 }); o.frequency.linearRampToValueAtTime(230, t + 1.1); o.frequency.linearRampToValueAtTime(95, t + 2.6); this.noiseHit(t + 0.9, 1.0, 0.07, { type: 'highpass', f: 1500, a: 0.1, verb: 0.6 }); }
    else if (key === 'tavsan') { for (let i = 0; i < 4; i++) this.osc('sine', 300 + i * 40, t + 1.6 + i * 0.62, 0.12, 0.06, null, { f1: 700 }); }
    else if (key === 'fil') { const o = this.osc('sawtooth', 330, t + 0.5, 1.3, 0.06, null, { f1: 300, curve: 'lin', verb: 0.7, a: 0.08 }); o.frequency.linearRampToValueAtTime(520, t + 0.9); o.frequency.linearRampToValueAtTime(420, t + 1.7); for (let i = 0; i < 4; i++) this.osc('sine', 60, t + 2.6 + i * 0.6, 0.3, 0.12, null, { f1: 40 }); }
    else { this.pop(2); this.bell(mtof(74), t + 2.2, 1.5, 0.05, { ratio: 2, index: 1, verb: 0.8 }); this.bell(mtof(81), t + 3.6, 2.5, 0.06, { ratio: 2, index: 1.4, verb: 1, dly: 0.5 }); }
  }
  stoneRise() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.25, 0.05, { type: 'lowpass', f: 400 }); }

  /* --- müzik & ambiyans planlayıcı --- */
  setChapter(ch) { this.chapter = ch; this.birdsOn = ch <= 2; }
  // tiyatro modu: dış dünya müziği ve rüzgârı susar, tiyatronun kendi topluluğu çalar
  setTheater(on) { this.thMode = on; if (!this.ok) return; this.windG.gain.setTargetAtTime(on ? 0 : 0.05, this.t, on ? 0.4 : 2.0); }
  // ezgi sesi: yumuşak, nefesli (üçgen + sinüs, titreşimli, alçak geçiren)
  lead(f, t0, dur, g) {
    const c = this.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), e = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2.003; lp.type = 'lowpass'; lp.frequency.value = Math.min(4200, f * 4.5);
    vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    const g2 = c.createGain(); g2.gain.value = 0.22; o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(e);
    e.gain.setValueAtTime(0.0001, t0); e.gain.linearRampToValueAtTime(g, t0 + 0.09); e.gain.setTargetAtTime(g * 0.7, t0 + 0.1, dur * 0.4); e.gain.setTargetAtTime(0.0001, t0 + dur, 0.12);
    e.connect(this.mus); const v = c.createGain(); v.gain.value = 0.55; e.connect(v); v.connect(this.verbMus); const d = c.createGain(); d.gain.value = 0.35; e.connect(d); d.connect(this.dlyIn);
    const end = t0 + dur + 0.7; for (const o of [o1, o2, vib]) { o.start(t0); o.stop(end); }
  }
  // uyarlanabilir katmanlar: gölgede ezgi, ışıkta bas nabzı, seride üst çanlar, finalde/patlamada vurmalı
  layers(t, m, playing) {
    const md = this.mood || {}, beat = 60 / (70 + m.tempo * 50);
    if (!this.nextBeat || this.nextBeat < t - 1) this.nextBeat = t + 0.1;
    if (t > this.nextBeat - 0.12) {
      const bt = this.nextBeat, k = (this.beatN = (this.beatN || 0) + 1), root = m.chords[(this.chordIdx + m.chords.length - 1) % m.chords.length][0];
      const tens = playing ? this.intensity : 0;
      // ışıkta: alçak bas nabzı (kalp gibi), yoğunlukla güçlenir
      if (tens > 0.25) { this.osc('sine', mtof(root - 12 + (k % 4 === 2 ? 7 : 0)), bt, beat * 0.7, 0.07 * tens, this.mus, { a: 0.01, f1: mtof(root - 12) * 0.9 }); if (k % 2 === 0) this.noiseHit(bt, 0.12, 0.02 * tens, { type: 'lowpass', f: 220, dest: this.mus }); }
      // final ya da güneş patlaması: davul deseni (düm-tek)
      const drum = playing && (md.finale || md.flare > 0.2) ? (md.flare > 0.2 ? 1 : 0.6) : 0;
      if (drum > 0) { const pat = [1, 0, 0.5, 0, 1, 0.5, 0, 0.5][k % 8]; if (pat) { this.osc('sine', pat > 0.7 ? 92 : 150, bt, 0.22, 0.06 * pat * drum, this.mus, { a: 0.003, f1: pat > 0.7 ? 46 : 90 }); this.noiseHit(bt, 0.06, 0.018 * pat * drum, { f: pat > 0.7 ? 900 : 2600, q: 2, dest: this.mus }); } }
      // gölge serisi: üst çanlar seyrek parıldar
      if (playing && (md.streak || 0) >= 2 && k % 2 === 1 && Math.random() < 0.55) this.bell(mtof(m.root + 36 + m.scale[(k * 3) % m.scale.length]), bt, 1.2, 0.012 + Math.min(0.012, md.streak * 0.002), { ratio: 3.0, index: 0.8, dest: this.mus, verb: 0.8 });
      this.nextBeat = bt + beat;
    }
    // ezgi: sakin (gölge) anlarda, ~16 sn'de bir; her dönüşte biraz değişir
    if (t > (this.nextMotif || 0) && this.intensity < 0.2) {
      const mot = MOTIFS[this.chapter % MOTIFS.length], var_ = (this.motifN = (this.motifN || 0) + 1) % 3, sc = m.scale, n = sc.length;
      const d = beat * (var_ === 2 ? 0.75 : 1);
      let at = Math.max(t + 0.1, this.nextBeat || t);
      mot.forEach((deg, i) => {
        const dd = var_ === 1 ? (i === mot.length - 1 ? deg : deg + 1) : deg, o = Math.floor(dd / n), idx = ((dd % n) + n) % n;
        const note = m.root + 12 + o * 12 + sc[idx], step = d * (i % 3 === 2 ? 1.5 : 1), len = i === mot.length - 1 ? d * 2.6 : step;
        this.lead(mtof(note), at, len, playing ? 0.026 : 0.02);
        at += step;
      });
      this.nextMotif = t + 15 + Math.random() * 6;
    }
  }
  update(dt, playing) {
    if (!this.ok || this.ctx.state !== 'running') return;
    if (this.thMode) return;
    const t = this.t, m = MUSIC[this.chapter];
    if (this.musicOn) this.layers(t, m, playing);
    // rüzgâr
    if (Math.random() < dt * 0.5) this.windF.frequency.setTargetAtTime(300 + Math.random() * 700, t, 1.2);
    // akorlar
    if (t > this.nextChord - 0.3) {
      const start = Math.max(t + 0.05, this.nextChord);
      const ch = m.chords[this.chordIdx++ % m.chords.length];
      this.padChord(ch, start, 9.5);
      this.nextChord = start + 8;
    }
    // arpej
    if (t > this.nextArp - 0.2) {
      const start = Math.max(t + 0.05, this.nextArp);
      const sc = m.scale; const oct = Math.random() < 0.3 ? 36 : 24;
      const n = m.root + oct + sc[Math.floor(Math.random() * sc.length)];
      const g = (0.028 + Math.random() * 0.02) * (playing ? 1 : 0.8);
      this.bell(mtof(n), start, 1.6 + Math.random(), g, { ratio: 2.0, index: 1.1 * m.bright, dest: this.mus, verb: 0.7, dly: 0.55 });
      const dens = 1 + this.intensity * 1.5;
      this.nextArp = start + (0.5 + Math.random() * 1.1) * (1 / m.tempo) * 0.6 / dens;
    }
    // dünya ambiyansı
    if (m.clock && t > (this.nextClock || 0)) { this.nextClock = Math.max(t, this.nextClock || 0) + 1.0; const hi = (this.clockN = (this.clockN || 0) + 1) % 2; this.noiseHit(this.nextClock, 0.03, 0.022, { f: hi ? 3000 : 2200, q: 10, dest: this.amb }); }
    if (m.ice && Math.random() < dt * 0.25) this.bell(mtof(m.root + 36 + m.scale[Math.floor(Math.random() * m.scale.length)]), t + 0.05, 2.4, 0.012, { ratio: 3.5, index: 0.6, dest: this.amb, verb: 0.9 });
    // kuşlar
    if (this.birdsOn && t > this.nextBird) {
      this.nextBird = t + 4 + Math.random() * 8;
      const base = 2600 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) this.osc('sine', base, t + i * 0.09, 0.07, 0.012, this.amb, { f1: base * (1.25 + Math.random() * 0.3) });
    }
  }
  padChord(notes, t0, dur) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 650 + MUSIC[this.chapter].bright * 300; f.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 2.6); g.gain.setValueAtTime(0.03, t0 + dur - 3.2); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g); g.connect(this.mus);
    const v = c.createGain(); v.gain.value = 0.9; g.connect(v); v.connect(this.verbMus);
    for (const n of notes) for (const det of [-7, 6]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det + (Math.random() * 4 - 2);
      const og = c.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(f); o.start(t0); o.stop(t0 + dur + 0.1);
    }
    // bas
    this.osc('sine', mtof(notes[0] - 12), t0, dur * 0.8, 0.05, this.mus, { a: 1.5 });
  }
}
const audio = new AudioEngine();
