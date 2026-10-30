// YENİ · DENEME SORU TİPLERİ: yalnız soru galerisinde (dist/SoruGalerisi.html) oynanır. Maç dönüşümüne (TYPE_WEIGHTS,
// banka) GİRMEZ; kullanıcı galeride deneyip karar verince benimsenen tip `TYPES`e taşınır, süresi timing.js'in
// parts() işlevine bir `case` olarak girer. Ayrıntılı kavram listesi ve gerekçeler: ref/yeni-soru-tipleri/defter.md
//
// Sözleşme `TYPES` ile aynı: { time, label, kind, needsMap?, keep?, jokers?, prepare, mount, judge, bot, fmt?, sub?,
// joker? }. Süre bütçesi aynı modelden (d_ortak.js stamp → timing.js sabitleri ve PROFILE girdisi).
//
//   kusbakisi  Kuşbakışı      kamera bir maketin dibinden yükselir; erken bilen kazanır (3B harita, yapılar)
//   kosu       Fetih Koşusu   kurala uyan illeri süre bitmeden bul; her doğru il senin rengine boyanır (3B harita)
//   ilavi      İl Avı         siluet + sıcak-soğuk: yanlış il uzaklığın rengine boyanır, ipucu açılır (3B harita)
//   baglanti   Bağlantı       12 taş, dörderli 3 gizli grup; tuzak taşlar (harita dışı, akıl yürütme)
//
// Örnek sorular (DENEME_SAMPLES) elle yazıldı ve doğrulandı (kaynaklar defterde). Harita verisi (il adı, plaka, bölge,
// komşuluk, sınır çizgisi) src/data/turkiye.json'dan yalnız okunur.

import { kusbakisi } from './d_kusbakisi.js';
import { kosu } from './d_kosu.js';
import { ilavi } from './d_ilavi.js';
import { baglanti } from './d_baglanti.js';
// ek deneme grupları: her grup kendi dosyasında { TYPES, ORDER, SAMPLES } verir, süre profillerini timing.js PROFILE'a
// kendisi ekler (Object.assign). Böylece gruplar birbirine dokunmadan büyür.
import * as harita from './deneme-harita.js';
import * as duello from './deneme-duello.js';
import * as akil from './deneme-akil.js';
import * as icat3b from './deneme-icat3b.js';
import * as icat from './deneme-icat.js';
export { bindApp } from './d_ortak.js';

const GROUPS = [harita, duello, akil, icat3b, icat];

export const DENEME_TYPES = Object.assign({ kusbakisi, kosu, ilavi, baglanti }, ...GROUPS.map((g) => g.TYPES));

/** Galeri sırası: [tip, galerideki adı, bir satırlık tanıtım]. */
export const DENEME_ORDER = [
	['kusbakisi', 'Kuşbakışı', 'Kamera maketin dibinden yükselir'],
	['kosu', 'Fetih Koşusu', 'Kurala uyan illeri fethet'],
	['ilavi', 'İl Avı · Sıcak Soğuk', 'Siluet, uzaklık rengi, ipucu'],
	['baglanti', 'Bağlantı Duvarı', '12 taş, 3 gizli grup'],
	...GROUPS.flatMap((g) => g.ORDER),
];

const KB = (id, diff, q, site, il, a, extra = {}) => ({ id, cat: 'cografya', diff, type: 'kusbakisi', q, site, il, a, ...extra });
const KS = (id, diff, q, ids, frame) => ({ id, cat: 'cografya', diff, type: 'kosu', q, ids, frame });
const IA = (id, diff, il, hints) => ({ id, cat: 'cografya', diff, type: 'ilavi', q: 'Siluetteki gizli ili haritada bul!', il, hints });
const BG = (id, cat, diff, groups) => ({ id, cat, diff, type: 'baglanti', q: 'Taşları dörderli 3 gruba ayır', groups: groups.map(([n, w]) => ({ n, w })) });

export const DENEME_SAMPLES = Object.assign({
	kusbakisi: [
		KB('dn-kb1', 1, 'Kamera hangi ilin üzerinde?', 'galata', 34, ['İstanbul', 'İzmir', 'Çanakkale', 'Edirne'], { yaw: 0.5 }),
		KB('dn-kb2', 2, 'Burası hangi il?', 'pamukkale', 20, ['Denizli', 'Aydın', 'Muğla', 'Burdur'], { yaw: -0.4 }),
		KB('dn-kb3', 2, 'Kamera hangi ilde?', 'sumela', 61, ['Trabzon', 'Rize', 'Giresun', 'Artvin'], { yaw: 0.2 }),
		KB('dn-kb4', 2, 'Denizin içindeki bu kale hangi ilde?', 'kizkalesi', 33, ['Mersin', 'Antalya', 'Muğla', 'Hatay'], { yaw: -0.8 }),
		KB('dn-kb5', 3, 'Kamera hangi yapının başında?', 'nemrut', 2, ['Nemrut Dağı', 'Göbeklitepe', 'Zeugma', 'Harran'], { yaw: 0.05 }),
		KB('dn-kb6', 3, 'Bu saray hangi ilde?', 'ishakpasa', 4, ['Ağrı', 'Kars', 'Van', 'Erzurum'], { yaw: -0.3 }),
		// v0.9: her yapının yakın çekim kahraman maketi var; yeni 19 yapı + eski yapıların kalanı. Yanlış şıklar aynı
		// bölgeden; soru metni cevabı ele vermez. Yön (yaw) yalnız tercih: yapıyı örten yamaç ya da maket varsa kendiliğinden döner.
		KB('dn-kb7', 2, 'Kamera hangi caminin avlusunda?', 'sultanahmet', 34, ['Sultanahmet Camii', 'Süleymaniye Camii', 'Selimiye Camii', 'Fatih Camii']),
		KB('dn-kb8', 2, 'Boğaz kıyısındaki bu saray hangisi?', 'dolmabahce', 34, ['Dolmabahçe Sarayı', 'Topkapı Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı']),
		KB('dn-kb9', 2, 'Göldeki adada duran bu kilise hangi ilde?', 'akdamar', 65, ['Van', 'Bitlis', 'Muş', 'Hakkari']),
		KB('dn-kb10', 2, 'Bu ören yeri hangi ilde?', 'ani', 36, ['Kars', 'Ardahan', 'Iğdır', 'Erzurum']),
		KB('dn-kb11', 3, 'Dicle kıyısındaki bu tarihi yer hangi ilde?', 'hasankeyf', 72, ['Batman', 'Siirt', 'Diyarbakır', 'Mardin']),
		KB('dn-kb12', 1, 'Yamaca kurulu bu taş evler hangi ilde?', 'mardin', 47, ['Mardin', 'Şanlıurfa', 'Siirt', 'Diyarbakır']),
		KB('dn-kb13', 2, 'Konik kubbeli evleriyle ünlü bu yer hangisi?', 'harran', 63, ['Harran', 'Halfeti', 'Hasankeyf', 'Midyat']),
		KB('dn-kb14', 3, 'Bu Hitit başkenti hangi ilde?', 'hattusa', 19, ['Çorum', 'Yozgat', 'Kırşehir', 'Kırıkkale']),
		KB('dn-kb15', 2, 'Yirmi kubbeli bu cami hangi ilde?', 'bursaulu', 16, ['Bursa', 'Edirne', 'İstanbul', 'Kocaeli']),
		KB('dn-kb16', 3, 'Taç kapısıyla ünlü bu cami ve darüşşifa hangi ilde?', 'divrigi', 58, ['Sivas', 'Erzincan', 'Malatya', 'Tokat']),
		KB('dn-kb17', 2, 'Kayaya oyulmuş bu kral mezarları hangi ilde?', 'amasya', 5, ['Amasya', 'Tokat', 'Çorum', 'Samsun']),
		KB('dn-kb18', 2, 'Limandaki bu sekizgen kule hangi ilde?', 'kizilkule', 7, ['Antalya', 'Mersin', 'Muğla', 'Adana']),
		KB('dn-kb19', 3, 'Kayaya oyulmuş Likya mezarlarıyla ünlü bu antik kent hangisi?', 'myra', 7, ['Myra', 'Perge', 'Aspendos', 'Side']),
		KB('dn-kb20', 3, 'Selçuklu mezar taşlarıyla ünlü bu yer hangi ilde?', 'ahlat', 13, ['Bitlis', 'Van', 'Muş', 'Ağrı']),
		KB('dn-kb21', 2, 'Mozaikleriyle ünlü bu antik kent hangi ilde?', 'zeugma', 27, ['Gaziantep', 'Şanlıurfa', 'Adıyaman', 'Kahramanmaraş']),
		KB('dn-kb22', 3, 'Dik tiyatrosuyla ünlü bu akropol hangi ilde?', 'bergama', 35, ['İzmir', 'Manisa', 'Balıkesir', 'Aydın']),
		KB('dn-kb23', 1, 'Tepedeki bu kale hangi ilde?', 'ankarakalesi', 6, ['Ankara', 'Kırıkkale', 'Çankırı', 'Eskişehir']),
		KB('dn-kb24', 1, 'Dört ayaklı bu anıt hangi ilde?', 'canakkale', 17, ['Çanakkale', 'Edirne', 'Tekirdağ', 'Balıkesir']),
		KB('dn-kb25', 2, 'Kara bazalt surlar ve on gözlü köprü: burası hangi il?', 'diyarbakir', 21, ['Diyarbakır', 'Mardin', 'Batman', 'Şanlıurfa']),
		KB('dn-kb26', 2, 'Kamera hangi yapının başında?', 'ayasofya', 34, ['Ayasofya', 'Sultanahmet Camii', 'Süleymaniye Camii', 'Selimiye Camii']),
		KB('dn-kb27', 1, 'Kamera hangi ilde?', 'anitkabir', 6, ['Ankara', 'Eskişehir', 'Konya', 'Kırıkkale']),
		KB('dn-kb28', 2, 'Uçhisar kayası ve peri bacaları: burası hangi il?', 'peri', 50, ['Nevşehir', 'Kayseri', 'Aksaray', 'Niğde']),
		KB('dn-kb29', 1, 'Bu antik kütüphane hangi ilde?', 'celsus', 35, ['İzmir', 'Aydın', 'Muğla', 'Denizli']),
		KB('dn-kb30', 1, 'Yeşil kubbeli bu türbe hangi ilde?', 'mevlana', 42, ['Konya', 'Karaman', 'Aksaray', 'Kayseri']),
		KB('dn-kb31', 2, 'Mimar Sinan’ın "ustalık eserim" dediği bu cami hangi ilde?', 'selimiye', 22, ['Edirne', 'İstanbul', 'Kırklareli', 'Tekirdağ']),
		KB('dn-kb32', 2, 'Bu Osmanlı konakları hangi ilde?', 'safranbolu', 78, ['Karabük', 'Bartın', 'Kastamonu', 'Zonguldak']),
		KB('dn-kb33', 2, 'T biçimli dikilitaşlarıyla ünlü bu ören yeri hangi ilde?', 'gobekli', 63, ['Şanlıurfa', 'Adıyaman', 'Mardin', 'Gaziantep']),
		KB('dn-kb34', 2, 'Bu Roma tiyatrosu hangi ilde?', 'aspendos', 7, ['Antalya', 'Mersin', 'Muğla', 'Isparta']),
		KB('dn-kb35', 1, 'Bu tahta at hangi ilde?', 'truva', 17, ['Çanakkale', 'Balıkesir', 'İzmir', 'Edirne']),
		KB('dn-kb36', 2, 'Göl kıyısındaki bu kaya kalesi hangi ilde?', 'vankalesi', 65, ['Van', 'Bitlis', 'Ağrı', 'Muş']),
		KB('dn-kb37', 1, 'Denizin ortasındaki bu kule hangisi?', 'kizkulesi', 34, ['Kız Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Kız Kalesi']),
		KB('dn-kb38', 2, 'Bu kale hangi ilde?', 'bodrum', 48, ['Muğla', 'Aydın', 'İzmir', 'Antalya']),
		KB('dn-kb39', 2, 'Bu göl ve yayla evleri hangi ilde?', 'uzungol', 61, ['Trabzon', 'Rize', 'Artvin', 'Giresun']),
		KB('dn-kb40', 2, 'Bu saat kulesi hangi ilde?', 'saatkulesi', 35, ['İzmir', 'Manisa', 'Aydın', 'Balıkesir']),
		KB('dn-kb41', 2, 'İki minareli bu medrese hangi ilde?', 'ciftemin', 25, ['Erzurum', 'Erzincan', 'Kars', 'Ağrı']),
		KB('dn-kb42', 3, 'Kamera hangi köprünün üzerinde?', 'kopru', 34, ['15 Temmuz Şehitler Köprüsü', 'Fatih Sultan Mehmet Köprüsü', 'Yavuz Sultan Selim Köprüsü', 'Osmangazi Köprüsü']),
	],
	kosu: [
		// kadraj: Ege ve bir halka komşusu (cevabı ele vermeyecek kadar geniş, illere dokunulacak kadar yakın)
		KS('dn-ks1', 1, 'Ege Bölgesi’nin 8 ilini fethet!', [3, 9, 20, 35, 43, 45, 48, 64], [17, 10, 16, 11, 26, 42, 32, 15, 7]),
		KS('dn-ks2', 2, 'Plakası 10 ile 19 arasındaki illeri fethet!', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 'all'),
		KS('dn-ks3', 2, 'Adı K harfiyle başlayan illeri fethet!', [36, 37, 38, 39, 40, 41, 42, 43, 46, 70, 71, 78, 79], 'all'),
		KS('dn-ks4', 2, 'İran’a sınırı olan illeri fethet!', [76, 4, 65, 30], 'dogu,guneydogu'),
		KS('dn-ks5', 2, 'Suriye’ye sınırı olan illeri fethet!', [31, 79, 27, 63, 47, 73], [1, 80, 46, 44, 2, 21, 72, 56, 30, 33]),
	],
	ilavi: [
		IA('dn-ia1', 1, 31, ['Akdeniz Bölgesi’nde', 'Suriye’ye sınırı var', 'Plakası 31']),
		IA('dn-ia2', 2, 57, ['Karadeniz kıyısında', 'Türkiye’nin en kuzey ucu İnceburun burada', 'Plakası 57']),
		IA('dn-ia3', 2, 17, ['Marmara Bölgesi’nde', 'Toprakları iki kıtaya yayılır', 'Plakası 17']),
		IA('dn-ia4', 2, 48, ['Ege Bölgesi’nde', 'Bodrum, Marmaris ve Fethiye bu ilde', 'Plakası 48']),
		IA('dn-ia5', 3, 53, ['Karadeniz Bölgesi’nde', 'Çayıyla ünlü', 'Plakası 53']),
		// v1.1: 35 il daha (yedi bölgeden); olgular Kültür ve Turizm Bakanlığı il sayfaları, UNESCO ve TÜİK’e dayanır.
		IA('dn-ia6', 1, 1, ['Akdeniz Bölgesi’nde', 'Seyhan ve Ceyhan nehirleri bu ilin Çukurova’sını sular', 'Plakası 01']),
		IA('dn-ia7', 2, 3, ['Ege Bölgesi’nde', 'Büyük Taarruz 26 Ağustos 1922’de bu ilin Kocatepe’sinden yönetildi', 'Plakası 03']),
		IA('dn-ia8', 2, 5, ['Karadeniz Bölgesi’nde', 'Yeşilırmak kıyısındaki yalı boyu evleri ve elmasıyla ünlü', 'Plakası 05']),
		IA('dn-ia9', 3, 11, ['Marmara Bölgesi’nde', 'Osmanlı Beyliği’nin doğduğu Söğüt bu ilde', 'Plakası 11']),
		IA('dn-ia10', 3, 12, ['Doğu Anadolu Bölgesi’nde', 'Adı “bin göl”den gelir; Solhan’da yüzen adalı bir göl var', 'Plakası 12']),
		IA('dn-ia11', 2, 14, ['Karadeniz Bölgesi’nde', 'Abant Gölü ve usta aşçılarıyla ünlü Mengen bu ilde', 'Plakası 14']),
		IA('dn-ia12', 2, 18, ['İç Anadolu Bölgesi’nde', 'Yerin altında, tuzdan oyulmuş bir mağara şehri var', 'Plakası 18']),
		IA('dn-ia13', 1, 19, ['Karadeniz Bölgesi’nde', 'Leblebisi ve Hitit başkenti Hattuşa ile ünlü', 'Plakası 19']),
		IA('dn-ia14', 2, 23, ['Doğu Anadolu Bölgesi’nde', 'Harput Kalesi ve Hazar Gölü bu ilde', 'Plakası 23']),
		IA('dn-ia15', 2, 28, ['Karadeniz kıyısında', 'Tombul fındığı ve Aksu Festivali ile ünlü', 'Plakası 28']),
		IA('dn-ia16', 3, 30, ['Doğu Anadolu Bölgesi’nde', 'Cilo ve Sat dağları, köpüklü Zap Suyu bu ilde', 'Plakası 30']),
		IA('dn-ia17', 2, 39, ['Marmara Bölgesi’nde', 'Bulgaristan’a sınırı var; Istranca Dağları bu ilde', 'Plakası 39']),
		IA('dn-ia18', 2, 40, ['İç Anadolu Bölgesi’nde', 'Ahi Evran’ın şehri; Neşet Ertaş’ın türküleriyle anılır', 'Plakası 40']),
		IA('dn-ia19', 2, 49, ['Doğu Anadolu Bölgesi’nde', '1071 Malazgirt Zaferi bu ilin topraklarında kazanıldı', 'Plakası 49']),
		IA('dn-ia20', 3, 51, ['İç Anadolu Bölgesi’nde', 'Aladağlar ve kayaya oyulmuş Gümüşler Manastırı bu ilde', 'Plakası 51']),
		IA('dn-ia21', 2, 54, ['Marmara Bölgesi’nde', 'Sapanca Gölü burada; ile adını veren nehir Karadeniz’e burada dökülür', 'Plakası 54']),
		IA('dn-ia22', 2, 60, ['Karadeniz Bölgesi’nde', 'Ballıca Mağarası, yazmaları ve kendi adıyla anılan kebabı', 'Plakası 60']),
		IA('dn-ia23', 2, 64, ['Ege Bölgesi’nde', 'Lidya’nın “Karun Hazinesi” bu ilin müzesinde sergilenir', 'Plakası 64']),
		IA('dn-ia24', 3, 66, ['İç Anadolu Bölgesi’nde', 'Türkiye’nin ilk millî parkı olan çamlığı bu ilde (1958)', 'Plakası 66']),
		IA('dn-ia25', 1, 67, ['Karadeniz kıyısında', 'Türkiye’nin taş kömürü havzası, madencilerin şehri', 'Plakası 67']),
		IA('dn-ia26', 3, 70, ['İç Anadolu Bölgesi’nde', 'Karamanoğlu Mehmet Bey 1277’de Türkçeyi buradan resmî dil ilan etti', 'Plakası 70']),
		IA('dn-ia27', 3, 73, ['Güneydoğu Anadolu Bölgesi’nde', 'Cudi Dağı ve Irak’a açılan Habur Sınır Kapısı bu ilde', 'Plakası 73']),
		IA('dn-ia28', 2, 74, ['Karadeniz kıyısında', 'İki adası ve iki limanıyla Amasra bu ilde', 'Plakası 74']),
		IA('dn-ia29', 2, 75, ['Doğu Anadolu Bölgesi’nde', 'Kışın donan Çıldır Gölü’nde buz üstünde atlı kızak', 'Plakası 75']),
		IA('dn-ia30', 2, 76, ['Doğu Anadolu Bölgesi’nde', 'Türkiye’nin en doğu ucu burada; Ermenistan, Nahçıvan ve İran’a sınırı var', 'Plakası 76']),
		IA('dn-ia31', 2, 77, ['Marmara Bölgesi’nde', 'Termal kaplıcaları ve Atatürk’ün “Yürüyen Köşk”ü bu ilde', 'Plakası 77']),
		IA('dn-ia32', 3, 79, ['Güneydoğu Anadolu Bölgesi’nde', 'Yalnız bir ile komşu; öbür yanı Suriye sınırı', 'Plakası 79']),
		IA('dn-ia33', 3, 80, ['Akdeniz Bölgesi’nde', 'Karatepe’nin iki dilli yazıtları ve yer fıstığı bu ilde', 'Plakası 80']),
		IA('dn-ia34', 2, 81, ['Karadeniz Bölgesi’nde', 'Türkiye’nin en son kurulan ili: 1999’da il oldu', 'Plakası 81']),
		IA('dn-ia35', 2, 15, ['Akdeniz Bölgesi’nde', 'Bembeyaz kıyılı Salda Gölü bu ilde, Mars’a benzetilir', 'Plakası 15']),
		IA('dn-ia36', 3, 43, ['Ege Bölgesi’nde', 'Germiyanoğulları’nın başkentiydi; Evliya Çelebi’nin baba ocağı', 'Plakası 43']),
		IA('dn-ia37', 2, 9, ['Ege Bölgesi’nde', 'Büyük Menderes ovası ve Afrodisias antik kenti bu ilde', 'Plakası 09']),
		IA('dn-ia38', 2, 21, ['Güneydoğu Anadolu Bölgesi’nde', 'Dicle kıyısında; dev karpuzları ve ciğer kebabıyla ünlü', 'Plakası 21']),
		IA('dn-ia39', 1, 7, ['Akdeniz Bölgesi’nde', 'Olimpos’ta Yanartaş’ın alevleri binlerce yıldır yanıyor', 'Plakası 07']),
		IA('dn-ia40', 3, 20, ['Ege Bölgesi’nde', 'Buldan dokumaları ve Laodikya antik kenti bu ilde', 'Plakası 20']),
	],
	baglanti: [
		BG('dn-bg1', 'eglence', 1, [
			['İstanbul’daki saraylar', ['Topkapı', 'Dolmabahçe', 'Çırağan', 'Yıldız']],
			['Gökyüzünde görülür', ['Ay', 'Güneş', 'Bulut', 'Gökkuşağı']],
			['Türkiye’yi çevreleyen denizler', ['Ege', 'Marmara', 'Akdeniz', 'Karadeniz']],
		]),
		BG('dn-bg2', 'tarih', 2, [
			['Padişah lakapları', ['Yavuz', 'Kanuni', 'Yıldırım', 'Fatih']],
			['İstanbul’un ilçeleri', ['Beşiktaş', 'Kadıköy', 'Üsküdar', 'Sarıyer']],
			['Hava olayları', ['Şimşek', 'Dolu', 'Kırağı', 'Sis']],
		]),
		BG('dn-bg3', 'cografya', 1, [
			['Dağlar', ['Ağrı', 'Erciyes', 'Uludağ', 'Palandöken']],
			['Göller', ['Van', 'Tuz', 'Eğirdir', 'Salda']],
			['İller', ['Sinop', 'Rize', 'Bitlis', 'Kars']],
		]),
		BG('dn-bg4', 'sanat', 2, [
			['Halk çalgıları', ['Kemençe', 'Bağlama', 'Ney', 'Tulum']],
			['Peynirler', ['Kaşar', 'Lor', 'Çökelek', 'Örgü']],
			['Kebaplar', ['Adana', 'Urfa', 'İskender', 'Beyti']],
		]),
		BG('dn-bg5', 'spor', 3, [
			['Futbol terimleri', ['Ofsayt', 'Korner', 'Penaltı', 'Taç']],
			['Basketbol terimleri', ['Turnike', 'Ribaund', 'Pivot', 'Üçlük']],
			['Voleybol terimleri', ['Manşet', 'Servis', 'Blok', 'Smaç']],
		]),
	],
}, ...GROUPS.map((g) => g.SAMPLES));
