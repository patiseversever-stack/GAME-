// KANAT design tokens ("altimeter & map" aesthetic, BRIEF §3.5, §3.8).
// Shared by the flight UI and SÜRÜ.io's in-game HUD (src/modes/suru/**): import tokens from here and the
// matching CSS custom properties / primitives from './styles.css'. Values here and in styles.css are kept in sync.
import type { WorldId } from '../sim/types.ts';

/** Base palette. Text is warm paper white, panels are dark translucent slate. No neon. */
export const COLORS = {
  text: '#F5F1E8',
  textDim: 'rgba(245,241,232,0.68)',
  textFaint: 'rgba(245,241,232,0.42)',
  hairline: '#FFFFFF22',
  hairlineStrong: '#FFFFFF44',
  panel: 'rgba(14,20,28,0.55)',
  panelStrong: 'rgba(14,20,28,0.78)',
  panelSolid: '#0E141C',
  ink: '#0E141C',
  scrim: 'rgba(6,9,13,0.55)',
  positive: '#4CC38A',
  negative: '#E5484D',
  gold: '#F2C744',
  star: '#F2C14E',
} as const;

/** World accent colours (§3.5). */
export const WORLD_ACCENT: Readonly<Record<WorldId, string>> = {
  kapadokya: '#F2A541',
  likya: '#2EC4C6',
  karadeniz: '#8DB580',
  erciyes: '#9FD3F0',
  pamukkale: '#F2795C',
};

/** Painted fallback art per world (sky top → horizon, ridge near/far), from the §3.2 palettes. */
export const WORLD_ART: Readonly<Record<WorldId, { skyTop: string; skyMid: string; horizon: string; far: string; near: string; sun: string; mist: string }>> = {
  kapadokya: { skyTop: '#3E5F8A', skyMid: '#B88A86', horizon: '#F6C48E', far: '#D49A8A', near: '#6B4E5E', sun: '#FFE2B0', mist: '#F4D9A6' },
  likya: { skyTop: '#5FA9DE', skyMid: '#8EC9F0', horizon: '#E8F4FB', far: '#CFC6B4', near: '#3F5B3A', sun: '#FFF6E0', mist: '#2BB3B1' },
  karadeniz: { skyTop: '#6F8590', skyMid: '#A9B6BC', horizon: '#DDE3E0', far: '#6E8B3D', near: '#1F3B2C', sun: '#F4F1E6', mist: '#DDE3E0' },
  erciyes: { skyTop: '#1F4E8C', skyMid: '#6E98C6', horizon: '#CFE3F5', far: '#A9C2E0', near: '#4A4642', sun: '#FFF6EC', mist: '#FFF6EC' },
  pamukkale: { skyTop: '#2B2D5B', skyMid: '#E86A4A', horizon: '#FFC27A', far: '#F3C9A8', near: '#9AA7C7', sun: '#FFE0A8', mist: '#49C6C9' },
};

/** Approximate geo centres, used only as map-style captions (world.json is authoritative when passed in). */
export const WORLD_GEO: Readonly<Record<WorldId, { lat: number; lon: number }>> = {
  kapadokya: { lat: 38.64, lon: 34.83 },
  likya: { lat: 36.55, lon: 29.12 },
  karadeniz: { lat: 40.62, lon: 40.29 },
  erciyes: { lat: 38.53, lon: 35.45 },
  pamukkale: { lat: 37.92, lon: 29.12 },
};

export type ProxTier = 0 | 1 | 2 | 3 | 5;

/** Proximity multiplier colours (§3.5). Index by tier. */
export const PROX_COLORS: Readonly<Record<ProxTier, string>> = { 0: '#FFFFFF33', 1: '#4CC38A', 2: '#F2C744', 3: '#F28C28', 5: '#E5484D' };
/** Colour-blind (Okabe-Ito) variants; in this mode slice thickness also grows with tier and "×N" text is always shown. */
export const PROX_COLORS_CB: Readonly<Record<ProxTier, string>> = { 0: '#FFFFFF33', 1: '#56B4E9', 2: '#F0E442', 3: '#E69F00', 5: '#D55E00' };
/** Arc stroke width per tier in colour-blind mode (px at 1× HUD scale). */
export const PROX_CB_WIDTH: Readonly<Record<ProxTier, number>> = { 0: 3, 1: 4, 2: 6, 3: 8, 5: 10 };

export function proxColor(tier: ProxTier, colorBlind: boolean): string {
  return (colorBlind ? PROX_COLORS_CB : PROX_COLORS)[tier];
}

/** SÜRÜ.io owner colours (§3.8): player always gold; rivals colour-blind safe + aura pattern + leader mark. */
export const SURU_COLORS = {
  player: '#FFC23D',
  rivals: ['#56B4E9', '#E69F00', '#009E73', '#0072B2', '#D55E00', '#CC79A7', '#F2F2F2'] as readonly string[],
  auraPatterns: ['solid', 'dashed', 'dotted'] as readonly ('solid' | 'dashed' | 'dotted')[],
  leaderMarks: ['circle', 'triangle', 'square', 'diamond'] as readonly ('circle' | 'triangle' | 'square' | 'diamond')[],
  sky: ['#1C2340', '#6B3F69', '#E0735A', '#FFC48A'] as readonly string[],
  sea: '#2A3550',
  sunGlint: '#FFD7A0',
  ringEdge: '#FFB36B',
  night: '#1B2440',
  lighthouse: '#FFE2A6',
} as const;

/** League badge colours (Bronz → Elmas). */
export const LEAGUE_COLORS = ['#C08457', '#C9CED6', '#E9C46A', '#8FD3D1', '#B9E6FF'] as const;

export const FONTS = {
  display: "'Barlow Condensed', 'Kanat Fallback Condensed', sans-serif",
  body: "'Inter', 'Kanat Fallback', sans-serif",
  serif: "'Playfair Display', 'Kanat Fallback Serif', serif",
} as const;

/** UI motion: 180–260 ms ease-out (§3.5). Reduce-motion collapses to opacity-only 120 ms. */
export const MOTION = {
  fast: 180,
  base: 220,
  slow: 260,
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  countUpMs: 900,
  starStampGapMs: 420,
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const RADIUS = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
/** Minimum touch target (pt == CSS px in WebView). */
export const TOUCH_MIN = 44;
export const HUD_OPACITY = 0.85;
export const PARACHUTE_BUTTON = 88;

export interface SafeArea { top: number; right: number; bottom: number; left: number }

export interface RootFlags {
  leftHanded?: boolean;
  bigHud?: boolean;
  colorBlind?: boolean;
  reduceMotion?: boolean;
  lang?: 'tr' | 'en';
  /** "Büyük yazı ve göstergeler": 1.0 / 1.2 / 1.4 (GDD §3.4). */
  textScale?: number;
}

/** Root class names toggled by settings. Any subtree under an element carrying these reacts in CSS. */
export const ROOT_CLASS = {
  root: 'kn-ui',
  left: 'kn-left',
  big: 'kn-big',
  cb: 'kn-cb',
  rm: 'kn-rm',
  ts2: 'kn-ts-2',
  ts3: 'kn-ts-3',
} as const;

/** Applies settings-driven flags to a root element (default: <html>). */
export function applyRootFlags(flags: RootFlags, el: HTMLElement = document.documentElement): void {
  if (flags.leftHanded !== undefined) el.classList.toggle(ROOT_CLASS.left, flags.leftHanded);
  if (flags.bigHud !== undefined) el.classList.toggle(ROOT_CLASS.big, flags.bigHud);
  if (flags.colorBlind !== undefined) el.classList.toggle(ROOT_CLASS.cb, flags.colorBlind);
  if (flags.reduceMotion !== undefined) el.classList.toggle(ROOT_CLASS.rm, flags.reduceMotion);
  if (flags.lang) el.setAttribute('lang', flags.lang);
  if (flags.textScale !== undefined) {
    const ts = flags.textScale >= 1.3 ? 1.4 : flags.textScale >= 1.1 ? 1.2 : 1;
    el.classList.toggle(ROOT_CLASS.ts2, ts === 1.2);
    el.classList.toggle(ROOT_CLASS.ts3, ts === 1.4);
    el.style.setProperty('--kn-text-scale', String(ts));
  }
}

/**
 * Host-provided safe area (bridge `setSafeArea`). CSS uses max(env(safe-area-inset-*), host value),
 * exposed as --kn-safe-top/right/bottom/left.
 */
export function setSafeArea(insets: Partial<SafeArea>, el: HTMLElement = document.documentElement): void {
  const keys: (keyof SafeArea)[] = ['top', 'right', 'bottom', 'left'];
  for (const k of keys) {
    const v = insets[k];
    if (typeof v === 'number' && Number.isFinite(v)) el.style.setProperty(`--kn-host-safe-${k}`, `${Math.max(0, v)}px`);
  }
}
