// Sohbet yoğunluğu (Sakin · Normal · Geveze) + el / maç sonu karşılıklı konuşma (Ara Skor, sonuç ekranı, rövanş, veda).
import {afterEach, describe, expect, it} from 'vitest';
import {
  BANTER_RULES,
  CHAR_IDS,
  CHAT_LEVELS,
  CHAT_LEVEL_INFO,
  CHAT_PROFILES,
  DialogueDirector,
  END_MOMENTS,
  QUICK_CHAT,
  allLines,
  chatLevel,
  chatProfile,
  endChallenger,
  freshMemory,
  groupOf,
  isChatLevel,
  isEndMoment,
  lineById,
  linesFor,
  momentPriority,
  pickBanter,
  planEndTalk,
  planQuickReply,
  setChatLevel,
  soundKey,
  speechSeconds,
  spectatorFor,
  type BanterRequest,
  type CharId,
  type EndFacts,
  type EndLine,
  type EndSeat,
} from '../src/ai/dialogue';
import {BlofTalk} from '../src/ai/blofDialogue';
import {packGroup} from '../scripts/voice-pack.mjs';
import {voiceWant} from '../src/game/seatBubble';
import {mulberry32} from '../src/core/rng';

afterEach(() => setChatLevel('normal'));

/** Sıralı rastgele: verilen sayıları döndürür, bitince son değer. */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[Math.min(i++, xs.length - 1)];
};

describe('sohbet seviyesi (Sakin · Normal · Geveze)', () => {
  it('üç seviye; geçersiz değer Normal; Normal eski ayarın aynısı (çarpanlar 1)', () => {
    expect(CHAT_LEVELS).toEqual(['sakin', 'normal', 'geveze']);
    expect(isChatLevel('geveze')).toBe(true);
    expect(isChatLevel('loud')).toBe(false);
    expect(setChatLevel('bozuk')).toBe('normal');
    expect(setChatLevel(undefined)).toBe('normal');
    expect(setChatLevel('sakin')).toBe('sakin');
    expect(chatLevel()).toBe('sakin');
    const n = CHAT_PROFILES.normal;
    expect([n.event, n.chatter, n.gap, n.banter, n.banterHands, n.reply, n.quip, n.idle]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('profiller sıralı: Sakin < Normal < Geveze (olasılık), aralıklar tersine; Sakin\'de boş laf yok, sonuçta tek satır', () => {
    const [s, n, g] = CHAT_LEVELS.map(l => CHAT_PROFILES[l]);
    for (const k of ['event', 'chatter', 'banter', 'reply', 'endRevenge', 'bye'] as const) {
      expect(s[k], k).toBeLessThan(n[k]);
      expect(n[k], k).toBeLessThan(g[k]);
    }
    for (const k of ['gap', 'banterHands', 'idle'] as const) {
      expect(s[k], k).toBeGreaterThan(n[k]);
      expect(n[k], k).toBeGreaterThan(g[k]);
    }
    expect(s.chatter).toBe(0);
    expect(s.endMax).toBe(1);
    expect(g.endMax).toBe(3);
    expect(g.midReply).toBe(1);
  });

  it('shouldSpeak: büyük anlar her seviyede; Sakin boş laf yok, olay seyrek; Geveze daha sık ve daha kısa aralık', () => {
    const rate = (lvl: (typeof CHAT_LEVELS)[number], m: string, gapMs: number) => {
      const d = new DialogueDirector();
      d.level = lvl;
      const r = mulberry32(7);
      let t = 0, n = 0;
      for (let i = 0; i < 400; i++) {
        t += gapMs;
        if (d.shouldSpeak(m, t, r)) n++;
      }
      return n;
    };
    for (const l of CHAT_LEVELS) expect(rate(l, 'botPisti', 10), l).toBe(400);
    expect(rate('sakin', 'myTurnIdle', 60_000)).toBe(0);
    expect(rate('sakin', 'botThinking', 60_000)).toBe(0);
    const ev = CHAT_LEVELS.map(l => rate(l, 'botBigCapture', 100_000));
    expect(ev[0]).toBeLessThan(ev[1]);
    expect(ev[1]).toBeLessThan(ev[2]);
    // olay aralığı: Normal 3 sn'den önce susar, Geveze 2,1 sn'de konuşabilir
    const gapOk = (lvl: 'normal' | 'geveze') => {
      const d = new DialogueDirector();
      d.level = lvl;
      d.shouldSpeak('botPisti', 1000);
      return d.shouldSpeak('playerDumpedValuable', 1000 + 2500, () => 0);
    };
    expect(gapOk('normal')).toBe(false);
    expect(gapOk('geveze')).toBe(true);
  });

  it('zorunlu boş laf (Blöf\'te bekleme) Sakin\'de susar, zorunlu büyük anlar konuşur; kısa tepki ve bekleme gecikmesi seviyeye göre', () => {
    setChatLevel('sakin');
    const t = new BlofTalk();
    expect(t.pick('riza', 'idle', true)).toBeNull();
    expect(t.pick('riza', 'callOut', true)).not.toBeNull();
    expect(t.line('riza', 'endAccept')).not.toBeNull();
    const d = new DialogueDirector();
    expect(d.allowQuip(() => 0.5)).toBe(false);
    expect(d.idleDelay(9000)).toBeGreaterThan(9000);
    setChatLevel('geveze');
    expect(t.pick('riza', 'idle', true)).not.toBeNull();
    expect(d.allowQuip(() => 0.5)).toBe(true);
    expect(d.idleDelay(9000)).toBeLessThan(9000);
  });

  it('atışma: seviye olasılığı ve el aralığını ölçekler; 1\'e 1 / sakin olmayan an her seviyede yok', () => {
    const base: BanterRequest = {game: 'pisti', ctx: 'steal', a: 'riza', b: 'cem', mode: '4', sameTeam: false, calm: true, quietForMs: 60_000, talk: 'voice'};
    const mem = () => ({last: -1e9, seen: {}});
    const at = (r: number) => () => r;
    // olasılık 0,35: Sakin ≈ 0,12, Geveze 0,7
    expect(pickBanter(base, 10, mem(), at(0.3), CHAT_PROFILES.sakin)).toBeNull();
    expect(pickBanter(base, 10, mem(), at(0.3), CHAT_PROFILES.normal)).not.toBeNull();
    expect(pickBanter(base, 10, mem(), at(0.6), CHAT_PROFILES.normal)).toBeNull();
    expect(pickBanter(base, 10, mem(), at(0.6), CHAT_PROFILES.geveze)).not.toBeNull();
    // el aralığı: Normal 2, Geveze 1, Sakin 4
    const recent = {last: 9, seen: {}};
    expect(pickBanter(base, 10, recent, at(0), CHAT_PROFILES.geveze)).not.toBeNull();
    expect(pickBanter(base, 10, recent, at(0), CHAT_PROFILES.normal)).toBeNull();
    expect(pickBanter(base, 12, {last: 9, seen: {}}, at(0), CHAT_PROFILES.sakin)).toBeNull();
    expect(pickBanter(base, 13, {last: 9, seen: {}}, at(0), CHAT_PROFILES.sakin)).not.toBeNull();
    for (const p of Object.values(CHAT_PROFILES)) {
      expect(pickBanter({...base, mode: '1v1'}, 10, mem(), at(0), p)).toBeNull();
      expect(pickBanter({...base, calm: false}, 10, mem(), at(0), p)).toBeNull();
    }
    expect(BANTER_RULES.minHands).toBe(2);
  });

  it('hızlı sohbete bot cevabı seviyeyle ölçeklenir', () => {
    const seats = [{seat: 0, char: 'riza' as const, human: true, rel: 'opp' as const}, {seat: 1, char: 'cem' as const, human: false, rel: 'opp' as const}];
    const msg = QUICK_CHAT.find(q => q.reply === 'taunt')!.id; // olasılık 0,7
    expect(planQuickReply(msg, seats, [], () => 0.5, CHAT_PROFILES.sakin)).toBeNull(); // 0,42
    expect(planQuickReply(msg, seats, [], () => 0.5, CHAT_PROFILES.normal)).not.toBeNull();
    expect(planQuickReply(msg, seats, [], () => 0.8, CHAT_PROFILES.normal)).toBeNull();
    expect(planQuickReply(msg, seats, [], () => 0.8, CHAT_PROFILES.geveze)).not.toBeNull(); // 0,91
  });

  it('seçici örnekleri var olan sesli replikler; Sakin 1, Normal 2, Geveze ≥ 3 satır', () => {
    for (const l of CHAT_LEVELS) for (const id of CHAT_LEVEL_INFO[l].sample) expect(lineById(id), id).toBeTruthy();
    expect(CHAT_LEVEL_INFO.sakin.sample.length).toBe(1);
    expect(CHAT_LEVEL_INFO.normal.sample.length).toBe(2);
    expect(CHAT_LEVEL_INFO.geveze.sample.length).toBeGreaterThanOrEqual(3);
  });
});

describe('el / maç sonu replikleri (veri)', () => {
  const end = allLines().filter(l => isEndMoment(l.moment));

  it('her karakter her rol için dolu; genel havuzlar ≥ 2, ikinci ses ≥ 3; hepsi kısa ve öncelik 3', () => {
    for (const c of CHAR_IDS) {
      for (const m of END_MOMENTS) expect(linesFor(c, m).length, `${c}/${m}`).toBeGreaterThanOrEqual(1);
      for (const m of ['endGloat', 'endSulk', 'endRevenge', 'endMateWin', 'endMateLose', 'endFoeWin', 'endFoeLose', 'endAccept', 'endBye', 'midSide', 'midMateDown'])
        expect(linesFor(c, m).length, `${c}/${m}`).toBeGreaterThanOrEqual(2);
      for (const m of ['endJoinWin', 'endJoinLose']) expect(linesFor(c, m).length, `${c}/${m}`).toBe(3);
    }
    expect(end.length).toBe(188);
    for (const l of end) {
      expect(speechSeconds(l.char, l.tts), l.id).toBeLessThanOrEqual(3.1);
      expect(momentPriority(l.moment)).toBe(3);
      expect(groupOf(l)).toBe('end');
      expect(packGroup(l.id), l.id).toBe('end');
      expect(l.id).toMatch(new RegExp(`^${l.char}_(end|mid)[A-Z][A-Za-z]+_\\d+$`));
    }
    expect(packGroup('riza_endGloat_1')).toBe('end');
    expect(packGroup('cem_midSide_2')).toBe('end');
    expect(packGroup('riza_botPisti_1')).toBe('pisti');
  });

  it('yeni replikler başka bir repliğin sesini paylaşmaz (her biri yeni ses)', () => {
    for (const l of end) expect(soundKey(l.id), l.id).toBe(l.id);
  });

  it('ses paketleri: masadaki botların + 1\'e 1\'de seyircinin el sonu paketi; el bitince önce onlar', () => {
    const P = (id: CharId, human = false) => ({char: {id}, human});
    const w = voiceWant('pisti', [P('riza', true), P('cem')]);
    expect(w.slice(0, 3)).toEqual([['cem', 'pisti'], ['riza', 'say'], ['cem', 'bot']]);
    expect(w.slice(3)).toEqual([['cem', 'end'], ['dursun', 'end']]);
    expect(voiceWant('pisti', [P('riza', true), P('cem')], true).slice(0, 2)).toEqual([['cem', 'end'], ['dursun', 'end']]);
    // kalabalık masada seyirci yok
    expect(voiceWant('blof', [P('riza', true), P('cem'), P('dursun'), P('defne')]).filter(x => x[1] === 'end').length).toBe(3);
  });
});

describe('planEndTalk: karşılıklı dizi', () => {
  const seats1 = (me: CharId, bot: CharId): EndSeat[] => [{seat: 0, char: me, human: true, side: 0}, {seat: 1, char: bot, human: false, side: 1}];
  const seats4: EndSeat[] = [
    {seat: 0, char: 'riza', human: true, side: 0}, {seat: 1, char: 'cem', human: false, side: 1},
    {seat: 2, char: 'dursun', human: false, side: 2}, {seat: 3, char: 'defne', human: false, side: 3},
  ];
  const esli: EndSeat[] = [
    {seat: 0, char: 'riza', human: true, side: 0}, {seat: 1, char: 'cem', human: false, side: 1},
    {seat: 2, char: 'dursun', human: false, side: 0}, {seat: 3, char: 'defne', human: false, side: 1},
  ];
  const facts = (o: Partial<EndFacts>): EndFacts => ({
    scene: 'results', game: 'pisti', mode: '1v1', seats: seats1('riza', 'cem'), outcome: 'lose', leaders: [1], order: [1, 0], rematch: true,
    spectators: [spectatorFor(['riza', 'cem'])!], ...o,
  });
  const dir = (lvl: (typeof CHAT_LEVELS)[number] = 'normal') => {
    const d = new DialogueDirector();
    d.level = lvl;
    return d;
  };
  const plan = (f: EndFacts, d = dir(), rnd: () => number = Math.random, lvl?: (typeof CHAT_LEVELS)[number]) =>
    planEndTalk(f, (c, ms) => d.pickAny(c, ms), rnd, chatProfile(lvl ?? d.level ?? 'normal'));
  const noRepeatSpeaker = (p: readonly EndLine[]) => p.every((x, i) => i === 0 || x.char !== p[i - 1].char);

  it('seyirci: masada olmayan, kahveci Dursun öncelikli', () => {
    expect(spectatorFor(['riza', 'cem'])).toBe('dursun');
    expect(spectatorFor(['dursun', 'cem'])).toBe('riza');
    expect(spectatorFor(['riza', 'dursun', 'cem', 'defne'])).toBeNull();
  });

  it('1\'e 1 kaybetti: kazanan bot takılır, kenardan seyirci cevap verir; Sakin tek satır; Geveze rövanşla üç satır', () => {
    for (let i = 0; i < 40; i++) {
      const p = plan(facts({}), dir('normal'), mulberry32(i));
      expect(p.length).toBeGreaterThanOrEqual(2);
      expect(p.length).toBeLessThanOrEqual(3);
      expect(noRepeatSpeaker(p)).toBe(true);
      expect(new Set(p.map(x => x.char))).toEqual(new Set(['cem', 'dursun']));
      expect(p.find(x => x.char === 'dursun')!.seat).toBe(-1);
      expect(p.find(x => x.char === 'dursun')!.role).toBe('endJoinWin');
      expect(p.filter(x => /rövanş/i.test(x.line.text)).length).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < 20; i++) expect(plan(facts({}), dir('sakin'), mulberry32(i)).length).toBe(1);
    const g = plan(facts({}), dir('geveze'), seq(0.1, 0.9, 0.9, 0.5, 0.1, 0.5));
    expect(g.length).toBe(3);
    expect(g[2].role).toBe('endRevenge');
    expect(g[2].char).toBe('cem');
    expect(g.map(x => x.char)).toEqual(['cem', 'dursun', 'cem']);
  });

  it('koşullar: ezici fark / kıl payı / seri / pişti / Blöf son kart blöfü, çok yakalanma — koşullu replik', () => {
    const lo = () => 0.1;
    expect(plan(facts({big: true}), dir(), lo)[0].role).toBe('endGloatBig');
    expect(plan(facts({close: true}), dir(), lo)[0].role).toBe('endGloatClose');
    expect(plan(facts({game: 'blof', caughtLot: true}), dir(), lo)[0].role).toBe('endGloatCaught');
    const won = {outcome: 'win' as const, leaders: [0], order: [0, 1]};
    expect(plan(facts({...won, streak: true, big: true}), dir(), lo)[0].role).toBe('endSulkStreak');
    expect(plan(facts({...won, pistiHeavy: true}), dir(), lo)[0].role).toBe('endSulkPisti');
    expect(plan(facts({...won, game: 'blof', pistiHeavy: true}), dir(), lo)[0].role).not.toBe('endSulkPisti');
    expect(plan(facts({...won, game: 'blof', lastBluff: true, sly: true}), dir(), lo)[0].role).toBe('endSulkLast');
    expect(plan(facts({...won, game: 'blof', sly: true}), dir(), lo)[0].role).toBe('endSulkSly');
    // oyuncu kazandı: ikinci ses oyuncuyu över / kaybedene takılır
    const p = plan(facts({...won}), dir(), mulberry32(3));
    expect(p.some(x => x.role === 'endJoinLose')).toBe(true);
  });

  it('4 kişi: kaybetti → kazanan bot + başka bir bot; kazandı → ikinci olan bot söylenir', () => {
    for (let i = 0; i < 30; i++) {
      const lost = plan(facts({mode: '4', seats: seats4, outcome: 'lose', leaders: [2], order: [2, 1, 3, 0], spectators: []}), dir(), mulberry32(i));
      expect(lost[0].char).toBe('dursun');
      expect(lost[1].char).not.toBe('dursun');
      expect(lost.every(x => x.seat > 0)).toBe(true);
      const won = plan(facts({mode: '4', seats: seats4, outcome: 'win', leaders: [0], order: [0, 3, 1, 2], spectators: []}), dir(), seq(0.95, 0.95, 0.2, 0.5, 0.5));
      expect(won[0].char).toBe('defne');
    }
  });

  it('eşli: ortak bize ("ortak") + rakip cevap, ya da rakip takımın iki botu birbirine; konuşanlar hep bot', () => {
    const roles = new Set<string>();
    for (let i = 0; i < 80; i++) {
      for (const outcome of ['win', 'lose'] as const) {
        const p = plan(facts({mode: 'esli', seats: esli, outcome, leaders: outcome === 'win' ? [0] : [1], order: outcome === 'win' ? [0, 1] : [1, 0], spectators: []}), dir('geveze'), mulberry32(i * 2 + (outcome === 'win' ? 1 : 0)));
        expect(p.length).toBeGreaterThanOrEqual(2);
        expect(noRepeatSpeaker(p)).toBe(true);
        expect(p.every(x => x.char !== 'riza' && x.seat > 0)).toBe(true);
        for (const x of p) roles.add(`${outcome}:${x.role}`);
        const mate = p.find(x => x.char === 'dursun');
        if (mate) expect(mate.role).toBe(outcome === 'win' ? 'endMateWin' : 'endMateLose');
      }
    }
    for (const r of ['win:endMateWin', 'win:endFoeLose', 'win:endDuoLoseA', 'win:endDuoLoseB', 'lose:endMateLose', 'lose:endFoeWin', 'lose:endDuoWinA', 'lose:endDuoWinB'])
      expect(roles.has(r), r).toBe(true);
  });

  it('Ara Skor: önde bot / geride bot, geri dönüş, eşli ortak; Sakin yarı yarıya tek satır', () => {
    const mid = (o: Partial<EndFacts>) => facts({scene: 'interim', rematch: false, ...o});
    const ahead = plan(mid({outcome: 'lose', leaders: [1], order: [1, 0]}), dir(), seq(0, 0.9, 0.2, 0));
    expect(['botLeading', 'midAhead']).toContain(ahead[0].role);
    expect(ahead[1].role).toBe('midSide');
    expect(ahead[1].seat).toBe(-1);
    const back = plan(mid({outcome: 'lose', leaders: [1], order: [1, 0], prevLeaders: [0]}), dir(), () => 0);
    expect(back[0].role).toBe('comeback');
    const behind = plan(mid({outcome: 'win', leaders: [0], order: [0, 1]}), dir(), () => 0);
    expect(['playerLeading', 'midBehind']).toContain(behind[0].role);
    const e = plan(mid({mode: 'esli', seats: esli, outcome: 'win', leaders: [0], order: [0, 1], spectators: []}), dir(), () => 0);
    expect(e[0]).toMatchObject({char: 'dursun', role: 'midMateUp'});
    expect(['cem', 'defne']).toContain(e[1].char);
    const e2 = plan(mid({mode: 'esli', seats: esli, outcome: 'lose', leaders: [1], order: [1, 0], spectators: []}), dir(), () => 0);
    expect(e2[1]).toMatchObject({char: 'dursun', role: 'midMateDown'});
    let silent = 0, one = 0;
    for (let i = 0; i < 200; i++) {
      const n = plan(mid({outcome: 'lose', leaders: [1], order: [1, 0]}), dir('sakin'), mulberry32(i)).length;
      if (n === 0) silent++;
      else if (n === 1) one++;
      else throw new Error('Sakin Ara Skor en çok tek satır');
    }
    expect(silent).toBeGreaterThan(60);
    expect(one).toBeGreaterThan(60);
  });

  it('kalıcı tekrar önleme: aynı durumda art arda sonuç dizileri hep değişir, A repliği art arda tekrar etmez', () => {
    const d = dir('geveze');
    const r = mulberry32(42);
    const seen: string[] = [];
    for (let i = 0; i < 24; i++) {
      d.newHand(2);
      const p = plan(facts({}), d, r);
      seen.push(p.map(x => soundKey(x.line.id)).join('>'));
      if (i) expect(p[0].line.id).not.toBe(seen[i - 1].split('>')[0]);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBeGreaterThanOrEqual(20);
  });

  it('eşli: art arda maçlarda (aynı profil) ortak ve rakip ikili replikleri de değişir', () => {
    const d = dir('geveze');
    const r = mulberry32(9);
    const seen = new Map<string, Set<string>>();
    for (let i = 0; i < 40; i++) {
      d.newHand(4);
      for (const outcome of ['win', 'lose'] as const) {
        const p = plan(facts({mode: 'esli', seats: esli, outcome, leaders: outcome === 'win' ? [0] : [1], order: outcome === 'win' ? [0, 1] : [1, 0], spectators: []}), d, r);
        for (const x of p) {
          const k = `${x.char}:${x.role}`;
          if (!seen.has(k)) seen.set(k, new Set());
          seen.get(k)!.add(x.line.id);
        }
      }
    }
    for (const [k, ids] of seen) if (/Duo|Mate/.test(k)) expect(ids.size, k).toBeGreaterThanOrEqual(2);
  });

  it('rövanş kabulü / veda için rakip: rövanş çağıran → konuşan rakip → ilk rakip', () => {
    const line = (char: CharId, role: string): EndLine => ({seat: 1, char, line: linesFor(char, 'endGloat')[0], role});
    expect(endChallenger([line('cem', 'endGloat'), line('dursun', 'endJoinWin')], seats4)!.char).toBe('dursun');
    expect(endChallenger([line('cem', 'endGloat'), line('defne', 'endRevenge'), line('dursun', 'endJoinWin')], seats4)!.char).toBe('defne');
    expect(endChallenger([], esli)!.char).toBe('cem');
    expect(endChallenger([{...line('dursun', 'endMateWin'), seat: 2}], esli)!.char).toBe('cem'); // ortak değil, rakip
  });

  it('hafıza: el / maç sonu replikleri kaydedilir (yeni oturumda da tekrar etmez)', () => {
    const d = new DialogueDirector();
    const l = d.pickAny('riza', ['endGloat', 'botWin']);
    expect(l).not.toBeNull();
    expect(d.memory.recent.riza).toContain(soundKey(l!.id));
    expect(freshMemory().recent).toEqual({});
  });
});
