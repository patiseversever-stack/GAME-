import { describe, expect, it } from 'vitest';
import { TR } from '../../src/ui/strings/tr.ts';
import { EN } from '../../src/ui/strings/en.ts';
import { fmtDate, fmtDec, fmtDelta, fmtInt, fmtTime, formatMessage, getLang, ordinal, possessive, setLang, t, tk, upper } from '../../src/ui/i18n.ts';
import { BADGES, USTA_TASKS, USTA_I18N_KEY, USTA_I18N_KEY_RELATIVE } from '../../src/content/meta/index.ts';
import { taskText } from '../../src/ui/usta.ts';
import { BADGE_IDS, PALETTE_IDS, PATTERN_IDS, POSTCARD_IDS, ROUTE_IDS, TRAIL_IDS, FLOCK_NAME_COUNT, LOADING_TIP_COUNT } from '../../src/ui/content.ts';

describe('i18n tables', () => {
  it('EN defines exactly the TR keys and no value is empty', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(TR).sort());
    for (const [k, v] of Object.entries(TR)) expect(v.trim(), k).not.toBe('');
    for (const [k, v] of Object.entries(EN)) expect(v.trim(), k).not.toBe('');
  });

  it('every content id has a name in both languages', () => {
    const keys = [
      ...ROUTE_IDS.map((id) => `route.${id}`),
      ...POSTCARD_IDS.map((id) => `pc.${id}`),
      ...BADGE_IDS.flatMap((id) => [`badge.${id}`, `badge.${id}.desc`]),
      ...PATTERN_IDS.map((id) => `pattern.${id}`),
      ...PALETTE_IDS.map((id) => `palette.${id}`),
      ...TRAIL_IDS.map((id) => `trail.${id}`),
      ...Array.from({ length: FLOCK_NAME_COUNT }, (_, i) => `flock.${i}`),
      ...Array.from({ length: LOADING_TIP_COUNT }, (_, i) => `tip.${i}`),
      ...[0, 1, 2, 3, 4, 5].map((i) => `rank.${i}`),
      ...[0, 1, 2, 3, 4].map((i) => `league.${i}`),
    ];
    expect(ROUTE_IDS.length).toBe(20);
    expect(POSTCARD_IDS.length).toBe(25);
    expect(BADGE_IDS.length).toBe(30);
    expect(PATTERN_IDS.length).toBe(20);
    expect(PALETTE_IDS.length).toBe(12);
    expect(TRAIL_IDS.length).toBe(10);
    for (const k of keys) {
      expect(k in TR, k).toBe(true);
      expect(k in EN, k).toBe(true);
    }
  });

  it('no emoji in UI strings (share.* excluded) and no "yakında"', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [k, v] of [...Object.entries(TR), ...Object.entries(EN)]) {
      if (!k.startsWith('share.')) expect(emoji.test(v), k).toBe(false);
      expect(/yakında|coming soon/i.test(v), k).toBe(false);
    }
  });

  it('brief strings are verbatim', () => {
    expect(TR['about.reality']).toBe('Wingsuit gerçek hayatta yıllar süren eğitim ister.');
    expect(TR['route.w1r1']).toBe('İlk Atlayış');
    expect(TR['route.w5r4']).toBe('Gün Batımı Finali');
    expect(TR['ftue.jump']).toBe('Atla');
    expect(TR['help.title']).toBe('Bu bölümde yardım?');
    expect(TR['inverted.title']).toBe('Yukarı çekince burun insin mi?'); // GDD §9 / INVERT_CARD (F1 review)
    expect(TR['ftue.pull']).toBe('Aşağı çek');
    expect(TR['toast.mediumSuggested']).toBe('Akıcılık için Orta önerilir');
  });
});

describe('meta sync (F1 review Ü-10)', () => {
  it('badge names and descriptions match src/content/meta/badges.ts', () => {
    expect(BADGES.map((b) => b.id).sort()).toEqual([...BADGE_IDS].sort());
    for (const b of BADGES) {
      expect(TR[`badge.${b.id}` as keyof typeof TR], b.id).toBe(b.name.tr);
      expect(EN[`badge.${b.id}` as keyof typeof EN], b.id).toBe(b.name.en);
      expect(TR[`badge.${b.id}.desc` as keyof typeof TR], b.id).toBe(b.desc.tr);
      expect(EN[`badge.${b.id}.desc` as keyof typeof EN], b.id).toBe(b.desc.en);
    }
  });

  it('every usta key exists and none of the 60 tasks falls back to the generic label', () => {
    for (const k of [...Object.values(USTA_I18N_KEY), ...Object.values(USTA_I18N_KEY_RELATIVE)]) {
      expect(k in TR, k).toBe(true);
      expect(k in EN, k).toBe(true);
    }
    expect(USTA_TASKS.length).toBe(60);
    for (const task of USTA_TASKS) {
      for (const lang of ['tr', 'en'] as const) {
        const txt = taskText({ id: task.id, type: task.type, value: task.value, done: false }, lang);
        expect(txt, task.id).not.toBe(lang === 'tr' ? TR['usta.generic'] : EN['usta.generic']);
        expect(txt, task.id).not.toMatch(/\{|undefined|NaN/);
      }
    }
  });

  it('ratio tasks use relative wording without benchmarks and real numbers with them', () => {
    const t = USTA_TASKS.find((x) => x.type === 'timeUnder');
    if (!t) return;
    expect(taskText({ id: t.id, type: t.type, value: t.value, done: false }, 'tr')).toMatch(/Kılavuz süresinin %\d+ kadarında bitir/);
    expect(taskText({ id: t.id, type: t.type, value: t.value, done: false, bench: { expertScore: 50000, expertTimeSec: 98.47 } }, 'tr')).toMatch(/^\d:\d\d\.\d altında bitir/);
  });
});

describe('formatting', () => {
  it('numbers: TR 48.210 / EN 48,210, true minus sign', () => {
    expect(fmtInt(48210, 'tr')).toBe('48.210');
    expect(fmtInt(48210, 'en')).toBe('48,210');
    expect(fmtInt(1234567, 'tr')).toBe('1.234.567');
    expect(fmtInt(-310, 'tr')).toBe('−310');
    expect(fmtInt(999, 'en')).toBe('999');
    expect(fmtDec(1.5, 1, 'tr')).toBe('1,5');
    expect(fmtDec(1.5, 1, 'en')).toBe('1.5');
  });

  it('time m:ss.d in both languages, truncating', () => {
    expect(fmtTime(127.46)).toBe('2:07.4');
    expect(fmtTime(127.49999)).toBe('2:07.4');
    expect(fmtTime(59.95)).toBe('0:59.9');
    expect(fmtTime(600)).toBe('10:00.0');
    expect(fmtTime(0)).toBe('0:00.0');
  });

  it('deltas', () => {
    expect(fmtDelta(-0.42, 2, 'tr')).toBe('−0,42');
    expect(fmtDelta(0.42, 2, 'en')).toBe('+0.42');
    expect(fmtDelta(0, 2, 'tr')).toBe('±0,00');
  });

  it('Turkish uppercase (İ/ı) via toLocaleUpperCase', () => {
    expect(upper('ığdır İğneada şelâle', 'tr')).toBe('IĞDIR İĞNEADA ŞELÂLE');
    expect(upper('günün rotası', 'tr')).toBe('GÜNÜN ROTASI');
    expect(upper('tip', 'tr')).toBe('TİP');
    expect(upper('tip', 'en')).toBe('TIP');
  });

  it('Turkish genitive with vowel harmony', () => {
    expect(possessive('Ayşe', 'tr')).toBe('Ayşe’nin');
    expect(possessive('Mehmet', 'tr')).toBe('Mehmet’in');
    expect(possessive('Can', 'tr')).toBe('Can’ın');
    expect(possessive('Umut', 'tr')).toBe('Umut’un');
    expect(possessive('Öykü', 'tr')).toBe('Öykü’nün');
    expect(possessive('Ali', 'tr')).toBe('Ali’nin');
    expect(possessive('Burak', 'tr')).toBe('Burak’ın');
    expect(possessive('Ayşe', 'en')).toBe('Ayşe’s');
    expect(t('duel.ghostOf', { name: 'Ayşe' }, 'tr')).toBe('Ayşe’nin hayaleti');
  });

  it('ordinals and dates', () => {
    expect(ordinal(1, 'tr')).toBe('1.');
    expect(ordinal(1, 'en')).toBe('1st');
    expect(ordinal(2, 'en')).toBe('2nd');
    expect(ordinal(13, 'en')).toBe('13th');
    expect(ordinal(23, 'en')).toBe('23rd');
    expect(fmtDate(2026, 10, 8, 'tr')).toBe('8 Ekim 2026');
    expect(fmtDate(2026, 10, 8, 'en')).toBe('8 October 2026');
  });

  it('ICU-like plural/select and params', () => {
    expect(t('common.stars', { n: 1 }, 'en')).toBe('1 star');
    expect(t('common.stars', { n: 3 }, 'en')).toBe('3 stars');
    expect(t('common.stars', { n: 3 }, 'tr')).toBe('3 yıldız');
    expect(t('usta.balloonThread', { count: 5 }, 'en')).toBe('5 Balloon Threads');
    expect(t('settings.assistSub', { a: 'low' }, 'tr')).toBe('Yalnız çarpma uyarısı');
    expect(formatMessage('{n, plural, =0 {hiç} one {# tane} other {# tane}}', { n: 0 }, 'tr')).toBe('hiç');
    expect(t('menu.dailyBest', { time: 127.46 }, 'tr')).toBe('En iyi 2:07.4');
    expect(t('common.points', { n: 48210 }, 'en')).toBe('48,210 pts');
    expect(tk('route.w3r1', undefined, undefined, 'en')).toBe('Sea of Clouds');
    expect(tk('route.nope', undefined, 'fallback')).toBe('fallback');
  });

  it('setLang switches the default language and notifies', () => {
    const start = getLang();
    setLang('en');
    expect(t('pause.resume')).toBe('Resume');
    setLang('tr');
    expect(t('pause.resume')).toBe('Devam');
    setLang(start);
  });
});
