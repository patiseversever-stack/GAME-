// Share-card text, exact §2.8 formats.
import { describe, expect, it } from 'vitest';
import {
  careerShareText,
  dailyShareText,
  duelLine,
  duelResultText,
  formatDecimal,
  formatInt,
  formatRaceTime,
  formatSplit,
  ghostTitle,
  possessiveName,
  starsText,
  suruShareText,
} from '../../src/sim/replay/shareText.ts';
import { encodeGhostCode } from '../../src/sim/replay/ghostCode.ts';
import { recordCommands } from '../../src/sim/replay/recorder.ts';

describe('number and time formats', () => {
  it('TR 48.210 / EN 48,210', () => {
    expect(formatInt(48210, 'tr')).toBe('48.210');
    expect(formatInt(48210, 'en')).toBe('48,210');
    expect(formatInt(0, 'tr')).toBe('0');
    expect(formatInt(999, 'tr')).toBe('999');
    expect(formatInt(1000, 'tr')).toBe('1.000');
    expect(formatInt(1234567, 'en')).toBe('1,234,567');
    expect(formatInt(-1500, 'tr')).toBe('−1.500');
    expect(formatInt(48209.6, 'tr')).toBe('48.210');
  });

  it('race time m:ss.t truncated to tenths', () => {
    expect(formatRaceTime(127400)).toBe('2:07.4');
    expect(formatRaceTime(127499)).toBe('2:07.4');
    expect(formatRaceTime(59999)).toBe('0:59.9');
    expect(formatRaceTime(600000)).toBe('10:00.0');
    expect(formatRaceTime(0)).toBe('0:00.0');
    expect(formatRaceTime(-5)).toBe('0:00.0');
  });

  it('decimals and gate splits use the language separator and U+2212 minus', () => {
    expect(formatDecimal(0.8, 1, 'tr')).toBe('0,8');
    expect(formatDecimal(0.8, 1, 'en')).toBe('0.8');
    expect(formatDecimal(1234.5, 1, 'tr')).toBe('1.234,5');
    expect(formatSplit(-420, 'tr')).toBe('−0,42');
    expect(formatSplit(1050, 'en')).toBe('+1.05');
    expect(formatSplit(3, 'tr')).toBe('±0,00');
    expect(starsText(3)).toBe('⭐⭐⭐');
    expect(starsText(0)).toBe('');
    expect(starsText(7)).toBe('⭐⭐⭐');
  });
});

describe('cards (§2.8 exact text)', () => {
  it('Günün Rotası card', () => {
    expect(dailyShareText({ lang: 'tr', index: 214, timeMs: 127400, strip: [2, 2, 3, 4, 4], stars: 3 })).toBe(
      'KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐',
    );
    expect(dailyShareText({ lang: 'en', index: 214, timeMs: 127400, strip: [2, 2, 3, 4, 4], stars: 3 })).toBe(
      'KANAT · Daily Route #214 🪂 2:07.4 · Proximity 🟨🟨🟧🟥🟥 · ⭐⭐⭐',
    );
    expect(dailyShareText({ lang: 'tr', index: 5, timeMs: 95000, strip: [0, 1, 1, 2, 0], stars: 1, assist: true })).toBe(
      'KANAT · Günün Rotası #5 🪂 1:35.0 · Yakınlık ⬜🟩🟩🟨⬜ · ⭐ 🛟',
    );
  });

  it('Günün Rotası card with the optional Düello line', () => {
    const code = encodeGhostCode(
      { simVersion: 1, mode: 1, routeRef: 214, seed: 1, assist: false, slowMode: false, guideWind: false, suitId: 0, tickCount: 10, finalTimeMs: 127400, score: 0, finalStateHash: 0, playerName: '' },
      recordCommands([{ tick: 0, actorId: 0, cmd: 'axis', args: [1, 1] }]),
    );
    const text = dailyShareText({ lang: 'tr', index: 214, timeMs: 127400, strip: [2, 2, 3, 4, 4], stars: 3, code });
    const [l1, l2] = text.split('\n');
    expect(l1).toBe('KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐');
    expect(l2).toBe(`Düello: KNT1-G214-${code.slice(3)}`);
    expect(duelLine(code, 'en').startsWith('Duel: KNT1-G214-A')).toBe(true);
  });

  it('Kariyer card', () => {
    expect(
      careerShareText({ lang: 'tr', world: 'kapadokya', routeName: { tr: 'Balon Yolu', en: 'Balloon Road' }, stars: 3, score: 48210, strip: [1, 2, 3, 3, 4] }),
    ).toBe('KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥');
    expect(
      careerShareText({ lang: 'en', world: 'kapadokya', routeName: { tr: 'Balon Yolu', en: 'Balloon Road' }, stars: 3, score: 48210, strip: [1, 2, 3, 3, 4], slowMode: true, assist: true }),
    ).toBe('KANAT · Cappadocia / Balloon Road ⭐⭐⭐ · 48,210 · Proximity 🟩🟨🟧🟧🟥 🛟 🐢');
  });

  it('SÜRÜ.io card', () => {
    expect(suruShareText({ lang: 'tr', kind: 'day', dayIndex: 214, rank: 1, total: 15, peak: 486, encircles: 2, survived: true })).toBe(
      'KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta',
    );
    expect(suruShareText({ lang: 'en', kind: 'day', dayIndex: 214, rank: 1, total: 15, peak: 486, encircles: 2, survived: true })).toBe(
      'KANAT · SÜRÜ.io · Flock Day #214 🐦 1st/15 · Peak 486 birds · 🌀 Encircle ×2 · 🌅 Survived to sunset',
    );
    expect(suruShareText({ lang: 'tr', kind: 'league', rank: 12, total: 16, peak: 1204, encircles: 0, survived: false })).toBe(
      'KANAT · SÜRÜ.io · Lig Maçı 🐦 12./16 · Zirve 1.204 kuş',
    );
    expect(suruShareText({ lang: 'en', kind: 'practice', rank: 3, total: 12, peak: 90, encircles: 0, survived: true })).toBe(
      'KANAT · SÜRÜ.io · Practice 🐦 3rd/12 · Peak 90 birds · 🌅 Survived to sunset',
    );
  });
});

describe('ghost card + duel result', () => {
  it('Turkish genitive with vowel harmony, English possessive', () => {
    expect(possessiveName('Ayşe', 'tr')).toBe('Ayşe’nin');
    expect(possessiveName('Mehmet', 'tr')).toBe('Mehmet’in');
    expect(possessiveName('Can', 'tr')).toBe('Can’ın');
    expect(possessiveName('Umut', 'tr')).toBe('Umut’un');
    expect(possessiveName('Öykü', 'tr')).toBe('Öykü’nün');
    expect(possessiveName('ILGAZ', 'tr')).toBe('ILGAZ’ın');
    expect(possessiveName('İpek', 'tr')).toBe('İpek’in');
    expect(possessiveName('Ayşe', 'en')).toBe('Ayşe’s');
    expect(possessiveName('James', 'en')).toBe('James’');
  });

  it('"Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4"', () => {
    const header = { mode: 1 as const, routeRef: 214, playerName: 'Ayşe', finalTimeMs: 127400, score: 0 };
    expect(ghostTitle({ lang: 'tr', header })).toBe('Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4');
    expect(ghostTitle({ lang: 'en', header })).toBe('Ayşe’s ghost · Daily Route #214 · 2:07.4');
    expect(ghostTitle({ lang: 'tr', header: { ...header, playerName: '' } })).toBe('Hayalet · Günün Rotası #214 · 2:07.4');
    expect(
      ghostTitle({ lang: 'tr', header: { mode: 0, routeRef: 2, playerName: 'Mehmet', finalTimeMs: 0, score: 48210 }, routeName: { tr: 'Balon Yolu', en: 'Balloon Road' } }),
    ).toBe('Mehmet’in hayaleti · Kapadokya / Balon Yolu · 48.210');
    expect(ghostTitle({ lang: 'en', header: { mode: 2, routeRef: 1, playerName: 'Can', finalTimeMs: 61000, score: 0 } })).toBe(
      'Can’s ghost · Free Flight / Lycia · 1:01.0',
    );
  });

  it('"Kazandın · 0,8 sn"', () => {
    expect(duelResultText({ lang: 'tr', metric: 'time', mine: 126600, theirs: 127400 })).toBe('Kazandın · 0,8 sn');
    expect(duelResultText({ lang: 'en', metric: 'time', mine: 128400, theirs: 127400 })).toBe('You lost · 1.0 s');
    expect(duelResultText({ lang: 'tr', metric: 'time', mine: 127440, theirs: 127400 })).toBe('Kaybettin · 0,04 sn');
    expect(duelResultText({ lang: 'tr', metric: 'time', mine: 127402, theirs: 127400 })).toBe('Berabere');
    expect(duelResultText({ lang: 'tr', metric: 'score', mine: 49450, theirs: 48210 })).toBe('Kazandın · 1.240 puan');
    expect(duelResultText({ lang: 'en', metric: 'score', mine: 48210, theirs: 48210 })).toBe('Tie');
  });
});
