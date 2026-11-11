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

		// ================================================================ ek 74 soru (47–120): her biri bankayla (soru metni, doğru
		// cevap, Yıldırım/Halat/İki Doğru/Yanlış Kelime cümleleri) karşılaştırıldı; aynı bilgiyi soran ya da açıklamasında veren soru
		// olanlar yazılmadı. Haritaya ve hesaba dayananlar test/yeni4.test.mjs'te yeniden doğrulanır.

		// ---------------------------------------------------------------- spor
		// 10 fit = 3,05 m (FIBA ve NBA aynı)
		PK('yn-penalti-47', 'spor', 2, 'Basketbol potasının çemberi yerden kaç metre yüksektedir?', ['3,05 metre', '2,75 metre', '3,35 metre', '2,90 metre']),
		// üç devre × 20 dakika
		PK('yn-penalti-48', 'spor', 2, 'Bir buz hokeyi maçı kaç devreden oluşur?', ['3', '2', '4', '5']),
		// dokuz inning; beraberlikte uzar
		PK('yn-penalti-49', 'spor', 2, 'Beyzbolda bir maç normalde kaç devreden (inning) oluşur?', ['9', '7', '6', '10']),
		// love = 0 (15, 30, 40; beraberlik deuce, avantaj advantage)
		PK('yn-penalti-50', 'spor', 2, 'Teniste skor söylenirken “love” sözcüğü ne anlama gelir?', ['Sıfır', 'Beraberlik', 'Avantaj', 'Maç sayısı']),
		// Test maçı en çok beş gün sürer (ODI tek gün, T20 birkaç saat)
		PK('yn-penalti-51', 'spor', 3, 'Kriketin en uzun biçimi olan Test maçı en çok kaç gün sürer?', ['5', '3', '7', '2']),
		// Golden Slam: Steffi Graf 1988 (dört Grand Slam + Seul altını aynı yıl); kariyer boyunca toplanana Kariyer Altın Slam denir
		PK('yn-penalti-52', 'spor', 3, 'Aynı yıl dört Grand Slam ve olimpiyat altınını kazanmaya ne denir?', ['Altın Slam', 'Kariyer Slam', 'Büyük Slam', 'Gümüş Slam']),
		// tee: ilk vuruşta topun kondurulduğu küçük çubuk; par delik için öngörülen vuruş, green delik çevresi, bogey par’ın bir üstü
		PK('yn-penalti-53', 'spor', 2, 'Golfte topun ilk vuruş için üzerine konduğu küçük çubuğa ne denir?', ['Tee', 'Par', 'Green', 'Bogey']),
		// caddie: sopa çantasını taşıyan, oyuncuya yol gösteren yardımcı; rough uzun çimli alan, birdie par’ın bir altı
		PK('yn-penalti-54', 'spor', 2, 'Golfte oyuncunun sopa çantasını taşıyan yardımcıya ne denir?', ['Caddie', 'Tee', 'Rough', 'Birdie']),
		// 1924 Chamonix (Fransa); St. Moritz 1928 ve 1948, Oslo 1952, Innsbruck 1964 ve 1976
		PK('yn-penalti-55', 'spor', 3, 'İlk Kış Olimpiyatları 1924’te hangi şehirde yapıldı?', ['Chamonix', 'St. Moritz', 'Oslo', 'Innsbruck']),
		// 15’li ragbide (rugby union) deneme 5 sayı (1992’den beri), dönüşüm vuruşu 2, penaltı 3
		PK('yn-penalti-56', 'spor', 3, '15 kişilik ragbide bir denemeyle (try) kaç sayı kazanılır?', ['5', '3', '6', '7']),
		// touchdown 6 sayı; ardından ek vuruşla 1 ya da ek oyunla 2 sayı; field goal 3
		PK('yn-penalti-57', 'spor', 2, 'Amerikan futbolunda touchdown kaç sayı değerindedir?', ['6', '7', '3', '5']),
		// wicket: üç dikey çubuk (stump) ve üstündeki iki tahtacık (bail); pitch oyun şeridi, crease çizgi, over altı atış
		PK('yn-penalti-58', 'spor', 3, 'Kriketteki üç dikey çubuk ve üstündeki tahtacıklara ne denir?', ['Wicket', 'Pitch', 'Crease', 'Over']),

		// ---------------------------------------------------------------- tarih
		// 15 Haziran 1215 Runnymede: İngiliz baronları Kral John’a (Yurtsuz John) imzalattı; Aslan Yürekli Richard onun ağabeyiydi
		PK('yn-penalti-59', 'tarih', 3, 'Magna Carta 1215’te hangi İngiliz kralına imzalatıldı?', ['Yurtsuz John', 'Aslan Yürekli Richard', 'VIII. Henry', 'Fatih William']),
		// Kastilya Kraliçesi I. Isabella (eşi Aragonlu Ferdinand); Aragonlu Katerina onun kızı, I. Elizabeth ve Mary Stuart sonraki yüzyıl
		PK('yn-penalti-60', 'tarih', 2, 'Kolomb’un 1492 seferini destekleyen kraliçe kimdir?', ['Kastilyalı Isabella', 'I. Elizabeth', 'Aragonlu Katerina', 'Mary Stuart']),
		// 11 Ekim 1922 Mudanya Ateşkesi’ni Batı Cephesi Komutanı İsmet Paşa imzaladı; Fevzi Paşa Genelkurmay Başkanıydı
		PK('yn-penalti-61', 'tarih', 2, 'Mudanya Ateşkesi’ni Türk tarafı adına kim imzaladı?', ['İsmet Paşa', 'Fevzi Paşa', 'Kâzım Karabekir', 'Refet Paşa']),
		// Ridaniye 1517: Tomanbay; Kansu Gavri 1516 Mercidabık’ta öldü; Baybars ve Kalavun 13. yüzyılın Memlük sultanları
		PK('yn-penalti-62', 'tarih', 3, 'Ridaniye’de Yavuz Sultan Selim’e yenilen Memlük sultanı kimdir?', ['Tomanbay', 'Kansu Gavri', 'Baybars', 'Kalavun']),
		// ilk kaime 1840’ta, Abdülmecid döneminde (Tanzimat’ın hemen ardından) basıldı
		PK('yn-penalti-63', 'tarih', 3, 'Osmanlı’da ilk kâğıt para (kaime) hangi padişah döneminde basıldı?', ['Abdülmecid', 'II. Mahmud', 'Abdülaziz', 'III. Selim']),
		// 16 Ekim 1793, Paris; XVI. Louis’nin eşi. Jozefin Napolyon’un eşi, Maria Theresa Avusturya hükümdarı (Marie Antoinette’in annesi)
		PK('yn-penalti-64', 'tarih', 1, 'Fransız İhtilali’nde giyotinle idam edilen kraliçe kimdir?', ['Marie Antoinette', 'Jozefin', 'Maria Theresa', 'Büyük Katerina']),
		// Venedik’in ömür boyu seçilen devlet başkanı: doç (doge; Doçlar Sarayı)
		PK('yn-penalti-65', 'tarih', 3, 'Venedik Cumhuriyeti’nin seçimle gelen yöneticisine ne denirdi?', ['Doç', 'Konsül', 'Senyör', 'Tribün']),
		// 1878 Berlin Kongresi’nin ev sahibi ve başkanı Alman şansölye Otto von Bismarck; Metternich Avusturyalı ve daha önceki dönemden
		PK('yn-penalti-66', 'tarih', 2, '1878 Berlin Kongresi’ne ev sahipliği yapan Alman şansölye kimdir?', ['Bismarck', 'Metternich', 'Kaiser Wilhelm', 'Moltke']),
		// Endülüs Emevileri (756–1031) başkenti Kurtuba (Córdoba); Gırnata son Müslüman kent, İşbiliye Sevilla, Tuleytula Toledo
		PK('yn-penalti-67', 'tarih', 3, 'Endülüs Emevi Devleti’nin başkenti hangi şehirdi?', ['Kurtuba', 'Gırnata', 'İşbiliye', 'Tuleytula']),
		// I. Justinianus’un eşi Theodora (Nika Ayaklanması’nda tahtı kurtaran sözüyle ünlü)
		PK('yn-penalti-68', 'tarih', 3, 'Bizans İmparatoru Justinianus’un eşi olan imparatoriçe kimdir?', ['Theodora', 'Zoe', 'İrene', 'Helena']),
		// söylence: MÖ 7. yüzyılda Megaralı Byzas kurdu, kent adını ondan aldı (Byzantion)
		PK('yn-penalti-69', 'tarih', 2, 'Efsaneye göre İstanbul’un ilk kurucusu olan Megaralı kimdir?', ['Byzas', 'Konstantin', 'Perikles', 'Teseus']),
		// Nevşehirli Damat İbrahim Paşa, 1718–1730 sadrazam; Patrona Halil İsyanı’yla öldürüldü
		PK('yn-penalti-70', 'tarih', 2, 'Lale Devri’nin ünlü sadrazamı kimdir?', ['Nevşehirli İbrahim', 'Sokullu Mehmed', 'Köprülü Mehmed', 'Kara Mustafa']),
		// Şubat 1258, Hülagü Bağdat’ı aldı; Abbasi halifesi el-Mustasım öldürüldü
		PK('yn-penalti-71', 'tarih', 2, 'Moğollar 1258’de hangi şehri yıkıp Abbasi halifeliğine son verdi?', ['Bağdat', 'Şam', 'Kahire', 'Semerkant']),

		// ---------------------------------------------------------------- coğrafya
		// veri: 34 / 2 = 17 Çanakkale; Bursa 16, Balıkesir 10, Edirne 22
		PK('yn-penalti-72', 'cografya', 1, 'Plaka kodu 34’ün yarısı olan il hangisidir?', ['Çanakkale', 'Bursa', 'Balıkesir', 'Edirne']),
		// veri: 06 × 07 = 42 Konya; Kocaeli 41, Kütahya 43, Malatya 44
		PK('yn-penalti-73', 'cografya', 2, 'Ankara ile Antalya’nın plaka kodları çarpılırsa hangi ilin plakası çıkar?', ['Konya', 'Kocaeli', 'Kütahya', 'Malatya']),
		// veri: Kilis’in tek komşu ili Gaziantep (öbür yanı Suriye); Yalova, Iğdır, Hakkari ikişer üçer komşulu
		PK('yn-penalti-74', 'cografya', 3, 'Yalnızca tek bir ile komşu olan ilimiz hangisidir?', ['Kilis', 'Yalova', 'Iğdır', 'Hakkari']),
		// Kıbrıs Cumhuriyeti bayrağında bakır renkli ada silueti (dünyada haritalı öbür bayrak Kosova’nınki, şıklarda yok)
		PK('yn-penalti-75', 'cografya', 2, 'Hangisinin bayrağında ülkenin haritası bulunur?', ['Kıbrıs', 'Malta', 'Yunanistan', 'İsrail']),
		// Ganj (Brahmaputra ile birlikte) Bengal Körfezi’ne, dünyanın en büyük deltasını oluşturarak dökülür
		PK('yn-penalti-76', 'cografya', 3, 'Ganj Nehri hangi körfeze dökülür?', ['Bengal Körfezi', 'Basra Körfezi', 'Aden Körfezi', 'Siam Körfezi']),
		// İskoçya’nın başkenti Edinburgh; en kalabalık kenti Glasgow
		PK('yn-penalti-77', 'cografya', 2, 'İskoçya’nın başkenti hangisidir?', ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee']),
		// San Marino dört bir yanı İtalya ile çevrili (Vatikan gibi)
		PK('yn-penalti-78', 'cografya', 1, 'San Marino hangi ülkenin toprakları içindedir?', ['İtalya', 'Fransa', 'İspanya', 'Avusturya']),
		// veri: Erzurum’un dokuz komşusu Artvin, Ardahan, Kars, Ağrı, Muş, Bingöl, Erzincan, Bayburt, Rize; Trabzon değil
		PK('yn-penalti-79', 'cografya', 3, 'Hangi il Erzurum’a komşu değildir?', ['Trabzon', 'Rize', 'Bayburt', 'Muş']),
		// Güney Afrika’nın batısı Atlas, doğusu Hint Okyanusu; Namibya ve Angola yalnız Atlas, Mozambik yalnız Hint Okyanusu
		PK('yn-penalti-80', 'cografya', 2, 'Hangisinin hem Atlas hem Hint Okyanusu’na kıyısı vardır?', ['Güney Afrika', 'Namibya', 'Mozambik', 'Angola']),
		// Matterhorn (4478 m) Zermatt (İsviçre) ile Breuil-Cervinia (İtalya) arasında sınırda
		PK('yn-penalti-81', 'cografya', 3, 'Matterhorn Dağı hangi iki ülkenin sınırındadır?', ['İsviçre ve İtalya', 'Fransa ve İtalya', 'İsviçre ve Fransa', 'Avusturya ve İsviçre']),
		// Zambezi Nehri üzerinde, Zambiya ile Zimbabve sınırında
		PK('yn-penalti-82', 'cografya', 3, 'Victoria Şelalesi hangi iki ülkenin sınırındadır?', ['Zambiya ve Zimbabve', 'Kenya ve Tanzanya', 'Uganda ve Kenya', 'Angola ve Namibya']),
		// Köprüçay kanyonu, Antalya’nın Manavgat ilçesinde (Beşkonak, Oluk Köprüsü); komşu Isparta bilerek şıklarda yok
		PK('yn-penalti-83', 'cografya', 2, 'Köprülü Kanyon hangi ilimizdedir?', ['Antalya', 'Mersin', 'Muğla', 'Burdur']),
		// Yunanistan’ın resmî adı Helen Cumhuriyeti (Ellinikí Dimokratía)
		PK('yn-penalti-84', 'cografya', 2, 'Resmî adı Helen Cumhuriyeti olan ülke hangisidir?', ['Yunanistan', 'Kıbrıs', 'Arnavutluk', 'Bulgaristan']),

		// ---------------------------------------------------------------- bilim
		// yakut (kırmızı) ve safir aynı mineral: korindon (alüminyum oksit, Mohs 9)
		PK('yn-penalti-85', 'bilim', 3, 'Yakut ve safir hangi mineralin türleridir?', ['Korindon', 'Kuvars', 'Beril', 'Topaz']),
		// Mohs: 1 talk, 2 jips, 3 kalsit … 7 kuvars … 10 elmas
		PK('yn-penalti-86', 'bilim', 3, 'Mohs sertlik ölçeğinde 1 olan en yumuşak mineral hangisidir?', ['Talk', 'Jips', 'Kalsit', 'Kuvars']),
		// DNA bazları A, T, G, C; urasil yalnız RNA’da (timinin yerinde)
		PK('yn-penalti-87', 'bilim', 2, 'Hangisi DNA’nın yapısında bulunmaz?', ['Urasil', 'Timin', 'Adenin', 'Guanin']),
		// n(n+1)/2 = 100 × 101 / 2 (Gauss’un okul öyküsü)
		PK('yn-penalti-88', 'bilim', 2, '1’den 100’e kadar bütün sayıların toplamı kaçtır?', ['5050', '5000', '10100', '4950']),
		// 64 = 8² = 4³; 36 yalnız kare, 27 yalnız küp, 81 = 9² = 3⁴ (küp değil)
		PK('yn-penalti-89', 'bilim', 2, 'Hangisi hem tam kare hem tam küp bir sayıdır?', ['64', '36', '27', '81']),
		// mare (Latince “deniz”): Galileo döneminde su sanılan bazalt düzlükleri (Huzur Denizi’ne Apollo 11 indi)
		PK('yn-penalti-90', 'bilim', 3, 'Ay’ın yüzeyindeki geniş karanlık düzlüklere ne ad verilir?', ['Deniz', 'Krater', 'Vadi', 'Çöl']),
		// Mars’ın uyduları Phobos ve Deimos; Titan Satürn’ün, Europa Jüpiter’in, Triton Neptün’ün
		PK('yn-penalti-91', 'bilim', 2, 'Mars’ın iki uydusundan biri hangisidir?', ['Phobos', 'Titan', 'Europa', 'Triton']),
		// 1 ışık yılı ≈ 9,46 trilyon km
		PK('yn-penalti-92', 'bilim', 2, 'Bir ışık yılı yaklaşık kaç kilometredir?', ['9,5 trilyon', '300 bin', '150 milyon', '1 milyar']),
		// koni hücreleri renk, çubuk hücreleri loş ışık; melanosit pigment hücresi
		PK('yn-penalti-93', 'bilim', 2, 'Gözde renkleri algılayan hücrelere ne ad verilir?', ['Koni', 'Çubuk', 'Nöron', 'Melanosit']),
		// güneş rüzgârı kuyruğu hep Güneş’in ters yönüne iter (Güneş’ten uzaklaşırken kuyruk önden gider)
		PK('yn-penalti-94', 'bilim', 3, 'Kuyruklu yıldızın kuyruğu hep hangi yöne uzanır?', ['Güneş’in tersine', 'Güneş’e doğru', 'Dünya’ya doğru', 'Kuzey yönüne']),
		// yunuslar tek yarıküre uykusuyla uyur (nefes ve tehlike için yarısı uyanık); kedi, fil, at iki yarıyla uyur
		PK('yn-penalti-95', 'bilim', 2, 'Hangisi beyninin yarısıyla uyuyup öbür yarısıyla uyanık kalabilir?', ['Yunus', 'Kedi', 'Fil', 'At']),
		// nektar: çiçeğin tatlı sıvısı, bala dönüşür; polen tozlaşma tozu, propolis arı reçinesi
		PK('yn-penalti-96', 'bilim', 1, 'Arıların çiçeklerden topladığı tatlı sıvıya ne ad verilir?', ['Nektar', 'Polen', 'Reçine', 'Propolis']),

		// ---------------------------------------------------------------- sanat ve edebiyat
		// An die Freude (1785) Friedrich Schiller’in; Beethoven 9. Senfoni’nin finalinde (1824) kullandı
		PK('yn-penalti-97', 'sanat', 3, 'Beethoven’ın 9. Senfonisi’ndeki “Neşeye Övgü” şiiri kimindir?', ['Schiller', 'Goethe', 'Heine', 'Hölderlin']),
		// Rosinante; Bukefalos İskender’in, Babieca El Cid’in atı, Pegasus kanatlı at
		PK('yn-penalti-98', 'sanat', 2, 'Don Kişot’un atının adı nedir?', ['Rosinante', 'Bukefalos', 'Babieca', 'Pegasus']),
		// Bir Bilim Adamının Romanı: Mustafa İnan (1975), Atay’ın İTÜ’deki hocası
		PK('yn-penalti-99', 'sanat', 3, 'Oğuz Atay’ın Bir Bilim Adamının Romanı kimi anlatır?', ['Mustafa İnan', 'Cahit Arf', 'Feza Gürsey', 'Ali Kuşçu']),
		// Bram Stoker 1847’de Dublin’de doğdu, İrlandalı; Drakula 1897
		PK('yn-penalti-100', 'sanat', 3, 'Drakula’nın yazarı Bram Stoker hangi ülkedendi?', ['İrlanda', 'İngiltere', 'Romanya', 'İskoçya']),
		// Herman Melville, Moby Dick (1851): Kaptan Ahab; Nemo Verne’in, Kanca Peter Pan’in, Haddock Tenten’in kaptanı
		PK('yn-penalti-101', 'sanat', 2, 'Moby Dick’teki beyaz balinanın peşine düşen kaptan kimdir?', ['Ahab', 'Nemo', 'Kanca', 'Haddock']),
		// ney kamıştan (Arundo donax) yapılır, dokuz boğumlu
		PK('yn-penalti-102', 'sanat', 1, 'Ney hangi bitkiden yapılır?', ['Kamış', 'Ceviz', 'Abanoz', 'Kavak']),
		// Köçekçe (1943) Ulvi Cemal Erkin’in rapsodisi; Türk Beşleri’nin öbürleri şıklarda
		PK('yn-penalti-103', 'sanat', 3, 'Köçekçe adlı orkestra eserini hangi Türk bestecisi yazdı?', ['Ulvi Cemal Erkin', 'Adnan Saygun', 'Hasan Ferit Alnar', 'Cemal Reşit Rey']),
		// Schachnovelle (1942) Stefan Zweig’ın son eseri
		PK('yn-penalti-104', 'sanat', 2, 'Satranç adlı ünlü uzun öykünün yazarı kimdir?', ['Stefan Zweig', 'Franz Kafka', 'Thomas Mann', 'Hermann Hesse']),
		// Kipling, Orman Çocuğu: Mowgli’yi kurt ailesi büyütür; ayı Baloo ve panter Bagheera ona yol gösterir
		PK('yn-penalti-105', 'sanat', 1, 'Mowgli’yi ormanda hangi hayvanlar büyütür?', ['Kurtlar', 'Maymunlar', 'Ayılar', 'Panterler']),
		// Lewis Carroll (1865): Alice yeleğinden saat çıkaran Beyaz Tavşan’ın peşinden tavşan deliğine düşer
		PK('yn-penalti-106', 'sanat', 1, 'Alice Harikalar Diyarı’na kimin peşinden düşer?', ['Beyaz Tavşan', 'Cheshire Kedisi', 'Çılgın Şapkacı', 'Tırtıl']),
		// J. M. Barrie: Neverland, Türkçede Varolmayan Ülke
		PK('yn-penalti-107', 'sanat', 2, 'Peter Pan’in yaşadığı ülkenin adı nedir?', ['Varolmayan Ülke', 'Harikalar Diyarı', 'Narnia', 'Oz']),
		// Hemingway, Yaşlı Adam ve Deniz (1952): Kübalı balıkçı Santiago; Manolin ona yardım eden çocuk
		PK('yn-penalti-108', 'sanat', 3, 'Yaşlı Adam ve Deniz’deki yaşlı balıkçının adı nedir?', ['Santiago', 'Manolin', 'Pedro', 'Ramón']),

		// ---------------------------------------------------------------- genel kültür
		// 8 piyon × 2 kare + 2 at × 2 kare = 20
		PK('yn-penalti-109', 'eglence', 3, 'Satrançta beyazın ilk hamlesi için kaç farklı seçeneği vardır?', ['20', '16', '24', '18']),
		// Emmental (İsviçre): mayalanırken çıkan karbondioksit iri delikler açar
		PK('yn-penalti-110', 'eglence', 1, 'Hangi peynir iri delikleriyle tanınır?', ['Emmental', 'Parmesan', 'Rokfor', 'Brie']),
		// Roquefort: koyun sütünden, Combalou mağaralarında olgunlaşan küflü peynir
		PK('yn-penalti-111', 'eglence', 2, 'Rokfor peyniri hangi hayvanın sütünden yapılır?', ['Koyun', 'İnek', 'Keçi', 'Manda']),
		// haka: Yeni Zelanda Maorilerinin töresel dansı (All Blacks maç öncesi yapar)
		PK('yn-penalti-112', 'eglence', 2, 'Haka dansı hangi halka aittir?', ['Maoriler', 'Aborjinler', 'Zulular', 'Hawaililer']),
		// M (1000) + CM (900) = 1900
		PK('yn-penalti-113', 'eglence', 2, 'Romen rakamlarıyla MCM kaçtır?', ['1900', '1100', '2100', '1400']),
		// papaz = King (K); kız Q, vale J
		PK('yn-penalti-114', 'eglence', 1, 'İskambilde papaz kartı hangi harfle gösterilir?', ['K', 'Q', 'J', 'P']),
		// klasik Monopoly’nin sokakları Atlantic City’nin (New Jersey) sokakları: Boardwalk, Park Place …
		PK('yn-penalti-115', 'eglence', 3, 'Klasik Monopoly tahtasındaki sokak adları hangi şehirden alınmıştır?', ['Atlantic City', 'New York', 'Chicago', 'Boston']),
		// iç içe geçen tahta bebekler, Rusya’nın simgesi (ilki 1890’larda)
		PK('yn-penalti-116', 'eglence', 1, 'Matruşka bebekleri hangi ülkenin simgesidir?', ['Rusya', 'Polonya', 'Ukrayna', 'Macaristan']),
		// rok: şah iki kare kaleye doğru gider, kale şahın öbür yanına geçer
		PK('yn-penalti-117', 'eglence', 2, 'Satrançta rok hamlesinde hangi iki taş birlikte oynanır?', ['Şah ve kale', 'Vezir ve kale', 'Şah ve fil', 'At ve kale']),
		// Edgar Rice Burroughs (1912): Tarzan’ı goril benzeri büyük maymunlar (Mangani) büyütür
		PK('yn-penalti-118', 'eglence', 1, 'Tarzan’ı ormanda hangi hayvanlar büyütür?', ['Maymunlar', 'Kurtlar', 'Aslanlar', 'Filler']),
		// L. L. Zamenhof, 1887
		PK('yn-penalti-119', 'eglence', 3, 'Esperanto dilini kim yarattı?', ['Zamenhof', 'Tolkien', 'Chomsky', 'Saussure']),
		// Braille hücresi 2 × 3 = 6 nokta (64 bileşim)
		PK('yn-penalti-120', 'eglence', 2, 'Braille alfabesinde bir harf kaç noktalık hücrede gösterilir?', ['6', '4', '8', '9']),
	],
};
