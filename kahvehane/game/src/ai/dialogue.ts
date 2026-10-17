// Kahvehane — seslendirilen BÜTÜN replikler (TEK KAYNAK): Pişti + Blöf + menü (galeri / market) + botlar arası atışma
// (banter) + hızlı sohbet (quick chat); replik seçimi (kalıcı tekrar önleme) + konuşma sıklığı.
//
// Bu dosya iki yerde çalışır:
//  1) Oyunda (Vite): pickLine / shouldSpeak / react / BlofTalk (blofDialogue.ts) / pickBanter / quickSay …
//  2) Seslendirme aracında (tools/voice/generate.mjs): Node 22 bu dosyayı tip ayıklamayla DOĞRUDAN import eder.
//     Bu yüzden: yalnızca "silinebilir" TS sözdizimi (enum / namespace / parametre özelliği YOK) ve çalışma
//     zamanında başka modül import edilmez (yalnızca `import type`).
//
// Satır biçimi: [no, tts, mood?, {text?, weight?, stab?, cd?}]. Kimlik = `${karakter}_${an}_${no}` ve ses dosyasının
// adıdır (henüz ses üretilmediği için numaralar serbest; ses üretildikten sonra numara DEĞİŞTİRMEYİN, yeni replik =
// yeni numara). `text` verilmezse balon yazısı tts'ten [ses etiketleri] silinerek çıkar. `mood` verilmezse anın
// varsayılan yüz ifadesi; `null` = yüz ifadesi yok. `stab` ElevenLabs v3 kararlılığı (0 Creative / 0.5 Natural /
// 1 Robust); verilmezse etiketlerden çıkarılır (stabilityFor). `cd` = tekrar beklemesi (el); verilmezse uzunluktan.
//
// SES / UZUNLUK KURALI (testlerle korunur):
//  · Sık, oyun içi anlar (yakalama, düşünme, bekleme): ≤ ~2,6 sn ya da yalnız ses (gülme, homurtu, "Hıh.").
//  · Uzun espri (≤ ~6 sn) yalnız oyunun zaten durduğu anlarda ve öncelik 3'te: el başı, pişti kutlaması, el sonu,
//    Blöf açılışı, galeri / market. Öncelik 3 olmayan anda > 3,2 sn replik yoktur (kesilmeden biter, ya da kibarca kesilir).
import type {Pose} from '../game/roster';

export type CharId = 'riza' | 'cem' | 'dursun' | 'defne';
export const CHAR_IDS: readonly CharId[] = ['riza', 'cem', 'dursun', 'defne'];

/** Pişti anları (match.ts yayınlar). */
export const MOMENTS = [
  'start', // el başladı
  'myTurnIdle', // oyuncu 9 sn'den uzun düşünüyor (rakip bekliyor)
  'botThinking', // bot hamle düşünüyor
  'botPisti',
  'botJackPisti',
  'playerPisti',
  'playerJackPisti',
  'botBigCapture', // bot büyük yığın aldı
  'playerBigCapture',
  'botJackCapture', // bot valeyle yığını aldı
  'playerJackCapture',
  'playerDumpedValuable', // oyuncu ♦10 / ♣2 / As'ı yığında bıraktı, bot aldı
  'botLuckyCapture', // botun şanslı alışı
  'lastRound', // son dağıtım
  'botLeading',
  'playerLeading',
  'comeback', // bot geriden gelip öne geçti
  'botWin',
  'playerWin',
  'draw',
  'playerFastThrow', // oyuncu kartı çok sert fırlattı (henüz yayınlanmıyor)
  'tableEmpty', // masa boş ve sıra botta
] as const;
export type Moment = (typeof MOMENTS)[number];

/** Menü anları (oyun dışı; bağlanması sonra): ilk açılış galerisi ve market. */
export const META_MOMENTS = [
  'galleryIntro', // ilk açılış galerisinde karakterin kartına gelince (2,5–6 sn kendini tanıtır)
  'shopPitch', // markette karakter önizlenirken (satış konuşması)
  'shopBought', // satın alınınca
  'shopPoor', // jeton yetmeyince (tatlı iğne + "bir el daha oyna")
] as const;
export type MetaMoment = (typeof META_MOMENTS)[number];

/** Blöf anları (blofMatch.ts yayınlar; kimlikte `blof` önekiyle: riza_blofCallOut_2). */
export const BLOF_MOMENTS = [
  'start', // el başladı
  'callOut', // bot "Blöf!" diyor (bağırış)
  'catchGloat', // bot yalanı yakaladı (başka botun)
  'catchPlayer', // bot, OYUNCUNUN yalanını yakaladı
  'caught', // botun yalanı başka botça yakalandı (ikincil tepki)
  'caughtByPlayer', // botun yalanını OYUNCU yakaladı
  'wrongCall', // bot boşa blöf dedi (yığını kendisi aldı)
  'survived', // bota blöf dendi ama doğruydu
  'survivedPlayer', // OYUNCU bota boşa blöf dedi
  'pass', // bot pas dedi
  'bigPile', // biri koca yığını aldı (izleyen bot)
  'nearWin', // bot bitirmeye yakın (1–2 kart)
  'playerNearWin', // oyuncu bitirmeye yakın
  'idle', // oyuncu uzun düşünüyor
  'botWin',
  'playerWin',
  'mateCheer', // eşli: ortak güzel iş yaptı
] as const;
export type BlofMoment = (typeof BLOF_MOMENTS)[number];
export type BlofKey = `blof${Capitalize<BlofMoment>}`;
export function blofKey(m: BlofMoment): BlofKey {
  return ('blof' + m.charAt(0).toUpperCase() + m.slice(1)) as BlofKey;
}

/**
 * El / maç sonu anları (Ara Skor + sonuç ekranı + rövanş; iki oyunda ortak, kimlik: riza_endGloat_1). Hepsi kısa (≤ ~3 sn)
 * ve oyun durmuşken söylenir; planEndTalk karşılıklı dizi (A söyler, B cevaplar, ara sıra C) kurar. Rol adları:
 *  end…   sonuç ekranı: Gloat (kazanan bot oyuncuya), Sulk (kaybeden bot oyuncuya), koşullu türevleri (Close kıl payı,
 *         Big ezici, Caught oyuncu çok yakalandı, Streak oyuncunun serisi, Pisti oyuncunun piştileri, Sly oyuncu hiç
 *         yakalanmadı, Last son kart blöfüyle bitirdi), Join… ikinci ses (başka bot / seyirci: Win = oyuncu kaybetti,
 *         Lose = oyuncu kazandı), Revenge rövanş çağrısı, Mate… oyuncunun bot ortağı ona ("ortak"), Foe… rakip takım
 *         bize, Duo… rakip takımın iki botu birbirine (A söyler, B cevaplar), Accept rövanş kabul (yeni maç başı),
 *         Bye oyuncu ana sayfaya dönerken veda.
 *  mid…   Ara Skor: Ahead (önde bot), Behind (geride bot), Side (nötr yorum), MateUp / MateDown (eşli ortak bize).
 */
export const END_MOMENTS = [
  'endGloat', 'endGloatClose', 'endGloatBig', 'endGloatCaught',
  'endSulk', 'endSulkClose', 'endSulkBig', 'endSulkStreak', 'endSulkPisti', 'endSulkSly', 'endSulkLast',
  'endJoinWin', 'endJoinLose', 'endRevenge',
  'endMateWin', 'endMateLose', 'endFoeWin', 'endFoeLose', 'endDuoWinA', 'endDuoWinB', 'endDuoLoseA', 'endDuoLoseB',
  'endAccept', 'endBye',
  'midAhead', 'midBehind', 'midSide', 'midMateUp', 'midMateDown',
] as const;
export type EndMoment = (typeof END_MOMENTS)[number];

/** El / maç sonu anlarının varsayılan yüz ifadesi. */
const END_MOOD: Readonly<Record<EndMoment, Pose | null>> = {
  endGloat: 'kahkaha', endGloatClose: 'zafer', endGloatBig: 'kahkaha', endGloatCaught: 'kirpma',
  endSulk: 'uzgun', endSulkClose: 'kizgin', endSulkBig: 'uzgun', endSulkStreak: 'saskin', endSulkPisti: 'saskin', endSulkSly: 'saskin', endSulkLast: 'saskin',
  endJoinWin: 'gulumseme', endJoinLose: 'kahkaha', endRevenge: 'kirpma',
  endMateWin: 'kahkaha', endMateLose: 'uzgun', endFoeWin: 'kahkaha', endFoeLose: 'uzgun',
  endDuoWinA: 'kahkaha', endDuoWinB: 'gulumseme', endDuoLoseA: 'kizgin', endDuoLoseB: 'saskin',
  endAccept: 'gulumseme', endBye: 'kirpma',
  midAhead: 'gulumseme', midBehind: 'dusunceli', midSide: 'kirpma', midMateUp: 'gulumseme', midMateDown: 'dusunceli',
};

/** Ses kimliğindeki an adı: Pişti, menü, Blöf (blofX), el/maç sonu, atışma, hızlı sohbet söyleyişi / cevabı. */
export type VoiceMoment = Moment | MetaMoment | BlofKey | EndMoment | 'banter' | 'quickSay' | 'quickReply';
export type Stab = 0 | 0.5 | 1;
export type Rel = 'mate' | 'opp';

export interface Line {
  id: string;
  /** Konuşma balonundaki yazı. */
  text: string;
  /** Yüz ifadesi (karakter pozu); null = yok. */
  mood?: Pose | null;
  /** ElevenLabs v3 metni: aynı cümle + köşeli parantezli ses etiketleri. */
  tts: string;
  /** Seçilme ağırlığı (varsayılan 1). */
  weight?: number;
  /** v3 kararlılığı (0 Creative, 0.5 Natural, 1 Robust); yoksa stabilityFor etiketlerden çıkarır. */
  stab?: Stab;
  /** Tekrar beklemesi (el sayısı); yoksa cooldownHands uzunluktan çıkarır. */
  cd?: number;
  /** Hızlı sohbet cevabı: yalnız ortağa (mate) / rakibe (opp) uygun; yoksa ikisi de. */
  rel?: Rel;
}

export interface LineRef extends Line {
  char: CharId;
  moment: VoiceMoment;
}

// ───────────────────────── yardımcılar ─────────────────────────

/** "[laughs] Pişti!  Çaylar…" → "Pişti! Çaylar…" */
export function stripTags(s: string): string {
  return s.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').replace(/\s+([!?.,…])/g, '$1').trim();
}

/** FNV-1a (32 bit, hex). Ses dosyasının hangi metinle üretildiğini manifestte izlemek için (oyun + araç aynı fonksiyon). */
export function ttsHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Karakterin yaklaşık konuşma hızı (harf+boşluk / sn): Rıza ağır, Defne ölçülü, Dursun gür, Cem hızlı. */
const CPS: Record<CharId, number> = {riza: 13, defne: 13, dursun: 14.5, cem: 16};

/** Tahmini konuşma süresi (sn): harfler / hız + gülme-iç çekme etiketleri + duraklar (…, —, cümle sonu). */
export function speechSeconds(char: string, tts: string): number {
  const speech = stripTags(tts);
  let s = speech.replace(/[^\p{L}\p{N} ]/gu, '').length / (CPS[char as CharId] ?? 14);
  for (const tag of tts.match(/\[[^\]]*\]/g) ?? []) s += /laugh/.test(tag) ? 0.6 : /chuckle|sigh|groan|gasp|scoff|clears|giggle/.test(tag) ? 0.3 : 0;
  s += (speech.match(/…/g)?.length ?? 0) * 0.35 + (speech.match(/—/g)?.length ?? 0) * 0.2 + (speech.match(/[.!?](?=\s+\S)/g)?.length ?? 0) * 0.2;
  return Math.round(s * 100) / 100;
}

const HOT_TAG = /\[(?:laughs[a-z ]*|shouting|shouts|excited|angry|frustrated|gasps|annoyed|appalled|giggles|surprised)\]/;

/** v3 kararlılığı: satırın kendi değeri; yoksa gülme/bağırma/heyecan → 0 (Creative), [deadpan] → 1 (Robust); diğerleri null (karakter ayarı). */
export function stabilityFor(l: Pick<Line, 'tts' | 'stab'>): Stab | null {
  if (l.stab !== undefined) return l.stab;
  if (HOT_TAG.test(l.tts)) return 0;
  if (l.tts.includes('[deadpan]')) return 1;
  return null;
}

/** Tekrar beklemesi (el): kısa ses / tek kelime hemen döner, orta cümle birkaç el, uzun espri ~25 el. */
export function cooldownHands(l: Pick<Line, 'tts' | 'cd'>): number {
  if (l.cd !== undefined) return l.cd;
  const n = stripTags(l.tts).length;
  return n <= 12 ? 0 : n <= 26 ? 3 : n <= 42 ? 10 : 25;
}

type Opt = {text?: string; weight?: number; stab?: Stab; cd?: number};
type Spec = [n: number, tts: string, mood?: Pose | null, opt?: Opt];
type Specs<M extends string> = Partial<Record<M, Spec[]>>;
interface CharSpec {
  /** Bu karakterde anın varsayılan yüz ifadesi (BASE_MOODS'u ezer). */
  moods?: Partial<Record<Moment | MetaMoment, Pose | null>>;
  lines: Specs<Moment | MetaMoment>;
  blof: Specs<BlofMoment>;
  /** El / maç sonu (Ara Skor, sonuç, rövanş, veda): kısa, karşılıklı dizilerde kullanılır. */
  end: Specs<EndMoment>;
}

const _ = undefined;
/** Yalnız ses (gülme, homurtu): sık anlarda daha çok seçilsin. */
const NV: Opt = {weight: 1.6};
const NV2: Opt = {weight: 2.2};
const T = (text: string, o?: Opt): Opt => ({...o, text});

/** Pişti / menü anlarının varsayılan yüz ifadesi. */
const BASE_MOODS: Partial<Record<Moment | MetaMoment, Pose | null>> = {
  start: 'gulumseme', botThinking: 'dusunceli', botPisti: 'kahkaha', botJackPisti: 'kahkaha', playerPisti: 'kizgin',
  playerJackPisti: 'saskin', botBigCapture: 'kahkaha', playerBigCapture: 'kizgin', botJackCapture: 'kirpma',
  playerJackCapture: 'saskin', playerDumpedValuable: 'kahkaha', botLuckyCapture: 'kirpma', lastRound: 'dusunceli',
  botLeading: 'gulumseme', playerLeading: 'dusunceli', comeback: 'zafer', botWin: 'kahkaha', playerWin: 'uzgun',
  draw: 'saskin', playerFastThrow: 'saskin', tableEmpty: 'dusunceli',
  galleryIntro: 'gulumseme', shopPitch: 'kirpma', shopBought: 'kahkaha', shopPoor: 'kirpma',
};

/** Blöf anının varsayılan yüz ifadesi. */
export const BLOF_MOOD: Readonly<Record<BlofMoment, Pose | null>> = {
  start: 'gulumseme', callOut: 'kizgin', catchGloat: 'kahkaha', catchPlayer: 'kahkaha', caught: 'uzgun',
  caughtByPlayer: 'saskin', wrongCall: 'saskin', survived: 'zafer', survivedPlayer: 'kahkaha', pass: null,
  bigPile: 'saskin', nearWin: 'gulumseme', playerNearWin: 'saskin', idle: 'dusunceli', botWin: 'zafer',
  playerWin: 'uzgun', mateCheer: 'kahkaha',
};

// ───────────────────────── RIZA AMCA ─────────────────────────
// 72, "eski toprak". Kırk yıllık usta; gri kasket, pala bıyık, kehribar tespih. Atasözü, "bizim zamanımızda",
// tavla (mars), çay, Dursun'a seslenme, Muhtar. Oyuncuya "evlat". Huysuz ama tatlı; ağır, tok konuşur.

const RIZA: CharSpec = {
  lines: {
    start: [
      [1, '[chuckles] Otur evlat. Çay demde, kağıt elde.'],
      [2, '[proudly] Kırk yıldır bu masa benden sorulur.'],
      [3, '[teasing] Bakalım bugün çaylar kimden?', 'kirpma'],
      [4, '[shouting] Dursun! İki çay… biri açık olsun!'],
      [5, '[chuckles] Bizim zamanımızda kart, bıyık burularak oynanırdı.', 'kirpma'],
      [7, '[chuckles] Kurt kocayınca ne olur? Ders verir!', 'kirpma'],
      [8, '[sighs] Bu masada kimler oturdu, kimler kalktı… sıra sende.'],
    ],
    botThinking: [
      [1, 'Hımm…', _, NV2],
      [2, '[clears throat] Öhö öhö…', _, NV],
      [3, '[chuckles] Heh heh…', _, NV],
      [4, '[sighs] Eh be…', _, NV],
      [5, '[grumbling] Hmm, hmm.', _, NV],
      [6, '[whispers] Sakla samanı, gelir zamanı…'],
      [8, 'Acele işe şeytan karışır…'],
      [9, "[whispers] Cem'in algoritması bunu bilmez…"],
      [10, '[whispers] Valeler gitti, aslar gitti…'],
      [11, '[sighs] Offf…', _, NV],
      [12, '[chuckles] Hı hı hı.', _, NV],
    ],
    myTurnIdle: [
      [1, '[grumbling] Kart atıyoruz, kız istemiyoruz!', 'kizgin', {weight: 1.2}],
      [2, '[sighs] Evlat… çayım buz kesti.', 'uzgun'],
      [3, '[clears throat] Öhöm! Öhöm!', 'kirpma', NV],
      [4, '[sighs] Offf…', 'uzgun', NV],
      [5, '[grumbling] Hıh!', 'kizgin', NV],
      [6, '[sighs] Hey gidi…', _, NV],
      [7, '[chuckles] Torunum askerden döndü evlat!', 'kirpma'],
      [9, '[annoyed] Satranç değil bu, pişti!', 'kizgin'],
      [10, '[chuckles] Düşünme evlat, kafan ağrır.', 'kirpma'],
      [11, '[sighs] Eh be…', _, NV],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Çaylar senden evlat!', _, {weight: 1.2}],
      [2, '[chuckles] Pişti. Ders bir, not al.'],
      [3, '[laughs] Pişti! Sakla samanı, gelir zamanı!'],
      [4, '[proudly] Pişti! Bu oyunu ben icat ettim!'],
      [5, '[laughs] Pişti! Dursun, yaz deftere!'],
      [6, '[chuckles] Pişti… Görünen köy kılavuz istemez.'],
      [7, '[laughs harder] Ha ha haa! Pişti!'],
      [8, '[chuckles] Pişti! Kırk yılda bir değil, her gün olur bu.'],
    ],
    botJackPisti: [
      [1, '[laughs harder] Vale pişti! Çerçeveletip asacağım!'],
      [2, '[laughs] Vale pişti! Çağırın muhtarı, mühürlesin!'],
      [3, '[excited] Yirmi puan! Hey gidi günler hey!'],
      [4, '[chuckles] Sabreden derviş… vale pişti yapar!'],
    ],
    playerPisti: [
      [1, '[groans] Hay aksi!', _, {weight: 1.3}],
      [2, '[sighs] Tesadüf… tesadüf.', 'uzgun'],
      [3, '[scoffs] Hıh! Acemi şansı.'],
      [4, '[grumbling] Gözüm çaya dalmıştı, saymaz!'],
      [5, '[surprised] Hoppala! Bana pişti ha?', 'saskin'],
      [6, '[grumbling] Gülme komşuna, gelir başına…'],
      [7, '[groans] Of of of…', _, NV],
      [8, '[grumbling] Bizim zamanımızda büyüğe pişti yapılmazdı!'],
    ],
    playerJackPisti: [
      [1, '[gasps] Vale pişti mi?! Olamaz!'],
      [2, '[surprised] Kim öğretti sana bunu evlat?!'],
      [3, '[sighs] Kırk yılda bir olur… o da bana.', 'uzgun'],
      [4, '[gasps] Yetiş Dursun! Vale pişti yedim!'],
    ],
    botBigCapture: [
      [1, '[laughs] Ha ha! Gel bakalım!', _, NV],
      [2, '[chuckles] Heh heh heh…', _, NV2],
      [3, '[chuckles] Hı hı hı.', _, NV],
      [4, '[laughs] Hah!', _, NV],
      [5, '[proudly] Hı hı… usta işi.', _, NV],
      [6, '[chuckles] Damlaya damlaya göl olur.'],
      [7, '[teasing] Hasat zamanı evlat.'],
      [8, '[laughs] Gel gel gel, hepsi bana!'],
      [9, "[chuckles] Dursun'a iş kalmadı."],
      [11, '[laughs harder] Ha ha ha ha!', _, NV],
      [12, '[chuckles] Heh heh…', _, NV],
    ],
    playerBigCapture: [
      [1, '[grumbling] Hıh!', _, NV2],
      [2, '[groans] Of…', _, NV],
      [3, '[sighs] Hay Allah…', _, NV],
      [4, '[scoffs] Pöh!', _, NV],
      [5, '[groans] Tüh tüh tüh!', _, NV],
      [6, '[sighs] Afiyet olsun… şimdilik.', 'uzgun'],
      [7, '[sarcastic] Faraş da ister misin?'],
      [9, '[scoffs] Bir çiçekle bahar olmaz.'],
      [10, '[groans] Emekli maaşım gitti!'],
      [11, '[groans] Of of of…', _, NV],
    ],
    botJackCapture: [
      [1, '[chuckles] Heh heh…', _, NV],
      [2, '[laughs] Hah!', _, NV],
      [3, '[clears throat] Öhöm.', 'kirpma', NV],
      [4, '[chuckles] Hı hı hı.', _, NV],
      [5, '[chuckles] Heh heh heh…', _, NV],
      [6, '[chuckles] Vale her kapıyı açar.'],
      [8, '[laughs] Vale geldi, masa gitti!'],
      [9, '[proudly] Valeyi sona sakla demiştim.'],
      [10, '[chuckles] Eski kurt, eski numara.'],
      [11, '[laughs harder] Ha ha ha ha!', _, NV],
    ],
    playerJackCapture: [
      [1, '[grumbling] Hıh! Tilki…', 'kizgin', NV],
      [2, '[surprised] Vay vay…', _, NV],
      [3, '[sighs] Hay Allah…', 'uzgun', NV],
      [4, '[groans] Tüh tüh tüh!', _, NV],
      [5, '[gasps] Hoppala!', _, NV],
      [6, 'Valeyi saklıyordun demek…'],
      [7, '[grumbling] Bu numarayı benden öğrendin.', 'kizgin'],
      [8, '[surprised] Vay tilki vay!'],
      [10, '[grumbling] Bana da bırakaydın bari!', 'kizgin'],
      [11, '[scoffs] Pöh!', _, NV],
    ],
    playerDumpedValuable: [
      [1, '[laughs harder] Ha ha ha ha!', _, NV2],
      [2, '[laughs] Hah!', _, NV],
      [3, '[chuckles] Heh heh heh…', _, NV],
      [4, '[chuckles] Hı hı hı.', _, NV],
      [6, '[laughs] Hangi dağda kurt öldü?'],
      [7, '[chuckles] Ak akçe kara gün içindir.'],
      [8, '[chuckles] Kırk yıl hatırı var bunun!'],
      [9, '[chuckles] Bayram değil seyran değil…'],
      [10, '[teasing] Ben almasam ayıp olurdu.'],
      [11, '[chuckles] Heh heh…', _, NV],
    ],
    tableEmpty: [
      [1, 'Masa tertemiz… ne atsak?'],
      [2, '[clears throat] Boş masaya kart atmak sanattır.'],
    ],
    botLuckyCapture: [
      [1, '[chuckles] Şans da ustayı sever.'],
      [3, '[whispers] Planladım diyeceğim, inan.'],
    ],
    lastRound: [
      [1, 'Son eller… gözünü dört aç.'],
      [2, '[teasing] Son dağıtım. Kartlar kafamda.', 'kirpma'],
      [3, 'Hesap günü geldi evlat.'],
    ],
    botLeading: [
      [1, '[chuckles] Skora bakma evlat, üzülürsün.'],
      [2, '[proudly] Dursun, gel bak! Ders veriyorum.'],
    ],
    playerLeading: [
      [1, 'Acele etme, maç doksan dakika.'],
      [2, '[grumbling] Dereyi görmeden paçaları sıvama!'],
    ],
    comeback: [
      [1, '[laughs] Kurt kocadı sandın, değil mi?'],
      [2, '[excited] Döndük mü? Döndük!'],
    ],
    botWin: [
      [1, '[chuckles] Ustaya saygı delikanlı. Bir el daha?'],
      [2, '[laughs] Çaylar senden, unutma!'],
      [3, '[laughs] Tavlada olsa mars derdik, evlat!'],
      [4, '[chuckles] Yarın yine gel, dersler ücretsiz.'],
      [5, '[excited] Duyduk duymadık demeyin, Rıza kazandı!'],
      [6, '[chuckles] Üzülme evlat. Ben de ilk kırk yıl kaybettim.'],
      [7, '[laughs] Genç hızlı koşar, ihtiyar kestirmeyi bilir!'],
    ],
    playerWin: [
      [1, '[sighs] Helal olsun aslanım… hakkını verdin.'],
      [2, '[grumbling] Gözlüğümü evde unuttum, ondan!', 'kizgin'],
      [3, '[whispers] Soran olursa berabere bitti.', 'saskin'],
      [4, '[sighs] Çaylar benden. Dursun… iki çay.'],
      [5, '[sighs] Eski çamlar bardak oldu evlat…'],
      [6, '[grumbling] Rövanş! Rövanşsız kalkılmaz.', 'kizgin'],
      [7, '[chuckles] Talebe hocayı geçti… göğsüm kabardı.', 'gulumseme'],
    ],
    draw: [
      [1, '[chuckles] Berabere! Çaylar ortadan.'],
      [2, '[chuckles] Ne sen yendin ne ben… bir el daha!'],
      [3, '[grumbling] Berabere mi? Hakem nerede?'],
    ],
    galleryIntro: [
      [1, '[chuckles] Kırk yıllık usta Rıza Amca… seç beni, sırlarımı vereyim.'],
      [2, '[proudly] Eski toprak derler bana… ne kırılırım, ne kaybederim!'],
    ],
    shopPitch: [
      [1, '[chuckles] Kırk yıllık usta, bu fiyata? Kelepir evlat!'],
      [2, '[laughs] Beni al evlat, bıyık hediye!'],
      [3, '[proudly] Pazarlık yok. Ustalık indirime girmez.'],
    ],
    shopBought: [
      [1, '[laughs] Hayırlı olsun! Bıyık da senin artık!'],
      [2, '[proudly] Usta artık senin yanında. Hadi, masaya!'],
    ],
    shopPoor: [
      [1, '[grumbling] Ustalık veresiye olmaz evlat!'],
    ],
  },
  blof: {
    start: [
      [1, '[chuckles] Yalancının mumu yatsıya kadar yanar evlat.'],
      [2, 'Gözümün içine bak. Yalanı buradan okurum.'],
    ],
    callOut: [
      [1, '[shouting] Blöf! Aç bakalım!'],
      [2, '[shouting] Yalan! Aç şunları!'],
      [3, '[annoyed] Hop! Dur orada! Blöf!'],
      [4, '[shouting] Blöf! Bıyığım titredi!'],
    ],
    catchGloat: [
      [1, '[laughs] Hah! Yakaladım!'],
      [2, '[chuckles] Kırk yıllık göz yanılmaz.'],
    ],
    catchPlayer: [
      [1, '[laughs] Hah! Mum yatsıya kadarmış evlat!'],
      [2, '[laughs harder] Ha ha haa! Yüzün kızardı!'],
      [4, "[chuckles] Kırk yıllık Rıza'yı mı kandıracaksın?"],
      [5, '[chuckles] Evlat, yalan bıyık altından söylenir. Sende bıyık yok!'],
    ],
    caught: [
      [1, '[groans] Eh be… yakalandık.'],
      [2, '[sighs] Hay aksi! Yaşlandık galiba.'],
    ],
    caughtByPlayer: [
      [1, '[surprised] Vay vay… beni yakaladın ha?'],
      [2, '[chuckles] Aferin evlat, gözün keskin.'],
      [3, '[sighs] Tilki sonunda kürkçüye gelirmiş… geldim.'],
    ],
    wrongCall: [
      [1, '[groans] Hay aksi… doğruymuş.'],
      [2, '[sighs] Çok bilen çok yanılır.'],
    ],
    survived: [
      [1, '[proudly] Ben yalan söylemem evlat!'],
      [2, "[laughs] Rıza Amca'nın sözü senettir!"],
    ],
    survivedPlayer: [
      [1, '[laughs] Doğruydu evlat! Afiyet olsun!'],
      [2, '[proudly] Rıza Amca yalan söyler mi hiç?'],
    ],
    pass: [
      [1, '[grumbling] Pas.'],
      [2, '[chuckles] Pas evlat.'],
      [3, '[sighs] Bu sefer pas.'],
    ],
    bigPile: [
      [1, '[chuckles] Vay, koca yığın gitti!'],
      [2, '[laughs] Ayağını yorganına göre uzat!'],
    ],
    nearWin: [
      [1, '[chuckles] Az kaldı evlat, az!'],
      [2, '[teasing] Son kartlar… çayını hazırla.'],
    ],
    playerNearWin: [
      [1, '[annoyed] Dur bakalım, acele etme!'],
      [2, '[whispers] Bitirecek… durdurun şunu!'],
    ],
    idle: [
      [1, '[sighs] Hadi evlat, çayım soğudu.'],
      [2, '[grumbling] Düşündükçe yalan belli olur!'],
    ],
    botWin: [
      [1, "[laughs] Bitti! Rıza'ya blöf yapılmaz!"],
      [3, '[laughs] Yalancının mumu söndü! Hadi, çayları söyle.'],
    ],
    playerWin: [
      [1, '[sighs] Helal olsun evlat, iyi oynadın.'],
      [2, '[chuckles] Yalanı da doğruyu da öğrenmişsin!'],
    ],
    mateCheer: [
      [1, '[laughs] Aferin ortak!'],
      [2, '[proudly] İşte benim ortağım!'],
    ],
  },
  end: {
    endGloat: [
      [1, '[chuckles] Ders bitti evlat. Çaylar senden.'],
      [2, '[proudly] Usta yine usta. Not al evlat.'],
    ],
    endGloatClose: [[1, '[chuckles] Kıl payı evlat… ama pay benim.']],
    endGloatBig: [[1, '[laughs] Bu maç değil, ders kitabıydı!']],
    endGloatCaught: [[1, '[chuckles] Her yalanında bıyığım titredi evlat.']],
    endSulk: [
      [1, '[grumbling] Gözlüğü değiştireceğim, o kadar.', 'kizgin'],
      [2, '[sighs] Eh… kırk yılda bir olur, oldu.'],
    ],
    endSulkClose: [[1, '[grumbling] Bir el daha olsa dönerdim!']],
    endSulkBig: [[1, '[sighs] Bu ne hız evlat? Nefes aldırmadın.']],
    endSulkStreak: [[1, '[grumbling] Bu kaçıncı evlat? Tespih yetmiyor!']],
    endSulkPisti: [[1, '[groans] Bu ne pişti! Muhtara yazacağım.']],
    endSulkSly: [[1, '[surprised] Bu yalanları kimden öğrendin evlat?']],
    endSulkLast: [[1, '[gasps] Son kart da mı yalandı?! Pes!']],
    endJoinWin: [
      [1, '[chuckles] Üzülme evlat, kaybetmek de öğretir.'],
      [2, '[scoffs] Bir kere kazandı, havaya girdi!', 'kirpma'],
      [3, '[chuckles] Evlat, sabreden derviş muradına erer.'],
    ],
    endJoinLose: [
      [1, '[proudly] Aferin evlat! Bıyık bile alkışlıyor.'],
      [2, '[chuckles] Bahane hazır, çay da hazır!', 'kirpma'],
      [3, '[laughs] Ders verdin evlat, ders!'],
    ],
    endRevenge: [
      [1, '[clears throat] Bir el daha, evlat. Çay tazelendi.'],
      [2, '[chuckles] Rövanşa var mısın evlat?'],
    ],
    endMateWin: [
      [1, '[laughs] Ortak, bu masa artık bizim!'],
      [2, '[proudly] Ortaklık dediğin böyle olur evlat.', 'zafer'],
    ],
    endMateLose: [
      [1, '[sighs] Ortak, bu akşam çaylar bizden.'],
      [2, '[grumbling] Ortak, bir dahakine beni dinle!', 'kizgin'],
    ],
    endFoeWin: [
      [1, '[chuckles] İki kişi bir ustayı yenemedi!', 'kirpma'],
      [2, '[laughs] Ortaklık güzel, ustalık başka!'],
    ],
    endFoeLose: [
      [1, '[grumbling] İkiniz bir oldunuz, ayıp ettiniz!', 'kizgin'],
      [2, '[sighs] Helal size… bu seferlik.'],
    ],
    endDuoWinA: [[1, '[proudly] Ortak, kırk yılın hatırına çak!']],
    endDuoWinB: [[1, '[chuckles] Ortak, ders bitti, çay vakti!']],
    endDuoLoseA: [[1, '[grumbling] Ortak, kartları uyuttun bu el!']],
    endDuoLoseB: [[1, '[grumbling] Bana bakma, kartlar bana küstü!']],
    endAccept: [
      [1, '[chuckles] Geldin mi yine? Otur evlat.'],
      [2, '[proudly] Rövanş kabul evlat!'],
    ],
    endBye: [
      [1, '[chuckles] Kaçma evlat, kaçma! Yarın gel.'],
      [2, '[sighs] Git bakalım… masa burada.', 'uzgun'],
    ],
    midAhead: [[1, '[chuckles] Isınma turuydu evlat, asıl şimdi.']],
    midBehind: [[1, '[grumbling] Daha bitmedi! Kurt sabırlıdır.']],
    midSide: [
      [1, '[chuckles] Maç yeni ısınıyor, çaylar tazelensin.'],
      [2, '[sighs] Hesap sonra görülür, sonra.', 'dusunceli'],
    ],
    midMateUp: [[1, '[proudly] Ortak, iyi gidiyoruz. Bozma!']],
    midMateDown: [[1, '[whispers] Ortak, toparlanıyoruz. Bana güven.']],
  },
};

// ───────────────────────── KAHVECİ DURSUN ─────────────────────────
// 55, kahvenin sahibi; masanın komedyeni. Gür, sıcak, göbekten güler. Çay, tepsi, defter (kalem kulağında),
// dedikodu ("aramızda kalsın"), ikram ("müessesenin ikramı"), veresiye. "Kardeşim". Kaybedince de güler.

const DURSUN: CharSpec = {
  moods: {playerPisti: 'saskin', playerBigCapture: 'saskin', playerWin: 'gulumseme', botJackCapture: 'kahkaha'},
  lines: {
    start: [
      [1, 'Hoş geldin! Çaylar benden, oyun sizden!'],
      [2, '[laughs] Otur bakalım, tavşan kanı çaylar geliyor!'],
      [4, '[whispers] Aramızda kalsın… bugün şanslıyım!', 'kirpma'],
      [5, '[laughs] Hoş geldin! Kartlar sıcak, çaylar sıcak!'],
      [6, '[chuckles] Defter açık, kalem kulağımda. Hadi bakalım!'],
      [7, '[laughs] Bu masada kaybeden çay ısmarlar… yani hep ben!'],
      [8, '[whispers] Rıza Amca dün bana yenildi. Kimseye söyleme!', 'kirpma'],
    ],
    botThinking: [
      [1, 'Hımm… hımm.', _, NV2],
      [2, '[chuckles] Hı hı hı!', _, NV],
      [3, '[clears throat] Öhö öhö!', _, NV],
      [4, '[chuckles] Heh heh…', _, NV],
      [5, 'Eee…', _, NV],
      [6, 'Kartlarına bir baksam… yok, ayıp!', 'kirpma'],
      [7, 'Çay mı koysam, kart mı atsam…'],
      [8, '[whispers] Aramızda kalsın, bu kart iyi.', 'kirpma'],
      [9, "[whispers] Rıza Amca'ya sorsam mı? Yok, kızar."],
      [11, '[sighs] Ooof…', _, NV],
    ],
    myTurnIdle: [
      [1, '[chuckles] Çay soğuyor, kart soğuyor!'],
      [2, '[laughs] Hadi, müşteri bekliyor!'],
      [3, '[sighs] Bu arada üç masaya çay götürdüm!'],
      [4, '[clears throat] Öhöm! Kardeşim?', 'kirpma', NV],
      [5, '[sighs] Ooof…', _, NV],
      [6, '[laughs] Hadi hadi hadi!', _, NV],
      [7, '[chuckles] Hey, kardeşim?', _, NV],
      [9, '[laughs] Düşünmek bedava, çay paralı!', 'kirpma'],
      [10, '[whispers] Rıza Amca bile bu kadar düşünmez!', 'kirpma'],
      [11, '[chuckles] Heh heh…', _, NV],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Müessesenin ikramı!', _, {weight: 1.2}],
      [2, '[laughs] Pişti! Hesap ödendi, bahşiş bırakma!'],
      [3, '[excited] Pişti! Demi tam kıvamında!'],
      [4, '[laughs] Pişti! Mahalle bunu benden duyacak!'],
      [5, '[laughs] Pişti! Şekerini kaç alırsın, kardeşim?'],
      [6, '[excited] Pişti! Tepsiyle servis ettim!'],
      [7, '[laughs heartily] Ho ho hoo! Pişti!'],
      [8, '[laughs] Pişti! Duyan berber dükkânı kapatır, koşar gelir!'],
    ],
    botJackPisti: [
      [1, '[laughs harder] Vale pişti! Bütün kahveye çay benden!'],
      [2, '[excited] Vale pişti! Davul zurna getirin!'],
      [3, '[laughs] Vale pişti! Deftere sığmaz, duvara yazın!'],
      [4, '[laughs] Yirmi puan! Bu akşam simitler benden!'],
    ],
    playerPisti: [
      [1, '[gasps] Vay! Dur, ocağı kısayım da izleyeyim!'],
      [2, '[laughs] Helal olsun! Bu pişti bedava çay eder!', 'kahkaha'],
      [3, '[whispers] Rıza Amca görmesin, kıskanır!', 'kirpma'],
      [4, '[surprised] Vay vay vay! Tepsi elimden kayıyordu!'],
      [5, '[laughs] Ha ha! Yakaladın beni kardeşim!', 'kahkaha'],
      [6, '[groans] Ah! Çayım birden acı oldu!', 'kizgin'],
      [7, '[laughs] Haha! Aferin!', 'kahkaha', NV],
      [8, '[gasps] Hoppala!', _, NV],
    ],
    playerJackPisti: [
      [1, '[gasps] Vale pişti! Rıza Amca duymasın!'],
      [2, '[laughs] Vale pişti! Fotoğrafını duvara asıyorum!', 'kahkaha'],
      [3, '[surprised] Yirmi puan mı?! Kalem elimden düştü!'],
      [4, '[whispers] Bunu bütün mahalleye anlatacağım…', 'kirpma'],
    ],
    botBigCapture: [
      [1, '[laughs heartily] Ho ho ho!', _, NV2],
      [2, '[chuckles] Hı hı hı!', _, NV],
      [3, '[excited] Ohooo!', _, NV],
      [4, '[laughs] Hah! Gel bakalım!', _, NV],
      [5, '[laughs] Hoppaa!', _, NV],
      [6, '[laughs] Tepsi doldu!'],
      [7, '[laughs] Gel gel gel! Hepsi ocağa!'],
      [8, '[excited] Toplu sipariş geldi!'],
      [10, '[chuckles] Bunlar da deftere!'],
      [11, '[laughs] Ha ha ha!', _, NV],
      [12, '[chuckles] Heh heh…', _, NV],
    ],
    playerBigCapture: [
      [1, '[gasps] Vay vay vay!', _, NV2],
      [2, '[groans] Eyvah!', _, NV],
      [3, '[laughs] Ha ha! Maşallah!', 'kahkaha', NV],
      [4, '[groans] Ah ah ah!', 'uzgun', NV],
      [5, '[gasps] Aman aman!', _, NV],
      [6, '[laughs] Bezime iş bırakmadın!', 'kahkaha'],
      [7, '[groans] Hoppala! Tepsiyi boşalttın!'],
      [9, '[grumbling] Bu masa bana küs galiba.', 'kizgin'],
      [10, '[laughs] Biraz da bana bırak!', 'kahkaha'],
      [11, '[sighs] Ooof…', _, NV],
    ],
    botJackCapture: [
      [1, '[chuckles] Heh heh…', _, NV],
      [2, '[laughs] Hah!', _, NV],
      [3, '[chuckles] Hı hı hı!', _, NV],
      [4, '[laughs heartily] Ho ho ho!', _, NV],
      [5, '[excited] Ohooo!', _, NV],
      [6, '[laughs] Vale geldi, hesap kapandı!'],
      [7, '[chuckles] Valeyi tabağa saklamıştım!'],
      [8, '[laughs] Kapı açıldı, buyurun!'],
      [9, '[teasing] Vale benim garsonum!'],
      [11, '[laughs] Hoppaa!', _, NV],
    ],
    playerJackCapture: [
      [1, '[gasps] Aman aman!', _, NV],
      [2, '[gasps] Vay vay vay!', _, NV],
      [3, '[sighs] Eh be kardeşim…', 'uzgun', NV],
      [4, '[laughs] Ha ha… olsun!', 'kahkaha', NV],
      [5, '[groans] Eyvah!', _, NV],
      [6, '[surprised] Valeyi nereden çıkardın?'],
      [7, '[laughs] Sen de mi vale saklıyorsun?', 'kahkaha'],
      [8, '[grumbling] Tamam tamam, deftere yazdım.', 'kizgin'],
      [9, '[whispers] Sende kaç vale var, söyle!', 'kirpma'],
      [11, '[groans] Ah ah ah!', _, NV],
    ],
    playerDumpedValuable: [
      [1, '[laughs] Ha ha ha!', _, NV2],
      [2, '[laughs] Hah!', _, NV],
      [3, '[chuckles] Heh heh…', _, NV],
      [4, '[excited] Ohooo!', _, NV],
      [5, '[laughs] İkramın için teşekkürler!'],
      [6, '[chuckles] Onu bırakmazdın ama… neyse.'],
      [7, '[laughs] Bahşiş mi bu? Sağ ol!'],
      [8, '[whispers] Kimseye söylemem… ama komikti!', 'kirpma'],
      [9, '[laughs] İkram bizim işimiz, sen de mi?'],
      [11, '[laughs heartily] Ho ho ho!', _, NV],
    ],
    tableEmpty: [
      [1, 'Boş masa… bir çay koysam?'],
      [2, '[chuckles] Masa da cüzdanım gibi, bomboş!'],
    ],
    botLuckyCapture: [
      [1, '[chuckles] Kahvecinin duası tuttu!'],
      [2, '[laughs] Şans bugün benim masamda!'],
    ],
    lastRound: [
      [1, '[excited] Son el! Çaylar tazelensin!'],
      [2, '[whispers] Son dağıtım… tepsi titriyor.'],
      [3, '[laughs] Son el! Kaybeden bulaşık yıkar!'],
    ],
    botLeading: [
      [1, '[chuckles] Defterde ben öndeyim!'],
      [2, '[laughs] Kahveci önde, müşteri arkada!'],
    ],
    playerLeading: [
      [1, '[laughs] Maşallah! Nazar boncuğu lazım sana!', 'kahkaha'],
      [2, '[sighs] Çaylar benden… zaten benden!', 'gulumseme'],
    ],
    comeback: [
      [1, '[excited] Döndük! Dursun geri döndü!'],
      [2, '[laughs] Ho ho! Ocak yeniden yandı!'],
    ],
    botWin: [
      [1, '[laughs heartily] Kazandım! Çaylar yine benden!'],
      [2, '[laughs] Ev sahibi kazandı! Kimse alınmasın!'],
      [3, '[chuckles] Teselli çayın hazır… şekerli mi?'],
      [5, '[laughs] Kazandım! Herkese çay, benim hesabıma!'],
      [6, '[laughs] Kazandım ama sır olarak kalsın… yarın bütün mahalle bilir!'],
      [7, '[chuckles] Kahvede kaybetmek ayıp değil, çaysız kalmak ayıp!'],
      [8, '[laughs] Hah! Tepsiyi taşıyan el, kartı da taşır!'],
    ],
    playerWin: [
      [1, '[laughs] Tebrikler! Adın mahallede dolaşacak!', 'kahkaha'],
      [2, '[sighs] Eh… müşteri her zaman haklıdır!'],
      [3, 'Helal olsun! Adını defterin başına yazdım!'],
      [4, '[laughs] Kaybettim ama çaylar yine benden!', 'kahkaha'],
      [5, "[whispers] Rıza Amca'ya söylemeyelim, üzülür…", 'kirpma'],
      [7, '[laughs] Bravo! Bu akşam çaylar senin şerefine!', 'kahkaha'],
      [8, '[chuckles] Yenildim ama gönlüm zengin.'],
    ],
    draw: [
      [1, '[chuckles] Berabere! Yeni çay demleyelim.'],
      [2, '[laughs] Berabere! Ne kazanan var ne çay parası!'],
      [3, '[laughs] Hakem ben olsam ikinize de çay verirdim!'],
    ],
    galleryIntro: [
      [1, '[excited] Ben Dursun! Kahve benim, çay benden, kahkaha bedava!'],
      [2, '[whispers] Beni seç… [laughs] bütün mahallenin dedikodusu bende!'],
    ],
    shopPitch: [
      [1, '[laughs heartily] Beni alana ömür boyu çay bedava!'],
      [2, '[whispers] Sana özel fiyat! Herkese de aynı ama… şşt!'],
      [3, '[laughs] Gülmezsen paran iade! Şaka şaka, iade yok!'],
    ],
    shopBought: [
      [1, '[laughs] Hayırlı olsun! Çaylar benden, ömür boyu!'],
      [2, '[excited] Oh be! Bu satışı bütün mahalle duyacak!'],
    ],
    shopPoor: [
      [1, '[laughs] Veresiye defteri doldu, kardeşim!'],
    ],
  },
  blof: {
    start: [
      [1, '[laughs] Çaylar benden, yalanlar sizden!'],
      [2, '[teasing] Bu masada blöf yapanın çayı acı olur!'],
    ],
    callOut: [
      [1, '[shouting] Blöf! Kokusu geldi!'],
      [2, '[shouting] Hop hop! Aç şunları!'],
      [3, '[shouting] Blöf! Ocaktan gördüm!'],
      [4, '[excited] Blöf! Burnum yanılmaz!'],
    ],
    catchGloat: [
      [1, '[laughs] Hah! Ben demiştim!'],
      [2, '[laughs] Yakalandın, çaylar senden!'],
    ],
    catchPlayer: [
      [1, '[laughs heartily] Hah! Yakaladım seni!'],
      [2, '[laughs] Yalanın demi kaçmış, kardeşim!'],
      [3, '[laughs] Ha ha! Bunu berbere anlatacağım!'],
      [5, '[laughs] Otuz yıldır "yarın öderim" diyenleri dinliyorum, kardeşim!'],
    ],
    caught: [
      [1, '[laughs] Hay aksi! Yakalandık!'],
      [2, '[groans] Of! Kızardım mı? Kızardım!'],
    ],
    caughtByPlayer: [
      [1, '[gasps] Vay! Nasıl anladın?'],
      [2, '[laughs] Çay bardağına yansıdı herhalde!'],
      [3, '[whispers] Aramızda kalsın, olur mu?'],
    ],
    wrongCall: [
      [1, '[groans] Hay Allah! Doğruymuş!'],
      [2, '[laughs] Tüh, demlenmeden döktüm!'],
    ],
    survived: [
      [1, '[laughs] Doğruydu! Afiyet olsun yığın!'],
      [2, '[proudly] Ben dürüst adamım!'],
    ],
    survivedPlayer: [
      [1, '[chuckles] Bana güvenmedin ha? Al yığını!'],
      [2, '[laughs] Dürüst kahveci, dürüst kart!'],
    ],
    pass: [
      [1, '[chuckles] Pas.'],
      [2, 'Pas geçiyorum.'],
      [3, '[chuckles] Pas, çayımı içeyim.'],
    ],
    bigPile: [
      [1, '[gasps] Vay, bu yığın taşınmaz!'],
      [2, '[laughs] Tepsi bile taşımaz bunu!'],
    ],
    nearWin: [
      [1, '[excited] Az kaldı! Çaylar hazır olsun!'],
      [2, '[whispers] Son kartlar… terledim.'],
    ],
    playerNearWin: [
      [1, '[excited] Bitirecek, tutun onu!'],
      [2, '[laughs] Biri buna çay versin, oyalansın!'],
    ],
    idle: [
      [1, '[chuckles] Çay soğuyor, at hadi!'],
      [2, '[whispers] Yalan mı kuruyorsun? Görmedim!'],
    ],
    botWin: [
      [1, '[laughs] Bitti! Çaylar benden, gönülden!'],
      [3, '[laughs] Kazandım! Yalan da benden, çay da benden!'],
    ],
    playerWin: [
      [1, '[laughs] Helal olsun! Çay benden!'],
      [2, '[laughs] Bir el daha, hadi! Çaylar tazelendi!'],
    ],
    mateCheer: [
      [1, '[laughs] Oh be! Helal ortak!'],
      [2, '[excited] Yaz defterine bunu!'],
    ],
  },
  end: {
    endGloat: [
      [1, '[laughs] Bulaşıklar senden kardeşim!'],
      [2, '[chuckles] Hesabı deftere yazdım, hayırlı olsun!', 'kirpma'],
    ],
    endGloatClose: [[1, '[laughs] Kıl payı! Tam kıvamında maç!']],
    endGloatBig: [[1, '[laughs heartily] Ho ho! Bu maç mahalleye anlatılır!']],
    endGloatCaught: [[1, '[laughs] Yalanın çay bardağından belliydi!']],
    endSulk: [
      [1, '[laughs] Kaybettim ama müessese kazandı!', 'kahkaha'],
      [2, '[sighs] Eh… müşteri velinimettir, kazansın.', 'gulumseme'],
    ],
    endSulkClose: [[1, '[groans] Bir çay farkıyla kaçtı be!']],
    endSulkBig: [[1, '[laughs] Tepsiyi de al bari, kardeşim!', 'kahkaha']],
    endSulkStreak: [[1, '[gasps] Yine mi? Defterde sayfa kalmadı!']],
    endSulkPisti: [[1, '[laughs] Pişti makinesi! Berber duymalı!', 'kahkaha']],
    endSulkSly: [[1, '[gasps] Bu kadar yalan, hiç yakalanmadın!']],
    endSulkLast: [[1, '[gasps] Son kart da yalan mıydı? Vay!']],
    endJoinWin: [
      [1, '[chuckles] Üzülme kardeşim, çayın benden!'],
      [2, '[whispers] Aramızda kalsın, o hep böyle böbürlenir.', 'kirpma'],
      [3, '[laughs] Alışırsın kardeşim, ben alıştım!', 'kahkaha'],
    ],
    endJoinLose: [
      [1, '[laughs] Helal! Bu zafere çay içilir!'],
      [2, '[laughs] Bahane mi arıyorsun? Defterde yok!'],
      [3, '[excited] Mahalle bunu duyacak, kardeşim!'],
    ],
    endRevenge: [
      [1, '[laughs] Rövanş! Ocak yanıyor, kaçmak yok!'],
      [2, '[chuckles] Bir el daha atalım mı kardeşim?'],
    ],
    endMateWin: [
      [1, '[laughs] Ortak, çak! Simitler benden!'],
      [2, '[excited] Ortak, sen olmasan tepsi devrilirdi!'],
    ],
    endMateLose: [
      [1, '[sighs] Ortak, bulaşıkları beraber yıkarız.'],
      [2, '[chuckles] Boş ver ortak, ocak yine yanar.', 'gulumseme'],
    ],
    endFoeWin: [
      [1, '[laughs] Ortaklar, hesap masada!'],
      [2, '[chuckles] İkinize birer teselli çayı!', 'kirpma'],
    ],
    endFoeLose: [
      [1, '[laughs] Siz ikiniz kahveyi batıracaksınız!', 'kahkaha'],
      [2, '[sighs] Helal size, çaylar benden yine.', 'gulumseme'],
    ],
    endDuoWinA: [[1, '[excited] Ortak, bu zafere çay demliyorum!']],
    endDuoWinB: [[1, '[laughs] Ortak, gel sarılalım!', 'kahkaha']],
    endDuoLoseA: [[1, '[groans] Ortak, tepsiyi elimden düşürdün!']],
    endDuoLoseB: [[1, '[laughs] Ben mi? Ben ikram ettim sadece!', 'kahkaha']],
    endAccept: [
      [1, '[laughs] Geri geldin! Çayın hazır kardeşim.'],
      [2, '[excited] Rövanş başlasın! Defter açık!'],
    ],
    endBye: [
      [1, '[laughs] Yine bekleriz! Çaylar sıcak kalır.', 'gulumseme'],
      [2, '[chuckles] Güle güle kardeşim, veresiye yok!'],
    ],
    midAhead: [[1, '[laughs] Ocak harlı, ben öndeyim!']],
    midBehind: [[1, '[sighs] Çay demleniyor, ben de demleniyorum.']],
    midSide: [
      [1, '[excited] Maç kızışıyor! Çay koyayım mı?', 'gulumseme'],
      [2, '[whispers] Aramızda kalsın, bu maç uzar.'],
    ],
    midMateUp: [[1, '[chuckles] Ortak, böyle devam, simitler yolda!']],
    midMateDown: [[1, '[whispers] Ortak, ocağı biraz açalım.']],
  },
};

// ───────────────────────── CEM ─────────────────────────
// 22, üniversiteli (bilgisayar müh.). Z kuşağı: kanka, aga, bro, efsane, cringe, flex, red flag, aura, "of ya",
// "çok iyi ya", yayın / chat / story / klip / ekran görüntüsü; ara sıra istatistik böbürlenmesi. Hızlı, kendinden
// emin ama sevimli. İngilizce sözcükler tts'te Türk ağzıyla yazılır (krinç, fleks, ci ci), balonda doğru yazımıyla.

const CEM: CharSpec = {
  moods: {playerWin: 'kizgin'},
  lines: {
    start: [
      [1, '[excited] Kanka hazır mısın? Bugün efsane olacak!'],
      [2, '[laughs] Aga yayını açtım, çet seni izliyor!', 'kirpma', T('Aga yayını açtım, chat seni izliyor!')],
      [3, '[sighs] Yarın vizem var ama… tek el, söz!'],
      [4, '[teasing] Bro, bu ısınma turu bile değil.', 'kirpma'],
      [5, '[chuckles] Kanka burada vayfay yok ama skil var!', _, T('Kanka burada wifi yok ama skill var!')],
      [7, '[teasing] Tek kural: ağlamak yok, ekran görüntüsü serbest.'],
      [8, '[laughs] Rıza Amca bana çaylak diyor. Bugün çayı ona ısmarlatacağım!'],
    ],
    botThinking: [
      [1, 'Hmm…', _, NV2],
      [2, '[chuckles] Hehe.', _, NV],
      [3, '[whispers] Tamam tamam tamam…', _, NV],
      [4, 'Şeyy…', _, NV],
      [5, '[sighs] Hıı…', _, NV],
      [6, '[whispers] Bi saniye, hesaplıyorum…'],
      [7, '[whispers] Yüzde seksen yedi… yok, seksen sekiz.'],
      [8, '[teasing] Bu hamle storilik.', _, T("Bu hamle story'lik.")],
      [10, '[whispers] Beyin yüzde yüz, şarj yüzde dört.'],
      [11, '[chuckles] Hehehe.', _, NV],
    ],
    myTurnIdle: [
      [1, '[sighs] Kanka at artık, şarjım bitiyor!'],
      [2, '[chuckles] Donma kanka, ping atayım mı?'],
      [3, '[sighs] Of ya…', _, NV2],
      [4, '[scoffs] Pff…', _, NV],
      [5, '[sighs] Hadi ama…', _, NV],
      [6, '[groans] Kankaaa…', _, NV],
      [7, '[scoffs] Bro, ey ef key misin?', 'kirpma', T('Bro, AFK mısın?')],
      [8, '[annoyed] Aga sıra sende, görüldü atma!', 'kizgin'],
      [9, '[teasing] Taymaut yiyeceksin ha!', _, T('Timeout yiyeceksin ha!')],
      [11, '[groans] Of yaa!', _, NV],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Algoritma konuştu kanka!'],
      [2, '[excited] Pişti! Bunu storiye atıyorum!', _, T("Pişti! Bunu story'e atıyorum!")],
      [3, '[laughs] Pişti! Artı bin aura!'],
      [4, '[excited] Pişti! Çet çıldırdı şu an!', _, T('Pişti! Chat çıldırdı şu an!')],
      [5, '[teasing] Pişti. Fleks değil, gerçek.', _, T('Pişti. Flex değil, gerçek.')],
      [6, '[laughs] Pişti! Of ya, çok iyiyim ya!'],
      [7, '[excited] Efsane! Pişti! Biri bunu editlesin!', _, T("Efsane! Pişti! Biri bunu edit'lesin!")],
      [8, '[laughs] Hahaha! Pişti! Kanka bu daha fragmandı!'],
    ],
    botJackPisti: [
      [1, '[laughs harder] Vale pişti! Efsane kanka, efsane!'],
      [2, '[excited] Vale pişti! Bu ekran görüntüsü tarihe geçer!'],
      [3, '[gasps] Kanka vale pişti! Kalbim!'],
      [4, '[excited] Vale pişti! Çet, kalpleri görelim!', _, T('Vale pişti! Chat, kalpleri görelim!')],
    ],
    playerPisti: [
      [1, '[annoyed] Dur kanka, bu bir bag!', _, T('Dur kanka, bu bir bug!')],
      [2, '[groans] Lag girdi, saymaz!'],
      [3, '[gasps] Ayıp ettin kanka!', 'saskin'],
      [4, '[scoffs] Tamam tamam, şans.'],
      [5, '[groans] Of ya!', _, NV],
      [6, '[sighs] Eksi bin aura… benim için.', 'uzgun'],
      [7, '[annoyed] Red fleg! Pişti yapan herkes red fleg!', _, T('Red flag! Pişti yapan herkes red flag!')],
      [8, '[gasps] Yok artık!', 'saskin', NV],
    ],
    playerJackPisti: [
      [1, '[gasps] Abi ne oluyor? Veri setimde yoktu bu!'],
      [2, '[annoyed] Vale pişti mi? Kanka ayıp!'],
      [3, '[laughs] Tamam, klip al… seninki efsane.', 'kahkaha'],
      [4, '[groans] Yok artık! Plot tvist!', _, T('Yok artık! Plot twist!')],
    ],
    botBigCapture: [
      [1, '[chuckles] Hehehe.', _, NV2],
      [2, '[excited] Çok iyi ya!', _, NV],
      [3, '[laughs] Haha, evet!', _, NV],
      [4, '[excited] Lets gooo!', _, T("Let's go!", NV)],
      [5, '[excited] Yesss!', _, NV],
      [6, '[laughs] Hepsi benim kanka!'],
      [8, '[teasing] İstatistik konuştu.'],
      [9, '[laughs] Kanka masa resetlendi!'],
      [10, '[chuckles] Envanter doldu kanka.'],
      [11, '[laughs] Ahahaha!', _, NV],
    ],
    playerBigCapture: [
      [1, '[groans] Of yaa!', _, NV2],
      [2, '[scoffs] Pff, şans.', _, NV],
      [3, '[gasps] Oha!', _, NV],
      [4, '[groans] Ayy…', _, NV],
      [5, '[sighs] Neyse…', _, NV],
      [6, '[annoyed] Kanka hepsini mi aldın? Ayıp!'],
      [7, 'Algoritmayı güncellemem lazım.', 'dusunceli'],
      [8, '[gasps] Kanka hile mi açtın?!', 'saskin'],
      [9, '[annoyed] Kanka bu nerf yemesi lazım!'],
      [11, '[gasps] Yok artık!', _, NV],
    ],
    botJackCapture: [
      [1, '[chuckles] Hehe.', _, NV],
      [2, '[excited] Çok iyi ya!', _, NV],
      [3, '[teasing] Hehe, vale.', _, NV],
      [4, '[excited] Yesss!', _, NV],
      [5, '[chuckles] Hehehe.', _, NV],
      [6, '[chuckles] Vale benim ana karakterim.'],
      [8, '[laughs] Vale kombo kanka!'],
      [9, '[excited] Klaç vale!', _, T('Clutch vale!')],
      [10, '[chuckles] Rıza Amca taktiği, kanka.'],
      [11, '[laughs] Ahahaha!', _, NV],
    ],
    playerJackCapture: [
      [1, '[groans] Ayy…', _, NV],
      [2, '[scoffs] Cık cık.', _, NV],
      [3, '[gasps] Oha!', _, NV],
      [4, '[sighs] Hadi ama…', _, NV],
      [5, '[groans] Of yaa!', _, NV],
      [6, '[annoyed] Kanka valeyi nereden buldun?!'],
      [8, '[gasps] Vale mi? Spoyler versene!', _, T('Vale mi? Spoiler versene!')],
      [9, '[sighs] Tamam, vale meta. Anladım.'],
      [10, '[laughs] Tamam, iyi hamle. Saygı.', 'gulumseme'],
      [11, '[scoffs] Pff, şans.', _, NV],
    ],
    playerDumpedValuable: [
      [1, '[laughs] Ahahaha!', _, NV2],
      [2, '[chuckles] Hehehe.', _, NV],
      [3, '[gasps] Cidden mi?', _, NV],
      [4, '[gasps] Yok artık!', _, NV],
      [6, '[laughs] Kanka sen bana mı oynuyorsun?'],
      [7, '[teasing] Teşekkürler, takipçim oldun.'],
      [8, '[laughs] Bro, ne cömertlik! Kopuyorum!'],
      [9, '[scoffs] Kanka bu tam en pi si hamlesi.', _, T('Kanka bu tam NPC hamlesi.')],
      [10, '[chuckles] Bağış için teşekkürler, yayın devam!'],
      [11, '[excited] Çok iyi ya!', _, NV],
    ],
    tableEmpty: [
      [1, 'Boş masa… ne atsak?'],
      [2, '[chuckles] Masa boş, vayb boş.', _, T('Masa boş, vibe boş.')],
    ],
    botLuckyCapture: [
      [1, '[chuckles] Şans mı? Hayır kanka, skil.', _, T('Şans mı? Hayır kanka, skill.')],
      [3, '[laughs] Ar en ci bugün benden yana!', _, T('RNG bugün benden yana!')],
    ],
    lastRound: [
      [1, '[excited] Son el! Final bölümü kanka!'],
      [2, '[excited] Bos fayt başladı!', _, T('Boss fight başladı!')],
      [3, '[whispers] Son el… nabzım yüz yirmi.'],
    ],
    botLeading: [
      [1, '[chuckles] Skora bakma kanka, moral bozar.'],
      [2, '[laughs] İz kanka, iz!', _, T('Ez kanka, ez!')],
    ],
    playerLeading: [
      [1, '[annoyed] Kanka şans faktörü bu!'],
      [2, 'Tamam, B planına geçiyoruz.'],
    ],
    comeback: [
      [1, '[excited] Geri döndüm kanka! Kambek!', _, T('Geri döndüm kanka! Comeback!')],
      [2, '[laughs] Ana karakter geri döndü!'],
    ],
    botWin: [
      [1, '[laughs] Ci ci kanka. Biraz kolay oldu.', _, T('GG kanka. Biraz kolay oldu.')],
      [2, '[teasing] Algoritma bir, insanlık sıfır.'],
      [3, '[excited] Kazandım! Ekran görüntüsü aldım bile!'],
      [4, "[chuckles] Rövanş istersen di em'den yaz.", _, T("Rövanş istersen DM'den yaz.")],
      [5, '[laughs] Kanka üzülme, herkes yaşıyor bunu. Bana kaybetmeyi yani.'],
      [7, '[teasing] Kanka bu maç değildi, ders videosuydu.'],
      [8, '[laughs] Ci ci iz! Şaka şaka… ama iz.', _, T('GG ez! Şaka şaka… ama ez.')],
    ],
    playerWin: [
      [1, '[annoyed] Rövanş kanka! Daha yeni ısınıyordum.'],
      [2, '[sighs] Tamam, kabul… iyiydin. Ama şanstı.', 'uzgun'],
      [3, '[groans] Of ya… bunu kimseye anlatmıyoruz.', 'uzgun'],
      [4, '[scoffs] Kanka lag vardı, herkes gördü!'],
      [5, '[laughs] Ci ci. Adil oyundu… sayılır.', 'gulumseme', T('GG. Adil oyundu… sayılır.')],
      [7, '[gasps] Kanka sen gizli bos muydun?!', 'saskin', T('Kanka sen gizli boss muydun?!')],
      [8, '[chuckles] Saygılar. Ama rövanşta seni ezeceğim.', 'gulumseme'],
    ],
    draw: [
      [1, 'Berabere mi? Sistem kararsız kaldı.'],
      [2, '[laughs] Berabere! Rövanş şart kanka.'],
      [3, '[groans] Berabere mi? Kimse fleks yapamıyor.', _, T('Berabere mi? Kimse flex yapamıyor.')],
    ],
    galleryIntro: [
      [1, '[excited] Kanka ben Cem! Masada istatistik, hayatta vayb. Seç beni!', _, T('Kanka ben Cem! Masada istatistik, hayatta vibe. Seç beni!')],
      [2, '[teasing] Beni seç kanka, rakipler başlamadan ci ci der.', _, T('Beni seç kanka, rakipler başlamadan GG der.')],
    ],
    shopPitch: [
      [1, '[excited] Kanka beni al, takipçin ikiye katlansın!'],
      [2, '[teasing] Sepete ekle kanka, sonra düşünürsün!'],
      [3, '[laughs] Beni almayan sonra storimde ağlıyor!', _, T("Beni almayan sonra story'mde ağlıyor!")],
    ],
    shopBought: [
      [1, '[excited] Kanka efsane seçim! Takım kuruldu!'],
      [2, '[laughs] Of ya, çok iyi ya! Hadi masaya!'],
    ],
    shopPoor: [
      [1, '[laughs] Kanka bakiye yetersiz! Biraz graynd lazım.', _, T('Kanka bakiye yetersiz! Biraz grind lazım.')],
    ],
  },
  blof: {
    start: [
      [1, '[teasing] Kanka, blöf oranını hesapladım bile.'],
      [2, '[excited] Poker feys açıldı!', _, T('Poker face açıldı!')],
    ],
    callOut: [
      [1, '[excited] Blöf! İhtimal düşük!'],
      [2, '[scoffs] Yok artık! Blöf!'],
      [3, '[laughs] Red fleg! Blöf!', _, T('Red flag! Blöf!')],
      [4, '[scoffs] Pff… blöf.'],
    ],
    catchGloat: [
      [1, '[excited] Hesapladığım gibi!'],
      [2, '[laughs] Tahmin yüzde doksan ikiydi!'],
    ],
    catchPlayer: [
      [1, '[laughs] Kanka çok belliydi!'],
      [2, '[laughs harder] Hahaha! Yakalandın! Klip al bunu!'],
      [3, '[chuckles] Kanka poker feysin yüklenmedi!', _, T("Kanka poker face'in yüklenmedi!")],
      [5, '[laughs] Bu blöf o kadar kötüydü ki çet bile utandı. Eksi bin aura!', _, T('Bu blöf o kadar kötüydü ki chat bile utandı. Eksi bin aura!')],
    ],
    caught: [
      [1, '[laughs] Tamam, yakalandım. Ayıp ettim.'],
      [2, '[annoyed] Bag var bende, kesin bag.', _, T('Bug var bende, kesin bug.')],
    ],
    caughtByPlayer: [
      [1, '[gasps] Nasıl anladın kanka?!'],
      [2, '[groans] Poker feys çöktü!', _, T('Poker face çöktü!')],
      [3, '[annoyed] Kanka ayıp ettin, yayındayım!'],
    ],
    wrongCall: [
      [1, '[gasps] Ne? Doğru muymuş?'],
      [2, '[scoffs] Bu kadar dürüstlük aşırı krinç.', _, T('Bu kadar dürüstlük aşırı cringe.')],
    ],
    survived: [
      [1, '[chuckles] Kanka ben dürüstüm!'],
      [2, '[teasing] Hesap tamam, yığın senin.'],
    ],
    survivedPlayer: [
      [1, '[laughs] Doğruydu kanka! Yığın senin.'],
      [2, '[laughs] Plot tvist: hepsi doğru!', _, T('Plot twist: hepsi doğru!')],
    ],
    pass: [
      [1, '[sighs] Pas.'],
      [2, '[chuckles] Pas kanka.'],
      [3, '[scoffs] Skip!'],
    ],
    bigPile: [
      [1, '[laughs] Rip el.', _, T('RIP el.')],
      [2, '[chuckles] O yığın bir sezonluk içerik.'],
    ],
    nearWin: [
      [1, '[excited] Son kartlar kanka!'],
      [2, '[teasing] Bitiriyorum, haberin olsun.'],
    ],
    playerNearWin: [
      [1, '[gasps] Dikkat, bitirmek üzere!'],
      [2, '[whispers] Bu iş tehlikeli olmaya başladı…'],
    ],
    idle: [
      [1, '[chuckles] Kanka lag mı var?'],
      [2, '[sighs] Bekletme kanka, vayb düşüyor.', _, T('Bekletme kanka, vibe düşüyor.')],
    ],
    botWin: [
      [1, '[laughs] Ci ci kanka!', _, T('GG kanka!')],
      [3, '[laughs] Bu blöflerden video yaparım, milyon izlenir!'],
    ],
    playerWin: [
      [1, '[sighs] Ci ci, iyi oynadın kanka.', _, T('GG, iyi oynadın kanka.')],
      [2, '[laughs] Tamam, saygı. Sen yalanın hocasısın.'],
    ],
    mateCheer: [
      [1, '[excited] Takım çalışması!'],
      [2, '[laughs] Ortak, sen bizi taşıyorsun!'],
    ],
  },
  end: {
    endGloat: [
      [1, '[laughs] Ci ci kanka, klibi aldım bile!', _, T('GG kanka, klibi aldım bile!')],
      [2, '[teasing] Kanka, bu maç senin için tutoryaldı.', 'kirpma', T('Kanka, bu maç senin için tutorialdı.')],
    ],
    endGloatClose: [[1, '[excited] Klaç anı kanka! Kalbim hâlâ atıyor!', _, T('Clutch anı kanka! Kalbim hâlâ atıyor!')]],
    endGloatBig: [[1, '[laughs] Kanka bu maçı spidran yaptım!', _, T('Kanka bu maçı speedrun yaptım!')]],
    endGloatCaught: [[1, '[teasing] Kanka, blöflerin hep ekran görüntüsünde.']],
    endSulk: [
      [1, '[groans] Of ya… bunu yayından keseceğim.'],
      [2, '[sighs] Tamam, saygı. Ama kayıt dışı.', 'kirpma'],
    ],
    endSulkClose: [[1, '[groans] Kıl payı kanka, ping atsaydım alırdım!']],
    endSulkBig: [[1, '[gasps] Kanka beni resmen silip attın, aura sıfır!']],
    endSulkStreak: [[1, '[gasps] Kanka vin strik mi kasıyorsun?!', _, T('Kanka win streak mi kasıyorsun?!')]],
    endSulkPisti: [[1, '[annoyed] Bu kadar pişti? Kanka hesabın raporlu!', 'kizgin']],
    endSulkSly: [[1, '[gasps] Kanka sen poker yüzünü nereden aldın?']],
    endSulkLast: [[1, '[gasps] Son kart blöf mü? Plot tvist!', _, T('Son kart blöf mü? Plot twist!')]],
    endJoinWin: [
      [1, '[chuckles] Kanka üzülme, bu meta herkesi yakıyor.'],
      [2, '[scoffs] Kazandı diye fleks yapıyor, krinç!', 'kirpma', T('Kazandı diye flex yapıyor, cringe!')],
      [3, '[laughs] Kanka, çet seni teselli ediyor şu an.', _, T('Kanka, chat seni teselli ediyor şu an.')],
    ],
    endJoinLose: [
      [1, '[excited] Kanka artı bin aura, hak ettin!'],
      [2, '[laughs] Bahaneler yükleniyor… yüzde doksan!', 'kirpma'],
      [3, '[chuckles] Kanka bu klip viral olur.'],
    ],
    endRevenge: [
      [1, '[excited] Rövanş kanka! Bu sefer renkıd!', _, T('Rövanş kanka! Bu sefer ranked!')],
      [2, '[teasing] Bir el daha? Yoksa korktun mu kanka?'],
    ],
    endMateWin: [
      [1, '[excited] Ortak, duo efsane! Çak bir beşlik!'],
      [2, '[laughs] Ortak, sen beni taşıdın, saygı!', 'gulumseme'],
    ],
    endMateLose: [
      [1, '[groans] Ortak, bu maç ikimizin de lagıydı.'],
      [2, '[sighs] Ortak, sorun yok, rövanşta taşırım.', 'gulumseme'],
    ],
    endFoeWin: [
      [1, '[laughs] Ortaklık çöktü kanka, sunucu kapandı!'],
      [2, '[teasing] Duo değil, demo olmuşsunuz!', 'kirpma'],
    ],
    endFoeLose: [
      [1, '[annoyed] Bu duo nerf yemeli, resmen!', 'kizgin'],
      [2, '[sighs] Tamam, iyi takımdınız. Saygı.'],
    ],
    endDuoWinA: [[1, '[excited] Ortak, takım efsane! Klibi kestim!']],
    endDuoWinB: [[1, '[laughs] Ortak, sen de efsanesin, aynen!']],
    endDuoLoseA: [[1, '[groans] Ortak, sen de bir hamle yapsaydın!']],
    endDuoLoseB: [[1, '[annoyed] Ortak, şarjım bitti, ne yapayım!']],
    endAccept: [
      [1, '[excited] Rövanş modu açık! Hadi kanka!'],
      [2, '[excited] Geri döndün kanka? Saygı!'],
    ],
    endBye: [
      [1, '[chuckles] Bay bay kanka, sonra di em at!', _, T('Bye bye kanka, sonra DM at!')],
      [2, '[teasing] Kaçıyor musun kanka? Çet gördü!', _, T('Kaçıyor musun kanka? Chat gördü!')],
    ],
    midAhead: [[1, '[teasing] Kanka daha ilk bölüm, final de benim.']],
    midBehind: [[1, '[sighs] Tamam, kambek arkı başlıyor.', _, T('Tamam, comeback arkı başlıyor.')]],
    midSide: [
      [1, '[excited] Çet ısınıyor, maç kızışıyor!', 'gulumseme', T('Chat ısınıyor, maç kızışıyor!')],
      [2, '[whispers] Kanka bu maçın senaryosu iyi.'],
    ],
    midMateUp: [[1, '[excited] Ortak, duo çalışıyor! Devam!']],
    midMateDown: [[1, '[whispers] Ortak, B planı. Bana güven.']],
  },
};

// ───────────────────────── DEFNE ─────────────────────────
// 34, mimar. Pes, sıcak, kadınsı alto; asla bağırmaz. Göz alıcı "abla" enerjisi: tatlı-sert, zarif iğneleme, oyunbaz
// özgüven, kadın sezgisi (insanı okur — Blöf'te ölümcül), arada kıkırdar. Tatlandırıcı ayrıntılar seyrek: oje, ruj,
// topuk, parfüm, kahve falı. Mimarlık benzetmesi yalnız en iyileri. Cem'e tatlı ama acımasız, Rıza'ya "Amcacım"
// saygısı, Dursun'la fal + dedikodu ittifakı. "Canım / tatlım / şekerim" seyrek.

const DEFNE: CharSpec = {
  moods: {botPisti: 'kirpma', botJackPisti: 'zafer', playerPisti: 'saskin', playerBigCapture: 'saskin', botBigCapture: 'gulumseme', botWin: 'kirpma'},
  lines: {
    start: [
      [1, '[sweetly] Hoş geldin canım. Kartlar hazır, ben hazırım.'],
      [2, '[playfully] Fincanında üç vale gördüm… ikisi bende.', 'kirpma'],
      [3, '[giggles] Rujumu tazeledim. Zafer pozu lazım olacak.', 'kirpma'],
      [4, '[teasing] Kadın eli değdi, masa güzelleşti. Başlayalım.'],
      [5, '[softly] Sessiz olan kazanır derler… bugün biraz konuşacağım.'],
      [7, '[laughs softly] Rıza Amcacım "merhamet et kızım" dedi. Bakarız.', 'kirpma'],
      [8, '[teasing] Kuralları biliyorsun, değil mi tatlım? Güzel. Ben de.'],
    ],
    botThinking: [
      [1, '[softly] Hımm…', _, NV2],
      [2, '[giggles] Hı hı.', _, NV],
      [3, '[sighs] Mmm…', _, NV],
      [4, '[playfully] Bakalım bakalım…', _, NV],
      [5, '[softly] Peki…', _, NV],
      [6, '[whispers] Sezgim diyor ki… bu kart.'],
      [7, '[playfully] Yedi ölç, bir biç, canım.'],
      [8, '[softly] Şuraya bir kolon… yok, kiriş.'],
      [10, '[sighs] Ojem kurumadan karar vereyim.'],
      [11, '[playfully] Hıı?', _, NV],
    ],
    myTurnIdle: [
      [1, '[sighs dramatically] Ahh…', _, NV2],
      [2, '[playfully] Hıı?', 'kirpma', NV],
      [3, '[giggles] Tık tak, tık tak.', 'kirpma', NV],
      [4, '[softly] Canııım?', 'kirpma', NV],
      [5, '[teasing] Tatlım, ruhsat beklemiyoruz.', 'kirpma'],
      [6, '[sighs] Ojem kurudu, saçım uzadı.', 'kirpma'],
      [7, '[playfully] Düşünmen çok tatlı. Hadi ama.', 'gulumseme'],
      [8, '[sighs] Bu sürede bir bina çizerdim.'],
      [10, '[sweetly] Kahvem soğuyor şekerim.', 'kirpma'],
      [11, '[sighs] Mmm…', _, NV],
    ],
    botPisti: [
      [1, '[giggles] Pişti!', _, {weight: 1.2}],
      [2, '[sweetly] Pişti, canım. Üzülme, sana da yakışırdı.'],
      [3, '[playfully] Pişti! Rujum bile bozulmadı.'],
      [4, '[laughs softly] Pişti. Kadın sezgisi… bilim henüz açıklayamadı.'],
      [5, '[teasing] Pişti. Alkış şart değil… ama olabilir.'],
      [6, '[teasing] Pişti! Fincanında görmüştüm zaten.'],
      [7, '[sweetly] Pişti. Zarif, sessiz, ölümcül.'],
      [8, '[giggles] Pişti! Topuklularla bile yetiştim.'],
    ],
    botJackPisti: [
      [1, '[laughs softly] Vale pişti! Bunu çerçeveletip salona asacağım.'],
      [2, '[playfully] Yirmi puan, tatlım. Anahtar teslim.'],
      [3, '[giggles] Vale pişti… Bazen kendime hayran oluyorum.', 'kirpma'],
      [4, '[sweetly] Vale pişti. Kadın eli değince böyle olur.'],
    ],
    playerPisti: [
      [1, '[gasps] Aaa!', _, {weight: 1.3}],
      [2, '[sighs dramatically] Ahh, kalbim…', 'uzgun', NV],
      [3, '[sarcastic] Bravo. Bir de alkış ister misin?', 'kizgin'],
      [4, '[playfully] Hıı? Bana mı yaptın bunu?'],
      [5, '[giggles] Fena değil tatlım. Hiç fena değil.', 'kirpma'],
      [6, '[teasing] Not aldım. Bunu ödeyeceksin, şekerim.', 'kizgin'],
      [7, '[sighs] Ojem çizildi resmen.', 'kizgin'],
      [8, '[softly] Şanslısın… şimdilik.', 'kirpma'],
    ],
    playerJackPisti: [
      [1, '[gasps] Aaa! Vale pişti mi?'],
      [2, '[laughs softly] Peki. Bu sefer şapka çıkarıyorum.', 'gulumseme'],
      [3, '[sighs] Projemi yıktın. Kalbimi değil… şimdilik.', 'kirpma'],
      [4, '[playfully] Kimden öğrendin? Söyle, kıskanmayacağım.', 'kirpma'],
    ],
    botBigCapture: [
      [1, '[giggles] Hı hı hı.', _, NV2],
      [2, '[laughs softly] Hm hm hm.', _, NV],
      [3, '[sweetly] Mmm, güzel.', _, NV],
      [4, '[playfully] Aaa, hepsi benim mi?', _, NV],
      [5, '[giggles] İşte!', _, NV],
      [6, '[teasing] Kentsel dönüşüm, tatlım.'],
      [8, '[sweetly] Teşekkürler, toplu teslimat.'],
      [9, '[laughs softly] Kadınlar toplamayı bilir.'],
      [10, '[teasing] Masa da bana yakıştı.'],
      [11, '[laughs softly] Ah ha ha.', _, NV],
    ],
    playerBigCapture: [
      [1, '[sighs dramatically] Ahh…', _, NV2],
      [2, '[gasps] Hıı!', _, NV],
      [3, '[sighs] Ah, olsun.', _, NV],
      [4, '[playfully] Cık cık cık.', _, NV],
      [5, '[softly] Ooo.', _, NV],
      [6, '[teasing] Tadını çıkar… şimdilik.'],
      [7, '[sarcastic] Ne hırs. Bana da bırak, tatlım.', 'kirpma'],
      [9, '[teasing] Bekle sen, topuk sesim geliyor.', 'kirpma'],
      [10, '[sighs] Kalbim kırıldı. Biraz.', 'uzgun'],
      [11, '[gasps] Aaa!', _, NV],
    ],
    botJackCapture: [
      [1, '[sweetly] Mmm, güzel.', _, NV],
      [2, '[giggles] İşte!', _, NV],
      [3, '[playfully] Ve… alındı.', _, NV],
      [4, '[laughs softly] Hm hm hm.', _, NV],
      [5, '[whispers] Sürpriz.', _, NV],
      [6, '[teasing] Vale, taşıyıcı kolondur canım.'],
      [8, '[teasing] Sabır, tatlım. Sabır.'],
      [9, "[whispers] Rıza Amcacım'dan öğrendim."],
      [10, '[sweetly] Vale beni hiç yarı yolda bırakmaz.'],
      [11, '[giggles] Hı hı hı.', _, NV],
    ],
    playerJackCapture: [
      [1, '[sighs] Ah, olsun.', _, NV],
      [2, '[gasps] Aaa!', _, NV],
      [3, '[playfully] Hıı?', _, NV],
      [4, '[giggles] Ooo, vale.', _, NV],
      [5, '[playfully] Cık cık cık.', _, NV],
      [6, '[teasing] Valeyi saklamışsın. Sevimli.'],
      [8, '[sarcastic] Ne sürpriz. Hiç beklemiyordum.'],
      [9, '[softly] Akıllıca. Bunu sevdim.', 'gulumseme'],
      [10, '[giggles] Bana mı öğretiyorsun, şekerim?', 'kirpma'],
      [11, '[softly] Ooo.', _, NV],
    ],
    playerDumpedValuable: [
      [1, '[laughs softly] Ah ha ha.', 'kirpma', NV2],
      [2, '[sweetly] Oh, teşekkürler.', 'kirpma', NV],
      [3, '[playfully] Aa, ne hoş.', 'kirpma', NV],
      [4, '[giggles] Ayy!', 'kirpma', NV],
      [5, '[sarcastic] Bunu bilerek mi yaptın? Sağ ol.'],
      [6, '[sweetly] Hediye için teşekkürler, canım.', 'kirpma'],
      [8, '[teasing] Ne zarif bir hata.', 'kirpma'],
      [9, '[playfully] Çiçek de getirseydin bari.', 'kirpma'],
      [10, '[giggles] Bana hediye mi? Utandırdın.', 'kirpma'],
      [11, '[laughs softly] Hm hm hm.', _, NV],
    ],
    tableEmpty: [
      [1, '[softly] Boş arsa… ne güzel.'],
      [2, '[playfully] Temiz masa. Rujumu tazeleyeyim.'],
    ],
    botLuckyCapture: [
      [1, '[playfully] Planlıydı.'],
      [2, '[giggles] Şans da kadındır, canım.'],
    ],
    lastRound: [
      [1, '[playfully] Son el. Parfümümü sıkayım.'],
      [2, '[teasing] Son dağıtım. Hazır mısın tatlım?'],
      [3, '[softly] Son el… en sevdiğim kısım.'],
    ],
    botLeading: [
      [1, '[teasing] Skoru görüyor musun? Ben görüyorum.'],
      [2, '[laughs softly] Merak etme, nazik kazanırım.'],
    ],
    playerLeading: [
      [1, '[playfully] Önde olmak kolay. Kalmak zor.'],
      [2, '[giggles] Önde misin? Ne tatlı.', 'kirpma'],
    ],
    comeback: [
      [1, '[sweetly] Topuklarımla geri döndüm.', 'kirpma'],
      [3, '[playfully] Kadın sezgisi geri sardı. Öndeyim.'],
    ],
    botWin: [
      [1, '[sweetly] Kazandım canım. Üzülme, herkes bana kaybediyor.'],
      [2, '[giggles] Rujum hâlâ yerinde. Maç da bende.'],
      [3, '[laughs softly] Bir dahaki sefere… biraz daha dene.'],
      [4, '[playfully] Ojem kurumadan bitti bu el.'],
      [5, '[teasing] Kadın sezgisi bir, olasılık hesabı sıfır.'],
      [6, '[sweetly] Temeli ben attım, çatıyı ben kapattım. Anahtar bende.'],
      [8, '[playfully] Kaybettin… ama çok şık kaybettin.'],
    ],
    playerWin: [
      [1, '[sweetly] Tebrik ederim. Ciddiyim, canım.', 'gulumseme'],
      [2, '[sighs] Peki… bu seferlik, canım.'],
      [3, '[giggles] Kazandın mı? Kimseye söyleme, imajım var.', 'kirpma'],
      [5, '[softly] Beni yendin… Not ettim. Kırmızı rujla.'],
      [6, '[laughs softly] İlk kez yeniliyorum… bu hafta.', 'kirpma'],
      [7, '[playfully] Peki, sana yakıştı. Ama alışma.', 'kirpma'],
      [8, '[sighs] Fincanında görmüştüm zaten. Kabul.'],
    ],
    draw: [
      [1, '[playfully] Berabere. Simetrik… bayıldım.'],
      [2, '[giggles] Berabere mi? Bir kahve daha içeriz o zaman.', 'kirpma'],
      [3, '[sweetly] Eşitlik. Zarif bir son.'],
    ],
    galleryIntro: [
      [1, '[sweetly] Ben Defne. Zarifim, sakinim… ve hep kazanırım.'],
      [2, '[giggles] Seç beni tatlım. Kazanmak sana çok yakışacak.'],
    ],
    shopPitch: [
      [1, '[playfully] Beni seç canım, hem zarif hem tehlikeliyim.'],
      [2, '[sweetly] Dokuz bin jeton mu? Kalite pahalıdır, şekerim.'],
      [3, '[sarcastic] Pahalı mı? Kaybetmek daha pahalı.'],
    ],
    shopBought: [
      [1, '[giggles] Zevkine güvenirdim. Haklıymışım.'],
      [2, '[sweetly] Güzel seçim canım. Hadi, gidip kazanalım.'],
    ],
    shopPoor: [
      [1, '[playfully] Bütçe yetmedi tatlım. Biraz daha kazan.'],
    ],
  },
  blof: {
    start: [
      [1, '[playfully] Kartlar konuşmaz. İnsanlar konuşur… ben dinlerim.'],
      [2, '[sweetly] Yalan söyle canım. Ama güzel söyle.'],
    ],
    callOut: [
      [1, '[teasing] Blöf.'],
      [2, '[playfully] Aç bakalım tatlım.'],
      [3, '[sweetly] Hayır canım. Blöf.'],
      [4, '[sarcastic] Tatlı yalan. Blöf.'],
    ],
    catchGloat: [
      [1, '[laughs softly] Kadın sezgisi. Bilim henüz açıklayamadı.'],
      [2, '[playfully] Tahmin ettiğim gibi.'],
    ],
    catchPlayer: [
      [1, '[giggles] Yalan söylerken kulağın kızarıyor canım.'],
      [2, '[laughs softly] Yalanın çok tatlıydı. Ama yalandı.'],
      [4, '[sarcastic] Poker yüzün… eskiz aşamasında kalmış.'],
      [5, '[sweetly] Kadın sezgisinden kaçamazsın şekerim. Al yığını.', 'kirpma'],
    ],
    caught: [
      [1, '[sighs dramatically] Ahh… yakalandım.'],
      [2, '[giggles] Peki. Bu seferlik.'],
    ],
    caughtByPlayer: [
      [1, '[gasps] Aaa! Nasıl anladın?'],
      [2, '[laughs softly] Yakalandım. Utanç verici… ve eğlenceli.'],
      [3, '[playfully] Bravo, dedektif. Bu sefer sen kazandın.'],
    ],
    wrongCall: [
      [1, '[sighs] Yanıldım. Nadir bir an, tadını çıkar.'],
      [2, '[giggles] Bu bir kereydi. Kayda geçmesin.'],
    ],
    survived: [
      [1, '[teasing] Bana güvenmeliydin.'],
      [2, '[sweetly] Yığın senin, canım.'],
    ],
    survivedPlayer: [
      [1, '[sweetly] Doğruydu canım. Yığın senin.'],
      [2, '[laughs softly] Hep yalan söylediğimi mi sandın? Ayıp.'],
    ],
    pass: [
      [1, '[softly] Pas.'],
      [2, '[playfully] Geçiyorum.'],
      [3, '[sweetly] Pas canım.'],
    ],
    bigPile: [
      [1, '[gasps] Aaa, ağır yük!'],
      [2, '[giggles] O yığın bir apartman kadar.'],
    ],
    nearWin: [
      [1, '[playfully] Az kaldı tatlım.'],
      [2, '[teasing] Son kartlar. Hazır mısın?'],
    ],
    playerNearWin: [
      [1, '[gasps] Hıı, bitirecek!'],
      [2, '[whispers] Birinin onu durdurması lazım.'],
    ],
    idle: [
      [1, '[softly] Bekliyorum canım.'],
      [2, '[giggles] Yalan mı kuruyorsun? Ölçekli olsun.'],
    ],
    botWin: [
      [1, '[giggles] Rujumu tazeleyeyim… zafer pozu lazım.'],
      [3, '[whispers] Hepsi yalandı… ya da hiçbiri. Kim bilir?', 'kirpma'],
    ],
    playerWin: [
      [1, '[sweetly] İyi oynadın canım. Bunu sevdim.'],
      [2, '[playfully] Bir daha. Hemen.'],
    ],
    mateCheer: [
      [1, '[giggles] İyi hamle, ortak!'],
      [2, '[sweetly] Seninle çok iyi bir ekibiz.'],
    ],
  },
  end: {
    endGloat: [
      [1, '[sweetly] Teşekkür ederim. Alkış kabul ediyorum.', 'kirpma'],
      [2, '[giggles] Fincanında bu yazıyordu, tatlım.', 'kirpma'],
    ],
    endGloatClose: [[1, '[softly] Kıl payı… ama zarif bir kıl payı.']],
    endGloatBig: [[1, '[laughs softly] Bu farkı ölçekle çizmek lazım.', 'kirpma']],
    endGloatCaught: [[1, '[giggles] Her yalanında kaşın kalktı, canım.']],
    endSulk: [
      [1, '[sighs] Peki… ojemi bozdun ama haklısın.'],
      [2, '[playfully] Tebrikler. Bugün sezgim izinliydi.', 'kirpma'],
    ],
    endSulkClose: [[1, '[sighs] Bir milimle. Projede revizyon şart.']],
    endSulkBig: [[1, '[gasps] Aaa… beni yerle bir ettin, canım.']],
    endSulkStreak: [[1, '[playfully] Yine mi sen? Fincanına bakmalıyım.', 'kirpma']],
    endSulkPisti: [[1, '[sighs] Pişti üstüne pişti… şaşırttın.']],
    endSulkSly: [[1, '[softly] Seni okuyamadım. Bu… etkileyici.']],
    endSulkLast: [[1, '[laughs softly] Son kart blöf… çok cüretkâr.', 'gulumseme']],
    endJoinWin: [
      [1, '[sweetly] Üzülme canım, kahve benden.'],
      [2, '[sarcastic] Kazandı, şimdi bir hafta anlatır.', 'kirpma'],
      [3, '[softly] Fincanında rövanş görüyorum, tatlım.', 'kirpma'],
    ],
    endJoinLose: [
      [1, '[sweetly] Bravo canım. Çok zarif bir zafer.', 'gulumseme'],
      [2, '[giggles] Kaybedenin yüzüne bakın, ne tatlı.', 'kirpma'],
      [3, '[playfully] Bu zaferi çerçeveletmek lazım.'],
    ],
    endRevenge: [
      [1, '[teasing] Rövanş? Topuklarımı çıkarmadım daha.'],
      [2, '[playfully] Bir el daha? Ben hazırım, ya sen?'],
    ],
    endMateWin: [
      [1, '[giggles] Ortak, bu zafer sana da yakıştı.'],
      [2, '[sweetly] Ortak, temeli sen attın, çatıyı ben.', 'kirpma'],
    ],
    endMateLose: [
      [1, '[softly] Ortak, planı yeniden çizeriz.', 'dusunceli'],
      [2, '[sighs] Ortak… bu el ojeme dokundu.'],
    ],
    endFoeWin: [
      [1, '[sweetly] İkiniz de çok tatlıydınız. Ama yetmedi.', 'kirpma'],
      [2, '[teasing] Uyumunuz eskiz aşamasında kalmış.', 'kirpma'],
    ],
    endFoeLose: [
      [1, '[sighs] Peki, ikinize de şapka çıkarıyorum.', 'gulumseme'],
      [2, '[playfully] Takım ruhunuz çok tatlı. Kıskandım.', 'kirpma'],
    ],
    endDuoWinA: [[1, '[giggles] Ortak, zafer pozu! Gülümse.']],
    endDuoWinB: [[1, '[sweetly] Ortak, seninle kazanmak çok şık.']],
    endDuoLoseA: [[1, '[sighs] Ortak, biraz sezgi lütfen.']],
    endDuoLoseB: [[1, '[softly] Topuklarım sıktı, ortak. Affet.']],
    endAccept: [
      [1, '[playfully] Döndün demek. Bunu bekliyordum.', 'kirpma'],
      [2, '[sweetly] Rövanş mı? Kahvemi tazeleyeyim.'],
    ],
    endBye: [
      [1, '[sweetly] Görüşürüz canım. Kahve sözü bende.', 'gulumseme'],
      [2, '[playfully] Gidiyor musun? Tam ısınmıştım.'],
    ],
    midAhead: [[1, '[softly] İlk kat bitti. Çatı da benim olacak.', 'kirpma']],
    midBehind: [[1, '[playfully] Keyfini çıkar, kısa sürecek.', 'kirpma']],
    midSide: [
      [1, '[softly] Gerilim tırmanıyor… bayıldım.'],
      [2, '[giggles] Maç güzelleşiyor, rujumu tazeleyeyim.', 'gulumseme'],
    ],
    midMateUp: [[1, '[sweetly] Ortak, harika gidiyoruz. Bozmayalım.']],
    midMateDown: [[1, '[softly] Ortak, sakin. Sezgim dönüyor diyor.']],
  },
};

const SPECS: Record<CharId, CharSpec> = {riza: RIZA, cem: CEM, dursun: DURSUN, defne: DEFNE};

// ───────────────────────── botlar arası atışma (banter) ─────────────────────────
// A konuşur, B cevap verir (en çok 3 satır, A–B–A). Yalnız 2+ bot olan masalarda (1'e 1'de yok). Bağlam:
//  steal       — A, B'nin koyduğu yığını / piştiyi / valeyi aldı (Pişti; karşı taraflar)
//  bluffCaught — A, B'nin blöfünü yakaladı (Blöf; karşı taraflar)
//  passes      — B üst üste pas diyor (Blöf)
//  lead        — A, B'nin önünde (karşı taraflar)
//  lastRound   — son el gerginliği
//  start       — el başı (seyrek)
//  mateHype    — eşli: A ortağı B'yi över
//  mateBlame   — eşli: A ortağı B'ye tatlı sitem eder
// Kimlik: banter_<a>_<b>_<bağlam>_<no> ; satırlar …a, …b, …c (sıra). 12 yönlü çiftin hepsi en az 3 atışmada.

export const BANTER_CTX = ['steal', 'bluffCaught', 'passes', 'lead', 'lastRound', 'start', 'mateHype', 'mateBlame'] as const;
export type BanterCtx = (typeof BANTER_CTX)[number];
/** Bağlamın oyunu ve taraf koşulu (opp = karşı taraf, mate = eşli ortak, any = fark etmez). */
export const BANTER_CTX_INFO: Readonly<Record<BanterCtx, {game: 'pisti' | 'blof' | 'any'; team: 'opp' | 'mate' | 'any'}>> = {
  steal: {game: 'pisti', team: 'opp'},
  bluffCaught: {game: 'blof', team: 'opp'},
  passes: {game: 'blof', team: 'any'},
  lead: {game: 'any', team: 'opp'},
  lastRound: {game: 'any', team: 'any'},
  start: {game: 'any', team: 'any'},
  mateHype: {game: 'any', team: 'mate'},
  mateBlame: {game: 'any', team: 'mate'},
};

type BLine = [who: 'a' | 'b', tts: string, mood?: Pose | null, opt?: Opt];
type BSpec = [a: CharId, b: CharId, lines: BLine[]];

const BANTER_SPEC: Record<BanterCtx, BSpec[]> = {
  steal: [
    ['riza', 'cem', [
      ['a', '[laughs] Al bakalım Cem! Algoritmana yaz!', 'kahkaha'],
      ['b', '[groans] Amca, veri setimi bozdun ya!', 'kizgin'],
      ['a', '[chuckles] Veri değil evlat, tecrübe!', 'kirpma'],
    ]],
    ['cem', 'riza', [
      ['a', '[excited] Amca kusura bakma, skil işu!', 'kahkaha', T('Amca kusura bakma, skill issue!')],
      ['b', '[grumbling] Ne işu ne bişu! Bizde buna şans denir!', 'kizgin'],
    ]],
    ['dursun', 'riza', [
      ['a', '[laughs] Amca, bunu da çayına say!', 'kahkaha'],
      ['b', '[grumbling] Çayın zaten soğuk, Dursun!', 'kizgin'],
    ]],
    ['cem', 'dursun', [
      ['a', '[laughs] Dursun abi, masa resetlendi!', 'kahkaha'],
      ['b', '[laughs] Reset mi? Ben ona bulaşık derim!', 'kahkaha'],
    ]],
    ['dursun', 'cem', [
      ['a', '[laughs] Cem, bu yığının faturası sana!', 'kahkaha'],
      ['b', '[groans] Abi, öğrenciyim, burs bekliyorum!', 'uzgun'],
    ]],
    ['defne', 'cem', [
      ['a', '[sweetly] Kusura bakma Cem. Verilerini aldım.', 'kirpma'],
      ['b', '[gasps] Abla, bu ka ve ka ka ihlali!', 'saskin', T('Abla, bu KVKK ihlali!')],
    ]],
    ['dursun', 'defne', [
      ['a', '[laughs] Defne Hanım, yığın müessesenin!', 'kahkaha'],
      ['b', '[giggles] Faturayı fincanıma yazın, Dursun Bey.', 'kirpma'],
    ]],
  ],
  bluffCaught: [
    ['riza', 'cem', [
      ['a', '[laughs] Hah! Cem, yalanın şarjı bitti!', 'kahkaha'],
      ['b', '[sighs] Amca, dedektif misin, emekli mi?', 'saskin'],
      ['a', '[chuckles] İkisi birden evlat!', 'kirpma'],
    ]],
    ['cem', 'riza', [
      ['a', '[laughs] Amca, kırk yıllık tecrübe yakalandı!', 'kahkaha'],
      ['b', '[groans] Kırk yılda bir olur… sen denk geldin.', 'uzgun'],
    ]],
    ['dursun', 'riza', [
      ['a', '[laughs] Amca! Kırk yıl bize yalan mı söyledin?', 'kahkaha'],
      ['b', '[chuckles] Kırk yıldır yakalanmadım ki Dursun.', 'kirpma'],
    ]],
    ['riza', 'defne', [
      ['a', '[laughs] Kızım, yalanın çok zarif… ama yalan!', 'kahkaha'],
      ['b', '[giggles] Ama zarifti, değil mi Amcacım?', 'kirpma'],
    ]],
    ['defne', 'riza', [
      ['a', '[giggles] Rıza Amcacım… bıyığınız titredi.', 'kirpma'],
      ['b', '[groans] Bıyık da ihanet etti kızım!', 'saskin'],
    ]],
    ['dursun', 'cem', [
      ['a', '[laughs] Cem! Yalanın yüzünde yazıyor!', 'kahkaha'],
      ['b', '[groans] Abi, ön kamera açık kalmış galiba…', 'uzgun'],
    ]],
    ['cem', 'defne', [
      ['a', '[laughs] Abla, poker yüzün güncelleme almamış!', 'kahkaha'],
      ['b', '[giggles] Güncelleme gelir tatlım. Sen dayan.', 'kirpma'],
    ]],
    ['defne', 'cem', [
      ['a', '[giggles] Cem, yalan söylerken sesin inceliyor.', 'kirpma'],
      ['b', '[gasps] Abla, ciddi misin? Kimse söylemedi!', 'saskin'],
    ]],
  ],
  passes: [
    ['riza', 'dursun', [
      ['a', '[grumbling] Dursun, bir pas daha dersen ocağı kapatırım!', 'kizgin'],
      ['b', '[chuckles] Amca, pas da bir çeşit ikramdır!', 'kirpma'],
    ]],
    ['defne', 'riza', [
      ['a', '[playfully] Amcacım, üçüncü pas. Emekli mi oldunuz?', 'kirpma'],
      ['b', '[chuckles] Pusudayım kızım, pusuda!', 'kirpma'],
    ]],
    ['defne', 'cem', [
      ['a', '[playfully] Cem, dördüncü pas. Bekleme odası mı burası?', 'kirpma'],
      ['b', '[teasing] Abla, buna gizli mod diyoruz.', 'kirpma'],
    ]],
  ],
  lead: [
    ['cem', 'riza', [
      ['a', '[teasing] Amca, skorun ekran görüntüsünü atayım mı?', 'kirpma'],
      ['b', '[grumbling] Çerçevelet onu, bir daha görmezsin!', 'kizgin'],
    ]],
    ['riza', 'dursun', [
      ['a', '[chuckles] Dursun, bu gidişle kahveyi bana devredersin.', 'kirpma'],
      ['b', '[laughs] Al Amca, kirası da senden olsun!', 'kahkaha'],
    ]],
    ['riza', 'defne', [
      ['a', '[chuckles] Kızım, mimarlık güzel ama pişti başka iş.', 'kirpma'],
      ['b', '[teasing] Amcacım, sizin de çatınız akıyor.', 'kirpma'],
    ]],
    ['defne', 'dursun', [
      ['a', '[playfully] Dursun Bey, defterde revizyon gerekebilir.', 'kirpma'],
      ['b', '[laughs] Silgi yok bende Defne Hanım!', 'kahkaha'],
    ]],
  ],
  lastRound: [
    ['riza', 'defne', [
      ['a', '[whispers] Son el kızım… korkuyor musun?', 'kirpma'],
      ['b', '[sweetly] Korkmak mı? Rujumu sürüyorum, Amcacım.', 'kirpma'],
    ]],
    ['cem', 'dursun', [
      ['a', '[excited] Abi son el! Bir çay, bir de şans gönder.', 'kahkaha'],
      ['b', '[laughs] Çay var, şans tükendi kardeşim!', 'kahkaha'],
    ]],
    ['dursun', 'defne', [
      ['a', '[whispers] Defne Hanım, son el… kahve yapayım mı?', 'kirpma'],
      ['b', '[sweetly] Sade olsun. Sonra falına bakarız.', 'kirpma'],
    ]],
  ],
  start: [
    ['riza', 'cem', [
      ['a', '[clears throat] Cem, kulaklığı çıkar, büyüğün konuşuyor.', 'kizgin'],
      ['b', '[chuckles] Çıkardım amca. Podkast gibi dinliyorum.', 'kirpma', T('Çıkardım amca. Podcast gibi dinliyorum.')],
    ]],
    ['dursun', 'riza', [
      ['a', '[laughs] Amca, çayın geldi! Açık mı, koyu mu?', 'kahkaha'],
      ['b', '[chuckles] Koyu olsun Dursun. Gençleri korkutacağız.', 'kirpma'],
    ]],
    ['cem', 'defne', [
      ['a', '[nervously] Defne abla… bugün çok şık olmuşsun.', 'gulumseme'],
      ['b', '[giggles] Biliyorum. Kartlarına bak, Cem.', 'kirpma'],
    ]],
    ['defne', 'dursun', [
      ['a', '[sweetly] Dursun Bey, kahvem? Mahallede ne var ne yok?', 'kirpma'],
      ['b', '[whispers] Aramızda kalsın… muhtar yine nişanlanmış!', 'kirpma'],
    ]],
  ],
  mateHype: [
    ['riza', 'cem', [
      ['a', '[proudly] Aferin Cem! Bunu algoritma mı yaptı?', 'kahkaha'],
      ['b', '[laughs] Yok amca, senden kopya çektim!', 'kahkaha'],
    ]],
    ['riza', 'dursun', [
      ['a', "[proudly] İşte benim Dursun'um! Kırk yıllık dost!", 'kahkaha'],
      ['b', '[laughs] Amca, otuz yıl! Yaşımı büyütme!', 'kahkaha'],
    ]],
    ['cem', 'dursun', [
      ['a', '[excited] Abi efsanesin! Seni storiye atıyorum!', 'kahkaha', T("Abi efsanesin! Seni story'e atıyorum!")],
      ['b', '[laughs] At at! Kahvenin reklamı olur!', 'kahkaha'],
    ]],
    ['cem', 'defne', [
      ['a', '[excited] Abla efsanesin! İmza alabilir miyim?', 'kahkaha'],
      ['b', '[sweetly] Önce kazanalım. Sonra selfie, belki.', 'kirpma'],
    ]],
    ['dursun', 'defne', [
      ['a', '[excited] Defne Hanım, bravo! Sade kahve benden!', 'kahkaha'],
      ['b', '[giggles] Köpüklü olsun Dursun Bey. Hak ettim.', 'kirpma'],
    ]],
  ],
  mateBlame: [
    ['cem', 'riza', [
      ['a', '[groans] Amca ya! O valeyi neden attın?', 'kizgin'],
      ['b', '[grumbling] Valeyi sorgulayacak yaşa gelmedin!', 'kizgin'],
    ]],
    ['dursun', 'riza', [
      ['a', '[groans] Amca, o kartta gözlüğün neredeydi?', 'saskin'],
      ['b', '[grumbling] Gözlüğüm yerinde! Çayın buğusu vurdu.', 'kizgin'],
    ]],
    ['defne', 'riza', [
      ['a', '[sighs] Amcacım, o hamle cesurdu. Yanlış ama cesur.', 'kirpma'],
      ['b', '[chuckles] Bizim zamanımızda buna strateji denirdi!', 'kirpma'],
    ]],
    ['dursun', 'cem', [
      ['a', '[groans] Cem! O kartla tepsiyi düşürecektim!', 'saskin'],
      ['b', '[annoyed] Abi, hesapta vardı! Hesapta…', 'kizgin'],
      ['a', '[laughs] Hesabı ben tutarım kardeşim!', 'kahkaha'],
    ]],
    ['defne', 'cem', [
      ['a', '[sighs] Cem, o hamleyi neye göre yaptın?', 'kirpma'],
      ['b', '[nervously] Abla… hisse göre?', 'saskin'],
      ['a', '[laughs softly] Sezgi bende canım, sende hesap.', 'kirpma'],
    ]],
    ['defne', 'dursun', [
      ['a', '[sighs] Dursun Bey… o kart neydi?', 'saskin'],
      ['b', '[laughs] İkram, Defne Hanım! İkram!', 'kahkaha'],
      ['a', '[teasing] Rakibe ikram yapılmaz, Dursun Bey.', 'kirpma'],
    ]],
  ],
};

export interface Exchange {
  id: string;
  ctx: BanterCtx;
  /** Başlatan (olayı yapan / önde olan / sitem eden). */
  a: CharId;
  /** Cevap veren. */
  b: CharId;
  lines: readonly LineRef[];
}

// ───────────────────────── hızlı sohbet (quick chat) ─────────────────────────
// Oyuncu menüden bir mesaj gönderir → mesaj OYUNCUNUN KENDİ KARAKTERİNİN sesiyle söylenir (qc_<kar>_<mesaj>_<no>).
// Bir bot (ortak / rakip) kategoriye göre cevap verebilir (qr_<kar>_<kategori>_<no>). Çevrimiçi: insan rakip kendi
// hızlı sohbetiyle cevap verir; otomatik cevap yalnız botlardan gelir. Menü sözü oyuncunun karakterine göre değişir.

export type QuickReplyCat = 'friendly' | 'praise' | 'taunt' | 'hurry' | 'wait' | 'oops' | 'bluff' | 'trust';
export interface QuickMsg {
  id: string;
  /** Menü düğmesi: OYUNCUNUN karakterine göre 3–4 kelimelik söz (≤ ~26 harf). Kimlik her karakterde aynı. */
  labels: Readonly<Record<CharId, string>>;
  /** Simge anahtarı (emoji değil; UI kendi ikonunu eşler). */
  icon: string;
  /** Gelen mesaja botların cevap kategorisi. */
  reply: QuickReplyCat;
  /** Yalnız bu oyunda gösterilir (yoksa ikisinde de). */
  game?: 'pisti' | 'blof';
}

/** Hızlı sohbet menüsü (sıra = menü sırası; kimlikler kalıcı, çevrimiçi mesaj = kimlik). */
export const QUICK_CHAT: readonly QuickMsg[] = [
  {id: 'hello', icon: 'wave', reply: 'friendly', labels: {riza: 'Selamün aleyküm, evlat', dursun: 'Hoş geldin, hoş geldin!', cem: 'Selam kanka, naber?', defne: 'Merhaba canım, hoş geldin'}},
  {id: 'gg', icon: 'handshake', reply: 'friendly', labels: {riza: 'Eline sağlık evlat', dursun: 'Helal olsun, çaylar benden', cem: 'GG kanka, temiz oyun', defne: 'Güzel oyundu, keyif aldım'}},
  {id: 'nice', icon: 'thumb', reply: 'praise', labels: {riza: 'Aferin, usta işi!', dursun: 'Bu hamleye çay içilir', cem: 'Kanka efsane hamle!', defne: 'Zarif hamle, bayıldım'}},
  {id: 'wow', icon: 'star', reply: 'praise', labels: {riza: 'Maşallah, bu ne hamle!', dursun: 'Vay, tepsiyi düşürecektim!', cem: 'Oha, yok artık ya!', defne: 'Aaa, çok etkileyici!'}},
  {id: 'lucky', icon: 'clover', reply: 'taunt', labels: {riza: 'Kör tavuk buğday buldu', dursun: 'Şansına nazar değmesin', cem: 'Sadece şans kanka, şans', defne: 'Şanslısın bugün, tatlım'}},
  {id: 'hurry', icon: 'clock', reply: 'hurry', labels: {riza: 'Hadi evlat, çay soğudu', dursun: 'Çaylar soğuyor, hadi bakalım', cem: 'Kanka biraz hızlan', defne: 'Acele etsek mi canım?'}},
  {id: 'wait', icon: 'hourglass', reply: 'wait', labels: {riza: 'Dur evlat, acele yok', dursun: 'Dur, tepsiyi bırakayım', cem: 'Bi saniye, hesaplıyorum', defne: 'Bir saniye, rujumu süreyim'}},
  {id: 'oops', icon: 'oops', reply: 'oops', labels: {riza: 'Hay aksi, gözüm kaydı', dursun: 'Eyvah, tepsi devrildi!', cem: 'Of ya, misclick oldu', defne: 'Ayy, ojem kaydı'}},
  {id: 'oh_no', icon: 'shock', reply: 'oops', labels: {riza: 'Olamaz, vah vah vah', dursun: 'Aman aman, başıma gelenler', cem: 'Hadi ya, olamaz!', defne: 'Ah hayır, olamaz'}},
  {id: 'thanks', icon: 'heart', reply: 'friendly', labels: {riza: 'Sağ olasın evlat', dursun: 'Sağ ol, eksik olma', cem: 'Eyvallah kanka, sağ ol', defne: 'Çok naziksin, teşekkürler'}},
  {id: 'tea', icon: 'tea', reply: 'friendly', labels: {riza: 'Dursun, çaylar benden!', dursun: 'Herkese çay benden!', cem: 'Çaylar benden kanka', defne: 'Kahveler benden bugün'}},
  {id: 'revenge', icon: 'swords', reply: 'taunt', labels: {riza: 'Rövanş! Kalkmak yok', dursun: 'Rövanş! Defteri açıyorum', cem: 'Rövanş kanka, hemen şimdi', defne: 'Rövanş? Seve seve.'}},
  {id: 'bluffing', icon: 'eye', reply: 'bluff', game: 'blof', labels: {riza: 'Yalanın belli, evlat!', dursun: 'Bu el blöf kokuyor', cem: 'Kanka blöf bu, belli', defne: 'Kadın sezgisi: blöf bu'}},
  {id: 'trust_me', icon: 'shield', reply: 'trust', game: 'blof', labels: {riza: 'Sözüm senettir, evlat', dursun: 'Kahvecinin sözü temizdir', cem: 'Güven bana kanka', defne: 'Bana güven, tatlım'}},
];

/** Oyuncunun karakterine göre menü (bu oyunda gösterilecekler, sırasıyla): {id, label, icon}. */
export function quickMenu(charId: string, game: 'pisti' | 'blof'): {id: string; label: string; icon: string}[] {
  const c = (CHAR_IDS as readonly string[]).includes(charId) ? (charId as CharId) : 'dursun';
  return QUICK_CHAT.filter(q => !q.game || q.game === game).map(q => ({id: q.id, label: q.labels[c], icon: q.icon}));
}

type QSay = [tts: string, opt?: Opt];
type QReply = [rel: Rel | '', tts: string, opt?: Opt];

// Söyleyişler menüdeki sözü söyler ya da doğal biçimde uzatır (ilki = düğmedeki söz).
const QC_SAY: Record<CharId, Record<string, QSay[]>> = {
  riza: {
    hello: [['[chuckles] Selamün aleyküm, evlat!'], ['[chuckles] Hoş geldin evlat, otur bakalım.']],
    gg: [['[chuckles] Eline sağlık evlat.'], ['[proudly] Eline sağlık, helal olsun.']],
    nice: [['[proudly] Aferin, usta işi!'], ['[chuckles] Aferin… bana yakışırdı bu!']],
    wow: [['[gasps] Maşallah, bu ne hamle!'], ['[surprised] Maşallah! Vay anam vay!']],
    lucky: [['[scoffs] Kör tavuk buğday buldu!'], ['[grumbling] Kör tavuk da buğday bulur.']],
    hurry: [['[grumbling] Hadi evlat, çay soğudu!'], ['[sighs] Hadi evlat… çayım buz kesti.']],
    wait: [['[clears throat] Dur evlat, acele yok.'], ['Dur evlat… usta düşünüyor.']],
    oops: [['[groans] Hay aksi, gözüm kaydı!'], ['[sighs] Hay aksi… gözlüğü takmamışım.']],
    oh_no: [['[gasps] Olamaz! Vah vah vah…'], ['[groans] Vah vah… olamaz bu.']],
    thanks: [['[chuckles] Sağ olasın evlat.'], ['[proudly] Sağ olasın, eksik olma.']],
    tea: [['[shouting] Dursun, çaylar benden!'], ['[chuckles] Dursun! Çaylar benim hesaba.']],
    revenge: [['[grumbling] Rövanş! Kalkmak yok!'], ['[proudly] Rövanş! Usta pes etmez.']],
    bluffing: [['[scoffs] Yalanın belli, evlat!'], ['[chuckles] Belli evlat, bıyığım titredi.']],
    trust_me: [['[proudly] Sözüm senettir, evlat.'], ['[chuckles] Rıza Amca yalan söyler mi?']],
  },
  dursun: {
    hello: [['[laughs] Hoş geldin, hoş geldin!'], ['Hoş geldin! Çayın geliyor!']],
    gg: [['[laughs] Helal olsun, çaylar benden!'], ['[laughs] Helal olsun! Ne maçtı be!']],
    nice: [['[excited] Bu hamleye çay içilir!'], ['[laughs] Maşallah! Çay içilir buna!']],
    wow: [['[gasps] Vay, tepsiyi düşürecektim!'], ['[laughs] Ohooo! Tepsi elimden kaydı!']],
    lucky: [['[laughs] Şansına nazar değmesin!'], ['[chuckles] Maşallah, nazar değmesin.']],
    hurry: [['[laughs] Çaylar soğuyor, hadi bakalım!'], ['[excited] Hadi hadi! Çaylar soğuyor!']],
    wait: [['[chuckles] Dur, tepsiyi bırakayım.'], ['Dur kardeşim, bir düşüneyim.']],
    oops: [['[groans] Eyvah, tepsi devrildi!'], ['[laughs] Eyvah! Olsun olsun, silerim.']],
    oh_no: [['[gasps] Aman aman, başıma gelenler!'], ['[groans] Aman aman aman…']],
    thanks: [['Sağ ol, eksik olma!'], ['[laughs] Sağ ol kardeşim! Çayın benden.']],
    tea: [['[laughs] Herkese çay benden!'], ['[excited] Herkese çay! Tavşan kanı!']],
    revenge: [['[laughs] Rövanş! Defteri açıyorum!'], ['[excited] Rövanş! Çaylar tazelensin!']],
    bluffing: [['[chuckles] Bu el blöf kokuyor!'], ['[laughs] Blöf kokuyor, kardeşim!']],
    trust_me: [['Kahvecinin sözü temizdir!'], ['[chuckles] Güven bana, sözüm çay gibi.']],
  },
  cem: {
    hello: [['[excited] Selam kanka, naber?'], ['[chuckles] Selam kanka! Hazır mısın?']],
    gg: [['[chuckles] Ci ci kanka, temiz oyun.', T('GG kanka, temiz oyun.')], ['[excited] Ci ci! Efsane maçtı kanka.', T('GG! Efsane maçtı kanka.')]],
    nice: [['[excited] Kanka efsane hamle!'], ['[laughs] Kanka bu hamle storilik!', T("Kanka bu hamle story'lik!")]],
    wow: [['[gasps] Oha, yok artık ya!'], ['[excited] Yok artık! Kanka bu ne ya?!']],
    lucky: [['[scoffs] Sadece şans kanka, şans.'], ['[laughs] Ar en ci seni seviyor kanka.', T('RNG seni seviyor kanka.')]],
    hurry: [['[sighs] Kanka biraz hızlan.'], ['[annoyed] Kanka hızlan, ey ef key mı kaldın?', T('Kanka hızlan, AFK mı kaldın?')]],
    wait: [['Bi saniye, hesaplıyorum.'], ['[whispers] Bi saniye kanka… yükleniyor.']],
    oops: [['[groans] Of ya, miskılik oldu!', T('Of ya, misclick oldu!')], ['[sighs] Miskılik kanka, sayılmaz.', T('Misclick kanka, sayılmaz.')]],
    oh_no: [['[groans] Hadi ya, olamaz!'], ['[gasps] Olamaz! Kanka ne oldu şimdi?']],
    thanks: [['[chuckles] Eyvallah kanka, sağ ol.'], ['[excited] Eyvallah aga, efsanesin!']],
    tea: [['[chuckles] Çaylar benden kanka!'], ['[chuckles] Çaylar benden, öğrenci usulü!']],
    revenge: [['[annoyed] Rövanş kanka, hemen şimdi!'], ['[excited] Rövanş! Bu sefer ciddiyim.']],
    bluffing: [['[scoffs] Kanka blöf bu, belli!'], ['[laughs] Blöf bu kanka, red fleg!', T('Blöf bu kanka, red flag!')]],
    trust_me: [['[chuckles] Güven bana kanka.'], ['[teasing] Güven bana, yüzde yüz doğru.']],
  },
  defne: {
    hello: [['[sweetly] Merhaba canım, hoş geldin.'], ['[playfully] Merhaba! Otur, kahve söyledim.']],
    gg: [['[sweetly] Güzel oyundu, keyif aldım.'], ['[giggles] Güzel oyundu… şaşırttın beni.']],
    nice: [['[giggles] Zarif hamle, bayıldım.'], ['[sweetly] Bayıldım. Ben de yapardım.']],
    wow: [['[gasps] Aaa, çok etkileyici!'], ['[laughs softly] Ooo. Etkilendim.']],
    lucky: [['[teasing] Şanslısın bugün, tatlım.'], ['[sarcastic] Şanslısın. Ne sürpriz.']],
    hurry: [['[sweetly] Acele etsek mi canım?'], ['[playfully] Canım, ojem kurudu. Hadi.']],
    wait: [['[playfully] Bir saniye, rujumu süreyim.'], ['[softly] Bir saniye… acele yok, değil mi?']],
    oops: [['[giggles] Ayy, ojem kaydı!'], ['[sighs] Hata değil… tasarım tercihi.']],
    oh_no: [['[gasps] Ah hayır, olamaz.'], ['[sighs dramatically] Olamaz… ah, canım.']],
    thanks: [['[sweetly] Çok naziksin, teşekkürler.'], ['[giggles] Teşekkürler. Utandırdın.']],
    tea: [['[sweetly] Kahveler benden bugün.'], ['[playfully] Kahveler benden. Fala bakarız.']],
    revenge: [['[teasing] Rövanş? Seve seve.'], ['[playfully] Rövanş. Topuklarımı giydim bile.']],
    bluffing: [['[teasing] Kadın sezgisi: blöf bu.'], ['[giggles] Blöf yapıyorsun, kulağın kızardı.']],
    trust_me: [['[sweetly] Bana güven, tatlım.'], ['[giggles] Güven bana… çoğunlukla.']],
  },
};

const QC_REPLY: Record<CharId, Record<QuickReplyCat, QReply[]>> = {
  riza: {
    friendly: [['', '[chuckles] Eyvallah evlat.'], ['', '[chuckles] Sağ ol, sağ ol.'], ['', '[chuckles] Heh heh…', NV]],
    praise: [['', '[proudly] Kırk yıllık usta, ne sandın?'], ['', '[chuckles] Bilirim, bilirim.'], ['', '[laughs] Hah!', NV]],
    taunt: [['opp', '[scoffs] Hıh! Görürüz bakalım.'], ['opp', '[chuckles] Dilin uzun, kartın kısa evlat.'], ['mate', '[laughs] Söyle evlat, söyle!']],
    hurry: [['opp', '[grumbling] Acele işe şeytan karışır!'], ['opp', '[proudly] Usta acele etmez.'], ['mate', '[chuckles] Tamam evlat, atıyorum.']],
    wait: [['', '[sighs] Bekleriz evlat, bekleriz.'], ['', '[grumbling] Çayım soğumadan ama!'], ['', '[sighs] Eh be…', NV]],
    oops: [['opp', '[laughs] Ha ha! Olur böyle evlat!'], ['opp', '[chuckles] Gördüm evlat, gördüm.'], ['mate', '[sighs] Üzülme evlat, toparlarız.']],
    bluff: [['', '[proudly] Ben mi? Asla!'], ['', '[chuckles] Bıyığa bak, titriyor mu?'], ['', '[scoffs] Pöh!', NV]],
    trust: [['opp', '[scoffs] Sana mı? Hiç sanmam.'], ['opp', '[chuckles] Güven iyidir, kontrol daha iyi.'], ['mate', '[chuckles] Sana güvenirim evlat.']],
  },
  dursun: {
    friendly: [['', '[laughs] Eyvallah kardeşim!'], ['', 'Sağ ol, çayın geliyor!'], ['', '[laughs] Ha ha ha!', NV]],
    praise: [['', '[laughs] Ho ho! Biliyorum, biliyorum!'], ['', 'Sağ ol! Deftere yaz bunu!'], ['', '[chuckles] Hı hı hı!', NV]],
    taunt: [['opp', '[laughs] Sözler büyük, çaylar küçük!'], ['opp', '[chuckles] Bunu deftere yazdım kardeşim.'], ['mate', '[excited] Söyle kardeşim, söyle!']],
    hurry: [['opp', '[laughs] Kahveci acele etmez!'], ['opp', '[chuckles] Tamam tamam, çay mı kaçıyor?'], ['mate', 'Geliyorum kardeşim!']],
    wait: [['', '[chuckles] Bekle sen, ben çay koyayım.'], ['', 'Rahat ol, acele yok.'], ['', '[chuckles] Heh heh…', NV]],
    oops: [['opp', '[laughs] Ha ha! Deftere yazdım!'], ['opp', '[laughs] Olur kardeşim! Çayını iç.'], ['mate', '[sighs] Boş ver ortak, toparlarız.']],
    bluff: [['', '[laughs] Ben mi? Dürüst kahveci!'], ['', '[gasps] Vay! Bana mı dedin?'], ['', '[laughs heartily] Ho ho ho!', NV]],
    trust: [['opp', '[laughs] Güvenirim, ama hesap peşin!'], ['opp', '[chuckles] Veresiye güven olmaz kardeşim.'], ['mate', 'Sana güvenirim ortak!']],
  },
  cem: {
    friendly: [['', '[excited] Aynen kanka!'], ['', '[chuckles] Sağ ol aga.'], ['', '[chuckles] Hehe.', NV]],
    praise: [['', '[teasing] Biliyorum kanka, biliyorum.'], ['', '[excited] Ana karakter enerjisi!'], ['', '[chuckles] Hehehe.', NV]],
    taunt: [['opp', '[scoffs] Kanka skor ortada, yazık.'], ['opp', '[laughs] Kanka bu laflar krinç!', T('Kanka bu laflar cringe!')], ['mate', '[excited] Söyle kanka, söyle!']],
    hurry: [['opp', '[sighs] Kanka sakin, hesaplıyorum.'], ['opp', '[scoffs] Pff, acele yok.'], ['mate', '[excited] Tamam kanka, atıyorum!']],
    wait: [['', '[chuckles] Tamam kanka, bekliyorum.'], ['', '[sighs] Kanka şarj yüzde beş…'], ['', '[sighs] Of ya…', NV]],
    oops: [['opp', '[laughs] Kanka miskılik mi oldu?', T('Kanka misclick mi oldu?')], ['opp', '[laughs] Ahahaha!', NV], ['mate', '[sighs] Sorun yok kanka, toparlarız.']],
    bluff: [['', '[gasps] Ben mi? Kanka asla!'], ['', '[teasing] Kanıtın var mı kanka?'], ['', '[scoffs] Pff…', NV]],
    trust: [['opp', '[scoffs] Kanka güven, sonra kontrol.'], ['opp', '[laughs] Bende trast işu var kanka.', T('Bende trust issue var kanka.')], ['mate', '[chuckles] Sana güveniyorum kanka.']],
  },
  defne: {
    friendly: [['', '[sweetly] Ne tatlısın.'], ['', '[giggles] Sağ ol canım.'], ['', '[giggles] Hı hı.', NV]],
    praise: [['', '[playfully] Biliyorum.'], ['', '[giggles] Teşekkürler, pratik yapıyorum.'], ['', '[sweetly] Mmm, güzel.', NV]],
    taunt: [['opp', '[teasing] Sevimli. Devam et.'], ['opp', '[giggles] Konuşmak kolay, tatlım.'], ['mate', '[teasing] Aynen öyle.']],
    hurry: [['opp', '[sweetly] Acele işi sevmem, canım.'], ['opp', '[playfully] Güzellik zaman alır.'], ['mate', '[sweetly] Geliyorum, geliyorum.']],
    wait: [['', '[sweetly] Tamam, bekliyorum.'], ['', '[softly] Acele etme.'], ['', '[softly] Peki…', NV]],
    oops: [['opp', '[giggles] Not aldım.'], ['opp', '[laughs softly] Oh, tatlım.'], ['mate', '[sweetly] Önemli değil. Toparlarız.']],
    bluff: [['', '[gasps] Ben mi? Asla.'], ['', '[giggles] Kanıtla bakalım.'], ['', '[playfully] Hıı?', NV]],
    trust: [['opp', '[sarcastic] Sana mı? Ne tatlı.'], ['opp', '[teasing] Kadın sezgim hayır diyor.'], ['mate', '[sweetly] Sana güveniyorum.']],
  },
};

/** Gelen hızlı sohbete bot cevabı: kategori başına olasılık; ortak (eşli) önce destek verir, rakip iğneler. */
export const QUICK_REPLY_RULES: Readonly<Record<QuickReplyCat, {chance: number; mateFirst: boolean}>> = {
  friendly: {chance: 0.6, mateFirst: true},
  praise: {chance: 0.55, mateFirst: false},
  taunt: {chance: 0.7, mateFirst: false},
  hurry: {chance: 0.5, mateFirst: false},
  wait: {chance: 0.35, mateFirst: false},
  oops: {chance: 0.6, mateFirst: true},
  bluff: {chance: 0.8, mateFirst: false},
  trust: {chance: 0.65, mateFirst: false},
};
/** Söyleyiş bittikten sonra cevaba kadar bekleme (ms). */
export const QUICK_REPLY_DELAY_MS: readonly [number, number] = [800, 1600];

// ───────────────────────── derleme ─────────────────────────

const lineOf = (id: string, char: CharId, moment: VoiceMoment, tts: string, mood: Pose | null, opt?: Opt, rel?: Rel): LineRef => {
  const l: LineRef = {id, char, moment, text: opt?.text ?? stripTags(tts), mood, tts};
  if (opt?.weight !== undefined) l.weight = opt.weight;
  if (opt?.stab !== undefined) l.stab = opt.stab;
  if (opt?.cd !== undefined) l.cd = opt.cd;
  if (rel) l.rel = rel;
  return l;
};

function build(char: CharId, spec: CharSpec): Partial<Record<VoiceMoment, LineRef[]>> {
  const out: Partial<Record<VoiceMoment, LineRef[]>> = {};
  const make = (key: VoiceMoment, specs: Spec[] | undefined, def: Pose | null): void => {
    if (specs?.length) out[key] = specs.map(([n, tts, mood, opt]) => lineOf(`${char}_${key}_${n}`, char, key, tts, mood === undefined ? def : mood, opt));
  };
  for (const m of [...MOMENTS, ...META_MOMENTS]) {
    const def = spec.moods && m in spec.moods ? (spec.moods[m] ?? null) : (BASE_MOODS[m] ?? null);
    make(m, spec.lines[m], def);
  }
  for (const m of BLOF_MOMENTS) make(blofKey(m), spec.blof[m], BLOF_MOOD[m]);
  for (const m of END_MOMENTS) make(m, spec.end[m], END_MOOD[m]);
  return out;
}

export const DIALOGUE: Readonly<Record<CharId, Readonly<Partial<Record<VoiceMoment, readonly LineRef[]>>>>> = {
  riza: build('riza', SPECS.riza),
  cem: build('cem', SPECS.cem),
  dursun: build('dursun', SPECS.dursun),
  defne: build('defne', SPECS.defne),
};

const BANTER_MOODS: readonly Pose[] = ['kirpma', 'gulumseme', 'kahkaha'];

function buildBanter(): Exchange[] {
  const out: Exchange[] = [];
  for (const ctx of BANTER_CTX) {
    const count = new Map<string, number>();
    for (const [a, b, lines] of BANTER_SPEC[ctx]) {
      const key = `${a}_${b}`;
      const n = (count.get(key) ?? 0) + 1;
      count.set(key, n);
      const id = `banter_${a}_${b}_${ctx}_${n}`;
      out.push({
        id, ctx, a, b,
        lines: lines.map(([who, tts, mood, opt], i) =>
          lineOf(`${id}${'abc'[i]}`, who === 'a' ? a : b, 'banter', tts, mood === undefined ? BANTER_MOODS[i] : mood, opt)),
      });
    }
  }
  return out;
}

/** Bütün atışmalar (bağlam sırasıyla). */
export const BANTER: readonly Exchange[] = buildBanter();

const QC_SAY_LINES: Record<string, LineRef[]> = {}; // `${char}:${msg}` → söyleyişler
const QC_REPLY_LINES: Record<string, LineRef[]> = {}; // `${char}:${kategori}` → cevaplar
for (const c of CHAR_IDS) {
  for (const msg of QUICK_CHAT) {
    QC_SAY_LINES[`${c}:${msg.id}`] = (QC_SAY[c][msg.id] ?? []).map(([tts, opt], i) => lineOf(`qc_${c}_${msg.id}_${i + 1}`, c, 'quickSay', tts, 'gulumseme', opt));
  }
  for (const cat of Object.keys(QUICK_REPLY_RULES) as QuickReplyCat[]) {
    QC_REPLY_LINES[`${c}:${cat}`] = QC_REPLY[c][cat].map(([rel, tts, opt], i) =>
      lineOf(`qr_${c}_${cat}_${i + 1}`, c, 'quickReply', tts, rel === 'opp' ? 'kirpma' : 'gulumseme', opt, rel || undefined));
  }
}

const EMPTY: readonly LineRef[] = [];
const BY_ID = new Map<string, LineRef>();
for (const c of CHAR_IDS) for (const ls of Object.values(DIALOGUE[c])) for (const l of ls ?? EMPTY) BY_ID.set(l.id, l);
for (const ex of BANTER) for (const l of ex.lines) BY_ID.set(l.id, l);
for (const ls of [...Object.values(QC_SAY_LINES), ...Object.values(QC_REPLY_LINES)]) for (const l of ls) BY_ID.set(l.id, l);

/**
 * Ses anahtarı: aynı karakterin birebir aynı tts'li replikleri (paylaşılan gülme / homurtu) TEK ses dosyasıdır ve
 * tekrar önlemede tek replik sayılır. Anahtar = o sesin ilk kimliği (seslendirme aracı da dosyayı bu adla yazar).
 */
const SOUND = new Map<string, string>();
{
  const first = new Map<string, string>();
  for (const l of BY_ID.values()) {
    const k = `${l.char}|${l.tts}`;
    if (!first.has(k)) first.set(k, l.id);
    SOUND.set(l.id, first.get(k)!);
  }
}
export function soundKey(id: string): string {
  return SOUND.get(id) ?? id;
}

/** Karakterin bir andaki replikleri (Pişti anı, menü anı ya da Blöf anahtarı: 'blofCallOut'). */
export function linesFor(charId: string, moment: string): readonly LineRef[] {
  const d = (DIALOGUE as Record<string, Partial<Record<string, readonly LineRef[]>> | undefined>)[charId];
  return d?.[moment] ?? EMPTY;
}

export function lineById(id: string): LineRef | undefined {
  return BY_ID.get(id);
}

/** Tüm seslendirilecek replikler (seslendirme aracı ve testler için): Pişti + menü + Blöf + atışma + hızlı sohbet. */
export function allLines(): LineRef[] {
  return [...BY_ID.values()];
}

/** El / maç sonu anı mı (Ara Skor, sonuç, rövanş, veda)? */
export function isEndMoment(m: string): m is EndMoment {
  return (END_MOMENTS as readonly string[]).includes(m);
}

/** Ses grubunu verir (araçta grup grup üretmek için): pisti | blof | meta | end | banter | quick. */
export function groupOf(l: Pick<LineRef, 'moment'>): 'pisti' | 'blof' | 'meta' | 'end' | 'banter' | 'quick' {
  const m = l.moment;
  if (m === 'banter') return 'banter';
  if (m === 'quickSay' || m === 'quickReply') return 'quick';
  if (isEndMoment(m)) return 'end';
  if (m.startsWith('blof')) return 'blof';
  return (META_MOMENTS as readonly string[]).includes(m) ? 'meta' : 'pisti';
}

/**
 * Ucuz deneme için seçki: karakter başına 4 replik (iğneleyici oyun repliği, büyük an, sessiz tepki, galeri/market)
 * + 2 atışma + 1 hızlı sohbet (söyleyiş + cevap). `node tools/voice/generate.mjs --samples` yalnız bunları üretir.
 */
export const SAMPLE_IDS: readonly string[] = [
  'riza_playerDumpedValuable_6', 'riza_botPisti_3', 'riza_botBigCapture_2', 'riza_galleryIntro_2',
  'dursun_myTurnIdle_9', 'dursun_botPisti_1', 'dursun_playerDumpedValuable_1', 'dursun_shopPitch_2',
  'cem_myTurnIdle_8', 'cem_blofCatchPlayer_2', 'cem_playerPisti_5', 'cem_shopPitch_2',
  'defne_myTurnIdle_6', 'defne_blofCatchPlayer_1', 'defne_playerDumpedValuable_1', 'defne_shopPitch_1',
  'banter_riza_cem_steal_1a', 'banter_riza_cem_steal_1b', 'banter_riza_cem_steal_1c',
  'banter_defne_cem_mateBlame_1a', 'banter_defne_cem_mateBlame_1b', 'banter_defne_cem_mateBlame_1c',
  'qc_cem_gg_1', 'qr_riza_taunt_2',
];

// ───────────────────────── konuşma sıklığı ─────────────────────────
//
// HEDEF (1'e 1 Pişti, bir el ≈ 2–2,5 dk): elde ≈ 8–12 replik → ortalama 10–18 sn'de bir ses.
//   · Her zaman (öncelik 3): el başı, pişti / vale pişti, el sonu → elde ≈ 3–5.
//   · Olay (öncelik 2): yakalamalar, değerli kart, son el, geri dönüş → olasılıklı + yorgunluk; elde ≈ 3–5.
//   · Boş laf (öncelik 1): düşünme, bekleme, boş masa, önde/geride → seyrek; elde ≈ 1–2.
//   · İki olay arası en az EVENT_GAP_MS, boş laf öncesi en az CHATTER_GAP_MS sessizlik; aynı an sık konuşursa
//     FATIGUE ile, masa son BUSY_WINDOW_MS'de çok konuştuysa BUSY_DAMP ile olasılık düşer.
//   · 3–4 kişilik masada (setSeats) olasılıklar ×0,8 / ×0,6: tek ortak yönetici olduğundan iki bot üst üste konuşmaz,
//     kişi başı konuşma 1'e 1'in yarısının altına iner.
//   · Atışma (banter): en çok 2 elde bir (≈ 2–3 elde bir), oyun dururken; aynı atışma 40 el tekrar etmez.

/**
 * always  → her zaman konuşur (pişti, el başı/sonu, Blöf açılışı).
 * event   → olay tepkisi: olasılıklı, son replikten en az EVENT_GAP_MS sonra.
 * chatter → boş laf: olasılıklı, son replikten en az CHATTER_GAP_MS sonra.
 */
export type MomentKind = 'always' | 'event' | 'chatter';
export interface MomentRule {
  kind: MomentKind;
  /** Temel konuşma olasılığı (always için yok sayılır). */
  chance: number;
  /** Ses önceliği: 3 > 2 > 1. Yüksek öncelik çalan sesi keser. */
  prio: 1 | 2 | 3;
  /** Aynı anın iki repliği arasında en az bu kadar ms. */
  selfGapMs?: number;
}

export const EVENT_GAP_MS = 3000;
export const CHATTER_GAP_MS = 10_000;
/** Aynı an son FATIGUE_WINDOW_MS içinde her konuştuğunda olasılık bu çarpanla düşer (sık anlar bıktırmasın). */
export const FATIGUE = 0.6;
export const FATIGUE_WINDOW_MS = 90_000;
/** Masa son BUSY_WINDOW_MS içinde her konuştuğunda (herhangi an) olasılık bu çarpanla düşer (geveze masa olmasın). */
export const BUSY_DAMP = 0.75;
export const BUSY_WINDOW_MS = 30_000;
/** Karakter başına tekrar edilmeyecek son replik sayısı (kalıcı: eller / oturumlar arası). */
export const HISTORY = 12;

// ───────────────────────── sohbet yoğunluğu (Sakin · Normal · Geveze) ─────────────────────────
//
// Oyuncunun seçtiği seviye bütün yöneticilerin (Pişti `dialogue`, BlofTalk) sıklık kurallarını ÇARPANLA ölçekler; büyük
// anlar (pişti, el başı/sonu, Blöf anı: kind 'always') her seviyede konuşur. Hiçbir seviye üst üste konuşma ya da
// insanın karar penceresinde atışma getirmez (tek kanal + atışma `calm` şartı aynen geçerli). "Konuşmalar" kapalıysa
// ses hiç yok; seviye balonları da (ses yokken yalnız balon) aynı ölçüde seyreltir.

export const CHAT_LEVELS = ['sakin', 'normal', 'geveze'] as const;
export type ChatLevel = (typeof CHAT_LEVELS)[number];
export const isChatLevel = (x: unknown): x is ChatLevel => (CHAT_LEVELS as readonly unknown[]).includes(x);

export interface ChatProfile {
  /** Olay tepkisi (event: yakalama, değerli kart, son el…) olasılık çarpanı */
  event: number;
  /** Boş laf (chatter: düşünme, bekleme, önde/geride, Blöf'te bekleme) olasılık çarpanı; 0 = hiç */
  chatter: number;
  /** Sessizlik aralıkları (EVENT_GAP_MS, CHATTER_GAP_MS, anın selfGapMs'i) çarpanı */
  gap: number;
  /** Atışma: BANTER_RULES.chance çarpanı (en çok 1) */
  banter: number;
  /** Atışma: BANTER_RULES.minHands çarpanı (iki atışma arası el) */
  banterHands: number;
  /** Hızlı sohbete bot cevabı olasılık çarpanı */
  reply: number;
  /** Seslendirmesiz kısa tepki (ortak sevinci, iç çekme) olasılığı */
  quip: number;
  /** Oyuncu uzun düşününce laf atma gecikmesi çarpanı */
  idle: number;
  /** Ara Skor: konuşulma olasılığı · ikinci satır (cevap) olasılığı */
  midTalk: number;
  midReply: number;
  /** Sonuç ekranı: en çok satır · ikinci satır olasılığı · üçüncü satır (rövanş çağrısı) olasılığı */
  endMax: 1 | 2 | 3;
  endReply: number;
  endRevenge: number;
  /** Ana sayfaya dönerken veda repliği olasılığı */
  bye: number;
}

/** Seviye profilleri. Normal = önceki ayar (çarpanlar 1). */
export const CHAT_PROFILES: Readonly<Record<ChatLevel, ChatProfile>> = {
  // yalnız büyük anlar: olay tepkisi seyrek, boş laf yok, atışma nadir; sonuçta tek replik
  sakin: {event: 0.4, chatter: 0, gap: 1.6, banter: 0.35, banterHands: 2, reply: 0.6, quip: 0.35, idle: 1.4, midTalk: 0.5, midReply: 0, endMax: 1, endReply: 0, endRevenge: 0, bye: 0},
  normal: {event: 1, chatter: 1, gap: 1, banter: 1, banterHands: 1, reply: 1, quip: 1, idle: 1, midTalk: 1, midReply: 0.6, endMax: 3, endReply: 1, endRevenge: 0.35, bye: 0.5},
  // kahvehane: daha çok tepki, takılma ve atışma (yine tek kanal, kararda atışma yok); sonuçta tam karşılıklı dizi
  geveze: {event: 1.5, chatter: 1.8, gap: 0.7, banter: 2, banterHands: 0.5, reply: 1.3, quip: 1, idle: 0.75, midTalk: 1, midReply: 1, endMax: 3, endReply: 1, endRevenge: 0.75, bye: 0.9},
};

let LEVEL: ChatLevel = 'normal';
/** Oyunun sohbet seviyesini ayarlar (profil ayarı; bilinmeyen değer → normal). Bütün yöneticiler bunu okur. */
export function setChatLevel(l: unknown): ChatLevel {
  LEVEL = isChatLevel(l) ? l : 'normal';
  return LEVEL;
}
export function chatLevel(): ChatLevel {
  return LEVEL;
}
export function chatProfile(l: ChatLevel = LEVEL): ChatProfile {
  return CHAT_PROFILES[l];
}

/** İlk açılış seçicisi / ayarlar: seviyenin adı, kısa açıklaması ve dinletilecek örnek (var olan sesli replikler). */
export const CHAT_LEVEL_INFO: Readonly<Record<ChatLevel, {name: string; desc: string; sample: readonly string[]}>> = {
  sakin: {name: 'Sakin', desc: 'Yalnız büyük anlar: pişti, blöf, zafer.', sample: ['qr_riza_praise_1']},
  normal: {name: 'Normal', desc: 'Tepkiler, takılmalar, ara sıra atışma.', sample: ['banter_dursun_riza_steal_1a', 'banter_dursun_riza_steal_1b']},
  geveze: {
    name: 'Geveze', desc: 'Tam kahvehane: laf lafı açar!',
    sample: ['banter_riza_cem_steal_1a', 'banter_riza_cem_steal_1b', 'banter_riza_cem_steal_1c', 'qr_dursun_friendly_3'],
  },
};

export const MOMENT_RULES: Readonly<Record<Moment, MomentRule>> = {
  start: {kind: 'always', chance: 1, prio: 3},
  botPisti: {kind: 'always', chance: 1, prio: 3},
  botJackPisti: {kind: 'always', chance: 1, prio: 3},
  playerPisti: {kind: 'always', chance: 1, prio: 3},
  playerJackPisti: {kind: 'always', chance: 1, prio: 3},
  botWin: {kind: 'always', chance: 1, prio: 3},
  playerWin: {kind: 'always', chance: 1, prio: 3},
  draw: {kind: 'always', chance: 1, prio: 3},

  botBigCapture: {kind: 'event', chance: 0.4, prio: 2},
  playerBigCapture: {kind: 'event', chance: 0.4, prio: 2},
  botJackCapture: {kind: 'event', chance: 0.35, prio: 2},
  playerJackCapture: {kind: 'event', chance: 0.35, prio: 2},
  playerDumpedValuable: {kind: 'event', chance: 0.6, prio: 2},
  botLuckyCapture: {kind: 'event', chance: 0.4, prio: 2},
  comeback: {kind: 'event', chance: 0.8, prio: 2, selfGapMs: 25_000},
  lastRound: {kind: 'event', chance: 0.6, prio: 2, selfGapMs: 60_000},
  playerFastThrow: {kind: 'event', chance: 0.4, prio: 2, selfGapMs: 15_000},

  myTurnIdle: {kind: 'chatter', chance: 1, prio: 1, selfGapMs: 12_000},
  botThinking: {kind: 'chatter', chance: 0.3, prio: 1, selfGapMs: 20_000},
  tableEmpty: {kind: 'chatter', chance: 0.3, prio: 1, selfGapMs: 25_000},
  botLeading: {kind: 'chatter', chance: 0.35, prio: 1, selfGapMs: 40_000},
  playerLeading: {kind: 'chatter', chance: 0.35, prio: 1, selfGapMs: 40_000},
};

/** Blöf anlarının kuralları (anahtar: blofKey). Blöf anı (açılış) hep konuşur; laf atmalar seyrek. */
export const BLOF_RULES: Readonly<Record<BlofKey, MomentRule>> = {
  blofStart: {kind: 'always', chance: 1, prio: 3},
  blofCallOut: {kind: 'always', chance: 1, prio: 3},
  blofCatchGloat: {kind: 'always', chance: 1, prio: 3},
  blofCatchPlayer: {kind: 'always', chance: 1, prio: 3},
  blofCaughtByPlayer: {kind: 'always', chance: 1, prio: 3},
  blofSurvived: {kind: 'always', chance: 1, prio: 3},
  blofSurvivedPlayer: {kind: 'always', chance: 1, prio: 3},
  blofBotWin: {kind: 'always', chance: 1, prio: 3},
  blofPlayerWin: {kind: 'always', chance: 1, prio: 3},
  // ikincil tepkiler (açılıştan ~1 sn sonra; çalan büyük repliği kesmez)
  blofCaught: {kind: 'always', chance: 1, prio: 2},
  blofWrongCall: {kind: 'always', chance: 1, prio: 2},
  blofPass: {kind: 'event', chance: 0.3, prio: 1, selfGapMs: 5000},
  blofBigPile: {kind: 'event', chance: 0.5, prio: 2, selfGapMs: 15_000},
  blofNearWin: {kind: 'event', chance: 0.7, prio: 2, selfGapMs: 20_000},
  blofPlayerNearWin: {kind: 'event', chance: 0.6, prio: 2, selfGapMs: 20_000},
  blofMateCheer: {kind: 'event', chance: 0.6, prio: 2, selfGapMs: 10_000},
  blofIdle: {kind: 'chatter', chance: 1, prio: 1, selfGapMs: 12_000},
};

/** Menü (galeri / market) ve oyuncunun hızlı sohbeti: her zaman, en üst öncelik. Atışma ve bot cevabı: 2. */
const META_RULE: MomentRule = {kind: 'always', chance: 1, prio: 3};
const SIDE_RULES: Readonly<Record<string, MomentRule>> = {
  banter: {kind: 'event', chance: 1, prio: 2},
  quickSay: {kind: 'always', chance: 1, prio: 3},
  quickReply: {kind: 'event', chance: 1, prio: 2},
};

/** El / maç sonu (Ara Skor, sonuç ekranı, rövanş kabulü, veda): oyun durmuşken, sıklığı planEndTalk + sohbet seviyesi belirler. */
const END_RULE: MomentRule = {kind: 'always', chance: 1, prio: 3};
/** Bilinmeyen anlar (ileride eklenecek olaylar) sıradan olay tepkisi sayılır. */
const DEFAULT_RULE: MomentRule = {kind: 'event', chance: 0.4, prio: 2};
export function ruleFor(m: string): MomentRule {
  return (
    (MOMENT_RULES as Record<string, MomentRule | undefined>)[m] ??
    (BLOF_RULES as Record<string, MomentRule | undefined>)[m] ??
    SIDE_RULES[m] ??
    ((META_MOMENTS as readonly string[]).includes(m) ? META_RULE : isEndMoment(m) ? END_RULE : DEFAULT_RULE)
  );
}

export function momentPriority(m: string): 1 | 2 | 3 {
  return ruleFor(m).prio;
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ───────────────────────── kalıcı hafıza ─────────────────────────

/** Atışma hafızası: son atışmanın eli ve her atışmanın en son söylendiği el. */
export interface BanterMemory {
  last: number;
  seen: Record<string, number>;
}

/** Kalıcı konuşma hafızası (eller / oturumlar arası): el sayacı, replik başına son duyuluş, karakterin son replikleri. */
export interface TalkMemory {
  v: 1;
  hand: number;
  seq: number;
  /** id → [el, sıra] */
  heard: Record<string, [number, number]>;
  /** karakter → son HISTORY replik kimliği (eskiden yeniye) */
  recent: Record<string, string[]>;
  banter: BanterMemory;
}

/** Hafızanın saklandığı yer (oyunda localStorage sarmalayıcısı; testte bellek). Hatalar yutulur. */
export interface TalkStore {
  load(): unknown;
  save(mem: TalkMemory): void;
}

export function freshMemory(): TalkMemory {
  return {v: 1, hand: 0, seq: 0, heard: {}, recent: {}, banter: {last: -1e9, seen: {}}};
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Saklanan veriyi doğrular (bozuksa / eski sürümse temiz hafıza). */
export function readMemory(x: unknown): TalkMemory {
  const m = freshMemory();
  if (!x || typeof x !== 'object') return m;
  const o = x as Partial<TalkMemory>;
  if (o.v !== 1) return m;
  if (isNum(o.hand)) m.hand = o.hand;
  if (isNum(o.seq)) m.seq = o.seq;
  if (o.heard && typeof o.heard === 'object')
    for (const [id, v] of Object.entries(o.heard)) if (Array.isArray(v) && isNum(v[0]) && isNum(v[1])) m.heard[id] = [v[0], v[1]];
  if (o.recent && typeof o.recent === 'object')
    for (const [c, v] of Object.entries(o.recent)) if (Array.isArray(v)) m.recent[c] = v.filter(s => typeof s === 'string').slice(-HISTORY);
  const b = o.banter;
  if (b && typeof b === 'object') {
    if (isNum(b.last)) m.banter.last = b.last;
    if (b.seen && typeof b.seen === 'object') for (const [id, h] of Object.entries(b.seen)) if (isNum(h)) m.banter.seen[id] = h;
  }
  return m;
}

// ───────────────────────── atışma seçici (saf) ─────────────────────────

export const BANTER_RULES = {
  /** İki atışma arasında en az bu kadar el (→ en çok 2 elde bir, hiç art arda değil). */
  minHands: 2,
  /** Uygun bir anda başlama olasılığı (≈ 2–3 elde bir). */
  chance: 0.35,
  /** Aynı atışma en az bu kadar el tekrar etmez. */
  repeatHands: 40,
  /** Son replikten bu kadar ms geçmeden başlamaz (büyük anın üstüne binmez). */
  quietMs: 6000,
  /** Atışmada iki satır arası (ms; önceki satırın sesi bittikten sonra). */
  lineGapMs: 450,
} as const;

export interface BanterRequest {
  game: 'pisti' | 'blof';
  ctx: BanterCtx;
  /** Başlatan bot (olayı yapan / önde olan / sitem eden) */
  a: CharId;
  /** Cevap veren bot */
  b: CharId;
  mode: '1v1' | '3' | '4' | 'esli';
  /** a ile b aynı takımda mı (eşli) */
  sameTeam: boolean;
  /** Oyun doğal olarak duruyor ya da sıra botta: oyuncu karar vermiyor, Blöf penceresi / öğretici yok. */
  calm: boolean;
  /** Son replikten beri geçen ms */
  quietForMs: number;
  /** Konuşmalar: ses + balon / yalnız balon (ses kapalı) / hiç */
  talk: 'voice' | 'bubbles' | 'off';
}

/**
 * Kurallara uyan bir atışma seçer (yoksa null). Saf: hafızayı değiştirmez (bkz. noteBanter). Sohbet seviyesi (prof)
 * olasılığı, el aralığını ve sessizlik şartını ölçekler; 1'e 1 / sakin olmayan an / kapalı her seviyede yok.
 */
export function pickBanter(req: BanterRequest, hand: number, mem: BanterMemory, rnd: () => number = Math.random, prof: ChatProfile = chatProfile()): Exchange | null {
  if (req.talk === 'off' || req.mode === '1v1' || req.a === req.b || !req.calm) return null;
  const minHands = Math.round(BANTER_RULES.minHands * prof.banterHands);
  if (req.quietForMs < BANTER_RULES.quietMs * prof.gap || hand - mem.last < minHands) return null;
  const info = BANTER_CTX_INFO[req.ctx];
  if (!info || (info.game !== 'any' && info.game !== req.game)) return null;
  if (info.team === 'mate' && (!req.sameTeam || req.mode !== 'esli')) return null;
  if (info.team === 'opp' && req.sameTeam) return null;
  const cand = BANTER.filter(e => e.ctx === req.ctx && e.a === req.a && e.b === req.b && !(e.id in mem.seen && hand - mem.seen[e.id] < BANTER_RULES.repeatHands));
  if (!cand.length || rnd() >= Math.min(1, BANTER_RULES.chance * prof.banter)) return null;
  const never = cand.filter(e => !(e.id in mem.seen));
  const pool = never.length ? never : cand;
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/** Atışma söylendi: yeni hafıza (saf). */
export function noteBanter(mem: BanterMemory, ex: Exchange, hand: number): BanterMemory {
  return {last: hand, seen: {...mem.seen, [ex.id]: hand}};
}

// ───────────────────────── hızlı sohbet seçiciler (saf) ─────────────────────────

const pickFresh = (pool: readonly LineRef[], recent: readonly string[], rnd: () => number): LineRef | null => {
  if (!pool.length) return null;
  const k = (l: LineRef): string => soundKey(l.id);
  const rec = recent.map(soundKey);
  let cand = pool.filter(l => !rec.includes(k(l)));
  if (!cand.length) cand = pool.filter(l => k(l) !== rec[rec.length - 1]);
  if (!cand.length) cand = [...pool];
  let total = 0;
  for (const l of cand) total += l.weight ?? 1;
  let r = rnd() * total;
  for (const l of cand) if ((r -= l.weight ?? 1) < 0) return l;
  return cand[cand.length - 1];
};

/** Oyuncunun mesajı, kendi karakterinin sesiyle (son söylenenleri `recent` ile verin; tekrar etmez). */
export function quickSay(charId: string, msgId: string, recent: readonly string[] = [], rnd: () => number = Math.random): LineRef | null {
  return pickFresh(QC_SAY_LINES[`${charId}:${msgId}`] ?? EMPTY, recent, rnd);
}

/** Bir botun gelen mesaja cevabı (ilişkiye uygun satırlardan; tekrar etmez). */
export function quickReply(charId: string, msgId: string, relation: Rel, recent: readonly string[] = [], rnd: () => number = Math.random): LineRef | null {
  const msg = QUICK_CHAT.find(q => q.id === msgId);
  if (!msg) return null;
  const pool = (QC_REPLY_LINES[`${charId}:${msg.reply}`] ?? EMPTY).filter(l => !l.rel || l.rel === relation);
  return pickFresh(pool, recent, rnd);
}

export interface QuickSeat {
  seat: number;
  char: CharId;
  /** İnsan (yerel oyuncu ya da çevrimiçi rakip): otomatik cevap vermez. */
  human: boolean;
  rel: Rel;
}

/**
 * Gelen hızlı sohbete en çok bir bot cevabı planlar (yoksa null). Eşlide ortak bot, mateFirst kategorilerde önce
 * destek verir; aksi hâlde rastgele bir rakip bot iğneler. `delayMs` söyleyiş BİTTİKTEN sonraki beklemedir.
 */
export function planQuickReply(
  msgId: string, seats: readonly QuickSeat[], recent: readonly string[] = [], rnd: () => number = Math.random, prof: ChatProfile = chatProfile(),
): {seat: number; char: CharId; line: LineRef; delayMs: number} | null {
  const msg = QUICK_CHAT.find(q => q.id === msgId);
  if (!msg) return null;
  const rule = QUICK_REPLY_RULES[msg.reply];
  const bots = seats.filter(s => !s.human);
  if (!bots.length || rnd() >= Math.min(0.95, rule.chance * prof.reply)) return null;
  const mates = bots.filter(s => s.rel === 'mate');
  const opps = bots.filter(s => s.rel === 'opp');
  const who = mates.length && (rule.mateFirst || !opps.length) ? mates[0] : opps.length ? opps[Math.floor(rnd() * opps.length) % opps.length] : null;
  if (!who) return null;
  const line = quickReply(who.char, msgId, who.rel, recent, rnd);
  if (!line) return null;
  const [lo, hi] = QUICK_REPLY_DELAY_MS;
  return {seat: who.seat, char: who.char, line, delayMs: Math.round(lo + rnd() * (hi - lo))};
}

// ───────────────────────── yönetici ─────────────────────────

/**
 * Konuşma durumu: kalıcı hafıza (eller / oturumlar arası tekrar önleme, atışma geçmişi) + zamanlama (sıklık).
 * Masada birden çok bot olsa da sıklık kuralı tek (ortak) olmalı: Pişti için modül düzeyindeki `dialogue`
 * örneğini kullanın (Blöf'ün kendi örneği BlofTalk içinde).
 */
export class DialogueDirector {
  /** Zaman kaynağı (ms). shouldSpeak'e verilen `now` ile aynı saat olmalı (oyunda performance.now). */
  clock: () => number = nowMs;
  /** Bu yöneticiye özel sohbet seviyesi (test); verilmezse oyunun seviyesi (setChatLevel). */
  level: ChatLevel | null = null;
  private mem: TalkMemory = freshMemory();
  private store: TalkStore | null = null;
  private crowd = 1;
  private lastAt = -Infinity;
  private lastBy = new Map<string, number>();
  private spoken = new Map<string, number[]>();
  private all: number[] = [];

  /** Kalıcı hafızayı bağlar ve yükler (aynı depo tekrar verilirse bir şey yapmaz). */
  attach(store: TalkStore | null): void {
    if (store === this.store) return;
    this.store = store;
    if (!store) return;
    try {
      this.mem = readMemory(store.load());
    } catch {
      this.mem = freshMemory();
    }
  }

  /** Okuma amaçlı hafıza (test / hata ayıklama). */
  get memory(): Readonly<TalkMemory> {
    return this.mem;
  }

  /** Masadaki koltuk sayısı: kalabalık masada olasılıklar düşer (1'e 1 = 1, 3 kişi ×0,8, 4 kişi / eşli ×0,6). */
  setSeats(n: number): void {
    this.crowd = n >= 4 ? 0.6 : n === 3 ? 0.8 : 1;
  }

  /** Yeni el: el sayacı (kalıcı) ilerler, zamanlama sıfırlanır, eski kayıtlar budanır. */
  newHand(seats?: number): void {
    this.mem.hand++;
    if (seats !== undefined) this.setSeats(seats);
    this.lastAt = -Infinity;
    this.lastBy.clear();
    this.spoken.clear();
    this.all = [];
    const keep = this.mem.hand - 60;
    for (const [id, [h]] of Object.entries(this.mem.heard)) if (h < keep) delete this.mem.heard[id];
    for (const [id, h] of Object.entries(this.mem.banter.seen)) if (h < this.mem.hand - BANTER_RULES.repeatHands) delete this.mem.banter.seen[id];
    this.save();
  }

  /** Her şeyi sıfırlar (hafıza dahil; depoya yazmaz). Testler için. */
  reset(): void {
    this.mem = freshMemory();
    this.crowd = 1;
    this.lastAt = -Infinity;
    this.lastBy.clear();
    this.spoken.clear();
    this.all = [];
  }

  private save(): void {
    if (!this.store) return;
    try {
      this.store.save(this.mem);
    } catch {
      /* depo yok / dolu */
    }
  }

  /** Geçerli sohbet profili (yöneticinin kendi seviyesi ya da oyunun). */
  get profile(): ChatProfile {
    return chatProfile(this.level ?? LEVEL);
  }

  /**
   * Bu anda konuşulsun mu? true dönerse konuşma kaydedilir (sonraki çağrıların bekleme süresi başlar). Sohbet seviyesi
   * olay / boş laf olasılığını ve sessizlik aralıklarını ölçekler ('always' anlar her seviyede konuşur).
   */
  shouldSpeak(moment: string, now: number = this.clock(), rnd: () => number = Math.random): boolean {
    const r = ruleFor(moment);
    if (r.kind !== 'always') {
      const p = this.profile;
      const mult = r.kind === 'chatter' ? p.chatter : p.event;
      if (mult <= 0) return false;
      if (now - this.lastAt < (r.kind === 'chatter' ? CHATTER_GAP_MS : EVENT_GAP_MS) * p.gap) return false;
      const last = this.lastBy.get(moment);
      if (r.selfGapMs && last !== undefined && now - last < r.selfGapMs * p.gap) return false;
      const same = count(this.spoken.get(moment), now, FATIGUE_WINDOW_MS);
      const busy = count(this.all, now, BUSY_WINDOW_MS);
      if (rnd() >= Math.min(1, r.chance * mult) * this.crowd * Math.pow(FATIGUE, same) * Math.pow(BUSY_DAMP, busy)) return false;
    }
    this.note(moment, now);
    return true;
  }

  /** Seslendirmesiz kısa tepki (ortak sevinci, iç çekme) söylensin mi: seviyenin quip olasılığı. */
  allowQuip(rnd: () => number = Math.random): boolean {
    return rnd() < this.profile.quip;
  }

  /** Oyuncu uzun düşününce laf atma gecikmesi (ms): seviyeye göre (Geveze daha erken, Sakin'de boş laf zaten yok). */
  idleDelay(baseMs: number): number {
    return Math.round(baseMs * this.profile.idle);
  }

  private note(moment: string, now: number): void {
    this.lastAt = Math.max(this.lastAt, now);
    this.lastBy.set(moment, now);
    const times = this.spoken.get(moment) ?? [];
    times.push(now);
    while (times.length > 8) times.shift();
    this.spoken.set(moment, times);
    this.all.push(now);
    while (this.all.length > 16) this.all.shift();
  }

  private cooling(l: Line): boolean {
    const h = this.mem.heard[soundKey(l.id)];
    return !!h && this.mem.hand - h[0] < cooldownHands(l);
  }

  /**
   * Anın repliklerinden birini seçer. Öncelik sırası: (1) karakterin son HISTORY repliğinde olmayan ve tekrar
   * beklemesi (cooldownHands: uzun espri ~25 el, kısa ses hemen) dolmuş replikler; (2) son HISTORY'de olmayanlar
   * içinde en uzun süredir duyulmayanlar; (3) hepsi yakın zamanda söylendiyse en eskiler (son söylenen asla hemen
   * tekrar etmez). Hafıza kalıcıdır (attach). Her zaman konuşulan anlar shouldSpeak'ten geçmeden de çağrılabilir:
   * seçilince konuşma zamanı yine kaydedilir, böylece boş laflar hemen arkasından gelmez.
   */
  pickLine(charId: string, moment: string, rnd: () => number = Math.random): Line | null {
    return this.pickAny(charId, [moment], rnd);
  }

  /**
   * pickLine'ın çok anlı biçimi: birkaç anın replikleri TEK havuz sayılır (ör. sonuçta 'endGloat' + 'botWin'), seçim
   * aynı kurallarla (karakterin son replikleri, tekrar beklemesi, ağırlık). Konuşma zamanı ilk anın adıyla kaydedilir.
   */
  pickAny(charId: string, moments: readonly string[], rnd: () => number = Math.random): Line | null {
    const pool = moments.length === 1 ? linesFor(charId, moments[0]) : moments.flatMap(mo => linesFor(charId, mo));
    if (!pool.length) return null;
    const moment = moments[0];
    if (ruleFor(moment).kind === 'always') {
      const t = this.clock();
      if (t > this.lastAt) this.note(moment, t);
    }
    const m = this.mem;
    const hist = m.recent[charId] ?? [];
    const key = (l: Line): string => soundKey(l.id); // paylaşılan ses = tek replik
    const age = (l: Line): number => m.heard[key(l)]?.[1] ?? -1;
    let cand: readonly Line[] = pool.filter(l => !hist.includes(key(l)) && !this.cooling(l));
    if (!cand.length) {
      const rest = pool.filter(l => !hist.includes(key(l)));
      const base = rest.length ? rest : pool.filter(l => key(l) !== hist[hist.length - 1]);
      const byAge = [...(base.length ? base : pool)].sort((a, b) => age(a) - age(b));
      cand = byAge.slice(0, Math.max(1, Math.floor(pool.length / 3)));
    }
    let total = 0;
    const w = cand.map(l => (total += l.weight ?? 1, l.weight ?? 1));
    let r = rnd() * total;
    let pick = cand[cand.length - 1];
    for (let i = 0; i < cand.length; i++) {
      r -= w[i];
      if (r < 0) {
        pick = cand[i];
        break;
      }
    }
    const pk = key(pick);
    const i = hist.indexOf(pk);
    if (i >= 0) hist.splice(i, 1);
    hist.push(pk);
    while (hist.length > HISTORY) hist.shift();
    m.recent[charId] = hist;
    m.heard[pk] = [m.hand, ++m.seq];
    this.save();
    return pick;
  }

  /**
   * Sıklık kuralını atlayarak konuş (zorunlu an): konuşma zamanı yine kaydedilir. Boş laf (chatter) türündeki anlar
   * (ör. Blöf'te oyuncu uzun düşününce) sohbet seviyesi boş lafı kapatmışsa (Sakin) yine susar.
   */
  force(charId: string, moment: string, rnd: () => number = Math.random): Line | null {
    if (!linesFor(charId, moment).length) return null;
    if (ruleFor(moment).kind === 'chatter' && this.profile.chatter <= 0) return null;
    this.note(moment, this.clock());
    return this.pickLine(charId, moment, rnd);
  }

  /** shouldSpeak + pickLine. Karakterin bu an için repliği yoksa sıklık sayacına dokunmaz. */
  react(charId: string, moment: string, now: number = this.clock(), rnd: () => number = Math.random): Line | null {
    if (!linesFor(charId, moment).length) return null;
    if (!this.shouldSpeak(moment, now, rnd)) return null;
    return this.pickLine(charId, moment, rnd);
  }

  /**
   * Atışma dener (pickBanter + kalıcı hafıza). Seçilirse kaydedilir; satırları çağıran sırayla oynatır.
   * req.quietForMs verilirse son replikten beri geçen süre yerine o kullanılır: atışma bir olay tepkisinin YERİNE
   * söylenecekse (yakalama, blöf yakalandı) konuşma yöneticisi zaten sırayla söyletir, üst üste binmez.
   */
  banter(req: Omit<BanterRequest, 'quietForMs'> & {quietForMs?: number}, now: number = this.clock(), rnd: () => number = Math.random): Exchange | null {
    const ex = pickBanter({...req, quietForMs: req.quietForMs ?? now - this.lastAt}, this.mem.hand, this.mem.banter, rnd, this.profile);
    if (!ex) return null;
    this.mem.banter = noteBanter(this.mem.banter, ex, this.mem.hand);
    this.note('banter', now);
    this.save();
    return ex;
  }
}

function count(times: readonly number[] | undefined, now: number, win: number): number {
  let n = 0;
  if (times) for (const t of times) if (now - t < win) n++;
  return n;
}

/** Oyunun (Pişti) ortak konuşma durumu. */
export const dialogue = new DialogueDirector();

export function pickLine(charId: string, moment: string, rnd: () => number = Math.random): Line | null {
  return dialogue.pickLine(charId, moment, rnd);
}

export function shouldSpeak(moment: string, now: number = dialogue.clock(), rnd: () => number = Math.random): boolean {
  return dialogue.shouldSpeak(moment, now, rnd);
}

export function react(charId: string, moment: string, now: number = dialogue.clock(), rnd: () => number = Math.random): Line | null {
  return dialogue.react(charId, moment, now, rnd);
}

/** El başında: kalıcı hafızayı bağla (bir kez), el sayacını ilerlet, masa kalabalığını ayarla. */
export function beginDialogueHand(seats: number, store?: TalkStore | null): void {
  if (store !== undefined) dialogue.attach(store);
  dialogue.newHand(seats);
}

export function resetDialogue(): void {
  dialogue.reset();
}

// ───────────────────────── el / maç sonu karşılıklı konuşma (Ara Skor + sonuç ekranı) ─────────────────────────
//
// Sonuç ekranında ve Ara Skor'da kısa bir karşılıklı dizi: A söyler, B cevaplar, ara sıra C (rövanş çağrısı). Satırlar
// rol havuzlarından (END_MOMENTS + var olan botWin / playerWin / botLeading / playerLeading / comeback / draw) bağlama göre
// seçilir; kalıcı tekrar önleme yöneticiden (pick → DialogueDirector.pickAny) gelir, böylece diziler hep değişir.
//  · 1'e 1 / 3 / 4 kişi: kazanan bot oyuncuya takılır (ya da kaybeden bot söylenir); ikinci ses başka bir bot ya da
//    1'e 1'de kenardan bir seyirci (masada olmayan karakter; kahveci Dursun öncelikli).
//  · Eşli: bot ortağın oyuncuya ("ortak") sözü + rakibin cevabı, ya da rakip takımın iki botu birbirine (övgü / sitem).
//  · Koşullar: kıl payı / ezici fark, oyuncunun serisi, pişti yağmuru, Blöf'te çok yakalanma / hiç yakalanmama / son kart blöfü.
//  · Sohbet seviyesi: Sakin tek satır (Ara Skor'da yarı yarıya), Normal A+B (rövanş ara sıra), Geveze A+B+C.

/** Masadaki bir koltuk (planEndTalk için): insan konuşmaz; side = taraf (eşlide takım, diğerlerinde koltuk). */
export interface EndSeat {
  seat: number;
  char: CharId;
  human: boolean;
  side: number;
}

/** El / maç sonu bağlamı (uygulama hesaplar). Oyuncunun tarafı = insan koltuğunun side'ı. */
export interface EndFacts {
  scene: 'results' | 'interim';
  game: 'pisti' | 'blof';
  mode: '1v1' | '3' | '4' | 'esli';
  seats: readonly EndSeat[];
  /** Sonuç: oyuncunun (takımının) sonucu · Ara Skor: oyuncunun durumu (win = tek başına önde, lose = rakip önde, draw = eşit) */
  outcome: 'win' | 'lose' | 'draw';
  /** Kazanan / önde olan taraflar */
  leaders: readonly number[];
  /** Taraflar iyiden kötüye */
  order: readonly number[];
  /** Ara Skor: bu elden ÖNCE önde olanlar (geri dönüş için) */
  prevLeaders?: readonly number[];
  /** Kıl payı · ezici fark */
  close?: boolean;
  big?: boolean;
  /** Oyuncunun galibiyet serisi sürüyor (≥ 3) */
  streak?: boolean;
  /** Pişti: oyuncu bu maçta çok pişti yaptı */
  pistiHeavy?: boolean;
  /** Blöf: oyuncunun blöfleri çok yakalandı */
  caughtLot?: boolean;
  /** Blöf: oyuncu hiç yakalanmadan blöf yaptı ya da çok blöf yakaladı */
  sly?: boolean;
  /** Blöf: oyuncu eli son kart blöfüyle bitirdi */
  lastBluff?: boolean;
  /** Sonuç: "Bir El Daha / Yeni Maç" düğmesi var (rövanş çağrısı olabilir) */
  rematch?: boolean;
  /** Masada olmayan, kenardan laf atabilecek karakterler (1'e 1'de ikinci ses) */
  spectators?: readonly CharId[];
}

export interface EndLine {
  /** Konuşanın koltuğu; seyirci (masada değil) −1 */
  seat: number;
  char: CharId;
  line: Line;
  /** Rol (seçilen an grubunun ilki: 'endGloat', 'endRevenge', 'midSide' …) */
  role: string;
}

/** Replik seçici: karakterin şu anlarından biri, TEK havuz (oyunda DialogueDirector.pickAny; kalıcı tekrar önleme). */
export type EndPick = (char: CharId, moments: readonly string[]) => Line | null;

/** Seyirci: masada olmayan biri; kahvenin sahibi Dursun öncelikli (sabit sıra: ses paketi maç başında hazırlanabilsin). */
export function spectatorFor(atTable: readonly string[]): CharId | null {
  const order: CharId[] = ['dursun', 'riza', 'defne', 'cem'];
  return order.find(c => !atTable.includes(c)) ?? null;
}

/** Oyuncu kazandı: kaybeden botun koşullu repliği (öncelik sırasıyla) ya da null. */
function sulkRole(f: EndFacts): EndMoment | null {
  if (f.game === 'blof' && f.lastBluff) return 'endSulkLast';
  if (f.game === 'blof' && f.sly) return 'endSulkSly';
  if (f.streak) return 'endSulkStreak';
  if (f.game === 'pisti' && f.pistiHeavy) return 'endSulkPisti';
  if (f.big) return 'endSulkBig';
  if (f.close) return 'endSulkClose';
  return null;
}

/** Oyuncu kaybetti: kazanan botun koşullu repliği ya da null. */
function gloatRole(f: EndFacts): EndMoment | null {
  if (f.game === 'blof' && f.caughtLot) return 'endGloatCaught';
  if (f.big) return 'endGloatBig';
  if (f.close) return 'endGloatClose';
  return null;
}

/** Koşullu replik bulunursa çoğunlukla o söylenir (hep aynı koşulda bile genel havuz arada bir karışır). */
const COND_P = 0.85;
const REVENGE_RX = /rövanş/i;

/**
 * El / maç sonu karşılıklı dizisini planlar (en çok 3 satır; aynı kişi art arda konuşmaz; "rövanş" iki kez geçmez).
 * Saf: seçimi `pick` yapar (oyunda kalıcı hafızalı yönetici), rastgelelik `rnd`, seviye `prof`.
 */
export function planEndTalk(f: EndFacts, pick: EndPick, rnd: () => number = Math.random, prof: ChatProfile = chatProfile()): EndLine[] {
  const me = f.seats.find(s => s.human);
  const mySide = me ? me.side : -1;
  const bots = f.seats.filter(s => !s.human);
  if (!bots.length) return [];
  const mates = bots.filter(s => s.side === mySide);
  const foes = bots.filter(s => s.side !== mySide);
  const rank = (s: EndSeat): number => {
    const i = f.order.indexOf(s.side);
    return i < 0 ? 99 : i;
  };
  const one = <T>(xs: readonly T[]): T | undefined => (xs.length ? xs[Math.floor(rnd() * xs.length) % xs.length] : undefined);
  const specChar = f.spectators?.find(c => !f.seats.some(s => s.char === c));
  const spectator: {seat: number; char: CharId} | undefined = specChar ? {seat: -1, char: specChar} : undefined;
  /** İkinci ses: A'dan başka bir bot (önce `pref` içinden), yoksa seyirci. */
  const other = (a: {char: CharId} | undefined, pref: readonly EndSeat[] = bots): {seat: number; char: CharId} | undefined =>
    one(pref.filter(s => s.char !== a?.char)) ?? one(bots.filter(s => s.char !== a?.char)) ?? spectator;
  /** Rastgele sırayla iki havuzdan biri (ilkinde replik yoksa öbürü). */
  const either = (a: readonly string[], b: readonly string[]): readonly (readonly string[])[] => (rnd() < 0.5 ? [a, b] : [b, a]);

  type Step = {who: {seat: number; char: CharId} | undefined; pools: readonly (readonly string[])[]};
  const steps: Step[] = [];
  const add = (who: Step['who'], ...pools: (readonly string[])[]): void => void steps.push({who, pools});

  if (f.scene === 'interim') {
    if (rnd() >= prof.midTalk) return [];
    const myLead = f.leaders.length === 1 && f.leaders[0] === mySide;
    const theirLead = f.leaders.length === 1 && f.leaders[0] !== mySide;
    const back = theirLead && f.prevLeaders?.length === 1 && f.prevLeaders[0] === mySide; // bot geriden gelip öne geçti
    const ahead = (): readonly (readonly string[])[] => (back ? [['comeback'], ['botLeading']] : either(['botLeading'], ['midAhead']));
    if (f.mode === 'esli') {
      const mate = mates[0];
      const foe = one(foes);
      if (myLead) {
        if (mate) add(mate, ['midMateUp']);
        add(foe, ...either(['playerLeading'], ['midBehind']));
      } else if (theirLead) {
        add(foe, ...ahead());
        if (mate) add(mate, ['midMateDown']);
      } else {
        const a = one(bots);
        add(a, ['midSide']);
        add(other(a), ['midSide']);
      }
    } else {
      if (myLead) {
        const chaser = [...foes].sort((x, y) => rank(x) - rank(y))[0];
        add(chaser, ...either(['playerLeading'], ['midBehind']));
        add(other(chaser), ['midSide']);
      } else if (theirLead) {
        const leader = bots.find(s => s.side === f.leaders[0]) ?? one(foes);
        add(leader, ...ahead());
        add(other(leader), ['midSide']);
      } else {
        const a = one(bots);
        add(a, ['midSide']);
        add(other(a), ['midSide']);
      }
    }
    const n = rnd() < prof.midReply ? 2 : 1;
    return run(steps.slice(0, n));
  }

  // ---- sonuç ekranı ----
  const won = f.outcome === 'win';
  const lost = f.outcome === 'lose';
  const cond = won ? sulkRole(f) : lost ? gloatRole(f) : null;
  const useCond = !!cond && rnd() < COND_P;
  const blof = f.game === 'blof';
  /** A'nın havuzları: koşullu → genel (yeni kısa replikler ya da var olan kazanma / kaybetme replikleri). */
  const aPools = (generic: readonly (readonly string[])[]): readonly (readonly string[])[] => (useCond && cond ? [[cond], ...generic] : generic);
  const gloat = either(['endGloat'], [blof ? 'blofBotWin' : 'botWin']);
  const sulk = either(['endSulk'], [blof ? 'blofPlayerWin' : 'playerWin']);
  if (f.outcome === 'draw') {
    const a = one(bots);
    add(a, ['draw'], ['midSide']);
    add(other(a), ['midSide']);
  } else if (f.mode === 'esli') {
    const mate = mates[0];
    const [f1, f2] = rnd() < 0.5 ? [foes[0], foes[1]] : [foes[1], foes[0]];
    const v = rnd();
    if (mate && v < 0.45) {
      // ortak bize, rakip cevap verir
      add(mate, [won ? 'endMateWin' : 'endMateLose']);
      add(f1 ?? f2, ...(useCond && cond ? [[cond]] : []), [won ? 'endFoeLose' : 'endFoeWin']);
    } else if (f1 && f2 && v < 0.75) {
      // rakip takımın iki botu birbirine (kazandılarsa övgü, kaybettilerse sitem)
      add(f1, [won ? 'endDuoLoseA' : 'endDuoWinA']);
      add(f2, [won ? 'endDuoLoseB' : 'endDuoWinB']);
    } else {
      // rakip bize takılır / söylenir, ortak bize döner
      add(f1 ?? f2, ...aPools([[won ? 'endFoeLose' : 'endFoeWin']]));
      if (mate) add(mate, [won ? 'endMateWin' : 'endMateLose']);
    }
  } else {
    // 1'e 1 / 3 / 4 kişi
    const losers = [...foes].sort((x, y) => rank(x) - rank(y));
    const a = won ? (rnd() < 0.7 ? losers[0] : one(losers)) : (foes.find(s => f.leaders.includes(s.side)) ?? one(foes));
    const b = won ? other(a) : other(a, foes.filter(s => !f.leaders.includes(s.side)));
    const join: readonly string[] = [won ? 'endJoinLose' : 'endJoinWin'];
    if (f.mode === '1v1' && b && b.seat < 0 && !useCond && rnd() < 0.4) {
      // 1'e 1: önce kenardan seyirci, sonra masadaki bot
      add(b, join);
      add(a, ...(won ? sulk : gloat));
    } else {
      add(a, ...aPools(won ? sulk : gloat));
      add(b, join);
    }
  }
  const plan = run(steps.slice(0, prof.endMax <= 1 || rnd() >= prof.endReply ? 1 : 2));
  // rövanş çağrısı (C): rakip bir bot, son konuşan değil; "rövanş" zaten geçtiyse yok
  if (prof.endMax >= 3 && f.rematch && plan.length >= 1 && rnd() < prof.endRevenge && !plan.some(p => REVENGE_RX.test(p.line.text))) {
    const last = plan[plan.length - 1];
    const by = foes.filter(s => s.char !== last.char);
    const who = by.find(s => plan.some(p => p.char === s.char)) ?? one(by);
    if (who) {
      const c = run([{who, pools: [['endRevenge']]}]);
      plan.push(...c);
    }
  }
  return plan;

  function run(list: readonly Step[]): EndLine[] {
    const res: EndLine[] = [];
    for (const s of list) {
      if (!s.who) continue;
      if (res.length && res[res.length - 1].char === s.who.char) continue;
      for (const pool of s.pools) {
        const line = pick(s.who.char, pool);
        if (line) {
          res.push({seat: s.who.seat, char: s.who.char, line, role: pool[0]});
          break;
        }
      }
    }
    return res;
  }
}

/** Rövanş kabulü (yeni maçın açılışı) ve veda için konuşacak rakip: rövanş çağıran → sonuçta konuşan rakip → ilk rakip. */
export function endChallenger(plan: readonly EndLine[], seats: readonly EndSeat[]): EndSeat | null {
  const me = seats.find(s => s.human);
  const foes = seats.filter(s => !s.human && (!me || s.side !== me.side));
  const rev = plan.find(p => p.role === 'endRevenge');
  const said = [...plan].reverse().find(p => foes.some(s => s.char === p.char));
  const c = rev?.char ?? said?.char;
  return foes.find(s => s.char === c) ?? foes[0] ?? null;
}
