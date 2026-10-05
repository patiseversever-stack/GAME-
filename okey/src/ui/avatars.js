// İllüstrasyon portreler (SVG, 64×64): yumuşak gölgeli yüz, göz-kaş-burun-ağız, saç ışığı, kıyafet ve aksesuar.
// 16 karakter: farklı yaş, ten, saç; kasketli dede, başörtülü teyze, bıyıklı usta, gözlüklü genç... Harf avatar yok.

const SKIN = { a: '#f3cfac', b: '#e0ad85', c: '#c08a63', d: '#8f5f42', e: '#6e4530' };

export const ROSTER = [
  { id: 'mert', name: 'Mert', title: 'Sabırlı oyuncu', bg: ['#3a6f9e', '#16324d'], skin: SKIN.b, hair: { style: 'short', color: '#241913' }, brow: 'flat', mouth: 'smile', facial: 'beard', top: { style: 'crew', color: '#2d4f7c' } },
  { id: 'deniz', name: 'Deniz', title: 'Sessiz stratejist', bg: ['#3b8e84', '#15403b'], skin: SKIN.a, hair: { style: 'wavy', color: '#5a3722' }, brow: 'soft', mouth: 'soft', acc: ['glassesRound'], top: { style: 'sweater', color: '#2f6d64' } },
  { id: 'ece', name: 'Ece', title: 'Hızlı el', bg: ['#a14965', '#4b1a2d'], skin: SKIN.a, hair: { style: 'long', color: '#2a1813' }, brow: 'arch', mouth: 'grin', acc: ['hoops'], lashes: true, top: { style: 'crew', color: '#8e2f4f' } },
  { id: 'kaan', name: 'Kaan', title: 'Risk sever', bg: ['#7c8b46', '#363f1b'], skin: SKIN.c, hair: { style: 'buzz', color: '#1d1612' }, brow: 'bold', mouth: 'smirk', facial: 'stubble', top: { style: 'jacket', color: '#5b6a30', inner: '#e9e1cf' } },
  { id: 'selin', name: 'Selin', title: 'Keskin göz', bg: ['#c99a3e', '#6b4a14'], skin: SKIN.b, hair: { style: 'bun', color: '#2d1b12' }, brow: 'arch', mouth: 'smile', acc: ['studs'], lashes: true, top: { style: 'collar', color: '#b88a2a', inner: '#f5efe1' } },
  { id: 'baran', name: 'Baran', title: 'Soğukkanlı', bg: ['#606878', '#272b34'], skin: SKIN.d, hair: { style: 'curly', color: '#16110e' }, brow: 'flat', mouth: 'soft', facial: 'goatee', top: { style: 'hoodie', color: '#4c5260' } },
  { id: 'defne', name: 'Defne', title: 'Dikkatli', bg: ['#38598a', '#152541'], skin: SKIN.a, hair: { style: 'bob', color: '#7a3e22' }, brow: 'soft', mouth: 'smile', acc: ['freckles'], lashes: true, top: { style: 'collar', color: '#2a4570', inner: '#eef2f8' } },
  { id: 'aylin', name: 'Aylin', title: 'Usta', bg: ['#6e9a82', '#2b4a3b'], skin: SKIN.b, hair: { style: 'hijab', color: '#efe6d2', trim: '#b08a3e' }, brow: 'soft', mouth: 'smile', lashes: true, top: { style: 'crew', color: '#4f7a63' } },
  { id: 'hasan', name: 'Hasan Dede', title: 'Kahvehane emektarı', bg: ['#9a6a3e', '#4a2c14'], skin: SKIN.c, hair: { style: 'kasket', color: '#c9c3bb', cap: '#5a5048' }, brow: 'grey', mouth: 'smile', facial: 'mustacheGrey', acc: ['wrinkles'], top: { style: 'vest', color: '#efe7d6', inner: '#6b4a2e' } },
  { id: 'fatma', name: 'Fatma Nine', title: 'Okey ninesi', bg: ['#8a5a8a', '#3a1f3e'], skin: SKIN.b, hair: { style: 'hijab', color: '#7a3b5c', trim: '#e9c46a', pattern: true }, brow: 'grey', mouth: 'smile', acc: ['wrinkles', 'glassesRound'], top: { style: 'crew', color: '#4e2a4a' } },
  { id: 'emre', name: 'Emre', title: 'Genç yetenek', bg: ['#e0743a', '#7a2c10'], skin: SKIN.b, hair: { style: 'fade', color: '#2a1a12' }, brow: 'bold', mouth: 'grin', acc: ['headphones'], top: { style: 'hoodie', color: '#1f2733' } },
  { id: 'zeynep', name: 'Zeynep', title: 'Neşeli rakip', bg: ['#e06a6a', '#7a2030'], skin: SKIN.c, hair: { style: 'curlyLong', color: '#3a2316' }, brow: 'arch', mouth: 'grin', acc: ['freckles', 'hoops'], lashes: true, top: { style: 'crew', color: '#f0d9b8' } },
  { id: 'murat', name: 'Murat Usta', title: 'Bıyıklı usta', bg: ['#4a6a5a', '#1c2e25'], skin: SKIN.c, hair: { style: 'receding', color: '#1c1410' }, brow: 'bold', mouth: 'soft', facial: 'mustache', acc: ['wrinkleLight'], top: { style: 'collar', color: '#d9d2c2', inner: '#ffffff' } },
  { id: 'elif', name: 'Elif', title: 'Sakin oyuncu', bg: ['#4e7fc4', '#1a3466'], skin: SKIN.a, hair: { style: 'ponytail', color: '#c78a3e' }, brow: 'soft', mouth: 'smile', lashes: true, top: { style: 'sweater', color: '#e9eef6' } },
  { id: 'yusuf', name: 'Yusuf', title: 'Hesapçı', bg: ['#5a4a7a', '#241a3a'], skin: SKIN.d, hair: { style: 'short', color: '#14100d' }, brow: 'flat', mouth: 'soft', facial: 'beard', acc: ['glassesRect'], top: { style: 'turtle', color: '#2b2633' } },
  { id: 'nur', name: 'Nur', title: 'Zarif oyuncu', bg: ['#c46a7e', '#5a2232'], skin: SKIN.e, hair: { style: 'hijab', color: '#22305c', trim: '#e9c46a' }, brow: 'arch', mouth: 'smile', lashes: true, top: { style: 'crew', color: '#a3445c' } },
];

export const AVATAR_IDS = ROSTER.map((r) => r.id);
export const rosterById = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => {
  const c = hex(h);
  const t = k >= 0 ? 255 : 0,
    a = Math.abs(k);
  return '#' + c.map((v) => Math.round(v + (t - v) * a).toString(16).padStart(2, '0')).join('');
};

/* ── saç (arka / ön) ── */
function hairBack(h, u) {
  const f = `url(#${u}h)`;
  switch (h.style) {
    case 'long':
      return `<path d="M17.5 30c-3 12-2 22 1.5 30h26c3.5-8 4.5-18 1.5-30-1.6-9-7-15-14.5-15S19.1 21 17.5 30z" fill="${f}"/>`;
    case 'curlyLong':
      return `<g fill="${f}"><circle cx="19" cy="34" r="6"/><circle cx="17.5" cy="43" r="5.5"/><circle cx="19.5" cy="51" r="5"/><circle cx="45" cy="34" r="6"/><circle cx="46.5" cy="43" r="5.5"/><circle cx="44.5" cy="51" r="5"/><circle cx="24" cy="21" r="7"/><circle cx="32" cy="17.5" r="7.5"/><circle cx="40" cy="21" r="7"/></g>`;
    case 'wavy':
      return `<path d="M17 33c-1.5 7 0 13 3.5 17h23c3.5-4 5-10 3.5-17-1.2-10-7.5-17-15-17s-13.8 7-15 17z" fill="${f}"/>`;
    case 'bob':
      return `<path d="M18 30c-1 9 0 15 3 18.5h22c3-3.5 4-9.5 3-18.5-1-9-7-14.5-14-14.5S19 21 18 30z" fill="${f}"/>`;
    case 'ponytail':
      return `<path d="M42 22c6 1 9 7 8.5 14-.4 6-2.5 10-5 12 1-5 .5-10-2-14z" fill="${f}"/>`;
    case 'hijab':
      return `<path d="M13.5 35C13.5 19 21.5 11 32 11s18.5 8 18.5 24c0 9-3 15.5-6.5 19.5H20C16.5 50.5 13.5 44 13.5 35z" fill="url(#${u}j)"/>`;
    case 'curly':
      return `<g fill="${f}"><circle cx="21" cy="27" r="5"/><circle cx="43" cy="27" r="5"/></g>`;
    default:
      return '';
  }
}
function hairFront(h, u, c) {
  const f = `url(#${u}h)`,
    hi = shade(h.color, 0.35);
  switch (h.style) {
    case 'short':
      return `<path d="M21.3 31c-.6-9.5 3.9-14.6 10.7-14.6s11.3 5.1 10.7 14.6c-1.5-4.7-4.7-7.3-10.4-7.2-5.5-.1-9.4 2.5-11 7.2z" fill="${f}"/><path d="M24.5 21.5c2.2-1.8 5-2.6 8.5-2.4" stroke="${hi}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".55"/>`;
    case 'buzz':
      return `<path d="M21.8 29.5c.2-8 4.4-12.6 10.2-12.6s10 4.6 10.2 12.6c-2.6-3.6-6.2-5-10.2-5s-7.6 1.4-10.2 5z" fill="${f}" opacity=".88"/>`;
    case 'fade':
      return `<path d="M22.4 28.5c-.6-8.6 3.6-14.6 10.6-14.6 6.6 0 10.4 4.5 9.6 13.2-2.6-3.6-5.8-4.9-10.3-4.6-4.2-.2-7.4 2-9.9 6z" fill="${f}"/><path d="M21.6 30.5c-.2-2 .2-3.6.9-5M42.4 30.5c.2-2-.2-3.6-.9-5" stroke="${h.color}" stroke-width="1.6" opacity=".45" fill="none"/><path d="M26 17.6c2.4-1.6 5.4-2.2 8.6-1.6" stroke="${hi}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".6"/>`;
    case 'wavy':
      return `<path d="M20.6 32c-1-11 4.4-16.6 11.6-16.6 8 0 13.2 6 11.2 16.6-1.4-4.4-3.6-7-7.3-7.4-3 2.4-8.6 2.6-11.2.7-2.2 1.4-3.5 3.6-4.3 6.7z" fill="${f}"/><path d="M25 20.2c2.6-2.2 6-3 9.6-2" stroke="${hi}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".55"/>`;
    case 'long':
    case 'ponytail':
      return `<path d="M21 32.5c-.6-11 4-16.5 11-16.5s11.6 5.5 11 16.5c-1.4-6-5-10.1-10.6-10.6-.3.6-.7.6-1 0-5.5.5-9 4.6-10.4 10.6z" fill="${f}"/><path d="M27 18.6c-2 1.2-3.4 2.8-4.2 4.8" stroke="${hi}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".55"/>`;
    case 'bob':
      return `<path d="M20.8 30.5c-.3-9 4.2-14 11.2-14s11.5 5 11.2 14l-.2-3.2c-3-1.4-7-2.1-11-2.1s-8 .7-11 2.1z" fill="${f}"/><path d="M25 19.5c2.4-1.6 5.4-2.2 8.8-1.8" stroke="${hi}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".55"/>`;
    case 'bun':
      return `<circle cx="32" cy="13.6" r="5.6" fill="${f}"/><path d="M29 11c1.4-1 3.2-1.2 4.8-.6" stroke="${hi}" stroke-width=".8" fill="none" opacity=".6"/><path d="M21.4 31c-.4-9 4-14.4 10.6-14.4S43 22 42.6 31c-2-5-5.6-7.6-10.6-7.6S23.4 26 21.4 31z" fill="${f}"/>`;
    case 'curly':
    case 'curlyLong':
      return `<g fill="${f}"><circle cx="23.5" cy="24" r="5"/><circle cx="29" cy="19.5" r="5.4"/><circle cx="35.5" cy="19.5" r="5.4"/><circle cx="41" cy="24" r="5"/><circle cx="21.6" cy="29.6" r="3.6"/><circle cx="42.4" cy="29.6" r="3.6"/></g><g fill="${hi}" opacity=".35"><circle cx="28" cy="17.6" r="1.4"/><circle cx="34.6" cy="17.4" r="1.2"/><circle cx="22.6" cy="22.4" r="1.1"/></g>`;
    case 'receding':
      return `<path d="M21.4 31.5c-.6-4 .2-7.4 2.4-9.6.4 3 .9 5.4 1.2 8.4zM42.6 31.5c.6-4-.2-7.4-2.4-9.6-.4 3-.9 5.4-1.2 8.4z" fill="${f}"/><path d="M27 19.2c3.2-.9 6.8-.9 10 0" stroke="${shade(c.skin, -0.12)}" stroke-width="1" fill="none" opacity=".5"/>`;
    case 'kasket': {
      const cp = h.cap,
        tw = Array.from({ length: 11 }, (_, i) => `<path d="M${20.5 + i * 2.4} 25.4l3.2-8" />`).join('');
      return `<path d="M21.4 31c-.4-3 0-5.2 1-7l1.3 6.6zM42.6 31c.4-3 0-5.2-1-7l-1.3 6.6z" fill="${h.color}"/>
        <path d="M18.8 26.6c-.2-7 5.8-11 13.2-11s13.4 4 13.2 10.6z" fill="url(#${u}k)"/>
        <g stroke="${shade(cp, 0.25)}" stroke-width=".35" opacity=".35" clip-path="url(#${u}c)">${tw}</g>
        <path d="M32 15.8v9.4" stroke="${shade(cp, -0.35)}" stroke-width=".5" opacity=".6"/><circle cx="32" cy="16.3" r=".9" fill="${shade(cp, -0.3)}"/>
        <path d="M17.2 26.8c6.8-2.4 22.8-2.6 29.6-.4-.2 1.8-1.6 2.4-3.8 2.2-7-1-15.4-1-22 .2-2.2.4-4-.4-3.8-2z" fill="${shade(cp, -0.32)}"/>
        <path d="M18.6 26.6c6.6-2 20.6-2.2 27-.4" stroke="#fff" stroke-width=".5" opacity=".18" fill="none"/>
        <path d="M23 19c2.6-1.8 5.8-2.6 9.2-2.4" stroke="#fff" stroke-width=".8" fill="none" opacity=".22" stroke-linecap="round"/>`;
    }
    case 'hijab': {
      const t = h.trim || '#c9a14a';
      return `<path d="M32 13c-8.8 0-13.8 7.2-13.8 17.6 0 3.4.6 6.4 1.6 9l3-1.2C21 35.4 21 32.8 21.2 30c.6-7.2 4.6-11.6 10.8-11.6S42.2 22.8 42.8 30c.2 2.8.2 5.4-1.6 8.4l3 1.2c1-2.6 1.6-5.6 1.6-9C45.8 20.2 40.8 13 32 13z" fill="url(#${u}j)"/>
        <path d="M21.4 28.8c.9-6.2 4.8-10 10.6-10s9.7 3.8 10.6 10" stroke="${t}" stroke-width="1.1" fill="none" opacity=".9"/>
        ${h.pattern ? `<path d="M19.6 34c-.6-9.6 4.4-16.2 12.4-16.2s13 6.6 12.4 16.2" stroke="${t}" stroke-width=".5" stroke-dasharray=".6 1.4" fill="none" opacity=".7"/>` : ''}
        <path d="M24 16.6c2.4-1.6 5.2-2.3 8-2.2" stroke="#fff" stroke-width=".9" fill="none" opacity=".3" stroke-linecap="round"/>`;
    }
    default:
      return '';
  }
}

/* ── kıyafet ── */
function top(c, u) {
  const t = c.top,
    col = t.color,
    dk = shade(col, -0.28),
    sh = `<path d="M7 66c1-12.5 9.5-19.5 25-19.5S56 53.5 57 66z" fill="url(#${u}t)"/>`;
  switch (t.style) {
    case 'collar':
      return `${sh}<path d="M26 47l6 7 6-7-2.4-1.4L32 50l-3.6-4.4z" fill="${t.inner}"/><path d="M26 47l-2.6 5.4 6 3.6 2.6-2zM38 47l2.6 5.4-6 3.6-2.6-2z" fill="${shade(t.inner, -0.06)}" stroke="${shade(t.inner, -0.18)}" stroke-width=".4"/><path d="M32 56v8" stroke="${dk}" stroke-width=".6" opacity=".6"/><circle cx="32" cy="59" r=".6" fill="${dk}"/>`;
    case 'jacket':
      return `${sh}<path d="M27 47.5l5 8 5-8c-1.4-.6-3.2-.9-5-.9s-3.6.3-5 .9z" fill="${t.inner}"/><path d="M26.6 47.6L23 52l4 4 5 9 5-9 4-4-3.6-4.4L32 56z" fill="${dk}" opacity=".55"/><path d="M23 52l4 4 5 9M41 52l-4 4-5 9" stroke="${shade(col, 0.2)}" stroke-width=".5" fill="none" opacity=".6"/>`;
    case 'sweater':
      return `${sh}<path d="M25.5 47.2c1.6 2.6 3.8 3.8 6.5 3.8s4.9-1.2 6.5-3.8" stroke="${dk}" stroke-width="2.2" fill="none"/><g stroke="${dk}" stroke-width=".4" opacity=".35">${Array.from({ length: 9 }, (_, i) => `<path d="M${14 + i * 4.5} 58v7"/>`).join('')}</g>`;
    case 'turtle':
      return `${sh}<path d="M26.6 41.5h10.8v6.5c-1.4 1.2-3.2 1.8-5.4 1.8s-4-.6-5.4-1.8z" fill="${shade(col, 0.08)}"/><g stroke="${dk}" stroke-width=".5" opacity=".6"><path d="M27.5 43.4h9M27.5 45.2h9M27.5 47h9"/></g>`;
    case 'hoodie':
      return `<path d="M17 52c2-6 7.5-9.5 15-9.5S45 46 47 52c-4-2-9-3-15-3s-11 1-15 3z" fill="${dk}"/>${sh}<path d="M24 48.5c2.4 3 5 4.4 8 4.4s5.6-1.4 8-4.4" stroke="${dk}" stroke-width="1.6" fill="none"/><path d="M29 52v6.5M35 52v6.5" stroke="#e9e1cf" stroke-width=".8" stroke-linecap="round"/><circle cx="29" cy="59" r=".7" fill="#e9e1cf"/><circle cx="35" cy="59" r=".7" fill="#e9e1cf"/>`;
    case 'vest':
      return `${sh}<path d="M15 66c.8-8 4.6-13.6 11.4-17.2L32 60l5.6-11.2C44.4 52.4 48.2 58 49 66z" fill="${t.inner}"/><path d="M26.4 48.8L32 60l5.6-11.2" stroke="${shade(t.inner, -0.3)}" stroke-width=".6" fill="none"/><circle cx="32" cy="62.4" r=".7" fill="${shade(t.inner, 0.3)}"/><path d="M28.6 47.6c1 1 2.2 1.5 3.4 1.5s2.4-.5 3.4-1.5" stroke="${shade(col, -0.2)}" stroke-width=".7" fill="none"/>`;
    default:
      return `${sh}<path d="M25.8 47.2c1.6 2.2 3.6 3.2 6.2 3.2s4.6-1 6.2-3.2" stroke="${dk}" stroke-width="1.4" fill="none"/>`;
  }
}

/* ── yüz ── */
function face(c, u) {
  const skin = c.skin,
    dk = shade(skin, -0.16),
    ink = '#2a1c16';
  const lash = c.lashes ? 1 : 0;
  const browCol = c.brow === 'grey' ? '#bdb5ab' : shade(c.hair.style === 'hijab' ? '#3a2a20' : c.hair.color, c.hair.color === '#efe6d2' ? -0.6 : -0.05);
  const BROW = {
    flat: ['M25.2 28.6c1.4-.6 3-.7 4.4-.3', 'M34.4 28.3c1.4-.4 3-.3 4.4.3'],
    soft: ['M25.4 28.8c1.3-.9 3-1.1 4.3-.5', 'M34.3 28.3c1.3-.6 3-.4 4.3.5'],
    arch: ['M25.2 29c1.1-1.4 3-1.8 4.6-.8', 'M34.2 28.2c1.6-1 3.5-.6 4.6.8'],
    bold: ['M24.9 28.6c1.6-.9 3.4-1 5-.3', 'M34.1 28.3c1.6-.7 3.4-.6 5 .3'],
    grey: ['M25.2 28.8c1.4-.7 3-.8 4.4-.3', 'M34.4 28.5c1.4-.5 3-.4 4.4.3'],
  }[c.brow || 'flat'];
  const bw = c.brow === 'bold' ? 1.6 : c.brow === 'grey' ? 1.5 : 1.2;
  const MOUTH = {
    smile: `<path d="M28.6 39.6c1.9 1.7 4.9 1.7 6.8 0" stroke="#8a4234" stroke-width="1.15" fill="none" stroke-linecap="round"/>`,
    soft: `<path d="M29.4 39.8c1.6.9 3.6.9 5.2 0" stroke="#8a4234" stroke-width="1.05" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M28.2 38.8c2.4 3.4 5.2 3.4 7.6 0z" fill="#6a2a22"/><path d="M28.8 39.2c2 .8 4.4.8 6.4 0l-.4.9c-1.8.5-3.8.5-5.6 0z" fill="#fff"/>`,
    smirk: `<path d="M29 39.8c1.8 1 4.2.8 6.2-.8" stroke="#8a4234" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
  }[c.mouth || 'smile'];
  const eye = (x) =>
    `<ellipse cx="${x}" cy="32.4" rx="1.35" ry="1.65" fill="${ink}"/><circle cx="${x + 0.45}" cy="31.8" r=".45" fill="#fff"/>` +
    (lash ? `<path d="M${x - 1.6} 31.2c.8-1.1 2.4-1.4 3.4-.6" stroke="${ink}" stroke-width=".6" fill="none" stroke-linecap="round"/>` : '');
  const acc = c.acc || [];
  let out = '';
  if (c.hair.style !== 'hijab' && c.hair.style !== 'kasket')
    out += `<ellipse cx="21.4" cy="34" rx="1.9" ry="2.9" fill="${skin}"/><ellipse cx="42.6" cy="34" rx="1.9" ry="2.9" fill="${skin}"/><ellipse cx="21.6" cy="34.2" rx=".8" ry="1.5" fill="${dk}" opacity=".5"/><ellipse cx="42.4" cy="34.2" rx=".8" ry="1.5" fill="${dk}" opacity=".5"/>`;
  else if (c.hair.style === 'kasket') out += `<ellipse cx="21.4" cy="34" rx="1.9" ry="2.9" fill="${skin}"/><ellipse cx="42.6" cy="34" rx="1.9" ry="2.9" fill="${skin}"/>`;
  out += `<ellipse cx="32" cy="33" rx="10.6" ry="12.6" fill="url(#${u}s)"/>`;
  out += `<path d="M22 36c1 5.6 4.8 9.4 10 9.4s9-3.8 10-9.4c-1.6 4-5.4 6.8-10 6.8s-8.4-2.8-10-6.8z" fill="${dk}" opacity=".28"/>`;
  out += `<ellipse cx="25.6" cy="36.8" rx="2.3" ry="1.3" fill="#ff7a6e" opacity=".2"/><ellipse cx="38.4" cy="36.8" rx="2.3" ry="1.3" fill="#ff7a6e" opacity=".2"/>`;
  if (acc.includes('freckles')) out += `<g fill="${shade(skin, -0.35)}" opacity=".55">${[[25, 35.2], [26.6, 36.2], [24.4, 36.6], [39, 35.2], [37.4, 36.2], [39.6, 36.6], [31, 35.6], [33, 35.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".38"/>`).join('')}</g>`;
  if (acc.includes('wrinkles') || acc.includes('wrinkleLight')) {
    const o = acc.includes('wrinkles') ? 0.32 : 0.18;
    out += `<g stroke="${shade(skin, -0.4)}" stroke-width=".55" fill="none" opacity="${o}" stroke-linecap="round"><path d="M27.4 24.8c3-.7 6.2-.7 9.2 0M28.4 26.3c2.4-.5 4.8-.5 7.2 0"/><path d="M23 32.6l-1.3.8M23 34l-1.2.2M41 32.6l1.3.8M41 34l1.2.2"/><path d="M27.4 38c-.6 1-.8 1.8-.7 2.6M36.6 38c.6 1 .8 1.8.7 2.6"/></g>`;
  }
  out += eye(27.6) + eye(36.4);
  out += `<path d="${BROW[0]}" stroke="${browCol}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="${BROW[1]}" stroke="${browCol}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
  out += `<path d="M32.4 32.8c-.5 1.8-1.2 2.8-.9 3.4.4.6 1.4.7 2 .3" stroke="${shade(skin, -0.3)}" stroke-width=".85" fill="none" stroke-linecap="round" opacity=".8"/>`;
  out += MOUTH;
  return out;
}
function facial(c) {
  const col = c.facial === 'mustacheGrey' ? '#d6d0c8' : shade(c.hair.color, -0.05);
  switch (c.facial) {
    case 'beard':
      return `<path d="M21.6 33.4c.2 8.8 4 14.2 10.4 14.2s10.2-5.4 10.4-14.2c-1.2 3.6-3 6-5 6.6-1.4 2.4-3.4 3-5.4 3s-4-.6-5.4-3c-2-.6-3.8-3-5-6.6z" fill="${col}" opacity=".95"/><path d="M27.6 38.6c1.4-1.3 3-1.6 4.4-.9 1.4-.7 3-.4 4.4.9-1.2.6-2.8.8-4.4.4-1.6.4-3.2.2-4.4-.4z" fill="${col}"/><path d="M28.6 39.6c1.9 1.5 4.9 1.5 6.8 0" stroke="#7a3a2e" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    case 'stubble':
      return `<path d="M22 35c.6 7 4.4 11.6 10 11.6s9.4-4.6 10-11.6c-1.4 3.6-3.2 5.6-5.4 6.2-1.4 1.8-3 2.4-4.6 2.4s-3.2-.6-4.6-2.4c-2.2-.6-4-2.6-5.4-6.2z" fill="${col}" opacity=".32"/>`;
    case 'goatee':
      return `<path d="M28.4 41.6c1 2.6 2.4 4 3.6 4s2.6-1.4 3.6-4c-1.2.6-2.4.9-3.6.9s-2.4-.3-3.6-.9zM28.4 38.4c1.2-1 2.4-1.2 3.6-.6 1.2-.6 2.4-.4 3.6.6-1.2.5-2.4.6-3.6.3-1.2.3-2.4.2-3.6-.3z" fill="${col}"/>`;
    case 'mustache':
    case 'mustacheGrey':
      return `<path d="M25.2 39c2.1-2.6 5.3-2.6 6.8-1.3 1.5-1.3 4.7-1.3 6.8 1.3-1.5 1.5-4.2 1.6-6.8.6-2.6 1-5.3.9-6.8-.6z" fill="${col}"/><path d="M27 38.4c1.4-.8 3-.9 4.4-.4" stroke="#fff" stroke-width=".5" opacity=".25" fill="none"/>`;
    default:
      return '';
  }
}
function accessories(c) {
  const acc = c.acc || [];
  let out = '';
  if (acc.includes('glassesRound'))
    out += `<g fill="rgba(200,230,255,.12)" stroke="#2a201a" stroke-width="1.1"><circle cx="27.6" cy="32.4" r="3.4"/><circle cx="36.4" cy="32.4" r="3.4"/></g><path d="M31 32.2c.6-.5 1.4-.5 2 0M24.2 31.8l-2.2-.8M39.8 31.8l2.2-.8" stroke="#2a201a" stroke-width="1" fill="none"/><path d="M25.6 30.6l1.4-1M34.4 30.6l1.4-1" stroke="#fff" stroke-width=".7" opacity=".6"/>`;
  if (acc.includes('glassesRect'))
    out += `<g fill="rgba(200,230,255,.12)" stroke="#1a1512" stroke-width="1.2"><rect x="23.8" y="30.2" width="7.4" height="5" rx="1.4"/><rect x="32.8" y="30.2" width="7.4" height="5" rx="1.4"/></g><path d="M31.2 32c.5-.3 1.1-.3 1.6 0" stroke="#1a1512" stroke-width="1" fill="none"/><path d="M25 31.6l1.6-1M34 31.6l1.6-1" stroke="#fff" stroke-width=".7" opacity=".55"/>`;
  if (acc.includes('hoops')) out += `<circle cx="21.6" cy="38.8" r="1.7" fill="none" stroke="#e9c46a" stroke-width=".8"/><circle cx="42.4" cy="38.8" r="1.7" fill="none" stroke="#e9c46a" stroke-width=".8"/>`;
  if (acc.includes('studs')) out += `<circle cx="21.6" cy="37.6" r="1.1" fill="#f3d27a"/><circle cx="42.4" cy="37.6" r="1.1" fill="#f3d27a"/><circle cx="21.3" cy="37.3" r=".35" fill="#fff"/><circle cx="42.1" cy="37.3" r=".35" fill="#fff"/>`;
  if (acc.includes('headphones'))
    out += `<path d="M19.6 33c0-10 5.4-16.6 12.4-16.6S44.4 23 44.4 33" stroke="#1a1d24" stroke-width="2.2" fill="none"/><rect x="17.6" y="30.4" width="5" height="8" rx="2.4" fill="#e0743a"/><rect x="41.4" y="30.4" width="5" height="8" rx="2.4" fill="#e0743a"/><rect x="18.4" y="31.2" width="1.4" height="6.4" rx=".7" fill="#fff" opacity=".35"/>`;
  return out;
}

export function avatarSVG(id) {
  const c = rosterById(id);
  const u = 'a' + c.id + Math.floor(Math.random() * 1e6).toString(36);
  const hc = c.hair.color;
  const hj = c.hair.style === 'hijab';
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
    <radialGradient id="${u}b" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="${shade(c.bg[0], 0.12)}"/><stop offset=".55" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></radialGradient>
    <radialGradient id="${u}s" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${shade(c.skin, 0.14)}"/><stop offset=".6" stop-color="${c.skin}"/><stop offset="1" stop-color="${shade(c.skin, -0.12)}"/></radialGradient>
    <linearGradient id="${u}h" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${shade(hc, 0.18)}"/><stop offset=".5" stop-color="${hc}"/><stop offset="1" stop-color="${shade(hc, -0.25)}"/></linearGradient>
    <linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c.top.color, 0.16)}"/><stop offset="1" stop-color="${shade(c.top.color, -0.22)}"/></linearGradient>
    <linearGradient id="${u}j" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${shade(hc, 0.16)}"/><stop offset=".55" stop-color="${hc}"/><stop offset="1" stop-color="${shade(hc, -0.28)}"/></linearGradient>
    ${c.hair.cap ? `<linearGradient id="${u}k" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="${shade(c.hair.cap, 0.18)}"/><stop offset="1" stop-color="${shade(c.hair.cap, -0.2)}"/></linearGradient><clipPath id="${u}c"><path d="M18.8 26.6c-.2-7 5.8-11 13.2-11s13.4 4 13.2 10.6z"/></clipPath>` : ''}
  </defs>
  <rect width="64" height="64" fill="url(#${u}b)"/>
  <path d="M0 0h64v24C44 18 22 22 0 34z" fill="#fff" opacity=".05"/>
  <g transform="translate(32 37) scale(1.1) translate(-32 -37)">
  ${hairBack(c.hair, u)}
  ${top(c, u)}
  <path d="M26.8 41h10.4v6.2c-1.4 1.6-3.2 2.4-5.2 2.4s-3.8-.8-5.2-2.4z" fill="${shade(c.skin, -0.06)}"/><path d="M26.8 42.6c1.6 1.4 3.4 2 5.2 2s3.6-.6 5.2-2v-1.6H26.8z" fill="${shade(c.skin, -0.25)}" opacity=".45"/>
  ${hj ? `<path d="M17 47c3 5.6 8.6 8.6 15 8.6s12-3 15-8.6c-2-4.4-6-7-10.4-7.4L32 44l-4.6-4.4C23 40 19 42.6 17 47z" fill="url(#${u}j)"/><path d="M22.4 44.4c2.6 2.8 5.8 4.2 9.6 4.2s7-1.4 9.6-4.2" stroke="${c.hair.trim || '#c9a14a'}" stroke-width=".9" fill="none" opacity=".8"/>` : ''}
  ${face(c, u)}
  ${facial(c)}
  ${hairFront(c.hair, u, c)}
  ${accessories(c)}
  </g>
  </svg>`;
}

export function avatarHTML(id) {
  return avatarSVG(id);
}
