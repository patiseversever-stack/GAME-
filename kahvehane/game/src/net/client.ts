// Oyun istemcisi: arayüz yalnız bununla konuşur. Altında LocalTransport (yerel ev sahibi) ya da
// ileride ağ taşıması olur — arayüz kodu değişmez.
//
// Kullanım (sunum döngüsü):
//   for (;;) {
//     const m = await client.next();
//     if (m.t === 'events') { for (const e of m.events) await sun(e); client.ack(m.seq); }
//     else if (m.t === 'timer') halka.başlat(client.timeLeft());
//     …
//   }
//   düğme → client.act({t: 'play', seat: client.seat, cards});
import {type Clock, realClock} from './clock';
import type {ClientMsg, SeatInfo, ServerMsg, TimerInfo} from './protocol';
import type {Transport} from './transport';

export class GameClient<A, E, V, T = unknown> {
  /** Bu istemcinin koltuğu (welcome ile gelir). */
  seat = -1;
  seats: SeatInfo[] = [];
  /** Son alınan görünüm (sunumun önünde olabilir; sunarken mesajın kendi view'unu kullan). */
  view: V | null = null;
  /** Son alınan olay kümesinin numarası. */
  seq = 0;
  /** Açık zamanlayıcı (blöf penceresi vb.). */
  timer: TimerInfo | null = null;
  private timerAt = 0; // timer alındığı andaki yerel saat
  private timerServerNow = 0;
  private cseq = 0;
  private readonly queue: ServerMsg<E, V, T>[] = [];
  private readonly waiters: ((m: ServerMsg<E, V, T>) => void)[] = [];
  private readonly listeners: ((m: ServerMsg<E, V, T>) => void)[] = [];
  private readonly off: () => void;

  constructor(
    private readonly transport: Transport<ClientMsg<A>, ServerMsg<E, V, T>>,
    private readonly clock: Clock = realClock,
  ) {
    this.off = transport.onMessage((m) => this.receive(m));
  }

  private receive(m: ServerMsg<E, V, T>): void {
    switch (m.t) {
      case 'welcome':
        this.seat = m.seat;
        this.seats = m.seats;
        break;
      case 'seats':
        this.seats = m.seats;
        break;
      case 'events':
        this.view = m.view;
        this.seq = Math.max(this.seq, m.seq);
        break;
      case 'sync':
        this.view = m.view;
        this.seq = Math.max(this.seq, m.seq);
        this.setTimer(m.timer, null);
        break;
      case 'timer':
        this.setTimer(m.timer, m.serverTime);
        break;
      case 'timerCleared':
        if (this.timer?.key === m.key) this.timer = null;
        break;
      default:
        break;
    }
    for (const cb of this.listeners.slice()) cb(m);
    const w = this.waiters.shift();
    if (w) w(m);
    else this.queue.push(m);
  }

  private setTimer(t: TimerInfo | null, serverNow: number | null): void {
    this.timer = t;
    this.timerAt = this.clock.now();
    this.timerServerNow = serverNow ?? (t ? t.deadline - t.ms : 0);
  }

  /** Sıradaki ev sahibi mesajı (kuyrukta varsa hemen). */
  next(): Promise<ServerMsg<E, V, T>> {
    const m = this.queue.shift();
    if (m) return Promise.resolve(m);
    return new Promise((r) => this.waiters.push(r));
  }

  /** Kuyrukta bekleyen mesaj varsa alır (beklemez). */
  poll(): ServerMsg<E, V, T> | undefined {
    return this.queue.shift();
  }

  /** Her mesajı (kuyruktan bağımsız) dinler; kaldırma işlevi döner. */
  on(cb: (m: ServerMsg<E, V, T>) => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  /** Hamle gönderir; 'rejected'/'queued' mesajları bu numarayla eşleşir. */
  act(action: A): number {
    const cseq = ++this.cseq;
    this.transport.send({t: 'action', cseq, action});
    return cseq;
  }

  /** seq numaralı (varsayılan: son) olay kümesinin sunumu bitti. Ev sahibi pencere sayacını ve botları bundan sonra başlatır. */
  ack(seq: number = this.seq): void {
    this.transport.send({t: 'ack', seq});
  }

  resync(): void {
    this.transport.send({t: 'resync'});
  }

  ping(): void {
    this.transport.send({t: 'ping', ts: this.clock.now()});
  }

  /** Açık zamanlayıcının kalan süresi (ms; yoksa 0). */
  timeLeft(): number {
    const t = this.timer;
    if (!t) return 0;
    const elapsed = this.clock.now() - this.timerAt;
    return Math.max(0, t.deadline - this.timerServerNow - elapsed);
  }

  close(): void {
    this.off();
    this.transport.send({t: 'leave'});
    this.transport.close();
  }
}
