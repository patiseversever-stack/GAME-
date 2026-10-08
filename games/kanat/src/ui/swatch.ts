// Small SVG previews for cosmetics (pattern fabric tiles, palettes, trails, canopies, card frames, tints).
// Used by the wardrobe, route reward chips, results reward chip and the level-up card. Colours come from
// src/content/meta/cosmetics.ts (single source of truth); UI-only fallbacks for unknown ids.
import { cosmetic } from '../content/meta/cosmetics.ts';
import { PALETTES, PATTERN_IDS, TRAILS } from './content.ts';

let uid = 0;

/** Fabric tile motif (20×20 user units) for each of the 20 suit patterns. B = motif, C = accent. */
function motif(id: string, B: string, C: string): string {
  switch (id) {
    case 'kilim': return `<path d="M10 1 L19 10 L10 19 L1 10Z" fill="none" stroke="${B}" stroke-width="1.6"/><path d="M10 6.5 L13.5 10 L10 13.5 L6.5 10Z" fill="${C}"/>`;
    case 'cini': return `<circle cx="10" cy="10" r="2.2" fill="${C}"/><g fill="${B}"><ellipse cx="10" cy="4.6" rx="1.6" ry="2.6"/><ellipse cx="10" cy="15.4" rx="1.6" ry="2.6"/><ellipse cx="4.6" cy="10" rx="2.6" ry="1.6"/><ellipse cx="15.4" cy="10" rx="2.6" ry="1.6"/></g>`;
    case 'ebru': return `<path d="M0 7 Q5 2 10 7 T20 7" stroke="${B}" stroke-width="2" fill="none"/><path d="M0 15 Q5 10 10 15 T20 15" stroke="${C}" stroke-width="1.2" fill="none"/>`;
    case 'periBacasi': return `<path d="M6.5 18 L8.6 8.5 L11.4 8.5 L13.5 18Z" fill="${B}"/><ellipse cx="10" cy="8.4" rx="3" ry="1.3" fill="${C}"/>`;
    case 'turkuaz': return `<path d="M-2 6 L6 -2 M-2 14 L14 -2 M-2 22 L22 -2 M6 22 L22 6 M14 22 L22 14" stroke="${B}" stroke-width="1.6"/><path d="M-2 18 L18 -2" stroke="${C}" stroke-width="0.8"/>`;
    case 'geceYarisi': return `<circle cx="4" cy="5" r="0.9" fill="${C}"/><circle cx="14" cy="3" r="0.6" fill="${B}"/><circle cx="11" cy="12" r="1.1" fill="${C}"/><circle cx="3" cy="16" r="0.6" fill="${B}"/><circle cx="17" cy="17" r="0.8" fill="${B}"/>`;
    case 'balonSeridi': return `<rect x="0" width="5" height="20" fill="${B}"/><rect x="10" width="5" height="20" fill="${C}" opacity="0.8"/>`;
    case 'karKristali': return `<path d="M10 3 V17 M4 6.5 L16 13.5 M4 13.5 L16 6.5" stroke="${B}" stroke-width="1.2"/><circle cx="10" cy="10" r="1.4" fill="${C}"/>`;
    case 'lale': return `<path d="M10 16 C6 13 6 8 7 5 L10 8 L13 5 C14 8 14 13 10 16Z" fill="${B}"/><path d="M10 16 V19" stroke="${C}" stroke-width="1.2"/>`;
    case 'traverten': return `<path d="M0 6 Q10 2 20 6 M0 12 Q10 8 20 12 M0 18 Q10 14 20 18" stroke="${B}" stroke-width="1.6" fill="none"/><path d="M4 7.5 Q10 5 16 7.5" stroke="${C}" stroke-width="1" fill="none"/>`;
    case 'ladin': return `<path d="M10 3 L14 10 L12 10 L15.5 16 L4.5 16 L8 10 L6 10Z" fill="${B}"/><rect x="9.3" y="16" width="1.4" height="2.5" fill="${C}"/>`;
    case 'dalga': return `<path d="M0 10 C4 4 8 4 10 10 S16 16 20 10" stroke="${B}" stroke-width="2.4" fill="none"/>`;
    case 'kontur': return `<circle cx="10" cy="10" r="3" fill="none" stroke="${C}" stroke-width="1"/><circle cx="10" cy="10" r="6.5" fill="none" stroke="${B}" stroke-width="1"/><circle cx="10" cy="10" r="10" fill="none" stroke="${B}" stroke-width="1" opacity="0.6"/>`;
    case 'pusula': return `<path d="M10 2 L11.6 10 L10 18 L8.4 10Z" fill="${B}"/><path d="M2 10 L10 8.6 L18 10 L10 11.4Z" fill="${C}"/>`;
    case 'guvercin': return `<path d="M4 9 Q6.5 6.5 9 9 Q11.5 6.5 14 9" stroke="${B}" stroke-width="1.5" fill="none"/><path d="M9 16 Q10.5 14.5 12 16 Q13.5 14.5 15 16" stroke="${C}" stroke-width="1.1" fill="none"/>`;
    case 'yakamoz': return `<circle cx="5" cy="5" r="1.6" fill="${B}"/><circle cx="15" cy="9" r="1" fill="${C}"/><circle cx="8" cy="15" r="1.2" fill="${B}" opacity="0.7"/><circle cx="17" cy="17" r="0.6" fill="${C}"/>`;
    case 'mehtap': return `<path d="M12 4 A6 6 0 1 0 12 16 A4.6 4.6 0 1 1 12 4Z" fill="${B}"/><circle cx="16" cy="5" r="0.8" fill="${C}"/>`;
    case 'kizilUfuk': return `<rect y="4" width="20" height="3" fill="${B}"/><rect y="10" width="20" height="1.6" fill="${C}"/><rect y="15" width="20" height="0.8" fill="${B}" opacity="0.7"/>`;
    case 'sirt': return `<path d="M0 14 L5 7 L9 11 L14 4 L20 12" stroke="${B}" stroke-width="1.6" fill="none"/><path d="M0 18 L6 13 L11 16 L20 10" stroke="${C}" stroke-width="0.9" fill="none"/>`;
    default: return `<path d="M10 18 L10 6 M10 18 L3 9 M10 18 L17 9" stroke="${B}" stroke-width="1.4"/><circle cx="10" cy="18" r="2.2" fill="${C}"/>`;
  }
}

/** <pattern> definition for a suit pattern in a palette; returns [defs, fillUrl]. */
export function patternDef(id: string, pal: readonly [string, string, string], scale = 1): [string, string] {
  const pid = `kp${++uid}`;
  const k = PATTERN_IDS.indexOf(id as (typeof PATTERN_IDS)[number]);
  const rot = k < 0 ? 0 : [0, 0, 0, 0, 0, 0, 90, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0][k];
  return [`<pattern id="${pid}" width="${20 * scale}" height="${20 * scale}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})"><rect width="${20 * scale}" height="${20 * scale}" fill="${pal[1]}"/><g transform="scale(${scale})">${motif(id, pal[0], pal[2])}</g></pattern>`, `url(#${pid})`];
}

export function patternSvg(id: string, pal: readonly [string, string, string]): string {
  const [defs, fill] = patternDef(id, pal, 0.75);
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs>${defs}</defs><rect width="60" height="60" fill="${fill}"/></svg>`;
}

export function paletteSvg(pal: readonly [string, string, string]): string {
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="${pal[1]}"/><circle cx="30" cy="30" r="17" fill="${pal[0]}"/><path d="M13 30 A17 17 0 0 0 47 30Z" fill="${pal[2]}" opacity="0.9"/><circle cx="30" cy="30" r="17" fill="none" stroke="#FFFFFF33"/></svg>`;
}

export function trailSvg(col: string): string {
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#121922"/><path d="M6 48 C20 42 30 24 52 14" stroke="${col}" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.18"/><path d="M6 48 C20 42 30 24 52 14" stroke="${col}" stroke-width="2.2" stroke-linecap="round" fill="none" stroke-dasharray="1 5" /><path d="M24 36 C32 28 40 20 52 14" stroke="${col}" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="52" cy="14" r="3.2" fill="${col}"/></svg>`;
}


export function canopySvg(colors: readonly [string, string]): string {
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const x0 = 6 + i * 6.86;
    cells += `<path d="M${x0.toFixed(2)} ${(30 - Math.sin((i / 7) * Math.PI) * 12 - 6).toFixed(1)} L${(x0 + 6.86).toFixed(2)} ${(30 - Math.sin(((i + 1) / 7) * Math.PI) * 12 - 6).toFixed(1)} L${(x0 + 6.86).toFixed(2)} ${(34 - Math.sin(((i + 1) / 7) * Math.PI) * 10).toFixed(1)} L${x0.toFixed(2)} ${(34 - Math.sin((i / 7) * Math.PI) * 10).toFixed(1)}Z" fill="${i % 2 ? colors[1] : colors[0]}"/>`;
  }
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#16202B"/>${cells}<path d="M8 33 L28 50 M52 33 L32 50 M30 26 L30 50" stroke="#F5F1E8" stroke-opacity="0.45" stroke-width="0.8"/><circle cx="30" cy="52" r="2.4" fill="#F5F1E8" fill-opacity="0.85"/></svg>`;
}

export function frameSvg(id: string): string {
  const k = Math.abs([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 5;
  const deco = [
    '<rect x="9" y="7" width="42" height="46" fill="none" stroke="#F5F1E8" stroke-width="1"/>',
    '<rect x="9" y="7" width="42" height="46" fill="none" stroke="#F2A541" stroke-width="2.4" stroke-dasharray="3 2"/>',
    '<rect x="9" y="7" width="42" height="46" fill="none" stroke="#F5F1E8" stroke-width="3.4"/><rect x="12" y="10" width="36" height="40" fill="none" stroke="#F5F1E8" stroke-opacity="0.4"/>',
    '<path d="M9 7h42v46H9z" fill="none" stroke="#F5F1E8" stroke-width="1"/><path d="M9 7l5 5M51 7l-5 5M9 53l5-5M51 53l-5-5" stroke="#F5F1E8"/>',
    '<rect x="9" y="7" width="42" height="46" fill="none" stroke="#2EC4C6" stroke-width="1.6"/><rect x="9" y="45" width="42" height="8" fill="#F5F1E8" fill-opacity="0.85"/>',
  ][k];
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#16202B"/><rect x="11" y="9" width="38" height="42" fill="#3E5F8A"/><path d="M11 40 L22 30 L30 36 L40 26 L49 34 V51 H11Z" fill="#6B4E5E"/>${deco}</svg>`;
}

function tintSvg(color: string, kind: string): string {
  if (kind === 'ghostTint') return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#16202B"/><path d="M19 46V28a11 11 0 0 1 22 0v18l-3.7-2.8-3.6 2.8-3.7-2.8-3.7 2.8-3.6-2.8z" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="1.6"/></svg>`;
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#16202B"/><circle cx="30" cy="30" r="14" fill="${color}" fill-opacity="0.25"/><circle cx="30" cy="30" r="6" fill="${color}"/></svg>`;
}

const FILTER_GRADIENT: Record<string, [string, string]> = {
  natural: ['#8FB7D9', '#E9D8B4'], golden: ['#F2A541', '#F6E1B0'], documentary: ['#6E7B6A', '#C9C1A8'],
  postcard: ['#2EC4C6', '#F2795C'], coldMorning: ['#9FD3F0', '#5B6E8C'], bw: ['#1A1A1A', '#E8E8E8'],
};

/** Preview for any meta cosmetic ref ("pattern:kilim", "canopy:lale", "cardFrame:film", …). */
export function cosmeticSwatch(ref: string, pal: readonly [string, string, string] = PALETTES.safak): string {
  const [kind, id] = ref.split(':');
  const def = cosmetic(ref as Parameters<typeof cosmetic>[0]);
  switch (kind) {
    case 'pattern':
      return patternSvg(id, pal);
    case 'palette':
      return paletteSvg(def && 'colors' in def && def.colors.length === 3 ? (def.colors as readonly [string, string, string]) : PALETTES[id] ?? PALETTES.safak);
    case 'trail':
      return trailSvg(def && 'colors' in def ? def.colors[0] : TRAILS[id] ?? '#F5F1E8');
    case 'canopy':
      return canopySvg(def && 'colors' in def && def.colors.length === 2 ? (def.colors as readonly [string, string]) : ['#F2A541', '#F6E7D0']);
    case 'cardFrame':
      return frameSvg(id);
    case 'photoFilter': {
      const [a, b] = FILTER_GRADIENT[id] ?? ['#8FB7D9', '#E9D8B4'];
      return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs><linearGradient id="pf${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="60" height="60" fill="url(#pf${id})"/></svg>`;
    }
    default: {
      const color = def && 'color' in def && def.color ? def.color : '#F2C14E';
      return tintSvg(color, kind);
    }
  }
}

export { PATTERN_IDS };
