# Parça 1 — Çözüm talimatı

Bu dosya, `docs/analiz/RAPOR_01.md` raporundaki bulguları düzeltmek içindir. Kararları oyunun sahibi verdi; aşağıda
kesin olarak yazılıdır. Karar verilmiş bir konuyu yeniden sorma, tartışma. Bulgu kimlikleri (MOD-01, SKOR-01 …)
rapordakilerle aynıdır.

## 0. Çalışma kuralları

1. **Ürün kodunu değiştirmek artık serbest.** Deploy etme, bulutta kaynak oluşturma ve ücretli bir şey açma hâlâ yasak.
2. **Sırayla çalış.**
   - Aşağıdaki adımları (1 → 7) sırayla yap. Her adımın sonunda testleri çalıştır ve **ayrı commit** at.
   - Bir adım bozulursa sonrakine geçme; düzelt.
3. **Kural motoru tek olsun.** Tüm kural ve puan değişiklikleri `src/game/` içinde yapılsın. Sunucu (`server/`) aynı
   motoru kullandığı için çevrim içi de otomatik düzelir. Çevrim dışı ile çevrim içi arasında kural farkı kalmasın.
   Çevrim içi kazanan hesabının ayrı kopyası (`online-controller.js` ~760) da ortak koda bağlansın.
4. **Bozulmaması gerekenler** (`docs/HANDOFF.md` §4):
   - `window.__okey`, `window.__menu`, `window.__okeyReplayIntro`
   - `header.h4-top` / `.h4-ic`
   - `PatiOkeyHost` köprüsü
   - el sonu ekranında `.is-result` sınıfı, "Yeni oyun" düğme adı ve düğme sayıları (maç sonu 2, el sonu 3)
5. **Testler:**
   - Analizde yazdığın betikleri (`tools/analiz/*.mjs`) kalıcı teste dönüştür: `tests/` altında, `npm test` ile çalışsın.
   - Her adımdan sonra `npm test`, sunucu birim testleri ve uzun koşu (`uzun-kosu.mjs`, her mod 100 maç, ekransız)
     temiz geçmeli.
   - Yeni her kurala en az bir senaryo testi ekle.
6. **Tasarım:**
   - Yeni ve değişen her ekran mevcut tasarım diliyle aynı olsun: koyu zemin, cam yüzeyler, altın vurgu, serif başlık,
     akıcı animasyon. Apple kalitesi; hiçbir şey üst üste binmesin.
   - Her ekranı 568×320, 844×390 ve 932×430'da test et. Önce/sonra ekran görüntülerini `docs/analiz/ss/01-cozum/`
     klasörüne koy.
7. **Hız.** Gereksiz tekrar ve uzun ekranlı test yok. Toplu testler ekransız.

---

## 1. Sahibin kararları (kesin)

### Oyun ayarları ve modlar

| # | Konu | Karar |
| --- | --- | --- |
| K1 | Oyun öncesi ayar seçimi (MOD-01) | **Evet.** Çevrim dışında da oyundan önce el sayısı ve "kaçtan geriye" seçilebilsin. |
| K2 | Eşli oyun (MOD-03) | **Evet, eklensin.** Önce botlarla çevrim dışı, hemen ardından çevrim içi. Kuralları K12'de. |
| K3 | Maç sonu eşitlik (PUAN-02, AKIS-01) | **İkisi de birinci.** Ekranda "Berabere" yazsın. Deste bitip berabere kalan tek el galibiyet sayılmasın. |

### 101 kuralları

| # | Konu | Karar |
| --- | --- | --- |
| K4 | Cezalı taş atmadan önce uyarı (KURAL-20) | **Uyarı OLMASIN.** Atmadan önce onay penceresi ya da ıstakada "işlek" işareti ekleme. Ceza bildirimi (attıktan sonra) kalsın. |
| K5 | Masadaki okeyi geri alma (KURAL-21, KURAL-27, BOT-13) | **İnsan oyuncu da alabilsin.** Okeyi koyan oyuncuya +101 yazılsın. Eşli oyunda bu ceza okeyi koyanın takımına yazılsın. |
| K7 | Yandan alınan taşı ATANA ceza, taş×10 / çiftte ×20 (KURAL-26) | **Sadece açılışta.** Taşı alan o taşla AÇARSA atana ceza yazılır. İşlemede ve sonraki ek per indirmede yazılmaz. |
| K8 | Yandan alıp kullanamama (KURAL-25) | **Şimdiki gibi kalsın.** Oyuncu taşı cezasız geri bırakıp ortadan çekebilir. Değişiklik yok. |
| K9 | Elde kalan okey cezası (PUAN-12) | **Düz 101.** Açmış oyuncunun elinde kalan okey için yüz değeri eklenmesin. Okeyle bitişte katlanma kuralı aynı kalsın. |
| K10 | Elden bitme ve katlamalı (KURAL-23, KURAL-30) | 4 madde, aşağıda. |
| K11 | Dört oyuncu da çiftle açarsa (PUAN-11) | **Şimdiki gibi kalsın.** El iptal olur, el içindeki cezalar da silinir (`allPairsSettlement:'none'`). |

**K10 ayrıntıları:**
- **Kimse açmamışken, hiç açmadan tek seferde bitirme ("elden"):** Uluslararası (global) kural uygulansın:
  - Bitiren −202, açmayan rakipler ×2 ceza alır (202 → 404).
  - Okeyle elden bitişte ("kafa okey") bitiren −404, açmayanlar 808.

  Bugünkü motor zaten böyle (K-13a/b/c); koru. Sahip "rakiplere 808" demişti; bu değer okeyle elden bitişte geçerli.
- **Başkaları açmışken, ben hiç açmadan tek seferde bitirirsem:** Global kural uygulansın. Bu da "elden" sayılır
  (−202, ×2). Başkasının açmış olması şart değildir (pagat, jawaker).
- **Tek seferde bitirişte açılış eşiği aranmasın.** Hem sabit 101'de hem katlamalıda geçerli.
  - Örnek: Katlamalıda masada biri 130'la açmış. Benim elim katlamalı eşiğe (131) yetmiyor. Ama bütün elimi işleme
    yapmadan geçerli perlere dizip son taşı atabiliyorsam **bitirebilirim.**
  - Bugün başkası açmışken bu durumda 101 / katlamalı eşiği aranıyor (K-13f); bunu kaldır.
- **Kurallar kitabı:** Oyunun kurallar sayfası tüm bu kuralları açık ve net Türkçeyle yazsın. Ayrıntı K13'te.

### Klasik kuralları

| # | Konu | Karar |
| --- | --- | --- |
| K6 | Klasikte atılan okey (KURAL-01) | **Sıradaki oyuncu alabilsin** (yandan alınabilir). |
| K14 | Klasikte deste bitişi (KURAL-02, AKIS-16) | **Son taş çekilip atılınca el berabere bitsin.** Sonsuz yandan alma döngüsü kalksın. Deste boşken "Ortadan taş çek" yazısı çıkmasın. |

### Eşli oyun kuralları

**K12 — Eşli kuralları:**
- **Oturma:** Eşler karşılıklı oturur. Koltuk 0 ile 2 bir takım, 1 ile 3 diğer takım. Sıra yönü aynı kalır, böylece
  sol komşu her zaman rakiptir.
- **101 eşli:**
  - Biri bitirince bitirenin takımı −101 alır (okeyle bitişte −202 vb., normal bitiş türü katsayılarıyla).
  - **Bitirenin eşinin elinde kalan taşlar sayılmaz (0).**
  - Rakip takıma iki oyuncunun cezalarının **toplamı** yazılır.
  - El içi cezalar (okey atma, işlek, okey geri aldırma, yan taş) cezayı yiyen oyuncunun takımına yazılır.
  - Maç sonunda en düşük takım toplamı kazanır. Eşitlikte K3 geçerli.
- **Klasik eşli:**
  - Takımın tek bir puanı vardır (seçilen sayıdan geriye).
  - Biri bitirince **karşı takım** puan kaybeder (normal −2, okeyle −4, çift −4 …).
  - Gösterge gösterilince karşı takım −1.
  - Bir takım 0'a ya da altına inince maç biter.
- **Ekranlar:** Skor, el sonu, oyun özeti ve maç sonu takım satırı göstersin ("Sen + Ayşe · Takım A"). Eşin koltuğu masada
  belirgin olsun (ince renk kuşağı ya da "Eşin" etiketi).
- **Botlar:** Bot, eşine yarayacak taşı atmayı tercih etsin, rakibi beslemekten kaçınsın. Basit bir sezgi yeterli.

### Ekranlar ve akış

| # | Konu | Karar |
| --- | --- | --- |
| K15 | El sonu ceza dökümü (SKOR-01, SKOR-02) | **Evet.** Ayrıntı aşağıda. |
| K16 | Çay molası (AKIS-13) | **Botlar beklesin.** Molada çevrim dışı oyun tamamen durur. Çevrim içinde mola yok ya da sadece kendi ekranını gizler; masayı durdurmaz. |
| K17 | Masaya dokununca bot hızlandırma (AKIS-17) | **Hayır, eklenmesin.** Bot hızı yalnız Ayarlar'dan değişir. |

**K15 ayrıntıları:**
- Herkesin elinde kalan taşlar ve gerekçeli cezalar görünsün. Örnekler: "Açmadı: 202", "Elde okey: 101",
  "Okey attı: +101", "Yan taş: +80", "İşlek attı: +101". Puan tablosunda el el sütunlar ve kalın toplam olsun.
- **Önce mevcut 2 sayfaya sığdırmayı dene.** Tasarım karışık ya da sıkışık durursa ayrı bir 3. sayfa ("Eller") ekle.
  Karar senin, ama ölçüt şu: 568×320'de okunaklı, kalabalık değil, premium.
- Oyuncu dökümü sonraki elin geri sayımı bitene kadar inceleyebilsin. Çevrim içinde geri sayım ve sayfa gezinme
  birlikte görünsün. Çevrim dışında "Sonraki el" düğmesine basana kadar ekranda kalsın.

### Senin vereceğin kararlar (sahip sana bıraktı)

En yaygın kahvehane / global kurala göre uygula ve **kurallar kitabına yaz:**
- **Gösterge puanı (PUAN-01):** El kaydına ve `breakdown`'a girsin. El sonu ekranında ayrı bir "Gösterge −1" satırı ya da
  rozeti olarak görünsün, toplama dahil edilsin.
- **12-13-1 (KURAL-28):** 101'de kapalı kalsın (varsayılan zaten kapalı). Klasikte geçerli kalsın.
- **Seriyle açan oyuncu çift indirebiliyor (KURAL-24):** Kapat. Seriyle açan sonradan çift indiremez.
- **Katlamalı tanımı (KURAL-30):** "En yüksek açılış +1" kalsın. Masada açılış eşiğini gösteren küçük bir rozet olsun
  ("Açılış: 131").
- **Çifte gitme ilanı (KURAL-05):** İlan gerekmesin; kurallar kitabında yazsın.
- **101 deste bitişi (KURAL-40):** Hesaplaşma "hand" kalsın. Botların bitirme isteği düzeltilsin (BOT-10).
- **Dağıtan (KURAL-41):** Masada başlayan oyuncuya küçük bir işaret.

---

## 2. Adımlar

### Adım 1 — Motor ve veri temeli (hatalar)

1. **PUAN-02 + AKIS-01:** Motor `matchWinners` (birden çok kazanan olabilir) ve "berabere" bilgisi üretsin. Ekran,
   profil ve istatistik bunu okusun.
   - Eşitlikte "Berabere" yazsın, iki kişi de birinci sayılsın.
   - Berabere biten tek el galibiyet sayılmasın (K3).
2. **PUAN-01:** Gösterge düşüşü el kaydına (`deltas` ya da ayrı alan) ve `breakdown.indicator`'a girsin. Toplamlar
   el geçmişiyle tutarlı olsun.
3. **AKIS-12:** El geçmişi (`history`) motor durumuna ve kayda girsin; uygulama kapanıp açılınca kaybolmasın.
   Çevrim içi sunucu görünümüne de eklensin.
4. **AKIS-11:** El sonu ekranındayken uygulama kapanıp açılırsa el ikinci kez işlenmesin (`recordedRound` benzeri
   bir işaret). XP ve istatistik çift yazılmasın.
5. **KURAL-03:** `normalizeRules` gelen değerleri doğrulasın: geçersiz `startScore`, `rounds` ve `matchType` güvenli
   varsayılana düşsün.
6. **AKIS-15:** Kayıtlı oyun varken yeni oyun başlatmadan önce "Kayıtlı oyun silinecek" onayı sorulsun.

### Adım 2 — Kural değişiklikleri (motor)

1. **K6:** Klasikte atılan okey yandan alınabilsin (KURAL-01).
2. **K14:** Klasikte son taş çekilip atılınca el berabere bitsin (KURAL-02, AKIS-16).
3. **K7:** Yan taş cezası sadece açılışta (KURAL-26).
4. **K9:** Elde kalan okey düz 101 (PUAN-12).
5. **K10 — elden bitme:**
   - Başkası açmış olsa da hiç açmamış oyuncunun tek seferde bitişi "elden" sayılsın (KURAL-23).
   - Tek seferde bitişte açılış eşiği aranmasın; sabit ve katlamalıda geçerli.
   - Kafa okey değerleri korunsun.
6. **KURAL-24:** Seriyle açan çift indiremesin.
7. **K11 ve K8:** Değişiklik yok. Mevcut davranışı senaryo testiyle sabitle, ileride bozulmasın.

Her madde için `tests/` altına senaryo testi ekle.

### Adım 3 — Kural ve ayar yüzeyi

1. **MOD-01 + MOD-06 + K1 — çevrim dışı "Masa kuralları" yaprağı.** Mod kartına dokununca, oyun başlamadan önce
   zarif bir yaprak açılsın:
   - **Klasik:**
     - "Tek el" ya da "Puanla". Puanla seçilirse başlangıç puanı: 10 / 15 / 20 / 25 (varsayılan 20).
     - Eşli / Eşsiz.
     - Rakip seviyesi.
   - **101:**
     - El sayısı: 1 / 3 / 5 / 7 / 9 / 11 (varsayılan 5).
     - Açılış: Sabit 101 / Katlamalı.
     - Eşli / Eşsiz.
     - Rakip seviyesi.
   - Her satırın altında bir cümlelik açıklama olsun (MOD-07).
   - "Kurallar kitabı" bağlantısı olsun.
   - Seçimler hatırlansın.
   - Ayarlar'daki ölü `lastRounds101`, `opening`, `wrapHigh101` ve `colorFinish` anahtarlarını buraya bağla ya da temizle.
2. **MOD-05 + MOD-02 — çevrim içi "Oda kur".** Aynı seçenekler ve tek bir liste olsun:
   - El sayısı listesi `protocol.js`'ten istemciye gelsin.
   - Protokole doğrulanmış bir `rules` alt nesnesi eklensin. Sunucu yalnız izinli alanları ve değerleri kabul etsin.
   - Odaya girenler künyede kuralları görsün ("101 · 5 el · Katlamalı · Eşli").
   - "Hızlı oyun" ile "Oda kur" varsayılanları tutarlı olsun.
3. **MOD-04 — masa künyesi.** Masada küçük, şık bir künye olsun:
   - "101 · El 2/5 · Katlamalı · Eşli"
   - Klasikte "Klasik · 20'den geriye"
   - Katlamalıda açılış eşiği rozeti
4. **K13 — kurallar kitabı.** Mevcut kurallar sayfasını eksiksiz bir kurallar kitabına çevir. Bölümler:
   - Klasik
   - 101
   - Katlamalı
   - Eşli
   - Puanlama ve tüm ceza tablosu (değerlerle)
   - Elden bitme ve kafa okey
   - Okeyi geri alma
   - Yan taş
   - Deste bitince
   - Eşitlik
   - Çifte

   Sade, net Türkçe, örneklerle. İçerik okunabilir ve aranabilir olsun (başlıklar, kısa paragraflar).
5. **MOD-08 ve SKOR-07:** 568×320 taşma sorunlarını düzelt.

### Adım 4 — Skor ekranları

1. **SKOR-01 + SKOR-02 + K15:**
   - Ceza dökümü ve el el cetvel, toplam satırıyla.
   - Gösterge satırı (PUAN-01).
   - Eşitlik "Berabere" gösterimi.
2. **SKOR-03:** Masadaki skor plakasına dokununca "Oyun özeti" açılsın. Yatayda da erişilebilir olsun.
3. **SKOR-05:** Oyun özeti cetvelinde sütun başlıkları (oyuncu adı ve el numarası) ve kural künyesi olsun.
4. **SKOR-04:** Maç sonu ekranında tam el geçmişi ve kısa maç istatistiği olsun (en iyi el, toplam ceza, açılış sayısı).

### Adım 5 — Okeyi geri alma, bildirimler ve akış

1. **K5 — insan için "Okeyi al" etkileşimi.**
   - Masadaki okeye dokununca, ya da elindeki gerçek taşı okeyin üstüne sürükleyince, okey alınsın.
   - Geçerli olduğunda belirgin, şık bir vurgu olsun.
   - Okeyi koyana +101 yazılsın; eşlide okeyi koyanın takımına.
   - **BOT-13:** Botların okey geri alma kararı koşulsuz olmasın; mantıklı olduğunda alsınlar.
2. **BILDIRIM-01:** Bildirimler öncelikli bir kuyrukla gelsin. Ceza mesajı en az 2,5 sn görünsün, yeni mesaj onu silmesin.
3. **BILDIRIM-03:** "X işledi" ve "X okeyi geri aldı" görünür, kısa ve şık bir bildirimle verilsin.
4. **BILDIRIM-06:** Bildirim geçmişi olsun: son 20 olay, ufak bir düğmeyle açılsın.
5. **BILDIRIM-05:** "Destede 5 taş kaldı" uyarısı.
6. **BILDIRIM-04:** 101'de deste bitince doğru metin: "Deste bitti · Cezalar yazıldı".
7. **K16 — mola:** Çevrim dışında mola botları da durdursun; metin buna uygun olsun.
8. **AKIS-14 ve AKIS-04:**
   - Kayıt bot hamlelerini de içersin.
   - Bot turunun sessizce kesilme riski giderilsin.
9. **KURAL-41:** Başlayan oyuncuya küçük bir işaret.
10. **K4 notu:** Atmadan önce uyarı ekleme.
11. **K17 notu:** Hızlandırma ekleme.

### Adım 6 — Botlar

1. **BOT-10:** 101'de açtıktan sonra "bitirmeye yönel" planı. Yan taş besleme maliyetini değerlendirmeye kat.
   - Hedef: deste bitişi oranı belirgin şekilde düşsün. Önce/sonra ölç ve raporla.
2. **BOT-11:** 101 Uzman, Normal'den açıkça iyi olsun. 200+ maçlık ekransız koşuyla ölç ve raporla.
3. **BOT-12:** Kolay botun bilerek yaptığı hatalar makul düzeyde kalsın.
4. Uzun koşu, yeni kurallarla 0 hata vermeli.

### Adım 7 — Eşli oyun (K2, K12)

1. Motor: takım kavramı, takım puanı, eşli puanlama (101 ve klasik). Senaryo testleri: her bitiş türü ve el içi cezalar
   takım bazında.
2. Çevrim dışı eşli (botlarla). Ekranlar: kural yaprağı, masa, el sonu, oyun özeti, maç sonu.
3. Çevrim içi eşli: oda kurarken "Eşli", koltuk seçiminde eş gösterimi, sunucu doğrulaması.
4. Uzun koşu eşli modda da 100 maç, 0 hata.

---

## 3. Bitince

1. `docs/analiz/RAPOR_01_COZUM.md` dosyasını yaz:
   - **Bulgu tablosu:** Her bulgu kimliği için durum (`DÜZELDİ` / `KARAR GEREĞİ DEĞİŞMEDİ` / `ERTELENDİ` + neden),
     ne yapıldığı (dosya:satır) ve hangi test kapsıyor.
   - **Sahip kararları tablosu:** K1–K17'nin her birinin nasıl uygulandığı.
   - **Test sonuçları:** `npm test`, sunucu testleri, uzun koşu (her mod ve eşli). Ölçümler: deste bitiş oranı ve bot
     zorluk farkı (önce/sonra).
   - **Ekran görüntüleri:** Önce/sonra (`docs/analiz/ss/01-cozum/`), üç boyutta. Görüntülenecek ekranlar:
     - kural yaprağı
     - oda kur
     - masa künyesi
     - el sonu (ceza dökümü)
     - oyun özeti
     - maç sonu
     - okey geri alma
     - bildirim geçmişi
     - kurallar kitabı
     - eşli masa
   - **Bilinen eksikler:** Kalan bir şey varsa.
2. Derle (`npm run build`), commit et.
3. Son mesajın şu olsun:

   ```
   Parça 1 düzeltildi. Testler: … Parça 2'ye hazırız.
   ```
