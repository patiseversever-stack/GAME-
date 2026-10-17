// Pişti botu denetimi: hile yok (deste sırası, kapalı masa kartları, rakip eli bilinmez), "salak" hamle yok, düşünme süresi
// kararın zorluğuna göre, 1'e 1 / 4 kişi / eşli oyun kalitesi. Ölçümler: tests/pistiAudit.ts, docs/BOTS.md.
import {describe, expect, it} from 'vitest';
import {PistiBot, type BotPersonality} from '../src/ai/bot';
import {applyPlay, createGame, viewFor} from '../src/core/pisti';
import {HIDDEN_CARD, pistiEngine} from '../src/core/pistiEngine';
import {mulberry32} from '../src/core/rng';
import {cardId as C, type CardId, type PistiConfig, type PistiEvent, type PistiState, type PlayerView} from '../src/core/types';
import {LocalHost} from '../src/net/host';
import {VirtualClock} from '../src/net/clock';
import {PistiBotBrain} from '../src/net/pistiLocal';
import {auditPistiGame, botPlayer, humanProxy} from './pistiAudit';

/** Kadrodaki kişilikler (src/game/roster.ts ile aynı). */
const P: Record<string, BotPersonality> = {
  dursun: {memory: 0.62, skill: 0.62, jackPatience: 0.5},
  cem: {memory: 0.72, skill: 0.72, jackPatience: 0.5},
  riza: {memory: 0.88, skill: 0.85, jackPatience: 0.75},
  defne: {memory: 0.97, skill: 0.95, jackPatience: 0.85},
};
const CFGS: PistiConfig[] = [
  {seats: 2, teams: [0, 1], dealer: 1, seed: 0},
  {seats: 4, teams: [0, 1, 2, 3], dealer: 0, seed: 0},
  {seats: 4, teams: [0, 1, 0, 1], dealer: 3, seed: 0},
];

describe('Pişti botu: hile yok', () => {
  it('ham olay (match.ts) ile süzülmüş olay (çevrimiçi) aynı kararları verir: gizli kartlara bakmaz', () => {
    for (let i = 0; i < 90; i++) {
      const cfg = {...CFGS[i % 3], seed: 500 + i};
      const run = (redacted: boolean): CardId[] => {
        const g = createGame(cfg);
        let s = g.state;
        const bots = Array.from({length: cfg.seats}, (_, seat) => new PistiBot(seat, P.defne, mulberry32(i * 13 + seat)));
        const feed = (evs: PistiEvent[]) => {
          for (const e of evs) bots.forEach((b, seat) => {
            const x = redacted ? pistiEngine.redact(e, seat) : e;
            if (x) b.observe(x);
          });
        };
        feed(g.events);
        const out: CardId[] = [];
        while (!s.over) {
          const card = bots[s.turn].choose(viewFor(s, s.turn));
          out.push(card);
          const r = applyPlay(s, s.turn, card);
          s = r.state;
          feed(r.events);
        }
        return out;
      };
      expect(run(false)).toEqual(run(true));
    }
  });

  it('deste sırası ve rakip eli değişse de (görünüm + geçmiş aynıyken) karar aynı', () => {
    for (let i = 0; i < 60; i++) {
      const cfg = {...CFGS[i % 3], seed: 900 + i};
      const g = createGame(cfg);
      let s = g.state;
      const hist: PistiEvent[] = [...g.events];
      const steps = 3 + (i % 9);
      for (let k = 0; k < steps && !s.over; k++) {
        const r = applyPlay(s, s.turn, s.hands[s.turn][0]);
        hist.push(...r.events);
        s = r.state;
      }
      if (s.over) continue;
      const seat = s.turn;
      // gizli kısmı karıştır: deste + diğerlerinin elleri (kart sayıları aynı)
      const alt: PistiState = JSON.parse(JSON.stringify(s));
      const pool = [...alt.deck];
      for (let o = 0; o < alt.cfg.seats; o++) if (o !== seat) pool.push(...alt.hands[o]);
      const rnd = mulberry32(i);
      for (let a = pool.length - 1; a > 0; a--) {
        const b = Math.floor(rnd() * (a + 1));
        [pool[a], pool[b]] = [pool[b], pool[a]];
      }
      alt.deck = pool.splice(0, alt.deck.length);
      for (let o = 0; o < alt.cfg.seats; o++) if (o !== seat) alt.hands[o] = pool.splice(0, alt.hands[o].length);
      expect(viewFor(alt, seat)).toEqual(viewFor(s, seat));
      const mk = () => {
        const b = new PistiBot(seat, P.riza, mulberry32(7));
        for (const e of hist) {
          const x = pistiEngine.redact(e, seat);
          if (x) b.observe(x);
        }
        return b;
      };
      expect(mk().choose(viewFor(alt, seat))).toBe(mk().choose(viewFor(s, seat)));
    }
  });

  it('ev sahibi üzerinden bot beyni yalnız kendi kartlarını ve açık masa kartını görür', () => {
    const cfg: PistiConfig = {seats: 4, teams: [0, 1, 0, 1], dealer: 2, seed: 31};
    const clock = new VirtualClock();
    const seen: PistiEvent[][] = [[], [], [], []];
    const brains = [0, 1, 2, 3].map((s) => {
      const b = new PistiBotBrain(s, P.cem, 100 + s);
      const orig = b.observe.bind(b);
      b.observe = (e: PistiEvent) => {
        seen[s].push(e);
        orig(e);
      };
      return b;
    });
    const host = new LocalHost(pistiEngine, cfg, {seats: brains.map((brain) => ({kind: 'bot' as const, brain})), clock});
    host.start();
    clock.runAll();
    expect(host.over).toBe(true);
    seen.forEach((evs, seat) => {
      for (const e of evs) {
        if (e.t === 'handDeal') for (const d of e.deals) expect(d.seat === seat ? d.card >= 0 : d.card === HIDDEN_CARD).toBe(true);
        if (e.t === 'tableDeal') e.cards.forEach((c, k) => expect(e.faceUp[k] ? c >= 0 : c === HIDDEN_CARD).toBe(true));
      }
    });
  });
});

describe('Pişti botu: salak hamle yok', () => {
  const view = (pile: CardId[], hand: CardId[], deck = 30): PlayerView => {
    const st: PistiState = {
      cfg: {seats: 2, teams: [0, 1], dealer: 1, seed: 1},
      deck: Array.from({length: deck}, (_, i) => i),
      pile,
      pileHiddenCount: 0,
      hands: [hand, [0, 1, 2, 3]],
      captured: [[], []],
      pistiPoints: [0, 0],
      turn: 0,
      lastCapturer: -1,
      round: 2,
      over: false,
    };
    return viewFor(st, 0);
  };

  it('Valeyi riski az bir kart varken boş yere (boş yığına) bırakmaz — diğer Valeler görülmüş olsa bile', () => {
    for (const who of ['cem', 'riza', 'defne'] as const) {
      let jack = 0;
      for (let s = 0; s < 40; s++) {
        const b = new PistiBot(0, P[who], mulberry32(s));
        // üç Vale görüldü (Vale piştisi riski yok), elde Vale + bir 6 (üç 6 görülmedi, ama deste kalabalık: risk düşük)
        for (const c of [C('H', 11), C('D', 11), C('C', 11)]) b.observe({t: 'play', seat: 1, card: c});
        if (b.choose(view([], [C('S', 11), C('D', 6)])) === C('S', 11)) jack++;
      }
      expect(jack / 40).toBeLessThan(who === 'cem' ? 0.25 : 0.05);
    }
  });

  it('düşünme süresi kararın zorluğuna göre: tek kart / apaçık pişti kısa, başa baş seçim uzun', () => {
    const b = new PistiBot(0, P.defne, mulberry32(1));
    b.choose(view([C('H', 7)], [C('S', 7)]));
    expect(b.thinkScale()).toBeCloseTo(0.7, 5);
    b.choose(view([C('H', 7)], [C('S', 7), C('D', 2), C('C', 9)]));
    expect(b.thinkScale()).toBeLessThan(0.8); // pişti apaçık
    b.choose(view([C('H', 4), C('D', 9)], [C('S', 3), C('C', 5), C('H', 8)]));
    expect(b.thinkScale()).toBeGreaterThan(0.95); // üç değersiz kart: başa baş
  });

  it('bütün modlarda: pişti kaçırmaz; güçlü kişilikler Valeyi ucuz yığına harcamaz; skor dağılımı makul', () => {
    for (const cfg0 of CFGS) {
      for (const who of ['dursun', 'riza', 'defne'] as const) {
        let missed = 0;
        let cheap = 0;
        let plays = 0;
        let pisti = 0;
        let human = 0;
        let bot = 0;
        const N = 150;
        for (let i = 0; i < N; i++) {
          const cfg = {...cfg0, seed: 7000 + i, dealer: i % cfg0.seats};
          const players = Array.from({length: cfg.seats}, (_, s) => (s === 0 ? humanProxy(i) : botPlayer(s, P[who], i * 31 + s)));
          const m = auditPistiGame(cfg, players, players.map((_, s) => s !== 0));
          for (let s = 1; s < cfg.seats; s++) {
            missed += m.missedPisti[s];
            cheap += m.cheapJack[s];
          }
          plays += m.plays;
          pisti += m.pisti.reduce((a, b) => a + b, 0);
          human += m.totals[cfg.teams[0]];
          bot += m.totals.filter((_, k) => k !== cfg.teams[0]).reduce((a, b) => a + b, 0) / (m.totals.length - 1);
          expect(m.cards.reduce((a, b) => a + b, 0)).toBe(52);
        }
        expect(missed).toBe(0);
        if (who !== 'dursun') expect(cheap / plays).toBeLessThan(0.002);
        // elde ortalama ~1 pişti (her modda), güçlü bot sıradan oyuncudan çok puan toplar
        expect(pisti / N).toBeGreaterThan(0.6);
        expect(pisti / N).toBeLessThan(1.8);
        if (who === 'defne') expect(bot / N).toBeGreaterThan(human / N);
      }
    }
  }, 60_000);
});
