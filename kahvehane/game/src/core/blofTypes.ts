// Blöf: ortak sözleşme. Kural motoru (blof.ts), botlar (ai/blofBot.ts), yerel/çevrimiçi ev sahibi (net/)
// ve sunum katmanı (game/blofMatch.ts, table2d/blof*, ui/blof*) bu tiplerle konuşur.
// Kurallar: docs/BLOF.md. Bu dosya KARARLI tutulur: alan eklenebilir, var olan ad/anlam değişmez.
//
// Temel ilkeler (çevrimiçi hazırlığı, bkz. docs/ONLINE.md):
// - Durum (BlofState) düz, serileştirilebilir veridir (JSON'a aynen yazılır); sunucuda aynen koşar.
// - Motor saatsizdir: blöf penceresini (sıradaki insansa 5 sn, değilse 3 sn) ev sahibi (şimdilik LocalHost, sonra sunucu)
//   sayar ve süre dolunca {t:'windowClosed'} gönderir. Sürenin kendisi kuraldır: motor her pencereye yazar (BlofWindow.ms).
// - İstemci yalnız kendi BlofView'unu ve kendine süzülmüş (redact) olayları görür; gizli kart sızmaz.

import type {CardId} from './types';

export type {CardId} from './types';

/** Masadaki koltuk sayısı: 1'e 1 · 3 kişi · 4 kişi (tekli ya da eşli). */
export type BlofSeats = 2 | 3 | 4;

/** Ana ekrandaki mod seçimi. */
export type BlofMode = '1v1' | '3' | '4' | 'esli';

/** Mod → koltuk ve takım düzeni. Koltuk 0 alt (yerel insan); eşlide karşılıklı oturanlar (0-2, 1-3) takım. */
export const BLOF_MODES: Record<BlofMode, {seats: BlofSeats; teams: number[]; name: string; desc: string}> = {
  '1v1': {seats: 2, teams: [0, 1], name: "1'e 1", desc: 'Sen ve rakibin, göz göze.'},
  '3': {seats: 3, teams: [0, 1, 2], name: '3 Kişi', desc: 'Üç oyuncu, herkes kendi için.'},
  '4': {seats: 4, teams: [0, 1, 2, 3], name: '4 Kişi', desc: 'Dört oyuncu, herkes kendi için.'},
  esli: {seats: 4, teams: [0, 1, 0, 1], name: 'Eşli', desc: 'Karşındaki ortağın; biriniz bitirirse ikiniz kazanırsınız.'},
};

/** Blöf penceresi (ms): atıştan sonra sıradaki (bir sonraki oynayacak) koltuk İNSANSA. */
export const BLOF_WINDOW_MS = 5000;
/** Blöf penceresi (ms): sıradaki koltuk bot ise (insan yine blöf diyebilir; masa boşuna beklemez). */
export const BLOF_WINDOW_SHORT_MS = 3000;
/** Yakalanan yalancının yığına ek olarak kenarın üstünden aldığı ceza kartı sayısı (kenarda az varsa o kadar). */
export const BLOF_PENALTY = 2;
/** Bir atışta en az / en çok kart. */
export const BLOF_MIN_PLAY = 1;
export const BLOF_MAX_PLAY = 4;

/** Değer adları (1 = As … 13 = Papaz); indeks 0 boş. */
export const RANK_NAMES: readonly string[] = ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Vale', 'Kız', 'Papaz'];

/** "As", "7", "Papaz"… */
export const rankName = (rank: number): string => RANK_NAMES[rank] ?? '?';

/** İddia metni: "3 tane 7", "1 tane As". */
export const claimText = (count: number, rank: number): string => `${count} tane ${rankName(rank)}`;

/** Atılan kartların hepsi söylenen değerde mi (doğru mu)? */
export const isTruthful = (cards: readonly CardId[], rank: number): boolean => {
  for (const c of cards) if ((c % 13) + 1 !== rank) return false;
  return true;
};

/** Bir modun motor ayarı (tohum ve ilk açan dışarıdan). */
export function blofConfigFor(mode: BlofMode, seed: number, firstSeat?: number): BlofConfig {
  const m = BLOF_MODES[mode];
  return {seats: m.seats, teams: [...m.teams], seed, firstSeat};
}

// ───────────────────────────── Ayarlar ─────────────────────────────

export interface BlofConfig {
  /** Koltuk sayısı. Koltuklar saat yönünün tersine: 0 alt, sonra sağ, üst, sol. Sıra 0→1→2→… ilerler. */
  seats: BlofSeats;
  /** Koltuk başına takım. Yoksa herkes tek: [0,1,…]. Eşli: [0,1,0,1]. Aynı takımdakiler birbirine blöf diyemez. */
  teams?: number[];
  /** Karıştırma tohumu: aynı tohum → aynı dağıtım (sunucu ve istemci aynı sonucu üretir). */
  seed: number;
  /** İlk turu açan koltuk. Verilmezse tohumdan seçilir. */
  firstSeat?: number;
  /**
   * Blöf penceresi (ms), atıştan sonra sıradaki koltuk insansa. Varsayılan 5000. Motor süreyi olaylara/görünüme yazar;
   * sayan ev sahibidir.
   */
  challengeWindowMs?: number;
  /** Blöf penceresi (ms), sıradaki koltuk bot ise. Varsayılan 3000. */
  challengeWindowShortMs?: number;
  /**
   * Koltuk başına: bir insan mı oynuyor (bu cihazda ya da uzaktan). Yalnız pencere süresini belirler. Verilmezse herkes
   * insan sayılır (hep uzun pencere). Ev sahibi bunu koltuk türlerinden kendisi doldurur (GameEngine.withSeats).
   */
  humanSeats?: boolean[];
}

/** Durumda saklanan, varsayılanları doldurulmuş ayar. */
export interface BlofSettings {
  seats: BlofSeats;
  teams: number[];
  seed: number;
  firstSeat: number;
  /** Sıradaki insansa pencere (ms). */
  challengeWindowMs: number;
  /** Sıradaki bot ise pencere (ms). */
  challengeWindowShortMs: number;
  /** Koltuk başına insan mı (pencere süresi için). */
  humanSeats: boolean[];
}

/** Pencere süresi kuralı: atıştan sonra sıradaki koltuk insansa uzun (5 sn), değilse kısa (3 sn). */
export const windowMsFor = (cfg: Pick<BlofSettings, 'challengeWindowMs' | 'challengeWindowShortMs' | 'humanSeats'>, nextSeat: number): number =>
  (cfg.humanSeats?.[nextSeat] ?? true) ? cfg.challengeWindowMs : (cfg.challengeWindowShortMs ?? cfg.challengeWindowMs);

// ───────────────────────────── Durum ─────────────────────────────

/**
 * Oyunun evresi:
 * - 'turn'   : sıradaki oyuncunun hamlesi bekleniyor (aç / at / pas)
 * - 'window' : son atıştan sonraki blöf penceresi açık (blöf de / geç); sıra ilerlemez
 * - 'over'   : biri bitirdi, oyun bitti
 */
export type BlofPhase = 'turn' | 'window' | 'over';

/** Turdaki bir atış (kamuya açık kısmı: kim, kaç kart). */
export interface BlofPlayInfo {
  seat: number;
  count: number;
}

/** Açık blöf penceresi. */
export interface BlofWindow {
  /** Pencere sıra numarası (1'den artar). Bayat zamanlayıcıyı ayırt etmek için windowClosed'a konur. */
  id: number;
  /** Kartları atan koltuk. */
  by: number;
  /** İddia edilen değer (1..13). */
  rank: number;
  /** Atılan kart sayısı (1..4). */
  count: number;
  /** Atan son kartlarını attı: pencere blöfsüz kapanırsa (ya da blöf yanlış çıkarsa) oyunu bitirir. */
  final: boolean;
  /** Bu pencerenin süresi (ms): sıradaki insansa challengeWindowMs, değilse challengeWindowShortMs. */
  ms: number;
  /** Koltuk başına: bu pencerede blöf diyebilir mi (atan ve eşlide takım arkadaşı diyemez). */
  eligible: boolean[];
  /** Koltuk başına: "geç" dedi mi (herkes geçerse pencere erken kapanır). Gizli: görünümde yalnız kendi hâlin. */
  declined: boolean[];
}

/** Koltuk başına istatistik (profil, görev ve başarımlar için). */
export interface BlofSeatStats {
  /** Kart atışı sayısı (turu açışlar dahil). */
  plays: number;
  /** Turu açış sayısı. */
  opens: number;
  /** Toplam atılan kart. */
  cardsPlayed: number;
  /** İçinde en az bir yanlış kart olan atış (yapılan blöf). */
  bluffs: number;
  /** Pas sayısı. */
  passes: number;
  /** "Blöf!" deme sayısı. */
  challenges: number;
  /** Yakalanan blöf: "Blöf!" dedi ve yalan çıktı. */
  caught: number;
  /** Boşa blöf: "Blöf!" dedi ama doğru çıktı (yığını kendisi aldı). */
  wrongChallenges: number;
  /** Kendi blöfü yakalandı. */
  timesCaught: number;
  /** Kendisine blöf dendi ama doğru çıktı. */
  survived: number;
  /** Bu kadar kez yığın aldı. */
  pilesTaken: number;
  /** Yığınlardan aldığı toplam kart. */
  cardsTaken: number;
  /** Bir seferde aldığı en büyük yığın. */
  biggestPile: number;
  /** Yakalanınca kenardan aldığı ceza kartları (toplam). */
  penaltyCards: number;
}

/** Oyun sonucu. */
export interface BlofResult {
  /** İlk bitiren (kazanan) koltuk. */
  winner: number;
  /** Kazananın takımı (tekli oyunda koltuğun kendi takım numarası). */
  winnerTeam: number;
  /** Kazanan taraftaki tüm koltuklar (eşlide iki koltuk). */
  winners: number[];
  /** Sıralama: kazanan önce, sonra elinde az kart kalandan çoğa (eşitlikte kazanandan sonraki sıra). */
  ranking: number[];
  /** Bitişte koltuk başına eldeki kart sayısı. */
  handCounts: number[];
  /** Koltuk başına istatistik. */
  stats: BlofSeatStats[];
  /** Oynanan tur sayısı. */
  rounds: number;
  /** Toplam hamle (aç/at/pas/blöf/pencere kapanışı). */
  moves: number;
}

/** Sunucu tarafı TAM durum. İstemciye asla gönderilmez; istemci viewFor ile görünüm alır. */
export interface BlofState {
  cfg: BlofSettings;
  /** Koltuk başına el (değer, sonra renk sırasına göre sıralı). */
  hands: CardId[][];
  /** Ortadaki kapalı yığın, atış sırasıyla (son atış en sonda). */
  pile: CardId[];
  /** Bu turdaki atışlar (kim, kaç kart) — kamuya açık. Toplamı pile.length'e eşittir. */
  plays: BlofPlayInfo[];
  /** Herkes pas deyince kenara (oyun dışına) giden kartlar. */
  discard: CardId[];
  /** Turun söylenen değeri (1..13); 0 = tur açılmadı, sıradaki oyuncu açacak. */
  rank: number;
  /** Bu turu açan koltuk (tur açılmadıysa açacak olan). */
  opener: number;
  /** Sıradaki koltuk. Pencere açıkken: pencere kapanınca oynayacak olan. */
  turn: number;
  phase: BlofPhase;
  /** Son atıştan beri art arda pas sayısı (koltuk sayısı − 1'e ulaşınca yığın kenara gider). */
  passes: number;
  /** Son atan koltuk (−1: bu turda atış yok). */
  lastSeat: number;
  /** Son atışın kart sayısı (yığının en üstteki bu kadar kartı). */
  lastCount: number;
  /** Açık blöf penceresi (phase === 'window' iken). */
  window: BlofWindow | null;
  /** Son açılan pencerenin numarası. */
  windowSeq: number;
  /** Kaçıncı tur (1'den). */
  round: number;
  /** Hamle sayacı: aç/at/pas/blöf/pencere kapanışında artar ("geç" artırmaz). Ev sahibi bunu dönem (epoch) olarak kullanır. */
  move: number;
  /** Kazanan koltuk (−1: oyun sürüyor). */
  winner: number;
  stats: BlofSeatStats[];
  result: BlofResult | null;
}

// ───────────────────────────── Hamleler ─────────────────────────────

/**
 * Hamleler. seat alanı hamleyi yapan koltuktur; ev sahibi bunun bağlantının koltuğuyla aynı olduğunu doğrular.
 * - open        : turu açar — değeri söyler (rank 1..13) ve 1–4 kartı kapalı atar ("3 tane 7"). Blöf serbest.
 * - play        : turun değerini söyleyerek 1–4 kart atar.
 * - pass        : pas. Turu açacak olan pas diyemez.
 * - challenge   : "Blöf!" — yalnız pencere açıkken, atan ve (eşlide) takım arkadaşı dışındakiler.
 * - decline     : "geç / blöf demiyorum". Herkes geçerse pencere erken kapanır. Geçen o pencerede artık blöf diyemez.
 * - windowClosed: YALNIZ yetkili taraf (ev sahibi/sunucu) gönderir: pencere süresi doldu. id verilirse eşleşmeli.
 */
export type BlofAction =
  | {t: 'open'; seat: number; rank: number; cards: CardId[]}
  | {t: 'play'; seat: number; cards: CardId[]}
  | {t: 'pass'; seat: number}
  | {t: 'challenge'; seat: number}
  | {t: 'decline'; seat: number}
  | {t: 'windowClosed'; id?: number};

// ───────────────────────────── Olaylar ─────────────────────────────

/**
 * Motorun ürettiği olaylar (animasyonu sürer). Sunucu tam hâlini üretir; her koltuğa redactBlofEvent ile
 * süzülmüş hâli gider (kapalı kartlar null olur, bazı olaylar hiç gitmez).
 *
 * Tipik akışlar:
 *  başlangıç : deal → turn
 *  atış      : opened|played → windowOpen
 *  geç       : declined (yalnız geçene) [→ herkes geçtiyse windowClosed → turn | finished → gameOver]
 *  süre doldu: windowClosed → turn | finished → gameOver
 *  blöf      : challenged → reveal → pileTaken [→ penalty (yalansa, kenarda kart varsa)] → turn (yeni tur) | finished → gameOver
 *  pas       : passed → turn | passed → pileCleared → turn (yeni tur)
 */
export type BlofEvent =
  /** Dağıtım: startSeat'ten başlayıp sırayla tek tek; counts koltuk başına kart. hands: yalnız kendi elin, diğerleri null. */
  | {t: 'deal'; firstSeat: number; startSeat: number; counts: number[]; hands: (CardId[] | null)[]}
  /** Sıra: seat oynayacak. open: turu açacak (değer seçecek). rank: turun değeri (0: açılmadı). */
  | {t: 'turn'; seat: number; open: boolean; rank: number; round: number}
  /** Tur açıldı: seat "count tane rank" dedi. cards yalnız atana görünür. pileCount/handCount atıştan sonraki sayılar. */
  | {t: 'opened'; seat: number; rank: number; count: number; cards: CardId[] | null; pileCount: number; handCount: number}
  /** Tura kart atıldı (turun değeri söylenerek). */
  | {t: 'played'; seat: number; rank: number; count: number; cards: CardId[] | null; pileCount: number; handCount: number}
  /** Pas. passes: son atıştan beri art arda pas sayısı. */
  | {t: 'passed'; seat: number; passes: number}
  /**
   * Blöf penceresi açıldı. ms: bu pencerenin süresi (sıradaki insansa 5000, değilse 3000; sayacı ev sahibi sunum bitince
   * başlatır, gerçek bitişi 'timer' mesajı söyler). eligible: blöf diyebilecek koltuklar.
   */
  | {t: 'windowOpen'; id: number; by: number; rank: number; count: number; final: boolean; ms: number; eligible: number[]}
  /** Bu koltuk "geç" dedi (yalnız kendisine gider). */
  | {t: 'declined'; id: number; seat: number}
  /** Pencere blöfsüz kapandı: süre doldu ya da herkes geçti. */
  | {t: 'windowClosed'; id: number; by: number; reason: 'timeout' | 'declined'}
  /** by koltuğu target'in son atışına "Blöf!" dedi. */
  | {t: 'challenged'; id: number; by: number; target: number}
  /** Son atış açıldı (herkese). truthful: hepsi söylenen değerde. */
  | {t: 'reveal'; seat: number; by: number; rank: number; cards: CardId[]; truthful: boolean}
  /** seat yığının tamamını aldı. cards yalnız alana görünür. reason: 'caught' = blöfü yakalandı, 'wrongChallenge' = boşa blöf dedi. */
  | {t: 'pileTaken'; seat: number; count: number; cards: CardId[] | null; reason: 'caught' | 'wrongChallenge'; handCount: number}
  /**
   * Yakalanan yalancıya ceza (pileTaken'ın hemen ardından): kenarın ÜSTÜNDEN (en son kenara giden) count kart (en çok
   * BLOF_PENALTY; kenarda daha az varsa o kadar; kenar boşsa olay yok). cards (kenardaki sırasıyla, en üstteki en sonda)
   * yalnız alana görünür — alınan yığın gibi. handCount / discardCount: cezadan sonraki sayılar.
   */
  | {t: 'penalty'; seat: number; count: number; cards: CardId[] | null; handCount: number; discardCount: number}
  /** Herkes pas dedi: yığın kenara gitti; by (son atan) yeni turu açacak. */
  | {t: 'pileCleared'; count: number; by: number}
  /** seat son kartlarını attı ve geçerli sayıldı: bitirdi (ilk bitiren kazanır). */
  | {t: 'finished'; seat: number; team: number}
  | {t: 'gameOver'; result: BlofResult};

export type BlofEventType = BlofEvent['t'];

// ───────────────────────────── Görünüm ─────────────────────────────

/** Bir koltuğun görebildiği her şey (istemci, bot ve ileride çevrimiçi oyuncu yalnız bunu alır). seat −1: seyirci. */
export interface BlofView {
  seat: number;
  seats: number;
  teams: number[];
  /** Kendi elin (sıralı). Seyircide boş. */
  hand: CardId[];
  /** Herkesin elindeki kart sayısı (rozetin yanında; 1–2 kalınca rozet yanar). */
  handCounts: number[];
  /** Ortadaki kapalı yığındaki kart sayısı. */
  pileCount: number;
  /** Kenara giden (oyun dışı) kart sayısı. */
  discardCount: number;
  /** Turun değeri (0: açılmadı). */
  rank: number;
  /** Turu açan (ya da açacak) koltuk. */
  opener: number;
  /** Sıradaki koltuk (pencere açıkken: pencereden sonra oynayacak olan). */
  turn: number;
  phase: BlofPhase;
  /** Sıra bende ve hamle yapabilirim (phase 'turn'). */
  myTurn: boolean;
  /** Sıra bende ve turu ben açacağım (değer seçicisi). */
  mustOpen: boolean;
  /** Pas diyebilirim. */
  canPass: boolean;
  /** Bu turdaki atışlar (kim kaç kart; kamuya açık). */
  roundPlays: BlofPlayInfo[];
  /** Son atış (kim, kaç kart, hangi değer iddiasıyla). */
  lastPlay: {seat: number; count: number; rank: number} | null;
  /** Son atıştan beri art arda pas. */
  passes: number;
  /** Açık pencere (eligible herkese açık; kimin geçtiği gizli). ms: bu pencerenin süresi (5000 / 3000). */
  window: {id: number; by: number; rank: number; count: number; final: boolean; eligible: boolean[]; ms: number} | null;
  /** Şu an "Blöf!" diyebilirim. */
  canChallenge: boolean;
  /** Bu pencerede "geç" dedim. */
  declined: boolean;
  round: number;
  move: number;
  /** Pencere süresi (ms) sıradaki insansa / bot ise (açık pencerenin gerçek süresi: window.ms). */
  challengeWindowMs: number;
  challengeWindowShortMs: number;
  /** Kazanan (−1: sürüyor). */
  winner: number;
  over: boolean;
  result: BlofResult | null;
}

/** Bir görünümde yapılabilecekler (tüm kart alt kümelerini saymak yerine özet). */
export interface BlofLegal {
  /** Değer söyleyip turu açabilir (mustOpen). */
  open: boolean;
  /** Turun değeriyle atabilir. */
  play: boolean;
  pass: boolean;
  challenge: boolean;
  decline: boolean;
  /** Bir atışta en az/en çok kart (elindekiyle sınırlı). */
  minCards: number;
  maxCards: number;
  /** Açarken söylenebilecek değerler (blöf serbest: 1..13 hepsi). */
  ranks: number[];
  /** Atarken söylenecek değer (0: yok). */
  rank: number;
}

/** Hata kodları (mesajlar Türkçe; kod istemcinin dallanması için). */
export type BlofErrorCode =
  | 'bad-action'
  | 'bad-seat'
  | 'over'
  | 'phase'
  | 'turn'
  | 'must-open'
  | 'not-open'
  | 'bad-rank'
  | 'bad-count'
  | 'bad-card'
  | 'duplicate'
  | 'not-in-hand'
  | 'cannot-pass'
  | 'own-play'
  | 'teammate'
  | 'declined'
  | 'stale';

export interface BlofError {
  error: string;
  code: BlofErrorCode;
}

/** Motor adımının sonucu: başarılıysa yeni durum + olaylar, değilse hata (girdi durumu değişmez). */
export type BlofStep = {state: BlofState; events: BlofEvent[]; error?: undefined; code?: undefined};
export type BlofApplyResult = BlofStep | (BlofError & {state?: undefined; events?: undefined});

/** Botun (ve ileride sunucu botunun) arayüze verdiği "ele veren" ipucu: yüz tepkisi için, gürültülü, hile değil. */
export interface BlofTell {
  /** Gergin görünüyor: blöf yapınca daha olası ama doğruyken de olur. Kolay botlar daha çok ele verir. */
  nervous: boolean;
  /** Kendinden emin / sırıtıyor: çoğunlukla doğruyken; zor bot blöfte de taklit edebilir. */
  smug: boolean;
}

/** Kural motorunun dışa açtığı işlevlerin imzaları (blof.ts bunu uygular: `blofRules`). */
export interface BlofRulesApi {
  createBlof(cfg: BlofConfig): BlofStep;
  applyBlof(state: BlofState, action: BlofAction): BlofApplyResult;
  /** Hamle geçerli mi? null = geçerli. applyBlof'un yaptığı doğrulamanın aynısı. */
  validateBlof(state: BlofState, action: BlofAction): BlofError | null;
  viewFor(state: BlofState, seat: number): BlofView;
  legalActions(view: BlofView): BlofLegal;
  /** Görünüme göre hızlı ön kontrol (istemci düğmeleri için); kesin karar sunucunun applyBlof'udur. */
  isLegalFor(view: BlofView, action: BlofAction): boolean;
  /** Olayın bu koltuğa gidecek hâli; null = bu koltuğa gönderilmez. seat −1: seyirci. */
  redactBlofEvent(event: BlofEvent, seat: number): BlofEvent | null;
  /** Süre aşımında (çevrimiçi AFK) bu koltuk yerine yapılacak varsayılan hamle; yoksa null. */
  timeoutAction(state: BlofState, seat: number): BlofAction | null;
  /** Şu an hamlesi beklenen koltuklar (turn: sıradaki; window: blöf diyebilecek ve geçmemiş olanlar). */
  actors(state: BlofState): number[];
}
