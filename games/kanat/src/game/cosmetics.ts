// Cosmetic id plumbing (integrator): meta cosmetic ids (src/content/meta/cosmetics.ts, `pattern:kilim` refs) →
// render suit spec (src/render/pilot pattern index + explicit palette colours) and VFX trail styles.
import { PALETTES, SUIT_PATTERNS, TRAILS } from '../content/meta/cosmetics.ts';
import { SUIT_PATTERN_NAMES } from '../render/pilot/suitPatterns.ts';
import type { SuitSpec } from '../render/pilot/Pilot.ts';
import type { TrailStyle } from '../render/vfx/trails.ts';

export interface EquippedSuit {
  /** Pattern id ('' = plain starter suit). */
  pattern: string;
  palette: string;
  trail: string;
}

/** Design patterns that have no 1:1 shader pattern use the closest look. */
const PATTERN_ALIAS: Readonly<Record<string, string>> = {
  kontur: 'topografya',
  yakamoz: 'benek',
  mehtap: 'yarisSeridi',
  kizilUfuk: 'gunes',
  sirt: 'simsek',
  safak: 'gunes',
  traverten: 'dalga',
  ladin: 'chevron',
  guvercin: 'tuy',
};

const TRAIL_ALIAS: Readonly<Record<string, TrailStyle>> = {
  dumanBeyazi: 'dumanBeyazi',
  altinToz: 'altinToz',
  ebruAkisi: 'ebruAkisi',
  buzKristali: 'buzKristali',
  kirlangic: 'kirlangic',
  laleYapragi: 'lale',
  turkuazKopuk: 'turkuazSerit',
  sisTulu: 'dumanBeyazi',
  brulorIsigi: 'gunBatimi',
  maviSaat: 'geceMavisi',
};

export function patternIndex(id: string): number {
  if (!id) return SUIT_PATTERN_NAMES.indexOf('ikiRenk');
  const name = (SUIT_PATTERN_NAMES as readonly string[]).includes(id) ? id : PATTERN_ALIAS[id] ?? 'ikiRenk';
  const i = (SUIT_PATTERN_NAMES as readonly string[]).indexOf(name);
  return i < 0 ? 0 : i;
}

export function paletteColors(id: string): [string, string, string] {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
  return [p.colors[0], p.colors[1], p.colors[2]];
}

export function suitSpec(s: EquippedSuit): SuitSpec {
  return { pattern: s.pattern ? s.pattern : null, palette: s.palette || 'safak' };
}

export function trailStyle(id: string): TrailStyle {
  return TRAIL_ALIAS[id] ?? 'dumanBeyazi';
}

/** Small integer for the ghost header's suitId (pattern index · 16 + palette index). */
export function suitId(s: EquippedSuit): number {
  const pal = Math.max(0, PALETTES.findIndex((x) => x.id === s.palette));
  return patternIndex(s.pattern) * 16 + pal;
}

export function suitFromId(id: number): EquippedSuit {
  const pal = PALETTES[id % 16]?.id ?? 'safak';
  const pi = Math.floor(id / 16) % SUIT_PATTERN_NAMES.length;
  const name = SUIT_PATTERN_NAMES[pi];
  const pat = SUIT_PATTERNS.find((p) => p.id === name)?.id ?? name;
  return { pattern: pat, palette: pal, trail: 'dumanBeyazi' };
}

export const ALL_TRAIL_IDS: readonly string[] = TRAILS.map((t) => t.id);
