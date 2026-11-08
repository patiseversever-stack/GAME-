// KAZI KAZAN: 100 yapı görseli, 100 soru. Görsel: dist/yapi/<no>.webp (tools/yapi/hazirla.py: beyaz zemin saydam, kırpık).
// 01–40 Türkiye, 41–100 yurt dışı. Görseller kullanıcının ürettirdiği resimler; her soru resmin konusu üzerine.
//
// Alanlar: no (görsel numarası), cat, diff, q (soru), a [doğru, y1, y2, y3], ad (plakadaki yapı adı),
//          il (Türkiye: plaka; plakada il adı ve numarası) ya da yer (yurt dışı: "şehir · ülke"), alt (plakanın ikinci satırı).
// Kurallar:
//  - Yanlış şıklar akla gelen ama resimle karışmayan seçenekler. Resimde ayırt edilemeyecek bir benzer (örneğin Lizbon’un
//    kırmızı asma köprüsü, Osaka Kalesi, Ortahisar, Beypazarı evleri) bilerek şık yapılmadı: hiçbir soru iki cevaba açık değil.
//  - Bilgiler kesin olanlar (yapım yılı, mimar, yer). Tartışmalı, değişebilecek ya da emin olunmayan bilgi plakaya yazılmadı.
//  - Zorluk: 1 herkesin tanıdığı, 2 biraz kültür ister, 3 uzmanı ayırır. Folyo zorluğu söyler: gümüş 1, altın 2, hologram 3.
//  - Kimlikler: yn-kazi-1 Truva Atı, -2 Kız Kulesi, -3 Nemrut (eski üç örnek); gerisi görsel sırasıyla -4’ten.

const Y = 'Folyonun altında hangi yapı var?';
const IL = 'Bu yapı hangi ilimizde?';
const SEHIR = 'Bu yapı hangi şehirde?';
const ULKE = 'Bu yapı hangi ülkede?';

// T: Türkiye (il plakası), D: yurt dışı (yer)
const T = (no, cat, diff, q, a, ad, il, alt) => ({ no, cat, diff, q, a, ad, il, alt });
const D = (no, cat, diff, q, a, ad, yer, alt) => ({ no, cat, diff, q, a, ad, yer, alt });

export const YAPILAR = [
	// ---------------------------------------------------------------- Türkiye
	T(1, 'tarih', 1, Y, ['Anıtkabir', 'TBMM Binası', 'Etnografya Müzesi', 'Çanakkale Şehitler Abidesi'], 'Anıtkabir', 6, 'Atatürk’ün anıt mezarı · 1953'),
	T(2, 'cografya', 1, Y, ['Galata Kulesi', 'Beyazıt Kulesi', 'Kız Kulesi', 'İzmir Saat Kulesi'], 'Galata Kulesi', 34, 'Cenevizliler 1348’de yaptı'),
	T(3, 'tarih', 1, Y, ['Ayasofya', 'Sultanahmet Camii', 'Süleymaniye Camii', 'Yeni Cami'], 'Ayasofya', 34, '537’de tamamlandı · Justinianus'),
	// resimde altı minare: dört minareli Süleymaniye ve Selimiye’den ayrılır
	T(4, 'sanat', 2, Y, ['Sultanahmet Camii', 'Süleymaniye Camii', 'Selimiye Camii', 'Yeni Cami'], 'Sultanahmet Camii', 34, 'Altı minaresiyle ünlü · 1617'),
	T(5, 'cografya', 1, 'Mehtapta parlayan bu yapı hangisi?', ['Kız Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Kız Kalesi'], 'Kız Kulesi', 34, 'Üsküdar açıklarında, Boğaz’da'),
	T(6, 'tarih', 2, Y, ['Dolmabahçe Sarayı', 'Topkapı Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı'], 'Dolmabahçe Sarayı', 34, 'Atatürk 1938’de burada vefat etti'),
	// dört minare: iki minareli Yeni Cami ve Fatih, altı minareli Sultanahmet ayrılır
	T(7, 'sanat', 2, Y, ['Süleymaniye Camii', 'Sultanahmet Camii', 'Yeni Cami', 'Fatih Camii'], 'Süleymaniye Camii', 34, 'Mimar Sinan · 1557'),
	// İstanbul bilerek yok (resim Süleymaniye’yle karışmasın)
	T(8, 'cografya', 2, 'Bu cami hangi ilimizde?', ['Edirne', 'Bursa', 'Konya', 'Kayseri'], 'Selimiye Camii', 22, 'Mimar Sinan’ın “ustalık eserim” dediği cami'),
	T(9, 'tarih', 3, 'Gün batımındaki ören yeri hangisi?', ['Nemrut Dağı', 'Göbeklitepe', 'Zeugma', 'Hattuşa'], 'Nemrut Dağı', 2, 'Kommagene Krallığı’nın dev heykelleri'),
	T(10, 'cografya', 2, 'Bu manastır hangi ilimizde?', ['Trabzon', 'Rize', 'Artvin', 'Giresun'], 'Sümela Manastırı', 61, 'Maçka · sarp bir kayalığa yaslanmış'),
	T(11, 'tarih', 3, Y, ['İshak Paşa Sarayı', 'Kasımiye Medresesi', 'Hoşap Kalesi', 'Van Kalesi'], 'İshak Paşa Sarayı', 4, 'Doğubayazıt · Ağrı Dağı’nın eteğinde'),
	T(12, 'tarih', 2, Y, ['Celsus Kütüphanesi', 'Aspendos Tiyatrosu', 'Artemis Tapınağı', 'Bergama Akropolü'], 'Celsus Kütüphanesi', 35, 'Efes Antik Kenti · Selçuk'),
	T(13, 'cografya', 3, 'Bu antik tiyatro hangi ilimizde?', ['Antalya', 'İzmir', 'Denizli', 'Muğla'], 'Aspendos Antik Tiyatrosu', 7, 'Serik · sahne binası ayakta kalan Roma tiyatrosu'),
	T(14, 'tarih', 2, Y, ['Kızıl Kule', 'Galata Kulesi', 'Kız Kulesi', 'Bodrum Kalesi'], 'Kızıl Kule', 7, 'Alanya · Selçuklu, 1226'),
	T(15, 'tarih', 1, Y, ['Truva Atı', 'Nemrut Dağı', 'Göbeklitepe', 'Hattuşa'], 'Truva Atı', 17, 'Truva Antik Kenti'),
	T(16, 'tarih', 2, Y, ['Çanakkale Şehitler Abidesi', 'Anıtkabir', 'Dumlupınar Şehitliği', 'Sarıkamış Şehitler Anıtı'], 'Çanakkale Şehitler Abidesi', 17, 'Gelibolu Yarımadası'),
	T(17, 'tarih', 2, Y, ['Göbeklitepe', 'Çatalhöyük', 'Hattuşa', 'Nemrut Dağı'], 'Göbeklitepe', 63, 'Yaklaşık 12 bin yıllık dikili taşlar'),
	T(18, 'tarih', 3, Y, ['Hattuşa', 'Göbeklitepe', 'Truva', 'Çatalhöyük'], 'Hattuşa · Aslanlı Kapı', 19, 'Hitit başkenti · Boğazkale'),
	T(19, 'cografya', 1, Y, ['Peribacaları', 'Uçhisar Kalesi', 'Pamukkale Travertenleri', 'Nemrut Dağı'], 'Peribacaları', 50, 'Kapadokya · volkanik tüf'),
	T(20, 'cografya', 1, Y, ['Pamukkale', 'Salda Gölü', 'Tuz Gölü', 'Uzungöl'], 'Pamukkale Travertenleri', 20, 'Bembeyaz traverten basamakları'),
	// Akdamar da Ermeni kilisesi: resimde Ani yıkık kubbeli, Akdamar sivri külahlı ve adada
	T(21, 'tarih', 3, Y, ['Ani Katedrali', 'Akdamar Kilisesi', 'Sümela Manastırı', 'Aya İrini'], 'Ani Katedrali', 36, 'Ani Ören Yeri · 1001'),
	T(22, 'cografya', 2, 'Bu kilise hangi gölün adasında?', ['Van Gölü', 'Eğirdir Gölü', 'Beyşehir Gölü', 'Hazar Gölü'], 'Akdamar Kilisesi', 65, 'Akdamar Adası · 10. yüzyıl'),
	T(23, 'sanat', 3, Y, ['Divriği Ulu Camii', 'Çifte Minareli Medrese', 'İnce Minareli Medrese', 'Gök Medrese'], 'Divriği Ulu Camii', 58, 'Taş işçiliğiyle ünlü taç kapı · 1228'),
	T(24, 'sanat', 2, Y, ['Mevlana Müzesi', 'Yeşil Türbe', 'Selimiye Camii', 'Hacı Bayram Camii'], 'Mevlana Müzesi', 42, 'Yeşil Kubbe · Mevlana’nın türbesi'),
	T(25, 'tarih', 2, Y, ['Rumeli Hisarı', 'Anadolu Hisarı', 'Yedikule Zindanları', 'Kilitbahir Kalesi'], 'Rumeli Hisarı', 34, 'Fatih yaptırdı · 1452'),
	T(26, 'cografya', 2, Y, ['Kız Kalesi', 'Kız Kulesi', 'Bodrum Kalesi', 'Alanya Kalesi'], 'Kız Kalesi', 33, 'Erdemli · denizin içinde bir adada'),
	T(27, 'sanat', 2, Y, ['Bursa Ulu Camii', 'Yeşil Cami', 'Selimiye Camii', 'Süleymaniye Camii'], 'Bursa Ulu Camii', 16, 'Yirmi kubbeli · Yıldırım Bayezid'),
	T(28, 'cografya', 1, Y, ['İzmir Saat Kulesi', 'Dolmabahçe Saat Kulesi', 'Yıldız Saat Kulesi', 'Galata Kulesi'], 'İzmir Saat Kulesi', 35, 'Konak Meydanı · 1901'),
	// başka ahşap Osmanlı evleri (Beypazarı, Cumalıkızık) bilerek yok: resim onlarla karışabilir
	T(29, 'cografya', 2, Y, ['Safranbolu Evleri', 'Mardin Taş Evleri', 'Harran Kümbet Evleri', 'Kapadokya Kaya Evleri'], 'Safranbolu Evleri', 78, 'UNESCO Dünya Mirası · 1994'),
	T(30, 'sanat', 3, Y, ['Kasımiye Medresesi', 'Divriği Ulu Camii', 'İshak Paşa Sarayı', 'Mevlana Müzesi'], 'Kasımiye Medresesi', 47, 'Mardin’in sarı taş medresesi'),
	T(31, 'cografya', 3, 'Bu köprü hangi nehrin üzerinde?', ['Dicle', 'Fırat', 'Kızılırmak', 'Sakarya'], 'On Gözlü Köprü', 21, 'Diyarbakır · 1065'),
	T(32, 'sanat', 3, Y, ['Çifte Minareli Medrese', 'İnce Minareli Medrese', 'Divriği Ulu Camii', 'Kasımiye Medresesi'], 'Çifte Minareli Medrese', 25, 'Erzurum · Selçuklu taç kapısı'),
	// Myra da kaya mezarı: resimde Amasya’nın düz kayadaki kemerli nişleri, Myra’nın ev cepheli mezarları
	T(33, 'tarih', 3, Y, ['Amasya Kral Kaya Mezarları', 'Myra Kaya Mezarları', 'Nemrut Dağı', 'Hattuşa'], 'Amasya Kral Kaya Mezarları', 5, 'Pontus krallarının mezarları'),
	T(34, 'tarih', 2, Y, ['Bodrum Kalesi', 'Alanya Kalesi', 'Kız Kalesi', 'Rumeli Hisarı'], 'Bodrum Kalesi', 48, 'Sualtı Arkeoloji Müzesi burada'),
	// Ortahisar bilerek yok (o da kaya kale)
	T(35, 'cografya', 3, Y, ['Uçhisar Kalesi', 'Peribacaları', 'Ihlara Vadisi', 'Derinkuyu Yeraltı Şehri'], 'Uçhisar Kalesi', 50, 'Kapadokya · kayaya oyulmuş kale'),
	T(36, 'tarih', 2, Y, ['Ankara Kalesi', 'Kız Kulesi', 'İshak Paşa Sarayı', 'Sümela Manastırı'], 'Ankara Kalesi', 6, 'Altındağ · şehrin tepesinde'),
	// baroksu Dolmabahçe ve Nusretiye camileri bilerek yok (resim onlarla karışabilir)
	T(37, 'sanat', 2, Y, ['Ortaköy Camii', 'Süleymaniye Camii', 'Selimiye Camii', 'Sultanahmet Camii'], 'Ortaköy Camii', 34, 'Boğaz kıyısında · 1856'),
	// Muğla bilerek yok (Kaunos’un kaya mezarları Muğla’da)
	T(38, 'cografya', 3, 'Bu kaya mezarları hangi ilimizde?', ['Antalya', 'Amasya', 'Nevşehir', 'Mardin'], 'Myra Kaya Mezarları', 7, 'Demre · Likya mezarları'),
	T(39, 'cografya', 1, Y, ['Harran Evleri', 'Safranbolu Evleri', 'Kapadokya Kaya Evleri', 'Mardin Taş Evleri'], 'Harran Kümbet Evleri', 63, 'Kerpiçten konik kubbeli evler'),
	T(40, 'tarih', 3, 'Bu kapı hangi sarayın?', ['Topkapı Sarayı', 'Dolmabahçe Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı'], 'Babüsselam', 34, 'Topkapı Sarayı’nın Orta Kapısı'),

	// ---------------------------------------------------------------- yurt dışı
	// Tokyo Kulesi Eyfel’e benzer ama kırmızı-beyaz: resimdeki kahverengi demir kule Eyfel
	D(41, 'cografya', 1, Y, ['Eyfel Kulesi', 'Tokyo Kulesi', 'CN Kulesi', 'Space Needle'], 'Eyfel Kulesi', 'Paris · Fransa', 'Gustave Eiffel · 1889'),
	D(42, 'tarih', 1, Y, ['Kolezyum', 'Partenon', 'Pantheon', 'Aspendos Tiyatrosu'], 'Kolezyum', 'Roma · İtalya', 'MS 80’de açıldı'),
	D(43, 'cografya', 1, 'Bu eğik kule hangi şehirde?', ['Pisa', 'Venedik', 'Floransa', 'Napoli'], 'Pisa Kulesi', 'Pisa · İtalya', 'Katedralin eğik çan kulesi'),
	D(44, 'cografya', 1, Y, ['Big Ben', 'Westminster Abbey', 'Tower Bridge', 'Buckingham Sarayı'], 'Big Ben', 'Londra · Birleşik Krallık', 'Saat kulesinin adı Elizabeth Kulesi'),
	// London Bridge sanılır: Londra’nın açılır, kuleli köprüsü Tower Bridge
	D(45, 'cografya', 2, Y, ['Tower Bridge', 'London Bridge', 'Golden Gate Köprüsü', 'Galata Köprüsü'], 'Tower Bridge', 'Londra · Birleşik Krallık', 'Açılır köprü · 1894'),
	D(46, 'tarih', 2, 'Bu heykeli ABD’ye hangi ülke hediye etti?', ['Fransa', 'İngiltere', 'İtalya', 'İspanya'], 'Özgürlük Heykeli', 'New York · ABD', 'Fransa’nın hediyesi · 1886'),
	// Chrysler de art deco: resimde Empire State’in basamaklı gövdesi ve direği
	D(47, 'cografya', 2, Y, ['Empire State Binası', 'Chrysler Binası', 'One World Trade Center', 'Burj Halife'], 'Empire State Binası', 'New York · ABD', '102 katlı · 1931'),
	// Lizbon bilerek yok (kırmızı asma köprüsü Golden Gate’e çok benzer)
	D(48, 'cografya', 1, 'Bu köprü hangi şehirde?', ['San Francisco', 'New York', 'Londra', 'Sidney'], 'Golden Gate Köprüsü', 'San Francisco · ABD', 'Asma köprü · 1937'),
	D(49, 'tarih', 1, Y, ['Tac Mahal', 'Lotus Tapınağı', 'Şeyh Zayed Camii', 'Humayun Türbesi'], 'Tac Mahal', 'Agra · Hindistan', 'Şah Cihan, eşi Mümtaz Mahal için yaptırdı'),
	D(50, 'tarih', 1, Y, ['Çin Seddi', 'Hadrian Duvarı', 'Machu Picchu', 'Yasak Şehir'], 'Çin Seddi', 'Çin', 'Gözetleme kuleleriyle sırtları aşar'),
	D(51, 'tarih', 1, Y, ['Gize Piramitleri', 'Chichén Itzá', 'Ebu Simbel', 'Teotihuacan'], 'Gize Piramitleri', 'Gize · Mısır', 'Keops Piramidi ve Büyük Sfenks'),
	D(52, 'cografya', 2, 'Bu kaya kent hangi ülkede?', ['Ürdün', 'Mısır', 'Lübnan', 'Suriye'], 'Petra · Hazine Binası', 'Petra · Ürdün', 'Kayaya oyulmuş Nebati kenti'),
	D(53, 'cografya', 2, ULKE, ['Peru', 'Meksika', 'Şili', 'Bolivya'], 'Machu Picchu', 'Cusco · Peru', 'And Dağları’nda İnka kenti'),
	// Lizbon bilerek yok (Cristo Rei de kollarını açan bir heykel)
	D(54, 'cografya', 1, 'Bu heykel hangi şehirde?', ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Buenos Aires'], 'Kurtarıcı İsa Heykeli', 'Rio de Janeiro · Brezilya', 'Corcovado Dağı · 1931'),
	D(55, 'sanat', 1, Y, ['Sidney Opera Binası', 'Lotus Tapınağı', 'Burj Al Arab', 'Elbphilharmonie'], 'Sidney Opera Binası', 'Sidney · Avustralya', 'Yelken biçimli kabuklar · 1973'),
	D(56, 'sanat', 2, 'Bu bazilika hangi şehirde?', ['Barselona', 'Madrid', 'Sevilla', 'Lizbon'], 'Sagrada Família', 'Barselona · İspanya', 'Gaudí · 1882’den beri yapımda'),
	D(57, 'tarih', 1, 'Bu tapınak hangi şehirde?', ['Atina', 'Roma', 'İstanbul', 'Kahire'], 'Partenon', 'Atina · Yunanistan', 'Akropolis · Athena’ya adanmış'),
	// Westminster de çift kuleli gotik: resimde Notre-Dame’ın gül penceresi ve düz başlı kuleleri
	D(58, 'sanat', 2, Y, ['Notre-Dame Katedrali', 'Westminster Abbey', 'Köln Katedrali', 'Milano Katedrali'], 'Notre-Dame Katedrali', 'Paris · Fransa', 'Gotik katedral · 2019 yangını'),
	D(59, 'cografya', 1, 'Bu katedral hangi şehirde?', ['Moskova', 'Kiev', 'Varşova', 'Prag'], 'Aziz Vasil Katedrali', 'Moskova · Rusya', 'Kızıl Meydan · renkli soğan kubbeler'),
	D(60, 'cografya', 1, Y, ['Burj Halife', 'Petronas Kuleleri', 'Shanghai Kulesi', 'Burj Al Arab'], 'Burj Halife', 'Dubai · BAE', '828 metre'),
	// İskoçya bilerek yok (orada da taş çemberler var)
	D(61, 'cografya', 2, ULKE, ['İngiltere', 'İrlanda', 'Fransa', 'Norveç'], 'Stonehenge', 'Wiltshire · İngiltere', 'Yaklaşık 5 bin yıllık taş çember'),
	D(62, 'cografya', 2, ULKE, ['Kamboçya', 'Tayland', 'Vietnam', 'Myanmar'], 'Angkor Wat', 'Siem Reap · Kamboçya', 'Dünyanın en büyük dinî yapısı'),
	// Teotihuacan bilerek yok (o da Meksika’nın basamaklı piramidi)
	D(63, 'tarih', 2, Y, ['Chichén Itzá', 'Gize Piramitleri', 'Machu Picchu', 'Borobudur'], 'Chichén Itzá · El Castillo', 'Yucatán · Meksika', 'Maya piramidi'),
	D(64, 'cografya', 2, ULKE, ['Almanya', 'Avusturya', 'İsviçre', 'Fransa'], 'Neuschwanstein Şatosu', 'Bavyera · Almanya', 'II. Ludwig’in masal şatosu'),
	D(65, 'cografya', 1, SEHIR, ['Berlin', 'Münih', 'Viyana', 'Paris'], 'Brandenburg Kapısı', 'Berlin · Almanya', 'Tepesinde dört atlı araba · 1791'),
	D(66, 'tarih', 1, Y, ['Zafer Takı', 'Brandenburg Kapısı', 'Titus Takı', 'Hindistan Kapısı'], 'Zafer Takı', 'Paris · Fransa', 'Napolyon yaptırdı · 1836’da bitti'),
	D(67, 'sanat', 1, 'Bu cam piramit hangi müzenin girişi?', ['Louvre', 'British Museum', 'Prado', 'Ermitaj'], 'Louvre Piramidi', 'Paris · Fransa', 'I. M. Pei · 1989'),
	D(68, 'tarih', 3, SEHIR, ['Granada', 'Sevilla', 'Kurtuba', 'Toledo'], 'Elhamra Sarayı', 'Granada · İspanya', 'Nasrî hanedanının sarayı'),
	D(69, 'cografya', 3, 'Bu dev taş heykeller hangi ülkede?', ['Şili', 'Peru', 'Yeni Zelanda', 'Meksika'], 'Moai Heykelleri', 'Paskalya Adası · Şili', 'Rapa Nui halkının heykelleri'),
	D(70, 'cografya', 2, SEHIR, ['Kuala Lumpur', 'Singapur', 'Bangkok', 'Cakarta'], 'Petronas İkiz Kuleleri', 'Kuala Lumpur · Malezya', '88 katlı ikiz kuleler'),
	D(71, 'cografya', 1, Y, ['Beyaz Saray', 'ABD Kongre Binası', 'Buckingham Sarayı', 'Elysée Sarayı'], 'Beyaz Saray', 'Washington · ABD', 'ABD başkanlarının resmî konutu'),
	// Aziz Petrus da büyük kubbeli: resimde Capitol’ün beyaz, uzun kanatlı yapısı
	D(72, 'cografya', 2, Y, ['ABD Kongre Binası', 'Beyaz Saray', 'Aziz Petrus Bazilikası', 'Buckingham Sarayı'], 'ABD Kongre Binası', 'Washington · ABD', 'Capitol · ABD Kongresi’nin binası'),
	D(73, 'cografya', 1, 'Kâbe hangi şehirde?', ['Mekke', 'Medine', 'Kudüs', 'Taif'], 'Kâbe', 'Mekke · Suudi Arabistan', 'Mescid-i Haram’ın ortasında'),
	// Mescid-i Aksa ile karıştırılır: altın kubbeli olan Kubbetüs Sahra
	D(74, 'tarih', 2, Y, ['Kubbetüs Sahra', 'Mescid-i Aksa', 'Mescid-i Nebevi', 'Şeyh Zayed Camii'], 'Kubbetüs Sahra', 'Kudüs', 'Altın kubbe · 7. yüzyılın sonu'),
	D(75, 'cografya', 1, 'Bu cami hangi şehirde?', ['Medine', 'Mekke', 'Kudüs', 'Şam'], 'Mescid-i Nebevi', 'Medine · Suudi Arabistan', 'Yeşil Kubbe'),
	D(76, 'cografya', 2, SEHIR, ['Abu Dabi', 'Dubai', 'Doha', 'Riyad'], 'Şeyh Zayed Camii', 'Abu Dabi · BAE', 'Bembeyaz mermer, 82 kubbe'),
	D(77, 'bilim', 2, SEHIR, ['Brüksel', 'Amsterdam', 'Paris', 'Viyana'], 'Atomium', 'Brüksel · Belçika', 'Demir kristalinin dev modeli · 1958'),
	D(78, 'cografya', 2, 'Bu kule hangi şehirde?', ['Toronto', 'Vancouver', 'Seattle', 'Montreal'], 'CN Kulesi', 'Toronto · Kanada', '553 metre'),
	D(79, 'cografya', 2, Y, ['Space Needle', 'CN Kulesi', 'Tokyo Kulesi', 'Berlin TV Kulesi'], 'Space Needle', 'Seattle · ABD', '1962 Dünya Fuarı için yapıldı'),
	// Osaka Kalesi bilerek yok (resimde ayırt edilemez): soru ülke
	D(80, 'cografya', 1, ULKE, ['Japonya', 'Çin', 'Güney Kore', 'Tayland'], 'Himeji Kalesi', 'Himeji · Japonya', 'Beyaz Balıkçıl Kalesi'),
	D(81, 'cografya', 1, 'Pagodanın arkasındaki dağ hangisi?', ['Fuji', 'Everest', 'Kilimanjaro', 'Ağrı'], 'Fuji Dağı ve Chureito Pagodası', 'Japonya', 'Japonya’nın en yüksek dağı · 3.776 m'),
	D(82, 'cografya', 2, SEHIR, ['Pekin', 'Şanghay', 'Tokyo', 'Seul'], 'Yasak Şehir', 'Pekin · Çin', 'Yüce Uyum Salonu'),
	D(83, 'tarih', 3, Y, ['Potala Sarayı', 'Yasak Şehir', 'Angkor Wat', 'Himeji Kalesi'], 'Potala Sarayı', 'Lhasa · Tibet', 'Dalay Lamaların sarayıydı'),
	D(84, 'cografya', 3, ULKE, ['Myanmar', 'Kamboçya', 'Tayland', 'Hindistan'], 'Bagan Tapınakları', 'Bagan · Myanmar', 'Binlerce Budist tapınağı'),
	D(85, 'tarih', 3, Y, ['Borobudur', 'Angkor Wat', 'Bagan Tapınakları', 'Chichén Itzá'], 'Borobudur', 'Cava · Endonezya', 'Dünyanın en büyük Budist tapınağı'),
	D(86, 'tarih', 2, Y, ['Ebu Simbel', 'Petra', 'Karnak Tapınağı', 'Gize Piramitleri'], 'Ebu Simbel', 'Asvan · Mısır', 'II. Ramses · 1960’larda taşındı'),
	D(87, 'tarih', 3, 'Bu antik kent hangi ülkede?', ['Tunus', 'Libya', 'Fas', 'Cezayir'], 'Kartaca', 'Tunus', 'Fenikelilerin kurduğu kent'),
	D(88, 'cografya', 3, SEHIR, ['Kazablanka', 'Rabat', 'Marakeş', 'Tunus'], 'II. Hasan Camii', 'Kazablanka · Fas', 'Atlas Okyanusu kıyısında'),
	D(89, 'tarih', 2, 'Burada kaç ABD başkanının yüzü var?', ['4', '3', '5', '6'], 'Rushmore Dağı', 'Güney Dakota · ABD', 'Washington, Jefferson, T. Roosevelt, Lincoln'),
	D(90, 'sanat', 2, SEHIR, ['Milano', 'Roma', 'Floransa', 'Venedik'], 'Milano Katedrali', 'Milano · İtalya', 'Gotik · yüzlerce sivri kule'),
	// Vatikan ayrı bir ülke: bazilika İtalya’da değil
	D(91, 'cografya', 3, ULKE, ['Vatikan', 'İtalya', 'İspanya', 'Fransa'], 'Aziz Petrus Bazilikası', 'Vatikan', 'Kubbesi Michelangelo’nun tasarımı'),
	D(92, 'tarih', 3, Y, ['Westminster Abbey', 'Notre-Dame Katedrali', 'Köln Katedrali', 'Milano Katedrali'], 'Westminster Abbey', 'Londra · Birleşik Krallık', 'İngiliz taç giyme törenlerinin yeri'),
	D(93, 'tarih', 2, Y, ['Buckingham Sarayı', 'Beyaz Saray', 'Versay Sarayı', 'Dolmabahçe Sarayı'], 'Buckingham Sarayı', 'Londra · Birleşik Krallık', 'Kraliyetin Londra’daki resmî sarayı'),
	D(94, 'cografya', 2, 'Bu kule hangi şehirde?', ['Moskova', 'Londra', 'Prag', 'Varşova'], 'Kremlin · Spasskaya Kulesi', 'Moskova · Rusya', 'Kremlin’in saat kulesi'),
	// Gürcistan bilerek yok (orada da kaya sütunu üstünde bir manastır var)
	D(95, 'cografya', 3, ULKE, ['Yunanistan', 'İtalya', 'İspanya', 'Bulgaristan'], 'Meteora', 'Teselya · Yunanistan', 'Kaya sütunlarının tepesindeki manastırlar'),
	// İngiltere bilerek yok (St Michael’s Mount ona çok benzer)
	D(96, 'cografya', 2, ULKE, ['Fransa', 'İtalya', 'İrlanda', 'Belçika'], 'Mont-Saint-Michel', 'Normandiya · Fransa', 'Gelgitle adaya dönen manastır'),
	D(97, 'cografya', 1, 'Folyonun altında ne var?', ['Yel değirmeni', 'Deniz feneri', 'Saat kulesi', 'Su kulesi'], 'Kinderdijk Yel Değirmenleri', 'Kinderdijk · Hollanda', 'On dokuz tarihî yel değirmeni'),
	D(98, 'cografya', 1, Y, ['Burj Al Arab', 'Burj Halife', 'Marina Bay Sands', 'Sidney Opera Binası'], 'Burj Al Arab', 'Dubai · BAE', 'Yelken biçimli otel · yapay adada'),
	D(99, 'cografya', 2, SEHIR, ['Singapur', 'Dubai', 'Hong Kong', 'Kuala Lumpur'], 'Marina Bay Sands', 'Singapur', 'Üç kulenin üstünde gemi biçimli teras'),
	D(100, 'sanat', 2, Y, ['Lotus Tapınağı', 'Sidney Opera Binası', 'Tac Mahal', 'Şeyh Zayed Camii'], 'Lotus Tapınağı', 'Yeni Delhi · Hindistan', 'Nilüfer çiçeği biçimi · 1986'),
];

/** Görseli henüz gelmeyenler (dosya bozuk geldi): görsel gelene dek soru havuza girmez. */
export const EKSIK = new Set(['05']);

/** Soru kimliği: eski üç örnek 1–3’te kalır; gerisi görsel sırasıyla 4’ten. */
const ESKI = { 15: 1, 5: 2, 9: 3 };
const TEMA = ['gunduz', 'batim', 'gece'];
const FOLYO = { 1: 'gumus', 2: 'altin', 3: 'holo' };
let n = 4;
export const KAZI_SORULAR = YAPILAR.map((y) => ({
	id: `yn-kazi-${ESKI[y.no] ?? n++}`,
	cat: y.cat,
	diff: y.diff,
	type: 'kazi',
	q: y.q,
	img: String(y.no).padStart(2, '0'),
	a: y.a,
	ad: y.ad,
	...(y.il ? { il: y.il } : { yer: y.yer }),
	alt: y.alt,
	tema: y.no === 5 ? 'gece' : y.no === 9 ? 'batim' : TEMA[y.no % 3],
	folyo: FOLYO[y.diff],
})).sort((a, b) => Number(a.id.split('-')[2]) - Number(b.id.split('-')[2]));
