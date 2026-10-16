// Maç kurulumu ve ekonomi (arayüzden bağımsız, saf): koltuklar (3 kişi dahil), bahis ödemesi, XP.
// Sunucu ileride aynı fonksiyonları çalıştırır.
import {charById, type CharId} from './roster';
import {MODE_INFO, type Difficulty, type Game, type MatchSetup, type Mode, type SeatPlayer} from './types';

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
  }
  return setup;
}

/** El sonu ödemesi (bahis düşüldükten sonra alınan): 1'e 1/eşli kazanana 2×, 3-4 kişide pot kazanan(lar)a; beraberlikte iade. Blöf'te beraberlik yok. */
export function receive(mode: Mode, stake: number, outcome: 'win' | 'lose' | 'draw', winners: number): number {
  if (mode === '4' || mode === '3') return outcome === 'lose' ? 0 : Math.floor(payout(mode, stake) / Math.max(1, winners));
  return outcome === 'win' ? payout(mode, stake) : outcome === 'draw' ? stake : 0;
}

/** Blöf el XP'si: kazanana 60, kaybedene 20 (Pişti ile aynı); kalabalık masa çarpanı; her yakalanan blöf +6. */
export function blofXp(mode: Mode, outcome: 'win' | 'lose' | 'draw', caught: number): number {
  const base = outcome === 'win' ? 60 : outcome === 'draw' ? 30 : 20;
  const k = mode === '4' ? 1.25 : mode === '3' ? 1.15 : mode === 'esli' ? 1.1 : 1;
  return Math.round(base * k + Math.min(10, caught) * 6);
}
