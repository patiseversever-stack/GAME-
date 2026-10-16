// Pişti efekti önizlemeleri (market ızgarası, ürün penceresi, koleksiyon): kutu içinde kısa gösteri.
// still: duraklatılmış güzel bir kare (ızgara küçük resmi; canlı animasyon/katman bırakmaz). Yeni efekt = yeni bir dal.
// Efektler: klasik · havai · yildiz · altin · nazar · lale · simsek · davul · girdap (görseller: fx.css --fxb-*).
import {ANIM, h} from './dom';
import {ASSETS} from './assets';
import {g3} from './fx';

// ---------------------------------------------------------------- pişti efekti
/** Durağan küçük resim için animasyonun hangi anı (süre oranı) dondurulur */
const STILL_AT: Record<string, number> = {altin: 0.8, havai: 0.35, nazar: 0.42, lale: 0.5, simsek: 0.3, davul: 0.5, girdap: 0.45};
/** Döngü aralığı (ms) */
const LOOP_MS: Record<string, number> = {altin: 2300, havai: 2200, nazar: 2000, lale: 2100, simsek: 1900, davul: 2200, girdap: 2000};

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
    } else if (id === 'nazar') {
      const W = stage.clientWidth || box.clientWidth || 160;
      const R = Math.min(W, H) * 0.46;
      [80, 320].forEach(d => {
        const wv = P('is-nwave');
        A(wv, [{transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.95}, {transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0}], {duration: 900, delay: d, easing: 'cubic-bezier(.1,.6,.3,1)'});
      });
      const eye = P('is-eye');
      A(eye, [{transform: 'translate(-50%,-50%) scale(.1) rotate(-90deg)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1.15) rotate(8deg)', opacity: 1, offset: 0.16},
        {transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.3}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.72}, {transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0}],
        {duration: 1500, easing: 'ease-out'});
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R * 0.8;
        const b = P('is-bead');
        A(b, [{transform: 'translate(-50%,-50%) scale(.2)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.1},
          {transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${i % 2 ? 200 : -200}deg)`, opacity: 1, offset: 0.7},
          {transform: `translate(calc(-50% + ${(x * 1.1).toFixed(1)}px), calc(-50% + ${(y * 1.1 + 10).toFixed(1)}px)) rotate(${i % 2 ? 280 : -280}deg)`, opacity: 0}],
          {duration: 1300, delay: 100 + i * 12, easing: 'cubic-bezier(.15,.7,.35,1)'});
      }
    } else if (id === 'lale') {
      const glow = P('is-lglow');
      A(glow, [{transform: 'translate(-50%,-50%) scale(.3)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.3}, {transform: 'translate(-50%,-50%) scale(1.15)', opacity: 0}], {duration: 1600, easing: 'ease-out'});
      const tu = P('is-tulip');
      A(tu, [{transform: 'translate(-50%,-76%) scale(.3, 0)', opacity: 0}, {transform: 'translate(-50%,-76%) scale(1.1, 1.2)', opacity: 1, offset: 0.18},
        {transform: 'translate(-50%,-76%) scale(.96, .92)', opacity: 1, offset: 0.28}, {transform: 'translate(-50%,-76%) scale(1)', opacity: 1, offset: 0.4},
        {transform: 'translate(-50%,-76%) scale(1)', opacity: 1, offset: 0.78}, {transform: 'translate(-50%,-86%) scale(1.06)', opacity: 0}], {duration: 1600, easing: 'cubic-bezier(.2,.7,.3,1)'});
      for (let i = 0; i < 14; i++) {
        const pe = P('is-pet' + (i % 5 === 4 ? ' is-g' : i % 2 ? ' is-b' : ''));
        pe.style.left = 4 + ((i * 37) % 92) + '%';
        const fall = H * (0.6 + ((i * 13) % 30) / 100), sway = 10 + (i % 4) * 4;
        A(pe, [{transform: 'translate(-50%, -10px) rotate(0deg)', opacity: 0}, {transform: `translate(calc(-50% + ${sway}px), ${(fall * 0.3).toFixed(0)}px) rotate(${80 + i * 20}deg)`, opacity: 1, offset: 0.25},
          {transform: `translate(calc(-50% - ${sway}px), ${(fall * 0.65).toFixed(0)}px) rotate(${170 + i * 20}deg)`, opacity: 1, offset: 0.6}, {transform: `translate(-50%, ${fall.toFixed(0)}px) rotate(${260 + i * 20}deg)`, opacity: 0}],
          {duration: 1300, delay: 120 + i * 55, easing: 'linear'});
      }
    } else if (id === 'simsek') {
      const fl = P('is-sflash');
      A(fl, [{opacity: 0}, {opacity: 0.85, offset: 0.06}, {opacity: 0.1, offset: 0.14}, {opacity: 0.7, offset: 0.22}, {opacity: 0, offset: 0.5}, {opacity: 0}], {duration: 1400, delay: 60, easing: 'linear'});
      [[50, 1, 0], [26, 2, 260]].forEach(([x, v, d]) => {
        const bo = P(`is-bolt is-${v}`);
        bo.style.left = x + '%';
        A(bo, [{transform: 'translateX(-50%) scaleY(0)', opacity: 1}, {transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: 0.1}, {transform: 'translateX(-50%) scaleY(1)', opacity: 0.3, offset: 0.18},
          {transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: 0.26}, {transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: 0.45}, {transform: 'translateX(-50%) scaleY(1)', opacity: 0}], {duration: 900, delay: 60 + d, easing: 'linear'});
      });
      const ring = P('is-sring');
      A(ring, [{transform: 'translate(-50%,-50%) scale(.2)', opacity: 1}, {transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0}], {duration: 700, delay: 150, easing: 'cubic-bezier(.1,.6,.3,1)'});
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * (0.1 + (i / 9) * 0.8), d = 26 + (i % 3) * 10;
        const sp = P('is-zap');
        const deg = (a * 180) / Math.PI;
        A(sp, [{transform: `rotate(${deg}deg) translateX(0) scaleX(.4)`, opacity: 1}, {transform: `rotate(${deg}deg) translateX(${d * 0.7}px) scaleX(1.6)`, opacity: 1, offset: 0.3},
          {transform: `rotate(${deg}deg) translateX(${d}px) scaleX(.3)`, opacity: 0}], {duration: 650, delay: 160 + i * 15, easing: 'ease-out'});
      }
    } else if (id === 'davul') {
      const drum = P('is-drum');
      const beats = [260, 560, 860];
      const D = 1700;
      const dk: Keyframe[] = [{transform: 'translate(-50%,-50%) scale(0)', opacity: 0, offset: 0}, {transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.08}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.12}];
      for (const b of beats) dk.push({transform: 'translate(-50%,-50%) scale(1.14, .84)', opacity: 1, offset: (b + 30) / D}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: (b + 130) / D});
      dk.push({transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.85}, {transform: 'translate(-50%,-60%) scale(.9)', opacity: 0, offset: 1});
      A(drum, dk, {duration: D, easing: 'ease-out'});
      const zu = P('is-zurna');
      A(zu, [{transform: 'translate(-120%, -50%) rotate(-24deg)', opacity: 0}, {transform: 'translate(0, -50%) rotate(-14deg)', opacity: 1, offset: 0.16}, {transform: 'translate(0, -50%) rotate(-9deg)', opacity: 1, offset: 0.4},
        {transform: 'translate(0, -50%) rotate(-15deg)', opacity: 1, offset: 0.6}, {transform: 'translate(0, -50%) rotate(-11deg)', opacity: 1, offset: 0.82}, {transform: 'translate(-120%, -60%) rotate(-30deg)', opacity: 0}], {duration: D, easing: 'ease-in-out'});
      beats.forEach((b, bi) => {
        const wv = P('is-dwave');
        A(wv, [{transform: 'translate(-50%,-50%) scale(.35)', opacity: 0.95}, {transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0}], {duration: 520, delay: b, easing: 'cubic-bezier(.1,.6,.3,1)'});
        for (let j = 0; j < 3; j++) {
          const nt = P(`is-note is-${1 + ((bi * 3 + j) % 4)}`);
          const x = (j - 1) * 34 + (bi - 1) * 8, y = -H * (0.38 + j * 0.05);
          A(nt, [{transform: 'translate(-50%,-50%) scale(.3)', opacity: 0}, {transform: `translate(calc(-50% + ${(x * 0.4).toFixed(0)}px), calc(-50% + ${(y * 0.35).toFixed(0)}px)) rotate(-15deg) scale(1.1)`, opacity: 1, offset: 0.3},
            {transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y.toFixed(0)}px)) rotate(15deg) scale(1)`, opacity: 0}], {duration: 800, delay: b + j * 40, easing: 'ease-out'});
        }
      });
    } else if (id === 'girdap') {
      const W = stage.clientWidth || box.clientWidth || 160;
      const disc = P('is-disc');
      A(disc, [{transform: 'translate(-50%,-50%) scale(1.3) rotate(0deg)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1.1) rotate(140deg)', opacity: 0.9, offset: 0.2},
        {transform: 'translate(-50%,-50%) scale(.7) rotate(360deg)', opacity: 1, offset: 0.6}, {transform: 'translate(-50%,-50%) scale(.08) rotate(600deg)', opacity: 0}], {duration: 1300, easing: 'ease-in'});
      const cols = ['#ff2e4d', '#ffb400', '#16c45b', '#1f7bff'];
      const R0 = Math.hypot(W, H) * 0.55;
      for (let i = 0; i < 16; i++) {
        const arm = i % 4, j = Math.floor(i / 4);
        const gp = P('is-gp');
        gp.style.color = cols[arm];
        const a0 = (arm * Math.PI) / 2 + j * 0.4;
        const kf: Keyframe[] = [];
        for (const q of [0, 0.25, 0.5, 0.75, 1]) {
          const r = R0 * Math.pow(1 - q, 1.4) * (0.7 + 0.1 * j), th = a0 + Math.PI * 2 * Math.pow(q, 0.8);
          const x = Math.cos(th) * r, y = Math.sin(th) * r * 0.82;
          kf.push({transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${((th * 180) / Math.PI + 90).toFixed(0)}deg)`, opacity: q === 0 || q === 1 ? 0 : 1, offset: q});
        }
        A(gp, kf, {duration: 1000, delay: j * 50 + arm * 15, easing: 'cubic-bezier(.4,0,.8,.6)'});
      }
      const ring = P('is-sring');
      ring.style.top = '50%';
      A(ring, [{transform: 'translate(-50%,-50%) scale(.2)', opacity: 1}, {transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0}], {duration: 600, delay: 1050, easing: 'cubic-bezier(.1,.6,.3,1)'});
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
        a.currentTime = t + (Number(a.effect?.getTiming().duration) || 0) * (STILL_AT[id] ?? 0.4);
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
    timer = window.setTimeout(() => (loops < 4 && box.isConnected ? cycle() : undefined), LOOP_MS[id] ?? 1900);
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
