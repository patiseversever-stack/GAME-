// Bus graph:
//   music: instruments → [dry | reverb send → Convolver(synth IR)] → musicLP → musicDuck → musicVol ┐
//   amb  : wind, beds, fly-bys → ambLP (cloud muffle) → ambVol(sfx volume) ───────────────────────┤
//   sfx  : one-shots → sfxVol ──────────────────────────────────────────────────────────────────────┤
//   ui   : taps, tallies → uiVol(sfx volume) ───────────────────────────────────────────────────────┤
//   masterIn → masterVol(master × mute) → glue compressor → trim → safety shaper (ceiling) → out
// The WaveShaper ceiling makes it impossible for a sample to exceed −1.3 dBFS (spec: ≤ −1 dBFS).
import { dbToGain, limiterCurve } from './dsp.ts';

export const LIMIT_PRE = 0.5;
export const LIMIT_KNEE_DB = -6;
export const LIMIT_CEILING_DB = -1.3;

/** Static make-up compensation for Web Audio's automatic compressor make-up gain (measured). */
const COMP_TRIM_DB = -3;

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

const TC = 0.05;

export class Mixer {
  readonly ctx: BaseAudioContext;
  readonly masterIn: GainNode;
  readonly musicIn: GainNode;
  readonly verbIn: GainNode;
  readonly ambIn: GainNode;
  readonly sfxIn: GainNode;
  readonly uiIn: GainNode;
  readonly out: AudioNode;

  private readonly musicLP: BiquadFilterNode;
  private readonly musicDuck: GainNode;
  private readonly musicVol: GainNode;
  private readonly ambLP: BiquadFilterNode;
  private readonly ambVol: GainNode;
  private readonly sfxVol: GainNode;
  private readonly uiVol: GainNode;
  private readonly masterVol: GainNode;
  private readonly comp: DynamicsCompressorNode;
  private readonly trim: GainNode;
  private readonly pre: GainNode;
  private readonly shaper: WaveShaperNode;
  private readonly convolver: ConvolverNode;
  private readonly verbOut: GainNode;
  private duckUntil = 0;
  private duckDepth = 0;
  private crashOn = false;

  constructor(ctx: BaseAudioContext, ir: AudioBuffer | null, dest: AudioNode = ctx.destination) {
    this.ctx = ctx;
    const g = (v = 1) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    this.masterIn = g();
    this.musicIn = g();
    this.verbIn = g();
    this.ambIn = g();
    this.sfxIn = g();
    this.uiIn = g();

    this.musicLP = ctx.createBiquadFilter();
    this.musicLP.type = 'lowpass';
    this.musicLP.frequency.value = 20000;
    this.musicLP.Q.value = 0.5;
    this.musicDuck = g();
    this.musicVol = g(0.7);
    this.ambLP = ctx.createBiquadFilter();
    this.ambLP.type = 'lowpass';
    this.ambLP.frequency.value = 20000;
    this.ambLP.Q.value = 0.6;
    this.ambVol = g(0.9);
    this.sfxVol = g(0.9);
    this.uiVol = g(0.9);
    this.masterVol = g(0.9);

    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;
    if (ir) this.convolver.buffer = ir;
    this.verbOut = g(0.55);

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.trim = g(dbToGain(COMP_TRIM_DB));
    this.pre = g(LIMIT_PRE);
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = limiterCurve(4096, LIMIT_PRE, LIMIT_KNEE_DB, LIMIT_CEILING_DB);
    this.shaper.oversample = 'none';

    // music
    this.verbIn.connect(this.convolver).connect(this.verbOut).connect(this.musicLP);
    this.musicIn.connect(this.musicLP);
    this.musicLP.connect(this.musicDuck).connect(this.musicVol).connect(this.masterIn);
    // ambience / sfx / ui
    this.ambIn.connect(this.ambLP).connect(this.ambVol).connect(this.masterIn);
    this.sfxIn.connect(this.sfxVol).connect(this.masterIn);
    this.uiIn.connect(this.uiVol).connect(this.masterIn);
    // master
    this.masterIn.connect(this.masterVol).connect(this.comp).connect(this.trim).connect(this.pre).connect(this.shaper);
    this.shaper.connect(dest);
    this.out = this.shaper;
  }

  setVolumes(v: Volumes): void {
    const t = this.ctx.currentTime;
    const m = v.muted ? 0 : Math.max(0, Math.min(1, v.master));
    // Perceptual taper: slider² keeps the low end of the slider usable.
    this.masterVol.gain.setTargetAtTime(m * m, t, TC);
    const mu = Math.max(0, Math.min(1, v.music));
    const sf = Math.max(0, Math.min(1, v.sfx));
    this.musicVol.gain.setTargetAtTime(mu * mu, t, TC);
    this.sfxVol.gain.setTargetAtTime(sf * sf, t, TC);
    this.uiVol.gain.setTargetAtTime(sf * sf, t, TC);
    // Wind/ambience follows SFX volume but never below a floor (the air is always there).
    this.ambVol.gain.setTargetAtTime(Math.max(0.12, sf * sf), t, TC);
  }

  /** Music ducking for big moments; overlapping ducks keep the deepest one. */
  duck(db: number, hold: number, attack = 0.04, release = 0.6): void {
    const t = this.ctx.currentTime;
    const depth = dbToGain(-Math.abs(db));
    const p = this.musicDuck.gain;
    if (t < this.duckUntil && depth > this.duckDepth) {
      // A deeper duck is already running: just extend it.
      this.duckUntil = Math.max(this.duckUntil, t + hold);
    } else {
      this.duckDepth = depth;
      this.duckUntil = t + hold;
    }
    p.cancelScheduledValues(t);
    p.setTargetAtTime(this.duckDepth, t, attack / 3);
    p.setTargetAtTime(1, this.duckUntil, release / 3);
  }

  /** §2.3 crash: music falls to a 300 Hz low-pass 400 ms after the impact. */
  crashFilter(on: boolean): void {
    if (on === this.crashOn) return;
    this.crashOn = on;
    const t = this.ctx.currentTime;
    const f = this.musicLP.frequency;
    f.cancelScheduledValues(t);
    if (on) {
      f.setValueAtTime(f.value, t);
      f.setTargetAtTime(300, t + 0.4, 0.08);
    } else {
      f.setTargetAtTime(20000, t, 0.25);
    }
  }

  get crashed(): boolean {
    return this.crashOn;
  }

  /** Cloud interior muffling (0..1) on the ambience bus. */
  cloud(k: number): void {
    const t = this.ctx.currentTime;
    const f = 20000 * Math.pow(900 / 20000, Math.max(0, Math.min(1, k)));
    this.ambLP.frequency.setTargetAtTime(f, t, 0.15);
  }

  dispose(): void {
    for (const n of [this.masterIn, this.musicIn, this.verbIn, this.ambIn, this.sfxIn, this.uiIn, this.shaper]) n.disconnect();
  }
}
