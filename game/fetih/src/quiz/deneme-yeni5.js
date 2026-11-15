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
		// v1.1 (33–100): her konudan kolay / orta / zor; kolayda kartlar sırayla araya, en başa, en sona; ortada aynı aralığa
		// iki kart; zorda iki yıl ara (sınama alt sınırı) ve az bilinen olaylar. Yıllar ansiklopedilerle doğrulandı; iki
		// kaynakta farklı yıl görünen olaylar (yayın/sahne yılı ayrımı, açılış/kuruluş farkı) kullanılmadı.
		// ---- tarih
		TN('yn-tunel-33', 'tarih', 1, 'Türk tarihinin meydan savaşları', [
			['I. Kosova Savaşı', 1389],
			['Çaldıran Savaşı', 1514],
		], [
			['Varna Savaşı', 1444],
			['Dandanakan Savaşı', 1040],
			['Sakarya Meydan Muharebesi', 1921],
		]),
		TN('yn-tunel-34', 'tarih', 2, 'Osmanlı’nın fetih yüzyılları', [
			['Trabzon’un fethi', 1461],
			['Rodos’un fethi', 1522],
		], [
			['Ridaniye Savaşı', 1517],
			['Gelibolu’nun alınışı', 1354],
			['Otlukbeli Savaşı', 1473],
		]),
		TN('yn-tunel-35', 'tarih', 3, 'Islahatlar yüzyılı', [
			['Sened-i İttifak', 1808],
			['Tanzimat Fermanı', 1839],
		], [
			['Yeniçeriliğin kaldırılması', 1826],
			['Kırım Savaşı’nın başlaması', 1853],
			['Hünkâr İskelesi Antlaşması', 1833],
		]),
		TN('yn-tunel-36', 'tarih', 1, 'Devrimler, savaşlar, felaketler', [
			['ABD Bağımsızlık Bildirgesi', 1776],
			['II. Dünya Savaşı’nın başlaması', 1939],
		], [
			['Waterloo Muharebesi', 1815],
			['Gırnata’nın düşüşü', 1492],
			['Çernobil faciası', 1986],
		]),
		TN('yn-tunel-37', 'tarih', 2, 'Yirminci yüzyılın dönüm noktaları', [
			['Rus Devrimi', 1917],
			['Berlin Duvarı’nın yıkılışı', 1989],
		], [
			['Hiroşima’ya atom bombası', 1945],
			['Titanik’in batışı', 1912],
			['Berlin Duvarı’nın inşası', 1961],
		]),
		TN('yn-tunel-38', 'tarih', 3, 'Antlaşmalar ve devrimler', [
			['Lozan Antlaşması', 1923],
			['Atatürk’ün ölümü', 1938],
		], [
			['Montrö Boğazlar Sözleşmesi', 1936],
			['Sevr Antlaşması', 1920],
			['Harf Devrimi', 1928],
		]),
		TN('yn-tunel-39', 'tarih', 2, 'Selçukluların yüzyılları', [
			['Malazgirt Zaferi', 1071],
			['Kösedağ Savaşı', 1243],
		], [
			['Miryokefalon Savaşı', 1176],
			['Melikşah’ın ölümü', 1092],
			['Mevlânâ’nın ölümü', 1273],
		]),
		TN('yn-tunel-40', 'tarih', 2, 'Dünyayı değiştiren yıllar', [
			['Luther’in 95 Tezi', 1517],
			['ABD İç Savaşı’nın başlaması', 1861],
		], [
			['Vestfalya Barışı', 1648],
			['Hülagü’nün Bağdat’ı alışı', 1258],
			['Mandela’nın başkan seçilmesi', 1994],
		]),
		TN('yn-tunel-41', 'tarih', 3, 'Seferberlikten Büyük Taarruz’a', [
			['Balkan Savaşları’nın başlaması', 1912],
			['Büyük Taarruz', 1922],
		], [
			['Çanakkale Deniz Zaferi', 1915],
			['II. Meşrutiyet’in ilanı', 1908],
			['Mondros Ateşkesi', 1918],
		]),
		TN('yn-tunel-42', 'tarih', 2, 'Napolyon’un Avrupa’sı', [
			['Napolyon’un Mısır seferi', 1798],
			['Napolyon’un ölümü', 1821],
		], [
			['Trafalgar Deniz Savaşı', 1805],
			['Fransız Devrimi', 1789],
			['Napolyon’un Moskova seferi', 1812],
		]),
		TN('yn-tunel-43', 'tarih', 1, 'Dört yüzyıllık yolculuk', [
			['II. Viyana Kuşatması', 1683],
			['Cumhuriyet’in İlanı', 1923],
		], [
			['Lale Devri’nin başlangıcı', 1718],
			['Mercidabık Savaşı', 1516],
			['Kıbrıs Barış Harekâtı', 1974],
		]),
		TN('yn-tunel-44', 'tarih', 2, 'Soğuk Savaş’ın sıcak anları', [
			['Kore Savaşı’nın başlaması', 1950],
			['Afganistan’ın Sovyet işgali', 1979],
		], [
			['Prag Baharı', 1968],
			['BM’nin kuruluşu', 1945],
			['Macar Ayaklanması', 1956],
		]),
		// ---- coğrafya
		TN('yn-tunel-45', 'cografya', 1, 'Kâşiflerin yüzyılları', [
			['İbn Battuta’nın yola çıkışı', 1325],
			['Macellan’ın Pasifik’e çıkışı', 1520],
		], [
			['Piri Reis’in dünya haritası', 1513],
			['Marco Polo’nun yola çıkışı', 1271],
			['Lewis ve Clark yola çıktı', 1804],
		]),
		TN('yn-tunel-46', 'cografya', 1, 'Göğe uzanan yapılar', [
			['Empire State Binası', 1931],
			['Taipei 101’in açılışı', 2004],
		], [
			['CN Kulesi’nin açılışı', 1976],
			['Eyfel Kulesi’nin açılışı', 1889],
			['Burj Halife’nin açılışı', 2010],
		]),
		TN('yn-tunel-47', 'cografya', 1, 'Köprüler, kanallar, tüneller', [
			['Brooklyn Köprüsü’nün açılışı', 1883],
			['Panama Kanalı’nın açılışı', 1914],
		], [
			['Tower Bridge’in açılışı', 1894],
			['Süveyş Kanalı’nın açılışı', 1869],
			['Manş Tüneli’nin açılışı', 1994],
		]),
		TN('yn-tunel-48', 'cografya', 3, 'Yeryüzünü sarsan felaketler', [
			['Lizbon depremi', 1755],
			['Krakatau patlaması', 1883],
		], [
			['Tambora patlaması', 1815],
			['Büyük San Francisco depremi', 1906],
			['Tunguska olayı', 1908],
		]),
		TN('yn-tunel-49', 'cografya', 1, 'Haritaya yeni sınırlar', [
			['Avustralya Federasyonu', 1901],
			['Hong Kong’un Çin’e devri', 1997],
		], [
			['Hindistan’ın bağımsızlığı', 1947],
			['Alaska’nın satın alınması', 1867],
			['Güney Sudan’ın bağımsızlığı', 2011],
		]),
		TN('yn-tunel-50', 'cografya', 2, 'Zirvelerin fatihleri', [
			['Ağrı Dağı’na ilk tırmanış', 1829],
			['Everest’e ilk tırmanış', 1953],
		], [
			['Matterhorn’a ilk tırmanış', 1865],
			['Mont Blanc’a ilk tırmanış', 1786],
			['Kilimanjaro’ya ilk tırmanış', 1889],
		]),
		TN('yn-tunel-51', 'cografya', 2, 'Rayların ve garların hikâyesi', [
			['Sirkeci Garı’nın açılışı', 1890],
			['Ankara Garı’nın açılışı', 1937],
		], [
			['Hicaz Demiryolu Medine’de', 1908],
			['Şark Ekspresi’nin ilk seferi', 1883],
			['İlk hızlı tren seferimiz', 2009],
		]),
		TN('yn-tunel-52', 'cografya', 3, 'Buzlar diyarı Antarktika', [
			['Antarktika’nın ilk görülüşü', 1820],
			['Antarktika Antlaşması', 1959],
		], [
			['Güney Kutbu’na ilk varış', 1911],
			['Endurance’ın buzda batışı', 1915],
			['Ozon deliğinin keşfi', 1985],
		]),
		TN('yn-tunel-53', 'cografya', 3, 'Okyanus ötesine yelken', [
			['Cabral’ın Brezilya’ya varışı', 1500],
			['Macellan’ın yola çıkışı', 1519],
		], [
			['Balboa Pasifik’i gördü', 1513],
			['John Cabot Kanada’da', 1497],
			['Aztek başkentinin düşüşü', 1521],
		]),
		TN('yn-tunel-54', 'cografya', 2, 'Korunan miras ve doğa', [
			['İlk millî park: Yellowstone', 1872],
			['Göreme UNESCO listesinde', 1985],
		], [
			['Yozgat Çamlığı Millî Parkı', 1958],
			['Pompeii kazılarının başlaması', 1748],
			['Göbeklitepe UNESCO listesinde', 2018],
		]),
		TN('yn-tunel-55', 'cografya', 2, 'Okyanusları aşanlar', [
			['Mayflower’ın Amerika’ya varışı', 1620],
			['Lindbergh’in Atlantik uçuşu', 1927],
		], [
			['Darwin Beagle’la yola çıktı', 1831],
			['Kon-Tiki salının yolculuğu', 1947],
			['Alcock ve Brown’ın uçuşu', 1919],
		]),
		// ---- spor
		TN('yn-tunel-56', 'spor', 1, 'Dünya Kupası’ndan sahneler', [
			['Türkiye’nin ilk Dünya Kupası', 1954],
			['Maradona’nın “Tanrı’nın Eli”', 1986],
		], [
			['Bobby Moore kupayı kaldırdı', 1966],
			['FIFA’nın kuruluşu', 1904],
			['Zidane’ın kafa vuruşu', 2006],
		]),
		TN('yn-tunel-57', 'spor', 2, 'Altınla dönen sporcularımız', [
			['Yaşar Erkan’ın altını', 1936],
			['Naim’in ilk olimpiyat altını', 1988],
		], [
			['Hamit Kaplan’ın altını', 1956],
			['İlk modern Olimpiyat Oyunları', 1896],
			['Nurcan Taylan’ın altını', 2004],
		]),
		TN('yn-tunel-58', 'spor', 2, 'Basketbol tarihinden anlar', [
			['Efes’in Korać Kupası', 1996],
			['Fenerbahçe’nin EuroLeague’i', 2017],
		], [
			['12 Dev Adam dünya ikincisi', 2010],
			['Basketbolun olimpiyata girişi', 1936],
			['Efes’in ilk EuroLeague kupası', 2021],
		]),
		TN('yn-tunel-59', 'spor', 1, 'Efsaneler sahneye çıkıyor', [
			['Jesse Owens’ın dört altını', 1936],
			['Nadia Comaneci’nin ilk 10’u', 1976],
		], [
			['Bob Beamon’un dev atlayışı', 1968],
			['İlk Boston Maratonu', 1897],
			['Phelps’in sekiz altını', 2008],
		]),
		TN('yn-tunel-60', 'spor', 2, 'Kulüplerin kuruluş yılları', [
			['Beşiktaş’ın kuruluşu', 1903],
			['Bursaspor’un kuruluşu', 1963],
		], [
			['Altay’ın kuruluşu', 1914],
			['Gençlerbirliği’nin kuruluşu', 1923],
			['Trabzonspor ilk kez şampiyon', 1976],
		]),
		TN('yn-tunel-61', 'spor', 3, 'Türk futbolunun Avrupa geceleri', [
			['Galatasaray’ın UEFA Kupası', 2000],
			['Euro’da ilk yarı finalimiz', 2008],
		], [
			['Liverpool’un İstanbul mucizesi', 2005],
			['İlk Euro katılımımız', 1996],
			['Hakan’ın 11. saniye golü', 2002],
		]),
		TN('yn-tunel-62', 'spor', 2, 'Tenis kortlarının tarihi', [
			['İlk Wimbledon turnuvası', 1877],
			['İlk Davis Kupası', 1900],
		], [
			['Tenisin olimpiyata girişi', 1896],
			['Açık Dönem’in başlaması', 1968],
			['“Cinsiyetler Savaşı” maçı', 1973],
		]),
		TN('yn-tunel-63', 'spor', 1, 'Pistlerin hız tutkunları', [
			['İlk Formula 1 şampiyonası', 1950],
			['İstanbul’da ilk Formula 1', 2005],
		], [
			['Senna’nın ilk şampiyonluğu', 1988],
			['İlk Le Mans 24 Saat yarışı', 1923],
			['Toprak’ın ilk Superbike tacı', 2021],
		]),
		TN('yn-tunel-64', 'spor', 3, 'Olimpiyatın konuk kentleri', [
			['Helsinki Olimpiyatları', 1952],
			['Moskova Olimpiyatları', 1980],
		], [
			['Münih Olimpiyatları', 1972],
			['Amsterdam Olimpiyatları', 1928],
			['Montreal Olimpiyatları', 1976],
		]),
		TN('yn-tunel-65', 'spor', 2, 'Kadın sporcuların izinde', [
			['Kadınların olimpiyata katılışı', 1900],
			['Olimpiyatta ilk kadın maratonu', 1984],
		], [
			['Halet Çambel olimpiyatta', 1936],
			['Wimbledon kadın tekleri', 1884],
			['Busenaz’ın olimpiyat altını', 2021],
		]),
		TN('yn-tunel-66', 'spor', 3, 'Futbol kurallarının tarihi', [
			['Penaltı kuralının doğuşu', 1891],
			['Sarı ve kırmızı kartlar', 1970],
		], [
			['Ofsaytta iki oyuncu kuralı', 1925],
			['Geri pas kuralı', 1992],
			['İngiltere’de üç puan sistemi', 1981],
		]),
		// ---- bilim
		TN('yn-tunel-67', 'bilim', 1, 'Bilimde çığır açanlar', [
			['Jüpiter’in uydularının keşfi', 1610],
			['Einstein’ın özel göreliliği', 1905],
		], [
			['Faraday’ın elektrik motoru', 1821],
			['Kopernik’in büyük eseri', 1543],
			['Higgs bozonunun keşfi', 2012],
		]),
		TN('yn-tunel-68', 'bilim', 2, 'Atomun sırları', [
			['Mendeleyev’in tablosu', 1869],
			['Atom çekirdeğinin keşfi', 1911],
		], [
			['Radyumun keşfi', 1898],
			['Hidrojenin keşfi', 1766],
			['Nötronun keşfi', 1932],
		]),
		TN('yn-tunel-69', 'bilim', 3, 'Uzay yarışının sıcak yılları', [
			['Gagarin’in uzay uçuşu', 1961],
			['Ay’a ilk insanlı iniş', 1969],
		], [
			['İlk uzay yürüyüşü', 1965],
			['Uzaydaki ilk kadın', 1963],
			['Explorer 1’in fırlatılışı', 1958],
		]),
		TN('yn-tunel-70', 'bilim', 1, 'Evlerimizi değiştiren icatlar', [
			['Edison’un ampulü', 1879],
			['Televizyonun ilk gösterimi', 1926],
		], [
			['Carrier’ın klima makinesi', 1902],
			['Dagerreyotipin tanıtılışı', 1839],
			['IBM PC’nin piyasaya çıkışı', 1981],
		]),
		TN('yn-tunel-71', 'bilim', 2, 'Ulaşımın icatları', [
			['Montgolfier balonu', 1783],
			['Benz’in motorlu arabası', 1886],
		], [
			['Londra metrosunun açılışı', 1863],
			['Stockton–Darlington demiryolu', 1825],
			['Ford Model T', 1908],
		]),
		TN('yn-tunel-72', 'bilim', 3, 'Mikroplara karşı tıp', [
			['Verem mikrobunun keşfi', 1882],
			['Kan gruplarının keşfi', 1901],
		], [
			['Pasteur’ün kuduz aşısı', 1885],
			['Lister’in antiseptik cerrahisi', 1867],
			['Aspirinin sentezi', 1897],
		]),
		TN('yn-tunel-73', 'bilim', 2, 'Bilgisayarın evrimi', [
			['Turing makinesinin tanımı', 1936],
			['Deep Blue’nun Kasparov zaferi', 1997],
		], [
			['İlk mikroçip', 1958],
			['Babbage’ın fark makinesi', 1822],
			['AlphaGo’nun Lee Sedol zaferi', 2016],
		]),
		TN('yn-tunel-74', 'bilim', 1, 'Gökyüzünü okuyanlar', [
			['Kepler’in Astronomia Nova’sı', 1609],
			['Hubble’ın genişleyen evreni', 1929],
		], [
			['Halley’in tahmini doğrulandı', 1758],
			['Tycho’nun süpernovası', 1572],
			['James Webb’in fırlatılışı', 2021],
		]),
		TN('yn-tunel-75', 'bilim', 3, 'Gezegenlere yolculuk', [
			['Viking 1’in Mars’a inişi', 1976],
			['Curiosity’nin Mars’a inişi', 2012],
		], [
			['Voyager 2 Neptün’de', 1989],
			['Mars Pathfinder’ın inişi', 1997],
			['Kuyruklu yıldıza ilk iniş', 2014],
		]),
		TN('yn-tunel-76', 'bilim', 2, 'Evrimden genoma', [
			['Darwin’in Türlerin Kökeni', 1859],
			['DNA’nın çift sarmalı', 1953],
		], [
			['Koyun Dolly’nin doğumu', 1996],
			['Linnaeus’un Doğa Sistemi', 1735],
			['İnsan Genom Projesi tamamlandı', 2003],
		]),
		TN('yn-tunel-77', 'bilim', 1, 'Ses, görüntü, mesaj', [
			['Edison’un fonografı', 1877],
			['Sony Walkman’in çıkışı', 1979],
		], [
			['Lumière’lerin ilk gösterimi', 1895],
			['Morse’un ilk telgraf mesajı', 1844],
			['YouTube’un açılışı', 2005],
		]),
		TN('yn-tunel-78', 'bilim', 2, 'Enerjinin icatları', [
			['Newcomen’in buhar makinesi', 1712],
			['Edison’un elektrik santrali', 1882],
		], [
			['Franklin’in uçurtma deneyi', 1752],
			['James Watt’ın patenti', 1769],
			['Obninsk nükleer santrali', 1954],
		]),
		// ---- sanat ve edebiyat
		TN('yn-tunel-79', 'sanat', 1, 'Dünya edebiyatının durakları', [
			['Gulliver’in Gezileri', 1726],
			['Muhteşem Gatsby', 1925],
		], [
			['Suç ve Ceza', 1866],
			['Shakespeare’in ölümü', 1616],
			['Yüzyıllık Yalnızlık', 1967],
		]),
		TN('yn-tunel-80', 'sanat', 2, 'Türk romanının klasikleri', [
			['Çalıkuşu', 1922],
			['İnce Memed', 1955],
		], [
			['Kuyucaklı Yusuf', 1937],
			['İntibah', 1876],
			['Huzur', 1949],
		]),
		TN('yn-tunel-81', 'sanat', 3, 'Şiir kitaplarımızın yılları', [
			['Rübab-ı Şikeste', 1900],
			['Garip', 1941],
		], [
			['Safahat’ın ilk kitabı', 1911],
			['835 Satır', 1929],
			['Üvercinka', 1958],
		]),
		TN('yn-tunel-82', 'sanat', 1, 'Ressamların başyapıtları', [
			['Rembrandt’ın Gece Devriyesi', 1642],
			['Munch’un Çığlık’ı', 1893],
		], [
			['Monet’nin İzlenim, Gün Doğumu', 1872],
			['Sistina Şapeli’nin tavanı', 1512],
			['Dalí’nin Belleğin Azmi’si', 1931],
		]),
		TN('yn-tunel-83', 'sanat', 2, 'Opera sahnesinden', [
			['Figaro’nun Düğünü', 1786],
			['Aida', 1871],
		], [
			['Sevil Berberi', 1816],
			['La Traviata', 1853],
			['Turandot', 1926],
		]),
		TN('yn-tunel-84', 'sanat', 3, 'Türk resminin yolu', [
			['Osman Hamdi’nin doğumu', 1842],
			['D Grubu’nun kuruluşu', 1933],
		], [
			['Kaplumbağa Terbiyecisi', 1906],
			['Müstakil Ressamlar Birliği', 1929],
			['İlk resim ve heykel müzemiz', 1937],
		]),
		TN('yn-tunel-85', 'sanat', 2, 'Beyaz perdenin klasikleri', [
			['Rüzgâr Gibi Geçti', 1939],
			['Yıldız Savaşları', 1977],
		], [
			['Hitchcock’un Sapık’ı', 1960],
			['Kazablanka', 1942],
			['Cameron’ın Titanik’i', 1997],
		]),
		TN('yn-tunel-86', 'sanat', 1, 'Türk sinemasından kareler', [
			['Ah Güzel İstanbul', 1966],
			['Babam ve Oğlum', 2005],
		], [
			['Yol’un Altın Palmiye’si', 1982],
			['İlk sesli Türk filmi', 1931],
			['Merve Dizdar’ın Cannes ödülü', 2023],
		]),
		TN('yn-tunel-87', 'sanat', 2, 'Simge yapılar', [
			['Özgürlük Heykeli', 1886],
			['Sidney Opera Binası', 1973],
		], [
			['Chrysler Binası', 1930],
			['Big Ben’in saati', 1859],
			['Louvre Piramidi', 1989],
		]),
		TN('yn-tunel-88', 'sanat', 3, 'Selatin camilerinin yılları', [
			['İstanbul Beyazıt Camii', 1506],
			['Eminönü Yeni Cami’nin açılışı', 1665],
		], [
			['Edirne Selimiye Camii', 1575],
			['Üç Şerefeli Cami', 1447],
			['Nuruosmaniye Camii', 1755],
		]),
		TN('yn-tunel-89', 'sanat', 2, 'Tiyatro sahnelerinden', [
			['Vatan yahut Silistre sahnede', 1873],
			['Keşanlı Ali Destanı sahnede', 1964],
		], [
			['Darülbedayi’nin kuruluşu', 1914],
			['Molière’in Tartuffe’ü sahnede', 1664],
			['Godot’yu Beklerken sahnede', 1953],
		]),
		// ---- genel kültür
		TN('yn-tunel-90', 'eglence', 1, 'Çizgilerden doğan kahramanlar', [
			['Süpermen’in doğuşu', 1938],
			['Garfield’ın doğuşu', 1978],
		], [
			['Asteriks’in doğuşu', 1959],
			['Tenten’in ilk macerası', 1929],
			['Simpsonlar dizisi', 1989],
		]),
		TN('yn-tunel-91', 'eglence', 2, 'Ekranların oyunları', [
			['Pong’un çıkışı', 1972],
			['Pokémon’un doğuşu', 1996],
		], [
			['Tetris’in doğuşu', 1984],
			['Game Boy’un çıkışı', 1989],
			['Angry Birds’ün çıkışı', 2009],
		]),
		TN('yn-tunel-92', 'eglence', 3, 'Radyodan televizyona Türkiye', [
			['İTÜ’de ilk televizyon yayını', 1952],
			['İlk özel televizyon kanalı', 1990],
		], [
			['TRT’nin ilk televizyon yayını', 1968],
			['TRT’nin kuruluşu', 1964],
			['İlk radyo yayınımız', 1927],
		]),
		TN('yn-tunel-93', 'eglence', 1, 'Ödüller ve ödüllüler', [
			['İlk Nobel Ödülleri', 1901],
			['İlk Eurovision Şarkı Yarışması', 1956],
		], [
			['İlk Oscar töreni', 1929],
			['Dinamitin patenti', 1867],
			['Aziz Sancar’ın Nobel’i', 2015],
		]),
		TN('yn-tunel-94', 'eglence', 2, 'Köklü Türk markaları', [
			['Hacı Bekir’in lokum dükkânı', 1777],
			['Türk Hava Yolları’nın kuruluşu', 1933],
		], [
			['İş Bankası’nın kuruluşu', 1924],
			['Arçelik’in kuruluşu', 1955],
			['Ülker’in kuruluşu', 1944],
		]),
		TN('yn-tunel-95', 'eglence', 3, 'Dijital çağın doğuşu', [
			['ARPANET’in ilk mesajı', 1969],
			['Amazon’un kuruluşu', 1994],
		], [
			['İlk SMS mesajı', 1992],
			['E-postada @ işaretinin doğuşu', 1971],
			['Twitter’ın kuruluşu', 2006],
		]),
		TN('yn-tunel-96', 'eglence', 2, 'Pop müziğin dev anları', [
			['Beatles’ın ilk albümü', 1963],
			['Live Aid konserleri', 1985],
		], [
			['Woodstock Festivali', 1969],
			['MTV’nin yayına başlaması', 1981],
			['Elvis’in Heartbreak Hotel’i', 1956],
		]),
		TN('yn-tunel-97', 'eglence', 1, 'Zamanı ölçmenin tarihi', [
			['Gregoryen takvimin doğuşu', 1582],
			['Greenwich başlangıç meridyeni', 1884],
		], [
			['Huygens’in sarkaçlı saati', 1656],
			['Prag Astronomik Saati', 1410],
			['İlk sezyum atom saati', 1955],
		]),
		TN('yn-tunel-98', 'eglence', 2, 'Çocuk klasiklerinin yılları', [
			['Grimm Masalları', 1812],
			['Oz Büyücüsü', 1900],
		], [
			['Pinokyo’nun Maceraları', 1883],
			['Alice Harikalar Diyarında', 1865],
			['Pippi Uzunçorap', 1945],
		]),
		TN('yn-tunel-99', 'eglence', 3, 'Oyuncak kutusundan', [
			['LEGO tuğlasının patenti', 1958],
			['Tamagotchi’nin çıkışı', 1996],
		], [
			['UNO kart oyunu', 1971],
			['Kinder Sürpriz yumurtası', 1974],
			['Oyuncak ayının doğuşu', 1902],
		]),
		TN('yn-tunel-100', 'eglence', 2, 'Osmanlı’dan bugüne ilkler', [
			['İlk Osmanlı posta pulu', 1863],
			['İlk kadın milletvekilleri', 1935],
		], [
			['İstanbul’da atlı tramvay', 1871],
			['Takvim-i Vekayi gazetesi', 1831],
			['İlk Türk astronot uzayda', 2024],
		]),
		// v1.2 (101–150): aynı zorluk düzeni; yalnız tek ve kesin yıllı olaylar (yayın/sahne, kuruluş/açılış, takvim farkı
		// olanlar alınmadı). Bankanın sıralama, tahmin, yıldırım ve öbür tiplerinde yılıyla sorulan olaylar kullanılmadı.
		// ---- tarih
		TN('yn-tunel-101', 'tarih', 1, 'Sultanlar, paşalar, bilginler', [
			['Barbaros’un ölümü', 1546],
			['Kâtip Çelebi’nin ölümü', 1657],
		], [
			['Sokullu’nun öldürülmesi', 1579],
			['Cem Sultan’ın ölümü', 1495],
			['Tıphane-i Amire’nin açılışı', 1827],
		]),
		TN('yn-tunel-102', 'tarih', 3, 'Orta Çağ’ın dönüm noktaları', [
			['Moğol Devleti’nin kuruluşu', 1206],
			['Yüz Yıl Savaşları başladı', 1337],
		], [
			['Akka’nın Memlüklerce alınışı', 1291],
			['İstanbul’un Latin işgali', 1204],
			['Timur’un ölümü', 1405],
		]),
		TN('yn-tunel-103', 'tarih', 2, 'Osmanlı’da kalem ve kılıç', [
			['Evliya Çelebi’nin doğumu', 1611],
			['Belgrad Antlaşması', 1739],
		], [
			['Genç Osman’ın öldürülmesi', 1622],
			['Yaş Antlaşması', 1792],
			['Mekteb-i Harbiye’nin kuruluşu', 1834],
		]),
		TN('yn-tunel-104', 'tarih', 2, 'Avrupa’nın savaş ve barışları', [
			['İngiliz İç Savaşı başladı', 1642],
			['Kızılhaç’ın kuruluşu', 1863],
		], [
			['Utrecht Antlaşması', 1713],
			['Yedi Yıl Savaşları başladı', 1756],
			['Rus-Japon Savaşı başladı', 1904],
		]),
		TN('yn-tunel-105', 'tarih', 2, 'Tanzimat’tan Balkan Savaşı’na', [
			['Kuleli’nin kuruluşu', 1845],
			['Haydarpaşa Garı’nın açılışı', 1908],
		], [
			['Kızılay’ın kuruluşu', 1868],
			['Robert Kolej’in kuruluşu', 1863],
			['Selanik’in elden çıkışı', 1912],
		]),
		TN('yn-tunel-106', 'tarih', 2, 'Krallar, liderler, antlaşmalar', [
			['Viktorya’nın tahta çıkışı', 1837],
			['II. Elizabeth’in taç giyişi', 1953],
		], [
			['Balkan Antantı', 1934],
			['Mao’nun ölümü', 1976],
			['II. Elizabeth’in ölümü', 2022],
		]),
		TN('yn-tunel-107', 'tarih', 3, 'On dokuzuncu yüzyıldan sahneler', [
			['Beethoven’ın ölümü', 1827],
			['Dickens’ın ölümü', 1870],
		], [
			['Londra Boğazlar Sözleşmesi', 1841],
			['Mekteb-i Sultani’nin açılışı', 1868],
			['Tanpınar’ın doğumu', 1901],
		]),
		// ---- coğrafya
		TN('yn-tunel-108', 'cografya', 1, 'Suyu ve dağı aşan yapılar', [
			['Sidney Liman Köprüsü', 1932],
			['Akashi Kaikyō Köprüsü', 1998],
		], [
			['Mont Blanc Tüneli’nin açılışı', 1965],
			['Rialto Köprüsü', 1591],
			['Millau Viyadüğü’nün açılışı', 2004],
		]),
		TN('yn-tunel-109', 'cografya', 1, 'Kentler kuruluyor', [
			['Rio de Janeiro’nun kuruluşu', 1565],
			['Sidney’in kuruluşu', 1788],
		], [
			['Montreal’in kuruluşu', 1642],
			['Lima’nın kuruluşu', 1535],
			['Tel Aviv’in kuruluşu', 1909],
		]),
		TN('yn-tunel-110', 'cografya', 2, 'Yeni kentlerin temelleri', [
			['Quebec’in kuruluşu', 1608],
			['Melbourne’un kuruluşu', 1835],
		], [
			['New Orleans’ın kuruluşu', 1718],
			['Modern Singapur’un kuruluşu', 1819],
			['Johannesburg’un kuruluşu', 1886],
		]),
		TN('yn-tunel-111', 'cografya', 2, 'Keşfin ve haritanın tarihi', [
			['İdrisi’nin dünya haritası', 1154],
			['Mercator’un dünya haritası', 1569],
		], [
			['Haritada ilk kez “Amerika”', 1507],
			['Google Earth’ün çıkışı', 2005],
			['Denizaltıyla Kuzey Kutbu’nda', 1958],
		]),
		TN('yn-tunel-112', 'cografya', 3, 'Ulaşımın büyük yapıları', [
			['Thames Tüneli’nin açılışı', 1843],
			['Kiel Kanalı’nın açılışı', 1895],
		], [
			['Korint Kanalı’nın açılışı', 1893],
			['Forth Demiryolu Köprüsü', 1890],
			['Verrazzano Köprüsü', 1964],
		]),
		TN('yn-tunel-113', 'cografya', 1, 'Yeri sarsan büyük depremler', [
			['Büyük Kantō depremi', 1923],
			['Kobe depremi', 1995],
		], [
			['Tangşan depremi', 1976],
			['Messina depremi', 1908],
			['Tōhoku depremi', 2011],
		]),
		TN('yn-tunel-114', 'cografya', 2, 'Haritada yeni bayraklar', [
			['Norveç’in bağımsızlığı', 1905],
			['Kenya’nın bağımsızlığı', 1963],
		], [
			['İzlanda’nın bağımsızlığı', 1944],
			['Namibya’nın bağımsızlığı', 1990],
			['Kosova’nın bağımsızlık ilanı', 2008],
		]),
		TN('yn-tunel-115', 'cografya', 2, 'Kâşifler, zirveler, yanardağlar', [
			['Victoria Şelalesi’nin adlanışı', 1855],
			['Pelée Yanardağı’nın patlaması', 1902],
		], [
			['Stanley Livingstone’u buldu', 1871],
			['Aconcagua’ya ilk tırmanış', 1897],
			['Eyjafjallajökull patlaması', 2010],
		]),
		TN('yn-tunel-116', 'cografya', 2, 'Anıtlar, parklar, tüneller', [
			['Rushmore Dağı anıtının bitişi', 1941],
			['Burj al Arab’ın açılışı', 1999],
		], [
			['Galápagos Ulusal Parkı', 1959],
			['Bolu Dağı Tüneli’nin açılışı', 2007],
			['Ovit Tüneli’nin açılışı', 2018],
		]),
		// ---- spor
		TN('yn-tunel-117', 'spor', 1, 'Spor tarihinden sayfalar', [
			['İnönü Stadı’nın açılışı', 1947],
			['Bosman kararı', 1995],
		], [
			['İlk Super Bowl', 1967],
			['Paavo Nurmi’nin beş altını', 1924],
			['Atatürk Olimpiyat Stadı', 2002],
		]),
		TN('yn-tunel-118', 'spor', 2, 'Kortların büyük şampiyonları', [
			['Borg’un ilk Wimbledon’u', 1976],
			['Federer’in ilk Wimbledon’u', 2003],
		], [
			['Sampras’ın ilk Wimbledon’u', 1993],
			['Murray’in ilk Wimbledon’u', 2013],
			['Djokovic’in ilk Grand Slam’i', 2008],
		]),
		TN('yn-tunel-119', 'spor', 3, 'Pistlerin dünya şampiyonları', [
			['Schumacher’in ilk şampiyonluğu', 1994],
			['Räikkönen’in şampiyonluğu', 2007],
		], [
			['Alonso’nun ilk şampiyonluğu', 2005],
			['Häkkinen’in ilk şampiyonluğu', 1998],
			['Verstappen’in ilk şampiyonluğu', 2021],
		]),
		TN('yn-tunel-120', 'spor', 2, 'Efsanelerin zafer yılları', [
			['Fangio’nun ilk şampiyonluğu', 1951],
			['Kramnik’in dünya tacı', 2000],
		], [
			['Kareem’in ilk NBA şampiyonluğu', 1971],
			['Lauda’nın ilk şampiyonluğu', 1975],
			['Carlsen’in ilk dünya tacı', 2013],
		]),
		TN('yn-tunel-121', 'spor', 2, 'Sahalardan ve dağlardan', [
			['Napoli’nin ilk Serie A tacı', 1987],
			['Messi’nin ilk Altın Top ödülü', 2009],
		], [
			['İlk Kadınlar Dünya Kupası', 1991],
			['Ajax’ın Devler Ligi zaferi', 1995],
			['Eiger’in kuzey yüzü aşıldı', 1938],
		]),
		// ---- bilim
		TN('yn-tunel-122', 'bilim', 1, 'Bilimin dev adımları', [
			['Faraday’ın indüksiyon keşfi', 1831],
			['Einstein’ın genel göreliliği', 1915],
		], [
			['Radyoaktivitenin keşfi', 1896],
			['Royal Society’nin kuruluşu', 1660],
			['İlk nükleer reaktör', 1942],
		]),
		TN('yn-tunel-123', 'bilim', 1, 'Laboratuvardan hastaneye', [
			['Sıtma parazitinin keşfi', 1880],
			['İlk vücut içi kalp pili', 1958],
		], [
			['Behçet hastalığının tanımı', 1937],
			['Wöhler’in üre sentezi', 1828],
			['HIV’in keşfi', 1983],
		]),
		TN('yn-tunel-124', 'bilim', 2, 'Uzaya açılan kapılar', [
			['Goddard’ın sıvı yakıtlı roketi', 1926],
			['Mir istasyonunun fırlatılışı', 1986],
		], [
			['Apollo 13 kazası', 1970],
			['Venüs’ün yanından ilk geçiş', 1962],
			['RASAT uydusu uzayda', 2011],
		]),
		TN('yn-tunel-125', 'bilim', 2, 'Periyodik tablonun doğuşu', [
			['Klorun keşfi', 1774],
			['Argonun keşfi', 1894],
		], [
			['Uranyumun keşfi', 1789],
			['Sodyumun elde edilişi', 1807],
			['Nükleer fisyonun keşfi', 1938],
		]),
		TN('yn-tunel-126', 'bilim', 3, 'Bilgisayar çağının adımları', [
			['Bilgisayar faresinin tanıtımı', 1968],
			['Linux’un doğuşu', 1991],
		], [
			['Apple Macintosh’un çıkışı', 1984],
			['Windows 95’in çıkışı', 1995],
			['Nvidia’nın kuruluşu', 1993],
		]),
		TN('yn-tunel-127', 'bilim', 2, 'Teleskopla bulunan dünyalar', [
			['Titan’ın keşfi', 1655],
			['Charon’un keşfi', 1978],
		], [
			['Mars’ın uydularının keşfi', 1877],
			['Pulsarların keşfi', 1967],
			['Shoemaker-Levy’nin çarpması', 1994],
		]),
		TN('yn-tunel-128', 'bilim', 3, 'Bilimde hareketli yıllar', [
			['Ay’a ilk yumuşak iniş', 1966],
			['İlk tüp bebeğin doğumu', 1978],
		], [
			['İlk bilgisayarlı tomografi', 1971],
			['TÜBİTAK’ın kuruluşu', 1963],
			['Curie’nin ikinci Nobel’i', 1911],
		]),
		TN('yn-tunel-129', 'bilim', 2, 'Bilim insanlarının hayatından', [
			['Galileo’nun mahkûmiyeti', 1633],
			['Nobel’in doğumu', 1833],
		], [
			['Lavoisier’nin idamı', 1794],
			['Darwin’in doğumu', 1809],
			['Tesla’nın doğumu', 1856],
		]),
		TN('yn-tunel-130', 'bilim', 1, 'Kuantumdan uzaya', [
			['Zamanın Kısa Tarihi', 1988],
			['Columbia faciası', 2003],
		], [
			['Hubble’ın ilk onarımı', 1993],
			['Planck’ın kuantum hipotezi', 1900],
			['Chandrayaan-3’ün Ay’a inişi', 2023],
		]),
		// ---- sanat ve edebiyat
		TN('yn-tunel-131', 'sanat', 1, 'Roman ve resmin başyapıtları', [
			['Uğultulu Tepeler', 1847],
			['Gazap Üzümleri', 1939],
		], [
			['Babalar ve Oğullar', 1862],
			['Velázquez’in Nedimeler’i', 1656],
			['Çavdar Tarlasında Çocuklar', 1951],
		]),
		TN('yn-tunel-132', 'sanat', 2, 'Opera ve müzikal sahneleri', [
			['Don Giovanni sahnede', 1787],
			['La Bohème sahnede', 1896],
		], [
			['Nabucco sahnede', 1842],
			['Pagliacci sahnede', 1892],
			['Operadaki Hayalet sahnede', 1986],
		]),
		TN('yn-tunel-133', 'sanat', 2, 'Tiyatronun unutulmaz oyunları', [
			['Bebek Evi sahnede', 1879],
			['Arzu Tramvayı sahnede', 1947],
		], [
			['Çehov’un Martı’sı sahnede', 1896],
			['Vişne Bahçesi sahnede', 1904],
			['Cats müzikali sahnede', 1981],
		]),
		TN('yn-tunel-134', 'sanat', 1, 'Sergiler, saraylar, besteler', [
			['Kristal Saray’ın açılışı', 1851],
			['Duchamp’ın Çeşme’si', 1917],
		], [
			['Çimenlerde Öğle Yemeği', 1863],
			['Händel’in Su Müziği', 1717],
			['Pompidou Merkezi’nin açılışı', 1977],
		]),
		TN('yn-tunel-135', 'sanat', 2, 'Edebiyatımızdan kitaplar', [
			['Fatih-Harbiye', 1931],
			['Ölmeye Yatmak', 1973],
		], [
			['Semaver', 1936],
			['Bereketli Topraklar Üzerinde', 1954],
			['Masumiyet Müzesi', 2008],
		]),
		TN('yn-tunel-136', 'sanat', 2, 'Türk sinemasından filmler', [
			['Muhsin Bey', 1987],
			['Vizontele', 2001],
		], [
			['Masumiyet', 1997],
			['G.O.R.A.', 2004],
			['Kelebeğin Rüyası', 2013],
		]),
		TN('yn-tunel-137', 'sanat', 1, 'Beyaz perdeden yıllar', [
			['Spielberg’in E.T.’si', 1982],
			['Bir Zamanlar Anadolu’da', 2011],
		], [
			['Hokkabaz', 2006],
			['Spielberg’in Jaws’ı', 1975],
			['Ahlat Ağacı', 2018],
		]),
		TN('yn-tunel-138', 'sanat', 3, 'Yeşilçam’ın sevilen yüzleri', [
			['Sadri Alışık’ın doğumu', 1925],
			['Fatma Girik’in doğumu', 1942],
		], [
			['Fikret Hakan’ın doğumu', 1934],
			['Ayhan Işık’ın doğumu', 1929],
			['Türkan Şoray’ın doğumu', 1945],
		]),
		TN('yn-tunel-139', 'sanat', 2, 'Müzeler ve sergiler', [
			['Prado Müzesi’nin açılışı', 1819],
			['Tate Modern’in açılışı', 2000],
		], [
			['MoMA’nın açılışı', 1929],
			['İlk İstanbul Bienali', 1987],
			['Pera Müzesi’nin açılışı', 2005],
		]),
		TN('yn-tunel-140', 'sanat', 1, 'Edebiyat ve sanatın vedaları', [
			['Puşkin’in ölümü', 1837],
			['Kafka’nın ölümü', 1924],
		], [
			['Dostoyevski’nin ölümü', 1881],
			['Goethe’nin ölümü', 1832],
			['Picasso’nun ölümü', 1973],
		]),
		TN('yn-tunel-141', 'sanat', 3, 'Ressam ve yazarların son yılları', [
			['Frida Kahlo’nun ölümü', 1954],
			['Warhol’un ölümü', 1987],
		], [
			['Victor Hugo’nun ölümü', 1885],
			['Tolstoy’un ölümü', 1910],
			['Dalí’nin ölümü', 1989],
		]),
		// ---- genel kültür
		TN('yn-tunel-142', 'eglence', 1, 'Ekranın efsane dizileri', [
			['Star Trek’in ilk bölümü', 1966],
			['Friends’in ilk bölümü', 1994],
		], [
			['Dallas’ın ilk bölümü', 1978],
			['Taş Devri’nin ilk bölümü', 1960],
			['Game of Thrones’un ilk bölümü', 2011],
		]),
		TN('yn-tunel-143', 'eglence', 2, 'Ekranın unutulmaz yapımları', [
			['Susam Sokağı yayında', 1969],
			['Seinfeld’in ilk bölümü', 1989],
		], [
			['Muppet Show yayında', 1976],
			['X-Files’ın ilk bölümü', 1993],
			['Kurtlar Vadisi’nin ilk bölümü', 2003],
		]),
		TN('yn-tunel-144', 'eglence', 2, 'Kalemden roketlere şirketler', [
			['Faber-Castell’in kuruluşu', 1761],
			['Adidas’ın kuruluşu', 1949],
		], [
			['Siemens’in kuruluşu', 1847],
			['Airbnb’nin kuruluşu', 2008],
			['SpaceX’in kuruluşu', 2002],
		]),
		TN('yn-tunel-145', 'eglence', 1, 'Plaktan akıllı cebe', [
			['Uzunçalar plağın doğuşu', 1948],
			['iPod’un tanıtılışı', 2001],
		], [
			['Kompakt kasetin tanıtılışı', 1963],
			['Kodak Brownie makinesi', 1900],
			['Spotify’ın açılışı', 2008],
		]),
		TN('yn-tunel-146', 'eglence', 2, 'Oyun dünyasından', [
			['Twister oyunu', 1966],
			['Xbox’ın çıkışı', 2001],
		], [
			['İlk FIFA oyunu', 1993],
			['Furby’nin çıkışı', 1998],
			['Wii’nin çıkışı', 2006],
		]),
		TN('yn-tunel-147', 'eglence', 2, 'Raflara ve cüzdanlara girenler', [
			['Fanta’nın doğuşu', 1940],
			['Starbucks’ın kuruluşu', 1971],
		], [
			['Diners Club kartının doğuşu', 1950],
			['Hazır eriştenin icadı', 1958],
			['Red Bull’un doğuşu', 1987],
		]),
		TN('yn-tunel-148', 'eglence', 2, 'Hayatımıza girenler', [
			['M&M’s şekerlerinin doğuşu', 1941],
			['Tokyo Disneyland’in açılışı', 1983],
		], [
			['Polaroid anlık kamera', 1948],
			['Guinness Rekorlar Kitabı', 1955],
			['Disneyland Paris’in açılışı', 1992],
		]),
		TN('yn-tunel-149', 'eglence', 3, 'Dijital hayatın uygulamaları', [
			['Skype’ın çıkışı', 2003],
			['Kindle’ın çıkışı', 2007],
		], [
			['Google Haritalar’ın açılışı', 2005],
			['The Sims’in çıkışı', 2000],
			['iPad’in tanıtılışı', 2010],
		]),
		TN('yn-tunel-150', 'eglence', 3, 'Ekranların yeni yüzyılı', [
			['Avrupa Yakası’nın ilk bölümü', 2004],
			['Squid Game’in ilk sezonu', 2021],
		], [
			['Muhteşem Yüzyıl’ın ilk bölümü', 2011],
			['Çocuklar Duymasın başladı', 2002],
			['Avengers: Endgame', 2019],
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
		// v1.1 (33–100): her konudan kolay / orta / zor; kelimeler 4–9 harf, tersten okununca kendisi olan (KAYAK gibi) ya da
		// tersinde kaba bir parça taşıyan kelime yok (tablo kurulamaz)
		// ---- tarih
		KA('yn-kelimeavi-33', 'tarih', 1, 'İstanbul’un fethi avı', [
			['ULUBATLI', 'Surlara sancak diken yiğit … Hasan'],
			['ORBAN', 'Fatih’in dev toplarını döken usta'],
			['ÇANDARLI', 'Kuşatmaya karşı çıkan sadrazam … Halil'],
		]),
		KA('yn-kelimeavi-34', 'tarih', 2, 'Millî Mücadele’de cephe gerisi', [
			['HALİDE', 'Sultanahmet mitinginin hatibi … Edib'],
			['KARAKOL', 'İstanbul’dan silah kaçıran gizli cemiyet'],
			['ANADOLU', '1920’de kurulan haber ajansı: … Ajansı'],
		]),
		KA('yn-kelimeavi-35', 'tarih', 3, 'Osmanlı’nın kurumları', [
			['YENİÇERİ', 'Kazan kaldırarak isyan eden ocak askeri'],
			['TIMAR', 'Dirlik sisteminin en küçük birimi'],
			['DEVŞİRME', 'Sokullu Mehmed Paşa’yı yetiştiren usul'],
		]),
		KA('yn-kelimeavi-36', 'tarih', 1, 'Mustafa Kemal’in hayatı', [
			['SELANİK', 'Şemsi Efendi Mektebi’nin şehri'],
			['ZÜBEYDE', 'Atatürk’ün annesi: … Hanım'],
			['MANASTIR', 'Askerî idadiyi okuduğu şehir'],
		]),
		KA('yn-kelimeavi-37', 'tarih', 2, 'Selçuklu sultanları', [
			['TUĞRUL', 'Bağdat’a giren ilk Selçuklu hükümdarı'],
			['ALPARSLAN', 'Asıl adı Muhammed olan Selçuklu sultanı'],
			['MELİKŞAH', 'Celali takvimini yaptıran sultan'],
		]),
		KA('yn-kelimeavi-38', 'tarih', 3, 'İmparatorluklar avı', [
			['BİZANS', 'Doğu Roma’ya sonradan verilen ad'],
			['HABSBURG', 'Viyana merkezli Avusturya hanedanı'],
			['İNKA', 'Machu Picchu’yu kuran uygarlık'],
		]),
		KA('yn-kelimeavi-39', 'tarih', 2, 'Lale Devri’nin adları', [
			['DAMAT', 'Dönemin sadrazamı: … İbrahim Paşa'],
			['PATRONA', '1730 isyanının elebaşı: … Halil'],
			['SADABAD', 'Kâğıthane’deki ünlü Lale Devri kasrı'],
		]),
		KA('yn-kelimeavi-40', 'tarih', 1, 'Anadolu’nun antik izleri', [
			['TRUVA', 'Schliemann’ın kazdığı efsanevi kent'],
			['EFES', 'Artemis Tapınağı’nın antik kenti'],
			['FRİGYA', 'Kral Midas’ın krallığı'],
		]),
		KA('yn-kelimeavi-41', 'tarih', 2, 'Gündelik hayatın devrimleri', [
			['ÖLÇÜLER', 'Metre ve kilogramı getiren … Kanunu'],
			['MİLADİ', '1926’da geçilen … takvim'],
			['PAZAR', '1935’ten beri hafta tatili günü'],
		]),
		KA('yn-kelimeavi-42', 'tarih', 3, 'Osmanlı denizcileri', [
			['BARBAROS', 'Preveze’nin galibi … Hayreddin Paşa'],
			['TURGUT', 'Trablusgarp beylerbeyi olan … Reis'],
			['SEYDİ', 'Mir’atü’l-Memâlik yazarı … Ali Reis'],
		]),
		KA('yn-kelimeavi-43', 'tarih', 1, 'Çanakkale destanı', [
			['SEYİT', 'Rumeli Mecidiye Tabyası’nın onbaşısı'],
			['NUSRET', 'Boğaz’a mayın döşeyen ünlü gemi'],
			['ANZAK', 'Her 25 Nisan’da anılan kolordu'],
		]),
		KA('yn-kelimeavi-44', 'tarih', 2, 'Taşa yazılan tarih', [
			['ORHUN', 'Göktürk yazısının öbür adı: … yazısı'],
			['BİLGE', '“Ey Türk milleti, titre!” diyen … Kağan'],
			['TONYUKUK', 'Üç kağana hizmet eden Göktürk veziri'],
		]),
		// ---- coğrafya
		KA('yn-kelimeavi-45', 'cografya', 2, 'Zirveler avı', [
			['MUNZUR', 'Tunceli’nin vadisine adını veren dağlar'],
			['KAZDAĞI', 'Antik adı İda olan dağ'],
			['NEMRUT', 'Krater gölü olan Bitlis yanardağı'],
		]),
		KA('yn-kelimeavi-46', 'cografya', 2, 'Göl kıyısında', [
			['EĞİRDİR', 'Yeşilada’sıyla ünlü Isparta gölü'],
			['HAZAR', 'Batık kentiyle ünlü Elazığ gölü'],
			['KÖYCEĞİZ', 'Dalyan kanalıyla denize bağlanan göl'],
		]),
		KA('yn-kelimeavi-47', 'cografya', 2, 'Akarsular avı', [
			['FIRAT', 'Karasu ile Murat’ın birleştiği nehir'],
			['DİCLE', 'Hasankeyf’in kıyısındaki nehir'],
			['SEYHAN', 'Zamantı ile Göksu’nun birleştiği nehir'],
		]),
		KA('yn-kelimeavi-48', 'cografya', 1, 'Dünya nehirleri', [
			['AMAZON', 'Debisi en büyük nehir'],
			['TUNA', 'Dört başkentten geçen Avrupa nehri'],
			['VOLGA', 'Hazar Denizi’ne dökülen Rus nehri'],
		]),
		KA('yn-kelimeavi-49', 'cografya', 1, 'Adalar avı', [
			['GÖKÇEADA', 'Eski adı İmroz olan ada'],
			['BOZCAADA', 'Bağlarıyla ünlü Çanakkale adası'],
			['BÜYÜKADA', 'Prens Adaları’nın en büyüğü'],
		]),
		KA('yn-kelimeavi-50', 'cografya', 3, 'Afrika başkentleri', [
			['RABAT', 'Fas’ın başkenti (Kazablanka değil!)'],
			['DAKAR', 'Senegal’in Atlantik kıyısındaki başkenti'],
			['ABUJA', 'Nijerya’nın başkenti (Lagos değil!)'],
		]),
		KA('yn-kelimeavi-51', 'cografya', 3, 'Balkanlarda Osmanlı köprüleri', [
			['MOSTAR', 'Mimar Hayreddin’in ünlü köprüsünün kenti'],
			['ÜSKÜP', 'Vardar üstündeki Taş Köprü’nün kenti'],
			['VİŞEGRAD', 'Sokullu’nun Drina Köprüsü’nün kenti'],
		]),
		KA('yn-kelimeavi-52', 'cografya', 1, 'Karadeniz’in güzellikleri', [
			['AYDER', 'Rize’nin kaplıcalı yaylası'],
			['ZİGANA', 'Trabzon ile Gümüşhane arasındaki dağ'],
			['SÜMELA', 'Kayalara oyulmuş Trabzon manastırı'],
		]),
		KA('yn-kelimeavi-53', 'cografya', 2, 'Tarihî şehirler avı', [
			['AGRA', 'Tac Mahal’in şehri'],
			['GİZE', 'Büyük Piramit’in bulunduğu yer'],
			['KYOTO', 'Japonya’nın bin yıllık eski başkenti'],
		]),
		KA('yn-kelimeavi-54', 'cografya', 3, 'Çöllerin izinde', [
			['MOJAVE', 'Ölüm Vadisi’nin bulunduğu ABD çölü'],
			['KIZILKUM', 'Ceyhun ile Seyhun arasındaki çöl'],
			['RUBÜLHALİ', 'Arap Yarımadası’nın “Boş Çeyrek” çölü'],
		]),
		KA('yn-kelimeavi-55', 'cografya', 3, 'Şelaleler ve kanyonlar', [
			['DÜDEN', 'Denize dökülen Antalya şelalesi'],
			['TORTUM', 'Erzurum’un ünlü şelalesi'],
			['SAKLIKENT', 'Fethiye’deki ünlü kanyon'],
		]),
		// ---- spor
		KA('yn-kelimeavi-56', 'spor', 1, 'Formaların renkleri', [
			['LACİVERT', 'Fenerbahçe’de sarının yanındaki renk'],
			['BORDO', 'Trabzonspor’da mavinin yanındaki renk'],
			['YEŞİL', 'Bursaspor’da beyazın yanındaki renk'],
		]),
		KA('yn-kelimeavi-57', 'spor', 2, 'Kortların dili ve devleri', [
			['NADAL', 'Roland Garros’u 14 kez kazanan Rafael'],
			['VOLE', 'Top yere değmeden yapılan vuruş'],
			['WİMBLEDON', 'Çim kortlarıyla ünlü turnuva'],
		]),
		KA('yn-kelimeavi-58', 'spor', 3, 'Atletizmin efsaneleri', [
			['BOLT', 'Jamaikalı sprinter Usain …'],
			['BUBKA', 'Ukraynalı sırık efsanesi Sergey …'],
			['ZATOPEK', 'Çek uzun mesafe koşucusu Emil …'],
		]),
		KA('yn-kelimeavi-59', 'spor', 1, 'Havuzdan dalgaya', [
			['YÜZME', 'Kelebek ve kurbağalama stilli spor'],
			['SUTOPU', 'Oyuncuların bone taktığı havuz oyunu'],
			['RAFTİNG', 'Coşkun nehirde botla iniş sporu'],
		]),
		KA('yn-kelimeavi-60', 'spor', 2, 'NBA efsaneleri', [
			['JORDAN', 'Chicago Bulls’la altı şampiyonluk'],
			['KOBE', 'Lakers’ın “Kara Mamba”sı … Bryant'],
			['MAGİC', '… Johnson: “Showtime” Lakers’ın yıldızı'],
		]),
		KA('yn-kelimeavi-61', 'spor', 3, 'Futbolun efsaneleri', [
			['PELE', 'Üç Dünya Kupası kazanan tek futbolcu'],
			['CRUYFF', '“Total futbol”un Hollandalı ustası'],
			['PUSKAS', 'FIFA’nın gol ödülüne adını veren'],
		]),
		KA('yn-kelimeavi-62', 'spor', 1, 'Türk futbolunun efsaneleri', [
			['METİN', '“Taçsız Kral” … Oktay'],
			['LEFTER', 'Büyükada doğumlu Fenerbahçe efsanesi'],
			['HAKAN', '“Boğaziçi’nin Boğası” … Şükür'],
		]),
		KA('yn-kelimeavi-63', 'spor', 2, 'Altmış dört karenin dünyası', [
			['PİYON', 'Her oyuncuda sekiz tane olan taş'],
			['KASPAROV', '1985’te 22 yaşında taç giyen Garri …'],
			['KARPOV', 'Fischer çekilince tacı alan Anatoli …'],
		]),
		KA('yn-kelimeavi-64', 'spor', 2, 'Voleybol sözlüğü', [
			['MANŞET', 'Gazetede baş habere de denen hareket'],
			['LİBERO', 'Farklı renk forma giyen savunmacı'],
			['ROTASYON', 'Servis alınınca saat yönünde dönüş'],
		]),
		KA('yn-kelimeavi-65', 'spor', 3, 'Antik Yunan’dan modern oyunlara', [
			['OLİMPİA', 'Antik oyunların yapıldığı kutsal alan'],
			['COUBERTİN', 'Modern olimpiyatların kurucusu'],
			['PENTATLON', 'Beş sporu birleştiren olimpiyat yarışı'],
		]),
		KA('yn-kelimeavi-66', 'spor', 2, 'Karda ve buzda olimpiyat', [
			['SKELETON', 'Yüzüstü kızakla buz pistinden iniş'],
			['SAPPORO', 'Asya’da Kış Olimpiyatı yapan ilk kent'],
			['CHAMONİX', 'İlk Kış Olimpiyatı’nın kenti'],
		]),
		// ---- bilim
		KA('yn-kelimeavi-67', 'bilim', 2, 'Güneş’in ailesi', [
			['JÜPİTER', 'Bir günü yaklaşık 10 saat süren gezegen'],
			['VENÜS', 'Günü yılından uzun olan gezegen'],
			['NEPTÜN', 'Hesapla bulunan ilk gezegen'],
		]),
		KA('yn-kelimeavi-68', 'bilim', 2, 'Uydular avı', [
			['TİTAN', 'Satürn’ün en büyük uydusu'],
			['EUROPA', 'Zeus’un kaçırdığı prensesin adını taşır'],
			['FOBOS', 'Mars’ın iki uydusundan büyüğü'],
		]),
		KA('yn-kelimeavi-69', 'bilim', 3, 'Elementlerin sırları', [
			['POLONYUM', 'Marie Curie’nin ülkesinin adını taşır'],
			['GALYUM', 'Fransa’nın eski adından gelen element'],
			['NOBELYUM', 'Dinamitin mucidinin adını taşır'],
		]),
		KA('yn-kelimeavi-70', 'bilim', 1, 'Organlarımız', [
			['KALP', 'Günde yaklaşık 100 bin kez atar'],
			['AKCİĞER', 'Sağı üç, solu iki lobdan oluşan organ'],
			['BÖBREK', 'Fasulye biçimindeki süzgeç organ'],
		]),
		KA('yn-kelimeavi-71', 'bilim', 2, 'Hayvanlar âleminin sırları', [
			['ÇİTA', 'Pençesini tam içeri çekemeyen kedigil'],
			['BALİNA', '“Katil …” aslında bir yunus türüdür'],
			['ZÜRAFA', 'Boynunda yalnız yedi omur bulunan dev'],
		]),
		KA('yn-kelimeavi-72', 'bilim', 2, 'Bilimin kadınları', [
			['CURİE', 'Radyumu bulan Marie …'],
			['LOVELACE', 'İlk bilgisayar programını yazan Ada'],
			['FRANKLİN', 'DNA’nın ünlü fotoğrafını çeken Rosalind'],
		]),
		KA('yn-kelimeavi-73', 'bilim', 3, 'Bilimin Türk ustaları', [
			['SANCAR', 'Nobel’li kimyager Aziz …'],
			['YAŞARGİL', 'Beyin cerrahisinin dev adı Gazi …'],
			['KUŞÇU', 'Fatih’in davetiyle gelen astronom Ali …'],
		]),
		KA('yn-kelimeavi-74', 'bilim', 2, 'Hücrenin dünyası', [
			['ÇEKİRDEK', 'DNA’yı saklayan hücre bölümü'],
			['KLOROFİL', 'Fotosentezde ışığı yakalayan pigment'],
			['RİBOZOM', 'Protein üreten hücre yapısı'],
		]),
		KA('yn-kelimeavi-75', 'bilim', 2, 'Birimlerin isim babaları', [
			['WATT', 'Buhar ustasının adını taşıyan güç birimi'],
			['KELVİN', 'Suyun 273,15’te donduğu ölçek'],
			['PASKAL', 'Basınç birimi; adı Fransız bir bilgin'],
		]),
		KA('yn-kelimeavi-76', 'bilim', 3, 'Laboratuvarın dili', [
			['İZOTOP', 'Karbon-14 gibi “kardeş” atom türü'],
			['POLİMER', 'Plastiklerin dev zincirli yapısı'],
			['MOLEKÜL', 'Bir su …: iki hidrojen, bir oksijen'],
		]),
		KA('yn-kelimeavi-77', 'bilim', 1, 'Uzayın öncüleri', [
			['GAGARİN', 'Uzaya çıkan ilk insan'],
			['ARMSTRONG', 'Ay’a ayak basan ilk insan'],
			['LAİKA', 'Dünya yörüngesine çıkan ilk canlı'],
		]),
		KA('yn-kelimeavi-78', 'bilim', 1, 'İcatların babaları', [
			['EDİSON', '“Menlo Park’ın büyücüsü” denen mucit'],
			['MORSE', 'Telgraf alfabesine adını veren mucit'],
			['GUTENBERG', 'Avrupa’da matbaayı kuran Johannes …'],
		]),
		// ---- sanat ve edebiyat
		KA('yn-kelimeavi-79', 'sanat', 1, 'Romanlarımızın kahramanları', [
			['ÇALIKUŞU', 'Öğretmen Feride’nin lakabı'],
			['MEMED', 'Çukurova’nın eşkıyası İnce …'],
			['BİHTER', 'Aşk-ı Memnu’nun tutkulu kadını'],
		]),
		KA('yn-kelimeavi-80', 'sanat', 1, 'Dünya klasiklerinin yazarları', [
			['TOLSTOY', 'Anna Karenina’nın yazarı'],
			['KAFKA', 'Dönüşüm’ün yazarı'],
			['CERVANTES', 'Don Kişot’un yazarı'],
		]),
		KA('yn-kelimeavi-81', 'sanat', 3, 'Mitoloji avı', [
			['ZEUS', 'Şimşeği silah olarak kullanan tanrı'],
			['MEDUSA', 'Perseus’un başını kestiği Gorgon'],
			['TANTALOS', 'Suya ve meyveye hiç uzanamayan kral'],
		]),
		KA('yn-kelimeavi-82', 'sanat', 3, 'Rönesans’ın ustaları', [
			['LEONARDO', 'Mona Lisa’nın ressamı … da Vinci'],
			['RAFAEL', 'Atina Okulu freskinin ressamı'],
			['DONATELLO', 'Bronz Davut heykelinin ustası'],
		]),
		KA('yn-kelimeavi-83', 'sanat', 2, 'Halk edebiyatının kahramanları', [
			['BATTAL', 'Seyyid … Gazi destanının kahramanı'],
			['KORKUT', 'Oğuz boylarının bilge ozanı Dede …'],
			['KÖROĞLU', 'Bolu Beyi’ne kafa tutan halk kahramanı'],
		]),
		KA('yn-kelimeavi-84', 'sanat', 2, 'Şiirin büyük adları', [
			['NAZIM', '“Kuvâyi Milliye” destanının şairi'],
			['CAHİT', '“Otuz Beş Yaş” şairi … Sıtkı'],
			['YAHYA', '“Sessiz Gemi” şairi … Kemal'],
		]),
		KA('yn-kelimeavi-85', 'sanat', 2, 'Tasavvufun şairleri', [
			['YUNUS', '“Ete kemiğe büründüm” diyen ozan'],
			['MEVLANA', 'Mesnevi’nin yazarı'],
			['GALİP', 'Hüsn ü Aşk’ın şairi Şeyh …'],
		]),
		KA('yn-kelimeavi-86', 'sanat', 3, 'Koca Sinan’ın izinde', [
			['ŞEHZADE', 'Kanuni’nin oğlu Mehmed için yapılan cami'],
			['MAĞLOVA', 'Sinan’ın ünlü su kemeri: … Kemeri'],
			['AĞIRNAS', 'Sinan’ın doğduğu Kayseri köyü'],
		]),
		KA('yn-kelimeavi-87', 'sanat', 2, 'Sinemanın büyük yönetmenleri', [
			['HİTCHCOCK', '“Gerilimin ustası” yönetmen'],
			['CHAPLİN', 'Şarlo’nun yaratıcısı'],
			['KUBRİCK', 'Otomatik Portakal’ın yönetmeni'],
		]),
		KA('yn-kelimeavi-88', 'sanat', 1, 'Yeşilçam’ın yıldızları', [
			['TÜRKAN', '“Sultan” lakaplı yıldız … Şoray'],
			['ADİLE', '“Türk sinemasının annesi” … Naşit'],
			['MÜNİR', 'Hababam’ın Mahmut Hoca’sı … Özkul'],
		]),
		KA('yn-kelimeavi-89', 'sanat', 2, 'Roman adını bul', [
			['HUZUR', 'Tanpınar’ın Mümtaz ile Nuran romanı'],
			['YABAN', 'Yakup Kadri’nin Ahmet Celal romanı'],
			['SEFİLLER', 'Jean Valjean’ın romanı'],
		]),
		// ---- genel kültür
		KA('yn-kelimeavi-90', 'eglence', 1, 'Sofra avı', [
			['İSKENDER', 'Bursa’nın tereyağlı döner kebabı'],
			['MANTI', 'Kayseri’nin yoğurtlu hamur yemeği'],
			['LAHMACUN', 'Kıymalı ince hamur: “Türk pizzası”'],
		]),
		KA('yn-kelimeavi-91', 'eglence', 2, 'Deyimlerin eksik kelimesi', [
			['PİRE', '“… için yorgan yakmak”'],
			['DEVE', '“…yi hendekten atlatmak”'],
			['ARMUT', '“… piş, ağzıma düş”'],
		]),
		KA('yn-kelimeavi-92', 'eglence', 1, 'Çizgi kahramanlar', [
			['GARGAMEL', 'Şirinleri yakalamaya çalışan büyücü'],
			['POPEYE', 'Ispanak yiyince güçlenen denizci'],
			['ASTERİKS', 'Sihirli iksirle güçlenen Galyalı'],
		]),
		KA('yn-kelimeavi-93', 'eglence', 2, 'Takvimin sırları', [
			['ŞUBAT', '28 ya da 29 gün çeken ay'],
			['ARTIK', '366 günlük yılın adı: … yıl'],
			['ERBAİN', 'Kışın en soğuk kırk günü'],
		]),
		KA('yn-kelimeavi-94', 'eglence', 1, 'Geleneklerimiz', [
			['NEVRUZ', '21 Mart’ta kutlanan bahar bayramı'],
			['AŞURE', 'Nuh’un gemisiyle anılan tatlı'],
			['NAZARLIK', 'Kem gözden koruduğuna inanılan boncuk'],
		]),
		KA('yn-kelimeavi-95', 'eglence', 3, 'Saray mutfağı avı', [
			['MATBAH', 'Topkapı Sarayı’nın mutfaklarının adı'],
			['ŞERBET', 'Demirhindi ve gülle yapılan içecek'],
			['ÇILBIR', 'Yoğurt üstünde suda pişmiş yumurta'],
		]),
		KA('yn-kelimeavi-96', 'eglence', 2, 'Pirincin dünya hâlleri', [
			['SUŞİ', 'Sirkeli pirinçle yapılan Japon yemeği'],
			['PAELLA', 'Valensiya’nın safranlı pilavı'],
			['RİSOTTO', 'İtalyanların kıvamlı pirinç yemeği'],
		]),
		KA('yn-kelimeavi-97', 'eglence', 2, 'Sokak oyunları', [
			['BEŞTAŞ', 'Havaya atılan taşları kapma oyunu'],
			['YAKANTOP', 'İki ateş arasında kalanın vurulduğu oyun'],
			['BİRDİRBİR', 'Eğilen arkadaşın üstünden atlama oyunu'],
		]),
		KA('yn-kelimeavi-98', 'eglence', 3, 'Geleneksel seyirlik oyunlar', [
			['ZENNE', 'Ortaoyununda kadın rolüne çıkan erkek'],
			['KAVUKLU', 'Ortaoyununun baş komiği'],
			['PİŞEKAR', 'Ortaoyununu yöneten bilgiç kişi'],
		]),
		KA('yn-kelimeavi-99', 'eglence', 3, 'Para birimleri avı', [
			['RUBLE', 'Rusya’nın para birimi'],
			['RAND', 'Güney Afrika’nın para birimi'],
			['RUPİ', 'Hindistan’ın para birimi'],
		]),
		KA('yn-kelimeavi-100', 'eglence', 2, 'Kahvenin Türk hâlleri', [
			['DİBEK', 'Taş havanda dövülen eski usul kahve'],
			['MENENGİÇ', 'Gaziantep’in kahveye benzeyen içeceği'],
			['MIRRA', 'Urfa’nın acı, koyu kahvesi'],
		]),
		// v1.2 (101–150): kelimeler bankanın adam asmaca, Harf Al, anagram ve çengel cevaplarıyla çakışmaz; 4–9 harf,
		// tersten okununca kendisi olan ya da tersinde kaba parça taşıyan kelime yok
		// ---- tarih
		KA('yn-kelimeavi-101', 'tarih', 1, 'Millî Mücadele’nin halk kahramanları', [
			['ŞERİFE', 'Kastamonulu kadın kahraman … Bacı'],
			['MAKBULE', 'Gördesli kadın kahraman … Hanım'],
			['FATMA', 'Seher Erden’in bilinen adı: Kara …'],
		]),
		KA('yn-kelimeavi-102', 'tarih', 1, 'Tarihimizin simge yerleri', [
			['KOCATEPE', 'Ankara’daki ünlü caminin adı olan tepe'],
			['ÇANKAYA', 'Kızılay’ı da içine alan Ankara ilçesi'],
			['ANAFARTA', 'Eceabat’ın Büyük ve Küçük … köyleri'],
		]),
		KA('yn-kelimeavi-103', 'tarih', 2, 'Bozkırın hükümdarları', [
			['BÖGÜ', 'Maniheizmi kabul eden Uygur kağanı'],
			['ATTİLA', 'Bleda’nın kardeşi Hun hükümdarı'],
			['KUTLUK', 'Bilge Kağan’ın babası … Kağan'],
		]),
		KA('yn-kelimeavi-104', 'tarih', 2, 'Lakabıyla anılan sultanlar', [
			['FATİH', 'Bir köprüye ve ilçeye adını veren lakap'],
			['AVCI', 'Ava düşkün IV. Mehmed’in lakabı'],
			['DELİ', 'Sultan İbrahim’e yakıştırılan lakap'],
		]),
		KA('yn-kelimeavi-105', 'tarih', 2, 'Yenileşen Osmanlı avı', [
			['ISLAHAT', 'Paris barışından hemen önceki ferman'],
			['NİZAM', 'Levent Çiftliği’ndeki ordu: …-ı Cedid'],
			['SENED', 'Alemdar’ın girişimiyle: …-i İttifak'],
		]),
		KA('yn-kelimeavi-106', 'tarih', 2, 'Osmanlı’da unvanlar ve görevler', [
			['KETHÜDA', 'Sadrazamın yardımcısı: Sadaret …'],
			['KADI', 'Osmanlı’da bir kazanın başındaki yargıç'],
			['AKINCI', 'Bir yerli insansız hava aracının da adı'],
		]),
		KA('yn-kelimeavi-107', 'tarih', 3, 'Beylikler döneminden adlar', [
			['GERMİYAN', 'Şeyhî’nin yetiştiği beylik: …oğulları'],
			['MENTEŞE', 'Muğla iline eskiden adını veren beylik'],
			['KARESİ', 'Balıkesir’de bir ilçenin adı olan beylik'],
		]),
		KA('yn-kelimeavi-108', 'tarih', 3, 'Malazgirt’in ardından', [
			['SALTUK', 'Tepsi Minare’yi yaptıran …lular'],
			['MENGÜCEK', 'Erzincan ve Kemah’ı yöneten …liler'],
			['ARTUK', 'Diyarbakır ve Mardin’i yöneten …lular'],
		]),
		// ---- coğrafya
		KA('yn-kelimeavi-109', 'cografya', 1, 'İllerimizin izinde', [
			['ESKİŞEHİR', 'Porsuk Çayı’nda gondol gezilen kent'],
			['KAYSERİ', 'Talas ve Melikgazi’nin bağlı olduğu il'],
			['MERSİN', 'Kızkalesi’nin bulunduğu il'],
		]),
		KA('yn-kelimeavi-110', 'cografya', 2, 'Türkiye’nin dağları', [
			['ILGAZ', 'Kastamonu ile Çankırı arasındaki dağ'],
			['BOLKAR', 'Niğde ile Mersin arasındaki Toros kolu'],
			['ALADAĞLAR', 'Niğde’deki dağcılık cenneti sıradağlar'],
		]),
		KA('yn-kelimeavi-111', 'cografya', 2, 'Verimli ovalar avı', [
			['SURUÇ', 'Şanlıurfa’nın Suriye sınırındaki ovası'],
			['AMİK', 'Asi’nin suladığı Hatay ovası'],
			['BAFRA', 'Kızılırmak’ın deltasındaki ova'],
		]),
		KA('yn-kelimeavi-112', 'cografya', 2, 'Balkan başkentleri avı', [
			['ZAGREB', 'Hırvatistan’ın başkenti'],
			['TİRAN', 'Skanderbeg Meydanı’nın bulunduğu başkent'],
			['BELGRAD', 'Kalemegdan Kalesi’nin bulunduğu başkent'],
		]),
		KA('yn-kelimeavi-113', 'cografya', 2, 'Kıtaların büyük ırmakları', [
			['GANJ', 'Hindistan’ın kutsal sayılan nehri'],
			['ZAMBEZİ', 'Victoria Şelalesi’ni oluşturan nehir'],
			['MEKONG', 'Laos–Tayland sınırını çizen nehir'],
		]),
		KA('yn-kelimeavi-114', 'cografya', 2, 'Yarımadalar avı', [
			['DATÇA', 'Knidos antik kentinin yarımadası'],
			['KAPIDAĞ', 'Antik Kyzikos kentinin yarımadası'],
			['GELİBOLU', 'Eceabat’ın bulunduğu yarımada'],
		]),
		KA('yn-kelimeavi-115', 'cografya', 3, 'Mağaraların derinliğinde', [
			['KARAİN', 'Antalya’daki tarih öncesi mağara'],
			['KARACA', 'Gümüşhane’nin sarkıtlı mağarası'],
			['İNSUYU', 'Burdur’un içinde göl olan mağarası'],
		]),
		KA('yn-kelimeavi-116', 'cografya', 3, 'Akdeniz ve Ege kıyıları', [
			['ÖLÜDENİZ', 'Fethiye’nin ünlü lagünü'],
			['İZTUZU', 'Dalyan Çayı’nın denize kavuştuğu kumsal'],
			['PATARA', 'Kaş yakınında, uzun kumsallı antik kent'],
		]),
		// ---- spor
		KA('yn-kelimeavi-117', 'spor', 1, 'Saha kenarından sözcükler', [
			['FAUL', 'Kural dışı hareket'],
			['BLOK', 'Voleybolda filede kurulan duvar'],
			['DEFANS', 'Takımın savunma hattının adı'],
		]),
		KA('yn-kelimeavi-118', 'spor', 1, 'Sporun dili', [
			['KANAT', 'Futbolda sahanın yan koridorunda oynayan'],
			['DEPAR', 'Koşucunun startta yaptığı ani çıkış'],
			['PODYUM', 'Mankenlerin yürüdüğü yükseltilmiş alan'],
		]),
		KA('yn-kelimeavi-119', 'spor', 2, 'Kadın sporcularımız', [
			['TATAR', 'Taekwondocu Nur …'],
			['SÜRMENELİ', 'Boksta ilk altınımızı alan Busenaz …'],
			['ÇAMBEL', 'Karatepe kazılarını yöneten Halet …'],
		]),
		KA('yn-kelimeavi-120', 'spor', 2, 'Pistin efsane pilotları', [
			['SENNA', 'Monako’da altı kez kazanan Ayrton …'],
			['PROST', 'Dört kez dünya şampiyonu Fransız Alain …'],
			['CLARK', 'Lotus’la şampiyon olan İskoç Jim …'],
		]),
		KA('yn-kelimeavi-121', 'spor', 2, 'Efsane stadyumlar', [
			['MARACANA', 'Rio 2016’nın açılış töreninin stadı'],
			['WEMBLEY', '1996 Avrupa Şampiyonası finalinin stadı'],
			['AZTECA', 'Pelé’nin üçüncü kupayı aldığı stat'],
		]),
		KA('yn-kelimeavi-122', 'spor', 2, 'Potanın Türk yıldızları', [
			['OKUR', 'Yalovalı NBA pivotu Mehmet …'],
			['TÜRKCAN', 'Knicks forması giyen Mirsad …'],
			['KUTLUAY', '12 Dev Adam’ın şutörü İbrahim …'],
		]),
		KA('yn-kelimeavi-123', 'spor', 3, 'Olimpiyatın unutulmazları', [
			['SPİTZ', 'Bıyıklı efsane yüzücü Mark …'],
			['BİKİLA', 'Etiyopyalı efsane maratoncu Abebe …'],
			['LEWİS', 'Uzun atlamada dört altınlı Carl …'],
		]),
		// ---- bilim
		KA('yn-kelimeavi-124', 'bilim', 1, 'Vücudumuzun parçaları', [
			['PANKREAS', 'Hem sindirim hem hormon salgılayan bez'],
			['RETİNA', 'Çubuk ve koni hücrelerinin tabakası'],
			['TİROİT', 'Boyundaki kelebek biçimli bez'],
		]),
		KA('yn-kelimeavi-125', 'bilim', 1, 'Gökte ve çölde olaylar', [
			['SERAP', 'Çölde görülen yanıltıcı su görüntüsü'],
			['MUSON', 'Mevsime göre yön değiştiren Asya rüzgârı'],
			['TİPİ', 'Yolları kapatan rüzgârlı kar'],
		]),
		KA('yn-kelimeavi-126', 'bilim', 2, 'Biyolojinin öncüleri', [
			['LAMARCK', 'Zürafanın boynunu örnek veren kuramcı'],
			['MENDEL', 'Brno manastırında deney yapan rahip'],
			['LİNNAEUS', 'İkili adlandırmayı getiren İsveçli'],
		]),
		KA('yn-kelimeavi-127', 'bilim', 2, 'Fiziğin birimleri', [
			['COULOMB', 'Elektrik yükünün SI birimi'],
			['HERTZ', 'Saniyedeki titreşim sayısının birimi'],
			['KANDELA', 'Latincede “mum” anlamına gelen birim'],
		]),
		KA('yn-kelimeavi-128', 'bilim', 2, 'Uzayın derinlikleri', [
			['NEBULA', 'Latince “sis” anlamına gelen gök cismi'],
			['SÜPERNOVA', 'Bazen bir galaksi kadar parlayan patlama'],
			['ANDROMEDA', 'Samanyolu’yla çarpışacak komşu gökada'],
		]),
		KA('yn-kelimeavi-129', 'bilim', 2, 'Laboratuvarda bir gün', [
			['DAMITMA', 'Kaynatıp buharı yoğunlaştırarak ayırma'],
			['ÇÖKELTİ', 'Tepkimede oluşup dibe inen katı'],
			['İNDİKATÖR', 'Turnusol gibi renk değiştiren belirteç'],
		]),
		KA('yn-kelimeavi-130', 'bilim', 2, 'Matematiğin dili', [
			['TÜREV', 'Bir fonksiyonun anlık değişim hızı'],
			['İNTEGRAL', 'Eğri altındaki alanı veren işlem'],
			['MATRİS', 'Sayıların satır ve sütunla dizilişi'],
		]),
		KA('yn-kelimeavi-131', 'bilim', 3, 'Orta Çağ’ın büyük bilginleri', [
			['BATTANİ', 'Harranlı ünlü astronom el-…'],
			['HEYSEM', 'Kitab’ül-Menazır’ın yazarı İbnü’l-…'],
			['CABİR', 'Simyacı … bin Hayyan'],
		]),
		KA('yn-kelimeavi-132', 'bilim', 2, 'Salgınlar ve virüsler', [
			['VEBA', 'Yersinia pestis’in yol açtığı salgın'],
			['TİFÜS', 'Bitlerin taşıdığı salgın hastalık'],
			['KUDUZ', 'Su korkusuyla bilinen hastalık'],
		]),
		// ---- sanat ve edebiyat
		KA('yn-kelimeavi-133', 'sanat', 1, 'Aşk hikâyelerinin âşıkları', [
			['FERHAT', 'Şirin’e âşık olan nakkaş'],
			['KEREM', 'Aslı’nın peşinden yanan âşık'],
			['MECNUN', 'Leylâ’nın aşkıyla çöllere düşen'],
		]),
		KA('yn-kelimeavi-134', 'sanat', 1, 'Mitolojinin kahramanları', [
			['PANDORA', 'Hephaistos’un kilden yarattığı kadın'],
			['HERAKLES', 'Zeus ile Alkmene’nin oğlu'],
			['İKAROS', 'Daidalos’un oğlu'],
		]),
		KA('yn-kelimeavi-135', 'sanat', 2, 'Çalgılarımız avı', [
			['SANTUR', 'Tokmaklarla çalınan telli çalgı'],
			['ÇÖĞÜR', 'Bağlama ailesinden telli bir halk sazı'],
			['REBAP', 'Mevlevi musikisinin yaylı sazı'],
		]),
		KA('yn-kelimeavi-136', 'sanat', 2, 'Roman kahramanları avı', [
			['RAİF', 'Ankara’da tercümanlık yapan … Efendi'],
			['HAYRİ', 'Muvakkithane çırağı … İrdal'],
			['FELATUN', 'Rakım Efendi’nin müsrif karşıtı … Bey'],
		]),
		KA('yn-kelimeavi-137', 'sanat', 2, 'Opera sahnesinin adları', [
			['AİDA', 'Radamès’e âşık Etiyopyalı prenses'],
			['TOSCA', 'Puccini’nin şarkıcı kahramanı'],
			['RİGOLETTO', 'Verdi’nin kambur soytarı kahramanı'],
		]),
		KA('yn-kelimeavi-138', 'sanat', 2, 'Musikimizin ustaları', [
			['TANBURİ', 'Plak kayıtlarıyla ünlü … Cemil Bey'],
			['DEDE', 'Hammamizade İsmail … Efendi'],
			['MANÇO', '“Adam Olacak Çocuk”un sunucusu Barış …'],
		]),
		KA('yn-kelimeavi-139', 'sanat', 2, 'Sinemamızın yönetmenleri', [
			['AKAD', 'Hudutların Kanunu’nun yönetmeni Lütfi …'],
			['ATIF', '“Ah Belinda”nın yönetmeni … Yılmaz'],
			['TURGUL', '“Gölge Oyunu”nun yönetmeni Yavuz …'],
		]),
		KA('yn-kelimeavi-140', 'sanat', 3, 'Halk şiirinin ozanları', [
			['EMRAH', 'Erzurumlu ünlü halk şairi'],
			['SEYRANİ', 'Kayserili hicivci halk ozanı'],
			['DERTLİ', 'Geredeli ünlü saz şairi'],
		]),
		KA('yn-kelimeavi-141', 'sanat', 3, 'Mimarların imzası', [
			['HADİD', 'Haydar Aliyev Merkezi’nin mimarı Zaha …'],
			['DAVUT', 'Yeni Cami’yi başlatan mimar … Ağa'],
			['NİEMEYER', 'BM binasının tasarımına katılan Oscar …'],
		]),
		// ---- genel kültür
		KA('yn-kelimeavi-142', 'eglence', 1, 'Anadolu sofrasından', [
			['TANTUNİ', 'Mersin’in sac sıcağı dürümü'],
			['KUYMAK', 'Mıhlamanın öbür adı'],
			['TESTİ', 'Kırılan çömlekte gelen Kapadokya kebabı'],
		]),
		KA('yn-kelimeavi-143', 'eglence', 1, 'Gelenekler avı', [
			['HIDRELLEZ', 'Gül dibine dilek bağlanan bahar şenliği'],
			['HARÇLIK', 'Bayramda büyüklerin verdiği para'],
			['KİRVE', 'Sünnet çocuğunu kucağında tutan kişi'],
		]),
		KA('yn-kelimeavi-144', 'eglence', 1, 'Hayvan yavruları avı', [
			['OĞLAK', 'Keçinin yavrusu'],
			['BUZAĞI', 'İneğin yavrusu'],
			['SIPA', 'Eşeğin yavrusu'],
		]),
		KA('yn-kelimeavi-145', 'eglence', 1, 'Ekranın sevimli kahramanları', [
			['JERRY', 'Tom’un peşinden koştuğu fare'],
			['HEİDİ', 'Peter’la keçi otlatan Alp kızı'],
			['SNOOPY', 'Uçan As kılığına giren beagle'],
		]),
		KA('yn-kelimeavi-146', 'eglence', 2, 'Kahve fincanının başında', [
			['SADE', 'Şekersiz Türk kahvesi'],
			['TİRYAKİ', 'Çaya ya da kahveye düşkün kimse'],
			['KÖPÜK', 'İyi pişmiş Türk kahvesinin kaymağı'],
		]),
		KA('yn-kelimeavi-147', 'eglence', 2, 'Dünya sofraları', [
			['TACO', 'Meksika’nın katlanmış mısır ekmeği'],
			['FONDÜ', 'İsviçre’nin eritilmiş peynirli sofrası'],
			['GULAŞ', 'Macaristan’ın paprikalı et yemeği'],
		]),
		KA('yn-kelimeavi-148', 'eglence', 2, 'Kâğıt ve torba oyunları', [
			['PİŞTİ', 'Vale ile yerdeki kartları toplayan oyun'],
			['BATAK', 'Eşli ya da tekli oynanan ihaleli oyun'],
			['TOMBALA', 'Torbadan çekilen sayılarla oynanan oyun'],
		]),
		KA('yn-kelimeavi-149', 'eglence', 3, 'Eski zaman meslekleri', [
			['TULUMBACI', 'Mahallelerin gönüllü eski itfaiyecisi'],
			['ARZUHALCİ', 'Parayla dilekçe yazan kişi'],
			['SEMERCİ', 'Eşek ve katıra eyer yapan usta'],
		]),
		KA('yn-kelimeavi-150', 'eglence', 3, 'Eski İstanbul’dan adlar', [
			['PERA', 'Beyoğlu’nun eski adı'],
			['DERSAADET', '“Mutluluk kapısı” anlamlı İstanbul adı'],
			['ASİTANE', '“Eşik” anlamına gelen İstanbul adı'],
		]),
	],
};
