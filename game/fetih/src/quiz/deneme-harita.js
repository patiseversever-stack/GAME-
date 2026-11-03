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
// listeleri (Diyarbakır Surları ve Hevsel Bahçeleri 2015, Arslantepe 2021, Safranbolu 1994, Kula-Salihli Jeoparkı, Mesir
// Macunu Festivali 2012); TPMK coğrafi işaret kayıtları; TBMM'nin 1973'te Maraş'a verdiği "Kahraman" unvanı.
const KM = (id, diff, il, style, clues) => ({ id, cat: 'cografya', diff, type: 'kimim', q: STYLES[style].q, il, style, clues });
const KIMIM_EK = [
	KM('dn-km16', 1, 34, 'ben', [
		'Yeraltındaki sarnıcımın sütunlarından birinin dibinde baş aşağı bir Medusa durur.',
		'Kapalıçarşım beş yüz yılı aşkın süredir alışverişe açık.',
		'Bir zamanlar adım Byzantion’du, sonra Konstantinopolis oldum.',
		'Kız Kulesi denizimde, Galata Kulesi tepemde durur.',
		'Bir yakam Avrupa’da, öbür yakam Asya’da; aramdan Boğaz akar.',
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
		'Selçuklu’dan kalma Çifte Minareli Medrese turistlerin gözdesi',
		'Kangal köpekleri güzellik yarışmasında: jüri zor seçti',
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
		'Atatürk Barajı’nın gölü kıyılarımı kucaklar,',
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
	KM('dn-km27', 3, 4, 'dedektif', [
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
		'Kula’nın volkan konileri UNESCO Küresel Jeoparkları arasındadır.',
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
	KM('dn-km38', 3, 23, 'spiker', [
		'Keban Barajı’nın şehrinde düdük çaldı!',
		'Harput Ulu Camii’nin eğri minaresi kadar eğri bir şut!',
		'Hazar Gölü kıyısından gelen taraftarlar da tribünde!',
		'Fırat Üniversitesi öğrencileri tezahüratta!',
		'Devre arasında tribünlere dut pestili ve orcik dağıtılıyor!',
	]),
	KM('dn-km39', 3, 8, 'radyo', [
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
	// v1.2: 20 il daha; on beş tarzın her biri toplamda 4 kez (art arda aynı tarz yok). İlk ipucu ele vermez, son ipucu
	// ili herkesin bileceği olguyla söyler.
	KM('dn-km41', 2, 19, 'ben', [
		'Alacahöyük’ün bronz güneş kursları benim toprağımdan çıktı.',
		'İskilip dolması düğün sofralarımın baş tacıdır.',
		'Osmancık pirinci tarlalarımda yeşerir.',
		'Hititlerin başkenti Hattuşa, Boğazkale’de bende saklı.',
		'Leblebim memleketin dört bir yanına kavrulup gider.',
	]),
	KM('dn-km42', 3, 39, 'manset', [
		'Dupnisa Mağarası ziyaretçi sezonunu açtı',
		'İğneada longozlarında kuş gözlemcileri buluştu',
		'Dereköy Sınır Kapısı’nda bayram yoğunluğu',
		'Bağbozumu başladı: hardaliye kazanları kuruldu',
		'Lüleburgaz ve Babaeski’de köfteciler sabah ocak yaktı',
	]),
	KM('dn-km43', 2, 14, 'bilmece', [
		'Gölcük’üm ormanın ortasında bir aynadır,',
		'Yedigöller’im güzün kızıla, sarıya bürünür,',
		'Köroğlu’nun efsanesi dağlarımda at koşturur,',
		'Mengen’in aşçıları dünyanın mutfaklarında,',
		'Abant Gölü kıyımda kartpostal gibi durur.',
	]),
	KM('dn-km44', 3, 74, 'mesaj', [
		'Güzelcehisar’da lavdan oluşmuş dev sütun taşları gördük, inanılmaz',
		'İnkumu’nda denize girdik, kumu bembeyaz',
		'Kurucaşile’de ahşap tekne yapan ustaları izledik',
		'Küre Dağları’nın ormanlarında yürüyüş yaptık, her yer yemyeşil',
		'Amasra’da iki limanın arasından adaya yürüdük, balık ekmek yedik!',
	]),
	KM('dn-km45', 3, 49, 'dedektif', [
		'Olay yerinde, adını bu ilden alan kırmızı bir lale bulundu.',
		'Tanık, şüpheliyi Murat Nehri’nin kıyısında gördüğünü söylüyor.',
		'Şüpheli Varto ile Bulanık arasında iz kaybettirdi.',
		'Cebinden 1071 tarihli bir zafer haritası çıktı: Malazgirt.',
		'Şüpheli il, adı üç harfli iki ilden biri; ama Van değil.',
	]),
	KM('dn-km46', 2, 60, 'gunluk', [
		'Zile’de Sezar’ın “Geldim, gördüm, yendim” dediği tepeye çıktım.',
		'Niksar’da Danişmentliler’den kalma medreseleri gezdim.',
		'Ballıca Mağarası’nda sarkıtların arasında yürüdüm.',
		'Yazmacılar çarşısında tahta kalıpla basılmış bir yazma aldım.',
		'Akşam, patlıcanlı dev şiş kebabını yedim; adını şehirden alıyor.',
	]),
	KM('dn-km47', 3, 13, 'tarihci', [
		'Şerefname, 1597’de bu şehrin beyi Şeref Han tarafından yazıldı.',
		'Ahlat’taki Selçuklu mezar taşları açık hava müzesinde durur.',
		'Tatvan’daki Nemrut Dağı’nın kalderasında dev bir krater gölü vardır.',
		'Kalesi, dar bir vadinin ortasındaki kayanın üstüne kurulmuştur.',
		'Bir türkü onu “beş minare”siyle anar.',
	]),
	KM('dn-km48', 2, 59, 'tarif', [
		'Tezgâhı, Macar Prensi Rákóczi’nin sürgün yıllarını geçirdiği evin yanına kur.',
		'Tatlı için Hayrabolu’nun peynirli tatlısını şimdiden şerbetle.',
		'Namık Kemal’in doğduğu şehrin mutfağındasın, acele etme.',
		'Kıymaya ekmek içi ve kimyon kat, elinle uzun yassı biçim ver.',
		'Köfteyi ızgarada pişir, yanına piyaz koy: dünya onu bu şehrin adıyla anar.',
	]),
	KM('dn-km49', 2, 52, 'radyo', [
		'Yason Burnu’ndan bildiriyoruz: tarihî kilisenin önünde dalgalar sakin.',
		'Perşembe Yaylası’nda şenlik hazırlıkları sürüyor.',
		'Çambaşı’nda kayak pistleri açıldı.',
		'Boztepe’den yamaç paraşütçüleri havada, teleferik dolu dolu.',
		'Türkiye’nin en çok fındık üreten ilinde hasat başladı!',
	]),
	KM('dn-km50', 2, 41, 'spiker', [
		'SEKA Kâğıt Müzesi’nin şehrinde düdük çaldı!',
		'Osman Hamdi Bey’in Eskihisar’daki evi kadar zarif bir pas!',
		'Kartepe’nin karlı yamaçlarından gelen taraftarlar tribünde!',
		'Körfeze bakan stadyumda yeşil-siyahlılar hücumda!',
		'Devre arasında tribünlere pişmaniye dağıtılıyor!',
	]),
	KM('dn-km51', 2, 9, 'kartpostal', [
		'Bugün Afrodisias’ta Tetrapylon’un önünde fotoğraf çektik.',
		'Didim’de Apollon Tapınağı’nın dev sütunlarına baktık!',
		'Dilek Yarımadası’nın koylarında yüzdük, su çok berrak!',
		'İncir kurutma sergilerinin arasından geçtik, bir kutu kuru incir aldık.',
		'Kuşadası’nda gemiler limana yanaşıyordu; efeler diyarından sevgiler!',
	]),
	KM('dn-km52', 3, 40, 'emlak', [
		'Selçuklu’dan kalma, gözlemevi olarak da kullanılmış Cacabey Medresesi’ne komşu.',
		'Terme Kaplıcası’na beş dakika.',
		'Kuş cenneti Seyfe Gölü’ne kısa bir sürüş.',
		'Ahi Evran’ın türbesine yürüme mesafesinde: esnaf geleneğinin merkezi.',
		'Akşamları bozlak dinlenir; Neşet Ertaş’ın doğduğu şehirde.',
	]),
	KM('dn-km53', 2, 15, 'rehber', [
		'İlk durağımız Sagalassos: Antoninler Çeşmesi hâlâ şırıl şırıl akıyor.',
		'İnsuyu Mağarası’nın yeraltı göllerine iniyoruz.',
		'Hacılar Höyüğü’nde Neolitik köyün izlerine bakacağız.',
		'Öğle yemeğinde şiş köfte, tatlıda ceviz ezmesi.',
		'Ve karşınızda bembeyaz kıyılarıyla Salda Gölü, Mars’a benzetilen göl.',
	]),
	KM('dn-km54', 3, 68, 'navigasyon', [
		'Aşıklı Höyük yönüne sapmayın; on bin yıllık köy bekleyebilir.',
		'Sultanhanı Kervansarayı’nın taç kapısını geçiyorsunuz.',
		'Solunuzda Hasan Dağı’nın karlı iki zirvesi.',
		'Selime Katedrali’nin kayaya oyulmuş salonlarını geçin.',
		'Melendiz Çayı’nın kanyonu: Ihlara Vadisi’ne vardınız.',
	]),
	KM('dn-km55', 3, 29, 'masal', [
		'Bir varmış bir yokmuş; Satala’da bir Roma lejyonu konaklarmış.',
		'Karaca Mağarası’nın damlataşları ışıl ışıl parlarmış.',
		'Kervanlar Zigana Geçidi’nden Trabzon’a inermiş.',
		'Dut pekmezinden pestil, cevizden köme yaparlarmış.',
		'Şehir adını dağlarından çıkarılan değerli bir madenden almış.',
	]),
	KM('dn-km56', 2, 28, 'ben', [
		'Kirazın Latince adının benim eski adımdan geldiği anlatılır.',
		'Kümbet ve Bektaş yaylalarımda her yaz şenlikler kurulur.',
		'Mayısta açığımdaki adanın çevresinde dilek tutulur, denize taş atılır.',
		'Fındık üreticilerinin birliği Fiskobirlik’in merkezi bendedir.',
		'Dünyaca ünlü tombul fındığım bahçelerimden toplanır.',
	]),
	KM('dn-km57', 2, 43, 'manset', [
		'Aizanoi’deki Zeus Tapınağı’na yabancı ziyaretçi akını',
		'Evliya Çelebi’nin baba ocağında Seyahatname söyleşisi',
		'Germiyanoğulları’nın eski başkentinde konak restorasyonu bitti',
		'Dumlupınar’da 30 Ağustos coşkusu: Başkomutan Tarihî Millî Parkı doldu',
		'Çini ve porselen atölyeleri gece gündüz çalışıyor',
	]),
	KM('dn-km58', 1, 67, 'bilmece', [
		'Gökgöl Mağarası’nın sarkıtları bende sallanır,',
		'Filyos’ta antik Tios kumların altından çıkar,',
		'Ereğli’de demir çelik fırınlarım hiç sönmez,',
		'Uzun Mehmet kara taşı benim topraklarımda buldu,',
		'Baretli madencilerin kömür şehriyim.',
	]),
	KM('dn-km59', 2, 32, 'mesaj', [
		'Yazılı Kanyon’da buz gibi suyun içinde yürüdük',
		'Kuyucak köyünde lavanta tarlalarında fotoğraf çektik, her yer mor!',
		'Eğirdir’de Yeşilada’ya yürüyerek geçtik',
		'Gül kolonyası ve gül reçeli aldım, bavul mis gibi',
		'Sabah gül hasadına katıldık; gül yağının başkentiymiş burası!',
	]),
	KM('dn-km60', 3, 51, 'dedektif', [
		'Tyana antik kentinin Roma su kemerinin dibinde bir eldiven bulundu.',
		'Şüpheli, kayaya oyulmuş Gümüşler Manastırı’nda saklandı.',
		'Ayak izleri Aladağlar’ın Demirkazık Zirvesi’ne doğru uzanıyor.',
		'Kaçış rotası: Kapadokya’nın güney ucu, Nevşehir’in komşusu.',
		'Cebinden bir elma ve şehrin adıyla anılan meşhur bir gazoz çıktı.',
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
	SV('dn-sv24', 3, 'karadeniz', [53, 61], '[Hamsikoli] pişti uşaklar, sıcak sıcak gelun!', [['hamsikoli', 'hamsili mısır ekmeği'], ['gelun', 'gelin']], 'Hamsikolide hamsi; mısır unu, pırasa ve yeşilliklerle yoğrulup fırında pişer. “Gelun” da Doğu Karadeniz ağzıdır.', W.teyze('Nurten Teyze', '#3a8a3a', '#d8a03a')),
	// Ege
	SV('dn-sv25', 2, 'ege', [35, 9, 48], 'Pazardan [şevketibostan] aldım, zeytinyağlısını yapcam.', [['şevketibostan', 'kökü ve sapı yenen dikenli ot']], 'Şevketibostan dikenli bir yabani ottur; Ege’de ayıklanıp zeytinyağı ve limonla pişirilir.', W.teyze('Sevim Teyze', '#8a3ab8', '#3aa0b8')),
	SV('dn-sv26', 1, 'ege', [35], 'Bi [kumru] ver, sucuklu kaşarlı olsun!', [['kumru', 'sucuk, kaşar ve domatesli sandviç']], 'Kumru, susamlı özel ekmeğiyle İzmir Çeşme’nin ünlü sandviçidir; içine sucuk, kaşar ve domates girer.', W.genc('Kaan', '#3a2414', '#e0603a')),
	SV('dn-sv27', 2, 'ege', [48], '[Ula], bi porsiyon [çökertme], yoğurdu bol olsun!', [['ula', 'arkadaşça seslenme'], ['çökertme', 'çubuk patates üstünde yoğurtlu et']], 'Çökertme kebabında kibrit çöpü patatesin üstüne yoğurt ve sote et konur; Muğla’nın, özellikle Bodrum’un yemeğidir.', W.amca('Osman Amca', '#2b3a5e', '#2f8ad0')),
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
	// v1.2: 21 söz daha, yedi bölgeden üçer (her bölge toplam 9). Yalnız o yörede yaygın söz, ağız biçimi ya da yörenin
	// kendi adıyla bilinen yemek; kaba söz yok, karakter adı yöreyi ele vermez.
	SV('dn-sv43', 1, 'karadeniz', [61, 53, 8], 'Hayde, yaylaya [gidelum]; inekler bekler!', [['gidelum', 'gidelim']], 'Doğu Karadeniz ağzında ekler yuvarlaklaşır: gidelim “gidelum”, yaptım “yaptum” olur.', W.amca('Temel Amca', '#2b3a2e', '#3a8ad8')),
	SV('dn-sv44', 2, 'karadeniz', [53, 8], 'Mısırı [serender]e serdum, fare çıkamaz!', [['serender', 'ayaklar üstünde ahşap ambar']], 'Serender, Rize ve Artvin’de fare çıkamasın diye ayaklar üstüne kurulan ahşap ambardır.', W.nine('Hanife Nine', '#d8a03a', '#3a7a5a')),
	SV('dn-sv45', 3, 'karadeniz', [61, 53, 28], 'Akşama [pepeçura] yaptum, üzümler taze!', [['pepeçura', 'üzüm suyu ve mısır unuyla yapılan tatlı']], 'Pepeçura, üzüm suyunun mısır unuyla koyulaştırılmasıyla yapılan bir Doğu Karadeniz tatlısıdır.', W.teyze('Sultan Teyze', '#6a3ab8', '#e0803a')),
	SV('dn-sv46', 1, 'ege', [9, 35, 20], 'Ula, kalk da bi [zeybek] oyna görelim!', [['zeybek', 'Ege’nin ağır, yiğit halk oyunu']], 'Zeybek, Ege’nin ağır ritimli, diz vurmalı halk oyunudur; “ula” da Ege’de sevecen bir seslenmedir.', W.amca('Halil Amca', '#3a2a1a', '#d8542a')),
	SV('dn-sv47', 2, 'ege', [45], 'Minareden [mesir] saçılıyo, kap da gel!', [['mesir', 'baharatlı şifalı macun']], 'Manisa’da her nevruzda Sultan Camii’nden halka mesir macunu saçılır; UNESCO listesindedir.', W.abla('Elif', '#3a2214', '#c24a6a')),
	SV('dn-sv48', 2, 'ege', [35], 'Maça bi paket [çiğdem] al, çitleriz!', [['çiğdem', 'ayçekirdeği']], 'İzmir’de ayçekirdeğine “çiğdem” denir; İzmirli onu çitlemeden maç izlemez.', W.genc('Onur', '#1a120c', '#2a6ad8')),
	SV('dn-sv49', 1, 'marmara', [41], 'Bi kutu [pişmaniye] al, tel tel olsun!', [['pişmaniye', 'ince tellerden yapılan helva']], 'Pişmaniye, kavrulan un ile şekerin çekilip ince tellere ayrılmasıyla yapılır; Kocaeli’nin simgesidir.', W.teyze('Necla Teyze', '#3a8a5a', '#d8a03a')),
	SV('dn-sv50', 2, 'marmara', [22], 'Bre, bi porsiyon [tava ciğer], yanına kuru biber!', [['bre', 'seslenme'], ['tava ciğer', 'ince doğranıp kızartılan ciğer']], 'Tava ciğer, ince dilimlenip unlanan ciğerin kızgın yağda kızartılmasıyla yapılır; Edirne’nin simgesidir.', W.usta('Ömer Usta', '#c94a3a')),
	SV('dn-sv51', 3, 'marmara', [16], 'Fırından [cantık] aldım, sıcakken ye!', [['cantık', 'kıymalı, açık ağızlı küçük pide']], 'Cantık, üstü açık bırakılan kıymalı küçük bir pidedir; Bursa fırınlarının sabah lezzetidir.', W.genc('Burak', '#2a1a10', '#7a5ad8')),
	SV('dn-sv52', 2, 'icanadolu', [42], 'Düğün yemeğinin sonuna [sac arası] koymuşlar [gari]!', [['sac arası', 'cevizli, şerbetli kat tatlısı'], ['gari', 'artık']], 'Sac arası, sacda pişen yufkaların arasına ceviz konup şerbetlenen bir Konya düğün tatlısıdır.', W.amca('Rıfat Amca', '#5e4a2b', '#c9a23a')),
	SV('dn-sv53', 3, 'icanadolu', [38], 'Bayrama [nevzine] yaptım gız, tahinli!', [['nevzine', 'tahinli, cevizli şerbetli tatlı'], ['gız', 'kız']], 'Nevzine, tahin, pekmez ve cevizle yapılıp şerbetlenen bir Kayseri tatlısıdır.', W.teyze('Hacer Teyze', '#b8402a', '#3a6ad8')),
	SV('dn-sv54', 2, 'icanadolu', [58, 66], 'Dağdan [madımak] topladık, bulgurlusunu yapıyom!', [['madımak', 'baharda toplanan yabani ot']], 'Madımak, baharda dağlardan toplanan bir yabani ottur; Sivas’ta soğan ve bulgurla kavrulup yenir.', W.nine('Durdu Nine', '#2a6a3a', '#d86a3a')),
	SV('dn-sv55', 1, 'dogu', [36, 75], 'Sofrada [kaz eti] var, yanında bulgur pilavı!', [['kaz eti', 'kışa hazırlanan kaz eti']], 'Kars ve Ardahan’da kazlar kesilip kışa hazırlanır; kaz eti bulgur pilavıyla sofraya gelir.', W.amca('Şenol Amca', '#3a3a4a', '#2a9ad8')),
	SV('dn-sv56', 2, 'dogu', [25], 'Tatlıya [kadayıf dolması], cevizi bol!', [['kadayıf dolması', 'cevizli, kızartılıp şerbetlenen kadayıf']], 'Kadayıf dolmasında cevizli kadayıf kızartılıp şerbetlenir; Erzurum mutfağının ünlü tatlısıdır.', W.usta('Cengiz Usta', '#8a5ad0')),
	SV('dn-sv57', 2, 'dogu', [25, 36, 75], 'Kahvaltıya [civil] getirdim, tel tel ayrılıyo!', [['civil', 'tel tel ayrılan peynir']], 'Civil peyniri lifli yapısıyla tel tel ayrılır; Erzurum, Kars ve Ardahan kahvaltısının peyniridir.', W.teyze('Sevda Teyze', '#a83a6a', '#3aa07a')),
	SV('dn-sv58', 1, 'guneydogu', [27], 'Sabah [katmer] yemeden çarşıya inilmez!', [['katmer', 'fıstıklı, kaymaklı ince hamur tatlısı']], 'Katmer, ince açılan hamura fıstık ve kaymak konup pişirilir; Gaziantep’in sabah kahvaltısıdır.', W.usta('Celal Usta', '#2a8a5a')),
	SV('dn-sv59', 2, 'guneydogu', [63], 'Cuma akşamı [sıra gecesi] var, sazını al gel!', [['sıra gecesi', 'çiğ köfteli, müzikli dost toplantısı']], 'Sıra gecesi, Şanlıurfa’da dostların sırayla birbirine konuk olduğu, çiğ köfte yoğrulup türkü söylenen toplantıdır.', W.amca('Mehmet Amca', '#3a2a1a', '#d88a2a')),
	SV('dn-sv60', 2, 'guneydogu', [21, 47], 'Bayramda [kaburga dolması] pişirdik, pirinçli!', [['kaburga dolması', 'iç pilavla doldurulan kuzu kaburgası']], 'Kaburga dolmasında kuzu kaburgası baharatlı pirinçle doldurulup pişirilir; Diyarbakır ve Mardin’in bayram yemeğidir.', W.teyze('Gülistan Teyze', '#3a5a8a', '#c24a3a')),
	SV('dn-sv61', 1, 'akdeniz', [46], 'Bi külah [dövme dondurma], bıçakla kes de ver!', [['dövme dondurma', 'salepli, keçi sütlü sakızlı dondurma']], 'Salep ve keçi sütüyle yapılan dövme dondurma uzun süre dövülür, bıçakla kesilir; Kahramanmaraş’ın simgesidir.', W.genc('Efe', '#120c08', '#2a9ad8')),
	SV('dn-sv62', 3, 'akdeniz', [1, 33], 'Gece yarısı bi [şırdan] yemeden yatılmaz!', [['şırdan', 'pirinçle doldurulan kuzu işkembesi']], 'Şırdan, kuzunun işkembesinden bir bölümün pirinçli içle doldurulup haşlanmasıdır; Adana ve Mersin’de geceleri yenir.', W.amca('Yılmaz Amca', '#8a6a2a', '#d8542a')),
	SV('dn-sv63', 2, 'akdeniz', [7], 'Bi tabak [hibeş], ekmeğe sür de ye!', [['hibeş', 'tahinli, limonlu, kimyonlu meze']], 'Hibeş; tahin, limon, sarımsak ve kimyonla yapılan bir mezedir, Antalya sofralarının vazgeçilmezidir.', W.abla('Ceren', '#3a2214', '#3a9a7a')),
];

export const SAMPLES = { kimim: [...KIMIM_SAMPLES, ...KIMIM_EK], sive: [...SIVE_SAMPLES, ...SIVE_EK] };
