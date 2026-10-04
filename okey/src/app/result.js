// El / maç sonu: iki sayfalı sinematik ekran.
//  1) Zafer sahnesi — spot ışığı ve dönen ışınlar altında kazananın çerçeveli portresi, harf harf düşen altın damga,
//     açılan çini kurdele ve katsayı mührü, kazanan elin taşları tek tek dönerek açılır, rakiplerin puan kayıpları uçar.
//  2) Puan tablosu — birkaç saniye sonra kendiliğinden yan sayfaya kayar: satırlar eski sırayla girer, puanlar sayar,
//     sıralama yeni yerine akar; sağda XP halkası dolar, seviye atlanırsa tam ekran kutlama açılır.
// Dokununca / kaydırınca sayfa değişir; noktalar sayfa göstergesidir.
import { createTileEl } from '../ui/tile-dom.js';
import { avatarSVG } from '../ui/avatars.js';
import { framedAvatar } from '../ui/frame-ui.js';
import { FINISH_LABEL } from '../game/scoring.js';
import { Celebration } from '../ui/effects.js';
import { icon } from '../ui/icons.js';
import { levelFromXp } from '../meta/profile.js';
import { levelTier } from '../meta/progression.js';
import { showLevelUp } from './levelup.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const idsOf = (g) => (g.tiles || g).map((x) => (typeof x === 'object' ? x.t : x));
const TR_UP = (s) => s.replace(/i/g, 'İ').toUpperCase();
const AUTO_NEXT = 4600;

const CROWN = '<svg class="rs-crown" viewBox="0 0 48 32" aria-hidden="true"><defs><linearGradient id="rscg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c6"/><stop offset=".55" stop-color="#e8b648"/><stop offset="1" stop-color="#9a6a1c"/></linearGradient></defs><path d="M4 26 L8 8 L18 18 L24 4 L30 18 L40 8 L44 26 Z" fill="url(#rscg)" stroke="#5a3a0c" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="7" r="2.6" fill="#fff3c6"/><circle cx="24" cy="3.6" r="2.8" fill="#fff3c6"/><circle cx="40" cy="7" r="2.6" fill="#fff3c6"/><rect x="5" y="26" width="38" height="4" rx="2" fill="url(#rscg)" stroke="#5a3a0c" stroke-width="1.2"/><circle cx="24" cy="18" r="2.4" fill="#c23a2c"/></svg>';
const LATTICE = '<svg class="rs-lattice" aria-hidden="true"><defs><pattern id="rslp" width="64" height="64" patternUnits="userSpaceOnUse"><g fill="none" stroke="currentColor" stroke-width="1"><rect x="19" y="19" width="26" height="26"/><rect x="19" y="19" width="26" height="26" transform="rotate(45 32 32)"/><circle cx="32" cy="32" r="5"/><path d="M0 32h6M58 32h6M32 0v6M32 58v6"/></g></pattern></defs><rect width="100%" height="100%" fill="url(#rslp)"/></svg>';

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
  const finish = FINISH_LABEL[r.finish] || (r.reason === 'stock' ? 'Deste bitti' : r.reason === 'allPairs' ? 'Dört çift' : 'El bitti');
  const stampText = matchOver ? (matchWon ? 'MAÇI KAZANDIN' : TR_UP(name(winSeat)) + ' KAZANDI') : draw ? 'BERABERE' : won ? 'KAZANDIN' : TR_UP(name(r.winner)) + ' KAZANDI';
  const heroSeat = draw ? 0 : winSeat;
  const frameOf = (i) => (i === 0 && prof ? prof.equipped('frame') : 'sade');
  const titleOf = (i) => (i === 0 ? (prof ? prof.equipped('title').name : '') : roster[i].title || '');

  const el = document.createElement('div');
  el.className = `rs is-result rs--${tone}${calm ? ' is-calm' : ''}`; // is-result: uygulama testlerinin sonuç ekranı kancası
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', matchOver ? 'Maç sonucu' : `El ${r.round} sonucu`);

  // ── sayfa 1: zafer sahnesi ──
  const letters = [...stampText].map((ch, i) => (ch === ' ' ? '<i class="rs-sp"></i>' : `<span style="--i:${i}">${esc(ch)}</span>`)).join('');
  const lossChips = draw
    ? ''
    : [0, 1, 2, 3]
        .filter((i) => i !== r.winner && r.deltas[i])
        .map((i, k) => `<span class="rs-loss${i === 0 ? ' is-me' : ''}" style="--i:${k}"><i>${avatarSVG(roster[i].avatar)}</i><b>${r.deltas[i] > 0 ? '+' : ''}${r.deltas[i]}</b></span>`)
        .join('');
  const winGain = !draw && r.deltas[r.winner] ? `<span class="rs-loss is-gain" style="--i:0"><i>${avatarSVG(roster[r.winner].avatar)}</i><b>${r.deltas[r.winner] > 0 ? '+' : ''}${r.deltas[r.winner]}</b></span>` : '';
  const groups = draw ? [] : r.winningGroups?.length ? r.winningGroups.map(idsOf) : [r.handsAtEnd[r.winner]];
  const sub = matchOver ? 'Maç sonucu' : `${is101 ? '101 Okey' : 'Klasik Okey'} · El ${r.round}`;
  el.innerHTML = `
    <div class="rs__bg" aria-hidden="true"><i class="rs-glow"></i>${LATTICE}<i class="rs-vig"></i><span class="rs-motes">${'<b></b>'.repeat(14)}</span></div>
    <canvas class="rs__fx" aria-hidden="true"></canvas>
    <header class="rs__top"><span class="rs__sub">${esc(sub)}</span>
      <nav class="rs__dots" aria-label="Sayfalar"><button data-p="0" aria-label="Sonuç"><i></i></button><button data-p="1" aria-label="Puan tablosu"><i></i></button></nav></header>
    <div class="rs__view"><div class="rs__track">
      <section class="rs__page rs-p1">
        <div class="rs-hero">
          <div class="rs-portrait">
            <i class="rs-rays"></i><i class="rs-cone"></i><span class="rs-halo"></span><span class="rs-ring"></span>
            ${draw || ['pasa', 'aga'].includes(frameOf(heroSeat)) ? '' : CROWN}
            ${framedAvatar(roster[heroSeat].avatar, frameOf(heroSeat), 'rs-fav')}
          </div>
          <div class="rs-copy">
            <span class="rs-eyebrow">${draw ? 'El sonucu' : esc(titleOf(heroSeat)) || 'Kazanan'}</span>
            <h1 class="rs-stamp${stampText.length > 11 ? ' is-long' : ''}" aria-label="${esc(stampText)}">${letters}</h1>
            <div class="rs-ribbon"><span>${esc(finish)}</span>${r.multiplier > 1 ? `<b class="rs-mult">×${r.multiplier}</b>` : ''}</div>
            <div class="rs-losses">${winGain}${lossChips}</div>
          </div>
        </div>
        ${groups.length ? `<div class="rs-hand"><div class="rs-tray"></div></div>` : ''}
        <p class="rs-hint">Puan tablosu için dokun</p>
      </section>
      <section class="rs__page rs-p2">
        <div class="rs-board"><header><span>Sıra</span><span>Oyuncu</span><span>Bu el</span><span>Toplam</span></header><div class="rs-rows"></div><p class="rs-note"></p></div>
        <aside class="rs-xp"></aside>
      </section>
    </div></div>
    <footer class="rs__foot"></footer>`;
  host.appendChild(el);

  // kazanan el: per grupları tepside, taşlar sırayla döner
  if (groups.length) {
    const tray = el.querySelector('.rs-tray');
    const n = groups.reduce((a, b) => a + b.length, 0);
    tray.style.setProperty('--tw', Math.max(18, Math.min(30, Math.floor((Math.min(innerWidth, 900) * 0.8) / (n + groups.length * 0.6)))) + 'px');
    let k = 0;
    groups.forEach((gr) => {
      const m = document.createElement('div');
      m.className = 'rs-meld';
      for (const t of gr) {
        const w = document.createElement('span');
        w.className = 'rs-t';
        w.style.setProperty('--d', 1300 + k++ * 55 + 'ms');
        w.appendChild(createTileEl(t, ctx, { inline: true }));
        m.appendChild(w);
      }
      tray.appendChild(m);
    });
  }

  // ── sayfa 2: puan tablosu ──
  const prevTotals = r.totals.map((t, i) => t - r.deltas[i]);
  const better = (a, b) => (is101 ? a - b : b - a);
  const order = [0, 1, 2, 3].sort((a, b) => better(r.totals[a], r.totals[b]));
  const prevOrder = [0, 1, 2, 3].sort((a, b) => better(prevTotals[a], prevTotals[b]) || a - b);
  const maxAbs = Math.max(1, ...r.totals.map((t) => Math.abs(t)));
  const rows = el.querySelector('.rs-rows');
  rows.innerHTML = order
    .map((i, rank) => {
      const d = r.deltas[i];
      const lead = rank === 0;
      return `<div class="rs-row${i === 0 ? ' is-me' : ''}${lead ? ' is-lead' : ''}${i === winSeat && !draw ? ' is-winner' : ''}" data-seat="${i}" data-rank="${rank}" style="--from:${prevOrder.indexOf(i) - rank};--i:${prevOrder.indexOf(i)}">
        <span class="rs-medal rs-medal--${rank + 1}">${rank + 1}</span>
        ${framedAvatar(roster[i].avatar, frameOf(i), 'rs-rav')}
        <span class="rs-who"><b>${esc(name(i))}</b><small>${esc(titleOf(i))}</small></span>
        <span class="rs-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}">${d > 0 ? '+' : ''}${d}</span>
        <span class="rs-total"><b class="num" data-from="${prevTotals[i]}" data-to="${r.totals[i]}">${prevTotals[i]}</b><i style="--w:${(Math.abs(r.totals[i]) / maxAbs) * 100}%"></i></span>
        ${lead ? '<svg class="rs-lead" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 5 7l4.5 5L12 5l2.5 7L19 7l2 11z"/></svg>' : ''}
      </div>`;
    })
    .join('');
  const pen = (r.penalties || []).filter((p) => p.points);
  el.querySelector('.rs-note').textContent = pen.length
    ? 'Cezalar: ' + pen.slice(0, 3).map((x) => `${name(x.seat)} +${x.points}`).join(' · ') + (pen.length > 3 ? ` · +${pen.length - 3}` : '')
    : is101
      ? 'En düşük puan kazanır'
      : 'En yüksek puan kazanır';

  // XP paneli
  const xp = o.xp;
  const xpEl = el.querySelector('.rs-xp');
  let A = null,
    B = null;
  if (xp && xp.xp) {
    const from = xp.from ?? (prof ? prof.d.xp - xp.xp : 0);
    A = levelFromXp(from);
    B = levelFromXp(from + xp.xp);
    const R = 2 * Math.PI * 44;
    xpEl.innerHTML = `<div class="rs-xring"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="rsxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#f0bf55"/><stop offset="1" stop-color="#b9781e"/></linearGradient></defs><circle cx="50" cy="50" r="44" class="rs-xtrk"/><circle cx="50" cy="50" r="44" class="rs-xval" style="stroke-dasharray:${R.toFixed(1)};stroke-dashoffset:${(R * (1 - A.into / A.need)).toFixed(1)}"/></svg>
        <span class="rs-xlv"><small>SEVİYE</small><b class="lvl-${levelTier(A.level)}">${A.level}</b></span></div>
      <b class="rs-xgain num">+0 XP</b>
      <span class="rs-xtitle">${prof ? esc(prof.equipped('title').name) : ''}</span>
      <div class="rs-xparts">${(xp.parts || []).map(([l, v], i) => `<span style="--i:${i}">${esc(l)}<b>+${v}</b></span>`).join('')}</div>
      <span class="rs-xneed num">${A.into} / ${A.need} XP</span>`;
    xpEl.dataset.r = R;
  } else xpEl.remove();

  // ── eylemler ──
  const actions = [];
  if (!matchOver) actions.push({ label: 'Sonraki el', primary: true, ic: 'play', run: o.onNext });
  else actions.push({ label: 'Yeni oyun', primary: true, ic: 'refresh', run: o.onAgain });
  actions.push({ label: 'Geçmiş', ic: 'list', stay: true, run: () => historySheet?.(host, o.controller, history) });
  if (!matchOver) actions.push({ label: 'Menü', ic: 'back', run: o.onMenu });
  const foot = el.querySelector('.rs__foot');
  foot.innerHTML = actions.map((a, i) => `<button class="rs-btn${a.primary ? ' rs-btn--go' : ''}" data-a="${i}">${icon(a.ic)}<span>${a.label}</span></button>`).join('');

  // ── zamanlama ──
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let page = 0;
  let p2Started = false;
  const fx = new Celebration(el.querySelector('.rs__fx'));
  const track = el.querySelector('.rs__track');
  const go = (p) => {
    page = Math.max(0, Math.min(1, p));
    el.dataset.page = page;
    track.style.transform = `translateX(${-page * 50}%)`;
    el.querySelectorAll('.rs__dots button').forEach((b, i) => b.setAttribute('aria-current', String(i === page)));
    if (page === 1 && !p2Started) startP2();
  };
  requestAnimationFrame(() => {
    el.classList.add('is-in');
    go(0);
  });
  // ekran masayı tamamen örttüğünde 3B çizim durur (pil, ısı; ağır kutlama efektlerine kare bütçesi kalır)
  const stage = o.controller?.scene?.stage;
  at(480, () => stage?.setSuspended?.(true));
  if (tone === 'win') at(380, () => fx.play(prof ? prof.equipped('effect') : 'konfeti', { calm }));
  at(1350, () => r.multiplier > 1 && audio?.play?.('okey', { quiet: true, vol: 0.6 }));
  if (groups.length) at(1300, () => audio?.cascade?.('place', Math.min(14, groups.reduce((a, b) => a + b.length, 0)), 0.055, { quiet: true, vol: 0.32 }));
  at(AUTO_NEXT, () => page === 0 && go(1));

  function countTo(node, from, to, ms) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      node.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function startP2() {
    p2Started = true;
    el.classList.add('p2-in');
    at(650, () => {
      el.classList.add('p2-delta');
      el.querySelectorAll('.rs-total b').forEach((b) => countTo(b, +b.dataset.from, +b.dataset.to, 900));
      audio?.cascade?.('score', 4, 0.12, { quiet: true, vol: 0.5 });
    });
    at(1650, () => el.classList.add('p2-sort'));
    if (A) runXp();
  }
  function runXp() {
    const ring = xpEl.querySelector('.rs-xval');
    const R = +xpEl.dataset.r;
    const lv = xpEl.querySelector('.rs-xlv b');
    const need = xpEl.querySelector('.rs-xneed');
    const setRing = (f, ms) => {
      ring.style.transition = ms ? `stroke-dashoffset ${ms}ms cubic-bezier(.4,.1,.2,1)` : 'none';
      ring.style.strokeDashoffset = String(R * (1 - f));
    };
    const gain = xpEl.querySelector('.rs-xgain');
    const fmtGain = () => {
      const t0 = performance.now() + 500;
      const step = (now) => {
        const k = Math.max(0, Math.min(1, (now - t0) / 1000));
        gain.textContent = '+' + Math.round(xp.xp * (1 - Math.pow(1 - k, 3))) + ' XP';
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    fmtGain();
    xpEl.classList.add('is-on');
    at(1000, () => {
      if (B.level === A.level) {
        setRing(B.into / B.need, 1100);
        need.textContent = `${B.into} / ${B.need} XP`;
        return;
      }
      setRing(1, 900);
      at(950, () => {
        xpEl.classList.add('is-burst');
        lv.textContent = String(B.level);
        lv.className = 'lvl-' + levelTier(B.level);
        setRing(0, 0);
        requestAnimationFrame(() => requestAnimationFrame(() => setRing(B.into / B.need, 800)));
        need.textContent = `${B.into} / ${B.need} XP`;
        const rr = xpEl.querySelector('.rs-xring').getBoundingClientRect();
        const hr = el.getBoundingClientRect();
        fx.burstAt(rr.left - hr.left + rr.width / 2, rr.top - hr.top + rr.height / 2, { calm, rain: false });
        const ups = xp.levelUps || [];
        at(900, () =>
          showLevelUp({ host, from: ups[0].level - 1, to: ups[ups.length - 1].level, unlocks: ups.flatMap((u) => u.unlocks || []), avatar: roster[0].avatar, audio, profile: prof, calm }),
        );
      });
    });
  }

  // ── etkileşim: dokun / kaydır / noktalar / düğmeler ──
  let sx = null;
  el.querySelector('.rs__view').addEventListener('pointerdown', (e) => (sx = e.clientX));
  el.querySelector('.rs__view').addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
    else if (page === 0) go(1);
  });
  const close = () => {
    timers.forEach(clearTimeout);
    stage?.setSuspended?.(false);
    fx.stop();
    el.classList.add('is-out');
    document.removeEventListener('keydown', key);
    setTimeout(() => el.remove(), 320);
  };
  const key = (e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(0);
  };
  document.addEventListener('keydown', key);
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
