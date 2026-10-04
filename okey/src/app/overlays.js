// Oyun üstü sayfalar: el sonucu, geçmiş (tek dokunuş), duraklatma, nasıl oynanır.
// Tek tip "sayfa" bileşeni (.sheet): koyu panel, başlık, içerik, eylem satırı. Klavye: Esc kapatır, odak içeride.
import { createTileEl } from '../ui/tile-dom.js';
import { avatarSVG } from '../ui/avatars.js';
import { FINISH_LABEL } from '../game/scoring.js';
import { COLORS, COLOR_TR } from '../game/tiles.js';
import { icon } from '../ui/icons.js';
import { resultScreen as cinematicResult } from './result.js';
import { openBazaar } from './bazaar.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function sheet(host, { title, sub = '', icon: ic = '', tone = 'blue', body = '', actions = [], cls = '', onClose, dismissable = true }) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap ' + cls;
  el.innerHTML = `<div class="sheet-frame t-${tone}">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet__head">${ic ? `<span class="sheet__medal">${icon(ic)}</span>` : ''}<div class="sheet__ttl"><h2 class="sheet__title">${title}</h2>${sub ? `<p class="sheet__sub">${sub}</p>` : ''}</div>${dismissable ? '<button class="sheet__x" data-x aria-label="Kapat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : ''}</header>
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
  const dlg = el.querySelector('.sheet');
  dlg.tabIndex = -1;
  setTimeout(() => dlg.focus({ preventScroll: true }), 30);
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

// ───────────── El sonucu: sinematik iki sayfalı ekran (result.js) ─────────────
export function resultScreen(host, o, history) {
  return cinematicResult(host, o, history, historySheet);
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
  return sheet(host, { title: 'Oyun özeti', sub: 'Atılan taşlar ve önceki eller', icon: 'chart', tone: 'blue', body, cls: 'is-history' });
}

// ───────────── Ayarlar ─────────────
export function settingsSheet(host, settings) {
  // taş takımları seviye ya da Çarşı ile açılır: kilitli olan kilit simgesiyle durur, dokununca Çarşı açılır
  const prof = window.__okey?.profile;
  const locked = (key, v) => key === 'tiles' && prof && !prof.owns('tiles', v);
  const seg = (key, opts) =>
    `<div class="seg" role="radiogroup" data-key="${key}">${opts.map(([v, l]) => `<button role="radio" data-v="${v}" aria-checked="${String(settings.get(key)) === String(v)}"${locked(key, v) ? ' class="is-locked"' : ''}>${locked(key, v) ? icon('lock') : ''}${l}</button>`).join('')}</div>`;
  const IC = {
    sfx: ['volumeOn', 'c-blue'],
    music: ['music', 'c-violet'],
    haptics: ['vibrate', 'c-teal'],
    botSpeed: ['bolt', 'c-amber'],
    tapToDiscard: ['hand', 'c-mint'],
    meldHints: ['eye', 'c-blue'],
    tutorial: ['help', 'c-violet'],
    motion: ['wand', 'c-pink'],
    textScale: ['book', 'c-teal'],
    tiles: ['layers', 'c-mint'],
    gyro: ['target', 'c-pink'],
    dynLight: ['star', 'c-amber'],
    ambience: ['music', 'c-teal'],
    quality: ['layers', 'c-blue'],
    difficulty: ['trophy', 'c-pink'],
    fs: ['expand', 'c-slate'],
  };
  const lab = (key, label) => `<span class="set-lab"><i class="${(IC[key] || [])[1] || 'c-slate'}">${icon((IC[key] || ['cog'])[0])}</i>${label}</span>`;
  const sw = (key, label) => `<label class="set-row">${lab(key, label)}<button class="switch" role="switch" data-sw="${key}" aria-checked="${!!settings.get(key)}"><i></i></button></label>`;
  // Tam ekran yalnız tarayıcıda (uygulama WebView'ı kendi tam ekranını yönetir)
  const fsRow =
    document.documentElement.requestFullscreen && !window.ReactNativeWebView
      ? `<div class="set-row">${lab('fs', 'Tam ekran')}<button class="switch" role="switch" data-fs aria-checked="${!!document.fullscreenElement}"><i></i></button></div>`
      : '';
  const body = document.createElement('div');
  body.className = 'settings2';
  const sec = (ttl, tone, inner) => `<section class="set-card t-${tone}"><h3>${ttl}</h3><div class="set-group">${inner}</div></section>`;
  body.innerHTML = [
    sec('Ses', 'blue', `${sw('sfx', 'Efekt sesleri')}${sw('music', 'Müzik')}${sw('haptics', 'Titreşim')}`),
    sec(
      'Deneyim',
      'pink',
      `${sw('gyro', 'Jiroskop kamera')}<p class="set-hint">Telefonu eğdikçe masa ve lamba ışığı hareket eder.</p>${sw('ambience', 'Kahvehane ambiyansı')}${sw('cinematic', 'Sinematik kamera')}${fsRow}<div class="set-row">${lab('quality', 'Grafik')}${seg(
        'quality',
        [
          ['auto', 'Oto'],
          ['high', 'Yüksek'],
          ['medium', 'Dengeli'],
          ['low', 'Pil'],
        ],
      )}</div>`,
    ),
    sec(
      'Oynanış',
      'mint',
      `<div class="set-row">${lab('difficulty', 'Rakip seviyesi')}${seg('lastDifficulty', [
        ['casual', 'Kolay'],
        ['normal', 'Normal'],
        ['expert', 'Uzman'],
        ['mixed', 'Karışık'],
      ])}</div><div class="set-row">${lab('botSpeed', 'Bot hızı')}${seg('botSpeed', [
        ['slow', 'Yavaş'],
        ['normal', 'Normal'],
        ['fast', 'Hızlı'],
      ])}</div>${sw('tapToDiscard', 'İkinci dokunuşla at')}${sw('meldHints', 'Perleri ıstakada işaretle')}${sw('tutorial', 'İpuçlarını göster')}`,
    ),
    sec(
      'Görünüm',
      'amber',
      `<div class="set-row">${lab('tiles', 'Taşlar')}${seg('tiles', [
        ['ivory', 'Fildişi'],
        ['cini', 'Çini'],
        ['ebru', 'Ebru'],
        ['yagli', 'Yağlı boya'],
      ])}</div><div class="set-row">${lab('motion', 'Animasyon')}${seg('motion', [
        ['auto', 'Sistem'],
        ['full', 'Tam'],
        ['reduced', 'Az'],
      ])}</div><div class="set-row">${lab('textScale', 'Yazı boyutu')}${seg('textScale', [
        ['0.9', 'Küçük'],
        ['1', 'Normal'],
        ['1.15', 'Büyük'],
        ['1.3', 'Çok büyük'],
      ])}</div>`,
    ),
  ].join('');
  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fs]');
    if (f) {
      toggleFullscreen();
      setTimeout(() => f.setAttribute('aria-checked', String(!!document.fullscreenElement)), 300);
      return;
    }
    const s = e.target.closest('[data-sw]');
    if (s) {
      const k = s.dataset.sw;
      // iOS: jiroskop izni kullanıcı dokunuşu içinde istenmeli
      if (k === 'gyro' && !settings.get(k) && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
      settings.set(k, !settings.get(k));
      s.setAttribute('aria-checked', String(!!settings.get(k)));
      return;
    }
    const b = e.target.closest('.seg [data-v]');
    if (b) {
      const g = b.parentElement;
      const k = g.dataset.key;
      const v = k === 'textScale' ? Number(b.dataset.v) : b.dataset.v;
      if (locked(k, v)) {
        openBazaar({ host, profile: prof, settings, audio: window.__okey?.audio, tab: 'tiles', focus: 'tiles:' + v, onClose: () => g.querySelectorAll('[data-v]').forEach((x) => !locked(k, x.dataset.v) && x.classList.remove('is-locked')) });
        return;
      }
      settings.set(k, v);
      g.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    }
  });
  const sh = sheet(host, { title: 'Ayarlar', sub: 'Oyunu kendine göre ayarla', icon: 'cog', tone: 'teal', body, actions: [{ label: 'Tamam', primary: true }], cls: 'is-settings' });
  settingsTabs(sh.el);
  return sh;
}

// Tam ekran aç/kapat; açılınca telefon yataya kilitlenmeye çalışılır
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else
      document.documentElement
        .requestFullscreen?.({ navigationUI: 'hide' })
        ?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {}))
        .catch(() => {});
  } catch {}
}

// Ayarlar: solda bölüm rayı, sağda tek bölüm (kaydırma ve alt çubuk yok). Son açık bölüm hatırlanır.
const SET_ART = {
  Ses: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  Deneyim: '<rect x="8" y="3.5" width="8.5" height="17" rx="2.2" transform="rotate(-14 12 12)"/><path d="M3.6 9a8.6 8.6 0 0 0 1 7.4M20.4 15a8.6 8.6 0 0 0-1-7.4"/>',
  Oynanış:
    '<rect x="3.5" y="5.5" width="8" height="12" rx="1.8" transform="rotate(-8 7.5 11.5)"/><rect x="12.5" y="6.5" width="8" height="12" rx="1.8" transform="rotate(8 16.5 12.5)"/><circle cx="7.6" cy="11.4" r="1.3" fill="currentColor"/><circle cx="16.4" cy="12.6" r="1.3" fill="currentColor"/>',
  Görünüm:
    '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.4 0 1.9-1 1.4-2.1-.6-1.3.2-2.4 1.6-2.4h2a3.8 3.8 0 0 0 3.8-3.8c0-5-3.9-9.3-8.8-9.3z"/><circle cx="7.8" cy="11.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.6" r="1.2" fill="currentColor"/><circle cx="15" cy="7.8" r="1.2" fill="currentColor"/>',
};
const SET_SUB = { Ses: 'Efektler, müzik ve titreşim', Deneyim: 'Kamera, ortam ve ekran', Oynanış: 'Rakipler ve oyun yardımları', Görünüm: 'Taşlar, animasyon ve yazı boyutu' };
let settingsTab = 0;
function settingsTabs(wrap) {
  const s2 = wrap.querySelector('.settings2');
  const sh = wrap.querySelector('.sheet');
  if (!s2 || !sh) return;
  const cards = [...s2.children].filter((c) => c.classList.contains('set-card'));
  if (!cards.length) return;
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SET_ART[name] || '<circle cx="12" cy="12" r="8"/>'}</svg>`;
  const nav = document.createElement('nav');
  nav.className = 'h8-nav';
  nav.setAttribute('role', 'tablist');
  nav.innerHTML = '<b class="h8-ttl">Ayarlar</b>';
  const select = (i) => {
    settingsTab = Math.max(0, Math.min(cards.length - 1, i));
    cards.forEach((c, k) => c.classList.toggle('h8-on', k === settingsTab));
    nav.querySelectorAll('.h8-tab').forEach((b, k) => b.setAttribute('aria-selected', String(k === settingsTab)));
    const body = wrap.querySelector('.sheet__body');
    if (body) body.scrollTop = 0;
  };
  cards.forEach((c, i) => {
    const h = c.querySelector('h3');
    const name = h ? h.textContent.trim() : '';
    const tone = (c.className.match(/\bt-\w+/) || ['t-blue'])[0];
    if (h) {
      const hero = document.createElement('div');
      hero.className = 'h8-hero';
      hero.innerHTML = `<i class="h8-art ${tone}">${svg(name)}</i><div><b>${name}</b>${SET_SUB[name] ? `<small>${SET_SUB[name]}</small>` : ''}</div>`;
      c.insertBefore(hero, h);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'h8-tab';
    b.setAttribute('role', 'tab');
    b.innerHTML = `<i class="h8-art ${tone}">${svg(name)}</i><span>${name}</span>`;
    b.addEventListener('click', () => select(i));
    nav.appendChild(b);
  });
  sh.insertBefore(nav, sh.firstChild);
  wrap.classList.add('h8');
  select(settingsTab);
}
