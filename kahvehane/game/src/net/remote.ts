// Çevrimiçi taşıma İSKELETİ (henüz kullanılmıyor, sınanmadı). Plan: docs/ONLINE.md.
// İstemci tarafı: GameClient(new WebSocketTransport(url)) — LocalHost yerine sunucudaki ev sahibine bağlanır.
// Sunucu tarafı: her WebSocket bağlantısı için host.attach(seat, socketLink) (aynı Transport arayüzü).
import type {Transport} from './transport';

/** Tarayıcı WebSocket'i üzerinden JSON mesaj taşıması. Yeniden bağlanma/geri çekilme ve kimlik henüz yok. */
export class WebSocketTransport<Out, In> implements Transport<Out, In> {
  private ws: WebSocket;
  private listeners: ((m: In) => void)[] = [];
  private outbox: string[] = [];
  private _closed = false;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      for (const s of this.outbox) this.ws.send(s);
      this.outbox = [];
    };
    this.ws.onmessage = (ev) => {
      let m: In;
      try {
        m = JSON.parse(String(ev.data)) as In;
      } catch {
        return;
      }
      for (const cb of this.listeners.slice()) cb(m);
    };
    this.ws.onclose = () => {
      this._closed = true;
    };
  }

  get closed(): boolean {
    return this._closed;
  }

  send(msg: Out): void {
    if (this._closed) return;
    const s = JSON.stringify(msg);
    if (this.ws.readyState === 1) this.ws.send(s);
    else this.outbox.push(s);
  }

  onMessage(cb: (m: In) => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  close(): void {
    this._closed = true;
    this.listeners = [];
    this.ws.close();
  }
}
