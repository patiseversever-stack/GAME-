// Oyunun kullandığı soru bankası: başlangıç seti + içerik dosyaları (q/*.js).
// Yalnızca oyunda tipi tanımlı olan sorular alınır; aynı metin bir kez girer.
import { QUESTIONS as SEED } from './questions.js';
import { ALL } from './q/index.js';
import { TYPES } from '../quiz/types.js';

const seen = new Set();
export const BANK = [...SEED, ...ALL].filter((q) => TYPES[q.type] && !seen.has(q.q) && seen.add(q.q));
