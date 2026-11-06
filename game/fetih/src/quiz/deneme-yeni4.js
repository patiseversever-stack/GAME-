// YENİ 10 · deneme grubu 4 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   penalti  Penaltı       dört şık kalenin dört köşesinde; köşeye dokun, şutu çek. Kaleci rakiptir ve rakibin kendi
//                          seçtiği köşeye uçar. Doğru: GOL (ağ şişer, flaş, konfeti); yanlış: direk, aut ya da kurtarış
//
// Örnekler elle yazıldı; her bilgi oyunun kendi verisiyle (src/data/turkiye.json: il, plaka, bölge, komşuluk, kıyı) ve
// genel kaynaklarla sınandı. Haritaya dayanan olgular test/yeni4.test.mjs'te veriden yeniden doğrulanır.
// hava: gece maçı, karlı derbi ya da akşam finali (yalnız sahne; sırayla dağıtılır).

import { PROFILE } from './timing.js';
import { penalti } from './d_penalti.js';

// süre profili (d_ortak.js stamp): Penaltı dört şıklı testle aynı iş (oku, dört panoyu tara, köşeye dokun)
Object.assign(PROFILE, {
	penalti: { min: 10, max: 25, think: [2.5, 1.25] },
});

export const TYPES = { penalti };
export const ORDER = [
	['penalti', 'Penaltı', 'Köşeni seç, şutu çek: kaleci rakibin'],
];

const HV = ['gece', 'kar', 'aksam'];
let n = 0;
const PK = (id, cat, diff, q, a, hava = HV[n++ % 3]) => ({ id, cat, diff, type: 'penalti', hava, q, a });

export const SAMPLES = {
	penalti: [
		// 17 Mayıs 2000, Kopenhag; 0-0 biten final penaltılarla 4-1 (çeldiriciler aynı kupa yolunun rakipleri: yarı finalde
		// Leeds United, son 16'da Borussia Dortmund; Real Madrid aynı yılın Süper Kupası)
		PK('yn-penalti-1', 'spor', 1, 'Galatasaray 2000 UEFA Kupası finalinde penaltılarla hangi takımı yendi?', ['Arsenal', 'Leeds United', 'Borussia Dortmund', 'Real Madrid']),
		// Sinekli Bakkal (1936) Halide Edib'in; Çalıkuşu ve Yaprak Dökümü Reşat Nuri'nin, Kürk Mantolu Madonna Sabahattin Ali'nin
		PK('yn-penalti-2', 'sanat', 2, 'Hangisi Halide Edib Adıvar’ın romanıdır?', ['Sinekli Bakkal', 'Çalıkuşu', 'Yaprak Dökümü', 'Kürk Mantolu Madonna']),
		// James Watson ve Francis Crick, Nature 1953; çeldiriciler başka ünlü bilim ikilileri
		PK('yn-penalti-3', 'bilim', 3, 'DNA’nın çift sarmal yapısını 1953’te ortaya koyan ikili hangisidir?', ['Watson ve Crick', 'Darwin ve Wallace', 'Pierre ve Marie Curie', 'Bohr ve Rutherford']),

		// Bankada (src/data/q) zaten sorulan olgular burada yinelenmez: her soru bankayla otomatik karşılaştırıldı (aynı soru ya da
		// aynı cevaplı aynı olgu yok). Haritaya dayanan sorular test/yeni4.test.mjs'te turkiye.json'dan yeniden hesaplanır.

		// ---------------------------------------------------------------- spor
		// Kural 1: direkler arası 7,32 m (8 yarda), yükseklik 2,44 m; 5,5 m altı pas derinliği
		PK('yn-penalti-4', 'spor', 2, 'Bir futbol kalesinin iki direği arası kaç metredir?', ['7,32 metre', '6,40 metre', '8,50 metre', '5,50 metre']),
		// EURO 1976 finali, Belgrad: Çekoslovakya–Batı Almanya penaltılarında son atış, ortadan kaşıkla
		PK('yn-penalti-5', 'spor', 3, 'Kaşık penaltıya adını veren Antonín Panenka hangi ülkenin oyuncusuydu?', ['Çekoslovakya', 'Macaristan', 'Yugoslavya', 'Polonya']),
		// bowling: art arda üç strike "turkey"; spare ikinci atışta kalanları devirmek, split aralı kalan lobutlar
		PK('yn-penalti-6', 'spor', 3, 'Bowlingde art arda üç strike yapmaya ne ad verilir?', ['Turkey', 'Spare', 'Split', 'Double']),
		// 1972'den beri olimpik halter iki kaldırış: koparma ve silkme (basma kaldırıldı)
		PK('yn-penalti-7', 'spor', 2, 'Bugünkü olimpik halterde koparmanın yanındaki öbür kaldırış hangisidir?', ['Silkme', 'Basma', 'Çekme', 'İtme']),
		// sekiz top bilardo: 15 renkli top üçgende dizilir (dokuz top oyunu 9 topla oynanır)
		PK('yn-penalti-8', 'spor', 3, 'Sekiz top bilardoda oyun başında beyaz topun dışında kaç top dizilir?', ['15', '16', '9', '10']),
		// IOC: altın madalya en az %92,5 gümüştür, üstü en az 6 g altınla kaplanır (1912'den beri)
		PK('yn-penalti-9', 'spor', 3, 'Olimpiyat altın madalyası büyük ölçüde hangi metalden yapılır?', ['Gümüş', 'Altın', 'Bronz', 'Bakır']),

		// ---------------------------------------------------------------- tarih
		// 1517 Mısır seferi: halifelik Yavuz Sultan Selim döneminde Osmanlılara geçti
		PK('yn-penalti-10', 'tarih', 2, 'Halifelik Osmanlılara hangi padişahın döneminde geçti?', ['Yavuz Sultan Selim', 'Kanuni Sultan Süleyman', 'II. Bayezid', 'Fatih Sultan Mehmet']),
		// Danimarkalı dilbilimci Vilhelm Thomsen, 1893 (Radloff metinleri yayımladı, Champollion hiyeroglifleri çözdü)
		PK('yn-penalti-11', 'tarih', 3, 'Orhun Yazıtları’nı ilk kez çözen bilim insanı kimdir?', ['Vilhelm Thomsen', 'Wilhelm Radloff', 'Heinrich Schliemann', 'Champollion']),
		// 11 Ağustos 1473: Fatih, Akkoyunlu hükümdarı Uzun Hasan'ı yendi
		PK('yn-penalti-12', 'tarih', 3, 'Fatih Sultan Mehmet 1473’te Otlukbeli Savaşı’nda kimi yendi?', ['Uzun Hasan', 'Timur', 'Şah İsmail', 'Kadı Burhaneddin']),
		// II. Osman (1618–1622), yeniçerilerce tahttan indirildi
		PK('yn-penalti-13', 'tarih', 2, '“Genç Osman” diye anılan padişah hangisidir?', ['II. Osman', 'III. Osman', 'IV. Murad', 'I. Mustafa']),
		// 28 Eylül 1538 Preveze: Kutsal İttifak donanmasının komutanı Cenevizli Andrea Doria
		PK('yn-penalti-14', 'tarih', 2, 'Barbaros Hayreddin Paşa Preveze’de hangi Haçlı amiralini yendi?', ['Andrea Doria', 'Kristof Kolomb', 'Vasco da Gama', 'Francis Drake']),
		// 1453: Macar ustası Urban'ın döktüğü dev toplar
		PK('yn-penalti-15', 'tarih', 2, 'İstanbul kuşatmasında surları döven dev Osmanlı toplarına ne ad verilir?', ['Şahi', 'Havan', 'Obüs', 'Kolomborna']),
		// 29 Ekim 1923 gecesi Cumhuriyetin ilanı Ankara'da 101 pare top atışıyla kutlandı
		PK('yn-penalti-16', 'tarih', 3, 'Cumhuriyetin ilan edildiği gece Ankara’da kaç pare top atıldı?', ['101', '21', '41', '81']),

		// ---------------------------------------------------------------- coğrafya (hepsi turkiye.json ile sınanır)
		// plaka: Adıyaman 02, Afyonkarahisar 03, Ağrı 04, Amasya 05
		PK('yn-penalti-17', 'cografya', 1, 'Hangisinin plaka kodu en küçüktür?', ['Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya']),
		// Hakkari İran ve Irak'a; Şırnak Irak ve Suriye'ye; Van yalnız İran'a; Mardin Suriye'ye
		PK('yn-penalti-18', 'cografya', 2, 'Hem İran’a hem Irak’a sınırı olan tek il hangisidir?', ['Hakkari', 'Şırnak', 'Van', 'Mardin']),
		// veri: Bayburt'un deniz kıyısı yok; Rize, Ordu, Sinop Karadeniz kıyısında
		PK('yn-penalti-19', 'cografya', 2, 'Hangi ilin Karadeniz’e kıyısı yoktur?', ['Bayburt', 'Rize', 'Ordu', 'Sinop']),
		// veri: Konya'nın komşuları Afyonkarahisar, Ankara, Antalya, Eskişehir, Isparta, Mersin, Niğde, Aksaray, Karaman
		PK('yn-penalti-20', 'cografya', 3, 'Hangi il Konya’ya komşu değildir?', ['Kayseri', 'Antalya', 'Mersin', 'Isparta']),
		// veri: Bilecik'in deniz kıyısı yok; Yalova (Marmara), Bartın ve Düzce (Karadeniz) kıyı ili
		PK('yn-penalti-21', 'cografya', 2, 'Hangi ilin denize kıyısı yoktur?', ['Bilecik', 'Yalova', 'Bartın', 'Düzce']),
		// veri: Düzce 81, Osmaniye 80, Kilis 79, Yalova 77
		PK('yn-penalti-22', 'cografya', 1, 'Plaka numarası en büyük olan il hangisidir?', ['Düzce', 'Kilis', 'Osmaniye', 'Yalova']),
		// Ekvator Güney Amerika, Afrika ve Asya'dan (Endonezya) geçer; Avrupa'dan geçmez
		PK('yn-penalti-23', 'cografya', 1, 'Ekvator hangi kıtadan geçmez?', ['Avrupa', 'Afrika', 'Güney Amerika', 'Asya']),
		// veri: Akdeniz Bölgesi'nin sekiz ilinden yalnız Hatay'ın yabancı bir ülkeyle (Suriye) kara sınırı var
		PK('yn-penalti-24', 'cografya', 2, 'Akdeniz Bölgesi’nde yabancı bir ülkeye kara sınırı olan tek il hangisidir?', ['Hatay', 'Mersin', 'Adana', 'Osmaniye']),
		// veri: Karadeniz Bölgesi'nde yalnız Artvin (Gürcistan); Ardahan da Gürcistan'a komşu ama Doğu Anadolu'da
		PK('yn-penalti-25', 'cografya', 3, 'Karadeniz Bölgesi’nde yabancı bir ülkeye kara sınırı olan tek il hangisidir?', ['Artvin', 'Rize', 'Trabzon', 'Ardahan']),
		// veri: 06 + 01 = 07 (Antalya); Artvin 08, Aydın 09, Ağrı 04
		PK('yn-penalti-26', 'cografya', 3, 'Ankara ile Adana’nın plaka kodları toplanırsa hangi ilin plakası çıkar?', ['Antalya', 'Artvin', 'Aydın', 'Ağrı']),

		// ---------------------------------------------------------------- bilim
		// 20 °C kuru havada ≈ 343 m/sn
		PK('yn-penalti-27', 'bilim', 2, 'Ses havada saniyede yaklaşık kaç metre yol alır?', ['343', '1000', '150', '3000']),
		// Fe demir (Latince ferrum); flor F, fosfor P, fermiyum Fm
		PK('yn-penalti-28', 'bilim', 1, 'Periyodik tabloda Fe hangi elementin simgesidir?', ['Demir', 'Flor', 'Fosfor', 'Fermiyum']),
		PK('yn-penalti-29', 'bilim', 1, 'Hangisi memeli değildir?', ['Penguen', 'Yunus', 'Yarasa', 'Balina']),
		// N₂O, diazot monoksit (azot protoksit)
		PK('yn-penalti-30', 'bilim', 3, '“Gülme gazı” olarak bilinen gaz hangisidir?', ['Diazot monoksit', 'Karbon monoksit', 'Ozon', 'Metan']),
		// iki kulakçık, bir karıncık
		PK('yn-penalti-31', 'bilim', 2, 'Kurbağanın kalbi kaç odacıklıdır?', ['3', '2', '4', '5']),
		// Jüpiter, Satürn, Uranüs ve Neptün'ün halkaları var; Merkür'ün yok
		PK('yn-penalti-32', 'bilim', 3, 'Hangi gezegenin halkası yoktur?', ['Merkür', 'Satürn', 'Jüpiter', 'Uranüs']),

		// ---------------------------------------------------------------- sanat ve edebiyat
		PK('yn-penalti-33', 'sanat', 2, 'Hababam Sınıfı (1975) filminin yönetmeni kimdir?', ['Ertem Eğilmez', 'Yılmaz Güney', 'Atıf Yılmaz', 'Halit Refiğ']),
		// "Saçma ey göz eşkden gönlümdeki odlara su" (Su Kasidesi, Fuzûlî)
		PK('yn-penalti-34', 'sanat', 3, 'Su Kasidesi hangi divan şairinindir?', ['Fuzûlî', 'Bâkî', 'Nedîm', 'Nef’î']),
		// türbe Süleymaniye Külliyesi'nin köşesinde, kendi tasarımı
		PK('yn-penalti-35', 'sanat', 3, 'Mimar Sinan’ın türbesi hangi külliyenin yanındadır?', ['Süleymaniye', 'Selimiye', 'Şehzade', 'Mihrimah Sultan']),
		PK('yn-penalti-36', 'sanat', 2, 'Han Duvarları şiirinin şairi kimdir?', ['Faruk Nafiz Çamlıbel', 'Ahmet Kutsi Tecer', 'Kemalettin Kamu', 'Yahya Kemal']),
		// Âşık Veysel Şatıroğlu, Sivas'ın Şarkışla ilçesine bağlı Sivrialan köyünde doğdu
		PK('yn-penalti-37', 'sanat', 2, 'Âşık Veysel hangi ilde doğdu?', ['Sivas', 'Kırşehir', 'Yozgat', 'Tokat']),
		// Vivaldi 1678'de Venedik'te doğdu
		PK('yn-penalti-38', 'sanat', 3, 'Antonio Vivaldi hangi şehirde doğdu?', ['Venedik', 'Roma', 'Milano', 'Napoli']),

		// ---------------------------------------------------------------- genel kültür
		PK('yn-penalti-39', 'eglence', 2, 'Tangram bulmacası kaç parçadan oluşur?', ['7', '5', '9', '12']),
		// her yüzün ortasında bir merkez parça
		PK('yn-penalti-40', 'eglence', 3, 'Klasik 3×3 Rubik küpünde kaç merkez parça vardır?', ['6', '8', '12', '9']),
		// ½ × ½
		PK('yn-penalti-41', 'eglence', 2, 'Bir parayı iki kez atınca iki kez de tura gelme olasılığı kaçtır?', ['1/4', '1/2', '1/3', '1/8']),
		// 9 küçük + 4 orta (2×2) + 1 büyük (3×3)
		PK('yn-penalti-42', 'eglence', 3, '3×3’lük bir karelajda her boyuttaki kareler sayılırsa kaç kare vardır?', ['14', '9', '10', '13']),
		// 52 kâğıt, dört renk (kupa, karo, maça, sinek)
		PK('yn-penalti-43', 'eglence', 1, 'Jokersiz bir iskambil destesinde kaç kupa kartı vardır?', ['13', '12', '4', '26']),
		// sarı, mavi, siyah, kırmızı
		PK('yn-penalti-44', 'eglence', 1, 'Okey taşlarında kaç farklı renk vardır?', ['4', '3', '5', '2']),
		// n düz kesişle en çok 1 + n(n+1)/2 parça
		PK('yn-penalti-45', 'eglence', 3, 'Bir pizzayı üç düz kesişle en çok kaç parçaya bölebilirsin?', ['7', '6', '8', '9']),
		// 51 = 3 × 17; 53, 59, 61 asal
		PK('yn-penalti-46', 'eglence', 2, 'Hangisi asal sayı değildir?', ['51', '53', '59', '61']),
	],
};
