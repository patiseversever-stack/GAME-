// Procedural wind engine (§2.12, §4.G.9). Never silent: the low layer has a floor even at rest.
//   low rumble : brown noise → low-pass (90→350 Hz)                      ┐
//   mid whoosh : 2 × pink noise (offset, panned) → band-pass 400→2500 Hz  ├→ windLP (600→6000 Hz by speed) → out
//   high whistle: pink → narrow band-pass 1.8→5 kHz, gated above ~140 km/h │
//   cloth flutter: pink → band-pass → AM by LFO (rate by speed, depth by |bank rate|) ┘
// Slow "gust" LFOs breathe the mid layer. All updates are AudioParam targets (allocation-free).
import type { BufferCache } from './bank.ts';
import { clamp, expMap, smoothstep } from './dsp.ts';

export interface WindInput {
  speedMs: number;
  bankRate: number;
  canopy: boolean;
  /** 0..1 */
  cloud: number;
}

const VMAX = 70;

export class WindEngine {
  private readonly ctx: BaseAudioContext;
  readonly out: GainNode;
  private readonly srcs: AudioBufferSourceNode[] = [];
  private readonly oscs: OscillatorNode[] = [];
  private readonly lowLP: BiquadFilterNode;
  private readonly lowGain: GainNode;
  private readonly midBPa: BiquadFilterNode;
  private readonly midBPb: BiquadFilterNode;
  private readonly midGain: GainNode;
  private readonly gustDepth: GainNode;
  private readonly whistleBP: BiquadFilterNode;
  private readonly whistleGain: GainNode;
  private readonly whistlePan: StereoPannerNode;
  private readonly flutterBP: BiquadFilterNode;
  private readonly flutterAmp: GainNode;
  private readonly flutterDepth: GainNode;
  private readonly flutterLfo: OscillatorNode;
  private readonly windLP: BiquadFilterNode;
  private lastS = -1;
  private lastBank = -1;
  private lastCanopy = false;
  private lastCloud = -1;

  constructor(ctx: BaseAudioContext, cache: BufferCache, dest: AudioNode) {
    this.ctx = ctx;
    const pink = cache.get('pinkLoop');
    const brown = cache.get('brownLoop');
    const t = ctx.currentTime;
    const loop = (buf: AudioBuffer | null, offset: number): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      if (buf) s.start(t, offset % buf.duration);
      this.srcs.push(s);
      return s;
    };
    const bq = (type: BiquadFilterType, f: number, q: number) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      return n;
    };
    const gain = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };

    this.out = gain(1.45);
    this.windLP = bq('lowpass', 600, 0.5);
    this.windLP.connect(this.out).connect(dest);

    // Low rumble.
    const brownSrc = loop(brown, 0);
    this.lowLP = bq('lowpass', 90, 0.7);
    this.lowGain = gain(0.12);
    brownSrc.connect(this.lowLP).connect(this.lowGain).connect(this.windLP);

    // Mid whoosh: two decorrelated pink sources panned apart for width.
    const pinkA = loop(pink, 0);
    const pinkB = loop(pink, 3.7);
    this.midBPa = bq('bandpass', 400, 0.7);
    this.midBPb = bq('bandpass', 430, 0.7);
    const panA = ctx.createStereoPanner();
    panA.pan.value = -0.35;
    const panB = ctx.createStereoPanner();
    panB.pan.value = 0.35;
    this.midGain = gain(0.03);
    pinkA.connect(this.midBPa).connect(panA).connect(this.midGain);
    pinkB.connect(this.midBPb).connect(panB).connect(this.midGain);
    this.midGain.connect(this.windLP);
    // Gusts: two slow LFOs added onto the mid gain.
    this.gustDepth = gain(0.0);
    for (const f of [0.07, 0.19]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(this.gustDepth);
      o.start(t);
      this.oscs.push(o);
    }
    this.gustDepth.connect(this.midGain.gain);

    // High whistle.
    this.whistleBP = bq('bandpass', 1800, 6);
    this.whistleGain = gain(0);
    this.whistlePan = ctx.createStereoPanner();
    pinkA.connect(this.whistleBP).connect(this.whistleGain).connect(this.whistlePan).connect(this.windLP);

    // Cloth flutter: AM of band-limited noise. flutterAmp.gain = 0.5 + LFO·depth.
    this.flutterBP = bq('bandpass', 380, 1.2);
    this.flutterAmp = gain(0);
    this.flutterDepth = gain(0);
    this.flutterLfo = ctx.createOscillator();
    this.flutterLfo.type = 'triangle';
    this.flutterLfo.frequency.value = 14;
    this.flutterLfo.connect(this.flutterDepth).connect(this.flutterAmp.gain);
    this.flutterLfo.start(t);
    this.oscs.push(this.flutterLfo);
    pinkB.connect(this.flutterBP).connect(this.flutterAmp).connect(this.windLP);
  }

  /** Allocation-free per-frame update (internally rate-limited by change thresholds). */
  update(w: WindInput): void {
    const s = clamp(w.speedMs / VMAX, 0, 1.15);
    const bank = clamp(Math.abs(w.bankRate) / 2.0, 0, 1);
    const cloud = clamp(w.cloud, 0, 1);
    if (Math.abs(s - this.lastS) < 0.004 && Math.abs(bank - this.lastBank) < 0.02 && w.canopy === this.lastCanopy && Math.abs(cloud - this.lastCloud) < 0.02) return;
    this.lastS = s;
    this.lastBank = bank;
    this.lastCanopy = w.canopy;
    this.lastCloud = cloud;
    const t = this.ctx.currentTime;
    const tc = 0.08;
    const sc = Math.min(1, s);

    // Master wind tone: 600 → 6000 Hz (log) by speed; clouds close it further.
    const cut = expMap(600, 6000, sc) * (1 - 0.55 * cloud);
    this.windLP.frequency.setTargetAtTime(cut, t, tc);

    // Low layer with an always-on floor.
    this.lowLP.frequency.setTargetAtTime(90 + 260 * sc, t, tc);
    this.lowGain.gain.setTargetAtTime(0.16 + 0.42 * Math.pow(sc, 1.2), t, tc);

    // Mid whoosh (§4.G.9: centre 400 Hz → 2.5 kHz).
    const fc = expMap(400, 2500, sc);
    this.midBPa.frequency.setTargetAtTime(fc, t, tc);
    this.midBPb.frequency.setTargetAtTime(fc * 1.08, t, tc);
    const canopyK = w.canopy ? 0.55 : 1;
    this.midGain.gain.setTargetAtTime((0.035 + 0.6 * Math.pow(sc, 1.6)) * canopyK, t, tc);
    this.gustDepth.gain.setTargetAtTime(0.012 + 0.06 * sc, t, 0.5);

    // High whistle above ~140 km/h; pans slightly against the turn.
    const wh = smoothstep(0.52, 0.85, s) * (w.canopy ? 0 : 1);
    this.whistleBP.frequency.setTargetAtTime(1800 + 3200 * sc, t, tc);
    this.whistleGain.gain.setTargetAtTime(0.22 * wh, t, tc);
    this.whistlePan.pan.setTargetAtTime(clamp(-w.bankRate * 0.25, -0.5, 0.5), t, 0.15);

    // Cloth flutter: rate by speed, depth by bank rate (+ a bit at very high speed / canopy luffing).
    const rate = w.canopy ? 7 : 12 + 20 * sc;
    this.flutterLfo.frequency.setTargetAtTime(rate, t, 0.1);
    const depth = w.canopy ? 0.12 : (0.28 * smoothstep(0.6, 0.95, s) + 0.75 * bank) * sc;
    this.flutterBP.frequency.setTargetAtTime(w.canopy ? 300 : 320 + 500 * sc, t, tc);
    this.flutterAmp.gain.setTargetAtTime(depth * 0.5, t, tc);
    this.flutterDepth.gain.setTargetAtTime(depth * 0.5, t, tc);
  }

  dispose(): void {
    for (const s of this.srcs) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    for (const o of this.oscs) {
      try {
        o.stop();
      } catch {
        // already stopped
      }
    }
    this.out.disconnect();
  }
}
