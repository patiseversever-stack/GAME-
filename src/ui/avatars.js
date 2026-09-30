// Özgün, prosedürel SVG avatarlar — yüzsüz, editoryal bir portre dili (placeholder harf avatar yok).
// Her karakter: arka plan tonu, ten, saç stili/rengi, kıyafet rengi, aksesuar.

const SKIN = { a: '#f0c9a4', b: '#dba97e', c: '#b98560', d: '#8d5e41' };

export const ROSTER = [
  { id: 'mert', name: 'Mert', bg: ['#2b5d86', '#16354f'], skin: SKIN.b, hair: { style: 'short', color: '#1d1714' }, top: '#2f5d8a', acc: 'beard', title: 'Sabırlı oyuncu' },
  { id: 'deniz', name: 'Deniz', bg: ['#2e7b72', '#173f3b'], skin: SKIN.a, hair: { style: 'wavy', color: '#4a2f1f' }, top: '#2c6b62', acc: 'glasses', title: 'Sessiz stratejist' },
  { id: 'ece', name: 'Ece', bg: ['#8a3b55', '#4a1d2c'], skin: SKIN.a, hair: { style: 'long', color: '#231512' }, top: '#7d2d48', acc: 'none', title: 'Hızlı el' },
  { id: 'kaan', name: 'Kaan', bg: ['#6b7a3a', '#37401c'], skin: SKIN.c, hair: { style: 'buzz', color: '#1a1512' }, top: '#59662e', acc: 'beard', title: 'Risk sever' },
  { id: 'selin', name: 'Selin', bg: ['#b5822f', '#6b4815'], skin: SKIN.b, hair: { style: 'bun', color: '#2a1a12' }, top: '#b07a25', acc: 'earring', title: 'Keskin göz' },
  { id: 'baran', name: 'Baran', bg: ['#5a5f6b', '#2b2e36'], skin: SKIN.d, hair: { style: 'curly', color: '#14110f' }, top: '#4a4f5b', acc: 'none', title: 'Soğukkanlı' },
  { id: 'defne', name: 'Defne', bg: ['#2b4a73', '#14233a'], skin: SKIN.a, hair: { style: 'bob', color: '#5a3520' }, top: '#27426a', acc: 'earring', title: 'Dikkatli' },
  { id: 'aylin', name: 'Aylin', bg: ['#5f8a73', '#2b4a3b'], skin: SKIN.b, hair: { style: 'scarf', color: '#e9e1cf' }, top: '#567a66', acc: 'none', title: 'Usta' },
];

export const AVATAR_IDS = ROSTER.map((r) => r.id);
export const rosterById = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];

function hairBack(style, color) {
  switch (style) {
    case 'long':
      return `<path d="M17 30c-3 10-2 21 2 30h26c4-9 5-20 2-30-2-9-8-15-15-15s-13 6-15 15z" fill="${color}"/>`;
    case 'wavy':
      return `<path d="M16 34c-2 8 0 15 4 20h24c4-5 6-12 4-20-1-10-8-17-16-17s-15 7-16 17z" fill="${color}"/>`;
    case 'bob':
      return `<path d="M17 30c-1 8 0 14 3 17h24c3-3 4-9 3-17-1-9-7-14-15-14s-14 5-15 14z" fill="${color}"/>`;
    case 'scarf':
      return `<path d="M15 34c0-12 7-20 17-20s17 8 17 20c0 10-3 18-6 24H21c-3-6-6-14-6-24z" fill="${color}"/>`;
    default:
      return '';
  }
}
function hairFront(style, color) {
  switch (style) {
    case 'short':
      return `<path d="M22 28c0-8 4-13 10-13s10 5 10 13c-3-4-7-6-10-6s-7 2-10 6z" fill="${color}"/>`;
    case 'buzz':
      return `<path d="M22.5 27c.5-7 4-11.5 9.5-11.5S41 20 41.5 27c-3-3-6-4.5-9.5-4.5S25.5 24 22.5 27z" fill="${color}" opacity=".9"/>`;
    case 'curly':
      return `<g fill="${color}"><circle cx="24" cy="24" r="5"/><circle cx="30" cy="19" r="5.4"/><circle cx="37" cy="21" r="5.2"/><circle cx="41" cy="27" r="4.2"/><circle cx="22" cy="30" r="3.6"/></g>`;
    case 'wavy':
    case 'long':
    case 'bob':
      return `<path d="M21 31c0-9 4-15 11-15s11 6 11 15c-2-5-5-8-11-8s-9 3-11 8z" fill="${color}"/>`;
    case 'bun':
      return `<circle cx="32" cy="14" r="5.5" fill="${color}"/><path d="M22 30c0-8 4-13 10-13s10 5 10 13c-3-4-7-6-10-6s-7 2-10 6z" fill="${color}"/>`;
    case 'scarf':
      return `<path d="M20 34c0-10 5-17 12-17s12 7 12 17c-3-6-7-9-12-9s-9 3-12 9z" fill="${color}"/>`;
    default:
      return '';
  }
}

export function avatarSVG(id, { ring = false } = {}) {
  const c = rosterById(id);
  const uid = 'av' + c.id + Math.floor(Math.random() * 1e6).toString(36);
  const beard = c.acc === 'beard' ? `<path d="M23.5 37c1 9 5 12.5 8.5 12.5S39.5 46 40.5 37c-2 3-5 4.5-8.5 4.5S25.5 40 23.5 37z" fill="${c.hair.color}" opacity=".92"/>` : '';
  const glasses =
    c.acc === 'glasses'
      ? `<g fill="none" stroke="#1b1512" stroke-width="1.6"><rect x="23.5" y="31" width="7" height="5.2" rx="2"/><rect x="33.5" y="31" width="7" height="5.2" rx="2"/><path d="M30.5 33.4h3"/></g>`
      : '';
  const earring = c.acc === 'earring' ? `<circle cx="21.6" cy="38.5" r="1.5" fill="#f1cf7a"/><circle cx="42.4" cy="38.5" r="1.5" fill="#f1cf7a"/>` : '';
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><radialGradient id="${uid}" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></radialGradient></defs>
  <rect width="64" height="64" fill="url(#${uid})"/>
  ${hairBack(c.hair.style, c.hair.color)}
  <path d="M8 66c1-13 9-19 24-19s23 6 24 19z" fill="${c.top}"/>
  <path d="M26 47c1 4 3.5 6 6 6s5-2 6-6l-2-3H28z" fill="${c.skin}" opacity=".95"/>
  <path d="M27 47.5c2 1.6 4.4 2.4 5 2.4s3-.8 5-2.4" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="1.4"/>
  <rect x="28" y="40" width="8" height="8" rx="3" fill="${c.skin}"/>
  <ellipse cx="32" cy="33" rx="10.5" ry="12.5" fill="${c.skin}"/>
  <ellipse cx="21.6" cy="34" rx="1.8" ry="3" fill="${c.skin}"/><ellipse cx="42.4" cy="34" rx="1.8" ry="3" fill="${c.skin}"/>
  ${beard}${hairFront(c.hair.style, c.hair.color)}${glasses}${earring}
  <ellipse cx="32" cy="22" rx="14" ry="6" fill="rgba(255,255,255,.07)"/>
  </svg>`;
}

export function avatarHTML(id) {
  return avatarSVG(id);
}
