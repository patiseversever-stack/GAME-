// Settings schema shared by UI (settings screen) and core (persistence). Owner: platform agent.
// Common-core part (identical in all 3 games): graphics, fps, volumes, haptics, language, reduceMotion, leftHanded.
// Game-specific part: the `kanat` block.

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';
export type QualitySetting = 'auto' | QualityTier;
export type Lang = 'tr' | 'en';

export interface Settings {
  v: 1;
  // ---- common core (§5.2, §11) ----
  quality: QualitySetting;
  fps: 60 | 30;
  ultra120: boolean;
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  haptics: 'on' | 'low' | 'off';
  lang: Lang;
  reduceMotion: boolean; // kills screen shake + slow-mo
  leftHanded: boolean;
  // ---- KANAT specific (§2.11) ----
  kanat: {
    controlDir: 'natural' | 'pilot';
    sensitivity: number; // 0.6..1.5
    expo: number; // 0..0.7 (additional user expo)
    gyro: 'off' | 'roll' | 'full';
    cameraDistance: 'near' | 'normal' | 'far';
    helmetCam: boolean;
    comfortCamera: boolean;
    bigHud: boolean;
    colorBlind: boolean;
    flightAssist: 'full' | 'low' | 'off';
    autoParachute: boolean;
    slowMode: boolean;
    twoThumbs: boolean;
    guideWindDone: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  v: 1,
  quality: 'auto',
  fps: 60,
  ultra120: false,
  masterVolume: 0.9,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  muted: false,
  haptics: 'on',
  lang: 'tr',
  reduceMotion: false,
  leftHanded: false,
  kanat: {
    controlDir: 'natural',
    sensitivity: 1.0,
    expo: 0.0,
    gyro: 'off',
    cameraDistance: 'normal',
    helmetCam: false,
    comfortCamera: false,
    bigHud: false,
    colorBlind: false,
    flightAssist: 'full',
    autoParachute: false,
    slowMode: false,
    twoThumbs: false,
    guideWindDone: false,
  },
};

// ---------------------------------------------------------------------------------------------
// Validation / merge (platform). Unknown keys are dropped, wrong types fall back to defaults,
// numbers are clamped to their ranges. Never throws.

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'medium', 'high', 'ultra'];
export const QUALITY_SETTINGS: readonly QualitySetting[] = ['auto', 'ultra', 'high', 'medium', 'low'];
export const LANGS: readonly Lang[] = ['tr', 'en'];

export const SETTINGS_RANGES = {
  masterVolume: [0, 1],
  musicVolume: [0, 1],
  sfxVolume: [0, 1],
  sensitivity: [0.6, 1.5],
  expo: [0, 0.7],
} as const;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickEnum<T extends string | number>(v: unknown, allowed: readonly T[], def: T): T {
  return allowed.includes(v as T) ? (v as T) : def;
}

function pickBool(v: unknown, def: boolean): boolean {
  return typeof v === 'boolean' ? v : def;
}

function pickNum(v: unknown, range: readonly [number, number], def: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return def;
  return Math.min(range[1], Math.max(range[0], v));
}

/** Sanitize anything (parsed JSON, host payload) into a valid Settings object. */
export function validateSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const r = isObj(raw) ? raw : {};
  const k = isObj(r.kanat) ? r.kanat : {};
  const dk = d.kanat;
  return {
    v: 1,
    quality: pickEnum(r.quality, QUALITY_SETTINGS, d.quality),
    fps: pickEnum(r.fps, [60, 30] as const, d.fps),
    ultra120: pickBool(r.ultra120, d.ultra120),
    masterVolume: pickNum(r.masterVolume, SETTINGS_RANGES.masterVolume, d.masterVolume),
    musicVolume: pickNum(r.musicVolume, SETTINGS_RANGES.musicVolume, d.musicVolume),
    sfxVolume: pickNum(r.sfxVolume, SETTINGS_RANGES.sfxVolume, d.sfxVolume),
    muted: pickBool(r.muted, d.muted),
    haptics: pickEnum(r.haptics, ['on', 'low', 'off'] as const, d.haptics),
    lang: pickEnum(r.lang, LANGS, d.lang),
    reduceMotion: pickBool(r.reduceMotion, d.reduceMotion),
    leftHanded: pickBool(r.leftHanded, d.leftHanded),
    kanat: {
      controlDir: pickEnum(k.controlDir, ['natural', 'pilot'] as const, dk.controlDir),
      sensitivity: pickNum(k.sensitivity, SETTINGS_RANGES.sensitivity, dk.sensitivity),
      expo: pickNum(k.expo, SETTINGS_RANGES.expo, dk.expo),
      gyro: pickEnum(k.gyro, ['off', 'roll', 'full'] as const, dk.gyro),
      cameraDistance: pickEnum(k.cameraDistance, ['near', 'normal', 'far'] as const, dk.cameraDistance),
      helmetCam: pickBool(k.helmetCam, dk.helmetCam),
      comfortCamera: pickBool(k.comfortCamera, dk.comfortCamera),
      bigHud: pickBool(k.bigHud, dk.bigHud),
      colorBlind: pickBool(k.colorBlind, dk.colorBlind),
      flightAssist: pickEnum(k.flightAssist, ['full', 'low', 'off'] as const, dk.flightAssist),
      autoParachute: pickBool(k.autoParachute, dk.autoParachute),
      slowMode: pickBool(k.slowMode, dk.slowMode),
      twoThumbs: pickBool(k.twoThumbs, dk.twoThumbs),
      guideWindDone: pickBool(k.guideWindDone, dk.guideWindDone),
    },
  };
}

/** Deep-merge a partial patch over `base`, then validate. */
export function mergeSettings(base: Settings, patch: DeepPartial<Settings> | Record<string, unknown>): Settings {
  const p = isObj(patch) ? patch : {};
  const kanatPatch = isObj(p.kanat) ? p.kanat : {};
  return validateSettings({ ...base, ...p, kanat: { ...base.kanat, ...kanatPatch } });
}

/** Dotted keys whose value differs (`'lang'`, `'kanat.gyro'`). */
export function diffSettings(a: Settings, b: Settings): string[] {
  const out: string[] = [];
  for (const key of Object.keys(a) as (keyof Settings)[]) {
    if (key === 'kanat') continue;
    if (a[key] !== b[key]) out.push(key);
  }
  for (const key of Object.keys(a.kanat) as (keyof Settings['kanat'])[]) {
    if (a.kanat[key] !== b.kanat[key]) out.push(`kanat.${key}`);
  }
  return out;
}
