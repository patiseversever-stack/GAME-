// Günün Rotası / Sürü Günü calendar + seeds (owner: replay). BRIEF §2.5 Mod 2, §4.G.7.
// PURE: no Date object — civil dates come from integer arithmetic (H. Hinnant's days_from_civil).
// Europe/Istanbul is fixed UTC+3 (permanent since 2016, no DST), so a day key is just
// floor((utcMs + 3 h) / 1 day).

import { WORLD_IDS } from '../types.ts';
import type { WorldId } from '../types.ts';
import { fmix32, fnv1a32 } from './fnv1a.ts';

export const ISTANBUL_UTC_OFFSET_MS = 10800000;
export const MS_PER_DAY = 86400000;
/** Launch day = Günün Rotası #1 / Sürü Günü #1 (Istanbul date). */
export const DAILY_LAUNCH_DATE_KEY = '20261008';
export const DAILY_SEED_PREFIX = 'KANAT-GR-';
export const SURU_DAY_SEED_PREFIX = 'KANAT-SG-';
/** Difficulty by ISO weekday (index 0 = Monday … 6 = Sunday): Pazartesi 3 → Pazar 7 (§2.5). */
export const DAILY_DIFFICULTY_BY_WEEKDAY: readonly number[] = [3, 4, 4, 5, 6, 6, 7];

/** Days since 1970-01-01 of a proleptic Gregorian civil date (month 1..12). */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const mp = (m + 9) % 12; // March = 0
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil → [year, month 1..12, day 1..31]. */
export function civilFromDays(days: number): [number, number, number] {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return [y, m, d];
}

function pad(n: number, width: number): string {
  let s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

/** Istanbul-local day number (days since 1970-01-01 Istanbul) of a UTC instant in ms. */
export function istanbulDayNumber(utcMs: number): number {
  return Math.floor((utcMs + ISTANBUL_UTC_OFFSET_MS) / MS_PER_DAY);
}

/** 'yyyymmdd' for a day number (years 0..9999). */
export function dayNumberToDateKey(days: number): string {
  const [y, m, d] = civilFromDays(days);
  return pad(y, 4) + pad(m, 2) + pad(d, 2);
}

/** Day number of a 'yyyymmdd' key, or NaN when the key is not a real calendar date. */
export function dateKeyToDayNumber(key: string): number {
  if (typeof key !== 'string' || !/^[0-9]{8}$/.test(key)) return NaN;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  if (m < 1 || m > 12 || d < 1) return NaN;
  const days = daysFromCivil(y, m, d);
  const back = civilFromDays(days);
  return back[1] === m && back[2] === d ? days : NaN;
}

export function isValidDateKey(key: string): boolean {
  return !Number.isNaN(dateKeyToDayNumber(key));
}

function dayOf(key: string): number {
  const days = dateKeyToDayNumber(key);
  if (Number.isNaN(days)) throw new RangeError(`invalid date key: ${String(key)}`);
  return days;
}

const LAUNCH_DAY = /* @__PURE__ */ dateKeyToDayNumber(DAILY_LAUNCH_DATE_KEY);

/** 'yyyymmdd' of the Istanbul calendar day containing the UTC instant `utcMs`. */
export function istanbulDateKey(utcMs: number): string {
  return dayNumberToDateKey(istanbulDayNumber(utcMs));
}

/** Milliseconds until the next Istanbul midnight (countdown to the next Günün Rotası). */
export function msUntilNextIstanbulDay(utcMs: number): number {
  const local = utcMs + ISTANBUL_UTC_OFFSET_MS;
  return MS_PER_DAY - (local - Math.floor(local / MS_PER_DAY) * MS_PER_DAY);
}

/** u32 seed of the day's route: fnv1a32("KANAT-GR-" + yyyymmdd). */
export function dailySeed(dateKey: string): number {
  dayOf(dateKey);
  return fnv1a32(DAILY_SEED_PREFIX + dateKey);
}

/** u32 seed of the day's SÜRÜ.io arena: fnv1a32("KANAT-SG-" + yyyymmdd). */
export function suruDaySeed(dateKey: string): number {
  dayOf(dateKey);
  return fnv1a32(SURU_DAY_SEED_PREFIX + dateKey);
}

/** Card number #N: launch day = 1, +1 per Istanbul day. Days before launch give N <= 0. */
export function dailyIndex(dateKey: string): number {
  return dayOf(dateKey) - LAUNCH_DAY + 1;
}

/** Inverse of dailyIndex: the date key of Günün Rotası #index (a ghost code carries only the index). */
export function dateKeyForDailyIndex(index: number): string {
  if (!Number.isInteger(index)) throw new RangeError(`invalid daily index: ${index}`);
  return dayNumberToDateKey(LAUNCH_DAY + index - 1);
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoWeekday(dateKey: string): number {
  const days = dayOf(dateKey);
  return (((days % 7) + 7 + 3) % 7) + 1; // 1970-01-01 was a Thursday (4)
}

/** Route difficulty 3 (Pazartesi) … 7 (Pazar). */
export function dailyDifficulty(dateKey: string): number {
  return DAILY_DIFFICULTY_BY_WEEKDAY[isoWeekday(dateKey) - 1];
}

/**
 * World of the day, from the base daily seed (§4.G.7 "dünya seed ile döner"). The route generator
 * must keep this world when it retries with seed+1, seed+2 … for an unflyable corridor.
 */
export function dailyWorld(seed: number): WorldId {
  return WORLD_IDS[fmix32(seed >>> 0) % WORLD_IDS.length];
}

export interface DailyInfo {
  dateKey: string;
  /** #N on the card. */
  index: number;
  seed: number;
  suruSeed: number;
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  difficulty: number;
  world: WorldId;
}

export function dailyInfo(dateKey: string): DailyInfo {
  const seed = dailySeed(dateKey);
  return {
    dateKey,
    index: dailyIndex(dateKey),
    seed,
    suruSeed: suruDaySeed(dateKey),
    weekday: isoWeekday(dateKey),
    difficulty: dailyDifficulty(dateKey),
    world: dailyWorld(seed),
  };
}

/** Convenience for the app shell: today's info from a host-provided UTC timestamp. */
export function dailyInfoAt(utcMs: number): DailyInfo {
  return dailyInfo(istanbulDateKey(utcMs));
}
