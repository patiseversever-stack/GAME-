// El sonu: başlık damgası, kazanan(lar) zafer pozunda büyük, kaybedenler üzgün; rakibin son sözü balonda;
// puan tablosu satır satır açılır ve sayar (kart, çoğunluk +3, ♣2, ♦10, as, vale, pişti), toplam vurgusu; eşlide takım toplamları;
// jetonlar bakiyeye uçar, XP çubuğu dolar, seviye atlamada kutlama + ödül + açılan masa; galibiyet serisi rozeti.
// "Bir El Daha" / "Ana Sayfa".
import './results.css';
import type {ResultsData} from './types';
import type {SideScore} from '../core/types';
import type {SeatPlayer} from '../game/types';
import {ANIM, EASE, Scope, bump, center, countUp, esc, fmt, h, play, q, signed} from './dom';
import {ASSETS} from './assets';
import {I, suitSvg} from './icons';
import {arenaHtml, capsuleHtml, charAvatarHtml, gemHtml, onAct, raysHtml, type Ctx} from './parts';
import {g3} from './fx';
import {haptic} from '../platform/bridge';
import {STAKES, shortName} from './lobby';

const ROWS: {label: string; get: (s: SideScore) => number; info?: boolean; icon?: string}[] = [
  {label: 'Kart sayısı', get: s => s.cards, info: true},
  {label: 'En çok kart', get: s => s.majority},
  {label: 'Sinek 2', get: s => s.club2, icon: suitSvg('c')},
  {label: 'Karo 10', get: s => s.diamond10, icon: suitSvg('d')},
  {label: 'Aslar', get: s => s.aces},
  {label: 'Valeler', get: s => s.jacks},
  {label: 'Pişti', get: s => s.pisti},
];

export function results(ctx: Ctx, d: ResultsData, frame = 'standart'): Promise<'again' | 'home'> {
  const scope = new Scope();
  const s = ctx.sounds;
  const {setup, result} = d;
  const mode = setup.mode;
  const by = (seat: number) => setup.players.find(p => p.seat === seat)!;
  // taraflar: benimki önce
  const sides = result.sides.slice();
  const mySide = sides.find(x => x.seats.includes(0))!;
  const ordered = [mySide, ...sides.filter(x => x !== mySide)];
  const winners = new Set(result.winners);
  const ranked = sides.slice().sort((a, b) => b.total - a.total);
  const myRank = ranked.findIndex(x => x === mySide) + 1;
  const outcome = d.outcome;

  let title: string;
  if (outcome === 'draw') title = 'Berabere';
  else if (mode === 'esli') title = outcome === 'win' ? 'Takımın Kazandı!' : 'Takımın Kaybetti';
  else if (mode === '4') title = outcome === 'win' ? 'Kazandın!' : `${myRank}. Oldun`;
  else title = outcome === 'win' ? 'Kazandın!' : 'Kaybettin';

  // sahne: kazanan(lar) büyük, diğerleri küçük
  const winSeats = outcome === 'draw' ? [] : result.winners.flatMap(i => result.sides[i].seats);
  const bigSeats = outcome === 'draw' ? mySide.seats : winSeats;
  const big = bigSeats.map(by);
  const small = setup.players.filter(p => !bigSeats.includes(p.seat)).sort((a, b) => sideOf(b).total - sideOf(a).total);
  function sideOf(p: SeatPlayer): SideScore {
    return sides.find(x => x.seats.includes(p.seat))!;
  }
  const speaker = outcome === 'win' ? small.find(p => !p.human) : big.find(p => !p.human) ?? small.find(p => !p.human);
  const defLine = outcome === 'win' ? 'Bu sefer sen kazandın… Rövanş isterim!' : outcome === 'lose' ? 'Ustaya saygı evlat! Bir el daha?' : 'Berabere! Bir el daha oynayalım.';
  const bigPose = outcome === 'draw' ? 'saskin' : 'zafer';

  const colName = (side: SideScore): string => {
    if (side === mySide) return mode === 'esli' ? 'Takımın' : 'Sen';
    if (mode === 'esli') return 'Rakip';
    return shortName(by(side.seats[0]).char);
  };
  const colAvas = (side: SideScore) => side.seats.map(by).map(p => charAvatarHtml(p.char, p.human ? frame : 'standart', 'kh-sc__ava')).join('');

  const startCoins = d.coinsBefore;
  const el = h('div', `kh-screen kh-results is-${outcome} is-m${mode}`);
  el.innerHTML = `${arenaHtml('kh-results__scrim')}
    <div class="kh-results__col">
      <div class="kh-results__top">
        ${d.streak >= 2 && outcome === 'win' ? `<div class="kh-results__streak">${I.flame}<b class="kh-num">${d.streak}</b><span>Galibiyet serisi!</span></div>` : '<span></span>'}
        ${capsuleHtml(startCoins, false, 'kh-results__coins')}
      </div>
      <header class="kh-results__head">
        <div class="kh-results__kicker">${mode === '1v1' ? 'El bitti' : mode === '4' ? '4 kişi · El bitti' : 'Eşli · El bitti'}</div>
        <div class="kh-title kh-results__title">${g3(title, outcome === 'win' ? '' : outcome === 'lose' ? 'is-lose' : 'is-white')}</div>
      </header>
      <section class="kh-podium is-n${big.length}">
        ${raysHtml(outcome === 'win' ? 'is-gold kh-podium__rays' : 'kh-podium__rays')}
        <div class="kh-podium__big">${big.map((p, i) => `<div class="kh-podium__bust" style="--i:${i}"><img src="${p.char.poses[bigPose]}" alt=""><span class="kh-podium__tag${p.human ? ' is-me' : ''}">${esc(p.human ? p.name : p.char.name)}</span>${outcome !== 'draw' ? `<i class="kh-podium__crown">${I.crown}</i>` : ''}</div>`).join('')}</div>
        <div class="kh-podium__small">${small.map(p => `<div class="kh-podium__sm"><span class="kh-podium__smava">${charAvatarHtml(p.char, p.human ? frame : 'standart', '', outcome === 'draw' ? 'saskin' : 'uzgun')}${mode === '4' ? `<b class="kh-podium__rank">${ranked.indexOf(sideOf(p)) + 1}</b>` : ''}</span><small>${esc(p.human ? 'Sen' : shortName(p.char))}</small></div>`).join('')}</div>
        ${speaker ? `<div class="kh-say kh-podium__say"><small>${esc(speaker.char.name)}</small>${esc(d.line ?? defLine)}</div>` : ''}
      </section>
      <section class="kh-panel kh-sc is-c${ordered.length}">
        <div class="kh-sc__row is-head"><span></span>${ordered.map(sd => `<b class="${sd === mySide ? 'is-me' : ''}${winners.has(result.sides.indexOf(sd)) && outcome !== 'draw' ? ' is-win' : ''}"><span class="kh-sc__avas">${colAvas(sd)}</span><em>${esc(colName(sd))}</em></b>`).join('')}</div>
        ${ROWS.map(r => {
          const vals = ordered.map(r.get);
          const max = Math.max(...vals);
          const extra = r.label === 'Pişti' && (d.myPisti || d.myValePisti) ? `<i class="kh-sc__note">${d.myPisti ? `${d.myPisti}×` : ''}${d.myValePisti ? ` · ${d.myValePisti} vale` : ''}</i>` : '';
          return `<div class="kh-sc__row${r.info ? ' is-info' : ''}${max === 0 ? ' is-zero' : ''}"><span>${r.icon ?? ''}${r.label}${extra}</span>${vals.map(v => `<b class="kh-num${v === max && max > 0 && !r.info ? ' is-best' : ''}" data-v="${v}">0</b>`).join('')}</div>`;
        }).join('')}
        <div class="kh-sc__row is-total"><span>Toplam</span>${ordered.map(sd => `<b class="kh-num${winners.has(result.sides.indexOf(sd)) && outcome !== 'draw' ? ' is-best' : ''}" data-v="${sd.total}">0</b>`).join('')}</div>
      </section>
      <div class="kh-panel kh-reward">
        <div class="kh-label">${d.coinsDelta > 0 ? 'Kazanç' : d.coinsDelta < 0 ? 'Kayıp' : 'Bahis iade'}</div>
        <div class="kh-reward__val ${d.coinsDelta > 0 ? 'is-up' : d.coinsDelta < 0 ? 'is-down' : ''}"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">0</b></div>
        <div class="kh-reward__xpbox">
          <div class="kh-reward__xp">${gemHtml(d.before.level)}<span class="kh-xp"><i class="kh-xp__fill"></i></span></div>
          <div class="kh-reward__xpt"><b>+${d.xpGain} XP</b><span class="kh-reward__next">Sv. ${d.after.level + 1}: ${fmt(Math.max(0, d.after.xpNext - d.after.xp))} XP</span></div>
        </div>
      </div>
      <div class="kh-results__btns">
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-shine" data-act="again">${I.play}Bir El Daha</button>
        <button class="kh-btn kh-btn--4" data-act="home">${I.home}Ana Sayfa</button>
      </div>
    </div>`;
  ctx.layer.append(el);
  const g = (sel: string) => q(el, sel);
  const rows = Array.from(el.querySelectorAll<HTMLElement>('.kh-sc__row:not(.is-head)'));
  const xpFill = g('.kh-reward .kh-xp__fill');
  const cap = g('.kh-results__coins');
  const capVal = q(cap, '.kh-capsule__val');
  const rewardVal = g('.kh-reward__val b');

  // ---- giriş ----
  play(g('.kh-results__scrim'), [{opacity: 0}, {opacity: 1}], {duration: 300, easing: 'ease-out', fill: 'backwards'});
  play(g('.kh-results__title'), [{transform: 'scale(1.6) rotate(-6deg)', opacity: 0}, {transform: 'scale(.95) rotate(-1deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 440, delay: 80, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-results__kicker'), [{opacity: 0, transform: 'translateY(-8px)'}, {opacity: 1, transform: 'none'}], {duration: 300, delay: 40, fill: 'backwards'});
  el.querySelectorAll<HTMLElement>('.kh-podium__bust').forEach((b, i) =>
    play(b, [{transform: 'translateY(45%) scale(.7)', opacity: 0}, {transform: 'translateY(-4%) scale(1.04)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 560, delay: 200 + i * 120, easing: EASE.out, fill: 'backwards'}));
  el.querySelectorAll<HTMLElement>('.kh-podium__sm').forEach((b, i) =>
    play(b, [{transform: 'scale(.3) rotate(-14deg)', opacity: 0}, {transform: 'scale(1.08)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 420, delay: 420 + i * 90, easing: EASE.out, fill: 'backwards'}));
  el.querySelectorAll<HTMLElement>('.kh-podium__crown').forEach((c, i) =>
    play(c, [{transform: 'translate(-50%, -80px) rotate(-30deg) scale(.5)', opacity: 0}, {transform: 'translate(-50%, 6px) rotate(6deg) scale(1.1)', opacity: 1, offset: 0.7}, {transform: 'translate(-50%, 0) rotate(-8deg)', opacity: 1}], {duration: 520, delay: 700 + i * 120, easing: EASE.out, fill: 'backwards'}));
  const say = el.querySelector('.kh-podium__say');
  if (say) play(say, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.05)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 380, delay: 760, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-podium__rays'), [{transform: 'scale(.3)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 900, delay: 160, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-sc'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 160, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-reward'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 240, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-results__btns'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 300, easing: EASE.spring, fill: 'backwards'});
  play(cap, [{transform: 'translateY(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 260, easing: EASE.spring, fill: 'backwards'});
  const streak = el.querySelector('.kh-results__streak');
  if (streak) play(streak, [{transform: 'translateX(-40px) scale(.5)', opacity: 0}, {transform: 'scale(1.1)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 520, delay: 900, easing: EASE.out, fill: 'backwards'});
  if (outcome === 'win') {
    const r = el.getBoundingClientRect();
    scope.timeout(() => {
      ctx.fx.burst({x: r.width * 0.06, y: r.height * 0.3}, {coins: 0, confetti: 20, power: 0.95});
      ctx.fx.burst({x: r.width * 0.94, y: r.height * 0.3}, {coins: 0, confetti: 20, power: 0.95});
      haptic('success');
    }, 320);
    scope.timeout(() => ctx.fx.burst({x: r.width / 2, y: r.height * 0.14}, {coins: 0, confetti: 24, power: 0.8}), 950);
  } else if (outcome === 'lose' && s.lose) scope.timeout(() => s.lose!(), 200);

  const lvlUp = d.after.level > d.before.level;
  const k0 = Math.min(1, d.before.xp / Math.max(1, d.before.xpNext));
  xpFill.style.transition = 'none';
  xpFill.style.transform = `scaleX(${ANIM ? k0 : d.after.xp / Math.max(1, d.after.xpNext)})`;

  // ---- satırlar: sırayla açılır, sayar ----
  const t0 = 620, step = 230;
  rows.forEach((r, i) => {
    const isTotal = r.classList.contains('is-total');
    const delay = t0 + i * step + (isTotal ? 180 : 0);
    play(r, [{transform: 'translateX(-18px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, delay, easing: EASE.out, fill: 'backwards'});
    scope.timeout(() => {
      if (!isTotal) s.deal?.();
      r.querySelectorAll<HTMLElement>('b[data-v]').forEach(b => countUp(scope, b, 0, Number(b.dataset.v), isTotal ? 650 : 300));
      const best = r.querySelectorAll('b.is-best');
      if (best.length && !isTotal) scope.timeout(() => best.forEach(b => bump(b, 1.3)), 300);
    }, ANIM ? delay : 0);
  });
  const tTotal = t0 + rows.length * step + 180;
  scope.timeout(() => {
    s.slam?.();
    const tot = rows[rows.length - 1];
    play(tot, [{transform: 'scale(1)'}, {transform: 'scale(1.05)'}, {transform: 'scale(1)'}], {duration: 380, easing: EASE.out});
    el.querySelector('.kh-sc')?.classList.add('is-done');
  }, ANIM ? tTotal + 300 : 0);

  // ---- ödül + XP ----
  const tReward = tTotal + 650;
  scope.timeout(async () => {
    await countUp(scope, rewardVal, 0, d.coinsDelta, 650, n => signed(n));
    if (!scope.alive) return;
    const coinsAfterMatch = d.coinsAfter - d.levelReward;
    const target = coinsAfterMatch - startCoins; // kapsüle eklenecek (bahis iadesi + kazanç)
    if (target > 0) {
      const n = Math.min(10, 4 + Math.round(target / 250));
      const to = center(q(cap, '.kh-capsule__ico'));
      const from = center(g('.kh-reward__val img'));
      let shown = startCoins;
      await ctx.fx.flyCoins(from, to, n, i => {
        s.coin(1);
        const next = i === n - 1 ? coinsAfterMatch : Math.round(startCoins + (target / n) * (i + 1));
        countUp(scope, capVal, shown, next, 120);
        shown = next;
        cap.classList.remove('is-bump');
        void cap.offsetWidth;
        cap.classList.add('is-bump');
      });
    } else countUp(scope, capVal, startCoins, coinsAfterMatch, 500);
  }, ANIM ? tReward : 0);
  scope.timeout(async () => {
    xpFill.style.transition = '';
    if (lvlUp) {
      xpFill.style.transform = 'scaleX(1)';
      await scope.wait(620);
      if (!scope.alive) return;
      const gem = g('.kh-reward__xp .kh-gem b');
      gem.textContent = String(d.after.level);
      bump(g('.kh-reward__xp .kh-gemwrap'), 1.6);
      xpFill.style.transition = 'none';
      xpFill.style.transform = 'scaleX(0)';
      void xpFill.offsetWidth;
      xpFill.style.transition = '';
      xpFill.style.transform = `scaleX(${Math.min(1, d.after.xp / Math.max(1, d.after.xpNext)).toFixed(3)})`;
      await levelUp(ctx, scope, d, cap);
    } else xpFill.style.transform = `scaleX(${Math.min(1, d.after.xp / Math.max(1, d.after.xpNext)).toFixed(3)})`;
  }, ANIM ? tReward + 250 : 0);
  if (!ANIM) {
    capVal.textContent = fmt(d.coinsAfter);
    if (lvlUp) q(el, '.kh-reward__xp .kh-gem b').textContent = String(d.after.level);
  }

  return new Promise(res => {
    onAct(scope, el, async a => {
      if (a !== 'again' && a !== 'home') return;
      s.tap();
      el.style.pointerEvents = 'none';
      if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 240, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      scope.dispose();
      el.remove();
      res(a);
    });
  });
}

/** Seviye atlama kutlaması: ışın, dev taş (eski → yeni), ödül jetonları kapsüle uçar, açılan masa. */
function levelUp(ctx: Ctx, scope: Scope, d: ResultsData, cap: HTMLElement): Promise<void> {
  const s = ctx.sounds;
  const unlocked = STAKES.filter(x => x.lvl > d.before.level && x.lvl <= d.after.level);
  const el = h('div', 'kh-lvlup');
  el.innerHTML = `<div class="kh-lvlup__scrim"></div>
    <div class="kh-lvlup__in">
      ${raysHtml('is-gold kh-lvlup__rays')}
      <div class="kh-lvlup__gem">${gemHtml(d.before.level)}</div>
      <div class="kh-title kh-lvlup__t">${g3('Seviye Atladın!')}</div>
      ${d.levelReward ? `<div class="kh-lvlup__rw"><span>Ödül</span><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">+${fmt(d.levelReward)}</b></div>` : ''}
      ${unlocked.map(u => `<div class="kh-lvlup__unl">${I.lock}<span>Yeni masa açıldı:</span><b class="kh-num">${fmt(u.v)}</b></div>`).join('')}
      <button class="kh-btn kh-btn--1 kh-btn--lg kh-shine" data-act="ok">Harika!</button>
    </div>`;
  ctx.layer.append(el);
  const g = (sel: string) => q(el, sel);
  if (s.fanfare) s.fanfare();
  else s.reward();
  haptic('success');
  play(g('.kh-lvlup__scrim'), [{opacity: 0}, {opacity: 1}], {duration: 260, fill: 'backwards'});
  play(g('.kh-lvlup__rays'), [{transform: 'scale(.2)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'backwards'});
  const gemw = g('.kh-lvlup__gem');
  play(gemw, [{transform: 'scale(.2) rotate(-40deg)', opacity: 0}, {transform: 'scale(1.2) rotate(8deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 600, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-lvlup__t'), [{transform: 'translateY(30px) scale(1.4)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 250, easing: EASE.spring, fill: 'backwards'});
  el.querySelectorAll('.kh-lvlup__rw, .kh-lvlup__unl, .kh-lvlup .kh-btn').forEach((x, i) =>
    play(x, [{transform: 'translateY(24px) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 520 + i * 140, easing: EASE.spring, fill: 'backwards'}));
  // taş: eski seviye → yeni (döner)
  scope.timeout(() => {
    const b = q(gemw, '.kh-gem b');
    play(gemw, [{transform: 'none'}, {transform: 'rotateY(90deg) scale(1.1)'}], {duration: 180, easing: EASE.in, fill: 'forwards'}).onfinish = () => {
      b.textContent = String(d.after.level);
      gemw.getAnimations().forEach(a => a.cancel());
      play(gemw, [{transform: 'rotateY(-90deg) scale(1.1)'}, {transform: 'scale(1.25)', offset: 0.6}, {transform: 'none'}], {duration: 420, easing: EASE.out});
      const c = center(gemw);
      ctx.fx.burst(c, {coins: 6, confetti: 30, power: 1});
      ctx.fx.flash(0.5, 380);
      s.slam?.();
    };
  }, ANIM ? 520 : 0);
  if (!ANIM) q(gemw, '.kh-gem b').textContent = String(d.after.level);
  return new Promise(res => {
    let done = false;
    const close = async () => {
      if (done) return;
      done = true;
      s.tap();
      const rw = el.querySelector('.kh-lvlup__rw img');
      if (rw && d.levelReward > 0) {
        const val = q(cap, '.kh-capsule__val');
        const from = center(rw), to = center(q(cap, '.kh-capsule__ico'));
        const base = d.coinsAfter - d.levelReward;
        let shown = base;
        const n = 8;
        play(el, [{opacity: 1}, {opacity: 0}], {duration: 260, delay: 120, fill: 'forwards'});
        await ctx.fx.flyCoins(from, to, n, i => {
          s.coin(1);
          const next = i === n - 1 ? d.coinsAfter : Math.round(base + (d.levelReward / n) * (i + 1));
          countUp(scope, val, shown, next, 120);
          shown = next;
          cap.classList.remove('is-bump');
          void cap.offsetWidth;
          cap.classList.add('is-bump');
        });
      } else if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 220, fill: 'forwards'}).finished.catch(() => undefined);
      el.remove();
      res();
    };
    onAct(scope, el, a => a === 'ok' && close());
    scope.add(() => el.remove());
  });
}
