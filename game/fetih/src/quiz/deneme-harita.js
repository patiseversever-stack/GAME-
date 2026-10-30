// YENİ · deneme grubu: harita tipleri (defter 9 Kimim Ben?, 29 Şive Haritası). deneme.js bu dosyayı otomatik yükler.
// Sözleşme: TYPES = { tip: tipNesnesi }, ORDER = [[tip, galerideki adı, bir satırlık tanıtım]], SAMPLES = { tip: [soru…] }.
// Süre profilleri her tipin kendi dosyasında: Object.assign(PROFILE, { tip: { min, max, think } }).

import { kimim, KIMIM_SAMPLES, STYLES } from './d_kimim.js';
import { sive, SIVE_SAMPLES } from './d_sive.js';

export const TYPES = { kimim, sive };
export const ORDER = [
	['kimim', 'Kimim Ben?', '5 ipucu akar, bildiğin an ile dokun'],
	['sive', 'Şive Haritası', 'Yöresel söz: hangi yörenin ağzı?'],
];

// v1.1 ek sorular. Kimim: 25 il daha; on beş tarzın her biri toplamda 2–3 kez, art arda aynı tarz yok. İpuçları zordan
// kolaya; il adı ve plaka geçmez. Doğrulama: Kültür ve Turizm Bakanlığı il sayfaları; UNESCO Dünya Mirası ve Jeopark
// listeleri (Diyarbakır Surları ve Hevsel Bahçeleri 2015, Arslantepe 2021, Safranbolu 1994, Kula-Salihli 2020, Mesir
// Macunu Festivali 2012); TPMK coğrafi işaret kayıtları; TBMM'nin 1973'te Maraş'a verdiği "Kahraman" unvanı.
const KM = (id, diff, il, style, clues) => ({ id, cat: 'cografya', diff, type: 'kimim', q: STYLES[style].q, il, style, clues });
const KIMIM_EK = [
	KM('dn-km16', 1, 34, 'ben', [
		'Bir zamanlar adım Byzantion’du, sonra Konstantinopolis oldum.',
		'Kapalıçarşım beş yüz yılı aşkın süredir alışverişe açık.',
		'Kız Kulesi denizimde, Galata Kulesi tepemde durur.',
		'Bir yakam Avrupa’da, öbür yakam Asya’da; aramdan Boğaz akar.',
		'1453’te Fatih Sultan Mehmet beni fethetti.',
	]),
	KM('dn-km17', 2, 33, 'gunluk', [
		'Göksu Deltası’nda sazlıkların arasında flamingoları izledim.',
		'Anamur’da muz bahçelerinin arasından yürüdüm.',
		'Tarsus’ta Kleopatra Kapısı’nın altından geçtim, Aziz Paulus’un kuyusunu gördüm.',
		'Dönüşte kutu kutu cezerye ve kerebiç aldım.',
		'Akşam uzun sahil parkında yürüyüp bol limonlu bir tantuni yedim.',
	]),
	KM('dn-km18', 2, 58, 'manset', [
		'Balıklı Kaplıca’da sezon açıldı: minik balıklar iş başında',
		'Âşık Veysel’in köyü Sivrialan’da sazlar onun türküleriyle çaldı',
		'Kangal köpekleri güzellik yarışmasında: jüri zor seçti',
		'Selçuklu’dan kalma Çifte Minareli Medrese turistlerin gözdesi',
		'Eylül 1919 kongresinin toplandığı lise binası müze olarak ziyaretçi bekliyor',
	]),
	KM('dn-km19', 2, 21, 'tarihci', [
		'Dört Ayaklı Minare gerçekten dört taş sütunun üstünde durur.',
		'Ulu Camii, Anadolu’nun en eski camilerinden biri sayılır.',
		'Dicle’nin üstündeki On Gözlü Köprü 1065’te yapıldı.',
		'Surları ve Hevsel Bahçeleri 2015’te birlikte UNESCO Dünya Mirası oldu.',
		'Kara bazalt surlarından ötürü eski adı “Kara Amid”di.',
	]),
	KM('dn-km20', 1, 1, 'tarif', [
		'Tezgâhı, Roma’dan kalma Taşköprü’nün ırmağına bakan pencerenin önüne kur.',
		'Tatlıyı şimdiden hazırla: karsambaç için karın üstüne pekmez gezdir.',
		'Kıymayı zırhla çek, kuyruk yağını bolca kat.',
		'Eti yassı şişe elle yapıştır, közün üstünde çevir.',
		'Acılı kebabı şehrin adıyla sun; dünya onu bu adla tanır.',
	]),
	KM('dn-km21', 2, 2, 'bilmece', [
		'Kommagene Krallığı’nın topraklarıyım,',
		'Roma’dan kalma Cendere Köprüsü bende durur,',
		'Perre’nin kaya mezarları bağrımda yatar,',
		'Çiğ köftem coğrafi işaretle tescillidir,',
		'Dağımın zirvesinde taş tanrılar güneşi karşılar.',
	]),
	KM('dn-km22', 2, 44, 'radyo', [
		'Arslantepe Höyüğü’nden bildiriyoruz: Dünya Mirası listesine gireli beri ziyaretçi eksik olmuyor.',
		'Battalgazi’de Ulu Cami çevresinde trafik akıcı.',
		'İnönü Üniversitesi kampüsündeki dinleyicilerimize selam!',
		'Cumhurbaşkanı Turgut Özal’ın doğduğu şehirde hava güneşli.',
		'Kayısı bahçelerinde hasat başladı; damlar kurutma sergileriyle turuncuya boyandı.',
	]),
	KM('dn-km23', 2, 46, 'spiker', [
		'Ahır Dağı’nın eteğinde düdük çaldı!',
		'Sütçü İmam’ın şehrinde taraftar coşkulu!',
		'Devre arasında tribünlere sıcak tarhana çorbası!',
		'Pul biberi kadar acı bir şut, top direkten döndü!',
		'Millî Mücadele’deki direnişiyle 1973’te “Kahraman” unvanı alan şehirde maç bitti!',
	]),
	KM('dn-km24', 1, 7, 'kartpostal', [
		'Bugün Perge’nin sütunlu caddesinde yürüdük.',
		'Kaleiçi’ne Hadrian Kapısı’ndan girdik.',
		'Düden Şelalesi kayalardan doğrudan denize dökülüyor, izlemeye doyamadık!',
		'Akşam Konyaaltı sahilinde güneşi batırdık.',
		'Turizmin başkentinde deniz, güneş ve portakal bahçeleri; sevgiler!',
	]),
	KM('dn-km25', 2, 38, 'emlak', [
		'Kültepe’ye (antik Kaniş) yakın: dört bin yıllık ticaret mirası kapınızda.',
		'Selçuklu’dan kalma Gevher Nesibe Şifahanesi’ne komşu.',
		'Hafta sonu Sultan Sazlığı’nda kuş gözlemi.',
		'Pastırma ve sucuk kokulu çarşıya yürüme mesafesinde.',
		'Balkondan karlı Erciyes manzarası; kayak merkezine yarım saat.',
	]),
	KM('dn-km26', 2, 26, 'mesaj', [
		'Bugün Frig Vadisi’nde Yazılıkaya’daki Midas Anıtı’nı gördüm, kayaya oyulmuş dev bir cephe',
		'Ankara’dan ilk hızlı tren seferinin yapıldığı hatla geldik, 1,5 saat!',
		'Sazova Parkı’ndaki masal şatosunun önünde fotoğraf çektim',
		'Odunpazarı’nın renkli cumbalı evlerinde kahve içtik',
		'Akşam Porsuk Çayı’nda gondola bindik!',
	]),
	KM('dn-km27', 2, 4, 'dedektif', [
		'Şüpheli en son Ahmed-i Hânî’nin türbesinin yakınında görüldü.',
		'Diyadin’in sıcak su kaynaklarından yükselen buharın arasında kayboldu.',
		'İran sınırındaki meteor çukurunun kenarında ayak izleri bulundu.',
		'Bir sarayın avlusunda düşürülmüş bilet: İshak Paşa Sarayı.',
		'Tanık, Nuh’un gemisinin indiği anlatılan karlı dağın eteğinde gördüğünü söylüyor.',
	]),
	KM('dn-km28', 2, 47, 'rehber', [
		'İlk durağımız Deyrulzafaran: sarımsı taşından ötürü “Safran Manastırı” da denir.',
		'Zinciriye Medresesi’nin kubbelerinden ovaya bakacağız.',
		'Kasımiye Medresesi’nin havuzlu avlusunda mola veriyoruz.',
		'Öğle yemeğinde kaburga dolması var.',
		'Ve karşınızda Mezopotamya Ovası’na bakan, yamaca basamak basamak kurulmuş taş şehir.',
	]),
	KM('dn-km29', 1, 55, 'navigasyon', [
		'Kızılırmak ile Yeşilırmak deltalarının arasında ilerliyorsunuz.',
		'Bafra yönüne sapmayın; pidesi bekleyebilir.',
		'Sağda Amisos Tepesi’nin tümülüsleri.',
		'Bandırma Vapuru’nun aslına uygun kopyası sağınızda: müze gemi.',
		'Millî Mücadele’nin başladığı kıyıya vardınız.',
	]),
	KM('dn-km30', 2, 31, 'masal', [
		'Bir varmış bir yokmuş; Asi Nehri kıyısında, Habib-i Neccar Dağı’nın eteğinde bir şehir varmış.',
		'Dağdaki bir mağaraya oyulmuş Sen Piyer Kilisesi’nde dualar yükselirmiş.',
		'Müzesinin mozaikleri dünyanın sayılı koleksiyonlarındanmış.',
		'Sofralarda humus, muhammara ve tepsi kebabı eksik olmazmış.',
		'Tatlı olarak tel kadayıflı, peynirli, sıcacık künefe gelirmiş.',
	]),
	KM('dn-km31', 2, 48, 'rehber', [
		'İlk durağımız Dalyan: karşıda Kaunos’un kayaya oyulmuş kral mezarları.',
		'İztuzu kumsalı caretta carettaların yuvaları için geceleri kapalı.',
		'Datça’da baharda badem çiçekleri açar.',
		'Akyaka’da Gökova’nın rüzgârıyla sörf yapacağız.',
		'Ve Ölüdeniz: Babadağ’dan atlayan yamaç paraşütçüleri tepemizde.',
	]),
	KM('dn-km32', 3, 45, 'tarihci', [
		'Kula’nın volkan konileri 2020’de UNESCO Küresel Jeoparkı oldu.',
		'Lidya’nın başkenti Sardes, Salihli sınırlarında.',
		'Spil Dağı’ndaki “Ağlayan Kaya” Niobe efsanesine bağlanır.',
		'Çekirdeksiz sultaniye üzümünün bağları bu ovadadır.',
		'Nevruzda camiden halka saçılan mesir macunu 2012’de UNESCO listesine girdi.',
	]),
	KM('dn-km33', 2, 3, 'tarif', [
		'Tezgâhın mermeri İscehisar ocaklarından gelsin.',
		'Haşhaş ezmesini hazırla, pidenin üstüne sür.',
		'Coğrafi işaretli sucuğu tavada çevir.',
		'Ekmek kadayıfını manda sütünden çıkan kalın kaymakla taçlandır.',
		'Yemekten sonra termal kaplıcada dinlen; kale, adı gibi kara bir kayanın üstünde.',
	]),
	KM('dn-km34', 2, 10, 'navigasyon', [
		'Manyas Gölü kıyısındaki Kuş Cenneti’ni geçiyorsunuz.',
		'Susurluk’ta mola: köpüklü ayran ve tost.',
		'Edremit Körfezi yönünde Kazdağları’nın zeytinliklerine giriyorsunuz.',
		'Hem Marmara’ya hem Ege’ye kıyısı olan ilin merkezine yaklaşıyorsunuz.',
		'Bandırma Vapuru’na adını veren liman da bu ilde; vardınız.',
	]),
	KM('dn-km35', 2, 5, 'masal', [
		'Bir varmış bir yokmuş; coğrafyacı Strabon bu şehirde doğmuş.',
		'Şehzadeler sancakbeyi olup burada yönetmeyi öğrenirlermiş.',
		'Ferhat, Şirin’e kavuşmak için dağı delip şehre su getirmiş.',
		'Kayalara oyulmuş kral mezarları geceleri ışıl ışıl yanarmış.',
		'Yeşilırmak kıyısındaki yalı boyu evlerinin önünde kırmızı elmalar satılırmış.',
	]),
	KM('dn-km36', 3, 37, 'gunluk', [
		'Kasaba köyündeki Mahmut Bey Camii’nde tek çivi kullanılmadığını öğrendim.',
		'Horma Kanyonu’nda tahta yürüyüş yolunda yürüdüm.',
		'Taşköprü’den bir örgü sarımsak aldım.',
		'Atatürk’ün 1925’te Şapka Devrimi’ni ilan ettiği şehirde saat kulesine çıktım.',
		'İnebolu’dan cephane taşıyan Şerife Bacı’nın anıtının önünde durdum.',
	]),
	KM('dn-km37', 2, 78, 'emlak', [
		'Yörük Köyü’nün tarihî konaklarına komşu.',
		'Tokatlı Kanyonu’ndaki cam seyir terasına beş dakika.',
		'1937’de temeli atılan ilk entegre demir-çelik fabrikasının şehrinde.',
		'Açılışta safranlı lokum ikramı!',
		'UNESCO listesindeki Safranbolu’dan, ahşap cumbalı avlulu bir konak.',
	]),
	KM('dn-km38', 2, 23, 'spiker', [
		'Keban Barajı’nın şehrinde düdük çaldı!',
		'Harput Ulu Camii’nin eğri minaresi kadar eğri bir şut!',
		'Hazar Gölü kıyısından gelen taraftarlar da tribünde!',
		'Fırat Üniversitesi öğrencileri tezahüratta!',
		'Devre arasında tribünlere dut pestili ve orcik dağıtılıyor!',
	]),
	KM('dn-km39', 2, 8, 'radyo', [
		'Macahel’den bağlanıyoruz: biyosfer rezervinde Kafkas arıları tam mesai.',
		'Şavşat’ın ahşap evlerinden bacalar tütüyor.',
		'Yusufeli Barajı’nın gölünde tekneler sakin.',
		'Çoruh’ta rafting parkurunda su coşkun.',
		'Kafkasör Yaylası’nda boğa güreşleri için geri sayım başladı!',
	]),
	KM('dn-km40', 2, 20, 'kartpostal', [
		'Hierapolis’in antik havuzunda batık sütunların arasında yüzdük.',
		'Kaklık Mağarası’nda yerin altında küçük beyaz traverten basamakları var!',
		'Tekstil şehrinden sana havlu ve bornoz aldım.',
		'Uzun öten horozun heykelinin önünde fotoğraf çektirdim.',
		'Bembeyaz travertenlerde çıplak ayak yürüdük!',
	]),
];

// Şive: 21 söz daha, yedi bölgeden üçer (her bölge toplam 6). Kaba, argo ya da yöreyi küçümseyen ifade yok. Kaynaklar:
// TDK Güncel Türkçe Sözlük ve Derleme Sözlüğü, Kültür ve Turizm Bakanlığı il mutfağı sayfaları, TPMK coğrafi işaret
// kayıtları (Antep lebeniyesi, Siirt perde pilavı, Kırklareli hardaliyesi, Adapazarı ıslama köftesi, Burdur şiş köftesi…).
const SV = (id, diff, region, ils, say, mean, note, who) => ({ id, cat: 'eglence', diff, type: 'sive', q: 'Bu ağız hangi yörenin?', region, ils, say, mean, note, who });
const W = {
	nine: (ad, yazma, bg) => ({ ad, tip: 'nine', yazma, bg, skin: '#eab896', giysi: '#f3ead8' }),
	teyze: (ad, yazma, bg) => ({ ad, tip: 'yemeni', yazma, bg, skin: '#efc19d', giysi: '#3b5ba8' }),
	amca: (ad, sapka, bg) => ({ ad, tip: 'kasket', sapka, bg, skin: '#d9a57c', giysi: '#7a5a3a' }),
	usta: (ad, bg) => ({ ad, tip: 'usta', bg, skin: '#e3ad84', giysi: '#ffffff' }),
	genc: (ad, sac, bg) => ({ ad, tip: 'genc', sac, bg, skin: '#f1c49b', giysi: '#2a9d5c' }),
	abla: (ad, sac, bg) => ({ ad, tip: 'sac', sac, bg, skin: '#f3c9a5', giysi: '#d8546a' }),
};
const SIVE_EK = [
	// Karadeniz
	SV('dn-sv22', 1, 'karadeniz', [61, 53, 8], '[Horon] tepmeden düğün olur mi ha?', [['horon', 'Karadeniz’in halk oyunu']], 'Horon, kemençe eşliğinde omuz omuza, titreyerek oynanır; Doğu Karadeniz düğünlerinin kalbidir.', W.genc('Yusuf', '#1a120c', '#2a7ad8')),
	SV('dn-sv23', 2, 'karadeniz', [53, 61], 'Sabahtan [kuymak] yaptum, peyniri uzaya uzaya!', [['kuymak', 'mısır unu, tereyağı ve peynirle pişen sıcak yemek']], 'Kuymak (mıhlama) mısır unu, tereyağı ve yayla peyniriyle tavada pişer; kaşıkla alınınca peyniri uzar.', W.nine('Ayşe Nine', '#c2402a', '#3a9a7a')),
	SV('dn-sv24', 3, 'karadeniz', [53, 61], '[Hamsikoli] pişti, sıcak sıcak gel!', [['hamsikoli', 'hamsili mısır ekmeği']], 'Hamsikolide hamsi; mısır unu, pırasa ve yeşilliklerle yoğrulup fırında pişer.', W.teyze('Nurten Teyze', '#3a8a3a', '#d8a03a')),
	// Ege
	SV('dn-sv25', 2, 'ege', [35, 9, 48], 'Pazardan [şevketibostan] aldım, zeytinyağlısını yapcam.', [['şevketibostan', 'kökü ve sapı yenen dikenli ot']], 'Şevketibostan dikenli bir yabani ottur; Ege’de ayıklanıp zeytinyağı ve limonla pişirilir.', W.teyze('Sevim Teyze', '#8a3ab8', '#3aa0b8')),
	SV('dn-sv26', 1, 'ege', [35], 'Bi [kumru] ver, sucuklu kaşarlı olsun!', [['kumru', 'sucuk, kaşar ve domatesli sandviç']], 'Kumru, susamlı özel ekmeğiyle İzmir Çeşme’nin ünlü sandviçidir; içine sucuk, kaşar ve domates girer.', W.genc('Kaan', '#3a2414', '#e0603a')),
	SV('dn-sv27', 2, 'ege', [48], 'Bi porsiyon [çökertme], yoğurdu bol olsun!', [['çökertme', 'çubuk patates üstünde yoğurtlu et']], 'Çökertme kebabında kibrit çöpü patatesin üstüne yoğurt ve sote et konur; Muğla’nın, özellikle Bodrum’un yemeğidir.', W.amca('Osman Amca', '#2b3a5e', '#2f8ad0')),
	// Marmara
	SV('dn-sv28', 1, 'marmara', [16], 'Bi [pideli köfte], üstüne kızgın tereyağı!', [['pideli köfte', 'pide üstünde köfte, domates sosu ve tereyağı']], 'Pideli köfte, küp doğranmış pidenin üstüne köfte, domates sosu, yoğurt ve kızgın tereyağıyla gelir; Bursa’nın meşhurudur.', W.usta('Rıza Usta', '#2a6ad8')),
	SV('dn-sv29', 3, 'marmara', [39, 22, 59], 'Bağbozumunda [hardaliye] yaptık, buz gibi iç!', [['hardaliye', 'üzüm ve hardal tohumuyla yapılan içecek']], 'Hardaliye, üzümün ezilmiş hardal tohumu ve vişne yaprağıyla bekletilmesiyle yapılan bir Trakya içeceğidir; Kırklareli’nin simgesidir.', W.nine('Hamide Nine', '#5a7ad8', '#b8403a')),
	SV('dn-sv30', 2, 'marmara', [54], 'Akşama [ıslama köfte] var, ekmeği et suyuna batırdım!', [['ıslama köfte', 'et suyuna batırılmış ekmekle köfte']], 'Islama köftede ekmek kaynar et suyuna batırılır, üstüne köfte konur; Sakarya’nın Adapazarı’yla özdeşleşmiş bir lezzettir.', W.amca('Kemal Amca', '#4a3a2a', '#c94a6a')),
	// İç Anadolu
	SV('dn-sv31', 2, 'icanadolu', [38], 'Gız, akşama [yağlama] yapıyom, kat kat!', [['yağlama', 'yufka katlarının arasına kıymalı harç konan yemek']], 'Yağlama, ince yufkaların arasına kıymalı, salçalı harç ve yoğurt sürülüp dilimlenen bir Kayseri yemeğidir.', W.teyze('Saadet Teyze', '#d84a3a', '#5a8ad8')),
	SV('dn-sv32', 1, 'icanadolu', [50], '[Testi kebabı] geldi, testiyi kır da ye!', [['testi kebabı', 'toprak testide pişen etli yemek']], 'Testi kebabı toprak testide saatlerce pişer, sofrada testinin ağzı kırılarak açılır; Kapadokya’nın, Nevşehir’in yemeğidir.', W.usta('Hasan Usta', '#d8803a')),
	SV('dn-sv33', 3, 'icanadolu', [66, 40], 'Kış geldi, [arabaşı] gecesine gidiyok!', [['arabaşı', 'tavuklu, acılı çorba; soğuk hamurla yenir']], 'Arabaşı çorbası kaşıkla kesilen soğumuş hamurla birlikte yenir; kış gecelerinde topluca yenen bir Yozgat geleneğidir.', W.amca('Ahmet Amca', '#5e4a2b', '#3a9a8a')),
	// Doğu Anadolu
	SV('dn-sv34', 2, 'dogu', [25, 36, 75], '[Gadan alım], gel otur bi çay iç!', [['gadan alım', 'derdin bana gelsin (sevgi sözü)']], '“Gadanı alım” Erzurum ve Kars ağzında sevgi ve hoş geldin sözüdür: senin derdin, belan bana gelsin demektir.', W.nine('Gülizar Nine', '#7a2a8a', '#2a8ad8')),
	SV('dn-sv35', 2, 'dogu', [44], 'Fırından [kağıt kebabı] çıktı, kâğıdı aç da öyle ye!', [['kağıt kebabı', 'yağlı kâğıda sarılıp fırında pişen kuzu eti']], 'Kağıt kebabında kuzu eti sebzeyle yağlı kâğıda sarılıp fırında pişirilir; Malatya mutfağının ünlü yemeğidir.', W.usta('Yaşar Usta', '#3a8a5a')),
	SV('dn-sv36', 3, 'dogu', [36, 75], 'Çaya [kete] getirdim, içi kavutlu!', [['kete', 'içi kavrulmuş unlu, katlı çörek']], 'Ketenin içine tereyağında kavrulmuş un konur; Kars ve Ardahan kahvaltılarının vazgeçilmez çöreğidir.', W.teyze('Zübeyde Teyze', '#2a5a3a', '#d86a3a')),
	// Güneydoğu Anadolu
	SV('dn-sv37', 2, 'guneydogu', [63, 47, 27], 'Misafire bi fincan [mırra] koyun!', [['mırra', 'çok kez kaynatılan acı, koyu kahve']], 'Mırra, defalarca kaynatılıp koyulaştırılan acı bir kahvedir; kulpsuz fincanın dibinde azıcık ikram edilir.', W.amca('Hamit Amca', '#3a2a1a', '#b8402a')),
	SV('dn-sv38', 3, 'guneydogu', [56], 'Düğün sofrasına [perde pilavı] geldi, kubbe gibi!', [['perde pilavı', 'ince hamura sarılı tavuklu, bademli pilav']], 'Perde pilavında tavuk, badem ve pirinç ince bir hamur perdesine sarılıp fırında pişer; Siirt düğünlerinin yemeğidir.', W.teyze('Hatun Teyze', '#a83a6a', '#3a6ad8')),
	SV('dn-sv39', 2, 'guneydogu', [27], 'Kışın bi tas [lebeniye] içmeden olmaz!', [['lebeniye', 'köfteli, nohutlu yoğurt çorbası']], 'Lebeniye; yoğurt, nohut ve minik köftelerle yapılan sıcak bir yoğurt çorbasıdır, Gaziantep mutfağındandır.', W.abla('Zehra', '#2a1a10', '#3aa07a')),
	// Akdeniz
	SV('dn-sv40', 1, 'akdeniz', [1], 'Bu sıcakta bi [bici bici] yiyelim!', [['bici bici', 'buzlu, gül şerbetli nişasta tatlısı']], 'Bici bici, nişasta pelteye kırılmış buz, pudra şekeri ve gül şerbeti eklenerek yapılan bir Adana yaz tatlısıdır.', W.genc('Barış', '#120c08', '#d8a02a')),
	SV('dn-sv41', 2, 'akdeniz', [7], 'Köftenin yanına [tahinli piyaz], limonu da sık!', [['tahinli piyaz', 'tahin soslu kuru fasulye salatası']], 'Tahinli piyaz, haşlanmış kuru fasulyenin tahin, sirke ve yumurtayla buluştuğu bir salatadır; Antalya’da köftenin yanında gelir.', W.amca('Necati Amca', '#8a6a2a', '#2a9ad8')),
	SV('dn-sv42', 3, 'akdeniz', [15], 'Bi [şiş köfte], yanına közlenmiş biber!', [['şiş köfte', 'yassı şişte kömürde pişen köfte']], 'Burdur şiş köftesi, kıymanın yassı şişlere sarılıp kömür ateşinde pişirilmesiyle yapılır ve kentin simgesidir.', W.usta('Şükrü Usta', '#5a3ad8')),
];

export const SAMPLES = { kimim: [...KIMIM_SAMPLES, ...KIMIM_EK], sive: [...SIVE_SAMPLES, ...SIVE_EK] };
