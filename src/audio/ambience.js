// Kahvehane ambiyansı (tamamen sentez, dosya yok): uzaktan sohbet uğultusu (bant geçiren gürültü sesleri, yavaş
// rastgele zarflar, stereo dağılım), oda gürlemesi, ara sıra çay bardağı/kaşık şıngırtısı ve başka masalardan taş tıkırtısı.
// Çok kısık tutulur; müzik ve efektlerin altında "mekânda olma" hissi verir.
export class Ambience {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.playing = false;
    this.timers = [];
  }

  _noise(seconds = 4) {
    const ctx = this.ctx;
    const n = Math.round(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // pembe gürültü (Voss benzeri yaklaşım)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * 0.5362) * 0.11;
    }
    return buf;
  }

  start(vol = 0.85) {
    if (this.playing) return;
    const ctx = this.ctx;
    this.playing = true;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(0.16 * vol, ctx.currentTime, 1.2);
    this.bus.connect(this.out);
    const buf = this._noise();
    this.nodes = [];
    // sohbet sesleri: farklı bantlarda, kendi zarfıyla yükselip alçalan uğultular
    for (let v = 0; v < 4; v++) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 0.85 + Math.random() * 0.3;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 320 + v * 170 + Math.random() * 80;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.value = 0.3;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = (v / 3) * 1.4 - 0.7;
      src.connect(bp).connect(g);
      if (pan) g.connect(pan).connect(this.bus);
      else g.connect(this.bus);
      src.start(ctx.currentTime + Math.random());
      this.nodes.push(src);
      const wobble = () => {
        if (!this.playing) return;
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0.12 + Math.random() * 0.55, t, 0.25 + Math.random() * 0.5);
        bp.frequency.setTargetAtTime(280 + v * 170 + Math.random() * 160, t, 0.6);
        this.timers.push(setTimeout(wobble, 380 + Math.random() * 900));
      };
      wobble();
    }
    // oda gürlemesi
    const rs = ctx.createBufferSource();
    rs.buffer = buf;
    rs.loop = true;
    rs.playbackRate.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160;
    const rg = ctx.createGain();
    rg.gain.value = 0.55;
    rs.connect(lp).connect(rg).connect(this.bus);
    rs.start();
    this.nodes.push(rs);
    this._schedule('clink', 5000, 11000);
    this._schedule('tiles', 3500, 8000);
  }

  _schedule(kind, a, b) {
    const go = () => {
      if (!this.playing) return;
      if (kind === 'clink') this._clink();
      else this._tiles();
      this.timers.push(setTimeout(go, a + Math.random() * (b - a)));
    };
    this.timers.push(setTimeout(go, a * 0.5 + Math.random() * a));
  }

  _panGain(level) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = level;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.6 - 0.8;
      g.connect(p).connect(this.bus);
    } else g.connect(this.bus);
    return g;
  }

  // ince belli çay bardağı: üç kısmi ton, hızlı sönüm; bazen iki vuruş (kaşık)
  _clink() {
    const ctx = this.ctx;
    const hits = Math.random() < 0.45 ? 2 : 1;
    for (let h = 0; h < hits; h++) {
      const t = ctx.currentTime + h * (0.09 + Math.random() * 0.05);
      const out = this._panGain(0.22 + Math.random() * 0.12);
      const base = 2400 + Math.random() * 700;
      [1, 1.52, 2.27].forEach((m, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = base * m;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5 / (i + 1), t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45 + Math.random() * 0.35);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.9);
      });
    }
  }

  // uzak masada taş tıkırtısı: kısa gürültü vuruşları
  _tiles() {
    const ctx = this.ctx;
    const n = 1 + Math.floor(Math.random() * 3);
    const out = this._panGain(0.32);
    for (let k = 0; k < n; k++) {
      const t = ctx.currentTime + k * (0.07 + Math.random() * 0.12);
      const len = Math.round(ctx.sampleRate * 0.04);
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
      const s = ctx.createBufferSource();
      s.buffer = b;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500 + Math.random() * 900;
      bp.Q.value = 2.2;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600; // uzaklık hissi
      s.connect(bp).connect(lp).connect(out);
      s.start(t);
    }
  }

  stop(fade = 0.8) {
    if (!this.playing) return;
    this.playing = false;
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    const ctx = this.ctx;
    const bus = this.bus;
    bus.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
    const nodes = this.nodes;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
        } catch {}
      }
      bus.disconnect();
    }, fade * 1000 + 200);
  }
}
