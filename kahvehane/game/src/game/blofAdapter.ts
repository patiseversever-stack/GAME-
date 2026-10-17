// Blöf motoru bağlayıcısı: uygulama (app.ts) BlofMatch'i buradan yükler. BlofMatch dosyası (src/game/blofMatch.ts) yoksa
// Blöf ana ekranda hiç görünmez (BLOF.available() = false); dosya gelince kendiliğinden açılır — bayrak çevirmek gerekmez.
// Beklenen biçim (Pişti'nin Match'iyle aynı): new BlofMatch({table, hud, sfx, voice, auto}).play(setup) → Promise<sonuç | null>, abort().
// Sonuç ne biçimde dönerse dönsün normalizeBlofOutcome() onu BlofOutcome'a (game/types.ts) çevirir; böylece sunucudan gelen
// sonuç ve istemci sonucu aynı yoldan geçer.
import type {Table2D} from '../table2d/table';
import type {Sfx} from '../audio/sfx';
import type {VoicePlayer} from '../audio/voice';
import type {SpeechDirector} from '../audio/speech';
import type {GameHud} from '../ui/types';
import type {QuickChat} from './quickChat';
import {MODE_INFO, type BlofOutcome, type BlofSeatResult, type MatchSetup} from './types';

export interface BlofDeps {
  table: Table2D;
  hud: GameHud;
  sfx: Sfx;
  voice: VoicePlayer;
  /** Uygulamanın tek konuşma yöneticisi */
  speech?: SpeechDirector;
  /** Hızlı sohbet denetleyicisi */
  chat?: QuickChat;
  /** Test: insan koltuğu (0) kendiliğinden oynar */
  auto?: boolean;
  autoThink?: number;
}

/** BlofMatch'in dışarıya gördürdüğü yüzey. */
export interface BlofRunner {
  play(setup: MatchSetup): Promise<unknown>;
  abort(): void;
}
export type BlofFactory = (d: BlofDeps) => BlofRunner;

// Vite: dosya yoksa boş sözlük (derleme yeşil kalır), varsa tembel yüklenir (Pişti açılışını şişirmez).
const modules = import.meta.glob('./blofMatch.ts') as Record<string, () => Promise<{BlofMatch?: new (d: BlofDeps) => BlofRunner}>>;

let injected: BlofFactory | null = null;
let preview = false;
let killed = false;
try {
  killed = new URLSearchParams(location.search).get('blof') === '0';
} catch {
  /* sunucu/test ortamı */
}

export const BLOF = {
  /** Blöf sekmesi gösterilsin mi: motor var (ya da test için enjekte edildi) ve ?blof=0 ile kapatılmadı. */
  available(): boolean {
    return !killed && (injected !== null || Object.keys(modules).length > 0 || preview);
  },
  /** Motor gerçekten başlatılabilir mi (önizleme galerisi motor olmadan sekmeyi gösterebilir ama oynatamaz). */
  playable(): boolean {
    return injected !== null || Object.keys(modules).length > 0;
  },
  /** Test/dev: motor yerine geçen fabrika (dev/blofStub.ts). */
  inject(f: BlofFactory | null): void {
    injected = f;
  },
  /** Yalnız ekran galerisi: motor olmadan da sekmeyi göster (oynatılamaz). */
  previewOnly(on = true): void {
    preview = on;
  },
};

/** Motoru yükle (VS ekranı sürerken arka planda çağrılır). */
export async function loadBlof(): Promise<BlofFactory> {
  if (injected) return injected;
  const load = Object.values(modules)[0];
  if (!load) throw new Error('Blöf motoru yok');
  const mod = await load();
  const Ctor = mod.BlofMatch;
  if (!Ctor) throw new Error('BlofMatch dışa aktarılmamış');
  return d => new Ctor(d);
}

// ---------------------------------------------------------------- sonuç biçimi
type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (o: Rec, keys: string[]): number => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  }
  return 0;
};

/**
 * BlofMatch'in döndürdüğü sonucu BlofOutcome'a çevirir. Kabul edilen biçimler:
 *  - {outcome?, result: BlofResult}  (Pişti'nin MatchOutcome'una benzer; core/blofTypes.ts BlofResult: winner, handCounts, stats[])
 *  - BlofResult'un kendisi
 *  - {winner, seats: [{left, bluffs, caught, timesCaught, wrongChallenges}]}
 * Eksik sayılar 0; sonuç bildirilmediyse kazananın takımından çıkarılır (eşlide ortağın kazanması benim de kazanmamdır).
 */
export function normalizeBlofOutcome(raw: unknown, setup: MatchSetup): BlofOutcome {
  const o: Rec = isRec(raw) ? raw : {};
  const res: Rec = isRec(o.result) ? o.result : o;
  const n = MODE_INFO[setup.mode].seats;
  const teams = MODE_INFO[setup.mode].teams;
  let winner = typeof res.winner === 'number' ? res.winner : typeof o.winner === 'number' ? o.winner : -1;
  for (const k of ['winnerSeat', 'finisher']) if (winner < 0 && typeof res[k] === 'number') winner = res[k] as number;
  if (winner < 0 && Array.isArray(res.winners) && typeof res.winners[0] === 'number') winner = res.winners[0] as number;
  let outcome: 'win' | 'lose' | null = o.outcome === 'win' || o.outcome === 'lose' ? o.outcome : null;
  if (winner < 0) winner = outcome === 'lose' ? 1 : 0;
  if (winner >= n) winner = 0;
  if (!outcome) outcome = teams[winner] === teams[0] ? 'win' : 'lose';
  const list = Array.isArray(res.stats) ? res.stats : Array.isArray(res.seats) ? res.seats : [];
  const hands = Array.isArray(res.handCounts) ? res.handCounts : [];
  const seats: BlofSeatResult[] = Array.from({length: n}, (_, seat) => {
    const r: Rec = isRec(list[seat]) ? (list[seat] as Rec) : {};
    const left = typeof hands[seat] === 'number' ? Math.max(0, Math.round(hands[seat] as number)) : num(r, ['left', 'cardsLeft']);
    return {seat, left, bluffs: num(r, ['bluffs']), caught: num(r, ['caught']), timesCaught: num(r, ['timesCaught']), wrongChallenges: num(r, ['wrongChallenges'])};
  });
  const out: BlofOutcome = {setup, outcome, winner, seats};
  if (o.lastBluff === true) out.lastBluff = true;
  return out;
}
