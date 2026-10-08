// Real-time instrument rack for one theme player. Shared, per-instrument chains (filters, formants,
// vibrato LFO, pan, reverb send) keep per-note cost to 2–5 nodes.
//   Pads: strings / warmPad / choir (formant bank) / glass — detuned PeriodicWave oscillators.
//   ney: reed-like PeriodicWave + band-passed breath noise; kemence: bowed wave + nasal body EQ.
//   guitar / ud / pluck / bell / bass / drums: pre-rendered PCM (Karplus-Strong, additive) transposed.
import type { BufferCache } from '../bank.ts';
import { drumKey, instKey } from '../bank.ts';
import { midiToHz } from '../scales.ts';
import { nearestRef } from './pcm.ts';
import type { PcmInst } from './pcm.ts';
import type { InstId } from './patterns.ts';

type WaveId = 'soft' | 'reed' | 'bowed' | 'choir' | 'glass';

const WAVES: Record<WaveId, (n: number) => number> = {
  soft: (n) => 1 / Math.pow(n, 1.45),
  reed: (n) => [1, 0.32, 0.14, 0.07, 0.035, 0.02][n - 1] ?? 0,
  bowed: (n) => (n % 2 ? 1.15 : 1) / Math.pow(n, 0.95),
  choir: (n) => 1 / Math.pow(n, 1.1),
  glass: (n) => [1, 0, 0.12, 0, 0.05][n - 1] ?? 0,
};

const WAVE_HARMONICS = 24;

/** PeriodicWaves are per-context; cache them on the context object via a WeakMap. */
const waveCache = new WeakMap<BaseAudioContext, Map<WaveId, PeriodicWave>>();

function wave(ctx: BaseAudioContext, id: WaveId): PeriodicWave {
  let m = waveCache.get(ctx);
  if (!m) {
    m = new Map();
    waveCache.set(ctx, m);
  }
  let w = m.get(id);
  if (!w) {
    const real = new Float32Array(WAVE_HARMONICS + 1);
    const imag = new Float32Array(WAVE_HARMONICS + 1);
    for (let n = 1; n <= WAVE_HARMONICS; n++) imag[n] = WAVES[id](n);
    w = ctx.createPeriodicWave(real, imag);
    m.set(id, w);
  }
  return w;
}

interface Chain {
  input: GainNode;
  vib: GainNode | null;
}

interface ChainSpec {
  gain: number;
  wet: number;
  pan: number;
  build: (ctx: BaseAudioContext, input: GainNode) => AudioNode;
  vibrato?: [number, number]; // Hz, cents
}

const bq = (ctx: BaseAudioContext, type: BiquadFilterType, f: number, q: number, g = 0): BiquadFilterNode => {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  n.gain.value = g;
  return n;
};

const SPECS: Record<InstId, ChainSpec> = {
  strings: { gain: 0.22, wet: 0.5, pan: 0, build: (c, i) => i.connect(bq(c, 'lowpass', 2300, 0.5)) },
  warmPad: { gain: 0.26, wet: 0.55, pan: 0, build: (c, i) => i.connect(bq(c, 'lowpass', 1300, 0.5)) },
  choir: {
    gain: 0.6,
    wet: 0.6,
    pan: 0,
    build: (c, i) => {
      // Parallel vowel formants ("aa"/"oh" blend).
      const sum = c.createGain();
      for (const [f, q, g] of [
        [700, 5, 1],
        [1150, 6, 0.6],
        [2700, 8, 0.25],
      ] as const) {
        const b = bq(c, 'bandpass', f, q);
        const gg = c.createGain();
        gg.gain.value = g;
        i.connect(b).connect(gg).connect(sum);
      }
      return sum;
    },
  },
  glass: { gain: 0.2, wet: 0.75, pan: 0, build: (c, i) => i.connect(bq(c, 'lowpass', 5000, 0.5)) },
  ney: { gain: 0.3, wet: 0.55, pan: 0.12, build: (c, i) => i.connect(bq(c, 'lowpass', 5200, 0.6)), vibrato: [5.2, 11] },
  kemence: {
    gain: 0.2,
    wet: 0.35,
    pan: -0.1,
    build: (c, i) => i.connect(bq(c, 'peaking', 760, 1.4, 5)).connect(bq(c, 'peaking', 2100, 2, 4)).connect(bq(c, 'lowpass', 4300, 0.7)),
    vibrato: [6.2, 16],
  },
  guitar: { gain: 0.5, wet: 0.3, pan: -0.22, build: (c, i) => i },
  ud: { gain: 0.55, wet: 0.3, pan: 0.18, build: (c, i) => i },
  pluck: { gain: 0.45, wet: 0.45, pan: -0.1, build: (c, i) => i },
  bell: { gain: 0.32, wet: 0.5, pan: 0.15, build: (c, i) => i },
  bass: { gain: 0.5, wet: 0.08, pan: 0, build: (c, i) => i.connect(bq(c, 'lowpass', 900, 0.7)) },
  drums: { gain: 0.55, wet: 0.16, pan: 0, build: (c, i) => i },
};

const PCM_SET = new Set<InstId>(['guitar', 'ud', 'pluck', 'bell', 'bass']);

const DRUM_PAN: Record<string, number> = { S: 0.35, J: -0.3, W: 0.25, T: 0.12, K: -0.1 };

export class Rack {
  private readonly ctx: BaseAudioContext;
  private readonly cache: BufferCache;
  private readonly dry: AudioNode;
  private readonly wet: AudioNode;
  private readonly chains = new Map<InstId, Chain>();
  private readonly lfos: OscillatorNode[] = [];
  private readonly nodes: AudioNode[] = [];
  /** Live voice count (diagnostics / CPU guard). */
  voices = 0;
  maxVoices = 28;

  constructor(ctx: BaseAudioContext, cache: BufferCache, dry: AudioNode, wet: AudioNode) {
    this.ctx = ctx;
    this.cache = cache;
    this.dry = dry;
    this.wet = wet;
  }

  private chain(inst: InstId): Chain {
    const hit = this.chains.get(inst);
    if (hit) return hit;
    const spec = SPECS[inst];
    const ctx = this.ctx;
    const input = ctx.createGain();
    input.gain.value = spec.gain;
    const tail = spec.build(ctx, input);
    const pan = ctx.createStereoPanner();
    pan.pan.value = spec.pan;
    tail.connect(pan);
    pan.connect(this.dry);
    const send = ctx.createGain();
    send.gain.value = spec.wet;
    pan.connect(send).connect(this.wet);
    let vib: GainNode | null = null;
    if (spec.vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = spec.vibrato[0];
      vib = ctx.createGain();
      vib.gain.value = spec.vibrato[1];
      lfo.connect(vib);
      lfo.start(ctx.currentTime);
      this.lfos.push(lfo);
    }
    this.nodes.push(input, pan, send);
    const c = { input, vib };
    this.chains.set(inst, c);
    return c;
  }

  private track(node: AudioScheduledSourceNode, extra: AudioNode | null, cleanup?: () => void): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
      node.disconnect();
      if (extra) extra.disconnect();
      if (cleanup) cleanup();
    };
  }

  /** Sustained pad voice (two detuned oscillators, slow swell). */
  pad(inst: InstId, midi: number, t: number, dur: number, vel: number, attack: number, release: number): void {
    if (this.voices >= this.maxVoices) return;
    const ctx = this.ctx;
    const c = this.chain(inst);
    const f = midiToHz(midi);
    const env = ctx.createGain();
    const peak = vel;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + attack);
    env.gain.setValueAtTime(peak, t + Math.max(attack, dur));
    env.gain.setTargetAtTime(0, t + Math.max(attack, dur), release / 3);
    env.connect(c.input);
    const id: WaveId = inst === 'choir' ? 'choir' : inst === 'glass' ? 'glass' : 'soft';
    const stopAt = t + Math.max(attack, dur) + release * 1.6;
    const detunes = inst === 'glass' ? [0, 1200] : [-7, 7];
    let first: OscillatorNode | null = null;
    for (let k = 0; k < detunes.length; k++) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave(ctx, id));
      o.frequency.value = f;
      o.detune.value = detunes[k];
      if (inst === 'glass' && k === 1) {
        const g2 = ctx.createGain();
        g2.gain.value = 0.18;
        o.connect(g2).connect(env);
      } else {
        o.connect(env);
      }
      o.start(t);
      o.stop(stopAt);
      if (!first) first = o;
      else o.onended = () => o.disconnect();
    }
    if (first) this.track(first, env);
  }

  /** Breathy / bowed melodic voice. */
  line(inst: 'ney' | 'kemence', midi: number, t: number, dur: number, vel: number): void {
    if (this.voices >= this.maxVoices) return;
    const ctx = this.ctx;
    const c = this.chain(inst);
    const f = midiToHz(midi);
    const env = ctx.createGain();
    const att = inst === 'ney' ? Math.min(0.09, dur * 0.4) : Math.min(0.05, dur * 0.3);
    const rel = inst === 'ney' ? 0.18 : 0.12;
    const hold = Math.max(att, dur - rel * 0.5);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vel, t + att);
    env.gain.setTargetAtTime(vel * 0.82, t + att, 0.2);
    env.gain.setTargetAtTime(0, t + hold, rel / 3);
    env.connect(c.input);
    const o = ctx.createOscillator();
    o.setPeriodicWave(wave(ctx, inst === 'ney' ? 'reed' : 'bowed'));
    o.frequency.value = f;
    if (c.vib) c.vib.connect(o.detune);
    // Slight scoop into the note (ney/kemençe ornament feel).
    o.detune.setValueAtTime(-35, t);
    o.detune.linearRampToValueAtTime(0, t + Math.min(0.08, dur * 0.3));
    o.connect(env);
    const stopAt = t + hold + rel * 2;
    o.start(t);
    o.stop(stopAt);
    // Breath / bow noise through a band-pass at the pitch.
    const nb = this.cache.get('whiteLoop');
    let src: AudioBufferSourceNode | null = null;
    if (nb) {
      src = ctx.createBufferSource();
      src.buffer = nb;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = inst === 'ney' ? f * 1.0 : 2600;
      bp.Q.value = inst === 'ney' ? 3 : 1;
      const ng = ctx.createGain();
      ng.gain.value = inst === 'ney' ? 0.55 : 0.12;
      src.connect(bp).connect(ng).connect(env);
      src.start(t, (midi * 0.137) % Math.max(0.1, nb.duration - 0.1));
      src.stop(stopAt);
      src.onended = () => src?.disconnect();
    }
    const vib = c.vib;
    this.track(o, env, vib ? () => vib.disconnect(o.detune) : undefined);
  }

  /** Pre-rendered plucked / struck note, transposed from the nearest reference. */
  pcm(inst: PcmInst, midi: number, t: number, dur: number, vel: number): void {
    if (this.voices >= this.maxVoices) return;
    const ref = nearestRef(inst, midi);
    const buf = this.cache.get(instKey(inst, ref));
    if (!buf) return;
    const ctx = this.ctx;
    const c = this.chain(inst);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - ref) / 12);
    const g = ctx.createGain();
    g.gain.value = vel;
    // Let plucks ring a little past their notated length, then damp.
    const ring = inst === 'bell' ? 1.8 : inst === 'bass' ? 0.25 : 0.6;
    const end = t + dur + ring;
    g.gain.setValueAtTime(vel, end);
    g.gain.setTargetAtTime(0, end, 0.08);
    src.connect(g).connect(c.input);
    src.start(t);
    src.stop(end + 0.5);
    this.track(src, g);
  }

  drum(id: string, t: number, vel: number): void {
    if (this.voices >= this.maxVoices + 6) return;
    const buf = this.cache.get(drumKey(id));
    if (!buf) return;
    const ctx = this.ctx;
    const c = this.chain('drums');
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vel;
    const p = ctx.createStereoPanner();
    p.pan.value = DRUM_PAN[id] ?? 0;
    src.connect(g).connect(p).connect(c.input);
    src.start(t);
    this.voices++;
    src.onended = () => {
      this.voices--;
      src.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }

  isPcm(inst: InstId): inst is PcmInst {
    return PCM_SET.has(inst);
  }

  dispose(): void {
    for (const l of this.lfos) {
      try {
        l.stop();
      } catch {
        // already stopped
      }
    }
    for (const n of this.nodes) n.disconnect();
    this.chains.clear();
  }
}
