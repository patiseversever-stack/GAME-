import { describe, expect, it } from 'vitest';
import {
  applyLp,
  defaultProfile,
  migrateV0toV1,
  rankBand,
  rankFromXp,
  recordRouteResult,
  ROUTE_IDS,
  SAVE_SCHEMA,
  stampFlightLog,
  totalStars,
  validateProfile,
  worldsUnlockedByStars,
  xpFor,
  xpForRank,
} from '../../src/core/profile.ts';
import type { HostStorageChannel } from '../../src/core/save.ts';
import { atomicRead, atomicWrite, HostProfileStore, LocalProfileStore, MemoryKV, migrateDoc, STORAGE_KEYS, TMP_SUFFIX, VersionedDoc } from '../../src/core/save.ts';
import { DEFAULT_SETTINGS, diffSettings, mergeSettings, validateSettings } from '../../src/core/settings.ts';
import { SettingsStore } from '../../src/core/settingsStore.ts';

describe('atomic writes', () => {
  it('writes through a temp key and leaves no tmp behind', () => {
    const kv = new MemoryKV();
    atomicWrite(kv, 'k', '{"a":1}');
    expect(kv.getItem('k')).toBe('{"a":1}');
    expect(kv.getItem('k' + TMP_SUFFIX)).toBeNull();
  });

  it('recovers an interrupted write (tmp complete, main stale/missing)', () => {
    const kv = new MemoryKV();
    kv.setItem('k', '{"a":1}');
    kv.setItem('k' + TMP_SUFFIX, '{"a":2}'); // crash between tmp and swap
    expect(atomicRead(kv, 'k')).toBe('{"a":2}');
    expect(kv.getItem('k')).toBe('{"a":2}');
    expect(kv.getItem('k' + TMP_SUFFIX)).toBeNull();
  });

  it('ignores a torn tmp and keeps the old value', () => {
    const kv = new MemoryKV();
    kv.setItem('k', '{"a":1}');
    kv.setItem('k' + TMP_SUFFIX, '{"a":');
    expect(atomicRead(kv, 'k')).toBe('{"a":1}');
    expect(kv.getItem('k' + TMP_SUFFIX)).toBeNull();
  });

  it('a failing tmp write (quota) never damages the stored value', () => {
    const kv = new MemoryKV();
    kv.setItem('k', '{"a":1}');
    const full = {
      getItem: (k: string) => kv.getItem(k),
      removeItem: (k: string) => kv.removeItem(k),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => atomicWrite(full, 'k', '{"a":2}')).toThrow();
    expect(atomicRead(kv, 'k')).toBe('{"a":1}');
  });
});

describe('versioned docs + migrations (save.v1)', () => {
  it('migrates the unversioned v0 layout to v1 and re-saves it', async () => {
    const store = new LocalProfileStore(new MemoryKV());
    await store.set(STORAGE_KEYS.save, JSON.stringify({ stars: { w1r1: 3, w1r2: 2 }, best: { w1r1: 48210 }, xp: 900 }));
    const doc = new VersionedDoc(store, SAVE_SCHEMA);
    const p = await doc.load();
    expect(doc.lastLoad).toMatchObject({ found: true, from: 0, migrated: true, corrupt: false });
    expect(p.v).toBe(1);
    expect(p.routes.w1r1).toMatchObject({ stars: 3, bestScore: 48210 });
    expect(p.routes.w1r2.stars).toBe(2);
    expect(p.xp).toBe(900);
    expect(totalStars(p)).toBe(5);
    const again = JSON.parse((await store.get(STORAGE_KEYS.save))!);
    expect(again.v).toBe(1);
  });

  it('round-trips v1 unchanged and survives corrupt JSON', async () => {
    const kv = new MemoryKV();
    const store = new LocalProfileStore(kv);
    const doc = new VersionedDoc(store, SAVE_SCHEMA);
    await doc.load();
    expect(doc.lastLoad.found).toBe(false);
    recordRouteResult(doc.value, 'w1r1', { score: 30_000, stars: 2, timeMs: 95_000, landed: true, crashed: false, halfFlight: false });
    await doc.save();
    const doc2 = new VersionedDoc(store, SAVE_SCHEMA);
    const p2 = await doc2.load();
    expect(p2.routes.w1r1).toMatchObject({ stars: 2, bestScore: 30_000, bestTimeMs: 95_000, plays: 1, landings: 1 });
    expect(doc2.lastLoad.migrated).toBe(false);
    kv.setItem(STORAGE_KEYS.save, '{not json');
    const doc3 = new VersionedDoc(store, SAVE_SCHEMA);
    const warn = console.warn;
    console.warn = () => undefined;
    const p3 = await doc3.load();
    console.warn = warn;
    expect(doc3.lastLoad.corrupt).toBe(true);
    expect(p3.routes).toEqual({});
  });

  it('a document from a newer build is loaded without crashing (downgrade-safe)', () => {
    const r = migrateDoc({ v: 9, xp: 5 }, SAVE_SCHEMA);
    expect(r).toMatchObject({ from: 9, to: 9, migrated: false });
    expect(validateProfile(r.doc).xp).toBe(5);
  });

  it('missing migration step throws (caught by VersionedDoc)', () => {
    expect(() => migrateDoc({}, { ...SAVE_SCHEMA, version: 3 })).toThrow(/no migration/);
  });

  it('v0→v1 migration is pure data', () => {
    expect(migrateV0toV1({ stars: {}, extra: 1 })).toEqual({ extra: 1, routes: {} });
  });
});

describe('profile model', () => {
  it('validates garbage into a sane profile', () => {
    const p = validateProfile({
      xp: -5,
      routes: { w1r1: { stars: 7, bestScore: 'x', tasks: [true, 'y'] }, bogus: { stars: 3 }, __proto__: { stars: 3 } },
      unlockedWorlds: ['likya', 'atlantis'],
      postcards: ['a', 'a', 5],
      suru: { league: 'mythic', lp: 1e9, peakSize: 99_999 },
      flightLog: { days: ['2026-10-08', 'nope', '2026-10-01'] },
      ghosts: { w1r1: 'K1.abc', 'daily-214': 'K1.def', hack: 'x' },
    });
    expect(p.xp).toBe(0);
    expect(p.routes.w1r1).toMatchObject({ stars: 3, bestScore: 0, tasks: [true, false, false] });
    expect(Object.keys(p.routes)).toEqual(['w1r1']);
    expect(p.unlockedWorlds).toEqual(['kapadokya', 'likya']);
    expect(p.postcards).toEqual(['a']);
    expect(p.suru.league).toBe('bronze');
    expect(p.suru.peakSize).toBe(1500);
    expect(p.flightLog.days).toEqual(['2026-10-01', '2026-10-08']);
    expect(p.ghosts).toEqual({ w1r1: 'K1.abc', 'daily-214': 'K1.def' });
  });

  it('stars unlock worlds at 6/15/26/38', () => {
    expect(worldsUnlockedByStars(5)).toEqual(['kapadokya']);
    expect(worldsUnlockedByStars(6)).toEqual(['kapadokya', 'likya']);
    expect(worldsUnlockedByStars(38)).toHaveLength(5);
    const p = defaultProfile();
    for (const id of ROUTE_IDS.slice(0, 2)) recordRouteResult(p, id, { score: 1, stars: 3, timeMs: 1, landed: true, crashed: false, halfFlight: false });
    expect(p.unlockedWorlds).toContain('likya');
  });

  it('best scores only improve; stars only rise; tasks stick', () => {
    const p = defaultProfile();
    recordRouteResult(p, 'w2r1', { score: 500, stars: 2, timeMs: 80_000, landed: true, crashed: false, halfFlight: false, tasks: [true, false, false] });
    const r = recordRouteResult(p, 'w2r1', { score: 300, stars: 1, timeMs: 70_000, landed: true, crashed: false, halfFlight: false, tasks: [false, true, false] });
    expect(r).toEqual({ newBest: false, newStars: 0 });
    expect(p.routes.w2r1).toMatchObject({ bestScore: 500, stars: 2, bestTimeMs: 70_000, plays: 2, tasks: [true, true, false] });
    recordRouteResult(p, 'w2r1', { score: 9_000, stars: 0, timeMs: 0, landed: false, crashed: true, halfFlight: false });
    expect(p.routes.w2r1.bestScore).toBe(500); // crashes never set records
  });

  it('league LP: promotions carry over, never demote, never below 0', () => {
    const s = defaultProfile().suru;
    applyLp(s, 30);
    applyLp(s, -100);
    expect(s).toMatchObject({ league: 'bronze', lp: 0 });
    expect(applyLp(s, 310).promoted).toBe(true);
    expect(s).toMatchObject({ league: 'silver', lp: 10, peakLeague: 'silver' });
    applyLp(s, -10);
    expect(s.league).toBe('silver');
    applyLp(s, 5000);
    expect(s.league).toBe('diamond');
  });

  it('rank curve is monotonic over 1..50 with the brief bands', () => {
    for (let r = 2; r <= 50; r++) expect(xpForRank(r)).toBeGreaterThan(xpForRank(r - 1));
    expect(rankFromXp(0)).toBe(1);
    expect(rankFromXp(xpForRank(9))).toBe(9);
    expect(rankFromXp(1e12)).toBe(50);
    expect([rankBand(8), rankBand(9), rankBand(25), rankBand(26), rankBand(43), rankBand(44)]).toEqual(['caylak', 'suzulen', 'siyirici', 'kartal', 'usta', 'efsane']);
    expect(xpFor({ score: 48_210, stars: 3, tasks: 1, daily: true, suruRound: 250 })).toBe(48 + 600 + 300 + 500 + 250);
  });

  it('flight log stamps are unique days (no streak semantics)', () => {
    const p = defaultProfile();
    expect(stampFlightLog(p, '2026-10-08')).toBe(true);
    expect(stampFlightLog(p, '2026-10-08')).toBe(false);
    expect(stampFlightLog(p, '2026-10-01')).toBe(true);
    expect(p.flightLog.days).toEqual(['2026-10-01', '2026-10-08']);
  });
});

describe('settings', () => {
  it('validate clamps / defaults / drops unknown keys', () => {
    const s = validateSettings({ quality: 'epic', fps: 45, masterVolume: 3, lang: 'de', extra: 1, kanat: { sensitivity: 9, expo: -1, gyro: 'roll' } });
    expect(s).toMatchObject({ quality: 'auto', fps: 60, masterVolume: 1, lang: 'tr' });
    expect(s.kanat).toMatchObject({ sensitivity: 1.5, expo: 0, gyro: 'roll' });
    expect('extra' in s).toBe(false);
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('merge + diff report dotted keys', () => {
    const a = validateSettings({});
    const b = mergeSettings(a, { lang: 'en', kanat: { twoThumbs: true } });
    expect(b.kanat.controlDir).toBe('natural');
    expect(diffSettings(a, b)).toEqual(['lang', 'kanat.twoThumbs']);
  });

  it('SettingsStore persists and emits change events', async () => {
    const kv = new MemoryKV();
    const st = new SettingsStore(new LocalProfileStore(kv));
    await st.load();
    const changes: string[][] = [];
    st.onChange((c) => changes.push(c.changed));
    expect(st.set({ fps: 30 })).toEqual(['fps']);
    expect(st.set({ fps: 30 })).toEqual([]);
    st.set({ quality: 'low', kanat: { gyro: 'full' } });
    await st.save();
    expect(changes).toEqual([['fps'], ['quality', 'kanat.gyro']]);
    const st2 = new SettingsStore(new LocalProfileStore(kv));
    const v = await st2.load();
    expect(v).toMatchObject({ fps: 30, quality: 'low', kanat: { gyro: 'full' } });
  });
});

describe('HostProfileStore (bridge storage, localStorage cache)', () => {
  function channel(hostData: Map<string, string> | null, hasHost = true) {
    const sets: [string, string][] = [];
    const ch: HostStorageChannel = {
      hasHost: () => hasHost,
      storageGet: async (key) => (hostData === null ? undefined : (hostData.get(key) ?? null)),
      storageSet: (k, v) => {
        sets.push([k, v]);
        hostData?.set(k, v);
      },
    };
    return { ch, sets };
  }

  it('host is primary and refreshes the cache', async () => {
    const host = new Map([['kanat.settings', '{"v":1,"lang":"en"}']]);
    const cache = new LocalProfileStore(new MemoryKV());
    await cache.set('kanat.settings', '{"v":1,"lang":"tr"}');
    const s = new HostProfileStore(channel(host).ch, cache);
    expect(await s.get('kanat.settings')).toBe('{"v":1,"lang":"en"}');
    expect(await cache.get('kanat.settings')).toBe('{"v":1,"lang":"en"}');
    expect(s.hostStorageActive).toBe(true);
  });

  it('host without the key → cache value, re-seeded to the host', async () => {
    const host = new Map<string, string>();
    const { ch, sets } = channel(host);
    const cache = new LocalProfileStore(new MemoryKV());
    await cache.set('kanat.save', '{"v":1}');
    const s = new HostProfileStore(ch, cache);
    expect(await s.get('kanat.save')).toBe('{"v":1}');
    expect(sets).toEqual([['kanat.save', '{"v":1}']]);
  });

  it('host that never answers → cache only for the rest of the session', async () => {
    let asked = 0;
    const ch: HostStorageChannel = {
      hasHost: () => true,
      storageGet: async () => {
        asked++;
        return undefined;
      },
      storageSet: () => undefined,
    };
    const cache = new LocalProfileStore(new MemoryKV());
    await cache.set('a', '1');
    const s = new HostProfileStore(ch, cache);
    expect(await s.get('a')).toBe('1');
    expect(await s.get('a')).toBe('1');
    expect(asked).toBe(1);
    expect(s.hostStorageActive).toBe(false);
  });

  it('writes go to cache and host', async () => {
    const host = new Map<string, string>();
    const { ch } = channel(host);
    const cache = new LocalProfileStore(new MemoryKV());
    const s = new HostProfileStore(ch, cache);
    await s.set('k', '{"x":1}');
    expect(host.get('k')).toBe('{"x":1}');
    expect(await cache.get('k')).toBe('{"x":1}');
  });
});
