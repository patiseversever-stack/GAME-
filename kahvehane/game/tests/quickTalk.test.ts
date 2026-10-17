// Hızlı sohbet 2: insana karakter adıyla seslenilmez (1'e 1 / 4 kişi / eşli, yerel ve çevrimiçi), hedef çözümü, hedefli
// söyleyiş, ev sahibi doğrulaması (protokol), belirlenimci yayın, öneriler, ek replik verisi.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import manifest from '../assets/voice/manifest.json';
import {
  BANTER, BANTER_CTX, BLOF_MOMENTS, CHAR_IDS, DialogueDirector, MOMENTS, QUICK_CHAT, blofKey, lineById, momentPriority, pickBanter,
  quickSay, setTableHumans, soundKey, speechSeconds, stripTags, type CharId, type LineRef,
} from '../src/ai/dialogue';
import {
  ALL_QUICK_IDS, CUE_PICKS, CUE_TTL_MS, TARGET_BIAS, arrange, chatMenu, chatPolicy, humansOf, msgAvailable, pickSay, planReply,
  replyLineOk, resolveTarget, sayIdsFor, sayLineOk, type TableMode, type TalkSeat,
} from '../src/ai/quickTalk';
import {TARGET_MSGS, TEAM_CHAT, extraLines, targetSayId} from '../src/ai/quickTalkLines';
import {mulberry32} from '../src/core/rng';
import {blofConfigFor} from '../src/core/blofTypes';
import {CHAT_COOLDOWN_MS, ChatGate, ChatRelay, type ChatMsg} from '../src/net/chat';
import {createBlofLocal} from '../src/net/blofLocal';
import {VirtualClock} from '../src/net/clock';
import {SpeechDirector, type VoicePort} from '../src/audio/speech';
import {QUICK_IDS, QuickChat, type ChatSession} from '../src/game/quickChat';
import {packGroup} from '../scripts/voice-pack.mjs';
import type {GameHud, QuickChatSheetPort} from '../src/ui/types';

// ───────── bağımsız ihlal denetimi (uygulamanın regex'lerinden ayrı yazıldı) ─────────
const NAME: Record<CharId, RegExp> = {
  riza: /R[ıi]za/i,
  dursun: /Dursun/i,
  cem: /(^|[^a-zçğıöşüA-ZÇĞİÖŞÜ])Cem($|[^a-zçğıöşüA-ZÇĞİÖŞÜ])/,
  defne: /Defne/i,
};
const ADDRESS = /(^|[^\p{L}])(delikanlı|aslanım|abi|abla|ağabey|kızım|oğlum|hanım|hanımefendi|bey|beyefendi|amca|amcacım|bacım|birader)($|[^\p{L}])/iu;
/** Adıyla birlikte anılan unvan ("Rıza Amca", "Defne Hanım"): üçüncü kişi BOT / masada yoksa serbesttir. */
const TITLED: Record<CharId, RegExp> = {
  riza: /R[ıi]za( Amca(cım)?)?('[a-zçğıöşü]+)?/gi,
  dursun: /Dursun( (Bey|Abi))?('[a-zçğıöşü]+)?/gi,
  cem: /Cem('[a-zçğıöşü]+)?/g,
  defne: /Defne( (Hanım|Abla|kızım))?('[a-zçğıöşü]+)?/gi,
};
/** Konuşanın kendine göndermesi, insan olmayan üçüncü kişilerin adı + unvanı ve tırnak içi alıntılar silinmiş yazı. */
const outward = (l: LineRef, humans: ReadonlySet<string>): string => {
  let t = `${l.text} ${stripTags(l.tts)}`.replace(/["“”][^"“”]*["“”]/g, ' ');
  for (const c of CHAR_IDS) if (c === l.char || !humans.has(c)) t = t.replace(TITLED[c], ' ');
  return t;
};
/**
 * Bu repliği bu masada söylemek kural 1'i çiğner mi: masadaki bir İNSAN avatarını anıyor (konuşanın kendisi hariç) ya da
 * insana yönelebilecekken (aimedAtBot değil) kişilik / cinsiyet hitabı içeriyor.
 */
function violates(l: LineRef, humans: ReadonlySet<string>, aimedAtBot: boolean): string | null {
  const t = outward(l, humans);
  for (const h of humans) if (h !== l.char && NAME[h as CharId].test(`${l.text} ${stripTags(l.tts)}`)) return `names human ${h}`;
  if (!aimedAtBot && humans.size && ADDRESS.test(t)) return 'persona/gender address';
  return null;
}

const MODES: TableMode[] = ['1v1', '4', 'esli'];
const TEAMS: Record<TableMode, number[]> = {'1v1': [0, 1], '3': [0, 1, 2], '4': [0, 1, 2, 3], esli: [0, 1, 0, 1]};

/** Bütün masa düzenleri: 1'e 1 / 4 kişi / eşli × karakter dizilimi × yerel (bot rakipler) ya da çevrimiçi (uzak insanlar). */
function tables(): {mode: TableMode; online: boolean; seats: TalkSeat[]}[] {
  const out: {mode: TableMode; online: boolean; seats: TalkSeat[]}[] = [];
  const perms = (a: readonly CharId[]): CharId[][] => (a.length <= 1 ? [a.slice()] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
  for (const mode of MODES) {
    const n = mode === '1v1' ? 2 : 4;
    const seen = new Set<string>();
    for (const p of perms(CHAR_IDS)) {
      const chars = p.slice(0, n);
      const k = chars.join(',');
      if (seen.has(k)) continue;
      seen.add(k);
      for (const online of [false, true]) {
        // çevrimiçi: 1'e 1'de rakip uzak insan ("Mustafa"); 4 kişide 1 ve 2 numaralı koltuklar (eşlide ortak) uzak insan
        const remote = (s: number): boolean => online && (n === 2 ? s === 1 : s === 1 || s === 2);
        out.push({mode, online, seats: chars.map((c, s) => ({seat: s, char: c, team: TEAMS[mode][s], human: s === 0, remote: remote(s) || undefined}))});
      }
    }
  }
  return out;
}

afterEach(() => setTableHumans([]));

describe('kural 1: insan koltuğa karakter adıyla / kişilikle seslenilmez', () => {
  it('oyun anları (Pişti + Blöf): hiçbir insan kadrosunda yasak replik seçilmez; havuz yine dolu kalır', () => {
    const rnd = mulberry32(11);
    const moments = [...MOMENTS, ...BLOF_MOMENTS.map(blofKey)];
    const subsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(mask => CHAR_IDS.filter((_, i) => mask & (1 << i)));
    let picks = 0;
    for (const humans of subsets) {
      setTableHumans(humans);
      const H = new Set<string>(humans);
      for (const c of CHAR_IDS.filter(x => !H.has(x))) {
        const d = new DialogueDirector();
        for (const m of moments) {
          for (let i = 0; i < 30; i++) {
            const l = d.pickLine(c, m, rnd) as LineRef | null;
            if (!l) continue;
            picks++;
            expect(violates(l, H, false), `${l.id} "${l.text}" humans=${humans}`).toBeNull();
          }
          if (m !== 'playerFastThrow') expect(d.pickLine(c, m, rnd), `${c}/${m} humans=${humans}`).not.toBeNull();
        }
      }
    }
    expect(picks).toBeGreaterThan(20_000);
  });

  it('yeniden kapılanan eski replikler: insan avatarını anan ~20 replik o masada hiç seçilmez, botken / yokken seçilir', () => {
    const gated = ['qc_riza_tea_1', 'qc_riza_tea_2', 'riza_botPisti_5', 'dursun_playerPisti_3', 'cem_start_8', 'defne_start_7', 'riza_botWin_1', 'riza_playerWin_1', 'cem_playerJackPisti_1'];
    for (const id of gated) expect(lineById(id), id).toBeTruthy();
    const rnd = mulberry32(5);
    setTableHumans(['dursun']); // oyuncu Dursun avatarında
    const d = new DialogueDirector();
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(d.pickLine('riza', 'botPisti', rnd)!.id);
    expect(seen.has('riza_botPisti_5')).toBe(false);
    for (let i = 0; i < 200; i++) expect(quickSay('riza', 'tea', [], rnd)!.id).not.toMatch(/^qc_riza_tea_[12]$/);
    setTableHumans(['cem']); // Dursun yok (kahvenin sahibi, arka planda): serbest
    const d2 = new DialogueDirector();
    const seen2 = new Set<string>();
    for (let i = 0; i < 400; i++) seen2.add(d2.pickLine('riza', 'botPisti', rnd)!.id);
    expect(seen2.has('riza_botPisti_5')).toBe(true);
  });

  it('atışma: yalnız iki BOT arasında; hiçbir atışma üçüncü bir karakteri anmaz; insan avatarı olan çift seçilmez', () => {
    for (const e of BANTER)
      for (const l of e.lines)
        for (const c of CHAR_IDS) if (c !== e.a && c !== e.b) expect(NAME[c].test(`${l.text} ${l.tts}`), `${l.id} anıyor: ${c}`).toBe(false);
    const rnd = () => 0;
    for (const h of CHAR_IDS) {
      setTableHumans([h]);
      for (const ctx of BANTER_CTX)
        for (const a of CHAR_IDS)
          for (const b of CHAR_IDS) {
            if (a === b) continue;
            for (const mode of ['4', 'esli'] as const) {
              const ex = pickBanter({game: ctx === 'bluffCaught' || ctx === 'passes' ? 'blof' : 'pisti', ctx, a, b, mode, sameTeam: ctx.startsWith('mate'), calm: true, quietForMs: 1e9, talk: 'voice'}, 100, {last: -1e9, seen: {}}, rnd);
              if (a === h || b === h) expect(ex, `${ctx} ${a}-${b} human=${h}`).toBeNull();
              if (ex) for (const l of ex.lines) expect(violates(l, new Set([h]), true)).toBeNull();
            }
          }
    }
  });

  it('hızlı sohbet: söyleyiş, bot cevabı, menü sözü ve ev sahibi kapısı — 1\'e 1 / 4 kişi / eşli, yerel ve çevrimiçi', () => {
    const rnd = mulberry32(99);
    let says = 0, aimed = 0, replies = 0;
    for (const t of tables()) {
      const H = humansOf(t.seats);
      setTableHumans(H);
      const game = t.mode === '1v1' ? 'blof' : 'pisti';
      for (const game2 of [game, game === 'blof' ? 'pisti' : 'blof'] as const) {
        const policy = chatPolicy({game: game2, mode: t.mode, seats: t.seats, rnd});
        for (const from of t.seats.filter(s => s.human || s.remote)) {
          // menü sözleri
          for (const it of chatMenu(from.char, game2, t.mode, H)) {
            for (const h of H) if (h !== from.char) expect(NAME[h as CharId].test(it.label), `label ${it.id} "${it.label}" names ${h}`).toBe(false);
          }
          for (const msg of ALL_QUICK_IDS.filter(m => msgAvailable(m, game2, t.mode))) {
            for (const last of t.seats.map(s => s.seat)) {
              const next = (last + 1) % t.seats.length;
              const to = resolveTarget(msg, {me: from.seat, seats: t.seats, mode: t.mode, last, next});
              const target = t.seats.find(s => s.seat === to);
              const toBot = !!target && !target.human && !target.remote;
              for (let i = 0; i < 3; i++) {
                const l = pickSay(from.char, msg, to, t.seats, [], rnd);
                expect(l, `${from.char}/${msg}`).toBeTruthy();
                says++;
                const isAimed = /^qc_[a-z]+_[a-z_]+_(riza|cem|dursun|defne)_1$/.test(l!.id);
                if (isAimed) {
                  aimed++;
                  expect(toBot, `${l!.id} hedef insan/yok (to=${to})`).toBe(true);
                  expect(l!.id).toBe(targetSayId(from.char, msg, target!.char));
                }
                expect(violates(l!, H, isAimed && toBot), `${l!.id} "${l!.text}" ${t.mode} online=${t.online}`).toBeNull();
                expect(policy.valid(from.seat, msg, l!.id, to), `kapı reddetti ${l!.id}`).toBe(true);
              }
              const rp = planReply(msg, from.seat, to, t.seats, [], () => 0);
              if (rp) {
                replies++;
                const bot = t.seats.find(s => s.seat === rp.seat)!;
                expect(bot.human || bot.remote).toBeFalsy();
                expect(violates(rp.line, H, false), `${rp.line.id} "${rp.line.text}"`).toBeNull();
              }
            }
            // ev sahibi: kişiye özel söz insana ASLA kabul edilmez (hangi koltuğa yöneltilirse yöneltilsin)
            if (TARGET_MSGS.includes(msg))
              for (const c of CHAR_IDS)
                for (const s of [...t.seats.map(x => x.seat), -1]) {
                  const id = targetSayId(from.char, msg, c);
                  if (!lineById(id)) continue;
                  const seat = t.seats.find(x => x.seat === s);
                  if (policy.valid(from.seat, msg, id, s)) expect(!!seat && !seat.human && !seat.remote && seat.char === c && s !== from.seat, `${id} → koltuk ${s}`).toBe(true);
                }
          }
        }
      }
    }
    expect(says).toBeGreaterThan(5000);
    expect(aimed).toBeGreaterThan(300);
    expect(replies).toBeGreaterThan(200);
  }, 30_000);

  it('çevrimiçi "Mustafa": rakip Cem avatarında uzak insan → Cem\'e özel söz yok, nötr söz; aynı masa botken Cem\'e özel söz', () => {
    const vsBot: TalkSeat[] = [{seat: 0, char: 'defne', team: 0, human: true}, {seat: 1, char: 'cem', team: 1, human: false}];
    const vsMustafa: TalkSeat[] = [vsBot[0], {seat: 1, char: 'cem', team: 1, human: true, remote: true}];
    const rnd = mulberry32(3);
    let aimedBot = 0;
    for (let i = 0; i < 200; i++) {
      const a = pickSay('defne', 'lucky', resolveTarget('lucky', {me: 0, seats: vsBot}), vsBot, [], rnd)!;
      if (a.id === 'qc_defne_lucky_cem_1') aimedBot++;
      const b = pickSay('defne', 'lucky', resolveTarget('lucky', {me: 0, seats: vsMustafa}), vsMustafa, [], rnd)!;
      expect(b.id).toMatch(/^qc_defne_lucky_\d+$/);
      expect(b.text).not.toMatch(/Cem/);
    }
    expect(aimedBot / 200).toBeGreaterThan(TARGET_BIAS - 0.12);
  });
});

describe('hedef çözümü', () => {
  const four = (mode: TableMode): TalkSeat[] => [
    {seat: 0, char: 'cem', team: TEAMS[mode][0], human: true},
    {seat: 1, char: 'riza', team: TEAMS[mode][1], human: false},
    {seat: 2, char: 'defne', team: TEAMS[mode][2], human: false},
    {seat: 3, char: 'dursun', team: TEAMS[mode][3], human: false},
  ];
  it("1'e 1: her mesaj rakibe (takım mesajı hariç)", () => {
    const seats: TalkSeat[] = [{seat: 0, char: 'cem', team: 0, human: true}, {seat: 1, char: 'riza', team: 1, human: false}];
    for (const m of QUICK_CHAT) expect(resolveTarget(m.id, {me: 0, seats}), m.id).toBe(1);
    for (const t of TEAM_CHAT) expect(resolveTarget(t.id, {me: 0, seats, mode: '1v1'})).toBe(-1);
  });
  it('4 kişi: tepki → son hamleyi yapan, "hadi" → sıradaki, selam / gg / çay / rövanş → masa, kendine dönük → masa', () => {
    const seats = four('4');
    const c = {me: 0, seats, mode: '4' as const, last: 3, next: 2};
    for (const m of ['nice', 'wow', 'lucky', 'thanks', 'bluffing']) expect(resolveTarget(m, c), m).toBe(3);
    expect(resolveTarget('hurry', c)).toBe(2);
    for (const m of ['hello', 'gg', 'tea', 'revenge', 'wait', 'oops', 'oh_no', 'trust_me']) expect(resolveTarget(m, c), m).toBe(-1);
    // son hamle benimse / sıra bendeyse hedef yok
    expect(resolveTarget('nice', {...c, last: 0})).toBe(-1);
    expect(resolveTarget('hurry', {...c, next: 0})).toBe(-1);
    expect(resolveTarget('nice', {...c, last: -1})).toBe(-1);
    expect(resolveTarget('team_ours', c)).toBe(-1); // eşli değil
  });
  it('eşli: takım mesajları ortağa (karşıdaki koltuk)', () => {
    const seats = four('esli');
    expect(resolveTarget('team_ours', {me: 0, seats, mode: 'esli'})).toBe(2);
    expect(resolveTarget('team_sorry', {me: 0, seats, mode: 'esli'})).toBe(2);
    expect(msgAvailable('team_ours', 'pisti', 'esli')).toBe(true);
    expect(msgAvailable('team_ours', 'pisti', '4')).toBe(false);
    expect(msgAvailable('bluffing', 'pisti', 'esli')).toBe(false);
  });
  it('bota seslenilince o bot cevaplar; takım mesajına ortak bot; rakip uzak insansa cevap ortak botun', () => {
    const seats = four('esli');
    const p = planReply('lucky', 0, 3, seats, [], () => 0)!;
    expect(p.seat).toBe(3);
    expect(p.line.rel).not.toBe('mate'); // Dursun rakip: iğneler
    const t = planReply('team_sorry', 0, 2, seats, [], () => 0)!;
    expect(t.seat).toBe(2);
    expect(t.line.id).toMatch(/^qr_defne_oops_/);
    expect(t.line.rel).not.toBe('opp');
  });
});

describe('ev sahibi doğrulaması (protokol)', () => {
  const seats: TalkSeat[] = [
    {seat: 0, char: 'riza', team: 0, human: true},
    {seat: 1, char: 'cem', team: 1, human: false},
    {seat: 2, char: 'dursun', team: 0, human: true, remote: true}, // ortak: çevrimiçi insan ("Mustafa")
    {seat: 3, char: 'defne', team: 1, human: false},
  ];
  const gate = () => new ChatGate({ids: QUICK_IDS, policy: chatPolicy({game: 'blof', mode: 'esli', seats, rnd: () => 0})});

  it('geçerli nötr / hedefli söz kabul; başka mesajın, başka karakterin, insana kişiye özel söz reddedilir', () => {
    const g = gate();
    let t = 0;
    const next = () => (t += CHAT_COOLDOWN_MS);
    expect(g.admit(0, {msg: 'hello', line: 'qc_riza_hello_1'}, next()).v).toBe('ok');
    expect(g.admit(0, {msg: 'lucky', line: 'qc_riza_lucky_cem_1', to: 1}, next()).v).toBe('ok');
    expect(g.admit(0, {msg: 'lucky', line: 'qc_riza_lucky_dursun_1', to: 2}, next()).v).toBe('invalid'); // Dursun insan
    expect(g.admit(0, {msg: 'lucky', line: 'qc_riza_lucky_cem_1', to: 3}, next()).v).toBe('invalid'); // koltuk 3 Defne
    expect(g.admit(0, {msg: 'nice', line: 'qc_riza_lucky_cem_1', to: 1}, next()).v).toBe('invalid'); // başka mesajın sözü
    expect(g.admit(0, {msg: 'hello', line: 'qc_cem_hello_1'}, next()).v).toBe('invalid'); // başka karakterin sözü
    expect(g.admit(0, {msg: 'tea', line: 'qc_riza_tea_1'}, next()).v).toBe('invalid'); // "Dursun, çaylar benden!" Dursun insan
    expect(g.admit(0, {msg: 'tea', line: 'qc_riza_tea_31'}, next()).v).toBe('ok');
    expect(g.admit(0, {msg: 'team_ours', line: 'qc_riza_team_ours_1', to: 2}, next()).v).toBe('ok');
    expect(g.admit(0, {msg: 'team_ours', line: 'qc_riza_team_ours_1', to: 1}, next()).v).toBe('invalid'); // rakibe takım mesajı
    expect(g.admit(1, {msg: 'hello', line: 'qc_cem_hello_1'}, next()).v).toBe('invalid'); // botlar mesaj göndermez
    expect(g.admit(0, {msg: 'hello', line: 'riza_botPisti_1'}, next()).v).toBe('invalid'); // söyleyiş değil
  });

  it('bozuk alanlar reddedilir ve hız kotasından düşmez; eski istemci (söyleyişsiz) kabul, herkes için tek nötr söz', () => {
    const g = gate();
    for (const bad of ['', 'X'.repeat(10), 'qc_riza_hello_1; drop', 'a'.repeat(80), 42, {}, ['qc_riza_hello_1']])
      expect(g.admit(0, {msg: 'hello', line: bad}, 0).v, String(bad)).toBe('invalid');
    for (const to of [0, 1.5, -2, 99, 'x', {}]) expect(g.admit(0, {msg: 'hello', line: 'qc_riza_hello_1', to}, 0).v, String(to)).toBe('invalid');
    const ok = g.admit(0, {msg: 'tea'}, 0);
    expect(ok.v).toBe('ok'); // geçersizler kotayı yemedi
    expect(ok.out!.line).toBe('qc_riza_tea_31'); // Dursun insan: adsız nötr söz
    expect(g.admit(0, {msg: 'tea'}, 1000).v).toBe('rate');
  });

  it('yayın: söyleyiş + hedef + ev sahibinin planladığı bot cevabı; politika yoksa eski biçim', () => {
    const g = gate();
    const r = g.admit(0, {msg: 'lucky', line: 'qc_riza_lucky_cem_1', to: 1}, 0);
    expect(r.out).toMatchObject({t: 'chat', seat: 0, msg: 'lucky', line: 'qc_riza_lucky_cem_1', to: 1});
    expect(r.out!.rp!.seat).toBe(1); // seslenilen bot (Cem) cevaplar
    expect(lineById(r.out!.rp!.line)!.char).toBe('cem');
    expect(replyLineOk('lucky', 0, r.out!.rp!, seats)).toBe(true);
    expect(replyLineOk('lucky', 0, {...r.out!.rp!, seat: 2}, seats)).toBe(false); // insan koltuğa bot cevabı yok
    // alıcı tarafı da aynı denetimi yapar (kötü niyetli / bozuk ev sahibine karşı)
    expect(sayLineOk(0, 'lucky', 'qc_riza_lucky_cem_1', 1, seats)).toBe(true);
    expect(sayLineOk(0, 'lucky', 'qc_riza_lucky_dursun_1', 2, seats)).toBe(false);
    expect(sayLineOk(0, 'lucky', 'qc_riza_lucky_cem_1', -1, seats)).toBe(false);
    const legacy = new ChatGate({ids: QUICK_IDS});
    expect(legacy.admit(0, {msg: 'lucky', line: 'qc_riza_lucky_cem_1', to: 1}, 0).out).toEqual({t: 'chat', seat: 0, msg: 'lucky'});
  });

  it('LocalHost (Blöf) + GameClient: chat(msg, line, to) → doğrulanmış yayın; kişiye özel söz insana giderse düşer', () => {
    const clock = new VirtualClock();
    const ss: TalkSeat[] = [{seat: 0, char: 'defne', team: 0, human: true}, {seat: 1, char: 'riza', team: 1, human: false}, {seat: 2, char: 'cem', team: 2, human: false}];
    const local = createBlofLocal({cfg: blofConfigFor('3', 7), seats: ['human', 'orta', 'orta'], clock, chatIds: QUICK_IDS, chatPolicy: chatPolicy({game: 'blof', mode: '3', seats: ss, rnd: () => 0})});
    const got: ChatMsg[] = [];
    local.client!.on(m => void (m.t === 'chat' && got.push(m as ChatMsg)));
    local.host.start();
    local.client!.chat('bluffing', 'qc_defne_bluffing_riza_1', 1);
    expect(got.length).toBe(1);
    expect(got[0]).toMatchObject({seat: 0, msg: 'bluffing', line: 'qc_defne_bluffing_riza_1', to: 1});
    clock.advance(CHAT_COOLDOWN_MS);
    local.client!.chat('bluffing', 'qc_defne_bluffing_riza_1', 2); // koltuk 2 Cem: söz Rıza'ya yazılmış
    expect(got.length).toBe(1);
    local.client!.chat('gg'); // eski istemci
    expect(got.length).toBe(2);
    expect(got[1].line).toMatch(/^qc_defne_gg_\d+$/);
    local.host.stop();
  });
});

// ── denetleyici: belirlenimci yayın + öneriler ──
class FakeVoice implements VoicePort {
  isEnabled = true;
  size = 0;
  busy = false;
  has(): boolean {
    return false;
  }
  duration(): number | null {
    return null;
  }
  play(): boolean {
    return false;
  }
  stop(): void {}
  setEnabled(on: boolean): void {
    this.isEnabled = on;
  }
}
function device(seats: ChatSession['seats'], me: number, mode: TableMode, send: ChatSession['send'], game: 'pisti' | 'blof' = 'pisti') {
  const said: {seat: number; text: string}[] = [];
  const hud = {
    say: (text: string, _m?: unknown, _ms?: number, seat?: number) => (said.push({seat: seat ?? -1, text}), said.length),
    unsay: () => undefined, holdSay: () => undefined, setChat: () => undefined, chatCooldown: () => undefined, onChat: () => undefined,
  } as unknown as GameHud;
  const sheet: QuickChatSheetPort & {items: {id: string; hot?: boolean}[]} = {
    isOpen: false, items: [], open(o) {
      this.items = o.items.map(i => ({id: i.id, hot: i.hot}));
    }, close() {}, cool() {},
  };
  const qc = new QuickChat(hud, () => sheet, new SpeechDirector(new FakeVoice(), {now: () => Date.now()}), null, 0);
  qc.attach({game, mode, me, seats, send});
  return {qc, said, sheet};
}

describe('QuickChat: çevrimiçi belirlenimci yayın, hedef, öneri', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const seats = [
    {seat: 0, char: 'cem', team: 0, human: true},
    {seat: 1, char: 'riza', team: 1, human: false},
    {seat: 2, char: 'defne', team: 0, human: true, remote: true},
    {seat: 3, char: 'dursun', team: 1, human: false},
  ];

  it('iki cihaz aynı yayını alır → aynı söz, aynı bot cevabı; hedef bota özel söz taşınır', () => {
    const relay = new ChatRelay({ids: QUICK_IDS, policy: chatPolicy({game: 'pisti', mode: 'esli', seats, rnd: () => 0})});
    const a = device(seats, 0, 'esli', (msg, line, to) => void relay.send(0, msg, line, to));
    const b = device(seats, 2, 'esli', () => undefined);
    relay.on(m => {
      a.qc.receive(m.seat, m.msg, m);
      b.qc.receive(m.seat, m.msg, m);
    });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    a.qc.acted(3); // Dursun (bot) az önce oynadı
    expect(a.qc.send('lucky')).toBe(true);
    rnd.mockRestore();
    vi.advanceTimersByTime(8000);
    expect(a.said.length).toBeGreaterThanOrEqual(1);
    expect(a.said).toEqual(b.said);
    expect(a.said[0].text).toBe(lineById('qc_cem_lucky_dursun_1')!.text);
    if (a.said[1]) expect(a.said[1].seat).toBe(3);
  });

  it('öneri: olaydan hemen sonra açılınca uygun mesajlar başta ve parlak; süre dolunca varsayılan sıra; öğe sayısı sabit', () => {
    const one = [{seat: 0, char: 'defne', team: 0, human: true}, {seat: 1, char: 'riza', team: 1, human: false}];
    const d = device(one, 0, '1v1', () => undefined, 'blof');
    d.qc.open();
    const base = d.sheet.items.map(i => i.id);
    expect(d.sheet.items.some(i => i.hot)).toBe(false);
    d.qc.cue('theyScored', 1);
    d.qc.open();
    const hot = d.sheet.items.filter(i => i.hot).map(i => i.id);
    expect(hot).toEqual(CUE_PICKS.theyScored.filter(id => base.includes(id)).slice(0, 4));
    expect(d.sheet.items.slice(0, hot.length).every(i => i.hot)).toBe(true);
    expect(d.sheet.items.length).toBe(base.length);
    vi.advanceTimersByTime(CUE_TTL_MS + 50);
    d.qc.open();
    expect(d.sheet.items.map(i => i.id)).toEqual(base);
    // eşlide takım mesajları menüde (16 = Blöf 14 + 2), eşli değilse yok
    const e = device(seats, 0, 'esli', () => undefined, 'blof');
    e.qc.open();
    expect(e.sheet.items.length).toBe(16);
    expect(e.sheet.items.map(i => i.id)).toContain('team_sorry');
    expect(arrange([{id: 'a', label: 'a', icon: 'x'}], null)).toEqual([{id: 'a', label: 'a', icon: 'x'}]);
  });

  it('gelen yayında geçersiz söyleyiş → nötr söz; geçersiz bot cevabı → cevap yok', () => {
    const d = device(seats, 2, 'esli', () => undefined);
    d.qc.receive(0, 'lucky', {line: 'qc_cem_lucky_defne_1', to: 2, rp: {seat: 2, line: 'qr_defne_taunt_1', ms: 900}}); // Defne insan
    vi.advanceTimersByTime(8000);
    expect(d.said.length).toBe(1);
    expect(d.said[0].text).not.toMatch(/Defne/);
  });

  it('önden indirme kümesi: hedefli sözler + ilk nötr sözler önce (1\'e 1\'de çözülecek ≈ 14), hepsi gerçek kimlik', () => {
    const ids = sayIdsFor('cem', 'blof', '1v1', ['defne']);
    expect(ids.slice(0, 14)).toContain('qc_cem_lucky_defne_1');
    expect(ids.slice(0, 14)).toContain('qc_cem_wow_1');
    for (const id of ids) expect(lineById(id)?.char).toBe('cem');
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ek replik verisi', () => {
  const extra = extraLines();
  const lines = extra.map(x => lineById(x.id)!);

  it('kayıtlı, kimlik biçimi doğru, ses paketi grubu doğru, sesi üretilmiş (manifestte)', () => {
    const man = manifest as Record<string, {url: string; dur: number}>;
    for (const l of lines) {
      expect(l, 'kayıt').toBeTruthy();
      if (l.moment === 'quickSay') {
        expect(l.id).toMatch(new RegExp(`^qc_${l.char}_[a-z_]+_\\d+$`));
        expect(packGroup(l.id)).toBe('say');
      } else {
        expect(l.id).toMatch(/^[a-z]+_[A-Za-z]+_\d+$/);
        expect(packGroup(l.id)).toBe(l.moment.startsWith('blof') ? 'blof' : 'pisti');
      }
      expect(man[l.id]?.dur, `${l.id} sesi yok`).toBeGreaterThan(0.5);
      expect(man[l.id].url).toBe(`${l.char}/${soundKey(l.id)}.mp3`);
    }
  });

  it('uzunluk, etiket ve süre kuralları; bütçe ≤ 6500 karakter (Geveze için Blöf pas / bekleme + Pişti boş masa +0,8k dahil); her mesajın hedefli sözü üç hedefte de var', () => {
    let chars = 0;
    for (const l of lines) {
      expect(l.text.length, l.id).toBeLessThanOrEqual(64);
      expect(l.text.split(/\s+/).length, l.id).toBeLessThanOrEqual(12);
      expect(l.text, l.id).not.toMatch(/[[\]]/);
      const tags = l.tts.match(/\[[^\]]*\]/g) ?? [];
      expect(tags.length, l.id).toBeLessThanOrEqual(2);
      for (const t of tags) expect(t, l.id).toMatch(/^\[[a-z ]+\]$/);
      if (l.char === 'defne') expect(l.tts).not.toMatch(/\[(shouting|shouts)\]/);
      const max = l.moment === 'quickSay' ? 3 : momentPriority(l.moment) === 3 ? 6 : 3.2;
      expect(speechSeconds(l.char, l.tts), l.id).toBeLessThanOrEqual(max);
      if (soundKey(l.id) === l.id) chars += l.tts.length;
    }
    expect(chars).toBeLessThanOrEqual(6500);
    for (const s of CHAR_IDS)
      for (const m of TARGET_MSGS)
        for (const t of CHAR_IDS) if (s !== t) expect(lineById(targetSayId(s, m, t)), `${s}→${t} ${m}`).toBeTruthy();
    // takım mesajları: her karakterde 2 söyleyiş, 3–4 kelimelik menü sözü
    for (const t of TEAM_CHAT)
      for (const c of CHAR_IDS) {
        expect(lineById(`qc_${c}_${t.id}_1`) && lineById(`qc_${c}_${t.id}_2`), `${c}/${t.id}`).toBeTruthy();
        const w = t.labels[c].split(/\s+/).length;
        expect(w >= 3 && w <= 4, `${c}/${t.id} "${t.labels[c]}"`).toBe(true);
      }
  });

  it('bir anın havuzunda aynı ses iki kez yok; ince Blöf havuzları büyüdü', () => {
    for (const c of CHAR_IDS) {
      for (const m of ['blofSurvivedPlayer', 'blofWrongCall', 'blofCaughtByPlayer', 'blofStart', 'botLuckyCapture']) {
        const d = new DialogueDirector();
        const seen = new Set<string>();
        for (let i = 0; i < 60; i++) seen.add(soundKey(d.pickLine(c, m, mulberry32(i))!.id));
        expect(seen.size, `${c}/${m}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
