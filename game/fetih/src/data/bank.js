// Oyunun kullandığı soru bankası: başlangıç seti + içerik dosyaları (q/*.js).
// Yalnızca oyunda tipi tanımlı olan sorular alınır; aynı soru bir kez girer.
import { QUESTIONS as SEED } from './questions.js';
import { ALL } from './q/index.js';
import { TYPES } from '../quiz/types.js';

/**
 * Yinelenme anahtarı. Sırala, eşleştir, atasözü gibi tiplerde soru metni ortaktır
 * ("Olayları eskiden yeniye sırala."), bu yüzden içeriğin kendisi anahtar olur.
 */
export function dupKey(q) {
	switch (q.type) {
		case 'order':
			return 'order|' + q.q + '|' + q.items.map((x) => x.t).sort().join('|');
		case 'match':
			return 'match|' + q.pairs.map((p) => p[0]).sort().join('|');
		case 'hilo':
			return 'hilo|' + [q.left?.t, q.right?.t].sort().join('|') + '|' + q.prop;
		case 'odd':
			return 'odd|' + q.q + '|' + (q.opts || []).slice().sort().join('|');
		case 'emoji':
			return 'emoji|' + q.e;
		case 'proverb':
			return 'proverb|' + q.text;
		case 'cross':
			return 'cross|' + (q.words || []).map((x) => x.w).join('|');
		case 'img':
			return 'img|' + (q.img || q.w) + '|' + (q.mode || '');
		case 'blitz':
			return 'blitz|' + q.q;
		default:
			return q.type + '|' + q.q;
	}
}

const seen = new Set();
export const BANK = [...SEED, ...ALL].filter((q) => {
	if (!TYPES[q.type]) return false;
	const k = q.type === 'choice' || q.type === 'tf' || q.type === 'num' || q.type === 'pin' || q.type === 'hang' ? q.q : dupKey(q);
	if (seen.has(k)) return false;
	seen.add(k);
	return true;
});
