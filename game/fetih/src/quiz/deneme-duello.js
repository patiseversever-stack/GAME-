// YENİ · deneme grubu: düello ve strateji tipleri (defter 6, 7, 10, 11, 17). Bkz. deneme.js başı ve ref/yeni-soru-tipleri/.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
//
//   halat     Halat Çekme   20 sn canlı düello: hızlı sorular, her doğru halatı bir adım çeker (yanlış: −1 ve kilit)
//   mancinik  Mancınık      tahmin et ama aşma: kaydırıcı mancınığın gücü, taş surun önüne düşer ya da üstünden uçar
//
// Örnekler bankadan (src/data/bank.js, oyunun doğrulanmış soruları) seçilir: Halat için kategori başına kısa doğru/yanlış,
// karşılaştır ve kısa şıklı sorular; Mancınık için tahmin (num) soruları olduğu gibi.

import { PROFILE } from './timing.js';
import { BANK } from '../data/bank.js';
import { halat } from './d_halat.js';
import { mancinik } from './d_mancinik.js';

// süre profilleri (d_ortak.js stamp): Halat sabit 20 sn tur; Mancınık tahminle aynı iş + "aşma" temkini (en az 20 sn)
Object.assign(PROFILE, {
	halat: { min: 20, max: 20, think: [0, 0], round: true },
	mancinik: { min: 12, max: 28, think: [4, 1.5] },
});

export const TYPES = { halat, mancinik };
export const ORDER = [
	['halat', 'Halat Çekme', '20 sn canlı düello, her doğru bir adım'],
	['mancinik', 'Mancınık', 'Tahmin et ama aşma: taş surun önüne düşsün'],
];

const L = (s) => [...String(s)].length;
const CAT_NAME = { tarih: 'Tarih', cografya: 'Coğrafya', bilim: 'Bilim', spor: 'Spor', sanat: 'Sanat', eglence: 'Eğlence' };

/** Halat turu: kategorinin kısa doğru/yanlış (≤18), karşılaştır (≤10) ve kısa şıklı soruları; toplam 34. */
function halatRound(cat, i) {
	const of = (t) => BANK.filter((q) => q.cat === cat && q.type === t);
	const tf = of('tf')
		.filter((q) => L(q.q) <= 70)
		.slice(0, 18)
		.map((q) => ({ t: q.q, o: ['DOĞRU', 'YANLIŞ'], r: q.ans ? 0 : 1, d: q.diff, tf: true }));
	const hl = of('hilo')
		.filter((q) => q.left.v !== q.right.v && L(q.left.t) <= 24 && L(q.right.t) <= 24 && L(q.q) <= 60)
		.slice(0, 10)
		.map((q) => ({ t: q.q, o: [q.left.t, q.right.t], r: q.left.v > q.right.v ? 0 : 1, d: q.diff }));
	const ch = of('choice')
		.filter((q) => L(q.q) <= 60 && q.a.every((x) => L(x) <= 16))
		.slice(0, Math.max(8, 34 - tf.length - hl.length))
		// şık sayısı karışık: 3 ve 4
		.map((q, j) => ({ t: q.q, o: j % 2 ? q.a.slice(0, 3) : q.a.slice(), r: 0, d: q.diff }));
	return { id: `dn-ht${i + 1}`, cat, diff: 2, type: 'halat', q: `Halatı kendine çek! · ${CAT_NAME[cat]}`, items: [...tf, ...hl, ...ch] };
}

// Mancınık: bankadaki tahmin soruları (yükseklik, uzunluk, yıl, gün: "aşma" kuralına uygun, aralığı geniş olanlar)
const MANCINIK_IDS = ['n002', 'n001', 'tar-nu-022', 'cog-nu-008', 'spo-nu-004', 'n011', 'n006', 'tar-nu-009'];

export const SAMPLES = {
	halat: ['tarih', 'cografya', 'bilim', 'spor', 'sanat', 'eglence'].map(halatRound),
	mancinik: MANCINIK_IDS.map((id) => BANK.find((q) => q.id === id))
		.filter(Boolean)
		.map((q, i) => ({ ...q, id: `dn-mc${i + 1}`, src: q.id, type: 'mancinik' })),
};
