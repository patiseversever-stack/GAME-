# SÜRÜ.io — Karar günlüğü (suru ajanı)

Kaynak önceliği (brif başı): oyun kuralı/denge değeri → §2.6/§2.10; algoritma/teknik → §4.G.10; ortak sözleşme → ortak çekirdek. Üreticinin F1 hükümleri (`src/content/meta/rulings.ts` S-01…S-14, `docs/decisions/f1-review.md` Ü-9) bu belgenin üstündedir; aşağıdaki kararlar onlarla birebir uyumludur. Tüm sayılar tek veri dosyasında: `src/modes/suru/sim/config.ts` (`SURU`).

## 1. Çelişki kararları (§2.6 ↔ §4.G.10)

| Konu | §2.6 | §4.G.10 | Karar |
|---|---|---|---|
| Gün Batımı Halkası (S-05) | çap 600 → 200 m | yarıçap 300 → 110 m | **Yarıçap 300 → 110 m**, 2:15 → 3:00 doğrusal. Test ve bitti kriteri bunu ölçüyor; zaman çizelgesi tick sonunu anlatır, t = 180 s'de tam 110 m. |
| Nefes (S-01) | −14/s, +22/s, kilit 25 | −20/s, 0,5 s sonra +12/s, kilit 30 | **−14/s, +22/s (gecikmesiz), kilit 25.** Nefessizken basılı tutmak yön verir ama Sıkı bonusu yoktur; Nefes Geniş'te ya da nefessizken dolar, fırtınada dolmaz. |
| Lider hızı (S-02) | Sıkı +%25, Geniş −%10, Yalnız +%30 | temel 12 m/s, Sıkı ×1,3 | Temel 12 m/s; Sıkı ×1,25, Geniş ×0,9, Yalnız ×1,3 (5 s). Hız değişimi 10 m/s² ile yumuşar. |
| Dönüş hızı (S-03, S-14) | 140°/s·clamp(√(20/N), 0,35, 1) | 3/√max(1,n/40), alt 0,6 | **§2.6 formülü** (N = takipçi + lider). Taban 0,35; 500 turluk denge %65'i tutmazsa 0,15 (bkz. §4 sonuçlar). |
| KUŞATMA geometrisi (S-04) | [6, 30] m, dilimde ≥2 kuş + pay ≥%70, 0,6 s | [max(4, 0,6·R_B), 35] m, ≥300°, B'nin ≥%70'i içeride, 0,5 s | Algoritma §4.G: halka [max(4, 0,6·R_B), 35] m, 36 × 10° dilim, ≥30 dolu dilim, B takipçilerinin ≥%70'i A halkasının ortalama yarıçapı içinde, **0,5 s** kesintisiz (10 Hz kontrol). Dilim "dolu" eşiği **≥1 kuş + halkada toplam ≥30 kuş**: 9.G-23'ün 60 kuş/15 m halkasında eşit aralıklı ≥2 kuş en fazla 240° verir. |
| Kaskad | "1,5 s içinde dalga" | `t_k = 1,5·rank/N_B` | Dıştan içe mesafe sırası, **k = 1…N_B** (son kuş tam 1,5 s'de; test ±1 tick). Kaskad süren sürü kuş geri kazanamaz (yeni dönen kuşların B çekirdeğinde geri dönmesini önler). |
| Yabani yakalama (S-07) | grup merkezi r + 4 m → grup katılır, k 0,6/1,3 | kuş başına R_f = k√n (1,35/0,8) | §2.6: **grup bütün olarak katılır**, eşik r + 4 m (r = k√N, Sıkı 0,6 / Geniş 1,3). Ek (çelişmez): grubun herhangi bir kuşu bir takipçiye Geniş'te 3,5 m, Sıkı'da 1,5 m yaklaşırsa da grup katılır — "Geniş'te yakalama yarıçapı büyür" böyle okunur. |
| Temas savaşı (S-08) | ağırlık Sıkı ×1,6, lider ≤12 m ×1,3, D_B ≥ 0,62, λ = 2,2(D_B − 0,5) | poly6 çekirdek, s_j 1,25, eşik ×1,15 | Algoritma §4.G (poly6 `K = (1 − d²/r²)²`, r = 6 m, yalnız frontier kuşlar, değişiklikler tick sonunda), değerler §2.6. Kendi kuşu da (K(0)=1) sayılır. **Değerlendirme kuş başına 15 Hz** (tek/çift tick sırayla), olasılık `p = 1 − e^(−λ·2Δt)` → oran aynı, maliyet yarı. |
| Doğan (S-09, S-14) | 0:40, sonra 30 ± 5 s, 2 s uyarı, kenarın %6–12'si 40 m öteye | 60 s'den 1–3 doğan, kenar kuşu (görüş içinde), 1,5 m'de ürker | **Geçiş başına 1 doğan** (kod 1–3'ü destekler, `HAWK_2_AT/HAWK_3_AT` kapalı). Hedef en büyük sürünün **liderinin 28 m içindeki kanat kenarı kuşu** ("görüş içinde": uyarı gölgesi oyuncunun baktığı yerde kalsın). Ürken kuşlar **sürü kenarından 40 m öteye** (liderden r + 40 m), sahibin yönünden uzağa; **eski sahibine 7 s katılamaz**, diğerleri yakalayabilir. Sıkı Dizi dağılmayı yarıya indirir. Kimse zarar görmez (kuş `owner = 0` olarak yaşar). |
| Eleme çekirdeği (S-10) | 4 m'de ≥8 kuş | 3 m'de ≥6 kuş veya lider ≤3 m | 4 m'de tek düşman sürüden ≥8 kuş **veya** düşman lider ≤3 m. Yalnız durumunun ilk 1 s'si çekirdekten korunur (kaskad biter bitmez anında eleme olmasın); **5 s içinde yabani toplayamayan yalnız lider elenir** ("yabani toplarsa kurtulur"un tersi). Elenen lider gökyüzüne süzülüp kaybolur (zarar tasviri yok). |
| Fırtına (S-11) | 45 m, 3 m/s, %4/s dağılma, Nefes dolmaz | ayrılma ×3, dürtüler, 2·R_f/3 s kuralı | %4/s dağılma + ayrılma ×3 ve tohumlu dürtüler; dağılan kuşlar sürü başına bir fırtına grubuna girer, eski sahibine 7 s katılamaz. 1:00'de doğar, tohumlu ara noktalarla dolaşır. |
| Halka dışı (S-06) | takipçiler %3/s yabanileşir | dışarıdaki lider 2 kuş/s kaybeder | %3/s; lider ve yabaniler içe itilir; dağılan kuşlar eski sahibine 7 s katılamaz. |
| Rüzgâr hamlesi | 25–40 s'de bir, 120 m bant, 3 s × 6 m/s, 2 s uyarı | iki gezici dalga | §2.6 bandı (ilk 20–30 s arası). Kayalar rüzgâr gölgesi verir (rüzgâr yönünde 28 m, kaya yarıçapı genişliğinde itme yok). |
| KUŞATMA bedeli (S-14) | — | — | Başarılı KUŞATMA saldıranın Nefes'ini 0 yapar (25'e dolana kadar Sıkı yok) + **6 s yeni kuşatma beklemesi**. |

## 2. Simülasyon teknik kararları

- **Liderler 1.500'lük havuzun dışında.** Havuz yalnız takipçi + yabani kuşlardır; Σ sahiplik her tick 1.500 (testte her tick ölçülür). Elenen lider havuzdan kuş götürmez.
- **detMath:** `src/sim/math/detMath.ts` henüz yoktu → `src/modes/suru/sim/detMath.ts` (fdlibm: Cody–Waite indirgeme + minimax polinomlar; yalnız + − × ÷ ve `Math.sqrt/round/floor`). Math.* ile fark < 1e-15. Açı tabloları (4096) başlangıçta detMath ile.
- **RNG:** xoshiro128** + splitmix32, sistem başına ayrı akış (yerleşim, yabani, dönüşüm, doğan, rüzgâr, fırtına, sürüklenme, yuva, YZ).
- **Komut:** `{tick, actorId, cmd: 'steer'|'tight', args}`; `actorId` = sürü kimliği (oyuncu 1). `steer` args `[sx, sz]` int8 (−127…127, dünya yönü; [0,0] = yönü koru), `tight` args `[0|1]` — §4.G.11 çevrimiçi komutunun birebir karşılığı.
- **Formasyon:** lider iz noktası + yuva ofseti. İz gecikmesi `Lmax = clamp(0,55·√n, 1, 8) s` (4.G'de 0,3√n, 1–6 s): §2.6'nın yavaş dönüş formülüyle daire çizen liderin akışı ≈345° kapatsın diye (dönüş periyodu ≈ 0,574√n s). Sıkı'da iz ×0,6 (kompakt yumruk), yanal yayılma k√N (0,6/1,3). Vogel spirali yerine **düşük tutarsızlıklı yuva dizisi** (altın oran / plastik sayı): üyelik değişince diğer kuşların yuvası kaymaz. Yanal ofset iz yönüne döndürülür → liderin çemberi halkaya dönüşür (KUŞATMA'nın fiziksel temeli).
- **Uzamsal hash:** 640 × 640 m, 6 m hücre (107²), her tick sayma sıralaması; konum/hız/sahip hücre sırasına kopyalanır (kuşlar yerinde güncellenirken komşular tick başı durumunu görür). Sorgu kendi hücre + 8 komşu, alt hücre çeyreğine göre **yakından uzağa**, hücre içi başlangıç ofseti dönen (deterministik, aday tavanında yön/indeks yanlılığı yok).
- **Aday tavanı:** dönüşüm tick'inde ≤32, yalnız hareket tick'inde ≤20 (brif "en fazla 32").
- **7 topolojik komşu:** kuş başına uyarlanır yarıçap (içerideki aynı sahipli komşu 7'den fazlaysa ×0,82, azsa ×1,22). Tam sıralama yerine O(1); sürü içinde komşu sayısı 7 civarında tutulur (sığırcık topolojik etkileşiminin bilinen yaklaşıklığı). Gerekçe: en yoğun senaryoda tick bütçesi.
- **Birleşik kuş geçişi:** komşu taraması, ayrılma, hizalama/kohezyon, iz hedefi, dönüşüm ağırlıkları, yabani yakalama temasları ve integrasyon tek döngüde, hücre sırasında; RNG çekimleri bu deterministik sırayla.
- **Hash:** FNV-1a; konum/hız 1/64 m kuantize, sahip+grup, lider durumu, Nefes, RNG durumları. `hashState()`; testler 30 tick'te bir.
- **Yabani gruplar:** ≤255 grup, merkez çevresinde yörünge çizen "takılma noktası"; 7–15 s'de bir dolaşır, küçük gruplar (<5) en yakın sazlığa toplanır (sazlıklar yeniden doğuş yeri), yakın gruplar 30'u geçmeden birleşir.
- **Fener** akış engelidir (kuşlar ve lider çevresinden akar).
- **Düzenler:** Sazlık Körfezi, Fener Burnu, Taşlı Koy (el yapımı) + Sürü Günü (`dailyLayout(dayIndex)`, tohumlu). Gün indeksini TR tarihinden host hesaplar (sim'de Date yok).
- **Doğuş:** sürüler halka üzerinde eşit yuvalarda; **#E69F00 renkli sürüler (kimlik 8 ve 15) oyuncunun tam karşısındaki yuvalara** (Ü-9).
- **Sıralama ve LP:** bitişte büyüklük (eşitlikte zirve, sonra kimlik); elenenler eleme sırasına göre. LP sonuç ekranında meta katmanının `lpForPlacement` + kuşatma bonusu (+3, tavan +9) ile birebir hesaplanır.

## 3. Yapay zekâ

- §4.G fayda puanlaması: topla / saldır / kuşat / kaç / merkez / fırsat; mevcut eyleme +0,15 histerezis, ≥1 s bağlılık; tepki gecikmesi tamponu (komut kuyruğu); tohumlu yön gürültüsü. Botlar oyuncunun girdisini okumaz, aynı fizik ve aynı komutlar.
- Kişilik tablosu §4.G (greed/aggr/courage/ring/opp/tepki) birebir. Ölçek sabitleri (denge ayarı): topla ×3,2, saldır ×0,8, fırsat ×1,7, kaç ×1,35, merkez ×3.
- Lig ölçeği tek kaynak `LEAGUES[]` (`src/content/meta/progression.ts`, S-13): tepki ofseti, karar aralığı (7→3 tick ≈ 4,3→10 Hz), gürültü, ring çarpanı. SÜRÜ'ye özel ekler (`personalities.ts`): hata oranı, Nefes rezervi, doğana Sıkı ile yanıt olasılığı, fayda becerisi, temasta savunma olasılığı (Bronz 0,12 → Elmas 0,95).
- Avcı §2.6 gereği kendinin 0,6–0,9× sürülerine yönelir; Kuşatıcı halka kurabilmek için önce büyür (n < 110'da toplama ×1,6) ve 6 s'de %60'ı geçemeyen kuşatmayı bırakır (hedef 10 s yasaklı).
- "Ortalama oyuncu" botu: aynı fayda beyni + insan profili (300 ms tepki, ±10°, ~4 Hz, nadiren bilerek kuşatır, iyi Nefes kullanımı).
- YZ adları doğa sözcükleri (28 ad, TR/EN), gerçek kişi adı yok; skor tablosunda ve alt bilgide "YZ / Yapay zekâ sürüleri".

## 4. Render (three.js r186, WebGL2)

- **Post zinciri yok (tüm kademeler):** AgX eğrisi + ton/derecelendirme (günbatımı → mavi saat, hafif S-eğrisi) + dithering her malzemenin shader'ında; vinyet tek üçgenlik çarpma geçişi. Düşük ve Ultra aynı ruh hali.
- Renk yönetimi: `THREE.Color('#hex')` r186'da zaten doğrusal saklar — ikinci dönüşüm yapılmaz (ilk denemede deniz 10× karanlık ve turuncuydu).
- **Kuşlar:** tek `InstancedBufferGeometry` (1.500), prev/curr konum + hız + sahip + lastConv 30 Hz'de yüklenir, `alpha` uniform ile shader'da interpolasyon; `wingWeight` ile kanat çırpma (7–12 Hz, kuş başına faz, çırp-süzül döngüsü), dönüşte yatış; dönüşüm flaşı `exp(−(tick − lastConv)/6)`; yanardöner spekülar (Yüksek+). **Sahip rengi ekran uzayında** karıştırılır (%60 + kenar) → HUD rengiyle birebir (AgX doygun altını turuncuya kaydırıyordu). Okunurluk ölçeği 3,0× (+ kamera yükseldikçe en fazla ×1,4). Üçgen: Düşük 10 · Orta 22 · Yüksek 30 · Ultra 42.
- Liderler 1,8×, additive hale, ışık izi, su üstünde işaret şekli (daire/üçgen/kare/eşkenar dörtgen) + desenli (düz/kesikli/noktalı) yumuşak aura (alfa ≈ 0,18). Oyuncunun lideri **çift halka**.
- **Sahiplik yoğunluğu hedefi:** kuşlar ortografik yumuşak nokta olarak basılır → suyun üstünde sahip renginde aura parıltısı + yumuşak gölge. Düşük'te de var (128² RGBA8; Orta+ 256² yarı-float) — §3.8 "Düşük'te aura ve renk dalgaları aynen korunur".
- Su: analitik gök yansıması + Fresnel, güneş yolu (azimut bandı + dalga parıltısı, ufka doğru güçlenir), seyrek ışıltılar, sazlık/kaya/fener köpüğü, rüzgâr uyarısı dalgacık çizgileri, fırtına yağmur halkaları, halka ışık bandı + dışarıda gece tonu, fener yansıması.
- Güneş 6° → −1°, 3.200 K → 2.200 K, mavi saatte pozlama telafisi; güneş azimutu ekranın yukarısı (parıltı yolu sürülerin arkasından geçer, koyu siluetler okunur).
- Doğan: koyu uzun kanatlı siluet + suda gölge; uyarıda gölge çevresinde nabız halkası. Fırtına: katmanlı bulut kartları (soğuk, doygunluğu düşük) + yağmur perdeleri, şimşek tek flaş ≤ 0,32 Hz. Gün Batımı Halkası: dikey ışık perdesi (kenardan bakınca belirgin, tepeden soluk).
- **Kamera:** 55° eğim, yükseklik 45 + 2,2·R (45–160 m), lider portrede alttan %40, 0,8 s ileri bakış, ω = 4 kritik sönümlü yaylar; KUŞATMA'da %8 zoom-out vuruşu; 4 s açılış planı; tur sonu yükselen plan. **Dar dikey ekranda yükseklik ×(0,78/en-boy)^½ (≤1,35)**: 390×844'te sürü kanatları ve doğan kadrajda kalsın (aksi hâlde yatay görüş ±20 m).
- Kademe düğmeleri (§5.G): kuş üçgeni, yanardönerlik, arka plan murmuration (0/600/1.500/3.000, GPU-analitik), sahiplik hedefi çözünürlüğü, su detayı, sazlık yoğunluğu ve kıyı katmanları (1/2/3), bulut kartı/yağmur sayısı, DPR tavanı (1,25/1,75/2,25/3). MSAA bağlam oluşturulurken (Düşük hariç) seçilir; kademe değişimi doğal molada yapılmalıdır. Sim kuş sayısı her kademede 1.500.
- Tüm özel shader'lar highp; zaman uniform'u 600 s'de sarılır; kare başına tahsis yok (önceden ayrılmış diziler).

## 5. Mod denetleyicisi ve HUD

- Sabit adım 30 Hz (akümülatör, kare başına ≤5 yakalama adımı), render interpolasyonu.
- Dokunmatik: göreli çubuk (dokunuşun başladığı yer çapa, R = 0,11 × kısa kenar, yüzen çapa, ölü bölge 0,10). Basılı = Sıkı, bırak = Geniş + düz uçuş. "İki Başparmak" (sol sürükle / sağ basılı, sol el modunda ayna). Klavye: WASD/oklar + boşluk.
- HUD (DOM): güneş yayı zamanlayıcı, sürü sayısı, ilk 3 (renk + desen + işaret + "YZ"), dönen dairesel mini harita (halka, fırtına, doğan), **Nefes yayı liderin çevresinde** (bitince kırmızı + çift haptik), "SEN" etiketi ilk 7,5 s, lider ekran dışındayken kenar oku, kısa duyurular. Fontlar UI modülünden (`loadFonts`), yedek yığınlar Barlow Condensed / Inter.
- Sonuç kartı alt yarıda (üstte Sürü Gösterisi görünür kalır): sıra, zirve, dönüştürülen, toplanan yabani, kuşatma, ayakta kalma, LP; Tekrar (en büyük), İzle (erken elenince), Paylaş (kart metni, emoji yalnız burada), Çık. Yeni tur < 2 s (aynı renderer, yeni sim).
- FTUE (45 s, metinsiz): hayalet başparmak öndeki yabani gruba sürükler → bırakma (iki grup katılır) → basılı tutma (Nefes yayı) → uyuyan küçük Ürkek sürünün çevresinde ışıklı yay → KUŞATMA → Antrenman/Lig turu.
- Haptik bütçesi ≤150 ms/s; ses kancası her sim olayını oyuncu ilişkisi, stereo pan ve mesafe ile iletir + `audioState()` (yoğunluk, Nefes, gün batımı oranı…).

## 6. Ölçümler ve açık konular

(Rapordaki sayılarla güncellenir: tick süreleri, 500 tur denge, V8/JSC hash eşitliği.)
