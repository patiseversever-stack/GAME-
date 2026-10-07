# ISTAKA — Yapım Brifi (Claude Code otonom oyun stüdyosu görevi)

> Oyun 3/3 · Tür: fotogerçekçi bilardo (8-Top, Üç Bant, Hızlı Bilardo, Günün Vuruşu) · Bağımsız mod: **MİNİ GOLF DİORAMA** (tilt-shift minyatür dünya) · Öncelikli yön: dikey (yatay tam destek)
> Klasör: `games/istaka/` · Hedef cihazlar: Xiaomi Mi 9T, iPhone 11, iPhone 13, Xiaomi 13 · Teknoloji: three.js r186 + WebGL2 + TypeScript + Vite
> **Bu dosyanın tamamı tek bir görevdir.** Baştan sona oku; sonra §0'daki protokole göre başla ve §11 Bitti Tanımı tamamen yeşil olana kadar durma.

**Belge içi tutarlılık kuralı:** Bu brif bölümler hâlinde paralel yazıldı. İki bölüm aynı sayı ya da kural hakkında çelişirse şu sırayla karar ver:
- Oyun kuralı ve denge değerinde §2 (GDD) esastır.
- Algoritma ve teknik uygulamada §4.G esastır.
- Ortak sözleşmelerde (§0, §5, §7, §9, §11) ortak çekirdek metni esastır.

Her çelişkiyi F1 fazında `docs/KARARLAR.md` dosyasına yaz ve tek bir değere bağla. Değeri veri dosyasında tut. Bilinen kararlar:
- **Masa ölçüleri:** 8-Top 9 ft masada oynanır (oyun alanı 2,54×1,27 m). Hızlı Bilardo 7 ft masada oynanır (1,981×0,991 m). Üç Bant cepsiz carom masasında oynanır (2,84×1,42 m). Görsel mesh ile fizik geometrisi arasındaki fark ≤ 0,5 mm olmalı. Bunlar `TableSpec` verisinde tutulur.


---

## 0. Önce bunu oku: çalışma protokolü

**Rolün:** Bu belge bir oyun stüdyosu brifi. Sen bu projenin **Yapımcısı ve Teknik Direktörü'sün (ana ajan)**. Oyunu sıfırdan, mağazaya çıkacak kalitede bitireceksin.

**Kullanıcı uyuyor.** Soru sorma, onay bekleme. Belirsiz bir noktada en iyi kararı ver, gerekçesini `games/istaka/docs/KARARLAR.md` dosyasına yaz ve devam et.

**Çoklu ajan çalışması:** Çoklu ajan orkestrasyonu kullanmanı açıkça istiyorum (ultracode).
- Workflow aracıyla iş akışları kur. Alt ajanlara §8'deki rolleri ver.
- Bağımsız işleri paralel çalıştır.
- Her önemli çıktıyı, onu üretmemiş bağımsız bir ajana çapraz denetlet.
- Workflow aracı yoksa aynı yapıyı Agent aracıyla kur.
- Container'da `nproc` düşükse (ör. 4 çekirdek) iş akışı aynı anda yalnızca ~2 ajan koşturur. O zaman ajan sayısını değil iş paketlerinin büyüklüğünü artır. Arka plan Agent çağrılarını da kullan.

**Süre:**
- 4–5 saatlik kesintisiz, yoğun bir üretim planla.
- §11 Bitti Tanımı'ndaki her madde kanıtla yeşil olmadan "bitti" deme. Kanıt: komut çıktısı, ekran görüntüsü, ölçüm.
- Erken biterse kalan süreyi §10'daki cila listesine harca.

**Kolaya kaçmak yasak.** Şunların hiçbiri teslim edilemez:
- Gri kutu veya placeholder asset.
- "Yakında" yazan mod, çalışmayan buton.
- TODO veya FIXME ile bırakılmış kod.
- Tek bölümü parlatıp gerisini yarım bırakmak.

Bunlar da yasak:
- Testi atlamak, devre dışı bırakmak ya da eşiği gevşetmek. Bütçe tutmuyorsa içeriği ve teknolojiyi optimize et.
- Sahte kanıt. Her "çalışıyor" iddiasının arkasında bir çıktı olacak.
- Lisansı belirsiz asset.

**Sorunları kendin çöz:**
- Bir araç kurulmuyorsa alternatifini bul.
- Bir yaklaşım bütçeyi tutturmuyorsa tasarımı değiştir.
- Kırmızı testin kök nedenini bul.
- "Cihazda test edilmeli" diyerek geçiştirme. Ölçülebilen her şeyi ölç. Ölçülemeyenleri §9'daki cihaz kontrol listesine yaz.

**Git:**
- Sana verilen dalda çalış.
- Her kilometre taşında anlamlı bir commit at ve **push et**. Container geçicidir; push edilmeyen iş kaybolur.
- Büyük ikili ara dosyaları (kaynak .blend, ham indirmeler) commit'leme. `.gitignore` ile dışarıda tut.
- Teslim edilen asset'ler (sıkıştırılmış GLB/KTX2/ses) ve `dist/` çıktısı commit'lenir.
- PR açma.

**Kapsam:**
- Yalnızca `games/istaka/` altında çalış. Gerekirse kök `.gitignore`'a satır ekleyebilirsin.
- Depodaki diğer projelere dokunma: `aksoy-site/`, `remotion/`, `game/`, kök `package.json`.
- `game/Gece_Postasi_Yatay_Hafif.html` yalnızca bir kalite tabanı referansı. Onun stilini kopyalama; bu oyun ondan tamamen farklı ve daha iddialı olacak.

**Dil:**
- Oyun içi metinler Türkçe (varsayılan) ve İngilizce.
- Belgeler Türkçe.
- Kod ve kod yorumları İngilizce olabilir.

**Ortak protokol:** Bu brif, aynı mobil uygulamaya girecek 3 oyundan biri. §5 performans motoru, §7 köprü protokolü ve ayarlar ekranının yapısı üç oyunda **birebir aynı**. Kullanıcı uygulamasına tek bir adaptör yazacak. Bu sözleşmeleri değiştirme, yalnızca genişlet.

---

## 1. Vizyon ve kalite çıtası

**Kanca:** "Gerçeğinden ayırt edilemeyen bir masa, Türkiye'nin üç bant efsanelerine yakışır vuruşlar."

**Oyuncu fantezisi:** Salonun en iyisi olmak. Kadıköy'de sisli ışıklı bir salonda başlayıp Şampiyonluk Arenası'nda binlerce siluetin nefesini tuttuğu sessizlikte siyahı cebe göndermek. Oyuncu kendini "masayı okuyan kişi" gibi hissetmeli: her vuruştan önce plan, her vuruştan sonra sinema.

**Tasarım tezi — "sakin simülatör DEĞİL":** ISTAKA fizikte simülasyon, sunumda spor yayını + aksiyon filmidir. Her atış üç perdelik bir mini sahnedir: (1) **Hazırlık** — gerilim (nişan, kalabalık mırıltısı, gerekirse kalp atışı), (2) **Vuruş** — anlık geri bildirim (tık, haptik, kamera), (3) **Sonuç** — Yönetmen'in kurguladığı ödül (cep kamerası, "Kıl payı" slow-mo, alkış). Ölü zaman yasak: AI düşünme süresi ≤1,2 s; toplar 0,15 m/s altına düşünce sunum otomatik 2× hızlanır; menüden masaya ≤3 dokunuş.

**Neden viral:**
- **Günün Vuruşu:** herkes aynı bulmacayı çözer; paylaşım kartı `ISTAKA #312 🎱 2 vuruş ⭐⭐⭐ — Sen yapabilir misin?`
- **Otomatik ≤8 s highlight klipleri** (kıl payı, 5 bantlı sayı, tek seride masa bitirme): deterministik replay sayesinde sinematik açılarla sonradan render edilir.
- **Meydan okuma kodları:** arkadaşına aynı dizilimi/aynı Hızlı Bilardo tohumunu gönder.
- **Mini Golf Diorama:** 2–4 kişilik aile içi sıra-sende oyunu; tilt-shift ekran görüntüleri "bu gerçek maket mi?" dedirtir.
- **Üç Bant:** Türkiye'nin gururu; Akademi'deki klasik vuruşlar sohbet ve meydan okuma malzemesi.

**Neden 2. gün / 14. gün tutar:**
- **2. gün:** yarım kalan salonun yıldız kapısı, yeni Günün Vuruşu, dünkü Hızlı Bilardo rekoru, Istaka Koleksiyonu'nda 1–2 adım kalan ıstaka.
- **14. gün:** Şampiyonluk Arenası finali (ortalama oyuncu 8–12. günde ulaşır), Üç Bant Üstatlar merdiveni (beceri tavanı çok yüksek), Akademi'nin 30 drili, Usta Ligi (Kariyer'in kısa kılavuzlu ikinci turu), Mini Golf Ayna parkurları, haftalık sabit tohumlu Hızlı Bilardo tahtası, Vuruş Arşivi'nde biriken "kendi efsanen".

**"Ağız açık" anları (her biri ilk 3 oturumda yaşanmalı):**
1. **Açılış slow-mo'su:** Beyaz top 0,25× hızda üçgene girer; 15 topun her birinde lamba yansıması kayar; cep kamerasında çizgili top ağızda iki kez çarpıp düşer.
2. **"Kıl payı!":** Top cep ağzında titreşir; dünya 0,25×'e iner, kalabalık "Ooo" der, ortam sesi alçak geçiren filtreyle boğulur; düşerse alkış patlar, düşmezse acı bir "ahh".
3. **Üç Bant ışık izi:** Sayıda beyaz topun yolu masaya ışıktan bir çizgiyle yeniden çizilir; her bant teması "1-2-3" rakamlarıyla patlar, ahşap blok sesleri yükselen perdeyle sayar.
4. **Boğaz Yalısı:** Nişan alırken pencerenin dışından ışıklı bir vapur geçer; ışıkları 16 topun üstünde kayar, tavanda deniz yansıması dalgalanır.
5. **Sessizlik anı (Arena):** Maç topunda salon ışıkları %15'e iner, tek spot, kalp atışı; vuruştan sonra 40 flaş patlaması, kalabalık kükremesi, ağır çekimde düşen siyah top.
6. **Ateş (Hızlı Bilardo):** 5'li seride kumaş alttan kızıl ışıkla nabız atar, topların ardında köz izleri, müzik iki katı tempoya çıkar, sayaç altına döner.
7. **Mase (Günün Vuruşu):** Beyaz top engel topun etrafından kavis çizerek dolanır; kamera yandan profil takip eder.
8. **Mini Golf vapuru:** Top, reçine denizde sallanan oyuncak vapurun güvertesine iner ve karşı iskeleye taşınır; tilt-shift ile her şey avuç içi kadar.
9. **Zafer para planı:** Kazandıran top düşerken kamera 120° döner, lamba hafifçe sallanır, rakip kartı "saygı" animasyonuyla eğilir.

**İlk izlenim filmi (ilk 30 saniye, metinsiz):**

| Saniye | Görüntü | Ses / Haptik |
|---|---|---|
| 0,0–1,5 | Siyah ekran. | Tebeşir gıcırtısı, uzak salon mırıltısı. |
| 1,5–3,0 | Masanın üstündeki kanopi lamba "tık" diye yanar; ışık konisinde toz zerreleri süzülür. | Akkor lamba "tın"ı; 12 ms hafif haptik. |
| 3,0–6,5 | Kamera kumaş hizasında (4 cm) bant boyunca kayar: kumaş lifleri, sedef elmaslar, uzakta dizili üçgen. | Oda tonu, alçak çello pedalı. |
| 6,5–8,5 | Bant ucundaki pirinç plakada "ISTAKA" yazısı ışıkla parlar (logo reveal). | Metalik "çiiing". |
| 8,5–11,0 | Istaka ucu kadraja girer, tebeşir tozu; vuruş; 0,25× slow-mo ile beyaz üçgene çarpar. | Deri uç "tok", sonra zamanı bükülmüş kristal şakırtı. |
| 11,0–14,0 | Cep kamerası: çizgili 11 ağızda iki kez çarpar, düşer. "Kıl payı!" yazısı pirinç harflerle. | Kalabalık "Ooo" → alkış; 18 ms + 40 ms ara + 10 ms haptik. |
| 14,0–17,0 | Kamera yükselir, masa portre yönde üst görünüme döner; arayüz yumuşakça belirir; parlayan el ikonu "sürükle, geri çek" hareketini gösterir. | Müzik ritmi girer. |
| 17,0–30,0 | Oyuncunun ilk vuruşu: düz, uzun kılavuzlu bir top. Bıraktığında Yönetmen bant hizasından topu cebe kadar izler, 0,5× düşüş, alkış, pirinç sayaçta "+50 XP". Doğrudan ikinci vuruşa bağlanır (bkz. 2.9 FTUE). | Sıcak alkış, haptik çift tık. |

**Test edilebilir kalite çıtası:**
- Persona panelinde (Ortak §9) 10 değerlendiriciden ≥8'i rastgele bir Yüksek tier ekran görüntüsünü "konsol/PC kalitesinde native oyun" olarak etiketlemeli; Düşük tier'da ≥6.
- Her tier'da her topta lamba spekülar vurgusu ve ortam yansıması görünür; hiçbir top "düz plastik" görünmez (contact sheet kontrolü).
- Yuvarlanan topun numarası fiziksel olarak doğru döner (kayma yokken ω·R = v; kayarken numaranın dönüşü hızdan ayrışır ve bu görülebilir).
- Top-top sesi olay karesinden ≤1 kare sonra çalar; şiddeti çarpma hızıyla orantılı, ≥6 örnek varyasyonu, ardışık iki atışta aynı örnek tekrar etmez.
- Nişan girdisinden görüntüye gecikme ≤1 kare; ince ayar 0,01° çözünürlüklü ve kılavuzda görünür.
- Kılavuz çizgileri ve top siluetleri 1080p'de basamaklanmasız (AA'lı çizgi geometrisi).
- AI hamle süresi ≤1,2 s; menü → masa ≤3 dokunuş ve ≤4 s.

**Kaçınılacaklar:**
- Sakin, sessiz, "ders kitabı" simülatör hissi; uzun bekleme; tek açılı statik kamera.
- Para/jeton bahsi ("masaya 500 coin koy" sistemleri) — kesinlikle YOK.
- Gerçekçi 3D insan modelleri (tekinsiz vadi), sigara, alkol, gerçek marka/oyuncu/salon adları.
- Çizgi film toplar, düz 2D masa, varsayılan three.js görünümü, tırtıklı kılavuz çizgileri.
- Kazanmayı satın alma: ıstakalar yalnızca kozmetiktir, istatistik vermez.

---

## 2. Oyun tasarımı (GDD)

### 2.1 Çekirdek döngü
- **Atış döngüsü (8–20 s):** Masayı oku → kaba + ince nişan → falso seç → gücü geri çek → bırak → Yönetmen sahnesi (1–4 s, atlanabilir) → sonuç/ödül → sıradaki atış.
- **Oturum döngüsü:** Yaşayan salon (ana menü) → mod → maç/bulmaca → sonuç ekranı (yıldız, XP, rozet, highlight klibi, paylaş) → tek dokunuşla "Bir tane daha".
- **Oturum uzunlukları:** Hızlı Bilardo 90 s (+15 s sonuç); Günün Vuruşu 1–5 dk; 8-Top tek frame 4–7 dk; Üç Bant maçı 6–12 dk; Mini Golf 9 delik 6–10 dk. Her maç vuruşlar arasında otomatik kaydedilir (komut akışı); uygulama kapanırsa aynı vuruştan devam edilir.
- **Meta döngü:** Yıldız → salon kilidi; XP → Oyuncu Seviyesi → ıstaka/kumaş; rozetler → ustalık kimliği; Vuruş Arşivi → paylaşım.

### 2.2 Kontroller
Portre öncelikli: masanın uzun ekseni dikey, üst görünüm; 3D ıstaka kamerasına tek dokunuşla geçilir. Yatay mod tam desteklenir (masa yatay, kontroller iki kenarda).

| Girdi | Tanım | Değerler |
|---|---|---|
| Kaba nişan | Masada (beyaz top dışında) tek parmak sürükleme; nişan açısı, parmağın beyaz top merkezine göre açısal değişimini izler (atan2 farkı). | Ölü bölge 6 dp; açısal hız ≤40°/s iken 1:1, üstünde 1:1,6 (hızlı savurma). Parmak beyaz topa 40 dp'den yakınsa çarpan 0,35. |
| İnce nişan tekeri | Sağ kenarda (sol el modunda sol) dikey tırtıklı teker; dikey sürükleme. | 1 dp = 0,02°; atalet sürtünmesi 0,85/kare; ölü bölge 3 dp; uzun basıp sürükleme = 0,005°/dp mikro mod. Her 0,1°'de 4 ms tık haptiği. |
| Falso | Köşedeki beyaz top ikonuna dokun → büyük top paneli; kırmızı noktayı sürükle. | Ofset ≤0,5R (UI sınırı); 0,45R üstü "ıska riski" kırmızı halka; çift dokunuş = merkez. Terimler: üst falso, alt falso, sağ/sol falso. |
| Güç (geri çekme) | Nişandan sonra ıstakanın arka ucunu (veya alt %30 bölgede herhangi bir yeri) geriye çek; bırak = vur. | Çekme 0–180 dp → güç %0–100; eğri p = (d/180)^1,4 (yumuşak vuruşlarda hassasiyet); %3 altında bırakmak = iptal. Istaka görsel olarak geri çekilir. |
| Güç (çubuk) | Yan kenarda dikey güç çubuğu; aşağı çek, bırak. | Aynı eğri. Erişilebilirlik "iki dokunuş": 1. dokunuş gücü sabitler, 2. dokunuş vurur. |
| Kamera | Çift dokunuş veya buton: 3D ıstaka kamerası ↔ üst görünüm. İki parmak = orbit/zoom (nişan sırasında kilitli). | Geçiş 450 ms. |
| Elde top | Beyaz topu sürükle; geçersiz konum kırmızı gölge gösterir. | Parmağın 60 dp üstünde gösterilir (parmak kapatmasın). |
| Cep işaretleme | 8 için cebe dokun. | Kılavuzun gösterdiği cep önceden seçili gelir. |

- **Sol el modu:** İnce teker ile güç çubuğu yer değiştirir; falso ikonu karşı köşeye geçer.
- **Erişilebilirlik:** Numaralar her zaman okunur + düz/çizgili desen (renk körü güvenli); yüksek kontrast kılavuz; "Hareketi azalt" (Yönetmen yalnız sabit kesmeler, orbit yok); haptik aç/kapa; yazı boyutu %100/120/140; iki dokunuş vuruş modu.
- **Kılavuz uzunluğu:** **Kolay:** hayalet top + hedef topun yolu cebe/banda kadar + beyazın sapma yolu 30 cm. **Normal:** hayalet top + hedef yolu 25 cm + beyaz sapma 10 cm. **Usta:** yalnız hayalet top. Üç Bant'ta beyazın ilk bant temasına kadar çizgi + "Elmas Rehberi" (Kolay'da 3. banta kadar tahmini yol, Usta'da yok).

### 2.3 Oyun hissi (juice)
- **Olay tabanlı simülasyonun armağanı:** Atışın tamamı vuruş anında deterministik olarak çözülür (4.G). Sunum katmanı sonucu önceden bilir ve kesmeleri, slow-mo'ları, sesleri olay listesine göre planlar. Kural: sonucu ele veren hiçbir ipucu vuruştan önce gösterilmez; slow-mo olaydan en fazla 400 ms önce başlar.
- **Hit-stop (yalnız sunum zamanında, sim etkilenmez):** Açılış teması 40 ms; maçı kazandıran top düşerken 120 ms; Üç Bant sayısında ikinci hedef top temasında 60 ms. Normal vuruşlarda hit-stop yok (çıtır his).
- **Slow-mo:** "Kıl payı" (topun ağızda ≥2 çarpması veya cep kenarından geçiş payı ≤3 mm) 0,25×, giriş/çıkış rampası 150 ms; atış başına toplam ≤1,8 s gerçek zaman; dokunarak atlanır.
- **Sarsıntı:** Yalnız açılışta 2 px/120 ms ve Hızlı Bilardo Ateş'inde pot başına 3 px/90 ms. Başka hiçbir yerde kamera sarsıntısı yok — masa sabit bir dünyadır.
- **Haptik desenleri (ms):** Istaka teması 8–25 (güçle ölçekli); güçlü top-top (≥2 m/s) 6; cebe düşüş 18 + 40 ara + 10; faul 40-60-40; Üç Bant bant sayacı 8 / 8 / 20 (3. bant vurgulu); Üç Bant sayı 30-40-30; Ateş başlangıcı 60-30-60-30-90; zafer 20-20-20-20-120. Android'de `navigator.vibrate`, iOS'ta host bridge (Ortak §7).
- **Ses ipuçları:** Fenolik reçine top "tak"ı (çarpma hızıyla perde ±3 yarım ton, seviye −30…0 dB); deri uç "tok"; tebeşir gıcırtısı (her 3 atışta bir 0,6 s otomatik tebeşir animasyonu, atlanabilir); cep: deri "puf" + dönüş kanalında 2–3 s yuvarlanma kuyruğu; bant: boğuk "pof"; kalabalık: "Ooo" (kıl payı), alkış (iyi pot), "hıı" (ıska); Üç Bant sayacı: ahşap blok "tık-tık-TOK", yükselen perde.
- **Görsel geri bildirim:** Pottan sonra cep çevresinde 0,4 s yumuşak ışık halkası (gerçekçi, neon değil; Hızlı Bilardo hariç); beyaz topta tebeşir izi mavi nokta olarak kalır, 3 atışta silinir; faulde ekran kırmızıya boyanmaz — hakem düdüğü + "Faul — Elde top" kartı.

### 2.4 Kamera dili

| Kamera | Parametreler |
|---|---|
| 3D ıstaka kamerası | Dikey FOV portrede 52°, yatayda 40°; beyaz topun 0,7 m arkası (güçle 0,55–1,2 m); yükseklik 0,22 m (iki parmakla 0,15–0,6 m); eğim 12° (8–35°); bakış noktası beyaz top–hayalet top doğrusunun %35'i; nişan dönüşünde kritik sönümlü yay ω = 14 rad/s; güç çekilirken kamera 0,1 m geri kayar (gerilim). |
| Üst görünüm | Perspektif FOV 22° (ortografik hissi, düşük bozulma); masa güvenli alanın %92'si; portrede 90° döndürülmüş; nişan sırasında hiç kaymaz. |
| Geçiş | 450 ms ease-in-out yay yolu; roll 0°. |

**Yönetmen (vuruş sonrası otomatik kurgu):**
1. Pot öngörülüyor ve hedef top ≥0,6 m yol alacaksa: cep tarafında bant hizası kamera (5 cm yükseklik) topu karşılar; kısa yolda üst görünüm korunur.
2. Kıl payı: cep kamerası (ağzın içinden dışarı bakan, FOV 60°) + 0,25× slow-mo.
3. Açılış: yüksek geniş plan → 0,25× alçak plan → kesmeyle üst görünüm.
4. Zafer para planı: kazandıran top düşerken 0,35×, 2,4 s'de 120° orbit, roll ≤8°, lamba salınımı, kalabalık/flaş.
5. Üç Bant: üst görünümde ışık izi + bant sayaçları; 5+ bantlı sayıda ikinci kez top takip kamerasıyla (8 cm yükseklik) ağır çekim tekrar.
6. Atış başına ≤3 kesme, her plan ≥0,6 s; ardışık planlar 180° çizgisini geçmez; otomatik kameralarda açısal hız ≤90°/s, FOV değişimi ≤15°/s.
7. Oyuncu her an dokunarak üst görünüme dönebilir. Hızlı Bilardo'da Yönetmen yalnız Ateş başlangıcında ve altın topta devreye girer (≤1 s).

**Tekrar açıları:** Cep kamerası, bant hizası, kuş bakışı + iz, ıstaka arkası, top takip, orbit. Vuruş Arşivi ve highlight klipleri aynı açı kütüphanesini kullanır.

**Hareket hastalığı sınırları:** Roll yalnız para planında ≤8°; ani FOV sıçraması yok; Yat Güvertesi'ndeki salınım yalnız ışık ve arka planda ±0,6° (0,12 Hz), "Hareketi azalt"ta kapalı; oyun kamerası asla sallanmaz.

### 2.5 Modlar

#### 2.5.1 Kariyer — Masadan Masaya (8-Top)
**Amaç:** Ana omurga: 6 salon, 24 rakip, kişiliklerle anlatılan bir yükseliş. Rakipler gerçekçi insan modeli DEĞİL; stilize portre kartı + kendi ıstakası + "tell" animasyonları. Rakibin atışı yarı saydam, hafif parlayan bir **hayalet ıstaka** ile gösterilir.

**8-Top kuralları (basitleştirilmiş; oyunda 6 animasyonlu kartla, kart başına ≤20 kelimeyle anlatılır):**
1. **Toplar:** 1–7 düz renkli ("Düzler"), 9–15 çizgili ("Çizgililer"), 8 siyah. Amaç: kendi grubunu bitir, sonra 8'i işaretlediğin cebe sok.
2. **Açılış:** Beyaz top baş çizgisinin gerisinden vurulur. Geçerli açılış = en az bir top girer VEYA en az 4 hedef top banda değer. Geçersizse rakip seçer: masayı olduğu gibi oyna ya da yeniden diz ve kendin aç. Açılışta 8 girerse kayıp yok: 8 ayak noktasına geri konur. Açılışta beyaz girerse faul: rakip baş çizgisinin gerisinde elde topla başlar.
3. **Açık masa:** Açılıştan sonra gruplar belli değildir; açılışta giren toplar grup belirlemez. Açılıştan sonra ilk kez kurallı soktuğun topun grubu senindir. Açık masada ilk temas 8'e olamaz.
4. **Kurallı atış:** Beyaz önce kendi grubundan bir topa değmeli; ardından bir top cebe girmeli VEYA herhangi bir top (beyaz dahil) banda değmeli. Kendi topunu sokarsan sıra sende kalır. Top ve cep söylenmez; yalnız 8 için cep işaretlenir.
5. **Faul → rakibe masanın her yerinde elde top:** beyaz cebe girer veya masadan çıkar; ilk temas yanlış gruba ya da 8'e olur; beyaz hiçbir topa değmez; temastan sonra hiçbir top banda değmez ve top girmez; hedef top masadan fırlar (ayak noktasına geri konur).
6. **8 ile kaybetmek:** grubunu bitirmeden 8'i sokmak; 8'i işaretlenmemiş cebe sokmak; 8 girerken beyazın da girmesi; 8'in masadan fırlaması. **Kazanmak:** grubun bitince 8'i işaretlediğin cebe kurallı sokmak.

**Kural arayüzü:** Faul anında "Neden?" çipi; dokununca mini üst görünüm animasyonu faulü gösterir ("Beyaz önce çizgili 12'ye değdi").

**Salonlar ve rakipler (6 × (3 rakip + 1 patron) = 24):**

| # | Salon | Rakipler (kişilik / "tell") | Patron | Format | Kilit |
|---|---|---|---|---|---|
| 1 | Kadıköy Bilardo Salonu | Çaycı Hasan (yavaş, güvenli; çay bardağını sallar), Öğrenci Defne (agresif, uzun toplara saldırır), Emekli Kaptan Rüstem (emniyetçi; bıyığını sıvazlar) | Salon Sahibi Tevfik Usta (ıstakasını parmağında çevirir) | 1 frame; patron 3'te 2 | Açık |
| 2 | Beyoğlu Han Kulübü | Kâtip Zeynel (pozisyon hesapçısı), Hattat Melek (zarif falsolar), Kemancı Arda (ritimli, hızlı) | Kâhya Necmi (emniyet ustası, seni hep zor pozisyonda bırakır) | 1 frame; patron 3'te 2 | 6⭐ + Tevfik Usta |
| 3 | Boğaz Yalısı | Mimar Selin (bant potları), Koleksiyoncu Bora (her frame başka ıstaka), Doktor İpek (soğukkanlı, baskıya dayanıklı) | Nermin Hanım (3 vuruş ileriyi planlar) | 3'te 2 | 13⭐ + Necmi |
| 4 | Neon Gece Kulübü | DJ Kıvılcım (risk sever, kombinasyonlar), Yayıncı Kaan (gösterişli; sohbet balonları), Kadife (sessiz, kıl payı ustası) | Gölge (yüzü hiç görünmez; mase dener) | 3'te 2; patron 5'te 3 | 21⭐ + Nermin |
| 5 | Yat Güvertesi | Armatör Feride (sabırlı), Navigatör Efe (uzun bant yolları), Aşçı Bahri (tahmin edilemez) | Kaptan Poyraz (hızlı, baskıda titremez) | 3'te 2; patron 5'te 3 | 30⭐ + Gölge |
| 6 | Şampiyonluk Arenası | Makine Cem (kusursuz nişan, zayıf pozisyon), Sessiz Ayten (emniyet kraliçesi), Genç Yıldız Mira (cesur, baskıya hassas) | Usta Kenan "Son Söz" (tüm değerler zirvede) | 3'te 2; final 5'te 3 | 40⭐ + Poyraz |

- **Yıldızlar (maç başına 3):** ⭐ kazan; ⭐⭐ faulsüz kazan; ⭐⭐⭐ rakibe özel görev (kartında yazar: "Bir seride 3 top", "Bir bant potu", "Rakibi emniyetle faule zorla", "Masayı tek seride bitir" — patronlarda).
- **Rakip repliği:** Her rakibe 6 kısa replik (giriş, iyi pot, ıska, senin iyi potun, kazanma, kaybetme), ≤6 kelime, TR + EN; portre kartı 2D mikro animasyonla tepki verir (göz kırpma, baş sallama, gülümseme). Toplam 144 replik.
- **Usta Ligi:** Arena finalinden sonra açılır: aynı 24 rakip, Usta kılavuzu, rakip σ değerleri ×0,8, ayrı yıldız seti (72⭐ daha).

**AI profili (rakip başına JSON; 4.G uygular):** `aimSigmaDeg`, `englishErr` (R oranı), `planDepth` 1–3, `safetyBias` 0–1, `risk` 0–1, `pressure` 0–1, `breakPower`, `thinkMs` (600–1200).

| Salon | aimSigma° | englishErr | planDepth | safetyBias | risk | pressure |
|---|---|---|---|---|---|---|
| 1 | 0,9–1,4 | 0,12 | 1 | 0,1–0,3 | 0,3–0,7 | 0,6–0,8 |
| 2 | 0,7–1,0 | 0,10 | 1–2 | 0,2–0,6 | 0,3–0,6 | 0,5–0,7 |
| 3 | 0,5–0,7 | 0,08 | 2 | 0,3–0,5 | 0,3–0,5 | 0,2–0,5 |
| 4 | 0,4–0,55 | 0,07 | 2 | 0,2–0,4 | 0,5–0,8 | 0,4–0,6 |
| 5 | 0,3–0,4 | 0,05 | 2–3 | 0,4–0,6 | 0,3–0,6 | 0,2–0,4 |
| 6 | 0,15–0,28 | 0,03 | 3 | 0,4–0,7 | 0,3–0,5 | 0,1–0,5 |

Patron = salon aralığının en iyi ucu + bir imza yeteneği (ör. Necmi: safetyBias 0,8; Gölge: mase denemesi; Kenan: hepsi). Maç topunda AI'ın σ değeri `σ × (1 + pressure × 0,8)` olur — rakip de baskıyı hisseder ve bu kartında görünür (ter damlası ikonu).

**Baskı sistemi (yalnız Kariyer; ayarlardan kapatılabilir, varsayılan açık):**
- **Tetik:** maç topu (8'desin ve bu frame maçı bitirir) veya rakip 8'deyken senin son şansın.
- **Etkiler:** kalp atışı 72→96 bpm (bekledikçe hızlanır), kalabalık susar (ambiyans −12 dB, 800 Hz alçak geçiren), kılavuzda hafif sürüklenme: genlik 0,06° (Kolay) / 0,10° (Normal) / 0,15° (Usta), 0,35 Hz, maç tohumu + atış no ile deterministik.
- **"Nefes" karşı mekaniği:** İnce ayar tekerinde parmağını 1 s sabit tut → sürüklenme %60 azalır, kalp atışı yavaşlar, ekran kenarları hafifçe kararır. Vuruş anındaki gerçek açı komut akışına yazılır (replay deterministik kalır).
- **Arena ek:** Sessizlik anı — ışıklar %15, tek spot, seyirci siluetleri donar.

**Yerel 2 oyuncu (sıra-sende 8-Top):** İki isim + renk; her sıra değişiminde "Sıra sende, Ayşe" perdesi (1 s telefonu uzatma animasyonu); oyuncu başına istatistik; açılmış salonlardan seçim; Baskı varsayılan kapalı; kılavuz oyuncu başına ayrı seçilebilir (aile içi denge).

#### 2.5.2 Üç Bant
**Kurallar (basit anlatım, 5 kart):**
1. Cepsiz karambol masası, 3 top: beyaz (senin topun), sarı (rakibin topu), kırmızı.
2. **Sayı:** Kendi topunla vur. Topun iki hedef topa da değmeli ve **ikinci topa değmeden önce bantlara toplam en az 3 kez** çarpmış olmalı. Aynı bant birden çok sayılır; bant temasları birinci toptan önce de olabilir.
3. Sayı yaparsan sıra sende kalır; kaçırırsan rakibe geçer. Her sıra bir "ıstaka"dır.
4. Faul (top masadan fırlar, yanlış topla vurulur) = sayı yok, sıra rakibe; fırlayan top başlangıç noktasına konur.
5. Açılışta önce kırmızıya vurulmalı. Hedef sayıya ilk ulaşan kazanır. **Eşitleme kuralı:** açan oyuncu hedefe ulaşırsa rakip son bir ıstaka hakkı alır — oyunun en gergin anı; eşitlikte 1'er ıstakalık uzatma.
- **İstatistik:** ortalama = sayı / ıstaka, en yüksek seri, en çok bantlı sayı.

**Kariyer — Üstatlar:** 8 kurgusal üstat, 3 kademe: Kahvehane (Saatçi Hikmet — yavaş ve kesin; Tebeşir Rıza — sert vuruşlar), Kulüp (Pergel Leman — geometri; Lodos Sabri — ters falso; Mimar Firuz — emniyet), Şampiyona (Kemankeş Nuri — uzun yollar; Sedef Nevin — kısa açılar; Üstad-ı Azam Halil — final). Hedef sayılar 8 / 8 / 10 / 10 / 12 / 12 / 15 / 20, ıstaka limiti 30 (limitte çok sayı yapan kazanır). AI σ 0,35° → 0,08°; her üstadın imza yolu var (ör. Kemankeş Nuri 5 bantlı dolanmaları tercih eder). Her üstat yenilince Akademi'de ona ait 2 drill + 1 imza ıstakası açılır.

**Üç Bant Akademisi (30 drill, 5 bölüm × 6):** (1) Temel Yollar (kısa-uzun-kısa, çapraz geçiş, bant önce), (2) Elmas Sistemi (çıkış-hedef-varış numaraları), (3) Ters Falso ve Ters Dönüş, (4) Uzun Yollar (masayı dolanma, şemsiye, çift dolanma), (5) Usta Vuruşları (yelpaze, Z vuruşu, kısa açı kurtarma). Her drill: üst görünüm diyagram kartı (yol, elmas numaraları, önerilen falso/güç), "Göster" = ideal çözümün hayalet tekrarı; ⭐ ≤5 denemede, ⭐⭐ ≤2 denemede, ⭐⭐⭐ ilk denemede. Elmas Rehberi katmanı masa kenarındaki elmaslara numara yazar.

#### 2.5.3 Hızlı Bilardo (90 s arcade)
- Masada sürekli 8 top; giren top 0,4 s sonra tohumlu boş bir konuma "düşerek" yeniden doğar (toz halkası). Beyaz kaldığı yerden devam; beyaz cebe girerse −5 s ve elde top.
- **Puan:** pot = 100 × kombo (1 + 0,25 × (seri − 1), en fazla ×3) × Ateş (×2) + stil bonusları: bant potu +150, kombinasyon +200, çoklu pot +250/top, uzun pot (>1,5 m) +100, kıl payı +50, hızlı atış (önceki toplar durduktan sonra <3 s) +%10. Toplam çarpan ≤×6.
- **Zaman bonusları:** bant potu +2 s, çoklu pot +3 s, altın top +4 s. Iska zaman yemez ama seriyi sıfırlar.
- **Altın top:** her 25 s'de bir doğar; 500 puan + 4 s; Yönetmen ≤1 s kutlar.
- **Ateş:** 5'li seride veya Ateş göstergesi dolunca (pot başına %20) 8 s boyunca ×2; kılavuz Kolay uzunluğa çıkar, müzik 2× tempo, cepler ışıkla nabız atar. **Fizik değişmez** — cepler büyümez.
- Kamera sabit üst görünüm; toplar 0,15 m/s altına düşünce sunum 2×.
- Zamanlayıcı sim zamanına bağlıdır (nişan süresi tick olarak sayılır) → skor deterministik ve kodla paylaşılabilir.
- **Liderlik:** yerel ilk 10 + Günün Tahtası (günlük tohum) + Haftalık Tahta (haftanın tohumu herkes için aynı). Seviye 10'da "Ani Ölüm" varyantı açılır (ilk ıska = oyun biter).

#### 2.5.4 Günün Vuruşu (günlük trick-shot bulmacası)
- Her gün tek sabit dizilim, tarih tohumundan seçilir, herkes için aynı. Hedef: işaretli topların hepsini N vuruşta (N = 1–4) sok. Mase ve zıplama yalnız burada açık (falso panelinde ıstaka eğimi kaydırıcısı 0–60°).
- **Yıldızlar:** ⭐ çöz; ⭐⭐ ≤3 denemede çöz; ⭐⭐⭐ beyazı da altın halka bölgesinde durdur.
- Deneme sınırsız; deneme sayısı paylaşımda görünür. Son 7 günün bulmacası arşivden oynanabilir (suçluluk yok).
- **İçerik:** lansmanda 120 gün = 40 elle tasarlanmış şablon × 3 doğrulanmış varyasyon (çözücü her birinin çözülebilir olduğunu kanıtlar, 4.G). Her bulmacanın adı var: "Köprüden Geçiş", "Yarım Ay", "Boğaz'ı Dolan", "Kemerin Altı".
- Haftanın 7. günü "Usta Günü": mase/zıplama gerektiren zor bulmaca.

### 2.6 MİNİ GOLF DİORAMA (bağımsız mod — mini-GDD)
**Kanca:** "Masanın üstüne kurulmuş minicik bir İstanbul'da, keçe çimende mini golf." Ana menüde ayrı giriş; kendi başına premium bir oyun gibi durur (kendi menüsü, müziği, sanat dili — bkz. 3.8).

**Fantezi:** El yapımı bir maketin içinde dev bir oyuncu olmak. Boyalı ahşap, keçe çimen, mantar, kil, kâğıt ve oyuncak figürlerden kurulu diyoramalar; tilt-shift alan derinliği ile her şey avuç içi kadar.

**Çekirdek döngü:** Deliği incele (otomatik 3 s uçuş) → hedefle → geri çekip bırak → topu izle → delik (20–60 s). 9 delik = 6–10 dk. Deliğe girişte kâğıt konfeti + figürlerin minik sevinci.

**Kontroller:**
- **Sapan atış:** Toptan başlayan (topa ≤60 dp) sürükleme; ters yönde nişan, çekme mesafesi 0–200 dp → güç p = (d/200)^1,3; tahmini yol noktaları ilk sekmeye kadar (Kolay: 1. sekmeden sonra 20 cm daha; Usta: yalnız yön oku). Topa geri dönüp bırakmak = iptal.
- **Kamera:** Nişan dışında tek parmak = orbit (yatay 360°, eğim 30–70°), iki parmak = zoom (deliğe göre 0,35–1,1 m maket ölçeğinde), çift dokunuş veya buton = üst görünüm. Atıştan sonra kamera topu yumuşak takip eder (yay ω = 6 rad/s).
- Sol el modu ve iki dokunuş modu ana oyunla aynı.

**Fizik:** Deterministik (Rapier deterministik veya özel; 4.G karar verir). Keçe yuvarlanma direnci yüksek, ahşap rampalar düşük; kâğıt bölümler hafif yumuşak sekme; reçine "su" = topun battığı tehlike → 1 vuruş ceza, son güvenli noktadan devam. Hareketli engeller kinematik ve fazları sim tick'ine bağlı (aynı vuruş zamanı = aynı sonuç). Engellerin dekoratif figürleri stop-motion adımlı (12 fps) oynayabilir, **çarpışma gövdeleri asla adımlı değildir**.

**Parkur 1 — "Mahalle Maketi" (9 delik):**

| # | Delik | Par | Özellik |
|---|---|---|---|
| 1 | Simitçi Yokuşu | 2 | Eğimli arnavut kaldırımı (kabartmalı ahşap), simitçi arabasının etrafından dönüş; öğretici. |
| 2 | Çay Bahçesi | 3 | Masa ve tabureler arasından slalom; çay ocağından pamuk buhar. |
| 3 | Kedi Sokağı | 3 | Uyuyan keçe kediler (sabit engel); biri 6 s'de bir gerinip yolu kısmen kapatır (yumuşak, kediye zarar yok — top kediye çarparsa sadece "mır" sesi ve sekme). |
| 4 | Tramvay Hattı | 3 | Kırmızı oyuncak tramvay 7 s periyotla raydan geçer; zamanlama. |
| 5 | Vapur İskelesi | 4 | Reçine denizde gidip gelen vapur; top güverteye inerse karşı iskeleye taşınır (kestirme), kaçırırsan uzun kara yolu. |
| 6 | Martı Çatıları | 3 | Kiremit çatılardan rampa + atlama; martılar kâğıttan, tel üstünde. |
| 7 | Saat Kulesi | 3 | Kule çevresinde spiral rampa; akrep-yelkovan dönen engel (60 s/tur stilize). |
| 8 | Değirmen Tepesi | 4 | Ahşap yel değirmeni kanatları 4 s periyotla döner; kanat arasından geçiş veya yan yokuş. |
| 9 | Mahalle Meydanı | 4 | Hepsinin karışımı: tramvay, döngü (loop) ve meydan çeşmesi; finalde fener ışıkları yanar. |

**Parkur 2 — "Masa Üstü Macera" (9 delik):**

| # | Delik | Par | Özellik |
|---|---|---|---|
| 1 | Kitap Merdiveni | 2 | Üst üste kitaplardan basamaklı iniş. |
| 2 | Cetvel Rampası | 3 | Cetvelden rampa + atlama, defter "adasına" iniş. |
| 3 | Kalemlik Labirenti | 3 | Kalemlerden duvarlar, silgi tamponları. |
| 4 | Çay Bardağı Virajı | 3 | İnce belli bardak ve tabağın çevresinde dar viraj; tabak kenarı duvar gibi çalışır. |
| 5 | Oyuncak Tren | 4 | Ahşap tren 8 s periyotla hattı keser; vagonlar arasındaki boşluktan geçiş. |
| 6 | Silgi Tepeleri | 3 | Zıplatan silgiler (yüksek sekme katsayısı). |
| 7 | Ataş Köprüsü | 3 | Dar tel köprü; kenar düşmeleri. |
| 8 | Pergel Değirmeni | 4 | Dönen pergel kolları değirmen gibi; 5 s periyot. |
| 9 | Büyük Atlas | 5 | Rulo kâğıttan döngü + açık atlasın içine atlama; final. |

**Kurallar ve puan:** Delik başına en fazla 6 vuruş (sonra top kaldırılır, skor = par + 3 → aile oyunu akar). Yıldızlar: ⭐ ≤ par+1, ⭐⭐ ≤ par, ⭐⭐⭐ ≤ par−1 (hole-in-one her zaman ⭐⭐⭐). Parkur 2, Parkur 1'de 12⭐ ile açılır. 18 deliğin hepsinde ⭐⭐⭐ sonrası **Ayna Parkurları** (aynalanmış + engel fazı kaydırılmış 18 delik, ayrı yıldızlar) açılır → 36 delik.

**Alt modlar:**
- **Hole-in-one Challenge:** 10 özel "tek vuruş" kurulumu (her parkurdan 5); her delikte tek hak; skor = ace sayısı + yakınlık puanı (deliğe uzaklık cm ile ters orantılı, en fazla 100). Yerel liderlik.
- **Günün Deliği:** Tarih tohumuyla 18 delikten biri + tohumlu başlangıç noktası/engel fazı; herkes için aynı; paylaşım kartı (2.8).
- **Yerel 2–4 oyuncu sıra-sende:** Oyuncu başına top rengi (kırmızı, mavi, sarı, yeşil) ve isim; delik delik sırayla; kâğıt skor kartı canlı güncellenir; sonunda karton kürsüde kupa töreni. Engel saati tüm oyuncular için tek, kesintisiz akar (adil ve öngörülebilir).
- **Bot oyuncu "Maket Ustası":** Tek kişilik aile oyunu için isteğe bağlı rakip (3 zorluk: aimSigma 6° / 3° / 1,2°, güç hatası %12 / %6 / %3).

**İlerleme ve kozmetik (yalnız oyunla kazanılır):** 12 top kaplaması (boncuk, misket, nazar boncuğu, cam bilye, ahşap, mermer, ebru desenli…), 6 iz efekti (keçe iplik, simli toz, kâğıt yıldız…), 6 bayrak, 4 putter görünümü. Rozetler: "İlk Ace", "Vapurla Seyahat", "Tramvaydan Kaçış", "Tüm Parkur Par Altı". Ana oyunun Oyuncu Seviyesi'ne XP verir ama bağımsız oynanabilir.

**Onu farklı kılan:** Gerçek bir masa üstü maketi hissi (fiziksel malzeme sesleri: ahşapta "tok", keçede "fşş", kâğıtta hışırtı), Türkiye'ye özgü mahalle detayları, aile içi sıra-sende oynanabilirlik, ekran görüntüsünün kendisinin paylaşım nedeni olması.

### 2.7 Meta ve ilerleme
- **Oyuncu Seviyesi (1–60):** Tüm modlardan XP: pot 5, kazanılan frame 50, Üç Bant sayısı 10, Günün Vuruşu çözümü 80, Mini Golf deliği 10–40. Eğri: seviye n için gereken XP = 120 × n^1,35. Her seviye bir ödül verir (ıstaka, kumaş, ses paketi, profil çerçevesi).
- **Istaka Koleksiyonu (36 ıstaka, yalnız kozmetik):** ahşaplar (akçaağaç, ceviz, zeytin, koyu abanoz görünümü), kakmalar (sedef, lale, çini motifi, ebru), metal halkalar. Edinme: seviye (14), rakip/üstat yenme (12 imza ıstakası), rozet (10). Rastgele hiçbir şey yok; her ıstakanın kartında nasıl açılacağı yazar. Detaylı 3D inceleme ekranı.
- **Masa kumaşı renkleri (12):** turnuva mavisi, klasik yeşil, bordo, antrasit, turkuaz, hardal, gece moru, zeytin, kum, okyanus, lacivert, kiremit. Yalnız Serbest Masa ve Hızlı Bilardo'da seçilebilir (Kariyer'de salonun kumaşı sabit — sanat tutarlılığı).
- **Salon kilitleri:** yıldız kapıları (2.5.1).
- **Ustalık rozetleri (40):** "Kıl Payı Ustası" (kıl payıyla giren 10 top), "Bant Mimarı" (7 bantlı Üç Bant sayısı), "Temiz Masa" (tek seride frame), "Soğukkanlı" (baskı altında 10 maç topu), "Sabah Kuşu" (7 Günün Vuruşu)… Bronz/gümüş/altın kademeleri.
- **Vuruş Arşivi:** Otomatik en iyi 20 highlight + elle kaydedilen 30 replay (komut akışı olarak, kilobaytlar). Her kayıt yeniden sinematik render edilebilir.
- **Rotasyonlar:** Günlük: Günün Vuruşu, Günün Deliği, Günün Tahtası. Haftalık: Haftalık Tahta (Hızlı Bilardo), "Haftanın Salonu" (bir salonda değiştiricili meydan okuma: "Sadece bant potları", "Usta kılavuzu").
- **Suçluluksuz seri:** Kırılan seri yok; "Haftalık Ritim": 7 günde 5 gün oynayana rozet adımı. Kaçırılan gün kayıp değildir.
- **YASAK:** Ganimet kutusu, şans çarkı, enerji/can zamanlayıcısı, bahisli maç, istatistik veren ekipman, oyunla kazanılamayan ödül.

### 2.8 Viral sistemler
- **Günün Vuruşu paylaşım kartı (metin):**
  `ISTAKA #312 🎱 2 vuruş ⭐⭐⭐ — Sen yapabilir misin?`
  Genişletilmiş: `ISTAKA #312 "Köprüden Geçiş" 🎱 2 vuruş · 3. deneme ⭐⭐⭐ 🟢🟢⚪ — Sen yapabilir misin?` (🟢 = başarılı vuruş, ⚪ = kullanılmayan hak).
- **Günün Deliği kartı:** `DİORAMA #87 ⛳ 1 vuruş 🕳️✨ Mahalle Maketi · 5. delik — Sen yapabilir misin?`
- **Hızlı Bilardo kartı:** `ISTAKA Hızlı 🔥 18.450 puan · 23 pot · 3× Ateş — Kodu gir, beni geç: H7Q2-KD9M`
- **Görsel kart:** 1080×1350 PNG: üst görünüm masa, çözüm yolları ışık iziyle, yıldızlar, tarih, numara; salonun LUT'u ile.
- **Highlight klibi (≤8 s):** Tetikler: kıl payı pot, 5+ bantlı Üç Bant sayısı, tek seride frame, maç topu, Günün Vuruşu çözümü, Mini Golf ace. Deterministik replay ekran dışında Yönetmen açılarıyla yeniden oynatılır, 720p/30 fps kaydedilir (MediaRecorder + `canvas.captureStream`, desteklenmezse host bridge). Son 1 s'de logo + kart metni.
- **Meydan okuma kodları:** Mod + sürüm + tohum + komutlar (atış başına ~44 bit: açı 0,001° kuantize, güç 10 bit, falso 2×7 bit; elde top konumu 2×12 bit) → Crockford Base32, 4'lü gruplar. Günün Vuruşu çözümü ~24 karakter. Kodu giren arkadaş önce kendisi dener, sonra çözümü hayalet ıstaka olarak izler.
- **Fotoğraf modu:** Replay içinde serbest kamera, DOF odak/diyafram, 6 filtre (Salon Sepya, Siyah-Beyaz, Neon, Altın Saat, Gece Mavisi, Maket), UI gizle, çerçeve şablonları.

### 2.9 FTUE (ilk 60 saniye, metin duvarı yok)
1. **0–17 s:** İlk izlenim filmi (Bölüm 1).
2. **17–25 s:** Düz pot. Parlayan el ikonu geri çekmeyi gösterir; kılavuz Kolay; nişan önceden doğru. Oyuncu yalnız çekip bırakır → kesin pot, Yönetmen kutlar.
3. **25–35 s:** Açılı pot. El ikonu masada sürüklemeyi gösterir; hayalet top hedefle örtüşünce yeşil yanar. İkinci başarı.
4. **35–45 s:** Falso tanıtımı: beyaz top ikonunda nabız; "alt falso" ile beyazın geri gelmesi gösterilir (tek kelimelik etiketler).
5. **45–55 s:** İlk gerçek seçim: iki hedeften birini seç; ince ayar tekeri parlar (dokununca 0,1° tık haptiği).
6. **55–60 s:** "Masa senin." → Kadıköy'ün ilk rakibi Çaycı Hasan'ın kartı döner; tek dokunuşla maç. Kurallar maç içinde, ilk ilgili an geldiğinde 1 kartla anlatılır (ilk faul, ilk grup belirleme, ilk 8).
- Her ipucu en fazla 4 kelime; atlamak için "Biliyorum" düğmesi (uzman oyuncu doğrudan menüye).

### 2.10 Zorluk ve denge
- **Kılavuz seviyeleri:** Kolay / Normal / Usta (2.2). Kariyer'de varsayılan Normal; ilk salon Kolay önerir.
- **Hedef kazanma oranları (ortalama yeni oyuncu, Normal):** Salon 1 %75, Salon 2 %65, Salon 3 %55, Salon 4 %50, Salon 5 %45, Salon 6 %40; final ilk denemede %30. Bot-bot simülasyonuyla ayarlanır (9.G).
- **Dinamik yardım "Destek" (yalnız Salon 1–2, varsayılan açık, kapatılabilir):** Üst üste 3 kayıp atışta kılavuz %20 uzar; aynı rakibe 2 kayıpta rakibin σ değeri %10 artar. Günün Vuruşu, Üç Bant Üstatlar, liderlik modları ve Usta Ligi'nde **asla** devrede değildir. Etkin olduğunda sonuç ekranında küçük bir ikonla dürüstçe gösterilir.
- **Üç Bant zorluğu:** Elmas Rehberi Kolay'da 3 bantlık yol, Normal'de 1 bant, Usta'da yok. Akademi önerisi: Üstatlar kademesi 2'ye geçmeden 12 drill.
- **Hızlı Bilardo dengesi:** Ortalama oyuncu 6.000–9.000, iyi oyuncu 15.000+, teorik üst sınır ~40.000 (bot hesaplar).

### 2.11 UI ekranları
- **Ana menü (yaşayan 3D sahne):** Kadıköy salonu (açılan salona göre değişir); kamera yavaşça süzülür, masada top bir kez kendi kendine yuvarlanır, lamba hafifçe salınır. Menü öğeleri fiziksel nesnelerdir: **ıstaka askısı** = Koleksiyon, **kara tahta** = Günün Vuruşu (tebeşirle bugünün numarası), **puan teli** (boncuklu sayı teli) = Üç Bant, **neon "HIZLI" kapı tabelası** = Hızlı Bilardo, **yan sehpada cam kutulu diyorama** = Mini Golf, **masa** = Kariyer. Dokununca kamera nesneye uçar (600 ms). Düşük tier'da aynı sahne pişmiş ışıkla.
- **Mod seçimi / Kariyer haritası:** 6 salon kartı yatay kaydırma; her kartta salonun canlı mini görüntüsü, yıldız sayısı, patron siluet kartı.
- **HUD:** Üstte iki oyuncu kartı (portre, grup topları, sıra göstergesi, baskı ikonu); sağda ince teker; altta/yan güç çubuğu; köşede falso topu; kamera ve duraklat düğmeleri. Üç Bant'ta skor için puan teli boncukları + ıstaka sayısı + ortalama. Hızlı Bilardo: büyük sayaç, kombo, Ateş göstergesi.
- **Duraklat:** Devam, kurallar kartları, ayarlar, çıkış (otomatik kayıt bildirimi).
- **Sonuç:** Yıldızlar tek tek pirinç sesiyle; istatistik (isabet %, en uzun seri, ortalama, faul); "Maçın Vuruşu" replay küçük resmi → oynat/kaydet/paylaş; "Bir tane daha".
- **Ayarlar (oyuna özel):** Kılavuz, Baskı aç/kapa, Destek aç/kapa, sol el, iki dokunuş vuruş, Yönetmen yoğunluğu (Tam/Az/Kapalı), hareketi azalt, haptik, ses kanalları, dil.
- **Koleksiyon:** Istaka askısında 3D ıstakalar; dokununca döndürülebilir inceleme; kumaş örnekleri; rozet panosu; Vuruş Arşivi.

### 2.12 Ses, müzik, haptik
- **Katmanlar:** (1) oda tonu (salon mırıltısı, han yankısı, yalıda dalga ve uzak vapur düdüğü, neon kulüpte duvar arkası bas, yatta rüzgâr/dalga, arenada kalabalık); (2) fizik sesleri (top-top, top-bant, cep, ıstaka teması; çarpma hızı/açısıyla parametrik); (3) tepki sesleri (kalabalık, rakip kartı); (4) müzik; (5) UI.
- **Adaptif müzik:** Salon başına sakin lounge katmanı (Kadıköy: kanun + kontrbas; Han: ud + yaylılar; Yalı: piyano; Neon: synth; Yat: akustik gitar; Arena: orkestral perküsyon). Frame sonuna doğru (her iki oyuncuda ≤2 top) gerilim katmanı eklenir; maç topunda müzik susar, yalnız kalp atışı + oda tonu. Hızlı Bilardo: 124 bpm elektronik + darbuka; Ateş'te tam katman + yükselen efekt.
- **İmza sesleri:** ISTAKA "tok-tak" (logo sesi); kıl payı kalabalık "Ooo"; Üç Bant ahşap blok sayacı; pirinç sayaç "çing".
- **Üretim (lisans güvenli):** Fizik sesleri CC0 kayıtlardan (yalnız CC0 filtresiyle; her kaynak CREDITS.md'ye) + Web Audio ile perde/filtre/katman varyasyonları; UI ve sayaç sesleri tamamen prosedürel (Web Audio osilatör + zarf). Müzik: CC0 enstrüman örnekleriyle oyun içi prosedürel sekansör veya CC0 doğrulanmış parçalar; lisansı doğrulanamayan hiçbir ses kullanılmaz.
- **Haptik:** 2.3'teki desenler; ayarlardan kapatılabilir; pil modu haptiği yarıya indirir.

### 2.13 Yerelleştirme ve yaş/hassasiyet
- **TR varsayılan, EN ikinci.** Terimler sözlüğü: 8-Top = 8-Ball, Üç Bant = Three-Cushion, Faul = Foul, Elde top = Ball in hand, Kıl payı = By a hair, Falso = Spin/English, Üst/Alt falso = Follow/Draw, Istaka (sıra) = Inning, Ortalama = Average, Seri = Run.
- Türkçe büyük harf dönüşümü `toLocaleUpperCase('tr-TR')` (i→İ, ı→I); EN'de `en-US`. Sayı biçimi TR'de "18.450", EN'de "18,450".
- UI metinleri %30 uzama payıyla tasarlanır (EN/TR farkı).
- **13+ uygunluk:** Kumar/bahis yok; sigara, alkol, kül tablası yok (salonlarda çay bardağı, gazoz şişesi, meyve suyu); posterler jenerik (gerçek marka/kişi yok); rakipler yaş, cinsiyet ve tarz olarak çeşitli; trash-talk yok — replikler saygılı ve esprili. Mini Golf'te kediler ve martılar zarar görmez; çarpışma yalnız "mır"/"vak" sesi ve sekme.

---

## 3. Sanat yönetimi (Art Bible)

### 3.1 Temel ilkeler
- **Masa kahramandır.** Ekran alanının %60–80'i masadır; kumaş, toplar ve ahşap gerçekçilikte tavizsiz. Salon, masayı çerçeveleyen sahne ışığıdır.
- **Ölçek:** 1u = 1 m. Pool masası oyun alanı 2,54 × 1,27 m, top çapı 57,15 mm; Üç Bant masası 2,84 × 1,42 m, top çapı 61,5 mm (sayısal değerler 4.G ile birebir aynı olmalı). Masa orijinde, uzun eksen Z.
- **Işık yönü sabit:** Ana ışık her salonda masanın üstündeki kanopi lambadır (aşağı bakan, yumuşak dikdörtgen); toplarda dikdörtgen/çoklu yuvarlak spekülar vurgu buradan gelir. İkincil ışık salona özgüdür ve kamera açısından bağımsız olarak hep aynı yerden gelir.
- **Texel yoğunluğu:** Toplar/ıstaka/bant ahşabı 2048 px/m eşdeğeri; masa gövdesi 1024 px/m; salon props 256–512 px/m. Kumaş = tile eden mikro doku + makro varyasyon maskesi.
- **Low-first:** Her salon önce Düşük tier'da güzel olacak şekilde tasarlanır: Blender'da pişmiş lightmap + AO, gradyan sis, shader içinde renk derecelendirme; üst tier'lar yalnız ekler (gerçek zamanlı gölge, SSAO, ekran-uzayı yansıma, hacimsel ışık).

### 3.2 Masa ve toplar (tüm salonlarda ortak kahraman setleri)
| Öğe | PBR rehberi |
|---|---|
| Kumaş (yün, worsted) | `MeshPhysicalMaterial` sheen 0,5–0,7, sheenRoughness 0,6, roughness 0,9; mikro lif normali; bantların dibinde pişmiş AO şeridi; topların bıraktığı çok hafif yol izi (tebeşir tozu) dekali. Plastik parlaklık YASAK. |
| Toplar (fenolik reçine) | clearcoat 1,0, clearcoatRoughness 0,03, roughness 0,08; numaralar dekal değil doku (keskin, 1080p'de okunur); çizgili topta bant doğru sarılı; salon cubemap'i + lamba vurgusu her tier'da. Beyaz topta 6 küçük kırmızı nokta (falso görünürlüğü için; isteğe bağlı kozmetik). Üç Bant topları: beyaz, sarı, kırmızı. |
| Temas gölgesi | Her topun altında lamba şekline uygun analitik yumuşak gölge + temas AO (tüm tier'larda — gerçekçiliğin anahtarı). |
| Bant ve gövde ahşabı | Ceviz/maun: roughness 0,25–0,35, clearcoat 0,7; ahşap damarı anizotropisiz; köşelerde 3 mm pah. |
| Elmaslar | Sedef kakma: iridescence 0,6, roughness 0,2. |
| Cepler | Deri astar (roughness 0,55, hafif aşınma) + örgü file/oluklu dönüş kanalı; pirinç köşe kapakları (metalness 1, roughness 0,3). |
| Istaka | Ahşap + kakma + deri sap (roughness 0,7) + fildişi rengi kompozit ferrül + mavi tebeşirli deri uç. |
| Tebeşir küpü | Mavi, köşesi aşınmış, toz partikülü. |

### 3.3 Salonlar
| Salon | Saat / ışık | Renk sıcaklığı | Atmosfer | Palet (hex) | Kumaş |
|---|---|---|---|---|---|
| 1 Kadıköy Bilardo Salonu | Akşam, iç mekân; 3 kanopi lamba, pencereden sokak lambası | Ana 2700 K, dolgu 4000 K | Sıcak sis (yoğunluk düşük, lamba konilerinde toz) | #2B1D14, #8C5A2B, #D9A55B, #1F5C3A, #E8D9B5, #6E2C22 | Klasik yeşil #1F5C3A |
| 2 Beyoğlu Han Kulübü | Öğleden sonra; taş kemerler, avludan gün ışığı | Ana 3200 K, avlu 5600 K kenar ışığı | Kemerlerde ışık huzmeleri | #3A3530, #A89B86, #C9B48A, #24427A, #B5651D, #EFE6D2 | Lacivert #24427A |
| 3 Boğaz Yalısı | Mavi saat → gece; avize + pencere | İç 3000 K, dış 7000 K | Pencere camında yansıma, tavanda animasyonlu deniz kostiği | #0E2238, #2F5D7C, #E9B872, #F2EFE9, #9DB4C0, #5B2333 | Bordo #5B2333 |
| 4 Neon Gece Kulübü | Gece; neon tüpler + masada beyaz kanopi | Masa 4500 K, çevre magenta/camgöbeği | Hacimsel sis konileri, ıslak parlak zemin | #0B0B14, #FF2E88, #18E0FF, #7B2CFF, #FFD23F, #1A1A2E | Gece moru #2A2350 |
| 5 Yat Güvertesi | Gün batımı; alçak güneş + güverte tente altı lamba | Güneş 2200–3000 K, gök dolgusu 9000 K | Deniz ufku pusu; ışık/arka planda ±0,6° salınım (fizik değil) | #FF8A3D, #FFC46B, #3A6E8F, #F4F1EA, #B07A4A, #1F3B57 | Turkuaz #1E7F86 |
| 6 Şampiyonluk Arenası | Karanlık arena; dar spot masaya | Spot 5000 K, kenar 3500 K | Spot konisinde ince toz; seyirci siluetleri koyu | #050608, #1C2A4A, #F5F5F0, #C8A24A, #0F4C81, #8E1B1B | Turnuva mavisi #0F4C81 |

**Hero props:** (1) puan teli, çay bardakları, kara tahta, jenerik eski afişler (marka/kişi yok), ahşap ıstaka askısı; (2) kesme taş kemerler, bakır avize, kilim, ahşap pencere kafesi; (3) büyük pencere ve Boğaz panoraması (2.5D katmanlı arka plan + geçen ışıklı vapur), avize, piyano; (4) neon tabelalar (jenerik şekiller: ıstaka, yıldız, 8), cam bloklu bar (meyve suyu/mocktail), plak çalar; (5) tik güverte, beyaz fiberglas, halatlar, can simidi, ufukta güneş; (6) seyirci tribünü (instanced impostor kart siluetleri, nefes/baş hareketi), dev skorbord, kupa vitrini, TV kamera vinci silueti.

**VFX listesi:** tebeşir tozu bulutu, lamba konisi toz zerreleri, cep ışık halkası (0,4 s), Üç Bant ışık izi (ribbon, sönümlenen parlaklık) ve 1-2-3 rakam patlamaları, kıl payı zaman bükülmesi (hafif radyal bulanıklık, yalnız Yüksek+), flaş patlamaları (Arena), Ateş köz izi ve kumaş altı kızıl nabız (Hızlı Bilardo), altın top parıltısı, yeniden doğan top toz halkası, konfeti yerine Arena'da kâğıt şerit yağmuru.

### 3.4 Post-processing görünümü
- **Tone mapping:** AgX (varsayılan) — Neon salonunda Neutral (doygun neonlar kırpılmasın). Salon başına 32³ LUT: Kadıköy "sıcak amber", Han "taş sepya", Yalı "gece mavisi + altın", Neon "magenta-camgöbeği ayrışması", Yat "altın saat", Arena "soğuk kontrast".
- **Bloom:** yüksek eşik (yalnız lamba, top vurguları, neon); yoğunluk 0,25–0,45.
- Vinyet 0,15–0,25; film greni %2 (Düşük'te kapalı); kromatik aberasyon YASAK (Neon'da replay'de çok hafif izin).
- **DOF:** yalnız sinematik/replay/fotoğraf modunda; oyun kamerasında asla.
- **SSAO** Yüksek+; Düşük/Orta'da pişmiş AO + temas gölgeleri.

### 3.5 Tipografi ve UI stili
- **Fontlar (Google Fonts, Türkçe glif zorunlu — ğ Ğ ı İ ş Ş ç Ç ö Ö ü Ü test metniyle doğrula):** Başlık: Playfair Display (salon zarafeti); UI/etiket: Inter (tabular rakamlar skor için); skorbord/sayaç: Oswald. Desteklemeyen font kullanılmaz.
- **Stil "Salon Lüksü":** koyu yarı saydam paneller (Yüksek+ arka plan bulanıklığı, Düşük'te düz #101418 %88 opak), pirinç/altın vurgular (#C8A24A), kumaş dokulu kart arka planları, ince 1 px altın çizgiler. 8 dp ızgara, dokunma hedefleri ≥48 dp, köşe yarıçapı 10 dp.
- Rakip portre kartları: stilize illüstrasyon (düz renk + yumuşak gölgelendirme, gravür taraması), salonun paletine uygun çerçeve; prosedürel/SVG tabanlı üretilebilir; gerçek kişilere benzemez.
- Sayılar ve skor değişimleri pirinç sayaç "takla" animasyonuyla (150 ms).

### 3.6 Düşük tier'ın da güzel olması
- Pişmiş lightmap (salon) + pişmiş masa AO; dinamik ışık yalnız kanopi lamba (gölgesiz) + analitik top gölgeleri.
- Toplar: tek önceden hesaplanmış salon cubemap'i (64–128 px) + sabit lamba vurgusu shader'da; clearcoat yerine ucuz iki loblu spekülar.
- Sis: mesafe gradyanı + lamba konisi için tek additive kart (hacimsel değil).
- LUT renk derecelendirmesi shader sonunda tek geçişte; bloom yerine lamba ve vurgulara emissive halo kartları.
- Seyirci, neon tüp ve deniz gibi arka plan öğeleri 2.5D katmanlı kartlar.
- Kabul ölçütü: Düşük tier ekran görüntüsü Yüksek'le yan yana konduğunda "aynı oyun, daha yumuşak" görünmeli; masa ve toplar neredeyse aynı.

### 3.7 Görsel tutarlılık kuralları ve yasaklar
- Tüm CC0 asset'ler aynı malzeme kütüphanesinden yeniden dokulanır (renk, roughness aralıkları bu bölümden); karışık stil yasak.
- Işık yönü sahne içinde tutarlı; ikinci bir "gölge yönü" yok.
- **Yasaklar:** varsayılan three.js görünümü (gri MeshStandard, ortamsız), plastik parlak kumaş, yansımasız top, bulanık top numarası, ucuz gökkuşağı gradyanları, 2010 casual oyun düğmeleri, tırtıklı çizgiler, logo/marka, sigara/alkol, gerçekçi insan yüzü, kamera sallanması (izin verilen istisnalar hariç), aşırı bloom ile süt gibi görüntü.

### 3.8 MİNİ GOLF DİORAMA — ayrı mini art bible (tilt-shift minyatür)
**Konsept:** "Pazar sabahı maket atölyesi." Diyorama, sıcak ışıklı bir ahşap çalışma masasının üstünde duran gerçek bir fiziksel nesnedir. Kenarlarında odak dışı boya kavanozları, fırçalar, kesim matı, washi bant ruloları görünür. Her şey el yapımı: pahlı kenarlar, hafif kusurlar, fırça izleri, parmak izi dokusu.

**Görsel ölçek:** Bir parkur deliği ≈ 0,6–1,2 m'lik masa üstü maketi gibi algılanmalı; top ≈ 2 cm boyalı boncuk. Fizik birimi 4.G'de belirlenir; görsel oranlar bu algıyı korur (figür ≈ 4–6 cm, ev ≈ 8–15 cm).

**Kamera ve tilt-shift:**
- Kamera eğimi 35–60° (yukarıdan bakış minyatür illüzyonunun anahtarıdır); FOV 35°; yatay ufuk asla kadraja girmez.
- **Derinlik doğru tilt-shift DOF:** odak bandı topun derinliğinde, ekran yüksekliğinin %12–18'i; bulanıklık yarıçapı Ultra 12 px, Yüksek 9 px, Orta 6 px (1080p referans); Düşük: yarım çözünürlükte 2 geçişli Gauss + derinlik maskeli karışım. Derinliksiz "ekranın üstünü/altını bulanıklaştır" YASAK.
- Doygunluk +%15, yumuşak S-eğrisi kontrast, vinyet 0,2; tone mapping AgX + "Maket" LUT (sıcak vurgular, hafif camgöbeği gölgeler).

**Işık:** Sol üstten büyük softbox gibi sıcak ana ışık 3800 K, sağdan soğuk dolgu 6500 K (%30), çok yumuşak geniş gölgeler (Düşük–Orta'da pişmiş, Yüksek+'ta PCF yumuşak gölge haritası). Gölgeler asla tam siyah değil (min. %25 değer). Sabah güneşi hissi; Parkur 2'de masa lambası (2900 K) ek ışık.

**Paletler:**
- **Parkur 1 Mahalle Maketi:** #F2C14E (simit sarısı), #E4572E (kiremit), #2E86AB (reçine deniz), #7FB069 (keçe çimen), #F7F3E3 (kâğıt beyazı), #A26769 (gül kurusu), #3D405B (lacivert gölge).
- **Parkur 2 Masa Üstü Macera:** #C9A227 (kurşun kalem sarısı), #4F6D7A (defter mavisi), #E8E2D0 (kâğıt), #B23A48 (silgi kırmızısı), #6A994E (cetvel yeşili), #D4A373 (ahşap masa), #2B2D42 (mürekkep).

**Malzemeler (PBR):**
| Malzeme | Rehber |
|---|---|
| Boyalı ahşap | roughness 0,55–0,65, fırça izi normali, kenarlarda boya aşınması (curvature maskesi). |
| Keçe çimen | sheen 0,8, roughness 0,95, lif gürültüsü; kenarları hafif tüylü (alpha kartlar Yüksek+). |
| Mantar | gözenekli albedo, roughness 0,9, mikro boşluk normali. |
| Kil | roughness 0,7, parmak izi/şekillendirme izi normali, mat. |
| Kâğıt/karton | lif dokusu, katlama izleri, arkadan ışıkta hafif translucency (Yüksek+), kesik kenar beyazlığı. |
| Oyuncak figürler | ahşap mandal-bebek stili; nokta göz, yüz detayı yok; boya roughness 0,5. |
| Reçine su | clearcoat 1,0, katmanlı derinlik tonu (sığ #6FC3D9 → derin #1D5C7A), içinde hapsolmuş küçük kabarcıklar; dalga yok, yalnız top düşünce halka. |
| Cam (çay bardağı) | Ultra/Yüksek'te transmission; Orta/Düşük'te ortam haritalı sahte kırılma + kenar Fresnel. |
| Metal (ataş, pergel) | metalness 1, roughness 0,3, hafif çizik. |

**Hero props:** simitçi arabası (kâğıt simitler), çay bahçesi (kil bardaklar, pamuk buhar), keçe kediler, kırmızı tramvay, beyaz-sarı vapur, kiremit çatılar ve kâğıt martılar, saat kulesi, ahşap yel değirmeni, meydan çeşmesi; kitap yığınları, cetvel, kalemler, silgiler, ince belli çay bardağı ve tabağı, ahşap tren ve raylar, ataş köprü, pergel, açık atlas.

**VFX:** kâğıt konfeti (delik), keçe tüy pufu (iniş), talaş tozu (ahşap çarpma), pamuk buhar (çay), reçinede halka, kozmetik izler (keçe iplik, simli toz, kâğıt yıldız). Hepsi "el yapımı" görünür: dokulu, düz renk, yavaş.

**Animasyon dili:** Dekoratif figürler stop-motion adımlı (12 fps) — kedinin kuyruğu, simitçinin el sallaması, martılar. Fiziksel engeller (tramvay, vapur, tren, değirmen, pergel) akıcı ve sim'e bağlı. Kamera hareketleri yumuşak, "elde tutulan makro kamera" hissi (çok hafif, 0,2° nefes salınımı; hareketi azalt'ta kapalı).

**UI stili:** Kesilmiş kâğıt ve karton: yırtık kenarlar, washi bant etiketler, kurşun kalemle işaretlenen gerçek skor kartı, düğmeler karton jeton gibi basılır (2 px gölge, 80 ms). Fontlar: başlık Baloo 2, gövde Nunito, el yazısı etiketler Caveat — üçü de Türkçe glif testinden geçmeli.

**Düşük tier:** Pişmiş ışık ve AO, ucuz derinlik maskeli bulanıklık, keçe tüyleri kapalı (yalnız sheen), cam sahte kırılma; tilt-shift hissi korunur çünkü asıl illüzyon kamera açısı + odak bandı + doygunluktan gelir.

**Yasaklar:** gerçekçi insan/hayvan modelleri, her yerde aynı parlak CG plastik, pahsız keskin kenarlar, derinlik mantığı olmayan bulanıklık, aşırı doygun gökkuşağı, marka/logo, ufuk çizgisi ve "sonsuz zemin", ana ISTAKA salonlarının fotogerçekçi dilini buraya taşımak (iki dünya ayrı kalmalı).

---

## 4. Teknoloji yığını ve mimari

### 4.1 Yığın (2026-10-07'de npm'de doğrulandı; **tam sürüm pinle**, `^` yok, `npm update` yok)

| Katman | Seçim | Not |
|---|---|---|
| Render | **three `0.186.1`**, klasik `WebGLRenderer` (WebGL2), tüm kademelerde | WebGPU v1'de **yok**. Mi 9T Android 11'de kalıyor ve WebGPU yok. WebGPURenderer'ın WebGL2 yedeği klasik renderer'dan yavaş. Renderer'ı ince bir modülün arkasında tut ki ileride WebGPU Ultra yolu eklenebilsin. |
| Tipler | `@types/three 0.186.0` | |
| Post-process | **`postprocessing 6.39.5`** (pmndrs) | Tek `RenderPass`, ardından **tek birleşik `EffectPass`** (Bloom mipmapBlur, ToneMapping AGX veya NEUTRAL, Vignette, LUT, SMAA veya FXAA). `renderer.toneMapping = NoToneMapping`; ton eşleme EffectPass'in sonunda. v7 beta'yı **kullanma**: peer three <0.184. |
| Build | **Vite `8.3.3`** (Rolldown; ayarlar `build.rolldownOptions`) | `base: './'`, göreli yollar. |
| Dil | **TypeScript `7.0.2`** (native) | tsconfig: `target ES2022`, `module ESNext`, `moduleResolution bundler`. ES5, node10 ve `baseUrl` reddedilir. Bir araç TS7 ile kırılırsa `typescript@5.9.3`'e dön. |
| Fizik | **`@dimforge/rapier3d-deterministic-compat 0.21.0`** yalnızca gerçek rigid body gereken modlarda | WASM ~1.17 MB gz. Replay, hayalet ve ileride online için deterministic varyant. Lazy-load: yalnız o mod açılınca. cannon-es kullanma (2022'den beri bakımsız). |
| Doku | **KTX2 (Basis)**: npm `ktx2-encoder 0.6.0` + `sharp 0.35.5` (renk için ETC1S, normal ve kritik dokular için UASTC). Runtime: `KTX2Loader` + `detectSupport(renderer)` | Bu container'da GitHub release ikilileri (toktx, native gltfpack) **indirilemiyor (403)**. Node encoder'ı kullan. UI için WebP veya PNG. |
| Geometri | `@gltf-transform/cli 4.5.1` (`optimize --compress meshopt`), `gltfpack 1.3.0` (npm sürümünde BasisU yok, yalnız geometri için) | Runtime: `MeshoptDecoder` (`three/addons/libs/meshopt_decoder.module.js`). |
| Ses | Ham Web Audio (kendi mikser ve bus'ların) | howler 2023'ten beri güncellenmiyor. |
| Metin | DOM ve CSS UI (keskin, erişilebilir). 3D yazı gerekirse `troika-three-text 0.52.5` | |
| Test | Playwright (yerel `playwright-core`, Chromium `/opt/pw-browsers`), `pixelmatch 8.0.0` | §9. |

three r180–r186'da **değişenler**. Eski bilgiyle kod yazma:
- **Kaldırılanlar:**
  - UMD build ve `examples/js` yok. Yalnızca ESM ve `three/addons/...` var.
  - `outputEncoding` ve `sRGBEncoding` yok. Yerine `renderer.outputColorSpace` ve `texture.colorSpace = SRGBColorSpace` kullan.
  - `useLegacyLights` yok. Işıklar fiziksel birimlerde.
  - `PCFSoftShadowMap` kaldırıldı ve uyarı verip `PCFShadowMap`'e düşüyor. `PCFShadowMap` artık zaten yumuşak.
- **Yeniden adlandırılanlar:**
  - `RGBELoader` → `HDRLoader`.
  - `mergeBufferGeometries` → `mergeGeometries`.
  - `CapsuleGeometry(radius, height)`.
- **Yerine yenisi gelenler:**
  - `Clock` deprecated. Yerine `THREE.Timer` kullan.
  - `KTX2Loader.detectSupportAsync` yerine `detectSupport(renderer)` kullan.
- r186'da yeni: `three/addons/lights/SunLight.js`, cascaded gölge için.

### 4.2 Proje yapısı (`games/istaka/`)
```
games/istaka/
  package.json, package-lock.json, vite.config.ts, tsconfig.json
  src/
    main.ts                 # boot: loader → PerformanceDirector → menu
    core/                   # app state machine, events, time (fixed step), rng, save, i18n
    sim/                    # PURE deterministic gameplay simulation (no three.js, no DOM, no Math.random, no Date)
    render/                 # three.js scene, materials, post, cameras, VFX (reads sim state, never writes)
    perf/                   # PerformanceDirector, tiers, governor, budgets, benchmark
    input/                  # touch/gesture → commands
    audio/                  # mixer, buses, music system, sfx pool
    ui/                     # DOM UI, screens, HUD, share cards
    bridge/                 # GameBridge (§7)
    net/                    # NetAdapter interface + LocalAdapter ONLY (no networking)
    modes/<mode>/           # per-mode logic + content
    content/                # data (levels, AI profiles) as JSON/TS
    debug/                  # window.__game test API (§9), perf HUD (hidden)
  assets-src/               # generator scripts (Blender .py, node scripts), NOT raw downloads
  public/ or assets/        # shipped, compressed assets
  tools/                    # build/bake/encode scripts, asset manifest
  tests/                    # unit (sim), e2e (Playwright), visual, perf budgets
  docs/                     # GDD.md, ART_BIBLE.md, TECH.md, KARARLAR.md, INTEGRATION.md, CIHAZ_TEST_LISTESI.md, CREDITS.md
  dist/web/  dist/single/   # builds (§7)
```

### 4.3 Mimari ilkeler (online'a hazır, ama ağ kodu yok)
- **Sim ile render ayrı.**
  - `sim/` sabit adımla ilerler: varsayılan 60 Hz, oyun gerektirirse 120 Hz. Saf bir TypeScript modülüdür ve Node'da da koşar.
  - Render bu durumu interpolasyonla çizer.
  - Kademe (tier), FPS ve cihaz **oynanışı asla değiştirmez**. Aynı seed ve aynı girdi her cihazda ve her kademede aynı sonucu verir.
- **Rastgelelik:**
  - Yalnızca seed'li PRNG kullan (sfc32 veya xoshiro128**). Sim'de `Math.random`, `Date.now` ve `performance.now` yasak.
  - Görsel-yalnız rastgelelik (toz, kıvılcım) ayrı bir PRNG'den gelir ve sim'e dokunmaz.
- **Girdi = komut.** Oyuncu girdisi ve bot kararları `{tick, actorId, cmd, args}` komutlarına dönüşür.
  - Replay = seed + komut akışı.
  - Hayalet, günlük meydan okuma, paylaşım kodu, bug tekrarı ve otomatik testler aynı replay sisteminden çıkar.
- **Tick hash'i:** Her N tick'te durumun hash'ini al (ör. FNV-1a, quantize edilmiş alanlar üzerinden). Determinism testleri buna dayanır.
- **Ağ katmanı:**
  - `net/NetAdapter` arayüzü: `send(cmd)`, `onCommand`, `onSnapshot`, `now()`.
  - Tek implementasyon `LocalAdapter`. Botlar da komutlarını bu arayüzden gönderir.
  - Online geldiğinde LocalAdapter'ın yerine bir sunucu adaptörü takılır. Server-authoritative veya turn-based olabilir; seçim oyuna göre §4.G'de.
  - Hiçbir sunucu, socket veya hesap kodu yazma.
- **Veri güdümlü içerik:** Bölümler, rakipler, AI profilleri ve ayarlar veri dosyasında tutulur, kodda değil. Her veri dosyasının şema doğrulaması testte koşar.
- **Durum makinesi:** Boot → Yükleme → Menü → Mod → Oyun → Sonuç akışı açık bir FSM. `pause`, `resume`, `contextlost` ve `visibility` olayları her durumda tanımlı.
- **Kayıt:**
  - Versiyonlu şema (`save.v1`) ve migration fonksiyonları.
  - `ProfileStore` arayüzü: host delege ederse köprü üzerinden, etmezse `localStorage` yedeği.
  - Her yazma atomik (önce geçici anahtar, sonra değiştirme).

### 4.G Oyuna özel teknik tasarım

#### 4.G.1 Paket yapısı ve saflık kuralları
- `packages/sim-billiards/` (saf TS; DOM, three.js, `Math.random`, `Date`, `performance.now` YASAK) → `simMath.ts`, `roots.ts`, `motion.ts`, `events.ts`, `ballBall.ts`, `cushion/han2005.ts`, `cushion/mathavan2010.ref.ts` (yalnız testte), `cueStrike.ts`, `tableSpecs.ts`, `hash.ts`.
- `packages/rules/` → `eightBall.ts`, `threeCushion.ts`, `speedPool.ts`, `dailyShot.ts` (saf state machine).
- `packages/ai-billiards/` → Web Worker içinde çalışır, sim paketini import eder.
- `packages/sim-golf/` → Mini Golf fiziği (aynı saflık kuralları).
- `src/render/` → sim çıktısını yalnızca OYNATIR, asla değiştirmez.
- ESLint `no-restricted-properties` ile `sim-*` ve `rules` içinde `Math.sin/cos/tan/atan2/exp/log/pow/hypot/random` yasaklansın. Hepsi Node, Chromium ve WebKit'te birebir aynı çalışmalı.

#### 4.G.2 Bilardo fiziği: olay tabanlı (event-based) analitik simülasyon
Yaklaşım: Leckie & Greenspan (2005) ve pooltool çizgisi. Sabit zaman adımı YOK. Her top her an dört hareket durumundan birindedir. Durum içindeki hareket kapalı formdur, yani konum zamanın 2. derece polinomudur. İntegrasyon hatası oluşmaz, sonuç kare hızından bağımsızdır, slow-mo ve geri sarma bedavaya gelir.

Notasyon: z yukarı; R top yarıçapı; g = 9.81 m/s²; temas noktası hızı **u = v + R(ẑ × ω)**; û = u/|u|.

| Durum | Koşul | Hareket denklemleri | Durum süresi |
|---|---|---|---|
| Kayma (sliding) | \|u\| > ε | v(t)=v₀−μ_s g t û₀ · ω_xy(t)=ω_xy0+(5μ_s g/2R) t (ẑ×û₀) · r(t)=r₀+v₀t−½μ_s g t² û₀ | τ_s = 2\|u₀\|/(7μ_s g) |
| Yuvarlanma (rolling) | u=0, \|v\|>0 | v(t)=v₀−μ_r g t v̂₀ · ω_xy=(ẑ×v)/R · r(t)=r₀+v₀t−½μ_r g t² v̂₀ | τ_r = \|v₀\|/(μ_r g) |
| Dönme (spinning) | v=0, ω_z≠0 | ω_z(t)=ω_z0−sgn(ω_z0)(5μ_sp g/2R) t | τ_sp = 2R\|ω_z0\|/(5μ_sp g) |
| Durgun | v=0, ω=0 | — | ∞ |

- ω_z her durumda aynı yasayla bağımsız söner (kayma ve yuvarlanma sırasında da).
- Kayma sırasında û sabittir: du/dt = −(7/2)μ_s g û. Bunu birim testle kanıtla: t=τ_s anında |u| < 1e-9.
- Merkezden ve spinsiz vuruşta yuvarlanmaya geçiş hızı tam olarak (5/7)v₀ olmalı.
- Masse ve swerve ayrı kod gerektirmez. Eğimli ıstakada ω, v'ye dik değildir; bu yüzden û₀ ∦ v₀ olur ve kayma fazında yörünge kendiliğinden parabol çizer.
- Opsiyonel "havada" durumu yalnız Günün Vuruşu'nda, `jumpEnabled` bayrağıyla açılır: r(t)=r₀+v₀t−½g t² ẑ, masaya iniş olayında e_t≈0.5. Zaman yetmezse Günün Vuruşu bulmacalarının hiçbiri zıplama gerektirmesin.

**Olay döngüsü:**
```
while (hareketli top var && olaySayısı < 5000):
  aday olaylar: geçişler (slide→roll, roll→spin|stop, spin→stop),
                top–top, top–bant(doğru), top–çene ucu(nokta/yay), top–düşüş çizgisi(cep)
  en erken olayı seç → sıralama anahtarı (t, tipÖnceliği, minId, maxId)
  tüm topları t'ye ANALİTİK ilerlet → olayı çöz → etkilenen topların durumunu yeniden sınıfla
  önbellek: yalnız etkilenen topları içeren çift/bant olaylarını yeniden hesapla
```
- Heap kullanma. 16 top, 120 çift ve yaklaşık 30 bant/çene elemanı için düz dizi taraması hem deterministik hem yeterince hızlı.
- Broad-phase: her topun mevcut segmenti için swept AABB hesapla (quadratic'in [t0,t1] aralığındaki min/max'ı). AABB'si kesişmeyen çiftlerin kökünü hiç arama.
- Hedefler (Mi 9T, Worker içinde): açılış vuruşu ≤ 15 ms; ortalama vuruş ≤ 3 ms; AI ön-eleme simülasyonu ≤ 0.5 ms.

#### 4.G.3 Kök bulma ve sayısal sağlamlık
- **Top–top:** Δr(t)=At²+Bt+C (iki topun quadratic farkı). f(t)=|Δr|²−(2R)² = a₄t⁴+a₃t³+a₂t²+a₁t+a₀; burada a₄=A·A, a₃=2A·B, a₂=B·B+2A·C, a₁=2B·C, a₀=C·C−4R².
- **Top–doğru bant:** n·r(t)−(d+R)=0 → quadratic. Temas noktası segmentin içinde mi diye ayrıca kontrol et.
- **Top–nokta veya yay (çene ucu, bant ucu):** |r(t)−p|²−(R+ρ)² → quartic. İçbükey yayda (ρ−R) kullan.
- **Düşüş çizgisi (cep rafı kenarı):** top MERKEZİ çizgiyi geçince düşer → quadratic.
- **Çözücü (Ferrari kapalı formunu KULLANMA):**
  1. Katsayıları max|aᵢ| ile normalize et. |a₄| < 1e-14 ise dereceyi düşür.
  2. Türevin köklerini özyinelemeli bul (kübik → quadratic → lineer). Bu kritik noktalar [t_now, t_end] aralığını monoton parçalara böler.
  3. f'in **+ → − geçiş** yaptığı İLK parçayı seç; bu, yaklaşan temastır. Teğet dokunuşlarda (çift kök, f negatife inmiyor) çarpışma yoktur, normal hız sıfırdır.
  4. Parça içinde güvenceli Newton + bisection uygula: en fazla 64 iterasyon, |Δt| < 1e-12 s'de dur. Yalnız + − × ÷ kullan, böylece deterministik kalır.
  5. Kökte yaklaşma koşulunu doğrula: d/dt f < 0.
- t_end = min(iki topun sonraki durum geçişi). Kök aramak için segmentlerin sınırını asla aşma.
- **Örtüşme koruması:** olay anında |Δr| < 2R−1e-9 ise normal boyunca deterministik olarak ayır. Bunu sayaçla logla; golden suite'te sayaç 0 olmalı.
- **Sıfır-zaman zinciri:** donmuş (temas eden) toplar art arda t≈0 olayları üretir. Yaklaşma koşulu sayesinde sırayla çözülürler. Art arda 64 sıfır-zaman olayında `kilit` uyarısı ver ve 1e-7 m ayır. Testte bu 0 kez görülmeli.
- **Raf (rack):** toplar arasına seed'li 0.05–0.3 mm boşluk koy. Mükemmel temas yoktur, eşzamanlı çok-cisim çarpışması oluşmaz ve her açılış farklı ama tekrar üretilebilir olur. Gerçek raflar da kusurludur.

#### 4.G.4 Çarpışma çözümleri
**Istaka vuruşu (anlık nokta modeli, Leckie & Greenspan / pooltool):**
- a: yatay ofset (sağ +), b: dikey ofset; |(a,b)| ≤ 0.5R (UI bu sınıra kenetler, miscue yok).
- c = √(R²−a²−b²), M: ıstaka kütlesi (tüm ıstakalarda aynı, çünkü kozmetik), I = (2/5)mR².
- Düz ıstaka (θ=0): F = 2mV₀ / (1 + m/M + 5(a²+b²)/(2R²)), v = (F/m)·nişan yönü, ω = (r_c × F·x̂)/I, r_c = −c x̂ − a(sağ) + b ẑ.
- Eğimli ıstaka (masse, zıplama) için pooltool'daki genel formülü port et. İşaret konvansiyonlarını FİZİKSEL testlerle kanıtla:
  - Üstten vuruş → ileri yuvarlanma (takip).
  - Alttan vuruş → düz tam vuruşta beyaz geri gelir.
  - Sağdan vuruş → düz banda gidip dönen top oyuncunun SAĞINA sekmeli.
- Squirt (beyaz sapması) tasarım kararıdır: tam yan ofsette en fazla ~1.2°, doğrusal. Kolay kılavuz çizgisi bunu otomatik telafi eder.

**Top–top (impuls + Coulomb sürtünmesi; throw kendiliğinden oluşur):**
- n̂ = (r₂−r₁)/|r₂−r₁|, v_n = (v₁−v₂)·n̂ > 0.
- Normal impuls: J_n = m(1+e_b)v_n/2.
- Temas noktası bağıl hızı (3B): w = (v₁+ω₁×Rn̂) − (v₂+ω₂×(−Rn̂)), w_t = w − (w·n̂)n̂.
- Eşit kürelerde teğet etkin kütle m/7'dir: J_t = min(μ_b·J_n, m|w_t|/7), yön ŵ_t.
- v₁ −= (J_n n̂ + J_t ŵ_t)/m; v₂ += aynısı. Her iki topta ω += (−R J_t (n̂ × ŵ_t))/I.
- Dikey hız bileşenini sıfırla (masa emer), dikey spin değişimini KORU. Böylece yuvarlanan beyaz, stun beyazdan daha az throw üretir.
- Kesme kaynaklı throw (cut-induced) w_t'nin öteleme kısmından, spin kaynaklı throw (collision/spin-induced) ω_z kısmından doğar. Ayrı hack yazma.
- μ_b: nominal 0.06. Önerilen hıza bağlı model (Alciatore TP A-14): μ(v_rel)=a+b·e^(−c·v_rel), a≈9.951e-3, b≈0.108, c≈1.088 s/m. Sabitleri kaynaktan doğrula.
- Çarpışma sonrası iki top da yeniden sınıflanır (genelde kayma).

**Top–bant (spin bağımlı):**
- Varsayılan model **Han 2005**: kapalı form ve impuls tabanlı. Temas noktası top merkezinin üstündedir: θ_c = asin(h/R − 1).
  - Pool: h ≈ 36.3 mm (D'nin %63.5'i) → θ_c ≈ 15.7°.
  - Carom: h ≈ 37 mm → θ_c ≈ 11.7°.
  - e_c ve μ_c ile iki rejim vardır: yapışma ve kayma. pooltool'daki `han_2005` çözümünü port et; sin/cos(θ_c) masa başına sabit olarak saklanır.
- Referans **Mathavan et al. 2010**: sıkışma ve geri dönme fazlarını, bant ve masa temaslarındaki kaymayla birlikte impuls üzerinden sayısal integre eder. Yalnız Node testinde çalışır ve sabit 5000 adım kullanır.
- **Kalibrasyon:**
  - Izgara: geliş açısı 10°–80° (10° adım), hız 0.5–4 m/s, yan spin −0.5R…+0.5R.
  - Han'ın (e_c, μ_c) değerlerini bu ızgarada Mathavan'a göre ayarla.
  - Hedef: çıkış açısı farkında ortalama ≤ 2°, en fazla ≤ 5°.
  - Tutmazsa yalnız Üç Bant için Mathavan'ı oyunda kullan (3 top olduğu için maliyet kabul edilebilir).
- Üç Bant'ın ruhu "running/reverse english"tir. Sağ spinle sağa açılan rebound testlerle kanıtlanmalı.

**Cep ve çene (rattle'lı):**
- Her çene şu parçalardan oluşur:
  - yüz segmenti (doğru),
  - uç yayı (ρ_j = 4–8 mm, ayarlanabilir),
  - bant ucu,
  - düşüş çizgisi (raf kenarı).
- Malzeme: e_j 0.6–0.75, μ_j ≈ 0.2. Han modeli çene yüksekliğiyle uygulanır.
- `pocket` olayı: top merkezi düşüş çizgisini içe doğru geçince tetiklenir. Top sim'den çıkar (`state=pocketed`); düşüş, oluk ve ağ animasyonu render tarafında scriptlidir.
- Cep arka duvarından geri sekme bilinçli olarak modellenmez.
- **"Kıl payı" bayrağı** (Yönetmen'e gider), şunlardan biri olursa:
  - aynı topta 0.25 s içinde ≥2 çene olayı,
  - çene olayından sonra 0.15 s içinde cebe girme,
  - top cep ağzından ≤2 mm geçip girmeme (en yakın mesafe segment başına analitik hesaplanır).

#### 4.G.5 Parametre tablosu (başlangıç; referanslarla doğrula)
| Parametre | Pool (8-Top) | Carom (Üç Bant) | Not |
|---|---|---|---|
| Top kütlesi m | 0.170 kg | 0.210 kg | carom 205–220 g; doğrula |
| Top yarıçapı R | 28.575 mm | 30.75 mm | |
| Oyun alanı | 2.540×1.270 m (9 ft); Hızlı Bilardo ön ayarı 1.981×0.991 m (7 ft) | 2.84×1.42 m, cepsiz | GDD hangi modda hangi ön ayar olacağını seçer |
| μ_s (kayma) | 0.20 | 0.20 | 0.15–0.25 bandı |
| μ_r (yuvarlanma) | 0.010 | 0.008 | ısıtmalı carom çuhası daha hızlıdır |
| μ_sp (spin) | 0.044 | 0.044 | bazı kodlar R ile ölçekler; doğrula |
| e_b (top–top) | 0.95 | 0.94 | |
| μ_b (top–top) | 0.06 veya hıza bağlı | aynı | |
| e_c (bant) | 0.80 | 0.85 | aralık 0.75–0.85+ |
| μ_c (bant) | 0.20 | 0.20 | 0.14–0.25; kalibrasyonla ayarla |
| h (bant temas yüksekliği) | 36.3 mm | 37 mm | |
| Köşe/yan cep ağzı | 114 / 129 mm | — | WPA aralığına yakın; doğrula |
| Çene yüz açısı köşe/yan | 142° / 104° | — | doğrula |
| Raf derinliği köşe/yan | 40 / 6 mm | — | |
| Istaka kütlesi M | 0.54 kg | 0.50 kg | |
| V₀ aralığı | 0.3–9.0 m/s | 0.3–7.0 m/s | güç eğrisi GDD'de |

**Fiziksel kalibrasyon kontrolleri** (hepsi 9.G'de otomatik testtir):
- Stop shot: düz tam vuruşta stun beyaz durur (<1 cm/s).
- 90° kuralı: stun beyazla kesmede ayrılma açısı 90° ± 3°.
- 30° kuralı: yuvarlanan beyazla ¼–¾ kalınlıkta sapma 30° ± 4°.
- Yuvarlanma mesafesi = v²/(2μ_r g).
- Throw: yarım top stun ve ~1 m/s'de 2–6° (Alciatore grafikleriyle karşılaştır). Dişli (gearing) dış spinle ≈0°.
- Üç Bant elmas sistemi ("Corner-5" türü): orta hız ve running english'te 3. banda varış ±1 elmas.

#### 4.G.6 Determinizm, parmak izi, golden shot
- JS'te + − × ÷ işlemleri IEEE-754 double'dır ve motorlar arasında deterministiktir. `Math.sqrt` donanımda doğru yuvarlanır; bunu test vektörleriyle doğrula.
- Transandantal fonksiyonlar (sin, cos, exp, atan2, pow, hypot) "implementation-approximated"dir: V8 (Android) ve JavaScriptCore (iOS) farklı sonuç verebilir. Bu yüzden sim içinde `simMath` (fdlibm portu veya yalnız + − × ÷ kullanan minimax polinomlar) kullan.
- Sim'de Float32Array yok; Float64Array kullan.
- `sort` karşılaştırıcıları total ve açık tie-break'li olmalı. Nesne anahtarı sırasına güvenme.
- **ShotCommand (kuantize):**
  - `aimQ`: int, birim 2π/2²⁴
  - `powerQ`: 0..1023
  - `spinXQ`, `spinYQ`: −512..511 (×0.5R/512)
  - `elevQ`: 0..850 (0.1°)
  - opsiyonel `placeQ` (0.1 mm ızgarada serbest top), `calledPocket` (0..5), `tMs` (Hızlı Bilardo)
  - Simülasyon yalnız kuantize değerlerden kurulur.
- **Shot fingerprint:**
  - Komut int'leri,
  - olay listesi (tip, id'ler, t'nin 1e-9 s kuantizasyonu),
  - final konumlar (1e-7 m kuantize).
  - Bunlar üzerinde 2×32-bit FNV-1a (BigInt'siz) hesaplanır. Replay dosyası hash taşır; yeniden simülasyonda eşleşmezse "replay bozuk" uyarısı çıkar.
- **Golden Shot suite:** `tests/golden/*.json` altında ≥200 vuruş. Kategoriler:
  - açılış ×20 seed
  - stop/draw/follow
  - kesme 15–75°
  - bank, kick, kombine
  - çene rattle
  - masse
  - Üç Bant sistem vuruşları ×40
  - Mini Golf vuruşları ×90 (delik başına 5)
- Her biri beklenen hash ve ana metriklerle saklanır. `npm run golden` Node + Playwright Chromium + WebKit'te koşar.
- Güncelleme yalnız `golden:update` ile yapılır. Bu komut eski/yeni yörünge overlay PNG'leriyle bir fark raporu üretir; fizik sabiti değişikliği bu rapor olmadan merge edilmez.

#### 4.G.7 Oynatma, kamera ve ses entegrasyonu
- Sim çıktısı top başına segment listesidir (`t0, t1, state, r0, v0, acc, ω0, ωdot`). Render, herhangi bir t için segmenti ikili aramayla bulur ve polinomu tam değerlendirir. Slow-mo, scrub ve rewind kayıpsızdır.
- Top yönelimi (numaraların dönüşü) yalnız render içindir: analitik ω(t)'den sabit 1/480 s alt adımlarla quaternion integrasyonu. Her replay'de aynı sonucu verir; hash'e girmez.
- **Vuruş akışı:**
  - Bırakınca komut Worker'a gider.
  - Istakanın ileri hareketi (130 ms) hesaplamayı gizler.
  - Sonuç gelmediyse temas karesinde beklenir; asla takılma görünmez.
  - Main-thread yedeği: time-sliced çözüm.
- **Yönetmen**, olay listesini oynatmadan ÖNCE bilir ve kamera planını önceden kurar:
  - Cebe gidecek obje topunu, pocket olayından 0.8 s önce alçak takip kamerasıyla izler.
  - Kıl payında t_jaw1−0.2 s ile t_pocket+0.3 s arası 0.3× slow-mo yapar.
  - Son top girişinde zafer "money shot" çekimi yapar.
- **Ses:** her çarpışma olayı `AudioContext.currentTime + t/timeScale` anına örnek-hassas planlanır. Şiddet olaydaki normal hıza, panning topun masadaki x konumuna bağlıdır.

#### 4.G.8 Masa verisi (TableSpec)
```json
{ "id":"pool9", "type":"pool", "play":[2.54,1.27], "ball":{"R":0.028575,"m":0.17},
  "cloth":{"muS":0.2,"muR":0.01,"muSp":0.044}, "ballBall":{"e":0.95,"mu":{"model":"alciatore","a":0.009951,"b":0.108,"c":1.088}},
  "cushion":{"model":"han2005","h":0.0363,"e":0.80,"mu":0.20},
  "pockets":[{"kind":"corner","mouth":0.114,"jawDeg":142,"jawR":0.006,"shelf":0.040,"jaw":{"e":0.7,"mu":0.2}}, "..."],
  "rack":{"pattern":"8ball","gapMm":[0.05,0.3]}, "spots":{"head":[0.635,0.635],"foot":[1.905,0.635]} }
```
Bant, çene ve düşüş geometrisi bu spec'ten kodla üretilir. Render mesh'i aynı spec'ten Blender'da üretilir; böylece görsel ve fizik ≤0.5 mm uyumlu olur ve bu bir testtir.

#### 4.G.9 Kural motorları (saf state machine)
```ts
interface RuleEngine<S> {
  init(cfg: ModeCfg, seed: number): S;
  cueBallFor(s: S): BallId;  ballInHand(s: S): Region | null;
  applyShot(s: S, cmd: ShotCommand, log: ShotEventLog): { next: S; outcome: Outcome; reasons: ReasonCode[] };
}
```
Her karar bir `ReasonCode` üretir. UI bunu kısa Türkçe metne çevirir: "Faul: beyaz cebe girdi → rakibe serbest top".

**8-Top (WPA benzeri, basitleştirilmiş):**
- Durumlar: `BREAK → OPEN → GROUPS → ON_EIGHT → OVER`.
- **Yasal açılış:** ≥1 top cebe girmeli veya ≥4 obje topu banda değmeli. Aksi halde rakip yeniden dizer ve kendisi açar.
- **8 açılışta girerse:** foot spot'a konur, oyun sürer. Beyaz da girdiyse rakibe serbest top verilir.
- **Fauller:**
  - F1 beyaz cebe girdi,
  - F2 hiçbir topa değmedi,
  - F3 yanlış ilk temas (gruplar belliyse kendi grubu değil; açık masada 8 numara),
  - F4 temastan sonra hiçbir top banda değmedi ve cebe giren olmadı,
  - F5 geçersiz serbest top yerleşimi (UI zaten engeller, motor da doğrular).
- **Faul cezası:** rakibe masada her yere serbest top.
- **Grup:** açık masada (açılış hariç) yasal vuruşta İLK cebe giren topun grubu atanır (olay sırasına göre).
- **8 numara:** cep çağrılır (UI nişandan otomatik önerir, dokunarak değiştirilir).
  - Grup bitmeden 8 girerse kaybeder.
  - Yanlış cebe girerse kaybeder.
  - Faulle girerse kaybeder.
- **Sıra:** yasal vuruşta kendi grubundan ≥1 top girdiyse oyuncu devam eder.
- Pass-and-play aynı motoru kullanır.

**Üç Bant:**
- Her oyuncunun kendi isteka topu vardır (beyaz/sarı); kırmızı ortaktır.
- **Sayı koşulu:** isteka topu iki obje topuna da değer VE ikinci obje topuna ilk temastan ÖNCE isteka topunun bant temas sayısı ≥3 olur.
  - Aynı bant iki kez sayılır.
  - Bant önce (bricole) vuruşlar geçerlidir.
  - Obje topları arası öpüşme serbesttir.
- Sayı → devam; ıska → sıra geçer.
- İstatistik: seri, genel ortalama (GA = sayı/istaka).
- **Akademi** drill'leri: layout + aynı değerlendirici + event log üzerinde ek predicate'ler (ör. "ilk temas kısa bant").

**Hızlı Bilardo:**
- 90 s sayaç ve komut damgası `tMs` (1 ms tick) komut akışındadır.
- Yeniden doğma noktaları `rng(seed, shotIndex)` ile seçilir ve örtüşme testinden geçer.
- Skor yeniden simülasyonla doğrulanabilir.
- Opsiyonel (GDD kararı): diğer toplar hareket ederken beyaz durduysa vurulabilir; sim durumu `tMs` anında dondurup vuruşu enjekte eder.

**Günün Vuruşu:**
- Gün numarası Europe/Istanbul gece yarısına göre hesaplanır ve küratörlü havuza indekslenir.
- Başarı: N vuruşta tüm hedef toplar, beyaz girmeden cebe girer.
- Yıldızlar kullanılan vuruş sayısına göre verilir.
- Havuz offline üretilir (bkz. 6.G); her bulmacanın çözümü saklanır ve CI'da yeniden oynatılır.

#### 4.G.10 Yapay zekâ
Akış Worker içinde koşar: **Üret → Simüle et → Değerlendir → Sağlamlaştır → Seç → İnsanlaştır.**

| Profil parametresi | Aralık | Etki |
|---|---|---|
| σ_aim | 0.05°–1.2° | nişan gürültüsü (Gauss, seed'li) |
| σ_power | %1–%8 | güç gürültüsü |
| σ_english | 0.02R–0.12R | spin gürültüsü |
| planDepth | 1–3 | pozisyon planlama derinliği |
| safetyBias | 0–1 | atak EV eşiği; altında savunma oynar |
| risk | 0–1 | P(pot) ile kazanç arasındaki ağırlık |
| pressure | 0–1 | maç topunda σ × (1+pressure) |
| simBudget | 300–4000 | karar başına simülasyon sayısı |

**Pool aday üretimi:**
- **Direkt:** her kendi topu × her cep için çalışır.
  - Hedef nokta = yaklaşma açısına göre efektif cep merkezi (uzak çeneye doğru ≤¼ ağız kaydır).
  - Hayalet top: G = P − 2R·d̂.
  - Koridor testleri (swept circle): beyaz→G ve P→cep yolları boş olmalı.
  - Kesme açısı ≤ 75°.
- **Bank:** cebin banda göre aynası. **Kick:** G'nin aynası. **Kombine:** 2'li zincir.
- **Throw ve squirt telafisi:** nişan açısında secant iterasyonu (2–3 simülasyon), böylece obje topu hedef noktadan geçer.
- **Varyantlar:** hız {0.35, 0.55, 0.8}×V_max × spin {stun, takip 0.3R, geri 0.3R, ±yan 0.3R} = 15.
- **Ön-eleme:** sim'i beyazın 2. temasına ve obje topunun cebe varışına kadar koş. Yalnız ilk 20 aday tam simüle edilir.

**Değerlendirme:**
- EV = P_pot·(1 + w_pos·Q_next) − P_foul·C_foul − (1−P_pot)·w_opp·Q_opp.
- P_pot: AI'nin KENDİ σ'larıyla K=6–16 gürültülü simülasyondan gelir (zayıf AI bu yüzden temkinli oynar).
- Q_next: beyazın final konumundan en iyi direkt atış kalitesi (mesafe, kesme açısı, engel; 0..1). planDepth 2–3'te en iyi 3 aday üzerinde özyineleme yapılır.
- Q_opp: bırakılan pozisyonda rakibin en iyi atışı.
- Atak EV < safetyBias eşiği ise savunma (safety) adayları seçilir: Q_opp'u minimize et.

**Determinizm:**
- Bütçe saatle değil SİMÜLASYON SAYISIYLA tanımlanır.
- RNG = hash(matchSeed, shotIndex, "ai").
- Duvar saati yalnız güvenlik tavanıdır: 4 s aşılırsa o ana kadarki en iyi seçilir ve telemetriye yazılır.
- Düşünme süresi rakibin "tell" animasyonlarıyla örtülür.
- **İnsanlaştırma:** seçilen atışa profil gürültüsü eklenir. Baskı katsayısı yalnız Kariyer'de ve maç topunda uygulanır.

**Üç Bant AI:**
- **(a) Önce top:**
  - Her obje topu için kalınlık {⅛…⅞} × {sol, sağ} = 14 nişan.
  - Hız {2.0, 2.8, 3.6, 4.5 m/s} × yan spin {−0.4R, 0, +0.4R} × dikey {−0.3R, 0, +0.3R}.
  - Bütçe dahilinde seed'li alt küme seçilir.
- **(b) Bant önce:** ayna yöntemi. Masayı bant dizileri boyunca ≤3 kez yansıt ve beyazdan 1. obje topu hayaletine düz çizgiler çiz (~40 tohum).
- **Sürekli amaç:** d_miss = 3. bant temasından sonra min|r_beyaz − r_top2| − 2R (sayıysa 0).
  - En iyi 8 near-miss adayını (nişan, hız, yan spin) üzerinde coordinate descent ile iyileştir (her biri ~20 simülasyon).
  - P(sayı) için K=8 gürültü örneği kullan.
  - Üst seviyede leave puanı "toplu pozisyon"dur (üç topun yayılımı küçük).
- **Savunma:** P(sayı) < 0.15 ise rakibin en iyi P'sini minimize eden vuruşu seç.
- **Kalibrasyon:** hedef p = GA/(1+GA). Akademi Hocası GA 0.4 (p≈0.29) → Final Üstadı GA 1.5 (p≈0.60).
- Oyuncu İpucu'su ve Akademi diyagramları aynı üreteci kullanır.

#### 4.G.11 MİNİ GOLF DİORAMA fiziği
- `GolfPhysics` arayüzü arkasında iki seçenek var. **Birincil:** özel deterministik swept-sphere (tek dinamik cisim olduğu için tam kontrol). **Yedek:** Rapier deterministic 0.21.0 (CCD açık). Birincil, M2 kilometre taşında 9.G testlerini geçmezse yedeğe geç.
- **Ölçek:** 1u = 1 m. Top R = 21.35 mm, m = 0.046 kg. Delikler 1.5–4.5 m. Cup yarıçapı 54 mm.
- **Zaman:** sabit adım 1/240 s; v_max = 3.5 m/s (adım başına 14.6 mm < R). Yine de her adımda swept test yapılır.
- **Zemin:** yalnız yuvarlanma modeli (spin durumu yok, bilinçli sadelik).
  - a = g_t − μ_rr·g·n_z·v̂; g_t = g − (g·n)n.
  - Dur koşulu: |v| < 0.015 m/s VE eğim tan < μ_rr·0.5.
- **Malzemeler:**

| Malzeme | μ_rr | e (çarpma) | μ_t |
|---|---|---|---|
| keçe çim | 0.065 | — | 0.10 |
| boyalı ahşap kenar | — | 0.70 | 0.08 |
| mantar | 0.12 | 0.40 | 0.20 |
| kâğıt / karton | 0.05 | 0.45 | 0.15 |
| kauçuk tampon | — | 0.85 | 0.10 |
| cetvel / kitap kapağı (hızlı) | 0.03 | 0.55 | 0.08 |

- **Statik çarpışma:** düzleştirilmiş Float64Array BVH ile üçgen mesh. Swept sphere ↔ yüz/kenar/köşe (Ericson, *Real-Time Collision Detection* §5.5).
  - İç kenar "ghost bump"larını önlemek için kenar bayraklarını önceden hesapla (konveks/düz). Düz iç kenar temaslarını yüz normaline çevir.
  - Eğrisel parçalarda (loop, eğimli viraj) barisentrik vertex normalini kullan (yüz normaliyle açı < 15° ise).
- **Tepki:** |v_n| > 0.08 m/s ise v_n' = −e·v_n, değilse v_n' = 0 (dinlenme teması). v_t' = v_t·max(0, 1 − μ_t(1+e)|v_n|/|v_t|).
- **Havada:** balistik hareket. Rampa ve atlamalarda iniş e = 0.35.
- **Hareketli engeller** (vapur, tren, tramvay, değirmen):
  - Kinematik ve deterministik zaman çizelgesi: pose(t) = periyot P ve faz φ'li anahtar kareler; simMath ile parçalı kübik Hermite.
  - Çarpışma primitifleri: kutu, kapsül, silindir, ≤32 köşeli konveks gövde. Engelin yerel uzayında BAĞIL hızla swept test yapılır; tepkiye engel nokta hızı eklenir (engel topu iter).
  - Sıkışma (ezilme) olursa top son durma noktasına döner, ceza yok.
- **Saat:** delik saati tick olarak delik başında başlar. Atış komutu `{tick, dirQ (2π/2¹⁶), powQ (0..1023)}` olarak kaydedilir; bırakma anındaki engel fazı birebir tekrar üretilir.
- **Cup yakalama (analitik, ayarlanabilir):**
  - Top merkezi cup dairesindeyken |v| ≤ v_cap ise yakalanır. v_cap merkezde 1.3 m/s'den kenarda 0.4 m/s'ye doğrusal düşer.
  - Hızlıysa "dudaktan dönüş": hız ×0.7, yön ofsete orantılı sapar.
- **Kural dışı durumlar:**
  - Saha dışı (hacim dışı veya masa yüksekliğinin altı): +1 vuruş, son dinlenme noktasına dön.
  - 20 s sim'de durmazsa zorla dur.
- **Loop doğrulaması:** tepe noktasında v ≥ √(g·r_loop) ise geçer. Her loop için minimum güç testte doğrulanır.
- **Çok oyuncu (2–4, pass-and-play):** sahnede yalnız aktif oyuncunun topu fiziklidir; diğerleri görsel işarettir (çarpışma yok). Online-sonra senkron sorunu oluşmaz.
- **HoleSpec:**
```json
{ "id":"mahalle-03", "par":3, "tee":[0,0,0.0], "cup":[2.6,0.9,0.0], "glb":"mahalle_03.glb",
  "colliders":{"COL_floor":"kece","COL_wall":"ahsap","COL_bumper":"kaucuk"},
  "obstacles":[{"type":"vapur","prim":"capsule","r":0.05,"len":0.32,
    "keys":[[0,[0.8,1.4,0]],[4.0,[2.2,1.4,0]]],"period":8.0,"phase":0.0,"loop":"pingpong"}],
  "oob":{"zMin":-0.05}, "stars":[3,2,1], "camIntro":"spline_intro", "aceAllowed":true }
```

#### 4.G.12 Online-sonra notları
- Bilardo tamamen sıra tabanlıdır. Mesaj = `ShotCommand` (~12 byte) + kural durumu hash'i. İki istemci de simüle eder.
- Sunucu otoriter olabilir: aynı paket Node'da yeniden simüle eder. Shot clock ve serbest top yerleşimi sunucuda doğrulanır.
- Istakalar kozmetiktir, denge sorunu doğmaz.
- Liderlik tabloları (Hızlı Bilardo, Günün Vuruşu, Hole-in-one): komut akışı yüklenir, sunucu yeniden simüle eder, skor ancak hash eşleşirse kabul edilir.
- Mini Golf: asenkron hayalet yarışı (tick+komut listesi). Canlı oyunda toplar etkileşmediği için senkron sorunu yoktur.
- NetAdapter komutları: `shot`, `placeCueBall`, `callPocket`, `concede`, `golfStroke`, `rematch`.

#### 4.G.13 Riskler ve önlemler
| Risk | Önlem |
|---|---|
| Quartic kökünde kaçan çarpışma (tünelleme) | İzolasyon tabanlı çözücü + swept AABB + 100k fuzz testi; "masa dışı top = 0" kapısı |
| iOS (JSC) ile Android (V8) arası determinizm farkı | `simMath` + lint yasağı + Playwright WebKit/Chromium hash karşılaştırması |
| Bant modelinde işaret hatası | Referanstan port + fiziksel yön testleri + Mathavan karşılaştırması |
| AI, Mi 9T'de yavaş | Simülasyon sayısıyla bütçe, ön-eleme, carom ucuz; düşünme animasyonu |
| Düşük'te ucuz görüntü | Baked ışık + analitik top gölgeleri + PMREM env (5.G) |
| Raf eşzamanlılığı | Seed'li mikro boşluklar |
| Mini Golf kenar takılması/tünelleme | Kenar bayrakları, swept test, delik başına 50k fuzz |
| CPU bake süresi | Küçük atlaslar, arka planda bake, AO yedek baker (6.G) |

---

## 5. Performans motoru ve grafik kademeleri (Mobile Legends disiplini)

Hedef: **Xiaomi Mi 9T** (Snapdragon 730, Adreno 618; en zayıf hedef), **iPhone 11** (A13), **iPhone 13** (A15) ve **Xiaomi 13** (Adreno 740, 120 Hz) cihazlarında **kare kaçırmadan 60 FPS**.

Kaba GPU gücü (GFXBench Manhattan 3.1 offscreen): Adreno 618 ≈ 30, A13 ≈ 106, A15 ≈ 132, Adreno 740 ≈ 205. Mi 9T, iPhone 11'in yaklaşık üçte biri. **Tasarım Mi 9T'ye göre yapılır, Ultra ise Xiaomi 13'ü sömürür.**

### 5.1 Mobile Legends dersleri (zorunlu teknikler)
- **Işık:**
  - Statik ışık **bake** edilir (lightmap, AO, vertex color).
  - En fazla 1 dinamik yönlü ışık.
  - Gölgeler: Düşük'te blob veya projeksiyon gölge; Orta ve üstünde yalnız kahraman objelerde gerçek gölge.
- **Draw call ve bellek:**
  - Draw call ekonomisi: instancing, merge, texture atlas, `BatchedMesh` / `WEBGL_multi_draw` (yaygın).
  - Obje havuzlama ile oyun sırasında sıfır `new`.
  - Kare başına sıfır allocation: typed array, pool, closure yok.
- **Detay yönetimi:**
  - LOD ve impostor.
  - Frustum ve mesafe culling.
  - Kamera ve görüş alanı tasarımla sınırlanır; uzak detay sis ve atmosfere gömülür.
- **Shader:**
  - Shader LOD: kademeye göre `#define` varyantları.
  - Overdraw kontrolü: büyük şeffaf yüzey yok, partiküller küçük ve sayılı, soft particle yalnız Yüksek ve üstünde.
- **Sanat yönetimi önce Düşük kademe için tasarlanır.** Güzellik pahalı efektten değil renk, ışık, kompozisyon ve sisten gelir. Düşük kademe "ucuz" değil, sade ve yine güzel görünür.

### 5.2 Kademeler: Otomatik (varsayılan) / Ultra / Yüksek / Orta / Düşük
Ayarlar ekranında: `Grafik: Otomatik (şu an: Yüksek) | Ultra | Yüksek | Orta | Düşük`. Ayrıca `FPS: 60 | 30 (Pil tasarrufu)` ve `Ultra 120 Hz` (yalnız Xiaomi 13 sınıfında görünür, varsayılan kapalı).

Ortak bütçe tablosu. Oyuna özel düğmeler §5.G'de; **oynanış her kademede aynı**.

| Ayar | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| Render çözünürlüğü (megapiksel, dinamik aralık) | 0.45–0.65 MP | 0.65–1.0 MP | 1.0–1.6 MP | 1.6–2.4 MP (≤ native) |
| DPR tavanı | 1.25 | 1.75 | 2.25 | 3 |
| Draw call (kare) | ≤ 80 | ≤ 140 | ≤ 220 | ≤ 300 |
| Üçgen (görünen) | ≤ 150k | ≤ 350k | ≤ 700k | ≤ 1.2M |
| Doku belleği (tahmin) | ≤ 96 MB | ≤ 160 MB | ≤ 256 MB | ≤ 320 MB |
| Gölge | Bake + blob | 1024, yalnız kahraman objeler | 2048 | 2048 + temas gölgesi veya `SunLight` cascade |
| Post | Composer **yok**; ton eşleme, renk derecelendirme ve vinyet malzeme shader'ında | 1 EffectPass: yarım çözünürlük bloom + LUT + vinyet + FXAA | + tam bloom + SMAA | + DOF (yalnız sinematik), hafif motion blur, gerekiyorsa SSAO; MSAA composer |
| Render target formatı | RGBA8 | HalfFloat | HalfFloat | HalfFloat |
| Anisotropi | 1 | 2 | 4 | 8 |
| Partikül tavanı (görsel) | 300 | 800 | 1500 | 3000 |
| JS bütçesi (kare, 4× CPU throttle altında) | ≤ 8 ms | ≤ 8 ms | ≤ 8 ms | ≤ 8 ms |

Bellek tavanları: JS heap ≤ 150 MB. Toplam süreç belleği Düşük'te ≤ 400 MB, Ultra'da ≤ 700 MB (iOS WebContent sınırı ~1.5 GB, 4 GB iPhone'larda daha düşük).

### 5.3 Otomatik kademe seçimi (`perf/PerformanceDirector`)
Amaç: telefon Yüksek'i kaldırıyorsa asla Düşük seçme; kasacaksa asla Yüksek seçme. Oyuncu ilk bakışta "telefonum kaldırmıyor" dememeli.

1. **Kayıtlı profil.** `perf.profile.v1` cihaz parmak izi için daha önce oturmuş bir "stabil kademe" kaydettiyse oradan başla. Parmak izi: GPU dizesi + ekran + UA major.
2. **Statik ön tahmin.** `WEBGL_debug_renderer_info` ile renderer dizesini al.
   - Android'de gerçek dize gelir. Regex tablosu:
     - Adreno 5xx, 610–616 → Düşük
     - Adreno 618–619 → Orta
     - Adreno 640–660 → Yüksek
     - Adreno 7xx–8xx → Ultra
     - Mali-G52/G57/G68 → Düşük/Orta
     - Mali-G7x eski → Orta
     - Mali-G710+ / Immortalis → Yüksek/Ultra
     - Xclipse → Yüksek
     - PowerVR → Düşük
   - iOS'ta dize "Apple GPU" olarak maskelidir. Ekran boyutu, DPR, `hardwareConcurrency`, `MAX_TEXTURE_SIZE` ve aşağıdaki benchmark birlikte kullanılır. A13 ve üstü varsayılan Yüksek; benchmark Ultra'ya çıkarabilir.
   - Bilinmeyen GPU → Orta.
3. **Mikro benchmark** (yükleme ekranında, ≤ 1.5 sn, kullanıcı fark etmez).
   - Gerçek oyunun en ağır sahnesinden bir "benchmark vinyeti" alınır: aynı shader'lar ve aynı post. Aday kademenin çözünürlüğünde offscreen olarak N kare çizilir.
   - Süre, kareyi 1 piksellik `readPixels` ile senkronlayarak ölçülür. Mobilde GPU timer query yok: `EXT_disjoint_timer_query` ~%0.2.
   - Tahmini kare süresi ≤ 11 ms olan **en yüksek** kademe seçilir. Termal ve arka plan payı için 16.6 ms'nin altında kalınır.
   - Benchmark shader derlemesini de ısıtır; ikisi aynı adımdır.
4. **Çalışma zamanı yöneticisi (governor).**
   - Kare sürelerinin kayan pencere p50 ve p90 değerlerini izle.
   - **Önce dinamik çözünürlük:** kademenin MP aralığında sürekli ve yumuşak. Adım ≤ %5, en sık 500 ms'de bir.
   - **Kademe düşürme:**
     - Çözünürlük tabandayken p90 > 18.5 ms ve bu 3 sn sürerse, bir sonraki doğal molada (tur sonu, menü, yeniden başlatma) bir kademe düşür.
     - p90 > 28 ms ve bu 2 sn sürerse hemen düşür, ama shader değiştirmeden önce çözünürlük ve partikül tavanıyla.
   - **Kademe yükseltme:** yalnız doğal molada; p90 < 10 ms ve bu 20 sn sürmeli, çözünürlük tavanda olmalı. Oturum başına en fazla 1 kez. Bir düşüşten sonra o oturumda yükseltme yok (salınım yasak).
   - **Termal sürüklenme:** 10+ dakikada medyan yavaşça yükselirse önce çözünürlük düşer, sonra partiküller. Oyuncu bunu fark etmemeli.
   - **iOS Düşük Güç Modu tuzağı:** rAF 30 FPS'e sabitlenir. Kare aralığı istikrarlı 33 ms ve CPU işi düşükse bu bir *kısıt*tır, performans sorunu değil. **Kademe düşürme.**
   - **Stabil kademe:** 3 dk düşüşsüz kalan kademe stabil sayılır ve profile kaydedilir.
5. **Manuel seçim.** Kullanıcı kademe seçerse governor kademeyi değiştirmez, yalnız o kademenin çözünürlük aralığında dinamik ölçekleme yapar. Uzun süre kötü performans görürse yalnızca nazik bir öneri gösterir ("Akıcılık için Orta önerilir"); kendi başına değiştirmez.
6. **Popping olmasın.** Shader, define ve gölge değişiklikleri yalnız doğal molada yapılır. Çözünürlük her an değişebilir. Partikül tavanı yumuşak değişir.

### 5.4 Kare zamanlaması
- **Sabit adımlı sim** (accumulator, en fazla 5 adım yakalama) ve render interpolasyonu.
- **120 Hz:** rAF 120 Hz'de geliyorsa (Xiaomi 13) render 60'a kilitlenir. Ölçülen yenileme hızına göre her 2. rAF çizilir, judder yok. "Ultra 120 Hz" açıksa her kare çizilir.
- **30 FPS (pil) modu:** 60 Hz ekranda her 2. kare çizilir, kare aralıkları eşit tutulur.
- **Arka plan:** `visibilitychange` gizli ya da host `pause` gelirse sim durur, AudioContext `suspend` olur, rAF durur. Dönüşte "Devam" katmanı gösterilir; oyuncu arka plandayken ölmez.

### 5.5 Takılma (hitch) kaynaklarını sıfırla
- **Shader:**
  - Android'de `KHR_parallel_shader_compile` neredeyse yok. Tüm program varyantlarını yüklemede derle: `renderer.compileAsync(scene, camera)` ve her kademe ile mod için ısıtma sahnesi.
  - Çalışma zamanında yeni materyal, ışık sayısı değişimi ya da define değişimi olmaz.
  - Toplam program sayısını sınırla ve testte say (ör. ≤ 40).
- **Doku:**
  - KTX2 transcoder worker'da çalışır.
  - Dokular yüklemede `renderer.initTexture` ile GPU'ya önceden yüklenir.
  - Mod geçişlerinde yükleme kare başına zaman bütçesiyle dağıtılır.
- **Ses:** Yüklemede decode edilir. Oyun sırasında `decodeAudioData` yok.
- **GC:** Sıcak döngülerde allocation yok. Vektörler modül düzeyinde ön-ayrılır. Testte heap örneklemesiyle doğrulanır.
- **Hassasiyet:** Adreno'da `mediump` gerçek FP16'dır. Özel shader'larda **highp** kullan. Zaman uniform'unu periyodik sar (wrap). Büyük dünya koordinatlarında kamera-göreli konum kullan. SwiftShader bu hataları göstermez; kod incelemesinde kontrol et.
- **WebGL context kaybı:**
  - `webglcontextlost` olayında `preventDefault`.
  - `webglcontextrestored` olayında tüm GPU kaynaklarını yeniden kur.
  - `WEBGL_lose_context` ile testte zorla.
- **Bellek:** Mod değişiminde kullanılmayan geometri, doku ve render target `dispose`. `renderer.info.memory` sayıları testte sabit kalmalı.

### 5.6 Gizli performans paneli
Ayarlar'da sürüm yazısına 5 kez dokununca açılır. Gösterdikleri: FPS, p50/p90, kademe, render MP, draw call, üçgen, program sayısı, doku belleği tahmini, JS heap. Host köprüsüne `perf` olayı olarak da raporlanabilir.

### 5.G Oyuna özel performans bütçesi
Sahne küçük: bir masa ve bir oda. Bütçeyi ışık kalitesine harca. Fizik, kural ve AI her kademede birebir aynıdır; tablo yalnız görselliği değiştirir.

| Ayar | Ultra | Yüksek | Orta | Düşük |
|---|---|---|---|---|
| Top malzemesi | Physical, clearcoat 1.0 (cc rough 0.04), PMREM 256 + 3 RectAreaLight | Physical clearcoat + PMREM 256 + 1 RectArea | Physical clearcoat + PMREM 128 (lamba env'de) | Standard (rough 0.08) + PMREM 128 + shader içi sahte clearcoat lobu |
| Çuha shader'ı | lightmap + sheen + detay normal + 16 top × 3 lamba analitik gölge/AO | 16×2 | 16×1 (birleşik lamba) + yakın mesafede detay | lightmap + 16 top analitik AO + tek blob gölge, sheen yok |
| Oda lightmap | 2048 | 2048 | 1024 | 512 (KTX2) |
| Dinamik shadow map | 1 spot 2048, PCF soft (ıstaka + toplar) | yok (analitik) | yok | yok |
| AA | MSAA 4× + SMAA | MSAA 2× + FXAA | FXAA | FXAA, render scale ≥0.8 |
| Bloom | mip bloom | mip bloom ½ | ¼ çözünürlük basit bloom | yok (lamba/neon için baked glow sprite) |
| DOF (sinematik kamera) | bokeh ½ çözünürlük | gaussian ½ | yok | yok |
| Duman / ışık huzmesi | 3 animasyonlu gürültü konisi | 2 | 1 statik | 1 statik gradient |
| Arena seyirci kartı (instanced) | 800 | 500 | 250 | 120 |
| Dekor prop yoğunluğu | %100 | %85 | %65 | %45 (oyun alanı dışı) |
| Mini Golf tilt-shift | derinlik tabanlı bokeh ½ + bant maskesi | derinlik tabanlı gaussian ½ | ekran bandı gaussian ½ | bant gaussian ¼, 2×9-tap |
| Mini Golf gölge | directional 2048 PCF + baked | 1024 + baked | 1024, yalnız top/engel caster | baked + blob (top, engeller) |
| Mini Golf su (iskele) | normal map + env yansıma + kıyı köpüğü | aynısı, köpük yok | kayan normal map | kayan doku + baked parlama |
| Mini Golf partikül (yaprak, buhar, konfeti) | 300 | 200 | 100 | 50 |

**Sıcak noktalar ve önlemler (Mi 9T'de 60 fps):**
1. **Tam ekran çuha shader'ı (en büyük maliyet).** Analitik gölge döngüsü uniform sayılarla açılır. Topa uzaklık > 4R ise erken çıkılır. Düşük'te 16 değerlendirme yapılır. Sheen ve detay yalnız ekran payı yüksekse açılır. Bunu 1080p ve 0.8 scale'de GPU zamanlayıcıyla ölç.
2. **Post zinciri.** postprocessing tek `EffectPass`'te birleştirilir (tone mapping AgX + LUT + vinyet + grain tek pass). Düşük'te ≤2 tam ekran pass olmalı.
3. **Shader derleme takılması.** Salon yüklenirken bütün malzemeler `renderer.compileAsync` ile ısıtılır. Mini Golf'ta her delik değişiminden önce bir ısınma karesi çizilir.
4. **Boşta render.** Hiçbir şey hareket etmiyorsa ve girdi yoksa render-on-demand'e geç. Nişan alırken yalnız girdi değişince çiz (pil ve ısı kazancı).
5. **GC.** Oynatmada kare başına allocation yok. Segmentler ve matrisler önceden ayrılmış Float64Array/Float32Array'lerde tutulur.
6. **AI Worker.** Ana thread'i asla bloklamaz. Düşünürken render 60 fps kalır, sahne neredeyse statik olduğu için GPU yükü düşüktür.
7. **Draw call.** Salon statik geometrisi malzeme başına merge edilir (≤40 call). 16 top tek InstancedMesh + numara atlası ile çizilir. Mini Golf deliği atlas + merge ile ≤60 call'a iner.
8. **Kıl payı slow-mo ve zafer çekimi.** Burada da 60 fps korunur. DOF yalnız Yüksek ve üstünde açılır. 30 fps kilidi KULLANILMAZ.

---

## 6. Asset üretim hattı ve lisans

### 6.1 Ortam kurulumu (F0'da doğrula, sonuçları `docs/KARARLAR.md`'ye yaz)
Bu container'da ağ açık. Doğrulananlar:
- **Erişilebilir:** npm, PyPI, `download.blender.org`, `api.polyhaven.com`, ambientCG, kenney.nl, quaternius.com, AWS Terrain Tiles (`s3.amazonaws.com/elevation-tiles-prod`), `raw.githubusercontent.com`, jsDelivr ve unpkg.
- **Engelli (403):** github.com release ikilileri. Native toktx, basisu ve gltfpack-native bu yüzden yok; yerine npm sürümleri kullanılır.
- **Hazır kurulu:** ffmpeg ve ImageMagick (`convert`).

Önerilen kurulum (her adımı dene; olmazsa yedeğe geç):
```bash
# Blender (headless; procedural modelleme, Cycles CPU ile AO/lightmap bake, GLB export)
#   LTS tercih: 4.5 LTS. Tam dosya adını dizinden oku:
curl -s https://download.blender.org/release/Blender4.5/ | grep -o 'blender-4\.5\.[0-9]*-linux-x64\.tar\.xz' | sort -V | tail -1
#   indir → games/istaka/.cache/ altına (gitignore) aç → ./blender -b --python-expr "import bpy; print(bpy.app.version_string)"
#   Kısıtlar: GPU yok (Cycles CPU; bake çözünürlüğünü ve sample'ı küçük tut), EEVEE headless çalışmayabilir.
# Node araçları (games/istaka içinde devDependency olarak, tam sürüm):
npm i -D -E @gltf-transform/cli@4.5.1 @gltf-transform/core@4.5.1 ktx2-encoder@0.6.0 sharp@0.35.5 pixelmatch@8.0.0
```
- KTX2 doğrulandı: 1024² boyutlu ETC1S + mip yaklaşık 5 sn sürüyor ve yaklaşık 170 KB tutuyor. UASTC yaklaşık 11 sn sürüyor ve yaklaşık 1.3 MB tutuyor.
- Encode'ları önbellekle (içerik hash'i ile) ve paralelleştir. Bir doku değişmediyse tekrar encode etme.
- Blender kurulamazsa yedek yol: three.js içinde procedural geometri, Node'da offline bake (kendi AO ray-caster'ın, `three-mesh-bvh` ile) ve headless Chromium'da GPU'suz render alıp sprite sheet veya flipbook üretmek.

### 6.2 Kaynaklar ve lisans (ticari uygulama)
- **Serbest:** CC0 (Poly Haven HDRI, doku ve model; ambientCG PBR dokular; Kenney; Quaternius), OFL (Google Fonts, Türkçe glif kontrolü şart: ğ ü ş ı İ ö ç), MIT ve Apache kod.
- **Atıfla serbest:** CC-BY. Örnek: AWS Terrain Tiles kaynak verileri (SRTM, Mapzen). Atfı `CREDITS.md`'ye ve oyunda "Hakkında" ekranına yaz.
- **Yasak:**
  - CC-BY-NC.
  - CC-BY-SA (asset olarak, tescilli uygulamada).
  - "Editorial use only" etiketli içerik.
  - Lisansı belirsiz veya marka içeren her şey (gerçek takım, marka, kişi, logo).
  - Login gerektiren kaynaklar (Sketchfab, Mixamo, Freesound API). Bunları kullanma.
- **Manifest:** Her teslim edilen dosya için `assets/manifest.json` kaydı tut: kaynak URL, lisans, değişiklik, üreten script. CI testi manifesti olmayan dosyayı reddeder.

### 6.3 Kalite kuralları (görsel tutarlılık)
- **Ölçek:** 1 birim = 1 metre.
- **PBR aralıkları:** Albedo sRGB yaklaşık 30–240; tamamen siyah ya da beyaz yok. Metal 0 ya da 1. Roughness dağılımı gerçekçi.
- **Dokular:** Texel yoğunluğu tutarlı. Bir sahnede 512 ile 4K dokular yan yana "bulanık ve keskin" karışımı yaratmasın.
- **Işık:** Her sahnede tek ışık hikâyesi; yön ve renk sıcaklığı bake'te ve gerçek zamanlıda aynı. HDRI ile güneş yönü eşleşir.
- **Stil:** Bir mod içinde stil karışmaz. Ana oyun gerçekçi, çizgi film modu baştan sona çizgi film.
- **Hero asset'ler:** Oyuncunun en çok baktığı şeyler (kahraman obje, ana yapılar, masa ve toplar…) özel üretilir. CC0 asset'ler ancak dönüştürülüp sanat yönetimine uydurularak kullanılır: renk derecelendirme, roughness ayarı, kir ve aşınma katmanı.
- **Sıkıştırma:** Bütün dokular mip'li KTX2. Bütün GLB'ler meshopt ile sıkıştırılmış.
- **Boyut:** İlk oynanabilir ana kadar indirme ≤ 10 MB (gzip). Toplam oyun ≤ 60 MB. Diğer modlar ve dünyalar lazy-load.

### 6.G Asset listesi ve üretim yöntemi
| Asset | Adet | Üretim | Kalite notu | Kademe varyantı |
|---|---|---|---|---|
| Pool masası 9 ft + 7 ft | 2 | `tools/blender/table_build.py` TableSpec'ten bmesh: bant profili, çene, deri cep, ağ, apron, ayak, pirinç elmaslar | Fizik geometrisiyle ≤0.5 mm uyum (test); 3 mm bevel; ahşap ambientCG CC0 | LOD0/LOD1 (sinematik uzak) |
| Carom masası (ısıtmalı, cepsiz) | 1 | Aynı script, `type:carom` | Elmas aralığı 35.5 cm doğru olmalı | aynı |
| Bilardo topları | 16 + 3 | Doku in-engine Canvas2D → build'de KTX2: numara dairesi, şerit, mikro çizik roughness | Ekvator seam'siz (equirect + kutup düzeltmesi); numara fontu §3'ten | 1024 / 512 / 512 / 256 |
| Istakalar (koleksiyon) | 24 | LatheGeometry profil üreteci + desen üreteci (geometrik geçme, çini esintili jenerik motifler) + CC0 ahşap | Gerçek oran 147 cm; ferrule ve uç tebeşir mavisi; görsel olarak hepsi farklı | 1024 / 512 doku |
| Çuha renkleri | 10 | Tek CC0 kumaş detay normali + renk/sheen parametreleri | Çuha aşınma maskesi (açılış bölgesi, baş çizgisi) | detay normal Düşük'te kapalı |
| Salonlar | 6 | `tools/blender/venue_build.py venue.json`: modüler duvar, kemer (Han), pencere + HDRI manzara (Yalı), neon tüp (emissive), güverte (Yat), tribün + spot (Arena); prop'lar Poly Haven CC0 (sandalye, raf, lamba, bitki, çay bardağı) | Marka, logo, gerçek poster yok; posterler prosedürel jenerik tipografi; alkol/sigara objesi yok | lightmap 2048/1024/512 |
| Lightmap + AO bake | 6 salon + 18 delik | Blender Cycles CPU bake (diffuse direct+indirect, OIDN denoise), 128–256 spp, arka planda paralel. Yedek: Node + three-mesh-bvh ile AO + tek sekme baker (paketi doğrula) | Bake'siz sahne ASLA ship edilmez; UV margin 4 px, seam kontrolü contact sheet'te | KTX2 UASTC (lightmap), ETC1S (albedo) |
| HDRI | 7 | Poly Haven CC0: 4 iç mekân, 1 gün batımı deniz, 1 gece şehir silueti, 1 stüdyo (golf) | PMREM'e ön filtrelenir; 1k/2k kaynak | 256/128 PMREM |
| Rakip portre kartları | 24 + 6 boss varyantı | `tools/portraits.ts` parametrik SVG: silüet, şapka, bıyık, gözlük, palet; duotone poster + grain | Gerçek kişi benzerliği YOK; stilize; 512² WebP/KTX2 | tek |
| Hayalet ıstaka (rakip) | 1 shader | Fresnel'li yarı saydam ıstaka + iz | Rakip ıstakasının desenini taşır | aynı |
| Mini Golf kit parçaları | ~40 | `tools/blender/golf_build.py recipe.json`: merkez çizgi parçaları (düz, viraj, rampa, loop, köprü, tünel, çatal), kesit ekstrüzyonu (keçe zemin + 3 cm boyalı ahşap kenar, bevel) + ayrı `COL_*` düşük poly çarpışma | Kenney Minigolf Kit (CC0; doğrula) yalnız referans/taban, malzeme diorama stiline çevrilir | LOD yok (küçük sahne) |
| Diorama prop'ları | ~60 | Blender script ile "oyuncak" stil: simitçi arabası, çay bahçesi, kediler (oyuncak figür), vapur, iskele, tramvay, kitaplar, kalemler, cetvel, çay bardağı, oyuncak tren, değirmen; Quaternius CC0 tabanlarına boyalı ahşap/kil malzeme override | Fırça dokusu prosedürel; bevel'ler el yapımı hissi verir; çay bardağı Ultra'da transmission, diğerlerinde env + fresnel | instancing |
| Delik tarifleri | 18 | JSON recipe (elle tasarım, 4.G.11 HoleSpec) | Her delik solver ile par doğrulanır | — |
| Günün Vuruşu havuzu | ≥400 | `tools/gen-daily.ts` (Node, aynı sim): rastgele dizilim → beam search çözücü (≤N vuruş) → çözüm oranına göre zorluk → JSON + gizli çözüm | Çözülemeyen veya çok kolay bulmaca elenir | — |
| Üç Bant Akademi | 30 drill | Elle JSON (dizilim + hedef predicate) + otomatik diyagram SVG (çözücü yolunu çizer) | Her drill'in çözücüyle ≥1 çözümü doğrulanır | — |
| VFX | 8 | Tebeşir tozu, cep tozu, "Ateş" alevi (stilize, flipbook 8×8), kâğıt konfeti, parıltı, buhar, yaprak, kamera flaşı | Flipbook'lar Blender'da render edilir veya prosedürel üretilir | partikül sayıları 5.G |
| UI ikonları | ~40 | Özel SVG (spin topu, güç, cep çağrısı, kılavuz, kamera) + Tabler Icons (MIT) | Tek çizgi kalınlığı | SVG |
| SFX | ~45 | Prosedürel Web Audio: top–top tık (modal 3–6 kHz, 15–40 ms decay, hıza bağlı), bant "tump" (80–200 Hz filtreli gürültü), çene tıkırtısı, cep düşüşü + oluk yuvarlanması, ıstaka vuruşu, tebeşir; CC0 kayıtlar (lisans dosya başına doğrulanır) ile katmanlama; golf: putter tık, keçe yuvarlanma (pitch ∝ hız), ahşap "bonk", cup "plonk", vapur düdüğü, oyuncak tren | Olay zamanına örnek-hassas planlama | aynı |
| Müzik | 6 salon + golf 2 | §2 yönüne göre prosedürel/CC0 | Dinamik katman (Kıl payında düşük geçiren filtre) | aynı |

---

## 7. Mobil uygulama entegrasyonu (3 oyunda birebir aynı sözleşme)

### 7.1 Çıktılar
- **`dist/web/`: birincil çıktı.**
  - Çok dosyalı, göreli yollu, hash'li asset'ler. Çalışma zamanında hiçbir CDN'e bağlı değil; tamamen offline çalışır.
  - Kullanım yolları:
    - (a) Herhangi bir statik HTTPS hosta koyup URL ile açmak. Tavsiye edilen yol budur.
    - (b) Uygulama paketine gömmek. Android'de `WebViewAssetLoader` ve `https://appassets.androidplatform.net`. iOS'ta `WKURLSchemeHandler` veya yerel sunucu. Flutter'da `InAppLocalhostServer`.
  - `file://` üzerinden fetch, WASM ve KTX2 sorunlu olabilir. Bu notu INTEGRATION.md'ye yaz.
- **`dist/single/istaka.html`: tek dosya** (`vite-plugin-singlefile 2.3.3`; WASM, KTX2 ve ses data URL olarak gömülü).
  - Toplam ≤ 25 MB ise **tüm oyunu** içerir.
  - Aşarsa ana mod ve en az bir ek mod tek dosyada olur; kalan paketler aynı klasördeki `packs/` altından yüklenir. Bunu INTEGRATION.md'de açıkça anlat.
  - Tek dosyanın `file://` üzerinden headless Chromium'da açılıp oynandığını testle kanıtla.
- **`dist/web/host-demo.html`:** Uygulama yerine geçen bir test sayfası. Oyunu iframe'de açar, köprü mesajlarını loglar, pause, resume, mute, dil ve kalite butonları vardır. Köprü e2e testleri bunu kullanır.

### 7.2 Köprü protokolü (`src/bridge/GameBridge.ts`)
**Zarf:** `{ "v": 1, "game": "istaka", "type": "<tip>", "id": "<opsiyonel istek id>", "payload": { ... } }` (JSON string).

**Oyun → host yönü, taşıyıcılar sırayla denenir:**
1. `window.ReactNativeWebView.postMessage`
2. `window.webkit.messageHandlers.gameBridge.postMessage`
3. `window.AndroidGameBridge.postMessage` (`@JavascriptInterface`)
4. `window.GameBridgeChannel.postMessage` (Flutter `JavaScriptChannel`, adı `GameBridgeChannel`)
5. `window.flutter_inappwebview.callHandler('gameBridge', …)`
6. `window.parent.postMessage` (iframe)

Hiçbiri yoksa standalone mod: köprü sessizce no-op olur ve oyun tarayıcıda tam oynanır.

**Host → oyun yönü:**
- `window.GameBridge.receive(jsonString)`, ve
- `window.addEventListener('message')` (iframe ve RN için).
- URL parametreleri de desteklenir: `?lang=tr&quality=auto&mode=<id>&muted=0&safeTop=..&safeBottom=..`.

**Oyun → host olayları:**

| Olay | Açıklama |
|---|---|
| `ready` | `{version, modes[], capabilities}` |
| `loading` | `{progress 0..1}` |
| `started` | `{mode}` |
| `ended` | `{mode, score, stars, durationSec, result}` |
| `haptic` | `{pattern: "light", "medium", "heavy", "success", "warning", "error" veya ms dizisi}` |
| `share` | `{text, imageDataUrl?, videoBlobUrl?, mimeType?}` |
| `analytics` | `{name, params}`. Üçüncü taraf SDK yok, olaylar yalnız host'a gider. |
| `storage:set` | `{key, value}` |
| `storage:get` | `{key, id}` |
| `exit` | Oyuncu oyundan çıkmak istedi. |
| `perf` | `{tier, fpsP50, fpsP90}` |
| `error` | `{message, fatal}` |

**Host → oyun komutları:**

| Komut | Açıklama |
|---|---|
| `pause`, `resume` | |
| `mute` | `{muted}` |
| `setLocale` | `{lang}` |
| `setSafeArea` | `{top, right, bottom, left}` |
| `setQuality` | `{tier: "auto", "ultra", "high", "medium" veya "low"}` |
| `storage:value` | `{id, value}` |
| `setProfile` | `{displayName?, avatarUrl?}` |
| `back` | Android geri tuşu. Oyun önce kendi katmanlarını kapatır; kapatacak bir şey yoksa `exit` gönderir. |

**Davranış kuralları:**
- **Haptik:** Host yoksa Android'de `navigator.vibrate`. iOS'ta host yoksa haptik yok.
- **Paylaşım:** Host yoksa Web Share API (dosya desteği varsa görüntüyle). O da yoksa panoya kopyala ve görseli indirme bağlantısı olarak sun.
- **Kayıt:** Host `storage` sağlarsa birincil kaynak odur; `localStorage` önbellek ve yedek olur.

### 7.3 WebView çalışma zamanı kuralları
- **Viewport ve dokunma:**
  - `viewport-fit=cover`.
  - `env(safe-area-inset-*)` ve host'tan gelen `setSafeArea`.
  - Pinch-zoom, double-tap zoom, uzun basma menüsü, metin seçimi ve overscroll kapalı: `touch-action: none`, `user-select: none`, `overscroll-behavior: none`, `-webkit-touch-callout: none`.
- **Ses:**
  - İlk dokunuşta AudioContext `resume` (unlock).
  - iOS kesintileri (`interrupted` durumu) ve sessiz anahtarı dikkate alınır.
  - Ses asla otomatik başlamaz.
- **Yaşam döngüsü:**
  - Arka plana geçince (`visibilitychange`, `pagehide`) ses ve sim durur.
  - WebGL context kaybından sonra oyun kaldığı yerden devam eder (§5.5).
- **Yön:**
  - Oyun her iki yönde de çalışır; tasarım önceliği §1'de belirtilen yön.
  - Yön kilidi host'un işidir. INTEGRATION.md'de öner.
- **Çıkış:** Oyunun kendi "Çıkış" butonu `exit` olayını gönderir.

### 7.4 `docs/INTEGRATION.md` (zorunlu teslim)
İçerecekleri:
- **Kurulum adımları ve kopyala-yapıştır kod:**
  - React Native (`react-native-webview`: `onMessage`, `injectJavaScript`, `allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction={false}`).
  - Flutter (`webview_flutter` JavaScriptChannel, ya da `flutter_inappwebview` ile `callHandler` ve localhost server).
  - Swift (`WKWebView`, `WKScriptMessageHandler`, `webViewWebContentProcessDidTerminate` sonrası yeniden yükleme, `allowsInlineMediaPlayback`, `mediaTypesRequiringUserActionForPlayback = []`).
  - Kotlin (`WebView`, `WebViewAssetLoader`, `addJavascriptInterface`, `evaluateJavascript`, donanım hızlandırma).
  - Web iframe.
- **Mesaj tablosu.**
- **Bilinen tuzaklar:** `file://`, bellek, ses unlock, 120 Hz, Düşük Güç Modu.
- **Boyut raporu.**
- **Haptik pattern'lerinin native karşılık önerileri:** iOS `UIImpactFeedbackGenerator`, Android `VibrationEffect`.

---

## 8. Ekip, ajanlar ve iş planı

### 8.1 Roller (alt ajanlar)
Ana ajan (sen) Yapımcı ve Teknik Direktör'dür: plan, kalite kapıları, entegrasyon, son kararlar. Alt ajanlar:

1. **Oyun Tasarımcısı:** `GDD.md`, denge tabloları, bölüm verileri, AI profilleri.
2. **Sanat Yönetmeni ve Teknik Sanatçı:** `ART_BIBLE.md`; shader, materyal, ışık, bake, VFX ve post. Görsel tutarlılığın sahibi.
3. **Motor ve Performans Mühendisi:** renderer, `PerformanceDirector`, asset hattı, bellek, yükleme.
4. **Gameplay Mühendisleri:** mod başına bir ajan. Paralel çalışırken **worktree izolasyonu** veya kesin ayrık klasörler.
5. **Ses Tasarımcısı:** SFX (procedural ve CC0), müzik sistemi, mikser, haptik pattern'leri.
6. **UI ve UX Tasarımcısı:** menüler, HUD, geçişler, tipografi, paylaşım kartları, FTUE.
7. **QA ve Otomasyon Mühendisi:** test harness'i (§9), botlar, görsel regresyon, bütçe testleri.
8. **Oyuncu Paneli:** 13–60 yaş personaları. Ekran görüntüsü, kontak sayfası ve akış kayıtları üzerinden eleştiri yapar.
9. **Kırmızı Takım (Red Team):** Her kapıda "bu milyon dolarlık stüdyo işi mi? Değilse tam olarak neden?" sorusuyla acımasız eleştiri. Kabul edilmeyen her eleştiri `KARARLAR.md`'de gerekçelendirilir.

### 8.2 Fazlar ve kalite kapıları (toplam ~4.5–5 saat)

| Faz | Süre | Çıktı | Kapı (geçmeden ilerleme) |
|---|---|---|---|
| F0 Kurulum | 15–20 dk | Klasör yapısı, pinli bağımlılıklar, araç doğrulaması (§6.1), boş sahne build, test iskeleti | `npm run build` ve `npm test` yeşil; Playwright ekran görüntüsü alınıyor |
| F1 Ön üretim | 25–35 dk | `GDD.md`, `ART_BIBLE.md`, `TECH.md`, asset listesi, bütçe tablosu, risk listesi | Kırmızı takım ve oyuncu paneli incelemesi; düzeltmeler işlendi |
| F2 Dikey dilim | 60–75 dk | Ana modun **1 bölümü uçtan uca**, hedef kalitede: yükleme → menü → oyun → sonuç → paylaşım; PerformanceDirector, köprü, kayıt ve QA harness çalışır | Kontak sayfası (2 yön × Düşük/Ultra) sanat yönetmeni ve panel onayından geçer; Düşük kademede bütçeler yeşil; determinism testi yeşil |
| F3 İçerik üretimi | 80–100 dk | Kalan bölümler, tüm modlar (bağımsız mod dahil), meta ilerleme, ses ve müzik, UI'ın tamamı; paralel ajanlarla | Her mod uçtan uca oynanır; mod başına otomatik e2e testi var |
| F4 Entegrasyon ve sağlamlaştırma | 35–45 dk | Tüm akışlar, ayarlar, köprü, iki build (web ve single), INTEGRATION.md, context kaybı, arka plan, yön değişimi | host-demo e2e yeşil; tek dosya `file://` testi yeşil |
| F5 QA döngüleri | 45–60 dk | §9 tam paket; görsel tutarlılık denetimi; 15 dk soak; bot oyunları; panel turları | **Kuru döngü:** art arda 2 turda yeni P0 ve P1 bulgusu yok |
| F6 Cila ve teslim | 20–30 dk | §10 cila listesi, final kontak sayfaları, tanıtım klipi, belgeler, push | §11 Bitti Tanımı'nın tamamı kanıtlı |

**Kurallar:**
- **Kapı başarısızsa** düzelt ve kapıyı yeniden koş. Kapıyı esnetme.
- **Bulgu önceliği:**
  - P0: çöküyor, oynanmıyor, veri kaybı.
  - P1: belirgin görsel veya performans kusuru, kafa karıştıran UX.
  - P2: cila.
  - P3: fikir.
  - P0 ve P1 kalırsa teslim yok.
- **Raporlama:** Her ajan işini bitirince değişen dosyaları, çalıştırdığı testleri ve kanıtları raporlar. Ana ajan raporu bağımsız bir denetçiye doğrulatır. "Yaptım" demek kanıt değildir.
- **Bağlam:** Uzun oturumda bağlam şişerse kararları `docs/` altındaki belgelere yaz ve oradan oku. Belgeler projenin hafızasıdır.

---

## 9. Test, QA ve görsel tutarlılık

### 9.1 Harness
- **Tarayıcı:** Playwright (`playwright-core`, yerel Chromium `/opt/pw-browsers/chromium-*/chrome-linux/chrome`). Bayraklar: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. WebGL2 çalışır; GPU yazılımsal olduğu için **FPS değerleri anlamsızdır**.
- **Sunucu:** Testler `vite preview` (http://localhost) üzerinden koşar. Tek dosya build'i ayrıca `file://` ile test edilir.
- **Cihaz profilleri** (`isMobile`, `hasTouch`), her biri dikey ve yatay:

| Profil | Viewport | DPR |
|---|---|---|
| iPhone 11 | 414×896 | 2 |
| iPhone 13 | 390×844 | 3 |
| Mi 9T | 393×851 | 2.75 |
| Xiaomi 13 | 393×873 | 2.75 (yaklaşık; doğrula) |
| Küçük | 360×640 | 2 |
| Tablet | 820×1180 | 2 |

### 9.2 Test API'si: `window.__game` (yalnız `?test=1` ile aktif)
| Fonksiyon | Ne yapar |
|---|---|
| `ready()` | Oyun hazır olunca çözülen Promise |
| `state()` | Serileştirilebilir özet |
| `hash()` | Sim durum hash'i |
| `goto(mode, level?, seed?)` | Belirli mod, bölüm ve seed'e git |
| `input(cmd)` | Komut enjekte et |
| `step(n)` | Sim'i deterministik n tick ilerlet; render bağımsız |
| `setTier(t)` | Kademe değiştir |
| `perf()` | `renderer.info` (draw call, üçgen, program, doku), doku belleği tahmini, partikül sayısı, JS heap |
| `freezeVisuals(true)` | Görsel rastgeleliği ve zamanı dondurur; ekran görüntüleri deterministik olur |
| `bot(policy)` | Otomatik oyuncuyu başlatır |

### 9.3 Test paketleri (`npm test` hepsini koşar; CI tarzı çıkış kodu)
1. **Birim (Node, saf `sim/`):**
   - Kurallar ve puanlama.
   - **Determinism:** aynı seed ve komutlar → 3 koşuda aynı hash. Aynı replay Düşük ve Ultra kademede aynı hash.
   - Replay ve meydan okuma kodlarının encode/decode gidiş-dönüşü.
   - Kayıt migration'ları.
2. **E2E akış:** Her mod için menüden başla, bot oynasın, sonuç ekranına ulaş, yeniden başlat. Ayrıca:
   - Ayarlarda her seçeneği değiştir, kalıcı mı bak.
   - Pause ve resume.
   - Arka plan simülasyonu (`visibilitychange`).
   - `WEBGL_lose_context` ile context kaybı ve geri dönüş.
   - Oyun sırasında yön değişimi.
   - Dil değişimi TR↔EN.
3. **UI fuzz:** Her ekranda görünen her butona rastgele sırayla 300 dokunuş. Konsol hatası, takılma ve ölü uç (dead end) olmamalı.
4. **Bütçe testleri.** Her mod ve bölümün en ağır anında, her kademe için:
   - Draw call, üçgen ve doku belleği §5.2 tablosunun ve §5.G'nin altında.
   - Program sayısı tavanın altında.
   - **4× CPU throttle** altında (`Emulation.setCPUThrottlingRate`) JS kare süresi p95 ≤ 8 ms. Mi 9T JS hızına kaba yaklaşım.
   - Long task (>50 ms) yalnızca yüklemede.
5. **Soak:** Ana modda bot 15 dakika oynar.
   - JS heap ve `renderer.info.memory` büyümesi ≤ %10.
   - Hata yok.
   - Kare sürelerinde yükselen trend yok (CPU tarafı).
6. **Köprü:** `host-demo.html` üzerinden tüm mesaj tipleri gidip gelir. Standalone modda hata yok.
7. **Build:**
   - `dist/web` boyut raporu ve ilk yük ≤ 10 MB.
   - Tek dosya `file://` ile açılır ve oynanır.
   - Çalışma zamanında harici ağ isteği yok: Playwright'ta tüm dış istekleri engelle, oyun yine çalışmalı.
8. **Görsel regresyon:** Donmuş görsellerle (`freezeVisuals`) referans kareler alınır. `pixelmatch` toleransı, SwiftShader gürültüsünü kaldıracak kadar.

### 9.4 Görsel QA döngüsü (göz ile, ajanlarla)
- **Her özellik ve her kapı için kontak sayfası üret:** tüm modlar × 2 yön × {Düşük, Ultra} × anahtar anlar. Etiketli olsun; ImageMagick `montage` veya Pillow ile.
- **Kim bakar:** Sanat yönetmeni ve oyuncu paneli ajanları görüntüleri **gerçekten açıp bakarak** (Read aracıyla) inceler.
- **Kontrol listesi:**
  - Işık yönü ve renk tutarlılığı.
  - Ölçek.
  - Texel yoğunluğu.
  - Z-fighting.
  - Gölge akne ve peter-panning.
  - Aliasing ve titreşen ince çizgiler.
  - Bloom patlaması, NaN kaynaklı siyah kareler.
  - LOD popping.
  - Doku gerilmesi ve dikişler.
  - UI'ın güvenli alan dışına taşması.
  - Türkçe karakterler (ğ, ü, ş, ı, İ, ö, ç).
  - Yazı taşması: DOM `getBoundingClientRect` ile otomatik kontrol.
  - Kontrast.
  - Dokunma hedefleri ≥ 44 pt.
  - Düşük kademe hâlâ güzel mi?
- **Otomatik görsel sağlık kontrolleri:** Kare çoğunlukla siyah veya beyaz değil; histogram makul; NaN veya siyah blok yok; UI elemanları ekranda.
- **Ritim:** Bulgular P0–P3 olarak listelenir → düzeltilir → tekrar bakılır. Art arda 2 turda yeni P0 ve P1 yoksa döngü biter.

### 9.5 Oyuncu paneli (persona ajanları)
| Persona | Yaş | Kim | Baktığı şey |
|---|---|---|---|
| Deniz | 13 | Sabırsız, TikTok kuşağı | 10 sn'de heyecanlandım mı? |
| Ece | 24 | Rekabetçi | Ustalık ve derinlik var mı? |
| Murat | 38 | Metroda 3 dakika oynayan | Hemen anladım mı, tekrar mı açarım? |
| Ayşe | 52 | Teknolojiye güveni düşük | Yazılar ve butonlar net mi, kayboldum mu? |
| Hasan | 60 | Büyük yazı, tek el | Kontrol rahat mı? |

Her persona tek tek cevaplar:
- Ne yapacağımı 10 saniyede anladım mı?
- "Bir daha" dedim mi?
- Bunu bir arkadaşıma gönderir miydim?
- Ucuz görünen bir şey var mı?
- Kafamı karıştıran bir şey var mı?

### 9.6 İnsan için cihaz test listesi (`docs/CIHAZ_TEST_LISTESI.md`)
Container'da ölçülemeyenler için madde madde, gerçek cihazda 15 dakikalık bir test protokolü yaz:
- Mi 9T, iPhone 11, iPhone 13 ve Xiaomi 13'te Otomatik kademenin seçtiği değer.
- 10 dakika sonra ısınma ve FPS.
- Düşük Güç Modu.
- Ses kesintisi (arama gelmesi).
- Arka plan ve geri dönüş.
- Bellek uyarısı.

Gizli performans panelinden okunacak değerleri de belirt.

### 9.G Oyuna özel test senaryoları
**Fizik birim testleri (Node, CI'da her commit'te):**
1. Merkezden stun vuruşta yuvarlanmaya geçişte |v| = (5/7)v₀ ± 1e-9 ve t = τ_s'de |u| < 1e-9.
2. Yuvarlanma mesafesi v²/(2μ_r g) ± 1e-6 m.
3. Stop shot: düz tam vuruş, stun → beyaz son hızı < 0.01 m/s.
4. 90° kuralı (stun): ayrılma açısı 90° ± 3° (kesme 15–60°).
5. 30° kuralı (yuvarlanan): ¼–¾ kalınlıkta 30° ± 4°.
6. Throw: yarım top, 1 m/s, stun → 2–6°; dişli dış spin → |throw| < 0.5°.
7. Yön testleri: sağ spin + düz bant → sağa sekme; alt vuruş + tam vuruş → beyaz geri döner; üst vuruş → takip.
8. Enerji: her olaydan sonra öteleme + dönme enerjisi ≤ öncesi + 1e-9 J.
9. Han ile Mathavan karşılaştırma ızgarası: ortalama |Δθ| ≤ 2°, en fazla ≤ 5°.
10. Kök çözücü: bilinen köklü 10k rastgele quartic → ilk + → − geçiş tam bulunur; teğet durumlar yok sayılır.

**Fuzz ve sağlamlık:**
- 100k seed'li rastgele vuruş (tüm spin, güç ve masa ön ayarları): 0 NaN, 0 masa dışı top (tünelleme), 0 örtüşme > 1e-9 m, 0 `kilit`, her vuruş < 5000 olay ve < 60 s sim.
- Golf: delik başına 50k rastgele atış → 0 duvar geçme, 0 sonsuz salınım, sıkışma resetleri < %0.1.

**Determinizm:**
- Golden suite hash'leri Node = Chromium = WebKit (Playwright).
- Kademe değiştirince hash değişmez (aynı vuruşu Ultra ve Düşük'te oynat, karşılaştır).
- Replay yeniden simülasyonu canlıyla birebir aynı olur.
- Ghost kodu encode → decode → aynı hash.
- Hızlı Bilardo komut akışı (`tMs` dahil) tekrar oynatıldığında aynı skor.
- Golf hareketli engel fazı: aynı tick'te bırakılan atış aynı sonucu verir; farklı tick'te farklı (engel gerçekten etkiliyor).

**Kural motoru (tablo tabanlı, event log fikstürleriyle):**
- 8-Top ≥40 senaryo: açılışta beyaz girer; açılışta 8 girer; açık masada 8 ilk temas; yanlış grup ilk temas; banda değmeme faulü; grup ataması (iki grup aynı vuruşta girer, ilk giren belirler); erken 8 = kayıp; 8 + beyaz = kayıp; yanlış cep = kayıp; serbest top örtüşme reddi; pass-and-play sıra değişimi.
- Üç Bant ≥30 senaryo: ikinci toptan önce 3 bant = sayı; 3. bant ikinci toptan sonra = sayı yok; bant önce (bricole) = sayı; aynı bant iki kez sayılır; tek topa değme = sayı yok; öpüşme serbest.
- Her karar doğru `ReasonCode` döner ve TR/EN metni mevcuttur.

**AI ve denge (Node, AI vs AI, seed'li):**
- 8-Top kazanma matrisi (her eşleşme 400 maç): her salonda rakip zorluğu monoton artar; boss, Salon 1 rakiplerini ≥%85 yener; Salon 6 boss'u Salon 5 boss'unu %55–70 yener.
- AI asla kuraldışı vuruş seçmez (10k kararda 0).
- safetyBias yüksek profillerde savunma oranı düşük profillere göre ≥3× olur.
- Karar başına simülasyon sayısı bütçeyi aşmaz. Mi 9T profilinde (CPU throttle 4×) karar ≤ 2.5 s.
- Üç Bant: her Üstat'ın ölçülen p değeri hedefin ± 0.05 içinde kalır (p = GA/(1+GA)).
- Hızlı Bilardo autoplay botu: skor dağılımı medyanı GDD hedefinin ±%15'inde; yeniden doğan top asla örtüşmez.
- Günün Vuruşu: havuzdaki her bulmacanın saklı çözümü replay ile başarı verir; gün indeksi tüm saat dilimlerinde Europe/Istanbul'a göre aynıdır.
- Golf: solver bot her delikte par veya altını bulur; `aceAllowed` deliklerde hole-in-one çözümü vardır; her loop için minimum güç atışı loop'u tamamlar.

**Görsel kontroller (Playwright + SwiftShader, piksel örnekleme):**
- Render edilen top sayısı ve konumları sim ile eşleşir: topun ekran izdüşümü ±1 px.
- Her topun altındaki çuha pikseli, 3R uzaktaki çuhadan ≥%25 daha karanlık (temas gölgesi var).
- Kıl payı slow-mo, olay listesinde bayrak varsa tetiklenir.
- Istaka kamerası near plane'i masayı veya topu asla kesmez (500 rastgele nişan).
- Top ekvatorunda seam yok (yakın çekim diff).
- Raf dizilişinde numaralar dik durur.
- Golf: tilt-shift bandı topun ekran y'sini ±%5 içinde ortalar; nişan ve güç göstergesi bulanıklaşmaz.
- Lightmap seam yok (salon başına 4 sabit açıda kenar tespiti).

**Mod bazlı contact sheet çekim listesi (her kademe × portre/yatay):**
- **8-Top:** açılış öncesi üstten görünüm, ıstaka kamerası nişan, açılış anı (t=0.05 s), Yönetmen takip kamerası, Kıl payı slow-mo karesi, zafer çekimi; 6 salonun her birinde boş masa establishing shot.
- **Üç Bant:** üstten sistem çizgisi, bant teması anı, sayı anı, Akademi diyagram ekranı.
- **Hızlı Bilardo:** "Ateş" aktif HUD, yeniden doğma anı.
- **Günün Vuruşu:** bulmaca açılış kartı, paylaşım kartı.
- **Mini Golf:** her deliğin intro flyover'ı (18), nişan, loop ortası, hareketli engel ile çarpışma anı, cup düşüşü, hole-in-one konfetisi, 4 oyunculu skor kartı.

---

## 10. Cila listesi (vakit kalırsa, öncelik sırasıyla)
1. Top–top tık sesinin modal sentezini hız, kalınlık ve masa konumu panning'ine göre ince ayarla. Bu imza sestir.
2. Yönetmen sinematik açıları: alçak takip, cebe girişte rack focus, zafer çekiminde yavaş dolly. Hareket bulantısı sınırlarına uy.
3. Tebeşir: ıstaka ucunda tebeşir azalması, beyazın vuruş noktasında birkaç vuruş kalan mavi tebeşir izi (decal).
4. Cep düşüşü: oluk boyunca yuvarlanma sesi ve görünür top dönüşü. Kariyer'de cebe girenler rafta sıralanır.
5. Kıl payı anında müzikte low-pass ve kalp atışı katmanı (baskı sistemi açıkken).
6. Çuhada aşınma: açılış bölgesi, baş çizgisi ve topların kalıcı olmayan hafif yol izleri.
7. Kadıköy'de lamba huzmesinde toz zerreleri; Yalı'da cam yansımalarında deniz ışığı kıpırtısı.
8. Yat: kamerada ve ışıkta ±%3 parlaklık ve ±2° gölge yönü salınımı (fizik ASLA etkilenmez).
9. Arena: sayıda seyirci susması, zaferde flaş patlamaları (yalnız görsel).
10. Mini Golf: vuruşta tilt-shift focus pull, oyuncak figürlerde idle animasyon (kedi kuyruğu, simitçi sallanması, değirmen gıcırtısı).
11. Hole-in-one'da kâğıt konfeti ve oyuncak kalabalık alkışı; paylaşım klibi otomatik.
12. Photo mode: f-stop, tilt-shift gücü, kamera roll, çuha rengi önizleme.
13. Kolay kılavuzda temastan sonraki beyaz yolunun 2 segmentlik fiziksel önizlemesi (yalnız Kolay).
14. Highlight klip seçici: en uzun bank, Kıl payı veya en çok bantlı Üç Bant sayısı.
15. Ultra'da cilalı ahşap bantlarda topların yumuşak yansıması (planar, ½ çözünürlük).
16. Golfte çay bardağında kostik benzeri parıltı spritelar ve buhar.
17. Spin seçicide fiziksel doğru "beyaz yolu" mini önizlemesi.
18. Haptik: çarpışma şiddetine göre 8–25 ms darbeler (köprü üzerinden).

---

## 11. Bitti tanımı (hepsi kanıtlı olmalı)
- [ ] Her mod menüden sonuca kadar uçtan uca oynanabiliyor. Placeholder, "yakında" ya da ölü buton yok. Kod tabanında `TODO` ve `FIXME` yok.
- [ ] `npm run build` iki çıktıyı da üretiyor: `dist/web` ve `dist/single`. `npm test` tamamen yeşil ve çıktısı teslim raporunda.
- [ ] Determinism: aynı seed ve komutlar Düşük ve Ultra kademede aynı hash'i veriyor. Replay, hayalet ve meydan okuma kodları gidiş-dönüş testli.
- [ ] Bütçe testleri tüm kademelerde, en ağır anlarda yeşil. 4× CPU throttle altında JS p95 ≤ 8 ms. 15 dk soak testinde sızıntı yok.
- [ ] PerformanceDirector:
  - Statik tahmin, benchmark ve governor uygulanmış.
  - Kademe geçişlerinin birim testleri sahte kare süresi dizileriyle yazılmış: düşüş, yükseliş, salınım yok, iOS Düşük Güç Modu tuzağı, termal sürüklenme.
  - Manuel kademe seçimi çalışıyor.
- [ ] Ayarlar: Grafik (Otomatik varsayılan + 4 kademe), FPS 60/30, ses ve müzik seviyeleri, titreşim, dil TR/EN, hareketi azalt (ekran sarsıntısı ve slow-mo kısılır), sol el modu. Hepsi kalıcı.
- [ ] Köprü sözleşmesi (§7.2) eksiksiz uygulanmış. `host-demo.html` e2e testi yeşil. INTEGRATION.md 5 platform kod örneğiyle yazılmış.
- [ ] Çalışma zamanında harici ağ isteği yok. Tek dosya build'i `file://` ile çalışıyor.
- [ ] Context kaybı, arka plan, yön değişimi ve dil değişimi testleri yeşil.
- [ ] Görsel QA: Son iki turda yeni P0 ve P1 yok. Son kontak sayfaları `docs/shots/` altında. Düşük kademe kontak sayfası da "güzel" onayı almış.
- [ ] Oyuncu paneli raporu `docs/PANEL.md`'de: her persona için cevaplar ve aksiyonlar.
- [ ] `CREDITS.md` ve `assets/manifest.json` eksiksiz, yasak lisans yok.
- [ ] Belgeler güncel: `GDD.md`, `ART_BIBLE.md`, `TECH.md`, `KARARLAR.md`, `INTEGRATION.md`, `CIHAZ_TEST_LISTESI.md`.
- [ ] Her şey commit'lenmiş ve push edilmiş.

### 11.G Oyuna özel bitti kriterleri
- [ ] `sim-billiards` dört hareket durumunu analitik çözer. 9.G'deki 1–10 numaralı fizik testlerinin tamamı yeşildir.
- [ ] 100k fuzz vuruşta 0 NaN, 0 tünelleme, 0 örtüşme > 1e-9 m, 0 `kilit` vardır.
- [ ] Golden suite (≥200 vuruş + 90 golf atışı) hash'leri Node, Chromium ve WebKit'te birebir aynıdır.
- [ ] `sim-*` ve `rules` paketlerinde yasaklı `Math.*` transandantal çağrısı yoktur (lint kapısı).
- [ ] Açılış simülasyonu Mi 9T profilinde ≤ 15 ms (Worker), ortalama vuruş ≤ 3 ms ölçülüp raporlanmıştır.
- [ ] Han bant modeli Mathavan referansına göre ortalama ≤ 2°, en fazla ≤ 5° sapar. Sağ spin yön testi geçer.
- [ ] Pool 9 ft, 7 ft ve carom 2.84×1.42 m TableSpec'leri görsel mesh ile ≤ 0.5 mm uyumludur.
- [ ] Cep çeneleri rattle üretir: golden suite'te ≥5 rattle vuruşu Kıl payı bayrağı ve slow-mo tetikler.
- [ ] 8-Top (≥40) ve Üç Bant (≥30) kural senaryoları geçer. Her kararın TR/EN açıklaması vardır.
- [ ] ~24 rakip profili + boss'lar tanımlıdır. AI vs AI matrisi monoton zorluk gösterir. 10k kararda 0 kuraldışı seçim olur.
- [ ] Üç Bant Üstatlar'ının ölçülen p değerleri hedefin ± 0.05 içindedir. 30 Akademi drill'inin hepsi çözücüyle doğrulanmıştır.
- [ ] AI kararı Mi 9T profilinde ≤ 2.5 s'dir ve aynı seed'le aynı vuruşu seçer.
- [ ] Günün Vuruşu havuzunda ≥400 doğrulanmış bulmaca vardır. Gün indeksi Europe/Istanbul'a göredir.
- [ ] Paylaşım kartı tam olarak "ISTAKA #312 🎱 2 vuruş ⭐⭐⭐ — Sen yapabilir misin?" biçimini üretir.
- [ ] Replay, ghost kodu ve Vuruş Arşivi kayıtları yeniden simülasyonda aynı hash'i verir. Shot komutu ≤ 12 byte'tır.
- [ ] 6 salon baked lightmap ile yüklenir. Hiçbir salonda unlit veya bake'siz yüzey yoktur (contact sheet incelemesi).
- [ ] Her kademede her topun altında temas gölgesi vardır (piksel testi). Düşük'te toplarda lamba yansıması görünür.
- [ ] Mi 9T profilinde 8-Top açılış ve Yönetmen slow-mo sırasında Düşük ve Orta kademelerde p95 kare süresi ≤ 16.7 ms'dir.
- [ ] Mini Golf: 18 delik (2 parkur × 9) oynanabilir. Her delikte solver par veya altını bulur. Hareketli engeller deterministiktir.
- [ ] Golf fuzz'ında (delik başına 50k) 0 duvar geçme vardır. Loop minimum güç testleri geçer.
- [ ] Tilt-shift tüm kademelerde aktiftir. Düşük'te ¼ çözünürlüklü bant gaussian kullanılır, nişan göstergesi asla bulanık değildir.
- [ ] 2–4 oyunculu pass-and-play golf ve 2 oyunculu 8-Top akışı baştan sona bot ile tamamlanır.
- [ ] Kariyer'de baskı sistemi kapatılabilir; kapalıyken nişan kayması 0'dır (test).
- [ ] CREDITS.md'de tüm Poly Haven, ambientCG, Kenney, Quaternius ve Tabler kaynakları lisanslarıyla listelenmiştir; hiçbir marka veya gerçek kişi benzerliği yoktur.

---

## 12. Teslim raporu (son mesajın)
Türkçe, kısa ve kanıtlı olsun:
1. Neyin yapıldığı: modlar ve içerik sayıları.
2. Nasıl çalıştırılacağı (`npm ci && npm run dev`, `npm run build`, `npm test`).
3. Build boyutları.
4. Test özeti: geçen ve kalan.
5. Kontak sayfalarının yolları.
6. Bilinen sınırlamalar ve cihazda doğrulanması gerekenler (`CIHAZ_TEST_LISTESI.md`).
7. Entegrasyon için ilk adım.

Abartma yok. Ölçülmemiş hiçbir şeyi "harika çalışıyor" diye yazma.
