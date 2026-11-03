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
// aralıklarından ışık geçsin), c: dönme merkezi, path: ışık yolu (vars. d_golge.js PATH). Çeldiriciler aynı türden:
// sütunlu cepheye sütunlu cephe, saraya saray, kaleye kale (sona doğru beliren sütun ya da mazgal aralığı ele vermesin).
const GG = (id, diff, q, model, a, extra = {}) => ({ id, cat: 'tarih', diff, type: 'golge', q, model, a, ...extra });
// v1.2: tam tepeden başlayan yol (başta yalnız düz bir kütle), sonda yine tam karşıdan; sınama: test/deneme-icat.test.mjs
const TEPE = [[0, 0.0, 1.45], [0.3, 0.9, 0.9], [0.58, 0.62, 0.3], [0.8, 0.06, 0.05], [1, 0, 0.035]];
const DIK = [[0, 0.82, 1.2], [0.3, 1.3, 0.62], [0.58, 0.62, 0.24], [0.8, 0.06, 0.05], [1, 0, 0.035]];

export const SAMPLES = {
	golge: [
		GG('dn-gg1', 2, 'Perdedeki gölge hangi yapının?', 'anitkabir', ['Anıtkabir', 'Celsus Kütüphanesi', 'Trajan Tapınağı', 'Dolmabahçe Sarayı'], {
			box: [[-0.365, -0.07, -0.53], [0.365, 0.46, 0.06]],
			cut: [[-0.285, 0.095, -0.448], [0.285, 0.288, -0.152]],
			c: [0, 0.16, -0.25],
		}),
		// Efes: iki katlı sütunlu cephe (arka duvar ve nişler gölgeden çıkar; sütun çiftlerinin arası açılır)
		GG('dn-gg2', 2, 'Fener döndükçe gölge netleşiyor: hangi yapı?', 'celsus', ['Celsus Kütüphanesi', 'Anıtkabir', 'Trajan Tapınağı', 'Aspendos Tiyatrosu'], {
			box: [[-0.33, -0.01, -0.2], [0.33, 0.6, 0.25]],
			cut: [[-0.3, 0.04, -0.2], [0.3, 0.6, -0.075]],
			c: [0, 0.27, 0.1],
			path: TEPE,
		}),
		// Boğaz cephesi: uzun iki katlı gövde, ortada kubbeli Muayede Salonu, çatı korkuluğu (rıhtım ve parmaklık çıkar)
		GG('dn-gg3', 2, 'Perdeye bir sarayın gölgesi düştü: hangisi?', 'dolmabahce', ['Dolmabahçe Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı', 'Topkapı Sarayı'], {
			box: [[-0.47, -0.01, -0.2], [0.47, 0.4, 0.15]],
			c: [0, 0.15, -0.04],
			path: DIK,
		}),
		// Mersin kıyısında, denizin içindeki ada kalesi: burçlar ve mazgal dişleri
		GG('dn-gg4', 3, 'Perdede bir kalenin gölgesi: hangisi?', 'kizkalesi', ['Kız Kalesi', 'Bodrum Kalesi', 'Rumeli Hisarı', 'Kızıl Kule'], { path: DIK }),
	],
};
