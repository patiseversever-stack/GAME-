// Deste vitrin kartları: market / koleksiyon / ürün penceresi / dene sahnesi buradan kart çizer.
//
// NEDEN PİŞMİŞ: kaplamayı çalışma anında hazırlamak (Skin.prepare + drawFace) deste başına 0.4–2.4 sn ana iş parçacığı
// demekti (4× yavaş CPU); market 4 desteyi aynı anda istediğinde ekran ~5 sn donuyor, kompozitörde dönen parıltılı yer
// tutucular bunu gizliyordu ("desteler ancak dokununca geliyor"). Artık her deste için TEK bir WebP şerit derleme öncesi
// pişirilir (scripts/bake-decks.mjs → src/ui/deckpv/<id>.webp): [arka, A♠, J♥, K♣, Q♦, 10♦] yan yana.
//
// Gösterim: kart = <i class="kh-dc" data-deck=id style="--ci:k">; şerit bir kez CSS kuralı olarak eklenir
// (.kh-dc[data-deck=id] { background-image }), konum/boyut yüzdeyle seçilir → tek çözümleme, tuval yok, blob yok,
// görünürlük gözlemcisi yok; her yerde anında ve önbellekte. Pişmemiş (yeni eklenmiş) bir deste için şerit çalışma anında,
// sırayla ve boşta, kart kart çizilir; sonucu data: adresi olarak saklanır (blob adresi kullanılmaz: sandbox/CSP güvenli).
import type {Suit} from '../skins/contract';
import {DECKS} from '../skins/index';

export type PvCard = 'back' | readonly [Suit, number];
/** Şeritteki kartlar (sıra önemlidir: CI ile eşleşir) */
export const PV_CARDS: readonly PvCard[] = ['back', ['S', 1], ['H', 11], ['C', 13], ['D', 12], ['D', 10]];
/** Kart dizinleri */
export const CI = {back: 0, ace: 1, jack: 2, king: 3, queen: 4, ten: 5} as const;
export const PV_N = PV_CARDS.length;
export const PV_W = 240;
export const PV_H = Math.round(PV_W / 0.7);
export const PV_GAP = 4;
export const PV_QUALITY = 0.8;

const baked = import.meta.glob('./deckpv/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

// ---------------------------------------------------------------- pişmiş efekt kareleri (scripts/bake-fx.mjs)
/** Pişirme kutusu (CSS px) ve ölçek: ızgara kartı önizlemesine yakın oran */
export const FX_BAKE = {w: 200, h: 180, dpr: 1.6, q: 0.78} as const;
const bakedFx = import.meta.glob('./fxpv/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;
const fxInstalled = new Set<string>();
/** Efektin pişmiş donmuş karesi var mı; varsa CSS kuralını (bir kez) ekler: .kh-fxst[data-fxs=id] */
export function fxStillReady(id: string): boolean {
  if (fxInstalled.has(id)) return true;
  const url = bakedFx[`./fxpv/${id}.webp`];
  if (!url) return false;
  fxInstalled.add(id);
  const s = sheet();
  const rule = `.kh-fxst[data-fxs="${CSS.escape(id)}"]{background-image:url("${url}")}`;
  try {
    s?.insertRule(rule, s.cssRules.length);
  } catch {
    styleEl!.append(rule);
  }
  return true;
}

export const hasDeck = (id: string): boolean => DECKS.some(d => d.id === id);
/** Kayıtta olmayan (kaldırılmış) bir deste kuşanılıysa önizlemeler varsayılan desteyle çizilir (oyun da öyle yapar). */
export const deckOr = (id: string): string => (hasDeck(id) ? id : DECKS[0].id);

// ---------------------------------------------------------------- CSS kuralları (deste başına bir kez)
let styleEl: HTMLStyleElement | null = null;
const installed = new Set<string>();
const SIZE_X = ((PV_N * PV_W + (PV_N - 1) * PV_GAP) / PV_W) * 100; // şerit genişliği / kart genişliği (%)

function sheet(): CSSStyleSheet | null {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.kh = 'deckpv';
    // ortak: şerit boyutu ve kart seçimi (--ci); boşken soluk yer tutucu (kural gelince üzerine yazılır)
    styleEl.textContent = `.kh-dc{background-size:${SIZE_X.toFixed(4)}% 100%;background-position:calc(var(--ci,0) / ${PV_N - 1} * 100%) 0}`;
    document.head.append(styleEl);
  }
  return styleEl.sheet;
}

function install(id: string, url: string): void {
  if (installed.has(id)) return;
  installed.add(id);
  const s = sheet();
  const rule = `.kh-dc[data-deck="${CSS.escape(id)}"]{background-image:url("${url}")}`;
  try {
    s?.insertRule(rule, s.cssRules.length);
  } catch {
    styleEl!.append(rule);
  }
}

/** Deste şeridi hazır mı (pişmiş ya da çizilmiş). */
export function deckReady(id: string): boolean {
  if (installed.has(id)) return true;
  const b = baked[`./deckpv/${id}.webp`];
  if (b) {
    install(id, b);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- pişmemiş deste: sıralı, boşta çizim
const waiting = new Map<string, Promise<boolean>>();
let chain: Promise<unknown> = Promise.resolve();
const idle = (): Promise<void> =>
  new Promise(r => {
    const w = window as unknown as {requestIdleCallback?: (f: () => void, o?: {timeout: number}) => number};
    if (w.requestIdleCallback) w.requestIdleCallback(() => r(), {timeout: 400});
    else setTimeout(r, 30);
  });

async function render(id: string): Promise<boolean> {
  const entry = DECKS.find(d => d.id === id);
  if (!entry) return false;
  try {
    await idle();
    const skin = await entry.load();
    await skin.prepare();
    const strip = document.createElement('canvas');
    strip.width = PV_N * PV_W + (PV_N - 1) * PV_GAP;
    strip.height = PV_H;
    const g = strip.getContext('2d');
    if (!g) return false;
    const card = document.createElement('canvas');
    card.width = PV_W;
    card.height = PV_H;
    const cg = card.getContext('2d');
    if (!cg) return false;
    for (const [i, c] of PV_CARDS.entries()) {
      await idle(); // kart başına bir görev: arayüz akmaya devam eder
      cg.clearRect(0, 0, PV_W, PV_H);
      cg.save();
      if (c === 'back') skin.drawBack(cg, PV_W, PV_H);
      else skin.drawFace(cg, PV_W, PV_H, c[0], c[1]);
      cg.restore();
      g.drawImage(card, i * (PV_W + PV_GAP), 0);
    }
    const blob = await new Promise<Blob | null>(r => strip.toBlob(r, 'image/webp', PV_QUALITY));
    // tuvalleri hemen bırak (bellek)
    strip.width = strip.height = card.width = card.height = 0;
    if (!blob) return false;
    const url = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
    install(id, url);
    return true;
  } catch (e) {
    console.warn('deste önizlemesi çizilemedi', id, e);
    return false;
  }
}

/** Şeridi hazırla: pişmişse hemen true; değilse sıraya alır (aynı anda tek deste çizilir). */
export function ensureDeck(id: string): Promise<boolean> {
  if (deckReady(id)) return Promise.resolve(true);
  if (!hasDeck(id)) return Promise.resolve(false);
  let p = waiting.get(id);
  if (!p) {
    p = chain.then(() => render(id));
    chain = p;
    waiting.set(id, p);
  }
  return p;
}

/**
 * Tek kart HTML'i. ci: CI dizini. Pişmemiş deste için yer tutucu döner ve çizim sıraya girer; şerit gelince
 * aynı öğe kendiliğinden dolar (CSS kuralı) — DOM'a yeniden dokunmak gerekmez.
 */
export function deckCardHtml(id: string, ci: number, cls = '', style = ''): string {
  if (!deckReady(id) && hasDeck(id)) void ensureDeck(id);
  return `<i class="kh-dc ${cls}" data-deck="${id}" style="--ci:${ci};${style}"></i>`;
}
