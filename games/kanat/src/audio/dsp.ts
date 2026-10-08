// Pure DSP toolkit used to synthesize every KANAT sound at load time.
// No DOM, no Web Audio: runs in Node (unit tests) and in the browser (pre-generation before unlock).
import { Rng } from './rng.ts';

/** Generation sample rate. AudioBuffers keep this rate; the AudioContext resamples if it differs. */
export const GEN_SR = 48000;
export const TAU = Math.PI * 2;

export type F32 = Float32Array<ArrayBuffer>;

/** Mono or stereo PCM clip. */
export interface Pcm {
  sr: number;
  ch: F32[];
}

export function makePcm(sec: number, channels = 1, sr = GEN_SR): Pcm {
  const n = Math.max(1, Math.round(sec * sr));
  const ch: F32[] = [];
  for (let i = 0; i < channels; i++) ch.push(new Float32Array(n));
  return { sr, ch };
}

export function pcmLength(p: Pcm): number {
  return p.ch[0].length;
}

export function clamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(g: number): number {
  return 20 * Math.log10(Math.max(Math.abs(g), 1e-12));
}

/** Exponential (log-frequency) interpolation: a at t=0, b at t=1. */
export function expMap(a: number, b: number, t: number): number {
  return a * Math.pow(b / a, t);
}

// ---------------------------------------------------------------------------------------------
// Filters

/** RBJ-cookbook biquad, transposed direct form II. Coefficients can be updated while running. */
export class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = 0;
  z2 = 0;

  private set(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): this {
    const inv = 1 / a0;
    this.b0 = b0 * inv;
    this.b1 = b1 * inv;
    this.b2 = b2 * inv;
    this.a1 = a1 * inv;
    this.a2 = a2 * inv;
    return this;
  }

  lowpass(f: number, q: number, sr = GEN_SR): this {
    const w = (TAU * clamp(f, 10, sr * 0.49)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    return this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
  }

  highpass(f: number, q: number, sr = GEN_SR): this {
    const w = (TAU * clamp(f, 10, sr * 0.49)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    return this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
  }

  /** Band-pass with constant 0 dB peak gain. */
  bandpass(f: number, q: number, sr = GEN_SR): this {
    const w = (TAU * clamp(f, 10, sr * 0.49)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    return this.set(al, 0, -al, 1 + al, -2 * c, 1 - al);
  }

  peaking(f: number, q: number, db: number, sr = GEN_SR): this {
    const A = Math.pow(10, db / 40);
    const w = (TAU * clamp(f, 10, sr * 0.49)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    return this.set(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
  }

  highshelf(f: number, q: number, db: number, sr = GEN_SR): this {
    const A = Math.pow(10, db / 40);
    const w = (TAU * clamp(f, 10, sr * 0.49)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    const sA = 2 * Math.sqrt(A) * al;
    return this.set(
      A * (A + 1 + (A - 1) * c + sA),
      -2 * A * (A - 1 + (A + 1) * c),
      A * (A + 1 + (A - 1) * c - sA),
      A + 1 - (A - 1) * c + sA,
      2 * (A - 1 - (A + 1) * c),
      A + 1 - (A - 1) * c - sA,
    );
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  reset(): void {
    this.z1 = 0;
    this.z2 = 0;
  }
}

/** One-pole low-pass (6 dB/oct). */
export class OnePole {
  a = 1;
  y = 0;

  freq(f: number, sr = GEN_SR): this {
    this.a = 1 - Math.exp((-TAU * f) / sr);
    return this;
  }

  process(x: number): number {
    this.y += this.a * (x - this.y);
    return this.y;
  }
}

/** DC blocker / gentle high-pass. */
export class DcBlock {
  x1 = 0;
  y1 = 0;
  r = 0.995;

  process(x: number): number {
    const y = x - this.x1 + this.r * this.y1;
    this.x1 = x;
    this.y1 = y;
    return y;
  }
}

// ---------------------------------------------------------------------------------------------
// Noise

export class Noise {
  rng: Rng;
  private p0 = 0;
  private p1 = 0;
  private p2 = 0;
  private p3 = 0;
  private p4 = 0;
  private p5 = 0;
  private p6 = 0;
  private br = 0;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  white(): number {
    return this.rng.next() * 2 - 1;
  }

  /** Paul Kellet's refined pink filter, ~unit peak. */
  pink(): number {
    const w = this.white();
    this.p0 = 0.99886 * this.p0 + w * 0.0555179;
    this.p1 = 0.99332 * this.p1 + w * 0.0750759;
    this.p2 = 0.969 * this.p2 + w * 0.153852;
    this.p3 = 0.8665 * this.p3 + w * 0.3104856;
    this.p4 = 0.55 * this.p4 + w * 0.5329522;
    this.p5 = -0.7616 * this.p5 - w * 0.016898;
    const out = this.p0 + this.p1 + this.p2 + this.p3 + this.p4 + this.p5 + this.p6 + w * 0.5362;
    this.p6 = w * 0.115926;
    return out * 0.11;
  }

  /** Leaky-integrated white noise (brown / red), ~unit peak. */
  brown(): number {
    this.br = (this.br + 0.02 * this.white()) / 1.02;
    return this.br * 3.5;
  }
}

// ---------------------------------------------------------------------------------------------
// Envelopes

/** Linear attack then exponential decay (time constant `decay` seconds). */
export function envAD(t: number, attack: number, decay: number): number {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

/** Attack / sustain / release with raised-cosine edges. */
export function envASR(t: number, attack: number, sustainEnd: number, release: number): number {
  if (t < 0) return 0;
  if (t < attack) return 0.5 - 0.5 * Math.cos((Math.PI * t) / attack);
  if (t < sustainEnd) return 1;
  const r = (t - sustainEnd) / release;
  if (r >= 1) return 0;
  return 0.5 + 0.5 * Math.cos(Math.PI * r);
}

/** Hann bump on [0, len]. */
export function bump(t: number, len: number): number {
  if (t <= 0 || t >= len) return 0;
  return 0.5 - 0.5 * Math.cos((TAU * t) / len);
}

// ---------------------------------------------------------------------------------------------
// Clip utilities

export function peakOf(p: Pcm): number {
  let m = 0;
  for (const c of p.ch) {
    for (let i = 0; i < c.length; i++) {
      const a = Math.abs(c[i]);
      if (a > m) m = a;
    }
  }
  return m;
}

/** Scale clip so its sample peak equals `db` dBFS. */
export function normalizePeak(p: Pcm, db: number): Pcm {
  const m = peakOf(p);
  if (m <= 0) return p;
  const g = dbToGain(db) / m;
  for (const c of p.ch) for (let i = 0; i < c.length; i++) c[i] *= g;
  return p;
}

/** Short raised-cosine fades at both ends to guarantee click-free starts/stops. */
export function fadeEdges(p: Pcm, inSec: number, outSec: number): Pcm {
  const n = pcmLength(p);
  const fi = Math.min(n, Math.round(inSec * p.sr));
  const fo = Math.min(n, Math.round(outSec * p.sr));
  for (const c of p.ch) {
    for (let i = 0; i < fi; i++) c[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fi);
    for (let i = 0; i < fo; i++) c[n - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
  }
  return p;
}

/**
 * Make a seamless loop: the last `fadeSec` is equal-power cross-faded into the head and dropped.
 * For uncorrelated material (noise) equal-power keeps the level constant across the seam.
 */
export function makeSeamless(p: Pcm, fadeSec: number): Pcm {
  const n = pcmLength(p);
  const f = Math.min(Math.floor(n / 3), Math.round(fadeSec * p.sr));
  const m = n - f;
  const out: F32[] = [];
  for (const c of p.ch) {
    const o = new Float32Array(m);
    for (let i = 0; i < m; i++) o[i] = c[i];
    for (let i = 0; i < f; i++) {
      const k = (i + 0.5) / f;
      const gin = Math.sin(k * Math.PI * 0.5);
      const gout = Math.cos(k * Math.PI * 0.5);
      o[i] = c[i] * gin + c[m + i] * gout;
    }
    out.push(o);
  }
  return { sr: p.sr, ch: out };
}

/** Mix `src` into `dst` starting at sample offset with gain (channels broadcast mono→stereo). */
export function mixInto(dst: Pcm, src: Pcm, offset: number, gain: number): void {
  const n = pcmLength(dst);
  for (let c = 0; c < dst.ch.length; c++) {
    const s = src.ch[Math.min(c, src.ch.length - 1)];
    const d = dst.ch[c];
    for (let i = 0; i < s.length; i++) {
      const j = offset + i;
      if (j >= n) break;
      if (j >= 0) d[j] += s[i] * gain;
    }
  }
}

/** Stereo copy of a mono clip with a constant-power pan (-1..1). */
export function panMono(p: Pcm, pan: number): Pcm {
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  const gl = Math.cos(a);
  const gr = Math.sin(a);
  const src = p.ch[0];
  const l = new Float32Array(src.length);
  const r = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    l[i] = src[i] * gl;
    r[i] = src[i] * gr;
  }
  return { sr: p.sr, ch: [l, r] };
}

// ---------------------------------------------------------------------------------------------
// Physical / tonal generators

export interface KsOpts {
  /** Seconds to -60 dB at the fundamental. */
  decay: number;
  /** 0..1 excitation brightness. */
  bright: number;
  /** Loop damping 0..0.5 (0.5 = classic two-point average, darker). */
  damp: number;
  /** Pluck position 0..0.5 (comb on the excitation). */
  pick: number;
}

/** Karplus-Strong plucked string with allpass fine tuning. Writes `out.length` samples. */
export function karplus(out: F32, freq: number, opts: KsOpts, rng: Rng, sr = GEN_SR): void {
  const damp = clamp(opts.damp, 0.02, 0.5);
  const total = sr / freq;
  let n = Math.floor(total - damp - 0.15);
  if (n < 2) n = 2;
  const frac = total - n - damp;
  const c = (1 - frac) / (1 + frac);
  const loss = Math.pow(10, -3 / (opts.decay * freq));
  const line = new Float64Array(n);
  // Excitation: low-passed noise burst with pick-position comb.
  const lp = new OnePole().freq(400 + 9000 * opts.bright * opts.bright, sr);
  const tmp = new Float64Array(n);
  for (let i = 0; i < n; i++) tmp[i] = lp.process(rng.bi());
  const pickN = Math.max(1, Math.round(n * clamp(opts.pick, 0.02, 0.5)));
  let mean = 0;
  for (let i = 0; i < n; i++) {
    line[i] = tmp[i] - (i >= pickN ? tmp[i - pickN] : 0) * 0.9;
    mean += line[i];
  }
  mean /= n;
  for (let i = 0; i < n; i++) line[i] -= mean;
  let idx = 0;
  let prev = 0;
  let apx = 0;
  let apy = 0;
  for (let i = 0; i < out.length; i++) {
    const cur = line[idx];
    out[i] = cur;
    const f = cur * (1 - damp) + prev * damp;
    prev = cur;
    const ap = c * f + apx - c * apy;
    apx = f;
    apy = ap;
    line[idx] = ap * loss;
    idx++;
    if (idx === n) idx = 0;
  }
}

/** Additive bell / chime: partial ratios + per-partial decay. */
export function bellInto(
  out: F32,
  freq: number,
  ratios: readonly number[],
  amps: readonly number[],
  decays: readonly number[],
  start: number,
  gain: number,
  rng: Rng,
  sr = GEN_SR,
): void {
  for (let k = 0; k < ratios.length; k++) {
    const f = freq * ratios[k];
    if (f >= sr * 0.45) continue;
    const w = (TAU * f) / sr;
    let ph = rng.next() * TAU;
    const a = amps[k] * gain;
    const d = decays[k];
    const len = Math.min(out.length - start, Math.round(d * 7 * sr));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const e = t < 0.002 ? t / 0.002 : Math.exp(-t / d);
      out[start + i] += a * e * Math.sin(ph);
      ph += w;
    }
  }
}

/**
 * Small feedback-delay-network reverb (4 lines, Householder feedback, damping) used to bake tails
 * into chime/bell SFX so the runtime needs only one ConvolverNode (music).
 * Returns a new stereo clip extended by `tailSec`.
 */
export function bakeReverb(p: Pcm, wet: number, rt60: number, tailSec: number, damping = 0.35): Pcm {
  const sr = p.sr;
  const n0 = pcmLength(p);
  const n = n0 + Math.round(tailSec * sr);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const lens = [1423, 1777, 2137, 2473].map((l) => Math.round((l * sr) / 48000));
  const lines = lens.map((l) => new Float64Array(l));
  const idx = [0, 0, 0, 0];
  const g = lens.map((l) => Math.pow(10, (-3 * l) / (rt60 * sr)));
  const lpState = [0, 0, 0, 0];
  const srcL = p.ch[0];
  const srcR = p.ch[Math.min(1, p.ch.length - 1)];
  const pre = Math.round(0.012 * sr);
  const v = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const j = i - pre;
    const inL = j >= 0 && j < n0 ? srcL[j] : 0;
    const inR = j >= 0 && j < n0 ? srcR[j] : 0;
    for (let k = 0; k < 4; k++) v[k] = lines[k][idx[k]];
    // Householder: y = v - 0.5 * sum(v)
    const s = 0.5 * (v[0] + v[1] + v[2] + v[3]);
    for (let k = 0; k < 4; k++) {
      let y = (v[k] - s) * g[k];
      lpState[k] += (1 - damping) * (y - lpState[k]);
      y = lpState[k];
      const inp = k & 1 ? inR : inL;
      lines[k][idx[k]] = y + inp * 0.5;
      idx[k]++;
      if (idx[k] === lens[k]) idx[k] = 0;
    }
    const dryL = i < n0 ? srcL[i] : 0;
    const dryR = i < n0 ? srcR[i] : 0;
    outL[i] = dryL + wet * (v[0] - v[2] + 0.5 * v[1]);
    outR[i] = dryR + wet * (v[1] - v[3] + 0.5 * v[2]);
  }
  return { sr, ch: [outL, outR] };
}

/**
 * Synthesized stereo impulse response for the shared music ConvolverNode:
 * sparse early reflections + exponentially decaying noise whose brightness falls over time.
 */
export function synthIR(sec: number, rt60: number, rng: Rng, sr = GEN_SR): Pcm {
  const p = makePcm(sec, 2, sr);
  const pre = Math.round(0.018 * sr);
  for (let c = 0; c < 2; c++) {
    const d = p.ch[c];
    const lp = new OnePole();
    for (let i = pre; i < d.length; i++) {
      const t = (i - pre) / sr;
      const env = Math.exp((-6.9 * t) / rt60);
      const cut = expMap(9000, 900, clamp(t / rt60, 0, 1));
      lp.freq(cut, sr);
      const fadeIn = Math.min(1, t / 0.006);
      d[i] = lp.process(rng.bi()) * env * fadeIn;
    }
    // Early reflections.
    for (let k = 0; k < 9; k++) {
      const t = 0.008 + rng.next() * 0.07;
      const j = pre + Math.round(t * sr);
      if (j < d.length) d[j] += (rng.next() < 0.5 ? -1 : 1) * (0.5 - t * 4) * 0.8;
    }
  }
  fadeEdges(p, 0, 0.05);
  return p;
}

// ---------------------------------------------------------------------------------------------
// Master safety limiter curve

/**
 * WaveShaper curve for the master safety stage. The shaper input is pre-scaled by `preGain`
 * (so curve domain [-1, 1] covers signal [-1/preGain, 1/preGain]). Identity below `kneeDb`,
 * tanh knee above, asymptotically approaching `ceilingDb`. Inputs beyond the domain clamp to the
 * curve ends (= ceiling) so the output sample peak can never exceed the ceiling.
 */
export function limiterCurve(n: number, preGain: number, kneeDb: number, ceilingDb: number): F32 {
  const curve = new Float32Array(n);
  const T = dbToGain(kneeDb);
  const C = dbToGain(ceilingDb);
  const span = C - T;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const x = u / preGain;
    const ax = Math.abs(x);
    const y = ax <= T ? ax : T + span * Math.tanh((ax - T) / span);
    curve[i] = Math.sign(x) * Math.min(y, C);
  }
  return curve;
}

/** Evaluate a WaveShaper curve the way the Web Audio spec does (linear interpolation, clamped). */
export function shapeSample(curve: F32, v: number): number {
  const n = curve.length;
  const pos = ((clamp(v, -1, 1) + 1) * (n - 1)) / 2;
  const i = Math.floor(pos);
  if (i >= n - 1) return curve[n - 1];
  const f = pos - i;
  return curve[i] * (1 - f) + curve[i + 1] * f;
}
