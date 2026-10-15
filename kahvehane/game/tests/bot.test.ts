import {describe, expect, it} from 'vitest';
import {PistiBot, type BotPersonality} from '../src/ai/bot';
import {applyPlay, createGame, viewFor} from '../src/core/pisti';
import {mulberry32} from '../src/core/rng';
import {
  cardId as C,
  type CardId,
  type GameResult,
  type PistiConfig,
  type PistiEvent,
  type PistiState,
  type PlayerView,
} from '../src/core/types';

interface Player {
  choose(view: PlayerView): CardId;
  observe?(ev: PistiEvent): void;
}

const STRONG: BotPersonality = {memory: 1, skill: 1, jackPatience: 0.6};

const bot = (seat: number, p: BotPersonality, seed: number): PistiBot => new PistiBot(seat, p, mulberry32(seed * 31 + seat));

function randomPlayer(seed: number): Player {
  const rnd = mulberry32(seed);
  return {choose: (v) => v.hand[Math.floor(rnd() * v.hand.length)]};
}

/** Oyuncularla bir oyun oynar; her hamlede botun seçtiği kartın elde olduğunu da doğrular. */
function playGame(cfg: PistiConfig, players: Player[]): {result: GameResult; events: PistiEvent[]} {
  const g = createGame(cfg);
  let state = g.state;
  const events = [...g.events];
  const feed = (evs: PistiEvent[]) => {
    for (const p of players) if (p.observe) for (const e of evs) p.observe(e);
  };
  feed(g.events);
  while (!state.over) {
    const seat = state.turn;
    const card = players[seat].choose(viewFor(state, seat));
    if (!state.hands[seat].includes(card)) throw new Error(`Eldeki olmayan kart: ${card}`);
    const r = applyPlay(state, seat, card);
    feed(r.events);
    events.push(...r.events);
    state = r.state;
  }
  const last = events[events.length - 1];
  if (last.t !== 'gameOver') throw new Error('gameOver bekleniyordu');
  return {result: last.result, events};
}

const botPlayer = (b: PistiBot): Player => ({choose: (v) => b.choose(v), observe: (e) => b.observe(e)});

/** Elle kurulan durumdan bir koltuğun görünümü. */
function viewOf(over: Partial<PistiState> & {hands: CardId[][]}, seat = 0): PlayerView {
  const st: PistiState = {
    cfg: {seats: 2, teams: [0, 1], dealer: 1, seed: 1},
    deck: Array.from({length: 20}, (_, i) => i), // yalnızca deckCount için
    pile: [],
    pileHiddenCount: 0,
    captured: [[], []],
    pistiPoints: [0, 0],
    turn: seat,
    lastCapturer: -1,
    round: 2,
    over: false,
    ...over,
  };
  return viewFor(st, seat);
}

const see = (b: PistiBot, seat: number, cards: CardId[]) => {
  for (const card of cards) b.observe({t: 'play', seat, card});
};

describe('bot.observe: yalnızca meşru bilgi', () => {
  it('kendi kartlarını ve açık masa kartını bilir; rakip eli ve kapalı kartları bilmez', () => {
    const b = bot(0, STRONG, 1);
    b.observe({t: 'tableDeal', cards: [10, 11, 12, 13], faceUp: [false, false, false, true]});
    b.observe({
      t: 'handDeal',
      round: 1,
      deals: [
        {seat: 1, card: 20},
        {seat: 0, card: 21},
        {seat: 1, card: 22},
        {seat: 0, card: 23},
      ],
    });
    expect([10, 11, 12].map((c) => b.knows(c))).toEqual([false, false, false]);
    expect(b.knows(13)).toBe(true);
    expect([20, 22].map((c) => b.knows(c))).toEqual([false, false]);
    expect([21, 23].map((c) => b.knows(c))).toEqual([true, true]);
  });

  it('oynanan kartı memory=1 ile hatırlar, memory=0 ile hatırlamaz; capture/finalSweep bilgi vermez', () => {
    const perfect = bot(0, {...STRONG, memory: 1}, 1);
    const blind = bot(0, {...STRONG, memory: 0}, 1);
    for (const b of [perfect, blind]) {
      b.observe({t: 'play', seat: 1, card: 30});
      b.observe({t: 'capture', seat: 1, cards: [10, 11, 12, 30], pisti: 0});
      b.observe({t: 'finalSweep', seat: 1, cards: [40, 41]});
    }
    expect(perfect.knows(30)).toBe(true);
    expect(blind.knows(30)).toBe(false);
    for (const c of [10, 11, 12, 40, 41]) {
      expect(perfect.knows(c)).toBe(false);
      expect(blind.knows(c)).toBe(false);
    }
  });

  it('memory kısmi iken kartların kabaca o oranı hatırlanır', () => {
    const b = bot(0, {...STRONG, memory: 0.5}, 7);
    const all = Array.from({length: 52}, (_, i) => i);
    see(b, 1, all);
    const n = all.filter((c) => b.knows(c)).length;
    expect(n).toBeGreaterThan(14);
    expect(n).toBeLessThan(38);
  });
});

describe('bot.choose: hamle kalitesi', () => {
  const hands = (h0: CardId[]) => [h0, [0, 1, 2, 3]];

  it('pişti fırsatını alır', () => {
    const v = viewOf({pile: [C('H', 7)], hands: hands([C('D', 2), C('S', 7), C('C', 9), C('H', 12)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('S', 7));
  });

  it('Vale pişti (20) için Valeyi oynar', () => {
    const v = viewOf({pile: [C('H', 11)], hands: hands([C('D', 5), C('S', 11), C('C', 9), C('H', 12)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('S', 11));
  });

  it('ucuz tek karta Vale harcamaz', () => {
    const v = viewOf({pile: [C('H', 13)], hands: hands([C('S', 11), C('D', 3)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('D', 3));
  });

  it('değerli yığını Vale ile alır', () => {
    const pile = [C('D', 10), C('S', 1), C('C', 2), C('H', 5)];
    const v = viewOf({pile, pileHiddenCount: 0, hands: hands([C('S', 11), C('D', 3)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('S', 11));
  });

  it('aynı değerle yakalama varken Valeyi saklar', () => {
    const pile = [C('H', 4), C('D', 9)];
    const v = viewOf({pile, hands: hands([C('S', 11), C('S', 9), C('C', 3)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('S', 9));
  });

  it('kart sayma: tüm kopyaları görülen değeri güvenle bırakır', () => {
    // 9'ların hepsi görüldü (üçü oynandı, biri elde) → 9 risksiz; 5'ler gizli → riskli.
    // Eşitlikte düşük id (5) seçilirdi; sayma çalışıyorsa 9 seçilmeli.
    const b = bot(0, STRONG, 1);
    see(b, 1, [C('H', 9), C('D', 9), C('C', 9)]);
    const v = viewOf({pile: [], hands: hands([C('S', 5), C('S', 9)])});
    expect(b.choose(v)).toBe(C('S', 9));
    // Hiçbir şey hatırlamayan bot aynı durumda eşitliği id ile bozar
    const blind = bot(0, {...STRONG, memory: 0}, 1);
    see(blind, 1, [C('H', 9), C('D', 9), C('C', 9)]);
    expect(blind.choose(v)).toBe(C('S', 5));
  });

  it('boş yığına Vale koymaz (Vale pişti riski)', () => {
    const v = viewOf({pile: [], hands: hands([C('S', 11), C('D', 4)])});
    expect(bot(0, STRONG, 1).choose(v)).toBe(C('D', 4));
  });

  it('takım arkadaşından risk saymaz, sıradaki rakipten sayar', () => {
    // 4 koltuk, eşli: koltuk 0 için rakipler 1 ve 3, takım arkadaşı 2.
    const cfg: PistiConfig = {seats: 4, teams: [0, 1, 0, 1], dealer: 3, seed: 1};
    const mkView = (counts: number[]) =>
      ({
        ...viewOf({cfg, pile: [C('H', 8)], hands: [[C('S', 5), C('S', 9)], [], [], []]}),
        handCounts: counts,
      }) satisfies PlayerView;
    const b = bot(0, STRONG, 1);
    see(b, 1, [C('H', 9), C('D', 9), C('C', 9)]); // 9 güvenli, 5 riskli
    // Rakiplerin eli boş, arkadaşın eli dolu → risk yok → eşitlik, düşük id (5)
    expect(b.choose(mkView([2, 0, 4, 0]))).toBe(C('S', 5));
    // Sıradaki rakipte kart var → 5 riskli, 9 güvenli
    expect(b.choose(mkView([2, 4, 0, 0]))).toBe(C('S', 9));
  });

  it('skill=1 deterministik; skill=0 gürültülü ama hep elden seçer', () => {
    const v = viewOf({pile: [C('H', 5)], hands: hands([C('D', 2), C('S', 5), C('C', 9), C('H', 12)])});
    const picks = new Set<CardId>();
    for (let i = 0; i < 50; i++) picks.add(bot(0, STRONG, i).choose(v));
    expect(picks).toEqual(new Set([C('S', 5)]));

    const noisy = new Set<CardId>();
    for (let i = 0; i < 300; i++) {
      const c = bot(0, {memory: 1, skill: 0, jackPatience: 0.5}, i).choose(v);
      expect(v.hand).toContain(c);
      noisy.add(c);
    }
    expect(noisy.size).toBeGreaterThan(1);
  });

  it('boş elde hata fırlatır', () => {
    expect(() => bot(0, STRONG, 1).choose(viewOf({hands: [[], []]}))).toThrow();
  });
});

describe('bot oyunları', () => {
  const PERSONALITIES: BotPersonality[] = [
    {memory: 1, skill: 1, jackPatience: 0.6},
    {memory: 0.5, skill: 0.7, jackPatience: 0.3},
    {memory: 0, skill: 0, jackPatience: 1},
    {memory: 0.8, skill: 0.4, jackPatience: 0},
  ];

  it('aynı tohum → aynı bot oyunu', () => {
    const run = () => {
      const cfg: PistiConfig = {seats: 4, teams: [0, 1, 0, 1], dealer: 1, seed: 77};
      return playGame(cfg, [0, 1, 2, 3].map((s) => botPlayer(bot(s, PERSONALITIES[s], 77)))).events;
    };
    expect(run()).toEqual(run());
  });

  it('2000 bot-bot oyunu hatasız ve hızlı biter (2/4 koltuk, tekli/eşli)', () => {
    const cfgs: Omit<PistiConfig, 'seed'>[] = [
      {seats: 2, teams: [0, 1], dealer: 1},
      {seats: 4, teams: [0, 1, 2, 3], dealer: 0},
      {seats: 4, teams: [0, 1, 0, 1], dealer: 3},
      {seats: 2, teams: [0, 1], dealer: 0},
    ];
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) {
      const cfg = {...cfgs[i % cfgs.length], seed: i + 1};
      const players = Array.from({length: cfg.seats}, (_, s) => botPlayer(bot(s, PERSONALITIES[(i + s) % PERSONALITIES.length], i)));
      const {result} = playGame(cfg, players);
      expect(result.winners.length).toBeGreaterThan(0);
      expect(result.sides.reduce((a, s) => a + s.cards, 0)).toBe(52);
    }
    expect(performance.now() - t0).toBeLessThan(10_000);
  });

  it('bot (skill 1, memory 1) rastgele oyuncuyu açık farkla yener (2 kişi)', () => {
    const N = 600;
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const botSeat = i % 2; // yer avantajını dengele
      const cfg: PistiConfig = {seats: 2, teams: [0, 1], dealer: (i >> 1) % 2, seed: 1000 + i};
      const players: Player[] = [];
      players[botSeat] = botPlayer(bot(botSeat, STRONG, i));
      players[1 - botSeat] = randomPlayer(i + 5);
      const {result} = playGame(cfg, players);
      const mine = result.sides[botSeat].total;
      const theirs = result.sides[1 - botSeat].total;
      if (mine > theirs) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.65);
  });

  it('eşli oyunda 2 bot takımı 2 rastgele oyuncu takımını yener', () => {
    const N = 300;
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const botTeam = i % 2;
      const cfg: PistiConfig = {seats: 4, teams: [0, 1, 0, 1], dealer: (i >> 1) % 4, seed: 5000 + i};
      const players: Player[] = [];
      for (let s = 0; s < 4; s++) players[s] = s % 2 === botTeam ? botPlayer(bot(s, STRONG, i)) : randomPlayer(i * 4 + s);
      const {result} = playGame(cfg, players);
      if (result.sides[botTeam].total > result.sides[1 - botTeam].total) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.65);
  });

  it('güçlü bot, zayıf (düşük memory/skill) bottan daha çok kazanır', () => {
    const N = 400;
    const weak: BotPersonality = {memory: 0.1, skill: 0.3, jackPatience: 0};
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < N; i++) {
      const strongSeat = i % 2;
      const cfg: PistiConfig = {seats: 2, teams: [0, 1], dealer: (i >> 1) % 2, seed: 9000 + i};
      const players: Player[] = [];
      players[strongSeat] = botPlayer(bot(strongSeat, STRONG, i));
      players[1 - strongSeat] = botPlayer(bot(1 - strongSeat, weak, i + 3));
      const {result} = playGame(cfg, players);
      const d = result.sides[strongSeat].total - result.sides[1 - strongSeat].total;
      if (d > 0) wins++;
      else if (d < 0) losses++;
    }
    expect(wins).toBeGreaterThan(losses);
  });
});
