// Sound bank: pre-generates every PCM clip once (during loading, chunked to keep frames smooth),
// then wraps clips into AudioBuffers per AudioContext. No decodeAudioData anywhere (§5.5).
import { GEN_SR, synthIR } from './dsp.ts';
import type { Pcm } from './dsp.ts';
import { Rng } from './rng.ts';
import { SFX_IDS, generateNoiseLoop, generateSfx } from './sfxLib.ts';
import type { NoiseLoopId } from './sfxLib.ts';
import { DRUM_IDS, PCM_INSTS, PCM_REFS, renderDrum, renderInstrument } from './music/pcm.ts';

export const NOISE_LOOPS: readonly NoiseLoopId[] = ['pinkLoop', 'brownLoop', 'whiteLoop'];

export function instKey(inst: string, ref: number): string {
  return `inst:${inst}:${ref}`;
}

export function drumKey(id: string): string {
  return `drum:${id}`;
}

export const IR_KEY = 'ir:music';

type Job = [string, () => Pcm];

function jobs(): Job[] {
  const out: Job[] = [];
  // Wind & instrument noise first: the wind bed must be ready before anything else.
  for (const id of NOISE_LOOPS) out.push([id, () => generateNoiseLoop(id)]);
  out.push([IR_KEY, () => synthIR(2.6, 2.2, new Rng(0x6b616e61))]);
  for (const id of SFX_IDS) out.push([id, () => generateSfx(id)]);
  for (const inst of PCM_INSTS) for (const ref of PCM_REFS[inst]) out.push([instKey(inst, ref), () => renderInstrument(inst, ref)]);
  for (const d of DRUM_IDS) out.push([drumKey(d), () => renderDrum(d)]);
  return out;
}

function frameYield(): Promise<void> {
  return new Promise((res) => {
    if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined' && !document.hidden) {
      requestAnimationFrame(() => res());
    } else {
      setTimeout(res, 0);
    }
  });
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export class SoundBank {
  readonly pcm = new Map<string, Pcm>();
  private pending: Promise<void> | null = null;
  ready = false;
  /** Total generation time (ms), for diagnostics. */
  genMs = 0;

  /** Generate everything synchronously (tests, offline tools). */
  generateSync(): void {
    if (this.ready) return;
    const t0 = nowMs();
    for (const [k, fn] of jobs()) if (!this.pcm.has(k)) this.pcm.set(k, fn());
    this.genMs += nowMs() - t0;
    this.ready = true;
  }

  /**
   * Generate in small slices (≤ `sliceMs` of work per frame) so loading screens stay smooth.
   * Idempotent: concurrent callers share one promise.
   */
  prepare(sliceMs = 12, onProgress?: (k: number) => void): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const list = jobs();
      let i = 0;
      while (i < list.length) {
        const t0 = nowMs();
        while (i < list.length && nowMs() - t0 < sliceMs) {
          const [k, fn] = list[i++];
          if (!this.pcm.has(k)) this.pcm.set(k, fn());
        }
        this.genMs += nowMs() - t0;
        onProgress?.(i / list.length);
        if (i < list.length) await frameYield();
      }
      this.ready = true;
    })();
    return this.pending;
  }

  get(key: string): Pcm | undefined {
    return this.pcm.get(key);
  }

  /** Approximate PCM memory in bytes. */
  bytes(): number {
    let b = 0;
    for (const p of this.pcm.values()) for (const c of p.ch) b += c.byteLength;
    return b;
  }
}

/** Per-context AudioBuffer cache (lazy conversion; conversion is a memcpy, no decoding). */
export class BufferCache {
  private readonly ctx: BaseAudioContext;
  private readonly bank: SoundBank;
  private readonly cache = new Map<string, AudioBuffer>();

  constructor(ctx: BaseAudioContext, bank: SoundBank) {
    this.ctx = ctx;
    this.bank = bank;
  }

  get(key: string): AudioBuffer | null {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const p = this.bank.get(key);
    if (!p) return null;
    const buf = this.ctx.createBuffer(p.ch.length, p.ch[0].length, p.sr || GEN_SR);
    for (let c = 0; c < p.ch.length; c++) buf.copyToChannel(p.ch[c], c);
    this.cache.set(key, buf);
    return buf;
  }

  /** Convert everything up-front (avoids first-use memcpy during play). */
  warm(): void {
    for (const k of this.bank.pcm.keys()) this.get(k);
  }
}
