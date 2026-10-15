// Küçük DOM yardımcıları: öğe kurma, olay/zamanlayıcı temizliği (Scope), WAAPI sarmalayıcı, sayaç.
// Kural: animasyonlar yalnız transform + opacity. ?anim=0 → her şey son hâlinde donar (ekran görüntüsü için).

export const ANIM = !/[?&]anim=0(?:&|$)/.test(location.search);

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** HTML parçasından tek kök öğe. */
export function frag<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T {
  const e = root.querySelector<T>(sel);
  if (!e) throw new Error('ui: bulunamadı ' + sel);
  return e;
}

const ESC: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
export const esc = (s: string): string => s.replace(/[&<>"']/g, c => ESC[c]);

/** 12500 → "12.500" (tr-TR gruplama, ICU'ya bağımlı değil). Eksi için tipografik eksi. */
export function fmt(n: number): string {
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? '−' + s : s;
}
export const signed = (n: number): string => (n > 0 ? '+' : '') + fmt(n);

/** Türkçe büyük harf (i → İ). */
export const upper = (s: string): string => s.toLocaleUpperCase('tr-TR');

/** Baş harf(ler): "Misafir" → "M", "Rıza Amca" → "RA". */
export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return upper(p.length > 1 ? p[0][0] + p[1][0] : (p[0] ?? '?')[0]);
}

export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  outQuart: 'cubic-bezier(.25,1,.5,1)',
  in: 'cubic-bezier(.5,0,.75,0)',
  inOut: 'cubic-bezier(.65,0,.35,1)',
  /** ölçülü yay: aşma ≈ %6 */
  spring: 'cubic-bezier(.32,1.45,.6,1)',
} as const;

/** Bir öğeye ait tüm dinleyici/zamanlayıcı/animasyonları tek seferde temizler. */
export class Scope {
  alive = true;
  private offs: (() => void)[] = [];

  on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, fn, opts);
    this.offs.push(() => target.removeEventListener(type, fn, opts));
  }
  timeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      if (this.alive) fn();
    }, ms);
    this.offs.push(() => clearTimeout(id));
    return id;
  }
  raf(fn: (t: number) => void): void {
    const id = requestAnimationFrame(t => {
      if (this.alive) fn(t);
    });
    this.offs.push(() => cancelAnimationFrame(id));
  }
  /** Kapsam kapanırsa da çözülür (asılı söz kalmasın); çağıran `alive`'a bakar. */
  wait(ms: number): Promise<void> {
    return new Promise(res => {
      const id = window.setTimeout(res, ANIM ? ms : 0);
      this.offs.push(() => {
        clearTimeout(id);
        res();
      });
    });
  }
  track(a: Animation): Animation {
    this.offs.push(() => a.cancel());
    return a;
  }
  add(fn: () => void): void {
    this.offs.push(fn);
  }
  dispose(): void {
    if (!this.alive) return;
    this.alive = false;
    const o = this.offs;
    this.offs = [];
    for (let i = o.length - 1; i >= 0; i--) o[i]();
  }
}

/**
 * WAAPI sarmalayıcı. `hold`: ?anim=0 iken animasyonun dondurulacağı oran (1 = son kare).
 * Geçici öğeler (afiş, parçacık) için 0.4 gibi bir ara an seçilir.
 */
export function play(el: Element, kf: Keyframe[], o: KeyframeAnimationOptions, hold = 1): Animation {
  // Çok kareli animasyonda yumuşatma tüm zaman çizelgesini değil her aralığı etkilesin (aksi hâlde ara kareler kayar).
  if (kf.length > 2 && o.easing && o.easing !== 'linear') {
    const e = o.easing;
    kf = kf.map((k, i) => (i < kf.length - 1 && k.easing === undefined ? {...k, easing: e} : k));
    o = {...o, easing: 'linear'};
  }
  const a = el.animate(kf, o);
  if (!ANIM) {
    const d = Number(o.duration) || 0, dl = Number(o.delay) || 0;
    a.pause();
    a.currentTime = dl + d * hold;
  }
  return a;
}

/** Animasyon bitince çözülür (iptal edilirse de). Dondurulmuş modda hemen çözülür. */
export function done(a: Animation): Promise<void> {
  if (!ANIM) return Promise.resolve();
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** Sayı sayacı (ease-out). */
export function countUp(scope: Scope, el: HTMLElement, from: number, to: number, ms: number, f: (n: number) => string = fmt): Promise<void> {
  if (!ANIM || ms <= 0 || from === to) {
    el.textContent = f(to);
    return Promise.resolve();
  }
  return new Promise(res => {
    let t0 = -1;
    const step = (t: number) => {
      if (t0 < 0) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      el.textContent = f(Math.round(from + (to - from) * e));
      if (k < 1 && scope.alive) scope.raf(step);
      else res();
    };
    el.textContent = f(from);
    scope.raf(step);
  });
}

/** Bir öğenin ekran merkezi. */
export function center(el: Element): {x: number; y: number} {
  const r = el.getBoundingClientRect();
  return {x: r.left + r.width / 2, y: r.top + r.height / 2};
}

/** iOS'ta :active için boş bir touchstart dinleyicisi gerekir. */
let activeHack = false;
export function enableActiveStates(): void {
  if (activeHack) return;
  activeHack = true;
  document.addEventListener('touchstart', () => {}, {passive: true});
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const rnd = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const sleep = (ms: number): Promise<void> => new Promise(r => window.setTimeout(r, ANIM ? ms : 0));

/** Görselleri önceden indir (poz değişiminde boş kare görünmesin). */
const preloaded = new Set<string>();
export function preload(urls: string[]): void {
  for (const u of urls) {
    if (!u || preloaded.has(u)) continue;
    preloaded.add(u);
    const i = new Image();
    i.decoding = 'async';
    i.src = u;
  }
}

/**
 * Buton fiziği: bırakınca yay gibi geri sıçrar (CSS :active basar, bu yaylı çıkışı oynatır).
 * .kh-btn ve [data-spring] öğelerine tek dinleyiciyle uygulanır. Konumu transform ile verilen öğelere uygulanmaz.
 */
let springOn = false;
export function enableSpringPress(): void {
  if (springOn || !ANIM) return;
  springOn = true;
  document.addEventListener(
    'pointerup',
    e => {
      const b = (e.target as Element | null)?.closest?.<HTMLElement>('.kh-btn, [data-spring]');
      if (!b || (b as HTMLButtonElement).disabled) return;
      const down = b.classList.contains('kh-btn') ? 'translateY(4px) scale(.98)' : 'scale(.92)';
      b.animate([{transform: down}, {transform: 'translateY(-2px) scale(1.04)', offset: 0.45}, {transform: 'translateY(0) scale(.99)', offset: 0.75}, {transform: 'none'}], {
        duration: 340,
        easing: 'ease-out',
      });
    },
    {passive: true},
  );
}

/** Kısa sallanma (yetersiz jeton, kilitli öğe). */
export function shake(el: Element, k = 1): Animation {
  const d = 7 * k;
  return play(el, [{transform: 'none'}, {transform: `translateX(${-d}px) rotate(-1.5deg)`}, {transform: `translateX(${d}px) rotate(1.5deg)`}, {transform: `translateX(${-d * 0.6}px)`}, {transform: `translateX(${d * 0.4}px)`}, {transform: 'none'}], {duration: 380, easing: 'ease-out'});
}

/** Küçük zıplama (sayaç arttı, seçildi). */
export function bump(el: Element, s = 1.12): Animation {
  return play(el, [{transform: 'scale(1)'}, {transform: `scale(${s})`, offset: 0.35}, {transform: 'scale(1)'}], {duration: 300, easing: EASE.out});
}

/**
 * Daktilo yazısı: harf harf yazar. `finish()` metni anında tamamlar; `done` bitince çözülür.
 * Noktalama işaretlerinde kısa duraksar (konuşma ritmi).
 */
export function typewriter(scope: Scope, el: HTMLElement, text: string, cps = 38, onChar?: (i: number) => void): {done: Promise<void>; finish(): void; typing(): boolean} {
  let i = 0, finished = false, resolve!: () => void;
  const done = new Promise<void>(r => (resolve = r));
  const finish = () => {
    if (finished) return;
    finished = true;
    el.textContent = text;
    resolve();
  };
  if (!ANIM) {
    finish();
    return {done, finish, typing: () => false};
  }
  el.textContent = '';
  const step = () => {
    if (finished || !scope.alive) return finish();
    i++;
    el.textContent = text.slice(0, i);
    onChar?.(i);
    if (i >= text.length) return finish();
    const c = text[i - 1];
    scope.timeout(step, /[.!?…]/.test(c) ? 260 : c === ',' ? 120 : 1000 / cps);
  };
  scope.timeout(step, 120);
  return {done, finish, typing: () => !finished};
}

/** Kalan süre: 3725 sn → "01:02:05" */
export function hms(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
