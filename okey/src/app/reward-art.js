// Ödül görselleri: kutlama efekti simgeleri, taş takımı örnekleri, unvan rozeti ve tek tip ödül kartı.
// Seviye atlama ekranı, Ödüller sekmesi ve Çarşı aynı kartları kullanır.
import { framedAvatar } from '../ui/frame-ui.js';
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
  gul: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="rg1" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f08aa0"/><stop offset="1" stop-color="#7a0c20"/></radialGradient></defs><g fill="url(#rg1)" stroke="rgba(255,230,235,.5)" stroke-width=".8"><path d="M32 12c10 4 12 18 0 26-12-8-10-22 0-26z"/><path d="M14 36c8-4 18 2 16 14-12 2-18-6-16-14z" transform="rotate(-10 22 44)"/><path d="M50 34c-8-4-18 2-16 14 12 2 18-6 16-14z" transform="rotate(14 42 42)"/></g></svg>`,
};

// Taş takımı örneği: iki küçük taş
const TILE_LOOK = {
  ivory: ['#fbf6e8', '#e4d6b6', '#c0392b', '#1e3a8a', ''],
  cini: ['#f4f0e6', '#d9d1bf', '#b8322a', '#1f429a', 'cini'],
  ebru: ['#efe5cf', '#cdbb92', '#a8222c', '#22357a', 'ebru'],
  yagli: ['#e9dcc2', '#c8b48c', '#b03024', '#203f9e', 'yagli'],
};
export function tileSwatch(id) {
  const [a, b, red, blue, deco] = TILE_LOOK[id] || TILE_LOOK.ivory;
  const one = (n, col, rot) =>
    `<span class="rw-tile rw-tile--${deco || 'plain'}" style="--ta:${a};--tb:${b};--tc:${col};transform:rotate(${rot}deg)"><b>${n}</b><i></i></span>`;
  return `<span class="rw-tiles">${one(7, red, -8)}${one(12, blue, 7)}</span>`;
}

export function titleBadge(name) {
  return `<span class="rw-title"><i aria-hidden="true"></i><b>${esc(name)}</b><i aria-hidden="true"></i></span>`;
}

// art: kartın görsel bölümü
export function rewardArt(kind, it, avatar) {
  if (kind === 'frame') return framedAvatar(avatar, it.id, 'fav--card');
  if (kind === 'effect') return `<span class="rw-fx">${EFFECT_ICON[it.id] || EFFECT_ICON.konfeti}</span>`;
  if (kind === 'tiles') return tileSwatch(it.id);
  return titleBadge(it.name);
}

// Ödül kartı (seviye atlama ekranı)
export function rewardCard(r, avatar, i = 0) {
  return `<div class="rw-card rw-card--${r.kind}" style="--i:${i}"><span class="rw-card__art">${rewardArt(r.kind, r, avatar)}</span><small>${KIND_NAME[r.kind]}</small><b>${esc(r.name)}</b></div>`;
}
