import {describe, expect, it} from 'vitest';
import {BlofBot} from '../src/ai/blofBot';
import {applyBlof, createBlof} from '../src/core/blof';
import {blofEngine} from '../src/core/blofEngine';
import type {BlofAction, BlofConfig, BlofEvent, BlofState, BlofView} from '../src/core/blofTypes';
import {applyPlay, createGame, viewFor as pistiView} from '../src/core/pisti';
import {pistiEngine} from '../src/core/pistiEngine';
import {mulberry32} from '../src/core/rng';
import type {PistiConfig, PistiEvent} from '../src/core/types';
import {PistiBot, type BotPersonality} from '../src/ai/bot';
import {type BlofClient, type BlofServerMsg, createBlofLocal} from '../src/net/blofLocal';
import {VirtualClock} from '../src/net/clock';
import {GameClient} from '../src/net/client';
import {LocalHost} from '../src/net/host';
import {PistiBotBrain} from '../src/net/pistiLocal';
import {LocalTransport} from '../src/net/transport';

/** İstemciye gelen tüm mesajları biriktirir. */
function record(client: BlofClient): BlofServerMsg[] {
  const out: BlofServerMsg[] = [];
  client.on((m) => out.push(m));
  return out;
}

const lastEvents = (msgs: BlofServerMsg[]): Extract<BlofServerMsg, {t: 'events'}> | undefined =>
  [...msgs].reverse().find((m): m is Extract<BlofServerMsg, {t: 'events'}> => m.t === 'events');

/** Bir botu istemci üzerinden "insan" gibi sürer (arayüzün ?auto=1 modu gibi): olayları sunar, ack'ler, karar verir. */
function autoPilot(client: BlofClient, clock: VirtualClock, bot: BlofBot): void {
  const think = (view: BlofView) => {
    const d = bot.decide(view);
    if (!d) return;
    const move = view.move;
    clock.set(() => {
      if (client.view && client.view.move === move && !client.view.over) client.act(d.action);
    }, d.delayMs);
  };
  client.on((m) => {
    if (m.t === 'events') {
      for (const e of m.events) bot.observe(e);
      client.ack(m.seq);
      think(m.view);
    } else if (m.t === 'sync') think(m.view);
  });
}

describe('LocalHost: yalnız botlar', () => {
  const cfgs: BlofConfig[] = [
    {seats: 2, seed: 3, firstSeat: 0},
    {seats: 3, seed: 4, firstSeat: 2},
    {seats: 4, seed: 5, firstSeat: 1},
    {seats: 4, teams: [0, 1, 0, 1], seed: 6, firstSeat: 3},
  ];
  for (const cfg of cfgs) {
    it(`${cfg.seats} koltuk${cfg.teams ? ' eşli' : ''}: oyun biter; hamle kaydı aynı sonucu yeniden üretir`, async () => {
      const clock = new VirtualClock();
      const {host, client} = createBlofLocal({cfg, seats: Array.from({length: cfg.seats}, (_, i) => (['kolay', 'orta', 'zor'] as const)[i % 3]), clock});
      expect(client).toBeNull();
      host.start();
      clock.runAll();
      expect(host.over).toBe(true);
      const final = await host.done;
      expect(final.phase).toBe('over');
      // Tekrar oynatma: create(maçın etkin ayarı: koltuk türleri yazılmış) + kayıtlı hamleler → aynı durum
      expect(host.cfg.humanSeats).toEqual(new Array(cfg.seats).fill(false));
      let s: BlofState = createBlof(host.cfg).state;
      for (const a of host.actions) {
        const r = applyBlof(s, a);
        expect(r.error).toBeUndefined();
        s = r.state!;
      }
      expect(s).toEqual(final);
      expect(host.actions.some((a) => a.t === 'windowClosed' || a.t === 'decline')).toBe(true);
    });
  }
});

describe('LocalHost + GameClient: yerel insan', () => {
  it('karşılama, dağıtım, kendi kartları görünür; rakibin kartı asla gelmez', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 3, seed: 21, firstSeat: 0}, seats: ['human', 'zor', 'kolay'], clock});
    const msgs = record(client!);
    expect(client!.seat).toBe(0); // welcome bağlanınca geldi
    expect(client!.seats.map((x) => x.kind)).toEqual(['human', 'bot', 'bot']);
    autoPilot(client!, clock, new BlofBot(0, 'orta', 77));
    host.start();
    const ev = msgs.find((m): m is Extract<BlofServerMsg, {t: 'events'}> => m.t === 'events')!;
    expect(ev.events.map((e) => e.t)).toEqual(['deal', 'turn']);
    const deal = ev.events[0] as Extract<BlofEvent, {t: 'deal'}>;
    expect(deal.hands[1]).toBeNull();
    expect(deal.hands[2]).toBeNull();
    expect(deal.hands[0]).toEqual(host.state.hands[0]);
    expect(ev.view.mustOpen).toBe(true);
    // Tam oyun: otomatik pilot (arayüzün ?auto=1'i gibi) bitirir; her mesaj denetlenir
    clock.runAll();
    expect(host.over).toBe(true);
    for (const m of msgs) {
      if (m.t !== 'events') continue;
      for (const e of m.events) {
        if (e.t === 'opened' || e.t === 'played' || e.t === 'pileTaken') expect(e.cards === null).toBe(e.seat !== 0);
        if (e.t === 'declined') expect(e.seat).toBe(0);
      }
      expect(m.view.hand.length).toBe(m.view.handCounts[0]);
    }
    expect(msgs.some((m) => m.t === 'events' && m.events.some((e) => e.t === 'gameOver'))).toBe(true);
  });

  it('geçersiz hamle, başka koltuk adına hamle ve windowClosed reddedilir (hile önleme)', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 2, firstSeat: 0}, seats: ['human', 'zor'], clock});
    const msgs = record(client!);
    host.start();
    const hand = client!.view!.hand;
    const c1 = client!.act({t: 'pass', seat: 0});
    const c2 = client!.act({t: 'open', seat: 1, rank: 3, cards: [hand[0]]});
    const c3 = client!.act({t: 'windowClosed'});
    const rej = msgs.filter((m): m is Extract<BlofServerMsg, {t: 'rejected'}> => m.t === 'rejected');
    expect(rej.map((r) => r.cseq)).toEqual([c1, c2, c3]);
    expect(rej[0].code).toBe('cannot-pass');
    expect(rej[1].code).toBe('bad-seat');
    expect(rej[2].code).toBe('bad-seat');
    expect(host.actions.length).toBe(0);
  });

  it('tempo: pencere sayacı ve botlar arayüz ack verene dek bekler; ack gelmezse paceMaxMs sonra başlar', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 9, firstSeat: 0}, seats: ['human', 'zor'], clock, paceMaxMs: 3000});
    const msgs = record(client!);
    host.start();
    client!.ack();
    const v = client!.view!;
    client!.act({t: 'open', seat: 0, rank: 5, cards: [v.hand[0]]});
    expect(host.state.phase).toBe('window');
    expect(host.timerInfo).toBeNull(); // sunum bitmeden sayaç yok
    clock.advance(2000);
    expect(host.state.phase).toBe('window'); // bot da beklemede
    expect(msgs.some((m) => m.t === 'timer')).toBe(false);
    client!.ack();
    const t = msgs.find((m): m is Extract<BlofServerMsg, {t: 'timer'}> => m.t === 'timer')!;
    // insan attı → sıradaki bot → kısa pencere (3 sn); halka timer mesajındaki gerçek süreyle döner
    expect(t.timer).toMatchObject({kind: 'window', ms: 3000, deadline: 2000 + 3000});
    expect(client!.timeLeft()).toBe(3000);
    const before = host.actions.length;
    clock.advance(3000);
    expect(host.actions.length).toBeGreaterThan(before); // bot karar verdi / pencere kapandı

    // ack hiç gelmezse: paceMaxMs sonra kendiliğinden ilerler
    const clock2 = new VirtualClock();
    const g2 = createBlofLocal({cfg: {seats: 2, seed: 9, firstSeat: 1}, seats: ['human', 'zor'], clock: clock2, paceMaxMs: 3000});
    g2.host.start();
    clock2.advance(2999);
    expect(g2.host.actions.length).toBe(0);
    clock2.advance(1 + 2000); // + bot düşünme süresi
    expect(g2.host.actions.length).toBeGreaterThan(0);
  });

  it('pencere süresi dolunca ev sahibi windowClosed gönderir (5 sn)', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 12, firstSeat: 1}, seats: ['human', 'kolay'], clock, paceMaxMs: 0});
    const msgs = record(client!);
    host.start();
    // bot açar
    while (host.state.phase === 'turn') clock.step();
    expect(host.state.phase).toBe('window');
    const opened = host.timerInfo!;
    expect(opened.ms).toBe(5000);
    clock.advance(4999);
    expect(host.state.phase).toBe('window');
    clock.advance(1);
    expect(host.state.phase).toBe('turn');
    expect(host.state.turn).toBe(0);
    const ev = lastEvents(msgs)!;
    expect(ev.actor).toBe(-1);
    expect(ev.events[0]).toMatchObject({t: 'windowClosed', reason: 'timeout'});
    expect(msgs.some((m) => m.t === 'timerCleared')).toBe(true);
  });

  it('pencere açıkken sıradaki insanın "at"ı sıraya alınır: hemen "geç" sayılır, pencere kapanınca atılır', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 31, firstSeat: 1}, seats: ['human', 'zor'], clock, paceMaxMs: 0});
    const msgs = record(client!);
    host.start();
    while (host.state.phase === 'turn') clock.step();
    expect(host.state.window!.by).toBe(1);
    const v = client!.view!;
    const card = v.hand[0];
    const cseq = client!.act({t: 'play', seat: 0, cards: [card]});
    expect(msgs.some((m) => m.t === 'queued' && m.cseq === cseq)).toBe(true);
    // tek hak sahibi insan geçti → pencere kapandı → sıradaki hamle uygulandı
    const acts = host.actions.map((a) => a.t);
    expect(acts.slice(-3)).toEqual(['open', 'decline', 'play']);
    expect(host.state.phase).toBe('window');
    expect(host.state.window!.by).toBe(0);
    expect(host.state.hands[0]).not.toContain(card);
  });

  it('sıraya alınan hamle imkânsızlaşırsa (araya blöf girdi) reddedilir', () => {
    const clock = new VirtualClock();
    // 3 kişi, iki yerel insan (0 ve 1) + bot (2). Bot açar; sıradaki 0 pas'ı sıraya alır; 1 blöf der → tur değişir.
    const host = new LocalHost(blofEngine, {seats: 3, seed: 40, firstSeat: 2}, {
      seats: [{kind: 'human'}, {kind: 'human'}, {kind: 'bot', brain: new BlofBot(2, 'zor', 1)}],
      clock,
      paceMaxMs: 0,
    });
    const c0 = new GameClient<BlofAction, BlofEvent, BlofView>(host.connect(0), clock);
    const c1 = new GameClient<BlofAction, BlofEvent, BlofView>(host.connect(1), clock);
    const msgs: BlofServerMsg[] = [];
    c0.on((m) => msgs.push(m as BlofServerMsg));
    host.start();
    while (host.state.phase === 'turn') clock.step();
    expect(host.state.window!.by).toBe(2);
    expect(host.state.turn).toBe(0);
    const cseq = c0.act({t: 'pass', seat: 0});
    expect(msgs.some((m) => m.t === 'queued' && m.cseq === cseq)).toBe(true);
    expect(host.state.window!.declined[0]).toBe(true); // "at/pas" = blöf demiyorum
    expect(host.state.phase).toBe('window'); // 1 henüz karar vermedi
    c1.act({t: 'challenge', seat: 1});
    expect(host.state.rank).toBe(0); // yeni tur
    const rej = msgs.find((m): m is Extract<BlofServerMsg, {t: 'rejected'}> => m.t === 'rejected' && m.cseq === cseq);
    expect(rej).toBeDefined();
    expect(host.actions.some((a) => a.t === 'pass')).toBe(false);
  });

  it('süre aşımı (çevrimiçi): insan oynamazsa varsayılan hamle yapılır', () => {
    const clock = new VirtualClock();
    const seats = [{kind: 'human' as const}, {kind: 'bot' as const, brain: new BlofBot(1, 'zor', 3)}];
    const host = new LocalHost(blofEngine, {seats: 2, seed: 5, firstSeat: 0}, {seats, clock, paceMaxMs: 0, turnTimeoutMs: 8000});
    const client = new GameClient<BlofAction, BlofEvent, BlofView>(host.connect(0), clock);
    const msgs: BlofServerMsg[] = [];
    client.on((m) => msgs.push(m as BlofServerMsg));
    host.start();
    expect(msgs.some((m) => m.t === 'timer' && m.timer.kind === 'turn')).toBe(true);
    clock.advance(8000);
    expect(msgs.some((m) => m.t === 'timeout' && m.seat === 0)).toBe(true);
    expect(host.actions[0]).toMatchObject({t: 'open', seat: 0});
  });

  it('resync ve yeniden bağlanma tam görünümü yollar', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 4, seed: 8, firstSeat: 0}, seats: ['human', 'orta', 'orta', 'orta'], clock});
    const msgs = record(client!);
    host.start();
    client!.resync();
    const sync = msgs.find((m): m is Extract<BlofServerMsg, {t: 'sync'}> => m.t === 'sync')!;
    expect(sync.reason).toBe('resync');
    expect(sync.view.hand).toEqual(host.state.hands[0]);
    // yeniden bağlan
    const c2 = new GameClient<BlofAction, BlofEvent, BlofView>(host.connect(0), clock);
    expect(c2.seat).toBe(0);
    expect(c2.view!.hand).toEqual(host.state.hands[0]);
    expect(client!.view).not.toBeNull();
    const all: unknown[] = [];
    c2.on((m) => all.push(m));
    c2.resync();
    expect(all.length).toBe(1);
  });

  it('GameClient.next(): mesajlar sırayla, bekleyen sunum döngüsü için', async () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 1, firstSeat: 0}, seats: ['human', 'kolay'], clock});
    host.start();
    const m1 = await client!.next();
    expect(m1.t).toBe('welcome');
    const m2 = await client!.next();
    expect(m2.t).toBe('events');
    const p = client!.next();
    client!.act({t: 'pass', seat: 0}); // reddedilir
    expect((await p).t).toBe('rejected');
  });
});

describe('LocalTransport', () => {
  it('değer kopyasıyla iletir; gecikme saatle uygulanır; kapanınca susar', () => {
    const clock = new VirtualClock();
    const [a, b] = LocalTransport.pair<{x: number[]}, {x: number[]}>({latencyMs: 50, clock});
    const got: {x: number[]}[] = [];
    b.onMessage((m) => got.push(m));
    const msg = {x: [1, 2]};
    a.send(msg);
    expect(got.length).toBe(0);
    clock.advance(50);
    expect(got).toEqual([{x: [1, 2]}]);
    got[0].x.push(3);
    expect(msg.x).toEqual([1, 2]);
    a.close();
    expect(b.closed).toBe(true);
    a.send(msg);
    clock.runAll();
    expect(got.length).toBe(1);
  });
});

describe('Pişti bağdaştırıcısı (davranış aynı)', () => {
  const P: BotPersonality = {memory: 0.9, skill: 0.85, jackPatience: 0.6};

  function direct(cfg: PistiConfig, seeds: number[]) {
    const g = createGame(cfg);
    let s = g.state;
    const bots = seeds.map((sd, i) => new PistiBot(i, P, mulberry32(sd)));
    const feed = (evs: PistiEvent[]) => {
      for (const e of evs) for (const b of bots) b.observe(e);
    };
    feed(g.events);
    while (!s.over) {
      const card = bots[s.turn].choose(pistiView(s, s.turn));
      const r = applyPlay(s, s.turn, card);
      s = r.state;
      feed(r.events);
    }
    return s;
  }

  for (const cfg of [
    {seats: 2, teams: [0, 1], dealer: 1, seed: 17},
    {seats: 4, teams: [0, 1, 0, 1], dealer: 0, seed: 23},
  ] as PistiConfig[]) {
    it(`${cfg.seats} kişi: ev sahibi üzerinden aynı oyun, aynı sonuç`, () => {
      const seeds = Array.from({length: cfg.seats}, (_, i) => 100 + i);
      const clock = new VirtualClock();
      const host = new LocalHost(pistiEngine, cfg, {
        seats: seeds.map((sd, i) => ({kind: 'bot' as const, brain: new PistiBotBrain(i, P, sd)})),
        clock,
      });
      host.start();
      clock.runAll();
      expect(host.over).toBe(true);
      expect(host.state).toEqual(direct(cfg, seeds));
    });
  }

  it('insan istemcisine başkalarının eline giden kart gizli gelir; geçersiz hamle fırlatmaz', () => {
    const clock = new VirtualClock();
    const cfg: PistiConfig = {seats: 2, teams: [0, 1], dealer: 1, seed: 4};
    const host = new LocalHost(pistiEngine, cfg, {seats: [{kind: 'human'}, {kind: 'bot', brain: new PistiBotBrain(1, P, 9)}], clock});
    const client = new GameClient<{t: 'play'; seat: number; card: number}, PistiEvent, ReturnType<typeof pistiView>>(host.connect(0), clock);
    const msgs: {t: string; events?: PistiEvent[]; cseq?: number}[] = [];
    client.on((m) => msgs.push(m as never));
    host.start();
    const ev = msgs.find((m) => m.t === 'events')!;
    for (const e of ev.events!) {
      if (e.t === 'handDeal') for (const d of e.deals) expect(d.card < 0).toBe(d.seat !== 0);
      if (e.t === 'tableDeal') e.cards.forEach((c, i) => expect(c < 0).toBe(!e.faceUp[i]));
    }
    const notMine = host.state.hands[1][0];
    client.act({t: 'play', seat: 0, card: notMine});
    expect(msgs.at(-1)).toMatchObject({t: 'rejected', code: 'not-in-hand'});
    expect(pistiEngine.apply(host.state, {t: 'play', seat: 1, card: 0}).error).toBeDefined();
  });
});

describe('LocalHost: zamanlayıcı mesaj sırası', () => {
  it('blöf denince timerCleared, olaylardan ÖNCE gelir (halka açılış animasyonundan önce durur)', () => {
    const clock = new VirtualClock();
    const {host, client} = createBlofLocal({cfg: {seats: 2, seed: 12, firstSeat: 1}, seats: ['human', 'kolay'], clock, paceMaxMs: 0});
    const msgs = record(client!);
    host.start();
    while (host.state.phase === 'turn') clock.step();
    expect(msgs.some((m) => m.t === 'timer')).toBe(true);
    const from = msgs.length;
    client!.act({t: 'challenge', seat: 0});
    const after = msgs.slice(from).map((m) => m.t);
    expect(after.indexOf('timerCleared')).toBeLessThan(after.indexOf('events'));
  });
});
