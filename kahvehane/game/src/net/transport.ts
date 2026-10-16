// Taşıma katmanı: mesajı karşıya iletir, gelenleri dinletir. Yerelde LocalTransport (aynı süreç),
// çevrimiçinde WebSocket/Supabase Realtime taşıması aynı arayüzü uygular → oyun kodu değişmez.
import type {Clock} from './clock';

export interface Transport<Out, In> {
  send(msg: Out): void;
  /** Dinleyici ekler; çağrılınca kaldıran işlev döner. */
  onMessage(cb: (msg: In) => void): () => void;
  close(): void;
  readonly closed: boolean;
}

export interface LocalTransportOptions {
  /** Yapay gecikme (ms) — çevrimiçi davranışı yerelde denemek için. 0 → anında (senkron) iletim. */
  latencyMs?: number;
  clock?: Clock;
}

/** Aynı süreçteki iki uç. Mesajlar yapılandırılmış kopyayla (JSON) geçer: paylaşılan nesne sızıntısı olmaz. */
export class LocalTransport<Out, In> implements Transport<Out, In> {
  private listeners: ((msg: In) => void)[] = [];
  private peer: LocalTransport<In, Out> | null = null;
  private _closed = false;

  private constructor(private readonly opts: LocalTransportOptions) {}

  /** Birbirine bağlı iki uç üretir: [a, b] — a'nın gönderdiği b'ye, b'ninki a'ya gider. */
  static pair<A, B>(opts: LocalTransportOptions = {}): [LocalTransport<A, B>, LocalTransport<B, A>] {
    const a = new LocalTransport<A, B>(opts);
    const b = new LocalTransport<B, A>(opts);
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  get closed(): boolean {
    return this._closed;
  }

  send(msg: Out): void {
    const peer = this.peer;
    if (this._closed || !peer || peer._closed) return;
    const copy = JSON.parse(JSON.stringify(msg)) as Out; // ağ gibi: değer kopyası
    const lat = this.opts.latencyMs ?? 0;
    if (lat > 0 && this.opts.clock) this.opts.clock.set(() => peer.deliver(copy), lat);
    else peer.deliver(copy);
  }

  private deliver(msg: In): void {
    if (this._closed) return;
    for (const cb of this.listeners.slice()) cb(msg);
  }

  onMessage(cb: (msg: In) => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  close(): void {
    if (this._closed) return;
    this._closed = true;
    this.listeners = [];
    const p = this.peer;
    this.peer = null;
    if (p && !p._closed) p.close();
  }
}
