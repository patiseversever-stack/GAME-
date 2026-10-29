# Fetih Ligi soru süreleri: adalet raporu (v0.6 → v0.7)

**Tarih:** 29 Ekim 2026
**Kapsam:** `src/quiz/timing.js` (soru süresi modeli), bankadaki 1.478 sorunun hepsi (verisi olmayan anagram, çengel ve resimli tipler yapay örneklerle), 412×892 dikey telefon.
**Soru (sahibin kaygısı):** "Soru süreleri mantıklı mı? Ekran klavyeli soruda süre yetiyor mu? Her sorunun uzunluğuna süre yetiyor mu? Kullanıcıyı mağdur etmeyelim: soruyu anlamadan süre bitmesin."

## Kısa cevap

- **Süreler zaten sorunun kendi uzunluğundan hesaplanıyordu (v0.6), çoğu tipte yeterliydi.** Ama gerçek kartlarda "yavaş ama bilen" bir oyuncuyla ölçünce üç yerde oyuncu mağdur oluyordu:
  - **Bilmece:** kök iki kez okunuyor. Model yalnız %25 ek okuma sayıyordu. Playwright'ta 4 bilmeceden 4'ünde süre doldu.
  - **Sırala:** başlangıç karışık geliyor ve en kötü başlangıçta (ters dizi) iki sürükleme gerekiyor. Model ortalama başlangıcı (1,2 hamle) sayıyordu ve sürüklemeyi kısa tutuyordu. 73 sıralama sorusunun hepsi en kötü başlangıçta süreye yetişmiyordu. Playwright'ta 5 sıralamanın 5'inde de süre doldu. Bunların 3'ünde başlangıç ters değildi, tek sürükleme yetiyordu.
  - **Kısa kelimeli metin:** göz her kelimeye durur. "bir gün (kendi ekseni etrafında bir tur)" gibi metinler harf sayısının söylediğinden uzun sürüyor. Bu en çok bilmece, karşılaştır ve uzun şıklı testte görülüyordu.
- **Ekran klavyeli adam asmaca yetiyordu ama dardı.** Tipik çözüm 7–9 dokunuş: ortalama 5,7 farklı harf ve 2–3 boşa tahmin. Bu, 0,85 sn arayla 7–8 sn yazma demek. Buna ipucunu okuma (3–5 sn) ve hatırlama (3,5–6,5 sn) eklenir. ÇÖL, GÜREŞ, HEYKEL, OLİMPİYAT gibi kısa ya da nadir harfli kelimelerde açılış tahminleri uzuyor. Bankada 3 soruda yavaş oyuncu yetişmiyordu, 18 soruda pay 1 sn'den azdı. v0.7'de bütçe 15–25 sn'den 16–25 sn'ye çıktı ve hepsi sığıyor.
- **Sonuç:** Playwright örnekleminde süre dolan soru **54'te 11'den 2'ye** indi; ikisi de sınırda (0,0 ve −0,1 sn). Bağımsız denetim oyuncusuna göre (aşağıda) **süreye yetişemeyen soru sayısı 120'den 1'e indi.** Kalan tek soru 0,1 sn ile sınırda; payı 1 sn'den az olan soru 175'ten 51'e indi.
  - Banka ortalaması 15,0 sn'den 15,5 sn'ye çıktı.
  - Kolay ve kısa sorular uzamadı: doğru/yanlış 9–13 sn, en kısa test 12 sn.
  - Hızlı maç süresi değişmedi: benzetimde 6,9–7,2 dk.

## Rakiplerde durum

| Oyun | Soru başına süre | Not |
|---|---|---|
| Trivia Crack (Preguntados) | **20 sn**, her soruda sabit (Aralık 2015'te 30 sn'den indirildi) | Ekstra süre jokeri var. Kısaltma, ekran okuyucu kullananlardan şikâyet aldı [1][2]. |
| QuizUp | **10 sn**, 4 şık | Hızlı cevap çok puan (en çok 20) [3][4]. |
| HQ Trivia | **10 sn** | Saat sunucu soruyu okumaya başlayınca işler. Süre biterse elenirsin [5][6]. |
| Kahoot! | Test ve D/Y varsayılan **20 sn** (5 sn–4 dk). Yazılı cevap (Type answer) en az **20 sn**. Bulmaca (sürükle-sırala) **20 sn–4 dk**. Kaydırıcı en az 10 sn. | Şıklardan önce ayrı bir **okuma evresi** var: en az 5 sn, metne göre 180 kelime/dk [7][8][9]. |
| Kim Milyoner Olmak İster (ABD saatli biçim, 2008–10) | Soru 1–5: **15 sn**, 6–10: **30 sn**, 11–14: **45 sn** | Joker kullanırken saat durur [10][11]. Türkçe mobil sürümlerin bir kısmında süresiz kip var, süre değeri bulunamadı [12]. |
| Kelime Oyunu (TV) | 14 kelime için toplam **4 dk** (≈17 sn/kelime, 4–10 harf) | Cevap sözlü verilir, harf alınabilir [13]. "Kelime Oyunu+" uygulamasında kelime başına **15 sn** [14]. |
| TRT Bil Bakalım | Soru başına süre yayımlanmamış | Okul yarışması "Bil Bakalım" (Aydın MEB): soru başına **30 sn** [15]. |
| GeoGuessr Düello | Tur 60 sn; ilk tahminden sonra **15 sn** geri sayım | Fotoğraftan yer bulma; bizim iğneden çok daha zor bir görev [16]. |

**Okuma ve yazma verisi:**
- Yetişkin sessiz okuma ortalaması ~238 kelime/dk (Brysbaert 2019, 190 çalışma) [17].
- Türkçe sesli okuma ~166 kelime/dk (IReST) [18].
- Telefonda iki başparmakla yazma ortalaması ~36–38 kelime/dk (Palin ve ark. 2019, 37 bin kişi). Hız yaşla düşer: 10–19 yaş 39,6, 50'li yaşlar 26,3 kelime/dk [19][20].
- Yaşlı yetişkinler küçük dokunmatik hedefleri daha yavaş ve daha çok hatayla seçer [21][22].

**Rakiplere göre konumumuz:**
- Testimiz (ortanca 14 sn) QuizUp/HQ'nun 10 sn'si ile Trivia Crack/Kahoot'un 20 sn'si arasında.
- Fark şu: bizde süre sorunun uzunluğuna göre 12–24 sn arasında değişiyor. Uzun soru sabit bir sürenin cezasını çekmiyor.
- Kahoot'taki gibi ayrı bir okuma evresi yok. Okuma süresi bütçenin içinde.
- Yazılı ve sürüklemeli tiplerde Kahoot'un en az 20 sn'si ölçüt. Adam asmacanın ortancası 19 sn, sıralamanın 23 sn.

## Yöntem

Üç katman birbirini denetler:

1. **Model (`timing.js`).** Her soru için bekleme, bakış, okuma, düşünme ve giriş süreleri adım adım toplanır. Hesap üç oyuncu için yapılır: hızlı, ortanca ve yavaş-rahat.
   - Süre = en büyüğü(yavaş + **1,5 sn** pay, ortanca + 5 sn kırmızı uyarı).
   - Hesap belirlenimcidir: sunucu da aynı süreyi bulur.
2. **Playwright ile gerçek kartlar.** `dist/FetihLigi.html?debug` açıldı ve `debugScene` istenen soruyu gösterdi. "Yavaş ama bilen" oyuncu şöyle tanımlandı:
   - **Okuma:** ekrandaki gerçek yazının kelime sayısıyla 110 kelime/dk. Yazı kart açıldıktan 0,35 sn sonra okunur hale gelir.
   - **Düşünme:** modelin yavaş oyuncu varsayımı. Ölçülemez.
   - **Dokunuş:** iki dokunuş arası 0,85 sn.
   - **Sürükleme:** 0,6 sn satırı bul, 0,8 sn sürükle, 0,45 sn yerine oturmasını izle.
   - **Kaydırıcı:** gerçek fare sürüklemesi ve ince ayar düğmeleri.
   - **Harita:** dokunuşla iğne, sonra ONAYLA.
   - **Adam asmaca:** Türkçe harf sıklığıyla açar (A, E, İ, N…). Harflerin üçte biri açılınca ya da 3 ıskada kelimeyi tanır, sonra kalan harfleri basar. Tanımadan önceki her tahmin 1,4 sn sürer.

   Her girdi kartın kendi saatine göre planlanan anda verildi. Ölçülen süre, kartın açılışından cevabın kilitlenmesine kadardır ve arayüzün kendi gecikmelerini de içerir.
3. **Denetim oyuncusu.** Aynı oyuncu çevrimdışı olarak bankanın 1.478 sorusunda çalıştırıldı. Artık `test/timing.test.mjs` bölüm 9'da kalıcı bir sınama olarak duruyor.

**Ek ölçümler:**
- Kart ekrana sığıyor mu? 412×892 ve 360×640'ta her tipin en uzun metinli soruları denendi. Kaydırma gereken ya da taşan düğme yok.
- Harita sorusunda kamera kart açıldıktan sonra en çok ~0,7 sn daha süzülüyor, %90'ı ilk 0,4 sn'de. Türkiye ekranda ~370 px genişlikte (1 px ≈ 4,4 km), Edirne'den Iğdır'a hepsi görünüyor.

## Tip başına tablo (önce → sonra)

- **Süreler:** en az / ortanca / en çok.
- **"Dokunuş / yazma" sütunu:** yavaş oyuncu için varsayılan giriş.
- **Örnek sütunu:** v0.6 → v0.7 süresi.
- **Yıldızlı tipler:** anagram, çengel ve resimli tiplerin bankada verisi yok (yapay örnek). Yıldırım turu sabit süreli, değişmedi.

| Tip | Soru | v0.6 (sn) | v0.7 (sn) | Rakip referansı | Dokunuş / yazma (yavaş oyuncu) | Örnek (önce → sonra) |
|---|---:|---|---|---|---|---|
| Test (choice) | 591 | 11 / 14 / 23 | 12 / 14 / 24 | Trivia Crack 20; QuizUp 10; Kahoot 20 + okuma evresi | 1 dokunuş (0,75 sn); 4 şık okunur | "Türkiye'de kaç coğrafi bölge vardır?" 11 → 12; "Soğuk Savaş'ta karşı karşıya gelen iki süper güç…" 15 → 17 |
| Doğru mu? (tf) | 131 | 9 / 11 / 13 | 9 / 11 / 13 | Kahoot D/Y 20; HQ 10 | 1 dokunuş | "Bursa, Ege Bölgesi'ndedir." 9 → 9; "Hazar Denizi, dünyanın en büyük gölüdür." 10 → 11 |
| Karşılaştır (hilo) | 56 | 11 / 13 / 15 | 11 / 13 / 16 | QuizUp 10; Kahoot 20 | 1 dokunuş | "Hangisinde bir gün (kendi ekseni etrafında bir tur) daha uzun sürer?" 15 → 16 |
| Farklı olan (odd) | 64 | 12 / 14 / 18 | 12 / 14 / 18 | Trivia Crack 20 | 1 dokunuş | "Hangisi bir Osmanlı padişahı değildir?" 15 → 16 |
| Emoji | 71 | 14 / 15 / 18 | 14 / 15 / 19 | Trivia Crack 20 | Emojilerin düşmesi beklenir; 1 dokunuş | "…hangi turnuvayı anlatıyor?" 16 → 17 |
| Bilmece (riddle) | 40 | 14 / 16 / 19 | **15 / 19 / 22** | Trivia Crack 20 | Kök 1,6 kez okunur; 1 dokunuş | "Ne kapısı var ne penceresi; ama içinde hem ak hem sarı saklıdır." 16 → 20; "Gözü yok ağlar, ayağı yok yürür." 14 → 15 |
| Atasözü (proverb) | 47 | 12 / 13 / 14 | 12 / 13 / 14 | Trivia Crack 20 | 1 dokunuş | "Atasözünü tamamla" (z2) 12 → 13 |
| Tahmin (num) | 141 | 14 / 16 / 20 | 14 / 17 / 21 | Kahoot kaydırıcı ≥10 (varsayılan 20) | Kaba sürükleme (2,2 sn) + 4–6 ince ayar (0,45 sn) + GÖNDER | "Türkiye'de kaç il vardır?" 14 → 15; Tünel'in açılış yılı 20 → 21 |
| Haritada bul (pin) | 85 | 13 / 15 / 18 | 13 / 15 / 19 | Kahoot iğne ≥20; GeoGuessr 15 sn (ilk tahminden sonra) | Kadraj 1 sn + dokun 1,2 + bak/yakınlaştır/düzelt 1,6 + ONAYLA 0,9 | "Pamukkale travertenleri nerede?" 14 → 15; "Kültepe (Kaniş) nerede?" 18 → 19 |
| Adam asmaca (hang, ekran klavyesi) | 97 | 15 / 18 / 25 | **16 / 19 / 25** | Kelime Oyunu ≈17/kelime (sözlü); Kelime Oyunu+ 15; Kahoot yazılı ≥20 | Farklı harf (ort. 5,7) × 0,85 sn + boşa tahmin 2 / 2,6 / 3,2 × 1,6 sn ≈ 8–9 dokunuş | PERİ BACASI 20 → 22; ÇÖL 15 → 16; MUDANYA (z3) 25 → 25 |
| Sırala (order) | 73 | 16 / 20 / 26 | **19 / 23 / 29** | Kahoot bulmaca (4 karo sürükle) 20 sn–4 dk | En kötü başlangıç: 2 sürükleme × 1,8 sn + ONAYLA (ortalama başlangıç 1,2 hamle) | "Hayvanları ağırlıklarına göre hafiften ağıra sırala." 16 → 19; "Filmleri … yeniden eskiye sırala." 19 → 23 |
| Eşleştir (match) | 82 | 16 / 18 / 21 | 17 / 19 / 22 | Kahoot bulmaca ≥20 | 2 bağ × 1,5 sn (4 dokunuş; son çift kendiliğinden) + ONAYLA | "Hayvanları yavrularıyla eşleştir." 16 → 17; "Türk yazarlarını eserleriyle eşleştir." 20 → 22 |
| Anagram* | 3 | 14 / 21 / 28 | 14 / 24 / 33 | Kahoot yazılı ≥20 | n karo × (0,45 + 0,03·n) sn (karışık karolar arasında arama) + 1 düzeltme | KEDİ 14 → 14; TERMOMETRE 21 → 24; KÜTÜPHANECİLİK 28 → 33 |
| Çengel (cross)* | 2 | 32 / – / 66 | 34 / – / 72 | Kelime Oyunu ≈17/kelime | Hücre × 0,85 sn tuş + kelime başına 0,6 sn geçiş + 2 sn düzeltme; ipucu başına 3–5 sn | 3 kelime 32 → 34; 5 kelime 66 → 72 |
| Resimli (img)* | 4 | 16 / 21 / 23 | 16 / 22 / 24 | Trivia Crack 20; Kahoot 20 | Şıklıda 1 dokunuş; yazılıda harf × 0,85 sn + 1 düzeltme | GALATA KULESİ (yazılı) 23 → 24; KARADAM (resimli bulmaca) 21 → 22 |
| Yıldırım (blitz)* | 2 | 10–20 (sabit tur) | 10–20 | – | Sabit tur (KIRMIZI kuralı yok) | Değişmedi |

**Ortanca oyuncunun bitirme süresi (v0.7):**
- Test 9,1 sn, doğru/yanlış 5,8 sn, karşılaştır 7,9 sn.
- Adam asmaca 14,0 sn, sıralama 15,8 sn, bilmece 12,4 sn.

Hepsi kırmızı uyarı başlamadan (son 5 sn'den önce) biter. Botlar bütçenin ortalama %41 (D/Y) ile %67'si (adam asmaca) arasında cevaplar. Bu oranlar v0.6 ile aynı.

## Playwright ölçümü: aynı 54 soru, aynı oyuncu, önce ve sonra

**Örneklem:** her tipten en kısa, ortanca ve en uzun soru, en uzun metinli soru, en dar paylı soru ve azalan sıralama. Toplam 54 soru.

- Aynı oyuncu iki derlemede de aynı soruları aynı adımlarla oynadı.
- Ölçülen süre, planlanan süreyle 0,1–0,4 sn içinde örtüştü. Arayüz kendi gecikmesini eklemiyor.
- "Pay" = bütçe − ölçülen bitirme. Süre dolduysa = bütçe − planlanan bitirme.

| Tip | Ölçülen soru | Yavaş oyuncunun bitirme süresi (sn) | v0.6: süre doldu | v0.6 en dar pay (sn) | v0.7: süre doldu | v0.7 en dar pay (sn) |
|---|---:|---|---:|---:|---:|---:|
| Doğru mu? | 4 | 5,9–12,2 | 0 | +0,8 | 0 | +0,8 |
| Test | 4 | 8,6–20,8 | 0 | +2,1 | 0 | +3,1 |
| Karşılaştır | 3 | 8,1–16,1 | 1 | −1,1 | 1 | −0,1 |
| Farklı olan | 4 | 9,6–14,8 | 0 | +1,7 | 0 | +2,4 |
| Emoji | 5 | 9,5–14,6 | 0 | +2,3 | 0 | +3,3 |
| Bilmece | 4 | 14,4–20,2 | **4** | −1,2 | 0 | +0,6 |
| Atasözü | 5 | 8,7–10,3 | 0 | +3,3 | 0 | +3,3 |
| Adam asmaca | 5 | 14,4–20,2 | 1 | −0,2 | 0 | +0,8 |
| Sırala | 5 | 16,9–27,6 | **5** | −2,1 | 1 | 0,0 |
| Eşleştir | 5 | 14,8–19,6 | 0 | +1,1 | 0 | +2,2 |
| Tahmin | 5 | 9,8–16,7 | 0 | +2,6 | 0 | +3,6 |
| Haritada bul | 5 | 9,2–15,5 | 0 | +2,1 | 0 | +3,1 |
| **Toplam** | **54** | | **11** | | **2** | |

**Ayrıntılar ve kalan iki sınır vaka:**
- **Adam asmaca:** OLİMPİYAT (z1) v0.6'da 0,2 sn eksik kaldı. Bu oyuncu A, E, İ, N, R ile açtı (5 tahmin, 3 ıska), tanıdı ve 6 harf daha bastı: toplam 11 dokunuş. v0.7'de 0,8 sn pay var. ÇÖL'de A, E, İ üçü de boşa gitti, sonra Ç-Ö-L basıldı: pay 0,6 → 1,6 sn.
- **Sırala:** başlangıç rastgele. İki soruda ters dizi geldi ve iki sürükleme gerekti.
  - egl-or-003 (yeniden eskiye, ters başlangıç) v0.7'de tam sınırda (0,0) kaldı. Burada Playwright okuyucusu ▲/▼ yön simgelerini de kelime saydı (+1,1 sn). Simgeler sayılmazsa pay +1,1 sn; denetim oyuncusu bu soruya +1,1 sn veriyor.
  - Öteki üç soruda tek sürükleme yetti: pay +1,4–2,1 sn.
- **Karşılaştır:** bil-hl-010'un ("…kendi ekseni etrafında bir tur…") payı −1,1 → −0,1. Burada oyuncu iki karttaki "bir günün uzunluğu" yazısını iki kez okudu. Gerçek oyuncu ikinciye göz atar.
- **Tahmin:** "Dünya'nın ekvator çevresi" (10.000–100.000 km) sorusunda kaydırıcıyla tam değere inmek mümkün değil (1 px ≈ 257 km). Oyuncu yakın bir değerde bırakıyor (4 ince ayar). Tam değeri kovalayan oyuncu ilk denemede ±1 ile 16 dokunuş yaptı: aşağıdaki gözlem 1.

**Düzen denetimi:** iki ekranda her tipin en uzun 1–3 sorusu açıldı. Hiçbir kartta kaydırma gerekmedi, taşan düğme yok.
- 412×892'de kart üst kenarı en uzun testte 403 px, sırala kartında 304 px.
- 360×640'ta kart en uzun sırala sorusunda 130 px'ten başlıyor. Adam asmacanın 29 tuşlu klavyesi tuş başına ~37×42 px.

## En dar 10 soru (denetim oyuncusu, bütçe − bitirme süresi)

**Önce (v0.6).** Bankada 120 soruda pay < 0 (süre doluyor), 175 soruda pay < 1 sn.

| Pay v0.6 → v0.7 (sn) | Tip | Soru | Bütçe v0.6 → v0.7 | Denetim oyuncusu |
|---|---|---|---|---:|
| −3,6 → +0,4 | bilmece | egl-ri-006 "Ne kapısı var ne penceresi; ama içinde hem ak hem sarı saklıdır…" | 16 → 20 | 19,6 |
| −3,3 → +0,7 | sırala | egl-or-007 "Harfleri Türk alfabesindeki yerlerine göre sondan başa sırala." | 16 → 20 | 19,3 |
| −2,9 → +1,1 | sırala ↓ | egl-or-003 "Filmleri çıkış yıllarına göre yeniden eskiye sırala." | 19 → 23 | 21,9 |
| −2,8 → +0,2 | sırala ↓ | bil-or-007 "Hızlarına göre hızlıdan yavaşa sırala." | 16 → 19 | 18,8 |
| −2,7 → +0,3 | sırala | san-or-009 "Şairleri doğum yıllarına göre eskiden yeniye sırala." | 20 → 23 | 22,7 |
| −2,6 → +1,4 | bilmece | egl-ri-007 "Yüzü var gülmez, kolları var sarılmaz; durmadan yürür…" | 17 → 21 | 19,6 |
| −2,5 → +0,5 | sırala | egl-or-009 "Sayıları küçükten büyüğe sırala." (2/3, 0,7, 3/4) | 16 → 19 | 18,5 |
| −2,5 → +0,5 | sırala ↓ | egl-or-014 "Harry Potter kitaplarını … yeniden eskiye sırala." | 21 → 24 | 23,5 |
| −2,5 → +0,5 | bilmece | egl-ri-014 "Ne kadar çok alırsan o kadar çok geride bırakırsın…" | 16 → 19 | 18,5 |
| −2,4 → +0,6 | sırala | spo-or-004 "Dünya Kupası ev sahiplerini yıllarına göre eskiden yeniye sırala." | 21 → 24 | 23,4 |

**Sonra (v0.7).** 1 soruda pay < 0 (−0,1 sn), 51 soruda pay < 1 sn.

| Pay v0.7 (v0.6) (sn) | Tip | Soru | Bütçe v0.6 → v0.7 | Denetim oyuncusu |
|---|---|---|---|---:|
| −0,1 (−1,1) | karşılaştır | bil-hl-010 "Hangisinde bir gün (kendi ekseni etrafında bir tur) daha uzun sürer?" | 15 → 16 | 16,1 |
| +0,2 (−2,8) | sırala ↓ | bil-or-007 "Hızlarına göre hızlıdan yavaşa sırala." | 16 → 19 | 18,8 |
| +0,3 (+0,3) | test | egl-ch-070 "Bir çiftçinin 17 koyunu var. 9'u hariç hepsi ölüyor…" | 14 → 14 | 13,7 |
| +0,3 (−2,7) | sırala | san-or-009 "Şairleri doğum yıllarına göre eskiden yeniye sırala." | 20 → 23 | 22,7 |
| +0,3 (+0,3) | adam asmaca | cog-ha-013 "İki denizi birbirine bağlayan dar su yolu" (BOĞAZ) | 17 → 17 | 16,7 |
| +0,3 (−0,7) | test | cog-ch-094 "Hangi iki ülke dünyanın en uzun kara sınırını paylaşır?" | 17 → 18 | 17,7 |
| +0,4 (−0,6) | test | egl-ch-004 "Ayran hangi malzemelerden yapılır?" (uzun şıklar) | 14 → 15 | 14,6 |
| +0,4 (−3,6) | bilmece | egl-ri-006 "Ne kapısı var ne penceresi…" | 16 → 20 | 19,6 |
| +0,5 (−2,5) | sırala | egl-or-009 "Sayıları küçükten büyüğe sırala." | 16 → 19 | 18,5 |
| +0,5 (+0,5) | adam asmaca | egl-ha-010 "Bilgisayarda yazı yazmaya yarayan tuş takımı" (KLAVYE) | 18 → 18 | 17,5 |

Denetim oyuncusu çok temkinli bir sınamadır:
- Sıralamada her soru için en kötü başlangıcı varsayar. Gerçekte başlangıçların yalnız 1/5'i ters dizi, gerisinde tek sürükleme yeter.
- Karşılaştır kartlarındaki özellik yazısını iki kez okur.

Bu yüzden kalan +0,2–0,5 sn'lik paylar en kötü durumdadır. Ortalama pay tiplere göre 1,2 (sırala) ile 4,4 sn (emoji) arasında.

## Modelde değişenler (v0.7)

| Değişiklik | Neden | Etkisi |
|---|---|---|
| **Okuma kelimeye de bakar.** Kelime süresi = sabit bakış (yavaşta 0,15 sn) + harf başına pay. 7,5 harflik ortalama kelimede eski 14 / 20 / 28 harf/sn ile aynı. | Göz her kelimeye durur. "bir", "ne", "en" gibi kısa kelimeler harf sayısının söylediğinden uzun sürer. | Kısa kelimeli metin +%5–12; uzun kelimeli metin biraz kısalır. |
| **Bilmece kökü 1,6 kez okunur** (önce 1,25). | Bilmece önce okunur, sonra anahtar yerleri yeniden okunur. Playwright'ta 4/4 bilmecede süre doldu. | Bilmece ortancası 16 → 19 sn. |
| **Sırala: en kötü başlangıç** (n − 1 sürükleme; önce ortalama 1,2). Sürükleme 1,4 → 1,8 sn; yön etiketleri (▲ EN ESKİ / ▼ EN YENİ) 0,6 → 1 sn. | Karışık başlangıç oyuncunun elinde değil. Ters dizi gelen yavaş oyuncu iki sürükleme yapar. | Sıralama ortancası 20 → 23 sn. |
| **Eşleştir:** bağ 1,3 → 1,5 sn. | Sağda eşi aramak ve ikinci dokunuş. | +1 sn. |
| **Adam asmaca:** beklenen boşa tahmin 1,5 + 0,75·z → **2 + 0,6·z**. | Harf sıklığıyla açan oyuncu bankada %34 açılana dek ortalama 2,2 / 2,7 / 3,2 ıska yapıyor (z1 / z2 / z3). | Kolay sorularda +1 sn. Ortanca 18 → 19 sn. |
| **Harita:** iğneye bakıp düzeltme 1,2 → 1,6 sn. | İki parmakla yakınlaştırıp düzeltmeye pay. 1 px ≈ 4,4 km, "doğru" sayılan yarıçap 40 km ≈ 9 px. | +0–1 sn. |
| **Anagram:** karo başına 0,5 → 0,45 + 0,03·n sn. | Karışık n karo arasında her harf için arama yapılır. | Uzun anagram (14 harf) 28 → 33 sn. |
| **Çengel:** kelime başına düşünme 2,5 + 0,75·z → 3 + 1·z. | Kelime Oyunu'nda kelime başına ~17 sn (sözlü, harf alarak). | 5 kelime 66 → 72 sn. |
| **Pay (SLACK) 1 → 1,5 sn.** | Erişilebilirlik: yaşlı oyuncu, ana dili Türkçe olmayan, titrek el. Yalnız uzun sorularda belirleyici. | Uzun sorularda +0,5 sn. |

**Değişmeyenler:**
- Kart açılışı (0,5 sn), kırmızı uyarı (son 5 sn), tip sınırları.
- `v.sec` / `v.fast` / `v.med` / `v.slow`, `extraFor` / `cutFor` (ekstra süre yarısı kadar, sabotaj üçte biri).
- Sunucu ile istemcinin aynı süreyi bulması.
- Bot oranları.
- Benzetimde hızlı maç süresi 6,8–7,2 dk ile v0.6'yla aynı. Uzun maç +0,2–0,3 dk.

## Gözlemler (dokunulmadı, öneri)

1. **Tahmin kaydırıcısında "+10 / −10" düğmeleri aslında 10 × adım kaydırıyor.** Adım = aralık / 200. Örneğin 10.000–100.000 aralığında ±10 düğmesi ±4.500 oynatıyor; 1000–1800 aralığında ±40. Etiket yanıltıcı. Kesin yıl girerken oyuncu yalnız ±1'le ilerlemek zorunda kalabilir: Playwright'ta bir soruda 16 dokunuş gerekti. Öneri: etiket gerçek adımı göstersin ("+50") ya da üçüncü bir kaba adım eklensin. Model 4–6 ince ayar dokunuşu sayıyor; "en yakın kazanır" olduğu için oyuncu tam değeri kovalamak zorunda değil.
2. **Kısa sorularda kırmızı uyarı yavaş oyuncunun cevap anına denk geliyor.** Örneğin 9 sn'lik doğru/yanlışta yavaş oyuncu 5,6 sn'de bitiriyor, kırmızı 4 sn kala başlıyor. Bu tasarım gereği (ortanca oyuncu kırmızıdan önce bitirir), süre dolmuyor. Kaygı verirse kırmızı pencere kısa sorularda 3 sn'ye indirilebilir. Bu, `ui.js` ile `timing.js`'in birlikte değişmesi demek.
3. **Anagram, çengel ve resimli yazılı tiplerin verisi yok.** Model hazır. Veri gelince aynı Playwright düzeneğiyle yeniden ölçülmeli: karo sayısı, klavye ve hücre gezinmesi.
4. **Ekstra süre jokeri** bütçenin yarısını ekler (+5–15 sn). Yavaş okuyan oyuncu için sefer modunda kalıcı bir "rahat süre" ayarı (×1,25) düşünülebilir. Çevrimiçi düelloda iki oyuncuya aynı saat verildiği için bu yalnız tek oyunculu modlarda olmalı.

## Kaynaklar

1. AppleVis, "Reduced Timer in Trivia Crack" (Aralık 2015): https://applevis.com/comment/49621
2. AppleVis, "Trivia Crack Power Ups": https://applevis.com/comment/40384
3. PCWorld, "You should play QuizUp": https://www.pcworld.com/article/2104701/you-should-play-quizup.html
4. Wikipedia, QuizUp: https://en.wikipedia.org/wiki/QuizUp
5. CNBC, "Vine's creators release trivia app HQ" (2017): https://www.cnbc.com/2017/11/20/vines-creators-release-trivia-app-hq-trivia.html
6. Time, "HQ Trivia app": https://time.com/5038037/hq-trivia-app-game/
7. Kahoot! destek, soru tipleri (yazılı cevap 20 sn–4 dk, bulmaca): https://support.kahoot.com/hc/articles/115002308428
8. Inside Kahoot!, "Dynamic Question Times" (okuma evresi: en az 5 sn, 180 kelime/dk): https://medium.com/inside-kahoot/kahoot-dynamic-question-times-1ef1facead4e
9. Kahoot! topluluk, 15 sn seçeneği ve varsayılan 20 sn: https://support.kahoot.com/hc/en-us/community/posts/360018594934-15-sec-time-limit-per-question ; https://support.kahoot.com/hc/en-us/community/posts/15952821096979-changing-time-limit-per-questions-for-all-questions
10. Wikipedia, Who Wants to Be a Millionaire (ABD): https://en.wikipedia.org/wiki/Who_Wants_to_Be_a_Millionaire_(American_game_show)
11. Millionaire Wiki, Clock Format: https://millionaire.fandom.com/wiki/Clock_Format
12. Tamindir, Kim Milyoner Olmak İster (mobil): https://www.tamindir.com/indir/kim-milyoner-olmak-ister/
13. CNN Türk, Kelime Oyunu: https://www.cnnturk.com/magazin/kelime-oyununda-eglenceli-anlar
14. Tamindir, Kelime Oyunu+: https://www.tamindir.com/indir/kelime-oyunu/
15. Aydın İl MEB, "Bil Bakalım" yarışma yönergesi: https://karpuzlual.meb.k12.tr/meb_iys_dosyalar/09/15/233090/dosyalar/2023_04/27164204_Bil_Bakalim_AYDIN.pdf
16. GeoGuessr düello ayarları (topluluk turnuvası: 60 sn tur, 15 sn tahmin sayacı): https://master.nse.gg/tournaments/community-tournaments-2324/pringles-geoguessr-tournament/
17. Brysbaert, M. (2019). How many words do we read per minute? *Journal of Memory and Language* 109, 104047. doi:10.1016/j.jml.2019.104047
18. Trauzettel-Klosinski, S., Dietz, K. (2012). Standardized assessment of reading performance: the new International Reading Speed Texts IReST. *IOVS* 53(9):5452. doi:10.1167/iovs.11-8284
19. FCAI / Aalto, "Smartphone typing speeds catching up with keyboards" (2019, 37 bin gönüllü, iki başparmak ort. 38 kelime/dk): https://fcai.fi/news/2019/10/2/smartphone-typing-speeds-catching-up-with-keyboards
20. Daily Mail (2 Ekim 2019; aynı çalışma, yaşa göre 39,6 → 26,3 kelime/dk): https://www.pressreader.com/uk/daily-mail/20191002/281543702661510
21. Smith, A. L., Chaparro, B. S. (2015). Smartphone text input method performance, usability, and preference with younger and older adults. *Human Factors*: https://portfolio.erau.edu/en/publications/smartphone-text-input-method-performance-usability-and-preference/
22. Küçük dokunmatik ekranda yaşlı yetişkinlerin hedef seçimi (ACM, doi:10.1145/3300178).

Not: medium.com ve support.kahoot.com bu oturumda doğrudan açılamadı (ağ izni). [7] ve [8]'deki rakamlar arama sonucu özetlerinden alındı.

## Yeniden üretmek

- `node test/timing.test.mjs`: model, tip dağılımı (v0.6 → v0.7) ve bölüm 9'daki denetim oyuncusu.
- Playwright düzeneği (oturum dışı, scratchpad):
  - Kartı açmak için `app.debugScene({show:'question', type, cat})` kullanılır.
  - `ui.question` sarılarak istenen soru gösterilir.
  - Girdiler `page.touchscreen.tap` ve `page.mouse` ile verilir. Zamanlama sayfa saatine göre (`performance.now() − kart açılışı`) planlanır.
