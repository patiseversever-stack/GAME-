// Share card text formats (BRIEF §2.8, §2.6) — exact layout, emoji allowed only here.
//   KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐
//   (optional 2nd line) Düello: KNT1-…   · suffix 🛟 (assist used) / 🐢 (Slow Mode) at the end of line 1
//   KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥
//   KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta
// Pure (no DOM) — unit tested in tests/unit/ui-share.test.ts.
import type { WorldId } from '../../sim/types.ts';
import { t, fmtInt, fmtTime, routeName, worldShort, type Lang } from '../i18n.ts';
import type { ProxTier } from '../theme.ts';

export const PROX_EMOJI: Readonly<Record<ProxTier, string>> = { 0: '⬜', 1: '🟩', 2: '🟨', 3: '🟧', 5: '🟥' };
const SEP = ' · ';

/** 5-segment proximity strip as emoji (missing segments render as ⬜). */
export function proxStripEmoji(strip: readonly number[]): string {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const v = strip[i] ?? 0;
    out += PROX_EMOJI[(v === 1 || v === 2 || v === 3 || v === 5 ? v : 0) as ProxTier];
  }
  return out;
}

export function starsEmoji(n: number): string {
  return '⭐'.repeat(Math.max(0, Math.min(3, Math.floor(n))));
}

function suffix(assisted?: boolean, slow?: boolean): string {
  return `${assisted ? ' 🛟' : ''}${slow ? ' 🐢' : ''}`;
}

/** Optional 2nd line: the one-tap deep link when available (GDD §5.3), else the raw code. */
function duelLine(code: string | undefined, lang: Lang, link?: string): string {
  const v = link ?? code;
  return v ? `\n${t('share.duel', undefined, lang)}: ${v}` : '';
}

export interface DailyShareInput {
  n: number;
  timeSec: number;
  strip: readonly number[];
  stars: number;
  duelCode?: string;
  /** Deep link (`…?c=KNT1-…`) — preferred over the raw code on the 2nd line. */
  duelLink?: string;
  assisted?: boolean;
  slow?: boolean;
}

/** `KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐` */
export function dailyShareText(d: DailyShareInput, lang: Lang): string {
  const parts = [`KANAT${SEP}${t('share.daily', undefined, lang)} #${d.n} 🪂 ${fmtTime(d.timeSec)}`, `${t('share.prox', undefined, lang)} ${proxStripEmoji(d.strip)}`];
  const st = starsEmoji(d.stars);
  if (st) parts.push(st);
  return parts.join(SEP) + suffix(d.assisted, d.slow) + duelLine(d.duelCode, lang, d.duelLink);
}

export interface CareerShareInput {
  world: WorldId;
  routeId: string;
  stars: number;
  score: number;
  strip: readonly number[];
  duelCode?: string;
  duelLink?: string;
  assisted?: boolean;
  slow?: boolean;
}

/** `KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥` */
export function careerShareText(c: CareerShareInput, lang: Lang): string {
  const st = starsEmoji(c.stars);
  const head = `KANAT${SEP}${worldShort(c.world, lang)} / ${routeName(c.routeId, lang)}${st ? ` ${st}` : ''}`;
  return [head, fmtInt(c.score, lang), `${t('share.prox', undefined, lang)} ${proxStripEmoji(c.strip)}`].join(SEP) + suffix(c.assisted, c.slow) + duelLine(c.duelCode, lang, c.duelLink);
}

export interface SuruShareInput {
  /** 'daily' = Sürü Günü (meta SuruSubMode); 'day' kept as an alias. */
  sub: 'daily' | 'day' | 'league' | 'practice';
  n?: number; // Sürü Günü number
  place: number;
  flocks: number;
  peak: number;
  encircles: number;
  survived: boolean;
}

/** `KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta` */
export function suruShareText(s: SuruShareInput, lang: Lang): string {
  const isDay = s.sub === 'day' || s.sub === 'daily';
  const subName = t(isDay ? 'share.suru.day' : s.sub === 'league' ? 'share.suru.league' : 'share.suru.practice', undefined, lang);
  const num = isDay && s.n !== undefined ? ` #${s.n}` : '';
  const parts = [`KANAT${SEP}SÜRÜ.io${SEP}${subName}${num} 🐦 ${t('share.suru.place', { p: s.place, n: s.flocks }, lang)}`, t('share.suru.peak', { n: s.peak }, lang)];
  if (s.encircles > 0) parts.push(`🌀 ${t('share.suru.encircle', { n: s.encircles }, lang)}`);
  if (s.survived) parts.push(`🌅 ${t('share.suru.survived', undefined, lang)}`);
  return parts.join(SEP);
}

export interface DuelInviteInput {
  /** Sender's display name (host profile); omitted → anonymous wording. */
  name?: string;
  route: { kind: 'daily'; n: number } | { kind: 'career'; routeId: string } | { kind: 'weekly'; routeId: string };
  metric: { kind: 'time'; sec: number } | { kind: 'score'; value: number };
  /** One-tap deep link carrying the code (`https://…/?c=KNT1-…`). */
  link: string;
}

/** Human sentence + link (GDD §5.3): "Ayşe seni KANAT’ta düelloya çağırdı · Günün Rotası #214 · 2:07.4 → <link>". */
export function duelShareText(d: DuelInviteInput, lang: Lang): string {
  const route = d.route.kind === 'daily' ? t('duel.routeDaily', { n: d.route.n }, lang) : routeName(d.route.routeId, lang);
  const metric = d.metric.kind === 'time' ? fmtTime(d.metric.sec) : fmtInt(d.metric.value, lang);
  const name = d.name?.trim();
  return name ? t('share.duelInvite', { name, route, metric, link: d.link }, lang) : t('share.duelInviteAnon', { route, metric, link: d.link }, lang);
}
