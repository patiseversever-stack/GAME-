
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
];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

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
    this.master.connect(comp); comp.connect(c.destination);
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
  }
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
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (detune) o.detune.value = detune;
    if (f1 !== null) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); else o.frequency.linearRampToValueAtTime(f1, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfx);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(dest === this.mus ? this.verbMus : this.verbSfx); }
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  noiseHit(t0, dur, gain, { type = 'bandpass', f = 1000, f1 = null, q = 1, a = 0.003, verb = 0, dest = null } = {}) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f1 !== null) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfx);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbSfx); }
    s.start(t0, Math.random() * Math.max(0, 1.9 - dur)); s.stop(t0 + dur + 0.05);
  }
  bell(f, t0, dur, gain, { ratio = 2.0, index = 2.5, dest = null, verb = 0.5, dly = 0 } = {}) {
    const c = this.ctx, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t0); mg.gain.exponentialRampToValueAtTime(f * 0.05, t0 + dur * 0.7);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    car.connect(g); g.connect(dest || this.sfx);
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
  closeCall() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.35, 0.08, { type: 'highpass', f: 1200, f1: 9000, a: 0.3 }); this.bell(1760, t + 0.3, 1.2, 0.07, { ratio: 2.0, index: 1.4, verb: 0.9 }); }
  stoneRise() { if (!this.ok) return; const t = this.t; this.noiseHit(t, 0.25, 0.05, { type: 'lowpass', f: 400 }); }

  /* --- müzik & ambiyans planlayıcı --- */
  setChapter(ch) { this.chapter = ch; this.birdsOn = ch <= 2; }
  update(dt, playing) {
    if (!this.ok || this.ctx.state !== 'running') return;
    const t = this.t, m = MUSIC[this.chapter];
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
