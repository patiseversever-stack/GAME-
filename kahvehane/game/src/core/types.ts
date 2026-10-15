// Ortak tipler: kural motoru, yapay zekâ ve sunum katmanı bu sözleşmeye göre konuşur.
// Online'a geçişte sunucu aynı olayları (PistiEvent) yayınlayacak.

export type CardId = number; // 0..51  →  takım = floor(id / 13), değer = id % 13 + 1
export const SUITS = ['S', 'H', 'D', 'C'] as const; // maça, kupa, karo, sinek
export type Suit = (typeof SUITS)[number];
export const suitOf = (c: CardId): Suit => SUITS[Math.floor(c / 13)];
export const rankOf = (c: CardId): number => (c % 13) + 1; // 1 = As, 11 = Vale, 12 = Kız, 13 = Papaz
export const isJack = (c: CardId): boolean => rankOf(c) === 11;
export const cardId = (suit: Suit, rank: number): CardId => SUITS.indexOf(suit) * 13 + (rank - 1);

export interface PistiConfig {
  seats: 2 | 4;
  /** Her koltuğun takımı. Tekli 2 kişi: [0,1]; tekli 4 kişi: [0,1,2,3]; eşli: [0,1,0,1] */
  teams: number[];
  /** Dağıtan koltuk. Oyuna (dealer + 1) % seats başlar. Koltuklar saat yönünün tersine dizilir: 0 = alt (insan), 1 = sağ, 2 = üst, 3 = sol (2 kişide 1 = üst). */
  dealer: number;
  seed: number;
}

export type PistiEvent =
  | {t: 'tableDeal'; cards: CardId[]; faceUp: boolean[]}
  | {t: 'handDeal'; round: number; deals: {seat: number; card: CardId}[]}
  | {t: 'play'; seat: number; card: CardId}
  | {t: 'capture'; seat: number; cards: CardId[]; pisti: 0 | 10 | 20}
  | {t: 'finalSweep'; seat: number; cards: CardId[]}
  | {t: 'gameOver'; result: GameResult};

export interface SideScore {
  side: number;
  seats: number[];
  cards: number;
  majority: number; // 3 ya da 0
  aces: number;
  jacks: number;
  club2: number; // 2 ya da 0
  diamond10: number; // 3 ya da 0
  pisti: number;
  total: number;
}
export interface GameResult {
  sides: SideScore[];
  winners: number[]; // berabere ise birden fazla taraf
}

export interface PistiState {
  cfg: PistiConfig;
  deck: CardId[]; // kalan deste, sondan çekilir
  pile: CardId[]; // ortadaki yığın, son eleman üstte
  pileHiddenCount: number; // yığının altındaki kapalı kart sayısı (başta 3)
  hands: CardId[][];
  captured: CardId[][]; // koltuk başına toplanan kartlar
  pistiPoints: number[]; // koltuk başına pişti puanı
  turn: number;
  lastCapturer: number; // -1: henüz kimse almadı
  round: number; // kaçıncı dağıtım (1'den başlar)
  over: boolean;
}

/** Bir koltuğun görebildiği bilgi (bot ve ileride online istemci bunu alır). */
export interface PlayerView {
  seat: number;
  seats: number;
  teams: number[];
  hand: CardId[];
  handCounts: number[];
  pileTop: CardId | null;
  pileCount: number;
  /** Yığında açık görünen kartlar (alttan üste). Kapalı başlangıç kartları dahil değil. */
  pileVisible: CardId[];
  deckCount: number;
  capturedCounts: number[];
  pistiPoints: number[];
  turn: number;
  round: number;
  lastCapturer: number;
}
