// Arayüz sözleşmesi (oyun akışı bu tiplerle konuşur). screens.ts bunları dışa aktarır.
import type {GameResult} from '../core/types';
import type {BlofOutcome, Difficulty, Game, HandLayout, MatchLength, MatchSetup, Mode, SeatPlayer} from '../game/types';
import type {SeriesState} from '../game/series';
import type {CharDef, CharId, Pose} from '../game/roster';
import type {ItemKind} from '../game/catalog';
import type {Bubble} from '../audio/speech';
import type {ChatLevel} from '../ai/dialogue';

export type Mood = 'kahkaha' | 'kizgin' | 'saskin' | 'uzgun';

export interface Settings {
  sfx: boolean;
  voice: boolean;
  music: boolean;
  haptics: boolean;
  quality: 'auto' | 'low' | 'mid' | 'high';
}

/**
 * Ana ekrandan uygulamaya giden istekler. Market, profil, günlük ödül ve sandık ekran içinde (Profile üzerinden) çözülür;
 * yalnız maç, ayarlar ve kurallar uygulamaya döner.
 * `opponents`: koltuk sırasıyla botlar (1'e 1: [üst]; 3 kişi: [sağ, sol]; 4 kişi/eşli: [sağ, karşı, sol] — eşlide karşıdaki ortaktır).
 * `difficulty`: yalnız Blöf'te (kolay · orta · zor).
 */
export type HomeAction =
  | {type: 'play'; game: Game; mode: Mode; stake: number; opponents: CharId[]; difficulty: Difficulty; len?: MatchLength}
  | {type: 'settings'}
  | {type: 'rules'}
  /** Yarım kalan maça devam (açılıştaki "devam et?" penceresi) */
  | {type: 'resume'};

/** Ana ekran açılınca sorulacak yarım kalan maç (ResumeData + "Bırak" seçilirse uygulamanın yapacağı). */
export interface ResumeOffer extends ResumeData {
  onDecline(): void;
}

/** Yarım kalan maç penceresi verisi. */
export interface ResumeData {
  series: SeriesState;
  /** Koltuklar (avatar/ad) */
  players: readonly SeatPlayer[];
  /** Masadaki (maç başında düşülmüş) bahis */
  stake: number;
  /** Oyuncunun çerçevesi */
  frame: string;
  /** Test: kendiliğinden "Devam Et" */
  auto?: boolean;
}

/** Eller arası "Ara Skor" verisi (uygulama hesaplar; ekran yalnız gösterir). */
export interface InterimData {
  /** Biten elin kurulumu (koltuklar) */
  setup: MatchSetup;
  /** Bu el kaydedildikten SONRAKİ maç durumu (bitmemiş) */
  series: SeriesState;
  stake: number;
  frame: string;
  /** Sahnedeki konuşan karakter (bot koltuğu + poz); balonu konuşma yöneticisi yazar. talkers verilirse yok sayılır. */
  speaker?: {seat: number; pose: Pose};
  /** Karşılıklı konuşanlar (sırasıyla): ilki büst, ikincisi yuvarlak portre; koltuk −1 = masada olmayan seyirci */
  talkers?: readonly Talker[];
  /** Bu kadar ms sonra kendiliğinden "Sonraki El" (0: kapalı) */
  autoMs: number;
}

/** Ara Skor / sonuç ekranında konuşan biri: koltuk (−1: seyirci), karakter, poz. */
export interface Talker {
  seat: number;
  char: CharDef;
  pose: Pose;
}

/** Konuşma sahnesi (Ara Skor, sonuç ekranı): konuşanın balonunu verir; koltuk −1 = masada olmayan seyirci (karakterle). */
export interface TalkStage {
  bubble(seat: number, char: string): Bubble;
}

/** Sonuç ekranının konuşma kancası (uygulama doldurur; ekran yalnız sahneyi verir). */
export interface ResultsTalk {
  /** Konuşacaklar (sırasıyla; balon kuyruğu ve seyirci portresi için). */
  readonly talkers: readonly Talker[];
  /** Giriş oturdu: karşılıklı konuşma başlayabilir. */
  start(stage: TalkStage): void;
  /** Oyuncu seçti (ekran solmadan hemen önce): konuşma kesilir, gerekirse veda / rövanş kabulü hazırlanır. */
  leave(choice: 'again' | 'home', stage: TalkStage): void;
}

/** Ayarlar penceresindeki "Sohbet" satırı: Sakin · Normal · Geveze. */
export interface ChatOption {
  value: ChatLevel;
  onChange(l: ChatLevel): void;
}

/** İlk açılış sohbet seçicisinin örnek dinletme kapısı (uygulama konuşma yöneticisine bağlar). */
export interface ChatSamplePort {
  /** Seviyenin örnek konuşmasını çal (öncekini keser); konuşanın balonu `bubble(char)`. */
  play(level: ChatLevel, bubble: (char: string) => Bubble): void;
  /** Örneği sustur. */
  stop(): void;
  /** Örneklerin seslerini boşta hazırla (paketli düzen). */
  warm?(): void;
}

/** Ayarlar penceresindeki "Blöf el düzeni" satırı (Blöf motoru varsa verilir). */
export interface HandOption {
  /** Kayıtlı seçim; undefined = henüz seçmedi (satır Gruplu'yu varsayılan gösterir) */
  value: HandLayout | undefined;
  /** El oynanırken masa düzeni anında değişir mi (değilse "yeni elde geçerli olur" notu) */
  live: boolean;
  onChange(h: HandLayout): void;
}

/** Kozmetik değişti (kuşanıldı): uygulama desteyi/masayı yeniden kurar. */
export type CosmeticsListener = (kind: ItemKind, id: string) => void;

/** Hızlı sohbet menüsünün bir satırı (oyuncunun karakterine göre söz). */
export interface QuickChatItem {
  id: string;
  label: string;
  icon: string;
  /** Bağlama uygun öneri (öne dizilir, parlar). */
  hot?: boolean;
}

/** Hızlı sohbet penceresi (bir kez kurulur, tekrar kullanılır). */
export interface QuickChatSheetPort {
  readonly isOpen: boolean;
  open(o: {items: readonly QuickChatItem[]; muted: boolean; coolMs: number; onPick(id: string): void; onMute(on: boolean): void}): void;
  close(): void;
  /** Bekleme (ms): satırlar soluk + ilerleme şeridi. */
  cool(ms: number): void;
}

/** Menü konuşmaları (galeri tanıtımı, market): karakterin repliği ses + yazı; tek konuşma yöneticisinden geçer. */
export type MenuMoment = 'galleryIntro' | 'shopPitch' | 'shopBought' | 'shopPoor';
export interface MenuTalk {
  /** Önceki menü konuşmasını keser, karakterin bu andaki repliğini söyler. bubble: yazının göründüğü yer. */
  say(charId: string, moment: MenuMoment, bubble?: {show(text: string, ms: number): void; hide(): void}): void;
  /** Menü konuşmasını hemen sustur. */
  stop(): void;
  /** Paketli ses düzeninde bu karakterlerin menü paketlerini boşta indir (galeri / market açılınca). */
  warm?(charIds: readonly string[]): void;
}

export interface Sounds {
  tap(): void;
  whoosh(): void;
  coin(n?: number): void;
  reward(): void;
  /** İsteğe bağlı zengin sesler (yoksa sessiz) */
  flip?(): void;
  deal?(): void;
  shuffle?(): void;
  /** Ağır vuruş (VS damgası, kutu patlaması) */
  slam?(): void;
  /** Büyük kutlama (hediye açılışı, seviye atlama) */
  fanfare?(): void;
  lose?(): void;
}

/** El sonu ekranı verisi (uygulama hesaplar; ekran yalnız gösterir). */
export interface ResultsData {
  setup: MatchSetup;
  /** Pişti: puan tablosu */
  result?: GameResult;
  /** Blöf: eli bitiren ve koltuk başına blöf sayıları (çok elli seride son elin sayıları; tablo seriden kurulur) */
  blof?: BlofOutcome;
  /** Çok elli maç: maç toplamları (Pişti: puan + el · Blöf: el el ceza). Tek elde verilmez (tablo eskisi gibi). */
  series?: SeriesState;
  /** Oyuncunun (ya da takımının) sonucu */
  outcome: 'win' | 'lose' | 'draw';
  myPisti: number;
  myValePisti: number;
  stake: number;
  /** Net kazanç/kayıp (bahis dahil) */
  coinsDelta: number;
  coinsBefore: number;
  coinsAfter: number;
  xpGain: number;
  /** XP eklenmeden önceki ve sonraki seviye durumu */
  before: {level: number; xp: number; xpNext: number};
  after: {level: number; xp: number; xpNext: number};
  /** Seviye ödülü (jeton; coinsAfter'a dahil) */
  levelReward: number;
  /** Maç sonrası galibiyet serisi */
  streak: number;
  /** İsteğe bağlı: rakibin son sözü */
  line?: string;
}

// ─────────── Oyun içi HUD sözleşmesi (src/ui/hud.ts uygular, src/game/match.ts kullanır) ───────────
type HudSeat = import('../game/types').SeatPlayer;
type HudMode = import('../game/types').Mode;
/** Rozet hâli (roster Pose): notr, kirpma, gulumseme, kahkaha, kizgin, saskin, uzgun, dusunceli, zafer, pisti */
export type HudPose = import('../game/roster').Pose;

/** HUD'daki bir koltuk (SeatPlayer'dan kurulur). */
export interface HudPlayer {
  seat: number;
  name: string;
  char: import('../game/roster').CharDef;
  isMe: boolean;
  team: number;
  level: number;
  /** Avatar çerçevesi (.kh-frame--<id>); yalnız insan oyuncuda */
  frame?: string;
}

/** Rozet yerleşimi = oyun modu. 1v1: 0 sol alt, 1 üst orta. 4/eşli: 0 sol alt, 1 sağ, 2 üst, 3 sol. */
export type HudLayout = HudMode;

/** HUD/efekt katmanının çaldığı sesler (Sfx bunları sağlar; Match bağlar). */
export type HudSounds = Pick<import('../audio/sfx').Sfx,
  'poke' | 'tick' | 'combo' | 'valuable' | 'sweep' | 'swoosh' | 'bonus' | 'fireworkLaunch' | 'fireworkBurst' | 'shootingStar' | 'starChime' | 'coinRain' | 'coin' | 'drumRoll'>;

export interface HudPisti {
  seat: number;
  jack: boolean;
  points: number;
  /** Kuşanılmış pişti efekti: klasik · havai · yildiz · altin */
  fx: string;
  /** Kutlayan karakterin repliği (büyük balonda) */
  line?: string;
  /** Efektin çıkış noktası (yığın) */
  at: {x: number; y: number};
  low?: boolean;
}

export interface HudTally {
  /** Koltuk başına: toplanan kart sayısı ve sayacın duracağı yer (deste üstü) */
  rows: {seat: number; cards: number; x: number; y: number}[];
  /** Eşli: [kaynak, hedef] koltuk çiftleri; ortağın sayısı hedefe akıp toplanır */
  merge?: [number, number][];
  /** Çoğunluk (+3) alan koltuk (eşlide takımın göstergesi); -1 = kimse */
  majority: number;
  /** +3'ün çıkış noktası */
  from: {x: number; y: number};
}

export interface GameHud {
  /**
   * Rozetleri kurar ve HUD'u gösterir (aynı oyuncularla tekrar çağrılırsa yeniden kurmaz).
   * coins / frame verilmezse önceki değer korunur (Match coins vermez; jetonu uygulama setCoins ile yazar).
   * frame: insan oyuncunun kuşandığı çerçeve id'si.
   */
  show(players: readonly HudSeat[], mode: HudMode, coins?: number, frame?: string): void;
  hide(): void;
  /** Sonuç ekranı açıkken HUD'u soldur */
  dim(on: boolean): void;
  /** Koltuk sırasıyla (her koltuk kendi sayısı; eşlide takım hapı bunlardan toplanır) */
  setStats(st: {cards: number; pisti: number}[]): void;
  /** Toplama sırasında kart sayacını tek tek ilerletir (tık sesiyle) */
  tickCards(seat: number, cards: number): void;
  setCoins(n: number, animate?: boolean): void;
  /** 0 ben, 1.. rakipler, -1 kimse; thinking: bot düşünüyor (düşünceli hâl) */
  setTurn(seat: number, thinking?: boolean): void;
  /** Her karede çağrılabilir; yalnız transform yazar */
  setDeck(count: number, x: number, y: number): void;
  showHint(text: string | null): void;
  /** Konuşma balonu + (varsa) tepki hâli. seat verilmezse ilk rakip. Dönen numara bu yazının kimliği (unsay / holdSay için). */
  say(text: string, mood?: HudPose | null, ms?: number, seat?: number): number | void;
  /** Koltuğun balonunu kapat (tok verilirse yalnız o yazı hâlâ görünüyorsa). Konuşma yöneticisi sesi kesince çağırır. */
  unsay?(seat: number, tok?: number): void;
  /** tok numaralı yazı en az ms daha görünsün (ses geç başladı). */
  holdSay?(seat: number, tok: number, ms: number): void;
  /** Hızlı sohbet düğmesi: göster / gizle */
  setChat?(on: boolean): void;
  /** Hızlı sohbet bekleme göstergesi (ms; 0 temizler) */
  chatCooldown?(ms: number): void;
  /** Hızlı sohbet düğmesine dokunuldu */
  onChat?: () => void;
  /** Yalnız yüz ifadesi (yaylı geçiş + küçük çizgi film vurgusu); ms sonra nötre döner */
  react(seat: number, pose: HudPose, ms?: number): void;
  /** Kalıcı temel hâl (ör. çok geride kalınca üzgün, el sonunda zafer); null = nötr */
  mood(seat: number, pose: HudPose | null): void;
  /** Pişti kutlaması: karakter büyük girer, damga + kuşanılmış efekt. Bitince çözülür. */
  pisti(o: HudPisti): Promise<void>;
  /** Zafer coşkusu: koltuğun rozetinden jeton + konfeti */
  cheer(seat: number): void;
  /** Seri: "SERİ x2" (koltuğun yanında) */
  combo(seat: number, n: number, x: number, y: number): void;
  /** Büyük vurgu yazısı (SÜPÜRDÜ!, SON KARTLAR) */
  shout(text: string, x: number, y: number, tone?: 'gold' | 'white' | 'blue'): void;
  banner(text: string, sub?: string, ms?: number): void;
  popScore(x: number, y: number, text: string, tone?: 'gold' | 'white' | 'blue'): void;
  /** El sonu sayımı: kart sayaçları, eşlide birleşme, çoğunluk +3 uçuşu. Bitince çözülür. */
  tally(o: HudTally): Promise<void>;
  setSounds(s: HudSounds | null): void;
  onMenu: () => void;
  /** Rakip rozetine dokunuldu (dürtme) */
  onPoke: (seat: number) => void;
  /** İsteğe bağlı (Blöf): masa düzeni — 'blof' rozetleri Blöf yerleşimine alır. Pişti çağırmaz. */
  setGame?(game: 'pisti' | 'blof'): void;
  /** İsteğe bağlı (Blöf): rozet yanar (elinde 1–2 kart kaldı). */
  alert?(seat: number, on: boolean): void;
}
