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
		// v1.1: aynı tablodan (HGK il merkezi rakımları); komşu seçenekler arası çoğunlukla 170 m üstü
		TF('dn-tf11', 1, 'son', [[75, 1829], [38, 1054], [2, 669], [35, 2]]),
		TF('dn-tf12', 1, 'once', [[30, 1720], [68, 980], [72, 540], [7, 39]]),
		TF('dn-tf13', 2, 'son', [[13, 1545], [6, 938], [11, 539], [55, 4]]),
		TF('dn-tf14', 2, 'once', [[50, 1224], [44, 964], [60, 623], [16, 155]]),
		TF('dn-tf15', 2, 'son', [[29, 1219], [64, 919], [72, 540], [45, 71]]),
		TF('dn-tf16', 2, 'once', [[43, 969], [14, 742], [20, 354], [35, 2]]),
		TF('dn-tf17', 3, 'son', [[32, 1035], [76, 858], [63, 518], [1, 23]]),
		TF('dn-tf18', 2, 'son', [[30, 1720], [51, 1229], [15, 957], [78, 278]]),
		TF('dn-tf19', 2, 'once', [[3, 1034], [71, 747], [46, 568], [7, 39]]),
		TF('dn-tf20', 3, 'son', [[65, 1727], [49, 1350], [12, 1151], [44, 964]]),
		TF('dn-tf21', 2, 'once', [[6, 938], [2, 669], [5, 412], [22, 42]]),
		TF('dn-tf22', 1, 'son', [[25, 1893], [58, 1285], [37, 904], [53, 9]]),
		TF('dn-tf23', 2, 'once', [[4, 1640], [40, 985], [20, 354], [9, 64]]),
		TF('dn-tf24', 2, 'son', [[69, 1550], [66, 1301], [19, 801], [31, 85]]),
		TF('dn-tf25', 1, 'once', [[42, 1016], [21, 674], [78, 278], [61, 30]]),
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
		// v1.1: yedi bölgeden beşer (Marmara, Ege, Akdeniz, Doğu, Güneydoğu +4; Karadeniz +3; İç Anadolu +2). Ünlü şeyler
		// Kültür ve Turizm Bakanlığı il sayfaları ve Türk Patent coğrafi işaret kayıtlarıyla denetlendi.
		KY('dn-ky11', 1, 34, ['İstanbul', 'Kocaeli', 'Tekirdağ', 'Yalova'], 'Plakası 34 · Boğaziçi iki kıtayı ayırır'),
		KY('dn-ky12', 2, 10, ['Balıkesir', 'Çanakkale', 'Manisa', 'Bursa'], 'Plakası 10 · Ayvalık ve Cunda Adası bu ilde'),
		KY('dn-ky13', 2, 41, ['Kocaeli', 'Sakarya', 'Yalova', 'Bursa'], 'Plakası 41 · Pişmaniyesiyle ünlü İzmit'),
		KY('dn-ky14', 3, 59, ['Tekirdağ', 'Kırklareli', 'Edirne', 'Çanakkale'], 'Plakası 59 · Köftesi meşhur, Namık Kemal burada doğdu'),
		KY('dn-ky15', 2, 9, ['Aydın', 'İzmir', 'Muğla', 'Denizli'], 'Plakası 09 · İnciri ve Didim’deki Apollon Tapınağı'),
		KY('dn-ky16', 1, 20, ['Denizli', 'Aydın', 'Uşak', 'Burdur'], 'Plakası 20 · Pamukkale travertenleri ve uzun öten horozu'),
		KY('dn-ky17', 2, 45, ['Manisa', 'İzmir', 'Uşak', 'Kütahya'], 'Plakası 45 · Mesir macunu ve şehzadeler şehri'),
		KY('dn-ky18', 3, 43, ['Kütahya', 'Uşak', 'Afyonkarahisar', 'Bilecik'], 'Plakası 43 · Çinisi ve Aizanoi’deki Zeus Tapınağı'),
		KY('dn-ky19', 2, 8, ['Artvin', 'Rize', 'Ardahan', 'Trabzon'], 'Plakası 08 · Kafkasör boğa güreşleri ve Karagöl'),
		KY('dn-ky20', 3, 37, ['Kastamonu', 'Sinop', 'Çankırı', 'Bartın'], 'Plakası 37 · Millî Mücadele’nin İstiklal Yolu buradan geçti'),
		KY('dn-ky21', 2, 52, ['Ordu', 'Giresun', 'Samsun', 'Tokat'], 'Plakası 52 · Boztepe’den yamaç paraşütü, fındık bahçeleri'),
		KY('dn-ky22', 2, 38, ['Kayseri', 'Nevşehir', 'Sivas', 'Niğde'], 'Plakası 38 · Erciyes’in eteğinde, Mimar Sinan’ın memleketi'),
		KY('dn-ky23', 3, 68, ['Aksaray', 'Niğde', 'Nevşehir', 'Kırşehir'], 'Plakası 68 · Ihlara Vadisi ve kervansaraylar'),
		KY('dn-ky24', 2, 4, ['Ağrı', 'Iğdır', 'Kars', 'Van'], 'Plakası 04 · İshak Paşa Sarayı Doğubayazıt’ta'),
		KY('dn-ky25', 1, 44, ['Malatya', 'Elazığ', 'Adıyaman', 'Kahramanmaraş'], 'Plakası 44 · Kayısının başkenti'),
		KY('dn-ky26', 3, 24, ['Erzincan', 'Erzurum', 'Gümüşhane', 'Sivas'], 'Plakası 24 · Tulum peyniri ve Kemaliye’deki Taş Yol'),
		KY('dn-ky27', 3, 13, ['Bitlis', 'Muş', 'Siirt', 'Van'], 'Plakası 13 · Nemrut Krater Gölü Tatvan’da'),
		KY('dn-ky28', 1, 47, ['Mardin', 'Şanlıurfa', 'Batman', 'Diyarbakır'], 'Plakası 47 · Taş evleri ve Midyat telkârisi'),
		KY('dn-ky29', 2, 2, ['Adıyaman', 'Malatya', 'Şanlıurfa', 'Gaziantep'], 'Plakası 02 · Nemrut Dağı’nın dev taş başları'),
		KY('dn-ky30', 3, 56, ['Siirt', 'Batman', 'Bitlis', 'Şırnak'], 'Plakası 56 · Fıstığı ve kuyuda pişen büryan kebabı'),
		KY('dn-ky31', 3, 72, ['Batman', 'Siirt', 'Diyarbakır', 'Mardin'], 'Plakası 72 · Raman Dağı’nın petrolü ve Hasankeyf'),
		KY('dn-ky32', 1, 7, ['Antalya', 'Muğla', 'Burdur', 'Isparta'], 'Plakası 07 · Aspendos Tiyatrosu ve Kaleiçi'),
		KY('dn-ky33', 2, 33, ['Mersin', 'Adana', 'Karaman', 'Antalya'], 'Plakası 33 · Kızkalesi ve Cennet-Cehennem obrukları'),
		KY('dn-ky34', 2, 32, ['Isparta', 'Burdur', 'Afyonkarahisar', 'Antalya'], 'Plakası 32 · Gül bahçeleri ve Eğirdir Gölü'),
		KY('dn-ky35', 2, 46, ['Kahramanmaraş', 'Osmaniye', 'Adıyaman', 'Gaziantep'], 'Plakası 46 · Dövülerek uzayan dondurması'),
	],
	fitil: [
		FZ('dn-fz1', 2, 'karisik', 'Fitil yanıyor! Doğru cevap topu rakibe atar.'),
		FZ('dn-fz2', 2, 'tarih', 'Tarih fitili: doğru bil, topu at!'),
		FZ('dn-fz3', 2, 'cografya', 'Coğrafya fitili: patlamadan kurtul!'),
		FZ('dn-fz4', 3, 'bilim', 'Bilim fitili: yanlış cevap topu sana çevirir!'),
		FZ('dn-fz5', 1, 'eglence', 'Kolay fitil: hızlı ol, topu at!'),
		FZ('dn-fz6', 2, 'spor', 'Spor fitili: pası doğru ver, top rakipte patlasın!'),
		FZ('dn-fz7', 2, 'sanat', 'Sanat fitili: eseri tanı, topu at!'),
		FZ('dn-fz8', 3, 'tarih', 'Zor tarih fitili: yalnız bilen kurtulur!'),
		FZ('dn-fz9', 1, 'cografya', 'Kolay coğrafya fitili: hızlı bil, topu at!'),
		FZ('dn-fz10', 3, 'karisik', 'Usta fitili: her konudan çetin sorular!'),
		FZ('dn-fz11', 1, 'bilim', 'Kolay bilim fitili: hızlı eller kazanır!'),
		FZ('dn-fz12', 3, 'eglence', 'Eğlence fitili: gülme, cevap ver!'),
	],
};
