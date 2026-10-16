// Deste kaydı: market ve oyun desteleri buradan bulur. Yeni deste = yeni Skin dosyası + buraya bir satır.
// load() tembel: yalnız kuşanılan (veya markette önizlenen) destenin boyaması yapılır.
import type {Skin} from './contract';

export interface DeckEntry {
  id: string;
  load: () => Promise<Skin>;
}

export const DECKS: readonly DeckEntry[] = [
  {id: 'yildizli', load: () => import('./yildizli').then(m => m.skin)},
  {id: 'iznik', load: () => import('./iznik').then(m => m.skin)},
  {id: 'dalga', load: () => import('./dalga').then(m => m.skin)},
  {id: 'aycicegi', load: () => import('./aycicegi').then(m => m.skin)},
  {id: 'ebru', load: () => import('./ebru').then(m => m.skin)},
  {id: 'hazine', load: () => import('./hazine').then(m => m.skin)},
];

export function deckById(id: string): DeckEntry {
  return DECKS.find(d => d.id === id) ?? DECKS[0];
}
