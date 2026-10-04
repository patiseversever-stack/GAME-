// Duraklatma ekranı: "Çay molası" — lamba altında çay bardağı, uyuyan kedi ve per taşlarıyla resimli kart.
// Oyun özeti / kurallar / ayarlar / ana menü kısayolları ve büyük "Oyuna dön" düğmesi.
import { sheet } from './overlays.js';

const ART = `<svg viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
  <radialGradient id="pzFelt" gradientUnits="userSpaceOnUse" cx="180" cy="74" r="260"><stop offset="0" stop-color="#2d7a55"/><stop offset=".55" stop-color="#145238"/><stop offset="1" stop-color="#0a2a1d"/></radialGradient>
  <radialGradient id="pzGlow" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#ffe1a3" stop-opacity=".55"/><stop offset=".5" stop-color="#ffd27f" stop-opacity=".14"/><stop offset="1" stop-color="#ffd27f" stop-opacity="0"/></radialGradient>
  <linearGradient id="pzBrass" x1="0" x2="1"><stop offset="0" stop-color="#7a5418"/><stop offset=".35" stop-color="#f3d58e"/><stop offset=".6" stop-color="#c49233"/><stop offset="1" stop-color="#6e4b14"/></linearGradient>
  <linearGradient id="pzTea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2672a"/><stop offset=".5" stop-color="#b3331a"/><stop offset="1" stop-color="#6e1a0e"/></linearGradient>
  <linearGradient id="pzGlass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".08"/><stop offset=".8" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
  <linearGradient id="pzTile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e6d8b8"/></linearGradient>
  <linearGradient id="pzWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4b2a"/><stop offset="1" stop-color="#3b2213"/></linearGradient>
  <radialGradient id="pzCat" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f0a457"/><stop offset=".7" stop-color="#c76d2c"/><stop offset="1" stop-color="#8e4518"/></radialGradient>
  <filter id="pzSoft" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<rect x="-400" y="-400" width="1160" height="600" fill="url(#pzFelt)"/>
<g opacity=".18" stroke="#d8b46a" fill="none"><circle cx="180" cy="232" r="120"/><circle cx="180" cy="232" r="104" stroke-dasharray="2 5"/></g>
<path d="M150 -400 L210 -400 L240 0 L330 190 L30 190 L120 0 Z" fill="url(#pzGlow)"/>
<!-- lamba -->
<line x1="180" y1="-400" x2="180" y2="14" stroke="#2a1d10" stroke-width="2"/>
<path d="M160 26 Q180 10 200 26 L206 34 Q180 40 154 34 Z" fill="url(#pzBrass)"/>
<ellipse cx="180" cy="34" rx="26" ry="4" fill="#fff3cf" opacity=".9"/>
<!-- tahta masa kenarı -->
<path d="M-400 172 L0 168 Q180 156 360 168 L760 172 L760 600 L-400 600 Z" fill="url(#pzWood)"/>
<path d="M0 168 Q180 156 360 168" fill="none" stroke="#d8a868" stroke-opacity=".5" stroke-width="1.2"/>
<!-- taşlar: 7 per -->
<g transform="translate(40 104) rotate(-8)">
  <ellipse cx="44" cy="60" rx="54" ry="8" fill="#000" opacity=".28" filter="url(#pzSoft)"/>
  <g><rect x="0" y="4" width="28" height="38" rx="5" fill="#b9a57d"/><rect x="0" y="0" width="28" height="38" rx="5" fill="url(#pzTile)"/><text x="14" y="25" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="800" font-size="19" fill="#b9252b">7</text><circle cx="14" cy="32" r="2.4" fill="#b9252b"/></g>
  <g transform="translate(31 2)"><rect x="0" y="4" width="28" height="38" rx="5" fill="#b9a57d"/><rect x="0" y="0" width="28" height="38" rx="5" fill="url(#pzTile)"/><text x="14" y="25" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="800" font-size="19" fill="#155ca8">7</text><path d="M14 29 l3 3 -3 3 -3 -3z" fill="#155ca8"/></g>
  <g transform="translate(62 4)"><rect x="0" y="4" width="28" height="38" rx="5" fill="#b9a57d"/><rect x="0" y="0" width="28" height="38" rx="5" fill="url(#pzTile)"/><text x="14" y="25" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="800" font-size="19" fill="#1c2530">7</text><path d="M14 29 l3 5 h-6z" fill="#1c2530"/></g>
</g>
<!-- çay -->
<g transform="translate(180 94)">
  <ellipse cx="0" cy="62" rx="40" ry="8" fill="#000" opacity=".3" filter="url(#pzSoft)"/>
  <ellipse cx="0" cy="56" rx="34" ry="8.5" fill="#a5281f"/>
  <ellipse cx="0" cy="54" rx="34" ry="8" fill="#d64235"/>
  <ellipse cx="0" cy="54" rx="24" ry="5" fill="#f4e9d8" opacity=".9"/>
  <ellipse cx="0" cy="54" rx="31" ry="7" fill="none" stroke="#f3d58e" stroke-width="1"/>
  <path d="M-15 -4 C-16 10 -6 18 -7 30 C-8 42 -12 48 -10 54 L10 54 C12 48 8 42 7 30 C6 18 16 10 15 -4 Z" fill="url(#pzTea)"/>
  <path d="M-17 -10 C-18 6 -7 16 -8 30 C-9 42 -13 48 -11 55 L11 55 C13 48 9 42 8 30 C7 16 18 6 17 -10 Z" fill="url(#pzGlass)" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>
  <ellipse cx="0" cy="-10" rx="17" ry="3" fill="none" stroke="url(#pzBrass)" stroke-width="1.6"/>
  <ellipse cx="0" cy="-3.5" rx="15" ry="2.4" fill="#f07a3a" opacity=".9"/>
  <path d="M12 -9 L30 -26" stroke="url(#pzBrass)" stroke-width="2" stroke-linecap="round"/>
  <g class="pz-steam" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.2" opacity=".55">
    <path d="M-6 -16 C-12 -26 0 -32 -6 -44"/><path d="M4 -18 C-2 -30 10 -36 4 -50"/><path d="M12 -15 C8 -24 16 -28 12 -38"/>
  </g>
</g>
<!-- uyuyan kedi -->
<g transform="translate(272 128)">
  <ellipse cx="2" cy="32" rx="52" ry="8" fill="#000" opacity=".3" filter="url(#pzSoft)"/>
  <path d="M-40 26 C-46 4 -24 -14 2 -14 C30 -14 48 4 44 24 C42 32 30 34 2 34 C-24 34 -38 32 -40 26 Z" fill="url(#pzCat)"/>
  <g stroke="#8e4518" stroke-width="2.2" stroke-linecap="round" opacity=".55" fill="none"><path d="M-6 -12 C-2 -4 -2 4 -6 10"/><path d="M8 -13 C12 -4 12 4 8 12"/><path d="M22 -9 C26 -2 26 6 22 14"/></g>
  <path d="M44 22 C56 26 50 40 30 38 C10 36 -14 40 -30 34" fill="none" stroke="#c76d2c" stroke-width="9" stroke-linecap="round"/>
  <path d="M44 22 C56 26 50 40 30 38" fill="none" stroke="#8e4518" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 6" opacity=".6"/>
  <g transform="translate(-30 14)">
    <path d="M-16 -2 L-14 -20 L-4 -10 Z" fill="#c76d2c"/><path d="M-13 -5 L-12 -15 L-7 -9 Z" fill="#f6b9a0"/>
    <path d="M6 -10 L14 -20 L16 -2 Z" fill="#c76d2c"/><path d="M8 -9 L13 -15 L13 -6 Z" fill="#f6b9a0"/>
    <ellipse cx="0" cy="4" rx="19" ry="15" fill="url(#pzCat)"/>
    <path d="M-10 3 q4 3 8 0 M3 3 q4 3 8 0" fill="none" stroke="#3a1c0c" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-1 8 l2 0 -1 1.6z" fill="#7a2c1c"/>
    <g stroke="#fff" stroke-opacity=".6" stroke-width=".8"><path d="M-6 10 h-12 M-6 12 l-11 3 M6 10 h12 M6 12 l11 3"/></g>
  </g>
  <g class="pz-z" font-family="Playfair Display,Georgia,serif" font-weight="800" fill="#f6ead0">
    <text x="-46" y="-6" font-size="11">z</text><text x="-56" y="-20" font-size="14">z</text><text x="-68" y="-38" font-size="18">Z</text>
  </g>
</g>
<!-- yıldız tozu -->
<g fill="#ffe7a8" class="pz-dust"><circle cx="70" cy="40" r="1.2"/><circle cx="292" cy="54" r="1"/><circle cx="236" cy="30" r="1.4"/><circle cx="118" cy="62" r=".9"/><circle cx="318" cy="96" r="1.1"/></g>
</svg>`;

const ICON = {
  summary: '<svg viewBox="0 0 36 36"><rect x="5" y="17" width="7" height="13" rx="2"/><rect x="14.5" y="10" width="7" height="20" rx="2"/><rect x="24" y="5" width="7" height="25" rx="2"/><path d="M4 32h28"/></svg>',
  rules: '<svg viewBox="0 0 36 36"><path d="M18 9c-4-3-9-3-13-2v21c4-1 9-1 13 2 4-3 9-3 13-2V7c-4-1-9-1-13 2z"/><path d="M18 9v21"/><path d="M9 13h5M9 18h5M22 13h5M22 18h5"/></svg>',
  settings: '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="4.5"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8.1 8.1l2.8 2.8M25.1 25.1l2.8 2.8M8.1 27.9l2.8-2.8M25.1 10.9l2.8-2.8"/><circle cx="18" cy="18" r="10"/></svg>',
  menu: '<svg viewBox="0 0 36 36"><path d="M6 17L18 7l12 10"/><path d="M9 15v15h18V15"/><path d="M15 30v-8h6v8"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
const ITEMS = [
  ['summary', 'Oyun özeti', 'Atılanlar, eller'],
  ['rules', 'Kurallar', 'Nasıl oynanır'],
  ['settings', 'Ayarlar', 'Taşlar, ses'],
  ['menu', 'Ana menü', 'Kaydedip çık'],
];

// act: { summary, rules, settings, menu } — her biri ilgili ekranı açar
export function pauseScreen(root, act) {
  const body = document.createElement('div');
  body.className = 'pz';
  body.innerHTML = `<div class="pz__art">${ART}</div>
  <div class="pz__main">
    <p class="pz__eyebrow">${ICON.check}<span>Oyun kaydedildi</span></p>
    <h2 class="pz__title">Çay molası</h2>
    <p class="pz__sub">Masa seni bekliyor. İstediğin an kaldığın yerden sürer.</p>
    <div class="pz__grid">${ITEMS.map(([k, t, d]) => `<button type="button" class="pz__item pz__item--${k}" data-pz="${k}"><i>${ICON[k]}</i><b>${t}</b><small>${d}</small></button>`).join('')}</div>
    <button type="button" class="pz__resume" data-pz="resume"><i>${ICON.play}</i><span>Oyuna dön</span></button>
  </div>`;
  const sh = sheet(root, { title: 'Çay molası', sub: 'Oyun kaydedildi', icon: '', tone: 'teal', body, actions: [], cls: 'is-pause is-pz' });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pz]');
    if (!b) return;
    const k = b.dataset.pz;
    if (k === 'resume' || k === 'menu') sh.close();
    if (k !== 'resume') act[k]?.();
  });
  // yatay telefonda illüstrasyon yan sütunda tamamı görünür; dikeyde üst bantta kırpılır
  const svg = body.querySelector('svg');
  const mq = matchMedia('(orientation:landscape) and (max-height:540px)');
  const fit = () => svg.setAttribute('preserveAspectRatio', mq.matches ? 'xMidYMax meet' : 'xMidYMid slice');
  fit();
  if (mq.addEventListener) mq.addEventListener('change', fit);
  else mq.addListener(fit);
  setTimeout(() => body.querySelector('.pz__resume')?.focus({ preventScroll: true }), 60);
  return sh;
}
