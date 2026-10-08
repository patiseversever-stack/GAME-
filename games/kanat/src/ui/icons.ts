// KANAT icon set: inline SVG, 24×24 grid, single 1.6 px stroke, round caps/joins, currentColor.
// "Altimeter & map" line language — thin, geometric, no fills except small dots and the filled star.
const P: Record<string, string> = {
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  back: '<path d="M14.5 5l-7 7 7 7"/>',
  chevron: '<path d="M9.5 5l7 7-7 7"/>',
  chevronDown: '<path d="M5 9.5l7 7 7-7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  starFill: '<path fill="currentColor" stroke="none" d="M12 3.2l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.23l-5.5 2.89 1.05-6.12L3.1 9.67l6.15-.9z"/>',
  gate: '<ellipse cx="12" cy="12" rx="4.6" ry="8"/><path d="M2.8 12h4.6M16.6 12h4.6M19 9.6l2.2 2.4-2.2 2.4"/>',
  thermal: '<path d="M7 20c-1.6-2 1.6-3.6 0-5.6s1.6-3.6 0-5.6"/><path d="M12 20c-1.6-2 1.6-3.6 0-5.6s1.6-3.6 0-5.6"/><path d="M17 20c-1.6-2 1.6-3.6 0-5.6s1.6-3.6 0-5.6"/><path d="M9.6 5.4L12 3l2.4 2.4"/>',
  balloon: '<path d="M12 3a6.5 6.5 0 0 0-6.5 6.5c0 3.6 3.6 6.6 5 8h3c1.4-1.4 5-4.4 5-8A6.5 6.5 0 0 0 12 3z"/><path d="M12 3c-1.9 2.2-2.6 5-2.6 6.5 0 3 1.1 6 1.1 8M12 3c1.9 2.2 2.6 5 2.6 6.5 0 3-1.1 6-1.1 8"/><rect x="10.3" y="19" width="3.4" height="2.4" rx=".6"/>',
  postcard: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M13 8.5v7"/><path d="M15.5 8.8h2.6v2.6h-2.6z"/><path d="M6 10h4.5M6 12.5h4.5M6 15h3"/>',
  camera: '<path d="M4 8.5h3.2l1.6-2.5h6.4l1.6 2.5H20v10H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  share: '<path d="M12 3.5v11M8 7l4-3.5L16 7"/><path d="M8.5 10.5H6v9.5h12v-9.5h-2.5"/>',
  settings: '<path d="M4.5 7.5h9M18.5 7.5h1M4.5 16.5h1M10.5 16.5h9"/><circle cx="16" cy="7.5" r="2.2"/><circle cx="8" cy="16.5" r="2.2"/>',
  duel: '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><path d="M9.6 11h.01M14.4 11h.01" stroke-width="2.2"/>',
  ghost: '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><path d="M9.6 11h.01M14.4 11h.01" stroke-width="2.2"/>',
  rank: '<path d="M6 12l6-4 6 4M6 17l6-4 6 4"/><path d="M12 3.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.3l2-.3z"/>',
  league: '<path d="M12 3l7 2.8v5.4c0 4.4-3 7.8-7 9.8-4-2-7-5.4-7-9.8V5.8z"/><path d="M8.5 11.5l3.5 2.5 3.5-2.5"/>',
  shield: '<path d="M12 3l7 2.8v5.4c0 4.4-3 7.8-7 9.8-4-2-7-5.4-7-9.8V5.8z"/><path d="M9 12l2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01" stroke-width="2.6"/>',
  parachute: '<path d="M3.5 10a8.5 6 0 0 1 17 0"/><path d="M3.5 10c1.4-1 2.8-1 4.2 0 1.4-1 2.9-1 4.3 0 1.4-1 2.9-1 4.3 0 1.4-1 2.8-1 4.2 0"/><path d="M3.8 10.3L11 18M20.2 10.3L13 18M12 10v7"/><circle cx="12" cy="19.3" r="1.3"/>',
  arrow: '<path d="M12 3.5l7 9h-4.2V20H9.2v-7.5H5z"/>',
  retry: '<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19 4.5v4h-4"/>',
  next: '<path d="M6 6l7.5 6L6 18z"/><path d="M17.5 6v12"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  paste: '<rect x="5.5" y="5" width="13" height="16" rx="2"/><path d="M9 5V3.6h6V5"/><path d="M9 11h6M9 14.5h6M9 18h3"/>',
  flock: '<path d="M2.5 11.5c1.3-1.4 2.7-1.4 4 0 1.3-1.4 2.7-1.4 4 0"/><path d="M12 16.5c1.2-1.3 2.4-1.3 3.6 0 1.2-1.3 2.4-1.3 3.6 0"/><path d="M13.5 6.8c.9-1 1.8-1 2.7 0 .9-1 1.8-1 2.7 0"/><path d="M6 18.5c.7-.8 1.4-.8 2.1 0 .7-.8 1.4-.8 2.1 0"/>',
  encircle: '<path d="M19 12a7 7 0 1 1-3.5-6.06"/><path d="M15.2 3.4l.6 2.7-2.6.7"/><circle cx="12" cy="12" r="2"/>',
  cloud: '<path d="M7 18h10.5a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 7.3 9.6 4.2 4.2 0 0 0 7 18z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  sunrise: '<path d="M3 17h18M7 17a5 5 0 0 1 10 0"/><path d="M12 4v5M9.6 6.4L12 4l2.4 2.4"/><path d="M4.5 12.8l1.6.9M19.5 12.8l-1.6.9M7 20.5h10"/>',
  sunset: '<path d="M3 17h18M7 17a5 5 0 0 1 10 0"/><path d="M12 4v5M9.6 6.6L12 9l2.4-2.4"/><path d="M4.5 12.8l1.6.9M19.5 12.8l-1.6.9M7 20.5h10"/>',
  wave: '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/><path d="M3 19h5"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.6 4.6L12 6.4l2.4-1.8M9.6 19.4L12 17.6l2.4 1.8"/>',
  mirror: '<path d="M3 12h18"/><path d="M5 12l4.5-6 3 4 2-2.5L19 12"/><path d="M5 12l4.5 6 3-4 2 2.5L19 12" opacity=".45"/>',
  feather: '<path d="M19.5 4.5C12 5 7 9.5 6 17l-1.5 3"/><path d="M19.5 4.5c0 7-4.5 11.5-11.5 12.5"/><path d="M10 14.5l-3-.4M13 11.4l-3.3-.4M16 8.3l-3-.4"/>',
  stamp: '<path d="M9.2 4.5h5.6l-1 6.5h-3.6z"/><path d="M5 15a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5z"/><path d="M5 20.2h14"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" stroke-width="2.2"/>',
  task: '<path d="M4 6.5l1.5 1.5 3-3M4 13.5l1.5 1.5 3-3"/><path d="M11.5 7h8.5M11.5 14h8.5M11.5 19.5h8.5M4.5 19.5h3"/>',
  glide: '<path d="M12 4.5l1.3 4L21 12.5l-7.7 1.3L12 19.5l-1.3-5.7L3 12.5l7.7-4z"/>',
  diamond: '<path d="M6.5 4.5h11l3.5 5-9 10-9-10z"/><path d="M3 9.5h18M9.5 4.5l-1 5 3.5 10 3.5-10-1-5"/>',
  proximity: '<path d="M4 3.5v17"/><path d="M8 9.2a3.4 3.4 0 0 1 0 5.6M11.5 6.5a7.6 7.6 0 0 1 0 11M15 4a11.6 11.6 0 0 1 0 16"/>',
  jump: '<path d="M3 9h5v11"/><path d="M8 9c4.5 0 8.5 2 11 7"/><path d="M19.6 11.4l-.6 4.6-4.4-1"/>',
  mountain: '<path d="M2.5 19l6-9 4 5.5 2.5-3 6.5 6.5z"/><circle cx="17" cy="6.5" r="1.8"/>',
  map: '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  collection: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
  hanger: '<path d="M12 9V8.2a2.1 2.1 0 1 0-2.1-2.1"/><path d="M12 9l8.4 6.3a1.3 1.3 0 0 1-.8 2.3H4.4a1.3 1.3 0 0 1-.8-2.3z"/>',
  badge: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.6 9.8L6.2 3.5h3.9l1.9 4 1.9-4h3.9l-2.4 6.3"/>',
  turtle: '<path d="M5 15.5a6.5 5.5 0 0 1 13 0z"/><path d="M18 14.6h1.2a2 2 0 0 0 0-4h-1.6"/><path d="M7.4 15.5l-1 2.6M15.6 15.5l1 2.6M4 15.5h15"/><path d="M8.5 11.5l2.2-2.2h1.6l2.2 2.2"/>',
  lifebuoy: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M6.3 6.3l3.2 3.2M14.5 14.5l3.2 3.2M17.7 6.3l-3.2 3.2M9.5 14.5l-3.2 3.2"/>',
  eye: '<path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M2.8 12s3.4-6 9.2-6c1.6 0 3 .45 4.2 1.1M21.2 12s-3.4 6-9.2 6c-1.6 0-3-.45-4.2-1.1"/><path d="M4.5 19.5l15-15"/>',
  frame: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><rect x="6.5" y="7.5" width="11" height="9"/>',
  filter: '<circle cx="9" cy="10" r="5"/><circle cx="15" cy="10" r="5"/><circle cx="12" cy="15" r="5"/>',
  grain: '<path d="M6 6h.01M10 8h.01M14 5h.01M18 7h.01M7 11h.01M12 12h.01M17 11h.01M5 15h.01M9 16h.01M14 16h.01M18 15h.01M7 19h.01M12 19h.01M16 19h.01" stroke-width="2.2"/>',
  aperture: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5l2.9 7M20.1 9.5l-7.4 1M17.4 18.5l-4.6-6M8.5 19.7l2.9-7M3.7 14l4.6-6M7.6 4.7l4.6 6"/>',
  focus: '<path d="M4 8.5V4h4.5M15.5 4H20v4.5M20 15.5V20h-4.5M8.5 20H4v-4.5"/><circle cx="12" cy="12" r="2.6"/>',
  exposure: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/><path d="M7 9.2h4M9 7.2v4M13.2 15.2h4"/>',
  fov: '<path d="M12 19L4.5 6.5M12 19l7.5-12.5"/><path d="M6.6 10a8.4 8.4 0 0 0 10.8 0"/>',
  roll: '<circle cx="12" cy="12" r="8.5"/><path d="M3.8 14.2l16.4-4.4"/><path d="M12 12h.01" stroke-width="2.4"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  vibration: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5S9.5 6 12 3.5z"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.5 0-4-1.4-5.4-3.9L4 13.6a1.5 1.5 0 0 1 2.6-1.5L8 14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 8h.01" stroke-width="2.2"/>',
  trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4.2M16 6h3a3 3 0 0 1-3 4.2"/><path d="M12 13.5V17M9.5 20.5h5M10 17h4v3.5h-4z"/>',
  save: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 16v3.5h15V16"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  speed: '<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l4-5"/><path d="M12 16.5h.01" stroke-width="2.4"/>',
  altitude: '<path d="M3 20l6-9 3.5 4.5L15 12l6 8z"/><path d="M18 3.5v6M15.8 5.6L18 3.5l2.2 2.1"/>',
  route: '<path d="M5.5 18.5c3-5 .5-9 5-11s7 1 8-3" stroke-dasharray="2.2 2.4"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="4.8" r="1.6"/>',
  exit: '<path d="M13.5 4.5H5.5v15h8"/><path d="M10.5 12h9.5M17 9l3 3-3 3"/>',
  sparkle: '<path d="M12 3.5l1.6 5.2 5.4 1.8-5.4 1.8L12 17.5l-1.6-5.2L5 10.5l5.4-1.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  helmet: '<path d="M4 14a8 8 0 0 1 16 0v3H4z"/><path d="M9 14h11"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  pilot: '<path d="M12 4.5l1.3 4L21 12.5l-7.7 1.3L12 19.5l-1.3-5.7L3 12.5l7.7-4z"/><circle cx="12" cy="6.2" r="1.1"/>',
};

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P) as IconName[];

const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

/** SVG markup string for templates. */
export function iconSvg(name: string, cls = 'kn-icon'): string {
  return `${SVG_OPEN} class="${cls}">${P[name] ?? P.dot}</svg>`;
}

/** SVG element (fresh node). */
export function icon(name: string, cls = 'kn-icon'): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = iconSvg(name, cls);
  return tpl.content.firstElementChild as SVGSVGElement;
}
