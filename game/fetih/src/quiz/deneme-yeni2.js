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
	],
	kazi: KAZI_SORULAR,
};
