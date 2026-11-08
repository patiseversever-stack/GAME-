// YENİ · deneme grubu: yeni icatlar: harita dışı (bkz. deneme.js başı ve ref/yeni-soru-tipleri/).
//
//   golge   Gölge Oyunu   Karagöz perdesine bir yapının yalnız gölgesi düşer; fener yaklaştıkça gölge netleşir, üç
//                         ipucu sırayla açılır, erken bilen kazanır; cevapta perde aralanır, yapının kendisi görünür
//
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.

import { PROFILE } from './timing.js';
import { golge } from './d_golge.js';
import { GOLGELER } from '../data/ek/golge.js';
import { YAPILAR } from '../data/ek/kazi.js';

// süre profilleri (d_ortak.js stamp → timing.js formülü): en az 20 sn
Object.assign(PROFILE, {
	golge: { min: 20, max: 30, think: [4, 1.5] }, // gölgeyi izle, dört yapıyı zihinde döndür
});

export const TYPES = { golge };

export const ORDER = [['golge', 'Gölge Oyunu', 'Perdede bir gölge: hangi yapı?']];

// Gölge Oyunu: 99 yapı görseli (Kazı Kazan’la aynı: dist/yapi/). Şıklar, tür ve kıta ek/golge.js’te; plakanın adı,
// yeri ve bilgi satırı ek/kazi.js’te. Kimlik: golge-<görsel no>.
const BUL = new Map(YAPILAR.map((y) => [y.no, y]));
export const SAMPLES = {
	golge: GOLGELER.map((g) => {
		const y = BUL.get(g.no);
		return {
			id: `golge-${g.no}`,
			cat: y.cat,
			diff: g.diff,
			type: 'golge',
			q: 'Perdedeki gölge hangi yapının?',
			img: String(g.no).padStart(2, '0'),
			a: g.a,
			ad: y.ad,
			...(y.il ? { il: y.il } : { yer: y.yer }),
			alt: y.alt,
			tur: g.tur,
			...(g.kita ? { kita: g.kita } : {}),
			...(g.ip1 ? { ip1: g.ip1 } : {}),
		};
	}),
};
