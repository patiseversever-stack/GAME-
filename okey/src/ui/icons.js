// Satır içi SVG ikonlar (24×24, stroke). Emoji/karakter ikon kullanılmaz.
const P = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  volumeOn: '<path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>',
  volumeOff: '<path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/>',
  sort: '<path d="M4 7h10M4 12h7M4 17h4"/><path d="M17 5v14m0 0l-3-3m3 3l3-3"/>',
  wand: '<path d="M5 19L15 9"/><path d="M14 4l1 2.5L17.5 7.5 15 8.5 14 11l-1-2.5L10.5 7.5 13 6.5z"/><path d="M18.5 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
  // gerçek dişli (eskisi güneşe benziyordu)
  cog: '<path d="M9.29 4.79L9.87 2.02A10.2 10.2 0 0 1 14.13 2.02L14.71 4.79A7.7 7.7 0 0 1 15.18 4.99L17.55 3.44A10.2 10.2 0 0 1 20.56 6.45L19.01 8.82A7.7 7.7 0 0 1 19.21 9.29L21.98 9.87A10.2 10.2 0 0 1 21.98 14.13L19.21 14.71A7.7 7.7 0 0 1 19.01 15.18L20.56 17.55A10.2 10.2 0 0 1 17.55 20.56L15.18 19.01A7.7 7.7 0 0 1 14.71 19.21L14.13 21.98A10.2 10.2 0 0 1 9.87 21.98L9.29 19.21A7.7 7.7 0 0 1 8.82 19.01L6.45 20.56A10.2 10.2 0 0 1 3.44 17.55L4.99 15.18A7.7 7.7 0 0 1 4.79 14.71L2.02 14.13A10.2 10.2 0 0 1 2.02 9.87L4.79 9.29A7.7 7.7 0 0 1 4.99 8.82L3.44 6.45A10.2 10.2 0 0 1 6.45 3.44L8.82 4.99A7.7 7.7 0 0 1 9.29 4.79Z"/><circle cx="12" cy="12" r="3.2"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  book: '<path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-3.8 3.4-5.6 7-5.6s6.4 1.8 7 5.6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a2.5 2.5 0 0 0 3 3.6M16 6h3a2.5 2.5 0 0 1-3 3.6M12 13v4m-3.5 3h7M10 17h4"/>',
  star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.8 6.6 19.9l1.3-6L3.4 9.8l6-.7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  hand: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-1V5a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V14c0 4-2.6 7-6 7-2.6 0-4-1.4-5.5-4L4 13.5a1.6 1.6 0 0 1 2.6-1.8L8 13"/>',
  layers: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  flag: '<path d="M6 21V4m0 0h11l-2 4 2 4H6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  vibrate: '<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4 8v8M20 8v8M1.5 10.5v3M22.5 10.5v3"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2-1 1.6-2-.5-1.3.2-2.4 1.6-2.4H17a3.5 3.5 0 0 0 3.5-3.6C20.2 7 16.6 3.5 12 3.5z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3.5-6-4.2-6-1.6C6 9 9 9 12 9zM12 9c1.5-3.5 6-4.2 6-1.6C18 9 15 9 12 9z"/>',
  // çarşı: sivri kemerli dükkân
  bazaar: '<path d="M4 20V11.5C4 7 8 4.5 12 3c4 1.5 8 4 8 8.5V20"/><path d="M2.5 20h19"/><path d="M9 20v-5.5a3 3 0 0 1 6 0V20"/><path d="M4 11.5h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  ad: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 8.5v5l4.5-2.5z"/><path d="M8 20h8"/>',
};

export function icon(name, cls = '') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${P[name] || ''}</svg>`;
}

export const ICON_NAMES = Object.keys(P);
