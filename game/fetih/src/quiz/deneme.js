// YENİ · DENEME SORU TİPLERİ: yalnız soru galerisinde (dist/SoruGalerisi.html) oynanır. Maç dönüşümüne (TYPE_WEIGHTS,
// banka) GİRMEZ; kullanıcı galeride deneyip karar verince benimsenen tip `TYPES`e taşınır, süresi timing.js'in
// parts() işlevine bir `case` olarak girer. Ayrıntılı kavram listesi ve gerekçeler: ref/yeni-soru-tipleri/defter.md
//
// Sözleşme `TYPES` ile aynı: { time, label, kind, needsMap?, keep?, jokers?, prepare, mount, judge, bot, fmt?, sub?,
// joker? }. Süre bütçesi aynı modelden (d_ortak.js stamp → timing.js sabitleri ve PROFILE girdisi).
//
//   kusbakisi  Kuşbakışı      kamera bir maketin dibinden yükselir; erken bilen kazanır (3B harita, yapılar)
//   ilavi      İl Avı         siluet + sıcak-soğuk: yanlış il uzaklığın rengine boyanır, ipucu açılır (3B harita)
//
// Örnek sorular (DENEME_SAMPLES) elle yazıldı ve doğrulandı (kaynaklar defterde). Harita verisi (il adı, plaka, bölge,
// komşuluk, sınır çizgisi) src/data/turkiye.json'dan yalnız okunur.

import { kusbakisi } from './d_kusbakisi.js';
import { ilavi } from './d_ilavi.js';
// ek deneme grupları: her grup kendi dosyasında { TYPES, ORDER, SAMPLES } verir, süre profillerini timing.js PROFILE'a
// kendisi ekler (Object.assign). Böylece gruplar birbirine dokunmadan büyür.
import * as harita from './deneme-harita.js';
import * as duello from './deneme-duello.js';
import * as akil from './deneme-akil.js';
import * as icat3b from './deneme-icat3b.js';
import * as icat from './deneme-icat.js';
import * as gk from './deneme-gozkarari.js';
// YENİ 10 (kırmızı rozet, galerinin en üstü): beş grup, her biri iki tip
import * as y1 from './deneme-yeni1.js';
import * as y2 from './deneme-yeni2.js';
import * as y3 from './deneme-yeni3.js';
import * as y4 from './deneme-yeni4.js';
import * as y5 from './deneme-yeni5.js';
export { bindApp } from './d_ortak.js';

const TAZE_GROUPS = [y1, y2, y3, y4, y5];
const GROUPS = [harita, duello, akil, icat3b, icat, gk, ...TAZE_GROUPS];
/** En yeni tipler (galeride en üstte, kırmızı YENİ rozetiyle): [tip, ad, tanıtım]. */
export const TAZE_ORDER = TAZE_GROUPS.flatMap((g) => g.ORDER);

export const DENEME_TYPES = Object.assign({ kusbakisi, ilavi }, ...GROUPS.map((g) => g.TYPES));

/** Galeri sırası: [tip, galerideki adı, bir satırlık tanıtım]. */
export const DENEME_ORDER = [
	['kusbakisi', 'Kuşbakışı', 'Kamera maketin dibinden yükselir'],
	['ilavi', 'İl Avı · Sıcak Soğuk', 'Siluet, uzaklık rengi, ipucu'],
	...GROUPS.flatMap((g) => g.ORDER),
];

const KB = (id, diff, q, site, il, a, extra = {}) => ({ id, cat: 'cografya', diff, type: 'kusbakisi', q, site, il, a, ...extra });
const IA = (id, diff, il, hints) => ({ id, cat: 'cografya', diff, type: 'ilavi', q: 'Siluetteki gizli ili haritada bul!', il, hints });

export const DENEME_SAMPLES = Object.assign({
	kusbakisi: [
		KB('dn-kb1', 1, 'Kamera hangi ilin üzerinde?', 'galata', 34, ['İstanbul', 'İzmir', 'Çanakkale', 'Edirne'], { yaw: 0.5 }),
		KB('dn-kb2', 1, 'Bu bembeyaz teraslar hangi ilde?', 'pamukkale', 20, ['Denizli', 'Aydın', 'Muğla', 'Burdur'], { yaw: -0.4 }),
		KB('dn-kb3', 2, 'Sarp kayalığa yaslanmış bu manastır hangi ilde?', 'sumela', 61, ['Trabzon', 'Rize', 'Giresun', 'Artvin'], { yaw: 0.2 }),
		KB('dn-kb4', 2, 'Denizin içindeki bu kale hangi ilde?', 'kizkalesi', 33, ['Mersin', 'Antalya', 'Muğla', 'Hatay'], { yaw: -0.8 }),
		KB('dn-kb5', 2, 'Kamera hangi yapının başında?', 'nemrut', 2, ['Nemrut Dağı', 'Göbeklitepe', 'Zeugma', 'Harran'], { yaw: 0.05 }),
		KB('dn-kb6', 3, 'Bu saray hangi ilde?', 'ishakpasa', 4, ['Ağrı', 'Kars', 'Van', 'Erzurum'], { yaw: -0.3 }),
		// v0.9: her yapının yakın çekim kahraman maketi var; yeni 19 yapı + eski yapıların kalanı. Yanlış şıklar aynı
		// bölgeden; soru metni cevabı ele vermez. Yön (yaw) yalnız tercih: yapıyı örten yamaç ya da maket varsa kendiliğinden döner.
		KB('dn-kb7', 2, 'Kamera hangi caminin avlusunda?', 'sultanahmet', 34, ['Sultanahmet Camii', 'Süleymaniye Camii', 'Selimiye Camii', 'Fatih Camii']),
		KB('dn-kb8', 2, 'Boğaz kıyısındaki bu saray hangisi?', 'dolmabahce', 34, ['Dolmabahçe Sarayı', 'Topkapı Sarayı', 'Çırağan Sarayı', 'Beylerbeyi Sarayı']),
		KB('dn-kb9', 2, 'Göldeki adada duran bu kilise hangi ilde?', 'akdamar', 65, ['Van', 'Bitlis', 'Muş', 'Hakkari']),
		KB('dn-kb10', 2, 'Bu ören yeri hangi ilde?', 'ani', 36, ['Kars', 'Ardahan', 'Iğdır', 'Erzurum']),
		KB('dn-kb11', 3, 'Dicle kıyısındaki bu tarihi yer hangi ilde?', 'hasankeyf', 72, ['Batman', 'Siirt', 'Diyarbakır', 'Mardin']),
		KB('dn-kb12', 1, 'Yamaca kurulu bu taş evler hangi ilde?', 'mardin', 47, ['Mardin', 'Şanlıurfa', 'Siirt', 'Diyarbakır']),
		KB('dn-kb13', 2, 'Kamera Şanlıurfa’nın hangi ilçesinde?', 'harran', 63, ['Harran', 'Halfeti', 'Birecik', 'Siverek']),
		KB('dn-kb14', 2, 'Bu Hitit başkenti hangi ilde?', 'hattusa', 19, ['Çorum', 'Yozgat', 'Kırşehir', 'Kırıkkale']),
		KB('dn-kb15', 2, 'Yirmi kubbeli bu cami hangi ilde?', 'bursaulu', 16, ['Bursa', 'Edirne', 'İstanbul', 'Kocaeli']),
		KB('dn-kb16', 3, 'Taç kapısıyla ünlü bu cami ve darüşşifa hangi ilde?', 'divrigi', 58, ['Sivas', 'Erzincan', 'Malatya', 'Tokat']),
		KB('dn-kb17', 2, 'Yeşilırmak’a bakan bu kaya mezarları hangi ilde?', 'amasya', 5, ['Amasya', 'Tokat', 'Çorum', 'Samsun']),
		KB('dn-kb18', 2, 'Limandaki bu sekizgen kule hangi ilde?', 'kizilkule', 7, ['Antalya', 'Mersin', 'Muğla', 'Adana']),
		KB('dn-kb19', 3, 'Kaya mezarlarıyla ünlü bu Likya kenti hangisi?', 'myra', 7, ['Myra', 'Patara', 'Phaselis', 'Olimpos']),
		KB('dn-kb20', 3, 'Selçuklu mezar taşlarıyla ünlü bu yer hangi ilde?', 'ahlat', 13, ['Bitlis', 'Van', 'Muş', 'Ağrı']),
		KB('dn-kb21', 2, 'Mozaikleriyle ünlü bu antik kent hangi ilde?', 'zeugma', 27, ['Gaziantep', 'Şanlıurfa', 'Adıyaman', 'Kahramanmaraş']),
		KB('dn-kb22', 3, 'Dik tiyatrosuyla ünlü bu akropol hangi ilde?', 'bergama', 35, ['İzmir', 'Manisa', 'Balıkesir', 'Aydın']),
		KB('dn-kb23', 2, 'Tepedeki bu kale hangi ilde?', 'ankarakalesi', 6, ['Ankara', 'Kırıkkale', 'Çankırı', 'Eskişehir']),
		KB('dn-kb24', 1, 'Dört ayaklı bu anıt hangi ilde?', 'canakkale', 17, ['Çanakkale', 'Edirne', 'Tekirdağ', 'Balıkesir']),
		KB('dn-kb25', 2, 'Kara bazalt surlarla çevrili bu şehir hangi ilde?', 'diyarbakir', 21, ['Diyarbakır', 'Mardin', 'Batman', 'Şanlıurfa']),
		KB('dn-kb26', 2, 'Kamera hangi yapının başında?', 'ayasofya', 34, ['Ayasofya', 'Sultanahmet Camii', 'Süleymaniye Camii', 'Selimiye Camii']),
		KB('dn-kb27', 1, 'Kamera hangi ilde?', 'anitkabir', 6, ['Ankara', 'Eskişehir', 'Konya', 'Kırıkkale']),
		KB('dn-kb28', 1, 'Bu masalsı kaya bacaları hangi ilde?', 'peri', 50, ['Nevşehir', 'Kayseri', 'Aksaray', 'Niğde']),
		KB('dn-kb29', 2, 'Bu antik kütüphane hangi ilde?', 'celsus', 35, ['İzmir', 'Aydın', 'Muğla', 'Denizli']),
		KB('dn-kb30', 1, 'Yeşil kubbeli bu türbe hangi ilde?', 'mevlana', 42, ['Konya', 'Karaman', 'Aksaray', 'Kayseri']),
		KB('dn-kb31', 2, 'Mimar Sinan’ın "ustalık eserim" dediği bu cami hangi ilde?', 'selimiye', 22, ['Edirne', 'İstanbul', 'Kırklareli', 'Tekirdağ']),
		KB('dn-kb32', 2, 'Bu Osmanlı konakları hangi ilde?', 'safranbolu', 78, ['Karabük', 'Bartın', 'Kastamonu', 'Zonguldak']),
		KB('dn-kb33', 2, 'T biçimli dikilitaşlarıyla ünlü bu ören yeri hangi ilde?', 'gobekli', 63, ['Şanlıurfa', 'Adıyaman', 'Mardin', 'Gaziantep']),
		KB('dn-kb34', 2, 'Bu antik tiyatro hangi ilde?', 'aspendos', 7, ['Antalya', 'Mersin', 'Muğla', 'Isparta']),
		KB('dn-kb35', 1, 'Bu tahta at hangi ilde?', 'truva', 17, ['Çanakkale', 'Balıkesir', 'İzmir', 'Edirne']),
		KB('dn-kb36', 2, 'Göl kıyısındaki bu kaya kalesi hangi ilde?', 'vankalesi', 65, ['Van', 'Bitlis', 'Ağrı', 'Muş']),
		KB('dn-kb37', 1, 'Denizin ortasındaki bu kule hangisi?', 'kizkulesi', 34, ['Kız Kulesi', 'Galata Kulesi', 'Kızıl Kule', 'Kız Kalesi']),
		KB('dn-kb38', 2, 'Bu kale hangi ilde?', 'bodrum', 48, ['Muğla', 'Aydın', 'İzmir', 'Antalya']),
		KB('dn-kb39', 2, 'Bu göl ve yayla evleri hangi ilde?', 'uzungol', 61, ['Trabzon', 'Rize', 'Artvin', 'Giresun']),
		KB('dn-kb40', 2, 'Bu saat kulesi hangi ilde?', 'saatkulesi', 35, ['İzmir', 'Manisa', 'Aydın', 'Balıkesir']),
		KB('dn-kb41', 2, 'İki minareli bu medrese hangi ilde?', 'ciftemin', 25, ['Erzurum', 'Erzincan', 'Kars', 'Ağrı']),
		KB('dn-kb42', 3, 'Kamera hangi köprünün üzerinde?', 'kopru', 34, ['15 Temmuz Şehitler Köprüsü', 'Fatih Sultan Mehmet Köprüsü', 'Yavuz Sultan Selim Köprüsü', 'Osmangazi Köprüsü']),
		// v1.2: aynı maketlere ikinci bir açı (yapının dönemi, yaptıranı, ilçesi, çevresi). Her yapıya en çok bir ek soru;
		// şıklar aynı türden (ilçe ise ilçe, hükümdar ise hükümdar). Cevap ekranı yine il ve yapı adını yazar.
		KB('dn-kb43', 2, 'Bu taş kuleyi 14. yüzyılda kimler yaptı?', 'galata', 34, ['Cenevizliler', 'Venedikliler', 'Bizanslılar', 'Osmanlılar']),
		KB('dn-kb44', 3, 'Bugünkü yapıyı hangi Bizans imparatoru yaptırdı?', 'ayasofya', 34, ['Justinianus', 'Büyük Konstantin', 'II. Theodosius', 'Herakleios']),
		KB('dn-kb45', 3, 'Bu caminin mimarı kimdir?', 'sultanahmet', 34, ['Sedefkâr Mehmed Ağa', 'Mimar Sinan', 'Davud Ağa', 'Mimar Kemaleddin']),
		KB('dn-kb46', 2, 'Atatürk’ün bu saraydaki odasında saat hangi anı gösterir?', 'dolmabahce', 34, ['09.05', '09.15', '10.05', '08.55']),
		KB('dn-kb47', 3, 'Boğaz’ın bu ilk köprüsü hangi yıl açıldı?', 'kopru', 34, ['1973', '1988', '1965', '1980']),
		KB('dn-kb48', 3, 'Bu anıtın kurulduğu tepenin eski adı nedir?', 'anitkabir', 6, ['Rasattepe', 'Kocatepe', 'Çankaya', 'Hıdırlıktepe']),
		KB('dn-kb49', 2, 'Bu yörede, Kızılırmak kiliyle çömlekçiliği ünlü ilçe hangisi?', 'peri', 50, ['Avanos', 'Ürgüp', 'Derinkuyu', 'Gülşehir']),
		KB('dn-kb50', 3, 'Bu dev taş başları hangi kral yaptırdı?', 'nemrut', 2, ['I. Antiokhos', 'Büyük İskender', 'Kral Midas', 'Kroisos']),
		KB('dn-kb51', 2, 'Bu beyaz terasların üstündeki antik kent hangisi?', 'pamukkale', 20, ['Hierapolis', 'Laodikya', 'Afrodisias', 'Efes']),
		KB('dn-kb52', 3, 'Bu göl hangi ilçenin sınırlarında?', 'uzungol', 61, ['Çaykara', 'Maçka', 'Of', 'Sürmene']),
		KB('dn-kb53', 3, 'Bu kule, hangi padişahın tahttaki 25. yılı için yapıldı?', 'saatkulesi', 35, ['II. Abdülhamid', 'Sultan Abdülaziz', 'V. Mehmed Reşad', 'Sultan Abdülmecid']),
		KB('dn-kb54', 3, 'Bu türbede yatan Mevlânâ hangi şehirde doğdu?', 'mevlana', 42, ['Belh', 'Konya', 'Tebriz', 'Buhara']),
		KB('dn-kb55', 2, 'Bu camiyi hangi padişah yaptırdı?', 'selimiye', 22, ['II. Selim', 'I. Selim', 'Kanuni Sultan Süleyman', 'III. Murad']),
		KB('dn-kb56', 1, 'Bu ilçe adını hangi bitkiden alır?', 'safranbolu', 78, ['Safran', 'Lavanta', 'Haşhaş', 'Gül']),
		KB('dn-kb57', 3, 'Truva kazılarını 1871’de başlatan kimdi?', 'truva', 17, ['Heinrich Schliemann', 'Howard Carter', 'Arthur Evans', 'Carl Humann']),
		KB('dn-kb58', 3, 'Bu tiyatronun yanından akan çay hangisi?', 'aspendos', 7, ['Köprüçay', 'Manavgat Çayı', 'Aksu Çayı', 'Düden Çayı']),
		KB('dn-kb59', 2, 'Bu kale hangi uygarlığın başkentiydi?', 'vankalesi', 65, ['Urartular', 'Hititler', 'Frigler', 'Lidyalılar']),
		KB('dn-kb60', 3, 'Denizdeki kalenin karşısında, kıyıdaki kale hangisi?', 'kizkalesi', 33, ['Korykos Kalesi', 'Mamure Kalesi', 'Silifke Kalesi', 'Alanya Kalesi']),
		KB('dn-kb61', 2, 'Bu kalenin bulunduğu ilçenin antik adı nedir?', 'bodrum', 48, ['Halikarnassos', 'Knidos', 'Myndos', 'Kaunos']),
		KB('dn-kb62', 3, 'Bu adaya teknelerin kalktığı ilçe hangisi?', 'akdamar', 65, ['Gevaş', 'Tatvan', 'Erciş', 'Edremit']),
		KB('dn-kb63', 3, 'Bu ören yerinin dibinde sınırı çizen çay hangisi?', 'ani', 36, ['Arpaçay', 'Aras', 'Kura', 'Çoruh']),
		KB('dn-kb64', 2, 'Bu tarihî ilçenin büyük kısmı hangi barajın gölünde kaldı?', 'hasankeyf', 72, ['Ilısu', 'Atatürk', 'Keban', 'Birecik']),
		KB('dn-kb65', 3, 'Bu ilin hangi ilçesi telkari gümüşçülüğüyle ünlü?', 'mardin', 47, ['Midyat', 'Nusaybin', 'Kızıltepe', 'Savur']),
		KB('dn-kb66', 2, 'Bu başkentin Hitit kralı Kadeş Antlaşması’nı kimle yaptı?', 'hattusa', 19, ['Mısır', 'Asur', 'Babil', 'Mitanni']),
		KB('dn-kb67', 2, 'Niğbolu zaferinin adağıyla yapılan bu camiyi kim yaptırdı?', 'bursaulu', 16, ['Yıldırım Bayezid', 'Orhan Gazi', 'I. Murad', 'Çelebi Mehmed']),
		KB('dn-kb68', 3, 'Bu külliyeyi hangi beylik yaptırdı?', 'divrigi', 58, ['Mengücekliler', 'Danişmentliler', 'Saltuklular', 'Artuklular']),
		KB('dn-kb69', 3, 'Bu kaya mezarları hangi krallığın krallarına ait?', 'amasya', 5, ['Pontus', 'Kommagene', 'Lidya', 'Frigya']),
		KB('dn-kb70', 3, 'Bu kuleyi 1226’da hangi Selçuklu sultanı yaptırdı?', 'kizilkule', 7, ['I. Alâeddin Keykubad', 'II. Kılıçarslan', 'I. Keyhüsrev', 'II. Keyhüsrev']),
		KB('dn-kb71', 2, 'Noel Baba’nın piskoposluk yaptığı bu kent hangi ilçede?', 'myra', 7, ['Demre', 'Kaş', 'Finike', 'Kemer']),
		KB('dn-kb72', 2, 'Bu antik kent hangi nehrin kıyısında?', 'zeugma', 27, ['Fırat', 'Dicle', 'Seyhan', 'Asi']),
		KB('dn-kb73', 2, 'Adı bu kentten gelen yazı malzemesi hangisi?', 'bergama', 35, ['Parşömen', 'Papirüs', 'Kâğıt', 'Kil tablet']),
		KB('dn-kb74', 2, 'Bu anıt hangi yarımadada?', 'canakkale', 17, ['Gelibolu', 'Biga', 'Kapıdağ', 'Datça']),
		KB('dn-kb75', 3, 'Surların eteğindeki, UNESCO mirası bahçelerin adı nedir?', 'diyarbakir', 21, ['Hevsel', 'Gülhane', 'Emirgan', 'Harbiye']),
	],
	ilavi: [
		IA('dn-ia1', 1, 31, ['Akdeniz Bölgesi’nde', 'Suriye’ye sınırı var', 'Plakası 31']),
		IA('dn-ia2', 2, 57, ['Karadeniz kıyısında', 'Türkiye’nin en kuzey ucu İnceburun burada', 'Plakası 57']),
		IA('dn-ia3', 2, 17, ['Marmara Bölgesi’nde', 'Truva ören yeri ve Gelibolu Yarımadası bu ilde', 'Plakası 17']),
		IA('dn-ia4', 2, 48, ['Ege Bölgesi’nde', 'Bodrum, Marmaris ve Fethiye bu ilde', 'Plakası 48']),
		IA('dn-ia5', 2, 53, ['Karadeniz Bölgesi’nde', 'Yamaçları çay bahçeleriyle kaplı; Ayder Yaylası bu ilde', 'Plakası 53']),
		// v1.1: 35 il daha (yedi bölgeden); olgular Kültür ve Turizm Bakanlığı il sayfaları, UNESCO ve TÜİK’e dayanır.
		IA('dn-ia6', 1, 1, ['Akdeniz Bölgesi’nde', 'Seyhan ve Ceyhan nehirleri bu ilin Çukurova’sını sular', 'Plakası 01']),
		IA('dn-ia7', 2, 3, ['Ege Bölgesi’nde', 'Büyük Taarruz 26 Ağustos 1922’de bu ilin Kocatepe’sinden yönetildi', 'Plakası 03']),
		IA('dn-ia8', 2, 5, ['Karadeniz Bölgesi’nde', 'Yeşilırmak kıyısındaki yalı boyu evleri ve elmasıyla ünlü', 'Plakası 05']),
		IA('dn-ia9', 3, 11, ['Marmara Bölgesi’nde', 'Osmanlı Beyliği’nin doğduğu Söğüt bu ilde', 'Plakası 11']),
		IA('dn-ia10', 3, 12, ['Doğu Anadolu Bölgesi’nde', 'Adı “bin göl”den gelir; Solhan’da yüzen adalı bir göl var', 'Plakası 12']),
		IA('dn-ia11', 2, 14, ['Karadeniz Bölgesi’nde', 'Abant Gölü ve usta aşçılarıyla ünlü Mengen bu ilde', 'Plakası 14']),
		IA('dn-ia12', 2, 18, ['İç Anadolu Bölgesi’nde', 'Yerin altında, tuzdan oyulmuş dev bir mağarası var', 'Plakası 18']),
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
		// v1.2: 34 il daha (yedi bölgeden); ikinci ipucu ilin iki bilinen olgusu, üçüncüsü plaka.
		IA('dn-ia41', 2, 2, ['Güneydoğu Anadolu Bölgesi’nde', 'Kommagene Kralı Antiokhos’un dev taş başları bu ilin dağında', 'Plakası 02']),
		IA('dn-ia42', 1, 4, ['Doğu Anadolu Bölgesi’nde', 'Türkiye’nin en yüksek dağı ve İshak Paşa Sarayı bu ilde', 'Plakası 04']),
		IA('dn-ia43', 2, 8, ['Karadeniz Bölgesi’nde', 'Gürcistan’a sınırı var; Çoruh Vadisi ve Macahel bu ilde', 'Plakası 08']),
		IA('dn-ia44', 2, 10, ['Marmara Bölgesi’nde', 'Hem Marmara’ya hem Ege’ye kıyısı var; Ayvalık ve Cunda bu ilde', 'Plakası 10']),
		IA('dn-ia45', 3, 13, ['Doğu Anadolu Bölgesi’nde', 'Nemrut Krater Gölü ve Ahlat’ın Selçuklu mezar taşları bu ilde', 'Plakası 13']),
		IA('dn-ia46', 1, 22, ['Marmara Bölgesi’nde', 'Kırkpınar güreşleri ve Selimiye Camii bu ilde', 'Plakası 22']),
		IA('dn-ia47', 3, 24, ['Doğu Anadolu Bölgesi’nde', 'Tulum peyniri ve Kemaliye’nin Karanlık Kanyonu bu ilde', 'Plakası 24']),
		IA('dn-ia48', 2, 26, ['İç Anadolu Bölgesi’nde', 'Lületaşı ve Odunpazarı’nın renkli cumbalı evleri bu ilde', 'Plakası 26']),
		IA('dn-ia49', 3, 29, ['Karadeniz Bölgesi’nde', 'Adını gümüş madenlerinden alır; pestil ve kömesiyle ünlü', 'Plakası 29']),
		IA('dn-ia50', 2, 32, ['Akdeniz Bölgesi’nde', 'Gül yağı ve halısıyla ünlü; Eğirdir Gölü bu ilde', 'Plakası 32']),
		IA('dn-ia51', 2, 36, ['Doğu Anadolu Bölgesi’nde', 'Ani Ören Yeri, kaz eti ve gravyer peyniri bu ilde', 'Plakası 36']),
		IA('dn-ia52', 2, 37, ['Karadeniz Bölgesi’nde', 'Şapka Devrimi 1925’te burada ilan edildi; Taşköprü sarımsağı ünlü', 'Plakası 37']),
		IA('dn-ia53', 2, 41, ['Marmara Bölgesi’nde', 'İzmit Körfezi’ni çevreler; pişmaniyesi ve Kartepe’siyle ünlü', 'Plakası 41']),
		IA('dn-ia54', 1, 44, ['Doğu Anadolu Bölgesi’nde', 'Kayısısıyla ünlü; Arslantepe Höyüğü UNESCO listesinde', 'Plakası 44']),
		IA('dn-ia55', 2, 45, ['Ege Bölgesi’nde', 'Mesir macunu, Spil Dağı ve sultaniye üzümü bu ilde', 'Plakası 45']),
		IA('dn-ia56', 2, 46, ['Akdeniz Bölgesi’nde', 'Bıçakla kesilen dövme dondurması ve Sütçü İmam’ın şehri', 'Plakası 46']),
		IA('dn-ia57', 2, 52, ['Karadeniz Bölgesi’nde', 'Fındığıyla ünlü; Boztepe’den teleferikle şehre inilir', 'Plakası 52']),
		IA('dn-ia58', 1, 55, ['Karadeniz Bölgesi’nde', 'Atatürk 19 Mayıs 1919’da bu ilin kıyısına çıktı', 'Plakası 55']),
		IA('dn-ia59', 3, 56, ['Güneydoğu Anadolu Bölgesi’nde', 'Perde pilavı, büryan kebabı ve fıstığıyla ünlü', 'Plakası 56']),
		IA('dn-ia60', 2, 59, ['Marmara Bölgesi’nde', 'Namık Kemal burada doğdu; köftesi şehrin adıyla anılır', 'Plakası 59']),
		IA('dn-ia61', 3, 62, ['Doğu Anadolu Bölgesi’nde', 'Munzur Vadisi Millî Parkı ve Pertek Kalesi bu ilde', 'Plakası 62']),
		IA('dn-ia62', 1, 65, ['Doğu Anadolu Bölgesi’nde', 'Türkiye’nin en büyük gölünün doğu kıyısında; kahvaltısıyla ünlü', 'Plakası 65']),
		IA('dn-ia63', 3, 68, ['İç Anadolu Bölgesi’nde', 'Ihlara Vadisi ve Hasan Dağı bu ilde', 'Plakası 68']),
		IA('dn-ia64', 3, 69, ['Karadeniz Bölgesi’nde', 'Çoruh Nehri bu ilin dağlarından doğar; Baksı Müzesi burada', 'Plakası 69']),
		IA('dn-ia65', 3, 71, ['İç Anadolu Bölgesi’nde', 'Makine ve Kimya Endüstrisi’nin silah fabrikalarıyla bilinir', 'Plakası 71']),
		IA('dn-ia66', 2, 72, ['Güneydoğu Anadolu Bölgesi’nde', 'Raman Dağı’ndaki petrol kuyuları ve Hasankeyf bu ilde', 'Plakası 72']),
		IA('dn-ia67', 2, 78, ['Karadeniz Bölgesi’nde', 'Safranbolu evleri ve Türkiye’nin ilk demir-çelik fabrikası bu ilde', 'Plakası 78']),
		IA('dn-ia68', 1, 42, ['İç Anadolu Bölgesi’nde', 'Yüzölçümü en büyük il; Mevlânâ Türbesi burada', 'Plakası 42']),
		IA('dn-ia69', 2, 47, ['Güneydoğu Anadolu Bölgesi’nde', 'Midyat’ın telkarisi ve Deyrulzafaran Manastırı bu ilde', 'Plakası 47']),
		IA('dn-ia70', 2, 58, ['İç Anadolu Bölgesi’nde', 'Kangal köpekleri ve Divriği Ulu Camii bu ilde', 'Plakası 58']),
		IA('dn-ia71', 1, 63, ['Güneydoğu Anadolu Bölgesi’nde', 'Göbeklitepe ve Balıklıgöl bu ilde', 'Plakası 63']),
		IA('dn-ia72', 1, 61, ['Karadeniz Bölgesi’nde', 'Sümela Manastırı ve Uzungöl bu ilde', 'Plakası 61']),
		IA('dn-ia73', 1, 33, ['Akdeniz Bölgesi’nde', 'Kız Kalesi, Anamur muzu ve tantunisiyle ünlü', 'Plakası 33']),
		IA('dn-ia74', 1, 38, ['İç Anadolu Bölgesi’nde', 'Erciyes Dağı’nın eteğinde; pastırması ve mantısıyla ünlü', 'Plakası 38']),
	],
}, ...GROUPS.map((g) => g.SAMPLES));
