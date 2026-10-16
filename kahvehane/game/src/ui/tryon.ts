// "DENE": ürünü almadan önce oyunun içinde gör. Tam ekran masa sahnesi; denenen ürün yerine konur, gerisi kuşanılı:
//   deste → kartların hepsi o desteden · masa → zemin o masa · çerçeve/karakter → senin avatarın onunla ·
//   efekt → bir kart at, pişti yap, efekt masanın üstünde patlasın.
// Kartlar açılışta desteden dağılır; elden karta dokununca kart yığına uçar ve PİŞTİ olur (kuşanılı ya da denenen efekt).
// Hepsi tek seferlik transform/opacity animasyonları; sahnede sürekli döngü yok.
import type {ShopItem} from '../game/catalog';
import {charById} from '../game/roster';
import {ANIM, EASE, Scope, center, esc, fmt, h, play, q} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {charAvatarHtml, onAct, stampWord} from './parts';
import {mountFx, paintTableLater, tableSceneHtml, type FxLoop} from './previews';
import {haptic} from '../platform/bridge';
import type {Shell} from './lobby';

export interface TryOpts {
  /** 0 → sahip (satın alma düğmesi yerine Kuşan) */
  price: number;
  onBuy(): void;
  onEquip(): void;
}

export function openTryOn(shell: Shell, it: ShopItem, o: TryOpts): void {
  const ctx = shell.ctx;
  const d = shell.profile.data;
  const scope = new Scope();
  const deck = it.kind === 'deck' ? it.id : d.equipped.deck;
  const table = it.kind === 'table' ? it.id : d.equipped.table;
  const frame = it.kind === 'frame' ? it.id : d.equipped.frame;
  const fxId = it.kind === 'fx' ? it.id : d.equipped.fx;
  const meChar = charById(it.kind === 'char' ? it.id : (d.char ?? 'dursun'));
  const opp = charById(meChar.id === 'riza' ? 'cem' : 'riza');
  const owned = shell.profile.owns(it.kind, it.id);
  const eq = it.kind === 'char' ? d.char === it.id : d.equipped[it.kind as 'deck' | 'table' | 'fx' | 'frame'] === it.id;
  const el = h('div', `kh-try is-${it.kind}`);
  el.innerHTML = `<div class="kh-try__scene">${tableSceneHtml(table, {deck, size: 'full'})}</div>
    <div class="kh-try__seat is-opp">${charAvatarHtml(opp, 'standart', 'kh-try__ava')}<span class="kh-try__nm">${esc(opp.name)}</span></div>
    <div class="kh-try__seat is-me">${charAvatarHtml(meChar, frame, 'kh-try__ava')}<span class="kh-try__nm">${esc(d.name)}</span></div>
    <div class="kh-try__fx"></div>
    <header class="kh-try__top"><span class="kh-try__chip">${I.eye}Deneme</span><b class="kh-try__name">${esc(it.name)}</b>
      <button class="kh-iconbtn kh-try__x" data-act="x" aria-label="Kapat">${I.close}</button></header>
    <div class="kh-try__hint">${I.hand}<span>Bir kart at, pişti yap!</span></div>
    <footer class="kh-try__bar">${
      eq
        ? `<button class="kh-btn kh-btn--4 kh-btn--xl kh-btn--block" data-act="x">${I.check}<span>Kuşanıldı · Kapat</span></button>`
        : owned
          ? `<button class="kh-btn kh-btn--5 kh-btn--xl kh-btn--block" data-act="equip">${I.check}<span>Kuşan</span></button>`
          : `<button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-try__buy" data-act="buy"><span>Satın Al</span><span class="kh-pd__cost"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(o.price)}</b></span></button>`
    }</footer>`;
  ctx.layer.append(el);
  const scene = q(el, '.kh-ts');
  const fxBox = q(el, '.kh-try__fx');
  paintTableLater(scene, table, 420);
  let loop: FxLoop | null = null;
  scope.add(() => loop?.stop());

  // giriş: sahne açılır, kartlar desteden dağılır
  play(el, [{opacity: 0}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
  play(q(el, '.kh-try__scene'), [{transform: 'scale(1.08)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, easing: EASE.outQuart});
  const deckEl = scene.querySelector('.kh-ts__deck');
  const from = deckEl ? center(deckEl) : {x: innerWidth * 0.15, y: innerHeight * 0.5};
  scene.querySelectorAll<HTMLElement>('.kh-ts__hand .kh-ts__c, .kh-ts__opp .kh-ts__c').forEach((c, i) => {
    const to = center(c);
    play(c, [{translate: `${from.x - to.x}px ${from.y - to.y}px`, scale: '.6', opacity: 0}, {translate: '0 0', scale: '1', opacity: 1}], {duration: 420, delay: 220 + i * 70, easing: EASE.out, fill: 'backwards'});
  });
  for (const s of el.querySelectorAll('.kh-try__seat, .kh-try__top, .kh-try__bar, .kh-try__hint'))
    play(s, [{transform: 'translateY(14px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 300, easing: EASE.spring, fill: 'backwards'});

  // elden kart at → yığına uçar → pişti + efekt
  let busy = false;
  const pile = scene.querySelector('.kh-ts__pile');
  scope.on(scene, 'click', e => {
    const c = (e.target as Element).closest<HTMLElement>('.kh-ts__hand .kh-ts__c');
    if (!c || busy || !pile) return;
    busy = true;
    ctx.sounds.tap();
    haptic('light');
    q(el, '.kh-try__hint').classList.add('is-off');
    const a = center(c), b = center(pile);
    const fly = play(c, [{translate: '0 0', rotate: '0deg'}, {translate: `${b.x - a.x}px ${b.y - a.y - 6}px`, rotate: '-18deg'}], {duration: 360, easing: EASE.out, fill: 'forwards'});
    fly.finished
      .then(() => {
        if (!scope.alive) return;
        ctx.sounds.coin(1);
        haptic('success');
        if (fxId !== 'klasik') stampWord(ctx, 'PİŞTİ!', {x: b.x, y: b.y - 40}, {size: 3.6, ms: 1200});
        loop?.stop();
        loop = mountFx(fxBox, fxId, false);
        loop.play();
        scope.timeout(() => loop?.stop(), 2400);
        scope.timeout(() => {
          fly.cancel();
          play(c, [{opacity: 0, scale: '.8'}, {opacity: 1, scale: '1'}], {duration: 260, easing: EASE.out});
          busy = false;
        }, 2500);
      })
      .catch(() => (busy = false));
  });

  const close = (): void => {
    if (!scope.alive) return;
    el.style.pointerEvents = 'none';
    const fin = (): void => {
      scope.dispose();
      el.remove();
    };
    if (!ANIM) return fin();
    el.animate([{opacity: 1}, {opacity: 0}], {duration: 200, easing: 'ease-in', fill: 'forwards'}).onfinish = fin;
  };
  onAct(scope, el, a => {
    if (a === 'x') {
      ctx.sounds.tap();
      close();
    } else if (a === 'buy') {
      close();
      o.onBuy();
    } else if (a === 'equip') {
      close();
      o.onEquip();
    }
  });
}
