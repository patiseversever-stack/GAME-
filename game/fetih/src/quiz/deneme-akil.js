// YENİ · deneme grubu: akıl ve kelime tipleri (defter 10 Az Bilinen, 13 Harf Al, 15 Yanlışı Bul, 16 İki Doğru Bir
// Yalan). Haritasız; düello ve "herkes cevaplıyor" sahnelerinde aynı kartla oynanır. Bkz. deneme.js başı.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
//
// İçerik elle yazıldı. İki Doğru Bir Yalan'da her doğru bilginin iki kaynağı `k` alanında; yalanlar kesin yanlış
// (açıklamada doğrusu). Az Bilinen'deki yüzdeler TAHMİNİ seçilme oranlarıdır (100 kişiden kaçının aklına gelir);
// çevrimiçinde gerçek oyuncu seçimleriyle değişir.

import { PROFILE } from './timing.js';
import { yanlis } from './d_yanlis.js';
import { ikidogru } from './d_ikidogru.js';
import { harfal } from './d_harfal.js';
import { azbilinen } from './d_azbilinen.js';

// süre profilleri (timing.js'e dokunmadan): en az 20 sn
Object.assign(PROFILE, {
	yanlis: { min: 20, max: 45, think: [5, 1.5] }, // cümleyi tart, şüpheliyi seç, doğrusunu hatırla
	ikidogru: { min: 20, max: 45, think: [6, 2] }, // üç bilgiyi tart, en "fazla iyi" olanı ele
	harfal: { min: 20, max: 55, think: [5, 2] }, // tanımı çöz; gerekirse harf al, deseni yeniden düşün
	azbilinen: { min: 20, max: 45, think: [6, 2] }, // doğruları hatırla, az bilineni seç
});

export const TYPES = { yanlis, ikidogru, harfal, azbilinen };

export const ORDER = [
	['yanlis', 'Yanlışı Bul', 'Yanlış kelimeye dokun, düzelt'],
	['ikidogru', 'İki Doğru Bir Yalan', 'Üç şaşırtıcı bilgi, biri yalan'],
	['harfal', 'Harf Al', 'Her harf 100 puan; harf alan kaybeder'],
	['azbilinen', 'Az Bilinen', 'Doğru ama az bilinen cevap kazanır'],
];

const YQ = 'Bu cümlede bir kelime yanlış. Bul ve düzelt!';
const Y = (id, cat, diff, t, ok, alt, n) => ({ id, cat, diff, type: 'yanlis', q: YQ, t, ok, alt, n });
const F = (t, n, k) => ({ t, n, k });
/** İki doğru bir yalan: lie önce, sonra iki doğru (prepare karıştırır). */
const ID = (id, cat, diff, lie, t1, t2) => ({ id, cat, diff, type: 'ikidogru', q: 'İkisi doğru, biri yalan. Yalanı bul!', f: [F(...lie), F(...t1), F(...t2)], lie: 0 });
const H = (id, cat, diff, w, q) => ({ id, cat, diff, type: 'harfal', q, w });
const A = (id, cat, diff, q, ans, wrong) => ({ id, cat, diff, type: 'azbilinen', q, ans, wrong });

export const SAMPLES = {
	yanlis: [
		Y('dn-yb01', 'tarih', 1, 'Fatih Sultan Mehmet İstanbul’u {1435} yılında, henüz 21 yaşındayken fethetti.', '1453', ['1451', '1461'], 'Kuşatma 6 Nisan’da başladı, 29 Mayıs 1453’te bitti. 1451 tahta çıkışı, 1461 Trabzon’un alınışıdır.'),
		Y('dn-yb02', 'bilim', 2, 'Güneş’ten çıkan ışık Dünya’ya yaklaşık 8 {saniyede} ulaşır.', 'dakikada', ['saatte', 'günde'], 'Tam olarak 8 dakika 20 saniye kadar: Güneş’e baktığında onun 8 dakika önceki halini görürsün.'),
		Y('dn-yb03', 'cografya', 2, 'Türkiye’nin en yüksek noktası olan Ağrı Dağı’nın zirvesi {4.137} metredir.', '5.137', ['3.917', '4.058'], '3.917 metre Erciyes’in, 4.058 metre Süphan Dağı’nın yüksekliği. Ağrı’nın zirvesini kalıcı bir buzul örter.'),
		Y('dn-yb04', 'sanat', 2, 'Mimar Sinan’ın “ustalık eserim” dediği Selimiye Camii {Bursa’dadır}.', 'Edirne’dedir', ['Manisa’dadır', 'Konya’dadır'], 'Şehzade Camii için “çıraklık”, Süleymaniye için “kalfalık” eserim der. Selimiye’yi 80 yaşını geçmişken bitirdi.'),
		Y('dn-yb05', 'spor', 1, 'Türkiye, 2002 Dünya Kupası’nı {dördüncü} sırada tamamlayarak tarih yazdı.', 'üçüncü', ['ikinci', 'beşinci'], 'Yarı finalde Brezilya’ya 1-0 yenildi, üçüncülük maçında Güney Kore’yi 3-2 yendi. 1954’ten sonraki ilk Dünya Kupası’ydı.'),
		Y('dn-yb06', 'eglence', 2, 'Nasreddin Hoca’nın türbesi {Kastamonu’nun} Akşehir ilçesindedir.', 'Konya’nın', ['Eskişehir’in', 'Afyon’un'], 'Doğduğu yer Eskişehir Sivrihisar’daki Hortu köyü. Türbesinin kapısı kilitlidir ama duvarı yoktur.'),
		Y('dn-yb07', 'bilim', 2, 'Ahtapotun mavi kanı ve {iki} kalbi vardır.', 'üç', ['dört', 'bir'], 'İki kalp kanı solungaçlara, üçüncüsü bütün vücuda pompalar. Kan, bakır taşıyan hemosiyanin yüzünden mavidir.'),
		Y('dn-yb08', 'tarih', 2, 'Malazgirt’te Sultan Alparslan, Bizans İmparatoru {Konstantin’i} esir aldı.', 'Romen Diyojen’i', ['Justinyen’i', 'Aleksios’u'], 'Alparslan esir imparatoru affedip hediyelerle geri gönderdi. 1071’deki bu zafer Anadolu’nun kapılarını açtı.'),
		Y('dn-yb09', 'cografya', 2, 'Dünyanın en derin gölü Baykal {Kanada’dadır}.', 'Rusya’dadır', ['Moğolistan’dadır', 'Kazakistan’dadır'], 'Derinliği 1.600 metreyi aşar. Dünyadaki donmamış tatlı suyun yaklaşık beşte biri bu tek göldedir.'),
		Y('dn-yb10', 'sanat', 2, 'Türk sinemasının ilk Altın Palmiye’si Yılmaz Güney’in {Sürü} filmiyle geldi.', 'Yol', ['Umut', 'Duvar'], '1982 Cannes’da ödülü Costa-Gavras’ın “Kayıp” filmiyle paylaştı. İkincisi 2014’te Nuri Bilge Ceylan’ın “Kış Uykusu”na gitti.'),
		Y('dn-yb11', 'bilim', 1, 'Bal arıları, buldukları çiçeğin yerini kovandaki arkadaşlarına {şarkı söyleyerek} anlatır.', 'dans ederek', ['renk değiştirerek', 'toprak kazarak'], '“Salınım dansı”nın açısı Güneş’e göre yönü, süresi uzaklığı söyler. Karl von Frisch bu keşifle 1973’te Nobel aldı.'),
		Y('dn-yb12', 'tarih', 2, 'İstiklal Marşı, 12 Mart {1923} tarihinde TBMM’de kabul edildi.', '1921', ['1920', '1922'], 'Mehmet Akif yarışmanın 500 liralık ödülünü kabul etmedi; para yoksul kadın ve çocuklara iş veren Dârülmesâi’ye bağışlandı.'),
		Y('dn-yb13', 'eglence', 1, 'Bir satranç tahtasında toplam {48} kare vardır.', '64', ['81', '100'], 'Taşlar 32 tane: oyun başladığında karelerin tam yarısı dolu, yarısı boştur.'),
		Y('dn-yb14', 'cografya', 3, 'Van Gölü’nün sodalı suyunda yaşayabilen tek balık türü {alabalıktır}.', 'inci kefalidir', ['sazandır', 'levrektir'], 'İnci kefali her bahar gölden tatlı su derelerine göç eder; yumurtlamak için akıntıya karşı yüzer, küçük çağlayanlardan atlar.'),
		Y('dn-yb15', 'bilim', 1, 'Dünya’ya en yakın yıldız {Kutup Yıldızı’dır}.', 'Güneş’tir', ['Sirius’tur', 'Vega’dır'], 'Güneş’ten sonra en yakını 4,2 ışık yılı ötedeki Proxima Centauri. Kutup Yıldızı ise 430 ışık yılı kadar uzakta.'),
		Y('dn-yb16', 'spor', 2, 'Naim Süleymanoğlu, halterde art arda {iki} olimpiyat altın madalyası kazandı.', 'üç', ['dört', 'beş'], '1988 Seul, 1992 Barselona, 1996 Atlanta. 1,47 boyundaki “Cep Herkülü” kendi ağırlığının üç katını kaldırdı.'),
		Y('dn-yb17', 'sanat', 2, 'Rivayete göre Karagöz ile Hacivat, {Edirne’de} bir cami inşaatında çalışan iki ustaydı.', 'Bursa’da', ['İznik’te', 'Konya’da'], 'Orhan Gazi dönemine bağlanan hikâyede şakaları işi yavaşlatınca cezalandırılırlar. Bursa’da adlarına sembolik bir mezar var.'),
		Y('dn-yb18', 'tarih', 2, 'Bilinen ilk yazılı barış antlaşması Kadeş, Hititler ile {Babilliler} arasında imzalandı.', 'Mısırlılar', ['Asurlular', 'Persler'], 'MÖ 1259 civarında Hitit kralı III. Hattuşili ile Mısır firavunu II. Ramses arasında imzalandı.'),
		Y('dn-yb19', 'cografya', 2, 'Tamamı Türkiye’de akan en uzun nehir {Fırat}, Sivas’ta doğup Karadeniz’e dökülür.', 'Kızılırmak', ['Yeşilırmak', 'Sakarya'], '1.355 km ile Kızılırmak. Fırat daha uzundur ama Suriye ve Irak’tan geçip Basra Körfezi’ne ulaşır.'),
		Y('dn-yb20', 'eglence', 2, 'Türk kahvesi kültürü UNESCO’nun Somut Olmayan Kültürel Miras listesine {2005’te} girdi.', '2013’te', ['2009’da', '2017’de'], '“Bir fincan kahvenin kırk yıl hatırı vardır.” Pişirilişi, sunumu ve falıyla birlikte tescillendi.'),
		Y('dn-yb21', 'sanat', 1, 'Orhan Pamuk, Nobel Edebiyat Ödülü’nü kazanan {ikinci} Türk yazardır.', 'ilk', ['üçüncü', 'beşinci'], 'Ödülü 2006’da aldı. Türkiye’nin ikinci Nobel’i 2015’te kimyada Aziz Sancar’a geldi.'),
		Y('dn-yb22', 'bilim', 1, 'Penisilini 1928’de bulan bilim insanı {Louis Pasteur’dür}.', 'Alexander Fleming’dir', ['Marie Curie’dir', 'Robert Koch’tur'], 'Fleming tatilden dönünce küf bulaşmış bir kapta bakterilerin öldüğünü fark etti: tarihin en verimli dağınıklığı.'),
		Y('dn-yb23', 'tarih', 3, 'Ankara 13 Ekim 1923’te başkent oldu; Cumhuriyet bundan {iki ay} sonra ilan edildi.', 'on altı gün', ['bir yıl', 'bir hafta'], 'Önce başkent, sonra Cumhuriyet: 13 Ekim’de Ankara başkent oldu, 29 Ekim 1923’te Cumhuriyet ilan edildi.'),
		Y('dn-yb24', 'spor', 2, 'Galatasaray, 2000 UEFA Kupası finalinde {Real Madrid’i} penaltılarla yendi.', 'Arsenal’i', ['Leeds United’ı', 'Chelsea’yi'], 'Kopenhag’daki final 0-0 bitti, penaltılarda 4-1. Leeds yarı finaldeki rakipti; Real Madrid’i ise aynı yaz Süper Kupa’da yendi.'),
		Y('dn-yb25', 'bilim', 2, 'Vücudumuzun en küçük kemiği olan üzengi kemiği {burnumuzda} bulunur.', 'kulağımızda', ['parmağımızda', 'gözümüzde'], 'Orta kulaktaki üzengi yaklaşık 3 milimetre. Çekiç ve örsle birlikte sesi iç kulağa iletir.'),
		Y('dn-yb26', 'tarih', 1, 'Mustafa Kemal, 19 Mayıs 1919’da {Trabzon’a} ayak basarak Millî Mücadele’yi başlattı.', 'Samsun’a', ['Sinop’a', 'İnebolu’ya'], 'Bandırma Vapuru’yla İstanbul’dan yola çıktı. 19 Mayıs bugün Atatürk’ü Anma, Gençlik ve Spor Bayramı.'),
	],
	ikidogru: [
		ID('dn-id01', 'eglence', 2,
			['Van kedilerinin iki gözü her zaman aynı renktir.', 'Yalan: Van kedisini ünlü yapan tam tersi. Çoğunun bir gözü mavi, öbürü kehribar rengidir; üstelik çoğu kedinin aksine suyla oynamayı sever.'],
			['Giresun’un Kuşköy’ünde insanlar vadiden vadiye ıslıkla konuşur.', '“Kuş dili” Türkçeyi ıslığa çevirir; kilometrelerce öteden anlaşılır. 2017’de UNESCO’nun acil korunması gereken miras listesine girdi.', ['UNESCO Somut Olmayan Kültürel Miras (2017)', 'T.C. Kültür ve Turizm Bakanlığı']],
			['Lüks “moher” kumaşı, Ankara keçisinin tiftiğinden yapılır.', '“Angora” denen keçi, kedi ve tavşan adını Ankara’dan alır. Moher hâlâ en pahalı yünlerden biri.', ['Britannica: Angora goat', 'TDK Güncel Türkçe Sözlük: tiftik, moher']]),
		ID('dn-id02', 'tarih', 2,
			['Mehter takımı ilk kez Kurtuluş Savaşı yıllarında kuruldu.', 'Yalan: Mehterin kökü Osmanlı’dan da eskidir ve dünyanın en eski askerî bandosu sayılır. Mozart’ın “Türk Marşı” bile onun sesinden esinlendi.'],
			['“Atatürk” soyadını TBMM bir kanunla verdi; bu soyadını başka kimse alamaz.', '24 Kasım 1934’te 2587 sayılı kanunla verildi. Birkaç hafta sonra çıkan 2622 sayılı kanun bu soyadını başkalarına yasakladı.', ['Resmî Gazete: 2587 ve 2622 sayılı kanunlar', 'Atatürk Araştırma Merkezi: Atatürk Ansiklopedisi']],
			['Atatürk Nutuk’u altı gün boyunca okudu; konuşma toplam 36 saati aştı.', '15–20 Ekim 1927’de CHP kurultayında okundu: Kurtuluş Savaşı’nın onun ağzından anlatıldığı dev bir “sesli kitap”.', ['Atatürk Araştırma Merkezi: Nutuk', 'Türk Tarih Kurumu']]),
		ID('dn-id03', 'tarih', 3,
			['Michelangelo, Ayasofya’nın kubbesini onarmak için İstanbul’da üç yıl yaşadı.', 'Yalan: Michelangelo’ya da Haliç köprüsü için davet gittiği anlatılır ama İstanbul’a hiç gelmedi. Ayasofya’ya destek duvarları ekleyen Mimar Sinan’dı.'],
			['Leonardo da Vinci, Haliç’e köprü yapmak için Sultan II. Bayezid’e mektup yazdı.', '1502 tarihli mektubun Türkçe kopyası Topkapı Sarayı arşivinde. Köprü yapılmadı ama tasarımı 2001’de Norveç’te küçük bir yaya köprüsü oldu.', ['Topkapı Sarayı Müzesi Arşivi (E. 6184)', 'Vebjørn Sand Da Vinci Projesi, Ås, Norveç (2001)']],
			['Einstein 1933’te Türkiye’ye mektup yazıp Nazilerden kaçan bilim insanlarının kabul edilmesini istedi.', 'Mektup Başbakan İsmet İnönü’ye gitti. O yıllarda yüzü aşkın Alman profesör İstanbul ve Ankara’da ders verdi.', ['Cumhurbaşkanlığı Devlet Arşivleri: Einstein’ın mektubu (1933)', 'Arnold Reisman, Turkey’s Modernization (2006)']]),
		ID('dn-id04', 'cografya', 2,
			['Efes’teki Celsus Kütüphanesi antik dünyanın en büyük kütüphanesiydi.', 'Yalan: En büyüğü İskenderiye Kütüphanesiydi. Celsus’ta 12 bin kadar tomar vardı; Bergama Kütüphanesi bile ondan çok daha büyüktü.'],
			['Antik Dünyanın Yedi Harikası’ndan ikisi bugünkü Türkiye topraklarındaydı.', 'Efes’teki Artemis Tapınağı ve Bodrum’daki Halikarnas Mozolesi. “Mozole” kelimesi de Kral Mausolos’un mezarından gelir.', ['Britannica: Seven Wonders of the World', 'UNESCO Dünya Mirası: Efes']],
			['İstanbul’daki Tünel, Londra’dan sonra dünyanın en eski ikinci metrosudur.', '1875’te açıldı; Karaköy’den Beyoğlu’na yaklaşık 570 metrelik yokuşu yerin altından çıkar.', ['Metro İstanbul A.Ş.: Tarihçe', 'İBB Kültür A.Ş.']]),
		ID('dn-id05', 'bilim', 2,
			['Muz, Türkiye’de yalnızca seralarda yetiştirilebilir.', 'Yalan: Mersin’in Anamur’unda ve Antalya’nın Alanya’sında muz açık arazide de yetişir; Anamur muzu coğrafi işaretlidir.'],
			['İngilizce “tulip” (lale) kelimesi Türkçe “tülbent”ten gelir.', 'Avrupalılar sarığa benzeyen çiçeğe sarık kumaşının adını verdi. Lale Hollanda’ya da Osmanlı’dan gitti.', ['Oxford English Dictionary: tulip', 'Britannica: tulip']],
			['Kirazın adı Giresun’un antik adı Kerasus’la akrabadır.', 'Romalı general Lucullus MÖ 1. yüzyılda kirazı Karadeniz kıyısından Roma’ya taşıdı; Plinius bunu “Doğa Tarihi”nde anlatır.', ['Plinius, Naturalis Historia XV', 'Britannica: cherry']]),
		ID('dn-id06', 'tarih', 2,
			['Cumhuriyet ilan edildiğinde Türkiye’nin başkenti hâlâ İstanbul’du.', 'Yalan: Ankara, 13 Ekim 1923’te, yani Cumhuriyet’ten 16 gün önce başkent ilan edilmişti.'],
			['Türk kadınları milletvekili seçme ve seçilme hakkını Fransız kadınlarından on yıl önce kazandı.', 'Türkiye’de 5 Aralık 1934, Fransa’da 1944. 1935 seçimlerinde Meclis’e 18 kadın milletvekili girdi.', ['TBMM Kütüphanesi ve Arşivi', 'Inter-Parliamentary Union (IPU)']],
			['Atatürk’ün naaşı Anıtkabir’e taşınmadan önce 15 yıl Ankara Etnografya Müzesi’nde kaldı.', '1938’den 10 Kasım 1953’e kadar. Müzedeki o bölüm bugün hâlâ saygıyla korunur.', ['Anıtkabir Komutanlığı', 'Kültür ve Turizm Bakanlığı: Ankara Etnografya Müzesi']]),
		ID('dn-id07', 'spor', 2,
			['Kırkpınar’da pehlivanlar kaygan olsun diye vücutlarına bal sürer.', 'Yalan: Sürülen zeytinyağıdır. Bu yüzden pehlivanlar birbirini kavramak için kispetten tutmaya çalışır.'],
			['Kırkpınar, kesintisiz düzenlenen en eski spor organizasyonu olarak Guinness kayıtlarında.', '660 yılı aşkın geçmişi var; 2010’da UNESCO’nun Somut Olmayan Kültürel Miras listesine de girdi.', ['Guinness World Records', 'UNESCO Somut Olmayan Kültürel Miras (2010)']],
			['Türkiye 1954 Dünya Kupası’na kurayla gitti: kurayı gözleri bağlı bir İtalyan çocuk çekti.', 'İspanya ile eşitlik bozulamayınca Roma’da 14 yaşındaki Luigi Franco Gemma torbadan “Türkiye”yi çıkardı.', ['FIFA: 1954 eleme arşivi', 'TFF: Millî Takım tarihçesi']]),
		ID('dn-id08', 'cografya', 2,
			['Fırat Nehri’nin tamamı Türkiye sınırları içinde akar.', 'Yalan: Fırat, Keban ve Atatürk barajlarından sonra Suriye ve Irak’a geçer, Dicle ile birleşip Basra Körfezi’ne dökülür.'],
			['İstanbul Boğazı’nda iki akıntı vardır: üstte Karadeniz’den Marmara’ya, dipte tam tersine.', 'Karadeniz’in az tuzlu, hafif suyu üstten güneye; Marmara’nın tuzlu, ağır suyu dipten kuzeye akar.', ['Britannica: Bosporus', 'TÜBİTAK / İTÜ oşinografi çalışmaları']],
			['1915 Çanakkale Köprüsü’nün iki kulesi arası 2.023 metreyle dünyanın en uzun asma köprü açıklığıdır.', 'Sayı tesadüf değil: 2.023 metre Cumhuriyet’in 100. yılını, 318 metrelik kuleler 18 Mart 1915’i anar.', ['T.C. Ulaştırma ve Altyapı Bakanlığı', 'Guinness World Records']]),
		ID('dn-id09', 'eglence', 1,
			['Dünyanın en çok çay üreten ülkesi Türkiye’dir.', 'Yalan: Üretimde Çin ve Hindistan açık ara önde. Türkiye ilk beşte; ama çayını neredeyse tamamen kendi içer.'],
			['Dünyada kişi başına en çok çay içilen ülke Türkiye’dir.', 'Kişi başı yılda 3 kilogramı aşan tüketimle İrlanda ve İngiltere’nin önünde.', ['Statista: kişi başı çay tüketimi', 'ÇAYKUR']],
			['İngilizcedeki “yogurt” kelimesi Türkçeden geçmiştir.', '“Kiosk” (köşk) ve “turquoise” (Türk taşı) da Batı dillerine aynı yoldan girdi.', ['Oxford English Dictionary: yogurt', 'Nişanyan Sözlük']]),
		ID('dn-id10', 'tarih', 2,
			['Göbeklitepe, Mısır piramitlerinden yaklaşık 500 yıl sonra inşa edildi.', 'Yalan: Göbeklitepe yaklaşık 11.600 yıllık; piramitlerden 7 bin, Stonehenge’den 6 bin yıl kadar eski.'],
			['Bilinen ilk yazılı barış antlaşması Kadeş’in bir kopyası New York’taki BM binasında sergilenir.', 'Hititler ile Mısır arasında MÖ 13. yüzyılda imzalandı; asıl kil tabletlerden biri İstanbul Arkeoloji Müzeleri’nde.', ['Birleşmiş Milletler', 'İstanbul Arkeoloji Müzeleri']],
			['Dünyada ilk madenî parayı, başkenti bugünkü Manisa sınırlarında olan Lidyalılar bastı.', 'MÖ 7. yüzyılda elektrumdan basıldı; başkent Sardes’ti. Zenginliğiyle ünlü Kral Krezüs de Lidyalıydı.', ['Britannica: coin, Lydia', 'Kültür ve Turizm Bakanlığı: Sardes Ören Yeri']]),
		ID('dn-id11', 'sanat', 1,
			['Galata Kulesi’ni Kanuni döneminde Mimar Sinan inşa etti.', 'Yalan: Kule 1348’de Cenevizliler tarafından yapıldı. Hezarfen Ahmed Çelebi’nin buradan kanat takıp uçtuğu anlatılır.'],
			['“Truva” filminde kullanılan dev tahta at bugün Çanakkale sahilinde duruyor.', '2004 yapımı filmin atı şehre hediye edildi; kordonun en çok fotoğraf çekilen köşesi.', ['Çanakkale Valiliği', 'Kültür Portalı']],
			['Türk sinemasına adını veren Yeşilçam, İstanbul Beyoğlu’ndaki bir sokağın adıdır.', 'Film şirketleri bu sokakta toplanınca sokağın adı bütün sektörün adı oldu.', ['Beyoğlu Belediyesi', 'TDK Güncel Türkçe Sözlük: Yeşilçam']]),
		ID('dn-id12', 'eglence', 2,
			['Karagöz ile Hacivat’ın hikâyesi Selçuklu sarayında, Konya’da geçer.', 'Yalan: Rivayete göre ikili Bursa’da, Orhan Gazi döneminde bir cami inşaatında çalışan ustalardı.'],
			['Nasreddin Hoca’nın türbesinin kapısı kilitlidir ama türbenin duvarı yoktur.', 'Hocaya yakışan son şaka: kapıda koca bir kilit, etrafı ise açık. Türbe Konya’nın Akşehir ilçesinde.', ['Akşehir Belediyesi', 'Kültür ve Turizm Bakanlığı']],
			['Noel Baba’ya ilham veren Aziz Nikolaos, bugünkü Antalya’nın Demre ilçesinde piskoposluk yaptı.', 'Antik adıyla Myra. Yoksullara gizlice hediye bıraktığı anlatılır; adına yapılan kilise hâlâ Demre’de.', ['Britannica: Saint Nicholas', 'Kültür ve Turizm Bakanlığı: Aziz Nikolaos Anıt Müzesi']]),
		ID('dn-id13', 'bilim', 2,
			['Türkiye’nin ilk uydusu Türksat 1A, 1994’te yörüngeye oturup yıllarca çalıştı.', 'Yalan: Türksat 1A, Ocak 1994’te fırlatmada roketle birlikte infilak etti. İlk çalışan uydumuz aynı yıl ağustosta fırlatılan Türksat 1B oldu.'],
			['Nobel ödüllü Aziz Sancar, hücrelerin bozulan DNA’yı nasıl onardığını keşfetti.', '2015 Nobel Kimya Ödülü. Mardin Savurlu Sancar, madalyasının aslını Anıtkabir’e bağışladı.', ['NobelPrize.org', 'Anıtkabir Komutanlığı']],
			['Matematikçi Cahit Arf’ın portresi 10 liralık banknotun arka yüzünde yer aldı.', '2009’da çıkan E9 emisyonu 10 TL’de; yanında adını taşıyan “Arf değişmezi” formülü de vardı.', ['TCMB: E9 emisyonu banknotlar', 'TÜBA']]),
		ID('dn-id14', 'cografya', 1,
			['Pamukkale’nin bembeyaz basamakları, Romalıların ördüğü mermer havuzlardır.', 'Yalan: Travertenler tamamen doğal. Sıcak sudaki kireç binlerce yılda çökelip bu basamakları örer; Romalılar yanına Hierapolis’i kurdu.'],
			['Safranbolu adını, bir zamanlar çevresinde bolca yetişen safran çiçeğinden alır.', 'Dünyanın en pahalı baharatı hâlâ burada elle toplanır. Osmanlı konaklarıyla kent 1994’ten beri UNESCO listesinde.', ['UNESCO Dünya Mirası: Safranbolu', 'Karabük Valiliği']],
			['Türkiye’nin tuz ihtiyacının yarısından fazlası Tuz Gölü’nden karşılanır.', 'Yazın göl çekilince dev bir beyaz düzlüğe döner; üstünde yürünür, gün batımı ayna gibi yansır.', ['MTA Genel Müdürlüğü', 'Aksaray Valiliği']]),
		ID('dn-id15', 'tarih', 2,
			['Süleymaniye Camii, Kanuni’nin ölümünden sonra onun anısına yapıldı.', 'Yalan: Cami 1550–1557 arasında, Kanuni hayattayken yapıldı; Kanuni öldüğünde avlusundaki türbesine gömüldü.'],
			['Kanuni Sultan Süleyman, 46 yılla en uzun süre tahtta kalan Osmanlı padişahıdır.', '1520’den 1566’ya kadar. Zigetvar seferinde çadırında öldü; ölümü askerden günlerce saklandı.', ['Türk Tarih Kurumu', 'TDV İslâm Ansiklopedisi: Süleyman I']],
			['Türkçe basılan ilk kitap, 1729’da İbrahim Müteferrika’nın bastığı bir sözlüktür.', 'Vankulu Lügati: iki ciltlik Arapça–Türkçe sözlük. Gutenberg’in matbaasından yaklaşık 280 yıl sonra.', ['TDV İslâm Ansiklopedisi: Vankulu Lügati', 'Millî Kütüphane']]),
		ID('dn-id16', 'spor', 2,
			['Türkiye Avrupa Futbol Şampiyonası’nda hiç yarı final oynamadı.', 'Yalan: Euro 2008’de son dakika dönüşleriyle yarı finale çıktı ve Almanya’ya 3-2 yenildi.'],
			['Türkiye’nin ilk olimpiyat altın madalyası 1936 Berlin’de güreşten geldi.', 'Yaşar Erkan grekoromen stilde kazandı. Güreş o günden beri Türkiye’ye en çok madalya getiren spor.', ['Türkiye Millî Olimpiyat Komitesi', 'Olympics.com']],
			['Dünya Kupası tarihinin en hızlı golünü, 2002’de 11. saniyede Hakan Şükür attı.', 'Güney Kore’ye karşı üçüncülük maçında, başlama vuruşundan 10,8 saniye sonra. Rekor 20 yılı aşkın süre kırılamadı.', ['FIFA', 'Guinness World Records']]),
		ID('dn-id17', 'eglence', 2,
			['Dünyanın en çok fındık üreten ülkesi İtalya, Türkiye ise ikincidir.', 'Yalan: Sıra tam tersi. Türkiye dünya fındığının yaklaşık üçte ikisini tek başına üretir; İtalya ikinci.'],
			['Gaziantep baklavası, Avrupa Birliği’nde coğrafi işaret alan ilk Türk ürünüdür.', '2013’te tescillendi: AB’de “Antep baklavası” adını yalnız Gaziantep’te yapılan baklava kullanabilir.', ['Avrupa Komisyonu: eAmbrosia coğrafi işaret kaydı', 'Türk Patent ve Marka Kurumu']],
			['Dünyadaki kuru kayısının büyük bölümü Türkiye’den, özellikle Malatya’dan çıkar.', 'Dünya kuru kayısı ticaretinin dörtte üçünden fazlası Türkiye’nin; Malatya’nın simgesi de kayısı.', ['FAO: FAOSTAT', 'Malatya Ticaret Borsası']]),
	],
	harfal: [
		H('dn-ha01', 'sanat', 1, 'LALE', 'Osmanlı’da bir döneme adını veren, bugün Hollanda’nın simgesi olmuş çiçek'),
		H('dn-ha02', 'tarih', 1, 'MEHTER', 'Dünyanın en eski askerî bandosu sayılan Osmanlı müzik takımı'),
		H('dn-ha03', 'eglence', 3, 'TÜLBENT', 'İngilizcede laleye adını veren ince, seyrek dokunmuş bez'),
		H('dn-ha04', 'eglence', 2, 'İMECE', 'Köyde bir işin herkesin el birliğiyle, karşılıksız görülmesi'),
		H('dn-ha05', 'eglence', 1, 'MANTI', 'Kayseri’de kırk tanesinin bir kaşığa sığması beklenen hamur işi'),
		H('dn-ha06', 'bilim', 2, 'TELEFERİK', 'Halatlara asılı kabinlerle insanları dağa taşıyan araç'),
		H('dn-ha07', 'spor', 1, 'PEHLİVAN', 'Kırkpınar’da kispet giyip zeytinyağına bulanan güreşçi'),
		H('dn-ha08', 'bilim', 2, 'RASATHANE', 'Gökyüzünü incelemek için kurulan gözlemevinin eski adı; Kandilli’de de bir tane var'),
		H('dn-ha09', 'bilim', 2, 'GÜNDÖNÜMÜ', 'Yılın en uzun ya da en kısa gününün yaşandığı an'),
		H('dn-ha10', 'cografya', 1, 'FINDIK', 'Türkiye’nin dünya üretiminin üçte ikisini karşıladığı, Karadeniz’in kabuklu yemişi'),
		H('dn-ha11', 'eglence', 1, 'ÇAYDANLIK', 'Altında su kaynayan, üstünde demlik duran iki katlı kap'),
		H('dn-ha12', 'tarih', 3, 'HEZARFEN', 'Galata Kulesi’nden kanat takıp uçtuğu anlatılan Ahmed Çelebi’nin “bin fen bilen” lakabı'),
		H('dn-ha13', 'sanat', 1, 'PAMUK', 'Hem tarlada açan beyaz lif hem de Nobel’li yazar Orhan’ın soyadı'),
		H('dn-ha14', 'tarih', 1, 'YILDIRIM', 'Gökte çakan elektrik; Sultan I. Bayezid’in de lakabı'),
		H('dn-ha15', 'cografya', 2, 'ÇINAR', 'Yüzlerce yıl yaşayan, gölgesiyle köy meydanlarının vazgeçilmezi ulu ağaç'),
		H('dn-ha16', 'cografya', 1, 'BOĞAZ', 'İki denizi birbirine bağlayan dar su yolu; lokmalar da buradan geçer'),
		H('dn-ha17', 'sanat', 2, 'MOZAİK', 'Zeugma’daki “Çingene Kızı”nın yapıldığı, küçük renkli taşlarla resim sanatı'),
		H('dn-ha18', 'cografya', 2, 'ISLIK', 'Giresun’un Kuşköy’ünde vadiden vadiye konuşmak için kullanılan ses'),
		H('dn-ha19', 'bilim', 3, 'USTURLAP', 'Yıldızların yüksekliğini ölçüp yön ve saat bulmaya yarayan eski gökbilim aleti'),
	],
	azbilinen: [
		A('dn-ab01', 'cografya', 1, 'Ege Bölgesi’nden bir il söyle',
			[['İzmir', 82], ['Aydın', 46], ['Muğla', 41], ['Denizli', 38], ['Manisa', 33], ['Afyonkarahisar', 15, 'Afyon'], ['Kütahya', 12], ['Uşak', 7]],
			['Balıkesir', 'Çanakkale', 'Antalya', 'Isparta', 'Burdur', 'Bursa', 'Eskişehir', 'Bilecik']),
		A('dn-ab02', 'cografya', 2, 'Türkiye ile kara sınırı olan bir ülke söyle',
			[['Yunanistan', 62], ['Suriye', 58], ['İran', 52], ['Bulgaristan', 48], ['Gürcistan', 44], ['Irak', 41], ['Ermenistan', 36], ['Azerbaycan', 14, 'Nahçıvan']],
			['Rusya', 'Ukrayna', 'Kıbrıs', 'Lübnan', 'Ürdün', 'Romanya', 'Türkmenistan', 'Mısır']),
		A('dn-ab03', 'sanat', 2, 'Mimar Sinan’ın yaptığı bir eser söyle',
			[['Süleymaniye Camii', 78], ['Selimiye Camii', 70], ['Şehzade Camii', 24], ['Mihrimah Sultan Camii', 16], ['Rüstem Paşa Camii', 12], ['Sokollu Mehmed Paşa Camii', 8], ['Haseki Hürrem Sultan Hamamı', 7], ['Kılıç Ali Paşa Camii', 5], ['Büyükçekmece Köprüsü', 4], ['Drina Köprüsü', 3, 'Vişegrad', 'Sokollu Mehmed Paşa Köprüsü']],
			['Sultanahmet Camii', 'Mostar Köprüsü', 'Yeni Cami', 'Ayasofya', 'Dolmabahçe Camii', 'Nuruosmaniye Camii', 'Ortaköy Camii', 'Galata Kulesi']),
		A('dn-ab04', 'cografya', 2, 'Plakası tek haneli (01–09) bir il söyle',
			[['Ankara', 60], ['Adana', 48], ['Antalya', 30], ['Afyonkarahisar', 16, 'Afyon'], ['Adıyaman', 14], ['Aydın', 13], ['Ağrı', 12], ['Amasya', 11], ['Artvin', 9]],
			['Aksaray', 'Ardahan', 'Bursa', 'Bolu', 'Kars', 'Iğdır', 'Osmaniye', 'Burdur']),
		A('dn-ab05', 'tarih', 3, 'UNESCO Dünya Mirası Listesi’nde olan Türkiye’den bir yer söyle',
			[['Kapadokya', 55, 'Göreme'], ['Pamukkale', 50, 'Hierapolis'], ['Efes', 45], ['İstanbul’un Tarihi Alanları', 40], ['Göbeklitepe', 38], ['Truva', 30, 'Troya'], ['Nemrut Dağı', 25], ['Safranbolu', 18], ['Hattuşa', 12], ['Selimiye Camii ve Külliyesi', 11], ['Çatalhöyük', 10], ['Bergama', 9], ['Diyarbakır Kalesi ve Hevsel Bahçeleri', 7], ['Bursa ve Cumalıkızık', 6], ['Afrodisias', 5], ['Ani', 5], ['Divriği Ulu Camii ve Darüşşifası', 4], ['Arslantepe', 3], ['Gordion', 3], ['Ksanthos-Letoon', 2]],
			['Sümela Manastırı', 'Zeugma', 'İshak Paşa Sarayı', 'Aspendos', 'Anıtkabir', 'Ölüdeniz', 'Akdamar Kilisesi', 'Kızkalesi']),
		A('dn-ab06', 'cografya', 2, 'Karadeniz’e kıyısı olan bir il söyle',
			[['Trabzon', 70], ['Samsun', 55], ['Rize', 50], ['Sinop', 35], ['Giresun', 33], ['Ordu', 30], ['Zonguldak', 25], ['Artvin', 18], ['Kastamonu', 15], ['İstanbul', 14], ['Bartın', 10], ['Düzce', 6], ['Sakarya', 6], ['Kocaeli', 5], ['Kırklareli', 3]],
			['Tokat', 'Amasya', 'Gümüşhane', 'Bayburt', 'Bolu', 'Karabük', 'Tekirdağ', 'Edirne', 'Çorum']),
		A('dn-ab07', 'tarih', 2, 'Bir Osmanlı padişahının adını söyle',
			[['Mehmed', 55, 'Mehmet', 'Fatih'], ['Süleyman', 50, 'Kanuni'], ['Selim', 45, 'Yavuz'], ['Osman', 42], ['Murad', 30, 'Murat'], ['Abdülhamid', 28, 'Abdülhamit'], ['Orhan', 25], ['Bayezid', 22, 'Beyazıt', 'Bayezit'], ['Mahmud', 12, 'Mahmut'], ['Ahmed', 10, 'Ahmet'], ['Mustafa', 8], ['Abdülmecid', 6, 'Abdülmecit'], ['Abdülaziz', 6], ['İbrahim', 6]],
			['Ertuğrul', 'Cem', 'Alparslan', 'Kılıçarslan', 'Korkut', 'Alaeddin', 'Tuğrul', 'Melikşah']),
		A('dn-ab08', 'bilim', 3, 'Ay’a ayak basmış bir astronot söyle',
			[['Neil Armstrong', 85], ['Buzz Aldrin', 40], ['Alan Shepard', 6], ['Eugene Cernan', 4], ['Pete Conrad', 3], ['Alan Bean', 3], ['John Young', 3], ['Edgar Mitchell', 2], ['David Scott', 2], ['James Irwin', 2], ['Charles Duke', 2], ['Harrison Schmitt', 2]],
			['Michael Collins', 'Yuri Gagarin', 'Jim Lovell', 'John Glenn', 'Valentina Tereşkova', 'Alper Gezeravcı']),
		A('dn-ab09', 'bilim', 1, 'Halkası olan bir gezegen söyle',
			[['Satürn', 88], ['Jüpiter', 14], ['Uranüs', 12], ['Neptün', 9]],
			['Mars', 'Venüs', 'Merkür', 'Dünya', 'Plüton']),
		A('dn-ab10', 'spor', 1, 'Olimpiyat halkalarındaki renklerden birini söyle',
			[['Kırmızı', 60], ['Mavi', 55], ['Sarı', 45], ['Yeşil', 40], ['Siyah', 30]],
			['Beyaz', 'Turuncu', 'Mor', 'Kahverengi', 'Pembe']),
		A('dn-ab11', 'sanat', 2, 'Orhan Pamuk’un bir romanını söyle',
			[['Benim Adım Kırmızı', 42], ['Masumiyet Müzesi', 38], ['Kar', 35], ['Kara Kitap', 20], ['Beyaz Kale', 15], ['Kırmızı Saçlı Kadın', 12], ['Kafamda Bir Tuhaflık', 10], ['Veba Geceleri', 9], ['Sessiz Ev', 7], ['Yeni Hayat', 6], ['Cevdet Bey ve Oğulları', 5]],
			['İnce Memed', 'Tutunamayanlar', 'Saatleri Ayarlama Enstitüsü', 'Huzur', 'Kürk Mantolu Madonna', 'Çalıkuşu', 'Puslu Kıtalar Atlası', 'Aşk-ı Memnu']),
	],
};
