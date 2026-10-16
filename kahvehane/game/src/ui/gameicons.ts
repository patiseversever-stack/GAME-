// Oyun simgeleri: Pişti = maça (takım), Blöf = maske. Tek renk (currentColor), 24×24; ana ekran oyun seçicisi, görev kartları,
// kurallar sekmeleri, profil istatistik seçicisi ve sonuç ekranı kullanır.
import type {Game} from '../game/types';
import {SUIT} from './icons';

const svg = (body: string, cls = 'kh-i kh-gico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${body}</svg>`;

/** Domino maskesi: iki göz deliği (evenodd), gülümseyen yan kıvrımlar. */
const MASK = '<path fill-rule="evenodd" d="M2.2 8.3C4.3 6.1 7.9 5.7 12 7.1c4.1-1.4 7.7-1 9.8 1.2.4 4.6-1.1 9.2-4.9 9.2-2 0-3.3-1.2-4.2-2.6h-1.4c-.9 1.4-2.2 2.6-4.2 2.6-3.8 0-5.3-4.6-4.9-9.2zM5.6 11.1c.3 1.5 1.9 2.7 3.3 2.3 1.1-.3 1.7-1.4 1.4-2.6-.3-1.1-2-1.7-3.3-1.5-1.1.2-1.6.9-1.4 1.8zM18.4 11.1c-.3 1.5-1.9 2.7-3.3 2.3-1.1-.3-1.7-1.4-1.4-2.6.3-1.1 2-1.7 3.3-1.5 1.1.2 1.6.9 1.4 1.8z"/>';

export const GAME_ICON: Record<Game, string> = {
  pisti: svg(SUIT.s),
  blof: svg(MASK),
};

/** Görev kartı ve benzerleri için: `I` içinde olmayan simgeler. */
export const EXTRA_ICON: Record<string, string> = {
  mask: svg(MASK),
};

/** Oyun adı + simge (küçük başlıklar için). */
export const gameIcon = (g: Game): string => GAME_ICON[g];
