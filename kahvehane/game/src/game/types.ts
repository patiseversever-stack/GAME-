// Oyun akışının ortak tipleri (ekranlar, maç ve uygulama akışı bunlarla konuşur).
// İki oyun var: Pişti ve Blöf. Mod, masadaki kişi sayısıdır; oyun (game) hangi kural motorunun çalışacağını söyler.
import type {BotPersonality} from '../ai/bot';
import type {CharDef} from './roster';

/** Oyun: 'pisti' (Match) · 'blof' (BlofMatch). */
export type Game = 'pisti' | 'blof';
export const GAMES: readonly Game[] = ['pisti', 'blof'];

/**
 * 1'e 1 · 3 kişi (yalnız Blöf) · 4 kişi herkes tek · 4 kişi eşli (karşıdaki ortak).
 * Pişti 3 kişi oynamaz (PistiMode); Blöf dördünü de oynar.
 */
export type Mode = '1v1' | '3' | '4' | 'esli';
export type PistiMode = Exclude<Mode, '3'>;

export interface ModeInfo {
  seats: 2 | 3 | 4;
  teams: number[];
  name: string;
  desc: string;
}

export const MODE_INFO: Record<Mode, ModeInfo> = {
  '1v1': {seats: 2, teams: [0, 1], name: "1'e 1", desc: 'Sen ve rakibin, kafa kafaya.'},
  '3': {seats: 3, teams: [0, 1, 2], name: '3 Kişi', desc: 'Üç oyuncu, herkes kendi için.'},
  '4': {seats: 4, teams: [0, 1, 2, 3], name: '4 Kişi', desc: 'Dört oyuncu, herkes kendi için.'},
  esli: {seats: 4, teams: [0, 1, 0, 1], name: 'Eşli', desc: 'Karşındaki ortağın; puanlar birlikte.'},
};

/** Pişti motorunun (createGame) kabul ettiği mod bilgisi: 2 ya da 4 koltuk. */
export type PistiModeInfo = ModeInfo & {seats: 2 | 4};
export function pistiInfo(m: Mode): PistiModeInfo {
  if (m === '3') throw new Error('Pişti üç kişi oynanmaz');
  return MODE_INFO[m] as PistiModeInfo;
}

/** Oyun başına ana ekranda gösterilen modlar (sırayla). */
export const GAME_INFO: Record<Game, {name: string; modes: readonly Mode[]; tag: string}> = {
  pisti: {name: 'Pişti', modes: ['1v1', '4', 'esli'], tag: 'Kartı yakala, yığını topla.'},
  blof: {name: 'Blöf', modes: ['1v1', '3', '4', 'esli'], tag: 'Kapalı at, "doğru" de, yakalanma.'},
};

/** Oyunun o modu oynayıp oynamadığı. */
export const gameHasMode = (g: Game, m: Mode): boolean => GAME_INFO[g].modes.includes(m);

/** Başlık/etiket: "Blöf · 3 Kişi", "Pişti · 1'e 1". */
export const matchTitle = (g: Game, m: Mode): string => `${GAME_INFO[g].name} · ${MODE_INFO[m].name}`;

/** Blöf rakip zorluğu (ana ekranda seçilir). Kimlikler ai/blofBot.ts'teki BlofDifficulty ile aynı. */
export type Difficulty = 'kolay' | 'orta' | 'zor';
export const DIFFICULTIES: readonly Difficulty[] = ['kolay', 'orta', 'zor'];
export const DIFFICULTY_INFO: Record<Difficulty, {name: string; stars: 1 | 2 | 3; desc: string}> = {
  kolay: {name: 'Kolay', stars: 1, desc: 'Çabuk kanar, sık blöf yapar.'},
  orta: {name: 'Orta', stars: 2, desc: 'Dengeli; ara sıra blöf çağırır.'},
  zor: {name: 'Zor', stars: 3, desc: 'Sabırlı, hesaplı ve zor kandırılır.'},
};

/**
 * Masadaki bir koltuk. Koltuk 0 her zaman insan oyuncudur (ekranın altı);
 * saat yönünün tersine: 1 sağ, 2 karşı (üst), 3 sol. 1'e 1'de koltuk 1 karşıdadır (üst).
 * 3 kişide (Blöf): 1 sağ-üst, 2 sol-üst.
 */
export interface SeatPlayer {
  seat: number;
  char: CharDef;
  /** Görünen ad (insan için profil adı, botlar için karakter adı) */
  name: string;
  human: boolean;
  /** Takım indeksi (MODE_INFO.teams[seat]) */
  team: number;
  level: number;
  /** Bot ayarları (insan için yok sayılır) */
  personality: BotPersonality;
  think: [number, number];
}

export interface MatchSetup {
  /** Hangi oyun (kural motoru) */
  game: Game;
  mode: Mode;
  players: SeatPlayer[];
  /** Dağıtan koltuk */
  dealer: number;
  seed?: number;
  /** Kuşanılmış pişti efekti (catalog fx id) */
  fx: string;
  /** Blöf: botların zorluğu (Pişti'de yok sayılır) */
  difficulty?: Difficulty;
  /** Blöf: oyuncunun ilk Blöf eli (profilde Blöf oynanmamış). Rıza Amca karşıdadır ve oynayarak öğretir (kart seç → değer söyle → blöf de → pas). Blöf'te hep dolu (true/false). */
  tutorial?: boolean;
}

/**
 * Blöf elinde bir koltuğun sayıları. Adlar core/blofTypes.ts BlofSeatStats ile aynı (caught = YAKALADIĞI blöf, timesCaught = kendi blöfünün yakalanması).
 */
export interface BlofSeatResult {
  seat: number;
  /** Eli bittiğinde elinde kalan kart (BlofResult.handCounts) */
  left: number;
  /** Yaptığı blöf: içinde yanlış kart olan atış sayısı */
  bluffs: number;
  /** Yakaladığı blöf: "Blöf!" dedi ve yalan çıktı */
  caught: number;
  /** Kendi blöfünün yakalanma sayısı */
  timesCaught: number;
  /** Boşa blöf: "Blöf!" dedi ama doğru çıktı */
  wrongChallenges: number;
}

/** BlofMatch.play'in döndürdüğü el sonucu (src/game/blofAdapter.ts, ne dönerse bu biçime çevirir). */
export interface BlofOutcome {
  setup: MatchSetup;
  /** İnsan oyuncunun (eşlide takımının) sonucu */
  outcome: 'win' | 'lose';
  /** Son kartını atıp eli bitiren koltuk */
  winner: number;
  /** Koltuk sırasıyla sayılar */
  seats: BlofSeatResult[];
}
