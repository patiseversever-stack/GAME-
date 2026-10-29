// Soru bankası (başlangıç seti). İçerik ekibi bunu 1.000 soruya genişletecek.
//
// Ortak alanlar: id, cat (categories.js), diff (1 kolay, 2 orta, 3 zor), type, q (soru metni)
//   choice : a = [doğru, yanlış, yanlış, yanlış]  (şıklar oyunda karıştırılır)
//   num    : ans (doğru sayı), unit, min, max     (tahmin: en yakın kazanır)
//   pin    : lat, lon                              (haritada işaretle: en yakın kazanır)
//   hang   : w (kelime, büyük harf)                (adam asmaca; q ipucu)
//   tf     : ans (true/false)                      (doğru mu yanlış mı)
// Her soru kesin bilinen bir bilgiye dayanır; tartışmalı ya da güncelliğini yitirebilecek bilgi yok.

export const QUESTIONS = [
	// --- çoktan seçmeli
	{ id: 'c001', cat: 'tarih', diff: 1, type: 'choice', q: 'İstanbul hangi yıl fethedildi?', a: ['1453', '1071', '1299', '1516'] },
	{ id: 'c002', cat: 'tarih', diff: 1, type: 'choice', q: 'Türkiye Cumhuriyeti hangi yıl ilan edildi?', a: ['1923', '1920', '1919', '1938'] },
	{ id: 'c003', cat: 'tarih', diff: 2, type: 'choice', q: 'Malazgirt Meydan Muharebesi hangi yıl yapıldı?', a: ['1071', '1176', '1453', '1243'] },
	{ id: 'c004', cat: 'tarih', diff: 2, type: 'choice', q: "Osmanlı Devleti'nin kurucusu kimdir?", a: ['Osman Bey', 'Orhan Bey', 'Ertuğrul Gazi', 'I. Murad'] },
	{ id: 'c005', cat: 'tarih', diff: 2, type: 'choice', q: 'Çanakkale Kara ve Deniz Savaşları hangi yıl başladı?', a: ['1915', '1912', '1918', '1922'] },
	{ id: 'c007', cat: 'cografya', diff: 1, type: 'choice', q: 'Peri bacalarıyla ünlü Göreme hangi ildedir?', a: ['Nevşehir', 'Kayseri', 'Aksaray', 'Niğde'] },
	{ id: 'c008', cat: 'cografya', diff: 1, type: 'choice', q: 'Pamukkale travertenleri hangi ildedir?', a: ['Denizli', 'Aydın', 'Muğla', 'Uşak'] },
	{ id: 'c009', cat: 'cografya', diff: 2, type: 'choice', q: "Nemrut Dağı'ndaki dev heykeller hangi ildedir?", a: ['Adıyaman', 'Malatya', 'Şanlıurfa', 'Diyarbakır'] },
	{ id: 'c010', cat: 'cografya', diff: 2, type: 'choice', q: 'Sümela Manastırı hangi ildedir?', a: ['Trabzon', 'Rize', 'Giresun', 'Gümüşhane'] },
	{ id: 'c011', cat: 'cografya', diff: 1, type: 'choice', q: "Türkiye'nin en büyük gölü hangisidir?", a: ['Van Gölü', 'Tuz Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü'] },
	{ id: 'c012', cat: 'cografya', diff: 1, type: 'choice', q: "Türkiye'nin en yüksek dağı hangisidir?", a: ['Ağrı Dağı', 'Erciyes Dağı', 'Uludağ', 'Kaçkar Dağı'] },
	{ id: 'c013', cat: 'cografya', diff: 2, type: 'choice', q: 'Tamamı Türkiye sınırları içinde kalan en uzun nehir hangisidir?', a: ['Kızılırmak', 'Fırat', 'Sakarya', 'Yeşilırmak'] },
	{ id: 'c014', cat: 'sanat', diff: 1, type: 'choice', q: "İstiklal Marşı'nın şairi kimdir?", a: ['Mehmet Akif Ersoy', 'Namık Kemal', 'Nazım Hikmet', 'Yahya Kemal Beyatlı'] },
	{ id: 'c015', cat: 'sanat', diff: 2, type: 'choice', q: "Nobel Edebiyat Ödülü'nü kazanan Türk yazar kimdir?", a: ['Orhan Pamuk', 'Yaşar Kemal', 'Sabahattin Ali', 'Orhan Kemal'] },
	{ id: 'c016', cat: 'bilim', diff: 2, type: 'choice', q: "2015 Nobel Kimya Ödülü'nü kazanan Türk bilim insanı kimdir?", a: ['Aziz Sancar', 'Cahit Arf', 'Gazi Yaşargil', 'Oktay Sinanoğlu'] },
	{ id: 'c020', cat: 'spor', diff: 1, type: 'choice', q: 'Futbolda bir takım maça sahada kaç oyuncuyla başlar?', a: ['11', '10', '9', '12'] },
	{ id: 'c021', cat: 'spor', diff: 1, type: 'choice', q: 'Basketbolda üç sayı çizgisinin dışından atılan basket kaç sayıdır?', a: ['3', '2', '4', '1'] },
	{ id: 'c022', cat: 'spor', diff: 2, type: 'choice', q: "Türkiye A Milli Futbol Takımı 2002 Dünya Kupası'nı kaçıncı sırada bitirdi?", a: ['Üçüncü', 'İkinci', 'Dördüncü', 'Beşinci'] },
	{ id: 'c023', cat: 'spor', diff: 2, type: 'choice', q: "Galatasaray UEFA Kupası'nı hangi yıl kazandı?", a: ['2000', '1999', '2001', '2002'] },
	{ id: 'c024', cat: 'sanat', diff: 1, type: 'choice', q: 'Mona Lisa tablosunun ressamı kimdir?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raffaello', 'Van Gogh'] },
	{ id: 'c025', cat: 'sanat', diff: 2, type: 'choice', q: "Mimar Sinan'ın 'ustalık eserim' dediği cami hangisidir?", a: ['Selimiye Camii', 'Süleymaniye Camii', 'Şehzade Camii', 'Sultanahmet Camii'] },
	{ id: 'c026', cat: 'eglence', diff: 1, type: 'choice', q: 'Satrançta oyunun başında her oyuncunun kaç piyonu vardır?', a: ['8', '6', '10', '16'] },
	{ id: 'c027', cat: 'eglence', diff: 1, type: 'choice', q: 'Türk kahvesi geleneksel olarak hangi kapta pişirilir?', a: ['Cezve', 'Demlik', 'Semaver', 'Güğüm'] },
	{ id: 'c028', cat: 'eglence', diff: 2, type: 'choice', q: 'Türk lirası simgesi (₺) hangi yıl kullanılmaya başlandı?', a: ['2012', '2005', '2009', '2016'] },
	{ id: 'c030', cat: 'cografya', diff: 2, type: 'choice', q: 'Efes Antik Kenti hangi ildedir?', a: ['İzmir', 'Aydın', 'Manisa', 'Muğla'] },

	// --- tahmin (sayı)
	{ id: 'n001', cat: 'tarih', diff: 1, type: 'num', q: "İstanbul'un fethi hangi yılda gerçekleşti?", ans: 1453, unit: '', min: 1000, max: 1700 },
	{ id: 'n002', cat: 'cografya', diff: 2, type: 'num', q: "Ağrı Dağı'nın yüksekliği kaç metredir?", ans: 5137, unit: 'm', min: 2000, max: 8000 },
	{ id: 'n003', cat: 'cografya', diff: 1, type: 'num', q: "Türkiye'de kaç il vardır?", ans: 81, unit: 'il', min: 40, max: 120 },
	{ id: 'n004', cat: 'bilim', diff: 1, type: 'num', q: "Ay'a ilk insanlı iniş hangi yıl yapıldı?", ans: 1969, unit: '', min: 1900, max: 2020 },
	{ id: 'n006', cat: 'bilim', diff: 2, type: 'num', q: "Everest Dağı'nın yüksekliği yaklaşık kaç metredir?", ans: 8849, unit: 'm', min: 4000, max: 12000 },
	{ id: 'n007', cat: 'tarih', diff: 2, type: 'num', q: 'Boğaziçi Köprüsü (15 Temmuz Şehitler Köprüsü) hangi yıl açıldı?', ans: 1973, unit: '', min: 1900, max: 2020 },
	{ id: 'n008', cat: 'tarih', diff: 2, type: 'num', q: 'Malazgirt Zaferi hangi yılda kazanıldı?', ans: 1071, unit: '', min: 600, max: 1600 },
	{ id: 'n009', cat: 'bilim', diff: 1, type: 'num', q: 'Saf su deniz seviyesinde kaç °C sıcaklıkta kaynar?', ans: 100, unit: '°C', min: 0, max: 300 },
	{ id: 'n011', cat: 'sanat', diff: 3, type: 'num', q: 'Süleymaniye Camii hangi yıl tamamlandı?', ans: 1557, unit: '', min: 1400, max: 1700 },
	{ id: 'n012', cat: 'spor', diff: 1, type: 'num', q: 'Bir futbol maçının normal süresi kaç dakikadır?', ans: 90, unit: 'dk', min: 30, max: 180 },

	// --- haritada işaretle
	{ id: 'p001', cat: 'cografya', diff: 1, type: 'pin', q: 'Pamukkale travertenleri nerede? Haritada işaretle.', lat: 37.92, lon: 29.12 },
	{ id: 'p002', cat: 'cografya', diff: 2, type: 'pin', q: "Nemrut Dağı'nı haritada işaretle.", lat: 37.98, lon: 38.74 },
	{ id: 'p003', cat: 'cografya', diff: 2, type: 'pin', q: 'Sümela Manastırı nerede?', lat: 40.69, lon: 39.66 },
	{ id: 'p004', cat: 'tarih', diff: 2, type: 'pin', q: "Efes Antik Kenti'ni haritada işaretle.", lat: 37.94, lon: 27.34 },
	{ id: 'p005', cat: 'cografya', diff: 1, type: 'pin', q: 'Ağrı Dağı nerede?', lat: 39.7, lon: 44.3 },
	{ id: 'p006', cat: 'cografya', diff: 1, type: 'pin', q: 'Peri bacalarıyla ünlü Göreme nerede?', lat: 38.64, lon: 34.83 },
	{ id: 'p007', cat: 'tarih', diff: 2, type: 'pin', q: "Göbeklitepe'yi haritada işaretle.", lat: 37.22, lon: 38.92 },
	{ id: 'p008', cat: 'cografya', diff: 2, type: 'pin', q: 'Uzungöl nerede?', lat: 40.62, lon: 40.29 },
	{ id: 'p009', cat: 'cografya', diff: 2, type: 'pin', q: 'Ölüdeniz nerede?', lat: 36.55, lon: 29.12 },
	{ id: 'p010', cat: 'tarih', diff: 2, type: 'pin', q: "Safranbolu'yu haritada işaretle.", lat: 41.25, lon: 32.69 },
	{ id: 'p011', cat: 'tarih', diff: 3, type: 'pin', q: 'Truva Antik Kenti nerede?', lat: 39.957, lon: 26.239 },
	{ id: 'p012', cat: 'tarih', diff: 3, type: 'pin', q: 'Ani Harabeleri nerede?', lat: 40.51, lon: 43.57 },

	// --- adam asmaca
	{ id: 'h001', cat: 'cografya', diff: 1, type: 'hang', q: "Kapadokya'nın simgesi olan doğal kaya oluşumları", w: 'PERİBACASI' },
	{ id: 'h002', cat: 'cografya', diff: 1, type: 'hang', q: "Mevlana'nın türbesinin bulunduğu şehir", w: 'KONYA' },
	{ id: 'h003', cat: 'eglence', diff: 1, type: 'hang', q: 'Türk kahvesinin pişirildiği kap', w: 'CEZVE' },
	{ id: 'h005', cat: 'sanat', diff: 2, type: 'hang', q: "Mimar Sinan'ın Edirne'deki ustalık eseri cami", w: 'SELİMİYE' },
	{ id: 'h006', cat: 'bilim', diff: 1, type: 'hang', q: "Güneş'e en yakın gezegen", w: 'MERKÜR' },
	{ id: 'h007', cat: 'sanat', diff: 2, type: 'hang', q: "İstiklal Marşı'nın şairinin soyadı", w: 'ERSOY' },
	{ id: 'h008', cat: 'spor', diff: 1, type: 'hang', q: 'Futbolda kaleyi koruyan oyuncu', w: 'KALECİ' },

	// --- doğru mu yanlış mı
	{ id: 't001', cat: 'cografya', diff: 1, type: 'tf', q: "Ankara, Türkiye'nin en kalabalık şehridir.", ans: false },
	{ id: 't006', cat: 'cografya', diff: 2, type: 'tf', q: 'Van Gölü bir tatlı su gölüdür.', ans: false },
];
