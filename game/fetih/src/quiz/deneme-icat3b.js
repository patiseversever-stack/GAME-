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
const TF = (id, diff, mode, ils) => ({ id, cat: 'cografya', diff, type: 'tufan', mode, q: 'Deniz yükselirse hangi il ' + (mode === 'once' ? 'ÖNCE' : 'EN SON') + ' batar? İl merkezlerinin rakımını düşün.', ils });
// Kayıp İl: a[0] doğru; hint: üçüncü ipucu (plaka ve ünlü bir şey). Komşu ipucu şıklarda olmayan bir komşudan; nb (plaka)
// verilirse o komşu: bölge ve komşu ipucu birlikte cevabı tek başına ele vermesin, en az iki şık ayakta kalsın.
const KY = (id, diff, il, a, hint, nb) => ({ id, cat: 'cografya', diff, type: 'kayip', q: 'Haritadan hangi il kayboldu?', il, a, hint, ...(nb ? { nb } : {}) });
const FZ = (id, diff, pool, q) => ({ id, cat: pool === 'karisik' ? 'eglence' : pool, diff, type: 'fitil', pool, q });

export const SAMPLES = {
	tufan: [
		TF('dn-tf1', 1, 'son', [[25, 1893], [42, 1016], [26, 788], [16, 155]]),
		TF('dn-tf2', 1, 'once', [[55, 4], [5, 412], [60, 623], [19, 801]]),
		TF('dn-tf3', 2, 'son', [[65, 1727], [58, 1285], [23, 1067], [21, 674]]),
		TF('dn-tf4', 2, 'son', [[36, 1768], [69, 1550], [24, 1185], [61, 30]]),
		TF('dn-tf5', 2, 'once', [[31, 85], [63, 518], [27, 843], [47, 1083]]),
		TF('dn-tf6', 2, 'son', [[66, 1301], [40, 985], [18, 751], [22, 42]]),
		TF('dn-tf7', 1, 'once', [[1, 23], [46, 568], [70, 1039], [51, 1229]]),
		TF('dn-tf8', 3, 'son', [[4, 1640], [49, 1350], [12, 1151], [56, 896]]),
		TF('dn-tf9', 3, 'son', [[3, 1034], [26, 788], [11, 539], [45, 71]]),
		TF('dn-tf10', 3, 'son', [[37, 904], [14, 742], [78, 278], [53, 9]]),
		// v1.1: aynı tablodan (HGK il merkezi rakımları); komşu seçenekler arası çoğunlukla 170 m üstü
		TF('dn-tf11', 1, 'son', [[75, 1829], [38, 1054], [2, 669], [35, 2]]),
		TF('dn-tf12', 1, 'once', [[30, 1720], [68, 980], [72, 540], [7, 39]]),
		TF('dn-tf13', 2, 'son', [[13, 1545], [6, 938], [11, 539], [55, 4]]),
		TF('dn-tf14', 2, 'once', [[50, 1224], [44, 964], [60, 623], [16, 155]]),
		TF('dn-tf15', 2, 'son', [[29, 1219], [64, 919], [72, 540], [45, 71]]),
		TF('dn-tf16', 1, 'once', [[43, 969], [14, 742], [20, 354], [35, 2]]),
		TF('dn-tf17', 3, 'son', [[32, 1035], [76, 858], [63, 518], [1, 23]]),
		TF('dn-tf18', 2, 'son', [[30, 1720], [51, 1229], [15, 957], [78, 278]]),
		TF('dn-tf19', 1, 'once', [[3, 1034], [71, 747], [46, 568], [7, 39]]),
		TF('dn-tf20', 3, 'son', [[65, 1727], [49, 1350], [12, 1151], [44, 964]]),
		TF('dn-tf21', 2, 'once', [[6, 938], [2, 669], [5, 412], [22, 42]]),
		TF('dn-tf22', 1, 'son', [[25, 1893], [58, 1285], [37, 904], [53, 9]]),
		TF('dn-tf23', 2, 'once', [[4, 1640], [40, 985], [20, 354], [9, 64]]),
		TF('dn-tf24', 2, 'son', [[69, 1550], [66, 1301], [19, 801], [31, 85]]),
		TF('dn-tf25', 1, 'once', [[42, 1016], [21, 674], [78, 278], [61, 30]]),
		// v1.2: aynı tablodan; sürpriz sıralamalar (kıyısı olmayan en alçak il, Muğla'nın Denizli'den yüksekliği…), komşu
		// seçenekler arası en az 150 m. Kaynaklar arası oynaması büyük il merkezleri (İstanbul, Artvin, Şırnak…) kullanılmadı.
		TF('dn-tf26', 2, 'son', [[47, 1083], [27, 843], [63, 518], [31, 85]]),
		TF('dn-tf27', 3, 'once', [[42, 1016], [71, 747], [72, 540], [78, 278]]),
		TF('dn-tf28', 3, 'son', [[37, 904], [21, 674], [5, 412], [10, 139]]),
		TF('dn-tf29', 2, 'once', [[48, 646], [20, 354], [64, 919], [9, 64]]),
		TF('dn-tf30', 3, 'son', [[48, 646], [20, 354], [16, 155], [35, 2]]),
		TF('dn-tf31', 1, 'once', [[53, 9], [14, 742], [58, 1285], [25, 1893]]),
		TF('dn-tf32', 2, 'son', [[51, 1229], [42, 1016], [19, 801], [11, 539]]),
		TF('dn-tf33', 2, 'once', [[16, 155], [11, 539], [26, 788], [43, 969]]),
		TF('dn-tf34', 3, 'son', [[12, 1151], [44, 964], [2, 669], [63, 518]]),
		TF('dn-tf35', 2, 'once', [[21, 674], [6, 938], [58, 1285], [36, 1768]]),
		TF('dn-tf36', 3, 'son', [[30, 1720], [13, 1545], [56, 896], [72, 540]]),
		TF('dn-tf37', 2, 'once', [[46, 568], [27, 843], [23, 1067], [49, 1350]]),
		TF('dn-tf38', 2, 'son', [[75, 1829], [69, 1550], [29, 1219], [61, 30]]),
		TF('dn-tf39', 1, 'once', [[7, 39], [46, 568], [15, 957], [51, 1229]]),
		TF('dn-tf40', 2, 'son', [[24, 1185], [44, 964], [60, 623], [5, 412]]),
		TF('dn-tf41', 2, 'once', [[10, 139], [20, 354], [11, 539], [64, 919]]),
		TF('dn-tf42', 2, 'son', [[32, 1035], [21, 674], [78, 278], [1, 23]]),
		TF('dn-tf43', 3, 'once', [[5, 412], [60, 623], [19, 801], [66, 1301]]),
		TF('dn-tf44', 3, 'once', [[76, 858], [49, 1350], [4, 1640], [25, 1893]]),
		TF('dn-tf45', 3, 'son', [[66, 1301], [38, 1054], [71, 747], [5, 412]]),
		TF('dn-tf46', 3, 'son', [[25, 1893], [4, 1640], [49, 1350], [24, 1185]]),
		TF('dn-tf47', 1, 'once', [[35, 2], [20, 354], [11, 539], [43, 969]]),
		TF('dn-tf48', 3, 'once', [[71, 747], [40, 985], [58, 1285], [13, 1545]]),
		TF('dn-tf49', 3, 'son', [[56, 896], [21, 674], [63, 518], [31, 85]]),
		TF('dn-tf50', 2, 'son', [[6, 938], [14, 742], [11, 539], [16, 155]]),
	],
	kayip: [
		KY('dn-ky1', 1, 42, ['Konya', 'Karaman', 'Aksaray', 'Niğde'], 'Plakası 42 · Mevlânâ’nın şehri', 33),
		KY('dn-ky2', 1, 65, ['Van', 'Bitlis', 'Hakkari', 'Ağrı'], 'Plakası 65 · Türkiye’nin en büyük gölü burada'),
		KY('dn-ky3', 1, 48, ['Muğla', 'Aydın', 'Antalya', 'Denizli'], 'Plakası 48 · Bodrum ve Marmaris bu ilde'),
		KY('dn-ky4', 2, 61, ['Trabzon', 'Rize', 'Giresun', 'Gümüşhane'], 'Plakası 61 · Sümela Manastırı burada'),
		KY('dn-ky5', 2, 21, ['Diyarbakır', 'Batman', 'Mardin', 'Şanlıurfa'], 'Plakası 21 · Surları UNESCO listesinde', 49),
		KY('dn-ky6', 2, 22, ['Edirne', 'Kırklareli', 'Tekirdağ', 'Balıkesir'], 'Plakası 22 · Selimiye Camii burada'),
		KY('dn-ky7', 2, 31, ['Hatay', 'Osmaniye', 'Adana', 'Kilis'], 'Plakası 31 · Künefesiyle ünlü Antakya'),
		KY('dn-ky8', 2, 55, ['Samsun', 'Ordu', 'Sinop', 'Amasya'], 'Plakası 55 · Atatürk 19 Mayıs 1919’da buraya çıktı'),
		KY('dn-ky9', 3, 58, ['Sivas', 'Tokat', 'Yozgat', 'Kayseri'], 'Plakası 58 · Kongresiyle ünlü, Divriği Ulu Camii burada', 46),
		KY('dn-ky10', 3, 26, ['Eskişehir', 'Konya', 'Ankara', 'Aksaray'], 'Plakası 26 · Lületaşı ve Odunpazarı evleri'),
		// v1.1: yedi bölgeden beşer (Marmara, Ege, Akdeniz, Doğu, Güneydoğu +4; Karadeniz +3; İç Anadolu +2). Ünlü şeyler
		// Kültür ve Turizm Bakanlığı il sayfaları ve Türk Patent coğrafi işaret kayıtlarıyla denetlendi.
		KY('dn-ky11', 1, 34, ['İstanbul', 'Kocaeli', 'Tekirdağ', 'Yalova'], 'Plakası 34 · Boğaziçi iki kıtayı ayırır'),
		KY('dn-ky12', 2, 10, ['Balıkesir', 'Çanakkale', 'Manisa', 'Bursa'], 'Plakası 10 · Ayvalık ve Cunda Adası bu ilde', 43),
		KY('dn-ky13', 2, 41, ['Kocaeli', 'Sakarya', 'Yalova', 'Bursa'], 'Plakası 41 · Pişmaniyesiyle ünlü İzmit'),
		KY('dn-ky14', 3, 59, ['Tekirdağ', 'Kırklareli', 'Edirne', 'Çanakkale'], 'Plakası 59 · Köftesi meşhur, Namık Kemal burada doğdu'),
		KY('dn-ky15', 2, 9, ['Aydın', 'İzmir', 'Muğla', 'Denizli'], 'Plakası 09 · İnciri ve Didim’deki Apollon Tapınağı'),
		KY('dn-ky16', 1, 20, ['Denizli', 'Aydın', 'Uşak', 'Burdur'], 'Plakası 20 · Pamukkale travertenleri ve uzun öten horozu'),
		KY('dn-ky17', 2, 45, ['Manisa', 'İzmir', 'Uşak', 'Kütahya'], 'Plakası 45 · Mesir macunu ve şehzadeler şehri'),
		KY('dn-ky18', 3, 43, ['Kütahya', 'Uşak', 'Afyonkarahisar', 'Bilecik'], 'Plakası 43 · Çinisi ve Aizanoi’deki Zeus Tapınağı', 26),
		KY('dn-ky19', 2, 8, ['Artvin', 'Rize', 'Ardahan', 'Trabzon'], 'Plakası 08 · Kafkasör boğa güreşleri ve Karagöl'),
		KY('dn-ky20', 3, 37, ['Kastamonu', 'Sinop', 'Çankırı', 'Bartın'], 'Plakası 37 · Millî Mücadele’nin İstiklal Yolu buradan geçti'),
		KY('dn-ky21', 2, 52, ['Ordu', 'Giresun', 'Samsun', 'Tokat'], 'Plakası 52 · Boztepe’den yamaç paraşütü, fındık bahçeleri'),
		KY('dn-ky22', 2, 38, ['Kayseri', 'Nevşehir', 'Sivas', 'Niğde'], 'Plakası 38 · Erciyes’in eteğinde, Mimar Sinan’ın memleketi'),
		KY('dn-ky23', 3, 68, ['Aksaray', 'Niğde', 'Nevşehir', 'Kırşehir'], 'Plakası 68 · Ihlara Vadisi ve kervansaraylar'),
		KY('dn-ky24', 2, 4, ['Ağrı', 'Iğdır', 'Kars', 'Van'], 'Plakası 04 · İshak Paşa Sarayı Doğubayazıt’ta'),
		KY('dn-ky25', 1, 44, ['Malatya', 'Elazığ', 'Bingöl', 'Tunceli'], 'Plakası 44 · Kayısının başkenti', 21),
		KY('dn-ky26', 3, 24, ['Erzincan', 'Erzurum', 'Tunceli', 'Bingöl'], 'Plakası 24 · Tulum peyniri ve Kemaliye’deki Taş Yol'),
		KY('dn-ky27', 3, 13, ['Bitlis', 'Muş', 'Siirt', 'Van'], 'Plakası 13 · Nemrut Krater Gölü Tatvan’da'),
		KY('dn-ky28', 1, 47, ['Mardin', 'Şanlıurfa', 'Batman', 'Siirt'], 'Plakası 47 · Taş evleri ve Midyat telkârisi'),
		KY('dn-ky29', 2, 2, ['Adıyaman', 'Malatya', 'Şanlıurfa', 'Gaziantep'], 'Plakası 02 · Nemrut Dağı’nın dev taş başları'),
		KY('dn-ky30', 3, 56, ['Siirt', 'Batman', 'Bitlis', 'Şırnak'], 'Plakası 56 · Fıstığı ve kuyuda pişen büryan kebabı'),
		KY('dn-ky31', 3, 72, ['Batman', 'Siirt', 'Diyarbakır', 'Mardin'], 'Plakası 72 · Raman Dağı’nın petrolü ve Hasankeyf'),
		KY('dn-ky32', 1, 7, ['Antalya', 'Muğla', 'Burdur', 'Isparta'], 'Plakası 07 · Aspendos Tiyatrosu ve Kaleiçi', 42),
		KY('dn-ky33', 2, 33, ['Mersin', 'Adana', 'Karaman', 'Antalya'], 'Plakası 33 · Kızkalesi ve Cennet-Cehennem obrukları'),
		KY('dn-ky34', 2, 32, ['Isparta', 'Burdur', 'Afyonkarahisar', 'Antalya'], 'Plakası 32 · Gül bahçeleri ve Eğirdir Gölü'),
		KY('dn-ky35', 2, 46, ['Kahramanmaraş', 'Osmaniye', 'Adana', 'Hatay'], 'Plakası 46 · Dövülerek uzayan dondurması', 27),
		// v1.2: kalan illerden; şıklar aynı bölgeden, bölge ve komşu ipucu birlikte en az iki şıkkı ayakta bırakır (gerekirse nb).
		KY('dn-ky36', 1, 1, ['Adana', 'Mersin', 'Osmaniye', 'Hatay'], 'Plakası 01 · Kebabı ve Seyhan üstündeki Taşköprü', 46),
		KY('dn-ky37', 2, 3, ['Afyonkarahisar', 'Uşak', 'Kütahya', 'Denizli'], 'Plakası 03 · Sucuğu, kaymağı ve kayalık kalesi'),
		KY('dn-ky38', 2, 5, ['Amasya', 'Tokat', 'Çorum', 'Samsun'], 'Plakası 05 · Yeşilırmak kıyısında kral kaya mezarları'),
		KY('dn-ky39', 1, 6, ['Ankara', 'Konya', 'Kırıkkale', 'Eskişehir'], 'Plakası 06 · Anıtkabir ve tiftik keçisi'),
		KY('dn-ky40', 3, 12, ['Bingöl', 'Muş', 'Tunceli', 'Elazığ'], 'Plakası 12 · Solhan’daki yüzen adalar'),
		KY('dn-ky41', 2, 14, ['Bolu', 'Düzce', 'Karabük', 'Zonguldak'], 'Plakası 14 · Abant Gölü ve Yedigöller', 54),
		KY('dn-ky42', 3, 15, ['Burdur', 'Isparta', 'Osmaniye', 'Antalya'], 'Plakası 15 · Bembeyaz kıyılı Salda Gölü'),
		KY('dn-ky43', 1, 16, ['Bursa', 'Balıkesir', 'Kocaeli', 'Sakarya'], 'Plakası 16 · İskender kebabı ve Uludağ'),
		KY('dn-ky44', 1, 17, ['Çanakkale', 'Balıkesir', 'Kırklareli', 'Yalova'], 'Plakası 17 · Truva Antik Kenti ve Gelibolu'),
		KY('dn-ky45', 2, 19, ['Çorum', 'Amasya', 'Tokat', 'Sinop'], 'Plakası 19 · Leblebisi ve Hitit başkenti Hattuşa', 37),
		KY('dn-ky46', 2, 23, ['Elazığ', 'Malatya', 'Tunceli', 'Bingöl'], 'Plakası 23 · Harput Kalesi ve Hazar Gölü'),
		KY('dn-ky47', 1, 25, ['Erzurum', 'Kars', 'Ağrı', 'Erzincan'], 'Plakası 25 · Cağ kebabı ve Palandöken', 12),
		KY('dn-ky48', 1, 27, ['Gaziantep', 'Şanlıurfa', 'Kilis', 'Adıyaman'], 'Plakası 27 · Baklavası ve Zeugma mozaikleri', 46),
		KY('dn-ky49', 2, 28, ['Giresun', 'Ordu', 'Trabzon', 'Gümüşhane'], 'Plakası 28 · Fındığı ve Aksu Festivali'),
		KY('dn-ky50', 2, 30, ['Hakkari', 'Van', 'Bitlis', 'Ağrı'], 'Plakası 30 · Cilo Dağları ve Zap Suyu'),
		KY('dn-ky51', 1, 35, ['İzmir', 'Aydın', 'Denizli', 'Muğla'], 'Plakası 35 · Konak Saat Kulesi ve Efes', 45),
		KY('dn-ky52', 2, 36, ['Kars', 'Ardahan', 'Iğdır', 'Ağrı'], 'Plakası 36 · Ani Ören Yeri ve kaşarı'),
		KY('dn-ky53', 3, 39, ['Kırklareli', 'Edirne', 'Tekirdağ', 'Çanakkale'], 'Plakası 39 · Dupnisa Mağarası ve İğneada longozu'),
		KY('dn-ky54', 2, 49, ['Muş', 'Bitlis', 'Bingöl', 'Van'], 'Plakası 49 · 1071 Malazgirt Zaferi burada'),
		KY('dn-ky55', 1, 50, ['Nevşehir', 'Kırşehir', 'Niğde', 'Aksaray'], 'Plakası 50 · Peri bacaları ve yer altı şehirleri'),
		KY('dn-ky56', 3, 51, ['Niğde', 'Aksaray', 'Karaman', 'Nevşehir'], 'Plakası 51 · Elması ve Aladağlar’ın zirveleri', 33),
		KY('dn-ky57', 1, 53, ['Rize', 'Trabzon', 'Artvin', 'Gümüşhane'], 'Plakası 53 · Çayı ve Ayder Yaylası'),
		KY('dn-ky58', 2, 54, ['Sakarya', 'Kocaeli', 'Düzce', 'Bilecik'], 'Plakası 54 · Sapanca Gölü ve ıslama köftesi'),
		KY('dn-ky59', 2, 57, ['Sinop', 'Kastamonu', 'Samsun', 'Bartın'], 'Plakası 57 · Türkiye’nin en kuzey ucu İnceburun'),
		KY('dn-ky60', 2, 60, ['Tokat', 'Amasya', 'Ordu', 'Çorum'], 'Plakası 60 · Kebabı ve Ballıca Mağarası', 58),
		KY('dn-ky61', 1, 63, ['Şanlıurfa', 'Mardin', 'Gaziantep', 'Diyarbakır'], 'Plakası 63 · Balıklıgöl ve Göbeklitepe'),
		KY('dn-ky62', 3, 64, ['Uşak', 'Kütahya', 'Manisa', 'Denizli'], 'Plakası 64 · Halısı ve Karun Hazinesi'),
		KY('dn-ky63', 2, 67, ['Zonguldak', 'Bartın', 'Düzce', 'Karabük'], 'Plakası 67 · Taşkömürü ocakları ve Ereğli'),
		KY('dn-ky64', 3, 70, ['Karaman', 'Aksaray', 'Niğde', 'Konya'], 'Plakası 70 · Binbir Kilise ve Türk Dil Bayramı'),
		KY('dn-ky65', 3, 74, ['Bartın', 'Zonguldak', 'Karabük', 'Düzce'], 'Plakası 74 · Amasra’nın kalesi ve adaları'),
		KY('dn-ky66', 3, 75, ['Ardahan', 'Kars', 'Artvin', 'Iğdır'], 'Plakası 75 · Donmuş Çıldır Gölü’nde atlı kızak'),
		KY('dn-ky67', 2, 76, ['Iğdır', 'Kars', 'Ardahan', 'Van'], 'Plakası 76 · Nahçıvan’a sınırı olan tek il'),
		KY('dn-ky68', 2, 77, ['Yalova', 'Kocaeli', 'İstanbul', 'Sakarya'], 'Plakası 77 · Termal kaplıcaları ve Atatürk Köşkü'),
		KY('dn-ky69', 2, 78, ['Karabük', 'Bartın', 'Zonguldak', 'Çankırı'], 'Plakası 78 · Safranbolu’nun eski konakları'),
		KY('dn-ky70', 3, 80, ['Osmaniye', 'Hatay', 'Adana', 'Kahramanmaraş'], 'Plakası 80 · Yer fıstığı ve Karatepe-Aslantaş'),
		KY('dn-ky71', 2, 81, ['Düzce', 'Bolu', 'Sakarya', 'Bartın'], 'Plakası 81 · Akçakoca sahili ve Güzeldere Şelalesi'),
	],
	fitil: [
		FZ('dn-fz1', 2, 'karisik', 'Fitil yanıyor! Doğru cevap topu rakibe atar.'),
		FZ('dn-fz2', 2, 'tarih', 'Top elinde: doğru bil, rakibe at!'),
		FZ('dn-fz3', 2, 'cografya', 'Fitil kısalıyor: patlamadan kurtul!'),
		FZ('dn-fz4', 3, 'bilim', 'Dikkat: yanlış cevap topu sana çevirir!'),
		FZ('dn-fz5', 1, 'eglence', 'Hızlı ol: patladığında top kimdeyse yanar!'),
		FZ('dn-fz6', 2, 'spor', 'Pası doğru ver, top rakipte patlasın!'),
		FZ('dn-fz7', 2, 'sanat', 'Bil, bas, topu at: fitil beklemez!'),
		FZ('dn-fz8', 3, 'tarih', 'Çetin fitil: yalnız bilen kurtulur!'),
		FZ('dn-fz9', 1, 'cografya', 'Saat gizli: fitil her an bitebilir!'),
		FZ('dn-fz10', 3, 'karisik', 'Usta fitili: her konudan, her zorlukta!'),
		FZ('dn-fz11', 1, 'bilim', 'Hızlı eller kazanır: topu rakibe at!'),
		FZ('dn-fz12', 3, 'eglence', 'Eğlence fitili: gülme, cevap ver!'),
	],
};
