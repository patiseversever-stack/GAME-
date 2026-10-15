// Satır içi SVG simgeler (24×24, currentColor). Resimli simgeler (jeton, sandık…) assets.ts'te.
// Takım şekilleri (♥ ♦ ♣ ♠) tek yerde: simge, arena deseni ve logo süsü bunları kullanır.
const s = (body: string, fill = false) =>
  `<svg class="kh-i" viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

/** Takım gövdeleri (24×24 tuval, dolgu). */
export const SUIT = {
  h: '<path d="M12 21.3C9.3 19.2 2 14.4 2 8.5 2 5.4 4.4 3 7.3 3c2 0 3.7 1.1 4.7 2.8C13 4.1 14.7 3 16.7 3 19.6 3 22 5.4 22 8.5c0 5.9-7.3 10.7-10 12.8z"/>',
  d: '<path d="M12 1.6C14.2 5.4 16.8 8.9 19.8 12 16.8 15.1 14.2 18.6 12 22.4 9.8 18.6 7.2 15.1 4.2 12 7.2 8.9 9.8 5.4 12 1.6z"/>',
  c: '<circle cx="12" cy="7" r="4.4"/><circle cx="6.9" cy="13.6" r="4.4"/><circle cx="17.1" cy="13.6" r="4.4"/><path d="M12 9.5 14.6 21.8H9.4z"/><circle cx="12" cy="12.4" r="2.6"/>',
  s: '<path d="M12 1.8C14.6 5.6 20.6 8.8 20.6 13.4a4.3 4.3 0 0 1-7.4 3L14.6 21.8H9.4l1.4-5.4a4.3 4.3 0 0 1-7.4-3C3.4 8.8 9.4 5.6 12 1.8z"/>',
} as const;
export type SuitKey = keyof typeof SUIT;

/** Tek takım simgesi (renk: currentColor ya da CSS). */
export const suitSvg = (k: SuitKey, cls = ''): string =>
  `<svg class="kh-suit kh-suit--${k} ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SUIT[k]}</svg>`;

/** Arena zeminindeki dağınık takım deseni (240 px döşeme, beyaz; saydamlık CSS'te). */
export const SUIT_TILE = (() => {
  const items: [SuitKey, number, number, number, number][] = [
    ['h', 26, 30, 1.5, -18], ['s', 124, 22, 1.1, 14], ['d', 204, 70, 1.3, 8], ['c', 66, 110, 1.25, -10], ['h', 172, 146, 0.95, 22],
    ['s', 28, 196, 1.35, -6], ['d', 112, 200, 0.95, -24], ['c', 210, 210, 1.3, 12], ['d', 150, 96, 0.75, 0], ['h', 84, 166, 0.75, 30],
  ];
  const g = items.map(([k, x, y, sc, r]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc}) translate(-12 -12)">${SUIT[k]}</g>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g fill="#fff">${g}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

export const I = {
  gear: s('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  pause: s('<rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/>', true),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevL: s('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  chevR: s('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  lock: s('<path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5"/><rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor" stroke="none"/>'),
  plus: s('<path d="M12 5.5v13M5.5 12h13"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cards: s('<rect x="3.5" y="5.5" width="10.5" height="14.5" rx="2"/><path d="M8.5 4.6l1.2-.6a2 2 0 0 1 2.6.9l5.6 11.4a2 2 0 0 1-.9 2.6l-2.3 1.2" opacity=".7"/>'),
  star: s('<path d="M12 2.8l2.75 5.75 6.3.8-4.62 4.38 1.17 6.27L12 16.95 6.4 20l1.17-6.27L2.95 9.35l6.3-.8z"/>', true),
  sfx: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>'),
  voice: s('<path d="M20 11.5a7.5 7 0 0 1-10.8 6.3L4.5 19.5l1.4-3.9A7 7 0 0 1 4.5 11.5 7.5 7 0 0 1 20 11.5z"/><path d="M8.8 11.5h.01M12.2 11.5h.01M15.6 11.5h.01" stroke-width="2.8"/>'),
  music: s('<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.5" fill="currentColor"/>'),
  vibrate: s('<rect x="7.5" y="3.5" width="9" height="17" rx="2"/><path d="M3.5 9v6M20.5 9v6"/>'),
  quality: s('<path d="M12 3l2.2 5.6L20 10l-5.8 1.6L12 17l-2.2-5.4L4 10l5.8-1.4z"/><path d="M18.5 16.5l.8 2 2 .7-2 .8-.8 2-.8-2-2-.8 2-.7z" fill="currentColor" stroke="none"/>'),
  play: s('<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l10.6-6.8a1 1 0 0 0 0-1.72L9.5 4.34A1 1 0 0 0 8 5.2z"/>', true),
  home: s('<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5V19h11V9.5"/>'),
  book: s('<path d="M4 5.5A2 2 0 0 1 6 4h5v15.5H6a2 2 0 0 0-2 1.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v15.5h5a2 2 0 0 1 2 1.5z"/>'),
  exit: s('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
  hand: s('<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3M12.2 10V8.6a1.6 1.6 0 0 1 3.2 0V11M15.4 10.2a1.6 1.6 0 0 1 3.2 0v3.6a6.3 6.3 0 0 1-6.3 6.3h-.6a6 6 0 0 1-4.6-2.2L4.3 14.2a1.6 1.6 0 0 1 2.4-2.1L9 14"/>'),
  user: s('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  tulip: s('<path d="M4.5 6.5C4.5 11.5 7.5 15 12 15 10 12 8 9 4.5 6.5zM19.5 6.5C19.5 11.5 16.5 15 12 15c2-3 4-6 7.5-8.5zM12 3.2c2.3 2.6 3.2 6.2 0 11.8-3.2-5.6-2.3-9.2 0-11.8zM11.3 15h1.4v6.2h-1.4zM12 20c-2.2 0-4-1.3-4.7-3.3 2.2.1 3.8 1.2 4.7 3.3zM12 20c2.2 0 4-1.3 4.7-3.3-2.2.1-3.8 1.2-4.7 3.3z"/>', true),
  globe: s('<circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6z"/>'),
  friends: s('<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="16.8" cy="9.2" r="2.6"/><path d="M15.6 14.2a5 5 0 0 1 5.6 5"/>'),
  dice: s('<rect x="4" y="4" width="16" height="16" rx="3.6"/><circle cx="8.6" cy="8.6" r="1.3" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.4" cy="8.6" r="1.3" fill="currentColor"/><circle cx="8.6" cy="15.4" r="1.3" fill="currentColor"/>'),
  shuffle: s('<path d="M4 7h3.2c2 0 3.2.8 4.4 2.6l1.6 2.6c1.2 1.9 2.4 2.8 4.4 2.8H20M17 12l3 3-3 3M4 17h3.2c1.4 0 2.4-.4 3.3-1.3M13.5 8.3C14.3 7.4 15.3 7 16.6 7H20M17 4l3 3-3 3"/>'),
  flame: s('<path d="M12 21.5c-3.9 0-6.8-2.7-6.8-6.4 0-3.4 2.2-5.4 3.6-7.4.9-1.3 1.3-2.8 1.2-4.2 2.8 1.4 4.3 3.9 4.4 6.5.8-.6 1.3-1.6 1.4-2.6 1.9 1.7 3 4.3 3 6.9 0 4.1-3 7.2-6.8 7.2z"/>', true),
  pencil: s('<path d="M15.2 4.8l4 4L8.6 19.4l-4.8.8.8-4.8z"/><path d="M13.2 6.8l4 4"/>'),
  bell: s('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.8H4.4z"/><path d="M10 20.4a2.2 2.2 0 0 0 4 0"/>'),
  bag: s('<path d="M5 8.5h14l-1.1 10.6a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z"/><path d="M8.8 10.5V7.2a3.2 3.2 0 0 1 6.4 0v3.3"/>'),
  grid: s('<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>'),
  target: s('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  sparkle: s('<path d="M12 2.5l1.9 6.2 6.1 1.9-6.1 1.9L12 18.7l-1.9-6.2L4 10.6l6.1-1.9z"/><path d="M19 15.5l.8 2.4 2.2.7-2.2.8L19 21.8l-.8-2.4-2.2-.8 2.2-.7z"/>', true),
  crown: s('<path d="M3.5 8l4.6 4L12 5l3.9 7 4.6-4-1.6 10.5H5.1z"/><path d="M5.6 20.5h12.8" stroke="currentColor" stroke-width="2.2"/>', true),
  info: s('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.6M12 7.6h.01" stroke-width="2.6"/>'),
  eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  gift: s('<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7.5h14V13M12 9v11.5M12 9C10.5 5.5 6.5 4.6 6.6 7 6.7 9 12 9 12 9zM12 9c1.5-3.5 5.5-4.4 5.4-2-.1 2-5.4 2-5.4 2z"/>'),
  swords: s('<path d="M4 4l9.5 9.5M4 4v3.4M4 4h3.4M20 4l-9.5 9.5M20 4v3.4M20 4h-3.4M7 14.5l2.5 2.5-3 3-2.5-2.5zM17 14.5l-2.5 2.5 3 3 2.5-2.5z"/>'),
  fan: '<svg class="kh-i kh-fanico" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#0a1033" stroke-width="1.6" stroke-linejoin="round"><rect x="3.2" y="5.6" width="9" height="13" rx="1.8" fill="#ff2e4d" transform="rotate(-16 7.7 12.1)"/><rect x="7.5" y="4.4" width="9" height="13" rx="1.8" fill="#ffb400"/><rect x="11.8" y="5.6" width="9" height="13" rx="1.8" fill="#1f7bff" transform="rotate(16 16.3 12.1)"/></g></svg>',
} as const;
