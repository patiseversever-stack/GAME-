// El / maç sonu: iki sayfa. Sade, büyük tipografi, tek odak, ölçülü hareket.
//  1) Sonuç — kazananın çerçeveli portresi, başlık ("Kazandın."), bitiş açıklaması, üç ölçü (XP, katsayı, puan),
//     kazanan elin taşları. Kazanınca kuşanılan kutlama efekti oynar.
//  2) Puan durumu — gruplanmış liste (satırlar hiç hareket etmez; sıra değişimi ▲/▼ ile), toplamlar sayar;
//     yanda XP halkası dolar, seviye atlanırsa tam ekran seviye ekranı açılır.
// Birkaç saniye sonra 2. sayfaya kendiliğinden geçer; dokunarak / kaydırarak / noktalarla gezilir.
import { createTileEl } from '../ui/tile-dom.js';
import { avatarSVG } from '../ui/avatars.js';
import { framedAvatar } from '../ui/frame-ui.js';
import { FINISH_LABEL } from '../game/scoring.js';
import { Celebration } from '../ui/effects.js';
import { icon } from '../ui/icons.js';
import { levelFromXp } from '../meta/profile.js';
import { showLevelUp } from './levelup.js';
import { istanbulSVG } from '../ui/illustrations.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const idsOf = (g) => (g.tiles || g).map((x) => (typeof x === 'object' ? x.t : x));
const sign = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
const AUTO_NEXT = 5200;
const FINISH_SUB = {
  okey: 'Okey atarak bitirdin',
  pairs: 'Çiftten bitirdin',
  pairsOkey: 'Çiftten, okey atarak bitirdin',
  kafa: 'Kafadan bitirdin',
  kafaOkey: 'Kafadan, okey atarak bitirdin',
  normal: 'Elini perlere dizip bitirdin',
};

export function resultScreen(host, o, history, historySheet) {
  const { game: g, roster, result: r, matchOver } = o;
  const s = g.state;
  const ctx = s.ctx;
  const prof = o.controller?.profile;
  const audio = o.controller?.audio;
  const is101 = s.rules.mode === 'okey101';
  const calm = host.dataset?.motion === 'reduced';
  const name = (i) => (i === 0 ? 'Sen' : roster[i].name);
  const won = r.winner === 0;
  const draw = r.winner === null;
  const winSeat = matchOver && o.winnerSeat != null ? o.winnerSeat : r.winner;
  const matchWon = matchOver && o.winnerSeat === 0;
  const tone = matchOver ? (matchWon ? 'win' : 'lose') : draw ? 'draw' : won ? 'win' : 'lose';
  const heroSeat = draw ? 0 : winSeat;
  const frameOf = (i) => (i === 0 && prof ? prof.equipped('frame') : 'sade');
  const titleOf = (i) => (i === 0 ? (prof ? prof.equipped('title').name : '') : roster[i].title || '');
  const headline = matchOver ? (matchWon ? 'Maçı kazandın.' : `${name(winSeat)} maçı aldı.`) : draw ? 'Berabere.' : won ? 'Kazandın.' : `${name(r.winner)} kazandı.`;
  const mult = r.multiplier > 1 ? `puanlar ${r.multiplier === 2 ? 'iki' : r.multiplier === 4 ? 'dört' : r.multiplier} katı` : '';
  let sub;
  if (draw) sub = r.reason === 'stock' ? 'Deste bitti, kimse elini bitiremedi' : 'El bitti';
  else if (won) sub = (FINISH_SUB[r.finish] || 'Eli bitirdin') + (mult ? ' · ' + mult : '');
  else sub = `${(FINISH_LABEL[r.finish] || 'Eli bitirdi').replace(/^./, (c) => c.toUpperCase())}${mult ? ' · ' + mult : ''}`;
  if (matchOver) sub = `${is101 ? 'En düşük' : 'En yüksek'} toplamla · ${sub}`;

  // ölçüler: XP, katsayı, bu el puanın
  const xpGain = o.xp?.xp || 0;
  const myDelta = r.deltas[0];
  const metrics = [];
  if (xpGain) metrics.push([`+${xpGain}`, 'XP', 'xp', xpGain]);
  if (r.multiplier > 1) metrics.push([`×${r.multiplier}`, 'Katsayı', 'mult']);
  if (matchOver && r.totals) metrics.push([String(r.totals[0]), 'Maç toplamın', 'zero']);
  else metrics.push([sign(myDelta), 'Bu el puanın', myDelta > 0 ? 'up' : myDelta < 0 ? 'down' : 'zero']);

  const groups = draw ? [] : r.winningGroups?.length ? r.winningGroups.map(idsOf) : [r.handsAtEnd[r.winner]];
  const eyebrow = matchOver ? 'Maç sonucu' : `${is101 ? '101 Okey' : 'Klasik Okey'} · El ${r.round}`;

  const el = document.createElement('div');
  el.className = `rs3 is-result rs3--${tone}${calm ? ' is-calm' : ''}`; // is-result: uygulama testlerinin kancası
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', matchOver ? 'Maç sonucu' : `El ${r.round} sonucu`);

  // ── sayfa 2 verisi ──
  const prevTotals = r.totals.map((t, i) => t - r.deltas[i]);
  const better = (a, b) => (is101 ? a - b : b - a);
  const order = [0, 1, 2, 3].sort((a, b) => better(r.totals[a], r.totals[b]) || a - b);
  const prevOrder = [0, 1, 2, 3].sort((a, b) => better(prevTotals[a], prevTotals[b]) || a - b);
  const rows = order
    .map((i, rank) => {
      const d = r.deltas[i];
      const move = prevOrder.indexOf(i) - rank;
      const mv = r.round > 1 && move ? `<em class="rs3-mv ${move > 0 ? 'up' : 'down'}">${move > 0 ? '▲' : '▼'}${Math.abs(move)}</em>` : '';
      return `<div class="rs3-row${i === 0 ? ' is-me' : ''}" style="--i:${rank}">
        <span class="rs3-rank">${rank + 1}${mv}</span>
        ${i === 0 ? framedAvatar(roster[i].avatar, frameOf(i), 'rs3-av') : `<span class="rs3-av rs3-av--plain">${avatarSVG(roster[i].avatar)}</span>`}
        <span class="rs3-who"><b>${esc(name(i))}${i === winSeat && !draw ? '<i class="rs3-win" aria-label="kazanan"></i>' : ''}</b><small>${esc(titleOf(i))}</small></span>
        <span class="rs3-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}">${sign(d)}</span>
        <b class="rs3-total num" data-from="${prevTotals[i]}" data-to="${r.totals[i]}">${prevTotals[i]}</b>
      </div>`;
    })
    .join('');
  const pen = (r.penalties || []).filter((p) => p.points);
  const note = pen.length ? 'Cezalar: ' + pen.slice(0, 3).map((x) => `${name(x.seat)} +${x.points}`).join(' · ') + (pen.length > 3 ? ` · +${pen.length - 3}` : '') : is101 ? 'En düşük toplam kazanır' : 'En yüksek toplam kazanır';

  // XP kartı
  const xp = o.xp;
  let A = null,
    B = null,
    xpHTML = '';
  const RC = 2 * Math.PI * 42;
  if (xp && xp.xp) {
    const from = xp.from ?? (prof ? prof.d.xp - xp.xp : 0);
    A = levelFromXp(from);
    B = levelFromXp(from + xp.xp);
    const parts = (xp.parts || []).slice().sort((a, b) => b[1] - a[1]);
    xpHTML = `<aside class="rs3-xp">
      <div class="rs3-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="rs3g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0c2"/><stop offset=".6" stop-color="#f0c058"/><stop offset="1" stop-color="#d08a2a"/></linearGradient></defs><circle cx="50" cy="50" r="42" class="trk"/><circle cx="50" cy="50" r="42" class="val" style="stroke-dasharray:${RC.toFixed(1)};stroke-dashoffset:${(RC * (1 - A.into / A.need)).toFixed(1)}"/></svg>
        <span class="rs3-ring__c"><small>Seviye</small><b>${A.level}</b></span></div>
      <div class="rs3-xp__g"><b class="num">+0</b><small>XP</small></div>
      <ul class="rs3-parts">${parts.slice(0, 4).map(([l, v], i) => `<li style="--i:${i}"><span>${esc(l)}</span><b>+${v}</b></li>`).join('')}</ul>
      <span class="rs3-need num">${A.need - A.into} XP sonra seviye ${A.level + 1}</span></aside>`;
  }

  el.innerHTML = `
    <div class="rs3__bg" aria-hidden="true"><i class="rs3-amb"></i><i class="rs3-amb rs3-amb--2"></i><div class="rs3-ill">${istanbulSVG()}</div><i class="rs3-vig"></i></div>
    <canvas class="rs3__fx" aria-hidden="true"></canvas>
    <header class="rs3__top"><span class="rs3-eyebrow">${esc(eyebrow)}</span>
      <nav class="rs3__dots" aria-label="Sayfalar"><button data-p="0" aria-label="Sonuç"><i></i></button><button data-p="1" aria-label="Puan durumu"><i></i></button></nav></header>
    <div class="rs3__view"><div class="rs3__track">
      <section class="rs3__page rs3-p1">
        <div class="rs3-hero">
          <div class="rs3-portrait"><i class="rs3-glow"></i>${framedAvatar(roster[heroSeat].avatar, frameOf(heroSeat), 'rs3-fav')}<i class="rs3-floor"></i></div>
          <div class="rs3-copy">
            <span class="rs3-kicker">${draw ? 'El sonucu' : esc(titleOf(heroSeat) || 'Kazanan')}</span>
            <h1 class="rs3-title">${esc(headline)}</h1>
            <p class="rs3-sub">${esc(sub)}</p>
            <div class="rs3-metrics">${metrics.map(([v, l, cls, n], i) => `<div class="rs3-m rs3-m--${cls}" style="--i:${i}"><b class="num"${n ? ` data-count="${n}"` : ''}>${n ? '+0' : v}</b><small>${l}</small></div>`).join('')}</div>
          </div>
        </div>
        ${groups.length ? '<div class="rs3-hand"></div>' : ''}
      </section>
      <section class="rs3__page rs3-p2">
        <div class="rs3-board"><header><h2>Puan durumu</h2><span>${esc(note)}</span></header><div class="rs3-list">${rows}</div></div>
        ${xpHTML}
      </section>
    </div></div>
    <footer class="rs3__foot"></footer>`;
  host.appendChild(el);

  // kazanan el: per grupları ayrık, taşlar sırayla belirir
  if (groups.length) {
    const hand = el.querySelector('.rs3-hand');
    const n = groups.reduce((a, b) => a + b.length, 0);
    hand.style.setProperty('--tw', Math.max(17, Math.min(28, Math.floor((Math.min(innerWidth, 900) * 0.74) / (n + groups.length * 0.5)))) + 'px');
    let k = 0;
    groups.forEach((gr) => {
      const m = document.createElement('div');
      m.className = 'rs3-meld';
      for (const t of gr) {
        const w = document.createElement('span');
        w.className = 'rs3-t';
        w.style.setProperty('--d', 1150 + k++ * 38 + 'ms');
        w.appendChild(createTileEl(t, ctx, { inline: true }));
        m.appendChild(w);
      }
      hand.appendChild(m);
    });
  }

  // eylemler: maç bitince "Yeni oyun" + "Geçmiş"; el sonunda "Geçmiş" + "Menü" + "Sonraki el"
  const actions = [];
  actions.push({ label: 'Geçmiş', ic: 'list', stay: true, run: () => historySheet?.(host, o.controller, history) });
  if (!matchOver) actions.push({ label: 'Menü', ic: 'back', run: o.onMenu });
  if (!matchOver) actions.push({ label: 'Sonraki el', primary: true, ic: 'play', run: o.onNext });
  else actions.push({ label: 'Yeni oyun', primary: true, ic: 'refresh', run: o.onAgain });
  el.querySelector('.rs3__foot').innerHTML = actions.map((a, i) => `<button class="rs3-btn${a.primary ? ' rs3-btn--go' : ''}" data-a="${i}">${icon(a.ic)}<span>${a.label}</span></button>`).join('');

  // ── akış ──
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const fx = new Celebration(el.querySelector('.rs3__fx'));
  const track = el.querySelector('.rs3__track');
  const stage = o.controller?.scene?.stage;
  let page = 0,
    p2 = false;
  function countTo(node, from, to, ms, fmt = (v) => String(v)) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      node.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const go = (p) => {
    page = Math.max(0, Math.min(1, p));
    el.dataset.page = page;
    track.style.transform = `translateX(${-page * 50}%)`;
    el.querySelectorAll('.rs3__dots button').forEach((b, i) => b.setAttribute('aria-current', String(i === page)));
    if (page === 1 && !p2) startP2();
  };
  requestAnimationFrame(() => {
    el.classList.add('is-in');
    go(0);
  });
  at(480, () => stage?.setSuspended?.(true));
  if (tone === 'win') at(420, () => fx.play(prof ? prof.equipped('effect') : 'konfeti', { calm }));
  at(900, () => el.querySelectorAll('.rs3-m [data-count]').forEach((b) => countTo(b, 0, +b.dataset.count, 900, (v) => '+' + v)));
  if (groups.length) at(1150, () => audio?.cascade?.('place', Math.min(14, groups.reduce((a, b) => a + b.length, 0)), 0.04, { quiet: true, vol: 0.28 }));
  at(AUTO_NEXT, () => page === 0 && go(1));

  function startP2() {
    p2 = true;
    el.classList.add('p2');
    at(500, () => {
      el.querySelectorAll('.rs3-total').forEach((b) => countTo(b, +b.dataset.from, +b.dataset.to, 900));
      audio?.cascade?.('score', 4, 0.1, { quiet: true, vol: 0.45 });
    });
    if (A) runXp();
  }
  function runXp() {
    const ring = el.querySelector('.rs3-ring .val');
    const lv = el.querySelector('.rs3-ring__c b');
    const need = el.querySelector('.rs3-need');
    const set = (f, ms) => {
      ring.style.transition = ms ? `stroke-dashoffset ${ms}ms cubic-bezier(.45,.05,.25,1)` : 'none';
      ring.style.strokeDashoffset = String(RC * (1 - f));
    };
    at(450, () => countTo(el.querySelector('.rs3-xp__g b'), 0, xp.xp, 1000, (v) => '+' + v));
    at(900, () => {
      if (B.level === A.level) {
        set(B.into / B.need, 1100);
        need.textContent = `${B.need - B.into} XP sonra seviye ${B.level + 1}`;
        return;
      }
      set(1, 900);
      at(950, () => {
        el.querySelector('.rs3-xp').classList.add('is-up');
        lv.textContent = String(B.level);
        set(0, 0);
        requestAnimationFrame(() => requestAnimationFrame(() => set(B.into / B.need, 800)));
        need.textContent = `${B.need - B.into} XP sonra seviye ${B.level + 1}`;
        const ups = xp.levelUps || [];
        at(700, () => showLevelUp({ host, from: ups[0].level - 1, to: ups[ups.length - 1].level, unlocks: ups.flatMap((u) => u.unlocks || []), avatar: roster[0].avatar, audio, profile: prof, calm }));
      });
    });
  }

  // ── etkileşim ──
  let sx = null;
  const view = el.querySelector('.rs3__view');
  view.addEventListener('pointerdown', (e) => (sx = e.clientX));
  view.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
    else if (page === 0) go(1);
  });
  const key = (e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(0);
  };
  document.addEventListener('keydown', key);
  const close = () => {
    timers.forEach(clearTimeout);
    stage?.setSuspended?.(false);
    fx.stop();
    el.classList.add('is-out');
    document.removeEventListener('keydown', key);
    setTimeout(() => el.remove(), 320);
  };
  el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-p]');
    if (d) return go(+d.dataset.p);
    const b = e.target.closest('[data-a]');
    if (!b) return;
    audio?.play?.('tap');
    const a = actions[+b.dataset.a];
    if (!a.stay) close();
    a.run?.();
  });
  return { el, close };
}
