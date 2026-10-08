// SÜRÜ.io AI data: personalities (§4.G.10 table), league scaling (Bronz → Elmas) and nature-word names.
// Data module (pure). Bots are labelled "YZ" everywhere (§2.6).

import { LEAGUES } from '../../../content/meta/progression.ts';

export type PersonalityId = 'toplayici' | 'avci' | 'urkek' | 'kusatici' | 'firsatci';

export interface Personality {
  id: PersonalityId;
  name: { tr: string; en: string };
  greed: number;
  aggr: number;
  courage: number;
  ring: number;
  opp: number;
  /** base reaction time (ms) before league scaling */
  reactionMs: number;
}

export const PERSONALITIES: Readonly<Record<PersonalityId, Personality>> = {
  toplayici: { id: 'toplayici', name: { tr: 'Toplayıcı', en: 'Gatherer' }, greed: 1.4, aggr: 0.4, courage: 0.5, ring: 0.3, opp: 0.2, reactionMs: 250 },
  avci: { id: 'avci', name: { tr: 'Avcı', en: 'Hunter' }, greed: 0.7, aggr: 1.5, courage: 0.9, ring: 0.6, opp: 0.4, reactionMs: 180 },
  urkek: { id: 'urkek', name: { tr: 'Ürkek', en: 'Timid' }, greed: 1.1, aggr: 0.2, courage: 0.2, ring: 0.1, opp: 0.3, reactionMs: 300 },
  kusatici: { id: 'kusatici', name: { tr: 'Kuşatıcı', en: 'Encircler' }, greed: 0.8, aggr: 0.9, courage: 0.7, ring: 1.6, opp: 0.3, reactionMs: 200 },
  firsatci: { id: 'firsatci', name: { tr: 'Fırsatçı', en: 'Opportunist' }, greed: 0.9, aggr: 0.6, courage: 0.6, ring: 0.6, opp: 1.6, reactionMs: 220 },
};

export const PERSONALITY_IDS: readonly PersonalityId[] = ['toplayici', 'avci', 'urkek', 'kusatici', 'firsatci'];

/** 0 Bronz · 1 Gümüş · 2 Altın · 3 Platin · 4 Elmas */
export type League = 0 | 1 | 2 | 3 | 4;

export const LEAGUE_NAMES: readonly { tr: string; en: string }[] = [
  { tr: 'Bronz', en: 'Bronze' },
  { tr: 'Gümüş', en: 'Silver' },
  { tr: 'Altın', en: 'Gold' },
  { tr: 'Platin', en: 'Platinum' },
  { tr: 'Elmas', en: 'Diamond' },
];

export interface LeagueScale {
  reactionAddMs: number;
  noiseDeg: number;
  ringMul: number;
  /** decision interval in ticks (30 Hz): 7 ≈ 4.3 Hz … 3 = 10 Hz */
  decisionTicks: number;
  /** probability per decision of a sloppy choice (wanders / wrong target) */
  mistake: number;
  /** breath management: release Tight at this breath level (higher = keeps a reserve) */
  breathReserve: number;
  /** probability to answer a hawk warning with Sıkı Dizi */
  hawkResponse: number;
  /** overall decision quality: multiplies greed/aggr/ring/opp utilities (Bronz bots are clumsy, Elmas sharp) */
  skill: number;
  /** probability to answer enemy contact with Sıkı Dizi (§4.G "Sıkı: temasta ve Nefes > 25") */
  defend: number;
}

/**
 * Per-league AI scaling. Reaction offset, decision interval, steering noise and ring multiplier come from the
 * single source `LEAGUES[]` (src/content/meta/progression.ts, ruling S-13); the SÜRÜ-only extras (mistake rate,
 * breath reserve, hawk response, utility skill) live here.
 */
const LEAGUE_EXTRAS: readonly Pick<LeagueScale, 'mistake' | 'breathReserve' | 'hawkResponse' | 'skill' | 'defend'>[] = [
  { mistake: 0.35, breathReserve: 0, hawkResponse: 0.2, skill: 0.55, defend: 0.12 },
  { mistake: 0.2, breathReserve: 8, hawkResponse: 0.45, skill: 0.7, defend: 0.35 },
  { mistake: 0.1, breathReserve: 15, hawkResponse: 0.65, skill: 0.85, defend: 0.6 },
  { mistake: 0.05, breathReserve: 22, hawkResponse: 0.8, skill: 0.95, defend: 0.8 },
  { mistake: 0.0, breathReserve: 28, hawkResponse: 0.95, skill: 1.0, defend: 0.95 },
];

export const LEAGUE_SCALE: readonly LeagueScale[] = LEAGUE_EXTRAS.map((x, k) => {
  const L = LEAGUES[Math.min(k, LEAGUES.length - 1)];
  return { reactionAddMs: L.aiReactionOffsetMs, noiseDeg: L.aiNoiseDeg, ringMul: L.aiRingMul, decisionTicks: L.aiDecisionEveryTicks, ...x };
});

/** Bot flock names from nature words — never real people (§2.6). */
export const BOT_NAMES: readonly { tr: string; en: string }[] = [
  { tr: 'Lodos Sürüsü', en: 'Lodos Flock' },
  { tr: 'Mehtap', en: 'Moonpath' },
  { tr: 'Kızıl Kanat', en: 'Crimson Wing' },
  { tr: 'Poyraz', en: 'Poyraz' },
  { tr: 'Karayel', en: 'Northwester' },
  { tr: 'Yakamoz', en: 'Sea Glow' },
  { tr: 'Sazlık Gölgesi', en: 'Reed Shadow' },
  { tr: 'Tuz Rüzgârı', en: 'Salt Wind' },
  { tr: 'Kıyı Fısıltısı', en: 'Shore Whisper' },
  { tr: 'Bulut Kanadı', en: 'Cloud Wing' },
  { tr: 'Kuzey Esintisi', en: 'North Breeze' },
  { tr: 'Mor Akşam', en: 'Violet Dusk' },
  { tr: 'Kehribar', en: 'Amber' },
  { tr: 'Sis Perdesi', en: 'Mist Veil' },
  { tr: 'Dalga Sesi', en: 'Wave Song' },
  { tr: 'Ufuk Çizgisi', en: 'Horizon Line' },
  { tr: 'Akşam Yıldızı', en: 'Evening Star' },
  { tr: 'Gümüş Dalga', en: 'Silver Wave' },
  { tr: 'Rüzgâr Gülü', en: 'Wind Rose' },
  { tr: 'Kaya Kırlangıcı', en: 'Crag Swallow' },
  { tr: 'Fener Işığı', en: 'Beacon Light' },
  { tr: 'Saz Rüzgârı', en: 'Reed Wind' },
  { tr: 'Gece Mavisi', en: 'Night Blue' },
  { tr: 'Kızılağaç', en: 'Alder' },
  { tr: 'Ay Hâlesi', en: 'Moon Halo' },
  { tr: 'Mercan Kıyısı', en: 'Coral Shore' },
  { tr: 'Gün Işığı', en: 'Daybreak' },
  { tr: 'Yosun Taşı', en: 'Moss Stone' },
];
