// YENİ · deneme grubu: yeni icatlar: 3B harita, sinematik, fetih (bkz. deneme.js başı ve ref/yeni-soru-tipleri/).
//
//   tufan   Tufan       deniz yükselir; hangi il en son (ya da önce) batar? cevapta su 3B haritada gerçekten yükselir
//   kayip   Kayıp İl    haritadan bir il silinmiş (kuyu, altın perde); ipuçları zamanla açılır, cevapta il gökten iner
//   fitil   Fitil       aranızda fitili yanan top; doğru cevap topu rakibe çevirir, patladığında kime dönükse kaybeder
//
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.

import { PROFILE } from './timing.js';
import { tufan } from './d_tufan.js';
import { kayip } from './d_kayip.js';
import { fitil } from './d_fitil.js';

// süre profilleri (d_ortak.js stamp → timing.js formülü): en az 20 sn; Fitil sabit tur (saat gizli, fitil 12–25 sn)
Object.assign(PROFILE, {
	tufan: { min: 20, max: 32, think: [4, 1.5] }, // dört ilin rakımını hatırla, sırala
	kayip: { min: 22, max: 36, think: [4, 1.5] }, // boşluğun biçimi ve yeri; ipuçları zamanla açılır
	fitil: { min: 30, max: 30, think: [0, 0], round: true }, // sabit tur: patlama 12–25. sn'de, kart saati gizli
});

export const TYPES = { tufan, kayip, fitil };

export const ORDER = [
	['tufan', 'Tufan', 'Deniz yükselir: hangi il en son batar?'],
	['kayip', 'Kayıp İl', 'Haritada simsiyah bir boşluk: hangi il?'],
	['fitil', 'Fitil', 'Fitil yanıyor: doğru cevap topu rakibe atar'],
];

// Tufan: il merkezi rakımları (m), Harita Genel Komutanlığı il merkezi rakımları tablosu (ansiklopedilerdeki il
// sayfalarıyla aynı). Seçenekler arası en az 150 m (sınama denetler); kaynaklar arası birkaç on metrelik oynama
// sıralamayı değiştirmesin diye yakın çiftlerden kaçınıldı.
const TF = (id, diff, mode, ils) => ({ id, cat: 'cografya', diff, type: 'tufan', mode, q: mode === 'once' ? 'Deniz yükselirse hangi il ÖNCE batar?' : 'Deniz yükselirse hangi il EN SON batar?', ils });
// Kayıp İl: a[0] doğru; hint: üçüncü ipucu (plaka ve ünlü bir şey). Komşu ipucu şıklarda olmayan bir komşudan.
const KY = (id, diff, il, a, hint) => ({ id, cat: 'cografya', diff, type: 'kayip', q: 'Haritadan hangi il kayboldu?', il, a, hint });
const FZ = (id, diff, pool, q) => ({ id, cat: pool === 'karisik' ? 'eglence' : pool, diff, type: 'fitil', pool, q });

export const SAMPLES = {
	tufan: [
		TF('dn-tf1', 1, 'son', [[25, 1893], [42, 1016], [26, 788], [16, 155]]),
		TF('dn-tf2', 1, 'once', [[55, 4], [5, 412], [60, 623], [19, 801]]),
		TF('dn-tf3', 2, 'son', [[65, 1727], [58, 1285], [23, 1067], [21, 674]]),
		TF('dn-tf4', 2, 'son', [[36, 1768], [69, 1550], [24, 1185], [61, 30]]),
		TF('dn-tf5', 2, 'once', [[31, 85], [63, 518], [27, 843], [47, 1083]]),
		TF('dn-tf6', 2, 'son', [[66, 1301], [40, 985], [18, 751], [22, 42]]),
		TF('dn-tf7', 2, 'once', [[1, 23], [46, 568], [70, 1039], [51, 1229]]),
		TF('dn-tf8', 3, 'son', [[4, 1640], [49, 1350], [12, 1151], [56, 896]]),
		TF('dn-tf9', 3, 'son', [[3, 1034], [26, 788], [11, 539], [45, 71]]),
		TF('dn-tf10', 3, 'son', [[37, 904], [14, 742], [78, 278], [53, 9]]),
	],
	kayip: [
		KY('dn-ky1', 1, 42, ['Konya', 'Karaman', 'Aksaray', 'Niğde'], 'Plakası 42 · Mevlânâ’nın şehri'),
		KY('dn-ky2', 1, 65, ['Van', 'Bitlis', 'Hakkari', 'Ağrı'], 'Plakası 65 · Türkiye’nin en büyük gölü burada'),
		KY('dn-ky3', 1, 48, ['Muğla', 'Aydın', 'Antalya', 'Denizli'], 'Plakası 48 · Bodrum ve Marmaris bu ilde'),
		KY('dn-ky4', 2, 61, ['Trabzon', 'Rize', 'Giresun', 'Gümüşhane'], 'Plakası 61 · Sümela Manastırı burada'),
		KY('dn-ky5', 2, 21, ['Diyarbakır', 'Batman', 'Mardin', 'Elazığ'], 'Plakası 21 · Surları UNESCO listesinde'),
		KY('dn-ky6', 2, 22, ['Edirne', 'Kırklareli', 'Tekirdağ', 'Balıkesir'], 'Plakası 22 · Selimiye Camii burada'),
		KY('dn-ky7', 2, 31, ['Hatay', 'Osmaniye', 'Adana', 'Kilis'], 'Plakası 31 · Künefesiyle ünlü Antakya'),
		KY('dn-ky8', 2, 55, ['Samsun', 'Ordu', 'Sinop', 'Amasya'], 'Plakası 55 · Atatürk 19 Mayıs 1919’da buraya çıktı'),
		KY('dn-ky9', 3, 58, ['Sivas', 'Tokat', 'Yozgat', 'Kayseri'], 'Plakası 58 · Kongresiyle ünlü, Divriği Ulu Camii burada'),
		KY('dn-ky10', 3, 26, ['Eskişehir', 'Kütahya', 'Bilecik', 'Afyonkarahisar'], 'Plakası 26 · Lületaşı ve Odunpazarı evleri'),
	],
	fitil: [
		FZ('dn-fz1', 2, 'karisik', 'Fitil yanıyor! Doğru cevap topu rakibe atar.'),
		FZ('dn-fz2', 2, 'tarih', 'Tarih fitili: doğru bil, topu at!'),
		FZ('dn-fz3', 2, 'cografya', 'Coğrafya fitili: patlamadan kurtul!'),
		FZ('dn-fz4', 3, 'bilim', 'Bilim fitili: yanlış cevap topu sana çevirir!'),
		FZ('dn-fz5', 1, 'eglence', 'Kolay fitil: hızlı ol, topu at!'),
	],
};
