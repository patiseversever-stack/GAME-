// Ek soru bankası 4 (eglence): 2026-11 üçüncü büyütme (20 bin hedefi). Biçim: DESIGN.md "Soru veri biçimleri";
// kimlikler <kat>-ek-<tip>-4NNN (halat ve Mancınık ek turları "-ek-" kimliklerinden kendiliğinden kurulur).
// Genel Kültür 4: Türk ve dünya mutfağı, gelenekler, bayramlar ve kutlamalar, takvimler ve zaman ölçüleri, paraların ve
// ölçülerin tarihi, bayraklar ve semboller, markaların hikâyesi, icatların gündelik hayattaki öyküsü, oyunlar ve
// oyuncaklar, "biliyor muydunuz" bilgileri, zekâ ve mantık soruları. (Dil, deyim, mitoloji, masal, bilmece yok.)
// Şıklarda ilk çeldirici en güçlüsüdür (Halat iki şıklı sorularda doğru şıkla ilk çeldiriciyi kullanır).
export default [
	// ---------------------------------------------------------------- test: Türk mutfağı
	{ id: "egl-ek-ch-4001", cat: "eglence", diff: 2, type: "choice", q: "Kırım Tatarlarından kalan çiğ börek, en çok hangi ilimizle özdeşleşmiştir?", a: ["Eskişehir", "Kayseri", "Trabzon", "Edirne"], tag: "yemek" },
	{ id: "egl-ek-ch-4002", cat: "eglence", diff: 3, type: "choice", q: "Tokat kebabında kuzu etinin yanındaki vazgeçilmez sebzeler hangileridir?", a: ["Patlıcan ve patates", "Kabak ve havuç", "Enginar ve bezelye", "Bamya ve fasulye"], tag: "yemek" },
	{ id: "egl-ek-ch-4003", cat: "eglence", diff: 3, type: "choice", q: "Beyti kebabı adını kimden alır?", a: ["Bir İstanbul lokantacısından", "Bir saray aşçısından", "Bir Osmanlı paşasından", "Bir Urfalı ozandan"], tag: "yemek" },
	{ id: "egl-ek-ch-4004", cat: "eglence", diff: 2, type: "choice", q: "Sucuk, salam ve turşuyla doldurulan ünlü tost hangi ilçemizin adını taşır?", a: ["Ayvalık", "Çeşme", "Bodrum", "Kuşadası"], tag: "yemek" },
	{ id: "egl-ek-ch-4006", cat: "eglence", diff: 2, type: "choice", q: "Orta Asya'nın geleneksel içeceği kımız hangi hayvanın sütünden yapılır?", a: ["Kısrak", "Deve", "Keçi", "Koyun"], tag: "yemek" },
	{ id: "egl-ek-ch-4007", cat: "eglence", diff: 1, type: "choice", q: "Yufkaları fırına girmeden önce kazanda haşlanan börek hangisidir?", a: ["Su böreği", "Kol böreği", "Sigara böreği", "Talaş böreği"], tag: "yemek" },
	{ id: "egl-ek-ch-4008", cat: "eglence", diff: 2, type: "choice", q: "Ramazan pidesinin üstüne susamla birlikte serpilen siyah tohum hangisidir?", a: ["Çörek otu", "Haşhaş", "Keten tohumu", "Kimyon"], tag: "yemek" },
	{ id: "egl-ek-ch-4009", cat: "eglence", diff: 3, type: "choice", q: "Osmanlı'da ramazanın 15. günü yeniçerilere tepsi tepsi dağıtılan tatlı hangisidir?", a: ["Baklava", "Güllaç", "Lokma", "Helva"], tag: "yemek" },
	// ---------------------------------------------------------------- test: Türk gelenekleri
	{ id: "egl-ek-ch-4010", cat: "eglence", diff: 1, type: "choice", q: "Geleneğe göre kız isteme töreninde damada ikram edilen kahveye ne katılır?", a: ["Tuz", "Tarçın", "Bal", "Limon"], tag: "kultur" },
	{ id: "egl-ek-ch-4011", cat: "eglence", diff: 1, type: "choice", q: "Ramazanda davulcular gece mahalle mahalle dolaşarak ne yapar?", a: ["Sahura kaldırır", "İftarı duyurur", "Bayramı müjdeler", "Teravihe çağırır"], tag: "kultur" },
	{ id: "egl-ek-ch-4012", cat: "eglence", diff: 2, type: "choice", q: "Osmanlı'da yardım edenle alanın birbirini görmemesi için kullanılan taşlara ne denirdi?", a: ["Sadaka taşı", "Binek taşı", "Göbek taşı", "Mihenk taşı"], tag: "kultur" },
	{ id: "egl-ek-ch-4013", cat: "eglence", diff: 3, type: "choice", q: "Ramazanda tanımadığı kişilerin bakkal borcunu gizlice ödeme geleneği hangi adla bilinir?", a: ["Zimem defteri", "Askıda ekmek", "Sadaka taşı", "Yardım sandığı"], tag: "kultur" },
	{ id: "egl-ek-ch-4014", cat: "eglence", diff: 1, type: "choice", q: "Düğünden önce kızın yakınlarıyla birlikte hamama gitmesine ne ad verilir?", a: ["Gelin hamamı", "Kına gecesi", "Kırk hamamı", "Bayram hamamı"], tag: "kultur" },
	{ id: "egl-ek-ch-4015", cat: "eglence", diff: 2, type: "choice", q: "Duvak açılınca geline verilen hediyeye ne ad verilir?", a: ["Yüz görümlüğü", "Başlık parası", "Çeyiz", "Ağırlık"], tag: "kultur" },
	{ id: "egl-ek-ch-4016", cat: "eglence", diff: 2, type: "choice", q: "Çocuklar daha bebekken ailelerin onları ileride evlendirmek üzere sözleşmesine ne denirdi?", a: ["Beşik kertmesi", "Söz kesme", "Kız isteme", "Başlık"], tag: "kultur" },
	{ id: "egl-ek-ch-4017", cat: "eglence", diff: 3, type: "choice", q: "Çocukların koyunun bilek kemikleriyle oynadığı eski oyuna ne ad verilir?", a: ["Aşık", "Misket", "Beş taş", "Çelik çomak"], tag: "oyun" },
	// ---------------------------------------------------------------- test: dünyadan gelenekler ve şenlikler
	{ id: "egl-ek-ch-4018", cat: "eglence", diff: 3, type: "choice", q: "Japonya'da dileklerin kâğıt şeritlere yazılıp bambu dallarına asıldığı şenlik hangisidir?", a: ["Tanabata", "Hanami", "Setsubun", "Obon"], tag: "kultur" },
	{ id: "egl-ek-ch-4019", cat: "eglence", diff: 3, type: "choice", q: "Japonya'da Çocuk Günü'nde evlerin önüne hangi hayvan biçimli flamalar asılır?", a: ["Sazan balığı", "Ejderha", "Turna", "Kaplan"], tag: "kultur" },
	{ id: "egl-ek-ch-4020", cat: "eglence", diff: 3, type: "choice", q: "İtalyan geleneğinde 6 Ocak gecesi çocuklara hediye getiren kimdir?", a: ["Süpürgeli yaşlı bir kadın", "Noel Baba'nın yardımcısı", "Üç kardeş peri", "Bir ren geyiği"], tag: "kultur" },
	{ id: "egl-ek-ch-4021", cat: "eglence", diff: 3, type: "choice", q: "Hollanda'da Sinterklaas, geleneğe göre her yıl hangi ülkeden gemiyle gelir?", a: ["İspanya", "Türkiye", "Finlandiya", "Norveç"], tag: "kultur" },
	{ id: "egl-ek-ch-4022", cat: "eglence", diff: 2, type: "choice", q: "İrlanda'nın ulusal günü St. Patrick's Day'in simgesi olan bitki hangisidir?", a: ["Yonca", "Devedikeni", "Lale", "Gül"], tag: "kultur" },
	{ id: "egl-ek-ch-4023", cat: "eglence", diff: 3, type: "choice", q: "Cadılar Bayramı'nda balkabağı oyulmadan önce İrlanda'da hangi sebze oyulurdu?", a: ["Şalgam", "Havuç", "Lahana", "Karnabahar"], tag: "kultur" },
	{ id: "egl-ek-ch-4024", cat: "eglence", diff: 1, type: "choice", q: "ABD'de Şükran Günü sofrasının geleneksel ana yemeği hangisidir?", a: ["Hindi", "Kaz", "Kuzu", "Ördek"], tag: "kultur" },
	{ id: "egl-ek-ch-4025", cat: "eglence", diff: 3, type: "choice", q: "Rusya'da kışı uğurlayan Maslenitsa haftasında en çok ne yenir?", a: ["Krep (blini)", "Pelmeni", "Borş", "Dondurma"], tag: "kultur" },
	{ id: "egl-ek-ch-4026", cat: "eglence", diff: 3, type: "choice", q: "İsveç'te 13 Aralık'taki Lucia gününde kızlar başlarına ne takar?", a: ["Mumlu taç", "Çiçekli taç", "Altın taç", "Boynuzlu şapka"], tag: "kultur" },
	{ id: "egl-ek-ch-4027", cat: "eglence", diff: 3, type: "choice", q: "Moğolistan'ın Naadam şenliğindeki üç geleneksel yarışma hangileridir?", a: ["Güreş, at yarışı, okçuluk", "Güreş, cirit, okçuluk", "At yarışı, koşu, güreş", "Okçuluk, kayak, koşu"], tag: "kultur" },
	{ id: "egl-ek-ch-4028", cat: "eglence", diff: 3, type: "choice", q: "Boğaların sokaklarda koşturulduğu San Fermín şenliği hangi İspanyol kentinde yapılır?", a: ["Pamplona", "Sevilla", "Valensiya", "Madrid"], tag: "kultur" },
	{ id: "egl-ek-ch-4029", cat: "eglence", diff: 2, type: "choice", q: "Hindistan'da kandiller yakılarak kutlanan 'ışıklar bayramı' hangisidir?", a: ["Diwali", "Holi", "Nevruz", "Songkran"], tag: "kultur" },
	{ id: "egl-ek-ch-4030", cat: "eglence", diff: 3, type: "choice", q: "Tayland'daki Loy Krathong şenliğinde suya ne bırakılır?", a: ["Mumlu çiçek sepetleri", "Kâğıt gemiler", "Renkli boyalar", "Pirinç taneleri"], tag: "kultur" },
	{ id: "egl-ek-ch-4031", cat: "eglence", diff: 3, type: "choice", q: "Çin Yeni Yılı kutlamaları hangi şenlikle sona erer?", a: ["Fener Şenliği", "Ay Şenliği", "Ejderha Teknesi Şenliği", "Hasat Şenliği"], tag: "kultur" },
	{ id: "egl-ek-ch-4032", cat: "eglence", diff: 2, type: "choice", q: "Çin'de sonbahar ortasında kutlanan şenlikte dağıtılan geleneksel çörek hangisidir?", a: ["Ay çöreği", "Şans kurabiyesi", "Pirinç keki", "Susamlı top"], tag: "yemek" },
	{ id: "egl-ek-ch-4033", cat: "eglence", diff: 1, type: "choice", q: "Doğum günlerinde gözü bağlı çocukların sopayla kırdığı, içi şeker dolu süsün adı nedir?", a: ["Piñata", "Matruşka", "Kumbara", "Fener"], tag: "kultur" },
	{ id: "egl-ek-ch-4034", cat: "eglence", diff: 3, type: "choice", q: "Fransa'da 1 Nisan şakası olarak insanların sırtına gizlice ne yapıştırılır?", a: ["Kâğıttan balık", "Kâğıttan kuş", "Kâğıttan kalp", "Yeşil yaprak"], tag: "kultur" },
	{ id: "egl-ek-ch-4035", cat: "eglence", diff: 2, type: "choice", q: "Japon çay seremonisinde çırpılarak hazırlanan toz yeşil çay hangisidir?", a: ["Matcha", "Oolong", "Earl Grey", "Rooibos"], tag: "yemek" },
	{ id: "egl-ek-ch-4036", cat: "eglence", diff: 3, type: "choice", q: "Güney Amerika'da mate çayı geleneksel olarak neyle içilir?", a: ["Metal bir pipetle", "Tahta kaşıkla", "İnce belli bardakla", "Porselen fincanla"], tag: "yemek" },
	{ id: "egl-ek-ch-4037", cat: "eglence", diff: 2, type: "choice", q: "Fas'ta misafire geleneksel olarak hangi içecek ikram edilir?", a: ["Naneli yeşil çay", "Türk kahvesi", "Sahlep", "Ayran"], tag: "yemek" },
	// ---------------------------------------------------------------- test: dünya mutfağı
	{ id: "egl-ek-ch-4038", cat: "eglence", diff: 2, type: "choice", q: "Kazak ve Kırgızların, adını elle yenmesinden alan et yemeği hangisidir?", a: ["Beşbarmak", "Plov", "Lagman", "Mantı"], tag: "yemek" },
	{ id: "egl-ek-ch-4039", cat: "eglence", diff: 2, type: "choice", q: "Patates kızartmasının peynir ve et sosuyla sunulduğu 'poutine' hangi ülkenin yemeğidir?", a: ["Kanada", "Belçika", "Fransa", "ABD"], tag: "yemek" },
	{ id: "egl-ek-ch-4040", cat: "eglence", diff: 3, type: "choice", q: "Kara fasulye ve etle pişen feijoada, hangi ülkenin ulusal yemeği sayılır?", a: ["Brezilya", "Meksika", "Arjantin", "Küba"], tag: "yemek" },
	{ id: "egl-ek-ch-4041", cat: "eglence", diff: 2, type: "choice", q: "Wiener Schnitzel adını hangi kentten alır?", a: ["Viyana", "Münih", "Berlin", "Bern"], tag: "yemek" },
	{ id: "egl-ek-ch-4042", cat: "eglence", diff: 3, type: "choice", q: "Japon soba eriştesi ağırlıkla hangi undan yapılır?", a: ["Karabuğday", "Pirinç", "Mısır", "Arpa"], tag: "yemek" },
	{ id: "egl-ek-ch-4043", cat: "eglence", diff: 2, type: "choice", q: "Kuzey Afrika mutfağının kuskusu geleneksel olarak neyden yapılır?", a: ["İrmik", "Pirinç", "Mısır unu", "Nohut"], tag: "yemek" },
	{ id: "egl-ek-ch-4044", cat: "eglence", diff: 2, type: "choice", q: "Fas mutfağındaki tajin yemeği adını neyden alır?", a: ["Pişirildiği toprak kaptan", "İçindeki baharattan", "Bir Berberi kentinden", "Bir sultanın adından"], tag: "yemek" },
	{ id: "egl-ek-ch-4045", cat: "eglence", diff: 2, type: "choice", q: "Hint mutfağındaki naan ekmeği geleneksel olarak nerede pişirilir?", a: ["Tandırda", "Sacda", "Tavada", "Buharda"], tag: "yemek" },
	{ id: "egl-ek-ch-4046", cat: "eglence", diff: 2, type: "choice", q: "Lübnan mutfağının tabule salatasında en çok kullanılan yeşillik hangisidir?", a: ["Maydanoz", "Nane", "Roka", "Marul"], tag: "yemek" },
	{ id: "egl-ek-ch-4047", cat: "eglence", diff: 2, type: "choice", q: "Pho adlı erişteli et suyu çorbası hangi ülkenin mutfağının simgesidir?", a: ["Vietnam", "Tayland", "Japonya", "Kore"], tag: "yemek" },
	{ id: "egl-ek-ch-4048", cat: "eglence", diff: 3, type: "choice", q: "Çiğ balıkla yapılan ceviche, hangi ülkede ulusal miras ilan edilmiştir?", a: ["Peru", "Arjantin", "Brezilya", "Küba"], tag: "yemek" },
	{ id: "egl-ek-ch-4049", cat: "eglence", diff: 3, type: "choice", q: "Pierogi adlı hamur mantısı hangi ülkenin mutfağıyla özdeşleşmiştir?", a: ["Polonya", "İtalya", "Yunanistan", "Portekiz"], tag: "yemek" },
	{ id: "egl-ek-ch-4050", cat: "eglence", diff: 2, type: "choice", q: "UNESCO listesine giren 'pizzaiuolo' (pizzacılık) sanatı hangi kentle anılır?", a: ["Napoli", "Roma", "Milano", "Venedik"], tag: "yemek" },
	{ id: "egl-ek-ch-4051", cat: "eglence", diff: 2, type: "choice", q: "2022'de yapım geleneği UNESCO listesine giren Fransız fırın ürünü hangisidir?", a: ["Baget", "Kruvasan", "Brioş", "Makaron"], tag: "yemek" },
	{ id: "egl-ek-ch-4052", cat: "eglence", diff: 3, type: "choice", q: "Margarin, hangi Fransız hükümdarının açtığı yarışma için icat edildi?", a: ["III. Napolyon", "I. Napolyon", "XIV. Louis", "XVI. Louis"], tag: "icat" },
	{ id: "egl-ek-ch-4053", cat: "eglence", diff: 3, type: "choice", q: "Damla çikolatalı kurabiye ilk kez 1938'de nerede yapıldı?", a: ["Bir yol hanının mutfağında", "Bir çikolata fabrikasında", "Bir okul kantininde", "Bir askerî kışlada"], tag: "icat" },
];
