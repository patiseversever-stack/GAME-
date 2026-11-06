// YENİ 10 · deneme grubu 3 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   mayin  Mayın Tarlası  bölgedeki illerden kurala uyanlara bas, mayına basma; iki can (3B harita, gece tarlası)
//   rota   Uçuş Rotası    4–6 durağı doğru sırayla uç; uçak her ayağı kavisli uçar, cevapta altın rota (3B harita)
//
// Örnekler elle yazıldı. Harita gerçekleri (komşuluk, denize kıyı, plaka) src/data/turkiye.json'dan doğrulanır
// (test/yeni3.test.mjs); tarihler bankanın doğrulanmış sorularıyla aynı (Göbeklitepe ≈ MÖ 9600, Çatalhöyük ≈ MÖ 7400,
// Ayasofya 537, Selimiye 1575, Anıtkabir 1953; Amasya Genelgesi Haziran, Erzurum Kongresi Temmuz, Sivas Kongresi Eylül 1919).

import { PROFILE } from './timing.js';
import { mayin } from './d_mayin.js';
import { rota } from './d_rota.js';

// süre profilleri (d_ortak.js stamp; işler tipin kendi prepare'inde sayılır): Mayın her güvenli il için karar + haritada
// bul ve dokun (7 güvenli ilde ~40 sn); Rota her durağın sırasını hatırla + karta dokun (5–6 durakta 30–40 sn)
Object.assign(PROFILE, {
	mayin: { min: 25, max: 50, think: [0, 0] },
	rota: { min: 22, max: 45, think: [0, 0] },
});

export const TYPES = { mayin, rota };
export const ORDER = [
	['mayin', 'Mayın Tarlası', 'Kurala uyan illere bas, mayına basma'],
	['rota', 'Uçuş Rotası', 'Durakları sırayla uç, rotadan sapma'],
];

const MY = (id, cat, diff, q, mayinKurali, alan, guvenli, extra = {}) => ({ id, cat, diff, type: 'mayin', q, mayin: mayinKurali, alan, guvenli, ...extra });
const RT = (id, cat, diff, q, duraklar) => ({ id, cat, diff, type: 'rota', q, duraklar: duraklar.map(([il, not, ad]) => ({ il, not, ...(ad ? { ad } : {}) })) });

export const SAMPLES = {
	mayin: [
		// 1) komşuluk: Ankara'nın 7 komşusu güvenli; çevresindeki komşu olmayanlar mayın (Karabük ~9 km, Bilecik ~14 km ile
		// sınıra en yakın tuzaklar)
		MY('yn-mayin-1', 'cografya', 1, 'Ankara’ya komşu illere bas!', 'Ankara’ya komşu olmayan her il',
			[14, 18, 26, 40, 42, 68, 71, 78, 11, 66, 50, 19, 3],
			[14, 18, 26, 40, 42, 68, 71],
			{ merkez: 6, not: 'Ankara’nın 7 komşusu var. Karabük ve Bilecik sınıra çok yakın ama komşu değil.' }),
		// 2) kıyı: Ege ve Batı Akdeniz; kıyısı olanlar mayın (Balıkesir'in iki denize kıyısı var), içerdekiler güvenli
		MY('yn-mayin-2', 'cografya', 2, 'Denize kıyısı olmayan illere bas!', 'Denize kıyısı olan her il',
			[17, 10, 16, 45, 35, 43, 64, 9, 20, 3, 48, 15, 7, 32],
			[45, 43, 64, 20, 3, 15, 32],
			{ not: 'Denizli’nin adında deniz var ama kıyısı yok!' }),
		// 3) plaka ve tarih: 1989'dan bu yana il olan genç iller (plaka 68–81) güvenli; Zonguldak (67) en sinsi mayın
		MY('yn-mayin-3', 'tarih', 3, '1989’dan bu yana il olan genç illere bas!', 'Daha önce de il olan her il',
			[34, 41, 77, 16, 11, 54, 81, 14, 67, 74, 78, 26],
			[77, 81, 74, 78],
			{ not: 'Genç iller 68–81 plakalı: Bartın 1991, Yalova ve Karabük 1995, Düzce 1999.' }),
	],
	rota: [
		// 1) yolculuk: Samsun'a çıkış (Havza Genelgesi de Samsun'da), Amasya Genelgesi, Erzurum ve Sivas kongreleri, Ankara
		RT('yn-rota-1', 'tarih', 1, 'Mustafa Kemal 1919: genelge ve kongre duraklarını sırayla uç!', [
			[55, '19 Mayıs'],
			[5, 'Haziran'],
			[25, 'Temmuz'],
			[58, 'Eylül'],
			[6, '27 Aralık'],
		]),
		// 2) yön: Ege'ye kıyısı olan altı il, kuzeyden güneye (Edirne'nin Enez'de Ege kıyısı var)
		RT('yn-rota-2', 'cografya', 2, 'Ege’ye kıyısı olan illeri kuzeyden güneye uç!', [
			[22, 'Enez'],
			[17, 'Boğaz'],
			[10, 'Ayvalık'],
			[35, 'Körfez'],
			[9, 'Kuşadası'],
			[48, 'Bodrum'],
		]),
		// 3) zaman: tarihî yerler en eskiden en yeniye; kartta yerin adı, haritada ili
		RT('yn-rota-3', 'tarih', 3, 'Tarihî yerleri en eskiden en yeniye uç!', [
			[63, 'MÖ 9600', 'Göbeklitepe'],
			[42, 'MÖ 7400', 'Çatalhöyük'],
			[35, 'Antik çağ', 'Efes'],
			[34, '537', 'Ayasofya'],
			[22, '1575', 'Selimiye'],
			[6, '1953', 'Anıtkabir'],
		]),
	],
};
