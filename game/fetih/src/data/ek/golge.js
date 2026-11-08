// GÖLGE OYUNU: Kazı Kazan’ın 99 yapı görseliyle (dist/yapi/<no>.webp) perdeye düşen siluet. Plakanın adı, yeri ve
// bilgi satırı ek/kazi.js’teki YAPILAR’dan gelir; burada yalnız gölge sorusu: şıklar, yapının türü, kıta.
//
// Alanlar: no (görsel), diff, a [doğru, y1, y2, y3], tur (2. ipucu: yapının türü), kita (yurt dışı: 1. ipucu;
//          Türkiye’de 1. ipucu ilin bölgesi turkiye.json’dan), ip1 (isteğe bağlı: 1. ipucunu elle yazar).
// Kurallar (test/deneme-icat.test.mjs denetler):
//  - Gölgede doğru yapıyla karışabilecek bir şekil hiç şık olmaz: aynı sayıda minareli büyük kubbeli cami (Ayasofya,
//    Süleymaniye, Selimiye), iki kulesi asma köprü (Tower Bridge, Golden Gate), kayaya yaslı yapı (Sümela, Meteora,
//    Uçhisar), tepe üstü saray (Elhamra, Potala), aynı boyda saat kulesi (Big Ben, Spasskaya), kubbeli uzun bina
//    (Capitol, Aziz Petrus), yelken kabuk (Sidney, Lotus), taş çember (Stonehenge, Göbeklitepe), kayadaki baş
//    (Nemrut, Moai, Rushmore), kale ile kale yan yana konmaz.
//  - Dört şıkkın baş harfleri (ı/i, ş/s gibi işaretler yok sayılınca da) farklı: 3. ipucu (ilk harf) cevabı ayırır.
//  - Zorluk: 1 gölgesi herkesin tanıdığı (Eyfel, Pisa), 2 biraz kültür, 3 gölgesi az bilinen (Amasya, Bagan).

const G = (no, diff, a, tur, extra = {}) => ({ no, diff, a, tur, ...extra });
const AV = { kita: 'Avrupa' };
const AS = { kita: 'Asya' };
const AF = { kita: 'Afrika' };
const KA = { kita: 'Kuzey Amerika' };
const GA = { kita: 'Güney Amerika' };
const OK = { kita: 'Okyanusya' };

export const GOLGELER = [
	// ---------------------------------------------------------------- Türkiye
	G(1, 1, ['Anıtkabir', 'Çanakkale Şehitler Abidesi', 'Galata Kulesi', 'Rumeli Hisarı'], 'Anıt mezar'),
	// Kızıl Kule’nin tepesi düz mazgallı, Galata’nınki konik külah
	G(2, 1, ['Galata Kulesi', 'Kızıl Kule', 'İzmir Saat Kulesi', 'Rumeli Hisarı'], 'Kule'),
	// minare sayısı ayırır: Ayasofya 4, Sultanahmet 6
	G(3, 1, ['Ayasofya', 'Sultanahmet Camii', 'Dolmabahçe Sarayı', 'Kız Kulesi'], 'Cami'),
	G(4, 2, ['Sultanahmet Camii', 'Ayasofya', 'Bursa Ulu Camii', 'Ortaköy Camii'], 'Cami'),
	G(6, 2, ['Dolmabahçe Sarayı', 'Ayasofya', 'Galata Kulesi', 'Rumeli Hisarı'], 'Saray'),
	// dört minareli büyük cami: şıklarda başka dört minareli cami yok (Ortaköy ve Bursa Ulu iki minareli)
	G(7, 2, ['Süleymaniye Camii', 'Ortaköy Camii', 'Bursa Ulu Camii', 'Galata Kulesi'], 'Cami'),
	G(8, 2, ['Selimiye Camii', 'Çifte Minareli Medrese', 'Bursa Ulu Camii', 'Kızıl Kule'], 'Cami'),
	G(9, 2, ['Nemrut Dağı', 'Göbeklitepe', 'Truva Atı', 'Pamukkale'], 'Ören yeri'),
	G(10, 2, ['Sümela Manastırı', 'Akdamar Kilisesi', 'Galata Kulesi', 'İshak Paşa Sarayı'], 'Manastır'),
	G(11, 2, ['İshak Paşa Sarayı', 'Dolmabahçe Sarayı', 'Sümela Manastırı', 'Galata Kulesi'], 'Saray'),
	G(12, 2, ['Celsus Kütüphanesi', 'Aspendos Tiyatrosu', 'Nemrut Dağı', 'Bodrum Kalesi'], 'Kütüphane'),
	G(13, 2, ['Aspendos Tiyatrosu', 'Celsus Kütüphanesi', 'Truva Atı', 'Kızıl Kule'], 'Antik tiyatro'),
	G(14, 2, ['Kızıl Kule', 'Galata Kulesi', 'İzmir Saat Kulesi', 'Bodrum Kalesi'], 'Kule'),
	G(15, 1, ['Truva Atı', 'Nemrut Dağı', 'Çanakkale Şehitler Abidesi', 'Aspendos Tiyatrosu'], 'Anıt'),
	G(16, 1, ['Çanakkale Şehitler Abidesi', 'Anıtkabir', 'Galata Kulesi', 'Truva Atı'], 'Anıt'),
	G(17, 2, ['Göbeklitepe', 'Nemrut Dağı', 'Aspendos Tiyatrosu', 'Harran Evleri'], 'Ören yeri'),
	G(18, 3, ['Hattuşa', 'Göbeklitepe', 'Truva Atı', 'Celsus Kütüphanesi'], 'Ören yeri'),
	G(19, 1, ['Peribacaları', 'Nemrut Dağı', 'Göbeklitepe', 'Kızıl Kule'], 'Doğal oluşum'),
	G(20, 1, ['Pamukkale', 'Nemrut Dağı', 'Kız Kalesi', 'Galata Kulesi'], 'Doğal oluşum'),
	G(21, 3, ['Ani Katedrali', 'Sümela Manastırı', 'Kızıl Kule', 'Divriği Ulu Camii'], 'Katedral'),
	G(22, 2, ['Akdamar Kilisesi', 'Sümela Manastırı', 'Kızıl Kule', 'Galata Kulesi'], 'Kilise'),
	G(23, 3, ['Divriği Ulu Camii', 'Çifte Minareli Medrese', 'Kızıl Kule', 'Truva Atı'], 'Cami'),
	G(24, 2, ['Mevlana Müzesi', 'Ortaköy Camii', 'Sultanahmet Camii', 'Galata Kulesi'], 'Türbe'),
	G(25, 2, ['Rumeli Hisarı', 'Galata Kulesi', 'Ortaköy Camii', 'Anıtkabir'], 'Hisar'),
	G(26, 2, ['Kız Kalesi', 'Galata Kulesi', 'Pamukkale', 'Truva Atı'], 'Kale'),
	G(27, 2, ['Bursa Ulu Camii', 'Sultanahmet Camii', 'Galata Kulesi', 'Anıtkabir'], 'Cami'),
	G(28, 1, ['İzmir Saat Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Truva Atı'], 'Saat kulesi'),
	G(29, 2, ['Safranbolu Evleri', 'Harran Evleri', 'Galata Kulesi', 'Ortaköy Camii'], 'Konak'),
	G(30, 3, ['Kasımiye Medresesi', 'Galata Kulesi', 'Truva Atı', 'Çanakkale Şehitler Abidesi'], 'Medrese'),
	G(31, 2, ['On Gözlü Köprü', 'Rumeli Hisarı', 'Galata Kulesi', 'Truva Atı'], 'Köprü'),
	G(32, 2, ['Çifte Minareli Medrese', 'Sultanahmet Camii', 'Galata Kulesi', 'Anıtkabir'], 'Medrese'),
	G(33, 3, ['Amasya Kral Kaya Mezarları', 'Nemrut Dağı', 'Galata Kulesi', 'Truva Atı'], 'Kaya mezarı'),
	G(34, 2, ['Bodrum Kalesi', 'Galata Kulesi', 'Pamukkale', 'Ayasofya'], 'Kale'),
	G(35, 2, ['Uçhisar Kalesi', 'Galata Kulesi', 'Ayasofya', 'Truva Atı'], 'Kaya kale'),
	G(36, 2, ['Ankara Kalesi', 'Galata Kulesi', 'Ortaköy Camii', 'Truva Atı'], 'Kale'),
	G(37, 2, ['Ortaköy Camii', 'Sultanahmet Camii', 'Galata Kulesi', 'Anıtkabir'], 'Cami'),
	G(38, 3, ['Myra Kaya Mezarları', 'Galata Kulesi', 'Ayasofya', 'Truva Atı'], 'Kaya mezarı'),
	G(39, 1, ['Harran Evleri', 'Safranbolu Evleri', 'Galata Kulesi', 'Ayasofya'], 'Kümbet ev'),
	G(40, 3, ['Babüsselam', 'Ayasofya', 'Kızıl Kule', 'Truva Atı'], 'Saray kapısı'),

	// ---------------------------------------------------------------- yurt dışı
	// Tokyo Kulesi bilerek yok: gölgesi Eyfel’in neredeyse aynısı
	G(41, 1, ['Eyfel Kulesi', 'Big Ben', 'CN Kulesi', 'Pisa Kulesi'], 'Kule', AV),
	G(42, 1, ['Kolezyum', 'Partenon', 'Stonehenge', 'Brandenburg Kapısı'], 'Amfitiyatro', AV),
	G(43, 1, ['Pisa Kulesi', 'Galata Kulesi', 'Big Ben', 'Eyfel Kulesi'], 'Çan kulesi', AV),
	G(44, 1, ['Big Ben', 'Galata Kulesi', 'Pisa Kulesi', 'Eyfel Kulesi'], 'Saat kulesi', AV),
	G(45, 2, ['Tower Bridge', 'Galata Köprüsü', 'Brandenburg Kapısı', 'Kolezyum'], 'Köprü', AV),
	G(46, 1, ['Özgürlük Heykeli', 'Kurtarıcı İsa Heykeli', 'Moai Heykelleri', 'Big Ben'], 'Heykel', KA),
	G(47, 2, ['Empire State Binası', 'Burj Halife', 'Petronas Kuleleri', 'CN Kulesi'], 'Gökdelen', KA),
	G(48, 1, ['Golden Gate Köprüsü', 'On Gözlü Köprü', 'Eyfel Kulesi', 'Brandenburg Kapısı'], 'Köprü', KA),
	G(49, 1, ['Tac Mahal', 'Kremlin', 'Big Ben', 'Lotus Tapınağı'], 'Türbe', AS),
	G(50, 2, ['Çin Seddi', 'Petra', 'Stonehenge', 'Neuschwanstein Şatosu'], 'Sur', AS),
	G(51, 1, ['Gize Piramitleri', 'Chichén Itzá', 'Ebu Simbel', 'Tac Mahal'], 'Piramit', AF),
	G(52, 3, ['Petra', 'Kolezyum', 'Machu Picchu', 'Stonehenge'], 'Kaya kent', AS),
	G(53, 2, ['Machu Picchu', 'Kolezyum', 'Stonehenge', 'Eyfel Kulesi'], 'Antik kent', GA),
	// Lizbon’daki Cristo Rei bilerek yok (kolları açık, aynı gölge)
	G(54, 1, ['Kurtarıcı İsa Heykeli', 'Özgürlük Heykeli', 'Moai Heykelleri', 'Big Ben'], 'Heykel', GA),
	G(55, 1, ['Sidney Opera Binası', 'Burj Al Arab', 'Kolezyum', 'Atomium'], 'Opera binası', OK),
	G(56, 2, ['Sagrada Família', 'Notre-Dame Katedrali', 'Big Ben', 'Eyfel Kulesi'], 'Bazilika', AV),
	G(57, 1, ['Partenon', 'Kolezyum', 'Stonehenge', 'Eyfel Kulesi'], 'Tapınak', AV),
	G(58, 2, ['Notre-Dame Katedrali', 'Sagrada Família', 'Big Ben', 'Kolezyum'], 'Katedral', AV),
	G(59, 1, ['Aziz Vasil Katedrali', 'Kolezyum', 'Big Ben', 'Eyfel Kulesi'], 'Katedral', AV),
	G(60, 1, ['Burj Halife', 'Empire State Binası', 'CN Kulesi', 'Pisa Kulesi'], 'Gökdelen', AS),
	G(61, 2, ['Stonehenge', 'Kolezyum', 'Moai Heykelleri', 'Partenon'], 'Taş çember', AV),
	G(62, 2, ['Angkor Wat', 'Borobudur', 'Kolezyum', 'Tac Mahal'], 'Tapınak', AS),
	G(63, 2, ['Chichén Itzá', 'Gize Piramitleri', 'Kolezyum', 'Partenon'], 'Piramit', KA),
	G(64, 2, ['Neuschwanstein Şatosu', 'Rumeli Hisarı', 'Himeji Kalesi', 'Kolezyum'], 'Şato', AV),
	G(65, 2, ['Brandenburg Kapısı', 'Zafer Takı', 'Kolezyum', 'Eyfel Kulesi'], 'Anıt kapı', AV),
	G(66, 1, ['Zafer Takı', 'Brandenburg Kapısı', 'Kolezyum', 'Eyfel Kulesi'], 'Anıt', AV),
	G(67, 2, ['Louvre Piramidi', 'Gize Piramitleri', 'Chichén Itzá', 'Eyfel Kulesi'], 'Müze girişi', AV),
	G(68, 3, ['Elhamra Sarayı', 'Neuschwanstein Şatosu', 'Kolezyum', 'Big Ben'], 'Saray', AV),
	// Paskalya Adası: siyasette Şili’nin, coğrafyada Polinezya’nın; kıta yerine okyanus
	G(69, 2, ['Moai Heykelleri', 'Stonehenge', 'Partenon', 'Kurtarıcı İsa Heykeli'], 'Heykel', { ip1: 'Pasifik’te bir ada' }),
	G(70, 1, ['Petronas Kuleleri', 'Burj Halife', 'Empire State Binası', 'CN Kulesi'], 'Gökdelen', AS),
	G(71, 2, ['Beyaz Saray', 'ABD Kongre Binası', 'Kolezyum', 'Eyfel Kulesi'], 'Saray', KA),
	G(72, 2, ['ABD Kongre Binası', 'Beyaz Saray', 'Kolezyum', 'Eyfel Kulesi'], 'Meclis binası', KA),
	G(73, 1, ['Kâbe', 'Galata Kulesi', 'Mescid-i Nebevi', 'Eyfel Kulesi'], 'Kutsal yapı', AS),
	G(74, 2, ['Kubbetüs Sahra', 'Tac Mahal', 'Big Ben', 'Eyfel Kulesi'], 'Kubbeli yapı', AS),
	G(75, 2, ['Mescid-i Nebevi', 'Kubbetüs Sahra', 'Big Ben', 'Eyfel Kulesi'], 'Cami', AS),
	G(76, 2, ['Şeyh Zayed Camii', 'Petronas Kuleleri', 'Kolezyum', 'Big Ben'], 'Cami', AS),
	G(77, 1, ['Atomium', 'Eyfel Kulesi', 'Space Needle', 'Burj Al Arab'], 'Anıt', AV),
	G(78, 2, ['CN Kulesi', 'Space Needle', 'Eyfel Kulesi', 'Burj Halife'], 'Kule', KA),
	G(79, 2, ['Space Needle', 'CN Kulesi', 'Eyfel Kulesi', 'Atomium'], 'Kule', KA),
	G(80, 2, ['Himeji Kalesi', 'Neuschwanstein Şatosu', 'Kolezyum', 'Eyfel Kulesi'], 'Kale', AS),
	G(81, 2, ['Fuji ve Chureito Pagodası', 'Himeji Kalesi', 'Potala Sarayı', 'Big Ben'], 'Pagoda', AS),
	G(82, 2, ['Yasak Şehir', 'Himeji Kalesi', 'Kolezyum', 'Partenon'], 'Saray', AS),
	G(83, 3, ['Potala Sarayı', 'Atomium', 'Stonehenge', 'Notre-Dame Katedrali'], 'Saray', AS),
	G(84, 3, ['Bagan Tapınakları', 'Kolezyum', 'Eyfel Kulesi', 'Partenon'], 'Tapınak', AS),
	G(85, 3, ['Borobudur', 'Gize Piramitleri', 'Kolezyum', 'Eyfel Kulesi'], 'Tapınak', AS),
	G(86, 2, ['Ebu Simbel', 'Gize Piramitleri', 'Kolezyum', 'Partenon'], 'Tapınak', AF),
	G(87, 2, ['Kartaca', 'Eyfel Kulesi', 'Big Ben', 'Atomium'], 'Antik kent', AF),
	G(88, 3, ['II. Hasan Camii', 'Eyfel Kulesi', 'Kolezyum', 'Atomium'], 'Cami', AF),
	G(89, 1, ['Rushmore Dağı', 'Moai Heykelleri', 'Kolezyum', 'Eyfel Kulesi'], 'Anıt', KA),
	G(90, 2, ['Milano Katedrali', 'Notre-Dame Katedrali', 'Kolezyum', 'Eyfel Kulesi'], 'Katedral', AV),
	G(91, 2, ['Aziz Petrus Bazilikası', 'Kolezyum', 'Eyfel Kulesi', 'Big Ben'], 'Bazilika', AV),
	G(92, 3, ['Westminster Abbey', 'Kolezyum', 'Eyfel Kulesi', 'Big Ben'], 'Kilise', AV),
	G(93, 2, ['Buckingham Sarayı', 'Eyfel Kulesi', 'Kolezyum', 'Pisa Kulesi'], 'Saray', AV),
	G(94, 2, ['Spasskaya Kulesi', 'Pisa Kulesi', 'Eyfel Kulesi', 'Atomium'], 'Kule', AV),
	G(95, 2, ['Meteora', 'Eyfel Kulesi', 'Kolezyum', 'Atomium'], 'Manastır', AV),
	G(96, 2, ['Mont-Saint-Michel', 'Pisa Kulesi', 'Kolezyum', 'Eyfel Kulesi'], 'Manastır', AV),
	G(97, 1, ['Yel Değirmeni', 'Eyfel Kulesi', 'Big Ben', 'Atomium'], 'Değirmen', AV),
	G(98, 1, ['Burj Al Arab', 'Sidney Opera Binası', 'Eyfel Kulesi', 'Petronas Kuleleri'], 'Otel', AS),
	G(99, 1, ['Marina Bay Sands', 'Petronas Kuleleri', 'Eyfel Kulesi', 'Kolezyum'], 'Otel', AS),
	G(100, 2, ['Lotus Tapınağı', 'Eyfel Kulesi', 'Kolezyum', 'Big Ben'], 'Tapınak', AS),
];
