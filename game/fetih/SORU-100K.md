# Soru bankası 100 bin planı

**Durum: BAŞLANMADI.** Kullanıcı açıkça "başla" demeden hiçbir aşamaya geçilmez (15 Kasım 2026 kararı).
Banka bugün 20.103 soru (sayım: `tools/soru/sayim/2026-11-15_20103.json`).

## Kullanıcının şartları (değişmez)

- Dünya standardında ilerlenir. Saçma, anlamsız ya da yanlış soru olmaz.
- Türkçe kusursuz olur (TDK Yazım Kılavuzu).
- Soru ve şıklar her ekrana sığar. Taşmaz, binmez, kesilmez. Her şey bizim ekranımıza uygun olur.
- Testler her adımda koşulur.
- Her tip için en çok karakter sayısı ölçülür ve teste bağlanır. Tiplere göre güvenli ilerlenir.
- Oyuncudan soru alınmaz. Kaynak: açık veri, yapay zekâ yazımı, bağımsız denetim.
- Ajan: aynı anda en çok 2 (kota yetmiyor), kullanıcı izin verirse 4. Sırayı ben belirlerim. Gerekirse ajanın işini ben devralırım.
- Her değişiklik için Türkçe commit atılır ve `claude/eloquent-feynman-h3ctvm` dalına gönderilir.
- Yayın temiz `git archive` kurulumundan yapılır: oyun, galeri ve defter birlikte.

## Dünya standardı: kabul ölçütleri

**İçerik**

1. **Tek doğru cevap.** Çeldiriciler kesin yanlış ve aynı sınıftan olur (yazar sorusunda hep yazar). "Hepsi", "Hiçbiri", "A ve B" yok.
2. **Kaynak.** Her bilgi bir kaynağa dayanır: Wikidata, TÜİK, ansiklopedi. Veriden üretilen soruda kaynak kimliği soruyla birlikte saklanır, böylece izlenebilir.
3. **Kesin bilgi.** Tartışmalı, çabuk eskiyen, bölgeye göre değişen, kalıp yargı içeren bilgi yok.
4. **Tanınırlık ve zorluk.** Bilgi, Türk oyuncunun makul olarak bilebileceği türden olur; "yalnız uzman bilir" soru yok. Zorluk: kolay en az %25, zor en çok %30.
5. **Ele vermeme ve tekrar yok.**
   - Kök cevabı ele vermez.
   - Kök başka bir sorunun cevabını açmaz.
   - Bankada aynı bilgi başka tipte sorulmamıştır (`tools/denetim/parca.mjs`, `yakin.mjs`).
6. **Türkçe.** TDK Yazım Kılavuzu esas. Şablonlu sorularda ekleri bir ek üretici kurar ve birim testi vardır:
   - Ünlü uyumu ve ünsüz benzeşmesi: Kars'ta, Erzurum'da, Sinop'ta, 1923'te, Ankara'ya.
   - Kaynaştırma harfi: Ordu'ya.
   - Sayının okunuşuna göre ek: 1'de, 3'te, 6'da, 40'ta, 100'de.
   - "mi" ayrı yazılır; büyük harf kuralları.
7. **İki bağımsız göz.**
   - Elle yazılan her soru yazar dışında en az bir denetçiden geçer.
   - Veriden üretilen ailelerde her şablon tek tek denetlenir, ayrıca rastgele 200 soruluk örneklem alınır.
   - Örneklemde 1'den fazla hata çıkarsa (yaklaşık %0,5) aile durdurulur, düzeltilir, yeniden örneklenir.
8. **Maç dengesi.** Bir şablon ailesi maç başına sınırlıdır. Benzetimde "100 maçta aynı kalıp kaç kez çıktı" ölçülür.

**Ekran**

- **Boylar:** `tools/denetim/cakisma.cjs` BOYLAR: 320×568 (en dar), 360×640, 375×667, 390×844, 412×915, 430×932, 768×1024, 1280×720.
- **Evreler:** soru, joker, cevap.
- **Sınır = kanıtlanmış zarf.** Her tip ve her alan için en çok karakter ile en uzun kelime ölçülür. Ölçüm sahte en kötü durum sorularıyla yapılır: bütün alanlar aynı anda en uzun, en geniş harfler (Ğ Ş M W Ö Ü). Sınırlar testte zorunlu olur. Sınırı aşan soru maça giremez.

## Ölçülen mevcut uzunluklar (15 Kasım 2026)

Kaynak: `tools/soru/sayim/2026-11-15_uzunluklar.txt`.

| Tip | Soru | Kök en çok | Kök %99 | Şık / öğe en çok | Şık %99 | En uzun kelime |
|---|---|---|---|---|---|---|
| choice | 6533 | 109 | 92 | 32 | 25 | 25 |
| tf | 2438 | 88 | 83 | – | – | 22 |
| num | 1331 | 80 | 77 | – | – | 20 |
| hang | 830 | 75 | 70 | – | – | 17 |
| order | 765 | 74 | 72 | 32 | 28 | 20 |
| match | 739 | 49 | 48 | 34 | 22 | 22 |
| odd | 702 | 60 | 58 | 23 | 19 | 20 |
| hilo | 599 | 68 | 60 | 24 | 23 | 17 |
| harfal | 475 | 87 | 83 | – | – | 18 |
| anagram | 424 | 68 | 65 | – | – | 17 |
| blitz | 342 | 44 | 41 | 78 | 64 | 22 |
| gozkarari | 310 | 106 | 102 | 28 | 25 | 18 |
| riddle | 258 | 111 | 104 | 18 | 15 | 16 |
| penalti | 158 | 76 | 74 | 22 | 19 | 15 |

Dikkat:

- **Talimat sınırları zorunlu değil.** Yazar talimatında (`tools/soru/BRIF.md`) sınırlar var: test kökü ≤ 100, şık ≤ 28, karşılaştırma ≤ 60, doğru/yanlış ≤ 85. Bunları aşan eski sorular var; ekran denetiminden geçmişler ama hiçbir test bu sınırları zorlamıyor.
- **Testte zorunlu olan tek sınırlar** yalnız şu tiplerde var: Penaltı, Balon, Tünel, Kelime Avı, Mayın, Rota, Harita sorusu (`test/yeni*.test.mjs`, `test/harita.test.mjs`).
- **Denetçinin kör noktası.** `cakisma.cjs` yazısız öğenin ekrandan taşmasını görmüyor. Anagramın boş kutuları 320 genişlikte ekrandan taşıyordu ve denetçi yakalamadı (düzeltildi: 64ddd54). Aşama 0'da denetçiye eklenecek.

## Aşamalar

Her aşamanın sonunda bir kapı var. Kapıdan geçmeyen iş maça girmez. Her adım ayrı commit'te olur ve geri alınabilir.

### Aşama 0: Altyapı ve güvenlik kapıları (yeni soru yok, ajan yok)

1. **Uzunluk sözleşmesi.**
   - `src/quiz/sinirlar.js`: tip → alan → en çok karakter ve en uzun kelime.
   - `test/sinir.test.mjs`: bütün bankayı tarar.
   - Bugün sınırı aşan sorular ya kısaltılır ya da sınır ölçümle doğrulanır.
2. **Stres denetimi.**
   - Galeriye sınama kancası eklenir: `window.__galSoru(q)` sahte soruyu açar.
   - `cakisma.cjs`'e sahte soru kipi eklenir.
   - Her tip için en kötü durum soruları 8 boyda ve 3 evrede denetlenir. Sınır, temiz çıkana dek düşürülür.
3. **Denetçi eksikleri.** Yazısız öğelerin (boş kutu, yuva, kart) ekran dışına taşması da ölçülür.
4. **Türkçe kapısı.**
   - Ek üretici ve birim testleri yazılır.
   - `icerik.mjs` genişletilir: kesme işareti, ünlü uyumu, büyük harf, "mi" ayrı, yazım yanlışı sözlüğü.
5. **Bankayı oyun dosyasından ayırma.**
   - Sorular sıkıştırılmış parça dosyalara geçer ve menü açıldıktan sonra yüklenir.
   - Oyun dosyasının içinde küçük bir başlangıç paketi kalır.
   - Hedef: oyun dosyası 6 MB'ın altında; yayın sınırı 16 MB. Açılış 4× yavaş işlemcide 8,6 sn'nin altına iner (bugün 9,7 sn).
6. **Soru hafızası bit dizisine geçer.**
   - Her sorunun kalıcı bir sıra numarası olur. 100 bin soru yaklaşık 12,5 KB tutar (bugün 25 bin kimlik için 570 KB).
   - Eski kayıtlar otomatik dönüştürülür; çevrimiçi özet de küçülür.
7. **Kalıcı kimlik.** Veriden üretilen sorunun kimliği kaynaktan gelir: `wd-<şablon>-<Q numarası>`.
8. **Araçların ölçeklenmesi.** `yakin`, `parca` ve `icerik` 100 binde çalışır. Testler veri ailelerinde örneklemle koşar.
9. **Ağ izni.** `query.wikidata.org` ve `www.wikidata.org` bu ortamdan şu an kapalı (vekil sunucu 403 veriyor). Ekleme isteğini kullanıcı onaylar.

**Kapı:**
- Bütün testler yeşil.
- Stres denetimi 8 boy × 3 evrede temiz.
- Açılış ölçümü hedefte.
- Eski kayıtların dönüşümü sınanmış.
- Yayın yapılmış ve kullanıcı onaylamış.

### Aşama 1: Pilot (yaklaşık 1.500 soru, 2 aile)

**Aileler:**
- Türkiye ilçeleri: "Hangi ilde?" ve haritada bul, 973 ilçe.
- Ünlü kişinin doğum yılı: "kim daha yakın".

**Üretim kuralları:**
- **Tanınırlık süzgeci:** Türkçe Vikipedi sayfası olmalı ve birçok dilde tanınmalı.
- **Türkçe ad:** Doğrulanmış olmalı.
- **Sayı aralıkları:** Tahmin aralığı dengeli; karşılaştırmalar ne çok yakın ne çok bariz.
- **Yapay zekânın görevi:** Yalnız cümleyi kurar ve çeldiriciyi aynı sınıftan seçer. Bilgiyi hep veri verir.

**Akış:**
- Otomatik kapılar: biçim, uzunluk sözleşmesi, Türkçe, tekrar, ele verme.
- Örneklem: her aileden 200 soru, ben ve 1 bağımsız denetçi ajan.
- Kullanıcıya her aileden 50 örnek gösterilir.
- Maçta bu ailelerin payı başta %15 ile sınırlanır.

**Kapı:** Örneklemde en çok 1 hata, ekran stres denetimi temiz, testler yeşil, kullanıcı onayı.

### Aşama 2: Aile aile büyütme (20 bin → 60–75 bin)

Sıra (tahminler veriyi görmeden yapıldı):

| Sıra | Aile | Tahmini soru |
|---|---|---|
| 1 | Türkiye derin: dağ, göl, baraj, antik kent, kale; il nüfus ve rakım | 5–8 bin |
| 2 | Dünya coğrafyası | 5–8 bin |
| 3 | Ünlü kişiler: ülke, meslek, eser | 15–25 bin |
| 4 | Eserler: kitap, film, tablo, beste; kimin ve hangi yıl | 10–15 bin |
| 5 | Spor | 4–6 bin |
| 6 | Bilim | 3–5 bin |
| 7 | Tarih: olay ve yılı | 5–10 bin |

Her aile aynı yoldan geçer:
- Veri sorgusu depoya yazılır; aynı sorgu aynı soruları yeniden üretir.
- Üretim betiği, otomatik kapılar, 200 soruluk örneklem, stres denetimi, testler.
- Ailenin kendi commit'i ve aç/kapa düğmesi olur.

**Kapı:** Her ailede örneklemde en çok 1 hata. Her 20 binde bir kullanıcı onayı.

### Aşama 3: Yazım turları (75 bin → 100 bin)

- Veri her şeyi kapsamaz: bilmece, ilginç bilgi, edebiyat ve kültür soruları elle yazılmayı ister.
- 20 bin turundaki yöntem uygulanır: ajan yazar, başka bir ajan soru soru denetler.
- Sözleşme `tools/soru/BRIF.md`'de. Yeni uzunluk sınırları ve Türkçe kapısı ona eklenecek.
- Aynı anda en çok 2–4 ajan.

**Kapı:** 20 bin turundakiyle aynı. Tekrar ve içerik taramaları, uzunluk sözleşmesi, stres denetimi, testler, benzetim.

### Aşama 4: Maç kalitesi ve güvenlik ağı

- **Pay sınırları:** Aile başına maç payı sınırlı. Tekdüzelik benzetimle ölçülür.
- **"Bu soru hatalı" düğmesi:** Oyuncu soru yazmaz, yalnız bildirir. Birkaç bildirim alan soru kendiliğinden maçtan çekilir ve denetim listesine düşer.
- **Yıllık veri tazeleme:** Nüfus gibi değişen veriler yılda bir güncellenir. Kimlik sabit kaldığı için hafıza bozulmaz.

## Kaynaklar ve lisanslar

| Kaynak | Lisans | Karar |
|---|---|---|
| Wikidata | CC0: serbest, ticari kullanım dahil, kaynak gösterme şartı yok | Ana kaynak |
| TÜİK | Kaynak göstererek serbest | İl ve ilçe sayıları |
| GeoNames, Natural Earth | Serbest | Koordinatlar ve sınırlar |
| Open Trivia DB | CC BY-SA 4.0: paylaşım şartı; yaklaşık 4 bin İngilizce soru | Kullanılmaz |
| The Trivia API | Ticari kullanım dışı (resmî sayfa doğrulanmadı) | Kullanılmaz |
| Kim Milyoner, ÖSYM, Jeopardy arşivleri, başka uygulamalar | Telifli | Asla kullanılmaz |

**Rakip araştırması (15 Kasım 2026):**
- **Bil ve Fethet:** Triviador'un Türkçe sürümü (THX Games, Macaristan; App Store kimliği 1520397866).
  - Oyuncular günde 10 test ve 10 tahmin sorusu gönderir.
  - Gönderilen soru iki kez tekrar taramasından geçer ve öteki oyuncular oylar.
- **Trivia Crack:**
  - Şirketin kendi rakamıyla 50 milyonun üstünde oyuncu sorusu var.
  - 2015'te 1 milyonu onaylıydı.
  - Gönderilenlerin binde 1–1,5'i oyuna giriyor.
- **Sonuç:** "1 milyon soru" oyuncu yazımıyla ve sert elemeyle geliyor.

## Riskler

- **Tekdüzelik:** Şablonlu sorular birbirine benzer. Çare: aile payı sınırı ve benzetim ölçümü.
- **Wikidata Türkçe etiketleri:** Bazıları yanlış ya da eksik. Çare: etiket doğrulama ve TDK yazımı kapısı.
- **Açılış süresi:** 20 binde 4× yavaş işlemcide açılış +1 sn uzadı. Aşama 0.5 olmadan büyütme yapılmaz.
- **Kota:** Yazım turları pahalı. Bu yüzden veri aileleri önce, yazım turları sonra.

## Araçlar ve kayıtlar (kalıcı, depoda)

- **`tools/soru/BRIF.md`:** Yazar ve denetçi sözleşmesi. 20 bin turunda kullanılan biçim; §8 denetçi, §9 zorluk, §10 parca, §11 sık bulgular.
- **`tools/soru/sayim.mjs <kök>`:** Tip × kategori × zorluk sayımı. Mancınık ikizleri dahil, eski sayımlarla aynı yöntem.
- **`tools/soru/tablo.mjs <eski.json> <yeni.json>`:** Eski → yeni tablo.
- **`tools/soru/sayim/`:** Sayım kayıtları (10.437 ve 20.103) ve uzunluk ölçümü.
- **`tools/denetim/`:**
  - `yakin.mjs`: aynı ya da benzer soru.
  - `parca.mjs`: başka tipte aynı bilgi.
  - `icerik.mjs`: yazım ve tutarlılık.
  - `en_uzun.mjs`: tip başına en uzun sorular.
  - `cakisma.cjs`: ekran çakışma denetimi.
- **`tools/defter/`:** Defter sayfası üreticisi (`say.mjs` → `gen.py`) ve son test özeti.
