// Zaman, yavaş çekim ve ara geçiş (tween) sistemi.
// Oyun zamanı = gerçek zaman × timeScale. Yavaş çekim timeScale'i gerçek zamanda değiştirir.

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  outExpo: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
} satisfies Record<string, Ease>;

interface Tween {
  t: number;
  dur: number;
  ease: Ease;
  update: (k: number) => void;
  done?: () => void;
  real: boolean; // gerçek zamanda mı (yavaş çekimden etkilenmez)
  resolve?: () => void;
}

/** Tek merkezli zamanlayıcı. Aktif iş varken kare ister; boştayken hiçbir şey yapmaz. */
export class Timeline {
  timeScale = 1;
  private tweens: Tween[] = [];
  private pool: Tween[] = [];
  private tickers = new Set<(dt: number, realDt: number) => boolean>();
  onActive: () => void = () => {};

  get busy(): boolean {
    return this.tweens.length > 0 || this.tickers.size > 0;
  }

  /** k: 0..1 arası ilerleme. Bitince promise çözülür. */
  tween(dur: number, update: (k: number) => void, opts: {ease?: Ease; real?: boolean} = {}): Promise<void> {
    return new Promise(resolve => {
      const tw = this.pool.pop() ?? ({} as Tween);
      tw.t = 0; tw.dur = Math.max(1e-4, dur); tw.ease = opts.ease ?? ease.inOutQuad;
      tw.update = update; tw.real = !!opts.real; tw.resolve = resolve; tw.done = undefined;
      this.tweens.push(tw);
      update(0);
      this.onActive();
    });
  }

  /** Oyun zamanında bekle (yavaş çekimde uzar). */
  wait(sec: number): Promise<void> {
    return this.tween(sec, () => {}, {ease: ease.linear});
  }
  /** Gerçek zamanda bekle. */
  waitReal(sec: number): Promise<void> {
    return this.tween(sec, () => {}, {ease: ease.linear, real: true});
  }

  /** Her karede çağrılan iş; false dönerse kaldırılır. */
  addTicker(fn: (dt: number, realDt: number) => boolean): void {
    this.tickers.add(fn);
    this.onActive();
  }
  removeTicker(fn: (dt: number, realDt: number) => boolean): void {
    this.tickers.delete(fn);
  }

  /** Yavaş çekim: timeScale'i gerçek zamanda hedefe götürür. */
  scaleTo(target: number, dur: number): Promise<void> {
    const from = this.timeScale;
    return this.tween(dur, k => (this.timeScale = from + (target - from) * k), {real: true, ease: ease.inOutQuad});
  }

  step(realDt: number): void {
    const dt = realDt * this.timeScale;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += tw.real ? realDt : dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.update(tw.ease(k));
      if (k >= 1) {
        this.tweens.splice(i, 1);
        const r = tw.resolve;
        tw.resolve = undefined;
        tw.update = noop;
        this.pool.push(tw);
        r?.();
      }
    }
    for (const fn of this.tickers) if (!fn(dt, realDt)) this.tickers.delete(fn);
  }
}
const noop = () => {};

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
