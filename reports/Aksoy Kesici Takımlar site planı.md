# Aksoy'un vitrinini tek bir torna kateri taşıyacak

Aksoy Kesici Takımlar için "mükemmel" siteyi, ajansların yaklaşık 10 bin dolara sattığı kaydırmalı 3D efekti video ya da yüzlerce render karesiyle değil, tarayıcıda canlı çalışan tek bir 3D modelle kurarak yaparız. Yapı şu: **Astro** ile üretilen statik bir site, ana sayfada **vanilla three.js + GSAP ScrollTrigger** ile kaydırmaya bağlanmış bir torna kateri ve sayfa açılır açılmaz görünen hafif bir **poster görseli**. Kahraman ürün olarak **PCLNR tipi dış çap torna kateri + CNMG 120408 kesici uç** öneriyoruz. Kalın, düz yüzeyli ve herkesin tanıdığı silueti, yapay zekâ 3D araçlarının en iyi ürettiği türden. Buna karşılık SANT MGEHR1616-2 kanal katerinin 2 mm'lik ince bıçağı ve matkap/parmak frezenin helis kanalları bu araçların bilinen zayıf noktası. Senden yalnızca **katerin GLB dosyasını** istiyoruz; bunu görselden 3D'ye bir araçla üreteceksin (önce Hyper3D Rodin Gen-2.5, kıyas için Hunyuan 3D, Meshy ve Tripo). CNMG ucunu ve sıkma vidasını biz kodla, ISO ölçülerinde üretip "vida çıkar, uç havalanır, döner, yerine oturur" diye ilerleyen patlatılmış görünümü kuracağız. İsteğe bağlı finalde de kodla üretilmiş bir karbür parmak freze dönecek. Sitenin geri kalanı satış modeline göre çalışır: ISO P/M/K/N/S/H renk kodlu filtreleri olan bir katalog, ürün sayfaları, ürünleri tek bir WhatsApp mesajına (+90 535 610 19 89) dönüştüren **Teklif Sepeti**, Türkçe hesaplayıcılar, ISO kod çözücü, marka sayfaları ve blog. Görsel dil "Graphite & TiN": karanlık vitrin, aydınlık katalog, TiN altını vurgu. Barındırma Cloudflare Pages'in ücretsiz planında olmalı. Ancak `*.pages.dev`, `*.vercel.app` ve `*.netlify.app` adresleri Türkiye'de **erişime engellendiği** için siteyi ilk günden kendi alan adınla (örneğin aksoykesici.com.tr) açmak zorunlu. Online sipariş ve ödeme olmadığı sürece ETBİS kaydı gerekmiyor. Buna karşılık KVKK aydınlatma metni ve künye bilgileri şart; yazılı izin yoksa "yetkili bayi" ifadesinden de uzak durmak gerekiyor. Araştırma ekibinin sayfa indirmeleri ağ vekil sunucusunda (proxy) engellendi ve arama kotası tükendi. Bu yüzden bulguların önemli kısmı arama özetlerinden geliyor; doğrulanamayan her nokta raporda işaretli.

## Ajansların 10 bin dolarlık efekti bir yazılım tercihi, sihir değil

Instagram'da gördüğün kamera örneğinde ürün ekranın ortasında duruyor, sayfayı kaydırdıkça sağa sola dönüyor ve yanlarda özellik yazıları akıyor. Bu etki üç farklı yöntemle yapılıyor.

Birincisi Apple'ın meşhur ettiği **kare dizisi**. Ürün önceden yüzlerce kare olarak render edilir; kaydırma çubuğu bir "oynatma kafası" gibi hangi karenin çizileceğini seçer ([CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)). Görüntü fotoğraf kalitesindedir ama yöntem ağırdır. AirPods Pro animasyonu tek başına **65 PNG ve 15,2 MB** idi ([GSAP forumu](https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/)). iPhone Safari'de toplam canvas belleği iOS 15 döneminde **384 MB** ile sınırlıydı ve sınır aşılınca sayfa çöküyordu ([Pqina](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)).

İkincisi **video kaydırma**: video, kaydırmaya bağlı olarak ileri geri sarılır. Her kare anahtar kare olacak şekilde özel kodlanmazsa takılır. Sorunu çözen bir örnekte bile dosya 78 MB'tan ancak 22 MB'a inebilmiş ([LuJin PR #13](https://github.com/lujin88/LuJin-Portfolio/pull/13)). Sektör rehberleri de kare dizisini videodan daha güvenilir buluyor ([Scrollsequence](https://scrollsequence.com/how-to-make-scroll-image-animation/)).

Üçüncüsü bugün ödüllü sitelerin kullandığı **gerçek zamanlı 3D**. Tarayıcıya bir GLB modeli (tek dosyalık 3D model formatı) yüklenir. GSAP ScrollTrigger adlı kütüphane de modelin dönüşünü, konumunu ve kamerayı kaydırma miktarına bağlar ([Utsubo 2026 derlemesi](https://www.utsubo.com/blog/best-threejs-websites-2026)).

Senin durumunda üçüncü yol açık ara kazanıyor. Modeli zaten GLB olarak getireceksin. Araştırmada yerel olarak ölçülen paket boyutlarına göre three.js + GSAP ScrollTrigger + Lenis toplamı **yaklaşık 210 KB** (sıkıştırılmış). Üzerine ~1 MB'lık model eklense bile toplam, iyi bir kare dizisinin **4–8 MB**'ından çok daha hafif kalıyor. Gerçek zamanlı model her ekran oranında net kalır. Kaplama rengini canlı değiştirebilir, kesme kenarına yaklaşabilir, ölçü çizgilerini modelin üzerindeki noktalara bağlayabilir; sabit karelerle bunların hiçbiri yapılamaz. Alternatiflerle kıyaslarsak: React tabanlı R3F yığını aynı iş için ~352 KB, Google'ın model-viewer'ı ~294 KB, Spline'ın çalışma zamanı ise ~1 MB tutuyor. Üstelik Spline'ın ücretsiz planı filigran ekliyor ([Spline fiyatları](https://spline.design/pricing); fiyat bilgisi aracı sitelerden, doğrulanmadı). GSAP, 3.13 sürümünden beri (Nisan 2025) tüm eklentileriyle birlikte ticari kullanımda da **tamamen ücretsiz** ([npm gsap](https://www.npmjs.com/package/gsap)). three.js bugün r186 sürümünde ([npm three](https://www.npmjs.com/package/three)). Yani ajansların 10 bin dolarlık işi, aslında fotoğraf gerçekliğinde render almak için seçilmiş bir üretim hattı; teknik bir zorunluluk değil.

Önerdiğimiz yığın şu: **Astro** ile üretilen statik bir site; içinde **vanilla three.js** (WebGLRenderer), **GSAP ScrollTrigger** ve isteğe bağlı **Lenis**. Astro varsayılan olarak sayfalara hiç JavaScript koymaz. Yalnızca ihtiyaç duyan bileşen bir "ada" olarak yüklenir ([Astro belgeleri](https://github.com/withastro/docs/blob/main/src/content/docs/en/concepts/islands.mdx)). Böylece katalog ve ürün sayfaları ucuz telefonlarda bile anında açılan saf HTML olur; 3D kodu yalnızca ana sayfada yüklenir. Codrops'un Şubat 2026 tarihli rehberi tam olarak Astro + three.js + GSAP birleşimini anlatıyor ([Codrops](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/)). Next.js'in statik çıktısı da çalışır ama React'i her katalog sayfasına taşır; bu kapsam için gereksiz. WebGPU yerine WebGL kullanmamızın nedeni basit. Tek model için WebGPU görünür bir fark yaratmıyor ama paket 161 KB'tan 258 KB'a çıkıyor. WebGL2 ise iOS 15'ten beri her yerde var ([MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)).

"Mükemmel" sitenin asıl sırrı yedek planlarda. Sayfa açılınca önce modelin aynı açıdan alınmış hafif bir **poster görseli** (AVIF/WebP, 60–120 KB) gösterilir. Google'ın hız ölçütlerinden LCP (sayfadaki en büyük içeriğin ekrana gelme süresi) bu görsele göre hesaplanır. 3D canvas hazır olunca poster yumuşakça kaybolur. three.js sayfa yüklendikten sonra devreye girer. Telefonda piksel yoğunluğunu 1,5 ile sınırlarız; model yalnızca kaydırma olduğunda çizilir ve bölüm ekrandan çıkınca durur.

Farklı cihaz ve ayarlar için de karşılık hazır:

- "Hareketi azalt" ayarı açık olan kullanıcı sabit görsel ve alt alta dizilmiş normal metin görür. Bu, WCAG erişilebilirlik kuralları için gerekli ([Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)).
- WebGL2 olmayan veya zayıf cihazlarda poster kalır.
- Tarayıcı 3D bağlamını kaybederse poster geri gelir.

Lenis yalnızca masaüstünde fare tekerleğini yumuşatır; telefonda yerel kaydırma korunur. Lenis'in varsayılanı zaten `syncTouch:false` ([Lenis](https://github.com/darkroomengineering/lenis)). Kaydırmayı ele geçiren siteler sert eleştiri alıyor: Apple'ın 2019 sayfası "scrolljacking cehennemi" diye anılmıştı ([Daring Fireball](https://daringfireball.net/linked/2019/10/28/airpods-pro-scrolljacking-hell)). Bölüm metinlerinin tamamı gerçek HTML başlık ve paragraf olarak sayfada durur. Google ve ekran okuyucular 3D'ye ihtiyaç duymadan her şeyi okuyabilir. CSS'in yeni kaydırma animasyonları Chrome'da ve Safari 26'da var, ama Firefox'un kararlı sürümünde hâlâ yok ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)). Bu yüzden onları yalnızca yazı efektlerinde ve tarayıcı destekliyorsa kullanacağız.

### Örnek alacağımız siteler ve neden

| Site | Neyi örnek alacağız | Durum / not |
|---|---|---|
| Oryzo AI (Lusion) — [oryzo.ai](https://oryzo.ai/) | Sıradan tek bir nesneyi "amiral gemisi ürün lansmanı" ciddiyetiyle sunmak. Fiziksel ağırlık hissi veren yavaşlama, kameranın gerçek derinlikte ilerlemesi | Awwwards Site of the Day ([Awwwards X](https://x.com/awwwards/status/2043600792184099160)). Bir derlemeye göre Nisan 2026 Ayın Sitesi + Developer Award ([Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)); doğrulanmadı |
| Cartier Watches & Wonders 2026 (Immersive Garden) | Her ürün için bir "oda": müzede gezer gibi kaydırılan 6 bölüm | SOTD ([Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)). Etkinlik sitesi, kapanmış olabilir |
| Igloo Inc (abeto) | Üç bölüm yeterli; ödül bölüm sayısına değil derinliğe veriliyor | Yılın Sitesi + Yılın Geliştirici Sitesi ([abeto](https://x.com/abeto_co/status/1900152588768579701?lang=en), [vaka çalışması](https://www.awwwards.com/igloo-inc-case-study.html)) |
| Q Industrial (Le:mma Studio) | Endüstriyel kaplama firması: B2B'de premium 3D işe yarıyor. "Sektörler" sayfa şablonu | SOTD 2 Haziran 2024 + Development Award ([Awwwards](https://www.awwwards.com/sites/q-industrial)) |
| Hubtown (Unseen Studio) | Karanlık, yansımalı sahnede 3D bir "monolit" ile B2B markaya ağırlık katmak | SOTD Haziran 2026 ([Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)) |
| Symboticware sektör sayfaları | 3D parçanın üzerine gelince o parçanın vurgulanıp etiketlenmesi (uç, vida, gövde için) | Awwwards ilham seçkisi ([Awwwards](https://www.awwwards.com/inspiration/industries-pages-symboticware)) |
| We Enable Digital Engineers | Kaydırınca hafifçe eğilen kamerayla sakin bir mühendislik başlığı | Awwwards ilham seçkisi ([Awwwards](https://www.awwwards.com/inspiration/3d-home-hero-custom-three-js-3d-header-with-camera-tilt-on-scroll-we-enable-digital-engineers)) |
| Codrops eğitimleri | Sağdan soldan gelen metin + kaydırmayla dönen model; sinematik kamera ritmi | [2022 temel kalıp](https://tympanus.net/codrops/2022/01/05/crafting-scroll-based-animations-in-three-js/), [2025 sinematik](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/) |
| productviewgsap, Fizzi2 | Tek model + Lenis + ScrollTrigger iskeleti | Açık kaynak lisansı yok, kod kopyalanmaz, yalnızca referans ([productviewgsap](https://github.com/kgayanjith/productviewgsap), [Fizzi2](https://github.com/santiagoswie2032/Fizzi2)) |
| Machining Doctor, NOX Metals | ISO kod çözücünün arayüzü: harf harf anlam + uç şekli çizimi | [Machining Doctor](https://www.machiningdoctor.com/isoturn/), [NOX](https://noxmetals.co/resources/insert-geometry-decoder) |
| Kennametal TR, Walter | Türkçe hız/ilerleme hesaplayıcısı; malzeme grubu ve işleme yöntemine göre filtre | [Kennametal TR](https://www.kennametal.com/tr/tr/resources/engineering-calculators/miscellaneous/speed-and-feed.html), [Walter](https://www.walter-tools.com/en-us/tools/search-and-shop/walter-online-catalogue) |
| TKT Industrial (Trakya Kesici Takımlar) | Türk rakip: 6 marka, 4.700+ ürün ve 1.600+ tezgâh kaydı üzerinde yapay zekâ katalog asistanı | [TKT](https://www.tkt.com.tr/tr) |

Bu ödüllü sitelerin ortak noktası sadelik. Oryzo'da her kare tek bir nesneyle ilgili; Igloo yalnızca üç bölümle Yılın Sitesi oldu. Biz de onların tam WebGL arayüzünü değil, **sadeliğini, ışığını ve ritmini** alacağız; menü, katalog ve metin normal HTML olarak kalacak. Taramalarda kesici takım sektöründen bir Awwwards kazananı çıkmadı. Türk bayi sitelerinde de 3D vitrin görülmedi, yani bu alan boş. Bu sitelerin hiçbirinin mobil davranışı kontrol edilemedi. Tasarımı kilitlemeden önce linkleri telefonda açıp bakmak gerekiyor. Büyük üreticiler (ISCAR NEOITA, Tungaloy'un hesaplayıcısı ve "Gabby" asistanı, Gühring'in 50.000+ CAD modeli, Kennametal'in çapraz marka dönüşüm rehberi) güçlerini 3D hikâyeden değil, seçim araçlarından alıyor ([ISCAR](https://www.iscar.com/en-hq/technical-articles/year-2026/how-iscars-neoita-integrates), [Tungaloy](https://tungaloy.com/), [Kennametal](https://www.kennametal.com/us/en/resources/conversion-guide.html)). Bir bayi bu veri derinliğiyle yarışamaz. Doğru strateji resmi e-kataloglara link vermek ("Resmi katalogda gör") ve farkı **Türkçe seçkiyle, insana hızlı ulaşmayla ve görsel kaliteyle** yaratmak.

## Beş bölümlük senaryo: kater döner, uç havalanır, teklif gelir

Vitrin bölümü teknik olarak tek bir uzun bölümdür (ekran yüksekliğinin 4–5 katı). İçindeki 3D çizim alanı kaydırma boyunca ekrana yapışık kalır ("sticky"). Tek bir GSAP zaman çizelgesi her bölüm için bir etiket taşır; kaydırma bu çizelgeyi ileri geri oynatır. İstersek model her bölümde kısa bir "durak" yapacak şekilde etiketlere yapışır. Masaüstünde model ortada durur, metinler 12 kolonluk ızgarada sırayla sol (1–5) ve sağ (8–12) kolonlara gelir. Mobilde sağ-sol değişmez: model ekranın üst ~%55–60'ında, metin kartı alt ~%40'ta durur ve bölüm bölüm değişir; başında "01 / 05" gibi bir sayaç bulunur. Hareket dili "işlenmiş, zıplamayan" olacak: yalnızca yavaşlayarak duran geçişler, geri sekme yok. Sıralama hep aynı: önce ince çizgi çizilir, sonra etiket 200–300 ms içinde hafifçe yükselerek belirir, en son sayılar sayarak tamamlanır.

| Bölüm | Modelde ne olur | Metin | Örnek Türkçe metin |
|---|---|---|---|
| 01 · Giriş | Kater karanlık zeminden dönerek kadraja girer, hafif yukarıdan üç çeyrek açıda durur | Ortada | **Talaşın ilk temas ettiği yer.** "Tornalamadan frezelemeye doğru kesici takım, sahada destek ve tek mesajla teklif." |
| 02 · Gövde | Model sağa döner, kamera sap boyunca kayar; "25 × 25 mm", "150 mm", "95°" ölçü çizgileri çizilir | Solda | **Sağlam gövde, titreşimsiz kesim.** "PCLNR 2525M12: 25×25 mm sap, 95° yaklaşma açısı, kol kilitli bağlama. Genel tornalamada en yaygın kater tipi." |
| 03 · Uç ayrılıyor | Vida yukarı çıkar, CNMG ucu cebinden havalanır ve kendi ekseninde döner. Etiketler: 80°, IC 12,7 mm, 4,76 mm, R0,8 | Sağda | **Her harf bir ölçü.** "CNMG 120408: 80° eşkenar dörtgen, negatif, delikli, iki yüzü talaş kırıcılı. Elinizdeki kodu çözmek için ISO kod çözücüyü deneyin." |
| 04 · Kaplama | Havadaki ucun rengi TiN altınından AlTiN siyahına geçer, kenarda ışık parlar | Solda | **Kaplama süs değil, kimlik.** "CVD kalın ve aşınmaya dayanıklıdır; çelik ve dökümde uzun ömür verir. PVD ince ve keskindir; paslanmaz ve yapışkan malzemede temiz keser. Malzemenize göre doğru kaliteyi birlikte seçelim." |
| 05 · Teklif | Uç cebine oturur, vida sıkılır, model açılış pozuna döner | Ortada | **Doğru takım, doğru teklif.** "Kodu yazın, adedi seçin, WhatsApp'tan gönderin." Butonlar: "Kataloğu incele" · "WhatsApp'tan teklif al" |
| Final (isteğe bağlı) | Kodla üretilmiş 4 ağızlı karbür parmak freze ekrana girer ve kendi ekseninde döner | Ortada | **Tornalamadan frezelemeye, delmeden diş açmaya.** Altında kategori kartları |

Metinlerdeki teknik bilgilerin hepsi kaynaklı. PCLNR'nin harfleri ve 150 mm boy için [Cromwell](https://www.cromwell.co.uk/shop/cutting-tools/iso-external-toolholders/pclnr-2525m12-toolholder-lever-lock/p/KML1423840D), 95°'lik L tipinin en yaygın genel tornalama tipi olması için [Tungaloy kataloğu](https://tungaloy.com/wpdata/wp-content/uploads/GC_2021-2022_US_C_Ex.Turning.pdf), CNMG'nin harfleri için [Cutwel](https://www.cutwel.co.uk/blog/learn-the-turning-tool-iso-code-system) ve [CADEM](https://cadem.com/cnc-insert-identification-code/), CVD ile PVD farkı için de [Çeyrek Mühendis](https://ceyrekmuhendis.com/cvd-ve-pvd-kaplama-nedir/) kaynak. Kaplama renkleri de gerçek: TiN parlak altın sarısı, TiCN mor-gri, TiAlN/AlTiN koyu gri-siyah ([CNC Optimization](https://www.cncoptimization.com/resources/guides/tool-coating-guide/)). Yani 4. bölümdeki renk değişimi bir süs değil, ustanın kutudan tanıdığı bir bilgi.

Patlatılmış görünümün neden kodla yapılması gerektiğini açıklayalım. Yapay zekâ 3D araçları modeli çoğunlukla tek ve kapalı bir kabuk olarak verir. Tripo'nun otomatik parça ayırma özelliği ([Tripo](https://www.tripo3d.ai/blog/ai-3d-auto-part-segmentation)) ve Tencent'in Hunyuan3D-Part aracı ([GitHub](https://github.com/Tencent-Hunyuan/Hunyuan3D-Part)) var, ama ucu gövdeden sonradan temiz ayırmak güvenilir değil. En sağlam yol, ucu ve vidayı ISO ölçülerinde kodla üretmek: dosya boyutu birkaç KB, geometri kusursuz, malzeme ayrı. Final bölümündeki parmak freze de aynı mantıkla kodla yapılır. Endüstriyel nesneler üzerine yapılan bir araştırma, yapay zekânın "spiral oluklar gibi ince detayları doğru temsil edemediğini" gösteriyor ([ForgeDreamer](https://arxiv.org/pdf/2603.09266)). Oysa parmak freze matematiksel olarak basit: dört loblu bir kesit, sapa doğru helis boyunca döndürülür. Vitrinde parçaların üzerine gelince adlarının belirmesi (uç, vida, kater gövdesi) Symboticware'deki "vurgulanan parçalar" kalıbından alınacak.

## Senden istediğim 3D model

Bu bölüm senin yapacağın işin tarifi. Kısacası: **gerçek bir PCLNR katerinin (ucu takılıyken) temiz bir fotoğrafını çek, bunu görselden 3D'ye bir araca ver, en iyi sonucu GLB olarak indir ve bize gönder.** Gerisi bizde.

### Ürün: PCLNR dış çap kateri ve CNMG 120408 ucu

PCLNR 2525M12 kodunu harf harf okursak ([Cromwell](https://www.cromwell.co.uk/shop/cutting-tools/iso-external-toolholders/pclnr-2525m12-toolholder-lever-lock/p/KML1423840D)):

- **P:** kol kilitli bağlama
- **C:** 80° eşkenar dörtgen uç
- **L:** 95° yaklaşma açısı
- **N:** 0° boşluk açılı (negatif) uç
- **R:** sağ el
- **2525:** 25×25 mm sap
- **M:** 150 mm toplam boy
- **12:** uç boyu

Bu bir ISO 5608 kodu ([ISO](https://www.iso.org/standard/60180.html)) ve aynı kodu Kennametal, Ceratizit, Sumitomo gibi birçok marka üretiyor ([ToolsUnited](https://toolsunited.com/EN/Article/Details/24696400130591082?dataSource=toolsUnited&print=False)). Yani vitrinde tek bir markanın ürününü değil, tornalamanın ortak "ikonunu" gösteriyoruz; logo ve marka izni sorunu doğmuyor. Elinde PCLNR değil de MCLNR (üstten pençeli) ya da DCLNR varsa o da olur. CNMG 1204 ucu taşıyan 95°'lik her dış çap kateri iş görür; ilk harf yalnızca bağlama tipini değiştirir ([Mitsubishi](https://www.mmc-carbide.com/permanent/courses/85/tool-holder-identification-code.html)). 2020 veya 2525 sap fark etmez.

| Aday | Yapay zekâyla üretmek | Vitrinde etkisi | Karar |
|---|---|---|---|
| **PCLNR kater + CNMG uç** | Kolay: kutu gibi sap, birkaç milimetre kalın parçalar, büyük ve düz uç, belirgin siluet | Güçlü: tornalamanın ikonu, dönerken iyi okunur, uç ile gövde arasında renk farkı var | **1. tercih: GLB'yi sen getiriyorsun** |
| SANT MGEHR1616-2 kanal kateri | Orta-riskli: ~2 mm kalınlığında bıçak gibi baş, uç gövdeye kaynaşır, lazer yazılar kaybolur | İyi ama ince profil | 2. seçenek |
| Karbür parmak freze / matkap | Zor: ince, kıvrımlı helis kanallar yapay zekânın bilinen zayıf noktası | Çok güçlü | Yapay zekâyla değil, **kodla**; isteğe bağlı final |
| Tek kesici uç | Çok kolay | Zayıf: küçük ve düz bir nesne | Kater içindeki parça olarak, kodla |

SANT MGEHR1616-2'yi ikinci sıraya koymamızın üç nedeni var. Birincisi geometri: SANT'ın ilanına göre ürün 16×16 mm sap, 100 mm boy, 2 mm kanal genişliği ve 16 mm kanal derinliğine sahip ([SANT](https://hnsant123.en.made-in-china.com/product/fCUQmZkGqgcp/China-Mgehr1616-2-Grooving-Body-with-2mm-Insert.html)). Yani ucu taşıyan baş, ~100 mm'lik bir nesnede yalnızca ~2 mm kalınlığında. Yapay zekâ araçları boyuna göre ince kalan parçaları kalınlaştırma, birbirine kaynaştırma ya da "eritme" eğiliminde; sert yüzey (hard-surface) prompt rehberleri de açıkça "ince elemanlardan kaçının" diyor ([Rephrase-it](https://rephrase-it.com/blog/prompts-for-ai-3d-generation-that-actually-work-meshy-tripo-)). İkincisi yazılar: üzerindeki SANT logosu ve kodlar hiçbir araçta geometri olarak çıkmaz ([3D AI Studio](https://www.3daistudio.com/TextTo3D)). Üçüncüsü kodlama: MGEHR bir ISO kodu değil, Korloy uçlarıyla uyumlu diye pazarlanan ([SANT](https://hnsant123.en.made-in-china.com/product/GCYQXJuoJIWD/China-Mgehr1616-2-External-Parting-Grooving-and-Turning-Tools-Matched-Korloy-Carbide-Inserts.html)) ve birçok üreticinin kullandığı bir üretici kodlaması. Vitrinde bu ürünü kullanırsak bütçe segmentinden tek bir marka öne çıkmış olur. Fotoğrafın boşa gitmiyor: MGEHR1616-2, kataloğa ilk eklenecek örnek ürün sayfası olacak.

### Referans görseli: gerçek fotoğraf en iyisi, yapay zekâ yedek

Görselden 3D'ye üretimde **giriş görselinin kalitesi sonucu belirler**. Metinden 3D'ye üretim, metal takımlar için görselden üretimin gerisinde kalıyor. En iyi kaynak, sattığın gerçek bir ürünün fotoğrafı, çünkü gerçek oranları korur. Sloyd'un rehberine göre üç kural önemli: arka plan düz beyaz olmalı, ışık eşit olmalı (sert gölgeler geometri sanılır) ve çözünürlük olabildiğince yüksek olmalı (bulanık görsel "lapa gibi" model verir) ([Sloyd](https://www.sloyd.ai/blog/turning-reference-images-into-3d-models)). Yansıtıcı malzemeler de bu araçlar için zor.

Pratikte şöyle yap:

1. Kateri ve ucu yağdan, parmak izinden temizle.
2. Masaya bir A3 beyaz kâğıt koy ve arkasını duvara doğru kıvır (sonsuz fon).
3. Doğrudan güneş olmasın: pencere önünde dağınık gün ışığı ya da ucuz bir ışık çadırı kullan.
4. Kateri ucun ve vidanın açıkça göründüğü taraftan, önden çapraz ve hafif yukarıdan, **üç çeyrek açıdan** çek.
5. Takımın tamamı kadrajda olsun, etrafında boşluk kalsın. Telefonla yakına gidip geniş açı bozulması yaratma: biraz geri çekil, sonra kırp.
6. Kadrajda başka nesne (anahtar, kutu) olmasın.
7. Çok parlama varsa ışığı bir beyaz kâğıtla yumuşat.
8. Fotoğrafı telefonun en yüksek çözünürlüğünde çek; dosyayı en az 1024 px, ideali 2048 px olacak şekilde kaydet.

İkinci olarak **ucu ve vidayı çıkarıp aynı açıdan bir fotoğraf daha** çek. Bu "boş cep" görüntüsü, patlatılmış görünüm için ideal ikinci model olur.

Fotoğraftaki yazı ve logoları temizlemek için bir yapay zekâ görsel düzenleyici (Gemini veya ChatGPT'nin görsel düzenleme özelliği) kullanabilirsin. Gerçek ürün elinde yoksa aynı araçlarla sıfırdan referans görsel de üretebilirsin. Kaynaklarda ürün fotoğrafı için "Nano Banana Pro" ve "GPT Image 2.5" adları geçiyor ([Aliteq](https://aliteq.com/best-ai-image-generators-product-photos-2026)), ancak bu sıralamalar düşük otoriteli listelerden geliyor ve model adları doğrulanmadı. Hangisi elindeyse onu kullan. Promptlar İngilizce daha iyi sonuç veriyor:

**Prompt 1 — sıfırdan referans görsel (Gemini / ChatGPT görsel):**

```
Studio product photograph of a single CNC lathe external turning tool holder, ISO type PCLNR 2525M12: a long straight solid steel shank with a square 25x25 mm cross-section, about 150 mm long, with a slightly wider angled head at one end. A flat rhombic 80-degree carbide insert (CNMG 120408) with a round center hole sits in a pocket on the head, locked by a hex-socket clamping screw on the top of the head. Dark gunmetal blackened steel body with a satin finish, matte grey-gold coated carbide insert. Three-quarter view from front-left and slightly above, entire object fully visible and centered with margin, orthographic-like telephoto perspective (no wide-angle distortion), isolated on a pure white seamless background, soft even diffuse studio lighting, very soft contact shadow only, no harsh reflections, no mirror highlights, no text, no logos, no engraving, no labels, no other objects, ultra sharp focus, 4K, high detail.
```

**Prompt 2 — kendi çektiğin fotoğrafı temizlemek için (fotoğrafı yükleyip yaz):**

```
Edit this photo: keep the exact shape, proportions and every geometric detail of the tool holder and insert unchanged. Remove all text, logos, part numbers and engravings. Replace the background with pure seamless white. Reduce reflections and specular highlights to a soft satin look. Even, soft, diffuse studio lighting with only a very soft contact shadow. Do not add or remove any parts.
```

**Prompt 3 — boş cep versiyonu (aynı sohbette, aynı görsel üzerinden):**

```
Same exact tool holder, same materials, lighting and camera angle, but the insert pocket is empty: no insert and no clamping screw installed, only the empty insert seat and the threaded screw hole are visible. No text, no logos, pure white background.
```

**Prompt 4 — isteğe bağlı ek açılar (yalnızca çoklu görsel kabul eden araçlar için; her satırı aynı sohbette ayrı mesaj olarak gönder):**

```
Same exact object, same materials and lighting, pure side view (orthographic, from the right).
Same exact object, same materials and lighting, pure top view (orthographic, looking straight down).
Same exact object, same materials and lighting, front view looking down the shank axis.
```

Ek açılarda dikkat: uç şekli, vida konumu ve oranlar her görüntüde birebir aynı değilse o görüntüyü kullanma. Tutarsız açılar, tek iyi görselden daha kötü model üretir. Çoklu görsel desteği araca göre değişiyor: Meshy'de ana görsele ek en fazla 3 açı ekleyebilirsin, ama bu yalnızca Pro planda ve Meshy 7'de çalışıyor ([Meshy](https://www.meshy.ai/tutorials/multi-view-image-to-3d)). Tripo ön, arka, sol ve sağ olmak üzere 4 açı ([Scenario](https://www.scenario.com/blog/tripo-30-multiview-examples-eeda996)), Hunyuan 3.1 ise 8 açıya kadar kabul ediyor ([3D AI Studio](https://www.3daistudio.com/Models/Hunyuan3D-3-1)).

### Hangi araçla: önizleme ücretsiz, yalnızca kazanana para ödenir

| Sıra | Araç | Neden bu sırada | Ücretsiz ne yapabilirsin | Ticari kullanım şartı |
|---|---|---|---|---|
| 1 | **Hyper3D Rodin Gen-2.5** (hyper3d.ai) | Sert yüzeyli nesneler için pazarlanıyor; üçgen ağı 500 bin yüze kadar, PBR doku, 5 kalite seviyesi ([Scenario](https://www.scenario.com/models/rodin-gen-25)) | Üretim ve önizleme sınırsız ücretsiz; kayıtta 10 kredi | İndirirken ödersin (~1,50 $/kredi; indirme başına kaç kredi gerektiği doğrulanmadı). Üçüncü taraf kaynaklara göre ticari hak tüm planlarda var ([The Rundown](https://www.therundown.ai/tools/rodin), [Costbench](https://costbench.com/software/ai-3d-generation/rodin-hyper3d/free-plan/)) |
| 2 | **Tencent Hunyuan 3D 3.1** (3d.hunyuanglobal.com) | Bir kıyas tablosunda hem görünüm hem ağ temizliğinde birinci ([Pixazo](https://www.pixazo.ai/leaderboard/ai-3d-model-generation)) | Günde 20 ücretsiz üretim ([Tencent](https://www.tencent.com/en-us/articles/2202235.html)) | Barındırılan platformun ticari şartları doğrulanamadı; resmî olmayan bir site "ticari kullanım yalnızca ücretli üyelere" diyor. **Kullanmadan önce kontrol et** |
| 3 | **Meshy 7.1** (meshy.ai) | Görsele sadakatte en iddialısı (üretici iddiası, [3D Printing Industry](https://3dprintingindustry.com/news/meshy-launches-meshy-7-image-to-3d-model-built-around-alignment-253786/)) | Ayda 100 (bir kaynağa göre 200) kredi; Meshy 7 modelleri ücretsiz planda indirilemiyor | Ücretsiz plan CC BY 4.0: sitede "Model created with Meshy – CC BY 4.0" yazmak zorunlu. Pro ~20 $/ay ile atıfsız ticari kullanım ([Meshy](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects)) |
| 4 | **Tripo H3.1 / Smart Mesh P1.0** (tripo3d.ai) | Sloyd'un 3 Ağustos 2026 sıralamasında Tripo v3.1 birinci ([Sloyd](https://www.sloyd.ai/blog/ai-3d-model-generator-rankings); Sloyd da bir 3D satıcısı) | Ayda 200 kredi (~8 model) | Ücretsiz plan ticari değil; Pro ~19,9 $/ay ([Costbench](https://costbench.com/software/ai-3d-generation/tripo-ai/)) |
| 5 | **Microsoft TRELLIS.2** (Hugging Face demo) | Tamamen ücretsiz ve MIT lisanslı tek seçenek ([GitHub](https://github.com/microsoft/TRELLIS.2)) | [HF demosu](https://huggingface.co/spaces/microsoft/TRELLIS.2) ücretsiz | MIT, yani serbest; ama metal takımlarda kalitesi bilinmiyor |
| Yedek | Hitem3D (Sparc3D) | Topluluk sert yüzeyde "çok iyi" buluyor; 1–4 fotoğraf alıyor ([3D AI Studio](https://www.3daistudio.com/Models/Hitem3D)) | 100 kredi, tek seferlik (~10 üretim) | Ücretsiz kredilerin ticari kullanımı konusunda kaynaklar çelişkili; ücretli planlar ticari |

Rodin'i birinci koymamızın nedeni, kıyaslamalarda hep birinci olması değil. Kıyaslamalar birbirini tutmuyor. Pixazo'da Hunyuan 3D Pro birinci, Rodin görünümde ikinci ama ağ temizliğinde zayıf. Sloyd'da ise Tripo birinci, Rodin altıncı. Metal kesici takımlar için yayımlanmış hiçbir test de yok. Rodin'i öne çıkaran üç pratik avantaj var: önizleme sınırsız ücretsiz, abonelik gerektirmeden yalnızca indirdiğin modele ödeme yapıyorsun ve ticari hak (üçüncü taraf kaynaklara göre) her planda var. Hunyuan ikinci sırada, çünkü kalitesi en iyi olabilir ama ticari şartları belirsiz. Açık kaynak lisansı AB, İngiltere ve Güney Kore'yi kapsam dışında bırakıyor; Türkiye kapsam içinde ([Hunyuan lisansı](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)). Ancak web platformunun ayrı şartları var.

En güvenilir yöntem şu: **aynı referans görseli ilk dört araca ver, önizlemeleri ekranda döndürerek kıyasla, yalnızca kazananı indir.** Bütçe: önizlemeler 0 $. Tek indirme, Rodin'de birkaç kredi tutar ya da bir aylık Meshy Pro (~20 $) veya Tripo Pro (~19,9 $) gerektirir. Ödeme yapmadan önce canlı fiyat sayfasına mutlaka bak. Türkçe arayüz ve Türk kredi kartı kabulü araştırılmadı.

### Kopyala-yapıştır 3D promptları

Çoğu araçta görselden 3D'ye üretim için görsel yeterli. Ek bir metin kutusu varsa Prompt A'yı yapıştır. Görselden sonuç alamazsan Prompt B ile metinden 3D'ye üretimi dene. Meshy'de "negatif prompt" alanı yok; istemediğin şeyleri ana promptun içinde "no …" diye yazmak gerekiyor ([Meshy](https://help.meshy.ai/en/articles/9992028-how-to-use-negative-prompt-for-text-to-3d-i-can-t-find-any-text-input-to-enter-one)). Tripo'nun rehberi de "bir seferde tek bir şeyi değiştir" diyor: önce şekli, sonra malzemeyi ([Tripo](https://www.tripo3d.ai/blog/text-to-3d-prompt-engineering)). Promptları ~500 karakterin altında tut, çünkü araçların karakter sınırları doğrulanmadı.

**Prompt A — görselden 3D'ye yardımcı metin:**

```
Single CNC lathe external turning tool holder with a rhombic carbide insert. Hard-surface machined steel part: flat planar faces, crisp sharp edges with small chamfers, accurate proportions, straight square shank. Satin metal finish. No text, no logo, no engraving, no base, no stand, no background, no floating parts.
```

**Prompt B — metinden 3D'ye yedek:**

```
CNC lathe turning tool holder: long straight rectangular steel shank, square cross-section, angled head at one end holding a flat rhombic 80° carbide insert with center hole, fixed by a hex socket clamping screw on top. Hard-surface machined part, flat planar faces, crisp sharp edges with small chamfers, accurate proportions, single object, centered. Dark gunmetal steel, grey carbide insert. No text, no logo, no base, no stand, no background, no floating parts.
```

Araçta "simetri" seçeneği varsa **kapat**: sağ el kater ayna simetrik değil. "Nesne türü / T-poz" gibi seçenekler varsa varsayılanda bırak. Rodin'de sırasıyla şunları seç: Image-to-3D → Gen-2.5 → malzeme PBR → ağ tipi Triangle/Raw → bütçenin izin verdiği en yüksek kalite seviyesi. Web arayüzündeki etiket adları değişmiş olabilir; bu adlar doğrulanmadı.

### Dışa aktarma ayarları: GLB, PBR, 2K, en yüksek detay

| Ayar | Seç | Neden |
|---|---|---|
| Dosya formatı | **GLB** (FBX/OBJ değil) | Model ve dokular tek dosyada gelir |
| Malzeme | **PBR** (metallic-roughness) | Metal ve pürüzlülük bilgisi korunur |
| Doku çözünürlüğü | **2K (2048 px)** | 4K gereksiz, biz zaten küçültüyoruz |
| Geometri | **En yüksek detaylı üçgen ağ**. Rodin: Triangle/Raw, orta-yüksek seviye. Meshy: remesh yapma ya da ~100 bin üçgene ayarla. Tripo: varsayılan/HD | Temiz geometri, dokudan daha önemli |
| Quad (dörtgen) ağ | Yalnızca başka seçenek yoksa (Rodin Quad ~50K) | Quad ağ animasyon içindir; bize gerekmez |
| Araç içinde küçültme | **Yapma** | Sadeleştirmeyi biz kontrollü yapacağız |
| Simetri | **Kapalı** | Sağ el kater simetrik değil |
| Orijin / ölçek / eksen | Varsayılan | Biz düzelteceğiz |
| Ek indirme | Varsa dokusuz ("white model") veya en yüksek poligonlu sürüm | Geometri yedeği olur |

Bu ayarlar Meshy'nin remesh seçenekleri (üçgen veya dörtgen, 100–300.000 poligon, orijin ve gerçek boy ayarı) ([Meshy API](https://docs.meshy.ai/en/api/remesh)) ile Rodin'in Quad 4K–50K / Triangle 500K'ya kadar seçenekleri ([3D AI Studio](https://www.3daistudio.com/blog/how-to-use-rodin-gen-2-5-online-tutorial)) temel alınarak belirlendi.

**Kazananı seçmek için beş kontrol** var. Modeli aracın 3D görüntüleyicisinde her yönden döndür. Sapın yüzleri düz ve dik olmalı. Uç, ortasında görünür bir delik olan net bir eşkenar dörtgen olmalı. Vida tanınmalı. Kenarlar erimiş ya da şişkin görünmemeli. Ağda delik olmamalı. Meshy'nin kendi ölçümleri bile genel orantıda %81, yüzey detayında %59,8 başarı gösteriyor ([3D Printing Industry](https://3dprintingindustry.com/news/meshy-launches-meshy-7-image-to-3d-model-built-around-alignment-253786/)). Yani kaba şekil iyi çıkar, ince detay zayıf kalır. Bu yüzden kalın, net parçaları olan kateri seçtik.

### Bize göndereceklerin: kontrol listesi

- [ ] **`kater_tam.glb`**: kazanan model, uç takılı (GLB, PBR, 2K, en yüksek detaylı üçgen ağ)
- [ ] **`kater_bos_cep.glb`**: aynı kater, uçsuz ve vidasız (çok önerilir; yapabildiysen)
- [ ] Araç verdiyse aynı modelin dokusuz veya en yüksek poligonlu sürümü
- [ ] Referans görseller: orijinal fotoğraf(lar) ve temizlenmiş PNG(ler), en az 2048 px
- [ ] Hangi aracı, hangi sürümü (ör. "Rodin Gen-2.5") ve hangi planı kullandığın; ticari kullanımı gösteren plan veya lisans sayfasının ekran görüntüsü
- [ ] (İsteğe bağlı) Diğer araçlardan 2–3 önizleme ekran görüntüsü
- [ ] Fotoğraftaki gerçek ürünün markası ve kodu (ör. "PCLNR 2525M12" ve uç "CNMG 120408-xx + kalite")
- [ ] "Wunher" kutusunun veya etiketinin fotoğrafı ve aşağıdaki açık soruların cevapları

### Model gelince biz ne yapacağız

| Adım | Ne yapıyoruz | Sonucu |
|---|---|---|
| 1. Kontrol | Üçgen sayısı, doku boyutları ve delikler incelenir (gltf-transform) | Sorun varsa hemen yeni üretim isteriz |
| 2. Hizalama | Sap ekseni düzgün dursun diye model döndürülür, gerçek boyuna (150 mm) ölçeklenir, dönme merkezi ortalanır | Model ekranda kendi ekseninde doğal döner |
| 3. Hafifletme | ~30–80 bin üçgene sadeleştirme, meshopt sıkıştırma, WebP dokular; parçalar birleştirilmez | Hedef ~1–1,5 MB, en fazla 2–3 MB; telefonda hızlı açılır |
| 4. Malzeme | Yapay zekânın dokuya "boyadığı" sahte yansımalar atılır. Yerine gerçek metal malzeme (MeshPhysicalMaterial) gelir: gövde koyu çelik, uç TiN altını. Işık ortamı olarak 0 KB'lık stüdyo ortamı (RoomEnvironment) kullanılır | Model dönerken ışık gerçekçi akar |
| 5. Uç ve vida | CNMG 120408 ve vida ISO ölçülerinde kodla üretilir: 80° eşkenar dörtgen, IC 12,7 mm, 4,76 mm kalınlık, R0,8 köşe, ortada delik | Patlatılmış görünüm mümkün olur |
| 6. Yazı | İstersen "AKSOY" yazısı yapay zekâyla değil, çıkartma (decal) olarak eklenir | Keskin, okunur yazı |
| 7. Poster ve yedek | Aynı sahneden açılış açısında poster görseli (AVIF/WebP) alınır; gerekirse zayıf cihazlar için 48–60 karelik hafif kare dizisi | Hiçbir cihazda boş ekran olmaz |
| 8. Test | Lighthouse mobil testi, gerçek iPhone Safari, orta seviye bir Android | Gerçek kullanıcıda akıcı çalışır |

Uç ölçüleri ISO 1832'den geliyor: 80° şekil ([Cutwel](https://www.cutwel.co.uk/blog/learn-the-turning-tool-iso-code-system)), "12" kodunun IC 12,7 mm'ye karşılık gelmesi ([Mitsubishi](https://www.mmc-carbide.com/permanent/courses/85/insert-turning-identification-code.html)), "04" kodunun 4,76 mm kalınlık olması ([Sumitomo katalog B](https://www.sumitool.com/en/downloads/cutting-tools/general-catalog/assets/pdf/b.pdf)). Sıkıştırma aracının ayarları araştırma ortamında yerel olarak doğrulandı (gltf-transform 4.5.1, [npm](https://www.npmjs.com/package/@gltf-transform/cli)). Bu aşamanın en önemli kuralı şu: yapay zekâ modelinin dokusuna gömülü yansımalar model dönerken yanlış görünür. Premium metal görüntüsünü kütüphane seçimi değil, malzemeyi kodda baştan kurmak sağlar.

### Yapay zekâ başaramazsa üç B planı

**Birinci B planı, üreticinin CAD modeli.** En yüksek doğruluğu bu verir. ISCAR e-CAT'te ürün başına STP/DXF indirilebiliyor ([ISCAR](https://www.iscar.com/eCatalog/Index.aspx)). Tungaloy ISO 13399 uyumlu "Light" ve "Detail" STEP sunuyor. Gühring'in PARTcommunity portalında 50.000'den fazla model var ([Gühring](https://guehring.com/en/service/digital-services/cad-and-cutting-data/)). Korloy Haziran 2025'ten beri MachiningCloud'da 2D/3D modeller yayımlıyor ([MachiningCloud](https://www.machiningcloud.com/korloy-cutting-tools-now-available-on-machiningcloud-enhancing-digital-tooling-for-manufacturers-worldwide/)). ToolsUnited 45'ten fazla üreticinin 1,1 milyon ürününü topluyor; arama ücretsiz, hesap açınca 21 kredi veriliyor ([ToolsUnited](https://info.toolsunited.com/)). "Detailed" STEP dosyası genelde gövde, uç ve vidayı zaten ayrı parçalar olarak içeriyor. Biz bunu `cascadio` ile GLB'ye çeviririz ([cascadio](https://github.com/trimesh/cascadio)). Ama lisans engeli var: bu modeller CAM simülasyonu için yayımlanıyor ve Sandvik'in yasal notu ticari kullanımı yazılı izne bağlıyor ([Sandvik](https://www.sandvik.coromant.com/en-us/aboutus/pages/legal-notice.aspx)). Diğer markaların şartları okunamadı. Bu yolu kullanmadan önce markadan veya tedarikçinden yazılı izin alınmalı ve logolar temizlenmeli.

**İkinci B planı, tamamen kodla üretilmiş bir kater ve uç.** Kater gövdesi kutu biçiminde bir sap ve pahlı bir baştan oluşur. Böyle bir model birkaç KB tutar ve lisans sorunu yoktur, ama yapay zekâ modelinin verdiği "gerçek ürün" dokusundan yoksundur.

**Üçüncü B planı, vitrinde MGEHR'de ısrar etmek.** Bunu istersen aynı süreci kullan. Bıçak gibi başı gösteren yandan üç çeyrek bir açı seç, daha fazla yeniden üretim yapmayı göze al; küçük kanal ucunu biz kodla ekleriz. Prompt 1'deki ürün tarifinin yerine şunu koy:

```
a parting/grooving tool holder MGEHR1616-2: a square 16x16 mm straight steel shank about 100 mm long; at the front a tall thin blade-like head holding a small 2 mm wide carbide grooving insert clamped by an integral jaw; a clamp screw with hex socket on the top face; no text.
```

## Katalog fiyatla değil, kodla ve hızlı teklifle kazanır

Türk pazarında arama sonuçları üç gruba ayrılıyor ([rakip taraması](https://www.akiteknik.com/urun/iscar-cnmg-120408-pp-ic907)):

- **Fiyat gösteren online mağazalar** kod ve "fiyat" aramalarını tutuyor. Örneğin Akiteknik'te Iscar CNMG 120408 çeşitleri 6,01–11,00 EUR + KDV.
- **Pazaryerleri** (n11, cimri) genel aramaları tutuyor.
- **Yetkili bayilerin çoğu** http üzerinden açılan eski `.html` siteler ve PDF kataloglarla kalmış ([Temak](http://www.temak.com.tr/tr/kesicitakimlar)).

Fiyat göstermeyen Aksoy'un "fiyat" aramalarında kazanması zor. Asıl fırsat şurada: her ürün koduna ayrı bir sayfa açmak; "teklif", "stok" ve "muadil" gibi niyet kelimelerini hedeflemek; hesaplayıcılar ve rehberlerle bilgi aramalarını kazanmak. Hepsinin üstüne de bir yetkili bayinin güven sinyallerini koymak: saha desteği, bölge, yanıt süresi. TÜİK verisine göre 2025'te Türkiye'de insanların **%88,6'sı** mesajlaşmada WhatsApp kullandı ([Turkish Minute](https://turkishminute.com/2025/08/27/turkeys-internet-use-hits-90-9-percent-whatsapp-most-popular-app-turkstat/)). Teklifi WhatsApp'a bağlamak, müşterinin zaten kullandığı kanalı seçmek anlamına geliyor.

### Site haritası: on bir sayfa tipi, üç aşama

| Sayfa | Adres örneği | İçerik | Aşama |
|---|---|---|---|
| Ana sayfa (vitrin) | `/` | 3D kaydırma hikâyesi, kategori kartları, markalar (düz yazıyla), güven sinyalleri (hizmet bölgesi, yanıt saati), WhatsApp | 1 |
| Katalog | `/katalog/` | Ana kategoriler, kod araması | 1 |
| Kategori | `/katalog/tornalama/torna-elmas-uclari/` | Filtreler, ızgara ⇄ tablo görünümü | 1 |
| Ürün | `/urun/iscar-cnmg-120408-pp-ic907/` | Galeri, teknik tablo, ISO çipleri, uyumlu ürünler, "Teklife ekle" | 1 |
| Teklif Sepeti | `/teklif-sepeti/` | Kod, adet, not; WhatsApp'a gönder | 1 |
| İletişim, künye, KVKK | `/iletisim/`, `/kunye/`, `/kvkk-aydinlatma-metni/`, `/gizlilik-ve-cerez-politikasi/` | Yasal bilgiler | 1 |
| Teknik araçlar | `/hesaplama/kesme-hizi-devir/`, `/hesaplama/ilerleme-hesabi/`, `/hesaplama/kilavuz-matkap-capi/`, `/hesaplama/iso-kod-cozucu/` | Hesaplayıcılar ve kod çözücü; sonuçtan filtreli kataloğa link | 2 |
| Marka sayfaları | `/marka/iscar/` … `/marka/deskar/`, `/marka/sant/` | Marka tanıtımı, tedarik edilen ürün aileleri, "Resmi katalogda gör" linki, marka uyarı metni | 2 |
| Blog | `/blog/torna-elmas-uc-kodlari-nasil-okunur/` | Kod çözme, hesaplama, seçim, sorun giderme yazıları | 3 |
| Muadil sayfaları | `/muadil/cnmg-120408/` | "CNMG 120408 muadilleri: Iscar / Korloy / Tungaloy / Kyocera" | 3 |
| Bölge ve sektör (gerçekse) | `/bolge/kocaeli/`, `/sektorler/kalip/` | Sahada hizmet verilen yerler; Q Industrial'daki "Sektörler" fikri | 3 |

Adreslerde Türkçe karakterler ASCII'ye çevrilir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u). Google adreslerde kitlenin dilini ve "gerekirse harf çevrilmiş kelimeleri" kullanmayı öneriyor ([Google](https://developers.google.com/search/docs/crawling-indexing/url-structure)). Üst sıralardaki Türk rakipler de `karbur-freze`, `elmas-uclar` gibi adresler kullanıyor.

### Kategori ağacı ustanın dilini konuşmalı

Türk bayileri ve markaların Türkçe siteleri ürünleri işleme türüne göre diziyor. ISCAR Türkiye'nin ana menüsü şöyle: "Kesme & Kanal Açma", "Tornalama", "Minyatür", "Delik Delme", "Frezeleme", "Takım Tutucular", "Diş Çekme" ([ISCAR TR](https://www.iscar.com.tr/tr-tr/products/turning)). Kyocera'nın Türkçe kataloğu da benzer harfli bölümlerle ilerliyor ([Kyocera-Bilginoğlu](https://www.kyocera-bilginoglu.com.tr/images2/img/1670/Image/icindekiler.pdf)). Sahada kullanılan kelimeler bunlar: "kater" (takım tutucu), "elmas uç" (karbür kesici uç için yaygın ağız), "parmak freze", "tarama çakısı", "kılavuz" (sıkça "klavuz" diye yazılıyor), "pens" ve "U-drill" ([Çelik Kesici Takımlar](https://www.celikkesicitakimlar.com/torna-elmas-uc-kodlari-nasil-okunur-ccmt-wnmg-dnmg-rehberi/), [CNC Marketi](https://www.cnc-marketi.com/kater-nedir-kater-cesitleri-kullanim-alanlari/)). Site içi arama "kılavuz ~ klavuz", "kesici uç ~ karbür uç ~ elmas uç ~ insert", "U-drill ~ takma uçlu matkap" ve "diş açma ~ diş çekme" eşleşmelerini aynı kabul etmeli.

| Ana kategori | Alt kategoriler |
|---|---|
| Tornalama | Torna elmas uçları (negatif: CNMG, DNMG, SNMG, TNMG, VNMG, WNMG; pozitif: CCMT, DCMT, SCMT, TCMT, VCMT, VBMT, RCMT; sermet, seramik, CBN & PCD), dış çap tornalama katerleri, iç çap katerleri / baralar, kartuşlar, minyatür takımlar |
| Kesme ve Kanal Açma | Kanal ve kesme uçları (MGMN…), dış çap kanal katerleri (MGEHR/L), iç çap kanal katerleri (MGIVR/L), alın kanal katerleri, kesme lamları ve lam tutucular |
| Diş Açma | Diş açma uçları, diş açma katerleri, diş frezeleri, kılavuzlar (helis, düz, form, el, karbür), paftalar |
| Frezeleme | Freze uçları (APMT, SEKT, ONMU, RPMT, LNMU…), takma uçlu frezeler (tarama çakısı, 90° köşe, kopya, yüksek ilerleme, disk/T-kanal, pah), karbür parmak frezeler, HSS parmak frezeler, arborlar |
| Delik Delme | Karbür matkaplar, HSS/HSS-E matkaplar, takma uçlu matkaplar (U-drill), değiştirilebilir başlıklı matkaplar, punta matkapları |
| Delik İşleme | Raybalar, baralama kafaları, havşa ve pah takımları |
| Takım Tutucular ve Bağlama | ER pens tutucular, hidrolik, shrink fit, freze mandrenleri, weldon, kılavuz tutucular, VDI/BMT taret tutucuları, ER pensler, çekme civataları (arayüz filtresi: BT30/40/50, SK40/50, HSK-A63/A100, CAT40) |
| Aksesuar ve Yedek Parça | Vida, kilit, kıskaç, altlık, torx anahtar, tork anahtarı, soğutma nozulu |

Bazı niş adlar ("kesme lamı", "alın kanal kateri", "kopya frezesi" gibi) yaygın kullanılıyor ama kaynakla doğrulanmadı. Yayından önce 1–2 bayi sitesinde kontrol edilecek.

### Filtreler, ürün kartı ve ürün sayfası

Baymard'ın e-ticaret araştırmaları birkaç net kural koyuyor: her filtre seçeneğinin yanında sonuç sayısı görünmeli, aynı kategoride çoklu seçim yapılabilmeli, uygulanan filtreler kaldırılabilir çipler olarak görünmeli ve kategoriye özel teknik filtreler olmalı ([Baymard](https://baymard.com/blog/ecommerce-filter-ui)). Sitelerin %38'i listede gösterdiği bilgiyle filtre sunmuyor ([Baymard](https://baymard.com/blog/have-filters-for-list-item-info)). B2B'de teknik veri yoğun ürünler için **tablo görünümü** özellikle etkili ([Baymard](https://baymard.com/ecommerce-design-examples/product-table)).

Aksoy kataloğunda filtreler şunlar olacak:

- Marka
- İşlem
- **ISO malzeme grubu**: P mavi, M sarı, K kırmızı, N yeşil, S turuncu, H gri. Bu renkleri her büyük üretici uç kutularına basıyor, yani usta onları zaten tanıyor ([Destiny Tool](https://www.destinytool.com/iso-513-color-code-cnc-cutting-tools.html)).
- Uç şekli (küçük şekil ikonlarıyla)
- Talaş kırıcı
- Kalite (grade)
- Kaplama (CVD/PVD; TiN/TiAlN/AlTiN)
- Köşe radyüsü (0,2 / 0,4 / 0,8 / 1,2)
- Katerler için sap ölçüsü (1616, 2020, 2525, 3232) ve yön (sağ/sol)
- Döner takımlar için çap aralığı, ağız sayısı ve L/D

Uçlarda varsayılan görünüm tablo, kater ve matkaplarda ızgara olacak; kullanıcı ikisi arasında geçiş yapabilecek.

**Ürün kartında** şunlar bulunur: düz zeminde ürün görseli, küçük marka adı, eş genişlikli (mono) yazıyla ürün kodu, ISO malzeme çipleri, 3–4 temel ölçü, adet seçiciyle "Teklife ekle" butonu ve "Detay" linki.

**Ürün sayfasında** şunlar bulunur:

- Galeri
- Teknik tablo (mobilde iki kolonlu liste)
- "Uygun malzemeler" çipleri
- Uyumlu kater veya uçlar
- Resmi katalog linki
- Ekranın altına yapışık "Teklife ekle · WhatsApp'tan sor" çubuğu
- 4 ürüne kadar yan yana kıyaslama

Kater ile uç arasındaki uyum ISO kodundan hesaplanabiliyor. Örneğin PCLNR 2525M12, delikli her CN..1204.. ucunu (CNMG/CNMA 1204xx) alır.

### Teklif Sepeti tek bir WhatsApp mesajına dönüşür

Sepet tarayıcıda saklanır (localStorage) ve yandan açılan bir panelde kod, marka, adet ve not gösterir. İsteğe bağlı olarak firma, şehir ve tezgâh/malzeme bilgisi de eklenebilir. "WhatsApp ile teklif al" butonu tüm listeyi tek bir mesaja çevirir ve `https://wa.me/905356101989?text=...` adresini açar. Numara uluslararası biçimde, artı, boşluk ve tire olmadan yazılır; metin UTF-8 ile kodlanır, satır sonu `%0A` olur ([BusinessChat](https://help.businesschat.io/en/articles/6517838-how-to-build-a-whatsapp-click-to-chat-url-wa-me)). Mesajı yine de müşteri kendisi gönderir; site müşteri adına mesaj atamaz. Mesaj örneği:

```
Merhaba Aksoy Kesici Takımlar, aşağıdaki ürünler için fiyat/stok teklifi rica ediyorum:
1) Iscar CNMG 120408-PP IC907 – 20 adet
2) Korloy MGMN 200-G PC9030 – 10 adet
Firma: …   Şehir: …
(Kaynak: aksoykesici.com.tr/teklif-sepeti)
```

WhatsApp metni için resmî bir karakter sınırı bulunamadı. Üçüncü taraf rehberler ~1.000 karakterde kesilme olduğunu söylüyor. Her Türkçe karakter kodlanınca 6 karaktere çıkıyor. Bu yüzden ~20–25 satırdan sonra mesaj "… ve X kalem daha" diye kısalacak, yanında da bir "Listeyi kopyala" butonu olacak. Mobilde ekranın altında güvenli alana uyumlu, yapışık bir çubuk olacak: [Ara] [WhatsApp] [Teklif Listesi (3)]. WhatsApp yeşili #25D366 üzerine beyaz yazı okunabilirlik testinden geçmiyor (2,0:1); bu yüzden koyu yazı kullanılacak (9,1:1). Butonun yanında yanıt saatleri yazacak (örneğin "Hafta içi 08:30–18:30"). Üçüncü taraf WhatsApp eklenti scriptleri yüklenmeyecek, çünkü çerez bırakabiliyorlar. Hangi sayfanın teklif getirdiğini görmek için mesajın sonuna kaynak etiketi eklenecek. Tıklamalar da çerezsiz biçimde `/wa?src=...` yönlendirmesiyle sayılacak. Senin tarafında WhatsApp Business uygulamasında 500 ürünlük bir katalog ve 50 hazır yanıt kurulabilir; örneğin `/fiyat`, `/stok`, `/teslimat` ([InstantReply](https://www.instantreply.co/blog/whatsapp-catalog-guide-2026)). Butonların adı bilinçli olarak "Teklif Sepeti" ve "Teklif İste" olacak; asla "Sipariş Ver" denmeyecek. Bunun hukuki nedeni ETBİS ve aşağıda açıklanıyor.

### Ürün verisi: bugün dosya, yarın Google Sheets

Ürün verisini nasıl yöneteceğine henüz karar vermedin; şimdilik karar vermene gerek yok. İlk aşamada ürünleri bir JSON dosyasında biz tutarız. Astro her ürün için sayfayı derleme sırasında otomatik üretir; bu yaklaşım ~5.000 ürüne kadar rahat ölçekleniyor ([Solita](https://dev.solita.fi/2024/12/02/building-static-websites-with-astro.html)). Sonraki aşamada telefondan düzenleyebileceğin bir **Google Sheets** tablosuna geçilir: her satır bir ürün olur, sen "Yayınla" dediğinde site yeniden derlenir ([örnek akış](https://akashrajpurohit.com/blog/your-next-backend-could-just-be-a-google-sheet/)). Blog için telefondan görsel düzenleme imkânı veren TinaCMS (2 kullanıcıya kadar ücretsiz) uygun ([Lucky Media](https://www.luckymedia.dev/insights/tina-cms)). Sanity gibi güçlü sistemler ancak binlerce ürün ve çok sayıda editör olursa gerekir. Ürün kaydı baştan doğru alanlarla kurulacak: kod, marka, ISO kodunun ayrıştırılmış alanları, ölçüler, kalite, kaplama, ISO malzeme grupları, uyumluluk ve muadiller.

## Hesaplayıcılar ve ISO kod çözücü sitenin teknik kozu olur

Üretici sitelerinin hesaplayıcıları çoğunlukla İngilizce. Kennametal'in Türkçe hız/ilerleme hesaplayıcısı ise iyi bir örnek ([Kennametal TR](https://www.kennametal.com/tr/tr/resources/engineering-calculators/miscellaneous/speed-and-feed.html)). Aksoy'un araçları her sonuçta filtreli kataloğa bağlanacak ("Bu koda uygun ürünleri göster"); böylece hesaplayıcı satışa hizmet edecek.

| Araç | Ne yapar | Temel formül / veri | Doğrulama durumu |
|---|---|---|---|
| Kesme hızı ↔ devir | Çap ve kesme hızından devir sayısını (veya tersini) bulur; tezgâhın maksimum devrinde uyarı verir | n = 1000·vc / (π·D) ([Sandvik](https://www.sandvik.coromant.com/en-us/knowledge/machining-formulas-definitions/general-turning-formulas-definitions), [Makine Eğitimi](https://www.makinaegitimi.com/tornada-kesme-hizi-ve-devir-sayisi/)) | Doğrulandı |
| İlerleme hesabı | Tornalama vf = fn·n; frezeleme vf = fz·z·n; kılavuz vf = P·n | Sandvik ve Türkçe kaynaklar | Formüller doğrulandı |
| Talaş kaldırma ve güç | Q = vc·ap·fn; Pc = vc·ap·fn·kc / 60.000 | Sandvik | Formül doğrulandı; malzemeye göre kc değerleri doğrulanmadı |
| Kılavuz matkap çapı | M3–M24 kaba ve ince diş için matkap çapı | Kural: diş çapı − hatve (M10×1,5 → 8,5 mm) ([Taha Özel](https://tahaozel.com/metrik-dis-tablosu/)) | Kural doğrulandı; tablonun çoğu hesaplandı, form kılavuz tablosu yok |
| ISO uç kod çözücü (ISO 1832) | "CNMG 120408-MA" kodunu harf harf açıklar, uç şeklini çizer | Pozisyon 1–7 tabloları; tire sonrası ek markaya özel | Ana pozisyonlar kaynaklı; bazı tolerans ve tip harfleri doğrulanmadı |
| Kater kod çözücü (ISO 5608) | "PCLNR 2525M12" kodunu açıklar | Bağlama, şekil, yaklaşma açısı, yön, sap, boy | Ana harfler kaynaklı; boy harfleri tablosu doğrulanmadı, E tipinde kaynaklar çelişkili |
| Başlangıç kesme değerleri | ISO grubuna göre önerilen vc aralığı | Örneğin Korloy NC3120 çelikte 120–370 m/dk ([Korloy](https://www.korloy.com/en/ebook/NC3220(EI)/assets/contents/download.pdf)), Tungaloy T9215 120–400 m/dk ([Tungaloy](https://catalog.tungaloy.com/Grade.aspx?grade=T9215&item=6774104&fnum=1015&mapp=ML&Lang=EN&GFSTYP=m)) | P ve M kısmen kaynaklı; K/N/S/H değerlerinin çoğu tahmin, "Başlangıç değeri — markanın katalog değeri esastır" uyarısı şart |

Kod çözücüde iki tuzak var. Birincisi: CNMG 120408'deki "12" iç teğet daire çapı değil, **kesme kenarı uzunluğu** (~12,9 mm). IC 12,7 mm'ye karşılık gelir ama aynı şey değildir; bazı kaynaklar bunu karıştırıyor. İkincisi: MGEHR ve MGMN gibi kodlar ISO değil. Bunlar "Üretici kodlaması (ISO dışı)" olarak gösterilecek ve harf harf ISO anlamı uydurulmayacak. Yayından önce doğrulanmamış tabloların hepsi bir ana kaynakla (ISO metni veya Sandvik/Mitsubishi kod anahtarı) kontrol edilecek.

### Blog ve SEO: kod önde, "elmas uç" dilinde

Türk rakipler "nasıl okunur", "nedir", "nasıl hesaplanır", "neden kırılır" kalıbında yazılar yayımlıyor. Bu, aramanın orada olduğunu gösteriyor; ancak arama hacmi verisi alınamadı. Örnekler: "Torna Elmas Uç Kodları Nasıl Okunur?" ([Çelik Kesici](https://www.celikkesicitakimlar.com/torna-elmas-uc-kodlari-nasil-okunur-ccmt-wnmg-dnmg-rehberi/)), "Kılavuz Kırılmasının En Önemli 10 Nedeni" ([Ata Teknik](https://atateknik.com.tr/blog/kilavuz-kirilmasinin-en-onemli-10-nedeni-ve-cozumu/)), "PVD mi, CVD mi?" ([Çelik Kesici](https://www.celikkesicitakimlar.com/pvd-vs-cvd-kaplama-farklari-nedir/)). Aksoy'un blogu beş başlık altında kurulacak:

- **Kod çözme**: "CNMG Uç Ne Demek?", "Torna Kateri Kodları Nasıl Okunur? (PCLNR, MCLNR, SDJCR)", "MGMN Kanal Ucu ve MGEHR Kanal Kateri"
- **Hesaplama**: "Kesme Hızı Nasıl Hesaplanır?", "Kılavuz Matkap Çapı Tablosu (M3–M24)"
- **Seçim rehberleri**: "ISO P-M-K-N-S-H Malzeme Grupları ve Renk Kodları", "Paslanmaz Çelik İşleme"
- **Sorun giderme**: "Kılavuz Neden Kırılır?", "Kesici Uç Aşınma Tipleri"
- **Sözlük**: "Sermet, CBN ve PCD Nedir?"

Her yazı ilgili hesaplayıcıya ve kategoriye bağlanacak.

Ürün başlıklarında kod en başta olacak, çünkü üst sıralardaki sayfalar böyle yapıyor ([Akiteknik](https://www.akiteknik.com/urun/iscar-cnmg-120408-pp-ic907), [CNR Takım](https://www.cnrtakim.com/urun/apmt-1604-pder-h2-kp1215-apkt-1604-elmas-uc)). Örnek başlık: `CNMG 120408-PP IC907 Iscar Torna Elmas Uç | Aksoy Kesici`. Parmak frezelerde ölçüler de başlığa girecek: `Ø6 x 45 x 100 Z4 TiSiN Karbür Parmak Freze`. Kod sayfa içinde hem boşluklu hem bitişik yazılacak (`CNMG120408` ve `CNMG 120408`).

Google'ın zengin sonuçları (yıldız, fiyat) konusunda gerçekçi olmak gerekiyor. Ürün snippet'i için `offers`, `review` veya `aggregateRating` alanlarından en az biri şart ([Google](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)). Mağaza listeleri için fiyatın sıfırdan büyük olması gerekiyor ([Google](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)). Fiyat göstermeyen bir katalog bu nedenle normalde zengin sonuç almaz. Sahte "0 TL" fiyat ya da uydurma yorum kesinlikle eklenmeyecek. Yine de Product işaretlemesi (kod, marka, teknik özellikler), Organization, LocalBusiness, BreadcrumbList ve Article kullanılacak.

Mağazan olmadığı için Google İşletme Profili'ni **hizmet bölgesi işletmesi** olarak kurmak, adresi gizlemek ve yaklaşık 2 saatlik sürüş mesafesi içinde 20'ye kadar hizmet bölgesi seçmek gerekiyor. Müşteri karşılamayan bir adresi göstermek, profilin askıya alınmasının yaygın bir nedeni ([Google İşletme Profili](https://support.google.com/business/answer/3038177?hl=en)). Site yalnızca Türkçe olduğu için hreflang gerekmez; `<html lang="tr">` ve `og:locale tr_TR` yeterli. En önemli SEO aracı Google Search Console olacak. TKT Industrial'ın yapay zekâ asistanıyla katalog derinliğinde yarışmak yerine netlikte, insana ulaşma hızında ve görsel kalitede öne çıkmak daha akıllıca.

## Graphite & TiN: karanlık sahnede metal, aydınlık sayfada veri

Görsel tasarımı bize bıraktın. Önerimiz karma bir yön. Vitrin, marka sayfaları ve alt bilgi **koyu grafit** zeminde olacak, çünkü metal ve karbür en iyi neredeyse siyah bir zeminde, kenardan gelen stüdyo ışığıyla okunur; Hubtown ve Oryzo'nun tek nesneli karanlık sahneleri bunun örneği. Katalog, teknik tablolar ve hesaplayıcılar ise okunabilirlik için **açık "teknik kâğıt"** zeminde olacak. Tek vurgu rengi **TiN altını**: gerçek bir kaplamanın rengi, yalnızca butonlarda ve aktif durumlarda kullanılacak. Kurumsal lacivert bilinçli olarak reddedildi; hem çok sıradan, hem de filtrelerdeki ISO-P mavisiyle çakışıyor. Okunabilirlik oranları araştırmada WCAG formülüyle hesaplandı.

| Renk | Hex | Kullanım (okunabilirlik oranı) |
|---|---|---|
| Grafit 950 | #0B0D10 | Koyu zemin: vitrin, alt bilgi |
| Grafit 900 | #12151A | Koyu yüzey, kartlar |
| Çelik 700 | #2A3139 | Koyu zeminde ince çizgiler |
| Çelik 300 | #A7B1BC | Koyu zeminde ikincil metin (9,0:1) |
| Çelik 050 | #E9EDF1 | Koyu zeminde ana metin (16,5:1) |
| **TiN altını** | **#D9A441** | Ana buton ve vurgu; üzerine koyu yazı (8,7:1) |
| TiN mürekkebi | #8A5F0A | Açık zeminde altın link/metin (5,2:1) |
| Kâğıt | #F4F5F6 | Katalog zemini |
| Mürekkep | #14171C | Açık zeminde ana metin (16,5:1) |
| Soluk mürekkep | #5B6672 | Açık zeminde ikincil metin (5,4:1) |
| ISO P / M / K / N / S / H | #1F5FBF / #F2C230 / #C62828 / #2E7D32 / #EF8A2B / #9AA3AD | Filtre çipleri (standart renklerin yaklaşık değerleri) |
| WhatsApp | #25D366 | Üzerine koyu yazı (9,1:1); beyaz yazı 2,0:1 ile geçmiyor |

Yazı tipleri: başlıklar ve büyük sayılar için **Space Grotesk**, arayüz ve metin için **IBM Plex Sans**. İkisinin de Türkçe desteği doğrulandı ([Fontsource](https://fontsource.org/fonts/space-grotesk/about), [Typographer](https://typographer.com/fonts/gf-ibm-plex-sans/)). Ürün kodları ve ölçüler için IBM Plex Mono kullanılacak. Mono fontun Türkçe desteği doğrulanmadı, ancak kodlar zaten ASCII. `<html lang="tr">` sayesinde büyük harfe çevirmede "KESİCİ" doğru yazılır, "KESICI" olmaz. Ondalıkta virgül kullanılacak ("0,8 mm") ve birimler tutarlı olacak (m/dk, dev/dk, mm/dev).

Süsleme teknik resimden gelecek: 0,5–1 px ince çizgiler, silik bir çizim ızgarası, modeldeki noktalara bağlı ölçü çizgileri (Ø, R, °, mm), teknik resim antetine benzeyen bir alt bilgi ("Ölçek 1:1 · Rev. 2026") ve TiN altını, TiCN mor-gri, AlTiN siyahından oluşan bir kaplama şeridi. Stok "dişli ve kıvılcım" görsellerinden uzak durulacak. Masaüstünde 12 kolonluk, 1200–1320 px genişliğinde bir ızgara kullanılacak. Mobilde 4 kolon ve 16 px kenar boşluğu olacak; katalogda filtreler mobilde alttan açılan bir panele dönüşecek.

## Sekiz marka adından altısı net, SANT büyük olasılıkla doğru, wunher kayıp

Ankette yazdığın adların hepsi araştırıldı. Sonuç aşağıda. Marka araştırmasında da sayfa indirmeleri engellendi; adres ve telefonlar arama özetlerinden geliyor, yayımlamadan önce ilgili sayfalardan kontrol edilmeli.

| Senin yazdığın | Gerçek marka | Güven | Türkiye'deki durumu | Fiyat konumu | Katalog / CAD kaynağı |
|---|---|---|---|---|---|
| İscar | **ISCAR** | Yüksek | ISCAR Kesici Takım Ticareti ve İmalatı Ltd. Şti., Gebze OSB, 1996 ([LinkedIn](https://tr.linkedin.com/company/iscar-kesici-takim-ticareti-ve-imalati-ltd-sti)) | Premium | e-CAT; STP/DXF ([ISCAR](https://www.iscar.com/eCatalog/Index.aspx)) |
| tungaalyo | **Tungaloy** (Japonya, 1934) | Yüksek | Tungaloy Kesici Takımlar A.Ş., Ümraniye/İstanbul ([Tungaloy TR](https://tungaloy.com/tr/)) | Premium / üst-orta | Genel katalog PDF'leri, e-katalog, ISO 13399 STEP, uygulama ([Tungaloy](https://tungaloy.com/publications/)) |
| guhring | **Gühring** (Almanya) | Yüksek | Gühring Takım San. ve Tic. Ltd. Şti., Dilovası; 2008'den beri İzmir'de üretim ve kaplama tesisi ([Gühring TR](https://guehring.com/tr/about-us/about-guehring-turkey/)) | Premium | PARTcommunity'de 50.000+ CAD, indirme sayfası ([Gühring](https://guehring.com/en/downloads/)) |
| korloy | **KORLOY** (Güney Kore) | Yüksek | Korloy TR Sanayi Dış Ticaret Ltd. Şti., İstanbul, 2019 ([Korloy TR](https://www.korloy.com/tr/intro/map_global.do)) | Orta / üst-orta | 2025–2026 e-kitap/PDF kataloglar ([Korloy](https://www.korloy.com/en/download/cata.do)); MachiningCloud |
| kyoto | **Kyocera** (Japonya) | Yüksek (~%90) | Kyocera Bilginoğlu Hassas Takımlar A.Ş., 2015 ortak girişimi ([Kyocera-Bilginoğlu](https://www.kyocera-bilginoglu.com.tr/hakkimizda-hakkimizda)) | Premium / üst-orta | Genel katalog (~130 MB PDF), CAD araması, ToolsUnited ([Kyocera](https://tool-global.kyocera.com/en/prdct/tool/catalog/)) |
| descar | **DESKAR** (Lifeng Precision Tools, Zhejiang, Çin) | Yüksek (~%90) | deskarturkiye.com ve pazaryerleri; uç başına ~55–150 TL ([Teknik Dükkan](https://www.teknikdukkanshop.com/marka/deskar)) | Bütçe | lftool.com ([Lifeng](https://www.lftool.com/products)); CAD bulunamadı |
| SANT (fotoğraf) | **Zhuzhou Sant Cutting Tools Co., Ltd.** (Hunan, Çin, 2011, ISO 9001) | Orta-yüksek (~%75) | Türk ithalatçısı bulunamadı | Bütçe | Made-in-China'da ücretsiz PDF kataloglar ([SANT](https://hnsant123.en.made-in-china.com/Product-Catalogs/)); CAD bulunamadı |
| wunher | **Bulunamadı** | Düşük | Adaylar: Wohlhaupter, Walter, WNT, Würth | — | **Kutu veya etiket fotoğrafı lazım** |

"Kyoto" adında bir karbür takım markası yok. Aramalar yalnızca Kyocera sonuçları döndürdü ([CNC Tools Depot](https://www.cnctoolsdepot.com/kyocera)). Kyocera'nın adı "Kyoto Ceramic"ten geliyor, karışıklığın nedeni muhtemelen bu (bu bilgi araştırma sırasında doğrulanmadı). Bir uyarı: "Kyocera Türkiye" aramaları çoğunlukla yazıcı firmasını getiriyor; kesici takım tarafı Kyocera Bilginoğlu. "Descar" neredeyse kesin DESKAR. Türkiye'deki "Deskar Güvenlik Teknolojileri" ise ilgisiz bir güvenlik firması. Alibaba'da "For Deskar" diye satılan uyumlu veya yeniden etiketlenmiş ürünler dolaşıyor ([Alibaba](https://www.alibaba.com/product-detail/DESKAR-SNMX1205ANN-F57-LF6018-Carbide-Milling-1600316701023.html)).

SANT'ın kırmızı elmas logosu görsel olarak eşleştirilemedi, çünkü görseller indirilemedi; güven bu yüzden ~%75. Ayrıca dikkat: MGEHR1616-2, birçok Çinli satıcının kullandığı jenerik bir kalıp. Bir Amazon ilanında bu katere Korloy'un kalite adını taşıyan "MGMN NC3030" uçlar eşleştirilmiş ([Amazon](https://www.amazon.com/MGEHR1616-1-5-MGEHR1616-2-MGEHR1616-3-MGEHR1616-4-Semi-Finishing/dp/B09763PDC2)). Bu, taklit ve benzer ürün riskine işaret ediyor.

"Wunher" adında bir kesici takım markası, İngilizce ve Türkçe aramaların hiçbirinde çıkmadı. Arama motoru bu kelimeyi Würth veya Wohlhaupter'e yönlendiriyor. Wohlhaupter hassas baralama kafaları yapan bir Alman markası ve Türkiye'de "yetkili değiliz ama orijinal satıyoruz" diyen satıcılar üzerinden bulunuyor ([Yursat](https://www.yursat.com.tr/wohlhaupter.html), [Allied](https://www.alliedmachine.com/Products/Boring/Wohlhaupter/Wolhaupter-Inserts.aspx)). Hiçbir aday kesin değil. **Lütfen bir kutunun veya etiketin fotoğrafını gönder.**

### Ürün yelpazesi markaların kendi kategorilerinden kurulur

Her markanın güçlü olduğu alanlar katalogda öne çıkarılacak:

- **Gühring Türkiye:** karbür parmak freze ve matkaplar, torna uçları, PCD/elmas takımlar, freze uçları, takma uçlu matkap ve frezeler ([Gühring TR](https://guehring.com/tr/about-us/about-guehring-turkey/)).
- **KORLOY:** katalogları "Solid Tools", "Rotating" ve "Turning" diye üçe ayrılıyor ([Korloy](https://www.korloy.com/en/download/cata.do)).
- **Kyocera:** sermet, kaplamalı karbür, seramik, PCD ve CBN üretiyor. Türkçe katalogda TN610/TN620 gibi sermet kaliteleri var ([Kyocera-Bilginoğlu Bölüm A](https://www.kyocera-bilginoglu.com.tr/imagess/f21000/kataloglar/bolum-a.pdf)).
- **DESKAR:** çoğunlukla CVD kaplamalı tornalama, frezeleme ve kanal uçları; LF6018, LF6118 ve LF9218 kaliteleri var ([Deskar Türkiye](https://www.deskarturkiye.com/urunler/16irm-1-0-iso-lf6118/)).
- **SANT:** dış ve iç tornalama katerleri, baralar, diş açma, kesme ve kanal takımları, freze çakıları, U-drill, uçlar ve karbür matkaplar ([SANT](https://hnsant123.en.made-in-china.com/company-Zhuzhou-Sant-Cutting-Tools-Co-Ltd-.html)).

Markaların seri adları (ör. ISCAR'ın NEOLOGIQ'i, Tungaloy'un TungTurn'ü) araştırmada yalnızca genel bilgi olarak geçti. Güncel kataloglardan kontrol edilmeden sitede yayımlanmayacak. Türk bayileri bunların yanında sıkça Sandvik Coromant, Walter, Ceratizit/WNT/Komet ve ZCC-CT da taşıyor ([Metal Dünyası](https://metaldunyasi.com.tr/tr/roportajlar/64/ceratizit-group-team-cutting-tools-ekipleriyle-dunyanin-heryerinde.html)); ileride genişleme için aday.

### Görseller: katalog fotoğrafı serbest değil, kendi çekimin en güvenlisi

Gerçek ürün görselleri için pratik kaynaklar markaların ücretsiz katalogları:

- Tungaloy PDF'leri
- Korloy e-kitapları
- Kyocera genel kataloğu
- Gühring indirme sayfası
- ISCAR e-CAT
- SANT'ın Made-in-China PDF'leri
- Mitsubishi'nin açıkça "CAD Data / Image Data" indirme sayfası; markalar arasında bulunan tek açık görsel indirme sayfası ([Mitsubishi](https://www.mmc-carbide.com/us/download/others/cad))
- ToolsUnited, verileri arasında fotoğrafları da sayıyor ([ToolsUnited](https://cimsource.com/en/toolsunited/))

Ancak hiçbir marka için herkese açık bir logo kullanım kılavuzu ya da bayilere görsel lisansı bulunamadı. Bir fotoğrafın telif hakkı (FSEK) marka hukukundaki "tükenme" ilkesinin kapsamına girmez. Orijinal ürünü satma hakkın, üreticinin fotoğrafını kopyalama hakkı vermez; bu değerlendirme genel hukuk bilgisine dayanıyor, ayrıca araştırılmadı. En güvenli iki yol var: ürün aldığın Türkiye şirketinden veya bayiden yazılı izin almak (bayiler genelde pazarlama kiti alır) ya da elindeki orijinal stoğun fotoğrafını kendin çekmek. 3D model için kuracağın ışık çadırı tam olarak bu işe de yarar. Tüm ürünleri aynı açıdan, beyaz ya da açık gri zeminde çekersen katalog tutarlı görünür. Çin pazaryerlerindeki DESKAR/SANT görselleri hem çok farklı kalitede hem de çoğu zaman başka satıcıların filigranını taşıyor; bunlar kullanılmamalı.

### "Yetkili bayi" demek izin ister, marka adını söylemek istemez

Türk hukukunda çerçeve dört maddeyle çiziliyor:

- **SMK m.7/5:** Malın türünü ve amacını belirtmek için marka adını dürüstçe kullanmak serbest ([Av. Emre Kurt](https://www.emrekurt.av.tr/blogs/2025/07/21/marka-haklari-nerede-biter-smk-m-7-5-marka-hakkinin-sinirlari/)).
- **SMK m.152:** Marka sahibinin rızasıyla piyasaya sürülmüş orijinal ürünlerin yeniden satışı engellenemez ("tükenme") ([Av. Emre Kurt](https://www.emrekurt.av.tr/blogs/2024/03/02/sinai-mulkiyet-kanunusmk-152-hakkin-tuketilmesi/)).
- **TTK m.55/1-a-2:** Yetkisi olmadan kendini "yetkili distribütör" veya "temsilci" gibi göstermek açıkça **haksız rekabet** sayılıyor; bu, web sitelerini de kapsıyor ([KUTEL Hukuk](https://www.kutelhukuk.com/blog/yetkili-satici-olmadigi-halde-bu-yonde-yapilan-tanitimlar-ve-haksiz-rekabet)).
- **SMK m.30:** Taklit markalı ürün satmak 1–3 yıl hapis ve adli para cezası gerektiren bir suç. Sektörden bir tacirin "bilmiyordum" savunması da zor kabul görüyor ([Anayasa Mahkemesi](https://www.anayasa.gov.tr/Kararlar/GenelKurul/Basvuru_Karari/2018-32.pdf)). Bütçe markalarında izlenebilir kanallardan alım yapmak ve faturaları saklamak bu yüzden önemli.

Yazılı bayilik anlaşması olmadığı sürece sitede şu ifadeler kullanılacak: "ISCAR, Tungaloy, Gühring, KORLOY, Kyocera, DESKAR ve SANT ürünleri tedarik edilir", "Orijinal ve faturalı ürün". Alt bilgide şu not yer alacak: "Tüm marka adları ve logolar ilgili sahiplerine aittir; yalnızca ürünleri tanımlamak amacıyla kullanılmıştır. Aksoy Kesici Takımlar, aksi belirtilmedikçe bu markaların yetkili temsilcisi değildir." Markalar logo yerine düz yazıyla gösterilecek. Alan adında marka adı geçmeyecek. Örnek davranışlar kaynaklarda net: Yursat, Wohlhaupter için yetkili olmadığını açıkça yazıyor; Günsoy ise Walter'ın gerçekten yetkili bayisi olduğu için "yetkili bayi" diyebiliyor ([Günsoy](https://gunsoymetal.com/)).

## Ödeme yoksa ETBİS yok, kendi alan adın yoksa Türkiye'de site yok

### Yasal kontrol listesi

| Konu | Ne yapacağız | Dayanak | Avukat teyidi |
|---|---|---|---|
| ETBİS | Kayıt gerekmez: sitede sözleşme veya sipariş kurulmuyor. Butonlar "Teklif Sepeti" ve "Teklif İste" olacak, asla "Sipariş Ver" olmayacak. İleride online sipariş eklenirse önce ETBİS kaydı | [Ticaret Bakanlığı SSS](https://ticaret.gov.tr/ic-ticaret/sikca-sorulan-sorular/elektronik-ticaret) | ⚖️ WhatsApp'a mesaj hazırlayan sepetin "sipariş" sayılmadığını teyit et |
| Künye | Ticaret unvanı (şahıs işletmesiyse sahibin adı ve işletme adı), MERSİS no veya vergi dairesi/no, adres, telefon, e-posta, KEP (varsa), ticaret sicil/oda kaydı | 6563 ve yönetmelik yorumları ([Erdem Varol](https://www.erdemvarol.com.tr/6563-sayili-kanun/)) | Önerilir |
| KVKK aydınlatma metni | Veri sorumlusu, amaç (teklif hazırlama, iletişim), hukuki sebep (m.5/2-c sözleşme, m.5/2-f meşru menfaat; açık rıza değil), alıcılar (Meta/WhatsApp, barındırma firması), yurt dışına aktarım, m.11 hakları. Link WhatsApp butonunun yanında olacak | 6698 m.10 | ⚖️ |
| Yurt dışına aktarım | 2024 değişikliğiyle (7499) açık rıza artık genel dayanak değil; rızaya dayalı aktarım yalnızca 1 Eylül 2024'e kadar kabul edildi. Standart sözleşme imzalanırsa 5 iş günü içinde Kurum'a bildirilmeli; bildirmemenin cezası 50.000–1.000.000 TL | [Güneş Partners](https://www.gunespartners.com/makale/yurt-disina-veri-aktarimi-7499-sayili-kanun), [Cottgroup](https://www.cottgroup.com/tr/blog/kvkk-gdpr/item/standart-sozlesme-bildirim-yukumlulugu-ve-yaptirimlari) | ⚖️ WhatsApp ve Cloudflare için uygun güvenceyi teyit et |
| Çerez | Çerezsiz analiz kullanılırsa ve tarayıcı belleği yalnızca sepet için kullanılırsa banner gerekmez (ikincil yorumlara göre). GA4, Meta Pixel ya da YouTube gömme eklenirse "Kabul / Reddet / Tercihler" butonları eşit görünürlükte olan bir banner zorunlu | [Esenyel Partners](https://www.esenyelpartners.com/tr/kvkk-cerez-rehberi-uyarinca-web-siteleri-icin-uyum-yol-haritasi/), [Dijilegal](https://dijilegal.com/blog/cerez-politikasi-kvkk-rehberi) | ⚖️ |
| VERBİS | Küçük işletmeler genelde muaf; 2026 eşikleri araştırılamadı | — | ⚖️ |
| Şirket web sitesi zorunluluğu | TTK 1524 yalnızca bağımsız denetime tabi sermaye şirketlerini kapsıyor; büyük olasılıkla Aksoy'u kapsamıyor | [MTHS](https://mths.net.tr/ttk-1524/) | Durumuna göre |
| Marka | "Yetkili bayi" yok, uyarı metni var, logo yalnızca izinle | Yukarıdaki bölüm | ⚖️ |

Bu tablodaki hiçbir madde hukuki danışmanlık değil; ⚖️ işaretli maddeler bir avukata veya KVKK danışmanına sorulmalı.

### Barındırma: Cloudflare Pages, ama ilk günden .com.tr ile

| Platform | Ücretsiz plan | Ticari kullanım | Türkiye'de alt alan adı | Karar |
|---|---|---|---|---|
| **Cloudflare Pages** | Sınırsız bant genişliği, ayda 500 derleme, derleme başına 20.000 dosya ([DEV](https://dev.to/david_viejo_4d48fdfa7cfff/cloudflare-pages-free-tier-limits-pricing-2026-1f8f)) | Yasak bulunamadı (şartlar doğrulanmadı) | pages.dev 25 Kasım 2025'te TFF kararıyla engellendi ([Webtekno](https://www.webtekno.com/cloudflare-pages-erisime-kapatildi-h207978.html)); 25 Ağustos 2026'da yeniden engellendi ([İFÖD](https://ifade.org.tr/engelliweb/cloudflare-pages-erisime-engellendi-2/)) | **Seçim, kendi alan adıyla** |
| Vercel Hobby | 100 GB | **Ticari kullanım yasak** ([Vercel](https://vercel.com/docs/plans/hobby)) | vercel.app: USOM 6 Aralık 2023, BTK 27 Mart 2024 ([İFÖD](https://ifade.org.tr/engelliweb/vercel-erisime-engellendi/)) | Uygun değil |
| Netlify Free | 300 kredi ≈ ayda ~15 GB (17 Nisan 2026'dan beri); aşılınca site durur ([Netli.fyi](https://netli.fyi/blog/netlify-free-plan-limits-2026)) | Belirsiz | netlify.app: BTK 21 Şubat 2025 ([İFÖD](https://ifade.org.tr/engelliweb/netlify-erisime-engellendi/)) | Uygun değil |
| GitHub Pages | 1 GB site, ayda 100 GB | Ticari işlem amaçlı siteler hariç tutuluyor ([GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | GitHub geçmişte Türkiye'de engellendi | Uygun değil |

"Önce ücretsiz alt alan adıyla başla, sonra alan adı alırız" planı Türkiye'de çalışmaz. Cloudflare'in kendi topluluğu da Türk kullanıcılara özel alan adı kullanmayı öneriyor; kullanıcılar pages.dev engelliyken özel alan adının çalıştığını doğruluyor ([Cloudflare Community](https://community.cloudflare.com/t/pages-dev-blocked-in-turkiye/861672)). 14 Eylül 2022'den beri TRABİS sistemiyle .com.tr alan adları belge istenmeden alınabiliyor ([Turhost](https://www.turhost.com/blog/trabisle-neler-degisiyor/)). İlk yıl kampanyalı fiyatlar yaklaşık 46–70 TL (örneğin Turkticaret'te 49,99 TL, [Turkticaret](https://www.turkticaret.net/domain-fiyatlari)); .com ise yılda ~562 TL ([Inetmar](https://www.inetmar.com/domain/domain-fiyatlari/)). Yenileme fiyatları alınamadı. Önerimiz **aksoykesici.com.tr** ya da **aksoykesicitakimlar.com.tr**; müsaitlik kontrol edilmedi. İstersen .com da alınıp .com.tr'ye yönlendirilebilir. .com.tr'yi Türk bir kayıt firmasından alıp DNS'ini Cloudflare'e yönlendireceğiz; Cloudflare'in kendisi .com.tr satmıyor olabilir (doğrulanmadı).

Cloudflare'in İstanbul ve İzmir'de veri merkezleri var ([Cloudflare](https://www.cloudflarestatus.com/locations)). Ancak topluluk raporlarına göre ücretsiz planda Türk trafiği zaman zaman Amsterdam veya Düsseldorf'a yönleniyor ([Cloudflare Community](https://community.cloudflare.com/t/high-latency-from-turkey-cloudflare-routes-requests-to-ams-dus-while-origin-respon/955422)). Bu yüzden site Turkcell, Vodafone ve Türk Telekom hatlarında test edilecek. Statik bir sitede sunucu konumundan çok sayfa ağırlığı önemli. Siteyi tamamen düz HTML olarak derleyeceğiz; Cloudflare IP'leri bir gün engellenirse site bir saat içinde İstanbul'daki ucuz bir hostinge taşınabilir. "Önce ücretsiz" hedefi böylece büyük ölçüde korunuyor: barındırma, analiz ve kütüphaneler 0 TL. Kaçınılmaz maliyet yalnızca alan adı (ilk yıl ~50–100 TL) ve muhtemelen 3D modeli indirmek için birkaç dolar.

### Ölçüm: çerezsiz analiz, banner'sız site

Cloudflare Web Analytics ücretsiz, çerez kullanmıyor ve parmak izi toplamıyor. Sayfa görüntülemelerini, kaynakları ve Core Web Vitals değerlerini veriyor, ama özel olay takibi yok ([Cloudflare](https://www.businesswire.com/news/home/20200929005178/en/Cloudflare-Announces-Web-Analytics-a-Privacy-First-Free-Alternative-for-All-Website-Owners), [Humblytics](https://humblytics.com/blog/website-analytics-without-cookies-complete-guide-for-2025)). WhatsApp tıklamalarını `/wa?src=...` yönlendirmesiyle sayacağız; gerekirse ayda 100 bin olaya kadar ücretsiz olan çerezsiz Umami Cloud eklenebilir ([Analytics-Alternatives](https://analytics-alternatives.com/compare/plausible-vs-umami/)). GA4, KVKK rehberine göre açık rıza ve banner gerektiriyor; her mobil ziyaretçiye banner göstermemek için kullanmayacağız. GoatCounter'ın ücretsiz planı ticari kullanıma kapalı, Plausible'ın ise ücretsiz planı yok.

## Neyi doğruladık, neyi doğrulayamadık

Altı araştırma kolunun hepsinde dış sitelerin sayfa indirmeleri ağ vekil sunucusunda engellendi ve ortak web arama kotası işin ortasında tükendi. Bu yüzden bulguların çoğu, bağlantısı verilen sayfaların **arama motoru özetlerinden** geliyor. Doğrudan erişilebilen kaynaklar ve araştırma ortamında yapılan yerel ölçümler daha güvenilir: npm paket sürümleri (three r186, GSAP 3.15, Astro 7.3.5), esbuild ile ölçülen paket boyutları, gltf-transform 4.5.1'in komut ayarları, MDN'in tarayıcı uyumluluk verisi (1 Ekim 2026) ve GitHub sayfaları. Aşağıdaki maddeler karar vermeden veya yayımlamadan önce canlı kaynaktan kontrol edilmeli.

| Konu | Doğrulanamayan nokta | Ne yapılmalı |
|---|---|---|
| Yapay zekâ 3D araçları | Fiyatlar, krediler, Rodin'in indirme başına kredi sayısı, Meshy ücretsiz kredisi (100 mü 200 mü), Hunyuan web platformunun ticari şartları, arayüz etiketleri | Ödemeden önce canlı fiyat ve şart sayfasına bak |
| Kıyaslamalar | Pixazo ile Sloyd çelişiyor; kesici takımlar için hiçbir test yok | Kendi önizleme kıyaslamanı yap |
| Görsel üretim modelleri | "Nano Banana Pro" ve "GPT Image 2.5" adları düşük otoriteli listelerden | Elindeki aracı kullan |
| Awwwards siteleri | Mobil davranış, yayında olup olmadıkları, Oryzo'nun ödül seviyesi | Telefonda tek tek aç |
| ISO tabloları | Bazı tolerans sınıfları (J/K/L/N/U), bazı 4. pozisyon harfleri, kater boy harfleri; E tipi için 60° ile 90° çelişkisi | Kod çözücüyü yayımlamadan önce ISO veya Sandvik kod anahtarıyla kontrol et |
| Hesaplayıcı varsayılanları | K/N/S/H kesme hızları ve kc değerlerinin çoğu tahmin; kılavuz tablosu büyük ölçüde hesaplandı; form kılavuz tablosu yok | Marka kataloglarıyla doldur |
| Markalar | Seri adları, SANT logosu, "wunher", logo ve görsel lisansları | Katalog kontrolü, senin fotoğrafın, yazılı izin |
| Barındırma | Cloudflare'in ticari kullanım şartı; vercel.app ve netlify.app engellerinin Ekim 2026'daki durumu; .com.tr yenileme fiyatı | Yayından önce kontrol |
| Hukuk | VERBİS eşikleri, güncellenmiş çerez rehberinin içeriği, WhatsApp sepetinin 6563 kapsamında "sipariş" sayılıp sayılmayacağı, FAQ zengin sonuçlarının güncel durumu | Avukat veya KVKK danışmanı |
| SEO | Arama hacimleri ve gerçek google.com.tr sıralamaları (arama aracı ABD merkezli) | Search Console, Google Trends, Keyword Planner |
| WhatsApp | Resmî metin uzunluğu sınırı (~1.000 karakter üçüncü taraf bilgisi) | Gerçek telefonda test |

## Senden yanıt beklediğim sorular

1. **Wunher** markasının bir kutusunun veya etiketinin fotoğrafını gönderebilir misin?
2. Hangi markalarla **yazılı bayilik veya distribütörlük** anlaşman var? Varsa o marka için "yetkili bayi" yazabilir, izin dahilinde logoyu kullanabiliriz.
3. Elinde fiziksel olarak bir **PCLNR (veya MCLNR/DCLNR) 2020 ya da 2525 kater ve CNMG ucu** var mı? Hangi marka? Fotoğrafını çekebilir misin?
4. İşletmen şahıs işletmesi mi, Ltd./A.Ş. mi? Künye için **ticaret unvanı, MERSİS veya vergi no, adres, e-posta ve KEP** (varsa) bilgileri neler?
5. Sahada hangi **şehirlere ve OSB'lere** gidiyorsunuz? Google İşletme Profili için en fazla 20 bölge seçebiliyoruz.
6. **Çalışma saatlerin** ve WhatsApp'tan ortalama dönüş süren ne kadar?
7. Alan adı tercihin ne (aksoykesici.com.tr gibi)? Alan adını sen mi alacaksın, birlikte mi alalım? TRABİS kimlik doğrulaması isteyecek.
8. İlk etapta katalogda kaç ürün olsun? En çok sattığın 50–100 kodun bir listesi (Excel ya da fotoğraf) var mı?
9. Ürün fotoğraflarını **kendi stoğundan çekebilir misin**, yoksa tedarikçinden pazarlama görseli ve izin alabilir misin?
10. Fiyat hiçbir zaman gösterilmeyecek mi? Bu kararın "fiyat" aramalarında görünmeyi zorlaştırdığını bilerek mi?
11. Aksoy'un hazır bir **logosu** (tercihen vektör dosyası) var mı?
12. Stok durumu ("stokta / sipariş üzerine") gösterilsin mi?
13. 3D modelin üzerine "AKSOY" yazısı eklensin mi?
14. Blog yazılarını kim yazacak, kim onaylayacak? Teknik içeriği senin kontrol etmen mümkün mü?

## Sonuç

Bu araştırmanın en önemli dersi şu: premium görünümü bütçe değil, **disiplin** yaratıyor. Ödüllü siteler tek nesneye, az bölüme ve doğru ışığa yaslanıyor. Aksoy için bu, yapay zekâya yalnızca iyi yaptığı işi (kalın, net bir kater gövdesi), koda da hassasiyet gerektiren işi (ISO ölçülerinde uç, vida, parmak freze) vermek anlamına geliyor. Projedeki en büyük tek risk 3D modelin kalitesi. İşi böyle bölmek bu riski en ucuz noktaya, yani ücretsiz önizlemelerle yapılacak bir kıyaslamaya indiriyor. Model hiç gelmese bile kodla üretilmiş parçalar ve poster görseli sayesinde vitrin ayakta kalıyor.

İkinci ders şu: Türkiye'ye özgü kısıtlar tasarımı doğrudan şekillendiriyor. Platform alt alan adlarının engellenmesi alan adını ilk günün işi yapıyor. ETBİS, butonların dilini ("Teklif Sepeti") belirliyor. Haksız rekabet kuralı marka sayfalarının tonunu belirliyor. KVKK, analiz aracını ve çerez banner'ını belirliyor. Rakiplerin zayıf kaldığı yer de tam olarak bu kesişim: üst sıradaki mağazalar fiyatla, yetkili bayiler eski PDF sitelerle yetiniyor. Kod düzeyinde aranabilen bir katalog, Türkçe teknik araçlar, tek dokunuşla WhatsApp teklifi ve kesici takım sektöründe Türkiye'de eşi görülmemiş bir 3D vitrin birlikte, fiyat yarışına girmeden fark yaratabilecek bir konum veriyor.

## Hazırım

Senden şunları bekliyorum:

1. Kontrol listesindeki **GLB dosyaları**: `kater_tam.glb` ve mümkünse `kater_bos_cep.glb`.
2. **Referans fotoğrafları**: orijinal ve temizlenmiş halleri.
3. Kullandığın aracın ve planın ekran görüntüsü.
4. Açık sorulardan özellikle **wunher fotoğrafı, yetkili olduğun markalar, künye bilgileri, hizmet bölgesi ve alan adı tercihi**.

GLB gelmeden de başlayabiliriz. İlk olarak Astro iskeletini, Graphite & TiN tasarım sistemini ve ana sayfa vitrinini kuracağız. CNMG ucu ve parmak freze kodla hazırlanırken kater yerine geçici bir model kullanacağız. Senin GLB'n gelince onu temizleyip, malzemelerini değiştirip yerine koyacağız. Aynı ilk teslimde Teklif Sepeti → WhatsApp akışı, bir örnek kategori ve SANT MGEHR1616-2 ile örnek ürün sayfası ile künye ve KVKK sayfaları olacak; hepsi kendi alan adında, Cloudflare üzerinde yayında. Ardından ISO kod çözücü ve hesaplayıcılar, marka sayfaları ve blog gelecek.

**Hazırım: modeli ve fotoğrafları gönderdiğin an başlıyoruz.**
