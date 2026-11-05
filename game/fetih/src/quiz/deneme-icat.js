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
			sutun: true,
			box: [[-0.365, -0.07, -0.53], [0.365, 0.46, 0.06]],
			cut: [[-0.285, 0.095, -0.448], [0.285, 0.288, -0.152]],
			c: [0, 0.16, -0.25],
		}),
		// Efes: iki katlı sütunlu cephe (arka duvar ve nişler gölgeden çıkar; sütun çiftlerinin arası açılır)
		GG('dn-gg2', 2, 'Fener döndükçe gölge netleşiyor: hangi yapı?', 'celsus', ['Celsus Kütüphanesi', 'Anıtkabir', 'Trajan Tapınağı', 'Aspendos Tiyatrosu'], {
			sutun: true,
			box: [[-0.33, -0.01, -0.2], [0.33, 0.6, 0.25]],
			cut: [[-0.3, 0.04, -0.2], [0.3, 0.6, -0.075]],
			c: [0, 0.27, 0.1],
			path: TEPE,
		}),
		// Boğaz cephesi: uzun iki katlı gövde, ortada kubbeli Muayede Salonu, çatı korkuluğu (rıhtım ve parmaklık çıkar)
		GG('dn-gg3', 2, 'Perdeye bir sarayın gölgesi düştü: hangisi?', 'dolmabahce', ['Dolmabahçe Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı', 'Topkapı Sarayı'], {
			sutun: true,
			box: [[-0.47, -0.01, -0.2], [0.47, 0.4, 0.15]],
			c: [0, 0.15, -0.04],
			path: DIK,
		}),
		// Mersin kıyısında, denizin içindeki ada kalesi: burçlar ve mazgal dişleri
		GG('dn-gg4', 3, 'Perdede bir kalenin gölgesi: hangisi?', 'kizkalesi', ['Kız Kalesi', 'Bodrum Kalesi', 'Rumeli Hisarı', 'Kızıl Kule'], { sutun: true, path: DIK }),
		// 2026-11: haritadaki kahraman maketlerden 18 yeni gölge. Çeldiriciler aynı türden ama gölgesi ayrışan yapılar
		// (dört minareli caminin yanına dört minareli cami, asma köprünün yanına asma köprü, adada kalenin yanına adada kale
		// konmaz). c ve s (dönme merkezi, maket ölçeği) tools/denetim/golge_ayar.mjs ile: gölge ışığın bütün yolunda
		// perdeye sığar; başta, ortada ve sondaki izdüşümler çizilip gözle denetlendi (CIZ=klasör). Sümela elendi
		// (gölgesi kayalığın gölgesi), Peribacaları'nda balonlar gölgeden çıkar (box).
		GG('dn-gg5', 1, 'Perdedeki gölge hangi yapının?', 'truva', ['Truva Atı', 'Nemrut Dağı', 'Göbeklitepe', 'Hattuşa Aslanlı Kapı'], { c: [-0.011, 0.397, -0.083], s: 0.58 }),
		GG('dn-gg6', 1, 'Perdeye bir kulenin gölgesi düştü: hangisi?', 'galata', ['Galata Kulesi', 'Beyazıt Kulesi', 'Kız Kulesi', 'Kızıl Kule'], { c: [0.002, 0.575, -0.019], s: 0.58 }),
		GG('dn-gg7', 2, 'Perdeye bir kulenin gölgesi düştü: hangisi?', 'kizkulesi', ['Kız Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Rumeli Hisarı'], { c: [0.022, 0.179, 0.02], s: 1.28, path: DIK }),
		GG('dn-gg8', 2, 'Perdeye bir kulenin gölgesi düştü: hangisi?', 'saatkulesi', ['İzmir Saat Kulesi', 'Galata Kulesi', 'Kız Kulesi', 'Kızıl Kule'], { c: [-0.04, 0.322, 0.081], s: 0.72 }),
		GG('dn-gg9', 2, 'Perdeye bir kulenin gölgesi düştü: hangisi?', 'kizilkule', ['Kızıl Kule', 'Galata Kulesi', 'Kız Kulesi', 'İzmir Saat Kulesi'], { c: [-0.007, 0.32, 0.101], s: 0.72, path: DIK }),
		GG('dn-gg10', 2, 'Fener döndükçe gölge netleşiyor: hangi yapı?', 'selimiye', ['Selimiye Camii', 'Sultanahmet Camii', 'Bursa Ulu Camii', 'Çifte Minareli Medrese'], { c: [0.007, 0.525, 0.048], s: 0.5, cat: 'sanat' }),
		GG('dn-gg11', 2, 'Perdedeki gölge hangi yapının?', 'sultanahmet', ['Sultanahmet Camii', 'Selimiye Camii', 'Bursa Ulu Camii', 'Çifte Minareli Medrese'], { c: [0.009, 0.463, 0.069], s: 0.48, cat: 'sanat' }),
		GG('dn-gg12', 3, 'Perdedeki gölge hangi yapının?', 'ayasofya', ['Ayasofya', 'Sultanahmet Camii', 'Bursa Ulu Camii', 'Mevlana Müzesi'], { c: [0, 0.366, 0.093], s: 0.56, cat: 'sanat' }),
		GG('dn-gg13', 1, 'Perdedeki gölge hangi yapının?', 'canakkale', ['Çanakkale Şehitler Abidesi', 'Anıtkabir', 'Celsus Kütüphanesi', 'İzmir Saat Kulesi'], { c: [0, 0.289, -0.037], s: 0.68 }),
		GG('dn-gg14', 1, 'Perdeye bir köprünün gölgesi düştü: hangisi?', 'kopru', ['15 Temmuz Şehitler Köprüsü', 'Galata Köprüsü', 'Malabadi Köprüsü', 'Uzunköprü'], { c: [0, 0.19, 0], s: 0.64, cat: 'cografya', path: DIK }),
		GG('dn-gg15', 1, 'Fener döndükçe gölge netleşiyor: neresi?', 'peri', ['Peribacaları', 'Pamukkale Travertenleri', 'Nemrut Dağı', 'Sümela Manastırı'], { cat: 'cografya', box: [[-9, -0.05, -9], [9, 0.62, 9]], c: [0.008, 0.29, -0.077], s: 0.56 }),
		GG('dn-gg16', 2, 'Perdedeki gölge hangi yapıların?', 'harran', ['Harran Kümbet Evleri', 'Safranbolu Evleri', 'Peribacaları', 'Mardin Evleri'], { c: [-0.028, 0.235, 0.024], s: 0.7, cat: 'cografya' }),
		GG('dn-gg17', 2, 'Perdedeki gölge hangi yapının?', 'mevlana', ['Mevlana Müzesi', 'Selimiye Camii', 'Çifte Minareli Medrese', 'Bursa Ulu Camii'], { c: [0, 0.439, 0.123], s: 0.58, cat: 'sanat' }),
		GG('dn-gg18', 3, 'Perdedeki gölge hangi yapının?', 'ciftemin', ['Çifte Minareli Medrese', 'Divriği Ulu Camii', 'Bursa Ulu Camii', 'Selimiye Camii'], { c: [-0.01, 0.37, -0.094], s: 0.62, cat: 'sanat' }),
		GG('dn-gg19', 2, 'Perdeye bir sarayın gölgesi düştü: hangisi?', 'ishakpasa', ['İshak Paşa Sarayı', 'Topkapı Sarayı', 'Beylerbeyi Sarayı', 'Dolmabahçe Sarayı'], { c: [0.033, 0.329, -0.097], s: 0.64, path: DIK }),
		GG('dn-gg20', 3, 'Perdedeki gölge hangi yapının?', 'nemrut', ['Nemrut Dağı', 'Göbeklitepe', 'Hattuşa Aslanlı Kapı', 'Truva Atı'], { c: [0.023, 0.211, 0.186], s: 0.64 }),
		GG('dn-gg21', 3, 'Perdedeki gölge hangi yapının?', 'gobekli', ['Göbeklitepe', 'Nemrut Dağı', 'Hattuşa Aslanlı Kapı', 'Ani Harabeleri'], { c: [0.022, 0.167, -0.023], s: 0.58 }),
		GG('dn-gg23', 3, 'Perdede bir kalenin gölgesi: hangisi?', 'bodrum', ['Bodrum Kalesi', 'Rumeli Hisarı', 'Van Kalesi', 'Ankara Kalesi'], { c: [-0.014, 0.274, 0.103], s: 0.72, path: DIK }),
	],
};
