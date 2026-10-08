// Sound bank: pre-generates every PCM clip once (during loading, chunked to keep frames smooth),
// then wraps clips into AudioBuffers per AudioContext. No decodeAudioData anywhere (§5.5).
import { bankJobs } from './bankJobs.ts';
import { GEN_SR, resampleLinear } from './dsp.ts';
import type { F32, Pcm } from './dsp.ts';

export { IR_KEY, NOISE_LOOPS, bankJobs, drumKey, instKey } from './bankJobs.ts';

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
  /** Main-thread generation time (ms) and worker wall time (ms), for diagnostics. */
  genMs = 0;
  workerMs = 0;

  /** Generate everything synchronously (tests, offline tools). */
  generateSync(): void {
    if (this.ready) return;
    const t0 = nowMs();
    for (const [k, fn] of bankJobs()) if (!this.pcm.has(k)) this.pcm.set(k, fn());
    this.genMs += nowMs() - t0;
    this.ready = true;
  }

  /**
   * Generate everything off the main thread (inline Web Worker, transferable buffers); falls back to
   * main-thread generation in small slices (≤ `sliceMs` per frame) if workers are unavailable.
   * Idempotent: concurrent callers share one promise.
   */
  prepare(sliceMs = 12, onProgress?: (k: number) => void): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = this.viaWorker(onProgress).then((ok) => (ok ? undefined : this.viaMainThread(sliceMs, onProgress)));
    return this.pending;
  }

  private async viaWorker(onProgress?: (k: number) => void): Promise<boolean> {
    if (typeof Worker === 'undefined' || typeof window === 'undefined') return false;
    let Ctor: new () => Worker;
    try {
      Ctor = (await import('./bankWorker.ts?worker&inline')).default;
    } catch {
      return false;
    }
    const total = bankJobs().length;
    const t0 = nowMs();
    return new Promise<boolean>((resolve) => {
      let w: Worker;
      try {
        w = new Ctor();
      } catch {
        resolve(false);
        return;
      }
      let got = 0;
      const fail = () => {
        clearTimeout(timer);
        w.terminate();
        resolve(false);
      };
      const timer = setTimeout(fail, 30000);
      w.onmessage = (e: MessageEvent) => {
        const d = e.data as { k?: string; sr?: number; ch?: F32[]; done?: boolean };
        if (d.done) {
          clearTimeout(timer);
          w.terminate();
          this.workerMs = nowMs() - t0;
          this.ready = true;
          resolve(true);
          return;
        }
        if (d.k && d.ch && d.sr) {
          this.pcm.set(d.k, { sr: d.sr, ch: d.ch });
          onProgress?.(++got / total);
        }
      };
      w.onerror = fail;
      w.postMessage('go');
    });
  }

  private async viaMainThread(sliceMs: number, onProgress?: (k: number) => void): Promise<void> {
    const list = bankJobs();
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
  }

  /** Drop the JS-side PCM of a clip once it lives in an AudioBuffer (halves memory). */
  release(key: string): void {
    this.pcm.delete(key);
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
  private readonly releasePcm: boolean;

  /** `releasePcm`: drop JS copies after upload (single real-time context; not for shared banks). */
  constructor(ctx: BaseAudioContext, bank: SoundBank, releasePcm = false) {
    this.ctx = ctx;
    this.bank = bank;
    this.releasePcm = releasePcm;
  }

  get(key: string): AudioBuffer | null {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const p = this.bank.get(key);
    if (!p) return null;
    const buf = this.ctx.createBuffer(p.ch.length, p.ch[0].length, p.sr || GEN_SR);
    for (let c = 0; c < p.ch.length; c++) buf.copyToChannel(p.ch[c], c);
    this.cache.set(key, buf);
    if (this.releasePcm) this.bank.release(key);
    return buf;
  }

  /** Buffer resampled to the context rate (ConvolverNode requires a matching rate). */
  getAtContextRate(key: string): AudioBuffer | null {
    const ck = `${key}@${this.ctx.sampleRate}`;
    const hit = this.cache.get(ck);
    if (hit) return hit;
    const p = this.bank.get(key);
    if (!p) return null;
    const r = resampleLinear(p, this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(r.ch.length, r.ch[0].length, r.sr);
    for (let c = 0; c < r.ch.length; c++) buf.copyToChannel(r.ch[c], c);
    this.cache.set(ck, buf);
    if (this.releasePcm) this.bank.release(key);
    return buf;
  }

  /** Convert everything up-front (avoids first-use memcpy during play). */
  warm(): void {
    for (const k of [...this.bank.pcm.keys()]) this.get(k);
  }
}
