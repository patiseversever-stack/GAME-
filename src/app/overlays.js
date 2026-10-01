// Oyun üstü sayfalar: el sonucu, geçmiş (tek dokunuş), duraklatma, nasıl oynanır.
// Tek tip "sayfa" bileşeni (.sheet): koyu panel, başlık, içerik, eylem satırı. Klavye: Esc kapatır, odak içeride.
import { createTileEl } from '../ui/tile-dom.js';
import { avatarSVG } from '../ui/avatars.js';
import { FINISH_LABEL } from '../game/scoring.js';
import { COLORS, COLOR_TR } from '../game/tiles.js';
import { Confetti } from '../ui/effects.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function sheet(host, { title, body = '', actions = [], cls = '', onClose, dismissable = true }) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap ' + cls;
  el.innerHTML = `<div class="sheet-frame"><i class="stud stud--tl"></i><i class="stud stud--tr"></i><i class="stud stud--bl"></i><i class="stud stud--br"></i>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet__head"><span class="sheet__orn"></span><h2>${title}</h2><span class="sheet__orn"></span>${dismissable ? '<button class="icon-btn sheet__x" data-x aria-label="Kapat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : ''}</header>
    <div class="sheet__body"></div>
    ${actions.length ? `<footer class="sheet__foot">${actions.map((a, i) => `<button class="btn ${a.primary ? 'btn--primary' : ''} btn--lg" data-i="${i}">${a.label}</button>`).join('')}</footer>` : ''}
  </div></div>`;
  const bodyEl = el.querySelector('.sheet__body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);
  const close = () => {
    el.classList.add('is-out');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => el.remove(), 220);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissable) close();
  };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => {
    if (e.target === el && dismissable) return close();
    if (e.target.closest('[data-x]')) return close();
    const b = e.target.closest('[data-i]');
    if (b) {
      const a = actions[+b.dataset.i];
      if (a.close !== false) close();
      a.run?.();
    }
  });
  host.appendChild(el);
  setTimeout(() => el.querySelector('.btn--primary, [data-i], [data-x]')?.focus(), 50);
  return { el, close, body: bodyEl };
}

// taş dizisi → küçük taşlardan satır
function tileRow(tiles, ctx, tw = 24, cls = '') {
  const row = document.createElement('div');
  row.className = 'mini-row ' + cls;
  row.style.setProperty('--tw', tw + 'px');
  for (const t of tiles) row.appendChild(createTileEl(t, ctx, { inline: true }));
  return row;
}
const idsOf = (g) => (g.tiles || g).map((x) => (typeof x === 'object' ? x.t : x));

// ───────────── El sonucu ─────────────
export function resultScreen(host, o, history) {
  const { game: g, roster, result: r, matchOver } = o;
  const s = g.state;
  const ctx = s.ctx;
  const name = (i) => (i === 0 ? 'Sen' : roster[i].name);
  const won = r.winner === 0;
  const wrap = document.createElement('div');
  wrap.className = 'result';
  const left = document.createElement('div');
  left.className = 'result__left';
  const right = document.createElement('div');
  right.className = 'result__right';
  const hero = document.createElement('div');
  hero.className = 'result__hero' + (won ? ' is-win' : '');
  const finish = FINISH_LABEL[r.finish] || (r.reason === 'stock' ? 'Deste bitti' : r.reason === 'allPairs' ? 'Dört çift' : '');
  const crown = '<svg class="result__crown" viewBox="0 0 48 32"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c6"/><stop offset=".55" stop-color="#e8b648"/><stop offset="1" stop-color="#9a6a1c"/></linearGradient></defs><path d="M4 26 L8 8 L18 18 L24 4 L30 18 L40 8 L44 26 Z" fill="url(#cg)" stroke="#5a3a0c" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="7" r="2.6" fill="#fff3c6"/><circle cx="24" cy="3.6" r="2.8" fill="#fff3c6"/><circle cx="40" cy="7" r="2.6" fill="#fff3c6"/><rect x="5" y="26" width="38" height="4" rx="2" fill="url(#cg)" stroke="#5a3a0c" stroke-width="1.2"/></svg>';
  hero.innerHTML = r.winner === null
    ? `<div class="result__stamp">BERABERE</div><p>${esc(finish)}</p>`
    : `<div class="result__avwrap">${crown}<div class="result__av">${avatarSVG(roster[r.winner].avatar)}</div></div><div class="result__who"><div class="result__stamp">${won ? 'KAZANDIN' : esc(name(r.winner)) + ' KAZANDI'}</div><p>${esc(finish)}${r.multiplier > 1 ? ` · ×${r.multiplier}` : ''}</p></div>`;
  left.appendChild(hero);
  // kazanan el
  if (r.winner !== null) {
    const groups = r.winningGroups?.length ? r.winningGroups.map(idsOf) : [r.handsAtEnd[r.winner]];
    const hand = document.createElement('div');
    hand.className = 'result__hand';
    groups.forEach((gr, i) => {
      const row = tileRow(gr, ctx, 22);
      row.style.animationDelay = 300 + i * 90 + 'ms';
      hand.appendChild(row);
    });
    left.appendChild(hand);
  }
  wrap.appendChild(left);
  wrap.appendChild(right);
  // puan tablosu: bu el değişimi + toplam, sıralı
  const table = document.createElement('div');
  table.className = 'result__table';
  const order = [0, 1, 2, 3].sort((a, b) => (s.rules.mode === 'okey101' ? r.totals[a] - r.totals[b] : r.totals[b] - r.totals[a]));
  order.forEach((i, rank) => {
    const d = r.deltas[i];
    const row = document.createElement('div');
    row.className = 'result__row' + (i === 0 ? ' is-me' : '') + (i === r.winner ? ' is-winner' : '');
    row.style.animationDelay = 160 + rank * 90 + 'ms';
    row.dataset.rank = rank + 1;
    row.innerHTML = `<span class="result__rank">${rank + 1}</span><span class="result__pav">${avatarSVG(roster[i].avatar)}</span><span class="result__name">${esc(name(i))}</span>
      <span class="result__delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}</span><b class="result__total num" data-to="${r.totals[i]}">${r.totals[i] - d}</b>`;
    table.appendChild(row);
  });
  right.appendChild(table);
  const penalties = (r.penalties || []).filter((p) => p.points);
  if (penalties.length) {
    const p = document.createElement('p');
    p.className = 'result__note';
    p.textContent = 'Cezalar: ' + penalties.slice(0, 2).map((x) => `${name(x.seat)} +${x.points}`).join(' · ') + (penalties.length > 2 ? ` · +${penalties.length - 2} ceza daha` : '');
    right.appendChild(p);
  }
  const hint = document.createElement('p');
  hint.className = 'result__note';
  hint.textContent = s.rules.mode === 'okey101' ? 'En düşük puan kazanır.' : 'En yüksek puan kazanır.';
  if (!penalties.length) right.appendChild(hint);
  const actions = [];
  if (!matchOver) actions.push({ label: 'Sonraki el', primary: true, run: o.onNext });
  actions.push({ label: 'Geçmiş', close: false, run: () => historySheet(host, o.controller, history) });
  actions.push({ label: matchOver ? 'Yeni oyun' : 'Menü', primary: matchOver, run: matchOver ? o.onAgain : o.onMenu });
  const sh = sheet(host, { title: matchOver ? 'Maç sonucu' : `El ${r.round} sonucu`, body: wrap, actions, cls: 'is-result', dismissable: false });
  if (won) {
    const cv = document.createElement('canvas');
    cv.className = 'result__confetti';
    sh.el.appendChild(cv);
    const cf = new Confetti(cv);
    const W = sh.el.clientWidth;
    const H = sh.el.clientHeight;
    [0, 260, 520].forEach((d, i) => setTimeout(() => cf.burst(W * (0.25 + i * 0.25), H * 0.75, 46), 350 + d));
    setTimeout(() => cv.remove(), 6500);
  }
  // toplamlar sayarak
  setTimeout(() => {
    sh.el.querySelectorAll('[data-to]').forEach((el) => {
      const to = +el.dataset.to;
      const from = +el.textContent;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 900);
        el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, 450);
  return sh;
}

// ───────────── Geçmiş: önceki eller + bu elde atılan taşlar ─────────────
export function historySheet(host, ctl, history = []) {
  const g = ctl?.game;
  if (!g) return;
  const s = g.state;
  const roster = ctl.roster;
  const name = (i) => (i === 0 ? 'Sen' : roster[i].name);
  const body = document.createElement('div');
  body.className = 'hist';
  const h1 = document.createElement('h3');
  h1.textContent = 'Bu elde atılan taşlar';
  body.appendChild(h1);
  for (let i = 0; i < 4; i++) {
    const row = document.createElement('div');
    row.className = 'hist__row';
    row.innerHTML = `<span class="hist__who"><i>${avatarSVG(roster[i].avatar)}</i>${esc(name(i))}<em>${s.discards[i].length}</em></span>`;
    const tiles = s.discards[i];
    if (tiles.length) row.appendChild(tileRow(tiles, s.ctx, 20, 'hist__tiles'));
    else row.insertAdjacentHTML('beforeend', '<span class="hist__none">henüz atmadı</span>');
    body.appendChild(row);
  }
  const ind = s.ctx.indicator;
  body.insertAdjacentHTML('beforeend', `<p class="hist__meta">Gösterge ${COLOR_TR[COLORS[(ind / 26) | 0]] ?? ''} ${((ind % 26) >> 1) + 1} · Okey ${COLOR_TR[COLORS[s.ctx.oc]]} ${s.ctx.ov} · Destede ${s.stock.length} taş</p>`);
  const h2 = document.createElement('h3');
  h2.textContent = 'Önceki eller';
  body.appendChild(h2);
  if (!history.length) body.insertAdjacentHTML('beforeend', '<p class="hist__none">Bu maçta henüz biten el yok.</p>');
  for (const h of history) {
    body.insertAdjacentHTML('beforeend', `<div class="hist__round"><b>El ${h.round}</b><span>${h.winner === null ? 'Berabere' : esc(name(h.winner)) + ' · ' + esc(FINISH_LABEL[h.finish] || '')}</span><span class="num">${h.deltas.map((d, i) => `${esc(name(i))} ${d > 0 ? '+' : ''}${d}`).join(' · ')}</span></div>`);
  }
  return sheet(host, { title: 'Oyun özeti', body, cls: 'is-history' });
}

// ───────────── Ayarlar ─────────────
export function settingsSheet(host, settings) {
  const seg = (key, opts) => `<div class="seg" role="radiogroup" data-key="${key}">${opts.map(([v, l]) => `<button role="radio" data-v="${v}" aria-checked="${String(settings.get(key)) === String(v)}">${l}</button>`).join('')}</div>`;
  const sw = (key, label) => `<label class="set-row"><span>${label}</span><button class="switch" role="switch" data-sw="${key}" aria-checked="${!!settings.get(key)}"><i></i></button></label>`;
  const body = document.createElement('div');
  body.className = 'settings2';
  body.innerHTML = `
    <h3>Ses</h3>${sw('sfx', 'Efekt sesleri')}${sw('music', 'Müzik')}${sw('haptics', 'Titreşim')}
    <h3>Oynanış</h3>
    <div class="set-row"><span>Bot hızı</span>${seg('botSpeed', [['slow', 'Yavaş'], ['normal', 'Normal'], ['fast', 'Hızlı']])}</div>
    ${sw('tapToDiscard', 'Seçili taşa ikinci dokunuşla at')}${sw('meldHints', 'Perleri ıstakada işaretle')}${sw('tutorial', 'İpuçlarını göster')}
    <h3>Görünüm ve erişilebilirlik</h3>
    <div class="set-row"><span>Animasyon</span>${seg('motion', [['auto', 'Sistem'], ['full', 'Tam'], ['reduced', 'Az']])}</div>
    <div class="set-row"><span>Yazı boyutu</span>${seg('textScale', [['0.9', 'Küçük'], ['1', 'Normal'], ['1.15', 'Büyük'], ['1.3', 'Çok büyük']])}</div>
    <div class="set-row"><span>Istaka</span>${seg('rack', [['walnut', 'Ceviz'], ['maple', 'Akçaağaç'], ['ebony', 'Abanoz']])}</div>
    <div class="set-row"><span>Taşlar</span>${seg('tiles', [['ivory', 'Fildişi'], ['bone', 'Kemik'], ['onyx', 'Oniks']])}</div>`;
  body.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sw]');
    if (s) {
      const k = s.dataset.sw;
      settings.set(k, !settings.get(k));
      s.setAttribute('aria-checked', String(!!settings.get(k)));
      return;
    }
    const b = e.target.closest('.seg [data-v]');
    if (b) {
      const g = b.parentElement;
      const k = g.dataset.key;
      const v = k === 'textScale' ? Number(b.dataset.v) : b.dataset.v;
      settings.set(k, v);
      g.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    }
  });
  return sheet(host, { title: 'Ayarlar', body, actions: [{ label: 'Tamam', primary: true }] });
}
