// Hızlı sohbet (quick chat) ağ katmanı. Mesaj = QUICK_CHAT kimliği (src/ai/dialogue.ts); serbest metin YOK.
//  · İstemci → ev sahibi: {t: 'chat', msg, line?, to?}            (GameClient.chat)
//  · Ev sahibi → herkes:  {t: 'chat', seat, msg, line?, to?, rp?}  (gönderen dahil; arayüz kendi mesajını da bu yoldan söyletir)
// line = GÖNDERENİN seçtiği söyleyiş kimliği (qc_…), to = hedef koltuk (yoksa masa), rp = ev sahibinin planladığı bot cevabı
// ({seat, line: qr_…, ms}). Böylece her cihaz AYNI sesi çalar. Ev sahibi kimliği doğrular, koltuk başına hız sınırı uygular
// (ChatGate) ve politika verilmişse (ChatPolicy, src/ai/quickTalk.ts → chatPolicy) söyleyişin o mesaja + gönderenin karakterine
// ait olduğunu, kişiye özel sözün yalnız BOT hedefe gittiğini denetler; geçersizse mesaj düşer. Eski istemci (line yok) yine
// kabul edilir: politika herkes için tek bir nötr söyleyiş seçer (fill). Ev sahibi olmayan yerel Pişti maçı aynı kapıyı
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
/** Söyleyiş / cevap kimliği en çok bu uzunlukta. */
export const CHAT_LINE_MAX = 64;
/** Hedef koltuk üst sınırı (masada en çok 4; pay bırakıldı). */
const SEAT_MAX = 15;
const LINE_ID = /^[a-z0-9_]+$/;
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

/** Ev sahibinin planladığı bot cevabı (herkes aynı cevabı duyar). ms = söyleyiş bittikten sonraki bekleme. */
export interface ChatReply {
  seat: number;
  line: string;
  ms: number;
}

/**
 * Oyun bilgisiyle denetim (net katmanı replik tablolarını bilmez; oyun verir: src/ai/quickTalk.ts → chatPolicy).
 * valid: söyleyiş o mesaja ve gönderenin karakterine ait mi, hedef geçerli mi (kişiye özel söz yalnız BOT hedefe).
 * fill: söyleyişsiz (eski istemci) mesaj için herkesin çalacağı nötr söyleyiş. reply: bot cevabı (yoksa null).
 */
export interface ChatPolicy {
  valid(seat: number, msg: string, line: string, to: number): boolean;
  fill?(seat: number, msg: string): string | null;
  reply?(seat: number, msg: string, line: string | undefined, to: number): ChatReply | null;
}

export interface ChatGateOptions {
  /** Geçerli mesaj kimlikleri (QUICK_CHAT). */
  ids: readonly string[];
  cooldownMs?: number;
  perMinute?: number;
  /** Söyleyiş + hedef denetimi ve bot cevabı (verilmezse söyleyiş/hedef alanları yayına girmez: eski davranış). */
  policy?: ChatPolicy;
}

export type ChatVerdict = 'ok' | 'invalid' | 'rate';

/** İstemcinin gönderdiği sohbet alanları (ağdan gelir: hepsi güvenilmez). */
export interface ChatIn {
  msg: unknown;
  line?: unknown;
  to?: unknown;
}

/** Ev sahibi kapısı: kimlik geçerli mi, söyleyiş/hedef politikaya uyuyor mu, koltuk sınırı aşıldı mı. */
export class ChatGate {
  private readonly ids: ReadonlySet<string>;
  private readonly seats = new Map<number, ChatLimiter>();
  private readonly cooldownMs: number;
  private readonly perMinute: number;
  private readonly policy: ChatPolicy | null;

  constructor(o: ChatGateOptions) {
    this.ids = new Set(o.ids);
    this.cooldownMs = o.cooldownMs ?? CHAT_COOLDOWN_MS - CHAT_HOST_SLACK_MS;
    this.perMinute = o.perMinute ?? CHAT_PER_MINUTE;
    this.policy = o.policy ?? null;
  }

  check(seat: number, msg: unknown, now: number): ChatVerdict {
    if (!this.validMsg(seat, msg)) return 'invalid';
    return this.take(seat, now) ? 'ok' : 'rate';
  }

  /**
   * Tam kapı: doğrular, hız sınırını uygular (yalnız geçerli mesaj kotadan düşer) ve herkese yayılacak mesajı kurar.
   * Söyleyiş verilmişse politikaya uymalı (uymazsa 'invalid', yayın yok); verilmemişse politika nötr birini seçer (fill).
   */
  admit(seat: number, m: ChatIn, now: number): {v: ChatVerdict; out?: ChatMsg} {
    const msg = m.msg;
    if (!this.validMsg(seat, msg)) return {v: 'invalid'};
    let to = -1;
    if (m.to !== undefined && m.to !== null) {
      if (typeof m.to !== 'number' || !Number.isInteger(m.to) || m.to < -1 || m.to > SEAT_MAX || m.to === seat) return {v: 'invalid'};
      to = m.to;
    }
    let line: string | undefined;
    const p = this.policy;
    if (m.line !== undefined && m.line !== null) {
      if (typeof m.line !== 'string' || !m.line.length || m.line.length > CHAT_LINE_MAX || !LINE_ID.test(m.line)) return {v: 'invalid'};
      if (p && !p.valid(seat, msg, m.line, to)) return {v: 'invalid'};
      if (p) line = m.line; // politika yoksa doğrulanamayan söyleyiş yayına girmez (alıcı kendisi seçer)
    } else if (p?.fill) line = p.fill(seat, msg) ?? undefined;
    if (!this.take(seat, now)) return {v: 'rate'};
    const out: ChatMsg = {t: 'chat', seat, msg};
    if (line) out.line = line;
    if (p && to >= 0) out.to = to;
    const rp = p?.reply?.(seat, msg, line, to) ?? null;
    if (rp) out.rp = rp;
    return {v: 'ok', out};
  }

  private validMsg(seat: number, msg: unknown): msg is string {
    if (typeof msg !== 'string' || msg.length === 0 || msg.length > CHAT_MSG_MAX || !this.ids.has(msg)) return false;
    return Number.isInteger(seat) && seat >= 0;
  }

  private take(seat: number, now: number): boolean {
    let l = this.seats.get(seat);
    if (!l) {
      l = new ChatLimiter(this.cooldownMs, this.perMinute);
      this.seats.set(seat, l);
    }
    return l.take(now);
  }
}

export interface ChatMsg {
  t: 'chat';
  seat: number;
  msg: string;
  /** Gönderenin seçtiği (ev sahibince doğrulanmış) söyleyiş. */
  line?: string;
  /** Hedef koltuk (yoksa masa). */
  to?: number;
  /** Ev sahibinin planladığı bot cevabı. */
  rp?: ChatReply;
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

  /** Koltuk mesaj gönderir (söyleyiş + hedef isteğe bağlı); kapıdan geçerse herkese yayılır. */
  send(seat: number, msg: string, line?: string, to?: number): ChatVerdict {
    if (this.closed) return 'invalid';
    const {v, out} = this.gate.admit(seat, {msg, line, to}, this.clock.now());
    if (v !== 'ok' || !out) return v;
    for (const cb of this.listeners.slice()) cb(out);
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
