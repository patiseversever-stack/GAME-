// Pooled one-shot voices and looping beds. Each pool slot owns a permanent Gain → StereoPanner
// pair connected to its bus; a play only creates the (one-shot by spec) AudioBufferSourceNode.
// Oldest/lowest-priority voice is stolen with a short fade when a pool is full.
import type { BufferCache } from './bank.ts';
import { dbToGain } from './dsp.ts';

interface Slot {
  gain: GainNode;
  pan: StereoPannerNode;
  src: AudioBufferSourceNode | null;
  end: number;
  prio: number;
  start: number;
}

export class VoicePool {
  private readonly ctx: BaseAudioContext;
  private readonly cache: BufferCache;
  private readonly slots: Slot[] = [];
  /** Voices stolen so far (diagnostics). */
  stolen = 0;

  constructor(ctx: BaseAudioContext, cache: BufferCache, dest: AudioNode, size: number) {
    this.ctx = ctx;
    this.cache = cache;
    for (let i = 0; i < size; i++) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const pan = ctx.createStereoPanner();
      gain.connect(pan).connect(dest);
      this.slots.push({ gain, pan, src: null, end: 0, prio: 0, start: 0 });
    }
  }

  private pick(now: number, prio: number): Slot | null {
    let best: Slot | null = null;
    for (const s of this.slots) {
      if (!s.src || now >= s.end) return s;
      // Steal candidates: lower priority first, then the oldest.
      if (s.prio <= prio && (!best || s.prio < best.prio || (s.prio === best.prio && s.start < best.start))) best = s;
    }
    return best;
  }

  /**
   * Play a buffer. `pan` −1..1; `panTo`/`panTime` automate a pan sweep (fly-bys).
   * Returns false when the buffer is missing or no voice could be taken.
   */
  play(key: string, db: number, prio: number, pan = 0, rate = 1, delay = 0, panTo = pan, panTime = 0): boolean {
    const buf = this.cache.get(key);
    if (!buf) return false;
    const now = this.ctx.currentTime;
    const s = this.pick(now, prio);
    if (!s) return false;
    let t = now + Math.max(0, delay);
    if (s.src && now < s.end) {
      // Steal: 8 ms fade then reuse.
      this.stolen++;
      s.gain.gain.cancelScheduledValues(now);
      s.gain.gain.setTargetAtTime(0, now, 0.003);
      try {
        s.src.stop(now + 0.012);
      } catch {
        // already stopped
      }
      t = Math.max(t, now + 0.014);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(s.gain);
    const g = dbToGain(db);
    s.gain.gain.cancelScheduledValues(t);
    s.gain.gain.setValueAtTime(g, t);
    s.pan.pan.cancelScheduledValues(t);
    s.pan.pan.setValueAtTime(pan, t);
    if (panTime > 0) s.pan.pan.linearRampToValueAtTime(panTo, t + panTime);
    src.start(t);
    s.src = src;
    s.start = t;
    s.end = t + buf.duration / Math.max(0.05, rate) + 0.02;
    s.prio = prio;
    src.onended = () => {
      if (s.src === src) {
        s.src = null;
        src.disconnect();
      }
    };
    return true;
  }

  stopAll(fade = 0.05): void {
    const now = this.ctx.currentTime;
    for (const s of this.slots) {
      if (!s.src) continue;
      s.gain.gain.cancelScheduledValues(now);
      s.gain.gain.setTargetAtTime(0, now, fade / 3);
      try {
        s.src.stop(now + fade * 2);
      } catch {
        // already stopped
      }
    }
  }

  active(): number {
    const now = this.ctx.currentTime;
    let k = 0;
    for (const s of this.slots) if (s.src && now < s.end) k++;
    return k;
  }

  dispose(): void {
    this.stopAll(0.01);
    for (const s of this.slots) s.pan.disconnect();
  }
}

/**
 * Looping bed (thermal hum, rain, murmur, waves…). Stereo width from a mono loop by running two
 * sources at different offsets panned apart. Gain is controlled smoothly; sources start lazily on
 * first non-zero level and stop after fading to silence.
 */
export class LoopBed {
  private readonly ctx: BaseAudioContext;
  private readonly cache: BufferCache;
  private readonly key: string;
  readonly out: GainNode;
  readonly filter: BiquadFilterNode;
  private readonly pans: StereoPannerNode[] = [];
  private srcs: AudioBufferSourceNode[] = [];
  private level = 0;
  private stopTimer = 0;
  private readonly width: number;

  constructor(ctx: BaseAudioContext, cache: BufferCache, key: string, dest: AudioNode, width = 0.6, filterType: BiquadFilterType = 'lowpass') {
    this.ctx = ctx;
    this.cache = cache;
    this.key = key;
    this.width = width;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = filterType;
    this.filter.frequency.value = filterType === 'lowpass' ? 20000 : 1000;
    this.filter.Q.value = 0.6;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.filter.connect(this.out).connect(dest);
  }

  private ensure(): void {
    if (this.srcs.length) return;
    const buf = this.cache.get(this.key);
    if (!buf) return;
    const t = this.ctx.currentTime;
    const offs = [0, buf.duration * 0.43];
    for (let i = 0; i < 2; i++) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      let p = this.pans[i];
      if (!p) {
        p = this.ctx.createStereoPanner();
        p.pan.value = i === 0 ? -this.width : this.width;
        p.connect(this.filter);
        this.pans[i] = p;
      }
      src.connect(p);
      src.start(t, offs[i]);
      this.srcs.push(src);
    }
  }

  /** Linear gain target (already includes the mix dB), smoothed with time constant `tc`. */
  set(gain: number, tc = 0.3): void {
    const t = this.ctx.currentTime;
    if (gain > 1e-4) {
      this.ensure();
      this.stopTimer = 0;
    }
    if (Math.abs(gain - this.level) < 1e-5) return;
    this.level = gain;
    this.out.gain.setTargetAtTime(gain, t, tc);
    if (gain <= 1e-4) this.stopTimer = t + tc * 8;
  }

  /** Stop sources once fully faded (call periodically). */
  tick(): void {
    if (this.stopTimer > 0 && this.ctx.currentTime > this.stopTimer && this.level <= 1e-4) {
      for (const s of this.srcs) {
        try {
          s.stop();
        } catch {
          // already stopped
        }
        s.disconnect();
      }
      this.srcs = [];
      this.stopTimer = 0;
    }
  }

  get playing(): boolean {
    return this.srcs.length > 0;
  }

  dispose(): void {
    this.set(0, 0.01);
    for (const s of this.srcs) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    this.srcs = [];
    this.out.disconnect();
  }
}
