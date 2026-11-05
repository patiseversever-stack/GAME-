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

// v1.1 ek sorular (v1.2'de 20 il daha, aşağıda). Kimim: 25 il daha; on beş tarzın her biri toplamda 2–3 kez, art arda aynı tarz yok. İpuçları zordan
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
// v1.7: eski ek sözler (katmer, pişmaniye, kaz eti…) yalnız yemek adıydı, ağız işareti yoktu; Şive havuzu artık yalnız
// kaynaklı ağız sözleri (d_sive.js SIVE_SAMPLES). Yöresel lezzetler genel kültür sorularında duruyor.
const SIVE_EK = [];

export const SAMPLES = { kimim: [...KIMIM_SAMPLES, ...KIMIM_EK], sive: [...SIVE_SAMPLES, ...SIVE_EK] };
