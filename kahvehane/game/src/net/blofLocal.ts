// Blöf yerel maç kurulumu: LocalHost + botlar + (varsa) bu cihazdaki insanın istemcisi.
// Arayüz (game/blofMatch.ts) oyunu YALNIZ dönen `client` üzerinden oynatır; çevrimiçine geçince yalnız bu
// kurulum değişir (client ağ taşımasıyla kurulur), sunum kodu aynı kalır.
import {BlofBot, type BlofDifficulty} from '../ai/blofBot';
import {type BlofEngine, blofEngine} from '../core/blofEngine';
import type {BlofAction, BlofConfig, BlofEvent, BlofTell, BlofView} from '../core/blofTypes';
import {GameClient} from './client';
import type {Clock} from './clock';
import type {ServerMsg} from './protocol';
import {type HostSeat, LocalHost} from './host';

export type BlofHost = LocalHost<BlofEngine, BlofTell>;
export type BlofClient = GameClient<BlofAction, BlofEvent, BlofView, BlofTell>;
export type BlofServerMsg = ServerMsg<BlofEvent, BlofView, BlofTell>;

/** Koltuk tanımı: 'human' (bu cihaz) ya da bot zorluğu. */
export type BlofSeatSpec = 'human' | BlofDifficulty | {kind: 'human'; name?: string} | {kind: 'bot'; difficulty: BlofDifficulty; name?: string};

export interface BlofLocalOptions {
  cfg: BlofConfig;
  /** Koltuk sırasıyla (uzunluk = cfg.seats). Genelde [ 'human', 'zor', 'orta', … ]. */
  seats: BlofSeatSpec[];
  clock?: Clock;
  /** İnsan arayüzünün ack'ini en çok bekleme (ms). Varsayılan 6000. */
  paceMaxMs?: number;
  /** Bot rastgelelik tohumu (varsayılan cfg.seed'den türetilir). */
  botSeed?: number;
  /** Bot hamlesi reddedilirse vb. (hata ayıklama). */
  onError?: (msg: string) => void;
  /** Hızlı sohbet mesaj kimlikleri (QUICK_CHAT). Verilmezse sohbet kapalı. */
  chatIds?: readonly string[];
}

export interface BlofLocal {
  host: BlofHost;
  /** İlk insan koltuğunun istemcisi (insan yoksa null: botlar kendi kendine oynar). */
  client: BlofClient | null;
  /** Koltuk başına bot (insansa null). */
  bots: (BlofBot | null)[];
}

/** Yerel Blöf maçı kurar. client'ı kurduktan sonra host.start() çağır. */
export function createBlofLocal(o: BlofLocalOptions): BlofLocal {
  const seed = o.botSeed ?? (o.cfg.seed ^ 0x2f6b1d3) >>> 0;
  const bots: (BlofBot | null)[] = [];
  const seats: HostSeat<BlofEngine, BlofTell>[] = o.seats.map((sp, i) => {
    const spec = typeof sp === 'string' ? (sp === 'human' ? {kind: 'human' as const} : {kind: 'bot' as const, difficulty: sp}) : sp;
    if (spec.kind === 'human') {
      bots.push(null);
      return {kind: 'human', name: spec.name};
    }
    const brain = new BlofBot(i, spec.difficulty, (seed + i * 0x9e3779b1) >>> 0);
    bots.push(brain);
    return {kind: 'bot', brain, name: spec.name};
  });
  const host: BlofHost = new LocalHost(blofEngine, o.cfg, {seats, clock: o.clock, paceMaxMs: o.paceMaxMs, onError: o.onError, chat: o.chatIds ? {ids: o.chatIds} : undefined});
  const humanSeat = bots.findIndex((b) => b === null);
  const client: BlofClient | null = humanSeat >= 0 ? new GameClient(host.connect(humanSeat), o.clock) : null;
  return {host, client, bots};
}
