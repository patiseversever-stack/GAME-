// Market / koleksiyon önizlemeleri (hepsi HTML dizgesi üretir; DOM'a tek seferde girer, sonradan çizim yapmaz):
//  - deste: pişmiş şeritten kartlar (src/ui/deckpv.ts) → yelpaze. Tuval yok, blob yok, gözlemci yok: anında görünür.
//  - masa: TableTheme.swatch (SVG minyatür) zemini + kuşanılı destenin GERÇEK kartları (yığın, deste, el) → "masan böyle olur".
//    Büyük sahnede (ürün penceresi / dene) boyalı zemin, pencere açılış animasyonu bittikten sonra boşta eklenir ve önbelleğe alınır.
//  - pişti efekti: src/ui/fxpreview.ts (mountFx) — ızgarada donmuş kare, görünür olunca sırayla kurulur.
import './previews.css';
import {TABLES, tableById} from '../themes/tables';
import type {TableTheme} from '../themes/contract';
import {ANIM, esc} from './dom';
import {suitSvg} from './icons';
import {CI, deckCardHtml, hasDeck} from './deckpv';

export {hasDeck};

// ---------------------------------------------------------------- deste yelpazesi
/** Yelpazede gösterilen kartlar (soldan sağa); ortadaki en önde. */
const FAN3 = [CI.back, CI.jack, CI.ace] as const;
const FAN5 = [CI.back, CI.ace, CI.jack, CI.king, CI.queen] as const;

/** Kart yelpazesi HTML'i (n = 3 ya da 5 kart). Destesi olmayan katalog girdisi için "Hazırlanıyor" yer tutucusu. */
export function fanHtml(id: string, n: 3 | 5 = 3, cls = ''): string {
  const pick = n === 5 ? FAN5 : FAN3;
  const mid = (pick.length - 1) / 2;
  if (!hasDeck(id))
    return `<span class="kh-fan is-${n} is-soon ${cls}">${pick.map((_, i) => `<span class="kh-fan__c" style="--i:${i - mid};--z:${10 - Math.abs(i - mid) * 2}"><span class="kh-fan__ph">${suitSvg((['s', 'd', 'h', 'c', 's'] as const)[i % 5])}</span></span>`).join('')}</span>`;
  return `<span class="kh-fan is-${n} ${cls}">${pick.map((ci, i) => deckCardHtml(id, ci, i === mid ? 'kh-fan__c is-mid' : 'kh-fan__c', `--i:${i - mid};--z:${10 - Math.abs(i - mid) * 2}`)).join('')}</span>`;
}

/** Eski arayüz: kutuya yelpaze kurar. */
export function mountDeckFan(box: HTMLElement, id: string, n: 3 | 5 = 3): void {
  box.innerHTML = fanHtml(id, n);
}

// ---------------------------------------------------------------- sıralı kurulum (ağır önizlemeler: efekt)
const mountQueue: Array<() => void> = [];
let pumping = false;
function pump(): void {
  if (pumping) return;
  pumping = true;
  const step = (): void => {
    const t0 = performance.now();
    // kare başına ~6 ms bütçe; en az bir iş
    do {
      const f = mountQueue.shift();
      if (!f) break;
      try {
        f();
      } catch {
        /* tek önizleme bozuksa diğerleri çalışsın */
      }
    } while (mountQueue.length && performance.now() - t0 < 6);
    if (mountQueue.length) requestAnimationFrame(step);
    else pumping = false;
  };
  requestAnimationFrame(step);
}

/**
 * Ağır önizlemeyi görünür olunca, kare başına küçük bir bütçeyle kur. Görünürlük gözlemcisi her ortamda güvenilir
 * olmayabilir (gömülü, farklı kökenli çerçeve): 700 ms içinde haber gelmezse kutu ekrandaysa yine kurulur.
 */
export function deferMount(box: HTMLElement, fn: () => void): void {
  let done = false;
  const enqueue = (): void => {
    if (done) return;
    done = true;
    io?.disconnect();
    mountQueue.push(() => {
      if (box.isConnected) fn();
    });
    pump();
  };
  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && enqueue(), {rootMargin: '160px'});
    io.observe(box);
    const check = (): void => {
      if (done || !box.isConnected) return io?.disconnect();
      const r = box.getBoundingClientRect();
      if (r.width && r.bottom > -160 && r.top < innerHeight + 160) enqueue();
      else setTimeout(check, 1500);
    };
    setTimeout(check, 700);
  } else enqueue();
}

// ---------------------------------------------------------------- masa
const TABLE_FALLBACK: Record<string, string> = {
  kizil: 'radial-gradient(120% 75% at 50% 46%, #e8334a 0%, #a8142c 32%, #6e0a1e 62%, #3a0512 100%)',
  zumrut: 'radial-gradient(120% 75% at 50% 46%, #22c472 0%, #0f8a4a 34%, #075a32 64%, #03301b 100%)',
};
export const hasTable = (id: string): boolean => TABLES.some(t => t.id === id);
export function tableSwatch(id: string): string {
  const t = TABLES.find(x => x.id === id);
  return t?.swatch ?? t?.vars['--ar-bg'] ?? TABLE_FALLBACK[id] ?? TABLES[0].swatch ?? '#14228a';
}
function themeOf(id: string): TableTheme | null {
  return hasTable(id) ? tableById(id) : null;
}

export interface SceneOpts {
  /** Kartların destesi (kuşanılı deste) */
  deck: string;
  /** 'mini': ızgara (yığın + deste) · 'full': ürün penceresi/dene (rakip eli, deste, yığın, oyuncu eli) */
  size?: 'mini' | 'full';
  cls?: string;
}

/**
 * Masa sahnesi HTML'i: zemin (swatch) + yığın halkası + gerçek kartlar. Kartlar CSS dönüşümüyle yerleşik, durağan.
 * full: üstte rakibin kapalı eli, solda deste, ortada yığın (iki yüz), altta oyuncunun eli (dört yüz).
 */
export function tableSceneHtml(id: string, o: SceneOpts): string {
  const t = themeOf(id);
  const ring = t?.vars['--ar-ring'] ?? 'rgba(160,185,255,.55)';
  const glow = t?.vars['--ar-glow-n'] ?? 'rgba(120,150,255,.38)';
  const d = o.deck;
  const full = o.size === 'full';
  const pile = `<span class="kh-ts__pile">${deckCardHtml(d, CI.ten, 'kh-ts__c is-p1')}${deckCardHtml(d, CI.queen, 'kh-ts__c is-p2')}</span>`;
  const stack = `<span class="kh-ts__deck">${deckCardHtml(d, CI.back, 'kh-ts__c is-d1')}${deckCardHtml(d, CI.back, 'kh-ts__c is-d2')}</span>`;
  const opp = full ? `<span class="kh-ts__opp">${[0, 1, 2, 3].map(i => deckCardHtml(d, CI.back, 'kh-ts__c', `--i:${i - 1.5}`)).join('')}</span>` : '';
  const hand = full ? `<span class="kh-ts__hand">${[CI.ace, CI.jack, CI.king, CI.ten].map((ci, i) => deckCardHtml(d, ci, 'kh-ts__c', `--i:${i - 1.5}`)).join('')}</span>` : '';
  return `<span class="kh-ts ${full ? 'is-full' : 'is-mini'}${full && t?.paint ? ' is-paint' : ''} ${o.cls ?? ''}" data-table="${id}" style="--ring:${ring};--glow:${glow}">
    <i class="kh-ts__bg" style="background:${esc(tableSwatch(id))}"></i><i class="kh-ts__glow"></i><i class="kh-ts__ring"></i>
    ${opp}${stack}${pile}${hand}<i class="kh-ts__vig"></i></span>`;
}

/** Eski arayüz: kutuya küçük masa kurar (deste verilmezse varsayılan). */
export function mountTable(box: HTMLElement, id: string, big = false, deck = 'yildizli'): void {
  box.innerHTML = tableSceneHtml(id, {deck, size: big ? 'full' : 'mini'});
  if (big) paintTableLater(box.firstElementChild as HTMLElement, id);
}

// boyalı zeminler: masa başına en çok 2 tuval önbellekte (yeniden açılışta tekrar çizilmez)
const paintCache = new Map<string, HTMLCanvasElement>();
/**
 * Büyük sahneye boyalı zemini ekle: çağıran animasyonun bitmesini bekler (delay), sonra boşta çizer.
 * Zemin swatch ile zaten görünür; boyama yalnız inceliği artırır.
 */
export function paintTableLater(scene: HTMLElement, id: string, delay = 520): void {
  const t = themeOf(id);
  if (!t?.paint) return;
  const go = (): void => {
    if (!scene.isConnected) return;
    const r = scene.getBoundingClientRect();
    const w = Math.max(120, Math.round(r.width)), hh = Math.max(160, Math.round(r.height));
    const key = `${id}:${w}x${hh}`;
    const put = (c: HTMLCanvasElement): void => {
      if (!scene.isConnected) return;
      c.classList.add('kh-ts__paint');
      scene.querySelector('.kh-ts__bg')?.after(c);
      if (ANIM) c.animate([{opacity: 0}, {opacity: 1}], {duration: 360, easing: 'ease-out'});
    };
    const hit = paintCache.get(key);
    if (hit) return put(hit);
    Promise.resolve(t.paint!(w, hh, Math.min(2, window.devicePixelRatio || 1)))
      .then(c => {
        paintCache.set(key, c);
        while (paintCache.size > 2) paintCache.delete(paintCache.keys().next().value!);
        put(c);
      })
      .catch(() => undefined);
  };
  const w = window as unknown as {requestIdleCallback?: (f: () => void, o?: {timeout: number}) => number};
  setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(go, {timeout: 600}) : go()), ANIM ? delay : 0);
}

// pişti efekti önizlemeleri ayrı dosyada (src/ui/fxpreview.ts)
export {mountFx, type FxLoop} from './fxpreview';
