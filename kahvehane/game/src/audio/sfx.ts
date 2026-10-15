/**
 * Kahvehane Pişti — prosedürel ses efektleri.
 *
 * Harici ses dosyası yok: her şey Web Audio ile üretilir (gürültü tamponları, biquad süzgeçler,
 * zarflar, osilatörler, küçük bir evrişim yankısı, ana çıkışta sıkıştırıcı + yumuşak kırpıcı).
 *
 * Kullanım:
 *   const sfx = new Sfx();
 *   window.addEventListener('pointerdown', () => void sfx.unlock(), {once: true}); // ilk jest
 *   sfx.cardLand(0.8); sfx.pisti(false); sfx.startAmbience(); ...
 * unlock() öncesi (ya da sessizde / sayfa gizliyken) bütün çağrılar sessizce hiçbir şey yapmaz;
 * ses seviyesi, sessiz ve ağır çekim ayarları saklanır, unlock'ta uygulanır. startAmbience() unlock
 * öncesi çağrılırsa ortam sesi unlock'ta başlar.
 *
 * Performans kuralları:
 *  - Paylaşılan kaynaklar (gürültü tamponları, yankı dürtü yanıtı) bir kez üretilir.
 *  - Her ses kısa ömürlü bir "voice"tur: bitince (onended) bütün düğümleri koparılır.
 *  - Eşzamanlı voice sayısı sınırlıdır (en eski düşürülür). Zamanlayıcı döngüsü yok;
 *    ortam sesi yalnızca seyrek bir setTimeout zinciriyle ileriye doğru planlanır.
 *  - Ortam yatağı osilatör-LFO yerine ileriye planlanmış yavaş rastgele eğrilerle (setValueCurveAtTime) oynar.
 *
 * Seviyeler (çevrimdışı ölçüm, dev/audio.html?auto=1): kart sesleri ≈ -12..-14 dBFS tepe, pişti ≈ -4,
 * kazanma/kaybetme ≈ -8, ortam olayları ≈ -30 (yatak RMS ≈ -43). Ana çıkış tavanı ≈ -1.1 dBFS.
 */

// ───────────────────────── yardımcılar ─────────────────────────

type NoiseKind = 'white' | 'pink' | 'brown';

const MAX_VOICES = 24; // eşzamanlı efekt voice sınırı
const MAX_AMB_VOICES = 8; // eşzamanlı ortam olayı sınırı
const START_LAG = 0.004; // planlama payı (sn)
/**
 * Chrome/WebKit DynamicsCompressor'ı bağlam başladıktan sonraki ilk ~100 ms içinde çıkışı yumuşakça açar
 * (ilk vuruşlar 10+ dB kısık kalır). Bu yüzden hiçbir ses bağlam saatinin bu eşiğinden önce başlamaz;
 * yalnızca unlock sonrası ilk ses ~120 ms gecikir.
 */
const WARM_T = 0.12;
const AMB_LOOKAHEAD = 1.0; // ortam olaylarını bu kadar önceden planla (sn)

const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
const clamp01 = (x: number): number => (Number.isFinite(x) ? clamp(x, 0, 1) : 0);

/** Biquad parametrelerini k-rate yap: katsayılar örnek başına değil 128'lik blok başına hesaplanır (ciddi CPU tasarrufu). */
function kRate(p: AudioParam): void {
  try {
    p.automationRate = 'k-rate';
  } catch {
    /* eski WebKit: desteklenmiyor, a-rate kalır */
  }
}

/** Ucuz tohumlanabilir PRNG (mulberry32). */
class Rng {
  private a: number;
  constructor(seed: number) {
    this.a = seed >>> 0;
  }
  next(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
  /** c değerini ±frac oranında oynat. */
  jit(c: number, frac: number): number {
    return c * (1 + (this.next() * 2 - 1) * frac);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}

/** Ses seviyesi kırpmaları: çevrimdışı ölçümle ayarlandı (kart ~-12, pişti ~-4, ortam ~-30 dBFS). */
const L = {
  slide: 0.7279,
  throw: 0.3872,
  land: 0.2092,
  flip: 0.6964,
  deal: 0.2764,
  shuffle: 0.8052,
  capture: 0.3188,
  pisti: 0.3163,
  coin: 0.1867,
  tap: 0.1343,
  win: 0.29,
  lose: 0.6932,
  bed: 0.03235,
  glass: 0.01868,
  stir: 0.03746,
  dice: 0.06504,
  creak: 0.09659,
};

// ───────────────────── paylaşılan kaynak üreticiler ─────────────────────

/** Döngüye alınabilir gürültü tamponu (uçlar eşit güçle çapraz geçişli), RMS ≈ 0.25. */
function makeNoise(ctx: BaseAudioContext, kind: NoiseKind, seconds: number, rng: Rng): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const xf = Math.floor(sr * 0.03);
  const x = new Float32Array(len + xf);
  if (kind === 'white') {
    for (let i = 0; i < x.length; i++) x[i] = rng.next() + rng.next() - 1; // üçgen dağılım: yumuşak tepe
  } else if (kind === 'pink') {
    // Paul Kellet süzgeci
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < x.length; i++) {
      const w = rng.next() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < x.length; i++) {
      last = (last + 0.02 * (rng.next() * 2 - 1)) / 1.02;
      x[i] = last * 3.5;
    }
  }
  let e = 0;
  for (let i = 0; i < len; i++) e += x[i] * x[i];
  const g = 0.25 / Math.sqrt(e / len + 1e-12);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = x[i] * g;
  for (let i = 0; i < xf; i++) {
    const a = ((i + 0.5) / xf) * Math.PI * 0.5;
    d[i] = x[i] * g * Math.sin(a) + x[len + i] * g * Math.cos(a);
  }
  return buf;
}

/** Küçük, ılık bir oda için sentetik dürtü yanıtı (~0.6 sn, karanlıklaşan kuyruk, erken yansımalar). */
function makeImpulse(ctx: BaseAudioContext, rng: Rng): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.75);
  const buf = ctx.createBuffer(2, len, sr);
  const tau = 0.6 / 6.9078; // RT60 ≈ 0.6 sn
  const taps = [0.0053, 0.0081, 0.0117, 0.0164, 0.0228, 0.0311, 0.0419];
  const tapG = [0.9, 0.7, 0.6, 0.5, 0.38, 0.3, 0.22];
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const onset = clamp((t - 0.006) / 0.016, 0, 1);
      const a = 0.3 + 0.62 * Math.min(1, t / 0.45); // tek kutuplu alçak geçiren: zamanla kararır
      lp = a * lp + (1 - a) * (rng.next() * 2 - 1);
      d[i] = lp * Math.exp(-t / tau) * onset * 1.2;
    }
    for (let k = 0; k < taps.length; k++) {
      const c = Math.floor((taps[k] * (1 + (ch ? 0.09 : -0.07)) + rng.range(0, 0.0005)) * sr);
      const g = tapG[k] * (rng.next() < 0.5 ? -1 : 1);
      for (let j = -2; j <= 2; j++) d[c + j] += g * 0.5 * (1 + Math.cos((j / 3) * Math.PI)) * 0.8;
    }
    // alt frekans gümbürtüsünü ayıkla (tek kutuplu yüksek geçiren ≈ 200 Hz)
    const ha = Math.exp((-2 * Math.PI * 200) / sr);
    let px = 0;
    let py = 0;
    for (let i = 0; i < len; i++) {
      const x = d[i];
      py = ha * (py + x - px);
      px = x;
      d[i] = py;
    }
    let e = 0;
    for (let i = 0; i < len; i++) e += d[i] * d[i];
    const n = 1 / Math.sqrt(e + 1e-12);
    for (let i = 0; i < len; i++) d[i] *= n;
  }
  return buf;
}

/** Ana çıkış için yumuşak kırpıcı eğrisi: 0.7'ye kadar doğrusal, tavan ≈ 0.88 (-1.1 dBFS). */
function makeSoftClip(): Float32Array {
  const n = 2049;
  const c = new Float32Array(n);
  const knee = 0.7;
  const room = 0.18;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax <= knee ? ax : knee + room * Math.tanh((ax - knee) / room);
    c[i] = x < 0 ? -y : y;
  }
  return c;
}

// ───────────────────────── voice altyapısı ─────────────────────────

interface Voice {
  out: GainNode;
  nodes: AudioNode[];
  srcs: AudioScheduledSourceNode[];
  pending: number;
  endT: number;
  pool: Voice[];
  done: boolean;
}

interface Host {
  readonly ctx: BaseAudioContext;
  readonly rng: Rng;
  readonly noise: Record<NoiseKind, AudioBuffer>;
  readonly reverbIn: AudioNode;
  track(v: Voice, n: AudioNode): void;
  addSrc(v: Voice, s: AudioScheduledSourceNode): void;
}

interface FilterSpec {
  type: BiquadFilterType;
  f: number;
  q?: number;
  /** verilirse süzgeç f'den f2'ye üstel kayar (≈ 3 zaman sabiti boyunca). */
  f2?: number;
}

interface ClickEv {
  dt: number;
  amp: number;
  tau: number;
  /** tık başına band merkezi (varyasyon). */
  f?: number;
}

interface ToneOpts {
  f2?: number;
  bendTau?: number;
  dest?: AudioNode;
}

interface ChordOpts {
  amp: number;
  atk: number;
  hold: number;
  rel: number;
  sustain: number;
  /** [dalga biçimi, oktav çarpanı, detune (cent), seviye] */
  layers: ReadonlyArray<readonly [OscillatorType, number, number, number]>;
  /** [başlangıç, tepe, tepeye süre, sönüm sabiti, sönüm hedefi] (Hz / sn) */
  cutoff: readonly [number, number, number, number, number];
  q: number;
  scoop?: number;
  vibHz?: number;
  vibCents?: number;
  vibDelay?: number;
  /** son perdeye doğru kayma oranı (örn. 0.94 → aşağı kayar), nota sonunda erişilir */
  glide?: number;
}

/**
 * Tek bir sesi kuran yardımcı. Tüm zaman/frekans argümanları "tasarım birimi"dir;
 * ağır çekimde zaman `s` ile uzatılır, frekans `p` ile alçaltılır.
 */
class VB {
  /** Bileşenlerin varsayılan çıkışı (ortamda süzgeçli "uzaklık" düğümü olabilir). */
  dest: AudioNode;
  constructor(
    private readonly h: Host,
    private readonly v: Voice,
    readonly t0: number,
    readonly p: number,
    readonly s: number,
    readonly pan: AudioParam | null,
  ) {
    this.dest = v.out;
  }

  get out(): GainNode {
    return this.v.out;
  }
  get rng(): Rng {
    return this.h.rng;
  }
  /** Tasarım zamanı → mutlak ses zamanı. */
  T(dt: number): number {
    return this.t0 + dt * this.s;
  }
  /** Tasarım frekansı → gerçek frekans (Nyquist'e göre sınırlı). */
  F(f: number): number {
    return clamp(f * this.p, 10, this.h.ctx.sampleRate * 0.45);
  }
  private end(t: number): void {
    if (t > this.v.endT) this.v.endT = t;
  }

  node<N extends AudioNode>(n: N): N {
    this.h.track(this.v, n);
    return n;
  }
  gain(g = 1): GainNode {
    const n = this.node(this.h.ctx.createGain());
    n.gain.value = g;
    return n;
  }
  filt(type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
    const n = this.node(this.h.ctx.createBiquadFilter());
    n.type = type;
    n.frequency.value = this.F(f);
    n.Q.value = q;
    kRate(n.frequency);
    kRate(n.Q);
    return n;
  }
  /** Gürültü kaynağı: tamponun rastgele bir yerinden dur süre kadar çalar. */
  noiseSrc(kind: NoiseKind, dt: number, dur: number): AudioBufferSourceNode {
    const n = this.node(this.h.ctx.createBufferSource());
    const buf = this.h.noise[kind];
    n.buffer = buf;
    const rd = Math.min(dur * this.s, buf.duration - 0.05);
    const off = this.h.rng.next() * Math.max(0, buf.duration - rd - 0.03);
    const t = this.T(dt);
    n.start(t, off, rd);
    this.h.addSrc(this.v, n);
    this.end(t + rd);
    return n;
  }
  osc(type: OscillatorType, f: number, dt: number, dur: number): OscillatorNode {
    const o = this.node(this.h.ctx.createOscillator());
    o.type = type;
    o.frequency.value = this.F(f);
    const t = this.T(dt);
    const e = t + dur * this.s;
    o.start(t);
    o.stop(e);
    this.h.addSrc(this.v, o);
    this.end(e);
    return o;
  }
  /** Parça parça doğrusal zarf (tasarım zamanı/değer çiftleri). */
  shape(p: AudioParam, pts: ReadonlyArray<readonly [number, number]>): void {
    p.setValueAtTime(pts[0][1], this.T(pts[0][0]));
    for (let i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], this.T(pts[i][0]));
  }
  /** Süzgeç frekansını f1'den f2'ye üstel kaydır. */
  sweep(p: AudioParam, f1: number, f2: number, dt: number, dur: number): void {
    p.setValueAtTime(this.F(f1), this.T(dt));
    p.exponentialRampToValueAtTime(this.F(f2), this.T(dt + dur));
  }
  /** Vuruş zarfı: kısa atak + üstel sönüm. Girişi zarf düğümünden geçirip dest'e bağlar. */
  hit(into: AudioNode, dt: number, atk: number, tau: number, amp: number, dest?: AudioNode): GainNode {
    const g = this.gain(0);
    const t = this.T(dt);
    const a = atk * this.s;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + a);
    g.gain.setTargetAtTime(0, t + a, tau * this.s);
    into.connect(g);
    g.connect(dest ?? this.dest);
    return g;
  }
  /** Süzgeçli gürültü patlaması (kendi kaynağıyla). */
  burst(kind: NoiseKind, dt: number, tau: number, amp: number, filters: FilterSpec[], atk = 0.0005, dest?: AudioNode): GainNode {
    const n = this.noiseSrc(kind, dt, atk + tau * 9);
    let last: AudioNode = n;
    for (const fs of filters) {
      const f = this.filt(fs.type, fs.f, fs.q ?? 0.7);
      if (fs.f2 !== undefined) this.sweep(f.frequency, fs.f, fs.f2, dt, tau * 3);
      last.connect(f);
      last = f;
    }
    return this.hit(last, dt, atk, tau, amp, dest);
  }
  /** Üstel sönümlü sinüs/üçgen vuruşu; isteğe bağlı perde kayması (f → f2). */
  tone(type: OscillatorType, f: number, dt: number, atk: number, tau: number, amp: number, o: ToneOpts = {}): OscillatorNode {
    const osc = this.osc(type, f, dt, atk + tau * 9);
    if (o.f2 !== undefined) osc.frequency.setTargetAtTime(this.F(o.f2), this.T(dt), (o.bendTau ?? 0.03) * this.s);
    this.hit(osc, dt, atk, tau, amp, o.dest);
    return osc;
  }
  /** Rastgele aralıklı tıklar: tek gürültü kaynağı + zarf otomasyonu (kâğıt çıtırtıları, zar sesi). */
  clickTrain(
    evs: ClickEv[],
    branches: ReadonlyArray<{filters: FilterSpec[]; level: number; vary?: boolean}>,
    dest?: AudioNode,
  ): void {
    const last = evs[evs.length - 1];
    const n = this.noiseSrc('white', 0, last.dt + last.tau * 10 + 0.02);
    const g = this.gain(0);
    n.connect(g);
    for (const e of evs) {
      const t = this.T(e.dt);
      g.gain.setValueAtTime(e.amp, t);
      g.gain.setTargetAtTime(0, t + 0.0003 * this.s, e.tau * this.s);
    }
    for (const br of branches) {
      let node: AudioNode = g;
      let varied: BiquadFilterNode | null = null;
      for (const fs of br.filters) {
        const f = this.filt(fs.type, fs.f, fs.q ?? 0.7);
        node.connect(f);
        node = f;
        if (br.vary && fs.type === 'bandpass') varied = f;
      }
      if (varied) for (const e of evs) if (e.f !== undefined) varied.frequency.setValueAtTime(this.F(e.f), this.T(e.dt));
      const lv = this.gain(br.level);
      node.connect(lv);
      lv.connect(dest ?? this.dest);
    }
  }
  /** Bir bileşeni oda yankısına gönder (voice seviyesiyle ölçeklenir). */
  wetSend(from: AudioNode, amount: number): void {
    const g = this.gain(amount * this.v.out.gain.value);
    from.connect(g);
    g.connect(this.h.reverbIn);
  }
  /**
   * Nota/akor: katmanlı osilatörler → ortak alçak geçiren (süzgeç zarfı) → genlik zarfı.
   * Pirinç darbesi, sıcak pad ve "womp" fagot sesi bununla kurulur.
   */
  chord(dt: number, notes: readonly number[], o: ChordOpts): void {
    const T = this.T(dt);
    const total = o.hold + o.rel;
    const lp = this.filt('lowpass', o.cutoff[0], o.q);
    lp.frequency.setValueAtTime(this.F(o.cutoff[0]), T);
    lp.frequency.exponentialRampToValueAtTime(this.F(o.cutoff[1]), T + o.cutoff[2] * this.s);
    lp.frequency.setTargetAtTime(this.F(o.cutoff[4]), T + o.cutoff[2] * this.s, o.cutoff[3] * this.s);
    const amp = this.gain(0);
    const A = o.atk * this.s;
    amp.gain.setValueAtTime(0, T);
    amp.gain.linearRampToValueAtTime(o.amp, T + A);
    amp.gain.setTargetAtTime(o.amp * o.sustain, T + A, 0.12 * this.s);
    amp.gain.setTargetAtTime(0, T + o.hold * this.s, (o.rel / 6) * this.s);
    lp.connect(amp);
    amp.connect(this.dest);
    let vib: GainNode | null = null;
    if (o.vibHz && o.vibCents) {
      const lfo = this.osc('sine', o.vibHz, dt, total + 0.05);
      lfo.frequency.value = o.vibHz; // vibrato hızı ağır çekimden etkilenmesin
      vib = this.gain(0);
      vib.gain.setValueAtTime(0, T);
      vib.gain.setValueAtTime(0, T + (o.vibDelay ?? 0) * this.s);
      vib.gain.linearRampToValueAtTime(o.vibCents, T + ((o.vibDelay ?? 0) + 0.25) * this.s);
      lfo.connect(vib);
    }
    for (const lay of o.layers) {
      const lg = this.gain(lay[3]);
      lg.connect(lp);
      for (const f of notes) {
        const osc = this.osc(lay[0], f * lay[1], dt, total + 0.02);
        osc.detune.value = lay[2];
        if (o.scoop) {
          osc.frequency.setValueAtTime(this.F(f * lay[1] * o.scoop), T);
          osc.frequency.linearRampToValueAtTime(this.F(f * lay[1]), T + 0.035 * this.s);
        }
        if (o.glide) {
          osc.frequency.setValueAtTime(this.F(f * lay[1]), T + 0.15 * this.s);
          osc.frequency.exponentialRampToValueAtTime(this.F(f * lay[1] * o.glide), T + o.hold * this.s);
        }
        if (vib) vib.connect(osc.detune);
        osc.connect(lg);
      }
    }
  }
}

/** Ortalamaya dönen yavaş rastgele yürüyüş (≈ ±1, σ ≈ 0.5): LFO yerine, periyodik tekrar duyulmaz. */
class Wander {
  private x = 0;
  private readonly sd: number;
  constructor(private readonly a: number) {
    this.sd = 0.577 * Math.sqrt(a / (2 - a));
  }
  next(r: Rng): number {
    this.x += (r.next() * 2 - 1 - this.x) * this.a;
    return clamp((this.x / this.sd) * 0.5, -1, 1);
  }
}

/** Mırıltı yatağı katmanları: [gürültü, döngü başı, döngü sonu, süzgeç, f(Hz), Q, seviye, f derinliği, genlik derinliği, hece payı 0..1] */
const BED: ReadonlyArray<readonly [NoiseKind, number, number, BiquadFilterType, number, number, number, number, number, number]> = [
  ['brown', 0, 2.0, 'lowpass', 180, 0.7, 0.2, 0, 0.3, 0], // oda uğultusu (az)
  ['pink', 0, 3.0, 'bandpass', 480, 0.9, 1.5, 0.22, 0.5, 0.35], // mırıltı: düşük
  ['pink', 0.37, 2.61, 'bandpass', 900, 1.1, 1.3, 0.28, 0.55, 0.4], // mırıltı: orta
  ['pink', 0.5, 2.9, 'bandpass', 1600, 1.4, 0.8, 0.22, 0.6, 0.45], // mırıltı: ünsüz bölgesi
  ['pink', 0.9, 2.2, 'bandpass', 2600, 1.5, 0.3, 0.2, 0.7, 0.4], // cam/su tıkırtısı havası
];
const BED_SEG = 8; // sn: her parça tek bir eğri olayı
const BED_PTS = 12 * BED_SEG + 1; // 12 Hz örnekleme

interface BedLayer {
  f: BiquadFilterNode;
  amp: GainNode;
  cfg: (typeof BED)[number];
  wf: Wander;
  wa: Wander;
  ws: Wander;
  lastF: number;
  lastA: number;
}

interface Bed {
  gain: GainNode;
  nodes: AudioNode[];
  srcs: AudioScheduledSourceNode[];
  layers: BedLayer[];
  until: number;
}

export interface SfxStats {
  state: string;
  voices: number;
  ambVoices: number;
  nodesAlive: number;
  dropped: number;
  errors: number;
  lastError: string;
}

export interface OfflineRender {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  stats: SfxStats;
}

type AudioCtor = typeof AudioContext;
interface AudioSessionLike {
  type: string;
}

// ───────────────────────────── Sfx ─────────────────────────────

export class Sfx {
  /** Geliştirme: true iken motor içi hatalar dışarı fırlatılır (varsayılan: yutulur). */
  static debug = false;

  private ctx: BaseAudioContext | null = null;
  private offline = false;
  private horizon = 0; // çevrimdışı: ortam planı sınırı
  private tOff = 0; // çevrimdışı sahneleme kaydırması (runAt)
  private unlocked = false;
  private resuming = false;
  private hidden = false;
  private gestureArmed = false;
  private unlockP: Promise<void> | null = null;

  private _muted = false;
  private vol = 1;
  private slow = 1;
  private pK = 1; // ağır çekimde perde çarpanı
  private sK = 1; // ağır çekimde zaman uzatma çarpanı

  private rng: Rng;
  private host: Host | null = null;
  private sfxBus!: GainNode;
  private sfxLP!: BiquadFilterNode;
  private ambBus!: GainNode;
  private outGain!: GainNode;
  private reverbIn!: GainNode;
  private pool: Voice[] = [];
  private ambPool: Voice[] = [];
  private dying: Array<{v: Voice; at: number}> = [];
  private nodesAlive = 0;
  private dropped = 0;
  private errors = 0;
  private lastErr = '';
  private hasPanner = false;

  // ortam sesi
  private ambWanted = false;
  private bed: Bed | null = null;
  private ambNext = 0;
  private ambTimer: ReturnType<typeof setTimeout> | undefined;
  private ambLast = -1;
  private ambEventsOn = true;

  constructor() {
    this.rng = new Rng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVis);
  }

  // ───────────── yaşam döngüsü ─────────────

  /** İlk kullanıcı dokunuşunda çağır: AudioContext'i oluşturur / sürdürür (iOS WKWebView + Android WebView). */
  unlock(): Promise<void> {
    if (this.offline) return Promise.resolve();
    if (this.unlockP) return this.unlockP;
    const p = (async () => {
      try {
        if (!this.ctx) this.createContext();
        const ctx = this.ctx;
        if (!ctx) return;
        this.unlocked = true;
        this.hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        this.iosSession();
        // iOS: jest içinde sessiz bir tampon çalmak sesi tamamen açar
        try {
          const b = ctx.createBuffer(1, 1, 22050);
          const s = ctx.createBufferSource();
          s.buffer = b;
          s.connect(ctx.destination);
          s.start(0);
        } catch {
          /* yoksay */
        }
        await this.resumeCtx();
        this.ambKick();
      } catch (e) {
        this.fail(e);
      }
    })();
    this.unlockP = p.finally(() => {
      this.unlockP = null;
    });
    return this.unlockP;
  }

  get muted(): boolean {
    return this._muted;
  }
  setMuted(m: boolean): void {
    this._muted = !!m;
    this.applyVolume();
    if (this._muted) this.ambStop();
    else if (this.ambWanted) this.ambKick();
  }
  setVolume(v: number): void {
    this.vol = clamp01(v);
    this.applyVolume();
  }

  /** 0.1..1 — ağır çekimde SFX yoluna alçak geçiren + hafif perde düşüşü uygular. Ortam sesi etkilenmez. */
  setSlowMo(rate: number): void {
    const r = clamp(Number.isFinite(rate) ? rate : 1, 0.1, 1);
    this.slow = r;
    this.pK = 0.8 + 0.2 * r;
    this.sK = 1 / this.pK;
    this.applySlow();
  }

  /** Dinleyicileri kaldırır, bağlamı kapatır (HMR / test için). */
  dispose(): void {
    this.ambStop();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVis);
    for (const v of [...this.pool, ...this.ambPool]) this.cleanup(v);
    const c = this.ctx;
    this.ctx = null;
    if (c && !this.offline && 'close' in c) (c as AudioContext).close().catch(() => undefined);
  }

  /** @internal Test/ölçüm için istatistik. */
  stats(): SfxStats {
    return {
      state: this.ctx ? String(this.ctx.state) : 'none',
      voices: this.pool.length,
      ambVoices: this.ambPool.length,
      nodesAlive: this.nodesAlive,
      dropped: this.dropped,
      errors: this.errors,
      lastError: this.lastErr,
    };
  }

  /** @internal Çevrimdışı (OfflineAudioContext) ölçüm için bağla. */
  attachOffline(ctx: OfflineAudioContext, seconds: number, seed: number): void {
    this.offline = true;
    this.horizon = seconds;
    this.rng = new Rng(seed);
    this.unlocked = true;
    this.build(ctx);
  }

  /** @internal Ortam olaylarını (bardak, zar, ...) aç/kapat: yalnızca mırıltı yatağını dinlemek/ölçmek için. */
  setAmbEvents(on: boolean): void {
    this.ambEventsOn = on;
  }

  /** @internal Ortam olaylarından birini hemen çal (0 bardak, 1 kaşık, 2 zar, 3 sandalye) — dinleme/ölçüm için. */
  ambOnce(kind: number): void {
    this.run(() => {
      const ctx = this.ctx;
      if (ctx && this.canPlay()) this.ambEvent(this.startT(), clamp(Math.floor(kind), 0, 3));
    });
  }

  /** @internal Çevrimdışı sahnelemede çağrıyı dt sn ileri kaydır. */
  runAt(dt: number, fn: () => void): void {
    this.tOff = dt;
    try {
      fn();
    } finally {
      this.tOff = 0;
    }
  }

  // ───────────── kart sesleri ─────────────

  /** Kartı elden alma / elden dışarı kaydırma: yumuşak kâğıt sürtünmesi. */
  cardSlide(intensity = 0.6): void {
    this.run(() => {
      const k = clamp01(intensity);
      const r = this.rng;
      const v = this.voice({wet: 0.06, pan: r.range(-0.2, 0.2), trim: L.slide * (0.35 + 0.65 * Math.pow(k, 1.3))});
      if (!v) return;
      const dur = r.jit(0.21 - 0.08 * k, 0.12);
      const n = v.noiseSrc('white', 0, dur + 0.04);
      const body = v.filt('bandpass', r.jit(800, 0.1), 0.8);
      const air = v.filt('bandpass', 1500, 0.9);
      v.sweep(air.frequency, r.jit(1500, 0.1), r.jit(2800 + 700 * k, 0.1), 0, dur);
      const bodyG = v.gain(0.5);
      const mix = v.gain(0.64); // sürtünme dokusu: AM
      for (const f of [r.range(61, 83), r.range(103, 149)]) {
        const am = v.osc('sine', f, 0, dur + 0.04);
        const ag = v.gain(0.21);
        am.connect(ag);
        ag.connect(mix.gain);
      }
      const env = v.gain(0);
      v.shape(env.gain, [[0, 0], [0.03, 1], [dur * 0.55, 0.85], [dur, 0]]);
      n.connect(body);
      n.connect(air);
      body.connect(bodyG);
      bodyG.connect(mix);
      air.connect(mix);
      mix.connect(env);
      env.connect(v.dest);
    });
  }

  /** Fırlatılan kartın havadaki "fiyt" sesi. */
  cardThrow(speed = 0.6): void {
    this.run(() => {
      const k = clamp01(speed);
      const r = this.rng;
      const v = this.voice({wet: 0.05, pan: 0, trim: L.throw * (0.4 + 0.6 * k)});
      if (!v) return;
      const dur = r.jit(0.36 - 0.17 * k, 0.08);
      if (v.pan) {
        const d = r.sign();
        v.shape(v.pan, [[0, -0.35 * d], [dur, 0.35 * d]]);
      }
      const n = v.noiseSrc('white', 0, dur + 0.04);
      const hp = v.filt('highpass', 450, 0.7);
      const a = v.filt('bandpass', 900, 1.1);
      v.sweep(a.frequency, 900, 1900 + 2400 * k, 0, dur * 0.4);
      a.frequency.exponentialRampToValueAtTime(v.F(1500), v.T(dur));
      const b = v.filt('bandpass', 3000, 0.8);
      v.sweep(b.frequency, 2600, 5400, 0, dur * 0.45);
      b.frequency.exponentialRampToValueAtTime(v.F(3600), v.T(dur));
      const bg = v.gain(0.45);
      const mix = v.gain(0.8);
      const am = v.osc('sine', r.range(34, 58), 0, dur + 0.04); // kartın titreşimi
      const ag = v.gain(0.2);
      am.connect(ag);
      ag.connect(mix.gain);
      const env = v.gain(0);
      v.shape(env.gain, [[0, 0], [dur * 0.3, 0.9], [dur * 0.45, 1], [dur, 0]]);
      n.connect(hp);
      hp.connect(a);
      hp.connect(b);
      b.connect(bg);
      bg.connect(mix);
      a.connect(mix);
      mix.connect(env);
      env.connect(v.dest);
    });
  }

  /** Kartın yeşil çuhaya düşmesi: yumuşak "tup" + kâğıt tıkırtısı. impact 1 = sert vuruş. */
  cardLand(impact = 0.6): void {
    this.run(() => {
      const k = clamp01(impact);
      const r = this.rng;
      const v = this.voice({wet: 0.12 + 0.1 * k, pan: r.range(-0.25, 0.25), trim: L.land});
      if (!v) return;
      this.landParts(v, 0, k, 1);
    });
  }

  /** Kartın dönmesi: hızlı kâğıt fiskesi. */
  cardFlip(): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.07, pan: r.range(-0.2, 0.2), trim: L.flip});
      if (!v) return;
      const n = v.noiseSrc('white', 0, 0.2);
      // fiske: yükselen parlak üfleme
      const bp = v.filt('bandpass', 2400, 1.0);
      v.sweep(bp.frequency, r.jit(2400, 0.1), r.jit(5600, 0.1), 0, 0.07);
      n.connect(bp);
      v.hit(bp, 0, 0.004, 0.026, 1.1);
      // iki küçük "tık": kartın bükülüp bırakılması
      const g2 = r.range(0.026, 0.036);
      v.burst('white', 0, 0.0025, 1.1, [{type: 'bandpass', f: r.jit(5200, 0.1), q: 1.6}]);
      v.burst('white', g2, 0.002, 0.8, [{type: 'bandpass', f: r.jit(6400, 0.1), q: 1.6}]);
      // kâğıt gövdesi
      v.burst('pink', 0, 0.04, 0.5, [{type: 'bandpass', f: 900, q: 0.9}], 0.004);
    });
  }

  /** Tek kart dağıtımı: kısa fiske + iniş. Her ~80 ms'de çağrılabilir. */
  deal(): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.09, pan: r.range(-0.5, 0.5), trim: L.deal});
      if (!v) return;
      const n = v.noiseSrc('white', 0, 0.12);
      const bp = v.filt('bandpass', 1600, 1.0);
      v.sweep(bp.frequency, r.jit(1600, 0.12), r.jit(4200, 0.12), 0, 0.07);
      n.connect(bp);
      v.hit(bp, 0, 0.006, 0.02, 3.4);
      this.landParts(v, r.range(0.05, 0.065), r.range(0.3, 0.5), 0.9);
    });
  }

  /** ~1.3 sn karıştırma: hızlanan kâğıt tıkırtıları + köprü "brrt" + oturma. */
  shuffle(): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.1, pan: r.range(-0.1, 0.1), trim: L.shuffle});
      if (!v) return;
      const evs: ClickEv[] = [];
      let t = 0.02;
      while (t < 1.12) {
        let rate: number;
        let amp: number;
        let tau: number;
        if (t < 0.78) {
          const u = t / 0.78;
          rate = 12 * Math.pow(4.6, u); // 12 → 55 tık/sn
          amp = r.range(0.45, 1) * (0.5 + 0.5 * u);
          tau = r.range(0.0009, 0.0024);
        } else {
          const u = (t - 0.78) / 0.34;
          rate = 105 + 35 * u; // köprü: yoğun "brrt"
          amp = r.range(0.45, 0.9) * (1 - 0.55 * u);
          tau = r.range(0.0008, 0.0014);
        }
        evs.push({dt: t, amp, tau, f: r.range(2300, 5800)});
        t += (1 / rate) * r.range(0.55, 1.45);
      }
      v.clickTrain(
        evs,
        [
          {filters: [{type: 'highpass', f: 1500}, {type: 'bandpass', f: 3800, q: 0.9}], level: 0.9, vary: true},
          {filters: [{type: 'bandpass', f: 1100, q: 0.7}], level: 1.6},
        ],
      );
      // deste oturması
      this.landParts(v, 1.18, 0.3, 0.3);
    });
  }

  /** Yığını masadan toplama: süpürme + kart kıpırtıları + yığın tıkı. Kart sayısı arttıkça büyür. */
  capture(count: number): void {
    this.run(() => {
      const n = clamp(Math.round(Number.isFinite(count) ? count : 2), 1, 14);
      const k = n / 14;
      const r = this.rng;
      const v = this.voice({wet: 0.16, pan: r.range(-0.2, 0.2), trim: L.capture * (0.4 + 0.6 * Math.pow(k, 1.2))});
      if (!v) return;
      const dur = 0.3 + 0.28 * k;
      // süpürme: çuha üstünde kayan kartlar
      const sw = v.noiseSrc('white', 0, dur + 0.05);
      const hp = v.filt('highpass', 380, 0.7);
      const bp = v.filt('bandpass', 700, 0.8);
      v.sweep(bp.frequency, r.jit(700, 0.1), r.jit(2600, 0.1), 0, dur);
      const mix = v.gain(0.62 * 3.2);
      for (const f of [r.range(55, 75), r.range(97, 131)]) {
        const am = v.osc('sine', f, 0, dur + 0.05);
        const ag = v.gain(0.22 * 3.2);
        am.connect(ag);
        ag.connect(mix.gain);
      }
      const env = v.gain(0);
      v.shape(env.gain, [[0, 0], [0.05, 1], [dur * 0.7, 0.8], [dur, 0]]);
      sw.connect(hp);
      hp.connect(bp);
      bp.connect(mix);
      mix.connect(env);
      env.connect(v.dest);
      // kartların birbirine sürtünen tıkları
      const evs: ClickEv[] = [];
      const cnt = Math.min(n + 1, 13);
      for (let i = 0; i < cnt; i++) {
        evs.push({dt: 0.02 + (dur * 0.92 * (i + r.range(0, 0.8))) / cnt, amp: r.range(0.3, 0.8), tau: r.range(0.0015, 0.003), f: r.range(2400, 5200)});
      }
      v.clickTrain(evs, [{filters: [{type: 'highpass', f: 1800}, {type: 'bandpass', f: 3600, q: 1}], level: 1.1, vary: true}]);
      // ağırlık hissi: çok kartta alçak "fuş"
      if (n > 3) {
        const lo = v.noiseSrc('brown', 0, dur + 0.05);
        const lp = v.filt('lowpass', 420, 0.7);
        lo.connect(lp);
        v.hit(lp, 0.01, dur * 0.35, dur * 0.3, 0.35 * k);
      }
      // yığının masaya vurulması
      this.landParts(v, dur * 0.95, 0.3 + 0.45 * k, 0.8);
    });
  }

  /** Büyük "PİŞTİ!" anı: alçak darbe + pirinç vuruşu + ışıltılı kuyruk (~1.6 sn). */
  pisti(jack: boolean): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.22, pan: 0, trim: L.pisti * (jack ? 1.0 : 1)});
      if (!v) return;
      const big = !!jack;
      this.impactHit(v, 0, 1);
      // pirinç darbesi: Do majör (V → I çözülmesi: jack için "ta-DAA")
      const brass: Omit<ChordOpts, 'amp' | 'atk' | 'hold' | 'rel'> = {
        sustain: 0.7,
        layers: [['sawtooth', 1, -5, 0.75], ['sawtooth', 1, 6, 0.75]],
        cutoff: [900, 5200, 0.05, 0.16, 1800],
        q: 1.3,
        scoop: 0.972,
      };
      const mk = (amp: number, hold: number, rel: number): ChordOpts => ({amp, atk: 0.012, hold, rel, ...brass});
      if (!big) {
        v.chord(0.03, [261.63, 392.0, 523.25, 659.25, 783.99], mk(0.22, 0.36, 0.3));
      } else {
        v.chord(0.03, [196.0, 293.66, 392.0, 493.88, 587.33], mk(0.19, 0.17, 0.12));
        this.impactHit(v, 0.2, 0.95);
        v.chord(0.21, [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5], mk(0.27, 0.46, 0.4));
      }
      // ışıltı: pentatonik çan dokunuşları, yukarı doğru
      const sc = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0, 3136.0, 3520.0];
      const nSp = big ? 17 : 12;
      const spark = v.gain(1);
      spark.connect(v.dest);
      v.wetSend(spark, 0.9);
      let ts = big ? 0.3 : 0.14;
      for (let i = 0; i < nSp; i++) {
        const u = i / nSp;
        const idx = clamp(Math.floor(u * 6) + Math.floor(r.range(0, 4)), 0, sc.length - 1);
        const f = sc[idx] * (big && r.chance(0.35) ? 2 : 1) * r.jit(1, 0.004);
        const a = (0.2 + 0.1 * r.next()) * (1 - 0.55 * u);
        const tau = r.range(0.09, 0.2);
        v.tone('sine', f, ts, 0.0015, tau, a, {dest: spark});
        if (i % 3 === 0) v.tone('sine', f * 2.756, ts, 0.001, tau * 0.45, a * 0.3, {dest: spark}); // çan kısmi tonu
        else if (i % 3 === 1) v.tone('sine', f * 1.0035, ts, 0.0015, tau * 1.2, a * 0.6, {dest: spark}); // ışıltı: vuruşma
        ts += r.range(0.055, 0.095) * (big ? 0.85 : 1);
      }
      // uzun çan sesi + hava parıltısı
      v.tone('sine', 1568.0, 0.18, 0.004, 0.32, 0.14, {dest: spark});
      v.tone('sine', 2349.3, 0.2, 0.004, 0.36, 0.1, {dest: spark});
      const sh = v.noiseSrc('white', 0.1, 1.5);
      const hp = v.filt('highpass', 6500, 0.7);
      sh.connect(hp);
      v.hit(hp, 0.1, 0.12, 0.38, 0.5, spark);
    });
  }

  /** n adet metalik jeton tıngırtısı (sanal çipler). */
  coin(n = 1): void {
    this.run(() => {
      const cnt = clamp(Math.round(Number.isFinite(n) ? n : 1), 1, 12);
      const r = this.rng;
      const v = this.voice({wet: 0.16, pan: r.range(-0.2, 0.2), trim: L.coin});
      if (!v) return;
      let t = 0;
      const norm = 1 / Math.sqrt(1 + 0.45 * (cnt - 1)); // çok jetonda üst üste binmeyi dengele
      for (let i = 0; i < cnt; i++) {
        const f = r.range(2500, 3300);
        const a = r.range(0.75, 1) * norm;
        const dec = r.range(0.8, 1.3);
        v.burst('white', t, 0.0012, 0.9 * a, [{type: 'highpass', f: 4200}], 0.0002);
        v.tone('sine', f, t, 0.0006, 0.085 * dec, 0.55 * a);
        v.tone('sine', f * 1.51, t, 0.0006, 0.06 * dec, 0.4 * a);
        v.tone('sine', f * 2.63, t, 0.0006, 0.04 * dec, 0.25 * a);
        v.tone('sine', r.range(950, 1150), t, 0.0006, 0.012, 0.35 * a); // gövde "tık"
        t += r.range(0.055, 0.115);
      }
    });
  }

  /** Yumuşak ahşap arayüz dokunuşu. */
  uiTap(): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.08, pan: 0, trim: L.tap});
      if (!v) return;
      const lp = v.filt('lowpass', 4200, 0.7);
      lp.connect(v.dest);
      v.dest = lp;
      const f = r.jit(520, 0.06);
      v.tone('sine', f * 1.12, 0, 0.0006, 0.024, 1.0, {f2: f, bendTau: 0.01});
      v.tone('sine', f * 2.45, 0, 0.0005, 0.012, 0.3);
      v.tone('triangle', f * 0.5, 0, 0.001, 0.03, 0.3);
      v.burst('white', 0, 0.004, 1.6, [{type: 'bandpass', f: 1500, q: 1.4}], 0.0004);
    });
  }

  // ───────────── müzikal vurgular ─────────────

  /** Kazanma: sıcak majör kadans (Fa → Sol → Do) + çan ışıltısı (~2 sn). */
  win(): void {
    this.run(() => {
      const r = this.rng;
      const v = this.voice({wet: 0.22, pan: 0, trim: L.win});
      if (!v) return;
      const pad = (amp: number, hold: number, rel: number, cut: number): ChordOpts => ({
        amp, atk: 0.018, hold, rel, sustain: 0.8,
        layers: [['triangle', 1, 0, 1], ['sine', 2, 0, 0.3]],
        cutoff: [900, cut, 0.06, 0.25, cut * 0.55], q: 0.9, vibHz: 5.2, vibCents: 6, vibDelay: 0.15,
      });
      v.chord(0.0, [174.61, 220.0, 261.63, 349.23, 440.0], pad(0.2, 0.26, 0.2, 2600));  // Fa
      v.chord(0.3, [196.0, 246.94, 293.66, 392.0, 493.88], pad(0.21, 0.26, 0.2, 2800)); // Sol
      v.chord(0.62, [130.81, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99], pad(0.26, 1.15, 0.65, 3200)); // Do
      // çan ışıltısı
      const bell = v.gain(1);
      bell.connect(v.dest);
      v.wetSend(bell, 0.8);
      const seq = [1046.5, 1318.5, 1568.0, 2093.0];
      for (let i = 0; i < seq.length; i++) {
        const t = 0.66 + i * 0.1 + r.range(0, 0.02);
        v.tone('sine', seq[i], t, 0.002, 0.28, 0.13, {dest: bell});
        v.tone('sine', seq[i] * 2.756, t, 0.001, 0.1, 0.035, {dest: bell});
      }
    });
  }

  /** Kaybetme: komik, alçalan "womp womp womp wooomp" (fagot/tuba). */
  lose(): void {
    this.run(() => {
      const v = this.voice({wet: 0.14, pan: 0, trim: L.lose});
      if (!v) return;
      const notes = [233.08, 220.0, 207.65, 196.0]; // Si♭ La La♭ Sol
      const base = (amp: number, hold: number, rel: number): ChordOpts => ({
        amp, atk: 0.03, hold, rel, sustain: 0.85,
        layers: [['sawtooth', 1, -4, 0.8], ['sawtooth', 1, 5, 0.8], ['square', 0.5, 0, 0.3]],
        cutoff: [420, 2100, 0.11, 0.14, 950], q: 3.2,
      });
      for (let i = 0; i < 3; i++) {
        v.chord(i * 0.36, [notes[i]], {...base(0.3, 0.31, 0.06), scoop: 1.035});
      }
      v.chord(1.08, [notes[3]], {
        ...base(0.32, 0.9, 0.1),
        cutoff: [420, 2300, 0.14, 0.4, 800],
        scoop: 1.035,
        glide: 0.94,
        vibHz: 5.0,
        vibCents: 22,
        vibDelay: 0.3,
      });
    });
  }

  // ───────────── ortam (kahvehane) ─────────────

  startAmbience(): void {
    this.run(() => {
      this.ambWanted = true;
      this.ambKick();
    });
  }
  stopAmbience(): void {
    this.run(() => {
      this.ambWanted = false;
      this.ambStop();
    });
  }

  // ───────────── ortak ses parçaları ─────────────

  /** Çuha üstüne iniş: kısa yumuşak gövde + keçe tokadı (orta bant) + kâğıt tıkı (üst bant). */
  private landParts(v: VB, dt: number, k: number, g: number): void {
    const r = this.rng;
    const hard = 0.3 + 0.7 * k;
    const f0 = r.jit(165 + 55 * k, 0.08);
    v.tone('sine', f0, dt, 0.0012, 0.02 + 0.01 * (1 - k), 0.28 * hard * g, {f2: f0 * 0.62, bendTau: 0.02});
    const br = v.noiseSrc('brown', dt, 0.25);
    const lp = v.filt('lowpass', 650, 0.7);
    br.connect(lp);
    v.hit(lp, dt, 0.0008, 0.02, 0.55 * hard * g);
    const wn = v.noiseSrc('white', dt, 0.12);
    const pat = v.filt('bandpass', r.jit(1500, 0.12), 0.8);
    wn.connect(pat);
    v.hit(pat, dt, 0.0004, 0.012, 5.0 * hard * g);
    const snap = v.filt('highpass', r.jit(3400, 0.1), 0.7);
    wn.connect(snap);
    v.hit(snap, dt, 0.0003, 0.0035, (0.45 + 1.5 * k) * 0.9 * g);
  }

  /** "Pişti" darbesi: alçak vuruş + kâğıt/tokat transienti + gümbürtü. */
  private impactHit(v: VB, dt: number, g: number): void {
    v.tone('sine', 150, dt, 0.002, 0.12, 0.8 * g, {f2: 48, bendTau: 0.035});
    v.tone('triangle', 280, dt, 0.002, 0.06, 0.7 * g, {f2: 120, bendTau: 0.03});
    v.burst('white', dt, 0.004, 1.3 * g, [{type: 'highpass', f: 1300}], 0.0003);
    v.burst('white', dt, 0.025, 4.5 * g, [{type: 'bandpass', f: 1600, q: 0.7}], 0.0005);
    const boom = v.burst('brown', dt, 0.22, 1.6 * g, [{type: 'lowpass', f: 170}], 0.004);
    v.wetSend(boom, 0.6);
  }

  // ───────────── ortam sesi: yatak ve olaylar ─────────────

  private ambKick(): void {
    if (!this.ctx || !this.ambWanted || this._muted) return;
    if (!this.bed) {
      if (!this.canPlay()) return;
      this.ambStart();
    }
    if (this.offline) return;
    this.ambArm();
  }

  private ambStart(): void {
    const ctx = this.ctx;
    const host = this.host;
    if (!ctx || !host || this.bed) return;
    const rng = this.rng;
    const t = ctx.currentTime + (this.offline ? 0 : 0.02);
    const nodes: AudioNode[] = [];
    const srcs: AudioScheduledSourceNode[] = [];
    const reg = <N extends AudioNode>(n: N): N => {
      nodes.push(n);
      this.nodesAlive++;
      return n;
    };
    const bedGain = reg(ctx.createGain());
    bedGain.gain.setValueAtTime(0, t);
    bedGain.gain.linearRampToValueAtTime(L.bed, t + 2.5);
    bedGain.connect(this.ambBus);
    const maxF = ctx.sampleRate * 0.45;
    const layers: BedLayer[] = [];
    for (const cfg of BED) {
      const src = reg(ctx.createBufferSource());
      src.buffer = host.noise[cfg[0]];
      src.loop = true; // katmanların döngü uzunlukları farklı: birleşik tekrar süresi çok uzun
      src.loopStart = cfg[1];
      src.loopEnd = cfg[2];
      src.start(t, cfg[1] + rng.next() * (cfg[2] - cfg[1] - 0.05));
      srcs.push(src);
      const f = reg(ctx.createBiquadFilter());
      f.type = cfg[3];
      f.frequency.value = Math.min(cfg[4], maxF);
      f.Q.value = cfg[5];
      kRate(f.frequency);
      kRate(f.Q);
      const amp = reg(ctx.createGain());
      amp.gain.value = cfg[6];
      src.connect(f);
      f.connect(amp);
      amp.connect(bedGain);
      layers.push({f, amp, cfg, wf: new Wander(0.02), wa: new Wander(0.04), ws: new Wander(0.5), lastF: Math.min(cfg[4], maxF), lastA: cfg[6]});
    }
    const bed: Bed = {gain: bedGain, nodes, srcs, layers, until: t};
    this.bed = bed;
    this.bedFill(bed, t + (this.offline ? this.horizon : 12));
    this.ambNext = t + rng.range(2.5, 6);
    if (this.offline) this.ambFill(this.horizon);
  }

  /**
   * Yatak katmanlarının süzgeç merkezini ve genliğini `upTo` zamanına kadar yavaş rastgele eğrilerle planla
   * (osilatör tabanlı LFO'lar yerine: çok daha ucuz ve periyodik değil).
   */
  private bedFill(bed: Bed, upTo: number): void {
    const maxF = (this.ctx ? this.ctx.sampleRate : 44100) * 0.45;
    const rng = this.rng;
    while (bed.until < upTo) {
      const t0 = bed.until;
      for (const ly of bed.layers) {
        const [, , , , f0, , level, fDepth, aDepth, syl] = ly.cfg;
        const cf = new Float32Array(BED_PTS);
        const ca = new Float32Array(BED_PTS);
        cf[0] = ly.lastF;
        ca[0] = ly.lastA;
        for (let i = 1; i < BED_PTS; i++) {
          const m = (1 - syl) * ly.wa.next(rng) + syl * ly.ws.next(rng);
          cf[i] = clamp(f0 * (1 + fDepth * ly.wf.next(rng)), 40, maxF);
          ca[i] = level * Math.max(0.05, 1 + aDepth * m);
        }
        ly.lastF = cf[BED_PTS - 1];
        ly.lastA = ca[BED_PTS - 1];
        if (fDepth > 0) ly.f.frequency.setValueCurveAtTime(cf, t0, BED_SEG);
        ly.amp.gain.setValueCurveAtTime(ca, t0, BED_SEG);
      }
      bed.until = t0 + BED_SEG + 0.002; // ardışık eğriler arasında 2 ms boşluk: çakışma hatası olmasın
    }
  }

  private ambStop(): void {
    if (this.ambTimer !== undefined) {
      clearTimeout(this.ambTimer);
      this.ambTimer = undefined;
    }
    const bed = this.bed;
    const ctx = this.ctx;
    this.bed = null;
    if (!bed || !ctx) return;
    const now = ctx.currentTime;
    try {
      bed.gain.gain.cancelScheduledValues(now);
      bed.gain.gain.setTargetAtTime(0, now, 0.18);
    } catch {
      /* yoksay */
    }
    let left = bed.srcs.length;
    const finish = (): void => {
      if (--left > 0) return;
      for (const n of bed.nodes) {
        try {
          n.disconnect();
        } catch {
          /* yoksay */
        }
      }
      this.nodesAlive -= bed.nodes.length;
    };
    for (const s of bed.srcs) {
      s.onended = finish;
      try {
        s.stop(now + 1.4);
      } catch {
        finish();
      }
    }
  }

  private ambArm(): void {
    const ctx = this.ctx;
    if (this.ambTimer !== undefined || !this.bed || !ctx || this.offline) return;
    if (String(ctx.state) !== 'running') return;
    const wait = Math.max(0.25, this.ambNext - ctx.currentTime - AMB_LOOKAHEAD);
    this.ambTimer = setTimeout(this.ambTick, Math.min(wait, 4) * 1000);
  }

  private ambTick = (): void => {
    this.ambTimer = undefined;
    const ctx = this.ctx;
    if (!ctx || !this.bed) return;
    this.run(() => {
      if (this.bed) this.bedFill(this.bed, ctx.currentTime + 12);
      this.ambFill(ctx.currentTime + AMB_LOOKAHEAD);
    });
    this.ambArm();
  };

  /** horizon'a kadar olan ortam olaylarını planla (4–12 sn rastgele aralıklarla). */
  private ambFill(horizon: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.ambNext < horizon) {
      if (this.ambEventsOn) this.ambEvent(Math.max(this.ambNext, ctx.currentTime + 0.01));
      this.ambNext += this.rng.range(4, 12);
    }
  }

  private ambEvent(at: number, force = -1): void {
    const r = this.rng;
    let kind = force;
    if (kind < 0) {
      do {
        const x = r.next();
        kind = x < 0.4 ? 0 : x < 0.55 ? 1 : x < 0.8 ? 2 : 3;
      } while (kind === this.ambLast && r.chance(0.8));
    }
    this.ambLast = kind;
    const far = r.range(0.45, 1);
    const v = this.voice({amb: true, at, wet: 0.35 * far, pan: r.range(-0.7, 0.7), trim: 1});
    if (!v) return;
    const lp = v.filt('lowpass', r.range(3800, 6500) * (0.6 + 0.4 * (1 - far)), 0.6);
    lp.connect(v.out);
    v.dest = lp;
    const a = 0.4 + 0.6 * (1 - far * 0.6);
    switch (kind) {
      case 0:
        this.teaGlass(v, 0, r.range(2450, 3200), a * L.glass);
        if (r.chance(0.45)) this.saucerTick(v, r.range(0.16, 0.34), a * L.glass * 0.7);
        break;
      case 1:
        this.stir(v, a * L.stir);
        break;
      case 2:
        this.dice(v, a * L.dice);
        break;
      default:
        this.creak(v, a * L.creak);
        break;
    }
  }

  /** Tulip çay bardağına kaşık vuruşu: ince cam çınlaması. */
  private teaGlass(v: VB, dt: number, f0: number, a: number): void {
    const r = this.rng;
    v.burst('white', dt, 0.0012, 0.9 * a, [{type: 'highpass', f: 3200}], 0.0002);
    const ratios = [1, 2.32, 4.18, 6.4];
    const amps = [1, 0.5, 0.28, 0.14];
    const taus = [0.2, 0.11, 0.065, 0.038];
    for (let i = 0; i < 4; i++) v.tone('sine', f0 * ratios[i], dt, 0.0008, taus[i] * r.range(0.85, 1.2), a * amps[i]);
    v.tone('sine', f0 * 1.0013, dt, 0.0008, 0.2, a * 0.5); // hafif ses dalgalanması (vuruşma)
  }

  /** Çay tabağına çarpan bardak: seramik tıkı. */
  private saucerTick(v: VB, dt: number, a: number): void {
    v.burst('white', dt, 0.004, 1.1 * a, [{type: 'bandpass', f: 2300, q: 1.8}], 0.0003);
    v.tone('sine', 1850, dt, 0.0005, 0.02, 0.6 * a);
  }

  /** Çay karıştıran kaşık: hızlı, sönen tıngırtılar. */
  private stir(v: VB, a: number): void {
    const r = this.rng;
    const f0 = r.range(2500, 3100);
    const cnt = Math.floor(r.range(5, 9));
    let t = 0;
    for (let i = 0; i < cnt; i++) {
      const g = a * Math.pow(0.84, i) * r.range(0.7, 1);
      v.burst('white', t, 0.001, 0.6 * g, [{type: 'highpass', f: 3000}], 0.0002);
      v.tone('sine', f0 * r.jit(1, 0.02), t, 0.0006, 0.03, 0.7 * g);
      v.tone('sine', f0 * 2.32, t, 0.0006, 0.018, 0.3 * g);
      t += r.range(0.075, 0.105);
    }
    this.teaGlass(v, t + 0.04, f0, a * 0.5);
  }

  /** Tavla zarı: kâğıt/deri fincanda sallanma + tahtaya atış sekmeleri. */
  private dice(v: VB, a: number): void {
    const r = this.rng;
    const shake = Math.floor(r.range(12, 20));
    const evs: ClickEv[] = [];
    for (let i = 0; i < shake; i++) {
      const u = i / shake;
      evs.push({dt: 0.5 * Math.pow(u, 0.9) + r.range(0, 0.015), amp: r.range(0.3, 0.9) * a * 1.5, tau: r.range(0.003, 0.006), f: r.range(1300, 2800)});
    }
    evs.sort((x, y) => x.dt - y.dt);
    v.clickTrain(evs, [
      {filters: [{type: 'bandpass', f: 1900, q: 2.2}], level: 1.6, vary: true},
      {filters: [{type: 'bandpass', f: 520, q: 2}], level: 0.7},
    ]);
    let t = 0.62;
    const gaps = [0.1, 0.085, 0.06, 0.04];
    const lv = [1, 0.7, 0.5, 0.32, 0.2];
    for (let i = 0; i < 5; i++) {
      const g = a * lv[i];
      v.burst('white', t, 0.005, 2.4 * g, [{type: 'bandpass', f: r.range(1700, 2500), q: 1.4}], 0.0003);
      v.tone('sine', r.range(300, 460), t, 0.0008, 0.03, 0.4 * g, {f2: 210, bendTau: 0.02});
      t += (gaps[i] ?? 0) * r.range(0.85, 1.15);
    }
  }

  /** Sandalye gıcırtısı: tutukluk-kayma ile titreyen, dar bantlı ahşap sesi. */
  private creak(v: VB, a: number): void {
    const r = this.rng;
    const dur = r.range(0.35, 0.7);
    const f = r.range(46, 75);
    const o = v.osc('sawtooth', f, 0, dur + 0.05);
    o.frequency.setValueAtTime(v.F(f), v.T(0));
    o.frequency.linearRampToValueAtTime(v.F(f * r.range(0.72, 1.3)), v.T(dur));
    const jl = v.osc('triangle', r.range(9, 17), 0, dur + 0.05); // tutukluk titreşimi
    const jg = v.gain(f * 0.22);
    jl.connect(jg);
    jg.connect(o.frequency);
    const bp = v.filt('bandpass', r.range(850, 1200), 6);
    v.sweep(bp.frequency, r.range(850, 1100), r.range(1000, 1500), 0, dur);
    const env = v.gain(0);
    const lv = a * 1.4;
    v.shape(env.gain, [[0, 0], [dur * 0.25, lv], [dur * 0.65, lv * 0.7], [dur, 0]]);
    o.connect(bp);
    bp.connect(env);
    env.connect(v.dest);
  }

  // ───────────── motor: bağlam, grafik, voice yönetimi ─────────────

  private createContext(): void {
    const w = globalThis as unknown as {AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor};
    const C = w.AudioContext ?? w.webkitAudioContext;
    if (!C) return;
    let ctx: AudioContext;
    try {
      ctx = new C({latencyHint: 'interactive'});
    } catch {
      ctx = new C();
    }
    ctx.onstatechange = () => {
      if (!this.unlocked) return;
      if (String(ctx.state) === 'running') this.ambKick();
      else if (!this.hidden) this.armGesture();
    };
    this.build(ctx);
  }

  private build(ctx: BaseAudioContext): void {
    this.ctx = ctx;
    const rng = this.rng;
    const sr = ctx.sampleRate;
    this.hasPanner = typeof ctx.createStereoPanner === 'function';
    const noise: Record<NoiseKind, AudioBuffer> = {
      white: makeNoise(ctx, 'white', 2, rng),
      pink: makeNoise(ctx, 'pink', 3, rng),
      brown: makeNoise(ctx, 'brown', 2, rng),
    };
    this.sfxBus = ctx.createGain();
    this.sfxLP = ctx.createBiquadFilter();
    this.sfxLP.type = 'lowpass';
    this.sfxLP.Q.value = 0.5;
    this.sfxLP.frequency.value = Math.min(20000, sr * 0.49);
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 1;
    const pre = ctx.createGain();
    // ana çıkış: sıkıştırıcı/limiter → yumuşak kırpıcı → ana ses
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 6;
    comp.ratio.value = 6;
    comp.attack.value = 0.002; // vuruş başlangıçları sıkışmadan geçsin
    comp.release.value = 0.1;
    const clip = ctx.createWaveShaper();
    clip.curve = makeSoftClip();
    this.outGain = ctx.createGain();
    // oda yankısı
    this.reverbIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = makeImpulse(ctx, rng);
    const rev = ctx.createGain();
    rev.gain.value = 0.9;
    this.reverbIn.connect(conv);
    conv.connect(rev);
    rev.connect(this.sfxBus);
    this.sfxBus.connect(this.sfxLP);
    this.sfxLP.connect(pre);
    this.ambBus.connect(pre);
    pre.connect(comp);
    comp.connect(clip);
    clip.connect(this.outGain);
    this.outGain.connect(ctx.destination);
    this.host = {
      ctx,
      rng,
      noise,
      reverbIn: this.reverbIn,
      track: (v, n) => {
        v.nodes.push(n);
        this.nodesAlive++;
      },
      addSrc: (v, s) => {
        v.srcs.push(s);
        v.pending++;
        s.onended = () => {
          if (--v.pending <= 0) this.cleanup(v);
        };
      },
    };
    this.applyVolume();
    this.applySlow();
  }

  private applyVolume(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = this._muted ? 0 : this.vol;
    const now = ctx.currentTime;
    this.outGain.gain.cancelScheduledValues(now);
    this.outGain.gain.setTargetAtTime(g, now, 0.015);
  }

  private applySlow(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const r = this.slow;
    const top = Math.min(20000, ctx.sampleRate * 0.49);
    let f: number;
    if (r >= 0.999) f = top;
    else if (r >= 0.15) f = 800 * Math.pow(18000 / 800, (r - 0.15) / 0.85); // 0.15 → 800 Hz, 1 → 18 kHz
    else f = 800 * Math.pow(r / 0.15, 0.6); // 0.1 → ~600 Hz
    f = Math.min(f, top);
    const now = ctx.currentTime;
    this.sfxLP.frequency.cancelScheduledValues(now);
    this.sfxLP.frequency.setTargetAtTime(f, now, 0.08);
    this.sfxBus.gain.cancelScheduledValues(now);
    this.sfxBus.gain.setTargetAtTime(1 + (0.41 * (1 - r)) / 0.85, now, 0.08);
  }

  private canPlay(): boolean {
    const ctx = this.ctx;
    if (!ctx || !this.host || this._muted) return false;
    if (this.offline) return true;
    if (this.hidden || !this.unlocked) return false;
    return String(ctx.state) === 'running' || this.resuming;
  }

  /** Yeni bir voice aç; sınır doluysa en eskisini düşür. */
  private voice(o: {wet?: number; pan?: number; trim?: number; at?: number; amb?: boolean} = {}): VB | null {
    const ctx = this.ctx;
    const host = this.host;
    if (!ctx || !host || !this.canPlay()) return null;
    const now = ctx.currentTime;
    this.sweepDead(now);
    const amb = o.amb === true;
    const pool = amb ? this.ambPool : this.pool;
    const cap = amb ? MAX_AMB_VOICES : MAX_VOICES;
    while (pool.length >= cap) this.drop(pool[0]);
    const t0 = o.at !== undefined ? Math.max(o.at, WARM_T) : this.startT();
    const out = ctx.createGain();
    out.gain.value = o.trim ?? 1;
    const voice: Voice = {out, nodes: [out], srcs: [], pending: 0, endT: t0, pool, done: false};
    this.nodesAlive++;
    pool.push(voice);
    let tail: AudioNode = out;
    let panP: AudioParam | null = null;
    if (this.hasPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = clamp(o.pan ?? 0, -1, 1);
      out.connect(pn);
      voice.nodes.push(pn);
      this.nodesAlive++;
      tail = pn;
      panP = pn.pan;
    }
    tail.connect(amb ? this.ambBus : this.sfxBus);
    const wet = o.wet ?? 0;
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      out.connect(w);
      w.connect(this.reverbIn);
      voice.nodes.push(w);
      this.nodesAlive++;
    }
    const p = amb ? 1 : this.pK;
    const s = amb ? 1 : this.sK;
    return new VB(host, voice, t0, p, s, panP);
  }

  /** Yeni bir sesin başlama zamanı (ısınma eşiği ve çevrimdışı kaydırma dahil). */
  private startT(): number {
    const now = this.ctx ? this.ctx.currentTime : 0;
    return Math.max(now + START_LAG, WARM_T) + this.tOff;
  }

  /** En eski voice'u hızla kıs ve kaynaklarını durdur (sınır aşıldığında). */
  private drop(v: Voice): void {
    const ctx = this.ctx;
    this.dropped++;
    const i = v.pool.indexOf(v);
    if (i >= 0) v.pool.splice(i, 1);
    if (!ctx || v.done) return;
    const now = ctx.currentTime;
    try {
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setTargetAtTime(0, now, 0.006);
    } catch {
      /* yoksay */
    }
    for (const s of v.srcs) {
      try {
        s.stop(now + 0.04);
      } catch {
        /* henüz başlamamış olabilir */
      }
    }
    this.dying.push({v, at: now + 0.12});
  }

  /** Düğümleri kopar; onended gelmeyen ya da düşürülen voice'lar için güvenlik süpürmesi. */
  private sweepDead(now: number): void {
    for (const pool of [this.pool, this.ambPool]) {
      for (let i = pool.length - 1; i >= 0; i--) if (now > pool[i].endT + 1.0) this.cleanup(pool[i]);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) if (now > this.dying[i].at) this.cleanup(this.dying[i].v);
  }

  private cleanup(v: Voice): void {
    if (v.done) return;
    v.done = true;
    for (const s of v.srcs) s.onended = null;
    for (const n of v.nodes) {
      try {
        n.disconnect();
      } catch {
        /* yoksay */
      }
    }
    this.nodesAlive -= v.nodes.length;
    const i = v.pool.indexOf(v);
    if (i >= 0) v.pool.splice(i, 1);
    const j = this.dying.findIndex((d) => d.v === v);
    if (j >= 0) this.dying.splice(j, 1);
  }

  private run(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      this.fail(e);
      if (Sfx.debug) throw e;
    }
  }

  private fail(e: unknown): void {
    this.errors++;
    this.lastErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // ───────────── iOS / Android: görünürlük ve jest ile sürdürme ─────────────

  private resumeCtx(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || this.offline || this.hidden || String(ctx.state) === 'running') return Promise.resolve();
    const c = ctx as AudioContext;
    this.resuming = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<void>((res) => {
      timer = setTimeout(res, 1500); // iOS'ta jest dışında resume() asılı kalabilir
    });
    const done = c.resume().then(
      () => undefined,
      () => undefined,
    );
    return Promise.race([done, guard]).then(() => {
      if (timer !== undefined) clearTimeout(timer);
      this.resuming = false;
      if (String(c.state) !== 'running') this.armGesture();
    });
  }

  /** Bağlam askıdaysa bir sonraki kullanıcı jestinde sürdür. */
  private armGesture(): void {
    if (this.gestureArmed || typeof window === 'undefined') return;
    this.gestureArmed = true;
    const evs = ['pointerdown', 'touchend', 'keydown', 'click'];
    const h = (): void => {
      for (const e of evs) window.removeEventListener(e, h, true);
      this.gestureArmed = false;
      void this.resumeCtx().then(() => this.ambKick());
    };
    for (const e of evs) window.addEventListener(e, h, true);
  }

  private onVis = (): void => {
    const ctx = this.ctx;
    if (!ctx || this.offline || !this.unlocked) return;
    const hide = document.visibilityState === 'hidden';
    this.hidden = hide;
    if (hide) {
      if (this.ambTimer !== undefined) {
        clearTimeout(this.ambTimer);
        this.ambTimer = undefined;
      }
      (ctx as AudioContext).suspend().catch(() => undefined);
    } else {
      void this.resumeCtx().then(() => this.ambKick());
    }
  };

  /** iOS: sessiz anahtarı yok say, "çalma" oturumuna geç (Safari 16.4+). */
  private iosSession(): void {
    try {
      const nav = navigator as Navigator & {audioSession?: AudioSessionLike};
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* yoksay */
    }
  }
}

// ───────────────────── çevrimdışı ölçüm yardımcısı ─────────────────────

/**
 * Bir ses planını OfflineAudioContext ile işler (geliştirme/ölçüm için; oyunda kullanılmaz).
 * `plan` içinde `s.runAt(dt, () => s.deal())` gibi çağrılarla zaman kaydırılabilir.
 */
export async function renderSfxOffline(
  seconds: number,
  plan: (s: Sfx) => void,
  opts: {sampleRate?: number; seed?: number; volume?: number} = {},
): Promise<OfflineRender> {
  const sr = opts.sampleRate ?? 44100;
  const total = seconds + WARM_T; // sesler ısınma eşiğinden sonra başlar
  const ctx = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const s = new Sfx();
  s.attachOffline(ctx, total, opts.seed ?? 1);
  if (opts.volume !== undefined) s.setVolume(opts.volume);
  plan(s);
  const buf = await ctx.startRendering();
  const stats = s.stats();
  s.dispose();
  return {left: buf.getChannelData(0).slice(), right: buf.getChannelData(1).slice(), sampleRate: sr, stats};
}
