// Arayüz sözleşmesi (oyun akışı bu tiplerle konuşur). screens.ts bunları dışa aktarır.
import type {GameResult} from '../core/types';

export type Mood = 'kahkaha' | 'kizgin' | 'saskin' | 'uzgun';

export interface Settings {
  sfx: boolean;
  voice: boolean;
  music: boolean;
  haptics: boolean;
  quality: 'auto' | 'low' | 'mid' | 'high';
}

/** `xp` mevcut seviyedeki puan, `xpNext` bu seviyeyi bitirmek için gereken toplam. */
export interface Profile {
  name: string;
  level: number;
  xp: number;
  xpNext: number;
  coins: number;
}

export interface Opponent {
  id: string;
  name: string;
  title: string;
  /** Saydam PNG büst (rozette taşar) ya da kare yüz fotoğrafı */
  portrait: string;
  /** Aynı tuvalde gözleri kapalı büst (göz kırpma için) */
  blink?: string;
  moods: Record<Mood, string>;
  locked?: boolean;
  difficulty: 1 | 2 | 3;
  /** Rozet taşında görünen seviye (yoksa zorluktan türetilir) */
  level?: number;
}

export type LobbyAction =
  | {type: 'play'; opponentId: string; stake: number; mode: '1v1'}
  | {type: 'settings'}
  | {type: 'daily'}
  | {type: 'rules'};

export interface Sounds {
  tap(): void;
  whoosh(): void;
  coin(n?: number): void;
  reward(): void;
}

export interface ResultsData {
  result: GameResult;
  meSide: 0;
  opp: Opponent;
  coinsDelta: number;
  /** Ödül eklendikten sonraki bakiye */
  coinsAfter: number;
  xpGain: number;
  /** Maç SONRASI profil (xp kazanç eklenmiş, gerekirse seviye atlamış) */
  profile: Profile;
  /** İsteğe bağlı: rakibin son sözü (duygu kartının altında balon) */
  line?: string;
}

export interface HudPlayer {
  seat: number;
  name: string;
  /** Boşsa adın baş harfi gösterilir */
  portrait: string;
  blink?: string;
  isMe?: boolean;
  moods?: Partial<Record<Mood, string>>;
  /** Altıgen seviye taşı (yoksa gösterilmez) */
  level?: number;
  /** Portre yoksa gösterilecek baş harf(ler) (varsayılan: adın baş harfi) */
  initials?: string;
}

export type HudLayout = '1v1' | '4';

export interface GameHud {
  /** 1'e 1 kısayolu: setPlayers([ben, rakip], '1v1') + jeton */
  show(o: Opponent, p: Profile): void;
  hide(): void;
  /** Rozetleri kurar. 1v1: 0 = sol alt (ben), 1 = üst orta. 4: 0 alt orta (ben), 1 sağ, 2 üst, 3 sol. */
  setPlayers(list: HudPlayer[], layout: HudLayout): void;
  /** Koltuk sırasıyla */
  setStats(st: {cards: number; pisti: number}[]): void;
  setCoins(n: number, animate?: boolean): void;
  /** 0 ben, 1.. rakipler, -1 kimse */
  setTurn(seat: number): void;
  /** Her karede çağrılabilir; yalnız transform yazar */
  setDeck(count: number, x: number, y: number): void;
  showHint(text: string | null): void;
  /** Rakip konuşur. seat verilmezse ilk rakip (1'e 1'de üstteki). */
  say(text: string, mood?: Mood, ms?: number, seat?: number): void;
  pisti(jack: boolean, points: number): void;
  banner(text: string, sub?: string): void;
  popScore(x: number, y: number, text: string): void;
  onMenu: () => void;
}
