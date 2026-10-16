// Vitrin hareketi: (1) Spotlight — vitrindeki kartlar SIRAYLA canlanır: aynı anda tek kart, kısa bir ışık süpürmesi +
// yıldız parıltısı + (deste) yelpaze açılır / (çerçeve) çerçeve döner. Sürekli döngü yok: süpürmeler arası hiç kare
// üretilmez; 5 sn dokunuşsuzluktan sonra (platform/calm.ts → .kh-calm) ve düşük kalitede hiç çalışmaz.
// (2) DeckViewer — ürün penceresinde parmakla kaydırılan, dokununca dönen, parmağı izleyen ışık yansımalı kart vitrini.
//     Sürükleme sırasında yalnız tek öğe (ray) taşınır; eğim yalnız odaktaki kartta; tümü rAF ile, yalnız transform.
import {ANIM, Scope, clamp} from './dom';
import {decorLoops} from './parts';
import {CI, deckCardHtml} from './deckpv';

// ---------------------------------------------------------------- tek parıltı
/** Kartın .kh-glint (süpürme) ve .kh-spark4 (yıldız) öğelerini bir kez oynat. Sonlu; kalıcı katman bırakmaz. */
export function glint(card: Element, ms = 1050): void {
  if (!ANIM) return;
  const g = card.querySelector('.kh-glint');
  if (g)
    g.animate([{transform: 'translateX(-120%) skewX(-20deg)', opacity: 0}, {opacity: 1, offset: 0.18}, {opacity: 1, offset: 0.72}, {transform: 'translateX(360%) skewX(-20deg)', opacity: 0}], {
      duration: ms,
      easing: 'cubic-bezier(.45,.05,.3,1)',
    });
  const s = card.querySelector('.kh-spark4');
  if (s)
    s.animate([{transform: 'scale(0) rotate(0deg)', opacity: 0}, {transform: 'scale(1.15) rotate(50deg)', opacity: 1, offset: 0.45}, {transform: 'scale(0) rotate(100deg)', opacity: 0}], {
      duration: 720,
      delay: ms * 0.55,
      easing: 'cubic-bezier(.3,.7,.4,1)',
    });
}

/** Parıltı öğeleri (kartın içine, taşma kırpılan kutuya konur). */
export const glintHtml = (spark = true): string => `<i class="kh-glint"></i>${spark ? '<i class="kh-spark4"></i>' : ''}`;

// ---------------------------------------------------------------- sıralı vitrin ışığı
export class Spotlight {
  private t = 0;
  private liveT = 0;
  private n = 0;
  private on = false;
  private live: HTMLElement | null = null;

  /** root: o an görünen panel; period: iki canlanma arası (ms) */
  constructor(private root: () => HTMLElement | null, private period = 2700) {}

  start(delay = 900): void {
    this.stop();
    if (!ANIM || !decorLoops()) return;
    this.on = true;
    this.t = window.setTimeout(this.tick, delay);
  }

  stop(): void {
    this.on = false;
    clearTimeout(this.t);
    this.unlive();
  }

  private unlive(): void {
    clearTimeout(this.liveT);
    this.live?.classList.remove('is-live');
    this.live = null;
  }

  private tick = (): void => {
    if (!this.on) return;
    this.t = window.setTimeout(this.tick, this.period);
    // boşta (sakin mod), gizli sekme, açık pencere/deneme sahnesi: hiçbir şey yapma (kare üretme)
    if (document.hidden || document.documentElement.classList.contains('kh-calm') || document.querySelector('.kh-sheet, .kh-try')) return;
    const root = this.root();
    if (!root || !root.isConnected) return;
    const vh = innerHeight;
    const vis: HTMLElement[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('[data-glint]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.top < vh - 60 && r.bottom > 60 && r.left < innerWidth && r.right > 0) vis.push(el);
    }
    if (!vis.length) return;
    // önce en değerli: efsanevi kartlar iki kat sık gelir
    const pool = vis.flatMap(el => (el.classList.contains('is-legendary') ? [el, el] : [el]));
    const el = pool[this.n++ % pool.length];
    this.unlive();
    el.classList.add('is-live');
    this.live = el;
    glint(el);
    this.liveT = window.setTimeout(() => this.unlive(), 2100);
  };
}

// ---------------------------------------------------------------- deste vitrini (ürün penceresi)
const FACES = [CI.ace, CI.jack, CI.king, CI.queen, CI.ten] as const;

export interface DeckViewer {
  /** Odaktaki kartı çevir (arka yüz ↔ ön yüz) */
  flip(): void;
}

/**
 * Kaydırılabilir 3B kart vitrini. Parmak: yatay sürükle → kartlar arasında gez (yaylı oturur), dokun → kart döner
 * (arka yüz), basılı tut/gezdir → kart parmağa doğru eğilir ve ışık yansıması parmağı izler.
 */
export function mountDeckViewer(host: HTMLElement, deck: string, scope: Scope, start = 1): DeckViewer {
  host.innerHTML = `<div class="kh-dv kh-noswipe">
      <div class="kh-dv__track">${FACES.map(
        (ci, k) => `<div class="kh-dv__slot" style="--k:${k}"><div class="kh-dv__card">
          <span class="kh-dv__side is-front">${deckCardHtml(deck, ci, 'kh-dv__img')}<i class="kh-dv__glare"></i></span>
          <span class="kh-dv__side is-back">${deckCardHtml(deck, CI.back, 'kh-dv__img')}<i class="kh-dv__glare"></i></span></div></div>`,
      ).join('')}</div>
      <div class="kh-dv__dots">${FACES.map((_, k) => `<i data-k="${k}"></i>`).join('')}</div>
    </div>`;
  const root = host.firstElementChild as HTMLElement;
  const track = root.querySelector<HTMLElement>('.kh-dv__track')!;
  const slots = Array.from(root.querySelectorAll<HTMLElement>('.kh-dv__slot'));
  const dots = Array.from(root.querySelectorAll<HTMLElement>('.kh-dv__dots i'));
  const flipped = new Set<number>();
  let focus = clamp(start, 0, FACES.length - 1);
  let pos = focus;
  let step = 0;

  const measure = (): void => {
    step = slots[0].offsetWidth * 0.62 || 90;
  };
  const place = (): void => {
    track.style.transform = `translate3d(${(-pos * step).toFixed(1)}px,0,0)`;
  };
  const mark = (): void => {
    slots.forEach((s, k) => {
      s.classList.toggle('is-on', k === focus);
      s.classList.toggle('is-l', k < focus);
      s.classList.toggle('is-r', k > focus);
      s.classList.toggle('is-far', Math.abs(k - focus) > 1);
    });
    dots.forEach((d, k) => d.classList.toggle('is-on', k === focus));
  };
  measure();
  mark();
  place();

  // ---- işaretçi: sürükle / bas-eğ / dokun-çevir
  let pid = -1, x0 = 0, y0 = 0, t0 = 0, pos0 = 0, mode: 'none' | 'press' | 'drag' = 'none';
  let lastX = 0, lastT = 0, vx = 0;
  let fx = 0.5, fy = 0.5;
  let raf = 0;
  const card = (): HTMLElement => slots[focus].querySelector<HTMLElement>('.kh-dv__card')!;
  const frame = (): void => {
    raf = 0;
    if (mode === 'drag') return place();
    if (mode === 'press') {
      const c = card();
      const ry = (fx - 0.5) * 22, rx = (0.5 - fy) * 18;
      c.style.transform = `perspective(700px) rotateY(${(flipped.has(focus) ? 180 : 0) + ry}deg) rotateX(${rx}deg) scale(1.04)`;
      const side = c.querySelector<HTMLElement>(flipped.has(focus) ? '.is-back .kh-dv__glare' : '.is-front .kh-dv__glare');
      if (side) side.style.transform = `translate3d(${((flipped.has(focus) ? 1 - fx : fx) * 100 - 50).toFixed(1)}%, ${(fy * 100 - 50).toFixed(1)}%, 0)`;
    }
  };
  const ask = (): void => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  scope.add(() => cancelAnimationFrame(raf));
  const pt = (e: PointerEvent): void => {
    const r = slots[focus].getBoundingClientRect();
    fx = clamp((e.clientX - r.left) / r.width, 0, 1);
    fy = clamp((e.clientY - r.top) / r.height, 0, 1);
  };
  const releaseTilt = (): void => {
    const c = card();
    c.style.transform = '';
    root.querySelectorAll<HTMLElement>('.kh-dv__glare').forEach(g => (g.style.transform = ''));
    root.classList.remove('is-press');
  };
  scope.on(root, 'pointerdown', e => {
    const p = e as PointerEvent;
    if (pid !== -1) return;
    pid = p.pointerId;
    x0 = lastX = p.clientX;
    y0 = p.clientY;
    t0 = lastT = performance.now();
    vx = 0;
    pos0 = pos;
    mode = 'press';
    measure();
    try {
      root.setPointerCapture(pid);
    } catch {
      /* */
    }
    // basılan kart odaktaysa eğim; değilse dokununca o karta git
    pt(p);
    root.classList.add('is-press');
    ask();
  });
  scope.on(root, 'pointermove', e => {
    const p = e as PointerEvent;
    if (p.pointerId !== pid) return;
    const dx = p.clientX - x0;
    const now = performance.now();
    if (now > lastT) vx = vx * 0.6 + ((p.clientX - lastX) / (now - lastT)) * 0.4;
    lastX = p.clientX;
    lastT = now;
    if (mode === 'press' && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(p.clientY - y0)) {
      mode = 'drag';
      releaseTilt();
      root.classList.add('is-drag');
    }
    if (mode === 'drag') {
      let np = pos0 - dx / step;
      if (np < 0) np *= 0.35;
      if (np > FACES.length - 1) np = FACES.length - 1 + (np - FACES.length + 1) * 0.35;
      pos = np;
    } else pt(p);
    ask();
  });
  const end = (e: Event, cancel: boolean): void => {
    const p = e as PointerEvent;
    if (p.pointerId !== pid) return;
    pid = -1;
    const was = mode;
    mode = 'none';
    root.classList.remove('is-drag');
    if (was === 'drag') {
      const target = clamp(Math.round(pos - vx * 0.18 * (16 / Math.max(8, step / 10))), 0, FACES.length - 1);
      go(target);
      return;
    }
    releaseTilt();
    if (cancel) return;
    const moved = Math.hypot(p.clientX - x0, p.clientY - y0);
    if (moved < 10 && performance.now() - t0 < 420) {
      // yan karta dokunduysa ona git, odaktakine dokunduysa çevir
      const hit = (p.target as Element).closest<HTMLElement>('.kh-dv__slot');
      const k = hit ? slots.indexOf(hit) : focus;
      if (k !== focus && k >= 0) go(k);
      else api.flip();
    }
  };
  scope.on(root, 'pointerup', e => end(e, false));
  scope.on(root, 'pointercancel', e => end(e, true));

  const go = (k: number): void => {
    focus = k;
    pos = k;
    mark();
    place();
  };

  const api: DeckViewer = {
    flip() {
      if (flipped.has(focus)) flipped.delete(focus);
      else flipped.add(focus);
      slots[focus].classList.toggle('is-flip', flipped.has(focus));
    },
  };
  return api;
}
