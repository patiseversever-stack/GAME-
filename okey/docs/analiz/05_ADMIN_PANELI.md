# Parça 5 — Admin paneli (okey yönetim alanı)

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_05.md`, ekran görüntüleri: `docs/analiz/ss/05/`.
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
