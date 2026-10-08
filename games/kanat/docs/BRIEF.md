# KANAT — Yapım Brifi (Claude Code otonom oyun stüdyosu görevi)

> Oyun 1/3 · Tür: Anadolu manzaralarında wingsuit yakınlık uçuşu · Bağımsız mod: **SÜRÜ.io** (yeni nesil .io) · Öncelikli yön: dikey (yatay tam destek)
> Klasör: `games/kanat/` · Hedef cihazlar: Xiaomi Mi 9T, iPhone 11, iPhone 13, Xiaomi 13 · Teknoloji: three.js r186 + WebGL2 + TypeScript + Vite
> **Bu dosyanın tamamı tek bir görevdir.** Baştan sona oku; sonra §0'daki protokole göre başla ve §11 Bitti Tanımı tamamen yeşil olana kadar durma.

**Belge içi tutarlılık kuralı:** Bu brif bölümler hâlinde paralel yazıldı. İki bölüm aynı sayı ya da kural hakkında çelişirse şu sırayla karar ver:
- Oyun kuralı ve denge değerinde §2 (GDD) esastır.
- Algoritma ve teknik uygulamada §4.G esastır.
- Ortak sözleşmelerde (§0, §5, §7, §9, §11) ortak çekirdek metni esastır.

Her çelişkiyi F1 fazında `docs/KARARLAR.md` dosyasına yaz ve tek bir değere bağla. Değeri veri dosyasında tut. Bilinen kararlar:
- **Yakınlık çarpanı ve düz yüzey:** Düz yüzeylerde (su ve eğimi 8°'nin altındaki zemin) çarpan en fazla ×3 olur. Bu değer `flatSurfaceMaxMult` adıyla veri dosyasında tutulur. ×5 yalnızca eğimli kaya ve prop yakınında verilir. Sıyırma: temas olmadan d < 1,5 m. Yüzeye dik hız bileşeni 6 m/sn'nin altındaki temas sekmedir, çarpma sayılmaz. SÜRÜ.io'da canlı ağır çekim yoktur. Doğanlar kuşları öldürmez; ürkütüp yabani gruba dağıtır.


---

## 0. Önce bunu oku: çalışma protokolü

**Rolün:** Bu belge bir oyun stüdyosu brifi. Sen bu projenin **Yapımcısı ve Teknik Direktörü'sün (ana ajan)**. Oyunu sıfırdan, mağazaya çıkacak kalitede bitireceksin.

**Kullanıcı uyuyor.** Soru sorma, onay bekleme. Belirsiz bir noktada en iyi kararı ver, gerekçesini `games/kanat/docs/KARARLAR.md` dosyasına yaz ve devam et.

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
- Yalnızca `games/kanat/` altında çalış. Gerekirse kök `.gitignore`'a satır ekleyebilirsin.
- Depodaki diğer projelere dokunma: `aksoy-site/`, `remotion/`, `game/`, kök `package.json`.
- `game/Gece_Postasi_Yatay_Hafif.html` yalnızca bir kalite tabanı referansı. Onun stilini kopyalama; bu oyun ondan tamamen farklı ve daha iddialı olacak.

**Dil:**
- Oyun içi metinler Türkçe (varsayılan) ve İngilizce.
- Belgeler Türkçe.
- Kod ve kod yorumları İngilizce olabilir.

**Ortak protokol:** Bu brif, aynı mobil uygulamaya girecek 3 oyundan biri. §5 performans motoru, §7 köprü protokolü ve ayarlar ekranının yapısı üç oyunda **birebir aynı**. Kullanıcı uygulamasına tek bir adaptör yazacak. Bu sözleşmeleri değiştirme, yalnızca genişlet.

---

## 1. Vizyon ve kalite çıtası

**Tek cümle (kanca):** "Anadolu'nun en güzel manzaralarında, kayalara 3 metre mesafeden 180 km/s ile süzül."

**Oyuncu fantezisi:** Kanat giysisiyle (wingsuit) gerçek Anadolu coğrafyasının üzerinden, sosyal medyada izleyip "ben asla yapamam" dediğin o yakın geçiş videolarının pilotu olmak. Güç fantezisi değil, **ustalık ve cesaret** fantezisi: kayanın üç metre yanından geçerken rüzgârın çığlığını duymak, sonra paraşütü açıp sessizce hedef halkasının ortasına inmek.

**Neden viral:**
- Wingsuit yakınlık uçuşu sosyal medyada kendiliğinden izlenen bir türdür; her uçuşun sonunda ≤ 8 sn otomatik vurgu klibi üretilir (en yüksek yakınlık anı, ağır çekim, sinematik açı).
- Gerçek ve tanınır Türkiye manzaraları (Kapadokya balonları, Likya koyları, Karadeniz bulutları, Erciyes karı, Pamukkale travertenleri) → "bunu bizim yerimizde yapmışlar" gururu.
- Herkes için aynı **Günün Rotası** + Wordle tipi emoji kartı (`KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐`) → aile/arkadaş gruplarında günlük kıyas.
- **Hayalet Düello** kodu: arkadaşına metin olarak gönderilen kod, senin uçuşunu onun ekranında hayalet olarak canlandırır. Sunucu gerekmez.
- **SÜRÜ.io**'da tek hamlede rakip sürüyü renk dalgasıyla ele geçiren **KUŞATMA** anı: klip olarak paylaşılmaya doğmuş bir imza an.

**2. gün ve 14. gün sonrası neden kalır:**
- 2. gün: yeni Günün Rotası, bir sonraki dünyanın yıldız eşiği, Usta Görevleri'nden yarım kalan desen, SÜRÜ.io lig yerleşimi.
- 14. gün: 60 yıldız, 60 Usta Görevi, 25 Kartpostal, 50 Pilot Rütbesi seviyesi, Bronz→Elmas SÜRÜ ligi, haftalık modifiyeli rota, arkadaş düelloları. Beceri tavanı yüksek: enerji yönetimi, çizgi seçimi, termal/ilmek rotalaması; aynı rotada 3 yıldızdan sonra bile "0,4 sn daha" kovalanır.
- Beş dünya görsel ve oynanış olarak gerçekten farklıdır (kanyon slalomu / su üstü sıyırma / bulut içi kör uçuş / sırt ve korniş / ayna havuzlar), tekrar hissi oluşmaz.

**"Ağız açık" anları (her biri yapılacak, her biri contact sheet'te kanıtlanacak):**
1. **Balon sepetinden atlayış** — Kapadokya şafağı, etrafta ~40 balon yükselir, vadilerde altın sis, güneş ufuktan sızar.
2. **Peri bacası sıyırması** — 2–3 m geçiş, 150 ms mikro ağır çekim, kaya yüzeyinden toz soyulur, hava yırtılma sesi yandan geçer.
3. **Balon İlmeği** — iki balonun arasından geçerken balon brülörleri "selam" verir gibi alev püskürtür, sıcak ışık giysiye vurur.
4. **Bulut denizine dalış** (Karadeniz) — 2 sn beyaz körlük, nem damlaları, sonra bulutun altından şelalenin önüne ve güneşli yayla vadisine fırlama.
5. **Turkuaz su üstü** (Likya) — yalıyardan dalıp suyun 4 m üstünden uçarken gölgen berrak suyun dibindeki kumda seninle yarışır, yanından bir gulet geçer.
6. **Kar sırtı** (Erciyes) — sırtın 3 m yanından geçerken giysinin türbülansı kar tozunu kaldırır, alçak güneş uzun mavi gölgeler çizer.
7. **Ayna havuzlar** (Pamukkale) — gün batımını yansıtan traverten havuzlarının üstünde kendi yansımanla uçuş; paraşüt güneşin önünde açılır.
8. **Sinematik çarpma tekrarı** — telefoto takip + sabit zemin kamerası, 0,3× ağır çekim, sert değil "belgesel" duygusu.
9. **KUŞATMA** (SÜRÜ.io) — halka kapanır, 1,5 sn'de rakip sürü dalga dalga senin rengine döner.

**İlk 30 saniye — "ilk izlenim filmi" (W1·R1, menü yok, doğrudan oyun):**
| Saniye | Görüntü / ses / etkileşim |
|---|---|
| 0,0–1,5 | Siyah ekran, rüzgâr ve uzaktan brülör "fuuu" sesi. Sepet kenarındaki eldivenli el yakın planda belirir, şafak ışığı titrer. |
| 1,5–4,0 | Kamera geriye ve yukarı kayar: ~40 balon, Göreme vadileri, altın sis. Küçük ve zarif "KANAT" logosu belirip kaybolur. Pad müziği açılır. |
| 4,0–6,0 | Tek etkileşim ipucu: nabız atan başparmak ikonu + tek kelime "Atla". 4 sn dokunulmazsa ipucu tekrar nabız atar; metin duvarı yok. |
| 6,0–7,5 | Dokunuş → atlayış. Kamera yukarıdan takip eder, serbest düşüş rüzgârı crescendo. 0,8. sn'de kanatlar kumaş patlamasıyla açılır (25 ms haptik), kamera takip pozisyonuna oturur. |
| 7,5–12 | Hafif solda parlayan ilk Kapı. Yarı saydam "hayalet başparmak" sola sürüklemeyi gösterir. Kapıdan geçiş: çan + 18 ms haptik, kapı ışık şeritlerine dağılır. |
| 12–18 | Vadi daralır, peri bacaları yaklaşır. Yakınlık Halkası dolar: ×2, ×3, yükselen pentatonik tonlar. Rehber Rüzgâr açık, çarpmak mümkün değil. |
| 18–22 | İlk **Sıyırma**: 2,5 m geçiş, 0,85× zaman 150 ms, toz, "SIYIRMA +250". |
| 22–26 | Önde iki balon; aralarında kesikli ışık yayı. Geçiş → brülör alevi, "BALON İLMEĞİ". |
| 26–30 | Vadi açılır, uzakta bağ platosunda hedef halkası; kamera hafif yükselir, ufuk ve balonlar tek karede. Paraşüt butonu bölgeye girince belirecek (FTUE §2.9'da devam). |

**Test edilebilir kalite çıtası:**
- Rastgele 20 oynanış karesinden oluşan contact sheet persona paneline (§9) gösterildiğinde ≥ %80 oy "konsol/PC kalitesi"; hiçbir persona "web/mobil mini oyun" dememeli.
- Her dünya 64×64 px küçük resimden yalnızca paletiyle ayırt edilebilmeli (5 küçük resim karışık sırada → panel ≥ %90 doğru eşleştirme).
- Rotalardan örneklenen 1.000 kamera konumunun hiçbirinde arazi kenarı, boşluk, ufukta kesik veya LOD "pop"u görünmemeli.
- Çarpmadan kontrol geri gelene kadar (tekrar atlanırsa) < 1 sn; dokunuştan giysinin görünür tepkisine ≤ 50 ms.
- Ses hiçbir anda tamamen susmaz (rüzgâr katmanı daima var), tepe seviye ≤ −1 dBFS, klipleme yok.
- Düşük kademede çekilen ekran görüntüsü de "güzel" bulunmalı: panel Düşük ve Ultra karelerini yan yana gördüğünde Düşük için ortalama puan ≥ 7/10.

**Kaçınılacaklar:** sonsuz koşu (endless runner) hissi; görünmez duvarlar; açıklamasız anında ölüm; metin duvarı; enerji/bekleme sayaçları; ganimet kutusu; sahte aciliyet; neon "mobil oyun" renkleri; öğle güneşinde düz ışık; FOV ile sahte hız (fisheye); mide bulandıran kamera yatışı; gerçek dışı ölçek (balon 20 m'den küçük olamaz); şiddet içeren çarpma görüntüsü.

---

## 2. Oyun tasarımı (GDD)

### 2.1 Çekirdek döngü
- **Uçuş döngüsü (60–120 sn):** Rota seç → rota tanıtımı (6 sn, 1. sn'den sonra dokunarak atlanır, tekrarlarda otomatik atlanır) → Atla → süzül, yakınlık zinciri kur → Kapılar / Termaller / Balon İlmekleri → iniş bölgesinde Paraşüt → hedef halkasına iniş → sonuç + yıldızlar + vurgu klibi.
- **Çarpma döngüsü:** yumuşak çarpma → son 3 sn'nin sinematik ağır çekim tekrarı (dokunuşla atlanır) → < 1 sn'de aynı rotanın başında yeniden kontrol.
- **Meta döngü:** yıldız → yeni dünya; Usta Görevleri → giysi kozmetikleri; Günün Rotası → paylaşım kartı → arkadaş Hayalet Düellosu → rövanş kodu.
- **Oturum:** ortalama 6–12 dk (4–6 rota ya da 2–4 SÜRÜ.io turu); ilk oturum hedefi 15 dk. "Bir daha" maliyeti < 1 sn.

### 2.2 Kontroller
**Ana şema — portre, tek başparmak, "her yeri sürükle":**
- Dokunuşun başladığı yer çapa olur (göreli sanal çubuk). Vektör `v = (parmak − çapa) / R`, `R = 0,11 × kısa ekran kenarı` (~45 pt). |v| > 1 olursa çapa parmağın peşinden kayar (yüzen çapa) → başparmak asla "yolun sonuna" gelmez.
- **Ölü bölge:** radyal 0,08. **Expo eğrisi:** `çıkış = işaret(x) · (e·|x|³ + (1−e)·|x|)`, yalpa (roll) için e = 0,35, yunuslama (pitch) için e = 0,50 (sıfır civarında ince ayar). Ölü bölge sonrası çıktı 0'dan yeniden ölçeklenir (sıçrama yok).
- **Eşleme:** yatay → yalpa, dikey → yunuslama. Varsayılan "Doğal" (yukarı sürükle = burun yukarı); ayarlarda "Pilot" (ters). İlk kapıda oyuncu 3 kez belirgin şekilde ters yöne bastırırsa tek dokunuşluk seçim kartı çıkar: "Ters mi? [Evet] [Hayır]".
- **Tepki hedefleri (tasarım hissi; kesin model 4.G'de):** en fazla yalpa hızı 140°/sn, yatış sınırı ±80°; en fazla yunuslama hızı 55°/sn.
- **Bırakma = yumuşak otomatik düzelme:** yatış 0,6 sn zaman sabitiyle sıfıra, burun 0,8 sn'de en iyi süzülme açısına döner. Bırakmak her zaman güvenlidir.
- **Hassasiyet:** 0,6–1,5 çarpanı (varsayılan 1,0); expo kaydırıcısı 0–0,7.
- **Jiroskop (isteğe bağlı):** "Kapalı / Yalpa / Tam". Yalpa modunda cihaz eğimi → yalpa, yunuslama dokunmatikte kalır. Ölü bölge 3°, tam sapma 28°, 8 Hz alçak geçiren filtre; nötr açı "Atla" anında kalibre edilir. iOS izin isteği kullanıcı hareketiyle köprü üzerinden doğrulanmalı (ajan doğrulasın).
- **Sol el modu:** bağlamsal butonlar (Paraşüt, Duraklat) ve HUD göstergeleri aynalanır; "her yeri sürükle" etkilenmez.
- **Yatay (landscape):** aynı şema + isteğe bağlı "İki Başparmak" (sol yarı = yalpa, sağ yarı = yunuslama).
- **Paraşüt:** iniş bölgesine (hedef çevresinde ~250 m yarıçaplı silindir) girince alt-sağda (sol el modunda alt-solda) 88×88 pt nabız atan PARAŞÜT butonu. Açılış 1,2 sn; kanopi altında yatay sürükleme = dönüş (≤ 35°/sn), aşağı sürükleme = fren/flare. Bölge dışında buton yoktur (Serbest Uçuş hariç).
- **Temas kuralı (affedici):** yüzeye dik bileşeni < 6 m/sn olan sürtünme teması çarpma değildir → sekme, %25 hız kaybı, kombo kırılır. Dik bileşen ≥ 6 m/sn → çarpma.
- **İrtifa biterse:** iniş bölgesine ulaşamadan yer yüksekliği 20 m'nin altına inerse "Acil Paraşüt" kendiliğinden açılır → "Yarım Uçuş": puan gösterilir, yıldız/rekor yok. Ölüm yok.
- **Erişilebilirlik:** Otomatik Paraşüt (bölgede ideal yükseklikte açar, iniş bonusu yarıya iner); Konfor Kamerası; Büyük HUD; renk körü modu; haptik Açık/Az/Kapalı; "Yavaş Mod" (sim hızı 0,8×; yalnız Kariyer ve Serbest Uçuş, kartta 🐢 ile işaretlenir).

### 2.3 Oyun hissi (juice)
| Olay | Görsel | Ses | Haptik |
|---|---|---|---|
| Hız > 170 km/s | Ekran kenarında hız çizgileri (yoğunluk ∝ hız), FOV genişler | Rüzgâr yüksek katmanı, kumaş çırpınması | — |
| Çarpan artışı | Yakınlık Halkası nabız + renk | Pentatonik ton: ×1 Do, ×2 Mi, ×3 Sol, ×5 üst Do | çift: 10 ms – 40 ms boşluk – 10 ms |
| Sıyırma (d < 1,5 m) | 0,85× zaman 150 ms, 200 ms'de geri; kaya tozu/çakıl; "SIYIRMA +250" | Stereo hava yırtılması (geçilen tarafa pan) | hafif 12 ms |
| Kombo kırılması | Halka doygunluğunu kaybeder | İnen iki ton | yumuşak 30 ms |
| Kapı | Kapı ışık şeritlerine dağılır | Havalı çan | 18 ms |
| Termal | Isı titreşimi sütunu, toz zerreleri yükselir | Alçak uğultu | içerideyken 6 Hz'de 6 ms tıklar (Az modunda kapalı) |
| Balon İlmeği | Brülörler alev püskürtür, sıcak ışık | Brülör "fuu" + sıcak çan | orta 25 ms |
| Paraşüt açılışı | Kamera geri çekilip kanopiyi gösterir | Kumaş "pat" + ipek hışırtısı | 50 ms güçlü + 30 ms |
| Yıldız kazanma | Yıldız damgası | Ağır "tok" | her yıldızda 40 ms |
| Çarpma | 80 ms donma (tek hit-stop), ekran kararır, tekrar başlar | Boğuk "vumf" (şiddetsiz), müzik 400 ms'de 300 Hz alçak geçirene düşer | 90 ms orta-güçlü |

- **Sarsıntı kuralları:** yalnız yakınlıktan (d < 7 m) ve çarpmadan. En fazla 0,08 m konum / 0,6° dönüş, frekans ≤ 14 Hz, 0,25 sn sönüm, kesintisiz 1,5 sn'yi geçemez. Konfor Kamerası'nda sıfır.
- **Ağır çekim kuralı:** canlı oyunda yalnız 150 ms mikro (Sıyırma). Diğer tüm ağır çekimler tekrarlarda. Puanlar ve süre **sim zamanıyla** ölçülür; cihazdan bağımsızdır.
- **Pilot gölgesi** yakınlık hissinin ana ipucudur: tüm kademelerde zeminde net görünür (Düşük'te projeksiyon decal).
- Haptikler §7 köprüsünden adlandırılmış desenlerle (`hafif`, `orta`, `güçlü`, `çift`, `yıldız`) çağrılır; Android'de `navigator.vibrate` yedek.

### 2.4 Kamera dili
**Oynanış (takip) kamerası:**
- Konum: hız vektörünün %80'i + gövde yönünün %20'si arkası. Mesafe 4,2 m (110 km/s) → 6,0 m (230 km/s); yükseklik +1,1 m.
- Bakış hedefi: pilot + hız × 0,35 sn (≈ 12–22 m ileri).
- Kritik sönümlü yay, ω = 7 rad/sn (konum), dönüş için ω = 9.
- Kamera yatışı = 0,5 × pilot yatışı, en fazla 35°.
- **Dikey FOV:** portre 74° → 86°, yatay ekran 48° → 58° (hızla doğrusal). FOV değişim hızı ≤ 12°/sn.
- Arazi koruması: kamera daima yüzeyden ≥ 1,5 m uzakta; küre taraması (sphere cast) engel bulursa kamera yumuşakça yaklaşır/yükselir, asla kayanın içine girmez.
- "Yakın plan" nüansı: d < 7 m 1 sn'den uzun sürerse kamera 0,3 m alçalır, 0,5 m yaklaşır (dram).
- Seçenekler: Mesafe (Yakın/Normal/Uzak), "Kask" kamerası (birinci şahıs, ufku sabit).

**Sinematik kameralar:**
- **Rota tanıtımı (6 sn):** (1) geniş hava açılış planı, FOV 50°, 2 m/sn yavaş dolly; (2) rota spline'ı boyunca 3× hızlı önizleme, kapılar parlar (2,5 sn); (3) atlama noktasına yakın plan.
- **Tekrar açıları kütüphanesi:** Telefoto Takip (yandan, FOV 18–25°, 40–80 m), Sabit Zemin (rotanın önünde araziye yerleştirilir, pilot geçerken pan yapar — yakınlık için en iyisi), Kask, Yörünge (ağır çekim anları), Drone (tepeden), Kaya Kenarı (sıyırılan nesneye iliştirilmiş). **Otomatik yönetmen:** yakınlık tepesi → Sabit Zemin; kapı/ilmek → Telefoto; çarpma → Telefoto + Yörünge.
- **Ağır çekim:** yalnız olaylarda 0,25–0,5×, 0,3 sn ease geçişli.
- **Mide bulantısı sınırları:** kamera açısal hızı ≤ 90°/sn (kesme hariç); tekrarlarda hızlı pan yerine kesme; portre oynanışta ufuk zamanın ≥ %70'inde görünür; Konfor Kamerası: yatış ×0,25, sarsıntı 0, FOV tavanı 75°, yüksek hızda yumuşak vinyet.

### 2.5 Modlar

#### Mod 1 — Kariyer: Rotalar
- **Amaç:** ustalık eğrisi ve dünya keşfi. 5 dünya × 4 rota = **20 rota**, her biri 60–120 sn, her biri 3 yıldız (toplam 60).
| Dünya | R1 | R2 | R3 | R4 | Atlama noktası |
|---|---|---|---|---|---|
| 1 Kapadokya Şafağı | İlk Atlayış (zorluk 1) | Peri Bacaları Slalomu (2) | Balon Yolu (3) | Güvercinlik Kanyonu (4) | Balon sepeti |
| 2 Likya Kıyısı | Yalıyar Süzülüşü (3) | Gulet Koyu (4) | Kaya Kemeri (5) | Mezar Cepheleri Hattı (6) | Yalıyar tepesi |
| 3 Karadeniz Yaylası | Bulut Denizi (4) | Ladin Koridoru (5) | Şelale Perdesi (6) | Yayla Alçak Geçişi (7) | Sırt çıkıntısı |
| 4 Erciyes Karı | Kar Sırtı (5) | Korniş Kenarı (6) | Buzul Oluğu (7) | Zirve İnişi (8) | Zirve sırtı |
| 5 Pamukkale Gün Batımı | Traverten Basamakları (6) | Antik Tiyatro Üstü (7) | Ayna Havuzlar (8) | Gün Batımı Finali (9) | Balon sepeti |
Rota kimlikleri `w1r1`…`w5r4` (veri biçimi 4.G ile aynı kimlikleri kullanır).
- **Puan formülü:** saniye başına `100 × Ç(d) × (v / 150 km/s) × K`.
  - `d` = giysi gövde kapsülünün en yakın yüzeye (arazi, prop, **su yüzeyi dahil**) mesafesi. `Ç(d)`: d ≥ 30 m → 0; < 30 → ×1; < 15 → ×2; < 7 → ×3; < 3 → ×5.
  - `K` (kombo) = `1 + 0,15 × ⌊t_z / 2 sn⌋`, tavan 3,0; `t_z` = kesintisiz d < 15 m süresi. d ≥ 15 m'de 1,5 sn'den fazla kalmak veya sürtünme teması komboyu kırar.
  - **Sıyırma:** temassız d < 1,5 m → anında `+250 × Ç`; aynı nesne için 1 sn bekleme.
  - **Kapı:** +500; zincir halinde her ardışık kapı +100 ek (en fazla +1.000).
  - **Termal:** girişte +100; içeride +7 m/sn dikey hava (enerji yenileme).
  - **Balon İlmeği:** merkezleri ≤ 35 m aralıklı iki balonun arasındaki doğru parçasını, her ikisine ≤ 12 m mesafeyle kesmek → +750; 4 sn içinde ardışık ilmekte ×1,5 katlanır (tavan ×3).
  - **İniş:** hedef halkası 2 / 5 / 10 m → +1.000 / +500 / +200; Yumuşak İniş (yere 3 m kala flare) +300; Cesur Açılış (paraşüt 60–90 m yer yüksekliğinde) +300.
- **Yıldızlar:** ⭐ = iniş bölgesine paraşütle in; ⭐⭐ = puan ≥ 0,50 × uzman bot; ⭐⭐⭐ = puan ≥ 0,85 × uzman bot. (Uzman bot puanı 9.G'deki bot ile üretilir, veri dosyasına yazılır.)
- **Usta Görevleri:** rota başına 3 (toplam 60), her biri bir kozmetik açar. Örnekler: "5 Balon İlmeği", "×5'te kesintisiz 4 sn", "Tek uçuşta 3 Sıyırma", "Hiç temas etmeden 3 yıldız", "Hedefin 2 m içine in", "Termal kullanmadan bitir".
- **Kazan/kaybet:** kaybetme yoktur; çarpma = anında tekrar. Rota tamamlanması iniştir.
- **Fark:** gerçek arazi + yakınlık puanlaması + enerji yönetimi; her rotada en az iki çizgi seçeneği (güvenli üst hat / riskli kanyon hattı).

#### Mod 2 — Günün Rotası
- **Amaç:** herkes için aynı, her gün yeni, paylaşılabilir tek uçuş. Seed = Türkiye saatiyle (UTC+3) tarih; numara `#1` yayın günü.
- **Üretim kuralları (algoritma 4.G'de):** dünya seed ile döner; gerçek arazi üzerinde vadileri izleyen spline; 12–20 kapı, kapılar arası 6–12 sn; 1–3 termal; rüzgâr 0–6 m/sn; bot süresiyle 90–150 sn; rota en az 3 "yakınlık fırsatı" (kanyon, sırt, ağaç hattı, su) içerir; hiçbir kapı yüzeye 4 m'den yakın değildir. Zorluk haftanın gününe göre: Pazartesi 3 → Pazar 7.
- **Kurallar (zamana karşı):** süre atlayıştan ayak temasına kadar; kapılar zorunlu, kaçırılan her kapı +2,0 sn. Sınırsız deneme; en iyi deneme paylaşılır.
- **Yıldızlar:** ⭐ bitir; ⭐⭐ süre ≤ 1,12 × bot; ⭐⭐⭐ süre ≤ 1,03 × bot **ve** toplam ≥ 15 sn ×3 veya üstü yakınlık.
- **Yakınlık şeridi:** rota spline uzunluğuna göre 5 eşit parçaya bölünür; her parçanın emojisi o parçada en çok zaman geçirilen kademe: ⬜ (> 30 m) 🟩 ×1 🟨 ×2 🟧 ×3 🟥 ×5.
- **Fark:** hız ile yakınlık arasındaki gerilim; kısa çizgi genellikle yakın çizgidir.

#### Mod 3 — Hayalet Düello
- **Akış:** sonuç ekranında "Düello Kodu" → kod metin olarak paylaşılır (köprü paylaşımı veya kopyala). Alıcı kodu yapıştırır ya da derin bağlantıyla açar → "Ayşe'nin hayaleti · Günün Rotası #214 · 2:07.4" kartı → yarış.
- **Kod:** seed/rota kimliği + sıkıştırılmış girdi akışı; okunur önek `KNT1-`, tek parça, tasarım hedefi ≤ 600 karakter (biçim 4.G'de). Deterministik sim aynı uçuşu yeniden üretir; hileli kod sim tarafından doğrulanır (bildirilen süre ≠ yeniden oynatılan süre → "Kod geçersiz").
- **Kurallar:** metrik modun metriğidir (Günün Rotası → süre, Kariyer rotası → puan). Hayalet yarı saydam, parlak konturlu, adı ve rengiyle; çarpışma yok. Her kapıda fark göstergesi ("−0,42"). En fazla 3 hayalet aynı anda: kişisel en iyi, rakip, Usta bot (3 yıldız standardı).
- **Sonuç:** "Kazandın · 0,8 sn" + **Rövanş Kodu** (senin yeni uçuşun). Kod alındığında mod kilidi yoksayılır (henüz açılmamış dünyanın rotası tek seferlik oynanabilir — viral döngü kırılmasın).

#### Mod 4 — Serbest Uçuş + Foto Modu
- **Amaç:** zen, keşif, koleksiyon. Açılmış her dünyada başarısızlık yok: çarpma → 3 sn geriye yumuşak geri sarma, tekrar yok. Paraşüt her yerde açılabilir. Kapı/puan yok; isteğe bağlı müzik "Sakin" katmanı.
- **Kartpostal noktaları:** dünya başına 5, toplam **25**. 150 m'ye yaklaşınca havada zarif, ince bir çerçeve parıltısı belirir. Koleksiyona girmesi için Foto Modu'nda: kamera noktaya ≤ 120 m, konu karenin merkez %60'ında, konu üzerindeki 5 ışın örneğinden ≥ 4'ü görünür.
- **Kartpostallar:** Kapadokya: Güvercinlik Şafağı, Üçgüzeller, Kızılçukur, Balon Tarlası, Uçhisar Silueti · Likya: Gizli Koy, Kaya Mezarları, Gulet Limanı, Kaya Kemeri, Yalıyar Feneri · Karadeniz: Bulut Denizi, Şelale Perdesi, Yayla Sabahı, Ladin Katedrali, Göl Aynası · Erciyes: Zirve Sırtı, Buz Kornişi, Kar Dalgası, Gölge Vadisi, Yıldız Tozu · Pamukkale: Traverten Basamakları, Ayna Havuzlar, Antik Tiyatro, Kızıl Ufuk, Son Işık.
- **Foto Modu** (Serbest Uçuş'ta ve Kariyer duraklatmada; Günün Rotası/Düello'da yalnız uçuş bittikten sonra tekrar içinde): sim donar; serbest kamera pilot çevresinde 30 m yarıçap; FOV 20–90°; yatış ±15°; pozlama ±2 EV; alan derinliği (odak + diyafram); 6 filtre (Doğal, Altın Saat, Belgesel, Kartpostal, Soğuk Sabah, Siyah-Beyaz); film greni; çerçeve/logo aç-kapa; HUD gizli; köprüyle galeriye kaydet.

### 2.6 Mod 5 — SÜRÜ.io (bağımsız mod, tam mini-GDD)
**Kanca:** "Gün batarken binlerce sığırcığı tek parmakla yönet; rakip sürüleri yeme — **ikna et**, kuşat, kendi rengine çevir."
**Fantezi:** gökyüzünde nefes alıp veren canlı bir bulutun aklı olmak. Agar/slither'dan farkı: kimse ölmez, kimse yenmez; büyüme yoğunluk, formasyon ve kuşatma ile gelir; tur doğal bir sona (gün batımı) sahiptir; kontrol bir **nefes ritmidir**.

**Tur yapısı (3:00, sim zamanı):**
| Zaman | Olay |
|---|---|
| 0:00–0:15 | Doğuş: her sürü lider + 15 takipçi, arenaya dengeli dağılmış. Yabani gruplar bol. |
| 0:15–2:15 | Orta oyun: toplama, temas savaşları, kuşatmalar. Doğan 0:40'ta ilk kez gelir, sonra her 30 ± 5 sn. Fırtına bulutu 1:00'de doğar. |
| 2:15 | Deniz feneri yanar (görsel işaret), Gün Batımı Halkası daralmaya başlar. |
| 2:15–3:00 | Halka çapı 600 m → 200 m doğrusal. Halka dışı "gece": takipçiler saniyede %3 dağılıp yabaniye döner, lider yumuşakça içeri itilir. |
| 3:00 | Güneş batar → en büyük sürü kazanır (ya da daha önce son ayakta kalan). |

**Arena:** ~600 m çaplı dairesel gün batımı körfezi / sazlık: 4 sazlık adacığı (yabani kuşların yeniden doğduğu yer), 1 deniz feneri (görsel işaret, akış engeli), kayalıklar (kuşlar üstünden geçer, sadece rüzgâr gölgesi). **3 el yapımı düzen** (Sazlık Körfezi, Fener Burnu, Taşlı Koy) + **Sürü Günü** seeded düzeni.

**Kontroller (tek başparmak, nefes ritmi):**
- **Sürükle = yön:** göreli çubuk (Kariyer ile aynı çapa mantığı, ölü bölge 0,10); lider çubuk yönüne döner.
- **BASILI TUT = "Sıkı Dizi":** parmak ekrandayken sürü sıkışır: lider hızı +%25, yerel yoğunluk ağırlığı ×1,6, Doğan dağıtması yarıya iner; **Nefes** tükenir.
- **BIRAK = "Geniş Kanat":** sürü açılır (yarıçap ~2,2×), hız −%10, yakalama yarıçapı büyür → yabani gruplar katılır; lider son yönünde düz gider; Nefes dolar.
- **Nefes:** 100 birim; Sıkı Dizi'de −14/sn (~7 sn), Geniş'te +22/sn. 0'a düşerse "Nefessiz": 25'e dolana kadar Sıkı Dizi bonusu yok, yönlendirme serbest. Nefes göstergesi parmağın altında ince bir yay olarak belirir.
- Yatay ekran / erişilebilirlik: "İki Başparmak" (sol sürükle = yön, sağ basılı = Sıkı Dizi). Sol el modu HUD'u aynalar.

**Kurallar ve sayılar (tasarım niyeti; kesin sim 4.G'de):**
- **Toplam kuş sayısı sabit ~1.500**, tüm kademelerde aynı. Kuşlar asla ölmez: sahiplik değiştirir (sürü ↔ yabani). Başlangıç: 12–16 sürü × 16 = ~200–260; kalanı 5–30'luk yabani gruplar (~60 grup). Dağılan kuşlar yabaniye döner; korunum ihlal edilmez.
- **Sürü yarıçapı:** `r = k·√N`, Sıkı k = 0,6, Geniş k = 1,3 (400 kuş: 12 m / 26 m). Yabani yakalama: grup merkezi `r + 4 m` içine girerse grup sürüye katılır.
- **Dönüş hızı:** `ω = 140°/sn × clamp(√(20/N), 0,35, 1,0)` → büyük sürü ağır döner (kartopu frenidir).
- **Temas savaşı:** her kuş 6 m yarıçapında komşuları sayar. Ağırlıklar: temel 1; sahibinin Sıkı Dizi'si ×1,6; kendi liderine ≤ 12 m ise ×1,3; yabani 0. Sahip B'nin yerel payı `D_B ≥ 0,62` ise A'nın kuşu B'ye `λ = 2,2 × (D_B − 0,5)`/sn hızla döner; adım olasılığı `p = 1 − e^(−λ·Δt)`, seeded RNG. Liderler dönüşmez. Sonuç: sınırda görünür renk dalgaları ve halat çekme.
- **KUŞATMA:** rakip liderin çevresinde [6 m, 30 m] halkası 36 dilime (10°) bölünür; dilimde ≥ 2 kuşun varsa ve paydan ≥ %70 seninse dilim "kapalı". ≥ 30 dilim (≥ 300°) 0,6 sn tutulursa rakip sürünün tamamı 1,5 sn içinde halkadan merkeze doğru dalga halinde sana geçer. Halka ilerleme yayı rakip liderin çevresinde canlı gösterilir (%0 → %100).
- **Eleme:** takipçisi 0 olan lider "Yalnız" durumuna geçer: 5 sn boyunca +%30 hız, yabani toplarsa kurtulur. Bir rakip **çekirdeği** (kendi liderinden bağımsız, 4 m içinde ≥ 8 kuş) yalnız lidere değerse elenir.
- **Kartopu frenleri:** (1) **Doğan:** en büyük sürüyü hedefler; 2,0 sn önceden suda gölge + ıslık ile uyarır; kenardaki kuşların %6–12'sini 40 m öteye dağıtır → yeniden yakalanabilir yabani grup (kimse zarar görmez; Sıkı Dizi dağılmayı yarıya indirir = karşı hamle). (2) Dönüş hızı ∝ 1/√N. (3) **Rüzgâr hamlesi:** her 25–40 sn, 120 m genişliğinde bant 3 sn boyunca 6 m/sn iter; suyun üstünde dalgacık çizgileriyle 2 sn önceden belli olur. (4) **Fırtına bulutu:** 45 m yarıçap, seeded yolda 3 m/sn; içinde takipçiler %4/sn dağılır, Nefes dolmaz.
- **Kazanma:** 3:00'te en büyük sürü ya da son ayakta kalan. Sıralama: bitişte sürü büyüklüğü; elenenler eleme sırasına göre.
- **Tur sonu:** sonuç → **anında yeni tur (< 2 sn)**; isteğe bağlı "İzle" (turun kalanını otomatik yönetmen kamerasıyla izle).

**Yapay zekâ sürüleri** (menüde ve skor tablosunda açıkça "YZ" etiketi; "Yapay zekâ sürüleri"). YZ oyuncuyla aynı komutları üretir (yön vektörü + basılı/bırak) → çevrimiçi eklenince yerlerine insan geçer. Fayda (utility) puanlaması, 4–10 Hz karar.
| Kişilik | Davranış | Ağırlık özeti |
|---|---|---|
| Toplayıcı | Yabani grupları kovalar, kendinden 1,5× küçük değilse kavgadan kaçar | toplama 1,0 · saldırı 0,2 · kaçış 0,6 |
| Avcı | Kendinin 0,6–0,9× büyüklüğündeki sürülere Sıkı Dizi ile dalar | saldırı 1,0 · toplama 0,4 |
| Ürkek | Büyüklerden kaçar, sazlıklara/kenara saklanır, fırsat kollar | kaçış 1,0 · toplama 0,7 |
| Kuşatıcı | Küçük sürülerin liderine yay formasyonunda yaklaşıp halka kurar (yay görünür → oyuncu okuyabilir) | kuşatma 1,0 · saldırı 0,5 |
| Fırsatçı | Kavga eden iki sürünün zayıflayanına üçüncü taraf olarak girer, Doğan sonrası dağılanları toplar | fırsat 1,0 · toplama 0,6 |
- Lig zorluğu: tepki gecikmesi 450 ms (Bronz) → 180 ms (Elmas); karar sıklığı 4 → 10 Hz; Kuşatma girişimi sıklığı ve Nefes yönetimi kalitesi artar. YZ adları doğa sözcüklerinden üretilir ("Lodos Sürüsü", "Mehtap", "Kızıl Kanat", "Poyraz") — gerçek kişi adı yok.

**Puanlama ve lig:**
- **Lig Puanı (LP):** 1. +30, 2. +22, 3. +16, 4. +12, 5–8. +6/+4/+3/+2, 9–12. 0/−1/−2/−4, 13–16. −6/−7/−8/−10; her Kuşatma +3 (tavan +9).
- **Ligler:** Bronz → Gümüş → Altın → Platin → Elmas, her biri 300 LP. Ulaşılan ligden düşüş yok (suçluluk yok); lig içinde LP 0'ın altına inmez.
- **Tur istatistikleri:** sıra, zirve büyüklüğü, dönüştürülen kuş, toplanan yabani, Kuşatma sayısı, ayakta kalma süresi.

**Alt modlar:** Lig Maçı (standart) · **Sürü Günü** (herkese aynı seeded arena: düzen, yabani doğuşları, rüzgâr, fırtına yolu, YZ kişilik karışımı; günde sınırsız deneme, en iyi sonuç paylaşılır) · Antrenman (yalnız Ürkek/Toplayıcı YZ).

**SÜRÜ.io FTUE (45 sn, metinsiz):** (1) hayalet başparmak sürüklemeyi gösterir → yakındaki yabani gruba git, katılmalarını izle; (2) parmağı kaldır → sürü açılır, iki grup birden katılır; basılı tut → sürü sıkışır, hız artar, Nefes yayı görünür; (3) uyuyan küçük bir Ürkek sürünün çevresinde ışıklı yay belirir → halkayı tamamla → ilk KUŞATMA. Sonra gerçek tur.

**Paylaşım kartı:** `KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta`
**Vurgu klibi:** turun en büyük Kuşatması ya da en büyük tek seferde dönüşüm dalgası (≤ 8 sn).
**İlerleme ve kozmetik (yalnız görsel, oynanışa etkisiz):** lider tüy parıltısı (8), aura deseni (8), lider izi (8), tur sonu **Sürü Gösterisi** şekli (6: Kalp, Sarmal, Dalga, Lale, Kanat, Sonsuzluk — kazanan sürü son 3 sn'de bu şekli çizer). Sahip renkleri okunabilirlik için kozmetik değildir.
**Oturum:** tur 3 dk + sonuç ~10 sn; oturum 2–4 tur.
**Neden premium:** binlerce bireysel kuşun gerçek murmuration davranışı, gün batımıyla akan zaman, renk dalgalarıyla okunur temas savaşı, kuşatmanın kesin "aha" anı ve hiçbir zaman öldürme/yeme olmaması.

### 2.7 Meta ve ilerleme
- **Pilot Rütbesi (XP, 1–50):** XP = puan/1.000 + yıldız ×200 + Usta Görevi ×300 + Günün Rotası ×500 + SÜRÜ.io turu 100–400. Unvan bantları: Çaylak (1–8), Süzülen (9–16), Sıyırıcı (17–25), Kartal (26–34), Usta (35–43), Efsane (44–50). Her seviye bir şey verir (renk, iz, rozet, menü sahnesi saati).
- **Dünya kilitleri (yıldızla):** W2 6⭐, W3 15⭐, W4 26⭐, W5 38⭐ (toplam 60).
- **Giysi kozmetikleri:** 20 desen (ör. Kilim, Çini, Ebru, Peri Bacası, Turkuaz, Gece Yarısı, Balon Şeridi, Kar Kristali), 12 renk paleti, 10 iz efekti (Duman Beyazı, Altın Toz, Ebru Akışı, Buz Kristali, Kırlangıç…). Kaynak: Usta Görevleri, rütbe, dünya Kartpostal setleri (bir dünyanın 5 kartı = o dünyanın imza deseni).
- **Koleksiyonlar:** 25 Kartpostal, 30 Rozet (ör. İlk Atlayış, 3 Metre Kulübü — tek uçuşta toplam 10 sn ×5, Bulut Delen, Sıfır Temas, Gün Batımı Pilotu, Kartpostal Avcısı, Sürü Lideri, Kuşatma Ustası — tek turda 3, Elmas Kanat).
- **Haftalık:** "Haftanın Rotası" — bir Kariyer rotası + yeni sanat gerektirmeyen modifiye: Rüzgârlı Gün (6 m/sn yan rüzgâr), Sis Perdesi (görüş 250 m), Ters Yön (rota tersten, yeni kapılar), Termal Avı. Ödül: haftalık iz rengi.
- **Suçluluksuz seri:** "Uçuş Günlüğü" — uçtuğun her gün bir damga; 7 damga (ardışık olması gerekmez) = kozmetik. "Serin bozuldu" mesajı yasak.
- **Yasak:** ganimet kutusu, şans mekaniği, enerji/bekleme, öde-kazan, reklamla hızlandırma.

### 2.8 Viral sistemler
- **Günün Rotası kartı (metin, birebir biçim):**
  `KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐`
  İkinci satır isteğe bağlı: `Düello: KNT1-G214-…` (kod). Yardım kullanıldıysa sonuna `🛟`, Yavaş Mod ise `🐢`.
- **Kariyer kartı:** `KANAT · Kapadokya / Balon Yolu ⭐⭐⭐ · 48.210 · Yakınlık 🟩🟨🟧🟧🟥`
- **Görsel kart (1080×1350):** en yüksek yakınlık karesi (otomatik seçilir, HUD'suz, Foto Modu "Belgesel" filtresi), alt şeritte dünya adı, süre/puan, 5 renkli yakınlık segmenti, yıldızlar, rotanın arazi üstü mini çizgisi.
- **Vurgu klibi (≤ 8 sn):** deterministik tekrar verisinden uçuş sonrası render edilir: 6 sn'lik kayan pencerede en yüksek puan yoğunluğu + 1 sn giriş + olay anında 0,5× ağır çekim + 1 sn bitiş kartı (logo + süre). Otomatik yönetmen açıları kullanılır.
- **Hayalet/düello kodları:** §2.5 Mod 3.
- **Foto Modu:** §2.5 Mod 4; kartpostal çerçevesinde yer adı ve tarih.

### 2.9 FTUE — ilk 60 saniye (metin duvarı yok)
1. **0–30 sn:** §1'deki ilk izlenim filmi (W1·R1, Rehber Rüzgâr açık: d < 2 m'de yumuşak itme, çarpma imkânsız).
2. **30–36 sn:** iniş bölgesine giriş → PARAŞÜT butonu nabız atar, üstünde başparmak ikonu. Dokunuş → kanopi açılır, kamera geri çekilir.
3. **36–48 sn:** hayalet başparmak hedefe doğru yatay sürüklemeyi gösterir; hedef halkası yerde parlar.
4. **48–52 sn:** yere 3 m kala aşağı ok "çek" ipucu → flare → yumuşak iniş.
5. **52–60 sn:** yıldızlar tek tek damgalanır (haptik), kamera yükselir ve canlı ana menü sahnesine kesintisiz geçer. Tek büyük buton: "Devam".
- Açılma sırası: Günün Rotası ve SÜRÜ.io 1. rotadan sonra; Hayalet Düello 2. rotadan sonra (kod gelirse hemen); Serbest Uçuş 3. rotadan sonra. Her yeni mod tek cümlelik kartla tanıtılır.
- W1·R1–R3'te Rehber Rüzgâr varsayılan açık; R3 sonunda "Yardımı kapatmak ister misin?" tek dokunuş.

### 2.10 Zorluk ve denge
- **Rota zorluğu 1–9** (tablo §2.5). Kapı halka çapı: W1 14 m → W5 9 m. Rota başına termal: W1 3 → W5 1. Rüzgâr: W1 0 → W4–W5 4 m/sn.
- **Yıldız eşikleri** uzman bota bağlı (§2.5); 9.G'de bot ile doğrulanır: W1'de ortalama oyuncu botu 3 denemede ⭐⭐ almalı.
- **Uçuş Yardımı:** *Tam* (d < 2 m ve kapanma hızı > 8 m/sn → yumuşak itme; çarpmaya < 0,6 sn kala tek seferlik burun kaldırma, 5 sn'de bir; kapı mıknatısı %15) · *Az* (yalnız çarpma uyarısı: 1,0 sn kala engel tarafında ekran kenarı kırmızı nabız + bip) · *Kapalı*. Kariyer'de puan cezası yok; Günün Rotası/Düello kartında `🛟`.
- **Dinamik yardım:** aynı rota bölümünde 3 çarpma → tek dokunuşluk kart "Bu bölümde yardım?" (Tam Yardım veya **Rehber Hat**: 3 yıldız botunun ışıklı çizgisi). Uzmanlar ayarlardan kalıcı kapatır; kart bir daha gelmez.
- **SÜRÜ.io dengesi:** 9.G'de YZ-YZ simülasyonunda hiçbir kişilik > %30 kazanma oranına çıkmamalı; Bronz'da yeni oyuncunun ilk 5 turda ≥ 1 kez ilk 3'e girmesi hedeflenir.

### 2.11 UI ekranları
- **Ana menü (canlı 3D sahne):** pilot balon sepetinin kenarında oturur, şafak, balonlar yükselir, kamera yavaş süzülür; son oynanan dünyaya göre sahne değişir. Portre: alt sayfa kartları (Devam, Günün Rotası, Modlar, SÜRÜ.io, Koleksiyon); sağ üstte rütbe rozeti.
- **Dünya/Rota seçimi:** yatay kaydırmalı büyük dünya kartları (açılışta bir kez render-to-texture önizleme); dünya içinde o bölgenin gerçek yükseklik verisinden 3D rölyef mini-harita, 4 rota çizgisi, yıldızlar ve Usta Görevleri.
- **HUD (en fazla 6 öğe, ekran merkezinin %40'ı boş):** üst orta Puan/Süre (+ hayalet farkı); alt orta Yakınlık Halkası (180° yay, ×1/×2/×3/×5 dilimleri, büyük "×3" yazısı, altında kombo çubuğu); sol kenar hız (küçük); sağ kenar yer yüksekliği çubuğu + iniş bölgesi işareti; ekran kenarında sonraki kapı oku; bağlamsal Paraşüt butonu; sol üst Duraklat (44 pt). HUD opaklığı %85.
- **Duraklat:** bulanık arka plan; Devam, Yeniden, Foto Modu (izinli modlarda), Ayarlar, Çık.
- **Sonuç:** arkada vurgu tekrarı döner; puan dökümü sayarak dolar; yıldız damgaları; butonlar: **Tekrar** (en büyük), Paylaş, Düello Kodu, Sonraki.
- **Ayarlar (oyuna özel):** Kontrol yönü (Doğal/Pilot), hassasiyet, expo, jiroskop, kamera mesafesi, Konfor Kamerası, HUD boyutu, renk körü modu, haptik, Uçuş Yardımı, Otomatik Paraşüt, sol el, Yavaş Mod.
- **Koleksiyon:** Kartpostal albümü (boş yuvada siluet ipucu + dünya), Giysi Dolabı (menü sahnesinde dönen pilot), Rozetler.
- **SÜRÜ.io HUD:** üstte güneş yayı (zamanlayıcı = batan güneş), sürü büyüklüğü sayısı, sağ üst ilk 3 (renk + desen + "YZ"), sol alt dairesel mini-harita (halka dahil), parmak altında Nefes yayı, rakip lider çevresinde Kuşatma ilerleme yayı, ortada kısa duyurular ("KUŞATMA!").

### 2.12 Ses, müzik, haptik
- **Rüzgâr motoru (Web Audio, prosedürel):** 3 katman — alçak gürleme, orta "vuuş", yüksek ıslık; gürültü kaynakları + filtre; kesim frekansı hızla 600 → 6.000 Hz; yatış hızına göre kumaş çırpınması genliği.
- **Yakınlık geçişleri:** d < 7 m'de engel geçerken Doppler'li "fly-by" (geçilen tarafa pan, kaya/ağaç/su için 3 farklı doku).
- **İmza sesler:** Kanat açılışı (kumaş patlaması), Sıyırma (hava yırtılması + ıslık), Balon İlmeği (brülör + sıcak çan), Kapı (havalı çan), Paraşüt (pat + ipek), KUŞATMA (yükselen sürü uğultusu + tek vurmalı akor).
- **Uyarlanır müzik (dünya başına):** K0 ambiyans pad (daima), K1 ritim (hız > 160 km/s), K2 melodi (kombo ≥ 1,5), K3 vurmalı vuruşlar (×5'te). Katman geçişleri 1 ölçü sınırında. Dünya renkleri: Kapadokya — ney benzeri üflemeli + yaylı pad; Likya — gitar arpejleri + deniz; Karadeniz — kemençe esintili yaylı sentez + yağmur; Erciyes — koro pad + çanlar; Pamukkale — sıcak yaylılar + ud benzeri tel (Karplus-Strong). Makam esintisi (Hicaz, Uşşak) melodik dizi olarak; taklit değil, esinti.
- **Yasal üretim:** müzik prosedürel sekansör + Web Audio sentezi (JSON desenler); SFX prosedürel veya yalnız CC0 kaynaklardan (lisans tek tek kontrol, CREDITS.md). Örnekli CC0 kayıt kullanılırsa normalize, −16 LUFS hedef.
- **SÜRÜ.io sesi:** binlerce kanat tek bir "uğultu" katmanıdır (yoğunlukla filtre açılır); dalgalar, uzak martılar (CC0), gün batarken müzik majörden yumuşak bir minöre ve sonunda "mavi saat" padine kayar.
- **Haptik:** §2.3 tablosu; toplam haptik süresi saniyede ≤ 150 ms (yorgunluk sınırı).

### 2.13 Yerelleştirme, yaş ve hassasiyet
- **TR varsayılan, EN ikinci.** Tüm metin anahtar tablosunda; dizi birleştirme yok. Büyük harf `toLocaleUpperCase('tr-TR')` (İ/ı). Sayı: TR `48.210`, EN `48,210`; süre biçimi her iki dilde spor biçimi `2:07.4` (paylaşım kartı tutarlılığı). Hız: TR `km/s`, EN `km/h`. Metin dokuya gömülmez; kartpostal yer adları çalışma anında fontla yazılır. Arayüz kutuları %30 uzunluk payıyla.
- **13–60 yaş:** çarpma şiddetsizdir — pilot 1–2 yuvarlanıp oturur pozisyonda durur, uzuvlar doğal sınırlarda; yakın plan çarpma yok; kan/yaralanma yok. Kask ve vizör: yüz görünmez, gerçek kişi benzerliği yok.
- **Gerçek dünya notu:** Ayarlar > Hakkında'da tek satır: "Wingsuit gerçek hayatta yıllar süren eğitim ister." (Oyun içinde nasihat yok.)
- **Kültürel saygı:** antik kalıntılar ve kaya mezarları yakınlık nesnesidir ama zarar görmez (temas = sekme/yumuşak çarpma, parçalanma yok). Balon, gulet, yayla evlerinde logo/marka/gerçek isim yok. Bayrak, siyasi sembol, sınır haritası yok.
- **Hayvanlar:** SÜRÜ.io'da hiçbir kuş zarar görmez; Doğan "dağıtır", tüy saçılması gibi zarar ima eden efekt yok.
- **Işığa duyarlılık:** hiçbir efekt 3 Hz üzerinde yanıp sönmez (şimşek ≤ 0,5 Hz).

---

## 3. Sanat yönetimi (Art Bible)

### 3.1 Görsel tez ve tutarlılık kuralları
- **Tez:** "Belgesel gerçekçiliği + resimsel ışık." Gerçek arazi, gerçek ölçek; derinliği **hava perspektifi** (yükseklikle azalan sis + güneş yönlü saçılma rengi) taşır. Her dünya kendi imza saatinde; düz öğle ışığı yok.
- **Ölçek:** 1u = 1 m. Balon zarfı 18–22 m yükseklik, ~16 m çap; sepet 1,2 m; peri bacası 5–40 m; gulet 22–32 m; yayla evi 6–10 m; traverten basamağı 0,5–3 m; ladin 20–35 m; pilot 1,8 m, kanat açıklığı ~2 m.
- **Işık:** dünya başına tek güneş yönü; gök, pişmiş arazi gölgesi, dinamik gölge ve bulut ışığı aynı yönü kullanır (veri dosyasında tek kaynak).
- **Texel yoğunluğu:** arazi makro dokusu 1 texel ≈ 2–4 m (yükseklik verisinden türetilmiş renk/normal/AO), yakın detay dokuları 1 texel ≈ 1–2 cm (makro varyasyonla karıştırılmış, tekrar görünmez); kahraman prop (balon, gulet, pilot) 512 px/m; diğer prop 256 px/m.
- **Ufuk:** arazi kenarı asla görünmez — uzak "kabuk" halkası (impostor) + sis + gökyüzü birleşimi.

### 3.2 Dünya kartları
| | 1 Kapadokya Şafağı | 2 Likya Kıyısı | 3 Karadeniz Yaylası | 4 Erciyes Karı | 5 Pamukkale Gün Batımı |
|---|---|---|---|---|---|
| Saat | Gün doğumu +10 dk | İkindi | Sabah, bulut arası | Kış ikindisi | Gün batımı −10 dk |
| Güneş yüksekliği / azimut | 7° / doğu | 32° / batı-güneybatı | 22° / güneydoğu (dağınık) | 11° / güneybatı | 4° / batı |
| Güneş / gök ısısı | 3.400 K / 9.000 K | 5.200 K / 8.000 K | 6.200 K / 7.000 K | 4.600 K / 12.000 K | 2.800 K / 8.500 K |
| Palet (hex) | gök üstü #3E5F8A · ufuk #F6C48E · tüf aydınlık #D9B48F · gül tüf #D49A8A · mor gölge #6B4E5E · altın sis #F4D9A6 | gök #8EC9F0→#E8F4FB · sığ su #2BB3B1 · derin su #0B4F6C · kireçtaşı #CFC6B4 · çam #3F5B3A · kum #E9D8B4 | ladin #1F3B2C · çayır #6E8B3D · sis #DDE3E0 · ahşap #5A3B26 · teneke çatı #8A8F93 · bulut gölgesi #A9B6BC | kar ışık #FFF6EC · kar gölge #A9C2E0 · buz #BFE6F2 · kaya #4A4642 · gök #1F4E8C→#CFE3F5 | gök #2B2D5B→#E86A4A→#FFC27A · traverten #F7EDE2→#F3C9A8 · traverten gölge #9AA7C7 · havuz #49C6C9 · kalıntı taşı #C9A27E |
| Sis/atmosfer | Vadilere çökmüş altın zemin sisi (vadi tabanından 0–60 m), sıcak saçılma | Berrak, ince mavi pus, deniz üstünde hafif nem | Kalın katmanlı sis + uçulabilir bulut denizi (yükseklik bandı) | Çok berrak, uzakta mavi; sırtlarda kar tozu | Sıcak turuncu pus, güneş tarafında yoğun saçılma |
| Kahraman prop | ~40 sıcak hava balonu (desenli, logosuz), peri bacaları, kaya oyma pencereler, üzüm bağı iniş platosu | Guletler, kaya mezarı cepheleri, kaya kemeri, deniz feneri, kumsal | Ahşap yayla evleri, şelaleler, ladin ormanı, yayla yolu | Buz kornişleri, kar sırtları, kaya çıkıntıları, zirve kayalıkları | Traverten terasları, ayna havuzlar, antik tiyatro ve sütun kalıntıları |
| VFX | Brülör alevi + ışık, sis tülleri, toz soyulması, güvercin sürüleri (görsel) | Su köpüğü çizgileri, gulet iz dalgası, su üstü sprey (alçak uçuşta), martılar | Bulut içi nem damlaları, şelale sisi, yağmur perdesi, kuşlar | Kar tozu (sırt + pilot türbülansı), parıltı (glint), kar savruntusu | Havuz yansımaları, sıcak ışık huzmeleri, toz zerreleri |
| LUT/ruh hali | Sıcak altın, gölgede mor | Temiz turkuaz, hafif sıcak | Serin yeşil-gri, yumuşak kontrast | Mavi-beyaz, gölgede doygun mavi | Kızıl-turuncu, gölgede lavanta |

### 3.3 Malzemeler (PBR rehberi)
- **Arazi:** yükseklik verisinden eğim/yükseklik/yön maskeleriyle 4–6 katman (tüf, kaya, toprak, çimen/çam iğnesi, kar, traverten); makro renk + pişmiş AO + pişmiş ufuk gölgesi; yakında detay normal. Pürüzlülük: kuru tüf 0,85–0,95, ıslak kaya 0,35–0,5, kar 0,6 + parıltı, buz 0,1–0,2, traverten 0,5 (havuz kenarı ıslak 0,2).
- **Su:** derinlik rengi (araziden önceden hesaplanmış derinlik dokusu), kıyı köpüğü (kıyıya uzaklık dokusu), iki kayan normal haritası, Fresnel; Likya'da sığ suda dip kumu ve kaustik (Yüksek+); Pamukkale havuzları sakin ayna.
- **Balon kumaşı:** naylon, pürüzlülük 0,55, hafif iletim (güneşe karşı balon içi parlar — arka ışık için ucuz "translucency" terimi); dikiş şeritleri normalde.
- **Pilot/giysi:** ripstop kumaş normal haritası, kat izleri, kask vizörü (pürüzlülük 0,05, ortamı yansıtır), eldiven ve ayakkabı ayrı malzeme kimliği; desenler maske + palet ile (kozmetikler doku kopyası gerektirmez).
- **Ahşap/taş/metal:** yayla evi eskimiş ahşap 0,8; teneke çatı metalik 0,9 / pürüzlülük 0,45 pas lekeli; kalıntı mermer/kireçtaşı 0,6.

### 3.4 Post-processing görünümü
- **Ton eşleme: AgX** (sıcak gün batımı ve kar vurgularında doygunluğu güzel düşürür). three.js `AgXToneMapping` ve postprocessing kütüphanesindeki AgX modu sürüme göre doğrulansın; yoksa aynı eğri özel shader'la.
- **Renk derecelendirme:** dünya başına 32³ LUT (betikle üretilen .cube) veya lift/gamma/gain + doygunluk + ayrık tonlama (gölge/ışık rengi) parametreleri; Düşük'te aynı parametreler malzeme shader'ında.
- **Bloom:** HDR eşik 1,0, yoğunluk 0,25–0,6 (güneş diski, brülör, su parıltısı). **God rays:** yalnız güneş ekrandayken, ucuz radyal bulanıklık (Yüksek+). **DOF:** yalnız tekrar/Foto Modu. **Hareket bulanıklığı yok** → hız çizgileri. Kromatik sapma yalnız tavan hızda ≤ 0,0015. Vinyet 0,2–0,3. Film greni 0,03 (Yüksek+). Gökyüzü gradyanında dithering zorunlu (bant yok).

### 3.5 Tipografi ve UI stili
- **Fontlar (Google Fonts, OFL, Türkçe glif kontrolü zorunlu):** Başlık/HUD rakamları **Barlow Condensed** 600/700 (italik hız vurgusu); gövde/UI **Inter** 400/600, tabular rakamlar; kartpostal/Foto çerçevesi **Playfair Display** italik. Test dizesi: "Ağaçlı Şelâle · İĞNEADA · ığdır · ÇÖŞÜ · 2:07.4" her fontta doğru render edilmeli.
- **Stil:** "altimetre ve harita" estetiği — ince çizgiler, kılcal 1 px kontur (#FFFFFF22), koyu arduvaz yarı saydam paneller rgba(14,20,28,0.55), metin #F5F1E8. Dünya vurgu rengi: Kapadokya #F2A541, Likya #2EC4C6, Karadeniz #8DB580, Erciyes #9FD3F0, Pamukkale #F2795C.
- **Yakınlık renkleri:** ×1 #4CC38A, ×2 #F2C744, ×3 #F28C28, ×5 #E5484D. Renk körü modu (Okabe-Ito): ×1 #56B4E9, ×2 #F0E442, ×3 #E69F00, ×5 #D55E00 + dilim kalınlığı kademeyle artar + "×3" yazısı daima görünür.
- Animasyon: UI geçişleri 180–260 ms ease-out; sayılar sayarak dolar; varsayılan gölgeli metin ve sistem fontu yasak.

### 3.6 Düşük kademe de güzel (önce-düşük tasarım)
- Arazi ışığı ve uzun gölgeler **çevrimdışı pişirilir** (yükseklik verisinden ufuk açısı gölgesi + AO → makro renk dokusu); Düşük'te dinamik gölge yalnız pilotun projeksiyon gölgesi.
- Gökyüzü analitik gradyan + güneş diski + saçılma rengi shader'ı (HDRI şart değil); yükseklik sisi vertex shader'da.
- Renk derecelendirme ve ton eşleme malzeme shader'ına gömülü (post zinciri olmadan aynı ruh hali).
- Su: gök gradyanı yansıması + Fresnel + güneş parıltısı (planar yansıma yok).
- Yakın detay: yalnız rota koridorunda instanced çalı/ağaç kartları; uzak orman makro dokuda.
- **Kabul:** Düşük ve Ultra aynı karede yan yana konduğunda kompozisyon, palet ve ışık yönü aynı olmalı; fark detay ve yumuşaklıkta kalmalı.

### 3.7 Yasaklar
Varsayılan three.js görünümü (gri MeshStandard, varsayılan ışık), aydınlatılmamış gri; bantlı ucuz gradyanlar; görünen doku tekrarı; arazi kenarı/boşluk; sis veya LOD "pop"u (dither'lı geçiş kullan); patlamış beyaz gök; neon doygunluk; düşük poli/stilize CC0 setlerin (ör. Kenney 3D) ana oyunda gerçekçi araziyle karıştırılması; marka/logo; lens flare bolluğu; siyahların ezilmesi; UI'da emoji (paylaşım metni hariç).

### 3.8 SÜRÜ.io — ayrı sanat kitabı
- **Tez:** resimsel-gerçekçi gün batımı denizi (karikatür değil). Ana oyunla aynı malzeme dili, daha grafik okunurluk.
- **Zaman = ışık:** 3 dakikada güneş 6° → −1° iner; güneş 3.200 K → 2.200 K; 2:15'te fener yanar; 3:00'te "mavi saat". LUT sıcak altından mavi-mora akar.
- **Palet:** gök #1C2340 (tepe) → #6B3F69 → #E0735A → #FFC48A (ufuk); deniz #2A3550, güneş parıltı yolu #FFD7A0; sazlık siluetleri #3B3A2A sıcak kenar ışığıyla; fener taşı #D8CBB8, fener ışığı #FFE2A6; gece bölgesi #1B2440 (%40 doygunluk kaybı); halka kenarı ışık bandı #FFB36B.
- **Kamera:** yukarıdan 3/4, eğim 55°; yükseklik `45 m + 2,2 × sürü yarıçapı` (45–160 m); lider portrede ekranın alttan %40'ında; 0,8 sn ileri bakış; ω = 4. Canlı oyunda ağır çekim ve kamera kesmesi yok (çevrimiçi uyumu); KUŞATMA'da yalnız %8 zoom-out vuruşu. Tur başı 4 sn açılış planı (su seviyesinden yükselerek tüm sürüleri gösterir), tur sonu kazanan sürünün Sürü Gösterisi şekli için yükselen plan.
- **Kuşlar:** instanced sığırcık (24–40 üçgen), vertex shader'da kanat çırpma (8–12 Hz, kuş başına faz, aralıklı süzülme); gövde neredeyse siyah #15161A, yanardöner spekülar (#3A5C6E / #5B3A6E); sahip rengi kenar/alt kanat tonu %60 + emisif %15 (dönüşlerde alt kanat "flaş"); yabani kuşlar renksiz, sıcak kenar ışıklı. **Lider:** 1,8× ölçek, parlayan hale, arkasında ışık şeridi.
- **Sahip renkleri (renk körü güvenli + desen):** oyuncu daima **Altın #FFC23D**; rakipler: #56B4E9, #E69F00, #009E73, #0072B2, #D55E00, #CC79A7, #F2F2F2; tekrar eden renkler aura desenleriyle ayrılır (düz halka / kesikli / noktalı) ve lider işaret şekliyle (daire, üçgen, kare, eşkenar dörtgen). Suya izdüşen yumuşak aura lekesi (alfa 0,18) sahibin rengi ve deseniyle.
- **Dönüşüm dalgası:** dönen kuş 120 ms beyaz parlar, 300 ms'de yeni renge geçer → sınırlarda okunur renk dalgaları. **KUŞATMA:** halka ilerleme yayı suyun üstünde senin renginde ışık çizgisi; tetiklenince şok halkası + dalga halinde parlayan dönüşüm.
- **Doğan:** belirgin uzun kanatlı koyu siluet, suda gölgesi; dalış sırasında dağılan kuşlar girdap çizer (tüy/zarar efekti yok).
- **Fırtına bulutu:** katmanlı bulut kartları, kayan yağmur perdeleri, şimşek ≤ 0,5 Hz; içi soğuk ve doygunluğu düşük.
- **Gün Batımı Halkası:** içeride sıcak altın ışık, dışarıda gece tonu; sınırda su üstünde yumuşak parlayan ışık perdesi.
- **Kademe davranışı:** sim kuş sayısı tüm kademelerde aynı (~1.500); kademe yalnız görsel arka plan sürüleri, su yansıması ve kuş shader zenginliğini (yanardönerlik) değiştirir — sayılar 5.G'de. Düşük'te: gök gradyanı yansıması + güneş parıltısı, aura ve renk dalgaları aynen korunur (okunurluk oynanıştır).
- **UI:** ana oyunla aynı fontlar; zamanlayıcı batan güneş yayı; Nefes yayı parmak altında ince Altın çizgi; "YZ" etiketi her rakip adının yanında.
- **Yasaklar:** karikatür kontur, neon, yılan/agar benzeri trail ve topaklar, kuşa zarar ima eden her şey, sert strob, okunurluğu bozan aşırı bloom.

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

### 4.2 Proje yapısı (`games/kanat/`)
```
games/kanat/
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

Birimler: 1u = 1 m, y yukarı, x doğu, −z kuzey. Sim zamanı tick ile sayılır; tüm gameplay kodu `src/kanat/sim/**` altında saf (DOM/three.js bağımsız) TypeScript olur ve Node'da da koşar. Render katmanı sim durumunu okur, asla yazmaz.

#### 4.G.1 Gerçek arazi hattı (offline bake)

**Kaynak:** AWS Terrain Tiles, terrarium PNG: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (URL'yi ve lisans/atıf metnini bake öncesi doğrula). Çözümleme:

```
h_metre = (R·256 + G + B/256) − 32768
tileX = floor((lon+180)/360 · 2^z)
tileY = floor((1 − ln(tan φ + 1/cos φ)/π)/2 · 2^z)      // φ = enlem (radyan)
metre/piksel = 156543.034 · cos φ / 2^z                  // z=13, 38.6°K → ≈14.9 m
```

**Konumlar (yaklaşık merkezler — ajan bake önce önizleme render'ıyla doğrulasın, merkezi en çarpıcı rölyefe kaydırabilir):**

| Dünya | Merkez (enlem, boylam) | Not |
|---|---|---|
| 1 Kapadokya Şafağı | 38.64 K, 34.83 D (Göreme) | Rölyef düşük (~200–300 m) → termal + yamaç kaldırması + baloncuk başlangıç |
| 2 Likya Kıyısı | 36.23 K, 29.45 D (Kaputaş/Kalkan) | Deniz altı negatif değer verir → batimetri olarak sığ-su rengi için kullan, deniz yüzeyi y=0 |
| 3 Karadeniz Yaylası | Birincil 40.95 K, 41.10 D (Ayder); alternatif 40.62 K, 40.29 D (Uzungöl) | Şelale ve yayla evi için Ayder; göl istenirse Uzungöl. Birini seç, gerekçeyi yaz |
| 4 Erciyes Karı | 38.53 K, 35.45 D | Zirve ~3.900 m civarı; düşüş rotaları için ideal |
| 5 Pamukkale Gün Batımı | 37.92 K, 29.12 D | Traverten basamakları veride yok → yüksek çözünürlüklü prosedürel yama (aşağıda) |

**Bake script'i** (`tools/bake-terrain.ts`, Node, bir kez çalışır, çıktılar repoya commit'lenir; runtime'da ağ yok):
1. Çekirdek alan 8.192 m × 8.192 m: z=13 karoları indir, birleştir, çöz, Web Mercator → yerel ENU metreye taşı (merkezde `cos φ0` ölçeği; 8 km'de bozulma ihmal edilebilir), **1024² ızgara, 8 m aralık**a bikübik yeniden örnekle. Uzak halka 49 km × 49 km: z=10 → **512² @ 96 m**. Çekirdek, uzak halkanın içine kenarları 256 m'lik yumuşak geçişle gömülür.
2. Dünya başına `verticalScale` 1.0–1.25 (sanatsal; Kapadokya için 1.15 öner). Bunu UI'da "gerçek veri" iddiasıyla çelişmeyecek şekilde CREDITS'te belirt.
3. Orta frekans detay: çekirdekte 30–60 sn'lik sabit-seed'li **damla tabanlı hidrolik erozyon** (≈150k damla) — 30 m SRTM'in "yumuşak hamur" görünümünü oyuk ve sırtlarla kırar. Zaman kutusu: 20 dk'da sonuç vermezse atla.
4. Çıktılar `public/worlds/<id>/`:
   - `height_core.u16.z` ve `height_far.u16.z`: Uint16 (min/max başlıkta; 4.000 m aralıkta ~6 cm hassasiyet), satır-delta + deflate (fflate, MIT).
   - `normal_core.png` (RG8, oktahedral), `splat.png` (RGBA8 4 katman ağırlığı; kural: eğim, yükseklik, eğrilik, kıyı mesafesi, dünyaya özel maskeler), `shadow_ao.png` (R: sabit güneş için ufuk-tabanlı gölge maskesi, G: AO). Güneş her dünyada sabit olduğundan arazi gölgesi **bake edilir** → Düşük kademede de keskin vadi gölgeleri bedava.
   - `color_macro.ktx2` 2048²: splat renkleri × AO × gölge × sanatsal gradyan; uzak arazinin ana rengi budur (ucuz ve "uydu fotoğrafı gibi" zengin).
   - `props.bin`, `veg_<chunkX>_<chunkZ>.bin`, `world.json`.
5. Atıf: Terrain Tiles'ın resmî kaynak listesini (SRTM, GMTED2010, ETOPO1 vb. — tilezen/joerd atıf belgesinden **aynen**) CREDITS.md'ye ve Ayarlar → Hakkında ekranına koy.
6. Karo indirilemezse: aynı hattı fBm + ridged noise ile çalıştıran `--synthetic` modu (geliştirme blokajı olmasın), ama teslimde gerçek veri zorunlu.

**Prosedürel yüksek frekans (CPU/GPU birebir):** Oynanış yüzeyi `H(x,z) = base_bilinear(x,z) + D(x,z)`, `D = Σ_{o=0..1} a_o·valueNoise(x·f_o, z·f_o)·maskRock`, a = [1.2, 0.5] m, dalga boyu [24, 9] m. Value noise tamsayı hash + kübik smoothstep ile yalnız + − × kullanır; TS ve GLSL (highp) aynı sabitlerle yazılır. 3,5 m'lik üçüncü oktav **yalnız normal detayıdır**, çarpışmaya girmez. Kural: LOD0 halkasında D tüm kademelerde aynı çizilir; kademe sadece LOD0 yarıçapını değiştirir.

**Pamukkale traverten yaması:** 1.024 × 640 m alan, **1 m** çözünürlüklü ayrı yükseklik haritası: `h' = h + terrace(h)` — yüksekliği 1,2–3 m basamaklara bölen yumuşak merdiven fonksiyonu + kenar "dudak" noise'u; her basamağın düzlüğüne havuz maskesi; havuz suyu ayrı düz mesh'ler. Ana arazi bu bölgede 0,5 m alçaltılır, yama kendi etek (skirt) şeridiyle oturur.

#### 4.G.2 Arazi render: CDLOD + etek

- **CDLOD (Strugar):** tek paylaşılan ızgara mesh'i (Düşük 17², diğerleri 33²), seçilen her quadtree düğümü için instance. Vertex shader yüksekliği `R32F` dokudan `texelFetch` ile 4 örnekte **elle bilinear** okur (filtreleme uzantısına bağımlılık yok; CPU örnekleyicisiyle aynı sonuç). Uzaklığa göre morph faktörü bir üst LOD ızgarasına kaydırır → çatlak ve pop yok.
- **Etekler:** her düğüm kenarında 30 m aşağı inen etek şeridi (güvenlik ağı); uzak halkanın dış kenarında −600 m'ye inen "ufuk eteği". Kural: ufukta arazi kenarı asla görünmez (uzak halka sis mesafesinin ≥1,3 katı).
- **Seçim:** CPU'da her kare quadtree inişi; düğüm AABB'si önceden hesaplanmış min/max yükseklik piramidinden; frustum culling. Tüm arazi ≤3 draw call (çekirdek, uzak, Pamukkale yaması). Instance attribute: offset.xy, ölçek, LOD seviyesi.
- **Malzeme:** 4 katman/dünya, `DataArrayTexture` (KTX2 dizi): albedo+yükseklik(A), normal.xy+roughness+AO. Karışım: splat ağırlığı × katman yüksekliği (height-blend). Projeksiyon kademeye göre: Ultra/Yüksek tam triplanar, Orta **biplanar** (IQ yöntemi, 2 örnek), Düşük tek düzlem + dik yüzeyde dikey projeksiyona geçiş. 600 m'den sonra yalnız `color_macro` (1 örnek). Detay normali yakında.
- **Aydınlatma:** güneş N·L × bake gölge maskesi + gökyüzü SH (bake cubemap'ten) × AO; dinamik gölge yalnız oyuncu ve yakın prop'lar için (bkz. 5.G).

#### 4.G.3 Gökyüzü, atmosfer, sis, bulut

- **Analitik gökyüzü** (Preetham veya Hillaire-tarzı LUT, ajan seçsin): güneş sabit olduğundan yüklemede **bir kez** 256² cubemap'e render et → arka plan + PMREM ortam ışığı + SH. Kare başı maliyet ≈ 0.
- **Yükseklik sisi (analitik integral):** three.js fog chunk'ını `onBeforeCompile`/ShaderChunk ile değiştir; her materyal (arazi, prop, impostor, su, bulut) aynı fonksiyonu çağırır:
  `F = (a/b)·e^(−b·y_cam)·(1 − e^(−b·dir_y·t))/dir_y` (dir_y≈0 için limit formu), renk = cubemap'ten görüş yönü rengi + Henyey-Greenstein (g=0,76) güneş halesi. Kapadokya "altın sis": vadi tabanı +40 m'ye kadar ikinci, kayan 2D noise dokulu zemin sisi katmanı.
- **Bulut impostor'ları:** 16 bulut sprite'ı offline üretilir (yoğunluk + 3 yönlü ışık terimi RGBA'da) → güneş yönüne göre shader'da aydınlatılır, derinlik-yumuşatmalı (soft particle). Karadeniz "bulutun içinden geçiş": elipsoid bulut hacimleri listesi; kamera hacme girince sis yoğunluğu rampası + kameraya yakın yoğun sprite'lar + beyaz geçiş, hacim içindeki uzak impostor'lar çizilmez.

#### 4.G.4 Prop'lar ve bitki örtüsü

- **Kanonik yerleşim kuralı:** çarpışabilir her nesne (peri bacası, ağaç gövdesi, ev, balon, sütun, korniş) **tüm kademelerde var olur** (kademe yalnız LOD/impostor mesafesini değiştirir). Kademeye göre değişen tek şey çarpışmasız zemin süsüdür (ot, <1 m taş, çalı).
- **Peri bacaları:** motor içinde prosedürel lathe: profil = koni/kapsül parametrelerinden üretilir (çarpışma primitifi ile görsel ±0,4 m içinde), radyal noise, bazalt "şapka" ayrı mesh; tüf için dünya-y tabanlı katman bantlı triplanar. 6 profil varyantı × ölçek/rotasyon, ~1.200 instance, 2 LOD + dithered crossfade. Bazılarında oyuk pencere decal'i.
- **Balonlar:** prosedürel lathe zarf (ters damla profili `r(t)`, 24 dilim × 32 halka), dilim indeksine göre desen (shader: patternId + 3 renk), sepet + halat çizgileri, brülör alevi (emisif sprite + kısa ışık titreşimi). 40 balon, hareketleri **sim zamanının deterministik fonksiyonu**: `p(t) = p0 + drift·t + A·sin(ωt+φ)` (+ yavaş yükseliş). Çarpışma: elipsoid + sepet kutusu.
- **Bitki:** türler: kavak (Kapadokya vadileri), kızılçam (Likya), ladin (Karadeniz), seyrek ardıç (Pamukkale), Erciyes'te yok. Yakında mesh (≤600 tri), ötesinde **oktahedral impostor** (8×8 görünüm, atlas build-time'da headless render ile üretilir), daha ötesi macro colormap'e gömülü. Yerleşim offline: maske × Poisson disk (seed'li), 256 m chunk'lar; instance verisi chunk-yerel Int16 konum + u8 rotasyon + u8 ölçek. Çarpışma: gövde kapsülü + taç için kesik koni SDF.
- **Dünyaya özel:** guletler (lofted gövde, demir atmış, yavaş sallanma), ahşap yayla evleri (4 parametrik varyant), şelaleler (akış dokulu şerit mesh + sis flipbook), Erciyes buz kornişleri (sırt hattı tespiti: yerel maksimum eğrilik → rüzgâr altı yöne taşan ekstrüzyon), Pamukkale jenerik antik kalıntılar (lathe sütunlar, kırık duvarlar, tiyatro basamak yayı).

#### 4.G.5 Uçuş modeli (enerji tabanlı süzülme)

Nokta-kütle planör modeli; durum: konum p, hız V, uçuş yolu açısı γ, yön ψ, yatış φ, C_L. Sim 60 Hz, çarpışma için 2 alt adım (120 Hz), yarı-örtük Euler.

```
q   = ½·ρ·V²                    ρ = 1.10 (tüm dünyalarda sabit: tutarlılık > gerçekçilik)
L   = q·S·C_L                   m = 90 kg, S = 1.4 m²
D   = q·S·(C_D0 + k·C_L² + c_v·max(0, V−58)²)    C_D0 = 0.06, k = 0.20, c_v = 0.004
V̇   = −D/m − g·sinγ
γ̇   = (L·cosφ − m·g·cosγ)/(m·V)
ψ̇   = L·sinφ/(m·V·cosγ)
ṗ   = V·yön(γ,ψ) + (0, w_termal + w_yamaç, 0) + rüzgâr_yatay
Özgül enerji E = ½V² + g·y ;  Ė = −D·V/m + g·(w_termal + w_yamaç)   // enerji yalnız hava hareketinden gelir
```

- Hedef ayar: (L/D)max ≈ 4,6 @ C_L≈0,55; trim ≈ 42 m/s (150 km/sa), çökme ≈ 9 m/s; tam dalışta yumuşak tavan ≈ 64 m/s (230 km/sa); C_L,max = 1,2 → stall ≈ 31 m/s (111 km/sa).
- **Kontrol eşlemesi:** girdi `sx, sy ∈ [−31, 31]` (6 bit, 30 Hz'de örneklenir, ölü bölge + expo §2'deki jest katmanında uygulanıp **sonra** kuantize edilir → canlı oyun = replay). `φ_hedef = sx/31·65°`, yatış hızı ≤150°/s, τ=0,12 s. `C_L,hedef = C_trim + sy/31·(C_L,max − C_trim)` (çekiş) veya `·(C_trim − (−0,10))` (itiş), τ=0,15 s. Bırakınca φ→0 ve C_L→C_trim, τ=0,4 s (otomatik düzelme).
- **Stall:** V < 33 m/s iken C_L üst sınırı yumuşakça düşer ve burun-aşağı yardım momenti eklenir; V asla 25 m/s altına inmez; asla anlık ölüm yok.
- **Termal:** `w = w0·e^(−(r/R)²)`, R 30–60 m, w0 4–8 m/s, üst sınırda yumuşak sönüm. **Yamaç kaldırması:** `w_yamaç = k_r·max(0, ∇H·rüzgâr)` (yalnız yüzeyden <60 m yüksekte, yükseklikle azalır) — rüzgâra bakan yamaç boyunca uçmak ödüllendirilir; Kapadokya'nın düşük rölyefi böyle taşınır.
- **Yakınlık asistanı** (yeni başlayan, kapatılabilir): çarpışmaya kalan süre `τc = d/max(ε, −ḋ)` < 0,6 s ise `(1 − τc/0,6)` oranında burun-yukarı/uzaklaşma düzeltmesi. Bayrak ghost'a ve skora yazılır.
- **Çarpışma:** gövde küresi r = 0,6 m; her alt adımda `d < r` ise kaza. Tünelleme koruması: `d(p_önceki) > |Δp| + r` ise geçiş imkânsız; değilse segment üzerinde 4 adım ikiye bölme. Su (y<0) = yumuşak sıçrama kazası. Kaza → son 3 s'lik halka tampondan (180 durum) yavaş çekim replay, hazırda bekleyen başlangıç durumuyla < 1 s yeniden deneme.

#### 4.G.6 Yüzeye uzaklık sorgusu (Yakınlık Çarpanı'nın kalbi)

Her tick `query(p) → {d, sınıf, enYakınNokta, normal}`:
1. **Arazi:** dikey tahmin `d_v = y − H(x,z)`; `d_v > 45 m` ve bölge eğimi küçükse erken çık (`d ≈ d_v·cosθ`). Değilse kaba ızgara 13×13 @ 5 m (±30 m) üzerinde yüzey noktalarına Öklid mesafesi → en yakın s*; çevresinde 7×7 @ 1 m inceltme; son olarak s* normaliyle düzlem düzeltmesi `d = max(0, (p−S*)·n*)` (izdüşüm 1 m içinde kalıyorsa). ≈220 örnek, JS'de onlarca µs.
2. **Prop'lar:** 32 m hücreli düzgün ızgara spatial hash; 3×3 hücre; SDF primitifleri: kapsül, kesik koni, elipsoid (IQ yaklaşık), yuvarlatılmış kutu. Peri bacası = kesik koni + şapka elipsoidi; balon = elipsoid + kutu.
3. **Su:** `d = y` (sınıf=su).
4. Sonuç `min`; sınıf skor sistemine gider. Düz yüzey istismarına karşı parametre `flatSurfaceMaxMult` (varsayılan ×3: su ve eğimi <8° zemin üzerinde ×5 verilmez — §2 GDD ile uyumlu tut, değer veri dosyasında).
- **Sıyırma (graze):** `d < 3 m` iken d'nin yerel minimumu (ḋ işaret değiştirir) ve V > 140 km/sa → tek olay, gücü `(3−d)/3`; VFX `enYakınNokta`da (toz/kar/su püskürtmesi).
- **Kapı:** halka düzlemi segment kesişimi + yarıçap içi. **Balon İlmeği:** iki balon arası boşluk < 25 m olan çiftler için merkezleri birleştiren dikey "perde"; ardışık tick'lerde 2B çapraz çarpım işaret değişimi + segment sınırı içinde + zarf yükseklik bandında → olay.

#### 4.G.7 İçerik veri formatları

`worlds/<id>/world.json` (değerler §3 sanat yönetimiyle senkron tutulur):
```json
{"id":"kapadokya","name":{"tr":"Kapadokya Şafağı","en":"Cappadocia Dawn"},
 "geo":{"lat":38.64,"lon":34.83,"zoomCore":13,"coreSizeM":8192,"coreRes":1024,
        "farSizeM":49152,"farRes":512,"verticalScale":1.15},
 "sun":{"azimuthDeg":95,"elevationDeg":6},"wind":{"dirDeg":250,"speed":4},
 "fog":{"a":0.00018,"b":0.004,"groundFog":{"top":1120,"density":0.02}},
 "layers":["tuf_pembe","tuf_beyaz","kuru_ot","bazalt"],
 "props":{"chimneys":{"count":1200,"mask":"chimney"},"balloons":{"count":40,"seed":7}}}
```
`routes/<id>.json`:
```json
{"id":"kap-1","world":"kapadokya","name":{"tr":"Güvercinlik Vadisi","en":"Pigeon Valley"},
 "start":{"type":"balon","pos":[812,1610,-240],"headingDeg":210,"speedKmh":150},
 "line":[[812,1600,-240],[700,1450,-90]],
 "gates":[{"t":0.12,"pos":[640,1290,40],"normal":[0.3,0,-0.95],"radius":12,"kind":"normal"}],
 "thermals":[{"pos":[300,410],"radius":45,"w0":6,"top":1500}],
 "landing":{"center":[-950,1052,1210],"radius":25},
 "stars":[1800,3200,5000],
 "ustaGorevleri":[{"id":"ilmek5","type":"balloonThread","count":5}],
 "postcards":["kap-pc-1"],"musicCues":[{"t":0.4,"cue":"swell"}]}
```
`start.type ∈ {balon, uçurum, sırt}`. `line` = ideal çizgi (centripetal Catmull-Rom, 30–80 nokta); bot ve "Rota Kâşifi" bunu kullanır.

**Rota Kâşifi (geliştirme aracı):** 16 m ızgarada A*; maliyet = hedef yüzey üstü yüksekliğe (20 m) sapma + eğrilik cezası + "kanyonluk" ödülü (150 m pencerede yerel rölyef ve gökyüzü-görüş faktörü); kısıtlar uçuş zarfından: min dönüş yarıçapı `V²/(g·tan φmax)` ≈ 104 m @ 42 m/s, alçalma profili trim çökmesiyle uyumlu. Aday çizgiyi uzman bot uçar; ajan contact sheet'e bakıp kapı/termal yerleştirir. 20 rota böyle üretilir (elle başlangıçtan çok daha hızlı).

**Günün Rotası:** `seed = fnv1a32("KANAT-GR-" + yyyymmdd)` (Europe/Istanbul tarihi, UTC+3). Her dünyada önceden hesaplanmış ~8 koridor grafiği; seed → dünya, koridor, başlangıç, kapı ofsetleri, termaller, rüzgâr. Oluşturucu, sunmadan önce uzman botu hızlı modda (görselsiz, ~0,2 s) uçurur; başarısızsa deterministik `seed+1` dener → herkes aynı rotayı alır. Numara `#N` = yayın epoch'undan bu yana gün.

#### 4.G.8 Determinizm ve Hayalet kodu

- V8 (Android WebView) ile JavaScriptCore (iOS) arasında `Math.sin/cos/exp/pow/atan2` bit-düzeyinde aynı değildir. Sim yalnız + − × ÷ ve `Math.sqrt` (IEEE doğru yuvarlama) kullanır; trig/exp için `detMath` (aralık indirgeme + minimax polinom) yaz. Arazi örnekleme tamsayı veriden f64 bilinear → deterministik. RNG: xoshiro128**, sistem başına ayrı akış.
- Ghost = girdi akışı yeniden simüle edilir (trajektori kaydı değil). Format:

```
"K1." + base64url(nopad)( header | payload | crc32 )
header (varint/zigzag):
  u8 formatVersion=1 | u16 SIM_VERSION | u8 mode(0 Kariyer,1 Günün Rotası,2 Serbest)
  varint routeId|dailyIndex | u32 seed | u8 flags(bit0 asistan) | varint suitId
  varint tickCount | varint finalTimeMs | varint score | u32 finalStateHash
payload = deflateRaw( sxStream | syStream | events )
  axisStream: 30 Hz örnekler, delta → zigzag varint; sıfır delta koşuları (0, uzunluk) RLE
  events: (tickDelta varint, tip u8)  // paraşüt, vb.
```
- Alımda: crc32 → SIM_VERSION → yeniden sim → `finalStateHash` eşleşmeli. Hatalarda TR/EN anlaşılır mesaj ("Bu kod oyunun farklı bir sürümüyle kaydedilmiş"). Hedef uzunluk: 120 s'lik tipik uçuş ≤ 3.000 karakter (ölç, raporla). Paylaşım host köprüsünden derin bağlantı olarak.

#### 4.G.9 Hız ve his efektleri (teknik)

FOV 70° → 230 km/sa'da +12° (hareket hassasiyeti ayarı bunu yarıya indirir); ekran-uzayı hız çizgileri (instanced quad, hızla alfa); yakınlıkla orantılı yüzeyden kopan toz/yaprak/kar/su sprite'ları ("yakınsın" geri bildirimi); kanat uçlarından halka tamponlu (64 nokta) şerit iz — kozmetik iz efektleri bunu kullanır; yüksek G'de buhar izi; radyal bulanıklık ve hafif kromatik sapma yalnız Yüksek/Ultra; kamera sarsıntısı Perlin, genlik ∝ (V−V0) ve yakınlık, üst sınırlı. Rüzgâr sesi: pembe gürültü → bant geçiren, merkez 400 Hz–2,5 kHz hızla eşlenir; peri bacası yanından geçişte graze olayına bağlı Doppler "vuuş".

#### 4.G.10 SÜRÜ.io simülasyonu

**Genel:** sabit **30 Hz** tick, toplam kuş havuzu **N = 1.500, tüm kademelerde sabit ve korunumlu** (her tick Σ sahiplik = 1.500; kuş yok olmaz, yalnız sahip değiştirir). Oynanış 2B (x,z); irtifa yalnız görsel (vertex shader). Render iki tick arasını shader'da interpolasyonla çizer (prev/curr konum attribute'ları, `alpha` uniform) → GPU'ya yükleme 30 Hz.

**SoA veri düzeni:**
```
posX, posZ, velX, velZ : Float32Array(N)
owner      : Uint8Array(N)    // 0 = yabani, 1..16 = sürü
rank       : Uint16Array(N)   // sürü içi sıra (iz gecikmesi + Vogel ofseti)
lastConv   : Uint32Array(N)   // son dönüşüm tick'i (renk dalgası)
flags      : Uint8Array(N)    // frontier, dağılmış, ...
cellOf     : Uint32Array(N); cellStart: Uint32Array(C+1); sorted: Uint16Array(N)
Sürü (F≤16): leaderX/Z, heading, speed, count, nefes, mode, trail Float32Array(F·180·2)
```
**Uzamsal hash:** arena 640×640 m sınır, hücre 6 m (107² = 11.449 hücre); her tick sayma sıralaması (say → önek toplamı → dağıt), O(N), deterministik. Komşu sorgusu 3×3 hücre; aday taraması kuş başına **en fazla 32 aday** (deterministik sıra) ve hizalama/kohezyon için **7 komşu** (sığırcıklarda gözlenen topolojik komşu sayısı) — yoğun Sıkı Dizi'de maliyeti sınırlar.

**Lider:** temel hız 12 m/s, Sıkı ×1,3; dönüş hızı `ω = 3,0 / sqrt(max(1, n/40))` rad/s, alt sınır 0,6 (büyük sürü hantal). Nefes 0–100: Sıkı −20/s, Geniş'te 0,5 s sonra +12/s; 0'da Sıkı 30'a dolana kadar kilitli.

**Takipçi kuvvetleri:** hedef = liderin **iz noktası** (`trail(t − lag_k)`, `lag_k = Lmax·rank_k/n`, `Lmax = clamp(0,3·√n, 1, 6) s`) + Vogel ofseti (`R_lat·√(k/n)·(cos k·2,39996, sin k·2,39996)`, açı tabloları init'te detMath ile) × yayılma (Sıkı 0,5 / Geniş 1,0). Ağırlıklar: ayrılma (r: Sıkı 1,2 m / Geniş 2,0 m) 1,5; hizalama 0,8; kohezyon 0,6; hedef çekimi 1,0; şahin/fırtına kaçışı 2,5. Max hız lider ×1,25, ivme ≤ 25 m/s². Sonuç: sürü "kuyruklu yıldız" akışıdır; lider daire çizerse akış halka olur → KUŞATMA'nın fiziksel temeli.

**Yabani kuşlar:** 5–30'luk gruplar, seed'li dolaşan hedef noktalı boids. Bir kuş, bir sürünün liderine `R_f(n) = k·√n` (Geniş k=1,35, Sıkı k=0,8) içinde ise ve daha yakın lider yoksa o sürüye katılır (0,3 s renk geçişi).

**Dönüşüm algoritması (temas savaşı):** frontier = r_conv = 6 m içinde farklı sahipli (≠0) komşusu olan kuş. Yalnız frontier kuşlar için:
```
K(d) = (1 − d²/r²)²                       // poly6 benzeri çekirdek
w_f  = Σ_{j∈N(i), owner_j=f} K(|x_i−x_j|) · s_j     // s_j = 1,25 (sahibi Sıkı'da) : 1,0
m    = argmax_f w_f
eğer m ≠ owner_i ve w_m > 1,15·w_own:
   p = clamp(4,0 · (w_m − w_own)/(w_m + w_own) · Δt, 0, 0,5)
   rngConv.next() < p ise owner_i = m ; lastConv_i = tick
```
Kuşlar indeks sırasıyla işlenir, sahiplik değişiklikleri tick sonunda uygulanır (sıra bağımlılığı yok). Lider asla dönüşmez. Sonuç: cephe hattı ilerleyen renk dalgaları, eşit güçlerde halat çekme.

**KUŞATMA tespiti (10 Hz, her 3. tick):** aday çift = A sürüsünün ≥24 kuşu B liderinin 40 m içinde. B liderinin çevresinde `r ∈ [max(4, 0,6·R_B), 35] m` halkasındaki A kuşlarının açısı (detMath atan2) 36 kutuya (10°) dağıtılır; kutu ≥2 kuşla "dolu". Kapsama = dolu × 10°. Koşul: **kapsama ≥ 300°** ve B kuşlarının ≥%70'i A halkasının ortalama yarıçapı içinde, **0,5 s kesintisiz**. Tetiklenince B'nin tüm kuşları 1,5 s içinde A'ya geçer: halka dışından içe mesafe sırasına göre `t_k = 1,5·rank_k/N_B` (deterministik takvim). Sinyal anı: kamera ve ses bu olaya bağlanır (§2).

**Eleme:** B'nin takipçisi 0 iken bir düşman çekirdeği B liderine değerse (düşman lider ≤3 m veya tek sürüden ≥6 kuş ≤3 m) B elenir; lider kuş arenadan uçup gider (zarar tasviri yok).

**Kartopu karşıtı:** Doğan'lar 60. sn'den itibaren 1–3 adet; hedef = en büyük sürünün kenar kuşu (centroid'e en uzak, görüş içinde); lider-tahminli takip; 1,5 m'ye girince kuş **ürküp kaçar** ve yabani olur (yenme/yaralanma yok), doğan başına 0,8 s bekleme. Rüzgâr: iki seed'li gezici dalganın toplamı. Fırtına bulutu: hareketli disk; içinde ayrılma ×3 ve seed'li dürtüler; liderinden 2·R_f uzakta 3 s kalan kuş yabanileşir. Gün batımı halkası: son 45 s'de yarıçap 300 → 110 m; dışarıdaki kuşlar içe itilir, dışarıdaki lider saniyede 2 takipçi kaybeder (yabanileşir).

**Bot yapay zekâsı (utility AI):** 5 Hz, sürü indeksine göre kademeli (tick % 6). Eylemler ve fayda:
```
U_topla(g)  = n_g/(d_g+40) · (1−T) · greed
U_saldır(e) = clamp((n−n_e)/n,0,1) · e^(−d_e/120) · aggr
U_kuşat(e)  = [n ≥ 1,6·n_e ∧ n ≥ 80] · e^(−d_e/80) · ring       // hedef liderin etrafında r = R_e+6 m yörünge
U_kaç       = T · (1 − courage)       // T: büyük sürü/doğan/fırtına tehdidi 0..1
U_merkez    = halka dışı mesafe oranı
U_fırsat(e) = son 3 s'de e'nin kaybettiği kuş / n_e · opp
```
argmax + mevcut eyleme +0,15 histerezis, ≥1 s bağlılık. Sıkı: temasta ve Nefes>25, ya da kaçışta ve Nefes>40. Tepki gecikmesi tamponu ve seed'li yön gürültüsü. Botlar oyuncunun girdisini okumaz, aynı fizik/limitlerle oynar.

| Kişilik | greed | aggr | courage | ring | opp | tepki |
|---|---|---|---|---|---|---|
| Toplayıcı | 1,4 | 0,4 | 0,5 | 0,3 | 0,2 | 250 ms |
| Avcı | 0,7 | 1,5 | 0,9 | 0,6 | 0,4 | 180 ms |
| Ürkek | 1,1 | 0,2 | 0,2 | 0,1 | 0,3 | 300 ms |
| Kuşatıcı | 0,8 | 0,9 | 0,7 | 1,6 | 0,3 | 200 ms |
| Fırsatçı | 0,9 | 0,6 | 0,6 | 0,6 | 1,6 | 220 ms |

Lig ölçeği: Bronz tepki +150 ms, gürültü ±15°, ring ×0,5; Elmas tepki −50 ms, gürültü ±4°, ring ×1,2. Lobide ve HUD'da "Yapay zekâ sürüleri" etiketi.

**Kuş render'ı:** tek `InstancedMesh` (sim kuşları) + ayrı lider mesh'i. Instance attribute: prevPos.xz, currPos.xz, heading, ownerIdx (palet dokusu 16×1), lastConv, faz. Vertex shader: kanat vertex'leri `wingWeight` ile gövde ekseni etrafında `θ = A·sin(ωt+faz)·flapMask` döner (ω 7–12 Hz hıza ve Sıkı'ya bağlı; flapMask çırp-süzül döngüsü); irtifa `12 + 6·sin(0,7t + faz) + sürü dalga ofseti`. Renk: `mix(sığırcık tabanı, sahip rengi, 0,65)` + sahip renginde rim; dönüşüm flaşı `exp(−(tick−lastConv)/6)`. Arka plan murmuration'ları tamamen GPU'da analitik akış alanıyla (CPU maliyeti 0, sim dışı). Orta+: kuşlar 256² "sahiplik yoğunluğu" RT'sine nokta olarak basılır → su yüzeyi sürü renklerini yansıtır ve yumuşak gölge düşer.

#### 4.G.11 Çevrimiçi (sonra) notları

- **KANAT ana oyun:** tek oyunculu kalır; liderlik tablosu sunucuda girdi akışının yeniden simülasyonuyla doğrulanır (hile koruması bedava). Hayalet kodları sunucuda kısa koda dönüşür. Canlı "hayalet yarışı": rakipler etkileşimsiz, 10 Hz snapshot + interpolasyon.
- **SÜRÜ.io:** 16 oyunculu lockstep mobilde kırılgan → sunucu-otoriter 30 Hz sim. İstemci komutu: `{flockId, steerX:int8, steerZ:int8, tight:bit}`. Snapshot: lider durumları, sürü sayıları, 32×32 sahiplik ızgarası (delta sıkıştırma), olaylar (dönüşüm grupları, KUŞATMA, eleme). İstemci takipçileri bu özetle koşullanan kozmetik boids ile çizer. Bu yüzden renderer şimdiden `FlockRenderSource` arayüzünü okur (çevrimdışı: tam sim; çevrimiçi: yaklaşık), `SuruSim.step(commands[])` saf kalır, `SuruSnapshot` üretir.

#### 4.G.12 Başlıca riskler

| Risk | Önlem |
|---|---|
| Karo URL'si/ağ sorunu | Bake bir kez, çıktılar repoda; `--synthetic` geliştirme modu |
| Gerçek veri yakında "yumuşak" | Erozyon + 2 oktav ortak detay + prop'lar + detay normali; 3 m'den çekilen contact sheet ile kanıtla |
| V8–JSC sapması | detMath, Float32 depolama, `Math.sin` yasak (lint kuralı), Playwright Chromium + WebKit çapraz test |
| Adreno 618'de fragment maliyeti | Kademeli projeksiyon, 600 m sonrası tek macro örnek, bake gölge/AO |
| Bulut/partikül overdraw | Sprite sayısı ve ekran kaplama tavanı; bulut içinde uzak impostor'ları kapat |
| SÜRÜ CPU (yoğun Sıkı Dizi) | 32 aday/7 komşu sınırı, frontier'a özel dönüşüm, 10 Hz KUŞATMA; gerekirse sim Web Worker'a (transferable buffer ping-pong; SharedArrayBuffer'a güvenme) |
| Shader derleme takılması | Yüklemede `renderer.compile` + tüm varyantlarla ısınma karesi; `KHR_parallel_shader_compile` varsa kullan |
| Günün Rotası'nın uçulamaz çıkması | Sunmadan önce bot doğrulaması + deterministik yeniden deneme |

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

Kural: kademeler yalnız görseli değiştirir. Çarpışabilir nesne kümesi, uçuş fiziği, yakınlık sorgusu, SÜRÜ.io'daki 1.500 sim kuşu ve tüm tick hızları her kademede aynıdır.

**KANAT ana oyun**

| Ayar | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| CDLOD düğüm ızgarası | 17² | 33² | 33² | 33² (+1 seviye derin) |
| LOD0 yarıçapı (2 m aralık) | 100 m | 180 m | 300 m | 450 m |
| Arazi görüş mesafesi (sisle kapanır) | 12 km | 18 km | 25 km | 40 km |
| Arazi projeksiyonu | düzlem + dikey geçiş | biplanar | triplanar | triplanar + height-blend detay normali |
| Fragment doku örneği (yakın, en fazla) | 4 | 7 | 10 | 12 |
| Macro colormap | 1024² | 2048² | 2048² | 2048² |
| Ağaç mesh LOD mesafesi | 60 m | 100 m | 160 m | 250 m |
| İmpostor mesafesi (sonrası colormap) | 800 m | 1,5 km | 2,5 km | 4 km |
| Zemin süsü (çarpışmasız) yoğunluğu | 0 | 0,3 | 0,7 | 1,0 |
| Balon LOD0 mesafesi (40'ı da hep var) | 150 m | 300 m | 500 m | 800 m |
| Bulut impostor / katman | 40 / 1 | 80 / 2 | 150 / 2 | 250 / 3 |
| Dinamik gölge | oyuncu blob decal | CSM 1 kademe 1024, 80 m | CSM 2 kademe 2048 | CSM 3 kademe 2048 |
| Arazi gölgesi | bake | bake | bake | bake + temas gölgesi |
| Su (Likya, Pamukkale havuzları) | cubemap yansıma + 1 normal | + derinlik rengi + kıyı köpüğü | + ikinci normal katmanı + kostik | + yarım çözünürlüklü düzlemsel yansıma (gök + uzak arazi) |
| Partikül sprite tavanı | 300 | 800 | 1.500 | 3.000 |
| Hız çizgisi | 60 | 120 | 200 | 300 |
| Post | tek uber pass: AgX/LUT + vinyet + gren | + bloom (yarım çöz., 4 mip) | + güneş ışınları + radyal hız bulanıklığı | + SMAA, Foto Modu'nda DOF |

Hedef kare (Mi 9T, 60 fps, 16,6 ms): CPU — sim+skor+yakınlık ≤1,5 ms, CDLOD seçimi ≤0,5 ms, sahne güncelleme/culling ≤2 ms, render gönderimi ≤3 ms; GPU — arazi ≤5 ms, bitki/prop ≤2,5 ms, gök/bulut ≤1,5 ms, post ≤2,5 ms, partikül ≤1 ms. Bunları gerçek cihaz yoksa SwiftShader'da göreli ölç, draw call/tri/doku sayılarıyla kanıtla. Düşük'te hedef ≤45 draw call ve ≤140k tri (global tavan 80 / 150k).

**SÜRÜ.io**

| Ayar | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| Sim kuşu (sabit) | 1.500 | 1.500 | 1.500 | 1.500 |
| Kuş mesh tri | 12 | 24 | 40 | 60 |
| Arka plan murmuration (yalnız görsel) | 0 | 600 | 1.500 | 3.000 |
| Su | gökyüzü cubemap + analitik güneş parıltısı | + sahiplik yoğunluğu RT (256²) renk/gölge | + RT bulanıklaştırma + dalga normalleri | + kuşların aynalanmış instanced yeniden çizimi (yarım çöz.) |
| Lider parlaması | additive hale sprite | + bloom | + bloom | + bloom + aura partikülleri |
| Uzak kıyı/sazlık | 1 katman billboard | 2 katman | 3 katman + rüzgâr salınımı | + sis hacmi kartları |

**Sıcak noktalar ve çözümler**
1. **SÜRÜ sim CPU:** en yoğun senaryoda tick ≤4 ms (Mi 9T), yani kare başına ortalama ≤2 ms. Sıcak döngüde tahsis, closure, Map yok; tüm diziler önceden ayrılır. Bütçe aşılırsa sim Worker'a taşınır (mimari buna hazır).
2. **Arazi fragment:** kademeli örnek sayısı tablodaki tavanı geçmez; `discard` yok (Adreno'da early-Z'yi bozar).
3. **Bulut içi geçiş (Karadeniz):** tam ekran katman sayısı ≤2; içerideyken uzak impostor çizimi kapalı.
4. **Kaza replay'i ve Foto Modu:** ek render pass'i yok; aynı sahne farklı kamera. Kilitli 30 fps yok, her şey 60 fps hedefler (pil modu ortak çekirdekte).
5. **GC:** uçuş sırasında kare başı tahsis 0 bayt (Chrome heap profili ile kanıtla).
6. **Bellek:** dünya başına GPU dokusu Yüksek'te ≤60 MB (yükseklik R32F 4+1 MB, colormap ~4 MB, splat 4 MB, katman dizisi ~11 MB, impostor atlasları ~8 MB, bulut atlası ~4 MB). Dünya değişince önceki dünyanın kaynakları `dispose` edilir.

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
#   indir → games/kanat/.cache/ altına (gitignore) aç → ./blender -b --python-expr "import bpy; print(bpy.app.version_string)"
#   Kısıtlar: GPU yok (Cycles CPU; bake çözünürlüğünü ve sample'ı küçük tut), EEVEE headless çalışmayabilir.
# Node araçları (games/kanat içinde devDependency olarak, tam sürüm):
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

Öncelik: önce Kapadokya'yı kahraman kalitesine getir (tüm hattı doğrular), sonra diğer dünyalar aynı hattan akar. Yer tutucu kalite kabul edilmez; bir asset yetişmezse o içerik kapsam dışı bırakılır, çirkin hâli gönderilmez.

| Asset | Adet | Üretim | Kalite notu | Kademe |
|---|---|---|---|---|
| Yükseklik haritaları (çekirdek + uzak) | 5 dünya × 2 | Gerçek veri: AWS Terrain Tiles bake (4.G.1) | Erozyon geçişi; ufuk kenarı görünmez | Tek veri, tüm kademeler |
| Pamukkale traverten yaması | 1 | Prosedürel basamak fonksiyonu, 1 m | Havuz suyu ayrı mesh | Tek |
| Splat/normal/gölge-AO/macro colormap | 5 × 4 | Bake script | Colormap "uydu fotoğrafı" zenginliğinde | Colormap Düşük 1024² |
| Arazi malzeme setleri | ~18 (4/dünya, ortaklar paylaşılır) | ambientCG / Poly Haven CC0 (kaya, tüf benzeri kumtaşı, kireçtaşı, kum, çam iğnesi, çimen, yosun, kar, buz, volkanik kaya, beyaz kalsit) → renk düzeltme, KTX2 dizi | Lisans her biri için doğrula | 1K (Düşük/Orta 512–1K), 2K Ultra |
| Peri bacası | 6 profil + 2 şapka | Motor içi lathe + noise | Görsel = çarpışma ±0,4 m | 2 LOD |
| Sıcak hava balonu | 1 jeneratör, 12 desen paleti | Motor içi lathe + shader desen | Brülör ışığı, sepet detayı | 2 LOD |
| Ağaçlar (kavak, kızılçam, ladin, ardıç) | 4 tür × 2 varyant | Blender headless Python (gövde + yaprak kartları) veya motor içi uzay-kolonizasyon; yaprak dokuları CC0 ya da prosedürel | ≤600 tri; oktahedral impostor atlası build'de | Mesh + impostor |
| Yayla evi | 4 parametrik | Blender Python, ahşap doku ambientCG | Çatı saçağı, taş temel | 2 LOD |
| Gulet | 2 | Blender Python loft gövde + direk | Suda yavaş sallanma | 2 LOD |
| Antik kalıntılar | ~10 parça | Lathe sütun + kırık duvar + tiyatro yayı | Jenerik, gerçek yapıyı kopyalama iddiası yok | 2 LOD |
| Buz kornişi, şelale | prosedürel | Sırt tespiti + ekstrüzyon; akış dokulu şerit | Kar tozu emisyonu sırttan | — |
| Pilot + wingsuit | 1 gövde, 3 LOD | CC0 insan tabanı (ör. Quaternius — lisansı doğrula) + Blender'da kanat zarı; vertex shader'da kumaş titreşimi | Yüz görünmez (kask) | 3 LOD |
| Wingsuit desenleri | ≥24 | Shader: patternId + 3 renk (çizgi, chevron, gradyan, kilim motifi, takımyıldız…) | Doku belleği ≈0 | Tek |
| Paraşüt (ram-air) | 1 | Prosedürel 9 hücreli kanopi + açılma animasyonu | — | 2 LOD |
| Sığırcık / lider / doğan | 3 mesh | Elle yazılmış vertex dizisi veya Blender script; `wingWeight` attribute | Lider farklı silüet + parlama | 12–60 tri |
| Bulut sprite atlası | 16 bulut, 2048² | Offline ışın yürütme script'i (Node/headless WebGL) | Yoğunluk + 3 yönlü ışık RGBA | 1K Düşük |
| VFX flipbook'ları | 8 (toz, kar tozu, su sıçraması, sis, brülör alevi, şelale buharı, bulut tutamı, tüy-siz "ürkme" efekti) | Prosedürel noise render, 4×4 / 8×8 | Premultiplied alpha | Yarı çöz. Düşük |
| Gökyüzü | 5 + SÜRÜ gün batımı | Analitik model, yüklemede cubemap bake | HDRI gerekmez; menü pilot vitrini için 1K CC0 HDRI opsiyonel | 128²–256² |
| UI ikonları | ~40 | Elle SVG (kapı, termal, balon, kartpostal, rütbe, lig rozetleri) | Tek çizgi kalınlığı sistemi | SVG |
| Dünya kartları/kartpostal görselleri | 5 + ~25 | Motorda render-to-PNG (Ultra ayarıyla, build zamanında) | Gerçek oyun görüntüsü | KTX2/WebP |
| Fontlar | §3'te seçilen | Google Fonts (OFL), Türkçe glifli; pyftsubset ile TR+EN alt küme, woff2 | ğ ş ı İ test metni | — |
| SFX | ~35 | Web Audio prosedürel (rüzgâr, vuuş, kapı çanı, sıyırma, paraşüt açılışı, iniş, brülör, kanat hışırtısı yoğunluk katmanı, dönüşüm "tık" dalgası, KUŞATMA akoru); gerekirse yalnız CC0 kayıt (lisansı tek tek doğrula) | Sıfır kırpılma, LUFS dengesi | — |
| Müzik | 5 dünya teması (3 katman: sakin/uçuş/yoğun) + SÜRÜ.io 3 dk gün batımı parçası + menü | Kodla sentez (OfflineAudioContext) → AAC/M4A (+MP3 yedek; iOS WebView codec desteğini doğrula) | Ney/bağlama esintili sentez; mevcut eser kopyalanmaz | Tek |

---

## 7. Mobil uygulama entegrasyonu (3 oyunda birebir aynı sözleşme)

### 7.1 Çıktılar
- **`dist/web/`: birincil çıktı.**
  - Çok dosyalı, göreli yollu, hash'li asset'ler. Çalışma zamanında hiçbir CDN'e bağlı değil; tamamen offline çalışır.
  - Kullanım yolları:
    - (a) Herhangi bir statik HTTPS hosta koyup URL ile açmak. Tavsiye edilen yol budur.
    - (b) Uygulama paketine gömmek. Android'de `WebViewAssetLoader` ve `https://appassets.androidplatform.net`. iOS'ta `WKURLSchemeHandler` veya yerel sunucu. Flutter'da `InAppLocalhostServer`.
  - `file://` üzerinden fetch, WASM ve KTX2 sorunlu olabilir. Bu notu INTEGRATION.md'ye yaz.
- **`dist/single/kanat.html`: tek dosya** (`vite-plugin-singlefile 2.3.3`; WASM, KTX2 ve ses data URL olarak gömülü).
  - Toplam ≤ 25 MB ise **tüm oyunu** içerir.
  - Aşarsa ana mod ve en az bir ek mod tek dosyada olur; kalan paketler aynı klasördeki `packs/` altından yüklenir. Bunu INTEGRATION.md'de açıkça anlat.
  - Tek dosyanın `file://` üzerinden headless Chromium'da açılıp oynandığını testle kanıtla.
- **`dist/web/host-demo.html`:** Uygulama yerine geçen bir test sayfası. Oyunu iframe'de açar, köprü mesajlarını loglar, pause, resume, mute, dil ve kalite butonları vardır. Köprü e2e testleri bunu kullanır.

### 7.2 Köprü protokolü (`src/bridge/GameBridge.ts`)
**Zarf:** `{ "v": 1, "game": "kanat", "type": "<tip>", "id": "<opsiyonel istek id>", "payload": { ... } }` (JSON string).

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

**Arazi ve veri**
1. Terrarium çözümleme birim testi: (128,0,0) → 0 m; (0,0,0) → −32.768 m; (255,255,255) → 32.767,996 m.
2. Referans yükseklik testi: Erciyes çekirdeğinin maksimumu ~3.900 m civarı (±100), Kaputaş kıyı çizgisi ~0 m, seçilen Karadeniz noktası ve Pamukkale için bağımsız bir kaynaktan alınan değer ±60 m. Başarısızsa koordinat/ölçek hatası var demektir.
3. **Ufuk testi:** 5 dünyada rota boyunca ve serbest uçuş sınırlarında 200 rastgele kamera; arka plan ve etekler hata ayıklama modunda macenta → macenta piksel sayısı = 0. Aynı testi çatlak için (kamera süpürmesi, 300 kare) uygula: 0.
4. CPU–GPU yükseklik uyumu: GPU'dan okunan (render-to-texture) LOD0 yükseklikleri ile `H(x,z)` farkı ≤ 5 cm (1.000 nokta).

**Yakınlık ve çarpışma**
5. Hızlı `query` ile kaba-kuvvet referansı (40 m içindeki tüm üçgenlere ve SDF'lere kesin uzaklık) 10.000 rastgele noktada: d<7 m için hata ≤0,5 m, d<30 m için ≤1,5 m; kesin d<0,6 m iken "güvenli" sonucu 0 kez.
6. **Tünelleme:** maksimum hızda 10.000 rastgele dalış/teğet uçuş (arazi, peri bacası, balon, ağaç gövdesi) → kesin geometriye her temas kaza olarak yakalanır; içinden geçiş 0.
7. Çarpan sınırları: d = 29,9 → ×1; 14,9 → ×2; 6,9 → ×3; 2,9 → ×5; su üstünde ≤ `flatSurfaceMaxMult`.
8. Sıyırma tek geçişte 1 olay; kapı geçişi 1 olay; iki balon arasından geçen betikli yol → 1 İlmek, çevresinden dolanan yol → 0.

**Uçuş modeli**
9. Nötr girdiyle 42 m/s'den 20 s: hız 38–46 m/s, süzülme oranı 4–5.
10. Tam itiş: 220–232 km/sa'ya ulaşır, 235'i asla geçmez. Tam çekiş 64 m/s'den: kazanılan irtifa `(V1²−V2²)/(2g)`'nin %75–95'i.
11. Stall: düşük hızda sürekli tam çekiş → NaN yok, V ≥ 25 m/s, burun düşer, kaza yok.
12. **Enerji özelliği testi:** 1.000 rastgele girdi akışında termal/yamaç dışında `Ė ≤ 0` (enerji yaratılmaz).

**Determinizm ve kodlar**
13. 20 rota × uzman bot girdisi: her 60 tick'te durum hash'i Chromium (V8) ve WebKit (JSC) Playwright koşularında birebir aynı; Düşük ile Ultra kademede de aynı (aynı girdi → aynı skor).
14. Hayalet kodu: 1.000 rastgele akış encode→decode birebir; 120 s'lik tipik uçuş ≤3.000 karakter; tek karakter bozulması → crc hatası, TR/EN mesaj; farklı SIM_VERSION → sürüm mesajı; çökme yok.
15. Günün Rotası: art arda 365 tarih → hepsi geçerli, uzman bot ≥1 yıldızla bitirir; aynı tarih iki motorda aynı rota hash'i.

**Bot autoplay politikaları**
- *Dikkatli bot:* ideal çizgiyi PD kontrolle izler, yüzeyden +18 m ofset → 20 rotanın tamamını bitirir, ≥1 yıldız.
- *Uzman bot:* ofset +4 m, termalleri kullanır, İlmek arar → her rotada 3 yıldız (3 yıldız eşiği ≤ uzman skoru × 0,95; 1 yıldız ≤ dikkatli bot skoru).
- *Gürültü botu:* rastgele girdi, 1.000 koşu → istisna/NaN 0, her kaza < 1 s içinde yeniden denenebilir.
- Rota süresi: uzman botla her rota 60–120 s.
16. Kaza akışı: kaza → replay ≤100 ms içinde başlar; "tekrar" → kontrol edilebilir uçuş ≤1 s (`window.__game` zaman damgalarıyla).
17. Bütçe: her dünyada 10 sabit kamera yer imi × 4 kademe → `renderer.info` draw call/tri global tavanların altında; doku belleği tahmini kademe bütçesinde.
18. Sızıntı: 20 ardışık yeniden deneme ve 5 dünya geçişi sonrası JS heap ve GPU kaynak sayısı artışı ≤%5.

**SÜRÜ.io**
19. Korunum: her tick Σ sahiplik = 1.500 (100 tam tur, AI vs AI).
20. Uzamsal hash: 1.000 rastgele dağılımda komşu kümeleri kaba-kuvvetle aynı (aday sınırı devre dışıyken).
21. Determinizm: 16 bot (oyuncu yuvası dahil) ile 3 dk tur → final sahiplik hash'i V8/JSC ve kademeler arasında aynı.
22. Dönüşüm: temastaki 100'e 50 kuşta büyük taraf 100 seed'in ≥%90'ında cepheyi kazanır; eşit güçlerde kazanma oranı %50 ±10.
23. KUŞATMA: B liderinin etrafında 15 m yarıçaplı 60 kuşluk A halkası, içinde 40 B kuşu → 0,5 s'de tetiklenir, 1,5 s ±1 tick'te tüm B kuşları A'ya geçer; 90° boşluklu halka (270°) → tetiklenmez. Betikli lider yörüngesi (n ≥ 120) bir turda ≥300° kapsama üretir.
24. Doğan: hedef her zaman en büyük sürü (erişilebilir kenar kuşu varsa); kaçırılan kuş `owner=0` olur ve yaşar.
25. Gün batımı halkası: t=180 s'de yarıçap 110 m; bitişten 3 s önce halka dışında lider yok (botlar).
26. Denge (500 AI-only tur): her kişiliğin kazanma oranı %10–30 aralığında; 1. dakikada en büyük olan sürü sonda ≤%65 oranında kazanır (kartopu kontrolü). "Ortalama oyuncu" botu Bronz'da %35–50, Elmas'ta %8–15 kazanır.
27. Performans: Node'da en yoğun senaryoda tick medyanı ≤1,0 ms (Mi 9T için ~4× pay).
28. Renk körlüğü: kontak anı ekran görüntüleri deuteranopi/protanopi/tritanopi simülasyonundan geçirilir; komşu sürü renkleri arası ΔE2000 ≥ 15 ve lider işaret şekilleri ayırt edilebilir.

**Görsel kontroller**
- 3 m'den uçurum yakın çekimi: Laplasyen varyansı (keskinlik) eşik üstü, dik yüzeyde doku gerilmesi yok (triplanar/biplanar kanıtı).
- Sis tutarlılığı: aynı mesafedeki impostor ve arazi piksellerinin sis rengi farkı küçük (ΔE ≤ 5).
- Kapadokya giriş karesinde görünen balon sayısı ≥ 25.

**Contact sheet çekim listesi** (her biri Düşük ve Ultra yan yana)
- *Her dünya:* (1) başlangıç geniş vista, (2) 180 km/sa'da yüzeyden 5 m takip kamerası, (3) simge nesneye sıyırma (peri bacası / yalıyar / ladin / buz kornişi / traverten), (4) kapı geçişi, (5) termal sütunu, (6) Kapadokya'da Balon İlmeği, (7) paraşüt ve iniş hedefi, (8) kaza slow-mo replay karesi, (9) Foto Modu kartpostal karesi, (10) hata ayıklama: rota çizgisi + yakınlık ısı haritası yukarıdan.
- *Diğer:* canlı 3D ana menü, Günün Rotası paylaşım kartı, Hayalet Düello (hayalet + zaman farkı HUD'u), sonuç ekranı.
- *SÜRÜ.io:* tur başı genel bakış, temas savaşı renk dalgası, KUŞATMA 0,0 / 0,75 / 1,5 s, doğan kovalaması, fırtına bulutu, kalan 30 s'de gün batımı halkası, sonuç ekranı, renk körlüğü simülasyonlu temas karesi.

---

## 10. Cila listesi (vakit kalırsa, öncelik sırasıyla)

1. Kapadokya ilk 30 saniyesi: balon zarflarında güneş parlaması, brülör ışığının zarfı içten aydınlatması, altın sisin vadiden yavaşça sızması — ilk izlenim filmi kusursuz.
2. Rüzgâr ve yakınlık ses katmanları metreye göre ince ayar; peri bacası yanından geçişte Doppler'lı stereo "vuuş".
3. Sıyırma geri bildirimi: kayadan kopan toz/kar şeridi + kısa haptik tık + 60 ms'lik hafif zaman yavaşlaması.
4. Wingsuit kumaş titreşimi ve yüksek G'de kanat ucu buhar izleri.
5. Karadeniz bulut delme anı: beyazlık → ladin ormanı ve şelalenin açılması (ses filtresi açılmasıyla senkron).
6. Hayalet görselliği: yarı saydam "aurora" siluet + ince iz + HUD'da canlı zaman farkı (+0,4 s).
7. Sonuç ekranında yukarıdan mini rota haritası: çizgi yakınlık çarpanına göre renkli (çok paylaşılabilir).
8. KUŞATMA sinematiği: kamera geri çekilir, 0,5 s slow-mo, yükselen koro akoru, renk kaskadı halkadan içe akar.
9. SÜRÜ.io su yüzeyinde sürü renklerinin yansıması ve murmuration "dalga" atımları (yön değişiminde hizalama dalgası).
10. Paraşüt açılış sekansı: kamera savrulması, kanopi şişme animasyonu, sesin aniden sakinleşmesi.
11. Mükemmel iniş: hedef halkada kısa slow-mo + yerel toz halkası + rozet damgası.
12. Likya kıyısı: sığ kumda animasyonlu kostik + kıyı köpüğü + guletlerin yanından geçişte su sıçraması.
13. Erciyes: sırtlardan savrulan kar tozu, alçak güneşte kar parıltısı, ince güneş halesi.
14. Pamukkale: havuzlarda gökyüzü aynası ve gün batımı renk geçişi, traverten üzerinde ıslak parlaklık.
15. Foto Modu: kompozisyon kılavuzları, lens ön ayarları, DOF, hafif gren; kartpostal bulununca küçük "pul" animasyonu.
16. Ana menü: uçurum kenarında rüzgârda dalgalanan wingsuit'li pilot, kozmetik değişiminde döner tabla.
17. Yükleme ekranında build zamanı render'lanmış dünya panoramaları ve ipuçları.
18. Günün Rotası için hafif hava varyantları (sabah sisi, ılık rüzgâr) — yalnız görsel + rüzgâr verisi, seed'e bağlı.
19. SÜRÜ.io sürü kanat sesi yoğunluk katmanı (sürü büyüdükçe dolgunlaşan hışırtı).
20. Haptik desenlerin cihaz başına ince ayarı (host köprüsü varsa).

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

- [ ] 5 dünyanın yükseklik verisi gerçek AWS Terrain Tiles'tan bake edildi; bake script'i tek komutla yeniden çalışıyor; seçilen merkez koordinatlar ve `verticalScale` değerleri `world.json`'da; Terrain Tiles atfı CREDITS.md'de ve Ayarlar → Hakkında'da.
- [ ] Referans yükseklik testleri (9.G-2) geçiyor.
- [ ] Ufuk ve çatlak testlerinde macenta piksel = 0.
- [ ] 20 rota oynanabilir; uzman botla her biri 60–120 s; dikkatli bot hepsini bitiriyor; uzman bot her rotada 3 yıldız alıyor.
- [ ] Yakınlık sorgusu doğruluk testi ve 10.000 uçuşluk tünelleme testi geçiyor (0 kaçak).
- [ ] Uçuş modeli testleri (9.G-9…12) geçiyor; kararlı uçuşta hız 110–230 km/sa aralığında; stall hiçbir zaman anlık kaza üretmiyor.
- [ ] Aynı girdi akışı V8 ve JSC'de, Düşük ve Ultra'da aynı durum hash'ini ve aynı skoru veriyor (20 rota + 10 SÜRÜ seed'i).
- [ ] Hayalet kodu roundtrip, bozuk kod ve sürüm uyuşmazlığı testleri geçiyor; 120 s'lik uçuş kodu ≤3.000 karakter (ölçülen değer raporda).
- [ ] Günün Rotası 365 ardışık tarihte geçerli ve tarih başına tek, deterministik.
- [ ] Kaza → yeniden deneme ≤1 s; replay ≤100 ms içinde başlıyor.
- [ ] Her dünyada 10 yer imi × 4 kademe draw call/tri/doku bütçeleri içinde (ölçüm tablosu raporda).
- [ ] Uçuş sırasında kare başı JS tahsisi ~0; 20 deneme + 5 dünya geçişinde sızıntı ≤%5.
- [ ] SÜRÜ.io: 1.500 sim kuşu tüm kademelerde sabit ve korunumlu; tur 3:00; son 45 s'de halka 300 → 110 m; 11–15 bot sürü 5 kişilikle ve "Yapay zekâ sürüleri" etiketiyle.
- [ ] KUŞATMA (≥300° kapsama, 0,5 s tutma, 1,5 s kaskad) ve dönüşüm testleri geçiyor; 270° halka tetiklemiyor.
- [ ] Doğanlar hiçbir kuşa zarar vermiyor (kaçırılan kuş yabani olarak yaşıyor); denge testleri (9.G-26) hedef aralıklarda.
- [ ] SÜRÜ sim tick medyanı Node'da ≤1,0 ms (en yoğun senaryo).
- [ ] Renk körlüğü ayırt edilebilirlik testi geçiyor.
- [ ] 9.G'deki tüm contact sheet kareleri Düşük ve Ultra için üretildi ve rapora eklendi.
- [ ] 1.000 gürültü botu koşusunda konsol hatası, istisna ve NaN = 0.

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
