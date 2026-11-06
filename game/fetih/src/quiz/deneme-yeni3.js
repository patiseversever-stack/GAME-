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
		// ---- kıyılar (veride deniz sınırı ≥ 20 km; hangi denize kıyı olduğu sınamadaki elle yazılı listede, toplamı 28 il)
		// 4) Doğu Karadeniz: Gümüşhane ve Bayburt Karadeniz Bölgesi'nde ama denizsiz (en sinsi iki mayın)
		MY('yn-mayin-4', 'cografya', 1, 'Karadeniz’e kıyısı olan illere bas!', 'Denize kıyısı olmayan her il',
			[52, 28, 61, 53, 8, 60, 58, 29, 69, 24, 25, 75],
			[52, 28, 61, 53, 8],
			{ not: 'Gümüşhane ve Bayburt Karadeniz Bölgesi’nde ama denize kıyıları yok.' }),
		// 5) Akdeniz kıyısı: Osmaniye Akdeniz Bölgesi'nde ama denizsiz; Aydın'ın kıyısı Ege'de
		MY('yn-mayin-5', 'cografya', 1, 'Akdeniz’e kıyısı olan illere bas!', 'Akdeniz’e kıyısı olmayan her il',
			[48, 7, 33, 1, 31, 15, 32, 70, 80, 46, 9, 20, 27],
			[48, 7, 33, 1, 31],
			{ not: 'Osmaniye Akdeniz Bölgesi’nde ama denize kıyısı yok. Aydın’ın kıyısı Ege’de.' }),
		// 6) Marmara Denizi: Sakarya'nın kıyısı yalnız Karadeniz'de, Edirne'ninki yalnız Ege'de, Kırklareli'ninki Karadeniz'de
		MY('yn-mayin-6', 'cografya', 2, 'Marmara Denizi’ne kıyısı olan illere bas!', 'Marmara’ya kıyısı olmayan her il',
			[59, 34, 41, 77, 16, 10, 17, 22, 39, 54, 11, 81],
			[59, 34, 41, 77, 16, 10, 17],
			{ not: 'Sakarya’nın kıyısı yalnız Karadeniz’de, Edirne’ninki yalnız Ege’de.' }),
		// 7) iki deniz: İstanbul, Kocaeli (Karadeniz + Marmara), Çanakkale, Balıkesir (Ege + Marmara), Muğla (Ege + Akdeniz)
		MY('yn-mayin-7', 'cografya', 3, 'İki ayrı denize kıyısı olan illere bas!', 'Tek denize kıyısı olan her il',
			[34, 41, 10, 17, 48, 59, 22, 39, 16, 77, 54, 35, 9],
			[34, 41, 10, 17, 48],
			{ not: 'Muğla’da Ege ile Akdeniz, Çanakkale ve Balıkesir’de Ege ile Marmara buluşur.' }),
		// 8) Karadeniz Bölgesi ama denizsiz: Çankırı ve Yozgat da denizsiz ama İç Anadolu'da (bölge tuzağı)
		MY('yn-mayin-8', 'cografya', 3, 'Karadeniz Bölgesi’nin denizsiz illerine bas!', 'Kıyısı olan ya da başka bölgedeki her il',
			[14, 78, 19, 5, 60, 67, 74, 37, 57, 55, 18, 66, 81],
			[14, 78, 19, 5, 60],
			{ not: 'Çankırı ve Yozgat da denizsiz ama İç Anadolu’da. Çorum ve Amasya Karadeniz’de.' }),
		// 9) Tuz Gölü (verideki göl halkası üç ile değer)
		MY('yn-mayin-9', 'cografya', 2, 'Tuz Gölü’ne kıyısı olan illere bas!', 'Tuz Gölü’ne kıyısı olmayan her il',
			[6, 42, 68, 40, 50, 51, 71, 26, 70, 38],
			[6, 42, 68],
			{ not: 'Tuz Gölü üç ilin sınırında: Ankara, Konya ve Aksaray. Nevşehir yakın ama kıyısız.' }),
		// ---- kara sınırları (veride yabancı kara sınırı ≥ 20 km: 15 il)
		// 10) doğu: Erzurum doğunun kalbinde ama hiçbir ülkeye sınırı yok
		MY('yn-mayin-10', 'cografya', 2, 'Komşu bir ülkeye kara sınırı olan illere bas!', 'Yalnız illerle sınırı olan her il',
			[8, 75, 36, 76, 4, 65, 30, 25, 49, 13, 53, 69, 12],
			[8, 75, 36, 76, 4, 65, 30],
			{ not: 'Erzurum doğunun kalbinde ama hiçbir ülkeye sınırı yok. Iğdır’ın üç ülkeye sınırı var.' }),
		// 11) Suriye sınırı (6 il); Hakkari'nin sınırı Irak ve İran'la
		MY('yn-mayin-11', 'cografya', 2, 'Suriye’ye sınırı olan illere bas!', 'Suriye’ye sınırı olmayan her il',
			[31, 79, 27, 63, 47, 73, 80, 46, 2, 21, 72, 56, 30],
			[31, 79, 27, 63, 47, 73],
			{ not: 'Hakkari’nin sınırı Irak ve İran’la, Suriye’ye değil. Şırnak hem Suriye hem Irak sınırında.' }),
		// 12) hem kıyı hem kara sınırı: Edirne (Ege + Yunanistan, Bulgaristan), Kırklareli, Artvin, Hatay
		MY('yn-mayin-12', 'cografya', 3, 'Hem kıyısı hem ülke sınırı olan illere bas!', 'İkisinden biri eksik olan her il',
			[22, 39, 8, 31, 34, 59, 17, 53, 75, 79, 27, 1, 33],
			[22, 39, 8, 31],
			{ not: 'Yalnız dört il: Edirne, Kırklareli, Artvin ve Hatay. Kilis’in sınırı var, kıyısı yok.' }),
		// ---- komşuluk (merkezin bütün komşuları tarlada; tuzaklar sınıra en yakın komşu olmayanlar)
		// 13) Konya: 9 komşu
		MY('yn-mayin-13', 'cografya', 2, 'Konya’ya komşu illere bas!', 'Konya’ya komşu olmayan her il',
			[3, 6, 7, 26, 32, 33, 51, 68, 70, 15, 50, 43, 1, 40],
			[3, 6, 7, 26, 32, 33, 51, 68, 70],
			{ merkez: 42, not: 'Konya’nın 9 komşusu var. Burdur ve Nevşehir çok yakın ama komşu değil.' }),
		// 14) Sivas: 8 komşu (Elazığ ve Tunceli sınıra çok yakın)
		MY('yn-mayin-14', 'cografya', 1, 'Sivas’a komşu illere bas!', 'Sivas’a komşu olmayan her il',
			[24, 28, 38, 44, 46, 52, 60, 66, 5, 29, 23, 62, 50],
			[24, 28, 38, 44, 46, 52, 60, 66],
			{ merkez: 58, not: 'Sivas’ın 8 komşusu var. Amasya, Elazığ ve Tunceli yakın ama komşu değil.' }),
		// 15) Erzurum: 9 komşu
		MY('yn-mayin-15', 'cografya', 2, 'Erzurum’a komşu illere bas!', 'Erzurum’a komşu olmayan her il',
			[4, 8, 12, 24, 36, 49, 53, 69, 75, 76, 29, 65, 13, 62],
			[4, 8, 12, 24, 36, 49, 53, 69, 75],
			{ merkez: 25, not: 'Erzurum’un 9 komşusu var. Iğdır ve Gümüşhane çok yakın ama komşu değil.' }),
		// 16) Kahramanmaraş: 7 komşu, Sivas da
		MY('yn-mayin-16', 'cografya', 2, 'Kahramanmaraş’a komşu illere bas!', 'Kahramanmaraş’a komşu olmayan her il',
			[1, 2, 27, 38, 44, 58, 80, 31, 79, 63, 51, 23],
			[1, 2, 27, 38, 44, 58, 80],
			{ merkez: 46, not: 'Kahramanmaraş’ın 7 komşusu var, Sivas da onlardan. Hatay ve Kilis değil.' }),
		// 17) Bolu: 8 komşu (Bilecik ve Eskişehir de; Bartın ve Kocaeli değil)
		MY('yn-mayin-17', 'cografya', 3, 'Bolu’ya komşu illere bas!', 'Bolu’ya komşu olmayan her il',
			[6, 11, 18, 26, 54, 67, 78, 81, 41, 74, 37, 16, 71],
			[6, 11, 18, 26, 54, 67, 78, 81],
			{ merkez: 14, not: 'Bolu’nun 8 komşusu var: Bilecik ve Eskişehir de. Bartın ve Kocaeli değil.' }),
		// 18) Diyarbakır: 8 komşu (Muş ve Şanlıurfa da; Siirt değil)
		MY('yn-mayin-18', 'cografya', 3, 'Diyarbakır’a komşu illere bas!', 'Diyarbakır’a komşu olmayan her il',
			[2, 12, 23, 44, 47, 49, 63, 72, 56, 13, 62, 73],
			[2, 12, 23, 44, 47, 49, 63, 72],
			{ merkez: 21, not: 'Diyarbakır’ın 8 komşusu var: Muş ve Şanlıurfa da. Siirt ve Bitlis değil.' }),
		// 19) Afyonkarahisar: 7 komşu (Manisa yakın ama değil)
		MY('yn-mayin-19', 'cografya', 1, 'Afyonkarahisar’a komşu illere bas!', 'Afyonkarahisar’a komşu olmayan her il',
			[15, 20, 26, 32, 42, 43, 64, 45, 7, 6, 11, 9],
			[15, 20, 26, 32, 42, 43, 64],
			{ merkez: 3, not: 'Afyonkarahisar’ın 7 komşusu var. Manisa ve Antalya yakın ama komşu değil.' }),
		// 20) komşu sayısı ≥ 7 (Eskişehir ve Kayseri 6'da kalır)
		MY('yn-mayin-20', 'cografya', 3, 'En az 7 komşusu olan illere bas!', 'Komşusu 6 ya da daha az olan her il',
			[6, 42, 58, 66, 19, 26, 38, 51, 40, 68, 50, 71, 18],
			[6, 42, 58, 66, 19],
			{ not: 'Konya 9, Sivas ve Yozgat 8, Ankara ve Çorum 7 komşulu. Eskişehir ve Kayseri 6’da kalır.' }),
		// 21) tam 3 komşu
		MY('yn-mayin-21', 'cografya', 3, 'Tam 3 komşusu olan illere bas!', 'Komşu sayısı 3 olmayan her il',
			[22, 39, 17, 81, 74, 59, 41, 54, 67, 14, 10, 78],
			[22, 39, 17, 81, 74],
			{ not: 'Edirne, Kırklareli, Çanakkale, Düzce ve Bartın üçer komşulu. Zonguldak’ın 4 komşusu var.' }),
		// ---- coğrafi bölgeler (verideki bölge; tuzaklar bölge sınırındaki "yanlış bilinen" iller)
		// 22) Güneydoğu
		MY('yn-mayin-22', 'cografya', 2, 'Güneydoğu Anadolu’daki illere bas!', 'Başka bölgedeki her il',
			[2, 21, 72, 56, 47, 63, 73, 44, 23, 12, 49, 13, 30],
			[2, 21, 72, 56, 47, 63, 73],
			{ not: 'Malatya, Bitlis ve Hakkari Doğu Anadolu’da; Adıyaman ve Siirt Güneydoğu’da.' }),
		// 23) Ege
		MY('yn-mayin-23', 'cografya', 2, 'Ege Bölgesi’ndeki illere bas!', 'Başka bölgedeki her il',
			[3, 43, 64, 20, 45, 35, 10, 16, 11, 26, 32, 15, 42],
			[3, 43, 64, 20, 45, 35],
			{ not: 'Afyonkarahisar ve Kütahya Ege’de; Isparta ve Burdur Akdeniz’de, Balıkesir Marmara’da.' }),
		// 24) İç Anadolu
		MY('yn-mayin-24', 'cografya', 2, 'İç Anadolu’daki illere bas!', 'Başka bölgedeki her il',
			[26, 6, 71, 18, 66, 40, 68, 14, 19, 43, 3, 11, 5, 78],
			[26, 6, 71, 18, 66, 40, 68],
			{ not: 'Çorum Karadeniz’de, Afyonkarahisar ve Kütahya Ege’de, Bilecik Marmara’da.' }),
		// 25) Akdeniz (doğu)
		MY('yn-mayin-25', 'cografya', 2, 'Akdeniz Bölgesi’ndeki illere bas!', 'Başka bölgedeki her il',
			[33, 1, 80, 31, 46, 70, 51, 38, 27, 79, 2, 44],
			[33, 1, 80, 31, 46],
			{ not: 'Kahramanmaraş ve Osmaniye Akdeniz’de; Gaziantep ve Kilis Güneydoğu’da.' }),
		// 26) Marmara (Düzce Karadeniz'de)
		MY('yn-mayin-26', 'cografya', 1, 'Marmara Bölgesi’ndeki illere bas!', 'Başka bölgedeki her il',
			[54, 41, 11, 16, 77, 10, 81, 14, 26, 43, 45, 35],
			[54, 41, 11, 16, 77, 10],
			{ not: 'Düzce 1999’a dek Bolu’nun ilçesiydi; bugün Karadeniz Bölgesi’nde.' }),
		// 27) Doğu Anadolu (Gümüşhane ve Bayburt Karadeniz'de)
		MY('yn-mayin-27', 'cografya', 2, 'Doğu Anadolu’daki illere bas!', 'Başka bölgedeki her il',
			[24, 25, 62, 12, 23, 44, 29, 69, 8, 58, 2, 21, 61],
			[24, 25, 62, 12, 23, 44],
			{ not: 'Gümüşhane ve Bayburt Karadeniz’de, Adıyaman Güneydoğu’da; Malatya Doğu’da.' }),
		// ---- plaka ve tarih
		// 28) plaka > 40: plakalar eski adların abece sırası (Maraş 46, İçel 33) ve 1989 sonrası iller 68–81
		MY('yn-mayin-28', 'eglence', 3, 'Plakası 40’tan büyük illere bas!', 'Plakası 40 ya da küçük her il',
			[46, 80, 79, 51, 70, 42, 68, 33, 31, 1, 27, 7, 38],
			[46, 80, 79, 51, 70, 42, 68],
			{ not: 'Kahramanmaraş 46 (Maraş adıyla), Mersin 33 (İçel adıyla). Plakalar eski adların sırası.' }),
		// 29) 1990 ve sonrası il olanlar (plaka 72–81)
		MY('yn-mayin-29', 'tarih', 2, '1990’dan bu yana il olan illere bas!', 'Daha önce de il olan her il',
			[72, 73, 79, 80, 56, 47, 27, 30, 21, 2, 31, 13],
			[72, 73, 79, 80],
			{ not: 'Batman ve Şırnak 1990’da, Kilis 1995’te, Osmaniye 1996’da il oldu.' }),
		// 30) Kurtuluş Savaşı unvanı: Gazi (1921), Kahraman (1973), Şanlı (1984)
		MY('yn-mayin-30', 'tarih', 2, 'Adına Kurtuluş Savaşı unvanı eklenen illere bas!', 'Adı unvansız her il',
			[27, 46, 63, 80, 1, 31, 79, 2, 44, 47, 21],
			[27, 46, 63],
			{ not: 'Antep’e Gazi (1921), Maraş’a Kahraman (1973), Urfa’ya Şanlı (1984) unvanı verildi.' }),
		// 31) büyükşehirler (30 il; Ege ve çevresi): Çanakkale, Uşak, Afyonkarahisar ve Kütahya değil
		MY('yn-mayin-31', 'eglence', 3, 'Büyükşehir olan illere bas!', 'Büyükşehir olmayan her il',
			[35, 45, 9, 20, 48, 10, 16, 64, 3, 43, 15, 32, 17],
			[35, 45, 9, 20, 48, 10, 16],
			{ not: 'Türkiye’de 30 büyükşehir var. Çanakkale, Uşak ve Kütahya bunlardan değil.' }),
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
		// ---- yönler (il merkezleri arasında büyük farklar: veride il ortalarıyla da doğrulanır)
		// 4) Karadeniz kıyısı batıdan doğuya
		RT('yn-rota-4', 'cografya', 1, 'Karadeniz kıyısını batıdan doğuya uç!', [
			[67, 'Kömür'],
			[57, 'En kuzey'],
			[55, '19 Mayıs'],
			[52, 'Fındık'],
			[61, 'Sümela'],
			[53, 'Çay'],
		]),
		// 5) Akdeniz kıyısı batıdan doğuya
		RT('yn-rota-5', 'cografya', 1, 'Akdeniz kıyısını batıdan doğuya uç!', [
			[48, 'Fethiye'],
			[7, 'Alanya'],
			[33, 'Silifke'],
			[1, 'Karataş'],
			[31, 'İskenderun'],
		]),
		// 6) kuzeyden güneye boydan boya
		RT('yn-rota-6', 'cografya', 1, 'Türkiye’yi kuzeyden güneye boydan boya uç!', [
			[57, 'İnceburun'],
			[19, 'Hattuşa'],
			[66, 'Bozok'],
			[38, 'Erciyes'],
			[1, 'Çukurova'],
			[31, 'Antakya'],
		]),
		// 7) Suriye sınırı batıdan doğuya (sınırdaki altı ilin hepsi)
		RT('yn-rota-7', 'cografya', 2, 'Suriye sınırını batıdan doğuya uç!', [
			[31, 'Yayladağı'],
			[79, 'Öncüpınar'],
			[27, 'Karkamış'],
			[63, 'Akçakale'],
			[47, 'Nusaybin'],
			[73, 'Cizre'],
		]),
		// 8) doğu sınırı kuzeyden güneye: Gürcistan, Ermenistan, Nahçıvan, İran, Irak
		RT('yn-rota-8', 'cografya', 2, 'Doğu sınırını kuzeyden güneye uç!', [
			[8, 'Gürcistan'],
			[36, 'Ermenistan'],
			[76, 'Nahçıvan'],
			[4, 'Doğubayazıt'],
			[65, 'Kapıköy'],
			[30, 'Irak'],
		]),
		// 9) Marmara kıyısı saat yönünde (Tekirdağ'dan)
		RT('yn-rota-9', 'cografya', 2, 'Tekirdağ’dan Marmara kıyısını saat yönünde dolaş!', [
			[59, 'Kalkış'],
			[34, 'Boğaz'],
			[41, 'İzmit'],
			[77, 'Çınarcık'],
			[16, 'Mudanya'],
			[10, 'Bandırma'],
		]),
		// 10) Kuzey Anadolu Fayı doğudan batıya
		RT('yn-rota-10', 'bilim', 3, 'Kuzey Anadolu Fayı’nı doğudan batıya izle!', [
			[24, 'Kalkış'],
			[60, 'Niksar'],
			[19, 'Kargı'],
			[14, 'Gerede'],
			[81, 'Kaynaşlı'],
			[41, 'Gölcük'],
		]),
		// ---- akarsular (kaynaktan ağza; verideki ırmak çizgisi de bu sırayla geçer)
		// 11) Kızılırmak
		RT('yn-rota-11', 'cografya', 3, 'Kızılırmak’ı kaynağından denize uç!', [
			[58, 'Kaynak'],
			[38, 'Yamula'],
			[50, 'Avanos'],
			[40, 'Hirfanlı'],
			[71, 'Kapulukaya'],
			[55, 'Bafra'],
		]),
		// 12) Dicle
		RT('yn-rota-12', 'cografya', 2, 'Dicle’yi kaynağından sınıra uç!', [
			[23, 'Hazar Gölü'],
			[21, 'Surlar'],
			[72, 'Hasankeyf'],
			[73, 'Cizre'],
		]),
		// 13) Fırat: kartta kıyısındaki yerler (ırmak illerin sınırını da çizer: il adı yerine yer adı)
		RT('yn-rota-13', 'cografya', 3, 'Fırat’ı kaynağından Suriye sınırına uç!', [
			[25, 'Karasu', 'Erzurum'],
			[24, 'Erzincan', 'Kemaliye'],
			[23, 'Elazığ', 'Keban'],
			[63, 'Şanlıurfa', 'Birecik'],
			[27, 'Gaziantep', 'Karkamış'],
		]),
		// ---- ölçüler (veriden: doruk yükseltisi, il alanı)
		// 14) dağlar alçaktan yükseğe
		RT('yn-rota-14', 'cografya', 3, 'Dağları alçaktan yükseğe uç!', [
			[16, '2543 m', 'Uludağ'],
			[25, '3176 m', 'Palandöken'],
			[68, '3268 m', 'Hasan Dağı'],
			[51, '3756 m', 'Demirkazık'],
			[38, '3917 m', 'Erciyes'],
			[30, '4135 m', 'Uludoruk'],
		]),
		// 15) il merkezleri alçaktan yükseğe
		RT('yn-rota-15', 'cografya', 2, 'İl merkezlerini alçaktan yükseğe uç!', [
			[35, 'deniz düzeyi'],
			[6, '~900 m'],
			[58, '~1300 m'],
			[36, '~1750 m'],
			[25, '~1900 m'],
		]),
		// 16) yüzölçümü büyükten küçüğe (en büyük Konya, en küçük Yalova)
		RT('yn-rota-16', 'cografya', 2, 'İlleri yüzölçümüne göre büyükten küçüğe uç!', [
			[42, 'En büyük'],
			[58, '2. büyük'],
			[38, '~17 bin km²'],
			[31, '~5 bin km²'],
			[74, '~2 bin km²'],
			[77, 'En küçük'],
		]),
		// 17) doğal göller büyükten küçüğe (kartta göl, haritada ili)
		RT('yn-rota-17', 'cografya', 2, 'Doğal gölleri büyükten küçüğe uç!', [
			[65, 'Sodalı', 'Van Gölü'],
			[68, 'Tuzlu', 'Tuz Gölü'],
			[42, 'Tatlı su', 'Beyşehir'],
			[32, 'Elma', 'Eğirdir'],
			[16, 'Konsil', 'İznik'],
		]),
		// 18) plaka sırası: Hatay 31, Mersin 33 (İçel), Kahramanmaraş 46 (Maraş), Kilis 79, Osmaniye 80
		RT('yn-rota-18', 'eglence', 3, 'İlleri plaka numarasına göre küçükten büyüğe uç!', [
			[31, '31'],
			[33, '33 · İçel'],
			[46, '46 · Maraş'],
			[79, '79'],
			[80, '80'],
		]),
		// ---- tarih
		// 19) Anadolu'nun dönüm noktaları
		RT('yn-rota-19', 'tarih', 1, 'Dönüm noktalarını tarih sırasıyla uç!', [
			[49, '1071', 'Malazgirt'],
			[16, '1326'],
			[34, '1453'],
			[17, '1915', 'Çanakkale'],
			[43, '1922', 'Dumlupınar'],
		]),
		// 20) Osmanlı ve Cumhuriyet başkentleri
		RT('yn-rota-20', 'tarih', 1, 'Başkentleri sırasıyla uç!', [
			[11, 'Kuruluş', 'Söğüt'],
			[16, '1326'],
			[22, '1360’lar'],
			[34, '1453'],
			[6, '1923'],
		]),
		// 21) Kurtuluş Savaşı: İnönü'den Cumhuriyet'e
		RT('yn-rota-21', 'tarih', 2, 'İnönü’den Cumhuriyet’e: Kurtuluş’u sırayla uç!', [
			[26, '1921', 'İnönü'],
			[3, '26 Ağustos', 'Kocatepe'],
			[43, '30 Ağustos', 'Dumlupınar'],
			[35, '9 Eylül', 'İzmir'],
			[16, '11 Ekim 1922', 'Mudanya'],
			[6, '29 Ekim 1923', 'Ankara'],
		]),
		// 22) Anadolu uygarlıklarının başkentleri
		RT('yn-rota-22', 'tarih', 3, 'Uygarlıkların başkentlerini eskiden yeniye uç!', [
			[19, 'Hititler', 'Hattuşa'],
			[6, 'Frigler', 'Gordion'],
			[45, 'Lidyalılar', 'Sardes'],
			[42, 'Selçuklular', 'Konya'],
			[16, 'Osmanlılar', 'Bursa'],
		]),
		// 23) 1989 sonrası yeni iller (her yıldan bir il; plaka sırası da kuruluş sırası)
		RT('yn-rota-23', 'tarih', 3, 'Yeni illeri il oldukları sırayla uç!', [
			[71, '1989'],
			[72, '1990'],
			[74, '1991'],
			[75, '1992'],
			[79, '1995'],
			[81, '1999'],
		]),
		// ---- kültür, sanat, bilim, spor
		// 24) UNESCO Dünya Mirası: listeye giriş (eski)
		RT('yn-rota-24', 'sanat', 2, 'Dünya Mirası listesine giriş sırasıyla uç!', [
			[19, '1986', 'Hattuşa'],
			[2, '1987', 'Nemrut'],
			[20, '1988', 'Pamukkale'],
			[78, '1994', 'Safranbolu'],
			[17, '1998', 'Truva'],
		]),
		// 25) UNESCO Dünya Mirası: listeye giriş (yeni); en eski yer (Göbeklitepe) listeye en son girenlerden
		RT('yn-rota-25', 'sanat', 3, 'Son Dünya Mirası alanlarını listeye giriş sırasıyla uç!', [
			[42, '2012', 'Çatalhöyük'],
			[36, '2016', 'Ani'],
			[9, '2017', 'Afrodisias'],
			[63, '2018', 'Göbeklitepe'],
			[44, '2021', 'Arslantepe'],
			[6, '2023', 'Gordion'],
		]),
		// 26) camiler yapım sırasıyla
		RT('yn-rota-26', 'sanat', 2, 'Camileri yapım sırasıyla uç!', [
			[58, '1228', 'Divriği'],
			[16, '1399', 'Bursa Ulu'],
			[22, '1575', 'Selimiye'],
			[34, '1616', 'Sultanahmet'],
			[6, '1987', 'Kocatepe'],
		]),
		// 27) ustalar doğum sırasıyla, doğdukları ile
		RT('yn-rota-27', 'sanat', 3, 'Ustaları doğum sırasıyla uç: doğdukları ile!', [
			[59, '1840', 'Namık Kemal'],
			[21, '1876', 'Ziya Gökalp'],
			[58, '1894', 'Âşık Veysel'],
			[54, '1906', 'Sait Faik'],
			[40, '1938', 'Neşet Ertaş'],
		]),
		// 28) Anadolu'nun bilginleri doğum sırasıyla (Milet, Halikarnas, Sinop, Amasya, Bergama, Gelibolu)
		RT('yn-rota-28', 'bilim', 3, 'Anadolu’nun bilginlerini doğum sırasıyla uç!', [
			[9, 'MÖ ~624', 'Thales'],
			[48, 'MÖ ~484', 'Herodot'],
			[57, 'MÖ ~410', 'Diogenes'],
			[5, 'MÖ ~64', 'Strabon'],
			[35, 'MS 129', 'Galenos'],
			[17, '~1470', 'Piri Reis'],
		]),
		// 29) kulüpler kuruluş sırasıyla
		RT('yn-rota-29', 'spor', 3, 'Kulüpleri kuruluş yılına göre uç!', [
			[34, '1905', 'Galatasaray'],
			[6, '1910', 'Ankaragücü'],
			[35, '1914', 'Altay'],
			[16, '1963', 'Bursaspor'],
			[26, '1965', 'Eskişehirspor'],
			[61, '1967', 'Trabzonspor'],
		]),
		// 30) Doğu Ekspresi: Ankara'dan Kars'a
		RT('yn-rota-30', 'eglence', 2, 'Doğu Ekspresi’yle Ankara’dan Kars’a uç!', [
			[6, 'Kalkış'],
			[38, 'Erciyes'],
			[58, 'Divriği yolu'],
			[24, 'Kemah'],
			[25, 'Palandöken'],
			[36, 'Son durak'],
		]),
		// 31) Ankara–İstanbul hızlı treni
		RT('yn-rota-31', 'eglence', 1, 'Hızlı trenle Ankara’dan İstanbul’a uç!', [
			[6, 'Kalkış'],
			[26, 'Porsuk'],
			[11, 'Bozüyük'],
			[54, 'Arifiye'],
			[41, 'İzmit'],
			[34, 'Varış'],
		]),
	],
};
