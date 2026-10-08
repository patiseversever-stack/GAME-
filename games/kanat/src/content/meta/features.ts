// Feature flags + clean cut list (F1 review P1 "cut list and dead content", P0 time-boxed route decision).
// One switchboard for optional modes and late worlds. Every consumer (UI menus, unlock cards, collection,
// badges, rank/level-up screens, daily/weekly pickers) asks THIS module what exists. A disabled feature is
// HIDDEN — never a "yakında" button, never an unreachable reward: items whose only source disappears are either
// re-mapped to an always-on source or hidden together with the mode that shows them. PURE data + helpers.

import type { WorldId } from '../../sim/types.ts';
import type { BadgeDef, CosmeticDef, FeatureId, UnlockSource } from './types.ts';
import { ALL_COSMETICS } from './cosmetics.ts';
import { BADGES } from './badges.ts';
import { ROUTE_META, WORLD_META } from './routes.meta.ts';
import { MODE_UNLOCKS, modesUnlockedAt } from './progression.ts';
import type { MetaMode } from './progression.ts';

export interface FeatureSet {
  freeFlight: boolean;
  photo: boolean;
  daily: boolean;
  duel: boolean;
  weekly: boolean;
  suru: boolean;
  /** ≤ 8 s highlight clip as video (captureStream + MediaRecorder); off → image card only. */
  highlightVideo: boolean;
  /** Duel codes for Haftanın Rotası (ghost code mode 3 + modifier + week). Needs weekly && duel. */
  weeklyDuel: boolean;
  /** Career worlds shipped, 1..5 (F1 time box: 2 = W1+W2 when the route tool is late, K-28). */
  worlds: number;
}

/** Ship configuration. The producer flips flags here (and only here) when something is cut. */
export const FEATURES: FeatureSet = {
  freeFlight: true,
  photo: true,
  daily: true,
  duel: true,
  weekly: true,
  suru: true,
  highlightVideo: true,
  weeklyDuel: true,
  worlds: 5,
};

/** Fallback stamps for the weekly-only trail (Kırlangıç) when Haftanın Rotası is cut. */
export const WEEKLY_TRAIL_FALLBACK_STAMPS = 14;

export function featureOn(id: FeatureId, f: FeatureSet = FEATURES): boolean {
  switch (id) {
    case 'weeklyDuel':
      return f.weeklyDuel && f.weekly && f.duel;
    case 'photo':
      return f.photo;
    default:
      return f[id];
  }
}

export function worldOn(world: WorldId, f: FeatureSet = FEATURES): boolean {
  const w = WORLD_META.find((m) => m.id === world);
  return w !== undefined && w.index <= f.worlds;
}

export function routeOn(routeId: string, f: FeatureSet = FEATURES): boolean {
  const r = ROUTE_META.find((m) => m.id === routeId);
  return r !== undefined && r.worldIndex <= f.worlds;
}

export function enabledWorlds(f: FeatureSet = FEATURES): WorldId[] {
  return WORLD_META.filter((w) => w.index <= f.worlds).map((w) => w.id);
}

const MODE_FEATURE: Readonly<Partial<Record<MetaMode, FeatureId>>> = {
  daily: 'daily',
  suru: 'suru',
  duel: 'duel',
  free: 'freeFlight',
  weekly: 'weekly',
};

export function modeOn(mode: MetaMode, f: FeatureSet = FEATURES): boolean {
  const feat = MODE_FEATURE[mode];
  return feat === undefined || featureOn(feat, f);
}

/** Enabled modes whose intro shows after landing route #n (ONE combined card for all of them). */
export function unlockCardModes(routesLanded: number, f: FeatureSet = FEATURES): MetaMode[] {
  return modesUnlockedAt(routesLanded).filter((m) => modeOn(m, f));
}

export function enabledModes(f: FeatureSet = FEATURES): MetaMode[] {
  return MODE_UNLOCKS.map((m) => m.mode).filter((m) => modeOn(m, f));
}

/**
 * The source a cosmetic has under this feature set, or null when the item is hidden (its showcase mode or its
 * world is not shipped). Rank items never depend on optional features (K-23), so every level keeps one reward.
 */
export function effectiveSource(def: CosmeticDef, f: FeatureSet = FEATURES): UnlockSource | null {
  // Items that only render inside a cut mode disappear with it (starters included).
  if (def.kind.startsWith('suru') && !featureOn('suru', f)) return null;
  if (def.kind === 'photoFilter' && !featureOn('photo', f)) return null;
  const s = def.source;
  switch (s.kind) {
    case 'start':
    case 'rank':
    case 'log':
      return s;
    case 'usta':
      return routeOn(s.routeId, f) ? s : null;
    case 'postcards':
      if (!worldOn(s.world, f)) return null;
      return featureOn('photo', f) ? s : { kind: 'worldComplete', world: s.world };
    case 'postcardCount': {
      // Photo filters live only inside Photo Mode; with fewer worlds the count is capped by what exists.
      if (!featureOn('photo', f)) return null;
      const cap = postcardsAvailable(f);
      return s.count <= cap ? s : { kind: 'postcardCount', count: cap };
    }
    case 'weekly':
      return featureOn('weekly', f) ? s : { kind: 'log', stamps: WEEKLY_TRAIL_FALLBACK_STAMPS };
    case 'suru':
      return featureOn('suru', f) ? s : null; // SÜRÜ cosmetics render only in SÜRÜ.io
    case 'worldComplete':
      return worldOn(s.world, f) ? s : null;
  }
}

export function visibleCosmetics(f: FeatureSet = FEATURES): CosmeticDef[] {
  return ALL_COSMETICS.filter((c) => effectiveSource(c, f) !== null);
}

export function badgeOn(def: BadgeDef, f: FeatureSet = FEATURES): boolean {
  if (def.requires && !def.requires.every((id) => featureOn(id, f))) return false;
  if (def.needsWorld !== undefined && def.needsWorld > f.worlds) return false;
  return true;
}

export function visibleBadges(f: FeatureSet = FEATURES): BadgeDef[] {
  return BADGES.filter((b) => badgeOn(b, f));
}

/** Postcards that exist under this feature set (Photo Mode on, world shipped). */
export function postcardsAvailable(f: FeatureSet = FEATURES): number {
  return featureOn('photo', f) ? 5 * Math.min(5, Math.max(0, f.worlds)) : 0;
}

/** True when an effective source can actually be satisfied under the feature set (meta.features test). */
export function sourceAttainable(s: UnlockSource, f: FeatureSet = FEATURES): boolean {
  switch (s.kind) {
    case 'start':
    case 'log':
      return true;
    case 'rank':
      return s.level >= 2 && s.level <= 50;
    case 'usta':
      return routeOn(s.routeId, f);
    case 'postcards':
      return featureOn('photo', f) && worldOn(s.world, f);
    case 'postcardCount':
      return featureOn('photo', f) && s.count <= postcardsAvailable(f);
    case 'weekly':
      return featureOn('weekly', f);
    case 'suru':
      return featureOn('suru', f) && (s.league === undefined || s.league <= 4);
    case 'worldComplete':
      return worldOn(s.world, f);
  }
}
