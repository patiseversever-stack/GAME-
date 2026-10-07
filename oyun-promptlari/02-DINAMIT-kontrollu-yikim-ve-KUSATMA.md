# DİNAMİT — Yapım Brifi (Claude Code otonom oyun stüdyosu görevi)

> Oyun 2/3 · Tür: kontrollü yıkım mühendisliği bulmacaları + sinematik fizik çöküşleri · Bağımsız mod: **KUŞATMA** (çizgi film topçu düellosu) · Öncelikli yön: dikey (yatay tam destek)
> Klasör: `games/dinamit/` · Hedef cihazlar: Xiaomi Mi 9T, iPhone 11, iPhone 13, Xiaomi 13 · Teknoloji: three.js r186 + WebGL2 + TypeScript + Vite
> **Bu dosyanın tamamı tek bir görevdir.** Baştan sona oku; sonra §0'daki protokole göre başla ve §11 Bitti Tanımı tamamen yeşil olana kadar durma.

**Belge içi tutarlılık kuralı:** Bu brif bölümler hâlinde paralel yazıldı. İki bölüm aynı sayı ya da kural hakkında çelişirse şu sırayla karar ver:
- Oyun kuralı ve denge değerinde §2 (GDD) esastır.
- Algoritma ve teknik uygulamada §4.G esastır.
- Ortak sözleşmelerde (§0, §5, §7, §9, §11) ortak çekirdek metni esastır.

Her çelişkiyi F1 fazında `docs/KARARLAR.md` dosyasına yaz ve tek bir değere bağla. Değeri veri dosyasında tut. Bilinen kararlar:
- **KUŞATMA:** Mermi listesi, AI karakterleri, yıldız eşikleri ve iki taç aynı anda düşerse uygulanacak beraberlik kuralı §2'de tanımlıdır; §4.G bunlara uyar. Rapier API adları niyet bildirir. Kodlamadan önce paketin `.d.ts` dosyasıyla doğrula.


---

## 0. Önce bunu oku: çalışma protokolü

**Rolün:** Bu belge bir oyun stüdyosu brifi. Sen bu projenin **Yapımcısı ve Teknik Direktörü'sün (ana ajan)**. Oyunu sıfırdan, mağazaya çıkacak kalitede bitireceksin.

**Kullanıcı uyuyor.** Soru sorma, onay bekleme. Belirsiz bir noktada en iyi kararı ver, gerekçesini `games/dinamit/docs/KARARLAR.md` dosyasına yaz ve devam et.

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
- Yalnızca `games/dinamit/` altında çalış. Gerekirse kök `.gitignore`'a satır ekleyebilirsin.
- Depodaki diğer projelere dokunma: `aksoy-site/`, `remotion/`, `game/`, kök `package.json`.
- `game/Gece_Postasi_Yatay_Hafif.html` yalnızca bir kalite tabanı referansı. Onun stilini kopyalama; bu oyun ondan tamamen farklı ve daha iddialı olacak.

**Dil:**
- Oyun içi metinler Türkçe (varsayılan) ve İngilizce.
- Belgeler Türkçe.
- Kod ve kod yorumları İngilizce olabilir.

**Ortak protokol:** Bu brif, aynı mobil uygulamaya girecek 3 oyundan biri. §5 performans motoru, §7 köprü protokolü ve ayarlar ekranının yapısı üç oyunda **birebir aynı**. Kullanıcı uygulamasına tek bir adaptör yazacak. Bu sözleşmeleri değiştirme, yalnızca genişlet.

---

## 1. Vizyon ve kalite çıtası

**Kanca:** "Bir mühendis gibi düşün, bir yönetmen gibi izle: 3-2-1… ve dev yapı tam istediğin yere çöksün."

**Oyuncu fantezisi:** Sen ülkenin en iyi kontrollü yıkım mühendisisin. Önünde 90 metrelik bir soğutma kulesi, 30 metre ötede cam bir müze, yerde dar bir Hedef Alanı var. Yapının nasıl ayakta durduğunu Yük Görünümü ile okursun, üç şarjı doğru elemana ve doğru saniyeye koyarsın, sonra yönetmen koltuğuna geçip yüzlerce tonun ağır çekimde tam çizdiğin şeride yattığını izlersin. Buradaki güç fantezisi yok etmek değil, **kontrol etmek**: kaosu milimetrik bir koreografiye çevirmek.

**Neden viral:**
- Kontrollü yıkım videoları internetin en çok izlenen "tatmin edici" türlerinden biri. Biz her oyuncuya kendi videosunu ürettiriyoruz: her çöküş otomatik olarak 8 sn'lik bir klibe dönüşür.
- Günün Kontratı herkes için aynıdır. "%96 yaptım, sen?" karşılaştırması doğar, emoji kartı çözümü ele vermeden paylaşılır.
- Meydan okuma kodu: arkadaşın senin çöküşünü birebir izler, sonra aynı kontratta seni geçmeye çalışır.
- KUŞATMA: telefonun elden ele verildiği, aile ya da arkadaş masasında oynanan 4 dakikalık kahkaha düellosu.

**Neden 2. gün ve 14. gün tutar:**
- **2. gün:** İlk saha bitince yeni şarj tipleri (Hidrolik İtici, Kablo Kesici) yeni düşünme biçimleri açar. Yıldız kapıları "bir yıldız daha" isteği yaratır. Günün Kontratı her sabah yenilenir.
- **14. gün:** Ustalık Mühürleri (minimum şarjla 3★), 6 sertifika, 15 Zincirleme bulmacası, Serbest Yıkım'daki 6 fantastik yapı, Kuşatma Kupası braketleri ve haftalık kupa, Yıkım Arşivi koleksiyonu. Ustalık katmanı derindir: her kontratın 3★ çözümüne en az 3 farklı yoldan ulaşılır. "Daha az şarj, daha çok bütçe" optimizasyonu oyuncuyu uzun süre tutar.
- **Seans dostu:** Bir kontrat 1,5–3 dk, bir KUŞATMA maçı ≤ 4 dk. Enerji yok, bekleme yok.

**Ağız açık anlar (her biri ayrı bir kabul testidir):**
1. **Kule Nefesi:** 90 m'lik hiperboloid soğutma kulesi tabandaki V-kesikten içine doğru "yutkunur", kabuk katlanarak iner. 60 m çapında bir toz halkası yer seviyesinde yayılır ve kamera halkanın içinden geçer.
2. **Kırılan baca:** 45 m'lik tuğla baca Yönlendirici Kama ile ağaç gibi devrilirken, eğilme momenti yüzünden havada ikiye kırılır (gerçek bacalar da böyle kırılır). 0,3× ağır çekimde tuğlalar tek tek ayrışır.
3. **Köprü katlanışı:** Kablo Kesiciler sırayla patlar, kafes köprü ortadan "V" biçiminde katlanıp nehre iner. Su sütunu yükselir ama alttaki tarihi taş kemer köprüye tek damla değmez.
4. **Işık direkleri dominosu:** Stadyumun 4 ışık direği 0,25 sn arayla sahaya doğru sırayla yatar. Lambalar kıvılcım saçıp söner ve alacakaranlıkta her sönüşte sahne biraz daha kararır.
5. **Yük Görünümü "aha" anı:** Yapı yarı saydam maviye döner, yük yolları turuncu damarlar gibi zemine akar. Şarjı koyduğun an damar kırmızıya döner ve ayağı kesilecek küme mor bir nabızla belirir.
6. **Zincirleme:** Tek bir ateşleme yapılır. Baca konveyörü, konveyör siloyu, silo da vinci iter ve 5 yapı 9 saniyede birbirini devirir. Kamera zincirin tamamını tek plan-sekansla takip eder.
7. **Teleskop çöküş:** Beton gözetleme kulesi kendi ayak izine, kat kat iç içe geçerek iner. Toz bulutu yükselirken ekrana "%99 — KUSURSUZ" damgası basılır.
8. **KUŞATMA Taç Taşı:** Son gülle kalenin kemerini kırar, altın Taç Taşı ağır çekimde yuvarlanır ve adanın kenarından denize "PLOP!" diye düşer. Rakip yaratığın başında bayılma yıldızları döner, sonra sportmence alkışlar.

**İlk 30 saniye filmi (oyun açılır açılmaz, metin yok):**

| Saniye | Görüntü | Ses / haptik |
|---|---|---|
| 0,0–2,5 | Ayrı bir yükleme ekranı yok, ön yükleme siste gizlenir. Liman Sanayi sahası şafakta. Kamera bir portal vincin kolu üzerinden süzülür, sis denizin üstünde yatar, tuğla baca siluet hâlinde durur. | Dalga, vinç gıcırtısı, düşük drone |
| 2,5–5,0 | Bacanın gölgesinde "DİNAMİT" metal plaka harfleri belirir. Harflerin altında bir fitil kıvılcımı soldan sağa koşar ve söner. | Fitil cızırtısı, logoda tok metal "tank" |
| 5,0–8,0 | Kamera bacanın dibine iner. Kaidede iki turuncu hayalet şarj yuvası nabız atar. Ekranda tek kelime: "Dokun." ve bir parmak animasyonu. | 1 Hz nabız tıkırtısı |
| 8,0–12,0 | İlk dokunuşta Kırıcı yuvaya "klak" diye yapışır ve LED'i yeşil yanar. İkinci dokunuşta Yönlendirici Kama yerleşir, oku Hedef Alanı'nı gösterir. Yerdeki Hedef Alanı şeridi parlar. | 2× 18 ms hafif haptik, mıknatıs klank |
| 12,0–14,0 | ATEŞLE düğmesi kırmızı nabız atar. Oyuncu düğmeye basılı tutar, halka 0,6 sn'de dolar. | Yükselen ton, dolunca 40 ms orta haptik |
| 14,0–17,0 | Siren çalar, "ALAN TAHLİYE EDİLDİ" damgası basılır. 3: geniş plan. 2: şarjın yakın planı (LED). 1: Hedef Alanı kenarından bacaya alt açı. | İki tonlu siren, 880 Hz'lik 3 bip, her bipte 12 ms tık |
| 17,0–18,0 | Ateşleme: 70 ms hit-stop, turuncu ışık patlaması. Kaide tozla kaplanır, kamera titrer. | Sub-bass "güm", 60 ms + 40 ms boşluk + 90 ms haptik |
| 18,0–23,0 | 0,3× ağır çekim: baca kama yönünde yatar ve havada ortadan kırılır. Kamera yandan dolly ile eşlik eder. | Müzik yükselir, tuğla çatırtıları |
| 23,0–26,5 | Normal hız: baca yere çarpar, toz dalgası kameraya doğru gelir ve görüntü bir an toza boğulur. | Derin gümbürtü + moloz yağmuru, 120 ms haptik |
| 26,5–30,0 | Toz çekilir. "%94 HEDEF" sayacı tıkırdayarak yükselir, 3 yıldız sırayla çakılır. Ekranda "Tekrar İzle" ve büyük "Sonraki Kontrat" düğmeleri belirir. | Her yıldızda metal klank + 25 ms haptik, çözülme akoru |

**Test edilebilir kalite çıtası:**
- Persona paneline 10 contact-sheet karesi (her sahadan rastgele 2) gösterilir. "Bu bir konsol/native oyun" diyenlerin oranı ≥ 8/10 olmalı.
- Hiçbir çöküşte "kutu" hissi olmaz. Her kırık yüz iç malzemeyi gösterir: betonda agrega ve inşaat demiri uçları, tuğlada harç kenarı, çelikte bükülmüş ya da yırtılmış uç. Düz kesik ya da dokusuz yüz hatadır.
- Enerji eşiğini aşan her çarpışmaya 100 ms içinde toz tepkisi gelir. Havada asılı kalan oyun parçası yoktur: dinlenme hâlinde 0,5 sn'den uzun desteksiz kalan parça hatadır.
- Her çöküş en az 3 ses katmanı taşır (kırılma, gövde gümbürtüsü, moloz yağmuru) ve iki çöküş birebir aynı sesi tekrar etmez.
- Mi 9T'de, Otomatik ayarda, en ağır kontratın (5-6) çöküşü boyunca medyan 60 fps, %1 düşük ≥ 50 fps.
- 3-2-1 dizisi ≤ 3,5 sn sürer ve ilk izlemeden sonra dokunuşla atlanabilir. "Tekrar dene" plan ekranını < 1 sn'de getirir.

**Kaçınılacaklar:**
- Konut, apartman, ev, okul, hastane, ibadet yeri ya da insan **asla** gösterilmez. Deprem, fay hattı, yerde yayılan çatlak veya "enkaz altında" çağrışımı **asla** olmaz.
- Hollywood ateş topu yok. Yıkımın estetiği hassasiyettir: şarj flaşı küçük ve keskindir, işin geri kalanını yerçekimi yapar. Kara duman ve alev (felaket/terör çağrışımı) yasaktır.
- Gerçek simge yapılara benzerlik yasaktır: bilinen köprüler, kuleler, kulüp stadyumları ve kulüp renkleri.
- Kumarhane tarzı UI, sahte aciliyet, uzun ara sahneler ve "yükleniyor" beklemesi yasaktır.
- Parçaları ortadan kaldırarak (despawn) hile yapılmaz. Oyun parçaları sonuç hesabı bitene kadar sahnede kalır.

---

## 2. Oyun tasarımı (GDD)

### 2.1 Çekirdek döngü

Döngü: **Brifing → Keşfet/Oku → Planla → Ateşle → İzle → Değerlendir → Anında tekrar.**

| Adım | Süre | Oyuncu ne yapar |
|---|---|---|
| Brifing | 3–5 sn | Yapı, Hedef Alanı, Korunan nesneler, bütçe ve yıldız eşikleri tek kartta görünür. |
| Keşfet/Oku | 10–40 sn | Orbit ve pinch ile dolaşır, Yük Görünümü ile destek grafını okur. |
| Planla | 15–60 sn | Elemanlara şarj koyar, tip ve yön seçer, zaman çizelgesinde gecikme verir (0–4 sn, 0,25 sn adım). |
| Ateşle | ≤ 3,5 sn | Basılı tutar → siren → "ALAN TAHLİYE EDİLDİ" → 3-2-1 kesmeleri. |
| Çöküş | 5–12 sn | Sinematik yönetmen çalışır, ağır çekim pencereleri açılır. |
| Sonuç | 4–6 sn | % Hedef, Korunan hasarı ve kalan bütçe → 1–3★ ve Ustalık Mührü. |
| Tekrar | < 1 sn | Plan korunur. Oyuncu tek elemanı değiştirip yeniden ateşler. |

Bir kontrat 1,5–3 dk sürer. Tipik seans 8–15 dk'dır: 4–6 kontrat, ya da Günün Kontratı denemeleri + 1 KUŞATMA maçı.

**Yük Görünümü (x-ray):** Bir dokunuşla açılır ve kapanır. Yapı yarı saydam olur. Her eleman, statik destek grafından hesaplanan yük/kapasite oranına göre renklenir: mavi < 0,4, sarı 0,4–0,75, kırmızı > 0,75. Yük yolları zemine akan kesikli çizgilerle gösterilir, akış hızı yükle orantılıdır. Planlanan şarjların keseceği elemanlar kesikli çizilir, desteksiz kalacak kümeler mor nabız atar. Bu yalnızca statik bir analizdir, dinamik çöküşü tahmin etmez: bulmaca canlı kalır.

**Puanlama (Kontratlar ve Günün Kontratı):**
- **H** = Hedef Alanı içinde duran oyun parçalarının kütlesi / yapının toplam kütlesi. Ölçüm dinlenme anında yapılır, kütle merkezi Hedef poligonunun içinde olan parça sayılır.
- **K** = Korunan nesnelerin ortalama hasarı (0–1; birikimli darbe impulsu / nesnenin dayanımı).
- **B** = kalan bütçe / toplam bütçe.
- **Puan = round(6000·H + 2000·(1 − K) + 2000·B)**, en fazla 10.000.
- Varsayılan yıldızlar (kontrat verisi bunları ezebilir): ⭐ H ≥ 0,70 ve hiçbir Korunan nesnede > %25 hasar yok. ⭐⭐ H ≥ 0,85 ve K ≤ 0,03. ⭐⭐⭐ H ≥ 0,95, K = 0 ve B ≥ 0,15.
- **Başarısızlık:** H < 0,70 ya da herhangi bir Korunan nesnede > %25 hasar → "Kontrat tamamlanmadı" ve tek cümlelik ipucu ("Kırmızı düğüm hâlâ ayakta.").
- **Ustalık Mührü** (yıldızlardan ayrı): 3★ alınmış, kontratın usta şarj sayısı veya daha azı kullanılmış ve Mühendis Yardımı açılmamış olmalı. 3★ alınınca "Usta Kaydı" açılır: tasarımcının en az şarjlı çözümünün replay'i.
- **Bütçe** "K" (kredi) birimiyle ölçülür ve aşılamaz (UI engeller). Para ya da TL ifadesi kullanılmaz.

**Şarjlar:**

| Şarj | Ne yapar | Geçerli malzeme | Maliyet | Açılış |
|---|---|---|---|---|
| Kırıcı | 0,9 m yarıçap içindeki beton/tuğla bağlarını koparır, küçük radyal impuls verir | beton, tuğla | 200 K | 1-1 |
| Yönlendirici Kama | Bağı kırar ve seçilen yönde (yatay, 15° snap) güçlü itme impulsu verir | beton, tuğla, çelik düğüm | 450 K | 1-1 |
| Kesici | Lineer şekilli şarj, çelik elemanı tek kesitten keser | çelik | 300 K | 1-2 |
| Gecikmeli Fitil | İki şarjı bağlar: ikincisi, birincinin zamanı + fitil gecikmesi (0,25–2 sn) anında patlar. 4 sn tavanını aşmanın tek yoludur ve yanarken görünür bir kıvılcım yolu çizer | bağlantı | 100 K | 1-5 |
| Hidrolik İtici | Patlamaz, 1,5 sn boyunca sabit kuvvetle iter. Yapıyı parçalamadan devirir, sessizdir | her malzeme (zemine dayanır) | 600 K | 2-3 |
| Kablo Kesici | Kablo, gergi halatı veya çekme çubuğunu keser. Kopan kablo kamçı gibi savrulur (görsel) | kablo | 350 K | 3-1 |

### 2.2 Kontroller (portre, önce tek başparmak)

| Hareket | Tanım | Parametre |
|---|---|---|
| Dokun | < 250 ms ve < 8 px hareket | Eleman seçer ya da tepsiden şarj seçer |
| Sürükle (boş alan) | 8 px ölü bölgeden sonra orbit | Δyaw = 0,22°/px · (1 + 0,5·clamp(v/1500 px/sn, 0, 1)). Pitch 8°–72° arasında. Ayarlardan 0,12–0,40°/px |
| Kıstır | İki parmak arası mesafe oranı | Uzaklık 0,6R–3,0R (R = yapının sınır küresi), logaritmik ölçek |
| İki parmakla sürükle | Pan | Saha sınırına sınırlanır, odak noktası yerde kalır |
| Çift dokun | Elemana 0,5 sn'de odaklanır | Boşluğa çift dokunuş genel plana döner |
| Uzun bas (400 ms) | Şarj üzerindeyken taşı/sil menüsü | 30 ms haptik |
| Tepsiden sürükle-bırak | Şarjı elemana taşır. Parmağın 60 px üstünde büyüteç açılır | Geçerli bağa 40 px snap |
| Kama yönü | Seçili şarjın etrafındaki halkada sürükle | 15° snap, her snap'te 8 ms tık |
| Zaman çizelgesi | Alt paneldeki şeritte şarj çipini yatay sürükle | 0,25 sn snap, 8 ms tık, 0–4 sn |
| ATEŞLE | 0,6 sn basılı tut (halka dolar). Erken bırakmak iptal eder | Erişilebilirlik: "çift dokunla ateşle" seçeneği |

- **Hedefleme yardımı:** Dokunulan noktaya en yakın geçerli bağ seçilir. Seçilen elemanın malzemesine uymayan şarjlar tepside gri görünür ve nedeni ikonla gösterilir ("çelik değil").
- **Sol el modu:** Tepsi, ATEŞLE ve zaman çizelgesi aynalanır.
- **Erişilebilirlik:**
  - Renk körü paletleri. Yük Görünümü'nde renge ek olarak desen kullanılır: kritik eleman kesikli taralıdır.
  - Yazı boyutu %100–140.
  - Hareket Azalt: kamera titreşimi kapanır, kesmelerin yerini 250 ms geçişler alır, ağır çekim korunur.
  - Flaş Azalt: patlama parlaması +0,6 EV yerine +0,2 EV olur.
  - Haptik açılıp kapatılabilir.
  - Her sesli uyarının yazılı karşılığı vardır (siren → "⚠ SİREN" etiketi).

### 2.3 Oyun hissi (juice)

| Olay | Görsel | Ses | Haptik |
|---|---|---|---|
| Şarj yerleştirme | 0,12 sn'de 1,2→1,0 ölçek, LED 1 Hz yeşil | Mıknatıs "klak" (pitch ±%6) | 18 ms hafif |
| Zaman snap'i | Çip hafifçe zıplar | Saat tıkı | 8 ms |
| ATEŞLE'yi kurma | Halka dolar, ekran kenarı hafifçe kızarır | Yükselen ton | Dolunca 40 ms orta |
| 3-2-1 | Her saniye kesme + rakam damgası | 880 Hz bip | 12 ms tık |
| Ateşleme | 70 ms hit-stop (sim zamanı ilerlemez, determinizm etkilenmez), 120 ms +0,6 EV flaş | Sub-bass + keskin çatırtı | 60 ms güçlü – 40 ms boşluk – 90 ms orta |
| Büyük çarpışma | Toz halkası, kamera travması | Gümbürtü + moloz | 120 ms orta-güçlü |
| Korunan nesneye darbe | 0,3 sn kırmızı kontur, hasar % baloncuğu | Cam tınlaması | 2× 20 ms |
| Sonuç sayacı | % değeri 1,2 sn'de 0'dan yükselir | Artan tıklar | Her %10'da 6 ms |
| Yıldız | 1,4→1,0 ölçekle "çakılma", kıvılcım | Metal klank, her yıldızda yarım ton yukarı | 25 ms |
| KUSURSUZ (H ≥ 0,98) | Mavi-kopya "KUSURSUZ" damgası | İmza akoru | 3× 30 ms |

- **Kamera titreşimi:** Travma modeli kullanılır. Ofset = travma² · 0,35 m, rotasyon = travma² · 1,2°, sönüm 1,6/sn. Travma kaynağa uzaklıkla 1/(1 + d/30 m) oranında azalır. Tek olay en fazla 0,6, toplam en fazla 1,0 travma ekler. Hareket Azalt'ta kapalıdır.
- **Ağır çekim:** İlk "kilit olayda" (ilk büyük küme kopması ya da devrilme açısının 20°'yi geçmesi) zaman ölçeği 150 ms'de 1'den 0,3'e iner, 1,2–2,0 sn tutulur ve 300 ms'de 1'e döner. Çöküş başına en fazla 2 pencere açılır, sinematiğin toplamı ≤ 12 sn'dir. Sim adımı sabit kalır, ağır çekim yalnızca sim/gerçek zaman oranını değiştirir. Replay determinizmi bozulmaz.

### 2.4 Kamera dili

- **Plan kamerası:**
  - Dikey FOV 50° (portre), uzaklık 1,6R–3,0R, pitch 8°–72°, kritik sönümlü yay (ω = 10 rad/sn).
  - Açılışta otomatik kadraj kurulur: yapı, Hedef Alanı ve Korunan nesneler ekranın %80'ine sığar.
  - Ekranın üst %12'si HUD'a, alt %28'i tepsi ve zaman çizelgesine ayrılır (güvenli kadraj).
- **3-2-1 kesmeleri:**
  - **3:** Geniş kuruluş planı (FOV 40°, 4R, 8° alt açı).
  - **2:** İlk şarjın yakın planı (FOV 35°, 3 m, LED görünür).
  - **1:** Hedef Alanı kenarından yapıya bakan "gözlemci" kamerası (FOV 55°).
  - Her kontrat bu üç noktayı veri olarak taşır. Veride yoksa noktalar prosedürel üretilir.
- **Çöküş yönetmeni (4 rig):**
  - **Yan Ray:** Devrilme yönüne paralel dolly.
  - **Yer Seviyesi:** Korunan nesnenin arkasından çekilir, nesnenin sağ kaldığını gösterir.
  - **Drone:** 1,5R yükseklikte 15°/sn yörünge.
  - **Toz İçinden:** Çarpmadan sonra kamera tozun içine itilir.
  - Kurallar: Bir plan ≥ 1,2 sn sürer. Çöküş başına ≤ 4 kesme yapılır. Devrilme yönüne göre 180° çizgisi hiç geçilmez. Kesmeler çarpışma anına denk getirilir. Kamera, düşen kümenin kütle merkezi + hız × 0,4 sn noktasına bakar (look-ahead).
- **Replay:** 6 hazır açı + serbest kamera. Hız 0,25× / 0,5× / 1×, zaman çubuğunda ileri-geri kaydırma yapılabilir.
- **Hareket hastalığı sınırları:**
  - Otomatik kameranın açısal hızı ≤ 90°/sn.
  - Roll yalnızca Drone'da ve ≤ 3° (Hareket Azalt'ta 0).
  - FOV değişimi ≤ 10°/sn.
  - Kafa sallanması (head-bob) yok.
  - Ekranın %40'ından fazlasını kaplayan bir flaş ≤ 150 ms sürer ve saniyede en fazla 1 kez olur.

### 2.5 Modlar

#### 2.5.1 Kontratlar (kariyer): 5 Saha × 6 = 30 Kontrat

Her sahanın 6. kontratı, birden fazla yapıyı birleştiren finaldir. Kontrat verisi şunları taşır: yapı(lar), Hedef Alanı poligonu, Korunan listesi, bütçe, en fazla şarj sayısı, usta şarj sayısı, açık şarj tipleri, yıldız eşikleri ve 3 kamera noktası.

| # | Kontrat | Yapı / öğrettiği | Korunan | En fazla / usta şarj |
|---|---|---|---|---|
| 1-1 | İlk Baca | 45 m tuğla baca; devirme yönü (Kırıcı + Kama) | — | 3 / 2 |
| 1-2 | Vincin Emekliliği | Portal vinç; çelik ayaklar Kesici ile kesilip rıhtıma yatırılır | Komşu fabrika | 4 / 3 |
| 1-3 | Silo Sessizliği | 6 hücreli tahıl silosu; zaman çizelgesiyle içe çöktürme | Tarihi çeşme | 6 / 4 |
| 1-4 | İki Baca, Tek Şerit | İki baca aynı dar şeride, çarpışmadan, sırayla | Komşu fabrika | 6 / 4 |
| 1-5 | Konveyör Köprüsü | Eğik çelik konveyör; Gecikmeli Fitil tanıtımı | Tarihi çeşme | 5 / 3 |
| 1-6 | Liman Finali | Vinç + silo + baca birlikte | Çeşme + fabrika | 8 / 6 |
| 2-1 | Kule Nefesi | 90 m soğutma kulesi; tabanda V-kesik | — | 6 / 4 |
| 2-2 | Kazan Dairesi | Çelik iskelet + tuğla dolgu; içe doğru ilerleyen çöküş | Cam müze | 6 / 5 |
| 2-3 | Hidrolik Sabır | Hidrolik İtici; konveyör portalını parçalamadan devirme | Komşu fabrika | 4 / 2 |
| 2-4 | Çift Soğutma | İki kule: biri dışa, biri içe; zamanlama | Cam müze | 8 / 6 |
| 2-5 | Uzun Hat | 120 m konveyör, 8 ayak; dalga hâlinde çöküş | Cam müze | 8 / 5 |
| 2-6 | Santral Finali | Kazan binası + 2 kule + baca | Müze + fabrika | 10 / 7 |
| 3-1 | Gergin Teller | Kablolu servis köprüsü; Kablo Kesici sırası | — | 5 / 4 |
| 3-2 | Kafes Köprü | 80 m çelik kafes; ortadan V katlanma | Tarihi taş köprü | 6 / 4 |
| 3-3 | Viyadük Ayakları | 3 yüksek beton ayak; vadi şeridine yana devirme | Tarihi taş köprü | 6 / 4 |
| 3-4 | Ters Kafes | Tabliye altı kafes; Kama + Kesici birlikte | Cam müze (vadi kenarı) | 6 / 5 |
| 3-5 | Zincir Ayaklar | 6 açıklıklı viyadük; Fitil ile dalga | Tarihi taş köprü | 9 / 6 |
| 3-6 | Köprü Finali | Kafes + viyadük + kablolar | Taş köprü + çeşme | 10 / 8 |
| 4-1 | Su Kulesi | 4 ayaklı çelik su kulesi; iki ayakla yön verme | Komşu fabrika | 3 / 2 |
| 4-2 | Radyo Kulesi | 120 m gergili kafes direk; devrilme yönünü kesilen halatlar belirler | Cam müze | 5 / 3 |
| 4-3 | Gözetleme Kulesi | Konsol kabinli beton kule; kabin ayrı düşer | Tarihi çeşme | 5 / 4 |
| 4-4 | Teleskop | Beton kulenin kendi ayak izine katlanarak çökmesi; çok dar alan | Fabrika + müze | 7 / 5 |
| 4-5 | Kule Ormanı | 3 direk yelpaze gibi, birbirini kesmeden | Cam müze | 9 / 6 |
| 4-6 | Kuleler Finali | Su kulesi + radyo direği + gözetleme kulesi | Üçü birden | 10 / 7 |
| 5-1 | Işık Direkleri | 4 ışık direği sahaya sırayla | — | 6 / 4 |
| 5-2 | Tribün | Konsol beton tribün öne, sahaya | Cam müze (stat müzesi) | 6 / 4 |
| 5-3 | Çatı Makası | Çelik çatı makası düz aşağı | Tarihi çeşme (giriş) | 7 / 5 |
| 5-4 | Dev Tabela | Çelik çerçeveli skor tabelası; tarihi kapıyı ıskalayarak | Tarihi giriş kapısı | 4 / 3 |
| 5-5 | Tribün Dalgası | Kavisli tribün; Fitil ile kavis boyunca dalga | Cam müze | 9 / 6 |
| 5-6 | Büyük Final | 4 direk + çatı makası + 2 tribün; Hedef = saha | Müze + çeşme | 12 / 9 |

- **Saha kapıları:** Saha 2 için 10★, Saha 3 için 22★, Saha 4 için 36★, Saha 5 için 50★ gerekir (toplam 90★).
- **Zorluk ekseni:** Hedef Alanı / ayak izi oranı 3,0'dan (1-1) 1,2'ye (5-6) düşer. Korunan nesne sayısı 0–2'dir. Oyun parçası sayısı yaklaşık 40'tan 400'e çıkar.
- **AI:** Bu modda rakip yoktur. Çözücü bot denge testleri ve Usta Kaydı için kullanılır (teknik ayrıntı §4.G'de).

#### 2.5.2 Zincirleme: 15 bulmaca

- **Amaç:** t = 0'daki tek ateşlemeyle turuncu bayraklı tüm Hedef yapıları devirmek. Bir yapı, ana kümesinin eğimi 45°'yi geçince ya da kütlesinin %60'ı ilk ayak izinin dışına çıkınca "devrildi" sayılır.
- **Araçlar:** 1 şarj (tipi bulmacaya göre değişir) + en fazla 3 pasif parça: Saptırıcı Kiriş, Rampa, Karşı Ağırlık, Makara Halatı. Pasif parçalar yalnızca işaretli ızgara hücrelerine konabilir.
- **Yıldızlar:** ⭐ tüm hedefler devrildi. ⭐⭐ buna ek olarak Korunan hasarı 0. ⭐⭐⭐ buna ek olarak pasif parça sayısı ≤ bulmacanın "zarif" sayısı.
- **İçerik:** 5'er bulmacalık 3 paket:
  - "Fabrika Hattı": baca → konveyör → silo.
  - "Kıyı Zinciri": vinçler, konteyner kuleleri, iskele.
  - "Kule Dansı": direkler, su kulesi, sarkan Yıkım Güllesi.
  - 9–15 numaralı bulmacalar Rube-Goldberg tarzıdır: yuvarlanan silo tankı, savrulan gülle, devrilen bandın kaydırdığı konteyner.
- **Süre ve açılış:** Bulmaca başına 1–3 dk. Mod Saha 1'de 6★ toplanınca açılır.
- **Farkı:** Kontratlar "nereye düşecek?" sorusunu sorar, Zincirleme "ne neyi tetikleyecek?" sorusunu. Zaman çizelgesi yoktur, yalnızca fizik zekâsı vardır. Kamera tüm zinciri tek plan-sekansla izler ve aktif en hızlı kümeye bakar.

#### 2.5.3 Serbest Yıkım: kum havuzu

- **Yapılar:** 1★ alınmış tüm kontrat yapıları + 6 fantastik yapı: Kum Saati Kulesi, Spiral Kule, Kristal Kubbe, Boş Lunapark Dönme Dolabı iskeleti, Roket Rampası, Dev Domino Taşları. Hepsi açıkça kurgusal ya da endüstriyeldir.
- **Araçlar:**
  - Açılmış tüm şarjlar (bütçe yok).
  - Yıkım Güllesi vinç: sürükleyerek sallanır.
  - Roket İtici: parçaya yapışır, 2 sn itki verir.
  - Mini Meteor: gökyüzüne dokunulur, meteor 1,5 sn sonra düşer.
  - Yerçekimi Ters: 3 sn sürer, sonra yerçekimi normale döner.
  - Zaman ölçeği: 0,1× / 0,25× / 0,5× / 1×.
- **Replay Yönetmeni:** Oyuncu 3 kamera anahtar karesi koyar, sistem aradaki yolu yumuşatır ve 8 sn'lik klip dışa aktarılır. Bu moda özel kozmetik: 6 renkli toz.
- **Ölçer (yıldız yok):** Düşen tonaj, en uzun parça uçuşu (m), en büyük toz bulutu (m³) ve zincir uzunluğu ölçülür. Bunlar başarımları besler.
- **Süre ve açılış:** 3–10 dk, açık uçlu. Mod 1-3 tamamlanınca açılır.

#### 2.5.4 Günün Kontratı

- **Tohum ve numara:** Tohum herkes için aynıdır: `seed = gün sayısı` (2026-01-01 = #1). Kartta görünen numara da bu gün sayısıdır.
- **Varyant üretimi:** Temel, 30 kontrat yapısının tohumlu varyantlarıdır: yapı ölçeği ±%15, Hedef Alanı'nın konumu ve açısı, Korunan nesnenin konumu değişir.
- **Kısıt:** Her güne 1 kısıt eklenir: "Sadece Kesici", "En fazla 3 şarj", "Hedef %40 dar", "Gecikme yok", "Ters yön", "Yarı bütçe" veya "Korunan tam ortada". Kısıt, haftanın gününe göre sabit sırayla döner.
- **Erişim:** Oyuncu sahayı henüz açmamış olsa bile yapı o gün için misafir olarak açılır.
- **Denemeler:** Deneme sınırsızdır ve en iyisi kaydedilir. İlk denemenin sonucu ayrıca "İlk Atış" olarak gösterilir. Çözücü botun en iyi puanı "Par" olarak verilir.
- **Süre:** 2–6 dk.
- **Haftanın Şantiyesi:** Pazartesi yenilenir. Bir finalin zor varyantıdır, 3★ alan haftalık kozmetik rozet kazanır.

### 2.6 Mod 5 — KUŞATMA: bağımsız çizgi film oyunu (mini-GDD)

**Kanca:** "İki uçan ada, iki kale, iki Taç Taşı: rüzgârı oku, gülleni seç, rakibin tacını denize düşür."

**Fantezi:** Cumartesi sabahı çizgi filminin içindesin. Tombul, sevimli yaratıklar oyuncak mancınık ve toplarla birbirinin kalesini sallıyor. Kimse incinmiyor, herkes gülüyor. KUŞATMA, DİNAMİT'in fizik çekirdeğini kullanır ama ayrı bir oyun gibi açılır: kendi menüsü, müziği ve ilerlemesi vardır. Ana menüden ilk günden erişilir.

**Maç akışı (her zaman ≤ 4:00):**
1. **Kurulum (≤ 15 sn, maç saatine sayılmaz):** Ada teması ve kale düzeni seçilir (ya da rastgele gelir). Silah seçilir: Mancınık ya da Top. 3 özel gülle seçilir, Taş Gülle sınırsızdır.
2. **Kim başlar:** Tohumlu bir rüzgâr gülü çevrilir. Denge kuralı: ilk atan oyuncu ilk turunda yalnızca Taş Gülle kullanabilir.
3. **Tur yapısı:** Bir tur şu adımlardan oluşur:
   - **Atış:** Nişan için ≤ 12 sn. Süre dolunca son nişanla ateş edilir.
   - **Uçuş:** ≤ 3 sn.
   - **Yerleşme:** ≤ 2,5 sn, sonra bloklar zorla uyutulur.
   - **Onarım:** ≤ 6 sn. Oyuncu 3 kartlık elinden 1 bloğu kendi kalesine yerleştirir. Süre dolarsa Onarım atlanır. Onarım sırasında **rakibin bir sonraki turunun rüzgârı** gösterilir, oyuncu savunmasını bu tahmine göre kurar.
4. **Fırtına:** Her oyuncu 6 atış yaptıktan sonra taç hâlâ düşmediyse Fırtına başlar. Adalar %20 yaklaşır, rüzgâr ×1,5 olur, Onarım kapanır ve 2 tur daha oynanır.
5. **Süre sınırı:** Maç saati 3:35'i geçince yeni tur başlamaz. Bir tur en fazla 23,5 sn sürdüğü için maç her zaman 4:00 içinde biter. Karar Fırtına'dan sonra ya da saat dolunca verilir: Taç Taşı ada zeminine göre daha yüksekte olan kazanır, eşitlikte kalan kale kütlesi fazla olan. Tipik bir maç 4–6. turda, yaklaşık 2,5 dk'da biter.
6. **Kazanma:** Rakibin Taç Taşı denize düşerse (deniz seviyesinin altına inerse) maç biter. Taç kendi adasına düşerse oyunda kalır ve düştüğü yerde savunulabilir.

**Kontroller:**
- **Nişan:** Fırlatıcıdan geriye sürüklenir (sapan mantığı). Sürükleme yönü açıyı, mesafesi gücü belirler: 12 px ölü bölge, 220 px = %100.
- **İnce ayar:** Parmak 300 ms sabit kalırsa hassasiyet ×0,35'e düşer (10 ms tık).
- **Ateş ve iptal:** Bırakınca atış yapılır. Fırlatıcı dairesine geri sürüklemek iptal eder.
- **Yörünge önizlemesi:** Yolun yalnızca ilk ~%30'u kesikli noktalarla gösterilir. Kolay ayarda bu oran %45'tir.
- **Bölünen Gülle:** Uçuş sırasında ekrana dokununca bölünür.
- **Onarım:** Elden bir blok sürüklenir ve 0,5 m'lik ızgaraya oturur. Dokununca 90° döner. Hayalet blok, denge göstergesiyle yeşil, sarı ya da kırmızı görünür.

**Bloklar ve malzemeler:**

| Malzeme | Yoğunluk (g/cm³) | Can | Davranış |
|---|---|---|---|
| Tahta | 0,6 | 60 | Kalaslara ayrılır, orta sürtünme |
| Taş | 2,4 | 150 | Ağırdır, 3 parçaya ufalanır |
| Cam | 1,0 | 20 | Hafif ve kırılgandır, parlak kırıklar saçar (görsel) |
| Jöle | 1,1 | ∞ | Kırılmaz, sıçratır (restitution 0,7), titrer, darbeyi yutar |

- **Hasar:** Hasar = max(0, J − J₀) · k. Burada J çarpışma impulsu, J₀ malzemenin eşiğidir.
- **Blok şekilleri:** küp 1×1, kiriş 2×0,5, uzun kiriş 3×0,5, sütun 0,5×2, üçgen, kemer.
- **Taç Taşı:** r = 0,6 m, kırılmaz, kalenin tepesindeki bir kaidede durur.

**Silahlar:** Mancınık yüksek kavisle atar (v₀ 18–32 m/sn) ve rüzgârdan ×1,0 etkilenir. Top daha düz atar (v₀ 24–40 m/sn) ve rüzgârdan ×0,5 etkilenir.

**Rüzgâr:** −5 ile +5 arasında seviyelerle gösterilir ve yatay ivme a = 0,6·w m/sn² uygular. Her tur w ← clamp(w + randInt(−2, 2), −5, 5) ile tohumlu olarak değişir. Ekranda bayrak, ok ve sayı birlikte görünür.

**Gülleler (8 tip, oynayarak açılır; maça 3 özel gülle seçilir):**

| # | Gülle | Etki | Maç başına | Açılış (Kuşatma Sv.) |
|---|---|---|---|---|
| 1 | Taş Gülle | Standart | ∞ | 1 |
| 2 | Sekme Topu | 2 kez seker (e = 0,8), az hasar verir, temeli kemirir | 2 | 2 |
| 3 | Bölünen Gülle | Dokununca ±8° açıyla 3'e bölünür | 2 | 3 |
| 4 | Yapışkan Bomba | İlk bloğa yapışır, 1 sn sonra "PAT!" diyerek radyal iter. Ateş yok, konfetili duman var | 1 | 5 |
| 5 | Ağır Gülle | 3× kütle, kısa menzil, taşı ezer | 1 | 6 |
| 6 | Rüzgâr Gülü | Rüzgârdan etkilenmez. Çarptığı yerde 4 m'lik esintiyle iter ve sonraki turun rüzgârını ters çevirir | 1 | 8 |
| 7 | Buz Topu | 3 m içindeki blokları 1 tur boyunca buzlar (sürtünme 0,05), kale kayar | 1 | 11 |
| 8 | Balon Gülle | Çarptığı bloğa 3 balon bağlar. Blok 2 sn yükselir, sonra balonlar patlar | 1 | 14 |

**Arenalar (3 ada teması × 4 kale düzeni = 12 düzen):**
- **Temalar:**
  - Çayır Adası: dengeli, tahta ağırlıklı.
  - Kumsal Adası: rüzgâr turda ±3'e kadar değişir, sallanan palmiyeler engel oluşturur.
  - Buzul Adası: cam/buz bloklar, kaygan zemin.
- **Adalar:** 24 m genişliktedir, denizden 8 m yüksekte süzülür. İki ada arası, düzene göre 60–90 m'dir.
- **Kaleler:** 8–12 m yükseklikte, 35–60 bloktan oluşur. Her düzenin kendine özel 20 kartlık Onarım destesi vardır.

**6 AI karakteri:**

| Karakter | Kişilik / taktik | Silah ve sevdiği gülleler | σ açı / σ güç | Zorluk |
|---|---|---|---|---|
| Topçu Tonton (tombul, bıyıklı, miğferli) | Doğrudan tacı hedefler, sabırsızdır | Top; Ağır Gülle | 4,0° / %8 | 1 |
| Hoplayan Keçi (motor gözlüklü) | Saldırgandır, gücü yüksek, hassasiyeti düşüktür | Mancınık; Yapışkan Bomba | 3,0° / %6 | 2 |
| Sinsi Sincap (dev kuyruklu) | Temeli kemirir, güllelerini sektirir | Mancınık; Sekme, Bölünen | 2,2° / %5 | 3 |
| Kaptan Kaplumbağa (tuğla desenli kabuk) | Savunmacıdır, taş örer, geç saldırır | Top; Ağır, Buz | 1,8° / %4 | 3 |
| Profesör Baykuş (yuvarlak gözlüklü, kepli) | Rüzgârı kusursuz hesaplar, yavaş düşünür | Mancınık; Rüzgâr Gülü, Balon | 1,2° / %3 | 4 |
| Kumandan Pamuk (pelerinli kedi) | Kupa şampiyonudur, oyuncunun zayıf tarafına uyum sağlar | İkisi de; hepsi | 0,7° / %2 | 5 |

- **AI karar zinciri:**
  - **Hedef seçimi:** Tacın destek grafında, kesilince tacı en çok düşürecek blok seçilir (hızlı destek analizi). Gerekirse doğrudan taç hedeflenir.
  - **Atış çözümü:** (açı, güç) ızgarası rüzgâr dahil analitik yörüngeyle taranır. En iyi atışa kişiliğe özgü σ gürültüsü eklenir.
  - **İnsan gibi düzeltme:** Aynı hedefe yapılan her ardışık atışta hata %30 azalır. Rüzgâr değişince düzeltme sıfırlanır.
  - **Düşünme süresi:** 1,5–4 sn. Bu sırada karakter kafasını kaşır ya da not alır (animasyon).
  - **Onarım:** Rakibin olası yörüngelerine karşı tacı en çok örten kart ve konum seçilir.
- **Kimse incinmez:** Karakterler kürsüde, sabun köpüğünden bir kalkanın içinde durur. Gülleler köpükten "boing" diye seker ve karakterler hedef alınamaz. Taç düşünce kaybedenin başında 2,5 sn bayılma yıldızları döner, sonra kazananı alkışlar.

**İlerleme:**
- **Kuşatma Seviyesi 1–20:** Galibiyet 100 XP, mağlubiyet 40 XP verir. Bonuslar: "Tek Atış Taç" +50, "Onarımsız galibiyet" +30.
- **Açılımlar:** Gülleler (tablodaki seviyelerde), Kumsal Adası (Sv. 4), Buzul Adası (Sv. 8), kale düzenleri, fırlatıcı ve bayrak kozmetikleri. "Yen, onunla oyna": yenilen karakterin kostümü oynanabilir olur.
- **Maç yıldızları:** ⭐ galibiyet. ⭐⭐ 5 atış veya daha azında galibiyet. ⭐⭐⭐ buna ek olarak kendi kale kütlesinin ≥ %70'i ayakta.

**Kuşatma Kupası:**
- 8 kişilik braket: çeyrek final, yarı final ve final, yani 3 maç.
- 4 kupa vardır: Çayır, Kumsal, Buzul ve Büyük Kupa. Büyük Kupa'nın finalinde Kumandan Pamuk beklemektedir.
- Kaybeden oyuncu aynı maçtan tekrar başlar, ceza yoktur.
- Kazanılan kupalar Kupa Dolabı'nda 3D olarak sergilenir.
- **Haftanın Kupası:** Değiştiricilerle oynanır ("Sadece Jöle Kaleler", "Hep Rüzgâr 5", "Çifte Taç" gibi).

**Yerel 2 oyuncu (sırayla, tek telefon):**
- Tur aralarında "Telefonu ver → Mavi Takım" perdesi açılır ve nişan gizlenir.
- Her oyuncu kendi karakterini seçer.
- Maç sonunda iki ismin yer aldığı bir paylaşım kartı çıkar.

**Farkı:**
- Amaç "hepsini yık" değil, "tacı denize düşür". Bu, hassasiyet ister.
- Kart elli Onarım bir mini deste stratejisi kurar.
- Rüzgâr tahminine göre savunma kurulur.
- Jöle gibi oyuncak malzemeler vardır.
- Maç 4 dakikada kesin olarak biter.

**Online sonrası:** Oyun tur tabanlı olduğu için asenkron online kolaydır. Her tur tek bir komuttur: açı, güç, gülle, Onarım kartı ve konumu.

### 2.7 Meta ve ilerleme

- **Mühendis Rütbesi (7 kademe):** Stajyer → Saha Mühendisi → Kıdemli Mühendis → Şantiye Şefi → Baş Mühendis → Yıkım Ustası → Efsane Mühendis.
  - XP kaynakları: yıldız 100, Ustalık Mührü 50, Zincirleme yıldızı 80, Günün Kontratı'nı tamamlamak 150 (3★ ile +100).
  - Kademe eşikleri: 0 / 1.000 / 3.000 / 6.000 / 10.000 / 15.000 / 22.000.
- **Sertifikalar (6):** Çelik Kesim, Beton Kırım, Yönlendirme, Zamanlama, Köprü, Kule. Her biri ilgili 5 kontratta 3★ ister. Ödülü bir unvan, bir HUD rozeti ve bir fünye kozmetiğidir.
- **Kozmetikler (hepsi oynayarak kazanılır):**
  - 12 fünye görünümü (ATEŞLE kutusu): Klasik Kırmızı, Bakır Kollu, Mavi Kopya, Gece Vardiyası, Altın Perçin ve diğerleri.
  - 6 HUD teması.
  - 3 siren sesi.
  - Şarj etiketi çıkartmaları.
  - Serbest Yıkım için renkli toz.
- **Yıkım Arşivi:** Her kontratın en iyi çöküşü otomatik saklanır (komut akışı olarak, birkaç KB). Oyuncu 50'ye kadar favori işaretleyebilir. Her kayıt replay ya da klip olarak yeniden render edilebilir.
- **Başarımlar (40), örnekler:**
  - "Kusursuz Üçlü": üst üste 3 kontratta H ≥ 0,98.
  - "Tek Kibrit": Zincirleme'yi pasif parça kullanmadan çöz.
  - "Cerrah": tek bir Kesici ile 3★.
  - "Tam Zamanında": 0,25 sn arayla 6 şarjlık dalga.
  - "Çeşme Dostu": 30 kontratın tamamında Korunan hasarı 0.
  - "Balon Kral": KUŞATMA'da tacı Balon Gülle ile düşür.
- **Suçluluk yaratmayan seri: "Şantiye Defteri".** Haftalık bir takvimde oynanan her güne damga vurulur. Haftada 4 damga bir kozmetik parça kazandırır. Gün kaçırmak seriyi sıfırlamaz ve bildirimler asla "kaçırdın" demez.
- **Rotasyonlar:** Her gün Günün Kontratı, her hafta Haftanın Şantiyesi ve KUŞATMA'da Haftanın Kupası yenilenir.
- **Yasaklar:** Loot box, şans kutusu, enerji, bekleme sayacı ve parayla alınabilen güç yoktur.

### 2.8 Viral sistemler

**Paylaşım kartı (Günün Kontratı):**

TR:
```
DİNAMİT #87 💥 %96 hedef · 3 şarj · ⭐⭐⭐
🟩🟩🟩🟩🟩🟩🟩🟩🟩🟨
🏛️ korundu · 2. deneme · Ustalık 🔩
```

EN:
```
DİNAMİT #87 💥 96% target · 3 charges · ⭐⭐⭐
```

- **Satır 2:** 10 kare H'yi gösterir, her kare %10'dur (dolu 🟩, kısmi 🟨, boş ⬛).
- **Satır 3:** Korunan durumu (🏛️ korundu ya da 💔 hasar), deneme sayısı ve varsa Ustalık Mührü.
- **Görsel kart (1080×1350):** Çöküşün en güzel karesi, sonuç damgası ve meydan okuma kodu.
- **KUŞATMA kartı:** "KUŞATMA 🏰 Profesör Baykuş'u 4 atışta yendim! 👑🌊 Rüzgâr ←3"

**Otomatik klip (≤ 8 sn):**
- Canlı yakalama yapılmaz, klip deterministik replay'den yeniden render edilir.
- Kurgu:
  - 0–1,2 sn: "1" kesmesi.
  - 1,2–5,5 sn: yönetmenin en yüksek kinetik enerji penceresinde ağır çekim çöküş.
  - 5,5–8 sn: toz ve sonuç damgası.
- Format: 720×1280, 30 fps. Filigran: "DİNAMİT · 3-5 · %97".
- Kayıt altyapısı (MediaRecorder veya host köprüsü) ortak sistemdedir.

**Meydan okuma kodu:**
- Biçim: `D1-087-3K7F-9QZX-M2HD`. Kod Crockford base32 ile yazılır ve 4'lü gruplara bölünür.
- İçerik: sürüm, kontrat no ya da gün no, şarj listesi.
- Şarj başına kodlanan alanlar: eleman indeksi (10 bit), tip (3 bit), gecikme yuvası (5 bit), yön (5 bit, 24 adım) ve fitil bağı.
- Kodu açan kişi, gönderenin çöküşünü birebir ve yarı saydam bir "hayalet" olarak izler, sonra aynı kontratı dener. Sonuç ekranı "Sen %98 — Ayşe %96" gibi karşılaştırır.
- KUŞATMA kodu tohumu ve iki oyuncunun tur komutlarını taşır, yani maçın tam replay'idir.

**Foto modu:**
- Replay'de görüntü dondurulur.
- Serbest kamera çöküş alanından en fazla 120 m uzaklaşabilir. FOV 20–90°, alan derinliği ayarlanabilir.
- 6 LUT: Altın Saat, Belgesel, Mavi Kopya, Gazete (yarım ton), Gece Vardiyası, Kartpostal.
- HUD gizlenebilir, çerçeve eklenebilir. Çıktı 1080×1920 PNG'dir.

### 2.9 FTUE: ilk 60 saniye

1. **0–30 sn:** §1'deki film oynar (Kontrat 1-1). İki hayalet yuva önceden işaretlidir, tek kelimelik "Dokun" ve basılı tutulan ATEŞLE vardır. Hedef Alanı, ilk denemede ≥ 2★ alınacak kadar geniştir.
2. **30–38 sn:** Oyuncu "Sonraki Kontrat"a basar ve 1-2 açılır. Kamera vincin ayaklarına bakar. Yük Görünümü düğmesi tek ikon ve parmak animasyonuyla parlar. Açılınca yapı x-ray olur ve kırmızı damar görünür.
3. **38–48 sn:** Oyuncu kırmızı ayağa dokunur. Tepside yalnızca Kesici parlar. Yeni şarj 1 sn'lik bir kartla tanıtılır: ikon + "çeliği keser".
4. **48–56 sn:** Oyuncu ikinci ayağa şarj koyar ve zaman çizelgesi ilk kez açılır. Hayalet el çipi 0,5 sn'ye sürükler, ekranda tek kelime "Sırala" yazar. Gecikme farkı devrilme yönünü belirler.
5. **56–60 sn:** ATEŞLE. Bu çöküşten sonra ana menü (canlı sahne) ilk kez görünür ve KUŞATMA kartı "Yeni!" etiketiyle belirir.

**Kurallar:**
- Ekranda aynı anda en fazla 3 kelime öğretici metin bulunur.
- Her öğreti bir eylemle biter. Öğretici atlanamaz ama 60 sn'yi geçmez.
- Fitil, Korunan ve bütçe kavramları, ilgili kontratta tek bir kartla tanıtılır.

### 2.10 Zorluk ve denge

- **Eğri:**
  - Hedef Alanı / ayak izi oranı 3,0'dan 1,2'ye düşer.
  - Şarj seçeneği 2'den 6'ya çıkar, Korunan sayısı 0'dan 2'ye çıkar.
  - Saha içinde zorluk 1'den 5'e yükselir, final (6) zirvedir.
  - Her sahanın ilk kontratı, önceki sahanın 4. kontratından kolaydır (nefes alma payı).
- **Mühendis Yardımı:**
  - İlk 10 kontratta açıktır. Sonrasında 3 başarısızlıktan sonra teklif edilir. Ayarlardan "Otomatik" ya da "Kapalı" seçilebilir.
  - 1. seviye: en kritik 3 eleman yanıp söner.
  - 2. seviye: çözüm şarjlarından biri hayalet olarak gösterilir.
  - 3. seviye: tahmini devrilme yönü bir okla gösterilir.
  - Yardım yıldız düşürmez, yalnızca Ustalık Mührü'nü kapatır.
- **Atla:** 5 başarısızlıktan sonra kontrat 0★ ile atlanabilir. Sıradaki kontrat açılır ama saha kapısı yıldıza bağlı kalır.
- **Denge kuralları:**
  - Çözücü bot her kontrat için en az 3 farklı 3★ çözüm bulmalıdır.
  - Tasarımcının çözümü, usta şarj sayısı veya daha azıyla 3★ almalıdır.
  - Rastgele yerleştirme botunun 3★ alma oranı < %1 olmalıdır.
- **KUŞATMA:**
  - Kolay/Normal/Zor ayarı karakterlerin σ değerini ×1,5 / ×1 / ×0,7 ile ölçekler.
  - Orta seviye persona botunun hedef galibiyet oranları: Tonton %80, Keçi %70, Sincap %60, Kaplumbağa %55, Baykuş %45, Pamuk %35.

### 2.11 UI ekranları

| Ekran | Anahtar öğeler |
|---|---|
| Ana menü (canlı 3D) | Son oynanan sahanın kahraman yapısı altın saat ışığında durur. Kamera yavaşça döner, toz zerreleri ve sodyum lambalar görünür. Büyük kartlar: Kontratlar, Günün Kontratı (#numara + "yeni" rozeti, geri sayım yok), Zincirleme, Serbest Yıkım, KUŞATMA (küçük viewport'ta döngüsel toon önizleme; Düşük'te statik görsel), Arşiv. Üstte rütbe ve yıldız sayısı. |
| Saha haritası | Mavi-kopya kâğıdında 5 saha, her birinde 6 düğüm ve yıldızlar. Kilitli sahada gereken ★ sayısı yazar. |
| Brifing | Yapı adı, Hedef, Korunan ikonları, bütçe, açık şarjlar, ★ eşikleri ve "Sahaya Gir" düğmesi. |
| Plan HUD | Üstte bütçe çubuğu, şarj sayısı, Yük Görünümü ve duraklat. Altta Şarj Tepsisi, zaman çizelgesi ve ATEŞLE (sağ altta; sol el modunda sol altta). |
| Çöküş HUD | Yalnızca "Atla" ve ağır çekim göstergesi. |
| Sonuç | Büyük % değeri, yıldızlar, Korunan durumu, kalan bütçe, puan ve Ustalık Mührü. Düğmeler: Tekrar (en büyüğü), Tekrar İzle, Paylaş, Sonraki. |
| Duraklat | Devam, yeniden başlat, ayarlar, çıkış. |
| Ayarlar | Grafik (Otomatik/Ultra/Yüksek/Orta/Düşük), ses kanalları, haptik, kamera titreşimi, Hareket Azalt, Flaş Azalt, yazı boyutu, renk körü modu, sol el, dil, Mühendis Yardımı. |
| Koleksiyon | Yıkım Arşivi, sertifikalar, başarımlar, kozmetikler, Kupa Dolabı. |
| KUŞATMA menüsü | Kendi ada sahnesi. Seçenekler: Hızlı Maç, Kupa, 2 Oyuncu, Koleksiyon. |

### 2.12 Ses, müzik, haptik

- **Saha ambiyansları:**
  - Liman: dalga, vinç gıcırtısı.
  - Santral: uğultu, kulelerde rüzgâr.
  - Köprü: nehir, kablolarda ıslık.
  - Kuleler: sert rüzgâr, halat titreşimi.
  - Stadyum: boş tribün yankısı, bayrak çırpınması.
- **Adaptif müzik:**
  - Plan: minimal bir "mühendis" nabzı (pad + mekanik perküsyon). Her şarjla bir katman eklenir, taban katmandan gerilim katmanına çıkılır.
  - Geri sayım: müzik keser, siren çalar, 3 bip gelir.
  - Çöküş: müzik yükselir. Ağır çekimde time-stretch yerine filtre ve reverb artışı kullanılır.
  - Sonuç: 3★'da majör çözülme akoru, başarısızlıkta cezalandırıcı olmayan asılı bir akor.
- **İmza sesler:**
  - "DİNAMİT çatırtısı": yüksek çelik ping + orta çatlak + düşük güm.
  - Toz nefesi: pembe gürültü + alçak geçiren süpürme.
  - İki tonlu siren, şarj klakı, fitil cızırtısı.
- **Üretim:**
  - Siren, bip, UI, rüzgâr ve toz nefesi Web Audio ile prosedürel üretilir.
  - Kırılma ve çarpma sesleri yalnızca lisansı doğrulanmış CC0 örneklerden gelir. Granüler varyasyon uygulanır: pitch ±%8, rastgele başlangıç ofseti, ses başına 4–6 varyant.
  - Müzik, oyun içi bir Web Audio sekanseri ve CC0 enstrüman örnekleriyle 3 katmanlı stem olarak üretilir.
  - Her dosyanın lisansı CREDITS.md'ye yazılır.
- **Mix:** Çöküş sesi plan müziğinden en az 9 dB yüksek olmalı. Sonuç ekranına geçişte 300 ms ducking uygulanır.
- **Haptik:** §2.3 tablosundaki desenler kullanılır, host köprüsü ortaktır. Haptik kapalıysa görsel geri bildirim aynen kalır.
- **KUŞATMA sesi:**
  - Enstrümanlar: marimba, pizzicato, ukulele havası.
  - Efektler: gülle uçuşunda kayan düdük, jöle "boing", su "plop", tahta "tak".
  - Karakterler anlamsız ama sevimli bir dilde konuşur (formant sentezi, gerçek bir dil yok).

### 2.13 Yerelleştirme, yaş ve hassasiyet

- **Dil ve biçim:**
  - Varsayılan dil TR, ikinci dil EN. Tüm metinler anahtar-değer JSON dosyalarında tutulur.
  - Büyük harf dönüşümü `toLocaleUpperCase('tr')` ile yapılır (i→İ, ı→I).
  - Yüzde biçimi TR'de "%96", EN'de "96%". Binlik ayırıcı TR'de "10.000", EN'de "10,000".
- **Adlar:**
  - Oyun ve mod adları (DİNAMİT, KUŞATMA) her dilde aynı kalır.
  - Şarjların EN karşılıkları: Cutter, Breaker, Wedge, Delay Fuse, Hydraulic Pusher, Cable Cutter.
- **Hassasiyet (zorunlu):**
  - Yalnızca endüstriyel ve fantastik yapılar kullanılır. Konut, okul, ibadet yeri ve hastane yoktur.
  - İnsan figürü yoktur, sahalar "tahliye edilmiş"tir. Her ateşlemeden önce siren çalar ve "ALAN TAHLİYE EDİLDİ" görünür.
  - Deprem, fay, yer sarsıntısı, enkaz ya da kurtarma çağrışımı metinde, görselde ve seste yer almaz. Ayarlardaki seçeneğin adı "sarsıntı" değil "kamera titreşimi"dir.
  - Çöküşün nedeni her zaman görünür şarjlardır.
  - Gerçek simge yapı, marka ya da kulüp rengi kullanılmaz.
  - Şarjlar mühendislik ekipmanı gibi görünür (turuncu gövde, numaralı etiket, kablo). Silah ya da terör çağrışımı yoktur.
- **13+:** Kan, yaralanma ya da hayvana zarar yoktur. KUŞATMA'da karakterler asla vurulmaz.

---

## 3. Sanat yönetimi (Art Bible)

### 3.1 Görsel tez
"Sinematik endüstriyel gerçekçilik":
- Fotoğraf gerçekliğinde PBR, altın ve mavi saat ışığı, katmanlı atmosfer.
- Yapı her karede kahramandır ve gökyüzüne karşı net bir siluet verir.
- Ölçek hissi her şeydir. İnsan figürü kullanmadan, insan ölçeğindeki ipuçları devasalığı kanıtlar: merdiven korkulukları, kapılar, uyarı tabelaları, 1 m'lik bariyerler.

### 3.2 Saha paletleri ve ışık

| Saha | Saat | Güneş (azimut / yükseklik, renk sıcaklığı) | Sis / atmosfer | Palet (hex) | Kahraman öğeler |
|---|---|---|---|---|---|
| 1 Liman Sanayi | 07:10 şafak | 110° / 14°, 4300 K; gökyüzü dolgusu 9000 K | Deniz pusu, üstel yükseklik sisi #C9D3D8, yoğunluk 0,012 | #2E4A5C deniz çeliği, #B5522B pas, #8C3B2A tuğla, #E8B23A uyarı sarısı, #9A9A92 beton, #DDE3E6 sis | Portal vinç, logosuz konteyner yığınları, 45 m baca, silo, tarihi çeşme |
| 2 Eski Termik Santral | 17:40, bulut arasından ışık | 250° / 9°, 3600 K; dolgu 7500 K | Ağır, kül tonlu #A9B0AE, yükseklikle hızla azalır | #6B6E70 kül, #A7A9A4 beton, #5D6B3A yosun, #9C4A22 pas, #FFB45A sodyum, #8FA3B0 gök | 90 m soğutma kuleleri, kazan binası, konveyör, eski türbin salonundaki cam müze |
| 3 Çelik Köprü & Viyadük | 06:40 vadi sabahı | 95° / 6°, 3800 K; dolgu 10000 K | Nehir seviyesinde yatay sis tabakası (0–15 m) #D8DDD9 | #7E2F25 kırmızı oksit astar, #B9C0C4 galvaniz, #3F5E57 nehir, #7A6E5E kaya, #C07A2C sonbahar | Kafes köprü, viyadük ayakları, kablolar, tarihi taş kemer köprü |
| 4 Kuleler | 14:30 bozkır | 220° / 48°, 5600 K; dolgu 8000 K | Hafif uzak pus #C8D6E0, hareketli bulut gölgeleri (shader) | #C9A65A bozkır, #4F86C6 gök, #C8362E / #F2F0EA havacılık şeritleri, #3E7F86 su kulesi, #B2AEA4 beton | Gergili radyo direği, su kulesi, gözetleme kulesi |
| 5 Terk Edilmiş Stadyum | 19:05 gün batımından alacakaranlığa | 285° / 4°, 2800 K; mor-mavi ortam 12000 K | Altın renkli yer sisi + mor üst katman | #F07A3A gün batımı, #4B3A6B gök, #2F7F86 camgöbeği / #8E9399 gri / #E9E4D8 kırık beyaz karışık soluk koltuklar, #8C8A3E sararmış çim, #FFC36B lamba | 4 ışık direği (yanar, devrilirken söner), tribünler, çatı makası, dev tabela |

**Işık kuralları:**
- Bir sahadaki tüm kameralarda güneş yönü sabittir.
- Hedef Alanı her zaman ışıkta kalır, gölgeye gömülmez (okunabilirlik).
- Koltuk renkleri karışık ve soluktur, gerçek bir kulübün renk kombinasyonunu çağrıştırmaz.

### 3.3 Malzemeler (PBR rehberi)
- **Beton:**
  - Yaşlanmış yüzey, akıntı lekeleri, kalıp izleri.
  - Kırık yüz ayrı bir malzemedir: daha açık, pürüzlü (roughness 0,95), agregalı. İnşaat demiri uçları Orta ve üstünde geometri, Düşük'te decal olur.
- **Tuğla:** Harç girintisi normal map ile verilir (Ultra'da parallax). Kırık yüzde turuncu-kırmızı iç görünür.
- **Çelik:**
  - Boyalı yüzey: metalness 0, roughness 0,6.
  - Kenar aşınmasında pas ve çıplak metal: metalness 1, roughness 0,35, curvature/AO maskesiyle.
  - Kesik uçta ısınmış mavi-mor tavlama halkası.
- **Kablo:** Galvaniz, ince geometri. Uzak LOD'da çizgiye düşer.
- **Cam (Korunan müze):** Transmission kullanılmaz. Ortam yansıması + fresnel + hafif iç dekor kartı.
- **Zemin ve Hedef Alanı:**
  - Zemin: asfalt, çakıl, toprak, beton döşeme.
  - Hedef Alanı zemine boyanmış sarı-siyah şerittir, gerçek mühendislik boyası gibi görünür.
  - Plan modunda kenarı hafifçe nabız atar. Çöküş sırasında yalnızca boya görünür.
- **Şarjlar:** Turuncu plastik gövde #FF6A13, siyah şablon numara, kablo, LED (kuruluyken yeşil, ateşlemede kırmızı).
- **Texel yoğunluğu:**
  - Kahraman yapı: 512 px/m (Ultra), 256 px/m (Orta), 128 px/m (Düşük).
  - Zemin: 128 px/m + detay dokusu.
  - Trim sheet kullanılır, yapı başına en fazla 2 malzeme seti.

### 3.4 VFX listesi
- **Toz bulutu:** Yumuşak parçacık, 8×8 flipbook. Normal kodlu sahte aydınlatmayla güneş yönüne göre yarı ışık alır.
- **Yer toz halkası:** 25 m/sn hızla yayılıp söner.
- **Kesici:** İnce parlak bir kesik çizgisi + kıvılcım yelpazesi.
- **Kırıcı:** Gri patlama tozu + küçük parçalar.
- **Görsel moloz:** Yalnızca görseldir, instanced çizilir, sayısı kademeyle ölçeklenir.
- **Çarpma ve iz efektleri:** Çelik sürtünme kıvılcımı, düşen parçaların toz izleri.
- **Yapıya özel:**
  - Silodan tahıl dökülmesi (sarımsı parçacık).
  - Köprüde su sütunu + yayılan halka.
  - Işık direğinde lamba kıvılcımı ve sönme.
  - Kopan kablonun kamçısı.
  - Dönen siren lambası.
- **Yük Görünümü shader'ı:** Fresnel kenar + eleman boyunca akan kesikli çizgiler. Renk yükü gösterir.
- **Yasak:** Ateş topu ve kara duman.

### 3.5 Post-processing görünümü
- **Tone mapping:** AgX, saha başına ayrı pozlama. three.js ya da postprocessing tarafındaki doğru kullanım yolunu ajan doğrulasın.
- **LUT:** Saha başına 32³'lük bir LUT:
  - Liman: soğuk gölge, sıcak ışık.
  - Santral: kül tonları, düşük doygunluk.
  - Köprü: yeşil-mavi.
  - Kuleler: canlı ve kontrastlı.
  - Stadyum: turuncu-mor.
- **Diğer efektler:**
  - Bloom yalnızca yüksek eşikte: flaş, lambalar, kıvılcım.
  - Hafif vinyet.
  - Ultra ve Yüksek'te ince film greni.
  - Alan derinliği yalnızca replay ve foto modunda.
  - SSAO yalnızca Ultra'da, diğer kademelerde pişmiş AO.
  - Kenar yumuşatma: Yüksek ve üstünde SMAA, altında ucuz bir AA. Mevcut efekt adlarını ajan doğrulasın.

### 3.6 Tipografi ve UI stili
- **Fontlar (Google Fonts):**
  - Başlık: **Barlow Condensed** 700/800.
  - Sayılar ve HUD: **JetBrains Mono** 600.
  - Gövde: **Inter** 400/600.
  - Türkçe glif testi zorunludur: ğ ş ı İ ç ö ü.
- **Stil: "mühendis tableti".**
  - Panel: koyu, yarı saydam #0F1418 (%82 opaklık), 1 px kılcal çizgiler #FFFFFF22.
  - Köşe parantezleri ve şablon yazılı etiketler.
  - Renkler: vurgu uyarı sarısı #F2B33D, ATEŞLE kırmızısı #E5432D, Yük Görünümü mavisi #2D6CDF, başarı yeşili #3CCB7F.
  - Hareket: 180 ms ease-out. Damgalar 120 ms'de "çakılır".
- **Düşük kademe:** Backdrop blur yoktur, panel düz renktir.

### 3.7 Düşük kademe de güzel (önce Düşük için tasarla)
1. Her chunk'ın AO'su köşe rengine pişirilir. Lokal AO olduğu için chunk düşse bile doğru kalır.
2. Gökyüzü, düşük çözünürlüklü boyalı bir kubbe + gradyandır.
3. Sis, shader içinde analitik olarak hesaplanır (yükseklik + mesafe).
4. Tone mapping, LUT ve vinyet tek bir tam ekran geçişinde birleştirilir.
5. Gölge için yapıya sıkı oturan tek bir 1024 shadow map kullanılır (CSM yok). Molozda blob gölge kullanılır.
6. Toz parçacıkları daha az ama daha büyüktür ve flipbook'ları iyi boyanmıştır.

**Kabul:** Düşük ve Ultra contact sheet'leri yan yana konduğunda kompozisyon, ışık yönü ve renk aynı okunmalıdır. Fark yalnızca detay ve yoğunlukta olmalıdır.

### 3.8 Görsel tutarlılık kuralları
- **Birimler:** 1 birim = 1 m, yerçekimi 9,81 m/sn².
- **Gerçekçi ölçekler:** baca 45–80 m, soğutma kulesi 90–120 m, kafes köprü açıklığı 80 m, radyo direği 120 m, ışık direği 50 m.
- **Işık:** Saha içinde ışık yönü sabittir.
- **Stil birliği:**
  - Ana oyunda tek stil vardır: fotogerçek PBR.
  - Kenney ve low-poly varlıklar ana oyunda yalnızca UI ikonu olarak kullanılır.
- **Kırık yüzler:** Kırık yüzün rengi, dış yüzle aynı ton ailesinden olur.
- **Tabelalar:** Hepsi kurgusal ve logosuzdur.

### 3.9 Yasaklar
- **Teknik görünüm:**
  - Varsayılan three.js görünümü (gri MeshStandard + tek directional + ambient).
  - Işıksız gri yüzeyler.
  - Ucuz doğrusal UI gradyanları.
  - Stili karışık varlıklar.
- **İçerik ve çağrışım:**
  - Ateş topu ve kara duman.
  - Zeminde yayılan çatlak decal'leri (deprem çağrışımı).
  - Konut pencere ritmi ya da balkon taşıyan cepheler.
  - İnsan silueti.
  - Gerçek marka, simge yapı ya da kulüp renkleri.
  - Ana oyunda çizgi film onomatopesi.

### 3.10 KUŞATMA Art Bible (ayrı ve eksiksiz)

**Tez:** "Cumartesi sabahı çizgi filmi". Doygun, yumuşak ve yuvarlak bir dünya. Her nesne elle tutulabilecek bir oyuncak gibi durur. Ölçek 1 birim = 1 m'dir. Bloklar 1 m tabanlıdır, kaleler 8–12 m yüksekliktedir.

**Shading:**
- **Toon ramp:** 3 basamak (gölge 0,35 / orta 0,7 / ışık 1,0), basamak kenarında 0,02 yumuşatma.
- **Rim ışığı:** Sıcak renkte, fresnel üssü 3, yoğunluk 0,35.
- **Outline:** Inverted-hull yöntemiyle çizilir.
  - Kalınlık: 0,02 m × mesafe ölçeği, en az 1,5 px.
  - Renk: albedo × 0,35. Asla saf siyah değildir.
- **Gölge:** Ultra ve Yüksek'te 1024'lük tek bir shadow map (yalnızca kaleler ve karakterler). Orta ve Düşük'te blob gölge.

**Işık:**
- Tek güneş: 45° yükseklik, 5200 K sıcak.
- Hemisfer dolgusu: üstte gök mavisi, altta çimen yeşili.
- Köşe rengine pişirilmiş AO.

**Temel palet:**

| Öğe | Renk |
|---|---|
| Gök | #7EC8F2 → #CFEFFF |
| Bulut / bulut gölgesi | #FFFFFF / #B9D7F0 |
| Deniz / köpük | #2BB3C9 / #E9FBFF |
| Çimen / toprak | #7BC950 / #C98A4B |
| Tahta | #D9A066 / #A86A3C |
| Taş | #A7B1BE / #7D8898 |
| Cam | #9FE6FF, opaklık 0,55 |
| Jöle | #FF6FA8, yarı saydam, iç parıltılı |
| Taç Taşı | #FFD23F + beyaz pırıltı |
| Takımlar | Mavi #3D7BFF, Kırmızı #FF5A4E |

**Ada temaları:**
- **Çayır Adası:** Çiçek benekleri, yel değirmeni dekoru.
- **Kumsal Adası:** Kum #F5D58A, palmiye #3FAE6A, turkuaz deniz #34D1C8, öğle ışığı.
- **Buzul Adası:** Kar #F4FAFF, buz #9ED8FF, çam #2F7D6D, lila gök #C9B8FF, güneş 25°'de.
- Her adanın altından kayalar sarkar ve kenarından denize bir toon şelale dökülür.

**Karakterler:**
- **Form:** Yuvarlak, keskin köşesiz. Baş, boyun %45'i kadardır. Gözler iri.
- **Siluette okunan imzalar:**

| Karakter | İmza |
|---|---|
| Topçu Tonton | Bıyık + miğfer |
| Hoplayan Keçi | Boynuz + motor gözlüğü |
| Sinsi Sincap | Dev kuyruk |
| Kaptan Kaplumbağa | Tuğla desenli kabuk |
| Profesör Baykuş | Yuvarlak gözlük + kep |
| Kumandan Pamuk | Pelerin + kıvrık tek kulak |

- **Squash & stretch:** Hacim korunur: sy = s, sx = sz = 1/√s, s ∈ [0,8; 1,25].
- **Animasyonlar:** Bekleme nefesi, nişan alma, sevinç dansı, endişe (taç yakınında blok düşünce), bayılma yıldızları (3 yıldız, saniyede 1 tur, 2,5 sn), alkış.
- **Üretim:** Blender'da kapsül ve kürelerin birleşimiyle prosedürel modellenir, basit bir rig ile canlandırılır.

**Fırlatıcılar:** Oyuncak gibi görünür: yuvarlatılmış tahta mancınık, yıldızlarla boyanmış tombul top. Gerçek silah görünümü yasaktır.

**VFX:**
- **Duman topları:** Cel-shaded, outline'lı küreler büyür ve "pop" diye kaybolur.
- **Onomatope çıkartmaları:**
  - TR: GÜM!, ÇAT!, PAT!, BOİNG!, PLOP!
  - EN: BOOM!, CRACK!, POP!, BOING!, PLOP!
- **Malzeme efektleri:** Tahta kıymıkları, taş ufaltısı, cam pırıltıları (üçgen ve yıldız biçimli). Jöle, vertex shader'da sönümlü bir sinüsle titrer.
- **Su ve taç:** Toon su sıçraması (halka + damlalar), Taç Taşı pırıltısı.
- **Galibiyet:** Gökkuşağı + konfeti.
- **Rüzgâr:** Beyaz, kavisli çizgiler. Yoğunlukları rüzgâr gücünü gösterir.
- **Ateş ve alev yoktur.**

**Su:**
- Renk bantları düzdür. Adaya olan mesafe sahte bir derinlik gibi kullanılır.
- Adaların çevresinde gürültü eşiğiyle oluşan bir köpük şeridi vardır.
- Dalgalar sinüs hareketiyle oynar, parıltılar eşikli gürültüyle oluşur.
- Yansıma yoktur.

**Bulutlar:**
- Instanced küre kümeleri, toon shading ve yumuşak kenar.
- 3 katmanlı parallax.
- Düşük'te billboard kartlara düşer.

**Post-processing:**
- Neutral tone mapping, pozlama 1,0.
- LUT yoktur, renkler kaynağında doğrudur.
- Bloom yalnızca Taç Taşı ve pırıltılarda kullanılır.
- Kademeye göre FXAA ya da SMAA. Vinyet yoktur.

**UI:**
- **Fontlar:** **Baloo 2** 700/800 (başlık), **Fredoka** 500 (gövde). Türkçe glif testi zorunludur. Fredoka testi geçemezse yerine **Nunito** 600/700 kullanılır.
- **Düğmeler:** Altında 6 px'lik bir "dudak" vardır, basınca 4 px iner. 250 ms'lik bir yaylanma ile (overshoot 1,08) geri gelir.
- **Renkler:** Krem panel #FFF6E5, kahverengi kontur #6B3F1F, onay yeşili #5CCB5F, uyarı turuncusu #FF9A3C.

**Düşük kademe:**
- Toon shading zaten ucuzdur.
- Bloklar malzeme başına bir InstancedMesh ile çizilir, outline'lar da instanced'dır. Toplam draw call ≤ 40.
- Bulutlar outline'sız kartlardır.
- Gölge blob gölgedir.
- Parçacık sayısı yarıya iner.
- Kabul: Düşük'te bile outline, ramp ve palet birebir aynı okunmalıdır.

**Yasaklar:**
- Fotogerçek doku ve PBR metal parlaklığı.
- Saf siyah outline.
- Ateş ve alev.
- Yaralı ya da ağlayan karakter.
- Gerçekçi silah görünümü.
- Karakterlere isabet.
- Ana oyunun gri-endüstriyel paletinin KUŞATMA'ya sızması.

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

### 4.2 Proje yapısı (`games/dinamit/`)
```
games/dinamit/
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

#### 4.G.1 Modül yapısı ve çalışma modeli
- `structgen/` → parametrik yapı üreteçleri + pre-fracture + bağ (bond) tablosu. Saf TS, DOM'suz; hem build-time (Node) hem runtime (Worker) aynı kodla koşar.
- `sim/` → Rapier dünyası, destek grafı, şarj zaman çizelgesi, hasar/skor, hash. `render/` dosyalarını import ETMEZ (lint kuralı ile zorla).
- `render/` → chunk batch render, görsel-only debris/toz/kıvılcım, Director kamera.
- `kusatma/` → ayrı oyun: aynı `sim/` çekirdeğini (Rapier sarmalayıcı, komut akışı, hash) ve aynı renderer'ı paylaşır; kendi kural seti, AI'ı ve toon pipeline'ı vardır.
- DİNAMİT simini ayrı bir `SimWorker` içinde koş (fizik ağır; ana thread render'a kalsın). Ana thread her frame "tick N'e kadar ilerle" mesajı yollar; Worker her tick sonunda aktif gövdelerin dönüşümlerini (pos 3 + quat 4 float, 300 gövde ≈ 8.4 KB) transferable `Float32Array` ile ve olay listesini (bond kırılmaları, yeni küme, temas darbeleri) yollar. Worker en fazla 2 tick önde koşar. Worker'da WASM açılamazsa aynı kodu ana thread'de koş (fallback, otomatik).
- Paket: `@dimforge/rapier3d-deterministic-compat@0.21.0` (WASM base64 gömülü; `await RAPIER.init()` gerekir). Tüm API isimlerini paketin `.d.ts` dosyasından doğrula; aşağıdaki isimler niyet bildirir.

#### 4.G.2 Yapı verisi (authoring as data)
Her yapı bir `StructureDef` JSON'udur; elle değil, parametrik üreteçle (`genSilo`, `genChimney`, `genCoolingTower`, `genTrussBridge`, `genViaductPier`, `genLatticeTower`, `genWaterTower`, `genWatchTower`, `genStand`, `genLightMast`, `genRoofTruss`, `genPortCrane`, `genConveyor`, `genBoilerHouse`) üretilir. Üreteç çıktısı:

```ts
interface Material { id:'celik'|'betonarme'|'tugla'|'ahsap'|'cam'|'sac';
  density:number;            // kg/m3: çelik 7850, betonarme 2400, tuğla 1800, ahşap 600, cam 2500, sac 7850 (kabuk kalınlığı ile)
  bondStrength:number;       // N/m2 eşdeğer oyun birimi (aşağıdaki tablo)
  impactToughness:number;    // darbe hasarına direnç çarpanı
  friction:number; restitution:number; dustColor:string; sfx:'beton'|'metal'|'cam'|'ahsap'; }
interface Member { id:string; kind:'kolon'|'kiris'|'capraz'|'kabuk'|'kablo'|'doseme'|'ayak';
  prim:'box'|'cylinder'|'shell'|'segment'; params:number[]; material:string; chunkIds:number[]; sockets:string[]; }
interface Chunk { id:number; member:string; mass:number; com:[number,number,number];
  collider:{type:'cuboid',half:[number,number,number],rot:[number,number,number,number]}|{type:'hull',verts:number[]};
  samples:number[];          // skor için 4–8 örnek nokta (yerel), kütle ağırlıklı
  meshRange:[number,number]; } // birleşik geometride index aralığı
interface Bond { a:number; b:number|-1 /* -1 = zemin */; area:number; normal:[number,number,number];
  centroid:[number,number,number]; capacity:number; health:number /* 1.0 */; }
interface Socket { id:string; member:string; pos:[number,number,number]; normal:[number,number,number];
  allowed:ChargeType[]; cutPlane?:[number,number,number,number];
  affectedBonds:Partial<Record<ChargeType,number[]>>; } // fracture sırasında önceden hesaplanır
```

- Malzeme bağ dayanımı (oyun birimi, kalibrasyon başlangıcı): çelik 9.0, betonarme 5.0, tuğla 2.2, ahşap 1.6, sac 3.0, cam 0.4. `capacity = area × bondStrength × safety` (safety varsayılan 1.6; sağlam yapıda maks. stres ≤ 0.6 olmalı — test edilir).
- Kontrat verisi (`contracts/<saha>-<n>.json`): `structures[{def, transform}]`, `targetPolygon` (XZ düzleminde 3–12 köşe, konkav olabilir), `protected[{type:'tarihiCesme'|'camMuze'|'komsuFabrika', transform, hp}]`, `budget`, `allowedCharges`, `starRules`, `env` (HDRI, saat, toz rüzgârı — yalnız görsel), `shotHints` (Director için önerilen kamera noktaları), `solution` (bot tarafından bulunmuş 3 yıldız referans çözümü, test için).
- Bütçe sınırları (oynanış, tüm tier'larda aynı): yapı başına ≤ 400 chunk, kontrat başına ≤ 900 chunk, ≤ 2.400 bond, ≤ 24 soket aktif seçilebilir.

#### 4.G.3 Pre-fracture (offline + runtime, tier'lar arasında ortak)
- 30 kontratın yapıları build-time'da `tools/fracture.ts` ile kırılır ve `.dnc` ikili dosyası olarak gönderilir: header (versiyon, generator hash) + birleşik vertex/index (meshopt ile sıkıştır) + chunk tablosu + hull vertex'leri + bond tablosu + soket tabloları. Günün Kontratı ve Serbest Yıkım varyantları aynı kodu runtime'da `structgen` Worker'ında koşar; sonuç IndexedDB'de `(generatorVersion, paramsHash)` anahtarıyla cache'lenir. Hedef: 900 chunk'lık kontrat Mi 9T'de ≤ 400 ms.
- **Kutular (kolon, kiriş, döşeme, ayak):** seeded Voronoi. Hücre noktalarını üye ekseni boyunca katmanlı dağıt (beton için 0.6–1.2 m hücre, soket çevresinde 2× yoğunluk — patlama bölgesinde ince parçalar). Her hücre = kutunun, en yakın 12–16 komşunun bisektör yarı-uzaylarıyla kırpılmış hali (konveks polihedron, plane-clipping). Kırık iç yüzlere `faceKind=interior` vertex attribute'u yaz (render iç malzemeyi buna göre seçer).
- **Çelik (I-profil kiriş, kafes çubuğu, vinç kolu):** Voronoi değil, **eksenel dilimleme**: düğüm noktaları ve soketlerde kes; segment uzunluğu 1.5–3 m. Kesici şarj kesiti tam soket düzleminden geçer.
- **Silindir/kabuk (silo, baca, soğutma kulesi, su deposu):** halka × açısal segment ızgarası: halka yüksekliği 1.2–2 m, açısal 12–20 dilim; her parça eğri kabuk parçasıdır, collider olarak konveks hull (≤ 16 vertex) veya kalınlık küçükse OBB cuboid. Tuğla baca: dilimlere ek olarak her dilime ±%15 seeded jitter (tuğla örgüsü hissi). Soğutma kulesi hiperboloidi: aynı ızgara, yarıçap `r(y)` fonksiyonundan.
- **Kablolar:** chunk değil; Rapier joint (rope/distance) zinciri, 6–10 segment. Kablo Kesici joint'i siler.
- **Collider seçimi:** her chunk için OBB fit et; `hacim(chunk)/hacim(OBB) ≥ 0.85` ise `cuboid` (çok daha ucuz), değilse konveks hull (≤ 16–24 vertex, quickhull + vertex azaltma). Hull'ları biraz içe çek (0.01 m) ki sağlam yapıda overlap olmasın.
- **Bond'lar:** komşu hücrelerin ortak yüz alanı > 0.01 m² ise bond oluştur; `area`, `normal`, `centroid` yüzden. Zemine değen chunk'lar `b=-1` bond alır.
- **Soket önhesabı:** Kesici için `|dot(centroid − p0, n)| < 0.15 m` olan ve aynı üyedeki bond'lar; Kırıcı için yarıçap `r` içindeki bond'lar. Liste sokette saklanır → runtime'da geometri sorgusu yok.
- Görsel detay tier'a göre değişebilir (iç yüz normal map, kenar yonga noise'u) ama **chunk geometrisi, collider'lar ve bond'lar tüm tier'larda bit-bit aynıdır** (fracture hash testi).

#### 4.G.4 Destek grafı, bağlanabilirlik ve yük
- **Başlangıç:** sağlam yapı chunk'larının collider'ları yapı başına tek bir `fixed` gövdeye bağlıdır → titreme yok, maliyet ≈ 0.
- **Bağlanabilirlik:** bir veya daha fazla bond kırıldığında (aynı tick'te toplanır, tick sonunda tek sefer) union-find'ı sıfırdan, kırılmamış bond'lar üzerinden kur (900 düğüm, 2.400 kenar → < 0.2 ms; inkremental silme karmaşıklığına değmez). Zemin düğümüne (`-1`) bağlı olmayan her bileşen = **serbest küme**. Kümeyi işlerken sıralama: bileşenin en küçük chunk id'si artan → deterministik.
- **Küme → dinamik gövde:** kümenin chunk collider'larını fixed gövdeden sök, tek bir `dynamic` compound gövdede yeniden oluştur (kütle/atalet collider'lardan). Başlangıç hızı: eğer küme önceden dinamik bir kümeden bölünüyorsa her yeni parça `v + ω × (com_yeni − com_eski)` miras alır.
- **Darbe ile kırılma:** her chunk collider'ında `CONTACT_FORCE_EVENTS` aktif, eşik `contactForceEventThreshold = 0.5 × m_chunk × g` mertebesinde. Tick sonunda olayları drain et (sıra: collider handle çifti artan), `J = totalForceMagnitude × dt`. Olayın değdiği chunk'ın tüm bond'larına hasar uygula:
  `hasar = max(0, J − J_min) / (capacity × impactToughness × K_imp)`, `J_min = 0.15 × m_chunk × 1 m/s`, `K_imp = 0.8` (kalibre et). `health ≤ 0` → bond kırılır → bağlanabilirlik yeniden hesaplanır (dinamik küme içinde de: küme alt kümelere bölünür). Bu hem düşen kümenin yere çarpınca parçalanmasını hem de debris'in sağlam yapıya vurup onu kırmasını sağlar.
- **Statik yük çözücü (Yük Görünümü + ilerleyen çöküş):** yalnız graf değiştiğinde çalışır, O(N+E):
  1. Zeminden BFS → her düğümün katmanı `d`.
  2. Düğümleri azalan `d` ile işle: `L_i = m_i·g + Σ(çocuklardan gelen yük)`. `L_i`'yi `d_j < d_i` olan komşulara `w_ij = area_ij × (0.25 + 0.75 × max(0, −n_ij·ŷ))` oranında dağıt (dikey taşıyıcılar yükün çoğunu alır).
  3. Hiç dikey ebeveyni olmayan (konsol) düğümde kapasiteyi malzemeye göre düşür: beton/tuğla ×0.3, çelik ×0.8 (çekme zayıflığı).
  4. `σ_ij = load_ij / capacity_ij`. `σ > 1` olan bond'lar **gecikmeli** kırılır: gecikme `clamp(round(6 / (σ − 1)), 2, 20)` tick. Bu, soketten başlayıp yapıya yayılan, gözle okunur, sinematik bir "çatırdama → çöküş" verir. Aynı tick'teki kırılmalar bond id sırasıyla uygulanır.
- Yük Görünümü renkleri: σ 0–0.3 camgöbeği, 0.3–0.7 sarı, 0.7–1.0 turuncu, > 1 kırmızı nabız; renk körü modunda kalınlık + desen. Görünüm, oyuncu şarj yerleştirdikçe "önizleme" yapar: soketin bond'larını sanal olarak silip çözücüyü koşar (sim'e dokunmadan, kopya graf üzerinde) → hangi bölgenin aşırı yükleneceğini gösterir. Fizik sonucunu göstermez (bulmaca kalır).

#### 4.G.5 Şarjlar = bond silme + darbe (veri olarak)
Zaman çizelgesi 0–4 s, 0.25 s adım = 15 tick adım; her olay tam bir tick numarasına yazılır. Komut: `{tick, socketId, type, dirIdx?}`.

| Şarj | Sim etkisi | Parametre |
|---|---|---|
| Kesici | soketin `affectedBonds.kesici` listesini sil; kesit normali boyunca iki tarafa ±1.5 m/s ayırma darbesi | yalnız çelik/sac üyeler |
| Kırıcı | yarıçap r = 0.8 m (Gelişmiş: 1.2 m) içindeki bond'ları sil; < 0.05 m³ chunk'ları "toza çevir" (fizikten çıkar, kütlesi skor için son konumda sayılır); radyal darbe `J(d) = J0·(1 − d/R)²`, R = 3 m | beton/tuğla |
| Yönlendirici Kama | bond silmez; kesimden sonra serbest kalan kümeye 8 yönden seçilen yatay yönde `Δv = 2.5 m/s` darbe (kütle ağırlıklı, tek tick) | başka şarjla aynı veya sonraki tick |
| Gecikmeli Fitil | sim etkisi yok; bağlı soketlerin tetik tick'ini +N adım kaydırır (zincir) | 0.25 s katları |
| Hidrolik İtici | 90 tick boyunca her tick sabit kuvvet (`F = 0.15 × m_küme × g`) seçilen yönde | kümeye yapışık |
| Kablo Kesici | kablo joint zincirini sil | köprüler |

- Darbe uygulama sırası: chunk id artan. Patlama yalnızca kırılıp dinamikleşen kümelere ve görsel sisteme etki eder; sağlam yapıya darbe yerine bond hasarı (`0.4 × J0 / capacity`) uygulanır.
- Patlama anında `PRNG(sim)` kullanılmaz; tüm sapmalar sabit veriden gelir. Görsel varyasyon ayrı `PRNG(visual)` akışından (sim akışını asla tüketmez).

#### 4.G.6 Rapier kurulumu
- `gravity (0, −9.81, 0)`, `timestep = 1/60` sabit; solver iterasyon 4 (Kuşatma'da 8; sağlam yığın stabilitesi için). Sleeping açık; uyku eşiklerini varsayılanda bırak, "yerleşti" kararı için kendi kuralın: tüm dinamik gövdeler uyuyor VEYA son 45 tick'te toplam kinetik enerji < %0.5 tepe değeri VEYA ateşlemeden 12 s sonra (hard cap) → skor.
- **CCD:** en küçük boyutu < 0.4 m olan chunk'larda ve tüm mermi/meteor/gülle gövdelerinde açık; büyük kümelerde kapalı (maliyet).
- **Collision group'lar** (üst 16 bit üyelik, alt 16 bit filtre):

| Bit | Grup | Kiminle çarpışır |
|---|---|---|
| 0 | ZEMIN | hepsi |
| 1 | YAPI_SABIT | DEBRIS, MERMI |
| 2 | DEBRIS | ZEMIN, YAPI_SABIT, DEBRIS, KORUNAN, MERMI |
| 3 | KORUNAN | DEBRIS, MERMI |
| 4 | SENSOR_HEDEF/ALAN | DEBRIS (yalnız sensör olayı) |
| 5 | MERMI (gülle, meteor, Kuşatma mermisi) | ZEMIN, YAPI_SABIT, DEBRIS, KORUNAN, BLOK |
| 6 | BLOK (Kuşatma) | ZEMIN, BLOK, MERMI |

- **Gövde bütçesi (oynanış, tier'dan bağımsız):** aynı anda ≤ 300 aktif dinamik gövde, ≤ 1.200 collider. Aşılırsa deterministik emeklilik: adaylar `(uyuyor önce, kinetik enerji artan, kütle artan, chunk id artan)` sırasıyla `fixed`'e çevrilir; hâlâ aşılıyorsa < 0.02 m³ hareketli chunk'lar fizikten çıkarılıp görsel debris sistemine aynı hızla devredilir, skor için kütleleri o tick'teki konumda sayılır. Mi 9T ölçümünde 300 gövde adımı p95 > 6 ms çıkarsa sınırı **tüm tier'larda** birlikte düşür (örn. 240); asla tier'a göre değiştirme.
- **Anında tekrar:** ATEŞLE'den hemen önce `world.takeSnapshot()` + graf/bond dizilerinin kopyası. "Tekrar dene" = snapshot restore (< 100 ms), yeniden yükleme yok. Eski dünyayı `free()` et; 20 tekrar sonrası WASM belleği artmamalı.
- **Ağır çekim:** sim her zaman 60 Hz tick. Ağır çekim faktörü `s ∈ [0.1, 1]` yalnızca biriktiriciye (`acc += realDt × s`) uygulanır → frame başına daha az tick; render iki tick arasında pozisyon lerp + quaternion slerp ile interpolasyon yapar (0.25×'te 4 frame'de 1 tick; interpolasyon olmadan takılır). Ağır çekim sonuçları ASLA değiştirmez (test edilir).

#### 4.G.7 Determinizm, hash ve replay
- `sim/` içinde yasak (ESLint `no-restricted-globals/properties`): `Math.random`, `Date`, `performance.now`, `Math.sin/cos/tan/exp/log/pow/atan2` (motorlar arası son bit farkı) → gereken yerlerde kendi polinom/LUT fonksiyonların (`dmath.ts`). `+ − × ÷ sqrt` IEEE garantili, serbest.
- Tüm iterasyonlar dizi/id sırasıyla; `Set/Map` yalnız ekleme sırası belirliyse; sort'larda id ile tie-break.
- **Tick hash:** her tick, aktif gövdelerin pozisyon/rotasyonunu `round(x × 1000)` ile kuantize edip + kırık bond bitset'i + küme sayısı → FNV-1a 32 bit. Son 600 tick'in hash'i ring buffer'da; replay dosyasında her 60 tick'te bir checkpoint.
- **Replay = komut akışı:** `{contractId, structgenVersion, seed, commands[], finalHash, checkpoints[]}` → tipik 300–900 byte. Yıkım Arşivi bunu saklar; oynatırken yeniden simüle eder. Uyumsuz versiyonda "Bu kayıt eski sürümde" uyarısı.
- **Director olay günlüğü:** canlı simde her tick `{brokenBonds, newClusters, maxImpulse, kineticEnergy, clusterBounds}` kaydedilir; replay director'u bunu kullanır (yeniden analiz gerekmez).

#### 4.G.8 Skor ve korunan obje hasarı
- **Hedef yüzdesi:** yerleşmeden sonra, yıkılması gereken yapıların her chunk'ı için `samples` noktalarını dünya uzayına çevir, XZ'de point-in-polygon (ray casting, kenar üstü = içeride), kütle × (içerideki örnek oranı). `%Hedef = Σ içerideki kütle / Σ toplam yapı kütlesi`. Toza çevrilen chunk'lar son konumlarıyla sayılır.
- **Ayakta kalma şartı:** yerleşmeden sonra zemine bağlı kalan herhangi bir chunk'ın tepe noktası `H_max` (kontrat verisi, varsayılan 3 m) üstündeyse → "Yapı ayakta kaldı" (yıldız yok).
- **Korunan objeler:** kendi fixed gövdeleri + 0.3 m büyük sensör kabuğu. Hasar = Σ `max(0, J − J_min_obj)` / `hp` (temas kuvveti olaylarından) + sensöre 2 m/s üstü hızla giren her debris kütlesi için `0.02 × kütle(t)`. Cam müze: cam paneller ayrı kırılgan chunk'lardır; her kırık panel %10 hasar. Sonuç 0–100 %.
- **Yıldız:** eşikler kontrat verisindedir (§2'deki formül esastır); varsayılan: ⭐ %70 hedef + hasar < %50; ⭐⭐ %85 + hasar ≤ %10; ⭐⭐⭐ %95 + hasar 0 + bütçe içinde. Tüm skor matematiği sim tarafında, tamsayıya (%0.1) yuvarlanmış olarak üretilir; UI sadece gösterir.

#### 4.G.9 Render: kümeden instanced/batched çizime
- Chunk'ların her biri benzersiz Voronoi şekli olduğundan klasik instancing olmaz. Çözüm: yapı başına **malzeme başına tek birleşik BufferGeometry**; her vertex'te `chunkId` attribute'u; vertex shader dönüşümü bir `DataTexture`'dan (RGBA32F, chunk başına 3 texel = 3×4 matris) okur. Sonuç: 400 parça uçuşsa da malzeme başına 1 draw call. Her frame yalnız değişen chunk'ları yaz (900 × 48 B = 43 KB tamamı bile ucuz). Shadow için aynı vertex mantığını `customDepthMaterial`'a da uygula (aksi halde gölgeler yerinde kalır — test).
- Alternatif: `BatchedMesh` (`setMatrixAt`) — Adreno 618'de `WEBGL_multi_draw` desteğini ve performansı benchmark'la; daha iyi değilse DataTexture yolunda kal.
- İç (kırık) yüz malzemesi: `faceKind` ile seçilen ayrı albedo/normal (beton iç dokusu, agrega); Yüksek+'da kırık beton yüzlerinden çıkan **görsel-only inşaat demiri** çubukları (instanced ince silindir, chunk dönüşümüne bağlı).

#### 4.G.10 Görsel-only debris, kıvılcım, toz
- **Kırıntı (debris) havuzu:** 6 beton/tuğla + 3 çelik + 2 cam kırık şekli, `InstancedMesh` havuzu (tier sayıları §5.G). Rapier değil; CPU'da SoA `Float32Array` integratörü (yerçekimi, zemin düzlemi/heightfield sekme 0.3, sürtünme, ömür 3–6 s, uyku). Kaynak: patlama anı (soket başına), büyük çarpma (J > eşik), bond kırılma yoğunluğu. `PRNG(visual)` kullanır.
- **Kıvılcım:** durumsuz GPU parçacıkları — vertex shader `p = p0 + v0·t + ½g·t²`, renk sıcaklık rampası, hız yönünde uzatılmış quad. CPU frame başına hiçbir şey yapmaz; spawn = bir uniform + attribute buffer güncellemesi. Kesici şarjda kesit hattı boyunca yoğun.
- **Toz (imza efekt):** soft-particle billboard'lar, 8×8 **lit flipbook** (offline üretilir; RGB = iki yönden ışık terimi/normal benzeri, A = yoğunluk). Runtime ışık: `mix(ambient, sunColor, saturate(dot(n, sunDir)))` + arkadan ışıkta kenar parlaması. Soft fade derinlik dokusuyla (Orta+); Düşük'te soft fade yok, bunun yerine parçacıklar zeminden 0.3 m yüksekte ve kenarları yumuşak maske. Çöküşte zemine çarpan büyük kümelerden **yere yayılan halka toz** (radyal hız 4–8 m/s, yavaşlayan, büyüyen 2→9 m). Rüzgâr kontrat verisinden (yalnız görsel).
- Toz overdraw Adreno 618'in bir numaralı riski: Orta/Düşük'te toz **yarım çözünürlük render target**'ında çizilip bilateral olmayan basit upsample ile birleştirilir; ekran kaplama sınırı aşılırsa (parçacık başına ekran alanı tahmini toplamı > 2.5× ekran) en yaşlı/en büyük parçacıkların alfa'sı hızlıca düşürülür.

#### 4.G.11 Director kamera (çöküş sineması)
- **Geri sayım (sabit kurgu):** "3" geniş establishing vinç çekimi (yapı kadrajın %60'ı), "2" ilk şarjın makro yakın çekimi (Yüksek+'da DOF), "1" ateşleyici panelinin yakın çekimi, "0" kahraman açısı: yapı yüksekliği kadrajın %70'i, üçte bir kuralı, düşüş yönüne dik yan profil.
- **Çöküş sırasında aday çekimler** (her 0.5 s yeniden puanla): yan profil (düşüş yönüne dik; yön = ana kümenin momentumundan), alçak kahraman açısı (yerden 1.6 m, 24 mm eşdeğeri, yukarı bakış), yavaş yörünge, drone tepe, `shotHints` noktaları. Puan = ana kümenin görünürlüğü (bounding sphere'lere birkaç ray, toz yoğunluğu ile tıkanma cezası) + kadrajdaki kinetik enerji + yenilik (önceki çekimle açı farkı > 35°) − 180° kuralı ihlali (kamera düşüş ekseninin aynı tarafında kalır).
- Kurgu kuralları: çekim min 1.2 s, max 3.5 s; bond kırılma hızının tepe yaptığı anda ağır çekim rampası 1.0 → 0.25 (0.3 s), en fazla 2.5 s gerçek zaman, toplam sürenin %40'ını aşma; kamera sarsıntısı yalnız kameraya yakın darbelerden, genlik üst sınırlı (§2 kuralları). Hareketli çekimlerde açısal hız ≤ 45°/s (mide bulantısı sınırı).
- Replay director'u canlı olay günlüğünü kullanır ve farklı açı seti seçer; 8 s klip için en yüksek "olay yoğunluğu" penceresini otomatik keser.

#### 4.G.12 Modlara özel notlar
- **Zincirleme (15 bulmaca):** aynı sim; birden fazla yapı ve "aktarım" props (devrilen vinç kolu, kayan konteyner). Başarı = tek ateşlemeden sonra `T` s içinde tüm hedef yapılar yıkıldı (her biri ayakta kalma şartını geçer). Bütçe genelde 1–2 şarj.
- **Serbest Yıkım:** Yıkım Güllesi = kinematic vinç kolu + rope joint zinciri (6 segment) + 4 t dinamik küre (CCD); Roket İtici = 2 s her tick kuvvet; Mini Meteor = yüksekten CCD'li ağır gövde + Kırıcı benzeri radyal darbe; Yerçekimi Ters = 3 s `gravity.y = +4` sonra geri. Aynı 300 gövde sınırı; sıfırla = snapshot restore. Tüm araç kullanımları komut olarak kaydedilir → paylaşılabilir replay.
- **Günün Kontratı:** `seed = YYYYMMDD` → doğrulanmış aile listesinden (build'de üretilen `daily-families.json`) taban kontrat + parametrik varyasyon (yükseklik ±%15, hedef poligon dönüşü ±30°, korunan obje konumu, kısıt: "max 3 şarj", "yalnız Kesici", "gecikme yok"). CI scripti önümüzdeki 120 günü solver bot ile doğrular; çözülemeyen günün ailesi bir sonrakine kaydırılır (deterministik).

#### 4.G.13 KUŞATMA teknik tasarımı
- **Dünya:** iki yüzen ada, merkezler x = ±32 m, ada üstü y = 12 m, deniz y = 0. Kale ızgarası 1 m. Bloklar: küp 1×1×1, kiriş 2×1×1 / 3×0.5×1, sütun 1×2×1, üçgen çatı, silindir kule 1×1.5; malzemeler: tahta (yoğunluk 600, HP 60, sürt. 0.7), taş (2.400, HP 150, 2 yarıya bölünür), cam (2.500, HP 20, 3 parçaya ayrılıp "poof" ile kaybolur), jöle (900, restitution 0.8, HP 999, darbe sönümler). Her blok ayrı dinamik gövde (bond yok); taraf başına ≤ 60 blok → toplam ≤ 140 gövde + mermiler. Solver 8 iterasyon, sürtünme yüksek, yerleşim testinde hareket eden blok = layout hatası.
- **Tur akışı:** Nişan (sim durur) → Atış çözümü (sim koşar; tüm gövdeler uyuyunca veya 6 s'de biter; 9 s hard cap'te kalan hareketliler fixed'e çevrilir) → Taç kontrolü → Onarım (3 kartlık eldeki bloktan 1'i yerleştir: kendi bölge, `intersectionsWithShape` ile çakışma yok, 30 tick yerleşme kontrolü) → sıra karşıya.
- **Balistik + rüzgâr:** mermi = CCD'li dinamik küre. Rüzgâr her tick doğrusal sürükleme kuvveti: `F = m·λ·(w − v)` (λ mermi türüne göre 0.04–0.12 s⁻¹; Ağır Gülle 0.03, Rüzgâr Gülü 0.15). Rüzgâr tur başına `PRNG(sim)` ile `w_x ∈ [−8, 8] m/s`, 0.5 adım, bir önceki turdan en fazla ±4 değişir. Doğrusal sürüklemenin kapalı formu AI ve önizleme için kullanılır:
  `v∞ = w + g/λ`, `x(t) = x0 + v∞·t + (v0 − v∞)·(1 − e^(−λt))/λ`.
- **Nişan girdisi:** sürükle-bırak; açı 10°–80°, güç %0–100 → `v0 = 18–42 m/s`. Komut tamsayıya kuantize: açı 0.1° birim, güç %0.1 birim → cihazlar arası aynı girdi. Önizleme noktaları: uçuş süresinin ilk ~%30'u, **sim ile aynı integratörle** (Rapier'siz, aynı semi-implicit Euler) hesaplanır; böylece önizleme ile gerçek uçuş aynı.
- **Mermiler (veri tablosu):** Taş Gülle (standart), Sekme Topu (restitution 0.9, 3 sekme sonra söner), Bölünen Gülle (uçuşta dokununca 3'e bölünür, ±8°; bölünme tick'i komuta yazılır), Ağır Gülle (3× kütle, v0 tavanı %80), Yapışkan Bomba (ilk temasta fixed joint, 2 s sonra radyal darbe R = 3 m), Rüzgâr Gülü (çarpınca 4 m yarıçapta yatay itme), kalan 2 tür §2'deki tanıma göre aynı tabloya eklenir. Hasar = temas kuvveti olayı `J` → `HP −= J × matCarpan`.
- **Taç Taşı:** özel gövde; kazanma = taç merkezi deniz sensörüne girer VEYA kendi ada üstünün 4 m altına düşer. Aynı atışta iki taç da düşerse kural §2'deki gibi (varsayılan: atış yapan kaybetmez, beraberlik bozma = kalan blok kütlesi).
- **AI nişan (2 aşama, Worker'da):**
  1. *Analitik tarama:* hedef seç (taç, taçı taşıyan en zayıf blok = destek grafı benzeri basit "altındaki bloklar" analizi, veya kale temeli — kişiliğe göre). Açı 10–80° (1° adım) × güç için kapalı formla ikili arama → hedef noktadan 0.5 m geçen yörüngeler; yol üzerinde 40 örnek noktayla blok AABB engel kontrolü. En iyi K aday.
  2. *Rollout doğrulama:* mevcut dünya snapshot'ını Worker'a gönder (`takeSnapshot` baytları), K adayı tam Rapier simülasyonuyla dene; ilk temastan 60 tick sonra veya 240 tick'te kes (uçuş boyunca kale uyuduğu için ucuz). Değerlendirme: taç düşüşü/yer değiştirmesi, rakip blok kaybı, kendi kalene risk (geri sekme) cezası. Bütçe Mi 9T'de ≤ 600 ms; "düşünme" animasyonu (1.5–2.5 s) bunu gizler.
  3. *Kişilik gürültüsü:* seçilen atışa `N(0, σ_açı)`, `N(0, σ_güç)` eklenir (`PRNG(ai)` akışı, maç seed + tur). Iskalamadan sonra aynı hedefe σ × 0.6 ("çatallama", gerçek topçu gibi), hedef değişince sıfırlanır.

| Karakter | σ açı | σ güç | Rollout K | Tercih |
|---|---|---|---|---|
| Topçu Tonton | 1.5° | %3 | 2 | Ağır Gülle, doğrudan taç |
| Sinsi Sincap | 1.0° | %2 | 4 | Sekme/Bölünen, temeller |
| Profesör Baykuş | 0.4° | %1 | 8 | rüzgârı tam hesaplar, en zayıf destek |
| §2 karakteri 4 (acemi arketip) | 4.0° | %7 | 0 | rastgele hedef |
| §2 karakteri 5 (agresif) | 2.0° | %4 | 2 | en ağır mermi, onarımı ihmal |
| §2 karakteri 6 (savunmacı) | 1.2° | %2.5 | 4 | onarımda tacı korur, Yapışkan Bomba |

- AI çıktısı her zaman bir komuttur; replay/online için AI'ın kendisinin cihazlar arası deterministik olması gerekmez (AI `Math.exp` kullanabilir), ama aynı cihazda seed'li ve tekrarlanabilir olmalı (denge testleri).
- **Karakterler fizik dışıdır:** fırlatıcı arkasındaki platformda görsel-only; çevrede blok düşerse "panik zıplaması", kayıpta bayılma yıldızları. Hiçbir mermi karaktere çarpamaz (collision group'ta yoklar).

#### 4.G.14 Online-sonra notları
- Kontratlar tek oyunculu; Günün Kontratı liderlik tablosu sunucuda doğrulanabilir: Node'da aynı WASM + `structgen` ile komut akışını yeniden simüle et, `finalHash` ve skor eşleşmeli (sunucu otoriter doğrulama, istemci otoriter oynanış).
- Kuşatma tur bazlı → asenkron PvP doğal: tur komutu `{projectile, angleQ, powerQ, splitTick?, repair:{block, cell, rot}}` (< 32 byte). İki taraf aynı simi koşar; tur sonu hash'i karşılaştırılır; uyuşmazlıkta sunucu yeniden simi otoriter. Tur süre sınırı ve zaman aşımında "otomatik pas" kuralı NetAdapter katmanında.

#### 4.G.15 Teknik riskler

| Risk | Azaltma |
|---|---|
| 300 gövde + hull'larla Rapier adımı Mi 9T'de yavaş | cuboid tercih, hull ≤ 16–24 vertex, solver 4, agresif uyku, deterministik emeklilik; ölç: adım p95 ≤ 6 ms; aşılırsa sınırı global düşür |
| Determinizm kırılması (JS tarafı) | lint yasakları, `dmath.ts`, id sıralı iterasyon, tarayıcılar arası hash testi |
| İlk patlamada shader derleme takılması | yükleme ekranında tüm malzemeleri (toz, kıvılcım, debris, X-ray) `compileAsync` ile önceden derle + 1 frame görünmez ısındırma çizimi |
| Çöküş "kutu kutu/sahte" görünür | Voronoi + soket yoğunlaştırma, iç yüz malzemesi, gecikmeli ilerleyen kırılma, toz örtüsü, görsel debris |
| Toz overdraw | yarım çözünürlük, ekran kaplama limiti, tier sayıları |
| Kuşatma yığınlarının kendiliğinden kayması | solver 8, sürtünme, layout yerleşme testi, maç başında 120 tick ön-yerleşme sonra uyut |
| Rapier API farkları (0.21.0) | tüm isimleri `.d.ts`'ten doğrula; sarmalayıcı `PhysicsWorld` arayüzü arkasına sakla |
| WASM bellek sızıntısı (tekrarlar) | `free()`, snapshot restore, 20 tekrar bellek testi |

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

Oynanış (chunk sayısı, bond'lar, 300 gövde sınırı, collider'lar, skor) TÜM tier'larda aynıdır. Aşağıdaki tablo yalnız görsel düğmelerdir.

**DİNAMİT (Kontratlar / Zincirleme / Serbest / Günün)**

| Düğme | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| Görsel debris havuzu (InstancedMesh) | 150 | 400 | 900 | 1.500 |
| Kıvılcım (GPU, eşzamanlı) | 200 | 500 | 1.200 | 2.500 |
| Toz billboard (eşzamanlı) | 60 | 140 | 260 | 400 |
| Toz render | yarım çöz., soft fade yok, 4×4 flipbook | yarım çöz., soft fade, 8×8 lit | tam çöz., soft fade, 8×8 lit | tam çöz., soft, 8×8 lit + arka ışık saçılımı |
| Gölge | 1 kaskad 1024, statik zemin AO bake | 1 kaskad 1536 | 2 kaskad 2048 | 3 kaskad 2048 PCF soft |
| Chunk gölgesi | yalnız büyük kümeler (> 2 t) | tüm kümeler | tüm kümeler | tüm kümeler + debris |
| İç yüz detayı | düz iç albedo | iç normal map | + kenar yonga | + inşaat demiri (görsel) |
| Patlama ışığı | emissive sprite + pozlama vuruşu | + 1 havuzlu point light | 2 point light | 3 point light |
| Şok dalgası distorsiyonu | yok | yok | var | var |
| Bloom | düşük maliyet, 3 mip | 4 mip | 5 mip | 5 mip |
| DOF (yalnız sinematik) | yok | ucuz Gaussian | bokeh yarım çöz. | bokeh |
| SSAO | yok (bake) | yok | yalnız inceleme modunda, yarım çöz. | yarım çöz.; çöküşte kapat |
| Çevre propları LOD/instancing | 0.5× yoğunluk, 2 LOD | 0.75× | 1× | 1× + çim kartları |
| Arka plan silüeti | impostor kart | impostor | düşük poli mesh | mesh + atmosferik katman |
| Yansıma | statik prefiltered HDRI cubemap (tüm tier'lar) | aynı | aynı | aynı + liman suyunda SSR yok, planar yok |

**KUŞATMA**

| Düğme | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| Outline (inverted hull) | var, 2.5 px | var, 2 px | var, 2 px | var, 1.5 px + derinlikle incelen |
| MSAA | yok | 2× | 4× | 4× |
| Gölge | blob gölge (decal) | 1024 sert toon gölge | 2048 sert | 2048 + kenar yumuşatma |
| Su | vertex dalga 48×48, foam doku halkası | 64×64, foam doku | 128×128, derinlik foam | + speküler şeritler |
| Bulut (instanced blob) | 8 | 14 | 22 | 30 |
| Konfeti/yıldız/poof parçacığı | 80 | 160 | 300 | 500 |
| Post | yok (doğrudan canvas) | FXAA yok, hafif vignette | bloom hafif | bloom + renk derecelendirme LUT |

**Mi 9T'de 60 fps için sıcak noktalar ve kurallar**
- Çöküş tepe frame'i bütçesi (16.6 ms): fizik Worker'da (ana thread'e 0 ms, Worker adımı ≤ 6 ms), ana thread JS ≤ 4 ms (transform dokusu yazımı, görsel debris integratörü, director), GPU ≤ 11 ms. GPU'nun en büyük kalemi toz overdraw → yarım çözünürlük + ekran kaplama sınırı zorunlu.
- Toplam draw call: Düşük ≤ 70 (global ≤ 80 sınırının altında; birleşik chunk batch sayesinde parça sayısı draw call artırmaz). Tris: yapı başına ≤ 60k (kırık geometri dahil), sahne ≤ 140k Düşük'te.
- Shader takılması sıfır olmalı: tüm patlama/toz/X-ray malzemeleri yüklemede derlenir; ilk patlama frame'i ölçülür (test).
- Frame başına allocation yok: tüm olay/transform dizileri havuzlu; GC kaynaklı > 8 ms duraklama testte hata.
- Çöküşün en ağır 3 saniyesinde PerformanceDirector yalnız dinamik çözünürlüğü (0.7×'e kadar) ve toz sayısını düşürebilir; 30 fps kilidi KULLANMA. Ağır çekim zaten fizik maliyetini düşürür (frame başına daha az tick) — bu tepe anına denk getirilir.
- Kuşatma Mi 9T hedefi: ≤ 60 draw call, ≤ 110k tris (outline dahil, inverted hull vertex maliyetini ikiye katlar ama fragment maliyeti çok düşük), AI rollout'ları Worker'da, ana thread frame süresine etki etmez.
- Toon shader maliyeti: 1 ramp doku (3 texel, NearestFilter) + palet doku (16×16) + rim (`pow(1 − N·V, 3)`) + tek shadow tap; PBR yok, IBL yok. Fragment başına ~25 ALU; Adreno 618'de rahat.

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
#   indir → games/dinamit/.cache/ altına (gitignore) aç → ./blender -b --python-expr "import bpy; print(bpy.app.version_string)"
#   Kısıtlar: GPU yok (Cycles CPU; bake çözünürlüğünü ve sample'ı küçük tut), EEVEE headless çalışmayabilir.
# Node araçları (games/dinamit içinde devDependency olarak, tam sürüm):
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

| Asset | Adet | Üretim yöntemi | Kalite notu | Tier varyantı |
|---|---|---|---|---|
| Parametrik yapı üreteçleri (silo, tuğla baca, soğutma kulesi, kazan binası, konveyör, kafes köprü, viyadük ayağı, kablo, radyo kulesi, su kulesi, gözetleme kulesi, tribün, ışık direği, çatı makası, liman vinci) | 15 üreteç → 30 kontrat yapısı + varyantlar | in-engine TS (`structgen`), fracture dahil | perçin/flanş/korkuluk gibi detayları geometri değil normal map + küçük instanced aksesuar olarak ekle; kenar pahı (bevel) üreteçte | geometri ortak; iç yüz/aksesuar yoğunluğu tier'lı |
| Korunan objeler (tarihi çeşme, cam müze cephesi, komşu fabrika) | 3 | Blender headless script (taş çeşme: oyma motifler bake edilmiş normal) | ayrıntılı ve "korunmaya değer" görünmeli; cam müzede kırılgan paneller ayrı mesh | LOD 2 seviye |
| Saha çevreleri (liman rıhtımı + konteynerler, termik santral avlusu, vadi/viyadük, tepe kuleler, stadyum çevresi) | 5 | modüler kit: CC0 Poly Haven/ambientCG dokular + Blender script ile kit parçaları; viyadük vadisi arka planı için AWS Terrain Tiles yükseklik verisinden mesh | 1u = 1 m; tutarlı texel yoğunluğu (≈ 512 px/m yakın, 128 px/m uzak) | prop yoğunluğu ve LOD tier'lı |
| PBR doku setleri (beton, yıpranmış betonarme, kırmızı tuğla, boyalı paslı çelik, oluklu sac, ahşap, cam, asfalt, toprak, çakıl) | 10 | ambientCG / Poly Haven CC0, KTX2 (UASTC normal, ETC1S albedo) | kırık iç yüz için ayrı "agrega beton" ve "ham tuğla" | Düşük 512, Orta 1K, Yüksek/Ultra 2K |
| HDRI (sabah, öğle bulutlu, gün batımı, endüstriyel pus) | 4 | Poly Haven CC0, prefiltered cubemap'e offline dönüştür | güneş yönü sahne ışığıyla eşleşmeli | Düşük'te 256 PMREM |
| Toz flipbook (lit) | 2 (yoğun duman, ince toz) + 1 kıvılcım çizgisi + 1 patlama çekirdeği | Blender headless: volumetrik noise küre simülasyonu, iki ışık yönünden render → RGB kanallara paketle; veya in-engine 3D noise ile offline render | yumuşak, ışığı alan, "pamuk" değil "ağır beton tozu" | 4×4 (Düşük) / 8×8 |
| Görsel debris şekilleri | 11 (6 beton/tuğla, 3 çelik, 2 cam) | in-engine: mini Voronoi ile üret | 30–80 tris | tek |
| Ateşleyici ve şarj modelleri (6 şarj tipi + ateşleyici paneli + kablo makarası) | 8 | Blender script (sert yüzey, bevel, emissive LED) | makro yakın çekime dayanmalı | 2 LOD |
| Kozmetik ateşleyici/HUD skinleri | 8 | aynı modelde malzeme/renk varyantı + SVG HUD temaları | oyunla kazanılır | tek |
| UI ikonları (şarjlar, sahalar, yıldız, sertifika, rütbe) | ~40 | elle SVG (kod içinde), tek stil hattı | Türkçe metin uzunluklarına uygun | tek |
| Fontlar | §3'te seçilen Google Fonts (OFL) | woff2 subset (Türkçe glifler dahil) | — | tek |
| SFX patlama katmanları (çatlama, gövde, kuyruk, uzak yankı) | 4 katman × 3 varyant | Web Audio prosedürel (gürültü patlaması + düşük sinüs darbe + saturasyon + konvolüsyon yankı) + gerekirse CC0 kayıt | mesafeye göre gecikme (343 m/s) ve low-pass | tek |
| SFX malzeme çarpma (beton, metal çınlama, cam, ahşap) | 4 malzeme × 4 | modal sentez (malzemeye özgü sönen sinüs kümeleri) | darbe büyüklüğüne göre perde/hacim | tek |
| Siren, geri sayım bipleri, "Alan tahliye edildi" anonsu | 3 | prosedürel siren (iki ton süpürme); anons: metin + UI, ses kaydı yerine ritmik bip (lisans riski yok) | — | tek |
| Müzik (gerilim kuruluşu + çöküş + sonuç) | 3 adaptif katman seti | Web Audio prosedürel stem'ler veya CC0 kaynaklar (lisansı CREDITS.md'ye) | geri sayımda katman katman yükselir | tek |
| **KUŞATMA** karakterleri | 6 | Blender headless script: subdiv yuvarlak gövde + büyük gözler + kişiliğe özgü aksesuar (bıyık, gözlük, kask); düz renk palet UV | squash & stretch vertex shader ile; kemik yok | 2 LOD (6k / 2.5k tris) |
| Ada setleri (3 tema: çayır, karlı, tropik) | 3 ada × 2 taraf | Blender script: noise ile ezilmiş kaya alt kütle + düz çim tepesi + tema propları (çiçek, kardan adam, palmiye) | sıcak, oyuncak gibi | prop yoğunluğu tier'lı |
| Kale blokları | 6 şekil × 4 malzeme | in-engine prosedürel (bevel'li kutu, palet renk + malzeme deseni dokusu) | jöle yarı saydam + parlak | tek |
| Kale layout'ları | 4 | JSON (ızgara koordinatı + blok tipi), editör yok | yerleşme testi zorunlu | tek |
| Fırlatıcılar (mancınık, top) | 2 | Blender script | atışta abartılı geri tepme animasyonu | tek |
| Mermiler | 8 | in-engine/Blender basit form + iz (trail) | her biri silüetiyle ayırt edilir | tek |
| Kuşatma VFX (poof bulutu, yıldızlar, konfeti, sıçrama, "BAM!" yazı sprite'ı) | 6 | prosedürel 2D çizim → atlas (canvas ile build-time render) | kalın konturlu, toon | parçacık sayısı tier'lı |
| Kuşatma SFX (boing, pop, vınlama, sıçrama, karakter "hımm/yaşasın" mırıltıları) | ~20 | prosedürel Web Audio + perde kaydırmalı sentez "anlamsız konuşma" | gülümseten, rahatsız etmeyen | tek |
| Kuşatma müzik | 2 loop + 3 jingle | prosedürel veya CC0 (Kenney jingle paketleri gibi CC0 kaynaklar — lisansı doğrula) | neşeli, 90–110 BPM | tek |

---

## 7. Mobil uygulama entegrasyonu (3 oyunda birebir aynı sözleşme)

### 7.1 Çıktılar
- **`dist/web/`: birincil çıktı.**
  - Çok dosyalı, göreli yollu, hash'li asset'ler. Çalışma zamanında hiçbir CDN'e bağlı değil; tamamen offline çalışır.
  - Kullanım yolları:
    - (a) Herhangi bir statik HTTPS hosta koyup URL ile açmak. Tavsiye edilen yol budur.
    - (b) Uygulama paketine gömmek. Android'de `WebViewAssetLoader` ve `https://appassets.androidplatform.net`. iOS'ta `WKURLSchemeHandler` veya yerel sunucu. Flutter'da `InAppLocalhostServer`.
  - `file://` üzerinden fetch, WASM ve KTX2 sorunlu olabilir. Bu notu INTEGRATION.md'ye yaz.
- **`dist/single/dinamit.html`: tek dosya** (`vite-plugin-singlefile 2.3.3`; WASM, KTX2 ve ses data URL olarak gömülü).
  - Toplam ≤ 25 MB ise **tüm oyunu** içerir.
  - Aşarsa ana mod ve en az bir ek mod tek dosyada olur; kalan paketler aynı klasördeki `packs/` altından yüklenir. Bunu INTEGRATION.md'de açıkça anlat.
  - Tek dosyanın `file://` üzerinden headless Chromium'da açılıp oynandığını testle kanıtla.
- **`dist/web/host-demo.html`:** Uygulama yerine geçen bir test sayfası. Oyunu iframe'de açar, köprü mesajlarını loglar, pause, resume, mute, dil ve kalite butonları vardır. Köprü e2e testleri bunu kullanır.

### 7.2 Köprü protokolü (`src/bridge/GameBridge.ts`)
**Zarf:** `{ "v": 1, "game": "dinamit", "type": "<tip>", "id": "<opsiyonel istek id>", "payload": { ... } }` (JSON string).

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

**Birim / sim testleri (Node, headless Rapier)**
1. *Fracture determinizmi:* her üreteç × 5 seed, 3 koşu + Worker vs Node → chunk/bond/collider hash'i birebir aynı. Tier değiştirmek hash'i değiştirmez.
2. *Union-find doğruluğu:* 10.000 rastgele graf + rastgele bond silme → bileşenler brute-force BFS ile aynı; zemine bağlı küme sayısı eşleşir.
3. *Statik stabilite:* 30 kontratın her yapısı şarjsız 600 tick koşar → 0 kırık bond, 0 dinamik gövde, statik çözücüde maks. σ ≤ 0.6.
4. *Yük çözücü mantığı:* tek kolonlu sentetik kule; kolonun bond'larını sil → üstteki tüm düğümler serbest kümeye geçer; konsol testinde beton kapasitesi ×0.3 uygulanır.
5. *Şarj etkileri:* Kesici yalnız `affectedBonds.kesici` bond'larını siler; Kırıcı yarıçap dışındaki hiçbir bond'a dokunmaz; Gecikmeli Fitil tetik tick'ini tam N×15 kaydırır.
6. *Skor:* poligon içine/dışına bilinen kütlede chunk'lar yerleştirilmiş sentetik sahne → %Hedef beklenen değere %0.1 hassasiyetle eşit; konkav poligon ve kenar üstü durumlar dahil.
7. *Korunan hasar:* çeşmenin 5 m uzağına bırakılan debris → hasar 0; üstüne 2 t chunk düşürme → hasar > %10; cam müzeye küçük çakıl → en az bir panel kırığı.

**Determinizm testleri**
8. 30 kontrat × saklı çözüm × 3 koşu → her tick hash'i aynı; Playwright ile Chromium + Firefox + WebKit'te final hash aynı.
9. *Ağır çekim değişmezliği:* aynı çözüm zaman ölçeği 1.0 / 0.5 / 0.25 / 0.1 ve render hızı 30 / 60 / 120 fps simülasyonuyla → tick hash dizisi aynı.
10. *Tier değişmezliği:* Düşük ve Ultra'da aynı komutlar → aynı skor, aynı final hash, aynı yıldız.
11. *Tekrar (snapshot restore):* 20 kez "Tekrar dene" → her seferinde ilk koşuyla aynı hash; WASM belleği artışı < %10.
12. *Replay:* Yıkım Arşivi kaydı (komut akışı) yeniden oynatılınca checkpoint hash'leri eşleşir; kayıt boyutu < 1 KB.
13. *Kuşatma tur hash'i:* rastgele 500 maçın komut akışları yeniden oynatılınca her tur sonu hash'i eşleşir.

**Fuzz, sağlamlık, performans**
14. *Rastgele şarj botu:* 1.000 rastgele yerleşim/zamanlama → aktif dinamik gövde asla > 300, collider ≤ 1.200; NaN/Infinity yok; hiçbir chunk zeminin 0.5 m altında değil; dünya sınırı dışına çıkan gövde fall-kill ile temizlenir ve skor bunu "dışarıda" sayar.
15. *Tünelleme:* 10.000 yüksek hızlı küçük chunk/gülle atışı (CCD açık) zemine, korunan objeye ve kale bloklarına → içinden geçen 0 (temas olayı olmadan karşı tarafa geçiş = hata).
16. *Adım süresi:* 300 aktif gövde senaryosunda, CDP `setCPUThrottlingRate(4)` ile Mi 9T profili → Worker adımı p95 ≤ 6 ms; ana thread frame p95 ≤ 16.6 ms; ilk patlama frame'i ≤ 25 ms (shader ön-derleme kanıtı).
17. *GC:* çöküş boyunca heap tasarrufu; > 8 ms'lik major GC duraklaması yok.
18. *Serbest Yıkım stres:* 60 s boyunca araç spam'i (meteor + gülle + roket) → gövde sınırı korunur, frame p95 bütçede.

**İçerik doğrulama botları**
19. *Solver bot (Kontratlar):* Node'da render'sız hızlı sim; arama = greedy soket seçimi + rastgele yeniden başlatma + zamanlama tepe tırmanma, kontrat başına ≤ 90 s. Her kontrat için ≥ 1 adet 3 yıldız çözüm bulunmalı ve `solution` olarak saklanmalı; bot sonuçlarından bütçe ve eşikler kalibre edilir (3 yıldız bulmak bota en az 200 deneme sürmeli — çok kolay kontrat uyarısı).
20. *Zincirleme:* 15 bulmacanın her biri saklı çözümle başarı verir; tek şarjlı rastgele botun başarı oranı < %5 (bulmaca gerçekten bulmaca).
21. *Günün Kontratı:* önümüzdeki 120 günün seed'i → geçerli kontrat üretir, solver bot 3 yıldız bulur; aynı seed iki cihazda aynı chunk hash'i verir.

**KUŞATMA denge ve kurallar**
22. *Layout yerleşme:* 4 layout × 3 tema → 180 tick sonra hiçbir blok > 2 cm hareket etmemiş, taç yerinde.
23. *Önizleme doğruluğu:* 1.000 rastgele atış → önizlenen yörünge ile gerçek uçuş (ilk temas öncesi) arasında maks. sapma ≤ 1 cm.
24. *AI vs AI:* her karakter çifti 200 maç (taraf değiştirerek) → kazanma matrisi; beklenti: Profesör Baykuş vs acemi arketip ≥ %75; en güçlü vs en zayıf ≤ %92 (umutsuz değil); ortalama maç 6–12 tur, ≥ %95 maç ≤ 4 dk (sim süresi + düşünme + animasyon tahmini); 30 turu aşan maç < %1 (aşarsa beraberlik kuralı tetiklenir).
25. *AI süre bütçesi:* Mi 9T profilinde karar ≤ 600 ms (Worker), ana thread'de AI sırasında frame düşüşü yok.
26. *Onarım:* geçersiz yerleşimler (çakışma, rakip bölge, havada) reddedilir; 1.000 rastgele geçerli yerleşimde kale çökmesi tetiklenmez.
27. *Pas-ve-oyna:* iki insan sırası doğru değişir, telefon devri ekranı her turda görünür, rüzgâr her iki oyuncuya aynı.

**Görsel kontroller**
- Ateşlemeden önce chunk'lar arasında görünür çatlak/ışık sızıntısı yok (3 zoom seviyesinde contact sheet + piksel farkı kontrolü: sağlam yapı render'ı ile birleşik tek-mesh referans render'ı arasında fark < %1).
- Kırık iç yüzler iç malzemeyi kullanır; dış doku iç yüzde gerilmiş görünmez.
- Chunk gölgeleri parçalarla birlikte hareket eder (customDepthMaterial testi: çöküş sonrası gölge kare ile mesh konumları tutarlı).
- Yüksek+'da toz zeminle sert kesişim çizgisi yapmaz (soft particles).
- Kuşatma outline'larında köşe çatlağı yok (smoothed normal attribute); su köpüğü adaları çevreler; ufukta su kenarı görünmez.
- Hiçbir karede insan figürü, konut binası, deprem göndermesi yok (içerik listesi denetimi).

**Contact sheet çekim listesi**
- *Kontratlar (her saha için 1 kontrat):* inceleme geniş açı; Yük Görünümü (X-ray); şarj yerleştirme + zaman çizelgesi UI; geri sayım 3 / 2 / 1 kareleri; çöküş t = 0.3 / 1.0 / 2.0 / 3.5 s; ağır çekim tepe karesi; toz oturmuş son kare; sonuç ekranı (yıldızlar + % + hasar).
- *Zincirleme:* zincirin ortası (ikinci yapı devrilirken) ve son kare.
- *Serbest Yıkım:* gülle salınım ortası, meteor çarpma anı, Yerçekimi Ters havada asılı debris.
- *Günün Kontratı:* kısıt kartı + paylaşım kartı ("DİNAMİT #87 💥 %96 hedef · 3 şarj · ⭐⭐⭐").
- *Kuşatma:* iki adanın genel planı (her tema), sürükleyerek nişan + önizleme, uçuştaki mermi (takip kamerası), çarpma poof'u, onarım eli, taç denize düşerken ağır çekim + sıçrama, zafer ekranı, 6 karakter portresi (idle + sevinç + bayılma yıldızları), turnuva tablosu.
- Her kare Düşük ve Ultra'da yan yana (tier kalite farkı görünür ama Düşük de "güzel" olmalı).

---

## 10. Cila listesi (vakit kalırsa, öncelik sırasıyla)

1. **Çöküş öncesi "nefes":** ilk serbest kümenin kopmasından 0.3 s önce gıcırtı sesi + mikro sarsıntı + çatlaktan süzülen ince toz (bond σ > 0.9 olan yerlerden) — gerilimi ikiye katlar.
2. **Ses mesafe gecikmesi:** patlama flaşı anında, ses `mesafe / 343 m/s` sonra; uzak çekimlerde low-pass. Sinematik gerçeklik hissinin en ucuz yolu.
3. **Kontrat başına el ayarı kahraman çekimleri:** `shotHints` ile 30 kontratın her birine 1–2 özel kamera; Director bunları tercih eder.
4. **Yere yayılan toz dalgası:** büyük kümenin zemine çarpışında halka şeklinde yuvarlanan lit toz + kameraya doğru gelen toz perdesinin hafif pus/kontrast düşüşü.
5. **Haptik senkronu:** bond kırılma hızına bağlı titreşim yoğunluğu (bridge üzerinden; §2 desenleri), büyük çarpmalarda tek güçlü darbe.
6. **Önce/sonra karşılaştırma:** sonuç ekranında kaydırmalı "önce / sonra" fotoğraf + otomatik 8 s klip.
7. **Yük Görünümü animasyonu:** X-ray açılırken yükün zeminden yukarı "akan" ışık çizgileri; şarj önizlemesinde aşırı yüklenen bond'ların nabız atması.
8. **Kırık yüz detayı:** Yüksek+'da inşaat demiri çubukları, çelik kesitlerde turuncu soğuyan kesik kenarı (emissive 2 s'de söner).
9. **Kuşatma squash & stretch ve tepkiler:** atışta fırlatıcı geri tepmesi, karakterin "nişan alıyorum" dil çıkarma animasyonu, yakın isabet sonrası panik zıplaması, kazanınca dans.
10. **Kuşatma taç düşüşü sineması:** ağır çekim + takip kamerası + büyük su sıçraması + konfeti + karakterin bayılma yıldızları.
11. **Saha atmosfer varyantları:** her sahaya 2 ışık durumu (sabah pusu / gün batımı) — yalnız görsel, Günün Kontratı'nda seed ile.
12. **Çevre hayatı (zarar görmeden):** siren çaldığında uzaktaki martılar/kargalar sahadan güvenle uzaklaşır, liman suyunda küçük dalgacıklar; hiçbir canlı çöküş alanında olmaz.
13. **Fotoğraf modu:** donmuş tick'te serbest kamera, DOF, pozlama, filtre; ağır çekim anında fotoğraf.
14. **Replay zaman çubuğu:** Yıkım Arşivi'nde tick'e sar/geri sar (yeniden simülasyon + en yakın checkpoint snapshot'ından başlat).
15. **Kuşatma Kupası sunumu:** turnuva tablosunda karakter kartları, maç arası mini "röportaj" baloncukları.
16. **Renk körü dostu X-ray paleti ve desenler** (ayar).
17. **Ateşleyici kozmetiklerine özel geri sayım sesleri ve LED animasyonları.**
18. **Kuşatma bulutlarına toon gölge düşümü** (bulut gölgesi adaların üzerinden kayar, Yüksek+).

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

- [ ] 5 saha × 6 = 30 kontrat oynanabilir; her biri için saklı 3 yıldız çözüm, replay ile ≥ 3 yıldız verir (test 19).
- [ ] 15 Zincirleme bulmacası, Serbest Yıkım'ın 4 aracı ve Günün Kontratı (seed = tarih) çalışıyor; günlük paylaşım kartı tam formatta üretiliyor.
- [ ] 6 şarj tipi (Kesici, Kırıcı, Yönlendirici Kama, Gecikmeli Fitil, Hidrolik İtici, Kablo Kesici) veriyle tanımlı ve 0–4 s / 0.25 s zaman çizelgesiyle tick-kesin tetikleniyor.
- [ ] Yapılar `structgen` üreteçlerinden gelir; fracture hash'i tier'lar ve Worker/Node arasında aynı (test 1).
- [ ] Destek grafı + statik yük çözücü: şarjsız 600 tick'te 0 kırılma; X-ray Yük Görünümü σ renkleriyle çalışıyor ve önizleme simi bozmuyor.
- [ ] Darbe tabanlı bond kırılması: düşen kümeler yere çarpınca parçalanıyor; debris sağlam yapıyı kırabiliyor (kanıt: contact sheet + olay günlüğü).
- [ ] Aynı anda ≤ 300 aktif dinamik gövde sınırı her fuzz koşusunda korunuyor; sınır tier'dan bağımsız.
- [ ] Ağır çekim, render fps'i ve tier, tick hash dizisini değiştirmiyor (test 9, 10).
- [ ] Chromium, Firefox ve WebKit'te 30 çözümün final hash'leri birebir aynı (test 8).
- [ ] "Tekrar dene" ≤ 100 ms içinde aynı başlangıç durumuna dönüyor; 20 tekrar sonrası bellek artışı < %10.
- [ ] Replay dosyası < 1 KB ve checkpoint hash'leriyle doğrulanıyor; Yıkım Arşivi en az 20 kayıt saklıyor.
- [ ] Skor (%Hedef, korunan hasar, bütçe, yıldız) sim tarafında üretiliyor; sentetik skor testleri %0.1 hassasiyetle geçiyor.
- [ ] Mi 9T profilinde (CPU 4× yavaşlatma + Düşük/Otomatik) çöküş tepe anında frame p95 ≤ 16.6 ms; Worker fizik adımı p95 ≤ 6 ms; ilk patlama frame'i ≤ 25 ms.
- [ ] Draw call: Düşük'te çöküş sırasında ≤ 80 (spector/renderer.info ile ölçülmüş); chunk sayısı draw call'u artırmıyor (birleşik batch).
- [ ] Tünelleme fuzz'ında (10.000 atış) 0 geçiş; dünya dışına çıkan gövde yok veya fall-kill ile doğru sayılıyor.
- [ ] Director kamera: geri sayım 3-2-1 kurgusu, çöküşte min 1.2 s / max 3.5 s çekim kuralı, 180° kuralı ve ağır çekim payı ≤ %40 log ile doğrulanmış.
- [ ] Toz lit flipbook + soft particle (Orta+) çalışıyor; Düşük'te yarım çözünürlük toz; contact sheet'te sert kesişim çizgisi yok.
- [ ] Sağlam yapıda chunk dikiş/çatlak görünmüyor (piksel fark testi < %1).
- [ ] KUŞATMA: 3 ada teması × 4 kale layout'u, 8 mermi türü, 6 AI karakteri, Kuşatma Kupası ve pas-ve-oyna çalışıyor; maçların ≥ %95'i ≤ 4 dk.
- [ ] Kuşatma önizleme–gerçek uçuş sapması ≤ 1 cm; AI kararı Mi 9T profilinde ≤ 600 ms ve Worker'da.
- [ ] AI vs AI kazanma matrisi raporlandı ve 24. testin aralıklarında.
- [ ] Kuşatma toon pipeline (3 basamak ramp + rim + inverted hull outline) tüm tier'larda aktif; Düşük'te ≤ 60 draw call ve ≤ 110k tris.
- [ ] Hiçbir sahnede konut binası, insan figürü, yaralanma veya deprem göndermesi yok; geri sayım öncesi siren + "Alan tahliye edildi" her kontratta görünüyor.
- [ ] Kuşatma tur komutları kuantize ve < 32 byte; aynı komut akışı her tur sonunda aynı hash'i veriyor (online-hazır).

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
