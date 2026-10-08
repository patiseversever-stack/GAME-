import { describe, expect, it } from 'vitest';
import { careerShareText, dailyShareText, duelShareText, proxStripEmoji, suruShareText } from '../../src/ui/share/shareText.ts';

describe('share text (BRIEF §2.8 exact formats)', () => {
  it('daily card matches the brief example byte for byte', () => {
    expect(dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3 }, 'tr')).toBe('KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐');
  });

  it('daily card: optional duel line, 🛟 and 🐢 suffixes', () => {
    const txt = dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3, duelCode: 'KNT1-G214-abc', assisted: true, slow: true }, 'tr');
    expect(txt).toBe('KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐ 🛟 🐢\nDüello: KNT1-G214-abc');
    expect(dailyShareText({ n: 7, timeSec: 95, strip: [1, 1, 1, 1, 1], stars: 1, assisted: true }, 'tr')).toBe('KANAT · Günün Rotası #7 🪂 1:35.0 · Yakınlık 🟩🟩🟩🟩🟩 · ⭐ 🛟');
  });

  it('daily card in English', () => {
    expect(dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3, duelCode: 'KNT1-X' }, 'en')).toBe('KANAT · Daily Route #214 🪂 2:07.4 · Proximity 🟨🟨🟧🟥🟥 · ⭐⭐⭐\nDuel: KNT1-X');
  });

  it('career card matches the brief example (TR thousands separator)', () => {
    expect(careerShareText({ world: 'kapadokya', routeId: 'w1r3', stars: 3, score: 48210, strip: [1, 2, 3, 3, 5] }, 'tr')).toBe('KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥');
    expect(careerShareText({ world: 'kapadokya', routeId: 'w1r3', stars: 3, score: 48210, strip: [1, 2, 3, 3, 5] }, 'en')).toBe('KANAT · Cappadocia / Balloon Road ⭐⭐⭐ · 48,210 · Proximity 🟩🟨🟧🟧🟥');
  });

  it('SÜRÜ.io card matches the brief example', () => {
    expect(suruShareText({ sub: 'day', n: 214, place: 1, flocks: 15, peak: 486, encircles: 2, survived: true }, 'tr')).toBe('KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta');
    expect(suruShareText({ sub: 'league', place: 3, flocks: 14, peak: 1204, encircles: 0, survived: false }, 'tr')).toBe('KANAT · SÜRÜ.io · Lig Maçı 🐦 3./14 · Zirve 1.204 kuş');
    expect(suruShareText({ sub: 'day', n: 214, place: 2, flocks: 15, peak: 486, encircles: 1, survived: true }, 'en')).toBe('KANAT · SÜRÜ.io · Flock Day #214 🐦 2nd/15 · Peak 486 birds · 🌀 Encircle ×1 · 🌅 Survived to sunset');
  });

  it('duel invite is a human sentence with the deep link (GDD §5.3)', () => {
    const link = 'https://kanat.example/?c=KNT1-G214-abc';
    expect(duelShareText({ name: 'Ayşe', route: { kind: 'daily', n: 214 }, metric: { kind: 'time', sec: 127.46 }, link }, 'tr')).toBe(`Ayşe seni KANAT’ta düelloya çağırdı · Günün Rotası #214 · 2:07.4 → ${link}`);
    expect(duelShareText({ route: { kind: 'career', routeId: 'w1r3' }, metric: { kind: 'score', value: 48210 }, link }, 'en')).toBe(`Up for a KANAT duel? · Balloon Road · 48,210 → ${link}`);
    expect(dailyShareText({ n: 214, timeSec: 127.46, strip: [2, 2, 3, 5, 5], stars: 3, duelCode: 'KNT1-x', duelLink: link }, 'tr').split('\n')).toEqual(['KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐', `Düello: ${link}`]);
    expect(suruShareText({ sub: 'daily', n: 214, place: 1, flocks: 15, peak: 486, encircles: 2, survived: true }, 'tr')).toBe('KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta');
  });

  it('proximity strip maps tiers and pads to five segments', () => {
    expect(proxStripEmoji([0, 1, 2, 3, 5])).toBe('⬜🟩🟨🟧🟥');
    expect(proxStripEmoji([5])).toBe('🟥⬜⬜⬜⬜');
    expect(proxStripEmoji([4, 9, -1, 2, 2])).toBe('⬜⬜⬜🟨🟨');
  });
});
