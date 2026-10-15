// Market / koleksiyon önizlemeleri:
//  - deste: gerçek kaplamayla (Skin.drawFace/drawBack) birkaç kart bir kez çizilir → blob adresleri önbelleğe alınır (tembel).
//  - masa: TableTheme.swatch (ucuz küçük resim) + büyük önizlemede paint() tuvali; kayıtta yoksa yedek renk.
//  - pişti efekti: kutu içinde döngülü küçük gösteri (klasik · havai · yıldız · altın); durağan hâli duraklatılmış kare.
import {DECKS} from '../skins/index';
import {TABLES, tableById} from '../themes/tables';
import type {TableTheme} from '../themes/contract';
import {ANIM, h} from './dom';
import {ASSETS} from './assets';
import {suitSvg} from './icons';
import {g3} from './fx';

// ---------------------------------------------------------------- deste
export interface DeckArt {
  faces: string[];
  back: string;
}
const deckCache = new Map<string, Promise<DeckArt | null>>();
/** Önizleme kartları: maça as, karo 10, kupa vale, sinek papaz. */
const SHOW: [('S' | 'H' | 'D' | 'C'), number][] = [['S', 1], ['D', 10], ['H', 11], ['C', 13]];
const CW = 168, CH = Math.round(168 / 0.7);

export const hasDeck = (id: string): boolean => DECKS.some(d => d.id === id);

export function deckArt(id: string): Promise<DeckArt | null> {
  let p = deckCache.get(id);
  if (p) return p;
  p = (async () => {
    const entry = DECKS.find(d => d.id === id);
    if (!entry) return null;
    try {
      const skin = await entry.load();
      await skin.prepare();
      const draw = async (f: (g: CanvasRenderingContext2D) => void): Promise<string> => {
        // ana iş parçacığını boğmamak için kartlar arasında nefes
        await new Promise(r => setTimeout(r, 0));
        const c = document.createElement('canvas');
        c.width = CW;
        c.height = CH;
        const g = c.getContext('2d')!;
        f(g);
        const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
        return blob ? URL.createObjectURL(blob) : c.toDataURL();
      };
      const faces: string[] = [];
      for (const [s, r] of SHOW) faces.push(await draw(g => skin.drawFace(g, CW, CH, s, r)));
      const back = await draw(g => skin.drawBack(g, CW, CH));
      return {faces, back};
    } catch (e) {
      console.warn('deste önizlemesi çizilemedi', id, e);
      return null;
    }
  })();
  deckCache.set(id, p);
  return p;
}

/** Kart yelpazesi (n kart) → kutuya yerleştirir; yüklenene dek parıldayan yer tutucu. */
export function mountDeckFan(box: HTMLElement, id: string, n: 3 | 5 = 3): void {
  box.classList.add('kh-fan', `is-${n}`);
  const slots = Array.from({length: n}, (_, i) => `<span class="kh-fan__c" style="--i:${i - (n - 1) / 2}"><i class="kh-shimmer"></i></span>`).join('');
  box.innerHTML = slots;
  if (!hasDeck(id)) {
    box.classList.add('is-soon');
    box.querySelectorAll('.kh-fan__c').forEach((c, i) => (c.innerHTML = `<span class="kh-fan__ph">${suitSvg((['s', 'd', 'h', 'c', 's'] as const)[i % 5])}</span>`));
    return;
  }
  const go = () =>
    deckArt(id).then(a => {
      if (!a || !box.isConnected) return;
      const pics = n === 5 ? [a.back, ...a.faces] : [a.faces[0], a.faces[2], a.faces[1]];
      box.querySelectorAll<HTMLElement>('.kh-fan__c').forEach((c, i) => {
        const img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.src = pics[i];
        img.onload = () => {
          c.innerHTML = '';
          c.append(img);
          if (ANIM) img.animate([{opacity: 0, transform: 'scale(.9)'}, {opacity: 1, transform: 'none'}], {duration: 260, delay: i * 60, easing: 'ease-out', fill: 'backwards'});
        };
      });
    });
  // görünür olunca çiz (market ızgarası uzun olabilir)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) {
        io.disconnect();
        go();
      }
    });
    io.observe(box);
  } else go();
}

// ---------------------------------------------------------------- masa
const TABLE_FALLBACK: Record<string, string> = {
  kizil: 'repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,220,160,.07) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg), radial-gradient(120% 75% at 50% 46%, #e8334a 0%, #a8142c 32%, #6e0a1e 62%, #3a0512 100%)',
  zumrut: 'repeating-conic-gradient(from 0deg at 50% 46%, rgba(220,255,200,.06) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg), radial-gradient(120% 75% at 50% 46%, #22c472 0%, #0f8a4a 34%, #075a32 64%, #03301b 100%)',
};
export const hasTable = (id: string): boolean => TABLES.some(t => t.id === id);
export function tableSwatch(id: string): string {
  const t = TABLES.find(x => x.id === id);
  return t?.swatch ?? t?.vars['--ar-bg'] ?? TABLE_FALLBACK[id] ?? TABLES[0].swatch ?? '#14228a';
}

/** Küçük masa: zemin + halka + iki kart + deste. big: boyalı zemin tuvali (varsa) arkaya eklenir. */
export function mountTable(box: HTMLElement, id: string, big = false): void {
  box.classList.add('kh-mtab');
  box.style.background = tableSwatch(id);
  const t: TableTheme | null = hasTable(id) ? tableById(id) : null;
  const ring = t?.vars['--ar-ring'] ?? 'rgba(160,185,255,.5)';
  box.innerHTML = `<i class="kh-mtab__glow" style="--g:${t?.vars['--ar-glow-n'] ?? 'rgba(140,170,255,.35)'}"></i>
    <i class="kh-mtab__ring" style="border-color:${ring}"></i>
    <i class="kh-mtab__deck"></i><i class="kh-mtab__card is-a"></i><i class="kh-mtab__card is-b"></i>
    <i class="kh-mtab__vig"></i>`;
  if (big && t?.paint) {
    const r = box.getBoundingClientRect();
    const w = Math.max(120, Math.round(r.width)), hh = Math.max(160, Math.round(r.height));
    Promise.resolve(t.paint(w, hh, Math.min(2, window.devicePixelRatio || 1)))
      .then(c => {
        if (!box.isConnected) return;
        c.classList.add('kh-mtab__paint');
        box.prepend(c);
        if (ANIM) c.animate([{opacity: 0}, {opacity: 1}], {duration: 400, easing: 'ease-out'});
      })
      .catch(() => undefined);
  }
}

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
