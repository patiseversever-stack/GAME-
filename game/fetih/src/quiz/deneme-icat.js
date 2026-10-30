// YENİ · deneme grubu: yeni icatlar: harita dışı (bkz. deneme.js başı ve ref/yeni-soru-tipleri/).
//
//   golge   Gölge Oyunu   Karagöz perdesine bir yapının yalnız gölgesi düşer; fener döndükçe şekil netleşir,
//                         erken bilen kazanır; cevapta perde aralanır, kahraman maket altın ışıkta görünür
//
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.

import { PROFILE } from './timing.js';
import { golge } from './d_golge.js';

// süre profilleri (d_ortak.js stamp → timing.js formülü): en az 20 sn
Object.assign(PROFILE, {
	golge: { min: 20, max: 30, think: [4, 1.5] }, // gölgeyi izle, dört yapıyı zihinde döndür
});

export const TYPES = { golge };

export const ORDER = [['golge', 'Gölge Oyunu', 'Perdede bir gölge: hangi yapı?']];

// Gölge Oyunu: model = kahraman maket yapıcısı (map/hero_index.js). box: gölge düşüren parça (yerel birim; Anıtkabir'de
// yalnız Şeref Holü: kaide, merdiven, sütunlu revak, çatı katı), cut: gölgeden çıkan iç kütle (iç salon; sütun
// aralıklarından ışık geçsin), c: dönme merkezi. Celsus da sütunlu cephe: tuzak.
const GG = (id, diff, q, model, a, extra = {}) => ({ id, cat: 'tarih', diff, type: 'golge', q, model, a, ...extra });

export const SAMPLES = {
	golge: [
		GG('dn-gg1', 2, 'Perdenin ardındaki yapı hangisi?', 'anitkabir', ['Anıtkabir', 'Selimiye Camii', 'Galata Kulesi', 'Celsus Kütüphanesi'], {
			box: [[-0.365, -0.07, -0.53], [0.365, 0.46, 0.06]],
			cut: [[-0.285, 0.095, -0.448], [0.285, 0.288, -0.152]],
			c: [0, 0.16, -0.25],
		}),
	],
};
