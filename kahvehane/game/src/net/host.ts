// LocalHost: motoru yetkili olarak (sunucu gibi) aynı süreçte koşturur.
// - Koltuk denetleyicileri: 'human' (bu cihazdaki arayüz, connect() ile), 'remote' (ileride ağdan, attach() ile), 'bot' (BotBrain).
// - Her hamleyi motorda doğrular, olayları koltuk başına süzer (redact), görünümleri yollar.
// - Zamanlayıcıları sayar (Blöf: 5 sn pencere → windowClosed), botları insan gibi bekleterek oynatır,
//   isteğe bağlı hamle süre aşımı uygular.
// - Tempo: 'paced' istemciler bir olay kümesini sunup 'ack' gönderene (ya da paceMaxMs dolana) dek
//   zamanlayıcı başlamaz ve botlar uyanmaz → pencere halkası animasyon bitince başlar.
// Çevrimiçine geçiş: bu sınıfın aynısı sunucuda koşar; istemci tarafında LocalTransport yerine ağ taşıması gelir.
import type {ActionOf, AnyEngine, BotBrain, CfgOf, EventOf, StateOf, ViewOf} from '../core/game';
import {type Clock, type TimerHandle, realClock} from './clock';
import {type ClientMsg, PROTOCOL_VERSION, type SeatInfo, type ServerMsg, type TimerInfo} from './protocol';
import {LocalTransport, type Transport} from './transport';
import {ChatGate, type ChatGateOptions} from './chat';

export type HostSeat<G extends AnyEngine, T = unknown> =
  /** Bu cihazdaki insan (arayüz connect(seat) ile bağlanır). paced: olay sunumunu ack ile bildirir (varsayılan true). */
  | {kind: 'human'; name?: string; paced?: boolean}
  /** Uzak oyuncu (ileride ağdan attach edilir). Varsayılan olarak tempo beklemesi kısa tutulur. */
  | {kind: 'remote'; name?: string; paced?: boolean}
  | {kind: 'bot'; brain: BotBrain<ActionOf<G>, EventOf<G>, ViewOf<G>, T>; name?: string};

export interface HostOptions<G extends AnyEngine, T = unknown> {
  seats: HostSeat<G, T>[];
  clock?: Clock;
  /** 'paced' istemcilerin ack'ini en çok bu kadar bekle (ms). 0 → hiç bekleme. Varsayılan 6000. */
  paceMaxMs?: number;
  /** İnsan/uzak koltuk hamle süresi (ms). 0/undefined → süre yok (yerel oyun). */
  turnTimeoutMs?: number;
  /** Bot karar vermezse (null) sırası gelmişken varsayılan hamle için bekleme (ms). Varsayılan 2500. */
  botFallbackMs?: number;
  /** Yetkili taraf gözlemcisi (test, kayıt, tekrar oynatma). Tam durumu görür: arayüze verilmez. */
  onStep?: (step: {state: StateOf<G>; events: EventOf<G>[]; action: ActionOf<G>; actor: number; seq: number}) => void;
  onError?: (msg: string) => void;
  /** Hızlı sohbet: geçerli mesaj kimlikleri (+ isteğe bağlı sınırlar). Verilmezse sohbet kapalı (mesajlar düşer). */
  chat?: ChatGateOptions;
}

type HostLink<G extends AnyEngine, T> = Transport<ServerMsg<EventOf<G>, ViewOf<G>, T>, ClientMsg<ActionOf<G>>>;
export type ClientTransport<G extends AnyEngine, T = unknown> = Transport<ClientMsg<ActionOf<G>>, ServerMsg<EventOf<G>, ViewOf<G>, T>>;

type Input<A, T> =
  | {k: 'action'; seat: number; action: A; cseq: number}
  | {k: 'bot'; seat: number; epoch: number; action: A; tell?: T}
  | {k: 'timer'; key: string}
  | {k: 'turnTimeout'; seat: number; epoch: number}
  | {k: 'ack'; seat: number; seq: number}
  | {k: 'ackTimeout'; seq: number}
  | {k: 'resync'; seat: number};

export class LocalHost<G extends AnyEngine, T = unknown> {
  readonly engine: G;
  readonly cfg: CfgOf<G>;
  private st: StateOf<G>;
  private readonly initialEvents: EventOf<G>[];
  private readonly seatSpecs: HostSeat<G, T>[];
  private readonly clock: Clock;
  private readonly paceMaxMs: number;
  private readonly turnTimeoutMs: number;
  private readonly botFallbackMs: number;
  private readonly links: (HostLink<G, T> | null)[];
  private readonly unsub: ((() => void) | null)[];
  private readonly everConnected: boolean[];
  private readonly botPending: ({epoch: number; h: TimerHandle} | null)[];
  private readonly turnPending: ({epoch: number; h: TimerHandle; key: string} | null)[];
  private readonly queued: ({action: ActionOf<G>; cseq: number} | null)[];
  private timer: {info: TimerInfo; h: TimerHandle} | null = null;
  private awaiting = new Set<number>();
  private ackH: TimerHandle | null = null;
  private inbox: Input<ActionOf<G>, T>[] = [];
  private busy = false;
  private seqNo = 0;
  private startedFlag = false;
  private stopped = false;
  private readonly log: ActionOf<G>[] = [];
  private readonly chat: ChatGate | null;
  private resolveDone!: (s: StateOf<G>) => void;
  /** Oyun bitince yetkili son durumla çözülür. */
  readonly done: Promise<StateOf<G>>;

  constructor(engine: G, cfg: CfgOf<G>, private readonly opts: HostOptions<G, T>) {
    this.engine = engine;
    this.cfg = cfg;
    const g = engine.create(cfg);
    this.st = g.state;
    this.initialEvents = g.events;
    const n = engine.seats(this.st);
    if (opts.seats.length !== n) throw new Error(`LocalHost: ${n} koltuk bekleniyordu, ${opts.seats.length} verildi`);
    this.seatSpecs = opts.seats;
    this.clock = opts.clock ?? realClock;
    this.paceMaxMs = opts.paceMaxMs ?? 6000;
    this.turnTimeoutMs = opts.turnTimeoutMs ?? 0;
    this.botFallbackMs = opts.botFallbackMs ?? 2500;
    this.links = new Array(n).fill(null);
    this.unsub = new Array(n).fill(null);
    this.everConnected = new Array<boolean>(n).fill(false);
    this.botPending = new Array(n).fill(null);
    this.turnPending = new Array(n).fill(null);
    this.queued = new Array(n).fill(null);
    this.done = new Promise((r) => (this.resolveDone = r));
    this.chat = opts.chat ? new ChatGate(opts.chat) : null;
    opts.seats.forEach((sp, i) => {
      if (sp.kind === 'bot' && sp.brain.seat !== i) throw new Error(`LocalHost: ${i}. koltuğun botu ${sp.brain.seat}. koltuğa ait`);
    });
  }

  // ─────────────── Dış arayüz ───────────────

  /** Yetkili durum (YALNIZ test/hata ayıklama; arayüz bunu kullanmamalı — gizli bilgi içerir). */
  get state(): StateOf<G> {
    return this.st;
  }
  get seq(): number {
    return this.seqNo;
  }
  get started(): boolean {
    return this.startedFlag;
  }
  get over(): boolean {
    return this.engine.isOver(this.st);
  }
  /** Uygulanan hamlelerin kaydı: create(cfg) + bu hamleler → aynı durum (tekrar oynatma, sunucu kaydı). */
  get actions(): readonly ActionOf<G>[] {
    return this.log;
  }
  /** Açık zamanlayıcı (pencere halkası vb.). */
  get timerInfo(): TimerInfo | null {
    return this.timer ? {...this.timer.info} : null;
  }

  /** Bu cihazdaki arayüz için bir koltuğa yerel bağlantı açar; istemci ucunu döndürür (GameClient'a verilir). */
  connect(seat: number, opts: {latencyMs?: number} = {}): ClientTransport<G, T> {
    const [client, server] = LocalTransport.pair<ClientMsg<ActionOf<G>>, ServerMsg<EventOf<G>, ViewOf<G>, T>>({
      latencyMs: opts.latencyMs,
      clock: this.clock,
    });
    this.attach(seat, server);
    return client;
  }

  /** Bir koltuğa hazır bir bağlantı ucu takar (ileride sunucuda: her WebSocket için). Eski bağlantı kapanır. */
  attach(seat: number, link: HostLink<G, T>): void {
    const sp = this.seatSpecs[seat];
    if (!sp || sp.kind === 'bot') throw new Error(`LocalHost: ${seat}. koltuğa bağlanılamaz`);
    this.detach(seat);
    this.links[seat] = link;
    const reconnect = this.everConnected[seat];
    this.everConnected[seat] = true;
    this.unsub[seat] = link.onMessage((m) => this.onClient(seat, m));
    link.send({t: 'welcome', v: PROTOCOL_VERSION, game: this.engine.id, seat, seats: this.seatInfo(), serverTime: this.clock.now()});
    if (this.startedFlag) this.sendSync(seat, reconnect ? 'reconnect' : 'join');
    this.broadcastSeats(seat);
  }

  /** Koltuğun bağlantısını bırakır (oyun sürer; yeniden attach/connect ile 'reconnect' senkronu alır). */
  detach(seat: number): void {
    const l = this.links[seat];
    if (!l) return;
    this.unsub[seat]?.();
    this.unsub[seat] = null;
    this.links[seat] = null;
    this.awaiting.delete(seat);
    if (!l.closed) l.close();
    this.broadcastSeats(seat);
  }

  /** Oyunu başlatır: ilk olaylar (dağıtım, ilk sıra) herkese gider. */
  start(): void {
    if (this.startedFlag) return;
    this.startedFlag = true;
    this.enqueueFn(() => this.broadcast(this.initialEvents, -1, undefined));
  }

  /** Tüm zamanlayıcıları durdurur (ekrandan çıkış). Bağlantılar açık kalır. */
  stop(): void {
    this.stopped = true;
    this.clearAllTimers();
  }

  // ─────────────── İç akış ───────────────

  private seatInfo(): SeatInfo[] {
    return this.seatSpecs.map((sp, seat) => ({
      seat,
      kind: sp.kind,
      name: sp.name,
      connected: sp.kind === 'bot' ? true : !!this.links[seat],
    }));
  }

  private broadcastSeats(except: number): void {
    const seats = this.seatInfo();
    this.links.forEach((l, i) => {
      if (l && i !== except) l.send({t: 'seats', seats});
    });
  }

  private onClient(seat: number, m: ClientMsg<ActionOf<G>>): void {
    switch (m.t) {
      case 'action':
        this.enqueue({k: 'action', seat, action: m.action, cseq: m.cseq});
        break;
      case 'ack':
        this.enqueue({k: 'ack', seat, seq: m.seq});
        break;
      case 'resync':
        this.enqueue({k: 'resync', seat});
        break;
      case 'ping':
        this.links[seat]?.send({t: 'pong', ts: m.ts, serverTime: this.clock.now()});
        break;
      case 'chat':
        this.onChat(seat, m.msg);
        break;
      case 'leave':
        this.detach(seat);
        break;
      case 'join':
        break; // yerelde koltuk connect() ile belli; çevrimiçinde oda sunucusu işler
    }
  }

  /** Hızlı sohbet: kimlik + hız sınırı denetlenir, geçerse gönderen dahil bütün bağlı koltuklara yayılır. Oyun durumunu değiştirmez. */
  private onChat(seat: number, msg: unknown): void {
    const v = this.chat ? this.chat.check(seat, msg, this.clock.now()) : 'invalid';
    if (v !== 'ok') {
      this.opts.onError?.(`chat ${seat}: ${v}`);
      return;
    }
    this.sendAll({t: 'chat', seat, msg: msg as string});
  }

  private pendingFns: (() => void)[] = [];
  private enqueueFn(fn: () => void): void {
    this.pendingFns.push(fn);
    this.pump();
  }
  private enqueue(i: Input<ActionOf<G>, T>): void {
    this.inbox.push(i);
    this.pump();
  }
  /** Yeniden girişsiz işleme: bir girdi işlenirken gelenler sıraya girer. */
  private pump(): void {
    if (this.busy) return;
    this.busy = true;
    try {
      for (;;) {
        const fn = this.pendingFns.shift();
        if (fn) {
          fn();
          continue;
        }
        const i = this.inbox.shift();
        if (!i) break;
        this.handle(i);
      }
    } finally {
      this.busy = false;
    }
  }

  private handle(i: Input<ActionOf<G>, T>): void {
    const e = this.engine;
    switch (i.k) {
      case 'action': {
        if (!this.startedFlag || this.stopped) return this.reject(i.seat, i.cseq, 'Oyun başlamadı', 'phase');
        if (e.actionSeat(i.action) !== i.seat) return this.reject(i.seat, i.cseq, 'Bu koltuk adına hamle yapamazsın', 'bad-seat');
        const r = e.apply(this.st, i.action);
        if (r.error !== undefined) {
          const d = e.defer?.(this.st, i.action) ?? null;
          if (d && !this.queued[i.seat]) {
            this.queued[i.seat] = {action: i.action, cseq: i.cseq};
            this.links[i.seat]?.send({t: 'queued', cseq: i.cseq});
            if (d.now) {
              const r2 = e.apply(this.st, d.now);
              if (r2.error === undefined) this.commit(r2.state, r2.events, d.now, i.seat, undefined);
            }
            return;
          }
          return this.reject(i.seat, i.cseq, r.error, r.code);
        }
        this.commit(r.state, r.events, i.action, i.seat, undefined);
        return;
      }
      case 'bot': {
        const p = this.botPending[i.seat];
        if (p && p.epoch === i.epoch) this.botPending[i.seat] = null;
        if (this.stopped || i.epoch !== e.epoch(this.st)) return;
        const r = e.apply(this.st, i.action);
        if (r.error === undefined) return this.commit(r.state, r.events, i.action, i.seat, i.tell);
        this.opts.onError?.(`bot ${i.seat}: ${r.error}`);
        const fb = e.timeoutAction(this.st, i.seat);
        if (fb) {
          const r2 = e.apply(this.st, fb);
          if (r2.error === undefined) return this.commit(r2.state, r2.events, fb, i.seat, undefined);
        }
        return;
      }
      case 'timer': {
        if (!this.timer || this.timer.info.key !== i.key || this.stopped) return;
        const want = e.timer(this.st);
        this.timer = null;
        this.sendAll({t: 'timerCleared', key: i.key});
        if (!want || want.key !== i.key) return;
        const r = e.apply(this.st, want.action);
        if (r.error === undefined) this.commit(r.state, r.events, want.action, -1, undefined);
        else this.opts.onError?.(`timer ${i.key}: ${r.error}`);
        return;
      }
      case 'turnTimeout': {
        const p = this.turnPending[i.seat];
        if (p && p.epoch === i.epoch) this.turnPending[i.seat] = null;
        if (this.stopped || i.epoch !== e.epoch(this.st)) return;
        const a = e.timeoutAction(this.st, i.seat);
        if (!a) return;
        const r = e.apply(this.st, a);
        if (r.error !== undefined) return;
        this.queued[i.seat] = null;
        this.sendAll({t: 'timeout', seat: i.seat});
        this.commit(r.state, r.events, a, i.seat, undefined);
        return;
      }
      case 'ack':
        if (i.seq >= this.seqNo && this.awaiting.delete(i.seat) && this.awaiting.size === 0) this.presented();
        return;
      case 'ackTimeout':
        if (i.seq === this.seqNo && this.awaiting.size > 0) {
          this.awaiting.clear();
          this.presented();
        }
        return;
      case 'resync':
        this.sendSync(i.seat, 'resync');
        return;
    }
  }

  private reject(seat: number, cseq: number, error: string, code?: string): void {
    this.links[seat]?.send({t: 'rejected', cseq, error, code});
  }

  private sendAll(m: ServerMsg<EventOf<G>, ViewOf<G>, T>): void {
    for (const l of this.links) l?.send(m);
  }

  private sendSync(seat: number, reason: 'join' | 'resync' | 'reconnect'): void {
    const l = this.links[seat];
    if (!l) return;
    l.send({t: 'sync', seq: this.seqNo, view: this.engine.viewFor(this.st, seat), timer: this.timerInfo, reason});
  }

  /** Yeni durumu kaydeder, olayları dağıtır, zamanlayıcıları ve botları günceller. */
  private commit(state: StateOf<G>, events: EventOf<G>[], action: ActionOf<G>, actor: number, tell: T | undefined): void {
    this.st = state;
    this.log.push(action);
    this.broadcast(events, actor, tell, () => this.opts.onStep?.({state, events, action, actor, seq: this.seqNo}));
  }

  private broadcast(events: EventOf<G>[], actor: number, tell: T | undefined, observed?: () => void): void {
    const e = this.engine;
    const seq = ++this.seqNo;
    const n = this.seatSpecs.length;
    this.awaiting.clear();
    if (this.ackH !== null) {
      this.clock.clear(this.ackH);
      this.ackH = null;
    }
    // Önce eskiyen zamanlayıcılar (istemci halkayı olayları sunmadan önce durdursun).
    // Dönem değiştiyse bekleyen bot kararları / süre aşımları geçersiz.
    const ep = e.epoch(this.st);
    for (let s = 0; s < n; s++) {
      const b = this.botPending[s];
      if (b && b.epoch !== ep) {
        this.clock.clear(b.h);
        this.botPending[s] = null;
      }
      const t = this.turnPending[s];
      if (t && t.epoch !== ep) {
        this.clock.clear(t.h);
        this.turnPending[s] = null;
        this.sendAll({t: 'timerCleared', key: t.key});
      }
    }
    // Motorun istediği zamanlayıcı değiştiyse eskisini kapat.
    const want = e.timer(this.st);
    if (this.timer && (!want || want.key !== this.timer.info.key)) {
      this.clock.clear(this.timer.h);
      this.sendAll({t: 'timerCleared', key: this.timer.info.key});
      this.timer = null;
    }
    for (let seat = 0; seat < n; seat++) {
      const sp = this.seatSpecs[seat];
      const evs: EventOf<G>[] = [];
      for (const ev of events) {
        const r = e.redact(ev, seat);
        if (r !== null) evs.push(r);
      }
      if (sp.kind === 'bot') {
        for (const ev of evs) sp.brain.observe(ev);
        continue;
      }
      const l = this.links[seat];
      if (!l || evs.length === 0) continue;
      l.send({t: 'events', seq, events: evs, view: e.viewFor(this.st, seat), actor, tell});
      if (sp.paced ?? sp.kind === 'human') this.awaiting.add(seat);
    }
    observed?.();
    if (e.isOver(this.st)) {
      this.clearAllTimers();
      for (let s = 0; s < n; s++) {
        const q = this.queued[s];
        if (q) this.reject(s, q.cseq, 'Oyun bitti', 'over');
        this.queued[s] = null;
      }
      this.resolveDone(this.st);
      return;
    }
    if (this.awaiting.size > 0 && this.paceMaxMs > 0) {
      this.ackH = this.clock.set(() => this.enqueue({k: 'ackTimeout', seq}), this.paceMaxMs);
    } else {
      this.awaiting.clear();
      this.presented();
    }
  }

  /** Olaylar sunuldu: sıradaki ertelenmiş hamle, zamanlayıcı, botlar, süre aşımları. */
  private presented(): void {
    if (this.ackH !== null) {
      this.clock.clear(this.ackH);
      this.ackH = null;
    }
    if (this.stopped || this.engine.isOver(this.st)) return;
    const e = this.engine;
    const n = this.seatSpecs.length;

    // 1) Ertelenmiş hamleler (Blöf: pencere kapanınca "at").
    for (let s = 0; s < n; s++) {
      const q = this.queued[s];
      if (!q) continue;
      const r = e.apply(this.st, q.action);
      if (r.error === undefined) {
        this.queued[s] = null;
        this.commit(r.state, r.events, q.action, s, undefined);
        return; // commit kendi presented() akışını yürütür
      }
      if (!(e.defer?.(this.st, q.action) ?? null)) {
        this.queued[s] = null;
        this.reject(s, q.cseq, r.error, r.code);
      }
    }

    // 2) Motorun zamanlayıcısı (ör. blöf penceresi) — sunum bitince başlar.
    const want = e.timer(this.st);
    if (want && (!this.timer || this.timer.info.key !== want.key)) {
      const now = this.clock.now();
      const info: TimerInfo = {key: want.key, kind: want.kind, ms: want.ms, deadline: now + want.ms};
      const key = want.key;
      this.timer = {info, h: this.clock.set(() => this.enqueue({k: 'timer', key}), want.ms)};
      this.sendAll({t: 'timer', timer: info, serverTime: now});
    }

    // 3) Botlar: sırası/hakkı olanlar karar verir, insan gibi bekleyip oynar.
    const ep = e.epoch(this.st);
    const acting = e.actors(this.st);
    for (const s of acting) {
      const sp = this.seatSpecs[s];
      if (sp.kind !== 'bot' || this.botPending[s]) continue;
      const d = sp.brain.decide(e.viewFor(this.st, s));
      if (d) {
        const {action, tell} = d;
        const h = this.clock.set(() => this.enqueue({k: 'bot', seat: s, epoch: ep, action, tell}), Math.max(0, d.delayMs));
        this.botPending[s] = {epoch: ep, h};
      } else {
        const fb = e.timeoutAction(this.st, s);
        if (fb && !want) {
          const h = this.clock.set(() => this.enqueue({k: 'bot', seat: s, epoch: ep, action: fb}), this.botFallbackMs);
          this.botPending[s] = {epoch: ep, h};
        }
      }
    }

    // 4) İnsan/uzak koltuk süre aşımı (çevrimiçi).
    if (this.turnTimeoutMs > 0) {
      for (const s of acting) {
        if (this.seatSpecs[s].kind === 'bot' || this.turnPending[s] || this.queued[s]) continue;
        if (!e.timeoutAction(this.st, s)) continue;
        const now = this.clock.now();
        const key = `t${ep}:${s}`;
        const h = this.clock.set(() => this.enqueue({k: 'turnTimeout', seat: s, epoch: ep}), this.turnTimeoutMs);
        this.turnPending[s] = {epoch: ep, h, key};
        this.sendAll({t: 'timer', timer: {key, kind: 'turn', ms: this.turnTimeoutMs, deadline: now + this.turnTimeoutMs}, serverTime: now});
      }
    }
  }

  private clearAllTimers(): void {
    if (this.timer) {
      this.clock.clear(this.timer.h);
      this.timer = null;
    }
    if (this.ackH !== null) {
      this.clock.clear(this.ackH);
      this.ackH = null;
    }
    for (let s = 0; s < this.botPending.length; s++) {
      const b = this.botPending[s];
      if (b) this.clock.clear(b.h);
      this.botPending[s] = null;
      const t = this.turnPending[s];
      if (t) this.clock.clear(t.h);
      this.turnPending[s] = null;
    }
  }
}
