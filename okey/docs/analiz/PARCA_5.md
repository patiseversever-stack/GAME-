# Parça 5 — Admin paneli (okey yönetim alanı)

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

## Süre sınırı (önemli)

Bu analiz **hızlı ve derin** olmalı. Hedef: bir parça en fazla **60–90 dakika** sürsün.
- **Toplu testleri ekransız çalıştır.** Kural motorunu doğrudan kullan, ekran çizme. Örnek: `src/game/sim.js`
  içindeki `playMatch`. Ölçüm: 100 maç klasikte yaklaşık 40 sn, 101'de yaklaşık 13 sn sürüyor.
  Saf fonksiyon testleri (dizme, toplam hesabı) 10.000 elde bile saniyeler sürer.
- **Ekranlı (tarayıcı) denemeleri az ve hedefli yap.** Her soru için 1–3 örnek ve ekran görüntüsü yeterli.
  Tarayıcıda uzun maç oynatma; gereken ana gelmek için oyunun test kancalarını (`window.__okey`) kullan.
- Uzun süren işleri arka planda başlat, beklerken kodu incele.
- Bir test 5 dakikayı geçerse durdur, nedenini rapora yaz ve devam et.

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

Çıktı: `docs/analiz/RAPOR_05.md`, ekran görüntüleri: `docs/analiz/ss/05/`.
Rapor öneki: `ADMIN`.

Amaç: Oyunun her şeyini kod yazmadan, admin panelinden yönetebilmek. Panel de oyun kadar premium olmalı:
- Hızlı ve net.
- Mevcut tasarım dili: koyu zemin, cam yüzeyler, altın vurgu.
- Bir ayarı değiştirmek birkaç saniye sürmeli.
- Ek maliyet yaratmamalı.

---

## 5.1 Mevcut durum

- Bir admin paneli var mı? sanane-main içinde mi, ayrı mı?
- Teknolojisi ve barındırma yeri (ek maliyet?).
- Giriş ve yetki:
  - roller (sahip, moderatör, destek)
  - iki adımlı doğrulama
  - **yetki kontrolü sunucuda mı?**
- **İşlem kaydı (audit log):** Kim, ne zaman, neyi değiştirdi?
- Okey bölümü var mı? Varsa her ekranının görüntüsünü al.

## 5.2 İstenen yetenekler

Her yetenek için şunları yaz:
- durum (`VAR` / `KISMEN` / `YOK`)
- nasıl yapılmalı (ekran ve veri)
- efor
- maliyet etkisi

1. **Canlı panel:**
   - aktif oyuncu sayısı; açık oda ve masa sayısı
   - bugünkü maç sayısı
   - hata oranı
   - **Cloudflare kota kullanımı ve tahmini aylık maliyet**
   - son 7 ve 30 günün grafikleri
2. **Bakım modu:**
   - zamanlanmış başlangıç ve bitiş
   - oyunculara geri sayımlı duyuru
   - yeni maç başlatmayı durdurup süren maçların bitmesine izin verme
   - bakım ekranının metni
3. **Sınırlar ve koruma:**
   - azami oda sayısı
   - azami eş zamanlı oyuncu
   - kişi başı oda sınırı
   - **acil kapatma anahtarı** (çevrim içiyi tek tuşla kapat, çevrim dışı oyun çalışmaya devam etsin)
4. **Duyurular:**
   - menü afişi ve masa içi duyuru
   - zamanlanmış duyuru
   - hedef kitle (herkes, seviye aralığı, yeni oyuncular)
   - görsel ve buton desteği
5. **Turnuva yönetimi:**
   - oluşturma: kurallar, giriş ücreti, ödüller, zaman
   - başlatma, durdurma, iptal / iade
   - canlı izleme ve sonuçlar
6. **Oyuncu yönetimi:**
   - ad / ID ile arama
   - profil, maç geçmişi, çip hareket defteri
   - çip düzeltme (gerekçe zorunlu, deftere yazılır)
   - ad değiştirme
   - süreli susturma ve yasaklama
   - **şikayet kuyruğu** (sohbet kayıtlarıyla)
   - hile sinyalleri listesi
7. **Ekonomi ayarları:**
   - ödül miktarları
   - masa girişleri
   - hediye fiyatları
   - günlük bonus
   - iflas yardımı
   - reklam kuralları (gerekli reklam sayısı, bekleme süresi, günlük sınır)
8. **İçerik:**
   - Çarşı ürünleri: ekle, gizle, fiyat, öne çıkar, sıra
   - etkinlik / sezon temaları
   - yeni çerçeve ve efekt açma
   - kampanya ve indirim
   - hazır sohbet mesajları
9. **Oyun ayarları:**
   - sıra süresi
   - bot zorluğu ve hızı
   - varsayılan kural setleri
   - kural varyasyonlarını aç / kapat
10. **Özellik bayrakları (feature flags):** Özellikleri koda dokunmadan aç / kapat. Yüzdeyle açma (önce %10).
    Basit A/B testi.
11. **Sürüm yönetimi:** Asgari uygulama sürümü ve zorunlu güncelleme ekranı metni.
12. **Loglar ve hatalar:** Son hatalar, şüpheli hareketler, maliyet uyarıları.
13. **Sıralama yönetimi:** Dönem ödülleri, hileli kaydı silme, sezon başlatma.

## 5.3 Ayarlar oyuna nasıl ulaşmalı (ek maliyet olmadan)

- Bugün ayarlar nerede duruyor? Kodda sabit mi, D1'de mi?
- Önerilen yapı:
  - D1'de tek bir ayar tablosu.
  - Önbellekli tek bir "config" uç noktası.
  - Sürüm numarasıyla önbellek geçersizleştirme.
  - İstemci açılışta bir kez ister, değişince bildirim alır.

  Bunun maliyetini hesapla.
- **Canlı masalara etki:** Ayar değişince süren maçlar etkileniyor mu? Etkilenmemeli; yeni ayar bir sonraki maçta
  uygulanmalı.

## 5.4 Tasarım

- Paneldeki her ekranın listesi: var olan / eksik, kalite puanı (1–10).
- Önerilen bilgi mimarisi (menü yapısı) ve ana ekranın taslak açıklaması.
- Mobilde de kullanılabiliyor mu (acil bakım için)?

## 5.5 Ek: senin bulacakların

Başarılı oyunların yönetim panellerinde olup bizde olmayan her şey. Örnekler:
- segment bazlı ödül dağıtma
- geri sayımlı etkinlik
- oyuncuya özel mesaj
- toplu çip iadesi
- dışa aktarma
