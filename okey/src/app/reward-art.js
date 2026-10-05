// Ödül görselleri: kutlama efekti simgeleri, taş takımı örnekleri, unvan rozeti ve tek tip ödül kartı.
// Seviye atlama ekranı, Ödüller sekmesi ve Çarşı aynı kartları kullanır.
import { framedAvatar, hydrateFrames } from '../ui/frame-ui.js';
import { tilePairHTML, hydrateTiles } from '../render3d/tile-preview.js';
import { KIND_NAME } from '../meta/progression.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const TULIP = 'M0 14C-7 10-9 1-6.5-8L-4-3.5 0-12 4-3.5 6.5-8C9 1 7 10 0 14Z';
const STAR8 = (r, ri = r * 0.62) => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8,
      q = i % 2 ? ri : r;
    d += (i ? 'L' : 'M') + (Math.cos(a) * q).toFixed(2) + ' ' + (Math.sin(a) * q).toFixed(2);
  }
  return d + 'Z';
};

export const EFFECT_ICON = {
  konfeti: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(32 30)"><path d="${STAR8(9)}" fill="#f0c766" stroke="#8a5a14" stroke-width=".8"/></g><rect x="12" y="14" width="5" height="9" rx="1" fill="#9fd0c4" transform="rotate(-25 14 18)"/><rect x="46" y="12" width="5" height="9" rx="1" fill="#e7a09a" transform="rotate(30 48 16)"/><rect x="48" y="40" width="4" height="8" rx="1" fill="#f4e6bd" transform="rotate(-15 50 44)"/><rect x="10" y="42" width="4" height="8" rx="1" fill="#2a52aa" transform="rotate(40 12 46)"/><g transform="translate(20 50) scale(.55)"><path d="${TULIP}" fill="#c23a2c"/></g><g transform="translate(44 54) scale(.45) rotate(30)"><path d="${TULIP}" fill="#2f9c95"/></g></svg>`,
  lale: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef6a55"/><stop offset="1" stop-color="#8e1e14"/></linearGradient><linearGradient id="rl2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7fe0"/><stop offset="1" stop-color="#14286a"/></linearGradient></defs><g transform="translate(32 28) scale(1.25)"><path d="${TULIP}" fill="url(#rl1)" stroke="#fff6e6" stroke-width="1"/></g><g transform="translate(14 46) rotate(-24) scale(.7)"><path d="${TULIP}" fill="url(#rl2)" stroke="#fff6e6" stroke-width="1.2"/></g><g transform="translate(51 48) rotate(22) scale(.6)"><path d="${TULIP}" fill="#37b0a8" stroke="#fff6e6" stroke-width="1.2"/></g><path d="M32 46v12" stroke="#3f9c82" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  havai: `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke-linecap="round" stroke-width="2.2">${Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6,
      c = ['#ffd77a', '#ff7a5c', '#5ad1c8', '#fff4d6'][i % 4];
    return `<path d="M${(32 + Math.cos(a) * 8).toFixed(1)} ${(26 + Math.sin(a) * 8).toFixed(1)}L${(32 + Math.cos(a) * 20).toFixed(1)} ${(26 + Math.sin(a) * 20).toFixed(1)}" stroke="${c}"/><circle cx="${(32 + Math.cos(a) * 22.5).toFixed(1)}" cy="${(26 + Math.sin(a) * 22.5).toFixed(1)}" r="1.6" fill="${c}"/>`;
  }).join('')}</g><circle cx="32" cy="26" r="4" fill="#fff6dc"/><path d="M32 62V40" stroke="rgba(255,220,150,.5)" stroke-width="2" stroke-dasharray="2 3"/></svg>`,
  altin: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ra1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e2b14a"/><stop offset="1" stop-color="#8a5a14"/></linearGradient></defs><ellipse cx="22" cy="40" rx="12" ry="12" fill="url(#ra1)" stroke="#6e460a" stroke-width="1.2"/><circle cx="22" cy="40" r="8.5" fill="none" stroke="#7a4c0c" stroke-width="1"/><g transform="translate(22 40)"><path d="${STAR8(4.6)}" fill="#7a4c0c" opacity=".7"/></g><ellipse cx="42" cy="26" rx="6" ry="12" fill="url(#ra1)" stroke="#6e460a" stroke-width="1.2"/><ellipse cx="46" cy="48" rx="10" ry="10" fill="url(#ra1)" stroke="#6e460a" stroke-width="1.2"/><path d="M14 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z M54 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff6d2"/></svg>`,
  nazar: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="rn1" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#001" stop-opacity=".25"/></radialGradient></defs><g transform="translate(32 32)"><circle r="22" fill="#1846a8"/><circle r="15" fill="#f4f7fb"/><circle r="10.5" fill="#5fb3e6"/><circle r="5" fill="#0b0f1a"/><circle r="22" fill="url(#rn1)"/></g></svg>`,
  varak: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rv1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e2b14a"/><stop offset="1" stop-color="#8a5a14"/></linearGradient></defs><path d="M14 22l9-6 8 3 3 8-5 7-9 1-6-5z" fill="url(#rv1)"/><path d="M36 30l8-4 7 4 1 7-6 5-7-2z" fill="url(#rv1)" opacity=".9"/><path d="M22 44l6-2 5 3-1 5-6 2-5-3z" fill="url(#rv1)" opacity=".8"/><path d="M48 14l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z M18 52l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" fill="#fff8de"/></svg>`,
  fener: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="rf1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb35a" stop-opacity=".7"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient><linearGradient id="rf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a6"/><stop offset=".6" stop-color="#ff9a3a"/><stop offset="1" stop-color="#d0561c"/></linearGradient></defs><circle cx="26" cy="34" r="22" fill="url(#rf1)"/><path d="M16 20q10-3 20 0l-3 26q-7 2-14 0z" fill="url(#rf2)"/><circle cx="26" cy="40" r="3.4" fill="#fffbe6"/><circle cx="48" cy="18" r="12" fill="url(#rf1)"/><path d="M42 11q6-2 12 0l-2 15q-4 1-8 0z" fill="url(#rf2)"/><circle cx="48" cy="22" r="2" fill="#fffbe6"/></svg>`,
  yildiz: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ry1" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#bcd6ff" stop-opacity=".7"/><stop offset="1" stop-color="#7aa2ff" stop-opacity="0"/></linearGradient></defs><path d="M52 12L14 48" stroke="url(#ry1)" stroke-width="3.2" stroke-linecap="round"/><circle cx="52" cy="12" r="4" fill="#fff"/><path d="M18 14l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2zM44 44l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1zM30 26l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#e8f0ff"/></svg>`,
  ebru: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(32 32)"><path d="M0-25C14-25 25-14 24 0 25 14 13 26 0 25-14 26-25 13-25 0-26-14-13-25 0-25Z" fill="#22366c"/><path d="M0-19C10-19 19-10 18 0 19 10 10 19 0 19-11 19-19 10-19 0-19-10-10-19 0-19Z" fill="#efe3c9"/><path d="M0-14C7-14 14-7 13 0 14 7 7 14 0 13-8 14-14 7-14 0-14-7-7-14 0-14Z" fill="#b55f66"/><path d="M0-9C5-9 9-5 9 0 9 5 5 9 0 9-5 9-9 5-9 0-9-5-5-9 0-9Z" fill="#efe3c9"/><circle r="4.5" fill="#cf9d45"/></g></svg>`,
  kelebek: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rk1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b3a8f"/><stop offset=".5" stop-color="#3fa8ff"/><stop offset="1" stop-color="#0b3a8f"/></linearGradient></defs><g fill="url(#rk1)"><path d="M32 30C26 14 10 10 8 20s6 14 24 12z"/><path d="M32 30C38 14 54 10 56 20s-6 14-24 12z"/><path d="M32 33C22 34 14 44 20 50s12-6 12-17z"/><path d="M32 33C42 34 50 44 44 50s-12-6-12-17z"/></g><circle cx="16" cy="19" r="2" fill="#fff"/><circle cx="48" cy="19" r="2" fill="#fff"/><path d="M32 24v24" stroke="#1b130c" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  mozaik: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(20 26) rotate(-12)"><rect x="-12" y="-12" width="24" height="24" rx="4" fill="#f3eee2"/><rect x="-10" y="-10" width="20" height="20" rx="3" fill="#2c58b8"/><path d="${STAR8(7)}" fill="#f4f0e6"/><circle r="2" fill="#c23a2c"/></g><g transform="translate(44 24) rotate(10)"><rect x="-11" y="-11" width="22" height="22" rx="4" fill="#f3eee2"/><rect x="-9" y="-9" width="18" height="18" rx="3" fill="#2fa39c"/><path d="${STAR8(6)}" fill="#f4f0e6"/></g><g transform="translate(32 46) rotate(-4)"><rect x="-11" y="-11" width="22" height="22" rx="4" fill="#f3eee2"/><rect x="-9" y="-9" width="18" height="18" rx="3" fill="#2c58b8"/><g transform="scale(.55)"><path d="${TULIP}" fill="#f4f0e6"/></g></g></svg>`,
  gul: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="rg1" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f08aa0"/><stop offset="1" stop-color="#7a0c20"/></radialGradient></defs><g fill="url(#rg1)" stroke="rgba(255,230,235,.5)" stroke-width=".8"><path d="M32 12c10 4 12 18 0 26-12-8-10-22 0-26z"/><path d="M14 36c8-4 18 2 16 14-12 2-18-6-16-14z" transform="rotate(-10 22 44)"/><path d="M50 34c-8-4-18 2-16 14 12 2 18-6 16-14z" transform="rotate(14 42 42)"/></g></svg>`,
};

// Kartların renk tonu (öğe zeminindeki ışık)
export const TONE = {
  frame: { sade: '#9a7a3a', lale: '#1d3e93', bakir: '#b5582a', gelgit: '#6a6290', rumi: '#2f9c95', kilim: '#9e2b25', sal: '#b8944a', mercan: '#c23a2c', hatip: '#22366c', aga: '#0f6a4f', pasa: '#8a1022', gece: '#1a2f7a', gul: '#b04656', kehribar: '#c77a1e', firuze: '#169c9b', sedef: '#6a5a4a', tezhip: '#1e3290' },
  effect: { konfeti: '#b8892e', lale: '#c23a2c', varak: '#b8892e', havai: '#4a3a8a', fener: '#c7621e', altin: '#b8892e', yildiz: '#2a3a80', nazar: '#1846a8', gul: '#a3122a', ebru: '#22366c', kelebek: '#1f8f86', mozaik: '#2c58b8' },
  tiles: { ivory: '#bfa878', cini: '#1d3e93', ebru: '#6a6290', yagli: '#2a4fa8' },
};
export const toneOf = (kind, id) => (TONE[kind] && TONE[kind][id]) || '#8a6a3a';

export function titleBadge(name) {
  return `<span class="rw-title"><i aria-hidden="true"></i><b>${esc(name)}</b><i aria-hidden="true"></i></span>`;
}

// art: kartın görsel bölümü
export function rewardArt(kind, it, avatar) {
  if (kind === 'frame') return framedAvatar(avatar, it.id, 'fav--card');
  if (kind === 'effect') return `<span class="rw-fx">${EFFECT_ICON[it.id] || EFFECT_ICON.konfeti}</span>`;
  if (kind === 'tiles') return tilePairHTML(it.id);
  return titleBadge(it.name);
}

// Ödül kartı (seviye atlama ekranı)
export function rewardCard(r, avatar, i = 0) {
  return `<div class="rw-card rw-card--${r.kind}" style="--i:${i}"><span class="rw-card__art">${rewardArt(r.kind, r, avatar)}</span><small>${KIND_NAME[r.kind]}</small><b>${esc(r.name)}</b></div>`;
}

// görselleri doldur (çerçeve boyaması, taş önizlemeleri)
export function hydrateArt(root = document) {
  hydrateFrames(root);
  hydrateTiles(root);
}
