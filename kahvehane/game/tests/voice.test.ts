import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  BANTER,
  BANTER_CTX,
  BANTER_RULES,
  BLOF_MOMENTS,
  CHAR_IDS,
  CHAT_PROFILES,
  POOL_ALIAS,
  TABLE_MOMENTS,
  CHATTER_GAP_MS,
  DIALOGUE,
  DialogueDirector,
  EVENT_GAP_MS,
  HISTORY,
  META_MOMENTS,
  MOMENTS,
  MOMENT_RULES,
  QUICK_CHAT,
  SAMPLE_IDS,
  allLines,
  blofKey,
  cooldownHands,
  dialogue,
  freshMemory,
  groupOf,
  isEndMoment,
  lineById,
  linesFor,
  momentPriority,
  noteBanter,
  pickBanter,
  pickLine,
  planQuickReply,
  quickMenu,
  quickReply,
  quickSay,
  resetDialogue,
  ruleFor,
  shouldSpeak,
  soundKey,
  speechSeconds,
  stabilityFor,
  stripTags,
  ttsHash,
  type BanterRequest,
  type ChatLevel,
  type TalkMemory,
} from '../src/ai/dialogue';
import {BlofTalk, blofPriority} from '../src/ai/blofDialogue';
import {POSES} from '../src/game/roster';
import {VoicePlayer} from '../src/audio/voice';
import {mulberry32} from '../src/core/rng';

const MOODS = new Set<string>(POSES);
/** Oyunun (app.ts / match.ts) yayınladığı Pişti anları: her karakterde dolu olmalı. */
const GAME_MOMENTS = [
  'start', 'botThinking', 'botPisti', 'botJackPisti', 'playerPisti', 'playerJackPisti', 'botBigCapture',
  'playerBigCapture', 'botJackCapture', 'playerJackCapture', 'playerDumpedValuable', 'botLuckyCapture', 'lastRound',
  'botLeading', 'playerLeading', 'comeback', 'myTurnIdle', 'tableEmpty', 'playerWin', 'botWin', 'draw',
];
/** Sık, oyun içi anlar: çok seçenek (sesler dahil), kısa. */
const FREQUENT = ['botThinking', 'myTurnIdle', 'botBigCapture', 'playerBigCapture', 'botJackCapture', 'playerJackCapture', 'playerDumpedValuable'];
/** Büyük anlar (oyun zaten duruyor): çok seçenek, uzun espriye izin. */
const BIG = ['start', 'botPisti', 'playerPisti', 'botWin', 'playerWin'];
const uniqueSounds = (ls: readonly {id: string}[]): number => new Set(ls.map(l => soundKey(l.id))).size;

describe('replik verisi', () => {
  const all = allLines();

  it('kimlikler benzersiz ve dosya adına uygun', () => {
    const ids = all.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of all) {
      if (l.moment === 'banter') expect(l.id).toMatch(/^banter_[a-z]+_[a-z]+_[a-zA-Z]+_\d+[abc]$/);
      else if (l.moment === 'quickSay') expect(l.id).toMatch(new RegExp(`^qc_${l.char}_[a-z_]+_\\d+$`));
      else if (l.moment === 'quickReply') expect(l.id).toMatch(new RegExp(`^qr_${l.char}_[a-z]+_\\d+$`));
      else {
        expect(l.id).toMatch(/^[a-z]+_[A-Za-z]+_\d+$/);
        expect(l.id.startsWith(`${l.char}_${l.moment}_`)).toBe(true);
      }
    }
  });

  it('her karakter: oyunun her Pişti anında ≥2, sık anlarda ≥10, büyük anlarda ≥7 seçenek', () => {
    for (const c of CHAR_IDS) {
      for (const m of GAME_MOMENTS) expect(linesFor(c, m).length, `${c}/${m}`).toBeGreaterThanOrEqual(2);
      for (const m of FREQUENT) expect(uniqueSounds(linesFor(c, m)), `${c}/${m}`).toBeGreaterThanOrEqual(10);
      for (const m of BIG) expect(linesFor(c, m).length, `${c}/${m}`).toBeGreaterThanOrEqual(7);
      // sık anlarda en az 4 "yalnız ses" seçeneği (gülme / homurtu)
      for (const m of FREQUENT) expect(linesFor(c, m).filter(l => (l.weight ?? 1) >= 1.5).length, `${c}/${m}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('her karakter: her Blöf anında ≥2 replik; menü anları dolu', () => {
    for (const c of CHAR_IDS) {
      for (const m of BLOF_MOMENTS) expect(linesFor(c, blofKey(m)).length, `${c}/${m}`).toBeGreaterThanOrEqual(2);
      expect(linesFor(c, 'galleryIntro').length).toBe(2);
      expect(linesFor(c, 'shopPitch').length).toBe(3);
      expect(linesFor(c, 'shopBought').length).toBe(2);
      expect(linesFor(c, 'shopPoor').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('bir anın havuzunda aynı ses iki kez yok', () => {
    for (const c of CHAR_IDS)
      for (const m of [...MOMENTS, ...META_MOMENTS, ...BLOF_MOMENTS.map(blofKey)]) {
        const pool = linesFor(c, m);
        expect(uniqueSounds(pool), `${c}/${m}`).toBe(pool.length);
      }
  });

  it('uzunluk sınırları, geçerli duygu ve ses etiketleri', () => {
    for (const l of all) {
      expect(l.text.trim().length, l.id).toBeGreaterThan(0);
      expect(l.text.length, l.id).toBeLessThanOrEqual(64);
      expect(l.text.split(/\s+/).length, l.id).toBeLessThanOrEqual(12);
      expect(l.text, l.id).not.toMatch(/[[\]]/);
      expect(l.tts.length, l.id).toBeLessThanOrEqual(120);
      expect(stripTags(l.tts).length, l.id).toBeGreaterThan(0);
      const tags = l.tts.match(/\[[^\]]*\]/g) ?? [];
      expect(tags.length, l.id).toBeLessThanOrEqual(2);
      for (const t of tags) expect(t, l.id).toMatch(/^\[[a-z ]+\]$/);
      expect(l.tts, l.id).not.toMatch(/\[(shouting|shouts)\]/.source && l.char === 'defne' ? /\[(shouting|shouts)\]/ : /$^/); // Defne asla bağırmaz
      if (l.mood != null) expect(MOODS.has(l.mood), l.id).toBe(true);
      if (l.weight !== undefined) expect(l.weight, l.id).toBeGreaterThan(0);
    }
  });

  it('konuşma süresi bütçesi: sık anlar kısa, uzun espri yalnız öncelik 3 (oyunun durduğu) anlarda', () => {
    for (const l of all) {
      const s = speechSeconds(l.char, l.tts);
      let max = momentPriority(l.moment) === 3 ? 6 : 3.2;
      if (FREQUENT.includes(l.moment)) max = 2.7;
      if (['botPisti', 'playerPisti', 'botJackPisti', 'playerJackPisti'].includes(l.moment)) max = 5;
      if (l.moment === 'blofCallOut' || l.moment === 'blofPass') max = 2;
      if (l.moment === 'banter') max = 3.6;
      if (l.moment === 'quickSay' || l.moment === 'quickReply') max = 3;
      if (isEndMoment(l.moment)) max = 3.1; // el / maç sonu: kısa, karşılıklı diziler (≤ ~3 sn)
      expect(s, `${l.id} ${l.tts}`).toBeLessThanOrEqual(max);
    }
  });

  it('balon metni tts\'ten etiketler silinerek çıkar (açık metin verilenler hariç)', () => {
    expect(stripTags('[laughs] Pişti!  Çaylar [sighs] senden !')).toBe('Pişti! Çaylar senden!');
    for (const l of DIALOGUE.riza.botPisti ?? []) expect(l.text).toBe(stripTags(l.tts));
  });

  it('pişti ve kazanma anlarında Rıza her zaman bir duygu kartı gösterir', () => {
    for (const m of ['botPisti', 'botJackPisti', 'playerPisti', 'playerJackPisti', 'botWin', 'playerWin'])
      for (const l of linesFor('riza', m)) expect(l.mood, l.id).toBeTruthy();
    expect(DIALOGUE.riza.botPisti?.[0].mood).toBe('kahkaha');
  });

  it('ttsHash kararlı ve metne duyarlı', () => {
    expect(ttsHash('[laughs] Pişti!')).toBe(ttsHash('[laughs] Pişti!'));
    expect(ttsHash('[laughs] Pişti!')).not.toBe(ttsHash('[laughs] Pişti?'));
    expect(ttsHash('abc')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('kararlılık (v3 stability) etiketlerden çıkar, satır değeri kazanır; tekrar beklemesi uzunluğa göre', () => {
    expect(stabilityFor({tts: '[laughs] Pişti!'})).toBe(0);
    expect(stabilityFor({tts: '[shouting] Blöf!'})).toBe(0);
    expect(stabilityFor({tts: '[deadpan] Pişti.'})).toBe(1);
    expect(stabilityFor({tts: '[whispers] Aramızda.'})).toBeNull();
    expect(stabilityFor({tts: '[laughs] Hah!', stab: 0.5})).toBe(0.5);
    expect(cooldownHands({tts: '[laughs] Hah!'})).toBe(0);
    expect(cooldownHands({tts: '[chuckles] Kırk yıllık usta, bu fiyata? Kelepir evlat, kelepir!'})).toBe(25);
    expect(cooldownHands({tts: 'x', cd: 7})).toBe(7);
  });

  it('paylaşılan sesler: aynı karakter + aynı tts tek ses anahtarı', () => {
    const a = linesFor('riza', 'botThinking').find(l => l.tts === '[chuckles] Heh heh…')!;
    const b = linesFor('riza', 'botJackCapture').find(l => l.tts === '[chuckles] Heh heh…')!;
    expect(a.id).not.toBe(b.id);
    expect(soundKey(a.id)).toBe(soundKey(b.id));
  });

  it('her anın bir kuralı var; pişti anları her zaman konuşur; gruplar', () => {
    for (const m of MOMENTS) expect(MOMENT_RULES[m]).toBeTruthy();
    for (const m of ['botPisti', 'botJackPisti', 'playerPisti', 'playerJackPisti'] as const) expect(MOMENT_RULES[m].kind).toBe('always');
    for (const m of BLOF_MOMENTS) expect(ruleFor(blofKey(m))).not.toBe(ruleFor('yokBoyleBirAn'));
    for (const m of META_MOMENTS) expect(momentPriority(m)).toBe(3);
    expect(momentPriority('blofCallOut')).toBe(3);
    expect(momentPriority('blofPass')).toBe(1);
    expect(groupOf({moment: 'blofCatchPlayer'})).toBe('blof');
    expect(groupOf({moment: 'shopPitch'})).toBe('meta');
    expect(groupOf({moment: 'botPisti'})).toBe('pisti');
  });

  it('deneme seçkisi: karakter başına 4 + 2 atışma + hızlı sohbet, ≤ ~1000 karakter', () => {
    let chars = 0;
    for (const id of SAMPLE_IDS) {
      const l = lineById(id);
      expect(l, id).toBeTruthy();
      chars += l!.tts.length;
    }
    for (const c of CHAR_IDS) expect(SAMPLE_IDS.filter(id => id.startsWith(`${c}_`)).length, c).toBe(4);
    expect(SAMPLE_IDS.some(id => id.startsWith('qc_'))).toBe(true);
    expect(SAMPLE_IDS.some(id => id.startsWith('qr_'))).toBe(true);
    expect(new Set(SAMPLE_IDS.filter(id => id.startsWith('banter_')).map(id => id.slice(0, -1))).size).toBe(2);
    expect(chars).toBeLessThanOrEqual(1000);
  });

  it('kredi bütçesi: tekil ses dosyaları toplamı ≤ ~43,5k karakter (Geveze masa sohbeti +2,9k dahil); el / maç sonu grubu ≤ 8k', () => {
    const seen = new Set<string>();
    let chars = 0;
    let end = 0;
    for (const l of all)
      if (!seen.has(soundKey(l.id))) {
        seen.add(soundKey(l.id));
        chars += l.tts.length;
        if (groupOf(l) === 'end') end += l.tts.length;
      }
    expect(chars).toBeLessThanOrEqual(43_500);
    expect(end).toBeGreaterThan(5000);
    expect(end).toBeLessThanOrEqual(8000);
  });
});

describe('pickLine', () => {
  beforeEach(() => resetDialogue());

  it('bilinmeyen karakter / an → null', () => {
    expect(pickLine('yok', 'botPisti')).toBeNull();
    expect(pickLine('riza', 'boyleBirAnYok')).toBeNull();
  });

  it(`karakterin son ${HISTORY} sesini tekrar etmez (karışık anlarda, paylaşılan sesler dahil)`, () => {
    const rnd = mulberry32(7);
    const moments = ['botPisti', 'playerPisti', 'botThinking', 'myTurnIdle', 'botBigCapture', 'botWin'];
    const seq: string[] = [];
    const mom: string[] = [];
    for (let i = 0; i < 400; i++) {
      const m = moments[Math.floor(rnd() * moments.length)];
      const l = pickLine('riza', m, rnd);
      expect(l).not.toBeNull();
      seq.push(soundKey(l!.id));
      mom.push(m);
    }
    let checked = 0;
    for (let i = 0; i < seq.length; i++) {
      const window = seq.slice(Math.max(0, i - HISTORY), i);
      if (linesFor('riza', mom[i]).some(l => !window.includes(soundKey(l.id)))) {
        expect(window).not.toContain(seq[i]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('tek anda: hiçbir replik art arda gelmez, küçük havuzda tam sıra; hepsi duyulur', () => {
    const rnd = mulberry32(42);
    for (const m of ['botPisti', 'playerJackPisti', 'draw', 'botLuckyCapture']) {
      resetDialogue();
      const pool = linesFor('riza', m);
      const seq = Array.from({length: 120}, () => pickLine('riza', m, rnd)!.id);
      const win = pool.length > HISTORY ? HISTORY : pool.length - Math.max(1, Math.floor(pool.length / 3));
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1]);
        if (win > 0) expect(seq.slice(Math.max(0, i - win), i)).not.toContain(seq[i]);
      }
      expect(new Set(seq).size).toBe(pool.length);
    }
  });

  it('küçük havuz da hep döner', () => {
    for (let i = 0; i < 6; i++) expect(pickLine('defne', 'blofNearWin')).not.toBeNull();
  });

  it('dağılım: ağırlıklar repliği tekeline almaz', () => {
    const rnd = mulberry32(3);
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const id = pickLine('riza', 'myTurnIdle', rnd)!.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const n = linesFor('riza', 'myTurnIdle').length;
    for (const c of counts.values()) expect(c).toBeGreaterThan(600 / n / 3);
  });
});

describe('kalıcı hafıza (eller / oturumlar arası)', () => {
  const memStore = () => {
    let saved: unknown = null;
    return {load: () => saved, save: (m: TalkMemory) => (saved = JSON.parse(JSON.stringify(m))), peek: () => saved};
  };

  it('yeni oturum son replikleri hatırlar; uzun espri ~25 el beklemeden dönmez, kısa ses hemen döner', () => {
    const store = memStore();
    const a = new DialogueDirector();
    a.attach(store);
    a.newHand(2);
    const rnd = mulberry32(9);
    const first = Array.from({length: 4}, () => a.pickLine('riza', 'botWin', rnd)!.id);
    // yeni oturum (aynı depo): son replikler tekrar edilmez
    const b = new DialogueDirector();
    b.attach(store);
    b.newHand(2);
    for (let i = 0; i < 3; i++) expect(first).not.toContain(b.pickLine('riza', 'botWin', rnd)!.id);
    // uzun replik: tekrar beklemesi el sayısıyla
    const long = linesFor('riza', 'botWin').find(l => cooldownHands(l) >= 25)!;
    const c = new DialogueDirector();
    c.attach(store);
    const mem = c.memory as TalkMemory;
    mem.heard[soundKey(long.id)] = [mem.hand, ++mem.seq];
    mem.recent.riza = [];
    // el başına bir el sonu repliği: havuz tükenmeden uzun espri tekrar seçilmez
    for (let h = 0; h < 5; h++) {
      c.newHand(2);
      expect(c.pickLine('riza', 'botWin', rnd)!.id).not.toBe(long.id);
    }
  });

  it('bozuk / eski depo verisi temiz hafızaya düşer; depo hatası yutulur', () => {
    const d = new DialogueDirector();
    d.attach({load: () => ({v: 99, hand: 'x'}), save: () => undefined});
    expect(d.memory.hand).toBe(0);
    const e = new DialogueDirector();
    e.attach({load: () => {
      throw new Error('yok');
    }, save: () => {
      throw new Error('dolu');
    }});
    e.newHand(4);
    expect(e.pickLine('cem', 'botPisti')).not.toBeNull();
  });
});

describe('shouldSpeak', () => {
  let d: DialogueDirector;
  const yes = () => 0; // olasılık her zaman tutar
  const no = () => 0.999999;
  beforeEach(() => {
    d = new DialogueDirector();
    d.clock = () => 0;
  });

  it('pişti anları her zaman konuşur (art arda bile)', () => {
    for (let i = 0; i < 5; i++) expect(d.shouldSpeak('botPisti', 1000 + i * 10, no)).toBe(true);
    expect(d.shouldSpeak('playerJackPisti', 1100, no)).toBe(true);
  });

  it('olay tepkisi kuralın olasılığıyla ve en az EVENT_GAP_MS arayla', () => {
    expect(d.shouldSpeak('botBigCapture', 10_000, yes)).toBe(true);
    expect(d.shouldSpeak('playerBigCapture', 10_000 + EVENT_GAP_MS - 1, yes)).toBe(false);
    expect(d.shouldSpeak('playerBigCapture', 10_000 + EVENT_GAP_MS, yes)).toBe(true);
    const rnd = mulberry32(11);
    let hit = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (new DialogueDirector().shouldSpeak('botJackCapture', 0, rnd)) hit++;
    expect(Math.abs(hit / N - MOMENT_RULES.botJackCapture.chance)).toBeLessThan(0.04);
  });

  it('kalabalık masa (4 kişi) olasılığı düşürür', () => {
    const rnd = mulberry32(12);
    let one = 0;
    let four = 0;
    for (let i = 0; i < 4000; i++) {
      if (new DialogueDirector().shouldSpeak('botBigCapture', 0, rnd)) one++;
      const q = new DialogueDirector();
      q.setSeats(4);
      if (q.shouldSpeak('botBigCapture', 0, rnd)) four++;
    }
    expect(four).toBeLessThan(one * 0.75);
  });

  it('boş laf en fazla CHATTER_GAP_MS arayla', () => {
    expect(d.shouldSpeak('myTurnIdle', 20_000, yes)).toBe(true);
    expect(d.shouldSpeak('tableEmpty', 20_000 + CHATTER_GAP_MS - 1, yes)).toBe(false);
    expect(d.shouldSpeak('tableEmpty', 20_000 + CHATTER_GAP_MS, yes)).toBe(true);
    expect(d.shouldSpeak('botPisti', 40_000, yes)).toBe(true);
    expect(d.shouldSpeak('botThinking', 45_000, yes)).toBe(false);
  });

  it('aynı an kendi bekleme süresine uyar (myTurnIdle 12 sn)', () => {
    expect(d.shouldSpeak('myTurnIdle', 0, yes)).toBe(true);
    expect(d.shouldSpeak('myTurnIdle', 9_000, yes)).toBe(false);
    expect(d.shouldSpeak('myTurnIdle', 12_000, yes)).toBe(true);
  });

  it('sık anlar yorulur: kısa sürede tekrarlanan anın olasılığı düşer', () => {
    const rnd = mulberry32(5);
    let first = 0;
    let later = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const dd = new DialogueDirector();
      dd.shouldSpeak('botBigCapture', 0, yes);
      dd.shouldSpeak('botBigCapture', EVENT_GAP_MS, yes);
      dd.shouldSpeak('botBigCapture', EVENT_GAP_MS * 2, yes);
      if (dd.shouldSpeak('botBigCapture', EVENT_GAP_MS * 3, rnd)) later++;
      if (new DialogueDirector().shouldSpeak('botBigCapture', 0, rnd)) first++;
    }
    expect(later).toBeLessThan(first * 0.5);
  });

  it('zorla (shouldSpeak\'siz) seçilen pişti repliği boş laf sayacını başlatır', () => {
    resetDialogue();
    let t = 100_000;
    dialogue.clock = () => t;
    try {
      expect(pickLine('riza', 'botPisti')).not.toBeNull();
      t += 3000;
      expect(shouldSpeak('botThinking', t, yes)).toBe(false);
      t += CHATTER_GAP_MS;
      expect(shouldSpeak('botThinking', t, yes)).toBe(true);
    } finally {
      dialogue.clock = () => performance.now();
      resetDialogue();
    }
  });

  it('bilinmeyen an olay tepkisi gibi davranır', () => {
    expect(d.shouldSpeak('botLuckyStreak', 0, yes)).toBe(true);
    expect(d.shouldSpeak('botLuckyStreak', 100, yes)).toBe(false);
  });

  it('react: repliği olmayan an sayacı bozmaz', () => {
    expect(d.react('defne', 'boyleBirAnYok', 0, yes)).toBeNull();
    expect(d.react('defne', 'botBigCapture', 10, yes)?.id).toBe('defne_botBigCapture_1');
  });
});

describe('sohbet seviyeleri: masa sohbeti (maç ortası)', () => {
  const LEVELS: readonly ChatLevel[] = ['sakin', 'normal', 'geveze'];

  it('profiller Sakin < Normal < Geveze sıralı; Normal sönümleri tam (eski davranış), Geveze sönümleri yumuşak', () => {
    const [s, n, g] = LEVELS.map(l => CHAT_PROFILES[l]);
    expect([s.table, s.turn, s.chatter]).toEqual([0, 0, 0]);
    expect(n.table).toBeGreaterThan(0);
    expect(n.table).toBeLessThan(0.25); // Normal: yalnız cılız bir tat
    expect(g.table).toBeGreaterThan(n.table * 4);
    expect(g.turn).toBeGreaterThan(n.turn * 5);
    expect(g.event).toBeGreaterThan(n.event);
    expect(g.gap).toBeLessThan(n.gap);
    expect(n.turn).toBe(0.08); // eskiden sabit 0,08
    expect(n.crowd).toBe(1);
    expect(n.damp).toBe(1);
    expect(g.crowd).toBeLessThan(0.5);
    expect(g.damp).toBeLessThan(0.5);
    expect(s.soft).toBeLessThan(1);
    expect(n.soft).toBe(1);
  });

  it('masa sohbeti anları var olan kısa seslerden beslenir: havuz yeterli, hepsi kısa, hepsi kendi anının sesi', () => {
    for (const m of TABLE_MOMENTS) {
      expect(ruleFor(m).kind, m).toBe('table');
      expect(momentPriority(m), m).toBe(1);
      expect(POOL_ALIAS[m], m).toBeTruthy();
    }
    for (const c of CHAR_IDS) {
      for (const m of ['botCapture', 'playerCapture', 'rivalCapture']) {
        const pool = linesFor(c, m);
        expect(pool.length, `${c}/${m}`).toBeGreaterThanOrEqual(5);
        expect(uniqueSounds(pool), `${c}/${m}`).toBe(pool.length);
        for (const l of pool) expect(stripTags(l.tts).length, l.id).toBeLessThanOrEqual(16);
      }
      expect(linesFor(c, 'blofThink').length, c).toBeGreaterThanOrEqual(10);
      expect(linesFor(c, 'blofLaugh').length, c).toBeGreaterThanOrEqual(6);
      // yeni anlar (kendi repliği): Geveze'de sık gelir, havuz küçük kalmasın
      expect(linesFor(c, 'pileGrows').length, c).toBeGreaterThanOrEqual(4);
      expect(linesFor(c, 'blofClaim').length, c).toBeGreaterThanOrEqual(5);
      expect(linesFor(c, 'blofDoubt').length, c).toBeGreaterThanOrEqual(5);
    }
  });

  it('Sakin: masa sohbeti hiç yok; ikincil büyük anlar (soft) yarıya iner, Normal\'de hep', () => {
    const sakin = new DialogueDirector();
    sakin.level = 'sakin';
    for (const m of ['botCapture', 'playerCapture', 'pileGrows', 'blofClaim', 'blofDoubt', 'blofThink'])
      expect(sakin.shouldSpeak(m, 100_000, () => 0), m).toBe(false);
    const rnd = mulberry32(5);
    let sk = 0, nm = 0;
    const normal = new DialogueDirector();
    normal.level = 'normal';
    for (let i = 0; i < 400; i++) {
      if (sakin.force('riza', 'blofCaught', rnd)) sk++;
      if (normal.force('riza', 'blofCaught', rnd)) nm++;
    }
    expect(nm).toBe(400);
    expect(sk).toBeGreaterThan(130);
    expect(sk).toBeLessThan(270);
  });

  it('Sakin: gerçekten büyük anlar (pişti, açılışta yakalama, el sonu) hep, tekrar eden ikincil anlar (soft) ~%40', () => {
    for (const m of ['botPisti', 'playerPisti', 'botWin', 'playerWin', 'blofCaughtByPlayer', 'blofCatchPlayer', 'blofPlayerWin'])
      expect(ruleFor(m).soft, m).toBeFalsy();
    for (const m of ['start', 'blofStart', 'blofCallOut', 'blofSurvivedPlayer', 'blofBotWin', 'blofCaught', 'blofWrongCall'])
      expect(ruleFor(m).soft, m).toBe(true);
    expect(CHAT_PROFILES.sakin.soft).toBeLessThanOrEqual(0.5);
    expect(CHAT_PROFILES.normal.soft).toBe(1);
    expect(CHAT_PROFILES.geveze.soft).toBe(1);
    const sakin = new DialogueDirector();
    sakin.level = 'sakin';
    const rnd = mulberry32(9);
    let ok = 0;
    for (let i = 0; i < 1000; i++) if (sakin.allowSoft('blofCallOut', rnd)) ok++;
    expect(ok).toBeGreaterThan(330);
    expect(ok).toBeLessThan(470);
    expect(sakin.allowSoft('botPisti', () => 0.99)).toBe(true);
  });

  it('Geveze kalabalık masada susmaz: 4 koltukta olasılık düşmez (Normal\'de düşer)', () => {
    const rnd = mulberry32(21);
    const hit = (level: ChatLevel, seats: number): number => {
      let n = 0;
      for (let i = 0; i < 3000; i++) {
        const q = new DialogueDirector();
        q.level = level;
        q.setSeats(seats);
        if (q.shouldSpeak('botCapture', 0, rnd)) n++;
      }
      return n;
    };
    expect(hit('geveze', 4)).toBeGreaterThan(hit('geveze', 2) * 0.85);
    const nmOne = hit('normal', 2), nmFour = hit('normal', 4);
    expect(nmFour).toBeLessThan(nmOne * 0.8);
  });

  /** Bir elin (160 sn) kaba benzetimi: her 7 sn bot sırası, her 12 sn bir sıradan alış (bot / oyuncu sırayla), 40 sn'de bir büyük alış. */
  const simulate = (level: ChatLevel, seed: number, seats = 2): {lines: number; maxGap: number} => {
    const rnd = mulberry32(seed);
    const d = new DialogueDirector();
    d.level = level;
    d.newHand(seats);
    let n = 0, last = 0, maxGap = 0;
    const say = (t: number, m: string): void => {
      if (d.react('cem', m, t, rnd)) {
        n++;
        maxGap = Math.max(maxGap, t - last);
        last = t;
      }
    };
    for (let t = 0; t < 160_000; t += 500) {
      if (t % 7000 === 0 && rnd() < d.profile.turn) say(t, 'botThinking');
      if (t % 12_000 === 3000) say(t, 'botCapture');
      if (t % 12_000 === 9000) say(t, 'playerCapture');
      if (t % 40_000 === 20_000) say(t, 'botBigCapture');
      if (t % 40_000 === 30_000) say(t, 'playerBigCapture');
    }
    maxGap = Math.max(maxGap, 160_000 - last);
    return {lines: n, maxGap};
  };

  it('benzetim: Sakin ≈ sessiz, Normal eskisi gibi seyrek, Geveze belirgin biçimde (≥ 2,5×) daha çok; Geveze\'de uzun sessizlik kısalır', () => {
    const avg = (level: ChatLevel, seats?: number) => {
      let lines = 0, gap = 0;
      for (let s = 1; s <= 30; s++) {
        const r = simulate(level, s, seats);
        lines += r.lines;
        gap += r.maxGap;
      }
      return {lines: lines / 30, gap: gap / 30};
    };
    const s = avg('sakin'), n = avg('normal'), g = avg('geveze');
    expect(s.lines).toBeLessThan(n.lines);
    expect(n.lines).toBeLessThan(5); // Normal elde birkaç satır (eskisi gibi)
    expect(g.lines).toBeGreaterThan(n.lines * 2.5);
    expect(g.lines).toBeGreaterThan(10);
    expect(g.gap).toBeLessThan(n.gap);
    expect(g.gap).toBeLessThan(40_000);
  });
});

describe('Blöf konuşması', () => {
  it('zorunlu anlar her zaman, laf atma seyrek; öncelikler', () => {
    const t = new BlofTalk();
    t.begin(3);
    expect(t.pick('riza', 'callOut', true)?.id).toMatch(/^riza_blofCallOut_\d+$/);
    expect(t.pick('riza', 'catchPlayer', true)?.mood).toBeTruthy();
    expect(t.pick('cem', 'pass', false, 0)).toBeNull(); // az önce konuşuldu: olay aralığı dolmadı
    expect(blofPriority('callOut')).toBe(3);
    expect(blofPriority('caught')).toBe(2);
    expect(blofPriority('pass')).toBe(1);
  });
});

describe('atışma (banter)', () => {
  const base: BanterRequest = {game: 'pisti', ctx: 'steal', a: 'riza', b: 'cem', mode: '4', sameTeam: false, calm: true, quietForMs: 10_000, talk: 'voice'};
  const mem = () => freshMemory().banter;

  it('her yönlü çift en az 3 atışmada; her bağlam dolu; satırlar A–B(–A)', () => {
    for (const a of CHAR_IDS)
      for (const b of CHAR_IDS) if (a !== b) expect(BANTER.filter(e => e.a === a && e.b === b).length, `${a}>${b}`).toBeGreaterThanOrEqual(3);
    for (const c of BANTER_CTX) expect(BANTER.filter(e => e.ctx === c).length, c).toBeGreaterThanOrEqual(3);
    for (const e of BANTER) {
      expect(e.lines.length).toBeGreaterThanOrEqual(2);
      expect(e.lines.length).toBeLessThanOrEqual(3);
      e.lines.forEach((l, i) => expect(l.char).toBe(i % 2 ? e.b : e.a));
    }
  });

  it('kurallar: 1\'e 1 yok, sakin değilse yok, sessizlik ve el aralığı, ses kapalıyken balon, kapalıysa yok', () => {
    const yes = () => 0;
    expect(pickBanter(base, 10, mem(), yes)).not.toBeNull();
    expect(pickBanter({...base, mode: '1v1'}, 10, mem(), yes)).toBeNull();
    expect(pickBanter({...base, calm: false}, 10, mem(), yes)).toBeNull();
    expect(pickBanter({...base, quietForMs: BANTER_RULES.quietMs - 1}, 10, mem(), yes)).toBeNull();
    expect(pickBanter({...base, talk: 'off'}, 10, mem(), yes)).toBeNull();
    expect(pickBanter({...base, talk: 'bubbles'}, 10, mem(), yes)).not.toBeNull();
    expect(pickBanter({...base, game: 'blof'}, 10, mem(), yes)).toBeNull(); // steal yalnız Pişti
    expect(pickBanter({...base, sameTeam: true, mode: 'esli'}, 10, mem(), yes)).toBeNull(); // ortağın yığınını "çalmak" yok
    expect(pickBanter({...base, ctx: 'mateBlame', a: 'cem', b: 'riza', sameTeam: true, mode: 'esli'}, 10, mem(), yes)).not.toBeNull();
    expect(pickBanter({...base, ctx: 'mateBlame', a: 'cem', b: 'riza', sameTeam: true, mode: '4'}, 10, mem(), yes)).toBeNull();
    expect(pickBanter(base, 10, mem(), () => 0.99)).toBeNull(); // olasılık
  });

  it('art arda iki elde yok; aynı atışma uzun süre tekrar etmez', () => {
    const yes = () => 0;
    let m = mem();
    const ex = pickBanter(base, 10, m, yes)!;
    m = noteBanter(m, ex, 10);
    expect(pickBanter(base, 11, m, yes)).toBeNull();
    const again = pickBanter(base, 12, m, yes);
    if (again) expect(again.id).not.toBe(ex.id);
    const only = BANTER.filter(e => e.ctx === base.ctx && e.a === base.a && e.b === base.b);
    let mm = mem();
    for (const e of only) mm = noteBanter(mm, e, 20);
    expect(pickBanter(base, 22, mm, yes)).toBeNull();
    expect(pickBanter(base, 20 + BANTER_RULES.repeatHands, mm, yes)).not.toBeNull();
  });
});

describe('hızlı sohbet', () => {
  it('menü: kimlikler sabit, etiket oyuncunun karakterine göre 3–4 kelime, Blöf mesajları yalnız Blöf\'te', () => {
    for (const q of QUICK_CHAT)
      for (const c of CHAR_IDS) {
        const lab = q.labels[c];
        const w = lab.split(/\s+/).length;
        expect(w, `${q.id}/${c}`).toBeGreaterThanOrEqual(3);
        expect(w, `${q.id}/${c}`).toBeLessThanOrEqual(4);
        expect(lab.length, `${q.id}/${c}`).toBeLessThanOrEqual(28);
        expect(quickSay(c, q.id), `${q.id}/${c}`).not.toBeNull();
      }
    expect(quickMenu('cem', 'pisti').some(m => m.id === 'bluffing')).toBe(false);
    expect(quickMenu('cem', 'blof').find(m => m.id === 'hurry')?.label).toBe('Kanka biraz hızlan');
    expect(quickMenu('defne', 'pisti').find(m => m.id === 'hurry')?.label).toBe('Acele etsek mi canım?');
  });

  it('söyleyiş tekrar etmez; cevap ilişkiye uyar', () => {
    const a = quickSay('riza', 'gg')!;
    const b = quickSay('riza', 'gg', [a.id])!;
    expect(b.id).not.toBe(a.id);
    for (let i = 0; i < 20; i++) {
      expect(quickReply('dursun', 'oops', 'mate')?.rel).not.toBe('opp');
      expect(quickReply('dursun', 'oops', 'opp')?.rel).not.toBe('mate');
    }
  });

  it('cevap planı: insan cevaplamaz (çevrimiçi), eşlide ortak destek verir, gecikme aralıkta', () => {
    const yes = () => 0;
    expect(planQuickReply('gg', [{seat: 1, char: 'cem', human: true, rel: 'opp'}], [], yes)).toBeNull();
    const mate = planQuickReply('oops', [{seat: 2, char: 'defne', human: false, rel: 'mate'}, {seat: 1, char: 'cem', human: false, rel: 'opp'}], [], yes)!;
    expect(mate.seat).toBe(2);
    expect(mate.line.rel).not.toBe('opp');
    const opp = planQuickReply('lucky', [{seat: 2, char: 'defne', human: false, rel: 'mate'}, {seat: 1, char: 'cem', human: false, rel: 'opp'}], [], yes)!;
    expect(opp.seat).toBe(1);
    expect(opp.delayMs).toBeGreaterThanOrEqual(800);
    expect(opp.delayMs).toBeLessThanOrEqual(1600);
    expect(planQuickReply('lucky', [{seat: 1, char: 'cem', human: false, rel: 'opp'}], [], () => 0.999)).toBeNull();
  });
});

// ───────────────────────── VoicePlayer ─────────────────────────

class FakeParam {
  value = 1;
  setValueAtTime(v: number): void {
    this.value = v;
  }
  linearRampToValueAtTime(v: number): void {
    this.value = v;
  }
  cancelScheduledValues(): void {}
}
class FakeNode {
  constructor(readonly context: FakeCtx) {}
  connect(): void {}
  disconnect(): void {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeSrc extends FakeNode {
  buffer: {duration: number} | null = null;
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  start(): void {
    this.started = true;
    this.context.sources.push(this);
  }
  stop(): void {
    this.stopped = true;
  }
  /** test: doğal bitiş */
  end(): void {
    this.onended?.();
  }
}
class FakeCtx {
  state = 'running';
  currentTime = 0;
  destination = {};
  sources: FakeSrc[] = [];
  decodes = 0;
  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createBufferSource(): FakeSrc {
    return new FakeSrc(this);
  }
  decodeAudioData(_d: ArrayBuffer, ok?: (b: {duration: number}) => void): Promise<{duration: number}> {
    this.decodes++;
    const b = {duration: 1.2};
    ok?.(b);
    return Promise.resolve(b);
  }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise(r => setTimeout(r, 0));
};

function manifestFetch(ids: string[]): typeof fetch {
  const manifest = Object.fromEntries(ids.map(id => [id, {url: `riza/${id}.mp3`, dur: 1.2}]));
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.endsWith('manifest.json')) return new Response(JSON.stringify(manifest), {status: 200});
    if (u.endsWith('.mp3')) return new Response(new Uint8Array([1, 2, 3, 4]), {status: 200});
    return new Response('yok', {status: 404});
  }) as unknown as typeof fetch;
}

describe('VoicePlayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('yalnızca yazı kipi: manifest yok, AudioContext yok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('yok', {status: 404})));
    const v = new VoicePlayer(() => null);
    await v.load('/assets/voice/manifest.json');
    expect(v.has('riza_botPisti_1')).toBe(false);
    expect(v.play('riza_botPisti_1')).toBe(false);
    expect(v.duration('riza_botPisti_1')).toBeNull();
    v.stop();
    v.setEnabled(false);
    v.setEnabled(true);
    expect(v.busy).toBe(false);
  });

  it("load('') hemen döner, ağ hatası fırlatmaz", async () => {
    const f = vi.fn(async () => {
      throw new Error('ağ yok');
    });
    vi.stubGlobal('fetch', f);
    const v = new VoicePlayer(() => null);
    await v.load('');
    expect(f).not.toHaveBeenCalled();
    await expect(v.load('x/manifest.json')).resolves.toBeUndefined();
    expect(v.has('a')).toBe(false);
  });

  it('manifest var ama bağlam yok → has true, play false; yollar manifeste göre çözülür', async () => {
    vi.stubGlobal('fetch', manifestFetch(['riza_botPisti_1']));
    const v = new VoicePlayer(() => null);
    await v.load('/assets/voice/manifest.json');
    expect(v.has('riza_botPisti_1')).toBe(true);
    expect(v.duration('riza_botPisti_1')).toBe(1.2);
    expect(v.play('riza_botPisti_1')).toBe(false);
  });

  it('metni değişmiş eski ses has(id, hash) ile ayıklanır; resolve ile özel URL', () => {
    const v = new VoicePlayer(() => null);
    v.setManifest({a: {url: 'riza/a.mp3', dur: 1, h: 'aaaa0000'}, b: {url: 'riza/b.mp3', dur: 1}}, '', rel => (rel === 'riza/a.mp3' ? 'data:audio/mpeg;base64,AA' : undefined));
    expect(v.has('a', 'aaaa0000')).toBe(true);
    expect(v.has('a', 'bbbb1111')).toBe(false);
    expect(v.has('b')).toBe(false); // resolve undefined → sessiz
  });

  it('çalar, onEnd bir kez gelir, üst üste binmez, öncelik keser, LRU sınırlı', async () => {
    const ids = Array.from({length: 16}, (_, i) => `riza_x_${i}`);
    vi.stubGlobal('fetch', manifestFetch(ids));
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    await v.load('/assets/voice/manifest.json');

    const ends: string[] = [];
    const ducks: number[] = [];
    expect(v.play(ids[0], {priority: 1, onEnd: () => ends.push('0'), duck: a => ducks.push(a)})).toBe(true);
    await flush();
    expect(v.stats().playing).toBe(ids[0]);
    expect(ducks).toEqual([0.5]);

    // düşük öncelik düşer, eşit öncelik uzun kalan süreyle düşer
    expect(v.play(ids[1], {priority: 0})).toBe(false);
    expect(v.play(ids[1], {priority: 1})).toBe(false);

    // yüksek öncelik keser
    expect(v.play(ids[2], {priority: 3, onEnd: () => ends.push('2')})).toBe(true);
    await flush();
    expect(ends).toEqual(['0']);
    expect(ducks).toEqual([0.5, 0]);
    expect(ctx.sources[0].stopped).toBe(true);
    expect(v.stats().playing).toBe(ids[2]);

    // eşit öncelik, çalan bitmek üzere → sıraya girer, bitince başlar
    ctx.currentTime = 0.5;
    expect(v.play(ids[3], {priority: 3, onEnd: () => ends.push('3')})).toBe(true);
    await flush();
    expect(v.stats().queued).toBe(ids[3]);
    ctx.sources[1].end();
    expect(ends).toEqual(['0', '2']);
    expect(v.stats().playing).toBe(ids[3]);
    ctx.sources[2].end();
    ctx.sources[2].end(); // ikinci onended yok sayılır
    expect(ends).toEqual(['0', '2', '3']);
    expect(v.busy).toBe(false);

    // önbellek: aynı replik ikinci kez çözülmez; çok replikte LRU sınırı
    const before = ctx.decodes;
    v.play(ids[3]);
    await flush();
    expect(ctx.decodes).toBe(before);
    v.stop();
    for (const id of ids) {
      v.play(id);
      await flush();
      v.stop();
    }
    expect(v.stats().decoded).toBeLessThanOrEqual(12);
    expect(v.stats().bytes).toBeLessThanOrEqual(32);

    // en üst öncelikte eşit öncelikli yeni replik, çalanın uzun kalanı varsa onu keser
    ctx.currentTime = 10;
    const top: string[] = [];
    expect(v.play(ids[4], {priority: 3, onEnd: () => top.push('4')})).toBe(true);
    await flush();
    expect(v.play(ids[5], {priority: 3, onEnd: () => top.push('5')})).toBe(true);
    await flush();
    expect(top).toEqual(['4']);
    expect(v.stats().playing).toBe(ids[5]);
    v.stop();
    expect(top).toEqual(['4', '5']);

    // kapatınca çalmaz, bellek bırakılır
    v.setEnabled(false);
    expect(v.stats().decoded).toBe(0);
    expect(v.play(ids[0])).toBe(false);
  });

  it('öncelik verilmezse manifestteki p kullanılır', async () => {
    const ctx = new FakeCtx();
    vi.stubGlobal('fetch', manifestFetch([]));
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    v.setManifest({chat: {url: 'riza/chat.mp3', dur: 1.2, p: 1}, pisti: {url: 'riza/pisti.mp3', dur: 1.2, p: 3}}, '/assets/voice/manifest.json');
    const ends: string[] = [];
    expect(v.play('chat', {onEnd: () => ends.push('chat')})).toBe(true);
    await flush();
    expect(v.play('pisti')).toBe(true);
    await flush();
    expect(ends).toEqual(['chat']);
    expect(v.stats().playing).toBe('pisti');
    expect(v.play('chat')).toBe(false); // düşük öncelik pişti'yi kesemez
    v.stop();
  });

  it('bağlam askıdaysa çalmaz', async () => {
    vi.stubGlobal('fetch', manifestFetch(['a']));
    const ctx = new FakeCtx();
    ctx.state = 'suspended';
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    await v.load('m/manifest.json');
    expect(v.play('a')).toBe(false);
  });
});
