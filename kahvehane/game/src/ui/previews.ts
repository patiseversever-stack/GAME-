// Market / koleksiyon önizlemeleri:
//  - deste: gerçek kaplamayla (Skin.drawFace/drawBack) birkaç kart bir kez çizilir → blob adresleri önbelleğe alınır (tembel).
//  - masa: TableTheme.swatch (ucuz küçük resim) + büyük önizlemede paint() tuvali; kayıtta yoksa yedek renk.
//  - pişti efekti: kutu içinde döngülü küçük gösteri (klasik · havai · yıldız · altın); durağan hâli duraklatılmış kare.
import {DECKS} from '../skins/index';
import {TABLES, tableById} from '../themes/tables';
import type {TableTheme} from '../themes/contract';
import {ANIM} from './dom';
import {suitSvg} from './icons';

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

// ---------------------------------------------------------------- sıralı kurulum
const mountQueue: Array<() => void> = [];
let pumping = false;
function pump(): void {
  if (pumping) return;
  pumping = true;
  const step = (): void => {
    const f = mountQueue.shift();
    if (f) {
      try {
        f();
      } catch {
        /* tek önizleme bozuksa diğerleri çalışsın */
      }
    }
    if (mountQueue.length) requestAnimationFrame(step);
    else pumping = false;
  };
  requestAnimationFrame(step);
}
/**
 * Ağır önizlemeyi (efekt, vb.) görünür olunca ve kare başına BİR tane kur: sayfa açılırken 8-10 önizlemenin
 * tek görevde kurulup ekranı donduran (zayıf telefonda ~250 ms) hâli olmasın.
 */
export function deferMount(box: HTMLElement, fn: () => void): void {
  const enqueue = (): void => {
    mountQueue.push(() => {
      if (box.isConnected) fn();
    });
    pump();
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) {
        io.disconnect();
        enqueue();
      }
    }, {rootMargin: '120px'});
    io.observe(box);
  } else enqueue();
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

// pişti efekti önizlemeleri ayrı dosyada (src/ui/fxpreview.ts)
export {mountFx, type FxLoop} from './fxpreview';
