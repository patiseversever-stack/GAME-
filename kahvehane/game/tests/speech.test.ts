// Konuşma yöneticisi (src/audio/speech.ts): tek kanal, öncelik, atışma bölünmezliği, bayatlama, ses kapalı kipi, mola.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GAP_MS, NEAR_MS, SpeechDirector, TAIL_MS, type Bubble, type Utter, type VoicePort} from '../src/audio/speech';
import {VoicePlayer, type VoiceEnd, type VoicePlayOpts} from '../src/audio/voice';

/** Sahte oynatıcı: çalan tek, üst üste binme sayılır; ses bitişi elle (end) ya da süre dolunca (auto). */
class FakeVoice implements VoicePort {
  isEnabled = true;
  durs = new Map<string, number>();
  cur: {id: string; opts: VoicePlayOpts; timer: ReturnType<typeof setTimeout>} | null = null;
  log: string[] = [];
  overlaps = 0;
  plays = 0;
  get size(): number {
    return this.durs.size;
  }
  get busy(): boolean {
    return !!this.cur;
  }
  has(id: string): boolean {
    return this.durs.has(id);
  }
  duration(id: string): number | null {
    return this.durs.get(id) ?? null;
  }
  play(id: string, opts: VoicePlayOpts = {}): boolean {
    if (!this.isEnabled || !this.durs.has(id)) return false;
    if (this.cur) this.overlaps++;
    this.plays++;
    const d = this.durs.get(id)!;
    const timer = setTimeout(() => this.finish('ended'), d * 1000);
    this.cur = {id, opts, timer};
    this.log.push('play:' + id);
    opts.onStart?.(d);
    return true;
  }
  private finish(why: VoiceEnd): void {
    const c = this.cur;
    if (!c) return;
    clearTimeout(c.timer);
    this.cur = null;
    this.log.push((why === 'ended' ? 'end:' : 'cut:') + c.id);
    c.opts.onEnd?.(why);
  }
  stop(): void {
    this.finish('cut');
  }
  setEnabled(on: boolean): void {
    this.isEnabled = on;
    if (!on) this.stop();
  }
}

/** Balon kaydı: görünür balonlar + olay günlüğü. */
function bubbles() {
  const visible = new Set<string>();
  const log: string[] = [];
  const holds: [string, number][] = [];
  const make = (name: string): Bubble => ({
    show: (t, _m, ms) => {
      visible.add(name);
      log.push(`show:${name}:${Math.round(ms)}`);
    },
    hide: () => {
      visible.delete(name);
      log.push('hide:' + name);
    },
    hold: ms => void holds.push([name, ms]),
  });
  return {visible, log, holds, make};
}

const u = (id: string, b?: Bubble, o: Partial<Utter> = {}): Utter => ({id, text: id + ' sözü', char: 'riza', bubble: b, ...o});

let voice: FakeVoice;
let sp: SpeechDirector;
let B: ReturnType<typeof bubbles>;
const advance = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
  voice = new FakeVoice();
  for (const [id, d] of Object.entries({a: 2, b: 2, c: 2, d: 2, big: 3, big2: 3, chat: 1.5, reply: 1.2, short: 0.6, x1: 1, x2: 1, x3: 1})) voice.durs.set(id, d);
  sp = new SpeechDirector(voice, {now: () => Date.now()});
  B = bubbles();
});

afterEach(() => {
  sp.dispose();
  vi.useRealTimers();
});

describe('SpeechDirector: tek kanal ve öncelik', () => {
  it('asla iki ses üst üste çalmaz: yeni replik başlamadan çalan kesilir', () => {
    for (let i = 0; i < 40; i++) {
      const id = ['a', 'b', 'big', 'chat', 'short'][i % 5];
      sp.say(u(id, B.make(id + i)), {prio: 1 + (i % 3), queue: i % 4 === 0});
      advance(137 * (i % 7));
    }
    advance(20_000);
    expect(voice.overlaps).toBe(0);
    expect(voice.busy).toBe(false);
    expect(sp.stats().own).toBeNull();
    expect(B.visible.size).toBe(0); // hepsi kapandı
  });

  it('yüksek öncelik düşüğü keser (balonu da kapanır); düşük öncelik düşer; eşit öncelik uzun kalanı kesmez', () => {
    expect(sp.say(u('a', B.make('a')), {prio: 1})).toBe(true);
    expect(voice.cur?.id).toBe('a');
    advance(300);
    expect(sp.say(u('b', B.make('b')), {prio: 2})).toBe(true);
    expect(voice.log).toEqual(['play:a', 'cut:a', 'play:b']);
    expect(B.visible.has('a')).toBe(false);
    expect(B.visible.has('b')).toBe(true);
    // düşük öncelik düşer, balon hiç açılmaz
    expect(sp.canSay(1)).toBe(false);
    expect(sp.say(u('c', B.make('c')), {prio: 1})).toBe(false);
    expect(B.log.some(l => l.startsWith('show:c'))).toBe(false);
    // eşit öncelik, çalanın uzun kalanı var → düşer
    expect(sp.say(u('d', B.make('d')), {prio: 2})).toBe(false);
    expect(voice.cur?.id).toBe('b');
  });

  it('eşit öncelik çalan bitmek üzereyse sıraya girer, bitince başlar', () => {
    sp.say(u('a', B.make('a')), {prio: 2});
    advance(2000 - NEAR_MS + 100);
    expect(sp.say(u('b', B.make('b')), {prio: 2})).toBe(true);
    expect(sp.stats().pending).toBe('b');
    expect(B.visible.has('b')).toBe(false); // balon ses başlayınca
    advance(NEAR_MS);
    expect(voice.log).toEqual(['play:a', 'end:a', 'play:b']);
    expect(B.visible.has('b')).toBe(true);
  });

  it('öncelik 3: yeni büyük an, çalan büyük anı > 1 sn kalmışsa keser (pişti tepkisi kaybolmaz)', () => {
    sp.say(u('big', B.make('big')), {prio: 3});
    advance(500);
    expect(sp.say(u('big2', B.make('big2')), {prio: 3})).toBe(true);
    expect(voice.log).toEqual(['play:big', 'cut:big', 'play:big2']);
  });

  it('balon sesle eşli: en az ses süresi + kuyruk kadar görünür, doğal bitişte kuyruk sonra kapanır', () => {
    sp.say(u('big', B.make('big'), {minMs: 1000}), {prio: 3});
    expect(B.log[0]).toBe(`show:big:${3000 + TAIL_MS}`);
    advance(3000);
    expect(B.visible.has('big')).toBe(true);
    advance(TAIL_MS + 5);
    expect(B.visible.has('big')).toBe(false);
  });

  it('sesi olmayan replik (dosya henüz yok) yalnız balondur ve kanalı tahmini süre kadar tutar', () => {
    expect(sp.say(u('yok', B.make('yok'), {tts: 'Kırk yıllık usta, ne sandın?'}), {prio: 2})).toBe(true);
    expect(voice.plays).toBe(0);
    expect(B.visible.has('yok')).toBe(true);
    expect(sp.say(u('a', B.make('a')), {prio: 1})).toBe(false); // kanal dolu
    advance(5000);
    expect(sp.stats().own).toBeNull();
    expect(sp.say(u('a', B.make('a2')), {prio: 1})).toBe(true);
  });
});

describe('SpeechDirector: atışma (exchange) bölünmez', () => {
  it('A→B→C sırayla, satır arası boşlukla; arada olay (eşit öncelik) düşer', () => {
    const done = vi.fn();
    expect(sp.exchange([u('x1', B.make('A')), u('x2', B.make('B')), u('x3', B.make('C'))], {prio: 2, tag: 'banter', gapMs: GAP_MS, onDone: done})).toBe(true);
    expect(voice.cur?.id).toBe('x1');
    expect(sp.say(u('a', B.make('ev')), {prio: 2})).toBe(false);
    advance(1000);
    expect(voice.cur).toBeNull(); // boşluk
    advance(GAP_MS);
    expect(voice.cur?.id).toBe('x2');
    advance(1000 + GAP_MS);
    expect(voice.cur?.id).toBe('x3');
    advance(1000);
    expect(done).toHaveBeenCalledWith(true);
    expect(voice.log).toEqual(['play:x1', 'end:x1', 'play:x2', 'end:x2', 'play:x3', 'end:x3']);
    expect(voice.overlaps).toBe(0);
  });

  it('öncelik 3 gelince atışmanın tamamı iptal (kalan satır asla söylenmez)', () => {
    const done = vi.fn();
    sp.exchange([u('x1', B.make('A')), u('x2', B.make('B')), u('x3', B.make('C'))], {prio: 2, tag: 'banter', onDone: done});
    advance(1000 + GAP_MS + 300); // B söylüyor
    expect(voice.cur?.id).toBe('x2');
    sp.say(u('big', B.make('P')), {prio: 3});
    expect(done).toHaveBeenCalledWith(false);
    expect(B.visible.has('B')).toBe(false);
    advance(10_000);
    expect(voice.log).not.toContain('play:x3');
    expect(voice.log).toEqual(['play:x1', 'end:x1', 'play:x2', 'cut:x2', 'play:big', 'end:big']);
  });

  it('el bitti (cancel banter) boşluktayken de iptal; sıradaki atışma da büyük anla düşer', () => {
    sp.exchange([u('x1'), u('x2')], {prio: 2, tag: 'banter'});
    advance(1100); // boşlukta
    sp.cancel('banter');
    advance(5000);
    expect(voice.log).toEqual(['play:x1', 'end:x1']);
    // sıraya girmiş atışma: büyük an gelince düşer
    sp.say(u('big'), {prio: 3});
    const done = vi.fn();
    expect(sp.exchange([u('x1'), u('x2')], {prio: 2, tag: 'banter', queue: true, ttlMs: 9000, onDone: done})).toBe(true);
    expect(sp.stats().pending).toBe('x1>x2');
    sp.say(u('big2'), {prio: 3});
    expect(done).toHaveBeenCalledWith(false);
    expect(sp.stats().pending).toBeNull();
  });

  it('idle({tag}) atışma bitince çözülür (insanın sırası atışmadan sonra)', async () => {
    sp.exchange([u('x1'), u('x2')], {prio: 2, tag: 'banter'});
    let done = false;
    void sp.idle({tag: 'banter', maxMs: 10_000}).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1500);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(true);
  });
});

describe('SpeechDirector: sıra, bayatlama, mola, ayar', () => {
  it('sıradaki replik bayatlarsa (ttl) çalınmadan düşer', () => {
    const done = vi.fn();
    sp.say(u('big'), {prio: 3});
    expect(sp.say(u('chat', B.make('chat')), {prio: 2, queue: true, ttlMs: 1000, onDone: done})).toBe(true);
    advance(3100);
    expect(done).toHaveBeenCalledWith(false);
    expect(voice.log).not.toContain('play:chat');
    expect(B.log.some(l => l.startsWith('show:chat'))).toBe(false);
  });

  it('hızlı sohbet (queue) büyük anı kesmez, bitince söylenir; cevap söyleyişten sonra', () => {
    sp.say(u('big'), {prio: 3});
    advance(500);
    expect(sp.exchange([u('chat', B.make('me')), u('reply', B.make('bot'))], {prio: 2, tag: 'chat', queue: true, ttlMs: 8000, gapMs: [1200]})).toBe(true);
    expect(voice.cur?.id).toBe('big');
    advance(2500);
    expect(voice.cur?.id).toBe('chat');
    advance(1500 + 1200);
    expect(voice.cur?.id).toBe('reply');
    advance(2000);
    expect(voice.log).toEqual(['play:big', 'end:big', 'play:chat', 'end:chat', 'play:reply', 'end:reply']);
  });

  it('hold(true) (mola): konuşma anında susar, sıra temizlenir, balonlar kapanır; açık kaldıkça yeni replik yok', () => {
    sp.say(u('a', B.make('a')), {prio: 2});
    sp.say(u('b', B.make('b')), {prio: 2, queue: true});
    sp.hold(true);
    expect(voice.busy).toBe(false);
    expect(B.visible.size).toBe(0);
    expect(sp.stats().pending).toBeNull();
    expect(sp.say(u('c', B.make('c')), {prio: 3})).toBe(false);
    expect(sp.canSay(3)).toBe(false);
    sp.hold(false);
    expect(sp.say(u('c', B.make('c')), {prio: 3})).toBe(true);
    sp.stopAll();
    expect(voice.busy).toBe(false);
    expect(B.visible.size).toBe(0);
  });

  it('Konuşmalar kapalı: hiç ses yok, balonlar eskisi gibi hemen (üst üste olabilir); atışma tahmini sürelerle sıralı', () => {
    sp.setEnabled(false);
    expect(sp.live).toBe(false);
    expect(sp.say(u('a', B.make('a')), {prio: 1})).toBe(true);
    expect(sp.say(u('b', B.make('b')), {prio: 1})).toBe(true);
    expect(B.visible.has('a') && B.visible.has('b')).toBe(true);
    sp.exchange([u('x1', B.make('A'), {tts: 'Al bakalım Cem!'}), u('x2', B.make('B'), {tts: 'Amca, veri setimi bozdun ya!'})], {prio: 2, tag: 'banter'});
    expect(B.visible.has('A')).toBe(true);
    expect(B.visible.has('B')).toBe(false);
    advance(5000);
    expect(B.log.some(l => l.startsWith('show:B'))).toBe(true);
    expect(voice.plays).toBe(0);
    sp.setEnabled(true);
    expect(sp.say(u('a', B.make('a3')), {prio: 3})).toBe(true);
    expect(voice.plays).toBe(1);
  });

  it('ses geç başlarsa balon ses süresi kadar uzar', () => {
    voice.play = function (id: string, opts: VoicePlayOpts = {}): boolean {
      // çözme gecikmesi: 800 ms sonra başlar
      setTimeout(() => {
        this.cur = {id, opts, timer: setTimeout(() => {
          this.cur = null;
          opts.onEnd?.('ended');
        }, 2000)};
        opts.onStart?.(2);
      }, 800);
      return true;
    };
    sp.say(u('a', B.make('a')), {prio: 2});
    advance(800);
    expect(B.holds).toEqual([['a', 2000 + TAIL_MS]]);
    advance(2000 + TAIL_MS - 10);
    expect(B.visible.has('a')).toBe(true);
    advance(20);
    expect(B.visible.has('a')).toBe(false);
  });
});

// ── gerçek VoicePlayer ile: aynı anda hiçbir zaman iki kaynak çalmaz ──
class FakeParam {
  value = 1;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
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
  start(): void {
    this.context.live++;
    this.context.max = Math.max(this.context.max, this.context.live);
    this.context.sources.push(this);
  }
  stop(): void {
    this.end();
  }
  end(): void {
    if (!this.onended && !this.context.sources.includes(this)) return;
    this.context.sources = this.context.sources.filter(s => s !== this);
    this.context.live--;
    this.onended?.();
  }
}
class FakeCtx {
  state = 'running';
  currentTime = 0;
  destination = {};
  sources: FakeSrc[] = [];
  live = 0;
  max = 0;
  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createBufferSource(): FakeSrc {
    return new FakeSrc(this);
  }
  decodeAudioData(_d: ArrayBuffer, ok?: (b: {duration: number}) => void): Promise<{duration: number}> {
    const b = {duration: 1.2};
    ok?.(b);
    return Promise.resolve(b);
  }
}

describe('SpeechDirector + VoicePlayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('karışık öncelikler, atışma ve hızlı sohbet: en çok bir kaynak çalar; mola ve kapatma hepsini durdurur', async () => {
    vi.useRealTimers();
    const ids = Array.from({length: 8}, (_, i) => `riza_x_${i}`);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {status: 200})));
    const ctx = new FakeCtx();
    const v = new VoicePlayer(() => ctx as unknown as AudioContext);
    v.setManifest(Object.fromEntries(ids.map(id => [id, {url: `riza/${id}.mp3`, dur: 1.2}])), '/voice/manifest.json');
    const d = new SpeechDirector(v);
    const flush = async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
      await new Promise(r => setTimeout(r, 0));
    };
    d.say(u(ids[0]), {prio: 1});
    await flush();
    d.say(u(ids[1]), {prio: 2});
    await flush();
    d.exchange([u(ids[2]), u(ids[3])], {prio: 3});
    await flush();
    d.say(u(ids[4]), {prio: 2, queue: true});
    await flush();
    expect(ctx.max).toBe(1);
    expect(ctx.live).toBe(1);
    d.hold(true);
    expect(v.busy).toBe(false);
    d.hold(false);
    d.setEnabled(false);
    expect(d.say(u(ids[5]), {prio: 3})).toBe(true); // yalnız balon
    await flush();
    expect(ctx.live).toBe(0);
    expect(ctx.max).toBe(1);
    d.dispose();
  });
});
