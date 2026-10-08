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
