// YENİ 10 · deneme grubu 5 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   tunel      Zaman Tüneli   iki çapa olayın yılı açık; üç kart sırayla gelir, her biri tünelde doğru boşluğa
//                             sürüklenir. Doğruysa yıl sayacı döner ve kilitlenir, yanlışsa kart gerçek yerine kayar.
//   kelimeavi  Kelime Avı     7×7 … 9×9 harf tablosunda üç gizli kelime; ipucundan bul, düz çizgide kaydırarak avla.
//
// Örnek sorular elle yazıldı. Yıllar ve olgular oyunun kendi doğrulanmış sorularıyla karşılaştırıldı (src/data/q:
// tar-or-001/004/012, bil-or-004, tar-or-008, spo-or-001/010, egl/spo ek sıralama soruları; il adları turkiye.json).

import { PROFILE } from './timing.js';
import { tunel } from './d_tunel.js';
import { kelimeavi } from './d_kelimeavi.js';

// süre profilleri (d_ortak.js stamp): Zaman Tüneli kart başına hatırla + karşılaştır + sürükle (üç kart);
// Kelime Avı kelime başına ipucunu çöz + tabloyu tara + kaydır (tablo büyüdükçe arama uzar)
Object.assign(PROFILE, {
	tunel: { min: 20, max: 40, think: [2, 0.9] },
	kelimeavi: { min: 25, max: 50, think: [2, 0.9] },
});

export const TYPES = { tunel, kelimeavi };
export const ORDER = [
	['tunel', 'Zaman Tüneli', 'Kartı yılların arasına sok, sayaç dönsün'],
	['kelimeavi', 'Kelime Avı', 'Harf tablosunda üç kelimeyi kaydırıp avla'],
];

const TN = (id, cat, diff, q, anchors, cards) => ({ id, cat, diff, type: 'tunel', q, anchors, cards });
const KA = (id, cat, diff, q, words) => ({ id, cat, diff, type: 'kelimeavi', q, words });

export const SAMPLES = {
	tunel: [
		// q yalnız tema; ne yapılacağını kartın kendi talimat plakası söyler (ESKİ yukarıda, YENİ aşağıda)
		// kolay: kartlar sırayla araya, en başa ve en sona düşer (her bölge bir kez)
		TN('yn-tunel-1', 'tarih', 1, 'Tarihin dönüm noktaları', [
			['İstanbul’un Fethi', 1453],
			['Cumhuriyet’in İlanı', 1923],
		], [
			['Tanzimat Fermanı', 1839],
			['Malazgirt Zaferi', 1071],
			['Harf Devrimi', 1928],
		]),
		// orta: ikinci kart ilk kartla çapa arasına, son kart çapanın sekiz yıl öncesine
		TN('yn-tunel-2', 'bilim', 2, 'Bilimin büyük sıçramaları', [
			['Wright kardeşlerin ilk uçuşu', 1903],
			['Ay’a ilk insanlı iniş', 1969],
		], [
			['İlk yapay uydu Sputnik', 1957],
			['Penisilinin keşfi', 1928],
			['X ışınlarının keşfi', 1895],
		]),
		// zor: yılı çapalara çok yakın kartlar (2 ve 11 yıl), son kart beş boşluğun ortasında
		TN('yn-tunel-3', 'spor', 3, 'Sporun büyük anları', [
			['İlk modern Olimpiyat Oyunları', 1896],
			['Galatasaray’ın UEFA Kupası', 2000],
		], [
			['Millî Takım dünya üçüncüsü', 2002],
			['Fenerbahçe’nin kuruluşu', 1907],
			['Naim’in ilk olimpiyat altını', 1988],
		]),
		// ---- tarih
		TN('yn-tunel-4', 'tarih', 1, 'Dünya tarihinin kırılma anları', [
			['Amerika’nın keşfi', 1492],
			['I. Dünya Savaşı’nın başlaması', 1914],
		], [
			['Fransız Devrimi', 1789],
			['Berlin Duvarı’nın yıkılışı', 1989],
			['Magna Carta', 1215],
		]),
		TN('yn-tunel-5', 'tarih', 2, 'Osmanlı’nın yükseliş çağı', [
			['Bursa’nın fethi', 1326],
			['Mohaç Meydan Muharebesi', 1526],
		], [
			['Ankara Savaşı', 1402],
			['Kösedağ Savaşı', 1243],
			['Preveze Deniz Savaşı', 1538],
		]),
		TN('yn-tunel-6', 'tarih', 3, 'Millî Mücadele’den Cumhuriyet’e', [
			['Samsun’a çıkış', 1919],
			['Soyadı Kanunu', 1934],
		], [
			['Saltanatın kaldırılması', 1922],
			['Hatay’ın anavatana katılması', 1939],
			['Medeni Kanun’un kabulü', 1926],
		]),
		TN('yn-tunel-7', 'tarih', 3, 'Osmanlı’da antlaşmalar çağı', [
			['Karlofça Antlaşması', 1699],
			['Küçük Kaynarca Antlaşması', 1774],
		], [
			['Pasarofça Antlaşması', 1718],
			['Müteferrika Matbaası', 1727],
			['II. Viyana Kuşatması', 1683],
		]),
		TN('yn-tunel-8', 'tarih', 2, 'Yeni Türkiye’nin kuruluş yılları', [
			['Cumhuriyet’in İlanı', 1923],
			['NATO’ya üyelik', 1952],
		], [
			['Soyadı Kanunu', 1934],
			['TBMM’nin açılışı', 1920],
			['Çok partili ilk seçim', 1946],
		]),
		// ---- coğrafya
		TN('yn-tunel-9', 'cografya', 1, 'Dünyanın dev yapıları', [
			['Eyfel Kulesi’nin açılışı', 1889],
			['Burj Halife’nin açılışı', 2010],
		], [
			['Golden Gate’in açılışı', 1937],
			['Süveyş Kanalı’nın açılışı', 1869],
			['Çanakkale Köprüsü’nün açılışı', 2022],
		]),
		TN('yn-tunel-10', 'cografya', 2, 'Zirveler, kutuplar, derinlikler', [
			['Güney Kutbu’na ilk varış', 1911],
			['Ay’a ilk insanlı iniş', 1969],
		], [
			['Everest’e ilk tırmanış', 1953],
			['Kolomb’un Amerika’ya varışı', 1492],
			['Mariana Çukuru’na ilk dalış', 1960],
		]),
		TN('yn-tunel-11', 'cografya', 3, 'Büyük keşif seferleri', [
			['Kolomb’un Amerika’ya varışı', 1492],
			['İlk dünya turunun tamamlanması', 1522],
		], [
			['Vasco da Gama Hindistan’da', 1498],
			['Ümit Burnu’nun dolaşılması', 1488],
			['Cook’un Avustralya’ya varışı', 1770],
		]),
		TN('yn-tunel-12', 'cografya', 3, 'Kıtaları birleştiren yollar', [
			['Boğaziçi Köprüsü’nün açılışı', 1973],
			['Avrasya Tüneli’nin açılışı', 2016],
		], [
			['Marmaray’ın açılışı', 2013],
			['Fatih Sultan Mehmet Köprüsü', 1988],
			['Çanakkale Köprüsü’nün açılışı', 2022],
		]),
		TN('yn-tunel-13', 'cografya', 2, 'Başkentlerin hikâyesi', [
			['Ankara’nın başkent oluşu', 1923],
			['Brasilia’nın başkent oluşu', 1960],
		], [
			['Petersburg’un kuruluşu', 1703],
			['Astana’nın başkent oluşu', 1997],
			['Moskova yeniden başkent', 1918],
		]),
		// ---- spor
		TN('yn-tunel-14', 'spor', 1, 'Futbolun büyük sahneleri', [
			['İlk Dünya Kupası', 1930],
			['Galatasaray’ın UEFA Kupası', 2000],
		], [
			['Pelé’nin ilk Dünya Kupası', 1958],
			['İngiltere Futbol Federasyonu', 1863],
			['Katar Dünya Kupası', 2022],
		]),
		TN('yn-tunel-15', 'spor', 2, 'Olimpiyat kentleri', [
			['Berlin Olimpiyatları', 1936],
			['Barselona Olimpiyatları', 1992],
		], [
			['Roma Olimpiyatları', 1960],
			['Rio Olimpiyatları', 2016],
			['Seul Olimpiyatları', 1988],
		]),
		TN('yn-tunel-16', 'spor', 3, 'Topun icadından kupalara', [
			['Basketbolun icadı', 1891],
			['Efes’in ilk EuroLeague kupası', 2021],
		], [
			['Voleybolun icadı', 1895],
			['İngiltere Futbol Federasyonu', 1863],
			['12 Dev Adam Avrupa ikincisi', 2001],
		]),
		TN('yn-tunel-17', 'spor', 1, 'Kulüpler ve kupalar', [
			['Galatasaray’ın kuruluşu', 1905],
			['Trabzonspor’un kuruluşu', 1967],
		], [
			['Göztepe’nin kuruluşu', 1925],
			['İlk modern Olimpiyat Oyunları', 1896],
			['Millî Takım dünya üçüncüsü', 2002],
		]),
		// ---- bilim
		TN('yn-tunel-18', 'bilim', 1, 'Gökyüzünün kapıları', [
			['Gagarin’in uzay uçuşu', 1961],
			['Hubble’ın fırlatılışı', 1990],
		], [
			['Ay’a ilk insanlı iniş', 1969],
			['Newton’un Principia’sı', 1687],
			['İlk kara delik fotoğrafı', 2019],
		]),
		TN('yn-tunel-19', 'bilim', 2, 'İletişimin icatları', [
			['Bell’in telefon patenti', 1876],
			['Web’in herkese açılışı', 1991],
		], [
			['Transistörün icadı', 1947],
			['İlk cep telefonu araması', 1973],
			['Volta pili', 1800],
		]),
		TN('yn-tunel-20', 'bilim', 3, 'Güneş Sistemi’nin keşfi', [
			['Uranüs’ün keşfi', 1781],
			['Plüton’un keşfi', 1930],
		], [
			['Neptün’ün keşfi', 1846],
			['Ceres’in keşfi', 1801],
			['Plüton cüce gezegen sayıldı', 2006],
		]),
		TN('yn-tunel-21', 'bilim', 3, 'Tıbbın dönüm noktaları', [
			['Penisilinin keşfi', 1928],
			['İlk kalp nakli', 1967],
		], [
			['DNA’nın çift sarmalı', 1953],
			['Jenner’in çiçek aşısı', 1796],
			['İnsülinin keşfi', 1921],
		]),
		// ---- sanat ve edebiyat
		TN('yn-tunel-22', 'sanat', 1, 'Romanların doğum yılları', [
			['Don Kişot', 1605],
			['Küçük Prens', 1943],
		], [
			['Sefiller', 1862],
			['Harry Potter’ın ilk kitabı', 1997],
			['Robinson Crusoe', 1719],
		]),
		TN('yn-tunel-23', 'sanat', 2, 'Edebiyatımızın kilometre taşları', [
			['İstiklal Marşı’nın kabulü', 1921],
			['Orhan Pamuk’un Nobel Ödülü', 2006],
		], [
			['Nâzım Hikmet’in doğumu', 1902],
			['Benim Adım Kırmızı', 1998],
			['Yakup Kadri’nin Yaban’ı', 1932],
		]),
		TN('yn-tunel-24', 'sanat', 3, 'Yapıların tamamlanış yılları', [
			['Süleymaniye Camii', 1557],
			['Dolmabahçe Sarayı', 1856],
		], [
			['Şehzade Camii', 1548],
			['Anıtkabir', 1953],
			['Rumeli Hisarı', 1452],
		]),
		TN('yn-tunel-25', 'sanat', 2, 'Tablolar ve heykeller', [
			['Michelangelo’nun Davut’u', 1504],
			['Picasso’nun Guernica’sı', 1937],
		], [
			['Van Gogh’un Yıldızlı Gece’si', 1889],
			['Warhol’un Çorba Kutuları', 1962],
			['Mona Lisa’nın çalınışı', 1911],
		]),
		TN('yn-tunel-26', 'sanat', 1, 'Müziğin büyük eserleri', [
			['Mozart’ın Sihirli Flüt’ü', 1791],
			['Ravel’in Bolero’su', 1928],
		], [
			['Bizet’nin Carmen’i', 1875],
			['Bohemian Rhapsody', 1975],
			['Händel’in Mesih oratoryosu', 1742],
		]),
		TN('yn-tunel-27', 'sanat', 3, 'Türk sinemasının izleri', [
			['Susuz Yaz', 1963],
			['Eşkıya', 1996],
		], [
			['Hababam Sınıfı', 1975],
			['Kış Uykusu’nun Altın Palmiyesi', 2014],
			['Dünyayı Kurtaran Adam', 1982],
		]),
		// ---- genel kültür
		TN('yn-tunel-28', 'eglence', 1, 'Markaların doğuşu', [
			['Coca-Cola’nın doğuşu', 1886],
			['Apple’ın kuruluşu', 1976],
		], [
			['Disney’in kuruluşu', 1923],
			['Google’ın kuruluşu', 1998],
			['Nokia’nın kuruluşu', 1865],
		]),
		TN('yn-tunel-29', 'eglence', 2, 'Oyuncaklar ve oyunlar', [
			['Rubik küpünün icadı', 1974],
			['PlayStation’ın çıkışı', 1994],
		], [
			['Pac-Man’in çıkışı', 1980],
			['Barbie’nin doğuşu', 1959],
			['Nintendo Switch’in çıkışı', 2017],
		]),
		TN('yn-tunel-30', 'eglence', 3, 'İnternetin büyük adımları', [
			['Google’ın kuruluşu', 1998],
			['iPhone’un tanıtılışı', 2007],
		], [
			['Facebook’un kuruluşu', 2004],
			['Wikipedia’nın açılışı', 2001],
			['Instagram’ın çıkışı', 2010],
		]),
		TN('yn-tunel-31', 'eglence', 2, 'Çizgi filmin altın sayfaları', [
			['Pamuk Prenses', 1937],
			['Aslan Kral', 1994],
		], [
			['Mickey Mouse’un ilk filmi', 1928],
			['Shrek', 2001],
			['Karlar Ülkesi', 2013],
		]),
		TN('yn-tunel-32', 'eglence', 1, 'Türkiye’de ilkler', [
			['Türkiye’nin ilk Eurovision’ı', 1975],
			['Sertab’ın Eurovision zaferi', 2003],
		], [
			['Türkiye internete bağlandı', 1993],
			['Müteferrika Matbaası', 1727],
			['Marmaray’ın açılışı', 2013],
		]),
	],
	kelimeavi: [
		// kolay (7×7; → ↓ ↘): Osmanlı’nın ilk şehirleri
		KA('yn-kelimeavi-1', 'tarih', 1, 'Osmanlı şehirlerini avla!', [
			['SÖĞÜT', 'Osmanlı’nın kuruluş yeri'],
			['BURSA', '1326’da alınan başkent'],
			['EDİRNE', 'İstanbul’dan önceki başkent'],
		]),
		// orta (8×8; + ↗): illerin simgeleri
		KA('yn-kelimeavi-2', 'cografya', 2, 'Üç ili tabloda avla!', [
			['NEVŞEHİR', 'Göreme’nin ve peri bacalarının ili'],
			['DENİZLİ', 'Pamukkale travertenlerinin ili'],
			['MALATYA', 'Kayısısıyla ünlü il'],
		]),
		// zor (9×9; sekiz yön, tersten okunanlar dahil): sanat ve edebiyat
		KA('yn-kelimeavi-3', 'sanat', 3, 'Sanat ve edebiyat avı!', [
			['SELİMİYE', 'Sinan’ın ustalık eseri sayılan cami'],
			['GÜNTEKİN', 'Çalıkuşu’nun yazarı Reşat Nuri …'],
			['VEYSEL', 'Sazıyla ünlü Sivaslı ozan Âşık …'],
		]),
		// ---- tarih
		KA('yn-kelimeavi-4', 'tarih', 2, 'Kurtuluş yolunun durakları', [
			['AMASYA', 'Haziran 1919 genelgesinin şehri'],
			['ERZURUM', 'Temmuz 1919’da kongre toplanan şehir'],
			['SİVAS', 'Mandanın reddedildiği kongrenin şehri'],
		]),
		KA('yn-kelimeavi-5', 'tarih', 3, 'Padişahların lakapları', [
			['YAVUZ', 'Çaldıran’ın galibi … Sultan Selim'],
			['KANUNİ', 'Mohaç’ın galibi … Sultan Süleyman'],
			['YILDIRIM', 'Ankara’da Timur’a yenilen … Bayezid'],
		]),
		KA('yn-kelimeavi-6', 'tarih', 1, 'Atatürk’ün izinde', [
			['SAMSUN', '19 Mayıs 1919’da çıkılan liman'],
			['NUTUK', '1927’de altı gün okunan büyük söylev'],
			['SAKARYA', 'Gazi unvanını getiren meydan savaşı'],
		]),
		KA('yn-kelimeavi-7', 'tarih', 2, 'İlk Türk devletleri', [
			['GÖKTÜRK', '“Türk” adını devlet adı yapan ilk devlet'],
			['UYGUR', 'Yerleşik hayata geçen ilk Türk devleti'],
			['SELÇUKLU', '1071’de Malazgirt’i kazanan devlet'],
		]),
		// ---- coğrafya
		KA('yn-kelimeavi-8', 'cografya', 1, 'Plakadan ili bul!', [
			['ADANA', 'Plakası 01 olan il'],
			['ANKARA', 'Plakası 06 olan başkent'],
			['İZMİR', 'Plakası 35 olan Ege kenti'],
		]),
		KA('yn-kelimeavi-9', 'cografya', 2, 'Sınır komşularımız', [
			['İRAN', 'Ağrı ve Van’ın doğu komşusu'],
			['SURİYE', 'Hatay ve Kilis’in güney komşusu'],
			['IRAK', 'Hakkâri’nin güney komşusu'],
		]),
		KA('yn-kelimeavi-10', 'cografya', 3, 'Nehirlerin izinde', [
			['MERİÇ', 'Yunanistan sınırını çizen nehir'],
			['ÇORUH', 'Artvin’den Batum’a akan hırçın nehir'],
			['MENDERES', 'Kıvrımlarıyla dünya diline giren nehir'],
		]),
		KA('yn-kelimeavi-11', 'cografya', 1, 'Göller avı', [
			['UZUNGÖL', 'Trabzon’un kartpostal gölü'],
			['ABANT', 'Bolu’nun ünlü dağ gölü'],
			['SALDA', '“Türkiye’nin Maldivleri” denen göl'],
		]),
		KA('yn-kelimeavi-12', 'cografya', 3, 'Dünya başkentleri', [
			['KANBERRA', 'Avustralya’nın başkenti (Sidney değil!)'],
			['OTTAVA', 'Kanada’nın başkenti'],
			['BRASİLİA', 'Brezilya’nın planlı başkenti'],
		]),
		// ---- spor
		KA('yn-kelimeavi-13', 'spor', 1, 'Saha kenarı sözlüğü', [
			['PENALTI', 'On bir metreden atılan vuruş'],
			['KORNER', 'Köşe bayrağının dibinden yapılan atış'],
			['FRİKİK', 'Serbest vuruşun halk arasındaki adı'],
		]),
		KA('yn-kelimeavi-14', 'spor', 2, 'Türk sporunun yıldızları', [
			['NAİM', '“Cep Herkülü” lakaplı halterci'],
			['TÜRKOĞLU', 'NBA’de “Hedo” diye bilinen Hidayet …'],
			['GAZOZ', 'Tokyo’da okçuluk altını alan Mete …'],
		]),
		KA('yn-kelimeavi-15', 'spor', 3, 'Olimpiyat branşları', [
			['ESKRİM', 'Flöre, epe ve kılıçla yapılan spor'],
			['HALTER', 'Koparma ve silkmeyle yapılan spor'],
			['TAEKWONDO', 'Kore kökenli tekme ağırlıklı dövüş'],
		]),
		KA('yn-kelimeavi-16', 'spor', 1, 'Takımların simgeleri', [
			['KARTAL', 'Beşiktaş’ın simgesi olan kuş'],
			['KANARYA', 'Fenerbahçe’ye lakabını veren kuş'],
			['ASLAN', 'Galatasaray’ın simgesi olan hayvan'],
		]),
		KA('yn-kelimeavi-17', 'spor', 2, 'Basketbol sözlüğü', [
			['RİBAUND', 'Potadan dönen topu kapma'],
			['SMAÇ', 'Topu potaya yukarıdan bastırma'],
			['TURNİKE', 'İki adım atıp topu potaya bırakma'],
		]),
		// ---- bilim
		KA('yn-kelimeavi-18', 'bilim', 1, 'Gezegen avı', [
			['MERKÜR', 'Güneş’e en yakın gezegen'],
			['SATÜRN', 'Halkalarıyla en ünlü gezegen'],
			['MARS', '“Kızıl gezegen” diye bilinir'],
		]),
		KA('yn-kelimeavi-19', 'bilim', 2, 'Elementler', [
			['ALTIN', 'Simgesi Au olan değerli metal'],
			['DEMİR', 'Simgesi Fe olan metal'],
			['HELYUM', 'Dünya’dan önce Güneş’te bulunan soy gaz'],
		]),
		KA('yn-kelimeavi-20', 'bilim', 3, 'İnsan vücudu', [
			['KARACİĞER', 'Vücudun en büyük iç organı'],
			['ÜZENGİ', 'Kulaktaki, vücudun en küçük kemiği'],
			['ALYUVAR', 'Oksijen taşıyan kan hücresi'],
		]),
		KA('yn-kelimeavi-21', 'bilim', 2, 'Bilim insanları', [
			['NEWTON', 'Hareket yasalarının sahibi'],
			['EİNSTEİN', 'Görelilik kuramının babası'],
			['GALİLEO', 'Jüpiter’in dört uydusunu bulan bilgin'],
		]),
		KA('yn-kelimeavi-22', 'bilim', 3, 'İslam dünyasının bilginleri', [
			['HAREZMİ', 'Algoritma sözcüğüne adını veren bilgin'],
			['CEZERİ', 'Fil saatiyle ünlü mühendis'],
			['FARABİ', '“İkinci Öğretmen” denen filozof'],
		]),
		// ---- sanat ve edebiyat
		KA('yn-kelimeavi-23', 'sanat', 1, 'Çalgılar', [
			['KANUN', 'Hem bir çalgı hem bir yasa'],
			['DAVUL', 'Zurnanın ayrılmaz eşi'],
			['BAĞLAMA', 'Âşık Veysel’in elinden düşmeyen saz'],
		]),
		KA('yn-kelimeavi-24', 'sanat', 2, 'Romancılar', [
			['KEMAL', 'İnce Memed’in yazarı Yaşar …'],
			['PAMUK', 'Nobel’li romancı Orhan …'],
			['ATAY', 'Tutunamayanlar’ın yazarı Oğuz …'],
		]),
		KA('yn-kelimeavi-25', 'sanat', 2, 'Şairler', [
			['ERSOY', 'İstiklal Marşı’nın şairi Mehmet Âkif …'],
			['VELİ', 'Garip akımının şairi Orhan …'],
			['FUZULİ', 'Leylâ ile Mecnun’un büyük şairi'],
		]),
		KA('yn-kelimeavi-26', 'sanat', 1, 'Ressamlar', [
			['PİCASSO', 'Guernica’nın ressamı'],
			['MONET', 'Nilüferler dizisinin ressamı'],
			['HAMDİ', 'Kaplumbağa Terbiyecisi: Osman …'],
		]),
		KA('yn-kelimeavi-27', 'sanat', 3, 'Divan şiirinin ustaları', [
			['BAKİ', '“Şairlerin sultanı” denen Divan şairi'],
			['NEDİM', 'Lale Devri’nin neşeli şairi'],
			['NEFİ', 'Sihâm-ı Kazâ hicivlerinin şairi'],
		]),
		// ---- genel kültür
		KA('yn-kelimeavi-28', 'eglence', 1, 'Tatlı avı', [
			['BAKLAVA', 'Gaziantep’in fıstıklı şerbetli tatlısı'],
			['KÜNEFE', 'Hatay’ın peynirli kadayıf tatlısı'],
			['LOKUM', 'Dünyada “Turkish delight” denen tatlı'],
		]),
		KA('yn-kelimeavi-29', 'eglence', 2, 'Nasreddin Hoca avı', [
			['AKŞEHİR', 'Hoca’nın türbesinin bulunduğu ilçe'],
			['EŞEK', 'Hoca’nın ters bindiği hayvan'],
			['KAZAN', 'Hoca’ya göre “doğuran” kap'],
		]),
		KA('yn-kelimeavi-30', 'eglence', 3, 'Karagöz perdesi', [
			['HACİVAT', 'Karagöz’ün bilgiç ve kibar eşi'],
			['BURSA', 'Karagöz’ün memleketi sayılan şehir'],
			['TUZSUZ', 'Kabadayı … Deli Bekir'],
		]),
		KA('yn-kelimeavi-31', 'eglence', 1, 'Masal kahramanları', [
			['PİNOKYO', 'Yalan söyledikçe burnu uzayan kukla'],
			['KURT', 'Kırmızı Başlıklı Kız’ı kandıran'],
			['ALADDİN', 'Sihirli lambanın sahibi'],
		]),
		KA('yn-kelimeavi-32', 'eglence', 2, 'Masa oyunları', [
			['SATRANÇ', 'Şah, vezir ve atın oyunu'],
			['TAVLA', 'Pul ve zarla oynanan oyun'],
			['OKEY', 'Taşlar ve ıstakayla oynanan oyun'],
		]),
	],
};
