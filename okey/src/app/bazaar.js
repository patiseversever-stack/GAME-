// Çarşı: sol rayda bölümler ve günlük reklam hakkı; sağda öne çıkan vitrin ve raflar; ürüne dokununca ayrıntı sayfası
// (büyük canlı önizleme, reklam ilerlemesi, bekleme sayacı, kuşanma). Öğeler yalnız tamamlanmış ödüllü reklamla açılır;
// çip fiyatı çevrim içi mağaza ile gelecek ("yakında"). Reklamlar arası bekleme ve günlük sınır profile.adGate() ile.
import { FRAMES, EFFECTS, TILESETS, KIND_NAME, itemOf } from '../meta/progression.js';
import { rewardArt, hydrateArt, toneOf } from './reward-art.js';
import { requestRewardedAd } from './ads.js';
import { Celebration } from '../ui/effects.js';
import { icon } from '../ui/icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n) => n.toLocaleString('tr-TR');
const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hx(a),
    B = hx(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
const toneVars = (kind, id) => {
  const t = toneOf(kind, id);
  return `--t0:${mix(t, '#ffffff', 0.18)};--t1:${t};--t2:${mix(t, '#000000', 0.55)};--t3:${mix(t, '#000000', 0.8)}`;
};
const clock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const KINDS = [
  ['frame', 'Çerçeveler', FRAMES, 'user'],
  ['effect', 'Kutlamalar', EFFECTS, 'star'],
  ['tiles', 'Taş takımları', TILESETS, 'layers'],
];
const FEATURED = [
  ['frame', 'sedef', 'Yeni · Zanaat'],
  ['effect', 'kelebek', 'Yeni kutlama'],
  ['tiles', 'cini', 'Taş takımı'],
  ['frame', 'tezhip', 'Zanaat'],
];
const shopList = (kind) => KINDS.find((k) => k[0] === kind)[2].filter((it) => it.ads);
const ARCH = '<svg viewBox="0 0 40 44" aria-hidden="true"><defs><pattern id="bz2p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#1d3e93"/><path d="M4 1l.9 2.1L7 4l-2.1.9L4 7l-.9-2.1L1 4l2.1-.9z" fill="#f4f0e6"/></pattern><linearGradient id="bz2g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d7ac4a"/><stop offset="1" stop-color="#8a6020"/></linearGradient></defs><path d="M2 44V20Q2 6 20 1Q38 6 38 20V44H31V21Q31 11 20 7Q9 11 9 21V44Z" fill="url(#bz2p)" stroke="url(#bz2g)" stroke-width="1.4"/><path d="M9 44V21Q9 11 20 7Q31 11 31 21V44Z" fill="rgba(255,190,90,.22)"/></svg>';

// { host, profile, settings, audio, tab, focus:'kind:id', onClose } → { el, close }
export function openBazaar(o) {
  const { host, profile, settings, audio } = o;
  document.querySelector('.bz2')?.remove();
  const avatar = settings.get('playerAvatar');
  const calm = host.dataset?.motion === 'reduced';
  const el = document.createElement('div');
  el.className = 'bz2';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Çarşı');
  el.innerHTML = `
    <div class="bz2__bg" aria-hidden="true"><i class="bz2-blob bz2-blob--a"></i><i class="bz2-blob bz2-blob--b"></i><i class="bz2-grain"></i></div>
    <aside class="bz2__rail">
      <div class="bz2__brand"><span class="bz2__arch">${ARCH}</span><div><small>Patisever</small><h2>Çarşı</h2></div></div>
      <nav class="bz2__nav">
        <button data-v="featured">${icon('star')}<span>Öne çıkan</span></button>
        ${KINDS.map(([k, label, , ic]) => `<button data-v="${k}">${icon(ic)}<span>${label}</span><em>${shopList(k).length}</em></button>`).join('')}
      </nav>
      <div class="bz2__budget"></div>
    </aside>
    <main class="bz2__main"></main>
    <button class="bz2__x" data-close aria-label="Kapat">${icon('close')}</button>
    <canvas class="bz2__fx" aria-hidden="true"></canvas>
    <div class="bz2__toast" role="status"></div>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const main = el.querySelector('.bz2__main');
  const fx = new Celebration(el.querySelector('.bz2__fx'));
  let view = o.tab || 'featured';
  let heroTimer = 0,
    heroIdx = 0,
    heroFx = null,
    sheet = null;
  const timers = new Set();

  const equippedId = (kind) => (kind === 'tiles' ? settings.get('tiles') : profile.equipped(kind));
  const status = (kind, it) => {
    const owned = profile.owns(kind, it.id);
    return { owned, on: owned && equippedId(kind) === it.id, n: profile.adCount(kind, it.id), need: it.ads || 0 };
  };

  // ── rayda günlük reklam hakkı ──
  function budget() {
    const g = profile.adGate();
    const C = 2 * Math.PI * 15;
    const frac = g.left / g.cap;
    el.querySelector('.bz2__budget').innerHTML = `<span class="bz2-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle class="v" cx="18" cy="18" r="15" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - frac)).toFixed(1)}"/></svg><b>${g.left}</b></span>
      <span class="bz2-budget__t"><b>Bugün ${g.left} reklam hakkı</b><small>${g.left === 0 ? 'Yarın yenilenir' : g.waitMs ? `Sonraki reklam ${clock(g.waitMs)}` : 'Reklam izlemeye hazır'}</small></span>`;
    return g;
  }

  // ── kart ──
  function card(kind, it, i) {
    const s = status(kind, it);
    const state = s.on
      ? `<span class="bz2-tag bz2-tag--on">${icon('check')}Kuşanıldı</span>`
      : s.owned
        ? `<span class="bz2-tag bz2-tag--own">Sende</span>`
        : `<span class="bz2-pips" aria-label="${s.n}/${s.need} reklam">${Array.from({ length: s.need }, (_, k) => `<i${k < s.n ? ' class="on"' : ''}></i>`).join('')}</span><span class="bz2-cnt">${s.n}/${s.need}</span>`;
    return `<button class="bz2-card${s.owned ? ' is-owned' : ''}" data-k="${kind}" data-id="${it.id}" style="${toneVars(kind, it.id)};--i:${i}">
      <span class="bz2-card__art">${rewardArt(kind, it, avatar)}</span>
      <span class="bz2-card__meta"><b>${esc(it.name)}</b><small>${esc(kind === 'frame' ? it.series : KIND_NAME[kind])}</small></span>
      <span class="bz2-card__state">${state}</span></button>`;
  }

  // ── öne çıkan vitrin + raflar ──
  function renderFeatured() {
    main.innerHTML = `<section class="bz2-hero" aria-roledescription="vitrin">${FEATURED.map(([k, id, eyebrow], i) => {
      const it = itemOf(k, id);
      const s = status(k, it);
      return `<article class="bz2-slide${i === heroIdx ? ' is-on' : ''}" data-k="${k}" data-id="${id}" style="${toneVars(k, id)}">
        <div class="bz2-slide__copy"><span class="bz2-eyebrow">${esc(eyebrow)}</span><h3>${esc(it.name)}</h3><p>${esc(it.desc)}</p>
          <span class="bz2-slide__cta"><span class="bz2-btn">${s.owned ? 'Sende' : 'İncele'}</span>${s.owned ? '' : `<small>${s.n}/${s.need} reklam</small>`}</span></div>
        <div class="bz2-slide__art${k === 'effect' ? ' is-fx' : ''}">${k === 'effect' ? '<canvas></canvas>' : rewardArt(k, it, avatar)}</div></article>`;
    }).join('')}<div class="bz2-dots">${FEATURED.map((_, i) => `<button data-hero="${i}" aria-label="Vitrin ${i + 1}"${i === heroIdx ? ' aria-current="true"' : ''}></button>`).join('')}</div></section>
      ${KINDS.map(([k, label]) => `<section class="bz2-shelf"><header><h4>${label}</h4><button data-v="${k}">Tümü ${icon('chevron')}</button></header><div class="bz2-row">${shopList(k).map((it, i) => card(k, it, i)).join('')}</div></section>`).join('')}`;
    hydrateArt(main);
    playHero();
  }
  function playHero() {
    clearInterval(heroTimer);
    heroFx?.stop();
    heroFx = null;
    const slide = main.querySelector('.bz2-slide.is-on');
    if (slide?.dataset.k === 'effect') {
      heroFx = new Celebration(slide.querySelector('canvas'));
      const run = () => heroFx?.play(slide.dataset.id, { scale: 0.7, calm });
      run();
      heroFx._loop = setInterval(run, 4200);
    }
    heroTimer = setInterval(() => showHero((heroIdx + 1) % FEATURED.length), 6500);
  }
  function showHero(i) {
    heroIdx = i;
    main.querySelectorAll('.bz2-slide').forEach((s, k) => s.classList.toggle('is-on', k === i));
    main.querySelectorAll('[data-hero]').forEach((b, k) => b.toggleAttribute('aria-current', k === i));
    if (heroFx) clearInterval(heroFx._loop);
    playHero();
  }
  function renderKind(kind) {
    const [, label, list] = KINDS.find((k) => k[0] === kind);
    const shop = list.filter((it) => it.ads);
    main.innerHTML = `<header class="bz2-head"><h3>${label}</h3><p>${shop.length} ürün · reklam izleyerek açılır</p></header><div class="bz2-grid">${shop.map((it, i) => card(kind, it, i)).join('')}</div>`;
    hydrateArt(main);
  }
  function render() {
    clearInterval(heroTimer);
    if (heroFx) {
      clearInterval(heroFx._loop);
      heroFx.stop();
      heroFx = null;
    }
    el.querySelectorAll('.bz2__nav [data-v]').forEach((b) => b.toggleAttribute('aria-current', b.dataset.v === view));
    main.scrollTop = 0;
    if (view === 'featured') renderFeatured();
    else renderKind(view);
    budget();
  }

  // ── ayrıntı sayfası ──
  function openSheet(kind, id) {
    closeSheet(true);
    const it = itemOf(kind, id);
    const sh = document.createElement('div');
    sh.className = 'bz2-sheet';
    sh.style.cssText = toneVars(kind, id);
    sh.innerHTML = `<div class="bz2-sheet__veil" data-sheet-x></div>
      <div class="bz2-sheet__card" role="dialog" aria-label="${esc(it.name)}">
        <div class="bz2-sheet__stage${kind === 'effect' ? ' is-fx' : ''}"><i class="bz2-sheet__light"></i>${kind === 'effect' ? '<canvas></canvas>' : `<span class="bz2-sheet__art">${rewardArt(kind, it, avatar)}</span>`}<i class="bz2-sheet__floor"></i></div>
        <div class="bz2-sheet__info"></div>
        <button class="bz2-sheet__x" data-sheet-x aria-label="Kapat">${icon('close')}</button>
      </div>`;
    el.appendChild(sh);
    hydrateArt(sh);
    requestAnimationFrame(() => sh.classList.add('is-in'));
    const stageFx = new Celebration(kind === 'effect' ? sh.querySelector('.bz2-sheet__stage canvas') : el.querySelector('.bz2__fx'));
    let loop = 0;
    if (kind === 'effect') {
      const run = () => stageFx.play(id, { scale: 0.85, calm });
      setTimeout(run, 250);
      loop = setInterval(run, 4600);
    }
    const tick = setInterval(() => paintInfo(), 1000);
    timers.add(tick);
    sheet = { el: sh, kind, id, it, stageFx, loop, tick };
    paintInfo();
  }
  function paintInfo() {
    if (!sheet) return;
    const { kind, it, el: sh } = sheet;
    const s = status(kind, it);
    const g = budget();
    let cta, note;
    if (s.on) {
      cta = `<button class="bz2-cta is-done" disabled>${icon('check')}Kuşanıldı</button>`;
      note = 'Bu öğe şu an kullanımda.';
    } else if (s.owned) {
      cta = `<button class="bz2-cta" data-equip>Kuşan</button>`;
      note = 'Koleksiyonunda. İstediğin zaman kuşanabilirsin.';
    } else if (g.left === 0) {
      cta = `<button class="bz2-cta" disabled>${icon('ad')}Bugünlük reklam hakkı bitti</button>`;
      note = 'Reklam hakkın gece yarısı yenilenir.';
    } else if (g.waitMs) {
      cta = `<button class="bz2-cta" disabled>${icon('ad')}${clock(g.waitMs)} sonra izleyebilirsin</button>`;
      note = `Reklamlar arasında kısa bir bekleme var · Bugün ${g.left} hakkın kaldı`;
    } else {
      cta = `<button class="bz2-cta" data-ad>${icon('play')}Reklam izle</button>`;
      note = `Reklam sonuna kadar izlenince sayılır · Bugün ${g.left} hakkın kaldı`;
    }
    const prog = s.owned
      ? ''
      : `<div class="bz2-prog"><div class="bz2-prog__bar">${Array.from({ length: s.need }, (_, k) => `<i${k < s.n ? ' class="on"' : ''}></i>`).join('')}</div><span><b>${s.n}</b> / ${s.need} reklam</span></div>`;
    const alt = s.owned ? '' : `<div class="bz2-alt">${it.level > 1 ? `<span>${icon('lock')}ya da Seviye ${it.level}’de açılır</span>` : ''}<span class="bz2-chip"><i></i>${fmt(it.chips || 0)} çip · <em>yakında</em></span></div>`;
    sh.querySelector('.bz2-sheet__info').innerHTML = `<span class="bz2-eyebrow">${esc(kind === 'frame' ? it.series : KIND_NAME[kind])}</span><h3>${esc(it.name)}</h3><p class="bz2-desc">${esc(it.desc)}</p>${prog}${cta}<p class="bz2-note">${esc(note)}</p>${alt}`;
  }
  function closeSheet(now) {
    if (!sheet) return;
    const s = sheet;
    sheet = null;
    clearInterval(s.loop);
    clearInterval(s.tick);
    timers.delete(s.tick);
    s.stageFx.stop();
    if (now) s.el.remove();
    else {
      s.el.classList.remove('is-in');
      setTimeout(() => s.el.remove(), 320);
    }
    render();
  }
  async function watchAd(btn) {
    const { kind, id, it } = sheet;
    btn.disabled = true;
    btn.classList.add('is-wait');
    btn.innerHTML = '<i class="bz2-spin"></i>Reklam yükleniyor';
    const r = await requestRewardedAd(`bazaar:${kind}:${id}`, el);
    profile.adResult(r.ok);
    if (!sheet || sheet.id !== id) return;
    if (!r.ok) {
      toast(r.reason === 'dismissed' ? 'Reklam tamamlanmadı, ödül verilmedi' : 'Şu an reklam bulunamadı, biraz sonra yeniden dene');
      paintInfo();
      return;
    }
    const res = profile.addAd(kind, id);
    paintInfo();
    if (res?.unlocked) {
      audio?.play?.('win', { quiet: true });
      sheet.el.classList.add('is-unlocked');
      const st = sheet.el.querySelector('.bz2-sheet__stage').getBoundingClientRect();
      const hr = el.getBoundingClientRect();
      fx.burstAt(st.left - hr.left + st.width / 2, st.top - hr.top + st.height / 2, { rain: false, calm });
      toast(`${it.name} açıldı!`);
    } else if (res) {
      audio?.play?.('score', { quiet: true });
      toast(`Teşekkürler! ${res.count}/${res.need} · ${res.need - res.count} reklam kaldı`);
    }
  }
  function toast(msg) {
    const t = el.querySelector('.bz2__toast');
    t.textContent = msg;
    t.classList.remove('is-on');
    void t.offsetWidth;
    t.classList.add('is-on');
  }
  const close = () => {
    closeSheet(true);
    clearInterval(heroTimer);
    if (heroFx) {
      clearInterval(heroFx._loop);
      heroFx.stop();
    }
    timers.forEach(clearInterval);
    fx.stop();
    el.classList.remove('is-in');
    el.classList.add('is-out');
    document.removeEventListener('keydown', key);
    setTimeout(() => el.remove(), 300);
    o.onClose?.();
  };
  const key = (e) => {
    if (e.key !== 'Escape' || document.querySelector('.adm')) return;
    if (sheet) closeSheet();
    else close();
  };
  document.addEventListener('keydown', key);
  const budgetTick = setInterval(() => !sheet && budget(), 1000);
  timers.add(budgetTick);

  el.addEventListener('click', (e) => {
    const t = e.target;
    let b;
    if (t.closest('.adm')) return;
    if (t.closest('[data-sheet-x]')) return closeSheet();
    if (t.closest('[data-close]')) return close();
    if ((b = t.closest('[data-ad]'))) return !b.disabled && watchAd(b);
    if (t.closest('[data-equip]') && sheet) {
      if (sheet.kind === 'tiles') settings.set('tiles', sheet.id);
      else profile.equip(sheet.kind, sheet.id);
      audio?.play?.('tap');
      return paintInfo();
    }
    if ((b = t.closest('[data-hero]'))) return showHero(+b.dataset.hero);
    if ((b = t.closest('[data-v]'))) {
      audio?.play?.('tap');
      view = b.dataset.v;
      return render();
    }
    if ((b = t.closest('.bz2-card, .bz2-slide'))) {
      audio?.play?.('tap');
      return openSheet(b.dataset.k, b.dataset.id);
    }
  });
  render();
  if (o.focus) {
    const [k, id] = o.focus.split(':');
    if (itemOf(k, id)?.ads) openSheet(k, id);
  }
  return { el, close };
}
