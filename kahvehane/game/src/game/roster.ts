// Karakter kadrosu: 4 karakter × 10 hâl (assets/chars/<id>/<id>_NN_<hâl>.webp, 576×576 saydam WebP),
// hikâye kartı metni, kişilik (bot ayarı), düşünme süresi, market fiyatı ve vurgu rengi.
import type {BotPersonality} from '../ai/bot';

export type CharId = 'riza' | 'cem' | 'dursun' | 'defne';
export const CHAR_IDS: readonly CharId[] = ['riza', 'cem', 'dursun', 'defne'];

/** 01 nötr · 02 göz kırpma · 03 gülümseme · 04 kahkaha · 05 kızgın · 06 şaşkın · 07 üzgün · 08 düşünceli · 09 zafer · 10 pişti kutlaması */
export type Pose = 'notr' | 'kirpma' | 'gulumseme' | 'kahkaha' | 'kizgin' | 'saskin' | 'uzgun' | 'dusunceli' | 'zafer' | 'pisti';
export const POSES: readonly Pose[] = ['notr', 'kirpma', 'gulumseme', 'kahkaha', 'kizgin', 'saskin', 'uzgun', 'dusunceli', 'zafer', 'pisti'];

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CharDef {
  id: CharId;
  name: string;
  /** Kısa unvan (rozet altı, kart başlığı) */
  title: string;
  age: number;
  /** Hediye galerisindeki hikâye kartı: 3-4 kısa cümle */
  story: string;
  /** Tek satırlık karakter sözü (galeri kartında tırnak içinde) */
  quote: string;
  /** Oyun tarzı etiketi (galeride rozet) */
  style: string;
  /** Vurgu rengi (kart çerçevesi, ışık) */
  color: string;
  rarity: Rarity;
  /** Rakip olarak zorluk (1-3) */
  difficulty: 1 | 2 | 3;
  personality: BotPersonality;
  /** Rakip düşünme süresi aralığı (sn) */
  think: [number, number];
  /** Markette fiyatı (jeton). Açılışta biri hediye edilir. */
  price: number;
  poses: Record<Pose, string>;
}

const IMG = import.meta.glob('../../assets/chars/*/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

function poses(id: CharId): Record<Pose, string> {
  const out = {} as Record<Pose, string>;
  POSES.forEach((p, i) => {
    const key = `../../assets/chars/${id}/${id}_${String(i + 1).padStart(2, '0')}_${p}.webp`;
    out[p] = IMG[key] ?? '';
  });
  return out;
}

export const ROSTER: readonly CharDef[] = [
  {
    id: 'riza',
    name: 'Rıza Amca',
    title: 'Kırk Yıllık Usta',
    age: 72,
    story:
      'Mahallenin en eski müdavimi. Kırk yıldır aynı köşe masada oturur, aynı ince belli bardaktan çayını içer. Bir kez bile valesini boşa harcadığı görülmemiş. Kartı atmadan önce bıyığını burar; o burdu mu, masada pişti kokusu vardır.',
    quote: 'Acele işe şeytan karışır evlat. Valeyi sona sakla.',
    style: 'Sabırlı usta',
    color: '#c8862e',
    rarity: 'legendary',
    difficulty: 2,
    personality: {memory: 0.88, skill: 0.85, jackPatience: 0.75},
    think: [0.55, 1.05],
    price: 7500,
    poses: poses('riza'),
  },
  {
    id: 'cem',
    name: 'Cem',
    title: 'Algoritmacı',
    age: 22,
    story:
      'Bilgisayar mühendisliği öğrencisi. Kulaklığı hiç çıkmaz, çıkan her kartı aklında tutar. Kahvehaneye ilk geldiğinde herkes güldü; üçüncü hafta Rıza Amca\'yı yendi. Şimdi masada istatistikle konuşuyor.',
    quote: 'Masada 3 vale kaldı. İhtimal benden yana.',
    style: 'Hesapçı',
    color: '#2f7bff',
    rarity: 'rare',
    difficulty: 1,
    personality: {memory: 0.72, skill: 0.72, jackPatience: 0.5},
    think: [0.4, 0.8],
    price: 5000,
    poses: poses('cem'),
  },
  {
    id: 'dursun',
    name: 'Kahveci Dursun',
    title: 'Kahvehanenin Sahibi',
    age: 55,
    story:
      'Kahvehanenin sahibi, çayların ve skor defterinin efendisi. Kulağının arkasındaki kalemle her eli yazar, hiçbir puan gözünden kaçmaz. Kazanınca çay ısmarlar, kaybedince de ısmarlar. Gülüşü masaya ısı verir.',
    quote: 'Oyun bizden, çaylar benden! Hadi bakalım.',
    style: 'Neşeli taktisyen',
    color: '#e0552b',
    rarity: 'rare',
    difficulty: 1,
    personality: {memory: 0.62, skill: 0.62, jackPatience: 0.5},
    think: [0.45, 0.85],
    price: 5000,
    poses: poses('dursun'),
  },
  {
    id: 'defne',
    name: 'Defne',
    title: 'Poker Yüzü',
    age: 34,
    story:
      'Mimar. Masaya oturduğunda tek kelime etmez, yüzünden hiçbir şey okunmaz. Kartları bir binanın planı gibi kurar, son dağıtıma kadar bekler. Kaybettiğini gören olmadı; kazandığını da çoğu zaman sonradan anlarsın.',
    quote: 'Sessiz olan kazanır.',
    style: 'Soğukkanlı stratejist',
    color: '#9b5cff',
    rarity: 'epic',
    difficulty: 3,
    personality: {memory: 0.97, skill: 0.95, jackPatience: 0.85},
    think: [0.6, 1.15],
    price: 9000,
    poses: poses('defne'),
  },
];

export function charById(id: string): CharDef {
  return ROSTER.find(c => c.id === id) ?? ROSTER[0];
}

/** Oyun anlarındaki tepki hâlleri (diyalog "mood" değerleri de buraya eşlenir). */
export const MOOD_POSE: Record<string, Pose> = {
  kahkaha: 'kahkaha',
  kizgin: 'kizgin',
  saskin: 'saskin',
  uzgun: 'uzgun',
  gulumseme: 'gulumseme',
  dusunceli: 'dusunceli',
  zafer: 'zafer',
  pisti: 'pisti',
};
