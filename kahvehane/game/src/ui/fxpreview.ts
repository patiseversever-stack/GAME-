// Pişti efekti önizlemeleri (market ızgarası, ürün penceresi, Dene, koleksiyon): kutu içinde OYUNDAKİYLE AYNI tarif
// (src/ui/fxlib.ts) kutu boyutuna ölçeklenerek oynar. still: en güzel anda donmuş kare (ızgara küçük resmi; canlı
// animasyon/katman bırakmaz; scripts/bake-fx.mjs bunu WebP'ye pişirir).
import {ANIM, h} from './dom';
import {g3} from './fx';
import {FX, FX_MS, FX_STILL, type Stage} from './fxlib';
import {spriteSize, spriteUrl} from './fxsprites';

export interface FxLoop {
  play(): void;
  stop(): void;
}

/** Kutu içinde efekt gösterisi. still: duraklatılmış güzel bir kare (ızgara küçük resmi). */
export function mountFx(box: HTMLElement, id: string, still = false): FxLoop {
  box.classList.add('kh-fxpv', `is-${id}`);
  box.innerHTML = `<div class="kh-fxpv__in"></div>`;
  const stage = box.firstElementChild as HTMLElement;
  let timer = 0, loops = 0;
  const anims: Animation[] = [];
  const build = () => {
    anims.forEach(a => a.cancel());
    anims.length = 0;
    stage.innerHTML = '';
    const W = stage.clientWidth || box.clientWidth || 200, H = stage.clientHeight || box.clientHeight || 180;
    const back = h('div', 'kh-ql'), front = h('div', 'kh-ql is-front'), flash = h('div', 'kh-qflash'), night = h('div', 'kh-qnight');
    stage.append(night, flash, back, front);
    const A = (n: Element, kf: Keyframe[], o: KeyframeAnimationOptions): void => void anims.push(n.animate(kf, {fill: 'both', ...o}));
    const s: Stage = {
      W,
      H,
      // önizlemede efekt kutuyu dolduracak kadar iri olsun (kısa kenar + biraz)
      M: Math.min(W * 0.9, H * 1.05),
      low: false,
      node(key, w, hh, isFront) {
        const [sw, sh] = spriteSize(key);
        const ht = hh ?? (w * sh) / sw;
        const n = h('i', 'kh-q');
        n.style.cssText = `width:${w.toFixed(1)}px;height:${ht.toFixed(1)}px;margin:${(-ht / 2).toFixed(1)}px 0 0 ${(-w / 2).toFixed(1)}px;background-image:url("${spriteUrl(key)}");opacity:0`;
        (isFront ? front : back).append(n);
        return n;
      },
      run(n, kf, o) {
        // tarifler aralık başına yumuşatma bekler (oyunda play() böler)
        if (kf.length > 2 && o.easing && o.easing !== 'linear') {
          const e = o.easing;
          kf = kf.map((k, i) => (i < kf.length - 1 && k.easing === undefined ? {...k, easing: e} : k));
          o = {...o, easing: 'linear'};
        }
        A(n, kf, o);
      },
      flash(color, peak, ms, delay = 0) {
        flash.style.background = color;
        A(flash, [{opacity: 0}, {opacity: peak * 0.8, offset: 0.1}, {opacity: peak * 0.25, offset: 0.4}, {opacity: 0}], {duration: ms, delay, easing: 'ease-out'});
      },
      night(peak, ms, delay = 0) {
        A(night, [{opacity: 0}, {opacity: peak, offset: 0.12}, {opacity: peak, offset: 0.72}, {opacity: 0}], {duration: ms, delay, easing: 'ease-in-out'});
      },
      sfx() {
        /* önizleme sessiz */
      },
    };
    const at = {x: W / 2, y: H * (id === 'havai' ? 0.62 : id === 'tac' ? 0.56 : 0.52)};
    (FX[id] ?? FX.klasik)(s, at, false);
    if (id === 'klasik') {
      // oyunda damga verir; önizlemede PİŞTİ! yazısı ışığın önünde
      const w = h('i', 'kh-qword', g3('PİŞTİ!'));
      stage.append(w);
      const T = (sc: number, r: number) => `translate3d(${at.x}px,${at.y}px,0) translate(-50%,-50%) scale(${sc}) rotate(${r}deg)`;
      A(w, [{transform: T(2.2, -12), opacity: 0}, {transform: T(0.94, -4), opacity: 1, offset: 0.14}, {transform: T(1, -4), opacity: 1, offset: 0.75}, {transform: T(1.06, -4), opacity: 0}],
        {duration: 1600, delay: 150, easing: 'cubic-bezier(.2,.7,.3,1)'});
    }
    if (still || !ANIM) {
      const T = FX_STILL[id] ?? 500;
      anims.forEach(a => {
        a.pause();
        a.currentTime = T;
      });
      // donmuş kare: değerleri satır içi yaz, animasyonları bırak (küçük resimde canlı animasyon/katman kalmasın)
      const frozen: Array<[HTMLElement, string, string]> = [];
      for (const a of anims) {
        const el = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null | undefined;
        if (!el) continue;
        const cs = getComputedStyle(el);
        frozen.push([el, cs.transform, cs.opacity]);
      }
      anims.forEach(a => a.cancel());
      anims.length = 0;
      for (const [el, t, o] of frozen) {
        el.style.transform = t;
        el.style.opacity = o;
      }
      // görünmeyen düğümleri at (küçük resimde boş katman kalmasın)
      stage.querySelectorAll<HTMLElement>('.kh-q').forEach(n => {
        if (parseFloat(n.style.opacity) < 0.02) n.remove();
      });
    }
  };
  const cycle = () => {
    build();
    if (still || !ANIM) return;
    loops++;
    timer = window.setTimeout(() => (loops < 4 && box.isConnected ? cycle() : undefined), (FX_MS[id] ?? 1900) + 350);
  };
  if (still) build();
  return {
    play() {
      clearTimeout(timer);
      loops = 0;
      still = false;
      cycle();
    },
    stop() {
      clearTimeout(timer);
      anims.forEach(a => a.cancel());
      stage.innerHTML = '';
    },
  };
}
