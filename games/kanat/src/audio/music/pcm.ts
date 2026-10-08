// Pre-rendered music sources: Karplus-Strong strings (guitar, ud-like, soft pluck, bass), additive
// bells and Anatolian-flavoured percussion (darbuka düm/tek/ka, bendir, davul, tef, shaker, wood).
// Pure; rendered once at load, transposed at runtime with playbackRate (≤ ±6 semitones).
import { Biquad, GEN_SR, Noise, OnePole, TAU, bellInto, decimate2, envAD, fadeEdges, karplus, makePcm, normalizePeak } from '../dsp.ts';
import type { Pcm } from '../dsp.ts';
import { Rng } from '../rng.ts';
import { midiToHz } from '../scales.ts';

const SR = GEN_SR;

export type PcmInst = 'guitar' | 'ud' | 'pluck' | 'bell' | 'bass';
export type DrumId = 'D' | 'T' | 'K' | 'B' | 'V' | 'J' | 'S' | 'W';

/** Reference pitches rendered per instrument (MIDI). Notes use the nearest reference. */
export const PCM_REFS: Readonly<Record<PcmInst, readonly number[]>> = {
  guitar: [45, 57, 69, 81],
  ud: [45, 57, 69, 81],
  pluck: [57, 69, 81],
  bell: [69, 81, 93],
  bass: [33, 45],
};

const PCM_LEN: Readonly<Record<PcmInst, number>> = { guitar: 1.8, ud: 1.5, pluck: 1.4, bell: 2.4, bass: 1.2 };

export function nearestRef(inst: PcmInst, midi: number): number {
  const refs = PCM_REFS[inst];
  let best = refs[0];
  for (const r of refs) if (Math.abs(r - midi) < Math.abs(best - midi)) best = r;
  return best;
}

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function renderInstrument(inst: PcmInst, refMidi: number): Pcm {
  const r = new Rng(seedOf(`${inst}:${refMidi}`));
  const p = makePcm(PCM_LEN[inst], 1);
  const o = p.ch[0];
  const f = midiToHz(refMidi);
  if (inst === 'guitar') {
    karplus(o, f, { decay: 2.2, bright: 0.55, damp: 0.22, pick: 0.13 }, r);
    // Nylon-ish body: gentle low-mid bump, tamed highs.
    const body = new Biquad().peaking(220, 1.2, 3);
    const hs = new Biquad().highshelf(3500, 0.7, -4);
    for (let i = 0; i < o.length; i++) o[i] = hs.process(body.process(o[i]));
  } else if (inst === 'ud') {
    // Darker, plectrum-like attack, short sustain, woody body resonance.
    karplus(o, f, { decay: 1.3, bright: 0.7, damp: 0.38, pick: 0.08 }, r);
    const b1 = new Biquad().peaking(330, 1.5, 4);
    const b2 = new Biquad().peaking(1400, 2, 2.5);
    const lp = new Biquad().lowpass(4200, 0.7);
    const n = new Noise(r);
    for (let i = 0; i < o.length; i++) {
      const pick = i < 240 ? n.white() * (1 - i / 240) * 0.25 : 0;
      o[i] = lp.process(b2.process(b1.process(o[i] + pick)));
    }
  } else if (inst === 'pluck') {
    karplus(o, f, { decay: 1.6, bright: 0.35, damp: 0.45, pick: 0.2 }, r);
  } else if (inst === 'bass') {
    karplus(o, f, { decay: 1.4, bright: 0.25, damp: 0.48, pick: 0.25 }, r);
    const lp = new Biquad().lowpass(700, 0.7);
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      o[i] = lp.process(o[i]) + 0.35 * Math.sin(ph) * envAD(t, 0.004, 0.35);
      if (ph > TAU) ph -= TAU;
      ph += (TAU * f) / SR;
    }
  } else {
    bellInto(o, f, [1, 2.0, 2.76, 4.07, 5.4, 6.8], [1, 0.4, 0.45, 0.2, 0.12, 0.06], [1.6, 0.9, 0.7, 0.45, 0.3, 0.2], 0, 0.6, r);
  }
  fadeEdges(p, 0.0008, 0.08);
  // 24 kHz is plenty for plucked strings / bells transposed ≤ ±6 semitones (halves memory).
  return normalizePeak(decimate2(p), -3);
}

export function renderDrum(id: DrumId): Pcm {
  const r = new Rng(seedOf(`drum:${id}`));
  const n = new Noise(r);
  const len = id === 'V' ? 0.9 : id === 'B' ? 0.7 : id === 'D' ? 0.55 : id === 'J' ? 0.4 : 0.25;
  const p = makePcm(len, 1);
  const o = p.ch[0];
  const tone = (f0: number, f1: number, att: number, dec: number, g: number) => {
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      const f = f1 + (f0 - f1) * Math.exp(-t / 0.03);
      o[i] += Math.sin(ph) * envAD(t, att, dec) * g;
      ph += (TAU * f) / SR;
    }
  };
  const noise = (bq: Biquad | null, att: number, dec: number, g: number) => {
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      const x = bq ? bq.process(n.white()) : n.white();
      o[i] += x * envAD(t, att, dec) * g;
    }
  };
  switch (id) {
    case 'D': // darbuka düm
      tone(150, 88, 0.001, 0.16, 1.0);
      noise(new Biquad().lowpass(900, 0.7), 0.0005, 0.012, 0.35);
      break;
    case 'T': // darbuka tek (rim ring)
      tone(620, 560, 0.0005, 0.05, 0.4);
      noise(new Biquad().bandpass(3200, 1.2), 0.0003, 0.03, 0.9);
      break;
    case 'K': // ka (muted slap)
      noise(new Biquad().bandpass(1600, 1.0), 0.0003, 0.018, 1.0);
      tone(420, 380, 0.0005, 0.02, 0.25);
      break;
    case 'B': // bendir (frame drum with snare buzz)
      tone(82, 56, 0.002, 0.28, 1.0);
      noise(new Biquad().bandpass(650, 0.8), 0.002, 0.14, 0.32);
      break;
    case 'V': // davul (big drum)
      tone(70, 44, 0.002, 0.38, 1.0);
      noise(new Biquad().lowpass(1200, 0.7), 0.0008, 0.02, 0.5);
      break;
    case 'J': { // tef jingles: inharmonic metallic partials
      const parts = [4300, 5600, 6900, 8100, 9400];
      for (const pf of parts) {
        let ph = r.next() * TAU;
        const d = 0.06 + r.next() * 0.08;
        for (let i = 0; i < o.length; i++) {
          o[i] += Math.sin(ph) * envAD(i / SR, 0.001, d) * 0.18;
          ph += (TAU * pf * (1 + 0.002 * Math.sin((TAU * 31 * i) / SR))) / SR;
        }
      }
      noise(new Biquad().highpass(6000, 0.7), 0.001, 0.05, 0.3);
      break;
    }
    case 'S': // shaker
      noise(new Biquad().highpass(5000, 0.7), 0.008, 0.035, 1.0);
      break;
    case 'W': // wood tick
      tone(1250, 1180, 0.0003, 0.025, 1.0);
      break;
  }
  const lp = new OnePole().freq(12000);
  for (let i = 0; i < o.length; i++) o[i] = lp.process(o[i]);
  fadeEdges(p, 0.0002, 0.03);
  return normalizePeak(p, -3);
}

export const DRUM_IDS: readonly DrumId[] = ['D', 'T', 'K', 'B', 'V', 'J', 'S', 'W'];
export const PCM_INSTS: readonly PcmInst[] = ['guitar', 'ud', 'pluck', 'bell', 'bass'];
