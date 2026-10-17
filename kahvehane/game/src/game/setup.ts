// Maç kurulumu ve ekonomi (arayüzden bağımsız, saf): koltuklar (3 kişi dahil), bahis ödemesi, XP.
// Sunucu ileride aynı fonksiyonları çalıştırır.
import {charById, type CharId} from './roster';
import {MODE_INFO, type Difficulty, type Game, type HandLayout, type MatchSetup, type Mode, type SeatPlayer} from './types';

/** Botların rozet seviyesi (karakter başına sabit; masada tutarlı görünsün). */
export const BOT_LEVEL: Record<CharId, number> = {riza: 28, cem: 12, dursun: 9, defne: 31};

/** Kazananın aldığı (kişi başı): 1'e 1 ve eşlide 2×, 3 kişide 3×, 4 kişide 4× (pot). İki oyunda da aynı. */
export const payout = (mode: Mode, stake: number): number => (mode === '4' ? stake * 4 : mode === '3' ? stake * 3 : stake * 2);

/** buildSetup'ın profilden okuduğu alanlar (Profile bunu karşılar; testte düz nesne yeter). */
export interface SetupProfile {
  data: {char: CharId | null; name: string; level: number};
  playedBlof: boolean;
}

/** buildSetup'ın isteğe bağlı ayarları. */
export interface SetupOpts {
  game?: Game;
  /** Blöf: botların zorluğu */
  difficulty?: Difficulty;
  /** Blöf: ilk el, Rıza Amca öğretir (verilmezse oyuncu Blöf'ü hiç oynamadıysa otomatik) */
  tutorial?: boolean;
  /** Blöf: el düzeni (profil ayarı `settings.blofHand`; yoksa BlofMatch varsayılanı) */
  handLayout?: HandLayout;
}

/** Koltukları kur: 0 = insan (profil adı/seviyesi, kendi karakteri), botlar roster'dan (kişilik, düşünme süresi). 3 kişide iki bot. */
export function buildSetup(profile: SetupProfile, mode: Mode, opponents: CharId[], dealer: number, fx: string, seed?: number, opts: SetupOpts = {}): MatchSetup {
  const game = opts.game ?? 'pisti';
  const info = MODE_INFO[mode];
  const meChar = charById(profile.data.char ?? 'dursun');
  const players: SeatPlayer[] = [{
    seat: 0, char: meChar, name: profile.data.name, human: true, team: info.teams[0], level: profile.data.level,
    personality: meChar.personality, think: meChar.think,
  }];
  // kişi sayısı kadar bot (eksikse kadrodan tamamla, insanın karakteri hariç)
  const pool = opponents.filter(id => id !== meChar.id);
  const tutorial = game === 'blof' && (opts.tutorial ?? !profile.playedBlof);
  // ilk Blöf elinde Rıza Amca karşıda oturur (insanın karakteri Rıza ise kadrodan sıradaki gelir)
  if (tutorial && meChar.id !== 'riza') pool.splice(0, pool.length, 'riza', ...pool.filter(id => id !== 'riza'));
  for (let s = 1; s < info.seats; s++) {
    const id = pool[s - 1] ?? (['riza', 'cem', 'dursun', 'defne'] as CharId[]).find(x => x !== meChar.id && !pool.includes(x))!;
    if (!pool.includes(id)) pool.push(id);
    const c = charById(id);
    players.push({seat: s, char: c, name: c.name, human: false, team: info.teams[s], level: BOT_LEVEL[c.id] ?? 10, personality: c.personality, think: c.think});
  }
  const setup: MatchSetup = {game, mode, players, dealer, seed, fx};
  if (game === 'blof') {
    setup.difficulty = opts.difficulty ?? 'orta';
    // açıkça true/false: BlofMatch kendi hafızasına değil bu karara uyar (ilk Blöf eli = öğretici)
    setup.tutorial = tutorial;
    if (opts.handLayout) setup.handLayout = opts.handLayout;
  }
  return setup;
}

/**
 * Maç sonu ödemesi (bahis maçın başında BİR KEZ düşülür; bu, sonra alınan): 1'e 1/eşli kazanana 2×, 3-4 kişide pot kazanan(lar)a;
 * beraberlikte iade (1'e 1/eşli) ya da pot bölünür (3-4 kişi). mult: oyun uzunluğu çarpanı (series.ts LENGTH_INFO; tek el 1) —
 * uzun maçın potu büyür (kazanana kasadan ek), kaybeden yine yalnız bahsini kaybeder.
 */
export function receive(mode: Mode, stake: number, outcome: 'win' | 'lose' | 'draw', winners: number, mult = 1): number {
  const pot = Math.floor(payout(mode, stake) * Math.max(1, mult));
  if (mode === '4' || mode === '3') return outcome === 'lose' ? 0 : Math.floor(pot / Math.max(1, winners));
  return outcome === 'win' ? pot : outcome === 'draw' ? stake : 0;
}

/** Ana ekrandaki "Kazanırsan …": tek kazanan maçta alınacak. */
export const prize = (mode: Mode, stake: number, mult = 1): number => receive(mode, stake, 'win', 1, mult);

/** Maç XP'si girdisi. */
export interface XpFacts {
  /** Oynanan (biten) el sayısı */
  hands: number;
  /** Oyun uzunluğu çarpanı (tek el 1) */
  mult: number;
  /** Pişti: insanın pişti sayısı (vale dahil) ve vale pişti sayısı */
  pisti?: number;
  vale?: number;
  /** Blöf: yakaladığı blöf */
  caught?: number;
}

/**
 * Maç XP'si: el başına 20 (katılım) + sonuç primi (kazanma 40 · berabere 10 · kayıp 0) × uzunluk çarpanı; kalabalık masa çarpanı;
 * Pişti'de pişti +8 / vale pişti +12 · Blöf'te yakalanan blöf +6 (el başına en çok 10). Tek elde eskisiyle birebir aynı (60 / 30 / 20).
 */
export function matchXp(game: Game, mode: Mode, outcome: 'win' | 'lose' | 'draw', f: XpFacts): number {
  const hands = Math.max(1, f.hands);
  const base = 20 * hands + (outcome === 'win' ? 40 : outcome === 'draw' ? 10 : 0) * Math.max(1, f.mult);
  const k = mode === '4' ? 1.25 : mode === '3' ? 1.15 : mode === 'esli' ? 1.1 : 1;
  const extra = game === 'blof' ? Math.min(10 * hands, f.caught ?? 0) * 6 : (f.pisti ?? 0) * 8 + (f.vale ?? 0) * 12;
  return Math.round(base * k + extra);
}

/** Blöf tek el XP'si: kazanana 60, kaybedene 20 (Pişti ile aynı); kalabalık masa çarpanı; her yakalanan blöf +6. */
export function blofXp(mode: Mode, outcome: 'win' | 'lose' | 'draw', caught: number): number {
  return matchXp('blof', mode, outcome, {hands: 1, mult: 1, caught});
}
