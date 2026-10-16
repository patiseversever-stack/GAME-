import {describe, expect, it} from 'vitest';
import {BOT_LEVEL, blofXp, buildSetup, payout, receive, type SetupProfile} from '../src/game/setup';
import {GAME_INFO, MODE_INFO, matchTitle, pistiInfo, type Mode} from '../src/game/types';
import {normalizeBlofOutcome} from '../src/game/blofAdapter';
import type {CharId} from '../src/game/roster';

const prof = (char: CharId | null = 'dursun', blofPlayed = true): SetupProfile => ({data: {char, name: 'Deneme', level: 7}, playedBlof: blofPlayed});

describe('mod bilgisi', () => {
  it('Blöf dört modu, Pişti üçünü oynar; 3 kişi yalnız Blöf', () => {
    expect(GAME_INFO.pisti.modes).toEqual(['1v1', '4', 'esli']);
    expect(GAME_INFO.blof.modes).toEqual(['1v1', '3', '4', 'esli']);
    expect(MODE_INFO['3'].seats).toBe(3);
    expect(MODE_INFO['3'].teams).toEqual([0, 1, 2]);
    expect(matchTitle('blof', '3')).toBe('Blöf · 3 Kişi');
    expect(matchTitle('pisti', '1v1')).toBe("Pişti · 1'e 1");
  });
  it('Pişti motoru 3 kişiyi reddeder, diğerlerini 2/4 koltukla verir', () => {
    expect(() => pistiInfo('3')).toThrow();
    expect(pistiInfo('1v1').seats).toBe(2);
    expect(pistiInfo('4').seats).toBe(4);
    expect(pistiInfo('esli').teams).toEqual([0, 1, 0, 1]);
  });
});

describe('buildSetup', () => {
  it('Blöf 3 kişi: üç koltuk, insan 0, iki bot, herkes kendi takımında', () => {
    const s = buildSetup(prof(), '3', ['cem', 'defne'], 2, 'klasik', 11, {game: 'blof', difficulty: 'zor'});
    expect(s.game).toBe('blof');
    expect(s.mode).toBe('3');
    expect(s.difficulty).toBe('zor');
    expect(s.players.map(p => p.seat)).toEqual([0, 1, 2]);
    expect(s.players.map(p => p.human)).toEqual([true, false, false]);
    expect(s.players.map(p => p.team)).toEqual([0, 1, 2]);
    expect(s.players.map(p => p.char.id)).toEqual(['dursun', 'cem', 'defne']);
    expect(s.players[1].level).toBe(BOT_LEVEL.cem);
    expect(s.dealer).toBe(2);
    expect(s.seed).toBe(11);
    expect(s.tutorial).toBe(false);
  });

  it('Pişti kurulumu eskisi gibi: oyun pisti, zorluk/öğretici yok', () => {
    const s = buildSetup(prof(), '4', ['cem', 'riza', 'defne'], 0, 'havai');
    expect(s.game).toBe('pisti');
    expect(s.players.map(p => p.char.id)).toEqual(['dursun', 'cem', 'riza', 'defne']);
    expect(s.difficulty).toBeUndefined();
    expect(s.tutorial).toBeUndefined();
    const e = buildSetup(prof(), 'esli', ['cem', 'defne', 'riza'], 1, 'klasik');
    expect(e.players.map(p => p.team)).toEqual([0, 1, 0, 1]);
  });

  it('1\'e 1 Blöf: varsayılan zorluk orta; eksik rakip kadrodan tamamlanır, insanın karakteri tekrarlanmaz', () => {
    const s = buildSetup(prof('cem'), '1v1', [], 0, 'klasik', undefined, {game: 'blof'});
    expect(s.difficulty).toBe('orta');
    expect(s.players).toHaveLength(2);
    expect(s.players[1].char.id).not.toBe('cem');
    const t = buildSetup(prof('riza'), '3', ['riza', 'riza'], 0, 'klasik', undefined, {game: 'blof'});
    expect(new Set(t.players.map(p => p.char.id)).size).toBe(3);
  });

  it('ilk Blöf elinde Rıza Amca karşıda oturur ve öğretici işaretlenir; sonra değil', () => {
    const first = buildSetup(prof('dursun', false), '1v1', ['cem'], 0, 'klasik', undefined, {game: 'blof'});
    expect(first.tutorial).toBe(true);
    expect(first.players[1].char.id).toBe('riza');
    const three = buildSetup(prof('dursun', false), '3', ['cem', 'defne'], 0, 'klasik', undefined, {game: 'blof'});
    expect(three.players.map(p => p.char.id)).toEqual(['dursun', 'riza', 'cem']);
    const later = buildSetup(prof('dursun', true), '1v1', ['cem'], 0, 'klasik', undefined, {game: 'blof'});
    expect(later.tutorial).toBe(false);
    expect(later.players[1].char.id).toBe('cem');
    // Pişti'de öğretici hiç yok
    expect(buildSetup(prof('dursun', false), '1v1', ['cem'], 0, 'klasik').tutorial).toBeUndefined();
  });

  it('insan Rıza ise öğretici Rıza\'yı karşıya koymaz', () => {
    const s = buildSetup(prof('riza', false), '1v1', ['cem'], 0, 'klasik', undefined, {game: 'blof'});
    expect(s.tutorial).toBe(true);
    expect(s.players[1].char.id).toBe('cem');
  });
});

describe('ekonomi', () => {
  it('pot: 1\'e 1 ve eşli 2×, 3 kişi 3×, 4 kişi 4×', () => {
    expect(payout('1v1', 500)).toBe(1000);
    expect(payout('esli', 500)).toBe(1000);
    expect(payout('3', 500)).toBe(1500);
    expect(payout('4', 500)).toBe(2000);
  });
  it('kazanan potu alır, kaybeden 0; Pişti beraberliği iade (Blöf\'te beraberlik yok)', () => {
    for (const m of ['1v1', '3', '4', 'esli'] as Mode[]) {
      expect(receive(m, 100, 'win', 1)).toBe(payout(m, 100));
      expect(receive(m, 100, 'lose', 1)).toBe(0);
    }
    expect(receive('1v1', 100, 'draw', 2)).toBe(100);
    expect(receive('4', 100, 'draw', 2)).toBe(200); // 4 kişide beraberlikte pot bölünür (Pişti)
  });
  it('Blöf XP: kalabalık masa çarpanı, yakalanan blöf başına +6 (en çok 10)', () => {
    expect(blofXp('1v1', 'win', 0)).toBe(60);
    expect(blofXp('3', 'win', 0)).toBe(69);
    expect(blofXp('4', 'lose', 0)).toBe(25);
    expect(blofXp('1v1', 'lose', 3)).toBe(38);
    expect(blofXp('1v1', 'win', 99)).toBe(120);
  });
});

describe('BlofMatch sonucunu normalleştirme', () => {
  const setup = buildSetup(prof(), '3', ['cem', 'defne'], 0, 'klasik', undefined, {game: 'blof'});
  it('BlofResult (core/blofTypes) içeren Pişti benzeri sonuç: handCounts + stats[]', () => {
    const o = normalizeBlofOutcome({outcome: 'win', result: {winner: 0, winners: [0], handCounts: [0, 3, 5], stats: [
      {bluffs: 4, caught: 2, timesCaught: 1, wrongChallenges: 0, pilesTaken: 2}, {bluffs: 1, caught: 0, timesCaught: 0, wrongChallenges: 1}, {},
    ]}}, setup);
    expect(o.outcome).toBe('win');
    expect(o.winner).toBe(0);
    expect(o.seats).toHaveLength(3);
    expect(o.seats[0]).toEqual({seat: 0, left: 0, bluffs: 4, caught: 2, timesCaught: 1, wrongChallenges: 0});
    expect(o.seats[1]).toMatchObject({left: 3, wrongChallenges: 1});
    expect(o.seats[2]).toMatchObject({left: 5, bluffs: 0});
  });
  it('BlofResult tek başına da kabul edilir; sonuç kazananın takımından çıkarılır', () => {
    const o = normalizeBlofOutcome({winner: 2, handCounts: [4, 2, 0], stats: [{}, {}, {}]}, setup);
    expect(o.winner).toBe(2);
    expect(o.outcome).toBe('lose');
    expect(o.seats[0].left).toBe(4);
  });
  it('sadeleştirilmiş biçim: {winner, seats:[…]}', () => {
    const o = normalizeBlofOutcome({winner: 0, seats: [{left: 0, bluffs: 3, caught: 1, timesCaught: 2, wrongChallenges: 1}, {}, {}]}, setup);
    expect(o.outcome).toBe('win');
    expect(o.seats[0]).toEqual({seat: 0, left: 0, bluffs: 3, caught: 1, timesCaught: 2, wrongChallenges: 1});
  });
  it('eşlide ortağın kazanması benim de kazanmamdır', () => {
    const es = buildSetup(prof(), 'esli', ['cem', 'defne', 'riza'], 0, 'klasik', undefined, {game: 'blof'});
    expect(normalizeBlofOutcome({winner: 2}, es).outcome).toBe('win');
    expect(normalizeBlofOutcome({winner: 3}, es).outcome).toBe('lose');
  });
  it('bozuk girdide patlamaz', () => {
    expect(normalizeBlofOutcome(null, setup).seats).toHaveLength(3);
    expect(normalizeBlofOutcome('x', setup).winner).toBe(0);
    expect(normalizeBlofOutcome({winner: 99}, setup).winner).toBe(0);
  });
});
