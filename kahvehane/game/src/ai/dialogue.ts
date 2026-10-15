// Kahvehane Pişti — konuşma replikleri (TEK KAYNAK) + replik seçimi + konuşma sıklığı.
//
// Bu dosya iki yerde çalışır:
//  1) Oyunda (Vite): pickLine / shouldSpeak / react ile hangi anda hangi replik söylenecek.
//  2) Seslendirme aracında (tools/voice/generate.mjs): Node 22 bu dosyayı tip ayıklamayla DOĞRUDAN import eder.
//     Bu yüzden: yalnızca "silinebilir" TS sözdizimi (enum / namespace / parametre özelliği YOK) ve çalışma
//     zamanında başka modül import edilmez (yalnızca `import type`).
//
// Replik ekleme kuralı: her satır [no, tts, mood?, {text?, weight?}]. Kimlik = `${karakter}_${an}_${no}` ve
// ses dosyasının adıdır; numaraları DEĞİŞTİRMEYİN (yeni replik = yeni numara). `text` verilmezse balondaki yazı,
// tts'ten [ses etiketleri] silinerek çıkarılır. `mood` verilmezse karakterin o an için varsayılan duygusu kullanılır;
// `null` = duygu kartı yok. `tts` ElevenLabs v3 ses etiketleri içerir: [laughs], [sighs], [whispers] ...
import type {Mood} from './characters';

export type CharId = 'riza' | 'cem' | 'dursun' | 'defne';
export const CHAR_IDS: readonly CharId[] = ['riza', 'cem', 'dursun', 'defne'];

export const MOMENTS = [
  'start', // el başladı
  'myTurnIdle', // oyuncu 6 sn'den uzun düşünüyor (rakip bekliyor)
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
  'playerFastThrow', // oyuncu kartı çok sert fırlattı
  'tableEmpty', // masa boş ve sıra botta
] as const;
export type Moment = (typeof MOMENTS)[number];

export interface Line {
  id: string;
  /** Konuşma balonundaki yazı. */
  text: string;
  /** Duygu kartı; null = yok. */
  mood?: Mood | null;
  /** ElevenLabs v3 metni: aynı cümle + köşeli parantezli ses etiketleri. */
  tts: string;
  /** Seçilme ağırlığı (varsayılan 1). */
  weight?: number;
}

export interface LineRef extends Line {
  char: CharId;
  moment: Moment;
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

type Spec = [n: number, tts: string, mood?: Mood | null, opt?: {text?: string; weight?: number}];
type CharSpec = {moods: Partial<Record<Moment, Mood>>; lines: Partial<Record<Moment, Spec[]>>};

// ───────────────────────── RIZA AMCA ─────────────────────────
// 72, kırk yıllık usta, gri kasket, beyaz pala bıyık, kehribar tespih. Çay sever, biraz huysuz ama tatlı.
// Oyuncuya "evlat" der, eski günleri, tavlayı ve kahvenin müdavimlerini (Kahveci Dursun, Muhtar) anar.

const RIZA: CharSpec = {
  moods: {
    botPisti: 'kahkaha', botJackPisti: 'kahkaha', playerPisti: 'kizgin', playerJackPisti: 'saskin',
    botBigCapture: 'kahkaha', playerBigCapture: 'kizgin', botJackCapture: 'kahkaha', playerJackCapture: 'kizgin',
    playerDumpedValuable: 'kahkaha', botLuckyCapture: 'kahkaha', botLeading: 'kahkaha', playerLeading: 'kizgin',
    comeback: 'kahkaha', botWin: 'kahkaha', playerWin: 'uzgun', draw: 'saskin', playerFastThrow: 'saskin',
  },
  lines: {
    start: [
      [1, '[chuckles] Otur bakalım evlat. Kağıtlar karıldı, çaylar demlendi.'],
      [2, '[clears throat] Kırk yıldır bu masadayım. Hoş geldin evlat.'],
      [3, '[mischievously] Bakalım bugün çayları kim ısmarlayacak?'],
      [4, '[shouting] Dursun! İki çay… biri açık olsun!'],
      [5, '[chuckles] Gözlüğümü taktım evlat, kaçarın yok.'],
    ],
    myTurnIdle: [
      [1, '[sighs] Kart atıyoruz evlat, kız istemiyoruz!', null, {weight: 1.3}],
      [2, '[sighs] Evlat… çayım soğudu.'],
      [3, '[grumbling] Tespihi üç tur çektim, hâlâ düşünüyor!'],
      [4, '[chuckles] Hadi yeğenim, kahvehane kapanacak!'],
      [5, '[annoyed] Satranç oynamıyoruz, at şu kartı!'],
      [6, '[sighs] Sen düşünürken ben üç el tavla bitirdim.'],
    ],
    botThinking: [
      [1, '[thoughtful] Hımm… dur bakalım.'],
      [2, '[clears throat] Sabret evlat, usta düşünüyor.'],
      [3, '[thoughtful] Bu kart… yok yok, şu kart.'],
      [4, '[grumbling] Gözlüğüm nerede benim yahu?'],
      [5, '[whispers] İki vale çıktı… bir as gitti…'],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Çaylar senden evlat!', null, {weight: 1.2}],
      [2, '[excited] Pişti! Ustaya saygı, delikanlı!'],
      [3, '[laughs] Fırından yeni çıktı, sıcak sıcak pişti!'],
      [4, '[chuckles] Ders bir: Pişti. Not al evlat.'],
      [5, '[laughs] Pişti! Dursun, buraya bir çay daha!'],
      [6, '[proudly] Pişti! Bu oyunu ben icat ettim evlat!'],
    ],
    botJackPisti: [
      [1, '[laughs harder] Vale pişti! Bunu çerçeveletip asacağım!'],
      [2, '[laughs] Vale pişti! Çağırın muhtarı, tutanak tutsun!'],
      [3, '[excited] Yirmi puan! Torunlarıma anlatacağım bunu!'],
      [4, '[laughs] Vale pişti! Bu kahvede yıllarca anlatılır!'],
    ],
    playerPisti: [
      [1, '[annoyed] Hay aksi!'],
      [2, '[sighs] Tesadüf… tesadüf.', 'uzgun'],
      [3, '[snorts] Hıh! Acemi şansı derler buna.'],
      [4, '[grumbling] Gözüm çaya dalmıştı… saymaz bu!'],
      [5, '[sighs] Dursun… al şu çayı, tadım kaçtı.', 'uzgun'],
      [6, '[surprised] Vay vay vay… bana pişti ha?', 'saskin'],
    ],
    playerJackPisti: [
      [1, '[appalled] Olamaz! Vale pişti mi?!'],
      [2, '[surprised] Kim öğretti sana bunu evlat?!'],
      [3, '[sighs] Kırk yılda bir olur… o da bana denk geldi.', 'uzgun'],
      [4, '[whispers] Bunu kimseye anlatmıyoruz, tamam mı?'],
    ],
    botBigCapture: [
      [1, "[chuckles] Masa temizlendi. Dursun'a iş bırakmadım."],
      [2, '[happy] Gel bakalım… gel gel gel.'],
      [3, '[laughs] Hepsi benim! Bereketli el bu!'],
      [4, '[mischievously] Hasat zamanı evlat.'],
    ],
    playerBigCapture: [
      [1, '[grumbling] Az kalsın benimdi o…'],
      [2, '[sarcastic] Masayı süpürdün, faraş da ister misin?'],
      [3, '[sighs] Afiyet olsun evlat… şimdilik.', 'uzgun'],
    ],
    botJackCapture: [
      [1, '[chuckles] Vale her kapıyı açar evlat.'],
      [2, '[mischievously] Valeyi tam bunun için saklamıştım.'],
      [3, '[laughs] Vale geldi, masa gitti!'],
      [4, '[proudly] Sabreden usta muradına erer!'],
    ],
    playerJackCapture: [
      [1, '[suspicious] Valeyi saklıyordun demek…'],
      [2, '[grumbling] Bu numarayı benden öğrendin, biliyorum.'],
      [3, '[surprised] Vay tilki vay!', 'saskin'],
      [4, '[sighs] Valeleri saymıştım halbuki… yaşlandık.', 'uzgun'],
    ],
    playerDumpedValuable: [
      [1, '[laughs] Hediye mi bu? Sağ ol evlat!'],
      [2, '[chuckles] O kart masada bırakılır mı hiç?'],
      [3, '[laughs] Bayram değil seyran değil, bu ikram niye?', null, {weight: 1.2}],
      [4, '[laughs] Kırk yıldır böyle cömert rakip görmedim!'],
    ],
    botLuckyCapture: [
      [1, '[chuckles] Şans da ustayı sever.'],
      [2, '[clears throat] Hesaplamıştım onu… aşağı yukarı.', null],
      [3, '[whispers] Bunu planladım diyeceğim, sen de inan.', null],
    ],
    lastRound: [
      [1, '[thoughtful] Son eller evlat, gözünü dört aç.'],
      [2, '[mischievously] Son dağıtım… kalan kartlar hep kafamda.'],
      [3, '[chuckles] Deste bitiyor, hesaplar kapanıyor.'],
    ],
    botLeading: [
      [1, '[chuckles] Skora bakma evlat, üzülürsün.'],
      [2, '[chuckles] Üzülme, ben de yetmiş dörtte bir kere kaybettim.', null, {weight: 0.7}],
      [3, '[proudly] Dursun, gel bak! Ders veriyorum.'],
    ],
    playerLeading: [
      [1, '[clears throat] Acele etme evlat, maç doksan dakika.'],
      [2, '[grumbling] Daha ısınıyorum, dur bakalım.'],
      [3, '[whispers] Skoru yüksek sesle söyleme, kahve duymasın.', null],
    ],
    comeback: [
      [1, '[laughs] Kurt kocadı sandın, değil mi?'],
      [2, '[excited] Döndük mü? Döndük!'],
      [3, '[proudly] Kenara çekil evlat, usta geliyor!'],
    ],
    botWin: [
      [1, '[chuckles] Ustaya saygı delikanlı. Bir el daha?'],
      [2, '[laughs] Çaylar senden, unutma!'],
      [3, '[chuckles] Üzülme evlat, kişisel değil. Herkesi yenerim.'],
      [4, '[excited] Duyduk duymadık demeyin, Rıza yine kazandı!'],
      [5, '[chuckles] Yarın yine gel, dersler ücretsiz.'],
    ],
    playerWin: [
      [1, '[sighs] Bu sefer sen kazandın… rövanş isterim!'],
      [2, '[grumbling] Gözlüğümü evde unuttum, ondan oldu.', 'kizgin'],
      [3, '[sighs] Helal olsun aslanım… hakkını verdin.'],
      [4, '[whispers] Kahvede soran olursa, berabere bitti.', 'saskin'],
      [5, '[sighs] Çaylar benden. Dursun, iki çay!'],
    ],
    draw: [
      [1, '[chuckles] Berabere! Bir el daha, çaylar ortadan.'],
      [2, '[chuckles] Dostluk kazandı… ama rövanş şart!'],
      [3, '[chuckles] Ne sen yendin ne ben… çaylar yarı yarıya.'],
    ],
    playerFastThrow: [
      [1, '[appalled] Yavaş evlat! Masa antika!'],
      [2, '[surprised] Hop hop! Kartı at, masayı kırma!'],
      [3, '[chuckles] Bu ne hız? Bileğine motor mu taktın?'],
      [4, '[annoyed] Ağır ol, çayımı devireceksin!', 'kizgin'],
    ],
    tableEmpty: [
      [1, '[thoughtful] Masa tertemiz… ne atsak acaba?'],
      [2, '[clears throat] Boş masaya kart atmak sanattır.'],
      [3, '[sighs] Masa boş, çaydanlık da boş… Dursun!'],
    ],
  },
};

// ───────────────────────── CEM ─────────────────────────
// 22, kendinden emin üniversiteli. "Algoritmam var." Hafif gençlik argosu, "kanka".

const CEM: CharSpec = {
  moods: {
    botPisti: 'kahkaha', botJackPisti: 'kahkaha', playerPisti: 'kizgin', playerJackPisti: 'saskin',
    botBigCapture: 'kahkaha', playerBigCapture: 'kizgin', playerDumpedValuable: 'kahkaha', comeback: 'kahkaha',
    botWin: 'kahkaha', playerWin: 'kizgin', draw: 'saskin', playerFastThrow: 'saskin',
  },
  lines: {
    start: [
      [1, '[excited] Kanka hazır ol, algoritmam ısındı!'],
      [2, '[sighs] Ders çalışmam lazım ama… tek el!'],
    ],
    botThinking: [[1, '[whispers] Olasılık hesaplanıyor… yüzde seksen yedi.']],
    myTurnIdle: [
      [1, '[sighs] Kanka at artık, şarjım bitiyor!'],
      [2, '[chuckles] Kanka dondun mu? Ping atayım mı?'],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Algoritma çalışıyor kanka!'],
      [2, '[excited] Pişti! Bunu hikâyeye atıyorum.'],
    ],
    botJackPisti: [[1, '[laughs harder] Vale pişti! Efsane kanka, efsane!']],
    playerPisti: [
      [1, '[annoyed] Dur kanka, bu bir bug!'],
      [2, '[groans] Lag girdi kanka, o saymaz!'],
    ],
    playerJackPisti: [[1, '[appalled] Abi ne oluyor? Bu veri setimde yoktu!']],
    botBigCapture: [[1, '[mischievously] Hepsi benim kanka, istatistik konuştu.']],
    playerBigCapture: [[1, '[thoughtful] Hmm… algoritmayı güncellemem lazım.']],
    playerDumpedValuable: [[1, '[chuckles] Cidden mi kanka? Hediye kabul edildi.']],
    playerFastThrow: [[1, '[surprised] Yok artık! Bu ne atış kanka?']],
    comeback: [[1, '[excited] Geri döndüm kanka, arkadan geldim!']],
    botWin: [
      [1, '[laughs] Ci ci kanka. Biraz kolay oldu.', null, {text: 'GG kanka. Biraz kolay oldu.'}],
      [2, '[mischievously] Algoritma bir, insanlık sıfır.'],
    ],
    playerWin: [[1, '[annoyed] Rövanş kanka! Daha yeni ısınıyordum.']],
    draw: [[1, '[curious] Berabere mi? Sistem kararsız kaldı.']],
  },
};

// ───────────────────────── KAHVECİ DURSUN ─────────────────────────
// 55, kahvenin sahibi. Meraklı, herkese çay ikram eder: "Çaylar benden."

const DURSUN: CharSpec = {
  moods: {
    botPisti: 'kahkaha', botJackPisti: 'kahkaha', playerPisti: 'saskin', playerJackPisti: 'saskin',
    botBigCapture: 'kahkaha', playerBigCapture: 'kahkaha', botWin: 'kahkaha', playerFastThrow: 'saskin',
  },
  lines: {
    start: [
      [1, '[happy] Hoş geldin! Çaylar benden, oyun sizden.'],
      [2, '[happy] Otur bakalım, tavşan kanı çaylar geliyor!'],
    ],
    botThinking: [
      [1, '[curious] Senin kartlara bir baksam… yok yok, ayıp!'],
      [2, '[thoughtful] Ocakta çay vardı… neyse, oynayalım.'],
    ],
    myTurnIdle: [
      [1, '[sighs] Çay soğuyor, kart da soğuyor!'],
      [2, '[chuckles] Hadi güzel kardeşim, müşteriler bekliyor!'],
    ],
    botPisti: [
      [1, '[laughs] Pişti! Bu çay da benden olsun!'],
      [2, '[excited] Pişti! Az kalsın tepsiyi düşürüyordum!'],
    ],
    botJackPisti: [[1, '[laughs harder] Vale pişti! Bugün bütün kahveye çay benden!']],
    playerPisti: [
      [1, '[surprised] Pişti mi? Dur, ocağı kısayım da izleyeyim!'],
      [2, '[impressed] Helal olsun! Bu pişti çay ısmarlatır.'],
    ],
    playerJackPisti: [[1, '[whispers] Vale pişti! Rıza Amca duymasın bunu.']],
    botBigCapture: [[1, '[happy] Hepsini topladım, tepsi gibi doldu!']],
    playerBigCapture: [[1, '[laughs] Masayı süpürdün, bezime iş kalmadı!']],
    playerDumpedValuable: [[1, '[chuckles] Onu bırakmayacaktın ama… neyse, çayını iç.']],
    playerFastThrow: [[1, '[appalled] Yavaş! Bardaklar tepside zıpladı!']],
    lastRound: [[1, '[curious] Son el geldi! Kim kazanacak acaba?']],
    botWin: [[1, '[laughs] Kazandım! Çaylar yine benden, dert etme.']],
    playerWin: [[1, '[happy] Tebrikler! Bunu bütün mahalleye anlatacağım!']],
    draw: [[1, '[chuckles] Berabere! O zaman yeni çay demleyelim.']],
  },
};

// ───────────────────────── DEFNE ─────────────────────────
// 34, mimar. Poker yüzü, az konuşur; kuru, minimal iğneleme.

const DEFNE: CharSpec = {
  moods: {playerJackPisti: 'saskin', botJackPisti: 'kahkaha'},
  lines: {
    start: [
      [1, '[calm] Başlayalım.'],
      [2, '[deadpan] Kuralları biliyorsun… değil mi?'],
    ],
    botThinking: [[1, '[calm] Ölçüp biçiyorum.']],
    myTurnIdle: [
      [1, '[deadpan] Acele yok. Sadece yaşlanıyorum.'],
      [2, '[sighs] Bu sürede bir bina çizerdim.'],
    ],
    botPisti: [
      [1, '[deadpan] Pişti.'],
      [2, '[calm] Planlandığı gibi.'],
    ],
    botJackPisti: [[1, '[deadpan] Vale pişti. Proje teslim.']],
    playerPisti: [[1, '[deadpan] İlginç.']],
    playerJackPisti: [[1, '[impressed] Etkileyici… tekrarı zor ama.']],
    botBigCapture: [[1, '[calm] Statik hesap tuttu.']],
    playerBigCapture: [[1, '[deadpan] Güzel. Tadını çıkar… şimdilik.']],
    playerDumpedValuable: [[1, '[sarcastic] Bunu bilerek mi yaptın? Sağ ol.']],
    playerFastThrow: [[1, '[deadpan] Hız, isabet değildir.']],
    tableEmpty: [[1, '[thoughtful] Boş arsa… güzel.']],
    botWin: [
      [1, '[calm] Beklenen sonuç.'],
      [2, '[deadpan] İyi oyundu. Benim için.'],
    ],
    playerWin: [
      [1, '[calm] Tebrik ederim. Ciddiyim.'],
      [2, '[sighs] Revizyon zamanı.'],
    ],
    draw: [[1, '[calm] Simetrik. Sevdim.']],
  },
};

// ───────────────────────── derleme ─────────────────────────

function build(char: CharId, spec: CharSpec): Partial<Record<Moment, Line[]>> {
  const out: Partial<Record<Moment, Line[]>> = {};
  for (const m of MOMENTS) {
    const specs = spec.lines[m];
    if (!specs || !specs.length) continue;
    out[m] = specs.map(([n, tts, mood, opt]) => {
      const line: Line = {
        id: `${char}_${m}_${n}`,
        text: opt?.text ?? stripTags(tts),
        mood: mood === undefined ? (spec.moods[m] ?? null) : mood,
        tts,
      };
      if (opt?.weight !== undefined) line.weight = opt.weight;
      return line;
    });
  }
  return out;
}

export const DIALOGUE: Readonly<Record<CharId, Readonly<Partial<Record<Moment, readonly Line[]>>>>> = {
  riza: build('riza', RIZA),
  cem: build('cem', CEM),
  dursun: build('dursun', DURSUN),
  defne: build('defne', DEFNE),
};

const EMPTY: readonly Line[] = [];
const BY_ID = new Map<string, LineRef>();
for (const c of CHAR_IDS) {
  for (const m of MOMENTS) for (const l of DIALOGUE[c][m] ?? EMPTY) BY_ID.set(l.id, {...l, char: c, moment: m});
}

export function linesFor(charId: string, moment: Moment): readonly Line[] {
  const d = (DIALOGUE as Record<string, Partial<Record<Moment, readonly Line[]>> | undefined>)[charId];
  return d?.[moment] ?? EMPTY;
}

export function lineById(id: string): LineRef | undefined {
  return BY_ID.get(id);
}

/** Tüm replikler (seslendirme aracı ve testler için). */
export function allLines(): LineRef[] {
  return [...BY_ID.values()];
}

// ───────────────────────── konuşma sıklığı ─────────────────────────

/**
 * always  → her zaman konuşur (pişti, el başı/sonu).
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

export const EVENT_GAP_MS = 2500;
export const CHATTER_GAP_MS = 8000;
/** Aynı an son FATIGUE_WINDOW_MS içinde her konuştuğunda olasılık bu çarpanla düşer (sık anlar bıktırmasın). */
export const FATIGUE = 0.7;
export const FATIGUE_WINDOW_MS = 60_000;
export const HISTORY = 6; // karakter başına tekrar edilmeyecek son replik sayısı

export const MOMENT_RULES: Readonly<Record<Moment, MomentRule>> = {
  start: {kind: 'always', chance: 1, prio: 3},
  botPisti: {kind: 'always', chance: 1, prio: 3},
  botJackPisti: {kind: 'always', chance: 1, prio: 3},
  playerPisti: {kind: 'always', chance: 1, prio: 3},
  playerJackPisti: {kind: 'always', chance: 1, prio: 3},
  botWin: {kind: 'always', chance: 1, prio: 3},
  playerWin: {kind: 'always', chance: 1, prio: 3},
  draw: {kind: 'always', chance: 1, prio: 3},

  botBigCapture: {kind: 'event', chance: 0.45, prio: 2},
  playerBigCapture: {kind: 'event', chance: 0.45, prio: 2},
  botJackCapture: {kind: 'event', chance: 0.4, prio: 2},
  playerJackCapture: {kind: 'event', chance: 0.4, prio: 2},
  playerDumpedValuable: {kind: 'event', chance: 0.75, prio: 2},
  botLuckyCapture: {kind: 'event', chance: 0.5, prio: 2},
  comeback: {kind: 'event', chance: 0.85, prio: 2, selfGapMs: 20_000},
  lastRound: {kind: 'event', chance: 0.7, prio: 2, selfGapMs: 60_000},
  playerFastThrow: {kind: 'event', chance: 0.5, prio: 2, selfGapMs: 10_000},

  myTurnIdle: {kind: 'chatter', chance: 1, prio: 1, selfGapMs: 12_000},
  botThinking: {kind: 'chatter', chance: 0.25, prio: 1, selfGapMs: 15_000},
  tableEmpty: {kind: 'chatter', chance: 0.35, prio: 1, selfGapMs: 20_000},
  botLeading: {kind: 'chatter', chance: 0.35, prio: 1, selfGapMs: 30_000},
  playerLeading: {kind: 'chatter', chance: 0.35, prio: 1, selfGapMs: 30_000},
};

export function momentPriority(m: Moment): 1 | 2 | 3 {
  return MOMENT_RULES[m].prio;
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Konuşma durumu: son replikler (tekrar önleme), kullanım sayıları, zamanlama.
 * Masada birden çok bot olsa da sıklık kuralı tek (ortak) olmalı: modül düzeyindeki `dialogue` örneğini kullanın.
 */
export class DialogueDirector {
  private recent = new Map<string, string[]>(); // karakter → son HISTORY replik kimliği (eskiden yeniye)
  private uses = new Map<string, number>();
  private lastAt = -Infinity;
  private lastBy = new Map<Moment, number>();
  private spoken = new Map<Moment, number[]>();

  reset(): void {
    this.recent.clear();
    this.uses.clear();
    this.lastAt = -Infinity;
    this.lastBy.clear();
    this.spoken.clear();
  }

  /** Bu anda konuşulsun mu? true dönerse konuşma kaydedilir (sonraki çağrıların bekleme süresi başlar). */
  shouldSpeak(moment: Moment, now: number = nowMs(), rnd: () => number = Math.random): boolean {
    const r = MOMENT_RULES[moment];
    if (r.kind !== 'always') {
      if (now - this.lastAt < (r.kind === 'chatter' ? CHATTER_GAP_MS : EVENT_GAP_MS)) return false;
      const last = this.lastBy.get(moment);
      if (r.selfGapMs && last !== undefined && now - last < r.selfGapMs) return false;
      const times = this.spoken.get(moment);
      let recentCount = 0;
      if (times) for (const t of times) if (now - t < FATIGUE_WINDOW_MS) recentCount++;
      if (rnd() >= r.chance * Math.pow(FATIGUE, recentCount)) return false;
    }
    this.lastAt = now;
    this.lastBy.set(moment, now);
    const times = this.spoken.get(moment) ?? [];
    times.push(now);
    while (times.length > 8) times.shift();
    this.spoken.set(moment, times);
    return true;
  }

  /**
   * Anın repliklerinden birini seçer. Karakterin son HISTORY repliği tekrar edilmez; anın bütün replikleri yakın
   * zamanda kullanıldıysa en eski kullanılan yarısından seçilir (son söylenen asla hemen tekrar etmez).
   * Çok kullanılan replikler daha az seçilir.
   */
  pickLine(charId: string, moment: Moment, rnd: () => number = Math.random): Line | null {
    const pool = linesFor(charId, moment);
    if (!pool.length) return null;
    const hist = this.recent.get(charId) ?? [];
    let cand = pool.filter(l => !hist.includes(l.id));
    if (!cand.length) {
      const byAge = [...pool].sort((a, b) => hist.indexOf(a.id) - hist.indexOf(b.id)); // en eski önce
      cand = byAge.slice(0, Math.max(1, Math.ceil(pool.length / 2)));
      if (pool.length > 1) cand = cand.filter(l => l.id !== hist[hist.length - 1]);
    }
    let total = 0;
    const w = cand.map(l => {
      const x = (l.weight ?? 1) / (1 + 0.5 * (this.uses.get(l.id) ?? 0));
      total += x;
      return x;
    });
    let r = rnd() * total;
    let pick = cand[cand.length - 1];
    for (let i = 0; i < cand.length; i++) {
      r -= w[i];
      if (r < 0) {
        pick = cand[i];
        break;
      }
    }
    const i = hist.indexOf(pick.id);
    if (i >= 0) hist.splice(i, 1);
    hist.push(pick.id);
    while (hist.length > HISTORY) hist.shift();
    this.recent.set(charId, hist);
    this.uses.set(pick.id, (this.uses.get(pick.id) ?? 0) + 1);
    return pick;
  }

  /** shouldSpeak + pickLine. Karakterin bu an için repliği yoksa sıklık sayacına dokunmaz. */
  react(charId: string, moment: Moment, now: number = nowMs(), rnd: () => number = Math.random): Line | null {
    if (!linesFor(charId, moment).length) return null;
    if (!this.shouldSpeak(moment, now, rnd)) return null;
    return this.pickLine(charId, moment, rnd);
  }
}

/** Oyunun ortak konuşma durumu. */
export const dialogue = new DialogueDirector();

export function pickLine(charId: string, moment: Moment, rnd: () => number = Math.random): Line | null {
  return dialogue.pickLine(charId, moment, rnd);
}

export function shouldSpeak(moment: Moment, now: number = nowMs(), rnd: () => number = Math.random): boolean {
  return dialogue.shouldSpeak(moment, now, rnd);
}

export function react(charId: string, moment: Moment, now: number = nowMs(), rnd: () => number = Math.random): Line | null {
  return dialogue.react(charId, moment, now, rnd);
}

export function resetDialogue(): void {
  dialogue.reset();
}
