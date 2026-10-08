// Procedural SFX library: every sound effect and ambience loop of KANAT + SÜRÜ.io is synthesized
// here from code (noise, oscillators, Karplus-Strong, additive bells, baked FDN reverb).
// Pure: runs in Node (unit tests) and in the browser at load time. Zero samples, zero licences.
import {
  Biquad,
  GEN_SR,
  Noise,
  OnePole,
  TAU,
  bakeReverb,
  bellInto,
  bump,
  clamp,
  decimate2,
  envAD,
  expMap,
  fadeEdges,
  fsin,
  karplus,
  makePcm,
  makeSeamless,
  normalizePeak,
  smoothstep,
} from './dsp.ts';
import type { F32, Pcm } from './dsp.ts';
import { Rng } from './rng.ts';
import { midiToHz } from './scales.ts';

const SR = GEN_SR;

export type SfxBus = 'sfx' | 'ui' | 'amb';

export type SfxId =
  // flight
  | 'wingsOpen'
  | 'jump'
  | 'graze'
  | 'flyRock'
  | 'flyTree'
  | 'flyWater'
  | 'mult1'
  | 'mult2'
  | 'mult3'
  | 'mult5'
  | 'comboBreak'
  | 'gateChime'
  | 'gateMiss'
  | 'thermalHum'
  | 'burner'
  | 'burnerFar'
  | 'warmChime'
  | 'parachutePat'
  | 'silkRustle'
  | 'landThud'
  | 'landSoft'
  | 'starTok'
  | 'crashVumf'
  | 'bounceScrape'
  | 'bounceWater'
  | 'landingCue'
  | 'collisionBeep'
  | 'halfFlight'
  // ui
  | 'uiTap'
  | 'uiSwish'
  | 'uiConfirm'
  | 'uiBack'
  | 'uiToggle'
  | 'tallyTick'
  | 'tallyEnd'
  | 'reward'
  | 'photoShutter'
  // SÜRÜ.io & ambience
  | 'murmur'
  | 'joinFlutter'
  | 'convertTicks'
  | 'kusatmaRise'
  | 'kusatmaChord'
  | 'hawkWhistle'
  | 'gustWhoosh'
  | 'storm'
  | 'rain'
  | 'thunder'
  | 'sunsetBell'
  | 'gull1'
  | 'gull2'
  | 'waves'
  | 'trickle'
  | 'roundEnd'
  | 'eliminated'
  | 'breathEmpty';

export interface SfxDef {
  gen: (r: Rng) => Pcm;
  bus: SfxBus;
  /** Playback level in dB (applied by the voice, after peak normalization to -3 dBFS). */
  db: number;
  loop?: boolean;
  /** Voice priority for stealing (higher survives). */
  prio: number;
}

// ---------------------------------------------------------------------------------------------
// Building blocks

type Env = (t: number) => number;
type Color = 'white' | 'pink' | 'brown';

interface Filt {
  type: 'lp' | 'hp' | 'bp';
  f0: number;
  /** Optional end frequency: exponential glide over the duration (shaped by `curve`). */
  f1?: number;
  q: number;
  curve?: (u: number) => number;
}

function noiseSample(n: Noise, c: Color): number {
  return c === 'white' ? n.white() : c === 'pink' ? n.pink() : n.brown();
}

function setFilt(bq: Biquad, f: Filt, freq: number): void {
  if (f.type === 'lp') bq.lowpass(freq, f.q);
  else if (f.type === 'hp') bq.highpass(freq, f.q);
  else bq.bandpass(freq, f.q);
}

/** Filtered noise layer with an envelope; filter can glide. Two cascaded biquads when `steep`. */
function addNoise(out: F32, rng: Rng, start: number, dur: number, color: Color, filt: Filt | null, env: Env, gain: number, steep = false): void {
  const n = new Noise(rng);
  const s0 = Math.round(start * SR);
  const len = Math.min(out.length - s0, Math.round(dur * SR));
  const bq = new Biquad();
  const bq2 = new Biquad();
  if (filt) {
    setFilt(bq, filt, filt.f0);
    setFilt(bq2, filt, filt.f0);
  }
  for (let i = 0; i < len; i++) {
    if (filt && filt.f1 !== undefined && (i & 15) === 0) {
      const u = i / len;
      const k = filt.curve ? filt.curve(u) : u;
      const f = expMap(filt.f0, filt.f1, k);
      setFilt(bq, filt, f);
      if (steep) setFilt(bq2, filt, f);
    }
    let x = noiseSample(n, color);
    if (filt) {
      x = bq.process(x);
      if (steep) x = bq2.process(x);
    }
    out[s0 + i] += x * env(i / SR) * gain;
  }
}

/** Additive tone with frequency contour, harmonics and envelope. */
function addTone(out: F32, start: number, dur: number, freq: (t: number) => number, partials: readonly number[], env: Env, gain: number, rng: Rng): void {
  const s0 = Math.round(start * SR);
  const len = Math.min(out.length - s0, Math.round(dur * SR));
  const ph = partials.map(() => rng.next() * TAU);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = freq(t);
    const e = env(t);
    let v = 0;
    for (let k = 0; k < partials.length; k++) {
      const fk = f * (k + 1);
      if (fk < SR * 0.45 && partials[k] !== 0) v += partials[k] * fsin(ph[k]);
      ph[k] += (TAU * fk) / SR;
      if (ph[k] > TAU) ph[k] -= TAU;
    }
    out[s0 + i] += v * e * gain;
  }
}

/** Granular noise bursts (rustle, crackle, flaps): rate in grains/s may vary over time. */
function addGrains(
  out: F32,
  rng: Rng,
  start: number,
  dur: number,
  rate: (t: number) => number,
  grainMin: number,
  grainMax: number,
  fMin: number,
  fMax: number,
  q: number,
  env: Env,
  gain: number,
): void {
  const n = new Noise(rng);
  const bq = new Biquad();
  let t = 0;
  while (t < dur) {
    const r = Math.max(1, rate(t));
    t += (-Math.log(1 - rng.next() * 0.999) / r);
    if (t >= dur) break;
    const gl = rng.range(grainMin, grainMax);
    const gn = Math.round(gl * SR);
    const s0 = Math.round((start + t) * SR);
    bq.bandpass(expMap(fMin, fMax, rng.next()), q);
    bq.reset();
    const a = env(t) * gain * (0.35 + 0.65 * rng.next());
    for (let i = 0; i < gn && s0 + i < out.length; i++) {
      const w = bump(i, gn);
      out[s0 + i] += bq.process(n.white()) * w * a;
    }
  }
}

function sine(out: F32, start: number, dur: number, f0: number, f1: number, env: Env, gain: number): void {
  const s0 = Math.round(start * SR);
  const len = Math.min(out.length - s0, Math.round(dur * SR));
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const f = expMap(f0, f1, u);
    out[s0 + i] += fsin(ph) * env(i / SR) * gain;
    ph += (TAU * f) / SR;
    if (ph > TAU) ph -= TAU;
  }
}

/** Mono clip (seconds). */
function mono(sec: number): Pcm {
  return makePcm(sec, 1);
}

function finish(p: Pcm, fadeIn = 0.001, fadeOut = 0.02): Pcm {
  fadeEdges(p, fadeIn, fadeOut);
  return normalizePeak(p, -3);
}

/** Seamless noise-bed loop: renders `sec + fade`, then cross-fades to exactly `sec`. */
function seamless(sec: number, fade: number, fill: (out: F32) => void): Pcm {
  const p = makePcm(sec + fade, 1);
  fill(p.ch[0]);
  return makeSeamless(p, fade);
}

/** Halve the rate of dark/long material (memory), keep peak normalization. */
function half(p: Pcm, loop = false): Pcm {
  return normalizePeak(decimate2(p, loop), -3);
}

const BELL_RATIOS = [1, 2.0, 2.76, 4.07, 5.4];
const BELL_AMPS = [1, 0.35, 0.5, 0.2, 0.15];

// ---------------------------------------------------------------------------------------------
// Flight

function wingsOpen(r: Rng): Pcm {
  const p = mono(0.6);
  const o = p.ch[0];
  addNoise(o, r, 0, 0.3, 'white', { type: 'bp', f0: 2600, f1: 600, q: 0.9 }, (t) => envAD(t, 0.002, 0.045), 1.0);
  addNoise(o, r, 0, 0.4, 'pink', { type: 'lp', f0: 420, q: 0.7 }, (t) => envAD(t, 0.01, 0.12), 0.9);
  sine(o, 0, 0.25, 88, 52, (t) => envAD(t, 0.003, 0.07), 0.7);
  addNoise(o, r, 0.03, 0.5, 'white', { type: 'bp', f0: 900, q: 1.5 }, (t) => {
    const f = 0.5 + 0.5 * fsin(TAU * 28 * t);
    return f * f * Math.exp(-t / 0.12);
  }, 0.45);
  return finish(p);
}

function jump(r: Rng): Pcm {
  const p = mono(1.4);
  const o = p.ch[0];
  addNoise(o, r, 0, 1.4, 'pink', { type: 'bp', f0: 260, f1: 1500, q: 0.7, curve: (u) => Math.pow(u, 0.7) }, (t) => {
    const u = t / 1.4;
    return smoothstep(0, 0.65, u) * (1 - smoothstep(0.7, 1, u));
  }, 1.0, true);
  addNoise(o, r, 0, 0.35, 'white', { type: 'bp', f0: 1800, q: 1.2 }, (t) => envAD(t, 0.01, 0.06), 0.25);
  return finish(p, 0.002, 0.05);
}

function graze(r: Rng): Pcm {
  const p = mono(0.8);
  const o = p.ch[0];
  // Air-rip: swept band noise with crackle modulation.
  const n = new Noise(r);
  const bq = new Biquad();
  const bq2 = new Biquad();
  let crack = 0;
  const len = Math.round(0.6 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 15) === 0) {
      const f = expMap(4200, 900, clamp(t / 0.35, 0, 1));
      bq.bandpass(f, 1.1);
      bq2.bandpass(f * 1.6, 1.4);
    }
    if (r.next() < 0.012) crack = 0.6 + 0.4 * r.next();
    crack *= 0.994;
    const w = n.white();
    const x = bq.process(w) + 0.5 * bq2.process(w);
    o[i] += x * envAD(t, 0.004, 0.12) * (0.55 + 0.6 * crack);
  }
  // Whistle.
  addTone(o, 0.01, 0.6, (t) => expMap(2900, 1500, clamp(t / 0.45, 0, 1)) * (1 + 0.015 * fsin(TAU * 9 * t)), [1, 0.12], (t) => envAD(t, 0.02, 0.18), 0.28, r);
  // Pressure thump.
  sine(o, 0, 0.12, 72, 45, (t) => envAD(t, 0.002, 0.04), 0.35);
  return finish(p);
}

function flyBy(r: Rng, kind: 'rock' | 'tree' | 'water'): Pcm {
  const dur = kind === 'rock' ? 0.9 : 1.0;
  const p = mono(dur);
  const o = p.ch[0];
  const peak = 0.07;
  const env: Env = (t) => (t < peak ? Math.pow(t / peak, 2) : Math.exp(-(t - peak) / (kind === 'rock' ? 0.2 : 0.26)));
  const sig = (u: number) => 1 / (1 + Math.exp(-(u * dur - peak - 0.05) * 18));
  if (kind === 'rock') {
    addNoise(o, r, 0, dur, 'pink', { type: 'bp', f0: 2600, f1: 620, q: 1.4, curve: sig }, env, 1.0);
    addNoise(o, r, 0, dur, 'white', { type: 'bp', f0: 4200, f1: 1400, q: 1.0, curve: sig }, env, 0.35);
    addGrains(o, r, 0, 0.5, () => 140, 0.002, 0.006, 2500, 7000, 1.5, (t) => env(t), 0.5);
  } else if (kind === 'tree') {
    addNoise(o, r, 0, dur, 'pink', { type: 'bp', f0: 1800, f1: 480, q: 0.9, curve: sig }, env, 0.8);
    addGrains(o, r, 0, 0.75, () => 260, 0.003, 0.012, 1800, 6500, 0.9, (t) => (t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) / 0.3)), 0.8);
  } else {
    addNoise(o, r, 0, dur, 'pink', { type: 'bp', f0: 1400, f1: 380, q: 0.8, curve: sig }, env, 0.9);
    const n = new Noise(r);
    const hp = new Biquad().highpass(4500, 0.7);
    const bub = new OnePole().freq(14);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      const am = clamp(0.5 + 3 * bub.process(n.white()), 0, 1.5);
      o[i] += hp.process(n.white()) * env(t) * am * 0.35;
    }
    addNoise(o, r, 0, dur, 'brown', { type: 'lp', f0: 300, q: 0.7 }, env, 0.4);
  }
  return finish(p, 0.002, 0.04);
}

function multTone(r: Rng, midi: number): Pcm {
  const p = mono(0.9);
  const o = p.ch[0];
  const f = midiToHz(midi);
  addTone(o, 0, 0.9, () => f, [1, 0.25, 0.08], (t) => envAD(t, 0.004, 0.32), 0.8, r);
  addTone(o, 0, 0.9, () => f * 1.0017, [1], (t) => envAD(t, 0.01, 0.4), 0.2, r);
  addTone(o, 0, 0.5, () => f * 4.2, [1], (t) => envAD(t, 0.002, 0.06), 0.05, r);
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.22, 1.1, 0.5), -3);
}

function comboBreak(r: Rng): Pcm {
  const p = mono(0.75);
  const o = p.ch[0];
  const tone = (start: number, midi: number, dur: number) => {
    const f = midiToHz(midi);
    addTone(o, start, dur, (t) => f * Math.pow(2, (-0.3 * smoothstep(dur * 0.5, dur, t)) / 12), [1, 0, 0.12], (t) => envAD(t, 0.006, dur * 0.45), 0.7, r);
  };
  tone(0, 76, 0.22);
  tone(0.17, 72, 0.5);
  const lp = new OnePole().freq(2500);
  for (let i = 0; i < o.length; i++) o[i] = lp.process(o[i]);
  return finish(p);
}

function gateChime(r: Rng): Pcm {
  const p = mono(1.3);
  const o = p.ch[0];
  bellInto(o, 988, BELL_RATIOS, BELL_AMPS, [0.9, 0.6, 0.45, 0.3, 0.2], 0, 0.5, r);
  bellInto(o, 1480, BELL_RATIOS, BELL_AMPS, [0.7, 0.45, 0.3, 0.2, 0.15], Math.round(0.04 * SR), 0.28, r);
  addNoise(o, r, 0, 0.8, 'white', { type: 'bp', f0: 7000, q: 0.7 }, (t) => envAD(t, 0.03, 0.22), 0.14);
  fadeEdges(p, 0.001, 0.1);
  return normalizePeak(bakeReverb(p, 0.4, 1.8, 0.9), -3);
}

function gateMiss(r: Rng): Pcm {
  const p = mono(0.4);
  addTone(p.ch[0], 0, 0.4, (t) => expMap(233, 196, clamp(t / 0.25, 0, 1)), [1, 0.2], (t) => envAD(t, 0.006, 0.09), 0.8, r);
  return finish(p);
}

function thermalHum(r: Rng): Pcm {
  // 4 s loop; tonal partials complete integer cycles in 4 s so the loop is phase-continuous.
  const sec = 4;
  const p = seamless(sec, 0.5, (o) => {
    const n = new Noise(r);
    const lp = new Biquad().lowpass(150, 0.7);
    for (let i = 0; i < o.length; i++) o[i] = lp.process(n.brown()) * 0.35;
  });
  const o = p.ch[0];
  const parts: [number, number][] = [
    [55, 0.5],
    [82.5, 0.28],
    [110.25, 0.2],
    [165, 0.06],
  ];
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, a] of parts) v += a * fsin(TAU * f * t);
    o[i] += v * (0.85 + 0.15 * fsin(TAU * 0.5 * t));
  }
  return normalizePeak(p, -3);
}

function burner(r: Rng, far: boolean): Pcm {
  const dur = far ? 2.2 : 1.4;
  const p = mono(dur);
  const o = p.ch[0];
  const n = new Noise(r);
  const lp1 = new Biquad().lowpass(far ? 480 : 1100, 0.6);
  const lp2 = new Biquad().lowpass(far ? 480 : 1100, 0.6);
  const hp = new Biquad().highpass(2800, 0.7);
  const flick = new OnePole().freq(32);
  const att = far ? 0.2 : 0.06;
  const sus = far ? 1.3 : 0.85;
  const rel = far ? 0.7 : 0.45;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const e = t < att ? Math.pow(t / att, 1.5) : t < sus ? 1 : Math.max(0, 1 - (t - sus) / rel);
    const am = 0.75 + clamp(flick.process(n.white()) * 5, -0.35, 0.35);
    const roar = lp2.process(lp1.process(0.6 * n.brown() + 0.6 * n.pink()));
    const hiss = far ? 0 : hp.process(n.pink()) * 0.12;
    o[i] += (roar * am + hiss) * e;
  }
  sine(o, 0, 0.3, 64, 48, (t) => envAD(t, far ? 0.08 : 0.02, 0.1), far ? 0.15 : 0.3);
  if (far) {
    fadeEdges(p, 0.002, 0.08);
    return normalizePeak(bakeReverb(p, 0.5, 2.0, 1.0, 0.6), -3);
  }
  return finish(p, 0.002, 0.06);
}

function warmChime(r: Rng): Pcm {
  const p = mono(1.2);
  const o = p.ch[0];
  const notes = [74, 78, 81];
  notes.forEach((m, k) => bellInto(o, midiToHz(m), [1, 2, 3, 4.2], [1, 0.3, 0.12, 0.05], [0.8, 0.5, 0.3, 0.2], Math.round(k * 0.06 * SR), 0.45, r));
  fadeEdges(p, 0.001, 0.1);
  return normalizePeak(bakeReverb(p, 0.35, 1.6, 0.8), -3);
}

function parachutePat(r: Rng): Pcm {
  const p = mono(0.45);
  const o = p.ch[0];
  addNoise(o, r, 0, 0.2, 'white', { type: 'hp', f0: 300, q: 0.7 }, (t) => envAD(t, 0.001, 0.028), 1.0);
  addNoise(o, r, 0.07, 0.2, 'white', { type: 'bp', f0: 1200, q: 0.8 }, (t) => envAD(t, 0.001, 0.025), 0.55);
  addNoise(o, r, 0.13, 0.2, 'white', { type: 'bp', f0: 900, q: 0.8 }, (t) => envAD(t, 0.001, 0.02), 0.3);
  sine(o, 0, 0.25, 96, 62, (t) => envAD(t, 0.002, 0.06), 0.65);
  return finish(p);
}

function silkRustle(r: Rng): Pcm {
  const p = mono(1.0);
  const o = p.ch[0];
  addGrains(o, r, 0, 0.9, (t) => 90 * Math.exp(-t / 0.5) + 20, 0.005, 0.02, 2500, 8000, 0.8, (t) => (t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) / 0.35)), 0.9);
  addNoise(o, r, 0, 0.6, 'pink', { type: 'bp', f0: 600, q: 0.7 }, (t) => bump(t, 0.6), 0.4);
  return finish(p);
}

function landThud(r: Rng): Pcm {
  const p = mono(0.7);
  const o = p.ch[0];
  sine(o, 0, 0.6, 66, 42, (t) => envAD(t, 0.003, 0.17), 0.9);
  addNoise(o, r, 0, 0.3, 'pink', { type: 'lp', f0: 500, q: 0.7 }, (t) => envAD(t, 0.002, 0.06), 0.8);
  addNoise(o, r, 0, 0.4, 'white', { type: 'hp', f0: 3000, q: 0.7 }, (t) => envAD(t, 0.01, 0.13), 0.12);
  return finish(p);
}

function landSoft(r: Rng): Pcm {
  const p = mono(0.8);
  const o = p.ch[0];
  addNoise(o, r, 0, 0.45, 'pink', { type: 'bp', f0: 2500, q: 0.6 }, (t) => bump(t, 0.4), 0.7);
  sine(o, 0.12, 0.4, 82, 58, (t) => envAD(t, 0.004, 0.1), 0.45);
  return finish(p);
}

function starTok(r: Rng): Pcm {
  const p = mono(0.6);
  const o = p.ch[0];
  sine(o, 0, 0.5, 192, 148, (t) => envAD(t, 0.001, 0.09), 1.0);
  sine(o, 0, 0.3, 515, 480, (t) => envAD(t, 0.001, 0.045), 0.35);
  sine(o, 0, 0.5, 56, 46, (t) => envAD(t, 0.003, 0.12), 0.55);
  addNoise(o, r, 0, 0.05, 'white', { type: 'bp', f0: 2200, q: 2 }, (t) => envAD(t, 0.0005, 0.006), 0.6);
  fadeEdges(p, 0.0005, 0.04);
  return normalizePeak(bakeReverb(p, 0.12, 0.6, 0.25), -3);
}

function crashVumf(r: Rng): Pcm {
  const p = mono(1.2);
  const o = p.ch[0];
  addNoise(o, r, 0, 1.2, 'brown', { type: 'lp', f0: 230, q: 0.7 }, (t) => envAD(t, 0.015, 0.25), 1.0, true);
  sine(o, 0, 1.0, 50, 38, (t) => envAD(t, 0.006, 0.28), 0.8);
  addNoise(o, r, 0.02, 0.4, 'pink', { type: 'bp', f0: 520, q: 0.8 }, (t) => envAD(t, 0.01, 0.1), 0.35);
  return finish(p, 0.002, 0.1);
}

function bounceScrape(r: Rng): Pcm {
  const p = mono(0.7);
  const o = p.ch[0];
  addGrains(o, r, 0, 0.45, () => 420, 0.002, 0.008, 900, 3500, 1.0, (t) => envAD(t, 0.005, 0.15), 1.0);
  addNoise(o, r, 0, 0.5, 'white', { type: 'bp', f0: 1600, q: 0.9 }, (t) => envAD(t, 0.004, 0.12), 0.4);
  sine(o, 0, 0.2, 92, 64, (t) => envAD(t, 0.002, 0.05), 0.5);
  return finish(p);
}

function bounceWater(r: Rng): Pcm {
  const p = mono(0.8);
  const o = p.ch[0];
  const n = new Noise(r);
  const hp = new Biquad().highpass(1500, 0.7);
  const bub = new OnePole().freq(20);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const am = clamp(0.6 + 4 * bub.process(n.white()), 0, 1.6);
    o[i] += hp.process(n.white()) * envAD(t, 0.003, 0.2) * am * 0.8;
  }
  sine(o, 0, 0.2, 180, 90, (t) => envAD(t, 0.002, 0.05), 0.5);
  return finish(p);
}

function landingCue(r: Rng): Pcm {
  const p = mono(0.9);
  const o = p.ch[0];
  addTone(o, 0, 0.6, () => midiToHz(81), [1, 0.15], (t) => envAD(t, 0.02, 0.18), 0.5, r);
  addTone(o, 0.14, 0.7, () => midiToHz(86), [1, 0.15], (t) => envAD(t, 0.02, 0.25), 0.55, r);
  addNoise(o, r, 0, 0.6, 'white', { type: 'bp', f0: 5000, q: 0.8 }, (t) => bump(t, 0.6), 0.06);
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.3, 1.4, 0.6), -3);
}

function collisionBeep(r: Rng): Pcm {
  const p = mono(0.3);
  const o = p.ch[0];
  for (const s of [0, 0.11]) addTone(o, s, 0.08, () => 1180, [1, 0, 0.1], (t) => (t < 0.005 ? t / 0.005 : t > 0.065 ? Math.max(0, 1 - (t - 0.065) / 0.01) : 1), 0.6, r);
  return finish(p);
}

function halfFlight(r: Rng): Pcm {
  const p = mono(1.0);
  addTone(p.ch[0], 0, 1.0, (t) => expMap(660, 440, clamp(t / 0.7, 0, 1)) * (1 + 0.006 * fsin(TAU * 5 * t)), [1, 0.2, 0.05], (t) => envAD(t, 0.03, 0.32), 0.7, r);
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.3, 1.5, 0.6), -3);
}

// ---------------------------------------------------------------------------------------------
// UI

function uiTap(r: Rng): Pcm {
  const p = mono(0.09);
  const o = p.ch[0];
  addTone(o, 0, 0.09, () => 1500, [1, 0.2], (t) => envAD(t, 0.0008, 0.016), 0.8, r);
  addNoise(o, r, 0, 0.01, 'white', { type: 'hp', f0: 2000, q: 0.7 }, (t) => envAD(t, 0.0003, 0.0015), 0.3);
  return finish(p, 0.0005, 0.01);
}

function uiSwish(r: Rng): Pcm {
  const p = mono(0.3);
  addNoise(p.ch[0], r, 0, 0.28, 'white', { type: 'bp', f0: 700, f1: 3200, q: 1.2 }, (t) => bump(t, 0.26), 1.0);
  return finish(p);
}

function twoNotes(r: Rng, a: number, b: number, gap: number, dec: number, sec: number): Pcm {
  const p = mono(sec);
  const o = p.ch[0];
  addTone(o, 0, sec, () => midiToHz(a), [1, 0.3, 0.08], (t) => envAD(t, 0.002, dec), 0.6, r);
  addTone(o, gap, sec - gap, () => midiToHz(b), [1, 0.3, 0.08], (t) => envAD(t, 0.002, dec * 1.3), 0.6, r);
  return finish(p);
}

function uiToggle(r: Rng): Pcm {
  const p = mono(0.08);
  addTone(p.ch[0], 0, 0.08, () => 1100, [1, 0.15], (t) => envAD(t, 0.0008, 0.012), 0.8, r);
  return finish(p, 0.0005, 0.01);
}

function tallyTick(r: Rng): Pcm {
  const p = mono(0.07);
  const o = p.ch[0];
  addTone(o, 0, 0.07, () => 2400, [1, 0.1], (t) => envAD(t, 0.0006, 0.01), 0.7, r);
  addNoise(o, r, 0, 0.006, 'white', { type: 'hp', f0: 4000, q: 0.7 }, (t) => envAD(t, 0.0002, 0.001), 0.2);
  return finish(p, 0.0003, 0.01);
}

function tallyEnd(r: Rng): Pcm {
  const p = mono(0.8);
  bellInto(p.ch[0], midiToHz(88), BELL_RATIOS, BELL_AMPS, [0.5, 0.35, 0.25, 0.15, 0.1], 0, 0.6, r);
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.3, 1.2, 0.5), -3);
}

function reward(r: Rng): Pcm {
  const p = mono(1.0);
  [84, 88, 91, 96].forEach((m, k) => bellInto(p.ch[0], midiToHz(m), BELL_RATIOS, BELL_AMPS, [0.5, 0.3, 0.2, 0.12, 0.08], Math.round(k * 0.055 * SR), 0.4, r));
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.35, 1.4, 0.7), -3);
}

function photoShutter(r: Rng): Pcm {
  const p = mono(0.2);
  const o = p.ch[0];
  addNoise(o, r, 0, 0.03, 'white', { type: 'bp', f0: 3200, q: 1.5 }, (t) => envAD(t, 0.0003, 0.004), 1.0);
  addNoise(o, r, 0.06, 0.04, 'white', { type: 'bp', f0: 1800, q: 1.5 }, (t) => envAD(t, 0.0003, 0.006), 0.8);
  return finish(p, 0.0002, 0.02);
}

// ---------------------------------------------------------------------------------------------
// SÜRÜ.io & ambience

/** "Thousand wings": pink noise × periodic wingbeat AM + sparse individual flaps (seamless 4 s). */
function murmur(r: Rng): Pcm {
  const sec = 4;
  const p = seamless(sec, 0.6, (o) => {
    const n = new Noise(r);
    const bp = new Biquad().bandpass(1100, 0.55);
    for (let i = 0; i < o.length; i++) o[i] = bp.process(n.pink());
  });
  const o = p.ch[0];
  // AM with frequencies k/4 Hz -> periodic over the loop.
  const fq = [7.25, 8.5, 9.75, 11, 12.5, 14.25];
  const ph = fq.map(() => r.next() * TAU);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    let am = 0;
    for (let k = 0; k < fq.length; k++) am += fsin(TAU * fq[k] * t + ph[k]);
    o[i] *= 1 + 0.12 * am;
  }
  const flaps = makePcm(sec, 1);
  addGrains(flaps.ch[0], r, 0, sec - 0.02, () => 45, 0.008, 0.016, 1200, 2600, 1.4, () => 1, 0.9);
  for (let i = 0; i < o.length; i++) o[i] += flaps.ch[0][i] * 0.5;
  return normalizePeak(p, -3);
}

function joinFlutter(r: Rng): Pcm {
  const p = mono(0.7);
  addGrains(p.ch[0], r, 0, 0.6, (t) => 260 * Math.exp(-t / 0.18) + 10, 0.006, 0.014, 900, 2600, 1.2, (t) => envAD(t, 0.01, 0.2), 1.0);
  return finish(p);
}

function convertTicks(r: Rng): Pcm {
  const p = makePcm(0.75, 2);
  const N = 10;
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const t0 = 0.5 * (1 - Math.pow(1 - u, 1.6));
    const f = expMap(1800, 3300, u);
    const pan = r.bi() * 0.7;
    const a = ((pan + 1) * Math.PI) / 4;
    const tmp = makePcm(0.06, 1);
    addTone(tmp.ch[0], 0, 0.06, () => f, [1, 0.15], (t) => envAD(t, 0.0006, 0.009), 0.7 - 0.2 * u, r);
    const s0 = Math.round(t0 * SR);
    for (let i = 0; i < tmp.ch[0].length && s0 + i < p.ch[0].length; i++) {
      p.ch[0][s0 + i] += tmp.ch[0][i] * Math.cos(a);
      p.ch[1][s0 + i] += tmp.ch[0][i] * fsin(a);
    }
  }
  return finish(p, 0.0005, 0.02);
}

function kusatmaRise(r: Rng): Pcm {
  const p = mono(1.7);
  const o = p.ch[0];
  addNoise(o, r, 0, 1.7, 'pink', { type: 'bp', f0: 380, f1: 3000, q: 0.8, curve: (u) => Math.pow(u, 1.3) }, (t) => {
    const u = t / 1.7;
    return Math.pow(smoothstep(0, 0.88, u), 1.6) * (1 - smoothstep(0.9, 1, u));
  }, 1.0, true);
  addGrains(o, r, 0, 1.6, (t) => 60 + 500 * t, 0.006, 0.014, 900, 3200, 1.2, (t) => Math.pow(t / 1.6, 1.5), 0.6);
  return finish(p, 0.01, 0.05);
}

function kusatmaChord(r: Rng): Pcm {
  const p = mono(2.2);
  const o = p.ch[0];
  sine(o, 0, 0.9, 78, 54, (t) => envAD(t, 0.002, 0.25), 0.9);
  addNoise(o, r, 0, 0.12, 'pink', { type: 'bp', f0: 800, q: 0.9 }, (t) => envAD(t, 0.001, 0.025), 0.6);
  const chord = [50, 57, 62, 66, 69, 74];
  chord.forEach((m, k) => {
    const tmp = new Float32Array(Math.round(2.0 * SR));
    karplus(tmp, midiToHz(m), { decay: 2.4, bright: 0.65, damp: 0.3, pick: 0.18 }, r);
    const s0 = Math.round(k * 0.009 * SR);
    for (let i = 0; i < tmp.length && s0 + i < o.length; i++) o[s0 + i] += tmp[i] * 0.32;
  });
  bellInto(o, midiToHz(86), BELL_RATIOS, BELL_AMPS, [1.0, 0.6, 0.4, 0.25, 0.15], 0, 0.18, r);
  fadeEdges(p, 0.0005, 0.15);
  return normalizePeak(bakeReverb(p, 0.35, 2.2, 1.2), -3);
}

function hawkWhistle(r: Rng): Pcm {
  const p = mono(1.0);
  const o = p.ch[0];
  const fc = (t: number) => {
    const base = t < 0.1 ? expMap(2900, 3200, t / 0.1) : expMap(3200, 2100, clamp((t - 0.1) / 0.7, 0, 1));
    return base * (1 + 0.018 * fsin(TAU * 24 * t));
  };
  const env: Env = (t) => (t < 0.03 ? t / 0.03 : t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35));
  addTone(o, 0, 0.95, fc, [1, 0.3, 0.1], env, 0.7, r);
  addNoise(o, r, 0, 0.95, 'white', { type: 'bp', f0: 3000, f1: 2100, q: 3 }, env, 0.25);
  fadeEdges(p, 0.001, 0.05);
  return normalizePeak(bakeReverb(p, 0.25, 1.4, 0.5), -3);
}

function gustWhoosh(r: Rng): Pcm {
  const p = mono(2.2);
  addNoise(p.ch[0], r, 0, 2.2, 'pink', { type: 'bp', f0: 300, f1: 1600, q: 0.8, curve: (u) => (u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3 * 0.6) }, (t) => {
    const u = t / 2.2;
    return Math.pow(smoothstep(0, 0.7, u), 1.5) * (1 - smoothstep(0.75, 1, u));
  }, 1.0, true);
  return finish(p, 0.01, 0.05);
}

function storm(r: Rng): Pcm {
  const sec = 6;
  const p = seamless(sec, 0.8, (o) => {
    const n = new Noise(r);
    const lp = new Biquad().lowpass(120, 0.7);
    const lp2 = new Biquad().lowpass(120, 0.7);
    const hp = new Biquad().highpass(2000, 0.7);
    const lpr = new Biquad().lowpass(9000, 0.7);
    for (let i = 0; i < o.length; i++) {
      const rumble = lp2.process(lp.process(n.brown())) * 1.6;
      const rain = lpr.process(hp.process(n.white())) * 0.22;
      o[i] = rumble + rain;
    }
    addGrains(o, r, 0, o.length / SR - 0.02, () => 150, 0.001, 0.004, 3000, 6500, 1.2, () => 1, 0.35);
  });
  const o = p.ch[0];
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] *= 0.8 + 0.2 * fsin(TAU * 0.5 * t) * fsin((TAU * t) / 6);
  }
  return normalizePeak(p, -3);
}

function rain(r: Rng): Pcm {
  return normalizePeak(
    seamless(4, 0.6, (o) => {
      const n = new Noise(r);
      const hp = new Biquad().highpass(1800, 0.7);
      const lp = new Biquad().lowpass(8000, 0.7);
      for (let i = 0; i < o.length; i++) o[i] = lp.process(hp.process(n.white())) * 0.3;
      addGrains(o, r, 0, o.length / SR - 0.02, () => 220, 0.0008, 0.003, 2500, 7000, 1.3, () => 1, 0.5);
    }),
    -3,
  );
}

function thunder(r: Rng): Pcm {
  const p = mono(3.5);
  const o = p.ch[0];
  const n = new Noise(r);
  const lp = new Biquad().lowpass(180, 0.7);
  const lp2 = new Biquad().lowpass(180, 0.7);
  const am = new OnePole().freq(3);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const e = (t < 0.25 ? Math.pow(t / 0.25, 2) : Math.exp(-(t - 0.25) / 0.9)) * clamp(0.6 + 4 * am.process(n.white()), 0.2, 1.4);
    o[i] = lp2.process(lp.process(n.brown())) * e;
  }
  return finish(p, 0.01, 0.2);
}

function sunsetBell(r: Rng): Pcm {
  const p = mono(3.5);
  bellInto(p.ch[0], 196, [0.5, 1, 1.19, 1.5, 2, 2.5, 3, 4.2], [0.5, 1, 0.45, 0.3, 0.55, 0.2, 0.15, 0.08], [3.0, 2.4, 1.6, 1.2, 1.4, 0.8, 0.6, 0.4], 0, 0.5, r);
  fadeEdges(p, 0.001, 0.3);
  return normalizePeak(bakeReverb(p, 0.3, 3.0, 1.5), -3);
}

function gull(r: Rng, variant: 1 | 2): Pcm {
  const p = mono(0.9);
  const o = p.ch[0];
  const call = (start: number, len: number, f0: number, fPeak: number, fEnd: number) => {
    addTone(o, start, len, (t) => {
      const u = t / len;
      const f = u < 0.15 ? expMap(f0, fPeak, u / 0.15) : expMap(fPeak, fEnd, (u - 0.15) / 0.85);
      return f * (1 + 0.02 * fsin(TAU * 13 * t));
    }, [1, 0.55, 0.32, 0.18, 0.1], (t) => bump(t, len), 0.4, r);
    addNoise(o, r, start, len, 'white', { type: 'bp', f0: fPeak * 1.5, q: 2 }, (t) => bump(t, len), 0.06);
  };
  if (variant === 1) call(0, 0.55, 1250, 1850, 1050);
  else {
    call(0, 0.2, 1400, 1700, 1250);
    call(0.27, 0.22, 1400, 1750, 1200);
  }
  const lp = new OnePole().freq(3500);
  for (let i = 0; i < o.length; i++) o[i] = lp.process(o[i]);
  return finish(p, 0.001, 0.05);
}

/** Sea: two swelling waves per 12 s loop over a constant wash. */
function waves(r: Rng): Pcm {
  const sec = 12;
  const p = makePcm(sec + 1, 1);
  const o = p.ch[0];
  const n = new Noise(r);
  const bq = new Biquad();
  const wash = new Biquad().lowpass(500, 0.7);
  const swell = (t: number) => {
    // two wave events at 1.5 s and 7.5 s (periodic in 12 s)
    const ph = ((t % 6) + 6) % 6;
    return ph < 1.8 ? Math.pow(ph / 1.8, 2) : Math.exp(-(ph - 1.8) / 1.4);
  };
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    if ((i & 31) === 0) bq.lowpass(expMap(300, 2600, clamp(swell(t), 0, 1)), 0.6);
    const s = swell(t);
    o[i] = bq.process(0.6 * n.pink() + 0.5 * n.brown()) * (0.25 + 0.9 * s) + wash.process(n.brown()) * 0.25;
  }
  return normalizePeak(makeSeamless(p, 1), -3);
}

function trickle(r: Rng): Pcm {
  return normalizePeak(
    seamless(4, 0.5, (o) => {
      const n = new Noise(r);
      const hp = new Biquad().highpass(3000, 0.7);
      for (let i = 0; i < o.length; i++) o[i] = hp.process(n.white()) * 0.05;
      // Bubbles: short rising sine chirps.
      let t = 0;
      const dur = o.length / SR - 0.05;
      while (t < dur) {
        t += -Math.log(1 - r.next() * 0.999) / 26;
        if (t >= dur) break;
        const f0 = r.range(450, 1300);
        const len = r.range(0.012, 0.04);
        const s0 = Math.round(t * SR);
        const a = r.range(0.2, 0.6);
        let ph = 0;
        for (let i = 0; i < Math.round(len * SR) && s0 + i < o.length; i++) {
          const tt = i / SR;
          const f = f0 * (1 + (2.2 * tt) / len);
          o[s0 + i] += fsin(ph) * Math.exp(-tt / (len * 0.4)) * a;
          ph += (TAU * f) / SR;
        }
      }
    }),
    -3,
  );
}

function roundEnd(r: Rng): Pcm {
  const p = mono(2.2);
  const o = p.ch[0];
  [53, 57, 60, 65, 69].forEach((m, k) => {
    bellInto(o, midiToHz(m), [1, 2, 3], [1, 0.3, 0.1], [0.9, 0.5, 0.3], Math.round(k * 0.03 * SR), 0.3, r);
  });
  // Slow swell over the struck chord.
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    o[i] *= t < 0.3 ? 0.55 + 0.45 * (t / 0.3) : 1;
  }
  bellInto(o, midiToHz(84), BELL_RATIOS, BELL_AMPS, [0.8, 0.5, 0.35, 0.2, 0.12], Math.round(0.05 * SR), 0.2, r);
  fadeEdges(p, 0.002, 0.2);
  return normalizePeak(bakeReverb(p, 0.35, 2.2, 1.0), -3);
}

function eliminated(r: Rng): Pcm {
  const p = mono(1.0);
  const o = p.ch[0];
  addTone(o, 0, 0.5, () => midiToHz(62), [1, 0.15], (t) => envAD(t, 0.01, 0.15), 0.6, r);
  addTone(o, 0.2, 0.8, () => midiToHz(57), [1, 0.15], (t) => envAD(t, 0.01, 0.3), 0.6, r);
  const lp = new OnePole().freq(1800);
  for (let i = 0; i < o.length; i++) o[i] = lp.process(o[i]);
  return finish(p, 0.001, 0.05);
}

function breathEmpty(r: Rng): Pcm {
  const p = mono(0.5);
  addNoise(p.ch[0], r, 0, 0.5, 'pink', { type: 'bp', f0: 1000, f1: 450, q: 0.9 }, (t) => bump(t, 0.48), 1.0);
  return finish(p);
}

// ---------------------------------------------------------------------------------------------
// Table

export const SFX: Readonly<Record<SfxId, SfxDef>> = {
  wingsOpen: { gen: wingsOpen, bus: 'sfx', db: 5, prio: 3 },
  jump: { gen: jump, bus: 'sfx', db: -3, prio: 2 },
  graze: { gen: graze, bus: 'sfx', db: 4, prio: 3 },
  flyRock: { gen: (r) => flyBy(r, 'rock'), bus: 'amb', db: 3, prio: 2 },
  flyTree: { gen: (r) => flyBy(r, 'tree'), bus: 'amb', db: 2, prio: 2 },
  flyWater: { gen: (r) => flyBy(r, 'water'), bus: 'amb', db: 2, prio: 2 },
  mult1: { gen: (r) => multTone(r, 72), bus: 'sfx', db: -4, prio: 2 },
  mult2: { gen: (r) => multTone(r, 76), bus: 'sfx', db: -3, prio: 2 },
  mult3: { gen: (r) => multTone(r, 79), bus: 'sfx', db: -3, prio: 2 },
  mult5: { gen: (r) => multTone(r, 84), bus: 'sfx', db: -2, prio: 3 },
  comboBreak: { gen: comboBreak, bus: 'sfx', db: -5, prio: 2 },
  gateChime: { gen: gateChime, bus: 'sfx', db: -2, prio: 3 },
  gateMiss: { gen: gateMiss, bus: 'sfx', db: -9, prio: 1 },
  thermalHum: { gen: (r) => half(thermalHum(r), true), bus: 'amb', db: -9, loop: true, prio: 2 },
  burner: { gen: (r) => burner(r, false), bus: 'sfx', db: 0, prio: 3 },
  burnerFar: { gen: (r) => half(burner(r, true)), bus: 'amb', db: -12, prio: 1 },
  warmChime: { gen: warmChime, bus: 'sfx', db: -4, prio: 3 },
  parachutePat: { gen: parachutePat, bus: 'sfx', db: 6, prio: 3 },
  silkRustle: { gen: silkRustle, bus: 'sfx', db: -4, prio: 2 },
  landThud: { gen: landThud, bus: 'sfx', db: 2, prio: 3 },
  landSoft: { gen: landSoft, bus: 'sfx', db: -2, prio: 3 },
  starTok: { gen: starTok, bus: 'ui', db: 6, prio: 3 },
  crashVumf: { gen: (r) => half(crashVumf(r)), bus: 'sfx', db: 1, prio: 4 },
  bounceScrape: { gen: bounceScrape, bus: 'sfx', db: 3, prio: 3 },
  bounceWater: { gen: bounceWater, bus: 'sfx', db: 1, prio: 3 },
  landingCue: { gen: landingCue, bus: 'sfx', db: -10, prio: 2 },
  collisionBeep: { gen: collisionBeep, bus: 'sfx', db: -6, prio: 3 },
  halfFlight: { gen: halfFlight, bus: 'sfx', db: -7, prio: 2 },
  uiTap: { gen: uiTap, bus: 'ui', db: -7, prio: 1 },
  uiSwish: { gen: uiSwish, bus: 'ui', db: -12, prio: 1 },
  uiConfirm: { gen: (r) => twoNotes(r, 79, 84, 0.07, 0.12, 0.45), bus: 'ui', db: -8, prio: 2 },
  uiBack: { gen: (r) => twoNotes(r, 76, 72, 0.06, 0.09, 0.35), bus: 'ui', db: -10, prio: 2 },
  uiToggle: { gen: uiToggle, bus: 'ui', db: -9, prio: 1 },
  tallyTick: { gen: tallyTick, bus: 'ui', db: -11, prio: 1 },
  tallyEnd: { gen: tallyEnd, bus: 'ui', db: -6, prio: 2 },
  reward: { gen: reward, bus: 'ui', db: -6, prio: 2 },
  photoShutter: { gen: photoShutter, bus: 'ui', db: -5, prio: 2 },
  murmur: { gen: (r) => half(murmur(r), true), bus: 'amb', db: -9, loop: true, prio: 3 },
  joinFlutter: { gen: joinFlutter, bus: 'sfx', db: -6, prio: 1 },
  convertTicks: { gen: convertTicks, bus: 'sfx', db: -7, prio: 2 },
  kusatmaRise: { gen: kusatmaRise, bus: 'sfx', db: -1, prio: 3 },
  kusatmaChord: { gen: (r) => half(kusatmaChord(r)), bus: 'sfx', db: 0, prio: 4 },
  hawkWhistle: { gen: hawkWhistle, bus: 'sfx', db: -10, prio: 3 },
  gustWhoosh: { gen: (r) => half(gustWhoosh(r)), bus: 'amb', db: -3, prio: 2 },
  storm: { gen: (r) => half(storm(r), true), bus: 'amb', db: -12, loop: true, prio: 2 },
  rain: { gen: (r) => half(rain(r), true), bus: 'amb', db: -17, loop: true, prio: 1 },
  thunder: { gen: (r) => half(thunder(r)), bus: 'amb', db: -5, prio: 2 },
  sunsetBell: { gen: (r) => half(sunsetBell(r)), bus: 'sfx', db: -5, prio: 3 },
  gull1: { gen: (r) => gull(r, 1), bus: 'amb', db: -16, prio: 0 },
  gull2: { gen: (r) => gull(r, 2), bus: 'amb', db: -16, prio: 0 },
  waves: { gen: (r) => half(waves(r), true), bus: 'amb', db: -13, loop: true, prio: 1 },
  trickle: { gen: (r) => half(trickle(r), true), bus: 'amb', db: -20, loop: true, prio: 1 },
  roundEnd: { gen: (r) => half(roundEnd(r)), bus: 'sfx', db: -4, prio: 3 },
  eliminated: { gen: eliminated, bus: 'sfx', db: -6, prio: 2 },
  breathEmpty: { gen: breathEmpty, bus: 'sfx', db: -9, prio: 1 },
};

export const SFX_IDS = Object.keys(SFX) as SfxId[];

/** Deterministic per-id seed so every build renders identical clips. */
export function sfxSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function generateSfx(id: SfxId): Pcm {
  return SFX[id].gen(new Rng(sfxSeed(id)));
}

// ---------------------------------------------------------------------------------------------
// Wind / instrument noise sources (not SFX: consumed by the wind engine and instruments)

export type NoiseLoopId = 'pinkLoop' | 'brownLoop' | 'whiteLoop';

export function generateNoiseLoop(id: NoiseLoopId): Pcm {
  const r = new Rng(sfxSeed(id));
  const n = new Noise(r);
  const sec = id === 'whiteLoop' ? 3 : 6;
  const p = seamless(sec, 0.7, (o) => {
    for (let i = 0; i < o.length; i++) o[i] = id === 'pinkLoop' ? n.pink() : id === 'brownLoop' ? n.brown() : n.white() * 0.5;
  });
  // Remove DC (brown noise wanders), halve the rate (wind tops out at 6 kHz), normalize.
  const o = p.ch[0];
  let mean = 0;
  for (let i = 0; i < o.length; i++) mean += o[i];
  mean /= o.length;
  for (let i = 0; i < o.length; i++) o[i] -= mean;
  return half(p, true);
}
