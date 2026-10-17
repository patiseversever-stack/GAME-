// İstemci ↔ ev sahibi (yerelde LocalHost, çevrimiçinde sunucu) mesajları. Oyundan bağımsız:
// A = hamle, E = olay, V = görünüm, T = bot ipucu tipi. JSON'a aynen yazılabilir.
import type {GameId} from '../core/game';

export const PROTOCOL_VERSION = 1;

/** Koltuğu kim tutuyor. */
export type SeatKind = 'human' | 'bot' | 'remote' | 'empty';

export interface SeatInfo {
  seat: number;
  kind: SeatKind;
  name?: string;
  /** İnsan/uzak koltuk bağlı mı (bot hep true). */
  connected: boolean;
}

/** Ev sahibinin kurduğu zamanlayıcı (blöf penceresi halkası, hamle süresi sayacı). */
export interface TimerInfo {
  key: string;
  kind: string;
  ms: number;
  /** Bitiş anı, ev sahibi saatinde. Kalan = deadline − serverTime (gecikme payıyla). */
  deadline: number;
}

/** İstemci → ev sahibi */
export type ClientMsg<A> =
  /** Odaya katıl (çevrimiçi). Yerelde connect() bunu kendisi yapar. token: yeniden bağlanma anahtarı. */
  | {t: 'join'; v: number; game: GameId; room?: string; name?: string; token?: string; seat?: number}
  /** Hamle. cseq: istemcinin artan numarası (ret mesajı bununla eşleşir). */
  | {t: 'action'; cseq: number; action: A}
  /** seq numaralı olay kümesini sundum (animasyon bitti). Ev sahibi tempoyu buna göre ayarlar. */
  | {t: 'ack'; seq: number}
  /** Tam görünüm iste (kopukluk/şüphe sonrası). */
  | {t: 'resync'}
  | {t: 'ping'; ts: number}
  /**
   * Hızlı sohbet: msg = QUICK_CHAT kimliği (serbest metin yok); line = gönderenin seçtiği söyleyiş (qc_…), to = hedef koltuk.
   * Ev sahibi doğrular (söyleyiş o mesaja + gönderenin karakterine ait; kişiye özel söz yalnız bot hedefe) + hız sınırı
   * (net/chat.ts). line/to verilmeyen eski istemci de kabul edilir.
   */
  | {t: 'chat'; msg: string; line?: string; to?: number}
  | {t: 'leave'};

/** Ev sahibi → istemci */
export type ServerMsg<E, V, T = unknown> =
  | {t: 'welcome'; v: number; game: GameId; seat: number; seats: SeatInfo[]; serverTime: number}
  | {t: 'seats'; seats: SeatInfo[]}
  /**
   * Bir hamlenin sonucu: bu koltuğa süzülmüş olaylar + sonraki görünüm. seq tüm masada ortak ve artan.
   * actor: hamleyi yapan koltuk (−1: ev sahibi, ör. süre doldu). tell: bot hamlesiyse yüz ipucu.
   */
  | {t: 'events'; seq: number; events: E[]; view: V; actor: number; tell?: T}
  /** Tam görünüm (katılınca, yeniden bağlanınca, resync isteğinde). */
  | {t: 'sync'; seq: number; view: V; timer: TimerInfo | null; reason: 'join' | 'resync' | 'reconnect'}
  /** Zamanlayıcı başladı (UI halka/sayaç başlatır). */
  | {t: 'timer'; timer: TimerInfo; serverTime: number}
  /** Zamanlayıcı iptal/bitti. */
  | {t: 'timerCleared'; key: string}
  /** Hamle reddedildi (ya da sıraya alınan hamle düştü). */
  | {t: 'rejected'; cseq: number; error: string; code?: string}
  /** Hamle sıraya alındı: şimdi geçerli değil, olunca uygulanacak (Blöf: pencere kapanınca "at"). */
  | {t: 'queued'; cseq: number}
  /** Süre aşımı: ev sahibi bu koltuk yerine varsayılan hamleyi yaptı. */
  | {t: 'timeout'; seat: number}
  | {t: 'pong'; ts: number; serverTime: number}
  /** Hızlı sohbet yayını (gönderen dahil herkese): koltuk + mesaj + söyleyiş + hedef + ev sahibinin planladığı bot cevabı. */
  | {t: 'chat'; seat: number; msg: string; line?: string; to?: number; rp?: {seat: number; line: string; ms: number}}
  | {t: 'closed'; reason: string};

export type ServerMsgType = ServerMsg<unknown, unknown>['t'];
