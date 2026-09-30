// Ses sentezi — varlık indirmeden, WebAudio ile. Her tarif (ctx, out, t, {p, v}) → süre(sn).
// p: perde çarpanı (hafif rastgele), v: ses şiddeti çarpanı. Tarifler hem gerçek zamanlı hem
// OfflineAudioContext ile çalışır (testte tepe/RMS ölçümü için).
//
// Ses karakteri: taşlar seramik-kemik; masa keçe + ahşap. Kısa, kuru, sıcak; "arcade bip" yok.

const noiseBuffers = new WeakMap();

function noiseBuf(ctx) {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    const len = Math.floor(ctx.sampleRate * 1.2);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 0x1234567;
    for (let i = 0; i < len; i++) {
      // xorshift — deterministik gürültü
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      d[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
    noiseBuffers.set(ctx, b);
  }
  return b;
}

const EPS = 0.0001;

function envelope(g, t, a, d, peak) {
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, EPS * 2), t + a);
  g.gain.exponentialRampToValueAtTime(EPS, t + a + d);
}

function noiseBurst(ctx, out, t, o) {
  const { f = 2200, f2 = 0, q = 1.2, a = 0.001, d = 0.02, gain = 0.3, type = 'bandpass', off = Math.random() * 0.8 } = o;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  flt.Q.value = q;
  const g = ctx.createGain();
  envelope(g, t, a, d, gain);
  src.connect(flt);
  flt.connect(g);
  g.connect(out);
  src.start(t, off);
  src.stop(t + a + d + 0.04);
}

function tone(ctx, out, t, o) {
  const { f = 300, f2 = 0, type = 'sine', a = 0.002, d = 0.05, gain = 0.2, detune = 0 } = o;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  if (detune) osc.detune.value = detune;
  const g = ctx.createGain();
  envelope(g, t, a, d, gain);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + a + d + 0.04);
}

// Çan/zil: ana ton + uyumsuz üst tonlar, üst tonlar hızlı söner
function bell(ctx, out, t, { f = 880, d = 0.9, gain = 0.12, p = 1 }) {
  const parts = [
    [1, 1, 1],
    [2.76, 0.42, 0.55],
    [5.4, 0.18, 0.3],
  ];
  for (const [r, ga, dm] of parts) tone(ctx, out, t, { f: f * r * p, a: 0.002, d: d * dm, gain: gain * ga });
}

// Yumuşak "tok" gövdesi: alçak sinüs, hızlı perde düşüşü
function thud(ctx, out, t, { f = 130, f2 = 62, d = 0.11, gain = 0.3 }) {
  tone(ctx, out, t, { f, f2, a: 0.002, d, gain });
  noiseBurst(ctx, out, t, { f: 240, q: 0.7, a: 0.001, d: d * 0.6, gain: gain * 0.4, type: 'lowpass' });
}

function clack(ctx, out, t, { p = 1, gain = 0.4, tone: body = 210, bright = 2400, d = 0.018 }) {
  noiseBurst(ctx, out, t, { f: bright * p, q: 1.4, a: 0.0008, d, gain });
  tone(ctx, out, t, { f: body * p, f2: body * p * 0.72, a: 0.001, d: d * 2.6, gain: gain * 0.55 });
  noiseBurst(ctx, out, t, { f: 6500 * p, q: 2, a: 0.0006, d: 0.006, gain: gain * 0.25, type: 'highpass' });
}

export const RECIPES = {
  // Taş çekme: hafif sürtünme + kuru tık
  draw: (ctx, out, t, { p, v }) => {
    noiseBurst(ctx, out, t, { f: 1100 * p, f2: 2600 * p, q: 0.9, a: 0.004, d: 0.07, gain: 0.11 * v });
    clack(ctx, out, t + 0.055, { p, gain: 0.3 * v, bright: 2600, tone: 240 });
    return 0.18;
  },
  // Istakaya yerleşme
  place: (ctx, out, t, { p, v }) => {
    clack(ctx, out, t, { p, gain: 0.26 * v, bright: 2900, tone: 320, d: 0.012 });
    return 0.08;
  },
  // Taşların birbirine hafif teması (sürükleme/sıralama dalgası)
  touch: (ctx, out, t, { p, v }) => {
    noiseBurst(ctx, out, t, { f: 3600 * p, q: 3.5, a: 0.0005, d: 0.006, gain: 0.1 * v });
    return 0.03;
  },
  select: (ctx, out, t, { p, v }) => {
    tone(ctx, out, t, { f: 540 * p, f2: 620 * p, a: 0.004, d: 0.05, gain: 0.05 * v });
    noiseBurst(ctx, out, t, { f: 3200, q: 3, a: 0.0006, d: 0.008, gain: 0.07 * v });
    return 0.08;
  },
  // Taş atma: güçlü tık + masaya düşüş + mikro zıplama
  discard: (ctx, out, t, { p, v }) => {
    clack(ctx, out, t, { p, gain: 0.5 * v, bright: 2000, tone: 175, d: 0.022 });
    thud(ctx, out, t + 0.004, { f: 118 * p, f2: 64, d: 0.1, gain: 0.3 * v });
    clack(ctx, out, t + 0.075, { p: p * 1.06, gain: 0.16 * v, bright: 2500, tone: 260, d: 0.012 });
    return 0.25;
  },
  table: (ctx, out, t, { p, v }) => {
    thud(ctx, out, t, { f: 96 * p, f2: 55, d: 0.12, gain: 0.26 * v });
    return 0.2;
  },
  // Sıra değişimi: çok hafif
  turn: (ctx, out, t, { p, v }) => {
    tone(ctx, out, t, { f: 392 * p, a: 0.02, d: 0.16, gain: 0.03 * v });
    return 0.25;
  },
  myTurn: (ctx, out, t, { p, v }) => {
    tone(ctx, out, t, { f: 523.25 * p, a: 0.012, d: 0.14, gain: 0.05 * v });
    tone(ctx, out, t + 0.1, { f: 659.25 * p, a: 0.012, d: 0.22, gain: 0.05 * v });
    return 0.4;
  },
  // 101 açma: çan + üç tık + alçak "mühür"
  open: (ctx, out, t, { p, v }) => {
    thud(ctx, out, t, { f: 110 * p, f2: 60, d: 0.14, gain: 0.26 * v });
    for (let i = 0; i < 3; i++) clack(ctx, out, t + 0.03 + i * 0.07, { p: p * (1 + i * 0.07), gain: 0.3 * v, bright: 2300 + i * 200, tone: 230 });
    bell(ctx, out, t + 0.12, { f: 880 * p, d: 0.9, gain: 0.1 * v });
    return 1.0;
  },
  // Per/taş işleme
  meld: (ctx, out, t, { p, v }) => {
    clack(ctx, out, t, { p, gain: 0.32 * v, bright: 2500, tone: 250 });
    clack(ctx, out, t + 0.06, { p: p * 1.09, gain: 0.26 * v, bright: 2800, tone: 290, d: 0.014 });
    return 0.16;
  },
  // Geçersiz: sert zil değil, mat çift vuruş
  invalid: (ctx, out, t, { p, v }) => {
    thud(ctx, out, t, { f: 150 * p, f2: 98, d: 0.07, gain: 0.22 * v });
    thud(ctx, out, t + 0.095, { f: 128 * p, f2: 84, d: 0.09, gain: 0.2 * v });
    return 0.22;
  },
  // Okey belirlendi: parıltı
  okey: (ctx, out, t, { p, v }) => {
    bell(ctx, out, t, { f: 1318.5 * p, d: 1.1, gain: 0.1 * v });
    bell(ctx, out, t + 0.09, { f: 1760 * p, d: 0.8, gain: 0.06 * v });
    noiseBurst(ctx, out, t + 0.02, { f: 7000, q: 1.2, a: 0.002, d: 0.22, gain: 0.03 * v, type: 'highpass' });
    return 1.3;
  },
  // Bitiş: taş şelalesi + çözülen akor
  finish: (ctx, out, t, { p, v }) => {
    for (let i = 0; i < 6; i++) clack(ctx, out, t + i * 0.055, { p: p * (0.92 + i * 0.045), gain: (0.3 + i * 0.03) * v, bright: 2200 + i * 160, tone: 200 + i * 14, d: 0.014 });
    thud(ctx, out, t + 0.33, { f: 100 * p, f2: 55, d: 0.16, gain: 0.3 * v });
    for (const f of [261.63, 329.63, 392, 523.25]) tone(ctx, out, t + 0.34, { f: f * p, type: 'triangle', a: 0.04, d: 1.0, gain: 0.05 * v });
    return 1.5;
  },
  win: (ctx, out, t, { p, v }) => {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => bell(ctx, out, t + i * 0.11, { f: f * p, d: 1.2, gain: 0.085 * v }));
    for (const f of [261.63, 392, 523.25]) tone(ctx, out, t + 0.05, { f: f * p, type: 'triangle', a: 0.12, d: 1.6, gain: 0.04 * v });
    noiseBurst(ctx, out, t + 0.3, { f: 6500, q: 1, a: 0.01, d: 0.7, gain: 0.025 * v, type: 'highpass' });
    return 2.0;
  },
  lose: (ctx, out, t, { p, v }) => {
    tone(ctx, out, t, { f: 329.63 * p, f2: 311 * p, type: 'triangle', a: 0.03, d: 0.5, gain: 0.07 * v });
    tone(ctx, out, t + 0.22, { f: 261.63 * p, f2: 246 * p, type: 'triangle', a: 0.03, d: 0.8, gain: 0.07 * v });
    return 1.2;
  },
  // Skor sayımı: artan perde ile kısa tıklar
  score: (ctx, out, t, { p, v, step = 0 }) => {
    tone(ctx, out, t, { f: (620 + Math.min(step, 24) * 18) * p, a: 0.001, d: 0.035, gain: 0.045 * v });
    noiseBurst(ctx, out, t, { f: 4200, q: 2.5, a: 0.0004, d: 0.005, gain: 0.04 * v });
    return 0.06;
  },
  tap: (ctx, out, t, { p, v }) => {
    tone(ctx, out, t, { f: 1250 * p, f2: 1000 * p, a: 0.001, d: 0.018, gain: 0.05 * v });
    noiseBurst(ctx, out, t, { f: 3800, q: 3, a: 0.0004, d: 0.006, gain: 0.05 * v });
    return 0.05;
  },
  modal: (ctx, out, t, { p, v }) => {
    noiseBurst(ctx, out, t, { f: 380 * p, f2: 1500 * p, q: 0.8, a: 0.03, d: 0.16, gain: 0.07 * v });
    tone(ctx, out, t + 0.03, { f: 196 * p, a: 0.03, d: 0.22, gain: 0.03 * v });
    return 0.3;
  },
  // Karıştırma: kısa hışırtılar dizisi
  shuffle: (ctx, out, t, { p, v }) => {
    for (let i = 0; i < 11; i++) {
      const tt = t + i * 0.07 + Math.random() * 0.03;
      noiseBurst(ctx, out, tt, { f: (1200 + Math.random() * 2200) * p, q: 0.9, a: 0.004, d: 0.05 + Math.random() * 0.04, gain: (0.06 + Math.random() * 0.05) * v });
      if (i % 3 === 1) clack(ctx, out, tt + 0.03, { p: p * (0.9 + Math.random() * 0.2), gain: 0.12 * v, bright: 2400, tone: 230 });
    }
    return 1.0;
  },
  deal: (ctx, out, t, { p, v }) => {
    clack(ctx, out, t, { p, gain: 0.17 * v, bright: 2900, tone: 330, d: 0.01 });
    return 0.05;
  },
  penalty: (ctx, out, t, { p, v }) => {
    thud(ctx, out, t, { f: 120 * p, f2: 70, d: 0.13, gain: 0.26 * v });
    tone(ctx, out, t + 0.02, { f: 233 * p, type: 'triangle', a: 0.01, d: 0.28, gain: 0.05 * v });
    tone(ctx, out, t + 0.02, { f: 220 * p, type: 'triangle', a: 0.01, d: 0.28, gain: 0.05 * v });
    return 0.4;
  },
  levelup: (ctx, out, t, { p, v }) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(ctx, out, t + i * 0.09, { f: f * p, d: 0.9, gain: 0.08 * v }));
    return 1.4;
  },
};

// Tarif başına kural: [minAralık sn, perde oynaklığı, şiddet oynaklığı, kategori]
export const RULES = {
  draw: [0.05, 0.05, 0.1, 'tile'],
  place: [0.03, 0.06, 0.12, 'tile'],
  touch: [0.035, 0.1, 0.25, 'tick'],
  select: [0.04, 0.03, 0.1, 'ui'],
  discard: [0.08, 0.04, 0.08, 'tile'],
  table: [0.1, 0.04, 0.1, 'tile'],
  turn: [0.4, 0.02, 0.05, 'ui'],
  myTurn: [0.4, 0, 0, 'ui'],
  open: [0.3, 0.02, 0.05, 'event'],
  meld: [0.05, 0.05, 0.1, 'tile'],
  invalid: [0.15, 0.02, 0.05, 'ui'],
  okey: [0.5, 0, 0, 'event'],
  finish: [0.8, 0.02, 0, 'event'],
  win: [1, 0, 0, 'event'],
  lose: [1, 0, 0, 'event'],
  score: [0.03, 0, 0, 'tick'],
  tap: [0.05, 0.03, 0.1, 'ui'],
  modal: [0.2, 0.03, 0.05, 'ui'],
  shuffle: [1, 0, 0, 'event'],
  deal: [0.028, 0.08, 0.15, 'tick'],
  penalty: [0.4, 0, 0, 'event'],
  levelup: [1, 0, 0, 'event'],
};
