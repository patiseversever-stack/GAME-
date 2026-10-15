// Oyun akışının ortak tipleri (ekranlar, maç ve uygulama akışı bunlarla konuşur).
import type {BotPersonality} from '../ai/bot';
import type {CharDef} from './roster';

/** 1'e 1 · 4 kişi herkes tek · 4 kişi eşli (karşıdaki ortak) */
export type Mode = '1v1' | '4' | 'esli';

export const MODE_INFO: Record<Mode, {seats: 2 | 4; teams: number[]; name: string; desc: string}> = {
  '1v1': {seats: 2, teams: [0, 1], name: "1'e 1", desc: 'Sen ve rakibin, kafa kafaya.'},
  '4': {seats: 4, teams: [0, 1, 2, 3], name: '4 Kişi', desc: 'Dört oyuncu, herkes kendi için.'},
  esli: {seats: 4, teams: [0, 1, 0, 1], name: 'Eşli', desc: 'Karşındaki ortağın; puanlar birlikte.'},
};

/**
 * Masadaki bir koltuk. Koltuk 0 her zaman insan oyuncudur (ekranın altı);
 * saat yönünün tersine: 1 sağ, 2 karşı (üst), 3 sol. 1'e 1'de koltuk 1 karşıdadır (üst).
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
  mode: Mode;
  players: SeatPlayer[];
  /** Dağıtan koltuk */
  dealer: number;
  seed?: number;
  /** Kuşanılmış pişti efekti (catalog fx id) */
  fx: string;
}
