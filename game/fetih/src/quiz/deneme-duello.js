// YENİ · deneme grubu: düello ve strateji tipleri (defter 6, 7, 10, 11, 17). Bkz. deneme.js başı ve ref/yeni-soru-tipleri/.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
//
//   halat     Halat Çekme   20 sn canlı düello: hızlı sorular, her doğru halatı bir adım çeker (yanlış: −1 ve kilit)
//   mancinik  Mancınık      tahmin et ama aşma: kaydırıcı mancınığın gücü, taş surun önüne düşer ya da üstünden uçar
//
// Örnekler bankadan (src/data/bank.js, oyunun doğrulanmış soruları) seçilir: Halat için kategori başına kısa doğru/yanlış,
// karşılaştır ve kısa şıklı sorular; Mancınık için tahmin (num) soruları olduğu gibi.

import { PROFILE } from './timing.js';
import { BANK } from '../data/bank.js';
import { halat } from './d_halat.js';
import { mancinik } from './d_mancinik.js';

// süre profilleri (d_ortak.js stamp): Halat sabit 20 sn tur; Mancınık tahminle aynı iş + "aşma" temkini (en az 20 sn)
Object.assign(PROFILE, {
	halat: { min: 20, max: 20, think: [0, 0], round: true },
	mancinik: { min: 12, max: 28, think: [4, 1.5] },
});

export const TYPES = { halat, mancinik };
export const ORDER = [
	['halat', 'Halat Çekme', '20 sn canlı düello, her doğru bir adım'],
	['mancinik', 'Mancınık', 'Tahmin et ama aşma: taş surun önüne düşsün'],
];

const L = (s) => [...String(s)].length;
const CAT_NAME = { tarih: 'Tarih', cografya: 'Coğrafya', bilim: 'Bilim', spor: 'Spor', sanat: 'Sanat', eglence: 'Eğlence' };

// v1.2 Yedek maddeler: bankanın kısa soruları başka düzenlemelerle azalırsa her tur bunlarla 34 maddeye tamamlanır
// (tur sırasıyla, kategori başına ortak sıra). [ifade, doğru mu] ya da [soru, [doğru şık, çeldirici…]] (2 ya da 3 şık).
const SP = {
	tarih: [
		['İstanbul 1453’te fethedildi.', true],
		['Cumhuriyet 1920’de ilan edildi.', false],
		['Hangisi daha eski?', ['Hititler', 'Osmanlılar']],
		['Lozan Antlaşması hangi yıl imzalandı?', ['1923', '1920', '1938']],
		['Malazgirt Savaşı 1071’de yapıldı.', true],
		['Çanakkale Savaşı II. Dünya Savaşı’nda yapıldı.', false],
		['İstanbul’u fetheden padişah kimdir?', ['Fatih', 'Kanuni']],
		['Kurtuluş Savaşı’nın son büyük muharebesi?', ['Başkomutanlık', 'Sakarya', 'İnönü']],
		['Atatürk Selanik’te doğdu.', true],
		['Hititler Mısır’da kurulmuş bir devlettir.', false],
		['TBMM hangi şehirde açıldı?', ['Ankara', 'İstanbul']],
		['Osmanlı Devleti’nin kurucusu kimdir?', ['Osman Gazi', 'Orhan Gazi', 'Ertuğrul Gazi']],
		['Kanuni, Yavuz Sultan Selim’in oğludur.', true],
		['Osmanlı Devleti 1299’da kuruldu.', true],
	],
	cografya: [
		['Van Gölü Türkiye’nin en büyük gölüdür.', true],
		['Kızılırmak Akdeniz’e dökülür.', false],
		['Hangisi daha yüksek?', ['Ağrı Dağı', 'Uludağ']],
		['Pamukkale hangi ildedir?', ['Denizli', 'Aydın', 'Muğla']],
		['Türkiye’nin üç tarafı denizlerle çevrilidir.', true],
		['Trabzon İç Anadolu’dadır.', false],
		['Hangisi daha uzun?', ['Kızılırmak', 'Sakarya']],
		['Kapadokya hangi bölgededir?', ['İç Anadolu', 'Ege', 'Akdeniz']],
		['İzmir Ege Bölgesi’ndedir.', true],
		['Muğla Karadeniz kıyısındadır.', false],
		['Hangisi Karadeniz kıyısında?', ['Samsun', 'Konya']],
		['Türkiye’nin en yüksek dağı hangisi?', ['Ağrı', 'Erciyes', 'Kaçkar']],
		['Bursa, Uludağ’ın eteğindedir.', true],
		['Iğdır, Ermenistan’la komşudur.', true],
	],
	bilim: [
		['Dünya Güneş’in çevresinde döner.', true],
		['Mars Güneş’e en yakın gezegendir.', false],
		['Hangisi memelidir?', ['Yunus', 'Köpek balığı']],
		['Suyun donma noktası kaç °C’dir?', ['0', '10', '100']],
		['İnsan iskeletinde 206 kemik vardır.', true],
		['Deniz seviyesinde su 50 °C’de kaynar.', false],
		['Hangisi daha hızlı yayılır?', ['Işık', 'Ses']],
		['Kızıl Gezegen hangisidir?', ['Mars', 'Venüs', 'Jüpiter']],
		['Yarasalar memelidir.', true],
		['Ay, Dünya’dan büyüktür.', false],
		['Hangisi daha büyük?', ['Jüpiter', 'Dünya']],
		['Örümceğin kaç bacağı vardır?', ['8', '6', '10']],
		['Kalp bir kastır.', true],
		['Demir mıknatısa çekilir.', true],
	],
	spor: [
		['Basketbolda bir takım sahada 5 kişidir.', true],
		['Boks ringi yuvarlaktır.', false],
		['Hangisinde top elle oynanır?', ['Hentbol', 'Futbol']],
		['Basketbolda en uzak atış kaç sayıdır?', ['3', '2', '4']],
		['Olimpiyat bayrağında beş halka vardır.', true],
		['Teniste file yoktur.', false],
		['Kırkpınar hangi spordur?', ['Güreş', 'Okçuluk']],
		['Futbolda bir takım sahada kaç kişidir?', ['11', '10', '12']],
		['Masa tenisi raketle oynanır.', true],
		['Bir futbol maçı normalde 60 dakikadır.', false],
		['Hangisi bir su sporudur?', ['Kürek', 'Okçuluk']],
		['Kırkpınar hangi ilde yapılır?', ['Edirne', 'Bursa', 'Konya']],
		['Futbol maçı iki devreden oluşur.', true],
		['Voleybolda top rakip sahaya düşerse sayı olur.', true],
	],
	sanat: [
		['Mozart bir bestecidir.', true],
		['Ney telli bir çalgıdır.', false],
		['Mona Lisa’yı kim yaptı?', ['Da Vinci', 'Van Gogh']],
		['İstiklal Marşı’nın şairi kimdir?', ['Mehmet Akif', 'Ziya Gökalp', 'Namık Kemal']],
		['Süleymaniye Camii’ni Mimar Sinan yaptı.', true],
		['Hamlet bir operadır.', false],
		['Hangisi telli bir çalgıdır?', ['Bağlama', 'Ney']],
		['Kürk Mantolu Madonna kimin?', ['Sabahattin Ali', 'Orhan Pamuk', 'Yaşar Kemal']],
		['Kütahya çinisiyle ünlüdür.', true],
		['Piyano üflemeli bir çalgıdır.', false],
		['Selimiye Camii hangi şehirde?', ['Edirne', 'Bursa']],
		['Yıldızlı Gece kimin tablosu?', ['Van Gogh', 'Monet', 'Picasso']],
		['Van Gogh Hollandalı bir ressamdır.', true],
		['Don Kişot’u Cervantes yazdı.', true],
	],
	eglence: [
		['Okeyde taşlar dört renktir.', true],
		['Baklava şerbetsiz yapılır.', false],
		['Kırmızı Başlıklı Kız’ı kim kandırdı?', ['Kurt', 'Ayı']],
		['Satrançta toplam kaç taş vardır?', ['32', '16', '64']],
		['Lahmacun kıymalıdır.', true],
		['Tavla tek zarla oynanır.', false],
		['Hangisi bir zar oyunudur?', ['Tavla', 'Satranç']],
		['Menemenin ana malzemesi nedir?', ['Yumurta', 'Pirinç', 'Bulgur']],
		['Pinokyo tahtadan bir kukladır.', true],
		['Domino taşları zarla atılarak oynanır.', false],
		['Hangisi bir tatlıdır?', ['Baklava', 'Mercimek']],
		['Hacivat’ın arkadaşı kimdir?', ['Karagöz', 'Keloğlan', 'Nasreddin Hoca']],
		['Keloğlan bir Türk masal kahramanıdır.', true],
		['Türk kahvesinin yanında su ikram edilir.', true],
	],
};
const spAt = Object.fromEntries(Object.keys(SP).map((c) => [c, 0]));
/** Turu yedeklerle 34 maddeye tamamla (yinelenen metni atla). */
function fill(cat, items) {
	const have = new Set(items.map((x) => x.t));
	while (items.length < 34 && spAt[cat] < SP[cat].length) {
		const [t, a] = SP[cat][spAt[cat]++];
		if (have.has(t)) continue;
		items.push(Array.isArray(a) ? { t, o: a.slice(), r: 0, d: 1 } : { t, o: ['DOĞRU', 'YANLIŞ'], r: a ? 0 : 1, d: 1, tf: true });
	}
	return items;
}

/** Halat turu: kategorinin kısa doğru/yanlış (≤18), karşılaştır (≤10) ve kısa şıklı soruları; toplam 34. */
function halatRound(cat, i) {
	const of = (t) => BANK.filter((q) => q.cat === cat && q.type === t);
	const tf = of('tf')
		.filter((q) => L(q.q) <= 70)
		.slice(0, 18)
		.map((q) => ({ t: q.q, o: ['DOĞRU', 'YANLIŞ'], r: q.ans ? 0 : 1, d: q.diff, tf: true }));
	const hl = of('hilo')
		.filter((q) => q.left.v !== q.right.v && L(q.left.t) <= 24 && L(q.right.t) <= 24 && L(q.q) <= 60)
		.slice(0, 10)
		.map((q) => ({ t: q.q, o: [q.left.t, q.right.t], r: q.left.v > q.right.v ? 0 : 1, d: q.diff }));
	const ch = of('choice')
		.filter((q) => L(q.q) <= 60 && q.a.every((x) => L(x) <= 16))
		.slice(0, Math.max(8, 34 - tf.length - hl.length))
		// şık sayısı karışık: 3 ve 4
		.map((q, j) => ({ t: q.q, o: j % 2 ? q.a.slice(0, 3) : q.a.slice(), r: 0, d: q.diff }));
	return { id: `dn-ht${i + 1}`, cat, diff: 2, type: 'halat', q: `Halatı kendine çek! · ${CAT_NAME[cat]}`, items: fill(cat, [...tf, ...hl, ...ch]) };
}

// Mancınık: bankadaki tahmin soruları (yükseklik, uzunluk, yıl, gün: "aşma" kuralına uygun, aralığı geniş olanlar)
const MANCINIK_IDS = ['n002', 'n001', 'tar-nu-022', 'cog-nu-008', 'spo-nu-004', 'n011', 'n006', 'tar-nu-009',
	// v1.1: kesin değerli (yıl, metre, adet) ve tahmini geniş aralıklı olanlar; "yaklaşık" yuvarlaması tartışmasız olanlar
	'tar-nu-029', 'tar-nu-010', 'tar-nu-011', 'tar-nu-013', 'tar-nu-016', 'tar-nu-018', 'tar-nu-023', 'tar-nu-024', 'tar-nu-031', 'tar-nu-028',
	'cog-nu-011', 'cog-nu-012', 'cog-nu-026', 'cog-nu-020', 'cog-nu-023', 'cog-nu-025',
	'spo-nu-005', 'spo-nu-010', 'bil-nu-004', 'bil-nu-020', 'san-nu-003', 'egl-nu-008',
	// v1.2: tarihi kesin olaylar ve kuruluşlar, kesin ölçüler; hepsi geniş aralıklı, cevabı tek ve değişmez
	'n004', 'n007', 'n008', 'tar-nu-003', 'tar-nu-004', 'tar-nu-005', 'tar-nu-012', 'tar-nu-014', 'tar-nu-017', 'tar-nu-019',
	'tar-nu-020', 'tar-nu-021', 'tar-nu-026', 'tar-nu-015', 'cog-nu-014', 'cog-nu-018', 'bil-nu-002', 'bil-nu-013', 'bil-nu-021',
	'san-nu-005', 'san-nu-008', 'san-nu-009', 'san-nu-014', 'egl-nu-005', 'egl-nu-015', 'egl-nu-016', 'egl-nu-017', 'egl-nu-028',
	'spo-nu-011', 'spo-nu-014'];

// v1.1 Halat ek turları: her kategoriye ikinci tur, tarih, coğrafya ve eğlenceye üçüncü tur (v1.2: dört tur daha, bkz. halatMore). Bankanın önceki turlarda
// kullanılmamış soruları (şıklılar 2, 3 ve 4 şıkla karışık) + elle yazılmış kısa doğru/yanlışlar (tur başına 8).
// [ifade, doğru mu]; ders kitabı düzeyinde, tartışmasız bilgiler.
const HT = {
	tarih: [
		['TBMM 23 Nisan 1920’de açıldı.', true],
		['Kanuni Sultan Süleyman, Fatih Sultan Mehmet’in babasıdır.', false],
		['Harf Devrimi 1928’de yapıldı.', true],
		['Sakarya Meydan Muharebesi 1922’de yapıldı.', false],
		['Topkapı Sarayı’nı Fatih Sultan Mehmet yaptırdı.', true],
		['Osman Gazi, Orhan Gazi’nin oğludur.', false],
		['Yavuz Sultan Selim, Mısır seferiyle Kahire’ye girdi.', true],
		['Kanuni Sultan Süleyman Viyana’yı fethetti.', false],
		['Lozan Antlaşması 1923’te imzalandı.', true],
		['Hititlerin başkenti Hattuşa’ydı.', true],
		['Ankara Savaşı’nda Yıldırım Bayezid, Timur’u yendi.', false],
		['Mohaç Muharebesi’nde Osmanlı ordusu Macarları yendi.', true],
		['II. Abdülhamid 33 yıl tahtta kaldı.', true],
		['Fatih Sultan Mehmet İstanbul’u 1071’de fethetti.', false],
		['Cumhuriyet’in ilk başbakanı Celal Bayar’dır.', false],
		['Kurtuluş Savaşı’nda Doğu Cephesi’ni Kâzım Karabekir yönetti.', true],
	],
	cografya: [
		['Tuz Gölü İç Anadolu Bölgesi’ndedir.', true],
		['Türkiye’nin en büyük gölü Tuz Gölü’dür.', false],
		['Kızılırmak Karadeniz’e dökülür.', true],
		['Fırat Nehri Karadeniz’e dökülür.', false],
		['Erciyes Dağı Kayseri’dedir.', true],
		['Ankara, Türkiye’nin en kalabalık ilidir.', false],
		['Gökçeada, Türkiye’nin en büyük adasıdır.', true],
		['Uludağ Antalya’dadır.', false],
		['Marmara Denizi’nin tamamı Türkiye sınırları içindedir.', true],
		['Ege Denizi Türkiye’nin güneyindedir.', false],
		['Dicle Nehri Türkiye topraklarında doğar.', true],
		['Van Gölü’nün suyu sodalıdır.', true],
		['Türkiye’nin en doğu ucu Iğdır sınırları içindedir.', true],
		['Mersin Ege Bölgesi’ndedir.', false],
		['Yüzölçümü en büyük ilimiz Konya’dır.', true],
		['Türkiye’nin en yüksek dağı Erciyes’tir.', false],
		// v1.2: coğrafyanın dördüncü turu
		['Türkiye’de en çok yağış alan bölge Karadeniz’dir.', true],
		['Ankara, İç Anadolu Bölgesi’ndedir.', true],
		['Seyhan Nehri Ege Denizi’ne dökülür.', false],
		['Ağrı Dağı, Türkiye’nin en yüksek dağıdır.', true],
		['Çanakkale Boğazı, Marmara ile Karadeniz’i bağlar.', false],
		['Kapadokya, Nevşehir çevresindedir.', true],
		['Türkiye’nin en kuzey ucu Sinop’tadır.', true],
		['Antalya Karadeniz kıyısındadır.', false],
		['Plaka numarası 81 olan il Düzce’dir.', true],
		['Kayseri Akdeniz Bölgesi’ndedir.', false],
		['Pamukkale Denizli’dedir.', true],
		['Gediz Nehri Karadeniz’e dökülür.', false],
	],
	bilim: [
		['Deniz seviyesinde saf su 0 °C’de donar.', true],
		['Örümcekler böcek değildir.', true],
		['Yarasalar kuş sınıfındandır.', false],
		['Mars’a Kızıl Gezegen denir.', true],
		['Altının kimyasal simgesi Ag’dir.', false],
		['İnsan kalbinin dört odacığı vardır.', true],
		['Ses boşlukta yayılmaz.', true],
		['Balinalar balık sınıfındandır.', false],
		// v1.2: bilimin üçüncü turu
		['Işık, sesten daha hızlı yayılır.', true],
		['Ay kendi ışığını üretir.', false],
		['Toplardamarlardaki kan mavi renktedir.', false],
		['Penguenler kuştur.', true],
		['Elmas karbondan oluşur.', true],
		['Jüpiter, Güneş Sistemi’nin en büyük gezegenidir.', true],
		['Örümceklerin altı bacağı vardır.', false],
		['Suyun kimyasal formülü H2O’dur.', true],
		['Güneş bir yıldızdır.', true],
		['Mıknatısın aynı kutupları birbirini çeker.', false],
		['Bitkiler fotosentezle oksijen üretir.', true],
		['Venüs, Güneş’e en yakın gezegendir.', false],
	],
	spor: [
		['Voleybolda bir takım sahada 6 oyuncuyla oynar.', true],
		['Hentbolda top ayakla oynanır.', false],
		['Teniste sayılar 15, 30, 40 diye ilerler.', true],
		['Yaz Olimpiyat Oyunları dört yılda bir yapılır.', true],
		['Satranç, Olimpiyat Oyunları’nda madalya verilen bir daldır.', false],
		['Futbolda kaleci kendi ceza sahasında topu elle tutabilir.', true],
		['Maraton koşusu 42.195 metredir.', true],
		['Bir futbol takımı sahaya 12 oyuncuyla çıkar.', false],
	],
	sanat: [
		['Mona Lisa’yı Leonardo da Vinci yaptı.', true],
		['Sefiller romanının yazarı Victor Hugo’dur.', true],
		['Beethoven İtalyan bir bestecidir.', false],
		['Kürk Mantolu Madonna’nın yazarı Sabahattin Ali’dir.', true],
		['İstiklal Marşı’nın bestecisi Mehmet Akif Ersoy’dur.', false],
		['Ney, üflemeli bir çalgıdır.', true],
		['Yaprak Dökümü romanını Halide Edib Adıvar yazdı.', false],
		['Picasso İspanyol bir ressamdır.', true],
		// v1.2: sanatın üçüncü turu
		['Çalıkuşu’nun yazarı Reşat Nuri Güntekin’dir.', true],
		['Ud yayla çalınan bir çalgıdır.', false],
		['Selimiye Camii Edirne’dedir.', true],
		['Hamlet’i Shakespeare yazdı.', true],
		['Yıldızlı Gece tablosu Picasso’nundur.', false],
		['“Memleketimden İnsan Manzaraları” Nâzım Hikmet’indir.', true],
		['Mimar Sinan’ın çıraklık eseri Selimiye’dir.', false],
		['Sefiller bir Rus romanıdır.', false],
		['Ebru, su yüzünde yapılan bir sanattır.', true],
		['Yunus Emre 20. yüzyılda yaşadı.', false],
		['İnce Memed’in yazarı Yaşar Kemal’dir.', true],
		['Bağlama telli bir çalgıdır.', true],
		['Beethoven son senfonilerini bestelerken neredeyse sağırdı.', true],
		['Mona Lisa Londra’daki bir müzededir.', false],
		['Dede Korkut Hikâyeleri Fransız masallarıdır.', false],
		['Minyatür, dev boyutlu duvar resmidir.', false],
		// yedek (bankadaki kısa şıklı sorular azalırsa tur 30'un altına düşmesin)
		['Keman yayla çalınır.', true],
		['Kürk Mantolu Madonna bir şiir kitabıdır.', false],
		['Itri bir Osmanlı bestecisidir.', true],
	],
	eglence: [
		['Karagöz ile Hacivat bir gölge oyunudur.', true],
		['Keloğlan bir Japon masal kahramanıdır.', false],
		['Tavla iki zarla oynanır.', true],
		['Satrançta fil yalnız düz ilerler.', false],
		['Menemen yumurtayla yapılır.', true],
		['Lahmacun hamursuz yapılır.', false],
		['Satrançta at L biçiminde hareket eder.', true],
		['Türk kahvesi süzülerek içilir.', false],
		['Nasreddin Hoca göle maya çaldı.', true],
		['Baklava şerbetli bir tatlıdır.', true],
		['Simidin üstü susamla kaplanır.', true],
		['Ayran, sütle limon suyu karıştırılarak yapılır.', false],
		['Pinokyo yalan söyleyince burnu uzar.', true],
		['Kırmızı Başlıklı Kız’ı masalda bir ayı kandırır.', false],
		['Tavla tahtasında 20 hane vardır.', false],
		['Gökkuşağında geleneksel olarak yedi renk sayılır.', true],
		// v1.2: eğlencenin dördüncü turu
		['Satranç tahtasında 64 kare vardır.', true],
		['Tavlada her oyuncunun 15 pulu vardır.', true],
		['Okey 106 taşla oynanır.', true],
		['Karnıyarık kıymasız bir zeytinyağlıdır.', false],
		['Pişmaniye Kocaeli’nin meşhur tatlısıdır.', true],
		['Mantı, içi peynirli bir tatlıdır.', false],
		['Nasreddin Hoca’nın türbesi Akşehir’dedir.', true],
		['Keloğlan’ın gür saçları vardır.', false],
		['Rubik küpünün altı yüzü vardır.', true],
		['Jokersiz iskambil destesinde 40 kâğıt vardır.', false],
		['Lokum pudra şekerine bulanır.', true],
		['Rize çayıyla ünlüdür.', true],
		['Sudoku harflerle oynanır.', false],
		['Tetris bir Japon icadıdır.', false],
		['Künefe peynirle yapılır.', true],
		['Satrançta en güçlü taş piyondur.', false],
		// yedek
		['Bir haftada 168 saat vardır.', true],
		['Ayran, yoğurt ve sudan yapılır.', true],
	],
};

/**
 * Ek turlar: önceki turlarda geçmeyen banka soruları + HT[cat]'in [from, from + n) dilimi; toplam 34. Banka kısa
 * şıklı soruları tükenirse tur, HT'nin aynı turun yedek ifadeleriyle (from + n … from + max) 34'e tamamlanır.
 */
function halatMore(base) {
	const used = new Set(base.flatMap((r) => r.items.map((x) => x.t)));
	const plan = [
		...Object.keys(CAT_NAME).map((c) => [c, 0, 8, 8]),
		['tarih', 8, 8, 8],
		['cografya', 8, 8, 8],
		['eglence', 8, 8, 8],
		// v1.2: bilime, sanata üçüncü; coğrafyaya, eğlenceye dördüncü tur (bankanın kısa doğru/yanlış ve karşılaştır
		// soruları bitti; tur, kalan kısa şıklı sorular ve daha çok elle yazılmış ifadeyle kurulur)
		['bilim', 8, 12, 12],
		['cografya', 16, 12, 12],
		['sanat', 8, 16, 19],
		['eglence', 16, 16, 18],
	];
	const tfOf = ([t, a]) => ({ t, o: ['DOĞRU', 'YANLIŞ'], r: a ? 0 : 1, d: 1, tf: true });
	return plan.map(([cat, from, n, max], j) => {
		const of = (t) => BANK.filter((q) => q.cat === cat && q.type === t && !used.has(q.q));
		const own = HT[cat].slice(from, from + n).map(tfOf);
		const tf = of('tf')
			.filter((q) => L(q.q) <= 70)
			.slice(0, 6)
			.map((q) => ({ t: q.q, o: ['DOĞRU', 'YANLIŞ'], r: q.ans ? 0 : 1, d: q.diff, tf: true }));
		const hl = of('hilo')
			.filter((q) => q.left.v !== q.right.v && L(q.left.t) <= 24 && L(q.right.t) <= 24 && L(q.q) <= 60)
			.slice(0, 6)
			.map((q) => ({ t: q.q, o: [q.left.t, q.right.t], r: q.left.v > q.right.v ? 0 : 1, d: q.diff }));
		const ch = of('choice')
			.filter((q) => L(q.q) <= 60 && q.a.every((x) => L(x) <= 16))
			.slice(0, 34 - own.length - tf.length - hl.length)
			// şık sayısı karışık: 3, 2 ve 4 (iki şıklıda doğru şık ve ilk çeldirici)
			.map((q, i) => ({ t: q.q, o: q.a.slice(0, [3, 2, 4][i % 3]), r: 0, d: q.diff }));
		const items = [...own, ...tf, ...hl, ...ch];
		items.push(...HT[cat].slice(from + n, from + max).slice(0, Math.max(0, 34 - items.length)).map(tfOf));
		fill(cat, items);
		for (const x of items) used.add(x.t);
		return { id: `dn-ht${7 + j}`, cat, diff: 2, type: 'halat', q: `Halatı kendine çek! · ${CAT_NAME[cat]}`, items };
	});
}
const HALAT = ['tarih', 'cografya', 'bilim', 'spor', 'sanat', 'eglence'].map(halatRound);

export const SAMPLES = {
	halat: [...HALAT, ...halatMore(HALAT)],
	// kimlik listedeki sıradan: bankadan bir soru düşse bile öbürlerinin dn-mc kimliği kaymaz
	mancinik: MANCINIK_IDS.map((id, i) => [BANK.find((q) => q.id === id), i])
		.filter(([q]) => q)
		.map(([q, i]) => ({ ...q, id: `dn-mc${i + 1}`, src: q.id, type: 'mancinik' })),
};
