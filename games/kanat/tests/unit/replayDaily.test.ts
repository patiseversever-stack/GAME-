// Günün Rotası calendar & seeds (BRIEF §2.5 Mod 2, §4.G.7, §9.G-15).
import { describe, expect, it } from 'vitest';
import { WORLD_IDS } from '../../src/sim/types.ts';
import {
  DAILY_LAUNCH_DATE_KEY,
  civilFromDays,
  dailyDifficulty,
  dailyIndex,
  dailyInfo,
  dailyInfoAt,
  dailySeed,
  dailyWorld,
  dateKeyForDailyIndex,
  dateKeyToDayNumber,
  daysFromCivil,
  istanbulDateKey,
  isValidDateKey,
  isoWeekday,
  msUntilNextIstanbulDay,
  suruDaySeed,
} from '../../src/sim/replay/daily.ts';
import { fnv1a32 } from '../../src/sim/replay/fnv1a.ts';

const H = 3600000;
const LAUNCH_UTC_MIDNIGHT = Date.UTC(2026, 9, 8); // 2026-10-08T00:00Z

function intlKey(utcMs: number): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date(utcMs)).replace(/-/g, '');
}

describe('civil date arithmetic (no Date in sim)', () => {
  it('daysFromCivil / civilFromDays agree with Date.UTC over ±3000 years (sampled) and round-trip', () => {
    for (let days = -1100000; days <= 1100000; days += 997) {
      const d = new Date(days * 86400000);
      expect(civilFromDays(days)).toEqual([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]);
      const [y, m, dd] = civilFromDays(days);
      expect(daysFromCivil(y, m, dd)).toBe(days);
    }
    expect(daysFromCivil(1970, 1, 1)).toBe(0);
    expect(daysFromCivil(2000, 2, 29)).toBe(11016);
  });

  it('validates keys', () => {
    expect(isValidDateKey('20261008')).toBe(true);
    expect(isValidDateKey('20280229')).toBe(true);
    expect(isValidDateKey('20270229')).toBe(false);
    expect(isValidDateKey('20261301')).toBe(false);
    expect(isValidDateKey('2026-10-08')).toBe(false);
    expect(isValidDateKey('')).toBe(false);
    expect(Number.isNaN(dateKeyToDayNumber('20260431'))).toBe(true);
    expect(() => dailySeed('2026-10-08')).toThrow(RangeError);
    expect(() => dailyIndex('20260230')).toThrow(RangeError);
  });
});

describe('istanbulDateKey (fixed UTC+3, DST-free)', () => {
  it('rolls over exactly at 21:00 UTC every day for 365 days (incl. EU DST switch dates)', () => {
    for (let i = 0; i < 365; i++) {
      const utcMidnight = LAUNCH_UTC_MIDNIGHT + i * 24 * H;
      const d = new Date(utcMidnight);
      const expected = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
      // Istanbul day D runs from (D-1) 21:00Z to D 21:00Z
      expect(istanbulDateKey(utcMidnight - 3 * H)).toBe(expected);
      expect(istanbulDateKey(utcMidnight + 21 * H - 1)).toBe(expected);
      expect(istanbulDateKey(utcMidnight + 21 * H)).not.toBe(expected);
      expect(istanbulDateKey(utcMidnight + 12 * H)).toBe(intlKey(utcMidnight + 12 * H));
      expect(istanbulDateKey(utcMidnight - 3 * H)).toBe(intlKey(utcMidnight - 3 * H));
      expect(istanbulDateKey(utcMidnight + 21 * H - 1)).toBe(intlKey(utcMidnight + 21 * H - 1));
    }
    // EU DST (2027-03-28, 2027-10-31) does not move the Istanbul day boundary
    expect(istanbulDateKey(Date.UTC(2027, 2, 27, 21, 0, 0))).toBe('20270328');
    expect(istanbulDateKey(Date.UTC(2027, 2, 27, 20, 59, 59, 999))).toBe('20270327');
    expect(istanbulDateKey(Date.UTC(2027, 9, 30, 21, 0, 0))).toBe('20271031');
    expect(istanbulDateKey(Date.UTC(2027, 9, 30, 20, 59, 59, 999))).toBe('20271030');
  });

  it('msUntilNextIstanbulDay counts down to 21:00 UTC', () => {
    expect(msUntilNextIstanbulDay(Date.UTC(2026, 9, 8, 20, 0, 0))).toBe(H);
    expect(msUntilNextIstanbulDay(Date.UTC(2026, 9, 8, 21, 0, 0))).toBe(24 * H);
    expect(msUntilNextIstanbulDay(Date.UTC(2026, 9, 8, 20, 59, 59, 999))).toBe(1);
  });
});

describe('daily seeds, index, weekday difficulty, world', () => {
  it('365 consecutive dates: valid, unique seeds, index +1 per day, inverse mapping', () => {
    const seeds = new Set<number>();
    const suru = new Set<number>();
    const worlds = new Map<string, number>();
    let prevIndex = 0;
    let firstKey = '';
    for (let i = 0; i < 365; i++) {
      const key = istanbulDateKey(LAUNCH_UTC_MIDNIGHT + i * 24 * H + 9 * H);
      if (i === 0) firstKey = key;
      expect(isValidDateKey(key)).toBe(true);
      const info = dailyInfo(key);
      expect(info.seed).toBe(fnv1a32('KANAT-GR-' + key));
      expect(info.suruSeed).toBe(fnv1a32('KANAT-SG-' + key));
      expect(info.seed).toBeGreaterThanOrEqual(0);
      expect(info.seed).toBeLessThanOrEqual(0xffffffff);
      expect(info.index).toBe(prevIndex + 1);
      prevIndex = info.index;
      expect(dateKeyForDailyIndex(info.index)).toBe(key);
      expect(info.difficulty).toBeGreaterThanOrEqual(3);
      expect(info.difficulty).toBeLessThanOrEqual(7);
      expect(WORLD_IDS).toContain(info.world);
      seeds.add(info.seed);
      suru.add(info.suruSeed);
      worlds.set(info.world, (worlds.get(info.world) ?? 0) + 1);
      // deterministic: same key → same info
      expect(dailyInfo(key)).toEqual(info);
    }
    expect(firstKey).toBe(DAILY_LAUNCH_DATE_KEY);
    expect(seeds.size).toBe(365);
    expect(suru.size).toBe(365);
    for (const s of seeds) expect(suru.has(s)).toBe(false);
    expect(worlds.size).toBe(5);
    for (const [, n] of worlds) expect(n).toBeGreaterThan(40);
    console.log('daily world distribution over 365 days:', Object.fromEntries(worlds));
  });

  it('launch day is #1; seeds are pinned (format freeze)', () => {
    expect(dailyIndex('20261008')).toBe(1);
    expect(dailyIndex('20261009')).toBe(2);
    expect(dailyIndex('20270507')).toBe(212);
    expect(dailyIndex('20261007')).toBe(0);
    expect(dateKeyForDailyIndex(214)).toBe('20270509');
    expect(dailySeed('20261008')).toBe(fnv1a32('KANAT-GR-20261008'));
    expect(suruDaySeed('20261008')).toBe(fnv1a32('KANAT-SG-20261008'));
    expect(dailyInfoAt(Date.UTC(2026, 9, 7, 21, 30))).toEqual(dailyInfo('20261008'));
  });

  it('weekday difficulty: Pazartesi 3 → Pazar 7', () => {
    // 2026-10-12 is a Monday
    const week = ['20261012', '20261013', '20261014', '20261015', '20261016', '20261017', '20261018'];
    expect(week.map(isoWeekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(week.map(dailyDifficulty)).toEqual([3, 4, 4, 5, 6, 6, 7]);
    expect(isoWeekday('20261008')).toBe(4); // launch day is a Thursday
    for (let i = 0; i < 365; i++) {
      const key = dateKeyForDailyIndex(i + 1);
      const y = Number(key.slice(0, 4));
      const m = Number(key.slice(4, 6));
      const d = Number(key.slice(6, 8));
      const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      expect(isoWeekday(key)).toBe(js === 0 ? 7 : js);
    }
  });

  it('dailyWorld depends only on the seed', () => {
    expect(dailyWorld(123)).toBe(dailyWorld(123));
    const counts = new Map<string, number>();
    for (let s = 0; s < 50000; s++) counts.set(dailyWorld(s * 2654435761), (counts.get(dailyWorld(s * 2654435761)) ?? 0) + 1);
    for (const w of WORLD_IDS) expect(Math.abs((counts.get(w) ?? 0) - 10000)).toBeLessThan(500);
  });
});
