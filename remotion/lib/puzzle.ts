// Oyunun gerçek bulmaca verisi (game/*.html → DATA). Sahneler hücre, ipucu, fotoğraf ve cevap bilgisini buradan alır.
import raw from '../data/puzzle.json';

export type Word = { id: string; answer: string; clue: string; hint: string; category: string; image: string | null; r: number; c: number; dir: 'a' | 'd'; num: number; clueCell: [number, number] };
export type Cell = { r: number; c: number; solution: string; words: string[] };
export type Zone = { r: number; c: number; w: number; h: number; ids: string[]; primary: boolean };
export type Photo = { id: string; r: number; c: number; w: number; h: number; answer: string; word: string };

export const PUZZLE = raw as unknown as { cols: number; rows: number; words: Word[]; cells: Cell[]; zones: Zone[]; photos: Photo[] };
export const WORDS = new Map(PUZZLE.words.map(w => [w.id, w]));
export const wordCells = (w: Word) => Array.from(w.answer).map((ch, i) => ({ ch, r: w.r + (w.dir === 'd' ? i : 0), c: w.c + (w.dir === 'a' ? i : 0) }));
export const byAnswer = (a: string) => PUZZLE.words.find(w => w.answer === a)!;
