// Karakterler: kişilik (bot ayarları), replikler ve tepki kartı görselleri.
import type {BotPersonality} from './bot';

export type Mood = 'kahkaha' | 'kizgin' | 'saskin' | 'uzgun';
export type Moment =
  | 'start' | 'botPisti' | 'botJackPisti' | 'playerPisti' | 'playerJackPisti'
  | 'botBig' | 'playerBig' | 'botWin' | 'playerWin' | 'draw' | 'thinking' | 'playerJack';

export interface Character {
  id: string;
  name: string;
  title: string;
  avatar: string;
  moods: Record<Mood, string>;
  personality: BotPersonality;
  lines: Record<Moment, string[]>;
  mood: Partial<Record<Moment, Mood>>;
  think: [number, number]; // düşünme süresi aralığı (sn)
}

export function rizaAmca(img: (n: string) => string): Character {
  return {
    id: 'riza',
    name: 'Rıza Amca',
    title: 'Kırk yıllık usta',
    avatar: img('riza_avatar'),
    moods: {kahkaha: img('riza_kahkaha'), kizgin: img('riza_kizgin'), saskin: img('riza_saskin'), uzgun: img('riza_uzgun')},
    personality: {memory: 0.88, skill: 0.85, jackPatience: 0.75},
    think: [0.75, 1.6],
    lines: {
      start: ['Hoş geldin evlat, otur bakalım.', 'Kartları iyi karıştırdım, hile yok!', 'Bakalım bugün kim çay ısmarlayacak.'],
      botPisti: ['Pişti! Çaylar senden evlat!', 'Al sana pişti! Ustaya saygı!', 'Gördün mü? Kırk yıllık tecrübe!'],
      botJackPisti: ['Vale pişti! Bunu çerçeveletip asacağım!', 'Vale ile pişti! Kahvede anlatılır bu!'],
      playerPisti: ['Hay aksi!', 'Tesadüf, tesadüf!', 'Bu sefer şans senden yana…'],
      playerJackPisti: ['Olamaz! Vale pişti mi?!', 'Kim öğretti sana bunu?!'],
      botBig: ['Topladım hepsini!', 'Masa temizlendi evlat.'],
      playerBig: ['Hıh… Acemi şansı.', 'Az kalsın benimdi o.'],
      botWin: ['Ustaya saygı evlat. Bir el daha?', 'Çaylar senden, unutma!'],
      playerWin: ['Bu sefer sen kazandın… Rövanş!', 'İçimden geçmedi bugün.'],
      draw: ['Berabere! Bir el daha oynayalım.'],
      thinking: ['Hımm…', 'Bir dakika…', 'Dur bakalım…'],
      playerJack: ['Valeyi saklıyordun demek…'],
    },
    mood: {
      botPisti: 'kahkaha', botJackPisti: 'kahkaha', playerPisti: 'kizgin', playerJackPisti: 'saskin',
      botBig: 'kahkaha', playerBig: 'kizgin', botWin: 'kahkaha', playerWin: 'uzgun',
    },
  };
}
