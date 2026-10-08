// Pure audio metering: sample peak, 4x-oversampled true peak, RMS, BS.1770 integrated loudness,
// NaN / clipping / silence checks. Used by unit tests (Node) and the dev measurement page.
import type { F32 } from './dsp.ts';

export interface MeterReport {
  peakDb: number;
  truePeakDb: number;
  rmsDb: number;
  lufs: number;
  maxMomentaryLufs: number;
  minWindowRmsDb: number;
  nanCount: number;
  clipCount: number;
  seconds: number;
}

export function peakAbs(ch: readonly Float32Array[]): number {
  let m = 0;
  for (const c of ch) {
    for (let i = 0; i < c.length; i++) {
      const a = Math.abs(c[i]);
      if (a > m) m = a;
    }
  }
  return m;
}

export function toDb(x: number): number {
  return 20 * Math.log10(Math.max(x, 1e-10));
}

// 4x oversampling interpolator (windowed sinc, 12 taps per phase), as in BS.1770-4 Annex 2.
const OS = 4;
const TAPS = 12;
let osKernel: Float64Array | null = null;
function kernel(): Float64Array {
  if (osKernel) return osKernel;
  const k = new Float64Array(OS * TAPS);
  const half = TAPS / 2;
  for (let p = 0; p < OS; p++) {
    for (let t = 0; t < TAPS; t++) {
      const x = t - half + 1 - p / OS;
      const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / (half + 0.5));
      k[p * TAPS + t] = sinc * w;
    }
  }
  osKernel = k;
  return k;
}

export function truePeakAbs(ch: readonly Float32Array[]): number {
  const k = kernel();
  let m = peakAbs(ch);
  const half = TAPS / 2;
  for (const c of ch) {
    const n = c.length;
    for (let i = 0; i < n; i++) {
      for (let p = 1; p < OS; p++) {
        let acc = 0;
        for (let t = 0; t < TAPS; t++) {
          const j = i + t - half + 1;
          if (j >= 0 && j < n) acc += c[j] * k[p * TAPS + t];
        }
        const a = Math.abs(acc);
        if (a > m) m = a;
      }
    }
  }
  return m;
}

export function rmsAbs(ch: readonly Float32Array[]): number {
  let s = 0;
  let n = 0;
  for (const c of ch) {
    for (let i = 0; i < c.length; i++) s += c[i] * c[i];
    n += c.length;
  }
  return Math.sqrt(s / Math.max(1, n));
}

/** Smallest RMS (dBFS, channels summed in power) over sliding windows — the "never silent" check. */
export function minWindowRmsDb(ch: readonly Float32Array[], sr: number, winSec: number, skipSec = 0): number {
  const w = Math.max(1, Math.round(winSec * sr));
  const n = ch[0].length;
  const start = Math.min(n, Math.round(skipSec * sr));
  let min = Infinity;
  for (let s = start; s + w <= n; s += Math.max(1, w >> 1)) {
    let acc = 0;
    for (const c of ch) for (let i = s; i < s + w; i++) acc += c[i] * c[i];
    const r = Math.sqrt(acc / (w * ch.length));
    if (r < min) min = r;
  }
  return min === Infinity ? toDb(rmsAbs(ch)) : toDb(min);
}

export function nanCount(ch: readonly Float32Array[]): number {
  let k = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) if (!Number.isFinite(c[i])) k++;
  return k;
}

export function clipCount(ch: readonly Float32Array[], threshold = 0.999): number {
  let k = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) if (Math.abs(c[i]) >= threshold) k++;
  return k;
}

interface Bq {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * BS.1770 K-weighting for any sample rate (libebur128 derivation; reproduces the ITU 48 kHz
 * reference coefficients exactly).
 */
function kWeighting(sr: number): [Bq, Bq] {
  // Stage 1: high shelf (+4 dB above ~1.7 kHz).
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const shelf: Bq = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  // Stage 2: RLB high-pass (~38 Hz).
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / sr);
  a0 = 1 + K / Q + K * K;
  const hp: Bq = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [shelf, hp];
}

function filterK(c: Float32Array, sr: number): Float64Array {
  const [s1, s2] = kWeighting(sr);
  const out = new Float64Array(c.length);
  let z1 = 0;
  let z2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < c.length; i++) {
    const x = c[i];
    const a = s1.b0 * x + z1;
    z1 = s1.b1 * x - s1.a1 * a + z2;
    z2 = s1.b2 * x - s1.a2 * a;
    const b = s2.b0 * a + y1;
    y1 = s2.b1 * a - s2.a1 * b + y2;
    y2 = s2.b2 * a - s2.a2 * b;
    out[i] = b;
  }
  return out;
}

/**
 * Integrated loudness (LUFS, BS.1770-4 gating) plus max momentary (400 ms) loudness.
 * Clips shorter than one block fall back to ungated loudness over the whole clip.
 */
export function loudness(ch: readonly Float32Array[], sr: number): { integrated: number; maxMomentary: number } {
  const kw = ch.map((c) => filterK(c, sr));
  const n = ch[0].length;
  const block = Math.round(0.4 * sr);
  const hop = Math.round(0.1 * sr);
  const z: number[] = [];
  if (n < block) {
    let s = 0;
    for (const k of kw) {
      let acc = 0;
      for (let i = 0; i < n; i++) acc += k[i] * k[i];
      s += acc / Math.max(1, n);
    }
    const l = -0.691 + 10 * Math.log10(Math.max(s, 1e-12));
    return { integrated: l, maxMomentary: l };
  }
  for (let s = 0; s + block <= n; s += hop) {
    let sum = 0;
    for (const k of kw) {
      let acc = 0;
      for (let i = s; i < s + block; i++) acc += k[i] * k[i];
      sum += acc / block;
    }
    z.push(sum);
  }
  const lk = (v: number) => -0.691 + 10 * Math.log10(Math.max(v, 1e-12));
  let maxM = -Infinity;
  for (const v of z) maxM = Math.max(maxM, lk(v));
  const abs = z.filter((v) => lk(v) > -70);
  if (abs.length === 0) return { integrated: -70, maxMomentary: maxM };
  const meanAbs = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = lk(meanAbs) - 10;
  const gated = abs.filter((v) => lk(v) > rel);
  const mean = gated.reduce((a, b) => a + b, 0) / Math.max(1, gated.length);
  return { integrated: lk(mean), maxMomentary: maxM };
}

export function meter(ch: readonly F32[] | readonly Float32Array[], sr: number, silenceWinSec = 0.4, skipSec = 0): MeterReport {
  const l = loudness(ch, sr);
  return {
    peakDb: toDb(peakAbs(ch)),
    truePeakDb: toDb(truePeakAbs(ch)),
    rmsDb: toDb(rmsAbs(ch)),
    lufs: l.integrated,
    maxMomentaryLufs: l.maxMomentary,
    minWindowRmsDb: minWindowRmsDb(ch, sr, silenceWinSec, skipSec),
    nanCount: nanCount(ch),
    clipCount: clipCount(ch),
    seconds: ch[0].length / sr,
  };
}
