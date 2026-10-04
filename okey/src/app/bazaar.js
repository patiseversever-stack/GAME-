// Çarşı: çini kaplı sivri kemer altında sıcak ışıklı dükkân; modern kart ızgarası.
// Öğeler ödüllü reklamla (ilerleme sayacı) açılır; çip fiyatı çevrim içi oyunla gelecek ("yakında").
// Taş takımları seviyeyle de açılır (kartta not edilir). Kuşanma anında uygulanır.
import { FRAMES, EFFECTS, TILESETS, KIND_NAME } from '../meta/progression.js';
import { rewardArt } from './reward-art.js';
import { requestRewardedAd } from './ads.js';
import { Celebration } from '../ui/effects.js';
import { hydrateFrames } from '../ui/frame-ui.js';
import { icon } from '../ui/icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n) => n.toLocaleString('tr-TR');

const TABS = [
  ['tiles', 'Taş takımları', TILESETS],
  ['frame', 'Çerçeveler', FRAMES],
  ['effect', 'Kutlamalar', EFFECTS],
];

const ARCH = `<svg class="bz-arch" viewBox="0 0 800 112" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs>
<pattern id="bzp" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#1d3e93"/><path d="M11 3.5l2.1 5.4 5.4 2.1-5.4 2.1L11 18.5l-2.1-5.4L3.5 11l5.4-2.1z" fill="#f4f0e6"/><circle cx="11" cy="11" r="1.8" fill="#c23a2c"/><circle cx="0" cy="0" r="2.6" fill="#2f9c95"/><circle cx="22" cy="0" r="2.6" fill="#2f9c95"/><circle cx="0" cy="22" r="2.6" fill="#2f9c95"/><circle cx="22" cy="22" r="2.6" fill="#2f9c95"/></pattern>
<linearGradient id="bzg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".4" stop-color="#d7ac4a"/><stop offset=".7" stop-color="#8a6020"/><stop offset="1" stop-color="#e2bd62"/></linearGradient>
<radialGradient id="bzw" cx=".5" cy=".95" r=".85"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset=".6" stop-color="#b8661e" stop-opacity=".15"/><stop offset="1" stop-color="#2a1406" stop-opacity="0"/></radialGradient>
<linearGradient id="bzs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
<rect x="-400" y="94" width="1600" height="14" fill="url(#bzp)"/><rect x="-400" y="94" width="1600" height="14" fill="url(#bzs)"/>
<path d="M-400 93.5H1200M-400 108.5H1200" stroke="url(#bzg)" stroke-width="2"/>
<path d="M236 108V74Q236 40 400 26Q564 40 564 74V108Z" fill="url(#bzw)"/>
<path d="M206 108V72Q206 22 400 4Q594 22 594 72V108H564V74Q564 40 400 26Q236 40 236 74V108Z" fill="url(#bzp)"/>
<path d="M206 108V72Q206 22 400 4Q594 22 594 72V108H564V74Q564 40 400 26Q236 40 236 74V108Z" fill="url(#bzs)" stroke="url(#bzg)" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M221 108V73Q221 31 400 15Q579 31 579 73V108" fill="none" stroke="rgba(244,240,230,.55)" stroke-width="1" stroke-dasharray="1 4"/>
<g transform="translate(400 10)"><circle r="7" fill="url(#bzg)" stroke="#5a3a0c"/><circle r="3" fill="#c23a2c"/></g>
${[140, 660]
  .map(
    (x) => `<g class="bz-lamp" transform="translate(${x} 0)"><path d="M0 0V22" stroke="url(#bzg)" stroke-width="1.5"/><circle class="bz-lamp__glow" cx="0" cy="46" r="34" fill="url(#bzw)"/><path d="M-9 26h18l-3 6H-6z" fill="url(#bzg)"/><path d="M-11 32Q-15 46 -8 58H8Q15 46 11 32Z" fill="#c2412c" stroke="url(#bzg)" stroke-width="1.8"/><path d="M-11 32Q-15 46 -8 58H8Q15 46 11 32Z" fill="rgba(255,210,120,.55)" class="bz-lamp__fire"/><path d="M0 32V58M-6 33Q-9 46 -4 57M6 33Q9 46 4 57" stroke="url(#bzg)" stroke-width="1"/><path d="M-8 58h16l-4 5h-8z" fill="url(#bzg)"/><path d="M0 63v6" stroke="url(#bzg)" stroke-width="1.4"/></g>`,
  )
  .join('')}</svg>`;

const COIN = '<svg class="bz-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#e2b14a" stroke="#7a4c0c"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="#7a4c0c" stroke-width="1"/><path d="M10 6.5l1 2.4 2.5 1.1-2.5 1.1-1 2.4-1-2.4L6.5 10l2.5-1.1z" fill="#7a4c0c"/></svg>';

// { host, profile, settings, audio, tab, focus:'kind:id' } → { close }
export function openBazaar(o) {
  const { host, profile, settings, audio } = o;
  document.querySelector('.bz')?.remove();
  const avatar = settings.get('playerAvatar');
  const el = document.createElement('div');
  el.className = 'bz';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Çarşı');
  el.innerHTML = `<div class="bz__bg" aria-hidden="true"><i></i><i></i></div>
    <header class="bz__head">${ARCH}<div class="bz__title"><small>Patisever</small><h2>Çarşı</h2></div>
      <button class="bz__x" data-close aria-label="Kapat">${icon('close')}</button></header>
    <nav class="bz__tabs" role="tablist">${TABS.map(([k, label]) => `<button role="tab" data-t="${k}">${label}</button>`).join('')}</nav>
    <div class="bz__grid" role="list"></div>
    <p class="bz__foot">${icon('ad')}<span>Reklam izleyerek aç · Çip ile satın alma çevrim içi masalarla birlikte gelecek</span></p>
    <canvas class="bz__fx" aria-hidden="true"></canvas><div class="bz__toast" role="status"></div>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const grid = el.querySelector('.bz__grid');
  const fx = new Celebration(el.querySelector('.bz__fx'));
  let tab = o.tab || 'tiles';

  const equippedId = (kind) => (kind === 'tiles' ? settings.get('tiles') : profile.equipped(kind));
  function card(kind, it, i) {
    const owned = profile.owns(kind, it.id);
    const on = owned && equippedId(kind) === it.id;
    const n = profile.adCount(kind, it.id);
    let foot;
    if (owned) foot = on ? `<span class="bz-btn bz-btn--on">${icon('check')}Kuşanıldı</span>` : `<button class="bz-btn bz-btn--equip" data-equip>Kuşan</button>`;
    else if (it.ads)
      foot = `<button class="bz-btn bz-btn--ad" data-ad>${icon('play')}<span>Reklam izle</span><em>${n}/${it.ads}</em></button>
        <span class="bz-pips">${Array.from({ length: it.ads }, (_, k) => `<i${k < n ? ' class="on"' : ''}></i>`).join('')}</span>
        <span class="bz-chip">${COIN}<b>${fmt(it.chips || 0)}</b><small>yakında</small></span>`;
    else foot = `<span class="bz-btn bz-btn--lock">${icon('lock')}Seviye ${it.level}</span>`;
    return `<article class="bz-card${owned ? ' is-owned' : ''}${on ? ' is-on' : ''}" role="listitem" data-k="${kind}" data-id="${it.id}" style="--i:${i}">
      <div class="bz-card__art" ${kind === 'effect' ? 'data-preview' : ''}>${rewardArt(kind, it, avatar)}${kind === 'effect' ? `<span class="bz-card__play">${icon('play')}Önizle</span>` : ''}</div>
      <div class="bz-card__txt"><small>${kind === 'frame' ? esc(it.series) : KIND_NAME[kind]}</small><b>${esc(it.name)}</b><p>${esc(it.desc || '')}</p>${it.level > 1 && it.ads && !owned ? `<em class="bz-card__lvl">ya da Seviye ${it.level}</em>` : ''}</div>
      <div class="bz-card__foot">${foot}</div></article>`;
  }
  function render() {
    el.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
    const list = TABS.find((t) => t[0] === tab)[2].filter((it) => it.ads || (tab === 'tiles' && it.id === 'ivory'));
    grid.innerHTML = list.map((it, i) => card(tab, it, i)).join('');
    grid.scrollLeft = 0;
    hydrateFrames(grid);
  }
  function refresh(kind, id) {
    const c = grid.querySelector(`[data-k="${kind}"][data-id="${id}"]`);
    if (!c) return render();
    const list = TABS.find((t) => t[0] === kind)[2];
    const it = list.find((x) => x.id === id);
    const tmp = document.createElement('div');
    tmp.innerHTML = card(kind, it, 0);
    const nc = tmp.firstElementChild;
    nc.style.animation = 'none';
    c.replaceWith(nc);
    hydrateFrames(grid);
    return nc;
  }
  function toast(msg) {
    const t = el.querySelector('.bz__toast');
    t.textContent = msg;
    t.classList.remove('is-on');
    void t.offsetWidth;
    t.classList.add('is-on');
  }
  const close = () => {
    fx.stop();
    el.classList.remove('is-in');
    el.classList.add('is-out');
    document.removeEventListener('keydown', key);
    setTimeout(() => el.remove(), 280);
    o.onClose?.();
  };
  const key = (e) => {
    if (e.key === 'Escape' && !document.querySelector('.adm')) close();
  };
  document.addEventListener('keydown', key);

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button, [data-preview]');
    if (!b) return;
    audio?.play?.('tap');
    if (b.matches('[data-close]')) return close();
    if (b.matches('[data-t]')) {
      tab = b.dataset.t;
      return render();
    }
    const c = b.closest('.bz-card');
    if (!c) return;
    const { k: kind, id } = c.dataset;
    if (b.matches('[data-preview]')) return fx.play(id, { calm: host.dataset?.motion === 'reduced' });
    if (b.matches('[data-equip]')) {
      if (kind === 'tiles') settings.set('tiles', id);
      else profile.equip(kind, id);
      return render();
    }
    if (b.matches('[data-ad]')) {
      b.disabled = true;
      b.classList.add('is-wait');
      const r = await requestRewardedAd(`bazaar:${kind}:${id}`, el);
      if (!r.ok) {
        b.disabled = false;
        b.classList.remove('is-wait');
        if (r.reason !== 'dismissed') toast('Reklam şu an yüklenemedi, biraz sonra yeniden dene');
        return;
      }
      const res = profile.addAd(kind, id);
      const nc = refresh(kind, id);
      if (res?.unlocked) {
        nc?.classList.add('is-unlocked');
        audio?.play?.('win', { quiet: true });
        const rc = nc?.getBoundingClientRect();
        const hr = el.getBoundingClientRect();
        if (rc) fx.burstAt(rc.left - hr.left + rc.width / 2, rc.top - hr.top + rc.height * 0.35, { rain: false });
        toast(`${TABS.find((t) => t[0] === kind)[2].find((x) => x.id === id).name} açıldı!`);
      } else if (res) {
        audio?.play?.('score', { quiet: true });
        toast(`Harika! ${res.count}/${res.need} · ${res.need - res.count} reklam kaldı`);
      }
    }
  });
  render();
  if (o.focus) {
    const [k, id] = o.focus.split(':');
    requestAnimationFrame(() => grid.querySelector(`[data-k="${k}"][data-id="${id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  }
  return { el, close };
}
