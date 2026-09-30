// Üretken ambient müzik — dikkati boğmayan, çok hafif.
// Katmanlar: (1) yavaş akor padi  (2) seyrek, yumuşak "elektrikli piyano" notaları  (3) oda tınısı.
// Re Dorian renginde; akorlar 18 sn'de bir yumuşakça değişir. Tümü sentez: indirme yok.

const CHORDS = [
  [146.83, 220.0, 261.63, 329.63, 349.23], // Dm9
  [116.54, 174.61, 220.0, 293.66, 349.23], // Bbmaj7
  [98.0, 146.83, 233.08, 293.66, 349.23], // Gm9
  [110.0, 164.81, 220.0, 277.18, 392.0], // A7sus
];
// Re Dorian pentatonik
const SCALE = [293.66, 329.63, 349.23, 440.0, 523.25, 587.33, 659.25, 698.46, 880.0];

export class Music {
  constructor(ctx, out, rand = Math.random) {
    this.ctx = ctx;
    this.rand = rand;
    this.out = out;
    this.playing = false;
    this.timers = new Set();
    this.nodes = [];
    this.root = ctx.createGain();
    this.root.gain.value = 0;
    this.root.connect(out);
    // basit yankı: üstel sönümlü gürültü impulse yanıtı
    this.rev = ctx.createConvolver();
    this.rev.buffer = this._impulse(2.6, 2.2);
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.55;
    this.rev.connect(this.revGain);
    this.revGain.connect(this.root);
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.8;
    this.dry.connect(this.root);
    this.chord = 0;
    this.padGain = null;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  start(volume = 1) {
    if (this.playing) return this.setVolume(volume);
    this.playing = true;
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(this.root.gain.value, t);
    this.root.gain.linearRampToValueAtTime(0.26 * volume, t + 2.5);
    this._room();
    this._pad(0);
    this._schedulePluck(1.2);
    this._scheduleChord(16);
  }

  setVolume(v) {
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setTargetAtTime(0.26 * v, t, 0.3);
  }

  duck(amount = 0.45, seconds = 1.4) {
    const t = this.ctx.currentTime;
    const cur = this.root.gain.value;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(cur, t);
    this.root.gain.linearRampToValueAtTime(cur * amount, t + 0.15);
    this.root.gain.linearRampToValueAtTime(cur, t + seconds);
  }

  stop(fade = 1.2) {
    if (!this.playing) return;
    this.playing = false;
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(this.root.gain.value, t);
    this.root.gain.linearRampToValueAtTime(0, t + fade);
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    const nodes = this.nodes.splice(0);
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop?.();
        } catch {}
        try {
          n.disconnect?.();
        } catch {}
      }
    }, fade * 1000 + 120);
  }

  _later(fn, sec) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.playing) fn();
    }, sec * 1000);
    this.timers.add(id);
  }

  _room() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; // pembe-gürültü benzeri
      d[i] = last * 6;
    }
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.dry);
    src.start();
    this.nodes.push(src);
  }

  _pad(idx) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const chord = CHORDS[idx % CHORDS.length];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 720;
    lp.Q.value = 0.3;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 180;
    lfo.connect(lfoG);
    lfoG.connect(lp.frequency);
    lfo.start(t);
    g.connect(lp);
    lp.connect(this.dry);
    lp.connect(this.rev);
    const oscs = [];
    for (const f of chord) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 0.06;
        o.connect(og);
        og.connect(g);
        o.start(t);
        oscs.push(o);
      }
    }
    // önceki pad'i sönümle
    if (this.padGain) {
      const old = this.padGain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0.0001, t + 6);
      const oldNodes = this.padNodes;
      setTimeout(() => {
        for (const n of oldNodes) {
          try {
            n.stop?.();
            n.disconnect?.();
          } catch {}
        }
      }, 6500);
    }
    this.padGain = g;
    this.padNodes = [...oscs, lfo, g, lp];
    this.nodes.push(...oscs, lfo);
  }

  _scheduleChord(sec) {
    this._later(() => {
      this.chord = (this.chord + 1) % CHORDS.length;
      this._pad(this.chord);
      this._scheduleChord(16 + this.rand() * 4);
    }, sec);
  }

  _schedulePluck(sec) {
    this._later(() => {
      this._pluck();
      this._schedulePluck(3.2 + this.rand() * 5);
    }, sec);
  }

  // FM elektrikli piyano benzeri, çok yumuşak
  _pluck() {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const f = SCALE[Math.floor(this.rand() * SCALE.length)] * (this.rand() < 0.25 ? 0.5 : 1);
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 2;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.6, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    car.connect(g);
    g.connect(this.dry);
    g.connect(this.rev);
    car.start(t);
    mod.start(t);
    car.stop(t + 2.6);
    mod.stop(t + 2.6);
  }
}
