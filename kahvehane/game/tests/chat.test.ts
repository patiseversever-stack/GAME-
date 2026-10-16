// Hızlı sohbet: istemci sınırı, ev sahibi kapısı (kimlik + hız sınırı), protokol yayını, denetleyici (söyleyiş + bot cevabı).
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {QUICK_CHAT, lineById} from '../src/ai/dialogue';
import {blofConfigFor} from '../src/core/blofTypes';
import {CHAT_COOLDOWN_MS, CHAT_HOST_SLACK_MS, CHAT_PER_MINUTE, ChatGate, ChatLimiter, ChatRelay, type ChatMsg} from '../src/net/chat';
import {createBlofLocal} from '../src/net/blofLocal';
import {VirtualClock} from '../src/net/clock';
import {SpeechDirector, type VoicePort} from '../src/audio/speech';
import {QUICK_IDS, QuickChat, quickSayIds, type ChatSession} from '../src/game/quickChat';
import type {GameHud, QuickChatSheetPort} from '../src/ui/types';

describe('ChatLimiter (istemci düğmesi)', () => {
  it('iki mesaj arası en az 4 sn, dakikada en çok 6', () => {
    const l = new ChatLimiter();
    expect(CHAT_COOLDOWN_MS).toBe(4000);
    expect(CHAT_PER_MINUTE).toBe(6);
    expect(l.take(0)).toBe(true);
    expect(l.take(1000)).toBe(false);
    expect(l.waitMs(1000)).toBe(3000);
    let t = 4000;
    for (let i = 0; i < 5; i++, t += 4000) expect(l.take(t)).toBe(true);
    // 6 mesaj gönderildi (0, 4, 8, 12, 16, 20 sn): 24. sn'de bekleme dolsa da dakikalık kota dolu
    expect(l.take(24_000)).toBe(false);
    expect(l.waitMs(24_000)).toBe(60_000 - 24_000);
    expect(l.take(60_000)).toBe(true);
  });
});

describe('ChatGate (ev sahibi)', () => {
  it('yalnız QUICK_CHAT kimlikleri; koltuk başına hız sınırı (gecikme payıyla); bozuk girdi reddedilir', () => {
    const g = new ChatGate({ids: QUICK_IDS});
    expect(g.check(0, 'gg', 0)).toBe('ok');
    expect(g.check(0, 'nice', 1000)).toBe('rate');
    expect(g.check(1, 'nice', 1000)).toBe('ok'); // başka koltuk ayrı
    expect(g.check(0, 'nice', CHAT_COOLDOWN_MS - CHAT_HOST_SLACK_MS)).toBe('ok'); // ağ titremesi payı
    for (const bad of ['', 'merhaba dünya', '<script>', 'x'.repeat(100), 42, null, undefined, {msg: 'gg'}]) expect(g.check(2, bad, 0)).toBe('invalid');
    expect(g.check(-1, 'gg', 0)).toBe('invalid');
    expect(g.check(1.5, 'gg', 0)).toBe('invalid');
  });

  it('ChatRelay: aynı kapı, gönderen dahil herkese yayar; kapalıyken susar', () => {
    let t = 0;
    const r = new ChatRelay({ids: QUICK_IDS, clock: {now: () => t, set: () => 0, clear: () => undefined}});
    const got: ChatMsg[] = [];
    const off = r.on(m => got.push(m));
    expect(r.send(0, 'hello')).toBe('ok');
    expect(r.send(0, 'gg')).toBe('rate');
    expect(r.send(0, 'yok')).toBe('invalid');
    t = 5000;
    expect(r.send(0, 'gg')).toBe('ok');
    expect(got).toEqual([{t: 'chat', seat: 0, msg: 'hello'}, {t: 'chat', seat: 0, msg: 'gg'}]);
    off();
    r.close();
    expect(r.send(1, 'gg')).toBe('invalid');
  });
});

describe('protokol: {t:"chat"} istemci → ev sahibi → herkes', () => {
  const make = (chatIds?: readonly string[]) => {
    const clock = new VirtualClock();
    const local = createBlofLocal({cfg: blofConfigFor('3', 7), seats: ['human', 'orta', 'orta'], clock, chatIds});
    const got: unknown[] = [];
    local.client!.on(m => {
      if (m.t === 'chat') got.push(m);
    });
    return {clock, local, got};
  };

  it('geçerli mesaj gönderen dahil yayılır; geçersiz kimlik ve hızlı ikinci mesaj düşer; oyun durumu değişmez', () => {
    const {clock, local, got} = make(QUICK_IDS);
    local.host.start();
    const seq = local.host.seq;
    local.client!.chat('gg');
    local.client!.chat('hacked');
    local.client!.chat('nice');
    expect(got).toEqual([{t: 'chat', seat: 0, msg: 'gg'}]);
    clock.advance(CHAT_COOLDOWN_MS);
    local.client!.chat('nice');
    expect(got).toEqual([{t: 'chat', seat: 0, msg: 'gg'}, {t: 'chat', seat: 0, msg: 'nice'}]);
    expect(local.host.seq).toBe(seq); // sohbet olay sırasını ilerletmez
    local.host.stop();
  });

  it('sohbet kimlikleri verilmezse ev sahibi sohbeti kabul etmez', () => {
    const {local, got} = make();
    local.host.start();
    local.client!.chat('gg');
    expect(got).toEqual([]);
    local.host.stop();
  });
});

// ── denetleyici ──
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

function fakeHud() {
  const said: {seat: number; text: string}[] = [];
  const cool: number[] = [];
  const hud = {
    say: (text: string, _m?: unknown, _ms?: number, seat?: number) => {
      said.push({seat: seat ?? -1, text});
      return said.length;
    },
    unsay: () => undefined,
    holdSay: () => undefined,
    setChat: vi.fn(),
    chatCooldown: (ms: number) => void cool.push(ms),
    onChat: () => undefined,
  } as unknown as GameHud;
  return {hud, said, cool};
}

function fakeSheet(): QuickChatSheetPort & {opened: {items: readonly {id: string; label: string}[]; onPick(id: string): void; onMute(on: boolean): void} | null} {
  return {
    isOpen: false,
    opened: null,
    open(o) {
      this.opened = o;
    },
    close() {},
    cool() {},
  };
}

describe('QuickChat denetleyicisi', () => {
  let rnd: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    rnd = vi.spyOn(Math, 'random').mockReturnValue(0.01); // cevap olasılığı her zaman tutar, ilk aday seçilir
  });
  afterEach(() => {
    rnd.mockRestore();
    vi.useRealTimers();
  });

  const seats = [
    {seat: 0, char: 'cem', team: 0, human: true},
    {seat: 1, char: 'riza', team: 1, human: false},
    {seat: 2, char: 'defne', team: 0, human: false},
    {seat: 3, char: 'dursun', team: 1, human: false},
  ];

  const setup = (o: {muted?: boolean; remote?: boolean} = {}) => {
    const {hud, said, cool} = fakeHud();
    const sheet = fakeSheet();
    const sp = new SpeechDirector(new FakeVoice(), {now: () => Date.now()});
    let muted = !!o.muted;
    const qc = new QuickChat(hud, () => sheet, sp, null, 0, {get: () => muted, set: on => (muted = on)});
    const relay = new ChatRelay({ids: QUICK_IDS, clock: {now: () => Date.now(), set: () => 0, clear: () => undefined}});
    relay.on(m => qc.receive(m.seat, m.msg));
    const s: ChatSession = {
      game: 'blof', me: 0,
      seats: o.remote ? seats.map(x => (x.seat === 1 || x.seat === 3 ? {...x, human: true, remote: true} : x)) : seats,
      send: msg => void relay.send(0, msg),
    };
    qc.attach(s);
    return {qc, said, cool, sheet, sp};
  };

  it('menü oyuncunun karakterine göre; Blöf mesajları yalnız Blöf\'te', () => {
    const {qc, sheet} = setup();
    qc.open();
    expect(sheet.opened!.items.length).toBe(QUICK_CHAT.length);
    expect(sheet.opened!.items.find(i => i.id === 'hello')!.label).toBe(QUICK_CHAT[0].labels.cem);
  });

  it('gönder → ev sahibi yolu → OYUNCUNUN sesiyle kendi koltuğunda söyleyiş, sonra kurala göre bot cevabı (gecikmeli)', () => {
    const {qc, said} = setup();
    expect(qc.send('gg')).toBe(true);
    expect(said[0].seat).toBe(0);
    expect(lineById(`qc_cem_gg_1`)!.text === said[0].text || lineById(`qc_cem_gg_2`)!.text === said[0].text).toBe(true);
    vi.advanceTimersByTime(8000);
    expect(said.length).toBe(2);
    // 'friendly' → ortak önce: eşlide ortak koltuk 2 (Defne)
    expect(said[1].seat).toBe(2);
  });

  it('bekleme: 4 sn içinde ikinci mesaj gitmez; düğmede bekleme göstergesi', () => {
    const {qc, said, cool} = setup();
    expect(qc.send('hello')).toBe(true);
    expect(qc.send('gg')).toBe(false);
    expect(cool.length).toBe(2);
    expect(cool[1]).toBeGreaterThan(0);
    vi.advanceTimersByTime(CHAT_COOLDOWN_MS);
    expect(qc.send('gg')).toBe(true);
    expect(said.filter(s => s.seat === 0).length).toBeGreaterThanOrEqual(1);
    expect(qc.send('bilinmeyen')).toBe(false);
  });

  it('rakipleri sustur: rakip botun iğnesi söylenmez; uzak insan koltukları otomatik cevap vermez', () => {
    const a = setup({muted: true});
    a.qc.send('lucky'); // taunt → rakip cevaplar (mateFirst değil)
    vi.advanceTimersByTime(8000);
    expect(a.said.every(s => s.seat === 0 || s.seat === 2)).toBe(true);
    a.qc.detach();
    const b = setup({remote: true});
    b.qc.send('lucky');
    vi.advanceTimersByTime(8000);
    // rakipler uzak insan → cevap yok (ortak bot taunt'a yalnız ortak satırıyla cevap verebilir)
    expect(b.said.some(s => s.seat === 1 || s.seat === 3)).toBe(false);
  });

  it('detach: düğme kapanır, gelen yayın yok sayılır', () => {
    const {qc, said} = setup();
    qc.detach();
    qc.receive(0, 'gg');
    expect(said.length).toBe(0);
  });

  it('oyuncunun hızlı sohbet söyleyişleri önden sabitlenecek küme (karakter başına, ilk söyleyişler önce)', () => {
    const ids = quickSayIds('riza');
    expect(ids.length).toBe(QUICK_CHAT.length * 2);
    expect(ids.slice(0, QUICK_CHAT.length).every(id => id.endsWith('_1'))).toBe(true);
    for (const id of ids) expect(lineById(id)?.char).toBe('riza');
  });
});
