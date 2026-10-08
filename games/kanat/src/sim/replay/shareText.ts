// Share-card text (owner: replay; sim-side, PURE). BRIEF §2.8 (exact formats), §2.5 Mod 2/3, §2.6.
//
//   Günün Rotası: KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐[ 🛟][ 🐢]
//                 [Düello: KNT1-G214-…]
//   Kariyer:      KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥[ 🛟][ 🐢]
//   SÜRÜ.io:      KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta
//
// Numbers are formatted by hand (TR 48.210 / EN 48,210) so output never depends on the host's Intl data.

import type { WorldId } from '../types.ts';
import type { GhostHeader } from './ghostCode.ts';
import { careerRouteIdFromNumber, toDisplayCode } from './ghostCode.ts';
import { stripEmoji } from './proximityStrip.ts';

export type ShareLang = 'tr' | 'en';

const MINUS = '−';
const SEP = ' · ';

const WORLD_SHORT: Record<WorldId, { tr: string; en: string }> = {
  kapadokya: { tr: 'Kapadokya', en: 'Cappadocia' },
  likya: { tr: 'Likya', en: 'Lycia' },
  karadeniz: { tr: 'Karadeniz', en: 'Black Sea' },
  erciyes: { tr: 'Erciyes', en: 'Erciyes' },
  pamukkale: { tr: 'Pamukkale', en: 'Pamukkale' },
};
const WORLD_BY_NUMBER: readonly WorldId[] = ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale'];

const T = {
  tr: {
    daily: 'Günün Rotası',
    prox: 'Yakınlık',
    duel: 'Düello',
    free: 'Serbest Uçuş',
    ghost: 'hayaleti',
    ghostAnon: 'Hayalet',
    suruDay: 'Sürü Günü',
    suruLeague: 'Lig Maçı',
    suruPractice: 'Antrenman',
    peak: (n: string) => `Zirve ${n} kuş`,
    encircle: (n: string) => `Kuşatma ×${n}`,
    survived: 'Gün batımına kadar ayakta',
    won: 'Kazandın',
    lost: 'Kaybettin',
    tie: 'Berabere',
    sec: 'sn',
    pts: 'puan',
  },
  en: {
    daily: 'Daily Route',
    prox: 'Proximity',
    duel: 'Duel',
    free: 'Free Flight',
    ghost: 'ghost',
    ghostAnon: 'Ghost',
    suruDay: 'Flock Day',
    suruLeague: 'League Match',
    suruPractice: 'Practice',
    peak: (n: string) => `Peak ${n} birds`,
    encircle: (n: string) => `Encircle ×${n}`,
    survived: 'Survived to sunset',
    won: 'You won',
    lost: 'You lost',
    tie: 'Tie',
    sec: 's',
    pts: 'pts',
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Number / time formatting
// ---------------------------------------------------------------------------------------------

/** Integer with thousands grouping: TR 48.210 · EN 48,210 (rounded to nearest; U+2212 minus). */
export function formatInt(n: number, lang: ShareLang): string {
  const r = Math.round(n);
  const digits = String(Math.abs(r));
  const sep = lang === 'tr' ? '.' : ',';
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += sep;
    out += digits[i];
  }
  return r < 0 ? MINUS + out : out;
}

/** Decimal with a fixed number of digits: TR 0,8 · EN 0.8 (rounded half up on the integer scale). */
export function formatDecimal(value: number, digits: number, lang: ShareLang): string {
  const scale = digits === 0 ? 1 : digits === 1 ? 10 : digits === 2 ? 100 : 1000;
  const scaled = Math.round(Math.abs(value) * scale);
  const whole = Math.floor(scaled / scale);
  let frac = String(scaled - whole * scale);
  while (frac.length < digits) frac = '0' + frac;
  const body = digits === 0 ? formatInt(whole, lang) : `${formatInt(whole, lang)}${lang === 'tr' ? ',' : '.'}${frac}`;
  return value < 0 && scaled !== 0 ? MINUS + body : body;
}

/** Race time m:ss.t, truncated to tenths (racing convention): 127_459 ms → "2:07.4". Same in TR/EN. */
export function formatRaceTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths - m * 600) / 10);
  const t = tenths - m * 600 - s * 10;
  return `${m}:${s < 10 ? '0' : ''}${s}.${t}`;
}

/** Gate split vs a ghost, 2 decimals with explicit sign: "−0,42" / "+1,05" / "±0,00". */
export function formatSplit(deltaMs: number, lang: ShareLang): string {
  const body = formatDecimal(Math.abs(deltaMs) / 1000, 2, lang);
  if (Math.round(Math.abs(deltaMs) / 10) === 0) return `±${body}`;
  return (deltaMs < 0 ? MINUS : '+') + body;
}

export function starsText(stars: number): string {
  const n = Math.max(0, Math.min(3, Math.floor(stars)));
  let s = '';
  for (let i = 0; i < n; i++) s += '⭐';
  return s;
}

function suffix(assist: boolean | undefined, slowMode: boolean | undefined): string {
  return (assist ? ' 🛟' : '') + (slowMode ? ' 🐢' : '');
}

export function worldShortName(world: WorldId, lang: ShareLang): string {
  return WORLD_SHORT[world][lang];
}

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------

export interface DailyShareParams {
  lang: ShareLang;
  /** Günün Rotası #N. */
  index: number;
  /** Result time, penalties included. */
  timeMs: number;
  /** 5 proximity tiers (ProximityStrip.tiers). */
  strip: readonly number[];
  stars: number;
  /** Any assist (Flight Assist, auto parachute, guide wind) → 🛟. */
  assist?: boolean;
  /** Yavaş Mod → 🐢. */
  slowMode?: boolean;
  /** Ghost code (canonical K1. or display form) for the optional "Düello:" second line. */
  code?: string;
}

export function dailyShareText(p: DailyShareParams): string {
  const t = T[p.lang];
  const stars = starsText(p.stars);
  let line = `KANAT${SEP}${t.daily} #${p.index} 🪂 ${formatRaceTime(p.timeMs)}${SEP}${t.prox} ${stripEmoji(p.strip)}`;
  if (stars) line += SEP + stars;
  line += suffix(p.assist, p.slowMode);
  return p.code ? `${line}\n${duelLine(p.code, p.lang)}` : line;
}

export interface CareerShareParams {
  lang: ShareLang;
  world: WorldId;
  /** RouteDef.name. */
  routeName: { tr: string; en: string };
  stars: number;
  score: number;
  strip: readonly number[];
  assist?: boolean;
  slowMode?: boolean;
  code?: string;
}

export function careerShareText(p: CareerShareParams): string {
  const t = T[p.lang];
  const stars = starsText(p.stars);
  let line = `KANAT${SEP}${worldShortName(p.world, p.lang)} / ${p.routeName[p.lang]}`;
  if (stars) line += ' ' + stars;
  line += `${SEP}${formatInt(p.score, p.lang)}${SEP}${t.prox} ${stripEmoji(p.strip)}`;
  line += suffix(p.assist, p.slowMode);
  return p.code ? `${line}\n${duelLine(p.code, p.lang)}` : line;
}

export type SuruShareKind = 'day' | 'league' | 'practice';

export interface SuruShareParams {
  lang: ShareLang;
  kind: SuruShareKind;
  /** Sürü Günü #N (kind 'day'). */
  dayIndex?: number;
  /** Final place, 1-based. */
  rank: number;
  /** Flocks in the round. */
  total: number;
  /** Peak flock size (birds). */
  peak: number;
  /** KUŞATMA count (shown only when > 0). */
  encircles: number;
  /** Still flying at sunset (shown only when true). */
  survived: boolean;
}

export function ordinalText(n: number, lang: ShareLang): string {
  if (lang === 'tr') return `${n}.`;
  const m100 = n % 100;
  const m10 = n % 10;
  const suf = m100 >= 11 && m100 <= 13 ? 'th' : m10 === 1 ? 'st' : m10 === 2 ? 'nd' : m10 === 3 ? 'rd' : 'th';
  return `${n}${suf}`;
}

export function suruShareText(p: SuruShareParams): string {
  const t = T[p.lang];
  const mode = p.kind === 'day' ? `${t.suruDay} #${p.dayIndex ?? 0}` : p.kind === 'league' ? t.suruLeague : t.suruPractice;
  let line = `KANAT${SEP}SÜRÜ.io${SEP}${mode} 🐦 ${ordinalText(p.rank, p.lang)}/${p.total}${SEP}${t.peak(formatInt(p.peak, p.lang))}`;
  if (p.encircles > 0) line += `${SEP}🌀 ${t.encircle(formatInt(p.encircles, p.lang))}`;
  if (p.survived) line += `${SEP}🌅 ${t.survived}`;
  return line;
}

/** "Düello: KNT1-G214-…" — always the readable display form of the code. */
export function duelLine(code: string, lang: ShareLang): string {
  return `${T[lang].duel}: ${toDisplayCode(code)}`;
}

// ---------------------------------------------------------------------------------------------
// Ghost card + duel result
// ---------------------------------------------------------------------------------------------

const TR_VOWEL_HARMONY: Record<string, string> = {
  a: 'ı', â: 'ı', ı: 'ı', e: 'i', i: 'i', î: 'i', o: 'u', u: 'u', û: 'u', ö: 'ü', ü: 'ü',
};

function trLower(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

/** "Ayşe’nin" / "Mehmet’in" / "Can’ın" / "Umut’un" / "Öykü’nün" · EN "Ayşe’s" / "James’". */
export function possessiveName(name: string, lang: ShareLang): string {
  const n = name.trim();
  if (!n) return n;
  if (lang === 'en') return /s$/i.test(n) ? `${n}’` : `${n}’s`;
  const lower = trLower(n);
  let lastVowel = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (lower[i] in TR_VOWEL_HARMONY) {
      lastVowel = lower[i];
      break;
    }
  }
  const endsWithVowel = lower[lower.length - 1] in TR_VOWEL_HARMONY;
  const v = lastVowel ? TR_VOWEL_HARMONY[lastVowel] : 'i';
  return `${n}’${endsWithVowel ? 'n' : ''}${v}n`;
}

/** "Ayşe’nin hayaleti" / "Ayşe’s ghost" / "Hayalet" when anonymous. */
export function ghostName(playerName: string, lang: ShareLang): string {
  const t = T[lang];
  const n = playerName.trim();
  if (!n) return t.ghostAnon;
  return `${possessiveName(n, lang)} ${t.ghost}`;
}

export interface GhostTitleParams {
  lang: ShareLang;
  header: Pick<GhostHeader, 'mode' | 'routeRef' | 'playerName' | 'finalTimeMs' | 'score'>;
  /** Route display name for Kariyer codes (RouteDef.name); falls back to the route id. */
  routeName?: { tr: string; en: string };
}

/**
 * Duel card title: "Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4". The metric is the mode's metric:
 * Günün Rotası → time, Kariyer → score, Serbest → time.
 */
export function ghostTitle(p: GhostTitleParams): string {
  const t = T[p.lang];
  const h = p.header;
  const who = ghostName(h.playerName, p.lang);
  if (h.mode === 1) return `${who}${SEP}${t.daily} #${h.routeRef}${SEP}${formatRaceTime(h.finalTimeMs)}`;
  if (h.mode === 0) {
    const id = careerRouteIdFromNumber(h.routeRef);
    const world = id !== null ? WORLD_BY_NUMBER[Number(id[1]) - 1] : null;
    const route = p.routeName ? p.routeName[p.lang] : (id ?? `#${h.routeRef}`);
    const where = world !== null ? `${worldShortName(world, p.lang)} / ${route}` : route;
    return `${who}${SEP}${where}${SEP}${formatInt(h.score, p.lang)}`;
  }
  const world = WORLD_BY_NUMBER[h.routeRef];
  const where = world !== undefined ? `${t.free} / ${worldShortName(world, p.lang)}` : t.free;
  return `${who}${SEP}${where}${SEP}${formatRaceTime(h.finalTimeMs)}`;
}

export interface DuelResultParams {
  lang: ShareLang;
  /** Günün Rotası → 'time' (lower wins), Kariyer → 'score' (higher wins). */
  metric: 'time' | 'score';
  mine: number;
  theirs: number;
}

/** "Kazandın · 0,8 sn" / "Kaybettin · 1.240 puan" / "Berabere". Times in ms. */
export function duelResultText(p: DuelResultParams): string {
  const t = T[p.lang];
  const diff = p.metric === 'time' ? p.theirs - p.mine : p.mine - p.theirs;
  if (p.metric === 'time') {
    const abs = Math.abs(diff);
    if (Math.round(abs / 10) === 0) return t.tie;
    const text = formatDecimal(abs / 1000, abs < 100 ? 2 : 1, p.lang);
    return `${diff > 0 ? t.won : t.lost}${SEP}${text} ${t.sec}`;
  }
  if (Math.round(diff) === 0) return t.tie;
  return `${diff > 0 ? t.won : t.lost}${SEP}${formatInt(Math.abs(diff), p.lang)} ${t.pts}`;
}
