// Pişti efekti önizlemeleri (market ızgarası, ürün penceresi, koleksiyon): kutu içinde kısa gösteri.
// still: duraklatılmış güzel bir kare (ızgara küçük resmi; canlı animasyon/katman bırakmaz). Yeni efekt = yeni bir dal.
import {ANIM, h} from './dom';
import {ASSETS} from './assets';
import {g3} from './fx';

// ---------------------------------------------------------------- pişti efekti
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
  const P = (cls: string, html = '') => {
    const n = h('i', `kh-fxpv__p ${cls}`, html);
    stage.append(n);
    return n;
  };
  const A = (n: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = n.animate(kf, {fill: 'both', ...o});
    anims.push(a);
    return a;
  };
  const build = () => {
    anims.forEach(a => a.cancel());
    anims.length = 0;
    stage.innerHTML = '';
    const H = stage.clientHeight || box.clientHeight || 120;
    if (id === 'havai') {
      const W = stage.clientWidth || box.clientWidth || 160;
      const cols = ['#ff2e4d', '#ffd23f', '#16c45b', '#3d93ff', '#ffffff', '#ff8af0'];
      for (let i = 0; i < 9; i++) {
        const st = P('is-star');
        st.style.left = 8 + ((i * 41) % 84) + '%';
        st.style.top = 6 + ((i * 29) % 50) + '%';
      }
      [[28, 30, 0], [72, 22, 380], [50, 40, 760]].forEach(([x, y, d], k) => {
        const rk = P('is-rocket');
        rk.style.left = x + '%';
        const rise = -((100 - y) / 100) * H;
        A(rk, [{transform: 'translate(-50%, 0) scaleY(1)', opacity: 1}, {transform: `translate(-50%, ${rise}px) scaleY(1.6)`, opacity: 1, offset: 0.9}, {transform: `translate(-50%, ${rise}px) scaleY(.4)`, opacity: 0}], {duration: 520, delay: d, easing: 'cubic-bezier(.2,.7,.4,1)'});
        const ring = P('is-ring');
        ring.style.left = x + '%';
        ring.style.top = y + '%';
        ring.style.borderColor = cols[k % cols.length];
        A(ring, [{transform: 'translate(-50%,-50%) scale(.1)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(.6)', opacity: 1, offset: 0.2}, {transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0}], {duration: 700, delay: d + 480, easing: 'ease-out'});
        const n = 14, R = W * (0.16 + k * 0.03);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, r = R * (i % 2 ? 0.75 : 1);
          const sp = P('is-spark');
          sp.style.left = x + '%';
          sp.style.top = y + '%';
          sp.style.background = cols[(i + k * 2) % cols.length];
          sp.style.color = cols[(i + k * 2) % cols.length];
          A(sp, [{transform: 'translate(-50%,-50%) scale(.3)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.1},
            {transform: `translate(calc(-50% + ${(Math.cos(a) * r).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * r + R * 0.35).toFixed(1)}px)) scale(.35)`, opacity: 0}], {duration: 1000, delay: d + 480, easing: 'cubic-bezier(.1,.7,.3,1)'});
        }
      });
    } else if (id === 'yildiz') {
      [[10, 8, 0], [40, 0, 300], [-10, 30, 620], [60, 12, 900]].forEach(([x, y, d]) => {
        const st = P('is-shoot');
        st.style.left = x + '%';
        st.style.top = y + '%';
        A(st, [{transform: 'rotate(32deg) translateX(0) scaleX(.3)', opacity: 0}, {transform: 'rotate(32deg) translateX(40%) scaleX(1)', opacity: 1, offset: 0.3}, {transform: 'rotate(32deg) translateX(160%) scaleX(.6)', opacity: 0}], {duration: 760, delay: d, easing: 'ease-in'});
      });
      for (let i = 0; i < 7; i++) {
        const tw = P('is-twinkle');
        tw.style.left = 12 + ((i * 37) % 76) + '%';
        tw.style.top = 16 + ((i * 53) % 64) + '%';
        A(tw, [{transform: 'translate(-50%,-50%) scale(0) rotate(0)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1) rotate(45deg)', opacity: 1, offset: 0.5}, {transform: 'translate(-50%,-50%) scale(0) rotate(90deg)', opacity: 0}], {duration: 700, delay: 200 + i * 170, easing: 'ease-in-out'});
      }
    } else if (id === 'altin') {
      for (let i = 0; i < 14; i++) {
        const c = P('is-coin', `<img src="${ASSETS.icon_coin}" alt="">`);
        const x = 8 + ((i * 41) % 84);
        c.style.left = x + '%';
        const land = 72 + ((i * 17) % 18);
        const y0 = -0.2 * H, y1 = (land / 100) * H;
        A(c, [{transform: `translate(-50%, ${y0}px) rotateY(0deg) rotate(${i * 30}deg)`, opacity: 1},
          {transform: `translate(-50%, ${y1}px) rotateY(540deg) rotate(${i * 30 + 90}deg)`, opacity: 1, offset: 0.78},
          {transform: `translate(-50%, ${y1 - 8}px) rotateY(620deg) rotate(${i * 30 + 100}deg)`, opacity: 1, offset: 0.88},
          {transform: `translate(-50%, ${y1}px) rotateY(720deg) rotate(${i * 30 + 110}deg)`, opacity: 0}], {duration: 1300, delay: i * 70, easing: 'cubic-bezier(.45,0,.75,.5)'});
      }
      const glow = P('is-goldglow');
      A(glow, [{opacity: 0}, {opacity: 1, offset: 0.4}, {opacity: 0}], {duration: 1800, easing: 'ease-in-out'});
    } else {
      // klasik: dört renk ışın çarkı + PİŞTİ + konfeti + jeton
      const rays = P('is-rays');
      A(rays, [{transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1) rotate(40deg)', opacity: 1, offset: 0.3}, {transform: 'translate(-50%,-50%) scale(1.1) rotate(120deg)', opacity: 0}], {duration: 1500, easing: 'ease-out'});
      const word = P('is-word', g3('PİŞTİ!'));
      A(word, [{transform: 'translate(-50%,-50%) scale(2.4) rotate(-12deg)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(.92) rotate(-5deg)', opacity: 1, offset: 0.14}, {transform: 'translate(-50%,-50%) scale(1) rotate(-5deg)', opacity: 1, offset: 0.7}, {transform: 'translate(-50%,-50%) scale(1.1) rotate(-5deg)', opacity: 0}], {duration: 1500, delay: 80, easing: 'ease-out'});
      const cols = ['#ff2e4d', '#ffb400', '#16c45b', '#1f7bff'];
      for (let i = 0; i < 18; i++) {
        const c = P('is-conf');
        c.style.background = cols[i % 4];
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, sp = 40 + Math.random() * 40;
        const x = Math.cos(a) * sp, y = Math.sin(a) * sp;
        A(c, [{transform: 'translate(-50%,-50%) rotate(0)', opacity: 1}, {transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(200deg)`, opacity: 1, offset: 0.4},
          {transform: `translate(calc(-50% + ${x * 1.3}px), calc(-50% + ${y + 60}px)) rotate(420deg)`, opacity: 0}], {duration: 1300, delay: 140, easing: 'cubic-bezier(.2,.7,.4,1)'});
      }
    }
    if (still || !ANIM) {
      anims.forEach(a => {
        a.pause();
        const t = (a.effect?.getTiming().delay as number) ?? 0;
        a.currentTime = t + (Number(a.effect?.getTiming().duration) || 0) * (id === 'altin' ? 0.8 : id === 'havai' ? 0.35 : 0.4);
      });
      // donmuş kare: değerleri satır içi yaz, animasyonları bırak (küçük resimde canlı animasyon/katman kalmasın)
      const frozen: Array<[HTMLElement, Record<string, string>]> = [];
      for (const a of anims) {
        const eff = a.effect as KeyframeEffect | null;
        const el = eff?.target as HTMLElement | null | undefined;
        if (!el) continue;
        const cs = getComputedStyle(el);
        const vals: Record<string, string> = {};
        for (const kf of eff!.getKeyframes()) for (const k of Object.keys(kf)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(k)) vals[k] = (cs as unknown as Record<string, string>)[k];
        frozen.push([el, vals]);
      }
      anims.forEach(a => a.cancel());
      anims.length = 0;
      for (const [el, vals] of frozen) Object.assign(el.style, vals);
    }
  };
  const cycle = () => {
    build();
    if (still || !ANIM) return;
    loops++;
    timer = window.setTimeout(() => (loops < 4 && box.isConnected ? cycle() : undefined), id === 'altin' ? 2300 : id === 'havai' ? 2200 : 1900);
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
