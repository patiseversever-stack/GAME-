// Blöf el düzeni: iki düzenin küçük önizlemesi (ayarlar, seçici) ve ilk Blöf'te çıkan tam ekran seçici.
// Önizleme gerçek kuşanılmış destenin yüzlerini kullanır (deckpv şeridinden dilim: A♠ 10♦ J♥ Q♦ K♣), ~14 kart.
//   Gruplu: aynı değerler bir arada, üst üste binmiş küçük yelpaze yığınlar + ×N rozeti.
//   Klasik: bütün kartlar iki sıra yelpaze.
// Seçici: ekran ikiye bölünür (üst Gruplu, alt Klasik); her yarı tam bir dokunma hedefi. Yarılarda yumuşak bir gösterim döngüsü
// (bir parmak dokunur, iki kart altın parıltıyla kalkar): yalnız transform/opacity, yalnız seçici açıkken; kapanınca sökülür.
import './handchooser.css';
import {HAND_INFO, type HandLayout} from '../game/types';
import {ANIM, EASE, Scope, h, play, q} from './dom';
import {CI, deckCardHtml, deckOr} from './deckpv';
import {I} from './icons';
import {GAME_ICON} from './gameicons';
import {decorLoops, onAct, type Ctx} from './parts';
import {haptic} from '../platform/bridge';

/** Önizlemedeki el: değer, kart sayısı (A×2, 10×3, J×2, Q×3, K×4 = 14). Deste şeridinde her değerin tek yüzü var. */
const HAND: {ci: number; n: number}[] = [
  {ci: CI.ace, n: 2},
  {ci: CI.ten, n: 3},
  {ci: CI.jack, n: 2},
  {ci: CI.queen, n: 3},
  {ci: CI.king, n: 4},
];

/** Tek kart: kaldırılabilir iç kap + altın parıltı halkası. i: dizin, rot: eğim (derece), y: dikey kayma (kart genişliği oranı) */
function cardHtml(deck: string, ci: number, style: string, key: string): string {
  return `<span class="kh-hpv__w" style="${style}" data-k="${key}"><span class="kh-hpv__l">${deckCardHtml(deck, ci, 'kh-hpv__c')}<i class="kh-hpv__glow"></i></span></span>`;
}

/**
 * Düzen önizlemesi. Kapsayıcı kutusuna (container query) göre ölçeklenir: kutuyu dışarıdan boyutlandır (genişlik + yükseklik).
 * Demo için hedef kartlar `data-k="a"` (ilk dokunulan) ve `data-k="b"` (ikinci) olarak işaretlenir.
 */
export function handPreviewHtml(layout: HandLayout, deck: string, cls = ''): string {
  const d = deckOr(deck);
  let body = '';
  if (layout === 'group') {
    const stack = ({ci, n}: {ci: number; n: number}, gi: number) => {
      const cards = Array.from({length: n}, (_, i) => {
        const key = gi === 4 ? (i === n - 1 ? 'a' : i === n - 2 ? 'b' : '') : '';
        // yığın içinde sağa doğru kayarak açılır, hafif yelpaze
        return cardHtml(d, ci, `--i:${i};--rot:${((i - (n - 1) / 2) * 3.4).toFixed(1)}deg`, key);
      }).join('');
      return `<span class="kh-hpv__g" style="--n:${n}">${cards}${n > 1 ? `<i class="kh-hpv__x">×${n}</i>` : ''}</span>`;
    };
    // yığınlar iki satıra dizilir (3 + 2): kartlar büyük kalır, ×N rozetleri okunur
    body = `<span class="kh-hpv__row"><span class="kh-hpv__gr">${HAND.slice(0, 3).map((g, i) => stack(g, i)).join('')}</span><span class="kh-hpv__gr">${HAND.slice(3).map((g, i) => stack(g, i + 3)).join('')}</span></span>`;
  } else {
    const cis = HAND.flatMap(({ci, n}) => Array.from({length: n}, () => ci));
    const rows = [cis.slice(0, 7), cis.slice(7)];
    body = `<span class="kh-hpv__sp">${rows.map((row, r) => `<span class="kh-hpv__r">${row.map((ci, i) => {
      const c = (row.length - 1) / 2;
      const key = r === 0 ? (i === 2 ? 'a' : '') : i === 4 ? 'b' : '';
      return cardHtml(d, ci, `--rot:${((i - c) * 2.6).toFixed(1)}deg;--dy:${(Math.abs(i - c) ** 1.6 * 0.018).toFixed(3)}`, key);
    }).join('')}</span>`).join('')}</span>`;
  }
  return `<span class="kh-hpv is-${layout} ${cls}">${body}</span>`;
}

/** Parmak (dokunma gösterimi): beyaz dolgu, lacivert kontur. */
const FINGER = `<svg class="kh-hc__fg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.3 3.4a1.8 1.8 0 0 1 3.6 0v6.2l1.6-.5a1.7 1.7 0 0 1 2.1 1.2l.4-.1a1.7 1.7 0 0 1 2 1.3l.3-.1a1.7 1.7 0 0 1 2.1 1.7v3.5c0 3.7-2.7 6.6-6.4 6.6h-1.3a6.2 6.2 0 0 1-4.8-2.3l-3.5-4.5a1.8 1.8 0 0 1 2.7-2.2l1.6 1.6z" fill="#fff" stroke="#0a1033" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

/** Gösterim döngüsü: süre (ms). Parmak a'ya, sonra b'ye dokunur; iki kart kalkar, parlar; sonra başa. */
const LOOP = 4200;

/** Bir yarının önizlemesine yumuşak gösterim döngüsünü bağlar (yalnız transform/opacity). Kapsama bağlı: kapanınca iptal. */
function demo(scope: Scope, pv: HTMLElement): void {
  const loop = decorLoops() ? Infinity : 1;
  const a = pv.querySelector<HTMLElement>('[data-k="a"]');
  const b = pv.querySelector<HTMLElement>('[data-k="b"]');
  if (!a || !b) return;
  const opt = (): KeyframeAnimationOptions => ({duration: LOOP, iterations: loop, easing: 'linear'});
  const lift = (w: HTMLElement, t0: number): void => {
    const l = q(w, '.kh-hpv__l'), g = q(w, '.kh-hpv__glow');
    const t = (x: number) => x;
    scope.track(play(l, [
      {transform: 'translateY(0) scale(1)', offset: 0},
      {transform: 'translateY(0) scale(1)', offset: t(t0)},
      {transform: 'translateY(-17%) scale(1.06)', offset: t(t0 + 0.07), easing: 'cubic-bezier(.3,1.5,.5,1)'},
      {transform: 'translateY(-17%) scale(1.06)', offset: 0.88},
      {transform: 'translateY(0) scale(1)', offset: 0.95},
      {transform: 'translateY(0) scale(1)', offset: 1},
    ], opt(), 0.6));
    scope.track(play(g, [
      {opacity: 0, offset: 0}, {opacity: 0, offset: t(t0)}, {opacity: 1, offset: t(t0 + 0.07)}, {opacity: 1, offset: 0.88}, {opacity: 0, offset: 0.95}, {opacity: 0, offset: 1},
    ], opt(), 0.6));
    // parmak: karta yaklaşır, basar, çekilir
    const f = h('span', 'kh-hc__f', FINGER);
    w.append(f);
    scope.add(() => f.remove());
    scope.track(play(f, [
      {opacity: 0, transform: 'translate(6%, 70%) scale(1)', offset: 0},
      {opacity: 0, transform: 'translate(6%, 70%) scale(1)', offset: Math.max(0, t0 - 0.1)},
      {opacity: 1, transform: 'translate(4%, 38%) scale(1)', offset: t0 - 0.03},
      {opacity: 1, transform: 'translate(4%, 34%) scale(.86)', offset: t0 + 0.015},
      {opacity: 1, transform: 'translate(4%, 38%) scale(1)', offset: t0 + 0.05},
      {opacity: 0, transform: 'translate(6%, 70%) scale(1)', offset: t0 + 0.13},
      {opacity: 0, transform: 'translate(6%, 70%) scale(1)', offset: 1},
    ], opt(), 0.6));
  };
  lift(a, 0.2);
  lift(b, 0.42);
}

export function handChooser(ctx: Ctx, deck: string): Promise<HandLayout> {
  const scope = new Scope();
  const s = ctx.sounds;
  const el = h('div', 'kh-screen kh-hc');
  const half = (l: HandLayout) => `<button class="kh-hc__half is-${l}" data-act="pick" data-h="${l}" aria-label="${HAND_INFO[l].name}: ${HAND_INFO[l].desc}">
      <i class="kh-hc__bg"></i>
      <span class="kh-hc__pv kh-keep">${handPreviewHtml(l, deck)}</span>
      <span class="kh-hc__txt"><b>${l === 'group' ? I.cards : I.fan}${HAND_INFO[l].name}</b><small>${HAND_INFO[l].desc}</small></span>
    </button>`;
  el.innerHTML = `<header class="kh-hc__head"><span class="kh-hc__kick">${GAME_ICON.blof}<span>Blöf</span></span><div class="kh-hc__q">Kartlarını nasıl görmek istersin?</div></header>
    <div class="kh-hc__body">${half('group')}${half('spread')}<i class="kh-hc__or">ya da</i></div>
    <footer class="kh-hc__note">${I.gear}<span>Ayarlardan istediğin zaman değiştirebilirsin</span></footer>`;
  ctx.layer.append(el);
  const g = (sel: string) => q(el, sel);

  // giriş: iki yarı karşıdan kayar (≤ 340 ms)
  play(g('.kh-hc__head'), [{transform: 'translateY(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.out, fill: 'backwards'});
  play(g('.is-group'), [{transform: 'translateY(-14%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 40, easing: EASE.outQuart, fill: 'backwards'});
  play(g('.is-spread'), [{transform: 'translateY(14%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 90, easing: EASE.outQuart, fill: 'backwards'});
  play(g('.kh-hc__or'), [{transform: 'translate(-50%, -50%) scale(.3)', opacity: 0}, {transform: 'translate(-50%, -50%) scale(1)', opacity: 1}], {duration: 320, delay: 320, easing: EASE.spring, fill: 'backwards'});
  play(g('.kh-hc__note'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 420, fill: 'backwards'});
  // gösterim döngüsü (seçici açıkken); biraz gecikmeli başlar, iki yarı aynı anda
  scope.timeout(() => el.querySelectorAll<HTMLElement>('.kh-hc__pv').forEach(pv => demo(scope, pv)), ANIM ? 480 : 0);

  return new Promise(res => {
    let picked = false;
    onAct(scope, el, async (a, b) => {
      if (a !== 'pick' || picked) return;
      picked = true;
      const l = b.dataset.h as HandLayout;
      s.tap();
      haptic('medium');
      // gösterim durur; seçilen yarı parlar, diğeri söner
      el.querySelectorAll<HTMLElement>('.kh-hc__half').forEach(x => x.classList.toggle('is-picked', x === b));
      el.classList.add('is-done');
      if (ANIM) {
        el.getAnimations({subtree: true}).forEach(an => {
          const t = (an.effect as KeyframeEffect | null)?.target as Element | null;
          if (t && t.closest('.kh-hc__pv')) an.cancel();
        });
        const other = q(el, `.kh-hc__half:not(.is-${l})`);
        play(other, [{opacity: 1}, {opacity: 0.18}], {duration: 240, fill: 'forwards', easing: 'ease-out'});
        await play(b, [{transform: 'scale(1)'}, {transform: 'scale(1.025)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 360, easing: EASE.out}).finished.catch(() => undefined);
        await el.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      }
      scope.dispose();
      el.remove();
      res(l);
    });
  });
}
