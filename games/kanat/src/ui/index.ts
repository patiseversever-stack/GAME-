// Public surface of the UI module (integrator imports from here).
export { UI, UIController } from './UI.ts';
export type * from './types.ts';
export { FlightHud, type FtueKind, type HudConfig, type HudMode } from './hud/FlightHud.ts';
export { t, tk, setLang, getLang, onLangChange, upper, fmtInt, fmtDec, fmtTime, fmtDelta, possessive, ordinal, routeName, worldName, worldShort, type Lang, type StringKey } from './i18n.ts';
export { loadFonts } from './fonts.ts';
export { applyRootFlags, setSafeArea, COLORS, WORLD_ACCENT, PROX_COLORS, PROX_COLORS_CB, SURU_COLORS, FONTS, MOTION, type ProxTier, type SafeArea } from './theme.ts';
export { dailyShareText, careerShareText, suruShareText, renderShareCard, drawShareCard } from './share/index.ts';
export { worldArtSvg, worldArtDataUrl } from './art.ts';
export { icon, iconSvg } from './icons.ts';
