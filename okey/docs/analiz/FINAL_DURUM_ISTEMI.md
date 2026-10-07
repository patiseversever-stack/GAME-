# Final durum raporu — talimat

> Bu dosyayı yapay zekâ kodlama aracına ver ve "Bu dosyadaki görevi yap" yaz. Dosya kendi başına eksiksizdir.

Altı analiz parçası ve çözümleri bitti (ya da bitmek üzere). Şimdi projenin **bütün durumunu tek bir belgede**
toplayacaksın. Bu belgeyi projeyi daha önce yürüten başka bir yapay zekâ okuyacak ve kalan işleri ("Final 7")
planlayacak. O yapay zekâ koda bakamıyor; her şeyi bu belgeden anlamalı.

## 0. Kurallar

1. **Ürün kodunu değiştirme.**
   - Deploy etme. Bulutta kaynak oluşturma ya da silme. Ücretli bir şey açma.
   - Testleri, derlemeyi ve yerel sunucuyu çalıştırmak serbest.
2. **Gizli bilgi.** Anahtar, token ya da parola değerlerini asla yazma; sadece adını ve nerede tanımlı olduğunu söyle.
3. **Uydurma.** Her iddianın yanına durumunu yaz:
   - `ÖLÇÜLDÜ`: gördün ya da ölçtün
   - `TAHMİN`: çıkarım yaptın
   - `BİLİNMİYOR`: doğrulayamadın; nasıl doğrulanacağını yaz
4. **Süre:** En fazla 60 dakika. Erken biterse erken bitir.
5. **Kaynaklar:**
   - `docs/analiz/` içindeki bütün raporlar (`RAPOR_01` … `RAPOR_06` ve çözüm raporları)
   - `docs/HANDOFF.md`, `README.md`, kendi plan dosyaların
   - son commit'ler
   - kodun kendisi

---

## Adım A — Kritik sorular (önce bunu yap, sonra dur)

1. Bütün raporlarda ve kodda **hâlâ cevaplanmamış, sahibin vermesi gereken kararları** topla.
2. Yalnız **gerçekten kritik** olanları sor. Kritik demek şunlardan birine dokunmak demek:
   - para ve maliyet (Cloudflare / Supabase faturası, çip ekonomisinin gerçek parayla ilişkisi)
   - hukuk ve mağaza (kumar sayılma, hesap silme, KVKK, yaş sınırı, reklam kuralları)
   - veri kaybı ya da güvenlik
   - oyunun temel kuralı ya da oynanışı
   - canlıya çıkışı engelleyen bir şey
3. Teknik ayrıntıları, zevk tercihlerini ve senin en yaygın / en güvenli seçenekle çözebileceğin şeyleri **sorma.**
   Kendin karar ver ve raporda "Benim kararlarım" bölümüne yaz.
4. **En fazla 8 soru.** Hiç kritik soru yoksa "Kritik soru yok" yaz ve doğrudan Adım B'ye geç.
5. **Soruların biçimi.** Oyunun sahibi teknik değildir ve Türkçeyi düzgün ister:
   - Her soru tek, kısa, sade bir Türkçe cümle olsun. Teknik terim kullanma; gerekiyorsa bir örnekle anlat.
   - Her soruya 2 ya da 3 seçenek ver, harfle (A/B/C). İlk seçenek senin önerin olsun, yanına "(önerim)" yaz.
   - Mümkünse evet/hayır sorusu yap.
   - Soruları hem `docs/analiz/FINAL_SORULAR.md` dosyasına yaz hem sohbette aynı biçimde sor.
   - Sahibin tek satırla cevaplayabileceğini söyle. Örnek: `1A 2B 3A`.
6. **Dur ve cevap bekle.** Cevaplar gelince `FINAL_SORULAR.md` dosyasına ekle ve Adım B'ye geç.

## Adım B — Final durum raporu (`docs/analiz/FINAL_DURUM.md`)

Başlamadan önce bütün test takımlarını yeniden çalıştır ve sonuçları kaydet:
- oyun `npm test`
- sunucu testleri
- çevrim içi uçtan uca test (çalıştırılabiliyorsa)
- uzun koşular (her mod, eşli dahil, 100'er maç, ekransız)
- uygulama testleri

Sonra şu bölümleri yaz. Kısa cümleler, tablolar ve bulgu kimlikleri (MOD-01 gibi) kullan.

### 1. Yönetici özeti

- **Tek cümlelik hüküm:**
  - Çevrim dışı oyun canlıya hazır mı?
  - Çevrim içi oyun hazır mı?
  - Admin paneli hazır mı?
- **En önemli 10 açık risk**, önem sırasıyla.
- **Sayılar:** Her parça için bulgu toplamı, düzelen, karar gereği değişmeyen, ertelenen, açık kalan.

### 2. Sahibin kararları (tam liste)

- Parça 1–6 boyunca verilen bütün kararlar (K1, K2 … ve sonrakiler). Her biri için:
  - Ne karar verildi?
  - Uygulandı mı? (dosya ve test kanıtıyla)
- Adım A'daki soruların cevapları.
- **Benim kararlarım:** Senin kendi başına verdiğin kararlar ve gerekçeleri.

### 3. Parça parça durum

Her parça (1–6) için aynı tablo:

| Bulgu | Önem | Durum (DÜZELDİ / KARAR / ERTELENDİ / AÇIK) | Kanıt (dosya, test, ekran görüntüsü) | Kalan iş |
| --- | --- | --- | --- | --- |

Düzelmiş P2/P3 bulguları tek satırda toplayabilirsin. P0 ve P1 bulguları tek tek yazılsın.

### 4. Sistemin bugünkü hâli

- **Mimari özeti:** İstemci modülleri, sunucu (Worker'lar, DO sınıfları, shard yapısı), D1 tabloları (adlarıyla), Supabase
  kullanımı, ortam değişkenlerinin adları.
- **Özellik envanteri:** Her özellik için `VAR` / `KISMEN` / `YOK`, test edildi mi, ekran görüntüsü var mı:
  - Oda kur, oda paylaş (link, WhatsApp), açık odalar, hızlı oyun.
  - Kopma ve yeniden bağlanma, ayrılana bot, süre aşımı.
  - Çip kazanma ve harcama, hareket defteri.
  - XP ve seviye senkronu.
  - Sıralamalar (günlük, haftalık, aylık).
  - Sohbet, hediye, profil kartı, arkadaşlar, bildirimler.
  - Turnuva.
  - Admin panelinin her yeteneği.
  - Hesap silme.
  - Eşli oyun (çevrim dışı ve çevrim içi).
- **Maliyet tablosu** (ölçülmüş değerlerle): 10 kişilik test (ücretsiz plan), günde 500 maç (5 $ plan), günde 5.000
  maç.
  - Ücretsizden ücretliye geçişte tam olarak ne yapılacak.
  - Maliyet korumaları: azami oda, acil kapatma, kota uyarısı.
- **Ekran envanteri:** Her ekranın durumu ve kalite puanı (1–10).

### 5. Test durumu

- Her test takımının sonucu: sayılarla, tarih ve commit ile.
- **Hiç test edilmeyenler:** gerçek telefonda denenmeyenler, iki gerçek cihazla çevrim içi oyun, gerçek reklam,
  gerçek push bildirimi vb.

### 6. Bilinen hatalar

Açık kalan her hata için şunları yaz:
- yeniden üretme adımları
- etkisi
- önem derecesi
- önerilen çözüm

### 7. Canlıya çıkış

- **Kontrol listesi:** Mağaza, hukuk, güvenlik, maliyet, izleme ve yedekleme. Her madde için yapıldı mı?
- **Sahibin kendi bilgisayarında yapması gerekenler:** Adım adım deploy. Anahtarlar ortam değişkenleri, D1
  migration, Worker deploy, Supabase ayarları, uygulamaya aktarma. Anahtar değeri yazma.
- **Geri alma planı:** Kötü bir deploy olursa ne yapılacak.

### 8. Git durumu

- Oyun deposu: dal, son 15 commit'in tek satırlık özeti, commit edilmemiş değişiklik var mı.
- **Uygulama deposu (sanane-main):**
  - Okey ile ilgili commit edilmemiş dosyalar.
  - Okey dışı bekleyen değişikliklerin sayısı ve klasör özeti.
  - Ne yapılması önerilir?

### 9. "Final 7" önerisi

- Yalnız **gerçekten kalan ve önemli** işler, önem sırasına göre. Her birine bulgu kimliği, efor (S/M/L) ve kabul
  ölçütü yaz.
- **"Final 7 gerekmez"** diyebiliyorsan açıkça söyle ve gerekçesini yaz.
- **Ayrım:** Canlıya çıkmadan önce şart olanlar ile çıktıktan sonra yapılabilecekler ayrı listelensin.

### 10. Ekran görüntüleri

`docs/analiz/ss/final/` klasörüne, 844×390 ve 568×320 boyutunda, 3B kalitede en çok 20 görüntü:
- ana menü
- kural yaprağı
- klasik ve 101 masası (biri açmış hâlde)
- el sonu sayfaları
- maç sonu
- çevrim içi lobi ve oda kur
- bekleme odası
- sıralama
- profil kartı
- Çarşı
- admin paneli ana ekranı
- bakım ekranı

Her görüntünün altına bir cümlelik açıklama yaz.

---

## Bitince

1. Raporu baştan sona bir kez oku. 10 bölümün hepsi dolu mu, kontrol et.
2. Commit at.
3. Son mesajın şu olsun:

   ```
   Final durum raporu hazır: docs/analiz/FINAL_DURUM.md (kritik sorular: docs/analiz/FINAL_SORULAR.md)
   ```
