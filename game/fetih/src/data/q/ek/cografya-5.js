// Ek soru bankası 5 (cografya): 20 bin adımı, ikinci klasik tur (kimlik cog-ek-<tip>-6NNN): bkz. scratchpad ortak_brif_v2.md
// Konu: yalnız Türkiye coğrafyasının alt katmanı: ulaşım yapıları (köprü, tünel, demiryolu, havalimanı), coğrafi terimler ve
// Türkiye'deki örnekleri, doğal afetler ve jeoloji, yer adları, yaylalar, geçitler, burunlar, korunan alanlar, iklimin gündelik
// hayata etkisi, ilçe ve kasabalar. Dünya coğrafyası cografya-6'dadır.
export default [
	// ---------------------------------------------------------------- choice: havalimanları, köprüler, tüneller, geçitler
	{ id: "cog-ek-ch-6001", cat: "cografya", diff: 2, type: "choice", q: "Sabiha Gökçen Havalimanı İstanbul'un hangi ilçesindedir?", a: ["Pendik", "Kartal", "Tuzla", "Ümraniye"] },
	{ id: "cog-ek-ch-6002", cat: "cografya", diff: 2, type: "choice", q: "Atatürk Havalimanı bu adı almadan önce hangi adla anılıyordu?", a: ["Yeşilköy Havalimanı", "Florya Havalimanı", "Kurtköy Havalimanı", "Bakırköy Havalimanı"] },
	{ id: "cog-ek-ch-6003", cat: "cografya", diff: 2, type: "choice", q: "Türkiye'de denizi doldurarak yapılan ilk havalimanı hangisidir?", a: ["Ordu-Giresun", "Rize-Artvin", "Trabzon", "Sinop"] },
	{ id: "cog-ek-ch-6004", cat: "cografya", diff: 2, type: "choice", q: "Adana ve Mersin'e hizmet veren Çukurova Uluslararası Havalimanı hangi ilçededir?", a: ["Tarsus", "Ceyhan", "Erdemli", "Yüreğir"] },
	{ id: "cog-ek-ch-6005", cat: "cografya", diff: 3, type: "choice", q: "Kütahya, Afyonkarahisar ve Uşak'a ortak hizmet veren havalimanının adı nedir?", a: ["Zafer", "Dumlupınar", "Başkomutan", "Frig"] },
	{ id: "cog-ek-ch-6006", cat: "cografya", diff: 2, type: "choice", q: "İzmir Adnan Menderes Havalimanı hangi ilçededir?", a: ["Gaziemir", "Çiğli", "Menemen", "Torbalı"] },
	{ id: "cog-ek-ch-6007", cat: "cografya", diff: 2, type: "choice", q: "Deniz üzerine kurulan Rize-Artvin Havalimanı hangi ilin sınırları içindedir?", a: ["Rize", "Artvin", "Trabzon", "Giresun"], tag: "il" },
	{ id: "cog-ek-ch-6008", cat: "cografya", diff: 2, type: "choice", q: "Edirne'nin Uzunköprü ilçesine adını veren köprü hangi akarsuyun üzerindedir?", a: ["Ergene", "Meriç", "Tunca", "Arda"] },
	{ id: "cog-ek-ch-6009", cat: "cografya", diff: 2, type: "choice", q: "Marmaray, Boğaz'ın altından hangi iki istasyon arasında geçer?", a: ["Sirkeci ile Üsküdar", "Kabataş ile Harem", "Beşiktaş ile Üsküdar", "Yenikapı ile Kadıköy"] },
	{ id: "cog-ek-ch-6010", cat: "cografya", diff: 3, type: "choice", q: "Karaman'ı Mut üzerinden Akdeniz kıyısına bağlayan Toros geçidi hangisidir?", a: ["Sertavul Geçidi", "Gülek Boğazı", "Belen Geçidi", "Çubuk Beli"] },
	{ id: "cog-ek-ch-6011", cat: "cografya", diff: 2, type: "choice", q: "Bayburt ile Erzurum arasındaki, I. Dünya Savaşı'ndaki savunmasıyla bilinen geçit hangisidir?", a: ["Kop Geçidi", "Zigana Geçidi", "Sahara Geçidi", "Gülek Boğazı"] },
	{ id: "cog-ek-ch-6012", cat: "cografya", diff: 3, type: "choice", q: "Antalya'dan Burdur'a giden karayolu Toroslar'ı hangi geçitten aşar?", a: ["Çubuk Beli", "Sertavul Geçidi", "Gülek Boğazı", "Kop Geçidi"] },
	// ---------------------------------------------------------------- choice: toprak, kıyı, rüzgâr
	{ id: "cog-ek-ch-6013", cat: "cografya", diff: 2, type: "choice", q: "Akdeniz kıyılarında kireçtaşı üzerinde oluşan kırmızı toprağın adı nedir?", a: ["Terra rossa", "Çernozyom", "Podzol", "Tundra toprağı"] },
	{ id: "cog-ek-ch-6014", cat: "cografya", diff: 3, type: "choice", q: "Yamaçtan yer çekimiyle inen malzemenin dağ eteğinde biriktirdiği toprağa ne denir?", a: ["Kolüvyal toprak", "Alüvyal toprak", "Lös", "Terra rossa"] },
	{ id: "cog-ek-ch-6015", cat: "cografya", diff: 3, type: "choice", q: "Bir koyun ağzını kapatıp onu lagüne çeviren kum setine ne denir?", a: ["Kıyı kordonu", "Tombolo", "Delta", "Falez"] },
	{ id: "cog-ek-ch-6016", cat: "cografya", diff: 3, type: "choice", q: "Güneydoğu Anadolu'ya güneydeki çöllerden esen kuru ve sıcak rüzgâr hangisidir?", a: ["Samyeli", "Poyraz", "Karayel", "Etezyen"] },
	{ id: "cog-ek-ch-6017", cat: "cografya", diff: 3, type: "choice", q: "Dağdan inerken ısınıp kuruyan, Doğu Karadeniz'de kışın havayı birden ılıtan rüzgâr hangisidir?", a: ["Fön", "Poyraz", "Yıldız", "Karayel"] },
	{ id: "cog-ek-ch-6018", cat: "cografya", diff: 3, type: "choice", q: "Yazın Ege Denizi'nde kuzeyden düzenli esen serin rüzgârlara ne denir?", a: ["Etezyen", "Lodos", "Kıble", "Samyeli"] },
	// ---------------------------------------------------------------- choice: iklim ve gündelik hayat
	{ id: "cog-ek-ch-6019", cat: "cografya", diff: 2, type: "choice", q: "Karadeniz'de ürünü nemden ve fareden korumak için direkler üstüne kurulan ahşap ambara ne denir?", a: ["Serender", "Tandır", "Kümbet", "Sundurma"] },
	{ id: "cog-ek-ch-6020", cat: "cografya", diff: 2, type: "choice", q: "Ağacı az Doğu Anadolu köylerinde hayvan gübresinden yapılan yakacağa ne denir?", a: ["Tezek", "Kerpiç", "Turba", "Linyit"] },
	{ id: "cog-ek-ch-6021", cat: "cografya", diff: 2, type: "choice", q: "Güneydoğu Anadolu'da evlerin damının düz yapılması iklimin hangi özelliğiyle ilgilidir?", a: ["Yağışın az olması", "Rüzgârın sert esmesi", "Nemin çok yüksek olması", "Sisli günlerin çokluğu"] },
	// ---------------------------------------------------------------- choice: depremler
	{ id: "cog-ek-ch-6022", cat: "cografya", diff: 2, type: "choice", q: "6 Şubat 2023'teki ilk büyük depremin merkez üssü hangi ilçedir?", a: ["Pazarcık", "Göksun", "Türkoğlu", "Afşin"] },
	{ id: "cog-ek-ch-6023", cat: "cografya", diff: 2, type: "choice", q: "30 Ekim 2020 İzmir depreminde en çok binanın yıkıldığı ilçe hangisidir?", a: ["Bayraklı", "Seferihisar", "Karşıyaka", "Buca"] },
	{ id: "cog-ek-ch-6024", cat: "cografya", diff: 2, type: "choice", q: "17 Ağustos 1999 depreminden üç ay sonra, 12 Kasım'da hangi ilimiz büyük bir depremle sarsıldı?", a: ["Düzce", "Bolu", "Sakarya", "Yalova"], tag: "il" },
	{ id: "cog-ek-ch-6025", cat: "cografya", diff: 3, type: "choice", q: "Kuzey Anadolu Fayı ile Doğu Anadolu Fayı hangi ilçede birleşir?", a: ["Karlıova", "Varto", "Tercan", "Hınıs"] },
	// ---------------------------------------------------------------- choice: yer adları
	{ id: "cog-ek-ch-6026", cat: "cografya", diff: 2, type: "choice", q: "Alanya adı hangi Selçuklu sultanının adından gelir?", a: ["I. Alaeddin Keykubad", "II. Kılıçarslan", "I. Keyhüsrev", "Süleyman Şah"] },
	{ id: "cog-ek-ch-6027", cat: "cografya", diff: 2, type: "choice", q: "Fethiye, adını 1914'te şehit düşen hangi meslekten bir Osmanlı subayından alır?", a: ["Pilot", "Topçu", "Denizaltıcı", "Süvari"] },
	{ id: "cog-ek-ch-6028", cat: "cografya", diff: 3, type: "choice", q: "İzmir'in Selçuk ilçesinin eski adı nedir?", a: ["Ayasuluk", "Scala Nova", "Nif", "Kordelya"] },
	// ---------------------------------------------------------------- tf
	{ id: "cog-ek-tf-6001", cat: "cografya", diff: 2, type: "tf", q: "Yavuz Sultan Selim Köprüsü'nde karayolunun yanında demiryoluna da yer ayrılmıştır.", ans: true },
	{ id: "cog-ek-tf-6002", cat: "cografya", diff: 2, type: "tf", q: "Edirne'deki tarihî Uzunköprü'yü Kanuni Sultan Süleyman yaptırmıştır.", ans: false },
	{ id: "cog-ek-tf-6003", cat: "cografya", diff: 1, type: "tf", q: "Kuzey Anadolu Fayı, Marmara Denizi'nin altından geçer.", ans: true },
	{ id: "cog-ek-tf-6004", cat: "cografya", diff: 3, type: "tf", q: "Lös, rüzgârın taşıdığı ince tozların birikmesiyle oluşan bir topraktır.", ans: true },
	{ id: "cog-ek-tf-6005", cat: "cografya", diff: 3, type: "tf", q: "Kara renkli çernozyom toprakları Türkiye'de en çok Doğu Karadeniz kıyılarında görülür.", ans: false },
	{ id: "cog-ek-tf-6006", cat: "cografya", diff: 2, type: "tf", q: "Marmaray, Boğaz'ı deniz tabanına batırılmış tüplerin içinden geçer.", ans: true },
	{ id: "cog-ek-tf-6007", cat: "cografya", diff: 2, type: "tf", q: "İç Anadolu'da kar örtüsü, Doğu Anadolu'dakinden daha uzun süre yerde kalır.", ans: false },
	{ id: "cog-ek-tf-6008", cat: "cografya", diff: 3, type: "tf", q: "Haliç'e dökülen başlıca iki dere Alibey ve Kâğıthane dereleridir.", ans: true },
	{ id: "cog-ek-tf-6009", cat: "cografya", diff: 2, type: "tf", q: "2011 Van depremi yaz aylarında meydana geldi.", ans: false },
	{ id: "cog-ek-tf-6010", cat: "cografya", diff: 2, type: "tf", q: "Çığ olayları Türkiye'de en sık Doğu Anadolu'nun dağlık kesimlerinde görülür.", ans: true },
	{ id: "cog-ek-tf-6011", cat: "cografya", diff: 1, type: "tf", q: "6 Şubat 2023'te Kahramanmaraş merkezli iki büyük deprem aynı gün içinde yaşandı.", ans: true },
	{ id: "cog-ek-tf-6012", cat: "cografya", diff: 2, type: "tf", q: "İzmit Körfezi'ni geçen Osmangazi Köprüsü bir asma köprüdür.", ans: true },
	{ id: "cog-ek-tf-6013", cat: "cografya", diff: 2, type: "tf", q: "Galata Köprüsü'nün üzerinden tramvay hattı geçer.", ans: true },
	{ id: "cog-ek-tf-6014", cat: "cografya", diff: 1, type: "tf", q: "İstanbul Havalimanı, İstanbul'un Avrupa yakasındadır.", ans: true },
	{ id: "cog-ek-tf-6015", cat: "cografya", diff: 3, type: "tf", q: "Kuzey Anadolu Fayı, iki yanındaki blokların yatay olarak kaydığı bir faydır.", ans: true },
];
