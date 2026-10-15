// El sonu: başlık damgası, rakibin duygu kartı, satır satır açılan skor tablosu (sayaçlı),
// jeton kazancı (bakiyeye uçan jetonlar), XP çubuğu (gerekirse seviye atlama), "Bir El Daha" / "Lobiye Dön".
import type {Mood, ResultsData} from './types';
import type {SideScore} from '../core/types';
import {ANIM, EASE, Scope, center, countUp, esc, h, play, q, signed} from './dom';
import {ASSETS, OPTIONAL_ART} from './assets';
import {I} from './icons';
import {capsuleHtml, gemHtml, onAct, oppLevel, type Ctx} from './parts';
import {g3} from './fx';

const ROWS: [string, (s: SideScore) => number][] = [
  ['Kart sayısı', s => s.cards],
  ['En çok kart', s => s.majority],
  ['As', s => s.aces],
  ['Vale', s => s.jacks],
  ['Sinek 2', s => s.club2],
  ['Karo 10', s => s.diamond10],
  ['Pişti', s => s.pisti],
];

export function results(ctx: Ctx, d: ResultsData): Promise<'again' | 'lobby'> {
  const scope = new Scope();
  const [me, op] = [d.result.sides[d.meSide], d.result.sides[1 - d.meSide]];
  const w = d.result.winners;
  const outcome: 'win' | 'lose' | 'draw' = w.length !== 1 ? 'draw' : w[0] === me.side ? 'win' : 'lose';
  const title = outcome === 'win' ? 'Kazandın!' : outcome === 'lose' ? 'Kaybettin' : 'Berabere';
  const titleImg = outcome === 'win' ? OPTIONAL_ART.kazandin_text : outcome === 'lose' ? OPTIONAL_ART.kaybettin_text : undefined;
  const mood: Mood = outcome === 'win' ? 'uzgun' : outcome === 'lose' ? 'kahkaha' : 'saskin';
  const p = d.profile;
  const xpBefore = p.xp - d.xpGain;
  const levelUp = xpBefore < 0;
  const startCoins = d.coinsAfter - d.coinsDelta;

  const row = (label: string, a: number, b: number, cls = '') =>
    `<div class="kh-score__row ${cls}${a === 0 && b === 0 ? ' is-zero' : ''}"><span>${label}</span><b class="kh-num${a > b ? ' is-best' : ''}" data-v="${a}">0</b><b class="kh-num${b > a ? ' is-best' : ''}" data-v="${b}">0</b></div>`;

  const el = h('div', `kh-screen kh-results is-${outcome}`);
  const defLine = outcome === 'win' ? 'Bu sefer sen kazandın… Rövanş isterim!' : outcome === 'lose' ? 'Ustaya saygı evlat! Bir el daha?' : 'Berabere! Bir el daha oynayalım.';
  const toNext = Math.max(0, p.xpNext - p.xp);
  el.innerHTML = `<div class="kh-results__scrim"></div>
    <div class="kh-results__col">
      <div class="kh-results__top">${capsuleHtml(startCoins, false, 'kh-results__coins')}</div>
      <header class="kh-results__head">
        <div class="kh-results__kicker">El bitti</div>
        <div class="kh-title kh-results__title">${titleImg ? `<img class="kh-g3img" src="${titleImg}" alt="${title}" style="height:calc(var(--u)*4.6)">` : g3(title, outcome === 'lose' ? 'is-lose' : '')}</div>
      </header>
      <div class="kh-results__opp">
        <div class="kh-mood"><img src="${d.opp.moods[mood]}" alt="">${gemHtml(oppLevel(d.opp), false)}</div>
        <div class="kh-results__line"><small>${esc(d.opp.name)}</small>${esc(d.line ?? defLine)}</div>
      </div>
      <section class="kh-panel kh-score">
        ${outcome !== 'draw' ? `<i class="kh-score__cols ${outcome === 'win' ? 'is-me' : 'is-opp'}"></i>` : ''}
        <div class="kh-score__row is-head"><span></span><b>Sen</b><b>${esc(d.opp.name)}</b></div>
        ${ROWS.map(([l, f]) => row(l, f(me), f(op))).join('')}
        ${row('Toplam', me.total, op.total, 'is-total')}
      </section>
      <div class="kh-panel kh-reward">
        <div class="kh-label">${d.coinsDelta > 0 ? 'Kazanç' : d.coinsDelta < 0 ? 'Kayıp' : 'Bahis iade'}</div>
        <div class="kh-reward__val ${d.coinsDelta > 0 ? 'is-up' : d.coinsDelta < 0 ? 'is-down' : ''}"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">0</b></div>
        <div class="kh-reward__xpbox">
          <div class="kh-reward__xp">${gemHtml(levelUp ? p.level - 1 : p.level)}<span class="kh-xp"><i class="kh-xp__fill"></i></span></div>
          <div class="kh-reward__xpt"><b>+${d.xpGain} XP</b><span class="kh-reward__lvlup">Seviye atladın!</span><span class="kh-reward__next">Sv. ${p.level + 1}: ${toNext} XP</span></div>
        </div>
      </div>
      <div class="kh-results__btns">
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-shine" data-act="again">Bir El Daha</button>
        <button class="kh-btn kh-btn--4" data-act="lobby">${I.home}Lobiye Dön</button>
      </div>
    </div>`;
  ctx.layer.append(el);
  const g = (s: string) => q(el, s);
  const rows = Array.from(el.querySelectorAll<HTMLElement>('.kh-score__row:not(.is-head)'));
  const xpFill = g('.kh-reward .kh-xp__fill');
  const capVal = g('.kh-results__coins .kh-capsule__val');
  const rewardVal = g('.kh-reward__val b');

  // ---- giriş ----
  play(g('.kh-results__scrim'), [{opacity: 0}, {opacity: 1}], {duration: 300, easing: 'ease-out', fill: 'backwards'});
  play(g('.kh-results__title'), [{transform: 'scale(1.5) rotate(-6deg)', opacity: 0}, {transform: 'scale(.96) rotate(-1deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 420, delay: 80, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-results__kicker'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 60, fill: 'backwards'});
  play(g('.kh-mood'), [{transform: 'rotate(-14deg) scale(.4)', opacity: 0}, {transform: 'rotate(2deg) scale(1.06)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 480, delay: 200, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-results__line'), [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 380, delay: 380, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-score'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 140, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-reward'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 220, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-results__btns'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 280, easing: EASE.spring, fill: 'backwards'});
  play(g('.kh-results__coins'), [{transform: 'translateY(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 260, easing: EASE.spring, fill: 'backwards'});
  const lvlStart = levelUp ? Math.min(1, Math.max(0, (xpBefore + p.xpNext) / p.xpNext)) : Math.max(0, xpBefore / Math.max(1, p.xpNext));
  xpFill.style.transition = 'none';
  xpFill.style.transform = `scaleX(${ANIM ? lvlStart : p.xp / Math.max(1, p.xpNext)})`;

  // ---- satırlar ----
  const t0 = 420;
  rows.forEach((r, i) => {
    const delay = t0 + i * 115;
    play(r, [{transform: 'translateX(-14px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, delay, easing: EASE.out, fill: 'backwards'});
    scope.timeout(() => r.querySelectorAll<HTMLElement>('b[data-v]').forEach(b => countUp(scope, b, 0, Number(b.dataset.v), r.classList.contains('is-total') ? 650 : 360)), ANIM ? delay : 0);
  });
  const cols = el.querySelector('.kh-score__cols');
  const tRows = t0 + rows.length * 115 + 350;
  if (cols) play(cols, [{opacity: 0}, {opacity: 1}], {duration: 400, delay: tRows, fill: 'both'});
  play(rows[rows.length - 1], [{transform: 'scale(1)'}, {transform: 'scale(1.04)'}, {transform: 'scale(1)'}], {duration: 360, delay: tRows + 200, easing: EASE.out});

  // ---- ödül + XP ----
  const tReward = tRows + 250;
  scope.timeout(async () => {
    await countUp(scope, rewardVal, 0, d.coinsDelta, 650, n => signed(n));
    if (!scope.alive) return;
    if (d.coinsDelta > 0) {
      const n = Math.min(10, 4 + Math.round(d.coinsDelta / 200));
      const to = center(g('.kh-results__coins .kh-capsule__ico'));
      const from = center(g('.kh-reward__val img'));
      let shown = startCoins;
      const step = d.coinsDelta / n;
      await ctx.fx.flyCoins(from, to, n, i => {
        ctx.sounds.coin(1);
        const next = i === n - 1 ? d.coinsAfter : Math.round(startCoins + step * (i + 1));
        countUp(scope, capVal, shown, next, 120);
        shown = next;
        const cap = g('.kh-results__coins');
        cap.classList.remove('is-bump');
        void cap.offsetWidth;
        cap.classList.add('is-bump');
      });
    } else countUp(scope, capVal, startCoins, d.coinsAfter, 600);
  }, ANIM ? tReward : 0);
  scope.timeout(async () => {
    xpFill.style.transition = '';
    if (levelUp) {
      xpFill.style.transform = 'scaleX(1)';
      await scope.wait(560);
      const badge = g('.kh-reward__xp .kh-gem b');
      badge.textContent = String(p.level);
      play(g('.kh-reward__xp .kh-gemwrap'), [{transform: 'scale(1.7)'}, {transform: 'scale(1)'}], {duration: 420, easing: EASE.spring});
      g('.kh-reward__next').style.display = 'none';
      play(g('.kh-reward__lvlup'), [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 300, fill: 'forwards'});
      ctx.sounds.reward();
      xpFill.style.transition = 'none';
      xpFill.style.transform = 'scaleX(0)';
      void xpFill.offsetWidth;
      xpFill.style.transition = '';
    }
    xpFill.style.transform = `scaleX(${Math.min(1, p.xp / Math.max(1, p.xpNext)).toFixed(3)})`;
  }, ANIM ? tReward + 200 : 0);
  if (!levelUp) q(el, '.kh-reward__lvlup').style.display = 'none';
  if (!ANIM && levelUp) {
    q(el, '.kh-reward__xp .kh-gem b').textContent = String(p.level);
    q(el, '.kh-reward__lvlup').style.opacity = '1';
    q(el, '.kh-reward__next').style.display = 'none';
  }

  return new Promise(res => {
    onAct(scope, el, async a => {
      if (a !== 'again' && a !== 'lobby') return;
      ctx.sounds.tap();
      el.style.pointerEvents = 'none';
      if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 240, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      scope.dispose();
      el.remove();
      res(a);
    });
  });
}

