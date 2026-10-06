# Parça 6 — Ekran envanteri, oyuncu psikolojisi, rakipler, etik / hukuk ve son tarama

> Bu dosyayı yapay zekâ kodlama aracına ver ve "Bu dosyadaki görevi yap" yaz. Dosya kendi başına eksiksizdir.

# A. Ortak kurallar (önce bunu oku)

Bu dosya Patisever Okey'in parça parça, derinlemesine analizinin bir parçasıdır (toplam 6 parça).
Sana yalnız bu parça verildi; **yalnız bunu** yap. Bu dosya kendi başına eksiksizdir, başka dosyaya ihtiyacın yok.

## Çalışma akışı

1. Bu dosyanın tamamını oku: önce ortak kurallar, sonra parçanın kendi görevi.
2. Analizi yap. Raporu proje içinde `docs/analiz/RAPOR_0N.md` olarak yaz (N = bu parçanın numarası; klasör yoksa
   oluştur), ekran görüntülerini `docs/analiz/ss/0N/` klasörüne koy. Bitince raporun **tam yolunu** söyle.
3. **Rapordan sonra dur.** Düzeltmeye başlama. Rapor başka bir yapay zekâya gider; o, düzeltme talimatını hazırlar.
4. Düzeltme talimatı gelince onu uygula. Test et. Sonunda "Parça N düzeltildi, testler: …, Parça N+1'e hazırız" diye raporla.

Elinde yarım bir iş varsa (ör. çevrim içi ekranlar), analize başlamadan önce onu bitir, testleri çalıştır ve commit et.

## Kurallar

1. **Bu bir analizdir.**
   - Ürün kodunu değiştirme.
   - Deploy etme. Bulutta kaynak oluşturma ya da silme.
   - Ücretli bir şey açma.
   - Serbest olanlar: okumak; test, derleme ve yerel sunucu çalıştırmak (`npm run dev`, `wrangler dev --local`);
     ölçmek; ekran görüntüsü almak. Ölçüm, otomatik oynatma ve senaryo betiklerini yalnız `tools/analiz/` klasörüne koy.
     Bu betikler daha sonra kalıcı teste dönüşebilir, o yüzden düzgün yaz.
2. **Gerçekten dene.** Kodu okumak yetmez. Oyunu aç, oyna, otomatik oynat, ekran görüntüsü al.
   Bir şeyin "çalıştığını" ancak gördüysen ya da ölçtüysen yaz.
   - Telefon boyutları:
     - en az 568×320 (küçük yatay)
     - 844×390 (orta)
     - 932×430 (büyük)
   - Kalite modları: Oyunda 3B (`?quality=` ile) ve DOM modu varsa ikisini de dene.
3. **Kanıt göster.** Her bulguda dosya:satır, komut çıktısı ya da ekran görüntüsü yolu olsun.
4. **Uydurma.** Her iddianın yanına durumunu yaz:
   - `ÖLÇÜLDÜ`: gördün ya da ölçtün
   - `TAHMİN`: çıkarım yaptın
   - `BİLİNMİYOR`: doğrulayamadın; nasıl doğrulanacağını da yaz
5. **Gizli bilgi.** Anahtar, token ya da parola değerlerini asla yazma, ekrana basan komut çalıştırma.
   Sadece hangi dosyada ya da hangi değişkende olduğunu söyle.
6. **Eksiksiz ol.** Parçadaki her soruya cevap ver. "Kapsam dışı" deyip geçme. Bir şey bizde yoksa `YOK` yaz ve
   nasıl olması gerektiğini öner.
7. **Soruları çoğalt.** Parçadaki listeler başlangıçtır. Okey bilgine ve kodda gördüklerine dayanarak, bizim
   sormadığımız eksik ve hataları da bul. Rapordaki "Ek bulgular" bölümü bunlar içindir.
8. **Başka parçaya ait bir şey görürsen** raporun sonundaki "Diğer parçalara notlar" bölümüne yaz, kaybolmasın.

## Bağlam (kısa)

- **Oyun:** Klasik Okey ve 101 Okey. Kaynak `src/` altında vanilla ES modülleri ve three.js. Tek dosya HTML'e derlenir,
  React Native uygulamasının (sanane-main) içinde WebView'da çalışır. Yalnız yatay ekran, Türkçe.
- **Ayrıntılar:** `docs/HANDOFF.md` ve `README.md`.
- **Kurallar:** Kural motoru `src/game/` altında. Kural ayarları `src/game/game.js` içindeki `DEFAULT_RULES` nesnesinde.
- **Kalite çıtası:** Apple seviyesi ve rakip okey oyunlarından açıkça daha iyi. Hiçbir şey üst üste binmemeli.
  Her ekran koyu zemin, cam yüzeyler, altın vurgu ve serif başlıklardan oluşan tasarım diliyle uyumlu olmalı.

## Rapor biçimi (`RAPOR_0N.md`)

1. **Özet:** En önemli 10 bulgu, tek cümle hâlinde.
2. **Kullanıcının soruları:** Parçada "Kullanıcının soruları" bölümü varsa her soruya bir satır. Biçim:

   | No | Soru | Cevap (Evet/Hayır/Kısmen) | Kanıt / ekran görüntüsü | Not |
   | --- | --- | --- | --- | --- |

3. **Durum tablosu:** Parçadaki her başlık için durum (`VAR` / `KISMEN` / `YOK`), bulgu sayısı ve tek cümle.
4. **Bulgular:** Önem sırasına göre, şu biçimde:

   ```
   ### ISTAKA-04 — "Diz" son 13'ü alt satıra atıyor, grup tanınmıyor
   - Önem: P0 (canlı öncesi şart) | P1 (önemli) | P2 (iyileştirme) | P3 (fikir)
   - Durum: ÖLÇÜLDÜ
   - Yeniden üretme: 1) … 2) … 3) …
   - Beklenen: … / Gerçekleşen: …
   - Kanıt: src/ui/rack.js:312, ss/02/istaka-04.png
   - Kök neden (biliniyorsa): …
   - Öneri: …
   - Efor: S | M | L
   ```

5. **Ek bulgular:** Bizim sormadığımız ama bulduğun her şey, aynı biçimde.
6. **Sahibine sorulacak kararlar:** Numaralı liste. Her soruda seçenekler, senin önerin ve gerekçesi.
7. **Önerilen düzeltme sırası:** Bulgu ID'leriyle, bağımlılık sırasına göre.
8. **Diğer parçalara notlar.**
9. **Ekler:** Çalıştırılan komutlar ve özet çıktıları, yazdığın betiklerin yolları, test sonuçları.

Raporu bitirince baştan sona bir kez daha oku. Parçadaki her soru ve her maddenin raporda bir karşılığı var mı,
kontrol et.

---

# B. Bu parçanın görevi

Çıktı: `docs/analiz/RAPOR_06.md`, ekran görüntüleri: `docs/analiz/ss/06/`.
Rapor öneki: `EKRAN`, `PSIKO`, `RAKIP`, `FIKIR`, `ETIK`, `HATA`.

Bu son parçadır. Önceki parçalar düzeltildikten sonra yapılır. Hem yeni konuları inceler hem de **genel son kontrol** yapar.

---

## 6.1 Ekran envanteri

Her ekran ya da durum için yaz:
- durum (`VAR` / `KISMEN` / `YOK`)
- ekran görüntüsü (568×320 ve 932×430)
- kalite puanı (1–10)
- eksikler

1. **Giriş ve başlangıç:**
   - açılış
   - ad ve avatar
   - giriş / kayıt, misafir girişi
   - nasıl oynanır / öğretici (klasik ve 101 ayrı)
2. **Ana menü:** menü, profil merkezi, Ödüller, Çarşı, ayarlar.
3. **Mod ve kural seçimi:** çevrim dışı ve çevrim içi.
4. **Çevrim içi lobi:**
   - açık odalar
   - oda kurma
   - bekleme odası
   - davet kabul
   - oda paylaşma
   - hızlı oyun bekleme
5. **Masa durumları:**
   - oyun masası (klasik, 101)
   - oyun içi skor tablosu
   - duraklatma
   - sohbet
   - hediye
   - profil kartı
6. **El ve maç sonu:** el sonu (2 sayfa), maç sonu, seviye atlama.
7. **Bağlantı ve sistem durumları:**
   - bağlanıyor / yeniden bağlanıyor
   - bağlantı koptu
   - oyuncu ayrıldı, yerine bot geçti
   - bakımda
   - sürüm eski
   - servis geçici olarak kullanılamıyor
8. **Sosyal:** arkadaşlar, istekler, bildirimler kutusu.
9. **Rekabet:** sıralamalar, turnuva listesi, ağaç ve sonuç.
10. **Ekonomi:** çip cüzdanı, hareket geçmişi, günlük ödül, iflas yardımı.
11. **Hesap:** hesap ayarları, hesap silme, yasaklandın / susturuldun bildirimi.
12. **Her liste ve akış için:** boş, yükleniyor ve hata durumları.

Tutarlılık kontrolü:
- Tasarım dili her yerde aynı mı?
- Yazı tipleri ve boşluklar tutarlı mı?
- Geri / kapat butonları hep aynı yerde mi?
- Animasyon dili tutarlı mı?

## 6.2 Oyuncu psikolojisi ve bağlılık

- **İlk deneyim:**
  - İlk 5 dakika, ilk çevrim içi maç ve ilk kayıp nasıl hissettiriyor?
  - Yeni oyuncu nerede bırakıp gidebilir? Tahmini terk noktalarını listele.
- **Bekleme boşlukları:** Eşleşme beklerken, sıra beklerken ve el sonunda ne oluyor? Sıkılma anlarını listele.
- **Sağlıklı bağlılık mekanikleri:** Var olanlar ve önerilenler.
  - günlük seri
  - görevler
  - sezonlar
  - koleksiyon
  - sosyal bağ (arkadaşla oynama, aynı masaya dönme)
  - adil eşleşme
  - kayıp sonrası teselli
  - ustalık hissi (istatistik, rozet, "en iyi elin")
- **Zayıflıklar:** Oyuncuyu bıktıracak ya da adaletsiz hissettirecek şeyler:
  - botlara karşı kayıp serisi
  - uzun bekleme
  - anlaşılmaz cezalar

## 6.3 Rakip analizi

Türkiye'deki popüler okey oyunlarını (çevrim içi ve çevrim dışı) incele. Her biri için şu tabloyu doldur:

| Oyun | Güçlü yanlar | Zayıf yanlar | Oyuncu şikâyetleri (mağaza yorumlarından temalar) | Bizim farkımız |
| --- | --- | --- | --- | --- |

Karşılaştırma alanları: tasarım, oynanış hissi, kurallar, ekonomi, sosyal özellikler, reklam yoğunluğu, hile algısı.

## 6.4 Okeye yeni bir deneyim: fikirler

En az 15 özgün fikir. Her biri için şunları yaz:
- ne olduğu
- neden fark yaratır
- efor (S/M/L)
- Cloudflare maliyet etkisi
- öncelik önerisi

Düşünülebilecek alanlar:
- kahvehane atmosferi ve sezon temaları
- el tekrarı ve "günün eli"
- arkadaş grupları ve masa geleneği
- koleksiyon setleri
- öğrenme modu ve akıllı ipucu
- izleyici modu
- takım okeyi
- günlük bulmaca eli
- usta oyuncu rozetleri
- kişisel istatistik hikâyeleri

## 6.5 Etik sınırlar ve hukuki riskler (zorunlu)

Hukuki tavsiye değil, risk listesi olarak yaz:

- **Karanlık örüntüler (dark patterns):**
  - kayıp kovalatma
  - zorla bekletip para isteme
  - yanıltıcı sayaçlar
  - "son şans" baskısı

  Mevcut ve planlanan özelliklerde bu riskler var mı? Varsa nasıl yumuşatılır?
- **Kumar sayılma riski:** Çip gerçek parayla satılırsa ve kazanılan çip herhangi bir yolla paraya ya da değerli bir
  şeye dönüşebilirse ne olur?
  - Türkiye mevzuatı (7258 sayılı Kanun)
  - App Store ve Google Play "simüle kumar" kuralları
  - yaş sınırı ve derecelendirme
- **Çocuk kullanıcılar ve KVKK:** aydınlatma metni, açık rıza, veri saklama süreleri, sohbet kayıtları.
- **Mağaza zorunlulukları:**
  - hesap silme
  - gizlilik politikası
  - reklam açıklaması
  - satın alma politikaları
- **Oyun süresi sağlığı:** Mola hatırlatma gibi öneriler.

## 6.6 Son tarama

- Önceki raporlardaki (`RAPOR_01` – `RAPOR_05`) P0 ve P1 bulgularını yeniden test et. Düzeldi mi? Tabloya yaz.
- Tüm oyunu baştan sona bir kullanıcı gibi oyna:
  - ilk açılış
  - çevrim dışı klasik ve 101
  - çevrim içi oda
  - el ve maç sonu
  - Çarşı
  - profil
- Gördüğün her yeni hatayı yaz:
  - konsol hataları
  - uzun oturumda bellek artışı (30 dakika oynat, ölç)
  - düşük donanımlı telefon benzetiminde takılmalar
- **Canlıya çıkış kontrol listesi:** Mağazaya göndermeden önce yapılacakların tam listesi.
