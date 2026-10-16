// Hızlı sohbet (quick chat) ağ katmanı. Mesaj = QUICK_CHAT kimliği (src/ai/dialogue.ts); serbest metin YOK.
//  · İstemci → ev sahibi: {t: 'chat', msg}            (GameClient.chat)
//  · Ev sahibi → herkes:  {t: 'chat', seat, msg}      (gönderen dahil; arayüz kendi mesajını da bu yoldan söyletir)
// Ev sahibi kimliği doğrular ve koltuk başına hız sınırı uygular (ChatGate). Ev sahibi olmayan yerel Pişti maçı aynı kapıyı
// ChatRelay ile kullanır: çevrimiçine geçince yalnız taşıma değişir, sunum kodu aynı kalır.
import {type Clock, realClock} from './clock';

/** İki mesaj arası en az (ms). */
export const CHAT_COOLDOWN_MS = 4000;
/** Dakikada en çok mesaj. */
export const CHAT_PER_MINUTE = 6;
/** Ev sahibinin gecikme payı: istemci 4 sn beklese de ağ titremesi yüzünden reddedilmesin. */
export const CHAT_HOST_SLACK_MS = 500;
/** Kimlik en çok bu uzunlukta (çöp / saldırı). */
export const CHAT_MSG_MAX = 32;
const MINUTE = 60_000;

/** Bekleme + dakikalık kota (istemcide düğme durumu, ev sahibinde koltuk başına). */
export class ChatLimiter {
  private times: number[] = [];

  constructor(
    readonly cooldownMs = CHAT_COOLDOWN_MS,
    readonly perMinute = CHAT_PER_MINUTE,
  ) {}

  /** Bir sonraki mesaja kalan ms (0: şimdi gönderilebilir). */
  waitMs(now: number): number {
    this.prune(now);
    const last = this.times[this.times.length - 1];
    let w = last === undefined ? 0 : Math.max(0, last + this.cooldownMs - now);
    if (this.times.length >= this.perMinute) w = Math.max(w, this.times[0] + MINUTE - now);
    return w;
  }

  can(now: number): boolean {
    return this.waitMs(now) === 0;
  }

  /** Gönderilebiliyorsa kaydeder. */
  take(now: number): boolean {
    if (!this.can(now)) return false;
    this.times.push(now);
    return true;
  }

  reset(): void {
    this.times = [];
  }

  private prune(now: number): void {
    while (this.times.length && now - this.times[0] >= MINUTE) this.times.shift();
  }
}

export interface ChatGateOptions {
  /** Geçerli mesaj kimlikleri (QUICK_CHAT). */
  ids: readonly string[];
  cooldownMs?: number;
  perMinute?: number;
}

export type ChatVerdict = 'ok' | 'invalid' | 'rate';

/** Ev sahibi kapısı: kimlik geçerli mi, koltuk sınırı aşıldı mı. */
export class ChatGate {
  private readonly ids: ReadonlySet<string>;
  private readonly seats = new Map<number, ChatLimiter>();
  private readonly cooldownMs: number;
  private readonly perMinute: number;

  constructor(o: ChatGateOptions) {
    this.ids = new Set(o.ids);
    this.cooldownMs = o.cooldownMs ?? CHAT_COOLDOWN_MS - CHAT_HOST_SLACK_MS;
    this.perMinute = o.perMinute ?? CHAT_PER_MINUTE;
  }

  check(seat: number, msg: unknown, now: number): ChatVerdict {
    if (typeof msg !== 'string' || msg.length === 0 || msg.length > CHAT_MSG_MAX || !this.ids.has(msg)) return 'invalid';
    if (!Number.isInteger(seat) || seat < 0) return 'invalid';
    let l = this.seats.get(seat);
    if (!l) {
      l = new ChatLimiter(this.cooldownMs, this.perMinute);
      this.seats.set(seat, l);
    }
    return l.take(now) ? 'ok' : 'rate';
  }
}

export interface ChatMsg {
  t: 'chat';
  seat: number;
  msg: string;
}

/** Ev sahibi olmayan yerel maç (Pişti) için yayıncı: aynı kapı, aynı yayın biçimi. */
export class ChatRelay {
  private readonly gate: ChatGate;
  private readonly clock: Clock;
  private listeners: ((m: ChatMsg) => void)[] = [];
  private closed = false;

  constructor(o: ChatGateOptions & {clock?: Clock}) {
    this.gate = new ChatGate(o);
    this.clock = o.clock ?? realClock;
  }

  /** Koltuk mesaj gönderir; kapıdan geçerse herkese yayılır. */
  send(seat: number, msg: string): ChatVerdict {
    if (this.closed) return 'invalid';
    const v = this.gate.check(seat, msg, this.clock.now());
    if (v !== 'ok') return v;
    const m: ChatMsg = {t: 'chat', seat, msg};
    for (const cb of this.listeners.slice()) cb(m);
    return v;
  }

  on(cb: (m: ChatMsg) => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  close(): void {
    this.closed = true;
    this.listeners = [];
  }
}
