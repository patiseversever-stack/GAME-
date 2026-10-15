import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  CHAR_IDS,
  CHATTER_GAP_MS,
  DIALOGUE,
  DialogueDirector,
  EVENT_GAP_MS,
  HISTORY,
  MOMENTS,
  MOMENT_RULES,
  allLines,
  dialogue,
  linesFor,
  pickLine,
  resetDialogue,
  shouldSpeak,
  stripTags,
  ttsHash,
} from '../src/ai/dialogue';
import {VoicePlayer} from '../src/audio/voice';
import {mulberry32} from '../src/core/rng';

const MOODS = new Set(['kahkaha', 'kizgin', 'saskin', 'uzgun']);
/** Oyunun (app.ts / match.ts) yayınladığı anlar: Rıza'da her biri için en az 2 replik olmalı. */
const GAME_MOMENTS = [
  'start', 'botThinking', 'botPisti', 'botJackPisti', 'playerPisti', 'playerJackPisti', 'botBigCapture',
  'playerBigCapture', 'botJackCapture', 'playerJackCapture', 'playerDumpedValuable', 'lastRound', 'botLeading',
  'playerLeading', 'myTurnIdle', 'tableEmpty', 'playerWin', 'botWin', 'draw',
];

describe('replik verisi', () => {
  const all = allLines();

  it('kimlikler benzersiz ve dosya adına uygun', () => {
    const ids = all.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of all) {
      expect(l.id).toMatch(/^[a-z]+_[A-Za-z]+_\d+$/);
      expect(l.id.startsWith(`${l.char}_${l.moment}_`)).toBe(true);
    }
  });

  it('Rıza: 70-90 replik, her anda en az 2', () => {
    const riza = all.filter(l => l.char === 'riza');
    expect(riza.length).toBeGreaterThanOrEqual(70);
    expect(riza.length).toBeLessThanOrEqual(90);
    for (const m of new Set([...MOMENTS, ...GAME_MOMENTS])) expect(linesFor('riza', m).length, m).toBeGreaterThanOrEqual(2);
  });

  it('diğer karakterler 12-20 replik ve temel anlar dolu', () => {
    for (const c of CHAR_IDS.filter(c => c !== 'riza')) {
      const n = all.filter(l => l.char === c).length;
      expect(n, c).toBeGreaterThanOrEqual(12);
      expect(n, c).toBeLessThanOrEqual(20);
      for (const m of ['start', 'botPisti', 'playerPisti', 'botWin', 'playerWin', 'draw']) expect(linesFor(c, m).length, `${c}/${m}`).toBeGreaterThan(0);
    }
  });

  it('uzunluk sınırları, boş olmayan tts, geçerli duygu ve etiketler', () => {
    for (const l of all) {
      expect(l.text.trim().length, l.id).toBeGreaterThan(0);
      expect(l.text.length, l.id).toBeLessThanOrEqual(60);
      expect(l.text.split(/\s+/).length, l.id).toBeLessThanOrEqual(10);
      expect(l.text, l.id).not.toMatch(/[[\]]/);
      expect(l.tts.trim().length, l.id).toBeGreaterThan(0);
      expect(l.tts.length, l.id).toBeLessThanOrEqual(120);
      expect(stripTags(l.tts).length, l.id).toBeGreaterThan(0);
      expect(l.tts, l.id).toMatch(/^\[[a-z ]+\] /); // her replik bir ses etiketiyle başlar
      if (l.mood != null) expect(MOODS.has(l.mood), l.id).toBe(true);
      if (l.weight !== undefined) expect(l.weight, l.id).toBeGreaterThan(0);
    }
  });

  it('balon metni tts\'ten etiketler silinerek çıkar (açık metin verilenler hariç)', () => {
    expect(stripTags('[laughs] Pişti!  Çaylar [sighs] senden !')).toBe('Pişti! Çaylar senden!');
    const riza = DIALOGUE.riza.botPisti ?? [];
    for (const l of riza) expect(l.text).toBe(stripTags(l.tts));
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

  it('her anın bir kuralı var; pişti anları her zaman konuşur', () => {
    for (const m of MOMENTS) expect(MOMENT_RULES[m]).toBeTruthy();
    for (const m of ['botPisti', 'botJackPisti', 'playerPisti', 'playerJackPisti'] as const) expect(MOMENT_RULES[m].kind).toBe('always');
  });
});

describe('pickLine', () => {
  beforeEach(() => resetDialogue());

  it('bilinmeyen karakter / an → null', () => {
    expect(pickLine('yok', 'botPisti')).toBeNull();
    expect(pickLine('riza', 'boyleBirAnYok')).toBeNull();
  });

  it('karakterin son 6 repliğini tekrar etmez (karışık anlarda)', () => {
    const rnd = mulberry32(7);
    const moments = ['botPisti', 'playerPisti', 'botThinking', 'myTurnIdle', 'botBigCapture', 'botWin'];
    const seq: string[] = [];
    for (let i = 0; i < 400; i++) {
      const l = pickLine('riza', moments[Math.floor(rnd() * moments.length)], rnd);
      expect(l).not.toBeNull();
      seq.push(l!.id);
    }
    let checked = 0;
    for (let i = 0; i < seq.length; i++) {
      const pool = linesFor('riza', allLinesMoment(seq[i]));
      // son 6 replik dışında seçenek varsa, son 6'dan biri tekrar edilmez
      const window = seq.slice(Math.max(0, i - HISTORY), i);
      if (pool.some(l => !window.includes(l.id))) {
        expect(window).not.toContain(seq[i]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('tek anda: hiçbir replik art arda gelmez, havuz büyükse 6 içinde tekrar yok', () => {
    const rnd = mulberry32(42);
    for (const m of ['botPisti', 'playerJackPisti', 'draw', 'botLuckyCapture']) {
      resetDialogue();
      const pool = linesFor('riza', m);
      const seq = Array.from({length: 120}, () => pickLine('riza', m, rnd)!.id);
      // havuz > HISTORY: son 6'da tekrar yok; küçük havuz: en uzun süredir söylenmeyen üçte birden seçilir
      const win = pool.length > HISTORY ? HISTORY : pool.length - Math.max(1, Math.floor(pool.length / 3));
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1]);
        if (win > 0) expect(seq.slice(Math.max(0, i - win), i)).not.toContain(seq[i]);
      }
      // her replik en az bir kez duyulur
      expect(new Set(seq).size).toBe(pool.length);
    }
  });

  it('tek replikli an yine de döner', () => {
    expect(pickLine('defne', 'tableEmpty')?.id).toBe('defne_tableEmpty_1');
    expect(pickLine('defne', 'tableEmpty')?.id).toBe('defne_tableEmpty_1');
  });

  it('dağılım: ağırlıklar ve kullanım sayısı repliği tekeline almaz', () => {
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

function allLinesMoment(id: string): string {
  return allLines().find(l => l.id === id)!.moment;
}

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

  it('olay tepkisi ~%40-45 ve en az EVENT_GAP_MS arayla', () => {
    expect(d.shouldSpeak('botBigCapture', 10_000, yes)).toBe(true);
    expect(d.shouldSpeak('playerBigCapture', 10_000 + EVENT_GAP_MS - 1, yes)).toBe(false);
    expect(d.shouldSpeak('playerBigCapture', 10_000 + EVENT_GAP_MS, yes)).toBe(true);
    // olasılık
    const rnd = mulberry32(11);
    let hit = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const dd = new DialogueDirector();
      if (dd.shouldSpeak('botJackCapture', 0, rnd)) hit++;
    }
    expect(hit / N).toBeGreaterThan(0.33);
    expect(hit / N).toBeLessThan(0.47);
  });

  it('boş laf en fazla CHATTER_GAP_MS (~8 sn) arayla', () => {
    expect(d.shouldSpeak('myTurnIdle', 20_000, yes)).toBe(true);
    expect(d.shouldSpeak('tableEmpty', 20_000 + CHATTER_GAP_MS - 1, yes)).toBe(false);
    expect(d.shouldSpeak('tableEmpty', 20_000 + CHATTER_GAP_MS, yes)).toBe(true);
    // pişti boş laf sayacını da başlatır
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
      // aynı an 3 kez konuştu (yes), sonra 4.'nün şansı
      dd.shouldSpeak('botBigCapture', 0, yes);
      dd.shouldSpeak('botBigCapture', 3000, yes);
      dd.shouldSpeak('botBigCapture', 6000, yes);
      if (dd.shouldSpeak('botBigCapture', 9000, rnd)) later++;
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
    expect(d.react('defne', 'comeback', 0, yes)).toBeNull();
    expect(d.react('defne', 'botBigCapture', 10, yes)?.id).toBe('defne_botBigCapture_1');
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
