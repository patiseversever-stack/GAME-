// Saat soyutlaması: ev sahibi zamanlayıcılarını (blöf penceresi, bot bekleme, süre aşımı) buradan kurar.
// Oyunda gerçek saat; testlerde ve "hızlı oynat" modunda sanal saat (anında ilerletilebilir).

export type TimerHandle = number;

export interface Clock {
  /** Şimdiki zaman (ms). Çevrimiçinde sunucu saati; istemci farkı 'pong' ile ölçer. */
  now(): number;
  set(fn: () => void, ms: number): TimerHandle;
  clear(h: TimerHandle): void;
}

/** Gerçek saat (tarayıcı / Node). */
export const realClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  set: (fn, ms) => setTimeout(fn, Math.max(0, ms)) as unknown as TimerHandle,
  clear: (h) => clearTimeout(h as unknown as ReturnType<typeof setTimeout>),
};

/** Sanal saat: zaman yalnız advance/runAll ile ilerler. Aynı anda düşenler kurulma sırasıyla çalışır (deterministik). */
export class VirtualClock implements Clock {
  private t = 0;
  private seq = 0;
  private timers = new Map<number, {at: number; seq: number; fn: () => void}>();

  now(): number {
    return this.t;
  }

  set(fn: () => void, ms: number): TimerHandle {
    const id = ++this.seq;
    this.timers.set(id, {at: this.t + Math.max(0, ms), seq: id, fn});
    return id;
  }

  clear(h: TimerHandle): void {
    this.timers.delete(h);
  }

  /** Bekleyen zamanlayıcı sayısı. */
  get pending(): number {
    return this.timers.size;
  }

  /** Sıradaki zamanlayıcıyı çalıştırır; yoksa false. */
  step(): boolean {
    let best: {id: number; at: number; seq: number} | null = null;
    for (const [id, x] of this.timers) if (!best || x.at < best.at || (x.at === best.at && x.seq < best.seq)) best = {id, at: x.at, seq: x.seq};
    if (!best) return false;
    const x = this.timers.get(best.id)!;
    this.timers.delete(best.id);
    if (x.at > this.t) this.t = x.at;
    x.fn();
    return true;
  }

  /** Zamanı ms kadar ilerletir, arada düşenleri çalıştırır. */
  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      let next = Infinity;
      for (const x of this.timers.values()) if (x.at < next) next = x.at;
      if (next > end) break;
      this.step();
    }
    this.t = end;
  }

  /** Zamanlayıcı kalmayana dek (ya da sınır kadar adım) çalıştırır; çalışan adım sayısını döndürür. */
  runAll(maxSteps = 1_000_000): number {
    let n = 0;
    while (n < maxSteps && this.step()) n++;
    return n;
  }
}
