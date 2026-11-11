// YENİ 10 · deneme grubu 2 (kırmızı rozetli yeni tipler; galerinin en üstünde). Sözleşme deneme.js ile aynı:
// TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri timing.js PROFILE'a bu dosyadan eklenir (Object.assign).
//
//   balon   Balon Patlat   gökyüzüne yükselen yazılı balonlardan kurala uyanları patlat (15 sn'lik aksiyon turu)
//   kazi    Kazı Kazan     metal folyoyu kazı, altındaki yapıyı bil; az kazıyan çok kazanır, cevapta para kalanı kendisi kazır
//
// Örnekler elle yazıldı. Balon bilgileri test/yeni2.test.mjs'te oyunun verisiyle sınanır. Kazı Kazan'ın 99 sorusu
// src/data/ek/kazi.js'te (görseller dist/yapi/; test: görsel var, plaka il adıyla tutarlı, şıklar tekil).

import { PROFILE } from './timing.js';
import { balon } from './d_balon.js';
import { kazi } from './d_kazi.js';
import { KAZI_SORULAR } from '../data/ek/kazi.js';

// süre profilleri (d_ortak.js stamp → timing.js formülü): Balon sabit 16 sn'lik tur; Kazı Kazan görsel tanıma + kazıma
Object.assign(PROFILE, {
	balon: { min: 16, max: 16, think: [0, 0], round: true }, // sabit tur: balonlar 0,7–14,8 sn arası uçar
	kazi: { min: 20, max: 30, think: [3, 1.5] }, // kazı, bak, dört yapıyı zihinde karşılaştır
});

export const TYPES = { balon, kazi };
export const ORDER = [
	['balon', 'Balon Patlat', 'Kurala uyan balonları patlat, yanlışı söndür'],
	['kazi', 'Kazı Kazan', 'Folyoyu kazı, yapıyı bil: az kazıyan kazanır'],
];

// not: cevapta görünen tek satır açıklama (tuzaklar neden yanlış, şaşırtıcı doğrular neden doğru)
const BL = (id, cat, diff, q, dogru, yanlis, tema, ufuk, not = '') => ({ id, cat, diff, type: 'balon', q, dogru, yanlis, tema, ufuk, not });

export const SAMPLES = {
	balon: [
		// Kural her balonda kesin: ya kesinlikle uyar ya kesinlikle uymaz (sınırda kalan hiçbir şey yok: iki bölgeye taşan il,
		// iki anlamlı ad, tartışmalı sınıf, sonradan değişebilecek bilgi). Tuzaklar kurala en çok benzeyen, akla ilk gelen yanlışlar.
		// Bilgiler test/yeni2.test.mjs'te oyunun verisiyle (turkiye.json: bölge, il adları) ve elle yazılmış tablolarla sınanır.
		// ---------------------------------------------------------------- coğrafya
		// Ege'nin dört iç ili; tuzaklar Ege'ye komşu başka bölge illeri. Kıyısı Ege'ye bakan Balıkesir ve Çanakkale bilerek yok
		// (Marmara'da sayılır ama "Ege'de" denebilir: tartışmaya açık balon olmaz)
		BL('yn-balon-1', 'cografya', 1, 'Ege Bölgesi’ndeki illeri patlat!', ['Manisa', 'Uşak', 'Kütahya', 'Denizli'], ['Antalya', 'Bursa', 'Eskişehir', 'Konya', 'Tekirdağ'], 'gunduz', 'ege', 'Antalya Akdeniz’de, Bursa ve Tekirdağ Marmara’da, Eskişehir ve Konya İç Anadolu’da.'),
		// Karadeniz'e kıyısı olan altı ülkeden dördü (Türkiye ve Rusya yok); tuzaklar bölgenin denize kıyısı olmayan ya da başka denize bakan ülkeleri
		BL('yn-balon-4', 'cografya', 2, 'Karadeniz’e kıyısı olan ülkeleri patlat!', ['Bulgaristan', 'Romanya', 'Ukrayna', 'Gürcistan'], ['Moldova', 'Yunanistan', 'Ermenistan', 'Azerbaycan', 'Sırbistan'], 'batim', 'kiyi', 'Karadeniz’e kıyısı olan altı ülke: Türkiye, Bulgaristan, Romanya, Ukrayna, Rusya, Gürcistan.'),
		// Akdeniz kıyısındaki dört il (iki denize bakan Muğla bilerek yok); tuzaklar Akdeniz Bölgesi'nin ve komşularının denizsiz illeri (Kahramanmaraş 13 harf: balona sığmaz)
		BL('yn-balon-5', 'cografya', 1, 'Akdeniz’e kıyısı olan illeri patlat!', ['Antalya', 'Mersin', 'Adana', 'Hatay'], ['Isparta', 'Burdur', 'Karaman', 'Gaziantep', 'Niğde'], 'gunduz', 'ege', 'Isparta, Burdur ve Karaman Akdeniz Bölgesi’nde ama denize kıyısı yok.'),
		// kara sınırı: Nahçıvan'dan Azerbaycan ve kapalı sınırlı Ermenistan dahil; tuzaklar yalnız denizden komşu ya da yakın ülkeler
		BL('yn-balon-6', 'cografya', 2, 'Türkiye’yle kara sınırı olan ülkeleri patlat!', ['Bulgaristan', 'Ermenistan', 'İran', 'Azerbaycan'], ['Rusya', 'Romanya', 'Lübnan', 'Ürdün', 'Türkmenistan'], 'safak', 'kapadokya', 'Azerbaycan’la sınır Nahçıvan’dan geçer; Rusya, Romanya ve Lübnan’la kara sınırı yok.'),
		// Afrika ülkeleri; tuzaklar Arap Yarımadası ve Güney Asya'dan (iki kıtaya yayılan ülke yok)
		BL('yn-balon-7', 'cografya', 1, 'Afrika’daki ülkeleri patlat!', ['Fas', 'Kenya', 'Nijerya', 'Etiyopya'], ['Yemen', 'Umman', 'Sri Lanka', 'Pakistan', 'Suriye'], 'batim', 'kiyi', 'Yemen ve Umman Arap Yarımadası’nda, Sri Lanka ve Pakistan Güney Asya’da.'),
		// başkent en kalabalık şehir değil (Ankara/İstanbul, Canberra/Sidney, Ottawa/Toronto, Brasília/São Paulo); tuzakların başkenti
		// aynı zamanda en kalabalık şehri. Başkenti tartışmalı (İsviçre) ya da taşınmakta (Mısır) olan ülke yok
		BL('yn-balon-8', 'cografya', 3, 'Başkenti en kalabalık şehri olmayan ülkeleri patlat!', ['Türkiye', 'Avustralya', 'Kanada', 'Brezilya'], ['Fransa', 'Japonya', 'Rusya', 'Arjantin', 'Yunanistan'], 'gece', 'istanbul', 'Ankara–İstanbul, Canberra–Sidney, Ottawa–Toronto, Brasília–São Paulo.'),
		// Karadeniz'e kıyısı olan 15 ilden şaşırtanlar (İğneada, Akçakoca, Amasra); tuzaklar Karadeniz Bölgesi'nin denizsiz illeri (Bolu 1999'dan beri)
		BL('yn-balon-9', 'cografya', 3, 'Karadeniz’e kıyısı olan illeri patlat!', ['Kırklareli', 'Düzce', 'Bartın', 'Sinop'], ['Bolu', 'Karabük', 'Amasya', 'Gümüşhane', 'Tokat'], 'safak', 'kapadokya', 'Kırklareli İğneada’dan, Düzce Akçakoca’dan kıyı; Bolu, Düzce ayrılınca kıyısız kaldı.'),
		// ---------------------------------------------------------------- tarih
		// Osmanlı padişahları; tuzaklar Selçuklu, Timurlu ve Babürlü hükümdarlar
		BL('yn-balon-10', 'tarih', 1, 'Osmanlı padişahlarını patlat!', ['Fatih', 'Kanuni', 'Yavuz Selim', 'Yıldırım Bayezid'], ['Alparslan', 'Melikşah', 'Tuğrul Bey', 'Timur', 'Babür Şah'], 'gece', 'istanbul', 'Alparslan, Melikşah ve Tuğrul Bey Selçuklu; Timur Timurlu, Babür Şah Babürlü.'),
		// Kurtuluş Savaşı (1919–1922) muharebeleri; tuzaklar Çanakkale (I. Dünya Savaşı) ve Selçuklu, Osmanlı meydan savaşları
		BL('yn-balon-11', 'tarih', 2, 'Kurtuluş Savaşı’nın muharebelerini patlat!', ['Sakarya', 'Dumlupınar', 'İnönü'], ['Çanakkale', 'Malazgirt', 'Mohaç', 'Preveze', 'Kosova', 'Niğbolu'], 'batim', 'kiyi', 'Çanakkale I. Dünya Savaşı’nda (1915); Malazgirt 1071, Mohaç 1526, Preveze 1538.'),
		// Fatih'in fethettikleri (1453 İstanbul, 1461 Trabzon, 1463 Bosna); tuzaklar Fatih'in kuşattığı ama alamadığı Belgrad (1456) ve
		// Rodos (1480), sonraki padişahların fetihleri ve hiç alınamayan Viyana
		BL('yn-balon-12', 'tarih', 3, 'Fatih Sultan Mehmet’in fethettiği yerleri patlat!', ['İstanbul', 'Trabzon', 'Bosna'], ['Belgrad', 'Rodos', 'Mısır', 'Kıbrıs', 'Bağdat', 'Viyana'], 'gece', 'istanbul', 'Fatih, Belgrad’ı (1456) ve Rodos’u (1480) kuşattı ama alamadı.'),
		// Atatürk dönemi inkılapları (1925–1934); tuzaklar Osmanlı'nın yenileşme hareketleri
		BL('yn-balon-13', 'tarih', 1, 'Atatürk döneminde yapılan inkılapları patlat!', ['Harf İnkılabı', 'Soyadı Kanunu', 'Şapka Kanunu', 'Medeni Kanun'], ['Tanzimat Fermanı', 'Islahat Fermanı', 'Kanun-i Esasi', 'Nizam-ı Cedid', 'Sened-i İttifak'], 'gunduz', 'ege', 'Tanzimat 1839, Islahat 1856, Kanun-i Esasi 1876: hepsi Osmanlı döneminde.'),
		// Anadolu'da kurulan uygarlıklar; tuzaklar Mezopotamya, Doğu Akdeniz ve Amerika uygarlıkları
		BL('yn-balon-14', 'tarih', 2, 'Anadolu’da kurulan uygarlıkları patlat!', ['Hititler', 'Frigler', 'Lidyalılar', 'Urartular'], ['Sümerler', 'Babilliler', 'Fenikeliler', 'Mayalar', 'Aztekler'], 'safak', 'kapadokya', 'Sümer ve Babil Mezopotamya’da, Fenikeliler Lübnan kıyısında, Maya ve Aztek Amerika’da.'),
		// I. Dünya Savaşı'nda İtilaf Devletleri; tuzaklar İttifak Devletleri ve savaşta tarafsız kalan ülkeler
		BL('yn-balon-15', 'tarih', 2, 'I. Dünya Savaşı’nda İtilaf Devletleri’ni patlat!', ['İngiltere', 'Fransa', 'Rusya', 'Sırbistan'], ['Almanya', 'Bulgaristan', 'Osmanlı', 'İspanya', 'İsviçre'], 'batim', 'kiyi', 'Almanya, Bulgaristan ve Osmanlı İttifak’taydı; İspanya ve İsviçre tarafsız kaldı.'),
		// Antik dünyanın yedi harikasından dördü (ikisi Anadolu'da: Efes, Bodrum); tuzaklar "yeni yedi harika" ve ünlü antik yapılar
		BL('yn-balon-16', 'tarih', 3, 'Antik dünyanın yedi harikasını patlat!', ['Artemis Tapınağı', 'Halikarnas Mozolesi', 'Keops Piramidi', 'İskenderiye Feneri'], ['Kolezyum', 'Çin Seddi', 'Partenon', 'Stonehenge', 'Ayasofya'], 'safak', 'kapadokya', 'Artemis Tapınağı Efes’te, Halikarnas Mozolesi Bodrum’da; Kolezyum yeni yedi harikada.'),
		// ---------------------------------------------------------------- bilim
		// gün batımı, uçurum ve fener: denizde yaşayan memeliler, uçan memeli, yumurtlayan memeli; tuzaklar kuş, balık, sürüngen
		BL('yn-balon-2', 'bilim', 2, 'Memeli hayvanları patlat!', ['Yunus', 'Yarasa', 'Balina', 'Ornitorenk'], ['Penguen', 'Köpek balığı', 'Timsah', 'Kurbağa', 'Deniz atı'], 'batim', 'kiyi', 'Yunus ve balina denizde yaşayan, yarasa uçan, ornitorenk yumurtlayan memeli.'),
		// asal sayılar; tuzaklar asal sanılan bileşikler (51 = 3·17, 57 = 3·19, 91 = 7·13), 1 ve 9
		BL('yn-balon-17', 'bilim', 3, 'Asal sayıları patlat!', ['2', '23', '41', '59'], ['1', '9', '51', '57', '91'], 'gece', 'istanbul', '51 = 3 × 17, 57 = 3 × 19, 91 = 7 × 13; 1 asal sayılmaz.'),
		// Güneş Sistemi'nin gezegenleri; tuzaklar cüce gezegenler (Plüton, Ceres), uydular (Ay, Titan) ve yıldız
		BL('yn-balon-18', 'bilim', 1, 'Güneş Sistemi’nin gezegenlerini patlat!', ['Merkür', 'Venüs', 'Satürn', 'Neptün'], ['Plüton', 'Ay', 'Titan', 'Ceres', 'Güneş'], 'gece', 'stad', 'Plüton ve Ceres cüce gezegen, Ay ve Titan uydu, Güneş yıldız.'),
		// soy gazlar (18. grup); tuzaklar oda sıcaklığında gaz olan öteki elementler
		BL('yn-balon-19', 'bilim', 2, 'Soy gazları patlat!', ['Helyum', 'Neon', 'Argon', 'Ksenon'], ['Hidrojen', 'Azot', 'Oksijen', 'Klor', 'Flor'], 'gece', 'stad', 'Soy gazlar 18. grupta; hidrojen, azot, oksijen, klor ve flor öteki gruplarda.'),
		// sürüngenler; tuzaklar iki yaşamlılar (kurbağa, semender), balıklar (yılan balığı, köpek balığı) ve kuş
		BL('yn-balon-20', 'bilim', 2, 'Sürüngenleri patlat!', ['Kaplumbağa', 'Bukalemun', 'Timsah', 'Yılan'], ['Kurbağa', 'Semender', 'Yılan balığı', 'Deve kuşu', 'Köpek balığı'], 'gunduz', 'ege', 'Kurbağa ve semender iki yaşamlı, yılan balığı ve köpek balığı balık.'),
		// uçamayan kuşlar; tuzaklar uçan kuşlar ve uçan ama kuş olmayan yarasa
		BL('yn-balon-21', 'bilim', 1, 'Uçamayan kuşları patlat!', ['Penguen', 'Deve kuşu', 'Kivi', 'Emu'], ['Kartal', 'Albatros', 'Kolibri', 'Flamingo', 'Yarasa'], 'batim', 'kiyi', 'Kartal, albatros, kolibri, flamingo uçar; yarasa da uçar ama kuş değil, memeli.'),
		// sembolü tek harf: K, S, N, I; tuzaklar iki harfli semboller (Na, Ca, Cl, Fe, Co)
		BL('yn-balon-22', 'bilim', 3, 'Sembolü tek harf olan elementleri patlat!', ['Potasyum', 'Kükürt', 'Azot', 'İyot'], ['Sodyum', 'Kalsiyum', 'Klor', 'Demir', 'Kobalt'], 'safak', 'kapadokya', 'Potasyum K, kükürt S, azot N, iyot I; sodyum Na, klor Cl, demir Fe.'),
		// ---------------------------------------------------------------- sanat
		// gece İstanbul: Sinan'ın çıraklık, kalfalık, ustalık eserleri ve Rüstem Paşa; Selimiye adı Edirne'yle (Üsküdar'daki Selimiye
		// III. Selim'in camisi). Tuzaklar Sinan'dan önce (Üç Şerefeli, Bursa Ulu) ya da sonra (Sultanahmet, Nuruosmaniye, Balyanlar) yapılanlar
		BL('yn-balon-3', 'sanat', 3, 'Mimar Sinan’ın yaptığı camileri patlat!', ['Edirne Selimiye', 'Süleymaniye', 'Şehzade', 'Rüstem Paşa'], ['Sultanahmet', 'Nuruosmaniye', 'Ortaköy', 'Üç Şerefeli', 'Bursa Ulu', 'Dolmabahçe'], 'gece', 'istanbul', 'Sultanahmet’i Sedefkâr Mehmed Ağa yaptı; Üç Şerefeli ve Bursa Ulu, Sinan’dan önce.'),
		// Orhan Pamuk'un romanları; tuzaklar başka yazarların ünlü romanları
		BL('yn-balon-23', 'sanat', 2, 'Orhan Pamuk’un romanlarını patlat!', ['Kar', 'Kara Kitap', 'Sessiz Ev', 'Beyaz Kale'], ['İnce Memed', 'Çalıkuşu', 'Yaban', 'Huzur', 'Aşk-ı Memnu'], 'gece', 'istanbul', 'İnce Memed Yaşar Kemal’in, Çalıkuşu Reşat Nuri’nin, Huzur Tanpınar’ın romanı.'),
		// Türk ressamlar; tuzaklar dünyaca ünlü yabancı ressamlar
		BL('yn-balon-24', 'sanat', 1, 'Türk ressamları patlat!', ['Osman Hamdi', 'Abidin Dino', 'Fikret Mualla', 'Bedri Rahmi'], ['Van Gogh', 'Picasso', 'Dalí', 'Monet', 'Rembrandt'], 'gunduz', 'ege', 'Kaplumbağa Terbiyecisi Osman Hamdi’nin; Van Gogh Hollandalı, Picasso İspanyol.'),
		// divan şairleri; tuzaklar halk şairleri (âşıklar) ve Cumhuriyet dönemi şairleri
		BL('yn-balon-25', 'sanat', 2, 'Divan şairlerini patlat!', ['Fuzuli', 'Baki', 'Nedim', 'Şeyh Galip'], ['Karacaoğlan', 'Âşık Veysel', 'Orhan Veli', 'Nazım Hikmet', 'Dadaloğlu'], 'safak', 'kapadokya', 'Karacaoğlan, Âşık Veysel, Dadaloğlu halk ozanı; Orhan Veli Cumhuriyet şairi.'),
		// besteciler (ikisi Türk musikisinden: Itri, Dede Efendi); tuzaklar ressam, heykeltıraş ve yazarlar
		BL('yn-balon-26', 'sanat', 3, 'Besteci olanları patlat!', ['Mozart', 'Chopin', 'Itri', 'Dede Efendi'], ['Rembrandt', 'Goethe', 'Rodin', 'Dante', 'Cervantes'], 'gece', 'stad', 'Itri ve Dede Efendi Türk musikisi bestecisi; Rodin heykeltıraş, Goethe şair.'),
		// Shakespeare'in oyunları; tuzaklar başka yazarların oyun ve romanları
		BL('yn-balon-27', 'sanat', 1, 'Shakespeare’in oyunlarını patlat!', ['Hamlet', 'Othello', 'Macbeth', 'Kral Lear'], ['Faust', 'Cimri', 'Martı', 'Don Kişot', 'Sefiller'], 'batim', 'kiyi', 'Faust Goethe’nin, Cimri Molière’in, Martı Çehov’un; Don Kişot ve Sefiller roman.'),
		// Leonardo'nun eserleri; tuzaklar Van Gogh, Munch, Picasso, Rodin, Botticelli, Vermeer
		BL('yn-balon-28', 'sanat', 2, 'Leonardo da Vinci’nin eserlerini patlat!', ['Mona Lisa', 'Son Akşam Yemeği', 'Vitruvius Adamı'], ['Yıldızlı Gece', 'Çığlık', 'Guernica', 'Düşünen Adam', 'Venüs’ün Doğuşu', 'İnci Küpeli Kız'], 'gece', 'istanbul', 'Yıldızlı Gece Van Gogh’un, Çığlık Munch’un, Guernica Picasso’nun eseri.'),
		// ---------------------------------------------------------------- spor
		// olimpiyat altını: Naim (1988, 1992, 1996), Taha Akgül (2016), Mete Gazoz ve Busenaz Sürmeneli (2020); tuzaklar olimpiyatta
		// gümüş/bronz alanlar (Nur Tatar, Rıza Kayaalp, Yusuf Dikeç) ve olimpiyata hiç gitmeyen yıldızlar
		BL('yn-balon-29', 'spor', 2, 'Olimpiyat şampiyonu Türk sporcuları patlat!', ['Naim Süleymanoğlu', 'Taha Akgül', 'Mete Gazoz', 'Busenaz Sürmeneli'], ['Nur Tatar', 'Rıza Kayaalp', 'Yusuf Dikeç', 'Hakan Şükür', 'Hidayet Türkoğlu'], 'gece', 'stad', 'Naim üç kez şampiyon; Nur Tatar, Rıza Kayaalp, Yusuf Dikeç madalya aldı ama altın değil.'),
		// basketbol terimleri; tuzaklar futbol ve voleybol terimleri (basketbolda servis, penaltı, ofsayt yok)
		BL('yn-balon-30', 'spor', 1, 'Basketbol terimlerini patlat!', ['Ribaund', 'Turnike', 'Smaç', 'Üçlük'], ['Ofsayt', 'Korner', 'Penaltı', 'Taç atışı', 'Servis'], 'gece', 'stad', 'Ofsayt, korner, penaltı ve taç atışı futbolda; servis voleybolda.'),
		// tenisin dört Grand Slam'i; tuzaklar ünlü ama Grand Slam olmayan turnuvalar
		BL('yn-balon-31', 'spor', 2, 'Grand Slam tenis turnuvalarını patlat!', ['Wimbledon', 'Roland Garros', 'ABD Açık', 'Avustralya Açık'], ['Davis Kupası', 'Monte Carlo', 'Indian Wells', 'ATP Finalleri', 'Miami Açık'], 'gunduz', 'ege', 'Dört Grand Slam: Avustralya Açık, Roland Garros, Wimbledon, ABD Açık.'),
		// sahada takım başına 11 oyuncu; tuzaklar hentbol ve su topu (7), voleybol ve buz hokeyi (6), ragbi (15 ya da 13)
		BL('yn-balon-32', 'spor', 3, 'Sahada takım başına 11 oyuncu olan sporları patlat!', ['Futbol', 'Kriket', 'Çim hokeyi', 'Amerikan futbolu'], ['Hentbol', 'Su topu', 'Ragbi', 'Buz hokeyi', 'Voleybol'], 'gece', 'stad', 'Hentbol ve su topunda 7, voleybol ve buz hokeyinde 6, ragbide 15 ya da 13 oyuncu.'),
		// F1 dünya şampiyonları; tuzaklar şampiyonluğu kıl payı kaçıran (Massa 2008), şampiyon olamayan F1 pilotları ve motosikletçiler
		BL('yn-balon-33', 'spor', 3, 'Formula 1 dünya şampiyonlarını patlat!', ['Lewis Hamilton', 'Ayrton Senna', 'Fernando Alonso', 'Michael Schumacher'], ['Felipe Massa', 'David Coulthard', 'Rubens Barrichello', 'Valentino Rossi', 'Kenan Sofuoğlu'], 'batim', 'kiyi', 'Massa 2008’de şampiyonluğu son yarışta kaçırdı; Rossi ve Sofuoğlu motosikletçi.'),
		// raketle oynanan sporlar; tuzaklar sopayla, istekayla ya da tokmakla oynananlar
		BL('yn-balon-34', 'spor', 1, 'Raketle oynanan sporları patlat!', ['Tenis', 'Badminton', 'Squash', 'Masa tenisi'], ['Golf', 'Kriket', 'Beyzbol', 'Bilardo', 'Polo'], 'gunduz', 'ege', 'Golf, kriket, beyzbol ve polo sopayla, bilardo isteka ile oynanır.'),
		// satranç taşları; tuzaklar satrançta olmayan taş adları (joker iskambilden, okçu ve topçu savaş oyunlarından; halk
		// ağzındaki "asker", "kral", "kraliçe" bilerek yok: piyon, şah, vezir sanılır)
		BL('yn-balon-35', 'spor', 2, 'Satranç taşlarını patlat!', ['Vezir', 'Fil', 'At', 'Kale'], ['Prens', 'Okçu', 'Joker', 'Bekçi', 'Topçu'], 'safak', 'kapadokya', 'Satrançta şah, vezir, kale, fil, at ve piyon var; prens, okçu, joker yok.'),
		// ---------------------------------------------------------------- genel kültür
		// Nobel ödüllüler (Einstein 1921, Marie Curie 1903 ve 1911, Orhan Pamuk 2006, Aziz Sancar 2015); tuzaklar hiç Nobel almamış
		// ve artık alamayacak ünlü adlar
		BL('yn-balon-36', 'eglence', 2, 'Nobel Ödülü kazananları patlat!', ['Einstein', 'Marie Curie', 'Orhan Pamuk', 'Aziz Sancar'], ['Nikola Tesla', 'Edison', 'Tolstoy', 'Hawking', 'Yaşar Kemal'], 'gece', 'istanbul', 'Tesla, Edison, Tolstoy, Hawking ve Yaşar Kemal hiç Nobel almadı.'),
		// para birimi Euro olanlar (Hırvatistan 2023'ten beri); tuzaklar AB üyesi olup kendi parasını kullananlar ve İsviçre
		BL('yn-balon-37', 'eglence', 3, 'Para birimi Euro olan ülkeleri patlat!', ['Hırvatistan', 'Yunanistan', 'İrlanda', 'Portekiz'], ['İsviçre', 'Danimarka', 'Polonya', 'İsveç', 'Macaristan'], 'gunduz', 'ege', 'Hırvatistan 2023’te Euro’ya geçti; İsviçre, Danimarka, İsveç kendi parasını kullanır.'),
		// bayrağında hilal olanlar; tuzaklar yıldızlı, kartallı, kılıçlı, sedirli bayraklar
		BL('yn-balon-38', 'eglence', 3, 'Bayrağında hilal olan ülkeleri patlat!', ['Pakistan', 'Tunus', 'Azerbaycan', 'Malezya'], ['Mısır', 'Fas', 'Suudi Arabistan', 'Ürdün', 'Lübnan'], 'batim', 'kiyi', 'Mısır bayrağında kartal, Fas ve Ürdün’de yıldız, Lübnan’da sedir ağacı var.'),
		// tatlılar; tuzaklar sofranın tuzlu yemekleri
		BL('yn-balon-39', 'eglence', 1, 'Tatlıları patlat!', ['Künefe', 'Sütlaç', 'Kazandibi', 'Revani'], ['Mantı', 'Lahmacun', 'Menemen', 'Cacık', 'İçli köfte'], 'safak', 'kapadokya', 'Mantı, lahmacun, menemen, cacık ve içli köfte tuzlu yemek.'),
		// Pixar filmleri; tuzaklar DreamWorks, Blue Sky ve Disney'in kendi çizgi filmleri
		BL('yn-balon-40', 'eglence', 2, 'Pixar filmlerini patlat!', ['Arabalar', 'Ratatuy', 'Yukarı Bak', 'WALL-E'], ['Şrek', 'Madagaskar', 'Buz Devri', 'Aslan Kral', 'Karlar Ülkesi'], 'gece', 'stad', 'Şrek ve Madagaskar DreamWorks’ün, Buz Devri Blue Sky’ın, Aslan Kral Disney’in.'),
		// Kemal Sunal'ın filmleri; tuzaklar Şener Şen, Cem Yılmaz ve Yılmaz Erdoğan'ın ünlü filmleri
		BL('yn-balon-41', 'eglence', 2, 'Kemal Sunal’ın oynadığı filmleri patlat!', ['Kibar Feyzo', 'Tosun Paşa', 'Davaro', 'Süt Kardeşler'], ['Vizontele', 'G.O.R.A.', 'Eşkıya', 'Muhsin Bey', 'Yahşi Batı'], 'gunduz', 'ege', 'Eşkıya’da Şener Şen, G.O.R.A.’da Cem Yılmaz, Vizontele’de Yılmaz Erdoğan oynadı.'),
		// gökkuşağının yedi renginden dördü; tuzaklar gökkuşağında olmayan renkler
		BL('yn-balon-42', 'eglence', 1, 'Gökkuşağının renklerini patlat!', ['Turuncu', 'Yeşil', 'Mor', 'Sarı'], ['Pembe', 'Kahverengi', 'Gri', 'Siyah', 'Beyaz'], 'gunduz', 'ege', 'Gökkuşağı: kırmızı, turuncu, sarı, yeşil, mavi, lacivert, mor.'),
		// ================================================================ ek 58 soru (43–100): bankanın tek-çıkar (odd), eşleştirme,
		// az bilinen ve Yıldırım sorularında sorulan kümeler bilerek yok; her balonun bilgisi kendi notunda.
		// ---------------------------------------------------------------- coğrafya
		// denize kıyısı olmayanlar; tuzaklar kıyısı çok kısa olanlar (Slovenya ~47 km, Bosna-Hersek Neum ~20 km, Belçika ~66 km,
		// Irak Fav ~58 km) ve Karadeniz’e bakan Gürcistan. Hazar’a kıyısı olan (göl mü deniz mi tartışmalı) ülke yok
		BL('yn-balon-43', 'cografya', 3, 'Denize kıyısı olmayan ülkeleri patlat!', ['Macaristan', 'Afganistan', 'Nepal', 'Çad'], ['Slovenya', 'Bosna-Hersek', 'Belçika', 'Irak', 'Gürcistan'], 'batim', 'kiyi', 'Slovenya, Bosna-Hersek, Belçika ve Irak’ın kısa da olsa deniz kıyısı var.'),
		// And Dağları yedi ülkeden geçer (Venezuela, Kolombiya, Ekvador, Peru, Bolivya, Şili, Arjantin); tuzaklar Güney Amerika’nın
		// dağlardan uzak doğu yakası
		BL('yn-balon-44', 'cografya', 2, 'And Dağları’nın geçtiği ülkeleri patlat!', ['Şili', 'Peru', 'Bolivya', 'Kolombiya'], ['Brezilya', 'Uruguay', 'Paraguay', 'Guyana', 'Surinam'], 'gunduz', 'ege', 'And Dağları yedi ülkeden geçer; Brezilya, Uruguay, Paraguay ve Guyana’ya uğramaz.'),
		// tamamı Ekvator’un güneyinde; tuzakların tamamı kuzeyde ama Ekvator’a yakın (Venezuela en güneyde ~0,6° K, Etiyopya ~3,4° K)
		BL('yn-balon-45', 'cografya', 2, 'Tamamı Güney Yarımküre’de olan ülkeleri patlat!', ['Arjantin', 'Avustralya', 'Yeni Zelanda', 'Madagaskar'], ['Venezuela', 'Sri Lanka', 'Nijerya', 'Etiyopya', 'Filipinler'], 'batim', 'kiyi', 'Venezuela, Sri Lanka, Nijerya, Etiyopya ve Filipinler’in tamamı Ekvator’un kuzeyinde.'),
		// Türkiye 783.562 km²; doğrular Mısır ~1,0 milyon, İran ~1,65 milyon, Tanzanya ~947 bin, Pakistan ~882 bin (Keşmir’siz de
		// ~796 bin); tuzaklar Ukrayna ~604, İspanya ~506, Zambiya ~753, Myanmar ~677, Japonya ~378 bin km². Antarktika’da toprak
		// iddiası olan Fransa ve Şili bilerek yok
		BL('yn-balon-46', 'cografya', 3, 'Yüzölçümü Türkiye’den büyük olan ülkeleri patlat!', ['Mısır', 'İran', 'Pakistan', 'Tanzanya'], ['Ukrayna', 'İspanya', 'Zambiya', 'Myanmar', 'Japonya'], 'gunduz', 'ege', 'Türkiye 784 bin km²; Ukrayna 604, İspanya 506, Japonya 378 bin km² ile daha küçük.'),
		// Rusya’nın kara komşuları; Polonya ve Litvanya Kaliningrad’dan, Kuzey Kore Tumen ağzında ~17 km. Tuzaklar Rusya’ya yakın ama
		// sınırı olmayanlar
		BL('yn-balon-47', 'cografya', 3, 'Rusya’yla kara sınırı olan ülkeleri patlat!', ['Norveç', 'Kuzey Kore', 'Moğolistan', 'Polonya'], ['İsveç', 'Ermenistan', 'Özbekistan', 'Romanya', 'Türkmenistan'], 'safak', 'kapadokya', 'Polonya’yla sınır Kaliningrad’dan geçer; İsveç ve Ermenistan’ın Rusya’yla sınırı yok.'),
		// Nil (Beyaz Nil) Viktorya Gölü’nden Uganda’da çıkar, Güney Sudan ve Sudan’dan geçip Mısır’da Akdeniz’e dökülür. Mavi Nil’in
		// ülkesi Etiyopya ve Viktorya kıyısındaki Kenya, Tanzanya bilerek yok; tuzaklar Kuzey ve Doğu Afrika’nın Nil’siz ülkeleri
		BL('yn-balon-48', 'cografya', 2, 'Nil Nehri’nin içinden geçtiği ülkeleri patlat!', ['Mısır', 'Sudan', 'Güney Sudan', 'Uganda'], ['Libya', 'Çad', 'Somali', 'Cezayir', 'Tunus'], 'batim', 'kiyi', 'Nil, Viktorya Gölü’nden çıkar; Uganda, Güney Sudan, Sudan ve Mısır’dan geçer.'),
		// il merkezi kıyıda: Mersin, Samsun, Tekirdağ, Sinop. Tuzakların hepsi kıyı ili ama merkezi içeride (Muğla, Aydın, Adana,
		// Antakya, Balıkesir)
		BL('yn-balon-49', 'cografya', 3, 'İl merkezi deniz kıyısında olan illeri patlat!', ['Mersin', 'Samsun', 'Tekirdağ', 'Sinop'], ['Muğla', 'Aydın', 'Adana', 'Hatay', 'Balıkesir'], 'gunduz', 'ege', 'Muğla, Aydın, Adana, Hatay ve Balıkesir kıyı ili ama il merkezleri içeride.'),
		// Kuzey Kutup Dairesi (~66,5° K) Norveç, İsveç, Finlandiya, Rusya, ABD, Kanada, Danimarka (Grönland) ve İzlanda’dan (Grímsey)
		// geçer; tuzaklar Kuzey Avrupa’nın dairenin güneyinde kalan ülkeleri
		BL('yn-balon-50', 'cografya', 2, 'Kuzey Kutup Dairesi’nin geçtiği ülkeleri patlat!', ['Norveç', 'İsveç', 'Finlandiya', 'Kanada'], ['Estonya', 'Letonya', 'Litvanya', 'İrlanda', 'Polonya'], 'safak', 'kapadokya', 'Estonya, Letonya, Litvanya, İrlanda ve Polonya Kutup Dairesi’nin güneyinde kalır.'),
		// Hint Okyanusu kıyısı; tuzaklar Atlas’a (Nijerya, Gana, Angola) ve Büyük Okyanus’a (Vietnam, Japonya) bakanlar. Kızıldeniz
		// ve Basra Körfezi kıyıları (okyanusun kolu sayılır mı?) bilerek yok
		BL('yn-balon-51', 'cografya', 2, 'Hint Okyanusu’na kıyısı olan ülkeleri patlat!', ['Hindistan', 'Avustralya', 'Somali', 'Mozambik'], ['Nijerya', 'Vietnam', 'Angola', 'Japonya', 'Gana'], 'batim', 'kiyi', 'Nijerya, Gana ve Angola Atlas Okyanusu’na; Vietnam ve Japonya Büyük Okyanus’a bakar.'),
		// bölge oyunun verisinden (turkiye.json, test/yeni2.test.mjs’te sınanır); tuzaklar Güneydoğu’ya komşu Doğu Anadolu ve Akdeniz illeri
		BL('yn-balon-52', 'cografya', 1, 'Güneydoğu Anadolu Bölgesi’ndeki illeri patlat!', ['Kilis', 'Batman', 'Siirt', 'Adıyaman'], ['Malatya', 'Bitlis', 'Hakkari', 'Osmaniye', 'Elazığ'], 'gunduz', 'ege', 'Malatya, Bitlis, Hakkari ve Elazığ Doğu Anadolu’da; Osmaniye Akdeniz Bölgesi’nde.'),
		// ---------------------------------------------------------------- tarih
		// tahta kendisi oturan kadınlar (I. Elizabeth 1558, II. Katerina 1762, Victoria 1837, VII. Kleopatra MÖ 51); tuzaklar ünlü ama
		// yalnız hükümdar eşi olan kadınlar (Nefertari II. Ramses’in eşi)
		BL('yn-balon-53', 'tarih', 2, 'Ülkesini hükümdar olarak yöneten kadınları patlat!', ['I. Elizabeth', 'Büyük Katerina', 'Kraliçe Victoria', 'Kleopatra'], ['Hürrem Sultan', 'Marie Antoinette', 'Jozefin', 'Anne Boleyn', 'Nefertari'], 'gece', 'istanbul', 'Hürrem, Marie Antoinette, Jozefin, Anne Boleyn ve Nefertari hükümdar eşiydi.'),
		// İş Bankası 1924, Merkez Bankası 1930, Türk Dil Kurumu 1932, Sümerbank 1933; tuzaklar Osmanlı kurumları (Mülkiye 1859,
		// Ziraat Bankası 1863, Darüşşafaka 1863, Darülaceze 1895, Darülfünun 1900)
		BL('yn-balon-54', 'tarih', 2, 'Atatürk döneminde kurulan kurumları patlat!', ['İş Bankası', 'Sümerbank', 'Türk Dil Kurumu', 'Merkez Bankası'], ['Ziraat Bankası', 'Darüşşafaka', 'Darülfünun', 'Mülkiye', 'Darülaceze'], 'safak', 'kapadokya', 'Mülkiye, Ziraat Bankası, Darüşşafaka, Darülfünun ve Darülaceze Osmanlı döneminden.'),
		// savaş boyunca tarafsız; tuzaklar tarafsızlık ilan edip 1940’ta işgal edilenler. Tarafsız sayılıp 1945’te savaş ilan eden
		// Türkiye ve Mavi Tümen’i gönderen İspanya bilerek yok
		BL('yn-balon-55', 'tarih', 2, 'II. Dünya Savaşı’nda tarafsız kalan ülkeleri patlat!', ['İsviçre', 'İsveç', 'Portekiz', 'İrlanda'], ['Norveç', 'Danimarka', 'Belçika', 'Hollanda', 'Lüksemburg'], 'gunduz', 'ege', 'Norveç, Danimarka ve Benelüks tarafsızlık ilan etti ama Almanya hepsini işgal etti.'),
		// 1453’ten önce tahta çıkanlar (Orhan 1324, I. Murad 1362, Çelebi Mehmed 1413, II. Murad 1421); Fatih 1444’te de tahta çıktığı
		// için bilerek yok. Tuzaklar sonraki padişahlar, adı benzeyen III. ve IV. Murad
		BL('yn-balon-56', 'tarih', 2, '1453’ten önce tahta çıkan Osmanlı hükümdarlarını patlat!', ['Orhan Gazi', 'I. Murad', 'Çelebi Mehmed', 'II. Murad'], ['II. Bayezid', 'Yavuz Selim', 'III. Murad', 'IV. Murad', 'I. Ahmed'], 'gece', 'istanbul', 'II. Murad 1421’de tahta çıktı; III. ve IV. Murad 16. ve 17. yüzyılda hüküm sürdü.'),
		// cumhurbaşkanları (Gürsel 1961, Sunay 1966, Korutürk 1973, Özal 1989); tuzaklar başbakan, mareşal ya da paşa olup hiç
		// cumhurbaşkanı olmayanlar (hepsi tarihî kişi)
		BL('yn-balon-57', 'tarih', 1, 'Türkiye’de cumhurbaşkanlığı yapmış isimleri patlat!', ['Turgut Özal', 'Cemal Gürsel', 'Cevdet Sunay', 'Fahri Korutürk'], ['Adnan Menderes', 'Bülent Ecevit', 'Fevzi Çakmak', 'Kâzım Karabekir', 'Rauf Orbay'], 'safak', 'kapadokya', 'Menderes, Ecevit ve Rauf Orbay başbakandı; Özal ise önce başbakan, sonra cumhurbaşkanı.'),
		// I. Dünya Savaşı’nda Osmanlı cepheleri (Galiçya’ya 1916’da kolordu gönderildi); tuzaklar başka savaşların cepheleri
		BL('yn-balon-58', 'tarih', 2, 'Osmanlı’nın I. Dünya Savaşı cephelerini patlat!', ['Çanakkale', 'Kafkas', 'Kanal', 'Galiçya'], ['Trablusgarp', 'Kırım', 'Sakarya', 'Plevne'], 'batim', 'kiyi', 'Trablusgarp 1911, Kırım 1853, Plevne 1877, Sakarya 1921; Galiçya’ya Osmanlı kolordusu gitti.'),
		// Napolyon’un zaferleri (Marengo 1800, Austerlitz 1805, Jena 1806, Wagram 1809); tuzaklar yenilgileri: Akka kuşatması 1799,
		// Trafalgar 1805 (Fransız donanması), Aspern 1809 (ilk büyük kişisel yenilgisi), Leipzig 1813
		BL('yn-balon-59', 'tarih', 3, 'Napolyon’un kazandığı savaşları patlat!', ['Austerlitz', 'Jena', 'Marengo', 'Wagram'], ['Leipzig', 'Trafalgar', 'Akka', 'Aspern'], 'gece', 'istanbul', 'Akka’yı alamadı; Aspern ve Leipzig’de yenildi; Trafalgar’da Fransız donanması battı.'),
		// 4 Nisan 1949 Washington: 12 kurucu (ordusu olmayan İzlanda dahil); tuzaklar sonradan katılanlar ve hiç girmeyen İsveç
		// (2024’te katıldı)
		BL('yn-balon-60', 'tarih', 3, '1949’da NATO’yu kuran ülkeleri patlat!', ['İzlanda', 'Portekiz', 'Norveç', 'İtalya'], ['Yunanistan', 'Almanya', 'İspanya', 'İsveç', 'Avusturya'], 'gunduz', 'ege', 'Yunanistan 1952’de, Almanya 1955’te, İspanya 1982’de, İsveç 2024’te katıldı.'),
		// Osmanlı denizcileri; tuzaklar aynı yüzyılların ünlü bilgin, gezgin ve sanatçıları (Katip Çelebi denizcilik tarihi yazdı ama
		// denizci değildi)
		BL('yn-balon-61', 'tarih', 1, 'Osmanlı denizcilerini patlat!', ['Barbaros', 'Turgut Reis', 'Piri Reis', 'Kemal Reis'], ['Evliya Çelebi', 'Katip Çelebi', 'Matrakçı Nasuh', 'Hezarfen', 'Ali Kuşçu'], 'batim', 'kiyi', 'Evliya Çelebi gezgin, Katip Çelebi bilgin, Matrakçı minyatürcü, Ali Kuşçu astronom.'),
		// Anadolu Selçuklu yapıları (Konya Alaeddin Camii, Karatay 1251, İnce Minareli ~1265, Sivas Gök Medrese 1271); tuzaklar
		// Osmanlı yapıları. Mengücekli Divriği ve İlhanlı dönemine taşan yapılar bilerek yok
		BL('yn-balon-62', 'tarih', 3, 'Anadolu Selçuklu yapılarını patlat!', ['Karatay Medresesi', 'İnce Minareli', 'Gök Medrese', 'Alaeddin Camii'], ['Yeşil Cami', 'Bursa Ulu Camii', 'İshak Paşa Sarayı', 'Selimiye', 'Üç Şerefeli'], 'safak', 'kapadokya', 'Yeşil Cami, Bursa Ulu, Selimiye, Üç Şerefeli ve İshak Paşa Sarayı Osmanlı yapısı.'),
		// ---------------------------------------------------------------- bilim
		// SI’nın yedi temel birimi; tuzaklar türetilmiş birimler (N, J, V, W) ve SI dışı litre
		BL('yn-balon-63', 'bilim', 3, 'SI temel birimlerini patlat!', ['Kelvin', 'Amper', 'Mol', 'Kandela'], ['Newton', 'Joule', 'Volt', 'Watt', 'Litre'], 'gece', 'stad', 'Yedi temel birim: metre, kilogram, saniye, amper, kelvin, mol, kandela.'),
		// magmatik kayaçlar (granit derinlik, bazalt, andezit ve pomza volkanik); tuzaklar tortul (kireçtaşı, kumtaşı, traverten) ve
		// başkalaşım (arduvaz, şist) kayaçları
		BL('yn-balon-64', 'bilim', 2, 'Magmatik kayaçları patlat!', ['Granit', 'Bazalt', 'Andezit', 'Pomza'], ['Kireçtaşı', 'Kumtaşı', 'Traverten', 'Arduvaz', 'Şist'], 'safak', 'kapadokya', 'Kireçtaşı, kumtaşı ve traverten tortul; arduvaz ve şist başkalaşım kayacı.'),
		// omurgasızlar (yumuşakça, sölenter, kabuklu); tuzaklar omurgalı ama öyle görünmeyenler (kıkırdaklı köpek balığı, deniz atı)
		BL('yn-balon-65', 'bilim', 1, 'Omurgasız hayvanları patlat!', ['Ahtapot', 'Denizanası', 'Salyangoz', 'Istakoz'], ['Köpek balığı', 'Deniz atı', 'Semender', 'Yılan', 'Penguen'], 'batim', 'kiyi', 'Köpek balığı ve deniz atı balık, semender iki yaşamlı: hepsinin omurgası var.'),
		// yağda çözünen vitaminler A, D, E, K; tuzaklar suda çözünen C ve B grubu (folik asit = B9)
		BL('yn-balon-66', 'bilim', 2, 'Yağda çözünen vitaminleri patlat!', ['A vitamini', 'D vitamini', 'E vitamini', 'K vitamini'], ['C vitamini', 'B1 vitamini', 'B6 vitamini', 'B12 vitamini', 'Folik asit'], 'gunduz', 'ege', 'Yağda çözünenler A, D, E ve K; C vitamini ve B grubu (folik asit de) suda çözünür.'),
		// bilim insanı adlı elementler (Einstein, Marie ve Pierre Curie, Fermi, Alfred Nobel); tuzaklar ülke, kıta ve gök cismi adlılar
		BL('yn-balon-67', 'bilim', 3, 'Adını bir bilim insanından alan elementleri patlat!', ['Einsteinyum', 'Küriyum', 'Fermiyum', 'Nobelyum'], ['Polonyum', 'Fransiyum', 'Amerikyum', 'Germanyum', 'Helyum'], 'gece', 'stad', 'Polonyum Polonya’dan, fransiyum Fransa’dan, germanyum Almanya’dan, helyum Güneş’ten.'),
		// dört odacıklı kalp: memeliler, kuşlar ve sürüngenlerden yalnız timsahlar; tuzaklar üç (sürüngen, iki yaşamlı) ve iki
		// (balık) odacıklılar
		BL('yn-balon-68', 'bilim', 3, 'Kalbi dört odacıklı hayvanları patlat!', ['Timsah', 'Yunus', 'Kartal', 'Yarasa'], ['Kaplumbağa', 'Kertenkele', 'Bukalemun', 'Alabalık', 'Semender'], 'safak', 'kapadokya', 'Timsah dört odacıklı kalbi olan tek sürüngen grubu; kertenkelede üç, balıkta iki odacık.'),
		// virüs hastalıkları; tuzaklar bakteri (verem, kolera, tetanos, veba) ve tek hücreli parazit (sıtma: Plasmodium)
		BL('yn-balon-69', 'bilim', 2, 'Virüslerin yol açtığı hastalıkları patlat!', ['Grip', 'Kızamık', 'Kuduz', 'Suçiçeği'], ['Verem', 'Kolera', 'Sıtma', 'Tetanos', 'Veba'], 'gunduz', 'ege', 'Verem, kolera, tetanos ve veba bakteriyle; sıtma tek hücreli bir parazitle bulaşır.'),
		// 20–25 °C’de gaz olan elementler; tuzaklar katı ametaller (iyot kloru, floru andıran halojen) ve katı metal. Sıvı brom ve
		// cıva bilerek yok
		BL('yn-balon-70', 'bilim', 2, 'Oda sıcaklığında gaz olan elementleri patlat!', ['Azot', 'Klor', 'Flor', 'Neon'], ['İyot', 'Kükürt', 'Fosfor', 'Karbon', 'Sodyum'], 'gece', 'stad', 'İyot, kükürt, fosfor, karbon ve sodyum oda sıcaklığında katıdır.'),
		// tek çenekliler (tahıllar, lale, muz); tuzaklar çift çenekliler
		BL('yn-balon-71', 'bilim', 2, 'Tek çenekli bitkileri patlat!', ['Buğday', 'Mısır', 'Lale', 'Muz'], ['Fasulye', 'Gül', 'Ayçiçeği', 'Meşe', 'Domates'], 'gunduz', 'ege', 'Fasulye, gül, ayçiçeği, meşe ve domates çift çeneklidir.'),
		// fotosentez yapanlar (öglena kloroplastlı tek hücreli, kaktüs gövdesiyle); tuzaklar mantarlar ve hayvanlar
		BL('yn-balon-72', 'bilim', 1, 'Fotosentez yapan canlıları patlat!', ['Su yosunu', 'Eğrelti', 'Kaktüs', 'Öglena'], ['Şapkalı mantar', 'Maya', 'Küf mantarı', 'Amip', 'Sünger'], 'batim', 'kiyi', 'Mantar, maya ve küf mantarlar âleminden; amip ve sünger besinini dışarıdan alır.'),
		// ---------------------------------------------------------------- sanat
		// operalar (Puccini, Verdi, Rossini); tuzaklar bale (Giselle, Uyuyan Güzel), konçerto, sonat ve bale için yazılmış Bolero
		BL('yn-balon-73', 'sanat', 2, 'Operaları patlat!', ['Tosca', 'La Traviata', 'Rigoletto', 'Sevil Berberi'], ['Giselle', 'Uyuyan Güzel', 'Dört Mevsim', 'Ay Işığı Sonatı', 'Bolero'], 'gece', 'istanbul', 'Giselle ve Uyuyan Güzel bale; Dört Mevsim konçerto, Ay Işığı sonat, Bolero bale müziği.'),
		// Michelangelo: Pietà ve Musa heykelleri, Sistina’daki Âdem’in Yaratılışı ve Son Yargı freskleri (bankada sorulan Davut
		// bilerek yok); tuzaklar başka ustaların en ünlü eserleri
		BL('yn-balon-74', 'sanat', 1, 'Michelangelo’nun eserlerini patlat!', ['Pietà', 'Musa Heykeli', 'Âdem’in Yaratılışı', 'Son Yargı'], ['Atina Okulu', 'Venüs’ün Doğuşu', 'Gece Devriyesi', 'Mona Lisa', 'İnci Küpeli Kız'], 'gece', 'istanbul', 'Atina Okulu Raffaello’nun, Venüs’ün Doğuşu Botticelli’nin, Gece Devriyesi Rembrandt’ın.'),
		// Latin Amerikalı yazarlar (Kolombiyalı García Márquez, Arjantinli Borges ve Cortázar, Şilili Neruda); tuzaklar aynı dillerde
		// yazan İspanyol ve Portekizliler
		BL('yn-balon-75', 'sanat', 3, 'Latin Amerikalı yazarları patlat!', ['Márquez', 'Borges', 'Neruda', 'Cortázar'], ['Cervantes', 'Unamuno', 'Saramago', 'Pessoa'], 'safak', 'kapadokya', 'Cervantes ve Unamuno İspanyol, Saramago ve Pessoa Portekizli yazarlar.'),
		// Gotik katedraller; tuzaklar başka üslupların dev yapıları (Gotik etkili Sagrada Família bilerek yok)
		BL('yn-balon-76', 'sanat', 2, 'Gotik yapıları patlat!', ['Notre-Dame', 'Köln Katedrali', 'Milano Katedrali', 'Chartres'], ['Ayasofya', 'Aziz Petrus', 'Pantheon', 'Tac Mahal', 'Aziz Vasil'], 'gece', 'istanbul', 'Ayasofya Bizans, Aziz Petrus Rönesans, Pantheon Roma, Tac Mahal Babür yapısı.'),
		// heykeltıraşlar (Rodin, Bernini, Donatello, Canova); tuzaklar yalnız resimle ün kazanmış ustalar. Hem ressam hem heykeltıraş
		// olan Michelangelo bilerek yok
		BL('yn-balon-77', 'sanat', 2, 'Heykeltıraşları patlat!', ['Rodin', 'Bernini', 'Donatello', 'Canova'], ['Caravaggio', 'Goya', 'Vermeer', 'Tiziano', 'Rubens'], 'gunduz', 'ege', 'Caravaggio, Goya, Vermeer, Tiziano ve Rubens ressam olarak ün kazandı.'),
		// Jules Verne romanları (Balonla Beş Hafta 1863, Ay’a Yolculuk 1865, Michel Strogoff 1876, Esrarlı Ada 1875); tuzaklar aynı
		// türde başka yazarlar. Bankada sorulan Seksen Günde Devrialem bilerek yok
		BL('yn-balon-78', 'sanat', 2, 'Jules Verne’in romanlarını patlat!', ['Ay’a Yolculuk', 'Esrarlı Ada', 'Michel Strogoff', 'Balonla Beş Hafta'], ['Zaman Makinesi', 'Dünyalar Savaşı', 'Define Adası', 'Robinson Crusoe', 'Gulliver’in Gezileri'], 'batim', 'kiyi', 'Zaman Makinesi ve Dünyalar Savaşı H. G. Wells’in, Define Adası Stevenson’ın.'),
		// Nâzım Hikmet (835 Satır 1929, Jokond ile Si-Ya-U 1929, Şeyh Bedreddin Destanı 1936, Saman Sarısı); tuzaklar aynı kuşağın
		// başka şairlerinin ünlü kitapları
		BL('yn-balon-79', 'sanat', 3, 'Nâzım Hikmet’in eserlerini patlat!', ['835 Satır', 'Saman Sarısı', 'Şeyh Bedreddin Destanı', 'Jokond ile Si-Ya-U'], ['Han Duvarları', 'Çile', 'Otuz Beş Yaş', 'Kendi Gök Kubbemiz'], 'gece', 'istanbul', 'Han Duvarları Faruk Nafiz’in, Çile Necip Fazıl’ın, Otuz Beş Yaş Cahit Sıtkı’nın.'),
		// Türk destanları (Manas Kırgız); tuzaklar başka kültürlerin büyük destanları
		BL('yn-balon-80', 'sanat', 1, 'Türk destanlarını patlat!', ['Ergenekon', 'Oğuz Kağan', 'Manas', 'Alp Er Tunga'], ['Gılgamış', 'İlyada', 'Kalevala', 'Şehname', 'Mahabharata'], 'safak', 'kapadokya', 'Gılgamış Sümer, İlyada Yunan, Kalevala Fin, Şehname İran, Mahabharata Hint destanı.'),
		// Servet-i Fünun (1896–1901) yazarları; tuzaklar Tanzimat, Millî Edebiyat ve akımlar dışı kalan Mehmet Akif
		BL('yn-balon-81', 'sanat', 3, 'Servet-i Fünun yazarlarını patlat!', ['Tevfik Fikret', 'Halit Ziya', 'Cenap Şahabettin', 'Mehmet Rauf'], ['Namık Kemal', 'Şinasi', 'Ziya Paşa', 'Ömer Seyfettin', 'Mehmet Akif'], 'gece', 'istanbul', 'Namık Kemal, Şinasi ve Ziya Paşa Tanzimat’ın; Ömer Seyfettin Millî Edebiyat’ın.'),
		// Barok besteciler (1600–1750); tuzaklar Romantik dönem ve sonrası. Bankadaki Viyana Klasikleri sorusuyla çakışmasın diye
		// Haydn ve Mozart yok
		BL('yn-balon-82', 'sanat', 2, 'Barok dönem bestecilerini patlat!', ['Bach', 'Vivaldi', 'Händel', 'Purcell'], ['Schubert', 'Chopin', 'Liszt', 'Wagner', 'Debussy'], 'gunduz', 'ege', 'Schubert, Chopin, Liszt ve Wagner Romantik dönemden; Debussy 20. yüzyıla uzanır.'),
		// ---------------------------------------------------------------- spor
		// artistik cimnastik aletleri; tuzaklar atletizmin atma aletleri
		BL('yn-balon-83', 'spor', 1, 'Cimnastik aletlerini patlat!', ['Halka', 'Barfiks', 'Denge aleti', 'Atlama masası'], ['Sırık', 'Gülle', 'Cirit', 'Çekiç', 'Disk'], 'gece', 'stad', 'Sırık, gülle, cirit, çekiç ve disk atletizmin aletleri.'),
		// Ballon d’Or: Van Basten 1988, 1989, 1992; Zidane 1998; Ronaldinho 2005; Kaká 2007. Tuzaklar kariyerini bitirmiş, ödüle
		// yaklaşıp hiç kazanamamış yıldızlar
		BL('yn-balon-84', 'spor', 3, 'Ballon d’Or (Altın Top) kazanan futbolcuları patlat!', ['Zidane', 'Ronaldinho', 'Kaká', 'Van Basten'], ['Thierry Henry', 'Maldini', 'Xavi', 'Iniesta', 'Buffon'], 'gece', 'stad', 'Henry, Maldini, Xavi, Iniesta ve Buffon Altın Top’a yaklaştı ama hiç kazanamadı.'),
		// kalecisi olan takım sporları; tuzaklar kalecisiz takım sporları
		BL('yn-balon-85', 'spor', 1, 'Takımlarında kaleci olan sporları patlat!', ['Hentbol', 'Su topu', 'Buz hokeyi', 'Çim hokeyi'], ['Basketbol', 'Voleybol', 'Ragbi', 'Beyzbol', 'Amerikan futbolu'], 'gunduz', 'ege', 'Basketbol, voleybol, ragbi, beyzbol ve Amerikan futbolunda kaleci yoktur.'),
		// NBA şampiyonları (Bird 1981, 1984, 1986; Magic 5 kez; Kobe 5 kez; Nowitzki 2011); tuzaklar finale çıkıp hiç kazanamadan
		// bırakan efsaneler
		BL('yn-balon-86', 'spor', 3, 'NBA şampiyonluğu yaşamış basketbolcuları patlat!', ['Larry Bird', 'Magic Johnson', 'Kobe Bryant', 'Dirk Nowitzki'], ['Charles Barkley', 'Karl Malone', 'John Stockton', 'Patrick Ewing', 'Allen Iverson'], 'gece', 'stad', 'Barkley, Malone, Stockton, Ewing ve Iverson finale çıktı ama şampiyonluk yaşamadı.'),
		// 2000’den önceki Avrupa şampiyonları (İspanya 1964, Çekoslovakya 1976, Hollanda 1988, Danimarka 1992); tuzaklar sonra
		// şampiyon olanlar (Yunanistan 2004, Portekiz 2016), hiç olamayan İngiltere, Belçika ve iki finali kaybeden Yugoslavya
		BL('yn-balon-87', 'spor', 2, 'Futbolda 2000’den önce Avrupa şampiyonu olanları patlat!', ['Danimarka', 'Hollanda', 'Çekoslovakya', 'İspanya'], ['Yunanistan', 'Portekiz', 'İngiltere', 'Yugoslavya', 'Belçika'], 'batim', 'kiyi', 'Yunanistan 2004’te, Portekiz 2016’da şampiyon oldu; Yugoslavya iki finali kaybetti.'),
		// sıklet (kilo kategorisi) olan sporlar; tuzaklar kilo ayrımı olmayan olimpik dallar
		BL('yn-balon-88', 'spor', 1, 'Sporcuların sıkletlere ayrıldığı sporları patlat!', ['Boks', 'Halter', 'Judo', 'Taekwondo'], ['Eskrim', 'Okçuluk', 'Tenis', 'Atıcılık', 'Cimnastik'], 'gece', 'stad', 'Eskrim, okçuluk, tenis, atıcılık ve cimnastikte sporcular kiloya göre ayrılmaz.'),
		// 1956–1992 arasındaki Şampiyon Kulüpler Kupası (Celtic 1967, Nottingham Forest 1979 ve 1980, Steaua 1986, Kızıl Yıldız
		// 1991); tuzaklar bu dönemde finali kaybeden ya da kupaya hiç uzanamayan kulüpler
		BL('yn-balon-89', 'spor', 3, 'Şampiyon Kulüpler Kupası’nı (1956–1992) kazananları patlat!', ['Steaua Bükreş', 'Kızıl Yıldız', 'Celtic', 'Nottingham Forest'], ['Arsenal', 'Atlético Madrid', 'Leeds United', 'Reims', 'Galatasaray'], 'gece', 'stad', 'Reims 1956 ve 1959’da, Atlético 1974’te, Leeds 1975’te finali kaybetti.'),
		// buz üstünde yapılan kış sporları; tuzaklar karda yapılanlar (buz pistli kızak ve bobsleyi ayrımı tartışmalı olur diye yok)
		BL('yn-balon-90', 'spor', 1, 'Buz üstünde yapılan sporları patlat!', ['Buz hokeyi', 'Artistik patinaj', 'Sürat pateni'], ['Kayaklı koşu', 'Biatlon', 'Snowboard', 'Kayakla atlama', 'Alp disiplini'], 'gunduz', 'ege', 'Kayaklı koşu, biatlon, snowboard, kayakla atlama ve alp disiplini karda yapılır.'),
		// kaleciler (Zoff 1982, Kahn, Schmeichel, Casillas 2010 Dünya Kupası); tuzaklar aynı kuşağın efsane defans oyuncuları
		BL('yn-balon-91', 'spor', 2, 'Kaleci olan futbolcuları patlat!', ['Oliver Kahn', 'Dino Zoff', 'Peter Schmeichel', 'Iker Casillas'], ['Beckenbauer', 'Cafu', 'Roberto Carlos', 'Cannavaro', 'Carles Puyol'], 'gece', 'stad', 'Beckenbauer, Cafu, Roberto Carlos, Cannavaro ve Puyol efsane defans oyuncusuydu.'),
		// ---------------------------------------------------------------- genel kültür
		// İtalyan mutfağı; tuzaklar Avrupa’nın başka mutfaklarının ünlü yemekleri
		BL('yn-balon-92', 'eglence', 1, 'İtalyan mutfağının yemeklerini patlat!', ['Risotto', 'Lazanya', 'Carpaccio', 'Panna cotta'], ['Gulaş', 'Ratatuy', 'Borş', 'Musakka', 'Piroşki'], 'gunduz', 'ege', 'Gulaş Macar, ratatuy Fransız; borş ve piroşki Doğu Avrupa’dan, musakka Balkanlardan.'),
		// Japon mutfağı; tuzaklar Uzak Doğu’nun öteki mutfakları
		BL('yn-balon-93', 'eglence', 1, 'Japon mutfağının yemeklerini patlat!', ['Tempura', 'Sashimi', 'Teriyaki', 'Udon'], ['Kimçi', 'Dim sum', 'Pad thai', 'Pho', 'Bibimbap'], 'gece', 'istanbul', 'Kimçi ve bibimbap Kore’den, dim sum Çin’den, pad thai Tayland’dan, pho Vietnam’dan.'),
		// En İyi Film Oscar’ı (Casablanca 1944, Rocky 1977, Titanik 1998, Gladyatör 2001); tuzaklar aday olup kaybeden klasikler
		BL('yn-balon-94', 'eglence', 2, 'En İyi Film Oscar’ını kazanan filmleri patlat!', ['Titanik', 'Casablanca', 'Gladyatör', 'Rocky'], ['Yurttaş Kane', 'Esaretin Bedeli', 'Pulp Fiction', 'Yıldız Savaşları', 'Taksi Şoförü'], 'gece', 'stad', 'Yurttaş Kane, Esaretin Bedeli, Pulp Fiction, Yıldız Savaşları ve Taksi Şoförü kaybetti.'),
		// espresso tabanlı kahveler; tuzaklar cezve, filtre, dibek ve soğuk demleme kahveleri, kahve sanılan menengiç
		BL('yn-balon-95', 'eglence', 1, 'Espresso ile hazırlanan kahveleri patlat!', ['Latte', 'Kapuçino', 'Makyato', 'Americano'], ['Türk kahvesi', 'Filtre kahve', 'Menengiç', 'Dibek kahvesi', 'Soğuk demleme'], 'safak', 'kapadokya', 'Türk kahvesi cezvede pişer, filtre kahve süzülür; menengiç yabani fıstıktan yapılır.'),
		// Looney Tunes (Warner Bros.) karakterleri; tuzaklar başka stüdyoların çizgi kahramanları
		BL('yn-balon-96', 'eglence', 1, 'Looney Tunes karakterlerini patlat!', ['Bugs Bunny', 'Tweety', 'Daffy Duck', 'Taz'], ['Mickey Mouse', 'Donald Duck', 'Pembe Panter', 'Ağaçkakan Woody', 'Garfield'], 'gunduz', 'ege', 'Mickey ve Donald Disney’in, Woody Universal’ın; Pembe Panter ve Garfield de başka yapım.'),
		// İtalyancadan geçenler: fırtına (fortuna), iskele (scala), pusula (bussola), fatura (fattura); tuzaklar Farsça (pencere,
		// bahçe), Arapça (kitap, kalem) ve Türkçe (okul). Bankadaki Fransızca sorusuyla çakışmasın diye Fransızca kelime yok
		BL('yn-balon-97', 'eglence', 3, 'Türkçeye İtalyancadan geçen kelimeleri patlat!', ['Fırtına', 'İskele', 'Pusula', 'Fatura'], ['Pencere', 'Kitap', 'Bahçe', 'Okul', 'Kalem'], 'batim', 'kiyi', 'Pencere ve bahçe Farsçadan, kitap ve kalem Arapçadan; okul Türkçe bir kelime.'),
		// soldan akan trafik; tuzaklar sağdan akanlar (İsveç 1967’de, Portekiz 1928’de sağa geçti). Sol trafikli Hong Kong’u olan
		// Çin bilerek yok
		BL('yn-balon-98', 'eglence', 2, 'Trafiğin soldan aktığı ülkeleri patlat!', ['Japonya', 'Kıbrıs', 'Malta', 'Güney Afrika'], ['İsveç', 'Kanada', 'Mısır', 'Portekiz', 'Brezilya'], 'batim', 'kiyi', 'İsveç 1967’ye dek soldan akıyordu, sonra sağa geçti; Kıbrıs ve Malta’da trafik solda.'),
		// DC Comics kahramanları; tuzaklar Marvel kahramanları
		BL('yn-balon-99', 'eglence', 1, 'DC Comics kahramanlarını patlat!', ['Batman', 'Süperman', 'Wonder Woman', 'Aquaman'], ['Örümcek Adam', 'Demir Adam', 'Kaptan Amerika', 'Hulk', 'Thor'], 'gece', 'istanbul', 'Örümcek Adam, Demir Adam, Kaptan Amerika, Hulk ve Thor Marvel’ın kahramanları.'),
		// sağdan sola yazılanlar (Arap ve İbrani alfabeleri; Farsça ve Urduca Arap harfleriyle); tuzaklar Latin dışı ama soldan sağa
		// yazılan alfabeler
		BL('yn-balon-100', 'eglence', 2, 'Sağdan sola yazılan dilleri patlat!', ['Arapça', 'İbranice', 'Farsça', 'Urduca'], ['Yunanca', 'Rusça', 'Ermenice', 'Gürcüce', 'Hintçe'], 'safak', 'kapadokya', 'Yunanca, Rusça, Ermenice, Gürcüce ve Hintçe kendi alfabeleriyle soldan sağa yazılır.'),
	],
	kazi: KAZI_SORULAR,
};
